import type { ReactNode } from "react";

// Editorial guides (WS4). Each guide is one object: add an entry here and it gets a
// page at /guides/<slug>, a sitemap URL, a hub-card, and Article + FAQPage +
// BreadcrumbList structured data automatically. Drafts + data provenance live in
// docs/growth-assets/. Prices were verified against the live DB 2026-06-09 and are
// framed "as of mid-2026" with links to the live page so they self-update.

export type GuideFaq = { q: string; a: string };

export type Guide = {
  slug: string;
  title: string; // H1
  metaTitle: string;
  metaDescription: string;
  sub: string; // pagehead subhead
  updated: string; // human-readable "as of" label
  body: ReactNode; // the article prose (h2 / p / ul), authored as JSX
  faq: GuideFaq[]; // rendered visibly AND emitted as FAQPage schema
  related: { href: string; label: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "mri-cost",
    title: "How much does an MRI cost without insurance?",
    metaTitle: "How Much Does an MRI Cost Without Insurance? (Real Hospital Prices)",
    metaDescription:
      "Real MRI prices from hospitals' own published files — what a knee or brain MRI actually costs without insurance, why it varies 10×, and how to find your price.",
    sub: "What a knee or brain MRI actually costs without insurance, why the price swings 10×, and how to find your number.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does an MRI cost without insurance?</h2>
        <p>
          If you&apos;re paying out of pocket, the price that matters is the hospital&apos;s{" "}
          <strong>cash price</strong>{" "}(also called the self-pay or &quot;discounted cash&quot; price) — what the
          hospital charges someone paying directly, without insurance.
        </p>
        <p>
          Across hospitals that publish usable data, a <strong>knee MRI</strong>{" "}has a cash price with a median
          around <strong>$1,900</strong>{" "}— but that&apos;s just the middle of a very wide range: the cheapest tenth of
          hospitals list it under <strong>$600</strong>, while the most expensive tenth are over <strong>$5,000</strong>,
          for the same scan. <a href="/procedure/knee-mri">See current knee-MRI prices →</a>
        </p>
        <p>
          That spread is the single most important thing to understand about MRI pricing:{" "}
          <strong>the price has little to do with the quality of the scan.</strong>{" "}A more expensive MRI is not a
          better MRI. So if your care isn&apos;t an emergency, comparing a few hospitals before you book can save you
          four figures.
        </p>

        <h2>Why does the same MRI cost so much more at one hospital than another?</h2>
        <p>
          Hospital prices aren&apos;t set by a national list. Each hospital sets its own charges and negotiates
          separately with each insurer, so the same procedure can carry dozens of different prices — even inside one
          building — and prices at two hospitals a few miles apart routinely differ by several times.
        </p>
        <p>
          For a knee MRI, the gap between the cheap and pricey ends of the market is roughly <strong>10×</strong>{" "}
          nationally. In a single state it can be even wider: in Texas, the negotiated price for a knee MRI runs from
          about <strong>$160 to about $8,700</strong>. <a href="/state/tx">Compare Texas hospitals →</a>
        </p>

        <h2>The three prices to know</h2>
        <p>Every hospital publishes three kinds of price for a procedure. Knowing the difference is how you avoid overpaying:</p>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly without insurance. This is your number if you&apos;re uninsured.</li>
          <li><strong>Negotiated price</strong>{" "}— the rate a specific insurance plan agreed to pay. It varies by insurer; if you have insurance, this is what your plan is billed.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the hospital&apos;s list price before any discount. Almost nobody pays this. Ignore it except as a starting point.</li>
        </ul>
        <p>
          One thing worth checking even if you <em>do</em>{" "}have insurance: the cash price is <strong>sometimes</strong>{" "}
          lower than your plan&apos;s negotiated rate — it happens in roughly <strong>1 in 3</strong>{" "}cases across all
          procedures. It&apos;s not a rule (for MRIs specifically, the negotiated rate is usually the lower one), so the
          only way to know is to look at both. <a href="/guides/cash-vs-negotiated-price">More on cash vs. negotiated →</a>
        </p>

        <h2>How to find your MRI price</h2>
        <ul>
          <li><strong>Look up the specific scan.</strong>{" "}&quot;MRI&quot; isn&apos;t one price — a brain MRI, a knee MRI, and a spine MRI are different procedures with different costs. Search the exact one in <a href="/procedures">the procedures list</a>.</li>
          <li><strong>Compare hospitals near you.</strong>{" "}Sort by the cash price (if uninsured) or the negotiated price (if insured), cheapest first, and note two or three options.</li>
          <li><strong>Confirm before you book.</strong>{" "}Call the hospital&apos;s billing office and ask for the cash or self-pay price in writing for that procedure. Published files are dated and can lag, so confirm the current number — and ask whether a freestanding imaging center is an option, since they&apos;re often cheaper than a hospital.</li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          These figures come straight from each hospital&apos;s federally-mandated price file (required since 2021 under
          45 CFR §180) — not estimates or models. They&apos;re meant for comparison. Your actual bill depends on your
          exact care, your plan, and the hospital, so confirm directly before scheduling.{" "}
          <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is an MRI cheaper without insurance?",
        a: "Sometimes, but not usually for an MRI. The uninsured cash price for a knee MRI has a median around $1,900, while the median negotiated insurance rate is closer to $700. If you have insurance, your plan's rate is often lower — but in about 1 in 3 procedures overall the cash price wins, so it's worth comparing both.",
      },
      {
        q: "Why is one hospital's MRI 10 times more expensive than another's?",
        a: "Because hospitals set prices independently and negotiate separately with each insurer. A higher price doesn't mean a better scan. For non-emergency imaging, comparing hospitals can save you thousands.",
      },
      {
        q: "What's the difference between the cash price and the negotiated price?",
        a: "The cash (self-pay) price is what you pay directly without insurance. The negotiated price is the rate a specific insurance plan agreed to pay. They can differ a lot, and which is lower depends on the hospital and procedure.",
      },
      {
        q: "Can I just ask the hospital for the cash price?",
        a: "Yes. Ask the billing office for the self-pay or cash price in writing for the specific procedure. You can also point to the hospital's published price file if you're quoted more.",
      },
    ],
    related: [
      { href: "/procedure/knee-mri", label: "Knee MRI prices" },
      { href: "/procedure/brain-mri-with-and-without-contrast", label: "Brain MRI prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "cash-vs-negotiated-price",
    title: "Cash price vs. negotiated price vs. chargemaster",
    metaTitle: "Cash Price vs. Negotiated Price vs. Chargemaster: What You Actually Pay",
    metaDescription:
      "Hospitals list three prices for every procedure. Here's what cash, negotiated, and chargemaster prices mean — and why the cash price sometimes beats your insurance rate.",
    sub: "Hospitals list three very different prices for the same procedure. Here's what each means — and which one you should actually pay.",
    updated: "June 2026",
    body: (
      <>
        <h2>A hospital has three prices for the same procedure</h2>
        <p>
          When a hospital publishes what it charges, you&apos;ll see three very different numbers for the exact same
          service. Knowing which is which is the difference between paying a fair price and overpaying by thousands.
        </p>

        <h2>Gross (chargemaster) price</h2>
        <p>
          The hospital&apos;s list price before any discount or insurance — the &quot;sticker price.&quot; It&apos;s
          almost always the highest number, and <strong>almost nobody actually pays it.</strong>{" "}Treat it as a starting
          point, not a real price.
        </p>

        <h2>Negotiated price</h2>
        <p>
          The rate a <strong>specific insurance plan</strong>{" "}has agreed to pay the hospital. There isn&apos;t one
          negotiated price — there&apos;s a different one for each insurer and often each plan, which is why the same
          procedure can have dozens of prices at a single hospital. If you have insurance, this is the rate your plan is
          billed (you then owe your copay, deductible, or coinsurance against it).
        </p>

        <h2>Cash (self-pay) price</h2>
        <p>
          What the hospital charges someone paying <strong>directly, without insurance.</strong>{" "}Also called the
          discounted cash price. This is your number if you&apos;re uninsured — and sometimes it&apos;s worth a look
          even if you&apos;re not.
        </p>

        <h2>The surprising part: cash sometimes beats insurance</h2>
        <p>
          You&apos;d expect the negotiated insurance rate to always be the lowest. It isn&apos;t. Across the hospitals
          and procedures with published data, the <strong>cash price is lower than the negotiated rate in about 1 in 3
          cases (roughly 32%).</strong>
        </p>
        <p>
          That means if your deductible is high and you haven&apos;t met it, paying the cash price out of pocket can
          sometimes cost <em>less</em>{" "}than running it through insurance at the negotiated rate. It&apos;s not a rule —
          for many procedures the negotiated rate is still lower — so the only way to know is to compare both numbers
          for your specific hospital and procedure.
        </p>
        <p>
          <strong>One catch:</strong>{" "}paying cash usually means the amount won&apos;t count toward your deductible. So if
          you expect a lot more care this year, weigh that before choosing the cash route.
        </p>

        <h2>How to use this to lower your bill</h2>
        <ul>
          <li><strong>Look up the procedure</strong>{" "}and read all three prices for the hospitals near you.</li>
          <li><strong>Compare your real cost both ways</strong>{" "}— the cash price vs. what you&apos;d owe toward your deductible or coinsurance at the negotiated rate. Pick the lower one.</li>
          <li><strong>Ask in writing.</strong>{" "}Request the self-pay or cash price for the specific procedure code from the billing office before you book.</li>
          <li><strong>If you&apos;re billed more than the published rate,</strong>{" "}point to the hospital&apos;s own price file and ask to be charged the documented rate. Ask for an itemized bill, check it for errors, and request financial assistance or a payment plan if you qualify — many nonprofit hospitals are required to offer charity care.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Since 2021, federal rule 45 §180 requires hospitals to publish a machine-readable file listing their standard
          charges — gross, cash, and negotiated. OpenHospitalCost reads those public files and makes them searchable,
          with every price dated and linked back to its source. We don&apos;t estimate — we show what the hospital
          reported. <a href="/methodology">How we source this →</a>{" "}These figures are for comparison, not a quote.
        </p>
      </>
    ),
    faq: [
      {
        q: "What's the difference between cash price and negotiated price?",
        a: "The cash (self-pay) price is what you pay directly without insurance. The negotiated price is the rate a specific insurance plan agreed to pay. They can differ significantly, and which is lower depends on the hospital and procedure.",
      },
      {
        q: "Is the cash price ever cheaper than using insurance?",
        a: "Yes — in about 1 in 3 cases the cash price is lower than the negotiated insurance rate. If you have a high unmet deductible, paying cash can sometimes cost less, though it usually won't count toward your deductible.",
      },
      {
        q: "What is a chargemaster price?",
        a: "It's the hospital's full list price before any discount or insurance. Almost no one actually pays it; it's mainly a starting point for negotiation and billing.",
      },
      {
        q: "Can I ask a hospital for the cash price if I have insurance?",
        a: "Yes. You can ask the billing office for the self-pay price and compare it to your expected out-of-pocket cost at the negotiated rate, then choose whichever is lower.",
      },
    ],
    related: [
      { href: "/guides/mri-cost", label: "How much does an MRI cost?" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/procedures", label: "Browse all procedures" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },

  {
    slug: "why-prices-vary",
    title: "Why the same surgery costs 10× more at one hospital than another",
    metaTitle: "Why the Same Surgery Costs 10× More at One Hospital Than Another",
    metaDescription:
      "The price of common surgery swings 10× or more between hospitals — for the same operation. Here's why, with real numbers from hospitals' own price files.",
    sub: "The same operation can cost ten times more across town. Here's why — with real numbers from hospitals' own files.",
    updated: "June 2026",
    body: (
      <>
        <h2>The same operation, ten times the price</h2>
        <p>
          A laparoscopic gallbladder removal — one of the most common operations in the country — has a negotiated
          price under <strong>$1,000</strong>{" "}at the cheapest tenth of hospitals and over <strong>$12,000</strong>{" "}at
          the priciest tenth. That&apos;s a <strong>13× swing</strong>{" "}for the same surgery.{" "}
          <a href="/procedure/laparoscopic-gallbladder-removal">See current gallbladder-removal prices →</a>
        </p>
        <p>
          It&apos;s not unusual. A total knee replacement runs from roughly <strong>$1,900</strong>{" "}to{" "}
          <strong>$21,500</strong>{" "}across hospitals — an <strong>11× spread</strong>{" "}— with a national median around{" "}
          <strong>$13,000</strong>. <a href="/procedure/knee-replacement">Knee replacement prices →</a>
        </p>
        <p>The same operation. The same medical task. A price that varies by an order of magnitude. Here&apos;s why.</p>

        <h2>Prices aren&apos;t set by a list — they&apos;re negotiated, one deal at a time</h2>
        <p>
          There is no national price for a hospital procedure. Each hospital sets its own charges and negotiates
          separately with every insurer, so a single operation can carry dozens of different prices inside one building
          — one for each insurance plan, plus a cash price, plus the list price. Multiply that across thousands of
          hospitals and you get the spread you see. Three things drive the differences:
        </p>
        <ul>
          <li><strong>Negotiating leverage.</strong>{" "}A large hospital system can demand higher rates from insurers; a smaller one has less power. The price reflects the deal, not the care.</li>
          <li><strong>How the hospital reports the service.</strong>{" "}Some prices bundle the whole operation; others show only a facility fee or a single line item. (This is why an occasional number looks oddly low — always open the page and read what&apos;s included.)</li>
          <li><strong>Local market conditions.</strong>{" "}Areas with little hospital competition tend to have higher prices, full stop.</li>
        </ul>
        <p>
          What <em>doesn&apos;t</em>{" "}reliably drive the difference: the quality of the care.{" "}
          <strong>A more expensive surgery is not a safer or better surgery.</strong>{" "}Price and quality are largely
          unrelated, which is exactly why shopping makes sense for anything non-emergency.
        </p>

        <h2>What to do with this</h2>
        <ul>
          <li><strong>Look up the specific procedure</strong>{" "}and compare the hospitals near you — the gap between two options a few miles apart is often thousands of dollars.</li>
          <li><strong>Compare the right price for your situation</strong>{" "}— the cash price if you&apos;re uninsured, the negotiated price if you&apos;re insured.</li>
          <li><strong>Confirm before you book.</strong>{" "}Published files are dated and can lag, so call the billing office and get the price for that procedure in writing. Ask what&apos;s included — facility fee, surgeon, anesthesia — so you&apos;re comparing like for like.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Every figure here is pulled directly from hospitals&apos; own federally-mandated price files (required since
          2021 under 45 §180) — not estimates. They&apos;re for comparison, not a quote; your actual cost depends on
          your care and your plan. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Why does the same surgery cost so much more at one hospital than another?",
        a: "Because hospitals set prices independently and negotiate separately with each insurer. The same operation can have dozens of prices, and the gap between hospitals is often 10x or more. A higher price doesn't mean better care.",
      },
      {
        q: "Does a more expensive hospital mean better quality?",
        a: "No. Price and quality are largely unrelated in hospital pricing. The cost reflects the hospital's negotiating power and local market, not the safety or outcome of the procedure.",
      },
      {
        q: "How much can I save by comparing hospitals?",
        a: "For common surgery the spread is often thousands of dollars. A gallbladder removal ranges from under $1,000 to over $12,000; a knee replacement from about $1,900 to $21,500.",
      },
    ],
    related: [
      { href: "/procedure/laparoscopic-gallbladder-removal", label: "Gallbladder removal prices" },
      { href: "/procedure/knee-replacement", label: "Knee replacement prices" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "hospital-bill",
    title: "How to read (and fight) a hospital bill",
    metaTitle: "How to Read and Fight a Hospital Bill (and Pay Less)",
    metaDescription:
      "A step-by-step guide to reading a hospital bill, spotting errors, and using the hospital's own published prices to push back on charges you can't afford.",
    sub: "A hospital bill is a starting point, not a final number. Here's how to read one, find errors, and pay less.",
    updated: "June 2026",
    body: (
      <>
        <h2>You have more leverage than the bill suggests</h2>
        <p>
          A hospital bill is a starting point, not a final number. Hospitals are required to publish their actual
          prices, you&apos;re entitled to an itemized breakdown, and there are well-worn paths to a lower bill.
          Here&apos;s how to work through one.
        </p>

        <h2>1. Get the itemized bill</h2>
        <p>
          The first bill you receive is usually a summary — a few big line items, no detail. Call the billing office and
          request a <strong>fully itemized bill</strong>{" "}with every charge and its billing code (CPT, HCPCS, or DRG).
          You can&apos;t check a bill you can&apos;t see. This is your right; ask for it in writing.
        </p>

        <h2>2. Check it for errors</h2>
        <p>Once you have the itemized version, look for the common problems:</p>
        <ul>
          <li><strong>Duplicate charges</strong>{" "}— the same item or service billed twice.</li>
          <li><strong>Services you didn&apos;t receive</strong>{" "}— a test, medication, or room charge that doesn&apos;t match your stay.</li>
          <li><strong>Quantity errors</strong>{" "}— billed for more units than you got.</li>
          <li><strong>Wrong codes</strong>{" "}— a more expensive version of a procedure than what was done.</li>
        </ul>
        <p>Match the big-ticket codes against your memory of the care and against the hospital&apos;s published price for that code.</p>

        <h2>3. Compare against the published price</h2>
        <p>
          Since 2021, hospitals must publish their standard charges — gross, cash, and negotiated — in a public file. If
          you&apos;ve been billed <strong>more than the published rate</strong>{" "}for a procedure, that&apos;s your
          strongest piece of leverage. Look up the code on{" "}
          <a href="/procedures">OpenHospitalCost</a>, bring the specific number, and ask the billing office to charge
          you the documented cash or negotiated rate. If you&apos;re uninsured, the <strong>cash (self-pay) price</strong>{" "}
          is the relevant one — and it&apos;s sometimes far below the list price you were billed.
        </p>

        <h2>4. Ask for the cash price or financial assistance</h2>
        <p>Several routes can lower what you owe:</p>
        <ul>
          <li><strong>Self-pay / cash price.</strong>{" "}Ask for it in writing and compare it to your billed amount.</li>
          <li><strong>Financial assistance / charity care.</strong>{" "}Many nonprofit hospitals are required to offer charity care to patients below certain income thresholds. Ask for the financial assistance application — eligibility is often more generous than people expect.</li>
          <li><strong>Prompt-pay discount.</strong>{" "}Some hospitals knock a percentage off if you pay in full quickly.</li>
          <li><strong>Payment plan.</strong>{" "}A zero-interest plan won&apos;t lower the total but makes it manageable; ask before anything goes to collections.</li>
        </ul>

        <h2>5. Negotiate — politely and in writing</h2>
        <p>
          Call, be calm, and make a specific, documented ask: &quot;Your published cash price for this code is $X; I was
          billed $Y; can you adjust it?&quot; Keep notes of who you spoke to and when, and get any agreement in writing.
          If you hit a wall, ask to speak with a billing supervisor or a patient advocate.
        </p>

        <h2>6. Don&apos;t ignore it</h2>
        <p>
          The worst move is silence — unpaid bills can go to collections and hurt your credit. Hospitals would rather
          set up a plan than send a bill to collections, so engage early. If the amount is large or you suspect billing
          fraud, a medical-billing advocate can negotiate on your behalf.
        </p>

        <h2>A note on what these prices are</h2>
        <p>
          The prices on OpenHospitalCost come straight from each hospital&apos;s federally-mandated file (45 §180) —
          published figures for comparison, not a quote for your specific care. They&apos;re a tool for checking a bill
          and starting a conversation, not a guarantee. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Can I negotiate a hospital bill?",
        a: "Often, yes. Get an itemized bill, check it for errors, compare charges to the hospital's published prices, and ask for the cash rate, financial assistance, or a payment plan. Bring specific numbers and keep everything in writing.",
      },
      {
        q: "What if I was billed more than the hospital's published price?",
        a: "That's strong leverage. Point to the hospital's own published cash or negotiated rate for the billing code and ask to be charged that amount.",
      },
      {
        q: "Do hospitals have to offer financial assistance?",
        a: "Many nonprofit hospitals are required to provide charity care to qualifying lower-income patients. Ask the billing office for the financial assistance application.",
      },
      {
        q: "How do I get an itemized hospital bill?",
        a: "Call the billing office and request a fully itemized bill listing every charge and its billing code. You're entitled to it.",
      },
    ],
    related: [
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/guides/price-transparency-law", label: "What the price transparency law requires" },
      { href: "/procedures", label: "Look up a procedure price" },
      { href: "/faq", label: "Hospital price FAQ" },
    ],
  },

  {
    slug: "price-transparency-law",
    title: "What the hospital price transparency law actually requires",
    metaTitle: "What the Hospital Price Transparency Law Requires (and How to Use It)",
    metaDescription:
      "Since 2021, US hospitals must publish their actual prices. Here's what the law (45 CFR §180) requires, what's in the files, and how to use it to your advantage.",
    sub: "Since 2021, US hospitals must publish their actual prices. Here's what the law requires — and how to use it.",
    updated: "June 2026",
    body: (
      <>
        <h2>Hospitals must publish their prices — here&apos;s the rule</h2>
        <p>
          Since <strong>January 1, 2021</strong>, federal regulations at <strong>45 CFR Part 180</strong>{" "}require every
          hospital operating in the United States to publish its <strong>standard charges</strong>{" "}for the items and
          services it provides. The rule implements a provision of the Public Health Service Act and is enforced by the
          Centers for Medicare &amp; Medicaid Services (CMS). There are two separate requirements.
        </p>

        <h2>1. A comprehensive machine-readable file</h2>
        <p>
          Every hospital must post a single <strong>machine-readable file</strong>{" "}listing the standard charges for{" "}
          <strong>all</strong>{" "}items and services. As of <strong>July 1, 2024</strong>, that file has to follow a
          standardized CMS template, in CSV or JSON format, with a defined data dictionary — which is what makes it
          possible to compare hospitals at all. The file must include four kinds of standard charge:
        </p>
        <ul>
          <li><strong>Gross charge</strong>{" "}— the chargemaster list price, before any discount.</li>
          <li><strong>Discounted cash price</strong>{" "}— what a self-pay patient is charged.</li>
          <li><strong>Payer-specific negotiated charge</strong>{" "}— the rate for each insurer and plan.</li>
          <li><strong>De-identified minimum and maximum negotiated charges</strong>{" "}— the range across all payers.</li>
        </ul>
        <p>
          Recent updates also require hospitals to encode an <strong>estimated allowed amount</strong>{" "}(what a plan
          actually pays) and to <strong>attest</strong>{" "}that the data is true and complete.
        </p>

        <h2>2. A consumer-friendly display of 300 shoppable services</h2>
        <p>
          Separately, each hospital must present prices for <strong>300 &quot;shoppable&quot; services</strong>{" "}in a
          consumer-friendly format — or offer a price-estimator tool that gives a personalized out-of-pocket estimate.
          Shoppable services are the ones you can plan ahead for: imaging, lab tests, common procedures, scheduled
          surgery.
        </p>

        <h2>Why the files are hard to use (and where we come in)</h2>
        <p>
          The data exists, but it&apos;s not built for humans. The machine-readable files are often hundreds of
          megabytes, formatted differently by every hospital, and full of billing codes without plain-English labels.
          Compliance is also uneven — some hospitals publish clean, complete files; others publish incomplete or
          hard-to-parse data.
        </p>
        <p>
          OpenHospitalCost reads those public files, normalizes them into comparable prices, and makes them searchable
          by <a href="/procedures">procedure</a>, <a href="/hospitals">hospital</a>, and <a href="/states">state</a>{" "}—
          with every number dated and linked back to its source file. We don&apos;t estimate or model; we show what the
          hospital reported. <a href="/methodology">How we source this →</a>
        </p>

        <h2>How to use the law to your advantage</h2>
        <ul>
          <li><strong>Compare before non-emergency care.</strong>{" "}The whole point of the rule is to let you shop. Look up the procedure and compare hospitals near you.</li>
          <li><strong>Check a bill against the published rate.</strong>{" "}If you&apos;re billed more than a hospital&apos;s own published cash or negotiated price, that&apos;s leverage to ask for the documented rate.</li>
          <li><strong>Ask for the cash price.</strong>{" "}It&apos;s one of the four charges hospitals must publish, and it&apos;s sometimes lower than the negotiated insurance rate.</li>
          <li><strong>Confirm before you book.</strong>{" "}Files are dated and can lag, so verify the current number with the hospital.</li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          These figures are published data for comparison, not a quote. Coverage is partial and growing, some files are
          incomplete, and your actual cost depends on your care and your insurance. Always confirm directly with the
          hospital and your insurer.
        </p>
      </>
    ),
    faq: [
      {
        q: "Are hospitals required to publish their prices?",
        a: "Yes. Since 2021, federal rule 45 CFR §180 requires every US hospital to publish its standard charges — gross, cash, and negotiated — in a machine-readable file, plus a consumer-friendly display of 300 shoppable services or a price-estimator tool.",
      },
      {
        q: "What prices are in a hospital's machine-readable file?",
        a: "Four kinds: the gross (list) charge, the discounted cash price, the payer-specific negotiated rate for each plan, and the de-identified minimum and maximum negotiated charges.",
      },
      {
        q: "When did hospital price transparency become law?",
        a: "The regulations took effect January 1, 2021. A standardized CMS file template became required July 1, 2024.",
      },
      {
        q: "Why are the price files so hard to read?",
        a: "They're built for machines, not people — often very large, inconsistently formatted, and full of billing codes. Sites like OpenHospitalCost translate them into searchable, plain-English prices.",
      },
    ],
    related: [
      { href: "/methodology", label: "Our methodology" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/data", label: "Data sources" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "colonoscopy-cost",
    title: "How much does a colonoscopy cost?",
    metaTitle: "How Much Does a Colonoscopy Cost? (Real Hospital Prices)",
    metaDescription:
      "Real colonoscopy prices from hospitals' own files — what it costs with and without insurance, why screening can be free, and how to find the price near you.",
    sub: "What a colonoscopy costs with and without insurance, why screening can be free, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a colonoscopy cost?</h2>
        <p>It depends heavily on one thing most people don&apos;t realize matters: <strong>whether it&apos;s a screening or a diagnostic colonoscopy.</strong></p>
        <ul>
          <li><strong>Screening colonoscopy</strong>{" "}— a routine check with no symptoms, at the recommended age. Under the Affordable Care Act, most insurance plans must cover preventive screening colonoscopies at <strong>no cost to you</strong>. If you&apos;re insured and due for a routine screening, your out-of-pocket cost may be $0.</li>
          <li><strong>Diagnostic colonoscopy</strong>{" "}— done because of symptoms, a positive stool test, or to follow up on a prior finding. This one is billed like any other procedure, and the price varies a lot.</li>
        </ul>
        <p>
          For a diagnostic colonoscopy at hospitals with published data, the <strong>cash (self-pay) price</strong>{" "}has
          a median around <strong>$1,600</strong>, ranging from about <strong>$500</strong>{" "}at the cheapest tenth of
          hospitals to nearly <strong>$4,000</strong>{" "}at the priciest. If you&apos;re insured, the{" "}
          <strong>negotiated rate</strong>{" "}is a bit lower on average — a median around <strong>$1,200</strong>.{" "}
          <a href="/procedure/colonoscopy">See current colonoscopy prices →</a>
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same procedure carries many
          different prices — and two hospitals a few miles apart can differ by several times. A colonoscopy also bundles
          several pieces (the facility, the doctor, sometimes anesthesia and pathology if a polyp is removed), and how a
          hospital reports those affects the number you see. A higher price doesn&apos;t mean a better procedure.
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Know which type you&apos;re getting.</strong>{" "}Ask your doctor whether it&apos;s coded as screening or diagnostic; it can change your cost dramatically. If it starts as a screening and a polyp is removed, billing can shift to diagnostic — ask how that&apos;s handled.</li>
          <li><strong>Compare hospitals near you</strong>{" "}and sort by the cash price if uninsured, the negotiated price if insured.</li>
          <li><strong>Consider the setting.</strong>{" "}An ambulatory surgery center or outpatient clinic is often cheaper than a hospital for a routine colonoscopy.</li>
          <li><strong>Confirm before you book.</strong>{" "}Ask the billing office for the price in writing for that procedure code, and ask what&apos;s included.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not estimates and not a quote. Your actual cost depends on your care, your
          plan, and whether anything is found during the procedure. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is a colonoscopy free with insurance?",
        a: "A routine screening colonoscopy is covered at no cost by most insurance plans under the ACA's preventive-care rules. A diagnostic colonoscopy — done for symptoms or follow-up — is billed normally and your cost depends on your plan.",
      },
      {
        q: "How much does a colonoscopy cost without insurance?",
        a: "The cash self-pay price for a diagnostic colonoscopy has a median around $1,600, ranging from roughly $500 to $4,000 depending on the hospital. Comparing hospitals can save a lot.",
      },
      {
        q: "Why did my screening colonoscopy turn into a bill?",
        a: "If a polyp is found and removed, billing can change from screening to diagnostic. Ask your provider and insurer how that's coded before the procedure.",
      },
      {
        q: "Where is a colonoscopy cheapest?",
        a: "Ambulatory surgery centers and outpatient clinics are often cheaper than hospitals. Compare the specific hospitals near you, since prices vary several-fold within one area.",
      },
    ],
    related: [
      { href: "/procedure/colonoscopy", label: "Colonoscopy prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
      { href: "/faq", label: "Hospital price FAQ" },
    ],
  },
  {
    slug: "ct-scan-cost",
    title: "How much does a CT scan cost?",
    metaTitle: "How Much Does a CT Scan Cost? (Real Hospital Prices)",
    metaDescription:
      "Real CT scan prices from hospitals' own files — what a head, chest, or abdominal CT costs with and without insurance, and why it varies 10×.",
    sub: "What a head, chest, or abdominal CT scan costs with and without insurance, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a CT scan cost?</h2>
        <p>
          A CT scan&apos;s price depends on the body part and whether contrast dye is used — and, like most hospital
          care, on which hospital you go to. For a <strong>head CT</strong>, one of the most common, the cash self-pay
          price has a median around <strong>$1,100</strong>, ranging from about <strong>$300</strong>{" "}at the cheapest
          tenth of hospitals to over <strong>$3,400</strong>{" "}at the priciest. If you&apos;re insured, the negotiated
          rate is much lower on average — a median around <strong>$340</strong>.{" "}
          <a href="/procedure/head-ct-scan">See current head-CT prices →</a>
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same scan carries many
          different prices — and two hospitals a few miles apart can differ by several times. A head CT runs roughly{" "}
          <strong>10×</strong>{" "}more at the priciest hospitals than the cheapest.{" "}
          <strong>A more expensive scan is not a better scan</strong>{" "}— for non-emergency imaging, comparing is worth
          it.
        </p>

        <h2>The three prices to know</h2>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly without insurance.</li>
          <li><strong>Negotiated price</strong>{" "}— the rate a specific insurance plan agreed to pay.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the list price before any discount; almost nobody pays it.</li>
        </ul>
        <p>
          Which is lower depends on the hospital. <a href="/guides/cash-vs-negotiated-price">More on cash vs. negotiated →</a>
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Look up the exact scan.</strong>{" "}A head CT, a chest CT, and an abdominal CT are different procedures with different prices, and adding contrast dye costs more. Search the specific one in <a href="/procedures">the procedures list</a>.</li>
          <li><strong>Consider a freestanding imaging center.</strong>{" "}They&apos;re often much cheaper than a hospital for a routine CT.</li>
          <li><strong>Confirm before you book.</strong>{" "}Ask the billing office for the price in writing for that procedure code, and whether contrast is included.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not estimates and not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is a CT scan cheaper without insurance?",
        a: "Usually not. The uninsured cash price for a head CT has a median around $1,100, while the median negotiated insurance rate is closer to $340. If you have insurance, your plan's rate is often lower — but it's always worth comparing both.",
      },
      {
        q: "Why does a CT scan cost more at one hospital than another?",
        a: "Hospitals set prices independently and negotiate separately with each insurer, so the same scan can cost 10x more at one hospital than another. A higher price doesn't mean a better scan.",
      },
      {
        q: "Does contrast dye change the price?",
        a: "Yes. A CT with contrast, or with and without contrast, is a separate, more expensive procedure than a CT without contrast. Make sure you're comparing the same one.",
      },
      {
        q: "Where is a CT scan cheapest?",
        a: "Freestanding imaging centers and outpatient clinics are often much cheaper than hospitals for a routine CT. Compare the specific hospitals and centers near you.",
      },
    ],
    related: [
      { href: "/procedure/head-ct-scan", label: "Head CT prices" },
      { href: "/procedure/chest-ct-scan", label: "Chest CT prices" },
      { href: "/guides/mri-cost", label: "How much does an MRI cost?" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "er-visit-cost",
    title: "How much does an ER visit cost?",
    metaTitle: "How Much Does an ER Visit Cost? (Real Hospital Prices)",
    metaDescription:
      "Real emergency room prices from hospitals' own files — what the ER facility fee costs, why the total bill runs higher, and how to read and fight an ER bill.",
    sub: "What an ER visit's facility fee really costs, why the total bill runs higher, and how to read and fight it.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does an ER visit cost?</h2>
        <p>
          Emergency care is the one thing you can&apos;t shop for — but you can still understand the bill. Hospitals
          charge an ER <strong>facility fee</strong>{" "}graded by complexity, from level 1 (minor) to level 5 (critical).
          For a mid-level <strong>(level 3)</strong>{" "}visit, the cash self-pay facility fee has a median around{" "}
          <strong>$650</strong>, ranging from about <strong>$250</strong>{" "}to <strong>$1,800</strong>{" "}depending on the
          hospital. The negotiated insurance rate is lower on average — a median around <strong>$430</strong>.{" "}
          <a href="/procedure/er-visit-level-3">See current ER-visit prices →</a>
        </p>
        <p>
          <strong>Important:</strong>{" "}that facility fee is just one line on an ER bill. Your total also includes anything
          done during the visit — lab tests, imaging, medications, and any separate doctor&apos;s fees — so a real ER
          trip usually costs more than the visit fee alone.
        </p>

        <h2>Why ER bills vary so much</h2>
        <p>
          The facility-fee level is meant to reflect how much care and staff time the visit took, but hospitals apply it
          differently, and each one negotiates its own rates with insurers. The same mid-level visit can cost several
          times more at one hospital than another. You can&apos;t choose where to go in a true emergency — but knowing
          the typical range helps you spot a bill that&apos;s out of line.
        </p>

        <h2>How to read and lower an ER bill</h2>
        <ul>
          <li><strong>Get an itemized bill.</strong>{" "}Check that the facility-fee level matches the care you actually got — a routine visit billed at level 4 or 5 is worth questioning.</li>
          <li><strong>Compare to the published rate.</strong>{" "}If you were billed more than the hospital&apos;s own published price for that code, ask for the documented rate.</li>
          <li><strong>Ask for the cash price or financial assistance.</strong>{" "}Many nonprofit hospitals are required to offer charity care. <a href="/guides/hospital-bill">How to read and fight a hospital bill →</a></li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much is an ER visit without insurance?",
        a: "The cash facility fee for a mid-level (level 3) ER visit has a median around $650, ranging from about $250 to $1,800. That's just the visit fee — your total also includes any tests, imaging, medications, and doctor's fees, so the full bill is usually higher.",
      },
      {
        q: "What is an ER facility fee level?",
        a: "Hospitals grade the ER visit itself from level 1 (minor) to level 5 (critical) based on the complexity of care. A higher level means a higher facility fee.",
      },
      {
        q: "Why is my ER bill so high?",
        a: "An ER bill is the facility fee plus everything done during the visit — labs, imaging, drugs, and separate physician charges. Each piece is billed, and hospitals negotiate their own rates, so totals vary widely. The bill can be itemized and disputed.",
      },
      {
        q: "Can I negotiate an ER bill?",
        a: "Yes. Get an itemized bill, check the facility-fee level matches the care, compare charges to the hospital's published prices, and ask for the cash rate, financial assistance, or a payment plan.",
      },
    ],
    related: [
      { href: "/procedure/er-visit-level-3", label: "ER visit prices" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "mammogram-cost",
    title: "How much does a mammogram cost?",
    metaTitle: "How Much Does a Mammogram Cost? (Real Hospital Prices)",
    metaDescription:
      "Real mammogram prices from hospitals' own files — why screening mammograms are usually free, what a diagnostic mammogram costs, and how to find your price.",
    sub: "Why a screening mammogram is usually free, what a diagnostic one costs, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a mammogram cost?</h2>
        <p>Like a colonoscopy, the answer depends on whether it&apos;s a screening or a diagnostic mammogram.</p>
        <ul>
          <li><strong>Screening mammogram</strong>{" "}— a routine check with no symptoms, at the recommended age. Under the Affordable Care Act, most insurance plans must cover screening mammograms at <strong>no cost to you</strong>. If you&apos;re insured and due for a routine screening, your out-of-pocket cost may be $0.</li>
          <li><strong>Diagnostic mammogram</strong>{" "}— done for a symptom, a lump, or to follow up on a screening finding. This one is billed like any other procedure.</li>
        </ul>
        <p>
          For a diagnostic mammogram, the cash self-pay price has a median around <strong>$370</strong>, from about{" "}
          <strong>$150</strong>{" "}to <strong>$850</strong>{" "}depending on the hospital. A screening mammogram&apos;s cash
          price is a bit lower — a median around <strong>$270</strong>. If you&apos;re insured, the negotiated rates are
          lower still (around <strong>$210</strong>{" "}diagnostic, <strong>$180</strong>{" "}screening).{" "}
          <a href="/procedure/diagnostic-mammogram">See current mammogram prices →</a>
        </p>

        <h2>Why the price varies</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same mammogram carries many
          different prices, and hospitals a few miles apart can differ by several times. A higher price doesn&apos;t mean
          a better image.
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Know which type you&apos;re getting.</strong>{" "}If a screening mammogram finds something and you&apos;re called back, the follow-up diagnostic imaging is billed — ask how it&apos;s coded.</li>
          <li><strong>Compare hospitals and imaging centers near you.</strong>{" "}Freestanding centers are often cheaper.</li>
          <li><strong>Confirm before you book.</strong>{" "}Ask the billing office for the price in writing for that procedure code.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is a mammogram free?",
        a: "A routine screening mammogram is covered at no cost by most insurance plans under the ACA's preventive-care rules. A diagnostic mammogram — done for symptoms or follow-up — is billed normally and your cost depends on your plan.",
      },
      {
        q: "How much does a mammogram cost without insurance?",
        a: "The cash self-pay price has a median around $270 for a screening mammogram and around $370 for a diagnostic one, varying by hospital. Comparing facilities can save money.",
      },
      {
        q: "What's the difference between a screening and a diagnostic mammogram?",
        a: "A screening mammogram is a routine check with no symptoms and is usually free with insurance. A diagnostic mammogram is done for a symptom or to follow up on a finding, and it's billed normally.",
      },
      {
        q: "Why did my screening mammogram lead to a bill?",
        a: "If a screening finds something and you're called back for more images, that follow-up is billed as diagnostic imaging. Ask your provider and insurer how it's coded.",
      },
    ],
    related: [
      { href: "/procedure/screening-mammogram", label: "Screening mammogram prices" },
      { href: "/procedure/diagnostic-mammogram", label: "Diagnostic mammogram prices" },
      { href: "/guides/colonoscopy-cost", label: "How much does a colonoscopy cost?" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "childbirth-cost",
    title: "How much does it cost to have a baby?",
    metaTitle: "How Much Does It Cost to Have a Baby? (Real Hospital Prices)",
    metaDescription:
      "Real childbirth prices from hospitals' own files — what a vaginal delivery and a C-section cost, and why your total hospital bill runs higher.",
    sub: "What a vaginal delivery and a C-section cost at the hospital — and why your total bill runs higher than the delivery price alone.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does childbirth cost?</h2>
        <p>
          For the delivery itself, hospitals with published data show a <strong>vaginal delivery</strong>{" "}with a
          negotiated price (the &quot;global&quot; maternity package) with a median around <strong>$3,100</strong>,
          ranging from about <strong>$1,950</strong>{" "}to <strong>$7,900</strong>. A <strong>cesarean (C-section)</strong>{" "}
          costs more — a median around <strong>$3,500</strong>, up to <strong>$8,500</strong>{" "}at the priciest hospitals.{" "}
          <a href="/procedure/vaginal-delivery">See current delivery prices →</a>
        </p>
        <p>
          <strong>Important:</strong>{" "}those figures are the price of the delivery itself. Your total hospital bill for
          having a baby is usually higher, because the hospital stay, anesthesia (like an epidural), and the
          newborn&apos;s own care are billed separately. Treat the delivery price as a floor, not the whole bill.
        </p>

        <h2>Why childbirth prices vary so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same delivery carries many
          different prices — and hospitals in the same area can differ by several times. A C-section costs more than a
          vaginal birth on average because it&apos;s surgery, and a birth center is often cheaper than a hospital for an
          uncomplicated delivery.
        </p>

        <h2>How to plan and lower your cost</h2>
        <ul>
          <li><strong>Check your plan&apos;s maternity coverage and deductible.</strong>{" "}Maternity care is a covered benefit on ACA plans, but you still owe your deductible and coinsurance.</li>
          <li><strong>Ask the hospital for a full estimate</strong>{" "}— the delivery plus the facility stay and newborn care — not just the delivery code.</li>
          <li><strong>Compare hospitals if you have options,</strong>{" "}and ask about the cash or self-pay price if you&apos;re uninsured. Many nonprofit hospitals offer financial assistance. <a href="/guides/hospital-bill">How to read and fight a hospital bill →</a></li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. Your actual cost depends on your care, your plan, and your
          delivery. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does it cost to have a baby?",
        a: "The delivery itself has a negotiated median around $3,100 for a vaginal birth and around $3,500 for a C-section. Your total hospital bill is usually higher, because the facility stay, anesthesia, and newborn care are billed separately.",
      },
      {
        q: "Is a C-section more expensive than a vaginal birth?",
        a: "Yes, on average. A cesarean is surgery, so its delivery price runs higher — a median around $3,500 versus about $3,100 for a vaginal delivery, before the rest of the hospital bill.",
      },
      {
        q: "Does insurance cover childbirth?",
        a: "Maternity care is a covered benefit on ACA-compliant plans, but you still owe your deductible and coinsurance, so your out-of-pocket cost depends on your specific plan.",
      },
      {
        q: "Why is my childbirth bill higher than the delivery price?",
        a: "The delivery code is only part of it. The hospital stay, anesthesia like an epidural, and the newborn's own care are billed separately, so the total runs higher than the delivery price alone.",
      },
    ],
    related: [
      { href: "/procedure/vaginal-delivery", label: "Vaginal delivery prices" },
      { href: "/procedure/cesarean-delivery", label: "C-section prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "ultrasound-cost",
    title: "How much does an ultrasound cost?",
    metaTitle: "How Much Does an Ultrasound Cost? (Real Hospital Prices)",
    metaDescription:
      "Real ultrasound prices from hospitals' own files — what an abdominal or pregnancy ultrasound costs with and without insurance, and how to find the price near you.",
    sub: "What an abdominal or pregnancy ultrasound costs with and without insurance, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does an ultrasound cost?</h2>
        <p>
          It depends on the type of ultrasound and where you have it. For a{" "}
          <strong>complete abdominal ultrasound</strong>, the cash self-pay price has a median around{" "}
          <strong>$675</strong>, ranging from about <strong>$235</strong> to <strong>$1,900</strong> across hospitals.
          A <strong>pregnancy ultrasound</strong> is a bit less — a cash median around <strong>$550</strong>. If
          you&apos;re insured, the negotiated rates are much lower on average (around <strong>$245</strong> for an
          abdominal scan, <strong>$235</strong> for a pregnancy scan).{" "}
          <a href="/procedure/abdominal-ultrasound">See current ultrasound prices →</a>
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same scan carries many
          different prices, and two hospitals a few miles apart can differ by several times. A higher price
          doesn&apos;t mean a better image.
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Know the exact scan.</strong> An abdominal, pelvic, pregnancy, or thyroid ultrasound are different procedures with different prices. Search the specific one in <a href="/procedures">the procedures list</a>.</li>
          <li><strong>Consider a freestanding imaging center.</strong> They&apos;re often cheaper than a hospital for a routine ultrasound.</li>
          <li><strong>If it&apos;s prenatal,</strong> routine pregnancy ultrasounds are usually covered under maternity benefits, though you may still owe your deductible or coinsurance — check with your plan.</li>
          <li><strong>Confirm before you book.</strong> Ask the billing office for the price in writing for that procedure code.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does an ultrasound cost without insurance?",
        a: "The cash self-pay price has a median around $675 for a complete abdominal ultrasound and around $550 for a pregnancy ultrasound, varying widely by hospital. Freestanding imaging centers are often cheaper.",
      },
      {
        q: "Is a pregnancy ultrasound covered by insurance?",
        a: "Routine prenatal ultrasounds are usually covered under maternity benefits on ACA plans, but you may still owe your deductible or coinsurance. Check your specific plan.",
      },
      {
        q: "Why does an ultrasound cost more at one hospital than another?",
        a: "Hospitals set prices independently and negotiate separately with each insurer, so the same scan can cost several times more at one hospital than another. A higher price doesn't mean a better image.",
      },
    ],
    related: [
      { href: "/procedure/abdominal-ultrasound", label: "Abdominal ultrasound prices" },
      { href: "/procedure/pregnancy-ultrasound", label: "Pregnancy ultrasound prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "echocardiogram-cost",
    title: "How much does an echocardiogram cost?",
    metaTitle: "How Much Does an Echocardiogram Cost? (Real Hospital Prices)",
    metaDescription:
      "Real echocardiogram (heart ultrasound) prices from hospitals' own files — what an echo costs with and without insurance, and how to find the price near you.",
    sub: "What an echocardiogram (heart ultrasound) costs with and without insurance, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does an echocardiogram cost?</h2>
        <p>
          An echocardiogram (or &quot;echo&quot;) is an ultrasound of the heart. Across hospitals with published data,
          a complete echo has a cash self-pay price with a median around <strong>$1,660</strong>, ranging from about{" "}
          <strong>$600</strong> to over <strong>$4,000</strong>. If you&apos;re insured, the negotiated rate is lower on
          average — a median around <strong>$895</strong>.{" "}
          <a href="/procedure/echocardiogram">See current echocardiogram prices →</a>
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so the same test carries many
          different prices — and hospitals a few miles apart can differ by several times. A higher price doesn&apos;t
          mean a better test.
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Compare hospitals and cardiology clinics near you</strong> — an outpatient clinic is often cheaper than a hospital.</li>
          <li><strong>Ask whether it&apos;s billed with the facility fee</strong> separately, which can raise the total.</li>
          <li><strong>Confirm before you book.</strong> Ask the billing office for the price in writing for that procedure code.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does an echocardiogram cost without insurance?",
        a: "The cash self-pay price has a median around $1,660, ranging from roughly $600 to over $4,000 depending on the hospital. An outpatient cardiology clinic is often cheaper than a hospital.",
      },
      {
        q: "Is an echocardiogram the same as an EKG?",
        a: "No. An echocardiogram is an ultrasound that images the heart's structure and motion; an EKG (electrocardiogram) records the heart's electrical activity and is much cheaper. They're often ordered together.",
      },
      {
        q: "Why does an echocardiogram cost more at one hospital than another?",
        a: "Hospitals set prices independently and negotiate separately with each insurer, so the same test can cost several times more at one hospital than another.",
      },
    ],
    related: [
      { href: "/procedure/echocardiogram", label: "Echocardiogram prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "chest-x-ray-cost",
    title: "How much does a chest X-ray cost?",
    metaTitle: "How Much Does a Chest X-ray Cost? (Real Hospital Prices)",
    metaDescription:
      "Real chest X-ray prices from hospitals' own files — what an X-ray costs with and without insurance, and how to find the price near you.",
    sub: "What a chest X-ray costs with and without insurance, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a chest X-ray cost?</h2>
        <p>
          A chest X-ray is one of the cheaper imaging tests, but the price still varies a lot by hospital. For a
          standard two-view chest X-ray, the cash self-pay price has a median around <strong>$250</strong>, ranging
          from under <strong>$100</strong> to nearly <strong>$700</strong>. If you&apos;re insured, the negotiated rate
          is lower on average — a median around <strong>$130</strong>.{" "}
          <a href="/procedure/chest-x-ray">See current chest X-ray prices →</a>
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals set their own charges and negotiate separately with each insurer, so even a simple X-ray carries
          many different prices, and hospitals a few miles apart can differ by several times. A higher price
          doesn&apos;t mean a better image.
        </p>

        <h2>How to find — and lower — your price</h2>
        <ul>
          <li><strong>Consider an urgent-care or freestanding imaging center</strong> — often cheaper than a hospital ER or outpatient department for a simple X-ray.</li>
          <li><strong>Watch for a separate radiologist fee</strong> on top of the facility charge.</li>
          <li><strong>Confirm before you go.</strong> Ask for the price in writing for that procedure code.</li>
        </ul>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does a chest X-ray cost without insurance?",
        a: "The cash self-pay price has a median around $250, ranging from under $100 to nearly $700 depending on the hospital. Urgent-care and freestanding imaging centers are often cheaper.",
      },
      {
        q: "Why is a chest X-ray so much more expensive at the ER?",
        a: "An X-ray done in an emergency room carries the ER facility fee on top of the imaging charge, so the total is far higher than the same X-ray at an outpatient or urgent-care center.",
      },
      {
        q: "Is there a separate fee to read the X-ray?",
        a: "Often, yes. A radiologist's professional fee to interpret the image can be billed separately from the facility charge, so ask whether the quoted price includes the read.",
      },
    ],
    related: [
      { href: "/procedure/chest-x-ray", label: "Chest X-ray prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },

  {
    slug: "sleep-study-cost",
    title: "How much does a sleep study cost?",
    metaTitle: "How Much Does a Sleep Study Cost? (Real Hospital Prices)",
    metaDescription:
      "Real sleep study prices from hospitals' own files — why an in-lab study costs ~5× a home test, what each costs, and how to find the price near you.",
    sub: "Why an in-lab study costs several times more than a home test, what each costs, and how to find the price near you.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a sleep study cost?</h2>
        <p>
          The biggest factor is whether it&apos;s done in a sleep lab or at home — the difference is large.
        </p>
        <ul>
          <li><strong>In-lab sleep study (polysomnography)</strong> — you spend the night at a sleep center. The cash self-pay price has a median around <strong>$2,900</strong>, ranging from about <strong>$1,000</strong> to over <strong>$6,000</strong>. Insured negotiated rate: a median around <strong>$1,540</strong>.</li>
          <li><strong>Home sleep study</strong> — a take-home device for one night. Far cheaper: a cash median around <strong>$510</strong>, with an insured negotiated median around <strong>$295</strong>.</li>
        </ul>
        <p>
          <a href="/procedure/sleep-study">See current sleep-study prices →</a>
        </p>

        <h2>Ask whether a home test is an option</h2>
        <p>
          For many people with suspected obstructive sleep apnea, a home sleep test is a recommended, much cheaper
          first step. It isn&apos;t right for everyone, but it&apos;s worth asking your doctor before booking an in-lab
          study that can cost several times more.
        </p>

        <h2>Why the price varies so much</h2>
        <p>
          Hospitals and sleep centers set their own charges and negotiate separately with each insurer, so the same
          study carries many different prices, and facilities a few miles apart can differ by several times.
        </p>

        <h2>Where these numbers come from</h2>
        <p>
          Straight from each hospital&apos;s federally-mandated price file (required since 2021 under 45 §180) —
          published figures for comparison, not a quote. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does a sleep study cost without insurance?",
        a: "An in-lab sleep study (polysomnography) has a cash median around $2,900, ranging from about $1,000 to over $6,000. A home sleep test is far cheaper, with a cash median around $510.",
      },
      {
        q: "Is a home sleep study cheaper than an in-lab study?",
        a: "Yes, substantially — often several times cheaper. For suspected sleep apnea a home test is frequently a recommended first step, so it's worth asking your doctor whether it's an option for you.",
      },
      {
        q: "Why does an in-lab sleep study cost so much?",
        a: "It involves an overnight stay at a sleep center with monitoring equipment and staff, which is far more resource-intensive than a take-home device. Hospitals also negotiate their own rates, so prices vary widely.",
      },
    ],
    related: [
      { href: "/procedure/sleep-study", label: "In-lab sleep study prices" },
      { href: "/procedure/home-sleep-study", label: "Home sleep study prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "blood-test-cost",
    title: "How much does a blood test cost without insurance?",
    metaTitle: "How Much Does a Blood Test Cost Without Insurance? (Real Prices)",
    metaDescription:
      "Real cash and negotiated prices for common blood tests from hospitals' own files — what a CBC, metabolic panel, or thyroid test actually costs, and the cheapest way to get one.",
    sub: "What a CBC, metabolic panel, thyroid test, or cholesterol panel actually costs out of pocket — and the cheapest way to get one.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a blood test cost without insurance?</h2>
        <p>
          For routine blood work paid out of pocket, the hospital <strong>cash (self-pay) price</strong>{" "}is what
          matters. As of mid-2026, common tests at hospitals run roughly:
        </p>
        <ul>
          <li><strong>Complete blood count (CBC)</strong>{" "}— cash price around <strong>$62</strong>{" "}(most fall between $16 and $156). <a href="/procedure/complete-blood-count">See CBC prices →</a></li>
          <li><strong>Basic metabolic panel</strong>{" "}— around <strong>$93</strong>{" "}($21–$390). <a href="/procedure/basic-metabolic-panel">See prices →</a></li>
          <li><strong>Comprehensive metabolic panel</strong>{" "}— around <strong>$122</strong>{" "}($26–$540). <a href="/procedure/comprehensive-metabolic-panel">See prices →</a></li>
          <li><strong>Lipid (cholesterol) panel</strong>{" "}— around <strong>$87</strong>{" "}($23–$320). <a href="/procedure/lipid-panel">See prices →</a></li>
          <li><strong>Hemoglobin A1c (diabetes)</strong>{" "}— around <strong>$62</strong>{" "}($18–$190). <a href="/procedure/hemoglobin-a1c">See prices →</a></li>
          <li><strong>TSH (thyroid)</strong>{" "}— around <strong>$89</strong>{" "}($28–$294). <a href="/procedure/tsh-thyroid-test">See prices →</a></li>
          <li><strong>Vitamin D</strong>{" "}— around <strong>$121</strong>{" "}($33–$314). <a href="/procedure/vitamin-d-test">See prices →</a></li>
          <li><strong>PSA (prostate)</strong>{" "}— around <strong>$92</strong>{" "}($25–$246). <a href="/procedure/psa-test">See prices →</a></li>
          <li><strong>Urinalysis</strong>{" "}— around <strong>$43</strong>{" "}($9–$195). <a href="/procedure/urinalysis">See prices →</a></li>
        </ul>
        <p>
          Those are figures for a single test. A typical doctor&apos;s visit often orders several at once, so an
          out-of-pocket lab bill of <strong>$150–$400</strong>{" "}is common — and that&apos;s before the separate fee
          some hospitals charge just for drawing your blood.
        </p>

        <h2>Why the hospital cash price is so much higher than the insured rate</h2>
        <p>
          Here&apos;s the surprising part. For blood tests, the cash price is usually <strong>several times higher</strong>{" "}
          than the rate an insurer actually pays. A CBC has a median negotiated (insured) rate around <strong>$14</strong>, but a
          median cash price around <strong>$62</strong>. A comprehensive metabolic panel is about <strong>$21</strong>{" "}
          negotiated versus <strong>$122</strong>{" "}cash.
        </p>
        <p>
          This is the opposite of big imaging like MRIs, where the cash price is sometimes the better deal. For labs,
          the insured rate is almost always far lower — so if you have insurance, use it. If you don&apos;t, the hospital
          is rarely the cheapest place to go.
        </p>

        <h2>The cheapest way to get a blood test</h2>
        <ul>
          <li><strong>Use an independent lab.</strong>{" "}Quest and Labcorp patient-pay prices, retail clinics, and pharmacy lab counters are often a fraction of a hospital&apos;s cash price for the exact same test.</li>
          <li><strong>Try a direct-to-consumer lab.</strong>{" "}Many tests can be ordered online without a doctor&apos;s visit and run $10–$50 — useful for routine monitoring like cholesterol or A1c.</li>
          <li><strong>Ask for the cash price up front, in writing.</strong>{" "}If a hospital quotes far more than the published figure, point to its own price file.</li>
          <li><strong>Have the draw done at the doctor&apos;s office.</strong>{" "}A hospital outpatient lab can carry a facility fee that an independent clinic doesn&apos;t.</li>
        </ul>

        <h2>The three prices you&apos;ll see</h2>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly without insurance. Your number if you&apos;re uninsured.</li>
          <li><strong>Negotiated price</strong>{" "}— the rate your insurance plan pays. For labs this is usually the lowest of the three.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the list price before any discount (a CBC&apos;s is around $111). Almost nobody pays it.</li>
        </ul>
        <p>
          More on how these differ: <a href="/guides/cash-vs-negotiated-price">cash vs. negotiated vs. chargemaster →</a>
        </p>

        <h2>How to find your price</h2>
        <ul>
          <li><strong>Look up the exact test.</strong>{" "}&quot;Blood test&quot; isn&apos;t one price — search the specific panel in <a href="/procedures">the procedures list</a>.</li>
          <li><strong>Compare a few hospitals and an independent lab</strong>{" "}before you book, if it isn&apos;t urgent.</li>
          <li><strong>Confirm the current number,</strong>{" "}since published files are dated and can lag.</li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          These figures come straight from each hospital&apos;s federally-mandated price file (required since 2021 under
          45 CFR §180) — not estimates. They&apos;re for comparison; your actual bill depends on exactly which tests are
          ordered and where they&apos;re run. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is a blood test cheaper without insurance?",
        a: "Usually not at a hospital. For most blood tests the cash (self-pay) price is several times higher than the insured negotiated rate — a CBC is roughly $62 cash versus about $14 negotiated. If you have insurance, use it. If you don't, an independent or direct-to-consumer lab is often far cheaper than a hospital.",
      },
      {
        q: "How much does a CBC (complete blood count) cost?",
        a: "At hospitals the cash price has a median around $62, with most falling between $16 and $156. The insured negotiated rate is much lower — a median near $14. Independent labs often charge less than the hospital cash price.",
      },
      {
        q: "Why is the same blood test so much more at one lab than another?",
        a: "Each hospital and lab sets its own prices and negotiates separately with insurers, so there's no national price. The cash price for one routine test can range from under $20 to well over $150 depending on where you go.",
      },
      {
        q: "Can I get a blood test without a doctor's order?",
        a: "Often, yes. Direct-to-consumer lab services let you order many common tests online without a visit, then get your blood drawn at a partner location. For routine monitoring this can be the cheapest option.",
      },
    ],
    related: [
      { href: "/procedure/complete-blood-count", label: "CBC prices" },
      { href: "/procedure/comprehensive-metabolic-panel", label: "Metabolic panel prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "financial-assistance",
    title: "Hospital financial assistance: how to lower or erase your bill",
    metaTitle: "Hospital Financial Assistance: How to Lower or Erase Your Bill",
    metaDescription:
      "Nonprofit hospitals are required to offer financial assistance. Who qualifies, how to apply, the 240-day deadline, and how to use published prices to pay less.",
    sub: "Nonprofit hospitals are legally required to help — here's who qualifies, how to apply, and the deadline most people miss.",
    updated: "June 2026",
    body: (
      <>
        <h2>What hospital financial assistance is</h2>
        <p>
          Most U.S. hospitals are nonprofits, and to keep their tax-exempt status federal law (Section 501(r) of the
          tax code) requires them to have a written <strong>Financial Assistance Policy</strong>{" "}— often called
          charity care. It can reduce a bill, cap it, or wipe it out entirely depending on your income. It is not a
          favor; it&apos;s a condition of how the hospital is funded.
        </p>
        <p>
          The catch is that hospitals rarely advertise it, and many people pay bills they could have had reduced or
          erased. If you&apos;re facing a hospital bill you can&apos;t comfortably afford, this should be your first move.
        </p>

        <h2>Who qualifies</h2>
        <p>
          Each hospital sets its own income thresholds, but as a rough guide many offer:
        </p>
        <ul>
          <li><strong>Free care</strong>{" "}for households up to around 200% of the federal poverty level.</li>
          <li><strong>Discounted care</strong>{" "}on a sliding scale above that — often up to 400% of the poverty level, and sometimes higher.</li>
        </ul>
        <p>
          Even if your income is above the cutoff, ask anyway. Many policies grant case-by-case relief when a bill is
          large relative to income, and the law forbids charging financial-assistance-eligible patients more than the
          amount it <em>generally bills</em>{" "}insured patients (the &quot;AGB&quot; rule) — so you should never be charged the
          inflated chargemaster price.
        </p>

        <h2>How to apply</h2>
        <ul>
          <li><strong>Ask for the Financial Assistance Policy and application</strong>{" "}from the billing office. By law they must give you a plain-language summary.</li>
          <li><strong>Gather proof of income</strong>{" "}— recent pay stubs, a tax return, or a benefits letter. That&apos;s usually all that&apos;s needed.</li>
          <li><strong>Submit before the deadline.</strong>{" "}You generally have at least <strong>240 days</strong>{" "}from the first post-discharge bill to apply — even if the bill has already gone to collections.</li>
          <li><strong>Keep copies</strong>{" "}of everything and get any approval in writing.</li>
        </ul>

        <h2>Before you apply: check the price first</h2>
        <p>
          Financial assistance works best alongside knowing the real price. Look up what the hospital actually charges
          for your care, ask for the <strong>cash (self-pay) price</strong>, and request an <strong>itemized bill</strong>{" "}
          so you can catch charges for things that didn&apos;t happen. A bill that&apos;s wrong is easier to fight than one
          you simply can&apos;t afford. <a href="/guides/hospital-bill">How to read and fight a hospital bill →</a>
        </p>

        <h2>If you&apos;re uninsured</h2>
        <p>
          Uninsured patients are often quoted the gross chargemaster price first — the highest number, which almost
          nobody actually pays. Don&apos;t accept it. Ask for the self-pay discount, apply for financial assistance, and
          compare against the hospital&apos;s published prices. <a href="/guides/cash-vs-negotiated-price">Cash vs. negotiated price →</a>
        </p>

        <h2>Other ways to bring a bill down</h2>
        <ul>
          <li><strong>Interest-free payment plans</strong>{" "}— most hospitals offer them; ask before putting a bill on a credit card.</li>
          <li><strong>Negotiate the balance</strong>{" "}— offer a lump sum for a discount, or ask them to match the lower cash or Medicare rate.</li>
          <li><strong>Dispute errors</strong>{" "}— duplicate charges and billing mistakes are common on itemized bills.</li>
          <li><strong>Medical bill advocates</strong>{" "}— for very large bills, a patient advocate can negotiate on your behalf.</li>
        </ul>
      </>
    ),
    faq: [
      {
        q: "Do I have to be low-income to get hospital financial assistance?",
        a: "Lower income gets the biggest discounts (often free care up to about 200% of the poverty level), but many hospitals offer sliding-scale help well above that, and case-by-case relief when a bill is large relative to your income. Always ask, even if you think you earn too much.",
      },
      {
        q: "Can I apply after I've already received the bill?",
        a: "Yes. You generally have at least 240 days from the first post-discharge bill to apply for financial assistance — often even after the bill has gone to collections. It's worth applying late rather than not at all.",
      },
      {
        q: "What if my hospital is for-profit?",
        a: "For-profit hospitals aren't required to have a financial assistance policy, but many still offer self-pay discounts, payment plans, and case-by-case help. Ask the billing office what's available, and negotiate the balance.",
      },
      {
        q: "Will applying for financial assistance hurt my credit?",
        a: "No. Applying is a request to the hospital, not a credit application. In fact, getting a bill reduced or onto a payment plan can keep it out of collections, which protects your credit.",
      },
    ],
    related: [
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/guides/no-surprises-act", label: "The No Surprises Act explained" },
      { href: "/procedures", label: "Browse procedure prices" },
    ],
  },
  {
    slug: "no-surprises-act",
    title: "The No Surprises Act: your protection against surprise medical bills",
    metaTitle: "The No Surprises Act: Your Protection Against Surprise Bills",
    metaDescription:
      "What the No Surprises Act covers, what it doesn't (ground ambulances), your right to a Good Faith Estimate, and what to do if you get a surprise medical bill anyway.",
    sub: "Since 2022 you're protected from most surprise out-of-network bills — what's covered, the one big gap, and what to do if you get one anyway.",
    updated: "June 2026",
    body: (
      <>
        <h2>What the No Surprises Act does</h2>
        <p>
          Since January 1, 2022, the federal <strong>No Surprises Act</strong>{" "}has banned the most common surprise
          medical bills. Before it, you could go to an in-network hospital and still get hit with huge out-of-network
          charges from a doctor you never chose — an anesthesiologist or radiologist who happened to be out of network.
          That practice, called <strong>balance billing</strong>, is now illegal in most situations.
        </p>

        <h2>What&apos;s protected</h2>
        <ul>
          <li><strong>Emergency care</strong>{" "}— you can&apos;t be balance-billed for emergency services, even at an out-of-network hospital. You pay only your normal in-network cost-sharing.</li>
          <li><strong>Out-of-network providers at an in-network facility</strong>{" "}— the anesthesiologist, radiologist, pathologist, or assistant surgeon you didn&apos;t pick can&apos;t bill you their out-of-network rate.</li>
          <li><strong>Air ambulance</strong>{" "}— covered by the ban on balance billing.</li>
        </ul>

        <h2>The big gap: ground ambulances</h2>
        <p>
          The most important exception to know: <strong>ground ambulance rides are not covered</strong>{" "}by the No
          Surprises Act. They remain one of the most common sources of surprise bills, so an ambulance trip can still
          leave you with a large out-of-network charge. (You can also waive your protections by signing a consent form
          to see an out-of-network provider for non-emergency care — read anything you&apos;re asked to sign.)
        </p>

        <h2>Your right to a Good Faith Estimate</h2>
        <p>
          If you&apos;re <strong>uninsured or paying cash</strong>, the Act gives you another tool: for scheduled care you
          can request a <strong>Good Faith Estimate</strong>{" "}of the cost in advance, and the provider must give you one
          in writing. If your final bill is at least <strong>$400 more</strong>{" "}than the estimate, you can dispute it
          through the federal patient-provider dispute resolution process.
        </p>
        <p>
          This pairs well with the hospital&apos;s published prices — you can check the estimate against what the hospital
          charges others before you agree. <a href="/guides/price-transparency-law">How hospital price transparency works →</a>
        </p>

        <h2>What to do if you get a surprise bill anyway</h2>
        <ul>
          <li><strong>Don&apos;t pay it right away.</strong>{" "}Surprise bills that violate the Act are not valid — paying can make them harder to undo.</li>
          <li><strong>Compare it to your insurer&apos;s explanation of benefits</strong>{" "}to see what should have been covered.</li>
          <li><strong>Call the federal No Surprises Help Desk</strong>{" "}at <strong>1-800-985-3059</strong>{" "}to report a violation, or file a complaint at cms.gov.</li>
          <li><strong>Ask the provider to reprocess the claim</strong>{" "}as in-network cost-sharing, as the law requires.</li>
        </ul>

        <h2>Does it apply to me?</h2>
        <p>
          The No Surprises Act mainly protects people with private or employer health plans, and the uninsured or
          self-pay. If you have Medicare or Medicaid, you already had strong protections against balance billing, so the
          Act&apos;s rules are mostly aimed at other coverage. Either way, you should never quietly pay a surprise
          out-of-network bill without checking. <a href="/guides/hospital-bill">How to fight a hospital bill →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Does the No Surprises Act cover ambulance rides?",
        a: "Air ambulances are covered, but ground ambulances are not — they're the single biggest gap in the law and remain a common source of surprise bills. A ground ambulance trip can still leave you with a large out-of-network charge.",
      },
      {
        q: "What is a Good Faith Estimate?",
        a: "If you're uninsured or paying cash, you can ask for a written estimate of the cost of scheduled care before it happens. If the final bill comes in at least $400 above the estimate, you can dispute it through the federal patient-provider dispute resolution process.",
      },
      {
        q: "What do I do if I get a surprise out-of-network bill anyway?",
        a: "Don't pay it immediately. Compare it to your insurer's explanation of benefits, ask the provider to reprocess it as in-network cost-sharing, and report the violation to the federal No Surprises Help Desk at 1-800-985-3059.",
      },
      {
        q: "Does the No Surprises Act apply if I have Medicare or Medicaid?",
        a: "Medicare and Medicaid already protect enrollees from balance billing, so the Act's new rules are aimed mainly at private and employer plans and at uninsured or self-pay patients. The protections overlap, so either way you shouldn't pay a surprise bill without checking.",
      },
    ],
    related: [
      { href: "/guides/price-transparency-law", label: "Hospital price transparency, explained" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/guides/er-visit-cost", label: "How much does an ER visit cost?" },
      { href: "/procedures", label: "Browse procedure prices" },
    ],
  },
  {
    slug: "knee-replacement-cost",
    title: "How much does a knee or hip replacement cost?",
    metaTitle: "How Much Does a Knee or Hip Replacement Cost? (Real Prices)",
    metaDescription:
      "Real hospital prices for knee and hip replacement from published files — what the surgery actually costs, why the cash price can beat insurance, and how to shop for it.",
    sub: "What a joint replacement actually costs, why the cash price can undercut your insurance, and how to shop a big elective surgery.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does a knee or hip replacement cost?</h2>
        <p>
          Joint replacement is one of the most expensive common elective surgeries — and one of the most worth
          shopping, because you usually have time to plan. As of mid-2026, the negotiated (insured) facility price has a
          median around <strong>$13,000</strong>{" "}for both knee and hip replacement, but the range is enormous: the
          cheapest tenth of hospitals are under <strong>$2,000</strong>{" "}and the priciest tenth are over{" "}
          <strong>$21,000</strong>. <a href="/procedure/knee-replacement">Knee prices →</a>{" · "}
          <a href="/procedure/hip-replacement">Hip prices →</a>
        </p>

        <h2>Why the cash price can beat your insurance</h2>
        <p>
          Here&apos;s the counterintuitive part. For joint replacement the <strong>cash (self-pay) price is often lower
          than the negotiated rate</strong>: the median cash price is around <strong>$9,500</strong>{" "}for a knee and{" "}
          <strong>$9,000</strong>{" "}for a hip — several thousand dollars below the insured median. Many hospitals and
          surgery centers offer a bundled &quot;package&quot; price for self-pay joint replacement that undercuts what
          insurers pay. If you have a high-deductible plan, it can be worth asking for the cash package and comparing.
        </p>

        <h2>What the price includes — and what it doesn&apos;t</h2>
        <p>
          The figure on a hospital&apos;s file is usually the <strong>facility fee</strong>. The surgeon, the
          anesthesiologist, the implant itself, and post-op physical therapy are often billed separately, so the all-in
          cost runs higher than the facility number alone. Always ask for a <strong>bundled or all-inclusive quote</strong>{" "}
          that names what&apos;s covered.
        </p>

        <h2>Inpatient vs. outpatient surgery center</h2>
        <p>
          Joint replacements are increasingly done as outpatient procedures, often at an{" "}
          <strong>ambulatory surgery center (ASC)</strong>{" "}rather than a hospital — and ASCs are frequently cheaper for
          the same operation. If you&apos;re medically suitable, ask your surgeon whether an outpatient or ASC setting is an
          option.
        </p>

        <h2>The three prices you&apos;ll see</h2>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly; for joint replacement, often a bundled package that can beat insurance.</li>
          <li><strong>Negotiated price</strong>{" "}— your plan&apos;s rate; what you pay toward it depends on your deductible and coinsurance.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the list price, far higher than anyone pays. Ignore it.</li>
        </ul>
        <p><a href="/guides/cash-vs-negotiated-price">More on cash vs. negotiated →</a></p>

        <h2>How to shop for a joint replacement</h2>
        <ul>
          <li><strong>Get bundled quotes from two or three facilities</strong>{" "}before you schedule — this is elective, so use the time.</li>
          <li><strong>Ask for the self-pay package price</strong>{" "}even if you&apos;re insured, and compare it to your expected out-of-pocket share.</li>
          <li><strong>Ask about an ASC.</strong>{" "}Outpatient settings are often materially cheaper.</li>
          <li><strong>Check your out-of-pocket maximum.</strong>{" "}With insurance, once you hit it the rest of the year is covered. <a href="/guides/deductible-coinsurance-copay">How deductibles work →</a></li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          These figures come from hospitals&apos; federally-mandated price files (45 CFR §180), not estimates. They&apos;re for
          comparison; your actual cost depends on the facility, your surgeon, your implant, and your plan, so confirm
          before scheduling. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Is a knee replacement cheaper if I pay cash instead of using insurance?",
        a: "Often, yes. The median self-pay price for a knee replacement is around $9,500, versus about $13,000 for the negotiated insurance rate. Many hospitals offer a bundled cash package that beats the insured rate, so if you have a high-deductible plan it's worth comparing both.",
      },
      {
        q: "Does the hospital price include the surgeon and anesthesia?",
        a: "Usually not. The published figure is typically the facility fee. The surgeon, anesthesiologist, implant, and physical therapy are often billed separately, so ask for a bundled or all-inclusive quote.",
      },
      {
        q: "Why does a knee replacement cost so much more at one hospital than another?",
        a: "Each hospital sets its own price and negotiates separately with insurers. For knee replacement the facility price ranges from under $2,000 to over $21,000 — a higher price doesn't mean a better outcome, so comparing is worth thousands.",
      },
      {
        q: "Can a joint replacement be done at a surgery center instead of a hospital?",
        a: "Increasingly, yes. Many knee and hip replacements are now outpatient procedures done at ambulatory surgery centers, which are often cheaper than hospitals. Ask your surgeon whether that's an option for you.",
      },
    ],
    related: [
      { href: "/procedure/knee-replacement", label: "Knee replacement prices" },
      { href: "/procedure/hip-replacement", label: "Hip replacement prices" },
      { href: "/guides/why-prices-vary", label: "Why hospital prices vary so much" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "cataract-surgery-cost",
    title: "How much does cataract surgery cost?",
    metaTitle: "How Much Does Cataract Surgery Cost? (Real Hospital Prices)",
    metaDescription:
      "Real prices for cataract surgery from hospitals' own files — what it costs per eye, what Medicare covers, premium lens upgrades, and how to pay less.",
    sub: "What cataract surgery costs per eye, what Medicare covers, and why a premium lens can change the bill.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does cataract surgery cost?</h2>
        <p>
          Cataract surgery is one of the most common operations in the country, and it&apos;s usually planned, so you can
          shop. As of mid-2026, the negotiated facility price has a median around <strong>$2,650</strong>{" "}per eye, with
          most hospitals between <strong>$1,400 and $5,750</strong>. The cash (self-pay) median is around{" "}
          <strong>$3,000</strong>. <a href="/procedure/cataract-surgery">See cataract surgery prices →</a>
        </p>
        <p>That&apos;s the facility fee per eye — and most people have each eye done separately, so budget accordingly.</p>

        <h2>What Medicare and insurance cover</h2>
        <p>
          Standard cataract surgery is covered by Medicare and most insurance, because it&apos;s medically necessary once a
          cataract affects your vision. With insurance you&apos;ll typically owe your deductible and coinsurance rather than
          the full price. <a href="/guides/deductible-coinsurance-copay">How deductibles and coinsurance work →</a>
        </p>

        <h2>The premium-lens upsell</h2>
        <p>
          The biggest swing in what you pay is the lens. A standard monofocal lens is covered. <strong>Premium lenses</strong>{" "}
          — toric (for astigmatism) or multifocal (to reduce glasses use) — are generally <em>not</em>{" "}covered, and the
          upgrade can add <strong>$1,000–$4,000 per eye</strong>{" "}out of pocket. It can be worth it, but make sure it&apos;s a
          choice you make, not a default you&apos;re billed for.
        </p>

        <h2>Surgery center vs. hospital</h2>
        <p>
          Most cataract surgery is outpatient and often done at an <strong>ambulatory surgery center</strong>, which is
          usually cheaper than a hospital outpatient department for the same procedure. Ask where yours will be done.
        </p>

        <h2>How to pay less</h2>
        <ul>
          <li><strong>Compare a few facilities</strong>{" "}— the facility price varies several-fold for identical surgery.</li>
          <li><strong>Ask whether a standard lens meets your needs</strong>{" "}before paying for a premium upgrade.</li>
          <li><strong>Ask for the self-pay price</strong>{" "}if you&apos;re uninsured, and get it in writing.</li>
          <li><strong>Confirm what&apos;s bundled</strong>{" "}— surgeon and anesthesia may be billed separately from the facility fee.</li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          Figures come straight from hospitals&apos; published price files (45 CFR §180), not estimates. Your actual cost
          depends on the facility, your lens choice, and your plan. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "Does Medicare cover cataract surgery?",
        a: "Yes. Standard cataract surgery is covered by Medicare and most insurance once a cataract affects your vision. You'll generally owe your deductible and coinsurance rather than the full price, but premium lens upgrades are not covered.",
      },
      {
        q: "Why was I quoted thousands extra for a lens?",
        a: "Standard monofocal lenses are covered, but premium lenses — toric for astigmatism or multifocal to reduce glasses use — usually aren't, and can add $1,000 to $4,000 per eye out of pocket. Make sure the upgrade is a choice you're making, not a default.",
      },
      {
        q: "How much is cataract surgery without insurance?",
        a: "The self-pay price has a median around $3,000 per eye, with most hospitals between roughly $850 and $8,600. Ambulatory surgery centers are often cheaper than hospitals, so it pays to compare.",
      },
      {
        q: "Is cataract surgery cheaper at a surgery center?",
        a: "Usually. Most cataract surgery is outpatient and frequently done at an ambulatory surgery center, which tends to cost less than a hospital outpatient department for the same procedure.",
      },
    ],
    related: [
      { href: "/procedure/cataract-surgery", label: "Cataract surgery prices" },
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/guides/why-prices-vary", label: "Why hospital prices vary so much" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "gallbladder-surgery-cost",
    title: "How much does gallbladder removal surgery cost?",
    metaTitle: "How Much Does Gallbladder Removal Cost? (Real Hospital Prices)",
    metaDescription:
      "Real prices for laparoscopic gallbladder removal (cholecystectomy) from hospitals' files — what it costs, emergency vs. planned, and how to shop when you can.",
    sub: "What laparoscopic gallbladder removal actually costs, why an emergency changes everything, and how to shop a planned surgery.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does gallbladder removal cost?</h2>
        <p>
          Gallbladder removal — a <strong>laparoscopic cholecystectomy</strong>{" "}— is one of the most common general
          surgeries. As of mid-2026, the negotiated facility price has a median around <strong>$6,100</strong>, with most
          hospitals between <strong>$900 and $12,200</strong>. The cash (self-pay) median is a bit lower, around{" "}
          <strong>$5,650</strong>. <a href="/procedure/laparoscopic-gallbladder-removal">See gallbladder surgery prices →</a>
        </p>

        <h2>Emergency vs. planned — it changes everything</h2>
        <p>
          The biggest factor in what you pay is whether it&apos;s planned. A sudden gallbladder attack (acute
          cholecystitis) often means emergency surgery and an inpatient stay — you can&apos;t shop, and the bill is much
          higher. If your surgery is <strong>elective</strong>{" "}(scheduled for recurring gallstones), you have time to
          compare facilities and ask for a bundled price.
        </p>

        <h2>What the price includes</h2>
        <p>
          The published figure is usually the <strong>facility fee</strong>. The surgeon and anesthesiologist are
          commonly billed separately, so ask for an all-in quote. Laparoscopic removal is typically outpatient — you go
          home the same day — but if it&apos;s converted to open surgery or you&apos;re admitted, the cost rises.
        </p>

        <h2>Surgery center vs. hospital</h2>
        <p>
          A planned laparoscopic cholecystectomy can sometimes be done at an <strong>ambulatory surgery center</strong>,
          which is often cheaper than a hospital. Ask your surgeon whether that&apos;s appropriate for you.
        </p>

        <h2>The three prices you&apos;ll see</h2>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly; for this surgery it can be slightly below the insured rate.</li>
          <li><strong>Negotiated price</strong>{" "}— your plan&apos;s rate; your share depends on your deductible and coinsurance.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the list price, far above what anyone pays.</li>
        </ul>

        <h2>How to pay less (when you can)</h2>
        <ul>
          <li><strong>If it&apos;s elective, compare facilities</strong>{" "}and ask each for a bundled price.</li>
          <li><strong>Ask about an outpatient or ASC setting.</strong></li>
          <li><strong>Confirm what&apos;s included</strong>{" "}and get the self-pay price in writing if uninsured.</li>
          <li><strong>Apply for financial assistance</strong>{" "}if an emergency leaves you with a large bill. <a href="/guides/financial-assistance">How financial assistance works →</a></li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          Figures come from hospitals&apos; published price files (45 CFR §180), not estimates. Your cost depends on the
          facility, whether it&apos;s an emergency, and your plan. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does laparoscopic gallbladder removal cost?",
        a: "The negotiated facility price has a median around $6,100, with most hospitals between roughly $900 and $12,200. The self-pay median is a bit lower, near $5,650. The surgeon and anesthesia are often billed separately.",
      },
      {
        q: "Why is emergency gallbladder surgery so much more expensive?",
        a: "An emergency (acute gallbladder attack) usually means inpatient admission and surgery you can't shop for, which costs far more than a planned outpatient procedure. If your surgery is elective, you have time to compare facilities and ask for a bundled price.",
      },
      {
        q: "Is gallbladder surgery done as an outpatient procedure?",
        a: "Laparoscopic removal is typically outpatient — most people go home the same day. If it's converted to open surgery or you're admitted, the cost goes up. A planned procedure can sometimes be done at a cheaper ambulatory surgery center.",
      },
      {
        q: "Does insurance cover gallbladder removal?",
        a: "Yes, when it's medically necessary. With insurance you'll owe your deductible and coinsurance rather than the full price. If you're uninsured, ask for the self-pay price and apply for financial assistance on any large bill.",
      },
    ],
    related: [
      { href: "/procedure/laparoscopic-gallbladder-removal", label: "Gallbladder surgery prices" },
      { href: "/guides/financial-assistance", label: "Hospital financial assistance" },
      { href: "/guides/why-prices-vary", label: "Why hospital prices vary so much" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "hernia-surgery-cost",
    title: "How much does hernia repair surgery cost?",
    metaTitle: "How Much Does Hernia Repair Surgery Cost? (Real Prices)",
    metaDescription:
      "Real prices for inguinal and umbilical hernia repair from hospitals' files — what the surgery costs, open vs. laparoscopic, and how to shop a planned repair.",
    sub: "What inguinal and umbilical hernia repair actually costs, and how to shop a planned, elective surgery.",
    updated: "June 2026",
    body: (
      <>
        <h2>How much does hernia repair cost?</h2>
        <p>
          Most hernia repairs are elective and outpatient, which means you usually have time to compare prices. As of
          mid-2026, an <strong>inguinal (groin) hernia repair</strong>{" "}has a negotiated facility price with a median
          around <strong>$3,800</strong>, with most hospitals between <strong>$770 and $7,900</strong>. The cash median
          is around <strong>$4,200</strong>. <a href="/procedure/inguinal-hernia-repair">See inguinal hernia prices →</a>
        </p>
        <p>
          An <strong>umbilical (belly-button) hernia repair</strong>{" "}is broadly similar, with a negotiated median around{" "}
          <strong>$4,100</strong>{" "}and an often-lower cash price. <a href="/procedure/umbilical-hernia-repair">See umbilical hernia prices →</a>
        </p>

        <h2>What drives the price</h2>
        <ul>
          <li><strong>Open vs. laparoscopic.</strong>{" "}Both are common; laparoscopic (keyhole) repair may cost more in facility fees but can mean a faster recovery.</li>
          <li><strong>Mesh.</strong>{" "}Most repairs use surgical mesh, which is usually included in the facility charge.</li>
          <li><strong>Setting.</strong>{" "}A planned repair at an ambulatory surgery center is often cheaper than a hospital.</li>
          <li><strong>Separate bills.</strong>{" "}The surgeon and anesthesiologist are frequently billed on top of the facility fee — ask for an all-in quote.</li>
        </ul>

        <h2>Planned vs. emergency</h2>
        <p>
          A hernia that becomes <em>strangulated</em>{" "}is an emergency and must be repaired urgently, which costs far more
          than a scheduled repair. For a stable, non-urgent hernia, your doctor may even suggest watchful waiting — and
          if surgery is planned, you have room to shop.
        </p>

        <h2>The three prices you&apos;ll see</h2>
        <ul>
          <li><strong>Cash / self-pay price</strong>{" "}— what you pay directly without insurance.</li>
          <li><strong>Negotiated price</strong>{" "}— your plan&apos;s rate; your share depends on your deductible and coinsurance.</li>
          <li><strong>Gross / chargemaster price</strong>{" "}— the list price, far above what anyone pays.</li>
        </ul>
        <p><a href="/guides/cash-vs-negotiated-price">More on cash vs. negotiated →</a></p>

        <h2>How to shop for a hernia repair</h2>
        <ul>
          <li><strong>Compare two or three facilities</strong>{" "}before scheduling an elective repair.</li>
          <li><strong>Ask about an ambulatory surgery center.</strong></li>
          <li><strong>Get a bundled quote</strong>{" "}covering facility, surgeon, and anesthesia.</li>
          <li><strong>Check your out-of-pocket maximum</strong>{" "}if insured. <a href="/guides/deductible-coinsurance-copay">How deductibles work →</a></li>
        </ul>

        <h2>A note on accuracy</h2>
        <p>
          Figures come from hospitals&apos; published price files (45 CFR §180), not estimates. Your cost depends on the
          facility, the technique, and your plan. <a href="/methodology">How we source this →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "How much does inguinal hernia surgery cost?",
        a: "The negotiated facility price has a median around $3,800, with most hospitals between roughly $770 and $7,900. The self-pay median is around $4,200. The surgeon and anesthesia are often billed separately, so ask for an all-in quote.",
      },
      {
        q: "Is hernia repair cheaper at a surgery center?",
        a: "Often. Most elective hernia repairs are outpatient, and an ambulatory surgery center is frequently cheaper than a hospital for the same operation. Ask your surgeon whether that's an option.",
      },
      {
        q: "Does the price include the surgeon and anesthesia?",
        a: "Usually not. The published figure is typically the facility fee; the surgeon and anesthesiologist are commonly billed separately. Ask for a bundled or all-inclusive quote before scheduling.",
      },
      {
        q: "What's the difference between open and laparoscopic hernia repair cost?",
        a: "Both are common. Laparoscopic (keyhole) repair can carry higher facility fees but may mean a faster recovery. The right choice depends on the hernia and your surgeon — compare both the price and the recovery.",
      },
    ],
    related: [
      { href: "/procedure/inguinal-hernia-repair", label: "Inguinal hernia repair prices" },
      { href: "/procedure/umbilical-hernia-repair", label: "Umbilical hernia repair prices" },
      { href: "/guides/why-prices-vary", label: "Why hospital prices vary so much" },
      { href: "/procedures", label: "Browse all procedures" },
    ],
  },
  {
    slug: "deductible-coinsurance-copay",
    title: "Deductible, copay, and coinsurance: what you actually pay",
    metaTitle: "Deductible vs. Copay vs. Coinsurance: What You Actually Pay",
    metaDescription:
      "A plain-English guide to deductibles, copays, coinsurance, and out-of-pocket maximums — how they stack up, with a worked example, and why the hospital price still matters.",
    sub: "A plain-English guide to the four terms that decide your share of a medical bill — with a worked example.",
    updated: "June 2026",
    body: (
      <>
        <h2>The four things that decide what you pay</h2>
        <p>
          Even with good insurance, you pay part of most medical bills. Four terms determine how much — and they trip up
          almost everyone. Here&apos;s what each one actually means.
        </p>

        <h2>Deductible</h2>
        <p>
          The amount you pay <strong>before your insurance starts paying</strong>. If your deductible is $2,000, you cover
          the first $2,000 of covered care yourself. Crucially, until you hit it you usually pay the{" "}
          <strong>full negotiated price</strong>{" "}of each service — which is exactly why knowing that price matters.
        </p>

        <h2>Copay</h2>
        <p>
          A <strong>flat fee</strong>{" "}for a specific service — say $30 for a doctor&apos;s visit or $15 for a prescription.
          Copays often apply even before you meet your deductible, depending on your plan.
        </p>

        <h2>Coinsurance</h2>
        <p>
          A <strong>percentage</strong>{" "}you pay <em>after</em>{" "}your deductible is met. With 20% coinsurance, on a $1,000
          service your plan pays $800 and you pay $200 — until you reach your out-of-pocket maximum.
        </p>

        <h2>Out-of-pocket maximum</h2>
        <p>
          The <strong>most you&apos;ll pay in a year</strong>{" "}for covered, in-network care. Once your deductible, copays, and
          coinsurance add up to this cap, your insurance pays <strong>100%</strong>{" "}of covered care for the rest of the
          year. This is the number that protects you from catastrophe.
        </p>

        <h2>How it stacks up: a worked example</h2>
        <p>
          Say you have a $2,000 deductible, 20% coinsurance, and a $7,000 out-of-pocket max, and you need a procedure
          with a negotiated price of $10,000:
        </p>
        <ul>
          <li>You pay the first <strong>$2,000</strong>{" "}(your deductible).</li>
          <li>Of the remaining $8,000, you pay <strong>20%</strong>{" "}= $1,600 (coinsurance); your plan pays $6,400.</li>
          <li>Your total: <strong>$3,600</strong>{" "}— and since that&apos;s under your $7,000 cap, you owe all of it.</li>
        </ul>
        <p>Two more such procedures that year and you&apos;d hit the $7,000 cap, after which you&apos;d owe nothing more.</p>

        <h2>Why the hospital price still matters when you&apos;re insured</h2>
        <p>
          Early in the year, before you&apos;ve met your deductible, <strong>you pay the full negotiated price</strong>{" "}of each
          service — so the price <em>is</em>{" "}your cost. And the negotiated price varies wildly between hospitals for the
          same care. Comparing before non-emergency treatment can lower what counts against your deductible.{" "}
          <a href="/guides/cash-vs-negotiated-price">Cash vs. negotiated price →</a>
        </p>

        <h2>In-network vs. out-of-network</h2>
        <p>
          These rules apply to <strong>in-network</strong>{" "}care. Out-of-network providers can charge more and may not count
          toward your in-network out-of-pocket max. For most surprise out-of-network bills you&apos;re now protected.{" "}
          <a href="/guides/no-surprises-act">The No Surprises Act →</a>
        </p>
      </>
    ),
    faq: [
      {
        q: "What's the difference between a copay and coinsurance?",
        a: "A copay is a flat fee for a service (like $30 for a visit). Coinsurance is a percentage you pay after meeting your deductible (like 20% of the cost). Copays often apply even before the deductible is met; coinsurance generally applies after.",
      },
      {
        q: "Do I pay the full price before I meet my deductible?",
        a: "For most services, yes — until you've met your deductible you pay the full negotiated price of each covered service. That's why comparing hospital prices matters even when you're insured: early in the year, the price is your cost.",
      },
      {
        q: "What happens after I hit my out-of-pocket maximum?",
        a: "Once your deductible, copays, and coinsurance for the year add up to your out-of-pocket maximum, your insurance pays 100% of covered, in-network care for the rest of the year. It's the cap that protects you from catastrophic costs.",
      },
      {
        q: "Does coinsurance apply before or after the deductible?",
        a: "After. You first pay your deductible in full, then coinsurance (your percentage share) applies to additional covered care until you reach your out-of-pocket maximum.",
      },
    ],
    related: [
      { href: "/guides/cash-vs-negotiated-price", label: "Cash vs. negotiated vs. chargemaster" },
      { href: "/guides/no-surprises-act", label: "The No Surprises Act explained" },
      { href: "/guides/hospital-bill", label: "How to read and fight a hospital bill" },
      { href: "/procedures", label: "Browse procedure prices" },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export type GuideLink = { href: string; label: string };

function link(slug: string): GuideLink | null {
  const g = getGuide(slug);
  return g ? { href: `/guides/${g.slug}`, label: g.title } : null;
}

// Pick the most relevant guide(s) to cross-link from a procedure's money page, so
// editorial authority flows to/from the money pages (closes the internal-link loop).
// Returns a topic-specific guide when one matches, plus the universally-relevant
// "cash vs negotiated" explainer. Max 2.
export function guidesForProcedure(slug: string, name: string, category: string | null): GuideLink[] {
  const s = `${slug} ${name}`.toLowerCase();
  let topic: GuideLink | null = null;
  if (/\bmri\b|magnetic resonance/.test(s)) topic = link("mri-cost");
  else if (/\bct[ -]|computed tomog/.test(s)) topic = link("ct-scan-cost");
  else if (/colonoscop/.test(s)) topic = link("colonoscopy-cost");
  else if (/mammogram|mammograph/.test(s)) topic = link("mammogram-cost");
  else if (/emergency|er[ -]visit/.test(s)) topic = link("er-visit-cost");
  else if (/deliver|cesarean|c-section|childbirth|vaginal birth|vbac/.test(s)) topic = link("childbirth-cost");
  else if (/echocard/.test(s)) topic = link("echocardiogram-cost");
  else if (/ultrasound|sonogram/.test(s)) topic = link("ultrasound-cost");
  else if (/x-ray|\bxray\b|radiograph/.test(s)) topic = link("chest-x-ray-cost");
  else if (/sleep study|polysomnog/.test(s)) topic = link("sleep-study-cost");
  else if (/\bcbc\b|complete blood count|metabolic panel|lipid panel|cholesterol|hemoglobin|\ba1c\b|\btsh\b|thyroid (test|function)|vitamin d|\bpsa\b|urinalysis|blood (test|count|panel)/.test(s))
    topic = link("blood-test-cost");
  else if (/knee replacement|hip replacement|joint replacement|arthroplasty/.test(s)) topic = link("knee-replacement-cost");
  else if (/cataract/.test(s)) topic = link("cataract-surgery-cost");
  else if (/gallbladder|cholecystect/.test(s)) topic = link("gallbladder-surgery-cost");
  else if (/hernia/.test(s)) topic = link("hernia-surgery-cost");
  else if (category === "surgery" || /replacement|hysterect|appendect|tonsillect/.test(s))
    topic = link("why-prices-vary");
  return [topic, link("cash-vs-negotiated-price")].filter((x): x is GuideLink => x !== null).slice(0, 2);
}

// Guides to cross-link from a hospital's money page.
export function guidesForHospital(): GuideLink[] {
  return [link("hospital-bill"), link("cash-vs-negotiated-price")].filter((x): x is GuideLink => x !== null);
}
