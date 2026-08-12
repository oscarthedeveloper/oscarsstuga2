/**
 * Kolofonremsa — heltäckande svart list, papperfärgad mikrotext.
 * Hämtad från Fornsvenska Studielabbet, men sidozonerna är valfria här:
 * en remsa som fylls med text för att den har tre fack blir dekoration,
 * och dekoration som ser ut som information är värre än tom plats.
 */
export default function ColophonStrip({
  left,
  centre,
  right,
}: {
  left?: string;
  centre: string;
  right?: string;
}) {
  const sidor = Boolean(left || right);
  return (
    <div className="h-[26px] shrink-0 bg-ink text-paper flex items-center px-3">
      <span className="pico mx-auto md:hidden">{centre}</span>
      {sidor ? (
        <div className="hidden md:grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          <span className="pico whitespace-nowrap">{left}</span>
          <span className="pico text-center whitespace-nowrap">{centre}</span>
          <span className="pico text-right whitespace-nowrap">{right}</span>
        </div>
      ) : (
        <span className="pico hidden md:block mx-auto whitespace-nowrap">
          {centre}
        </span>
      )}
    </div>
  );
}
