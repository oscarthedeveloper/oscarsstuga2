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
 *
 * Under planen ligger två register som INTE är planen. Inköpen är de
 * enskilda utgifter man vill minnas, och de föreslår månadens utfall med
 * en pil man trycker på — de skriver det aldrig själva. Abonnemangen är
 * det som dras utan att man gör något, och räknas i den månad avgiften
 * faktiskt dras.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { MANADER, MANADER_KORT, nyckel } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  abonnemangPerAr,
  abonnemangsKostnad,
  andelAvInkomst,
  avvikelse,
  dras,
  framsteg,
  genomsnittligtSparande,
  harUtfall,
  inkopFor,
  inkopIManad,
  klamManad,
  klamTon,
  kronor,
  kronorMedTecken,
  kvarAttFordela,
  manadMed,
  manadUrMall,
  manadsText,
  motForegaende,
  nastaDragning,
  nastaLedigaManad,
  postFor,
  procent,
  prognos,
  sparandePlan,
  sparandeUtfall,
  sparkvot,
  summaInkop,
  summaPlan,
  summaUtfall,
  tolkaEkonomiData,
  tolkaKrona,
  type Abonnemang,
  type EkonomiData,
  type Inkop,
  type Kategori,
  type Manad,
} from "@/lib/sidor/ekonomi";
import Avsnitt from "./block/Avsnitt";
import Rader from "./block/Rader";
import Talfalt from "./block/Talfalt";
import Fordelningsstapel from "./block/Fordelningsstapel";
import Manadsstapel from "./block/Manadsstapel";

const VILA_MS = 600;

const samma = (a: EkonomiData, b: EkonomiData) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Belopp skrivs "7 500". Talfältet får därför egna regler. */
const skrivKrona = (n: number | null) => (n === null ? "" : kronor(n));

/**
 * Datumet ett nytt inköp skall få.
 *
 * Idag om man står i innevarande månad, annars den första i den månad
 * man tittar på. Att alltid föreslå idag hade lagt raden i fel månad så
 * fort man efterregistrerar, och den försvinner då ur listan man just
 * skriver i — vilket ser ut som att den inte sparades.
 */
