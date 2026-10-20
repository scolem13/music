#!/usr/bin/env python3
"""Convert the Musical Theme Dataset's engraved scores (MusicXML) into the Classical Themes' ABC sources.

    pip install abc-xml-converter      # Wim Vree's xml2abc, packaged
    python3 scripts/convert-mtd.py [~/Downloads/MTD_1.0.0/MTD] [../classical-music-themes]

MTD (Zalkow, Balke, Arifi-Mueller, Mueller, TISMIR 2020; CC BY 4.0): 2,067 themes of Barlow & Morgenstern's
Dictionary of Musical Themes, newly engraved. Each records its number in the Electronic Dictionary of Musical
Themes (EDMID), which is the numbering of ../classical-music-themes, so titles, composers and recording links
are taken from its tsvs/themes.tsv. (That repo's own ABC, midi2abc output from the EDM's MIDI, is not used: it
lost pickups and triplets and has octave errors.)

Writes scripts/theme-sources/mtd/<EDMID>.abc (one voice: the melody, voice 1), and for the themes engraved with
more than one voice also scripts/theme-sources/mtd-two-voice/<EDMID>.abc (every voice), named in a comment in
the one-voice file. Themes MTD splits in two get -1 / -2 after the number. Then run node scripts/import-themes.mjs.
"""
import glob, json, os, re, sys
import xml.etree.ElementTree as ET
import abc_xml_converter as x2a

mtd = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/MTD_1.0.0/MTD")
cmt = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "../../classical-music-themes"))
here = os.path.dirname(os.path.abspath(__file__))
out1, out2 = os.path.join(here, "theme-sources/mtd"), os.path.join(here, "theme-sources/mtd-two-voice")
for d in (out1, out2):
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(d + "/*.abc"): os.remove(f)

# each theme's tempo in its recording (scripts/mtd-tempo.py), written as Q:1/4=N so it plays at that tempo
import importlib.util
_spec = importlib.util.spec_from_file_location("mtd_tempo", os.path.join(here, "mtd-tempo.py"))
_mt = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mt)
TEMPO = _mt.tempos(mtd)

# each theme's movement from its recording's MusicBrainz track title (scripts/mtd-movements.py; run that first)
mv_file = os.path.join(here, "theme-sources/mtd-movements.json")
MOVES = json.load(open(mv_file, encoding="utf-8")) if os.path.exists(mv_file) else {}

# the bar of the complete movement where each theme begins (scripts/pdmx-match.py, from PDMX scores), written as %%bar N
# (abcjs ignores it: nothing is drawn). A theme with an upbeat gets the bar it leads into.
bar_file = os.path.join(here, "theme-sources/pdmx-matches.json")
BARS = json.load(open(bar_file, encoding="utf-8")) if os.path.exists(bar_file) else {}

rows = {}
for line in open(os.path.join(cmt, "tsvs/themes.tsv"), encoding="utf-8"):
    p = line.rstrip("\n").split("\t")
    if len(p) >= 4: rows[p[0]] = p

TYPE = {"breve": 0.5, "whole": 1, "half": 2, "quarter": 4, "eighth": 8, "16th": 16, "32nd": 32, "64th": 64, "128th": 128}

def tidy_xml(path):
    """Two Sibelius quirks, fixed in the MusicXML before converting:
    - tuplet notes are stored rounded (a triplet eighth is 85 or 86 ticks of 256, not 85 1/3), which xml2abc writes as
      lengths like G33/64: every length is scaled up (so tuplets divide evenly) and each tuplet note gets its exact value;
    - an 8va line makes xml2abc write the notes an octave lower under !8va(!, which abcjs can't draw: the line is
      dropped, so the notes are written where they sound (MusicXML's pitches are the sounding ones)."""
    from math import lcm
    tree = ET.parse(path); root = tree.getroot()
    acts = [int(e.text) for e in root.iter("actual-notes")] or [1]
    f = lcm(*acts)
    div = None
    for m in root.iter("measure"):
        for el in list(m):
            if el.tag == "direction" and el.find(".//octave-shift") is not None: m.remove(el); continue
            d = el.find("divisions") if el.tag == "attributes" else None
            if d is not None: div = int(d.text); d.text = str(div * f)
            dur = el.find("duration")
            if dur is None: continue
            tm = el.find("time-modification") if el.tag == "note" else None
            typ = el.findtext("type")
            if tm is not None and typ in TYPE and div:
                dots = len(el.findall("dot"))
                nominal = div * f * 4 / TYPE[typ] * (2 - 0.5 ** dots)
                exact = nominal * int(tm.findtext("normal-notes")) / int(tm.findtext("actual-notes"))
                dur.text = str(round(exact))
            else:
                dur.text = str(int(dur.text) * f)
    return ET.tostring(root, encoding="unicode")

