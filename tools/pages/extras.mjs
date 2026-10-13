// Utility outputs: the branded 404 page (/404.html, served by Vercel for unknown paths) and /llms.txt
// (a plain-text summary for AI assistants and answer engines). Neither goes in the sitemap.
import fs from "node:fs";
import path from "node:path";

export default function extras(ctx) {
  const { CONFIG, ROOT } = ctx;
  const NAP = CONFIG.nap, L = CONFIG.links, S = CONFIG.stats || {};
  const towns = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/towns.json"), "utf8")).towns;
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/data/posts.json"), "utf8"));

  const notFound = {
    lang: "en", path: "/404", file: "404.html", noindex: true, sitemap: false,
    title: "Page not found | Eduardo Inoa, REALTOR®",
    description: "That page moved or never existed. Here is where to go next on eduardoinoa.com.",
    body: `<section class="section"><div class="wrap narrow">
<span class="label">404</span>
<h1 style="font-size:clamp(40px,5.5vw,72px)">This page isn't here.</h1>
<p class="lede" style="margin-top:18px">It may have moved, or the link had a typo. Here's where most people are headed.</p>
<p class="lede" lang="es" style="margin-top:10px">Esta página no existe. <a href="/es">Vaya al inicio en español</a>.</p>
<div class="btn-row"><a class="btn btn-primary" href="/">Go to the home page</a><a class="btn btn-ghost" href="/home-value">What's my home worth?</a></div>
<div class="chips" style="margin-top:36px"><a href="/buyers">Buying</a><a href="/sellers">Selling</a><a href="/toolkit">Toolkit</a><a href="/towns">Towns</a><a href="/cash-offer">Cash offer</a><a href="/journal">Journal</a><a href="/listings">Search homes</a><a href="/site-map">Site map</a></div>
</div></section>`,
  };

  const lines = [
    `# Eduardo Inoa, REALTOR®`,
    ``,
    `> Bilingual (English/Spanish) real-estate agent with ${NAP.brokerage}, ${NAP.street}, ${NAP.city}, ${NAP.region} ${NAP.zip}. Licensed in Massachusetts (9573019) and New Hampshire (078562) since 2021. Serves buyers, sellers and investors in the Merrimack Valley (MA) and Southern New Hampshire. Phone ${NAP.phone}, email ${NAP.email}.`,
    ``,
    `Facts stated on this site: ${S.transactions || "35+"} transactions; MA Notary Public; Associate degree, Northern Essex Community College. Each office is independently owned and operated. Equal Housing Opportunity.`,
    ``,
    `## Main pages`,
    `- [Home](${CONFIG.base}/): overview, weekly Market Pulse for 20 towns, reviews, FAQ, contact`,
    `- [Buyer & investor presentation](${CONFIG.base}/buyers): buying roadmap, offer strategy, full calculator toolkit`,
    `- [Seller presentation](${CONFIG.base}/sellers): pricing, net proceeds, marketing plan`,
    `- [Home value](${CONFIG.base}/home-value): free comparative market analysis request`,
    `- [Cash offer vs. open market](${CONFIG.base}/cash-offer): compare a third-party cash offer with an open-market estimate (Eduardo is not the buyer)`,
    `- [Toolkit](${CONFIG.base}/toolkit): free calculators — buying power, payment, cash to close, net proceeds, rental analysis, flips, wholesale`,
    `- [Search homes](${CONFIG.base}/listings)`,
    `- [Market data (JSON)](${CONFIG.base}/market.json): weekly snapshot from Zillow Research, Redfin Data Center, Realtor.com via FRED and Freddie Mac`,
    ``,
    `## Town guides`,
    ...towns.map((t) => `- [${t.name}, ${t.state}](${CONFIG.base}/towns/${t.slug})`),
    ``,
    `## Journal`,
    ...(posts.en || []).map((p) => `- [${p.title}](${CONFIG.base}${p.path}): ${p.summary}`),
    ``,
    `## Spanish`,
    `- [Inicio en español](${CONFIG.base}/es)`,
    `- [Herramientas](${CONFIG.base}/es/herramientas)`,
    `- [Pueblos](${CONFIG.base}/es/pueblos)`,
    `- [Blog](${CONFIG.base}/es/blog)`,
    ``,
    `## Contact`,
    `- Book a call: ${L.book}`,
    `- Digital card: ${L.card}`,
    ``,
  ];
  const llms = { lang: "en", path: "/llms.txt", file: "llms.txt", noindex: true, sitemap: false, html: lines.join("\n") };

  return [notFound, llms];
}
