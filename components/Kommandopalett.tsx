"use client";

/**
 * Kommandopaletten — appens enda ingång.
 *
 * Fältet gör tre saker, och att de bor i SAMMA ruta är hela poängen: man
 * skall inte behöva veta om det man tänker på redan finns innan man
 * börjar skriva.
 *
 *   FÅNGA  — skriv en rad och den blir en post. Se lib/tolka.ts.
 *   SÖKA   — tvärs över händelser, uppgifter och anteckningar.
 *   GÖRA   — kommandon och datumhopp, som förut.
 *
 * ORDNINGEN mellan fångst och sökning avgörs av tolken, inte av en
 * inställning: kände den igen ett klockslag eller ett datum håller man
 * på att skriva något NYTT, och fångsten hamnar överst. Kände den inte
 * igen något är man med största sannolikhet ute efter något som redan
 * finns, och träffarna går först. Raden går alltid att inleda med "+"
 * för att tvinga fram fångst.
 *
 * Konsekvensen är att ⏎ nästan alltid gör det man menade, och att den
 * gången det inte gör det syns i kvittot innan man trycker.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useButik, type Fangad } from "./Butik";
import { sok, type Traff } from "@/lib/sok";
import { tolkaFangst } from "@/lib/tolka";
import {
  addDagar,
  langtDatum,
  MANADER,
  MANADER_KORT,
  startAvDag,
} from "@/lib/tid";

export interface Kommando {
  id: string;
  namn: string;
  grupp: string;
  tangent?: string;
  utfor(): void;
}

export interface PalettProps {
  kommandon: Kommando[];
  onGaTill(d: Date): void;
  /**
   * Öppnar en sökträff, oavsett vilken sida den bor på.
   *
   * Paletten tog tidigare emot de expanderade FÖREKOMSTERNA och sökte i
   * dem. Det innebar att den bara kunde hitta det som råkade ligga i
   * fönstret vyn visade — sökte man efter något i mars medan man tittade
   * på augusti fanns det inte. Nu söks hela lagret, och träffen bär den
   * dag den ligger på.
   */
  onOppnaTraff(t: Traff): void;
  /** Kallas efter att fångsten skapat en post, så vyn kan hoppa dit. */
  onFangad(f: Fangad): void;
  onStang(): void;
}

interface Rad {
  nyckel: string;
  grupp: string;
  etikett: string;
  hoger: string;
  /** Andra raden: utdrag ur brödtexten, eller fångstens kvitto. */
  under?: string;
  slag?: Traff["slag"] | "fangst";
  utfor(): void;
}

/** Under så här många tecken är en sökning bara brus. */
const MINSTA_SOK = 2;

