import { sql } from "@/lib/db";
import { renderEmail, emailHeading, emailButton } from "@/lib/email-layout";

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
  // `(xmax = 0) AS inserted` distinguishes a brand-new row from a conflict update,
  // so the welcome email only fires for genuinely new subscribers.
  const rows = (await sql`
    INSERT INTO email_subscribers (email, source, user_agent, ip)
    VALUES (${email}, ${source}, ${meta.ua}, ${meta.ip || null})
    ON CONFLICT (email) DO UPDATE
      SET status = 'subscribed', source = COALESCE(EXCLUDED.source, email_subscribers.source),
          updated_at = now()
    RETURNING id, resend_synced, unsubscribe_token, (xmax = 0) AS inserted`) as
    { id: string; resend_synced: boolean; unsubscribe_token: string; inserted: boolean }[];
  const { id, resend_synced, unsubscribe_token, inserted } = rows[0];

  if (!resend_synced) {
    const contactId = await addToResendList(email);
    if (contactId) {
      await sql`UPDATE email_subscribers SET resend_contact_id = ${contactId}, resend_synced = true WHERE id = ${id}`;
    }
  }

  // Welcome only new subscribers. Best-effort — never block or fail the signup.
  if (inserted) await sendWelcome(email, unsubscribe_token);

  return { ok: true };
}

const SITE = "https://openhospitalcost.com";

// Sends the branded single-opt-in welcome email. Best-effort: logs and returns
// on any failure so a mail hiccup never breaks the signup.
async function sendWelcome(email: string, unsubToken: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.error("Resend not configured (RESEND_API_KEY/RESEND_FROM). Welcome email skipped.");
    return;
  }

  const unsubUrl = `${SITE}/unsubscribe?token=${unsubToken}`;
  const oneClickUrl = `${SITE}/api/unsubscribe?token=${unsubToken}`;

  const html = renderEmail({
    title: "Welcome to OpenHospitalCost",
    preheader: "You're on the list — here's what to expect.",
    contentHtml:
      emailHeading("You're on the list") +
      `<p style="margin:0 0 14px;">Thanks for subscribing. About once a month we'll send you the biggest hospital price swings, where cash beats the list price, and what we've newly added — drawn straight from hospitals' machine-readable files.</p>` +
      `<p style="margin:0 0 14px;">In the meantime, you can explore what hospitals actually charge:</p>` +
      emailButton(`${SITE}/reports`, "See the national price report") +
      `<p style="margin:18px 0 0;color:#5B6670;font-size:13px;">Didn't sign up? You can ignore this email, or unsubscribe below and we won't contact you again.</p>`,
    unsubscribe: { url: unsubUrl, label: "Unsubscribe" },
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `welcome/${email}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Welcome to OpenHospitalCost",
        html,
        // RFC 8058 one-click unsubscribe — surfaces the native client affordance.
        headers: {
          "List-Unsubscribe": `<${oneClickUrl}>, <mailto:contact@openhospitalcost.com?subject=Unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) console.error("Welcome email failed:", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("Welcome email error:", (err as Error).message);
  }
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
