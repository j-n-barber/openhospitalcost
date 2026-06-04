"use client";
import { useState } from "react";

// Reusable newsletter signup. Drop in with a `source` so we know where signups
// come from. Posts to /api/subscribe, which stores in Neon and mirrors to Resend.
export default function SubscribeForm({
  source,
  heading = "Get the monthly price report",
  blurb = "One email a month: the biggest hospital price swings and what we've added. No spam, unsubscribe anytime.",
}: {
  source: string;
  heading?: string;
  blurb?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: fd.get("email"),
      source,
      website: fd.get("website"), // honeypot
    };
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="signup">
      <h2 className="signup-h">{heading}</h2>
      {status === "sent" ? (
        <p className="signup-sub" role="status" style={{ margin: 0 }}>
          You&apos;re on the list — thanks! Watch for the next monthly report.
        </p>
      ) : (
        <>
          <p className="signup-sub">{blurb}</p>
          <form onSubmit={onSubmit} noValidate>
            <div className="signup-row">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={200}
                placeholder="you@example.com"
                aria-label="Email address"
              />
              <button className="btn" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {/* Honeypot — hidden from users, catches bots. */}
            <div className="hp" aria-hidden="true">
              <label htmlFor={`hp-${source}`}>Leave this field empty</label>
              <input id={`hp-${source}`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {status === "error" && <p className="formmsg err" role="alert" style={{ marginTop: 10 }}>{error}</p>}
          </form>
        </>
      )}
    </div>
  );
}
