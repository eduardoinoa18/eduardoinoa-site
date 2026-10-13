// Seller lead landing pages (EN + ES):
//   /cash-offer        + /es/oferta-en-efectivo   lead source `cash_offer`, type `seller`
//   /home-value        + /es/valor-de-mi-casa     lead source `home_value`, type `seller`
//
// COMPLIANCE (cash offer, from Eduardo's brief — do not loosen):
//   Eduardo is never the buyer. No "we buy houses", no "guaranteed/instant offer", no iBuyer names or logos.
//   The disclaimer below is shown next to the form AND passed to the footer.
//
// Photos are chosen from img/photos/manifest.json by keywords (category / tags / mood / alt), never by slug.
// With no match the page falls back to a dark, photo-free layout.
import fs from "node:fs";
import path from "node:path";

export default function landing(ctx) {
  const { esc, CONFIG, ROOT, breadcrumb, faqPage, agentRef, consent, honeypot, abs } = ctx;
  const NAP = CONFIG.nap, LINKS = CONFIG.links, STATS = CONFIG.stats || {};

  /* ---------------- service area (single source: landing.js SITE.towns) ---------------- */
  const towns = [...fs.readFileSync(path.join(ROOT, "landing.js"), "utf8")
    .matchAll(/\["([^"]+)", "(MA|NH)", "([^"]+ County, (?:MA|NH))"\]/g)].map((m) => ({ name: m[1], st: m[2] }));
  if (towns.length < 10) throw new Error("landing.mjs: could not read SITE.towns from landing.js");
  const areaServed = towns.map((t) => ({ "@type": "City", name: `${t.name}, ${t.st}` }));
  const marketTowns = (ctx.market.towns || []).map((t) => [t.name, t.state]);

  /* ---------------- photos ---------------- */
  const all = ctx.photos();
  const used = new Set();
  const hay = (p) => Object.entries(p)
    .filter(([k]) => !/credit|licen|author|url|src|slug/i.test(k))
    .map(([, v]) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(" ") : v && typeof v === "object" ? Object.values(v).join(" ") : ""))
    .join(" ").toLowerCase() + " " + String(p.slug || "").replace(/-/g, " ");
  // Never use a photo that reads as a listing or a sale.
  const BANNED = /\b(sold|just listed|for sale|listing|open house|sign)\b/;
  /** Best unused photo. cats: preferred manifest categories (strong); wants: [[regex, weight]] over
   *  mood/alt/tags; need: regex the photo must match. Town landmarks are skipped (these pages are about homes). */
  function pick(wants, { cats = [], need, landscape = false, hero = false } = {}) {
    let best = null, bestScore = 0;
    for (const p of all) {
      if (used.has(p.slug) || p.category === "town" || p.town) continue;
      const h = hay(p);
      if (BANNED.test(h) || (need && !need.test(h))) continue;
      if (landscape && p.w && p.h && p.w < p.h * 1.2) continue;
      let s = cats.includes(p.category) ? 5 : 0;
      for (const [re, w] of wants) if (re.test(h)) s += w;
      if (hero && p.hero_candidate) s += 2;
      if (s > bestScore) { best = p; bestScore = s; }
    }
    if (best) used.add(best.slug);
    return best ? best.slug : null;
  }
  const HOME = /\b(house|home|homes|exterior|facade|façade|porch|colonial|cape|victorian|residential|neighbou?rhood|street|driveway|front door)\b/;
  const DUSK = /\b(dusk|twilight|evening|sunset|blue hour|night|warm|glow)\b/;
  const INSIDE = /\b(interior|kitchen|living|dining|foyer|keys|room|hallway|staircase|fireplace)\b/;
  const P = {
    cashHero: pick([[DUSK, 3], [/welcoming|warm/, 1], [/multi-family|triple-decker|turret|winter|snow/, -3]], { cats: ["home"], need: HOME, landscape: true, hero: true }),
    cashSide: pick([[/kitchen|living|fireplace/, 2], [/warm|cozy|bright/, 1]], { cats: ["interior"], need: INSIDE }),
    valueBg: pick([[/street|neighbou?rhood|residential/, 3], [/autumn|fall|foliage/, 1], [/luxury|turret/, -3]], { cats: ["home", "season", "aerial"], need: HOME, landscape: true }),
    valueSide: pick([[/kitchen|bright|airy/, 2], [/classic|refined/, 1]], { cats: ["interior"], need: INSIDE }),
  };
  const credits = (...slugs) => slugs.filter(Boolean);
  const arch = (slug, lang, extra = "") => slug
    ? `<figure class="arch${extra}">${ctx.img(slug, { lang, sizes: "(max-width: 900px) 92vw, 40vw" })}</figure>`
    : `<div class="arch blank${extra}" aria-hidden="true"><i>EI</i></div>`;

  /* ---------------- shared bits ---------------- */
  const PAGE_CSS = `<style>
.arch.blank{background:linear-gradient(160deg,var(--harbor),var(--night));display:grid;place-items:center}
.arch.blank i{font:italic 500 56px var(--hf);color:var(--champagne)}
.hero .crumbs{margin-bottom:22px}
.hero:after{background:linear-gradient(90deg,rgba(6,26,48,.72) 0%,rgba(6,26,48,.35) 55%,rgba(6,26,48,0) 100%),linear-gradient(180deg,rgba(6,26,48,.35) 0%,rgba(6,26,48,.15) 35%,rgba(6,26,48,.86) 100%)}
.split.top{align-items:start}
@media(max-width:900px){.hero:after{background:linear-gradient(180deg,rgba(6,26,48,.45) 0%,rgba(6,26,48,.55) 30%,rgba(6,26,48,.9) 70%)}}
.hero-split.solo .wrap{grid-template-columns:minmax(0,1fr)}
.hero-split.solo h1{max-width:16ch}
.ticks{list-style:none;margin-top:24px;border-top:1px solid var(--hair)}
.ticks li{position:relative;padding:14px 0 14px 28px;border-bottom:1px solid var(--hair)}
.ticks li:before{content:"";position:absolute;left:2px;top:27px;width:12px;height:1px;background:var(--champagne-ink)}
.ticks b{color:var(--harbor);font-weight:600}
.dark .ticks{border-color:var(--line-dark)}.dark .ticks li{border-color:var(--line-dark)}.dark .ticks b{color:#fff}
.compare h3{margin-bottom:4px}.compare .small{margin-top:4px}
.compare li b{display:block;font:600 13px/1.3 var(--bf);letter-spacing:.04em;color:var(--champagne-ink);margin-bottom:2px}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.trio>div{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:clamp(22px,2.6vw,32px)}
.trio>div.featured{border-color:var(--champagne);box-shadow:0 30px 60px -40px rgba(6,26,48,.35)}
.trio b{display:block;font:600 26px/1.15 var(--hf);color:var(--harbor);margin-bottom:8px}
.trio p{font-size:15.5px;color:var(--muted)}
@media(max-width:800px){.trio{grid-template-columns:1fr}}
.fit{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,56px)}
@media(max-width:800px){.fit{grid-template-columns:1fr}}
.seg.wide{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
.seg span{font-size:14.5px;line-height:1.25}
.form fieldset{border:0;margin-top:16px;min-width:0}
.form legend{display:block;font:500 14px/1.3 var(--bf);color:var(--muted);margin-bottom:6px;padding:0}
.form .opt{font-weight:400}
.form .fine{font-size:13px;color:var(--muted);margin-top:14px;line-height:1.55}
.form .disclaimer{margin-top:22px}
.tv-hint{display:none;border:1px dashed var(--line-dark);border-radius:20px;padding:20px 24px;margin-top:28px;color:#9FB2C5;font-size:15px;line-height:1.6}
[data-town-value][hidden]+.tv-hint{display:block}
.value-card .k{font:500 14px/1.4 var(--bf);color:var(--champagne)}
.value-card [data-tv-note]{margin-top:8px}
.band{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px 32px;border:1px solid var(--champagne);border-radius:22px;padding:clamp(24px,3vw,40px);background:var(--paper)}
.band h2{font-size:clamp(28px,3vw,40px)}
.band p{color:var(--muted);margin-top:6px;max-width:560px}
.cta-final{text-align:left}
.cta-final h2{max-width:18ch}
.cta-final .small{color:#9FB2C5;margin-top:22px}
.cta-final .small a{color:#C9D6E3}
.mkt-wrap .mp-pick{max-width:360px}
@media(max-width:600px){.hero-split .wrap{padding-top:40px}.form{border-radius:20px}.figures{grid-template-columns:repeat(2,minmax(0,1fr))}.figures>div{padding-right:12px}}
</style>`;

  const figures = (lang) => {
    const es = lang === "es";
    const items = [
      [STATS.transactions || "35+", es ? "transacciones cerradas" : "transactions closed"],
      STATS.sales ? [STATS.sales, es ? "en ventas" : "in sales"] : null,
      ["MA · NH", es ? "con licencia desde 2021" : "licensed since 2021"],
      ["EN · ES", es ? "totalmente bilingüe" : "fully bilingual"],
    ].filter(Boolean);
    return `<div class="figures">${items.map(([b, s]) => `<div><b>${esc(b)}</b><span>${s}</span></div>`).join("")}</div>`;
  };

  const crumbs = (lang, here) => {
    const es = lang === "es";
    return `<nav class="crumbs" aria-label="${es ? "Ruta de navegación" : "Breadcrumb"}"><ol><li><a href="${es ? "/es" : "/"}">${es ? "Inicio" : "Home"}</a></li><li aria-current="page">${esc(here)}</li></ol></nav>`;
  };

  const faqHtml = (qas) => `<div class="faq">${qas.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="a"><p>${a}</p></div></details>`).join("")}</div>`;

  const option = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const radios = (name, detail, items, cls = "seg") =>
    `<div class="${cls}">${items.map(([v, t]) => `<label><input type="radio" name="${name}" value="${esc(v)}" data-detail="${esc(detail)}"><span>${esc(t)}</span></label>`).join("")}</div>`;

  const PTYPES = (es) => [
    ["Single-family", es ? "Unifamiliar" : "Single-family"],
    ["Condo", es ? "Condominio" : "Condo"],
    ["Townhome", es ? "Townhouse" : "Townhome"],
    ["2-4 family", es ? "Multifamiliar 2–4" : "2–4 family"],
    ["Other", es ? "Otro" : "Other"],
  ];
  const TIMEFRAMES = (es) => [
    ["As soon as possible", es ? "Lo antes posible" : "As soon as possible"],
    ["1-3 months", es ? "1–3 meses" : "1–3 months"],
    ["3-6 months", es ? "3–6 meses" : "3–6 months"],
    ["6+ months", es ? "Más de 6 meses" : "6+ months"],
    ["Just exploring", es ? "Solo estoy explorando" : "Just exploring"],
  ];

  /** Contact block shared by both forms. */
  const contactFields = (id, es) => `
    <div class="field"><label for="${id}-name">${es ? "Nombre" : "Name"}</label><input id="${id}-name" name="name" autocomplete="name" required></div>
    <div class="row2">
      <div class="field"><label for="${id}-phone">${es ? "Teléfono" : "Phone"}</label><input id="${id}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>
      <div class="field"><label for="${id}-email">Email</label><input id="${id}-email" name="email" type="email" inputmode="email" autocomplete="email"></div>
    </div>
    <p class="fine">${es ? "Un teléfono o un email es suficiente." : "A phone number or an email is enough."}</p>`;

  /* =====================================================================
     CASH OFFER
     ===================================================================== */
  function cashOffer(lang) {
    const es = lang === "es";
    const pathNow = es ? "/es/oferta-en-efectivo" : "/cash-offer";
    const altPath = es ? "/cash-offer" : "/es/oferta-en-efectivo";
    const here = es ? "Oferta en efectivo" : "Cash offer";

    const DISCLAIMER = es
      ? "Eduardo Inoa y The Fermin Group at Century 21 North East no son el comprador y no compran viviendas. Las ofertas en efectivo provienen de proveedores externos e independientes; no están garantizadas y están sujetas a los términos, la inspección y la aprobación del proveedor. Sin afiliación ni respaldo de ningún proveedor de ofertas. El agente puede recibir compensación del proveedor de la oferta. Los estimados de valor no son tasaciones."
      : "Eduardo Inoa and The Fermin Group at Century 21 North East are not the buyer and do not purchase homes. Cash offers come from independent third-party providers; they are not guaranteed and are subject to the provider's terms, inspection and approval. Not affiliated with or endorsed by any offer provider. The agent may receive compensation from the offer provider. Estimates of value are not appraisals.";
    const TAIL = es
      ? " Cada oficina es de propiedad y operación independiente. Igualdad de Oportunidad en la Vivienda."
      : " Each office is independently owned and operated. Equal Housing Opportunity.";

    const title = es
      ? "Oferta en efectivo vs. mercado abierto: compare antes de vender | Merrimack Valley y sur de NH"
      : "Cash offer vs. open market: compare before you sell | Merrimack Valley & Southern NH";
    const description = es
      ? "Solicite una oferta en efectivo de un comprador externo y véala junto a un estimado del mercado abierto para su casa en el Merrimack Valley o el sur de NH. Sin compromiso, en español."
      : "Request a third-party cash offer and see it side by side with an open-market estimate for your home in the Merrimack Valley or Southern NH. No obligation, in English or Spanish.";

    const FAQ = es ? [
      ["¿Usted va a comprar mi casa?", "No. Soy agente de bienes raíces con licencia, no un comprador. La oferta en efectivo viene de un proveedor externo e independiente. Mi trabajo es ayudarle a solicitarla y ponerla junto a lo que el mercado abierto probablemente pagaría, para que usted compare con números reales."],
      ["¿La oferta en efectivo es final cuando la recibo?", "No necesariamente. La primera cifra suele ser preliminar: el proveedor normalmente inspecciona la propiedad y puede ajustar la oferta según lo que encuentre. Toda oferta está sujeta a los términos, la inspección y la aprobación del proveedor."],
      ["¿Mi casa califica para una oferta en efectivo?", "Cada proveedor fija sus propios criterios: tipo de propiedad, rango de precio, condición, antigüedad y ubicación. Muchos programas no compran casas multifamiliares de 2 a 4 unidades ni casas que necesitan reparaciones mayores. Si su casa no califica, igual recibe el estimado del mercado abierto."],
      ["¿Cuánto me cuesta solicitar la comparación?", "Nada. Solicitar y comparar no tiene costo ni compromiso. Si acepta una oferta en efectivo, las tarifas del proveedor y cualquier descuento por reparaciones están en sus términos. Si decide vender en el mercado abierto conmigo, mi comisión queda por escrito antes de empezar."],
      ["¿Me va a presionar para listar con usted?", "No. Usted elige el camino que le deje más dinero o que mejor se ajuste a su calendario. Si la oferta en efectivo le conviene más, esa es una buena respuesta."],
      ["¿Podemos hacer todo en español?", "Sí. La conversación, la comparación y los documentos que yo prepare pueden ser completamente en español."],
    ] : [
      ["Are you buying my house?", "No. I'm a licensed real-estate agent, not a buyer. The cash offer comes from an independent third-party provider. My job is to help you request it and put it next to what the open market would likely pay, so you can compare with real numbers."],
      ["Is a cash offer final once I receive it?", "Not necessarily. The first number is usually preliminary: the provider typically inspects the property and may adjust the offer based on what it finds. Every offer is subject to the provider's terms, inspection and approval."],
      ["Does my home qualify for a cash offer?", "Each provider sets its own criteria: property type, price range, condition, age and location. Many programs don't buy 2–4 family homes or homes that need major repairs. If yours doesn't qualify, you still get the open-market estimate."],
      ["What does it cost to request the comparison?", "Nothing. Requesting and comparing is free and carries no obligation. If you accept a cash offer, the provider's fees and any repair deductions are set out in its terms. If you list on the open market with me, my fee is in writing before we start."],
      ["Will you pressure me to list with you?", "No. You choose the path that leaves you more money or fits your timeline better. If the cash offer suits you, that's a fine answer."],
      ["Can we do this in Spanish?", "Yes. The conversation, the comparison and the documents I prepare can all be in Spanish."],
    ];

    const heroImg = P.cashHero ? ctx.img(P.cashHero, { lang, sizes: "100vw", eager: true }) : "";
    const heroInner = `
      ${crumbs(lang, here)}
      <span class="label">${es ? "Comparación de oferta en efectivo · Merrimack Valley y sur de NH" : "Cash offer comparison · Merrimack Valley & Southern NH"}</span>
      <h1>${es ? "Una oferta en efectivo, junto al mercado abierto." : "A cash offer, next to the open market."}</h1>
      <p class="lede">${es
        ? "Solicite una oferta en efectivo de un comprador externo y véala lado a lado con un estimado del mercado abierto que yo preparo con ventas recientes. Así decide con números reales, no con suposiciones."
        : "Request a cash offer from a third-party buyer and see it side by side with an open-market estimate I prepare from recent sales. So you decide with real numbers, not a guess."}</p>
      <div class="btn-row">
        <a class="btn btn-gold" href="#request">${es ? "Solicitar mi comparación" : "Request my cash offer comparison"}</a>
        <a class="btn btn-ghost" href="${LINKS.book}" target="_blank" rel="noopener">${es ? "Reservar una llamada" : "Book a call"}</a>
      </div>`;
    const hero = heroImg
      ? `<section class="hero on-dark">${heroImg}<div class="wrap">${heroInner}</div></section>`
      : `<section class="hero-split solo on-dark"><div class="wrap"><div>${heroInner}</div></div></section>`;

    const form = `
