#!/usr/bin/env python3
"""Tagg, Everyday Tonality II: tunes from the Alphabetical Index (pp. 562-595, italic headwords) cross-referenced with the
Scale-degree (595-598), Chord shorthand (598) and Chord sequence (599-600) indexes -> tunes.json.

    <venv>/bin/python -I indexes.py book.pdf tunes.json [body.txt]       (needs PyMuPDF: python3 -m venv v && v/bin/pip install pymupdf)

PyMuPDF, not PDFKit: PDFKit reports every font as Helvetica, so the italics (the index's mark for titles of works, its §3) are
lost there. A tune = a top-level headword whose first letter is set in italic and is a capital (lower-case italics are foreign
terms: "baião"). Albums, films and books are italic too and stay in.

Underlined page numbers (the index's §5) are music examples: thin filled rectangles just under the digits. A concept on a tune's
own music-example page is marked "strong" (likely about that tune); the rest are "same page" only.

Layout: two or three columns a page; offset from the column's edge 0 = headword, ~6 = its pages run on, ~10 = sub-entry.
Glyphs, read off the rendered pages:
  XPTMusic  0x84 0x8c 0x90 0x96 0x9d 0xa4 0xac 0xb0 = scale degrees 1-8 (with a hat); prefixes 0x07 flat, 0x06 sharp,
            'A' (0x41) natural, 'j' (0x6a) half-flat (written "½♭"); 0x13-0x1c = plain digits 0-9 (a run of two or more is a
            page number set in this font, one alone is a degree without a hat); 0x10 "-", 0x12 "/", 0x0f ",", 0x0b "(", 0x0c ")".
  XPTMusic 0x24-0x2a = note letters A-G (chords written in the tables).
  XPTChords "$" flat, "#" sharp, "\\" shuttle (⇄), "<" bend up (↗), ">" bend down (↘); Â Î Ô Û = degrees 1 3 4 5 (one line).
            Chord shapes (stacked fourths, figures) are drawn as glyphs: the gloss in brackets after them names them.
  XPTSymbols "Qq" = compared with (↔), "q" alone = leads to (→); "?" (see) and "à" (sub-entry) dropped.
"""
import json, re, sys
from collections import Counter
import pymupdf

DEG = {0x84: "1", 0x8c: "2", 0x90: "3", 0x96: "4", 0x9d: "5", 0xa4: "6", 0xac: "7", 0xb0: "8"}
ACC = {0x07: "♭", 0x06: "♯", 0x41: "♮", 0x6a: "½♭"}
HAT = "\u0302"
PUNCT = {0x10: "-", 0x12: "/", 0x0f: ",", 0x0b: "(", 0x0c: ")", 0x20: " ", 0x44: "a"}
CHORDDEG = {"Â": "1", "Î": "3", "Ô": "4", "Û": "5"}
SHAPE = set("ÁÃÀÄÖÚáäçæõöþÿ")
PG = "\x01"                                                    # marks a plain music-font digit until runs are sorted out

def acc_letter(letter, chars, i):
    return letter

def line_text(chars):
    """chars: [(c, font)] -> text in plain Unicode."""
    out, acc = "", ""
    for i, (c, f) in enumerate(chars):
        o = ord(c)
        if f.startswith("XPTMusic"):
            if o in ACC: acc = ACC[o]
            elif o in DEG: out += acc + DEG[o] + HAT; acc = ""
            elif 0x13 <= o <= 0x1c: out += acc + PG + str(o - 0x13); acc = ""
            elif o in PUNCT: out += PUNCT[o]
            elif 0x24 <= o <= 0x2a: out += acc_letter(chr(ord("A") + o - 0x24), chars, i)   # note letters A-G (tables)
        elif f.startswith("XPTChords"):
            out += {"$": "♭", "#": "♯", "\\": "⇄", "<": "↗", ">": "↘"}.get(c, CHORDDEG.get(c, "□" if c in SHAPE else c))
        elif f.startswith("XPTSymbols"):
            nxt = chars[i + 1][0] if i + 1 < len(chars) else ""
            if c == "Q" and nxt == "q": out += "↔"
            elif c == "q" and not out.endswith("↔"): out += "→"
            elif c == "à": out += " "
        else:
            out += c
    out = re.sub("(?:" + PG + r"\d){2,}", lambda m: m.group(0).replace(PG, ""), out)   # page numbers set in the music font
    out = re.sub(PG + r"(\d)", r"\1" + HAT, out)                                       # one alone: a degree
    return re.sub(r"\s+", " ", out.replace("\xa0", " ")).strip()

