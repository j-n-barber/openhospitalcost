import { usd, usdShort } from "@/lib/format";

// Median negotiated price as the headline, with a small range bar showing where
// that median sits within the payer spread (low → high). Below it, two trust
// signals shown inline (not just on hover): how many plans back the figure
// (1 plan = thin, flagged), and a "shared rate" tag when the hospital lists
// several procedures at this exact negotiated tier (e.g. a DRG) — so the number
// isn't specific to this one procedure.
export default function NegotiatedCell({
  median, lo, hi, payers, tier,
}: {
  median: number | null; lo: number | null; hi: number | null;
  payers: number | null; tier?: number | null;
}) {
  if (median == null) return <span className="num">—</span>;
  const hasRange = lo != null && hi != null && hi > lo;
  const pct = hasRange ? Math.min(100, Math.max(0, ((median - lo!) / (hi! - lo!)) * 100)) : 50;
  const shared = tier != null && tier >= 2;
  return (
    <div className="negcell">
      <span className="med">{usd(median)}</span>
      {hasRange && (
        <span className="rangebar">
          <span className="rb-lo">{usdShort(lo!)}</span>
          <span className="rb-track"><span className="rb-dot" style={{ left: `${pct}%` }} /></span>
          <span className="rb-hi">{usdShort(hi!)}</span>
        </span>
      )}
      {(payers != null || shared) && (
        <span className="negmeta">
          {payers != null && (
            <span className={`plans${payers <= 1 ? " thin" : ""}`} title={payers <= 1 ? "Backed by a single plan — treat as a weak signal." : `Median across ${payers} plans.`}>
              {payers} plan{payers === 1 ? "" : "s"}
            </span>
          )}
          {shared && (
            <span
              className="tierflag"
              title={`This hospital lists ${tier} procedures at this exact negotiated rate — a shared billing tier (e.g. a DRG), so it isn't priced specifically for this procedure.`}
            >
              shared rate · {tier}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
