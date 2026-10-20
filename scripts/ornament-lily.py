"""LilyPond for every drawn example on lessons/grace-notes-ornaments.qmd (the ABC each abc-ex draws, not its data-play).

    python3 scripts/ornament-lily.py

writes scripts/ornaments/lily/examples/NNN-<label>.ly (one per distinct example) and scripts/ornaments/lily/all-examples.ly
(every example as its own \\score, labelled by section and table row: paste it into Hacklily to see them all).

Covers the ABC this page uses: K: (major / minor and modes), L:, M: (none = unmetered, drawn without a time signature),
Q:, T:; notes, rests (z, x invisible), lengths (2, /2, /, 3/2), broken rhythm (> <), ties, slurs, (3 triplets, chords [...],
grace notes {...} ({/...} = acciaccatura; a grace with no length is drawn as an eighth; its accidental
is its own, not the bar's), decorations (!trill! T, !mordent! M,
!uppermordent! P, !turn!, !invertedturn!, ~ roll), annotations "^text" "_text", chord symbols, barlines | || |] |: :|.
Notes written together are beamed together, as abcjs does. Anything else stops the script with the example's text.

A table row (scripts/ornaments/*.py) may carry lily="..." : the sign as the source prints it, in LilyPond, for the signs abcjs
has no glyph for (Bach's \\prallmordent / \\upprall / \\downprall ..., jazz falls and scoops). That replaces the converted ABC
of the row's sign cell; its pitches are absolute (c'' = the c the tables use).
"""
import html
import os
import re
import sys
from fractions import Fraction as F

PAGE = "lessons/grace-notes-ornaments.qmd"
OUT = "scripts/ornaments/lily"
VERSION = "2.22.0"

DECOS = {"trill": "\\trill", "T": "\\trill", "mordent": "\\mordent", "lowermordent": "\\mordent", "M": "\\mordent",
         "uppermordent": "\\prall", "pralltriller": "\\prall", "P": "\\prall", "turn": "\\turn", "invertedturn": "\\reverseturn",
         "~": "^\\markup { \\small roll }", "fermata": "\\fermata", "accent": "->", ">": "->", "tenuto": "--", ".": "-."}
SHARPS = "FCGDAEB"
MAJOR_FIFTHS = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7, "F": -1, "Bb": -2, "Eb": -3, "Ab": -4,
                "Db": -5, "Gb": -6, "Cb": -7}
MODES = {"maj": 0, "ion": 0, "min": -3, "m": -3, "aeo": -3, "dor": -2, "phr": -4, "lyd": 1, "mix": -1, "loc": -5}
LILY_MODE = {"maj": "\\major", "ion": "\\major", "": "\\major", "min": "\\minor", "m": "\\minor", "aeo": "\\minor",
             "dor": "\\dorian", "phr": "\\phrygian", "lyd": "\\lydian", "mix": "\\mixolydian", "loc": "\\locrian"}


def key_info(k):
    m = re.match(r"^([A-G])([#b]?)\s*([A-Za-z]*)", k.strip())
    if not m:
        sys.exit("key? " + k)
    tonic, acc, mode = m.group(1), m.group(2), m.group(3).lower()[:3]
    if mode == "m" or m.group(3).lower() == "m":
        mode = "m"
    fifths = MAJOR_FIFTHS[tonic + acc] + MODES.get(mode, 0)
    sig = {}
    for i in range(abs(fifths)):
        sig[SHARPS[i] if fifths > 0 else SHARPS[::-1][i]] = 1 if fifths > 0 else -1
    lily = tonic.lower() + {"#": "is", "b": "es", "": ""}[acc] + " " + LILY_MODE.get(mode, "\\major")
    return sig, lily


def dur_str(f):
    """a length in whole notes -> LilyPond durations (several tied ones if it needs them)"""
    out = []
    while f > 0:
        for d in (1, 2, 4, 8, 16, 32, 64, 128):
            for dots, mul in ((2, F(7, 4)), (1, F(3, 2)), (0, F(1))):
                v = F(1, d) * mul
                if v <= f:
                    out.append(str(d) + "." * dots)
                    f -= v
                    break
            else:
                continue
            break
        else:
            sys.exit("length? %s" % f)
    return out


