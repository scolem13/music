#!/usr/bin/env python3
"""Find the bar of a complete movement where a Classical Theme begins (PDMX scores; see ~/Downloads/PDMX.md).

    python3 -I scripts/pdmx-match.py            # Mozart Symphony 40 (the SETS table below); writes theme-sources/pdmx-matches.json

Reads MusicXML only (zipfile + xml.etree, nothing downloaded is run). For every theme: the notes come from MTD's
score CSV (sounding MIDI pitches, onsets); each score line (part / staff / voice, the top note of a chord, grace notes
dropped) is searched for the theme's pitches as a transposition-free alignment that allows misses (costs: a pitch
that differs or a note inserted / left out = 1). The score is 1 - cost / notes; a loose rhythm check (share of the
theme's onsets found in the line, at either the same or a halved / doubled beat) is reported beside it.
The result is the written measure number (MusicXML `number`, repeats not unrolled) of the first matched note, with the
tempo word / metronome at or before it. The earliest line within 0.05 of the best match wins (a theme recurs later).
A theme is judged by a first (chosen) score and an alternate; `complete` says the chosen score has the expected
bar count for the movement.
"""
import csv, glob, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

HOME = os.path.expanduser("~")
PDMX = HOME + "/Downloads/PDMX-mxl/"
MTD = HOME + "/Downloads/MTD_1.0.0/MTD"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "theme-sources/pdmx-matches.json")

# movement -> (chosen score, alternates, expected written bars)
SETS = {
    "I":   ("6/42/QmNsmhXwgGBZiCRTBFVa4VdAbiwuHQcY6SZxUT3WZaBnq3.mxl",
            ["4/11/QmebfX6jV6E3r8pFKgNenTBxffNFJ6Z2Lriwy12MqfkK4A.mxl", "2/10/QmcAHJaArRnENiG1UCNmBWDhhFtaEH3eLFqPabp1T3fMwH.mxl"], 299),
    "II":  ("11/3/QmT4puPZzUJUm9QcaAiCzpshqn2gDmEWNKUQQx1tph1AaK.mxl", ["2/24/QmcHpWcmj6hkpe9hSLv974WRw79nN7R3PJTYzZxFA9GdjA.mxl"], 123),
    "III": ("0/2/Qma3RGahHfuX9AwXMy6muvZ4SkqhR1toMUDqPfDUmfZwLX.mxl", ["15/46/QmXuHrnp8bRq9er2We5f34VF6TknxuZ768fL2DubBDkb1b.mxl"], 84),
    "IV":  ("2/47/QmcU5MZmkd3hhBFRYx9EJc2ya2JcTK5DruskWfaYvDFckJ.mxl", ["16/13/QmYcjdAFsiuCxvNpfdmd79wpZ3JjHp7AmnTy3oqrzAeKsj.mxl"], 307),
}
# EDM id -> movement (MTD work KV550-0n)
THEMES = {"4598": "I", "4599": "I", "4600": "II", "4601": "II", "4602": "II",
          "4603": "III", "4604": "III", "4605": "IV", "4606": "IV"}

def query(edm):
    """(onset, pitch) of the theme's notes from MTD's score CSV, found through data_META's EDMID."""
    for jf in glob.glob(MTD + "/data_META/*.json"):
        m = json.load(open(jf))
        if edm in m["EDMID"].split("+") and m["ComposerID"] == "Mozart" and m["WorkID"].startswith("KV550"):
            f = glob.glob(MTD + "/data_SCORE_CSV/MTD" + m["MTDID"] + "_*.csv")[0]
            rows = list(csv.reader(open(f), delimiter=";"))[1:]
            return sorted((float(a), int(c)) for a, b, c in rows)
    raise SystemExit("no MTD theme " + edm)

STEP = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

