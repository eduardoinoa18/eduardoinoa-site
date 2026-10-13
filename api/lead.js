// POST /api/lead — same-origin relay to the Marketora lead inbox (brief backlog #10).
// The browser can't see the inbox's answer with `no-cors`; this relay can, so a visitor only sees
// "sent" when Marketora actually stored the lead. On any relay failure the page falls back to the
// direct no-cors send and then to mailto, exactly as before — leads are never dropped here.
//
// Contract: body = the same JSON payload the forms already send (source, type, name, email, phone, ...).
// Response: { ok: true, status } when the inbox accepted it; { ok: false, status, error } otherwise.
"use strict";

const INBOX = "https://marketora.me/api/inbound/lead/XSbmOgfmponhUmAhkCw3DWAOu7GSpeoB";
const ALLOWED_HOSTS = /^(?:(?:www\.)?eduardoinoa\.com|localhost|127\.0\.0\.1|eduardoinoa[a-z0-9-]*\.vercel\.app)$/i;
const SOURCES = new Set(["website", "cash_offer", "home_value", "hub", "buyer_deck", "buyer-deck", "buyer_toolkit", "prelisting_deck", "prelisting-deck"]);
const MAX_BYTES = 12000;

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

async function forward(body, attempt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(INBOX, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctrl.signal });
    // Retry once on a server error; 4xx answers are final (bad input, rate limit).
    if (r.status >= 500 && attempt === 0) return forward(body, 1);
    return r.status;
  } catch (e) {
    if (attempt === 0) return forward(body, 1);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }
  // Same-origin only: the forms on this site (and local previews) — not a public open relay.
  const origin = req.headers.origin || req.headers.referer || "";
  if (!ALLOWED_HOSTS.test(hostOf(origin))) return res.status(403).json({ ok: false, error: "origin" });

  let raw = req.body;
  if (raw && typeof raw === "object") raw = JSON.stringify(raw);
  if (typeof raw !== "string" || !raw || Buffer.byteLength(raw) > MAX_BYTES) return res.status(400).json({ ok: false, error: "body" });

  let lead;
  try { lead = JSON.parse(raw); } catch { return res.status(400).json({ ok: false, error: "json" }); }
  if (!lead || typeof lead !== "object" || Array.isArray(lead)) return res.status(400).json({ ok: false, error: "shape" });
  if (lead.company) return res.status(200).json({ ok: true, status: 200 }); // honeypot: pretend success, send nothing
  if (!SOURCES.has(String(lead.source || ""))) return res.status(400).json({ ok: false, error: "source" });
  if (!lead.email && !lead.phone) return res.status(422).json({ ok: false, status: 422, error: "contact" });

  const status = await forward(JSON.stringify(lead), 0);
  const ok = status >= 200 && status < 300;
  return res.status(ok ? 200 : 502).json({ ok, status, error: ok ? undefined : "inbox" });
};
