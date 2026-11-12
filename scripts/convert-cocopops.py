#!/usr/bin/env python3
"""Convert CoCoPops' Humdrum melody + harmony files into the Pop Themes' ABC sources (the CoCoPops and RS200 sets).

    python3 -I scripts/convert-cocopops.py [billboard|rolling-stone|both] [~/Projects/corpora/cocopops]
    EXPECT_OUT=f.json python3 -I scripts/convert-cocopops.py ...   # also writes each file's pitches and onsets for scripts/check-cocopops.mjs

Sources (untrusted data, only read as text; nothing in them is run):
  * CoCoPops Billboard part: 214 `.hum` files = McGill Billboard songs with a melodic transcription (CC BY-NC 4.0,
    Arthur & Condit-Schultz). -> scripts/theme-sources/cocopops/<id>.abc,   id = cc_<McGill id>_<n>
  * CoCoPops Rolling Stone part: 200 `.hum` = Temperley & de Clercq's RS200 corpus (CC BY 4.0) translated to Humdrum, with the
    sections Temperley supplied. Chosen over the original v2.1 `.mel` / `.har` files (scale-degree text, no section marks, harmony
    in Roman numerals) because it has the same melody and harmony in one file with absolute pitch spelling, absolute chord symbols
    (`**harte`) aligned to the melody row by row, and named sections; the original's `.mel` is used only as a cross-check
    (scripts/check-cocopops-source.py). -> scripts/theme-sources/rs200/<id>.abc,   id = rs_<RS rank>_<n>

What is read: the main vocal melody only (**kern spine whose `*Hstimme` is on; the first kern spine otherwise; the highest note of
a double stop). NO LYRICS (`**silbe`) are read, kept or shown. One ABC per distinct section (Label + Letter; the first occurrence
that has a melody; later repeats are counted in the file's header: `%%repeats`). Sections with fewer than 4 notes are skipped.
Chords: `**harte` (Harte syntax, absolute: B-:min7 -> Bbm7), written as ABC chord symbols at the exact beat of the chord change; a note
that the change falls inside is split with a tie so the symbol stands over a note starting there. RS: the analyst who also made the
melody (the `!T.d.C.` / `!D.T.` header). Pitch spelling is the source's (kern letters + # / -), key = the source's `*X:` (a dorian or
mixolydian tonic is written with the signature of its relative major and `%%mode`).
Rhythm: Billboard has real durations. RS has ONSETS ONLY (the corpus' step-sequence rhythm: a note lasts until the next onset, there are no
rests); here a note is cut at the end of its bar when the following bar has no onset at all (a rest), and a phrase's last note at the end
of its section; so RS note lengths are approximate.
Tempo: `Q:` from the source's timestamps (seconds per bar), the median over the section (the song's where that is far off).
Checks: scripts/check-cocopops.mjs (EXPECT_OUT) and scripts/check-cocopops-source.py (COUNTS_OUT). Writes scripts/theme-sources/cocopops-songs.json and rs200-songs.json.
A section is skipped, and listed, when it needs a tuplet the writer cannot fit, or has more than two different bar lengths.
L:1/8 throughout; triplets (3 / (3:2:n; beams by beat.
Prints what it could not convert.
"""
import csv, glob, json, os, re, sys
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))
PART = (sys.argv[1] if len(sys.argv) > 1 else "both")
ROOT = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else "~/Projects/corpora/cocopops")
OUTS = {"billboard": os.path.join(HERE, "theme-sources/cocopops"), "rolling-stone": os.path.join(HERE, "theme-sources/rs200")}

