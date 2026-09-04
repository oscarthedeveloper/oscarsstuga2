# Oscars databas

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
npm test         # 304 prov: upprepningar, kalendrar, uppgifter, layout, tolk,
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

## Gjort

Under heldagsfältet ligger en andra remsa: **Gjort**. Där för man in
sådant som redan hänt — "Sprungit", "1,45 h HP-plugg", "Styrketräning",
"Läst 40 sidor av X". Klicka i dagens ruta, skriv, tryck `⏎`. Fältet
töms och står kvar, så nästa rad kan skrivas direkt: man för sällan in
en enda sak, man för in dagens.

**Den femte sorten, och gränsen går vid tempus.** En händelse äger en
plats i tiden och är en avsikt tills den passerat. En uppgift äger en
avsikt och bockas av när den är gjord. En anteckning äger det man vet.
En lapp blir en händelse. Ett *gjort* går inte att bocka av — det är
redan gjort — och det har ingen varaktighet att rita ut i rutnätet, bara
en dag och en rad text.

Att pressa in det bland uppgifterna hade betytt en att göra-lista full
av sådant man redan gjort, med en bock satt i samma stund raden skrevs.
Att göra det till en heldagshändelse hade fyllt heldagsremsan med sådant
som inte upptar en dag.

**Texten är fri, med flit.** "1,45 h HP-plugg" är hur man själv skriver
det. Ett fält som krävde ett tal i en ruta och en etikett i en annan
hade gjort en anteckning på fem sekunder till ett formulär, och appen
räknar ändå ingenting på dem — den minns. Det enda som städas är
ytterkanterna och dubbla mellanrum; innehållet rörs inte, för ett fält
som rättar sitt eget innehåll är ett fält man slutar lita på.

**Kalendern väljs inte vid inmatningen.** Man skriver "Sprungit" och
vill inte peka i en rullgardin först. Raden får den kalender den senast
fick, och går att flytta efteråt genom att klicka på den. Färgen ligger
som en kant till vänster i stället för som en fylld yta — en fylld yta
hade gjort remsan till ett fält av färg, och det som skall läsas är
orden.

Cellen **är** träffytan. Den är stor och mest tom, och att kräva att man
träffar en liten plusknapp hade gjort den vanligaste handlingen till den
svåraste. Plusknappen finns ändå, som genväg, och syns när pekaren är i
cellen. En tömd rad är en raderad rad: att lämna kvar en tom ruta i
remsan vore att spara ett misstag.

Remsan **rullar inte med** rutnätet. Det man gjort skall stå kvar i
synfältet medan man bläddrar i timmarna. Den ritas i dags-, tredagars-
och veckovyn — månadsrutan är för liten för en rad text bredvid
händelserna.

Ett datum som inte är en dagnyckel blir **tomt, inte "idag"**. Raden
syns då inte i remsan men ligger kvar i lagret och går att rätta; ett
gissat datum hade lagt något man gjorde i mars på dagens rad.

**Gjort synkar som allt annat**, men tabellen tillkom efter att appen
redan var i drift. Kör `supabase/schema.sql` (eller bara dess
`gjort`-avsnitt) i Supabase SQL-editorn. Innan dess fungerar remsan
lokalt: synkmotorn känner igen "den där tabellen finns inte" och tiger
just om det, precis som för parkeringen — men den säger det numera i
konsolen, och felsökningsrutan under statusknappen räknar upp vilka
tabeller som saknas vid namn. Se *En tystnad som kostade en kväll*.

## Parkeringen

I sidopanelens svarta fält, under kalendrarna, ligger **Utan datum**: det
som skall in i kalendern men ännu inte har fått en tid. "Träffa Anna
någon gång i veckan" är en sådan sak. Skriv raden, tryck `⏎`, och dra
sedan ut lappen i rutnätet när dagen är bestämd. Den landar där du
släpper, blir en händelse, och lappen är därmed förbrukad.

**En fjärde sort, och det är ett val.** Lappen är varken en händelse
eller en uppgift. Inte en händelse, för en händelse äger en plats i
tiden och det här har ingen. Inte en uppgift, för en uppgift bockas av
när den är gjord — en lapp bockas inte av, den *blir* något. Alternativet
hade varit att låta att göra-listan bära dem, och kostnaden för det är
att den dagliga listan fylls av möten man inte kan göra någonting åt
förrän de fått en tid. En lista där hälften av raderna inte går att
bocka av slutar man läsa.

