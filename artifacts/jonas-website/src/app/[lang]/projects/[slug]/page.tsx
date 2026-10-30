import { ProjectView, projectMeta, projectSlugs } from "@/views/projects";
import { nonDefaultLocales } from "@/lib/i18n";
type P = { params: Promise<{ lang: string; slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => nonDefaultLocales().flatMap((lang) => projectSlugs().map((s) => ({ lang, ...s })));
export async function generateMetadata({ params }: P) { const { lang, slug } = await params; return projectMeta(lang, slug); }
export default async function Page({ params }: P) { const { lang, slug } = await params; return <ProjectView lang={lang} slug={slug} />; }
