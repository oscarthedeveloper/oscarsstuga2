# Kalendariet

En kalender, en att göra-lista, ett anteckningsblock och en avdelning för
allt annat — i samma app —
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
npm test         # 290 prov: upprepningar, kalendrar, uppgifter, layout, tolk,
                 #            sök, kopplingar, högskoleprov, språk, fornsvenska,
                 #            ekonomi, synk, vyer
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

## Annat

Avdelningen för det som inte går att pressa in i **en** kategori. En väg
till läkarprogrammet är varken en händelse, en uppgift eller en
anteckning utan lite av varje, sett ur ett bestämt perspektiv.

Varje sida ritas av en **egen komponent med egen utformning**. Det är ett
medvetet val framför ett blocksystem: sidorna är olika i grunden, och ett
system som kunde uttrycka dem alla hade gjort dem lika — vilket är precis
motsatsen till poängen. Alla sidor hänger däremot i **samma kompakta
lista** till vänster, och delar avsnittsram, etiketter och sifferstil.

Att lägga till en sida är en rad i `components/sidor/register.tsx` och en
komponent bredvid.

```
lib/sidor/hogskoleprov.ts        uträkningarna, utan React
components/sidor/register.tsx    id → komponent
components/sidor/Hogskoleprov.tsx
components/sidor/block/          delade byggstenar
  Avsnitt.tsx                    ram och etikett
  Rader.tsx                      redigerbar lista
  Serie.tsx                      talserie som SVG
  Nedrakning.tsx                 datum med dygn kvar
  Jamforelse.tsx                 krävs / du har / skillnad
```

Sidans **innehåll** är däremot data. Det ligger i `sidor`-tabellen som
JSONB, synkas som allt annat, och tolkas av sidan själv. Registernyckeln
är också postens id — två enheter som öppnar samma sida skapar därför
samma rad, och krocken löses av den vanliga senaste-vinner-regeln i
stället för att bli två dubbletter att städa för hand.

Priset för JSONB är att databasen inte kan kontrollera innehållet. Det
bärs på klientsidan: `tolkaHpData` tar emot `unknown` och lämnar alltid
tillbaka något ritbart. En sida som kastar för att ett fält bytt namn är
en sida man har tappat.

### Högskoleprov och läkarprogrammet

Byggd kring **en** fråga: räcker min poäng? Därför ligger avståndet
överst och inte kurvan — kurvan säger hur det har gått, avståndet vad som
återstår.

- **Avstånd till målet** mot varje lärosäte och mot ett eget mål.
  Jämförelsen sker mot din **bästa** poäng, inte din senaste: ett sämre
  omprov tar inte bort ett bra.
- **Resultat över tid** som en trappa, med en växlare till **Delprov
  jämförda**: där är x-axeln de åtta delproven och färgen provtillfället,
  så att man läser vågrätt — "min DTK har gått från en tredjedel till två
  tredjedelar, men ORD står stilla". Hade varje delprov fått en egen kurva
  över tid skulle jämförelsen mellan delar kräva åtta diagram i huvudet
  samtidigt. Färgen bär inte informationen ensam: teckenförklaringen
  skriver ut varje termin, och råpoängen står i tabellen nedanför.
  Ett inlagt provtillfälle utan normering är ett kommande prov, inte ett
  tapp, och drar aldrig ned kurvan.
- **Delpoäng per provdel** för alla åtta delproven. Den svagaste delen
  mäts i **andel av delens maxpoäng**, inte i råpoäng: NOG har tolv
  uppgifter och DTK tjugofyra, så sex rätt betyder helt olika saker i de
  två, och en jämförelse i råpoäng pekar ut fel del att öva på varje gång.
- **Antagningspoäng** och **viktiga datum** i höger spalt. Vänster spalt
  är det som ändras när man pluggar, höger är förutsättningarna — de
  ändras sällan men behöver synas, och att rulla förbi dem för att nå
  kurvan vore att lägga det stillastående i vägen för det rörliga.
  Antagningspoängen är tomma från start: en föråldrad siffra som ser ut
  som en sanning är sämre än ett tomt fält som ber om en.
- Datumen visar **dygn kvar**. "17 oktober" säger ingenting om hur
  bråttom det är; "om 66 dygn" säger allt.

Ett provtillfälle skrivs som **HÖST25** eller **VÅR26**, inte som ett
datum. Provet ges två gånger om året och ingen minns vilken lördag i
oktober man skrev — terminen är hur man tänker på det, och dessutom allt
uträkningen behöver. Fältet tar HÖST25, host 25, H25, HT25 och VT2026
lika gärna, och skriver om sig till kanonisk form när man lämnar det.

