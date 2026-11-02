#!/usr/bin/env python3
"""Pieces in print anthologies -> Works (apps/shared/works/works-data.js) and the figure map the glossary build reads.

    python3 -I scripts/print-books/build.py [--report]

Reads <book>/<book>-index.json (parse.py + combine.py), <book>/years.json (work-years.py, optional), the Classical Themes
(apps/themes/themes-data.js) and the hand-written Works. Writes:
  - works-data.js, between "// print-books:begin" and "// print-books:end": window.PRINT_BOOKS (the books) and one entry per
    piece, MERGED into the hand-written WORKS at load: a piece that already has an entry (same composer, catalogue number and
    movement, or owning a matched theme) gets in.print and a year added to it; any other piece gets an entry of its own.
    To give a print-only piece recordings or links, write an entry with the same id above the block: the two merge.
  - <book>/figures.json  {fig: {work, title, composer, whole}}   for scripts/course-glossary.mjs.
Each piece: in.print [{book, fig, whole}], in.theme (Classical Themes of the same piece: composer + catalogue number +
movement), composed / published (year; Wikidata, else the matched theme's year), yearFrom ("wikidata:Q…" or "theme:<id>").
Also gives a year to every hand-written work (not a tune) that has none: its theme's year, else works-years.json
(work-years.py --works). A year written by hand in the entry always wins.
"""
import json, os, re, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
from printlib import fold, keys_of, same_piece, movements
ROOT = os.path.abspath(os.path.join(here, "../.."))
WD = os.path.join(ROOT, "apps/shared/works/works-data.js")
BOOKS = {"cutler": {"title": "Anthology of Music for Analysis", "author": "Timothy Cutler", "short": "Cutler, Anthology",
                    "figure": "chapter–figure number, as in the book"}}
# themes whose MTD titles put them in the wrong movement (BWV 1001: Fugue, Siciliana and Presto are all "1st Movement")
NOT_SAME = {("27-2", "0267"), ("27-2", "0268"), ("27-2", "0269")}

def js_eval(path, expr):
    code = "global.window={};const s=require('fs').readFileSync(%r,'utf8').replace(/\\/\\/ print-books:begin[\\s\\S]*?\\/\\/ print-books:end\\n?/,'');eval(s);process.stdout.write(JSON.stringify(%s))" % (path, expr)
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)

W = js_eval(WD, "window.WORKS")
T = js_eval(os.path.join(ROOT, "apps/themes/themes-data.js"), "window.CLASSICAL_THEMES")
theme_owner = {t: wid for wid, w in W.items() for t in (w.get("in") or {}).get("theme", [])}
themes_by = {}
for t in T: themes_by.setdefault(fold(t["last"]), []).append(t)
works_by = {}
for wid, w in W.items():
    if (w.get("in") or {}).get("tune"): continue
    last = fold((w.get("composer") or "").split(" ")[-1])
    works_by.setdefault(last, []).append((wid, w))

def slug(s): return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", fold(s))).strip("-")[:70].rstrip("-")
def first_last(c):
    last, _, first = c.partition(", ")
    return (first + " " + last).strip() if first else last

def theme_matches(cw):
    last = fold(cw["composer"].split(",")[0]); ks = keys_of(cw["title"]); mv = movements(cw["title"])
    if not ks: return []
    out = []
    for t in themes_by.get(last, []):
        if any(cw_fig_pair in NOT_SAME for cw_fig_pair in ((f, t["id"]) for f in cw["refs"])): continue
        tk = keys_of((t.get("cat") or "") + " " + t["title"])
        if not same_piece(ks, tk): continue
        tm = movements(t["title"])
        if mv and (not tm or not (tm & mv)): continue
        if not mv and tm and re.search(r"\bmvt|sonata|symphony|concerto|quartet|trio|suite", fold(cw["title"])): continue
        a, b = fold(cw["title"]), fold(t["title"])
        named = re.findall(r'"([^"]{4,})"', cw["title"])               # an aria or a named piece: its name is in the theme's title
        if named and not mv and not any(fold(n.strip(" ,")) in b for n in named): continue
        if ("fugue" in a and "prelude" in b) or ("prelude" in a and "fugue" in b): continue
        out.append(t)
    return out

def hand_match(cw, themes):
    for t in themes:
        if t["id"] in theme_owner: return theme_owner[t["id"]]
    last = fold(cw["composer"].split(",")[0]); ks = keys_of(cw["title"]); mv = movements(cw["title"])
    if not ks: return None
    for wid, w in works_by.get(last, []):
        text = w["title"] + " " + (w.get("from") or "")
        if same_piece(ks, keys_of(text)) and movements(text) == mv: return wid
    return None

