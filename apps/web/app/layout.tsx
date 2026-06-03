import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { AdSense } from "@/components/AdSense";

// Direction B brand type — locked in brand/palette.md.
const serif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

const DESCRIPTION =
  "Real gross, cash, and negotiated hospital prices pulled straight from federally-mandated machine-readable files and cited to the source. Not estimates.";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhospitalcost.com"),
  title: "OpenHospitalCost — What hospitals actually charge",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "OpenHospitalCost — What hospitals actually charge",
    description: DESCRIPTION,
    url: "https://openhospitalcost.com",
    siteName: "OpenHospitalCost",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OpenHospitalCost — real hospital prices, cited to the source" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenHospitalCost — What hospitals actually charge",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
      <Analytics />
      <AdSense />
    </html>
  );
}
