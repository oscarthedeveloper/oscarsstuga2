"use client";

/**
 * Hantering av kalendrarna själva — lägg till, byt namn, byt färg,
 * ta bort.
 *
 * Det enda som kräver eftertanke är borttagningen. Händelserna i en
 * raderad kalender måste ta vägen någonstans, så panelen frågar vart:
 * flytta dem, eller radera dem med. Att lämna dem kvar utan kalender
 * vore värst av allt — de skulle bli osynliga men ligga kvar i lagret.
 */

import { useEffect, useRef, useState } from "react";
import type { Kalender } from "@/lib/typer";
import { TON_NAMN } from "@/lib/typer";
import { useButik } from "./Butik";

export default function KalenderPanel({ onStang }: { onStang(): void }) {
  const {
    kalendrar,
    skapaKalender,
    uppdateraKalender,
    taBortKalender,
    vaxlaKalender,
    antalIKalender,
  } = useButik();

  const [nyttNamn, setNyttNamn] = useState("");
  const [nyTon, setNyTon] = useState(0);
  const [tarBort, setTarBort] = useState<Kalender | null>(null);
  const nyRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => nyRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  const laggTill = () => {
    const namn = nyttNamn.trim();
    if (!namn) return;
    skapaKalender(namn, nyTon);
    setNyttNamn("");
    // Nästa nya kalender får nästa ton, så att två i rad inte blir lika.
    setNyTon((t) => (t + 1) % 6);
    nyRef.current?.focus();
  };

  return (
    <>
      <div className="panel-overlay" onClick={onStang} />
      <aside
        className="redigeringspanel"
        role="dialog"
        aria-label="Hantera kalendrar"
        onKeyDown={(e) => {
          if (e.key === "Escape") onStang();
        }}
      >
        <div className="shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between">
          <span className="micro">Kalendrar</span>
          <button
            type="button"
            onClick={onStang}
            className="micro hover:text-accent transition-colors"
          >
            Stäng ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-2">
          {kalendrar.map((k) => (
            <KalenderRad
              key={k.id}
              kalender={k}
              antal={antalIKalender(k.id)}
              ensam={kalendrar.length <= 1}
              onNamn={(namn) => uppdateraKalender(k.id, { namn })}
              onTon={(ton) => uppdateraKalender(k.id, { ton })}
              onSynlig={() => vaxlaKalender(k.id)}
              onTaBort={() => setTarBort(k)}
            />
          ))}

          {kalendrar.length <= 1 && (
            <p className="pico opacity-45 leading-relaxed">
              Den sista kalendern går inte att ta bort — nya händelser måste
              kunna hamna någonstans.
            </p>
          )}
        </div>

        {/* Ny kalender */}
        <div className="shrink-0 border-t border-ink p-2.5 flex flex-col gap-2">
          <span className="pico opacity-60">Ny kalender</span>
          <div className="flex gap-2">
            <input
              ref={nyRef}
              className="falt"
              placeholder="Namn"
              value={nyttNamn}
              onChange={(e) => setNyttNamn(e.target.value)}
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
              disabled={nyttNamn.trim().length === 0}
            >
              Lägg till
            </button>
          </div>
          <TonValjare varde={nyTon} onValj={setNyTon} />
        </div>

        {tarBort && (
          <BorttagningsFraga
            kalender={tarBort}
            antal={antalIKalender(tarBort.id)}
            ovriga={kalendrar.filter((k) => k.id !== tarBort.id)}
            onVal={(flyttaTill) => {
              taBortKalender(tarBort.id, flyttaTill);
              setTarBort(null);
            }}
            onAvbryt={() => setTarBort(null)}
          />
        )}
      </aside>
    </>
  );
}

