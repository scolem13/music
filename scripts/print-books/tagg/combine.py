#!/usr/bin/env python3
"""tunes.json (indexes.py) + tables.json (tables.py) -> tagg-index.json, the pieces build.py adds to Works.

    python3 -I combine.py

One piece per italic index title (same folded title merges a table row into it; a table row whose title is not in the index is
added). Each piece: title, artist (the best credit: the one checked against the Reference Appendix first), year, and refs:
  {fig: "<page>", ex: true when the index underlines the page (a music example), concept: "<label>; …"}
  concept = the scale / chord / progression entries of the numerical indexes on that page when the page is the piece's own
            music example ("strong"), and the table row's progression when a table on that page lists the piece.
Pages where the concepts only share the page with the piece get no concept (too often about another piece).
"""
import json, os, re, unicodedata
here = os.path.dirname(os.path.abspath(__file__))

def fold(s):
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()
    s = re.sub(r"[’'‘`]", "", s)
    return re.sub(r"^(the|a) ", "", re.sub(r"[^a-z0-9]+", " ", s).strip())

U = json.load(open(os.path.join(here, "tunes.json"), encoding="utf-8"))["tunes"]
T = json.load(open(os.path.join(here, "tables.json"), encoding="utf-8"))
works = {}
for t in U:
    cr = [c for c in t["credits"] if c["artist"]]
    best = cr[0] if cr else (t["credits"][0] if t["credits"] else None)
    w = works.setdefault(fold(t["title"]), {"title": t["title"], "artist": best and best["artist"] or "",
        "year": best and best["year"] or None, "checked": bool(best and best["checked"]), "refs": {}})
    for p in t["pages"]:
        strong = [c["label"] for c in t["concepts"] if c["strong"] and p in c["pages"]]
        w["refs"][p] = {"fig": str(p), **({"ex": True} if p in t["ex"] else {}), "concepts": strong}

def prog(s, tab):
    typ = re.sub(r"‐\s+", "", re.sub(r"-\s+-", "-", s.get("type", ""))).strip()
    bits = [typ, s.get("chords", ""), ("in " + s["key"]) if s.get("key") else "", s.get("roman", "")]
    return "Table %d: %s" % (tab["table"], " ".join(b for b in bits if b).strip())

n_tab = n_new = 0
for tab in T:
    for s in tab.get("songs", []):
        k = fold(s.get("title", ""))
        if not k: continue
        n_tab += 1
        w = works.get(k)
        if not w:
            n_new += 1
            y = re.match(r"\d{4}", s.get("year") or "")
            w = works[k] = {"title": s["title"], "artist": s.get("artist", ""), "year": int(y.group()) if y else None, "checked": False, "refs": {}}
        if not w["artist"] and s.get("artist"): w["artist"] = s["artist"]
        if not w["year"] and re.match(r"\d{4}", s.get("year") or ""): w["year"] = int(s["year"][:4])
        r = w["refs"].setdefault(tab["page"], {"fig": str(tab["page"]), "concepts": []})
        r["concepts"].append(prog(s, tab))
        if s.get("chords"): r.setdefault("chords", s["chords"])

out = []
for k, w in sorted(works.items()):
    refs = []
    for p in sorted(w["refs"]):
        r = dict(w["refs"][p]); cs = r.pop("concepts")
        if cs: r["concept"] = "; ".join(dict.fromkeys(cs))
        refs.append(r)
    out.append({"title": w["title"], "artist": w["artist"], "year": w["year"], "checked": w["checked"], "refs": refs})
json.dump({"works": out}, open(os.path.join(here, "tagg-index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "pieces;", n_tab, "table rows,", n_new, "of them not in the index;",
      sum(1 for w in out if w["artist"]), "with an artist;", sum(1 for w in out if any("concept" in r for r in w["refs"])), "with a concept")
