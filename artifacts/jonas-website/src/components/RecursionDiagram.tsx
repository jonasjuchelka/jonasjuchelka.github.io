/** Schematic: one network, applied T times with the same weights. */
export function RecursionDiagram() {
  return (
    <svg viewBox="0 0 420 280" role="img" aria-labelledby="rd-t rd-d" className="rd">
      <title id="rd-t">Rekursion mit geteilten Gewichten</title>
      <desc id="rd-d">Eine Eingabe x geht in ein Netz f mit Gewichten theta. Der Ausgang h wird T-mal in dasselbe Netz zurückgeführt, danach folgt die Ausgabe.</desc>
      <defs>
        <marker id="rd-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="rd__fill" />
        </marker>
      </defs>
      <text x="20" y="138" className="rd__mono">x</text>
      <path d="M44 133h66" className="rd__line" markerEnd="url(#rd-a)" />
      <rect x="114" y="96" width="116" height="74" rx="4" className="rd__box" />
      <text x="172" y="128" textAnchor="middle" className="rd__mono rd__strong">f</text>
      <text x="172" y="152" textAnchor="middle" className="rd__mono rd__small">geteiltes θ</text>
      <path d="M230 133h56" className="rd__line" markerEnd="url(#rd-a)" />
      <text x="300" y="138" className="rd__mono">ŷ</text>
      <path d="M258 133V52H172V92" className="rd__line rd__loop" markerEnd="url(#rd-a)" />
      <text x="215" y="40" textAnchor="middle" className="rd__mono rd__small">h ← f(x, h)   ×T</text>
      <g className="rd__stack" aria-hidden="true">
        <rect x="114" y="192" width="116" height="9" rx="2" /><rect x="114" y="206" width="116" height="9" rx="2" /><rect x="114" y="220" width="116" height="9" rx="2" />
      </g>
      <text x="114" y="254" className="rd__mono rd__small">3 Schichten → 1 Schicht ×T</text>
    </svg>
  );
}
