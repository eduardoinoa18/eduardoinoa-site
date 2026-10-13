/* Market Pulse — renders market.json into any page. Modes: full (website), compact (decks), town (town pages), mini (hub).
   Usage: <div data-market="full" data-market-src="market.json"></div>  + window.MARKET_FALLBACK (baked at build).
   Bilingual via window.__lang() if present (returns "en"|"es"), otherwise document.documentElement.lang. */
(function(){
  var W = window, D = document;
  function lang(){ try { if (W.__lang) return W.__lang(); } catch(_){} return (D.documentElement.lang||"en").slice(0,2) === "es" ? "es" : "en"; }
  function T(en, es){ return lang() === "es" ? es : en; }
  var MONTHS = {en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], es:["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]};
  function mon(d){ if (!d) return ""; var p = String(d).split("-"); var m = MONTHS[lang()][(+p[1]||1)-1]; return m + " " + p[0]; }
  function money(v){ return v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US"); }
  function kmoney(v){ if (v == null) return "—"; return v >= 1e6 ? "$" + (v/1e6).toFixed(2).replace(/0$/,"") + "M" : "$" + Math.round(v/1000) + "K"; }
  function sgn(v, suf){ if (v == null || isNaN(v)) return "—"; return (v > 0 ? "+" : "") + (Math.round(v*10)/10) + (suf||"%"); }
  function cls(v){ return v == null ? "" : v > 0.05 ? "up" : v < -0.05 ? "dn" : "flat"; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function h(s){ return s.join(""); }

  function load(src, cb){
    var fb = W.MARKET_FALLBACK || null;
    if (!src || !W.fetch || location.protocol === "file:") return cb(fb);
    fetch(src, {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ cb(j && j.towns ? j : fb); }).catch(function(){ cb(fb); });
  }

  /* ---------- pieces ---------- */
  function rates(M){
    var a = M.rates && M.rates.fixed30, b = M.rates && M.rates.fixed15; if (!a) return "";
    function one(r, lbl){ if (!r) return ""; var d = r.rate - (r.prev||r.rate), y = r.rate - (r.yearAgo||r.rate);
      return '<div class="mp-rate"><span class="mp-lbl">' + lbl + '</span><b>' + r.rate.toFixed(2) + '%</b><span class="mp-sub"><i class="' + cls(-d) + '">' + sgn(d," pts") + '</i> ' + T("vs last week","vs semana pasada") + ' · <i class="' + cls(-y) + '">' + sgn(y," pts") + '</i> ' + T("vs a year ago","vs hace un año") + '</span></div>'; }
    return '<div class="mp-rates">' + one(a, T("30-year fixed","Fija a 30 años")) + one(b, T("15-year fixed","Fija a 15 años")) + '<div class="mp-rate mp-rate-note"><span class="mp-lbl">' + T("Freddie Mac weekly average","Promedio semanal Freddie Mac") + '</span><b class="mp-small">' + mon(a.asOf).replace(/^(\w+) /, function(m,x){ return x + " " + (a.asOf.split("-")[2]||"") + ", "; }) + '</b><span class="mp-sub">' + T("Your rate depends on credit, down payment and points.","Su tasa depende de crédito, enganche y puntos.") + '</span></div></div>';
  }

  function stateCard(code, S){
    var z = S.zillow && S.zillow.zhvi, f = S.zillow && S.zillow.forecast, r = S.realtor || {}, rf = S.redfin;
    return h(['<div class="mp-card">',
      '<div class="mp-card-h"><b>', esc(S.name), '</b><span>', T("Statewide","Todo el estado"), '</span></div>',
      '<div class="mp-big"><span class="mp-lbl">', T("Typical home value","Valor típico de vivienda"), '</span><b>', money(z && z.value), '</b><span class="mp-sub"><i class="', cls(z && z.yoy), '">', sgn(z && z.yoy), '</i> ', T("year over year","año a año"), ' · ', mon(z && z.asOf), '</span></div>',
      '<div class="mp-grid">',
        f && f.y1 ? '<div><span class="mp-lbl">' + T("12-month forecast","Pronóstico 12 meses") + '</span><b class="' + cls(f.y1.pct) + '">' + sgn(f.y1.pct) + '</b><span class="mp-sub">Zillow · ' + esc(S.zillow.forecastRegion || "") + '</span></div>' : "",
        r.medianList ? '<div><span class="mp-lbl">' + T("Median list price","Precio de lista mediano") + '</span><b>' + kmoney(r.medianList.v) + '</b><span class="mp-sub"><i class="' + cls(r.medianList.yoy) + '">' + sgn(r.medianList.yoy) + '</i> ' + T("YoY","anual") + ' · ' + mon(r.medianList.asOf) + '</span></div>' : "",
        r.dom ? '<div><span class="mp-lbl">' + T("Days on market","Días en el mercado") + '</span><b>' + r.dom.v + '</b><span class="mp-sub">' + T("was ","antes ") + r.dom.yearAgo + T(" a year ago"," hace un año") + '</span></div>' : "",
        r.activeListings ? '<div><span class="mp-lbl">' + T("Active listings","Listados activos") + '</span><b>' + r.activeListings.v.toLocaleString("en-US") + '</b><span class="mp-sub"><i class="' + cls(r.activeListings.yoy) + '">' + sgn(r.activeListings.yoy) + '</i> ' + T("YoY","anual") + '</span></div>' : "",
        rf && rf.saleToList ? '<div><span class="mp-lbl">' + T("Sale-to-list","Venta vs. lista") + '</span><b>' + rf.saleToList.toFixed(1) + '%</b><span class="mp-sub">' + (rf.soldAboveList != null ? Math.round(rf.soldAboveList) + T("% sold above asking","% vendidas sobre el precio") : "") + ' · ' + mon(rf.periodEnd) + '</span></div>' : "",
        rf && rf.monthsSupply != null ? '<div><span class="mp-lbl">' + T("Months of supply","Meses de inventario") + '</span><b>' + rf.monthsSupply + '</b><span class="mp-sub">' + (rf.monthsSupply < 3 ? T("seller's market","mercado de vendedor") : rf.monthsSupply <= 6 ? T("balanced","balanceado") : T("buyer's market","mercado de comprador")) + '</span></div>' : "",
      '</div></div>']);
  }

  function townRows(M, st){
    return M.towns.filter(function(t){ return t.state === st; }).map(function(t){
      var z = t.zillow && t.zillow.zhvi, f = t.zillow && t.zillow.forecast, r = t.redfin, c = M.counties && M.counties[t.county];
      var cr = c && c.realtor && c.realtor.dom;
      return '<tr><th scope="row"><b>' + esc(t.name) + '</b><span>' + esc(T(t.county.replace(/ County.*/, " County"), "Condado de " + t.county.replace(/ County.*/, ""))) + '</span></th>' +
        '<td><b>' + money(z && z.value) + '</b><i class="' + cls(z && z.yoy) + '">' + sgn(z && z.yoy) + ' ' + T("YoY","anual") + '</i></td>' +
        '<td><b class="' + cls(f && f.y1 && f.y1.pct) + '">' + sgn(f && f.y1 && f.y1.pct) + '</b><i>' + T("12 mo · Zillow","12 m · Zillow") + '</i></td>' +
        '<td>' + (r ? '<b>' + money(r.medianSale) + '</b><i class="' + cls(r.medianSaleYoY) + '">' + sgn(r.medianSaleYoY) + ' ' + T("YoY","anual") + ' · ' + mon(r.periodEnd) + '</i>' : '<b>—</b><i>' + T("county: ","condado: ") + (c && c.redfin ? money(c.redfin.medianSale) : "—") + '</i>') + '</td>' +
        '<td>' + (r ? '<b>' + r.dom + '</b><i>' + T("days · ","días · ") + r.saleToList.toFixed(1) + '% ' + T("of asking","del precio") + '</i>' : '<b>' + (cr ? cr.v : "—") + '</b><i>' + T("days · county","días · condado") + '</i>') + '</td></tr>';
    }).join("");
  }

  function towns(M){
    var id = "mp" + Math.random().toString(36).slice(2,7);
    return h(['<div class="mp-towns" id="', id, '">',
      '<div class="mp-seg" role="group" aria-label="' + T("State","Estado") + '"><button type="button" class="on" aria-pressed="true" data-st="MA">Massachusetts</button><button type="button" aria-pressed="false" data-st="NH">New Hampshire</button></div>',
      '<div class="mp-tw"><table class="mp-table"><thead><tr><th>', T("Town","Pueblo"), '</th><th>', T("Typical value","Valor típico"), '</th><th>', T("Forecast","Pronóstico"), '</th><th>', T("Median sale","Venta mediana"), '</th><th>', T("Days on market","Días en el mercado"), '</th></tr></thead>',
      '<tbody data-st="MA">', townRows(M, "MA"), '</tbody><tbody data-st="NH" hidden>', townRows(M, "NH"), '</tbody></table></div></div>']);
  }

  function foot(M){
    var upd = M.updated ? M.updated.slice(0,10) : "";
    return '<p class="mp-foot">' + T("Updated weekly from public sources: Zillow Research (typical value and forecast), Realtor.com via FRED (list price, days on market, active listings), Redfin Data Center (sale metrics; published with a lag) and Freddie Mac (rates). Snapshot of ","Actualizado cada semana con fuentes públicas: Zillow Research (valor típico y pronóstico), Realtor.com vía FRED (precio de lista, días en el mercado, listados activos), Redfin Data Center (métricas de venta; se publica con retraso) y Freddie Mac (tasas). Corte del ") + upd + ". " + T("Area trends, not an appraisal — ask me for the comparables on your street.","Tendencias del área, no una tasación — pídame los comparables de su calle.") + '</p>';
  }

  /* ---------- modes ---------- */
  function full(M){
    return rates(M) + '<div class="mp-states">' + stateCard("MA", M.states.MA) + stateCard("NH", M.states.NH) + '</div>' + towns(M) + foot(M);
  }
  function compact(M, el){
    var pref = (el.getAttribute("data-market-town") || "").toLowerCase(), prefSt = el.getAttribute("data-market-state") || "MA";
    var opts = M.towns.map(function(t){ return '<option value="' + esc(t.name) + '|' + t.state + '"' + (t.name.toLowerCase() === pref && t.state === prefSt ? ' selected' : '') + '>' + esc(t.name) + ', ' + t.state + '</option>'; }).join("");
    var sid = "mpsel" + Math.random().toString(36).slice(2,7);
    return rates(M) + '<div class="mp-pick"><label class="mp-lbl" for="' + sid + '">' + T("Pick a town","Elija un pueblo") + '</label><select class="mp-select" id="' + sid + '">' + opts + '</select></div><div class="mp-town-detail"></div>' + foot(M);
  }
  function townDetail(M, key){
    var p = key.split("|"), t = M.towns.filter(function(x){ return x.name === p[0] && x.state === p[1]; })[0]; if (!t) return "";
    var z = t.zillow && t.zillow.zhvi, f = t.zillow && t.zillow.forecast, r = t.redfin, c = M.counties[t.county], S = M.states[t.state];
    var cr = c && c.realtor || {};
    return h(['<div class="mp-grid mp-grid-town">',
      '<div><span class="mp-lbl">', T("Typical value","Valor típico"), '</span><b>', money(z && z.value), '</b><span class="mp-sub"><i class="', cls(z && z.yoy), '">', sgn(z && z.yoy), '</i> ' + T("YoY","anual") + ' · <i class="', cls(z && z.fiveYear), '">', sgn(z && z.fiveYear), '</i> ', T("5 yr","5 años"), '</span></div>',
      f && f.y1 ? '<div><span class="mp-lbl">' + T("Zillow forecast","Pronóstico Zillow") + '</span><b class="' + cls(f.y1.pct) + '">' + sgn(f.y1.pct) + '</b><span class="mp-sub">' + T("next 12 months · ZIP ","próximos 12 meses · ZIP ") + (f.zips||[]).join(", ") + '</span></div>' : "",
      r ? '<div><span class="mp-lbl">' + T("Median sale price","Precio de venta mediano") + '</span><b>' + money(r.medianSale) + '</b><span class="mp-sub"><i class="' + cls(r.medianSaleYoY) + '">' + sgn(r.medianSaleYoY) + '</i> ' + T("YoY","anual") + ' · ' + mon(r.periodEnd) + '</span></div>' : (c && c.redfin ? '<div><span class="mp-lbl">' + T("Median sale · county","Venta mediana · condado") + '</span><b>' + money(c.redfin.medianSale) + '</b><span class="mp-sub">' + esc(t.county) + ' · ' + mon(c.redfin.periodEnd) + '</span></div>' : ""),
      r ? '<div><span class="mp-lbl">' + T("Days on market","Días en el mercado") + '</span><b>' + r.dom + '</b><span class="mp-sub">' + r.saleToList.toFixed(1) + '% ' + T("sale-to-list · ","venta vs. lista · ") + Math.round(r.soldAboveList) + T("% above asking","% sobre el precio") + '</span></div>' : (cr.dom ? '<div><span class="mp-lbl">' + T("Days on market · county","Días en el mercado · condado") + '</span><b>' + cr.dom.v + '</b><span class="mp-sub">' + T("was ","antes ") + cr.dom.yearAgo + T(" a year ago"," hace un año") + '</span></div>' : ""),
      cr.medianList ? '<div><span class="mp-lbl">' + T("County median list","Lista mediana · condado") + '</span><b>' + kmoney(cr.medianList.v) + '</b><span class="mp-sub"><i class="' + cls(cr.medianList.yoy) + '">' + sgn(cr.medianList.yoy) + '</i> ' + T("YoY","anual") + ' · ' + mon(cr.medianList.asOf) + '</span></div>' : "",
      cr.activeListings ? '<div><span class="mp-lbl">' + T("County active listings","Listados activos · condado") + '</span><b>' + cr.activeListings.v.toLocaleString("en-US") + '</b><span class="mp-sub"><i class="' + cls(cr.activeListings.yoy) + '">' + sgn(cr.activeListings.yoy) + '</i> ' + T("YoY","anual") + '</span></div>' : "",
      '</div>']);
  }
  /* Find a town; when the snapshot has no row for it (or no Zillow value), fall back to its county.
     Returns {town, county, countyName, S, fallback:boolean} or null. */
  function findTown(M, name, st, countyName){
    var t = (M.towns || []).filter(function(x){ return x.name.toLowerCase() === String(name).toLowerCase() && x.state === st; })[0] || null;
    var cn = (t && t.county) || countyName || "";
    var hasValue = !!(t && t.zillow && t.zillow.zhvi && t.zillow.zhvi.value);
    return { town: t, county: (M.counties || {})[cn] || null, countyName: cn, S: (M.states || {})[st] || null, fallback: !hasValue };
  }
  W.marketFindTown = findTown;

  /* Single-town panel for town pages: data-market="town" data-market-town="Lowell" data-market-state="MA" data-market-county="Middlesex County, MA" */
  function town(M, el){
    var name = el.getAttribute("data-market-town") || "", st = el.getAttribute("data-market-state") || "MA";
    var r = findTown(M, name, st, el.getAttribute("data-market-county"));
    if (!r.town && !r.county) return '<p class="mp-foot">' + T("Market data for this town is not available yet.","Los datos de este pueblo aún no están disponibles.") + '</p>' + foot(M);
    if (r.town && !r.fallback) return rates(M) + townDetail(M, r.town.name + "|" + r.town.state) + foot(M);
    /* County fallback: no town-level series in the public sources for this town. */
    var c = r.county || {}, z = c.zillow && c.zillow.zhvi, rf = c.redfin, cr = c.realtor || {};
    var note = '<p class="mp-foot mp-fallback">' + T("The public sources don't publish a separate series for ","Las fuentes públicas no publican una serie separada para ") + esc(name) + T(", so these are " + esc(r.countyName) + " figures. Ask me for the comparables on your street.",", así que estos son datos de " + esc(r.countyName) + ". Pídame los comparables de su calle.") + '</p>';
    return rates(M) + h(['<div class="mp-grid mp-grid-town">',
      '<div><span class="mp-lbl">', T("Typical value · county","Valor típico · condado"), '</span><b>', money(z && z.value), '</b><span class="mp-sub"><i class="', cls(z && z.yoy), '">', sgn(z && z.yoy), '</i> ' + T("YoY","anual") + ' · ', mon(z && z.asOf), '</span></div>',
      rf ? '<div><span class="mp-lbl">' + T("Median sale · county","Venta mediana · condado") + '</span><b>' + money(rf.medianSale) + '</b><span class="mp-sub"><i class="' + cls(rf.medianSaleYoY) + '">' + sgn(rf.medianSaleYoY) + '</i> ' + T("YoY","anual") + ' · ' + mon(rf.periodEnd) + '</span></div>' : "",
      rf ? '<div><span class="mp-lbl">' + T("Sale-to-list · county","Venta vs. lista · condado") + '</span><b>' + rf.saleToList.toFixed(1) + '%</b><span class="mp-sub">' + rf.dom + T(" median days on market"," días medianos en el mercado") + '</span></div>' : "",
      cr.medianList ? '<div><span class="mp-lbl">' + T("Median list · county","Lista mediana · condado") + '</span><b>' + kmoney(cr.medianList.v) + '</b><span class="mp-sub"><i class="' + cls(cr.medianList.yoy) + '">' + sgn(cr.medianList.yoy) + '</i> ' + T("YoY","anual") + ' · ' + mon(cr.medianList.asOf) + '</span></div>' : "",
      cr.activeListings ? '<div><span class="mp-lbl">' + T("Active listings · county","Listados activos · condado") + '</span><b>' + cr.activeListings.v.toLocaleString("en-US") + '</b><span class="mp-sub"><i class="' + cls(cr.activeListings.yoy) + '">' + sgn(cr.activeListings.yoy) + '</i> ' + T("YoY","anual") + '</span></div>' : "",
      rf && rf.monthsSupply != null ? '<div><span class="mp-lbl">' + T("Months of supply · county","Meses de inventario · condado") + '</span><b>' + rf.monthsSupply + '</b><span class="mp-sub">' + (rf.monthsSupply < 3 ? T("seller's market","mercado de vendedor") : rf.monthsSupply <= 6 ? T("balanced","balanceado") : T("buyer's market","mercado de comprador")) + '</span></div>' : "",
      '</div>']) + note + foot(M);
  }

  function mini(M){
    var a = M.rates && M.rates.fixed30, ma = M.states.MA.zillow.zhvi, nh = M.states.NH.zillow.zhvi, f = M.states.MA.zillow.forecast;
    return '<div class="mp-mini"><div><span>' + T("30-yr rate","Tasa 30 años") + '</span><b>' + (a ? a.rate.toFixed(2) + "%" : "—") + '</b></div><div><span>MA ' + T("typical","típico") + '</span><b>' + kmoney(ma && ma.value) + ' <i class="' + cls(ma && ma.yoy) + '">' + sgn(ma && ma.yoy) + '</i></b></div><div><span>NH ' + T("typical","típico") + '</span><b>' + kmoney(nh && nh.value) + ' <i class="' + cls(nh && nh.yoy) + '">' + sgn(nh && nh.yoy) + '</i></b></div></div>';
  }

  function render(el, M){
    if (!M) { el.innerHTML = '<p class="mp-foot">' + T("Market data is temporarily unavailable.","Datos del mercado no disponibles por el momento.") + '</p>'; return; }
    var mode = el.getAttribute("data-market") || "full";
    el.innerHTML = mode === "mini" ? mini(M) : mode === "compact" ? compact(M, el) : mode === "town" ? town(M, el) : full(M);
    el.querySelectorAll(".mp-seg button").forEach(function(b){ b.addEventListener("click", function(){
      el.querySelectorAll(".mp-seg button").forEach(function(x){ x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      el.querySelectorAll("tbody[data-st]").forEach(function(tb){ tb.hidden = tb.getAttribute("data-st") !== b.getAttribute("data-st"); }); postHeight(); }); });
    var sel = el.querySelector(".mp-select"); if (sel) { var det = el.querySelector(".mp-town-detail"); var upd = function(){ det.innerHTML = townDetail(M, sel.value); postHeight(); }; sel.addEventListener("change", upd); upd(); }
    el.classList.add("mp-ready");
    if (W.MARKET_ONREADY) try { W.MARKET_ONREADY(M); } catch(_){}
    postHeight();
  }

  /* Embedded in a sandboxed iframe (Marketora custom_html): report our height so the host can size the frame. */
  function postHeight(){
    /* Pages where the block is not the whole document (the decks) set window.MARKET_POST_HEIGHT = false. */
    if (W.parent === W || W.MARKET_POST_HEIGHT === false) return;
    /* Measure the blocks themselves: documentElement.scrollHeight never shrinks below the frame's current height. */
    var bottom = 0;
    D.querySelectorAll("[data-market]").forEach(function(el){ bottom = Math.max(bottom, el.getBoundingClientRect().bottom + (W.scrollY || 0)); });
    var mb = parseFloat(getComputedStyle(D.body).marginBottom) || 0;
    try { W.parent.postMessage({ type: "mk-embed-height", height: Math.ceil(bottom + mb) }, "*"); } catch(_){}
  }
  if (W.parent !== W) W.addEventListener("resize", postHeight);

  var cache = null;
  function boot(){
    var els = D.querySelectorAll("[data-market]"); if (!els.length) return;
    var src = els[0].getAttribute("data-market-src") || "market.json";
    load(src, function(M){ cache = M; W.MARKET = M; els.forEach(function(el){ render(el, M); }); });  }
  W.marketRerender = function(){ if (cache) D.querySelectorAll("[data-market]").forEach(function(el){ render(el, cache); }); };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
})();
