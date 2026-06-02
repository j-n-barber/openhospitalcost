import Logo from "./Logo";

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
          <a href="/how-it-works">How it works</a>
          <a href="/methodology">Methodology</a>
        </nav>
      </div>
    </header>
  );
}
