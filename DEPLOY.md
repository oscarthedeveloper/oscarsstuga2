# Koppla på Supabase och Netlify

Tre steg. Appen fungerar hela vägen igenom även om du stannar efter steg
ett — utan molnnycklar är den en helt vanlig lokal kalender.

---

## 1. Supabase

**Databasen.** Öppna ditt projekt → **SQL Editor** → **New query**. Klistra
in hela `supabase/schema.sql` och kör. Filen går att köra om utan att något
går sönder.

**Kontot.** **Authentication → Users → Add user → Create new user**. Fyll i
e-post och lösenord, och kryssa i **Auto Confirm User** så slipper du
bekräftelsemejlet.

**Stäng dörren efter dig.** **Authentication → Providers → Email** → slå av
**Enable signup**. Appen har med flit ingen registreringsruta, men API:et
tar emot registreringar tills du stänger det här. Radnivåsäkerheten gör att
en främmande användare ändå inte skulle se dina rader — men det finns ingen
anledning att låta någon skapa konton i ditt projekt.

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
3. skickas upp automatiskt när nätet kommer tillbaka — appen lyssnar på
   `online`, på att fliken blir synlig igen, och kollar dessutom varannan
   minut

Synken körs också vid inloggning och 1,5 sekunder efter varje ändring, så
att ett drag blir en skrivning i stället för tjugo.

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

**"Tabellerna saknas i databasen."** `schema.sql` är inte kört ännu.

**Inloggningen fungerar men inget synkas.** Kontrollera att RLS-reglerna
kom med — kör `schema.sql` igen. Utan `with check` går skrivningar tyst
förlorade.

**Appen visar en gammal version efter en deploy.** Service workern serverar
det den har och hämtar det nya i bakgrunden; nästa gång du öppnar appen
dyker knappen *Ny version finns* upp. Vill du tvinga fram det:
avinstallera från hemskärmen, eller rensa webbplatsdata.

**Ändringar syns inte på den andra enheten.** Öppna statusknappen. Står det
`↑ 3` ligger de i kön; står det *Synkfel* visas orsaken där.
