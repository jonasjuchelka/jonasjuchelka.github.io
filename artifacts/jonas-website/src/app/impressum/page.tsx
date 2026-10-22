import { Notice } from "@workspace/site-ui";
import { PageHead } from "@/components/PageHead";
import { EMAIL } from "@/lib/site";
import { pageMeta } from "@/lib/meta";

export const metadata = { ...pageMeta("Impressum", "Anbieterkennzeichnung, derzeit unvollständig.", "/impressum/"), robots: { index: false, follow: true } };

export default function Impressum() {
  return (
    <>
      <PageHead eyebrow="Rechtliches" title="Impressum" />
      <div className="wrap section section--tight prose">
        <Notice tone="warning" title="Unvollständig: offener Produktionspunkt">
          <p>Eine ladungsfähige Anschrift liegt noch nicht vor und wird hier nicht erfunden. Dieses Impressum ist deshalb noch nicht vollständig.</p>
        </Notice>
        <h2>Verantwortlich</h2>
        <p>Jonas Juchelka</p>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
      </div>
    </>
  );
}
