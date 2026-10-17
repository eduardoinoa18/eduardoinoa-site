// Generates the static pages that share the layout (towns, landing pages, /es/, credits) + sitemap.xml.
// No build step on Vercel: run `npm run gen` in tools/ and commit the output.
//
// Page modules: tools/pages/*.mjs, each `export default (ctx) => PageSpec[]` where PageSpec is the
// argument of layout.page() plus { sitemap?: {priority, changefreq} | false }. A spec with `html`
// is written as-is (used for /es/ copies of hand-written pages).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as layout from "./lib/layout.mjs";
import { ogCard, photoFile } from "./lib/og.mjs";

const { ROOT, CONFIG, BASE, esc } = layout;
const today = new Date().toISOString().slice(0, 10);
const market = JSON.parse(fs.readFileSync(path.join(ROOT, "market.json"), "utf8"));
const ctx = { ...layout, market, today };

const fileFor = (p) => path.join(ROOT, p.replace(/^\//, "").replace(/\/$/, ""), "index.html");

/* ---------- photo credits page ---------- */
function creditsPage() {
  const list = layout.photos();
  const rows = list.map((p) => `<li><a href="/img/photos/${p.slug}-1600.webp">${esc(p.alt_en)}</a> — ${p.credit_html}</li>`).join("");
  return [{
    lang: "en", path: "/credits", title: "Photo credits — Eduardo Inoa, REALTOR®",
    description: "Sources and licenses for the photographs used on eduardoinoa.com.", noindex: true, sitemap: false,
    body: `<section class="section"><div class="wrap narrow prose"><span class="label">Photo credits</span><h1 style="font-size:clamp(40px,5vw,64px)">Photo credits</h1>
<p class="lede">Photographs of the towns are used under their Creative Commons or public-domain licenses; general photos are from Unsplash or Pexels. They show the area, not specific listings or sales.</p>
<ul>${rows || "<li>No third-party photographs are in use.</li>"}</ul>
<p>Eduardo's portraits and the brokerage logos belong to Eduardo Inoa and The Fermin Group at Century 21 North East.</p></div></section>`,
  }];
}

/* ---------- home: live Marketora listings between <!--mk:live--> markers ----------
   Runs BEFORE the page modules so es-home.mjs (which renders /es from index.html) sees the same block;
   the Spanish version rides in a data-es attribute like the rest of the home page. No listings = empty. */
{
  const { loadFeed, listingCards, MK_STYLE } = await import("./lib/marketora.mjs");
  const feed = loadFeed();
  const en = listingCards(feed.listings, "en", { limit: 6 }), es = listingCards(feed.listings, "es", { limit: 6 });
  const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const block = en ? `${MK_STYLE}
<section id="listings" class="sec">
  <div class="wrap">
    <div class="head"><div><span class="label" data-es="Mis propiedades">My listings</span><h2 data-es="En el mercado <em>conmigo.</em>">On the market <em>with me.</em></h2></div><p class="lede" data-es="Propiedades que represento ahora mismo. Cada una abre su propia página con fotos y detalles.">Homes I'm representing right now. Each one opens its own page with photos and details.</p></div>
    <div data-es="${attr(es)}">${en}</div>
    <p style="margin-top:22px"><a class="more" href="/listings" data-es="Ver todas las propiedades">See every listing</a></p>
  </div>
</section>` : "";
  const homeFile = path.join(ROOT, "index.html");
  const home = fs.readFileSync(homeFile, "utf8");
  const next = home.replace(/<!--mk:live-->[\s\S]*?<!--\/mk:live-->/, `<!--mk:live-->${block}<!--/mk:live-->`);
  if (next !== home) fs.writeFileSync(homeFile, next);
}

/* ---------- home: the five newest journal cards between <!--journal:cards--> markers ---------- */
{
  const { homeJournalCards } = await import("./pages/journal.mjs");
  const homeFile = path.join(ROOT, "index.html");
  const home = fs.readFileSync(homeFile, "utf8");
  const next = home.replace(/<!--journal:cards-->[\s\S]*?<!--\/journal:cards-->/, `<!--journal:cards-->\n${homeJournalCards(esc)}\n      <!--/journal:cards-->`);
  if (next !== home) fs.writeFileSync(homeFile, next);
}

/* ---------- collect ---------- */
const modulesDir = path.join(ROOT, "tools/pages");
const specs = [];
// ONLY=towns.mjs,landing.mjs builds just those modules (useful while other modules are mid-edit).
// A partial run still rewrites sitemap.xml, so always finish with a full `npm run gen`.
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
for (const f of fs.readdirSync(modulesDir).filter((x) => x.endsWith(".mjs") && (!ONLY.length || ONLY.includes(x))).sort()) {
  const mod = await import(pathToFileURL(path.join(modulesDir, f)).href);
  const out = await mod.default(ctx);
  for (const s of out) specs.push({ ...s, _from: f });
}
specs.push(...creditsPage());

// Branded share card per indexable page: its first credited photo + its headline.
for (const s of specs) {
  if (s.html || s.noindex || s.ogKeep) continue;
  const key = s.path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home";
  const photo = s.ogPhoto || (s.foot && s.foot.credits || []).filter(Boolean)[0] || null;
  s.ogImage = await ogCard(key, {
    title: s.ogTitle || s.title.split(" | ")[0],
    kicker: s.lang === "es" ? "Merrimack Valley y el sur de New Hampshire" : "Merrimack Valley & Southern New Hampshire",
    photo: photoFile(photo),
  });
}
// Hand-written posts: card from the cover + title in tools/data/posts.json.
const postsMeta = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/posts.json"), "utf8"));
for (const p of postsMeta.en || []) {
  const file = path.join(ROOT, p.path.replace(/^\//, "") + ".html");
  if (!fs.existsSync(file)) continue;
  const url = BASE + await ogCard("posts-" + p.slug, { title: p.title, kicker: "Journal · Merrimack Valley & Southern New Hampshire", photo: photoFile(p.cover) });
  let h = fs.readFileSync(file, "utf8");
  h = h.replace(/(<meta property="og:image" content=")[^"]*(")/, "$1" + url + "$2").replace(/(<meta name="twitter:image" content=")[^"]*(")/, "$1" + url + "$2");
  fs.writeFileSync(file, h);
}

// Share cards no page uses any more (a post removed in Marketora, a renamed page) are deleted, so
// img/og/ only holds live cards. Hand-written posts' cards are referenced from their own HTML.
{
  const ogDir = path.join(ROOT, "img/og");
  const live = new Set(specs.map((s) => s.ogImage).filter((u) => typeof u === "string" && u.startsWith("/img/og/")).map((u) => u.slice(8)));
  for (const f of fs.readdirSync(path.join(ROOT, "posts")).filter((x) => x.endsWith(".html"))) {
    const m = fs.readFileSync(path.join(ROOT, "posts", f), "utf8").match(/\/img\/og\/([a-z0-9-]+\.jpg)/);
    if (m) live.add(m[1]);
  }
  if (fs.existsSync(ogDir)) for (const f of fs.readdirSync(ogDir)) if (/^[a-z0-9-]+-[0-9a-f]{8}\.jpg$/.test(f) && !live.has(f)) fs.unlinkSync(path.join(ogDir, f));
}

const seen = new Set();
for (const s of specs) {
  if (seen.has(s.path)) throw new Error(`duplicate page path ${s.path} (from ${s._from})`);
  seen.add(s.path);
  const html = s.html ?? layout.page(s);
  // `file` writes to an exact path (404.html, llms.txt) instead of <path>/index.html.
  const out = s.file ? path.join(ROOT, s.file) : fileFor(s.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

/* ---------- inject analytics + verification into hand-written pages ---------- */
const handWritten = ["index.html", "buyers/index.html", "sellers/index.html",
  ...fs.readdirSync(path.join(ROOT, "posts")).filter((f) => f.endsWith(".html")).map((f) => "posts/" + f)];
const metaBlock = `<!--site-meta--><meta name="ga4-id" content="${esc(CONFIG.ga4Id)}">${CONFIG.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(CONFIG.googleSiteVerification)}">` : ""}${CONFIG.bingSiteVerification ? `<meta name="msvalidate.01" content="${esc(CONFIG.bingSiteVerification)}">` : ""}<!--/site-meta-->`;
for (const f of handWritten) {
  const file = path.join(ROOT, f);
  let html = fs.readFileSync(file, "utf8");
  html = /<!--site-meta-->[\s\S]*?<!--\/site-meta-->/.test(html)
    ? html.replace(/<!--site-meta-->[\s\S]*?<!--\/site-meta-->/, metaBlock)
    : html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n${metaBlock}`);
  fs.writeFileSync(file, html);
}

/* ---------- sitemap ---------- */
// English posts with a Spanish twin (tools/data/posts.json esPath) get hreflang alternates.
const postsData = fs.existsSync(path.join(ROOT, "tools/data/posts.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/posts.json"), "utf8")) : { en: [] };
const postEsPath = Object.fromEntries((postsData.en || []).filter((p) => p.esPath).map((p) => [p.path, p.esPath]));
const STATIC = [
  { path: "/", altPath: "/es", priority: "1.0", changefreq: "weekly" },
  { path: "/buyers", altPath: "/es/compradores", priority: "0.9", changefreq: "monthly" },
  { path: "/sellers", altPath: "/es/vendedores", priority: "0.9", changefreq: "monthly" },
  ...fs.readdirSync(path.join(ROOT, "posts")).filter((f) => f.endsWith(".html")).map((f) => {
    const p = "/posts/" + f.replace(/\.html$/, "");
    return { path: p, altPath: postEsPath[p], priority: "0.7", changefreq: "monthly" };
  }),
];
const entries = new Map();
for (const s of STATIC) entries.set(s.path, s);
for (const s of specs) {
  if (s.sitemap === false || s.noindex) continue;
  entries.set(s.path, { path: s.path, altPath: s.altPath, priority: s.sitemap?.priority || "0.8", changefreq: s.sitemap?.changefreq || "monthly" });
}
// Only advertise alternates that actually exist on disk.
const exists = (p) => p && (fs.existsSync(fileFor(p)) || fs.existsSync(path.join(ROOT, p.replace(/^\//, "") + ".html"))
  || (p === "/" && fs.existsSync(path.join(ROOT, "index.html"))));
const urls = [...entries.values()].filter((e) => exists(e.path)).map((e) => {
  const enP = e.path.startsWith("/es") ? e.altPath : e.path, esP = e.path.startsWith("/es") ? e.path : e.altPath;
  const alts = e.altPath && exists(e.altPath)
    ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${BASE}${enP}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${BASE}${esP}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${enP}"/>`
    : "";
  return `  <url><loc>${BASE}${e.path}</loc><lastmod>${today}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority>${alts}\n  </url>`;
});
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`generated ${specs.length} pages; sitemap has ${urls.length} urls`);
for (const s of specs) console.log("  " + s.path.padEnd(36) + (s._from || ""));
