import type { Metadata } from "next";
import { SEO } from "@/seo.config";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SEO.siteUrl),
  title: {
    default: SEO.defaultTitle,
    template: `%s | ${SEO.siteName}`,
  },
  description: SEO.defaultDescription,
  keywords: SEO.defaultKeywords,
  alternates: {
    canonical: SEO.siteUrl,
  },
  openGraph: {
    type: "website",
    url: SEO.siteUrl,
    siteName: SEO.siteName,
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function buildMetadata({
  title,
  description,
  path = "/",
  keywords = [],
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const url = path === "/" ? SEO.siteUrl : `${SEO.siteUrl}${path}`;
  return {
    title,
    description,
    keywords: [...SEO.defaultKeywords, ...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      siteName: SEO.siteName,
      url,
      title,
      description,
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}
