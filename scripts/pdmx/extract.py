"""Collect metadata for the PDMX picks: index.csv rows + PDMX-trim tags/subtitle + part names read from each .mxl.
Writes scripts/pdmx/picks.json. Run: python3 -I scripts/pdmx/extract.py"""
import csv, json, os, zipfile, xml.etree.ElementTree as ET
H = os.path.expanduser("~/Downloads/")
GROUPS = ["PDMX-piano", "PDMX-quartet", "PDMX-ensembles", "PDMX-choir", "PDMX-extra"]   # extra: picked by hand for the Hutchinson clips (keep it last: indices stay put)
trim = {}
with open(H + "PDMX-trim.csv", newline="") as f:
    for r in csv.DictReader(f): trim[r["mxl"].lstrip("./").replace("mxl/", "", 1)] = r
def parts(p):
    try:
        z = zipfile.ZipFile(p)
        name = next(n for n in z.namelist() if n.endswith((".xml", ".musicxml")) and not n.startswith("META"))
        root = ET.fromstring(z.read(name))
        return [(sp.findtext("part-name") or "").strip() for sp in root.iter("score-part")], \
               (root.findtext(".//work/work-title") or "") + " | " + (root.findtext(".//movement-title") or "") + " | " + \
               " ; ".join((c.text or "") for c in root.iter("credit-words"))[:300]
    except Exception as e: return ["ERR " + str(e)[:60]], ""
out = []
for g in GROUPS:
    with open(H + g + "/index.csv", newline="") as f:
        for r in csv.DictReader(f):
            k = r["pdmx"]
            t = next((v for kk, v in trim.items() if kk.endswith(k)), {}) if k not in trim else trim[k]
            pn, credits = parts(H + g + "/" + r["file"])
            out.append({"group": g[5:], **{x: r[x] for x in ["file","kind","composer","title","parts","bars","rating","n_ratings","genres","pdmx"]},
                        "subtitle": t.get("subtitle",""), "tags": t.get("tags",""), "partNames": pn, "credits": credits})
json.dump(out, open(os.path.join(os.path.dirname(__file__), "picks.json"), "w"), ensure_ascii=False, indent=0)
print(len(out), sum(1 for o in out if not o["tags"] and not o["subtitle"]))
