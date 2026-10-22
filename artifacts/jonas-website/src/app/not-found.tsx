import Link from "next/link";
import { NAV } from "@/lib/site";

export const metadata = { title: "Seite nicht gefunden", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="wrap notfound">
      <p className="notfound__code" aria-hidden="true">404</p>
      <h1>Diese Seite gibt es hier nicht.</h1>
      <p className="lede">Vielleicht wurde sie verschoben, vielleicht war die Adresse nie richtig. Von hier geht es weiter:</p>
      <ul className="notfound__links">
        <li><Link href="/">Startseite</Link></li>
        {NAV.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
      </ul>
    </section>
  );
}
