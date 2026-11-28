#!/usr/bin/env python3
"""Chord symbols from transcribed MIDI (guitar / piano / other + bass), per beat on a Beat This! grid.

    python3 notes_chords.py beats.tsv out.txt bass.mid other1.mid other2.mid ...   -> lines: start <tab> end <tab> label

Each beat: pitch classes weighted by how long they sound in it (bass notes x2, and the lowest bass pitch class gets a root
bonus). Scored against major, minor, 7, m7 and maj7 templates; a chord must last 2 beats or it merges into its neighbour.
Labels are madmom-style (Ab:maj, F:min, Eb:7) so beat_abc.py reads all chord files the same way.
"""
import sys
import pretty_midi as pm

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
TEMPL = {"maj": [0, 4, 7], "min": [0, 3, 7], "7": [0, 4, 7, 10], "min7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11]}
PRIOR = {"maj": 0.0, "min": 0.0, "7": -0.08, "min7": -0.08, "maj7": -0.1}   # prefer triads unless the 7th is clear

beats_f, out_f, bass_f, *others = sys.argv[1:]
bt = [float(l.split()[0]) for l in open(beats_f) if l.strip()]
bt.append(bt[-1] + (bt[-1] - bt[-2]))
notes = [(n, 2.0, True) for i in pm.PrettyMIDI(bass_f).instruments for n in i.notes]
for f in others:
    notes += [(n, 1.0, False) for i in pm.PrettyMIDI(f).instruments for n in i.notes]

labels = []
for a, b in zip(bt, bt[1:]):
    w = [0.0] * 12; low = None
    for n, wt, is_bass in notes:
        d = min(n.end, b) - max(n.start, a)
        if d > 0:
            w[n.pitch % 12] += d * wt * (n.velocity / 100)
            if is_bass and d > 0.08 and (low is None or n.pitch < low): low = n.pitch
    tot = sum(w) or 1
    w = [x / tot for x in w]
    best = ("N", 0.15)
    for r in range(12):
        for q, iv in TEMPL.items():
            s = sum(w[(r + i) % 12] for i in iv) - 0.5 * sum(w[(r + i) % 12] for i in range(12) if i not in iv)
            s += PRIOR[q] + (0.15 if low is not None and low % 12 == r else 0)
            if s > best[1]: best = (f"{NAMES[r]}:{q}", s)
    labels.append(best[0])

for i in range(1, len(labels) - 1):          # a 1-beat chord between two others joins the previous one
    if labels[i] != labels[i - 1] and labels[i] != labels[i + 1]:
        labels[i] = labels[i - 1]
runs = []
for i, l in enumerate(labels):
    if runs and runs[-1][2] == l: runs[-1][1] = bt[i + 1]
    else: runs.append([bt[i], bt[i + 1], l])
open(out_f, "w").write("".join(f"{a:.3f}\t{b:.3f}\t{l}\n" for a, b, l in runs))
print(" ".join(r[2] for r in runs))
