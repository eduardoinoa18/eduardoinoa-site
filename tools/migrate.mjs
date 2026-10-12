// One-time (idempotent) migration of the delivered package to the eduardoinoa.com launch state.
//   1. Embedded base64 images -> /img files (WebP + width/height); the decks keep one small data-URI logo for the PDF export.
//   2. eduardoinoa.vercel.app -> eduardoinoa.com, old lead token -> new token, old hub -> new hub.
//   3. NAP: "130 Parker St, Suite 14, Lawrence, MA 01843" everywhere (visible text + JSON-LD).
// Safe to re-run: every step is a no-op once applied.  Usage: node tools/migrate.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const sharp = createRequire(import.meta.url)("sharp");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://eduardoinoa.com";
const OLD_TOKEN = "rjx7ppG9-DC3sc8MWSHqpcSzMOyBonao";
const NEW_TOKEN = "XSbmOgfmponhUmAhkCw3DWAOu7GSpeoB";

// sha1(first 8) of the decoded bytes -> published name. Verified visually 2026-10-12.
const IMAGES = {
  "05176b02": { name: "eduardo-portrait", q: 82 },        // 900x720 hero headshot
  "0a72dc1e": { name: "eduardo-standing", q: 82 },        // 520x728 full-length
  "1b0dd878": { name: "eduardo-avatar", q: 82 },          // 220x220 round avatar (posts)
  "3f4d7ff0": { name: "logo-fermin-c21", q: 90 },         // dark "FG" mark, light backgrounds
  "68332a2e": { name: "logo-fermin-c21", q: 90 },         // larger copy of the same mark (decks)
  "266b613c": { name: "logo-fermin-c21-light", q: 90 },   // light "FG" mark, dark backgrounds
  "70f08451": { name: "c21-north-east", q: 85 },          // Century 21 North East seal
  "cf19fac7": { name: "logo-inoa-services", q: 90 },      // Inoa Services wordmark
  "dcb6b965": { name: "logo-inoa-services", q: 90 },      // larger copy of the same
  "4aa8faa1": { name: "favicon", favicon: true },         // house icon
};

const PAGES = ["index.html", "buyers/index.html", "sellers/index.html",
  ...fs.readdirSync(path.join(ROOT, "posts")).filter((f) => f.endsWith(".html")).map((f) => "posts/" + f)];
const isDeck = (p) => p.startsWith("buyers/") || p.startsWith("sellers/");

fs.mkdirSync(path.join(ROOT, "img"), { recursive: true });
const written = new Map(); // name -> {w,h}
let logoDataUri = null;

