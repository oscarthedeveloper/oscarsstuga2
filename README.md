# Kalendariet

En kalender, en att göra-lista och ett anteckningsblock i samma app —
byggt i Next.js. Fem vyer, dragbara händelser, fullständiga
upprepningsregler, fångst av fri text, sök tvärs över allt och
`[[kopplingar]]` mellan posterna. Offline först: allt fungerar utan nät
och synkas till Supabase när nätet finns. Installerbar på telefonen.

Designsystemet är hämtat oförändrat från **Fornsvenska Studielabbet**: samma
fem grundfärger, samma två typsnittsfamiljer, samma hårfina 1px-ramar,
hörnparenteser och kolofonremsor. Inga rundade hörn, ingen grotesk.

```
npm install
npm run dev      # http://localhost:3000
npm test         # 161 prov: upprepningar, kalendrar, uppgifter, layout,
                 #            tolk, sök, kopplingar, synk, vyer
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

## Att göra

En andra sida i samma app — samma butik, samma kalendrar, samma synk.
Växla i navigeringsraden, eller sök *Visa att göra* i paletten.

Varje uppgift har en **styrka**: 1 gäller först, 3 när det finns tid.
Styrkan visas både som siffra och som tre streck där de fyllda är
styrkan — en ensam accentfärg hade sagt "viktigt" utan att säga hur
viktigt, och varit osynlig för den som inte skiljer färger åt.

Uppgifter **kategoriseras med kalendrarna** — Arbete, Privat, Studier —
och ärver deras färg och namn. Byter du namn på en kalender följer
uppgifterna med; raderar du en frågar appen vart de skall ta vägen,
precis som för händelserna.

Ordningen är listans hela poäng: klara sist, sedan starkast styrka,
och inom samma styrka det som förfaller snarast. En uppgift utan datum
hamnar efter en med — ett satt datum är ett löfte, ett tomt fält ett
önskemål. Styrkan väger dock alltid tyngre än datumet, annars styr
kalendern prioriteringen i stället för du.

Ett förfallodatum är frivilligt. Passeras det markeras raden med accent
och räknas i fotens *försenade*.

## Fångst

Tryck `⌘K` (eller `⌕` på telefonen), skriv en rad, tryck `⏎`.

```
lunch med Anna kl 12              → händelse idag 12:00–13:00
möte med styrelsen #arbete 14:00-15:30 på måndag
ring tandläkaren på fredag        → uppgift som förfaller på fredagen
lämna in deklarationen !1 den 2 maj
semester heldag 24 dec
```

**Klockslag avgör sorten.** Ett klockslag betyder att saken äger en plats i
tiden — en händelse. Ett datum utan klockslag betyder att något skall vara
gjort senast då — en uppgift. Regeln går att köra över med `möte:` eller
`uppgift:` först i raden.

| Skrivsätt | Betyder |
| --- | --- |
| `kl 14`, `14:00`, `13-16`, `kl 9 till 9.30` | Klockslag och spann |
| `i 2 timmar`, `90 min`, `en halvtimme` | Längd |
| `idag`, `imorgon`, `övermorgon`, `på fredag`, `nästa måndag` | Dag |
| `om 3 dagar`, `om en vecka`, `nästa vecka` | Relativ dag |
| `24/12`, `24 dec`, `den 2 maj`, `2026-12-24` | Datum |
| `heldag` | Hela dagen |
| `#arbete`, `#privat` (prefix räcker: `#arb`) | Kalender |
| `!1`, `!2`, `!3` | Styrka på uppgifter |

Tolken **gissar aldrig i hemlighet**: allt den känt igen står i klartext
under raden innan du trycker `⏎`. Det den inte känner igen blir titeln —
`köp 2-3 liter mjölk` blir en uppgift med den titeln, inte ett möte
klockan två. Inled raden med `+` för att tvinga fram fångst.

## Sök

Samma fält söker i **allt** — händelser, uppgifter och anteckningar. För
att hitta något skall du inte behöva minnas var det ligger.

Ordningen är säkerhet, inte antal träffar: exakt titel slår titelbörjan
slår titelinnehåll slår brödtext. Sammansättningar räknas som ord i följd,
så `styrelse möte` hittar *Styrelsemöte*. Avbockade uppgifter kommer med
men aldrig överst.

Skriver du tid eller datum tolkar appen det som att du skriver något
nytt, och fångsten hamnar överst. Gör du inte det ligger träffarna först.

## Anteckningar

Det tredje benet. Händelsen äger en plats i tiden, uppgiften en avsikt,
anteckningen det man vet.

