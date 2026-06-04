import Logo from "./Logo";
import MobileNav from "./MobileNav";

export default function SiteHeader() {
  return (
    <header>
      <div className="wrap bar">
        <a className="brand" href="/">
          <Logo className="logo" />
          <span><span className="o">Open</span>HospitalCost</span>
        </a>
        <nav className="top">
          <a href="/procedures">Procedures</a>
          <a href="/hospitals">Hospitals</a>
          <a href="/reports">Reports</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/methodology">Methodology</a>
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}
