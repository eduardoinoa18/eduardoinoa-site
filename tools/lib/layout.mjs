// Shared page shell for every generated page (EN + ES): head, header, footer, schema helpers, photos.
// Generated pages are written by tools/generate.mjs; content lives in tools/pages/*.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/site.config.json"), "utf8"));
export const BASE = CONFIG.base;
const NAP = CONFIG.nap, LINKS = CONFIG.links;

// Stable JSON-LD ids (the landing pages and posts reference these).
export const IDS = {
  website: `${BASE}/#website`,
  person: "https://marketora.me/card/eduardo-inoa#person",
  agent: "https://marketora.me/card/eduardo-inoa#agent",
};

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const abs = (p) => (p.startsWith("http") ? p : BASE + (p === "/" ? "/" : p));

/* ---------------- photos ---------------- */
let manifest = null;
export function photos() {
  if (manifest) return manifest;
  const f = path.join(ROOT, "img/photos/manifest.json");
  manifest = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
  return manifest;
}
export function photo(slug) {
  const p = photos().find((x) => x.slug === slug);
  if (!p) throw new Error(`photo "${slug}" is not in img/photos/manifest.json`);
  return p;
}
/** Responsive <img> for a manifest photo. eager=true for the LCP image only. */
export function img(slug, { lang = "en", sizes = "100vw", eager = false, cls = "", alt } = {}) {
  const p = photo(slug);
  const a = alt ?? (lang === "es" ? p.alt_es : p.alt_en);
  const pos = p.focal && p.focal !== "center" ? ` style="object-position:center ${p.focal}"` : "";
  return `<img${cls ? ` class="${cls}"` : ""} src="/img/photos/${p.slug}-1600.webp" srcset="/img/photos/${p.slug}-800.webp 800w, /img/photos/${p.slug}-1600.webp 1600w" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${esc(a)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${pos}>`;
}
export const credit = (slug) => photo(slug).credit_html;

/* ---------------- copy ---------------- */
const NAV = {
  en: [["/buyers", "Buy"], ["/sellers", "Sell"], ["/home-value", "Home value"], ["/cash-offer", "Cash offer"], ["/towns", "Towns"], ["/toolkit", "Toolkit"], ["/journal", "Journal"]],
  es: [["/es/compradores", "Comprar"], ["/es/vendedores", "Vender"], ["/es/valor-de-mi-casa", "Valor de su casa"], ["/es/oferta-en-efectivo", "Oferta en efectivo"], ["/es/pueblos", "Pueblos"], ["/es/herramientas", "Herramientas"], ["/es/blog", "Blog"]],
};
const UI = {
  en: { skip: "Skip to content", menu: "Menu", book: "Book a call", call: "Call", text: "Text", other: "Español", explore: "Explore", connect: "Connect", review: "Leave a Google review", card: "Digital card", hub: "All my links", credits: "Photo credits" },
  es: { skip: "Ir al contenido", menu: "Menú", book: "Reservar llamada", call: "Llamar", text: "Texto", other: "English", explore: "Explore", connect: "Contacto", review: "Deje una reseña en Google", card: "Tarjeta digital", hub: "Todos mis enlaces", credits: "Créditos de fotos" },
};

// Town guides in every footer (internal links for people and crawlers). Source: tools/data/towns.json.
const TOWN_LINKS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/towns.json"), "utf8")).towns.map((t) => [t.slug, `${t.name}, ${t.state}`, !!t.es]); } catch { return []; } })();

const EHO_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 13.5h6M9 16.5h6"/></svg>`;

export function header(lang, current, altHref) {
  const u = UI[lang];
  const links = NAV[lang].map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ""}>${t}</a>`).join("");
  const home = lang === "es" ? "/es" : "/";
  return `<a class="skip" href="#main">${u.skip}</a>
