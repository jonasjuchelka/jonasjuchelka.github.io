"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Spielt die Logo-Animation bei jedem Seitenaufruf. Auf der Startseite erst, wenn der Schriftzug aus dem Bild gescrollt ist. */
export function LogoPlayer({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const path = usePathname();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const play = () => {
      el.classList.remove("is-wait", "play");
      void el.getBoundingClientRect();
      el.classList.add("play");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove("play"), 2400);
    };
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) { play(); return () => window.clearTimeout(timer); }
    // Auf der Startseite reicht das Foto bis unter die Leiste (Lücke zwischen den beiden Leisten-Inseln). Das Logo spielt,
    // sobald die Leiste oben angekommen ist.
    const head = el.closest("header");
    const passed = () => (head ? head.getBoundingClientRect().top : hero.getBoundingClientRect().bottom) < 6;
    if (passed()) { play(); return () => window.clearTimeout(timer); }
    el.classList.add("is-wait");
    const onScroll = () => { if (passed()) { window.removeEventListener("scroll", onScroll); play(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.clearTimeout(timer); el.classList.remove("is-wait"); };
  }, [path]);
  return <Link ref={ref} href={href} className="logo" aria-label={label}>{children}</Link>;
}
