import { ImprintView, imprintMeta } from "@/views/legal";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return imprintMeta((await params).lang); }
export default async function Page({ params }: P) { return <ImprintView lang={(await params).lang} />; }
