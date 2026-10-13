// Idempotent accessibility/SEO touch-ups for the decks (Lighthouse round 2):
//  - .tabs containers get role="tablist" (their buttons are given role="tab" at runtime)
//  - the "All reviews on Google" button gets a real default href (Eduardo's Google Business Profile);
//    Marketora copies still override it from ?c= (googleReviewUrl) or the agent's reviews field
// Usage: cd tools && node a11y-decks.mjs, then npm run gen (refreshes the /es twins).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/layout.mjs";

const GBP = "https://g.page/r/CeaqDfjfEAy_EBM";
for (const f of ["buyers/index.html", "sellers/index.html"]) {
  const file = path.join(ROOT, f);
  let h = fs.readFileSync(file, "utf8");
  const before = h;
  h = h.split('<div class="tabs">').join('<div class="tabs" role="tablist">');
  h = h.split('<a class="btn line" data-href="reviews" target="_blank"').join(`<a class="btn line" href="${GBP}" data-href="reviews" target="_blank"`);
  // Eduardo's default reviews URL (window.AGENT.reviews was empty, which hid the button).
  h = h.replace(/(window\.AGENT\s*=\s*\{[^}]*?\breviews:\s*)""/, `$1"${GBP}"`);
  if (h !== before) fs.writeFileSync(file, h);
  console.log(f, h === before ? "unchanged" : "updated",
    "| tablists:", (h.match(/class="tabs" role="tablist"/g) || []).length,
    "| reviews default:", h.includes(`reviews:"${GBP}"`) || h.includes(`reviews: "${GBP}"`));
}
