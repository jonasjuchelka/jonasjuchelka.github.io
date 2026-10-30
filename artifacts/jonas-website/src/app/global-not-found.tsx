import "@workspace/design-tokens/tokens.css";
import "@workspace/site-ui/site-ui.css";
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NAV_PATHS } from "@/lib/site";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Seite nicht gefunden", robots: { index: false } };

export default function GlobalNotFound() {
  const t = getDict("de");
  return (
    <html lang="de" className={fontVariables}>
      <body>
        <a href="#inhalt" className="skip-link">{t.ui.skip}</a>
        <Header lang="de" />
        <main id="inhalt" tabIndex={-1}>
          <section className="wrap notfound">
            <p className="notfound__code" aria-hidden="true">404</p>
            <h1>{t.notFound.heading}</h1>
            <p className="lede">{t.notFound.lede}</p>
            <ul className="notfound__links">
              <li><Link href="/">{t.notFound.home}</Link></li>
              {NAV_PATHS.map((n) => <li key={n.href}><Link href={n.href}>{t.nav[n.key]}</Link></li>)}
            </ul>
          </section>
        </main>
        <Footer lang="de" />
      </body>
    </html>
  );
}
