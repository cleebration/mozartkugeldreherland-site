/**
 * Landesakademie – Inskription, Bescheid, Abschlussprüfung, Urkunde, Echtheitsprüfung, Studienbuch.
 * Läuft komplett im Browser: Namen werden nirgends gespeichert; die Urkunde steckt im Link (/urkunde#…),
 * das Studienbuch im localStorage dieses Geräts. Seiten: /inskription, /urkunde, /studienbuch
 * (Element #akademie-app mit data-ansicht). Daten: /assets/akademie-daten.json (build.mjs).
 * Claude, 27.10.2026 – Projekt „MyProj Mozartkugeldreherland“.
 */
import { ANREDEN, TITEL, PRAEDIKATE, kodieren, dekodieren, seriennummer, kugelnAusPunkten, titelFuer, nameSaeubern } from "./urkunde-code.js";

const app = document.getElementById("akademie-app");
const SIEGEL = "/assets/img/mozartkugeldreherland-siegel.svg";
const SPEICHER = "mkd-studienbuch-v1";
const BASIS = location.origin;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MONATE = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const datumText = (ymd) => `${Number(ymd.slice(6, 8))}. ${MONATE[Number(ymd.slice(4, 6)) - 1]} ${ymd.slice(0, 4)}`;
function heute() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; }
const zufall4 = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const anredeName = (u) => [ANREDEN[u.anrede] || "", u.name].filter(Boolean).join(" ");
const urkundeLink = (code) => `${BASIS}/urkunde#${code}`;

let D = null;
const kurs = (nr) => D.kurse.find((k) => k.nr === String(nr));
const fakultaet = (id) => D.fakultaeten.find((f) => f.id === id);

/* ---------- Studienbuch (nur dieses Gerät) ---------- */
function buchLesen() {
  try { const a = JSON.parse(localStorage.getItem(SPEICHER) || "[]"); return Array.isArray(a) ? a.filter((c) => typeof c === "string") : []; }
  catch { return []; }
}
function buchSchreiben(codes) { try { localStorage.setItem(SPEICHER, JSON.stringify(codes)); return true; } catch { return false; } }
function buchEintragen(code) {
  const neu = dekodieren(code);
  const rest = buchLesen().filter((c) => { const u = dekodieren(c); return u && !(u.typ === neu.typ && u.id === neu.id); });
  return buchSchreiben([...rest, code]);
}
function buchKurse() {
  return buchLesen().map((c) => ({ code: c, u: dekodieren(c) })).filter((x) => x.u && x.u.typ === "k" && kurs(x.u.id))
    .map((x) => ({ ...x, id: x.u.id, f: kurs(x.u.id).f }));
}

/* ---------- Druck ---------- */
function drucken(el, quer) {
  for (const x of document.querySelectorAll(".druckbar.aktiv")) x.classList.remove("aktiv");
  el.classList.add("aktiv");
  let st = document.getElementById("druckseite");
  if (!st) { st = document.createElement("style"); st.id = "druckseite"; document.head.append(st); }
  st.textContent = `@page { size: A4 ${quer ? "landscape" : "portrait"}; margin: 10mm; }`;
  document.documentElement.classList.add("druckmodus");
  const fertig = () => { document.documentElement.classList.remove("druckmodus"); el.classList.remove("aktiv"); window.removeEventListener("afterprint", fertig); };
  window.addEventListener("afterprint", fertig);
  window.print();
}

/* ---------- QR ---------- */
function qrSvg(text, gross = 96) {
  if (typeof window.qrcode !== "function") return "";
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(); let p = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) p += `M${x} ${y}h1v1h-1z`;
  return `<svg class="qr" viewBox="-2 -2 ${n + 4} ${n + 4}" width="${gross}" height="${gross}" role="img" aria-label="QR-Code zur Echtheitsprüfung"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${p}" fill="#1B2A4A"/></svg>`;
}

/* ---------- Urkunde ---------- */
const kugelReihe = (n) => Array.from({ length: 5 }, (_, i) => `<span class="kugel${i < n ? " kugel--voll" : ""}" aria-hidden="true"></span>`).join("");

