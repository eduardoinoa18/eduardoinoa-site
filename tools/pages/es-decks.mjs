// Spanish twins of the two hand-written presentation decks: /es/compradores (from buyers/index.html)
// and /es/vendedores (from sellers/index.html). The English decks stay the source of truth — never edit
// the twins by hand; edit the English deck (its data-es="" strings carry the Spanish) and re-run.
//
// What changes in the twin (everything else is byte-for-byte the English deck):
//  - <html lang="es">, Spanish <title>/description/og/twitter, canonical + og:url → the /es/ URL;
//  - window.DECK_DEFAULT_LANG = "es" so the deck runtime always starts in Spanish (the English deck
//    honors the same flag when present and falls back to the saved choice / ?c= lang / "en");
//  - every [data-es] element is pre-rendered in Spanish, with the English kept in data-en="" so the
//    in-deck EN/ES toggle still works (setLang only captures data-en when it is missing);
//  - [data-ph-es] placeholders likewise (data-ph-en keeps the English);
//  - the toggle's twin link points back to the English page; ES starts "on";
//  - JSON-LD: WebPage → es-US with the /es/ @id; FAQPage rebuilt from the visible Spanish FAQ.
// Lead `source` values are untouched (same as the English decks); the runtime adds the language to
// the lead message.
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const DECKS = [
  {
    src: "buyers/index.html", en: "/buyers", es: "/es/compradores",
    title: "Eduardo Inoa — Agente de compradores en Merrimack Valley y el sur de NH | Century 21 North East",
    description: "Eduardo Inoa, REALTOR® bilingüe, ayuda a compradores e inversionistas en Merrimack Valley y el sur de New Hampshire — números claros y un plan claro, en español o en inglés.",
    ogTitle: "Comprar una casa, explicado claro — Eduardo Inoa, REALTOR®",
    ogDescription: "Poder de compra, pago mensual, efectivo para cerrar y análisis de multifamiliares — con un agente de compradores bilingüe en Merrimack Valley y el sur de NH.",
  },
  {
    src: "sellers/index.html", en: "/sellers", es: "/es/vendedores",
    title: "Eduardo Inoa — Agente para vender su casa en Merrimack Valley y el sur de NH | Century 21 North East",
    description: "¿Piensa vender? Eduardo Inoa, REALTOR® bilingüe, le muestra el valor de su casa, lo que le quedaría y el plan para vender en Merrimack Valley y el sur de NH.",
    ogTitle: "Su casa. Su número. — Eduardo Inoa, REALTOR®",
    ogDescription: "Valor estimado, ganancia neta y un plan claro para vender — con un agente bilingüe en Merrimack Valley y el sur de NH.",
  },
];
const OG_ALT_ES = "Eduardo Inoa, REALTOR® — The Fermin Group, Century 21 North East";

/** HTML-attribute escape (for values we write into ="..."). */
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/** A decoded data-es value is HTML; keep bare ampersands valid without touching real entities. */
const fixAmp = (s) => s.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
const textOf = (node) => node.text.replace(/\s+/g, " ").trim();
const jsonLd = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

/** Replace exactly one occurrence, or fail the build (the English deck changed shape). */
function one(html, from, to, label) {
  const n = typeof from === "string" ? html.split(from).length - 1 : (html.match(new RegExp(from.source, "g")) || []).length;
  if (n !== 1) throw new Error(`es-decks: ${label} matched ${n} times (expected 1)`);
  return html.replace(from, () => to);
}

/** End index (exclusive) of the start tag that begins at `s`, honoring quoted attribute values. */
function openTagEnd(src, s) {
  let q = "";
  for (let i = s; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === q) q = ""; }
    else if (c === '"' || c === "'") q = c;
    else if (c === ">") return i + 1;
  }
  throw new Error("es-decks: unterminated tag at " + s);
}

/** Pre-render the Spanish copy of every [data-es] / [data-ph-es] element by splicing the source. */
function prerenderSpanish(src) {
  const root = parse(src, { comment: true });
  const edits = [];
  for (const el of root.querySelectorAll("[data-es]")) {
    if (el.hasAttribute("data-en")) continue;
    const [s, e] = el.range;
    const close = `</${el.rawTagName}>`;
    if (src.slice(e - close.length, e).toLowerCase() !== close.toLowerCase()) continue; // void / unclosed: nothing to render
    const oe = openTagEnd(src, s), open = src.slice(s, oe), inner = src.slice(oe, e - close.length);
    const newOpen = open.replace(/\s*\/?>$/, (m) => ` data-en="${attr(inner)}"${m}`);
    edits.push([s, e, newOpen + fixAmp(el.getAttribute("data-es")) + src.slice(e - close.length, e)]);
  }
  for (const el of root.querySelectorAll("[data-ph-es]")) {
    if (el.hasAttribute("data-es")) throw new Error("es-decks: element has both data-es and data-ph-es");
    const [s] = el.range, oe = openTagEnd(src, s), open = src.slice(s, oe);
    const en = el.getAttribute("placeholder") || "", es = el.getAttribute("data-ph-es");
    let newOpen = /\splaceholder="[^"]*"/.test(open)
      ? open.replace(/(\splaceholder=)"[^"]*"/, `$1"${attr(es)}"`)
      : open.replace(/\s*\/?>$/, (m) => ` placeholder="${attr(es)}"${m}`);
    newOpen = newOpen.replace(/\s*\/?>$/, (m) => ` data-ph-en="${attr(en)}"${m}`);
    edits.push([s, oe, newOpen]);
  }
  edits.sort((a, b) => b[0] - a[0]);
  for (let i = 1; i < edits.length; i++) if (edits[i][1] > edits[i - 1][0]) throw new Error("es-decks: overlapping data-es elements");
  let out = src;
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e);
  return { html: out, count: edits.length };
}

