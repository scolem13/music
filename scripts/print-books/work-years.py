#!/usr/bin/env python3
"""Years of composition, from Wikidata, for pieces the site knows only by composer and title.

    python3 -I scripts/print-books/work-years.py [book]    -> scripts/print-books/<book>/years.json   {"<composer>|<title>": hit}
        the pieces in a print anthology (scripts/print-books/<book>/<book>-index.json; default cutler)
    python3 -I scripts/print-books/work-years.py --themes  -> scripts/theme-sources/theme-years-wikidata.json   {themeId: hit}
        Classical Themes with no year yet (theme-works.py's MusicBrainz route found none); read by import-themes.mjs
    python3 -I scripts/print-books/work-years.py --works   -> scripts/print-books/works-years.json   {workId: hit}
        hand-written Works entries (not tunes, not print-only) with no year; read by build.py
    hit = {year, kind: "composed" | "published", qid, label, how: "catalogue" | "title"}

For each composer: their Wikidata item (search by name, must be a composer, P106 = Q36834), then every work with P86 = them
(search haswbstatement, then wbgetentities 50 at a time): label, catalogue codes (P528 with its catalogue P972), inception (P571),
publication (P577), part of (P361). A piece matches a work by catalogue number (BWV 1007, Op. 27 No. 2, K. 550, Hob. XVI:37 …;
printlib.same_piece), the whole work before a movement; with no catalogue number, by its quoted title ("Nacht") found in exactly
one work's label. Year = inception, else publication (kind "published"); an inception after the composer's death (P570) or a
publication more than 50 years after it belongs to a later edition or recording item and is dropped. Unmatched pieces are left out, never guessed.
The Wikidata API, not the query service (rate-limited to one query a minute in Nov 2026). Wikidata is CC0.
Answers cached in $TMPDIR/print-books-wikidata, so a rerun only asks for what is new.
"""
import json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(here, "../.."))
sys.path.insert(0, here)
from printlib import fold, keys_of, same_piece
UA = "everything-music-site/0.1 (print anthology years; https://music.seancoleman.org)"
cache = os.path.join(os.environ.get("TMPDIR", "/tmp"), "print-books-wikidata"); os.makedirs(cache, exist_ok=True)

def get(url, cf):
    p = os.path.join(cache, cf)
    if os.path.exists(p): return json.load(open(p, encoding="utf-8"))
    for i in range(8):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"}), timeout=90)); break
        except urllib.error.HTTPError as e:
            if i == 7 or e.code not in (429, 500, 502, 503, 504): raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 20 * (i + 1))
        except Exception:
            if i == 7: raise
            time.sleep(10 * (i + 1))
    json.dump(d, open(p, "w", encoding="utf-8")); time.sleep(1)
    return d

API = "https://www.wikidata.org/w/api.php?format=json&"
def api(params, cf): return get(API + urllib.parse.urlencode(params), cf)
CATS = {}
def label_of(qid):
    if qid not in CATS:
        d = api({"action": "wbgetentities", "ids": qid, "props": "labels", "languages": "en"}, "l-" + qid + ".json")
        CATS[qid] = d.get("entities", {}).get(qid, {}).get("labels", {}).get("en", {}).get("value", "")
    return CATS[qid]

def composer_qid(name):
    last, _, first = name.partition(", ")
    full = (first + " " + last).strip()
    d = api({"action": "query", "list": "search", "srsearch": full + " haswbstatement:P106=Q36834", "srlimit": 3}, "c-" + fold(full).replace(" ", "_") + ".json")
    hits = d.get("query", {}).get("search", [])
    return hits[0]["title"] if hits else None

def year(claims, prop):
    ys = []
    for c in claims.get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        m = re.match(r"[+-](\d{4})", v.get("time", "")) if isinstance(v, dict) else None
        if m: ys.append(int(m.group(1)))
    return min(ys) if ys else None

