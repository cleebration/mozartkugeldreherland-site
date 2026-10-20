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

for (const [alt, neu] of [["/blog", "/amtsblatt"], ["/newsletter", "/kundmachungen"], ["/shop", "/devotionalien"], ["/weiterbildung", "/akademie"], ["/lehrplan", "/akademie"]]) {
  const r = await hole(alt);
  ok(r.status === 301 && ziel(r) === neu, `${alt} → ${neu} (301)`);
}
ok(ziel(await hole("/post/irgendwas")) === "/amtsblatt", "/post/… → /amtsblatt");

{
  const r = await hole("/akademie", "https://www.mozartkugeldreherland.at");
  ok(r.status === 301 && r.headers.get("location") === BASIS + "/akademie", "www → ohne www (301)");
  const r2 = await hole("/shop", "https://www.mozartkugeldreherland.at");
  ok(r2.headers.get("location") === BASIS + "/devotionalien", "www + Kurzadresse: EIN Sprung");
  for (const p of ["/", "/akademie", "/amtsblatt", "/beitrag", "/kundmachungen", "/devotionalien", "/impressum", "/datenschutz"]) {
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
  const seiten = ["index", "akademie", "amtsblatt", "beitrag", "kundmachungen", "devotionalien", "impressum", "datenschutz"];
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

console.log(`\n${bestanden} Prüfungen bestanden\n`);