blocks, figmaps, report = {}, {}, []
for book in BOOKS:
    src = json.load(open(os.path.join(here, book, book + "-index.json"), encoding="utf-8"))
    yp = os.path.join(here, book, "years.json"); years = json.load(open(yp, encoding="utf-8")) if os.path.exists(yp) else {}
    figs = {}
    for cw in src["works"]:
        if not cw.get("composer"): continue
        themes = theme_matches(cw)
        wid = hand_match(cw, themes)
        if not wid:
            wid = slug(cw["composer"].split(",")[0] + " " + cw["title"])
            while wid in W and wid not in blocks: wid += "-" + book
        e = blocks.setdefault(wid, {"title": cw["title"], "composer": first_last(cw["composer"]), "in": {}})
        if wid in W: e = blocks[wid] = {"in": e["in"]}                      # merge only: keep the hand entry's title
        e["in"].setdefault("print", []).extend({"book": book, "fig": f, **({"whole": True} if f in cw["whole"] else {})} for f in cw["refs"])
        new_t = [t["id"] for t in themes if t["id"] not in theme_owner or theme_owner[t["id"]] == wid]
        have = set((W.get(wid, {}).get("in") or {}).get("theme", []))
        new_t = [x for x in new_t if x not in have]
        if new_t: e["in"].setdefault("theme", []).extend(x for x in new_t if x not in e["in"].get("theme", []))
        y = years.get(cw["composer"] + "|" + cw["title"])
        if y and not ("composed" in W.get(wid, {}) or "published" in W.get(wid, {})):
            e[y["kind"]] = y["year"]; e["yearFrom"] = "wikidata:" + y["qid"]
        elif themes and not y:
            ty = next(((k, t[k], t["id"]) for t in themes for k in ("composed", "published") if t.get(k)), None)
            if ty and not any(k in e for k in ("composed", "published")): e[ty[0]] = ty[1]; e["yearFrom"] = "theme:" + ty[2]
        for f in cw["refs"]:
            figs[f] = {"work": wid, "title": W[wid]["title"] if wid in W else cw["title"], "composer": first_last(cw["composer"]), "whole": f in cw["whole"]}
        report.append((cw["refs"][0], wid in W, wid, [t["id"] for t in themes], e.get("composed") or e.get("published")))
    json.dump(figs, open(os.path.join(here, book, "figures.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)

# years for the hand-written works (not tunes): their themes' year, else Wikidata (work-years.py --works)
wy_p = os.path.join(here, "works-years.json"); wy = json.load(open(wy_p, encoding="utf-8")) if os.path.exists(wy_p) else {}
tyear = {t["id"]: t for t in T}
n_hand = 0
for wid, w in W.items():
    if (w.get("in") or {}).get("tune") or w.get("composed") is not None or w.get("published") is not None: continue
    e = blocks.get(wid)
    if e and any(k in e for k in ("composed", "published")): continue
    ty = next(((k, tyear[t][k], t) for t in (w.get("in") or {}).get("theme", []) if t in tyear for k in ("composed", "published") if tyear[t].get(k)), None)
    y = None
    if ty: y = (ty[0], ty[1], "theme:" + ty[2])
    elif wid in wy: y = (wy[wid]["kind"], wy[wid]["year"], "wikidata:" + wy[wid]["qid"])
    if y:
        e = blocks.setdefault(wid, {"in": {}}); e[y[0]] = y[1]; e["yearFrom"] = y[2]; n_hand += 1

block = ("// print-books:begin (written by scripts/print-books/build.py: pieces in the print anthologies, and years for the entries above;\n"
         "// do not edit here: an entry with the same id above is merged with it, so recordings and links for these pieces go there)\n"
         "window.PRINT_BOOKS = " + json.dumps(BOOKS, ensure_ascii=False) + ";\n"
         "(function (W, add) {\n"
         "  Object.keys(add).forEach(function (id) {\n"
         "    var a = add[id], w = W[id];\n"
         "    if (!w) { W[id] = a; return; }\n"
         "    w.in = w.in || {};\n"
         "    Object.keys(a.in).forEach(function (k) { w.in[k] = (w.in[k] || []).concat(a.in[k]); });\n"
         "    [\"composed\", \"published\", \"yearFrom\"].forEach(function (k) { if (a[k] != null && w[k] == null) w[k] = a[k]; });\n"
         "  });\n"
         "})(window.WORKS, {\n" +
         ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v, ensure_ascii=False, separators=(",", ":"))) for k, v in blocks.items()) +
         "\n});\n// print-books:end\n")
s = open(WD, encoding="utf-8").read()
s = re.sub(r"// print-books:begin[\s\S]*?// print-books:end\n?", "", s)
i = s.find("// songs:begin")
s = s[:i] + block + s[i:] if i >= 0 else s + block
open(WD, "w", encoding="utf-8").write(s)
n_new = sum(1 for k in blocks if k not in W)
print("%d hand-written works given a year" % n_hand)
print("%d pieces: %d new Works entries, %d merged into existing ones; %d with themes; %d with a year" % (
    len(report), n_new, len(blocks) - n_new, sum(1 for r in report if r[3]), sum(1 for r in report if r[4])))
if "--report" in sys.argv:
    for r in report:
        if r[1] or r[3]: print(r)