function urkundeHtml(u, code) {
  let gegenstand;
  if (u.typ === "t") {
    const t = TITEL.find((x) => String(x.id) === String(u.id)) || TITEL[0];
    gegenstand = `<p class="urk__klein">der akademische Grad</p><p class="urk__lv">${esc(t.name)}</p>
      <p class="urk__klein">verliehen wird – auf Grundlage eines Studienbuchs, das niemand geprüft hat.</p>`;
  } else {
    const k = kurs(u.id) || { nr: u.id, titel: "(Lehrveranstaltung aufgelassen)", f: "" };
    const f = fakultaet(k.f);
    gegenstand = `<p class="urk__klein">die Lehrveranstaltung</p>
      <p class="urk__lv"><span>LV ${esc(k.nr)}</span> „${esc(k.titel)}“</p>
      <p class="urk__klein">${f ? "der " + esc(f.name) : ""}</p>
      <p class="urk__klein">${esc(PRAEDIKATE[u.kugeln])} hat.</p>
      <p class="urk__note" title="Note in Mozartkugeln">${kugelReihe(u.kugeln)}<span class="urk__note-text">${u.kugeln} von 5 Mozartkugeln</span></p>`;
  }
  return `<article class="urkunde druckbar" aria-label="Urkunde">
  <div class="urk__rahmen">
    <img class="urk__siegel" src="${SIEGEL}" alt="" width="120" height="120" />
    <p class="urk__absender">Landesakademie für Weiterbildung<br />des Mozartkugeldreherlands</p>
    <h2 class="urk__titel">Urkunde</h2>
    <p class="urk__klein">Hiermit wird beurkundet, dass</p>
    <p class="urk__name">${esc(anredeName(u))}</p>
    ${gegenstand}
    <div class="urk__fuss">
      <div class="urk__ort">Gegeben im Mozartkugeldreherland,<br />am ${esc(datumText(u.datum))}</div>
      <div class="urk__unterschrift"><svg viewBox="0 0 200 50" aria-hidden="true"><path d="M8 34c18-26 26-24 22-4-3 14 10-20 20-12 8 6-6 22 6 14s18-22 26-10c6 9 12-10 22-6 9 4-2 16 10 12 14-5 22-16 34-12 10 3 18 2 30-6" fill="none" stroke="#1B2A4A" stroke-width="2.2" stroke-linecap="round"/></svg>
        <span>Der Landesrektor</span></div>
      <div class="urk__qr">${qrSvg(urkundeLink(code), 84)}<span>${esc(seriennummer(u))}</span></div>
    </div>
    <p class="urk__mikro">Diese Urkunde berechtigt zu nichts. Satire – ein Kunstprojekt von cleebration · mozartkugeldreherland.at</p>
  </div>
</article>`;
}

