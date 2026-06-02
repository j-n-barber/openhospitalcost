"use client";
import { useState } from "react";

// Demo index for the scaffold — replaced by a real MiniSearch index / API later.
type Item = { t: "h" | "p"; nm: string; meta: string; href: string };
const INDEX: Item[] = [
  { t: "p", nm: "MRI brain, without contrast", meta: "CPT 70551", href: "#" },
  { t: "p", nm: "Hemodialysis treatment", meta: "CPT 90937", href: "#" },
  { t: "p", nm: "Vitamin D blood test", meta: "CPT 82306", href: "#" },
  { t: "p", nm: "Holter monitor (24–48 hr)", meta: "CPT 93224", href: "#" },
  { t: "p", nm: "Urinalysis with microscopy", meta: "CPT 81001", href: "#" },
  { t: "h", nm: "Montefiore Medical Center", meta: "Bronx, NY", href: "#" },
  { t: "h", nm: "AdventHealth Orlando", meta: "Orlando, FL", href: "#" },
  { t: "h", nm: "Memorial Hermann Hospital System", meta: "Houston, TX", href: "#" },
  { t: "h", nm: "UPMC Presbyterian Shadyside", meta: "Pittsburgh, PA", href: "#" },
  { t: "h", nm: "M Health Fairview — University of MN", meta: "Minneapolis, MN", href: "#" },
];
const CHIPS = ["MRI brain", "Hemodialysis", "Vitamin D test", "Holter monitor", "Montefiore"];

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const s = q.trim().toLowerCase();
  const hits = s ? INDEX.filter((i) => i.nm.toLowerCase().includes(s) || i.meta.toLowerCase().includes(s)).slice(0, 6) : [];

  return (
    <div className="search">
      <div className="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          placeholder={'Type a hospital or procedure — e.g. "MRI brain" or "Cleveland Clinic"'}
          value={q}
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && s && (
        <div className="results">
          {hits.length ? (
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
          <span className="chip" key={c} onMouseDown={(e) => { e.preventDefault(); setQ(c); setOpen(true); }}>{c}</span>
        ))}
      </div>
    </div>
  );
}
