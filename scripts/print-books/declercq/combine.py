#!/usr/bin/env python3
"""captions.json (captions.py) -> declercq-index.json {works: [{title, artist, year, refs: [{fig: page, concept}]}]}, Tagg's shape.

    python3 -I combine.py captions.json declercq-index.json

Each figure / table caption that names a song (“Title” by Artist (year)) gives that song one ref: the printed page, and the caption's
own words (minus the song) as the concept. The book has no song index, so this covers the songs shown in figures and tables, not
the ones only discussed in the text. Captions that do not fit the pattern are listed by hand in HAND (read off the page text)."""
import json, re, sys
caps = json.load(open(sys.argv[1]))
HAND = {   # num: [(title, artist, year, concept)]
  "18.9": [("With a Little Help from My Friends", "The Beatles", 1967, "Beginning of second verse, drums notated in 12/8")],
  "23.4": [("Home at Last", "Steely Dan", 1977, "Generic drum pattern in a half-time 4/4 shuffle")],
  "20.5": [("Teardrops on My Guitar", "Taylor Swift", 2006, "Basic rhythm of melody and drums in chorus (original version)")],
  "20.6": [("Teardrops on My Guitar", "Taylor Swift", 2006, "Basic rhythm of melody and drums in chorus (pop single mix)")],
}
P = re.compile(r"“([^”]+?),?”(?:,?\s*(?:by|from)\s+(.+?)\s*\(([^()]*\d{4}[^()]*)\))?")
works = {}; problems = []
def add(title, artist, year, fig, concept, num):
    k = (title.lower(), artist.lower())
    w = works.setdefault(k, {"title": title, "artist": artist, "year": year, "refs": []})
    if not any(r["fig"] == fig and r["concept"].startswith(concept[:30]) for r in w["refs"]):
        w["refs"].append({"fig": fig, "ex": True, "concept": concept})
for o in caps:
    num, text, page = o["num"], o["text"], o["page"]
    if num in HAND:
        for t, a, y, c in HAND[num]: add(t, a, y, page, "%s %s: %s" % (o["kind"], num, c), num)
        continue
    if not text.endswith(")"): continue
    ms = [m for m in P.finditer(text) if m.group(2)]
    if not ms: problems.append((num, text[:120])); continue
    lead = re.sub(r"\s*(of|in|from|to|for|by|with)?\s*$", "", text[:ms[0].start()].strip()).strip(" :,(")
    lead = re.sub(r"\s*\([a-z]\)\s*$", "", lead) or "Example"
    for m in ms:
        year = int(re.search(r"\d{4}", m.group(3)).group(0))
        artist = re.sub(r"\s+", " ", m.group(2)).strip(" ,;")
        artist = re.sub(r"^the ", "The ", re.sub(r",? (featuring|ft\.) ", " ft. ", artist))
        add(m.group(1).strip(), artist, year, page, "%s %s: %s" % (o["kind"], num, lead[:1].upper() + lead[1:]), num)
out = sorted(works.values(), key=lambda w: w["title"].lower())
json.dump({"works": out}, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(out), "songs;", sum(len(w["refs"]) for w in out), "refs;", len(problems), "problems")
for p in problems: print("  ", p)