**Längden sitter på lappen**, inte på släppet. En lunch är nittio
minuter och ett kaffe trettio, och det vet man när man skriver lappen —
inte när man drar den. Knappen stegar mellan de vanliga längderna i
stället för att vara ett fält: man sätter längden i förbifarten, och ett
fält hade krävt att man siktade, markerade och skrev.

**Släppet är hela beslutet.** Ingen panel öppnas — händelsen skapas
direkt, med lappens titel, anteckning och kalender. Ett fönster som
kräver ett tryck till hade gjort draget till en omväg i stället för en
genväg, och ångrar man sig tar `⌘Z` tillbaka både händelsen och lappen
på en gång. Det är en enda ändring i historiken, av samma skäl som en
kalenderborttagning flyttar sina händelser i samma andetag: ett halvt
ångrat släpp hade lämnat antingen en händelse utan lapp eller en lapp
utan händelse.

Kalendern hoppar dit lappen landade. Släpper man i en vy som visar en
annan vecka vill man se resultatet, inte lita på att det gick vägen.

**Draget korsar en gräns React inte har någon väg över.** När lappen
fångar pekaren med `setPointerCapture` går varje `pointermove` och
`pointerup` till lappen — rutnätets egna hanterare hör aldrig av sig, hur
mycket man än drar över dem. Lappen får därför själv ta reda på vad den
svävar över, och läser det ur DOM: dagkolumnerna bär `data-dagnyckel` och
`data-timhojd`, och `elementFromPoint` säger vilken man är över. Samma
grepp som månadsvyn redan använder när ett block dras mellan två rutor.

Att i stället låta bli att fånga pekaren och lyssna på fönstret hade
fungerat på skrivbordet och gått sönder på telefonen, där ett finger som
lämnar sitt element utan fångst slutar ge händelser alls. Attributen är
alltså ett gränssnitt, och de provas som ett — försvinner de går släppet
sönder *tyst*, och man kan dra hur länge man vill utan att något landar.

Förhandsvisningen ritas av **rutnätet** och inte av panelen, eftersom den
skall ligga på rätt dag vid rätt klockslag. Rutnätet är sidopanelens
syskon och inte dess barn, så läget skickas upp till den gemensamma
föräldern. Spöket som följer pekaren har `pointer-events: none` — det är
inte kosmetik utan förutsättningen för hela gesten, eftersom
`elementFromPoint` annars hade träffat spöket i stället för rutnätet
under det.

Släpper man i **månadsvyn** finns inget klockslag att läsa av. Lappen
landar då nio på morgonen, samma svar som en dubbelklick i en tom
månadsruta redan ger. Ett finger måste hålla in lappen ett ögonblick
innan draget börjar — annars hade varje svep i sidopanelen lyft en lapp i
stället för att rulla listan.

**Parkeringen synkar som allt annat**, men tabellen tillkom efter att
appen redan var i drift. Kör `supabase/schema.sql` (eller bara dess
`lappar`-avsnitt) i Supabase SQL-editorn, så följer lapparna med mellan
enheterna. Innan dess fungerar de lokalt: synkmotorn känner igen "den
där tabellen finns inte" och tiger just om det, i stället för att låta
en oanvänd funktion stoppa synkningen av händelser, uppgifter och
anteckningar.

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
  Delstapel.tsx                  en samling som en enda stapel
  Punktdiagram.tsx               spridning i två led som SVG
  Smakskala.tsx                  ord i båda ändar, band däremellan
  Betygsmatare.tsx               fem celler, delvis fyllda
  Vinuppslag.tsx                 läsläget för ett vin
  Listfalt.tsx                   kommaskild lista med egen råtext
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

### Privatekonomi

Gjord för kvarten före löning: pengarna kommer in och skall fördelas.
**Planen** handlar om kategorier och aldrig om enskilda utgifter — en
kaffe för 49 kronor hör inte hemma där, "Nöjen 2 000" gör det. Bredvid
planen ligger två register som inte är planen: **inköpen**, de enskilda
utgifter som är stora nog att minnas, och **abonnemangen**, det som dras
utan att man gör något.

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

