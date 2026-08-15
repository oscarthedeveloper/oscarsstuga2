"use client";

/**
 * Anteckningarna.
 *
 * Uppställningen är lista och skrivyta sida vid sida på en bred skärm,
 * och en i taget på en smal. Att stapla dem på telefonen är inte en
 * nödanpassning: en skrivyta som delar höjd med en lista blir för kort
 * att skriva i, och en lista under ett tangentbord går inte att läsa.
 *
 * LÄNKARNA RENDERAS INTE INNE I TEXTEN. Skrivytan är en vanlig textruta
 * som visar exakt de tecken man skrivit, och kopplingarna räknas ut
 * under den. Alternativet — ett fält som ritar om [[x]] till en klickbar
 * länk medan man skriver — betyder att markören hoppar, att markering
 * beter sig oväntat, och att ångra i fältet slutar fungera. Priset för
 * det är högre än vinsten av att slippa titta en rad längre ned.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Anteckning } from "@/lib/typer";
import { useButik } from "./Butik";
import { sorteraAnteckningar } from "@/lib/butik";
import { byggRegister, hittaLankar, slaUpp, type Mal } from "@/lib/kopplingar";
import Kopplingar from "./Kopplingar";
import { kortDatum, nyckel, startAvDag, tolka } from "@/lib/tid";
import { useMobil } from "@/lib/anvandMedia";
import type { Peka } from "./KalenderApp";

export default function Anteckningar({
  fokusera = 0,
  oppna = null,
  onOppnaMal,
}: {
  /** Räknare som ökar när något utifrån vill skapa en ny anteckning. */
  fokusera?: number;
  /** Anteckning som skall öppnas, t.ex. från en sökträff. */
  oppna?: Peka | null;
  /** En länk pekade på en händelse eller uppgift — vyn äger inte dem. */
  onOppnaMal(mal: Mal): void;
}) {
  const butik = useButik();
  const { anteckningar, kalendrar, kalenderFor } = butik;
  const [vald, setVald] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [fraga, setFraga] = useState("");
  const mobil = useMobil();
  const forsta = useRef(true);

  const kalla = useMemo(
    () => ({
      handelser: butik.handelser,
      uppgifter: butik.uppgifter,
      anteckningar: butik.anteckningar,
    }),
    [butik.handelser, butik.uppgifter, butik.anteckningar]
  );

  const register = useMemo(() => byggRegister(kalla), [kalla]);

  const skapaTom = useCallback(
    (titel = "", datum: string | null = null) => {
      const a = butik.skapaAnteckning({
        titel,
        brodtext: "",
        datum,
        kalenderId: filter ?? kalendrar[0]?.id ?? "arbete",
      });
      setVald(a.id);
      return a;
    },
    [butik, filter, kalendrar]
  );

  // Signalen från bottenradens plusknapp.
  useEffect(() => {
    if (fokusera > 0) skapaTom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fokusera]);

  // En sökträff pekade hit. Beroendet är räknaren och inte id:t, så att
  // samma anteckning går att öppna om efter att man klickat bort den.
  useEffect(() => {
    if (oppna) setVald(oppna.id);
  }, [oppna]);

  const synliga = useMemo(() => {
    const q = fraga.trim().toLowerCase();
    const lista = anteckningar.filter((a) => {
      if (filter && a.kalenderId !== filter) return false;
      if (!q) return true;
      return (
        a.titel.toLowerCase().includes(q) ||
        a.brodtext.toLowerCase().includes(q)
      );
    });
    return sorteraAnteckningar(lista);
  }, [anteckningar, filter, fraga]);

  // Öppna den översta på en bred skärm, så att ytan aldrig står tom.
  // På telefonen görs det INTE: där betyder ett öppet dokument att
  // listan är borta, och att landa i någon annans anteckning är fel.
  useEffect(() => {
    if (!forsta.current || mobil) return;
    if (vald === null && synliga.length > 0) {
      forsta.current = false;
      setVald(synliga[0].id);
    }
  }, [mobil, synliga, vald]);

  const oppen = useMemo(
    () => anteckningar.find((a) => a.id === vald) ?? null,
    [anteckningar, vald]
  );

  /** Går till länkens mål — eller skapar posten om den inte finns. */
  const foljLank = useCallback(
    (titel: string) => {
      const mal = slaUpp(register, titel);
      if (!mal) {
        skapaTom(titel);
        return;
      }
      if (mal.slag === "anteckning") setVald(mal.id);
      else onOppnaMal(mal);
    },
    [register, skapaTom, onOppnaMal]
  );

  const visaLista = !mobil || !oppen;
  const visaText = !mobil || !!oppen;

  return (
    <div className="h-full min-h-0 flex">
      {visaLista && (
        <div
          className={`${
            mobil ? "w-full" : "w-[290px] lg:w-[330px] border-r border-ink"
          } shrink-0 min-h-0 flex flex-col bg-paper`}
        >
          <div className="shrink-0 border-b border-ink p-2.5 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                className="falt"
                placeholder="Sök i anteckningar"
                value={fraga}
                onChange={(e) => setFraga(e.target.value)}
                aria-label="Sök i anteckningar"
              />
              <button
                type="button"
                className="knapp micro shrink-0"
                data-ton="accent"
                onClick={() => skapaTom()}
                aria-label="Ny anteckning"
              >
                {mobil ? "+" : "Ny"}
              </button>
            </div>
            <div className="chiprad items-center">
              <button
                type="button"
                className="knapp pico"
                data-aktiv={filter === null ? "1" : "0"}
                onClick={() => setFilter(null)}
              >
                Alla
              </button>
              {kalendrar.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="knapp pico flex items-center gap-1.5"
                  data-aktiv={filter === k.id ? "1" : "0"}
                  onClick={() => setFilter(filter === k.id ? null : k.id)}
                >
                  <span
                    className="inline-block w-2 h-2 border border-current"
                    style={{ background: `var(--kal-${k.ton + 1})` }}
                  />
                  {k.namn}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto tunnskroll">
            {synliga.length === 0 && (
              <div className="p-6 flex items-center justify-center">
                <div
                  className="cf bg-panel border border-ink px-4 py-3 max-w-[300px]"
                  style={{ ["--cf" as string]: "9px" }}
                >
                  <span className="cf-in" aria-hidden="true" />
                  <p className="micro mb-1.5">
                    {anteckningar.length === 0
                      ? "Inga anteckningar"
                      : "Inget matchar"}
                  </p>
                  <p className="pico opacity-60 leading-[1.8]">
                    {anteckningar.length === 0
                      ? "Tryck Ny för att skriva den första. Skriv [[titel]] för att länka till något annat."
                      : "Pröva ett annat ord eller ta bort filtret."}
                  </p>
                </div>
              </div>
            )}

            {synliga.map((a) => (
              <button
                key={a.id}
                type="button"
                className="anteckning px-2.5 py-2"
                data-nalad={a.nalad ? "1" : "0"}
                data-vald={a.id === vald ? "1" : "0"}
                style={
                  a.id === vald && !mobil
                    ? { boxShadow: "inset 3px 0 0 var(--ink)" }
                    : undefined
                }
                onClick={() => setVald(a.id)}
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="anteckning-titel block truncate">
                      {a.titel || "Utan rubrik"}
                    </span>
                    {a.brodtext.trim() && (
                      <span className="anteckning-utdrag">
                        {a.brodtext.replace(/\[\[([^\]\n]+)\]\]/g, "$1")}
                      </span>
                    )}
                    <span className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="pico opacity-55 flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 border border-ink"
                          style={{
                            background: `var(--kal-${
                              kalenderFor(a.kalenderId).ton + 1
                            })`,
                          }}
                        />
                        {kalenderFor(a.kalenderId).namn}
                      </span>
                      {a.datum && (
                        <span className="pico opacity-55 tabnum">
                          {kortDatum(tolka(a.datum))}
                        </span>
                      )}
                      {hittaLankar(a.brodtext).length > 0 && (
                        <span className="pico opacity-40">
                          ↗ {hittaLankar(a.brodtext).length}
                        </span>
                      )}
                    </span>
                  </span>
                  {a.nalad && (
                    <span className="pico shrink-0 opacity-70" aria-label="Nålad">
                      ▣
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="shrink-0 border-t border-ink px-2.5 py-1.5">
            <span className="pico opacity-60 tabnum">
              {anteckningar.length}{" "}
              {anteckningar.length === 1 ? "anteckning" : "anteckningar"}
            </span>
          </div>
        </div>
      )}

      {visaText && (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-paper">
          {oppen ? (
            <Skrivyta
              key={oppen.id}
              anteckning={oppen}
              mobil={mobil}
              onTillbaka={() => setVald(null)}
              onFoljLank={foljLank}
              onOppnaMal={onOppnaMal}
              onOppnaAnteckning={setVald}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <div
                className="cf bg-panel border border-ink px-4 py-3 max-w-[320px]"
                style={{ ["--cf" as string]: "9px" }}
              >
                <span className="cf-in" aria-hidden="true" />
                <p className="micro mb-1.5">Ingen anteckning vald</p>
                <p className="pico opacity-60 leading-[1.8]">
                  Välj en i listan, eller tryck <b>Ny</b>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================================================================
   SKRIVYTAN
   ================================================================== */

function Skrivyta({
  anteckning,
  mobil,
  onTillbaka,
  onFoljLank,
  onOppnaMal,
  onOppnaAnteckning,
}: {
  anteckning: Anteckning;
  mobil: boolean;
  onTillbaka(): void;
  onFoljLank(titel: string): void;
  onOppnaMal(mal: Mal): void;
  onOppnaAnteckning(id: string): void;
}) {
  const butik = useButik();
  const [form, setForm] = useState<Anteckning>(anteckning);
  const titelRef = useRef<HTMLInputElement | null>(null);

  // Ett nyskapat tomt dokument skall ha markören i rubriken direkt.
  useEffect(() => {
    if (!anteckning.titel && !anteckning.brodtext) titelRef.current?.focus();
  }, [anteckning]);

  /*
   * Sparas medan man skriver, inte på en knapp.
   *
   * Fördröjningen finns för att varje tangenttryckning annars blir en
   * skrivning till localStorage OCH en post i ångra-historiken — och då
   * ångrar ⌘Z ett tecken i taget genom hela texten. En halv sekunds
   * stiltje är ungefär där en mening slutar.
   */
  useEffect(() => {
    if (
      form.titel === anteckning.titel &&
      form.brodtext === anteckning.brodtext &&
      form.kalenderId === anteckning.kalenderId &&
      form.datum === anteckning.datum
    ) {
      return;
    }
    const id = window.setTimeout(() => butik.sparaAnteckning(form), 500);
    return () => window.clearTimeout(id);
  }, [form, anteckning, butik]);

  // Byter någon annan enhet innehållet under pågående skrivning skall
  // det synas — men bara i de fält man inte själv rört.
  useEffect(() => {
    setForm((f) => (f.id === anteckning.id ? f : anteckning));
  }, [anteckning]);

  const satt = (delar: Partial<Anteckning>) =>
    setForm((f) => ({ ...f, ...delar }));

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Verktygsraden */}
      <div className="shrink-0 border-b border-ink px-2.5 py-2 flex flex-col gap-2 bg-paper">
        <div className="flex items-center gap-2">
          {mobil && (
            <button
              type="button"
              className="knapp micro shrink-0"
              onClick={onTillbaka}
              aria-label="Tillbaka till listan"
            >
              ‹
            </button>
          )}
          <input
            ref={titelRef}
            className="falt !border-0 !px-0 display !text-[1.05rem]"
            placeholder="Rubrik"
            value={form.titel}
            onChange={(e) => satt({ titel: e.target.value })}
            aria-label="Rubrik"
          />
          <button
            type="button"
            className="nal"
            data-pa={anteckning.nalad ? "1" : "0"}
            onClick={() => butik.vaxlaNalad(anteckning.id)}
            aria-label={anteckning.nalad ? "Ta bort nålen" : "Nåla överst"}
            aria-pressed={anteckning.nalad}
            title="Nåla överst"
          >
            ▣
          </button>
        </div>

        <div className="chiprad items-center">
          <select
            className="falt !w-auto"
            value={form.kalenderId}
            onChange={(e) => satt({ kalenderId: e.target.value })}
            aria-label="Kalender"
          >
            {butik.kalendrar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namn}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="falt !w-auto tabnum"
            value={form.datum ?? ""}
            onChange={(e) => satt({ datum: e.target.value || null })}
            aria-label="Hör till dagen"
          />
          {!form.datum && (
            <button
              type="button"
              className="knapp pico"
              onClick={() => satt({ datum: nyckel(startAvDag(new Date())) })}
            >
              Idag
            </button>
          )}
          {form.datum && (
            <button
              type="button"
              className="knapp pico"
              onClick={() => satt({ datum: null })}
            >
              Utan dag
            </button>
          )}
          <span className="hidden md:block flex-1" />
          <button
            type="button"
            className="knapp pico"
            onClick={() => {
              if (
                window.confirm(
                  `Radera "${anteckning.titel || "Utan rubrik"}"? Går att ångra med ⌘Z.`
                )
              ) {
                onTillbaka();
                butik.taBortAnteckning(anteckning.id);
              }
            }}
          >
            Radera
          </button>
        </div>
      </div>

      {/* Texten */}
      <div className="flex-1 min-h-0 flex flex-col p-2.5">
        <textarea
          className="skrivyta tunnskroll"
          placeholder={
            "Skriv fritt.\n\nSkriv [[titel]] för att länka till en annan anteckning, en händelse eller en uppgift. Finns den inte kan du skapa den härifrån."
          }
          value={form.brodtext}
          onChange={(e) => satt({ brodtext: e.target.value })}
          aria-label="Brödtext"
        />
      </div>

      {/* Kopplingarna — samma ruta som i händelse- och uppgiftspanelen. */}
      <div className="shrink-0 max-h-[38dvh] overflow-y-auto tunnskroll">
        <div className="px-2.5 pb-2">
          <Kopplingar
            id={anteckning.id}
            titel={anteckning.titel}
            text={form.brodtext}
            onOppnaMal={(mal) =>
              mal.slag === "anteckning" ? onOppnaAnteckning(mal.id) : onOppnaMal(mal)
            }
            onSkapa={onFoljLank}
          />
        </div>
      </div>
    </div>
  );
}