def pages_of(s):
    out = []
    for a, b in re.findall(r"(?<![\d.])(\d{1,3})(?:\s*[–‐-]\s*(\d{1,3}))?(?![\d])", s):
        b = b or a
        if int(b) < int(a): b = a[:len(a) - len(b)] + b                       # "335-6" = 335-336
        a, b = int(a), int(b)
        if b < a: b = a
        if a < 600: out += list(range(a, min(b, a + 40) + 1))
    return out

def lines_of(page):
    unders = [r for r in (it[1] for d in page.get_drawings() for it in d["items"] if it[0] == "re") if r.height < 1.2 and r.width > 3]
    out = []
    for b in page.get_text("rawdict")["blocks"]:
        for l in b.get("lines", []):
            chars = [(c["c"], s["font"], c["bbox"]) for s in l["spans"] for c in s["chars"]]
            if not chars: continue
            under = set()                                      # page numbers with a line under them
            for m in re.finditer(r"\d+", "".join(c for c, _, _ in chars)):
                x0, y1 = chars[m.start()][2][0], chars[m.start()][2][3]; x1 = chars[m.end() - 1][2][2]
                if any(r.x0 < x1 - 1 and r.x1 > x0 + 1 and -3 < r.y0 - y1 < 4 for r in unders): under.add(int(m.group()))
            first = next((f for c, f, _ in chars if c.strip()), "")
            out.append((round(l["bbox"][0]), round(l["bbox"][1]), line_text([(c, f) for c, f, _ in chars]), "Italic" in first, under))
    return out

def columns(L):
    cnt = Counter(r[0] for r in L); bases = []
    for x in sorted(cnt):
        if cnt[x] >= 4 and (not bases or x > bases[-1] + 40): bases.append(x)
    bases = bases or [min(cnt)]
    cols = [[] for _ in bases]
    for r in L:
        ci = max([i for i, b in enumerate(bases) if r[0] >= b - 15] or [0]); cols[ci].append(r)
    return [(bases[i], sorted(c, key=lambda r: r[1])) for i, c in enumerate(cols)]

NUMS = re.compile(r"^(.*?[^\d,–‐\s-])?[\s,]*((?:\d{1,3}(?:\s*[–‐-]\s*\d{1,3})?[,\s]*)*)$")

def alphabetical(doc):
    ents, cur, parent = [], None, None
    for pn in range(561, 595):
        L = [r for r in lines_of(doc[pn]) if r[1] >= 60]
        if pn == 594: L = [r for r in L if r[1] < 330]
        L = [r for r in L if r[2] and not re.match(r"^(Tagg|Alphabetical index|Indexes|[A-Z]|\d{3})$", r[2])]
        if not L: continue
        for base, col in columns(L):
            for x, y, t, ital, under in col:
                off = x - base
                m = NUMS.match(t)
                word = (m.group(1) or "").strip() if m else t
                pgs = pages_of(m.group(2)) if m else pages_of(t)
                if off < 4 and word:
                    cur = {"head": word, "italic": ital, "pages": [], "ex": [], "sub": None}; parent = cur; ents.append(cur)
                elif 8 <= off < 13 and word and parent:
                    cur = {"head": parent["head"], "sub": word, "italic": parent["italic"], "pages": [], "ex": []}; ents.append(cur)
                elif cur is not None and word and off < 8 and not cur["pages"]:
                    cur["head"] = (cur["head"][:-1] if cur["head"].endswith("‐") else cur["head"] + " ") + word   # wrapped title
                if cur is not None: cur["pages"] += pgs; cur["ex"] += [p for p in under if p in pgs]
    for e in ents: e["pages"] = sorted(set(e["pages"])); e["ex"] = sorted(set(e["ex"]))
    return ents

