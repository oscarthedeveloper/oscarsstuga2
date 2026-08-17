"use client";

/**
 * Mappen, för den som inte valt ett omslag.
 *
 * Silhuetten är systemmappens — bakstycke med flik, framstycke över —
 * eftersom det är den formen som säger "mapp" utan att någon behöver
 * lära sig det. Men hörnen är raka och ramen hårfin, och färgen kommer
 * ur hyllans ton i kalenderpaletten.
 *
 * Det är ett medvetet avsteg från förlagan. En rundad, blå systemmapp
 * hade varit trognare macOS och sett ut som en gäst i en app där
 * ingenting annat är rundat — och en mapp som ser lånad ut drar mer
 * uppmärksamhet till sig än den förtjänar.
 */

export default function Mappikon({ ton }: { ton: number }) {
  const yta = `var(--kal-${ton + 1})`;
  const kant = `var(--kal-${ton + 1}-stark)`;

  return (
    <svg
      viewBox="0 0 100 80"
      className="w-[62%] h-auto"
      role="img"
      aria-label="Mapp utan omslag"
    >
      {/* Bakstycket med fliken. */}
      <path
        d="M4 18 L4 8 L38 8 L46 18 L96 18 L96 72 L4 72 Z"
        fill={yta}
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      {/* Framstycket, en aning lägre — det är skuggan mellan de två som
          gör att formen läses som en mapp och inte som en etikett. */}
      <path
        d="M4 26 L96 26 L96 72 L4 72 Z"
        fill={kant}
        fillOpacity="0.35"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