LETTERS = "CDEFGAB"; NAT = [0, 2, 4, 5, 7, 9, 11]
MAJOR_FIFTHS = {"Cb": -7, "Gb": -6, "Db": -5, "Ab": -4, "Eb": -3, "Bb": -2, "F": -1, "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7}
FIFTHS_MAJOR = {v: k for k, v in MAJOR_FIFTHS.items()}
MODE_OFFSET = {"dor": -2, "mix": -1}   # fifths of the signature relative to the tonic's major key
SECTION_NAMES = {"intro": "intro", "verse": "verse", "chorus": "chorus", "bridge": "bridge", "solo": "solo", "interl": "interlude",
                 "interlude": "interlude", "outro": "outro", "trans": "transition", "transition": "transition", "precho": "prechorus",
                 "prechorus": "prechorus", "postchorus": "postchorus", "fadeout": "outro", "fadeo": "outro", "instru": "instrumental",
                 "instrumental": "instrumental", "refrain": "chorus", "prever": "intro", "coda": "outro", "theme": "theme", "link": "interlude",
                 "break": "break", "build": "break", "tag": "outro", "chext": "chorus"}

def section_name(raw):
    """the page's section name for a source label (Verse, Precho, VP, Cha, b_verse, a2_trans...); a bare letter or an unknown one: unlabelled"""
    x = raw.lower().strip("_ ")
    x = re.sub(r"^[a-z]\d*_", "", x) if "_" in x else x
    x = re.sub(r"\d+$", "", x)
    if x in SECTION_NAMES: return SECTION_NAMES[x]
    return {"vp": "verse", "v": "verse", "vr": "verse", "vinst": "instrumental", "ch": "chorus", "cha": "chorus", "chb": "chorus", "chf": "chorus", "c": "unlabelled",
            "br": "bridge", "bp": "bridge", "md": "bridge", "p": "prechorus", "preverse": "intro", "prever": "intro"}.get(x, "unlabelled")

# ---------------------------------------------------------------- Humdrum reading
def recip(tok):
    """duration (whole notes) of a **recip prefix, None if the token has none"""
    m = re.match(r"\[?(\d+)(?:%(\d+))?(\.*)", tok)
    if not m or m.group(1) == "0": return None
    d = F(int(m.group(2)), int(m.group(1))) if m.group(2) else F(1, int(m.group(1)))
    x = d
    for _ in m.group(3): x /= 2; d += x
    return d

def parse_pitch(tok):
    """(letter, alter, octave, midi) of a kern pitch (c = C4, cc = C5, C = C3), None for a rest"""
    if "r" in tok: return None
    m = re.search(r"([a-gA-G])\1*", tok)
    if not m: return None
    run = m.group(0); l = run[0]; n = len(run)
    acc = re.match(r"[#\-n]*", tok[m.end():]).group(0)
    octv = 4 + (n - 1) if l.islower() else 3 - (n - 1)
    alt = acc.count("#") - acc.count("-")
    letter = l.upper()
    return letter, alt, octv, 12 * (octv + 1) + NAT[LETTERS.index(letter)] + alt

def read_hum(path):
    """The file as events: chords [(time, harte)], notes per kern spine, bars, sections, keys, meters, timestamps, refs."""
    lines = open(path, encoding="utf-8").read().split("\n")
    refs = {}; cols = None; t = F(0); rem = {}; tb = None
    kern = []; hartes = []; stamp = None
    chords = {}; notes = {}; bars = []; secs = []; keys = []; meters = []; hstate = {}; stimme = []; tstamps = []
    analysts = None
    rs = False
    for ln in lines:
        if not ln: continue
        if ln.startswith("!!!"):
            m = re.match(r"!!!(\S+?):\s*(.*)", ln)
            if m: refs[m.group(1)] = m.group(2)
            continue
        if ln.startswith("!!"): continue
        if ln.startswith("**"):
            cols = ln.split("\t")
            kern = [i for i, c in enumerate(cols) if c == "**kern"]
            hartes = [i for i, c in enumerate(cols) if c == "**harte"]
            stamp = cols.index("**timestamp") if "**timestamp" in cols else None
            rs = "**silbe" in cols and "**phrase" not in cols
            for k in kern: notes[k] = []; hstate[k] = False
            continue
        if cols is None: continue
        p = ln.split("\t")
        if ln.startswith("!"):
            if analysts is None and any(x not in ("!", "") for x in p): analysts = p
            continue
        if len(p) != len(cols): continue
        if ln.startswith("="):
            bars.append((t, p[0])); continue
        if ln.startswith("*"):
            for i, x in enumerate(p):
                if x.startswith("*tb"):
                    m = re.match(r"\*tb(\d+)(?:%(\d+))?(\.*)", x)
                    tb = recip(x[3:]) if m else tb
                elif x.startswith("*>"):
                    secs.append((t, x[2:], i))
                elif x.startswith("*M") and re.match(r"\*M\d+/\d+$", x): meters.append((t, x[2:], i))
                elif re.match(r"\*[A-Ga-g][#\-]?:", x): keys.append((t, x[1:-1] if x.endswith(":") else x[1:], i))
                elif x in ("*Hstimme",) and i in hstate: hstate[i] = True; stimme.append((t, i, True))
                elif x in ("*Nstimme", "*]stimme") and i in hstate: hstate[i] = False; stimme.append((t, i, False))
            continue
        # data line: set the durations of the spines that start a token here
        if tb is not None:   # RS: one row = one timebase unit
            dur = tb
        else:
            for c in [0] + kern:
                tok = p[c]
                if tok != "." and not re.search(r"[qQ]", tok):   # q / Q: a grace note, no time of its own
                    d = recip(tok)
                    if d is not None: rem[c] = d
            act = [rem[c] for c in rem if rem[c] > 0]
            grace_row = any(re.search(r"[qQ]", p[k]) for k in kern) and all(p[c] == "." or re.search(r"[qQ]", p[c]) for c in [0] + kern)
            dur = F(0) if grace_row else (min(act) if act else F(0))
        # chords and notes starting on this row
        if stamp is not None and p[stamp] not in (".", ""):
            try: tstamps.append((t, float(p[stamp])))
            except ValueError: pass
        for hc in hartes:
            if p[hc] != ".": chords.setdefault(hc, []).append((t, p[hc]))
        for k in kern:
            tok = p[k]
            if tok == ".": continue
            notes[k].append((t, tok, dur if tb is not None else (F(0) if re.search(r"[qQ]", tok) else recip(tok))))
        if tb is None:
            for c in list(rem):
                rem[c] -= dur
                if rem[c] <= 0: del rem[c]
        t += dur
    return dict(refs=refs, chords=chords, notes=notes, bars=bars, secs=secs, keys=keys, meters=meters, stimme=stimme, end=t,
                tstamps=tstamps, analysts=analysts, tb=tb, rs=rs, kern=kern, hartes=hartes)

# ---------------------------------------------------------------- the main melody
def lead_notes(song, stats):
    """[{t, dur, letter, alt, octv, midi}] of the main vocal line, ties joined (a tied note is one note). Graces dropped."""
    kern = song["kern"]
    if not kern: return []
    notes = []
    rs = song["tb"] is not None
    # H state of each spine over time (RS: one spine, always)
    def hon(k, t):
        ev = [e for e in song["stimme"] if e[1] == k and e[0] <= t]
        return ev[-1][2] if ev else False
    any_h = any(e[2] for e in song["stimme"])
    for si, k in enumerate(kern):
        chain = None
        for (t, tok, dur) in song["notes"][k]:
            if re.search(r"[qQ]", tok):
                stats["graces"] = stats.get("graces", 0) + 1; continue
            pieces = [p for p in tok.split(" ") if p]
            ps = [(parse_pitch(p), p) for p in pieces]
            ps = [x for x in ps if x[0]]
            if not ps:   # a rest ends any tie
                chain = None; continue
            if len(ps) > 1: stats["doublestops"] = stats.get("doublestops", 0) + 1
            (letter, alt, octv, midi), piece = max(ps, key=lambda x: x[0][3])
            use = True if (rs or len(kern) == 1) else hon(k, t) if any_h else si == 0   # a file with one melody spine: all of it
            tie_cont = ("]" in piece or "_" in piece.replace("__", "")) and chain is not None and chain["midi"] == midi and chain["end"] == t
            if tie_cont and not use: chain = None; continue
            if tie_cont and chain is not None:
                chain["dur"] += dur; chain["end"] = t + dur
                if "]" in piece: chain = None
                continue
            if not use: chain = None; continue
            n = dict(t=t, dur=dur, letter=letter, alt=alt, octv=octv, midi=midi, end=t + dur, spine=si)
            notes.append(n)
            chain = n if "[" in piece else None
    notes.sort(key=lambda n: (n["t"], n["spine"]))
    out = []
    for n in notes:   # one note at a time: the lowest spine wins a shared onset, a later onset cuts the note before it
        if out and out[-1]["t"] == n["t"]: stats["dup_onset"] = stats.get("dup_onset", 0) + 1; continue
        if out and out[-1]["t"] + out[-1]["dur"] > n["t"]:
            out[-1]["dur"] = n["t"] - out[-1]["t"]; stats["cut"] = stats.get("cut", 0) + 1
        out.append(n)
    if rs:   # onsets only: a note lasts until the next onset, but ends at the barline before an onset-free bar
        bt = [b[0] for b in song["bars"]] + [song["end"]]
        def bar_end(t): return min([x for x in bt if x > t] or [song["end"]])
        for i, n in enumerate(out):
            nxt = out[i + 1]["t"] if i + 1 < len(out) else song["end"]
            e = bar_end(n["t"])
            if nxt > e and nxt >= bar_end(e): nxt = e   # the bar after is empty: the note stops at the barline
            n["dur"] = nxt - n["t"]
    out = [n for n in out if n["dur"] > 0]
    return out

# ---------------------------------------------------------------- chords (Harte -> chord symbols)
QUAL = {"maj": "", "min": "m", "dim": "dim", "aug": "+", "maj7": "maj7", "min7": "m7", "7": "7", "dim7": "dim7", "hdim7": "m7b5",
        "minmaj7": "m(maj7)", "maj6": "6", "min6": "m6", "9": "9", "maj9": "maj9", "min9": "m9", "sus4": "sus4", "sus2": "sus2",
        "11": "11", "13": "13", "min11": "m11", "min13": "m13", "maj11": "maj11", "maj13": "maj13", "5": "5", "1": "", "": ""}
def note_name(s):
    m = re.match(r"([A-G])([#\-b]*)$", s)
    return m.group(1) + m.group(2).replace("-", "b") if m else None
def bass_name(root, ivl):
    m = re.match(r"([b#]*)(\d+)$", ivl)
    if not m: return None
    steps = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 9: 1, 11: 3, 13: 5}.get(int(m.group(2)))
    semis = {1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9}[int(m.group(2))] + m.group(1).count("#") - m.group(1).count("b")
    r = re.match(r"([A-G])([#\-b]*)", root); rl = LETTERS.index(r.group(1)); ra = r.group(2).count("#") - r.group(2).count("-") - r.group(2).count("b")
    bl = (rl + steps) % 7
    pc = (NAT[rl] + ra + semis) % 12
    alt = ((pc - NAT[bl] + 6) % 12) - 6
    return LETTERS[bl] + ("#" * alt if alt > 0 else "b" * -alt)
