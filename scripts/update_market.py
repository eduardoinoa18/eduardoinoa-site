#!/usr/bin/env python3
"""Weekly market snapshot for Eduardo Inoa's pages — free public sources only, no API keys.

  Zillow Research  ZHVI typical home value (state / county / city) + ZHVF forecast (ZIP + metro)
  Redfin Data Center market tracker (state / county / city): median sale price, DOM, sale-to-list,
                   inventory, homes sold, sold-above-list, price drops  (lags ~1–2 months)
  Realtor.com via FRED  median list price, days on market, active listings (state / county, monthly)
  Freddie Mac via FRED  30- and 15-year fixed mortgage rates (weekly)

Writes market.json (MARKET_OUT) — the only file the pages read. Run weekly by the GitHub Action;
safe to run by hand:  python3 update_market.py
Verified against the live files on 2026-10-12 (column names, file names, sizes).
"""
import csv, gzip, io, json, os, sys, time, urllib.request
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("MARKET_OUT", os.path.join(HERE, "market.json"))

STATES = {"MA": "Massachusetts", "NH": "New Hampshire"}
COUNTIES = {"Essex County, MA": ("25009", "MA"), "Middlesex County, MA": ("25017", "MA"),
            "Hillsborough County, NH": ("33011", "NH"), "Rockingham County, NH": ("33015", "NH")}
METRO = {"MA": "Boston, MA", "NH": "Manchester, NH"}
# name, state, county, ZIPs (Zillow forecast is published per ZIP; the town forecast is the ZIP average)
TOWNS = [
    # Service area, in the same order as the Google Business Profile (eduardoinoa.com brief section 2).
    # The first 14 (through Pelham) are the priority towns that have town pages.
    ("Methuen", "MA", "Essex County, MA", ["01844"]),
    ("Lawrence", "MA", "Essex County, MA", ["01840", "01841", "01843"]),
    ("Haverhill", "MA", "Essex County, MA", ["01830", "01832", "01835"]),
    ("Andover", "MA", "Essex County, MA", ["01810"]),
    ("North Andover", "MA", "Essex County, MA", ["01845"]),
    ("Dracut", "MA", "Middlesex County, MA", ["01826"]),
    ("Tewksbury", "MA", "Middlesex County, MA", ["01876"]),
    ("Lowell", "MA", "Middlesex County, MA", ["01850", "01851", "01852", "01854"]),
    ("Tyngsborough", "MA", "Middlesex County, MA", ["01879"]),
    ("Chelmsford", "MA", "Middlesex County, MA", ["01824", "01863"]),
    ("Westford", "MA", "Middlesex County, MA", ["01886"]),
    ("Salem", "NH", "Rockingham County, NH", ["03079"]),
    ("Windham", "NH", "Rockingham County, NH", ["03087"]),
    ("Pelham", "NH", "Hillsborough County, NH", ["03076"]),
    ("Nashua", "NH", "Hillsborough County, NH", ["03060", "03062", "03063", "03064"]),
    ("Derry", "NH", "Rockingham County, NH", ["03038"]),
    ("Londonderry", "NH", "Rockingham County, NH", ["03053"]),
    ("Hudson", "NH", "Hillsborough County, NH", ["03051"]),
    ("Atkinson", "NH", "Rockingham County, NH", ["03811"]),
    ("Plaistow", "NH", "Rockingham County, NH", ["03865"]),
]
TOWN_KEYS = {(n.lower(), s) for n, s, _, _ in TOWNS}
ALL_ZIPS = {z for _, _, _, zs in TOWNS for z in zs}

Z = "https://files.zillowstatic.com/research/public_csvs/"
ZHVI = {g: Z + "zhvi/%s_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" % g for g in ("State", "County", "City")}
ZHVF = {g: Z + "zhvf_growth/%s_zhvf_growth_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" % g for g in ("Zip", "Metro")}
RF = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/"
REDFIN = {"state": RF + "state_market_tracker.tsv000.gz", "county": RF + "county_market_tracker.tsv000.gz", "city": RF + "city_market_tracker.tsv000.gz"}
FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="

UA = {"User-Agent": "Mozilla/5.0 (market-snapshot; +https://marketora.me/eduardo-inoa)"}