def load(path):
    """Parts -> lines {(part, staff, voice): [(onset_quarters, bar, midi, dur)]}, bars {bar: pos}, directions [(onset, text)]."""
    z = zipfile.ZipFile(path)
    name = [n for n in z.namelist() if n.endswith(".xml") and not n.startswith("META-INF")][0]
    root = ET.fromstring(z.read(name))
    for e in root.iter():                      # drop namespaces if any
        e.tag = e.tag.split("}")[-1]
    lines = defaultdict(list); dirs = []; nbars = 0; bars = []; events = defaultdict(set); first_bar_len = None; maxbar = 0; finals = []
    for pi, part in enumerate(root.findall("part")):
        div = 1; base = 0.0; tr = 0; idx = 0
        for m in part.findall("measure"):
            num = m.get("number"); pos = 0.0; top = 0.0
            if pi == 0: bars.append([base, num, 0.0])
            try: n = int(re.match(r"\d+", num).group())
            except Exception: n = None
            last_on = 0.0
            for el in m:
                t = el.tag
                if t == "attributes":
                    d = el.findtext("divisions")
                    if d: div = int(d)
                    c = el.find("transpose/chromatic")
                    tr = int(c.text) if c is not None else tr
                elif t == "note":
                    dur = el.findtext("duration"); d = (int(dur) / div) if dur else 0.0
                    if el.find("grace") is not None: continue
                    chord = el.find("chord") is not None
                    on = last_on if chord else pos
                    if not chord:
                        last_on = pos; on = pos; pos += d; top = max(top, pos)
                    p = el.find("pitch")
                    if p is None: continue
                    midi = 12 * (int(p.findtext("octave")) + 1) + STEP[p.findtext("step")] + int(float(p.findtext("alter") or 0)) + tr
                    events[round((base + on) * 16)].add(midi % 12)
                    key = (pi, el.findtext("staff") or "1", el.findtext("voice") or "1")
                    L = lines[key]
                    if chord and L and L[-1][0] == base + on:
                        if midi > L[-1][2]: L[-1] = (L[-1][0], L[-1][1], midi, L[-1][3])
                    else:
                        L.append((base + on, num, midi, d))
                elif t == "backup": pos -= int(el.findtext("duration")) / div
                elif t == "forward": pos += int(el.findtext("duration")) / div; top = max(top, pos)
                elif t == "barline" and pi == 0 and el.findtext("bar-style") == "light-heavy" and el.find("repeat") is None:
                    finals.append(base + max(pos, top))
                elif t == "direction":
                    words = [w.text.strip() for w in el.iter("words") if w.text and w.text.strip()]
                    met = el.find(".//metronome")
                    s = el.find("sound")
                    txt = " ".join(words)
                    if met is not None:
                        bu, pm = met.findtext("beat-unit"), met.findtext("per-minute")
                        txt += (" " if txt else "") + "[" + str(bu) + ("." if met.find("beat-unit-dot") is not None else "") + "=" + str(pm) + "]"
                    if txt: dirs.append((pi, base + pos, num, txt))
            if pi == 0: bars[-1][2] = top
            base += top
        if pi == 0:
            nbars = len(part.findall("measure")); bars = edition_bars(bars)
    total = bars[-1][0] + bars[-1][2] if bars else 0
    finals = [f for f in finals if f < total - 1e-6]   # pieces ending before the file does (a suite, prelude + fugue)
    # a suite's next piece is often only named, its last barline a repeat: a dance or movement name past the first bar
    finals += [on for _, on, _, txt in dirs if on > 4 and PIECE_RE.match(txt.strip())]
    return lines, dirs, nbars, finals, bars, events

def edition_bars(bars, nominal=None):
    """[(start, written number, length)] -> [(start, edition number, length)]: a short first measure is bar 0 (the
    pickup), and a short measure completed by the short one after it (the bar split at a repeat sign) is one bar.
    The measure's own number is kept as the 4th item. Returns [(start, number, length, written)]."""
    out = []; n = 0; i = 0
    nom = max(set(round(b[2], 3) for b in bars), key=lambda v: sum(1 for b in bars if round(b[2], 3) == v))
    prev_split = False
    for i, (st, num, ln) in enumerate(bars):
        if i == 0 and ln < nom - 1e-6:
            out.append((st, 0, ln, num)); prev_split = False; continue
        if prev_split:      # second half of a split bar
            out.append((st, n, ln, num)); prev_split = False; continue
        n += 1
        out.append((st, n, ln, num))
        nxt = bars[i + 1] if i + 1 < len(bars) else None
        if ln < nom - 1e-6 and nxt and abs(ln + nxt[2] - nom) < 1e-6: prev_split = True
    return out

def numkey(n):
    m = re.search(r"\d+", n or "")
    return int(m.group()) if m else -1

