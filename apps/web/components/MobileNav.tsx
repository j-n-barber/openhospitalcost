"use client";

// Mobile menu: a hamburger in the header that toggles a dropdown of the main nav
// links. Hidden on desktop (the inline nav shows there). Closes on link tap,
// backdrop click, or Escape.
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/procedures", label: "Procedures" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/states", label: "States" },
  { href: "/reports", label: "Reports" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/faq", label: "FAQ & Guides" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mobilenav">
      <button
        type="button"
        className="mn-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>
          ) : (
            <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>
          )}
        </svg>
      </button>
      {open && (
        <>
          <div className="mn-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="mn-panel">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
