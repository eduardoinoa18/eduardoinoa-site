// Pre-deploy QA (brief section 7), static checks. Usage: cd tools && npm run qa
// Exits non-zero on any failure. Browser checks (overflow at 360/390/430, console errors, form intercepts)
// are listed in README "QA before every deploy" and are run with the built-in browser / Playwright.
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { ROOT } from "./lib/layout.mjs";

const SKIP = new Set(["node_modules", ".git", "tools", "scripts", ".github", ".vercel"]);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
const pages = walk(ROOT);
const fails = [], warns = [];
const fail = (f, m) => fails.push(`${rel(f)}: ${m}`);
const warn = (f, m) => warns.push(`${rel(f)}: ${m}`);

// Resolve an internal path the way Vercel cleanUrls does.
function resolves(href) {
  const p = decodeURIComponent(href.split(/[?#]/)[0]);
  if (p === "" || p === "/") return fs.existsSync(path.join(ROOT, "index.html"));
  const base = path.join(ROOT, p.replace(/^\//, "").replace(/\/$/, ""));
  return fs.existsSync(base) && fs.statSync(base).isFile() || fs.existsSync(base + ".html") || fs.existsSync(path.join(base, "index.html"));
}
const REDIRECTS = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")).redirects.map((r) => r.source);

for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  const r = rel(f);
  const kb = Buffer.byteLength(html) / 1024;

  // 1. Forbidden strings.
  for (const bad of ["vercel.app", "rjx7ppG9", "eduardoinoa.netlify.app"]) if (html.includes(bad)) fail(f, `contains "${bad}"`);
  if (/Opendoor/i.test(html)) fail(f, `mentions Opendoor (needs written OK first)`);
  if (/we buy houses/i.test(html)) fail(f, `"we buy houses"`);
  if (/By sending, you agree|Al enviar, acepta/.test(html)) fail(f, "old implied-consent text");

  // 2. JSON-LD parses; NAP consistent.
  const doc = parse(html, { comment: false });
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.text); } catch (e) { fail(f, "JSON-LD does not parse: " + e.message); }
  }
  if (/130 Parker St(?!, Suite 14)/.test(html)) fail(f, "address without Suite 14");
  if (/Suite 14, Lawrence, MA(?! 01843)/.test(html)) fail(f, "office address without ZIP 01843");

  // 3. Footer compliance (skip noindex utility pages? no — every page).
  if (!/Fermin Group/.test(html)) fail(f, "brokerage name missing");
  if (!/Each office is independently owned and operated/.test(html)) fail(f, "independently-owned line missing");
  if (!/Equal Housing Opportunity/.test(html)) fail(f, "Equal Housing Opportunity missing");

  // 4. Consent checkboxes are unchecked by default.
  for (const c of doc.querySelectorAll('input[name="smsConsent"]')) if (c.hasAttribute("checked")) fail(f, "consent checkbox is pre-checked");
  for (const form of doc.querySelectorAll("form[data-lead]")) {
    if (!form.querySelector('input[name="smsConsent"]')) fail(f, "lead form without consent checkbox");
    const src = form.getAttribute("data-source");
    if (!["website", "cash_offer", "home_value", "hub", "buyer_deck", "buyer-deck", "buyer_toolkit", "prelisting_deck", "prelisting-deck"].includes(src)) fail(f, `unknown lead source "${src}"`);
  }

  // 5. Canonical + lang.
  const canon = doc.querySelector('link[rel="canonical"]');
  if (!canon) fail(f, "no canonical"); else if (!canon.getAttribute("href").startsWith("https://eduardoinoa.com")) fail(f, "canonical not on eduardoinoa.com");
  const lang = doc.querySelector("html")?.getAttribute("lang");
  if (r.startsWith("es/") && lang !== "es") fail(f, `Spanish page has lang="${lang}"`);
  for (const l of doc.querySelectorAll('link[rel="alternate"][hreflang]')) {
    const u = l.getAttribute("href").replace("https://eduardoinoa.com", "");
    if (!resolves(u)) fail(f, `hreflang target missing: ${u}`);
  }

  // 6. Internal links resolve (cleanUrls) or hit a redirect.
  for (const a of doc.querySelectorAll("a[href]")) {
    let h = a.getAttribute("href");
    if (h.startsWith("https://eduardoinoa.com")) h = h.slice("https://eduardoinoa.com".length) || "/";
    if (!h.startsWith("/") || h.startsWith("//")) continue;
    if (!resolves(h) && !REDIRECTS.some((s) => s.split("/:")[0] && h.startsWith(s.split("/:")[0]) && s.includes(":"))) fail(f, `broken internal link ${h}`);
  }

  // 7. Images: local files exist; dimensions present (CLS).
  for (const im of doc.querySelectorAll("img[src]")) {
    let s = im.getAttribute("src");
    if (s.startsWith("https://eduardoinoa.com/")) s = s.slice("https://eduardoinoa.com".length);
    if (s.startsWith("/") && !fs.existsSync(path.join(ROOT, s.split("?")[0]))) fail(f, `missing image ${s}`);
    if (!im.getAttribute("width") || !im.getAttribute("height")) warn(f, `img without width/height: ${s.slice(0, 60)}`);
  }

  // 8. Weight + emojis in chrome.
  const isDeck = r === "buyers/index.html" || r.startsWith("es/compradores");
  if (kb > 200 && !isDeck) warn(f, `HTML is ${kb.toFixed(0)} KB (target < 200 KB)`);
  // Allowed text symbols: ★/☆ review stars (U+2605/2606), ✓/✕ calculator marks (U+2713/2715).
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{2604}\u{2607}-\u{2712}\u{2714}\u{2716}-\u{27BF}]/u.test(doc.querySelector("body")?.text || "")) warn(f, "emoji-range character in page text (check it's not chrome)");
}

