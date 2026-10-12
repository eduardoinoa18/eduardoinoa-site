// Journal + listings pages (EN + ES):
//   /journal                                   English index of the hand-written posts in /posts/*.html
//   /es/blog                                   Spanish index: the Spanish posts, then the English ones marked "(en inglés)"
//   /es/blog/programas-primer-comprador-ma-nh  Spanish edition of /posts/first-time-buyer-programs-ma-nh
//   /es/blog/cuanto-cuesta-vender-ma-nh        Spanish edition of /posts/what-selling-costs-ma-nh
//   /listings + /es/propiedades                Sends visitors to the live RealScout search; buyer search-help form
//
// Data: tools/data/posts.json (titles, summaries, covers, related reading, town chips),
//       tools/data/recent-sales.json (MLS-verified closed sales only — see tools/data/README.md; empty = section omitted),
//       site.config.json `realscoutAgentId` (the RealScout widget renders only when it is set).
// FACT RULES: the Spanish posts carry the same facts and numbers as the English originals — nothing added.
// Never invent listings, sales, prices or reviews. Fair Housing: describe places and homes, never people.
import fs from "node:fs";
import path from "node:path";
import { ROOT as SITE_ROOT } from "../lib/layout.mjs";

// Spanish town pages exist only for towns with an "es" block in tools/data/towns.json; others link to English.
const ES_TOWN_PAGES = new Set(JSON.parse(fs.readFileSync(path.join(SITE_ROOT, "tools/data/towns.json"), "utf8")).towns.filter((t) => t.es).map((t) => t.slug));
const esTownHref = (t) => (ES_TOWN_PAGES.has(t) ? `/es/pueblos/${t}` : `/towns/${t}`);

const REALSCOUT_URL = "https://eduardoinoa.realscout.me";
const TOWN_SLUGS = ["methuen", "lawrence", "haverhill", "andover", "north-andover", "dracut", "tewksbury", "lowell",
  "tyngsborough", "chelmsford", "westford", "salem-nh", "windham-nh", "pelham-nh"];

