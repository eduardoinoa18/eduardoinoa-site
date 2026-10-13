// Branded 1200x630 share cards (og:image) rendered locally with sharp.
// Card = the page's own photo (or navy), a dark gradient, the headline in serif, and the agent/brokerage line.
// Files are named by a content hash so social networks re-fetch when the card changes; stale cards for the
// same page are deleted.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { ROOT } from "./layout.mjs";

const sharp = createRequire(import.meta.url)("sharp");
const DIR = path.join(ROOT, "img/og");
const W = 1200, H = 630, VERSION = "2";

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

function wrap(text, max) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * @param {string} key      stable id for the page, e.g. "towns-lowell"
 * @param {object} o        { title, kicker, photo (absolute path to an image file or null) }
 * @returns {Promise<string>} root-relative URL of the card
 */
export async function ogCard(key, { title, kicker, photo }) {
  fs.mkdirSync(DIR, { recursive: true });
  const hash = crypto.createHash("sha1").update([VERSION, title, kicker, photo ? path.basename(photo) : ""].join("|")).digest("hex").slice(0, 8);
  const name = `${key}-${hash}.jpg`, out = path.join(DIR, name);
  for (const f of fs.readdirSync(DIR)) if (f.startsWith(key + "-") && f !== name && /^[a-z0-9-]+-[0-9a-f]{8}\.jpg$/.test(f) && f.slice(0, -13) === key) fs.unlinkSync(path.join(DIR, f));
  if (fs.existsSync(out)) return `/img/og/${name}`;

  let size = 66, lines = wrap(title, 30);
  if (lines.length > 3) { size = 54; lines = wrap(title, 38); }
  lines = lines.slice(0, 4);
  const lh = Math.round(size * 1.12), top = H - 150 - lh * (lines.length - 1);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#061A30" stop-opacity="${photo ? 0.05 : 1}"/><stop offset=".3" stop-color="#061A30" stop-opacity="${photo ? 0.3 : 1}"/><stop offset=".55" stop-color="#061A30" stop-opacity="${photo ? 0.84 : 1}"/><stop offset="1" stop-color="#061A30" stop-opacity="0.96"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#C9AE7C" stroke-opacity=".7" stroke-width="1.5" rx="14"/>
  <text x="72" y="${top - lh - 6}" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#C9AE7C" letter-spacing="1">${xml(kicker)}</text>
  ${lines.map((l, i) => `<text x="72" y="${top + i * lh}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="#FFFFFF">${xml(l)}</text>`).join("\n  ")}
  <line x1="72" y1="${H - 96}" x2="132" y2="${H - 96}" stroke="#C9AE7C" stroke-width="2"/>
  <text x="148" y="${H - 88}" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#E6EDF4">Eduardo Inoa, REALTOR® · The Fermin Group, Century 21 North East</text>
  <text x="72" y="${H - 52}" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#9FB2C5">eduardoinoa.com · English &amp; Español · (978) 390-9619</text>
</svg>`;
  const base = photo && fs.existsSync(photo)
    ? sharp(photo).resize(W, H, { fit: "cover", position: "attention" })
    : sharp({ create: { width: W, height: H, channels: 3, background: "#0B2A4A" } });
  await base.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
  return `/img/og/${name}`;
}

export const photoFile = (slug) => (slug ? path.join(ROOT, "img/photos", `${slug}-1600.webp`) : null);
