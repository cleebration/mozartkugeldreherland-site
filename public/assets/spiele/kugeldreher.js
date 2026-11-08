// cleebration Markenspiel (kugeldreher) – eine Datei, keine Abhängigkeiten. Claude, Chat MyProj Eggstra, 08.11.2026.
const lies = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v) } catch { return f } };
const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
const mischen = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
let actx = null;
function audio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch { actx = null } return actx }
function ton(f, dauer = .15, typ = 'triangle', laut = .2, wann = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + wann, o = a.createOscillator(), g = a.createGain();
  o.type = typ; o.frequency.value = f; g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(.0001, t + dauer);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dauer + .02);
}
const $ = (s, el = document) => el.querySelector(s);
const CSS = `
.sp{background:var(--sp-bg,#16131F);color:var(--sp-ink,#F5F2FF);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;font-family:var(--sp-font-body,system-ui,sans-serif);max-width:760px;margin:0 auto;min-height:380px}
.sp-hud{display:flex;flex-wrap:wrap;gap:8px;font-size:.88rem}
.sp-hud span{background:rgba(255,255,255,.1);padding:4px 10px;border-radius:8px;font-variant-numeric:tabular-nums}
.sp-mitte{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
.sp-hinweis{font-size:.88rem;opacity:.75;margin:0}
.sp-btn{font:700 1rem var(--sp-font-body,system-ui,sans-serif);border:0;border-radius:12px;padding:11px 20px;cursor:pointer;background:var(--sp-akzent,#E8443A);color:var(--sp-akzent-ink,#fff)}
.sp-btn:focus-visible,.sp button:focus-visible{outline:3px solid var(--sp-akzent2,#F2A30E);outline-offset:2px}
.sp canvas{display:block;width:100%;height:auto;border-radius:12px;touch-action:manipulation;user-select:none;-webkit-user-select:none;max-width:100%}
.sp-gross{font-family:var(--sp-font-display,inherit);font-size:clamp(1.3rem,5vw,2rem);line-height:1.15}
@media(prefers-reduced-motion:reduce){.sp *{transition:none!important;animation:none!important}}
`;
function stil(extra = '') {
  if (!document.getElementById('sp-stil')) { const s = document.createElement('style'); s.id = 'sp-stil'; s.textContent = CSS; document.head.appendChild(s) }
  if (extra) { const s = document.createElement('style'); s.textContent = extra; document.head.appendChild(s) }
}
function leinwand(cv, w, h) { const c = cv.getContext('2d'); if (!c) return null; const d = Math.min(devicePixelRatio || 1, 2); cv.width = w * d; cv.height = h * d; c.scale(d, d); if (!c.roundRect) c.roundRect = function (x, y, ww, hh) { this.rect(x, y, ww, hh) }; return c }
// mozartkugeldreherland – Kugeldreher: Klick- und Aufbauspiel, dreht auch weiter, wenn man weg ist (max. 8 h).
const SHOP = [
  { id: 'lehrling', name: 'Kugel-Lehrling', proSek: .5, preis: 15 },
  { id: 'bank', name: 'Dreherbank mit Förderantrag', proSek: 3, preis: 110 },
  { id: 'laden', name: 'Souvenirladen am Kugelplatz', proSek: 15, preis: 650 },
  { id: 'amt', name: 'Bundesamt für Kugeligkeit', proSek: 80, preis: 4200 },
  { id: 'kanzlei', name: 'Kugelkanzleramt', proSek: 450, preis: 30000 },
];
const TITEL = [[0, 'Kugelanwärter'], [50, 'Hilfsdreher'], [500, 'Oberkugelrat'], [5000, 'Hofrat der Rundung'], [50000, 'Kugelkanzler'], [500000, 'Ehren-Mozart']];
export function mount(root) {
  stil(`.mk-kugel{width:min(190px,48vw);aspect-ratio:1;border-radius:50%;border:0;cursor:pointer;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55) 0 6%,transparent 7%),radial-gradient(circle at 40% 38%,#C9A13B,#8C6A1E 55%,#4A2A18);box-shadow:0 14px 30px rgba(0,0,0,.45),inset 0 -8px 18px rgba(0,0,0,.35);transition:transform .08s}
.mk-kugel:active{transform:scale(.95)}
.mk-shop{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
@media(max-width:520px){.mk-shop{grid-template-columns:1fr}}
.mk-shop button{text-align:left;font:600 .92rem var(--sp-font-body,system-ui);padding:10px 12px;border-radius:12px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;display:flex;justify-content:space-between;gap:8px}
.mk-shop button:disabled{opacity:.4;cursor:default}.mk-shop small{color:var(--sp-akzent2,#C9A13B);white-space:nowrap;font-variant-numeric:tabular-nums}`);
  root.classList.add('sp');
  const KEY = 'mkdl-kugeldreher';
  const z = lies(KEY, { kugeln: 0, besitz: {}, zuletzt: Date.now() });
  const proSek = () => SHOP.reduce((s, x) => s + (z.besitz[x.id] || 0) * x.proSek, 0);
  const preis = x => Math.ceil(x.preis * Math.pow(1.15, z.besitz[x.id] || 0));
  const weg = Math.max(0, Math.min(8 * 3600, (Date.now() - (z.zuletzt || Date.now())) / 1000)); const nachgeholt = weg * proSek(); z.kugeln += nachgeholt;
  const titel = () => { let t = TITEL[0][1]; for (const [ab, n] of TITEL) if (z.kugeln >= ab) t = n; return t };
  const zahl = n => Math.floor(n).toLocaleString('de-AT');
  root.innerHTML = `<div class="sp-hud"><span data-ps></span><span data-t></span></div>
    <div class="sp-mitte"><div class="sp-gross" data-z></div>
      <button class="mk-kugel" type="button" aria-label="Mozartkugel drehen"></button>
      <p class="sp-hinweis" data-info>Jeder Klick dreht eine Kugel. Mit Beförderungen dreht das Land von selbst – auch wenn du weg bist.</p>
      <div class="mk-shop"></div></div>`;
  if (nachgeholt >= 1) $('[data-info]', root).textContent = `Während du weg warst, hat das Land ${zahl(nachgeholt)} Kugeln gedreht.`;
  function zeige() {
    $('[data-z]', root).textContent = zahl(z.kugeln) + ' Kugeln';
    $('[data-ps]', root).textContent = proSek().toLocaleString('de-AT', { maximumFractionDigits: 1 }) + ' pro Sekunde';
    $('[data-t]', root).textContent = titel();
    const shop = $('.mk-shop', root);
    shop.innerHTML = SHOP.map(x => `<button type="button" data-id="${x.id}" ${z.kugeln < preis(x) ? 'disabled' : ''}><span>${x.name} (${z.besitz[x.id] || 0})</span><small>${zahl(preis(x))}</small></button>`).join('');
    shop.querySelectorAll('button').forEach(b => b.onclick = () => {
      const x = SHOP.find(s => s.id === b.dataset.id); if (z.kugeln < preis(x)) return;
      z.kugeln -= preis(x); z.besitz[x.id] = (z.besitz[x.id] || 0) + 1; ton(660, .12); zeige();
    });
  }
  $('.mk-kugel', root).onclick = () => { z.kugeln += 1; ton(300 + Math.random() * 80, .05, 'sine', .12); zeige() };
  zeige();
  const iv = setInterval(() => { z.kugeln += proSek() / 4; z.zuletzt = Date.now(); schreib(KEY, z); zeige() }, 250);
  return () => { clearInterval(iv); z.zuletzt = Date.now(); schreib(KEY, z) };
}
