#!/usr/bin/env python3
"""Build the electric-piano recordings the EPiano page plays (apps/shared/lessons/epiano-samples/<set>/).

  python3 scripts/epiano-samples.py [wurli] [clav]        (needs gh, ffmpeg; downloads to a temp folder)

Each set: mono AAC .m4a files + manifest.json {name, source, licence, zones: [{f, key, lo, hi, vlo, vhi, tune, vol}]}
(key = the sample's own MIDI note, lo..hi = keys it plays, vlo..vhi = velocity 0..127, tune in cents, vol in dB),
read from the set's own SFZ so the zones and level / tuning fixes are the mapper's, not ours.

  wurli  Greg Sullivan, "Wurlitzer EP200" (1999), SFZ by kinwie: github.com/sfzinstruments/GregSullivan.E-Pianos, CC-BY 3.0.
         All 4 velocity layers.
  clav   "Stevie Clavinet" (jlearman, from the Lithalean / Zynthian Clavinet D6 recordings): github.com/jlearman/stevie-clavinet.
         Licence UNKNOWN (README: "License is unknown"); the site owner chose to take that risk (2026-11-27).
         3 of its 4 velocity layers (54 / 83 / 127), every second key (each sample repitched at most a semitone).
"""
import json, os, re, subprocess, sys, tempfile, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "apps/shared/lessons/epiano-samples")

SETS = {
    "wurli": dict(repo="sfzinstruments/GregSullivan.E-Pianos", sfz="Wurlitzer EP200/Wurlitzer EP200.sfz", dir="Wurlitzer EP200/Samples/",
                  name="Wurlitzer EP200 (Greg Sullivan, 1999; SFZ by kinwie)", licence="CC-BY 3.0",
                  source="https://github.com/sfzinstruments/GregSullivan.E-Pianos"),
    "clav": dict(repo="jlearman/stevie-clavinet", sfz="Stevie Clavinet.sfz", dir="",
                 name="Stevie Clavinet (jlearman; Lithalean / Zynthian Clavinet D6 recordings)", licence="unknown (owner accepted the risk)",
                 source="https://github.com/jlearman/stevie-clavinet", layers={"54", "83", "127"}, every=2),
}


def gh_raw(repo, path):
    q = urllib.parse.quote(path)
    return subprocess.run(["gh", "api", "-H", "Accept: application/vnd.github.raw", f"repos/{repo}/contents/{q}"],
                          check=True, capture_output=True).stdout


def parse_sfz(text):
    """Flat SFZ reader: #define, <group> opcodes inherited by <region>s. Returns region dicts."""
    defs = dict(re.findall(r"#define\s+(\$\w+)\s+(\S+)", text))
    text = re.sub(r"//[^\n]*", "", text)
    for k, v in defs.items():
        text = text.replace(k, v)
    regions, group, cur, mode = [], {}, None, None
    for tok in re.findall(r"<\w+>|[\w#$]+=(?:[^=<\n]*?)(?=\s+[\w#$]+=|\s*<|\s*$|\n)", text, re.M):
        if tok.startswith("<"):
            if cur is not None:
                regions.append(cur)
            cur = None
            if tok == "<group>":
                group, mode = {}, "g"
            elif tok == "<region>":
                cur, mode = dict(group), "r"
            else:
                mode = None
            continue
        k, v = tok.split("=", 1)
        v = v.strip()
        if mode == "g":
            group[k] = v
        elif mode == "r":
            cur[k] = v
    if cur is not None:
        regions.append(cur)
    return regions


NOTE = {"c": 0, "c#": 1, "db": 1, "d": 2, "d#": 3, "eb": 3, "e": 4, "f": 5, "f#": 6, "gb": 6, "g": 7, "g#": 8, "ab": 8, "a": 9, "a#": 10, "bb": 10, "b": 11}


def build(sid):
    S = SETS[sid]
    out = os.path.join(OUT, sid)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    regs = [r for r in parse_sfz(gh_raw(S["repo"], S["sfz"]).decode("utf-8", "replace"))
            if "sample" in r and r.get("trigger", "attack") == "attack"]
    zones, tmp = [], tempfile.mkdtemp(prefix="ep-" + sid + "-")
    if sid == "clav":
        keep = []
        for r in regs:
            m = re.match(r"flac/Clavinet(\d+)_", r["sample"])
            if not m or m.group(1) not in S["layers"]:
                continue
            key = int(r.get("pitch_keycenter", r.get("key")))
            if key % S["every"]:
                continue
            keep.append(r)
        layers = sorted(S["layers"], key=int)
        keys = sorted({int(r.get("pitch_keycenter", r.get("key"))) for r in keep})
        for r in keep:
            v = re.match(r"flac/Clavinet(\d+)_", r["sample"]).group(1)
            i = layers.index(v)
            key = int(r.get("pitch_keycenter", r.get("key")))
            lo = 0 if key == keys[0] else key - 1          # a sample plays its own key and the one below
            hi = 127 if key == keys[-1] else key
            zones.append(dict(src=r["sample"], key=key, lo=lo, hi=hi, vlo=0 if i == 0 else int(layers[i - 1]) + 1, vhi=127 if i == len(layers) - 1 else int(v), tune=0, vol=0))
    else:
        for r in regs:
            smp = r["sample"].replace(".$EXT", ".flac").replace("$EXT", "flac")
            key = int(r["pitch_keycenter"])
            zones.append(dict(src=S["dir"] + smp, key=key, lo=int(r["lokey"]), hi=int(r["hikey"]), vlo=int(r.get("lovel", 0)), vhi=int(r.get("hivel", 127)),
                              tune=float(r.get("tune", 0)), vol=float(r.get("volume", 0))))
    files = {}
    for z in zones:
        if z["src"] not in files:
            base = re.sub(r"[^A-Za-z0-9]+", "_", os.path.splitext(os.path.basename(z["src"]))[0]).strip("_") + ".m4a"
            raw = os.path.join(tmp, "x.flac")
            open(raw, "wb").write(gh_raw(S["repo"], z["src"]))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af",
                            "pan=mono|c0=0.5*c0+0.5*c1,areverse,silenceremove=start_periods=1:start_threshold=-80dB,afade=t=in:d=0.15,areverse",
                            "-t", "8", "-c:a", "aac", "-b:a", "96k", os.path.join(out, base)], check=True)
            files[z["src"]] = base
        z["f"] = files[z.pop("src")]
    json.dump(dict(name=S["name"], licence=S["licence"], source=S["source"], zones=zones), open(os.path.join(out, "manifest.json"), "w"), indent=0)
    print(sid, len(zones), "zones,", len(files), "files")


if __name__ == "__main__":
    for sid in (sys.argv[1:] or list(SETS)):
        build(sid)
