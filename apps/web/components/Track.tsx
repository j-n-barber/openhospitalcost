"use client";

// First-party pageview beacon. Fires on every client navigation (and the initial
// load), POSTing the path + the document referrer to /api/track. Uses
// navigator.sendBeacon so it survives the page unloading; falls back to fetch
// keepalive. Fire-and-forget: never blocks or surfaces errors.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Track() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    try {
      const payload = JSON.stringify({
        path: pathname,
        ref: typeof document !== "undefined" ? document.referrer : "",
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        void fetch("/api/track", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        });
      }
    } catch {
      /* never let analytics break the page */
    }
  }, [pathname]);

  return null;
}