**Inköpen är en logg och inte en budgetpost.** Gränsen mot planen går vid
frågan man ställer: planen svarar på "hur mycket får Nöjen kosta i
september", inköpet på "vad blev det egentligen som gick åt". Därför hör
"Airpods Pro 2 500" och "Kläder på HM 2 000" hemma i loggen, medan dagens
fika inte hör hemma någonstans på sidan.

Loggen **föreslår** månadens utfall — den skriver det aldrig. I
utfallsvyn får varje kategori en Inköp-spalt, och står talet där som en
knapp med en pil betyder det att det ännu inte är överflyttat; stämmer de
överens står talet stilla och matt. "Fyll ur inköpen" gör hela månaden på
en gång. Ett utfall som räknades fram av sig självt vore ett tal man
slutade äga: den dag ett inköp glömdes bort skulle summan se lika färdig
ut som annars, fast den vore fel. Av samma skäl rör påfyllningen bara de
kategorier som *har* inköp — att nolla de övriga vore att påstå att
ingenting gick åt där, ett påstående som kommer från att listan är
ofullständig och inte från verkligheten.

Ett inköp får sakna kategori. Tomt är ett fullgott svar, och ett fält som
tvingade fram ett val hade bara gett en skräpkategori som hette "Övrigt".
Sådana inköp räknas in i månadens totalsumma men föreslår inget utfall —
det finns ingen rad att föreslå det för. **Tar man bort en kategori
tappar inköpet sin kategori men inte sig självt.** Pengarna gick åt
oavsett vad raden hette, och en omdöpt budget skall inte kunna radera
historiken.

**Abonnemangen räknas i den månad avgiften faktiskt dras.** 250 kronor om
året belastar en månad och inte tolv med tjugoen kronor styck, eftersom
det förra är vad kontoutdraget visar — och en sida vars siffror inte går
att stämma av mot banken är en sida man slutar tro på. Det utslagna
genomsnittet finns därför inte; i stället står **årskostnaden** bredvid
månadens, för det är den frågan man ställer när man överväger att säga
upp något. En årsavgift bär sin dragningsmånad; en gissning där hade sett
ut som ett svar.

Ett uppsagt abonnemang **pausas hellre än raderas**. Det man en gång
betalade för är just vad man vill kunna se — och kanske ta tillbaka.
Pausade ligger kvar i listan, räknas varken i månaden eller på året, och
saknar nästa dragning: ett datum för något som inte dras vore ett löfte
om en händelse som aldrig kommer.

Genomgående skiljs **noll från okänt**. En ofylld kategori räknas inte in
i en summa som ser färdig ut, och utan ifylld inkomst är "kvar att
fördela" okänt — inte noll, som hade sett ut som ett svar.

### Mina viner

Sidan är två saker på en gång, med flit. Den är ett **lager** — vad som
står i källaren just nu — och ett **minne** av vad vinerna smakade. Att
skilja dem åt hade betytt två register där samma flaska skrevs in två
gånger, och den dag man drack upp den hade minnet försvunnit tillsammans
med flaskan. Läget bär därför hela flödet: **Vill prova → I källaren →
Drucken**, samma treställiga mätare som i litteraturregistret. Ett
drucket vin lämnar aldrig registret; det slutar bara räknas som en
flaska man äger.

**Ingenting hämtas från Vivino.** Uppgifterna skrivs in för hand och
länken sparas, så att källan alltid går att gå tillbaka till. Det är ett
val med en känd kostnad — man skriver av fyra reglage i stället för att
klistra in en adress — och en känd vinst: en sida som skrapar en annan
sida går sönder tyst den dag den andra ritas om, och man upptäcker det
först när ett vin man litade på visar fel siffror. Bilden är samma sak
sedd från andra hållet: den **hämtas** från sin adress och kopieras inte
hit, så att lagret slipper bära megabyte av bilddata genom varje synk.