<form class="form" id="request-form" data-lead data-source="cash_offer" data-type="seller" data-label="Website — Cash offer comparison request" novalidate>
  <div class="fields">
    <h2>${es ? "Solicite su comparación" : "Request your comparison"}</h2>
    <p class="sub">${es ? "Sin costo y sin compromiso. Le respondo personalmente." : "Free, with no obligation. I reply personally."}</p>
    <div class="field"><label for="co-address">${es ? "Dirección de la propiedad" : "Property address"}</label><input id="co-address" name="address" autocomplete="street-address" required></div>
    <div class="field"><label for="co-town">${es ? "Pueblo" : "Town"}</label><select id="co-town" name="town" data-towns>${option("", es ? "Elija su pueblo" : "Choose your town")}</select></div>
    <fieldset><legend>${es ? "Tipo de propiedad" : "Property type"}</legend>${radios("ptype", "Property type", PTYPES(es))}</fieldset>
    <div class="row2">
      <div class="field"><label for="co-cond">${es ? "Condición" : "Condition"}</label><select id="co-cond" name="condition" data-detail="Condition">${option("", es ? "Elija una" : "Choose one")}${[
        ["Move-in ready", es ? "Lista para mudarse" : "Move-in ready"],
        ["Needs minor updates", es ? "Necesita arreglos menores" : "Needs minor updates"],
        ["Needs major repairs", es ? "Necesita reparaciones mayores" : "Needs major repairs"],
        ["Not sure", es ? "No estoy seguro" : "Not sure"]].map(([v, t]) => option(v, t)).join("")}</select></div>
      <div class="field"><label for="co-time">${es ? "¿Cuándo piensa vender?" : "When would you sell?"}</label><select id="co-time" name="timeframe" data-detail="Timeframe">${option("", es ? "Elija uno" : "Choose one")}${TIMEFRAMES(es).map(([v, t]) => option(v, t)).join("")}</select></div>
    </div>
    ${contactFields("co", es)}
    <div class="field"><label for="co-msg">${es ? "¿Algo más que deba saber?" : "Anything I should know?"} <span class="opt">${es ? "(opcional)" : "(optional)"}</span></label><textarea id="co-msg" name="message" rows="3"></textarea></div>
    ${consent(lang)}
    ${honeypot}
    <button class="btn btn-primary" type="submit">${es ? "Solicitar mi comparación" : "Request my cash offer comparison"}</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
  </div>
  <div class="done">
    <h3>${es ? "Gracias, ya la recibí." : "Thank you, I have it."}</h3>
    <p>${es
      ? "Voy a revisar las ventas comparables de su dirección y le escribo personalmente, normalmente el mismo día. Si su casa encaja con los criterios de un proveedor, solicito la oferta en efectivo y le presento ambos números juntos."
      : "I'll review the comparable sales for your address and reach out personally, usually the same day. If your home fits a provider's criteria, I'll request the cash offer and walk you through both numbers together."}</p>
    <p class="fine">${es ? "¿Prefiere hablar ahora?" : "Rather talk now?"} <a href="tel:${NAP.tel}">${NAP.phone}</a></p>
  </div>
  <p class="disclaimer">${DISCLAIMER}${TAIL}</p>
