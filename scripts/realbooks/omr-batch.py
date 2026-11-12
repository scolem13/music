# Batch OMR of real-book pages with homr, plus a repair pass, into ~/Projects/corpora/omr-runs (never in the repo).
# Picks the tunes in the most books, one printing each, from the books most likely to read well (tier 1-2, treble clef, concert).
# Per page: page.png, homr .musicxml, fixed .musicxml, .abc, and a line in results.jsonl with a bar-length score.
# Run with the omr-test venv:  ~/Projects/corpora/omr-test/venv/bin/python scripts/realbooks/omr-batch.py --limit 10 [--jobs 2]
import argparse, json, os, re, subprocess, sys, time, copy
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction

HOME = os.path.expanduser("~")
REPO = os.path.join(os.path.dirname(__file__), "../..")
PDFS = f"{HOME}/Projects/corpora/realBooks"
OUT = f"{HOME}/Projects/corpora/omr-runs"
VENV = f"{HOME}/Projects/corpora/omr-test/venv/bin"
XML2ABC = f"{HOME}/Projects/corpora/omr-test/x2a/xml2abc_177/xml2abc.py"

# Books in order of preference (best expected OMR first). openbook is left out: it has LilyPond sources.
PREFER = ["TV_Guide_Fake_Book.pdf", "The_New_Bob_Book.pdf", "PublicDomainChristmasFakebook.pdf", "Real_Book_All_New_Vol3.pdf",
          "The_Colorado_Cookbook.pdf", "Standards_Real_Book.pdf", "Just_Standards_Real_Book.pdf", "New_Real_Book_Volume1.pdf",
          "New_Real_Book_Volume3.pdf", "New_Real_Book_Volume2.pdf", "Latin-Real-Book.pdf", "50s_Jazz_Fake_Book.pdf",
          "Cuban_Fake_Book.pdf", "Legit_Professional_Real_Book.pdf", "Dixieland-C-Book.pdf", "Django_Fake_Book.pdf"]

def load_catalogue():
    s = open(f"{REPO}/apps/realbooks/catalogue-data.js").read()
    return json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))

def queue(D, books_filter=None):
    files = [b["file"] for b in D["books"]]
    rank = {files.index(f): i for i, f in enumerate(PREFER) if f in files}
    if books_filter: rank = {b: r for b, r in rank.items() if files[b] in books_filter}
    starts = {}   # book -> sorted tune start pages, and how many tunes start on each page
    for t in D["tunes"]:
        for a in t["at"]: starts.setdefault(a[0], []).append(a[1])
    jobs = []
    for t in D["tunes"]:
        n = len({a[0] for a in t["at"]})
        ok = [a for a in t["at"] if a[0] in rank and a[3] != "low" and starts[a[0]].count(a[1]) == 1]   # skip pages shared by several tunes
        best = sorted(ok, key=lambda a: (rank[a[0]], a[3] != "high"))
        if best:
            b, p = best[0][0], best[0][1]
            nxt = min([x for x in starts[b] if x > p], default=p + 1)
            jobs.append((n, t["t"], files[b], p, best[0][2], best[0][3], min(nxt - p, 3)))
    jobs.sort(key=lambda j: -j[0])
    return jobs

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50]

# --- repair pass on homr's MusicXML -------------------------------------------------------------
STEPS = "CDEFGAB"
def clef_mid(sign, line):   # diatonic number of the middle staff line under this clef
    base = {"G": (4, 4), "F": (3, 3), "C": (0, 4)}[sign]   # (step index, octave) of the clef's own note
    num = base[0] + 7 * base[1]
    return num + 2 * (3 - int(line))

TREBLE_MID = clef_mid("G", 2)

