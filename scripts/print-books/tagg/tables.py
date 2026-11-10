#!/usr/bin/env python3
"""Tagg, Everyday Tonality II: the chord progression / loop tables (Tables 19, 20, 23, 27-31, 34-38) -> tables.json.

    <venv>/bin/python -I tables.py book.pdf tables.json

The tables are ruled, so PyMuPDF's find_tables() finds the cells; each cell's text is read again from its characters with the
same glyph map as indexes.py (chord font: "$" = flat, "\\" = shuttle ⇄; music-font scale degrees) and italics kept as _…_
(titles of recordings). A table that runs over a page break is joined (same column count on the next page, no caption there).
Rows the table spans (a "Type" cell covering several recordings) are filled down.
"""
import json, re, sys
import pymupdf
sys.path.insert(0, __import__("os").path.dirname(__file__))
from indexes import line_text

TABLES = {19: 263, 20: 265, 23: 287, 27: 374, 28: 376, 29: 383, 30: 385, 31: 389, 34: 409, 35: 422, 36: 431, 37: 441, 38: 442}

def cell_text(page, rect):
    if rect is None: return ""
    lines = []
    for b in page.get_text("rawdict", clip=pymupdf.Rect(rect))["blocks"]:
        for l in b.get("lines", []):
            chars = [(c["c"], s["font"]) for s in l["spans"] for c in s["chars"]
                     if pymupdf.Rect(c["bbox"]).intersects(pymupdf.Rect(rect)) and pymupdf.Rect(c["bbox"]).x0 >= rect[0] - 1]
            if not chars: continue
            out, ital = [], False                                  # italic runs as _…_
            for c, f in chars:
                it = "Italic" in f
                if it != ital and c.strip(): out.append(("_", "")); ital = it
                out.append((c, f))
            if ital: out.append(("_", ""))
            t = ""
            run = []
            for c, f in out:
                if c == "_" and f == "": t += line_text(run) + ("_" if True else ""); run = []
                else: run.append((c, f))
            t += line_text(run)
            lines.append((round(l["bbox"][1]), t))
    lines.sort()
    return [re.sub(r"_\s*_", " ", re.sub(r"\s+", " ", t)).replace("_ ", " _").strip() for _, t in lines if t.strip()]

def caption(page):
    m = re.search(r"Table (\d+)[.:]\s*([^\n]+(?:\n(?!Table)[^\n]{0,60})?)", page.get_text())
    return (int(m.group(1)), re.sub(r"\s+", " ", m.group(2)).strip()) if m else (None, "")

def read(doc, n, pno):
    out = {"table": n, "page": pno, "caption": "", "header": [], "rows": []}
    pages = [pno, pno + 1]
    for i, p in enumerate(pages):
        page = doc[p - 1]
        cap_n, cap = caption(page)
        if i == 0: out["caption"] = cap if cap_n == n else ""
        elif cap_n is not None and cap_n != n and "cont" not in out["caption"]: break
        tabs = page.find_tables().tables
        if not tabs: continue
        tab = max(tabs, key=lambda t: t.bbox[3] - t.bbox[1]) if i == 0 else tabs[0]
        if i > 0 and out["header"] and tab.col_count != len(out["header"]): break
        if i > 0: out["pages"] = [pno, p]
        for r, row in enumerate(tab.rows):
            cells = [cell_text(page, c) for c in row.cells]
            if not out["header"] and r == 0:
                out["header"] = [" ".join(c) for c in cells]; continue
            if i > 0 and r == 0 and [" ".join(c) for c in cells] == out["header"]: continue
            out["rows"].append(cells)
    return out

