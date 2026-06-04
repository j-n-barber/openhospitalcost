"use client";
import { useRef, useState } from "react";

type Item = { t: "h" | "p"; nm: string; meta: string; href: string };
const CHIPS = ["MRI brain", "Hemodialysis", "Vitamin D", "Holter monitor", "Montefiore"];

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<Item[] | null>(null);
  const loading = useRef(false);

  const load = async () => {
    if (index || loading.current) return;
    loading.current = true;
    try {
      const r = await fetch("/api/search");
      setIndex(await r.json());
    } catch {
      setIndex([]);
    }
  };

  const s = q.trim().toLowerCase();
  const hits = s && index
    ? index.filter((i) => i.nm.toLowerCase().includes(s) || i.meta.toLowerCase().includes(s)).slice(0, 8)
    : [];

  return (
    <div className="search">
      <div className="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          placeholder={'Search a hospital or procedure'}
          value={q}
          autoComplete="off"
          onFocus={() => { setOpen(true); load(); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); load(); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && s && (
        <div className="results">
          {!index ? (
            <div className="res"><span className="meta">Loading…</span></div>
          ) : hits.length ? (
            hits.map((i, k) => (
              <a className="res" key={k} href={i.href}>
                <span className={`tag ${i.t}`}>{i.t === "h" ? "Hospital" : "Procedure"}</span>
                <span><span className="nm">{i.nm}</span><span className="meta" style={{ display: "block" }}>{i.meta}</span></span>
              </a>
            ))
          ) : (
            <div className="res"><span className="meta">No matches — try “MRI”, “dialysis”, or a hospital name.</span></div>
          )}
        </div>
      )}
      <div className="chips">
        <span className="lbl">Try:</span>
        {CHIPS.map((c) => (
          <span className="chip" key={c} onMouseDown={(e) => { e.preventDefault(); setQ(c); setOpen(true); load(); }}>{c}</span>
        ))}
      </div>
    </div>
  );
}
