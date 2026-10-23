import { Eyebrow } from "@workspace/site-ui";
import type { ReactNode } from "react";

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head wrap">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      {children ? <div className="lede">{children}</div> : null}
    </header>
  );
}
