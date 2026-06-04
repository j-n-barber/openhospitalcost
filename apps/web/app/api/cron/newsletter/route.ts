import { sql } from "@/lib/db";
import { buildEdition, renderForRecipient, unsubHeaders } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function cap; batch sends are a few API calls.

const RESEND_BATCH = "https://api.resend.com/emails/batch";
const HARD_CHUNK = 100; // Resend /emails/batch accepts up to 100 per call.

type Recipient = { email: string; unsubscribe_token: string };

// Monthly newsletter sender. Triggered by GitHub Actions cron (or manual
// dispatch) with `Authorization: Bearer <CRON_SECRET>`.
//
// Idempotent + cap-aware: only mails subscribers (status='subscribed') who
// haven't already received this edition, up to NEWSLETTER_MAX_PER_RUN (default
// 100, the Resend free daily cap). Re-running drains the remainder safely, so a
// list larger than the cap can be sent over several days without duplicates.
//
// Query params:
//   ?dry=1            build + select recipients, return a preview, send nothing.
//   ?edition=YYYY-MM  override the edition key (default: current UTC month).
//   ?max=N            override the per-run cap (bounded to [1, 100]).
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET not configured." }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const editionKey = url.searchParams.get("edition") || currentEditionKey();
  const maxParam = parseInt(url.searchParams.get("max") || "", 10);
  const envMax = parseInt(process.env.NEWSLETTER_MAX_PER_RUN || "100", 10);
  const perRun = clamp(Number.isFinite(maxParam) ? maxParam : Number.isFinite(envMax) ? envMax : 100, 1, HARD_CHUNK);

  const edition = await buildEdition(editionKey);
  if (!edition) return Response.json({ ok: false, error: "No report data available." }, { status: 503 });

  // Subscribers who haven't gotten this edition yet.
  const recipients = (await sql`
    SELECT s.email, s.unsubscribe_token
    FROM email_subscribers s
    WHERE s.status = 'subscribed'
      AND NOT EXISTS (
        SELECT 1 FROM newsletter_sends n
        WHERE n.edition_key = ${editionKey} AND n.email = s.email
      )
    ORDER BY s.created_at
    LIMIT ${perRun}`) as Recipient[];

  const remainingAfter = await countRemaining(editionKey, recipients.length);

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      edition: editionKey,
      subject: edition.subject,
      wouldSendThisRun: recipients.length,
      remainingAfterThisRun: remainingAfter,
      sampleHtml: recipients[0] ? renderForRecipient(edition, recipients[0].unsubscribe_token) : null,
    });
  }

  if (!recipients.length) {
    return Response.json({ ok: true, edition: editionKey, sentThisRun: 0, remaining: 0, note: "Nothing to send." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return Response.json({ ok: false, error: "Resend not configured (RESEND_API_KEY/RESEND_FROM)." }, { status: 500 });
  }

  const batch = recipients.map((r) => ({
    from,
    to: [r.email],
    subject: edition.subject,
    html: renderForRecipient(edition, r.unsubscribe_token),
    headers: unsubHeaders(r.unsubscribe_token),
  }));

  let ids: (string | null)[] = [];
  try {
    const res = await fetch(RESEND_BATCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Newsletter batch send failed:", res.status, detail);
      return Response.json({ ok: false, edition: editionKey, error: `Resend ${res.status}`, detail }, { status: 502 });
    }
    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }[] };
    ids = (data.data ?? []).map((d) => d?.id ?? null);
  } catch (err) {
    console.error("Newsletter batch send error:", (err as Error).message);
    return Response.json({ ok: false, edition: editionKey, error: (err as Error).message }, { status: 502 });
  }

  // Record what went out so re-runs don't duplicate. ON CONFLICT DO NOTHING in
  // case a retry overlaps. Recorded only after a successful batch response.
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    await sql`
      INSERT INTO newsletter_sends (edition_key, email, resend_id)
      VALUES (${editionKey}, ${r.email}, ${ids[i] ?? null})
      ON CONFLICT (edition_key, email) DO NOTHING`;
  }

  const remaining = await countRemaining(editionKey, 0);
  return Response.json({ ok: true, edition: editionKey, sentThisRun: recipients.length, remaining });
}

function currentEditionKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Subscribers still owed this edition, optionally subtracting a count about to
// be (or just) sent.
async function countRemaining(editionKey: string, justTaken: number): Promise<number> {
  const r = (await sql`
    SELECT count(*)::int AS n
    FROM email_subscribers s
    WHERE s.status = 'subscribed'
      AND NOT EXISTS (
        SELECT 1 FROM newsletter_sends n
        WHERE n.edition_key = ${editionKey} AND n.email = s.email
      )`) as { n: number }[];
  return Math.max(0, (r[0]?.n ?? 0) - justTaken);
}
