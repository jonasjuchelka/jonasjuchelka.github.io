"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath, stripLocale } from "@/i18n/config";

export type NavItem = { href: string; key: string; label: string };

function useActive(lang: string) {
  const path = stripLocale(usePathname() || "/");
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Menü oben (Mac). Aktuelle Seite: Himmelblau-Strich darunter, wie überall auf der Seite. */
export function NavLinks({ lang, items }: { lang: string; items: NavItem[] }) {
  const active = useActive(lang);
  return (
    <>
      {items.map((n) => (
        <li key={n.href} className={n.key === "private" ? "nav__login-li" : "nav__li"}>
          <Link href={localePath(lang, n.href)} className={n.key === "private" ? "nav__private" : undefined}
            aria-current={active(n.href) ? "page" : undefined} data-testid={`link-nav-${n.key}`}>
            {n.label}
          </Link>
        </li>
      ))}
    </>
  );
}

const ICONS: Record<string, string> = {
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  projects: "m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  blog: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  contact: "M3 6h18v12H3zM3 7l9 6 9-6",
  private: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
};

/** Leiste unten auf dem Handy: man sieht sofort, wie es weitergeht. */
export function TabBar({ lang, items, label }: { lang: string; items: NavItem[]; label: string }) {
  const active = useActive(lang);
  return (
    <nav className="tabbar" aria-label={label}>
      {items.map((n) => (
        <Link key={n.href} href={localePath(lang, n.href)} aria-current={active(n.href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS[n.key] ?? ICONS.home} /></svg>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
