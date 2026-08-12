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
  const { synkLage } = useButik();
  // Knappen visas ALLTID, även i ett bygge utan molnnycklar. Att dölja
  // den när molnet är avstängt lät prydligt, men gjorde att den som
  // undrade "varför synkas det inte" inte hade någonstans att fråga.
  const kravInsats =
    synkLage.tillstand === "utloggad" || synkLage.tillstand === "fel";
  return (
    <button
      type="button"
      className="knapp micro flex items-center gap-1.5"
      onClick={onOppna}
      title="Konto och synkning"
      data-ton={kravInsats ? "accent" : undefined}
    >
      <Lampa lage={synkLage} />
      {/* Texten göms normalt på mobilen för att spara bredd — men aldrig
          när något behöver åtgärdas. Då är den hela poängen. */}
      <span className={kravInsats ? "" : "hidden sm:inline"}>
        {synkText(synkLage)}
      </span>
    </button>
  );
}

const AVFARDAD = "kalendariet.molnremsa.avfardad";

/**
 * Remsan som säger att ingenting synkas.
 *
 * Det finns två tysta lägen där appen fungerar perfekt men molnet aldrig
 * rörs: bygget saknar nycklar, eller enheten är inte inloggad. Båda ser
 * ut precis som en fungerande kalender. Den här remsan är det enda som
 * skiljer "allt är bra" från "ingenting av det du gör lämnar den här
 * enheten", och därför får den ta plats.
 */