Sidan sparas medan du skriver.

**Sifferfälten går att skriva komma i**, vilket låter självklart och inte
är det. Ett kontrollerat fält som tolkar värdet vid varje tangenttryckning
gör det omöjligt att skriva 1,70: efter kommat är texten `"1,"` som tolkas
till talet `1`, som ritas tillbaka som `"1"` — och kommat är borta innan
man hunnit skriva 7:an. `Talfalt` äger därför sin råa text medan man
skriver och skickar bara ut det tolkade värdet; texten skrivs om utifrån
först när det inkommande värdet säger något annat än det man skrivit.

### Språk

Ett bibliotek i fyra nivåer: **hylla → mapp → blad → block.**

**Hyllan är en rad.** Ett språk per rad, mapparna liggande på den, och
alla språk synliga samtidigt — man skall inte behöva välja ett språk för
att få se vad som står i det. Raden radbryter aldrig: gör den det är det
inte längre en hylla utan ett rutnät, och då försvinner just det som gör
att man ser ett språk i taget. Ligger det fler mappar än som ryms rullar
raden i sidled, och att en mapp är avklippt i kanten är signalen om att
det finns mer. Vid fler än fyra mappar finns dessutom *visa alla*, som
fäller ut hyllan till allt på en gång.

En hylla bär en ton ur kalenderpaletten. En mapp är en "bok" — väljer du
en omslagsbild visas den, annars ritas mappen som en mapp i hyllans ton.
Ett blad är ett "papper", och innehållet är block.

Ramen sitter på **omslaget**, inte runt hela mappen. En kortram gjorde
varje mapp till en ruta bland rutor; utan den är det omslaget som är
föremålet och texten bara en etikett under det. Titeln har alltid två
rader avsatta, även när den bara behöver en — annars hamnar underraderna
på olika höjd och hyllan blir en ojämn hög i stället för en hylla.

Bladet är satt som ett **dokument**, inte som ett formulär. En regel bär
hela uppställningen: **antikva för det man läser, monospace för
apparaten.** Titel, avsnittsrubrik, citat, brödtext och kommentar sätts i
Newsreader; brödsmula, underrubrik, etiketter, källor, tabelldata och
märken i Martian Mono. Ingenting blandas, och det är den enda anledningen
att sidan håller ihop trots att den bär tio sorters innehåll. Bakgrunden
har ett svagt rutnät — samma teknik som tidsrutnätet, raster i stället för
element.

Bladet bär rubrik, **underrubrik** i kapitäler och ett **utkastmärke** som
växlas genom att tryckas. Ett tillstånd man byter ofta skall inte ligga
bakom en inställningspanel.

Sidlisten är svart och kompakt, med **hela hyllans träd** — mappar och
deras blad om vartannat, inte bara den öppnade mappens innehåll. Man skall
kunna hoppa från *Dativ* till *Starka verb* utan att backa ut till hyllan.
Vokabulären är filsystemets: `▸ Namn/` för en mapp, `· Namn` för ett blad.
Snedstrecket och triangeln behöver inte läras in, och de skiljer de två
sorterna åt utan färg — vilket är nödvändigt, eftersom orange redan är
upptaget av "det här är du".

**Tio blocktyper:** text, rubrik, belägg, faktarad, tabell, böjning,
ordpar, paralleltext, flikar och anmärkning. I text fungerar `**fet**`, `*kursiv*` och
`` `kod` `` — och ingenting mer. Varje tecken som får en betydelse är ett
tecken man inte längre kan skriva utan att tänka, och den som skriver om
grammatik skriver ofta om just tecken. En ensam stjärna öppnar därför
aldrig en kursivering: `*ho andato är fel` är en mening, inte en
markering som sträcker sig genom stycket.

Fyra av blocken kommer ur dokumentationsformspråket:

- **Belägg** är ett citat med källa och kommentar. Layouten följer
  innehållet i stället för att styras av ett fält: saknas kommentaren går
  citatet i full bredd och stor grad — ett anslag — och finns den blir
  citatet en vänsterspalt med kommentaren intill. Samma block, två
  uppställningar, inget val att göra fel. Citatet bär en streckad
  vänsterkant som håller ihop det med källan utan att rita en ruta.
- **Faktarad** är etikett över värde i spalter mellan två streckade
  linjer. Skild från tabellen med flit: en tabell jämför rader med
  varandra, en faktarad räknar upp egenskaper hos *en* sak.
- **Tabellen** har bildtext i kapitäler och **framhävda rader**. En tabell
  i en grammatikanteckning finns nästan alltid för en rads skull —
  paradigmet visas helt, men det är dativen man skriver om.
