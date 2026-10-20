/**
 * Zentrale Konfiguration der Website mozartkugeldreherland.at.
 * Aufbau wie klangerie-site / lko-site (gleiche Kits). Angelegt 20.10.2026 (Claude, Projekt „MyProj Mozartkugeldreherland“).
 * Ein Kunstprojekt von cleebration – politische Satire.
 */
export default {
  // Kanonischer Name ohne www. Der Worker führt www.mozartkugeldreherland.at dorthin.
  siteUrl: "https://mozartkugeldreherland.at",
  canonicalHost: "mozartkugeldreherland.at",

  fonts: { selfHost: true },

  // Vorerst nur Deutsch. Weitere Sprachen: hier ergänzen + assets/i18n/<sprache>.json.
  locales: ["de"],
  defaultLocale: "de",
  autoDetectLanguage: false,

  /* Kein eigener Hub: Beiträge des „Amtsblatts“ liegen im cleebration-Blog-Hub und
     tragen dort `sites: [mozartkugeldreherland]`. Solange es keinen Eintrag gibt,
     liefert der Hub 404 – das Modul zeigt dann „Derzeit keine Beiträge“. */
  feeds: {
    blog: "https://cleebration-blog-hub.vercel.app/feed/sites/mozartkugeldreherland.{lang}.json"
  },

  images: {
    logo:      "/assets/img/mozartkugeldreherland-logo-quer-hell.svg",
    logoColor: "/assets/img/mozartkugeldreherland-logo-quer-dunkel.svg",
    og:        "/assets/img/og-mozartkugeldreherland.png"
  },

  // Postfach nach Regel „Mail für Projekt-Domains“ (Tool Baukasten):
  // mozartkugeldreherland.at als sekundäre Domain im Workspace cleebration.com,
  // Routing auf mozartkugeldreherland@cleebration.com. Noch einzurichten.
  mail: "hallo@mozartkugeldreherland.at"
};