def align(q, line, k, j):
    """Cost of aligning all of q onto line from line index k-j (anchor: q[j] ~ line[k]), pitches shifted by the anchor offset."""
    off = line[k][2] - q[j][1]
    s = max(0, k - j - 1)
    m = len(q); W = m + 6
    seg = line[s:s + W]
    INF = 1e9
    prev = [i for i in range(len(seg) + 1)]   # cost of skipping i line notes before q[0]: cheaper start fixed near s
    prev = [0.0 if i <= 2 else float(i - 2) for i in range(len(seg) + 1)]
    for a in range(m):
        cur = [prev[0] + 1.0] + [INF] * len(seg)
        for b in range(1, len(seg) + 1):
            sub = 0.0 if seg[b - 1][2] == q[a][1] + off else 1.0
            cur[b] = min(prev[b - 1] + sub, prev[b] + 1.0, cur[b - 1] + 1.0)
        prev = cur
    # best end anywhere (free end); remember where the first note sits for the bar: the line index of the aligned q[0]
    cost = min(prev)
    # first matched note: the line note at the anchor shifted back to q[0] when the prefix matched exactly, else s+? -> use anchor walk back
    first = k - j
    first = max(0, min(first, len(line) - 1))
    return cost, first, off

def rhythm(q, line, first, scale_set=(1, 2, 0.5, 4, 0.25)):
    best = 0.0
    t0q = q[0][0]
    ons = [x[0] for x in line[first:first + len(q) * 2 + 4]]
    if not ons: return 0
    for sc in scale_set:
        hit = sum(1 for o, _ in q if any(abs((ons[0] + (o - t0q) * sc) - x) < 0.13 * max(sc, 1) for x in ons))
        best = max(best, hit / len(q))
    return best

def search(q, lines):
    qs = [(o, p) for o, p in q]
    qi = [qs[i + 1][1] - qs[i][1] for i in range(len(qs) - 1)]
    anchors = defaultdict(list)
    for j in range(len(qi) - 2): anchors[tuple(qi[j:j + 3])].append(j)
    results = []
    for key, line in lines.items():
        if len(line) < 5: continue
        li = [line[i + 1][2] - line[i][2] for i in range(len(line) - 1)]
        seen = {}
        for k in range(len(li) - 2):
            for j in anchors.get(tuple(li[k:k + 3]), ()):
                s = k - j
                if s < 0 or s in seen: continue
                cost, first, off = align(qs, line, k, j)
                seen[s] = 1 - cost / len(qs)
                if seen[s] >= 0.6:
                    results.append((seen[s], line[max(s, 0)][0], line[max(s, 0)][1], key, rhythm(qs, line, max(s, 0))))
    return results

def bar_at(bars, onset):
    cur = 1
    for st, num, ln, w in bars:
        if st <= onset + 1e-6: cur = num
        else: break
    return cur

def poly(q, events, bars):
    """Every part together: each theme note must start (pitch class, 1/16 quarter) somewhere in the score at the
    onset the theme's rhythm asks for; tried at every score onset, 12 transpositions, the CSV beat as 1, 2, 1/2 or 4 quarters.
    Returns [(score, onset_of_theme_note_0, bar, scale)] best first."""
    o0 = q[0][0]; qn = [((o - o0), p % 12) for o, p in q]
    out = []
    for sc in (2, 1, 0.5, 4):
        for t in sorted(events):
            for a in range(min(3, len(qn))):
                t0 = t - round(qn[a][0] * sc * 16)
                if t0 < 0 or not (qn[a][1] - qn[a][1] == 0): continue
                for p in events[t]:
                    off = (p - qn[a][1]) % 12
                    hit = 0
                    for d, pc in qn:
                        u = t0 + round(d * sc * 16)
                        if any((pc + off) % 12 in events.get(u + e, ()) for e in (-1, 0, 1)): hit += 1
                    if hit / len(qn) >= 0.7: out.append((hit / len(qn), t0 / 16, sc))
    best = {}
    for sc_, t0, sc in out:
        k = round(t0)
        if k not in best or best[k][0] < sc_: best[k] = (sc_, t0, sc)
    res = sorted(best.values(), key=lambda r: -r[0])
    return [(r[0], r[1], bar_at(bars, r[1]), r[2]) for r in res[:12]]

def best_of(results):
    if not results: return None
    top = max(r[0] for r in results)
    ok = sorted([r for r in results if r[0] >= top - 0.05], key=lambda r: r[1])
    return top, ok