Ett vin som inte **går** att slå upp får säga det rent ut. Knappen
*Saknas online* är skild från att bara låta fälten stå tomma, och det är
hela poängen: utan den ser ett omöjligt vin likadant ut som ett man inte
hunnit med, och blir en påminnelse om ett arbete som aldrig kan bli
gjort. Mätaren **Att fylla i** räknar bara dem som ännu inte sagt ifrån.

**Vinets slag bär en bunden färg.** Rött är terrakotta i
fördelningsstapeln, i smakkartan och i punktdiagrammet — aldrig något
annat. Hade färgen valts per diagram vore den dekoration; nu är den det
som gör att ögat känner igen samma vin i tre bilder.

**Tre diagram, alla ritade för hand.**

- **Fördelningen** som en enda stapel, växlingsbar mellan typ, land,
  druva, producent och vinstil. Ett vin med två druvor räknas i båda
  grupperna — frågan stapeln svarar på är "hur mycket tempranillo har
  jag", inte "hur många viner", och det senare talet står redan i
  mätarpanelen. Viner utan värde samlas under *Ej ifyllt* i stället för
  att utelämnas: en stapel som tyst hoppar över halva samlingen ser ut
  som en fullständig bild av något den inte beskriver. Bortom sex delar
  slås svansen ihop till ett rastrerat segment, eftersom en stapel med
  tjugofem segment inte är en översikt utan en rand.
- **Betyg mot pris**, ditt betyg när det finns och annars Vivinos. Ett
  vin kommer med först när det har **båda** talen. Att sätta ett saknat
  pris till noll hade lagt det längst till vänster, där det ser ut att
  vara ett fynd — och ett diagram som ljuger åt det hållet är precis det
  man inte vill ha när man står och väljer flaska.
- **Smakkartan**, två av de fyra Vivino-skalorna mot varandra. Det vin
  man öppnat i listan framhävs i båda punktdiagrammen. Det är den
  kopplingen som gör diagrammen till en del av sidan i stället för
  prydnader under den. Diagrammen ritar dessutom det **filtrerade**
  registret: ett filter i listan och ett diagram som struntar i det är
  två svar på samma fråga, och man tror på fel av dem.

**Smakskalorna har ord i båda ändar och aldrig siffror.** Ingen av de
fyra har en bra och en dålig ände — ett strävt vin är inte sämre än ett
lent — och en axel märkt 0–100 hade läst som ett betyg. Vivino ritar ett
band och inte en punkt; här lagras ändå en punkt och bandet ritas runt
den, alltid lika brett. Bredden i förlagan står för spridningen bland
tusentals recensioner, och att härma den med ett tal man skattat ur en
skärmbild vore påhittad precision. Ett ofyllt spår ritas med raster, så
att "ingen uppgift" och "noll på skalan" inte ser likadana ut.

**Betyget sätts som fem celler, inte fem stjärnor.** En stjärna är rund,
är en ikon och är hämtad ur ett annat formspråk. En fyrkant kan dessutom
fyllas delvis utan att se ut som ett ritfel, och 3,7 blir tre fyllda och
en till sjuttio procent. Talet står alltid skrivet bredvid — skillnaden
mellan 3,6 och 3,8 syns inte i en cell men är hela skillnaden mellan två
viner. Ett tryck på cellen man redan står på tömmer betyget, annars
skulle ett betyg satt av misstag gå att ändra men aldrig att ta tillbaka.

Ett öppnat vin har **två lägen**, som bladen på språksidan. Läsläget är
förvalet och ritar ett färdigt uppslag — fakta, betyg, smakprofil, noter
och text, uppställt som förlagan. Redigeringsläget ritar samma sak som
fält. Ett fält som ser ut som en färdig sida är ändå ett fält: markören
hamnar i det, texten går att råka ändra, och skärmläsaren säger
"inmatning" där det står ett värde. Läget hör till sessionen och inte
till vinet — sitter man en kväll och skriver in tio flaskor skall inte
varje byte kasta tillbaka en till läsläget — men vid omladdning börjar
man i läsläge, och Escape lämnar redigeringen. Ett nyss tillagt vin
öppnas direkt i redigering: det har ingenting att läsa.

