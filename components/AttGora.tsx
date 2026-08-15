"use client";

/**
 * Att göra-listan.
 *
 * Två saker styr utseendet, och båda kommer ur samma princip som
 * kalendern: färgen bär aldrig informationen ensam, och ingenting ritas
 * som inte går att handla på.
 *
 * Styrkan visas därför både som siffra och som fyllda streck — en enda
 * accentfärg hade sagt "viktigt" utan att säga hur viktigt, och hade
 * dessutom varit osynlig för den som inte skiljer färgerna åt. Kalendern
 * visas med samma prick och samma ton som i rutnätet, så att en uppgift
 * märkt Arbete och ett möte märkt Arbete ser släkt ut.
 *
 * Listan är en enda kolumn, inte tre spalter efter styrka. Kolumner
 * tvingar ögat att jämföra saker som inte skall jämföras, och gör det
 * omöjligt att se vad som är näst på tur.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Prioritet, Uppgift } from "@/lib/typer";
import { PRIORITETER } from "@/lib/typer";
import { useButik } from "./Butik";
import { sorteraUppgifter } from "@/lib/butik";
import { addDagar, kortDatum, nyckel, startAvDag, tolka } from "@/lib/tid";
import { useMobil } from "@/lib/anvandMedia";
import Kopplingar from "./Kopplingar";
import type { Peka } from "./KalenderApp";
import type { Mal } from "@/lib/kopplingar";

/** Tre streck där de fyllda är styrkan. Läses utan färgseende. */
function Styrka({ varde }: { varde: Prioritet }) {
  return (
    <span
      className="inline-flex items-center gap-[2px] shrink-0"
      aria-hidden="true"
    >
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            width: 3,
            height: 10,
            border: "1px solid var(--ink)",
            // Styrka 1 fyller tre streck, styrka 3 fyller ett.
            background: n <= 4 - varde ? "var(--ink)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}

export default function AttGora({
  fokusera = 0,
  oppna = null,
  onOppnaMal,
  onSkapaLank,
}: {
  /** Räknare som ökar när något utifrån vill att fältet skall få fokus. */
  fokusera?: number;
  /** Uppgift som skall fällas ut, t.ex. från en sökträff. */
  oppna?: Peka | null;
  /** En [[koppling]] pekade bort härifrån. Skalet äger navigeringen. */
  onOppnaMal?(mal: Mal): void;
  /** En [[koppling]] saknade mål och skall bli en ny anteckning. */
  onSkapaLank?(titel: string): void;
}) {
  const {
    uppgifter,
    kalendrar,
    kalenderFor,
    skapaUppgift,
    sparaUppgift,
    vaxlaKlar,
    taBortUppgift,
  } = useButik();

  const [titel, setTitel] = useState("");
  const [prioritet, setPrioritet] = useState<Prioritet>(2);
  const [kalenderId, setKalenderId] = useState<string>("");
  const [filter, setFilter] = useState<string | null>(null);
  const [visaKlara, setVisaKlara] = useState(false);
  const [oppen, setOppen] = useState<string | null>(null);
  const faltRef = useRef<HTMLInputElement | null>(null);
  const mobil = useMobil();

  // Knappen i mobilens bottenrad kan inte nå fältet direkt; den räknar
  // i stället upp en signal, och fältet tar fokus när den ändras.
  useEffect(() => {
    if (fokusera > 0) faltRef.current?.focus();
  }, [fokusera]);

  /*
   * En sökträff pekade hit. Utöver att fälla ut raden måste filtren
   * släppas: träffen kan mycket väl ligga i en kalender som är bortfiltrerad
   * eller vara avbockad, och att öppna en post som sedan inte syns är
   * samma sak som att inte öppna den alls.
   */
  useEffect(() => {
    if (!oppna) return;
    const traff = uppgifter.find((u) => u.id === oppna.id);
    if (!traff) return;
    setOppen(oppna.id);
    setFilter((f) => (f && f !== traff.kalenderId ? null : f));
    if (traff.klar) setVisaKlara(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppna]);

  const valdKalender = kalenderId || kalendrar[0]?.id || "arbete";
  const idag = nyckel(startAvDag(new Date()));

  const synliga = useMemo(() => {
    const lista = uppgifter.filter(
      (u) => (!filter || u.kalenderId === filter) && (visaKlara || !u.klar)
    );
    return sorteraUppgifter(lista);
  }, [uppgifter, filter, visaKlara]);

  const kvar = uppgifter.filter((u) => !u.klar).length;
  const forsenade = uppgifter.filter(
    (u) => !u.klar && u.forfaller && u.forfaller < idag
  ).length;

  const laggTill = () => {
    const t = titel.trim();
    if (!t) return;
    skapaUppgift({ titel: t, prioritet, kalenderId: valdKalender });
    setTitel("");
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Inmatning — alltid överst, alltid samma tre val. */}
      <div className="shrink-0 border-b border-ink p-2.5 flex flex-col gap-2 bg-paper">
        <div className="flex gap-2">
          <input
            ref={faltRef}
            className="falt"
            placeholder="Vad behöver göras?"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                laggTill();
              }
            }}
          />
          <button
            type="button"
            className="knapp micro shrink-0"
            data-ton="accent"
            onClick={laggTill}
            disabled={titel.trim().length === 0}
            aria-label="Lägg till"
          >
            {/* Ordet tar en fjärdedel av bredden på en telefon. Plusset
                säger samma sak bredvid ett textfält. */}
            {mobil ? "+" : "Lägg till"}
          </button>
        </div>

        <div className="chiprad items-center">
          <div className="knapp-rad">
            {PRIORITETER.map((p) => (
              <button
                key={p.varde}
                type="button"
                className="knapp pico flex items-center gap-1.5"
                data-aktiv={prioritet === p.varde ? "1" : "0"}
                onClick={() => setPrioritet(p.varde)}
                title={p.namn}
              >
                <Styrka varde={p.varde} />
                {p.kort}
              </button>
            ))}
          </div>

          <select
            className="falt !w-auto"
            value={valdKalender}
            onChange={(e) => setKalenderId(e.target.value)}
            aria-label="Kalender"
          >
            {kalendrar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter */}
      <div className="shrink-0 border-b border-ink px-2.5 py-1.5 chiprad items-center bg-paper">
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
        <span className="hidden md:block flex-1" />
        <button
          type="button"
          className="knapp pico"
          data-aktiv={visaKlara ? "1" : "0"}
          onClick={() => setVisaKlara((v) => !v)}
        >
          Visa klara
        </button>
      </div>

      {/* Listan */}
      <div className="flex-1 min-h-0 overflow-y-auto tunnskroll">
        {synliga.length === 0 && (
          <div className="p-6 flex items-center justify-center">
            <div
              className="cf bg-panel border border-ink px-4 py-3 max-w-[320px]"
              style={{ ["--cf" as string]: "9px" }}
            >
              <span className="cf-in" aria-hidden="true" />
              <p className="micro mb-1.5">
                {uppgifter.length === 0 ? "Ingenting att göra" : "Inget kvar här"}
              </p>
              <p className="pico opacity-60 leading-[1.8]">
                {uppgifter.length === 0
                  ? "Skriv in något i fältet ovan och välj styrka och kalender."
                  : "Allt i det här urvalet är avbockat. Slå på Visa klara för att se dem."}
              </p>
            </div>
          </div>
        )}

        {synliga.map((u) => (
          <UppgiftRad
            key={u.id}
            markera={u.id === oppna?.id}
            uppgift={u}
            idag={idag}
            kalendernamn={kalenderFor(u.kalenderId).namn}
            ton={kalenderFor(u.kalenderId).ton}
            oppen={oppen === u.id}
            onOppna={() => setOppen(oppen === u.id ? null : u.id)}
            onVaxla={() => vaxlaKlar(u.id)}
            onSpara={sparaUppgift}
            onTaBort={() => {
              setOppen(null);
              taBortUppgift(u.id);
            }}
            kalendrar={kalendrar}
            onOppnaMal={onOppnaMal}
            onSkapaLank={onSkapaLank}
          />
        ))}
      </div>

      {/* Sammanfattning — den enda siffran som betyder något. */}
      <div className="shrink-0 border-t border-ink px-2.5 py-1.5 flex items-center gap-3 bg-paper">
        <span className="pico opacity-60 tabnum">
          {kvar} {kvar === 1 ? "kvar" : "kvar"}
        </span>
        {forsenade > 0 && (
          <span className="pico text-accent tabnum">
            {forsenade} försenade
          </span>
        )}
      </div>
    </div>
  );
}

