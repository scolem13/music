#!/usr/bin/env python3
"""Ethan Hein's examples -> Works entries (recordings he links) and the Concepts column (apps/shared/works/uses/hein.js).

    python3 -I scripts/works/hein/hein-works.py

Sources (read 2026-11-10): "Blues tonality" (ethanhein.com, WordPress post 11150, version of 10 Jan. 2026: the YouTube videos
embedded or linked beside each song, read from the post's HTML; the song is the one the text names just before the video);
"Pieces vs Songs vs Grooves" (Substack, 6 June 2021: examples by category, each linked to his blog post on it); the podcast
episode "Songs vs Grooves" (Substack, 3 June 2026: the track list only; the audio was not heard). His 2020 blog post
"Songs vs grooves" was not readable (the site refused the connection), so nothing here comes from it.
Writes the block between "// hein:begin" and "// hein:end" in works-data.js (above the print-books block, so those merge into it).
"""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
WD = os.path.join(ROOT, "apps/shared/works/works-data.js")
BT = "https://www.ethanhein.com/wp/2014/blues-tonality/"
PSG = "https://ethanhein.substack.com/p/pieces-vs-songs-vs-grooves"
POD = "https://ethanhein.substack.com/p/songs-vs-grooves-59a"
B = "http://www.ethanhein.com/wp/"

# Blues tonality: (id, title, composer, year, yt, start, what the essay uses it for)
BLUES = [
    ("johnson-kind-hearted-woman-blues", "Kind Hearted Woman Blues", "Robert Johnson", None, None, None, "goes back and forth between I7 and I°7"),
    ("coltrane-equinox", "Equinox", "John Coltrane", 1960, "5m2HN2y0yV8", None, "♭VI7, the minor blues subdominant"),
    ("collins-dont-lose-your-cool", "Don't Lose Your Cool", "Albert Collins", None, "HbMQQM2125E", None, "the key note held over every chord: an 'avoid note' that is not avoided"),
    ("dixon-spoonful", "Spoonful", "Willie Dixon", 1960, "s0aIjyX7vwI", None, "minor pentatonic riffs over one static dominant chord"),
    ("mgs-green-onions", "Green Onions", "Booker T. & the MGs", 1962, "0oox9bJaGJ8", None, "blues harmony that looks like modal mixture"),
    ("hooker-im-bad-like-jesse-james", "I'm Bad Like Jesse James", "John Lee Hooker", 1967, "r_ZVrR6lD4s", None, "a blues whose tonality cannot be called major or minor"),
    ("band-ophelia", "Ophelia", "The Band", 1975, "rpO4lji8lR0", None, "the guitar plays the tonic blues scale over ragtime changes"),
    ("rollins-sonnymoon-for-two", "Sonnymoon for Two", "Sonny Rollins", None, None, None, "a blues tune jazz players play as a blues"),
    ("flatt-scruggs-shuckin-the-corn", "Shuckin' the Corn", "Flatt & Scruggs", 1957, "PoMYOzX71Mw", None, "a twelve-bar that is bluegrass, not blues"),
    ("hefti-batman-theme", "Batman Theme", "Neal Hefti", 1966, "EZ9ymE2Rcxo", None, "a twelve-bar that is jazzy rock, not blues"),
    ("adderley-work-song", "Work Song", "Nat Adderley", 1960, None, None, "blues feel without the twelve-bar form (after Jaffe)"),
    ("timmons-moanin", "Moanin'", "Bobby Timmons", 1958, "Cv9NSR-2DwM", None, "blues feel without the twelve-bar form (after Jaffe)"),
    ("kool-jungle-boogie", "Jungle Boogie", "Kool & the Gang", 1973, "QGKiC2suCHQ", None, "funk: blues tonality (compare disco)"),
    ("bee-gees-love-you-inside-out", "Love You Inside Out", "Bee Gees", 1979, "SouY1MKclZ4", None, "disco: diatonic or jazz harmony (compare funk)"),
    ("simon-bridge-over-troubled-water", "Bridge Over Troubled Water", "Simon & Garfunkel", 1970, "4G-YQA_bsOU", None, "Simon & Garfunkel's original: compare Aretha Franklin's bluesier version"),
    ("daft-punk-harder-better-faster-stronger", "Harder Better Faster Stronger", "Daft Punk", 2001, "gAjR4_CbPpQ", "2:30", "the melody turns from diatonic minor to blues at 2:30"),
    ("haley-rock-around-the-clock", "Rock Around the Clock", "Bill Haley & His Comets", 1955, "ZgdufzXvjqw", None, "a straightforward twelve-bar blues at number one"),
    ("poyi-bamana-jeli", "Poyi", "traditional (Bamana jeli, Mali)", None, "KA0ErTCqUPo", None, "a griot song older than the slave trade (after Durán)"),
    ("franklin-chain-of-fools", "Chain of Fools", "Aretha Franklin", 1968, "o0s5CP2kXsc", "0:41", "Aretha Franklin's 'fool' at 0:41: F, down to E♭, slide up to E"),
]
EXTRA_REC = {"simon-bridge-over-troubled-water": [{"yt": "2enKx84cLB4", "performer": "Aretha Franklin", "year": 1971,
             "note": "Hein: bluesier than the original (rhythm, pitch play)."}]}
