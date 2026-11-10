#!/usr/bin/env python3
"""Writes the Everyday Tonality lessons (lessons/tagg-*.qmd) from summaries/part*.md (chapter summaries, written with AI help from
the book's text and checked by page), tables.json (tables.py) and the glossary terms at the end of each summaries file.

    python3 -I lessons.py

Each lesson: its chapters (summary, key ideas with pages, pieces, Try this), the book's tables whose page falls in those chapters
(each recording with a ▶ that plays its chords: apps/shared/lessons/tagg-tables.js), and the glossary terms whose page falls there.
lessons/tagg-glossary.qmd has every term. Edit the summaries or this script and rerun; the pages are written over.
"""
import html, json, os, re
here = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(here, "../../.."))

LESSONS = [  # slug, title, description, chapters (0 = preface), topics
    ("tagg-sound", "Everyday Tonality 1: Notes, Tones and Tuning",
     "Philip Tagg's Everyday Tonality, chapters 1-2 in plain words: note, pitch, tone and 'tonal', timbre, tuning, octaves and intervals.",
     [0, 1, 2], ["theory", "sound"]),
    ("tagg-modes", "Everyday Tonality 2: Modes",
     "Chapters 3-4: the seven-note modes (ionian to locrian, maqam), and the pentatonic, hexatonic and other modes most music uses.",
     [3, 4], ["theory", "scales"]),
    ("tagg-melody", "Everyday Tonality 3: Melody, Polyphony and Chords",
     "Chapters 5-7: what makes a melody, how voices combine, and what a chord is (tertial, quartal, lead-sheet shorthand).",
     [5, 6, 7], ["theory", "harmony"]),
    ("tagg-harmony", "Everyday Tonality 4: Three Kinds of Harmony",
     "Chapters 8-10: 'classical' harmony and the circle of fifths, non-classical tertial harmony in rock and pop, and quartal harmony. Play the book's progression tables.",
     [8, 9, 10], ["theory", "harmony"]),
    ("tagg-shuttles", "Everyday Tonality 5: One-Chord Changes and Shuttles",
     "Chapters 11-12: one-chord songs, and shuttles between two chords. Play every shuttle in the book's tables.",
     [11, 12], ["theory", "harmony"]),
    ("tagg-loops", "Everyday Tonality 6: Loops, Bimodality and Yes We Can",
     "Chapters 13-15: chord loops (the vamp, I-vi-IV-V, La Bamba and mixolydian loops), progressions that work both ways, and the four chords of Yes We Can.",
     [13, 14, 15], ["theory", "harmony"]),
]

def chapters():
    out = {}; gl = {}
    for i in range(1, 5):
        t = open(os.path.join(here, "summaries", "part%d.md" % i), encoding="utf-8").read()
        body, _, g = t.partition("## Glossary terms")
        for m in re.finditer(r"^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$", g, re.M):
            k = m.group(1).strip()
            if k.lower() not in {x.lower() for x in gl} or len(m.group(2)) > len(gl.get(k, "")): gl[k] = m.group(2).strip()
        for sec in re.split(r"(?m)^(?=## )", body):
            m = re.match(r"## (?:Chapter (\d+)|Preface)[^\n]*\(pp?\. (\d+)", sec)
            if m: out[int(m.group(1) or 0)] = sec.strip()
    return out, gl

def gloss_page(v):
    m = re.search(r"\(Tagg pp?\. (\d+)", v); return int(m.group(1)) if m else None

def md_chapter(sec):
    """## Chapter N … -> ## heading, **Key ideas** etc. -> ### headings (the right-hand jump bar lists them)."""
    lines = sec.split("\n")
    head = lines[0].replace("## Preface", "## Preface")
    out = [head.replace("’", "'")]
    for l in lines[1:]:
        m = re.match(r"^\*\*(Key ideas|Example pieces|Try this)\*\*:?\s*(.*)$", l)
        if m: out.append("\n### " + m.group(1) + ("\n\n" + m.group(2) if m.group(2) else "")); continue
        out.append(l)
    return "\n".join(out)

def cell(lines):
    return "<br>".join(re.sub(r"_(.+?)_", r"<i>\1</i>", html.escape(l, quote=False)) for l in lines)

def table_html(t):
    hd = "".join("<th>%s</th>" % cell([h]) for h in t["header"]) if any(t["header"]) else ""
    rows = []
    for r in t["display"]:
        rows.append("<tr>" + "".join("<td>%s</td>" % cell(c) for c in r) + "</tr>")
    songs = [s for s in t.get("songs", []) if s.get("chords")]
    play = ""
    if songs:
        play = "<details class=\"tg-hear\"><summary>Hear the progressions (%d)</summary><ul>%s</ul></details>" % (len(songs), "".join(
            "<li><button class=\"tg-play\" data-chords=\"%s\" aria-label=\"Play %s\">▶</button> <b>%s</b> <i>%s</i>%s</li>" % (
                html.escape(s["chords"]), html.escape(s["title"]), html.escape(s.get("artist", "")), html.escape(s["title"]),
                " · " + html.escape(s["chords"]) + (" (in " + html.escape(s["key"]) + ")" if s.get("key") else "")) for s in songs))
    note = "<p class=\"tg-note\">%s</p>" % html.escape(t["note"]) if t.get("note") else ""
    hand = " (copied by hand from the page)" if t.get("hand") else ""
    cap = re.sub(r"_", "", t.get("caption") or "")
    return ("```{=html}\n<figure class=\"tg-table\"><figcaption>Table %d. %s <span>(Tagg p. %d%s)</span></figcaption>"
            "<div class=\"tg-wrap\"><table>%s<tbody>%s</tbody></table></div>%s%s</figure>\n```\n") % (
        t["table"], html.escape(cap), t["page"], hand, "<thead><tr>%s</tr></thead>" % hd if hd else "", "".join(rows), note, play)

