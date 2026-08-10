"use client";

/**
 * Kommandopaletten — allt appen kan göra, nåbart från tangentbordet.
 *
 * Utöver kommandon förstår fältet också datum: skriv "24 dec", "2026-12-24",
 * "imorgon" eller "+10" och paletten erbjuder att hoppa dit. Tolkningen är
 * medvetet enkel och svensk; den gissar aldrig när den är osäker.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Forekomst } from "@/lib/typer";
import {
  addDagar,
  klocka,
  kortDatum,
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
  forekomster: Forekomst[];
  onGaTill(d: Date): void;
  onOppna(f: Forekomst): void;
  onStang(): void;
}

export default function Kommandopalett({
  kommandon,
  forekomster,
  onGaTill,
  onOppna,
  onStang,
}: PalettProps) {
  const [fraga, setFraga] = useState("");
  const [markerad, setMarkerad] = useState(0);
  const faltRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    faltRef.current?.focus();
  }, []);

  const rader = useMemo(() => {
    const q = fraga.trim().toLowerCase();
    const ut: {
      nyckel: string;
      etikett: string;
      hoger: string;
      utfor(): void;
    }[] = [];

    const datum = tolkaDatum(q);
    if (datum) {
      ut.push({
        nyckel: "datum",
        etikett: `Gå till ${langtDatum(datum)}`,
        hoger: "Datum",
        utfor: () => {
          onGaTill(datum);
          onStang();
        },
      });
    }

    for (const k of kommandon) {
      if (q && !passar(k.namn.toLowerCase(), q)) continue;
      ut.push({
        nyckel: k.id,
        etikett: k.namn,
        hoger: k.tangent ?? k.grupp,
        utfor: () => {
          k.utfor();
          onStang();
        },
      });
    }

    if (q.length >= 2) {
      const traffar = forekomster
        .filter((f) => passar(f.handelse.titel.toLowerCase(), q))
        .slice(0, 8);
      for (const f of traffar) {
        ut.push({
          nyckel: `f-${f.nyckel}`,
          etikett: f.handelse.titel,
          hoger: `${kortDatum(f.start)} ${f.heldag ? "" : klocka(f.start)}`,
          utfor: () => {
            onOppna(f);
            onStang();
          },
        });
      }
    }

    return ut.slice(0, 40);
  }, [fraga, kommandon, forekomster, onGaTill, onOppna, onStang]);

  useEffect(() => setMarkerad(0), [fraga]);

  // Håll den markerade raden inom synhåll när man pilar sig neråt.
  useEffect(() => {
    const box = listRef.current;
    const rad = box?.children[markerad] as HTMLElement | undefined;
    rad?.scrollIntoView({ block: "nearest" });
  }, [markerad]);

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
          placeholder="Sök kommando, händelse eller datum…"
          value={fraga}
          onChange={(e) => setFraga(e.target.value)}
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
        <div
          ref={listRef}
          className="max-h-[46vh] overflow-y-auto tunnskroll py-1"
        >
          {rader.length === 0 && (
            <p className="palett-rad opacity-45">Inget matchar.</p>
          )}
          {rader.map((r, i) => (
            <button
              key={r.nyckel}
              type="button"
              className="palett-rad"
              data-markerad={i === markerad ? "1" : "0"}
              onMouseEnter={() => setMarkerad(i)}
              onClick={r.utfor}
            >
              <span className="truncate">{r.etikett}</span>
              <span className="pico opacity-55 shrink-0">{r.hoger}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-ink px-3 py-1.5 flex gap-3">
          <span className="pico opacity-45">↑↓ Bläddra</span>
          <span className="pico opacity-45">⏎ Välj</span>
          <span className="pico opacity-45">Esc Stäng</span>
        </div>
      </div>
    </div>
  );
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
