// Google AdSense loader — inert until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXX)
// is set. Rendered once in the root layout. Individual ad units are placed with
// <AdSlot /> (see components/AdSlot.tsx). AdSense still requires site review/
// approval after the site is live before ads actually serve.
import Script from "next/script";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function AdSense() {
  if (!CLIENT) return null;
  return (
    <Script
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
