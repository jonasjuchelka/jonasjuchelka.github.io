import { Notice } from "@workspace/site-ui";
import { PageHead } from "@/components/PageHead";
import { pageMeta } from "@/lib/meta";

export const metadata = { ...pageMeta("Datenschutz", "Welche Daten beim Besuch dieser Website anfallen.", "/datenschutz/"), robots: { index: false, follow: true } };

export default function Datenschutz() {
  return (
    <>
      <PageHead eyebrow="Rechtliches" title="Datenschutz" />
      <div className="wrap section section--tight prose">
        <Notice tone="warning" title="Entwurf: rechtliche Prüfung offen">
          <p>Diese Angaben beschreiben die tatsächlich eingerichtete Technik. Eine vollständige, rechtlich geprüfte Erklärung inklusive Anschrift des Verantwortlichen steht noch aus.</p>
        </Notice>
        <h2>Hosting</h2>
        <p>Die Website wird als statische Dateien über GitHub Pages ausgeliefert. Beim Abruf verarbeitet GitHub technisch notwendige Verbindungsdaten wie die IP-Adresse. Auf diese Verarbeitung habe ich keinen Einfluss über die Konfiguration hinaus.</p>
        <h2>Was diese Website nicht tut</h2>
        <ul>
          <li>Keine Cookies, kein Tracking, keine Analyse- oder Marketingdienste.</li>
          <li>Keine extern geladenen Schriften oder Skripte von Drittanbietern.</li>
          <li>Kein Kontaktformular. Eine E-Mail verarbeitet Ihr und mein E-Mail-Anbieter.</li>
        </ul>
        <h2>Privater Bereich</h2>
        <p>Der per Passkey geschützte Bereich ist eine getrennte Anwendung mit eigener Datenschutzerklärung. Diese öffentliche Website überträgt keine Daten dorthin.</p>
      </div>
    </>
  );
}
