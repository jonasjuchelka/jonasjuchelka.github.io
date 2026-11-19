import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoMark } from "./LogoMark";
import { LogoPlayer } from "./LogoPlayer";
import { MobileMenu, NavLinks, type NavItem } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_PATHS, translateEndpoint } from "@/lib/site";
import { LANGUAGES, availableLocales, getDict, localePath } from "@/lib/i18n";

export function Header({ lang }: { lang: string }) {
  const t = getDict(lang);
  const locales = availableLocales().map((code) => ({ code, name: LANGUAGES[code].name }));
  const items: NavItem[] = NAV_PATHS.map((n) => ({ href: n.href, key: n.key, label: t.nav[n.key] }));
  return (
    <>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <LogoPlayer href={localePath(lang, "/")} label={t.ui.homeAria}><LogoMark /></LogoPlayer>
          <nav aria-label={t.ui.mainNav} className="site-header__nav">
            <ul className="nav">
              <NavLinks lang={lang} items={items} />
              <li><ThemeToggle darkLabel={t.blog.themeDark} lightLabel={t.blog.themeLight} /></li>
              <li><LanguageSwitcher lang={lang} locales={locales} t={t.lang} endpoint={translateEndpoint()} /></li>
              <li className="nav__burger-li"><MobileMenu lang={lang} items={items} openLabel={t.nav.menuOpen} closeLabel={t.nav.menuClose} title={t.nav.menu} /></li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
