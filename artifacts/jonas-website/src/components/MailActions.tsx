"use client";

import { useState } from "react";

// Die Adresse steht auf der Seite nur als Bild. Erst ein Klick setzt sie zusammen, damit einfache Bots sie nicht im HTML finden.
const parts = ["Jonas", "Juchelka", "gmail", "com"];
const address = () => `${parts[0]}.${parts[1]}${String.fromCharCode(64)}${parts[2]}.${parts[3]}`;

export function MailActions({ t }: { t: { copy: string; copied: string; copyFail: string; write: string } }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const copy = async () => {
    try { await navigator.clipboard.writeText(address()); setState("ok"); } catch { setState("fail"); }
  };
  return (
    <>
      <button type="button" className="btn mail__copy" onClick={copy} aria-live="polite">
        {state === "ok" ? t.copied : state === "fail" ? t.copyFail : t.copy}
      </button>
      <button type="button" className="btn btn--primary mail__write" onClick={() => { window.location.href = `mai${"lto"}:${address()}`; }}>{t.write}</button>
    </>
  );
}