def pitch(letter, acc, octs, sig, bar_acc):
    base = letter.upper()
    octave = 4 if letter.isupper() else 5
    octave += octs.count("'") - octs.count(",")
    k = (base, octave)
    if acc:
        a = {"^": 1, "^^": 2, "_": -1, "__": -2, "=": 0}[acc]
        bar_acc[k] = a
    else:
        a = bar_acc.get(k, sig.get(base, 0))
    name = base.lower() + {2: "isis", 1: "is", 0: "", -1: "es", -2: "eses"}[a]
    name = name.replace("ees", "es").replace("aes", "as")
    marks = octave - 3
    return name + ("'" * marks if marks > 0 else "," * -marks)


TOKEN = re.compile(r"""
  (?P<ws>\s+)
 |(?P<bar>\|\]|\|\||\|:|:\||\[\||\|)
 |(?P<deco>![^!]+!)
 |(?P<quote>"[^"]*")
 |(?P<grace>\{/?[^}]*\})
 |(?P<tuplet>\((?P<tn>\d)(?::(?P<tq>\d?))?(?::(?P<tr>\d))?)
 |(?P<slur>[()])
 |(?P<short>[TMP~.H](?=[\^_=A-Ga-gz\[{]))
 |(?P<chord>\[(?P<cnotes>[^\]|:]+)\](?P<clen>\d*/*\d*))
 |(?P<note>(?P<acc>\^\^|__|\^|_|=)?(?P<let>[A-Ga-g])(?P<oct>[',]*)(?P<len>\d*/*\d*))
 |(?P<rest>(?P<rk>[zx])(?P<rlen>\d*/*\d*))
 |(?P<broken>[<>]+)
 |(?P<tie>-)
""", re.X)
NOTE = re.compile(r"(\^\^|__|\^|_|=)?([A-Ga-g])([',]*)(\d*/*\d*)")


def mult(s):
    if not s:
        return F(1)
    m = re.match(r"^(\d*)(/*)(\d*)$", s)
    num = int(m.group(1)) if m.group(1) else 1
    if m.group(2):
        den = int(m.group(3)) if m.group(3) else 2 ** len(m.group(2))
        return F(num, den)
    return F(num)