PIECE_RE = re.compile(r"(?:prae?lude?|praeludium|preludio|allemande?|courante|corrente|sarabande?|gavotte|bourr[eé]e|gigue|giga|menuett?o?|minuet|passepied|fugu?e|fuga|badinerie|polonaise|air|aria|double|sinfonia|ouverture|overture|loure|rondeau|variati?o|var\.)\b", re.I)
TEMPO_RE = re.compile(r"allegro|andante|adagio|largo|presto|menuetto|minuet|trio|molto|assai|moderato|vivace|tempo|\[", re.I)

def tempo_at(dirs, onset):
    best = None
    for pi, on, num, txt in dirs:
        if on <= onset + 1e-6 and TEMPO_RE.search(txt) and (best is None or on >= best[0]): best = (on, txt)
    return best[1] if best else ""

def pickup_len(edm):
    """Quarters of the theme's first, short bar in its MTD ABC (0 when the theme starts with a full bar)."""
    t = open(os.path.join(HERE, "theme-sources/mtd", edm + ".abc"), encoding="utf-8").read()
    mm = re.search(r"^M:(\d+)/(\d+)", t, re.M); ll = re.search(r"^L:1/(\d+)", t, re.M)
    body = t.split("\nK:", 1)[1].split("\n", 1)[1]
    first = body.split("|", 1)[0]
    first = re.sub(r"\{[^}]*\}|\"[^\"]*\"|![^!]*!", "", first)
    unit = 4 / int(ll.group(1)); tot = 0.0
    for m in re.finditer(r"[_=^]*[A-Ga-gz][,']*(\d*)(/+)?(\d*)", first):
        num = int(m.group(1) or 1)
        if m.group(2): num = num / (int(m.group(3)) if m.group(3) else 2 ** len(m.group(2)))
        tot += num * unit
    bar = int(mm.group(1)) * 4 / int(mm.group(2))
    return tot if tot < bar - 1e-6 else 0.0

def judge(q, sc, plen=0.0):
    lines, dirs, nbars, finals, bars, events = sc
    pr = poly(q, events, bars)
    ln = sorted(search(q, lines), key=lambda r: -r[0])
    if not pr: return None
    top = pr[0][0]
    ok = sorted([r for r in pr if r[0] >= top - 0.05], key=lambda r: r[1])
    t0 = ok[0][1]; sc_ = ok[0][0]
    if any(f <= t0 + 1e-6 for f in finals): return None   # the theme is in a later piece of the file
    start = next(b for b in reversed(bars) if b[0] <= t0 + 1e-6)
    sbar = ok[0][2]                      # the bar the first note is written in
    bar = bar_at(bars, t0 + plen) if plen else sbar   # a pickup counts for the bar it leads into
    pick = plen > 0 or bar == 0
    if bar == 0: bar = 1                                 # starts in the score's pickup bar: leads into bar 1
    lbest = ln[0] if ln else None
    lmatch = [r for r in ln if abs(r[1] - t0) < 0.6 and r[0] >= 0.5]
    return dict(bar=bar, pickup=pick, startBar=sbar, beat=round(t0 - start[0], 2), onset=t0, score=round(sc_, 3),
                lineScore=round(max([r[0] for r in lmatch]), 3) if lmatch else 0.0,
                lineBest=round(lbest[0], 3) if lbest else 0.0, lineBestBar=bar_at(bars, lbest[1]) if lbest else None,
                tempo=tempo_at(dirs, t0), also=sorted({r[2] for r in ok}), nbars=bars[-1][1], nmeas=nbars)

def main():
    cache = {}; out = {}; report = []
    for edm, mv in sorted(THEMES.items()):
        q = query(edm)
        main_p, alts, expected = SETS[mv]
        row = {}
        for tag, rel in [("main", main_p)] + [("alt%d" % i, a) for i, a in enumerate(alts)]:
            if rel not in cache: cache[rel] = load(PDMX + rel)
            row[tag] = judge(q, cache[rel], pickup_len(edm))
        report.append((edm, mv, row))
        m = row["main"]
        if m:
            tw = re.sub(r"\s*\[.*?\]", "", m["tempo"]).strip().rstrip("."); met = re.findall(r"\[(.*?)\]", m["tempo"])
            agree = [t for t in row if t != "main" and row[t] and row[t]["bar"] == m["bar"]]
            out[edm] = dict(bar=m["bar"], tempoWord=tw, metronome=met[0] if met else "", score=SETS[mv][0], match=m["score"],
                            complete=abs(m["nbars"] - expected) <= 3, pickup=m["pickup"], startBar=m["startBar"],
                            lineScore=m["lineScore"], alsoAt=m["also"], altAgree=agree, altsTried=[t for t in row if t != "main"])
    for edm, mv, row in report:
        print(edm, mv)
        for t, v in row.items(): print("   ", t, v)
    json.dump(out, open(OUT, "w"), indent=1)
    print("wrote", OUT)

