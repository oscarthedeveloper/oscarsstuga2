"use client";

/**
 * Fornsvenska — egenstudier.
 *
 * Sidan svarar på EN fråga överst: vad återstår att skaffa fram. Därför
 * ligger mätarpanelen först och registret direkt under; att göra och
 * idéer är småsaker vid sidan av och tar höger spalt.
 *
 * "Avancerat" byggs här av täthet och precision, inte av nya färger.
 * Varje verk bär en kort stabil kod, läget visas som en treställig
 * mätare, och registret är en tabellik lista som fälls ut till ett
 * formulär när man öppnar en rad. Ett sken eller en accentfärg till
 * hade sett modernt ut i en skärmdump och som en gäst i appen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { nyckel, startAvDag } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  LAGEN,
  andelLast,
  filtreraVerk,
  formateraKod,
  kallhanvisning,
  lagesIndex,
  nastaLage,
  nastaLedigaKod,
  rakna,
  sorteraVerk,
  tolkaFsvData,
  trygsamUrl,
  type FornsvenskaData,
  type Lage,
  type Verk,
} from "@/lib/sidor/fornsvenska";
import Avsnitt from "./block/Avsnitt";

const VILA_MS = 600;

const samma = (a: FornsvenskaData, b: FornsvenskaData) =>
  JSON.stringify(a) === JSON.stringify(b);

export default function Fornsvenska({
  sida,
  spara,
}: {
  sida: Sida | null;
  spara(data: SidData): void;
}) {
  const utifran = useMemo(() => tolkaFsvData(sida?.data), [sida]);
  const [form, setForm] = useState<FornsvenskaData>(utifran);

  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const andra = useCallback((f: (d: FornsvenskaData) => FornsvenskaData) => {
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
     Registret
     --------------------------------------------------------------- */
  const [fraga, setFraga] = useState("");
  const [filter, setFilter] = useState<Lage | null>(null);
  const [oppet, setOppet] = useState<string | null>(null);

  const raknat = useMemo(() => rakna(form), [form]);
  const synliga = useMemo(
    () => sorteraVerk(filtreraVerk(form, fraga, filter)),
    [form, fraga, filter]
  );

  const nyttVerk = () => {
    const nummer = nastaLedigaKod(form);
    const id = nyId();
    andra((d) => ({
      ...d,
      nastaKod: nummer + 1,
      verk: [
        ...d.verk,
        {
          id,
          kod: formateraKod(nummer),
          titel: "",
          forfattare: "",
          slag: "",
          ar: "",
          lage: "behovs" as Lage,
          plats: "",
          url: "",
          anteckning: "",
        },
      ],
    }));
    setFilter(null);
    setFraga("");
    setOppet(id);
  };

  const andraVerk = (id: string, delar: Partial<Verk>) =>
    andra((d) => ({
      ...d,
      verk: d.verk.map((v) => (v.id === id ? { ...v, ...delar } : v)),
    }));

  const taBortVerk = (id: string) =>
    andra((d) => ({ ...d, verk: d.verk.filter((v) => v.id !== id) }));

  /* ---------------------------------------------------------------
     Att göra och idéer
     --------------------------------------------------------------- */
  const [nySyssla, setNySyssla] = useState("");
  const [nyIde, setNyIde] = useState("");
  const [visaKlara, setVisaKlara] = useState(false);

  const laggSyssla = () => {
    const t = nySyssla.trim();
    if (!t) return;
    andra((d) => ({
      ...d,
      sysslor: [...d.sysslor, { id: nyId(), text: t, klar: false }],
    }));
    setNySyssla("");
  };

  const laggIde = () => {
    const t = nyIde.trim();
    if (!t) return;
    andra((d) => ({
      ...d,
      ideer: [
        {
          id: nyId(),
          text: t,
          skapad: nyckel(startAvDag(new Date())),
          anvand: false,
        },
        ...d.ideer,
      ],
    }));
    setNyIde("");
  };

  const sysslorKvar = form.sysslor.filter((s) => !s.klar).length;
  const synligaSysslor = form.sysslor.filter((s) => visaKlara || !s.klar);

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll">
      {/* ---------------- Mätarpanelen ---------------- */}
      <div className="matarpanel">
        <div>
          <span className="matarnamn">Behövs</span>
          <span
            className="matartal block"
            data-atgard={raknat.behovs > 0 ? "1" : "0"}
          >
            {raknat.behovs}
          </span>
        </div>
        <div>
          <span className="matarnamn">Har</span>
          <span className="matartal block">{raknat.har}</span>
        </div>
        <div>
          <span className="matarnamn">Läst</span>
          <span className="matartal block">{raknat.last}</span>
        </div>

        <div className="flex-1 min-w-[9rem]">
          <span className="matarnamn">
            Registret — {raknat.totalt}{" "}
            {raknat.totalt === 1 ? "verk" : "verk"},{" "}
            {Math.round(andelLast(raknat) * 100)} % genomarbetat
          </span>
          <span
            className="andelsstapel"
            role="img"
            aria-label={`${raknat.behovs} behövs, ${raknat.har} har, ${raknat.last} lästa`}
          >
            {/* Ett tomt register skulle ge tre nollbreda segment och en
                stapel som ser trasig ut. Då ritas den hellre tom. */}
            {raknat.totalt > 0 &&
              LAGEN.map((l) => (
                <span
                  key={l.id}
                  data-lage={l.id}
                  style={{ flexGrow: raknat[l.id], flexBasis: 0 }}
                />
              ))}
          </span>
        </div>
      </div>

      <div className="p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1240px]">
        {/* ---------------- Registret ---------------- */}
        <div className="min-w-0">
          <Avsnitt
            rubrik="Litteratur"
            bihang="Läromedel, utgåvor, examensarbeten, avhandlingar"
            atgard={
              <button
                type="button"
                className="knapp pico shrink-0"
                data-ton="accent"
                onClick={nyttVerk}
              >
                + Verk
              </button>
            }
          >
            <div className="border-b border-ink/15 px-2.5 py-2 flex flex-col gap-2">
              <input
                className="falt"
                placeholder="Sök titel, författare, slag, plats eller kod"
                value={fraga}
                onChange={(e) => setFraga(e.target.value)}
                aria-label="Sök i registret"
              />
              <div className="chiprad items-center">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={filter === null ? "1" : "0"}
                  onClick={() => setFilter(null)}
                >
                  Alla {raknat.totalt}
                </button>
                {LAGEN.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="knapp pico"
                    data-aktiv={filter === l.id ? "1" : "0"}
                    onClick={() => setFilter(filter === l.id ? null : l.id)}
                  >
                    {l.namn} {raknat[l.id]}
                  </button>
                ))}
              </div>
            </div>

            {synliga.length === 0 ? (
              <p className="pico opacity-45 px-3 py-5 leading-relaxed">
                {form.verk.length === 0
                  ? "Registret är tomt. Tryck + Verk och skriv in det första — titel räcker för att börja, resten kan fyllas i när du hittat den."
                  : "Inget i registret matchar. Pröva ett annat ord eller ta bort filtret."}
              </p>
            ) : (
              synliga.map((v) => (
                <Verkrad
                  key={v.id}
                  verk={v}
                  oppen={oppet === v.id}
                  onOppna={() => setOppet(oppet === v.id ? null : v.id)}
                  onAndra={(delar) => andraVerk(v.id, delar)}
                  onTaBort={() => {
                    setOppet(null);
                    taBortVerk(v.id);
                  }}
                />
              ))
            )}
          </Avsnitt>
        </div>

        {/* ---------------- Att göra och idéer ---------------- */}
        <div className="flex flex-col gap-2.5 md:gap-3 min-w-0">
          <Avsnitt
            rubrik="Att göra"
            bihang="Hemsidan"
            atgard={
              <span className="pico opacity-45 tabnum shrink-0">
                {sysslorKvar} kvar
              </span>
            }
          >
            <div className="px-2.5 py-2 border-b border-ink/15 flex gap-2">
              <input
                className="falt"
                placeholder="Vad behöver göras?"
                value={nySyssla}
                onChange={(e) => setNySyssla(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    laggSyssla();
                  }
                }}
                aria-label="Ny syssla"
              />
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={laggSyssla}
                disabled={nySyssla.trim().length === 0}
                aria-label="Lägg till"
              >
                +
              </button>
            </div>

            {synligaSysslor.length === 0 ? (
              <p className="pico opacity-45 px-3 py-4 leading-relaxed">
                {form.sysslor.length === 0
                  ? "Inga sysslor. Listan är egen för sidan och rör inte appens uppgifter."
                  : "Allt avbockat."}
              </p>
            ) : (
              synligaSysslor.map((s) => (
                <div
                  key={s.id}
                  className="uppgift flex items-start gap-2 px-2.5 py-2"
                  data-klar={s.klar ? "1" : "0"}
                >
                  <button
                    type="button"
                    className="uppgift-bockyta shrink-0"
                    onClick={() =>
                      andra((d) => ({
                        ...d,
                        sysslor: d.sysslor.map((x) =>
                          x.id === s.id ? { ...x, klar: !x.klar } : x
                        ),
                      }))
                    }
                    aria-label={s.klar ? "Ångra avbockning" : "Bocka av"}
                    aria-pressed={s.klar}
                  >
                    <span className="uppgift-bock" data-klar={s.klar ? "1" : "0"}>
                      {s.klar ? "✕" : ""}
                    </span>
                  </button>
                  <span className="uppgift-titel flex-1 min-w-0">{s.text}</span>
                  <button
                    type="button"
                    className="blockknapp shrink-0"
                    onClick={() =>
                      andra((d) => ({
                        ...d,
                        sysslor: d.sysslor.filter((x) => x.id !== s.id),
                      }))
                    }
                    aria-label="Ta bort sysslan"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}

            {form.sysslor.some((s) => s.klar) && (
              <div className="px-2.5 py-1.5 border-t border-ink/15">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={visaKlara ? "1" : "0"}
                  onClick={() => setVisaKlara((v) => !v)}
                >
                  Visa klara
                </button>
              </div>
            )}
          </Avsnitt>

          <Avsnitt
            rubrik="Idéer"
            bihang="Fångas nu, sorteras sedan"
            atgard={
              <span className="pico opacity-45 tabnum shrink-0">
                {form.ideer.filter((i) => !i.anvand).length}
              </span>
            }
          >
            <div className="px-2.5 py-2 border-b border-ink/15 flex gap-2">
              <input
                className="falt"
                placeholder="En idé…"
                value={nyIde}
                onChange={(e) => setNyIde(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    laggIde();
                  }
                }}
                aria-label="Ny idé"
              />
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={laggIde}
                disabled={nyIde.trim().length === 0}
                aria-label="Fånga idén"
              >
                +
              </button>
            </div>

            {form.ideer.length === 0 ? (
              <p className="pico opacity-45 px-3 py-4 leading-relaxed">
                Inga idéer fångade. Skriv ned den innan den hinner bli
                bortglömd — sorteringen kan vänta.
              </p>
            ) : (
              form.ideer.map((i) => (
                <div
                  key={i.id}
                  className="px-2.5 py-2 border-b border-ink/10 last:border-b-0 flex items-start gap-2"
                  style={i.anvand ? { opacity: 0.45 } : undefined}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[0.78rem] leading-relaxed"
                      style={
                        i.anvand ? { textDecoration: "line-through" } : undefined
                      }
                    >
                      {i.text}
                    </span>
                    {i.skapad && (
                      <span className="pico opacity-40 tabnum block mt-0.5">
                        {i.skapad}
                      </span>
                    )}
                  </span>
                  {/* Använd idé bockas av, inte raderas — annars fångar
                      man samma tanke en gång till om ett halvår. */}
                  <button
                    type="button"
                    className="blockknapp shrink-0"
                    onClick={() =>
                      andra((d) => ({
                        ...d,
                        ideer: d.ideer.map((x) =>
                          x.id === i.id ? { ...x, anvand: !x.anvand } : x
                        ),
                      }))
                    }
                    aria-label={i.anvand ? "Återöppna idén" : "Markera som använd"}
                    title={i.anvand ? "Återöppna" : "Använd"}
                  >
                    {i.anvand ? "↺" : "✓"}
                  </button>
                  <button
                    type="button"
                    className="blockknapp shrink-0"
                    onClick={() =>
                      andra((d) => ({
                        ...d,
                        ideer: d.ideer.filter((x) => x.id !== i.id),
                      }))
                    }
                    aria-label="Ta bort idén"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </Avsnitt>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   EN RAD I REGISTRET
   ================================================================== */

function Verkrad({
  verk,
  oppen,
  onOppna,
  onAndra,
  onTaBort,
}: {
  verk: Verk;
  oppen: boolean;
  onOppna(): void;
  onAndra(delar: Partial<Verk>): void;
  onTaBort(): void;
}) {
  const fylld = lagesIndex(verk.lage);
  const meta = [verk.forfattare, verk.slag, verk.ar, verk.plats].filter(Boolean);

  return (
    <div className="verkrad" data-oppen={oppen ? "1" : "0"}>
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Lägesmätaren är också knappen som stegar läget. Att flytta en
            post framåt är den vanligaste handlingen på sidan, och den
            skall inte kräva att man först fäller ut raden. */}
        <button
          type="button"
          className="lagesmatare shrink-0 mt-1"
          data-lage={verk.lage}
          onClick={() => onAndra({ lage: nastaLage(verk.lage) })}
          aria-label={`Läge: ${LAGEN[fylld].namn}. Tryck för nästa.`}
          title={`${LAGEN[fylld].namn} — tryck för nästa läge`}
        >
          {LAGEN.map((l, i) => (
            <span key={l.id} data-fylld={i <= fylld ? "1" : "0"} />
          ))}
        </button>

        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={onOppna}
        >
          <span className="flex items-baseline gap-2">
            <span className="kodmarke">{verk.kod}</span>
            <span className="verktitel flex-1 min-w-0">
              {verk.titel || "Utan titel"}
            </span>
          </span>
          {meta.length > 0 && (
            <span className="verkmeta pico opacity-50 block mt-0.5">
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </span>
          )}
        </button>

        {verk.url && (
          <a
            href={verk.url}
            target="_blank"
            rel="noreferrer noopener"
            className="blockknapp shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Öppna länken"
            title={verk.url}
          >
            ↗
          </a>
        )}
      </div>

      {oppen && (
        <div className="px-2.5 pb-3 flex flex-col gap-2 border-t border-ink/12 pt-2.5">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt flex-1"
              placeholder="Titel"
              value={verk.titel}
              onChange={(e) => onAndra({ titel: e.target.value })}
              aria-label="Titel"
              autoFocus
            />
            <input
              className="falt md:!w-[12rem]"
              placeholder="Författare"
              value={verk.forfattare}
              onChange={(e) => onAndra({ forfattare: e.target.value })}
              aria-label="Författare"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt flex-1"
              placeholder="Slag — examensarbete, doktorsavhandling, läromedel…"
              value={verk.slag}
              onChange={(e) => onAndra({ slag: e.target.value })}
              aria-label="Slag"
            />
            <input
              className="falt md:!w-[7rem]"
              placeholder="År"
              value={verk.ar}
              onChange={(e) => onAndra({ ar: e.target.value })}
              aria-label="År"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt md:!w-[13rem]"
              placeholder="Var den finns — DiVA, Libris, antikvariat…"
              value={verk.plats}
              onChange={(e) => onAndra({ plats: e.target.value })}
              aria-label="Var den finns"
            />
            <input
              className="falt flex-1"
              placeholder="https://…"
              inputMode="url"
              value={verk.url}
              onChange={(e) => onAndra({ url: e.target.value })}
              onBlur={(e) => onAndra({ url: trygsamUrl(e.target.value) })}
              aria-label="Länk"
            />
          </div>

          <textarea
            className="skrivyta !flex-none"
            rows={2}
            placeholder="Anteckning"
            value={verk.anteckning}
            onChange={(e) => onAndra({ anteckning: e.target.value })}
            aria-label="Anteckning"
          />

          <div>
            <span className="matarnamn">Källhänvisning</span>
            <p className="hanvisning">
              {kallhanvisning(verk) || "Fyll i fälten ovan så byggs den här."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="knapp-rad">
              {LAGEN.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="knapp pico"
                  data-aktiv={verk.lage === l.id ? "1" : "0"}
                  onClick={() => onAndra({ lage: l.id })}
                >
                  {l.namn}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <button
              type="button"
              className="knapp pico"
              onClick={() => {
                if (
                  window.confirm(
                    `Ta bort ${verk.kod}${verk.titel ? ` — ${verk.titel}` : ""}? Går att ångra med ⌘Z.`
                  )
                ) {
                  onTaBort();
                }
              }}
            >
              Radera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