def convert(abc):
    hdr, body = {}, []
    for line in abc.strip().splitlines():
        if re.match(r"^[A-Za-z]:", line):
            hdr.setdefault(line[0], line[2:].strip())
        elif line.strip() and not line.startswith("%"):
            body.append(line)
    sig, lily_key = key_info(hdr.get("K", "C"))
    L = F(hdr.get("L", "1/8"))
    meter = hdr.get("M", "none")
    unmetered = meter == "none"
    text = " ".join(body)

    # pass 1: events
    ev = []          # {kind: note|rest|chord|bar|grace, ...}
    pre = []         # post-events waiting for the next note (decorations, annotations)
    slur_open, tup, bar_acc, group = False, None, {}, 0
    pos = 0
    while pos < len(text):
        m = TOKEN.match(text, pos)
        if not m:
            raise ValueError("can't read %r in %r" % (text[pos:pos + 12], text))
        pos = m.end()
        g = m.lastgroup
        if g == "ws":
            group += 1
        elif g == "bar":
            ev.append(dict(kind="bar", bar=m.group("bar")))
            bar_acc = {}
            group += 1
        elif g == "deco":
            name = m.group("deco")[1:-1]
            if name not in DECOS:
                raise ValueError("decoration " + name)
            pre.append(DECOS[name])
        elif g == "short":
            pre.append(DECOS[m.group("short")])
        elif g == "quote":
            q = m.group("quote")[1:-1]
            if q[:1] in "^_":
                pre.append("%s\\markup { \\small \"%s\" }" % (q[0], q[1:].replace('"', '\\"')))
            elif q[:1] in "<>@":
                pre.append("^\\markup { \\small \"%s\" }" % q[1:])
            else:
                pre.append("^\\markup { \\bold \"%s\" }" % q)
        elif g == "grace":
            gtxt = m.group("grace")[1:-1]
            slash = gtxt.startswith("/")
            notes = []
            for nm in NOTE.finditer(gtxt.lstrip("/")):
                d = mult(nm.group(4)) * L if nm.group(4) else F(1, 8)
                notes.append((pitch(nm.group(2), nm.group(1), nm.group(3), sig, dict(bar_acc)), d))   # (a grace's accidental is its own)
            ev.append(dict(kind="grace", slash=slash, notes=notes))
        elif g == "tuplet":
            tp = int(m.group("tn")); tq = int(m.group("tq")) if m.group("tq") else {2: 3, 3: 2, 4: 3, 6: 2, 8: 3}.get(tp, 2)
            tr = int(m.group("tr")) if m.group("tr") else tp
            tup = dict(p=tp, q=tq, n=tr, left=tr)
        elif g == "slur":
            if m.group("slur") == "(":
                slur_open = True
            else:
                for e in reversed(ev):
                    if e["kind"] in ("note", "chord"):
                        e["post"].append(")")
                        break
        elif g in ("note", "chord", "rest"):
            if g == "note":
                p = [pitch(m.group("let"), m.group("acc"), m.group("oct"), sig, bar_acc)]
                d = mult(m.group("len")) * L
            elif g == "chord":
                p = [pitch(n.group(2), n.group(1), n.group(3), sig, bar_acc) for n in NOTE.finditer(m.group("cnotes"))]
                first = NOTE.search(m.group("cnotes"))
                d = mult(m.group("clen")) * mult(first.group(4) if first else "") * L
            else:
                p = None
                d = mult(m.group("rlen")) * L
            e = dict(kind=g if g != "rest" else ("space" if m.group("rk") == "x" else "rest"), pitches=p, dur=d,
                     post=list(pre), group=group, tup=None)
            pre = []
            if slur_open and g != "rest":
                e["post"].append("(")
                slur_open = False
            if tup:
                e["tup"] = "start" if tup["left"] == tup["n"] else ("end" if tup["left"] == 1 else "mid")
                if tup["n"] == 1:
                    e["tup"] = "both"
                e["tupq"] = (tup["p"], tup["q"])
                e["dur"] = d * F(tup["q"], tup["p"])
                tup["left"] -= 1
                if tup["left"] == 0:
                    tup = None
            ev.append(e)
        elif g == "broken":
            k = len(m.group("broken"))
            prev = next(e for e in reversed(ev) if e["kind"] in ("note", "chord", "rest"))
            a, b = (F(2) - F(1, 2 ** k)), F(1, 2 ** k)
            if m.group("broken")[0] == "<":
                a, b = b, a
            prev["dur"] *= a
            ev.append(dict(kind="broken", factor=b))
        elif g == "tie":
            for e in reversed(ev):
                if e["kind"] in ("note", "chord"):
                    e["post"].append("~")
                    break
    # apply broken rhythm to the note after each marker
    out_ev = []
    factor = None
    for e in ev:
        if e["kind"] == "broken":
            factor = e["factor"]
            continue
        if factor and e["kind"] in ("note", "chord", "rest", "space"):
            e["dur"] *= factor
            factor = None
        out_ev.append(e)
    ev = out_ev

    # beams: notes shorter than a quarter written together
    groups = {}
    for i, e in enumerate(ev):
        if e["kind"] in ("note", "chord") and e["dur"] * (F(e["tupq"][0], e["tupq"][1]) if e.get("tup") else 1) < F(1, 4):
            groups.setdefault(e["group"], []).append(i)
    for idx in groups.values():
        run = [idx[0]]
        for a, b in zip(idx, idx[1:]):
            if b == a + 1 or all(ev[k]["kind"] == "grace" for k in range(a + 1, b)):
                run.append(b)
            else:
                if len(run) > 1:
                    ev[run[0]]["post"].append("[")
                    ev[run[-1]]["post"].append("]")
                run = [b]
        if len(run) > 1:
            ev[run[0]]["post"].append("[")
            ev[run[-1]]["post"].append("]")

    # pass 2: LilyPond
    music, total, first_bar = [], F(0), None
    for e in ev:
        k = e["kind"]
        if k == "bar":
            if first_bar is None:
                first_bar = total
            b = e["bar"]
            if unmetered or b != "|":
                music.append('\\bar "%s"' % {"|": "|", "||": "||", "|]": "|.", "|:": ".|:", ":|": ":|.", "[|": ".|"}[b])
            else:
                music.append("|")
            continue
        if k == "grace":
            notes = " ".join(p + dur_str(d)[0] for p, d in e["notes"])
            cmd = "\\acciaccatura" if e["slash"] else ("\\appoggiatura" if len(e["notes"]) == 1 else "\\grace")
            music.append("%s { %s }" % (cmd, notes))
            continue
        written = e["dur"] * (F(e["tupq"][0], e["tupq"][1]) if e.get("tup") else 1)
        ds = dur_str(written)
        post = "".join(x for x in e["post"] if x in ("(", ")", "[", "]"))
        arts = " ".join(x for x in e["post"] if x not in ("(", ")", "[", "]", "~"))
        tie = "~" if "~" in e["post"] else ""
        if k in ("rest", "space"):
            sym = "r" if k == "rest" else "s"
            parts = [sym + d for d in ds]
            if arts:
                parts[0] += arts
            tok = " ".join(parts)
        else:
            head = e["pitches"][0] if k == "note" else "<%s>" % " ".join(e["pitches"])
            parts = [head + d for d in ds]
            tok = " ~ ".join(parts) + (" " + arts if arts else "") + post + tie
            tok = tok.replace(" -", "-").replace(" \\", "\\").replace(" ^", "^").replace(" _", "_")
        if e.get("tup") in ("start", "both"):
            tok = "\\tuplet %d/%d { " % e["tupq"] + tok
        if e.get("tup") in ("end", "both"):
            tok = tok + " }"
        music.append(tok)
        total += e["dur"]

    lines = ["\\key " + lily_key]
    if unmetered:
        lines += ["\\omit Staff.TimeSignature", "\\cadenzaOn"]
    else:
        lines.append("\\time " + meter)
        bar_len = F(meter)
        if first_bar is not None and 0 < first_bar < bar_len:
            lines.append("\\partial " + dur_str(first_bar)[0] if len(dur_str(first_bar)) == 1 else "\\partial %d*%d" % (first_bar.denominator, first_bar.numerator))
    if "Q" in hdr:
        q = re.match(r"(\d+)/(\d+)\s*=\s*(\d+)", hdr["Q"])
        if q:
            lines.append("\\tempo %s = %s" % (dur_str(F(int(q.group(1)), int(q.group(2))))[0], q.group(3)))
    return hdr.get("T", ""), lines, " ".join(music)