/* ---------- Social-Bild 1080×1350 ---------- */
async function bildErzeugen(u, code) {
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { await Promise.all(['700 64px "Playfair Display"', 'italic 400 40px "Playfair Display"', '400 30px "Source Serif 4"', '500 22px "IBM Plex Mono"'].map((f) => document.fonts.load(f))); } catch {}
  g.fillStyle = "#1B2A4A"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#F3EAD3"; g.fillRect(40, 40, W - 80, H - 80);
  g.strokeStyle = "#C9A13B"; g.lineWidth = 6; g.strokeRect(62, 62, W - 124, H - 124);
  g.lineWidth = 2; g.strokeRect(78, 78, W - 156, H - 156);
  const siegel = new Image(); siegel.src = SIEGEL;
  try { await siegel.decode(); g.drawImage(siegel, W / 2 - 120, 120, 240, 240); } catch {}
  g.textAlign = "center";
  const zeile = (t, y, font, farbe = "#1E1A16") => { g.font = font; g.fillStyle = farbe; g.fillText(t, W / 2, y); };
  const umbrechen = (t, y, font, farbe, max = 860, abstand = 58) => {
    g.font = font; const woerter = t.split(" "); let z = "", ys = y;
    for (const w of woerter) { const p = z ? z + " " + w : w; if (g.measureText(p).width > max && z) { zeile(z, ys, font, farbe); ys += abstand; z = w; } else z = p; }
    if (z) zeile(z, ys, font, farbe); return ys;
  };
  zeile("LANDESAKADEMIE FÜR WEITERBILDUNG", 410, '500 24px "IBM Plex Mono", monospace', "#7A1E2C");
  zeile("Urkunde", 500, '700 84px "Playfair Display", Georgia, serif', "#1B2A4A");
  zeile("Hiermit wird beurkundet, dass", 570, '400 30px "Source Serif 4", Georgia, serif', "#5E5545");
  let y = umbrechen(anredeName(u), 650, 'italic 400 58px "Playfair Display", Georgia, serif', "#1B2A4A", 880, 66);
  if (u.typ === "t") {
    const t = TITEL.find((x) => String(x.id) === String(u.id)) || TITEL[0];
    zeile("der akademische Grad", y + 70, '400 30px "Source Serif 4", Georgia, serif', "#5E5545");
    y = umbrechen(t.name, y + 140, '700 46px "Playfair Display", Georgia, serif', "#7A1E2C", 860, 56);
    zeile("verliehen wird.", y + 64, '400 30px "Source Serif 4", Georgia, serif', "#5E5545");
  } else {
    const k = kurs(u.id);
    zeile("die Lehrveranstaltung", y + 70, '400 30px "Source Serif 4", Georgia, serif', "#5E5545");
    y = umbrechen(`„${k ? k.titel : u.id}“`, y + 140, '700 50px "Playfair Display", Georgia, serif', "#7A1E2C", 860, 60);
    zeile(PRAEDIKATE[u.kugeln] + " hat.", y + 64, '400 30px "Source Serif 4", Georgia, serif', "#5E5545");
    const kx = W / 2 - 2 * 62;
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.arc(kx + i * 62, y + 140, 22, 0, Math.PI * 2);
      g.fillStyle = i < u.kugeln ? "#4A2A18" : "transparent"; g.fill();
      g.lineWidth = 3; g.strokeStyle = "#C9A13B"; g.stroke();
    }
  }
  zeile(`Gegeben im Mozartkugeldreherland, am ${datumText(u.datum)}`, 1150, '400 26px "Source Serif 4", Georgia, serif', "#1E1A16");
  zeile(seriennummer(u) + "  ·  mozartkugeldreherland.at", 1200, '500 20px "IBM Plex Mono", monospace', "#5E5545");
  zeile("#mozartkugeldreherland  ·  Satire – ein Kunstprojekt von cleebration", 1238, '500 18px "IBM Plex Mono", monospace', "#7A5C18");
  if (typeof window.qrcode === "function") {
    const q = window.qrcode(0, "M"); q.addData(urkundeLink(code)); q.make();
    const n = q.getModuleCount(), m = 3, s = m * (n + 4), x0 = W - 104 - s, y0 = 1250 - 104 - s;
    g.fillStyle = "#fff"; g.fillRect(x0, y0, s, s); g.fillStyle = "#1B2A4A";
    for (let r = 0; r < n; r++) for (let cc = 0; cc < n; cc++) if (q.isDark(r, cc)) g.fillRect(x0 + (cc + 2) * m, y0 + (r + 2) * m, m, m);
  }
  return new Promise((res) => c.toBlob(res, "image/png"));
}

