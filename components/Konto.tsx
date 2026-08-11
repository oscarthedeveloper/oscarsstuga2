"use client";

/**
 * Kontot och synkläget.
 *
 * Statusknappen sitter i navigeringsraden och säger alltid sanningen med
 * ett ord: Synkad, Offline, tre på väg upp, eller Logga in. Att dölja
 * synktillståndet är frestande men fel — den enda gången en användare
 * bryr sig är när något inte kommit fram, och då måste det synas.
 *
 * Panelen bakom knappen har ingen registreringsruta. Kontot skapas i
 * Supabase-panelen; appen är byggd för en enda person.
 */

import { useEffect, useRef, useState } from "react";
import { useButik } from "./Butik";
import type { Diagnos, SynkLage } from "@/lib/synk";
import { klocka } from "@/lib/tid";

export function synkText(l: SynkLage): string {
  switch (l.tillstand) {
    case "av":
      return "Endast denna enhet";
    case "utloggad":
      return l.ivag > 0 ? `${l.ivag} osparade` : "Logga in";
    case "offline":
      return l.ivag > 0 ? `Offline · ${l.ivag}` : "Offline";
    case "synkar":
      return "Synkar…";
    case "fel":
      return l.ivag > 0 ? `Fel · ${l.ivag}` : "Synkfel";
    case "vilande":
      return l.ivag > 0 ? `↑ ${l.ivag}` : "Synkad";
  }
}

/** En liten fyrkant som bär tillståndet i färg, aldrig ensam om det. */
function Lampa({ lage }: { lage: SynkLage }) {
  const farg =
    lage.tillstand === "fel"
      ? "var(--accent)"
      : lage.tillstand === "vilande" && lage.ivag === 0
      ? "var(--kal-5-stark)"
      : lage.tillstand === "offline" || lage.tillstand === "utloggad"
      ? "transparent"
      : "var(--kal-1-stark)";
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 border border-current"
      style={{ width: 7, height: 7, background: farg }}
    />
  );
}

export function KontoKnapp({ onOppna }: { onOppna(): void }) {
  const { synkLage, molnetFinns } = useButik();
  if (!molnetFinns) return null;
  return (
    <button
      type="button"
      className="knapp micro flex items-center gap-1.5"
      onClick={onOppna}
      title="Konto och synkning"
    >
      <Lampa lage={synkLage} />
      <span className="hidden sm:inline">{synkText(synkLage)}</span>
    </button>
  );
}

