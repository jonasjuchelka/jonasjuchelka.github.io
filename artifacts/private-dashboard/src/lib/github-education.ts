import type { CategoryId } from "./categories";

/**
 * GitHub Student Developer Pack, offers checked against https://education.github.com/pack on 2026-11-01.
 * Static public information (not per-user), so it lives in code rather than the database.
 *
 * redeem: where to start redeeming.
 *  - Partner pages (heroku.com, datacamp.com, …) were opened and read on 2026-11-01; `source` names the page.
 *  - education.github.com/pack/redeem/<slug> are GitHub's own per-offer pages (visible only when signed in);
 *    slugs taken from GitHub's pack page markup, not individually re-checked while signed in.
 *  - Otherwise the GitHub benefits page.
 * generic: true = the steps are GitHub's general flow, no partner-specific instructions found yet.
 */
export const GH_EDU_CHECKED = "1. November 2026";
export const GH_EDU_REDEEM = "https://github.com/settings/education/benefits";
export const GH_EDU_PACK = "https://education.github.com/pack";

export type EduOffer = {
  id: string;
  name: string;
  category: CategoryId;
  what: string;
  free: string;
  logo?: string;
  redeem: string;
  steps: string[];
  source?: string;
  generic?: boolean;
};

const gh = (slug: string) => `https://education.github.com/pack/redeem/${slug}`;
const GENERIC = [
  "Angebotsseite öffnen, dabei bei GitHub angemeldet sein",
  "„Get access“ bzw. den Link zum Anbieter klicken",
  "Beim Anbieter mit GitHub anmelden, das Angebot wird freigeschaltet",
];
const viaGh = (slug: string): Pick<EduOffer, "redeem" | "steps" | "generic"> => ({ redeem: gh(slug), steps: GENERIC, generic: true });
const viaBenefits: Pick<EduOffer, "redeem" | "steps" | "generic"> = {
  redeem: GH_EDU_REDEEM,
  steps: ["GitHub-Benefits öffnen", "Angebot in der Liste suchen", "Dem Link zum Anbieter folgen und dort mit GitHub anmelden"],
  generic: true,
};