</form>`;

    const ROWS = es
      ? { speed: "Rapidez", cert: "Certeza", rep: "Reparaciones", show: "Visitas", net: "Neto típico" }
      : { speed: "Speed", cert: "Certainty", rep: "Repairs", show: "Showings", net: "Typical net" };
    const compareCol = (h, sub, items) => `<div><h3>${h}</h3><p class="small">${sub}</p><ul>${items.map(([k, v]) => `<li><b>${k}</b>${v}</li>`).join("")}</ul></div>`;
    const compare = `<div class="compare">
      ${compareCol(es ? "Oferta en efectivo" : "Cash offer", es ? "De un proveedor externo" : "From a third-party provider", es ? [
        [ROWS.speed, "La fecha de cierre se acuerda con el proveedor y suele ser flexible."],
        [ROWS.cert, "Sujeta a la inspección y aprobación del proveedor; la cifra puede cambiar después de la inspección."],
        [ROWS.rep, "Vende tal como está; el proveedor puede descontar el costo de las reparaciones."],
        [ROWS.show, "Sin visitas abiertas; normalmente una inspección o un recorrido."],
        [ROWS.net, "Por lo general más bajo que en el mercado abierto, después de las tarifas del proveedor y los descuentos por reparaciones."],
      ] : [
        [ROWS.speed, "The closing date is set with the provider and is often flexible."],
        [ROWS.cert, "Subject to the provider's inspection and approval; the number can change after the inspection."],
        [ROWS.rep, "Sell as-is; the provider may deduct the cost of repairs."],
        [ROWS.show, "No open showings; usually one inspection or walkthrough."],
        [ROWS.net, "Usually lower than the open market, after the provider's fees and repair deductions."],
      ])}
      ${compareCol(es ? "Mercado abierto" : "Open market", es ? "Listada conmigo, frente a todos los compradores" : "Listed with me, in front of every buyer", es ? [
        [ROWS.speed, "Depende del precio, la condición y la temporada, más el financiamiento y el cierre del comprador."],
        [ROWS.cert, "Las ofertas suelen depender de la inspección, la tasación y el financiamiento del comprador."],
        [ROWS.rep, "Usted decide; una buena preparación puede subir el precio."],
        [ROWS.show, "Sí, coordinadas alrededor de su horario."],
        [ROWS.net, "Por lo general el precio más alto que paga el mercado, menos comisión y costos de cierre."],
      ] : [
        [ROWS.speed, "Depends on price, condition and season, plus the buyer's financing and closing."],
        [ROWS.cert, "Offers usually depend on the buyer's inspection, appraisal and financing."],
        [ROWS.rep, "Your call; good preparation can raise the price."],
        [ROWS.show, "Yes, scheduled around you."],
        [ROWS.net, "Usually the highest price the market will pay, less commission and closing costs."],
      ])}
    </div>`;

    const steps = es ? [
      ["Usted lo solicita", "Dirección, tipo de propiedad, condición y calendario, en un formulario corto."],
      ["Yo preparo los dos números", "Reviso ventas comparables recientes y la competencia activa para un estimado del mercado abierto, y solicito una oferta a un comprador externo si su casa encaja con sus criterios."],
      ["Los vemos lado a lado", "Precio, tarifas, reparaciones, fechas y neto estimado de cada camino, en una sola página. En persona, por teléfono o por video."],
      ["Usted decide", "Aceptar la oferta, vender en el mercado abierto o no hacer nada. Sin compromiso."],
    ] : [
      ["You request it", "Address, property type, condition and timeline, in one short form."],
      ["I prepare both numbers", "I pull recent comparable sales and active competition for an open-market estimate, and request an offer from a third-party buyer if your home fits its criteria."],
      ["We review them side by side", "Price, fees, repairs, dates and estimated net for each path, on one page. In person, by phone or by video."],
      ["You decide", "Accept the offer, list on the open market, or do nothing at all. No obligation."],
    ];

    const fitYes = es ? [
      "Necesita una fecha de cierre conocida, por una mudanza, un trabajo nuevo o una herencia.",
      "La casa necesita trabajo que usted prefiere no hacer.",
      "Quiere evitar visitas, por ejemplo con inquilinos o mascotas en casa.",
      "Es una casa unifamiliar, un condominio o un townhouse dentro del área y el rango de precio de un proveedor.",
    ] : [
      "You need a known closing date because of a move, a new job or an inherited property.",
      "The home needs work you'd rather not take on.",
      "You want to avoid showings, for example with tenants or pets at home.",
      "It's a single-family, condo or townhome within a provider's area and price range.",
    ];
    const fitNo = es ? [
      "Las casas multifamiliares de 2 a 4 unidades a menudo no califican para estos programas de compra en efectivo.",
      "Problemas estructurales mayores, propiedades poco comunes o terrenos grandes suelen quedar fuera de los criterios.",
      "La condición y la ubicación pesan mucho: algunos pueblos o calles no están en el área de un proveedor.",
      "Si tiene tiempo y su prioridad es el precio más alto, el mercado abierto suele dejarle más.",
    ] : [
      "2–4 family homes often don't qualify for these cash-buyer programs.",
      "Major structural issues, unusual properties or large lots usually fall outside the criteria.",
      "Condition and location matter a lot: some towns or streets aren't in a provider's area.",
      "If you have time and the highest price is the priority, the open market usually leaves you more.",
    ];

    const body = `