PERF = {
        "dixon-spoonful": None, "poyi-bamana-jeli": None}

# Pieces vs Songs vs Grooves (2021): (id, title, composer, category, his post)
PSG_ITEMS = [
    ("bach-art-of-fugue", "The Art of Fugue", "J. S. Bach", "piece", "tag/art-of-fugue/"),
    ("chopin-nocturne-op9-1", "Nocturne Op. 9 No. 1", "Frédéric Chopin", "piece", "2020/jazzy-harmony-and-crazy-tuplets-in-chopins-nocturne-op-9-no-1/"),
    ("beethoven-pathetique", "Piano Sonata No. 8 'Pathétique'", "Ludwig van Beethoven", "piece", "2020/beethovens-pathetique-sonata/"),
    ("bartok-mikrokosmos-133", "Mikrokosmos No. 133, Syncopation", "Béla Bartók", "piece", "2020/remixing-bartoks-mikrokosmos-no-133-syncopation/"),
    ("prince-kiss", "Kiss", "Prince", "song", "2021/the-best-guitar-solo-ever-recorded/"),
    ("wellerman", "Wellerman", "", "song", "2021/wellerman/"),
    ("parliament-children-of-production", "Children of Production", "Parliament", "song", "2020/children-of-production/"),
    ("greensleeves", "Greensleeves", "traditional", "song", "2020/greensleeves/"),
    ("jri-eleanor-rigby", "Eleanor Rigby", "The Beatles", "song", "2020/eleanor-rigby/"),
    ("santana-oye-como-va", "Oye Como Va", "Santana", "groove", "2021/oye-como-va/"),
    ("mgs-green-onions", "Green Onions", "Booker T. & the MGs", "groove", "2021/green-onions/"),
    ("rollins-sonnymoon-for-two", "Sonnymoon for Two", "Sonny Rollins", "groove", "2021/sonnymoon-for-two/"),
    ("roots-dont-see-us", "Don't See Us", "The Roots", "groove", "2021/the-roots-dont-see-us/"),
    ("elliott-get-ur-freak-on", "Get Ur Freak On", "Missy Elliott", "groove", "2020/transcribing-missy-elliott/"),
    ("franklin-chain-of-fools", "Chain of Fools", "Aretha Franklin", "groove", "2021/chain-of-fools/"),
    ("kendricks-keep-on-truckin", "Keep On Truckin'", "Eddie Kendricks", "edge: excellent grooves in a nominal song structure", "2021/keep-on-truckin/"),
    ("bach-chaconne", "Chaconne (Partita No. 2 in D minor)", "J. S. Bach", "edge: a piece resting on a groove foundation", "2021/deep-dive-into-the-bach-chaconne/"),
    ("bach-passacaglia-c-minor", "Passacaglia and Fugue in C minor", "J. S. Bach", "edge: a piece resting on a groove foundation", "2021/bachs-passacaglia-and-fugue-in-c-minor/"),
    ("rodgers-my-favorite-things", "My Favorite Things", "from The Sound of Music", "edge: a song that John Coltrane turned into a groove", "2021/my-favorite-things/"),
    ("davis-in-a-silent-way", "In a Silent Way", "Miles Davis", "edge: grooves edited together into a large-scale piece", "2021/miles-davis-in-a-silent-way/"),
]
# Songs vs Grooves podcast (2026): track list as printed (performer, title, year)
POD_ITEMS = [
    ("jri-yesterday", "Yesterday", "The Beatles", 1965), ("brown-the-payback", "The Payback", "James Brown", 1973),
    ("parliament-flashlight", "Flashlight", "Parliament", 1978), ("jackson-dont-stop-til-you-get-enough", "Don't Stop 'Til You Get Enough", "Michael Jackson", 1979),
    ("gillespie-manteca", "Manteca", "Dizzy Gillespie", 1957), ("underworld-rez", "Rez", "Underworld", 1993),
    ("orb-little-fluffy-clouds", "Little Fluffy Clouds", "The Orb", 1991), ("run-dmc-sucker-mcs", "Sucker MCs", "Run-DMC", 1983),
    ("fitzgerald-wait-til-you-see-him", "Wait Till You See Him", "Ella Fitzgerald", 1956),
    ("jri-the-sound-of-silence", "The Sound of Silence (The Golden Pony Remix)", "Simon & Garfunkel", 2014),
    ("brown-sex-machine", "Get Up (I Feel Like Being a) Sex Machine", "James Brown", 1970), ("brown-funky-drummer", "Funky Drummer", "James Brown", 1970),
    ("brown-give-it-up-or-turnit-a-loose", "Give It Up or Turnit a Loose", "James Brown", 1970), ("dead-dark-star", "Dark Star", "Grateful Dead", 1969),
    ("beatles-hey-jude", "Hey Jude", "The Beatles", 1968), ("wonder-living-for-the-city", "Living for the City", "Stevie Wonder", 1973),
    ("carpenter-espresso", "Espresso", "Sabrina Carpenter", 2024), ("temptations-aint-too-proud-to-beg", "Ain't Too Proud to Beg", "The Temptations", 1966),
    ("hancock-chameleon", "Chameleon", "Herbie Hancock", 1973), ("basie-one-oclock-jump", "One O'Clock Jump", "Count Basie", 1937),
    ("harris-freedom-jazz-dance", "Freedom Jazz Dance", "Eddie Harris", 1961), ("davis-its-about-that-time", "It's About That Time", "Miles Davis", 1969),
    ("reich-music-for-pieces-of-wood", "Music for Pieces of Wood", "Steve Reich", 1973), ("glass-music-in-contrary-motion", "Music in Contrary Motion", "Philip Glass", 1969),
    ("reich-electric-counterpoint", "Electric Counterpoint", "Steve Reich", 1989), ("piccinini-passacaglia", "Passacaglia", "Alessandro Piccinini", 1639),
    ("chopin-nocturne-op9-1", "Nocturne Op. 9 No. 1", "Frédéric Chopin", 1832), ("shadows-apache", "Apache", "Incredible Bongo Band", 1973),
    ("bach-chaconne", "Chaconne (Partita No. 2 in D minor)", "J. S. Bach", None), ("cage-the-perilous-night", "The Perilous Night", "John Cage", 1944),
]