- **Anmärkningen** har en solid svart flik med ordet (Not, Obs, Tips) och
  innehållet i en ramad ruta intill. Ordet bär betydelsen; flikens färg
  skiljer bara de tre slagen åt och behövs inte för att förstå rutan.

Tre är gjorda för språkstudier snarare än för dokumentation:

- **Böjning** är en tabell där första spalten är en etikettspalt, med
  färdiga uppsättningar för italienska, tyska, svenska, engelska och
  tyska kasus. Ingen skriver io/tu/lui/noi/voi/loro för hand mer än en gång.
- **Ordpar** är glosor i två spalter.
- **Paralleltext** är samma stycke på två språk sida vid sida. Varken den
  eller ordparen staplas på telefonen: två språk under varandra är inte en
  paralleltext utan två texter, och hela poängen är att kunna kasta
  blicken i sidled. Löptexten går ned i grad i stället.

Blocken läses förvalt och redigeras på knapptryck, inte på klick i
texten. Ett stycke som blir ett textfält när man klickar i det går inte
att markera med musen, och på en telefon blir varje rullning en risk att
öppna fel block. Nya block öppnas däremot direkt — där finns ingenting
att läsa ännu.

**Omslagen ligger i en egen lagerpost.** Sidan sparas medan du skriver,
och låg bilderna i samma post som texten skulle varenda omslag skickas
upp på nytt vid varje tangenttryckning. `Sida`-entiteten tar godtyckliga
id:n, så `sprak` och `sprak-omslag` kostar ingen ny maskineri.

Bilderna krymps i webbläsaren till 300 px bredd som JPEG, ungefär tjugo
kilobyte styck. Det är inte snålhet: `localStorage` rymmer omkring fem
megabyte, och ett enda omslag rakt från telefonens kamera skulle kunna
fylla lagret och tysta varje efterföljande skrivning — inklusive
kalenderns.

Mappen ritas med systemmappens silhuett men raka hörn, hårfin ram och
hyllans färg. En rundad blå systemmapp hade varit trognare macOS och
sett ut som en gäst i en app där ingenting annat är rundat.

## Mobil

Appen är byggd för att användas med tummen.

- Sidopanelen blir en låda bakom ☰; vyväxlaren flyttar ned till en
  bottenrad inom räckhåll.
- Bottenraden bär alla fyra sidorna. Nyknappen göms under Annat, där
  sidorna kommer ur registret och det inte finns något att lägga till —
  en plusknapp som inte gör något är värre än ingen.
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

### Fornsvenska

Egenstudier. Sidan svarar på **en** fråga överst — vad återstår att
skaffa fram — och därför ligger mätarpanelen först och litteraturregistret
direkt under. Att göra och idéer är småsaker vid sidan av och tar höger
spalt.

Varje verk bär en **kort stabil kod**, `FSV-014`. Den finns för att kunna
hänvisa till en post utanför appen: i en anteckning, i ett utkast, i ett
mejl till ett bibliotek. Ett slumpat id duger inte till det, och titeln är
för lång och ändrar sig.

Löpnumret tas alltid som det största av räknaren och högsta använda
nummer. Två enheter som lägger till varsitt verk offline har samma
räknare, och den som synkar sist skulle annars skriva en dubblett — vilket
är särskilt illa när koden är det man hänvisar till.

**Tre lägen:** Behövs → Har → Läst. Lägesmätaren är också knappen som
stegar framåt; att flytta en post är den vanligaste handlingen på sidan
och skall inte kräva att man först fäller ut raden.

**Slaget är fri text** — examensarbete, licentiatavhandling, utgåva,
faksimil, särtryck. Akademiska källtyper låter sig inte listas i en
rullgardin, och en lista som saknar just din typ tvingar fram fel val.

**Källhänvisningen** byggs ur de fält som råkar vara ifyllda, och tomma
delar utelämnas helt i stället för att lämna kvar sina skiljetecken. En
hänvisning med ". ." i mitten ser slarvigare ut än ingen alls.

Länkfältet godtar bara `http` och `https`. En godtycklig sträng här hamnar
i ett `href` som klickas, och `javascript:` i ett fält som synkas mellan
enheter är precis det man inte vill ha. Saneringen sker både vid
inmatning och vid tolkning.

**Att göra-listan är egen** och rör inte appens uppgifter. Det är ett val
med en känd kostnad — inga datum, ingen ⌘K-fångst, inget sök — och en känd
vinst: projektstoket förorenar inte den dagliga listan.

En **använd idé bockas av, inte raderas.** Annars fångar man samma tanke
en gång till om ett halvår.

