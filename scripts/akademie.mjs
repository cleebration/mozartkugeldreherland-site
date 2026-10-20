/**
 * Lehrplan der Landesakademie → HTML (für /akademie und die Startseite).
 * Daten: src/data/akademie.json. Angelegt 20.10.2026 (Claude).
 */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function karte(k, f) {
  return `<article class="kurs" id="lv-${esc(k.nr)}">
  <p class="kurs__nr">LV ${esc(k.nr)}${f ? ` · <span>${esc(f.name.replace("Fakultät für ", ""))}</span>` : ""}</p>
  <h3 class="kurs__titel">${esc(k.titel)}</h3>
  <p class="kurs__text">${esc(k.text)}</p>
  <p class="kurs__umfang">${esc(k.umfang)}</p>
</article>`;
}

export function renderAkademie(daten) {
  const nav = daten.fakultaeten
    .map((f) => `<li><a href="#fak-${esc(f.id)}"><span>${esc(f.nr)}</span> ${esc(f.name.replace("Fakultät für ", ""))}</a></li>`)
    .join("\n");
  const teile = daten.fakultaeten.map((f) => {
    const kurse = daten.kurse.filter((k) => k.f === f.id);
    if (!kurse.length) return "";
    return `<section class="fakultaet" id="fak-${esc(f.id)}">
  <header class="fakultaet__kopf">
    <p class="fakultaet__nr">${esc(f.nr)}</p>
    <div><h2 class="fakultaet__name">${esc(f.name)}</h2><p class="fakultaet__motto">„${esc(f.motto)}“</p></div>
    <p class="fakultaet__anzahl">${kurse.length} Lehrveranstaltungen</p>
  </header>
  <div class="kurse">
${kurse.map((k) => karte(k)).join("\n")}
  </div>
</section>`;
  });
  const fremd = daten.kurse.filter((k) => !daten.fakultaeten.some((f) => f.id === k.f));
  if (fremd.length) throw new Error("akademie.json: Kurs ohne gültige Fakultät: " + fremd.map((k) => k.nr).join(", "));
  return `<nav class="fak-nav" aria-label="Fakultäten"><ul>\n${nav}\n</ul></nav>\n${teile.join("\n")}`;
}

export function renderKursauswahl(daten, nummern) {
  return nummern
    .map((nr) => {
      const k = daten.kurse.find((x) => x.nr === nr);
      if (!k) throw new Error(`Startseite: Kurs ${nr} fehlt in akademie.json`);
      return karte(k, daten.fakultaeten.find((f) => f.id === k.f));
    })
    .join("\n");
}
