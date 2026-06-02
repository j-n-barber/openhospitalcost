"use client";
import { useState } from "react";
import { US_VIEWBOX, US_STATES } from "@/lib/us-states";

const NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California", co: "Colorado",
  ct: "Connecticut", de: "Delaware", dc: "District of Columbia", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas", ky: "Kentucky",
  la: "Louisiana", me: "Maine", md: "Maryland", ma: "Massachusetts", mi: "Michigan", mn: "Minnesota",
  ms: "Mississippi", mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire",
  nj: "New Jersey", nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota",
  oh: "Ohio", ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont", va: "Virginia",
  wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
};

function shade(n: number): string {
  if (!n) return "#EBE8E1";
  if (n >= 15) return "#15616d";
  if (n >= 10) return "#1A6B7A";
  if (n >= 5) return "#4f9a98";
  if (n >= 2) return "#8cc1bc";
  return "#cfe3e0";
}

type Tip = { x: number; y: number; name: string; n: number };

export default function CoverageMap({ counts }: { counts: Record<string, number> }) {
  const [hl, setHl] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <>
      <svg className="usmap" viewBox={US_VIEWBOX} role="img" aria-label="Hospitals with published prices, by U.S. state">
        {US_STATES.map((st) => {
          const key = st.a.toLowerCase();
          const n = counts[key] || 0;
          return (
            <path
              key={st.a}
              d={st.d}
              fill={shade(n)}
              className={n ? "has" : "dim"}
              onMouseMove={n ? (e) => { setHl(st.d); setTip({ x: e.clientX, y: e.clientY, name: NAMES[key] || st.a, n }); } : undefined}
              onMouseLeave={n ? () => { setHl(null); setTip(null); } : undefined}
              onClick={n ? () => { window.location.href = `/state/${key}`; } : undefined}
            />
          );
        })}
        {hl && <path d={hl} className="hl" />}
      </svg>
      {tip && (
        <div className="tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          {tip.name} · <span className="price">{tip.n} hospital{tip.n > 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
