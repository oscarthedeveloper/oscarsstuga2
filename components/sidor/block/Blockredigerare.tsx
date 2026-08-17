"use client";

/**
 * Bladets blocklista.
 *
 * Varje block bär sin egen verktygsrad — flytta, redigera, ta bort —
 * och raden syns alltid. Att gömma den bakom hovring är att gömma den
 * helt på en telefon, där hälften av skrivandet sker.
 *
 * Nya block öppnas direkt i redigeringsläge. Det är hela skillnaden
 * mellan att lägga till ett block och att lägga till ett block OCH
 * sedan leta rätt på pennan.
 */

import { useState } from "react";
import {
  BLOCKNAMN,
  flytta,
  nyttBlock,
  type Block,
  type Blockslag,
} from "@/lib/sidor/sprak";
import { nyId } from "@/lib/butik";
import { RedigeraBlock, VisaBlock } from "./Blockvy";

export default function Blockredigerare({
  block,
  onAndra,
}: {
  block: Block[];
  onAndra(block: Block[]): void;
}) {
  const [redigerad, setRedigerad] = useState<string | null>(null);
  const [meny, setMeny] = useState(false);

  const laggTill = (typ: Blockslag) => {
    const id = nyId();
    onAndra([...block, nyttBlock(typ, id)]);
    setRedigerad(id);
    setMeny(false);
  };

  const namnFor = (typ: Blockslag) =>
    BLOCKNAMN.find((b) => b.typ === typ)?.namn ?? typ;

  return (
    <div className="flex flex-col gap-2">
      {block.length === 0 && (
        <p className="pico opacity-45 py-3 leading-relaxed">
          Tomt blad. Lägg till ett textblock och börja skriva, eller välj en
          tabell, en böjning eller en paralleltext nedan.
        </p>
      )}

      {block.map((b, i) => {
        const redigeras = redigerad === b.id;
        return (
          <div
            key={b.id}
            className="blockkort"
            data-redigeras={redigeras ? "1" : "0"}
          >
            <div className="blockhuvud">
              <span className="pico opacity-40 shrink-0">{namnFor(b.typ)}</span>
              <span className="flex-1" />
              <button
                type="button"
                className="blockknapp"
                onClick={() => onAndra(flytta(block, i, -1))}
                disabled={i === 0}
                aria-label="Flytta upp"
                title="Flytta upp"
              >
                ↑
              </button>
              <button
                type="button"
                className="blockknapp"
                onClick={() => onAndra(flytta(block, i, 1))}
                disabled={i === block.length - 1}
                aria-label="Flytta ned"
                title="Flytta ned"
              >
                ↓
              </button>
              <button
                type="button"
                className="blockknapp"
                onClick={() => setRedigerad(redigeras ? null : b.id)}
                aria-label={redigeras ? "Klar" : "Redigera blocket"}
                title={redigeras ? "Klar" : "Redigera"}
              >
                {redigeras ? "✓" : "✎"}
              </button>
              <button
                type="button"
                className="blockknapp"
                onClick={() => {
                  if (
                    window.confirm(
                      `Ta bort ${namnFor(b.typ).toLowerCase()}sblocket? Går att ångra med ⌘Z.`
                    )
                  ) {
                    onAndra(block.filter((x) => x.id !== b.id));
                  }
                }}
                aria-label="Ta bort blocket"
                title="Ta bort"
              >
                ✕
              </button>
            </div>

            <div className="blockyta">
              {redigeras ? (
                <RedigeraBlock
                  block={b}
                  onAndra={(nytt) =>
                    onAndra(block.map((x) => (x.id === b.id ? nytt : x)))
                  }
                />
              ) : (
                <VisaBlock block={b} />
              )}
            </div>
          </div>
        );
      })}

      {/* Blockväljaren. En rad knappar och inte en rullgardin: åtta val
          ryms, och en rullgardin döljer just det man inte vet finns. */}
      {meny ? (
        <div className="border border-ink bg-panel p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="micro">Lägg till block</span>
            <span className="flex-1" />
            <button
              type="button"
              className="knapp pico"
              onClick={() => setMeny(false)}
            >
              Avbryt
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {BLOCKNAMN.map((b) => (
              <button
                key={b.typ}
                type="button"
                className="knapp pico text-left !py-2"
                onClick={() => laggTill(b.typ)}
              >
                <span className="block">{b.namn}</span>
                <span className="block opacity-45 normal-case mt-0.5">
                  {b.beskrivning}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="knapp pico"
            data-ton="accent"
            onClick={() => laggTill("text")}
          >
            + Text
          </button>
          <button
            type="button"
            className="knapp pico"
            onClick={() => setMeny(true)}
          >
            + Annat block
          </button>
        </div>
      )}
    </div>
  );
}
