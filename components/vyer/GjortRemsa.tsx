"use client";

/**
 * Remsan för dagens gjorda.
 *
 * Ligger under heldagsremsan och är byggd likadant: rännilens etikett
 * till vänster, en cell per dag till höger. Skillnaden mot heldagen är
 * att ingenting här har någon varaktighet — raderna staplas i cellen i
 * den ordning de skrevs, och en dag kan bära hur många som helst.
 *
 * INMATNINGEN LIGGER I CELLEN, inte i en panel. Att föra in dagens
 * saker är något man gör fem gånger i rad på tio sekunder, och en
 * dialog per rad hade gjort det till ett ärende. Därför: klicka i
 * cellen, skriv, tryck `⏎` — fältet töms och står kvar, så nästa rad
 * kan skrivas direkt.
 *
 * Kalendern väljs INTE vid inmatningen. Man skriver "Sprungit" och vill
 * inte välja i en rullgardin först; raden får den senast använda
 * kalendern och går att flytta efteråt genom att klicka på den.
 */

import { useEffect, useRef, useState } from "react";
import type { Gjort, Kalender } from "@/lib/typer";
import { arHelg, arSammaDag, nyckel } from "@/lib/tid";
import { gjortPerDag, rensaText } from "@/lib/gjort";

export interface GjortRemsaProps {
  dagar: Date[];
  gjort: Gjort[];
  kalendrar: Kalender[];
  /** Skapar en rad. Kalendern väljs av anroparen. */
  onLagg(datum: string, text: string): void;
  onAndra(g: Gjort): void;
  onTaBort(id: string): void;
}

export default function GjortRemsa({
  dagar,
  gjort,
  kalendrar,
  onLagg,
  onAndra,
  onTaBort,
}: GjortRemsaProps) {
  const nu = new Date();
  const perDag = gjortPerDag(gjort);

  /** Dagen vars inmatningsfält står öppet, eller null. */
  const [skriver, setSkriver] = useState<string | null>(null);
  /** Raden som redigeras, eller null. */
  const [redigerar, setRedigerar] = useState<string | null>(null);

  return (
    <div className="flex shrink-0 gjortremsa">
      <div
        className="shrink-0 border-r border-ink flex items-start justify-end pr-1.5 pt-1"
        style={{ width: "var(--rannil)" }}
      >
        <span className="pico opacity-55">Gjort</span>
      </div>

      <div className="flex-1 flex min-w-0">
        {dagar.map((d) => {
          const dn = nyckel(d);
          const rader = perDag.get(dn) ?? [];
          return (
            <div
              key={dn}
              className="gjortcell dagkolumn flex-1"
              data-helg={arHelg(d) ? "1" : "0"}
              data-idag={arSammaDag(d, nu) ? "1" : "0"}
              /* Ett klick i tomrummet öppnar fältet. Cellen är stor och
                 mest tom, och att kräva att man träffar en liten
                 plusknapp hade gjort den vanligaste handlingen till den
                 svåraste. */
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                setRedigerar(null);
                setSkriver(dn);
              }}
            >
              {rader.map((g) =>
                redigerar === g.id ? (
                  <Falt
                    key={g.id}
                    varde={g.text}
                    kalendrar={kalendrar}
                    vald={g.kalenderId}
                    onKalender={(kalenderId) => onAndra({ ...g, kalenderId })}
                    onKlar={(text) => {
                      setRedigerar(null);
                      // En tömd rad är en raderad rad. Att lämna kvar en
                      // tom ruta i remsan vore att spara ett misstag.
                      if (!text) onTaBort(g.id);
                      else if (text !== g.text) onAndra({ ...g, text });
                    }}
                    onAvbryt={() => setRedigerar(null)}
                  />
                ) : (
                  <button
                    key={g.id}
                    type="button"
                    className="gjortrad"
                    data-ton={
                      kalendrar.find((k) => k.id === g.kalenderId)?.ton ?? 0
                    }
                    onClick={() => {
                      setSkriver(null);
                      setRedigerar(g.id);
                    }}
                    title={`${g.text} — tryck för att ändra`}
                  >
                    {g.text}
                  </button>
                )
              )}

              {skriver === dn ? (
                <Falt
                  varde=""
                  kalendrar={kalendrar}
                  vald={null}
                  onKlar={(text, fortsatt) => {
                    if (text) onLagg(dn, text);
                    // Fältet står kvar efter `⏎`. Man för sällan in EN
                    // sak — man för in dagens.
                    if (!fortsatt || !text) setSkriver(null);
                  }}
                  onAvbryt={() => setSkriver(null)}
                />
              ) : (
                <button
                  type="button"
                  className="gjortplus"
                  onClick={() => {
                    setRedigerar(null);
                    setSkriver(dn);
                  }}
                  aria-label={`Lägg till något gjort ${dn}`}
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fältet i cellen.
 *
 * Äger sin egen text medan man skriver och lämnar den ifrån sig först
 * vid `⏎` eller när fokus försvinner. Escape backar utan att spara —
 * en rad man ångrat mitt i skall inte hamna i remsan bara för att man
 * klickade någon annanstans.
 */
function Falt({
  varde,
  kalendrar,
  vald,
  onKalender,
  onKlar,
  onAvbryt,
}: {
  varde: string;
  kalendrar: Kalender[];
  /** Kalendern raden har, eller null för en ny rad. */
  vald: string | null;
  onKalender?(id: string): void;
  onKlar(text: string, fortsatt?: boolean): void;
  onAvbryt(): void;
}) {
  const [text, setText] = useState(varde);
  const avbruten = useRef(false);
  const faltet = useRef<HTMLInputElement>(null);

  useEffect(() => {
    faltet.current?.focus();
    faltet.current?.select();
  }, []);

  return (
    <span className="gjortfalt">
      <input
        ref={faltet}
        className="falt"
        value={text}
        placeholder="…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const rensad = rensaText(text);
            setText("");
            onKlar(rensad, true);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            avbruten.current = true;
            onAvbryt();
          }
        }}
        onBlur={() => {
          if (avbruten.current) return;
          onKlar(rensaText(text), false);
        }}
        aria-label="Vad gjorde du?"
      />
      {/* Kalendern stegas med en knapp, inte med en rullgardin.
          En rullgardin tar fokus från fältet, och fältets `onBlur`
          hade då sparat och stängt raden mitt i valet — texten man
          just skrivit försvann. `preventDefault` på musnedtryckningen
          gör att knappen aldrig tar fokus alls, och stegandet är
          dessutom samma vokabulär som lappens längd i parkeringen.

          Väljaren finns bara när raden redan finns: på en ny rad hade
          den varit ett val man tvingas göra innan man ens skrivit vad
          det gäller. */}
      {vald !== null && onKalender && kalendrar.length > 0 && (
        <button
          type="button"
          className="knapp pico shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const i = kalendrar.findIndex((k) => k.id === vald);
            onKalender(kalendrar[(i + 1) % kalendrar.length].id);
          }}
          title="Nästa kalender"
        >
          {kalendrar.find((k) => k.id === vald)?.namn ?? "Kalender"} ›
        </button>
      )}
    </span>
  );
}
