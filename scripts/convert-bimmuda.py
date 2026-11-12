#!/usr/bin/env python3
"""Convert BiMMuDa's section MIDI files into the Pop Themes' ABC sources.

    python3 -I scripts/convert-bimmuda.py [~/Downloads/BiMMuDa/BiMMuDa]      # needs mido: pip install mido (a venv is fine)

BiMMuDa (Hamilton & Pearce, Billboard year-end top-5 singles 1950-2022, main melody only; repository has no visible
licence: kept behind the site password, credited in scripts/sources/pop-themes.py). Writes
scripts/theme-sources/bimmuda/<ID>.abc, ID = <year>_<position>_<section number> as in the dataset (bimmuda_per_melody_full.csv).

Route: the section files exist only as MIDI (the MuseScore files are whole songs), and the MIDI has no spelling beyond a key
signature that is the relative major, so MuseScore / MusicXML would add nothing. So this reads the MIDI itself (mido):
  * onsets are on a grid of sixteenths and triplets (a quarter's 12 twelfths; each quarter beat picks the grid that fits its
    onsets better; compound meters sixteenths only). The export plays every note at 95% of its written length, so a note's
    length is its sounding length / 0.95 snapped to the grid, and a gap after it (3 twelfths or more) is a rest.
  * the key is the CSV's Tonic + Mode (K:), spelled by interval above the tonic (b3 b7 b6 as flats in major, #4 in major, b5 in
    minor...). C# major and G# major (7-8 sharps) are written as Db / Ab major, Gb and Db minor as F# / C# minor.
  * the tempo is the MIDI's, Q:1/4=N (the CSV's BPM is the same in simple meters, and counts the dotted quarter in 12/8 etc.).
  * a short first bar (a pickup written as its own 1/4 bar) or a first note in the second half of the bar starts the tune
    without the leading rest; a one-bar meter change (2/4 inside 4/4) is an inline [M:].
  * beaming as the site's notation does (apps/shared/notation-doc.js beam()): within a beat (a dotted quarter in 12/8, 6/8,
    9/8), eighths fill a half bar of 4/4 or a whole bar of 2/4 and 3/4 as one beam; a rest or a longer note breaks it; in 4/4 a
    note that starts off the beat is cut at the middle of the bar, in compound meters at the end of its beat (tied).
L:1/8 throughout. Triplets are (3 and (3:2:2 (a triplet quarter and eighth).
Prints the note counts against the CSV's "Number of Note Events" (differences listed), and what it could not convert.
"""
import csv, glob, math, os, re, sys
import mido

root = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/BiMMuDa/BiMMuDa")
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "theme-sources/bimmuda")
os.makedirs(out, exist_ok=True)
for f in glob.glob(out + "/*.abc"): os.remove(f)

melody = {r["ID"]: r for r in csv.DictReader(open(root + "/bimmuda_metadata/bimmuda_per_melody_full.csv", encoding="utf-8"))}
songs = {}
for r in csv.DictReader(open(root + "/bimmuda_metadata/bimmuda_per_song_full.csv", encoding="utf-8")):
    pos = r["Position"]; songs[r["Year"] + "_" + (pos if not pos[0].isdigit() else pos.zfill(2) if pos.isdigit() else pos.zfill(3))] = r

