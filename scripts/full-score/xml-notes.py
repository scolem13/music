"""Read a MusicXML (.xml or .mxl) score into plain JSON for score-check.cjs: no music21, standard library only.

Run: python3 -I scripts/full-score/xml-notes.py score.mxl > score.xml.json

Out: { parts: [{ id, name, transpose, measures: [{ n, len, time, key, notes: [[on, midi, dur, tie]] }] }] }
- times in quarter notes from the start of the bar; len = the bar's sounding length (from its notes, so a pickup is short)
- midi = SOUNDING pitch: written pitch + <transpose> chromatic + 12 * octave-change (a clef's octave sign is display only)
- tie: 0 none, 1 starts a tie, 2 ends one, 3 both (a tied-over note is still listed: the checker merges ties itself)
- hidden notes (print-object="no": a transcriber's playback-only notes, e.g. a faked ritardando) are left out and counted
- unpitched (percussion) notes have midi -1
- grace notes are left out (they take no time in MusicXML); cue notes too
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET
from fractions import Fraction as F

STEP = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

def load(path):
    if path.endswith(".mxl"):
        z = zipfile.ZipFile(path)
        cont = ET.fromstring(z.read("META-INF/container.xml"))
        root = [e.get("full-path") for e in cont.iter() if e.tag.endswith("rootfile")][0]
        return ET.fromstring(z.read(root))
    return ET.parse(path).getroot()

def text(e, path, d=None):
    x = e.find(path); return x.text.strip() if x is not None and x.text else d

def main(path):
    root = load(path)
    names = {sp.get("id"): (text(sp, "part-name", "") or "") for sp in root.iter("score-part")}
    out, hidden = [], [0]
    for part in root.iter("part"):
        div, trans, time, key = 1, 0, "4/4", 0
        measures = []
        for m in part.iter("measure"):
            at, mx, notes, last_on = F(0), F(0), [], F(0)
            for e in m:
                if e.tag == "attributes":
                    div = int(text(e, "divisions", div))
                    if e.find("transpose") is not None:
                        trans = int(text(e, "transpose/chromatic", 0)) + 12 * int(text(e, "transpose/octave-change", 0))
                    if e.find("time") is not None: time = text(e, "time/beats") + "/" + text(e, "time/beat-type")
                    if e.find("key") is not None: key = int(text(e, "key/fifths", 0))
                elif e.tag == "backup": at -= F(int(text(e, "duration")), div)
                elif e.tag == "forward": at += F(int(text(e, "duration")), div); mx = max(mx, at)
                elif e.tag == "note":
                    if e.find("grace") is not None or e.find("cue") is not None: continue
                    dur = F(int(text(e, "duration", 0)), div)
                    on = last_on if e.find("chord") is not None else at
                    if e.find("chord") is None: last_on = at; at += dur
                    mx = max(mx, at)
                    if e.find("rest") is not None: continue
                    if e.get("print-object") == "no": hidden[0] += 1; continue
                    if e.find("pitch") is None:      # unpitched (percussion): midi -1, the checker compares onsets and lengths only
                        if e.find("unpitched") is not None:
                            tie = 0
                            for t in e.findall("tie"): tie |= 1 if t.get("type") == "start" else 2
                            notes.append([float(on), -1, float(dur), tie])
                        continue
                    p = e.find("pitch")
                    midi = 12 * (int(text(p, "octave")) + 1) + STEP[text(p, "step")] + round(float(text(p, "alter", 0))) + trans
                    tie = 0
                    for t in e.findall("tie"): tie |= 1 if t.get("type") == "start" else 2
                    notes.append([float(on), midi, float(dur), tie])
            measures.append({"n": m.get("number"), "len": float(mx), "time": time, "key": key, "notes": notes})
        out.append({"id": part.get("id"), "name": names.get(part.get("id"), ""), "transpose": trans, "measures": measures})
    json.dump({"parts": out, "hidden": hidden[0]}, sys.stdout)

if __name__ == "__main__":
    main(sys.argv[1])
