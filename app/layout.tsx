import "./globals.css";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SeoKeywords from "@/components/SeoKeywords";
import AdsenseScript from "@/components/AdsenseScript";
import { defaultMetadata } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  ...defaultMetadata,
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdsenseScript />
        <Header />
        <main className="pt-6">{children}</main>
        <SeoKeywords />
        <Footer />
      </body>
    </html>
  );
}