export default function journal(ctx) {
  const { ROOT, CONFIG, BASE, IDS, esc, abs, breadcrumb, consent, honeypot } = ctx;
  const LINKS = CONFIG.links, NAP = CONFIG.nap;
  const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/posts.json"), "utf8"));
  const EN = DATA.en, ES = DATA.es, TOWNS = DATA.towns;
  const enBySlug = Object.fromEntries(EN.map((p) => [p.slug, p]));
  const esBySlug = Object.fromEntries(ES.map((p) => [p.slug, p]));

  /* ---------------- photos (degrade gracefully if the manifest changes) ---------------- */
  const all = ctx.photos();
  const ph = (slug, cats = []) => all.find((p) => p.slug === slug) || all.find((p) => cats.includes(p.category) && !p.town) || null;
  const src = (p) => ({
    src: `/img/photos/${p.slug}-1600.webp`,
    set: `/img/photos/${p.slug}-800.webp 800w, /img/photos/${p.slug}-1600.webp 1600w`,
    pos: p.focal && p.focal !== "center" ? ` style="object-position:center ${p.focal}"` : "",
  });
  /** <img> for a manifest photo; alt "" when the image is decorative next to a text title. */
  function pimg(p, { lang = "en", sizes = "100vw", eager = false, alt, cls = "" } = {}) {
    if (!p) return "";
    const s = src(p), a = alt ?? (lang === "es" ? p.alt_es : p.alt_en);
    return `<img${cls ? ` class="${cls}"` : ""} src="${s.src}" srcset="${s.set}" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${esc(a)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${s.pos}>`;
  }
  const imgObj = (p) => (p ? { "@type": "ImageObject", url: `${BASE}/img/photos/${p.slug}-1600.webp`, width: p.w, height: p.h } : undefined);

  /* ---------------- dates ---------------- */
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fmt = (d, lang) => {
    const [y, m, day] = d.split("-").map(Number);
    return lang === "es" ? `${day} de ${MES[m - 1]} de ${y}`
      : new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  };
  const CAT_ES = { Market: "Mercado", Buyers: "Compradores", Investing: "Inversión", Sellers: "Vendedores" };

  /* ---------------- shared styles for these pages (landing.css provides the system) ---------------- */
  const STYLE = `<style>
.jhead{padding:clamp(8px,2vw,16px) 0 clamp(40px,6vw,72px);border-bottom:1px solid var(--line)}
.jhead .crumbs{margin-bottom:clamp(36px,6vw,72px)}
.jhead h1{max-width:16ch}
.jhead .lede{margin-top:22px}
.jhead .aside{margin-top:22px;font-size:15px;color:var(--muted)}
.jhead .aside a{color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:3px}
.jgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(40px,5vw,64px) clamp(20px,2.4vw,32px)}
.jcard{display:flex;flex-direction:column;text-decoration:none;color:var(--ink)}
.jcard .frame{aspect-ratio:3/2}
.jcard .frame:after{inset:8px;border-radius:9px}
.jcard img{transition:transform 1.2s var(--ease)}
.jcard:hover img{transform:scale(1.04)}
.jcard .meta{display:block;margin-top:20px;font-size:14px;color:var(--champagne-ink)}
.jcard .meta:before{content:"";display:inline-block;width:22px;height:1px;background:currentColor;vertical-align:middle;margin-right:10px;opacity:.7}
.jcard h2,.jcard h3{font-size:clamp(25px,2.2vw,30px);font-weight:500;line-height:1.12;margin-top:10px}
.jcard:hover h2,.jcard:hover h3{text-decoration:underline;text-decoration-color:var(--champagne);text-decoration-thickness:1px;text-underline-offset:5px}
.jcard p{font-size:16px;line-height:1.6;color:var(--muted);margin-top:10px}
.jcard .tag{display:inline-block;margin-top:14px;font-size:13px;color:var(--harbor);border:1px solid var(--line);border-radius:999px;padding:4px 12px;align-self:flex-start}
.jcard.lead{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center}
.jcard.lead .frame{aspect-ratio:16/10}
.jcard.lead h2{font-size:clamp(32px,3.4vw,46px);line-height:1.05}
.jcard.lead p{font-size:17px}
@media(max-width:1000px){.jgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.jgrid{grid-template-columns:1fr}.jcard.lead{grid-template-columns:1fr;gap:0}}
.subhead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 24px;border-top:1px solid var(--line);padding-top:22px;margin:clamp(64px,8vw,104px) 0 clamp(28px,4vw,44px)}
.subhead h2{font-size:clamp(30px,3.2vw,42px)}
.subhead p{font-size:15px;color:var(--muted);max-width:52ch}
.band{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px 48px;align-items:end}
.band .btn-row{margin-top:0}
@media(max-width:800px){.band{grid-template-columns:1fr}}
/* Spanish posts */
.post-hero{background:var(--night);color:#fff;padding:clamp(22px,3vw,32px) 0 clamp(88px,10vw,128px)}
.post-hero .crumbs{color:rgba(255,255,255,.6);padding:0;margin-bottom:clamp(36px,5vw,56px)}
.post-hero .crumbs a{color:rgba(255,255,255,.82)}.post-hero .crumbs a:hover{color:#fff}
.post-hero .crumbs li+li:before{color:var(--champagne)}
.post-hero .label{color:var(--champagne)}
.post-hero h1{color:#fff;font-size:clamp(40px,6vw,68px);line-height:1.02}
.post-hero h1 em{font-style:italic;color:var(--champagne)}
.post-hero .lede{color:rgba(255,255,255,.76);margin-top:22px}
.by{display:flex;align-items:center;gap:14px;margin-top:34px;padding-top:24px;border-top:1px solid var(--line-dark);font-size:14px;line-height:1.5;color:rgba(255,255,255,.6)}
.by img{width:48px;height:48px;border-radius:50%;object-fit:cover;object-position:top;box-shadow:0 0 0 2px var(--night),0 0 0 3px var(--champagne)}
.by b{display:block;color:#fff;font-weight:500;font-size:15px}
.by a{margin-left:auto;color:rgba(255,255,255,.82);text-decoration-color:var(--champagne);text-underline-offset:3px;min-height:44px;display:inline-flex;align-items:center}
.cover{margin:-64px auto 0;max-width:1000px;padding:0 var(--gut)}
.cover .frame{box-shadow:0 40px 80px -40px rgba(6,26,48,.5)}
.cover .frame img{aspect-ratio:16/9}
.cover figcaption{text-align:right}
.post{padding-top:clamp(48px,6vw,88px);padding-bottom:clamp(48px,6vw,72px);font-size:18px}
.post>p:first-of-type{font-size:1.1em;color:var(--ink)}
.post h2{font-size:clamp(30px,3.4vw,42px);margin:52px 0 16px}
.post h3{margin:34px 0 10px}
.post p{color:#2A3644}
.post ol,.post ul{padding-left:1.3em;margin:0 0 24px}.post li{margin-bottom:10px}
.post li::marker{color:var(--champagne-ink)}
.post strong{color:var(--harbor);font-weight:600}
.post blockquote{font:italic 500 clamp(26px,2.6vw,32px)/1.25 var(--hf);color:var(--harbor);border-left:1px solid var(--champagne);padding:4px 0 4px 28px;margin:44px 0}
.post .tw{overflow-x:auto;border:1px solid var(--line);border-radius:14px;margin:0 0 28px;background:var(--paper)}
.post table{width:100%;border-collapse:collapse;font-size:16px}
.post th,.post td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--hair);vertical-align:top}
.post tr:last-child td{border-bottom:0}
.post th{font:500 14px/1.4 var(--bf);color:var(--champagne-ink)}
.post .box{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:28px 30px;margin:36px 0;font-size:17px;color:#2A3644}
.post .box:before{content:"";position:absolute;inset:6px;border:1px solid rgba(201,174,124,.45);border-radius:13px;pointer-events:none}
.post .area{margin:48px 0 0;padding-top:28px;border-top:1px solid var(--line)}
.post .chips a{min-height:44px;display:inline-flex;align-items:center}
.post-cta{position:relative;background:var(--night);color:#fff;border-radius:22px;padding:clamp(30px,4vw,48px);margin:48px 0 0}
.post-cta:before{content:"";position:absolute;inset:8px;border:1px solid rgba(201,174,124,.4);border-radius:16px;pointer-events:none}
.post-cta h2{color:#fff;margin:0}.post-cta h2 em{font-style:italic;color:var(--champagne)}
.post-cta p{color:rgba(255,255,255,.76);margin-top:14px}
.post-cta .btn-row{position:relative;margin-top:22px}
.post .disclaimer{margin-top:28px}
.related{background:var(--stone)}
@media(max-width:600px){.cover{margin-top:-48px}.post{font-size:17px}.post blockquote{padding-left:20px}.post .box{padding:24px 22px}.by a{margin-left:0}.by{flex-wrap:wrap}}
/* listings */
.ls-hero .wrap{padding-top:clamp(96px,14vw,160px)}
.ls-hero h1{max-width:15ch}
.ls-hero>img{object-position:center 78%}
.ls-hero:after{background:linear-gradient(180deg,rgba(6,26,48,.55) 0%,rgba(6,26,48,.5) 40%,rgba(6,26,48,.92) 100%)}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:clamp(32px,4vw,48px)}
.trio .frame{aspect-ratio:4/5}
@media(max-width:800px){.trio{grid-template-columns:1fr 1fr}.trio>:last-child{display:none}}
.widget{margin-top:28px;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:clamp(16px,2vw,24px)}
realscout-simple-search{display:block;width:100%}
.sales{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:28px 20px}
.sale{border-top:1px solid var(--line);padding-top:18px}
.sale .frame{aspect-ratio:3/2;margin-bottom:16px}
.sale b{display:block;font:600 24px/1.15 var(--hf);color:var(--harbor)}
.sale span{display:block;font-size:14px;color:var(--muted);margin-top:4px}
.form-split{align-items:start}
.form-split .frame{aspect-ratio:3/2;margin-top:32px}
.checks{list-style:none;margin-top:24px;border-top:1px solid var(--line-dark)}
.checks li{padding:12px 0 12px 26px;border-bottom:1px solid var(--line-dark);position:relative}
.checks li:before{content:"";position:absolute;left:2px;top:23px;width:10px;height:1px;background:var(--champagne)}
</style>`;

  /* ---------------- building blocks ---------------- */
  const crumbs = (items, label) => `<nav class="crumbs" aria-label="${label}"><ol>${items.map(([n, u], i) =>
    i === items.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join("")}</ol></nav>`;

  /** Card for an index grid. post = EN or ES entry; view = language of the page showing it. */
  function card(post, view, { lead = false, heading = "h2" } = {}) {
    const isEs = !!post.enSlug, foreign = view === "es" && !isEs;
    const p = ph(post.cover, ["home", "interior", "lifestyle"]);
    const cat = view === "es" && !isEs ? CAT_ES[post.category] || post.category : post.category;
    const summary = foreign ? (post.summaryEs || post.summary) : post.summary;
    const tag = view === "en" && post.esPath ? `<span class="tag" lang="es">También en español</span>` : "";
    return `<a class="jcard${lead ? " lead" : ""}" href="${post.path}"${foreign ? ' hreflang="en"' : ""}>
  <div class="frame">${pimg(p, { alt: "", sizes: lead ? "(max-width:700px) 100vw, 640px" : "(max-width:700px) 100vw, (max-width:1000px) 50vw, 380px", eager: lead })}</div>
  <div class="tx">
    <span class="meta">${esc(cat)} · <time datetime="${post.date}">${fmt(post.date, view)}</time></span>
    <${heading}${foreign ? ' lang="en"' : ""}>${esc(post.title)}${foreign ? ` <span lang="es" class="en-hint">(en inglés)</span>` : ""}</${heading}>
    <p${foreign && !post.summaryEs ? ' lang="en"' : ""}>${esc(summary)}</p>${tag}
  </div>
</a>`;
  }
  const cardTitle = (post, view) => (view === "es" && !post.enSlug ? `${post.title} (en inglés)` : post.title);

  const blogNode = (lang, posts) => ({
    "@type": "Blog", "@id": `${BASE}${lang === "es" ? "/es/blog" : "/journal"}#blog`, url: `${BASE}${lang === "es" ? "/es/blog" : "/journal"}`,
    name: lang === "es" ? "Eduardo Inoa — Blog" : "Eduardo Inoa — Journal", inLanguage: lang === "es" ? "es-US" : "en-US",
    author: { "@id": IDS.person }, publisher: { "@id": IDS.agent },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", "@id": `${BASE}${p.path}#post`, url: `${BASE}${p.path}`, headline: p.title,
      datePublished: p.date, inLanguage: p.enSlug ? "es-US" : "en-US", image: imgObj(ph(p.cover)) })),
  });
  const itemList = (id, name, posts, view) => ({
    "@type": "ItemList", "@id": id, name, itemListOrder: "https://schema.org/ItemListOrderDescending", numberOfItems: posts.length,
    itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}${p.path}`, name: cardTitle(p, view) })),
  });

  const pages = [];

  /* ================= /journal ================= */
  {
    const posts = EN;
    pages.push({
      lang: "en", path: "/journal", altPath: "/es/blog", navCurrent: "/#journal",
      title: "Journal — notes on buying, selling and investing | Eduardo Inoa, REALTOR®",
      description: "Plain-language notes from Eduardo Inoa, REALTOR®, on buying, selling and investing in the Merrimack Valley and Southern New Hampshire: programs, costs, market data and strategy.",
      ogImage: `/img/photos/${posts[0].cover}-1600.webp`,
      head: STYLE,
      sitemap: { priority: "0.7", changefreq: "weekly" },
      schema: [
        blogNode("en", posts),
        itemList(`${BASE}/journal#posts`, "Journal notes", posts, "en"),
        breadcrumb([["Home", "/"], ["Journal", "/journal"]]),
      ],
      foot: { credits: [...new Set(posts.map((p) => p.cover))].filter((s) => ph(s)) },
      body: `<section class="jhead"><div class="wrap">
  ${crumbs([["Home", "/"], ["Journal", "/journal"]], "Breadcrumb")}
  <span class="label">Journal</span>
  <h1>Worth knowing, <em>explained plainly.</em></h1>
  <p class="lede">Short notes on buying, selling and investing in the Merrimack Valley and Southern New Hampshire — in English and Spanish.</p>
  <p class="aside"><a href="/es/blog" hreflang="es" lang="es">Leer en español</a> — two notes are also published in Spanish.</p>
</div></section>
<section class="section tight"><div class="wrap">
  <div class="jgrid">
${posts.map((p, i) => card(p, "en", { lead: i === 0 })).join("\n")}
  </div>
</div></section>
<section class="section tight paper"><div class="wrap band">
  <div><span class="label">Ask a question</span><h2>Have a question <em>that isn't here?</em></h2><p class="lede" style="margin-top:16px">Ask me directly. I reply personally, usually the same day — in English or Spanish.</p></div>
  <div class="btn-row"><a class="btn btn-primary" href="${LINKS.book}" target="_blank" rel="noopener">Book a call</a><a class="btn btn-ghost" href="sms:${NAP.tel}">Text me</a></div>
</div></section>`,
    });
  }

  /* ================= /es/blog ================= */
  {
    const enOnly = EN.filter((p) => !p.esPath);
    const visible = [...ES, ...enOnly];
    pages.push({
      lang: "es", path: "/es/blog", altPath: "/journal", navCurrent: "/es/#journal",
      title: "Blog — comprar, vender e invertir, explicado | Eduardo Inoa, REALTOR®",
      description: "Notas claras de Eduardo Inoa, REALTOR® bilingüe, sobre comprar, vender e invertir en Merrimack Valley y el sur de New Hampshire: programas, costos, datos del mercado y estrategia.",
      ogImage: `/img/photos/${ES[0].cover}-1600.webp`,
      head: STYLE + `<style>.en-hint{font-family:var(--bf);font-size:.55em;font-weight:400;color:var(--muted);letter-spacing:0;white-space:nowrap}</style>`,
      sitemap: { priority: "0.7", changefreq: "weekly" },
      schema: [
        blogNode("es", ES),
        itemList(`${BASE}/es/blog#posts`, "Notas del blog", visible, "es"),
        breadcrumb([["Inicio", "/es/"], ["Blog", "/es/blog"]]),
      ],
      foot: { credits: [...new Set(visible.map((p) => p.cover))].filter((s) => ph(s)) },
      body: `<section class="jhead"><div class="wrap">
  ${crumbs([["Inicio", "/es/"], ["Blog", "/es/blog"]], "Ruta de navegación")}
  <span class="label">Blog</span>
  <h1>Lo que vale la pena saber, <em>explicado con claridad.</em></h1>
  <p class="lede">Notas cortas sobre comprar, vender e invertir en Merrimack Valley y el sur de New Hampshire — en español y en inglés.</p>
</div></section>
<section class="section tight"><div class="wrap">
  <div class="jgrid">
${ES.map((p, i) => card(p, "es", { lead: i === 0 })).join("\n")}
  </div>
  <div class="subhead"><h2>Notas en inglés</h2><p>Por ahora estas notas están solo en inglés. Si prefiere conversarlas en español, escríbame y se las explico con gusto.</p></div>
  <div class="jgrid">
${enOnly.map((p) => card(p, "es", { heading: "h3" })).join("\n")}
  </div>
</div></section>
<section class="section tight paper"><div class="wrap band">
  <div><span class="label">Pregúnteme</span><h2>¿Tiene una pregunta <em>que no está aquí?</em></h2><p class="lede" style="margin-top:16px">Pregúnteme directamente. Le respondo personalmente, normalmente el mismo día — en español o en inglés.</p></div>
  <div class="btn-row"><a class="btn btn-primary" href="${LINKS.book}" target="_blank" rel="noopener">Reservar una llamada</a><a class="btn btn-ghost" href="sms:${NAP.tel}">Enviarme un texto</a></div>
</div></section>`,
    });
  }

  /* ================= Spanish posts ================= */
  const ES_BODIES = {
    "programas-primer-comprador-ma-nh": {
      h1: "Programas para comprar su primera casa en Massachusetts y New Hampshire, <em>explicados.</em>",
      metaTitle: "Programas para comprar su primera casa en MA y NH, explicados | Eduardo Inoa, REALTOR®",
      cta: { toolkit: true },
      html: `<p>La mayoría de las personas que compran su primera casa en Merrimack Valley y el sur de New Hampshire creen que necesitan el 20% de pago inicial. No es así. Entre los programas estatales, FHA y una opción convencional más reciente, la verdadera pregunta es qué camino se ajusta a sus ingresos, su crédito y la casa que usted quiere — no si existe un camino. Este es el mapa que dibujo con mis clientes en la primera reunión.</p>
<h2>Las cuatro puertas</h2>
<h3>1. MassHousing y ONE Mortgage (Massachusetts)</h3>
<p>Massachusetts tiene dos programas para compradores de primera vivienda que vale la pena conocer por su nombre. Los préstamos de <strong>MassHousing</strong> vienen con pagos iniciales bajos, tasas por debajo del mercado y, en muchos casos, asistencia para el pago inicial que se suma a la hipoteca. <strong>ONE Mortgage</strong> (a través de Massachusetts Housing Partnership) es un préstamo a tasa fija de 30 años con un pago inicial bajo, sin seguro hipotecario privado y con un subsidio de intereses para los hogares que califican. Ambos tienen límites de ingresos que varían según el pueblo, y ambos exigen una clase de educación para compradores de primera vivienda — planifique la clase con tiempo; es el paso que con más frecuencia retrasa una oferta.</p>
<h3>2. New Hampshire Housing (New Hampshire)</h3>
<p>Al otro lado de la frontera, <strong>New Hampshire Housing</strong> ofrece sus propios programas para primeros compradores, incluidas opciones que ya traen asistencia para el pago inicial y los costos de cierre. Los límites de ingresos y de precio de compra suelen ser más accesibles de lo que la gente espera, y Salem, Nashua, Derry y Londonderry quedan dentro de esos límites para muchos hogares.</p>
<h3>3. FHA</h3>
<p>El préstamo federal FHA permite un pago inicial de 3.5% con requisitos de crédito flexibles. Con ese pago inicial, lleva seguro hipotecario durante toda la vida del préstamo; ese es el costo a cambio. Su ventaja menos conocida: funciona para <strong>casas de dos a cuatro familias</strong> cuando usted vive en una de las unidades — y así es como muchos de mis clientes compran su primera inversión y su primera casa en el mismo cierre.</p>
<h3>4. Convencional con 3% o 5% de pago inicial</h3>
<p>Los préstamos convencionales ahora permiten un 3% de pago inicial a quienes compran por primera vez una casa unifamiliar, y un 5% en propiedades de dos a cuatro unidades donde vive el dueño. Se aplica seguro hipotecario, pero <em>se elimina</em> cuando usted llega al 20% de equidad en la casa — por eso los compradores con mejor crédito a menudo terminan aquí en lugar de en FHA.</p>
<h2>Lo que de verdad significa “asistencia”</h2>
<p>La asistencia para el pago inicial rara vez es un regalo. Por lo general es un segundo préstamo — a veces al 0% con los pagos diferidos, a veces perdonado después de cierta cantidad de años viviendo en la casa, a veces se devuelve cuando usted vende. Ninguna de esas opciones es mala. Son simplemente condiciones, y usted debe saber cuál está firmando. Hágale tres preguntas a cualquier programa: ¿Se perdona, se difiere o se devuelve? ¿Limita cuándo puedo vender o refinanciar? ¿Exige que la casa sea mi residencia principal, y por cuánto tiempo?</p>
<h2>El orden de los pasos</h2>
<ol>
<li><strong>Primero, la preaprobación, con un prestamista que conozca estos programas.</strong> No todos los oficiales de préstamos trabajan expedientes de MassHousing o de NH Housing. Yo tengo una lista corta de los que sí.</li>
<li><strong>Calcule el pago mensual real.</strong> Capital, intereses, impuestos, seguro, seguro hipotecario y — en los condominios — la cuota. Mi herramienta de poder de compra lo calcula para cada pueblo del toolkit, para que usted vea el pago antes de enamorarse de una cocina.</li>
<li><strong>Tome la clase de educación</strong> si su programa la exige. Muchas son en línea y se terminan en un fin de semana.</li>
<li><strong>Guarde dinero para el cierre.</strong> Aun con asistencia, va a necesitar dinero para la inspección de la casa, la tasación y el primer año del seguro. Inclúyalo en su presupuesto desde el principio.</li>
</ol>
<div class="box"><span class="label">Vale la pena saber</span>Los límites de los programas, las tasas y los montos de asistencia cambian — a menudo cada año. Todo lo anterior describe cómo funcionan los programas; las cifras exactas para su hogar salen de la hoja vigente del prestamista, que revisaré con usted antes de hacer una oferta.</div>
<blockquote>El pago inicial rara vez es la pared que la gente imagina. La verdadera conversación es el pago mensual — y por ahí empezamos.</blockquote>`,
    },
    "cuanto-cuesta-vender-ma-nh": {
      h1: "Lo que realmente cuesta vender su casa en <em>Massachusetts y New Hampshire.</em>",
      metaTitle: "Lo que realmente cuesta vender su casa en MA y NH | Eduardo Inoa, REALTOR®",
      cta: { toolkit: true },
      html: `<p>La pregunta que más me hacen los vendedores no es “¿cuánto vale mi casa?” — es “¿cuánto me voy a quedar en realidad?”. La respuesta es el precio de venta menos una lista corta de costos. Aquí está esa lista, para que nada en su hoja de cierre sea una sorpresa.</p>
<h2>1. Pagar lo que usted debe</h2>
<p>El saldo de su hipoteca, cualquier línea de crédito sobre la casa (home equity) y un pequeño cargo del prestamista por la cancelación. La carta de saldo (payoff) se pide antes del cierre, y los intereses corren hasta el día del cierre — así que la cifra es un poco más alta que su último estado de cuenta.</p>
<h2>2. Comisión</h2>
<p>Mi comisión como agente del vendedor es negociable y queda por escrito antes de salir al mercado. Aparte, usted decide si ofrece compensación al agente del comprador. Ofrecerla normalmente amplía el grupo de compradores; es su decisión, y la conversamos con números reales antes de que usted firme cualquier cosa.</p>
<h2>3. Sellos estatales de transferencia</h2>
<div class="tw"><table><tr><th>Estado</th><th>Quién paga</th><th>Cuánto</th></tr>
<tr><td>Massachusetts</td><td>El vendedor</td><td>$4.56 por cada $1,000 del precio de venta (unos $2,280 en una venta de $500,000)</td></tr>
<tr><td>New Hampshire</td><td>Dividido entre comprador y vendedor</td><td>$15 por cada $1,000 en total — $7.50 por cada $1,000 de cada parte</td></tr></table></div>
<h2>4. Abogado, prorrateos y las líneas pequeñas</h2>
<ul>
<li><strong>Su abogado</strong> prepara la escritura y deja el título en orden. Calcule desde unos cientos hasta alrededor de mil dólares, según el caso.</li>
<li><strong>Prorrateos:</strong> los impuestos a la propiedad, el agua y el alcantarillado, y las cuotas de condominio se dividen hasta la fecha de cierre. A veces le regresan a usted como un crédito.</li>
<li><strong>Certificado de detectores de humo y de monóxido de carbono</strong> (Massachusetts), la lectura final del agua y los cargos de registro.</li>
</ul>
<h2>Cómo se ve en una venta real</h2>
<p>En una venta de $500,000 en Massachusetts con un saldo de hipoteca de $300,000, el vendedor típico se queda con algo entre $165,000 y $175,000 después de todo lo anterior — la cifra exacta depende de la comisión que usted acuerde y de lo que negocie el comprador. La herramienta de ganancia neta de mi presentación para vendedores muestra cada una de estas líneas con sus propios números, y le entrego una hoja de ganancia neta por escrito antes de poner su casa a la venta.</p>
<blockquote>El precio lo dice el mercado. La ganancia neta es lo que usted se queda. Planificamos para lo segundo.</blockquote>`,
    },
  };

  for (const post of ES) {
    const en = enBySlug[post.enSlug], body = ES_BODIES[post.slug];
    if (!en || !body) throw new Error(`journal.mjs: missing English original or body for ${post.slug}`);
    const p = ph(post.cover, ["home", "interior", "lifestyle"]);
    const url = `${BASE}${post.path}`;
    const related = post.related.map((s) => esBySlug[s] || enBySlug[s]).filter(Boolean);
    const chips = post.towns.length
      ? `<div class="area"><span class="label">Pueblos en esta nota</span><div class="chips">${post.towns.map((t) => `<a href="${esTownHref(t)}">${esc(TOWNS[t])}</a>`).join("")}<a href="/es/pueblos">Todos los pueblos</a></div></div>`
      : `<div class="area"><span class="label">Conozca la zona</span><div class="chips"><a href="/es/pueblos">Todos los pueblos donde trabajo en Massachusetts y New Hampshire</a></div></div>`;
    pages.push({
      lang: "es", path: post.path, altPath: en.path, navCurrent: "/es/#journal",
      title: body.metaTitle, description: post.summary,
      ogImage: p ? `/img/photos/${p.slug}-1600.webp` : undefined,
      head: STYLE + `<meta property="article:published_time" content="${post.date}"><meta name="author" content="Eduardo Inoa"><style>.en-hint{font-size:.7em;color:var(--muted);font-family:var(--bf)}</style>`,
      sitemap: { priority: "0.7", changefreq: "monthly" },
      schema: [
        {
          "@type": "BlogPosting", "@id": `${url}#post`, mainEntityOfPage: url, url,
          headline: post.title, description: post.summary, datePublished: post.date, dateModified: post.date, inLanguage: "es-US",
          image: imgObj(p), author: { "@id": IDS.person }, publisher: { "@id": IDS.agent },
          isPartOf: { "@type": "Blog", "@id": `${BASE}/es/blog#blog`, name: "Eduardo Inoa — Blog", url: `${BASE}/es/blog` },
          translationOfWork: { "@id": `${BASE}${en.path}#post` },
          ...(post.towns.length ? { about: post.towns.map((t) => ({ "@type": "City", name: TOWNS[t].includes(",") ? TOWNS[t] : `${TOWNS[t]}, MA` })) } : {}),
        },
        breadcrumb([["Inicio", "/es/"], ["Blog", "/es/blog"], [post.crumb, post.path]]),
      ],
      foot: { credits: [...new Set([post.cover, ...related.map((r) => r.cover)])].filter((s) => ph(s)) },
      body: `<header class="post-hero"><div class="wrap narrow">
  ${crumbs([["Inicio", "/es/"], ["Blog", "/es/blog"], [post.crumb, post.path]], "Ruta de navegación")}
  <span class="label">${esc(post.category)} · <time datetime="${post.date}">${fmt(post.date, "es")}</time></span>
  <h1>${body.h1}</h1>
  <p class="lede">${esc(post.summary)}</p>
  <div class="by"><img src="/img/eduardo-avatar.webp" alt="Eduardo Inoa" width="96" height="96"><div><b>Eduardo Inoa, REALTOR®</b>The Fermin Group · Century 21 North East</div><a href="${en.path}" hreflang="en" lang="en">Read in English</a></div>
</div></header>
${p ? `<figure class="cover"><div class="frame">${pimg(p, { lang: "es", eager: true, sizes: "(max-width:1000px) 100vw, 1000px" })}</div><figcaption class="credit">${p.credit_html}</figcaption></figure>` : ""}
<article class="post wrap narrow">
${body.html}
${chips}
<div class="post-cta">
  <h2>¿Tiene una pregunta sobre <em>su</em> situación?</h2>
  <p>Le respondo personalmente, normalmente el mismo día. O haga los números usted mismo en el toolkit.</p>
  <div class="btn-row"><a class="btn btn-gold" href="${LINKS.book}" target="_blank" rel="noopener">Reservar 20 minutos</a><a class="btn btn-ghost" href="/buyers#toolkit">Abrir el toolkit</a><a class="btn btn-ghost" href="sms:${NAP.tel}">Enviarme un texto</a></div>
</div>
<p class="disclaimer">Esta nota es información general, no asesoría legal, fiscal ni financiera, y no es una tasación ni una aprobación de préstamo. Cada situación es diferente — hablemos de la suya.</p>
</article>
<section class="section tight related" aria-labelledby="rel-h"><div class="wrap">
  <span class="label">Lecturas relacionadas</span><h2 id="rel-h" style="margin-bottom:clamp(28px,4vw,44px)">Siga leyendo</h2>
  <div class="jgrid">
${related.map((r) => card(r, "es", { heading: "h3" })).join("\n")}
  </div>
  <p style="margin-top:32px"><a href="/es/blog" style="color:var(--harbor);font-weight:500;text-decoration-color:var(--champagne);text-underline-offset:4px">Todas las notas del blog</a></p>
</div></section>`,
    });
  }

  /* ================= /listings + /es/propiedades ================= */
  const agentId = String(CONFIG.realscoutAgentId || "").trim();
  const salesFile = path.join(ROOT, "tools/data/recent-sales.json");
  const salesRaw = fs.existsSync(salesFile) ? JSON.parse(fs.readFileSync(salesFile, "utf8")) : [];
  // Only MLS-verified closings are shown; the address only with the client's OK (tools/data/README.md).
  const sales = (Array.isArray(salesRaw) ? salesRaw : []).filter((s) => {
    const ok = s && s.town && s.state && Number(s.price) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.closeDate || "") && s.mlsSource;
    if (!ok) console.warn("journal.mjs: skipping recent-sales entry without MLS price/date/source:", JSON.stringify(s));
    return ok;
  }).sort((a, b) => b.closeDate.localeCompare(a.closeDate));

  function listings(lang) {
    const es = lang === "es";
    const T = (en, sp) => (es ? sp : en);
    const hero = ph("aerial-neighborhood-autumn", ["aerial", "season"]);
    const room = ph("interior-living-room-fireplace", ["interior"]);
    const kitchen = ph("interior-kitchen-classic-white", ["interior"]);
    const foyer = ph("interior-foyer-staircase", ["interior"]);
    const used = [hero, room, kitchen, foyer].filter(Boolean);
    const townHref = (t) => (es ? esTownHref(t) : `/towns/${t}`);
    const money = (n) => "$" + Math.round(Number(n)).toLocaleString("en-US");
    const side = { seller: T("Represented the seller", "Representé al vendedor"), buyer: T("Represented the buyer", "Representé al comprador"), both: T("Represented the seller and the buyer", "Representé al vendedor y al comprador") };

    const salesSection = sales.length ? `<section class="section paper" id="recent-sales"><div class="wrap">
  <div class="head"><div><span class="label">${T("Recent sales", "Ventas recientes")}</span><h2>${T("Closed, <em>recently.</em>", "Cerradas <em>recientemente.</em>")}</h2></div>
  <p class="lede">${T("Prices and closing dates are taken from MLS records. Street addresses appear only with the client's permission.", "Los precios y las fechas de cierre provienen de los registros del MLS. Las direcciones aparecen solo con el permiso del cliente.")}</p></div>
  <div class="sales">${sales.map((s) => {
    const sp = s.photo && !s.photo.startsWith("/") ? ph(s.photo) : null;
    const pic = sp ? `<div class="frame">${pimg(sp, { lang, alt: "", sizes: "(max-width:700px) 100vw, 380px" })}</div>`
      : s.photo && s.photo.startsWith("/img/") ? `<div class="frame"><img src="${esc(s.photo)}" alt="" loading="lazy" decoding="async"></div>` : "";
    const where = s.addressOk && s.address ? `${esc(s.address)}, ${esc(s.town)}, ${esc(s.state)}` : `${esc(s.town)}, ${esc(s.state)}`;
    return `<div class="sale">${pic}<b>${where}</b><span>${money(s.price)} · ${T("closed", "cerró el")} ${fmt(s.closeDate, lang)}</span><span>${side[s.side] || ""}${s.propertyType ? " · " + esc(s.propertyType) : ""}</span><span>${T("Source", "Fuente")}: ${esc(s.mlsSource)}${s.mlsNumber ? " #" + esc(s.mlsNumber) : ""}</span></div>`;
  }).join("")}</div>
</div></section>` : "";

    const widget = agentId ? `<div class="widget"><realscout-simple-search agent-encoded-id="${esc(agentId)}"></realscout-simple-search></div>` : "";
    const disclaimer = T(
      `The live home search is provided by RealScout; listing information comes from the MLS and is deemed reliable but not guaranteed. Photos on this page show New England homes and interiors in general — they are not listings for sale.`,
      `La búsqueda en vivo la ofrece RealScout; la información de las propiedades proviene del MLS y se considera confiable, pero no está garantizada. Las fotos de esta página muestran casas e interiores de Nueva Inglaterra en general — no son propiedades a la venta.`);
    const crumbItems = es ? [["Inicio", "/es/"], ["Propiedades", "/es/propiedades"]] : [["Home", "/"], ["Listings", "/listings"]];

    const budget = es
      ? [["", "Elija un rango"], ["Menos de $400,000", "Menos de $400,000"], ["$400,000–$600,000", "$400,000–$600,000"], ["$600,000–$800,000", "$600,000–$800,000"], ["Más de $800,000", "Más de $800,000"], ["Todavía no sé", "Todavía no sé"]]
      : [["", "Choose a range"], ["Under $400,000", "Under $400,000"], ["$400,000–$600,000", "$400,000–$600,000"], ["$600,000–$800,000", "$600,000–$800,000"], ["Over $800,000", "Over $800,000"], ["Not sure yet", "Not sure yet"]];
    const timing = es
      ? [["", "Elija un plazo"], ["0–3 meses", "En los próximos 3 meses"], ["3–6 meses", "En 3 a 6 meses"], ["6–12 meses", "En 6 a 12 meses"], ["Solo mirando", "Solo estoy mirando"]]
      : [["", "Choose a timeframe"], ["0–3 months", "Within 3 months"], ["3–6 months", "In 3–6 months"], ["6–12 months", "In 6–12 months"], ["Just looking", "Just looking"]];
    const opts = (list) => list.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");

    return {
      lang, path: es ? "/es/propiedades" : "/listings", altPath: es ? "/listings" : "/es/propiedades",
      title: T("Homes for sale — live search, bilingual help | Eduardo Inoa, REALTOR®", "Casas a la venta — búsqueda en vivo, ayuda bilingüe | Eduardo Inoa, REALTOR®"),
      description: T("Browse homes for sale on Eduardo Inoa's live home search, then get bilingual help touring, comparing and writing the offer in the Merrimack Valley and Southern New Hampshire.",
        "Vea casas a la venta en la búsqueda en vivo de Eduardo Inoa y reciba ayuda en español para visitarlas, compararlas y hacer la oferta en Merrimack Valley y el sur de New Hampshire."),
      ogImage: hero ? `/img/photos/${hero.slug}-1600.webp` : undefined,
      head: STYLE + (agentId ? `<script src="https://em.realscout.com/widgets/realscout-web-components.umd.js" type="module"></script>` : ""),
      sitemap: { priority: "0.8", changefreq: "weekly" },
      schema: [
        breadcrumb(crumbItems),
        { "@type": "Service", "@id": `${BASE}${es ? "/es/propiedades" : "/listings"}#service`, serviceType: T("Home search and buyer representation", "Búsqueda de casas y representación de compradores"),
          provider: { "@id": IDS.agent }, areaServed: [{ "@type": "Place", name: "Merrimack Valley, Massachusetts" }, { "@type": "Place", name: "Southern New Hampshire" }],
          availableLanguage: ["English", "Spanish"], url: `${BASE}${es ? "/es/propiedades" : "/listings"}` },
      ],
      foot: { disclaimer, credits: used.map((p) => p.slug) },
      body: `<section class="hero ls-hero on-dark">
  ${hero ? pimg(hero, { lang, eager: true, alt: "" }) : ""}
  <div class="wrap">
    ${crumbs(crumbItems, es ? "Ruta de navegación" : "Breadcrumb")}
    <span class="label" style="margin-top:28px">${T("Home search", "Búsqueda de casas")}</span>
    <h1>${T("Find the home. <em>I'll handle the rest.</em>", "Encuentre la casa. <em>Yo me encargo del resto.</em>")}</h1>
    <p class="lede">${T("Browse current listings on my live home search. When something catches your eye, I'll set up the tour, pull the history and help you write a strong offer — in English or Spanish.",
      "Vea las propiedades disponibles en mi búsqueda en vivo. Cuando algo le guste, yo coordino la visita, reviso el historial de la casa y le ayudo a hacer una oferta sólida — en español o en inglés.")}</p>
    <div class="btn-row"><a class="btn btn-gold" href="${REALSCOUT_URL}" target="_blank" rel="noopener">${T("Open the live home search", "Abrir la búsqueda en vivo")}</a><a class="btn btn-ghost" href="#search-help">${T("Ask for search help", "Pedir ayuda con la búsqueda")}</a></div>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="split">
    <div class="arch">${pimg(room, { lang, sizes: "(max-width:900px) 90vw, 480px", alt: "" })}</div>
    <div>
      <span class="label">${T("How I help", "Cómo le ayudo")}</span>
      <h2>${T("The search is the easy part. <em>Knowing what you're looking at</em> is the work.", "Buscar es lo fácil. <em>Saber lo que está viendo</em> es el trabajo.")}</h2>
      <ol class="steps" style="margin-top:36px">
        <li><b>${T("Search", "Busque")}</b><p>${T("Browse current listings on my live search and save the homes you'd like to see.", "Vea las propiedades disponibles en mi búsqueda en vivo y guarde las que le gustaría visitar.")}</p></li>
        <li><b>${T("Shortlist", "Escoja")}</b><p>${T("Send me the addresses. I'll pull the sale history, the taxes and the real monthly payment for each one.", "Envíeme las direcciones. Le preparo el historial de ventas, los impuestos y el pago mensual real de cada una.")}</p></li>
        <li><b>${T("Tour and offer", "Visite y ofrezca")}</b><p>${T("We tour together and write an offer built on the comparable sales, not on guesswork.", "Visitamos juntos y hacemos una oferta basada en las ventas comparables, no en suposiciones.")}</p></li>
      </ol>
      <div class="btn-row"><a class="btn btn-primary" href="${REALSCOUT_URL}" target="_blank" rel="noopener">${T("Start searching", "Empezar a buscar")}</a></div>
      ${widget}
    </div>
  </div>
</div></section>

<section class="section stone"><div class="wrap">
  <div class="head"><div><span class="label">${T("Explore the area", "Conozca la zona")}</span><h2>${T("Know the towns <em>before you tour.</em>", "Conozca los pueblos <em>antes de visitar.</em>")}</h2></div>
  <p class="lede">${T("Market numbers, commute notes and what each town is like — so the search starts in the right places.", "Datos del mercado, el trayecto al trabajo y cómo es cada pueblo — para que la búsqueda empiece en los lugares correctos.")}</p></div>
  <div class="chips">${TOWN_SLUGS.map((t) => `<a href="${townHref(t)}">${esc(TOWNS[t])}</a>`).join("")}<a href="${es ? "/es/pueblos" : "/towns"}">${T("All towns", "Todos los pueblos")}</a></div>
  <div class="trio">
    <figure class="frame">${pimg(kitchen, { lang, sizes: "(max-width:800px) 50vw, 380px", alt: "" })}</figure>
    <figure class="frame">${pimg(foyer, { lang, sizes: "(max-width:800px) 50vw, 380px", alt: "" })}</figure>
    <figure class="frame">${pimg(room, { lang, sizes: "380px", alt: "" })}</figure>
  </div>
  <p class="credit">${T("Photos show New England homes in general, not homes for sale.", "Las fotos muestran casas de Nueva Inglaterra en general, no propiedades a la venta.")}</p>
</div></section>
${salesSection}
<section class="section dark" id="search-help"><div class="wrap split form-split">
  <div class="on-dark">
    <span class="label">${T("Search help", "Ayuda con la búsqueda")}</span>
    <h2>${T("Tell me what you're looking for. <em>I'll do the digging.</em>", "Dígame qué busca. <em>Yo hago la investigación.</em>")}</h2>
    <p class="lede" style="margin-top:20px">${T("The towns, the budget and the must-haves. I'll reply personally — usually the same day — with what's out there and what's worth seeing.", "Los pueblos, el presupuesto y lo que no puede faltar. Le respondo personalmente — normalmente el mismo día — con lo que hay disponible y lo que vale la pena ver.")}</p>
    <ul class="checks">
      <li>${T("A search set up around your towns and budget", "Una búsqueda preparada según sus pueblos y su presupuesto")}</li>
      <li>${T("The real monthly payment, not just the price", "El pago mensual real, no solo el precio")}</li>
      <li>${T("Help with first-time buyer programs and multi-family loans", "Ayuda con los programas para primeros compradores y préstamos para multifamiliares")}</li>
    </ul>
  </div>
  <form class="form" data-lead data-source="website" data-type="buyer" data-label="Listings page — search help" novalidate>
    <div class="fields">
      <h3>${T("Get search help", "Pida ayuda con su búsqueda")}</h3>
      <p class="sub">${T("Takes a minute. No obligation.", "Toma un minuto. Sin compromiso.")}</p>
      <div class="field"><label for="ls-name">${T("Name", "Nombre")}</label><input id="ls-name" name="name" type="text" autocomplete="name" required></div>
      <div class="row2">
        <div class="field"><label for="ls-phone">${T("Phone", "Teléfono")}</label><input id="ls-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
        <div class="field"><label for="ls-email">Email</label><input id="ls-email" name="email" type="email" autocomplete="email"></div>
      </div>
      <div class="field"><label for="ls-town">${T("Town you're most interested in", "El pueblo que más le interesa")}</label><select id="ls-town" name="town" data-towns><option value="">${T("Choose a town", "Elija un pueblo")}</option></select></div>
      <div class="row2">
        <div class="field"><label for="ls-budget">${T("Budget", "Presupuesto")}</label><select id="ls-budget" data-detail="Budget">${opts(budget)}</select></div>
        <div class="field"><label for="ls-when">${T("Timeframe", "Plazo")}</label><select id="ls-when" data-detail="Timeframe">${opts(timing)}</select></div>
      </div>
      <div class="field"><span id="ls-pre-l" style="display:block;font:500 14px/1.3 var(--bf);color:var(--muted);margin-bottom:6px">${T("Pre-approved?", "¿Tiene preaprobación?")}</span>
        <div class="seg" role="radiogroup" aria-labelledby="ls-pre-l">
          <label><input type="radio" name="preapproved" value="Yes" data-detail="Pre-approved"><span>${T("Yes", "Sí")}</span></label>
          <label><input type="radio" name="preapproved" value="Not yet" data-detail="Pre-approved"><span>${T("Not yet", "Todavía no")}</span></label>
          <label><input type="radio" name="preapproved" value="Not sure" data-detail="Pre-approved"><span>${T("Not sure", "No sé")}</span></label>
        </div></div>
      <div class="field"><label for="ls-msg">${T("Must-haves (optional)", "Lo que no puede faltar (opcional)")}</label><textarea id="ls-msg" name="message" rows="3"></textarea></div>
      ${honeypot}
      ${consent(lang)}
      <button class="btn btn-primary" type="submit">${T("Send", "Enviar")}</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="done"><h3>${T("Thank you — I have it.", "Gracias — ya lo recibí.")}</h3><p>${T("I'll reply personally, usually the same day. In the meantime, the live search is open.", "Le respondo personalmente, normalmente el mismo día. Mientras tanto, la búsqueda en vivo está abierta.")}</p><p style="margin-top:14px"><a class="btn btn-primary" href="${REALSCOUT_URL}" target="_blank" rel="noopener">${T("Open the live home search", "Abrir la búsqueda en vivo")}</a></p></div>
  </form>
</div></section>

<section class="section tight"><div class="wrap narrow"><p class="disclaimer">${disclaimer}</p></div></section>`,
    };
  }
  pages.push(listings("en"), listings("es"));

  return pages;
}
