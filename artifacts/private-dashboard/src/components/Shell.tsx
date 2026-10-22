"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/client";

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/access-guide", label: "Zugangsleitfaden" },
  { href: "/account", label: "Konto" },
  { href: "/admin", label: "Administration" },
];
const PUBLIC_SITE = "https://jonasjuchelka.github.io/";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [out, setOut] = useState(false);
  const bare = path === "/login" || path === "/invite" || path === "/";
  async function logout() {
    setOut(true);
    try { await api("/logout", { method: "POST", body: {} }); } catch { /* still leave */ }
    router.replace("/login");
  }
  return (
    <>
      <a className="skip" href="#main">Zum Inhalt springen</a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={bare ? "/login" : "/tools"} className="mark" aria-label="Privater Bereich, Startseite">
            <span className="mark__text">Privater Bereich</span>
          </Link>
          {!bare ? (
            <nav aria-label="Privater Bereich">
              <ul className="nav">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}>{n.label}</Link>
                  </li>
                ))}
                <li><button className="navbtn" onClick={logout} disabled={out}>{out ? "Abmelden..." : "Abmelden"}</button></li>
              </ul>
            </nav>
          ) : null}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="main">{children}</main>
      <footer className="foot">
        <div className="foot__inner">
          <a href={PUBLIC_SITE}>Zurück zur öffentlichen Website</a>
          <span>Zugang ausschließlich mit Passkeys. Keine Passwörter, keine Tracker.</span>
        </div>
      </footer>
    </>
  );
}
