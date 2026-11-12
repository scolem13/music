#!/usr/bin/env python3
"""Genre tags for the Pop Themes' songs (BiMMuDa, CoCoPops, RS200), from MusicBrainz and Wikidata.

    python3 -I scripts/bimmuda-genres.py [--source mb|wd | --merge] [BiMMuDa dir]      # no flag: both, then merge; --merge: only merge the caches

For each of the songs: BiMMuDa's 379 (title + artist from bimmuda_per_song_full.csv, key year_position), CoCoPops' (key cc_<McGill id>) and the
RS200's (key rs_<rank>) from scripts/theme-sources/cocopops-songs.json and rs200-songs.json (written by scripts/convert-cocopops.py; no BiMMuDa
directory needed for those). A CoCoPops / RS200 song that is already cached under another key with the same title and artist (a song in
two sets) reuses that answer: no request.
  * MusicBrainz: the recording that best matches the title and artist (and the year: first release nearest to the chart year),
    its tags and genres; then that artist's tags and genres. (search + one artist lookup: 2 requests a song)
  * Wikidata (only for songs whose MusicBrainz tags place no genre): the song's genres (P136) on an item with that English label whose performer or publication year fits; then the
    artist's P136.
Every answer is cached (scripts/theme-sources/bimmuda-genres-cache-mb.json / -wd.json), so a rerun only asks for what is missing
(--source mb and --source wd can run side by side). Requests are one a second or slower, with a generic User-Agent.
Each term is mapped onto the site's eight genres: pop, rock, r&b/soul, country, hip-hop, jazz/standards, dance/disco, folk
(TERMS below; a term is a whole tag, or a word in it). Votes: the recording's own tags and the song's Wikidata genres count more
than the artist's; "pop" counts half (almost everything is tagged pop). A song gets its top genre and a second if that scored at
least 60% of it. A hand fix in scripts/theme-sources/bimmuda-genre-fixes.json ({"1950_01": ["folk"]}, keyed year_position as in the
song CSV, e.g. "1958_03a") wins. Writes scripts/theme-sources/bimmuda-genres.json (genres, scores, the evidence) and prints the
distribution and the songs it could not place (no tags found or no category reached): fix those in the fixes file.
"""
import csv, json, math, os, re, sys, time, urllib.parse, urllib.request

args = [a for a in sys.argv[1:] if a != "--merge"]
source = None
if "--source" in args:
    i = args.index("--source"); source = args[i + 1]; del args[i:i + 2]
root = os.path.expanduser(args[0] if args else "~/Downloads/BiMMuDa/BiMMuDa")
here = os.path.dirname(os.path.abspath(__file__))
ts = os.path.join(here, "theme-sources")
UA = "EverythingMusicSite-genre-script/1.0 (private research; no commercial use)"

songs = []
for r in csv.DictReader(open(root + "/bimmuda_metadata/bimmuda_per_song_full.csv", encoding="utf-8")):
    pos = r["Position"]
    key = r["Year"] + "_" + (pos.zfill(2) if pos.isdigit() else pos.zfill(3))
    songs.append({"key": key, "title": r["Title"], "artist": r["Artist"], "year": int(r["Year"])})

for key_, f_ in (("cocopops", "cocopops-songs.json"), ("rs200", "rs200-songs.json")):
    p_ = os.path.join(ts, f_)
    if os.path.exists(p_):
        for k_, v_ in json.load(open(p_, encoding="utf-8")).items(): songs.append({"key": k_, "title": v_["title"], "artist": v_["artist"], "year": v_["year"]})

def load(p):
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
def save(p, d):
    tmp = p + ".tmp"; json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=0); os.replace(tmp, p)

last = {}
def get(url, gap, tries=6):
    wait = gap - (time.time() - last.get(gap, 0))
    if wait > 0: time.sleep(wait)
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as f: d = json.load(f)
            last[gap] = time.time(); return d
        except Exception as ex:
            last[gap] = time.time()
            code = getattr(ex, "code", 0)
            if code == 429:   # told to slow down: wait out the minute (Retry-After if given)
                try: time.sleep(min(120, int(ex.headers.get("Retry-After", 65))))
                except Exception: time.sleep(65)
            else: time.sleep(8 * (k + 1))   # 503 "busy" and the like
            if k == tries - 1: print("  failed:", url[:120], repr(ex)[:80], file=sys.stderr); return None