if __name__ == "__main__" and "--all" not in sys.argv:
    main()


# ---- every MTD theme (python3 -I scripts/pdmx-match.py --all [--only Mozart] [--jobs N]) ----
# Candidates come from PDMX.csv: the composer's name, plus the work's catalogue number (WorkID: Op083No2-01, KV550-01,
# BWV1046-01, D0759-02, Hob16No034-01 ...) or, without one, every word of MTD's WorkTitle. Up to MAXC per work (most
# parts first, then views), each searched for every theme of the work. A bar is accepted (complete) only when two or more
# scores agree on it with match >= 0.75, taking the best-matching group (ties: the longest scores, as a full movement
# beats an excerpt that starts at the theme). Everything else is kept in the JSON with complete=false and the reason.
import unicodedata
from concurrent.futures import ProcessPoolExecutor

CSVF = HOME + "/Downloads/PDMX.csv"
MAXC = 24
NAMES = {"Saint": "saint-saens", "Rimsky": "rimsky", "Coleridge": "coleridge", "Dvorak": "dvorak"}
CATS = {"Op": r"op", "KV": r"k\.?\s*v?", "BWV": r"bwv", "Hob": r"hob", "D": r"d", "L": r"l", "B": r"b", "HWV": r"hwv",
        "Sz": r"sz", "WWV": r"wwv", "S": r"s", "WoO": r"woo", "J": r"j", "TWV": r"twv", "MWVU": r"mwv\s*u", "MWVM": r"mwv\s*m",
        "MWVO": r"mwv\s*o", "P": r"p", "Z": r"z", "RV": r"rv", "WD": r"wd", "MR": r"mr"}
STOP = {"no", "in", "the", "of", "for", "and", "op", "major", "minor", "a", "de", "der", "la", "le", "les", "die"}

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s)

def mtd_index():
    """EDM id -> (meta, notes) for every MTD theme; works: (composer, work) -> [EDM ids]."""
    themes = {}; works = defaultdict(list)
    for jf in sorted(glob.glob(MTD + "/data_META/*.json")):
        m = json.load(open(jf))
        f = glob.glob(MTD + "/data_SCORE_CSV/MTD" + m["MTDID"] + "_*.csv")
        if not f: continue
        rows = list(csv.reader(open(f[0]), delimiter=";"))[1:]
        notes = sorted((float(a), int(c)) for a, b, c in rows)
        for edm in m["EDMID"].split("+"):
            themes[edm] = (m, notes)
        works[(m["ComposerID"], m["WorkID"].rsplit("-", 1)[0] if re.search(r"-\d+$", m["WorkID"]) else m["WorkID"])].append(m["EDMID"].split("+")[0])
    return themes, works

def work_regex(meta):
    """A regex for the work's catalogue number in a PDMX title, or None (then the title words are used)."""
    w = meta["WorkID"]
    m = re.match(r"([A-Za-z]+?)(\d+)(?:No(\d+))?", w)
    if not m or m.group(1) not in CATS: return None
    cat, num, sub = m.groups()
    r = r"\b" + CATS[cat] + r"\.?\s*(?:no\.?\s*)?0*" + str(int(num)) + r"(?!\d)"
    if sub: r += r".{0,25}?(?:no|nr|n°|#)\.?\s*0*" + str(int(sub)) + r"(?!\d)"
    return re.compile(r, re.I)

TSV = HOME + "/Projects/classical-music-themes/tsvs/themes.tsv"
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10}
ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6}

def tsv_titles():
    t = {}
    for line in open(TSV, encoding="utf-8"):
        f = line.rstrip("\n").split("\t")
        if len(f) >= 4: t[f[0]] = f[3]
    return t