/* ---------- Aktionen unter einer Urkunde ---------- */
function urkundeAnzeigen(ziel, u, code, { neu = false } = {}) {
  const dateiname = `mozartkugeldreherland-urkunde-${u.typ === "t" ? "titel" : "lv-" + u.id}.png`;
  ziel.innerHTML = `${urkundeHtml(u, code)}
  <div class="urk-aktionen">
    <button type="button" class="btn btn--gold" data-a="druck">Drucken / als PDF speichern</button>
    <button type="button" class="btn btn--outline" data-a="bild">Bild für Social Media</button>
    <button type="button" class="btn btn--outline" data-a="link">Link zur Echtheitsprüfung kopieren</button>
    ${navigator.share ? `<button type="button" class="btn btn--outline" data-a="teilen">Teilen</button>` : ""}
  </div>
  <p class="urk-meldung" role="status" aria-live="polite"></p>
  ${neu ? `<p class="hinweis-box">Die Urkunde ist in Ihrem <a class="textlink" href="/studienbuch">Studienbuch</a> vermerkt (nur auf diesem Gerät). Der Link oben ist Ihre einzige Ausfertigung – die Landesakademie bewahrt nichts auf. Ab fünf Lehrveranstaltungen winkt ein akademischer Grad.</p>` : ""}`;
  const meldung = ziel.querySelector(".urk-meldung");
  const melde = (t) => { meldung.textContent = t; };
  ziel.querySelector('[data-a="druck"]').addEventListener("click", () => drucken(ziel.querySelector(".urkunde"), true));
  ziel.querySelector('[data-a="link"]').addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(urkundeLink(code)); melde("Link kopiert. Die Echtheit wird damit amtlich nachprüfbar."); }
    catch { prompt("Link zur Echtheitsprüfung:", urkundeLink(code)); }
  });
  ziel.querySelector('[data-a="bild"]').addEventListener("click", async (e) => {
    e.target.disabled = true; melde("Bild wird von Hand gedreht …");
    const blob = await bildErzeugen(u, code);
    e.target.disabled = false;
    if (!blob) { melde("Das Bild konnte nicht erstellt werden. Es funktioniert hier eben nichts."); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = dateiname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    melde("Bild gespeichert. Hashtag: #mozartkugeldreherland");
  });
  const t = ziel.querySelector('[data-a="teilen"]');
  if (t) t.addEventListener("click", async () => {
    const text = u.typ === "t" ? "Ich habe einen akademischen Grad der Landesakademie des Mozartkugeldreherlands. #mozartkugeldreherland" : `Bestanden: „${(kurs(u.id) || {}).titel}“ an der Landesakademie des Mozartkugeldreherlands. #mozartkugeldreherland`;
    try {
      const blob = await bildErzeugen(u, code);
      const datei = blob && new File([blob], dateiname, { type: "image/png" });
      if (datei && navigator.canShare && navigator.canShare({ files: [datei] })) await navigator.share({ files: [datei], text: text + " " + urkundeLink(code) });
      else await navigator.share({ title: "Urkunde", text, url: urkundeLink(code) });
    } catch {}
  });
}

/* ---------- Ansicht: Inskription ---------- */
function kursAuswahl(gewaehlt) {
  return D.fakultaeten.map((f) => `<optgroup label="${esc(f.nr)} · ${esc(f.name)}">${D.kurse.filter((k) => k.f === f.id)
    .map((k) => `<option value="${esc(k.nr)}"${k.nr === gewaehlt ? " selected" : ""}>LV ${esc(k.nr)} · ${esc(k.titel)}</option>`).join("")}</optgroup>`).join("");
}

function schritt(n) {
  for (const li of document.querySelectorAll(".schritte li")) li.toggleAttribute("aria-current", Number(li.dataset.s) === n);
  app.scrollIntoView({ behavior: "smooth", block: "start" });
}

function inskription() {
  const vorwahl = new URLSearchParams(location.search).get("lv");
  const start = kurs(vorwahl) ? vorwahl : "103";
  app.innerHTML = `<form class="antrag" novalidate>
    <p class="kicker">Formular I-1 · Antrag auf Inskription</p>
    <label class="feld"><span>Lehrveranstaltung</span><select name="lv" required>${kursAuswahl(start)}</select></label>
    <label class="feld"><span>Anrede</span><select name="anrede">${ANREDEN.map((a, i) => `<option value="${i}"${i === 1 ? " selected" : ""}>${i ? esc(a) : "ohne Titel (nicht empfohlen)"}</option>`).join("")}</select></label>
    <label class="feld"><span>Name oder Pseudonym</span><input name="name" maxlength="40" autocomplete="off" required placeholder="z. B. Gustl Kugelbauer" /></label>
    <p class="feld__hinweis">Erscheint auf Bescheid und Urkunde. Wird nirgends gespeichert – die Landesakademie vergisst Sie sofort.</p>
    <label class="feld feld--check"><input type="checkbox" name="verzicht" required /><span>Ich verpflichte mich, die Kursunterlagen nicht zu lesen und keine Fragen zu stellen.</span></label>
    <p class="antrag__fehler" role="alert"></p>
    <button class="btn btn--gold" type="submit">Antrag einreichen</button>
  </form>`;
  const form = app.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = nameSaeubern(fd.get("name"));
    const fehler = form.querySelector(".antrag__fehler");
    if (!name) { fehler.textContent = "Ohne Namen kein Akt. Ein Pseudonym genügt."; return; }
    if (!fd.get("verzicht")) { fehler.textContent = "Bitte bestätigen Sie den Leseverzicht. Er ist Voraussetzung."; return; }
    await bearbeitung({ lv: fd.get("lv"), anrede: Number(fd.get("anrede")) || 0, name });
  });
  schritt(1);
}

