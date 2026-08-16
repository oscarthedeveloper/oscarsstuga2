"use client";

/**
 * Högskoleprov och läkarprogrammet.
 *
 * Sidan är byggd kring EN fråga: räcker min poäng? Allt annat är
 * underlag för den. Därför ligger avståndet överst och inte kurvan —
 * kurvan säger hur det har gått, avståndet vad som återstår.
 *
 * TVÅ SPALTER på bredden. Vänster spalt är det som ändras när man
 * pluggar: resultat och delpoäng. Höger spalt är förutsättningarna:
 * vad som krävs och när saker händer. De ändras sällan men behöver
 * synas hela tiden, och att behöva rulla förbi dem för att komma åt
 * kurvan vore att lägga det stillastående i vägen för det rörliga.
 *
 * Ingenting sås med siffror. Antagningspoäng ändras varje omgång, och
 * en föråldrad siffra som ser ut som en sanning är sämre än ett tomt
 * fält som ber om en.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { nyckel, startAvDag } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  HOGSTA_NORMERAT,
  avstand,
  bastaResultat,
  delresultat,
  gruppsumma,
  poangtext,
  senasteResultat,
  sorteradeDatum,
  sorteradeResultat,
  svagasteDelen,
  terminText,
  tolkaHpData,
  type HpData,
  type HpResultat,
} from "@/lib/sidor/hogskoleprov";
import Avsnitt from "./block/Avsnitt";
import Rader from "./block/Rader";
import Serie from "./block/Serie";
import Delprovsserie from "./block/Delprovsserie";
import Nedrakning from "./block/Nedrakning";
import Jamforelse from "./block/Jamforelse";
import Talfalt from "./block/Talfalt";
import Terminfalt from "./block/Terminfalt";

/** Hur länge en tangenttryckning får vila innan sidan sparas. */
const VILA_MS = 600;

const samma = (a: HpData, b: HpData) =>
  JSON.stringify(a) === JSON.stringify(b);

type Graf = "normerat" | "delprov";

