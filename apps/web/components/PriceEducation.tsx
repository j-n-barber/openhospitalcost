import { usd } from "@/lib/format";

// Editorial blocks rendered beneath the price tables on procedure and hospital
// pages. Their job is to turn data-table pages into genuine, useful articles:
// every block is driven by the page's real numbers so the prose varies
// meaningfully page-to-page, and the FAQs are rendered visibly (not just as
// hidden JSON-LD). Shared here so both templates stay lean and consistent.

export type Faq = { q: string; a: string };

// The cash / negotiated / gross explainer — the single most useful thing a
// first-time reader needs to make sense of any hospital price table.
function ThreePrices() {
  return (
    <>
      <h2>The three prices you&apos;ll see in the table</h2>
      <p>
        Every hospital publishes more than one price for the same service. Knowing which one applies to
        you is how you avoid overpaying:
      </p>
      <ul>
        <li>
          <strong>Cash / self-pay price</strong> — what you pay directly when you don&apos;t use insurance.
          This is your number if you&apos;re uninsured, and it&apos;s sometimes lower than the insured rate, so
          it&apos;s worth checking even if you have coverage.
        </li>
        <li>
          <strong>Negotiated price</strong> — the rate a specific insurance plan agreed to pay. It varies
          by insurer, which is why one procedure can carry many different negotiated prices at the same
          hospital.
        </li>
        <li>
          <strong>Gross / chargemaster price</strong> — the hospital&apos;s undiscounted list price. Almost
          nobody actually pays this; treat it as a ceiling, not a real quote.
        </li>
      </ul>
    </>
  );
}