def fetch(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except Exception as e:  # noqa
            print("retry", url, e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit("could not fetch " + url)


def stream_lines(url):
    r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600)
    raw = gzip.GzipFile(fileobj=r) if url.endswith(".gz") else r
    for line in io.TextIOWrapper(raw, encoding="utf-8", errors="replace"):
        yield line


def num(x):
    try:
        v = float(x); return v if v == v else None
    except Exception:
        return None


def pct(a, b):
    return round((a - b) / b * 100, 1) if a is not None and b not in (None, 0) else None


# ---------------- Zillow ----------------
def zillow_rows(url, want):
    rd = csv.DictReader(io.StringIO(fetch(url).decode("utf-8", "replace")))
    dates = [c for c in rd.fieldnames if len(c) == 10 and c[4] == "-" and c[7] == "-"]
    out = {}
    for row in rd:
        k = want(row)
        if k is not None:
            out[k] = row
    return out, dates


def zhvi_series(row, dates):
    pts = [(d, num(row.get(d))) for d in dates]
    pts = [(d, v) for d, v in pts if v is not None]
    if not pts:
        return None
    d, v = pts[-1]
    g = lambda i: pts[-i][1] if len(pts) >= i else None
    return {"value": round(v), "asOf": d, "mom": pct(v, g(2)), "yoy": pct(v, g(13)), "fiveYear": pct(v, g(61)),
            "history": [{"m": p[0][:7], "v": round(p[1])} for p in pts[-25:]]}


def zhvf(row, dates):
    """Zillow forecast rows carry BaseDate + three future month columns (1, 3, 12 months ahead), % growth."""
    fut = sorted((d, num(row.get(d))) for d in dates)
    fut = [(d, v) for d, v in fut if v is not None]
    out = {"baseDate": row.get("BaseDate", "")}
    for lab, (d, v) in zip(["m1", "q1", "y1"], fut[:3]):
        out[lab] = {"to": d, "pct": round(v, 1)}
    return out


def avg_forecast(zf, zips):
    rows = [zf[z] for z in zips if z in zf]
    if not rows:
        return None
    out = {"baseDate": rows[0]["baseDate"], "zips": [z for z in zips if z in zf]}
    for lab in ("m1", "q1", "y1"):
        vals = [r[lab]["pct"] for r in rows if lab in r]
        if vals:
            out[lab] = {"to": rows[0][lab]["to"], "pct": round(sum(vals) / len(vals), 1)}
    return out


def zillow():
    st, sd = zillow_rows(ZHVI["State"], lambda r: r["RegionName"] if r["RegionName"] in STATES.values() else None)
    co, cd = zillow_rows(ZHVI["County"], lambda r: (r["RegionName"] + ", " + r["State"]) if (r["RegionName"] + ", " + r["State"]) in COUNTIES else None)
    ci, cid = zillow_rows(ZHVI["City"], lambda r: (r["RegionName"].lower(), r["State"]) if (r["RegionName"].lower(), r["State"]) in TOWN_KEYS else None)
    zf, zfd = zillow_rows(ZHVF["Zip"], lambda r: r["RegionName"] if r["RegionName"] in ALL_ZIPS else None)
    mf, mfd = zillow_rows(ZHVF["Metro"], lambda r: r["RegionName"] if r["RegionName"] in METRO.values() else None)
    zfp = {z: zhvf(r, zfd) for z, r in zf.items()}
    return {
        "states": {c: {"zhvi": zhvi_series(st[n], sd) if n in st else None, "forecast": zhvf(mf[METRO[c]], mfd) if METRO[c] in mf else None, "forecastRegion": METRO[c]} for c, n in STATES.items()},
        "counties": {k: {"zhvi": zhvi_series(co[k], cd) if k in co else None} for k in COUNTIES},
        "towns": {(n, s): {"zhvi": zhvi_series(ci[(n.lower(), s)], cid) if (n.lower(), s) in ci else None, "forecast": avg_forecast(zfp, zs)} for n, s, _, zs in TOWNS},
    }


# ---------------- Redfin ----------------
RF_FIELDS = {"median_sale_price": ("medianSale", "int"), "median_sale_price_yoy": ("medianSaleYoY", "pct"), "median_list_price": ("medianList", "int"),
             "median_dom": ("dom", "int"), "median_dom_yoy": ("domYoY", "int"), "avg_sale_to_list": ("saleToList", "pct"),
             "inventory": ("inventory", "int"), "inventory_yoy": ("inventoryYoY", "pct"), "homes_sold": ("homesSold", "int"), "homes_sold_yoy": ("homesSoldYoY", "pct"),
             "new_listings": ("newListings", "int"), "months_of_supply": ("monthsSupply", "f1"), "sold_above_list": ("soldAboveList", "pct"),
             "price_drops": ("priceDrops", "pct"), "median_ppsf": ("ppsf", "int"), "median_ppsf_yoy": ("ppsfYoY", "pct")}


def redfin(url, regions):
    """Latest 'All Residential' monthly row per region. Header is UPPERCASE and quoted in the public files."""
    it = stream_lines(url)
    h = [c.strip().strip('"').lower() for c in next(it).rstrip("\n").split("\t")]
    idx = {k: i for i, k in enumerate(h)}
    best = {}
    for line in it:
        if "All Residential" not in line:
            continue
        c = [x.strip('"') for x in line.rstrip("\n").split("\t")]
        if len(c) < len(h) or c[idx["property_type"]] != "All Residential":
            continue
        reg = c[idx["region"]]
        if reg not in regions:
            continue
        pe = c[idx["period_end"]]
        if reg not in best or pe > best[reg][0]:
            best[reg] = (pe, c)
    out = {}
    for reg, (pe, c) in best.items():
        d = {"periodEnd": pe, "periodBegin": c[idx["period_begin"]]}
        for src, (dst, kind) in RF_FIELDS.items():
            v = num(c[idx[src]]) if src in idx else None
            if v is None:
                continue
            d[dst] = round(v * 100, 1) if kind == "pct" else round(v, 1) if kind == "f1" else round(v)
        if "saleToList" in d:
            d["saleToList"] = round(d["saleToList"], 1)  # already ×100 → e.g. 101.4
        out[reg] = d
    return out


def redfin_all():
    rs = redfin(REDFIN["state"], set(STATES.values()))
    rc = redfin(REDFIN["county"], set(COUNTIES))
    rt = redfin(REDFIN["city"], {n + ", " + s for n, s, _, _ in TOWNS})
    return {c: rs.get(n) for c, n in STATES.items()}, rc, {(n, s): rt.get(n + ", " + s) for n, s, _, _ in TOWNS}


# ---------------- FRED ----------------
def fred_rows(series):
    text = fetch(FRED_CSV + series).decode()
    return [r for r in csv.reader(io.StringIO(text)) if len(r) == 2 and num(r[1]) is not None]


def rate(series):
    rows = fred_rows(series)
    if not rows:
        return None
    g = lambda i: num(rows[-i][1]) if len(rows) >= i else None
    return {"rate": g(1), "asOf": rows[-1][0], "prev": g(2), "yearAgo": g(53), "history": [{"d": r[0], "v": num(r[1])} for r in rows[-52:]]}


def realtor(code):
    """Realtor.com monthly inventory series on FRED: MEDLISPRI / MEDDAYONMAR / ACTLISCOU + state code or county FIPS."""
    out = {}
    for key, sid in (("medianList", "MEDLISPRI"), ("dom", "MEDDAYONMAR"), ("activeListings", "ACTLISCOU")):
        try:
            rows = fred_rows(sid + code)
        except SystemExit:
            rows = []
        if rows:
            v, ago = num(rows[-1][1]), (num(rows[-13][1]) if len(rows) >= 13 else None)
            out[key] = {"v": round(v), "asOf": rows[-1][0][:7], "yearAgo": round(ago) if ago is not None else None, "yoy": pct(v, ago)}
    return out or None


# ---------------- assemble ----------------
def main():
    t0 = time.time()
    print("zillow…", flush=True); zl = zillow()
    print("fred…", flush=True)
    rates = {"fixed30": rate("MORTGAGE30US"), "fixed15": rate("MORTGAGE15US")}
    rl = {c: realtor(c) for c in STATES}
    rl.update({k: realtor(fips) for k, (fips, _) in COUNTIES.items()})
    print("redfin… (streams ~1.3 GB, a few minutes)", flush=True); rs, rc, rt = redfin_all()
    out = {
        "updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
        "sources": {
            "zillow": "Zillow Home Value Index (ZHVI, typical mid-tier home, smoothed & seasonally adjusted) and Zillow Home Value Forecast (ZHVF) — Zillow Research",
            "redfin": "Redfin Data Center market tracker — all residential, latest monthly period",
            "realtor": "Realtor.com residential listings data via FRED (median list price, days on market, active listings)",
            "rates": "Freddie Mac Primary Mortgage Market Survey via FRED",
        },
        "rates": rates,
        "states": {c: {"name": n, "zillow": zl["states"][c], "redfin": rs.get(c), "realtor": rl.get(c)} for c, n in STATES.items()},
        "counties": {k: {"state": st, "zillow": zl["counties"][k], "redfin": rc.get(k), "realtor": rl.get(k)} for k, (fips, st) in COUNTIES.items()},
        "towns": [{"name": n, "state": s, "county": c, "zips": zs, "zillow": zl["towns"][(n, s)], "redfin": rt.get((n, s))} for n, s, c, zs in TOWNS],
    }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print("wrote", OUT, os.path.getsize(OUT), "bytes in", round(time.time() - t0), "s")
    for label, test in (("Zillow value", lambda t: t["zillow"] and t["zillow"]["zhvi"]), ("Redfin row", lambda t: t["redfin"])):
        miss = [t["name"] + " " + t["state"] for t in out["towns"] if not test(t)]
        if miss:
            print("no %s for: %s" % (label, ", ".join(miss)))


if __name__ == "__main__":
    main()
