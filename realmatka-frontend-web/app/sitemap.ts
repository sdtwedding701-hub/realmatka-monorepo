import type { MetadataRoute } from "next";
import { SEO } from "@/seo.config";

const marketChartSlugs = [
  "ntr-morning",
  "sita-morning",
  "karnataka-day",
  "star-tara-morning",
  "milan-morning",
  "maya-bazar",
  "andhra-morning",
  "sridevi",
  "mahadevi-morning",
  "time-bazar",
  "madhur-day",
  "sita-day",
  "star-tara-day",
  "ntr-bazar",
  "milan-day",
  "rajdhani-day",
  "andhra-day",
  "kalyan",
  "mahadevi",
  "ntr-day",
  "sita-night",
  "sridevi-night",
  "star-tara-night",
  "mahadevi-night",
  "madhur-night",
  "supreme-night",
  "andhra-night",
  "ntr-night",
  "milan-night",
  "kalyan-night",
  "rajdhani-night",
  "main-bazar",
  "mangal-bazar"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    { path: "/", changeFrequency: "daily" as const, priority: 1 },
    { path: "/support", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 }
  ];

  const chartRoutes = marketChartSlugs.map((slug) => ({
    path: `/charts/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.72
  }));

  return [...staticRoutes, ...chartRoutes].map((route) => ({
    url: `${SEO.siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