En anteckning kan höra till **en dag** — dagboken — eller till ingen dag
alls. Samma post, samma tabell; skillnaden är att fältet är satt.
Kalendern delas med de andra två, så en anteckning märkt Arbete ärver
samma färg och samma filter som mötet den handlar om. Nålade ligger
överst, resten sorteras på senast ändrad.

Texten sparas medan du skriver.

## Kopplingar

Skriv `[[titel]]` i vilket fritextfält som helst — anteckningens brödtext,
händelsens eller uppgiftens anteckning — så pekar posten dit.

Varje post visar båda riktningarna: **Pekar på** och **Nämns i**, den
senare med meningen länken stod i. Det är det som gör de tre sorterna
till en väv i stället för tre register.

Länkar till något som **inte finns ännu** är det normala läget, inte ett
fel: man skriver `[[kvartalsrapporten]]` när man tänker på den och skapar
posten sedan. En sådan länk ritas som ett tomrum att fylla, och ett klick
skapar anteckningen.

Titeln är identiteten, inte id:t. Priset är att en omdöpt post tappar sina
inlänkar — men en länk med ett id i vore oläsbar för människan som skriver
den, och då är det inte längre en anteckning.

## Mobil

Appen är byggd för att användas med tummen.

- Sidopanelen blir en låda bakom ☰; vyväxlaren flyttar ned till en
  bottenrad inom räckhåll.
- Vyväxlaren finns **bara** i bottenraden. Navigeringsraden bär ☰, Idag,
  rubriken och `⌕`. (Fram till nu syntes sid- och vyväxlaren även däruppe,
  dubblerade mot bottenraden — se *Ett CSS-lager värt att känna till*.)
- **Bläddra genom att svepa** i sidled över kalenderytan. Steget följer
  vyn: en dag i dagsvyn, ett år i årsvyn. Gesten läses på släppet och
  hindrar aldrig den lodräta rullningen — hade rörelsen fångats medan
  den pågick skulle rutnätet inte gå att rulla.
- Bottenraden är **två våningar** på kalendersidan: `‹ D 3D V M Å ›`
  överst, sedan Kalender / Att göra / Anteckn. / `+`. Stegknapparna låg
  tidigare bara uppe i navigeringsraden, klämda mellan ☰ och en avklippt
  rubrik — alltså längst från tummen och lätta att missa helt.
- Palettknappen `⌕` finns i navigeringsraden även på telefon. Fångst och
  sök är det viktigaste appen har, och de får inte kräva tangentbord.
- Dagsvyn väljs automatiskt på telefonbredd — sju kolumner på en
  telefonskärm blir sju remsor ingen kan läsa.
- Panelerna kommer upp som bottenark i stället för sidopaneler.
- Fälten är minst 16px, annars zoomar iOS in vid fokus och hela layouten
  hoppar.
- På att göra-sidan rullar filterraden i sidled i stället för att
  radbryta. Sex kalendrar plus två lägen blir tre rader på en telefon,
  och tre rader krom ovanför en lista äter upp själva listan.
- Bocken har en osynlig träffyta på 44px runt sin 22-pixelsruta. Rutan
  är rätt storlek men fel mål: ett finger täcker fyrtio pixlar, och en
  bock man missar är värre än ingen bock alls.
- Anteckningarna visar lista **eller** skrivyta, aldrig båda. En skrivyta
  som delar höjd med en lista blir för kort att skriva i, och en lista
  under ett tangentbord går inte att läsa.

**Tangentbordet krymper appen.** `100dvh` vet ingenting om tangentbordet:
på iOS krymper `visualViewport` medan `innerHeight` står kvar, så appen
tror att den är hela skärmen hög och bottenraden, skrivytans nederkant och
panelernas Spara-knapp hamnar bakom det. Eftersom skalet är
`overflow: hidden` kan webbläsaren inte rulla fram fältet heller.
Skillnaden mellan de två höjderna mäts därför upp och skrivs som
`--tangentbord`, som skalet, paletten och bottenarken krymper efter.
Se `useTangentbord` i `lib/anvandMedia.ts`.

**Drag på pekskärm sker efter långtryck.** Ett finger som drar ett block
och ett finger som rullar rutnätet ser likadana ut i början, så de måste
skiljas åt i tid: håll kvar en halv sekund, blocket lyfter, och sedan drar
du. Rör sig fingret innan dess är det en rullning och gesten lämnas till
webbläsaren. Alternativet — att låta blocket äga gesten direkt — gör att
rutnätet inte går att rulla just där det ligger händelser, vilket är precis
där man vill rulla.