def works_of(qid):
    ids, off = [], 0
    while True:
        d = api({"action": "query", "list": "search", "srsearch": "haswbstatement:P86=" + qid, "srlimit": 500, "sroffset": off, "srnamespace": 0}, "s-%s-%d.json" % (qid, off))
        ids += [h["title"] for h in d.get("query", {}).get("search", [])]
        off = d.get("continue", {}).get("sroffset")
        if not off: break
    out = []
    for i in range(0, len(ids), 50):
        d = api({"action": "wbgetentities", "ids": "|".join(ids[i:i + 50]), "props": "labels|claims", "languages": "en"}, "e-%s-%d.json" % (qid, i))
        for w, e in d.get("entities", {}).items():
            cl = e.get("claims", {}); lab = e.get("labels", {}).get("en", {}).get("value", "")
            keys = keys_of(lab, "")
            for c in cl.get("P528", []):
                code = c.get("mainsnak", {}).get("datavalue", {}).get("value", "")
                cat = next((q["datavalue"]["value"]["id"] for q in c.get("qualifiers", {}).get("P972", []) if "datavalue" in q), None)
                if isinstance(code, str): keys |= keys_of(code, label_of(cat) if cat else "")
            out.append(dict(qid=w, label=lab, keys=keys, inc=year(cl, "P571"), pub=year(cl, "P577"), part=bool(cl.get("P361"))))
    return out

def js(path, expr):
    code = ("global.window={};eval(require('fs').readFileSync(%r,'utf8').replace(/\\/\\/ print-books:begin[\\s\\S]*?\\/\\/ print-books:end\\n?/,''));"
            "process.stdout.write(JSON.stringify(%s))") % (path, expr)
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)

mode = sys.argv[1] if len(sys.argv) > 1 else "cutler"
if mode == "--themes":
    T = js(os.path.join(ROOT, "apps/themes/themes-data.js"), "window.CLASSICAL_THEMES")
    items = [(t["id"], t["last"] + (", " + t["first"] if t.get("first") else ""), t["title"] + " " + (t.get("cat") or "")) for t in T
             if not any(t.get(k) for k in ("composed", "published", "premiere"))]
    OUT = os.path.join(ROOT, "scripts/theme-sources/theme-years-wikidata.json")
elif mode == "--works":
    W = js(os.path.join(ROOT, "apps/shared/works/works-data.js"), "window.WORKS")
    def last_first(c): p = c.split(" "); return p[-1] + ", " + " ".join(p[:-1]) if len(p) > 1 else c
    items = [(k, last_first(w["composer"]), w["title"] + " " + (w.get("from") or "")) for k, w in W.items()
             if w.get("composer") and not (w.get("in") or {}).get("tune") and w.get("composed") is None and w.get("published") is None]
    OUT = os.path.join(here, "works-years.json")
else:
    src = json.load(open(os.path.join(here, mode, mode + "-index.json"), encoding="utf-8"))
    items = [(w["composer"] + "|" + w["title"], w["composer"], w["title"]) for w in src["works"] if w.get("composer")]
    OUT = os.path.join(here, mode, "years.json")

def death_of(qid):
    d = api({"action": "wbgetentities", "ids": qid, "props": "claims"}, "d-" + qid + ".json")
    return year(d.get("entities", {}).get(qid, {}).get("claims", {}), "P570")

res, none, comps, deaths = {}, [], {}, {}
for key, composer, title in items:
    if composer not in comps:
        q = composer_qid(composer); comps[composer] = works_of(q) if q else []
        deaths[composer] = death_of(q) if q else None
        dy = deaths[composer]
        if dy:   # a later edition, arrangement or recording item: inception after death, or publication long after
            for o in comps[composer]:
                if o["inc"] and o["inc"] > dy: o["inc"] = None
                if o["pub"] and o["pub"] > dy + 50: o["pub"] = None
        print(composer, q, len(comps[composer]), file=sys.stderr, flush=True)
    cands = comps[composer]
    mine = keys_of(title, "")
    hit, how = None, None
    if mine:
        ms = [o for o in cands if same_piece(o["keys"], mine) and (o["inc"] or o["pub"])]
        ms.sort(key=lambda o: (o["part"], o["inc"] is None))               # the whole work before a movement
        if ms: hit, how = ms[0], "catalogue"
    if not hit:
        lead = re.split(r",", title)[0]
        for t in re.findall(r'"([^"]{4,})"', title) + ([lead] if len(lead) > 6 and not mine else []):
            ms = [o for o in cands if (o["inc"] or o["pub"]) and fold(t.strip(" ,")) in fold(o["label"])]
            if len(ms) == 1: hit, how = ms[0], "title"; break
    if hit: res[key] = dict(year=hit["inc"] or hit["pub"], kind="composed" if hit["inc"] else "published", qid=hit["qid"], label=hit["label"], how=how)
    else: none.append(key)
json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
print("matched", len(res), "of", len(items), "->", os.path.relpath(OUT, ROOT))
