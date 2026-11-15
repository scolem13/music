#!/usr/bin/env python3
"""de Clercq, The Practice of Popular Music (Routledge 2024): every Figure / Table caption with its printed page.

    v/bin/python -I captions.py book.pdf captions.json     (needs PyMuPDF; the PDF has a text layer)

The first line of each body page is its printed page number (PDF page 17 = xvi ... PDF page 18 = page 1 for the preface's
last page; body pages: print = pdf - 17). A caption starts a line "Figure N.M." / "Table N.M." and runs on until a line that ends
with a year in brackets "(1983)" or "(1983/2004)" or, failing that, the end of the paragraph (max 4 lines)."""
import json, re, sys, pymupdf
d = pymupdf.open(sys.argv[1]); out = []
CAP = re.compile(r"^(Figure|Table) (\d+\.\d+)\.\s*(.*)")
YEAR = re.compile(r"\((?:[^()]*?\d{4}[^()]*?)\)\s*$")
for i, pg in enumerate(d):
    lines = [l for l in pg.get_text().split("\n")]
    first = lines[0].strip() if lines else ""
    page = str(i+1-17) if i+1 >= 18 else None        # body pages: print = pdf - 17 (checked against the running page number below)
    if re.fullmatch(r"\d+", first) and page != first: print("page number mismatch at pdf", i+1, first, file=sys.stderr)
    k = 0
    while k < len(lines):
        m = CAP.match(lines[k].strip())
        if m:
            text = m.group(3); j = k
            while not YEAR.search(text) and j + 1 < len(lines) and j - k < 3 and lines[j+1].strip() and not CAP.match(lines[j+1].strip()):
                j += 1; text += " " + lines[j].strip()
            ym = re.search(r"\((?:[^()]*?\d{4}[^()]*?)\)", text)
            if ym: text = text[:ym.end()]
            out.append({"kind": m.group(1), "num": m.group(2), "page": page, "pdf": i+1, "text": text.strip()})
            k = j
        k += 1
best = {}
for o in out:             # the same number twice = a mention in the text; keep the caption that ends in a year, else the shortest
    k = (o["kind"], o["num"]); score = (bool(YEAR.search(o["text"])), -len(o["text"]))
    if k not in best or score > best[k][0]: best[k] = (score, o)
out = [v[1] for v in best.values()]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(len(out), "captions;", sum(1 for o in out if not o["page"]), "without page;", sum(1 for o in out if YEAR.search(o["text"])), "end in a year")