def bullets(t):
    """Tables 35-38 list recordings as "•Artist: _Title_ (Year: chords; detail)" lines in one cell, the type in the cell to the left."""
    rows = [t["header"]] + [[" ".join(c) for c in r] for r in t["rows"]] if t["header"] and "•" in " ".join(t["header"]) else \
           [[" ".join(c) for c in r] for r in t["rows"]]
    out = []
    for r in rows:
        typ = re.sub(r"^Type\s*", "", r[0]).strip() if len(r) > 1 else ""
        body = r[-1]
        body = re.sub(r"^Tune \(Artist, Year: chords[^)]*\)\]?\)?\s*", "", body)
        for e in [x.strip() for x in body.split("•") if x.strip()]:
            m = re.match(r"^(.*?):\s*_?(.*?)_?\s*\((\d{4}[a-z]?)\s*[:;]?\s*(.*)\)\s*(.*)$", e)
            if m: out.append({"type": typ, "artist": m.group(1).strip(), "title": m.group(2).strip(" _"), "year": m.group(3),
                              "chords": m.group(4).strip(), "note": m.group(5).strip()})
            else: out.append({"type": typ, "raw": e})
    return out

def split_rows(t):
    """A ruled row often holds several recordings, one per line (chords / key / recording side by side): pair the lines up."""
    rows, fill = [], [""] * len(t["header"])
    for cells in t["rows"]:
        n = max((len(c) for c in cells), default=0)
        recs = max(range(len(cells)), key=lambda j: len(cells[j]))
        if n <= 1 or sum(1 for c in cells if len(c) == n) < 2:     # one record (or a section heading spanning the row)
            vals = [" ".join(c) for c in cells]
            if sum(1 for v in vals if v) == 1 and not any(re.search(r"\(\d{4}", v) for v in vals):
                rows.append({"section": next(v for v in vals if v)}); fill = [""] * len(vals); continue
            for j, v in enumerate(vals):
                if v: fill[j] = v
            rows.append({"cells": [v or fill[j] for j, v in enumerate(vals)]}); continue
        for k in range(n):
            vals = []
            for j, c in enumerate(cells):
                if len(c) == n: vals.append(c[k])
                else: vals.append(" ".join(c) if k == 0 or len(c) <= 1 else (c[k] if k < len(c) else ""))
            for j, v in enumerate(vals):
                if v: fill[j] = v
            rows.append({"cells": [v or fill[j] for j, v in enumerate(vals)]})
    return rows

# Table 37 has rules between rows but none between columns, so find_tables() misses it: copied by hand from p. 441.
T37 = {"table": 37, "page": 441, "caption": "Bimodal reversibility of progressions (examples only)", "hand": True,
       "header": ["", "", ""], "rows": [
    [["_lydian_ F G C = I II V [I]"], ["↔"], ["_ionian_ C G F F = I V IV [I]"]],
    [["_ionian_ C F G = I IV V [I]"], ["↔"], ["_mixolydian_ G F C = I ♭VII IV [I]"]],
    [["_mixolydian_ G C F Dm = I IV ♭VII v [I]"], ["↔"], ["_dorian_ Dm F C G = i ♭III ♭VII IV [I]"]],
    [["_dorian_ Dm F G Am = i ♭III IV v [I]"], ["↔"], ["_aeolian_ Am G F Dm = i ♭VII ♭VI v [I]"]],
    [["_aeolian_ Am Dm E = i iv V [I]*", "_aeolian_ E F G Am = V ♭VI ♭VII i*"], ["↔"],
     ["_phrygian_ E Dm Am = I ♭vii iv [I]*", "_phrygian_ Am G F E = iv ♭III ♭II I*"]],
    [["_ionian_ Am G C = vi V I"], ["↔"], ["_aeolian_ C G Am = ♭III ♭VII i"]]],
       "note": "* Phrygian i is normally altered to Hijaz I, so aeolian v is altered here to V."}

def display(t):
    """Rows for showing the table as printed: each cell a list of lines; wrapped bullet entries joined, one entry a line."""
    def fix(cell):
        if any("•" in l for l in cell):
            s = " ".join(cell).replace("_• ", "• _").replace("_•", "• _")
            return ["• " + e.strip() for e in s.split("•") if e.strip()]
        return cell
    return [[fix(c) for c in r] for r in t["rows"]]

