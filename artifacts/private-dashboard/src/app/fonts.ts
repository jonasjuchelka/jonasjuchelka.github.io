import localFont from "next/font/local";

// Original brand fonts, served locally from lib/design-tokens/fonts (no network requests).
export const heading = localFont({ src: "../../../../lib/design-tokens/fonts/PlusJakartaSans-SemiBold.ttf", weight: "600", style: "normal", variable: "--font-brand-heading", display: "swap" });
export const ui = localFont({ src: "../../../../lib/design-tokens/fonts/Catamaran-Regular.ttf", weight: "400", style: "normal", variable: "--font-brand-ui", display: "swap" });
export const body = localFont({ src: "../../../../lib/design-tokens/fonts/Catamaran-Light.ttf", weight: "300", style: "normal", variable: "--font-brand-body", display: "swap" });
export const accent = localFont({ src: "../../../../lib/design-tokens/fonts/Mukta-Regular.ttf", weight: "400", style: "normal", variable: "--font-brand-accent", display: "swap" });

export const fontVariables = [heading.variable, ui.variable, body.variable, accent.variable].join(" ");
