import type { CategoryId } from "./categories";

/**
 * GitHub Student Developer Pack, offers checked against https://education.github.com/pack on 2026-11-01.
 * Static public information (not per-user), so it lives in code rather than the database.
 *
 * redeem: where to start redeeming. Mostly the partner's own "GitHub students" page; steps were read from
 *   that page on 2026-11-01. Otherwise GitHub's per-offer page (education.github.com/pack/redeem/<slug>,
 *   visible only when signed in).
 * source: an extra guide (partner docs, blog post or GitHub discussion) shown as "Anleitung ansehen".
 * generic: true = no partner-specific steps found; the steps are GitHub's general flow.
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
  { id: "tech", name: ".TECH", category: "domains", what: "Domain", free: ".tech · 1 J.", logo: "tech",
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
  { id: "localstack", name: "LocalStack", category: "cloud", what: "AWS lokal", free: "Lizenz", logo: "localstack",
    redeem: "https://www.localstack.cloud/localstack-for-students", steps: ["Bei GitHub unter Settings → Billing & Licensing prüfen, dass die Education-Vorteile aktiv sind", "Auf der LocalStack-Seite „Link your GitHub“ klicken", "AGB bestätigen, Student-Plan ist aktiv"] },
  { id: "camber", name: "Camber", category: "ki", what: "Daten-Agenten, GPU", free: "40 CPU-h + 5 GPU-h / Mon.", logo: "camber",
    redeem: "https://www.cambercloud.com/github-student-pack", steps: ["Camber-Seite zum Student Pack öffnen", "„Sign up with GitHub“ klicken", "Student-Plan ist danach aktiv"] },
  { id: "pageclip", name: "Pageclip", category: "cloud", what: "Formular-Backend", free: "Basic · solange Student", logo: "pageclip",
    redeem: "https://pageclip.co/github-students", steps: ["Pageclip-Seite für GitHub-Studenten öffnen", "„Signup with GitHub“ klicken", "Basic-Plan ist gratis aktiv"] },
  { id: "arduino", name: "Arduino Cloud", category: "cloud", what: "IoT-Cloud", free: "6 Mon. · Hardware-Rabatt", logo: "arduino",
    redeem: "https://www.arduino.cc/education/github-students/", steps: ["Auf der Arduino-Seite mit dem GitHub-Studentenkonto anmelden", "Rabattcode für das gewünschte Angebot holen", "Code im Arduino-Store beim Checkout eingeben"] },
  { id: "adafruit", name: "Adafruit IO+", category: "cloud", what: "IoT-Cloud", free: "1 J. · Hardware-Rabatt", logo: "adafruit",
    redeem: "https://www.adafruit.com/github-students", steps: ["Adafruit-Konto öffnen → accounts.adafruit.com/services", "„Connect GitHub“ klicken und autorisieren", "IO+ ist dann aktiv, Hardware-Rabatte gelten im Shop"] },
  { id: "zyte", name: "Zyte", category: "cloud", what: "Scraping-Cloud", free: "1 Unit dauerhaft", logo: "zyte",
    redeem: "https://www.zyte.com/scrapy-cloud-student-backpack/", steps: ["„I'm a student, sign me up“ klicken", "Scrapy-Cloud-Konto anlegen", "1 Unit ist dauerhaft gratis"] },

  // Entwicklung
  { id: "jetbrains", name: "JetBrains", category: "entwicklung", what: "IDEs", free: "Alle · jährlich erneuern", logo: "jetbrains",
    redeem: "https://www.jetbrains.com/student", source: "https://www.jetbrains.com/student",
    steps: ["Antrag für die Studentenlizenz öffnen", "Als Nachweis GitHub wählen und autorisieren", "Lizenz jedes Jahr erneuern"] },
  { id: "vscode", name: "Visual Studio Code", category: "entwicklung", what: "Code-Editor", free: "Coding-Packs", logo: "visual-studio-code",
    redeem: "https://visualstudio.microsoft.com/vscode-edu/", steps: ["VS Code ist für alle gratis", "Für Studenten: „VS Code for Education“ öffnen und „Try it now“ klicken", "Lernpfade für Python und JavaScript im Browser, ohne Installation"] },
  { id: "vs-dev", name: "Visual Studio Dev Essentials", category: "entwicklung", what: "Microsoft-Dev-Tools", free: "VS Community + Azure", logo: "visual-studio",
    redeem: "https://visualstudio.microsoft.com/dev-essentials/", steps: ["Dev-Essentials-Seite öffnen", "„Join or access now“ klicken und mit Microsoft-Konto anmelden", "Tools, Azure-Guthaben und Kurse im Dashboard abrufen"] },
  { id: "gitkraken", name: "GitKraken", category: "entwicklung", what: "Git-GUI", free: "6 Mon. · danach -80 %", logo: "gitkraken",
    redeem: "https://help.gitkraken.com/gk-dev/gk-dev-student-pack/", steps: ["Konto auf gitkraken.dev mit GitHub anlegen", "gitkraken.dev/student öffnen und „Start trial“ klicken", "Auf der Abo-Seite bestätigen"] },
  { id: "gitlens", name: "GitLens", category: "entwicklung", what: "Git in VS Code", free: "6 Mon. · danach -80 %", logo: "gitlens",
    redeem: "https://help.gitkraken.com/gk-dev/gk-dev-student-pack/", steps: ["Konto auf gitkraken.dev mit GitHub anlegen", "gitkraken.dev/student öffnen und „Start trial“ klicken", "In VS Code bei GitLens mit demselben Konto anmelden"] },
  { id: "tower", name: "Tower", category: "entwicklung", what: "Git-GUI", free: "Pro · solange Student", logo: "tower",
    redeem: "https://www.git-tower.com/students/github", steps: ["Pack muss aktiv sein", "„Sign In with GitHub“ mit der Pack-E-Mail klicken", "Bestätigungsmail öffnen und Tower-Lizenz anfordern"] },
  { id: "workingcopy", name: "WorkingCopy", category: "entwicklung", what: "Git (iOS)", free: "Pro · solange Student", logo: "workingcopy",
    redeem: "https://workingcopy.app/education/", steps: ["Working Copy auf iPhone/iPad installieren oder aktualisieren", "Auf der Education-Seite den Bestätigungslink antippen", "Mit dem GitHub-Studentenkonto anmelden"] },
  { id: "termius", name: "Termius", category: "entwicklung", what: "SSH-Client", free: "Pro + Team · solange Student", logo: "termius",
    redeem: "https://termius.com/education", source: "https://docs.termius.com/help-center/faq/how-can-i-get-termius-for-free-with-github-student-developer-pack",
    steps: ["Warten, bis GitHub dich als Student verifiziert hat (kann Tage dauern)", "Termius-Dashboard → Students öffnen", "GitHub-Account verbinden"] },
  { id: "bootstrap-studio", name: "Bootstrap Studio", category: "entwicklung", what: "Website-Builder", free: "Lizenz · solange Student", logo: "bootstrap",
    redeem: "https://education.github.com/pack/redeem/bootstrapstudio-student", steps: GENERIC, generic: true },
  { id: "polypane", name: "Polypane", category: "entwicklung", what: "Dev-Browser", free: "1 J.", logo: "polypane",
    redeem: "https://polypane.app/github-students/", steps: ["Pack muss aktiv sein", "Auf der Polypane-Seite „Sign up with GitHub“ klicken", "1 Jahr gratis für nicht-kommerzielle Nutzung"] },
  { id: "xojo", name: "Xojo", category: "entwicklung", what: "Cross-Platform-Apps", free: "Pro · solange Student", logo: "xojo",
    redeem: "https://www.xojo.com/githubstudent/", steps: ["Xojo-Seite für GitHub-Studenten öffnen", "Xojo-Konto anlegen oder anmelden", "Xojo-Pro-Lizenz einlösen"] },
  { id: "vaadin", name: "Vaadin", category: "entwicklung", what: "Java-Framework", free: "Pro-Lizenz", logo: "vaadin",
    redeem: "https://education.github.com/pack/redeem/vaadin-student", steps: ["Angebot im GitHub-Pack öffnen", "Vaadin-Konto anlegen", "Pro-Lizenz wird über den Studentenstatus freigeschaltet"], source: "https://vaadin.com/student-program/", generic: true },
  { id: "travis", name: "Travis CI", category: "entwicklung", what: "CI/CD", free: "Private Builds", logo: "travis-ci",
    redeem: "https://www.travis-ci.com", steps: ["Bei Travis CI mit GitHub anmelden", "Travis erkennt den Studentenstatus automatisch", "Private Builds laufen im Education-Plan"], source: "https://www.travis-ci.com/blog/2014-10-07-free-builds-for-students-github-student-developer-pack/" },
  { id: "imgbot", name: "Imgbot", category: "entwicklung", what: "Bildoptimierung", free: "Solange Student", logo: "imgbot",
    redeem: "https://imgbot.net/github-students/", steps: ["„Install Imgbot“ klicken (GitHub-App)", "Repos auswählen, öffentlich und privat gratis", "Ersten Pull Request von Imgbot mergen"] },
  { id: "stripe", name: "Stripe", category: "entwicklung", what: "Payments", free: "25 $ Gebühren-Guthaben", logo: "stripe",
    redeem: "https://education.github.com/pack/redeem/stripe-student", steps: ["In der GitHub-Benefits-Liste den Stripe-Link öffnen", "Im Stripe-Konto anmelden, Guthaben wird gutgeschrieben", "Führt der Link nur zur Übersicht: GitHub-Support anschreiben"], source: "https://github.com/orgs/community/discussions/171064", generic: true },
  { id: "devcycle", name: "DevCycle", category: "entwicklung", what: "Feature Flags", free: "Starter · 1 J.", logo: "devcycle",
    redeem: "https://devcycle.com/blog/devcycle-joins-github-student-developer-pack", steps: GENERIC, generic: true },
  { id: "configcat", name: "ConfigCat", category: "entwicklung", what: "Feature Flags", free: "1.000 Flags", logo: "configcat",
    redeem: "https://configcat.com/student/", steps: ["Studentenstatus über das GitHub-Pack bestätigt haben", "Bei ConfigCat mit dem GitHub-Konto registrieren", "Student-Plan wird automatisch gesetzt"] },

  // Daten & Datenbanken
  { id: "mongodb", name: "MongoDB", category: "daten", what: "Datenbank", free: "50 $ Atlas + Zertifikat", logo: "mongodb",
    redeem: "https://www.mongodb.com/students", source: "https://www.mongodb.com/students",
    steps: ["Studentenseite öffnen und mit GitHub verifizieren", "Promo-Code in einer Atlas-Organisation einlösen (90 Tage gültig)", "Für Atlas ist Karte oder PayPal nötig", "Zertifikat: Lernpfad auf MongoDB University abschließen"] },
  { id: "deepnote", name: "Deepnote", category: "daten", what: "Notebooks", free: "Team · solange Student", logo: "deepnote",
    redeem: "https://deepnote.com/docs/edu-verification", steps: ["Bei Deepnote mit dem GitHub-Konto registrieren", "Deepnote prüft den Studentenstatus automatisch", "Education-/Team-Plan ist danach aktiv"] },
  { id: "sqlgate", name: "SQLGate", category: "daten", what: "SQL-IDE", free: "Standard · 1 J.", logo: "sqlgate",
    redeem: "https://www.sqlgate.com/student-pack", steps: ["Pack muss aktiv sein", "Auf der SQLGate-Seite „Sign in with GitHub“ klicken", "Lizenz für 1 Jahr wird freigeschaltet"] },
  { id: "popsql", name: "PopSQL", category: "daten", what: "SQL-Editor", free: "Premium · solange Student", logo: "popsql",
    redeem: "https://popsql.com/github-students", steps: ["PopSQL-Seite für GitHub-Studenten öffnen", "„Sign up with GitHub“ klicken", "Hilfe: students@popsql.com"] },
  { id: "carto", name: "CARTO", category: "daten", what: "Geodaten", free: "Upgrade · 2 J.", logo: "carto",
    redeem: "https://education.github.com/pack/redeem/cartodb-student", steps: ["Angebot im GitHub-Pack öffnen", "CARTO-Konto anlegen", "Upgrade wird über den GitHub-Studentenstatus freigeschaltet"], source: "https://carto.com/blog/carto-is-part-of-the-github-student-pack/" },
  { id: "blockchair", name: "Blockchair", category: "daten", what: "Blockchain-API", free: "100.000 Requests", logo: "blockchair",
    redeem: "https://blockchair.com/student-pack", steps: ["Student-Pack-Seite von Blockchair öffnen", "Auf den Button klicken und mit GitHub bestätigen", "Gratis-API-Key kopieren, Doku ist verlinkt"] },
  { id: "simpleanalytics", name: "SimpleAnalytics", category: "daten", what: "Web-Analytics", free: "100k Views / Mon. · 1 J.", logo: "simpleanalytics",
    redeem: "https://dashboard.simpleanalytics.com/students", steps: ["Studentenseite von Simple Analytics öffnen", "„Sign in with GitHub“ klicken", "Registrieren und AGB bestätigen"] },
  { id: "appfigures", name: "Appfigures", category: "daten", what: "App-Store-Analytics", free: "1 J.", logo: "appfigures",
    redeem: "https://appfigures.com/landing/github-student", steps: ["Appfigures-Seite für GitHub-Studenten öffnen", "Mit GitHub anmelden bzw. Konto anlegen", "Analytics ist 1 Jahr gratis freigeschaltet"], generic: true },

  // Testing & Monitoring
  { id: "sentry", name: "Sentry", category: "testing", what: "Error-Tracking", free: "50K Errors · 1 J., erneuerbar", logo: "sentry",
    redeem: "https://sentry.io/for/education/", steps: ["Seite „Sentry for Education“ öffnen", "GitHub-Konto mit Sentry verbinden", "Konto wechselt auf den Education-Plan"], source: "https://blog.sentry.io/github-student-developer-pack/" },
  { id: "datadog", name: "Datadog", category: "testing", what: "Monitoring", free: "Pro, 10 Server · 2 J.", logo: "datadog",
    redeem: "https://education.github.com/pack/redeem/datadog-student", steps: ["Angebot im GitHub-Pack öffnen", "Datadog-Konto über den Link anlegen", "Pro mit 10 Servern läuft 2 Jahre"], source: "https://www.studentos.tech/blog/datadog-student-free-pro-account-github-pack", generic: true },
  { id: "newrelic", name: "New Relic", category: "testing", what: "Monitoring", free: "Solange Student", logo: "new-relic",
    redeem: "https://newrelic.com/students", steps: ["Gratis-New-Relic-Konto anlegen", "Im Konto: Help → New Relic for Students → GitHub Education", "Mit GitHub autorisieren"] },
  { id: "honeybadger", name: "Honeybadger", category: "testing", what: "Error-Monitoring", free: "Small · 1 J.", logo: "honeybadger",
    redeem: "https://education.github.com/pack/redeem/honeybadger", steps: GENERIC, generic: true },
  { id: "blackfire", name: "Blackfire", category: "testing", what: "Performance-Profiling", free: "Developer · solange Student", logo: "blackfire",
    redeem: "https://www.blackfire.io/students/", steps: ["Blackfire-Konto über „Mit GitHub verbinden“ anlegen", "Studentenstatus wird über GitHub erkannt", "Profiler nach der Installationsanleitung einrichten"] },
  { id: "codecov", name: "Codecov", category: "testing", what: "Code-Coverage", free: "Private Repos", logo: "codecov",
    redeem: "https://about.codecov.io/for/education/", steps: ["„Register Now“ klicken", "Bei Codecov mit GitHub anmelden", "Bei Organisationen muss ein Org-Admin Codecov freigeben"] },
  { id: "codescene", name: "CodeScene", category: "testing", what: "Code-Qualität", free: "Private Repos", logo: "codescene",
    redeem: "https://codescene.com/resources/github-students", steps: ["„Create your student account“ klicken", "Region wählen (International oder USA)", "„Set up my trial“ klicken"] },
  { id: "deepscan", name: "DeepScan", category: "testing", what: "JS-Analyse", free: "6 Mon.", logo: "deepscan",
    redeem: "https://deepscan.io/github-student-pack", steps: ["DeepScan-Angebot im GitHub-Pack anklicken", "Auf der DeepScan-Seite „Get the Student Offer“ klicken", "Mit GitHub anmelden"] },
  { id: "browserstack", name: "BrowserStack", category: "testing", what: "Gerätetests", free: "Automate Mobile · 1 J.", logo: "browserstack",
    redeem: "https://www.browserstack.com/github-students", steps: ["BrowserStack-Seite für GitHub-Studenten öffnen", "„Sign Up with GitHub“ klicken", "Abo läuft 1 Jahr"] },
  { id: "lambdatest", name: "LambdaTest", category: "testing", what: "Browsertests", free: "Live · 1 J.", logo: "lambdatest",
    redeem: "https://www.testmuai.com/github-students/", steps: ["Seite für GitHub-Studenten öffnen (LambdaTest heißt jetzt TestMu AI)", "„Sign Up with GitHub“ klicken", "Live-Plan läuft 1 Jahr"] },
  { id: "requestly", name: "Requestly", category: "testing", what: "API-Mocking", free: "Professional · 1 J.", logo: "requestly",
    redeem: "https://requestly.com/github-education/", steps: ["Pack muss genehmigt sein", "Requestly-Seite öffnen → „Sign in with GitHub“ → „Connect with GitHub“", "Bei Requestly mit derselben E-Mail wie bei GitHub anmelden"], source: "https://interceptor-docs.requestly.com/guides/other/claim-your-requestly-github-student-pack-benefit" },
  { id: "testmail", name: "Testmail", category: "testing", what: "E-Mail-Tests", free: "Essential · solange Student", logo: "testmail",
    redeem: "https://education.github.com/pack/redeem/testmail-student", steps: GENERIC, generic: true },

  // Sicherheit & Passwörter
  { id: "1password", name: "1Password", category: "sicherheit", what: "Passwortmanager", free: "2 J. · inkl. Dev Tools", logo: "1password",
    redeem: "https://1password.com/developers/students", source: "https://1password.com/developers/students",
    steps: ["Studentenseite öffnen", "„Sign in with GitHub“ klicken (Pack muss verifiziert sein)", "1Password-Konto anlegen, Aktion wird angewendet"] },
  { id: "dashlane", name: "Dashlane", category: "sicherheit", what: "Passwortmanager", free: "Premium · 6 Mon.", logo: "dashlane",
    redeem: "https://www.dashlane.com/github-students", steps: ["Dashlane-Seite für GitHub-Studenten öffnen (nur ohne bestehendes Dashlane-Konto)", "Studenten-E-Mail eintragen", "„Get Dashlane Premium now“ klicken"] },
  { id: "doppler", name: "Doppler", category: "sicherheit", what: "Secrets", free: "Team · solange Student", logo: "doppler",
    redeem: "https://www.doppler.com/secretsops-for-students", source: "https://www.doppler.com/secretsops-for-students",
    steps: ["Studentenseite öffnen", "Bei Doppler mit GitHub registrieren", "Team-Plan wird über GitHub Education freigeschaltet"] },
  { id: "clerk", name: "Clerk", category: "sicherheit", what: "Auth, User, Billing", free: "Pro · solange Student", logo: "clerk",
    redeem: "https://clerk.com/github-student-developer-pack", steps: ["Clerk-Seite zum Student Pack öffnen", "„Claim now“ klicken und mit GitHub bestätigen", "Pro-Plan im Clerk-Dashboard einem Workspace zuweisen"] },
  { id: "astra", name: "AstraSecurity", category: "sicherheit", what: "Firewall, Malware-Scan", free: "6 Mon.", logo: "astra",
    redeem: "https://www.getastra.com/github-student-developer-pack", steps: ["Astra-Angebot im GitHub-Pack anklicken", "Astra-Konto anlegen oder einloggen", "GitHub-Profil muss öffentlich sein"] },

  // Lernen
  { id: "datacamp", name: "DataCamp", category: "lernen", what: "Data-Science-Kurse", free: "3 Mon.", logo: "datacamp",
    redeem: "https://www.datacamp.com/github-students", source: "https://support.datacamp.com/hc/en-us/articles/26715178032151-How-to-Get-3-Months-of-Free-Access-to-DataCamp-with-GitHub-Student-Benefits",
    steps: ["DataCamp-Seite für GitHub-Studenten öffnen", "Mit GitHub anmelden, gleiche E-Mail wie bei GitHub", "Checkout für 3 Monate, ohne Zahlung"] },
  { id: "educative", name: "Educative", category: "lernen", what: "Dev-Kurse", free: "6 Mon. · danach -30 %", logo: "educative",
    redeem: "https://www.educative.io/github-students", steps: ["Im selben Browser bei Educative und GitHub eingeloggt sein", "Pack muss bereits genehmigt sein", "Auf der Educative-Seite „Claim Offer“ klicken"] },
  { id: "frontendmasters", name: "FrontendMasters", category: "lernen", what: "Frontend-Kurse", free: "6 Mon.", logo: "frontendmasters",
    redeem: "https://master.dev/welcome/github-student-developers/", steps: ["Seite für GitHub-Studenten öffnen (Frontend Masters heißt jetzt Master.dev)", "Gratis-Konto über das Formular anlegen, ohne Kreditkarte", "„Start Learning for Free“ klicken"] },
  { id: "bootdev", name: "Boot.dev", category: "lernen", what: "Backend-Kurse", free: "3 Mon.", logo: "bootdev",
    redeem: "https://education.github.com/pack/redeem/bootdev-student", steps: GENERIC, generic: true },
  { id: "codedex", name: "Codédex", category: "lernen", what: "Coding-Kurse", free: "Club · 6 Mon.", logo: "codedex",
    redeem: "https://www.codedex.io/github-students", steps: ["Codédex-Seite für GitHub-Studenten öffnen", "Über die GitHub-Benefits-Seite einschreiben", "Club-Mitgliedschaft ist 6 Monate aktiv"], generic: true },
  { id: "scrimba", name: "Scrimba", category: "lernen", what: "Frontend-Kurse", free: "1 Mon.", logo: "scrimba",
    redeem: "https://scrimba.com/github-education", steps: ["Scrimba-Seite für GitHub Education öffnen", "Mit GitHub anmelden", "Pro ist 1 Monat gratis"], generic: true },
  { id: "gorails", name: "GoRails", category: "lernen", what: "Rails-Kurse", free: "12 Mon.", logo: "gorails",
    redeem: "https://education.github.com/pack/redeem/gorails", steps: GENERIC, generic: true },
  { id: "symfonycasts", name: "SymfonyCasts", category: "lernen", what: "PHP-Kurse", free: "3 Mon.", logo: "symfony",
    redeem: "https://education.github.com/pack/redeem/symfonycasts-student", steps: GENERIC, generic: true },
  { id: "algoexpert", name: "AlgoExpert", category: "lernen", what: "Interview-Prep", free: "20 Fragen · 10 % Rabatt", logo: "algoexpert",
    redeem: "https://education.github.com/pack/redeem/algoexpert-student", steps: GENERIC, generic: true },
  { id: "interviewcake", name: "Interview Cake", category: "lernen", what: "Interview-Prep", free: "1 Woche", logo: "interviewcake",
    redeem: "https://www.interviewcake.com/github-students", steps: ["Pack muss aktiv sein", "Auf der Interview-Cake-Seite „Sign up with GitHub“ klicken", "Kurs ist 1 Woche freigeschaltet"] },

  // Design & Produktivität
  { id: "notion", name: "Notion", category: "design", what: "Notizen, Wiki", free: "Education + mehr KI", logo: "notion",
    redeem: "https://education.github.com/pack/redeem/notion-student", steps: GENERIC, source: "https://www.notion.com/templates/collections/github-student-developer-pack", generic: true },
  { id: "m365", name: "Microsoft 365", category: "design", what: "Office, 1 TB", free: "Gratis oder vergünstigt", logo: "microsoft",
    redeem: "https://www.microsoft.com/en-us/microsoft-365/college-student-pricing", steps: ["Microsoft-Seite für Studenten öffnen", "Mit der Uni-Mail berechtigt prüfen lassen", "Angebot (gratis oder vergünstigt) auswählen"], generic: true },
  { id: "visme", name: "Visme", category: "design", what: "Präsentationen", free: "Starter · 3 Mon.", logo: "visme",
    redeem: "https://education.github.com/pack", steps: GENERIC, source: "https://taskpanel.io/deal/visme-via-github-student-pack-3-months-of-the-starter-plan-free", generic: true },
  { id: "icons8", name: "Icons8", category: "design", what: "Icons, Fotos", free: "3 Mon.", logo: "icons8",
    redeem: "https://icons8.com/github-students", steps: ["Icons8-Seite für GitHub-Studenten öffnen", "Mit GitHub anmelden", "Abo läuft 3 Monate"], generic: true },
  { id: "iconscout", name: "IconScout", category: "design", what: "Icons", free: "60 / Mon. · 1 J.", logo: "iconscout",
    redeem: "https://iconscout.com/github-students", steps: ["IconScout-Seite für GitHub-Studenten öffnen", "Den Plan „GitHub Student Developer Pack“ beantragen", "60 Premium-Icons pro Monat stehen dann bereit"], source: "https://help.iconscout.com/what-is-iconscout-github-student-developer-pack" },
  { id: "todiagram", name: "ToDiagram", category: "design", what: "Daten → Diagramm", free: "Pro, ohne KI", logo: "todiagram",
    redeem: "https://todiagram.com/education", steps: ["Auf der Education-Seite mit GitHub anmelden und autorisieren", "Im Editor-Fenster den Pack-Button anklicken", "Unter Account → Billing den Student-Plan prüfen"], source: "https://todiagram.com/docs/github-student-developer-pack" },
  { id: "pomodone", name: "PomoDone", category: "design", what: "Pomodoro", free: "Lite · 2 J.", logo: "pomodone",
    redeem: "https://education.github.com/pack/redeem/pomodone-student", steps: GENERIC, generic: true },
  { id: "hazeover", name: "HazeOver", category: "design", what: "Fokus-App (Mac)", free: "Lizenz", logo: "hazeover",
    redeem: "https://hazeover.com/github-students.html", steps: ["Auf der HazeOver-Seite mit GitHub anmelden", "Lizenzschlüssel kopieren", "App laden und Schlüssel unter Settings → About einfügen"] },
  { id: "themeisle", name: "Themeisle Neve", category: "design", what: "WordPress-Theme", free: "Agency · 1 J.", logo: "neve",
    redeem: "https://themeisle.com/github-students/", steps: ["Als Student bei GitHub verifiziert sein", "Auf der Themeisle-Seite „Login with Github“ klicken", "Neve-Agency-Lizenz inkl. 1 Jahr Updates erhalten"] },
];

export const GH_EDU_OFFERS: EduOffer[] = OFFERS.sort((a, b) =>
  a.name.replace(/^\./, "").localeCompare(b.name.replace(/^\./, ""), "de"));
