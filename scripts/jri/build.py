#!/usr/bin/env python3 -I
"""build.py: the JRI tunes (teacher books K-4, Song Collections 1-2) as Works entries with no notation (ABC comes later).

  python3 -I scripts/jri/build.py [digests-dir] [--write]

Reads the OCR digests (default ~/org/jri/digests/B-books-K-1-2.md, C-books-3-4-songs2.md), dedupes by normalised title, links an
entry to a Tune Library tune of the same title (in.tune), and links its recording by (book, Teacher's Edition page) against
apps/shared/mlt/recordings.js (the Music Curriculum CDs jrim*). Writes the block between "jri:begin" and "jri:end" in
apps/shared/works/works-data.js (merged into hand entries of the same id; never edit inside the block).
Fields are OCR-derived and unverified ("src":"ocr"); a "-" or "?" in a digest cell is left out, not guessed.
"""
import re, sys, json, os, difflib, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DIG = args[0] if args else os.path.expanduser("~/org/jri/digests")
WRITE = "--write" in sys.argv
BOOKNAME = {"k": "Kindergarten", "1": "Book 1", "2": "Book 2", "3": "Book 3", "4": "Book 4"}

def norm(s):
    s = re.sub(r"\(.*?\)", "", s.lower()); s = re.sub(r"[^a-z0-9 ]", "", s)
    s = re.sub(r"^(the|a|an) ", "", s); return re.sub(r"\s+", " ", s).strip()
def slug(s): return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
def clean(v):
    v = v.strip()
    return None if v in ("", "-", "?", "NA") else v

def tables(path, secs):
    sec = None
    for l in open(path, encoding="utf8"):
        if l.startswith("###"): sec = l
        if l.startswith("|") and sec:
            key = next((k for k in secs if k in sec), None)
            if not key: continue
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            if len(c) < 5 or set(c[0]) <= set("-: ") or c[0].lower() in ("title", "#", "song #"): continue
            yield secs[key], c

plans = []   # one per teacher-book plan
for bk, c in tables(DIG + "/B-books-K-1-2.md", {"9A": "k", "9B": "1", "9C": "2"}):
    te, pdf = (c[1].split("/") + [""])[:2]
    lsa = c[9]
    t = re.search(r"T\s+([^;]*)", lsa); r = re.search(r"R\s+(.*)", lsa)
    plans.append(dict(book=bk, title=c[0], te=te.strip(), pdf=pdf.strip(), activity=clean(c[2]), tonality=clean(c[3]), meter=clean(c[4]),
                      key=clean(c[5]), track=clean(c[6]), tempo=clean(c[7]), form=clean(c[8]),
                      lsa_t=clean(t.group(1)) if t else None, lsa_r=clean(r.group(1)) if r else None))
for bk, c in tables(DIG + "/C-books-3-4-songs2.md", {"### A.": "3", "### B.": "4"}):
    plans.append(dict(book=bk, title=c[0], te=c[1].replace("~", "").strip(), pdf=c[2], tonality=clean(c[3]), resting=clean(c[4]), meter=clean(c[5]),
                      key=clean(c[6]), activity=clean(c[7]), lsa_t=clean(c[8]), lsa_r=clean(c[9])))
songs = []
for k, c in tables(DIG + "/B-books-K-1-2.md", {"9D": 1}):
    songs.append(dict(coll=1, num=c[0], title=c[2], source=clean(c[4]), card=clean(c[5])))
for k, c in tables(DIG + "/C-books-3-4-songs2.md", {"### C.": 2}):
    songs.append(dict(coll=2, num=c[0], title=c[1], card=clean(c[3])))

# library tunes by title
tunes = {}
t = open(ROOT + "/apps/tunes/tunes-object.js", encoding="utf8").read()
for blk in t.split("\nX:")[1:]:
    mt = re.search(r"^T:(.+)$", blk, re.M); mi = re.search(r"^%%id (\S+)", blk, re.M)
    if mt and mi: tunes.setdefault(norm(mt.group(1)), mi.group(1))
# works that already hold a tune
wd = open(ROOT + "/apps/shared/works/works-data.js", encoding="utf8").read()
head = wd.split("// print-books:begin")[0]
workof = {}
for m in re.finditer(r'^  "([^"]+)": \{', head, re.M):
    seg = head[m.end():m.end() + 600]
    mm = re.search(r'"tune":\s*\[\s*((?:"[^"]+"\s*,?\s*)+)\]', seg)
    if mm:
        for tid in re.findall(r'"([^"]+)"', mm.group(1)): workof.setdefault(tid, m.group(1))
existing_ids = set(re.findall(r'^  "([^"]+)": \{', head, re.M))

# recordings by (book, TE page)
rt = open(ROOT + "/apps/shared/mlt/recordings.js", encoding="utf8").read()
recs = []
for m in re.finditer(r'^\s*(\{"id".*\})\s*,?$', rt, re.M):
    try: r = json.loads(m.group(1))
    except ValueError: continue
    if r.get("col", "").startswith("jrim") and r.get("page") and r.get("r2"): recs.append(r)