def norm(s):
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s.lower())
    s = s.replace("&", " and ")
    return re.sub(r"[^a-z0-9 ]+", " ", re.sub(r"[’']", "", s)).split()
def lucene(s): return re.sub(r'([+\-&|!(){}\[\]^"~*?:\\/])', " ", s).strip()
def first_artist(a): return re.split(r"\s+(?:feat\.?|featuring|ft\.?|with|and|&|x)\s+|,", a, flags=re.I)[0].strip()
def artist_match(want, got):
    w, g = set(norm(want)) - {"the", "and"}, set(norm(got)) - {"the", "and"}
    return bool(w & g) if w and g else False

# ---------------- MusicBrainz ----------------
def mb(song):
    base = "https://musicbrainz.org/ws/2/"
    title = re.sub(r"\s*\(.*?\)", "", song["title"]).strip()
    best = None
    for art in (song["artist"], first_artist(song["artist"])):
        q = 'recording:"%s" AND artist:"%s"' % (lucene(title), lucene(art))
        d = get(base + "recording?fmt=json&limit=15&query=" + urllib.parse.quote(q), 1.1)
        for rec in (d or {}).get("recordings", []):
            if rec.get("score", 0) < 80: continue
            credit = " ".join(c.get("name", "") for c in rec.get("artist-credit", []))
            if not artist_match(art, credit): continue
            if norm(rec["title"]) != norm(title) and norm(rec["title"])[:3] != norm(title)[:3]: continue
            yr = int((rec.get("first-release-date") or "0000")[:4] or 0)
            diff = abs(yr - song["year"]) if yr else 50
            tags = {t["name"]: t.get("count", 1) for t in rec.get("tags", [])}
            cand = (diff - (3 if tags else 0), rec, tags)   # a close year, and one that has tags
            if best is None or cand[0] < best[0]: best = cand
        if best: break
    out = {"recording": None, "rec_tags": {}, "artist": None, "artist_tags": {}}
    if not best: return out
    rec, tags = best[1], best[2]
    out["recording"] = rec["id"]; out["rec_tags"] = tags
    ac = (rec.get("artist-credit") or [{}])[0].get("artist", {})
    if ac.get("id"):
        a = get(base + "artist/%s?fmt=json&inc=tags+genres" % ac["id"], 1.1) or {}
        out["artist"] = ac["id"]
        t = {x["name"]: x.get("count", 1) for x in a.get("tags", [])}
        for x in a.get("genres", []): t[x["name"]] = max(t.get(x["name"], 0), x.get("count", 1))
        out["artist_tags"] = t
    return out

# ---------------- Wikidata ----------------
# (the query service times out on label lookups: the entity-search API, then the entities' claims)
API = "https://www.wikidata.org/w/api.php?format=json&origin=*&"
def wsearch(text):
    d = get(API + urllib.parse.urlencode({"action": "wbsearchentities", "search": text, "language": "en", "type": "item", "limit": 10}), 1.2)
    return (d or {}).get("search", [])
def wentities(ids, props):
    ids = list(ids)
    if not ids: return {}
    d = get(API + urllib.parse.urlencode({"action": "wbgetentities", "ids": "|".join(ids), "props": props, "languages": "en"}), 1.2)
    return (d or {}).get("entities", {})
def claim_ids(ent, prop):
    return [c["mainsnak"]["datavalue"]["value"]["id"] for c in (ent.get("claims") or {}).get(prop, []) if c.get("mainsnak", {}).get("datavalue")]
def genre_labels(ids):
    ents = wentities(sorted(set(ids)), "labels")
    return {i: (e.get("labels", {}).get("en", {}) or {}).get("value", "") for i, e in ents.items()}
