"use client";

// A single AdSense ad unit. Renders nothing until BOTH the AdSense client
// (NEXT_PUBLIC_ADSENSE_CLIENT) and a `slot` id (created in the AdSense dashboard
// after approval) are present — so dropping these into pages now has zero visual
// impact until you flip it on. Usage: <AdSlot slot="1234567890" />
import { useEffect } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-9074357617415731";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  slot,
  format = "auto",
  className = "",
}: {
  slot?: string;
  format?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not loaded yet / blocked — ignore */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
