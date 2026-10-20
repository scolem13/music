#!/usr/bin/env python3
"""Each MTD theme's movement title from MusicBrainz, and the tempo word in it ("I. Allegro con brio" -> "Allegro con brio").

    python3 scripts/mtd-movements.py [~/Downloads/MTD_1.0.0/MTD]
    -> scripts/theme-sources/mtd-movements.json  {EDMID (as in theme-sources/mtd): {"track": ..., "tempo": ...}}

MTD's MusicBrainzID is the RELEASE (61 box sets, e.g. Bach's complete edition); NameCD / NameTrack pick the track, whose
title names the movement. One lookup per release (MusicBrainz asks for at most one request a second and a User-Agent).
The tempo word is the text after a movement number ("II. Allegretto"), else after the last colon; None when the track
title has neither (a single-movement piece: "Für Elise"). MusicBrainz data is CC0.
"""
import glob, json, os, re, sys, time, urllib.request

mtd = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/MTD_1.0.0/MTD")
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "theme-sources/mtd-movements.json")
UA = "everything-music-site/0.1 (classical themes; https://github.com/)"

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))

def tempo_word(title):
    m = re.search(r"(?:^|[:\-–—]\s*|\s)(?:[IVXL]+|\d+)\.\s+(.+)$", title)   # "…: III. Menuetto. Allegretto"
    if m: return m.group(1).strip()
    if ":" in title: return title.rsplit(":", 1)[1].strip()
    return None

metas = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(mtd + "/data_META/*.json"))]
# file each theme under the id convert-mtd.py gives it: the (first) EDM number, -1 / -2 for split themes
def tid(m):
    edm = m["EDMID"].split("+")[0].zfill(4)
    return edm + ("-" + m["MTDID"].split("-")[1] if "-" in m["MTDID"] else "")

# each release's track list, kept in the scratch cache so a rerun doesn't fetch again
cache_dir = os.path.join(os.environ.get("TMPDIR", "/tmp"), "mtd-musicbrainz"); os.makedirs(cache_dir, exist_ok=True)
releases = {}
for r in sorted({m["MusicBrainzID"] for m in metas}):
    cf = os.path.join(cache_dir, r + ".json")
    if os.path.exists(cf): releases[r] = json.load(open(cf, encoding="utf-8")); continue
    releases[r] = get("https://musicbrainz.org/ws/2/release/" + r + "?fmt=json&inc=recordings")
    json.dump(releases[r], open(cf, "w", encoding="utf-8")); time.sleep(1.1)

res, missing = {}, []
for m in metas:
    rel = releases.get(m["MusicBrainzID"]) or {}
    cd = int(re.split(r"\D", m["NameCD"] or "1")[0] or 1)   # "050"; a few are "01-001" (disc 1)
    tr = int(re.sub(r"\D", "", m["NameTrack"]) or 0)
    med = [x for x in rel.get("media", []) if x.get("position") == cd]
    t = [x for x in (med[0].get("tracks", []) if med else []) if x.get("position") == tr]
    if not t: missing.append(m["MTDID"]); continue
    title = t[0]["title"]
    res[tid(m)] = {"track": title, "tempo": tempo_word(title), "recording": t[0].get("recording", {}).get("id")}

json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
print("wrote", out, len(res), "themes;", sum(1 for v in res.values() if v["tempo"]), "with a tempo word;",
      len(missing), "tracks not found", missing[:10])
