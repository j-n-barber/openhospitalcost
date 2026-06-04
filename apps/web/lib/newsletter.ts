import { getSwings, getPriciest, getSavings, getHospitalCount } from "@/lib/reports-data";
import { renderEmail, emailHeading, emailButton } from "@/lib/email-layout";
import { titleCaseProcedure, usd } from "@/lib/format";

// Builds the monthly newsletter: the report content is generated once per run,
// then wrapped per-recipient (each gets their own unsubscribe token). Content
// mirrors the national /reports page via the shared reports-data queries.

const SITE = "https://openhospitalcost.com";
const C = { ink: "#13283A", border: "#E5E3DD", muted: "#5B6670", linkTeal: "#12545F" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// edition_key like "2026-06"; label like "June 2026".
export function editionLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1] ?? ""} ${y}`.trim();
}

export type Edition = {
  key: string;
  subject: string;
  innerHtml: string; // the report body; wrapped per-recipient by renderForRecipient
};

const procLink = (s: { slug: string; name: string }) =>
  `<a href="${SITE}/procedure/${s.slug}" style="color:${C.linkTeal};text-decoration:none;">${titleCaseProcedure(s.name)}</a>`;

const th = (label: string, right = false) =>
  `<th align="${right ? "right" : "left"}" style="padding:7px 8px;border-bottom:2px solid ${C.border};font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:${C.muted};">${label}</th>`;

const td = (html: string, right = false) =>
  `<td align="${right ? "right" : "left"}" style="padding:8px;border-bottom:1px solid ${C.border};font-size:14px;color:${C.ink};">${html}</td>`;

function table(headers: string, rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 22px;">
    <thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

// Assembles the report HTML for an edition. Returns null if there's no data.
export async function buildEdition(key: string): Promise<Edition | null> {
  const [swings, savings, priciest, hospitals] = await Promise.all([
    getSwings(6),
    getSavings(6),
    getPriciest(6),
    getHospitalCount(),
  ]);
  if (!swings.length && !savings.length && !priciest.length) return null;

  const label = editionLabel(key);
  let html =
    emailHeading(`Hospital Price Report — ${label}`) +
    `<p style="margin:0 0 18px;color:${C.muted};font-size:14px;">What U.S. hospitals actually charge for shoppable care, from ${hospitals.toLocaleString()} hospitals' machine-readable files. Medians with robust 10th–90th-percentile ranges.</p>`;

  if (swings.length) {
    const rows = swings
      .map((s) => `<tr>${td(procLink(s))}${td(`${usd(s.p10)} – ${usd(s.p90)}`, true)}${td(usd(s.p50), true)}</tr>`)
      .join("");
    html +=
      `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:17px;color:${C.ink};">The same procedure, wildly different prices</p>` +
      table(th("Procedure") + th("Typical range", true) + th("Median", true), rows);
  }

  if (savings.length) {
    const rows = savings
      .map((s) => `<tr>${td(procLink(s))}${td(usd(s.cash), true)}${td(usd(s.gross), true)}</tr>`)
      .join("");
    html +=
      `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:17px;color:${C.ink};">Cash can beat the list price</p>` +
      table(th("Procedure") + th("Cash", true) + th("Gross / list", true), rows);
  }

  if (priciest.length) {
    const rows = priciest
      .map((s) => `<tr>${td(procLink(s))}${td(usd(s.p50), true)}</tr>`)
      .join("");
    html +=
      `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:17px;color:${C.ink};">Most expensive shoppable procedures</p>` +
      table(th("Procedure") + th("Median negotiated", true), rows);
  }

  html += emailButton(`${SITE}/reports`, "See the full report");
  html += `<p style="margin:18px 0 0;color:${C.muted};font-size:13px;">Prices are computed across each hospital's representative facility price from its latest machine-readable file. Informational only — not a quote.</p>`;

  return { key, subject: `Hospital Price Report — ${label}`, innerHtml: html };
}

// Wraps the edition body in the branded shell for one recipient, with their
// unsubscribe token. Returns the full HTML document.
export function renderForRecipient(edition: Edition, unsubToken: string): string {
  return renderEmail({
    title: edition.subject,
    preheader: "The biggest hospital price swings and where cash beats the list price.",
    contentHtml: edition.innerHtml,
    unsubscribe: { url: `${SITE}/unsubscribe?token=${unsubToken}`, label: "Unsubscribe" },
  });
}

// The List-Unsubscribe header pair for a recipient (RFC 8058 one-click).
export function unsubHeaders(unsubToken: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${SITE}/api/unsubscribe?token=${unsubToken}>, <mailto:contact@openhospitalcost.com?subject=Unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
