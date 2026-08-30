"use client";

/**
 * Parkeringen i sidopanelen.
 *
 * Det som skall in i kalendern men ännu inte fått en tid. Man skriver en
 * rad, sätter längden med ett tryck, och drar sedan ut lappen i rutnätet
 * när dagen är bestämd.
 *
 * DRAGET ÄGS HELT AV DEN HÄR KOMPONENTEN, och det är inte ett val utan
 * en följd av `setPointerCapture`. Så fort lappen fångar pekaren går
 * varje `pointermove` och `pointerup` till lappen — rutnätets egna
 * hanterare hör aldrig av sig, hur mycket man än drar över dem. Alltså
 * får lappen själv ta reda på vad den svävar över, och det görs med
 * `elementFromPoint` mot ett `data-dagnyckel` i rutnätet. Samma grepp
 * som månadsvyn redan använder när ett block dras mellan två rutor.
 *
 * Alternativet — att inte fånga pekaren och i stället lyssna på fönstret
 * — hade fungerat på skrivbordet och gått sönder på telefonen, där ett
 * finger som lämnar elementet utan fångst slutar ge händelser.
 *
 * Förhandsvisningen ritas däremot INTE här. Den hör hemma i rutnätet, på
 * rätt dag och vid rätt klockslag, och rutnätet är sidopanelens syskon
 * och inte dess barn. Därför skickas läget uppåt till KalenderApp, som
 * äger båda.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Kalender, Lapp } from "@/lib/typer";
import {
  langdText,
  minutUnderPekaren,
  nastaLangd,
  sorteraLappar,
  type Slappmal,
  type Slappning,
} from "@/lib/lappar";

/** Samma tröskel och samma långtryck som blocken i rutnätet. */
const TROSKEL = 4;
const LANGTRYCK = 420;

export interface ParkeringProps {
  lappar: Lapp[];
  kalendrar: Kalender[];
  onSkapa(titel: string): void;
  onAndra(lapp: Lapp): void;
  onTaBort(id: string): void;
  /** Läget under draget, eller null när ingen lapp är i luften. */
  onSlapper(s: Slappning | null): void;
  /** Lappen landade. Anropas bara när pekaren släpptes över en dag. */
  onSlapp(lapp: Lapp, mal: Slappmal): void;
}

/**
 * Vad ligger under pekaren?
 *
 * Rutnätets dagkolumner och månadsvyns rutor bär båda `data-dagnyckel`.
 * Bara dagkolumnen bär dessutom `data-timhojd`, och det är den enda
 * skillnaden som betyder något: med en timhöjd går det att räkna fram
 * ett klockslag, utan den vet man bara vilken dag man siktade på.
 *
 * Läses ur DOM och inte ur React, eftersom draget korsar en gräns som
 * React inte har någon väg över — se filens inledning.
 */
function malUnder(x: number, y: number): Slappmal | null {
  if (typeof document === "undefined") return null;
  const el = document.elementFromPoint(x, y);
  const ruta = el?.closest?.("[data-dagnyckel]") as HTMLElement | null;
  const dagnyckel = ruta?.dataset.dagnyckel;
  if (!ruta || !dagnyckel) return null;

  const timhojd = Number(ruta.dataset.timhojd);
  if (!Number.isFinite(timhojd) || timhojd <= 0) {
    return { dagnyckel, minut: null };
  }
  return {
    dagnyckel,
    minut: minutUnderPekaren(y, ruta.getBoundingClientRect().top, timhojd),
  };
}

