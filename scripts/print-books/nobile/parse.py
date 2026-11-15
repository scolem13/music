#!/usr/bin/env python3
"""Nobile, Form as Harmony in Rock Music (Oxford 2025?): the Song Index by Title (5 pages, text layer).

    v/bin/python -I parse.py index.pdf parsed.json     (PyMuPDF; bold = an example, "t" table, "n" footnote)

Entries "“Title” (Artist), 14, 15, 115, 158–159" run over lines; an entry with several artists has one line each. Page numbers in the
semibold font are examples. The text layer misreads "Th" as "!" and the ligatures ff / ft as 3 / 2 (fixes.py repairs them)."""
import json, re, sys, pymupdf
d = pymupdf.open(sys.argv[1]); lines = []
for pg in d:
    for b in pg.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            if l["bbox"][1] < 70: continue                 # running head (title in a symbol font + page number)
            t = "".join(("\x01%s\x02" % s["text"]) if "Semibold" in s["font"] and re.fullmatch(r"[\d–, ]+", s["text"]) else s["text"] for s in l["spans"]).strip()
            if t: lines.append(t)
lines = [l for l in lines if "&ffl(" not in l and not l.startswith(("Song Index by Title", "Examples are indicated", "the page number. Footnotes", "Index"))]
entries = []; cur = None
for l in lines:
    if l.startswith("“"):
        cur = [l]; entries.append(cur)
    elif cur is not None: cur.append(l)
out = entries
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(out), "entries")
