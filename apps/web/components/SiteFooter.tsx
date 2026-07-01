export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div><strong>About</strong><a href="/">Case Study</a><a href="/about">The Project</a><a href="mailto:contact@openhospitalcost.com">Contact</a></div>
          <div><strong>Legal</strong><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/llms.txt">llms.txt</a></div>
        </div>
        <p className="fine">OpenHospitalCost was a hospital price transparency project aggregating files published under 45 CFR §180. It is retired; this site is now a case study of how it worked.</p>
      </div>
    </footer>
  );
}