def repair(tree):
    """Force treble clef everywhere (moving notes read under a wrong clef), and set the meter from the bars."""
    root = tree.getroot(); notes_fixed = 0; shift = 0
    for m in root.iter("measure"):
        for el in list(m):
            if el.tag == "attributes":
                c = el.find("clef")
                if c is not None and c.findtext("sign") in "GFC":
                    shift = TREBLE_MID - clef_mid(c.findtext("sign"), c.findtext("line") or 2)
                    c.find("sign").text = "G"; c.find("line").text = "2"
            elif el.tag == "note" and shift:
                p = el.find("pitch")
                if p is None: continue
                n = STEPS.index(p.findtext("step")) + 7 * int(p.findtext("octave")) + shift
                p.find("step").text = STEPS[n % 7]; p.find("octave").text = str(n // 7); notes_fixed += 1
    # meter: homr often writes 2/2 for 4/4; take the most common bar length instead
    lens = bar_lengths(root)
    common = max(set(lens), key=lens.count) if lens else None
    t = root.find(".//time")
    if t is not None and common:
        cur = Fraction(int(t.findtext("beats")), int(t.findtext("beat-type"))) * 4
        if common != cur and common in (2, 3, 4) and lens.count(common) > len(lens) / 2:
            t.find("beats").text, t.find("beat-type").text = str(int(common)), "4"
        elif cur == 4 and t.findtext("beats") == "2": t.find("beats").text, t.find("beat-type").text = "4", "4"
    return notes_fixed

def bar_lengths(root):
    div = 1; out = []
    for m in root.iter("measure"):
        d = m.find(".//divisions")
        if d is not None: div = int(d.text)
        tot = Fraction(0)
        for n in m.findall("note"):
            if n.find("chord") is not None or n.find("grace") is not None or n.findtext("voice", "1") != "1": continue
            tot += Fraction(int(n.findtext("duration", "0")), div)
        out.append(tot)
    return out

def score(root):
    lens = bar_lengths(root); t = root.find(".//time")
    if t is None or not lens: return {"bars": len(lens), "ok": 0, "frac": 0}
    want = Fraction(int(t.findtext("beats")), int(t.findtext("beat-type"))) * 4
    inner = lens[1:-1] if len(lens) > 2 else lens       # first and last bars may be pickups
    ok = sum(1 for x in inner if x == want)
    return {"bars": len(lens), "ok": ok, "frac": round(ok / max(1, len(inner)), 2), "meter": f'{t.findtext("beats")}/{t.findtext("beat-type")}'}

def key_alts(fifths):
    return {st: (1 if st in "FCGDAEB"[:fifths] else 0) if fifths >= 0 else (-1 if st in "BEADGCF"[:-fifths] else 0) for st in STEPS}

def respell(part, tune_key):
    """homr spells notes against whatever key it read for each printed line (often none on later lines) and gives no
    accidental marks. A note that differs from homr's own key there had a printed accidental: keep it, carried through
    the bar. Every other note takes the tune's key."""
    want_key, homr_key = key_alts(tune_key), key_alts(tune_key)
    changed = 0
    for m in part.findall("measure"):
        for f in m.iter("fifths"): homr_key = key_alts(int(f.text))
        held = {}
        for n in m.findall("note"):
            p = n.find("pitch")
            if p is None: continue
            st, octv = p.findtext("step"), p.findtext("octave")
            cur = int(float(p.findtext("alter") or 0))
            if cur != homr_key[st]: held[st + octv] = cur
            want = held.get(st + octv, want_key[st])
            if cur != want:
                changed += 1
                al = p.find("alter")
                if want == 0: p.remove(al)
                else:
                    if al is None: al = ET.Element("alter"); p.insert(1, al)
                    al.text = str(want)
    return changed

def add_breaks(part):
    """Add <print new-system="yes"/> to bars whose first note sits on a different printed line from the bar before."""
    prev = None; n = 1
    for m in part.findall("measure"):
        y = None
        for c in m.iter():
            if c.tag is ET.Comment and "imgpos" in (c.text or ""):
                y = int(c.text.split(",")[1]); break
        if y is not None:
            if prev is not None and abs(y - prev) > 150:   # a system is ~90px of staff at 300 dpi plus lyrics and chords
                m.insert(0, ET.Element("print", {"new-system": "yes"})); n += 1
            prev = y
    return n

# --- one page ---------------------------------------------------------------------------------------
def run(job):
    n, title, file, pdfPage, page, conf, span = job
    d = f"{OUT}/{slug(file[:-4])}"; os.makedirs(d, exist_ok=True)
    base = f"{d}/{pdfPage:04d}-{slug(title)}"
    rec = {"title": title, "books": n, "file": file, "pdfPage": pdfPage, "page": page, "conf": conf, "base": os.path.relpath(base, OUT), "span": span}
    if os.path.exists(base + ".json"): return json.load(open(base + ".json"))
    t0 = time.time()
    try:
        trees = []
        for i in range(span):
            b = base if i == 0 else f"{base}.p{i+1}"
            if not os.path.exists(b + ".png"):
                subprocess.run(["pdftoppm", "-r", "300", "-gray", "-png", "-singlefile", "-f", str(pdfPage + i), "-l", str(pdfPage + i), f"{PDFS}/{file}", b], check=True)
            if not os.path.exists(b + ".musicxml"):
                r = subprocess.run([f"{VENV}/homr", b + ".png"], capture_output=True, text=True, timeout=600)
                if not os.path.exists(b + ".musicxml"):
                    if i == 0: raise RuntimeError("homr: no output " + r.stderr[-300:])
                    break
            trees.append(ET.parse(b + ".musicxml", ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))))
        tree = trees[0]
        rec["raw"] = score(tree.getroot())
        rec["clefFixed"] = sum(repair(t) for t in trees)
        k = tree.find(".//key/fifths"); tune_key = int(k.text) if k is not None else 0
        rec["respelled"] = sum(respell(t.getroot().find("part"), tune_key) for t in trees)
        part = tree.getroot().find("part")
        for t in trees[1:]:
            for m in t.getroot().find("part").findall("measure"): part.append(m)
        first = True   # keep only the first clef and time signature; renumber bars
        for k, m in enumerate(part.findall("measure")):
            m.set("number", str(k + 1))
            for at in m.findall("attributes"):
                for tag in ("clef", "time", "key"):   # homr often misses key signatures on later systems; lead sheets rarely change key
                    for e in at.findall(tag):
                        if not first: at.remove(e)
                if at.find("clef") is not None: first = False
            if k == 0: first = False
        # line breaks where the printed page has them: homr leaves each note's page position in a comment
        ms = part.findall("measure")   # drop trailing bars that are only rests
        while len(ms) > 1 and not any(n.find("pitch") is not None for n in ms[-1].findall("note")): part.remove(ms.pop())
        rec["lines"] = add_breaks(part)
        wt = tree.find(".//work-title")
        if wt is not None: wt.text = title
        tree.write(base + ".fixed.musicxml", encoding="utf-8", xml_declaration=True)
        rec.update(score(tree.getroot()))
        a = subprocess.run([sys.executable, XML2ABC, "-o", d, base + ".fixed.musicxml"], capture_output=True, text=True)
        abc = base + ".fixed.abc"
        if os.path.exists(abc): os.replace(abc, base + ".abc")
        rec["xml2abc"] = len(re.findall(r"longer than metre|shorter", a.stderr))
    except Exception as e:
        rec["error"] = str(e)[:400]
    rec["secs"] = round(time.time() - t0)
    json.dump(rec, open(base + ".json", "w"))
    return rec

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=10); ap.add_argument("--skip", type=int, default=0)
    ap.add_argument("--jobs", type=int, default=2); ap.add_argument("--books", nargs="*")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    q = queue(load_catalogue(), a.books)[a.skip:a.skip + a.limit]
    print(len(q), "pages", flush=True)
    with ThreadPoolExecutor(a.jobs) as ex, open(f"{OUT}/results.jsonl", "a") as log:
        for rec in ex.map(run, q):
            log.write(json.dumps(rec) + "\n"); log.flush()
            print(rec.get("frac"), rec.get("bars"), rec["title"], rec["file"], rec.get("error", ""), f'{rec["secs"]}s', flush=True)
