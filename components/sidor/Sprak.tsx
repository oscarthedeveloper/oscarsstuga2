"use client";

/**
 * Språkbiblioteket.
 *
 * Hylla → mapp → blad → block. Fyra nivåer är djupt, och det är därför
 * brödsmulan inte är dekoration utan det enda som talar om var man är —
 * särskilt på en telefon, där varje nivå ersätter den föregående.
 *
 * TVÅ LAGERPOSTER, inte en. Texten ligger i `sprak`, omslagsbilderna i
 * `sprak-omslag`. Sidan sparas medan man skriver, och låg bilderna i
 * samma post skulle varenda omslag skickas upp på nytt vid varje
 * tangenttryckning i en anteckning — på ett mobilnät är det skillnaden
 * mellan en app som fungerar och en som inte gör det. `Sida`-entiteten
 * tar godtyckliga id:n, så delningen kostar ingen ny maskineri.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useButik } from "../Butik";
import { nyId } from "@/lib/butik";
import { useMobil } from "@/lib/anvandMedia";
import { krympBild, Bildfel, dataUrlByte } from "@/lib/bild";
import type { SidData, Sida } from "@/lib/typer";
import {
  bladI,
  bladMed,
  hyllaMed,
  klamTon,
  mappMed,
  mapparI,
  taBortHylla,
  taBortMapp,
  tolkaOmslag,
  tolkaSprakData,
  type Blad,
  type Hylla,
  type Mapp,
  type SprakData,
} from "@/lib/sidor/sprak";
import { renText } from "@/lib/sidor/markering";
import Blockredigerare from "./block/Blockredigerare";
import Mappikon from "./block/Mappikon";
import Bladtrad from "./block/Bladtrad";

const VILA_MS = 600;
const OMSLAGSPOST = "sprak-omslag";

const samma = (a: SprakData, b: SprakData) =>
  JSON.stringify(a) === JSON.stringify(b);

export default function Sprak({
  sida,
  spara,
}: {
  sida: Sida | null;
  spara(data: SidData): void;
}) {
  const butik = useButik();
  const mobil = useMobil();

  const utifran = useMemo(() => tolkaSprakData(sida?.data), [sida]);
  const [form, setForm] = useState<SprakData>(utifran);

  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const andra = useCallback((f: (d: SprakData) => SprakData) => {
    rord.current = true;
    setForm(f);
  }, []);

  useEffect(() => {
    if (!rord.current) return;
    if (samma(form, utifran)) {
      rord.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      rord.current = false;
      spara(form as unknown as SidData);
    }, VILA_MS);
    return () => window.clearTimeout(id);
  }, [form, utifran, spara]);

  useEffect(() => {
    if (rord.current) return;
    if (!samma(utifran, formRef.current)) setForm(utifran);
  }, [utifran]);

  /* Omslagen — egen post, skrivs direkt. Man byter omslag sällan, så
     det finns ingenting att fördröja. */
  const omslag = useMemo(
    () => tolkaOmslag(butik.sidaMed(OMSLAGSPOST)?.data),
    [butik]
  );
  const sattOmslag = useCallback(
    (mappId: string, url: string | null) => {
      const nya = { ...omslag };
      if (url) nya[mappId] = url;
      else delete nya[mappId];
      butik.sparaSida(OMSLAGSPOST, nya as unknown as SidData);
    },
    [butik, omslag]
  );

  /* ---------------------------------------------------------------
     Var är vi?
     --------------------------------------------------------------- */
  const [mappId, setMappId] = useState<string | null>(null);
  const [bladId, setBladId] = useState<string | null>(null);
  /* Vilken hylla som har sin inställningspanel utfälld, och vilka som
     visar alla sina mappar i stället för en rad. */
  const [hanterarId, setHanterarId] = useState<string | null>(null);
  const [utfallda, setUtfallda] = useState<string[]>([]);

  const mapp = mappMed(form, mappId);
  const blad = bladMed(form, bladId);
  /* Hyllan följer av den öppnade mappen. Att också ha ett valt språk
     vore två sanningar om var man är, och de skulle glida isär. */
  const hylla = mapp ? hyllaMed(form, mapp.hyllaId) : null;

  // Pekar valet på något som inte längre finns — raderat här eller på en
  // annan enhet — backar vi ut i stället för att visa en tom yta.
  useEffect(() => {
    if (mappId && !mappMed(form, mappId)) {
      setMappId(null);
      setBladId(null);
    } else if (bladId && !bladMed(form, bladId)) {
      setBladId(null);
    }
  }, [form, mappId, bladId]);

  const bladen = mapp ? bladI(form, mapp.id) : [];

  /* ---------------------------------------------------------------
     Ändringar
     --------------------------------------------------------------- */
  const nyHylla = () => {
    const id = nyId();
    andra((d) => ({
      ...d,
      hyllor: [
        ...d.hyllor,
        { id, namn: "Nytt språk", ton: klamTon(d.hyllor.length) },
      ],
    }));
    // Panelen fälls ut direkt: en hylla som heter "Nytt språk" är inte
    // klar, och att behöva leta rätt på var man byter namn är onödigt.
    setHanterarId(id);
  };

  const andraHylla = (id: string, delar: Partial<Hylla>) =>
    andra((d) => ({
      ...d,
      hyllor: d.hyllor.map((h) => (h.id === id ? { ...h, ...delar } : h)),
    }));

  const nyMapp = (hyllaId: string) => {
    const id = nyId();
    andra((d) => ({
      ...d,
      mappar: [...d.mappar, { id, hyllaId, titel: "Ny mapp", bihang: "" }],
    }));
    setMappId(id);
    setBladId(null);
  };

  const andraMapp = (id: string, delar: Partial<Mapp>) =>
    andra((d) => ({
      ...d,
      mappar: d.mappar.map((m) => (m.id === id ? { ...m, ...delar } : m)),
    }));

  const nyttBlad = () => {
    if (!mapp) return;
    const id = nyId();
    andra((d) => ({
      ...d,
      blad: [
        ...d.blad,
        {
          id,
          mappId: mapp.id,
          titel: "Nytt blad",
          underrubrik: "",
          utkast: true,
          block: [],
        },
      ],
    }));
    setBladId(id);
  };

  const andraBlad = (id: string, delar: Partial<Blad>) =>
    andra((d) => ({
      ...d,
      blad: d.blad.map((b) => (b.id === id ? { ...b, ...delar } : b)),
    }));

  /* ---------------------------------------------------------------
     Omslagsval
     --------------------------------------------------------------- */
  const filRef = useRef<HTMLInputElement | null>(null);
  const [bildfel, setBildfel] = useState<string | null>(null);
  const [laddar, setLaddar] = useState(false);

  const valjOmslag = async (fil: File | undefined) => {
    if (!fil || !mapp) return;
    setBildfel(null);
    setLaddar(true);
    try {
      sattOmslag(mapp.id, await krympBild(fil));
    } catch (e) {
      setBildfel(
        e instanceof Bildfel ? e.message : "Bilden gick inte att läsa."
      );
    } finally {
      setLaddar(false);
      if (filRef.current) filRef.current.value = "";
    }
  };

  /* ---------------------------------------------------------------
     Ritning
     --------------------------------------------------------------- */
  /* --- Nivå 1: alla hyllor, en rad var --- */
  if (!mapp) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto tunnskroll p-2.5 md:p-3">
          {form.hyllor.length === 0 ? (
            <div className="flex flex-col gap-3 items-start">
              <Tomruta
                rubrik="Inga språk ännu"
                text="Varje språk får en egen hylla — en rad med sina mappar. Italienska, tyska, svenska, engelska."
              />
              <button type="button" className="knapp micro" onClick={nyHylla}>
                + Språk
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 md:gap-6">
              {form.hyllor.map((h) => {
                const hyllansMappar = mapparI(form, h.id);
                const utfalld = utfallda.includes(h.id);
                return (
                  <section key={h.id}>
                    <div className="hyllhuvud">
                      <span
                        className="inline-block w-2.5 h-2.5 border border-ink shrink-0 self-center"
                        style={{ background: `var(--kal-${h.ton + 1})` }}
                        aria-hidden="true"
                      />
                      <h2 className="micro">{h.namn || "Namnlöst"}</h2>
                      <span className="pico opacity-45 tabnum shrink-0">
                        {hyllansMappar.length}{" "}
                        {hyllansMappar.length === 1 ? "mapp" : "mappar"}
                      </span>
                      <span className="flex-1" />
                      {/* "more" i förlagan. Här fäller den ut hyllan till
                          alla mappar i stället för att länka vidare — det
                          finns ingen annan sida att gå till. */}
                      {hyllansMappar.length > 4 && (
                        <button
                          type="button"
                          className="pico underline opacity-55 hover:opacity-100 shrink-0"
                          onClick={() =>
                            setUtfallda((u) =>
                              utfalld ? u.filter((x) => x !== h.id) : [...u, h.id]
                            )
                          }
                        >
                          {utfalld ? "visa rad" : "visa alla"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="knapp pico shrink-0"
                        onClick={() => nyMapp(h.id)}
                      >
                        + Mapp
                      </button>
                      <button
                        type="button"
                        className="knapp pico shrink-0"
                        data-aktiv={hanterarId === h.id ? "1" : "0"}
                        onClick={() =>
                          setHanterarId(hanterarId === h.id ? null : h.id)
                        }
                        aria-label={`Hantera ${h.namn || "hyllan"}`}
                      >
                        ⚙
                      </button>
                    </div>

                    {hanterarId === h.id && (
                      <div className="border border-ink bg-panel p-2 mb-2.5 flex gap-2 flex-wrap items-end">
                        <label className="block flex-1 min-w-[10rem]">
                          <span className="pico opacity-45">Språkets namn</span>
                          <input
                            className="falt"
                            value={h.namn}
                            onChange={(e) =>
                              andraHylla(h.id, { namn: e.target.value })
                            }
                            aria-label="Språkets namn"
                          />
                        </label>
                        <div>
                          <span className="pico opacity-45 block mb-1">Ton</span>
                          <div className="knapp-rad">
                            {[0, 1, 2, 3, 4, 5].map((t) => (
                              <button
                                key={t}
                                type="button"
                                className="knapp pico !px-2"
                                data-aktiv={h.ton === t ? "1" : "0"}
                                onClick={() => andraHylla(h.id, { ton: t })}
                                aria-label={`Ton ${t + 1}`}
                              >
                                <span
                                  className="inline-block w-3 h-3 border border-current"
                                  style={{ background: `var(--kal-${t + 1})` }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <span className="flex-1" />
                        <button
                          type="button"
                          className="knapp pico"
                          onClick={() => {
                            const antal = hyllansMappar.length;
                            if (
                              window.confirm(
                                `Ta bort ${h.namn || "hyllan"} med ${antal} ${
                                  antal === 1 ? "mapp" : "mappar"
                                } och allt i dem? Går att ångra med ⌘Z.`
                              )
                            ) {
                              andra((d) => taBortHylla(d, h.id));
                              setHanterarId(null);
                            }
                          }}
                        >
                          Ta bort språket
                        </button>
                      </div>
                    )}

                    {hyllansMappar.length === 0 ? (
                      <p className="pico opacity-45 leading-relaxed py-2">
                        Tom hylla. Tryck + Mapp — Verb, Idiom, Uttal. Väljer du
                        ingen omslagsbild ritas mappen i hyllans ton.
                      </p>
                    ) : (
                      <div
                        className="hyllrad"
                        data-alla={utfalld ? "1" : "0"}
                      >
                        {hyllansMappar.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="mappkort"
                            onClick={() => {
                              setMappId(m.id);
                              setBladId(null);
                            }}
                          >
                            <span className="mappomslag">
                              {omslag[m.id] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={omslag[m.id]} alt="" />
                              ) : (
                                <Mappikon ton={h.ton} />
                              )}
                            </span>
                            <span className="mapptitel">
                              {m.titel || "Namnlös"}
                            </span>
                            <span className="mappunder pico opacity-45">
                              {m.bihang ||
                                `${bladI(form, m.id).length} blad`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              <div>
                <button type="button" className="knapp pico" onClick={nyHylla}>
                  + Språk
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --- Nivå 2 och 3: trädet och dokumentet --- */
  const visaTrad = !mobil || !blad;
  const visaDok = !mobil || !!blad;

  return (
    <div className="h-full min-h-0 flex">
      {visaTrad && (
        <div
          className={`${
            mobil ? "w-full" : "w-[214px] lg:w-[238px]"
          } shrink-0 min-h-0`}
        >
          <Bladtrad
            hyllnamn={hylla?.namn ?? ""}
            mappar={hylla ? mapparI(form, hylla.id) : []}
            bladFor={(id) => bladI(form, id)}
            oppenMapp={mapp.id}
            oppetBlad={bladId}
            onOppnaMapp={(id) => {
              setMappId(id);
              setBladId(null);
            }}
            onOppnaBlad={setBladId}
            onTillHyllan={() => {
              setMappId(null);
              setBladId(null);
            }}
          />
        </div>
      )}

      {visaDok && (
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto tunnskroll bg-paper">
          <div className="p-2.5 md:p-4">
            {blad ? (
              <article className="dokument border border-ink max-w-[860px] mx-auto">
                <div className="p-4 md:p-7">
                  {/* Dokumenthuvudet */}
                  <div className="dokumenthuvud mb-5">
                    <div className="flex items-start gap-3 mb-2">
                      <nav className="pico opacity-45 flex items-center gap-1.5 flex-wrap min-w-0">
                        {mobil && (
                          <button
                            type="button"
                            className="knapp micro shrink-0 !mr-1"
                            onClick={() => setBladId(null)}
                            aria-label="Tillbaka till trädet"
                          >
                            ‹
                          </button>
                        )}
                        <span className="shrink-0">Språk</span>
                        <span className="opacity-50">/</span>
                        <span className="shrink-0">
                          {hylla?.namn || "Namnlöst"}
                        </span>
                        <span className="opacity-50">/</span>
                        <span className="shrink-0">
                          {mapp.titel || "Namnlös"}
                        </span>
                        <span className="opacity-50">/</span>
                        <span className="!opacity-100 text-ink shrink-0">
                          {blad.titel || "Namnlöst"}
                        </span>
                      </nav>
                      <span className="flex-1" />
                      {/* Utkastmärket går att slå av och på genom att
                          tryckas — ett tillstånd man byter ofta skall
                          inte ligga bakom en inställningspanel. */}
                      <button
                        type="button"
                        className="dokmarke shrink-0"
                        style={blad.utkast ? undefined : { opacity: 0.35 }}
                        onClick={() =>
                          andraBlad(blad.id, { utkast: !blad.utkast })
                        }
                        title={
                          blad.utkast
                            ? "Markera som färdigt"
                            : "Markera som utkast"
                        }
                      >
                        {blad.utkast ? "Utkast" : "Färdigt"}
                      </button>
                    </div>

                    <input
                      className="doktitel mb-2"
                      value={blad.titel}
                      onChange={(e) =>
                        andraBlad(blad.id, { titel: e.target.value })
                      }
                      placeholder="Rubrik"
                      aria-label="Bladets rubrik"
                    />
                    <input
                      className="dokdeck"
                      value={blad.underrubrik}
                      onChange={(e) =>
                        andraBlad(blad.id, { underrubrik: e.target.value })
                      }
                      placeholder="Underrubrik"
                      aria-label="Underrubrik"
                    />
                  </div>

                  {/* Blocken */}
                  <Blockredigerare
                    block={blad.block}
                    onAndra={(block) => andraBlad(blad.id, { block })}
                  />

                  <div className="mt-6 pt-3 border-t border-ink/15 flex">
                    <span className="flex-1" />
                    <button
                      type="button"
                      className="knapp pico"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Ta bort ${blad.titel || "bladet"}? Går att ångra med ⌘Z.`
                          )
                        ) {
                          setBladId(null);
                          andra((d) => ({
                            ...d,
                            blad: d.blad.filter((x) => x.id !== blad.id),
                          }));
                        }
                      }}
                    >
                      Radera bladet
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              /* Mappen själv: omslag, namn och dess blad. */
              <div className="max-w-[720px] mx-auto flex flex-col gap-3">
                <div className="dokument border border-ink p-4 md:p-6">
                  <p className="pico opacity-45 mb-3">
                    Språk / {hylla?.namn || "Namnlöst"} /{" "}
                    <span className="opacity-100 text-ink">
                      {mapp.titel || "Namnlös"}
                    </span>
                  </p>
                  <input
                    className="doktitel mb-2"
                    value={mapp.titel}
                    onChange={(e) =>
                      andraMapp(mapp.id, { titel: e.target.value })
                    }
                    placeholder="Mappens namn"
                    aria-label="Mappens namn"
                  />
                  <input
                    className="dokdeck mb-4"
                    value={mapp.bihang}
                    onChange={(e) =>
                      andraMapp(mapp.id, { bihang: e.target.value })
                    }
                    placeholder="Underrad, t.ex. A2–B1"
                    aria-label="Underrad"
                  />

                  <div className="flex items-start gap-4 flex-wrap">
                    <span
                      className="mappomslag shrink-0"
                      style={{ width: 96 }}
                    >
                      {omslag[mapp.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={omslag[mapp.id]} alt="" />
                      ) : (
                        <Mappikon ton={hylla?.ton ?? 0} />
                      )}
                    </span>
                    <div className="flex flex-col gap-2 flex-1 min-w-[12rem]">
                      <input
                        ref={filRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void valjOmslag(e.target.files?.[0])}
                      />
                      <div className="chiprad">
                        <button
                          type="button"
                          className="knapp pico"
                          onClick={() => filRef.current?.click()}
                          disabled={laddar}
                        >
                          {laddar
                            ? "Krymper…"
                            : omslag[mapp.id]
                              ? "Byt omslag"
                              : "Välj omslag"}
                        </button>
                        {omslag[mapp.id] && (
                          <>
                            <button
                              type="button"
                              className="knapp pico"
                              onClick={() => sattOmslag(mapp.id, null)}
                            >
                              Ta bort omslag
                            </button>
                            <span className="pico opacity-40 tabnum shrink-0 self-center">
                              {Math.round(
                                dataUrlByte(omslag[mapp.id]) / 1024
                              )}{" "}
                              kB
                            </span>
                          </>
                        )}
                      </div>
                      {bildfel && (
                        <p className="pico" style={{ color: "var(--accent)" }}>
                          {bildfel}
                        </p>
                      )}
                      <p className="pico opacity-40 leading-relaxed">
                        Bilden krymps till 300 px bredd innan den sparas, så
                        att lagret inte fylls av ett enda omslag.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="dokument border border-ink">
                  <div className="border-b border-ink px-3 py-2 flex items-center gap-2">
                    <span className="micro">Blad</span>
                    <span className="pico opacity-45 tabnum">
                      {bladen.length}
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      className="knapp pico"
                      onClick={nyttBlad}
                    >
                      + Blad
                    </button>
                  </div>
                  {bladen.length === 0 ? (
                    <p className="pico opacity-45 px-3 py-4 leading-relaxed">
                      Inga blad ännu. Tryck + Blad — det öppnas direkt med
                      rubrik och ett tomt block.
                    </p>
                  ) : (
                    bladen.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="sidval"
                        onClick={() => setBladId(b.id)}
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="block text-[0.84rem] leading-snug flex-1 min-w-0">
                            {b.titel || "Namnlöst"}
                          </span>
                          {b.utkast && (
                            <span className="pico opacity-35 shrink-0">
                              utkast
                            </span>
                          )}
                        </span>
                        <span className="pico opacity-45 block mt-0.5 truncate">
                          {b.underrubrik || sammanfatta(b)}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex">
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="knapp pico"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Ta bort ${mapp.titel || "mappen"} med ${bladen.length} ${
                            bladen.length === 1 ? "blad" : "blad"
                          }? Går att ångra med ⌘Z.`
                        )
                      ) {
                        andra((d) => taBortMapp(d, mapp.id));
                        sattOmslag(mapp.id, null);
                        setMappId(null);
                        setBladId(null);
                      }
                    }}
                  >
                    Ta bort mappen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Första raden text i bladet, som förhandsbesked i listan. */
function sammanfatta(blad: Blad): string {
  for (const b of blad.block) {
    if (b.typ === "text" || b.typ === "rubrik") {
      const ren = renText(b.text).replace(/\s+/g, " ").trim();
      if (ren) return ren;
    }
  }
  const antal = blad.block.length;
  return antal === 0 ? "Tomt" : `${antal} block`;
}

function Tomruta({ rubrik, text }: { rubrik: string; text: string }) {
  return (
    <div
      className="cf bg-panel border border-ink px-4 py-3 max-w-[340px]"
      style={{ ["--cf" as string]: "9px" }}
    >
      <span className="cf-in" aria-hidden="true" />
      <p className="micro mb-1.5">{rubrik}</p>
      <p className="pico opacity-60 leading-[1.8]">{text}</p>
    </div>
  );
}
