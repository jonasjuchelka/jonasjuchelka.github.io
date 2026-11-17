// Logo-Feld einer Station: echtes Logo (gleich schwer gemacht über logoBox), sonst ein Linien-Icon, sonst Initialen.
import { MEDIA, logoBox, type CvEntry } from "@/lib/cv-shared";

// Linien-Icons (24er Raster, 1,6px Strich, runde Enden), passend zum Branding. Rein dekorativ.
export const ICONS: Record<string, string> = {
  mic: "M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7",
  target: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.4v1.2",
  briefcase: "M3.5 8h17v11.5h-17zM9 8V5.5h6V8M3.5 13h17",
  heart: "M12 19.5s-7.5-4.6-7.5-10a4.1 4.1 0 0 1 7.5-2.3 4.1 4.1 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10z",
  globe: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z",
  school: "M3 20h18M5 20V10l7-5 7 5v10M10 20v-5h4v5M12 5V2.5h3.5",
  compass: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.5 8.5l-2 5-5 2 2-5z",
  exchange: "M4 8.5h14M14.5 5 18 8.5 14.5 12M20 15.5H6M9.5 12 6 15.5 9.5 19",
  cap: "M2.5 9.5 12 5l9.5 4.5L12 14zM6.5 11.5V16c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2v-4.5M21.5 9.5v5",
  book: "M12 6.5c-2-1.5-4.5-2-8-2v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2zM12 6.5v13",
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  pin: "M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zM12 8.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z",
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS[name] ?? ICONS.briefcase} /></svg>
  );
}

const initials = (t: string) => t.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function LogoTile({ e, size }: { e: Pick<CvEntry, "logo" | "icon" | "title" | "org">; size?: "sm" | "lg" }) {
  const cls = `lt${size ? ` lt--${size}` : ""}`;
  if (e.logo) {
    const box = logoBox(e.logo)?.split(" ");
    return (
      <span className={`${cls} lt--img`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${MEDIA}/logos/${e.logo}`} alt="" loading="lazy" decoding="async" style={box ? { width: box[0], height: box[1] } : undefined} />
      </span>
    );
  }
  if (e.icon) return <span className={`${cls} lt--ico`} aria-hidden="true"><Icon name={e.icon} /></span>;
  return <span className={cls} aria-hidden="true">{initials(e.org || e.title)}</span>;
}