REC = [  # one recording, in the ways the tables write it
    re.compile(r"^•?\s*(?P<artist>[^:•_]{2,60}?):\s*_(?P<title>[^_]+)_\s*(?P<detail>[^(]*?)\s*\((?P<year>\d{4}[a-z]?)\s*[:;,]?\s*(?P<rest>[^)]*)\)?(?P<after>.*)$"),
    re.compile(r"^•?\s*_(?P<title>[^_]+)_\s*\((?P<artist>[^,0-9]{2,60}?),?\s+(?P<year>\d{4}[a-z]?)\s*[:;]?\s*(?P<rest>[^)]*)\)?(?P<after>.*)$"),
    re.compile(r"^•?\s*_(?P<title>[^_]+)_\s*\((?P<artist>[A-Z][^,0-9]{1,40}?),?\s*(?P<year>\d{4}[a-z]?)\)(?P<after>.*)$"),
    re.compile(r"^•?\s*(?P<artist>[^:•_]{2,60}?):\s*_(?P<title>[^_]+)_\s*(?P<after>.*)$"),
]
CHORDS = re.compile(r"^[A-G][♭♯#b]?[^\s]*(?:\s*(?:⇄|-|—|\||\s)\s*\(?[A-G][♭♯#b]?[^\s]*)+")

def rec_of(line):
    for rx in REC:
        m = rx.match(line.strip())
        if m:
            d = {k: (v or "").strip(" ;,.:") for k, v in m.groupdict().items()}
            rest = d.pop("rest", ""); after = d.pop("after", ""); detail = d.pop("detail", "")
            ch = re.match(r"^([A-G][^:;\[\]]*?)(?:[:;]\s*(.*))?$", rest) if rest else None
            if ch and CHORDS.match(ch.group(1).strip() + " ") or (ch and re.fullmatch(r"[A-G][^ ]*(?: [A-G][^ ]*)*", ch.group(1).strip())):
                d["chords"] = ch.group(1).strip(); d["detail"] = " ".join(x for x in (detail, ch.group(2) or "", after) if x).strip(" ;,.")
            else:
                d["detail"] = " ".join(x for x in (detail, rest, after) if x).strip(" ;,.()")
            d["title"] = d["title"].strip(" ,")
            return d
    return None

