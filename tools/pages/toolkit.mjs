// Toolkit hub + human-readable site map (EN + ES):
//   /toolkit  + /es/herramientas   every calculator in the buyer/seller presentations, each opening straight into its tool
//   /site-map + /es/mapa-del-sitio every page on the site, grouped (crawlers and people)
// The calculators themselves live inside the decks (buyers/ sellers/), which are also Marketora Path-B templates,
// so this page links into their deep-link routes instead of copying the code.
import fs from "node:fs";
import path from "node:path";

const ICON = {
  afford: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9.5 15.5h5M12 13v5"/>',
  payment: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  cash: '<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/>',
  equity: '<path d="M4 20h16"/><path d="M6 20V9l6-5 6 5v11"/><path d="M10 14h4M12 12v4"/>',
  rental: '<path d="M4 20V8l5-4 5 4v12"/><path d="M14 20v-8l3-2.5 3 2.5v8"/><path d="M8 12h2M8 16h2"/>',
  flip: '<path d="M4 7h11l-3-3M20 17H9l3 3"/>',
  wholesale: '<path d="M4 17 9 12l4 4 7-8"/><path d="M15 8h5v5"/>',
  rentbuy: '<path d="M12 3v18"/><path d="M5 8l-2 4h4zM19 8l-2 4h4z"/><path d="M5 12a2 2 0 0 0 0 0M3 12a2 2 0 0 0 4 0M17 12a2 2 0 0 0 4 0"/>',
};

const TOOLS = [
  { k: "afford", who: "buy", en: ["Buying power", "How much home your income, debts and savings support, step by step — including multi-family and DSCR loans."], es: ["Poder de compra", "Cuánta casa le permiten sus ingresos, deudas y ahorros, paso a paso — incluso multifamiliares y préstamos DSCR."], href: "#toolkit/afford" },
  { k: "payment", who: "buy", en: ["Monthly payment", "Principal, interest, taxes, insurance, PMI and HOA, plus how the loan pays down over time."], es: ["Pago mensual", "Capital, interés, impuestos, seguro, PMI y HOA, y cómo se paga el préstamo con el tiempo."], href: "#toolkit/payment" },
  { k: "cash", who: "buy", en: ["Cash to close", "Every deposit and closing cost between offer and keys, with your own numbers."], es: ["Efectivo para cerrar", "Cada depósito y costo de cierre entre la oferta y las llaves, con sus propios números."], href: "#toolkit/cash" },
  { k: "rentbuy", who: "buy", en: ["Rent vs. buy", "What each path leaves you with after a few years, side by side."], es: ["Alquilar o comprar", "Lo que le deja cada camino después de unos años, lado a lado."], href: "#toolkit/rentbuy" },
  { k: "equity", who: "sell", en: ["Net proceeds", "What you actually keep when you sell — fees, transfer stamps, attorney, payoff and prorations."], es: ["Ganancia neta", "Lo que realmente le queda al vender — comisiones, sellos de transferencia, abogado, saldo del préstamo y prorrateos."], deck: "sellers", href: "#tool-equity" },
  { k: "rental", who: "invest", en: ["Investment analyzer", "From a two-family to 200 units: rent roll, NOI, cash flow, cap rate and cash-on-cash return."], es: ["Análisis de inversión", "De un bifamiliar a 200 unidades: rentas, NOI, flujo de caja, tasa de capitalización y retorno sobre efectivo."], href: "#toolkit/rental" },
  { k: "flip", who: "invest", en: ["Flip calculator", "Maximum offer, rehab budget, holding costs and how sensitive the profit is to each."], es: ["Calculadora de flip", "Oferta máxima, presupuesto de remodelación, costos de mantener y qué tan sensible es la ganancia."], href: "#toolkit/flip" },
  { k: "wholesale", who: "invest", en: ["Wholesale", "Your maximum contract price and assignment fee, working back from the end buyer's numbers."], es: ["Wholesale", "Su precio máximo de contrato y su comisión de asignación, calculados desde los números del comprador final."], href: "#toolkit/wholesale" },
];

