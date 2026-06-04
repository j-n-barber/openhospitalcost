import { sql } from "@/lib/db";

// Server-side newsletter signup. Neon is the source of truth (email_subscribers);
// each subscriber is then best-effort mirrored into a Resend audience so we can
// send broadcasts. NEVER call from the browser — it holds the API key and DB.
// Resend is hit over plain REST (no SDK dependency), matching lib/forms.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscribeInput = {
  email: string;
  source?: string;
  website?: string; // honeypot — must be empty
};

type Meta = { ip: string; ua: string };
export type Result = { ok: true } | { ok: false; error: string };

const clamp = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function handleSubscribe(input: SubscribeInput, meta: Meta): Promise<Result> {
  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (clamp(input.website, 200)) return { ok: true };

  const email = clamp(input.email, 200).toLowerCase();
  const source = clamp(input.source, 60) || null;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  // DB-backed rate limit (works across serverless instances): at most 5 signups
  // per IP per 10 minutes.
  if (meta.ip) {
    const recent = (await sql`
      SELECT count(*)::int AS n FROM email_subscribers
      WHERE ip = ${meta.ip} AND created_at > now() - interval '10 minutes'`) as { n: number }[];
    if ((recent[0]?.n ?? 0) >= 5) {
      return { ok: false, error: "Too many signups from your network — please try again in a little while." };
    }
  }

  // Upsert: re-subscribing flips status back to 'subscribed' and refreshes source.
  // Only counts against the rate limit when it's genuinely a new row.
  const rows = (await sql`
    INSERT INTO email_subscribers (email, source, user_agent, ip)
    VALUES (${email}, ${source}, ${meta.ua}, ${meta.ip || null})
    ON CONFLICT (email) DO UPDATE
      SET status = 'subscribed', source = COALESCE(EXCLUDED.source, email_subscribers.source),
          updated_at = now()
    RETURNING id, resend_synced`) as { id: string; resend_synced: boolean }[];
  const { id, resend_synced } = rows[0];

  if (!resend_synced) {
    const contactId = await addToResendList(email);
    if (contactId) {
      await sql`UPDATE email_subscribers SET resend_contact_id = ${contactId}, resend_synced = true WHERE id = ${id}`;
    }
  }

  return { ok: true };
}

// Mirrors the subscriber into Resend via the current Contacts API
// (POST /contacts). When RESEND_SEGMENT_ID is set the contact is added to that
// segment so it can be targeted by broadcasts. Returns the Resend contact id on
// success, null if not configured or the call fails (the subscriber is still
// safely stored in Neon and can be re-synced later).
async function addToResendList(email: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Resend not configured (RESEND_API_KEY). Subscriber stored, not synced.");
    return null;
  }
  const segmentId = process.env.RESEND_SEGMENT_ID;
  const body: Record<string, unknown> = { email, unsubscribed: false };
  if (segmentId) body.segments = [{ id: segmentId }];

  try {
    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("Resend contact create failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error("Resend contact create error:", (err as Error).message);
    return null;
  }
}
