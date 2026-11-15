// Pictograms for the home page. Decorative only (aria-hidden); colours come from CSS classes and tokens.
// See docs/style-guide.md, section "Startseite".
import type { ReactNode } from "react";

/** Icons for the "Auf einen Blick" facts, in the order of home.spec in the dictionary. */
const FACT_ICONS: ReactNode[] = [
  // Aktuell
  <><path d="M19 12a7 7 0 1 1-2.6-5.4" /><path d="M19.5 4v4.5H15" /></>,
  // Studium
  <><path d="M2.5 9.5 12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c1.5 1.4 3.4 2 5.5 2s4-.6 5.5-2v-4.5" /><path d="M21.5 9.5V15" /></>,
  // Vertiefung
  <><rect x="6.5" y="6.5" width="11" height="11" rx="2" /><rect x="10" y="10" width="4" height="4" rx=".5" /><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" /></>,
  // Austausch
  <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.5 3.8 5.3 3.8 8.5s-1.2 6-3.8 8.5c-2.6-2.5-3.8-5.3-3.8-8.5S9.4 6 12 3.5" /></>,
];

export function FactIcon({ index }: { index: number }) {
  return (
    <span className="glance__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">{FACT_ICONS[index] ?? <circle cx="12" cy="12" r="4" />}</svg>
    </span>
  );
}

/** One small scene per project, keyed by slug. Unknown slugs get a neutral shape. */
const PROJECT_ART: Record<string, ReactNode> = {
  // One block, fed back into itself.
  "trm-keras": (
    <>
      <path className="a-line" d="M52 104h62M206 104h62" />
      <path className="a-line" d="M256 96l12 8-12 8" />
      <path className="a-soft" d="M236 104V48H160v24" />
      <path className="a-soft" d="M152 62l8 12 8-12" />
      <rect className="a-fill" x="114" y="76" width="92" height="56" rx="14" />
      <circle className="a-dot" cx="52" cy="104" r="5" />
      <path className="a-soft" d="M120 150h80M134 162h52" />
    </>
  ),
  // One entry page branching into pages.
  "cloyne-court-wiki": (
    <>
      <path className="a-soft" d="M160 62v22M160 84H76v18M160 84h84v18M160 84v18" />
      <rect className="a-fill" x="124" y="26" width="72" height="36" rx="10" />
      <rect className="a-paper" x="46" y="102" width="60" height="50" rx="10" />
      <rect className="a-paper" x="130" y="102" width="60" height="50" rx="10" />
      <rect className="a-paper" x="214" y="102" width="60" height="50" rx="10" />
      <path className="a-line" d="M60 120h32M60 134h20M144 120h32M144 134h20M228 120h32M228 134h20" />
    </>
  ),
  // Something growing.
  "future-founders-initiative": (
    <>
      <path className="a-soft" d="M50 148h220" />
      <rect className="a-paper" x="70" y="112" width="40" height="36" rx="8" />
      <rect className="a-paper" x="140" y="86" width="40" height="62" rx="8" />
      <rect className="a-fill" x="210" y="56" width="40" height="92" rx="8" />
      <path className="a-line" d="M74 88l66-32 40 12 62-36" />
      <path className="a-line" d="M226 30l16 2-4 16" />
    </>
  ),
};

export function ProjectArt({ slug }: { slug: string }) {
  return (
    <svg className="pcard__art" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
      {PROJECT_ART[slug] ?? (
        <>
          <rect className="a-paper" x="110" y="40" width="100" height="100" rx="22" />
          <rect className="a-fill" x="135" y="65" width="50" height="50" rx="12" />
        </>
      )}
    </svg>
  );
}
