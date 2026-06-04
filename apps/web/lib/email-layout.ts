// Shared branded HTML email layout for every outbound Resend email (form
// notifications, subscriber welcome, monthly broadcast). Email clients strip
// <style>/external CSS and ignore web fonts, so everything is table-based with
// inline styles and web-safe font stacks (Georgia for the serif wordmark/headings
// to echo Source Serif; Arial/Helvetica for body to echo Inter).
//
// Brand palette (brand/palette.md): Ink #13283A, Paper #FAF9F6, Surface #FFFFFF,
// Primary Teal #1A6B7A, Link Teal #12545F, Border #E5E3DD, Muted #5B6670.
//
// IMPORTANT: contentHtml is treated as trusted HTML and is NOT escaped here.
// Callers must escape any user-supplied values before passing them in.

const C = {
  ink: "#13283A",
  paper: "#FAF9F6",
  surface: "#FFFFFF",
  teal: "#1A6B7A",
  linkTeal: "#12545F",
  border: "#E5E3DD",
  muted: "#5B6670",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";
const SITE = "https://openhospitalcost.com";

export type EmailOptions = {
  title: string; // <title> + drives nothing visible
  preheader: string; // inbox preview text
  contentHtml: string; // trusted HTML for the card body
  unsubscribe?: { url: string; label?: string }; // omit for internal/transactional
};

// A teal pill button matching the site's .btn.
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr><td style="border-radius:100px;background:${C.teal};">
    <a href="${href}" style="display:inline-block;padding:11px 26px;font-family:${SANS};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:100px;">${label}</a>
  </td></tr></table>`;
}

// Inline link styled with brand Link Teal — use inside contentHtml.
export function emailLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${C.linkTeal};text-decoration:underline;">${label}</a>`;
}

export function renderEmail(o: EmailOptions): string {
  const unsub = o.unsubscribe
    ? `<br><a href="${o.unsubscribe.url}" style="color:${C.muted};text-decoration:underline;">${o.unsubscribe.label ?? "Unsubscribe"}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${o.title}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};font-size:1px;line-height:1px;">${o.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
  <tr>
    <td align="center" style="padding:28px 16px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
        <tr>
          <td style="padding:2px 6px 18px;">
            <a href="${SITE}" style="text-decoration:none;font-family:${SERIF};font-size:22px;font-weight:bold;color:${C.ink};letter-spacing:-.2px;">
              <span style="color:${C.teal};">Open</span>HospitalCost
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:30px 30px 26px;font-family:${SANS};font-size:16px;line-height:1.55;color:${C.ink};">
            ${o.contentHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 8px 0;font-family:${SANS};font-size:12px;line-height:1.55;color:${C.muted};">
            OpenHospitalCost makes hospital price-transparency files (published under 45 CFR §180) searchable. Figures are
            informational and are not a quote or guarantee of cost.<br>
            <span style="color:${C.muted};">J.N. Barber LLC · <a href="${SITE}" style="color:${C.muted};text-decoration:underline;">openhospitalcost.com</a></span>${unsub}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Convenience: a branded heading for use inside contentHtml.
export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:22px;line-height:1.3;font-weight:bold;color:${C.ink};">${text}</h1>`;
}
