// Re-copies the shared Market Pulse files into the two self-contained presentation decks
// (buyers/index.html, sellers/index.html). The decks are also uploaded to Marketora as Path-B
// templates, so they cannot <link>/<script src> the site files — they carry inline copies between
// these markers:
//   /*<market-css>*/ … /*</market-css>*/   ← /market.css   (inside the deck's <style>)
//   /*<market-js>*/  … /*</market-js>*/    ← /market.js    (its own <script>)
//   <script>window.MARKET_FALLBACK=…;</script>  ← /market.json (offline / fetch-failure snapshot)
// Idempotent: running it twice changes nothing. After it, run `npm run gen` so the /es twins
// (tools/pages/es-decks.mjs) pick the new copies up.
//
//   cd tools && node sync-decks.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DECKS = ["buyers/index.html", "sellers/index.html"];
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

const css = read("market.css").trim();
const js = read("market.js").trim();
const marketRaw = read("market.json").trim();
JSON.parse(marketRaw); // must be valid JSON; embedded verbatim (no re-serialisation churn)
for (const [name, body] of [["market.css", css], ["market.js", js]])
  if (/<\/(script|style)/i.test(body)) throw new Error(`${name} contains a closing </script> or </style> tag — cannot inline it`);
const fallback = `<script>window.MARKET_FALLBACK=${marketRaw.replace(/</g, "\\u003c")};</script>`;

function between(html, open, close, body, file) {
  const a = html.indexOf(open), b = html.indexOf(close);
  if (a < 0 || b < 0 || b < a || html.indexOf(open, a + 1) > -1) throw new Error(`${file}: expected exactly one ${open} … ${close} block`);
  return html.slice(0, a + open.length) + "\n" + body + "\n" + html.slice(b);
}

let changed = 0;
for (const f of DECKS) {
  const file = path.join(ROOT, f), before = fs.readFileSync(file, "utf8");
  let html = between(before, "/*<market-css>*/", "/*</market-css>*/", css, f);
  html = between(html, "/*<market-js>*/", "/*</market-js>*/", js, f);
  const fb = html.match(/<script>window\.MARKET_FALLBACK=[\s\S]*?<\/script>/g);
  if (!fb || fb.length !== 1) throw new Error(`${f}: expected exactly one MARKET_FALLBACK script`);
  html = html.replace(fb[0], () => fallback);
  if (html !== before) { fs.writeFileSync(file, html); changed++; console.log("updated", f); }
  else console.log("up to date", f);
}
console.log(changed ? "Now run `npm run gen` to refresh the /es twins." : "Nothing to do.");
