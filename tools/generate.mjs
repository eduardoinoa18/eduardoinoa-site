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

/* ---------- collect ---------- */
const modulesDir = path.join(ROOT, "tools/pages");
const specs = [];
for (const f of fs.readdirSync(modulesDir).filter((x) => x.endsWith(".mjs")).sort()) {
  const mod = await import(pathToFileURL(path.join(modulesDir, f)).href);
  const out = await mod.default(ctx);
  for (const s of out) specs.push({ ...s, _from: f });
}
specs.push(...creditsPage());

const seen = new Set();
for (const s of specs) {
  if (seen.has(s.path)) throw new Error(`duplicate page path ${s.path} (from ${s._from})`);
  seen.add(s.path);
  const html = s.html ?? layout.page(s);
  fs.mkdirSync(path.dirname(fileFor(s.path)), { recursive: true });
  fs.writeFileSync(fileFor(s.path), html);
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
const STATIC = [
  { path: "/", altPath: "/es/", priority: "1.0", changefreq: "weekly" },
  { path: "/buyers", altPath: "/es/compradores", priority: "0.9", changefreq: "monthly" },
  { path: "/sellers", altPath: "/es/vendedores", priority: "0.9", changefreq: "monthly" },
  ...fs.readdirSync(path.join(ROOT, "posts")).filter((f) => f.endsWith(".html"))
    .map((f) => ({ path: "/posts/" + f.replace(/\.html$/, ""), priority: "0.7", changefreq: "monthly" })),
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
  const enP = e.path.startsWith("/es/") ? e.altPath : e.path, esP = e.path.startsWith("/es/") ? e.path : e.altPath;
  const alts = e.altPath && exists(e.altPath)
    ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${BASE}${enP}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${BASE}${esP}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${enP}"/>`
    : "";
  return `  <url><loc>${BASE}${e.path}</loc><lastmod>${today}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority>${alts}\n  </url>`;
});
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`generated ${specs.length} pages; sitemap has ${urls.length} urls`);
for (const s of specs) console.log("  " + s.path.padEnd(36) + (s._from || ""));
