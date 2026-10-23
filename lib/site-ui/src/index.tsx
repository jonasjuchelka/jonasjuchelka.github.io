import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="ui-eyebrow">{children}</p>;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "success" | "error"; title: string; children?: ReactNode }) {
  const label = { info: "Hinweis", warning: "Offen", success: "Erledigt", error: "Fehler" }[tone];
  return (
    <div className={`ui-notice ui-notice--${tone}`} role={tone === "error" ? "alert" : "note"}>
      <span className="ui-notice__badge">{label}</span>
      <div>
        <p className="ui-notice__title">{title}</p>
        {children ? <div className="ui-notice__body">{children}</div> : null}
      </div>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="ui-tag">{children}</span>;
}

export function Rule() {
  return <hr className="ui-rule" />;
}
