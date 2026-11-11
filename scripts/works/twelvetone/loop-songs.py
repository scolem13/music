#!/usr/bin/env python3
"""The songs 12tone plays in "I Listened To 500 Songs To Prove A Point" -> Works links and the Concepts column (apps/shared/works/uses/12tone.js).

    python3 -I scripts/works/twelvetone/loop-songs.py

Source: the video's transcript (pasted by the teacher, 2026-11-10); title and channel from YouTube's oEmbed. The transcript has no
times, so the links go to the start of the video. Artists are as the video names them (no songwriters, no years: not in the source).
Writes the block between "// 12tone:begin" and "// 12tone:end" in works-data.js (above print-books, so Tagg's entries merge into it).
"""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
WD = os.path.join(ROOT, "apps/shared/works/works-data.js")
URL = "https://www.youtube.com/watch?v=F7be6Aicdo0"
WHERE = "12tone, I Listened To 500 Songs To Prove A Point"
SONGS = [  # id, title, artist, what the video uses it for
    ("chapman-fast-car", "Fast Car", "Tracy Chapman", "the melody sings B over F♯ and A over E: 'married to the loop', not divorced from the chords"),
    ("ray-goodman-brown-special-lady", "Special Lady", "Ray, Goodman & Brown", "strong motion by fifths: a II–V–I in the loop"),
    ("william-scream-and-shout", "Scream & Shout", "will.i.am and Britney Spears", "strong motion: keeps falling in fourths until it returns home"),
    ("wonder-sir-duke", "Sir Duke", "Stevie Wonder", "weak motion: a tritone leap, striking but with no direction"),
    ("grande-thank-u-next", "Thank U, Next", "Ariana Grande", "weak motion: G♭ to A, a break rather than a resolution"),
    ("coolio-gangstas-paradise", "Gangsta's Paradise", "Coolio", "all four chord functions; anchored at the end, a destination in position 4"),
]
def main():
    s = open(WD, encoding="utf-8").read()
    s = re.sub(r"// 12tone:begin[\s\S]*?// 12tone:end\n?", "", s)
    add = {}
    for wid, title, who, why in SONGS:
        add[wid] = {"title": title, "composer": who, "in": {},
                    "links": [{"type": "video", "title": WHERE, "url": URL, "note": why[0].upper() + why[1:] + "."}]}
    block = ("// 12tone:begin (written by scripts/works/twelvetone/loop-songs.py: songs in 12tone's chord-loop survey video)\n"
             "(function (W, add) {\n  Object.keys(add).forEach(function (id) {\n    var a = add[id], w = W[id];\n"
             "    if (!w) { W[id] = a; return; }\n    w.links = (w.links || []).concat(a.links);\n  });\n})(window.WORKS, {\n" +
             ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v, ensure_ascii=False, separators=(",", ":"))) for k, v in add.items()) +
             "\n});\n// 12tone:end\n")
    i = s.find("// print-books:begin"); s = s[:i] + block + s[i:]
    open(WD, "w", encoding="utf-8").write(s)
    items = [{"work": wid, "title": t, "composer": who, "concept": "chord loops: loop shape", "note": why[0].upper() + why[1:] + ".",
              "url": URL, "where": WHERE, "date": "2026-11-10"} for wid, t, who, why in SONGS]
    js = ("// works/uses/12tone.js: songs 12tone plays as chord-loop examples (written by scripts/works/twelvetone/loop-songs.py; links only).\n"
          "(function () {\n  \"use strict\";\n  var items = " + json.dumps(items, ensure_ascii=False, indent=1) + ";\n"
          "  (window.WORK_USES = window.WORK_USES || []).push({ src: \"12tone\", label: \"12tone\", url: \"https://www.youtube.com/@12tone\", items: items });\n})();\n")
    open(os.path.join(ROOT, "apps/shared/works/uses/12tone.js"), "w", encoding="utf-8").write(js)
    print(len(add), "songs")
main()
