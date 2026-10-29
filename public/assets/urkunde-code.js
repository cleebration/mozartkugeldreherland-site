/**
 * Urkunden-Code der Landesakademie (mozartkugeldreherland.at).
 * Eine Urkunde steckt vollständig im Link (/urkunde#<code>) – am Server wird nichts gespeichert.
 * Der Teil hinter # wird vom Browser nie an den Server geschickt.
 * Prüfsumme: FNV-1a über Inhalt + Salz. Kein Kryptoschutz – erkennt nur veränderte Links
 * („Fälschung erkannt. Wird – wie üblich – trotzdem anerkannt.“). Claude, 27.10.2026.
 */
export const ANREDEN = ["", "Hofrat", "Hofrätin", "Kommerzialrat", "Kommerzialrätin", "Mag. h. c.", "Ehrenbürgerin", "Ehrenbürger", "Exzellenz"];

export const TITEL = [
  { id: 1, min: 1, name: "Inskribierte Person (ordentlich)" },
  { id: 2, min: 3, name: "Akademisch geprüfte Kugeldrehfachkraft" },
  { id: 3, min: 5, name: "Diplomierte Kugeldrehkraft (DKD)" },
  { id: 4, fak: 5, name: "Magister rerum globulorum (Mag. rer. glob.)" },
  { id: 5, min: 55, name: "Doctor honoris causa globuli (Dr. h. c. glob.)" }
];

export const PRAEDIKATE = { 5: "mit Auszeichnung bestanden", 4: "mit gutem Erfolg bestanden", 3: "bestanden", 2: "bestanden (nach Intervention)", 1: "bestanden (aus Mitleid)" };

const SALZ = "nihil-functionat-nisi-globulus";
const TRENN = "~";

function fnv(text) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function b64url(text) {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function ausB64url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Name säubern: kein Trennzeichen, keine Steuerzeichen, max. 40 Zeichen. */
export const nameSaeubern = (n) => String(n ?? "").replace(/[~\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

/** u = { typ: "k"|"t", id, anrede (Index), name, datum ("yyyymmdd"), kugeln (1–5), serial ("0000"–"9999") } */
export function kodieren(u) {
  const inhalt = ["1", u.typ, u.id, u.anrede, nameSaeubern(u.name), u.datum, u.kugeln, u.serial].join(TRENN);
  return b64url(inhalt) + "." + fnv(SALZ + inhalt);
}

/** → { …u, echt: true|false, check } oder null, wenn der Code unlesbar ist. */
export function dekodieren(code) {
  try {
    const [teil, pruef] = String(code ?? "").trim().replace(/^#/, "").split(".");
    if (!teil) return null;
    const inhalt = ausB64url(teil);
    const f = inhalt.split(TRENN);
    if (f.length !== 8 || f[0] !== "1" || !/^[kt]$/.test(f[1])) return null;
    const u = { typ: f[1], id: f[2], anrede: Number(f[3]) || 0, name: f[4], datum: f[5], kugeln: Math.min(5, Math.max(1, Number(f[6]) || 1)), serial: f[7] };
    if (!u.name || !/^\d{8}$/.test(u.datum)) return null;
    const check = fnv(SALZ + inhalt);
    return { ...u, echt: pruef === check, check };
  } catch {
    return null;
  }
}

/** z. B. MKL-2026/101-4711-K3F9 */
export const seriennummer = (u) => `MKL-${u.datum.slice(0, 4)}/${u.typ === "t" ? "T" + u.id : u.id}-${u.serial}-${(u.check || fnv(SALZ + u.serial)).slice(0, 4).toUpperCase()}`;

/** Punkte (0–6) → Mozartkugeln (1–5). Durchfallen ist nicht vorgesehen. */
export const kugelnAusPunkten = (p) => 1 + Math.round((Math.max(0, Math.min(6, p)) * 4) / 6);

/** Höchster erreichter Titel für eine Liste von Urkunden ({typ, id, f}) – null, wenn keiner. */
export function titelFuer(kurse, fakultaetenGesamt = 5) {
  const lv = new Set(kurse.map((k) => k.id));
  const fak = new Set(kurse.map((k) => k.f));
  let best = null;
  for (const t of TITEL) {
    const ok = t.fak ? fak.size >= Math.min(t.fak, fakultaetenGesamt) : lv.size >= t.min;
    if (ok) best = t;
  }
  return best;
}
