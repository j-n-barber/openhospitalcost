"use client";
import { useMemo, useState } from "react";
import { titleCase } from "@/lib/format";
import { STATE_NAMES } from "@/lib/states";

export type HospIndexCard = { ccn: string; name: string; city: string; state: string; procedures: number };
type SortKey = "procedures" | "name" | "state";

export default function HospitalIndex({ hospitals }: { hospitals: HospIndexCard[] }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [key, setKey] = useState<SortKey>("procedures");

  const states = useMemo(
    () => [...new Set(hospitals.map((h) => h.state.toLowerCase()))].sort((a, b) =>
      (STATE_NAMES[a] ?? a).localeCompare(STATE_NAMES[b] ?? b)
    ),
    [hospitals]
  );

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = hospitals.filter(
      (h) =>
        (st === "all" || h.state.toLowerCase() === st) &&
        (!s || h.name.toLowerCase().includes(s) || h.city.toLowerCase().includes(s))
    );
    out.sort((a, b) => {
      if (key === "procedures") return b.procedures - a.procedures || a.name.localeCompare(b.name);
      if (key === "state") return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [q, st, key, hospitals]);

  return (
    <>
      <div className="toolbar">
        <div className="filterbox">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by hospital or city…" aria-label="Filter hospitals" />
        </div>
        <span className="count">{view.length} of {hospitals.length}</span>
      </div>

      <div className="sortrow" style={{ margin: "0 0 16px" }}>
        <span className="lbl">State</span>
        <select className="statesel" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Filter by state">
          <option value="all">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{STATE_NAMES[s] ?? s.toUpperCase()}</option>
          ))}
        </select>
        <span className="lbl" style={{ marginLeft: 8 }}>Sort</span>
        <button className={`sb${key === "procedures" ? " active" : ""}`} onClick={() => setKey("procedures")}>Most data</button>
        <button className={`sb${key === "name" ? " active" : ""}`} onClick={() => setKey("name")}>Name A–Z</button>
        <button className={`sb${key === "state" ? " active" : ""}`} onClick={() => setKey("state")}>State</button>
      </div>

      {view.length ? (
        <div className="hlist">
          {view.map((h) => (
            <a className="hcard" key={h.ccn} href={`/hospital/${h.ccn}`}>
              <span className="hn">{titleCase(h.name)}</span>
              <span className="hc">{titleCase(h.city)}, {h.state.toUpperCase()}</span>
              <span className="hp">{h.procedures} procedure{h.procedures !== 1 ? "s" : ""} priced →</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty">No hospitals match your filter.</div>
      )}
    </>
  );
}
