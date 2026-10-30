import { ProjectsView, projectsMeta } from "@/views/projects";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return projectsMeta((await params).lang); }
export default async function Page({ params }: P) { return <ProjectsView lang={(await params).lang} />; }
