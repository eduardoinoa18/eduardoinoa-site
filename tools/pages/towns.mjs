// Town pages (EN + ES) and the two town indexes.
//   /towns                 + /es/pueblos             index of all 20 service-area towns
//   /towns/<slug>          (14 priority towns, EN)
//   /es/pueblos/<slug>     (Spanish twins for the towns that have an `es` block in tools/data/towns.json)
//
// Content lives in tools/data/towns.json (researched, sourced, evergreen). Market numbers are never written
// into the page: the Market Pulse block (market.js, data-market="town") renders them live from /market.json,
// falling back to county figures when a town has no series.
// Photos are chosen from img/photos/manifest.json by town + state (or by category for generic shots),
// never by hard-coded slug; with no match the page falls back to a typographic hero / blank arch.
// Fair Housing: copy describes places, housing, roads and services — never who lives somewhere.
import fs from "node:fs";
import path from "node:path";

export default function towns(ctx) {
  const { esc, ROOT, breadcrumb, faqPage, consent, honeypot, abs, img, photos, CONFIG } = ctx;
  const NAP = CONFIG.nap, LINKS = CONFIG.links;
  const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/towns.json"), "utf8"));
  const TOWNS = DATA.towns;
  const BY = Object.fromEntries(TOWNS.map((t) => [t.slug, t]));
  const STATE = { en: { MA: "Massachusetts", NH: "New Hampshire" }, es: { MA: "Massachusetts", NH: "New Hampshire" } };

  const enPath = (s) => `/towns/${s}`;
  const esPath = (s) => `/es/pueblos/${s}`;
  const hasEs = (t) => !!(t && t.es);
  const countyShort = (c, lang) => {
    const n = String(c).replace(/ County, (MA|NH)$/, "");
    return lang === "es" ? `Condado de ${n}` : `${n} County`;
  };
  const q = (name) => encodeURIComponent(name);
  const homeValueHref = (name, lang) => (lang === "es" ? "/es/valor-de-mi-casa" : "/home-value") + "?town=" + q(name);
  const buyersHref = (lang) => (lang === "es" ? "/es/compradores" : "/buyers");

  /* ---------------- photos ---------------- */
  const P = photos();
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  const townPics = (name, st) => P.filter((p) => p.town && norm(p.town) === norm(name) && (!p.state || p.state === st));
  const landscape = (p) => p.w >= p.h;
  const heroPick = (list) => [...list].filter(landscape).sort((a, b) => (b.hero_candidate ? 1 : 0) - (a.hero_candidate ? 1 : 0))[0] || null;
  const archPick = (list) => list.find((p) => p.h > p.w) || heroPick(list) || list[0] || null;
  const generic = P.filter((p) => !p.town);
  function housingPick(t, i) {
    const homes = generic.filter((p) => p.category === "home");
    const multi = homes.filter((p) => /multi|triple|decker/i.test(p.slug + " " + (p.alt_en || "")));
    const single = homes.filter((p) => !multi.includes(p) && !/coastal|cottage|beach/i.test(p.slug + " " + (p.alt_en || "")));
    let pool = t.stock === "multi" && multi.length ? multi : single;
    if (!pool.length) pool = generic.filter((p) => ["home", "season", "aerial"].includes(p.category));
    if (!pool.length) return null;
    // Prefer portrait shots for the arch frame, then rotate so neighbouring pages differ.
    const portrait = pool.filter((p) => p.h > p.w);
    const use = portrait.length && t.stock === "multi" ? portrait : pool;
    return use[i % use.length];
  }

  /* ---------------- copy ---------------- */
  const L = {
    en: {
      home: "Home", towns: "Towns", guide: "Town guide", pre: "Living in & buying/selling in",
      worth: (n) => `What's my home worth in ${n}?`, buying: (n) => `Buying in ${n}`,
      brief: "The short version", briefH: (n) => `${n}, briefly`, glance: (n) => `${n} at a glance`,
      g: { state: "State", county: "County", inc: "Incorporated", rail: "Commuter rail", roads: "Main roads", schools: "Public schools" },
      mkt: "Market pulse", mktH: (n) => `${n}, this week`,
      mktLede: "Live from public sources and refreshed every week. When a town has no separate series, the panel shows county figures and says so.",
      mktNoJs: "Live market figures need JavaScript. Ask me and I'll send you the latest numbers for this town.",
      housing: "Housing", housingH: "What the housing stock looks like", rep: "Representative home style — not a listing.",
      ways: "Getting around", waysH: (n) => `Getting to and from ${n}`, waysLede: "Check the MBTA and MassDOT or NHDOT for current schedules and roadwork.",
      schools: "Schools", schoolsH: (n) => `Schools in ${n}`, visit: (d) => `Visit ${d}`, official: "Opens the district's official website.",
      dese: `The Massachusetts Department of Elementary and Secondary Education publishes <a href="https://profiles.doe.mass.edu/" target="_blank" rel="noopener">school and district profiles</a> for every public district in the state.`,
      noRank: "I don't rank or rate schools; the district and the state are the sources to trust.",
      know: "Good to know", knowH: (n) => `A few things about ${n}`,
      faq: "Questions", faqH: "Answered plainly",
      cta: "Let's talk", ctaH: (n) => `Thinking about a move in ${n}?`,
      ctaLede: "Tell me what you're planning — buying, selling or investing. I'll come back with real numbers for this town, in English or Spanish.",
      call: "Call or text", book: "Book a call",
      formH: (n) => `Ask me about ${n}`, formSub: "I reply personally, usually the same day.",
      iam: "I'm", seg: [["buyer", "Buying"], ["seller", "Selling"], ["investor", "Investing"]],
      name: "Name", phone: "Phone", email: "Email", msg: "Anything I should know?", opt: "(optional)", send: "Send",
      doneH: "Thank you.", done: (n) => `I'll reach out personally, usually the same day, to talk about ${n}.`,
      near: "Nearby towns", all: "All towns",
      sharedFaq: (t, fallback) => [
        [`How is the ${t.name} housing market right now?`, `The Market Pulse on this page refreshes every week from public sources: typical value, sale prices, days on market and mortgage rates.${fallback ? ` The sources don't publish a separate series for ${t.name}, so it shows ${countyShort(t.county, "en")} figures and says so.` : ""} Those are area trends; for a specific street, I pull the recent comparable sales.`],
        [`What is my home in ${t.name} worth?`, `Request a <a href="${homeValueHref(t.name, "en")}">home value</a> and I'll review the comparable sales and active competition near your address, then send you a written range. It's free and there's no obligation.`],
        ["Do you work in Spanish?", "Yes. I'm a bilingual REALTOR®, and the whole process — every document explained, the negotiation and the signings — can be in Spanish."],
      ],
    },
    es: {
      home: "Inicio", towns: "Pueblos", guide: "Guía del pueblo", pre: "Vivir, comprar y vender en",
      worth: (n) => `¿Cuánto vale mi casa en ${n}?`, buying: (n) => `Comprar en ${n}`,
      brief: "En pocas palabras", briefH: (n) => `${n}, en breve`, glance: (n) => `${n} de un vistazo`,
      g: { state: "Estado", county: "Condado", inc: "Fundación", rail: "Tren", roads: "Vías principales", schools: "Escuelas públicas" },
      mkt: "El mercado", mktH: (n) => `${n}, esta semana`,
      mktLede: "Datos de fuentes públicas, actualizados cada semana. Si un pueblo no tiene una serie propia, el panel muestra las cifras del condado y lo indica.",
      mktNoJs: "Las cifras en vivo necesitan JavaScript. Pídamelas y le envío los números más recientes de este pueblo.",
      housing: "Vivienda", housingH: "Cómo son las casas", rep: "Foto representativa del estilo — no es una propiedad en venta.",
      ways: "Transporte", waysH: (n) => `Cómo moverse desde ${n}`, waysLede: "Revise el MBTA y MassDOT o NHDOT para horarios y obras actuales.",
      schools: "Escuelas", schoolsH: (n) => `Escuelas en ${n}`, visit: (d) => `Visitar ${d}`, official: "Abre el sitio web oficial del distrito (en inglés).",
      dese: `El Departamento de Educación Primaria y Secundaria de Massachusetts publica <a href="https://profiles.doe.mass.edu/" target="_blank" rel="noopener">perfiles de escuelas y distritos</a> (en inglés) para cada distrito público del estado.`,
      noRank: "Yo no clasifico ni califico escuelas; las fuentes confiables son el distrito y el estado.",
      know: "Bueno saber", knowH: (n) => `Algunas cosas sobre ${n}`,
      faq: "Preguntas", faqH: "Respuestas claras",
      cta: "Hablemos", ctaH: (n) => `¿Piensa mudarse en ${n}?`,
      ctaLede: "Cuénteme qué está planeando — comprar, vender o invertir. Le respondo con números reales de este pueblo, en español o en inglés.",
      call: "Llamar o texto", book: "Reservar llamada",
      formH: (n) => `Pregúnteme sobre ${n}`, formSub: "Le respondo personalmente, normalmente el mismo día.",
      iam: "Quiero", seg: [["buyer", "Comprar"], ["seller", "Vender"], ["investor", "Invertir"]],
      name: "Nombre", phone: "Teléfono", email: "Email", msg: "¿Algo que deba saber?", opt: "(opcional)", send: "Enviar",
      doneH: "Gracias.", done: (n) => `Le escribo personalmente, normalmente el mismo día, para hablar de ${n}.`,
      near: "Pueblos cercanos", all: "Todos los pueblos", enOnly: "(en inglés)",
      sharedFaq: (t, fallback) => [
        [`¿Cómo está el mercado de vivienda en ${t.name} ahora mismo?`, `El panel del mercado en esta página se actualiza cada semana con fuentes públicas: valor típico, precios de venta, días en el mercado y tasas hipotecarias.${fallback ? ` Las fuentes no publican una serie separada para ${t.name}, así que muestra las cifras del ${countyShort(t.county, "es")} y lo indica.` : ""} Son tendencias del área; para una calle en específico, yo busco las ventas comparables recientes.`],
        [`¿Cuánto vale mi casa en ${t.name}?`, `Pida el <a href="${homeValueHref(t.name, "es")}">valor de su casa</a> y yo reviso las ventas comparables y la competencia activa cerca de su dirección, y le envío un rango por escrito. Es gratis y sin compromiso.`],
        ["¿Puedo hacer todo el proceso en español?", "Sí. Soy REALTOR® bilingüe: le explico cada documento en español, negocio por usted y lo acompaño en las firmas. Todo el proceso puede ser en su idioma."],
      ],
    },
  };

  const hasSeries = (t) => {
    const r = (ctx.market.towns || []).find((x) => norm(x.name) === norm(t.name) && x.state === t.state);
    return !!(r && r.zillow && r.zillow.zhvi && r.zillow.zhvi.value);
  };

  /* ---------------- page-scoped CSS (shared by every page in this module) ---------------- */
  const CSS = `<style>
.tp-hero{min-height:min(86svh,780px)}
.tp-hero:after{background:linear-gradient(180deg,rgba(6,26,48,.5) 0%,rgba(6,26,48,.3) 30%,rgba(6,26,48,.62) 58%,rgba(6,26,48,.92) 100%)}
.tp-hero .label{text-shadow:0 1px 12px rgba(6,26,48,.6)}
.tp-hero h1{max-width:none}
.tp-hero h1 .pre{display:block;font:italic 500 clamp(21px,2.3vw,30px)/1.25 var(--hf);color:rgba(255,255,255,.86);letter-spacing:0;margin-bottom:.22em}
.tp-hero h1 .nm{display:block;font-size:clamp(44px,9vw,128px);line-height:.95;overflow-wrap:break-word}
.tp-hero .crumbs{padding:0 0 24px}
.tp-hero .crumbs a{color:inherit}
.tp-typo{background:radial-gradient(900px 620px at 82% 22%,rgba(201,174,124,.16),transparent 62%),radial-gradient(820px 620px at 0% 100%,var(--harbor),transparent 70%),var(--night)}
.tp-typo:after{display:none}
.tp-mark{position:absolute;right:clamp(16px,6vw,96px);top:50%;transform:translateY(-54%);width:min(36vw,420px);aspect-ratio:4/5;border:1px solid rgba(201,174,124,.55);border-radius:999px 999px 18px 18px;display:grid;place-items:center}
.tp-mark:before{content:"";position:absolute;inset:14px;border:1px solid rgba(201,174,124,.22);border-radius:999px 999px 12px 12px}
.tp-mark span{font:italic 500 clamp(120px,20vw,280px)/1 var(--hf);color:var(--champagne)}
.tp-mark-photo{overflow:hidden;isolation:isolate}
.tp-mark-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.tp-mark-photo:before{z-index:1}
.tp-typo .wrap{max-width:var(--wrap)}
@media(min-width:801px){.tp-mark-photo~.wrap>*{max-width:calc(100% - min(36vw,420px) - 48px)}}
@media(max-width:800px){.tp-mark{opacity:.28;width:64vw;right:-12vw;top:34%}.tp-typo{min-height:0}.tp-typo .wrap{padding-top:36px}.tp-mark-photo{display:grid;position:relative;top:auto;right:auto;transform:none;opacity:1;width:min(60vw,250px);margin:36px var(--gut) 0;justify-self:start}}
.tp-intro{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(32px,6vw,96px);align-items:start}
.tp-intro h2{margin-bottom:.45em}
.tp-glance{background:var(--ivory);border-radius:24px;padding:clamp(22px,3vw,36px);position:relative}
.tp-glance:before{content:"";position:absolute;inset:8px;border:1px solid rgba(201,174,124,.45);border-radius:18px;pointer-events:none}
.tp-glance h3{font-size:26px;margin-bottom:12px}
.tp-glance dl>div{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;padding:13px 0;border-top:1px solid var(--line)}
.tp-glance dt{font-size:13px;line-height:1.5;color:var(--champagne-ink);font-weight:500;letter-spacing:.02em;padding-top:2px}
.tp-glance dd{font-size:15.5px;line-height:1.5;color:var(--ink)}
.tp-glance dd a{color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:3px}
@media(max-width:900px){.tp-intro{grid-template-columns:1fr}}
@media(max-width:430px){.tp-glance dl>div{grid-template-columns:1fr;gap:2px}}
.tp-house figure{margin:0}
.tp-house .arch{max-width:460px}
.tp-ways{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.tp-ways li{background:var(--ivory);border:1px solid var(--line);border-radius:22px;padding:clamp(22px,2.6vw,32px)}
.tp-ways b{display:block;font:600 25px/1.15 var(--hf);color:var(--harbor);margin-bottom:8px}
.tp-ways b:before{content:"";display:block;width:28px;height:1px;background:var(--champagne-ink);margin-bottom:18px}
.tp-ways p{font-size:15.5px;color:var(--muted)}
@media(max-width:900px){.tp-ways{grid-template-columns:1fr}}
.tp-school{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px 56px;align-items:end}
.tp-school .small{margin-top:14px;max-width:640px}
.tp-school .small a{color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:3px}
.tp-school .ext{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
@media(max-width:800px){.tp-school{grid-template-columns:1fr}}
.tp-kw{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(32px,6vw,96px);align-items:start}
.tp-kw.solo{grid-template-columns:minmax(0,1fr)}
.tp-kw figure{margin:0;position:sticky;top:100px}
.tp-know{list-style:none;counter-reset:k;margin-top:8px}
.tp-know li{counter-increment:k;display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;padding:22px 0;border-top:1px solid var(--line)}
.tp-know li:last-child{border-bottom:1px solid var(--line)}
.tp-know li:before{content:counter(k,lower-roman) ".";font:italic 500 26px/1.1 var(--hf);color:var(--champagne-ink)}
.tp-know b{display:block;font:600 23px/1.2 var(--hf);color:var(--harbor)}
.tp-know p{font-size:15.5px;color:var(--muted);margin-top:4px}
.tp-kw.solo .tp-know{display:grid;grid-template-columns:1fr 1fr;column-gap:48px}
@media(max-width:900px){.tp-kw{grid-template-columns:1fr}.tp-kw figure{position:relative;top:auto;max-width:560px}.tp-kw.solo .tp-know{grid-template-columns:1fr}}
.faq .a a{color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:3px}
.tp-cta .split{align-items:start}
.tp-cta .lede{margin-top:18px}
.tp-contact{margin-top:30px;font-size:15px;color:#B8C7D6;line-height:1.8}
.tp-contact a{color:#fff;text-underline-offset:3px;text-decoration-color:rgba(201,174,124,.7)}
.tp-form fieldset{border:0;min-width:0}
.tp-form legend{display:block;font:500 14px/1.3 var(--bf);color:var(--muted);margin-bottom:6px;padding:0}
.tp-form .field label span{font-weight:400}
.tp-near{display:flex;flex-wrap:wrap;gap:18px 40px;align-items:flex-end;justify-content:space-between}
.tp-near h2{font-size:clamp(28px,3vw,40px);margin-bottom:16px}
.tp-near .chips small{font-size:12px;color:var(--muted)}
.tp-all{font:500 15px var(--bf);color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:4px}
/* index */
.tp-ix-hero{background:radial-gradient(1000px 640px at 85% 10%,rgba(201,174,124,.12),transparent 60%),var(--night);color:#fff;overflow:hidden}
.tp-ix-hero .wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:clamp(32px,5vw,80px);align-items:center;padding-top:clamp(40px,6vw,88px);padding-bottom:clamp(56px,7vw,104px)}
.tp-ix-hero .crumbs{color:rgba(255,255,255,.7);padding:0 0 28px}
.tp-ix-hero .crumbs a{color:inherit}
.tp-ix-hero .label{color:var(--champagne)}
.tp-ix-hero h1{color:#fff;font-size:clamp(42px,5.8vw,86px)}
.tp-ix-hero h1 em{font-style:italic;color:var(--champagne)}
.tp-ix-hero .lede{color:rgba(255,255,255,.8);margin-top:22px}
.tp-trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
.tp-trio .arch{aspect-ratio:3/4.4}
.tp-trio .arch:nth-child(2){margin-top:56px}
.tp-trio .arch:nth-child(3){margin-top:22px}
@media(max-width:900px){.tp-ix-hero .wrap{grid-template-columns:1fr}.tp-trio{max-width:520px}.tp-trio .arch:nth-child(2){margin-top:28px}.tp-trio .arch:nth-child(3){margin-top:12px}}
@media(prefers-reduced-motion:no-preference){.tp-trio .arch{animation:rise 1.2s var(--ease) both}.tp-trio .arch:nth-child(2){animation-delay:.15s}.tp-trio .arch:nth-child(3){animation-delay:.3s}}
.tp-grid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:44px 22px}
.tp-grid .town-card .tp-c{display:block;font-size:13px;letter-spacing:.02em;color:var(--champagne-ink);margin-top:16px}
.tp-grid .town-card b{margin-top:4px}
.tp-grid .town-card span{line-height:1.5}
.tp-grid .town-card .tp-tag{display:inline-block;margin-top:10px;font-size:12.5px;color:var(--harbor);border:1px solid var(--line);border-radius:999px;padding:4px 11px}
.tp-grid .town-card:hover b{text-decoration:underline;text-decoration-color:var(--champagne);text-underline-offset:4px}
.tp-grid .town-card:focus-visible{outline:none}
.tp-grid .town-card:focus-visible .arch{outline:2px solid var(--teal);outline-offset:4px}
@media(max-width:600px){.tp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 12px}.tp-grid .town-card b{font-size:21px}.tp-grid .town-card span{font-size:13px}.town-card .arch.blank i{font-size:38px}}
.tp-band{display:flex;flex-wrap:wrap;gap:24px 48px;align-items:flex-end;justify-content:space-between}
.tp-band h2{max-width:18ch}
</style>`;
  const HEAD = `<link rel="stylesheet" href="/market.css">${CSS}`;
  const SCRIPTS = `<script src="/market.js" defer></script>`;

  /* ---------------- pieces ---------------- */
  const crumbsHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([n, h], i) =>
    i === items.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${h}">${esc(n)}</a></li>`).join("")}</ol></nav>`;

  function leadForm(t, lang) {
    const c = L[lang], id = `tp-${t.slug}-${lang}`;
    return `<form class="form tp-form" data-lead data-source="website" data-type="buyer" data-label="Town page — ${esc(t.name)}" novalidate>
  <div class="fields">
    <h3>${esc(c.formH(t.name))}</h3>
    <p class="sub">${esc(c.formSub)}</p>
    <fieldset class="field"><legend>${esc(c.iam)}</legend><div class="seg">${c.seg.map(([v, label], i) =>
      `<label><input type="radio" name="type" value="${v}"${i === 0 ? " checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div></fieldset>
    <div class="field"><label for="${id}-name">${esc(c.name)}</label><input id="${id}-name" name="name" autocomplete="name" required></div>
    <div class="row2">
      <div class="field"><label for="${id}-phone">${esc(c.phone)}</label><input id="${id}-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
      <div class="field"><label for="${id}-email">${esc(c.email)}</label><input id="${id}-email" name="email" type="email" autocomplete="email"></div>
    </div>
    <div class="field"><label for="${id}-msg">${esc(c.msg)} <span>${esc(c.opt)}</span></label><textarea id="${id}-msg" name="message" rows="3"></textarea></div>
    <input type="hidden" name="town" value="${esc(t.name)}, ${t.state}">
    ${consent(lang)}
    ${honeypot}
    <button class="btn btn-primary" type="submit">${esc(c.send)}</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
  </div>
  <div class="done"><h3>${esc(c.doneH)}</h3><p>${esc(c.done(t.name))}</p></div>
</form>`;
  }

  function townPage(t, i, lang) {
    const es = lang === "es", c = L[lang];
    const x = es ? { ...t, ...t.es } : t; // localized fields
    const name = t.name, st = t.state, stateName = STATE[lang][st];
    const pathSelf = es ? esPath(t.slug) : enPath(t.slug);
    const alt = es ? enPath(t.slug) : hasEs(t) ? esPath(t.slug) : undefined;
    const home = es ? "/es" : "/", townsIx = es ? "/es/pueblos" : "/towns";
    const credits = [];

    // photos
    const pics = townPics(name, st);
    const hero = heroPick(pics);
    const archHero = hero ? null : pics.find((p) => p.h > p.w) || null; // portrait-only town: photo inside the arch mark
    if (hero) credits.push(hero.slug);
    if (archHero) credits.push(archHero.slug);
    const second = pics.find((p) => p !== hero && p !== archHero) || null;
    if (second) credits.push(second.slug);
    const house = housingPick(t, i);
    if (house) credits.push(house.slug);

    const crumbItems = [[c.home, home], [c.towns, townsIx], [name, pathSelf]];
    const fallback = !hasSeries(t);
    const faqs = [...x.faq, ...c.sharedFaq(t, fallback)];
    const url = abs(pathSelf);

    const heroHtml = `<section class="hero on-dark tp-hero${hero ? "" : " tp-typo"}">
  ${hero ? img(hero.slug, { lang, eager: true, sizes: "100vw" }) : archHero ? `<div class="tp-mark tp-mark-photo">${img(archHero.slug, { lang, eager: true, sizes: "(max-width:800px) 60vw, 420px" })}</div>` : `<div class="tp-mark" aria-hidden="true"><span>${esc(name.charAt(0))}</span></div>`}
  <div class="wrap">
    ${crumbsHtml(crumbItems)}
    <span class="label">${esc(c.guide)} · ${esc(countyShort(t.county, lang))}, ${esc(stateName)}</span>
    <h1><span class="pre">${esc(c.pre)}</span> <span class="nm">${esc(name)}, ${st}</span></h1>
    <p class="lede">${esc(x.lede)}</p>
    <div class="btn-row"><a class="btn btn-gold" href="${homeValueHref(name, lang)}">${esc(c.worth(name))}</a><a class="btn btn-ghost" href="${buyersHref(lang)}">${esc(c.buying(name))}</a></div>
  </div>
</section>`;

    const glance = `<aside class="tp-glance" aria-labelledby="glance-h">
      <h3 id="glance-h">${esc(c.glance(name))}</h3>
      <dl>
        <div><dt>${c.g.state}</dt><dd>${esc(stateName)}</dd></div>
        <div><dt>${c.g.county}</dt><dd>${esc(countyShort(t.county, lang))}</dd></div>
        <div><dt>${c.g.inc}</dt><dd>${esc(x.incorporated)}</dd></div>
        <div><dt>${c.g.rail}</dt><dd>${esc(x.rail)}</dd></div>
        <div><dt>${c.g.roads}</dt><dd>${esc(x.roads)}</dd></div>
        <div><dt>${c.g.schools}</dt><dd><a href="${esc(t.district.url)}" target="_blank" rel="noopener">${esc(t.district.name)}</a></dd></div>
      </dl>
    </aside>`;

    const nearby = (t.neighbors || []).map((s) => BY[s]).filter(Boolean).map((n) => {
      if (!es) return `<a href="${enPath(n.slug)}">${esc(n.name)}, ${n.state}</a>`;
      return hasEs(n) ? `<a href="${esPath(n.slug)}">${esc(n.name)}, ${n.state}</a>`
        : `<a href="${enPath(n.slug)}" hreflang="en">${esc(n.name)}, ${n.state} <small>${c.enOnly}</small></a>`;
    }).join("");

    const body = `${heroHtml}

<section class="section paper" id="intro"><div class="wrap tp-intro">
  <div class="prose">
    <span class="label">${esc(c.brief)}</span>
    <h2>${esc(c.briefH(name))}</h2>
    ${x.intro.map((p) => `<p>${esc(p)}</p>`).join("\n    ")}
  </div>
  ${glance}
</div></section>

<section class="section" id="market"><div class="wrap">
  <div class="head"><div><span class="label">${esc(c.mkt)}</span><h2>${esc(c.mktH(name))}</h2></div><p class="lede">${esc(c.mktLede)}</p></div>
  <div data-market="town" data-market-town="${esc(name)}" data-market-state="${st}" data-market-county="${esc(t.county)}" data-market-src="/market.json"><noscript><p class="mp-foot">${esc(c.mktNoJs)}</p></noscript></div>
</div></section>

<section class="section stone tp-house" id="housing"><div class="wrap split">
  ${house ? `<figure><div class="arch">${img(house.slug, { lang, sizes: "(max-width:900px) 92vw, 460px" })}</div><figcaption>${esc(c.rep)}</figcaption></figure>` : `<div class="arch blank" aria-hidden="true" style="background:linear-gradient(160deg,var(--harbor),var(--night));display:grid;place-items:center;max-width:460px"><span style="font:italic 500 120px var(--hf);color:var(--champagne)">${esc(name.charAt(0))}</span></div>`}
  <div class="prose">
    <span class="label">${esc(c.housing)}</span>
    <h2>${esc(c.housingH)}</h2>
    ${x.housing.map((p) => `<p>${esc(p)}</p>`).join("\n    ")}
  </div>
</div></section>

<section class="section paper" id="getting-around"><div class="wrap">
  <div class="head"><div><span class="label">${esc(c.ways)}</span><h2>${esc(c.waysH(name))}</h2></div><p class="lede">${esc(c.waysLede)}</p></div>
  <ul class="tp-ways">${x.ways.map((w) => `<li><b>${esc(w.t)}</b><p>${esc(w.d)}</p></li>`).join("")}</ul>
</div></section>

<section class="section tight" id="schools"><div class="wrap tp-school">
  <div>
    <span class="label">${esc(c.schools)}</span>
    <h2>${esc(c.schoolsH(name))}</h2>
    <p class="lede" style="margin-top:16px">${esc(x.schools)}</p>
    <p class="small">${c.noRank}${st === "MA" ? " " + c.dese : ""}</p>
  </div>
  <div class="ext"><a class="btn btn-primary" href="${esc(t.district.url)}" target="_blank" rel="noopener">${esc(c.visit(t.district.name))}</a><span class="small">${esc(c.official)}</span></div>
</div></section>

<section class="section paper" id="good-to-know"><div class="wrap tp-kw${second ? "" : " solo"}">
  <div>
    <span class="label">${esc(c.know)}</span>
    <h2>${esc(c.knowH(name))}</h2>
    <ol class="tp-know">${x.know.map((k) => `<li><div><b>${esc(k.t)}</b><p>${esc(k.d)}</p></div></li>`).join("")}</ol>
  </div>
  ${second ? `<figure class="frame">${img(second.slug, { lang, sizes: "(max-width:900px) 92vw, 520px" })}</figure>` : ""}
</div></section>

<section class="section" id="faq"><div class="wrap">
  <div class="head"><div><span class="label">${esc(c.faq)}</span><h2>${esc(c.faqH)}</h2></div></div>
  <div class="faq">${faqs.map(([qq, a]) => `<details><summary>${esc(qq)}</summary><div class="a"><p>${a}</p></div></details>`).join("")}</div>
</div></section>

<section class="section dark on-dark tp-cta" id="contact"><div class="wrap split">
  <div>
    <span class="label">${esc(c.cta)}</span>
    <h2>${esc(c.ctaH(name))}</h2>
    <p class="lede">${esc(c.ctaLede)}</p>
    <div class="btn-row"><a class="btn btn-gold" href="${homeValueHref(name, lang)}">${esc(c.worth(name))}</a><a class="btn btn-ghost" href="${buyersHref(lang)}">${esc(c.buying(name))}</a></div>
    <p class="tp-contact">${esc(c.call)}: <a href="tel:${NAP.tel}">${NAP.phone}</a> · <a href="${LINKS.book}" target="_blank" rel="noopener">${esc(c.book)}</a><br>${esc(NAP.brokerage)} · ${esc(NAP.street)}, ${NAP.city}, ${NAP.region} ${NAP.zip}</p>
  </div>
  ${leadForm(t, lang)}
</div></section>

<section class="section tight" id="nearby"><div class="wrap tp-near">
  <div><h2>${esc(c.near)}</h2><div class="chips">${nearby}</div></div>
  <a class="tp-all" href="${townsIx}">${esc(c.all)}</a>
</div></section>`;

    const schema = [
      { ...breadcrumb(crumbItems), "@id": url + "#breadcrumb" },
      { "@type": "Place", "@id": url + "#place", name: `${name}, ${st}`, containedInPlace: { "@type": "State", name: stateName } },
      faqPage(url + "#faq", faqs),
    ];

    return {
      lang, path: pathSelf, altPath: alt,
      title: es ? `Bienes raíces en ${name}, ${st}: vivir, comprar y vender | Eduardo Inoa, REALTOR®`
        : `${name}, ${st} real estate: living, buying & selling | Eduardo Inoa, REALTOR®`,
      description: x.description,
      navCurrent: townsIx,
      head: HEAD, scripts: SCRIPTS, schema, body,
      foot: { credits: [...new Set(credits)] },
      sitemap: { priority: "0.8", changefreq: "monthly" },
    };
  }

  /* ---------------- index pages ---------------- */
  function indexPage(lang) {
    const es = lang === "es";
    const pathSelf = es ? "/es/pueblos" : "/towns";
    const credits = [];
    const area = DATA.serviceArea;

    function card(a, idx) {
      const t = a.slug ? BY[a.slug] : null;
      const pics = townPics(a.name, a.state);
      const pic = archPick(pics);
      if (pic) credits.push(pic.slug);
      const arch = pic ? `<div class="arch">${img(pic.slug, { lang, sizes: "(max-width:600px) 46vw, (max-width:1200px) 30vw, 280px", alt: "" })}</div>`
        : `<div class="arch blank"><i>${esc(a.name.charAt(0))}</i></div>`;
      const county = esc(countyShort(a.county, lang));
      if (t) {
        const href = es ? (hasEs(t) ? esPath(t.slug) : enPath(t.slug)) : enPath(t.slug);
        const line = es ? (t.es ? t.es.card : t.card_es || t.card) : t.card;
        const tag = es && !hasEs(t) ? `<span class="tp-tag">Guía ${L.es.enOnly}</span>` : "";
        return `<a class="town-card" href="${href}"${es && !hasEs(t) ? ' hreflang="en"' : ""}>${arch}<i class="tp-c">${county}</i><b>${esc(a.name)}${a.state === "NH" ? ", NH" : ""}</b><span>${esc(line)}</span>${tag}</a>`;
      }
      return `<a class="town-card" href="${homeValueHref(a.name, lang)}">${arch}<i class="tp-c">${county}</i><b>${esc(a.name)}, ${a.state}</b><span>${es ? `Pida el valor de su casa en ${esc(a.name)}` : `Ask for a home value in ${esc(a.name)}`}</span></a>`;
    }

    // hero trio: portrait town photos from three different priority towns
    const trio = [];
    for (const a of area.filter((x) => x.slug)) {
      const p = townPics(a.name, a.state).find((x) => x.h > x.w);
      if (p && !trio.some((y) => y.town === p.town)) trio.push(p);
      if (trio.length === 3) break;
    }
    for (const a of area) { // top up with landscape shots if fewer than 3 portraits exist
      if (trio.length >= 3) break;
      const p = archPick(townPics(a.name, a.state));
      if (p && !trio.includes(p) && !trio.some((y) => y.town === p.town)) trio.push(p);
    }
    trio.forEach((p) => credits.push(p.slug));
    const trioHtml = trio.length === 3
      ? `<div class="tp-trio">${trio.map((p, k) => `<div class="arch">${img(p.slug, { lang, eager: k === 0, sizes: "(max-width:900px) 30vw, 180px" })}</div>`).join("")}</div>`
      : "";

    const ma = area.filter((a) => a.state === "MA"), nh = area.filter((a) => a.state === "NH");
    const crumbItems = es ? [["Inicio", "/es"], ["Pueblos", pathSelf]] : [["Home", "/"], ["Towns", pathSelf]];
    const url = abs(pathSelf);

    const body = `<section class="tp-ix-hero on-dark"><div class="wrap">
  <div>
    ${crumbsHtml(crumbItems)}
    <span class="label">${es ? "Guías de pueblos" : "Town guides"}</span>
    <h1>${es ? "El Merrimack Valley y el sur de New Hampshire, <em>pueblo por pueblo.</em>" : "The Merrimack Valley and Southern New Hampshire, <em>town by town.</em>"}</h1>
    <p class="lede">${es
      ? "Veinte pueblos en dos estados, cada uno con su tipo de casas, sus trayectos y sus impuestos. Estas guías le dan lo esencial — y el mercado al día — para comparar con calma. Desde nuestra oficina en Lawrence."
      : "Twenty towns in two states, each with its own housing, commutes and taxes. These guides give you the essentials — and this week's market — so you can compare with a clear head. From our office in Lawrence."}</p>
    <div class="btn-row"><a class="btn btn-gold" href="${es ? "/es/valor-de-mi-casa" : "/home-value"}">${es ? "¿Cuánto vale mi casa?" : "What's my home worth?"}</a><a class="btn btn-ghost" href="${buyersHref(lang)}">${es ? "Comprar una casa" : "Buying a home"}</a></div>
  </div>
  ${trioHtml}
</div></section>

<section class="section" id="massachusetts"><div class="wrap">
  <div class="head"><div><span class="label">Massachusetts</span><h2>${es ? "El Merrimack Valley" : "The Merrimack Valley"}</h2></div>
  <p class="lede">${es ? "Ciudades de molinos con tren a Boston, pueblos de casas coloniales y lotes grandes, y todo lo que hay entre medio — a lo largo de la I-93, la I-495 y la Ruta 3." : "Mill cities with trains to Boston, towns of colonials on larger lots, and everything in between — along I-93, I-495 and Route 3."}</p></div>
  <div class="towns-grid tp-grid">${ma.map(card).join("")}</div>
</div></section>

<section class="section stone" id="new-hampshire"><div class="wrap">
  <div class="head"><div><span class="label">New Hampshire</span><h2>${es ? "El sur de New Hampshire" : "Southern New Hampshire"}</h2></div>
  <p class="lede">${es ? "Sin impuesto general a las ventas ni impuesto estatal sobre el salario, pero con impuestos a la propiedad más altos — siempre comparamos la factura real. Tengo licencia en los dos estados." : "No general sales tax and no state income tax on wages, but higher property taxes — we always compare the actual bill. I'm licensed in both states."}</p></div>
  <div class="towns-grid tp-grid">${nh.map(card).join("")}</div>
</div></section>

<section class="section tight dark on-dark"><div class="wrap tp-band">
  <div><span class="label">${es ? "¿Comparando pueblos?" : "Comparing towns?"}</span><h2>${es ? "Dígame su trayecto, su presupuesto y lo que no negocia." : "Tell me your commute, your budget and your must-haves."}</h2>
  <p class="lede" style="margin-top:14px">${es ? "Le pongo dos o tres pueblos lado a lado, con números reales. En español o en inglés." : "I'll put two or three towns side by side, with real numbers. In English or Spanish."}</p></div>
  <div class="btn-row" style="margin-top:0"><a class="btn btn-gold" href="${LINKS.book}" target="_blank" rel="noopener">${es ? "Reservar 20 minutos" : "Book 20 minutes"}</a><a class="btn btn-ghost" href="tel:${NAP.tel}">${es ? "Llamar" : "Call"} ${NAP.phone}</a></div>
</div></section>`;

    const listed = TOWNS.map((t) => ({ t, href: es && hasEs(t) ? esPath(t.slug) : enPath(t.slug) }));
    const schema = [
      { ...breadcrumb(crumbItems), "@id": url + "#breadcrumb" },
      { "@type": "ItemList", "@id": url + "#towns", name: es ? "Guías de pueblos" : "Town guides",
        itemListElement: listed.map(({ t, href }, k) => ({ "@type": "ListItem", position: k + 1, name: `${t.name}, ${t.state}`, url: abs(href) })) },
    ];
    return {
      lang, path: pathSelf, altPath: es ? "/towns" : "/es/pueblos",
      title: es ? "Pueblos del Merrimack Valley y el sur de NH: guías de bienes raíces | Eduardo Inoa, REALTOR®"
        : "Merrimack Valley & Southern NH towns: real estate guides | Eduardo Inoa, REALTOR®",
      description: es
        ? "Guías de 20 pueblos del Merrimack Valley (MA) y el sur de New Hampshire: tipos de casas, transporte, escuelas y el mercado al día, con Eduardo Inoa, REALTOR® bilingüe."
        : "Guides to 20 towns in the Merrimack Valley (MA) and Southern New Hampshire: housing, commutes, schools and live market data, from bilingual REALTOR® Eduardo Inoa.",
      navCurrent: pathSelf, head: CSS, schema, body,
      foot: { credits: [...new Set(credits)] },
      sitemap: { priority: "0.8", changefreq: "monthly" },
    };
  }

  /* ---------------- assemble ---------------- */
  const out = [indexPage("en"), indexPage("es")];
  TOWNS.forEach((t, i) => {
    out.push(townPage(t, i, "en"));
    if (hasEs(t)) out.push(townPage(t, i, "es"));
  });
  return out;
}
