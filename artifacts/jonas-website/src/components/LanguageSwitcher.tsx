"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LIVE_LANGUAGES, RTL_ENGLISH_NAMES, localePath, stripLocale } from "@/i18n/config";
import type { Dict } from "@/lib/i18n";

type Props = { lang: string; locales: { code: string; name: string }[]; t: Dict["lang"]; endpoint: string | null };
type Status = "idle" | "loading" | "done" | "error";

const MAX_ITEMS = 300;
const MAX_CHARS = 12000;
const LANG_RE = /^[\p{L}\p{M}][\p{L}\p{M} ()'\-]{1,39}$/u;

/** All visible text nodes except the switcher itself, scripts and styles. */
function collectTextNodes(): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const el = n.parentElement;
      if (!el || el.closest("[data-no-translate], script, style, noscript, svg title, svg desc")) return NodeFilter.FILTER_REJECT;
      const v = n.nodeValue ?? "";
      if (!/\p{L}/u.test(v) || /^\s*(https?:\/\/|\S+@\S+\s*$)/.test(v)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

export function LanguageSwitcher({ lang, locales, t, endpoint }: Props) {
  const pathname = usePathname() || "/";
  const rest = stripLocale(pathname);
  const [status, setStatus] = useState<Status>("idle");
  const [target, setTarget] = useState("");
  const originals = useRef(new Map<Text, string>());
  const originalDir = useRef<string>("");

  function restore() {
    originals.current.forEach((v, node) => { node.nodeValue = v; });
    originals.current.clear();
    if (originalDir.current) document.documentElement.dir = originalDir.current;
    setStatus("idle");
  }

  // Client-side navigation renders fresh German/pre-translated text, so a live translation no longer applies.
  useEffect(() => {
    originals.current.clear();
    setStatus("idle");
  }, [pathname]);

  async function translate() {
    const language = target.trim();
    if (!endpoint || !LANG_RE.test(language)) return;
    setStatus("loading");
    try {
      const nodes = collectTextNodes();
      const unique = [...new Set(nodes.map((n) => (n.nodeValue ?? "").trim()))];
      const total = unique.reduce((a, s) => a + s.length, 0);
      if (!unique.length || unique.length > MAX_ITEMS || total > MAX_CHARS) throw new Error("size");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, texts: unique }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { texts?: unknown };
      if (!Array.isArray(data.texts) || data.texts.length !== unique.length || data.texts.some((x) => typeof x !== "string")) throw new Error("shape");
      const translated = data.texts as string[];
      const map = new Map(unique.map((s, i) => [s, translated[i]]));
      originals.current.clear();
      originalDir.current = document.documentElement.dir || "ltr";
      for (const node of nodes) {
        const raw = node.nodeValue ?? "";
        const tr = map.get(raw.trim());
        if (!tr) continue;
        originals.current.set(node, raw);
        node.nodeValue = raw.replace(raw.trim(), () => tr);
      }
      document.documentElement.dir = RTL_ENGLISH_NAMES.includes(language) ? "rtl" : "ltr";
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="lang" data-no-translate>
      <details className="lang__details">
        <summary className="lang__summary" aria-label={t.label}>
          <svg className="lang__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9z" />
          </svg>
          <span>{lang.toUpperCase()}</span>
          <svg className="lang__chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4l4 4 4-4" /></svg>
        </summary>
        <div className="lang__menu">
          <ul className="lang__list" lang="und">
            {locales.map((l) => (
              <li key={l.code}>
                <Link href={localePath(l.code, rest)} hrefLang={l.code} lang={l.code} aria-current={l.code === lang ? "true" : undefined}>{l.name}</Link>
              </li>
            ))}
          </ul>
          {endpoint ? (
            <form className="lang__live" onSubmit={(e) => { e.preventDefault(); void translate(); }}>
              <label htmlFor="live-lang">{t.more}</label>
              <input id="live-lang" list="live-langs" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t.choose} maxLength={40} autoComplete="off" />
              <datalist id="live-langs">{LIVE_LANGUAGES.map((n) => <option key={n} value={n} />)}</datalist>
              <button type="submit" className="btn btn--ghost" disabled={status === "loading" || !LANG_RE.test(target.trim())}>
                {status === "loading" ? t.translating : "OK"}
              </button>
            </form>
          ) : null}
        </div>
      </details>
      {status === "done" || status === "error" ? (
        <div className="live-notice" role={status === "error" ? "alert" : "status"}>
          <span>{status === "error" ? t.error : t.notice}</span>
          {status === "done" ? <button type="button" onClick={restore}>{t.showOriginal}</button> : <button type="button" onClick={() => setStatus("idle")}>×</button>}
        </div>
      ) : null}
    </div>
  );
}
