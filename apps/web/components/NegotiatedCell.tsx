import { usd, usdShort } from "@/lib/format";

// Median negotiated price as the headline, with a small range bar showing where
// that median sits within the payer spread (low → high). Payers on hover.
export default function NegotiatedCell({
  median, lo, hi, payers,
}: { median: number | null; lo: number | null; hi: number | null; payers: number | null }) {
  if (median == null) return <span className="num">—</span>;
  const hasRange = lo != null && hi != null && hi > lo;
  const pct = hasRange ? Math.min(100, Math.max(0, ((median - lo!) / (hi! - lo!)) * 100)) : 50;
  return (
    <div className="negcell" title={payers != null ? `${payers} payer${payers === 1 ? "" : "s"}` : undefined}>
      <span className="med">{usd(median)}</span>
      {hasRange && (
        <span className="rangebar">
          <span className="rb-lo">{usdShort(lo!)}</span>
          <span className="rb-track"><span className="rb-dot" style={{ left: `${pct}%` }} /></span>
          <span className="rb-hi">{usdShort(hi!)}</span>
        </span>
      )}
    </div>
  );
}