def numerical(doc):
    out, section, cur, group, pend, head = [], None, None, None, "", ""
    for pn in range(594, 600):
        L = lines_of(doc[pn])
        if pn == 594: L = [r for r in L if r[1] >= 330]
        hy = next((r[1] for r in L if re.search(r"Chord shorthand index", r[2])), None)   # p. 598: scale lines above it
        for base, col in columns(L):
            for x, y, raw, _, _ in col:
                if hy is not None and section in ("scale", "shorthand"): section = "scale" if y < hy else "shorthand"
                if re.search(r"Scale.degree index", raw): section = "scale"; continue
                if re.search(r"Chord shorthand index", raw): section = "shorthand"; continue
                if re.search(r"Chord sequence index", raw): section = "sequence"; continue
                if not section or not raw or re.match(r"^(Tagg|\d{3}$)", raw): continue
                if re.match(r"^(Pentatonic|Hexatonic|Heptatonic) modes|^Other scale", raw): group = raw; continue
                if pend: raw = pend + raw; pend = ""
                if re.fullmatch(r"[\d,\s–‐-]+", raw):                                    # page numbers run on
                    if cur: cur["pages"] += pages_of(raw)
                    continue
                if re.search(r"\d[–‐-]$", raw): pend = raw; continue                     # "237–" runs on to the next line
                m = re.match(r"^(?:(.*?[^+\-–‐\s])\s+)?((?:\d{2,3}(?:\s*[–‐-]\s*\d{1,3})?[,\s]*)+)$", raw)
                label, pgs = ((m.group(1) or "").strip(), pages_of(m.group(2))) if m else (raw, [])
                if not label and cur: cur["pages"] += pgs; continue
                if not label: continue
                if cur is not None and re.match(r"^[a-z][^(]*\)$", label) and cur["label"].count("(") > cur["label"].count(")"):
                    cur["label"] = re.sub(r"[‐-]$", "", cur["label"]) + ("" if cur["label"].endswith("‐") else " ") + label; cur["pages"] += pgs; continue        # a gloss wrapped onto a second line
                if section == "shorthand":
                    label = re.sub(r"^115 ", "11♭5 ", label.replace(HAT, ""))           # the flat in "11♭5" is missing from the text layer
                    sym, gloss = (re.match(r"^(.*?)\s*\((.*)\)\s*$", label) or re.match(r"^(.*)()$", label)).groups()
                    label = (gloss.strip("‘’'") if "□" in sym or not sym else sym + " (" + gloss + ")" if gloss else sym)
                if section == "scale":
                    label = re.sub(r"\(\s*([^)]*?)\s*\)", lambda mm: "(" + re.sub(r"[‘’']", "", mm.group(1)).strip() + ")", label)
                if section == "scale" and re.match(r"^[a-z]", label) and head: label = head + " " + label   # "♮3̂ … on bagpipe"
                if section == "scale" and x - base < 4: head = label
                cur = {"index": section, "label": re.sub(r"\s+", " ", label).strip(" ‐"), "pages": pgs}
                cur["label"] = re.sub(r"\b(sev|augment) (enth|ed)\b", r"\1\2", cur["label"])
                out.append(cur)
    for e in out: e["pages"] = sorted(set(e["pages"]))
    return [e for e in out if e["pages"] and len(e["label"]) > 1]

