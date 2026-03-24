import type { MetadataRoute } from "next";
import { SEO } from "@/seo.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: SEO.siteUrl,
    sitemap: `${SEO.siteUrl}/sitemap.xml`,
  };
}