def wrap(lines, music):
    return "{\n    " + "\n    ".join(lines) + "\n    " + music + "\n  }"


# The rows' lily= signs were checked against scans (Oct 2026): Bach's Explication in the Clavierbüchlein and Henle's engraving
# of it (blog.henle.de, 2015/04); Geminiani 1751, Essempio XVIII (IMSLP05501, p. 26); Purcell 1696, "Rules for Graces"
# (Wikimedia Commons, File:Purcell - Rules for Graces.jpg); Couperin, L'art de toucher (IMSLP22200, pp. 6-7: pincé, port de voix).
# Signs LilyPond has no glyph for are drawn here: a mark just left of the notehead
# (Bach's accent hooks, Purcell's forefall and backfall strokes) and Purcell's shake strokes above the stem.
HELPERS = r"""
leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }
"""


def lily_signs():
    import glob
    import importlib.util
    out = {}
    for f in sorted(glob.glob("scripts/ornaments/*.py")):
        spec = importlib.util.spec_from_file_location("orn_" + os.path.basename(f)[:-3].replace("-", "_"), f)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        for t in getattr(m, "TABLES", []):
            for r in t["rows"]:
                if r.get("lily"):
                    out[(t["id"], html.unescape(re.sub(r"<[^>]+>", "", r["name"])), r["sign"].strip())] = r["lily"]
    return out


