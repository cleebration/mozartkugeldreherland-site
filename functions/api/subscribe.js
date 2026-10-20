/**
 * Newsletter-Anmeldung als Cloudflare-Pages-Function.
 *
 * Warum doppelt? api/subscribe.js ist die Vercel-Variante aus dem Newsletter-Kit.
 * Diese Datei macht dasselbe für Cloudflare Pages — und Cloudflare ist laut der
 * Merchandising-Strategie der richtige Host, sobald die Website auf einen Shop
 * verlinkt (Vercel Hobby verbietet kommerzielle Nutzung).
 * Es ist immer nur eine der beiden Dateien aktiv; die andere stört nicht.
 *
 * Environment-Variablen (Pages → Settings → Environment variables):
 *   EMAILOCTOPUS_API_KEY      Pflicht
 *   EMAILOCTOPUS_LIST_ID      Pflicht
 *   EMAILOCTOPUS_TAGS         optional, z. B. "cleebration"
 *   EMAILOCTOPUS_API_VERSION  "v2" (Standard) oder "v1"
 *
 * Double-Opt-in wird an der Liste in EmailOctopus aktiviert, nicht hier.
 */

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { message: "Ungültige Anfrage." });
  }

  const { email = "", name = "", firstName = "", lastName = "", salutation = "", consent, website } = body;

  // Honeypot: Bots füllen dieses Feld. Freundlich abnicken, nichts speichern.
  if (website) return json(200, { message: "Danke!" });

  if (!EMAIL_RE.test(String(email)) || String(email).length > 254) {
    return json(400, { message: "Bitte geben Sie eine gültige E-Mail-Adresse an." });
  }
  if (!consent) {
    return json(400, { message: "Ohne Einwilligung geht es leider nicht." });
  }

  const apiKey = env.EMAILOCTOPUS_API_KEY;
  const listId = env.EMAILOCTOPUS_LIST_ID;
  if (!apiKey || !listId) {
    console.error("EMAILOCTOPUS_API_KEY oder EMAILOCTOPUS_LIST_ID fehlt");
    return json(500, { message: "Der Newsletter ist gerade nicht erreichbar." });
  }

  const tags = String(env.EMAILOCTOPUS_TAGS || "")
    .split(",").map((t) => t.trim()).filter(Boolean);
  // PATCH lko-site: Anrede, Vor- und Nachname für personalisierte Newsletter.
  // Anrede geht in ein eigenes Feld der Liste (Tag per EMAILOCTOPUS_FIELD_SALUTATION,
  // Standard "Anrede"). Fehlt das Feld in EmailOctopus, wird ohne Anrede gespeichert.
  if (salutation && !["Herr", "Frau"].includes(String(salutation))) {
    return json(400, { message: "Ungültige Anrede." });
  }
  const first = String(firstName || name).trim().slice(0, 100);
  const last = String(lastName).trim().slice(0, 100);
  const salutationTag = env.EMAILOCTOPUS_FIELD_SALUTATION || "Anrede";
  const baseFields = {};
  if (first) baseFields.FirstName = first;
  if (last) baseFields.LastName = last;
  const fullFields = salutation ? { ...baseFields, [salutationTag]: String(salutation) } : baseFields;
  let fields = Object.keys(fullFields).length ? fullFields : undefined;
  const v1 = env.EMAILOCTOPUS_API_VERSION === "v1";

  const url = v1
    ? `https://emailoctopus.com/api/1.6/lists/${listId}/contacts`
    : `https://api.emailoctopus.com/lists/${listId}/contacts`;

  const makeInit = (fields) => v1
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, email_address: email, fields, tags })
      }
    : {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ email_address: email, fields, tags })
      };

  let res;
  try {
    res = await fetch(url, makeInit(fields));
    // Feld „Anrede" in der Liste nicht angelegt? Dann ohne Anrede nochmal.
    if (res.status === 400 && salutation && fields && salutationTag in fields) {
      const txt = await res.clone().text().catch(() => "");
      if (/field|merge|tag/i.test(txt)) {
        console.warn("EmailOctopus kennt das Feld", salutationTag, "nicht – speichere ohne Anrede");
        fields = Object.keys(baseFields).length ? baseFields : undefined;
        res = await fetch(url, makeInit(fields));
      }
    }
  } catch (err) {
    console.error("EmailOctopus nicht erreichbar:", err);
    return json(502, { message: "Die Anmeldung hat gerade nicht geklappt. Bitte versuchen Sie es später noch einmal." });
  }

  // Bereits eingetragen? Absichtlich wie Erfolg behandeln —
  // sonst verrät die Seite, wer im Verteiler steht.
  if (res.ok || res.status === 409) {
    return json(200, { message: "Fast geschafft — bitte bestätigen Sie die E-Mail in Ihrem Postfach." });
  }

  console.error("EmailOctopus antwortete mit", res.status, await res.text().catch(() => ""));
  return json(502, { message: "Die Anmeldung hat gerade nicht geklappt. Bitte versuchen Sie es später noch einmal." });
}
