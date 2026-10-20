/*
 * newsletter-widget.js
 * Einbettbares Newsletter-Anmeldeformular als Web-Component – funktioniert auf
 * jeder Seite (statisches HTML, Astro, Next, sogar im Wix-HTML-Embed).
 * Stil-isoliert per Shadow DOM, komplett ueber CSS-Variablen (--nl-*) themebar.
 *
 * Einbetten:
 *   <script type="module" src="/newsletter-widget.js"></script>
 *   <newsletter-signup
 *       endpoint="/api/subscribe"
 *       site="cleebration"
 *       heading="Newsletter"
 *       text="Termine & Neuigkeiten – etwa einmal im Monat."
 *       privacy-url="/datenschutz"></newsletter-signup>
 *
 * WICHTIG: Das Widget kennt KEINEN API-Key. Es POSTet nur an `endpoint`
 * (Standard /api/subscribe). Der Key liegt ausschliesslich serverseitig in der
 * Vercel-Funktion (siehe api/subscribe.js). So bleibt das Geheimnis geheim.
 */

const LOCALE = "de-AT";

const STYLES = `
  :host {
    /* ---- Design-Tokens: pro Seite ueberschreibbar ---- */
    --nl-font-display: var(--nl-font, Georgia, "Times New Roman", serif);
    --nl-font-body: var(--nl-font, system-ui, -apple-system, "Segoe UI", sans-serif);
    --nl-bg: transparent;
    --nl-surface: #ffffff;
    --nl-text: #1a1a1a;
    --nl-muted: #6b6b6b;
    --nl-accent: #1a1a1a;
    --nl-accent-contrast: #ffffff;
    --nl-border: #e4e1da;
    --nl-error: #b3261e;
    --nl-success: #1f7a4d;
    --nl-radius: 4px;
    --nl-gap: 0.75rem;
    --nl-maxwidth: 480px;

    display: block;
    color: var(--nl-text);
    background: var(--nl-bg);
    font-family: var(--nl-font-body);
    line-height: 1.5;
    box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: inherit; }

  .wrap { max-width: var(--nl-maxwidth); }

  .heading {
    font-family: var(--nl-font-display);
    font-size: 1.4rem;
    margin: 0 0 .35rem;
    line-height: 1.2;
  }
  .text { margin: 0 0 1rem; color: var(--nl-muted); font-size: .95rem; }

  form { margin: 0; }

  .row { display: flex; flex-direction: column; gap: var(--nl-gap); }
  :host([layout="inline"]) .fields { display: flex; gap: var(--nl-gap); flex-wrap: wrap; }
  :host([layout="inline"]) .fields .field { flex: 1 1 200px; }

  .fields { display: flex; flex-direction: column; gap: var(--nl-gap); }

  label { font-size: .8rem; font-weight: 600; display: block; margin-bottom: .25rem; }
  .field input[type="email"],
  .field input[type="text"],
  .field select {
    width: 100%;
    padding: .7rem .8rem;
    font: inherit;
    color: var(--nl-text);
    background: var(--nl-surface);
    border: 1px solid var(--nl-border);
    border-radius: var(--nl-radius);
  }
  .names { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--nl-gap); }
  @media (max-width: 480px) { .names { grid-template-columns: minmax(0, 1fr); } }
  .field select:focus-visible,
  .field input:focus-visible {
    outline: 2px solid var(--nl-accent);
    outline-offset: 1px;
    border-color: var(--nl-accent);
  }

  .consent {
    display: flex;
    gap: .55rem;
    align-items: flex-start;
    font-size: .8rem;
    color: var(--nl-muted);
    margin-top: .25rem;
  }
  .consent input { margin-top: .15rem; flex: 0 0 auto; }
  .consent a { color: inherit; text-decoration: underline; }

  button {
    appearance: none;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: .75rem 1.1rem;
    border: 1px solid var(--nl-accent);
    border-radius: var(--nl-radius);
    background: var(--nl-accent);
    color: var(--nl-accent-contrast);
    transition: opacity .15s ease, transform .15s ease;
  }
  button:hover:not(:disabled) { transform: translateY(-1px); }
  button:disabled { opacity: .6; cursor: progress; }
  button:focus-visible { outline: 3px solid var(--nl-accent); outline-offset: 2px; }

  .msg { margin-top: .8rem; font-size: .9rem; min-height: 1.2em; }
  .msg[data-kind="error"] { color: var(--nl-error); }
  .msg[data-kind="success"] { color: var(--nl-success); }

  /* Honeypot: fuer Menschen unsichtbar, fuer Bots ein Koeder */
  .hp {
    position: absolute !important;
    left: -9999px !important;
    width: 1px; height: 1px;
    overflow: hidden;
  }

  .credit {
    margin-top: 1rem;
    font-size: .72rem;
    color: var(--nl-muted);
    display: flex;
    align-items: center;
    gap: .4rem;
  }
  .credit a { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: .35rem; }
  .credit a:hover { text-decoration: underline; }
  .credit img { height: 1.1em; width: auto; display: block; }

  .hidden { display: none !important; }
`;