// Visible FAQ — content is also emitted as FAQPage structured data by the page.
function FaqSection({ items }: { items: Faq[] }) {
  if (!items.length) return null;
  return (
    <>
      <h2 style={{ marginTop: 44 }}>Frequently asked questions</h2>
      {items.map((f) => (
        <div key={f.q}>
          <h3 style={{ fontSize: 17, margin: "20px 0 6px" }}>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
    </>
  );
}

export type ProcedureEducationProps = {
  name: string;
  setting: string; // "Inpatient" | "Outpatient"
  count: number; // hospitals with a published negotiated price
  median: number | null;
  lo: number | null;
  hi: number | null;
  cashCount: number; // hospitals publishing a cash price
  cheapest: { name: string; ccn: string; price: number } | null;
  priciest: { name: string; ccn: string; price: number } | null;
  faq: Faq[];
};

export function ProcedureEducation(p: ProcedureEducationProps) {
  const outpatient = p.setting !== "Inpatient";
  const hasRange = p.lo != null && p.hi != null && p.lo > 0;
  const spread = hasRange ? Math.max(1, Math.round(p.hi! / p.lo!)) : null;

  return (
    <section className="copy" style={{ marginTop: 40 }}>
      <h2>How much does {p.name} cost?</h2>
      {p.median != null && hasRange ? (
        <p>
          Across {p.count} hospital{p.count !== 1 ? "s" : ""} that publish a negotiated price for{" "}
          {p.name}, the median is <strong>{usd(p.median)}</strong>, ranging from{" "}
          <strong>{usd(p.lo!)}</strong> at the cheapest to <strong>{usd(p.hi!)}</strong> at the most
          expensive
          {p.cheapest && p.priciest && p.cheapest.ccn !== p.priciest.ccn ? (
            <>
              {" "}— that&apos;s <a href={`/hospital/${p.cheapest.ccn}`}>{p.cheapest.name}</a> versus{" "}
              <a href={`/hospital/${p.priciest.ccn}`}>{p.priciest.name}</a>
            </>
          ) : null}
          . {p.cashCount > 0 ? `${p.cashCount} of them also publish a cash (self-pay) price you can use without insurance.` : ""}
        </p>
      ) : (
        <p>
          Prices for {p.name} are listed below for {p.count} hospital{p.count !== 1 ? "s" : ""} that
          publish usable data. The table is sorted cheapest-first so you can see the low end at a glance.
        </p>
      )}

      <h2>Why the price varies this much</h2>
      <p>
        Hospital prices aren&apos;t set by a national list. Each hospital sets its own charges and
        negotiates separately with every insurer, so the same {p.name.toLowerCase()} can carry dozens of
        different prices — and two hospitals a few miles apart routinely differ by several times
        {spread && spread >= 2 ? <> (here the gap between the cheapest and most expensive is about <strong>{spread}×</strong>)</> : null}.
        A higher price does not mean better care, so for non-emergency treatment it pays to compare before
        you book.
      </p>

      <ThreePrices />

      <h2>How to lower what you pay for {p.name}</h2>
      <ul>
        <li>
          <strong>Compare hospitals before you book.</strong> Sort the table by the cash price (if
          you&apos;re uninsured) or the negotiated price (if you&apos;re insured) and note the two or three
          cheapest options near you.
        </li>
        {outpatient ? (
          <li>
            <strong>Ask about a freestanding center.</strong> {p.name} is usually an outpatient procedure,
            and independent imaging, surgery, or lab centers are often cheaper than a hospital outpatient
            department for the same service.
          </li>
        ) : (
          <li>
            <strong>Confirm what the price includes.</strong> {p.name} is typically billed as an inpatient
            admission, so ask whether the figure covers the whole stay or just the facility fee — surgeon,
            anesthesia, and imaging can be billed separately.
          </li>
        )}
        <li>
          <strong>Get the cash price in writing.</strong> Call the hospital&apos;s billing office and ask for
          the self-pay price for the exact procedure code. If you&apos;re quoted more than the published
          figure, point to the hospital&apos;s own price file.
        </li>
        <li>
          <strong>Ask about financial assistance and itemized bills.</strong> Nonprofit hospitals are
          required to offer financial assistance, and an itemized bill lets you catch charges for things
          that didn&apos;t happen.
        </li>
      </ul>

      <h2>Where these numbers come from</h2>
      <p>
        Every figure here is pulled straight from hospitals&apos; federally-mandated machine-readable price
        files (required since 2021 under 45 CFR §180) — not estimates or models. They&apos;re meant for
        comparison; your actual bill depends on your exact care and your plan, so confirm directly before
        scheduling. <a href="/methodology">How we source this →</a> · <a href="/corrections">Spot
        something off?</a>
      </p>

      <FaqSection items={p.faq} />
    </section>
  );
}

export type HospitalEducationProps = {
  name: string;
  city: string;
  stateName: string;
  stateCode: string;
  beds: number | null;
  procCount: number;
  cashCount: number;
  asOf: string | null;
  qualityScore: number | null;
  sourceUrl: string | null;
  faq: Faq[];
};

export function HospitalEducation(p: HospitalEducationProps) {
  return (
    <section className="copy" style={{ marginTop: 40 }}>
      <h2>About pricing at {p.name}</h2>
      <p>
        {p.name} is a hospital in {p.city}, {p.stateName}
        {p.beds ? <> with {p.beds} staffed beds</> : null}. The prices below come from the standard-charges
        file it is required to publish, covering <strong>{p.procCount}</strong> procedure
        {p.procCount !== 1 ? "s" : ""}
        {p.cashCount > 0 ? <>, including {p.cashCount} with a cash (self-pay) price you can use without insurance</> : null}
        {p.asOf ? <>. The file was last posted {p.asOf}</> : null}
        {p.qualityScore != null ? <>, and scores {p.qualityScore}/100 on our data-quality checks</> : null}.
      </p>
      <p>
        These are the hospital&apos;s own published standard charges, shown so you can compare — not a quote.
        To see how {p.name} stacks up against other hospitals in the state, browse{" "}
        <a href={`/state/${p.stateCode}`}>{p.stateName} hospital prices</a>.
      </p>

      <ThreePrices />

      <h2>How to use {p.name}&apos;s prices</h2>
      <ul>
        <li>
          <strong>Find your exact procedure.</strong> Use the search box in the table to jump to the
          specific service — &quot;MRI&quot; or &quot;colonoscopy&quot; isn&apos;t one price; the exact procedure is.
        </li>
        <li>
          <strong>Compare before non-emergency care.</strong> Check the same procedure at other{" "}
          <a href={`/state/${p.stateCode}`}>{p.stateName} hospitals</a> — prices a few miles apart routinely
          differ by several times for identical care.
        </li>
        <li>
          <strong>Confirm the cash price in writing.</strong> Ask the billing office for the self-pay price
          for the exact code. If you&apos;re quoted more than the figure here, point to the hospital&apos;s own
          published file.
        </li>
        <li>
          <strong>Ask about financial assistance.</strong> Nonprofit hospitals are required to offer it, and
          requesting an itemized bill helps you catch charges for services you didn&apos;t receive.
        </li>
      </ul>

      <h2>Where these numbers come from</h2>
      <p>
        Every figure is read directly from {p.name}&apos;s machine-readable standard-charges file, required
        of U.S. hospitals since 2021 under 45 CFR §180 — not an estimate.{" "}
        {p.sourceUrl ? (
          <>
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">View the source file ↗</a> ·{" "}
          </>
        ) : null}
        <a href="/methodology">How we source this →</a> · <a href="/corrections">Spot something off?</a>
      </p>

      <FaqSection items={p.faq} />
    </section>
  );
}
