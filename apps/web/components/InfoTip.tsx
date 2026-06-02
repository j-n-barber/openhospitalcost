"use client";
import { useState } from "react";

// Small "i" affordance with a hover tooltip. The popover is position:fixed (via
// .tip) so it escapes the table's overflow:hidden clipping. stopPropagation so
// clicking the icon doesn't trigger the column's sort handler.
const TIP_W = 264; // max-width(240) + padding

export default function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // clamp to the viewport so right-edge columns don't run the tooltip off-screen
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const left = pos ? Math.max(8, Math.min(pos.x + 12, vw - TIP_W)) : 0;
  return (
    <span
      className="infotip"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      <span className="infotip-ico" aria-label={text} role="img">i</span>
      {pos && <span className="tip infotip-pop" style={{ left, top: pos.y + 16 }}>{text}</span>}
    </span>
  );
}
