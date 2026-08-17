"use client";

/**
 * Trädsidlisten.
 *
 * Hela hyllans innehåll på en gång — mappar och deras blad om vartannat
 * — och inte bara den öppnade mappens blad. Skillnaden är hela poängen
 * med en sidlist: man skall kunna hoppa från "Dativ" till "Starka verb"
 * utan att först backa ut till hyllan. Visade den bara en mapp i taget
 * vore den en innehållsförteckning, inte en navigering.
 *
 * VOKABULÄREN ÄR FILSYSTEMETS: `▸ Namn/` för en mapp, `· Namn` för ett
 * blad. Snedstrecket och triangeln behöver inte läras in, och de gör att
 * de två sorterna går att skilja åt utan färg — vilket är nödvändigt,
 * eftersom orange redan är upptaget av "det här är du".
 *
 * Listen är svart av samma skäl som sidopanelen i kalendern är det: den
 * skall inte konkurrera med dokumentet om uppmärksamheten, bara stå
 * kvar och tala om var man är.
 */

import type { Blad, Mapp } from "@/lib/sidor/sprak";

export default function Bladtrad({
  hyllnamn,
  mappar,
  bladFor,
  oppenMapp,
  oppetBlad,
  onOppnaMapp,
  onOppnaBlad,
  onTillHyllan,
}: {
  hyllnamn: string;
  mappar: Mapp[];
  /** Bladen i en mapp, i ordning. */
  bladFor(mappId: string): Blad[];
  oppenMapp: string | null;
  oppetBlad: string | null;
  onOppnaMapp(id: string): void;
  onOppnaBlad(id: string): void;
  onTillHyllan(): void;
}) {
  return (
    <div className="trad h-full min-h-0 flex flex-col">
      <button
        type="button"
        className="tradhuvud shrink-0"
        onClick={onTillHyllan}
        title="Tillbaka till hyllorna"
        aria-label="Tillbaka till hyllorna"
      >
        <span className="shrink-0" aria-hidden="true">
          ‹
        </span>
        <span className="truncate">{hyllnamn || "Namnlöst"}</span>
        <span className="flex-1" />
        <span className="opacity-70 shrink-0">Bibliotek</span>
      </button>

      <div className="tradlista flex-1 min-h-0 overflow-y-auto tunnskroll">
        {mappar.length === 0 && (
          <p className="tradrad !text-[0.6rem] opacity-50 pl-6">Tom hylla</p>
        )}

        {mappar.map((m) => {
          const bladen = bladFor(m.id);
          const oppen = m.id === oppenMapp;
          return (
            <div key={m.id}>
              <button
                type="button"
                className="tradrad"
                data-slag="mapp"
                data-aktiv={oppen && !oppetBlad ? "1" : "0"}
                onClick={() => onOppnaMapp(m.id)}
              >
                <span className="tradmarke" aria-hidden="true">
                  {oppen ? "▾" : "▸"}
                </span>
                <span className="truncate">{m.titel || "Namnlös"}/</span>
              </button>

              {/* Bladen visas bara under den öppna mappen. Alla blad i
                  alla mappar på en gång blir en vägg där man inte hittar
                  någonting — trädet fälls ut där man är. */}
              {oppen &&
                bladen.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="tradrad"
                    data-slag="blad"
                    data-aktiv={b.id === oppetBlad ? "1" : "0"}
                    onClick={() => onOppnaBlad(b.id)}
                    style={{ paddingLeft: "1.2rem" }}
                  >
                    <span className="tradmarke" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate">
                      {b.titel || "Namnlöst"}
                      {b.utkast && (
                        <span className="opacity-40"> ·utkast</span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
