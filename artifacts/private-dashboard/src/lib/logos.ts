/** Logos served from /public/logos (no requests to third parties). See public/logos/NOTICE.md. */
export const LOCAL_LOGOS = ["1password","adafruit","algoexpert","appfigures","appwrite","arduino","astra","blackfire","blockchair","bootdev","bootstrap","browserstack","camber","carto","clerk","codecov","codedex","codescene","configcat","cursor","dashlane","datacamp","datadog","deepnote","deepscan","devcycle","doppler","educative","elevenlabs","freestyle","frontendmasters","github","github-copilot","gitkraken","gitlens","gorails","hazeover","heroku","honeybadger","icons8","iconscout","imgbot","interviewcake","jetbrains","lambdatest","localstack","microsoft","microsoft-azure","mongodb","name-com","namecheap","neve","new-relic","notion","openai","pageclip","polypane","pomodone","popsql","requestly","scrimba","sentry","simpleanalytics","sqlgate","stripe","supabase","symfony","tech","termius","testmail","todiagram","tower","travis-ci","vaadin","visme","visual-studio","visual-studio-code","workingcopy","xojo","zyte"] as const;

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Turns a stored logo value ("/logos/x.svg", "x" or https://…) into an img src. Empty = no logo. */
export function logoSrc(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("https://")) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return base + v;
  return (LOCAL_LOGOS as readonly string[]).includes(v) ? `${base}/logos/${v}.svg` : "";
}
