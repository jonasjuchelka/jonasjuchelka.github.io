import { Notice } from "@workspace/site-ui";
import { PageHead } from "@/components/PageHead";
import { privateAppOrigin } from "@/lib/site";
import { pageMeta } from "@/lib/meta";

export const metadata = { ...pageMeta("Privater Bereich", "Einstieg in den privaten, per Passkey geschützten Bereich.", "/login/"), robots: { index: false, follow: true } };

export default function Login() {
  const origin = privateAppOrigin();
  return (
    <>
      <PageHead eyebrow="Zugang" title="Privater Bereich">
        <p>
          Der private Bereich ist eine eigene Anwendung unter einer eigenen Adresse. Diese öffentliche Seite meldet niemanden an
          und speichert nichts.
        </p>
      </PageHead>
      <div className="wrap section section--tight gateway">
        {origin ? (
          <div className="gateway__card dark">
            <p className="band__eyebrow">Weiter zur Anmeldung</p>
            <p className="gateway__origin">{new URL(origin).host}</p>
            <a href={`${origin}/login`} className="btn btn--primary" data-testid="link-private-login">Mit Passkey anmelden</a>
          </div>
        ) : (
          <Notice tone="warning" title="Noch nicht eingerichtet">
            <p>Die private Anwendung hat noch keine feste Produktionsadresse. Sobald sie steht, führt diese Seite direkt dorthin.</p>
          </Notice>
        )}
        <ul className="gateway__facts">
          <li><strong>Nur mit Passkey.</strong> Kein Passwort, kein Social Login, kein Link per E-Mail.</li>
          <li><strong>Nur mit Einladung.</strong> Eine öffentliche Registrierung gibt es nicht.</li>
          <li><strong>Getrennt.</strong> Anmeldung und Daten liegen ausschließlich auf der privaten Anwendung, nicht auf GitHub Pages.</li>
        </ul>
      </div>
    </>
  );
}