async function publish(buf, spec) {
  if (written.has(spec.name)) {
    // Same logical image embedded at two sizes: keep the larger source.
    const prev = written.get(spec.name);
    const meta = await sharp(buf).metadata();
    if (meta.width <= prev.srcW) return prev;
  }
  const meta = await sharp(buf).metadata();
  let out;
  if (spec.favicon) {
    // Square, padded icons from the wide house mark.
    const icon = (size) => sharp(buf).trim().resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png({ compressionLevel: 9 });
    await icon(32).toFile(path.join(ROOT, "img/favicon-32.png"));
    await icon(180).toFile(path.join(ROOT, "img/apple-touch-icon.png"));
    await icon(192).toFile(path.join(ROOT, "img/favicon.png"));
    out = { url: "/img/favicon.png", w: 192, h: 192, srcW: meta.width };
  } else {
    // Cap the long edge so a 2x-density screen still gets a sharp image.
    const pipeline = sharp(buf).resize({ width: Math.min(meta.width, 900), withoutEnlargement: true });
    const info = await pipeline.webp({ quality: spec.q, alphaQuality: 90, effort: 6 }).toFile(path.join(ROOT, `img/${spec.name}.webp`));
    out = { url: `/img/${spec.name}.webp`, w: info.width, h: info.height, srcW: meta.width };
    if (spec.name === "logo-fermin-c21") {
      // PNG copy for places that cannot take WebP (email clients, Marketora brand kit).
      await sharp(buf).resize({ width: Math.min(meta.width, 600), withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(path.join(ROOT, "img/logo-fermin-c21.png"));
    }
    if (spec.name === "logo-inoa-services" && meta.width > 600) {
      // The decks' PDF export (window.LOGO_SRC) needs a data URI; 320px is plenty for a print header.
      const png = await sharp(buf).resize({ width: 320 }).png({ compressionLevel: 9, palette: true }).toBuffer();
      logoDataUri = "data:image/png;base64," + png.toString("base64");
    }
  }
  written.set(spec.name, out);
  return out;
}

// Pass 1: collect and publish every embedded image.
const blobs = new Map(); // full data uri -> spec
for (const p of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");
  for (const m of html.matchAll(/data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/g)) {
    if (blobs.has(m[0])) continue;
    const buf = Buffer.from(m[2], "base64");
    const h = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
    const spec = IMAGES[h];
    if (!spec) { if (m[0].length > 6000 && !html.includes(`window.LOGO_SRC = "${m[0]}"`)) console.warn("unmapped image", h, "in", p); continue; }
    blobs.set(m[0], { spec, buf });
  }
}
// Larger sources first so the published file is the best copy.
const ordered = [...blobs.entries()].sort((a, b) => b[1].buf.length - a[1].buf.length);
for (const [, v] of ordered) await publish(v.buf, v.spec);
if (!logoDataUri) {
  // Re-run: the original blob is gone, so rebuild the PDF logo from the published file.
  const png = await sharp(path.join(ROOT, "img/logo-inoa-services.webp")).resize({ width: 320 }).png({ compressionLevel: 9, palette: true }).toBuffer();
  logoDataUri = "data:image/png;base64," + png.toString("base64");
}

// Pass 2: rewrite pages.
const report = [];
for (const p of PAGES) {
  const file = path.join(ROOT, p);
  let html = fs.readFileSync(file, "utf8");
  const before = html.length;
  const abs = isDeck(p) ? BASE : ""; // decks are also uploaded to Marketora as single files

  // The PDF logo stays a data URI, just a much smaller one.
  html = html.replace(/window\.LOGO_SRC = "(?:data:image\/png;base64,[A-Za-z0-9+/=]+|null)"/, () => `window.LOGO_SRC = "${logoDataUri}"`);
  for (const [uri, { spec }] of blobs) {
    if (!html.includes(uri)) continue;
    const out = written.get(spec.name);
    html = html.split(uri).join(abs + out.url);
  }
  // Favicon links: point at the real files and add the touch icon once.
  html = html.replace(/<link rel="icon" type="image\/png" href="[^"]*">/,
    `<link rel="icon" type="image/png" sizes="32x32" href="${abs}/img/favicon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="${abs}/img/favicon.png"><link rel="apple-touch-icon" href="${abs}/img/apple-touch-icon.png">`);

  // Domains, token, hub.
  html = html
    .replace(/https:\/\/eduardoinoa\.vercel\.app(?=[#"'?\s<])/g, BASE + "/")
    .replace(/https:\/\/eduardoinoa\.vercel\.app/g, BASE)
    .replace(/https:\/\/eduardoinoa\.com\/\//g, BASE + "/")
    .split(OLD_TOKEN).join(NEW_TOKEN)
    .replace(/https:\/\/eduardoinoa\.netlify\.app/g, "https://eduardoinoa-links.netlify.app");

  // NAP (visible + JSON-LD).
  html = html
    .replace(/130 Parker St, Lawrence, MA(?! 0)/g, "130 Parker St, Suite 14, Lawrence, MA 01843")
    .replace(/"streetAddress": "130 Parker St", "addressLocality": "Lawrence", "addressRegion": "MA", "addressCountry": "US"/g,
      '"streetAddress": "130 Parker St, Suite 14", "addressLocality": "Lawrence", "addressRegion": "MA", "postalCode": "01843", "addressCountry": "US"');

  // Below-the-fold images that now load from the network: lazy + async decode.
  html = html.replace(/<img (?![^>]*\bloading=)([^>]*src="(?:https:\/\/eduardoinoa\.com)?\/img\/(?:eduardo-standing|logo-inoa-services|c21-north-east|logo-fermin-c21-light)[^"]*"[^>]*)>/g,
    '<img loading="lazy" decoding="async" $1>');

  fs.writeFileSync(file, html);
  report.push(`${p.padEnd(48)} ${(before / 1024).toFixed(0).padStart(5)} KB -> ${(html.length / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(report.join("\n"));
console.log("images:", [...written.entries()].map(([n, o]) => `${n} ${o.w}x${o.h}`).join(", "));
