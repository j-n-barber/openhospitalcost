"use client";
import { useMemo, useState } from "react";
import { titleCase, usd } from "@/lib/format";
import NegotiatedCell from "@/components/NegotiatedCell";
import InfoTip from "@/components/InfoTip";

const TIP = {
  negotiated: "Median rate insurers have negotiated with this hospital (facility prices), with the low–high range across plans.",
  cash: "Discounted price for self-pay or uninsured patients paying cash.",
  gross: "The hospital's full list price (chargemaster) before any discount or insurance.",
};

export type HPRow = {
  ccn: string; name: string; city: string; state: string;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
};
type SortKey = "name" | "negotiated" | "cash" | "gross";

const money = (n: number | null) => (n == null ? "—" : usd(n));
function cmpNum(a: number | null, b: number | null, dir: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
}

export default function FilterableHospitalPrices({ rows }: { rows: HPRow[] }) {
  const [q, setQ] = useState("");
  const [key, setKey] = useState<SortKey>("negotiated"); // cheapest-first default
  const [dir, setDir] = useState<1 | -1>(1);

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = rows.filter((r) => !s || r.name.toLowerCase().includes(s) || r.city.toLowerCase().includes(s));
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
    else { setKey(k); setDir(1); }
  };
  const caret = (k: SortKey) => (key === k ? <span className="caret">{dir === 1 ? "▲" : "▼"}</span> : null);

  return (
    <>
      <div className="toolbar">
        <div className="filterbox">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by hospital or city…" aria-label="Filter hospitals" />
        </div>
        <span className="count">{view.length} of {rows.length}</span>
      </div>

      <table className="ptable">
        <thead>
          <tr>
            <th className="sortable" onClick={() => sortBy("name")}>Hospital {caret("name")}</th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("negotiated")}>Negotiated {caret("negotiated")}<InfoTip text={TIP.negotiated} /></th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("cash")}>Cash {caret("cash")}<InfoTip text={TIP.cash} /></th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("gross")}>Gross {caret("gross")}<InfoTip text={TIP.gross} /></th>
          </tr>
        </thead>
        <tbody>
          {view.map((r) => (
            <tr key={r.ccn}>
              <td>
                <a href={`/hospital/${r.ccn}`}>{titleCase(r.name)}</a>
                <div className="rng">{titleCase(r.city)}, {r.state.toUpperCase()}</div>
              </td>
              <td className="num"><NegotiatedCell median={r.negotiated} lo={r.neg_lo} hi={r.neg_hi} payers={r.payers} /></td>
              <td className="num">{money(r.cash)}</td>
              <td className="num">{money(r.gross)}</td>
            </tr>
          ))}
          {!view.length && <tr><td colSpan={4} className="empty">No hospitals match your filter.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
