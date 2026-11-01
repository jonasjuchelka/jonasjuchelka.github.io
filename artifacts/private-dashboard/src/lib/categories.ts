/** One category per tool. Shared by the tools page, the admin form and the GitHub Education data. */
export const CATEGORIES = [
  { id: "ki", label: "KI", short: "KI" },
  { id: "entwicklung", label: "Entwicklung", short: "Entwicklung" },
  { id: "cloud", label: "Cloud & Hosting", short: "Cloud" },
  { id: "daten", label: "Daten & Datenbanken", short: "Daten" },
  { id: "testing", label: "Testing & Monitoring", short: "Testing" },
  { id: "sicherheit", label: "Sicherheit & Passwörter", short: "Sicherheit" },
  { id: "domains", label: "Domains", short: "Domains" },
  { id: "lernen", label: "Lernen", short: "Lernen" },
  { id: "design", label: "Design & Produktivität", short: "Design" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];
export const categoryLabel = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id)?.label ?? "Ohne Kategorie";
export const categoryShort = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id)?.short ?? "";
