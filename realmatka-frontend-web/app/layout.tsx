import "./globals.css";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL("https://realmatka.in"),
  title: "Real Matka | Full Game Rate | All Markets | Download App",
  description:
    "Real Matka landing website with full game rate, app screenshots, all markets, available games, and direct login/register access to the app.",
  icons: {
    icon: "/app-icon.jpg",
    shortcut: "/app-icon.jpg",
    apple: "/app-icon.jpg"
  },
  openGraph: {
    title: "Real Matka | Full Game Rate | All Markets | Download App",
    description:
      "Real Matka landing website with full game rate, app screenshots, all markets, available games, and direct login/register access to the app.",
    url: "https://realmatka.in",
    siteName: "Real Matka",
    images: [
      {
        url: "/app-icon.jpg",
        width: 1024,
        height: 1024,
        alt: "Real Matka"
      }
    ]
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
