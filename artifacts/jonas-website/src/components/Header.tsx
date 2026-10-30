import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NAV_PATHS, translateEndpoint } from "@/lib/site";
import { LANGUAGES, availableLocales, getDict, localePath } from "@/lib/i18n";

export function Header({ lang }: { lang: string }) {
  const t = getDict(lang);
  const locales = availableLocales().map((code) => ({ code, name: LANGUAGES[code].name }));
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href={localePath(lang, "/")} className="wordmark" aria-label={t.ui.homeAria}>
          <BrandLogo className="wordmark__logo" />
          <span className="wordmark__name">Jonas Juchelka</span>
        </Link>
        <nav aria-label={t.ui.mainNav}>
          <ul className="nav">
            {NAV_PATHS.map((n) => (
              <li key={n.href}>
                <Link href={localePath(lang, n.href)} className={n.href === "/login/" ? "nav__private" : undefined} data-testid={`link-nav-${n.href.replaceAll("/", "")}`}>
                  {t.nav[n.key]}
                </Link>
              </li>
            ))}
            <li><LanguageSwitcher lang={lang} locales={locales} t={t.lang} endpoint={translateEndpoint()} /></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
