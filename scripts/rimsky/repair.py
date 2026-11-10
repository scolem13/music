# repair.py — pad short bars in a Finale-exported MusicXML example so every part's bar k lasts as long as the longest part's bar k.
#   python3 -I scripts/rimsky/repair.py in.xml out.xml      prints one line per padded bar ("part P2 bar 1: +1/8") and writes out.xml
# Why: Gutenberg's Rimsky examples are unedited Finale files and some parts have a bar shorter than the meter (a missing eighth rest
# in Sheherazade 4th mvt, violin II). The ABC then agrees with the XML but the staves drift apart, and the player (one bar timeline)
# cannot draw or play them together. The padding is a <forward> (an invisible rest) at the END of the part's bar, added only when
# every voice of the bar (a backup grows by the padding). Bar 1 where every part is equally short (a pickup)
# is left alone. Nothing else in the file changes. The convert / check then run on the repaired file, and index.json records it.
import sys, re
import xml.etree.ElementTree as ET
src, dst = sys.argv[1:3]
txt = open(src, encoding="utf-8", errors="replace").read()
# ElementTree drops the DOCTYPE; xml2abc does not need it
tree = ET.ElementTree(ET.fromstring(re.sub(r"<!DOCTYPE[^>]*>", "", txt, count=1, flags=re.S).encode("utf-8")))
root = tree.getroot()
parts = root.findall("part")
info = []   # per part: list of (measure element, quarters, divisions, simple)
for p in parts:
    div = 1; rows = []
    for m in p.findall("measure"):
        d = m.find("attributes/divisions")
        if d is not None: div = int(d.text)
        cur = mx = 0; voices = set(); back = False
        for e in m:
            if e.tag == "note":
                if e.find("chord") is not None or e.find("grace") is not None: continue
                cur += int(e.find("duration").text); voices.add(e.findtext("voice"))
            elif e.tag == "backup": cur -= int(e.find("duration").text); back = True
            elif e.tag == "forward": cur += int(e.find("duration").text)
            mx = max(mx, cur)
        rows.append((m, mx / div, div, (not back) and cur == mx))
    info.append(rows)
nb = max(len(r) for r in info)
for k in range(nb):
    lens = [r[k][1] for r in info if k < len(r)]
    if not lens or len(set(lens)) == 1: continue
    tgt = max(lens)
    for pi, r in enumerate(info):
        if k >= len(r): continue
        m, q, div, simple = r[k]
        if q >= tgt - 1e-9: continue
        pid = parts[pi].get("id")
        tdiv = round(tgt * div)
        els = list(m); cur = 0; pads = 0
        def fwd(n):
            f = ET.Element("forward"); ET.SubElement(f, "duration").text = str(n); return f
        for e in els:      # every voice that stops short of the target is padded at its end (a backup grows by the same amount)
            if e.tag == "note":
                if e.find("chord") is None and e.find("grace") is None: cur += int(e.find("duration").text)
            elif e.tag == "forward": cur += int(e.find("duration").text)
            elif e.tag == "backup":
                if cur < tdiv:
                    pad = tdiv - cur; m.insert(list(m).index(e), fwd(pad)); e.find("duration").text = str(int(e.find("duration").text) + pad); cur += pad; pads += 1
                cur -= int(e.find("duration").text) - 0
        if cur < tdiv:
            bl = m.find("barline"); f = fwd(tdiv - cur)
            if bl is not None: m.insert(list(m).index(bl), f)
            else: m.append(f)
            pads += 1
        print(f"part {pid} bar {m.get('number')}: +{tgt-q:g} quarters" + (f" ({pads} voices)" if pads > 1 else ""))
tree.write(dst, encoding="utf-8", xml_declaration=True)
