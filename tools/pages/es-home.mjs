// /es/ — the Spanish home page, generated from the hand-written English /index.html.
// Every data-es attribute replaces the element's innerHTML; data-es-alt / data-es-aria-label / data-es-placeholder
// replace those attributes. Head tags, JSON-LD (WebPage + FAQPage in Spanish) and internal links are rewritten here.
// Run after editing index.html:  cd tools && ONLY=es-home.mjs node generate.mjs   (or the full `npm run gen`).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parse } = require("node-html-parser");

const ES_TITLE = "Eduardo Inoa — REALTOR® bilingüe en Merrimack Valley y el sur de NH | Century 21 North East";
const ES_OG_TITLE = "Eduardo Inoa — Números claros, un plan claro. En inglés o en español.";
const ES_OG_DESC = "REALTOR® bilingüe para compradores, vendedores e inversionistas en Merrimack Valley y el sur de New Hampshire.";
const esDescription = (stats) =>
  `Compre, venda o invierta con números claros y un plan claro. Eduardo Inoa es REALTOR® bilingüe con The Fermin Group en Century 21 North East, licenciado en MA y NH desde 2021 — más de ${String(stats.transactions || "35+").replace(/\+$/, "")} transacciones y ${stats.sales || "$20M+"} en ventas.`;

// English path -> Spanish twin. Town pages map only when the Spanish twin exists (or is one of the four being built).
const TWINS = { "/buyers": "/es/compradores", "/sellers": "/es/vendedores", "/home-value": "/es/valor-de-mi-casa", "/cash-offer": "/es/oferta-en-efectivo", "/towns": "/es/pueblos", "/journal": "/es/blog", "/toolkit": "/es/herramientas", "/listings": "/es/propiedades", "/site-map": "/es/mapa-del-sitio" };
const ES_TOWNS = ["lawrence", "methuen", "haverhill", "lowell"];

export default function esHome(ctx) {
  const { ROOT, CONFIG } = ctx;
  // English posts with a Spanish edition in tools/data/posts.json: their home cards open the Spanish one.
  // Read from the data, not the disk: journal.mjs builds those pages after this module runs (and fails the
  // build if one has no body), so a new Spanish post does not exist on disk yet on its first generate.
  const POSTS = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/posts.json"), "utf8"));
  const POST_TWINS = Object.fromEntries(POSTS.es.map((e) => [POSTS.en.find((p) => p.slug === e.enSlug)?.path, e.path]).filter(([en]) => en));
  const exists = (p) => fs.existsSync(path.join(ROOT, p.replace(/^\//, ""), "index.html")) || fs.existsSync(path.join(ROOT, p.replace(/^\//, "") + ".html"));
  let src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const doctype = (src.match(/^<!doctype[^>]*>\s*/i) || [""])[0];
  const root = parse(src.slice(doctype.length), { comment: true });
  const $ = (s) => root.querySelector(s), $$ = (s) => root.querySelectorAll(s);

  /* ---- guard: the English FAQPage JSON-LD must match the visible English FAQ ---- */
  const faqOf = () => $$(".faq details").map((d) => [d.querySelector("summary").text.trim(), d.querySelector(".a").text.trim()]);
  const ldEl = $$('script[type="application/ld+json"]')[0];
  const graph = JSON.parse(ldEl.textContent);
  {
    const vis = faqOf(), ld = graph["@graph"].find((n) => n["@type"] === "FAQPage");
    const same = ld && ld.mainEntity.length === vis.length && ld.mainEntity.every((q, i) => q.name === vis[i][0] && q.acceptedAnswer.text === vis[i][1]);
    if (!same) console.warn("\n  [es-home] WARNING: index.html FAQPage JSON-LD does not match the visible English FAQ — update the JSON-LD.\n");
  }

  /* ---- translate ---- */
  for (const el of $$("[data-es]")) { el.set_content(el.getAttribute("data-es")); el.removeAttribute("data-es"); }
  for (const a of ["alt", "aria-label", "placeholder", "title"]) {
    for (const el of $$(`[data-es-${a}]`)) { el.setAttribute(a, el.getAttribute(`data-es-${a}`)); el.removeAttribute(`data-es-${a}`); }
  }
  $("html").setAttribute("lang", "es");
  $("#esn")?.remove();

  /* ---- head ---- */
  $("title").set_content(ES_TITLE);
  $('meta[name="description"]').setAttribute("content", esDescription(CONFIG.stats || {}));
  $('link[rel="canonical"]').setAttribute("href", "https://eduardoinoa.com/es");
  $('meta[property="og:url"]').setAttribute("content", "https://eduardoinoa.com/es");
  $('meta[property="og:title"]').setAttribute("content", ES_OG_TITLE);
  $('meta[property="og:description"]').setAttribute("content", ES_OG_DESC);
  $('meta[property="og:locale"]').setAttribute("content", "es_US");
  $('meta[property="og:locale:alternate"]')?.setAttribute("content", "en_US");

  /* ---- links ---- */
  const lang = $("#langLink");
  lang.setAttribute("href", "/"); lang.setAttribute("hreflang", "en"); lang.setAttribute("lang", "en"); lang.set_content("English");
  for (const a of $$("a[href]")) {
    if (a === lang) continue;
    const href = a.getAttribute("href");
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const m = href.match(/^([^?#]*)([?#].*)?$/), p = m[1], rest = m[2] || "";
    let to = null;
    if (TWINS[p]) to = TWINS[p];
    else if (/^\/towns\/[\w-]+$/.test(p)) { const slug = p.split("/")[2]; if (ES_TOWNS.includes(slug) || exists("/es/pueblos/" + slug)) to = "/es/pueblos/" + slug; }
    else if (POST_TWINS[p]) {
      to = POST_TWINS[p]; a.setAttribute("hreflang", "es");
      const go = a.querySelector(".go"); if (go) go.set_content("Leer");
    }
    if (to) a.setAttribute("href", to + rest);
  }

  /* ---- photo credits in Spanish ---- */
  const cr = $(".credits");
  if (cr) cr.set_content(cr.innerHTML.replace(/Photo: /g, "Foto: ").replace(/, via Wikimedia Commons/g, ", vía Wikimedia Commons").replace(/<\/a> on <a/g, "</a> en <a").replace(/>Public domain</g, ">Dominio público<"));

  /* ---- JSON-LD: Spanish WebPage + FAQPage (built from the visible Spanish FAQ) ---- */
  const faqEs = faqOf();
  graph["@graph"] = graph["@graph"].map((n) => {
    if (n["@type"] === "WebPage") return { ...n, "@id": "https://eduardoinoa.com/es#page", url: "https://eduardoinoa.com/es", name: "Eduardo Inoa — REALTOR® bilingüe en Merrimack Valley y el sur de NH", description: "Compre, venda o invierta con números claros y un plan claro.", inLanguage: "es-US" };
    if (n["@type"] === "FAQPage") return { "@type": "FAQPage", "@id": "https://eduardoinoa.com/es#faq", inLanguage: "es-US", mainEntity: faqEs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
    return n;
  });
  ldEl.set_content(JSON.stringify(graph).replace(/</g, "\\u003c"));

  const html = (doctype + root.toString()).replace(/<!--\s*Editing notes[\s\S]*?-->\n?/, "");
  return [{ path: "/es", altPath: "/", lang: "es", html, sitemap: { priority: "0.9", changefreq: "weekly" } }];
}
