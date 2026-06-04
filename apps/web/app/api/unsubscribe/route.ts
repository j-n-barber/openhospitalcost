import { unsubscribeByToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

// RFC 8058 one-click unsubscribe. Email clients POST here when the user clicks
// the native "Unsubscribe" affordance (driven by the List-Unsubscribe and
// List-Unsubscribe-Post headers we set on sends). Must succeed without any
// further interaction, so we always return 200 once the token is processed.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return new Response(null, { status: 200 });
}

// Some clients issue a GET to the same URL; send those to the friendly page.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return Response.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, req.url), 302);
}