LETTERS = "CDEFGAB"; NAT = [0, 2, 4, 5, 7, 9, 11]
MAJOR_FIFTHS = {"Cb": -7, "Gb": -6, "Db": -5, "Ab": -4, "Eb": -3, "Bb": -2, "F": -1, "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7}
# interval above the tonic (semitones) -> (letter steps, semitones): minor and major differ only at 6 (A4 / d5)
IVL = {0: (0, 0), 1: (1, 1), 2: (1, 2), 3: (2, 3), 4: (2, 4), 5: (3, 5), 6: (3, 6), 7: (4, 7), 8: (5, 8), 9: (5, 9), 10: (6, 10), 11: (6, 11)}
IVL_MINOR6 = (4, 6)
# the tonics respelled for fewer accidentals
RESPELL = {("C#", "Major"): "Db", ("G#", "Major"): "Ab", ("Gb", "Minor"): "F#", ("Db", "Minor"): "C#"}

def tonic_pc(t): return (NAT[LETTERS.index(t[0])] + (1 if "#" in t else -1 if "b" in t else 0)) % 12

def key_of(tonic, mode):
    t = RESPELL.get((tonic, mode), tonic)
    if mode == "Major": fifths = MAJOR_FIFTHS[t]; ktxt = t
    else:
        rel = {"A": "C", "E": "G", "B": "D", "F#": "A", "C#": "E", "G#": "B", "D#": "F#", "A#": "C#", "D": "F", "G": "Bb", "C": "Eb", "F": "Ab",
               "Bb": "Db", "Eb": "Gb", "Ab": "Cb"}[t]
        fifths = MAJOR_FIFTHS[rel]; ktxt = t + "m"
    return t, ktxt, fifths

def key_sig(fifths):
    sig = {}
    order = "FCGDAEB"
    if fifths > 0:
        for l in order[:fifths]: sig[l] = 1
    if fifths < 0:
        for l in order[::-1][:-fifths]: sig[l] = -1
    return sig

def spell(midi, tonic, minor, sig):
    """(letter, accidental, octave) of a MIDI note, spelled by interval above the tonic."""
    iv = (midi - tonic_pc(tonic)) % 12
    steps, semis = IVL[iv]
    if minor and iv == 6: steps, semis = IVL_MINOR6
    li = (LETTERS.index(tonic[0]) + steps) % 7
    alt = ((midi - NAT[li] + 6) % 12) - 6
    if abs(alt) > 1:   # no double sharps / flats (m6 above Db is Bbb): the neighbouring letter, the one the key signature agrees with
        best = None
        for l2 in ((li + 1) % 7, (li - 1) % 7):
            a2 = ((midi - NAT[l2] + 6) % 12) - 6
            if abs(a2) <= 1 and (best is None or (a2 != sig.get(LETTERS[l2], 0)) < (best[1] != sig.get(LETTERS[best[0]], 0))): best = (l2, a2)
        if best: li, alt = best
    nat = midi - alt
    return LETTERS[li], alt, nat // 12 - 1

def read_midi(path):
    m = mido.MidiFile(path)
    t = 0; open_ = {}; notes = []; ts = []; tempo = None
    for msg in mido.merge_tracks(m.tracks):
        t += msg.time
        if msg.type == "time_signature": ts.append((t, msg.numerator, msg.denominator))
        elif msg.type == "set_tempo" and tempo is None: tempo = msg.tempo
        elif msg.type == "note_on" and msg.velocity > 0:
            n = [t, None, msg.note]; notes.append(n); open_.setdefault((msg.channel, msg.note), []).append(n)
        elif msg.type in ("note_off", "note_on"):
            st = open_.get((msg.channel, msg.note))
            if st: st.pop(0)[1] = t
    notes = [n for n in notes if n[1] is not None]
    notes.sort()
    return notes, ts or [(0, 4, 4)], tempo or 500000, m.ticks_per_beat

LENS = [16, 12, 8, 6, 4, 3, 2, 1]
def split_len(n):
    out = []
    while n > 0:
        for L in LENS:
            if L <= n: out.append(L); n -= L; break
    return out

def rest_split(a, b, beat16, barlen16):
    """rest pieces (in sixteenths) from position a to b, aligned: powers of two on their own size, or a whole bar / beat"""
    out = []
    if a == 0 and b == barlen16: return [b]
    while a < b:
        L = 0
        for c in (16, 8, 4, 2, 1):
            if c <= b - a and a % c == 0 and (beat16 % 3 or True): L = c; break
        if beat16 == 6:  # compound: a beat is 6; rests are whole beats or eighths
            L = 6 if (b - a >= 6 and a % 6 == 0) else (2 if a % 2 == 0 and b - a >= 2 else 1)
            if b - a >= 12 and a % 12 == 0 and barlen16 % 12 == 0: L = 12
        out.append(L); a += L
    return out

def convert(id_, mel, song, path):
    notes, ts, tempo, tpb = read_midi(path)
    u = tpb / 12.0
    stat = {"events": len(notes)}
    if not notes: return None, stat
    # ---- bars ----
    end_u = max(n[1] for n in notes) / u
    segs = [(round(t / u), n, d) for t, n, d in ts]
    bars = []  # [start, length, n, d, seg]
    for i, (s, n, d) in enumerate(segs):
        L = 48 * n // d; e = segs[i + 1][0] if i + 1 < len(segs) else math.ceil(end_u) + 1
        a = s
        while a < e:
            l = min(L, e - a) if i + 1 < len(segs) else L
            bars.append([a, l, n, d, i]); a += l
            if i + 1 == len(segs) and a >= end_u: break
    first_on = notes[0][0] / u
    # pickup: leading bars with no note are dropped; a first note in the second half of the bar leaves a pickup
    while len(bars) > 1 and bars[0][0] + bars[0][1] <= first_on + 0.5: bars.pop(0)
    b0 = bars[0]; p = first_on - b0[0]
    if p >= b0[1] / 2 - 0.5 and p > 0.5:
        shift = round(p); b0[0] += shift; b0[1] -= shift; pickup = True
    else: pickup = False
    # header meter: the first bar that is not a one-bar odd-length lead (a 1/4 pickup bar of its own)
    one_bar_seg = lambda b: sum(1 for x in bars if x[4] == b[4]) == 1
    hdr = next((b for b in bars if not (one_bar_seg(b) and 48 * b[2] // b[3] < 48 * bars[-1][2] // bars[-1][3] and b is bars[0] and b[4] < len(segs) - 1)), bars[0])
    meter0 = (hdr[2], hdr[3])
    # ---- onsets and ends on the grid ----
    def bar_at(x):
        for b in reversed(bars):
            if x >= b[0] - 0.5: return b
        return bars[0]
    modes = {}  # (bar index, frame) -> 3 or 4
    bar_idx = {id(b): i for i, b in enumerate(bars)}
    compound = lambda b: b[3] == 8 and b[2] % 3 == 0 and b[2] > 3
    frames = {}
    for t0, t1, pch in notes:
        x = t0 / u; b = bar_at(x); fr = int((x - b[0]) // 12) if x >= b[0] else 0
        frames.setdefault((bar_idx[id(b)], fr), []).append(x - b[0] - 12 * fr if x >= b[0] else 0)
    for k, offs in frames.items():
        b = bars[k[0]]
        if compound(b): modes[k] = 3; continue
        e3 = sum(abs(o - 3 * round(o / 3)) for o in offs); e4 = sum(abs(o - 4 * round(o / 4)) for o in offs)
        modes[k] = 4 if e4 + 0.5 < e3 else 3
    def mode_at(x):
        b = bar_at(x); fr = int(max(0, x - b[0]) // 12)
        return modes.get((bar_idx[id(b)], fr), 3)
    def snap(x, m=None):
        b = bar_at(x); fr = int(max(0, x - b[0]) // 12); m = m or modes.get((bar_idx[id(b)], fr), 3)
        return b[0] + 12 * fr + m * round((x - b[0] - 12 * fr) / m) if False else round(x / 1.0) if False else None
    def snap_on(x):
        b = bar_at(x); fr = int(max(0, x - b[0]) // 12); m = modes.get((bar_idx[id(b)], fr), 3)
        rel = x - b[0] - 12 * fr
        return int(round(b[0] + 12 * fr + m * round(rel / m)))
    ev = []  # [on, pitch, est_end_raw]
    for t0, t1, pch in notes:
        ev.append([snap_on(t0 / u), pch, t0 / u + (t1 - t0) / u / 0.95, t0 / u])
    merged = 0; dedup = []
    for e in ev:
        if dedup and dedup[-1][0] == e[0]: dedup[-1] = e; merged += 1   # two notes on one grid point: the later one
        else: dedup.append(e)
    ev = dedup; stat["merged"] = merged
    seq = []  # (start, end, pitch)
    for i, e in enumerate(ev):
        nxt = ev[i + 1][0] if i + 1 < len(ev) else None
        est = e[2]
        b = bar_at(est - 0.01); fr = int(max(0, est - 0.01 - b[0]) // 12); m = modes.get((bar_idx[id(b)], fr), 3)
        end = int(round(b[0] + 12 * fr + m * round((est - b[0] - 12 * fr) / m)))
        if nxt is not None:
            end = min(end, nxt)
            if nxt - end < 3: end = nxt
        end = max(end, e[0] + (3 if mode_at(e[0]) == 3 else 4))
        if nxt is not None and end > nxt: end = nxt
        seq.append((e[0], end, e[1]))
    # ---- tonic / key ----
    tonic, ktxt, fifths = key_of(mel["Tonic"], mel["Mode"])
    minor = mel["Mode"] == "Minor"; sig = key_sig(fifths)
    # ---- per bar items ----
    start0 = bars[0][0]
    # split timeline into bars: items (a, e, pitch|None, tie_next)
    timeline = []
    t = start0
    for s, e, pch in seq:
        if s > t: timeline.append((t, s, None))
        timeline.append((max(s, t), e, pch)); t = max(t, e)
    # the first rest before the first note was removed with the pickup / empty bars
    timeline = [x for x in timeline if x[1] > x[0]]
    per_bar = [[] for _ in bars]
    for a, e, pch in timeline:
        for i, b in enumerate(bars):
            lo, hi = max(a, b[0]), min(e, b[0] + b[1])
            if hi > lo: per_bar[i].append([lo - b[0], hi - b[0], pch, hi < e])   # last flag: tied on into the next bar
    # trailing bars with nothing
    while per_bar and not per_bar[-1]: per_bar.pop(); bars = bars[:len(per_bar)]
    toks, joins_info = [], []
    cur_meter = meter0; lines = []; line = []; acc_state = {}
    pieces_all = []
    for bi, (b, items) in enumerate(zip(bars, per_bar)):
        n, d = b[2], b[3]
        barlen = b[1]; full = 48 * n // d
        comp = compound(b); beatu = 18 if comp else 12
        mode_of = lambda frame: modes.get((bi, frame), 3)
        # pieces: [pos, len, pitch, tie, tripgroup]
        pcs = []
        for a, e, pch, tied_on in items:
            cuts = []
            f0, f1 = int(a // 12), int((e - 0.01) // 12)
            for f in range(f0, f1 + 1):
                if mode_of(f) == 4:
                    if a < 12 * f: cuts.append(12 * f)
                    if e > 12 * (f + 1): cuts.append(12 * (f + 1))
            if pch is not None:
                if (n, d) == (4, 4) and a % 12 and a < 24 < e: cuts.append(24)
                if comp and a % 18:
                    be = (a // 18 + 1) * 18
                    if e > be: cuts.append(be)
            cuts = sorted(set(c for c in cuts if a < c < e))
            pts = [a] + cuts + [e]
            for x, y in zip(pts, pts[1:]):
                fr = int(x // 12)
                if mode_of(fr) == 4 and y - x != 12:
                    pcs.append([x, y - x, pch, 0, True])     # a triplet piece
                elif pch is None:
                    s16, e16 = x / 3.0, y / 3.0
                    if abs(s16 - round(s16)) > 0.01 or abs(e16 - round(e16)) > 0.01:
                        pcs.append([x, y - x, pch, 0, False]); continue
                    pos = round(s16)
                    for L in rest_split(pos, round(e16), 6 if comp else 4, barlen // 3):
                        pcs.append([pos * 3, L * 3, None, 0, False]); pos += L
                else:
                    if (y - x) % 3: pcs.append([x, y - x, pch, 0, False]); continue
                    pos = x
                    for L in split_len((y - x) // 3):
                        pcs.append([pos, L * 3, pch, 0, False]); pos += L * 3
            # ties inside this note's pieces
            k = len(pcs) - 1
            first = len(pcs) - sum(1 for _ in range(0)) if False else None
            pass
        # tie flags: consecutive pieces of the same note (same pitch, abutting) are tied; the last tied to the next bar if tied_on
        idx = 0
        for a, e, pch, tied_on in items:
            grp = [p for p in pcs if a <= p[0] < e and p[2] == pch and not p[3] == "x"]
            grp = [p for p in grp if p[0] >= a and p[0] + p[1] <= e]
            if pch is not None:
                for j, p in enumerate(grp): p[3] = 1 if (j < len(grp) - 1 or tied_on) else 0
        pieces_all.append((b, pcs))
    # ---- text ----
    def ln(n16u, trip):
        """length text with L=1/8: 'n16u' in twelfths"""
        if trip: k = n16u // 4; return "" if k == 1 else str(k)
        s = n16u // 3   # sixteenths
        if s == 1: return "/"
        if s == 2: return ""
        return "%d/2" % s if s % 2 else str(s // 2)
    text_bars = []; counts = 0
    prev_tied = False
    carry = {}   # accidentals carried by a tie over the barline
    for bi, (b, pcs) in enumerate(pieces_all):
        n, d = b[2], b[3]; comp = d == 8 and n % 3 == 0 and n > 3
        pcs.sort(key=lambda p: p[0])
        # beam keys
        beat = 18 if comp else 12
        def key(p): return p[0] // beat
        wide = None
        if (n, d) == (4, 4):
            for lo, hi, tag in ((0, 24, "a"), (24, 48, "b")):
                its = [p for p in pcs if lo <= p[0] < hi]
                if len(its) > 1 and all(p[2] is not None and p[1] == 6 and not p[4] for p in its) and sum(p[1] for p in its) == hi - lo:
                    wide = wide or {}; wide[tag] = (lo, hi)
        elif (n, d) in ((2, 4), (3, 4)):
            its = pcs
            if len(its) > 1 and all(p[2] is not None and p[1] == 6 and not p[4] for p in its) and sum(p[1] for p in its) == b[1]: wide = {"w": (0, b[1])}
        def bkey(p):
            if wide:
                for tag, (lo, hi) in wide.items():
                    if lo <= p[0] < hi: return tag
            return key(p)
        beamable = lambda p: p[2] is not None and p[1] < 12
        acc = {}
        parts = []
        # triplet groups
        i = 0
        while i < len(pcs):
            p = pcs[i]
            if p[4]:
                fr = p[0] // 12; grp = [q for q in pcs if q[4] and q[0] // 12 == fr]
                tot = sum(q[1] for q in grp)
                head = "(3" if len(grp) == 3 else "(3:2:2" if len(grp) == 2 else "(%d:2:%d" % (len(grp), len(grp))
                if sum(q[1] for q in grp) != 12 or len(grp) not in (2, 3): head = None
                parts.append(("grp", grp, head)); i += len(grp)
            else: parts.append(("one", [p], None)); i += 1
        text = []; prev_beam = None
        for kind, grp, head in parts:
            for j, p in enumerate(grp):
                if p[2] is None: tok = "z" + ln(p[1], p[4])
                else:
                    letter, alt, octv = spell(p[2], tonic, minor, sig)
                    cur = acc.get((letter, octv), sig.get(letter, 0)); cur2 = acc.get(letter, sig.get(letter, 0))   # readers differ on whether an accidental carries to other octaves: written when either would read it wrong
                    a = ""
                    if cur != alt or cur2 != alt: a = {0: "=", 1: "^", 2: "^^", -1: "_", -2: "__"}[alt]
                    acc[(letter, octv)] = alt; acc[letter] = alt
                    ch = letter if octv <= 4 else letter.lower()
                    marks = "," * max(0, 4 - octv) if octv < 4 else "'" * max(0, octv - 5)
                    tok = a + ch + marks + ln(p[1], p[4]) + ("-" if p[3] else "")
                    if not prev_tied: counts += 1
                    prev_tied = bool(p[3])
                if j == 0 and head: tok = head + tok
                p.append(tok)
        # (a note tied over the barline gets its accidental written again: the key signature is back after the barline)
        # join + assemble
        s = ""
        for i, p in enumerate(pcs):
            prevp = pcs[i - 1] if i else None
            join = bool(prevp) and beamable(prevp) and beamable(p) and bkey(prevp) == bkey(p)
            if prevp and not join: s += " "
            s += p[-1]
        text_bars.append((b, s))
    # ---- assemble ABC with meter changes, 4 bars to a line ----
    body = []; cm = meter0; linebuf = []; nb = 0
    for i, (b, s) in enumerate(text_bars):
        m = (b[2], b[3]); tag = ""
        one_odd = b is bars[0] and (b[2], b[3]) != meter0 and bi == 0
        if m != cm and not (i == 0 and (m != meter0)):
            tag = "[M:%d/%d] " % m; cm = m
        linebuf.append(tag + s); nb += 1
        if nb % 4 == 0: body.append(" | ".join(linebuf) + " |"); linebuf = []
    if linebuf: body.append(" | ".join(linebuf) + " |")
    if body: body[-1] = body[-1][:-1] + "]"
    q = int(round(60e6 / tempo))
    stat["expected"] = [[pch, round((a - start0) / 12.0, 4)] for a, e, pch in seq]
    stat.update(bars=len(text_bars), pickup=pickup, mode4=sum(1 for v in modes.values() if v == 4), q=q, n=counts)
    # sanity: every full bar adds up
    bad = 0
    for b, pcs in pieces_all:
        tot = sum(p[1] for p in pcs)
        if tot != b[1] and not (b is bars[-1] or b is bars[0]): bad += 1
    stat["badbars"] = bad
    song_t = song["Title"]
    label = mel["Label"] or "unlabelled"
    head = ["X:1", "T:%s (%s)" % (song_t, label), "C:%s, %s" % (song["Artist"], mel["Year"]),
            "%%%%bimmuda %s" % id_, "%%%%artist %s" % song["Artist"], "%%%%year %s" % mel["Year"], "%%%%section %s" % label,
            "%% BiMMuDa %s: %s %s (CSV tonic; written in %s), CSV BPM %s, %s note events in the CSV (Hamilton & Pearce, BiMMuDa; licence unverified)" % (
                id_, mel["Tonic"], mel["Mode"], ktxt, mel["BPM"], mel["Number of Note Events"]),
            "M:%d/%d" % meter0, "L:1/8", "Q:1/4=%d" % q, "K:" + ktxt]
    return "\n".join(head + body) + "\n", stat

def main():
    expected = {}; n = 0; skipped = []; diffs = []; notes_diff = 0; allstat = []; nofile = []
    files = {os.path.basename(f)[:-4]: f for f in glob.glob(root + "/bimmuda_files/*/*/*.mid") if not f.endswith("_full.mid")}
    for id_, mel in sorted(melody.items()):
        if id_ not in files: nofile.append(id_); continue
        key = "_".join(id_.split("_")[:2])
        song = songs.get(key)
        if not song: skipped.append((id_, "no song row")); continue
        try: abc, st = convert(id_, mel, song, files[id_])
        except Exception as ex:
            skipped.append((id_, "error %r" % ex)); continue
        if not abc: skipped.append((id_, "no notes")); continue
        open(os.path.join(out, id_ + ".abc"), "w", encoding="utf-8").write(abc); n += 1
        want = int(mel["Number of Note Events"]); st["want"] = want; st["id"] = id_
        expected[id_] = st.pop("expected")
        allstat.append(st)
    if os.environ.get("EXPECT_OUT"):
        import json; json.dump(expected, open(os.environ["EXPECT_OUT"], "w"))   # for scripts/check-bimmuda.mjs
    print("wrote", n, "ABC files to", out)
    ev = [s for s in allstat]
    same = sum(1 for s in ev if s["events"] == s["want"])
    print("MIDI note events = CSV 'Number of Note Events':", same, "of", len(ev), "; differ:", len(ev) - same)
    d = [(s["id"], s["events"], s["want"]) for s in ev if s["events"] != s["want"]]
    big = [x for x in d if abs(x[1] - x[2]) > max(2, 0.1 * x[2])]
    print("  differ by more than 2 and 10%:", len(big), big[:40])
    print("notes written (ties split into pieces counted once per note):", sum(s["n"] for s in ev), "of", sum(s["events"] for s in ev), "MIDI events; merged onsets:", sum(s["merged"] for s in ev))
    print("files with a merged onset (two notes on one grid point):", [(s["id"], s["merged"]) for s in ev if s["merged"]][:30])
    print("files with triplet beats:", sum(1 for s in ev if s["mode4"]), "; with a pickup:", sum(1 for s in ev if s["pickup"]))
    print("bars that do not add up (not first / last):", [(s["id"], s["badbars"]) for s in ev if s["badbars"]][:30])
    print("CSV rows with no MIDI file (no melody or file missing):", len(nofile), nofile)
    print("skipped:", skipped)
    songs_seen = {"_".join(s["id"].split("_")[:2]) for s in ev}
    print("songs with at least one section:", len(songs_seen), "of", len(songs))

if __name__ == "__main__": main()
