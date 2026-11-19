import Link from "next/link";
import { MailActions } from "@/components/MailActions";
import { BOOKING, GITHUB, LINKEDIN } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { getDict, localePath } from "@/lib/i18n";

export const contactMeta = (lang: string) => pageMeta(lang, getDict(lang).contact.metaTitle, getDict(lang).contact.metaDesc, "/kontakt/");

export function ContactView({ lang }: { lang: string }) {
  const t = getDict(lang).contact;
  return (
    <section className="wrap kontakt">
      <div className="kontakt__text">
        <h1 className="h-bar">{t.title}</h1>
        <div className="mail">
          {/* Adresse als Bild gegen einfache Bots. Kein Klartext im HTML. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mail__img" src="/media/mail.png" alt={t.mailAlt} width={1233} height={118} />
          <MailActions t={t} />
        </div>
        <p className="actions">
          <a className="btn" href={BOOKING} target="_blank" rel="noopener noreferrer">{t.book} <span aria-hidden="true">↗</span></a>
        </p>
        <p className="cv-links">
          <a className="cv-chip" href={LINKEDIN} rel="me noopener noreferrer" target="_blank">LinkedIn <span aria-hidden="true">↗</span></a>
          <a className="cv-chip" href={GITHUB} rel="me noopener noreferrer" target="_blank">GitHub <span aria-hidden="true">↗</span></a>
        </p>
      </div>
      <figure className="kontakt__pic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/fotos/jonas-kontakt.jpg" alt={t.photoAlt} />
      </figure>
      <p className="kontakt__back"><Link className="btn" href={localePath(lang, "/")}>‹ {t.backHome}</Link></p>
    </section>
  );
}
