"use client";

/**
 * Privatekonomi — månadsplanering.
 *
 * Gjord för kvarten före löning: pengarna kommer in och skall fördelas.
 * Därför ligger KVAR ATT FÖRDELA överst och störst — det är talet man
 * arbetar ned mot noll — och kategorierna direkt under.
 *
 * Sidan räknar allt själv. Andel, avvikelse, sparkvot, framsteg och
 * prognos följer av det man skriver in; ingenting av det går att skriva
 * för hand, eftersom ett tal man matat in och ett tal som räknats fram
 * ser likadana ut och det första blir fel den dag man ändrar något annat.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { MANADER_KORT } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  andelAvInkomst,
  avvikelse,
  framsteg,
  genomsnittligtSparande,
  harUtfall,
  klamTon,
  kronor,
  kronorMedTecken,
  kvarAttFordela,
  manadMed,
  manadUrMall,
  manadsText,
  motForegaende,
  nastaLedigaManad,
  postFor,
  procent,
  prognos,
  sparandePlan,
  sparandeUtfall,
  sparkvot,
  summaPlan,
  summaUtfall,
  tolkaEkonomiData,
  tolkaKrona,
  type EkonomiData,
  type Kategori,
  type Manad,
} from "@/lib/sidor/ekonomi";
import Avsnitt from "./block/Avsnitt";
import Talfalt from "./block/Talfalt";
import Fordelningsstapel from "./block/Fordelningsstapel";
import Manadsstapel from "./block/Manadsstapel";

const VILA_MS = 600;

const samma = (a: EkonomiData, b: EkonomiData) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Belopp skrivs "7 500". Talfältet får därför egna regler. */
const skrivKrona = (n: number | null) => (n === null ? "" : kronor(n));