async function bearbeitung(antrag) {
  schritt(2);
  const schritte = ["Antrag langt ein …", "Antrag wird von Hand gedreht …", "Zuständigkeit wird geprüft …", "Zuständigkeit wurde verneint …", "Zuständigkeit wurde ausnahmsweise bejaht.", "Stempel wird gesucht …", "Stempel gefunden."];
  app.innerHTML = `<div class="bearbeitung"><p class="kicker">Akt in Bearbeitung</p><div class="balken"><span></span></div><p class="bearbeitung__text" role="status" aria-live="polite"></p></div>`;
  const text = app.querySelector(".bearbeitung__text"), balken = app.querySelector(".balken span");
  const schnell = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (let i = 0; i < schritte.length; i++) {
    text.textContent = schritte[i];
    balken.style.width = `${Math.round(((i + 1) / schritte.length) * 100)}%`;
    await warte(schnell ? 150 : 520 + Math.random() * 380);
  }
  bescheid({ ...antrag, datum: heute(), serial: zufall4() });
}

function bescheid(a) {
  schritt(3);
  const k = kurs(a.lv), f = fakultaet(k.f);
  const az = `MKL-${a.datum.slice(0, 4)}/${k.nr}-${a.serial} (vorläufig)`;
  app.innerHTML = `<article class="bescheid-dok druckbar">
    <header class="bescheid-dok__kopf">
      <img src="${SIEGEL}" alt="" width="72" height="72" />
      <div><p class="bescheid-dok__stelle">Landesakademie für Weiterbildung<br />Inskriptionsstelle</p>
      <p class="bescheid-dok__az">Aktenzahl: ${esc(az)}<br />Datum: ${esc(datumText(a.datum))}</p></div>
    </header>
    <p class="bescheid-dok__an">An<br /><strong>${esc(anredeName(a))}</strong><br />unbekannter Aufenthalt</p>
    <h2 class="bescheid-dok__titel">Bescheid</h2>
    <h3>Spruch</h3>
    <p>Dem Antrag auf Inskription in die Lehrveranstaltung <strong>LV ${esc(k.nr)} „${esc(k.titel)}“</strong> der ${esc(f.name)} wird <strong>ausnahmsweise stattgegeben</strong>.</p>
    <h3>Begründung</h3>
    <p>Der Antrag war unvollständig, unleserlich und verspätet. Er wurde dennoch bewilligt, weil eine Ablehnung einen weiteren Akt erfordert hätte.</p>
    <h3>Auflagen</h3>
    <ol><li>Die Kursunterlagen sind nicht zu lesen.</li><li>Fragen sind zu unterlassen.</li><li>Die Teilnahme gilt mit Zustellung dieses Bescheids als erfolgt. Der Abschlussprüfung steht nichts im Weg – außer Ihnen.</li></ol>
    <h3>Rechtsmittelbelehrung</h3>
    <p class="bescheid-dok__klein">Gegen diesen Bescheid ist ein Rechtsmittel zulässig. Es ist binnen zwei Wochen in dreifacher Ausfertigung bei jener Stelle einzubringen, deren Zuständigkeit derzeit geklärt wird.</p>
    <footer class="bescheid-dok__fuss"><span class="stempel">Bewilligt</span><span>Für den Landesrektor:<br />i. A. (unleserlich)</span></footer>
  </article>
  <div class="urk-aktionen">
    <button type="button" class="btn btn--gold" data-a="pruefung">Zur Abschlussprüfung</button>
    <button type="button" class="btn btn--outline" data-a="druck">Bescheid drucken</button>
  </div>`;
  app.querySelector('[data-a="druck"]').addEventListener("click", () => drucken(app.querySelector(".bescheid-dok"), false));
  app.querySelector('[data-a="pruefung"]').addEventListener("click", () => pruefung(a));
}

