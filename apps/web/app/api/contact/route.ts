import { handleSubmission } from "@/lib/forms";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await handleSubmission(
    {
      kind: "contact",
      name: body.name as string,
      email: body.email as string,
      message: body.message as string,
      website: body.website as string,
    },
    { ip: clientIp(req), ua: req.headers.get("user-agent") ?? "" }
  );

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
