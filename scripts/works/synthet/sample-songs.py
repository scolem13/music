#!/usr/bin/env python3
"""The records in Synthet's "the best samples in history" -> Works links and the Concepts column (apps/shared/works/uses/synthet.js).

    python3 -I scripts/works/synthet/sample-songs.py

Source: the video's auto-generated English subtitles and the song captions it shows in the top left (read from frames, one a
second, 2026-11-24); title and channel from YouTube's oEmbed. Times are when the caption (or, with no caption, the narration)
first appears, to the second. Years are the captions'; rows marked `heard` have no caption, so the name comes from the narration
(auto-subtitles, which garble names) and is unverified. Each link opens the video at that time.
Writes the block between "// synthet:begin" and "// synthet:end" in works-data.js (above print-books). An entry that already
exists keeps its title / composer; it gets the link, and the year if it has none.
"""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
WD = os.path.join(ROOT, "apps/shared/works/works-data.js")
VID = "K71XefOlJh0"
WHERE = "Synthet, the best samples in history"
FD, AP, GT, CH, TH, PI, CP = ("Funky Drummer break", "Apache (bongo break and melody)", "Good Times bassline",
    "Chic: Soup for One", "Think break (\"Yeah! Woo!\")", "Charmels piano (C.R.E.A.M.)", "\"Champ\" one-shot")
# id, title, artist, year, sample, how it is used, seconds into the video, heard (no caption: name from narration, unverified)
SONGS = [
    ("brown-funky-drummer", "Funky Drummer", "James Brown", 1970, FD, "the source: Clyde Stubblefield's drum break, re-released as drums alone in 1986", 22, False),
    ("public-enemy-rebel-without-a-pause", "Rebel Without a Pause", "Public Enemy", 1988, FD, "uses the break", 78, False),
    ("nwa-fuck-tha-police", "Fuck Tha Police", "N.W.A", 1988, FD, "uses the break", 81, False),
    ("astley-never-gonna-give-you-up", "Never Gonna Give You Up", "Rick Astley", 1987, FD, "the break in a pop song (heard in the video, no caption)", 86, True),
    ("michael-freedom-90", "Freedom! '90", "George Michael", 1990, FD, "uses the break", 91, False),
    ("sheeran-shirtsleeves", "Shirtsleeves", "Ed Sheeran", 2014, FD, "uses the break", 98, False),
    ("powerpuff-girls-theme", "The Powerpuff Girls (Main Theme)", "Thomas Chase, Steve Rucker & James L. Venable", 1998, FD, "the break sped up", 114, False),
    ("shadows-apache-1960", "Apache", "The Shadows", 1960, AP, "the first hit version of Jerry Lordan's melody (caption says 1959; released 1960); hardly sampled", 195, False),
    ("shadows-apache", "Apache", "Incredible Bongo Band", 1973, AP, "the source: the cover with the long bongo break", 215, False),
    ("ll-cool-j-you-cant-dance", "You Can't Dance", "LL Cool J", 1985, AP, "uses the bongo break", 228, False),
    ("jay-z-kanye-thats-my-bitch", "That's My Bitch", "Jay-Z & Kanye West", 2011, AP, "uses the bongo break", 233, False),
    ("jagger-sweet-thing", "Sweet Thing", "Mick Jagger", 1993, AP, "uses the bongo break", 238, False),
    ("aphex-twin-heliosphan", "Heliosphan", "Aphex Twin", 1992, AP, "uses the bongo break", 245, False),
    ("sugarhill-gang-apache", "Apache (Jump On It)", "The Sugarhill Gang", 1981, AP, "copies the Bongo Band version (bongo intro and melody) rather than sampling it (caption says 1979; released 1981)", 259, False),
    ("chic-good-times", "Good Times", "Chic", 1979, GT, "the source: Bernard Edwards's bassline", 316, False),
    ("sugarhill-gang-rappers-delight", "Rapper's Delight", "The Sugarhill Gang", 1979, GT, "the bassline replayed", 290, False),
    ("beatangers-whats-that-sound", "What's That Sound", "The Beatangers", 2014, GT, "uses the bassline", 298, False),
    ("queen-another-one-bites-the-dust", "Another One Bites the Dust", "Queen", 1980, GT, "a bassline inspired by it, not a sample", 306, False),
    ("chic-soup-for-one", "Soup for One", "Chic", 1982, CH, "the source: Nile Rodgers's guitar part, looped, filtered and re-pitched (heard in the video, no caption)", 320, True),
    ("modjo-lady", "Lady (Hear Me Tonight)", "Modjo", 2000, CH, "loops the Soup for One guitar", 336, False),
    ("collins-think-about-it", "Think (About It)", "Lyn Collins", 1972, TH, "the source: produced by James Brown, drums by John \"Jabo\" Starks; on the Ultimate Breaks & Beats compilations", 362, False),
    ("rob-base-it-takes-two", "It Takes Two", "Rob Base & DJ E-Z Rock", 1988, TH, "uses the break and the vocal shots", 393, False),
    ("boomfunk-mcs-freestyler", "Freestyler", "Boomfunk MC's", 1999, TH, "uses the break, sped up", 402, False),
    ("green-bill-nye-the-science-guy", "Bill Nye the Science Guy (theme)", "Mike Greene", 1993, TH, "uses the break", 414, False),
    ("murs-heart-skips-a-beat", "Heart Skips a Beat", "Olly Murs", 2011, TH, "uses the break", 423, False),
    ("frizk-all-my-fellas", "ALL MY FELLAS", "Frizk", 2023, TH, "uses the break", 428, False),
    ("charmels-as-long-as-ive-got-you", "As Long as I've Got You", "The Charmels", 1967, PI, "the source of the piano (heard in the video, no caption)", 445, True),
    ("wu-tang-clan-cream", "C.R.E.A.M.", "Wu-Tang Clan", 1994, PI, "the piano is the Charmels sample; itself sampled and quoted 400+ times", 458, False),
    ("mohawks-the-champ", "The Champ", "The Mohawks", 1968, CP, "the source: \"Champ!\" and an organ stab (heard in the video, no caption)", 492, True),
    ("doja-cat-mooo", "Mooo!", "Doja Cat", 2018, CP, "uses the one-shot", 506, False),
    ("kamoze-here-comes-the-hotstepper", "Here Comes the Hotstepper", "Ini Kamoze", 1994, CP, "uses the one-shot", 545, False),
    ("q-tip-lets-ride", "Let's Ride", "Q-Tip", 1999, CP, "uses the one-shot", 553, False),
    ("grande-you-dont-know-me", "You Don't Know Me", "Ariana Grande", 2014, CP, "uses the one-shot", 560, False),
    ("ocean-nikes", "Nikes", "Frank Ocean", 2016, CP, "uses the one-shot", 564, False),
]

