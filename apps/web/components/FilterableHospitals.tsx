"use client";
import { useMemo, useState } from "react";
import { titleCase } from "@/lib/format";

export type HospCard = { ccn: string; name: string; city: string; procedures: number };
type SortKey = "procedures" | "name" | "city";

export default function FilterableHospitals({ hospitals, stateCode }: { hospitals: HospCard[]; stateCode: string }) {
  const [q, setQ] = useState("");
  const [key, setKey] = useState<SortKey>("procedures");

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = s
      ? hospitals.filter((h) => h.name.toLowerCase().includes(s) || h.city.toLowerCase().includes(s))
      : hospitals.slice();
    out.sort((a, b) => {
      if (key === "procedures") return b.procedures - a.procedures || a.name.localeCompare(b.name);
      if (key === "city") return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [q, key, hospitals]);

  const ST = stateCode.toUpperCase();

  return (
    <>
      <div className="toolbar">
        <div className="filterbox">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by hospital or city…" aria-label="Filter hospitals" />
        </div>
        <div className="sortrow">
          <span className="lbl">Sort</span>
          <button className={`sb${key === "procedures" ? " active" : ""}`} onClick={() => setKey("procedures")}>Most data</button>
          <button className={`sb${key === "name" ? " active" : ""}`} onClick={() => setKey("name")}>Name A–Z</button>
          <button className={`sb${key === "city" ? " active" : ""}`} onClick={() => setKey("city")}>City</button>
        </div>
      </div>

      {view.length ? (
        <div className="hlist">
          {view.map((h) => (
            <a className="hcard" key={h.ccn} href={`/hospital/${h.ccn}`}>
              <span className="hn">{titleCase(h.name)}</span>
              <span className="hc">{titleCase(h.city)}, {ST}</span>
              <span className="hp">{h.procedures} procedure{h.procedures !== 1 ? "s" : ""} priced →</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty">No hospitals match “{q}”.</div>
      )}
    </>
  );
}
