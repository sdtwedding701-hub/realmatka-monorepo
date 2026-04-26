import type { Metadata } from "next";
import { SEO } from "@/seo.config";

const defaultImage = {
  url: `${SEO.siteUrl}/app-icon.jpg`,
  width: 1024,
  height: 1024,
  alt: "Real Matka"
};

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
  icons: {
    icon: "/app-icon.jpg",
    shortcut: "/app-icon.jpg",
    apple: "/app-icon.jpg",
  },
  openGraph: {
    type: "website",
    url: SEO.siteUrl,
    siteName: SEO.siteName,
    locale: "en_IN",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: [defaultImage],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: [`${SEO.siteUrl}/app-icon.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
      images: [defaultImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SEO.siteUrl}/app-icon.jpg`],
    },
  };
}
