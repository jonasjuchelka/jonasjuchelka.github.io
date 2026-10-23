import Link from "next/link";
export default function NotFound() {
  return (
    <section className="narrow">
      <p className="ui-eyebrow">404</p>
      <h1>Diese Seite gibt es hier nicht.</h1>
      <p className="lead">Prüfe die Adresse oder kehre zu deinen Tools zurück.</p>
      <p><Link className="btn" href="/tools">Zu den Tools</Link></p>
    </section>
  );
}
