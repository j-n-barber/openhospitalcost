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
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </div>
    </header>
  );
}
