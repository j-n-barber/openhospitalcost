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
  else if (category === "surgery" || /replacement|hernia|gallbladder|cataract|hysterect|appendect|tonsillect/.test(s))
    topic = link("why-prices-vary");
  return [topic, link("cash-vs-negotiated-price")].filter((x): x is GuideLink => x !== null).slice(0, 2);
}

// Guides to cross-link from a hospital's money page.
export function guidesForHospital(): GuideLink[] {
  return [link("hospital-bill"), link("cash-vs-negotiated-price")].filter((x): x is GuideLink => x !== null);
}