def work_words(title):
    """'Symphony No. 40, in G minor, K 550, 3rd Movement - 1st Theme' -> ['symphony', '40']: the words before the first comma."""
    head = norm(title).split(",")[0]
    head = re.split(r"\s-\s|\btheme\b|\bmovement\b", head)[0]
    w = [x for x in re.findall(r"[a-z]+|\d+", head) if x not in STOP]
    return w if len(w) >= 2 or any(x.isdigit() for x in w) else []

def title_movement(t):
    """The movement a PDMX title names (II, 'mvt. 2', '2nd movement', 'Satz 2'), or None."""
    m = re.search(r"(?:mvt|mvmt|mov(?:ement)?|satz|part)\.?\s*(\d+)\b", t) or re.search(r"\b(\d)(?:st|nd|rd|th)\s+(?:mov|mvt|satz)", t)
    if m: return int(m.group(1))
    m = re.search(r"\b(first|second|third|fourth|fifth|sixth)\s+(?:mov|mvt)", t)
    if m: return ORD[m.group(1)]
    m = re.search(r"(?:^|[\s:\-\u2013,(])(viii|vii|vi|iv|ix|iii|ii|v|x|i)(?=\s*[\.:\-\u2013)]|\s+(?:allegro|andante|adagio|largo|presto|menuet|minuet|scherzo|rondo|finale|vivace|moderato|lento|grave|tempo))", t)
    return ROMAN[m.group(1)] if m else None

def theme_movement(meta, title):
    m = re.search(r"-(\d+)$", meta["WorkID"])
    if m: return int(m.group(1))
    m = re.search(r"(\d+)(?:st|nd|rd|th) movement", norm(title))
    return int(m.group(1)) if m else None

def candidates(works, themes, titles):
    rows = [r for r in csv.DictReader(open(CSVF)) if r["subset:no_license_conflict"] == "True" and r["mxl"] != "NA"]
    for r in rows:
        r["_who"] = norm(r["composer_name"] + " " + r["artist_name"] + " " + r["title"])
        r["_t"] = norm(" ".join(r[k] for k in ("title", "song_name", "subtitle")))
    out = {}
    for (comp, wid), ids in works.items():
        meta = themes[ids[0]][0]
        name = NAMES.get(comp, comp.lower())
        rx = work_regex(meta)
        words = work_words(titles.get(ids[0], "")) or [x for x in re.findall(r"[a-z]+|\d+", norm(meta["WorkTitle"])) if x not in STOP]
        c = []
        for r in rows:
            if name not in r["_who"]: continue
            if (rx and rx.search(r["_t"])) or (words and all(re.search(r"\b" + re.escape(x) + r"\b", r["_t"]) for x in words)):
                c.append(r)
        c.sort(key=lambda r: (-int(r["n_tracks"]) if r["n_tracks"].isdigit() else 0, -int(float(r["n_views"] or 0))))
        out[(comp, wid)] = [(r["mxl"].replace("./mxl/", ""), title_movement(r["_t"])) for r in c
                            if os.path.exists(PDMX + r["mxl"].replace("./mxl/", ""))][:MAXC]
    return out

def pickup_from_abc(edm):
    try: return pickup_len(edm)
    except Exception: return 0.0

def do_work(job):
    (comp, wid), ids, scores, notes, mvts = job
    res = {}
    for rel, smv in scores:
        try: sc = load(PDMX + rel)
        except Exception as e: continue
        for edm in ids:
            if smv and mvts.get(edm) and smv != mvts[edm]: continue
            q = notes[edm]
            if len(q) < 4: continue
            try: j = judge(q, sc, pickup_from_abc(edm))
            except Exception: j = None
            if j: res.setdefault(edm, []).append(dict(j, file=rel))
    return res

