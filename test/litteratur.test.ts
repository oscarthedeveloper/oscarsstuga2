import {
  filtreraBocker,
  framsteg,
  lasningPaDag,
  omslagston,
  registreraLaspass,
  sorteraLaspass,
  summeraLasning,
  taBortLaspass,
  tolkaLitteraturData,
  type Bok,
  type Laspass,
} from "../lib/sidor/litteratur";

let antal = 0;
let fel = 0;

function prov(namn: string, f: () => void) {
  antal += 1;
  try {
    f();
    process.stdout.write(`  ok   ${namn}\n`);
  } catch (e) {
    fel += 1;
    process.stdout.write(`  FEL  ${namn}\n       ${(e as Error).message}\n`);
  }
}

function lika(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${JSON.stringify(a)} är inte ${JSON.stringify(b)}`);
  }
}

const bok = (delar: Partial<Bok> = {}): Bok => ({
  id: "b1",
  titel: "Doktor Glas",
  forfattare: "Hjalmar Söderberg",
  kategori: "klassiker",
  status: "laser",
  omslag: null,
  utgiven: "1905",
  totaltSidor: 200,
  aktuellSida: 50,
  avslutad: null,
  betyg: null,
  anteckning: "Stockholm",
  skapad: "2026-09-01T10:00:00.000Z",
  ...delar,
});

const pass = (delar: Partial<Laspass> = {}): Laspass => ({
  id: "p1",
  datum: "2026-09-04",
  bokId: "b1",
  sidor: 20,
  franSida: null,
  tillSida: null,
  minuter: 35,
  anteckning: "",
  skapad: "2026-09-04T20:00:00.000Z",
  ...delar,
});

process.stdout.write("\nLITTERATURBIBLIOTEKET\n");

prov("skräp in ger ett tomt och ritbart bibliotek", () => {
  lika(tolkaLitteraturData("nej"), { version: 1, bocker: [], laspass: [] });
});

prov("gamla och halva böcker får säkra standardvärden", () => {
  const data = tolkaLitteraturData({ bocker: [{ id: "x", titel: "En bok" }] });
  lika(data.bocker[0].kategori, "skonlitteratur");
  lika(data.bocker[0].status, "vill-lasa");
  lika(data.bocker[0].omslag, null);
});

prov("bara krympta bildadresser godtas som omslag", () => {
  const data = tolkaLitteraturData({
    bocker: [
      { id: "a", omslag: "https://example.com/a.jpg" },
      { id: "b", omslag: "data:image/jpeg;base64,AAAA" },
    ],
  });
  lika(data.bocker[0].omslag, null);
  lika(data.bocker[1].omslag, "data:image/jpeg;base64,AAAA");
});

prov("aktuell sida kan inte passera bokens slut", () => {
  const data = tolkaLitteraturData({ bocker: [{ id: "x", totaltSidor: 100, aktuellSida: 150 }] });
  lika(data.bocker[0].aktuellSida, 100);
});

prov("läspass utan en befintlig bok faller bort", () => {
  const data = tolkaLitteraturData({ bocker: [bok()], laspass: [pass(), pass({ id: "p2", bokId: "saknas" })] });
  lika(data.laspass.map((p) => p.id), ["p1"]);
});

prov("dagens läsning summerar sidor och minuter var för sig", () => {
  lika(summeraLasning([pass(), pass({ id: "p2", sidor: 12, minuter: null })]), { sidor: 32, minuter: 35 });
});

prov("ett läspass flyttar fram sidmarkören och minns intervallet", () => {
  const data = registreraLaspass(
    { version: 1, bocker: [bok({ aktuellSida: 130 })], laspass: [] },
    pass({ sidor: 20 })
  );
  lika(data.bocker[0].aktuellSida, 150);
  lika(
    { fran: data.laspass[0].franSida, till: data.laspass[0].tillSida },
    { fran: 130, till: 150 }
  );
});

prov("ett läspass stannar vid bokens sista sida", () => {
  const data = registreraLaspass(
    { version: 1, bocker: [bok({ aktuellSida: 190 })], laspass: [] },
    pass({ sidor: 20 })
  );
  lika(data.bocker[0].aktuellSida, 200);
  lika(data.laspass[0].tillSida, 200);
});

prov("ett raderat läspass backar bokens framsteg", () => {
  const medPass = registreraLaspass(
    { version: 1, bocker: [bok({ aktuellSida: 130 })], laspass: [] },
    pass({ sidor: 20 })
  );
  const utanPass = taBortLaspass(medPass, "p1");
  lika(utanPass.bocker[0].aktuellSida, 130);
  lika(utanPass.laspass, []);
});

prov("radering backar bara den del som rymdes före bokens slut", () => {
  const medPass = registreraLaspass(
    { version: 1, bocker: [bok({ aktuellSida: 190 })], laspass: [] },
    pass({ sidor: 20 })
  );
  lika(taBortLaspass(medPass, "p1").bocker[0].aktuellSida, 190);
});

prov("läsning på en dag läcker inte till nästa", () => {
  const lista = [pass(), pass({ id: "p2", datum: "2026-09-05" })];
  lika(lasningPaDag(lista, "2026-09-04").map((p) => p.id), ["p1"]);
});

prov("senaste läspassen kommer först", () => {
  const lista = [pass(), pass({ id: "p2", datum: "2026-09-05" })];
  lika(sorteraLaspass(lista).map((p) => p.id), ["p2", "p1"]);
});

prov("sökning och statusfilter arbetar tillsammans", () => {
  const lista = [bok(), bok({ id: "b2", titel: "Ett annat liv", status: "last" })];
  lika(filtreraBocker(lista, "söderberg", "laser").map((b) => b.id), ["b1"]);
  lika(filtreraBocker(lista, "annat", "last").map((b) => b.id), ["b2"]);
});

prov("framsteg kräver båda sidtalen och hålls inom skalan", () => {
  lika(framsteg(bok()), 0.25);
  lika(framsteg(bok({ aktuellSida: null })), null);
  lika(framsteg(bok({ aktuellSida: 300 })), 1);
});

prov("standardomslagets färg är stabil", () => {
  lika(omslagston(bok()), omslagston(bok()));
});

process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ". ✗" : ". ✓"}\n`);
if (fel) process.exitCode = 1;
