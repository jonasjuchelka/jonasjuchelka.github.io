import { HomeView, homeMeta } from "@/views/home";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return homeMeta((await params).lang); }
export default async function Page({ params }: P) { return <HomeView lang={(await params).lang} />; }
