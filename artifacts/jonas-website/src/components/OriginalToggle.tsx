"use client";

// Übersetzter Essay: Hinweis und ein Button, der zwischen Übersetzung und Original umschaltet.
// Beide Fassungen stehen im HTML (data-v="tr" und data-v="orig"); ohne JavaScript bleibt die Übersetzung sichtbar.
import { useEffect, useRef, useState } from "react";

export function OriginalToggle({ note, showOriginal, showTranslation }: { note: string; showOriginal: string; showTranslation: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [orig, setOrig] = useState(false);
  useEffect(() => {
    const article = ref.current?.closest("article");
    article?.querySelectorAll<HTMLElement>("[data-v]").forEach((el) => { el.hidden = (el.dataset.v === "orig") !== orig; });
  }, [orig]);
  return (
    <div className="atrans" ref={ref}>
      <p>{note}</p>
      <button type="button" className="btn" aria-pressed={orig} onClick={() => setOrig((o) => !o)}>
        {orig ? showTranslation : showOriginal}
      </button>
    </div>
  );
}
