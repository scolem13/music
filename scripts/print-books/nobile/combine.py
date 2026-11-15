#!/usr/bin/env python3
"""parsed.json (parse.py) -> nobile-index.json {works: [{title, artist, year?, refs: [{fig: page, ex?: true}]}]}, same shape as Tagg's.

    python3 -I combine.py parsed.json nobile-index.json

Repairs the text layer's misreadings (fixes in FIX / the regexes), puts "Boxer, The" back to "The Boxer", takes "(1967)" before the
artist as the recording's year, splits entries with one line per artist, drops "See" cross-references, and reports what it could
not read. Page tokens: bold = an example (ex), "n" footnote, "t" table; ranges kept as printed."""
import json, re, sys
raw = json.load(open(sys.argv[1]))
FIX = {"Le2 Banke": "Left Banke", "Dri2 Away": "Drift Away", "Get O3 ": "Get Off ", "Shondelles": "Shondells", "Jimmy Buffet": "Jimmy Buffett", "Bu3alo": "Buffalo"}
def clean(s):
    s = s.replace("\uf639", "fi")
    s = re.sub(r"(?<=[a-mo-zA-Z])3\b", "ff", s)
    s = re.sub(r"!(?=[a-z])", lambda m: "Th", s)
    s = re.sub(r"\bTh(?=e\b)", "Th", s)
    s = re.sub(r"(?<=[A-Za-z])3(?=[A-Za-z])", "ff", s)
    s = re.sub(r"(?<=[A-Za-z])2(?=[A-Za-z])", "ft", s)
    for a, b in FIX.items(): s = s.replace(a, b)
    return s
def pages(txt):
    out = []
    # numbers in bold are wrapped \x01..\x02; a range may be two bold numbers around the dash
    for tok in re.split(r",\s*", txt.strip().rstrip(",")):
        ex = "\x01" in tok; t = tok.replace("\x01", "").replace("\x02", "").strip()
        if not t: continue
        if not re.fullmatch(r"(?:[xvi]+|\d+)(?:[–-](?:[xvi]+|\d+))?(?:n\d+|t)?", t): out.append(("?", t)); continue
        out.append((t, ex))
    return out
works = []; problems = []
for e in raw:
    if "”" not in e[0]: e = [e[0] + " " + e[1]] + e[2:]          # a title that wraps onto the second line
    first = clean(e[0]); m = re.match(r"“(.+?)”(’?)\s*(.*)$", first)
    if not m: problems.append(("no title", e)); continue
    title, rest = m.group(1) + m.group(2), m.group(3)
    if rest.startswith("See "): continue
    title = re.sub(r"^(.*), (The|A)\.?$", r"\2 \1", title)
    title = title.replace("’", "’")
    body = [rest] + [clean(x) for x in e[1:]]
    year = None; groups = []                           # [(artist, pagetext)]
    mm = re.match(r"\((\d{4})\)\s*(.*)$", body[0])
    if mm: year = int(mm.group(1)); body[0] = mm.group(2)
    if body[0] == "" and len(body) > 1 and body[1].startswith("("): body = body[1:]
    if body[0].startswith("("):                        # (Artist), pages ... (artist may wrap onto the next line)
        text = " ".join(body); am = re.match(r"\((.+?)\),?\s*(?=[\dxv\x01]|$)(.*)$", text)
        if not am: problems.append(("artist", e)); continue
        groups.append((am.group(1), am.group(2)))
    elif body[0] == "" or re.match(r"[A-Za-z]", body[0]):   # one line per artist: "Al Green, 26, ..." / "the Talking Heads, 26–29"
        for ln in [b for b in body if b]:
            am = re.match(r"(.+?),\s*(\x01?[\dxvi].*)$", ln)
            if am: groups.append((am.group(1), am.group(2)))
            elif re.match(r"\x01?[\dxvi]", ln) and groups: groups[-1] = (groups[-1][0], groups[-1][1] + " " + ln)   # page list wrapped
            else: problems.append(("artist line", ln))
        # "Mr. Tambourine Man the Byrds, 156n5 Bob Dylan, ..." came as one run on a single line: split on the artist starts handled above
    else: problems.append(("shape", e)); continue
    for artist, pg in groups:
        artist = re.sub(r"^the ", "The ", artist)
        seen = {}; refs = []
        for t, ex in pages(pg):
            if t == "?": problems.append(("page token", title, ex)); continue
            if t in seen: refs[seen[t]]["ex"] = refs[seen[t]].get("ex") or ex or None; continue
            seen[t] = len(refs); refs.append({"fig": t, **({"ex": True} if ex else {})})
        # a range printed with bold numbers (158–159) shows as two bold numbers; keep the range once
        w = {"title": title, "artist": artist, "refs": refs}
        if year: w["year"] = year
        works.append(w)
json.dump({"works": works}, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(works), "works;", sum(len(w["refs"]) for w in works), "page refs;", len(problems), "problems")
for p in problems: print("  ", p)