## Överlappande händelser

Två möten på samma tid **läggs på varandra**, förskjutna åt höger, i
stället för att halvera varandras bredd.

```
FÖRE — delar bredden        EFTER — trappa
┌─────────┬─────────┐      ┌───────────────────┐
│ Pass    │ Möte    │      │   ┌───────────────┤  ← kortast överst
│ 09–12   │ 09–9:30 │      │   │ Möte  09–9:30 │
│         │         │      ├───┴───────────────┤
│         │         │      │ Djuparbete 09–12  │
└─────────┴─────────┘      └───────────────────┘
```

Den delade bredden straffade hela dagen för en enda krock: tre möten
mellan nio och tio gjorde varje block en tredjedel brett, och i dagsvyn
på en telefon blev det tre remsor där ingen titel gick att läsa.

**Den som börjar först ligger överst — och vid samma starttid den som är
kortast.** Starttiden är den ordning man läser dagen i. Längdregeln är
den som gör trappan användbar på en riktig arbetsdag: ett halvtimmesmöte
inne i ett tvåtimmarspass skall ligga ovanpå passet, inte begravas under
det. Utan den vore det långa blocket alltid överst helt enkelt för att
det är långt, och då syns aldrig de korta mötena — som är just de man
behöver se.

Staplingen följer därför **inte** spåren. Spåren fördelas längsta först,
eftersom det packar snyggast och låter passet ligga kvar i vänsterkant i
full bredd; staplingen räknas för sig.

**Det översta blocket släpper igenom.** Ytan är 72 % täckande, så det
undre blockets text går att ana. Ramen, färgribban och den egna texten
står kvar helt täckande — hade `opacity` lagts på hela blocket hade även
det översta mötets titel bleknat, och två svårlästa block är sämre än ett
läsbart och ett skymt. Vrid på `--overlapp-tackning` i `globals.css` om
du vill ha det skarpare eller mer genomlyst.

Genomskinligheten sätts bara på block som **faktiskt** täcker något
annat i tiden. Ett block utan något under sig skulle annars släppa igenom
rutnätets linjer, vilket läser som ett fel snarare än som ett djup.

Spåren **återanvänds**, vilket är hela poängen — ett möte klockan fjorton
skjuts inte in bara för att två möten krockade klockan nio. Vid många
krockar trycks stegen ihop i stället för att svämma över kolumnen; det
understa blocket behåller alltid drygt en fjärdedel av bredden.

Se `lib/layout.ts` och `test/layout.test.ts`.

## Ett CSS-lager värt att känna till

Egna klasser som skrivs **efter** `@tailwind utilities` hamnar efter
verktygsklasserna i utdatan, och vid samma specificitet vinner den som
står sist. `.knapp-rad { display: flex }` slog därför ut `hidden`
fullständigt: sid- och vyväxlaren bar `hidden md:flex` men syntes ändå på
telefonen.

Regeln ligger nu i `@layer components`, som sorteras före verktygen.
**Lägger du till en egen klass som sätter `display`, gör samma sak** —
annars slutar Tailwinds `hidden`, `flex` och `block` att fungera på varje
element som bär klassen, tyst.

Klasser som sätter något annat än `display` går det bra att låta ligga
kvar: koden ropar redan högre med `!` där den behöver slå `.knapp` eller
`.falt` (`!px-3`, `!w-auto`, `!border-0`).

## Offline och synk

Den lokala kopian är den appen ritar och skriver mot, alltid. Molnet är en
spegel som hinner ikapp. Ingenting i gränssnittet väntar på en
nätverksrunda.

Två lägen gör att ingenting synkas trots att appen ser helt normal ut:
bygget saknar molnnycklar, eller enheten är inte inloggad. Båda syns nu
som en röd remsa högst upp, och inloggningen öppnas av sig själv första
gången ett bygge med nycklar startar utan session. Att bara visa en liten
knapp räckte inte — appen fungerar perfekt utan inloggning, så ingenting
får en att leta efter den.

Statusknappen i navigeringsraden säger alltid sanningen med ett ord:
*Synkad*, *Offline*, `↑ 3`, eller *Logga in*. Ändringar gjorda offline
ligger kvar och skickas upp när nätet kommer tillbaka. Bakom knappen finns
en felsökningsruta som frågar molnet på riktigt när något inte kommer fram.

Molnet knackar på via Supabase Realtime när en annan enhet skrivit, så en
kalender som ligger uppslagen på två skärmar håller sig i takt. Pollning
var trettionde sekund finns kvar som reserv.

