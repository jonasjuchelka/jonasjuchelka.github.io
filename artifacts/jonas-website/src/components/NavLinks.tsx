"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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

/** Handy: alles hinter einem Hamburger-Knopf. Das Menü klappt oben als Blatt auf (Dialog), Login als Pille unten. */
export function MobileMenu({ lang, items, openLabel, closeLabel, title }: { lang: string; items: NavItem[]; openLabel: string; closeLabel: string; title: string }) {
  const active = useActive(lang);
  const dlg = useRef<HTMLDialogElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  const close = () => dlg.current?.close();
  const open = () => { dlg.current?.showModal(); document.documentElement.classList.add("sheet-open"); };
  useEffect(() => { close(); }, [path]);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const onClose = () => { document.documentElement.classList.remove("sheet-open"); btn.current?.focus(); };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);
  const login = items.find((n) => n.key === "private");
  return (
    <>
      <button ref={btn} type="button" className="burger" aria-haspopup="dialog" aria-label={openLabel} onClick={open} data-testid="button-menu">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <dialog ref={dlg} className="mnav" aria-label={title} onClick={(e) => { if (e.target === dlg.current) close(); }}>
        <div className="mnav__p">
          <div className="mnav__top">
            <span className="cv-label">{title}</span>
            <button type="button" className="sheet__x" onClick={close} aria-label={closeLabel}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <ul className="mnav__list">
            {items.filter((n) => n.key !== "private").map((n) => (
              <li key={n.href}>
                <Link href={localePath(lang, n.href)} onClick={close} aria-current={active(n.href) ? "page" : undefined}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS[n.key] ?? ICONS.home} /></svg>
                  <span>{n.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {login ? (
            <p className="mnav__login">
              <Link href={localePath(lang, login.href)} onClick={close} className="btn" aria-current={active(login.href) ? "page" : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS.private} /></svg>
                {login.label}
              </Link>
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
