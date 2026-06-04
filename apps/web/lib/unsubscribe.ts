import { sql } from "@/lib/db";

// Shared unsubscribe handling, used by both the one-click POST endpoint
// (/api/unsubscribe, RFC 8058) and the human-facing landing page (/unsubscribe).
// Neon is the authoritative suppression list — the batch sender only mails
// status = 'subscribed', so flipping status here is what actually stops mail.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UnsubResult = { ok: boolean; email?: string };

export async function unsubscribeByToken(token: unknown): Promise<UnsubResult> {
  if (typeof token !== "string" || !UUID_RE.test(token)) return { ok: false };
  const rows = (await sql`
    UPDATE email_subscribers
       SET status = 'unsubscribed', updated_at = now()
     WHERE unsubscribe_token = ${token}
    RETURNING email`) as { email: string }[];
  if (!rows.length) return { ok: false };
  return { ok: true, email: rows[0].email };
}