Bredvid statusknappen sitter **↻** — tvångshämtningen. Den glömmer var
synkningen stod och läser om hela kalendern från Supabase, och visar sedan
kort hur många poster som kom hem. Lokala ändringar sammanfogas som
vanligt och skickas upp i samma körning, så ingenting kan gå förlorat.
Samma sak finns i paletten som *Hämta om allt från molnet*. Knappen ritas
bara när bygget har molnnycklar och enheten är inloggad — en knapp som
inte kan göra något är värre än ingen knapp alls.

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
lib/layout.ts        Trappan för överlappande block
lib/butik.ts         Lagringslager, kalenderoperationer, gravstenar
lib/synk.ts          Sammanfogning mot molnet, senaste-vinner
lib/supabase.ts      Klienten — null när nycklar saknas
lib/anvandMedia.ts   Mediefrågor som React-tillstånd
lib/tolka.ts         Fångsttolken — fri svensk text till en post
lib/sok.ts           Sök över händelser, uppgifter och anteckningar
lib/kopplingar.ts    [[haklänkar]], uppslag och bakåtlänkar
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
components/AttGora.tsx         Att göra: styrka, kategori, förfallodatum
components/Anteckningar.tsx    Lista och skrivyta, med kopplingarna
components/Kopplingar.tsx      "Pekar på" och "Nämns i" — samma i alla paneler
components/Konto.tsx           Inloggning och synkstatus
components/Offline.tsx         Service worker, offlineremsa, uppdatering

public/sw.js                   Cachestrategier per sorts förfrågan
supabase/schema.sql            Tabeller, RLS och trigger
```

## Lagring

Kalendern startar **tom** — ingen exempeldata sås. Allt du skriver sparas i
`localStorage` under nyckeln `kalendariet.v3`. Anteckningarna bumpade inte
nyckeln till v4 med flit: ett fält som saknas i ett äldre lager är inte ett
trasigt lager utan ett äldre, och läses som en tom lista. Hade nyckeln
bumpats hade varje befintlig enhet öppnat appen och funnit den tom. Kommandot **Töm kalendern**
i paletten (`⌘K`) raderar allt på en gång, och går att ångra med `⌘Z`.

Läsning och skrivning går genom gränssnittet `Lager` i `lib/butik.ts`. Ingen
komponent rör lagringen direkt. Molnlagret ligger ovanpå, inte i stället för:
localStorage är fortfarande sanningen appen ritar från, även när Supabase är
inkopplat.

Demomaterialet som tidigare såddes automatiskt ligger kvar i
`test/provdata.ts`, där det tjänar som underlag för renderingsproven.

## Prov

`npm test` kör nio sviter:

- **Upprepningsmotorn** — 22 prov över skottår, korta månader, sommartid,
  räknade serier sedda genom sena fönster, undantag och flyttade förekomster.
  Körs grönt i Europe/Stockholm, UTC, America/Los_Angeles och Australia/Sydney.
- **Kalendrarna** — 15 prov över namnbyte, färg och borttagning.
- **Layouten** — 15 prov över trappan: att varje block når högerkanten,
  att den som börjar först hamnar överst och det kortaste vid lika start,
  att starttiden väger tyngre än längden, att genomskinligheten bara
  sätts när något verkligen ligger under, att spår återanvänds, och att
  en krock på morgonen inte krymper eftermiddagen.
- **Fångsttolken** — 32 prov mot en fast tidpunkt, med tyngdpunkt på vad
  tolken INTE får göra: `köp 2-3 liter mjölk` blir ingen bokning, `boka 3
  stolar` tappar inte sina stolar till en månadstolkning.
- **Söket** — 12 prov, nästan alla om ordningen. En träfflista är i
  praktiken sin första rad.
- **Kopplingarna** — 12 prov över skiftläge, blanksteg, mål som saknas och
  poster som länkar till sig själva.
- **Synken** — 23 prov över sammanfogningen vid krock, gravstenar,
  offlinekön och synkmarkören. Skrivna som berättelser om två enheter, eftersom det är så
  felen uppstår: telefonen i tunnelbanan och datorn på kontoret ändrar
  samma möte och möts först en timme senare.
- **Uppgifterna** — 16 prov, mest om sorteringen. En att göra-lista är i
  praktiken sin ordning: står fel sak överst gör man fel sak, och det
  märks inte förrän dagen är slut.
- **Vyerna** — 12 prov som renderar varje vy och varje panel till HTML och
  kontrollerar att de innehåller det de skall, inklusive att kolumnpackningen
  faktiskt delar bredden mellan krockande block.
