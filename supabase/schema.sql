-- ===================================================================
-- KALENDARIET — databasschema
--
-- Kör hela filen i Supabase: SQL Editor → New query → klistra in → Run.
-- Den går att köra om; allt är skrivet med IF NOT EXISTS eller DROP/CREATE.
--
-- Två designval är värda att förstå innan du ändrar något:
--
-- 1. TVÅ TIDSSTÄMPLAR, INTE EN.
--    `andrad` sätts av enheten som gjorde ändringen och avgör vem som
--    vinner vid en krock. `synk_vid` sätts av servern och används bara
--    som markör för vad en enhet ännu inte hämtat. Att slå ihop dem till
--    en kolumn är det klassiska sättet att tappa data: en telefon med fel
--    klocka skulle antingen vinna allt eller aldrig synas.
--
-- 2. GRAVSTENAR I STÄLLET FÖR DELETE.
--    En borttagen post får `raderad` satt men ligger kvar. Raderades den
--    på riktigt skulle den återuppstå så fort en enhet som varit offline
--    synkar och skickar upp sin gamla kopia igen.
-- ===================================================================

-- -------------------------------------------------------------------
-- KALENDRAR
-- -------------------------------------------------------------------
create table if not exists public.kalendrar (
  agare     uuid        not null default auth.uid()
                        references auth.users (id) on delete cascade,
  id        text        not null,
  namn      text        not null default 'Namnlös',
  ton       smallint    not null default 0,
  synlig    boolean     not null default true,
  andrad    timestamptz not null,
  raderad   timestamptz,
  synk_vid  timestamptz not null default now(),
  primary key (agare, id)
);

-- -------------------------------------------------------------------
-- HÄNDELSER
--
-- starttid/sluttid är TEXT, inte timestamptz, och det är med flit.
-- En händelse klockan 09:00 skall ligga 09:00 på väggklockan oavsett
-- vilken tidszon enheten står i och oavsett sommartid. Lagras tiden som
-- en absolut tidpunkt flyttar sig mötet när du reser — vilket är rätt
-- för ett flygplan men fel för en kalender. Formatet är "YYYY-MM-DDTHH:mm".
--
-- Ingen främmandenyckel mot kalendrar.id: en enhet kan mycket väl ha
-- skapat en händelse offline i en kalender som ännu inte hunnit upp.
-- Att avvisa raden då vore att straffa användaren för nätets skull.
-- -------------------------------------------------------------------
create table if not exists public.handelser (
  agare        uuid        not null default auth.uid()
                           references auth.users (id) on delete cascade,
  id           text        not null,
  titel        text        not null default '',
  anteckning   text        not null default '',
  plats        text        not null default '',
  starttid     text        not null,
  sluttid      text        not null,
  heldag       boolean     not null default false,
  kalender_id  text        not null,
  upprepning   jsonb,
  undantag     jsonb       not null default '[]'::jsonb,
  avvikelser   jsonb       not null default '{}'::jsonb,
  skapad       timestamptz not null default now(),
  andrad       timestamptz not null,
  raderad      timestamptz,
  synk_vid     timestamptz not null default now(),
  primary key (agare, id)
);

-- -------------------------------------------------------------------
-- SERVERSTÄMPELN
-- Sätts vid varje insert och update. Klienten skickar aldrig med den —
-- hela poängen är att den kommer från EN klocka, serverns.
-- -------------------------------------------------------------------
create or replace function public.satt_synk_vid()
returns trigger
language plpgsql
as $$
begin
  new.synk_vid := now();
  return new;
end;
$$;

drop trigger if exists synk_vid_kalendrar on public.kalendrar;
create trigger synk_vid_kalendrar
  before insert or update on public.kalendrar
  for each row execute function public.satt_synk_vid();

drop trigger if exists synk_vid_handelser on public.handelser;
create trigger synk_vid_handelser
  before insert or update on public.handelser
  for each row execute function public.satt_synk_vid();

-- -------------------------------------------------------------------
-- UPPGIFTER (att göra-listan)
--
-- Egen tabell, inte en kolumn på handelser. En händelse äger en plats i
-- tiden; en uppgift äger bara en avsikt. Att pressa in dem i samma rad
-- hade betytt halva fält tomma i varje post och en modell som ljuger om
-- vad den innehåller.
--
-- `forfaller` är DATE och inte timestamptz: en uppgift förfaller en dag,
-- inte ett klockslag, och skall inte flytta sig när man reser.
--
-- Kalendern delas med händelserna, så samma Arbete/Privat/Studier styr
-- färg och filter på båda hållen.
-- -------------------------------------------------------------------
create table if not exists public.uppgifter (
  agare        uuid        not null default auth.uid()
                           references auth.users (id) on delete cascade,
  id           text        not null,
  titel        text        not null default '',
  anteckning   text        not null default '',
  prioritet    smallint    not null default 2
                           check (prioritet between 1 and 3),
  kalender_id  text        not null,
  klar         boolean     not null default false,
  klar_vid     timestamptz,
  forfaller    date,
  skapad       timestamptz not null default now(),
  andrad       timestamptz not null,
  raderad      timestamptz,
  synk_vid     timestamptz not null default now(),
  primary key (agare, id)
);