def decide(found):
    good = [f for f in found if f["score"] >= 0.75]
    groups = defaultdict(list)
    for f in good: groups[f["bar"]].append(f)
    agreeing = [g for g in groups.values() if len({x["file"] for x in g}) >= 2 and max(x["score"] for x in g) >= 0.8]
    if not agreeing:
        best = max(found, key=lambda f: f["score"]) if found else None
        if best and best["score"] >= 0.95 and len({x["file"] for x in good}) == 1:
            return [best], "one score", best                           # accepted, flagged: no second score to agree
        why = "no match" if not found else ("only one score" if good else "weak match")
        return None, why, best
    # the best-matching groups first (within 0.05 of the best); among those the longest scores (a full movement beats an
    # excerpt that starts at the theme), then the most scores agreeing
    q = lambda g: sorted((x["score"] for x in g), reverse=True)[1]          # the second-best score: two must match well
    hi = max(q(g) for g in agreeing)
    g = max([g for g in agreeing if q(g) >= hi - 0.05], key=lambda g: (sorted(x["nbars"] for x in g)[len(g) // 2], len(g)))
    med = sorted(x["nbars"] for x in g)[len(g) // 2]
    top = max(g, key=lambda x: (x["score"], -abs(x["nbars"] - med)))
    return g, "", top

def main_all(only=None, jobs=8):
    themes, works = mtd_index()
    if only: works = {k: v for k, v in works.items() if k[0] == only}
    print(len(themes), "themes,", len(works), "works; finding candidates", flush=True)
    titles = tsv_titles()
    cands = candidates(works, themes, titles)
    notes = {e: themes[e][1] for e in themes}
    mv = {e: theme_movement(themes[e][0], titles.get(e, "")) for e in themes}
    todo = [(k, v, cands[k], {e: notes[e] for e in v}, {e: mv[e] for e in v}) for k, v in works.items() if cands[k]]
    print(sum(len(v) for k, v in works.items() if not cands[k]), "themes have no candidate score;", len(todo), "works to search", flush=True)
    found = {}
    with ProcessPoolExecutor(jobs) as ex:
        for i, r in enumerate(ex.map(do_work, todo)):
            found.update(r)
            if i % 20 == 0: print(i, "/", len(todo), flush=True)
    out = {}
    for (comp, wid), ids in works.items():
        for edm in ids:
            f = found.get(edm, [])
            g, why, top = decide(f)
            if top is None:
                out[edm] = dict(complete=False, why="no candidate score" if not cands[(comp, wid)] else why); continue
            tw = re.sub(r"\s*\[.*?\]", "", top["tempo"]).strip().rstrip("."); met = re.findall(r"\[(.*?)\]", top["tempo"])
            out[edm] = dict(bar=top["bar"], tempoWord=tw, metronome=met[0] if met else "", score=top["file"], match=top["score"],
                            complete=g is not None, why=why, pickup=top["pickup"], startBar=top["startBar"], nbars=top["nbars"],
                            alsoAt=top["also"], agree=len({x["file"] for x in g}) if g else 1, sources=len({x["file"] for x in g}) if g else 0,
                            others=sorted({(x["file"], x["bar"], x["score"]) for x in f if x is not top})[:8])
    checked = json.load(open(os.path.join(HERE, "theme-sources/pdmx-checked.json")))
    for e, c in checked.items():
        out.setdefault(e, {}).update(bar=c["bar"], complete=True, why="checked", checked=c.get("note", ""))
        out[e]["sources"] = max(2, out[e].get("sources", 0))
    # order: a movement's themes come in the score in the order they are numbered ('... 3rd Movement - 2nd Theme'), so a
    # theme numbered 2 or later can't be at bar 1 or at/before an accepted earlier theme of the same movement
    for (comp, wid), ids in works.items():
        bym = defaultdict(list)
        for e in ids:
            tm = re.search(r"(\d+)(?:st|nd|rd|th) theme", norm(titles.get(e, "")))
            bym[mv.get(e)].append((int(tm.group(1)) if tm else 1, e))
        for lst in bym.values():
            last = 0
            for n, e in sorted(lst):
                v = out[e]
                if not v.get("complete"): continue
                if n > 1 and (v["bar"] <= 1 or v["bar"] <= last):
                    v["complete"] = False; v["why"] = "out of order (theme %d at bar %d)" % (n, v["bar"]); continue
                last = v["bar"]
    json.dump(out, open(OUT, "w"), indent=1, sort_keys=True)
    ok = sum(1 for v in out.values() if v["complete"])
    print("wrote", OUT, ":", ok, "of", len(out), "themes with an accepted bar")
    print(collections_counter(v.get("why", "") for v in out.values() if not v["complete"]))

def collections_counter(it):
    from collections import Counter
    return Counter(it).most_common()

if __name__ == "__main__" and "--all" in sys.argv:
    a = sys.argv
    main_all(a[a.index("--only") + 1] if "--only" in a else None, int(a[a.index("--jobs") + 1]) if "--jobs" in a else os.cpu_count())
    sys.exit(0)