export default function Privatekonomi({
  sida,
  spara,
}: {
  sida: Sida | null;
  spara(data: SidData): void;
}) {
  const utifran = useMemo(() => tolkaEkonomiData(sida?.data), [sida]);
  const [form, setForm] = useState<EkonomiData>(utifran);

  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const andra = useCallback((f: (d: EkonomiData) => EkonomiData) => {
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
     Vilken månad
     --------------------------------------------------------------- */
  const [valdId, setValdId] = useState<string | null>(null);
  const [visaUtfall, setVisaUtfall] = useState(false);
  const [hanterar, setHanterar] = useState(false);

  const manad =
    manadMed(form, valdId) ?? form.manader[form.manader.length - 1] ?? null;

  const laggManad = () => {
    const id = nastaLedigaManad(form);
    if (manadMed(form, id)) return;
    andra((d) => ({
      ...d,
      manader: [...d.manader, manadUrMall(d, id)].sort((a, b) =>
        a.id.localeCompare(b.id)
      ),
    }));
    setValdId(id);
  };

  const andraManad = (id: string, delar: Partial<Manad>) =>
    andra((d) => ({
      ...d,
      manader: d.manader.map((m) => (m.id === id ? { ...m, ...delar } : m)),
    }));

  const sattPost = (
    manadId: string,
    kategoriId: string,
    falt: "plan" | "utfall",
    varde: number | null
  ) =>
    andra((d) => ({
      ...d,
      manader: d.manader.map((m) => {
        if (m.id !== manadId) return m;
        const finns = m.poster.some((p) => p.kategoriId === kategoriId);
        return {
          ...m,
          poster: finns
            ? m.poster.map((p) =>
                p.kategoriId === kategoriId ? { ...p, [falt]: varde } : p
              )
            : [
                ...m.poster,
                { kategoriId, plan: null, utfall: null, [falt]: varde },
              ],
        };
      }),
    }));

  /* ---------------------------------------------------------------
     Kategorier
     --------------------------------------------------------------- */
  const nyKategori = () =>
    andra((d) => ({
      ...d,
      kategorier: [
        ...d.kategorier,
        {
          id: nyId(),
          namn: "",
          sparande: false,
          ton: klamTon(d.kategorier.length),
        },
      ],
    }));

  const andraKategori = (id: string, delar: Partial<Kategori>) =>
    andra((d) => ({
      ...d,
      kategorier: d.kategorier.map((k) =>
        k.id === id ? { ...k, ...delar } : k
      ),
    }));

  /* En borttagen kategori måste bort ur varje månad och ur mallen. Blir
     posterna kvar syns de inte men räknas fortfarande in i summorna. */
  const taBortKategori = (id: string) =>
    andra((d) => ({
      ...d,
      kategorier: d.kategorier.filter((k) => k.id !== id),
      manader: d.manader.map((m) => ({
        ...m,
        poster: m.poster.filter((p) => p.kategoriId !== id),
      })),
      mall: {
        ...d.mall,
        poster: d.mall.poster.filter((p) => p.kategoriId !== id),
      },
    }));

  /* ---------------------------------------------------------------
     Uträkningar
     --------------------------------------------------------------- */
  const kvar = manad ? kvarAttFordela(manad) : null;
  const fram = useMemo(() => framsteg(form), [form]);
  const prog = useMemo(() => prognos(form), [form]);
  const takt = useMemo(() => genomsnittligtSparande(form), [form]);

  const delar = useMemo(
    () =>
      manad
        ? form.kategorier
            .map((k) => ({
              id: k.id,
              namn: k.namn || "Namnlös",
              belopp: postFor(manad, k.id)?.plan ?? 0,
              ton: k.ton,
            }))
            .filter((d) => d.belopp > 0)
        : [],
    [form.kategorier, manad]
  );

  const staplar = useMemo(
    () =>
      form.manader.map((m) => ({
        id: m.id,
        etikett: MANADER_KORT[Number(m.id.slice(5, 7)) - 1]?.toLowerCase() ?? m.id,
        plan: sparandePlan(form, m),
        utfall: harUtfall(m) ? sparandeUtfall(form, m) : null,
      })),
    [form]
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll">
      {/* ---------------- Mätarpanelen ---------------- */}
      <div className="matarpanel">
        <div className="min-w-[8rem]">
          <span className="matarnamn">Månad</span>
          {form.manader.length > 0 ? (
            <select
              className="falt !w-auto"
              value={manad?.id ?? ""}
              onChange={(e) => setValdId(e.target.value)}
              aria-label="Välj månad"
            >
              {[...form.manader].reverse().map((m) => (
                <option key={m.id} value={m.id}>
                  {manadsText(m.id)}
                </option>
              ))}
            </select>
          ) : (
            <span className="pico opacity-45">Ingen ännu</span>
          )}
        </div>

        <div>
          <span className="matarnamn">Inkomst</span>
          {manad ? (
            <Talfalt
              varde={manad.inkomst}
              onVarde={(n) => andraManad(manad.id, { inkomst: n })}
              etikett="Inkomst för månaden"
              platshallare="25 000"
              className="falt !w-[7.5rem] text-right tabnum"
              tolkTal={tolkaKrona}
              skrivTal={skrivKrona}
            />
          ) : (
            <span className="matartal block">—</span>
          )}
        </div>

        <div>
          <span className="matarnamn">Fördelat</span>
          <span className="matartal block">
            {manad ? kronor(summaPlan(manad)) : "—"}
          </span>
        </div>

        <div>
          <span className="matarnamn">
            {kvar !== null && kvar < 0 ? "Övertrasserat" : "Kvar att fördela"}
          </span>
          {/* Sidans viktigaste tal. Accent så länge det inte är noll:
              något har ännu inte fått en plats, eller för mycket har
              lovats bort. Noll är målet och bär därför ingen färg. */}
          <span
            className="matartal block"
            data-atgard={kvar !== null && kvar !== 0 ? "1" : "0"}
          >
            {kvar === null ? "—" : kronor(Math.abs(kvar))}
          </span>
        </div>

        <div>
          <span className="matarnamn">Sparkvot</span>
          <span className="matartal block">
            {manad ? procent(sparkvot(form, manad)) : "—"}
          </span>
        </div>

        <span className="flex-1" />

        <button type="button" className="knapp micro shrink-0" onClick={laggManad}>
          + Månad
        </button>
      </div>

      <div className="p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1240px]">
        {/* ---------------- Månaden ---------------- */}
        <div className="min-w-0 flex flex-col gap-2.5 md:gap-3">
          <Avsnitt
            rubrik={manad ? manadsText(manad.id) : "Ingen månad"}
            bihang="Belopp i kronor — andelen räknas ut"
            atgard={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={visaUtfall ? "1" : "0"}
                  onClick={() => setVisaUtfall((v) => !v)}
                >
                  Utfall
                </button>
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={hanterar ? "1" : "0"}
                  onClick={() => setHanterar((v) => !v)}
                >
                  Kategorier
                </button>
              </div>
            }
          >
            {!manad ? (
              <p className="pico opacity-45 px-3 py-5 leading-relaxed">
                Ingen månad upplagd. Tryck + Månad — den fylls i ur mallen, så
                att kvarten före löning blir att justera och inte att börja om.
              </p>
            ) : form.kategorier.length === 0 ? (
              <p className="pico opacity-45 px-3 py-5 leading-relaxed">
                Inga kategorier. Tryck Kategorier och lägg upp dem du fördelar
                till — Sparande, Löpande utgifter, Behov, Nöjen.
              </p>
            ) : (
              <>
                <Fordelningsstapel
                  delar={delar}
                  kvar={kvar}
                  inkomst={manad.inkomst}
                />

                <div className="tabellsvep px-2.5 pb-2.5">
                  <table className="ekotabell">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th>Plan</th>
                        <th>Andel</th>
                        {visaUtfall && <th>Utfall</th>}
                        {visaUtfall && <th>Avvikelse</th>}
                        <th>Mot förra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.kategorier.map((k) => {
                        const post = postFor(manad, k.id);
                        const av = post ? avvikelse(post) : null;
                        const mot = motForegaende(form, manad.id, k.id);
                        return (
                          <tr key={k.id}>
                            <td>
                              <span className="flex items-center gap-2">
                                <span
                                  className="ekoprick"
                                  style={{ background: `var(--kal-${k.ton + 1})` }}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  {k.namn || "Namnlös"}
                                </span>
                                {k.sparande && (
                                  <span className="pico opacity-35 shrink-0">
                                    spar
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>
                              <Talfalt
                                varde={post?.plan ?? null}
                                onVarde={(n) =>
                                  sattPost(manad.id, k.id, "plan", n)
                                }
                                etikett={`Plan för ${k.namn || "kategorin"}`}
                                platshallare="0"
                                className="falt !w-[5.5rem] text-right tabnum"
                                tolkTal={tolkaKrona}
                                skrivTal={skrivKrona}
                              />
                            </td>
                            <td className="opacity-55">
                              {procent(andelAvInkomst(post?.plan ?? null, manad))}
                            </td>
                            {visaUtfall && (
                              <td>
                                <Talfalt
                                  varde={post?.utfall ?? null}
                                  onVarde={(n) =>
                                    sattPost(manad.id, k.id, "utfall", n)
                                  }
                                  etikett={`Utfall för ${k.namn || "kategorin"}`}
                                  platshallare="—"
                                  className="falt !w-[5.5rem] text-right tabnum"
                                  tolkTal={tolkaKrona}
                                  skrivTal={skrivKrona}
                                />
                              </td>
                            )}
                            {visaUtfall && (
                              <td
                                className="avvikelse"
                                data-over={av !== null && av > 0 ? "1" : "0"}
                              >
                                {kronorMedTecken(av)}
                              </td>
                            )}
                            <td className="opacity-45">
                              {mot === null ? "—" : kronorMedTecken(mot)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Summa</td>
                        <td>{kronor(summaPlan(manad))}</td>
                        <td className="opacity-55">
                          {procent(andelAvInkomst(summaPlan(manad), manad))}
                        </td>
                        {visaUtfall && <td>{kronor(summaUtfall(manad))}</td>}
                        {visaUtfall && (
                          <td
                            className="avvikelse"
                            data-over={
                              harUtfall(manad) &&
                              summaUtfall(manad) > summaPlan(manad)
                                ? "1"
                                : "0"
                            }
                          >
                            {harUtfall(manad)
                              ? kronorMedTecken(summaUtfall(manad) - summaPlan(manad))
                              : "—"}
                          </td>
                        )}
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="px-2.5 pb-2.5">
                  <input
                    className="falt"
                    placeholder="Anteckning om månaden"
                    value={manad.anteckning}
                    onChange={(e) =>
                      andraManad(manad.id, { anteckning: e.target.value })
                    }
                    aria-label="Anteckning om månaden"
                  />
                </div>
              </>
            )}
          </Avsnitt>

          {hanterar && (
            <Avsnitt
              rubrik="Kategorier"
              bihang="Gemensamma för alla månader"
              atgard={
                <button
                  type="button"
                  className="knapp pico shrink-0"
                  onClick={nyKategori}
                >
                  + Kategori
                </button>
              }
            >
              {form.kategorier.length === 0 ? (
                <p className="pico opacity-45 px-3 py-4 leading-relaxed">
                  Inga kategorier ännu. De är gemensamma för alla månader — det
                  är det som gör att augusti går att jämföra med juli.
                </p>
              ) : (
                form.kategorier.map((k) => (
                  <div key={k.id} className="sidrad">
                    <input
                      className="falt min-w-[8rem] flex-1"
                      placeholder="Namn"
                      value={k.namn}
                      onChange={(e) =>
                        andraKategori(k.id, { namn: e.target.value })
                      }
                      aria-label="Kategorins namn"
                    />
                    <div className="knapp-rad shrink-0">
                      {[0, 1, 2, 3, 4, 5].map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="knapp pico !px-2"
                          data-aktiv={k.ton === t ? "1" : "0"}
                          onClick={() => andraKategori(k.id, { ton: t })}
                          aria-label={`Ton ${t + 1}`}
                        >
                          <span
                            className="inline-block w-3 h-3 border border-current"
                            style={{ background: `var(--kal-${t + 1})` }}
                          />
                        </button>
                      ))}
                    </div>
                    {/* Skilt från namnet med flit: en sida som gissar på
                        ordet "spar" i namnet gissar fel för någon. */}
                    <button
                      type="button"
                      className="knapp pico shrink-0"
                      data-aktiv={k.sparande ? "1" : "0"}
                      onClick={() =>
                        andraKategori(k.id, { sparande: !k.sparande })
                      }
                      title="Räknas mot sparmålet"
                    >
                      Sparande
                    </button>
                    <button
                      type="button"
                      className="knapp pico shrink-0"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Ta bort ${k.namn || "kategorin"} ur alla månader? Går att ångra med ⌘Z.`
                          )
                        ) {
                          taBortKategori(k.id);
                        }
                      }}
                      aria-label="Ta bort kategorin"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </Avsnitt>
          )}

          <Avsnitt
            rubrik="Sparande över tid"
            bihang="Ram är plan, fylld är utfall"
          >
            <div className="px-2 pt-3 pb-1">
              <Manadsstapel
                staplar={staplar}
                mal={manad ? sparandePlan(form, manad) : null}
              />
            </div>
          </Avsnitt>
        </div>

        {/* ---------------- Mål och mall ---------------- */}
        <div className="flex flex-col gap-2.5 md:gap-3 min-w-0">
          <Avsnitt rubrik="Sparmål" bihang="Räknas på utfall">
            <div className="px-3 py-3 flex flex-col gap-2.5">
              <input
                className="falt"
                placeholder="Vad sparar du till?"
                value={form.mal.namn}
                onChange={(e) =>
                  andra((d) => ({ ...d, mal: { ...d.mal, namn: e.target.value } }))
                }
                aria-label="Sparmålets namn"
              />
              <div className="flex gap-2 flex-wrap">
                <label className="block">
                  <span className="matarnamn">Mål</span>
                  <Talfalt
                    varde={form.mal.belopp}
                    onVarde={(n) =>
                      andra((d) => ({ ...d, mal: { ...d.mal, belopp: n } }))
                    }
                    etikett="Målbelopp"
                    platshallare="100 000"
                    className="falt !w-[7rem] text-right tabnum"
                    tolkTal={tolkaKrona}
                    skrivTal={skrivKrona}
                  />
                </label>
                <label className="block">
                  <span className="matarnamn">Redan undan</span>
                  <Talfalt
                    varde={form.mal.start}
                    onVarde={(n) =>
                      andra((d) => ({ ...d, mal: { ...d.mal, start: n } }))
                    }
                    etikett="Redan undanlagt när du började"
                    platshallare="0"
                    className="falt !w-[7rem] text-right tabnum"
                    tolkTal={tolkaKrona}
                    skrivTal={skrivKrona}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="matartal">{kronor(fram.undanlagt)}</span>
                  <span className="pico opacity-45 tabnum">
                    av {kronor(fram.mal)}
                  </span>
                  <span className="flex-1" />
                  <span className="micro tabnum">{procent(fram.andel)}</span>
                </div>
                <div className="malstapel">
                  <span
                    style={{
                      width: `${Math.min(100, (fram.andel ?? 0) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="faktarad">
                <div>
                  <span className="faktaetikett">Kvar</span>
                  <span className="faktavarde tabnum">{kronor(fram.kvar)}</span>
                </div>
                <div>
                  <span className="faktaetikett">Takt per månad</span>
                  <span className="faktavarde tabnum">{kronor(takt)}</span>
                </div>
                <div>
                  <span className="faktaetikett">Framme</span>
                  <span className="faktavarde tabnum">
                    {prog ? manadsText(prog.manadsId) : "—"}
                  </span>
                </div>
              </div>

              {/* En prognos som tiger säger något den också, och det bör
                  stå varför — annars ser den ut att ha gått sönder. */}
              {!prog && (
                <p className="pico opacity-45 leading-relaxed">
                  {fram.mal === null
                    ? "Sätt ett målbelopp, så räknas det ut när du är framme."
                    : fram.kvar === 0
                      ? "Målet är nått."
                      : "Ingen takt att räkna på ännu. Fyll i utfall för en månad, eller planera ett sparande."}
                </p>
              )}
            </div>
          </Avsnitt>

          <Avsnitt
            rubrik="Mall"
            bihang="Fyller i nya månader"
            atgard={
              manad ? (
                <button
                  type="button"
                  className="knapp pico shrink-0"
                  onClick={() =>
                    andra((d) => ({
                      ...d,
                      mall: {
                        inkomst: manad.inkomst,
                        poster: manad.poster.map((p) => ({
                          kategoriId: p.kategoriId,
                          plan: p.plan,
                        })),
                      },
                    }))
                  }
                  title="Spara den här månadens plan som mall"
                >
                  Ur denna månad
                </button>
              ) : null
            }
          >
            <div className="px-3 py-3 flex flex-col gap-2">
              <label className="block">
                <span className="matarnamn">Inkomst</span>
                <Talfalt
                  varde={form.mall.inkomst}
                  onVarde={(n) =>
                    andra((d) => ({ ...d, mall: { ...d.mall, inkomst: n } }))
                  }
                  etikett="Inkomst i mallen"
                  platshallare="25 000"
                  className="falt !w-[7.5rem] text-right tabnum"
                  tolkTal={tolkaKrona}
                  skrivTal={skrivKrona}
                />
              </label>
              {form.kategorier.length === 0 ? (
                <p className="pico opacity-45 leading-relaxed">
                  Lägg upp kategorier först.
                </p>
              ) : (
                form.kategorier.map((k) => {
                  const p = form.mall.poster.find((x) => x.kategoriId === k.id);
                  return (
                    <div key={k.id} className="flex items-center gap-2">
                      <span className="pico flex-1 min-w-0 truncate">
                        {k.namn || "Namnlös"}
                      </span>
                      <Talfalt
                        varde={p?.plan ?? null}
                        onVarde={(n) =>
                          andra((d) => ({
                            ...d,
                            mall: {
                              ...d.mall,
                              poster: d.mall.poster.some(
                                (x) => x.kategoriId === k.id
                              )
                                ? d.mall.poster.map((x) =>
                                    x.kategoriId === k.id ? { ...x, plan: n } : x
                                  )
                                : [
                                    ...d.mall.poster,
                                    { kategoriId: k.id, plan: n },
                                  ],
                            },
                          }))
                        }
                        etikett={`Mall för ${k.namn || "kategorin"}`}
                        platshallare="—"
                        className="falt !w-[5.5rem] text-right tabnum"
                        tolkTal={tolkaKrona}
                        skrivTal={skrivKrona}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </Avsnitt>
        </div>
      </div>
    </div>
  );
}
