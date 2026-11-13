#!/usr/bin/env python3
"""Year, genre and composer for the Tune Directory's Hooktheory and Real Book songs, from MusicBrainz (one request a second, resumable).

    python3 -I scripts/dir-songs/enrich.py [--set rb|ht] [--max N]      # no --set: Real Book songs first, then Hooktheory; then run build.py

  * Hooktheory (artist + song): MusicBrainz recording search; the year is the EARLIEST first-release-date of the recordings whose title
    and artist match (the original release, not a live or cover one); genres from the recordings' tags, else the artist's tags (one
    artist lookup, kept per artist). Composer is not looked up (the sheet's column is "Composer / artist" and shows the artist).
  * Real Book titles: MusicBrainz work search for the composer (title equal, most recordings linked wins; used only when the book
    index names none), then a recording search narrowed to that work's name (and the performer where the book names one) for the
    year = the earliest recording found (an APPROXIMATION of the song's year, not a publication date: shown as "c." nowhere, so read
    the column as "first recorded"), and the tags for genre. A title that is common ("Home", "Alone") can match the wrong song.
    The book it comes from also votes (Latin / Brazilian / Cuban books -> latin, Christmas -> christmas, Dixieland / Jazz -> jazz/standards ...).
Genres use the Pop Themes' eight (pop, rock, r&b/soul, country, hip-hop, jazz/standards, dance/disco, folk) via scripts/bimmuda-genres.py's
TERMS and cats() (read from that file), plus latin, christmas, classical for the Real Books' own kinds.
Caches: scripts/dir-songs/cache-ht.json (key "artist-slug/song-slug"), cache-rb.json (key = title). {y: year, g: [genres], c: composer, ids...}.
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(os.path.dirname(here))
UA = "EverythingMusicSite-dir-songs/1.0 (private research; no commercial use)"
src = open(os.path.join(root, "scripts/bimmuda-genres.py"), encoding="utf-8").read()
ns = {"re": re, "math": math}
exec(src[src.index("GENRES = ["):src.index("W = {")], ns)       # GENRES, TERMS, cats()
cats, GENRES = ns["cats"], ns["GENRES"]

def load(p): return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
def save(p, d):
    tmp = p + ".tmp"; json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":")); os.replace(tmp, p)
last = [0.0]
def get(url, tries=6):
    for k in range(tries):
        w = 1.1 - (time.time() - last[0])
        if w > 0: time.sleep(w)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as f: d = json.load(f)
            last[0] = time.time(); return d
        except Exception as ex:
            last[0] = time.time(); code = getattr(ex, "code", 0)
            if code == 429:
                try: time.sleep(min(120, int(ex.headers.get("Retry-After", 65))))
                except Exception: time.sleep(65)
            elif code == 400: return None
            else: time.sleep(8 * (k + 1))
    return None
def norm(s):
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s.lower()).replace("&", " and ")
    return re.sub(r"[^a-z0-9 ]+", " ", re.sub(r"[’']", "", s)).split()
def lucene(s): return re.sub(r'([+\-&|!(){}\[\]^"~*?:\\/])', " ", s).strip()
def first_artist(a): return re.split(r"\s+(?:feat\.?|featuring|ft\.?|with|and|&|x)\s+|,", a, flags=re.I)[0].strip()
def amatch(want, got):
    w, g = set(norm(want)) - {"the", "and"}, set(norm(got)) - {"the", "and"}
    return bool(w & g) if w and g else False
BASE = "https://musicbrainz.org/ws/2/"
def year_of(rec):
    y = int((rec.get("first-release-date") or "0")[:4] or 0)
    return y if 1850 <= y <= 2026 else 0
def tags_of(o):
    t = {x["name"]: x.get("count", 1) for x in o.get("tags", [])}
    for x in o.get("genres", []): t[x["name"]] = max(t.get(x["name"], 0), x.get("count", 1))
    return t
def genres(vote, extra=()):
    sc = {}
    for weight, tags in vote:
        for term, c in tags.items():
            for g in cats(term): sc[g] = sc.get(g, 0) + weight * math.log2(2 + max(c, 0)) * (0.5 if g == "pop" else 1.0)
    for g, v in extra: sc[g] = sc.get(g, 0) + v
    if not sc or max(sc.values()) <= 0: return []
    top = max(sc.values()); r = sorted(sc, key=lambda g: -sc[g])
    return [g for g in r[:2] if sc[g] >= 0.6 * top]

artist_cache = load(os.path.join(here, "cache-artists.json"))
def artist_tags(aid):
    if aid not in artist_cache:
        a = get(BASE + "artist/%s?fmt=json&inc=tags+genres" % aid) or {}
        artist_cache[aid] = tags_of(a)
    return artist_cache[aid]

def ht_one(row):
    title = re.sub(r"\s*\(.*?\)", "", row["t"]).strip(); best = []
    for art in (row["a"], first_artist(row["a"])):
        d = get(BASE + "recording?fmt=json&limit=15&query=" + urllib.parse.quote('recording:"%s" AND artist:"%s"' % (lucene(title), lucene(art)))) or {}
        for rec in d.get("recordings", []):
            if rec.get("score", 0) < 85: continue
            credit = " ".join(c.get("name", "") for c in rec.get("artist-credit", []))
            if not amatch(art, credit) or norm(rec["title"]) != norm(title): continue
            best.append(rec)
        if best: break
    if not best: return {"none": 1}
    yrs = [y for y in map(year_of, best) if y]
    tags = {}
    for rec in best:
        for k, v in tags_of(rec).items(): tags[k] = tags.get(k, 0) + v
    aid = ((best[0].get("artist-credit") or [{}])[0].get("artist") or {}).get("id")
    at = artist_tags(aid) if aid else {}
    e = {"mb": best[0]["id"]}
    if yrs: e["y"] = min(yrs)
    g = genres([(3.0, tags), (2.0, at)])
    if g: e["g"] = g
    return e

BOOK_GENRE = [(r"latin|brazil|cuban|django", "latin"), (r"christmas", "christmas"), (r"dixieland|new orleans", "jazz/standards"),
              (r"jazz|standards|bill evans|monk|jarrett|cole|mancini|ellington|real book|berklee|sher|legit|50s", "jazz/standards"),
              (r"rock|pop|disney|tv guide|ultimate", None)]
def rb_one(row):
    title = re.sub(r"\s*\(.*?\)", "", row["t"]).strip(); e = {}
    comp = row.get("c")
    if not comp:
        d = get(BASE + "work?fmt=json&limit=6&query=" + urllib.parse.quote('work:"%s"' % lucene(title))) or {}
        cands = []
        for w in d.get("works", []):
            if w.get("score", 0) < 90 or norm(w.get("title", "")) != norm(title): continue
            rel = w.get("relations", [])
            cs = [r["artist"]["name"] for r in rel if r.get("type") in ("composer", "writer") and r.get("artist")]
            if cs: cands.append((sum(1 for r in rel if r.get("type") == "performance"), cs))
        if cands:
            cs = sorted(cands, key=lambda x: -x[0])[0][1]
            e["c"] = "; ".join(dict.fromkeys(cs))[:80]
    q = 'recording:"%s"' % lucene(title)
    if row.get("ar"): q += ' AND artist:"%s"' % lucene(first_artist(row["ar"][0]))
    d = get(BASE + "recording?fmt=json&limit=60&query=" + urllib.parse.quote(q)) or {}
    hit = [r for r in d.get("recordings", []) if r.get("score", 0) >= 90 and norm(r["title"]) == norm(title)]
    yrs = [y for y in map(year_of, hit) if y]
    if yrs: e["y"] = min(yrs)
    tags = {}
    for rec in hit:
        for k, v in tags_of(rec).items(): tags[k] = tags.get(k, 0) + v
    extra = []
    books = " ".join(b[0].lower() for b in row.get("bk", []))
    for pat, g in BOOK_GENRE:
        if g and re.search(pat, books): extra.append((g, 4.0)); break
    g = genres([(2.0, tags)], extra)
    if g: e["g"] = g
    return e

def order_rb(rows):      # Songfinder titles and titles in several books first
    return sorted(rows, key=lambda r: (-(1 if r.get("sf") else 0) - (1 if len(r["bk"]) > 1 else 0), r["t"].lower()))

def run(name, rows, keyf, fn, limit):
    p = os.path.join(here, "cache-%s.json" % name); cache = load(p); n = 0
    todo = [r for r in rows if keyf(r) not in cache]
    print(name, len(todo), "to do of", len(rows), file=sys.stderr)
    for r in todo:
        if limit and n >= limit: break
        cache[keyf(r)] = fn(r); n += 1
        if n % 20 == 0: save(p, cache); save(os.path.join(here, "cache-artists.json"), artist_cache); print(name, n, keyf(r), cache[keyf(r)], file=sys.stderr)
    save(p, cache); save(os.path.join(here, "cache-artists.json"), artist_cache)

if __name__ == "__main__":
    a = sys.argv; which = a[a.index("--set") + 1] if "--set" in a else None; limit = int(a[a.index("--max") + 1]) if "--max" in a else 0
    out = os.path.join(root, "apps/shared/data/dir-songs")
    if which in (None, "rb"):
        rb = json.load(open(os.path.join(out, "realbook.json"), encoding="utf-8"))["songs"]
        run("rb", order_rb(rb), lambda r: r["t"], rb_one, limit)
    if which in (None, "ht"):
        ht = json.load(open(os.path.join(out, "hooktheory.json"), encoding="utf-8"))
        run("ht", ht, lambda r: r["h"], ht_one, limit)