export default function toolkit(ctx) {
  const { esc, breadcrumb, faqPage, BASE } = ctx;
  const all = ctx.photos();
  const pick = (re, cats) => (all.find((p) => cats.includes(p.category) && !p.town && re.test(`${p.slug} ${p.mood || ""} ${p.alt_en}`)) || {}).slug || null;
  const heroPhoto = pick(/kitchen|living|interior/, ["interior"]);
  const bandPhoto = pick(/keys/, ["lifestyle", "interior", "home"]) || pick(/porch|home/, ["home", "lifestyle"]);

  function deckHref(es, t) {
    const deck = t.deck === "sellers" ? (es ? "/es/vendedores" : "/sellers") : (es ? "/es/compradores" : "/buyers");
    return deck + t.href;
  }

  function toolkitPage(lang) {
    const es = lang === "es", T = (a, b) => (es ? b : a);
    const p = es ? "/es/herramientas" : "/toolkit";
    const groups = [
      ["buy", T("For buyers", "Para compradores"), T("Know your number before you tour.", "Conozca su número antes de ver casas.")],
      ["sell", T("For sellers", "Para vendedores"), T("Price is what the market says; net is what you keep.", "El precio lo dice el mercado; la ganancia neta es lo que le queda.")],
      ["invest", T("For investors", "Para inversionistas"), T("Run the deal the way a lender will.", "Analice el negocio como lo hará el prestamista.")],
    ];
    const card = (t) => {
      const [name, desc] = es ? t.es : t.en;
      return `<a class="tool-card" href="${deckHref(es, t)}"><span class="tool-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${ICON[t.k]}</svg></span><b>${esc(name)}</b><span>${esc(desc)}</span><span class="tool-go">${T("Open the calculator", "Abrir la calculadora")}</span></a>`;
    };
    const sections = groups.map(([who, title, line]) => `<div class="tool-group"><div class="tool-group-h"><h2>${title}</h2><p>${line}</p></div><div class="tool-grid">${TOOLS.filter((t) => t.who === who).map(card).join("")}</div></div>`).join("");
    const qas = es ? [
      ["¿Las herramientas son gratis?", "Sí. No necesita registrarse para usarlas."],
      ["¿Se guardan mis números?", "Los cálculos se hacen en su navegador. Si pide el reporte en PDF con su nombre, ese pedido me llega para poder enviárselo y darle seguimiento."],
      ["¿Los resultados son una aprobación de préstamo o una tasación?", "No. Son estimados para planificar y conversar — no son una aprobación de préstamo, una tasación ni asesoría legal, de impuestos o financiera."],
      ["¿Funcionan en español?", "Sí. Todas las calculadoras y el reporte en PDF están en inglés y en español."],
    ] : [
      ["Are the tools free?", "Yes. You don't need to sign up to use them."],
      ["Are my numbers saved?", "The math runs in your browser. If you ask for the PDF report with your name, that request comes to me so I can send it and follow up."],
      ["Are the results a loan approval or an appraisal?", "No. They are planning estimates for discussion — not a loan approval, an appraisal, or legal, tax or financial advice."],
      ["Do they work in Spanish?", "Yes. Every calculator and the PDF report work in English and Spanish."],
    ];
    const faq = `<section class="section paper"><div class="wrap"><div class="head"><div><span class="label">${T("Questions", "Preguntas")}</span><h2>${T("Before you run the numbers", "Antes de calcular")}</h2></div></div><div class="faq">${qas.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="a">${esc(a)}</div></details>`).join("")}</div></div></section>`;
    const items = TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: (es ? t.es : t.en)[0], url: BASE + deckHref(es, t) }));
    const style = `<style>
