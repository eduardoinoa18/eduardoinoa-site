// Pull Eduardo's published Marketora content into tools/data/marketora.json.
//   node scripts/sync-marketora.mjs
// Reads tools/site.config.json "marketoraSubdomain" (his published Marketora site). Empty = nothing to do.
// Writes the snapshot only when the content changed (the feed's generatedAt is dropped), so the GitHub
// Action commits — and Vercel redeploys — only when he actually published or changed something.
// A failed or malformed fetch leaves the previous snapshot untouched (the site keeps what it had).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/site.config.json"), "utf8"));
const sub = String(cfg.marketoraSubdomain || "").trim();
if (!sub) { console.log("sync-marketora: marketoraSubdomain is not set — nothing to sync."); process.exit(0); }
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(sub)) { console.error("sync-marketora: marketoraSubdomain is not a valid subdomain."); process.exit(1); }

const url = `https://marketora.me/api/site/${sub}/public`;
const out = path.join(ROOT, "tools/data/marketora.json");
let res;
try {
  res = await fetch(url, { headers: { "user-agent": "eduardoinoa-site-sync", accept: "application/json" }, signal: AbortSignal.timeout(20000) });
} catch (e) {
  console.error("sync-marketora: fetch failed, keeping the previous snapshot:", e.message);
  process.exit(0);
}
if (res.status === 404) { console.error(`sync-marketora: ${url} is 404 — is the Marketora site published? Keeping the previous snapshot.`); process.exit(0); }
if (!res.ok) { console.error(`sync-marketora: HTTP ${res.status}, keeping the previous snapshot.`); process.exit(0); }
const feed = await res.json().catch(() => null);
if (!feed || feed.version !== 1 || !Array.isArray(feed.listings) || !Array.isArray(feed.posts)) {
  console.error("sync-marketora: unexpected response shape, keeping the previous snapshot.");
  process.exit(0);
}
delete feed.generatedAt;
const next = JSON.stringify(feed, null, 2) + "\n";
const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
if (prev === next) { console.log("sync-marketora: no change."); process.exit(0); }
fs.writeFileSync(out, next);
console.log(`sync-marketora: updated — ${feed.listings.length} listings, ${(feed.portfolio || []).length} shared sales, ${feed.posts.length} posts.`);
