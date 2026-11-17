import "@workspace/design-tokens/tokens.css";
import "@workspace/site-ui/site-ui.css";
import "../app/globals.css";
import "../app/blog.css";
import "../app/site.css";
import { fontVariables } from "../app/fonts";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getDict, isRtl } from "@/lib/i18n";

const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

/** Shared <html> shell. German and every other language have their own root layout so <html lang> is correct. */
export function SiteShell({ lang, children }: { lang: string; children: ReactNode }) {
  const t = getDict(lang);
  return (
    <html lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Gespeicherte Wahl vor dem ersten Zeichnen setzen, damit nichts aufblitzt. Standard: hell. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#inhalt" className="skip-link">{t.ui.skip}</a>
        <Header lang={lang} />
        <main id="inhalt" tabIndex={-1}>{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
