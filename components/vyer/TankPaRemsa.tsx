"use client";

import { useEffect, useRef, useState } from "react";
import type { Kalender } from "@/lib/typer";
import type { TankPa } from "@/lib/tank-pa";
import { tankPaPerDag } from "@/lib/tank-pa";
import { arHelg, arSammaDag, nyckel } from "@/lib/tid";

export default function TankPaRemsa({
  dagar,
  rader,
  kalendrar,
  onLagg,
  onAndra,
  onTaBort,
}: {
  dagar: Date[];
  rader: TankPa[];
  kalendrar: Kalender[];
  onLagg(datum: string, text: string): void;
  onAndra(rad: TankPa): void;
  onTaBort(id: string): void;
}) {
  const perDag = tankPaPerDag(rader);
  const [skriver, setSkriver] = useState<string | null>(null);
  const [redigerar, setRedigerar] = useState<string | null>(null);
  const nu = new Date();

  return (
    <div className="flex shrink-0 tankparemsa">
      <div className="shrink-0 border-r border-ink flex items-start justify-end pr-1.5 pt-1" style={{ width: "var(--rannil)" }}>
        <span className="pico opacity-55">Tänk på</span>
      </div>
      <div className="flex-1 flex min-w-0">
        {dagar.map((dag) => {
          const datum = nyckel(dag);
          const dagens = perDag.get(datum) ?? [];
          return (
            <div
              key={datum}
              className="tankpacell dagkolumn flex-1"
              data-helg={arHelg(dag) ? "1" : "0"}
              data-idag={arSammaDag(dag, nu) ? "1" : "0"}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                setRedigerar(null);
                setSkriver(datum);
              }}
            >
              {dagens.map((rad) =>
                redigerar === rad.id ? (
                  <TankPaFalt
                    key={rad.id}
                    varde={rad.text}
                    kalendrar={kalendrar}
                    vald={rad.kalenderId}
                    onKalender={(kalenderId) => onAndra({ ...rad, kalenderId })}
                    onKlar={(text) => {
                      setRedigerar(null);
                      if (!text) onTaBort(rad.id);
                      else if (text !== rad.text) onAndra({ ...rad, text });
                    }}
                    onAvbryt={() => setRedigerar(null)}
                  />
                ) : (
                  <button
                    key={rad.id}
                    type="button"
                    className="tankparad"
                    data-ton={kalendrar.find((k) => k.id === rad.kalenderId)?.ton ?? 0}
                    onClick={() => {
                      setSkriver(null);
                      setRedigerar(rad.id);
                    }}
                    title={`${rad.text} — tryck för att ändra`}
                  >
                    {rad.text}
                  </button>
                )
              )}
              {skriver === datum ? (
                <TankPaFalt
                  varde=""
                  kalendrar={kalendrar}
                  vald={null}
                  onKlar={(text, fortsatt) => {
                    if (text) onLagg(datum, text);
                    if (!fortsatt || !text) setSkriver(null);
                  }}
                  onAvbryt={() => setSkriver(null)}
                />
              ) : (
                <button
                  type="button"
                  className="tankpaplus"
                  onClick={() => {
                    setRedigerar(null);
                    setSkriver(datum);
                  }}
                  aria-label={`Lägg till en påminnelse ${datum}`}
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

function TankPaFalt({
  varde,
  kalendrar,
  vald,
  onKalender,
  onKlar,
  onAvbryt,
}: {
  varde: string;
  kalendrar: Kalender[];
  vald: string | null;
  onKalender?(id: string): void;
  onKlar(text: string, fortsatt?: boolean): void;
  onAvbryt(): void;
}) {
  const [text, setText] = useState(varde);
  const avbruten = useRef(false);
  const falt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    falt.current?.focus();
    falt.current?.select();
  }, []);

  const rensa = (v: string) => v.replace(/\s+/g, " ").trim();
  return (
    <span className="tankpafalt">
      <input
        ref={falt}
        className="falt"
        value={text}
        placeholder="Ta med matsäck …"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const varde = rensa(text);
            setText("");
            onKlar(varde, true);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            avbruten.current = true;
            onAvbryt();
          }
        }}
        onBlur={() => {
          if (!avbruten.current) onKlar(rensa(text), false);
        }}
        aria-label="Vad behöver du tänka på?"
      />
      {vald !== null && onKalender && kalendrar.length > 0 && (
        <button
          type="button"
          className="knapp pico shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const i = Math.max(0, kalendrar.findIndex((k) => k.id === vald));
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
