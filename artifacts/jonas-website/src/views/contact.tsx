import { PageHead } from "@/components/PageHead";
import { EMAIL, GITHUB } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { getDict } from "@/lib/i18n";

export const contactMeta = (lang: string) => pageMeta(lang, getDict(lang).contact.metaTitle, getDict(lang).contact.metaDesc, "/kontakt/");

export function ContactView({ lang }: { lang: string }) {
  const t = getDict(lang).contact;
  return (
    <>
      <PageHead eyebrow={t.eyebrow} title={t.title}><p>{t.lede}</p></PageHead>
      <div className="wrap section section--tight">
        <dl className="contact">
          <div className="contact__row">
            <dt>{t.email}</dt>
            <dd><a href={`mailto:${EMAIL}`} className="big-link" data-testid="link-contact-mail">{EMAIL}</a></dd>
          </div>
          <div className="contact__row">
            <dt>{t.github}</dt>
            <dd><a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor" data-testid="link-contact-github">github.com/jonasjuchelka</a></dd>
          </div>
        </dl>
      </div>
    </>
  );
}
