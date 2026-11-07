"""Read the measure range printed in each example's caption (e.g. 'Example 7-12 ... mm. 1-6.') from the OCR of the book's body pages.
    python3 -I measures.py body-ocr.txt measures.json
body-ocr.txt = `swift ocr.swift <pages>/p*.png` on the whole book (not kept in the repo: large).
Writes {fig: {"mm": "1-6", "caption": "<OCR'd caption text>"}} and reports figures with no measure range found, figures
seen twice, and figures in cutler-index.json with no caption."""
import re, sys, json, os
lines = []
for l in open(sys.argv[1], encoding="utf8"):
    l = l.rstrip("\n")
    m = re.match(r"^(\d\.\d+) (.*)$", l)
    lines.append((float(m.group(1)), m.group(2)) if m else (None, l))
CAP = re.compile(r"^Example (\d{1,2})\s*[-–—]\s*(\d{1,2})\b\s*(.*)$")
MM = re.compile(r"\b(?:[mмт][mтm]|m)\.\s*(\d.*?)(?:\.|,\s*text omitted)?(?:\s+[A-Z][^.]*)?$|\b(all)\.?(?:\s+[A-Z][^.]*)?$")  # OCR reads "mm." as "mт." / "тт."; "all." = the whole piece
MVTS = re.compile(r"\bmvts\.\s*(.*?)\.?(?:\s+\d\.\s+[A-Z].*)?$")  # several movements: kept as printed
# read off the page images where the OCR split or dropped the caption
FIXES = {"19-20": "3-5", "3-23": "all", "26-15": "8 (mm. 25-27) and 9 (mm. 1-3)"}
out, seen, order = {}, {}, []
for i, (x, t) in enumerate(lines):
    m = CAP.match(t)
    if m and x is not None and not m.group(3) and i + 1 < len(lines):   # label alone on its line (14-10)
        t = t + " " + lines[i + 1][1]; i_extra = 1
        m = CAP.match(t)
    if not m or x is None or "(" not in t: continue   # a real caption has the composer's dates
    fig = f"{m.group(1)}-{m.group(2)}"
    cap = t
    for j in range(i + 1, min(i + 3, len(lines))):
        if MM.search(cap): break
        x2, t2 = lines[j]
        if x2 is None or t2.startswith(("=====", "---")) or x2 < 0.15 or x2 > 0.5: break
        cap += " " + t2
    mv = MVTS.search(cap)
    mm = None if mv else MM.search(cap)
    seen.setdefault(fig, []).append(cap)
    if fig not in out:
        r = (mm.group(1) or "all") if mm else (mv.group(1) if mv else None)
        note = None
        if r and not mv:
            r = re.sub(r"[\s.,(]+$", "", r)
            k = re.match(r"^([\d–-]+(?:(?:,| and|,? and) [\d–-]+)*)(?:,\s*(.*))?$", r)
            if k: r, note = k.group(1), k.group(2)
        out[fig] = {"mm": r, **({"note": note} if note else {}), "caption": cap}
        order.append(fig)
for f, v in FIXES.items():
    if f in out: out[f]["mm"] = v
json.dump({f: {k: v for k, v in e.items() if k != "caption"} for f, e in out.items()}, open(sys.argv[2], "w"), ensure_ascii=False, indent=1, sort_keys=True)
none = [f for f in order if not out[f]["mm"]]
print(len(out), "captions;", len(none), "without a measure range:", none)
print("seen more than once:", {f: len(v) for f, v in seen.items() if len(v) > 1})
if os.path.exists("cutler-index.json"):
    idx = json.load(open("figures.json"))
    print("figures with no caption found:", [f for f in idx if f not in out])
    print("captions not in figures.json:", [f for f in out if f not in idx])