/* =========================================================================
   Beschriftungen

   Nicht auf zwei Sprachen festgelegt: SPRACHEN ist eine Tabelle, und eine
   weitere Sprache ist ein weiterer Eintrag darin.

   Eine Sprache ergänzen:
     1. hier einen Block anlegen (z. B. `fr: { … }`)
     2. auf der Seite `SiteI18n.init({ locales: [...] })` erweitern

   Fehlt ein Block, fällt das Modul auf die Standardsprache zurück, statt
   leere Beschriftungen zu zeigen. Ein Attribut am Element (heading="…")
   sticht die Tabelle immer -- dann steht dort in jeder Sprache dasselbe.
   ========================================================================= */
const SPRACHEN = {
  de: {
    ueberschrift: "Melde Dich zum Newsletter an",
    text: "Wenn es etwas Neues aus meiner Welt gibt, dann schicke ich ein email.",
    knopf: "Anmelden",
    sendet: "Sende …",
    vorname: "Vorname",
    nachname: "Nachname",
    anrede: "Anrede",
    anredeWaehlen: "Bitte wählen",
    herr: "Herr",
    frau: "Frau",
    fehlerAnrede: "Bitte wählen Sie eine Anrede.",
    fehlerName: "Bitte geben Sie Vor- und Nachnamen an.",
    email: "E-Mail-Adresse",
    emailBeispiel: "name@beispiel.at",
    einwilligung: "Ja, ich möchte den Newsletter erhalten. Die Einwilligung kann ich jederzeit widerrufen.",
    datenschutz: "Datenschutz",
    honeypot: "Bitte dieses Feld leer lassen",
    kunstprojekt: "Ein Kunstprojekt von",
    fehlerEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    fehlerEinwilligung: "Bitte bestätigen Sie die Einwilligung, um fortzufahren.",
    erfolg: "Fast geschafft! Bitte bestätigen Sie Ihre Anmeldung über den Link in der E-Mail, die wir Ihnen gerade geschickt haben.",
    fehler: "Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal.",
    verbindungsfehler: "Verbindungsfehler. Bitte versuchen Sie es später noch einmal."
  },
  fr: {
    ueberschrift: "Inscris-toi à la newsletter",
    text: "Quand il y a du nouveau dans mon univers, je t'envoie un e-mail.",
    knopf: "S'inscrire",
    sendet: "Envoi en cours …",
    vorname: "Prénom",
    nachname: "Nom",
    anrede: "Civilité",
    anredeWaehlen: "Veuillez choisir",
    herr: "Monsieur",
    frau: "Madame",
    fehlerAnrede: "Veuillez choisir une civilité.",
    fehlerName: "Veuillez indiquer votre prénom et votre nom.",
    email: "Adresse e-mail",
    emailBeispiel: "name@beispiel.at",
    einwilligung: "Oui, je souhaite recevoir la newsletter. Je peux retirer mon consentement à tout moment.",
    datenschutz: "Protection des données",
    honeypot: "Veuillez laisser ce champ vide",
    kunstprojekt: "Un projet artistique de",
    fehlerEmail: "Veuillez saisir une adresse e-mail valide.",
    fehlerEinwilligung: "Veuillez confirmer votre consentement pour continuer.",
    erfolg: "Presque terminé ! Veuillez confirmer votre inscription via le lien contenu dans l'e-mail que nous venons de vous envoyer.",
    fehler: "Malheureusement, cela n'a pas fonctionné. Veuillez réessayer plus tard.",
    verbindungsfehler: "Erreur de connexion. Veuillez réessayer plus tard."
  },
  hu: {
    ueberschrift: "Iratkozz fel a hírlevélre",
    text: "Ha van valami újdonság a világomból, küldök egy e-mailt.",
    knopf: "Feliratkozás",
    sendet: "Küldés…",
    vorname: "Keresztnév",
    nachname: "Vezetéknév",
    anrede: "Megszólítás",
    anredeWaehlen: "Kérjük, válasszon",
    herr: "Úr",
    frau: "Hölgy",
    fehlerAnrede: "Kérjük, válasszon megszólítást.",
    fehlerName: "Kérjük, adja meg a vezeték- és keresztnevét.",
    email: "E-mail-cím",
    emailBeispiel: "nev@pelda.at",
    einwilligung: "Igen, szeretnék hírlevelet kapni. A hozzájárulásomat bármikor visszavonhatom.",
    datenschutz: "Adatvédelem",
    honeypot: "Kérjük, hagyja üresen ezt a mezőt",
    kunstprojekt: "Egy művészeti projekt, alkotója:",
    fehlerEmail: "Kérjük, adjon meg érvényes e-mail-címet.",
    fehlerEinwilligung: "A folytatáshoz kérjük, erősítse meg a hozzájárulását.",
    erfolg: "Mindjárt kész! Kérjük, erősítse meg a feliratkozását az e-mailben található linkre kattintva, amelyet az imént küldtünk Önnek.",
    fehler: "Sajnos ez nem sikerült. Kérjük, próbálja meg később újra.",
    verbindungsfehler: "Kapcsolódási hiba. Kérjük, próbálja meg később újra."
  },
  en: {
    ueberschrift: "Sign up for the newsletter",
    text: "Whenever there is something new from my world, I send an email.",
    knopf: "Sign up",
    sendet: "Sending …",
    vorname: "First name",
    nachname: "Last name",
    anrede: "Salutation",
    anredeWaehlen: "Please choose",
    herr: "Mr",
    frau: "Ms",
    fehlerAnrede: "Please choose a salutation.",
    fehlerName: "Please enter your first and last name.",
    email: "Email address",
    emailBeispiel: "name@example.com",
    einwilligung: "Yes, I would like to receive the newsletter. I can withdraw my consent at any time.",
    datenschutz: "Privacy",
    honeypot: "Please leave this field empty",
    kunstprojekt: "An art project by",
    fehlerEmail: "Please enter a valid email address.",
    fehlerEinwilligung: "Please confirm your consent to continue.",
    erfolg: "Almost there. Please confirm your sign-up via the link in the email we have just sent you.",
    fehler: "That did not work, unfortunately. Please try again later.",
    verbindungsfehler: "Connection error. Please try again later."
  }
};

