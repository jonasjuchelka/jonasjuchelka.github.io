import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { EMAIL, GITHUB } from "@/lib/site";
import { getDict, localePath } from "@/lib/i18n";

export function Footer({ lang }: { lang: string }) {
  const t = getDict(lang);
  return (
    <footer className="site-footer dark">
      <div className="wrap site-footer__grid">
        <div>
          <BrandLogo className="site-footer__logo" />
          <p className="site-footer__name">Jonas Juchelka</p>
          <p className="site-footer__line">{t.footer.line}</p>
        </div>
        <ul className="site-footer__links" aria-label={t.ui.contactAria}>
          <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
          <li><a href={GITHUB} rel="me noopener noreferrer">GitHub</a></li>
          <li><Link href="/feed.xml" prefetch={false}>{t.footer.rss}</Link></li>
        </ul>
        <ul className="site-footer__links" aria-label={t.ui.legalAria}>
          <li><Link href={localePath(lang, "/impressum/")}>{t.footer.imprint}</Link></li>
          <li><Link href={localePath(lang, "/datenschutz/")}>{t.footer.privacy}</Link></li>
          <li><Link href={localePath(lang, "/login/")}>{t.nav.private}</Link></li>
        </ul>
      </div>
      <div className="wrap site-footer__base">
        <span>{t.footer.base}</span>
      </div>
    </footer>
  );
}