export default function KontoPanel({ onStang }: { onStang(): void }) {
  const {
    session,
    synkLage,
    synkaNu,
    loggaIn,
    loggaUt,
    molnetFinns,
    handelser,
    synkaOmAllt,
    stallDiagnos,
  } = useButik();

  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
  const [fel, setFel] = useState<string | null>(null);
  const [arbetar, setArbetar] = useState(false);
  const [diagnos, setDiagnos] = useState<Diagnos | null>(null);
  const [staller, setStaller] = useState(false);
  const epostRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => epostRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  const skicka = async (e: React.FormEvent) => {
    e.preventDefault();
    setArbetar(true);
    setFel(null);
    const svar = await loggaIn(epost, losenord);
    setArbetar(false);
    if (svar) setFel(oversattFel(svar));
    else {
      setLosenord("");
      onStang();
    }
  };

  return (
    <>
      <div className="panel-overlay" onClick={onStang} />
      <aside
        className="redigeringspanel"
        role="dialog"
        aria-label="Konto och synkning"
        onKeyDown={(e) => {
          if (e.key === "Escape") onStang();
        }}
      >
        <div className="shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between">
          <span className="micro">Konto och synkning</span>
          <button
            type="button"
            onClick={onStang}
            className="micro hover:text-accent transition-colors"
          >
            Stäng ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-3">
          {/* Tillstånd */}
          <div className="border border-ink p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="pico opacity-60">Tillstånd</span>
              <span className="micro flex items-center gap-1.5">
                <Lampa lage={synkLage} />
                {synkText(synkLage)}
              </span>
            </div>
            <p className="pico opacity-55 leading-relaxed">
              {synkLage.ivag > 0
                ? `${synkLage.ivag} ${
                    synkLage.ivag === 1 ? "ändring" : "ändringar"
                  } väntar på att skickas upp. De ligger sparade på enheten och går inte förlorade.`
                : session
                ? "Allt som finns på enheten finns också i molnet."
                : "Allt ligger sparat på den här enheten."}
            </p>
            {synkLage.sist && (
              <p className="pico opacity-40 tabnum">
                Senaste synk {klocka(new Date(synkLage.sist))}
              </p>
            )}
            {synkLage.meddelande && (
              <p className="pico text-accent leading-relaxed">
                {oversattFel(synkLage.meddelande)}
              </p>
            )}
            <p className="pico opacity-40 tabnum">
              {handelser.length} {handelser.length === 1 ? "post" : "poster"} på
              enheten
            </p>
          </div>

          {!molnetFinns && (
            <p className="pico opacity-55 leading-relaxed">
              Det här bygget har inga molnnycklar. Kalendern fungerar precis som
              vanligt, men bara på den här enheten. Se README för hur du kopplar
              på Supabase.
            </p>
          )}

          {molnetFinns && !session && (
            <form onSubmit={skicka} className="flex flex-col gap-2">
              <label className="block">
                <span className="pico opacity-55">E-post</span>
                <input
                  ref={epostRef}
                  type="email"
                  autoComplete="username"
                  className="falt"
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="pico opacity-55">Lösenord</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="falt"
                  value={losenord}
                  onChange={(e) => setLosenord(e.target.value)}
                  required
                />
              </label>
              {fel && (
                <p className="pico text-accent leading-relaxed">{fel}</p>
              )}
              <button
                type="submit"
                className="knapp micro"
                data-ton="accent"
                disabled={arbetar}
              >
                {arbetar ? "Loggar in…" : "Logga in"}
              </button>
              <p className="pico opacity-45 leading-relaxed">
                Kontot skapas i Supabase under Authentication → Users. Appen har
                med flit ingen registreringsruta.
              </p>
            </form>
          )}

          {molnetFinns && session && (
            <div className="flex flex-col gap-2">
              <div className="border border-ink p-2.5">
                <span className="pico opacity-55 block">Inloggad som</span>
                <span className="text-[0.78rem] break-all">
                  {session.user.email}
                </span>
              </div>
              <button
                type="button"
                className="knapp micro"
                onClick={() => void synkaNu()}
                disabled={synkLage.tillstand === "synkar"}
              >
                Synka nu
              </button>

              {/* Felsökning — normalt tillstånd behöver den inte, men när
                  något inte kommer fram är det här man tittar. */}
              <details className="border border-ink">
                <summary className="micro px-2.5 py-2 cursor-pointer select-none">
                  Felsökning
                </summary>
                <div className="px-2.5 pb-2.5 flex flex-col gap-2">
                  <button
                    type="button"
                    className="knapp micro"
                    onClick={async () => {
                      setDiagnos(null);
                      setStaller(true);
                      setDiagnos(await stallDiagnos());
                      setStaller(false);
                    }}
                    disabled={staller}
                  >
                    {staller ? "Kontrollerar…" : "Kontrollera molnet"}
                  </button>

                  {diagnos && (
                    <dl className="flex flex-col gap-1">
                      <Rad
                        namn="Nycklar i bygget"
                        varde={diagnos.nycklar ? "Ja" : "Nej"}
                        bra={diagnos.nycklar}
                      />
                      <Rad
                        namn="Inloggad"
                        varde={diagnos.inloggad ? "Ja" : "Nej"}
                        bra={diagnos.inloggad}
                      />
                      <Rad
                        namn="Tabeller"
                        varde={
                          diagnos.tabeller === "ok"
                            ? "Svarar"
                            : diagnos.tabeller === "saknas"
                            ? "Saknas"
                            : diagnos.tabeller === "fel"
                            ? "Fel"
                            : "Okänt"
                        }
                        bra={diagnos.tabeller === "ok"}
                      />
                      {diagnos.antalIMolnet !== null && (
                        <Rad
                          namn="Poster i molnet"
                          varde={String(diagnos.antalIMolnet)}
                          bra
                        />
                      )}
                      <p className="pico opacity-55 leading-relaxed pt-1">
                        {diagnos.meddelande}
                      </p>
                    </dl>
                  )}

                  <button
                    type="button"
                    className="knapp micro"
                    onClick={() => void synkaOmAllt()}
                  >
                    Hämta om allt från molnet
                  </button>
                  <p className="pico opacity-45 leading-relaxed">
                    Glömmer var synkningen stod och hämtar hela kalendern på
                    nytt. Inget lokalt innehåll går förlorat — det
                    sammanfogas som vanligt.
                  </p>
                </div>
              </details>

              <button
                type="button"
                className="knapp micro"
                onClick={() => void loggaUt()}
              >
                Logga ut
              </button>
              <p className="pico opacity-45 leading-relaxed">
                Utloggning rör inte kalendern på enheten. Allt ligger kvar och
                skickas upp nästa gång du loggar in.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Rad({
  namn,
  varde,
  bra,
}: {
  namn: string;
  varde: string;
  bra: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="pico opacity-55">{namn}</dt>
      <dd className="pico flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block border border-current"
          style={{
            width: 7,
            height: 7,
            background: bra ? "var(--kal-5-stark)" : "var(--accent)",
          }}
        />
        {varde}
      </dd>
    </div>
  );
}

/** Supabase svarar på engelska; de vanligaste felen får svensk text. */
function oversattFel(meddelande: string): string {
  const m = meddelande.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Fel e-post eller lösenord.";
  }
  if (m.includes("email not confirmed")) {
    return "Kontot är inte bekräftat. Kryssa i Auto Confirm User i Supabase.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Ingen kontakt med molnet. Ändringarna ligger kvar på enheten.";
  }
  if (m.includes("jwt") || m.includes("token")) {
    return "Sessionen har gått ut. Logga in igen.";
  }
  if (m.includes("relation") && m.includes("does not exist")) {
    return "Tabellerna saknas i databasen. Kör supabase/schema.sql först.";
  }
  return meddelande;
}