def body_of(abc, voice):
    """The tune lines of one voice (xml2abc writes 'V:n' then its music; '%n' bar-count comments dropped)."""
    out, cur = [], None
    for ln in abc.splitlines():
        m = re.match(r"^V:(\S+)\s*$", ln)
        if m: cur = m.group(1); continue
        if cur == voice and not re.match(r"^[A-Za-z]:", ln): out.append(re.sub(r"\s*%\d+\s*$", "", ln).strip())
    return " ".join(x for x in out if x)

def head(abc, k):
    m = re.search(r"^" + k + r":(.*)$", abc, re.M)
    return m.group(1).strip() if m else ""

n = two = 0; missing = []
for jf in sorted(glob.glob(mtd + "/data_META/*.json")):
    meta = json.load(open(jf, encoding="utf-8"))
    mid, edms = meta["MTDID"], [e.zfill(4) for e in meta["EDMID"].split("+")]
    edm = edms[0]   # a theme that is two EDM entries ("0475+0476") is filed under the first
    xml = glob.glob(mtd + "/data_SCORE_XML/MTD" + mid + "_*.xml")
    if not xml or edm not in rows: missing.append(mid); continue
    part = mid.split("-")[1] if "-" in mid else ""
    tid = edm + ("-" + part if part else "")
    r = rows[edm]
    title = r[3] + (" (part " + part + ")" if part else "")
    abc = x2a.convert_xml2abc(file_to_convert=tidy_xml(xml[0]), file_to_convert_is_txt=True, no_line_breaks=True)
    # ornaments on grace notes (T trill, M mordent, ...): abcjs can't read them there
    abc = re.sub(r"\{([^}]*)\}", lambda m: "{" + re.sub(r"[H-Wh-w~.]", "", m.group(1)) + "}", abc)
    abc = re.sub(r"\(1:1:\d+", "", abc)   # a tuplet of 1 in the time of 1 changes nothing (and nests, which abcjs can't read)
    voices = re.findall(r"^V:(\S+)\s*$", abc, re.M)
    hdr = ["X:" + str(int(edm)), "T:" + title, "C:" + r[2] + " " + r[1], "%%composer " + r[1] + "|" + r[2],
           "% MTD " + mid + ", Barlow & Morgenstern " + meta["BMID"] + ", EDM " + "+".join(edms) + " (Musical Theme Dataset, CC BY 4.0)"]
    if len(r) > 4 and r[4]: hdr.append("%%link " + r[4])
    mv = (MOVES.get(tid) or {}).get("tempo")
    if mv: hdr.append("N:" + mv + "  % the movement, from MusicBrainz (scripts/mtd-movements.py)")
    bm = BARS.get(tid)
    if bm and bm.get("complete"):
        one = " one-score" if bm.get("sources") == 1 else ""   # only one PDMX score has it: no second score agreed
        hdr.append("%%bar " + str(bm["bar"]) + one + "  % bar of the complete movement (scripts/pdmx-match.py, PDMX score)")
    if len(voices) > 1:
        hdr.append("% More than one voice in the score: the melody (voice 1) only. All voices: scripts/theme-sources/mtd-two-voice/" + tid + ".abc")
        full = re.sub(r"^X:.*\nT:.*$", "\n".join(hdr[:3]), abc, count=1, flags=re.M)
        full = re.sub(r"^I:linebreak.*\n", "", full, flags=re.M).replace(' nm="P1" snm="Solo"', "")
        if mid in TEMPO: full = re.sub(r"^(M:.*)$", lambda m: m.group(1) + "\nQ:1/4=" + str(TEMPO[mid]), full, count=1, flags=re.M)
        open(os.path.join(out2, tid + ".abc"), "w", encoding="utf-8").write(full.rstrip() + "\n"); two += 1
    music = body_of(abc, voices[0] if voices else "1")
    # xml2abc fills the rest of the last bar with invisible rests (x); an incipit may stop mid-bar
    end = re.search(r"((\s*x\d*(/\d*)?)|(\s*\|+))+\s*$", music)
    if end and "x" in end.group(0): music = music[:end.start()].rstrip() + " |"
    q = ["Q:1/4=" + str(TEMPO[mid]), "% Q: the tempo in MTD's recording (scripts/mtd-tempo.py)"] if mid in TEMPO else []
    one = "\n".join(hdr + ["M:" + head(abc, "M"), "L:" + head(abc, "L")] + q + ["K:" + head(abc, "K"), music]) + "\n"
    open(os.path.join(out1, tid + ".abc"), "w", encoding="utf-8").write(one); n += 1

print("wrote", n, "themes to", out1, "and", two, "with every voice to", out2)
if missing: print("skipped (no score or no EDM row):", missing)
