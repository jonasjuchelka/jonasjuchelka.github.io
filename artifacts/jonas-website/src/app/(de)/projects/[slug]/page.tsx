import { ProjectView, projectMeta, projectSlugs } from "@/views/projects";
export const dynamicParams = false;
export const generateStaticParams = projectSlugs;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return projectMeta("de", (await params).slug); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <ProjectView lang="de" slug={(await params).slug} />; }
