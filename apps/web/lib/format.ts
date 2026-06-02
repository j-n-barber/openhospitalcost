// Shared display helpers. DB stores hospital/city names in UPPERCASE.
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const usd = (n: number, dec = 0) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

// Compact dollars for tight spots: <$1, $98, $4.3k, $10k
export const usdShort = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n < 1 ? "<$1" : `$${Math.round(n)}`;

// Title-case a procedure name for display WITHOUT mangling medical terms.
// Procedure names are stored sentence-case with correct acronyms (CBC, A1c, MRI,
// PET/CT, X-ray, TURP, GI). We preserve any token that's an acronym (≥2 caps,
// optionally with "/") or contains a digit (A1c, 12-lead, 0.5, "(2"), keep units
// lowercase (cm, mm), and lowercase minor words (with, of, and …) except first.
const PROC_MINOR = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "up", "vs", "with", "without",
]);
const PROC_UNITS = new Set(["cm", "mm", "mg", "ml", "kg"]);

function caseProcToken(tok: string, isFirst: boolean): string {
  const lead = tok.match(/^[^A-Za-z0-9]*/)![0];
  const trail = tok.match(/[^A-Za-z0-9]*$/)![0];
  const core = tok.slice(lead.length, tok.length - trail.length);
  if (!core) return tok;
  const lower = core.toLowerCase();
  if (/\d/.test(core)) return tok; // A1c, 12-lead, 0.5, (2
  if (core === core.toUpperCase() && /[A-Z]{2,}/.test(core)) return tok; // CBC, MRI, PET/CT, GI
  if (PROC_UNITS.has(lower)) return lead + lower + trail;
  if (!isFirst && PROC_MINOR.has(lower)) return lead + lower + trail;
  return lead + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + trail;
}

export function titleCaseProcedure(name: string): string {
  let first = true;
  return name
    .split(/(\s+)/)
    .map((t) => {
      if (/^\s+$/.test(t)) return t;
      const r = caseProcToken(t, first);
      first = false;
      return r;
    })
    .join("");
}
