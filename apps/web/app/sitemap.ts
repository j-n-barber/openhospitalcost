import type { MetadataRoute } from "next";

const BASE = "https://openhospitalcost.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "yearly", priority: 1 },
    { url: `${BASE}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
