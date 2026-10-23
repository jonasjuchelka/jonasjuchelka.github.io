import { PageHead } from "@/components/PageHead";
import { EMAIL, GITHUB } from "@/lib/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("Kontakt", "Kontakt zu Jonas Juchelka per E-Mail oder über GitHub.", "/kontakt/");

export default function Kontakt() {
  return (
    <>
      <PageHead eyebrow="Kontakt" title="Schreib mir.">
        <p>Kein Formular, kein Umweg. Eine E-Mail erreicht mich direkt.</p>
      </PageHead>
      <div className="wrap section section--tight">
        <dl className="contact">
          <div className="contact__row">
            <dt>E-Mail</dt>
            <dd><a href={`mailto:${EMAIL}`} className="big-link" data-testid="link-contact-mail">{EMAIL}</a></dd>
          </div>
          <div className="contact__row">
            <dt>GitHub</dt>
            <dd><a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor" data-testid="link-contact-github">github.com/jonasjuchelka</a></dd>
          </div>
        </dl>
      </div>
    </>
  );
}
