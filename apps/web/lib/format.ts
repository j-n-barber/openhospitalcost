// Shared display helpers. DB stores hospital/city names in UPPERCASE.
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const usd = (n: number, dec = 0) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