function pruefung(a) {
  schritt(4);
  const k = kurs(a.lv), fragen = D.pruefung[k.f] || [];
  app.innerHTML = `<form class="pruefung" novalidate>
    <p class="kicker">Abschlussprüfung · LV ${esc(k.nr)} „${esc(k.titel)}“</p>
    <p class="pruefung__intro">Drei Fragen. Es gibt keine falschen Antworten – nur bedenkliche.</p>
    ${fragen.map((q, i) => `<fieldset class="frage"><legend><span>Frage ${i + 1}</span> ${esc(q.frage)}</legend>
      ${q.antworten.map((x, j) => `<label class="antwort"><input type="radio" name="f${i}" value="${j}" required /><span>${esc(x.text)}</span></label>`).join("")}
    </fieldset>`).join("")}
    <p class="antrag__fehler" role="alert"></p>
    <button class="btn btn--gold" type="submit">Prüfung abgeben</button>
  </form>`;
  const form = app.querySelector("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const wahl = fragen.map((_, i) => form.querySelector(`input[name="f${i}"]:checked`));
    if (wahl.some((w) => !w)) { form.querySelector(".antrag__fehler").textContent = "Bitte alle Fragen beantworten. Raten ist ausdrücklich erlaubt."; return; }
    const antw = wahl.map((w, i) => fragen[i].antworten[Number(w.value)]);
    const kugeln = kugelnAusPunkten(antw.reduce((s, x) => s + (Number(x.p) || 0), 0));
    ergebnis(a, fragen, antw, kugeln);
  });
}

function ergebnis(a, fragen, antw, kugeln) {
  schritt(5);
  const u = { typ: "k", id: a.lv, anrede: a.anrede, name: a.name, datum: a.datum, kugeln, serial: a.serial };
  const code = kodieren(u);
  const d = dekodieren(code);
  buchEintragen(code);
  app.innerHTML = `<section class="ergebnis">
    <p class="kicker">Prüfungsergebnis</p>
    <h2 class="ergebnis__titel">${esc(PRAEDIKATE[kugeln][0].toUpperCase() + PRAEDIKATE[kugeln].slice(1))}.</h2>
    <ul class="ergebnis__liste">${antw.map((x, i) => `<li><span>${esc(fragen[i].frage)}</span> <em>${esc(x.text)}</em> — <strong>${esc(x.bem)}</strong></li>`).join("")}</ul>
    <p class="ergebnis__fuss">Durchfallen ist im Mozartkugeldreherland nicht vorgesehen.</p>
  </section>
  <div class="urk-ziel"></div>`;
  urkundeAnzeigen(app.querySelector(".urk-ziel"), d, code, { neu: true });
  history.replaceState(null, "", "/inskription?lv=" + encodeURIComponent(a.lv));
}

/* ---------- Ansicht: Echtheitsprüfung ---------- */
function echtheit() {
  const code = location.hash.slice(1);
  const u = dekodieren(code);
  if (!u) {
    app.innerHTML = `<div class="pruefstelle"><p class="stempel">Kein Akt</p>
      <p>Diese Adresse enthält keine lesbare Urkunde. Urkunden werden ausschließlich über den Link geprüft, der bei der Ausstellung entsteht.</p>
      <p><a class="btn btn--gold" href="/inskription">Selbst inskribieren</a></p></div>`;
    return;
  }
  app.innerHTML = `<div class="pruefstelle ${u.echt ? "pruefstelle--echt" : "pruefstelle--falsch"}">
      <p class="stempel">${u.echt ? "Echt" : "Fälschung erkannt"}</p>
      <p>${u.echt ? "Diese Urkunde wurde von der Landesakademie ausgestellt. Leider." : "Die Urkunde wurde nachträglich verändert. Sie wird – wie hierzulande üblich – trotzdem anerkannt."}</p>
      <p class="pruefstelle__nr">Seriennummer ${esc(seriennummer(u))}</p>
    </div><div class="urk-ziel"></div>
    <p class="urk-weiter"><a class="btn btn--gold" href="/inskription">Selbst inskribieren</a> <a class="btn btn--outline" href="/akademie">Zum Lehrplan</a></p>`;
  urkundeAnzeigen(app.querySelector(".urk-ziel"), u, code);
}