Sidan ser avancerad ut genom **täthet och precision**, inte genom nya
färger: samma fem värden, samma hårfina linjer, samma monospace. Ett sken,
en tonad yta eller en accentfärg till hade sett modernt ut i en skärmdump
och som en gäst i appen. Accenten bärs bara av det som återstår att göra
något åt — antalet som behövs, och lägesmätaren på just de posterna.

### Privatekonomi

Gjord för kvarten före löning: pengarna kommer in och skall fördelas.
Sidan handlar om **kategorier** och aldrig om enskilda utgifter — en tröja
för 349 kronor hör inte hemma här, "Nöjen 2 000" gör det.

**Kvar att fördela** ligger överst och störst. Det är talet man arbetar
ned mot noll, och det bär accent så länge det inte är noll: antingen har
något ännu inte fått en plats, eller så har mer lovats bort än som kommer
in. Noll är målet och bär därför ingen färg.

Tre lager hålls isär:

- **Kategorierna** lever ovanför månaderna. Att de är gemensamma är hela
  förutsättningen för att kunna jämföra augusti med juli — hade varje
  månad haft sina egna rader vore "samma kategori" bara en förhoppning om
  att man stavat likadant.
- **Månaden** bär plan och utfall per kategori. Utfallet är frivilligt;
  en månad man aldrig summerade är inte en trasig månad.
- **Mallen** fyller i en ny månad, så att ritualen blir att justera och
  inte att börja om från ett tomt papper. Kategorier som saknas i mallen
  kommer med som tomma poster — en kategori som inte syns är en kategori
  man glömmer att fördela till.

Sidan räknar allt själv: andel av inkomsten, avvikelse mot plan,
sparkvot, framsteg och prognos. Ingenting av det går att skriva för hand,
eftersom ett inmatat och ett framräknat tal ser likadana ut och det
första blir fel den dag man ändrar något annat.

**Sparmålet räknas på utfall, inte på plan.** Ett mål som kryper närmare
för att man *planerat* att spara är ingen mätare utan en önskelista, och
den som ser sig vara framme utan att vara det har blivit lurad av sitt
eget verktyg. Prognosen tiger helt när takten är noll eller negativ — ett
årtal där hade varit en lögn med tre decimalers precision.

Vilka kategorier som räknas som sparande är ett eget val per kategori,
skilt från namnet. En sida som gissar på ordet "spar" gissar fel för
någon.

**Två diagram.** Månadens fördelning som en enda stapel — ögat jämför
längder bättre än vinklar, och frågan är just om sparandet är större än
nöjena. Det ofördelade får ett eget segment med raster; en stapel som
alltid är full döljer sidans viktigaste fråga. Sparandet över tid ritas
som staplar där **ramen är planen och fyllnaden utfallet**, så att
skillnaden läses direkt i stället för över ett mellanrum.

Genomgående skiljs **noll från okänt**. En ofylld kategori räknas inte in
i en summa som ser färdig ut, och utan ifylld inkomst är "kvar att
fördela" okänt — inte noll, som hade sett ut som ett svar.

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
lib/sidor/           uträkningar per sida under Annat
lib/bild.ts          krympning av omslagsbilder
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
components/Annat.tsx           Avdelningen och dess kompakta sidlista
components/sidor/              En komponent per sida, plus delade byggstenar
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

`npm test` kör tretton sviter:

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
- **Språkbiblioteket** — 26 prov över tolkningen av data databasen inte
  kontrollerar, trädstädningen (en borttagen hylla måste ta med sig sina
  mappar och blad, annars blir de kvar osynliga men synkade och växer för
  varje språk man ångrar) och markeringen.
- **Privatekonomin** — 34 prov över all matematik. Tyngdpunkten ligger på
  skillnaden mellan noll och okänt, på att sparmålet räknas på utfall och
  inte på avsikt, och på att prognosen håller tyst när den inte vet.
- **Fornsvenskasidan** — 24 prov, med tyngdpunkt på koden (en efterbliven
  räknare får aldrig ge en dubblett), på källhänvisningen (tomma fält
  lämnar inga skiljetecken efter sig) och på att bara `http` och `https`
  släpps in i ett `href`.
- **Högskoleprovssidan** — 35 prov, med tyngdpunkt på tolkningen av data
  databasen inte kontrollerar: skräp in ger en tom men ritbar sida, och
  ett tomt fält blir `null` och inte noll. (`Number("")` är 0 i
  JavaScript, vilket gjorde varje oifyllt delprov till noll rätt — och
  därmed till den svagaste delen, varje gång.) Här ligger också
  kommateckensbuggen fångad som ett prov: `"1,"` måste tolkas till samma
  tal som `"1"`, annars ser fältet sig självt som ur takt och suddar
  kommat man just skrev.
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