const STANDARD_SPRACHE = "de";

/** Aktive Sprache: der Umschalter der Seite, sonst das lang-Attribut. */
function aktiveSprache(el) {
  if (window.SiteI18n && window.SiteI18n.lang) return window.SiteI18n.lang;
  const attr = el && el.getAttribute("lang");
  if (attr) return attr;
  return STANDARD_SPRACHE;
}

/** Beschriftungen einer Sprache, mit Rückfall über die Basissprache. */
function texte(sprache) {
  return (
    SPRACHEN[sprache] ||
    SPRACHEN[String(sprache).split("-")[0]] ||
    SPRACHEN[STANDARD_SPRACHE]
  );
}


/* Warten, bis die Sprache der Seite feststeht.

   Ohne das zeichnet das Modul in der Standardsprache, holt deren Feed, und
   zeichnet unmittelbar danach noch einmal in der wirklichen Sprache — zwei
   Abrufe und ein sichtbares Flackern.

   Auf einer fremden Seite ohne SiteI18n gibt es nichts zu warten; dort
   zeichnet das Modul sofort. */
function spracheBereit() {
  const i = window.SiteI18n;
  if (!i || !i.ready) return Promise.resolve();
  /* Notausgang: bindet eine Seite site-i18n.js ein, ruft aber nie init()
     auf, loest das Versprechen nie auf -- und das Modul bliebe fuer immer
     leer. Nach zwei Sekunden wird deshalb in der Standardsprache
     gezeichnet. */
  const notausgang = new Promise((r) => setTimeout(r, 2000));
  return Promise.race([i.ready, notausgang]).catch(() => {});
}