def body_pages(path):
    """The book's text layer (pdf2txt.swift / PDFKit: "=== pN" before each page; not kept in the repo) -> {page: flat text}."""
    pages, cur = {}, None
    for ln in open(path, encoding="utf-8").read().split("\n"):
        m = re.match(r"^=== p(\d+)$", ln)
        if m: cur = int(m.group(1)); pages[cur] = []; continue
        if cur and not re.match(r"^\s*(\d+\s+)?Tagg\s*:\s*Everyday Tonality.*?(\d+)?\s*$", ln): pages[cur].append(ln)
    return {p: re.sub(r"\s+", " ", re.sub(r"‐\n(?=[a-z])", "", "\n".join(v))) for p, v in pages.items()}

def appendix_entries(pages):
    """Reference Appendix entries as [(author as printed, year key, text)]; "—" repeats the author above."""
    out, author = [], None
    for p in range(507, 561):
        for ln in re.split(r"(?<=[.\]]) (?=(?:b ?)?[A-ZÀ-Þ][A-ZÀ-Þ’' .&-]{2,}(?: ?\[[^\]]*\])?(?:, | \()|— \()", pages.get(p, "")):
            m = re.match(r"^(?:b ?)?([A-ZÀ-Þ][A-ZÀ-Þ’' .&-]{2,}?)(?: ?\[[^\]]*\])?((?:, [^(]{1,40})?) \((?:c\. )?(\d{4}[a-z]?)", ln)
            if m:
                author = (m.group(1).strip(), m.group(2).strip(", ")); out.append((author, m.group(3).lower(), ln)); continue
            m = re.match(r"^— \((\d{4}[a-z]?)", ln)
            if m and author: out.append((author, m.group(1).lower(), ln))
    return out

def nice(author):
    last, first = author
    last = " ".join(w if w in ("&",) or len(w) <= 2 and w.isupper() and "." in w else w.capitalize() for w in last.split(" "))
    return (first + " " + last).strip() if first else last

def appendix(pages):
    """Reference Appendix (pp. 507-560): {(SURNAME-ish word, year key)} for checking a citation found in the text."""
    keys, author = {}, None
    for p in range(507, 561):
        for ln in re.split(r"(?<=[.\]]) (?=(?:b ?)?[A-ZÀ-Þ][A-ZÀ-Þ’' .&-]{2,}(?: ?\[[^\]]*\])?(?:, | \()|— \()", pages.get(p, "")):
            m = re.match(r"^(?:b ?)?([A-ZÀ-Þ][A-ZÀ-Þ’' .&-]{2,}?)(?: ?\[[^\]]*\])?((?:, [^(]{1,40})?) \((?:c\. )?(\d{4}[a-z]?)", ln)
            if m:
                author = (m.group(1).strip(), (m.group(2) or "").strip(", "))
                for k in (fold(author[0]), fold(author[0].split(" ")[0])): keys.setdefault((k, m.group(3).lower()), nice(author))
            m = re.match(r"^— \((\d{4}[a-z]?)", ln)
            if m and author:
                for k in (fold(author[0]), fold(author[0].split(" ")[0])): keys.setdefault((k, m.group(1).lower()), nice(author))
    return keys

def fold(s):
    import unicodedata
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()
    return re.sub(r"^the ", "", s)

NAME = r"([A-ZÀ-Þ][\w.’'&-]*(?: (?:[A-ZÀ-Þ&][\w.’'&-]*|and|the|of|de|van|von|y|da|del|la|le))*)"

APPX = []

