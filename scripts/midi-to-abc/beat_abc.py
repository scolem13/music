#!/usr/bin/env python3
"""Transcribed MIDI + a beat grid -> ABC (one voice per input MIDI).

    python3 beat_abc.py beats.tsv out.abc "Title" melody:vocal.mid bass:bass.mid ...

beats.tsv: Beat This! output (`beat_this audio.wav -o beats.tsv`): time <tab> beat number in bar (1 = downbeat).
Plan and sources: research_notes/stems-midi-to-abc-plan.md. Needs pretty_midi.

Steps per voice: clean (one note at a time; drop blips; merge repeated pitches split by the detector; fix lone octave
jumps) -> note times to beat positions by interpolating between the tracked beats (tempo drift and rubato vanish) ->
quantize per beat to sixteenths or triplets, whichever fits that beat's onsets better (as convert-bimmuda.py) -> a
note ends at the next onset when the gap is under an eighth -> key by Krumhansl-Schmuckler, spelled sharps or
flats by key -> ABC, L:1/8, beamed by beat, (3 for triplet beats, ties across beats and bar lines.
Bars whose onsets sat far from the grid are listed as %unsure.
"""
import bisect, statistics, sys
from fractions import Fraction as F
import pretty_midi as pm

U = 12                      # grid units per beat (sixteenths = 3, triplet eighths = 4)
MIN_DUR, MERGE_GAP = 0.06, 0.04

# ---------- beat grid ----------
def load_beats(path):
    rows = [l.split() for l in open(path) if l.strip()]
    t = [float(r[0]) for r in rows]; n = [int(float(r[1])) for r in rows]
    return t, n

def beat_pos(t, bt):
    """seconds -> beats (float), linear between tracked beats, extrapolated at the ends."""
    i = bisect.bisect_right(bt, t) - 1
    if i < 0:
        d = bt[1] - bt[0]; return (t - bt[0]) / d
    if i >= len(bt) - 1:
        d = bt[-1] - bt[-2]; return len(bt) - 1 + (t - bt[-1]) / d
    return i + (t - bt[i]) / (bt[i + 1] - bt[i])

# ---------- cleanup ----------
def clean(notes, low=False):
    notes = sorted((n for n in notes if n.end - n.start >= MIN_DUR), key=lambda n: (n.start, n.pitch if low else -n.pitch))
    mono = []
    for n in notes:
        if mono and n.start < mono[-1].end:
            p = mono[-1]
            if n.start - p.start < 0.05:               # simultaneous: keep the lower (bass) / higher (melody) one
                continue
            p.end = n.start                             # otherwise the later note cuts off the earlier
        mono.append(pm.Note(n.velocity, n.pitch, n.start, n.end))
    merged = []
    for n in mono:
        if merged and n.pitch == merged[-1].pitch and n.start - merged[-1].end < MERGE_GAP:
            merged[-1].end = n.end
        else:
            merged.append(n)
    for i in range(1, len(merged) - 1):                 # a lone note an octave away from both neighbours
        a, b, c = merged[i - 1].pitch, merged[i].pitch, merged[i + 1].pitch
        for s in (12, -12):
            if abs(b - s - a) <= 4 and abs(b - s - c) <= 4 and abs(b - a) > 9 and abs(b - c) > 9:
                merged[i].pitch = b - s
    return merged

# ---------- quantize ----------
DRUM_MAP = {35: 65, 36: 65, 38: 72, 40: 72, 37: 72, 42: 79, 44: 79, 46: 79, 41: 67, 43: 67, 45: 67, 47: 67, 48: 67, 50: 67,
            49: 77, 51: 77, 52: 77, 53: 77, 55: 77, 57: 77, 59: 77}   # kick F, snare c, hi-hat g, toms G, cymbals f (perc clef)

