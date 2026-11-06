"""Write ~/Downloads/PDMX-trim.csv: PDMX.csv cut to the columns this site uses.

Every score with an .mxl file is kept, of every genre and license (the site is for personal/classroom use).
`dedup` is PDMX's own deduplicated flag (1 = the copy it keeps). Run: python3 -I scripts/pdmx-trim.py
With --no-folk: ~/Downloads/PDMX-trim-nofolk.csv, without any score whose genres include folk.
"""
import csv, os, sys
HOME = os.path.expanduser("~")
NOFOLK = "--no-folk" in sys.argv
SRC, OUT = HOME + "/Downloads/PDMX.csv", HOME + ("/Downloads/PDMX-trim-nofolk.csv" if NOFOLK else "/Downloads/PDMX-trim.csv")
KEEP = ["mxl", "title", "subtitle", "song_name", "composer_name", "artist_name", "genres", "tags",
        "n_tracks", "tracks", "song_length.bars", "n_notes", "rating", "n_ratings", "n_views", "n_favorites"]
n = 0
with open(SRC, newline="") as f, open(OUT, "w", newline="") as g:
    w = csv.writer(g)
    w.writerow(KEEP + ["dedup"])
    for r in csv.DictReader(f):
        if r["mxl"] == "NA": continue
        if NOFOLK and "folk" in r["genres"].lower(): continue
        w.writerow([r[k] if r[k] != "NA" else "" for k in KEEP] + [1 if r["subset:deduplicated"] == "True" else 0])
        n += 1
print(n, "scores ->", OUT)
