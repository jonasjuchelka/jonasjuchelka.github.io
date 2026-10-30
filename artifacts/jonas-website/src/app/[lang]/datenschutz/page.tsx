import { PrivacyView, privacyMeta } from "@/views/legal";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return privacyMeta((await params).lang); }
export default async function Page({ params }: P) { return <PrivacyView lang={(await params).lang} />; }
