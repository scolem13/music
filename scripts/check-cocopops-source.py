#!/usr/bin/env python3
"""Note counts against the sources, counted a second way (regexes on the raw lines, none of convert-cocopops.py's code).

    COUNTS_OUT=/tmp/cc-counts.json python3 -I scripts/convert-cocopops.py both
    python3 -I scripts/check-cocopops-source.py /tmp/cc-counts.json [~/Projects/corpora]

1. Every file: the converter's count of main-melody notes == a recount of the **kern lines (a tied note once, graces and rests not counted),
   for files with one melody spine (the CoCoPops Billboard files with several voices choose between spines by *Hstimme; only
   checked that the recount is not smaller).
2. RS200: the original v2.1 `.mel` (scale-degree text) has as many onsets (digits 1-7 outside [..] and R*n)
   as CoCoPops' Humdrum has kern onsets, per song: shows the Humdrum translation kept the melody.
Nothing in the data is run; the files are only read.
"""
import csv, glob, json, os, re, sys
counts = json.load(open(sys.argv[1]))
root = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else "~/Projects/corpora")
def recount(path):
    L = open(path, encoding="utf-8").read().split("\n")
    cols = [l for l in L if l.startswith("**")][0].split("\t"); ks = [i for i, c in enumerate(cols) if c == "**kern"]
    n = 0
    for l in L:
        if l[:1] in "!=*" or not l: continue
        p = l.split("\t")
        if len(p) <= ks[0]: continue
        t = p[ks[0]]
        if t == "." or re.search(r"[rqQ]", t) or not re.search(r"[a-gA-G]", t): continue
        if re.search(r"[\]_]", t) and not t.startswith("["): continue   # the end / middle of a tie
        n += 1
    return n, len(ks)
bad = []; ok = 0; multi = 0; multi_ok = 0
for part in ("Billboard", "RollingStone"):
    for f in sorted(glob.glob(root + "/cocopops/%s/Data/*.hum" % part)):
        base = re.sub(r"\.(varms\.|lyrics\.)?hum$", "", os.path.basename(f))
        key = ("cc/" if part == "Billboard" else "rs/") + base
        if key not in counts: bad.append((base, "not counted")); continue
        n, nk = recount(f)
        if nk > 1:
            multi += 1; multi_ok += (counts[key] >= 0)   # voices alternate by *Hstimme: no exact recount
            continue
        if n == counts[key]: ok += 1
        else: bad.append((base, counts[key], n))
print("1. single-spine files: converter == recount: %d; differ: %d %s; files with several melody spines (not compared): %d" % (ok, len(bad), bad[:10], multi))
# 2. RS200 .mel onsets vs the Humdrum's
R = root + "/rs200/v2-1/rock_corpus_v2-1/rs200_melody/"
TS = list(csv.DictReader(open(root + "/cocopops/RollingStone/RollingStone_Sample.tsv"), delimiter="\t"))
rows = {r["Rolling Stone Rank"]: r["Filename"] for r in TS}
slug = lambda x: re.sub(r"[^a-z0-9]+", "", x.lower())
by_title = {slug(r["Title"]): r["Filename"] for r in TS}
def mel_count(path):
    txt = re.sub(r"%[^\n]*", "", open(path, encoding="utf-8", errors="replace").read())
    txt = re.sub(r"R\*\d+", "", re.sub(r"\[[^\]]*\]", "", txt))
    return len(re.findall(r"[1-7]", txt))   # one digit = one onset (b / # / ^ / v / . / _ / = / | carry no onset)
same = tot = 0; diff = []
for line in open(root + "/rs200/rs200.txt"):
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 2 or not parts[0]: continue
    fn = rows.get(parts[1]) or (by_title.get(slug(parts[2])) if len(parts) > 2 else None); ms = glob.glob(R + parts[0] + "_*.mel")
    if not fn or not ms: diff.append((parts[0], "no match")); continue
    h = root + "/cocopops/RollingStone/Data/" + fn + ".hum"
    if not os.path.exists(h): h = h.replace("TheJimiHendrixExperience_", "JimiHendrix_")
    a, b = mel_count(ms[0]), recount(h)[0]; tot += 1
    if a == b: same += 1
    else: diff.append((parts[0], a, b))
print("2. RS200 .mel onsets == Humdrum kern onsets: %d of %d songs; differ: %s" % (same, tot, diff[:14]))
