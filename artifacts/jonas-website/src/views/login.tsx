import { Notice } from "@workspace/site-ui";
import { PageHead } from "@/components/PageHead";
import { privateAppOrigin } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { getDict } from "@/lib/i18n";

export const loginMeta = (lang: string) => ({ ...pageMeta(lang, getDict(lang).login.metaTitle, getDict(lang).login.metaDesc, "/login/"), robots: { index: false, follow: true } });

export function LoginView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.login;
  const origin = privateAppOrigin();
  return (
    <>
      <PageHead eyebrow={t.eyebrow} title={t.title}><p>{t.lede}</p></PageHead>
      <div className="wrap section section--tight gateway">
        {origin ? (
          <div className="gateway__card dark">
            <p className="band__eyebrow">{t.continue}</p>
            <p className="gateway__origin">{new URL(origin).host}</p>
            <a href={`${origin}/login`} className="btn btn--primary" data-testid="link-private-login">{t.button}</a>
          </div>
        ) : (
          <Notice tone="warning" title={t.notReadyTitle} badge={d.ui.badgeWarning}>
            <p>{t.notReady}</p>
          </Notice>
        )}
        <ul className="gateway__facts">
          <li><strong>{t.fact1Bold}</strong> {t.fact1}</li>
          <li><strong>{t.fact2Bold}</strong> {t.fact2}</li>
          <li><strong>{t.fact3Bold}</strong> {t.fact3}</li>
        </ul>
      </div>
    </>
  );
}
