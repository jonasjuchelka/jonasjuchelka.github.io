/** One category per tool. Shared by the tools page, the admin form and the GitHub Education data. */
export const CATEGORIES = [
  { id: "ki", label: "KI" },
  { id: "entwicklung", label: "Entwicklung" },
  { id: "cloud", label: "Cloud & Hosting" },
  { id: "daten", label: "Daten & Datenbanken" },
  { id: "testing", label: "Testing & Monitoring" },
  { id: "sicherheit", label: "Sicherheit & Passwörter" },
  { id: "domains", label: "Domains" },
  { id: "lernen", label: "Lernen" },
  { id: "design", label: "Design & Produktivität" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];
export const categoryLabel = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id)?.label ?? "Ohne Kategorie";