function KalenderRad({
  kalender,
  antal,
  ensam,
  onNamn,
  onTon,
  onSynlig,
  onTaBort,
}: {
  kalender: Kalender;
  antal: number;
  ensam: boolean;
  onNamn(namn: string): void;
  onTon(ton: number): void;
  onSynlig(): void;
  onTaBort(): void;
}) {
  // Namnet redigeras lokalt och skrivs tillbaka när fältet lämnas —
  // annars skulle varje tangenttryckning bli ett eget steg i ⌘Z.
  const [namn, setNamn] = useState(kalender.namn);
  useEffect(() => setNamn(kalender.namn), [kalender.namn]);

  const skriv = () => {
    if (namn.trim() && namn !== kalender.namn) onNamn(namn);
    else setNamn(kalender.namn);
  };

  return (
    <div className="border border-ink p-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 border border-ink"
          style={{
            width: 14,
            height: 14,
            background: `var(--kal-${kalender.ton + 1})`,
            borderLeft: `4px solid var(--kal-${kalender.ton + 1}-stark)`,
          }}
        />
        <input
          className="falt !py-1"
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          onBlur={skriv}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setNamn(kalender.namn);
          }}
          aria-label={`Namn på kalendern ${kalender.namn}`}
        />
      </div>

      <TonValjare varde={kalender.ton} onValj={onTon} />

      <div className="flex items-center gap-2">
        <span className="pico opacity-50 tabnum flex-1">
          {antal} {antal === 1 ? "post" : "poster"}
        </span>
        <button
          type="button"
          className="knapp pico"
          data-aktiv={kalender.synlig ? "1" : "0"}
          onClick={onSynlig}
        >
          {kalender.synlig ? "Synlig" : "Dold"}
        </button>
        <button
          type="button"
          className="knapp pico"
          onClick={onTaBort}
          disabled={ensam}
          title={ensam ? "Den sista kalendern går inte att ta bort" : "Ta bort"}
        >
          Ta bort
        </button>
      </div>
    </div>
  );
}

function TonValjare({
  varde,
  onValj,
}: {
  varde: number;
  onValj(ton: number): void;
}) {
  return (
    <div className="knapp-rad">
      {TON_NAMN.map((namn, i) => (
        <button
          key={namn}
          type="button"
          className="knapp flex-1 !px-0 !py-0 h-6 relative"
          data-aktiv={varde === i ? "1" : "0"}
          onClick={() => onValj(i)}
          title={namn}
          aria-label={namn}
          aria-pressed={varde === i}
        >
          <span
            className="absolute inset-[3px]"
            style={{ background: `var(--kal-${i + 1})` }}
          />
          {varde === i && (
            <span
              className="absolute inset-0 border-2"
              style={{ borderColor: "var(--accent)" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

function BorttagningsFraga({
  kalender,
  antal,
  ovriga,
  onVal,
  onAvbryt,
}: {
  kalender: Kalender;
  antal: number;
  ovriga: Kalender[];
  onVal(flyttaTill: string | null): void;
  onAvbryt(): void;
}) {
  const [mal, setMal] = useState(ovriga[0]?.id ?? "");

  // Tom kalender: inget att fråga om, bara bekräfta.
  if (antal === 0) {
    return (
      <Ruta>
        <p className="micro mb-1">Ta bort {kalender.namn}?</p>
        <p className="pico opacity-55 mb-2.5 leading-relaxed">
          Kalendern är tom.
        </p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="knapp micro text-left"
            data-ton="accent"
            onClick={() => onVal(null)}
          >
            Ta bort
          </button>
          <button type="button" className="knapp pico opacity-70" onClick={onAvbryt}>
            Avbryt
          </button>
        </div>
      </Ruta>
    );
  }

  return (
    <Ruta>
      <p className="micro mb-1">Ta bort {kalender.namn}?</p>
      <p className="pico opacity-55 mb-2.5 leading-relaxed">
        {antal} {antal === 1 ? "post ligger" : "poster ligger"} i den. Vad skall
        hända med {antal === 1 ? "den" : "dem"}?
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="block">
          <span className="pico opacity-55">Flytta till</span>
          <select
            className="falt"
            value={mal}
            onChange={(e) => setMal(e.target.value)}
          >
            {ovriga.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namn}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="knapp micro text-left"
          data-ton="accent"
          onClick={() => onVal(mal)}
        >
          Flytta och ta bort kalendern
        </button>
        <button
          type="button"
          className="knapp micro text-left"
          onClick={() => onVal(null)}
        >
          Radera {antal === 1 ? "posten" : "posterna"} också
        </button>
        <button
          type="button"
          className="knapp pico mt-1 opacity-70"
          onClick={onAvbryt}
        >
          Avbryt
        </button>
      </div>
      <p className="pico opacity-40 mt-2 leading-relaxed">
        Går att ångra med ⌘Z.
      </p>
    </Ruta>
  );
}

function Ruta({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 bg-[rgb(17_17_17/0.45)] flex items-center justify-center p-4">
      <div
        className="cf bg-panel border border-ink p-3 w-full max-w-[300px]"
        style={{ ["--cf" as string]: "7px" }}
      >
        <span className="cf-in" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
