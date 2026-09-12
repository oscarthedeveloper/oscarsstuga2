/** En liten kalendercell: samma räta linjer och accent som arbetsytan. */
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
      <rect x="0.5" y="0.5" width="27" height="27" fill="var(--paper)" stroke="var(--ink)" />
      <rect x="1" y="1" width="26" height="6" fill="var(--ink)" />
      <path d="M9.5 7v20M18.5 7v20M1 16.5h26" fill="none" stroke="var(--ink)" />
      <rect x="10" y="17" width="8" height="10" fill="var(--accent)" />
    </svg>
  );
}
