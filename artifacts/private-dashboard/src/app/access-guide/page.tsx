import { PageHead } from "@/components/ui";
import { Notice } from "@workspace/site-ui";

export const metadata = { title: "Zugangsleitfaden" };

export default function AccessGuide() {
  return (
    <>
      <PageHead eyebrow="Leitfaden" title="Wie Zugänge hier funktionieren">
        <p>Website-Zugang, Sichtbarkeit eines Tools und die Berechtigung beim Anbieter sind drei getrennte Dinge.</p>
      </PageHead>
      <div className="split">
        <ol className="steps">
          <li><h2>Website-Zugang</h2><p>Du meldest dich hier nur mit Passkey an. Das meldet dich bei keinem externen Dienst an.</p></li>
          <li><h2>Freigabe eines Tools</h2><p>Ein Tool erscheint nur, wenn es dir direkt oder über eine Gruppe freigegeben wurde. Der Server prüft das bei jeder Anfrage.</p></li>
          <li><h2>Zugang beim Anbieter</h2>
            <p><strong>Eigenes Konto:</strong> Du nutzt deinen eigenen Account beim Anbieter.</p>
            <p><strong>Offizieller Teamplatz:</strong> Ein vom Anbieter vorgesehener Platz in einem Team-Abo.</p>
            <p><strong>Ausdrücklich erlaubter geteilter Zugang:</strong> Nur wenn die Bedingungen des Anbieters das zulassen.</p>
          </li>
        </ol>
        <aside className="stack">
          <Notice tone="info" title="Keine Geheimnisse hier">
            <p>Diese Website speichert keine Passwörter, API-Schlüssel, TOTP-Secrets oder Recovery-Codes von Drittanbietern.</p>
          </Notice>
          <div className="panel">
            <h3>Passkeys sicher halten</h3>
            <p>Richte unter „Konto“ einen zweiten, unabhängigen Passkey ein. Beim Verlust aller Passkeys gibt es nur den manuellen Weg über Jonas.</p>
          </div>
          <div className="panel">
            <h3>Zugang beenden</h3>
            <p>Eine Sperre hier entzieht nicht automatisch Anbieterzugänge. Kopierte Zugangsdaten lassen sich nicht zurückrufen; geteilte Passwörter werden bei Bedarf rotiert.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
