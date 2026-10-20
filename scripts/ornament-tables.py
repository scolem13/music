"""Ornament tables on the Grace Notes and Ornaments lesson (lessons/grace-notes-ornaments.qmd).

Each table is data in scripts/ornaments/*.py (TABLES = [...]); this script writes each one into the page between
<!-- ornament-table: ID --> and <!-- /ornament-table --> as an HTML table of notation: the sign as written and the
notes the source writes out, both playing the written-out notes (abc-ex.js data-play). Run after changing the data:
    python3 scripts/ornament-tables.py

A table:  dict(id, cols=("Name", "Sign", "Played"), key="K:C", unit="1/32", tempo="1/4=50", rows=[...])
A row:    dict(name, gloss, sign, played, note="", play=None, bend=None (notes for abc-ex data-bend: slides heard as slides), rec=[(label, url), ...], width=(80, 150))
          sign / played are ABC note strings (no header); play overrides what both cells play (default: played).
"""
import json
import glob, html, importlib.util, re, sys

PAGE = "lessons/grace-notes-ornaments.qmd"


def load():
    tables = {}
    for f in sorted(glob.glob("scripts/ornaments/*.py")):
        spec = importlib.util.spec_from_file_location("orn_" + f.split("/")[-1][:-3], f)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        for t in m.TABLES:
            if t["id"] in tables:
                sys.exit("duplicate table id " + t["id"])
            tables[t["id"]] = t
    return tables


def bend_json(r, t):
    # a row's bend: notes heard through the band's guitar samples (abc-ex.js data-bend), so slides slide
    if not r.get("bend"):
        return ""
    bpm = int(t.get("tempo", "1/4=96").split("=")[1])
    return '<script type="text/plain" data-bend>%s</script>' % json.dumps(dict(bpm=bpm, sound=t.get("sound", "clguitar"), notes=r["bend"]))


def ex(body, play, width, t, bend=""):
    hdr = "M:%s\nL:%s\n%s\n" % (t.get("meter", "none"), t.get("unit", "1/32"), t.get("key", "K:C"))
    return ('<div class="abc-ex" data-width="%d"><script type="text/plain">\nX:1\n%s%s |]\n</script>'
            '<script type="text/plain" data-play>\nX:2\n%sQ:%s\n%s |]\n</script>%s</div>'
            % (width, hdr, body, hdr, t.get("tempo", "1/4=50"), play, bend))


def render(t):
    cols = t.get("cols", ("Name", "Sign", "Played"))
    has_rec = any(r.get("rec") for r in t["rows"])
    out = ['<table class="ax-table">', "<thead><tr><th class=\"ax-n\">#</th>" + "".join("<th>%s</th>" % c for c in cols)
           + ("<th>Hear it</th>" if has_rec else "") + "</tr></thead>", "<tbody>"]
    for i, r in enumerate(t["rows"], 1):
        w = r.get("width", t.get("width", (80, 150)))
        play = r.get("play") or r["played"]
        name = "<em>%s</em>" % html.escape(r["name"]) + ("<br>%s" % r["gloss"] if r.get("gloss") else "")
        if r.get("note"):
            name += '<div class="ax-rownote">%s</div>' % r["note"]
        bj = bend_json(r, t)
        cells = [name, ex(r["sign"], play, w[0], t, bj) if r.get("sign") else "", ex(r["played"], play, w[1], t, bj)]
        rec = ""
        if has_rec:
            rec = "<td>" + "<br>".join('<a href="%s">%s</a>' % (html.escape(u, True), l) for l, u in r.get("rec", [])) + "</td>"
        out.append('<tr><td class="ax-n">%d</td>' % i + "".join("<td>%s</td>" % c for c in cells) + rec + "</tr>")
    out.append("</tbody></table>")
    return "```{=html}\n" + "\n".join(out) + "\n```"


def main():
    tables = load()
    s = open(PAGE).read()
    seen = set()

    def sub(m):
        tid = m.group(1)
        if tid not in tables:
            sys.exit("no data for table " + tid)
        seen.add(tid)
        return "<!-- ornament-table: %s -->\n%s\n<!-- /ornament-table -->" % (tid, render(tables[tid]))

    s = re.sub(r"<!-- ornament-table: (\S+) -->.*?<!-- /ornament-table -->", sub, s, flags=re.S)
    open(PAGE, "w").write(s)
    unused = set(tables) - seen
    print("tables written:", ", ".join(sorted(seen)) or "none", ("| not on the page: " + ", ".join(sorted(unused))) if unused else "")


if __name__ == "__main__":
    main()
