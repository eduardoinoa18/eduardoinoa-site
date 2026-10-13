// Marketora → eduardoinoa.com. What Eduardo publishes in Marketora (listings, opted-in closed deals,
// blog posts) reaches this static site as real HTML, so the site stays fast and indexable.
//
// Data: tools/data/marketora.json, a snapshot of https://marketora.me/api/site/<subdomain>/public
// written by scripts/sync-marketora.mjs (GitHub Action "Sync Marketora", every 3 hours + on demand).
// No snapshot, or an empty one, means every Marketora section is simply left out.
//
// The feed is text Eduardo typed in Marketora. Everything is escaped; only https URLs are used;
// post bodies are rendered from structured sections (heading / paragraphs / bullets), never raw HTML.
import fs from "node:fs";
import path from "node:path";
import { ROOT, esc } from "./layout.mjs";

const FILE = path.join(ROOT, "tools/data/marketora.json");

export function loadFeed() {
  if (!fs.existsSync(FILE)) return { listings: [], portfolio: [], posts: [], testimonials: [], links: {} };
  const j = JSON.parse(fs.readFileSync(FILE, "utf8"));
  return {
    listings: Array.isArray(j.listings) ? j.listings : [],
    portfolio: Array.isArray(j.portfolio) ? j.portfolio : [],
    posts: Array.isArray(j.posts) ? j.posts.filter((p) => p && /^[a-z0-9][a-z0-9-]{0,120}$/.test(p.slug || "") && p.title) : [],
    testimonials: Array.isArray(j.testimonials) ? j.testimonials : [],
    links: j.links && typeof j.links === "object" ? j.links : {},
  };
}

/** Only absolute https URLs leave the feed; anything else becomes null. */
export const httpsUrl = (u) => {
  try { const x = new URL(String(u || "")); return x.protocol === "https:" ? x.href : null; } catch { return null; }
};

const STATUS = {
  coming_soon: ["Coming soon", "Próximamente"],
  active: ["Just listed", "Recién listada"],
  under_contract: ["Under agreement", "Bajo contrato"],
  closing: ["Under agreement", "Bajo contrato"],
  sold: ["Just sold", "Recién vendida"],
};
export const statusLabel = (s, lang) => (STATUS[String(s || "").toLowerCase()] || ["", ""])[lang === "es" ? 1 : 0];
const SOLD = new Set(["sold", "complete"]);

/** Listing cards (first photo, address, price, beds/baths/sqft, status badge) linking to the property website. */
export function listingCards(listings, lang, { limit = 9, includeSold = true } = {}) {
  const es = lang === "es";
  const rows = listings.filter((l) => l && l.address && (includeSold || !SOLD.has(String(l.status || "").toLowerCase()))).slice(0, limit);
  if (!rows.length) return "";
  return `<div class="mk-listings">${rows.map((l) => {
    const href = httpsUrl(l.url), img = httpsUrl(l.photoUrl), badge = statusLabel(l.status, lang);
    const facts = [l.beds && `${esc(l.beds)} ${es ? "hab." : "bd"}`, l.baths && `${esc(l.baths)} ${es ? "baños" : "ba"}`, l.sqft && `${esc(l.sqft)} ${es ? "pies²" : "sq ft"}`].filter(Boolean).join(" · ");
    const where = [l.city, l.state].filter(Boolean).map(esc).join(", ");
    const inner = `<div class="mk-photo">${img ? `<img src="${esc(img)}" alt="${esc(l.address)}" loading="lazy" decoding="async" width="800" height="600">` : ""}${badge ? `<span class="mk-badge">${badge}</span>` : ""}</div>
    <div class="mk-tx"><b>${esc(l.address)}</b>${where ? `<span>${where}</span>` : ""}${l.price ? `<span class="mk-price">${esc(l.price)}</span>` : ""}${facts ? `<span>${facts}</span>` : ""}</div>`;
    return href ? `<a class="mk-card" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="mk-card">${inner}</div>`;
  }).join("")}</div>`;
}

/** Closed deals Eduardo opted in to show in Marketora (client never named; address per his setting). */
export function saleCards(portfolio, lang) {
  const rows = portfolio.filter((d) => d && (d.where || d.headline)).slice(0, 9);
  if (!rows.length) return "";
  return `<div class="sales">${rows.map((d) => {
    const cover = httpsUrl(d.cover && d.cover.url);
    return `<div class="sale">${cover ? `<div class="frame"><img src="${esc(cover)}" alt="" loading="lazy" decoding="async" width="800" height="600"></div>` : ""}<b>${esc(d.where || d.headline)}</b><span>${[d.outcome, d.when].filter(Boolean).map(esc).join(" · ")}${d.price ? " · " + esc(d.price) : ""}</span><span>${esc(d.role || "")}</span>${d.note ? `<span>${esc(d.note)}</span>` : ""}</div>`;
  }).join("")}</div>`;
}

/** A post body from structured sections. */
export function postBody(post) {
  return (post.sections || []).map((s) => {
    const h = s && s.heading ? `<h2>${esc(s.heading)}</h2>` : "";
    const body = (Array.isArray(s && s.body) ? s.body : []).filter((p) => typeof p === "string" && p.trim()).map((p) => `<p>${esc(p)}</p>`).join("");
    const bullets = Array.isArray(s && s.bullets) && s.bullets.length ? `<ul>${s.bullets.filter((b) => typeof b === "string").map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
    return h + body + bullets;
  }).join("\n");
}

/** Shared styles for the Marketora blocks (listing grid, badges). Uses the site tokens. */
export const MK_STYLE = `<style>
.mk-listings{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.mk-card{display:block;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:border-color .3s,transform .3s var(--ease)}
.mk-card:hover{border-color:var(--champagne);transform:translateY(-2px)}
.mk-photo{position:relative;aspect-ratio:4/3;background:var(--stone)}
.mk-photo img{width:100%;height:100%;object-fit:cover}
.mk-badge{position:absolute;left:12px;top:12px;background:var(--night);color:#fff;font:500 13px var(--bf);padding:6px 10px;border-radius:999px}
.mk-tx{padding:16px 18px 18px;display:grid;gap:3px}
.mk-tx b{font:600 21px/1.2 var(--hf);color:var(--harbor)}
.mk-tx span{font-size:14.5px;color:var(--muted)}
.mk-tx .mk-price{font-weight:600;color:var(--ink);font-size:16px}
</style>`;
