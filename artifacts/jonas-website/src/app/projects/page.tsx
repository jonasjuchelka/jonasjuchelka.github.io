import { PageHead } from "@/components/PageHead";
import { ProjectList } from "@/components/ProjectList";
import { getProjects } from "@/lib/content";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("Projekte", "Projekte von Jonas Juchelka mit kurzem, belegtem Kontext.", "/projects/");

export default function Projects() {
  const projects = getProjects();
  return (
    <>
      <PageHead eyebrow="Übersicht" title="Projekte">
        <p>Wenige Projekte, dafür nur mit Angaben, die sich belegen lassen. Wo Ergebnisse nicht freigegeben sind, fehlen sie hier bewusst.</p>
      </PageHead>
      <div className="wrap section section--tight">
        <ProjectList projects={projects} />
      </div>
    </>
  );
}