CH_PAGES = {0: (11, 44), 1: (45, 64), 2: (65, 84), 3: (85, 150), 4: (151, 178), 5: (179, 204), 6: (205, 218), 7: (219, 244),
            8: (245, 272), 9: (273, 292), 10: (293, 352), 11: (353, 370), 12: (371, 400), 13: (401, 420), 14: (421, 450), 15: (451, 478)}

INTRO = ("These pages walk through Philip Tagg's book *Everyday Tonality II: Towards a Tonal Theory of What Most People Hear* "
         "(2014) in plain words. Tagg's point: most of the music people hear every day (pop, rock, film, games, folk) does not follow "
         "the rules of classical harmony, and needs its own words. Page numbers point to the book. The summaries were drafted with AI "
         "help from the book's text; check a page before quoting it.")

def write():
    ch, gl = chapters()
    T = json.load(open(os.path.join(here, "tables.json"), encoding="utf-8"))
    for i, (slug, title, desc, chs, topics) in enumerate(LESSONS):
        lo, hi = CH_PAGES[chs[0]][0], CH_PAGES[chs[-1]][1]
        parts = ["---", 'title: "%s"' % title, "toc: true", "toc-depth: 2", 'description: "%s"' % desc.replace('"', "'"),
                 "instruments: [guitar, bass, piano, voice, other]", "topics: [%s]" % ", ".join(topics),
                 "has: [%s]" % ("band, interactive" if any(lo <= t["page"] <= hi for t in T) else ""), "---", ""]
        parts.append(INTRO + (" Start with [the glossary](tagg-glossary.qmd) if a word is new." if i == 0 else " New words: [glossary](tagg-glossary.qmd)."))
        parts.append("")
        for c in chs:
            sec = md_chapter(ch[c]); parts.append(sec); parts.append("")
            tabs = [t for t in T if CH_PAGES[c][0] <= t["page"] <= CH_PAGES[c][1]]
            if tabs:
                parts.append("### The book's tables\n")
                if any(t.get("songs") for t in tabs):
                    parts.append("Press ▶ to hear a recording's chords played by the band (piano, bass and drums), one chord a bar. "
                                 "It is the chord pattern only, not the recording.\n")
                for t in tabs: parts.append(table_html(t))
        terms = [(k, v) for k, v in sorted(gl.items(), key=lambda kv: kv[0].lower()) if (gloss_page(v) or 0) and lo <= gloss_page(v) <= hi]
        if terms:
            parts.append("## Words from these chapters\n")
            for k, v in terms: parts.append("**%s**: %s\n" % (k, v))
        parts.append("## Works Cited\n\n<!-- works-cited: written by scripts/works-cited.py -->\n<!-- /works-cited -->\n")
        parts.append("{{< include _tagg-kit.qmd >}}\n")
        open(os.path.join(ROOT, "lessons", slug + ".qmd"), "w", encoding="utf-8").write("\n".join(parts))
    g = ["---", 'title: "Everyday Tonality: Glossary"', "toc: true", "toc-depth: 2",
         'description: "The words Philip Tagg uses in Everyday Tonality II, explained for students, with the page each comes from."',
         "instruments: [guitar, bass, piano, voice, other]", "topics: [theory]", "has: []", "---", "",
         "The words you need for [the Everyday Tonality lessons](tagg-sound.qmd), in Tagg's sense (he avoids some school words on purpose: "
         "*ionian* instead of *major*, *tonical* for 'to do with the home note'). Each ends with the book page it comes from.", ""]
    letters = {}
    for k, v in sorted(gl.items(), key=lambda kv: kv[0].lower().lstrip("'‘")):
        letters.setdefault(k.lstrip("'‘")[0].upper(), []).append((k, v))
    for L, items in letters.items():
        g.append("## %s\n" % L)
        for k, v in items: g.append("**%s**: %s\n" % (k, v))
    g.append("## Works Cited\n\n<!-- works-cited: written by scripts/works-cited.py -->\n<!-- /works-cited -->\n")
    open(os.path.join(ROOT, "lessons", "tagg-glossary.qmd"), "w", encoding="utf-8").write("\n".join(g))
    print(len(LESSONS), "lessons +", "glossary of", len(gl), "terms")

if __name__ == "__main__":
    write()
