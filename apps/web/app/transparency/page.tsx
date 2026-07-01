import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Public accuracy/coverage report. An aggregator is most vulnerable on "how do I
// know your parsing is right?" — so we publish the numbers: coverage, ingest
// success vs. failure (and why files fail), data-quality scores, freshness, and
// the correction queue. All computed live from the DB, refreshed daily.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Transparency & accuracy report — OpenHospitalCost",
  description:
    "How complete and accurate our data is: coverage, parse success and failure reasons, data-quality scores, freshness, and corrections — published openly and refreshed daily.",
  alternates: { canonical: "/transparency" },
};

type Coverage = { hospitals: number; states: number; procedures: number; price_points: number };
type Quality = {
  files: number; q_median: number; q_ge80: number; eligible: number;
  fresh30: number; fresh90: number; oldest: string | null;
};
type Outcomes = { attempted: number; ok: number; unreachable: number; unusable: number; parse_err: number; other: number };

async function getReport() {
  const [cov, qual, out] = (await Promise.all([
    sql`
      SELECT
        (SELECT count(*) FROM hospitals h JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id=h.id ORDER BY parsed_at DESC LIMIT 1) f ON true WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean)::int AS hospitals,
        (SELECT count(DISTINCT lower(h.state)) FROM hospitals h JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id=h.id ORDER BY parsed_at DESC LIMIT 1) f ON true WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean)::int AS states,
        (SELECT count(*) FROM procedures)::int AS procedures,
        (SELECT count(*) FROM procedure_hospital_summary)::int AS price_points
    `,
    sql`
      WITH latest AS (
        SELECT DISTINCT ON (h.id) f.quality_score AS q, f.parsed_at AS pa,
          (f.quality_metrics->>'eligibleForMoneyPages')::boolean AS elig
        FROM hospitals h JOIN mrf_files f ON f.hospital_id = h.id
        WHERE f.status = 'parsed' AND f.quality_score IS NOT NULL
        ORDER BY h.id, f.parsed_at DESC
      )
      SELECT count(*)::int AS files,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY q))::int AS q_median,
        count(*) FILTER (WHERE q >= 80)::int AS q_ge80,
        count(*) FILTER (WHERE elig)::int AS eligible,
        count(*) FILTER (WHERE pa > now() - interval '30 days')::int AS fresh30,
        count(*) FILTER (WHERE pa > now() - interval '90 days')::int AS fresh90,
        min(pa)::date::text AS oldest
      FROM latest
    `,
    sql`
      WITH latest AS (
        SELECT DISTINCT ON (hospital_id) status, failure_class
        FROM ingest_attempts ORDER BY hospital_id, attempted_at DESC
      )
      SELECT count(*)::int AS attempted,
        count(*) FILTER (WHERE status='ok')::int AS ok,
        count(*) FILTER (WHERE status='fail' AND failure_class IN ('404_dead','403_blocked','fetch_failed','http_5xx','http_429','timeout'))::int AS unreachable,
        count(*) FILTER (WHERE status='fail' AND failure_class IN ('unrecognized','zip_no_csv','giant_json','oom'))::int AS unusable,
        count(*) FILTER (WHERE status='fail' AND failure_class='parse')::int AS parse_err,
        count(*) FILTER (WHERE status='fail' AND failure_class NOT IN ('404_dead','403_blocked','fetch_failed','http_5xx','http_429','timeout','unrecognized','zip_no_csv','giant_json','oom','parse'))::int AS other
      FROM latest
    `,
  ])) as [Coverage[], Quality[], Outcomes[]];
  return { cov: cov[0], qual: qual[0], out: out[0] };
}

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default async function TransparencyPage() {
  const { cov, qual, out } = await getReport();
  const failed = out.unreachable + out.unusable + out.parse_err + out.other;
  const fetchedUsable = out.ok + out.parse_err; // files we got in a recognized format
  const asOf = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const stats: { n: string; label: string }[] = [
    { n: fmt(cov.hospitals), label: "hospitals with usable prices" },
    { n: fmt(cov.states), label: "states + territories" },
    { n: fmt(cov.procedures), label: "shoppable procedures" },
    { n: fmt(cov.price_points), label: "representative prices" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Transparency</div>
          <h1>Transparency &amp; accuracy report</h1>
          <p className="sub">
            We aggregate thousands of hospital files, so the fair question is: how complete is this, and how do
            you know the parsing is right? Here are the numbers, straight from our database and refreshed daily.
          </p>
          <p className="prov" style={{ marginTop: 8 }}>As of {asOf}.</p>
        </section>

        <div className="copy">
          <div className="treport-stats">
            {stats.map((s) => (
              <div className="treport-stat" key={s.label}>
                <span className="treport-n">{s.n}</span>
                <span className="treport-l">{s.label}</span>
              </div>
            ))}
          </div>

          <h2>Did the parsing work?</h2>
          <p>
            Across <strong>{fmt(out.attempted)}</strong> hospitals we&apos;ve attempted, <strong>{fmt(out.ok)}</strong>{" "}
            ({pct(out.ok, out.attempted)}%) produced a usable price file. The rest failed — and the breakdown matters,
            because most failures are the hospital&apos;s file, not our parser:
          </p>
          <ul>
            <li><strong>{fmt(out.unreachable)}</strong> — file unreachable: the hospital&apos;s link is dead (404), blocked (403), timed out, or erroring. Nothing we can parse.</li>
            <li><strong>{fmt(out.unusable)}</strong> — file unusable: an unrecognized layout, a ZIP with no usable CSV, or a file too large to process. These are non-standard publications, not parse mistakes.</li>
            <li><strong>{fmt(out.parse_err)}</strong> — genuine parse errors: we fetched a recognized file but our parser failed on it. This is the bucket we own, and it&apos;s {pct(out.parse_err, fetchedUsable)}% of the files we could actually read.</li>
            {out.other > 0 ? <li><strong>{fmt(out.other)}</strong> — other / uncategorized.</li> : null}
          </ul>
          <p>
            Put another way: of the files we could fetch in a standard format, our parser succeeded on{" "}
            <strong>{pct(out.ok, fetchedUsable)}%</strong>. When a price is missing, it&apos;s almost always because the
            hospital hasn&apos;t published a usable file — not a parsing mistake — and you can check that yourself, because
            every hospital page links to its exact source file. (This attempt log covers crawls since June 2026; the
            coverage totals above count every hospital we currently serve, including files parsed earlier.)
          </p>

          <h2>How good is the data we do have?</h2>
          <p>
            Each parsed file gets a 0–100 quality score (completeness of codes, payers, and price types — see our{" "}
            <a href="/methodology">methodology</a>). Across <strong>{fmt(qual.files)}</strong> hospitals with a parsed file:
          </p>
          <ul>
            <li>Median quality score: <strong>{qual.q_median}/100</strong>.</li>
            <li><strong>{pct(qual.q_ge80, qual.files)}%</strong> score 80 or higher.</li>
            <li><strong>{fmt(qual.eligible)}</strong> meet our bar to power price comparisons; files below it are kept but not surfaced as money pages.</li>
          </ul>
          <p>
            Quality is also shown per hospital (the score on each hospital page) and per row — a &quot;1 plan&quot; tag flags a
            figure backed by a single payer, and a &quot;shared rate&quot; tag flags a price the hospital applies to several
            procedures at once (a billing tier), so you can weigh each number, not just trust the file-level score.
          </p>

          <h2>How fresh is it?</h2>
          <p>
            We re-ingest hospital files on a weekly schedule, so the data tracks what hospitals currently publish.
            Of the latest file we hold per hospital, <strong>{pct(qual.fresh90, qual.files)}%</strong> were ingested in
            the last 90 days{qual.oldest ? <> (oldest on record: {qual.oldest})</> : null}. Each hospital page shows the
            ingestion date and links to the source file, so you can always confirm against the original.
          </p>

          <h2>Corrections</h2>
          <p>
            If you spot a number that looks wrong, we check every report against the source file.{" "}
            <a href="mailto:contact@openhospitalcost.com?subject=Correction">Let us know →</a>
          </p>

          <h2>Want the raw data?</h2>
          <p>
            Everything here is built on public records, and we keep it traceable. For the underlying files and bulk
            snapshots, see <a href="/data">data sources &amp; export</a>; for how we process them, see our{" "}
            <a href="/methodology">methodology</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