export default function Hogskoleprov({
  sida,
  spara,
}: {
  sida: Sida | null;
  spara(data: SidData): void;
}) {
  const utifran = useMemo(() => tolkaHpData(sida?.data), [sida]);
  const [form, setForm] = useState<HpData>(utifran);
  const [graf, setGraf] = useState<Graf>("normerat");

  /*
   * Har ANVÄNDAREN ändrat något?
   *
   * Skiljs medvetet från "skiljer sig form från lagret". De två ser
   * likadana ut men betyder motsatta saker: den ena betyder att vi har
   * något att skriva, den andra kan lika gärna betyda att en annan
   * enhet skrivit något vi ännu inte tagit emot. Utan skillnaden
   * skriver den här sidan över den andra enhetens ändring med sin egen
   * gamla kopia, varje gång.
   */
  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const andra = useCallback((f: (d: HpData) => HpData) => {
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

  /* ---------------------------------------------------------------
     Uträkningar
     --------------------------------------------------------------- */
  const idag = useMemo(() => startAvDag(new Date()), []);
  const resultat = useMemo(() => sorteradeResultat(form), [form]);
  const bast = bastaResultat(form);
  const senast = senasteResultat(form);
  const jamforelser = useMemo(() => avstand(form), [form]);

  const punkter = useMemo(
    () =>
      resultat
        .filter((r) => r.normerat !== null && r.termin)
        .map((r) => ({ etikett: terminText(r.termin), varde: r.normerat! })),
    [resultat]
  );

  const [valtProv, setValtProv] = useState<string | null>(null);
  const visatProv: HpResultat | null =
    resultat.find((r) => r.id === valtProv) ??
    resultat[resultat.length - 1] ??
    null;
  const delar = useMemo(() => delresultat(visatProv), [visatProv]);
  const svagast = useMemo(() => svagasteDelen(visatProv), [visatProv]);

  /* ---------------------------------------------------------------
     Listhjälpare
     --------------------------------------------------------------- */
  type Lista = "resultat" | "datum" | "larosaten";

  const laggTill = <N extends Lista>(falt: N, rad: HpData[N][number]) =>
    andra((d) => ({ ...d, [falt]: [...d[falt], rad] }) as HpData);

  const taBort = (falt: Lista, id: string) =>
    andra((d) => ({ ...d, [falt]: d[falt].filter((r) => r.id !== id) }) as HpData);

  const andraRad = <N extends Lista>(
    falt: N,
    id: string,
    delarAvRad: Partial<HpData[N][number]>
  ) =>
    andra(
      (d) =>
        ({
          ...d,
          [falt]: d[falt].map((r) => (r.id === id ? { ...r, ...delarAvRad } : r)),
        }) as HpData
    );

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll">
      <div className="p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1180px]">
        {/* ============ VÄNSTER: det som ändras när man pluggar ============ */}
        <div className="flex flex-col gap-2.5 md:gap-3 min-w-0">
          <Avsnitt
            rubrik="Avstånd till målet"
            bihang="Bästa poängen räknas vid antagning"
          >
            <div className="flex items-end gap-4 px-3 pt-3 pb-2 flex-wrap">
              <div>
                <p className="pico opacity-45 mb-1">Din bästa poäng</p>
                <p className="stortal">{poangtext(bast?.normerat ?? null)}</p>
              </div>
              <div className="pb-1">
                <p className="pico opacity-45">
                  {bast?.termin ? terminText(bast.termin) : "Inget resultat ännu"}
                </p>
                {senast && bast && senast.id !== bast.id && (
                  <p className="pico opacity-45 mt-0.5">
                    Senast {poangtext(senast.normerat)}
                  </p>
                )}
              </div>
              <span className="flex-1" />
              <label className="block shrink-0">
                <span className="pico opacity-45">Eget mål</span>
                <Talfalt
                  varde={form.mal}
                  onVarde={(n) => andra((d) => ({ ...d, mal: n }))}
                  etikett="Eget mål i normerad poäng"
                  platshallare="1,70"
                />
              </label>
            </div>
            <Jamforelse rader={jamforelser} harPoang={bast !== null} />
          </Avsnitt>

          <Avsnitt
            rubrik={graf === "normerat" ? "Resultat över tid" : "Delprov jämförda"}
            bihang={
              graf === "normerat"
                ? `Skalan går till ${poangtext(HOGSTA_NORMERAT)}`
                : "Andel rätt — en färg per provtillfälle"
            }
            atgard={
              <div className="flex items-center gap-2 shrink-0">
                <div className="knapp-rad">
                  <button
                    type="button"
                    className="knapp pico"
                    data-aktiv={graf === "normerat" ? "1" : "0"}
                    onClick={() => setGraf("normerat")}
                  >
                    Normerat
                  </button>
                  <button
                    type="button"
                    className="knapp pico"
                    data-aktiv={graf === "delprov" ? "1" : "0"}
                    onClick={() => setGraf("delprov")}
                  >
                    Delprov
                  </button>
                </div>
                <button
                  type="button"
                  className="knapp pico shrink-0"
                  onClick={() =>
                    laggTill("resultat", {
                      id: nyId(),
                      termin: null,
                      normerat: null,
                      delar: {},
                      anteckning: "",
                    })
                  }
                >
                  + Prov
                </button>
              </div>
            }
          >
            <div className="px-2 pt-3 pb-1">
              {graf === "normerat" ? (
                <Serie
                  punkter={punkter}
                  hogsta={HOGSTA_NORMERAT}
                  mal={form.mal}
                  skrivTal={(v) => poangtext(v)}
                />
              ) : (
                <Delprovsserie resultat={resultat} />
              )}
            </div>
            <Rader
              rader={resultat}
              onTaBort={(id) => taBort("resultat", id)}
              tomText="Inga provtillfällen inlagda. Tryck + Prov och skriv terminen, till exempel HÖST25."
              rita={(r) => (
                <>
                  <Terminfalt
                    termin={r.termin}
                    onTermin={(t) => andraRad("resultat", r.id, { termin: t })}
                  />
                  <Talfalt
                    varde={r.normerat}
                    onVarde={(n) => andraRad("resultat", r.id, { normerat: n })}
                    etikett="Normerad poäng"
                    platshallare="0,00"
                  />
                  <input
                    className="falt min-w-[7rem] flex-1"
                    placeholder="Anteckning"
                    value={r.anteckning}
                    onChange={(e) =>
                      andraRad("resultat", r.id, { anteckning: e.target.value })
                    }
                    aria-label="Anteckning"
                  />
                </>
              )}
            />
          </Avsnitt>

          <Avsnitt
            rubrik="Delpoäng per provdel"
            bihang="Andel av delens maxpoäng, inte råpoäng"
            atgard={
              resultat.length > 1 ? (
                <select
                  className="falt !w-auto"
                  value={visatProv?.id ?? ""}
                  onChange={(e) => setValtProv(e.target.value)}
                  aria-label="Provtillfälle"
                >
                  {resultat.map((r) => (
                    <option key={r.id} value={r.id}>
                      {terminText(r.termin) || "Utan termin"}
                    </option>
                  ))}
                </select>
              ) : null
            }
          >
            {!visatProv ? (
              <p className="pico opacity-45 px-3 py-4 leading-relaxed">
                Lägg till ett provtillfälle ovan, så går delpoängen att fylla i här.
              </p>
            ) : (
              <>
                {(["kvantitativ", "verbal"] as const).map((grupp) => {
                  const summa = gruppsumma(visatProv, grupp);
                  return (
                    <div key={grupp}>
                      <div className="flex items-baseline gap-2 px-3 pt-2 pb-1">
                        <span className="pico opacity-45">
                          {grupp === "kvantitativ" ? "Kvantitativ del" : "Verbal del"}
                        </span>
                        <span className="flex-1" />
                        {summa.ifyllda > 0 && (
                          <span className="pico tabnum opacity-55">
                            {summa.poang} / {summa.max}
                          </span>
                        )}
                      </div>
                      {delar
                        .filter((d) => d.grupp === grupp)
                        .map((d) => (
                          <div key={d.del} className="sidrad !flex-nowrap">
                            <span className="micro w-[3.2rem] shrink-0">{d.del}</span>
                            <span
                              className="matare"
                              data-svagast={svagast?.del === d.del ? "1" : "0"}
                              title={d.namn}
                            >
                              <span style={{ width: `${(d.andel ?? 0) * 100}%` }} />
                            </span>
                            <Talfalt
                              varde={d.poang}
                              onVarde={(n) =>
                                andraRad("resultat", visatProv.id, {
                                  delar: {
                                    ...visatProv.delar,
                                    [d.del]: n === null ? undefined : n,
                                  },
                                })
                              }
                              etikett={`${d.del} — ${d.namn}`}
                              className="falt talfalt !w-[4rem]"
                            />
                            <span className="pico opacity-45 tabnum w-[2rem] shrink-0">
                              /{d.max}
                            </span>
                          </div>
                        ))}
                    </div>
                  );
                })}
                {svagast && (
                  <p className="pico px-3 py-2 border-t border-ink/15">
                    Svagast just nu:{" "}
                    <span style={{ color: "var(--accent)" }}>
                      {svagast.del} — {svagast.namn}
                    </span>{" "}
                    <span className="tabnum opacity-55">
                      {svagast.poang}/{svagast.max}
                    </span>
                  </p>
                )}
              </>
            )}
          </Avsnitt>
        </div>

        {/* ============ HÖGER: förutsättningarna ============ */}
        <div className="flex flex-col gap-2.5 md:gap-3 min-w-0">
          <Avsnitt
            rubrik="Antagningspoäng"
            bihang="HP-gruppen"
            atgard={
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={() =>
                  laggTill("larosaten", {
                    id: nyId(),
                    namn: "",
                    termin: "",
                    poang: null,
                  })
                }
              >
                + Lärosäte
              </button>
            }
          >
            <Rader
              rader={form.larosaten}
              onTaBort={(id) => taBort("larosaten", id)}
              tomText="Inga lärosäten tillagda. Lägg till t.ex. Göteborgs universitet och Karolinska institutet och fyll i antagningspoängen från senaste omgången."
              rita={(l) => (
                <>
                  <input
                    className="falt min-w-[7rem] flex-1"
                    placeholder="Lärosäte"
                    value={l.namn}
                    onChange={(e) =>
                      andraRad("larosaten", l.id, { namn: e.target.value })
                    }
                    aria-label="Lärosäte"
                  />
                  <input
                    className="falt !w-[5.5rem]"
                    placeholder="HT2026"
                    value={l.termin}
                    onChange={(e) =>
                      andraRad("larosaten", l.id, { termin: e.target.value })
                    }
                    aria-label="Antagningsomgång"
                  />
                  <Talfalt
                    varde={l.poang}
                    onVarde={(n) => andraRad("larosaten", l.id, { poang: n })}
                    etikett="Antagningspoäng"
                    platshallare="0,00"
                  />
                </>
              )}
            />
          </Avsnitt>

          <Avsnitt
            rubrik="Viktiga datum"
            atgard={
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={() =>
                  laggTill("datum", { id: nyId(), datum: nyckel(idag), vad: "" })
                }
              >
                + Datum
              </button>
            }
          >
            <Rader
              rader={sorteradeDatum(form)}
              onTaBort={(id) => taBort("datum", id)}
              tomText="Inga datum inlagda. Anmälan, provdag och besked är de som brukar behövas."
              rita={(d) => (
                <>
                  <input
                    type="date"
                    className="falt datumfalt"
                    value={d.datum}
                    onChange={(e) =>
                      andraRad("datum", d.id, { datum: e.target.value })
                    }
                    aria-label="Datum"
                  />
                  <input
                    className="falt min-w-[7rem] flex-1"
                    placeholder="Vad händer?"
                    value={d.vad}
                    onChange={(e) => andraRad("datum", d.id, { vad: e.target.value })}
                    aria-label="Vad"
                  />
                  <Nedrakning datum={d.datum} />
                </>
              )}
            />
          </Avsnitt>
        </div>
      </div>
    </div>
  );
}
