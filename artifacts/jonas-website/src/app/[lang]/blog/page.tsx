import { BlogView, blogMeta } from "@/views/blog";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return blogMeta((await params).lang); }
export default async function Page({ params }: P) { return <BlogView lang={(await params).lang} />; }
