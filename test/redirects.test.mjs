/**
 * Prüft den Worker von mozartkugeldreherland.at: Kurzadressen, www → ohne www,
 * Asset-Schicht, /api/subscribe und die gebauten Seiten.
 *
 *   npm test          (baut vorher, damit worker/redirects.generated.js stimmt)
 */
import { readFileSync } from "node:fs";
import assert from "node:assert";
import worker from "../worker/index.js";

let bestanden = 0;
const ok = (bedingung, text) => { assert.ok(bedingung, text); console.log("  ✓ " + text); bestanden++; };

const BASIS = "https://mozartkugeldreherland.at";
async function hole(pfad, host = BASIS, init) {
  const env = { ASSETS: { fetch: async () => new Response("ASSET", { status: 200 }) } };
  return worker.fetch(new Request(host + pfad, init), env, {});
}
const ziel = (res) => (res.headers.get("location") || "").replace(BASIS, "");

console.log("\nWeiterleitungen mozartkugeldreherland.at\n");

for (const [alt, neu] of [["/blog", "/amtsblatt"], ["/newsletter", "/kundmachungen"], ["/shop", "/devotionalien"], ["/weiterbildung", "/akademie"], ["/lehrplan", "/akademie"], ["/anmeldung", "/inskription"], ["/zertifikat", "/studienbuch"]]) {
  const r = await hole(alt);
  ok(r.status === 301 && ziel(r) === neu, `${alt} → ${neu} (301)`);
}
ok(ziel(await hole("/post/irgendwas")) === "/amtsblatt", "/post/… → /amtsblatt");

{
  const r = await hole("/akademie", "https://www.mozartkugeldreherland.at");
  ok(r.status === 301 && r.headers.get("location") === BASIS + "/akademie", "www → ohne www (301)");
  const r2 = await hole("/shop", "https://www.mozartkugeldreherland.at");
  ok(r2.headers.get("location") === BASIS + "/devotionalien", "www + Kurzadresse: EIN Sprung");
  for (const p of ["/", "/akademie", "/amtsblatt", "/beitrag", "/kundmachungen", "/devotionalien", "/impressum", "/datenschutz", "/inskription", "/urkunde", "/studienbuch"]) {
    const r3 = await hole(p);
    if (r3.status !== 200 || (await r3.text()) !== "ASSET") assert.fail(`${p} geht nicht an die Asset-Schicht`);
  }
  ok(true, "alle Seiten gehen an die Asset-Schicht");
  const r5 = await hole("/api/subscribe");
  ok(r5.status === 405, "/api/subscribe nimmt nur POST an");
}

{
  const roh = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  const zweihundert = roh.split("\n").filter((z) => !z.trim().startsWith("#") && /\s2\d\d\s*$/.test(z));
  ok(zweihundert.length === 0, "keine 200er-Umschreibungen in _redirects");
  const wr = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  ok(/"run_worker_first":\s*true/.test(wr), "run_worker_first: true — der Worker entscheidet");
}

{
  // Gebaute Seiten: keine offenen {{Platzhalter}}, keine Reste der Vorlage, Marke im Kopf, Satire-Hinweis im Fuß
  const seiten = ["index", "akademie", "amtsblatt", "beitrag", "kundmachungen", "devotionalien", "impressum", "datenschutz", "inskription", "urkunde", "studienbuch"];
  for (const s of seiten) {
    const html = readFileSync(new URL(`../public/${s}.html`, import.meta.url), "utf8");
    if (/\{\{\w+\}\}/.test(html)) assert.fail(`${s}.html: offener Platzhalter ${html.match(/\{\{\w+\}\}/)[0]}`);
    if (/klangerie|kammerorchester/i.test(html)) assert.fail(`${s}.html: enthält noch Text der Vorlage`);
    if (!html.includes("mozartkugeldreherland-logo-quer-hell.svg")) assert.fail(`${s}.html: Logo fehlt im Kopf`);
    if (!html.includes("Kunstprojekt von cleebration")) assert.fail(`${s}.html: Satire-Hinweis fehlt`);
  }
  ok(true, `${seiten.length} Seiten ohne offene Platzhalter, mit Logo und Satire-Hinweis`);
  const lehrplan = JSON.parse(readFileSync(new URL("../src/data/akademie.json", import.meta.url), "utf8"));
  const akademie = readFileSync(new URL("../public/akademie.html", import.meta.url), "utf8");
  const karten = (akademie.match(/class="kurs"/g) || []).length;
  ok(karten === lehrplan.kurse.length, `Landesakademie zeigt alle ${lehrplan.kurse.length} Lehrveranstaltungen`);
}

