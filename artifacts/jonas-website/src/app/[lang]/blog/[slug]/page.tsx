import { PostView, postMeta, postSlugs } from "@/views/blog";
import { nonDefaultLocales } from "@/lib/i18n";
type P = { params: Promise<{ lang: string; slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => nonDefaultLocales().flatMap((lang) => postSlugs().map((s) => ({ lang, ...s })));
export async function generateMetadata({ params }: P) { const { lang, slug } = await params; return postMeta(lang, slug); }
export default async function Page({ params }: P) { const { lang, slug } = await params; return <PostView lang={lang} slug={slug} />; }
