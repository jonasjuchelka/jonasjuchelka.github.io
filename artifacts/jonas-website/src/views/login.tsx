import Link from "next/link";
import { Notice } from "@workspace/site-ui";
import { BrandLogo } from "@/components/BrandLogo";
import { privateAppOrigin } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { getDict, localePath } from "@/lib/i18n";

export const loginMeta = (lang: string) => ({ ...pageMeta(lang, getDict(lang).login.metaTitle, getDict(lang).login.metaDesc, "/login/"), robots: { index: false, follow: true } });

// Login: eine ruhige Karte mit Logo, einem Satz, dem Passkey-Button (Hauptaktion) und dem Weg zurück zur Startseite.
// Nur die Markenschriften, keine technische Adresse, kein Monospace. Die drei Fakten stehen klein darunter.
const ICONS = {
  key: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3M12 14.5v2",
  mail: "M3.5 6.5h17v11h-17zM3.5 7.5l8.5 6 8.5-6",
  shield: "M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z",
};

export function LoginView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.login;
  const origin = privateAppOrigin();
  const facts = [
    { icon: ICONS.key, bold: t.fact1Bold, text: t.fact1 },
    { icon: ICONS.mail, bold: t.fact2Bold, text: t.fact2 },
    { icon: ICONS.shield, bold: t.fact3Bold, text: t.fact3 },
  ];
  return (
    <div className="wrap login">
      <section className="login__card" aria-labelledby="login-h">
        <BrandLogo className="login__logo" />
        <p className="cv-label">{t.eyebrow}</p>
        <h1 id="login-h" className="h-bar">{t.title}</h1>
        <p className="login__lede">{t.lede}</p>
        {origin ? (
          <p className="login__act">
            <a href={`${origin}/login`} className="btn btn--primary" data-testid="link-private-login">{t.button}</a>
            <Link href={localePath(lang, "/")} className="btn" data-testid="link-login-home">{t.backHome}</Link>
          </p>
        ) : (
          <>
            <Notice tone="warning" title={t.notReadyTitle} badge={d.ui.badgeWarning}><p>{t.notReady}</p></Notice>
            <p className="login__act"><Link href={localePath(lang, "/")} className="btn">{t.backHome}</Link></p>
          </>
        )}
      </section>
      <ul className="login__facts">
        {facts.map((f) => (
          <li key={f.bold}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={f.icon} /></svg>
            <span><span className="login__fb">{f.bold}</span> {f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
