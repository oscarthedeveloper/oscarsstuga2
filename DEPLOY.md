# Koppla på Supabase och Netlify

Tre steg. Appen fungerar hela vägen igenom även om du stannar efter steg
ett — utan molnnycklar är den en helt vanlig lokal kalender.

---

## 1. Supabase

**Databasen.** Öppna ditt projekt → **SQL Editor** → **New query**. Klistra
in hela `supabase/schema.sql` och kör. Filen går att köra om utan att något
går sönder — kör den igen efter varje uppdatering av appen, så att nya
tabeller kommer med. (Att göra-listan lade till `uppgifter`.)

**Kontot.** **Authentication → Users → Add user → Create new user**. Fyll i
e-post och lösenord, och kryssa i **Auto Confirm User** så slipper du
bekräftelsemejlet.

**Stäng dörren efter dig.** **Authentication → Providers → Email** → slå av
**Enable signup**. Appen har med flit ingen registreringsruta, men API:et
tar emot registreringar tills du stänger det här. Radnivåsäkerheten gör att
en främmande användare ändå inte skulle se dina rader — men det finns ingen
anledning att låta någon skapa konton i ditt projekt.

**Realtid.** Sista blocket i `schema.sql` lägger tabellerna i
`supabase_realtime`-publikationen. Det är det som gör att en ändring på
telefonen syns på datorn direkt i stället för vid nästa pollningsvarv.
Kontrollera under **Database → Replication** att `handelser` och
`kalendrar` är med. Missas det fungerar synken ändå — den blir bara upp
till trettio sekunder långsammare.

**Nycklarna.** **Project Settings → API**. Kopiera *Project URL* och
*anon public*. Lokalt lägger du dem i `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Båda värdena hamnar i webbläsaren, och det är meningen. Anon-nyckeln är
avsedd att vara publik; det som skyddar innehållet är RLS-reglerna i
`schema.sql`, där varje rad är knuten till `auth.uid()`. **Service
role-nyckeln skall aldrig någonsin hamna i den här appen** — den går förbi
RLS helt.

---

## 2. Netlify

Repot är redan på GitHub, så:

**Add new site → Import an existing project → GitHub → välj repot.**

Netlify läser `netlify.toml` och behöver ingen manuell inställning:

| | |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `out` |
| Node | 20 |

Ingen `@netlify/plugin-nextjs` behövs. `output: "export"` gör bygget till
rena statiska filer — ingen serverkod, inga kallstarter, inga funktioner
som kan fallera.

**Miljövariablerna.** Site configuration → **Environment variables** → lägg
in samma två `NEXT_PUBLIC_*`-värden. De läses vid bygget, så efter en
ändring måste du köra **Trigger deploy → Clear cache and deploy site**.

Därefter deployar varje `git push` till huvudgrenen automatiskt.

---

## 3. Installera appen

Öppna adressen på telefonen.

- **iPhone (Safari):** Dela → Lägg till på hemskärmen.
- **Android (Chrome):** menyn → Installera app.
- **Dator (Chrome/Edge):** installationsikonen i adressfältet.

Efter första besöket ligger hela appen i cachen och startar utan nät.

---

## Så fungerar offlineläget

Den lokala kopian är den appen ritar och skriver mot — alltid. Molnet är en
spegel som hinner ikapp. Ingenting i gränssnittet väntar någonsin på en
nätverksrunda.

En ändring du gör offline:

1. sparas i `localStorage` direkt och märks som osynkad
2. syns i statusknappen som `↑ 3`
3. skickas upp automatiskt när nätet kommer tillbaka

Synken utlöses av: inloggning, `online`, att fliken blir synlig igen, en
realtidsavisering från molnet när en annan enhet skrivit, 1,5 sekunder
efter varje egen ändring, och som sista utväg var trettionde sekund.

### Om samma händelse ändrats på två enheter

Senaste ändringen vinner hela posten. Två tidsstämplar håller isär två
olika frågor, och att blanda ihop dem är det klassiska sättet att tappa
data:

- `andrad` sätts av enheten som gjorde ändringen och avgör **vem som
  vinner**. Den måste komma från enheten, eftersom ändringen kan ha skett
  offline för flera dygn sedan.
- `synk_vid` sätts av servern och används bara som markör för **vad jag
  inte hämtat än**. Serverns klocka är den enda som är gemensam, så en
  telefon med fel klocka kan aldrig göra sig osynlig.

### Om borttagningar

En raderad post försvinner inte, den får en gravsten. Raderades den på
riktigt skulle den återuppstå så fort en enhet som varit offline synkar och
skickar upp sin gamla kopia. Gravstenar städas bort efter 90 dagar — men
bara sådana som hunnit ut i molnet.

Ett undantag är avsiktligt: raderar du ett möte på datorn kl 11 och skriver
om samma möte på telefonen kl 12, kommer mötet tillbaka. Den senare
avsikten är den giltiga.

### Vad som INTE synkas

Vilka kalendrar som är synliga är en inställning per enhet. Att dölja
Arbete på telefonen skall inte dölja den på datorn.

---

## Felsökning

**Börja alltid här:** statusknappen uppe till höger → **Felsökning** →
*Kontrollera molnet*. Den läser OCH skriver på riktigt mot databasen och
svarar på fem frågor: har bygget nycklar, vilket projekt pratar appen med,
är enheten inloggad, svarar tabellerna, och går en skrivning igenom.
Databasens oöversatta svar visas längst ned.

**Det synkas ingenting, någonstans.** Nästan alltid en av två saker, och
båda ser ut precis som en fungerande kalender:

1. **Du är inte inloggad.** Utan inloggning skickas ingenting upp och
   ingenting hämtas ner — appen sparar lokalt och ser helt normal ut.
   Kontot skapas i Supabase under **Authentication → Users**, inte i
   appen. Appen frågar numera själv första gången den startar utan
   session, och visar en röd remsa så länge läget består.
2. **Bygget saknar nycklarna.** `NEXT_PUBLIC_*`-värdena bakas in vid
   bygget, inte vid besöket. Lägger du in dem i Netlify måste du köra
   **Trigger deploy → Clear cache and deploy site** efteråt; en vanlig
   omladdning i webbläsaren räcker inte. Lokalt måste `next dev` startas
   om efter en ändring i `.env.local` — och värdena måste stå i
   **`.env.local`**, inte i `.env.local.example`, som bara är en mall.

Säger diagnosen *Nycklar i bygget: Nej* trots att variablerna står i
Netlify, är det nästan alltid en av tre saker:

- **Deployen misslyckades och du ser en äldre lyckad deploy.** Netlify
  genomsöker bygget efter värden som liknar hemligheter och avbryter om den
  hittar några — och `NEXT_PUBLIC_*` hamnar med flit i klientkoden. Se
  *Secrets scanning* nedan. Kolla **Deploys** och leta efter röda rader.
- **Fel scope.** Varje variabel har ett scope i Netlify. Omfattar det inte
  **Builds** ser `next build` den inte, hur rätt den än ser ut i listan.
- **Fel deploy-kontext.** Sätts värdet bara för *Deploy previews* gäller
  det inte för **Production**.

Byggstämpeln i diagnosen — datum och commit — visar vilket bygge du
faktiskt tittar på. Stämmer den inte med din senaste push har deployen
inte gått igenom.

### Secrets scanning

`netlify.toml` innehåller numera:

```
SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Utan den raden misslyckas varje deploy från och med den stund variablerna
lagts in, med ett meddelande om att hemligheter hittats i bygget. Netlify
fortsätter då servera den senaste lyckade deployen — den från innan
nycklarna fanns — och resultatet ser ut precis som om variablerna aldrig
sattes: ny kod, inga nycklar.

