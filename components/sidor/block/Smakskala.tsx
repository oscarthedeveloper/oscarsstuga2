"use client";

/**
 * De fyra smakskalorna, som på Vivino.
 *
 * Skalan går från ett ORD till ett annat och aldrig från noll till
 * hundra. Ingen av de fyra har en bra och en dålig ände — ett strävt
 * vin är inte sämre än ett lent — och siffror på axeln hade fått
 * mätaren att läsas som ett betyg.
 *
 * Markören ritas som ett band och inte som ett streck, precis som i
 * förlagan. Bandet är dock alltid lika brett: bredden i förlagan står
 * för en spridning bland tusentals recensioner, och att härma den med
 * ett tal man skattat för hand ur en skärmbild vore påhittad precision.
 * Bandet säger "ungefär här", vilket är sant.
 */

import { SKALOR, type SkalId, type Smakprofil } from "@/lib/sidor/viner";

/** Bandets bredd i procent av spåret. Fast, se förklaringen ovan. */
const BAND = 14;

export default function Smakskala({
  profil,
  onVarde,
  ton = 2,
}: {
  profil: Smakprofil;
  /** Utelämnas i visningsläge. Med den blir spåret ett reglage. */
  onVarde?: (id: SkalId, varde: number | null) => void;
  /** Vinets ton, så att bandet har samma färg som i diagrammen. */
  ton?: number;
}) {
  return (
    <div className="smaktavla">
      {SKALOR.map((s) => {
        const varde = profil[s.id];
        return (
          <div key={s.id} className="smakrad">
            <span className="smakord">{s.vanster}</span>

            <span className="smakspar" data-tomt={varde === null ? "1" : "0"}>
              {varde !== null && (
                <span
                  className="smakband"
                  style={{
                    background: `var(--kal-${ton + 1}-stark, var(--accent))`,
                    left: `${klamProcent(varde)}%`,
                    width: `${BAND}%`,
                  }}
                />
              )}
              {/* Reglaget ligger osynligt ÖVER spåret i stället för att
                  ersätta det. En input[type=range] ritar sitt eget spår
                  i webbläsarens formspråk — rundat, tonat, med en rund
                  knapp — och det hade varit den enda runda saken i hela
                  appen. */}
              {onVarde && (
                <input
                  type="range"
                  className="smakreglage"
                  min={0}
                  max={100}
                  step={1}
                  value={varde ?? 50}
                  onChange={(e) => onVarde(s.id, Number(e.target.value))}
                  aria-label={`${s.vanster} till ${s.hoger}`}
                  aria-valuetext={
                    varde === null
                      ? "Ej ifyllt"
                      : `${varde} av 100, ${s.vanster} till ${s.hoger}`
                  }
                />
              )}
            </span>

            <span className="smakord text-right">{s.hoger}</span>

            {/* Att nolla en skala och att aldrig ha fyllt i den är olika
                saker, och bara det senare går att ångra sig ur. */}
            {onVarde && (
              <button
                type="button"
                className="blockknapp shrink-0"
                onClick={() => onVarde(s.id, varde === null ? 50 : null)}
                aria-label={
                  varde === null
                    ? `Fyll i ${s.vanster} till ${s.hoger}`
                    : `Töm ${s.vanster} till ${s.hoger}`
                }
                title={varde === null ? "Fyll i" : "Töm"}
              >
                {varde === null ? "+" : "✕"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bandets vänsterkant.
 *
 * Klämd så att bandet aldrig hamnar utanför spåret. Ett vin längst ut
 * på skalan skall se ut att ligga längst ut, inte att sticka ut ur
 * ramen.
 */
function klamProcent(varde: number): number {
  return Math.min(100 - BAND, Math.max(0, varde - BAND / 2));
}
