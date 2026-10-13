/* eduardoinoa.com — shared behaviour for inner pages (cash offer, home value, towns, listings, /es/).
   - Lead forms: <form data-lead data-source="home_value" data-type="seller"> ... posts JSON to the Marketora inbox
     (text/plain, no-cors). Success is shown only after fetch resolves; on a network error it falls back to mailto.
   - Consent: an UNCHECKED checkbox name="smsConsent"; its state is sent as payload.smsConsent (true/false).
   - Attribution: first-touch UTM params, referrer and landing page are kept for the session and sent with the lead.
   - Analytics: GA4 loads only when <meta name="ga4-id" content="G-..."> is non-empty; leads fire generate_lead {lead_source}.
   - Towns: <select data-towns> is filled from SITE.towns; ?town= pre-selects. [data-town-value] shows the typical value.
   Lead `source` values drive Marketora People Hub smart lists — never rename them. */
(function () {
  "use strict";
  var W = window, D = document;
  var SITE = W.SITE = Object.assign({
    agent: "Eduardo Inoa",
    handle: "eduardo-inoa",
    email: "inoaserv@gmail.com",
    leadInbox: "https://marketora.me/api/inbound/lead/XSbmOgfmponhUmAhkCw3DWAOu7GSpeoB",
    leadMail: "leads+XSbmOgfmponhUmAhkCw3DWAOu7GSpeoB@reply.marketora.me",
    marketSrc: "/market.json",
    towns: [
      ["Methuen", "MA", "Essex County, MA"], ["Lawrence", "MA", "Essex County, MA"], ["Haverhill", "MA", "Essex County, MA"],
      ["Andover", "MA", "Essex County, MA"], ["North Andover", "MA", "Essex County, MA"], ["Dracut", "MA", "Middlesex County, MA"],
      ["Tewksbury", "MA", "Middlesex County, MA"], ["Lowell", "MA", "Middlesex County, MA"], ["Tyngsborough", "MA", "Middlesex County, MA"],
      ["Chelmsford", "MA", "Middlesex County, MA"], ["Westford", "MA", "Middlesex County, MA"], ["Salem", "NH", "Rockingham County, NH"],
      ["Windham", "NH", "Rockingham County, NH"], ["Pelham", "NH", "Hillsborough County, NH"], ["Nashua", "NH", "Hillsborough County, NH"],
      ["Derry", "NH", "Rockingham County, NH"], ["Londonderry", "NH", "Rockingham County, NH"], ["Hudson", "NH", "Hillsborough County, NH"],
      ["Atkinson", "NH", "Rockingham County, NH"], ["Plaistow", "NH", "Rockingham County, NH"]
    ]
  }, W.SITE || {});

  var LANG = (D.documentElement.lang || "en").slice(0, 2) === "es" ? "es" : "en";
  function T(en, es) { return LANG === "es" ? es : en; }
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) { return null; } }

  /* ---------- header ---------- */
  var menu = $(".menu-btn"), nav = $(".site-nav");
  if (menu && nav) menu.addEventListener("click", function () {
    var open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open));
  });

  /* ---------- attribution (first touch per session) ---------- */
  var params = new URLSearchParams(location.search);
  var attrib = store("ei_attrib");
  if (!attrib) {
    attrib = { landing: location.pathname, referrer: D.referrer ? D.referrer.slice(0, 300) : "" };
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) {
      var v = params.get(k); if (v) attrib[k] = v.slice(0, 120);
    });
    store("ei_attrib", attrib);
  }

  /* ---------- analytics (GA4, only when an ID is configured) ---------- */
  var gaMeta = $('meta[name="ga4-id"]'), GA = gaMeta && gaMeta.content.trim();
  if (GA && /^G-[A-Z0-9]+$/.test(GA)) {
    W.dataLayer = W.dataLayer || []; W.gtag = function () { W.dataLayer.push(arguments); };
    W.gtag("js", new Date()); W.gtag("config", GA);
    var s = D.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA); D.head.appendChild(s);
  }
  function track(name, data) { try { if (W.gtag) W.gtag("event", name, data || {}); } catch (_) {} }
  W.siteTrack = track;

  /* ---------- towns ---------- */
  var wantTown = (params.get("town") || "").replace(/-/g, " ").toLowerCase();
  $$("select[data-towns]").forEach(function (sel) {
    var groups = { MA: "Massachusetts", NH: "New Hampshire" };
    Object.keys(groups).forEach(function (st) {
      var og = D.createElement("optgroup"); og.label = groups[st];
      SITE.towns.filter(function (t) { return t[1] === st; }).forEach(function (t) {
        var o = D.createElement("option"); o.value = t[0] + ", " + t[1]; o.textContent = t[0] + ", " + t[1];
        if (wantTown && (t[0].toLowerCase() === wantTown || (t[0] + " " + t[1]).toLowerCase() === wantTown)) o.selected = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    var other = D.createElement("option"); other.value = "Other"; other.textContent = T("Another town", "Otro pueblo"); sel.appendChild(other);
  });

  /* ---------- typical value for the chosen town (home value page) ---------- */
  var market = null, marketWaiters = [];
  function withMarket(cb) {
    if (market) return cb(market);
    marketWaiters.push(cb); if (marketWaiters.length > 1) return;
    fetch(SITE.marketSrc, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (m) { market = m || W.MARKET_FALLBACK || null; marketWaiters.splice(0).forEach(function (f) { f(market); }); });
  }
  function money(v) { return v == null ? "" : "$" + Math.round(v).toLocaleString("en-US"); }
  function townInfo(M, label) {
    var p = String(label || "").split(", "), name = p[0], st = p[1];
    var meta = SITE.towns.filter(function (t) { return t[0] === name && t[1] === st; })[0];
    if (!M || !meta) return null;
    var t = (M.towns || []).filter(function (x) { return x.name === name && x.state === st; })[0];
    var z = t && t.zillow && t.zillow.zhvi;
    if (z && z.value) return { name: name, st: st, value: z.value, yoy: z.yoy, asOf: z.asOf, county: false };
    var c = (M.counties || {})[meta[2]], cz = c && c.zillow && c.zillow.zhvi;
    return cz && cz.value ? { name: name, st: st, value: cz.value, yoy: cz.yoy, asOf: cz.asOf, county: meta[2] } : null;
  }
  $$("[data-town-value]").forEach(function (box) {
    var sel = $(box.getAttribute("data-town-value"));
    if (!sel) return;
    function show() {
      withMarket(function (M) {
        var i = townInfo(M, sel.value), out = $("[data-tv-out]", box);
        if (!i) { box.hidden = true; return; }
        box.hidden = false;
        $("[data-tv-town]", box).textContent = i.county ? i.county : i.name + ", " + i.st;
        out.textContent = money(i.value);
        var y = i.yoy == null ? "" : (i.yoy > 0 ? "+" : "") + (Math.round(i.yoy * 10) / 10).toLocaleString(LANG === "es" ? "es-US" : "en-US") + "%";
        var when = "";
        if (i.asOf) { var d = i.asOf.split("-"); when = new Date(+d[0], (+d[1] || 1) - 1, 1).toLocaleDateString(LANG === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" }); }
        $("[data-tv-note]", box).textContent = (i.county
          ? T("No separate town series is published for " + i.name + ", so this is the county figure. ", "No se publica una serie separada para " + i.name + ", así que es la cifra del condado. ")
          : "") + T("Zillow typical home value (ZHVI), " + when + (y ? ", " + y + " over 12 months" : "") + ". An area figure, not your home's value.",
                   "Valor típico de Zillow (ZHVI), " + when + (y ? ", " + y + " en 12 meses" : "") + ". Una cifra del área, no el valor de su casa.");
      });
    }
    sel.addEventListener("change", show); if (sel.value && sel.value !== "Other") show(); else box.hidden = true;
  });

  /* ---------- lead forms ---------- */
  // On eduardoinoa.com the same-origin relay (/api/lead) confirms Marketora stored the lead; anywhere else,
  // or if the relay fails, fall back to the direct no-cors send (which can't confirm), then mailto.
  var RELAY_HOST = /(^|\.)eduardoinoa\.com$|^eduardoinoa[a-z0-9-]*\.vercel\.app$/;
  function sendLead(payload) {
    var body = JSON.stringify(payload);
    function direct() { return fetch(SITE.leadInbox, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: body, keepalive: true }); }
    if (!RELAY_HOST.test(location.hostname)) return direct();
    return fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: body })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!(r.ok && j.ok)) return direct(); }); }, direct);
  }
  function mailFallback(p) {
    var lines = [["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address / areas"], ["message", "Details"]]
      .filter(function (k) { return p[k[0]]; }).map(function (k) { return k[1] + ": " + p[k[0]]; });
    lines.push("SMS/call consent: " + (p.smsConsent ? "yes" : "no"));
    location.href = "mailto:" + SITE.email + "?subject=" + encodeURIComponent("Website (" + p.source + ") — " + p.type + " — " + p.name) +
      "&cc=" + encodeURIComponent(SITE.leadMail) + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  var EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

  $$("form[data-lead]").forEach(function (f) {
    var msg = $(".form-msg", f), btn = $('button[type="submit"]', f);
    function say(t, kind) { if (!msg) return; msg.textContent = t; msg.className = "form-msg" + (kind ? " " + kind : ""); }
    function field(n) { var el = f.elements[n]; if (!el) return ""; if (el.length && !el.tagName) { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ""; } return (el.type === "checkbox" ? (el.checked ? el.value : "") : el.value || "").trim(); }
    function bad(el, t) { if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); } say(t, "err"); }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      $$("[aria-invalid]", f).forEach(function (x) { x.removeAttribute("aria-invalid"); });
      if (field("company")) { f.classList.add("sent"); return; } // honeypot
      var name = field("name"), phone = field("phone"), email = field("email");
      if (!name) return bad(f.elements.name, T("Please add your name.", "Agregue su nombre."));
      if (!phone && !email) return bad(f.elements.phone || f.elements.email, T("Add a phone number or an email so I can reply.", "Agregue un teléfono o un email para poder responderle."));
      if (email && !EMAIL.test(email)) return bad(f.elements.email, T("That email doesn't look right.", "Ese email no parece correcto."));
      if (f.elements.address && f.elements.address.required && !field("address")) return bad(f.elements.address, T("Please add the property address.", "Agregue la dirección de la propiedad."));

      var source = f.getAttribute("data-source") || "website";
      var type = field("type") || f.getAttribute("data-type") || "buyer";
      var consent = !!(f.elements.smsConsent && f.elements.smsConsent.checked);
      var details = [];
      $$("[data-detail]", f).forEach(function (el) {
        var v = el.type === "radio" ? (el.checked ? el.value : "") : (el.value || "").trim();
        if (v) details.push(el.getAttribute("data-detail") + ": " + v);
      });
      var a = store("ei_attrib") || {};
      var utm = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].filter(function (k) { return a[k]; }).map(function (k) { return k + "=" + a[k]; });
      var message = [f.getAttribute("data-label") || ("Website — " + source)]
        .concat(details)
        .concat(field("message") ? ["Notes: " + field("message")] : [])
        .concat(["Language: " + (LANG === "es" ? "Spanish" : "English"), "Page: " + location.pathname, "Calls/texts consent: " + (consent ? "yes" : "no")])
        .concat(utm.length ? ["Attribution: " + utm.join(" ")] : [])
        .concat(a.referrer ? ["Referrer: " + a.referrer] : [])
        .join("\n");

      var payload = { source: source, type: type, deck: f.getAttribute("data-deck") || ("eduardo-inoa-" + source), agentHandle: SITE.handle,
        name: name.slice(0, 120), message: message.slice(0, 2000), smsConsent: consent, language: LANG, page: location.href.slice(0, 300) };
      if (phone) payload.phone = phone.slice(0, 40);
      if (email) payload.email = email.slice(0, 160);
      var addr = field("address"), town = field("town");
      if (addr || town) payload.address = [addr, town && town !== "Other" ? town : ""].filter(Boolean).join(", ").slice(0, 300);
      Object.keys(a).forEach(function (k) { if (/^utm_|^gclid$|^fbclid$/.test(k)) payload[k] = a[k]; });

      if (btn) btn.disabled = true;
      say(T("Sending…", "Enviando…"));
      sendLead(payload).then(function () {
        track("generate_lead", { lead_source: source, lead_type: type });
        f.classList.add("sent"); say("");
        var done = $(".done", f); if (done) { done.setAttribute("tabindex", "-1"); done.focus(); }
      }).catch(function () {
        mailFallback(payload);
        say(T("Opening your email app — just press send.", "Abriendo su correo — solo presione enviar."), "ok");
      }).then(function () { if (btn) btn.disabled = false; });
    });
  });
})();
