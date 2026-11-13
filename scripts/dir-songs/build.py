#!/usr/bin/env python3
"""Tune Directory: Hooktheory songs and Real Book songs as data for the sheet (apps/shared/works/td-sheet.js).

    python3 -I scripts/dir-songs/build.py

Reads
  * ~/Projects/corpora/hooktheory/hooktheory-priority.csv (tiers 1 and 2 only: tier 3 classical = timing maps, tier 4 game / library
    music = left out; scripts/ hooktheory-priority.py in the corpora folder decides) -> one row per song (artist + song), its best section
    (lowest tier, most chords) giving key, meter, tempo, the YouTube video cued at that section and the TheoryTab page;
  * apps/realbooks/catalogue-data.js (the Real Book Catalogue: Songfinder + 57 book indexes, already one entry per title) -> one row per
    title with the books and pages it is in, the composer the indexes name (or a performer), the Songfinder volumes.
and merges scripts/dir-songs/cache-ht.json / cache-rb.json (written by enrich.py: year, genres, composer from MusicBrainz / Wikidata).
Writes apps/shared/data/dir-songs/hooktheory.json and realbook.json (compact keys, see the readers in td-sheet.js).
Hooktheory rows: a artist, t title, k key, m meter, b bpm, n sections, y YouTube id, s start seconds, h "artist-slug/song-slug", [yr, g, c].
Real Book rows: t title, c composer (or "" ), a performers, bk [[book title, printed page]...], sf [Songfinder volumes], f film, [yr, g].
"""
import csv, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(os.path.dirname(here))
out = os.path.join(root, "apps/shared/data/dir-songs")
def load(p): return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}

# ---- Hooktheory ----
cache = load(os.path.join(here, "cache-ht.json"))
src = os.path.expanduser("~/Projects/corpora/hooktheory/hooktheory-priority.csv")
by = {}
for r in csv.DictReader(open(src, encoding="utf-8")):
    if r["priority"] not in ("1", "2"): continue
    by.setdefault(r["artist_slug"] + "/" + r["song_slug"], []).append(r)
def keyname(r):
    k, m = r["key"], r["mode"]
    return k + ("m" if m == "minor" else "" if m == "major" else " " + m)
ht = []
for h, v in by.items():
    v.sort(key=lambda r: (int(r["priority"]), -int(r["chords"] or 0), int(r["melody_notes"] or 0) * -1))
    b = v[0]
    ym = re.search(r"v=([\w-]{11})(?:&t=(\d+)s)?", b["youtube_at_start"])
    row = {"a": b["artist"], "t": b["song"], "k": keyname(b), "m": b["meter"], "n": len(v), "h": h}
    if b["bpm"]: row["b"] = int(float(b["bpm"]))
    if ym: row["y"] = ym.group(1); row["s"] = int(ym.group(2) or 0)
    row["x"] = sorted({r["section"] for r in v if r["section"]})[:6]
    e = cache.get(h) or {}
    if e.get("y"): row["yr"] = e["y"]
    if e.get("g"): row["g"] = e["g"]
    if e.get("c"): row["c"] = e["c"]
    ht.append(row)
ht.sort(key=lambda r: (r["a"].lower(), r["t"].lower()))
json.dump(ht, open(os.path.join(out, "hooktheory.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# ---- Real Books ----
cache = load(os.path.join(here, "cache-rb.json"))
txt = open(os.path.join(root, "apps/realbooks/catalogue-data.js"), encoding="utf-8").read()
D = json.loads(txt[txt.index("=") + 1:].strip().rstrip(";"))
rb = []
for t in D["tunes"]:
    key = rb_key = t["t"]
    bk = []
    for a in t.get("at", []):
        title = D["books"][a[0]]["title"]
        if (title, a[2]) not in [(x[0], x[1]) for x in bk]: bk.append([title, a[2]])
    row = {"t": t["t"], "bk": bk}
    if t.get("c"): row["c"] = t["c"]
    if t.get("ar"): row["a"] = t["ar"]
    if t.get("sf"): row["sf"] = t["sf"]
    if t.get("fm"): row["f"] = t["fm"]
    e = cache.get(t["t"]) or {}
    if e.get("y"): row["yr"] = e["y"]
    if e.get("g"): row["g"] = e["g"]
    if e.get("c") and not row.get("c"): row["c"] = e["c"]; row["cm"] = 1      # composer from MusicBrainz, not the book
    rb.append(row)
rb.sort(key=lambda r: r["t"].lower())
json.dump({"vols": D["sfVols"], "songs": rb}, open(os.path.join(out, "realbook.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("hooktheory songs", len(ht), "with year", sum(1 for r in ht if r.get("yr")), "genre", sum(1 for r in ht if r.get("g")))
print("real book songs", len(rb), "composer", sum(1 for r in rb if r.get("c")), "year", sum(1 for r in rb if r.get("yr")), "genre", sum(1 for r in rb if r.get("g")))
