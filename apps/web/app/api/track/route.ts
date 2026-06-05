// apps/web/app/api/track/route.ts
//
// First-party pageview collector. The <Track/> client beacon POSTs { path, ref }
// on each navigation; we enrich with Vercel geo headers + user-agent and insert
// one row into analytics_events. Privacy-friendly: we never store the IP — only a
// daily-rotating SHA-256 hash (ip+ua+date) as an approximate session id. A beacon
// must never surface an error to the user, so every failure returns 204.

import { sql } from "@/lib/db";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// JS-capable bots/monitors (most bots don't run JS, so this beacon is naturally
// bot-light; this catches the headless/preview ones that do).
const BOT =
  /bot|crawl|spider|slurp|bing|googlebot|baidu|yandex|duckduck|facebookexternal|embedly|preview|monitor|curl|wget|python-requests|node-fetch|headless|lighthouse|pingdom|gtmetrix|semrush|ahrefs|dotbot|mj12|petalbot/i;

function classifyUA(ua: string) {
  const u = ua.toLowerCase();
  const device = /ipad|tablet/.test(u)
    ? "tablet"
    : /mobi|iphone|android.*mobile|phone/.test(u)
      ? "mobile"
      : "desktop";
  const os = /windows/.test(u)
    ? "Windows"
    : /mac os|macintosh/.test(u)
      ? "macOS"
      : /android/.test(u)
        ? "Android"
        : /iphone|ipad|ios/.test(u)
          ? "iOS"
          : /linux/.test(u)
            ? "Linux"
            : "Other";
  const browser = /edg\//.test(u)
    ? "Edge"
    : /chrome|crios|chromium/.test(u)
      ? "Chrome"
      : /firefox|fxios/.test(u)
        ? "Firefox"
        : /safari/.test(u)
          ? "Safari"
          : "Other";
  return { device, os, browser };
}

function referrerHost(ref: string | null, host: string | null): string {
  if (!ref) return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (host && h === host.replace(/^www\./, "")) return "internal";
    return h.slice(0, 128);
  } catch {
    return "direct";
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const isBot = !ua || BOT.test(ua);

    const body = (await req.json().catch(() => ({}))) as {
      path?: unknown;
      ref?: unknown;
    };
    let path = typeof body.path === "string" ? body.path : "/";
    path = path.split("?")[0].split("#")[0].slice(0, 512) || "/";
    const ref = typeof body.ref === "string" ? body.ref : null;

    const country = req.headers.get("x-vercel-ip-country");
    const region = req.headers.get("x-vercel-ip-country-region");
    const host = req.headers.get("host");
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

    // Daily-rotating session hash — stores no raw IP, resets every UTC day.
    const day = new Date().toISOString().slice(0, 10);
    const session = createHash("sha256")
      .update(`${ip}|${ua}|${day}`)
      .digest("hex")
      .slice(0, 32);

    const { device, os, browser } = classifyUA(ua);

    await sql`
      INSERT INTO analytics_events
        (path, referrer_host, country, region, device, os, browser, session_id, is_bot)
      VALUES
        (${path}, ${referrerHost(ref, host)}, ${country}, ${region},
         ${device}, ${os}, ${browser}, ${session}, ${isBot})
    `;
    return new Response(null, { status: 204 });
  } catch {
    // Never let a tracking beacon error the client.
    return new Response(null, { status: 204 });
  }
}
