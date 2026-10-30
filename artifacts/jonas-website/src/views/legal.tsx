import { Notice } from "@workspace/site-ui";
import { PageHead } from "@/components/PageHead";
import { EMAIL } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { DEFAULT_LOCALE, getDict } from "@/lib/i18n";

const noindex = { robots: { index: false, follow: true } };
export const imprintMeta = (lang: string) => ({ ...pageMeta(lang, getDict(lang).legal.imprint.metaTitle, getDict(lang).legal.imprint.metaDesc, "/impressum/"), ...noindex });
export const privacyMeta = (lang: string) => ({ ...pageMeta(lang, getDict(lang).legal.privacy.metaTitle, getDict(lang).legal.privacy.metaDesc, "/datenschutz/"), ...noindex });

function Binding({ lang }: { lang: string }) {
  const d = getDict(lang);
  return lang === DEFAULT_LOCALE ? null : <p><em>{d.legal.authoritative}</em></p>;
}

export function ImprintView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.legal.imprint;
  return (
    <>
      <PageHead eyebrow={d.legal.eyebrow} title={t.metaTitle} />
      <div className="wrap section section--tight prose">
        <Binding lang={lang} />
        <Notice tone="warning" title={t.noticeTitle} badge={d.ui.badgeWarning}><p>{t.notice}</p></Notice>
        <h2>{t.responsible}</h2>
        <p>Jonas Juchelka</p>
        <h2>{t.contact}</h2>
        <p>{t.email} <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
      </div>
    </>
  );
}

export function PrivacyView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.legal.privacy;
  return (
    <>
      <PageHead eyebrow={d.legal.eyebrow} title={t.metaTitle} />
      <div className="wrap section section--tight prose">
        <Binding lang={lang} />
        <Notice tone="warning" title={t.noticeTitle} badge={d.ui.badgeWarning}><p>{t.notice}</p></Notice>
        <h2>{t.hostingTitle}</h2>
        <p>{t.hosting}</p>
        <h2>{t.notTitle}</h2>
        <ul><li>{t.not1}</li><li>{t.not2}</li><li>{t.not3}</li></ul>
        <h2>{t.translationTitle}</h2>
        <p>{t.translation1}</p>
        <p>{t.translation2}</p>
        <h2>{t.privateTitle}</h2>
        <p>{t.private}</p>
      </div>
    </>
  );
}
