/** Logos served from /public/logos (no requests to third parties). See public/logos/NOTICE.md. */
export const LOCAL_LOGOS = ["1password","adafruit","appwrite","arduino","bootstrap","browserstack","clerk","codecov","cursor","dashlane","datacamp","datadog","deepnote","educative","elevenlabs","github-copilot","github","gitkraken","heroku","honeybadger","icons8","jetbrains","microsoft-azure","microsoft","mongodb","namecheap","new-relic","notion","openai","scrimba","sentry","simpleanalytics","stripe","supabase","symfony","termius","tower","travis-ci","vaadin","visual-studio-code","visual-studio","zyte"] as const;

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Turns a stored logo value ("/logos/x.svg", "x" or https://…) into an img src. Empty = no logo. */
export function logoSrc(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("https://")) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return base + v;
  return (LOCAL_LOGOS as readonly string[]).includes(v) ? `${base}/logos/${v}.svg` : "";
}
