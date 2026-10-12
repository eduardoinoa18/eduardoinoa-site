# Eduardo Inoa — website package

Static site, no build step. Deploy the folder as-is on Vercel (framework: Other, output directory: `.`).

- `index.html` — the website (Market Pulse, Journal, forms → Marketora lead inbox)
- `buyers/`, `sellers/` — the Buyer & Investor presentation + toolkit, and the Seller presentation
- `posts/` — journal articles (one page each)
- `market.json` — weekly market snapshot read by every page (`vercel.json` adds CORS so the Netlify hub can read it too)
- `scripts/update_market.py` + `.github/workflows/market.yml` — the weekly refresh (Mondays 7 AM ET). Enable Actions on the repo; it commits `market.json`, Vercel redeploys.
- `sitemap.xml`, `robots.txt`, share images (`og-site.jpg`, `og-buyers.jpg`, `og-sellers.jpg`)

Sources live in the `build/` folder of the working project (`build_pkg.py` regenerates everything from `brand.json`, `posts.json`, `posts/*.html`). To change the domain, edit `base` in `brand.json` and rebuild.