// Sitemap entries resolve.
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
for (const m of sm.matchAll(/<loc>https:\/\/eduardoinoa\.com([^<]*)<\/loc>/g)) if (!resolves(m[1] || "/")) fails.push(`sitemap.xml: ${m[1]} does not exist`);
if (sm.includes("vercel.app")) fails.push("sitemap.xml: vercel.app");

// SEO hygiene across indexable pages: unique titles/descriptions, one H1, self canonical, reciprocal hreflang,
// alt text, share image present.
const seo = new Map(); // urlPath -> {title, desc, alts:{lang:url}}
const urlOf = (f) => { const r = rel(f); return "/" + r.replace(/(^|\/)index\.html$/, "").replace(/\.html$/, ""); };
for (const f of pages) {
  const html = fs.readFileSync(f, "utf8"), doc = parse(html), u = urlOf(f).replace(/\/$/, "") || "/";
  if (/noindex/.test(doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "")) continue;
  const title = doc.querySelector("title")?.text.trim() || "", desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  if (!title) fail(f, "no <title>"); else if (title.length > 110) warn(f, `title is ${title.length} chars`);
  if (!desc) fail(f, "no meta description"); else if (desc.length < 70 || desc.length > 200) warn(f, `meta description is ${desc.length} chars`);
  const h1 = doc.querySelectorAll("h1").length;
  if (h1 !== 1) (h1 === 0 ? fail : warn)(f, `${h1} <h1> elements`);
  const canon = (doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "").replace("https://eduardoinoa.com", "").replace(/\/$/, "") || "/";
  if (canon !== u) fail(f, `canonical ${canon} is not this page (${u})`);
  for (const im of doc.querySelectorAll("img")) if (!im.hasAttribute("alt")) fail(f, `img without alt: ${(im.getAttribute("src") || "").slice(0, 60)}`);
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  if (!og) warn(f, "no og:image"); else if (og.startsWith("https://eduardoinoa.com/") && !fs.existsSync(path.join(ROOT, og.slice(24).split("?")[0]))) fail(f, `og:image missing: ${og}`);
  const alts = {};
  for (const l of doc.querySelectorAll('link[rel="alternate"][hreflang]')) alts[l.getAttribute("hreflang")] = l.getAttribute("href").replace("https://eduardoinoa.com", "").replace(/\/$/, "") || "/";
  seo.set(u, { f, title, desc, alts });
}
const dup = (key) => { const m = new Map(); for (const [u, s] of seo) { if (!s[key]) continue; m.set(s[key], [...(m.get(s[key]) || []), u]); } return [...m.values()].filter((v) => v.length > 1); };
for (const g of dup("title")) fails.push(`duplicate <title> on ${g.join(", ")}`);
for (const g of dup("desc")) fails.push(`duplicate meta description on ${g.join(", ")}`);
for (const [u, s] of seo) {
  for (const [lang, target] of Object.entries(s.alts)) {
    if (lang === "x-default" || target === u) continue;
    const back = seo.get(target);
    if (!back) { fails.push(`${u}: hreflang ${lang} -> ${target} is not an indexable page`); continue; }
    if (!Object.values(back.alts).includes(u)) fails.push(`${u}: hreflang ${lang} -> ${target}, but ${target} does not link back`);
  }
}