def credits(title, pgs, pages, keys):
    """Artist / composer and year for one title from the pages the index gives: "Title (Artist, 1962)", "Artist: Title (1972a",
    "Artist's Title (1967)", "Title (1972)". Each hit: {artist, year, page, checked} (checked = the Reference Appendix has an entry
    for that name and year key)."""
    t = re.escape(re.sub(r"\s+", " ", title)).replace("\\ ", "\\s+").replace("’", "[’']")
    hits = []
    for p in pgs:
        tx = pages.get(p, "")
        pats = [(re.compile(t + r"[’”]?,?\s*\(" + NAME + r",?\s+(?:c\. )?(\d{4})([a-z]?)\b"), (1, 2, 3)),
                (re.compile(NAME + r"(?:’s|:)\s+(?:[‘“])?" + t + r"[’”]?,?\s*\((?:c\. )?(\d{4})([a-z]?)\b"), (1, 2, 3)),
                (re.compile(t + r"[’”]?,?\s*\((?:c\. )?(\d{4})([a-z]?)\b"), (None, 1, 2))]
        for rx, (ai, yi, ki) in pats:
            for m in rx.finditer(tx):
                art = m.group(ai).strip() if ai else None
                if art and re.match(r"^(See|In|The|Ex|Fig|cf|e\.g)$", art): continue
                y = int(m.group(yi))
                if not 1100 < y < 2015: continue
                key = (str(y) + m.group(ki)).lower()
                ok = False
                if art:                                           # "C F Guess Who": drop leading words until the appendix knows it
                    ws = art.split(" ")
                    cands = [fold(" ".join(ws[i:])) for i in range(len(ws))] + [fold(w) for w in ws if len(w) > 2]
                    for c in cands:
                        if (c, key) in keys: art, ok = keys[(c, key)], True; break
                hits.append({"artist": art, "year": y, "page": p, "checked": ok})
    if not any(h["checked"] or h["artist"] for h in hits):        # else: the title in the Reference Appendix
        tl = re.compile(r"(?:\) |\)\. |[‘“]|▪ ?|\] )" + t + r"(?:[’”]|\.(?: |$)|\?)")
        for author, key, text in APPX:
            if tl.search(" " + text) and not re.search(r",? see [A-Z]", text[:60]):
                hits.append({"artist": nice(author), "year": int(key[:4]), "page": None, "checked": True, "from": "appendix"})
    best = {}
    for h in hits:                                                 # one per artist + year, the checked one first
        k = (h["artist"], h["year"])
        if k not in best or (h["checked"] and not best[k]["checked"]): best[k] = h
    return sorted(best.values(), key=lambda h: (not h["checked"], h["artist"] is None, h["page"]))

if __name__ == "__main__":
    doc = pymupdf.open(sys.argv[1])
    A = alphabetical(doc); N = numerical(doc)
    body = body_pages(sys.argv[3]) if len(sys.argv) > 3 else None
    keys = appendix(body) if body else set()
    APPX[:] = appendix_entries(body) if body else []
    tunes = [e for e in A if e["italic"] and not e["sub"] and re.match(r"^[¡¿\"‘“A-ZÀ-Þ0-9]", e["head"]) and e["pages"]]
    byp = {}
    for n in N:
        for p in n["pages"]: byp.setdefault(p, []).append(n)
    res = []
    for t in tunes:
        hits = {}
        for p in t["pages"]:
            for n in byp.get(p, []):
                h = hits.setdefault((n["index"], n["label"]), {"pages": [], "strong": False})
                h["pages"].append(p); h["strong"] |= p in t["ex"]
        cr = credits(t["head"], t["pages"], body, keys) if body else []
        res.append({"title": t["head"], "pages": t["pages"], "ex": t["ex"], "credits": cr,
                    "concepts": [{"index": k[0], "label": k[1], "pages": v["pages"], "strong": v["strong"]}
                                 for k, v in sorted(hits.items(), key=lambda kv: (not kv[1]["strong"], -len(kv[1]["pages"]), kv[0]))]})
    json.dump({"tunes": res, "numerical": N}, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(tunes), "italic titles;", sum(1 for r in res if r["ex"]), "with a music example;",
          sum(1 for r in res if r["concepts"]), "with a concept;", sum(1 for r in res if any(c["strong"] for c in r["concepts"])),
          "with a strong one;", sum(1 for r in res if r["credits"]), "with a credit,",
          sum(1 for r in res if any(c["checked"] for c in r["credits"])), "checked against the appendix;", Counter(n["index"] for n in N))
