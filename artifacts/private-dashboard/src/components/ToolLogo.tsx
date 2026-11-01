"use client";
import { useEffect, useState } from "react";
import { logoSrc } from "@/lib/logos";

/** Initials for the fallback tile: "GitHub Pages" → "GP", ".TECH" → "T", "Boot.dev" → "B". */
function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 1)).toUpperCase();
}

/** Tool logo from /public/logos (or a stored https address); branded initials tile if none or if it fails. */
export function ToolLogo({ name, logo }: { name: string; logo?: string | null }) {
  const src = logoSrc(logo);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <span className="logo"><img src={src} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /></span>
  ) : (
    <span className="logo logo--letter" aria-hidden="true">{initials(name)}</span>
  );
}
