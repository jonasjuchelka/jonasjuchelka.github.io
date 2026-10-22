import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { NAV } from "@/lib/site";

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href="/" className="wordmark" aria-label="Jonas Juchelka, zur Startseite">
          <BrandLogo className="wordmark__logo" />
          <span className="wordmark__name">Jonas Juchelka</span>
        </Link>
        <nav aria-label="Hauptnavigation">
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={n.href === "/login/" ? "nav__private" : undefined} data-testid={`link-nav-${n.href.replaceAll("/", "")}`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
