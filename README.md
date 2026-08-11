# Kalendariet

En kalender byggd i Next.js. Fem vyer, dragbara händelser och fullständiga
upprepningsregler. Offline först: allt fungerar utan nät och synkas till
Supabase när nätet finns. Installerbar på telefonen.

Designsystemet är hämtat oförändrat från **Fornsvenska Studielabbet**: samma
fem grundfärger, samma två typsnittsfamiljer, samma hårfina 1px-ramar,
hörnparenteser och kolofonremsor. Inga rundade hörn, ingen grotesk.

```
npm install
npm run dev      # http://localhost:3000
npm test         # 71 prov: upprepningar, kalendrar, synk och vyer
npm run typecheck
```

Utan `.env.local` kör appen helt lokalt, utan inloggning och utan synk.
Se **[DEPLOY.md](DEPLOY.md)** för Supabase och Netlify.

## Vyer

| Vy | Tangent | Vad den gör |
| --- | --- | --- |
| Dag | `1` | Ett dygn, full upplösning |
| Tre dagar | `2` | Tre dygn sida vid sida |
| Vecka | `3` | Måndag till söndag, ISO-veckonummer |
| Månad | `4` | Sex rader à sju dygn, alltid 42 rutor |
| År | `5` | Tolv minimånader med täthetsmarkering |

## Så flyttar man saker

- **Dra ett block** i tidsrutnätet — det snäpper i kvartar och följer pekaren
  över dygnsgränser. En avläsning längst ned visar exakt tid medan man drar.
- **Dra kanten** på ett block för att ändra längden.
- **Dra i tomt rutnät** för att rita upp en ny händelse.
- I månadsvyn dras händelser mellan dygn; klockslaget följer med oförändrat.
- Allt kan ångras med `⌘Z` / `Ctrl+Z`.

Interaktionen bygger på pointer-händelser, inte HTML5:s drag-and-drop. Det
senare kan inte följa pekaren kontinuerligt och beter sig olika i varje
webbläsare; `setPointerCapture` ger samma kod för mus, penna och finger.

## Upprepningar

Modellen är en delmängd av RFC 5545 (iCalendar RRULE) — samma begrepp och
samma kantfall, men bara det en människa faktiskt ställer in:

- varje dag, varje vardag (mån–fre), varje vecka, varje månad, varje år
- intervall: var n:te dag/vecka/månad/år
- veckovis på valfria veckodagar
- månadsvis antingen på **datumet** (den 15:e) eller på **veckodagen**
  (tredje onsdagen, sista fredagen)
- slut: aldrig, vid ett datum, eller efter ett antal gånger

Tre saker motorn gör rätt och som brukar gå sönder:

1. **Fasen hålls.** Förekomster räknas alltid från seriens ursprung, aldrig
   från fönstrets början — annars glider "var tredje vecka" när man bläddrar.
2. **Omöjliga datum hoppas över.** Den 31:e finns inte i februari, och den
   29 februari finns bara skottår. Serien hoppar över månaden i stället för
   att glida till den 28:e eller den 1:a.
3. **Väggklockan står still.** Ett möte 09:00 ligger 09:00 även den natt
   klockan ställs om. Tidpunkter byggs av år/månad/dag/timme, aldrig genom
   att addera millisekunder.

Varje förekomst identifieras av sitt **ursprungsdatum** — det datum mönstret
pekar ut — även om just den förekomsten flyttats. Därför dyker en flyttad
förekomst inte upp två gånger, och en struken förekomst förblir struken när
serien i övrigt ändras.

När en händelse i en serie ändras frågar appen alltid vad ändringen skall
gälla: **endast denna**, **denna och alla senare**, eller **hela serien**.
Att gissa åt användaren där är det snabbaste sättet att förstöra en kalender.

## Kalendrar

Händelser tillhör en kalender — Arbete, Studier, vad du vill. Klicka
**Hantera** i sidopanelen, eller sök upp *Hantera kalendrar* i paletten:

- lägg till, byt namn, byt färg
- visa och dölj (alt-klick på en rad i sidopanelen isolerar den)
- ta bort

När en kalender som innehåller händelser tas bort frågar appen vart de skall
ta vägen: flytta till en annan kalender, eller radera dem med. En händelse får
aldrig bli kvar med en kalender som inte finns — den skulle bli osynlig men
fortsätta ligga i lagret. Den sista kalendern går inte att ta bort, eftersom
nya händelser måste kunna hamna någonstans.

Sex färgtoner finns; fler kalendrar än så får dela på dem. Namnet, inte
färgen, bär alltid informationen.

## Mobil

Appen är byggd för att användas med tummen.

- Sidopanelen blir en låda bakom ☰; vyväxlaren flyttar ned till en
  bottenrad inom räckhåll.
- Dagsvyn väljs automatiskt på telefonbredd — sju kolumner på en
  telefonskärm blir sju remsor ingen kan läsa.
- Panelerna kommer upp som bottenark i stället för sidopaneler.
- Fälten är minst 16px, annars zoomar iOS in vid fokus och hela layouten
  hoppar.

**Drag på pekskärm sker efter långtryck.** Ett finger som drar ett block
och ett finger som rullar rutnätet ser likadana ut i början, så de måste
skiljas åt i tid: håll kvar en halv sekund, blocket lyfter, och sedan drar
du. Rör sig fingret innan dess är det en rullning och gesten lämnas till
webbläsaren. Alternativet — att låta blocket äga gesten direkt — gör att
rutnätet inte går att rulla just där det ligger händelser, vilket är precis
där man vill rulla.

