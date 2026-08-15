"use client";

/**
 * Redigeringspanelen.
 *
 * Panelen är avsiktligt en enda kolumn utan flikar: allt som går att
 * ställa in syns på samma gång. Upprepningsreglerna är den enda delen som
 * viker ut sig, eftersom de flesta händelser inte har någon.
 *
 * När en händelse tillhör en serie frågar panelen ALLTID vad ändringen
 * skall gälla innan den sparar. Att gissa åt användaren här är det
 * snabbaste sättet att förstöra en kalender.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Forekomst,
  Frekvens,
  Handelse,
  Rackvidd,
  Upprepning,
} from "@/lib/typer";
import { TON_NAMN } from "@/lib/typer";
import { useButik } from "./Butik";
import Kopplingar from "./Kopplingar";
import type { Mal } from "@/lib/kopplingar";
import {
  STANDARD_UPPREPNING,
  beskrivUpprepning,
  veckoNummerIManad,
} from "@/lib/upprepning";
import {
  klocka,
  langtDatum,
  minuterTillText,
  nyckel,
  stampel,
  tolka,
  VECKODAGAR_KORT,
} from "@/lib/tid";

const FREKVENSER: { id: Frekvens; namn: string }[] = [
  { id: "ingen", namn: "Upprepas inte" },
  { id: "daglig", namn: "Varje dag" },
  { id: "vardag", namn: "Varje vardag (mån–fre)" },
  { id: "veckovis", namn: "Varje vecka" },
  { id: "manadsvis", namn: "Varje månad" },
  { id: "arlig", namn: "Varje år" },
];

export interface PanelProps {
  /** Förekomsten som redigeras, eller null för en ny händelse. */
  forekomst: Forekomst | null;
  /** Utkast för en ny händelse. */
  utkast: Partial<Handelse> | null;
  onStang(): void;
  /** En [[koppling]] pekade bort härifrån. Skalet äger navigeringen. */
  onOppnaMal(mal: Mal): void;
  /** En [[koppling]] saknade mål och skall bli en ny anteckning. */
  onSkapaLank?(titel: string): void;
}

