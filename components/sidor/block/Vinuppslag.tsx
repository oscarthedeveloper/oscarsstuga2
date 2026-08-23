"use client";

/**
 * Vinet som ett färdigt uppslag.
 *
 * Läsläget för en öppnad rad i registret: fakta, betyg, smakprofil,
 * noter och text — inga fält, inga ramar runt värden, ingenting som ser
 * ut att vänta på en inmatning. Ett fält som ser ut som en färdig sida
 * är ändå ett fält: markören hamnar i det, texten går att råka ändra,
 * och skärmläsaren säger "inmatning" där det står ett värde.
 *
 * Eget block och inte en funktion inne i sidan, av samma skäl som
 * uppslaget på språksidan: det är den del som skall gå att titta på för
 * sig, och därmed också att prova för sig.
 */

import {
  arTomt,
  gruppTon,
  harProfil,
  kronor,
  oense,
  smaknotsFot,
  typTon,
  vinFakta,
  vinTitel,
  type Vin,
} from "@/lib/sidor/viner";
import Betygsmatare from "./Betygsmatare";
import Smakskala from "./Smakskala";

export default function Vinuppslag({ vin }: { vin: Vin }) {
  const fakta = vinFakta(vin);
  const skillnad = oense(vin);
  const harBetyg = vin.egetBetyg !== null || vin.vivinoBetyg !== null;
  const visaProfil = harProfil(vin.profil);

  if (arTomt(vin)) {
    return (
      <p className="pico opacity-45 py-3 leading-relaxed">
        Ingenting ifyllt ännu. Tryck ✎ Redigera och skriv in vinet — namnet
        räcker för att börja, resten kan fyllas i när flaskan står framför
        dig.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        {vin.bildUrl && (
          <span className="vinspalt">
            <span className="vinbild">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vin.bildUrl}
                alt={`Etikett för ${vinTitel(vin)}`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </span>
          </span>
        )}

        {/* Fakta om vinet, uppställt som förlagan: etikett till vänster,
            värde till höger, en hårfin linje mellan raderna. Att härma
            uppställningen är inte en lek — det är DÄR man läste av
            talen, och två uppställningar som skiljer sig åt gör varje
            avläsning till en översättning. */}
        {fakta.length > 0 && (
          <dl className="vinfakta flex-1 min-w-0">
            {fakta.map((r) => (
              <div key={r.etikett}>
                <dt>{r.etikett}</dt>
                <dd>{r.varde}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {harBetyg && (
        <div className="faktarad">
          <div>
            <span className="faktaetikett">Ditt betyg</span>
            <Betygsmatare
              varde={vin.egetBetyg}
              etikett="ditt betyg"
              storlek="stor"
            />
          </div>
          <div>
            <span className="faktaetikett">Vivinos betyg</span>
            <span className="flex items-baseline gap-2">
              <Betygsmatare
                varde={vin.vivinoBetyg}
                etikett="Vivinos betyg"
                storlek="stor"
              />
              {vin.vivinoAntal !== null && (
                <span className="pico opacity-40 tabnum shrink-0">
                  {kronor(vin.vivinoAntal)} rec.
                </span>
              )}
            </span>
          </div>
          {/* Skillnaden skrivs ut i ord och inte bara som två tal.
              Vilket håll som är "bättre" skall inte behöva räknas ut. */}
          {skillnad !== null && Math.abs(skillnad) >= 0.5 && (
            <div>
              <span className="faktaetikett">Ni är oense</span>
              <span className="faktavarde">
                Du tyckte {skillnad > 0 ? "bättre" : "sämre"}
              </span>
            </div>
          )}
        </div>
      )}

      {(visaProfil || vin.uppgifterSaknas) && (
        <div>
          <span className="matarnamn">Hur smakar detta vin?</span>
          {visaProfil ? (
            <Smakskala profil={vin.profil} ton={typTon(vin.typ)} />
          ) : (
            <p className="pico opacity-45 leading-relaxed">
              Vinet går inte att slå upp, så det finns ingen smakprofil att
              visa.
            </p>
          )}
        </div>
      )}

      {vin.smaknoter.length > 0 && (
        <div>
          <span className="matarnamn">Smaknoter</span>
          <div className="smakkortrad">
            {vin.smaknoter.map((n) => (
              <div
                key={n.id}
                className="smakkort"
                style={{
                  borderColor: `var(--kal-${gruppTon(n.grupp) + 1}-stark, var(--ink))`,
                }}
              >
                <span
                  className="smakkorthuvud"
                  style={{ background: `var(--kal-${gruppTon(n.grupp) + 1})` }}
                >
                  <span className="smakord-text">{n.ord || "Namnlös not"}</span>
                </span>
                <span className="smakkortfot">
                  <span className="pico opacity-55">{smaknotsFot(n)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beskrivningen är avskriven; anteckningen är din. De skiljs åt
          med en etikett och inte bara med ett mellanrum — den ena är
          något någon annan tyckte, den andra är vad DU tyckte, och det
          är inte samma sorts påstående. */}
      {vin.beskrivning.trim() && (
        <div>
          <span className="matarnamn">Vinbeskrivning</span>
          <p className="brodtext vintext">{vin.beskrivning}</p>
        </div>
      )}

      {vin.anteckning.trim() && (
        <div className="vinanteckning">
          <span className="matarnamn">Din anteckning</span>
          <p className="brodtext vintext">{vin.anteckning}</p>
        </div>
      )}
    </div>
  );
}