<header class="site-head"><div class="wrap">
  <a class="brand" href="${home}" aria-label="Eduardo Inoa, REALTOR® — ${lang === "es" ? "inicio" : "home"}"><img src="/img/logo-fermin-c21.webp" alt="The Fermin Group, Century 21 North East" width="400" height="144"></a>
  <nav class="site-nav" id="site-nav" aria-label="${lang === "es" ? "Principal" : "Main"}">${links}</nav>
  ${altHref ? `<a class="lang-link" href="${altHref}" hreflang="${lang === "es" ? "en" : "es"}" lang="${lang === "es" ? "en" : "es"}">${u.other}</a>` : ""}
  <a class="btn btn-primary head-cta" href="${LINKS.book}" target="_blank" rel="noopener">${u.book}</a>
  <button class="menu-btn" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="${u.menu}"><span></span></button>
</div></header>`;
}

export function footer(lang, { disclaimer = "", credits = [] } = {}) {
  const u = UI[lang], es = lang === "es";
  const extra = lang === "es" ? [["/es/propiedades", "Buscar propiedades"], ["/es#market", "Pulso del mercado"], ["/es/mapa-del-sitio", "Mapa del sitio"]] : [["/listings", "Search homes"], ["/#market", "Market pulse"], ["/site-map", "Site map"]];
  const explore = [...NAV[lang], ...extra].map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("");
  const townLinks = TOWN_LINKS.map(([slug, name, hasEs]) => `<li><a href="${lang === "es" && hasEs ? "/es/pueblos/" + slug : "/towns/" + slug}">${esc(name)}</a></li>`).join("");
  const creditLine = credits.length ? `<p>${es ? "Fotos" : "Photos"}: ${credits.map((s) => credit(s)).join(" · ")}</p>` : "";
  return `<footer class="site-foot"><div class="wrap">
  <div class="cols">
    <div>
      <div class="logos"><img src="/img/logo-fermin-c21-light.webp" alt="The Fermin Group, Century 21 North East" width="400" height="144" loading="lazy" decoding="async"></div>
      <p><strong style="color:#fff">${esc(NAP.name)}, REALTOR®</strong><br>${esc(NAP.brokerage)}<br>${esc(NAP.street)}, ${NAP.city}, ${NAP.region} ${NAP.zip}<br>
      <a href="tel:${NAP.tel}">${NAP.phone}</a> · <a href="mailto:${NAP.email}">${NAP.email}</a><br>${NAP.licenses} · ${es ? "Notario Público de MA" : "MA Notary Public"}</p>
    </div>
    <div><h4>${u.explore}</h4><ul>${explore}</ul></div>
    <div><h4>${es ? "Guías de pueblos" : "Town guides"}</h4><ul class="foot-towns">${townLinks}</ul></div>
    <div><h4>${u.connect}</h4><ul>
      <li><a href="${LINKS.book}" target="_blank" rel="noopener">${u.book}</a></li>
      <li><a href="${LINKS.card}" target="_blank" rel="noopener">${u.card}</a></li>
      <li><a href="${LINKS.instagram}" target="_blank" rel="noopener">Instagram @eduardoinoa_</a></li>
      <li><a href="${LINKS.hub}" target="_blank" rel="noopener">${u.hub}</a></li>
      <li><a href="${LINKS.review}" target="_blank" rel="noopener">${u.review}</a></li>
    </ul></div>
  </div>
  <div class="legal">
    ${disclaimer ? `<p>${disclaimer}</p>` : ""}
    <p>${esc(NAP.brokerage)}. ${es ? "Cada oficina es de propiedad y operación independiente (Each office is independently owned and operated.)" : "Each office is independently owned and operated."}</p>
    <p class="eho">${EHO_SVG}<span>${es ? "Igualdad de Oportunidad en la Vivienda · Equal Housing Opportunity." : "Equal Housing Opportunity."}</span></p>
    ${creditLine}
    <p><a href="/credits">${u.credits}</a></p>
  </div>
