"""Bar-number font for the Classical Themes cards: Commit Mono's digits with a plain zero.

Commit Mono's own zero is slashed and its cv07 alternate is dotted; this takes the dotted one and drops the dot
(outer ring + counter only), keeps only the digits, and renames the family (OFL: a modified font gets its own name).
Needs fontTools (pip install fonttools). Run: python3 scripts/make-barno-font.py
"""
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools import subset

SRC = "apps/shared/fonts/CommitMono-400-Regular.otf"
OUT = "apps/shared/fonts/BarNumbers-CommitMono-digits.otf"
NAME = "Bar Numbers Mono"

f = TTFont(SRC)
gs = f.getGlyphSet()
rec = RecordingPen()
gs["zero.cv07"].draw(rec)
contours, cur = [], []
for op, args in rec.value:
    cur.append((op, args))
    if op in ("closePath", "endPath"):
        contours.append(cur)
        cur = []

def area(c):
    pts = [p for _, a in c for p in a]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return (max(xs) - min(xs)) * (max(ys) - min(ys))

keep = sorted(contours, key=area, reverse=True)[:2]   # the ring and its counter; the dot is the smallest
width = f["hmtx"]["zero"][0]
pen = T2CharStringPen(width, None)
for c in keep:
    for op, args in c:
        getattr(pen, op)(*args)
cff = f["CFF "].cff
top = cff.topDictIndex[0]
cs = pen.getCharString(private=top.Private, globalSubrs=cff.GlobalSubrs)
top.CharStrings["zero"] = cs

for r in f["name"].names:
    if r.nameID in (1, 16):
        r.string = NAME
    elif r.nameID == 4:
        r.string = NAME + " Regular"
    elif r.nameID == 6:
        r.string = NAME.replace(" ", "") + "-Regular"

opts = subset.Options()
opts.layout_features = []
opts.name_IDs = ["*"]
sub = subset.Subsetter(opts)
sub.populate(text="0123456789")
sub.subset(f)
f.save(OUT)
print("wrote", OUT)

# ---- the light version (weight 200), from Commit Mono's variable font (src/fonts/fontlab in its repository, OFL):
# the same plain zero and digits only, as BarNumbers-CommitMono-digits-200.ttf, family "Bar Numbers Mono Light".
from fontTools.varLib import instancer
from fontTools.pens.ttGlyphPen import TTGlyphPen
VF, OUT2, NAME2 = "scripts/fonts-src/CommitMonoV143-VF.ttf", "apps/shared/fonts/BarNumbers-CommitMono-digits-200.ttf", "Bar Numbers Mono Light"
v = instancer.instantiateVariableFont(TTFont(VF), {"wght": 200})
gs2 = v.getGlyphSet()
rec2 = RecordingPen(); gs2["zero.cv07"].draw(rec2)
cs2, cur2 = [], []
for op, args in rec2.value:
    cur2.append((op, args))
    if op in ("closePath", "endPath"): cs2.append(cur2); cur2 = []
pen2 = TTGlyphPen(gs2)
for c in sorted(cs2, key=area, reverse=True)[:2]:
    for op, args in c: getattr(pen2, op)(*args)
v["glyf"]["zero"] = pen2.glyph()
for r in v["name"].names:
    if r.nameID in (1, 16): r.string = NAME2
    elif r.nameID == 4: r.string = NAME2 + " Regular"
    elif r.nameID == 6: r.string = NAME2.replace(" ", "") + "-Regular"
sub2 = subset.Subsetter(opts); sub2.populate(text="0123456789"); sub2.subset(v)
v.save(OUT2)
print("wrote", OUT2)

# ---- the bar numbers now used (Classical Themes, Analysed Scores): Source Serif 4 (the scores' own typeface, OFL, google/fonts
# ofl/sourceserif4) at its smallest optical size and weight 200, digits only, under the same family name "Bar Numbers Mono" in CSS.
SS, OUT3 = "scripts/fonts-src/SourceSerif4-VF.ttf", "apps/shared/fonts/BarNumbers-SourceSerif4-200.ttf"
s4 = instancer.instantiateVariableFont(TTFont(SS), {"wght": 200, "opsz": 8})
for r in s4["name"].names:
    if r.nameID in (1, 16): r.string = "Bar Numbers Serif Light"
    elif r.nameID == 4: r.string = "Bar Numbers Serif Light Regular"
    elif r.nameID == 6: r.string = "BarNumbersSerifLight-Regular"
o3 = subset.Options(); o3.layout_features = ["tnum"]; o3.name_IDs = ["*"]
sub3 = subset.Subsetter(o3); sub3.populate(text="0123456789"); sub3.subset(s4)
s4.save(OUT3)
print("wrote", OUT3)
