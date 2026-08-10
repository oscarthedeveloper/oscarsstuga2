/**
 * Geometriskt märke — en urtavla ritad med samma streckvokabulär som
 * märket på Fornsvenska: rena linjer, ingen fyllning utom visarna, och
 * fyra markeringar i kvartsläge så figuren läses som en klocka även i
 * 24 pixlar.
 */
export default function Marke() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 26 26"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="24"
        height="24"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1"
      />
      <polygon points="13,2.5 15.2,7 10.8,7" fill="var(--ink)" />
      <rect x="12.6" y="12.6" width="0.9" height="0.9" fill="var(--ink)" />
      <line x1="13" y1="13" x2="13" y2="6" stroke="var(--ink)" strokeWidth="1.4" />
      <line x1="13" y1="13" x2="18.5" y2="15.5" stroke="var(--ink)" strokeWidth="1.4" />
      <line x1="1" y1="13" x2="4" y2="13" stroke="var(--ink)" strokeWidth="1" />
      <line x1="22" y1="13" x2="25" y2="13" stroke="var(--ink)" strokeWidth="1" />
      <line x1="13" y1="22" x2="13" y2="25" stroke="var(--ink)" strokeWidth="1" />
    </svg>
  );
}
