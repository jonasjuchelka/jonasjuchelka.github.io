import { LoginView, loginMeta } from "@/views/login";
type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P) { return loginMeta((await params).lang); }
export default async function Page({ params }: P) { return <LoginView lang={(await params).lang} />; }
