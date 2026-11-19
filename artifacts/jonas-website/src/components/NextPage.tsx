"use client";

// „Als Nächstes“ am Ende der vier Hauptseiten: ein großer Link zur nächsten Seite (Home → Projekte → Blog → Kontakt → Home).
// Wer ganz unten angekommen ist und weiterscrollt (Mausrad, Trackpad oder Wischen), landet automatisch dort.
// Der Balken im Link zeigt, wie weit es noch ist. Nichts wird doppelt angezeigt, es ist nur ein Link.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { localePath, stripLocale } from "@/i18n/config";

const ORDER = ["/", "/projects/", "/blog/", "/kontakt/"] as const;
const WHEEL_GOAL = 520; // so viel Scrollweg (px) über das Ende hinaus, bis es weitergeht
const TOUCH_GOAL = 150;

export function NextPage({ lang, labels, label, hint }: { lang: string; labels: Record<string, string>; label: string; hint: string }) {
  const raw = stripLocale(usePathname() || "/");
  const path = raw.endsWith("/") ? raw : `${raw}/`;
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const i = ORDER.indexOf(path as (typeof ORDER)[number]);
  const next = i < 0 ? null : ORDER[(i + 1) % ORDER.length];
  const href = next ? localePath(lang, next) : "";

  useEffect(() => {
    if (!next) return;
    const el = ref.current;
    let sum = 0, idle = 0, startY = -1, gone = false;
    const blocked = () => /\b(sheet-open|rd-open)\b/.test(document.documentElement.className);
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const show = (v: number) => el?.style.setProperty("--np", String(Math.min(1, v)));
    const go = () => { if (gone) return; gone = true; show(1); router.push(href); };
    const reset = () => { sum = 0; show(0); };
    const onWheel = (e: WheelEvent) => {
      if (blocked()) return;
      if (e.deltaY <= 0 || !atEnd()) { if (e.deltaY < 0) reset(); return; }
      sum += Math.min(e.deltaY, 120);
      show(sum / WHEEL_GOAL);
      clearTimeout(idle); idle = window.setTimeout(reset, 900);
      if (sum >= WHEEL_GOAL) go();
    };
    const onStart = (e: TouchEvent) => { startY = !blocked() && atEnd() ? e.touches[0].clientY : -1; };
    const onMove = (e: TouchEvent) => {
      if (startY < 0) { if (!blocked() && atEnd()) startY = e.touches[0].clientY; return; }
      show((startY - e.touches[0].clientY) / TOUCH_GOAL);
    };
    const onEnd = (e: TouchEvent) => {
      if (startY >= 0 && startY - (e.changedTouches[0]?.clientY ?? startY) >= TOUCH_GOAL) go(); else reset();
      startY = -1;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [next, href, router]);

  if (!next) return null;
  const key = next === "/" ? "home" : next === "/projects/" ? "projects" : next === "/blog/" ? "blog" : "contact";
  return (
    <nav className="wrap nextpage" aria-label={label}>
      <Link ref={ref} href={href} className="nextpage__a" data-testid="link-next-page">
        <span className="cv-label">{label}</span>
        <span className="nextpage__t">{labels[key]} <span aria-hidden="true">&rarr;</span></span>
        <span className="nextpage__hint">{hint}</span>
        <span className="nextpage__bar" aria-hidden="true" />
      </Link>
    </nav>
  );
}