function buildTwin(d, ctx) {
  const { ROOT, CONFIG, BASE, esc } = ctx;
  const enUrl = BASE + d.en, esUrl = BASE + d.es;
  const src = fs.readFileSync(path.join(ROOT, d.src), "utf8");
  let { html } = prerenderSpanish(src);

  /* ---- head ---- */
  html = one(html, "<!doctype html>\n<html lang=\"en\">", `<!doctype html>\n<!-- Generated by tools/pages/es-decks.mjs from ${d.src} — edit the English deck, not this file. -->\n<html lang="es">`, "html lang");
  html = one(html, /<meta charset="utf-8">/, `<meta charset="utf-8">\n<script>window.DECK_DEFAULT_LANG="es";</script>`, "default lang");
  // same analytics/verification block generate.mjs injects into the English decks
  const metaBlock = `<!--site-meta--><meta name="ga4-id" content="${esc(CONFIG.ga4Id)}">${CONFIG.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(CONFIG.googleSiteVerification)}">` : ""}${CONFIG.bingSiteVerification ? `<meta name="msvalidate.01" content="${esc(CONFIG.bingSiteVerification)}">` : ""}<!--/site-meta-->`;
  html = one(html, /<!--site-meta-->[\s\S]*?<!--\/site-meta-->/, metaBlock, "site-meta");
  html = one(html, /<title>[^<]*<\/title>/, `<title>${esc(d.title)}</title>`, "title");
  html = one(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(d.description)}">`, "description");
  html = one(html, `<link rel="canonical" href="${enUrl}">`, `<link rel="canonical" href="${esUrl}">`, "canonical");
  // the reciprocal hreflang trio is already in the English deck and is identical on both pages
  one(html, `<link rel="alternate" hreflang="es" href="${esUrl}">`, "", "hreflang present");
  html = one(html, `<meta property="og:url" content="${enUrl}">`, `<meta property="og:url" content="${esUrl}">`, "og:url");
  html = one(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(d.ogTitle)}">`, "og:title");
  html = one(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(d.ogDescription)}">`, "og:description");
  html = one(html, /<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(OG_ALT_ES)}">`, "og:image:alt");
  html = one(html, `<meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="es_US">`,
    `<meta property="og:locale" content="es_US"><meta property="og:locale:alternate" content="en_US">`, "og:locale");
  html = one(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(d.ogTitle)}">`, "twitter:title");
  html = one(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(d.ogDescription)}">`, "twitter:description");

  /* ---- language toggle: ES on, twin link back to English ---- */
  html = one(html, `<button data-l="en" class="on">EN</button><button data-l="es">ES</button>`, `<button data-l="en">EN</button><button data-l="es" class="on">ES</button>`, "toggle state");
  const twinRe = new RegExp(`<a class="twin" data-twin href="${d.es}" hreflang="es" lang="es" title="[^"]*">(<svg[\\s\\S]*?<\\/svg>)<span>Español<\\/span><\\/a>`);
  const icon = (html.match(twinRe) || [])[1];
  html = one(html, twinRe, `<a class="twin" data-twin href="${d.en}" hreflang="en" lang="en" title="View this page in English">${icon}<span>English</span></a>`, "twin link");

  /* ---- JSON-LD ---- */
  const dom = parse(html, { comment: true });
  const faq = dom.querySelectorAll("#faq details").map((det) => {
    const q = det.querySelector("summary"), a = det.querySelector(".a");
    if (!q || !a) throw new Error("es-decks: FAQ item without summary/.a in " + d.src);
    return { "@type": "Question", name: textOf(q), acceptedAnswer: { "@type": "Answer", text: textOf(a) } };
  });
  html = one(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/, "\u0000LD\u0000", "json-ld");
  const ldSrc = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const ld = JSON.parse(ldSrc);
  const graph = ld["@graph"].map((n) => {
    if (n["@type"] === "WebPage") return { ...n, "@id": esUrl + "#page", url: esUrl, name: d.title, description: d.description, inLanguage: "es-US" };
    if (n["@type"] === "FAQPage") return { ...n, "@id": esUrl + "#faq", mainEntity: faq };
    return n;
  });
  if (!graph.some((n) => n["@type"] === "FAQPage") && faq.length) graph.push({ "@type": "FAQPage", "@id": esUrl + "#faq", mainEntity: faq });
  html = html.replace("\u0000LD\u0000", () => `<script type="application/ld+json">${jsonLd({ ...ld, "@graph": graph })}</script>`);
  return html;
}

export default (ctx) => DECKS.map((d) => ({
  path: d.es, altPath: d.en, lang: "es",
  html: buildTwin(d, ctx),
  sitemap: { priority: "0.9", changefreq: "monthly" },
}));
