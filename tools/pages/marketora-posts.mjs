// Blog posts Eduardo publishes in Marketora become real pages here: /posts/<slug>.
// A hand-written posts/<slug>.html with the same slug always wins (his original articles are never
// replaced). Marketora's copy of each post points its canonical at https://eduardoinoa.com/posts/<slug>
// (site-templates-eduardo canonical), so this page is the one search engines index.
import fs from "node:fs";
import path from "node:path";
import { loadFeed, postBody, httpsUrl } from "../lib/marketora.mjs";

export default function marketoraPosts(ctx) {
  const { ROOT, BASE, IDS, esc, breadcrumb, CONFIG } = ctx;
  const feed = loadFeed();
  const handWritten = new Set(fs.readdirSync(path.join(ROOT, "posts")).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)));
  const all = ctx.photos();
  const fallback = all.find((p) => p.category === "home" && !p.town) || null;

  return feed.posts.filter((p) => !handWritten.has(p.slug)).map((p) => {
    const url = `/posts/${p.slug}`;
    const hero = httpsUrl(p.heroUrl);
    const date = String(p.publishedAt || "").slice(0, 10);
    const cta = httpsUrl(p.ctaUrl) ? { href: httpsUrl(p.ctaUrl), label: p.ctaLabel || "Learn more" } : { href: CONFIG.links.book, label: "Book 20 minutes" };
    const heroImg = hero
      ? `<img src="${esc(hero)}" alt="" fetchpriority="high" width="1600" height="900" style="width:100%;height:100%;object-fit:cover">`
      : fallback ? ctx.img(fallback.slug, { eager: true, sizes: "(max-width:900px) 100vw, 900px", alt: "" }) : "";
    return {
      lang: "en", path: url,
      title: `${p.seoTitle || p.title} | Eduardo Inoa, REALTOR®`,
      description: (p.seoDescription || p.excerpt || p.title).slice(0, 200),
      ogTitle: p.title, ogPhoto: hero ? null : fallback && fallback.slug,
      navCurrent: "/journal",
      schema: [
        breadcrumb([["Home", "/"], ["Journal", "/journal"], [p.title, url]]),
        { "@type": "BlogPosting", "@id": `${BASE}${url}#post`, headline: p.title, url: `${BASE}${url}`, mainEntityOfPage: `${BASE}${url}`,
          datePublished: date || undefined, dateModified: String(p.updatedAt || p.publishedAt || "").slice(0, 10) || undefined,
          inLanguage: "en-US", image: hero || undefined, author: { "@id": IDS.person }, publisher: { "@id": IDS.agent },
          isPartOf: { "@id": `${BASE}/journal#blog` } },
      ],
      foot: { credits: hero || !fallback ? [] : [fallback.slug] },
      sitemap: { priority: "0.7", changefreq: "monthly" },
      body: `<article>
<section class="section"><div class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/journal">Journal</a></li><li><span aria-current="page">${esc(p.title)}</span></li></ol></nav>
  <span class="label" style="margin-top:24px">Journal${date ? ` · <time datetime="${date}">${new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>` : ""}</span>
  <h1 style="font-size:clamp(38px,5vw,64px)">${esc(p.title)}</h1>
  ${p.excerpt ? `<p class="lede" style="margin-top:18px">${esc(p.excerpt)}</p>` : ""}
  ${heroImg ? `<div class="frame" style="aspect-ratio:16/9;margin-top:32px">${heroImg}</div>` : ""}
  <div class="prose" style="margin-top:36px">${postBody(p)}</div>
  <div class="btn-row"><a class="btn btn-primary" href="${esc(cta.href)}" target="_blank" rel="noopener">${esc(cta.label)}</a><a class="btn btn-ghost" href="/journal">All notes</a></div>
</div></section>
</article>`,
    };
  });
}