drop trigger if exists synk_vid_uppgifter on public.uppgifter;
create trigger synk_vid_uppgifter
  before insert or update on public.uppgifter
  for each row execute function public.satt_synk_vid();

create index if not exists uppgifter_synk_idx
  on public.uppgifter (agare, synk_vid);

alter table public.uppgifter enable row level security;

drop policy if exists "egna uppgifter" on public.uppgifter;
create policy "egna uppgifter"
  on public.uppgifter
  for all
  to authenticated
  using (agare = auth.uid())
  with check (agare = auth.uid());

-- -------------------------------------------------------------------
-- INDEX
-- Varje synkrunda frågar "vad har hänt sedan X, för mig". Utan det här
-- indexet blir det en full tabellgenomgång vid varje appstart.
-- -------------------------------------------------------------------
create index if not exists kalendrar_synk_idx
  on public.kalendrar (agare, synk_vid);
create index if not exists handelser_synk_idx
  on public.handelser (agare, synk_vid);

-- -------------------------------------------------------------------
-- RADNIVÅSÄKERHET
--
-- Anon-nyckeln ligger publikt i webbläsaren — det är meningen. Det som
-- skyddar innehållet är de här reglerna: utan en giltig inloggning ser
-- man ingenting, och med en inloggning ser man bara sina egna rader.
--
-- `with check` är lika viktigt som `using`: utan den kan en inloggad
-- användare skriva rader i någon annans namn.
-- -------------------------------------------------------------------
alter table public.kalendrar enable row level security;
alter table public.handelser enable row level security;

drop policy if exists "egna kalendrar" on public.kalendrar;
create policy "egna kalendrar"
  on public.kalendrar
  for all
  to authenticated
  using (agare = auth.uid())
  with check (agare = auth.uid());

drop policy if exists "egna handelser" on public.handelser;
create policy "egna handelser"
  on public.handelser
  for all
  to authenticated
  using (agare = auth.uid())
  with check (agare = auth.uid());

-- -------------------------------------------------------------------
-- STÄDNING AV GAMLA GRAVSTENAR
--
-- Efter ett kvartal har varje enhet rimligen sett borttagningen, och
-- gravstenen kan tas bort på riktigt. Kör vid behov, eller lägg som ett
-- schemalagt jobb om du slår på pg_cron:
--
--   select cron.schedule('stada-kalendariet', '0 4 * * 0',
--                        $$select public.stada_gravstenar()$$);
-- -------------------------------------------------------------------
create or replace function public.stada_gravstenar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.handelser
    where raderad is not null and raderad < now() - interval '90 days';
  delete from public.kalendrar
    where raderad is not null and raderad < now() - interval '90 days';
  delete from public.uppgifter
    where raderad is not null and raderad < now() - interval '90 days';
$$;

-- ===================================================================
-- ANVÄNDAREN
--
-- Skapa ditt konto i Supabase: Authentication → Users → Add user →
-- "Create new user". Fyll i e-post och lösenord och kryssa i
-- "Auto Confirm User" så slipper du bekräftelsemejlet.
--
-- Slå sedan AV självregistrering, så att ingen annan kan skapa konton:
-- Authentication → Providers → Email → stäng av "Enable signup".
-- Appen har ingen registreringsruta, men API:et är öppet tills du
-- stänger det här.
-- ===================================================================

-- ===================================================================
-- REALTID
--
-- Utan detta ser en enhet en annans ändring först vid nästa
-- pollningsvarv. Med det knackar molnet på direkt, och kalendern som
-- ligger uppslagen på två skärmar håller sig i takt.
--
-- Aviseringen bär ingen data — appen gör en vanlig synkrunda när den
-- kommer — så RLS gäller precis som vanligt för allt som faktiskt läses.
-- Slås detta inte på fungerar appen ändå; den blir bara långsammare på
-- att upptäcka ändringar.
-- ===================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'handelser'
  ) then
    alter publication supabase_realtime add table public.handelser;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kalendrar'
  ) then
    alter publication supabase_realtime add table public.kalendrar;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'uppgifter'
  ) then
    alter publication supabase_realtime add table public.uppgifter;
  end if;
end
$$;