</div></footer>
<nav class="dock" aria-label="${es ? "Contacto rápido" : "Quick contact"}"><a href="tel:${NAP.tel}">${u.call}</a><a href="sms:${NAP.tel}">${u.text}</a><a href="${LINKS.book}" target="_blank" rel="noopener">${es ? "Reservar" : "Book"}</a></nav>`;
}

/* ---------------- schema ---------------- */
export function breadcrumb(items) {
  return { "@type": "BreadcrumbList", itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(url) })) };
}
export function faqPage(id, qas) {
  return { "@type": "FAQPage", "@id": id, mainEntity: qas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) };
}
export const agentRef = { "@id": IDS.agent };

/* ---------------- consent (identical wording on every form) ---------------- */
export function consent(lang) {
  return lang === "es"
    ? `<label class="consent"><input type="checkbox" name="smsConsent" value="yes"><span>Acepto que Eduardo Inoa, de ${esc(NAP.brokerage)}, me llame y me envíe mensajes de texto al número indicado sobre mi consulta de bienes raíces, incluso por medios automatizados. El consentimiento no es condición para recibir ningún servicio. Pueden aplicar tarifas de mensajes y datos; la frecuencia varía. Responda STOP para cancelar o HELP para ayuda.</span></label>`
    : `<label class="consent"><input type="checkbox" name="smsConsent" value="yes"><span>I agree that Eduardo Inoa of ${esc(NAP.brokerage)} may call and text me at the number above about my real-estate inquiry, including by automated means. Consent is not a condition of any service. Message and data rates may apply; message frequency varies. Reply STOP to opt out, HELP for help.</span></label>`;
}
export const honeypot = `<div class="hp" aria-hidden="true"><label>Company<input name="company" tabindex="-1" autocomplete="off"></label></div>`;

/* ---------------- page ---------------- */
/**
 * @param {object} o
 * @param {"en"|"es"} o.lang
 * @param {string} o.path        canonical path, e.g. "/towns/lowell"
 * @param {string} [o.altPath]   the other-language twin, e.g. "/es/pueblos/lowell"
 * @param {string} o.title
 * @param {string} o.description
 * @param {string} [o.ogImage]   absolute or root-relative
 * @param {object[]} [o.schema]  JSON-LD nodes for @graph
 * @param {string} o.body        inner HTML of <main>
 * @param {string} [o.navCurrent]
 * @param {object} [o.foot]      {disclaimer, credits:[slug]}
 * @param {string} [o.head]      extra <head> HTML (e.g. market.css)
 * @param {string} [o.scripts]   extra scripts before </body>
 */
export function page(o) {
  const lang = o.lang || "en", url = abs(o.path);
  const enPath = lang === "en" ? o.path : o.altPath, esPath = lang === "es" ? o.path : o.altPath;
  const alt = o.altPath
    ? `<link rel="alternate" hreflang="en" href="${abs(enPath)}"><link rel="alternate" hreflang="es" href="${abs(esPath)}"><link rel="alternate" hreflang="x-default" href="${abs(enPath)}">`
    : "";
  const og = abs(o.ogImage || "/og-site.jpg");
  const graph = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": url + "#page", url, name: o.title, description: o.description, inLanguage: lang === "es" ? "es-US" : "en-US", isPartOf: { "@id": IDS.website }, about: agentRef, primaryImageOfPage: og },
    ...(o.schema || []),
  ] };
  const verify = [
    CONFIG.googleSiteVerification && `<meta name="google-site-verification" content="${esc(CONFIG.googleSiteVerification)}">`,
    CONFIG.bingSiteVerification && `<meta name="msvalidate.01" content="${esc(CONFIG.bingSiteVerification)}">`,
  ].filter(Boolean).join("");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="robots" content="${o.noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}">
<link rel="canonical" href="${url}">${alt}
<meta property="og:type" content="website"><meta property="og:site_name" content="Eduardo Inoa, REALTOR®"><meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:image" content="${og}"><meta property="og:locale" content="${lang === "es" ? "es_US" : "en_US"}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${og}">
<meta name="theme-color" content="#061A30">
<meta name="ga4-id" content="${esc(CONFIG.ga4Id)}">${verify}
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="/img/favicon.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Barlow:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="/landing.css">${o.head || ""}
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>
</head>
<body>
${header(lang, o.navCurrent || o.path, o.altPath)}
<main id="main">
${o.body}
</main>
${footer(lang, o.foot)}
<script src="/landing.js" defer></script>${o.scripts || ""}
</body>
</html>
`;
}
