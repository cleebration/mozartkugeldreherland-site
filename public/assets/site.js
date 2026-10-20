/**
 * Kleinkram, den jede Seite braucht. Bewusst winzig gehalten —
 * alles Inhaltliche machen die Kit-Module.
 */

/* Jahreszahl im Fußbereich aktuell halten */
for (const el of document.querySelectorAll("[data-year]")) {
  el.textContent = String(new Date().getFullYear());
}

/* Beim Sprachwechsel auch die Seitentitel-Sprache mitziehen.
   (SiteI18n setzt <html lang> selbst; hier hängen wir nur die
   Metabeschreibung an, damit Vorschauen stimmen.) */
document.addEventListener("i18n:change", (e) => {
  const key = document.documentElement.dataset.descriptionKey;
  if (key && window.SiteI18n) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", window.SiteI18n.t(key));
  }
  document.documentElement.setAttribute("lang", e.detail.lang);
});

/* Landesakademie: Fakultäts-Navigation markiert die Fakultät, die gerade im Bild ist. */
const fakLinks = [...document.querySelectorAll(".fak-nav a")];
if (fakLinks.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (!e.isIntersecting) continue;
      for (const a of fakLinks) a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id);
    }
  }, { rootMargin: "-30% 0px -60% 0px" });
  for (const s of document.querySelectorAll(".fakultaet")) io.observe(s);
}