export default function Parkering({
  lappar,
  kalendrar,
  onSkapa,
  onAndra,
  onTaBort,
  onSlapper,
  onSlapp,
}: ParkeringProps) {
  const [text, setText] = useState("");
  const [oppen, setOppen] = useState<string | null>(null);

  /* Draget. Allt utom spöket bor i en ref: det ändras vid varje
     pekarrörelse, och ett tillstånd där hade ritat om hela panelen
     sextio gånger i sekunden. */
  const drag = useRef<{
    lapp: Lapp;
    pekare: number;
    el: HTMLElement;
    start: { x: number; y: number };
    aktiv: boolean;
    mal: Slappmal | null;
  } | null>(null);
  const vantande = useRef<{ timer: number } | null>(null);
  /** Spöket som följer pekaren. Null när ingen lapp är i luften. */
  const [spoke, setSpoke] = useState<{
    lapp: Lapp;
    x: number;
    y: number;
    over: boolean;
  } | null>(null);

  const avbryt = useCallback(() => {
    if (vantande.current) {
      window.clearTimeout(vantande.current.timer);
      vantande.current = null;
    }
    const d = drag.current;
    if (d) {
      try {
        if (d.el.hasPointerCapture?.(d.pekare)) {
          d.el.releasePointerCapture(d.pekare);
        }
      } catch {
        // Pekaren kan redan ha försvunnit. Det är inget att göra åt.
      }
      d.el.style.touchAction = "";
    }
    drag.current = null;
    setSpoke(null);
    onSlapper(null);
  }, [onSlapper]);

  /* Escape avbryter draget. Utan det hänger en lapp kvar vid pekaren
     när en systemdialog eller ett fönsterbyte stjäl gesten. */
  useEffect(() => {
    if (!spoke) return;
    const paTangent = (e: KeyboardEvent) => {
      if (e.key === "Escape") avbryt();
    };
    window.addEventListener("keydown", paTangent);
    document.body.classList.add("drar-pagar");
    return () => {
      window.removeEventListener("keydown", paTangent);
      document.body.classList.remove("drar-pagar");
    };
  }, [avbryt, spoke]);

  const paNed = (e: React.PointerEvent, lapp: Lapp) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    const borja = () => {
      drag.current = {
        lapp,
        pekare: e.pointerId,
        el,
        start: { x: e.clientX, y: e.clientY },
        aktiv: e.pointerType !== "mouse",
        mal: null,
      };
    };

    if (e.pointerType === "mouse") {
      el.setPointerCapture(e.pointerId);
      borja();
      return;
    }

    /* Fingret får vänta ut ett långtryck innan det tar över. Utan det
       går listan inte att rulla: varje svep uppåt hade lyft en lapp. */
    const timer = window.setTimeout(() => {
      vantande.current = null;
      el.style.touchAction = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        el.style.touchAction = "";
        return;
      }
      navigator.vibrate?.(12);
      borja();
      setSpoke({ lapp, x: e.clientX, y: e.clientY, over: false });
    }, LANGTRYCK);
    vantande.current = { timer };
  };

  const paRorelse = (e: React.PointerEvent) => {
    if (vantande.current) {
      // Rör sig fingret innan långtrycket gått igenom rullar man listan.
      avbryt();
      return;
    }
    const d = drag.current;
    if (!d) return;

    if (!d.aktiv) {
      const rord =
        Math.abs(e.clientX - d.start.x) > TROSKEL ||
        Math.abs(e.clientY - d.start.y) > TROSKEL;
      if (!rord) return;
      d.aktiv = true;
    }

    const mal = malUnder(e.clientX, e.clientY);
    d.mal = mal;
    setSpoke({ lapp: d.lapp, x: e.clientX, y: e.clientY, over: mal !== null });
    onSlapper({
      id: d.lapp.id,
      titel: d.lapp.titel,
      minuter: d.lapp.minuter,
      ton: kalendrar.find((k) => k.id === d.lapp.kalenderId)?.ton ?? 0,
      mal,
    });
  };

  const paUpp = (e: React.PointerEvent, lapp: Lapp) => {
    if (vantande.current) {
      // Fingret lyftes innan långtrycket: en vanlig tryckning.
      window.clearTimeout(vantande.current.timer);
      vantande.current = null;
      drag.current = null;
      setOppen(oppen === lapp.id ? null : lapp.id);
      return;
    }
    const d = drag.current;
    const mal = d?.aktiv ? d.mal : null;
    const rordes = d?.aktiv ?? false;
    avbryt();
    if (mal) {
      onSlapp(lapp, mal);
      return;
    }
    // Ett drag som aldrig lämnade panelen är ett klick.
    if (!rordes) setOppen(oppen === lapp.id ? null : lapp.id);
  };

  const lagg = () => {
    const t = text.trim();
    if (!t) return;
    onSkapa(t);
    setText("");
  };

  const sorterade = sorteraLappar(lappar);

  return (
    <div className="px-2.5 pb-2 shrink-0 border-t border-[rgb(253_251_239/0.2)] pt-2.5">
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="pico opacity-60">Utan datum</span>
        <span className="pico opacity-40 tabnum">{sorterade.length || ""}</span>
      </div>

      <div className="flex gap-1.5 mb-1.5">
        <input
          className="falt !text-[0.6rem] !py-1"
          placeholder="Träffa Anna…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lagg();
            }
          }}
          aria-label="Ny lapp utan datum"
        />
        <button
          type="button"
          className="knapp pico shrink-0"
          onClick={lagg}
          disabled={text.trim().length === 0}
          aria-label="Lägg till lappen"
        >
          +
        </button>
      </div>

      {sorterade.length === 0 ? (
        <p className="pico opacity-40 leading-relaxed">
          Tomt. Det som skall in i kalendern men ännu inte har en dag hör
          hemma här — dra ut det när dagen är bestämd.
        </p>
      ) : (
        sorterade.map((l) => (
          <div key={l.id}>
            <div
              className="lapp"
              data-oppen={oppen === l.id ? "1" : "0"}
              data-drar={spoke?.lapp.id === l.id ? "1" : "0"}
              onPointerDown={(e) => paNed(e, l)}
              onPointerMove={paRorelse}
              onPointerUp={(e) => paUpp(e, l)}
              onPointerCancel={avbryt}
              role="button"
              tabIndex={0}
              aria-label={`${l.titel || "Utan titel"}, ${langdText(l.minuter)}. Dra ut i kalendern för att boka.`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOppen(oppen === l.id ? null : l.id);
                }
              }}
            >
              <span
                className="lappprick"
                style={{
                  background: `var(--kal-${
                    (kalendrar.find((k) => k.id === l.kalenderId)?.ton ?? 0) + 1
                  }-stark)`,
                }}
                aria-hidden="true"
              />
              <span className="lapptitel">{l.titel || "Utan titel"}</span>
              <span className="pico opacity-45 tabnum shrink-0">
                {langdText(l.minuter)}
              </span>
            </div>

            {oppen === l.id && (
              <div className="lappform">
                <input
                  className="falt !text-[0.6rem] !py-1"
                  value={l.titel}
                  onChange={(e) => onAndra({ ...l, titel: e.target.value })}
                  placeholder="Vad?"
                  aria-label="Lappens text"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* En knapp som stegar slår ett sifferfält här: man
                      sätter längden i förbifarten, och ett fält hade
                      krävt att man siktade, markerade och skrev. */}
                  <button
                    type="button"
                    className="knapp pico"
                    onClick={() =>
                      onAndra({ ...l, minuter: nastaLangd(l.minuter) })
                    }
                    title="Nästa längd"
                  >
                    {langdText(l.minuter)} ›
                  </button>
                  <select
                    className="falt !w-auto !text-[0.6rem] !py-1"
                    value={l.kalenderId}
                    onChange={(e) =>
                      onAndra({ ...l, kalenderId: e.target.value })
                    }
                    aria-label="Kalender"
                  >
                    {kalendrar.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.namn}
                      </option>
                    ))}
                  </select>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="knapp pico"
                    onClick={() => {
                      setOppen(null);
                      onTaBort(l.id);
                    }}
                    aria-label="Ta bort lappen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Spöket. Ligger fast i fönstret och tar inga pekarhändelser —
          annars hade `elementFromPoint` träffat spöket i stället för
          rutnätet under det, och lappen aldrig hittat en dag. */}
      {spoke && (
        <div
          className="lappspoke"
          data-over={spoke.over ? "1" : "0"}
          style={{ left: spoke.x, top: spoke.y }}
          aria-hidden="true"
        >
          {spoke.lapp.titel || "Utan titel"}
          <span className="opacity-50"> · {langdText(spoke.lapp.minuter)}</span>
        </div>
      )}
    </div>
  );
}