def quantize(notes, bt, poly=False):
    """poly: notes that snap to the same onset become one chord (pitch tuple, the 4 loudest); else one note at a time."""
    if poly:
        notes = [n for n in notes if n.end - n.start >= 0.08]
    ev = [[beat_pos(n.start, bt), beat_pos(n.end, bt), n.pitch, n.velocity] for n in sorted(notes, key=lambda n: n.start)]
    beats = {}
    for e in ev:
        beats.setdefault(int(e[0] // 1), []).append(e[0] % 1)
    grid, err = {}, {}
    for b, fr in beats.items():
        best = None
        for g in (3, 4):                                # sixteenths, triplet eighths
            st = g / U
            e = sum(abs(f - round(f / st) * st) for f in fr) + (0.02 if g == 4 else 0)   # straight wins a tie
            if best is None or e < best[0]:
                best = (e, g)
        grid[b], err[b] = best[1], best[0] / len(fr)
    def snap(x):
        b = int(x // 1); g = grid.get(b, 3)
        return b * U + round((x - b) * U / g) * g
    q = []
    if poly:
        groups = {}
        for s, e, p, v in ev:
            qs = snap(s)
            groups.setdefault(qs, []).append((max(snap(e), qs + grid.get(int(s // 1), 3)), p, v))
        for qs in sorted(groups):
            g = sorted(groups[qs], key=lambda x: -x[2])[:4]
            q.append([qs, max(x[0] for x in g), tuple(sorted({x[1] for x in g}))])
    for s, e, p, v in ([] if poly else ev):
        qs = snap(s); qe = snap(e)
        if q and qs <= q[-1][0]:
            continue                                     # two onsets snapped together: keep the first
        q.append([qs, max(qe, qs + grid.get(int(s // 1), 3)), p])
    for i in range(len(q) - 1):
        if q[i + 1][0] - q[i][1] < 6 or q[i][1] > q[i + 1][0]:
            q[i][1] = q[i + 1][0]                        # legato: run on to the next onset
    return q, grid, err

# ---------- key and spelling ----------
MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
NAMES_S = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NAMES_F = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
SIG = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6}

def key_of(all_q):
    h = [0.0] * 12
    for s, e, p in all_q:
        h[p % 12] += e - s
    def corr(prof, k):
        x = [h[(i + k) % 12] for i in range(12)]; mx, my = statistics.mean(x), statistics.mean(prof)
        num = sum((a - mx) * (b - my) for a, b in zip(x, prof))
        den = (sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in prof)) ** .5 or 1
        return num / den
    best = max(((corr(MAJ, k), k, "") for k in range(12)), key=lambda z: z[0])
    bm = max(((corr(MIN, k), k, "m") for k in range(12)), key=lambda z: z[0])
    if bm[0] > best[0] + 0.05:                        # minor only when clearly better (relative keys score alike)
        best = bm
    _, k, mode = best
    maj_tonic = k if not mode else (k + 3) % 12
    name = NAMES_F[maj_tonic] if NAMES_F[maj_tonic] in SIG and SIG[NAMES_F[maj_tonic]] < 0 else NAMES_S[maj_tonic]
    if name not in SIG:
        name = NAMES_F[maj_tonic]
    tonic = (NAMES_F if SIG[name] < 0 else NAMES_S)[k]
    return tonic + mode, SIG[name]

def sig_alters(n):
    order_s, order_f = "FCGDAEB", "BEADGCF"
    d = {c: 0 for c in "CDEFGAB"}
    for c in (order_s[:n] if n > 0 else order_f[:-n]):
        d[c] = 1 if n > 0 else -1
    return d

def spell(p, nsig):
    names = NAMES_F if nsig < 0 else NAMES_S
    nm = names[p % 12]; letter, alt = nm[0], (1 if "#" in nm else -1 if "b" in nm else 0)
    octv = p // 12 - 1
    return letter, alt, octv

def abc_pitch(letter, octv):
    if octv >= 5:
        return letter.lower() + "'" * (octv - 5)
    return letter + "," * (4 - octv)

def abc_len(units, trip):
    f = F(units, 4) if trip else F(units, 6)        # in eighths (L:1/8)
    if f == 1: return ""
    if f.denominator == 1: return str(f.numerator)
    if f.numerator == 1: return "/" * {2: 1, 4: 2}.get(f.denominator, 1) if f.denominator in (2, 4) else f"/{f.denominator}"
    return f"{f.numerator}/{f.denominator}"

OK_LEN = {6, 12, 18, 24, 36, 48}                      # 8th, quarter, dotted quarter, half, dotted half, whole

# ---------- chord symbols ----------
SUF = {"maj": "", "min": "m", "7": "7", "min7": "m7", "maj7": "maj7", "dim": "dim", "aug": "aug"}
PC = {n: i for i, n in enumerate(NAMES_S)} | {n: i for i, n in enumerate(NAMES_F)}

def chord_name(label, nsig):
    """madmom (D#:maj, F:min) or Chordino (C#, Fm7, Eb7/G) label -> symbol spelled for the key; None for no chord."""
    if label in ("N", "X", ""): return None
    names = NAMES_F if nsig <= 0 else NAMES_S
    if ":" in label:
        r, q = label.split(":", 1); return names[PC[r]] + SUF.get(q, q)
    main, _, bass = label.partition("/")
    r = main[:2] if len(main) > 1 and main[1] in "#b" else main[:1]
    out = names[PC[r]] + main[len(r):]
    return out + ("/" + names[PC[bass]] if bass in PC else "")

def load_chords(path, bt, shift, nsig):
    out = []
    for l in open(path):
        a = l.split("\t")
        if len(a) < 3: continue
        name = chord_name(a[2].strip(), nsig)
        pos = round(beat_pos(float(a[0]), bt)) * U - shift       # to the nearest beat
        if name and (not out or out[-1][1] != name):
            if out and out[-1][0] == pos: out[-1] = (pos, name)
            else: out.append((pos, name))
    return out

TRI = {"maj": [0, 4, 7], "min": [0, 3, 7]}

def key_from_chords(path, melody=()):
    """Signature: Krumhansl major profile over chord tones x duration (+ melody notes). Tonic: among that signature's
    ionian / aeolian / mixolydian / dorian tonics, the one whose tonic chord (right quality) sounds longest, with the
    plain major key favoured (x1.5: a V chord is naturally long) and minor next (x1.2)."""
    h, dq = [0.0] * 12, {}
    for l in open(path):
        a = l.split("\t")
        if len(a) < 3 or a[2].strip() in ("N", "X"): continue
        lab = a[2].strip(); d = float(a[1]) - float(a[0])
        if ":" in lab: r, q = lab.split(":", 1); minor = q.startswith("min")
        else:
            m = lab.partition("/")[0]; r = m[:2] if len(m) > 1 and m[1] in "#b" else m[:1]
            q = m[len(r):]; minor = q.startswith("m") and not q.startswith("maj")
        pc = PC[r]
        for iv in TRI["min" if minor else "maj"]: h[(pc + iv) % 12] += d
        dq[(pc, minor)] = dq.get((pc, minor), 0) + d
    if not dq: return None
    for st, en, pp in melody:
        for x in (pp if isinstance(pp, tuple) else (pp,)): h[x % 12] += (en - st) / U * 0.5
    def corr(k):
        x = [h[(i + k) % 12] for i in range(12)]; mx, my = statistics.mean(x), statistics.mean(MAJ)
        num = sum((a - mx) * (b - my) for a, b in zip(x, MAJ))
        return num / ((sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in MAJ)) ** .5 or 1)
    K = max(range(12), key=corr)
    modes = [(0, False, "", 1.5), (9, True, "m", 1.2), (7, False, "mix", 1.0), (2, True, "dor", 1.0)]
    off, minor, tag, _ = max(modes, key=lambda m: dq.get(((K + m[0]) % 12, m[1]), 0) * m[3])
    cands = [n for n in (NAMES_S[K], NAMES_F[K]) if n in SIG]
    name = min(cands, key=lambda n: abs(SIG[n]))
    tonic = (NAMES_F if SIG[name] < 0 else NAMES_S)[(K + off) % 12]
    return tonic + tag, SIG[name]

# ---------- ABC ----------
def note_abc(p, nsig, keysig, acc):
    letter, alt, octv = spell(p, nsig)
    k = (letter, octv); curalt = acc.get(k, keysig[letter])
    a = "" if alt == curalt else {1: "^", -1: "_", 0: "="}[alt]
    acc[k] = alt
    return a + abc_pitch(letter, octv)

def voice_abc(q, grid, start_bar, nbars, bpb, nsig, chords=(), drums=False, labels=None):
    keysig = {c: 0 for c in "CDEFGAB"} if drums else sig_alters(nsig)
    cpos = sorted(c[0] for c in chords); cname = dict(chords)
    cur = start_bar * bpb * U
    events = []
    for s, e, p in q:
        if s > cur: events.append([cur, s, None])
        events.append([max(s, cur), e, p]); cur = max(cur, e)
    end = (start_bar + nbars) * bpb * U
    if cur < end: events.append([cur, end, None])
    pieces = []
    for s, e, p in events:
        t = s
        while t < e:
            bar_end = (t // (bpb * U) + 1) * bpb * U
            beat_end = (t // U + 1) * U
            nxt = next((c for c in cpos if c > t), None)      # split at a chord change so the symbol sits on its beat
            lim = min(e, bar_end, nxt) if nxt is not None else min(e, bar_end)
            span_beats = range(t // U, lim // U)
            whole = t % U == 0 and all(grid.get(b, 3) == 3 for b in span_beats) and (lim - t) in OK_LEN
            stop = lim if whole else min(lim, beat_end)
            pieces.append([t, stop, p, stop < e and p is not None])
            t = stop
    bars = {}
    for t, stop, p, tie in pieces:
        bars.setdefault(t // (bpb * U), []).append((t, stop, p, tie))
    lines = []
    for b in range(start_bar, start_bar + nbars):
        acc, tok, beat_groups = {}, [], {}
        for t, stop, p, tie in bars.get(b, []):
            beat_groups.setdefault(t // U, []).append((t, stop, p, tie))
        for bt_i in sorted(beat_groups):
            g = beat_groups[bt_i]
            trip = grid.get(bt_i, 3) == 4 and g[-1][1] <= (bt_i + 1) * U
            s = f"(3:2:{len(g)}" if trip and any((x[1] - x[0]) % 6 for x in g) else ""
            for t, stop, p, tie in g:
                L = abc_len(stop - t, trip and s.startswith("("))
                sym = f'"{cname[t]}"' if t in cname else ""
                if p is None:
                    s += sym + ("x" if drums else "z") + L
                elif isinstance(p, tuple):
                    body = "".join(note_abc(x, nsig, keysig, acc) for x in p)
                    s += sym + (f"[{body}]" if len(p) > 1 else body) + L + ("-" if tie and not drums else "")
                else:
                    s += sym + note_abc(p, nsig, keysig, acc) + L + ("-" if tie else "")
            tok.append(s)
        line = " ".join(tok) or f"z{bpb * 2}"
        if labels and b in labels:
            line = f'"^{labels[b]}"' + line
        lines.append(line)
    return lines

def kind_of(name):
    n = name.lower()
    if "drum" in n: return "drums"
    if "bass" in n: return "bass"
    if "vocal" in n or "melody" in n: return "mono"
    return "poly"

def main():
    beats_f, out_f, title, *parts = sys.argv[1:]
    bt, bn = load_beats(beats_f)
    downs = [i for i, n in enumerate(bn) if n == 1]
    bpb = statistics.mode(b - a for a, b in zip(downs, downs[1:])) if len(downs) > 2 else max(bn)   # a stray 6-beat bar is not the meter
    first_down = downs[0]
    voices, chord_file, sections = [], None, []
    for spec in parts:
        role, path = spec.split(":", 1)
        if role == "chords":
            chord_file = path; continue
        if role == "sections":
            import json
            sections = [(st["s"], st["n"]) for st in json.load(open(path))["stamps"]]; continue
        kind = kind_of(role)
        notes = [n for i in pm.PrettyMIDI(path).instruments for n in i.notes]
        if kind == "drums":
            notes = [pm.Note(n.velocity, DRUM_MAP.get(n.pitch, 72), n.start, n.start + 0.05) for n in notes]
        q, grid, err = quantize(notes if kind in ("poly", "drums") else clean(notes, low=(kind == "bass")), bt,
                                poly=kind == "poly")
        if kind == "drums":                              # hits sharing an onset become one chord of drums
            g = {}
            for x in q: g.setdefault(x[0], set()).add(x[2])
            q = [[k, k + 3, tuple(sorted(v))] for k, v in sorted(g.items())]
        if kind == "drums":
            for i in range(len(q)):                      # a drum hit lasts to the next hit (at most a quarter)
                q[i][1] = min(q[i + 1][0] if i + 1 < len(q) else q[i][0] + U, q[i][0] + U)
        voices.append((role, kind, q, grid, err))
    allq = [x for v in voices for x in v[2]]
    mono = [x for v in voices if v[1] == "mono" for x in v[2]]
    key, nsig = key_of(mono or [x for v in voices if v[1] == "bass" for x in v[2]])
    shift = first_down * U                                   # make bar 0 start on the first downbeat
    for v in voices:
        for x in v[2]: x[0] -= shift; x[1] -= shift
        new = {b - first_down: g for b, g in v[3].items()}; v[3].clear(); v[3].update(new)
    if chord_file:                                       # chords decide the tonic and mode when there are any
        key, nsig = key_from_chords(chord_file, mono) or (key, nsig)
    chords = load_chords(chord_file, bt, shift, nsig) if chord_file else []
    if False:                                            # (superseded by key_from_chords)                                           # relative major or minor: whichever tonic chord the chords use more
        roots = [c[1] for c in chords]
        maj_t = key.rstrip("m") if not key.endswith("m") else (NAMES_F if nsig <= 0 else NAMES_S)[(PC[key[:-1]] + 3) % 12]
        min_t = (NAMES_F if nsig <= 0 else NAMES_S)[(PC[maj_t] + 9) % 12]
        n_maj = sum(r == maj_t or r.startswith(maj_t + "maj") or r == maj_t + "7" for r in roots)
        n_min = sum(r.startswith(min_t + "m") and not r.startswith(min_t + "maj") for r in roots)
        key = min_t + "m" if n_min > n_maj else maj_t
    first = min(x[0] for x in allq); last = max(x[1] for x in allq)
    start_bar = first // (bpb * U); nbars = -(-last // (bpb * U)) - start_bar
    qpm = round(60 / statistics.median(b - a for a, b in zip(bt, bt[1:])))
    o = [f"X:1", f"T:{title}", f"M:{bpb}/4", "L:1/8", f"Q:1/4={qpm}", f"%%score {' '.join(str(i+1) for i in range(len(voices)))}",
         f"K:{key}", "% auto-transcribed: stems -> MIDI -> Beat This! grid -> per-beat 16th/triplet quantize (beat_abc.py)"]
    if chord_file:
        o.append(f"% chords: {chord_file}")
    for i, (role, kind, q, grid, err) in enumerate(voices):
        sb = {(b - first_down) // bpb for b, e in err.items() if e > 0.06}
        flat = [y for x in q for y in (x[2] if isinstance(x[2], tuple) else (x[2],))]
        med = statistics.median(flat) if flat else 60
        if kind == "drums": clef = "perc"
        elif kind == "bass": clef = "bass-8" if med < 43 else "bass"
        elif med < 55 and "guitar" not in role: clef = "bass"
        else: clef = "treble-8" if "guitar" in role or (med < 62 and kind == "mono") else "treble"
        o.append(f"V:{i+1} name=\"{role}\" clef={clef}" + (" stafflines=5" if kind == "drums" else ""))   # -8: drawn an octave up
        if sb and kind != "drums":
            o.append(f"%unsure [bars {', '.join(str(b - start_bar) for b in sorted(sb))}] onsets far from the beat grid ({role})")
        labels = {}
        for t, n in sections if i == 0 else ():
            if t < bt[-1] + 1:
                labels[round(beat_pos(t, bt) - first_down) // bpb if False else round((beat_pos(t, bt) - first_down) / bpb)] = n
        lines = voice_abc(q, grid, start_bar, nbars, bpb, nsig, chords if i == 0 else (), drums=(kind == "drums"), labels=labels)
        for j in range(0, len(lines), 4):
            o.append(" | ".join(lines[j:j + 4]) + " |")
    open(out_f, "w").write("\n".join(o) + "\n")
    print(f"{out_f}: key {key}, {bpb}/4, q={qpm}, {nbars} bars, {len(chords)} chords, " + ", ".join(f"{v[0]} {len(v[2])}" for v in voices))

if __name__ == "__main__":
    main()
