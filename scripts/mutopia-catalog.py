#!/usr/bin/env python3
"""Catalogue of the Mutopia Project (public-domain / CC sheet music in LilyPond) from a local clone.

    git clone --depth 1 https://github.com/MutopiaProject/MutopiaProject.git ~/Downloads/mutopia
    python3 -I scripts/mutopia-catalog.py [--root ~/Downloads/mutopia]

writes scripts/mutopia/catalog.json: one entry per piece (the .ly whose \\header has mutopiatitle), with
  id (Mutopia's number, from the footer "Mutopia-YYYY/MM/DD-N"), title, subtitle, composer (Mutopia's code, e.g. BeethovenLv),
  composerName, opus, catalogue (BWV / K / Op / HWV ... parsed from opus or title), instrument, date, style, source, license,
  key (when a header names one), collections (from datafiles/collections.dat), ly (path in the clone), and the site's
  links: page (piece-info), files (the piece's ftp folder: the -lys.zip, -mids.zip / .mid, -a4.pdf, -let.pdf live there).
The clone has no PDFs or MIDI; Mutopia builds those. Read the headers only, so a piece needs no LilyPond to be listed.
"""
import json, os, re, sys, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
SRC = pathlib.Path(os.path.expanduser(args[args.index("--root") + 1] if "--root" in args else "~/Downloads/mutopia"))
OUT = ROOT / "scripts/mutopia/catalog.json"
SITE = "https://www.mutopiaproject.org"

FIELD = re.compile(r'^\s*([A-Za-z]+)\s*=\s*"((?:[^"\\]|\\.)*)"', re.M)
CAT = re.compile(r'\b(BWV|BuxWV|HWV|TWV|RV|K\.?|KV|Hob\.?|D\.?|WoO|Op\.?|S\.?|L\.?|Kk\.?|Sz\.?|M\.?)\s*([0-9IVXLC]+[a-z]?(?:[/:.,]\s*(?:No\.?\s*)?[0-9]+[a-z]?)?)', re.I)
KEY = re.compile(r'\b(?:in\s+)?([A-G](?:[- ]?(?:flat|sharp|♭|♯|b|#))?)[- ]?(major|minor|Major|Minor|maj|min|Dur|Moll|dur|moll)\b')

def header(text):
    m = re.search(r'\\header\s*\{', text)
    if not m: return None
    i, depth = m.end(), 1
    while i < len(text) and depth:
        depth += {"{": 1, "}": -1}.get(text[i], 0); i += 1
    return dict((k, v.replace('\\"', '"').strip()) for k, v in FIELD.findall(text[m.end():i - 1]))

LIC = [("Creative Commons Attribution-ShareAlike 4.0", r"by-sa/4\.0|Attribution[- ]ShareAlike 4"), ("Creative Commons Attribution-ShareAlike 3.0", r"by-sa/3\.0|Attribution[- ]ShareAlike 3"),
       ("Creative Commons Attribution-ShareAlike 2.5", r"by-sa/2\.5"), ("Creative Commons Attribution 4.0", r"licenses/by/4\.0"), ("Creative Commons Attribution 3.0", r"licenses/by/3\.0"),
       ("Creative Commons Attribution 2.5", r"licenses/by/2\.5"), ("Public Domain", r"public ?domain|publicdomain")]
def license_of(text):
    for name, rx in LIC:
        if re.search(rx, text, re.I): return name
    return None

def collections_of():
    out = collections.defaultdict(list)
    f = SRC / "datafiles/collections.dat"
    if f.exists():
        for line in f.read_text(errors="replace").splitlines():
            p = line.split(":")
            if len(p) >= 3:
                for n in p[2].split(","):
                    if n.strip().isdigit(): out[int(n)].append({"code": p[0], "title": p[1]})
    return out

def main():
    if not (SRC / "ftp").is_dir():
        sys.exit(f"No Mutopia clone at {SRC} (see the top of this script).")
    cols, pieces, seen = collections_of(), [], set()
    for ly in sorted(list((SRC / "ftp").rglob("*.ly")) + list((SRC / "ftp").rglob("*.ily"))):
        try: text = ly.read_text(errors="replace")
        except OSError: continue
        if "mutopiatitle" not in text: continue
        h = header(text)
        if not h or "mutopiatitle" not in h: continue
        fid = re.search(r'Mutopia-\d{4}/\d\d/\d\d-(\d+)', h.get("footer", "") + text)
        pid = int(fid.group(1)) if fid else None
        if pid in seen and pid is not None: continue
        seen.add(pid)
        rel = ly.relative_to(SRC)
        # the piece folder: ftp/Composer/.../piece/ (the .ly sits in piece/ or piece/piece-lys/)
        folder = rel.parent.parent if rel.parent.name.endswith("-lys") else rel.parent
        opus = h.get("mutopiaopus") or h.get("opus", "")
        cat = CAT.search(opus) or CAT.search(h.get("mutopiatitle", ""))
        keym = None
        for f in ("subsubtitle", "subtitle", "title", "mutopiatitle", "piece"):
            keym = KEY.search(h.get(f, ""))
            if keym: break
        pieces.append({k: v for k, v in {
            "id": pid,
            "title": h.get("mutopiatitle") or h.get("title"),
            "subtitle": h.get("subtitle") or None,
            "composer": h.get("mutopiacomposer"),
            "composerName": h.get("composer") or None,
            "opus": opus or None,
            "catalogue": (re.sub(r"\.$", "", cat.group(1)).upper().replace("KV", "K") + " " + cat.group(2)) if cat else None,
            "instrument": h.get("mutopiainstrument") or h.get("instrument"),
            "date": h.get("date") or None,
            "style": h.get("style") or None,
            "source": h.get("source") or None,
            "license": h.get("license") or license_of(text),
            "key": (keym.group(1).replace("-", " ") + " " + ("minor" if keym.group(2).lower().startswith(("min", "mol")) else "major")) if keym else None,
            "collections": [c["title"] for c in cols.get(pid, [])] or None,
            "ly": str(rel),
            "page": f"{SITE}/cgibin/piece-info.cgi?id={pid}" if pid else None,
            "files": f"{SITE}/{folder}/",
        }.items() if v is not None})
    pieces.sort(key=lambda p: (p.get("composer") or "", p.get("title") or ""))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": "Mutopia Project, " + SITE, "clone": "github.com/MutopiaProject/MutopiaProject",
                               "count": len(pieces), "pieces": pieces}, ensure_ascii=False, indent=1))
    by = collections.Counter(p.get("instrument", "?") for p in pieces)
    print(f"{len(pieces)} pieces, {len({p.get('composer') for p in pieces})} composers -> {OUT.relative_to(ROOT)}")
    print("no id:", sum(1 for p in pieces if not p.get("id")), "| with catalogue no.:", sum(1 for p in pieces if p.get("catalogue")),
          "| with key:", sum(1 for p in pieces if p.get("key")))
    print("instruments:", ", ".join(f"{k} {v}" for k, v in by.most_common(12)))
    print("licenses:", dict(collections.Counter(p.get("license", "?") for p in pieces).most_common(6)))

if __name__ == "__main__":
    main()
