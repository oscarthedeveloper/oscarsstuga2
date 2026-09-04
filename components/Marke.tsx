/** Ett eget femdelat databas-märke i det nya skalets pastellpalett. */
export default function Marke() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 oscar-marke"
    >
      <rect x="1" y="1" width="13" height="9" rx="4.5" fill="var(--shell-coral)" />
      <rect x="14" y="1" width="13" height="9" rx="4.5" fill="var(--shell-lilac)" />
      <rect x="1" y="10" width="13" height="9" rx="4.5" fill="var(--shell-lime)" />
      <circle cx="20.5" cy="14.5" r="4.5" fill="var(--shell-magenta)" />
      <rect x="1" y="19" width="13" height="8" rx="4" fill="#000" />
    </svg>
  );
}