class NewsletterSignup extends HTMLElement {
  static get observedAttributes() { return ["heading", "text"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._submitting = false;
  }

  connectedCallback() {
    /* Auf den Sprachumschalter der Seite hören: beim Wechsel wird neu
       gezeichnet. Eine bereits abgeschickte Anmeldung bleibt abgeschickt --
       deshalb wird nur gezeichnet, solange das Formular noch da ist. */
    this._unsub = window.SiteI18n
      ? window.SiteI18n.onChange(() => {
          if (this._gezeichnet && !this._fertig) this.render();
        })
      : () => {};
    spracheBereit().then(() => { this._gezeichnet = true; this.render(); });
  }
  disconnectedCallback() { if (this._unsub) this._unsub(); }
  attributeChangedCallback() { if (this.shadowRoot.childElementCount) this.render(); }

  attr(name, fallback = "") {
    const v = this.getAttribute(name);
    return v === null ? fallback : v;
  }
  hasFlag(name) { return this.hasAttribute(name) && this.getAttribute(name) !== "false"; }

  render() {
    this._sprache = aktiveSprache(this);
    const t = texte(this._sprache);

    const heading = this.attr("heading", t.ueberschrift);
    const text = this.attr("text", t.text);
    const buttonLabel = this.attr("button-label", t.knopf);
    const privacyUrl = this.attr("privacy-url", "");
    const showName = this.hasFlag("name-field");
    // PATCH lko-site: full-name = Anrede (Herr/Frau) + Vor- + Nachname, alle Pflicht.
    const fullName = this.hasFlag("full-name");
    const showCredit = this.hasFlag("credit");
    const creditLogo = this.attr("credit-logo", "");

    const consentText = this.attr("consent-text", t.einwilligung);
    const consentLink = privacyUrl
      ? ` <a href="${privacyUrl}" target="_blank" rel="noopener">${t.datenschutz}</a>`
      : "";

    const nameField = fullName
      ? `<div class="field">
           <label for="nl-anrede">${t.anrede}</label>
           <select id="nl-anrede" name="salutation" required>
             <option value="">${t.anredeWaehlen}</option>
             <option value="Herr">${t.herr}</option>
             <option value="Frau">${t.frau}</option>
           </select>
         </div>
         <div class="names">
           <div class="field">
             <label for="nl-first">${t.vorname}</label>
             <input id="nl-first" name="firstName" type="text" autocomplete="given-name" required maxlength="100" />
           </div>
           <div class="field">
             <label for="nl-last">${t.nachname}</label>
             <input id="nl-last" name="lastName" type="text" autocomplete="family-name" required maxlength="100" />
           </div>
         </div>`
      : showName
      ? `<div class="field">
           <label for="nl-name">${t.vorname}</label>
           <input id="nl-name" name="name" type="text" autocomplete="given-name" />
         </div>`
      : "";

    const credit = showCredit
      ? `<div class="credit">
           <span>${t.kunstprojekt}</span>
           <a href="https://www.cleebration.com" target="_blank" rel="noopener">
             ${creditLogo
               ? `<img src="${creditLogo}" alt="cleebration" />`
               : `<strong>cleebration</strong>`}
           </a>
         </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap">
        ${heading ? `<h2 class="heading">${heading}</h2>` : ""}
        ${text ? `<p class="text">${text}</p>` : ""}
        <form novalidate>
          <div class="row">
            <div class="fields">
              ${nameField}
              <div class="field">
                <label for="nl-email">${t.email}</label>
                <input id="nl-email" name="email" type="email"
                       autocomplete="email" required
                       placeholder="${t.emailBeispiel}" />
              </div>
            </div>

            <label class="consent">
              <input type="checkbox" name="consent" required />
              <span>${consentText}${consentLink}</span>
            </label>

            <!-- Honeypot: bitte nicht ausfuellen -->
            <div class="hp" aria-hidden="true">
              <label>${t.honeypot}
                <input type="text" name="website" tabindex="-1" autocomplete="off" />
              </label>
            </div>

            <div>
              <button type="submit">${buttonLabel}</button>
            </div>
          </div>
        </form>
        <p class="msg" role="status" aria-live="polite"></p>
        ${credit}
      </div>
    `;

    this._form = this.shadowRoot.querySelector("form");
    this._msg = this.shadowRoot.querySelector(".msg");
    this._button = this.shadowRoot.querySelector("button");
    this._form.addEventListener("submit", (e) => this.onSubmit(e));
  }

  setMsg(kind, textValue) {
    this._msg.dataset.kind = kind;
    this._msg.textContent = textValue;
  }

  async onSubmit(e) {
    e.preventDefault();
    if (this._submitting) return;
    const t = texte(this._sprache);

    const data = new FormData(this._form);
    const email = (data.get("email") || "").toString().trim();
    const firstName = (data.get("firstName") || "").toString().trim();
    const lastName = (data.get("lastName") || "").toString().trim();
    const salutation = (data.get("salutation") || "").toString();
    const name = firstName || (data.get("name") || "").toString().trim();
    const fullName = this.hasFlag("full-name");
    const consent = data.get("consent") === "on";
    const honeypot = (data.get("website") || "").toString();

    // Clientseitige Mini-Validierung (Server validiert nochmal)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setMsg("error", t.fehlerEmail);
      this.shadowRoot.querySelector('input[name="email"]').focus();
      return;
    }
    if (fullName && !salutation) {
      this.setMsg("error", t.fehlerAnrede);
      this.shadowRoot.querySelector('select[name="salutation"]').focus();
      return;
    }
    if (fullName && (!firstName || !lastName)) {
      this.setMsg("error", t.fehlerName);
      this.shadowRoot.querySelector(firstName ? 'input[name="lastName"]' : 'input[name="firstName"]').focus();
      return;
    }
    if (!consent) {
      this.setMsg("error", t.fehlerEinwilligung);
      return;
    }

    this._submitting = true;
    this._button.disabled = true;
    const originalLabel = this._button.textContent;
    this._button.textContent = t.sendet;
    this.setMsg("", "");

    const endpoint = this.attr("endpoint", "/api/subscribe");
    const site = this.attr("site", "");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, firstName, lastName, salutation, consent, website: honeypot, site }),
      });

      let body = {};
      try { body = await res.json(); } catch { /* leerer Body ok */ }

      if (res.ok) {
        const successText = this.attr("success-text", t.erfolg);
        this._form.classList.add("hidden");
        this._fertig = true;   // ab hier nicht mehr neu zeichnen
        // PATCH lko-site: eigene, übersetzte Texte statt der (deutschen) Server-Meldung.
        this.setMsg("success", successText);
        this.dispatchEvent(new CustomEvent("nl:subscribed", {
          bubbles: true, composed: true, detail: { email }
        }));
      } else {
        const errText = this.attr("error-text", t.fehler);
        this.setMsg("error", (this._sprache || "de").startsWith("de") && body.message ? body.message : errText);
        this._button.disabled = false;
        this._button.textContent = originalLabel;
      }
    } catch (err) {
      this.setMsg("error", t.verbindungsfehler);
      this._button.disabled = false;
      this._button.textContent = originalLabel;
    } finally {
      this._submitting = false;
    }
  }
}

customElements.define("newsletter-signup", NewsletterSignup);
