export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div><strong>Browse</strong><a href="/procedures">By procedure</a><a href="/hospitals">By hospital</a><a href="/states">By state</a></div>
          <div><strong>Understand</strong><a href="/how-it-works">How it works</a><a href="/methodology">Methodology</a><a href="/data">Data sources</a></div>
          <div><strong>Data</strong><a href="/data">Open data export</a><a href="/corrections">Submit a correction</a><a href="/llms.txt">llms.txt</a></div>
          <div><strong>About</strong><a href="/about">The project</a><a href="/contact">Contact</a></div>
        </div>
        <p className="fine">OpenHospitalCost aggregates hospital price transparency files published under 45 CFR §180. Prices are shown as reported by each hospital and cited to the source file and ingestion date. Figures are for informational purposes and are not a quote or guarantee of cost.</p>
      </div>
    </footer>
  );
}
