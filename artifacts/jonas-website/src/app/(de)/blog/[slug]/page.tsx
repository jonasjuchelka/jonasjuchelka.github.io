import { PostView, postMeta, postSlugs } from "@/views/blog";
export const dynamicParams = false;
export const generateStaticParams = postSlugs;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return postMeta("de", (await params).slug); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <PostView lang="de" slug={(await params).slug} />; }
