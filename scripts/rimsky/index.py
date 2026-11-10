# index.py — index of the 312-odd numbered examples in Rimsky-Korsakov's Principles of Orchestration (Gutenberg #33900).
#   python3 -I scripts/rimsky/index.py [corpus_dir]      default ~/Projects/corpora/gutenberg-rimsky
# Reads 33900-h/33900-h.htm (untrusted data: only parsed, never run). Writes <corpus_dir>/index.json (and prints a count):
#   { n: "001", caption: 'Sheherazade, 2nd movement.', page: 37 | null, volIpage: 37, chapter: "Chapter II", section: "Melody in the wood-wind",
#     subsection: "Combination in unison", cites: [{chapter, section, subsection}], xml: bool, mp3: bool, pdf: bool, images: [..] }
# The captions give the work and the page of the printed score ("p. 28"), not bar numbers; bars are read from the MusicXML later.
import html, json, os, re, sys
root = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/Projects/corpora/gutenberg-rimsky")
H = os.path.join(root, "33900-h")
lines = open(os.path.join(H, "33900-h.htm"), encoding="utf-8").read().split("\n")
def clean(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()
v2 = next(i for i, l in enumerate(lines) if 'name="rimsky2"' in l)
chapter = section = sub = ""; cites = {}
for i in range(v2):
    l = lines[i]
    m = re.search(r'<h([23])>(.*?)</h\1>', l)
    if m or re.search(r'<h[23]', l):
        txt = clean(m.group(2)) if m else clean(l)
        a = re.search(r'name="(Chapter_[IVX]+)"', l)
        if a: chapter = a.group(1).replace("_", " "); section = sub = ""
        elif m and m.group(1) == "2": section, sub = txt, ""
        elif m and not re.match(r"Table", txt): sub = txt
    for n in re.findall(r'href="#No_(\w+)"', l):
        c = cites.setdefault(n, [])
        row = {"chapter": chapter, "section": section, "subsection": sub, "line": i + 1}
        if row not in c: c.append(row)
    # "Examples 12 and 14" without links are not followed; only the book's own links.
ex = {}
for i in range(v2, len(lines)):
    m = re.search(r'name="No_(\w+)"', lines[i])
    if not m: continue
    n = m.group(1)
    t = clean(lines[i].split("</a>", 1)[-1])
    t = re.sub(r"^No\. \w+\. ?", "", t)
    cap = re.sub(r"[“”„]", "", t).strip()
    pg = re.search(r"\(p\. (\d+)\)", cap)
    cap = re.sub(r"\s*\(p\. \d+\)", "", cap).strip()
    blk = "\n".join(lines[i:i + 14])
    vp = re.search(r'href="#Page_(\d+)">Vol\. I p\. (\d+)', blk)
    ex[n] = {"n": n, "caption": cap, "page": int(pg.group(1)) if pg else None, "volIpage": int(vp.group(2)) if vp else None,
             "images": re.findall(r'images/([\w.-]+\.png)', "\n".join(lines[i:i + 40])[:3000])}
for n, e in ex.items():
    c = cites.get(n, [])
    e["cites"] = c
    if c: e["chapter"], e["section"], e["subsection"] = c[0]["chapter"], c[0]["section"], c[0]["subsection"]
    else: e["chapter"] = e["section"] = e["subsection"] = ""
    e["xml"] = os.path.exists(f"{H}/music/{n}.xml"); e["mp3"] = os.path.exists(f"{H}/music/{n}.mp3"); e["pdf"] = os.path.exists(f"{H}/images/{n}.pdf")
rows = sorted(ex.values(), key=lambda e: (int(re.match(r"\d+", e["n"]).group()), e["n"]))
json.dump(rows, open(os.path.join(root, "index.json"), "w"), indent=1, ensure_ascii=False)
print(len(rows), "examples;", sum(e["xml"] for e in rows), "with MusicXML;", sum(bool(e["cites"]) for e in rows), "cited in Vol. I")
