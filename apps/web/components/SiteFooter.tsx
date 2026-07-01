export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div><strong>Browse</strong><a href="/procedures">By Procedure</a><a href="/hospitals">By Hospital</a><a href="/states">By State</a><a href="/reports">Price Reports</a></div>
          <div><strong>Understand</strong><a href="/how-it-works">How It Works</a><a href="/guides">Guides</a><a href="/faq">FAQ</a><a href="/methodology">Methodology</a><a href="/data">Data Sources</a></div>
          <div><strong>Data</strong><a href="/data">Open Data Export</a><a href="mailto:contact@openhospitalcost.com?subject=Correction">Submit a Correction</a><a href="/llms.txt">llms.txt</a></div>
          <div><strong>About</strong><a href="/about">The Project</a><a href="mailto:contact@openhospitalcost.com">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
        </div>
        <p className="fine">OpenHospitalCost aggregates hospital price transparency files published under 45 CFR §180. Prices are shown as reported by each hospital and cited to the source file and ingestion date. Figures are for informational purposes and are not a quote or guarantee of cost.</p>
      </div>
    </footer>
  );
}