export default function Kommandopalett({
  kommandon,
  onGaTill,
  onOppnaTraff,
  onFangad,
  onStang,
}: PalettProps) {
  const butik = useButik();
  const [fraga, setFraga] = useState("");
  const [markerad, setMarkerad] = useState(0);
  const faltRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    faltRef.current?.focus();
  }, []);

  const kalendernamn = useMemo(
    () => butik.kalendrar.map((k) => k.namn),
    [butik.kalendrar]
  );

  /* Texten som skall fångas — "+" främst är en order, inte innehåll. */
  const tvingadFangst = fraga.trimStart().startsWith("+");
  const fangsttext = tvingadFangst ? fraga.trimStart().slice(1) : fraga;

  const fangst = useMemo(() => {
    const t = fangsttext.trim();
    if (t.length === 0) return null;
    return tolkaFangst(fangsttext, kalendernamn);
  }, [fangsttext, kalendernamn]);

  const traffar = useMemo(() => {
    if (tvingadFangst) return [];
    const q = fraga.trim();
    if (q.length < MINSTA_SOK) return [];
    return sok(q, {
      handelser: butik.handelser,
      uppgifter: butik.uppgifter,
      anteckningar: butik.anteckningar,
    });
  }, [fraga, tvingadFangst, butik.handelser, butik.uppgifter, butik.anteckningar]);

  const rader = useMemo(() => {
    const q = fraga.trim().toLowerCase();
    const ut: Rad[] = [];

    /* --- Fångst ---------------------------------------------------- */
    const kanFanga = !!fangst && fangst.titel.trim().length > 0;
    const fangstRad: Rad | null = kanFanga
      ? {
          nyckel: "fangst",
          grupp: "Fånga",
          etikett:
            fangst!.sort === "handelse"
              ? `Ny händelse — ${fangst!.titel}`
              : `Ny uppgift — ${fangst!.titel}`,
          hoger: "⏎",
          under: kvitto(fangst!),
          slag: "fangst",
          utfor: () => {
            const skapad = butik.fanga(fangsttext);
            if (skapad) onFangad(skapad);
            onStang();
          },
        }
      : null;

    // Tolken kände igen tid eller datum ⇒ raden är ett påstående om
    // framtiden, inte en fråga om det förflutna. Då hamnar den överst.
    const skriverNytt =
      tvingadFangst || (!!fangst && !fangst.tom) || traffar.length === 0;
    if (fangstRad && skriverNytt) ut.push(fangstRad);

    /* --- Datumhopp -------------------------------------------------- */
    const datum = tolkaDatum(q);
    if (datum) {
      ut.push({
        nyckel: "datum",
        grupp: "Gå till",
        etikett: `Gå till ${langtDatum(datum)}`,
        hoger: "Datum",
        utfor: () => {
          onGaTill(datum);
          onStang();
        },
      });
    }

    /* --- Träffar ---------------------------------------------------- */
    for (const t of traffar) {
      ut.push({
        nyckel: `t-${t.slag}-${t.id}`,
        grupp: "Innehåll",
        etikett: t.titel,
        hoger: t.hoger,
        under: t.utdrag || undefined,
        slag: t.slag,
        utfor: () => {
          onOppnaTraff(t);
          onStang();
        },
      });
    }

    /* --- Kommandon --------------------------------------------------- */
    if (!tvingadFangst) {
      for (const k of kommandon) {
        if (q && !passar(k.namn.toLowerCase(), q)) continue;
        ut.push({
          nyckel: k.id,
          grupp: k.grupp,
          etikett: k.namn,
          hoger: k.tangent ?? "",
          utfor: () => {
            k.utfor();
            onStang();
          },
        });
      }
    }

    /* Fångsten sist när man snarare tycktes leta än skriva. */
    if (fangstRad && !skriverNytt) ut.push(fangstRad);

    return ut.slice(0, 40);
  }, [
    fraga,
    fangst,
    fangsttext,
    tvingadFangst,
    traffar,
    kommandon,
    butik,
    onGaTill,
    onOppnaTraff,
    onFangad,
    onStang,
  ]);

  useEffect(() => setMarkerad(0), [fraga]);

  // Håll den markerade raden inom synhåll när man pilar sig neråt.
  useEffect(() => {
    const box = listRef.current;
    const rad = box?.querySelectorAll("[data-rad]")[markerad] as
      | HTMLElement
      | undefined;
    rad?.scrollIntoView({ block: "nearest" });
  }, [markerad, rader.length]);

  return (
    <div className="palett-overlay" onClick={onStang}>
      <div
        className="palett"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Kommandopalett"
      >
        <input
          ref={faltRef}
          className="palett-falt"
          placeholder="Skriv för att fånga, söka eller styra…"
          value={fraga}
          onChange={(e) => setFraga(e.target.value)}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMarkerad((m) => Math.min(m + 1, rader.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMarkerad((m) => Math.max(m - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              rader[markerad]?.utfor();
            } else if (e.key === "Escape") {
              onStang();
            }
          }}
        />

        <div ref={listRef} className="palett-lista tunnskroll">
          {rader.length === 0 && (
            <p className="palett-rad opacity-45">
              {fraga.trim() ? "Inget matchar." : "Skriv något."}
            </p>
          )}
          {rader.map((r, i) => {
            const nyGrupp = i === 0 || rader[i - 1].grupp !== r.grupp;
            return (
              <div key={r.nyckel}>
                {nyGrupp && <p className="palett-grupp">{r.grupp}</p>}
                <button
                  type="button"
                  data-rad=""
                  className="palett-rad"
                  data-markerad={i === markerad ? "1" : "0"}
                  data-fangst={r.slag === "fangst" ? "1" : "0"}
                  onMouseEnter={() => setMarkerad(i)}
                  onClick={r.utfor}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {r.slag && r.slag !== "fangst" && (
                        <span className="palett-marke" aria-hidden="true">
                          {MARKE[r.slag]}
                        </span>
                      )}
                      <span className="truncate">{r.etikett}</span>
                    </span>
                    {r.under && (
                      <span className="palett-under">{r.under}</span>
                    )}
                  </span>
                  <span className="pico opacity-55 shrink-0">{r.hoger}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-ink px-3 py-1.5 flex gap-3 overflow-x-auto chiprad">
          <span className="pico opacity-45">↑↓ Bläddra</span>
          <span className="pico opacity-45">⏎ Välj</span>
          <span className="pico opacity-45">+ Tvinga fångst</span>
          <span className="pico opacity-45 hidden md:inline">Esc Stäng</span>
        </div>
      </div>
    </div>
  );
}

/** Enbokstavsmärke så att sorten syns utan att färg behöver bära den. */
const MARKE: Record<Traff["slag"], string> = {
  handelse: "H",
  uppgift: "U",
  anteckning: "A",
};

/**
 * Kvittot — vad tolken faktiskt förstod, i klartext.
 *
 * Utan det blir fångsten en svart låda: posten hamnar någonstans, och
 * man får leta upp den för att kontrollera att gissningen stämde. Med
 * kvittot syns felet innan man trycker ⏎, vilket är den enda tidpunkt
 * då det är gratis att rätta.
 */
function kvitto(f: ReturnType<typeof tolkaFangst>): string {
  if (f.delar.length === 0) {
    return f.sort === "uppgift" ? "Utan datum · styrka 2" : "Idag kl 9";
  }
  return f.delar.map((d) => d.tolkning).join(" · ");
}

/** Löst delsträngsmatchning: tecknen måste komma i ordning, inte i följd. */
function passar(text: string, fraga: string): boolean {
  if (text.includes(fraga)) return true;
  let i = 0;
  for (const tecken of fraga) {
    i = text.indexOf(tecken, i);
    if (i === -1) return false;
    i += 1;
  }
  return true;
}

/**
 * Tolkar ett datum ur fri text. Känner igen:
 *   idag / imorgon / igår / övermorgon
 *   +5 / -3            (dygn från idag)
 *   2026-12-24
 *   24/12 eller 24/12 2026
 *   24 dec / 24 december
 * Allt annat ger null — paletten skall inte gissa.
 *
 * Den här är avsiktligt STRÄNGARE än lib/tolka.ts: här måste HELA raden
 * vara ett datum, eftersom svaret är ett hopp i kalendern och inte en ny
 * post. "möte på fredag" skall inte flytta vyn.
 */
export function tolkaDatum(q: string, idag = new Date()): Date | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  const d0 = startAvDag(idag);

  if (s === "idag" || s === "nu") return d0;
  if (s === "imorgon" || s === "i morgon") return addDagar(d0, 1);
  if (s === "igår" || s === "igar" || s === "i går") return addDagar(d0, -1);
  if (s === "övermorgon" || s === "overmorgon") return addDagar(d0, 2);

  const relativ = s.match(/^([+-])\s*(\d{1,3})$/);
  if (relativ) {
    const tecken = relativ[1] === "-" ? -1 : 1;
    return addDagar(d0, tecken * Number(relativ[2]));
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return giltigt(d) ? d : null;
  }

  const snedstreck = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s+(\d{4}))?$/);
  if (snedstreck) {
    const ar = snedstreck[3] ? Number(snedstreck[3]) : d0.getFullYear();
    const d = new Date(ar, Number(snedstreck[2]) - 1, Number(snedstreck[1]));
    return giltigt(d) ? d : null;
  }

  const medManad = s.match(/^(\d{1,2})\s+([a-zäöå]{3,})(?:\s+(\d{4}))?$/);
  if (medManad) {
    const namn = medManad[2];
    const index = MANADER.findIndex(
      (m) =>
        m.toLowerCase().startsWith(namn) ||
        MANADER_KORT[MANADER.indexOf(m)].toLowerCase() === namn.slice(0, 3)
    );
    if (index === -1) return null;
    const ar = medManad[3] ? Number(medManad[3]) : d0.getFullYear();
    const d = new Date(ar, index, Number(medManad[1]));
    return giltigt(d) ? d : null;
  }

  return null;
}

function giltigt(d: Date): boolean {
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1900;
}