function nyttInkopsdatum(manadId: string): string {
  const idag = new Date();
  return nyckel(idag).startsWith(manadId) ? nyckel(idag) : `${manadId}-01`;
}

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
     posterna kvar syns de inte men räknas fortfarande in i summorna.

     Inköpen är ett undantag: de tappar sin kategori men får ligga kvar.
     Pengarna gick åt oavsett vad raden hette, och en omdöpt budget skall
     inte kunna radera historiken. */
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
      inkop: d.inkop.map((i) =>
        i.kategoriId === id ? { ...i, kategoriId: "" } : i
      ),
    }));

  /* ---------------------------------------------------------------
     Inköp
     --------------------------------------------------------------- */
  const [visaAllaInkop, setVisaAllaInkop] = useState(false);

  const nyttInkop = () =>
    andra((d) => ({
      ...d,
      inkop: [
        {
          id: nyId(),
          datum: nyttInkopsdatum(manad?.id ?? nastaLedigaManad(d)),
          namn: "",
          belopp: null,
          kategoriId: "",
        },
        ...d.inkop,
      ],
    }));

  const andraInkop = (id: string, delar: Partial<Inkop>) =>
    andra((d) => ({
      ...d,
      inkop: d.inkop.map((i) => (i.id === id ? { ...i, ...delar } : i)),
    }));

  const taBortInkop = (id: string) =>
    andra((d) => ({ ...d, inkop: d.inkop.filter((i) => i.id !== id) }));

  /**
   * Fyller månadens utfall ur inköpen.
   *
   * Rör bara kategorier som FAKTISKT har inköp. Att nolla de övriga vore
   * att påstå att ingenting gick åt där, och det är ett påstående som
   * kommer från att listan är ofullständig och inte från verkligheten.
   */
  const fyllUtfallUrInkop = (manadId: string) =>
    andra((d) => ({
      ...d,
      manader: d.manader.map((m) => {
        if (m.id !== manadId) return m;
        const poster = [...m.poster];
        for (const k of d.kategorier) {
          const belopp = inkopFor(d, manadId, k.id);
          if (belopp === null) continue;
          const i = poster.findIndex((p) => p.kategoriId === k.id);
          if (i === -1) {
            poster.push({ kategoriId: k.id, plan: null, utfall: belopp });
          } else {
            poster[i] = { ...poster[i], utfall: belopp };
          }
        }
        return { ...m, poster };
      }),
    }));

  /* ---------------------------------------------------------------
     Abonnemang
     --------------------------------------------------------------- */
  const nyttAbonnemang = () =>
    andra((d) => ({
      ...d,
      abonnemang: [
        ...d.abonnemang,
        {
          id: nyId(),
          namn: "",
          belopp: null,
          period: "manad" as const,
          dragManad: new Date().getMonth() + 1,
          aktiv: true,
        },
      ],
    }));

  const andraAbonnemang = (id: string, delar: Partial<Abonnemang>) =>
    andra((d) => ({
      ...d,
      abonnemang: d.abonnemang.map((a) =>
        a.id === id ? { ...a, ...delar } : a
      ),
    }));

  const taBortAbonnemang = (id: string) =>
    andra((d) => ({
      ...d,
      abonnemang: d.abonnemang.filter((a) => a.id !== id),
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

  const inkopIVy = useMemo(() => {
    if (visaAllaInkop || !manad) {
      return [...form.inkop].sort((a, b) => b.datum.localeCompare(a.datum));
    }
    return inkopIManad(form, manad.id);
  }, [form, manad, visaAllaInkop]);

  /* Inköpen i den valda månaden, oavsett vad listan visar. Summan under
     listan skall svara på samma fråga som tabellen ovanför. */
  const inkopDennaManad = useMemo(
    () => (manad ? inkopIManad(form, manad.id) : []),
    [form, manad]
  );

  const abonnemangNu = manad ? abonnemangsKostnad(form, manad.id) : null;
  const abonnemangAr = useMemo(() => abonnemangPerAr(form), [form]);

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
                {/* Bara när det finns något att fylla MED. En knapp som
                    inte kan göra något är en knapp man trycker på en
                    gång och sedan misstror. */}
                {visaUtfall && manad && inkopDennaManad.length > 0 && (
                  <button
                    type="button"
                    className="knapp pico"
                    onClick={() => fyllUtfallUrInkop(manad.id)}
                    title="Sätter utfallet till summan av månadens inköp, kategori för kategori"
                  >
                    Fyll ur inköpen
                  </button>
                )}
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
                        {visaUtfall && <th>Inköp</th>}
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
                        const ink = inkopFor(form, manad.id, k.id);
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
                            {/* Inköpen FÖRESLÅR utfallet. Pilen visar att
                                talet går att flytta över, och att det
                                inte redan är överflyttat — stämmer de
                                överens står talet stilla och matt. */}
                            {visaUtfall && (
                              <td>
                                {ink === null ? (
                                  <span className="opacity-25">—</span>
                                ) : ink === (post?.utfall ?? null) ? (
                                  <span className="opacity-45">
                                    {kronor(ink)}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="knapp pico tabnum"
                                    onClick={() =>
                                      sattPost(manad.id, k.id, "utfall", ink)
                                    }
                                    title={`Sätt utfallet till ${kronor(ink)} kr ur inköpen`}
                                  >
                                    {kronor(ink)} →
                                  </button>
                                )}
                              </td>
                            )}
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
                        {/* Hela månadens inköp, även de utan kategori —
                            annars vore summan mindre än listan under. */}
                        {visaUtfall && (
                          <td className="opacity-55">
                            {inkopDennaManad.length === 0
                              ? "—"
                              : kronor(summaInkop(inkopDennaManad))}
                          </td>
                        )}
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

          {/* ---------------- Inköpen ---------------- */}
          <Avsnitt
            rubrik="Inköp"
            bihang="Enskilda utgifter värda att minnas"
            atgard={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={visaAllaInkop ? "1" : "0"}
                  onClick={() => setVisaAllaInkop((v) => !v)}
                  title="Visa inköpen från alla månader"
                >
                  Alla
                </button>
                <button
                  type="button"
                  className="knapp pico"
                  onClick={nyttInkop}
                >
                  + Inköp
                </button>
              </div>
            }
          >
            <Rader
              rader={inkopIVy}
              onTaBort={taBortInkop}
              tomText={
                visaAllaInkop
                  ? "Inga inköp inlagda. Här hör de stora hemma — Airpods Pro 2 500, klädesinköp 2 000 — inte dagens fika."
                  : `Inga inköp i ${manad ? manadsText(manad.id).toLowerCase() : "månaden"}. Här hör de stora hemma — Airpods Pro 2 500, klädesinköp 2 000 — inte dagens fika.`
              }
              rita={(i) => (
                <>
                  <input
                    type="date"
                    className="falt datumfalt"
                    value={i.datum}
                    onChange={(e) =>
                      andraInkop(i.id, { datum: e.target.value })
                    }
                    aria-label="Datum för inköpet"
                  />
                  <input
                    className="falt min-w-[7rem] flex-1"
                    placeholder="Vad köpte du?"
                    value={i.namn}
                    onChange={(e) => andraInkop(i.id, { namn: e.target.value })}
                    aria-label="Vad inköpet var"
                  />
                  <Talfalt
                    varde={i.belopp}
                    onVarde={(n) => andraInkop(i.id, { belopp: n })}
                    etikett="Belopp"
                    platshallare="0"
                    className="falt !w-[6rem] text-right tabnum"
                    tolkTal={tolkaKrona}
                    skrivTal={skrivKrona}
                  />
                  {/* Tomt är ett fullgott svar. Ett fält som tvingade
                      fram ett val hade bara gett en kategori "Övrigt". */}
                  <select
                    className="falt !w-auto shrink-0"
                    value={i.kategoriId}
                    onChange={(e) =>
                      andraInkop(i.id, { kategoriId: e.target.value })
                    }
                    aria-label="Kategori för inköpet"
                  >
                    <option value="">Utan kategori</option>
                    {form.kategorier.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.namn || "Namnlös"}
                      </option>
                    ))}
                  </select>
                </>
              )}
            />

            {inkopIVy.length > 0 && (
              <div className="px-3 py-2 flex items-baseline gap-2 border-t border-ink/15">
                {/* Etiketten måste beskriva det listan FAKTISKT visar.
                    Utan vald månad finns ingen månad att filtrera på, och
                    då står allt där. */}
                <span className="pico opacity-45">
                  {visaAllaInkop || !manad ? "Alla inköp" : manadsText(manad.id)}
                </span>
                <span className="flex-1" />
                <span className="micro tabnum">
                  {kronor(summaInkop(inkopIVy))} kr
                </span>
              </div>
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

          {/* ---------------- Abonnemangen ---------------- */}
          <Avsnitt
            rubrik="Abonnemang"
            bihang="Hela avgiften i den månad den dras"
            atgard={
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={nyttAbonnemang}
              >
                + Abonnemang
              </button>
            }
          >
            <div className="px-3 pt-3">
              <div className="faktarad">
                <div>
                  <span className="faktaetikett">
                    {manad ? manadsText(manad.id) : "Denna månad"}
                  </span>
                  <span className="faktavarde tabnum">
                    {kronor(abonnemangNu)}
                  </span>
                </div>
                <div>
                  <span className="faktaetikett">Per år</span>
                  <span className="faktavarde tabnum">
                    {kronor(abonnemangAr)}
                  </span>
                </div>
              </div>
            </div>

            <Rader
              rader={form.abonnemang}
              onTaBort={taBortAbonnemang}
              tomText="Inga abonnemang inlagda. Claude Pro 250 i månaden, Headway 250 om året — det som dras utan att du gör något."
              rita={(a) => (
                <>
                  {/* Dras avgiften i den månad man tittar på får raden
                      en prick. Färgen säger inget ensam — månaden står
                      skriven i väljaren intill. */}
                  <span
                    className="ekoprick shrink-0"
                    style={{
                      background:
                        manad && dras(a, manad.id)
                          ? "var(--ink)"
                          : "transparent",
                    }}
                    aria-hidden="true"
                  />
                  <input
                    className="falt min-w-[6rem] flex-1"
                    placeholder="Vad?"
                    value={a.namn}
                    onChange={(e) =>
                      andraAbonnemang(a.id, { namn: e.target.value })
                    }
                    aria-label="Abonnemangets namn"
                  />
                  <Talfalt
                    varde={a.belopp}
                    onVarde={(n) => andraAbonnemang(a.id, { belopp: n })}
                    etikett="Avgift"
                    platshallare="0"
                    className="falt !w-[5rem] text-right tabnum"
                    tolkTal={tolkaKrona}
                    skrivTal={skrivKrona}
                  />
                  <div className="knapp-rad shrink-0">
                    <button
                      type="button"
                      className="knapp pico"
                      data-aktiv={a.period === "manad" ? "1" : "0"}
                      onClick={() =>
                        andraAbonnemang(a.id, { period: "manad" })
                      }
                      title="Dras varje månad"
                    >
                      / mån
                    </button>
                    <button
                      type="button"
                      className="knapp pico"
                      data-aktiv={a.period === "ar" ? "1" : "0"}
                      onClick={() => andraAbonnemang(a.id, { period: "ar" })}
                      title="Dras en gång om året"
                    >
                      / år
                    </button>
                  </div>
                  {/* En årsavgift utan känd dragningsmånad kan inte
                      läggas i rätt månad, och en gissning där hade sett
                      ut som ett svar. */}
                  {a.period === "ar" && (
                    <select
                      className="falt !w-auto shrink-0"
                      value={a.dragManad}
                      onChange={(e) =>
                        andraAbonnemang(a.id, {
                          dragManad: klamManad(e.target.value),
                        })
                      }
                      aria-label="Månad då årsavgiften dras"
                    >
                      {MANADER.map((namn, i) => (
                        <option key={namn} value={i + 1}>
                          {namn}
                        </option>
                      ))}
                    </select>
                  )}
                  {/* Uppsagt raderas inte i första hand. Det man en gång
                      betalade för är just vad man vill kunna se. */}
                  <button
                    type="button"
                    className="knapp pico shrink-0"
                    data-aktiv={a.aktiv ? "0" : "1"}
                    onClick={() => andraAbonnemang(a.id, { aktiv: !a.aktiv })}
                    title={
                      a.aktiv
                        ? "Pausa — ligger kvar men räknas inte"
                        : "Pausat — räknas inte"
                    }
                  >
                    {a.aktiv ? "Pausa" : "Pausat"}
                  </button>
                  {/* Bara där den säger något. En årsavgift som redan
                      passerat i år dras nästa — det är värt att se. */}
                  {a.aktiv && a.period === "ar" && (
                    <span
                      className="pico opacity-40 shrink-0"
                      title="Nästa dragning"
                    >
                      {manadsText(nastaDragning(a) ?? "")}
                    </span>
                  )}
                </>
              )}
            />
          </Avsnitt>
        </div>
      </div>
    </div>
  );
}