${hero}

<section class="section paper" id="request" aria-labelledby="request-h">
  <div class="wrap split rev top">
    <div>${form}</div>
    <div>
      <span class="label">${es ? "Dos números, una página" : "Two numbers, one page"}</span>
      <h2 id="request-h">${es ? "Vea las dos opciones antes de elegir una." : "See both options before you choose one."}</h2>
      <p class="lede" style="margin-top:18px">${es
        ? "Una oferta en efectivo puede ser la decisión correcta. También puede dejar dinero en la mesa. La única forma de saberlo es ponerla junto a lo que su casa probablemente lograría en el mercado abierto."
        : "A cash offer can be the right call. It can also leave money on the table. The only way to know is to put it next to what your home would likely bring on the open market."}</p>
      <ul class="ticks">
        <li><b>${es ? "Un estimado del mercado abierto" : "An open-market estimate"}</b> ${es ? "con las ventas comparables a la vista." : "with the comparable sales in view."}</li>
        <li><b>${es ? "Una oferta en efectivo de un tercero" : "A third-party cash offer"}</b> ${es ? "cuando su casa encaja con los criterios del proveedor." : "when your home fits the provider's criteria."}</li>
        <li><b>${es ? "El neto estimado de cada camino" : "The estimated net of each path"}</b> ${es ? "después de tarifas, reparaciones y costos." : "after fees, repairs and costs."}</li>
      </ul>
      <div style="margin-top:36px">${figures(lang)}</div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="how-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "Cómo funciona" : "How it works"}</span><h2 id="how-h">${es ? "Cuatro pasos, siempre en el mismo orden." : "Four steps, always in the same order."}</h2></div>
    <p class="lede">${es ? "Yo no compro casas. Preparo los números para que usted compare y decida." : "I don't buy homes. I prepare the numbers so you can compare and decide."}</p></div>
    <ol class="steps">${steps.map(([b, p]) => `<li><b>${b}</b><p>${p}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="section stone" aria-labelledby="cmp-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "La comparación" : "The comparison"}</span><h2 id="cmp-h">${es ? "Oferta en efectivo vs. mercado abierto." : "Cash offer vs. open market."}</h2></div>
    <p class="lede">${es ? "Ninguno es mejor siempre. Esto es lo que cada camino suele significar; su comparación usa las cifras reales de su casa." : "Neither wins every time. Here is what each path usually means; your comparison uses the real figures for your home."}</p></div>
    ${compare}
  </div>
</section>

<section class="section" aria-labelledby="fit-h">
  <div class="wrap split">
    ${arch(P.cashSide, lang)}
    <div>
      <span class="label">${es ? "Para quién es" : "Who it fits"}</span>
      <h2 id="fit-h">${es ? "Cuándo una oferta en efectivo tiene sentido, y cuándo no." : "When a cash offer makes sense, and when it doesn't."}</h2>
      <div class="fit" style="margin-top:28px">
        <div><h3>${es ? "Suele encajar" : "Often a fit"}</h3><ul class="ticks">${fitYes.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div><h3>${es ? "Suele no encajar" : "Often not a fit"}</h3><ul class="ticks">${fitNo.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      </div>
    </div>
  </div>
</section>

<section class="section paper" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "Preguntas" : "Questions"}</span><h2 id="faq-h">${es ? "Respuestas claras." : "Answered plainly."}</h2></div></div>
    ${faqHtml(FAQ)}
  </div>
</section>

<section class="section dark cta-final on-dark" aria-labelledby="cta-h">
  <div class="wrap">
    <span class="label">${es ? "Su decisión" : "Your decision"}</span>
    <h2 id="cta-h">${es ? "Conozca los dos números antes de decidir." : "Know both numbers before you decide."}</h2>
    <p class="lede" style="margin-top:18px">${es ? "Sin costo, sin compromiso y en el idioma que usted prefiera." : "Free, with no obligation, in English or Spanish."}</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="#request">${es ? "Solicitar mi comparación" : "Request my cash offer comparison"}</a>
      <a class="btn btn-ghost" href="tel:${NAP.tel}">${es ? "Llamar al" : "Call"} ${NAP.phone}</a>
    </div>
    <p class="small">${es ? "¿Solo quiere saber cuánto vale su casa?" : "Only want to know what your home is worth?"} <a href="${es ? "/es/valor-de-mi-casa" : "/home-value"}">${es ? "Pida su análisis de mercado gratis" : "Get a free market analysis"}</a>.</p>
  </div>
</section>`;

    return {
      lang, path: pathNow, altPath, title, description, navCurrent: pathNow, ogImage: "/og-sellers.jpg",
      head: PAGE_CSS, body,
      foot: { disclaimer: DISCLAIMER, credits: credits(P.cashHero, P.cashSide) },
      schema: [
        breadcrumb([[es ? "Inicio" : "Home", es ? "/es" : "/"], [here, pathNow]]),
        {
          "@type": "Service", "@id": abs(pathNow) + "#service",
          name: es ? "Comparación de oferta en efectivo y mercado abierto" : "Cash offer and open-market comparison",
          serviceType: es ? "Asesoría para vendedores de vivienda" : "Home seller advisory",
          description: es
            ? "Solicitud de una oferta en efectivo de un proveedor externo, comparada con un estimado del mercado abierto preparado por un agente con licencia. El agente no es el comprador."
            : "Request for a cash offer from a third-party provider, compared with an open-market estimate prepared by a licensed agent. The agent is not the buyer.",
          provider: agentRef, areaServed, availableLanguage: ["en", "es"], url: abs(pathNow),
        },
        faqPage(abs(pathNow) + "#faq", FAQ),
      ],
      sitemap: { priority: "0.9", changefreq: "monthly" },
    };
  }

  /* =====================================================================
     HOME VALUE
     ===================================================================== */
  function homeValue(lang) {
    const es = lang === "es";
    const pathNow = es ? "/es/valor-de-mi-casa" : "/home-value";
    const altPath = es ? "/home-value" : "/es/valor-de-mi-casa";
    const here = es ? "Valor de su casa" : "Home value";

    const DISCLAIMER = es
      ? "Las cifras del área son el valor típico de vivienda de Zillow (ZHVI) para el pueblo o el condado: no son el valor de su casa. Un análisis comparativo de mercado es la opinión de precio de un agente con licencia, no una tasación, y no está destinado a fines de préstamo."
      : "Area figures are Zillow's typical home value (ZHVI) for the town or county, not your home's value. A comparative market analysis is a licensed agent's opinion of price, not an appraisal, and is not intended for lending purposes.";

    const title = es
      ? "¿Cuánto vale mi casa? Análisis de mercado gratis | Merrimack Valley y sur de NH"
      : "What is my home worth? Free market analysis | Merrimack Valley & Southern NH";
    const description = es
      ? "Pida un análisis comparativo de mercado gratis para su casa en Lawrence, Methuen, Haverhill, Lowell, Nashua, Salem NH y pueblos cercanos. Vea el valor típico de su pueblo al instante."
      : "Get a free comparative market analysis for your home in Lawrence, Methuen, Haverhill, Lowell, Nashua, Salem NH and nearby towns, and see your town's typical value right away.";

    const FAQ = es ? [
      ["¿Esto es una tasación?", "No. Un análisis comparativo de mercado es mi opinión de precio como agente con licencia, basada en ventas comparables y en la competencia activa. Una tasación la hace un tasador con licencia, normalmente para un préstamo."],
      ["¿La cifra que aparece es el valor de mi casa?", "No. Es el valor típico de vivienda de Zillow para su pueblo o condado: una cifra del área. El valor de su casa depende de su tamaño, condición, mejoras y calle, y eso es lo que mide el análisis."],
      ["¿Tiene algún costo o me obliga a vender?", "No tiene costo ni compromiso. Muchas personas lo piden para refinanciar, para planificar o simplemente por curiosidad."],
      ["¿Cuánto tarda?", "Le respondo personalmente, normalmente el mismo día. El análisis por escrito depende de cuántas ventas comparables haya y de si hacemos un recorrido de la casa."],
      ["¿Necesita ver la casa por dentro?", "No es obligatorio, pero ayuda. Las mejoras, la condición y la distribución no aparecen en los registros públicos; un recorrido corto hace el rango más preciso."],
      ["¿Puedo recibirlo en español?", "Sí. La conversación y el análisis por escrito pueden ser completamente en español."],
    ] : [
      ["Is this an appraisal?", "No. A comparative market analysis is my opinion of price as a licensed agent, built from comparable sales and active competition. An appraisal is done by a licensed appraiser, usually for a lender."],
      ["Is the figure shown my home's value?", "No. It's Zillow's typical home value for your town or county: an area figure. Your home's value depends on its size, condition, updates and street, and that is what the analysis measures."],
      ["Does it cost anything, or commit me to selling?", "There's no cost and no obligation. Plenty of people ask for one to refinance, to plan ahead, or simply out of curiosity."],
      ["How long does it take?", "I reply personally, usually the same day. The written analysis depends on how many comparable sales there are and whether we do a walkthrough."],
      ["Do you need to see the inside?", "It isn't required, but it helps. Updates, condition and layout don't show up in public records; a short walkthrough makes the range more accurate."],
      ["Can I get it in Spanish?", "Yes. The conversation and the written analysis can be entirely in Spanish."],
    ];

    const num = (id, name, detail, label, max) => `<div class="field"><label for="${id}">${label} <span class="opt">${es ? "(opcional)" : "(optional)"}</span></label><select id="${id}" name="${name}" data-detail="${detail}">${option("", "—")}${Array.from({ length: max }, (_, i) => i + 1).map((n) => option(String(n), n === max ? n + "+" : String(n))).join("")}</select></div>`;

    const form = `
<form class="form" id="value-form" data-lead data-source="home_value" data-type="seller" data-label="Website — Home value (CMA) request" novalidate>
  <div class="fields">
    <h2>${es ? "Pida su análisis gratis" : "Get your free analysis"}</h2>
    <p class="sub">${es ? "Un rango por escrito, con los comparables a la vista." : "A written range, with the comparables in view."}</p>
    <div class="field"><label for="hv-address">${es ? "Dirección de la propiedad" : "Property address"}</label><input id="hv-address" name="address" autocomplete="street-address" required></div>
    <div class="field"><label for="hvTown">${es ? "Pueblo" : "Town"}</label><select id="hvTown" name="town" data-towns>${option("", es ? "Elija su pueblo" : "Choose your town")}</select></div>
    <fieldset><legend>${es ? "Tipo de propiedad" : "Property type"}</legend>${radios("ptype", "Property type", PTYPES(es))}</fieldset>
    <div class="row2">${num("hv-beds", "beds", "Beds", es ? "Habitaciones" : "Beds", 6)}${num("hv-baths", "baths", "Baths", es ? "Baños" : "Baths", 4)}</div>
    <fieldset><legend>${es ? "¿Para qué lo necesita?" : "What's it for?"}</legend>${radios("reason", "Reason", es ? [
      ["Selling soon", "Pienso vender pronto"], ["Refinancing", "Refinanciar"], ["Curious", "Por curiosidad"], ["Planning to buy and sell", "Comprar y vender"],
    ] : [
      ["Selling soon", "Selling soon"], ["Refinancing", "Refinancing"], ["Curious", "Just curious"], ["Planning to buy and sell", "Planning to buy and sell"],
    ], "seg wide")}</fieldset>
    <div class="field"><label for="hv-time">${es ? "¿Cuándo podría vender?" : "When might you sell?"}</label><select id="hv-time" name="timeframe" data-detail="Timeframe">${option("", es ? "Elija uno" : "Choose one")}${TIMEFRAMES(es).map(([v, t]) => option(v, t)).join("")}</select></div>
    ${contactFields("hv", es)}
    ${consent(lang)}
    ${honeypot}
    <button class="btn btn-primary" type="submit">${es ? "Obtener el valor de mi casa" : "Get my home value"}</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
  </div>
  <div class="done">
    <h3>${es ? "Gracias, ya lo recibí." : "Thank you, I have it."}</h3>
    <p>${es
      ? "Voy a revisar las ventas comparables y la competencia activa cerca de su dirección, y le escribo personalmente, normalmente el mismo día, para confirmar los detalles y enviarle su rango por escrito."
      : "I'll review the comparable sales and active competition near your address and reach out personally, usually the same day, to confirm the details and send your written range."}</p>
    <p class="fine">${es ? "¿Prefiere hablar ahora?" : "Rather talk now?"} <a href="tel:${NAP.tel}">${NAP.phone}</a></p>
  </div>
  <p class="disclaimer">${DISCLAIMER}</p>
</form>`;

    const bg = P.valueBg ? `${ctx.img(P.valueBg, { lang, sizes: "100vw", eager: true, cls: "bg", alt: "" })}<div class="veil"></div>` : "";

    const cma = es ? [
      ["Ventas comparables", "Casas parecidas vendidas recientemente cerca de la suya, con precio, fecha y diferencias."],
      ["Competencia activa", "Lo que está a la venta hoy: lo que verán los compradores al mismo tiempo que su casa."],
      ["Precio por pie cuadrado", "Cómo se compara su casa por tamaño con las ventas y los listados del área."],
      ["Ajustes por condición", "Cocina, baños, techo, sistemas, sótano terminado y estacionamiento, con su efecto en el precio."],
      ["Un rango por escrito", "Conservador, recomendado y optimista, con el razonamiento detrás de cada cifra."],
    ] : [
      ["Comparable sales", "Similar homes sold recently near yours, with price, date and the differences that matter."],
      ["Active competition", "What's for sale today: the homes buyers will see alongside yours."],
      ["Price per square foot", "How your home compares by size with nearby sales and listings."],
      ["Condition adjustments", "Kitchen, baths, roof, systems, finished basement and parking, and what each does to price."],
      ["A written range", "Conservative, recommended and optimistic, with the reasoning behind each number."],
    ];
    const trio = es ? [
      ["Conservador", "Debajo de los comparables. Atrae más interés rápido, pero puede dejar dinero en la mesa."],
      ["Recomendado", "Respaldado por los datos. Balancea la rapidez y el techo de precio.", true],
      ["Optimista", "Sobre los comparables. Prueba el techo; el riesgo es una casa que se queda en el mercado."],
    ] : [
      ["Conservative", "Below the comparables. Draws interest fast, but may leave money on the table."],
      ["Recommended", "Supported by the data. Balances speed and price ceiling.", true],
      ["Optimistic", "Above the comparables. Tests the top; the risk is a listing that sits."],
    ];
    const miss = es ? [
      ["No ven el interior", "Una cocina renovada, un sótano terminado o un techo nuevo rara vez aparecen en los registros públicos."],
      ["Los registros se atrasan", "Mejoras recientes, unidades agregadas o cambios de uso tardan en reflejarse, si es que se reflejan."],
      ["Pocas ventas, más margen de error", "En pueblos pequeños o con casas muy distintas entre sí, un modelo automático tiene menos con qué comparar."],
      ["La calle importa", "Dos casas iguales a pocas cuadras pueden venderse a precios distintos por la calle, el lote o la vista."],
    ] : [
      ["They can't see inside", "A renovated kitchen, a finished basement or a new roof rarely shows up in public records."],
      ["Records lag", "Recent updates, added units or changes in use take time to appear, if they appear at all."],
      ["Few sales, wider error", "In smaller towns, or where homes differ a lot, an automated model has less to compare against."],
      ["The street matters", "Two similar homes a few blocks apart can sell for different prices because of the street, the lot or the view."],
    ];

    const body = `
<section class="hero-split on-dark" aria-labelledby="hv-h">${bg}
  <div class="wrap">
    <div>
      ${crumbs(lang, here)}
      <span class="label" style="margin-top:22px">${es ? "Valor de su casa · Merrimack Valley y sur de NH" : "Home value · Merrimack Valley & Southern NH"}</span>
      <h1 id="hv-h">${es ? "¿Cuánto vale su casa hoy?" : "What is your home worth today?"}</h1>
      <p class="lede">${es
        ? "Un análisis comparativo de mercado gratis, preparado por mí con ventas recientes de su zona, no por un algoritmo. Elija su pueblo para ver ahora mismo el valor típico del área."
        : "A free comparative market analysis, prepared by me from recent sales near you, not by an algorithm. Choose your town to see the area's typical value right now."}</p>
      <div class="value-card" data-town-value="#hvTown" hidden aria-live="polite">
        <span class="k">${es ? "Valor típico de vivienda" : "Typical home value"} · <span data-tv-town></span></span>
        <b data-tv-out></b>
        <p class="small" data-tv-note></p>
      </div>
      <p class="tv-hint">${es
        ? "Elija su pueblo en el formulario y aquí verá el valor típico de vivienda del área según Zillow. Es una cifra del área; su análisis mide su casa."
        : "Choose your town in the form and the area's typical home value from Zillow appears here. It's an area figure; your analysis measures your home."}</p>
    </div>
    <div>${form}</div>
  </div>
</section>

<section class="section tight paper"><div class="wrap">${figures(lang)}</div></section>

<section class="section" aria-labelledby="cma-h">
  <div class="wrap split">
    ${arch(P.valueSide, lang)}
    <div>
      <span class="label">${es ? "Su análisis" : "Your analysis"}</span>
      <h2 id="cma-h">${es ? "Lo que incluye su análisis de mercado." : "What's in your market analysis."}</h2>
      <ul class="ticks">${cma.map(([b, p]) => `<li><b>${b}.</b> ${p}</li>`).join("")}</ul>
    </div>
  </div>
</section>

<section class="section stone" aria-labelledby="range-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "El rango" : "The range"}</span><h2 id="range-h">${es ? "Tres precios, una conversación honesta." : "Three prices, one honest conversation."}</h2></div>
    <p class="lede">${es ? "Cada cifra viene con los comparables que la respaldan. El precio lo decidimos juntos." : "Each number comes with the comparables behind it. We set the price together."}</p></div>
    <div class="trio">${trio.map(([b, p, f]) => `<div${f ? ' class="featured"' : ""}><b>${b}</b><p>${p}</p></div>`).join("")}</div>
  </div>
</section>

<section class="section" aria-labelledby="miss-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "Estimados en línea" : "Online estimates"}</span><h2 id="miss-h">${es ? "Por qué los estimados en línea a veces fallan." : "Why online estimates can miss."}</h2></div>
    <p class="lede">${es ? "Los modelos automáticos son un buen punto de partida. Pero trabajan con registros públicos, no con su casa." : "Automated models are a useful starting point. But they work from public records, not from your home."}</p></div>
    <ol class="steps">${miss.map(([b, p]) => `<li><b>${b}</b><p>${p}</p></li>`).join("")}</ol>
    <p class="lede" style="margin-top:36px">${es ? "Si un estimado en línea no coincide con el mío, ahí es exactamente donde vale la pena conversar." : "If an online estimate disagrees with mine, that's exactly where we should talk."}</p>
  </div>
</section>

<section class="section paper mkt-wrap" aria-labelledby="mkt-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "Su mercado local" : "Your local market"}</span><h2 id="mkt-h">${es ? "Su pueblo, esta semana." : "Your town, this week."}</h2></div>
    <p class="lede">${es ? "Tasas, valor típico, pronóstico, días en el mercado e inventario, de fuentes públicas que se actualizan cada semana." : "Rates, typical value, forecast, days on market and inventory, from public sources refreshed every week."}</p></div>
    <div id="hv-market" data-market="compact" data-market-src="/market.json"></div>
  </div>
</section>

<section class="section tight" aria-labelledby="band-h">
  <div class="wrap">
    <div class="band">
      <div><h2 id="band-h">${es ? "¿Está considerando una oferta en efectivo?" : "Considering a cash offer?"}</h2>
      <p>${es ? "Compárela con lo que su casa probablemente lograría en el mercado abierto antes de firmar nada." : "Compare it with what your home would likely bring on the open market before you sign anything."}</p></div>
      <a class="btn btn-ghost" href="${es ? "/es/oferta-en-efectivo" : "/cash-offer"}">${es ? "Comparar una oferta en efectivo" : "Compare a cash offer"}</a>
    </div>
  </div>
</section>

<section class="section paper" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="head"><div><span class="label">${es ? "Preguntas" : "Questions"}</span><h2 id="faq-h">${es ? "Respuestas claras." : "Answered plainly."}</h2></div></div>
    ${faqHtml(FAQ)}
  </div>
</section>

<section class="section dark cta-final on-dark" aria-labelledby="cta-h">
  <div class="wrap">
    <span class="label">${es ? "El siguiente paso" : "Next step"}</span>
    <h2 id="cta-h">${es ? "Su casa, medida con los números de su calle." : "Your home, measured against your street."}</h2>
    <p class="lede" style="margin-top:18px">${es ? "Gratis, sin compromiso y en el idioma que usted prefiera." : "Free, with no obligation, in English or Spanish."}</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="#value-form">${es ? "Obtener el valor de mi casa" : "Get my home value"}</a>
      <a class="btn btn-ghost" href="${LINKS.book}" target="_blank" rel="noopener">${es ? "Reservar una llamada" : "Book a call"}</a>
    </div>
  </div>
</section>`;

    // Pre-select the market block's town from ?town (runs during parse, before market.js renders),
    // label its select, and keep it in step with the form's town select.
    const script = `<script>(function(){var T=${JSON.stringify(marketTowns)},el=document.getElementById("hv-market");if(!el)return;
var w=(new URLSearchParams(location.search).get("town")||"").replace(/-/g," ").toLowerCase();
for(var i=0;i<T.length;i++){if(w&&(T[i][0].toLowerCase()===w||(T[i][0]+" "+T[i][1]).toLowerCase()===w)){el.setAttribute("data-market-town",T[i][0]);el.setAttribute("data-market-state",T[i][1]);break;}}
window.MARKET_ONREADY=function(){var m=el.querySelector(".mp-select"),f=document.getElementById("hvTown");if(!m)return;m.id="hv-mkt-town";var l=el.querySelector(".mp-pick label");if(l)l.setAttribute("for",m.id);
if(f&&!f._mk){f._mk=1;f.addEventListener("change",function(){var p=f.value.split(", "),k=p[0]+"|"+p[1],s=el.querySelector(".mp-select");if(!s)return;for(var j=0;j<s.options.length;j++)if(s.options[j].value===k){s.value=k;s.dispatchEvent(new Event("change"));break;}});}};})();</script>
<script src="/market.js" defer></script>`;

    return {
      lang, path: pathNow, altPath, title, description, navCurrent: pathNow, ogImage: "/og-sellers.jpg",
      head: `<link rel="stylesheet" href="/market.css">${PAGE_CSS}`, body, scripts: script,
      foot: { disclaimer: DISCLAIMER, credits: credits(P.valueBg, P.valueSide) },
      schema: [
        breadcrumb([[es ? "Inicio" : "Home", es ? "/es" : "/"], [here, pathNow]]),
        {
          "@type": "Service", "@id": abs(pathNow) + "#service",
          name: es ? "Análisis comparativo de mercado gratis" : "Free comparative market analysis",
          serviceType: es ? "Análisis comparativo de mercado (CMA)" : "Comparative market analysis (CMA)",
          description: es
            ? "Opinión de precio por escrito de un agente con licencia, basada en ventas comparables, competencia activa y la condición de la casa. No es una tasación."
            : "A written opinion of price from a licensed agent, based on comparable sales, active competition and the home's condition. Not an appraisal.",
          provider: agentRef, areaServed, availableLanguage: ["en", "es"], url: abs(pathNow),
        },
        faqPage(abs(pathNow) + "#faq", FAQ),
      ],
      sitemap: { priority: "0.9", changefreq: "monthly" },
    };
  }

  return [cashOffer("en"), cashOffer("es"), homeValue("en"), homeValue("es")];
}
