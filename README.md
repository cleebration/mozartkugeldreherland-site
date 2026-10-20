# mozartkugeldreherland-site — mozartkugeldreherland.at

Kunstprojekt von **cleebration**: politische Satire als „amtliche Website“ des Mozartkugeldreherlands –
ein Land, in dem nichts funktioniert außer der handgedrehten Kugel.
Angelegt 20.10.2026 (Claude, Projekt „MyProj Mozartkugeldreherland“). Aufbau wie klangerie-site / lko-site:
ein kleines Node-Skript setzt die Seiten aus Bausteinen zusammen, das Amtsblatt kommt zur Laufzeit aus dem
**cleebration-Blog-Hub** (`sites: [mozartkugeldreherland]`), der Newsletter aus dem **newsletter-hub**.

| Adresse | Inhalt | Quelle |
|---|---|---|
| `/` | Hero (Siegel, Wortmarke), Landesbeschreibung, Landeswappen + Blasonierung, 3 Kurse, Amtsblatt, Panels | hier + Blog-Hub |
| `/akademie` | Landesakademie: 55 Lehrveranstaltungen in 5 Fakultäten | `src/data/akademie.json` |
| `/amtsblatt` · `/beitrag?post=<slug>` | Blog („Amtsblatt“) | Blog-Hub |
| `/kundmachungen` | Newsletter-Anmeldung | newsletter.cleebration.com, Schlüssel `mozartkugeldreherland` |
| `/devotionalien` | Shop – Produkte „in Vorbereitung“, Platz für Shopify-Buy-Buttons | hier |
| `/impressum` · `/datenschutz` | Medieninhaber Chris H. Leeb (cleebration) | hier |

Kurzadressen (`public/_redirects`): /blog, /newsletter, /shop, /merch, /weiterbildung, /lehrplan, /kontakt.

## Lehrplan ändern
`src/data/akademie.json` – Titel aus „MyW - Weiterbildung“ (Chris), Texte von Claude. Kurs anhängen
(`nr` eindeutig, `f` = Fakultät), `npm test`, deployen. Die Startseite zeigt die Kurse aus `KURSAUSWAHL` in build.mjs.

## Befehle
```bash
npm install
npm test             # baut und prüft Weiterleitungen, Seiten, Lehrplan
npm run preflight    # vor dem Livegang: Feed erreichbar? Bilder da?
npm run deploy       # baut und lädt zu Cloudflare (Worker mozartkugeldreherland-site)
```

## Domain
mozartkugeldreherland.at liegt bei GoDaddy (derzeit Weiterleitung auf cleebration.com/mozartkugeldreherland, Wix).
Zone in Cloudflare anlegen, Nameserver bei GoDaddy umstellen, dann `routes` in `wrangler.jsonc` einkommentieren
und `npm run deploy`. Mail: Regel „Mail für Projekt-Domains“ (hallo@ → mozartkugeldreherland@cleebration.com).

## Marke
Kit: `1! claude/04 Templates/Branding/mozartkugeldreherland/` (Siegel „Nihil functionat – nisi globulus“,
Kaisernacht/Blattgold/Bordeaux/Pergament, Playfair Display + Source Serif 4 + IBM Plex Mono).
Landeswappen = `#mozartkugeldreherland Banner.png` (Projekt-Input), hier als `assets/img/landeswappen-*`.
Schriften vom eigenen Server (`public/assets/fonts/`, OFL).
