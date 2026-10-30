import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getDict, nonDefaultLocales } from "@/lib/i18n";

export const dynamicParams = false;
export const generateStaticParams = () => nonDefaultLocales().map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!nonDefaultLocales().includes(lang)) return {};
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: getDict(lang).meta.description,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    robots: { index: true, follow: true },
  };
}
export const viewport: Viewport = { themeColor: "#1C2B36", colorScheme: "light" };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!nonDefaultLocales().includes(lang)) notFound();
  return <SiteShell lang={lang}>{children}</SiteShell>;
}
