// Logo in der Kopfleiste mit Schreib-Animation: erst "Jonas" (Tinte aus dem Schriftzug, schneller),
// dann kommt das große J von rechts und wird dabei in einem Zug geschrieben. Siehe docs/style-guide.md, Logo.
// Die Formen sind die Originalpfade (BrandLogo, Schriftzug); nichts davon wird neu gezeichnet.
import type { CSSProperties } from "react";
import { PATHS } from "./BrandLogo";
import { NAME, NAME_INK } from "./Schriftzug";

// Schreibweg des großen J (Mitte des Strichs): linke Spitze, über den Bogen oben, Schaft, Schweif links unten.
const J_PATH = "M364 368C312 356 272 318 272 250C272 120 420 18 640 4L814 4L738 14C722 70 692 130 662 200L590 372C470 662 300 700 188 698C70 692 0 630 2 540C5 440 80 386 142 366";
const START = [0, 0.16, 0.32, 0.48, 0.64];

function letterInk(li: number) {
  const ink = NAME_INK.filter((b) => b[0] === li);
  const d0 = Math.min(...ink.map((b) => b[3])), d1 = Math.max(...ink.map((b) => b[3]));
  const k = (li < 4 ? 0.16 : 0.09) / (d1 - d0 + 0.02);
  return ink.map((b, i) => (
    <path key={i} d={b[1]} pathLength={1} strokeWidth={b[2]}
      style={{ "--d": `${(START[li] + (b[3] - d0) * k).toFixed(3)}s`, "--t": `${Math.max(0.006, b[4] * k).toFixed(3)}s` } as CSSProperties} />
  ));
}

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 812.72 695.9" aria-hidden="true" focusable="false">
      <defs>
        {NAME.map((d, i) => <clipPath id={`lg-n-${i}`} key={i}><path d={d} /></clipPath>)}
        <mask id="lg-mask-j" maskUnits="userSpaceOnUse" x="-80" y="-80" width="980" height="860">
          <path className="lg-pen" pathLength={1} d={J_PATH} strokeWidth={124} />
        </mask>
      </defs>
      <g className="lg-word" transform="translate(5.02 -238.54) scale(.7478)">
        {NAME.map((_, i) => <g key={i} clipPath={`url(#lg-n-${i})`} className={`lg-ink${i > 1 ? " lg-go" : ""}`}>{letterInk(i)}</g>)}
      </g>
      <path className="lg-st" d={PATHS[0].d} fill={PATHS[0].fill} />
      <path className="lg-st" d={PATHS[1].d} fill={PATHS[1].fill} />
      <path className="lg-j" mask="url(#lg-mask-j)" d={PATHS[2].d} fill={PATHS[2].fill} />
    </svg>
  );
}
