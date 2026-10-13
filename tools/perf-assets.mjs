// One-off/idempotent performance assets:
//  - favicon.ico (PNG-in-ICO, 32px) at the root — browsers request it even when <link rel=icon> exists
//  - img/logo-fermin-c21-300.webp — the nav/header logo at the size it is shown (2x of ~150px), not 875px
//  - decks: the Google Fonts stylesheet loads without blocking render (media=print swap + noscript)
// Usage: cd tools && node perf-assets.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ROOT } from "./lib/layout.mjs";

const sharp = createRequire(import.meta.url)("sharp");

// favicon.ico: ICONDIR + one ICONDIRENTRY pointing at an embedded PNG (supported by every current browser).
const png = await sharp(path.join(ROOT, "img/favicon-32.png")).resize(32, 32).png().toBuffer();
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);       // reserved, type=icon, count=1
head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);                               // planes, bpp
head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);                      // size, offset
fs.writeFileSync(path.join(ROOT, "favicon.ico"), Buffer.concat([head, png]));

const logo = await sharp(path.join(ROOT, "img/logo-fermin-c21.webp")).resize({ width: 300 }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(ROOT, "img/logo-fermin-c21-300.webp"));
console.log("logo-300", logo.width + "x" + logo.height, logo.size + " bytes");

for (const f of ["buyers/index.html", "sellers/index.html"]) {
  const file = path.join(ROOT, f);
  let h = fs.readFileSync(file, "utf8");
  const re = /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)">/;
  const m = re.exec(h);
  if (m) {
    h = h.replace(m[0], `<link rel="stylesheet" href="${m[1]}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${m[1]}"></noscript>`);
    fs.writeFileSync(file, h);
    console.log(f, "fonts now non-blocking");
  } else console.log(f, "already non-blocking");
}