def main():
    s = open(WD, encoding="utf-8").read()
    s = re.sub(r"// hein:begin[\s\S]*?// hein:end\n?", "", s)
    global_w = {}
    exec_js = None
    entries = {}
    for wid, title, comp, year, yt, start, why in BLUES:
        e = entries.setdefault(wid, {"title": title, "composer": comp, "in": {}})
        if year: e["published"] = year
        if yt:
            r = {"yt": yt, "note": "Linked in Ethan Hein's 'Blues tonality': " + why + "."}
            if PERF.get(wid): r["performer"] = PERF[wid]
            if start: r["start"] = start
            e.setdefault("recordings", []).append(r)
        for x in EXTRA_REC.get(wid, []): e.setdefault("recordings", []).append(x)
        e.setdefault("links", []).append({"type": "article", "title": "Ethan Hein, Blues tonality", "url": BT, "note": why})
    for wid, title, comp, cat, post in PSG_ITEMS:
        e = entries.setdefault(wid, {"title": title, "composer": comp, "in": {}})
        e.setdefault("links", []).append({"type": "article", "title": "Ethan Hein on " + title, "url": B + post, "note": "In 'Pieces vs Songs vs Grooves' as a " + cat.split(":")[0] + "."})
    for wid, title, comp, year in POD_ITEMS:
        e = entries.setdefault(wid, {"title": title, "composer": comp, "in": {}})
        if year and "published" not in e and wid not in ("jri-yesterday", "beatles-hey-jude"): e["published"] = year
    # existing hand entries keep their own title / composer: the block only adds links and recordings to them
    block = ("// hein:begin (written by scripts/works/hein/hein-works.py: Ethan Hein's examples; recordings are the ones he links)\n"
             "(function (W, add) {\n"
             "  Object.keys(add).forEach(function (id) {\n"
             "    var a = add[id], w = W[id];\n"
             "    if (!w) { W[id] = a; return; }\n"
             "    [\"recordings\", \"links\"].forEach(function (k) { if (a[k]) w[k] = (w[k] || []).concat(a[k]); });\n"
             "    if (a.published != null && w.published == null && w.composed == null) w.published = a.published;\n"
             "  });\n"
             "})(window.WORKS, {\n" +
             ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v, ensure_ascii=False, separators=(",", ":"))) for k, v in entries.items()) +
             "\n});\n// hein:end\n")
    i = s.find("// print-books:begin")
    s = s[:i] + block + s[i:]
    open(WD, "w", encoding="utf-8").write(s)
    # Concepts column
    items = []
    for wid, title, comp, year, yt, start, why in BLUES:
        items.append({"work": wid, "title": title, "composer": comp, "concept": "blues tonality", "note": why[0].upper() + why[1:] + ".",
                      "url": BT, "where": "Blues tonality", "date": "2026-01-10"})
    for wid, title, comp, cat, post in PSG_ITEMS:
        c = cat.split(":")[0]
        items.append({"work": wid, "title": title, "composer": comp, "concept": "pieces, songs and grooves: " + ("edge case" if c == "edge" else "a " + c),
                      "note": (cat.split(": ", 1)[1][0].upper() + cat.split(": ", 1)[1][1:] + ".") if ":" in cat else
                              {"piece": "Listed as a piece: linear, non-repeating events in a set order.",
                               "song": "Listed as a song: a linear arrangement of circular (groove) sections.",
                               "groove": "Listed as a groove: a short repeating cell with no larger-scale structure."}[c], "url": PSG,
                      "where": "Pieces vs Songs vs Grooves", "date": "2021-06-06"})
    for wid, title, comp, year in POD_ITEMS:
        items.append({"work": wid, "title": title, "composer": comp, "concept": "songs vs grooves",
                      "note": "In the episode's track list; the page does not say how it is used (audio not heard).", "url": POD,
                      "where": "Podcast: Songs vs Grooves", "date": "2026-06-03"})
    js = ("// works/uses/hein.js: pieces Ethan Hein uses as examples (written by scripts/works/hein/hein-works.py; LINKS ONLY, notes in our words).\n"
          "(function () {\n  \"use strict\";\n  var items = " + json.dumps(items, ensure_ascii=False, indent=1) + ";\n"
          "  (window.WORK_USES = window.WORK_USES || []).push({ src: \"hein\", label: \"Ethan Hein\", url: \"https://www.ethanhein.com\", items: items });\n})();\n")
    open(os.path.join(ROOT, "apps/shared/works/uses/hein.js"), "w", encoding="utf-8").write(js)
    print(len(entries), "works,", sum(len(e.get("recordings", [])) for e in entries.values()), "recordings,", len(items), "concept uses")

main()
