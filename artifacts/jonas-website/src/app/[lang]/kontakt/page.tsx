import { ContactView, contactMeta } from "@/views/contact";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return contactMeta((await params).lang); }
export default async function Page({ params }: P) { return <ContactView lang={(await params).lang} />; }