export function MolnRemsa({ onOppna }: { onOppna(): void }) {
  const { molnetFinns, session, synkLage } = useButik();
  const [avfardad, setAvfardad] = useState(true);

  useEffect(() => {
    setAvfardad(window.localStorage.getItem(AVFARDAD) === "1");
  }, []);

  if (session) return null;
  if (synkLage.tillstand === "av" && avfardad) return null;
  if (molnetFinns && avfardad && synkLage.ivag === 0) return null;

  const utanNycklar = !molnetFinns;

  return (
    <div className="shrink-0 border-b border-ink bg-accent text-ink px-3 py-1.5 flex items-center gap-2 flex-wrap">
      <span className="micro">
        {utanNycklar
          ? "Molnet är inte inkopplat i det här bygget"
          : "Inte inloggad — ingenting synkas"}
      </span>
      <span className="pico opacity-80 flex-1 min-w-[12rem]">
        {utanNycklar
          ? "Allt du skriver stannar på den här enheten."
          : `Allt du skriver stannar på den här enheten${
              synkLage.ivag > 0 ? ` (${synkLage.ivag} väntar)` : ""
            }.`}
      </span>
      <button type="button" className="knapp pico" onClick={onOppna}>
        {utanNycklar ? "Läs mer" : "Logga in"}
      </button>
      <button
        type="button"
        className="pico opacity-70 hover:opacity-100 px-1"
        onClick={() => {
          window.localStorage.setItem(AVFARDAD, "1");
          setAvfardad(true);
        }}
        aria-label="Dölj"
        title="Dölj — statusknappen visar det ändå"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Tvångshämtning.
 *
 * Glömmer var synkningen stod och läser om hela kalendern från Supabase.
 * Den vanliga synken räcker nästan alltid — men "nästan alltid" är inte
 * gott nog när man står med telefonen i handen och undrar var mötet tog
 * vägen. Då skall det finnas en knapp som gör precis en sak, direkt, utan
 * att man först måste leta i en panel.
 *
 * Ingenting kan gå förlorat: lokala ändringar sammanfogas som vanligt och
 * skickas upp i samma körning.
 */
export function HamtaKnapp() {
  const { molnetFinns, session, synkLage, synkaOmAllt } = useButik();
  const [kvitto, setKvitto] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  if (!molnetFinns || !session) return null;

  const arbetar = synkLage.tillstand === "synkar";

  const kor = async () => {
    setKvitto(null);
    await synkaOmAllt();
    // Kvittot läses ur butikens läge efter körningen. Att visa "hämtade
    // N" en kort stund är hela skillnaden mellan en knapp man litar på
    // och en som känns som om den inte gjorde något.
    setKvitto("klart");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setKvitto(null), 3000);
  };

  const etikett = arbetar
    ? "…"
    : kvitto
    ? synkLage.tillstand === "fel"
      ? "✕"
      : `✓ ${synkLage.ner}`
    : "↻";

  return (
    <button
      type="button"
      className="knapp micro tabnum"
      onClick={() => void kor()}
      disabled={arbetar}
      title="Hämta om allt från Supabase. Lokala ändringar behålls och skickas upp."
      aria-label="Hämta om allt från molnet"
    >
      {etikett}
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
              Bygget saknar molnnycklar —{" "}
              <b>NEXT_PUBLIC_SUPABASE_URL</b> och{" "}
              <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> saknas. Kalendern fungerar
              precis som vanligt, men bara på den här enheten. Lokalt sätts de i{" "}
              <b>.env.local</b>, på Netlify under Environment variables — och
              bygget måste köras om efteråt, eftersom värdena bakas in vid
              bygget.
            </p>
          )}

          {!molnetFinns && (
            <p className="pico opacity-55 leading-relaxed">
              Går deployen ändå inte igenom: Netlify genomsöker bygget efter
              värden som liknar hemligheter och avbryter deployen om den
              hittar några — och <b>NEXT_PUBLIC_*</b> hamnar med flit i
              klientkoden. Undantaget står numera i <b>netlify.toml</b>{" "}
              (SECRETS_SCAN_OMIT_KEYS). Kontrollera också att variablernas{" "}
              <b>scope</b> omfattar <b>Builds</b> och att de gäller för{" "}
              <b>Production</b>.
            </p>
          )}

          {molnetFinns && !session && (
            <p className="pico opacity-55 leading-relaxed">
              Utan inloggning skickas ingenting upp och ingenting hämtas ner.
              Kontot skapas i Supabase under <b>Authentication → Users</b>.
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

              <button
                type="button"
                className="knapp micro"
                onClick={() => void synkaOmAllt()}
              >
                Hämta om allt från molnet
              </button>

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

          {/* Felsökningen ligger utanför de andra blocken med flit. Den
              behövs som mest när man INTE är inloggad eller när nycklarna
              saknas — precis de lägen där den tidigare var otillgänglig. */}
          <details className="border border-ink" open={!session}>
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
                  <Rad namn="Bygge" varde={diagnos.bygge} bra />
                  <Rad
                    namn="Nycklar i bygget"
                    varde={diagnos.nycklar ? "Ja" : "Nej"}
                    bra={diagnos.nycklar}
                  />
                  {diagnos.vardnamn && (
                    <Rad namn="Projekt" varde={diagnos.vardnamn} bra />
                  )}
                  <Rad
                    namn="Inloggad"
                    varde={diagnos.epost ?? (diagnos.inloggad ? "Ja" : "Nej")}
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
                        : "Ej provat"
                    }
                    bra={diagnos.tabeller === "ok"}
                  />
                  <Rad
                    namn="Skrivning"
                    varde={
                      diagnos.skrivning === "ok"
                        ? "Går igenom"
                        : diagnos.skrivning === "nekad"
                        ? "Nekas"
                        : diagnos.skrivning === "fel"
                        ? "Fel"
                        : "Ej provat"
                    }
                    bra={diagnos.skrivning === "ok"}
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
                  {diagnos.ratext && (
                    <p className="pico opacity-40 leading-relaxed break-all">
                      Svar från databasen: {diagnos.ratext}
                    </p>
                  )}
                </dl>
              )}

              <p className="pico opacity-45 leading-relaxed">
                Provet läser OCH skriver på riktigt. Läsning kan fungera där
                skrivning nekas — det är två olika regler i
                radnivåsäkerheten, och bara ett skrivprov avslöjar det.
              </p>
            </div>
          </details>
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