function UppgiftRad({
  uppgift,
  markera,
  idag,
  kalendernamn,
  ton,
  oppen,
  onOppna,
  onVaxla,
  onSpara,
  onTaBort,
  kalendrar,
  onOppnaMal,
  onSkapaLank,
}: {
  uppgift: Uppgift;
  /** Nyss öppnad utifrån — rulla fram den. */
  markera?: boolean;
  idag: string;
  kalendernamn: string;
  ton: number;
  oppen: boolean;
  onOppna(): void;
  onVaxla(): void;
  onSpara(u: Uppgift): void;
  onTaBort(): void;
  kalendrar: { id: string; namn: string; ton: number }[];
  onOppnaMal?(mal: Mal): void;
  onSkapaLank?(titel: string): void;
}) {
  const forsenad = !uppgift.klar && !!uppgift.forfaller && uppgift.forfaller < idag;
  const idagsdags = uppgift.forfaller === idag;
  const radRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (markera) radRef.current?.scrollIntoView({ block: "center" });
  }, [markera]);

  return (
    <div ref={radRef} className="uppgift" data-klar={uppgift.klar ? "1" : "0"}>
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Bocken. Fyrkantig, som allt annat. */}
        <button
          type="button"
          className="uppgift-bockyta shrink-0"
          data-klar={uppgift.klar ? "1" : "0"}
          onClick={onVaxla}
          aria-label={uppgift.klar ? "Ångra avbockning" : "Bocka av"}
          aria-pressed={uppgift.klar}
        >
          <span className="uppgift-bock" data-klar={uppgift.klar ? "1" : "0"}>
            {uppgift.klar ? "✕" : ""}
          </span>
        </button>

        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={onOppna}
        >
          <span className="uppgift-titel block">{uppgift.titel}</span>
          <span className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="pico opacity-55 flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 border border-ink"
                style={{ background: `var(--kal-${ton + 1})` }}
              />
              {kalendernamn}
            </span>
            {uppgift.forfaller && (
              <span
                className="pico tabnum"
                style={{
                  color: forsenad ? "var(--accent)" : undefined,
                  opacity: forsenad || idagsdags ? 1 : 0.55,
                }}
              >
                {forsenad ? "Försenad " : ""}
                {kortDatum(tolka(uppgift.forfaller))}
              </span>
            )}
            {uppgift.anteckning && (
              <span className="pico opacity-40">✎</span>
            )}
          </span>
        </button>

        <span className="shrink-0 flex items-center gap-1.5 pt-0.5">
          <Styrka varde={uppgift.prioritet} />
          <span className="pico opacity-45 tabnum">{uppgift.prioritet}</span>
        </span>
      </div>

      {oppen && (
        <UppgiftRedigering
          uppgift={uppgift}
          kalendrar={kalendrar}
          onSpara={onSpara}
          onTaBort={onTaBort}
          onStang={onOppna}
          onOppnaMal={onOppnaMal}
          onSkapaLank={onSkapaLank}
        />
      )}
    </div>
  );
}