{
  // Inskription & Urkunden (27.10.2026)
  const lehrplan = JSON.parse(readFileSync(new URL("../src/data/akademie.json", import.meta.url), "utf8"));
  const akademie = readFileSync(new URL("../public/akademie.html", import.meta.url), "utf8");
  const links = (akademie.match(/href="\/inskription\?lv=\d+"/g) || []).length;
  ok(links === lehrplan.kurse.length, `jede Lehrveranstaltung hat „Inskribieren →“ (${links})`);
  const daten = JSON.parse(readFileSync(new URL("../public/assets/akademie-daten.json", import.meta.url), "utf8"));
  ok(daten.kurse.length === lehrplan.kurse.length && daten.fakultaeten.every((f) => daten.pruefung[f.id]?.length === 3), "akademie-daten.json: alle Kurse, je Fakultät 3 Prüfungsfragen");
  for (const s of ["inskription", "urkunde", "studienbuch"]) {
    const html = readFileSync(new URL(`../public/${s}.html`, import.meta.url), "utf8");
    if (!html.includes(`data-ansicht="${s}"`)) assert.fail(`${s}.html: App-Container fehlt`);
    if (!html.includes("/assets/vendor/qrcode.js") || !html.includes("/assets/akademie-app.js")) assert.fail(`${s}.html: Skripte fehlen`);
    if (!html.includes('<newsletter-signup site="mozartkugeldreherland"')) assert.fail(`${s}.html: Newsletter-Anmeldung fehlt`);
  }
  ok(true, "Inskription, Urkunde, Studienbuch: App, QR und Newsletter eingebunden");
  const ds = readFileSync(new URL("../public/datenschutz.html", import.meta.url), "utf8");
  ok(ds.includes("Inskription, Urkunden, Studienbuch") && ds.includes("localStorage"), "Datenschutz nennt Inskription und localStorage");

  const m = await import("../public/assets/urkunde-code.js");
  const u = { typ: "k", id: "204", anrede: 3, name: "Gustl ~Kugelbauer", datum: "20261027", kugeln: 5, serial: "0042" };
  const code = m.kodieren(u);
  const d = m.dekodieren(code);
  ok(d && d.echt && d.name === "Gustl Kugelbauer" && d.id === "204" && d.kugeln === 5, "Urkunden-Code: hin und zurück, Name gesäubert");
  ok(m.dekodieren(code.replace(/.$/, (c) => (c === "a" ? "b" : "a"))).echt === false, "veränderter Code → Fälschung erkannt");
  ok(m.dekodieren("unsinn") === null && m.dekodieren("") === null, "unlesbarer Code → kein Akt");
  ok(m.kugelnAusPunkten(0) === 1 && m.kugelnAusPunkten(6) === 5, "Note: 0 Punkte = 1 Kugel, 6 Punkte = 5 Kugeln (niemand fällt durch)");
  const kurse = lehrplan.kurse.slice(0, 5).map((k) => ({ id: k.nr, f: k.f }));
  ok(m.titelFuer(kurse).id === 3 && m.titelFuer(lehrplan.kurse.map((k) => ({ id: k.nr, f: k.f }))).id === 5, "Titel: 5 LV = DKD, alle 55 = Dr. h. c. glob.");
}

console.log(`\n${bestanden} Prüfungen bestanden\n`);