def wd(song):
    title = re.sub(r"\s*\(.*?\)", "", song["title"]).strip()
    work, art = {}, {}
    cand = [h for h in wsearch(title) if norm(h.get("label", "")) == norm(title) and re.search(r"song|single|ballad|record", h.get("description", ""), re.I)]
    ents = wentities([h["id"] for h in cand], "claims|descriptions")
    for h in cand:
        e = ents.get(h["id"], {}); desc = h.get("description", "")
        yr = re.search(r"\b(19|20)\d\d\b", desc); y = int(yr.group(0)) if yr else None
        fits = artist_match(song["artist"], desc) or (y is not None and abs(y - song["year"]) <= 2)
        if not fits: continue
        for g in claim_ids(e, "P136"): work[g] = work.get(g, 0) + 1
    fa = first_artist(song["artist"])
    hits = [h for h in wsearch(fa) if norm(h.get("label", "")) == norm(fa) and re.search(r"singer|band|musician|group|duo|vocal|rapper|songwriter|composer|orchestra|artist", h.get("description", ""), re.I)]
    if hits:
        ent = wentities([hits[0]["id"]], "claims").get(hits[0]["id"], {})
        for g in claim_ids(ent, "P136"): art[g] = 1
    labels = genre_labels(list(work) + list(art))
    return {"work": {labels.get(k, k): v for k, v in work.items()}, "artist": {labels.get(k, k): v for k, v in art.items()}}

def run(name, fn, skip=None):
    p = os.path.join(ts, "bimmuda-genres-cache-%s.json" % name)
    cache = load(p); n = 0
    for s in songs:
        if s["key"] in cache and cache[s["key"]].get("title") == s["title"]: continue
        if skip and skip(s):   # not asked for: recorded as skipped
            cache[s["key"]] = {"skipped": True, "title": s["title"], "work": {}, "artist": {}}; continue
        tw = next((k for k, v in cache.items() if k != s["key"] and norm(v.get("title", "")) == norm(s["title"]) and v.get("artist_name") and artist_match(first_artist(s["artist"]), v["artist_name"])
                   and not v.get("skipped") and (v.get("recording") or v.get("work") or v.get("artist"))), None)
        if tw:   # the same song in another set: its answer
            cache[s["key"]] = dict(cache[tw], title=s["title"], artist_name=s["artist"], twin_of=tw); continue
        cache[s["key"]] = dict(fn(s), title=s["title"], artist_name=s["artist"]); n += 1
        if n % 3 == 0: save(p, cache); print(name, n, s["key"], s["title"], file=sys.stderr)
    save(p, cache)
    return cache

# ---------------- mapping ----------------
GENRES = ["pop", "rock", "r&b/soul", "country", "hip-hop", "jazz/standards", "dance/disco", "folk"]
TERMS = {
    "hip-hop": ["hip hop", "hip-hop", "rap", "trap", "gangsta", "g-funk", "crunk", "hyphy", "grime", "pop rap"],
    "r&b/soul": ["r&b", "rhythm and blues", "rnb", "soul", "motown", "funk", "doo-wop", "doo wop", "quiet storm", "new jack swing", "blues",
                 "gospel", "northern soul", "philadelphia soul", "urban", "contemporary r&b", "neo soul"],
    "country": ["country", "bluegrass", "americana", "nashville", "honky tonk", "western", "cowboy", "outlaw"],
    "jazz/standards": ["jazz", "swing", "big band", "traditional pop", "standards", "easy listening", "vocal", "crooner", "bebop", "great american songbook",
                       "adult standards", "orchestral", "lounge", "exotica", "mambo", "cha-cha", "tin pan alley", "vocal pop", "show tunes", "musical", "latin pop", "novelty", "bossa nova"],
    "dance/disco": ["disco", "dance", "house", "techno", "edm", "electropop", "eurodance", "electronic", "club", "europop", "hi-nrg", "freestyle",
                    "synth-pop", "synthpop", "electro", "trance", "dubstep", "electronica", "eurobeat", "italo", "dancehall"],
    "folk": ["folk", "singer-songwriter", "acoustic", "traditional", "folk pop", "skiffle", "celtic", "protest"],
    "rock": ["rock", "alternative", "grunge", "punk", "new wave", "metal", "glam", "rockabilly", "psychedelic", "britpop", "indie", "post-grunge",
             "garage", "surf", "beat", "british invasion", "pop punk", "emo", "yacht", "soft rock", "arena", "blues rock", "heartland"],
    "pop": ["pop", "popular music", "teen pop", "bubblegum", "adult contemporary", "power pop", "dance-pop", "vocal pop", "sophisti-pop", "teen idol", "schlager", "chanson"],
}
def cats(term):
    t = term.lower().strip(); out = set()
    for g, words in TERMS.items():
        for w in words:
            if t == w or re.search(r"(^|[^a-z])" + re.escape(w) + r"($|[^a-z])", t): out.add(g)
    # "dance-pop" is both; "pop rock" is rock and pop; "country pop" country and pop; "folk rock" folk and rock; plain "r&b" not pop
    if "pop" in out and len(out) > 1 and t not in ("dance-pop", "pop rock", "country pop", "soft rock"): out.discard("pop") if t not in ("pop",) else None
    if t in ("hip hop", "rap", "pop rap"): out = {"hip-hop"}
    if t in ("blues rock",): out = {"rock", "r&b/soul"}
    if t in ("soft rock", "pop rock"): out = {"rock", "pop"}
    return out

