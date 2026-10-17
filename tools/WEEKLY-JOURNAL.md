# Weekly journal post (every Friday, ~8 AM Eastern)

Eduardo (2026-10-17): every Friday morning, research what is trending in real estate in his markets, write the
best possible post for it, and publish it on eduardoinoa.com, plus update whatever on the site needs updating.
A scheduled Claude session runs this file. A person can run it by hand the same way.

**Markets:** Massachusetts (MA lic. 9573019) and New Hampshire (NH lic. 078562). Merrimack Valley and Southern NH:
Methuen, Lawrence, Haverhill, Andover, North Andover, Dracut, Tewksbury, Lowell, Tyngsborough, Chelmsford,
Westford · Salem, Windham, Pelham, Nashua, Derry, Londonderry, Hudson, Atkinson, Plaistow.

The site rules in `README.md` ("Rules") apply to every word. The two that matter most here:
**never invent a number**, and **Fair Housing: describe places and homes, never who lives there.**

## 1. Sync

```bash
git pull --rebase origin main
cd tools && npm ci && cd ..
```

- `market.json` → `updated` should be from this week (the "Update market data" Action runs Friday 7 AM ET).
  If it is older than 7 days, write from it anyway but say "as of <date>" for every figure and flag it in the
  summary.
- Read `tools/data/posts.json` (titles, dates). Do not repeat a topic covered in the last 8 weeks.

## 2. Research (past 7 days)

Use web search. Look for, in this order of weight:

1. **Rates.** Freddie Mac's Primary Mortgage Market Survey (published Thursdays), and why it moved.
2. **State market reports.** Massachusetts Association of REALTORS® (monthly, mid-month), New Hampshire
   REALTORS®, The Warren Group, Redfin / Realtor.com / Zillow releases about MA or NH.
3. **Policy and programs.** MA and NH housing law, MassHousing, ONE Mortgage, New Hampshire Housing, property
   tax and assessment news, zoning (e.g. MBTA Communities in the MA towns above).
4. **Local news in the 20 towns.** Developments, zoning votes, school or transit projects, tax rates.
5. **Seasonal timing** for buyers and sellers, if nothing above is new.

Pick **one** topic: the most local relevance plus the most use to a buyer, seller or investor here. Prefer
news that changes a decision over news that is merely interesting.

**Numbers.** A figure may appear in the post only if it comes from:
- `market.json` (already licensed and attributed by the Market Pulse), or
- a source you actually read this run, confirmed by the publisher itself or by two independent reports, and
  linked in the post.

Your own arithmetic on those figures (a payment at a cited rate) is fine when labelled as an illustration.
If two sources disagree, leave the figure out. Never estimate, round up or forecast. No predictions stated as
fact ("rates will fall"). Do not use automated value estimates of single homes.

## 3. Write

Every post is **rich and search-optimized, always**. `npm run qa` enforces the minimums below and fails the
run if one is missing, so a thin post cannot publish.

- **Length and voice:** 700–1,100 words, plain and practical, first person as Eduardo. Match the existing posts
  in `posts/` and `tools/data/journal/`. No emojis. No hype.
- **Shape:**
  - an opening paragraph that says what happened and why it matters here;
  - two to four `<h2>` sections;
  - "What this means for buyers" and "What this means for sellers" (or investors);
  - one `<blockquote>`;
  - a closing line pointing to the Market Pulse or to him;
  - a `<div class="box"><span class="label">Sources</span>…</div>` naming every source with dates and links.
- **Images (at least 2 inside the article, plus the cover):** put `<!--photo:<slug>-->` on its own line between
  paragraphs, using a slug from `img/photos/manifest.json` only (licensed; the credit and alt text come with
  it). Prefer the towns the post talks about, then season and home photos. Do not reuse last week's photos.
- **Charts and tables (at least one):** `<!--chart:rates-->` (Freddie Mac 30-year, 26 weeks) and
  `<!--chart:value:<town>-->` (a town's Zillow typical value, 24 months; `<town>` like `lawrence`,
  `salem-nh`, `nashua`) are drawn from `market.json`, frozen at the post date. A `.tw` table works too, for
  exact figures.
- **"In short" box:** 3–5 `takeaways` in `posts.json` (plain sentences, each one fact plus its meaning).
  Rendered at the top of the post.