/* ---------- Ansicht: Studienbuch ---------- */
function studienbuch() {
  const eintraege = buchKurse();
  const titel = titelFuer(eintraege, D.fakultaeten.length);
  const naechster = TITEL.find((t) => !titel || t.id === titel.id + 1);
  const titelUrk = buchLesen().map(dekodieren).filter((u) => u && u.typ === "t");
  const fakAnz = new Set(eintraege.map((e) => e.f)).size;
  const fehltBis = (t) => t.fak ? `noch ${D.fakultaeten.length - fakAnz} Fakultät(en) offen` : `noch ${t.min - eintraege.length} Lehrveranstaltung(en)`;
  app.innerHTML = `<section class="studienbuch">
    <div class="studienbuch__kopf">
      <p class="kicker">Akademischer Stand</p>
      <h2 class="studienbuch__titel">${titel ? esc(titel.name) : "Noch nicht inskribiert. Auch das ist eine Haltung."}</h2>
      <p>${eintraege.length} von ${D.kurse.length} Lehrveranstaltungen · ${fakAnz} von ${D.fakultaeten.length} Fakultäten${naechster ? ` · nächster Grad: ${esc(naechster.name)} (${fehltBis(naechster)})` : " · höchster Grad erreicht"}</p>
      ${titel && titel.id >= 3 ? `<p><button type="button" class="btn btn--gold" data-a="titel">Titelurkunde ausstellen</button></p>` : ""}
    </div>
    ${eintraege.length ? `<ol class="studienbuch__liste">${eintraege.map((e) => `<li><span class="kurs__nr">LV ${esc(e.id)} · ${esc(datumText(e.u.datum))}</span>
      <a href="/urkunde#${esc(e.code)}">${esc(kurs(e.id).titel)}</a> <span class="studienbuch__kugeln" title="${e.u.kugeln} von 5 Mozartkugeln">${kugelReihe(e.u.kugeln)}</span></li>`).join("")}</ol>` : `<p><a class="btn btn--gold" href="/inskription">Erste Lehrveranstaltung inskribieren</a></p>`}
    ${titelUrk.length ? `<p>Titelurkunden: ${titelUrk.map((u) => `<a class="textlink" href="/urkunde#${esc(kodieren(u))}">${esc((TITEL.find((t) => String(t.id) === u.id) || {}).name)}</a>`).join(" · ")}</p>` : ""}
    <p class="studienbuch__fuss">Das Studienbuch liegt nur in diesem Browser auf diesem Gerät. <button type="button" class="linkknopf" data-a="leeren">Studienbuch löschen</button></p>
    <div class="urk-ziel"></div>
  </section>`;
  const tk = app.querySelector('[data-a="titel"]');
  if (tk) tk.addEventListener("click", () => {
    const letzte = eintraege[eintraege.length - 1].u;
    const u = { typ: "t", id: String(titel.id), anrede: letzte.anrede, name: letzte.name, datum: heute(), kugeln: 5, serial: zufall4() };
    const code = kodieren(u);
    buchEintragen(code);
    urkundeAnzeigen(app.querySelector(".urk-ziel"), dekodieren(code), code, { neu: true });
    app.querySelector(".urk-ziel").scrollIntoView({ behavior: "smooth" });
  });
  app.querySelector('[data-a="leeren"]').addEventListener("click", () => {
    if (confirm("Studienbuch löschen? Die Urkunden-Links bleiben gültig, nur die Liste hier verschwindet.")) { buchSchreiben([]); studienbuch(); }
  });
}

/* ---------- Start ---------- */
if (app) {
  try {
    D = await (await fetch("/assets/akademie-daten.json")).json();
    const ansicht = app.dataset.ansicht;
    if (ansicht === "inskription") inskription();
    else if (ansicht === "urkunde") { echtheit(); window.addEventListener("hashchange", echtheit); }
    else if (ansicht === "studienbuch") studienbuch();
  } catch (err) {
    app.innerHTML = `<p class="hinweis-box">Die Landesakademie ist vorübergehend geschlossen (technische Gründe, wie immer). Bitte später erneut versuchen.</p>`;
    console.error(err);
  }
}