def body_of(abc):
    b = " ".join(l for l in abc.splitlines() if not re.match(r"^[A-Za-z]:", l)).strip()
    return re.sub(r"\s*\|\]\s*$", "", b).strip()


def examples():
    s = open(PAGE).read()
    seen, out = set(), []
    heads = [(m.start(), m.group(2).strip()) for m in re.finditer(r"^(#{2,4}) (.*)$", s, re.M)]
    for m in re.finditer(r'<div class="abc-ex[^>]*>\s*<script type="text/plain">(.*?)</script>', s, re.S):
        abc = m.group(1).strip()
        head = ""
        for p, h in heads:
            if p < m.start():
                head = re.sub(r"[*_`]", "", h)
        tr = s.rfind("<tr>", 0, m.start())
        row = ""
        if tr > max([p for p, _ in heads if p < m.start()] or [0]) and "</table>" not in s[tr:m.start()]:
            em = re.search(r"<em>(.*?)</em>", s[tr:m.start()])
            row = html.unescape(re.sub(r"<[^>]+>", "", em.group(1))) if em else ""
        mk = list(re.finditer(r"<!-- ornament-table: ([\w-]+) -->", s[:m.start()]))
        table = mk[-1].group(1) if mk and mk[-1].start() > max([p for p, _ in heads if p < m.start()] or [0]) else ""
        if (abc, head, row) in seen:      # (a pair draws its played version twice; rows that look alike in ABC are kept apart)
            continue
        seen.add((abc, head, row))
        line = s.count("\n", 0, m.start()) + 1
        out.append(dict(abc=abc, head=head, row=row, line=line, table=table))
    return out


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:40] or "example"


def main():
    exs = examples()
    os.makedirs(OUT + "/examples", exist_ok=True)
    for f in os.listdir(OUT + "/examples"):
        if f.endswith(".ly"):
            os.remove(os.path.join(OUT + "/examples", f))
    head = ['\\version "%s"' % VERSION, "\\header { tagline = ##f }", "\\paper { indent = 0 }", HELPERS, ""]
    allp = list(head)
    bad, used, signs, found = 0, 0, lily_signs(), set()
    for i, x in enumerate(exs, 1):
        try:
            title, lines, notes = convert(x["abc"])
            own = signs.get((x["table"], x["row"], body_of(x["abc"])))
            if own:                               # the source's own sign, which ABC can't draw
                notes = own + ' \\bar "|."'
                used += 1
                found.add((x["table"], x["row"], body_of(x["abc"])))
            music = wrap(lines, notes)
        except (ValueError, SystemExit, StopIteration, KeyError) as err:
            print("SKIPPED %s:%d %s\n%s\n" % (PAGE, x["line"], err, x["abc"]))
            bad += 1
            continue
        label = " — ".join(t for t in (x["head"], x["row"], title) if t)
        piece = label.replace('"', "'")
        score = '\\score {\n  \\header { piece = "%d. %s" }\n  %s\n  \\layout { }\n}\n' % (i, piece, music)
        src = "%% %s line %d\n%% ABC:\n%s\n" % (PAGE, x["line"], "\n".join("%   " + l for l in x["abc"].splitlines()))
        name = "%03d-%s.ly" % (i, slug(x["row"] or title or x["head"]))
        with open(os.path.join(OUT, "examples", name), "w") as f:
            f.write("\n".join(head) + src + score.replace("\\layout { }", "\\layout { }\n  \\midi { }"))
        allp.append(src + score)
    for k in signs:
        if k not in found:
            print("NOT ON THE PAGE: table %r, row %r, sign %r" % k)
    with open(os.path.join(OUT, "all-examples.ly"), "w") as f:
        f.write("\n".join(allp))
    print("%d examples -> %s/examples/ and %s/all-examples.ly (%d skipped; %d of %d source signs used)" % (len(exs) - bad, OUT, OUT, bad, used, len(signs)))


if __name__ == "__main__":
    main()