.tool-hero{background:var(--night);color:#fff;position:relative;overflow:hidden}
.tool-hero .wrap{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:clamp(28px,5vw,72px);align-items:center;padding-top:clamp(56px,7vw,96px);padding-bottom:clamp(56px,7vw,96px)}
.tool-hero h1{color:#fff;font-size:clamp(42px,5.6vw,80px)}.tool-hero .lede{color:rgba(255,255,255,.82);margin-top:20px}
.tool-hero .arch{max-width:380px;justify-self:end;width:100%}
@media(max-width:900px){.tool-hero .wrap{grid-template-columns:1fr}.tool-hero .arch{justify-self:start;max-width:300px}}
.tool-group+.tool-group{margin-top:clamp(48px,6vw,80px)}
.tool-group-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 24px;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:22px}
.tool-group-h h2{font-size:clamp(30px,3.2vw,44px)}.tool-group-h p{color:var(--muted)}
.tool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.tool-card{position:relative;display:flex;flex-direction:column;gap:8px;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:24px 22px 22px;min-height:220px;transition:border-color .3s,transform .3s var(--ease)}
.tool-card:hover{border-color:var(--champagne);transform:translateY(-2px)}
.tool-card b{font:600 25px/1.1 var(--hf);color:var(--harbor)}
.tool-card>span:not(.tool-ic):not(.tool-go){font-size:15px;color:var(--muted);flex:1}
.tool-ic{width:48px;height:48px;border-radius:14px;background:var(--ivory);display:grid;place-items:center;color:var(--harbor);margin-bottom:6px;border:1px solid rgba(201,174,124,.5)}
.tool-ic svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.tool-go{font:500 14px var(--bf);color:var(--champagne-ink);text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(201,174,124,.6)}
</style>`;
    const body = `<nav class="crumbs wrap" aria-label="${T("Breadcrumb", "Ruta")}"><ol><li><a href="${es ? "/es" : "/"}">${T("Home", "Inicio")}</a></li><li aria-current="page">${T("Toolkit", "Herramientas")}</li></ol></nav>
<section class="tool-hero"><div class="wrap"><div>
<span class="label">${T("Free real-estate calculators", "Calculadoras de bienes raíces gratis")}</span>
<h1>${T("Run your numbers before you call anyone.", "Calcule sus números antes de llamar a nadie.")}</h1>
<p class="lede">${T("The same calculators I use with clients — buying power, payment, cash to close, net proceeds and investment analysis for Massachusetts and New Hampshire. No sign-up, in English or Spanish, with a PDF report when you want one.", "Las mismas calculadoras que uso con mis clientes — poder de compra, pago mensual, efectivo para cerrar, ganancia neta y análisis de inversión para Massachusetts y New Hampshire. Sin registro, en inglés o español, con un reporte en PDF cuando lo quiera.")}</p>
<div class="btn-row"><a class="btn btn-gold" href="${es ? "/es/compradores#toolkit" : "/buyers#toolkit"}">${T("Open the full toolkit", "Abrir todas las herramientas")}</a><a class="btn btn-ghost" href="${es ? "/es/valor-de-mi-casa" : "/home-value"}">${T("Get my home value", "Saber el valor de mi casa")}</a></div>
</div>${heroPhoto ? `<div class="arch">${ctx.img(heroPhoto, { lang, sizes: "(max-width:900px) 300px, 380px", eager: true })}</div>` : ""}</div></section>
<section class="section"><div class="wrap">${sections}
<p class="disclaimer">${T("Estimates for planning and discussion — not a loan approval, an appraisal, or legal, tax or financial advice. Rates, taxes and fees vary; confirm with your lender and attorney.", "Estimados para planificar y conversar — no son una aprobación de préstamo, una tasación ni asesoría legal, de impuestos o financiera. Las tasas, impuestos y cargos varían; confírmelos con su prestamista y abogado.")}</p>
</div></section>
${bandPhoto ? `<section class="section stone"><div class="wrap split"><div class="frame" style="aspect-ratio:4/3">${ctx.img(bandPhoto, { lang, sizes: "(max-width:900px) 100vw, 45vw" })}</div><div><span class="label">${T("Then talk it through", "Luego lo conversamos")}</span><h2>${T("Numbers are the start of the plan, not the end.", "Los números son el comienzo del plan, no el final.")}</h2><p class="lede" style="margin-top:16px">${T("Bring your results to a 20-minute call and we'll turn them into a search, a price or an offer strategy — for your town.", "Traiga sus resultados a una llamada de 20 minutos y los convertimos en una búsqueda, un precio o una estrategia de oferta — para su pueblo.")}</p><div class="btn-row"><a class="btn btn-primary" href="${ctx.CONFIG.links.book}" target="_blank" rel="noopener">${T("Book 20 minutes", "Reservar 20 minutos")}</a><a class="btn btn-ghost" href="${es ? "/es/pueblos" : "/towns"}">${T("Explore the towns", "Conozca los pueblos")}</a></div></div></div></section>` : ""}
${faq}`;
    return {
      lang, path: p, altPath: es ? "/toolkit" : "/es/herramientas",
      title: T("Free real-estate calculators for MA & NH: buying power, payment, net proceeds, investing | Eduardo Inoa", "Calculadoras de bienes raíces gratis para MA y NH: poder de compra, pago, ganancia neta, inversión | Eduardo Inoa"),
      description: T("Free calculators for buyers, sellers and investors in the Merrimack Valley and Southern NH — buying power, monthly payment, cash to close, net proceeds, rental analysis, flips and wholesale. English or Spanish.", "Calculadoras gratis para compradores, vendedores e inversionistas en Merrimack Valley y el sur de NH — poder de compra, pago mensual, efectivo para cerrar, ganancia neta, alquileres, flips y wholesale. En inglés o español."),
      head: style, navCurrent: p,
      schema: [
        breadcrumb([[T("Home", "Inicio"), es ? "/es" : "/"], [T("Toolkit", "Herramientas"), p]]),
        { "@type": "ItemList", "@id": BASE + p + "#tools", name: T("Real-estate calculators", "Calculadoras de bienes raíces"), itemListElement: items },
        faqPage(BASE + p + "#faq", qas),
      ],
      body, foot: { credits: [heroPhoto, bandPhoto].filter(Boolean) },
      sitemap: { priority: "0.8", changefreq: "monthly" },
    };
  }

  /* ---------------- human-readable site map ---------------- */
  const townsData = JSON.parse(fs.readFileSync(path.join(ctx.ROOT, "tools/data/towns.json"), "utf8")).towns;
  const posts = JSON.parse(fs.readFileSync(path.join(ctx.ROOT, "tools/data/posts.json"), "utf8"));
  function siteMap(lang) {
    const es = lang === "es", T = (a, b) => (es ? b : a);
    const p = es ? "/es/mapa-del-sitio" : "/site-map";
    const list = (title, links) => `<div class="sm-col"><h2>${title}</h2><ul>${links.map(([h, t, note]) => `<li><a href="${h}">${esc(t)}</a>${note ? ` <span class="small">${note}</span>` : ""}</li>`).join("")}</ul></div>`;
    const cols = es ? [
      list("Principal", [["/es", "Inicio"], ["/es/compradores", "Presentación para compradores e inversionistas"], ["/es/vendedores", "Presentación para vendedores"], ["/es/valor-de-mi-casa", "Valor de su casa"], ["/es/oferta-en-efectivo", "Oferta en efectivo vs. mercado abierto"], ["/es/herramientas", "Herramientas"], ["/es/propiedades", "Buscar propiedades"], ["/es/pueblos", "Pueblos"], ["/es/blog", "Blog"]]),
      list("Pueblos", townsData.map((t) => [t.es ? `/es/pueblos/${t.slug}` : `/towns/${t.slug}`, `${t.name}, ${t.state}`, t.es ? "" : "(en inglés)"])),
      list("Blog", [...(posts.es || []).map((x) => [x.path, x.title]), ...(posts.en || []).filter((x) => !x.esPath).map((x) => [x.path, x.title, "(en inglés)"])]),
      list("English", [["/", "Home (English)"], ["/site-map", "Site map (English)"]]),
    ] : [
      list("Main", [["/", "Home"], ["/buyers", "Buyer & investor presentation"], ["/sellers", "Seller presentation"], ["/home-value", "What's my home worth?"], ["/cash-offer", "Cash offer vs. open market"], ["/toolkit", "Toolkit"], ["/listings", "Search homes"], ["/towns", "Towns"], ["/journal", "Journal"], ["/#market", "Market pulse"]]),
      list("Towns", townsData.map((t) => [`/towns/${t.slug}`, `${t.name}, ${t.state}`])),
      list("Journal", (posts.en || []).map((x) => [x.path, x.title])),
      list("Español", [["/es", "Inicio (español)"], ["/es/mapa-del-sitio", "Mapa del sitio (español)"]]),
    ];
    return {
      lang, path: p, altPath: es ? "/site-map" : "/es/mapa-del-sitio",
      title: T("Site map | Eduardo Inoa, REALTOR®", "Mapa del sitio | Eduardo Inoa, REALTOR®"),
      description: T("Every page on eduardoinoa.com: presentations, home value, cash offer, toolkit, town guides and the journal.", "Todas las páginas de eduardoinoa.com: presentaciones, valor de su casa, oferta en efectivo, herramientas, guías de pueblos y el blog."),
      head: `<style>.sm{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:36px}.sm-col h2{font-size:28px;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:12px}.sm-col ul{list-style:none}.sm-col li{padding:6px 0}.sm-col a{color:var(--harbor);text-decoration-color:var(--champagne);text-underline-offset:3px}</style>`,
      schema: [breadcrumb([[T("Home", "Inicio"), es ? "/es" : "/"], [T("Site map", "Mapa del sitio"), p]])],
      body: `<nav class="crumbs wrap" aria-label="${T("Breadcrumb", "Ruta")}"><ol><li><a href="${es ? "/es" : "/"}">${T("Home", "Inicio")}</a></li><li aria-current="page">${T("Site map", "Mapa del sitio")}</li></ol></nav>
<section class="section"><div class="wrap"><span class="label">${T("Site map", "Mapa del sitio")}</span><h1 style="font-size:clamp(40px,5vw,64px);margin-bottom:40px">${T("Every page, in one place", "Todas las páginas, en un solo lugar")}</h1><div class="sm">${cols.join("")}</div></div></section>`,
      sitemap: { priority: "0.3", changefreq: "monthly" },
    };
  }

  return [toolkitPage("en"), toolkitPage("es"), siteMap("en"), siteMap("es")];
}
