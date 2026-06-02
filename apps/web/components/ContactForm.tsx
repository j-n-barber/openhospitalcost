"use client";
import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      message: fd.get("message"),
      website: fd.get("website"), // honeypot
    };
    try {
      const res = await fetch("/api/contact", {
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
        Thanks — your message is on its way. We read every one and will reply to the email you gave.
      </div>
    );
  }

  return (
    <form className="formcard" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="c-name">Name <span className="opt">(optional)</span></label>
        <input id="c-name" name="name" type="text" autoComplete="name" maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" required autoComplete="email" maxLength={200} placeholder="you@example.com" />
      </div>
      <div className="field">
        <label htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" required rows={6} maxLength={5000} placeholder="How can we help?" />
      </div>
      {/* Honeypot — hidden from users, catches bots. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="c-website">Leave this field empty</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && <p className="formmsg err" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