I läsläget **lämnar tomma uppgifter ingen rad efter sig**. En tabell med
halva raderna tomma ser ut som ett formulär man glömt fylla i, och hela
poängen med läsläget är att slippa se ett formulär. Av samma skäl står
lagret bara under ett vin som faktiskt är i källaren: "0 flaskor" under
ett vin man vill prova är inte en upplysning utan en gåta.

**Druvor och passar till skrivs i ett `Listfalt`**, inte i ett vanligt
fält. Det är samma sjuka som kommatecknet i sifferfältet, i en annan
skepnad: ett kontrollerat fält som tolkar vid varje tangenttryckning gör
det omöjligt att skriva "nötkött, pasta", eftersom "nötkött, " tolkas
till listan `["nötkött"]` som ritas tillbaka som "nötkött" — och både
kommat och mellanslaget är borta innan man hunnit skriva bokstaven
efter. Fältet äger därför sin råa text medan man skriver och skickar
bara ut den tolkade listan.

Genomgående skiljs **noll från okänt**, som överallt annars. Ett vin i
källaren utan ifyllt antal räknas som **en** flaska och inte noll: man
har uppenbarligen vinet, annars stod det inte där. Ofyllda tal hamnar
alltid sist när listan sorteras, oavsett åt vilket håll — ett vin utan
pris är inte billigast, och att lägga det överst hade gjort listan
obrukbar just när man använder den.


## Färgerna och genomskinligheten

Paletten finns i **två former**: en kanalvariabel med råa RGB-tal och en
färdig färg byggd av den.

```css
--ink-kanal: 17 17 17;
--ink: rgb(var(--ink-kanal));
```

Delningen finns för Tailwinds skull. `border-ink/15` kan bara sättas ihop
om färgen går att lägga en alfakanal på, och det går inte med ett färdigt
`var(--ink)` — då genereras klassen **inte alls**, tyst, och ramen ritas i
textfärgen med full täckning i stället. Felet syns som att hårstrecken
plötsligt är svarta, och det var så det låg i tolv fall innan det
upptäcktes.

Tailwinds opacitetsskala saknar dessutom `12`. Håll dig till `10`, `15`,
`20` och så vidare, eller skriv `border-ink/[0.12]`.

Samma källordning bet en gång till på vinsidan. `.vinbild { width: 100% }`
står efter `@tailwind utilities` och vann därför över `w-[132px]` på
själva bilden — tyst, utan felmeddelande, och etiketten ritades lika bred
som hela spalten. Breddklassen `.vinspalt` **omsluter** därför bilden i
stället för att sitta på den. Regeln är enkel: en egen klass och en
Tailwind-klass som sätter samma egenskap får aldrig dela element.

**Kontrollera med den här skanningen** när något ser fel ut:

```
npx tailwindcss -i app/globals.css -o /tmp/ut.css \
  --content "./components/**/*.tsx,./app/**/*.tsx"
```

och jämför sedan varje `className`-symbol mot utdatan. En klass som inte
finns där har ingen stil — och till skillnad från ett typfel säger
ingenting ifrån.

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

### En tystnad som kostade en kväll

Två sorter — parkeringens lappar och gjort-remsan — fick sina tabeller
efter att appen redan var i drift. Synkmotorn tiger därför med flit när
en av dem saknas: ett vanligt kast hade stoppat händelser, uppgifter och
anteckningar också, för en funktion man kanske inte ens använder.

Den tystnaden var för bred, och gjort slutade synkas utan att något
syntes. Tre saker gick fel samtidigt, och var och en av dem hade räckt:

1. **Frågan var för slapp.** Koden svarade "tabellen saknas" på ett blott
   `does not exist`, men PostgREST säger `column gjort.datum does not
   exist` när tabellen *finns* men har fel form, och skriver "schema
   cache" både när en tabell och när en *kolumn* fattas. En halvkörd SQL
   såg alltså ut precis som ingen SQL alls. Nu avgör felkoden (`42P01`,
   `PGRST205`), och texten matchas bara på de formuleringar som verkligen
   handlar om en tabell.
2. **Att svälja felet lämnade inget spår.** Nu står det ett
   `console.warn` med tabellens namn och vad man skall göra åt saken.
3. **Diagnosen frågade bara `handelser`.** Fanns den svarade rutan
   "tabellerna finns" — alltså det enda svar som inte hjälpte den som
   hade problemet. Nu frågas varje tabell för sig och de som saknas
   räknas upp vid namn.