def note(sample, how, heard):
    return "%s: %s%s." % (sample, how, "" if not heard else "; name from the narration, unverified")

def main():
    s = open(WD, encoding="utf-8").read()
    s = re.sub(r"// synthet:begin[\s\S]*?// synthet:end\n?", "", s)
    add = {}
    for wid, title, who, year, sample, how, t, heard in SONGS:
        add[wid] = {"title": title, "composer": who, "in": {}, "published": year,
                    "links": [{"type": "video", "title": WHERE, "url": "https://www.youtube.com/watch?v=%s&t=%ds" % (VID, t),
                               "note": note(sample, how, heard)}]}
    block = ("// synthet:begin (written by scripts/works/synthet/sample-songs.py: records in Synthet's most-sampled video)\n"
             "(function (W, add) {\n  Object.keys(add).forEach(function (id) {\n    var a = add[id], w = W[id];\n"
             "    if (!w) { W[id] = a; return; }\n    w.links = (w.links || []).concat(a.links);\n"
             "    if (w.published == null) w.published = a.published;\n  });\n})(window.WORKS, {\n" +
             ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v, ensure_ascii=False, separators=(",", ":"))) for k, v in add.items()) +
             "\n});\n// synthet:end\n")
    i = s.find("// print-books:begin"); s = s[:i] + block + s[i:]
    open(WD, "w", encoding="utf-8").write(s)
    items = [{"work": wid, "title": t, "composer": who, "concept": "sampling: " + sample, "note": note(sample, how, heard)[len(sample) + 2:],
              "url": "https://www.youtube.com/watch?v=%s&t=%ds" % (VID, sec), "where": WHERE, "date": "2026-11-24"}
             for wid, t, who, year, sample, how, sec, heard in SONGS]
    js = ("// works/uses/synthet.js: records in Synthet's \"the best samples in history\" (written by scripts/works/synthet/sample-songs.py; links only).\n"
          "(function () {\n  \"use strict\";\n  var items = " + json.dumps(items, ensure_ascii=False, indent=1) + ";\n"
          "  (window.WORK_USES = window.WORK_USES || []).push({ src: \"synthet\", label: \"Synthet\", url: \"https://www.youtube.com/@synthet7\", items: items });\n})();\n")
    open(os.path.join(ROOT, "apps/shared/works/uses/synthet.js"), "w", encoding="utf-8").write(js)
    print(len(add), "songs")
main()
