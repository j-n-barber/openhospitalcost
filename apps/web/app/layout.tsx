import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import BackToTop from "@/components/BackToTop";

// Direction B brand type — locked in brand/palette.md.
const serif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

const DESCRIPTION =
  "A retired hospital price transparency project — a case study of the 8-stage ingestion pipeline that pulled real gross, cash, and negotiated prices from federally-mandated machine-readable files.";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhospitalcost.com"),
  title: "OpenHospitalCost — a retired price transparency project",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "OpenHospitalCost — a retired price transparency project",
    description: DESCRIPTION,
    url: "https://openhospitalcost.com",
    siteName: "OpenHospitalCost",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OpenHospitalCost — real hospital prices, cited to the source" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenHospitalCost — a retired price transparency project",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <BackToTop />
        <Analytics />
      </body>
    </html>
  );
}
