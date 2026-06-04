import { sql } from "@/lib/db";
import { renderEmail, emailHeading } from "@/lib/email-layout";

// Server-side handling for the contact + correction forms. Submissions are
// stored in form_submissions (so nothing is lost if email fails) and the
// operator is notified via Resend. NEVER call this from the browser — it holds
// the API key and the DB. Resend is hit over plain REST (no SDK dependency).

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Kind = "contact" | "correction";

export type SubmissionInput = {
  kind: Kind;
  email: string;
  message: string;
  name?: string;
  pageUrl?: string;
  details?: { whatWrong?: string; expected?: string; source?: string };
  website?: string; // honeypot — must be empty
};

type Meta = { ip: string; ua: string };
export type Result = { ok: true } | { ok: false; error: string };

const clamp = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function handleSubmission(input: SubmissionInput, meta: Meta): Promise<Result> {
  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (clamp(input.website, 200)) return { ok: true };

  const email = clamp(input.email, 200);
  const message = clamp(input.message, 5000);
  const name = clamp(input.name, 200) || null;
  const pageUrl = clamp(input.pageUrl, 500) || null;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (message.length < 5) return { ok: false, error: "Please add a bit more detail." };

  // DB-backed rate limit (works across serverless instances, unlike in-memory):
  // at most 3 submissions per IP per 10 minutes.
  if (meta.ip) {
    const recent = (await sql`
      SELECT count(*)::int AS n FROM form_submissions
      WHERE ip = ${meta.ip} AND created_at > now() - interval '10 minutes'`) as { n: number }[];
    if ((recent[0]?.n ?? 0) >= 3) {
      return { ok: false, error: "Too many submissions from your network — please try again in a little while." };
    }
  }

  const details =
    input.kind === "correction"
      ? {
          whatWrong: clamp(input.details?.whatWrong, 2000) || null,
          expected: clamp(input.details?.expected, 2000) || null,
          source: clamp(input.details?.source, 500) || null,
        }
      : null;

  const inserted = (await sql`
    INSERT INTO form_submissions (kind, name, email, message, page_url, details, user_agent, ip)
    VALUES (${input.kind}, ${name}, ${email}, ${message}, ${pageUrl},
            ${details ? JSON.stringify(details) : null}::jsonb, ${meta.ua}, ${meta.ip || null})
    RETURNING id`) as { id: string }[];
  const id = inserted[0].id;

  const sent = await sendNotification({ id, kind: input.kind, name, email, message, pageUrl, details });
  if (sent) await sql`UPDATE form_submissions SET email_sent = true WHERE id = ${id}`;

  return { ok: true };
}

type Notify = {
  id: string; kind: Kind; name: string | null; email: string; message: string;
  pageUrl: string | null; details: { whatWrong: string | null; expected: string | null; source: string | null } | null;
};

async function sendNotification(s: Notify): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.FORM_NOTIFY_TO;
  if (!apiKey || !from || !to) {
    console.error("Resend not configured (RESEND_API_KEY/RESEND_FROM/FORM_NOTIFY_TO). Submission stored but not emailed.");
    return false;
  }

  const subject =
    s.kind === "correction"
      ? `[OpenHospitalCost] Correction — ${s.pageUrl || "site"}`
      : `[OpenHospitalCost] Contact — ${s.name || s.email}`;

  const row = (label: string, value: string) =>
    `<p style="margin:0 0 12px;"><strong>${label}:</strong> ${value}</p>`;
  const block = (label: string, value: string) =>
    `<p style="margin:0 0 12px;"><strong>${label}:</strong><br>${value.replace(/\n/g, "<br>")}</p>`;

  const lines: string[] = [emailHeading(s.kind === "correction" ? "New correction" : "New contact message")];
  lines.push(row("From", s.name ? `${esc(s.name)} &lt;${esc(s.email)}&gt;` : esc(s.email)));
  if (s.pageUrl) lines.push(row("Page", esc(s.pageUrl)));
  lines.push(block(s.kind === "correction" ? "What looks wrong" : "Message", esc(s.message)));
  if (s.details?.expected) lines.push(block("Expected", esc(s.details.expected)));
  if (s.details?.source) lines.push(row("Source", esc(s.details.source)));
  lines.push(
    `<p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #E5E3DD;color:#5B6670;font-size:13px;">Submission ${s.id} · reply to this email to respond to the sender.</p>`
  );

  const html = renderEmail({
    title: subject,
    preheader: s.kind === "correction" ? `Correction on ${s.pageUrl || "the site"}` : `Message from ${s.name || s.email}`,
    contentHtml: lines.join("\n"),
  });

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `form/${s.id}`,
      },
      body: JSON.stringify({ from, to: [to], reply_to: s.email, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send error:", (err as Error).message);
    return false;
  }
}
