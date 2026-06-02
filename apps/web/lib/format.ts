// Shared display helpers. DB stores hospital/city names in UPPERCASE.
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const usd = (n: number, dec = 0) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

// Compact dollars for tight spots: <$1, $98, $4.3k, $10k
export const usdShort = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n < 1 ? "<$1" : `$${Math.round(n)}`;
