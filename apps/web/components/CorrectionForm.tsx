"use client";
import { useEffect, useState } from "react";

export default function CorrectionForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  // Pre-fill the page being corrected from ?url= (e.g. links from a hospital page).
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) setPageUrl(u.slice(0, 500));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      pageUrl: fd.get("pageUrl"),
      email: fd.get("email"),
      whatWrong: fd.get("whatWrong"),
      expected: fd.get("expected"),
      source: fd.get("source"),
      website: fd.get("website"), // honeypot
    };
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setError(data.error || "Something went wrong. Please email us directly.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please email us directly.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="formmsg ok" role="status">
        Thanks for the report — it&apos;s in our review queue. We check every correction against the source file and
        will follow up at the email you gave if we need more detail.
      </div>
    );
  }

  return (
    <form className="formcard" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="x-url">Page URL</label>
        <input id="x-url" name="pageUrl" type="url" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)}
          maxLength={500} placeholder="https://openhospitalcost.com/…" />
      </div>
      <div className="field">
        <label htmlFor="x-email">Your email</label>
        <input id="x-email" name="email" type="email" required autoComplete="email" maxLength={200} placeholder="you@example.com" />
      </div>
      <div className="field">
        <label htmlFor="x-what">What looks wrong</label>
        <textarea id="x-what" name="whatWrong" required rows={4} maxLength={2000} placeholder="e.g. The negotiated price for an MRI looks far too low." />
      </div>
      <div className="field">
        <label htmlFor="x-expected">What you expected <span className="opt">(optional)</span></label>
        <textarea id="x-expected" name="expected" rows={3} maxLength={2000} />
      </div>
      <div className="field">
        <label htmlFor="x-source">Source <span className="opt">(optional)</span></label>
        <input id="x-source" name="source" type="text" maxLength={500} placeholder="A link or where you saw the correct value" />
      </div>
      {/* Honeypot — hidden from users, catches bots. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="x-website">Leave this field empty</label>
        <input id="x-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && <p className="formmsg err" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Submitting…" : "Submit correction"}
      </button>
    </form>
  );
}
