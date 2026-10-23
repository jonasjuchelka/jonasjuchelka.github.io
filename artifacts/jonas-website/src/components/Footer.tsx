import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { EMAIL, GITHUB } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer dark">
      <div className="wrap site-footer__grid">
        <div>
          <BrandLogo className="site-footer__logo" />
          <p className="site-footer__name">Jonas Juchelka</p>
          <p className="site-footer__line">Deep Learning · Management &amp; Technology, TU München.</p>
        </div>
        <ul className="site-footer__links" aria-label="Kontakt">
          <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
          <li><a href={GITHUB} rel="me noopener noreferrer">GitHub</a></li>
          <li><Link href="/feed.xml" prefetch={false}>RSS-Feed</Link></li>
        </ul>
        <ul className="site-footer__links" aria-label="Rechtliches">
          <li><Link href="/impressum/">Impressum</Link></li>
          <li><Link href="/datenschutz/">Datenschutz</Link></li>
          <li><Link href="/login/">Privater Bereich</Link></li>
        </ul>
      </div>
      <div className="wrap site-footer__base">
        <span>Statische Website. Kein Tracking, keine Cookies.</span>
      </div>
    </footer>
  );
}
