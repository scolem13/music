#!/usr/bin/env python3
"""Each theme's catalogue number (BWV 1046, K. 550, Op. 27 No. 2) and dates (composed, published, first performed).

    python3 scripts/theme-works.py [../classical-music-themes]
    -> scripts/theme-sources/theme-works.json  {id: {catalogue, composed, published, premiere, work, wikidata}}

1. Every theme (9,824): a catalogue number read from its title in the old set's tsvs/themes.tsv.
2. MTD themes: recording (theme-sources/mtd-movements.json) -> its MusicBrainz work (the movement) -> up the "parts"
   links to the whole work -> that work's Wikidata item. MusicBrainz asks one request a second; lookups cached in
   $TMPDIR/mtd-musicbrainz.
3. Wikidata (batched SPARQL): catalogue code (P528, with its catalogue, P972), inception (P571), publication (P577),
   first performance (P1191). Years only. Wikidata's catalogue code wins over the title's. MusicBrainz / Wikidata: CC0.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

here = os.path.dirname(os.path.abspath(__file__))
cmt = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "../../classical-music-themes"))
out = os.path.join(here, "theme-sources/theme-works.json")
UA = "everything-music-site/0.1 (classical themes; https://github.com/)"
cache_dir = os.path.join(os.environ.get("TMPDIR", "/tmp"), "mtd-musicbrainz"); os.makedirs(cache_dir, exist_ok=True)

def get(url, tries=4, data=None):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=90))
        except Exception:
            if i == tries - 1: raise
            time.sleep(4 * (i + 1))

def mb(kind, mbid, inc):
    cf = os.path.join(cache_dir, kind + "-" + mbid + ".json")
    if os.path.exists(cf): return json.load(open(cf, encoding="utf-8"))
    try: d = get("https://musicbrainz.org/ws/2/%s/%s?inc=%s&fmt=json" % (kind, mbid, inc))
    except Exception: d = {}
    json.dump(d, open(cf, "w", encoding="utf-8")); time.sleep(1.1)
    return d

# catalogue numbers as written in titles, most specific first
CAT = re.compile(r"\b(BWV|BuxWV|HWV|HV|TWV|RV|Hob\.?\s*[IVXL]+[a-z]?:?|K\.?\s*V?\.?|KV|D\.?|WoO|S\.?|L\.?|Kk\.?|Sz\.?|BB|TrV|JW|"
                 r"FS|Wq\.?|H\.?|Z\.?|M\.?|B\.?|Op\.?|Opus)\s*(\d+[a-z]?(?:/\d+)?(?:\s*,?\s*No\.?\s*\d+)?)", re.I)

def cat_from(title):
    for m in CAT.finditer(title):
        k = re.sub(r"\s+", " ", m.group(1)).strip().rstrip(".")
        if k.lower() in ("b", "h", "m", "s", "z", "l", "d") and not re.search(r"\.", m.group(1)): continue   # "D 7" is too loose bare
        k = {"op": "Op.", "opus": "Op.", "k": "K.", "kv": "K.", "d": "D.", "s": "S.", "wq": "Wq."}.get(k.lower(), k)
        return k + " " + re.sub(r"\s+", " ", m.group(2).replace("No", "No.").replace("No..", "No."))
    return None

rows = {}
for line in open(os.path.join(cmt, "tsvs/themes.tsv"), encoding="utf-8"):
    p = line.rstrip("\n").split("\t")
    if len(p) >= 4: rows[p[0]] = p
res = {}
for tid, p in rows.items():
    c = cat_from(p[3])
    if c: res[tid] = {"catalogue": c, "from": "title"}

# MTD themes: up from the recording to the whole work and its Wikidata item
moves = json.load(open(os.path.join(here, "theme-sources/mtd-movements.json"), encoding="utf-8"))
qid_of = {}
for i, (tid, mv) in enumerate(sorted(moves.items())):
    if not mv.get("recording"): continue
    rec = mb("recording", mv["recording"], "work-rels")
    ws = [r["work"]["id"] for r in rec.get("relations", []) if r.get("type") == "performance" and r.get("work")]
    if not ws: continue
    wid, qid, seen, top = ws[0], None, set(), None
    while wid and wid not in seen:
        seen.add(wid)
        w = mb("work", wid, "work-rels+url-rels")
        for r in w.get("relations", []):
            u = (r.get("url") or {}).get("resource", "")
            if "wikidata.org/wiki/Q" in u and not qid: qid = u.rsplit("/", 1)[1]   # the lowest work with an item
        up = [r["work"]["id"] for r in w.get("relations", []) if r.get("type") == "parts" and r.get("direction") == "backward"]
        top = w.get("title") if not qid or top is None else top
        if qid: break   # not up to the set ("Six concerts" for one Brandenburg concerto)
        wid = up[0] if up else None
    e = res.setdefault(tid.split("-")[0], {})
    e["work"] = top
    if not e.get("catalogue") and top and cat_from(top): e.update(catalogue=cat_from(top), **{"from": "musicbrainz"})
    if qid: e["wikidata"] = qid; qid_of.setdefault(qid, []).append(tid.split("-")[0])
    if i % 200 == 0: print(i, "of", len(moves), flush=True)

PREFIX = {"bach-werke": "BWV", "köchel": "K.", "hoboken": "Hob.", "deutsch": "D.", "ryom": "RV", "händel-werke": "HWV",
          "kirkpatrick": "K.", "longo": "L.", "searle": "S.", "burghauser": "B.", "opus": "Op.", "trv": "TrV", "wotquenne": "Wq."}

# Wikidata, 200 items a query
def year(v): m = re.match(r"^\+?(\d{4})", v or ""); return int(m.group(1)) if m else None
qs = sorted(qid_of)
for b in range(0, len(qs), 200):
    vals = " ".join("wd:" + q for q in qs[b:b + 200])
    sparql = """SELECT ?item ?code ?catLabel ?inc ?pub ?prem WHERE { VALUES ?item { %s }
      OPTIONAL { ?item p:P528 ?s. ?s ps:P528 ?code. OPTIONAL { ?s pq:P972 ?cat. } }
      OPTIONAL { ?item wdt:P571 ?inc. } OPTIONAL { ?item wdt:P577 ?pub. } OPTIONAL { ?item wdt:P1191 ?prem. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }""" % vals
    d = get("https://query.wikidata.org/sparql", data=urllib.parse.urlencode({"query": sparql, "format": "json"}).encode())
    got = {}
    for r in d["results"]["bindings"]:
        q = r["item"]["value"].rsplit("/", 1)[1]; g = got.setdefault(q, {"codes": [], "inc": [], "pub": [], "prem": []})
        if "code" in r: g["codes"].append((r["code"]["value"], r.get("catLabel", {}).get("value", "")))
        for k in ("inc", "pub", "prem"):
            if k in r and year(r[k]["value"]): g[k].append(year(r[k]["value"]))
    for q, g in got.items():
        for tid in qid_of[q]:
            e = res[tid]
            for k, name in (("inc", "composed"), ("pub", "published"), ("prem", "premiere")):
                if g[k]: e[name] = min(g[k])
            # a code that already says its catalogue ("BWV 1046"), else the Wikidata catalogue's usual abbreviation
            # a code that says its catalogue ("BWV 1046"), else a bare one ("550") with its catalogue's abbreviation
            codes = [c for c, _ in g["codes"] if re.match(r"^[A-Za-z]", c) and re.search(r"\d", c)]
            codes += [PREFIX[k] + " " + c for c, l in g["codes"] for k in PREFIX if k in l.lower() and re.match(r"^\d", c)]
            if codes and e.get("from") != "title": e["catalogue"] = codes[0].strip(); e["from"] = "wikidata"
    time.sleep(1)

for e in res.values():   # Haydn's codes as Wikidata gives them: "XV:25", "H.XVI:23" -> "Hob. XV:25"
    c = e.get("catalogue") or ""
    if re.match(r"^(H\.\s*)?[IVXL]+[a-z]?:\d", c): e["catalogue"] = "Hob. " + re.sub(r"^H\.\s*", "", c)
json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
n = lambda k: sum(1 for v in res.values() if v.get(k))
print("wrote", out, len(res), "themes:", n("catalogue"), "catalogue,", n("composed"), "composed,", n("published"), "published,",
      n("premiere"), "premiere,", n("wikidata"), "with a Wikidata item")