W = {"rec": 3.0, "artist": 2.0, "wdwork": 3.0, "wdartist": 2.0}
def score(song, mbd, wdd):
    sc = {g: 0.0 for g in GENRES}; ev = []
    def add(src, d):
        for term, c in (d or {}).items():
            for g in cats(term):
                v = W[src] * math.log2(2 + max(c, 0)) * (0.5 if g == "pop" else 1.0)
                sc[g] += v
            if cats(term): ev.append(src + ":" + term)
    add("rec", mbd.get("rec_tags")); add("artist", mbd.get("artist_tags"))
    add("wdwork", wdd.get("work")); add("wdartist", wdd.get("artist"))
    return sc, ev

def main():
    mbc = wdc = None
    if "--merge" not in sys.argv:   # --merge: only combine what is cached (no requests)
        if source in (None, "mb"): mbc = run("mb", mb)
        if source in (None, "wd"):
            # Wikidata is slow (about 5 requests a song): only asked about the songs MusicBrainz's tags did not place
            mbc0 = load(os.path.join(ts, "bimmuda-genres-cache-mb.json"))
            wdc = run("wd", wd, skip=lambda s: s["key"] in mbc0 and max(score(s, mbc0[s["key"]], {})[0].values()) > 0)
        if source: return
    mbc = load(os.path.join(ts, "bimmuda-genres-cache-mb.json")); wdc = load(os.path.join(ts, "bimmuda-genres-cache-wd.json"))
    fixes = load(os.path.join(ts, "bimmuda-genre-fixes.json"))
    out = {}; dist = {g: 0 for g in GENRES}; unresolved = []; fixed = 0; combos = {}
    for s in songs:
        sc, ev = score(s, mbc.get(s["key"], {}), wdc.get(s["key"], {}))
        top = max(sc.values())
        gl = []
        if top > 0:
            ranked = sorted(GENRES, key=lambda g: -sc[g])
            gl = [g for g in ranked[:2] if sc[g] >= 0.6 * top and sc[g] > 0]
        how = "sources"
        if s["key"] in fixes: gl = fixes[s["key"]]; how = "fix"; fixed += 1
        if not gl: unresolved.append("%s %s - %s" % (s["key"], s["title"], s["artist"]))
        out[s["key"]] = {"genres": gl, "by": how, "scores": {g: round(v, 1) for g, v in sc.items() if v}, "evidence": ev[:16]}
        for g in gl: dist[g] += 1
        combos["+".join(gl)] = combos.get("+".join(gl), 0) + 1
    save(os.path.join(ts, "bimmuda-genres.json"), out)
    print("songs:", len(songs), "; hand-fixed:", fixed, "; with MusicBrainz recording:", sum(1 for k, v in mbc.items() if v.get("recording")),
          "; with an artist on MB:", sum(1 for v in mbc.values() if v.get("artist")),
          "; Wikidata song genres:", sum(1 for v in wdc.values() if v.get("work")), "; Wikidata artist genres:", sum(1 for v in wdc.values() if v.get("artist")))
    print("distribution (a song can have two):", dist)
    print("combinations:", sorted(combos.items(), key=lambda x: -x[1])[:14])
    print("unresolved (%d):" % len(unresolved)); [print("  ", u) for u in unresolved]

if __name__ == "__main__": main()