/**
 * Redigeringen fälls ut i raden i stället för att öppna en panel.
 * En uppgift har fyra fält; att skicka iväg användaren till ett eget
 * fönster för dem vore mer ceremoni än innehåll.
 */
function UppgiftRedigering({
  uppgift,
  kalendrar,
  onSpara,
  onTaBort,
  onStang,
  onOppnaMal,
  onSkapaLank,
}: {
  uppgift: Uppgift;
  kalendrar: { id: string; namn: string; ton: number }[];
  onSpara(u: Uppgift): void;
  onTaBort(): void;
  onStang(): void;
  onOppnaMal?(mal: Mal): void;
  onSkapaLank?(titel: string): void;
}) {
  const [form, setForm] = useState<Uppgift>(uppgift);
  const satt = (delar: Partial<Uppgift>) =>
    setForm((f) => ({ ...f, ...delar }));

  const spara = () => {
    onSpara({ ...form, titel: form.titel.trim() || uppgift.titel });
    onStang();
  };

  return (
    <div className="border-t border-ink/20 bg-panel px-2.5 py-2.5 flex flex-col gap-2">
      <input
        className="falt"
        value={form.titel}
        onChange={(e) => satt({ titel: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") spara();
          if (e.key === "Escape") onStang();
        }}
        aria-label="Titel"
      />

      <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-2">
        <div>
          <span className="pico opacity-55 block mb-1">Styrka</span>
          <div className="knapp-rad">
            {PRIORITETER.map((p) => (
              <button
                key={p.varde}
                type="button"
                className="knapp pico flex items-center gap-1.5"
                data-aktiv={form.prioritet === p.varde ? "1" : "0"}
                onClick={() => satt({ prioritet: p.varde })}
                title={p.namn}
              >
                <Styrka varde={p.varde} />
                {p.kort}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="pico opacity-55">Kalender</span>
          <select
            className="falt md:!w-auto"
            value={form.kalenderId}
            onChange={(e) => satt({ kalenderId: e.target.value })}
          >
            {kalendrar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namn}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="pico opacity-55">Senast</span>
          <input
            type="date"
            className="falt tabnum md:!w-auto"
            value={form.forfaller ?? ""}
            onChange={(e) => satt({ forfaller: e.target.value || null })}
          />
        </label>

        <div className="flex gap-2">
          {form.forfaller && (
            <button
              type="button"
              className="knapp pico"
              onClick={() => satt({ forfaller: null })}
            >
              Utan datum
            </button>
          )}
          <button
            type="button"
            className="knapp pico"
            onClick={() =>
              satt({ forfaller: nyckel(addDagar(startAvDag(new Date()), 1)) })
            }
          >
            Imorgon
          </button>
        </div>
      </div>

      <textarea
        className="falt resize-none"
        rows={2}
        placeholder="Anteckning — [[titel]] länkar till annat"
        value={form.anteckning}
        onChange={(e) => satt({ anteckning: e.target.value })}
      />

      {onOppnaMal && (
        <Kopplingar
          id={uppgift.id}
          titel={uppgift.titel}
          text={form.anteckning}
          onOppnaMal={onOppnaMal}
          onSkapa={onSkapaLank}
        />
      )}

      <div className="flex items-center gap-2">
        <button type="button" className="knapp micro" onClick={onTaBort}>
          Radera
        </button>
        <span className="flex-1" />
        <button type="button" className="knapp micro" onClick={onStang}>
          Avbryt
        </button>
        <button
          type="button"
          className="knapp micro"
          data-ton="accent"
          onClick={spara}
        >
          Spara
        </button>
      </div>
    </div>
  );
}
