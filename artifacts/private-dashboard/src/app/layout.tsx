import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@workspace/design-tokens/tokens.css";
import "@workspace/site-ui/site-ui.css";
import "./private.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "Privater Bereich – Jonas Juchelka", template: "%s – Privater Bereich" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};
export const viewport: Viewport = { themeColor: "#1c2b36" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
