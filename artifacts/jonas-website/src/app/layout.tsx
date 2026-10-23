import "@workspace/design-tokens/tokens.css";
import "@workspace/site-ui/site-ui.css";
import "./globals.css";
import { fontVariables } from "./fonts";
import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL, types: { "application/rss+xml": "/feed.xml" } },
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, url: SITE_URL, siteName: SITE_NAME, locale: "de_DE", type: "website" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#1C2B36", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={fontVariables}>
      <body>
        <a href="#inhalt" className="skip-link">Zum Inhalt springen</a>
        <Header />
        <main id="inhalt" tabIndex={-1}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