Ett fjärde fel låg bredvid: realtidsprenumerationen räknade upp fem
tabeller i fem nästan identiska block, och `lappar` och `gjort` glömdes
där. En rad skriven på telefonen dök då inte upp på datorn förrän nästa
pollningsvarv — vilket ser ut precis som att den inte synkas. Både
prenumerationen och publiceringen i `schema.sql` går nu över **en**
uppräkning, `TABELLER` i `lib/supabase.ts`.

**Kör alltid `notify pgrst, 'reload schema';` sist.** PostgREST håller en
egen bild av schemat, och tills den läst om det svarar API:et att en
tabell inte finns fast den bevisligen gör det. Raden ligger nu sist i
`schema.sql`.

Sensmoralen är enkel nog att vara värd en rubrik: **ett fel man sväljer
måste sväljas snävt och höras ändå.** En sort som lades till på fem
ställen glöms förr eller senare på ett av dem, och då skall det synas —
inte i innehållet, som ser normalt ut, utan där man letar.

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

`npm test` kör fjorton sviter:

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
- **Privatekonomin** — 52 prov över all matematik. Tyngdpunkten ligger på
  skillnaden mellan noll och okänt, på att sparmålet räknas på utfall och
  inte på avsikt, och på att prognosen håller tyst när den inte vet.
- **Gjort-remsan** — 13 prov. Tyngdpunkten ligger på dagens gräns: en
  rad hamnar på rätt dag, flera ryms på samma, och en rad vars datum
  inte är en dagnyckel hör till INGEN dag — inte till den tomma. Det
  felet såg inte ut som ett fel utan som att man glömt skriva in raden.
- **Parkeringen** — 19 prov. Tyngdpunkten ligger på översättningen från
  lapp till händelse — att titel, kalender och längd verkligen följer
  med — och på räkningen från pekarens y-läge till ett klockslag, som är
  det enda på vägen som kan bli tyst fel. En timhöjd på noll ger noll och
  inte `NaN`: ett `NaN` i ett stilattribut ritar ingenting alls, utan att
  något säger ifrån.
- **Vinsidan** — 42 prov. Tyngdpunkten ligger på att ofyllt aldrig blir
  noll (ett vin i källaren utan antal är en flaska, inte ingen), att ett
  vin som saknar ett tal hamnar sist och inte först när listan sorteras,
  och att de tre diagrammen hoppar över det de inte vet i stället för att
  gissa. Här ligger också regeln att snedstreck inte delar druvor:
  "Shiraz/Syrah" är ett namn och inte två.
- **Högskoleprovssidan** — 35 prov, med tyngdpunkt på tolkningen av data
  databasen inte kontrollerar: skräp in ger en tom men ritbar sida, och
  ett tomt fält blir `null` och inte noll. (`Number("")` är 0 i
  JavaScript, vilket gjorde varje oifyllt delprov till noll rätt — och
  därmed till den svagaste delen, varje gång.) Här ligger också
  kommateckensbuggen fångad som ett prov: `"1,"` måste tolkas till samma
  tal som `"1"`, annars ser fältet sig självt som ur takt och suddar
  kommat man just skrev.
- **Synken** — 26 prov över sammanfogningen vid krock, gravstenar,
  offlinekön och synkmarkören. Skrivna som berättelser om två enheter, eftersom det är så
  felen uppstår: telefonen i tunnelbanan och datorn på kontoret ändrar
  samma möte och möts först en timme senare.
- **Uppgifterna** — 16 prov, mest om sorteringen. En att göra-lista är i
  praktiken sin ordning: står fel sak överst gör man fel sak, och det
  märks inte förrän dagen är slut.
- **Vyerna** — 30 prov som renderar varje vy, varje panel och varje sida
  under Annat till HTML och kontrollerar att de innehåller det de skall,
  inklusive att kolumnpackningen faktiskt delar bredden mellan krockande
  block. Sidornas block ritas dessutom i sitt REDIGERINGSläge, som är
  där de skiljer sig mest från visningsläget och där ett fel annars bara
  visar sig i webbläsaren.