## Offline och synk

Den lokala kopian är den appen ritar och skriver mot, alltid. Molnet är en
spegel som hinner ikapp. Ingenting i gränssnittet väntar på en
nätverksrunda.

Statusknappen i navigeringsraden säger alltid sanningen med ett ord:
*Synkad*, *Offline*, `↑ 3`, eller *Logga in*. Ändringar gjorda offline
ligger kvar och skickas upp när nätet kommer tillbaka. Bakom knappen finns
en felsökningsruta som frågar molnet på riktigt när något inte kommer fram.

Molnet knackar på via Supabase Realtime när en annan enhet skrivit, så en
kalender som ligger uppslagen på två skärmar håller sig i takt. Pollning
var trettionde sekund finns kvar som reserv.

Vid krock vinner senaste ändringen hela posten. Borttagningar sker med
gravstenar, så att en post inte återuppstår när en enhet som varit offline
synkar. Utförligt i [DEPLOY.md](DEPLOY.md).

## Tangentbord

| | |
| --- | --- |
| `1` – `5` | Byt vy |
| `←` `→` | Föregående / nästa period |
| `T` | Idag |
| `N` | Ny händelse |
| `⌘K` | Kommandopalett |
| `⌘Z` / `⇧⌘Z` | Ångra / gör om |
| `+` `−` | Zooma rutnätet |
| `⏎` | Öppna markerad händelse |
| `⌫` | Radera markerad händelse |
| `Esc` | Avbryt drag, avmarkera, stäng |

Filterklick — att visa och dölja kalendrar — hamnar avsiktligt utanför `⌘Z`.
Det är en inställning för ögat, inte en ändring av innehållet, och ångra skall
inte behöva kliva bakåt genom en rad filterklick för att nå en riktig ändring.

Paletten förstår också datum: skriv `imorgon`, `+10`, `24 dec`, `24/12 2027`
eller `2026-12-24` så erbjuder den att hoppa dit.

## Kod

```
lib/tid.ts           Datumaritmetik i lokal tid — inga UTC-fallgropar
lib/upprepning.ts    Upprepningsmotorn, RRULE-delmängd
lib/layout.ts        Kolumnpackning för överlappande block
lib/butik.ts         Lagringslager, kalenderoperationer, gravstenar
lib/synk.ts          Sammanfogning mot molnet, senaste-vinner
lib/supabase.ts      Klienten — null när nycklar saknas
lib/anvandMedia.ts   Mediefrågor som React-tillstånd
lib/typer.ts         Datamodellen

components/Butik.tsx           React-sidan av lagret, med ångra/gör om
components/KalenderApp.tsx     Skalet: navigering, vyval, tangentbord
components/vyer/TidsRutnat.tsx Motorn bakom dag-, tredagars- och veckovy
components/vyer/ManadsVy.tsx   Månadsvyn
components/vyer/ArsVy.tsx      Årsvyn
components/HandelsePanel.tsx   Redigering, inklusive upprepningsformuläret
components/KalenderPanel.tsx   Lägg till, byt namn, ta bort kalendrar
components/Kommandopalett.tsx  ⌘K
components/Sidopanel.tsx       Minimånad, kalenderfilter, dagens lista
components/Konto.tsx           Inloggning och synkstatus
components/Offline.tsx         Service worker, offlineremsa, uppdatering

public/sw.js                   Cachestrategier per sorts förfrågan
supabase/schema.sql            Tabeller, RLS och trigger
```

## Lagring

Kalendern startar **tom** — ingen exempeldata sås. Allt du skriver sparas i
`localStorage` under nyckeln `kalendariet.v3`. Kommandot **Töm kalendern**
i paletten (`⌘K`) raderar allt på en gång, och går att ångra med `⌘Z`.

Läsning och skrivning går genom gränssnittet `Lager` i `lib/butik.ts`. Ingen
komponent rör lagringen direkt. Molnlagret ligger ovanpå, inte i stället för:
localStorage är fortfarande sanningen appen ritar från, även när Supabase är
inkopplat.

Demomaterialet som tidigare såddes automatiskt ligger kvar i
`test/provdata.ts`, där det tjänar som underlag för renderingsproven.

## Prov

`npm test` kör fyra sviter:

- **Upprepningsmotorn** — 22 prov över skottår, korta månader, sommartid,
  räknade serier sedda genom sena fönster, undantag och flyttade förekomster.
  Körs grönt i Europe/Stockholm, UTC, America/Los_Angeles och Australia/Sydney.
- **Kalendrarna** — 15 prov över namnbyte, färg och borttagning.
- **Synken** — 23 prov över sammanfogningen vid krock, gravstenar,
  offlinekön och synkmarkören. Skrivna som berättelser om två enheter, eftersom det är så
  felen uppstår: telefonen i tunnelbanan och datorn på kontoret ändrar
  samma möte och möts först en timme senare.
- **Vyerna** — 11 prov som renderar varje vy och varje panel till HTML och
  kontrollerar att de innehåller det de skall, inklusive att kolumnpackningen
  faktiskt delar bredden mellan krockande block.