- **Questions:** 3–6 `faqs` in `posts.json` (`{"q", "a"}`, plain text). These are the questions people
  actually type into Google about this topic ("Are mortgage rates going to come down?", "Is it a good time to
  buy in <town>?"). Answers in 2–4 sentences, same numbers rule, no predictions. Rendered as a section with
  FAQPage structured data.
- **Internal links (at least 2):** the town pages (`/towns/<slug>`, Spanish `/es/pueblos/<slug>` where it
  exists), the toolkit (`/buyers#toolkit/payment`, `/buyers#toolkit/afford`, `/sellers#tool-equity`), the
  Market Pulse (`/#market`) and earlier posts.
- **Allowed HTML:** `p h2 h3 ul ol li strong em a blockquote`, `.tw` tables (`<div class="tw"><table>…</table></div>`)
  and `.box` callouts. External links get `target="_blank" rel="noopener"`.

**SEO, every post:**
- **The search phrase.** Pick the phrase a local buyer or seller would search, e.g. "mortgage rates
  Massachusetts", "Methuen home prices", "first-time buyer New Hampshire". Use it in the title, the h1, the
  slug, the summary, the first paragraph and one `<h2>`. Natural, never stuffed.
- **`metaTitle`:** at most 65 characters before " | Eduardo Inoa, REALTOR®". Lead with the phrase.
- **`summary`** (the meta description): 110–165 characters, with the phrase and a reason to click.
- **`keywords`:** 3–8 phrases (used in structured data). Include at least one with a town or state name.
- **Spanish:** its own phrase in Spanish ("tasas hipotecarias Massachusetts"), not a literal translation.
- **Structure:** at least 3 `<h2>` sections. 700–1,600 words in English (650+ in Spanish).
- **Handled by the generator:** canonical, hreflang, Open Graph `article`, the share card, BlogPosting with
  `wordCount`, `keywords` and `articleSection`, FAQPage, breadcrumbs and the sitemap.
- **Spanish edition:** the same facts and numbers, nothing added. Natural Spanish (usted), not a word-for-word
  translation. Keep US number formats ($400,000, 7.40%).

## 4. Build (data, not hand-written pages)

1. `tools/data/journal/<slug>.html`: English body. `<slug>`: short, lowercase, hyphens, unique, e.g.
   `mortgage-rates-7-4-percent-fall-2026`.
2. `tools/data/journal/<slug-es>.html`: Spanish body.
3. `tools/data/posts.json`: add the English entry at the **top** of `en` and the Spanish entry at the top of
   `es`. Copy the shape of the newest entries:
   - **English:** `slug, path (/posts/<slug>), esPath, date (YYYY-MM-DD, today), category (Market | Buyers | Sellers | Investing), title, h1 (one <em>…</em> at the end), metaTitle (ends " | Eduardo Inoa, REALTOR®"), crumb, summary (110-165 chars), cover, towns, related, keywords, takeaways, faqs`.
   - **Spanish:** the same, plus `enSlug` instead of `esPath`, path `/es/blog/<slug-es>`, and a Spanish category (Mercado | Compradores | Vendedores | Inversión).
   - **`cover`:** a slug from `img/photos/manifest.json`. Never add a photo we have no rights to. Prefer one
     that fits the season or the town in the post, and not the cover used last week.
   - **`towns`:** 0–3 keys from `posts.json` → `towns`.
   - **`related`:** 3 existing slugs.
4. Generate:
   ```bash
   cd tools && npm run gen
   ```
   This builds both post pages and their share cards, and refreshes `/journal`, `/es/blog`, the five home
   cards (`index.html` and `/es`), the site map, `llms.txt` and `sitemap.xml`.

## 5. Update whatever needs updating

- If the research shows something on the site is now wrong (a program limit, a tax figure in a hand-written
  post), fix it only when the fix is small and the new figure meets the numbers rule above. Then rerun
  `npm run gen`.
- List anything bigger in the summary for Eduardo instead.

## 6. Check

```bash
cd tools && npm run qa        # must end with "All static checks passed."
```

QA also enforces the richness and SEO minimums from step 3.

Also confirm:
- the new pages contain no emojis;
- every number in the post appears in your sources;
- the Spanish page has the same numbers as the English one;
- `git status` shows only the expected files (the two bodies, `posts.json` and generated output).

If QA fails and you cannot fix it, **do not publish**. Discard the changes and report why.

## 7. Publish

```bash
git add -A
git -c user.name="eduardoinoa18" -c user.email="eduardoinoa18@users.noreply.github.com" \
  commit -m "journal: <title> (weekly $(date -u +%F))"
git pull --rebase origin main      # the market Action or the Marketora sync may have pushed meanwhile
cd tools && npm run gen && npm run qa && cd ..   # only if the rebase brought changes; commit any regenerated output
git push origin HEAD:main
```

- Commit as the repo owner (as the Actions do) so Vercel deploys it.
- Push straight to `main`; this repo has no PR process.
- Vercel deploys within a minute or two.

## 8. Report

End with:
- the title;
- `https://eduardoinoa.com/posts/<slug>` and `https://eduardoinoa.com/es/blog/<slug-es>`;
- the sources;
- anything flagged (a stale `market.json`, a fix you made, something bigger for Eduardo).