def songs(t):
    out = []
    head = [re.sub(r"_", "", h).lower() for h in t["header"]]
    for row in t["display"]:
        if t["table"] == 34:                                       # a grid: year, then Artist: / _Title_ pairs
            for cell in row:
                lines = cell if isinstance(cell, list) else [cell]
                yr = None; art = None
                for l in lines:
                    if re.fullmatch(r"\d{4}", l.strip()): yr = l.strip(); continue
                    for part in re.split(r"(?<=_)\s+(?=[A-Z])", l):
                        m = re.match(r"^(.*?):\s*_(.+?)_$", part.strip())
                        if m: out.append({"artist": m.group(1), "title": m.group(2), "year": yr, "type": "I-vi-IV-V"}); art = None; continue
                        m = re.match(r"^(.*?):$", part.strip())
                        if m: art = m.group(1); continue
                        m = re.match(r"^_(.+?)_(?:\s+(.*?):)?$", part.strip())
                        if m:
                            if art: out.append({"artist": art, "title": m.group(1), "year": yr, "type": "I-vi-IV-V"}); art = m.group(2)
                            else: art = m.group(2); pend = m.group(1); out.append({"artist": m.group(2) or "", "title": pend, "year": yr, "type": "I-vi-IV-V"})
            yr0 = None
            for r in out:                                          # "1957 Tab Hunter": the year opens the cell
                m = re.match(r"^(\d{4})\s+(.*)$", r.get("artist") or "")
                if m: r["year"], r["artist"] = m.group(1), m.group(2)
                yr0 = r.get("year") or yr0; r["year"] = r.get("year") or yr0
            continue
        cols = {h: row[i] for i, h in enumerate(head) if i < len(row)} if head else {}
        typ = " ".join(row[0]) if row and row[0] else ""
        recs_i = max(range(len(row)), key=lambda j: sum(1 for l in row[j] if "_" in l))
        rl = row[recs_i]
        chords_i = next((i for i, h in enumerate(head) if "chord" in h and "tune" not in h and "song" not in h), None)
        key_i = next((i for i, h in enumerate(head) if h.strip() == "key"), None)
        if t["table"] == 19:
            rl = [" ".join(row[0])]; chords_i = None
        for k, line in enumerate(rl):
            r = rec_of(line)
            if not r: continue
            if t["table"] == 19:
                r = {"title": re.sub(r"_", "", re.sub(r"\(.*", "", line)).strip(), "artist": re.sub(r".*\(([^,0-9]+?),?\s*\d.*", r"\1", " ".join(row[0])).strip(),
                     "year": (re.findall(r"\d{4}", " ".join(row[0])) or [""])[0], "chords": row[2][0] if len(row) > 2 and row[2] else "",
                     "roman": row[2][1] if len(row) > 2 and len(row[2]) > 1 else "", "detail": " ".join(row[1])}
            if t["table"] == 20 and len(row) > 1:
                pr = " ".join(row[1]); a, _, b = pr.partition(" — ")
                r["chords"] = a.strip(); r["roman"] = b.strip()
            if chords_i is not None and chords_i < len(row):
                c = row[chords_i]; r["chords"] = c[k] if len(c) == len(rl) else (c[0] if c else "")
            if key_i is not None and key_i < len(row):
                c = row[key_i]; r["key"] = c[k] if len(c) == len(rl) else (c[0] if len(c) == 1 else "")
            if recs_i != 0: r["type"] = re.sub(r"^Type\s*", "", typ)
            m = re.match(r"^(.*?)\)?\s*\((\d{4}[a-z]?)$", r.get("detail", ""))            # "(intro) (1964)"
            if m and not r.get("year"): r["year"] = m.group(2); r["detail"] = m.group(1).strip(" ()")
            m = re.search(r"\[([A-G][^\]]*?)(?: in ([A-G][♭♯]?m?))?\]", r.get("detail", ""))   # Table 23: "[C-F-G in C]"
            if m and not r.get("chords"): r["chords"] = m.group(1).replace("-", " "); r["key"] = r.get("key") or (m.group(2) or "")
            r = {k2: (re.sub(r"_", "", v) if isinstance(v, str) else v) for k2, v in r.items() if v}
            out.append(r)
    seen, uniq = set(), []
    for r in out:
        k = (r.get("artist"), r.get("title"), r.get("chords"))
        if k not in seen: seen.add(k); uniq.append(r)
    return uniq

if __name__ == "__main__":
    doc = pymupdf.open(sys.argv[1])
    res = []
    for n, p in TABLES.items():
        t = T37 if n == 37 else read(doc, n, p)
        if n == 34: t["rows"] = [[[" ".join(t["header"][0:1])], [t["header"][1] if len(t["header"]) > 1 else ""]]] + t["rows"]; t["header"] = []
        if n in (37, 38) and t["header"] and "•" in " ".join(t["header"]):
            t["rows"] = [[[t["header"][0]], [t["header"][1]]]] + t["rows"]; t["header"] = ["Type", "Tune (Artist, Year: chords [detail])"]
        t["display"] = display(t)
        t["songs"] = songs(t)
        res.append(t)
        print(n, p, len(t["display"]), "rows,", len(t["songs"]), "songs,", sum(1 for s in t["songs"] if s.get("chords")), "with chords")
    json.dump(res, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
