import type { MetadataRoute } from "next";
import { SEO } from "@/seo.config";
import { MARKETS } from "@/lib/markets";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/trick",
    "/trick/hybrid-95-tool",
    "/trick/final-number-chart",
    "/trick/ai-jodi-predictor",
    "/trick/progressive-hybrid-95",
    "/trick/top-bottom-never-5",
    "/trick/fire-logic",
    "/guides/chart-reading",
    "/guides/glossary-faq",
  ];

  const marketRoutes = Object.keys(MARKETS).flatMap((market) => [
    `/market/${market}`,
    `/market/${market}/archive`,
    `/market/${market}/morning`,
    `/market/${market}/day`,
    `/market/${market}/night`,
  ]);

  return [...staticRoutes, ...marketRoutes].map((route) => ({
    url: `${SEO.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route.startsWith("/trick/") ? 0.8 : 0.7,
  }));
}
