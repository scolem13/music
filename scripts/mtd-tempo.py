#!/usr/bin/env python3
"""The tempo of each MTD theme in its recording (quarter notes a minute), from MTD's note-by-note alignment.

    python3 scripts/mtd-tempo.py [~/Downloads/MTD_1.0.0/MTD]   -> prints JSON {MTDID: qpm}; convert-mtd.py imports tempos()

data_SCORE_CSV: each note's start (seconds) in the score MIDI, played at that MIDI's own tempo (120, sometimes 60 or 100).
data_EDM-alig_CSV: each note's start (seconds) in the recording. When both list the same notes (1,853 of 2,067), the tempo is
the median of the note-to-note tempos (a fermata or a held breath barely moves it); otherwise (the recording side counts
ornaments) the whole span is used: first note to the end of the last. One performer's tempo over a few seconds.
"""
import glob, json, os, sys

def rows(f):
    out = []
    for line in open(f, encoding="utf-8").read().replace('"', "").splitlines()[1:]:
        if line.strip(): out.append([float(x) for x in line.split(";")])
    return out

def midi_bpm(f):
    b = open(f, "rb").read(); i = b.find(b"\xff\x51\x03")   # the first Set Tempo meta event
    return 60e6 / int.from_bytes(b[i + 3:i + 6], "big") if i >= 0 else 120.0

def tempos(mtd):
    mtd = os.path.expanduser(mtd); out = {}
    for sc in sorted(glob.glob(mtd + "/data_SCORE_CSV/*.csv")):
        name = os.path.basename(sc)[:-4]; mid = name[3:].split("_")[0]
        al = mtd + "/data_EDM-alig_CSV/" + name + ".csv"
        if not os.path.exists(al): continue
        q = midi_bpm(mtd + "/data_SCORE_MID/" + name + ".mid") / 60     # score quarters a second
        s, a = rows(sc), rows(al)
        sec_per_q = None
        if len(s) == len(a) and len(s) > 2:
            steps = sorted((a[i + 1][0] - a[i][0]) / ((s[i + 1][0] - s[i][0]) * q)
                           for i in range(len(s) - 1) if s[i + 1][0] > s[i][0] and a[i + 1][0] > a[i][0])
            if steps: sec_per_q = steps[len(steps) // 2]
        elif s and a:
            sq = (s[-1][0] + s[-1][1] - s[0][0]) * q
            sa = a[-1][0] + a[-1][1] - a[0][0]
            if sq > 0 and sa > 0: sec_per_q = sa / sq
        if sec_per_q: out[mid] = round(60 / sec_per_q)
    return out

if __name__ == "__main__":
    print(json.dumps(tempos(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/MTD_1.0.0/MTD")))
