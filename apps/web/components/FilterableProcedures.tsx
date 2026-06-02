"use client";
import { useMemo, useState } from "react";
import { usd } from "@/lib/format";

export type ProcRow = {
  slug: string; name: string; code: string;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
};
type SortKey = "name" | "negotiated" | "cash" | "gross";

const money = (n: number | null) => (n == null ? "—" : usd(n));

function cmpNum(a: number | null, b: number | null, dir: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls always last
  if (b == null) return -1;
  return (a - b) * dir;
}

export default function FilterableProcedures({ rows }: { rows: ProcRow[] }) {
  const [q, setQ] = useState("");
  const [key, setKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<1 | -1>(1);

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = (s ? rows.filter((r) => r.name.toLowerCase().includes(s) || r.code.includes(s)) : rows.slice());
    out.sort((a, b) => {
      if (key === "name") {
        const r = a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0;
        return r * dir;
      }
      return cmpNum(a[key], b[key], dir);
    });
    return out;
  }, [q, key, dir, rows]);

  const sortBy = (k: SortKey) => {
    if (k === key) setDir((d) => (d === 1 ? -1 : 1));
    else { setKey(k); setDir(k === "name" ? 1 : 1); }
  };
  const caret = (k: SortKey) => (key === k ? <span className="caret">{dir === 1 ? "▲" : "▼"}</span> : null);

  return (
    <>
      <div className="toolbar">
        <div className="filterbox">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter procedures…" aria-label="Filter procedures" />
        </div>
        <span className="count">{view.length} of {rows.length}</span>
      </div>

      <table className="ptable">
        <thead>
          <tr>
            <th className="sortable" onClick={() => sortBy("name")}>Procedure {caret("name")}</th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("negotiated")}>Negotiated {caret("negotiated")}</th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("cash")}>Cash {caret("cash")}</th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("gross")}>Gross {caret("gross")}</th>
          </tr>
        </thead>
        <tbody>
          {view.map((r) => (
            <tr key={r.slug}>
              <td><a href={`/procedure/${r.slug}`}>{r.name}</a> <span className="rng mono">CPT {r.code}</span></td>
              <td className="num">
                {money(r.negotiated)}
                {r.neg_lo != null && r.neg_hi != null && r.neg_lo !== r.neg_hi && (
                  <div className="rng">{usd(r.neg_lo)}–{usd(r.neg_hi)} · {r.payers ?? 0} payers</div>
                )}
              </td>
              <td className="num">{money(r.cash)}</td>
              <td className="num">{money(r.gross)}</td>
            </tr>
          ))}
          {!view.length && (
            <tr><td colSpan={4} className="empty">No procedures match “{q}”.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