const OFFERS: EduOffer[] = [
  // GitHub
  { id: "github-pro", name: "GitHub Pro", category: "entwicklung", what: "GitHub-Account", free: "Solange Student", logo: "github",
    redeem: gh("github-student-pro"), steps: ["Wird nach der Studenten-Verifizierung automatisch aktiviert", "Prüfen unter GitHub → Settings → Billing"] },
  { id: "copilot", name: "GitHub Copilot", category: "ki", what: "KI-Coding", free: "Student-Plan · Chat begrenzt", logo: "github-copilot",
    redeem: GH_EDU_REDEEM, steps: ["GitHub-Benefits öffnen", "Copilot Student aktivieren", "In VS Code oder JetBrains mit GitHub anmelden"] },
  { id: "codespaces", name: "Codespaces", category: "entwicklung", what: "Cloud-IDE", free: "Pro-Zugang", logo: "github",
    redeem: "https://github.com/codespaces", steps: ["Gilt automatisch mit GitHub Pro", "Repo öffnen → Code → Codespaces → Create"] },
  { id: "github-pages", name: "GitHub Pages", category: "cloud", what: "Static Hosting", free: "1 Seite + Projektseiten", logo: "github",
    redeem: gh("ghpages-student"), steps: ["Repo anlegen", "Settings → Pages → Branch wählen", "Seite ist unter <name>.github.io erreichbar"] },
  { id: "github-desktop", name: "GitHub Desktop", category: "entwicklung", what: "Git-GUI", free: "Immer gratis", logo: "github",
    redeem: "https://desktop.github.com", steps: ["App herunterladen", "Mit GitHub anmelden"] },
  { id: "campus-experts", name: "GitHub Campus Experts", category: "lernen", what: "Community-Programm", free: "Bewerbung", logo: "github",
    redeem: gh("github-campus-experts"), steps: ["Programmseite öffnen", "Bewerbung ausfüllen (Pack muss aktiv sein)"] },

  // Domains
  { id: "namecheap", name: "Namecheap", category: "domains", what: "Domain + SSL", free: ".me + SSL · 1 J.", logo: "namecheap",
    redeem: gh("namecheap-domain-student"), steps: ["Angebotsseite öffnen und zu nc.me weiterleiten lassen", "Mit GitHub autorisieren", "Domain suchen, in den Warenkorb, ohne Zahlung bestellen", "SSL separat über das zweite Namecheap-Angebot"] },
  { id: "name-com", name: "Name.com", category: "domains", what: "Domain", free: ".dev, .app u. a. · 1 J.", logo: "name-com",
    redeem: "https://www.name.com/partner/github-students", source: "https://cs.name.com/hc/en-us/articles/360036364834-Signing-up-for-GitHub-Student-Developer-Pack",
    steps: ["Bei Name.com abgemeldet sein", "Name.com-Angebot öffnen → „Click to login to GitHub“", "Domain suchen, Promo-Code nicht ändern", "Beim Checkout bei Name.com anmelden und abschließen"] },
  { id: "tech", name: ".TECH", category: "domains", what: "Domain", free: ".tech · 1 J.",
    redeem: gh("tech-student"), source: "https://get.tech/blog/github-student-developer-pack/",
    steps: ["Wunschname auf get.tech suchen und in den Warenkorb legen", "Beim Checkout den GitHub-Account bestätigen", "Domain kostet dann 0 €"] },

  // Cloud & Hosting
  { id: "azure", name: "Microsoft Azure", category: "cloud", what: "Cloud", free: "100 $ + 25 Dienste · ab 18", logo: "microsoft-azure",
    redeem: "https://azure.microsoft.com/en-us/free/students/", source: "https://azure.microsoft.com/en-us/developer/students/",
    steps: ["Azure for Students öffnen", "Mit der Uni-Mail registrieren (dient als Nachweis)", "Keine Kreditkarte nötig"] },
  { id: "heroku", name: "Heroku", category: "cloud", what: "App-Hosting", free: "13 $ / Mon. · 24 Mon.", logo: "heroku",
    redeem: "https://www2.heroku.com/github-students/signup", source: "https://www.heroku.com/github-students/",
    steps: ["Heroku-Konto anlegen", "Kredit- oder Debitkarte unter Billing hinterlegen (Pflicht)", "Formular für GitHub-Studenten ausfüllen", "Am besten Anfang des Monats, Guthaben verfällt monatlich"] },
  { id: "appwrite", name: "Appwrite", category: "cloud", what: "Backend + Hosting", free: "Education-Plan · 6 Mon.", logo: "appwrite",
    redeem: "https://appwrite.io/students", source: "https://appwrite.io/students",
    steps: ["Education-Seite öffnen", "Appwrite-Cloud-Konto mit GitHub anlegen", "Plan wird automatisch gesetzt"] },
  { id: "localstack", name: "LocalStack", category: "cloud", what: "AWS lokal", free: "Lizenz", logo: "localstack", ...viaBenefits },
  { id: "camber", name: "Camber", category: "ki", what: "Daten-Agenten, GPU", free: "40 CPU-h + 5 GPU-h / Mon.", ...viaBenefits },
  { id: "pageclip", name: "Pageclip", category: "cloud", what: "Formular-Backend", free: "Basic · solange Student", ...viaGh("pageclip-student") },
  { id: "arduino", name: "Arduino Cloud", category: "cloud", what: "IoT-Cloud", free: "6 Mon. · Hardware-Rabatt", logo: "arduino", ...viaGh("arduino-student") },
  { id: "adafruit", name: "Adafruit IO+", category: "cloud", what: "IoT-Cloud", free: "1 J. · Hardware-Rabatt", logo: "adafruit", ...viaBenefits },
  { id: "zyte", name: "Zyte", category: "cloud", what: "Scraping-Cloud", free: "1 Unit dauerhaft", logo: "zyte", ...viaBenefits },

  // Entwicklung
  { id: "jetbrains", name: "JetBrains", category: "entwicklung", what: "IDEs", free: "Alle · jährlich erneuern", logo: "jetbrains",
    redeem: "https://www.jetbrains.com/student", source: "https://www.jetbrains.com/student",
    steps: ["Antrag für die Studentenlizenz öffnen", "Als Nachweis GitHub wählen und autorisieren", "Lizenz jedes Jahr erneuern"] },
  { id: "vscode", name: "Visual Studio Code", category: "entwicklung", what: "Code-Editor", free: "Coding-Packs", logo: "visual-studio-code", ...viaGh("vscode-student") },
  { id: "vs-dev", name: "Visual Studio Dev Essentials", category: "entwicklung", what: "Microsoft-Dev-Tools", free: "VS Community + Azure", logo: "visual-studio", ...viaGh("microsoftvisualstudio-student") },
  { id: "gitkraken", name: "GitKraken", category: "entwicklung", what: "Git-GUI", free: "6 Mon. · danach -80 %", logo: "gitkraken", ...viaBenefits },
  { id: "gitlens", name: "GitLens", category: "entwicklung", what: "Git in VS Code", free: "6 Mon. · danach -80 %", logo: "gitlens", ...viaBenefits },
  { id: "tower", name: "Tower", category: "entwicklung", what: "Git-GUI", free: "Pro · solange Student", logo: "tower", ...viaBenefits },
  { id: "workingcopy", name: "WorkingCopy", category: "entwicklung", what: "Git (iOS)", free: "Pro · solange Student", ...viaGh("workingcopy-student") },
  { id: "termius", name: "Termius", category: "entwicklung", what: "SSH-Client", free: "Pro + Team · solange Student", logo: "termius",
    redeem: "https://termius.com/education", source: "https://docs.termius.com/help-center/faq/how-can-i-get-termius-for-free-with-github-student-developer-pack",
    steps: ["Warten, bis GitHub dich als Student verifiziert hat (kann Tage dauern)", "Termius-Dashboard → Students öffnen", "GitHub-Account verbinden"] },
  { id: "bootstrap-studio", name: "Bootstrap Studio", category: "entwicklung", what: "Website-Builder", free: "Lizenz · solange Student", logo: "bootstrap", ...viaGh("bootstrapstudio-student") },
  { id: "polypane", name: "Polypane", category: "entwicklung", what: "Dev-Browser", free: "1 J.", ...viaGh("polypane-student") },
  { id: "xojo", name: "Xojo", category: "entwicklung", what: "Cross-Platform-Apps", free: "Pro · solange Student", ...viaGh("xojo-student") },
  { id: "vaadin", name: "Vaadin", category: "entwicklung", what: "Java-Framework", free: "Pro-Lizenz", logo: "vaadin", ...viaGh("vaadin-student") },
  { id: "travis", name: "Travis CI", category: "entwicklung", what: "CI/CD", free: "Private Builds", logo: "travis-ci", ...viaGh("travis-student") },
  { id: "imgbot", name: "Imgbot", category: "entwicklung", what: "Bildoptimierung", free: "Solange Student", logo: "imgbot", ...viaGh("imgbot-student") },
  { id: "stripe", name: "Stripe", category: "entwicklung", what: "Payments", free: "25 $ Gebühren-Guthaben", logo: "stripe", ...viaGh("stripe-student") },
  { id: "devcycle", name: "DevCycle", category: "entwicklung", what: "Feature Flags", free: "Starter · 1 J.", logo: "devcycle", ...viaBenefits },
  { id: "configcat", name: "ConfigCat", category: "entwicklung", what: "Feature Flags", free: "1.000 Flags", logo: "configcat", ...viaGh("configcat-student") },

  // Daten & Datenbanken
  { id: "mongodb", name: "MongoDB", category: "daten", what: "Datenbank", free: "50 $ Atlas + Zertifikat", logo: "mongodb",
    redeem: "https://www.mongodb.com/students", source: "https://www.mongodb.com/students",
    steps: ["Studentenseite öffnen und mit GitHub verifizieren", "Promo-Code in einer Atlas-Organisation einlösen (90 Tage gültig)", "Für Atlas ist Karte oder PayPal nötig", "Zertifikat: Lernpfad auf MongoDB University abschließen"] },
  { id: "deepnote", name: "Deepnote", category: "daten", what: "Notebooks", free: "Team · solange Student", logo: "deepnote", ...viaBenefits },
  { id: "sqlgate", name: "SQLGate", category: "daten", what: "SQL-IDE", free: "Standard · 1 J.", ...viaGh("sqlgate-student") },
  { id: "popsql", name: "PopSQL", category: "daten", what: "SQL-Editor", free: "Premium · solange Student", ...viaBenefits },
  { id: "carto", name: "CARTO", category: "daten", what: "Geodaten", free: "Upgrade · 2 J.", logo: "carto", ...viaGh("cartodb-student") },
  { id: "blockchair", name: "Blockchair", category: "daten", what: "Blockchain-API", free: "100.000 Requests", ...viaGh("blockchair-student") },
  { id: "simpleanalytics", name: "SimpleAnalytics", category: "daten", what: "Web-Analytics", free: "100k Views / Mon. · 1 J.", logo: "simpleanalytics", ...viaGh("simpleanalytics-student") },
  { id: "appfigures", name: "Appfigures", category: "daten", what: "App-Store-Analytics", free: "1 J.", ...viaGh("appfigures-student") },

  // Testing & Monitoring
  { id: "sentry", name: "Sentry", category: "testing", what: "Error-Tracking", free: "50K Errors · 1 J., erneuerbar", logo: "sentry",
    redeem: gh("sentry-student"), source: "https://sentry.io/for/education", steps: GENERIC, generic: true },
  { id: "datadog", name: "Datadog", category: "testing", what: "Monitoring", free: "Pro, 10 Server · 2 J.", logo: "datadog", ...viaGh("datadog-student") },
  { id: "newrelic", name: "New Relic", category: "testing", what: "Monitoring", free: "Solange Student", logo: "new-relic", ...viaBenefits },
  { id: "honeybadger", name: "Honeybadger", category: "testing", what: "Error-Monitoring", free: "Small · 1 J.", logo: "honeybadger", ...viaGh("honeybadger-student") },
  { id: "blackfire", name: "Blackfire", category: "testing", what: "Performance-Profiling", free: "Developer · solange Student", ...viaGh("blackfire-student") },
  { id: "codecov", name: "Codecov", category: "testing", what: "Code-Coverage", free: "Private Repos", logo: "codecov", ...viaGh("codecov-student") },
  { id: "codescene", name: "CodeScene", category: "testing", what: "Code-Qualität", free: "Private Repos", logo: "codescene", ...viaGh("codescene-student") },
  { id: "deepscan", name: "DeepScan", category: "testing", what: "JS-Analyse", free: "6 Mon.", ...viaGh("deepscan-student") },
  { id: "browserstack", name: "BrowserStack", category: "testing", what: "Gerätetests", free: "Automate Mobile · 1 J.", logo: "browserstack", ...viaGh("browserstack-student") },
  { id: "lambdatest", name: "LambdaTest", category: "testing", what: "Browsertests", free: "Live · 1 J.", ...viaGh("lambdatest-student") },
  { id: "requestly", name: "Requestly", category: "testing", what: "API-Mocking", free: "Professional · 1 J.", logo: "requestly", ...viaBenefits },
  { id: "testmail", name: "Testmail", category: "testing", what: "E-Mail-Tests", free: "Essential · solange Student", ...viaBenefits },

  // Sicherheit & Passwörter
  { id: "1password", name: "1Password", category: "sicherheit", what: "Passwortmanager", free: "2 J. · inkl. Dev Tools", logo: "1password",
    redeem: "https://1password.com/developers/students", source: "https://1password.com/developers/students",
    steps: ["Studentenseite öffnen", "„Sign in with GitHub“ klicken (Pack muss verifiziert sein)", "1Password-Konto anlegen, Aktion wird angewendet"] },
  { id: "dashlane", name: "Dashlane", category: "sicherheit", what: "Passwortmanager", free: "Premium · 6 Mon.", logo: "dashlane", ...viaGh("dashlane-student") },
  { id: "doppler", name: "Doppler", category: "sicherheit", what: "Secrets", free: "Team · solange Student", logo: "doppler",
    redeem: "https://www.doppler.com/secretsops-for-students", source: "https://www.doppler.com/secretsops-for-students",
    steps: ["Studentenseite öffnen", "Bei Doppler mit GitHub registrieren", "Team-Plan wird über GitHub Education freigeschaltet"] },
  { id: "clerk", name: "Clerk", category: "sicherheit", what: "Auth, User, Billing", free: "Pro · solange Student", logo: "clerk", ...viaBenefits },
  { id: "astra", name: "AstraSecurity", category: "sicherheit", what: "Firewall, Malware-Scan", free: "6 Mon.", ...viaGh("astra-student") },

  // Lernen
  { id: "datacamp", name: "DataCamp", category: "lernen", what: "Data-Science-Kurse", free: "3 Mon.", logo: "datacamp",
    redeem: "https://www.datacamp.com/github-students", source: "https://support.datacamp.com/hc/en-us/articles/26715178032151-How-to-Get-3-Months-of-Free-Access-to-DataCamp-with-GitHub-Student-Benefits",
    steps: ["DataCamp-Seite für GitHub-Studenten öffnen", "Mit GitHub anmelden, gleiche E-Mail wie bei GitHub", "Checkout für 3 Monate, ohne Zahlung"] },
  { id: "educative", name: "Educative", category: "lernen", what: "Dev-Kurse", free: "6 Mon. · danach -30 %", logo: "educative", ...viaGh("educative-student") },
  { id: "frontendmasters", name: "FrontendMasters", category: "lernen", what: "Frontend-Kurse", free: "6 Mon.", ...viaGh("frontendmasters-student") },
  { id: "bootdev", name: "Boot.dev", category: "lernen", what: "Backend-Kurse", free: "3 Mon.", ...viaBenefits },
  { id: "codedex", name: "Codédex", category: "lernen", what: "Coding-Kurse", free: "Club · 6 Mon.", ...viaBenefits },
  { id: "scrimba", name: "Scrimba", category: "lernen", what: "Frontend-Kurse", free: "1 Mon.", logo: "scrimba", ...viaBenefits },
  { id: "gorails", name: "GoRails", category: "lernen", what: "Rails-Kurse", free: "12 Mon.", ...viaGh("gorails-student") },
  { id: "symfonycasts", name: "SymfonyCasts", category: "lernen", what: "PHP-Kurse", free: "3 Mon.", logo: "symfony", ...viaGh("symfonycasts-student") },
  { id: "algoexpert", name: "AlgoExpert", category: "lernen", what: "Interview-Prep", free: "20 Fragen · 10 % Rabatt", ...viaBenefits },
  { id: "interviewcake", name: "Interview Cake", category: "lernen", what: "Interview-Prep", free: "1 Woche", ...viaGh("interviewcake-student") },

  // Design & Produktivität
  { id: "notion", name: "Notion", category: "design", what: "Notizen, Wiki", free: "Education + mehr KI", logo: "notion", ...viaBenefits },
  { id: "m365", name: "Microsoft 365", category: "design", what: "Office, 1 TB", free: "Gratis oder vergünstigt", logo: "microsoft", ...viaBenefits },
  { id: "visme", name: "Visme", category: "design", what: "Präsentationen", free: "Starter · 3 Mon.", ...viaBenefits },
  { id: "icons8", name: "Icons8", category: "design", what: "Icons, Fotos", free: "3 Mon.", logo: "icons8", ...viaGh("icons8-student") },
  { id: "iconscout", name: "IconScout", category: "design", what: "Icons", free: "60 / Mon. · 1 J.", ...viaGh("iconscout-student") },
  { id: "todiagram", name: "ToDiagram", category: "design", what: "Daten → Diagramm", free: "Pro, ohne KI", ...viaBenefits },
  { id: "pomodone", name: "PomoDone", category: "design", what: "Pomodoro", free: "Lite · 2 J.", ...viaBenefits },
  { id: "hazeover", name: "HazeOver", category: "design", what: "Fokus-App (Mac)", free: "Lizenz", ...viaBenefits },
  { id: "themeisle", name: "Themeisle Neve", category: "design", what: "WordPress-Theme", free: "Agency · 1 J.", logo: "neve", ...viaGh("themeisle-student") },
];

export const GH_EDU_OFFERS: EduOffer[] = OFFERS.sort((a, b) =>
  a.name.replace(/^\./, "").localeCompare(b.name.replace(/^\./, ""), "de"));