// Crawl from "/" like a search engine: every sitemap URL must be reachable through links, ideally within 3 clicks.
function fileOf(urlPath) {
  const p = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/\/$/, "") || "/";
  if (p === "/") return path.join(ROOT, "index.html");
  const base = path.join(ROOT, p.replace(/^\//, ""));
  for (const c of [base + ".html", path.join(base, "index.html")]) if (fs.existsSync(c)) return c;
  return null;
}
const norm = (h) => (h.split(/[?#]/)[0].replace(/\/$/, "") || "/");
const depth = new Map([["/", 0]]), inbound = new Map(), queue = ["/"];
while (queue.length) {
  const u = queue.shift(), f = fileOf(u);
  if (!f) continue;
  const doc = parse(fs.readFileSync(f, "utf8"));
  for (const a of doc.querySelectorAll("a[href]")) {
    let h = a.getAttribute("href");
    if (h.startsWith("https://eduardoinoa.com")) h = h.slice("https://eduardoinoa.com".length) || "/";
    if (!h.startsWith("/") || h.startsWith("//") || /\.(webp|png|jpg|json|xml|pdf)(\?|$)/.test(h)) continue;
    const t = norm(h);
    if (!fileOf(t)) continue;
    if (t !== u) { if (!inbound.has(t)) inbound.set(t, new Set()); inbound.get(t).add(u); }
    if (!depth.has(t)) { depth.set(t, depth.get(u) + 1); queue.push(t); }
  }
}
for (const m of sm.matchAll(/<loc>https:\/\/eduardoinoa\.com([^<]*)<\/loc>/g)) {
  const p = norm(m[1] || "/");
  if (!depth.has(p)) fails.push(`orphan: ${p} is in the sitemap but no link reaches it from the home page`);
  else if (depth.get(p) > 3) warns.push(`${p} is ${depth.get(p)} clicks from the home page`);
  else if (p !== "/" && (inbound.get(p)?.size || 0) < 2) warns.push(`${p} has only ${inbound.get(p)?.size || 0} page(s) linking to it`);
}
const maxDepth = Math.max(...depth.values());
console.log(`Crawl: ${depth.size} pages reachable from "/", deepest is ${maxDepth} clicks.`);

console.log(`QA checked ${pages.length} pages.`);
if (warns.length) console.log(`\nWarnings (${warns.length}):\n  ` + warns.join("\n  "));
if (fails.length) { console.log(`\nFAILURES (${fails.length}):\n  ` + fails.join("\n  ")); process.exit(1); }
console.log("\nAll static checks passed.");
