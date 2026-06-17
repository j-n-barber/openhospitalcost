"use client";
import { useMemo, useState } from "react";
import { usd, settingOf } from "@/lib/format";
import NegotiatedCell from "@/components/NegotiatedCell";
import InfoTip from "@/components/InfoTip";

const TIP = {
  negotiated: "Median rate insurers have negotiated with this hospital (facility prices), with the low–high range across plans.",
  cash: "Discounted price for self-pay or uninsured patients paying cash.",
  gross: "The hospital's full list price (chargemaster) before any discount or insurance.",
};

export type ProcRow = {
  slug: string; name: string; category: string | null; code_type: string | null;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
  tier_size?: number | null;
};
type SortKey = "name" | "negotiated" | "cash" | "gross";

const money = (n: number | null) => (n == null ? "—" : usd(n));
const catLabel = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function cmpNum(a: number | null, b: number | null, dir: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls always last
  if (b == null) return -1;
  return (a - b) * dir;
}

export default function FilterableProcedures({ rows }: { rows: ProcRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [setting, setSetting] = useState<"all" | "Inpatient" | "Outpatient">("all");
  const [key, setKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<1 | -1>(1);

  const cats = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort(),
    [rows]
  );
  // Only offer the Inpatient/Outpatient toggle when the page actually has both.
  const hasBothSettings = useMemo(
    () => rows.some((r) => settingOf(r.code_type) === "Inpatient") && rows.some((r) => settingOf(r.code_type) === "Outpatient"),
    [rows]
  );

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = rows.filter(
      (r) => (cat === "all" || r.category === cat)
        && (setting === "all" || settingOf(r.code_type) === setting)
        && (!s || r.name.toLowerCase().includes(s))
    );
    out.sort((a, b) => {
      if (key === "name") {
        const r = a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0;
        return r * dir;
      }
      return cmpNum(a[key], b[key], dir);
    });
    return out;
  }, [q, cat, setting, key, dir, rows]);

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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter procedures…" aria-label="Filter procedures" />
        </div>
        <span className="count">{view.length} of {rows.length}</span>
      </div>

      {(hasBothSettings || cats.length > 1) && (
        <div className="sortrow" style={{ margin: "0 0 16px" }}>
          {hasBothSettings && (
            <>
              <span className="lbl">Setting</span>
              {(["all", "Inpatient", "Outpatient"] as const).map((sv) => (
                <button key={sv} className={`sb${setting === sv ? " active" : ""}`} onClick={() => setSetting(sv)}>
                  {sv === "all" ? "All" : sv}
                </button>
              ))}
            </>
          )}
          {cats.length > 1 && (
            <>
              <label className="lbl" htmlFor="cat-select" style={hasBothSettings ? { marginLeft: 14 } : undefined}>Category</label>
              <select id="cat-select" className="catselect" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">All categories</option>
                {cats.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      <table className="ptable">
        <thead>
          <tr>
            <th className="sortable" onClick={() => sortBy("name")}>Procedure {caret("name")}</th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("negotiated")}>Negotiated {caret("negotiated")}<InfoTip text={TIP.negotiated} /></th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("cash")}>Cash {caret("cash")}<InfoTip text={TIP.cash} /></th>
            <th className="sortable" style={{ textAlign: "right" }} onClick={() => sortBy("gross")}>Gross {caret("gross")}<InfoTip text={TIP.gross} /></th>
          </tr>
        </thead>
        <tbody>
          {view.map((r) => (
            <tr key={r.slug}>
              <td><a href={`/procedure/${r.slug}`}>{r.name}</a>{settingOf(r.code_type) === "Inpatient" ? <>{" "}<span className="setting-tag inpatient">Inpatient</span></> : null}</td>
              <td className="num" data-label="Negotiated"><NegotiatedCell median={r.negotiated} lo={r.neg_lo} hi={r.neg_hi} payers={r.payers} tier={r.tier_size} /></td>
              <td className="num" data-label="Cash">{money(r.cash)}</td>
              <td className="num" data-label="Gross">{money(r.gross)}</td>
            </tr>
          ))}
          {!view.length && <tr><td colSpan={4} className="empty">No procedures match your filter.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