def harte(tok, stats):
    """Harte chord label (G:min7/b7, B-:maj, N) -> chord symbol, None for no chord"""
    if tok in ("N", ".", "X", ""): return None
    m = re.match(r"([A-G][#\-b]*)(?::([^/(]*))?(\([^)]*\))?(?:/(\S+))?$", tok)
    if not m: stats["chord_unparsed"] = stats.get("chord_unparsed", 0) + 1; return None
    root = note_name(m.group(1)); q = m.group(2) or "maj"
    if q not in QUAL: stats["chord_quality:" + q] = stats.get("chord_quality:" + q, 0) + 1
    sym = root + QUAL.get(q, q)
    if m.group(3): sym += m.group(3).replace(",", "")   # (b9), (#11): kept as written
    if m.group(4):
        b = bass_name(m.group(1), m.group(4)); 
        if b and b != root: sym += "/" + b
    return sym

# ---------------------------------------------------------------- keys
def key_info(raw):
    """humdrum key interpretation (G / e / E- / e:dor without the colon) -> (K: text, fifths of the signature, minor, mode directive or None)"""
    m = re.match(r"([A-Ga-g])([#\-]*)(?:[:]?)([a-z#0-9]*)", raw)
    tonic_l = m.group(1).upper(); alt = m.group(2).count("#") - m.group(2).count("-"); minor = m.group(1).islower(); mode = m.group(3)
    base = {"F": -1, "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5}[tonic_l] + 7 * alt
    sigf = base + (-3 if minor and mode not in MODE_OFFSET else 0) + MODE_OFFSET.get(mode, 0)   # (g:dor is G dorian: the lower case is not "minor" as well)
    if mode in MODE_OFFSET: minor = False
    tn = tonic_l + ("#" * alt if alt > 0 else "b" * -alt)
    wrapped = sigf > 7 or sigf < -7   # more than 7 accidentals (Db minor): written a semitone-enharmonic key up, the notes respelled
    while sigf > 7: sigf -= 12
    while sigf < -7: sigf += 12
    major_name = FIFTHS_MAJOR[sigf]
    if mode in MODE_OFFSET:
        return major_name, sigf, False, "%s %s" % (tn, {"dor": "dorian", "mix": "mixolydian"}[mode]), wrapped
    if minor:
        rel = FIFTHS_MAJOR[sigf]; mn = {"C": "Am", "G": "Em", "D": "Bm", "A": "F#m", "E": "C#m", "B": "G#m", "F#": "D#m", "C#": "A#m", "F": "Dm", "Bb": "Gm", "Eb": "Cm", "Ab": "Fm", "Db": "Bbm", "Gb": "Ebm", "Cb": "Abm"}[rel]
        return mn, sigf, True, None, wrapped
    return major_name, sigf, False, None, wrapped

IVL = {0: (0, 0), 1: (1, 1), 2: (1, 2), 3: (2, 3), 4: (2, 4), 5: (3, 5), 6: (3, 6), 7: (4, 7), 8: (5, 8), 9: (5, 9), 10: (6, 10), 11: (6, 11)}
def respell_pc(pc, tonic, minor):
    """(letter, alteration) of a pitch class, spelled by its interval above the tonic (so Db minor's notes become C# minor's)"""
    tl = tonic[0]; tpc = (NAT[LETTERS.index(tl)] + tonic.count("#") - tonic.count("b")) % 12
    iv = (pc - tpc) % 12; steps, semis = IVL[iv]
    if minor and iv == 6: steps = 4
    li = (LETTERS.index(tl) + steps) % 7; alt = ((pc - NAT[li] + 6) % 12) - 6
    if abs(alt) > 1:
        for l2 in ((li + 1) % 7, (li - 1) % 7):
            a2 = ((pc - NAT[l2] + 6) % 12) - 6
            if abs(a2) <= 1: li, alt = l2, a2; break
    return LETTERS[li], alt
def respell_label(lab, tonic, minor):
    def one(name):
        m = re.match(r"([A-G])(#{1,2}|b{1,2})?$", name); pc = (NAT[LETTERS.index(m.group(1))] + (m.group(2) or "").count("#") - (m.group(2) or "").count("b")) % 12
        l, a = respell_pc(pc, tonic, minor); return l + ("#" * a if a > 0 else "b" * -a)
    m = re.match(r"([A-G](?:#{1,2}|b{1,2})?)(.*?)(?:/([A-G](?:#{1,2}|b{1,2})?))?$", lab)
    return one(m.group(1)) + m.group(2) + ("/" + one(m.group(3)) if m.group(3) else "")

def key_sig(f):
    order = "FCGDAEB"; sig = {}
    if f > 0:
        for l in order[:f]: sig[l] = 1
    if f < 0:
        for l in order[::-1][:-f]: sig[l] = -1
    return sig

def minor_by_chords(kraw, tokens):
    """The source gives a tonic only (RS200's corpus: no mode). A major key whose tonic chord is mostly minor (Billie Jean in G) is minor."""
    m = re.match(r"([A-G])([#\-]*)", kraw)
    tpc = (NAT[LETTERS.index(m.group(1))] + m.group(2).count("#") - m.group(2).count("-")) % 12
    mi = ma = 0
    for tok in tokens:
        c = re.match(r"([A-G])([#\-b]*):(\S*)", tok)
        if not c: continue
        pc = (NAT[LETTERS.index(c.group(1))] + c.group(2).count("#") - c.group(2).count("-") - c.group(2).count("b")) % 12
        if pc != tpc: continue
        if c.group(3).startswith(("min", "hdim", "dim")): mi += 1
        else: ma += 1
    return mi >= 4 and mi > 1.5 * ma

# ---------------------------------------------------------------- sections
class Unsupported(Exception): pass
COUNTS = {}   # file -> notes in the main melody (before sections), for scripts/check-cocopops-source.py

def sections_of(song):
    by_t = {}
    for t, x, col in song["secs"]:
        if col != 0: continue
        d = by_t.setdefault(t, {}); name = x.split(">")[-1]
        if x.startswith("Letter>"): d["letter"] = name
        else: d["label"] = name
    ts = sorted(by_t)
    out = []
    for i, t in enumerate(ts):
        d = by_t[t]; end = ts[i + 1] if i + 1 < len(ts) else song["end"]
        out.append(dict(start=t, end=end, label=d.get("label", d.get("letter", "")), letter=d.get("letter", "")))
    return out

def at(events, t, col=0, default=None):
    """last (time, value, col) event at or before t, in the first column that has any"""
    best = default
    for e in events:
        if e[0] <= t and e[2] == col: best = e[1]
    return best

# ---------------------------------------------------------------- ABC
STD = sorted({F(1, 2 ** k) * m for k in range(0, 7) for m in (1, F(3, 2), F(7, 4))}, reverse=True)

def binary(x):
    d = x.denominator
    return d & (d - 1) == 0

def lentok(d, unit=F(1, 8)):
    r = d / unit
    n, m = r.numerator, r.denominator
    if m == 1: return "" if n == 1 else str(n)
    if n == 1: return "/" if m == 2 else "/" + str(m)
    return "%d/%d" % (n, m)

def beat_of(n, d): return F(3, 8) if (d == 8 and n % 3 == 0 and n > 3) else F(1, 4)

def decompose_std(a, b):
    """cut [a, b) (offsets in the bar) into standard written lengths, longest first"""
    out = []
    while a < b:
        for s in STD:
            if s <= b - a: out.append((a, a + s)); a += s; break
        else: raise Unsupported("length %s" % (b - a))
    return out

def decompose_rest(a, b, n, d, whole_ok=True):
    out = []; beat = beat_of(n, d); bar = F(n, d)
    if a == 0 and b == bar and bar <= 2 and whole_ok: return [(a, b)]   # (a whole-bar rest is not used in a section with a meter change: abcjs times it by the first meter)
    while a < b:
        rem = b - a
        if beat == F(3, 8) and (a % F(1, 8) == 0) and rem % F(1, 8) == 0:
            if a % beat == 0 and rem >= F(3, 4) and a % F(3, 4) == 0: L = F(3, 4)
            elif a % beat == 0 and rem >= beat: L = beat
            elif a % beat == 0 and rem >= F(1, 4): L = F(1, 4)
            else: L = F(1, 8)
        else:
            L = F(1)
            while L > rem or a % L != 0 or (not whole_ok and L >= bar): L /= 2
            if L < F(1, 64): raise Unsupported("rest %s" % rem)
        out.append((a, a + L)); a += L
    return out

def render_bars(bars, ctx):
    """bars: [{s, e, n, d, key, events:[(s, e, note|None, tie_in, tie_out)]}] -> text per bar, and the expected notes"""
    text = []
    cur_acc = {}
    chords = ctx["chords"]; chord_done = set()
    for bi, bar in enumerate(bars):
        n, d = bar["n"], bar["d"]; bs = bar.get("g", bar["s"]); bl = bar["e"] - bar["s"]
        sig = key_sig(bar["fifths"]); acc = {}
        beat = beat_of(n, d)
        cuts = sorted({c for c, _ in chords if bar["s"] < c < bar["e"]})
        pcs = []   # [a, b, note|None, tie_in, tie_out]  (offsets in the bar)
        for (s, e, note, tin, tout) in bar["events"]:
            pts = [s] + [c for c in cuts if s < c < e] + [e]
            for j, (x, y) in enumerate(zip(pts, pts[1:])):
                pcs.append([x - bs, y - bs, note, tin if j == 0 else True, tout if j == len(pts) - 2 else True])
        # frames, straight rules
        out = []; i = 0
        while i < len(pcs):
            p = pcs[i]
            if binary(p[0]) and binary(p[1]):
                a, b = p[0], p[1]; segs = [(a, b)]
                if p[2] is not None:
                    cutp = []
                    if (n, d) == (4, 4) and a != 0 and a < F(1, 2) < b: cutp.append(F(1, 2))
                    if (n, d) == (12, 8) and a != 0 and a < F(3, 4) < b: cutp.append(F(3, 4))
                    if beat == F(3, 8) and a % beat != 0:
                        nb = (a // beat + 1) * beat
                        if nb < b: cutp.append(nb)
                    pts = [a] + sorted(set(cutp)) + [b]; segs = list(zip(pts, pts[1:]))
                    segs = [z for sg in segs for z in ([sg] if (sg[1] - sg[0]) in STD else decompose_std(*sg))]
                else:
                    segs = decompose_rest(a, b, n, d, ctx["whole_rest"])
                for j, (x, y) in enumerate(segs):
                    out.append(dict(a=x, b=y, note=p[2], tin=p[3] if j == 0 else True, tout=p[4] if j == len(segs) - 1 else True, frame=None))
                i += 1; continue
            x = p[0] if not binary(p[0]) else p[1]
            found = None
            for Fz, strict in ((F(1, 2), True), (F(1, 4), False), (F(1, 8), False)):
                fs = (x // Fz) * Fz; u = Fz / 3
                grp = [q for q in pcs[i:] if q[0] < fs + Fz and q[1] > fs]
                if strict and (grp[0][0] < fs or grp[-1][1] > fs + Fz): continue
                bds = {c for q in grp for c in (q[0], q[1]) if fs < c < fs + Fz}
                if all((c - fs) % u == 0 for c in bds): found = (fs, Fz); break
            if not found: raise Unsupported("tuplet at %s: %s" % (p[0], [(str(q[0]), str(q[1])) for q in pcs[i:i + 4]]))
            fs, Fz = found
            # cut the pieces that run in from before or out past the frame (tied)
            def split(j, c):
                q = pcs[j]; pcs[j:j + 1] = [[q[0], c, q[2], q[3], True], [c, q[1], q[2], True, q[4]]]
            if pcs[i][0] < fs: split(i, fs); continue
            j = i
            while j < len(pcs) and pcs[j][0] < fs + Fz:
                if pcs[j][1] > fs + Fz: split(j, fs + Fz)
                j += 1
            grp = [q for q in pcs[i:j] if q[0] < fs + Fz]
            fid = (bi, fs)
            for q in grp:
                out.append(dict(a=q[0], b=q[1], note=q[2], tin=q[3], tout=q[4], frame=(fid, len(grp))))
            i += len(grp)
        if sum(x["b"] - x["a"] for x in out) != bl or out[0]["a"] != bar["s"] - bs: raise Unsupported("bar does not add up")
        # tokens
        toks = []; first_in_frame = set()
        for k, x in enumerate(out):
            nt = x["note"]
            dur = x["b"] - x["a"]
            nom = dur * F(3, 2) if x["frame"] else dur
            tail = lentok(nom)
            ch = ""
            for c, lab in chords:
                if bs + x["a"] == c and (bi, c) not in chord_done:
                    ch = '"%s"' % lab; chord_done.add((bi, c))
            if nt is None: tok = ch + "z" + tail
            else:
                l, alt, o = nt["letter"], nt["alt"], nt["octv"]
                cur = acc.get((l, o), sig.get(l, 0)); cur2 = acc.get(l, sig.get(l, 0))
                a_ = ""
                if cur != alt or cur2 != alt or (x["tin"] and k == 0 and alt != sig.get(l, 0) and bi > 0): a_ = {0: "=", 1: "^", 2: "^^", -1: "_", -2: "__"}[alt]
                acc[(l, o)] = alt; acc[l] = alt
                lt = l if o <= 4 else l.lower()
                marks = "," * max(0, 4 - o) if o < 4 else "'" * max(0, o - 5)
                tok = ch + a_ + lt + marks + tail + ("-" if x["tout"] else "")
            x["tok"] = tok; x["nom"] = nom
        # beams: pitched notes under a quarter (a beat in compound meters) join within their beat; a triplet frame joins as a whole
        half = None
        if (n, d) == (4, 4):
            half = {}
            for lo, hi in ((F(0), F(1, 2)), (F(1, 2), F(1))):
                grp = [x for x in out if lo <= x["a"] < hi]
                if len(grp) == 4 and all(x["note"] is not None and x["b"] - x["a"] == F(1, 8) and not x["frame"] for x in grp): half[lo] = hi
        s_ = ""
        for k, x in enumerate(out):
            if k:
                pv = out[k - 1]
                bm = lambda y: y["note"] is not None and y["nom"] < F(1, 4)
                if x["frame"] and pv["frame"] and x["frame"][0] == pv["frame"][0]:
                    join = all(bm(y) for y in out if y["frame"] and y["frame"][0] == x["frame"][0])
                else:
                    kx = x["a"] // beat; kp = pv["a"] // beat
                    hx = [lo for lo in (half or {}) if lo <= x["a"] < half[lo]]; hp = [lo for lo in (half or {}) if lo <= pv["a"] < half[lo]]
                    join = bm(x) and bm(pv) and not x["frame"] and not pv["frame"] and (kx == kp or (hx and hx == hp))
                if not join: s_ += " "
            if x["frame"] and (k == 0 or not out[k - 1]["frame"] or out[k - 1]["frame"][0] != x["frame"][0]):
                head = "(3:2:%d" % x["frame"][1]
                # a chord symbol goes before the tuplet mark
                m = re.match(r'("[^"]*")?(.*)$', x["tok"]); x["tok"] = (m.group(1) or "") + head + m.group(2)
            s_ += x["tok"]
        text.append((bar, s_))
    return text

def build_abc(head, bars, ctx):
    text = render_bars(bars, ctx)
    body = []; buf = []; cm = None; ck = None
    hdr_m = ctx["meter"]
    for i, (bar, s) in enumerate(text):
        tag = ""
        m = (bar["n"], bar["d"])
        if bar.get("pickup"): pass
        elif m != cm and not (cm is None and m == hdr_m): tag += "[M:%d/%d] " % m
        if not bar.get("pickup"): cm = m
        if ck is not None and bar["ktext"] != ck: tag += "[K:%s] " % bar["ktext"]
        ck = bar["ktext"]
        buf.append(tag + s)
        if len(buf) == 4: body.append(" | ".join(buf) + " |"); buf = []
    if buf: body.append(" | ".join(buf) + " |")
    body[-1] = body[-1][:-1] + "]"
    return "\n".join(head + body) + "\n"

# ---------------------------------------------------------------- one song
def tempo_of(song, a, b):
    """quarter notes a minute from the source's timestamps: the median over the section's bar pairs; the song's median where the section's is
    far off (a timestamp slip) or there are too few"""
    def med(pts):
        sl = [240.0 * float(t1 - t0) / (s1 - s0) for (t0, s0), (t1, s1) in zip(pts, pts[1:]) if t1 - t0 >= F(1, 2) and s1 > s0]
        sl.sort(); return sl[len(sl) // 2] if sl else None
    whole = med(song["tstamps"]); sec = med([(t, s) for t, s in song["tstamps"] if a - F(1, 1) <= t <= b + F(1, 1)])
    q = sec if sec and (not whole or 0.65 * whole <= sec <= 1.5 * whole) else whole
    return int(round(q)) if q else None

def process_song(song, meta, outdir, stats, expected, prefix, label_map):
    notes = lead_notes(song, stats)
    if os.environ.get("COUNTS_OUT"): COUNTS[prefix + "/" + meta["file"]] = len(notes)
    if not notes: stats["no_melody"] = stats.get("no_melody", []) + [meta["file"]]; return []
    secs = sections_of(song)
    if not secs: stats["no_sections"] = stats.get("no_sections", 0) + 1; return []
    bt = sorted({b[0] for b in song["bars"]})
    # chords: the analyst who made the melody (RS), the only one (Billboard)
    hc = song["hartes"][0]
    if len(song["hartes"]) > 1 and song["analysts"]:
        for c in song["hartes"]:
            if song["analysts"][c - 1] == song["analysts"][song["kern"][0]]: hc = c; break
    chord_events = [(t, harte(tok, stats)) for t, tok in song["chords"].get(hc, [])]
    last_at = {}
    for t, lab in chord_events: last_at[t] = lab   # two chords on one time point: the later one
    chord_events = sorted(last_at.items(), key=lambda x: x[0])
    per = []
    for sc in secs:
        per.append([n for n in notes if sc["start"] <= n["t"] < sc["end"]])
    # a pickup sitting in the last bar of the section before is the lead-in of this one
    pick = [None] * len(secs)
    for k in range(1, len(secs)):
        if len(per[k]) < 4 or not per[k - 1]: continue
        st = secs[k]["start"]
        if abs(per[k][0]["t"] - st) > F(1, 16): continue
        lastbar = max([b for b in bt if b < st] or [secs[k - 1]["start"]])
        tail = [n for n in per[k - 1] if n["t"] >= lastbar and n["t"] + n["dur"] <= st]
        L = st - lastbar; best = 0
        for j in range(1, len(tail) + 1):
            suf = tail[-j:]; before = per[k - 1][per[k - 1].index(suf[0]) - 1]["t"] + per[k - 1][per[k - 1].index(suf[0]) - 1]["dur"] if per[k - 1].index(suf[0]) > 0 else lastbar
            if suf[0]["t"] - max(before, lastbar) >= F(1, 8) and st - suf[0]["t"] <= L / 2 and abs(suf[-1]["t"] + suf[-1]["dur"] - st) <= F(1, 16): best = j
        if best:
            pick[k] = tail[-best:]; per[k - 1] = [n for n in per[k - 1] if n not in pick[k]]; stats["pickups_moved"] = stats.get("pickups_moved", 0) + 1
    # distinct sections: the first of each (label, letter) with a melody
    seen = {}; reps = {}
    for k, sc in enumerate(secs):
        key = (sc["label"], sc["letter"])
        if len(per[k]) >= 4: reps[key] = reps.get(key, 0) + 1
    written = []
    for k, sc in enumerate(secs):
        key = (sc["label"], sc["letter"])
        if len(per[k]) < 4: stats["sections_short"] = stats.get("sections_short", 0) + 1; continue
        if key in seen: stats["sections_repeat"] = stats.get("sections_repeat", 0) + 1; continue
        seen[key] = 1
        try:
            abc, exp = section_abc(song, meta, sc, per[k], pick[k], bt, chord_events, stats, prefix, len(written) + 1, reps[key], label_map, [tok for _, tok in song["chords"].get(hc, [])])
        except Unsupported as ex:
            stats["unsupported"] = stats.get("unsupported", []) + [(meta["id"], sc["label"], str(ex))]; continue
        sid = "%s_%s_%d" % (prefix, meta["id"], len(written) + 1)
        open(os.path.join(outdir, sid + ".abc"), "w", encoding="utf-8").write(abc)
        expected[sid] = exp; written.append(sid)
    return written

def section_abc(song, meta, sc, notes, pickup, bt, chord_events, stats, prefix, num, reps, label_map, song_chords):
    keyfrom = None; respell = None
    start, end = sc["start"], sc["end"]
    allnotes = (pickup or []) + notes
    for n in allnotes: n["end"] = min(n["t"] + n["dur"], end)
    first = allnotes[0]["t"]
    # bar boundaries
    bnds = [start] + [b for b in bt if start < b < end] + [end]
    bars = []
    for a, b in zip(bnds, bnds[1:]):
        bars.append(dict(s=a, e=b))
    # leading bars with no note are dropped; a first note in the second half of its bar (or a moved pickup) leaves a pickup
    while len(bars) > 1 and bars[0]["e"] <= first: bars.pop(0)
    # last note
    last_end = max(n["end"] for n in allnotes)
    while len(bars) > 1 and bars[-1]["s"] >= last_end: bars.pop()
    def meter_at(t):
        m = at(song["meters"], t) or next((x[1] for x in song["meters"]), None)
        if not m: raise Unsupported("no meter")
        n, d = map(int, m.split("/")); return n, d
    if pickup:
        bars.insert(0, dict(s=first, e=bars[0]["s"], pickup=True))
        bars[0]["s"] = first
    else:
        b0 = bars[0]; L = b0["e"] - b0["s"]
        if first - b0["s"] >= L / 2 and first > b0["s"]:
            b0["s"] = first; b0["pickup"] = True
    if bars[-1]["e"] > last_end and last_end > bars[-1]["s"]:
        trimmed = bars[-1]["e"] - last_end; bars[-1]["e"] = last_end; bars[-1]["trim"] = True
    for i, bar in enumerate(bars):
        ts = bar["s"] if not bar.get("pickup") else bar["e"]
        n, d = meter_at(ts if not bar.get("pickup") else bar["e"])
        length = bar["e"] - bar["s"]
        if (not bar.get("pickup") and not bar.get("trim") and length != F(n, d)) or length > F(n, d):
            if length > 2: raise Unsupported("bar of %s" % length)
            for dd in (d, 4, 8, 16):
                if (length * dd).denominator == 1: n, d = int((length * dd)), dd; break
            else: raise Unsupported("bar of %s" % length)
            stats["odd_bars"] = stats.get("odd_bars", 0) + 1
        bar["n"], bar["d"] = n, d
        if bar.get("pickup"): bar["g"] = bar["e"] - F(n, d)
        kcol = song["kern"][0] if any(k[2] == song["kern"][0] for k in song["keys"]) else 0   # the melody's own key tag (it carries the mode: *E:mix, *e:dor)
        kraw = at(song["keys"], bar["s"] if not bar.get("pickup") else bar["e"], kcol) or at(song["keys"], F(10 ** 6), kcol)
        if kraw is None: raise Unsupported("no key")
        if i == 0:
            sec_key = key_info(kraw)
            if not sec_key[2] and not sec_key[3] and minor_by_chords(kraw, song_chords):
                k2 = key_info(kraw[0].lower() + kraw[1:])
                if not k2[4]: sec_key = k2; keyfrom = "chords"   # (not into a key of more than 7 accidentals)
            if sec_key[4]:   # Db minor: C# minor, notes and chords respelled
                respell = (sec_key[0].rstrip("m"), sec_key[2]); stats["keys_respelled"] = stats.get("keys_respelled", 0) + 1
                for nn in allnotes:
                    nn["letter"], nn["alt"] = respell_pc(nn["midi"] % 12, respell[0], respell[1])
                    nn["octv"] = (nn["midi"] - nn["alt"]) // 12 - 1
        elif key_info(kraw)[0] != sec_key[0]: stats["key_changes_spelled_out"] = stats.get("key_changes_spelled_out", 0) + 1
        ktext, fifths, minor, mode = sec_key[:4]   # one signature for the section (a later key change is spelled with accidentals)
        bar["ktext"], bar["fifths"], bar["mode"], bar["minor"] = ktext, fifths, mode, minor
    # events
    for bar in bars:
        evs = []; t = bar["s"]
        for nn in allnotes:
            if nn["end"] <= bar["s"] or nn["t"] >= bar["e"]: continue
            s0, e0 = max(nn["t"], bar["s"]), min(nn["end"], bar["e"])
            if s0 > t: evs.append((t, s0, None, False, False))
            evs.append((s0, e0, nn, nn["t"] < bar["s"], nn["end"] > bar["e"]))
            t = e0
        if t < bar["e"]: evs.append((t, bar["e"], None, False, False))
        bar["events"] = evs
    if len({(b["n"], b["d"]) for b in bars if not b.get("pickup") and not b.get("trim")}) > 2: raise Unsupported("irregular bar lengths")
    hdr = next((b for b in bars if not b.get("pickup") and not b.get("trim")), bars[0])
    # chords: the one sounding at the first note, then each change to the end of the last bar
    ch = []; t0 = bars[0]["s"]; prev = None
    cur = None
    for t, lab in chord_events:
        if t <= t0: cur = lab
    if cur: ch.append((t0, cur)); prev = cur
    for t, lab in chord_events:
        if t0 < t < bars[-1]["e"]:
            if lab is None: prev = None; continue
            if lab != prev: ch.append((t, lab)); prev = lab
    if respell: ch = [(t, respell_label(lab, *respell)) for t, lab in ch]
    ctx = dict(chords=ch, meter=(hdr["n"], hdr["d"]), whole_rest=len({(b["n"], b["d"]) for b in bars}) == 1)
    # sanity: chords and notes in the section
    q = tempo_of(song, start, end) or 100
    label = section_name(sc["label"])
    title = meta["title"]
    k0 = bars[0]
    head = ["X:1", "T:%s (%s)" % (title, label), "C:%s, %s" % (meta["artist"], meta["year"]),
            "%%%%%s %s_%s_%d" % (prefix == "cc" and "cocopops" or "rs200", prefix, meta["id"], num),
            "%%%%artist %s" % meta["artist"], "%%%%year %s" % meta["year"], "%%%%section %s" % label,
            "%%%%label %s%s" % (sc["label"], " (letter %s)" % sc["letter"] if sc["letter"] else ""), "%%%%repeats %d" % reps]
    head += meta["extra"]
    if keyfrom: head.append("%%%%keyfrom %s" % keyfrom)
    if k0["mode"]: head.append("%%%%mode %s" % k0["mode"])
    head += ["%% %s: section from bar-time %s to %s; chords from %s; %d notes" % (meta["src"], start, end, "**harte", len(allnotes)),
             "M:%d/%d" % (hdr["n"], hdr["d"]), "L:1/8", "Q:1/4=%d" % q, "K:" + k0["ktext"]]
    abc = build_abc(head, bars, ctx)
    exp = dict(notes=[[n["midi"], float((n["t"] - first) * 4)] for n in allnotes],
               chords=[[float((t - first) * 4), lab] for t, lab in ch if t < bars[-1]["e"]])
    return abc, exp

# ---------------------------------------------------------------- the two parts
def tsv(path):
    return list(csv.DictReader(open(path, encoding="utf-8"), delimiter="\t"))

def main():
    parts = ["billboard", "rolling-stone"] if PART == "both" else [PART]
    expected = {}; total = {}
    site_ids = set()
    ip = os.path.join(HERE, "..", "apps/shared/data/billboard/index.json")
    if os.path.exists(ip): site_ids = {str(x["id"]) for x in json.load(open(ip))}
    for part in parts:
        out = OUTS[part]; os.makedirs(out, exist_ok=True)
        for f in glob.glob(out + "/*.abc"): os.remove(f)
        stats = {}; nsongs = 0; nfiles = 0; withsec = 0; index = {}
        if part == "billboard":
            sample = {r["Filename"]: r for r in tsv(ROOT + "/Billboard/Billboard_Sample.tsv")}
            files = sorted(f for f in glob.glob(ROOT + "/Billboard/Data/*.hum"))
            prefix = "cc"
        else:
            sample = {r["Filename"]: r for r in tsv(ROOT + "/RollingStone/RollingStone_Sample.tsv")}
            files = sorted(glob.glob(ROOT + "/RollingStone/Data/*.hum"))
            prefix = "rs"
        for f in files:
            base = re.sub(r"\.(varms\.|lyrics\.)?hum$", "", os.path.basename(f))
            row = sample.get(base) or sample.get(base.replace("JimiHendrix_", "TheJimiHendrixExperience_"))   # three files are named without "The ... Experience"
            if not row: stats["no_sample_row"] = stats.get("no_sample_row", []) + [base]; continue
            try: song = read_hum(f)
            except Exception as ex: stats["read_error"] = stats.get("read_error", []) + [(base, repr(ex))]; continue
            nfiles += 1
            if part == "billboard":
                ids = [x.strip() for x in row["Sample ID#"].split(",")]
                mid = next((i for i in ids if i in site_ids), ids[0])
                year = (row["Chart Date"].split(",")[0].split("/")[0]).strip()
                meta = dict(file=base, id="%04d" % int(mid), title=row["Title"], artist=row["Artist"], year=year, src="CoCoPops/Billboard/Data/" + os.path.basename(f) + " (CC BY-NC 4.0)",
                            extra=["%%%%mcgill %s" % mid, "%%%%peak %s" % row["Peak Position"].split(",")[0].strip(), "%%%%file %s" % base])
            else:
                meta = dict(file=base, id="%03d" % int(row["Rolling Stone Rank"]), title=row["Title"], artist=row["Artist"], year=row["Release Year"],
                            src="CoCoPops/RollingStone/Data/" + os.path.basename(f) + " (RS200, CC BY 4.0; CoCoPops CC BY-NC 4.0)",
                            extra=["%%%%rank %s" % row["Rolling Stone Rank"], "%%%%file %s" % base] + (["%%%%link %s" % row["YoutubeLink"]] if row.get("YoutubeLink") else []))
            w = process_song(song, meta, out, stats, expected, prefix, SECTION_NAMES)
            if w:
                withsec += 1
                index["%s_%s" % (prefix, meta["id"])] = dict(title=meta["title"], artist=meta["artist"], year=int(meta["year"]), file=base, sections=w,
                    **({"mcgill": meta["extra"][0].split()[1], "mcgillAll": [x.strip() for x in row["Sample ID#"].split(",")], "peak": meta["extra"][1].split()[1]} if prefix == "cc" else
                       {"rank": int(row["Rolling Stone Rank"]), "link": row.get("YoutubeLink", "")}))
        json.dump(index, open(os.path.join(HERE, "theme-sources", "cocopops-songs.json" if part == "billboard" else "rs200-songs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
        print("%s: %d files read, %d songs with at least one ABC, %d ABC files written to %s" % (part, nfiles, withsec, len([1 for _ in glob.glob(out + '/*.abc')]), out))
        for k, v in sorted(stats.items()):
            if isinstance(v, list):
                print("  %s: %d %s" % (k, len(v), v[:12]))
            else: print("  %s: %s" % (k, v))
    if os.environ.get("EXPECT_OUT"): json.dump(expected, open(os.environ["EXPECT_OUT"], "w"))
    if os.environ.get("COUNTS_OUT"): json.dump(COUNTS, open(os.environ["COUNTS_OUT"], "w"))

if __name__ == "__main__" and PART != "none": main()
