"use client";

/**
 * Annat — avdelningen för det som inte går att pressa in i EN kategori.
 *
 * Uppställningen är densamma som i anteckningarna: en kompakt lista till
 * vänster, sidan till höger, och en i taget på telefonen. Sidorna ser
 * olika ut i grunden, men de hänger i samma lista och delar samma ram —
 * det är den listan som gör dem till en avdelning i stället för fyra
 * lösryckta vyer.
 *
 * Listan kommer ur registret och inte ur lagret. En sida finns alltså
 * även innan den fyllts i, och posten skapas först när man skriver
 * något. Ett tomt register vore ett tomt Annat, och en tom post vore en
 * rad i listan som inte går att skilja från en ifylld.
 */

import { useEffect, useState } from "react";
import { useButik } from "./Butik";
import { useMobil } from "@/lib/anvandMedia";
import { SIDOR } from "./sidor/register";

export default function Annat({
  oppnaId = null,
}: {
  /** Sida att öppna direkt, t.ex. från kommandopaletten. */
  oppnaId?: string | null;
}) {
  const butik = useButik();
  const mobil = useMobil();
  /*
   * Startvärdet kommer ur propen, inte ur en effekt.
   *
   * Effekter körs inte vid rendering på servern, och appen är en
   * statisk export — en sida som pekas ut utifrån skulle därför saknas
   * i den första ritningen och tonas in först efter hydreringen. Att
   * sätta den direkt gör att den finns med från början, och tar bort en
   * bildruta där fel sida står på skärmen.
   */
  const [vald, setVald] = useState<string | null>(oppnaId);

  useEffect(() => {
    if (oppnaId) setVald(oppnaId);
  }, [oppnaId]);

  /* På en bred skärm skall ytan aldrig stå tom; på en telefon betyder
     ett öppet dokument att listan är borta, och att landa i en sida man
     inte valt är fel. Samma regel som i anteckningarna. */
  useEffect(() => {
    if (!mobil && vald === null && SIDOR.length > 0) setVald(SIDOR[0].id);
  }, [mobil, vald]);

  const definition = SIDOR.find((s) => s.id === vald) ?? null;
  const visaLista = !mobil || !definition;
  const visaSida = !mobil || !!definition;

  return (
    <div className="h-full min-h-0 flex">
      {visaLista && (
        <div
          className={`${
            mobil ? "w-full" : "w-[228px] lg:w-[260px] border-r border-ink"
          } shrink-0 min-h-0 flex flex-col bg-paper`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto tunnskroll">
            {SIDOR.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sidval"
                data-vald={s.id === vald && !mobil ? "1" : "0"}
                onClick={() => setVald(s.id)}
              >
                <span className="flex items-baseline gap-2">
                  <span className="palett-marke shrink-0" aria-hidden="true">
                    {s.kort}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] leading-snug">
                      {s.titel}
                    </span>
                    <span className="pico opacity-50 block mt-0.5 leading-relaxed">
                      {s.beskrivning}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="shrink-0 border-t border-ink px-2.5 py-1.5">
            <span className="pico opacity-45 leading-relaxed">
              {SIDOR.length} {SIDOR.length === 1 ? "sida" : "sidor"} — nya
              byggs i koden, en komponent per sida
            </span>
          </div>
        </div>
      )}

      {visaSida && (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-paper">
          {definition ? (
            <>
              {mobil && (
                <div className="shrink-0 border-b border-ink px-2.5 py-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    className="knapp micro shrink-0"
                    onClick={() => setVald(null)}
                    aria-label="Tillbaka till listan"
                  >
                    ‹
                  </button>
                  <span className="micro truncate">{definition.titel}</span>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <definition.Komponent
                  sida={butik.sidaMed(definition.id)}
                  spara={(data) => butik.sparaSida(definition.id, data)}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <div
                className="cf bg-panel border border-ink px-4 py-3 max-w-[320px]"
                style={{ ["--cf" as string]: "9px" }}
              >
                <span className="cf-in" aria-hidden="true" />
                <p className="micro mb-1.5">Ingen sida vald</p>
                <p className="pico opacity-60 leading-[1.8]">
                  Välj en i listan till vänster.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