bypage = collections.defaultdict(list)
for r in recs:
    b = r["col"][4]; bypage[(b, str(r["page"]).split("-")[0].strip())].append(r)
plans_on = collections.Counter((p["book"], p["te"]) for p in plans)
def rec_for(p):
    cand = bypage.get((p["book"], p["te"]), [])
    if not cand: return None
    best = max(cand, key=lambda r: difflib.SequenceMatcher(None, norm(p["title"]), norm(re.sub(r"\bp\.?\s*\d+.*$", "", r["title"], flags=re.I))).ratio())
    ratio = difflib.SequenceMatcher(None, norm(p["title"]), norm(re.sub(r"\bp\.?\s*\d+.*$", "", best["title"], flags=re.I))).ratio()
    return best if ratio >= 0.5 or (len(cand) == 1 and plans_on[(p["book"], p["te"])] == 1) else None

entries = collections.OrderedDict()
def entry(title):
    k = norm(title)
    if k not in entries: entries[k] = dict(title=title, uses=[], recs=[], songs=[])
    return entries[k]
for p in plans:
    e = entry(p["title"]); e["uses"].append(p); r = rec_for(p)
    if r and r["r2"] not in [x["r2"] for x in e["recs"]]: e["recs"].append(dict(r2=r["r2"], book=p["book"], col=r["col"], disc=r.get("disc"), track=r.get("track")))
for s in songs:
    entry(s["title"])["songs"].append(s)

out = {}; stat = collections.Counter()
for k, e in entries.items():
    u = e["uses"][0] if e["uses"] else None
    tid = tunes.get(k)
    wid = workof.get(tid) if tid else None
    wid = wid or ("jri-" + slug(e["title"]))[:70]
    if wid in out: wid += "-" + str(len(out))
    where = []
    for p in e["uses"]: where.append("Teacher's Edition " + BOOKNAME[p["book"]] + " p." + p["te"])
    for s in e["songs"]: where.append("Song Collection " + str(s["coll"]) + " #" + s["num"])
    first = e["uses"][0]["book"] if e["uses"] else None
    w = {"title": e["title"], "composer": "Jump Right In" + (", " + BOOKNAME[first] if first else ", Song Collection"),
         "from": "; ".join(where), "in": ({"tune": [tid]} if tid and wid not in existing_ids else {}), "src": "ocr"}
    if tid and wid in existing_ids: w["in"] = {}
    jri = {}
    if u:
        for f in ("tonality", "resting", "meter", "key", "tempo", "form", "activity", "track"):
            v = u.get(f); 
            if v: jri[f] = v
        if u.get("lsa_t"): jri["lsaTonal"] = u["lsa_t"]
        if u.get("lsa_r"): jri["lsaRhythm"] = u["lsa_r"]
        jri["uses"] = [dict(book=p["book"], te=p["te"]) for p in e["uses"]]
    if e["songs"]: jri["songs"] = [dict(coll=s["coll"], n=s["num"], card=s.get("card")) for s in e["songs"]]
    w["jri"] = jri
    if e["recs"]:
        w["recordings"] = [{"r2": r["r2"], "title": "JRI " + BOOKNAME[r["book"]] + " CD", "note": "the book's CD, disc %s track %s" % (r["disc"], r["track"])} for r in e["recs"]]
        stat["with recording"] += 1
    elif any(p["book"] == "4" for p in e["uses"]):
        w["note"] = "Book 4 recording: the book's CDs 4.2 and 4.3 are not in the library yet (only CD 4.1 is catalogued), so there is no recording to link."
        stat["book4 no recording"] += 1
    elif e["uses"]:
        w["note"] = "No CD track matched this plan's page in the catalogue (OCR page or catalogue page missing); to check."
        stat["plan, no recording"] += 1
    else: stat["song collection only"] += 1
    stat["linked to library tune"] += bool(tid)
    out[wid] = w
print(len(plans), "plans,", len(songs), "songs ->", len(out), "entries;", dict(stat))
if WRITE:
    path = ROOT + "/apps/shared/works/works-data.js"
    t = open(path, encoding="utf8").read()
    lines = ['// jri:begin (written by scripts/jri/build.py: the JRI tunes from the teacher books and Song Collections, no notation yet;',
             '// OCR-derived, "src":"ocr". Do not edit here: an entry with the same id above is merged with it)',
             '(function (W, add) {', '  Object.keys(add).forEach(function (id) {', '    var a = add[id], w = W[id];',
             '    if (!w) { W[id] = a; return; }', '    w.jri = a.jri; if (a.recordings && !(w.recordings || []).length) w.recordings = a.recordings;',
             '  });', '})(window.WORKS, {']
    items = ['  %s: %s' % (json.dumps(i), json.dumps(w, ensure_ascii=False, separators=(",", ":"))) for i, w in out.items()]
    lines.append(",\n".join(items)); lines += ['});', '// jri:end']
    block = "\n".join(lines) + "\n"
    if "// jri:begin" in t: t = re.sub(r"// jri:begin.*?// jri:end\n", lambda m: block, t, flags=re.S)
    else: t = t.replace("// songs:begin", block + "// songs:begin", 1)
    open(path, "w", encoding="utf8").write(t); print("written")