Undantaget är säkert här, men bara för att `NEXT_PUBLIC_`-prefixet
betyder just "detta är avsett att vara publikt". Lägg **aldrig**
service role-nyckeln i en `NEXT_PUBLIC_`-variabel.

**Skrivning nekas men läsning fungerar.** `using` och `with check` i
radnivåsäkerheten styr två olika saker. Saknas `with check` avvisas varje
skrivning, och kalendern ser ut att fungera ända tills man tittar i
databasen. Kör om `supabase/schema.sql`.

**"Tabellerna saknas i databasen."** `schema.sql` är inte kört ännu.

**Inloggningen fungerar men inget synkas.** Kontrollera att RLS-reglerna
kom med — kör `schema.sql` igen. Utan `with check` går skrivningar tyst
förlorade.

**Appen visar en gammal version efter en deploy.** Service workern serverar
det den har och hämtar det nya i bakgrunden; nästa gång du öppnar appen
dyker knappen *Ny version finns* upp. Vill du tvinga fram det:
avinstallera från hemskärmen, eller rensa webbplatsdata.

**Ändringar syns inte på den andra enheten.** Öppna statusknappen →
**Felsökning** → *Kontrollera molnet*. Den kör en riktig förfrågan mot
databasen och svarar på tre frågor: har bygget nycklar, är enheten
inloggad, och svarar tabellerna. Antalet poster i molnet visas också — står
det noll har ingenting kommit upp, står det rätt siffra är det hämtningen
som är problemet.

Knappen **↻** i navigeringsraden, bredvid statusknappen, glömmer var
synkningen stod och hämtar hela kalendern på nytt. Inget lokalt innehåll går förlorat; det
sammanfogas som vanligt. Det är rätt åtgärd om en enhet av någon anledning
hamnat ur fas.