export default function HandelsePanel({
  forekomst,
  utkast,
  onStang,
  onOppnaMal,
  onSkapaLank,
}: PanelProps) {
  const { kalendrar, sparaHandelse, radera, skapa } = useButik();
  const titelRef = useRef<HTMLInputElement | null>(null);

  const arNy = !forekomst;
  const grund: Handelse = useMemo(() => {
    if (forekomst) {
      // Formuläret arbetar på FÖREKOMSTENS tider, inte på seriens första
      // tillfälle — annars ser användaren fel datum när hen öppnar en
      // upprepad händelse längre fram.
      return {
        ...forekomst.handelse,
        start: stampel(forekomst.start),
        slut: stampel(forekomst.slut),
      };
    }
    return {
      id: "",
      titel: "",
      anteckning: "",
      plats: "",
      start: utkast?.start ?? stampel(new Date()),
      slut: utkast?.slut ?? stampel(new Date()),
      heldag: !!utkast?.heldag,
      kalenderId: utkast?.kalenderId ?? kalendrar[0]?.id ?? "arbete",
      upprepning: null,
      undantag: [],
      avvikelser: {},
      skapad: new Date().toISOString(),
      // Synkfälten sätts på riktigt av butiken när posten sparas; här
      // behöver de bara finnas för att formuläret skall ha en hel post.
      andrad: new Date().toISOString(),
      raderad: null,
      synkad: false,
    };
  }, [forekomst, utkast, kalendrar]);

  const [form, setForm] = useState<Handelse>(grund);
  const [visaRackvidd, setVisaRackvidd] = useState<"spara" | "radera" | null>(
    null
  );

  useEffect(() => setForm(grund), [grund]);

  useEffect(() => {
    const id = window.setTimeout(() => titelRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  const arSerie =
    !!forekomst?.handelse.upprepning &&
    forekomst.handelse.upprepning.frekvens !== "ingen";

  const start = tolka(form.start);
  const slut = tolka(form.slut);
  const langdMin = Math.max(0, Math.round((slut.getTime() - start.getTime()) / 60000));

  const satt = (delar: Partial<Handelse>) =>
    setForm((f) => ({ ...f, ...delar }));

  /** Flyttar slutet med när starten ändras, så längden hålls konstant. */
  const sattStart = (varde: string) => {
    const nyStart = tolka(varde);
    const nySlut = new Date(nyStart.getTime() + langdMin * 60000);
    satt({ start: stampel(nyStart), slut: stampel(nySlut) });
  };

  const sattSlut = (varde: string) => {
    const nySlut = tolka(varde);
    if (nySlut <= start) {
      // Ett slut före starten är alltid ett misstag; lägg det en kvart efter.
      satt({ slut: stampel(new Date(start.getTime() + 15 * 60000)) });
      return;
    }
    satt({ slut: stampel(nySlut) });
  };

  const sattUpprepning = (delar: Partial<Upprepning>) => {
    const bas: Upprepning = form.upprepning ?? {
      ...STANDARD_UPPREPNING,
      veckodagar: [start.getDay()],
    };
    const ny = { ...bas, ...delar };
    satt({ upprepning: ny.frekvens === "ingen" ? null : ny });
  };

  const spara = (rackvidd: Rackvidd) => {
    if (arNy) {
      skapa({ ...form, id: undefined });
    } else {
      sparaHandelse(form, forekomst, rackvidd);
    }
    onStang();
  };

  const utfor = () => {
    if (!arNy && arSerie) {
      setVisaRackvidd("spara");
      return;
    }
    spara("alla");
  };

  const raderaNu = (rackvidd: Rackvidd) => {
    if (forekomst) radera(forekomst, rackvidd);
    onStang();
  };

  const u = form.upprepning;

  return (
    <>
      <div className="panel-overlay" onClick={onStang} />
      <aside
        className="redigeringspanel"
        role="dialog"
        aria-label={arNy ? "Ny händelse" : "Redigera händelse"}
        onKeyDown={(e) => {
          if (e.key === "Escape") onStang();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) utfor();
        }}
      >
        {/* Huvud */}
        <div className="shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between">
          <span className="micro">{arNy ? "Ny händelse" : "Händelse"}</span>
          <button
            type="button"
            onClick={onStang}
            className="micro hover:text-accent transition-colors"
            aria-label="Stäng"
          >
            Stäng ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-3">
          {/* Titel */}
          <input
            ref={titelRef}
            className="falt !text-[0.95rem] !py-2"
            placeholder="Vad gäller saken?"
            value={form.titel}
            onChange={(e) => satt({ titel: e.target.value })}
          />

          {/* Kalender */}
          <div>
            <label className="pico opacity-60 block mb-1">Kalender</label>
            <div className="flex flex-wrap gap-1">
              {kalendrar.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="knapp pico flex items-center gap-1.5"
                  data-aktiv={form.kalenderId === k.id ? "1" : "0"}
                  onClick={() => satt({ kalenderId: k.id })}
                  title={TON_NAMN[k.ton]}
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

          {/* Tid */}
          <div className="border border-ink p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="pico opacity-60">Tid</span>
              <label className="pico flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[color:var(--accent)]"
                  checked={form.heldag}
                  onChange={(e) => {
                    const heldag = e.target.checked;
                    if (heldag) {
                      const d0 = new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        start.getDate()
                      );
                      satt({
                        heldag,
                        start: stampel(d0),
                        slut: stampel(
                          new Date(
                            d0.getFullYear(),
                            d0.getMonth(),
                            d0.getDate() + 1
                          )
                        ),
                      });
                    } else {
                      const d9 = new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        start.getDate(),
                        9
                      );
                      satt({
                        heldag,
                        start: stampel(d9),
                        slut: stampel(new Date(d9.getTime() + 3600000)),
                      });
                    }
                  }}
                />
                Heldag
              </label>
            </div>

            {form.heldag ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="pico opacity-55">Från</span>
                  <input
                    type="date"
                    className="falt tabnum"
                    value={nyckel(start)}
                    onChange={(e) => sattStart(`${e.target.value}T00:00`)}
                  />
                </label>
                <label className="block">
                  <span className="pico opacity-55">Till och med</span>
                  <input
                    type="date"
                    className="falt tabnum"
                    value={nyckel(new Date(slut.getTime() - 60000))}
                    onChange={(e) => {
                      const d = tolka(e.target.value);
                      satt({
                        slut: stampel(
                          new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
                        ),
                      });
                    }}
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <label className="block">
                    <span className="pico opacity-55">Börjar</span>
                    <input
                      type="datetime-local"
                      className="falt tabnum"
                      value={form.start}
                      onChange={(e) => sattStart(e.target.value)}
                    />
                  </label>
                  <span className="pico opacity-55 pb-2 tabnum">
                    {minuterTillText(langdMin)}
                  </span>
                </div>
                <label className="block">
                  <span className="pico opacity-55">Slutar</span>
                  <input
                    type="datetime-local"
                    className="falt tabnum"
                    value={form.slut}
                    onChange={(e) => sattSlut(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="knapp pico"
                      data-aktiv={langdMin === m ? "1" : "0"}
                      onClick={() =>
                        satt({ slut: stampel(new Date(start.getTime() + m * 60000)) })
                      }
                    >
                      {m < 60 ? `${m} min` : `${m / 60} h`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Upprepning */}
          <div className="border border-ink p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="pico opacity-60">Upprepning</span>
              <span className="pico opacity-55 text-right">
                {beskrivUpprepning(u, start)}
              </span>
            </div>

            <select
              className="falt"
              value={u?.frekvens ?? "ingen"}
              onChange={(e) =>
                sattUpprepning({ frekvens: e.target.value as Frekvens })
              }
            >
              {FREKVENSER.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.namn}
                </option>
              ))}
            </select>

            {u && u.frekvens !== "ingen" && (
              <>
                {u.frekvens !== "vardag" && (
                  <label className="flex items-center gap-2">
                    <span className="pico opacity-55 shrink-0">Var</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="falt tabnum !w-16"
                      value={u.intervall}
                      onChange={(e) =>
                        sattUpprepning({
                          intervall: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                    <span className="pico opacity-55">
                      {u.frekvens === "daglig"
                        ? "dag"
                        : u.frekvens === "veckovis"
                        ? "vecka"
                        : u.frekvens === "manadsvis"
                        ? "månad"
                        : "år"}
                    </span>
                  </label>
                )}

                {u.frekvens === "veckovis" && (
                  <div>
                    <span className="pico opacity-55 block mb-1">
                      På dagarna
                    </span>
                    <div className="knapp-rad">
                      {[1, 2, 3, 4, 5, 6, 0].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="knapp pico flex-1"
                          data-aktiv={u.veckodagar.includes(v) ? "1" : "0"}
                          onClick={() => {
                            const har = u.veckodagar.includes(v);
                            const nya = har
                              ? u.veckodagar.filter((x) => x !== v)
                              : [...u.veckodagar, v];
                            // Minst en dag måste vara vald, annars har
                            // regeln ingen mening.
                            sattUpprepning({
                              veckodagar: nya.length ? nya : [v],
                            });
                          }}
                        >
                          {VECKODAGAR_KORT[v][0]}
                          {VECKODAGAR_KORT[v][1]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {u.frekvens === "manadsvis" && (
                  <div className="knapp-rad">
                    <button
                      type="button"
                      className="knapp pico flex-1"
                      data-aktiv={u.manadslage === "dag-i-manad" ? "1" : "0"}
                      onClick={() =>
                        sattUpprepning({ manadslage: "dag-i-manad" })
                      }
                    >
                      Den {start.getDate()}:e
                    </button>
                    <button
                      type="button"
                      className="knapp pico flex-1"
                      data-aktiv={
                        u.manadslage === "veckodag-i-manad" ? "1" : "0"
                      }
                      onClick={() =>
                        sattUpprepning({ manadslage: "veckodag-i-manad" })
                      }
                    >
                      {veckoNummerIManad(start) === -1
                        ? "Sista"
                        : `${veckoNummerIManad(start)}:a`}{" "}
                      {VECKODAGAR_KORT[start.getDay()].toLowerCase()}
                    </button>
                  </div>
                )}

                <div>
                  <span className="pico opacity-55 block mb-1">Slutar</span>
                  <div className="knapp-rad mb-1.5">
                    {(
                      [
                        ["aldrig", "Aldrig"],
                        ["datum", "Vid datum"],
                        ["antal", "Efter antal"],
                      ] as const
                    ).map(([typ, namn]) => (
                      <button
                        key={typ}
                        type="button"
                        className="knapp pico flex-1"
                        data-aktiv={u.slut.typ === typ ? "1" : "0"}
                        onClick={() =>
                          sattUpprepning({
                            slut:
                              typ === "aldrig"
                                ? { typ: "aldrig" }
                                : typ === "datum"
                                ? {
                                    typ: "datum",
                                    datum: nyckel(
                                      new Date(
                                        start.getFullYear() + 1,
                                        start.getMonth(),
                                        start.getDate()
                                      )
                                    ),
                                  }
                                : { typ: "antal", antal: 10 },
                          })
                        }
                      >
                        {namn}
                      </button>
                    ))}
                  </div>
                  {u.slut.typ === "datum" && (
                    <input
                      type="date"
                      className="falt tabnum"
                      value={u.slut.datum}
                      onChange={(e) =>
                        sattUpprepning({
                          slut: { typ: "datum", datum: e.target.value },
                        })
                      }
                    />
                  )}
                  {u.slut.typ === "antal" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        className="falt tabnum !w-20"
                        value={u.slut.antal}
                        onChange={(e) =>
                          sattUpprepning({
                            slut: {
                              typ: "antal",
                              antal: Math.max(1, Number(e.target.value) || 1),
                            },
                          })
                        }
                      />
                      <span className="pico opacity-55">gånger</span>
                    </label>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Plats och anteckning */}
          <label className="block">
            <span className="pico opacity-55">Plats</span>
            <input
              className="falt"
              value={form.plats}
              onChange={(e) => satt({ plats: e.target.value })}
              placeholder="Rum, adress eller länk"
            />
          </label>

          <label className="block">
            <span className="pico opacity-55">Anteckning</span>
            <textarea
              className="falt resize-none"
              rows={4}
              value={form.anteckning}
              onChange={(e) => satt({ anteckning: e.target.value })}
              placeholder="Skriv [[titel]] för att länka till en anteckning, en uppgift eller en annan händelse."
            />
          </label>

          {/* Samma kopplingsruta som anteckningarna har. En händelse som
              nämns i en anteckning skall kunna hitta tillbaka dit. */}
          <Kopplingar
            id={form.id}
            titel={form.titel}
            text={form.anteckning}
            onOppnaMal={onOppnaMal}
            onSkapa={onSkapaLank}
          />

          {forekomst && (
            <p className="pico opacity-45 leading-relaxed">
              {langtDatum(forekomst.start)} · {klocka(forekomst.start)}–
              {klocka(forekomst.slut)}
              {arSerie && " · del av en serie"}
            </p>
          )}
        </div>

        {/* Fot */}
        <div className="shrink-0 border-t border-ink p-2.5 flex items-center gap-2">
          {!arNy && (
            <button
              type="button"
              className="knapp micro"
              onClick={() => (arSerie ? setVisaRackvidd("radera") : raderaNu("alla"))}
            >
              Radera
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="knapp micro" onClick={onStang}>
            Avbryt
          </button>
          <button
            type="button"
            className="knapp micro"
            data-ton="accent"
            onClick={utfor}
            disabled={form.titel.trim().length === 0}
          >
            {arNy ? "Skapa" : "Spara"}
          </button>
        </div>

        {visaRackvidd && (
          <RackviddsFraga
            avsikt={visaRackvidd}
            onVal={(r) => {
              setVisaRackvidd(null);
              if (visaRackvidd === "spara") spara(r);
              else raderaNu(r);
            }}
            onAvbryt={() => setVisaRackvidd(null)}
          />
        )}
      </aside>
    </>
  );
}

/**
 * Frågan som alltid ställs innan en serie ändras. Tre val, inget
 * förvalt — det finns inget säkert standardsvar.
 */
function RackviddsFraga({
  avsikt,
  onVal,
  onAvbryt,
}: {
  avsikt: "spara" | "radera";
  onVal(r: Rackvidd): void;
  onAvbryt(): void;
}) {
  return (
    <div className="absolute inset-0 bg-[rgb(17_17_17/0.45)] flex items-center justify-center p-4">
      <div
        className="cf bg-panel border border-ink p-3 w-full max-w-[300px]"
        style={{ ["--cf" as string]: "7px" }}
      >
        <span className="cf-in" aria-hidden="true" />
        <p className="micro mb-1">
          {avsikt === "radera" ? "Radera" : "Spara"} — vad skall det gälla?
        </p>
        <p className="pico opacity-55 mb-2.5 leading-relaxed">
          Händelsen ingår i en serie.
        </p>
        <div className="flex flex-col gap-1">
          {(
            [
              ["denna", "Endast denna händelse"],
              ["framat", "Denna och alla senare"],
              ["alla", "Hela serien"],
            ] as const
          ).map(([r, namn]) => (
            <button
              key={r}
              type="button"
              className="knapp micro text-left"
              onClick={() => onVal(r)}
            >
              {namn}
            </button>
          ))}
          <button
            type="button"
            className="knapp pico mt-1 opacity-70"
            onClick={onAvbryt}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
