#!/usr/bin/env python3
"""Writes the "Meet the ..." drum and cymbal lessons: lessons/intro-<slug>.qmd for the snares and kits of
lessons/drum-kit-compare.qmd and the cymbals of lessons/cymbal-compare.qmd (a sibling of mics.py). Each page: What you'll do,
what it is, how it sounds, the drawing (apps/shared/lessons/drumkits.js: a FaithfulPanel drawing bound to the model; click it to
strike), a guided tour (▶ steps), famous uses (apps/shared/data/drumkits/tracks.json), a quiz, Next. Facts: scripts/sources/drumkits.py.
    python3 scripts/intro-instruments/drumkits.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json
import json, sys, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return s

MODES = ("A drum head vibrates in **modes** at the zeros of the Bessel functions (Wikipedia, \"Vibrations of a circular membrane\"): "
         "not a harmonic series, which is why a drum has a pitch but no clear note. Hit the **centre** and mostly the round modes sound; hit the **edge** and many more ring.")
WIRES = ("The **snares** (wires) lie on the bottom head and rattle when it moves; the **throw-off** lever lifts them off, and the drum sounds like a tom (Wikipedia, \"Snare drum\").")
UNV = "Sizes, lugs and finish here are from memory (unverified); every number of the sound model is the site's."
CYM = ("A cymbal has many long, **inharmonic** partials (unverified: no physics text read for this page). Bigger is louder and longer; heavier is louder with more cut (Wikipedia, \"Cymbal\").")
P = {}
def snare(slug, item, name, other, what, sound, steps, quiz, desc): P[slug] = dict(item=item, name=name, other=other, cat="drum-kit", what=what, sound=sound, steps=steps, quiz=quiz, desc=desc)
def cym(slug, item, name, other, what, sound, steps, quiz, desc): P[slug] = dict(item=item, name=name, other=other, cat="cymbal", what=what, sound=sound, steps=steps, quiz=quiz, desc=desc)
Q_WIRES = ("What does the throw-off do?", ["Tunes the drum", "Lifts the snares off the bottom head", "Changes the head"], 1, "Wikipedia, \"Snare drum\".")
Q_EDGE = ("Where do more overtones ring?", ["At the centre", "Near the edge"], 1, "More modes have movement near the edge.")
snare("supraphonic", "supraphonic", "Ludwig Supraphonic", "blackbeauty",
  ["An **aluminium** snare (Ludwig calls the alloy \"Ludalloy\"), chrome-plated, 14\" across; 6.5\" deep here. " + UNV,
   "Ludwig (founded 1909) and its players are listed on Wikipedia (\"Ludwig Drums\"): Al Jackson Jr., Clyde Stubblefield, Carlton Barrett and many more."],
  [MODES, WIRES, "A metal shell adds a little ring of its own (here a few shell partials: the site's guess)."],
  [dict(set={}, hit="snare:centre", t="**Centre, wires on.** The backbeat."), dict(set={}, hit="snare:edge", t="**Edge.** More ring, more overtones."),
   dict(set={}, hit="snare:rim", t="**Rimshot.** Head and rim at once: louder and brighter."), dict(set={}, hit="snare:cross", t="**Cross-stick.** The rim alone, stick on the head."),
   dict(set={"wires": False}, hit="snare:centre", t="**Throw-off: snares off.** A tom-like drum."), dict(set={"tension": 0.2}, hit="snare:centre", t="**Tuned low.** Fat and loose.")],
  [Q_WIRES, Q_EDGE, ("What is the Supraphonic's shell?", ["Brass", "Aluminium", "Maple"], 1, "")],
  "A first look at the Ludwig Supraphonic aluminium snare: head modes, wires and throw-off, strike positions, tuning. Famous uses, quiz.")
snare("black-beauty", "blackbeauty", "Ludwig Black Beauty", "supraphonic",
  ["A **brass** snare plated black nickel, sometimes engraved; 14 x 5 here. " + UNV, "Brass is heavier than aluminium; drummers call it darker and ringier (lore, unverified)."],
  [MODES, WIRES, "The brass shell here rings longest of the four snares (the site's model)."],
  [dict(set={}, hit="snare:centre", t="**Centre.**"), dict(set={}, hit="snare:rim", t="**Rimshot.** Listen for the shell ring."),
   dict(set={"muffle": 0.5}, hit="snare:centre", t="**Muffled half.** The ring goes first."), dict(set={"tension": 0.85}, hit="snare:centre", t="**Tuned high.**")],
  [Q_WIRES, ("Black Beauty's shell metal?", ["Brass", "Aluminium", "Steel"], 0, ""), ("Muffling takes off…", ["The ring and upper overtones first", "Only the wires"], 0, "")],
  "A first look at the Ludwig Black Beauty brass snare: shell ring, muffling, rimshots, tuning. Famous uses, quiz.")
snare("maple-snare", "maple", "a maple wood snare", "supraphonic",
  ["A ply **maple** shell, 14 x 5.5 (the DW Collector's / Gretsch kind of wood snare). " + UNV, "Wood shells ring less than metal ones: warmer (lore; here the site's numbers)."],
  [MODES, WIRES], [dict(set={}, hit="snare:centre", t="**Centre.** Warm."), dict(set={"head": "coated2"}, hit="snare:centre", t="**Two-ply head.** Fatter, shorter."),
   dict(set={"wireTension": 1}, hit="snare:centre", t="**Strainer tight.** Short, crisp wires."), dict(set={"wireTension": 0}, hit="snare:centre", t="**Strainer loose.** Long buzz.")],
  [Q_WIRES, ("A tight strainer makes the wires…", ["Shorter and crisper", "Longer"], 0, "")], "A first look at a maple wood snare: warmth, heads, strainer tension. Famous uses, quiz.")
snare("piccolo-snare", "piccolo", "the piccolo snare", "maple",
  ["A **shallow** snare: 13\" across, 3\" deep here (Wikipedia, \"Snare drum\": piccolo snares are 13-14\" across and only about 4\" or less tall, higher-pitched)."],
  [MODES, WIRES, "Shallow shell: less body; tuned high: a \"pop\"."],
  [dict(set={}, hit="snare:centre", t="**Centre, tuned high.**"), dict(set={"tension": 0.3}, hit="snare:centre", t="**Tuned down.** It cannot get as deep as a 6.5\"."), dict(set={}, hit="snare:rim", t="**Rimshot.**")],
  [("Why does a piccolo sound higher?", ["Shallow shell, tuned high", "Wider head"], 0, "Wikipedia, \"Snare drum\"."), Q_EDGE], "A first look at the piccolo snare: shallow, high, crisp. Famous uses, quiz.")
snare("jazz-kit", "jazz", "the jazz kit (18 / 12 / 14)", "rock",
  ["A small kit: **18\" bass drum, 12\" tom, 14\" floor tom**, tuned high and open, in the style of the Gretsch \"round badge\" kits (style only; Wikipedia, \"Gretsch\", says little about its drums).",
   "A conventional small kit (Wikipedia, \"Drum kit\"): bass drum, snare, hi-hat, toms, ride. " + UNV],
  ["Smaller drums sound **higher** at the same tension (a membrane's pitch falls as it gets wider).", "No port, no muffling: the kick sings like a big tom."],
  [dict(set={}, hit="groove", t="**The groove.** Ride, hi-hat foot, a feathered kick."), dict(set={}, hit="kick:centre", t="**The 18\" kick, tuned high.**"),
   dict(set={}, hit="ride:bow", t="**The ride (a K).**"), dict(set={}, hit="floor:edge", t="**Floor tom, edge.**")],
  [("Bigger drum, same tension: pitch…", ["Lower", "Higher"], 0, ""), ("A jazz kick is usually…", ["Small and open", "Big and muffled"], 0, "")],
  "A first look at a jazz kit: 18 / 12 / 14, tuned high and open, ride and hi-hat foot. Click the drums to play. Famous uses, quiz.")
snare("rock-kit", "rock", "the rock kit (22 / 12 / 16)", "funk",
  ["**22\" bass drum, 12\" tom, 16\" floor tom** (22\" is the most common bass drum: Wikipedia, \"Drum kit\"), shells **acrylic** like Ludwig's Vistalite (from 1972, popularised by John Bonham: Wikipedia, \"Vistalite\"). " + UNV],
  ["Big drums tuned low; a clear head on the toms rings longer.", "A pillow in the kick (Muffling) and a port shorten the boom."],
  [dict(set={}, hit="groove", t="**The groove.**"), dict(set={}, hit="kick:centre", t="**The 22\" kick.**"),
   dict(set={"kick": {"muffle": 0, "port": False}}, hit="kick:centre", t="**No pillow, no port.** Long boom."), dict(set={"kick": {"port": True, "muffle": 0.6}}, hit="kick:centre", t="**Pillow and port.** Short, punchy.")],
  [("What does a port in the front head do here?", ["Shortens the boom, more click", "Raises the pitch an octave"], 0, "Wikipedia, \"Drum tuning\"."), ("The most common bass drum size?", ["18\"", "22\"", "26\""], 1, "Wikipedia, \"Drum kit\".")],
  "A first look at a rock kit: 22 / 12 / 16 acrylic, Vistalite style; kick tuning, pillow and port. Famous uses, quiz.")
snare("funk-kit", "funk", "the funk / studio \"dead\" kit", "jazz",
  ["A 1970s studio sound: **20 / 12 / 14**, calf-style heads, towels on the drums, a ported, pillowed kick. " + UNV],
  ["Muffling (Wikipedia, \"Drum kit\": muffles deaden ring and overtones) leaves short, fat thuds that sit under a band."],
  [dict(set={}, hit="groove", t="**The groove.**"), dict(set={}, hit="snare:centre", t="**The towelled snare.**"), dict(set={"snare": {"muffle": 0}}, hit="snare:centre", t="**Towel off.**")],
  [("Muffling shortens…", ["The decay of every mode", "Nothing"], 0, "")], "A first look at the dead 1970s studio kit: muffling, calf-style heads, a ported kick. Famous uses, quiz.")
cym("a-ride", "aride", "the Zildjian A 20\" ride", "kride",
  ["Zildjian, founded in Constantinople in **1623**; its alloy recipe is secret (Wikipedia, \"Zildjian\"). A cymbals: bell bronze, lathed (Wikipedia, \"Cymbal\").", "Ride cymbals are most often 20\" (Wikipedia, \"Ride cymbal\")."],
  [CYM, "The **bow** pings; the **bell** rings; the **edge** washes."],
  [dict(set={}, hit="aride:bow", t="**Bow.**"), dict(set={}, hit="aride:bell", t="**Bell.**"), dict(set={}, hit="aride:edge", t="**Edge: crash it.**"), dict(set={"choke": True}, hit="aride:edge", t="**Choked.**")],
  [("The ride's usual size?", ["14\"", "20\"", "10\""], 1, ""), ("The bell sounds…", ["Clear and ringing", "Like a hi-hat"], 0, "")], "A first look at the Zildjian A ride: bow, bell, edge. Famous uses, quiz.")
cym("k-ride", "kride", "the Zildjian K 20\" ride", "aride",
  ["K Zildjians: hand-hammered and **dark**; made in the US from 1975 and relaunched with Elvin Jones and Tony Williams (Wikipedia, \"Zildjian\")."],
  [CYM, "Here \"dark\" = the partials' loudness falls faster with frequency and scatters more (the site's numbers): a lower spectral centroid than an A or a 2002."],
  [dict(set={}, hit="kride:bow", t="**Bow.** Dark, washy."), dict(set={}, hit="kride:bell", t="**Bell.**"), dict(set={}, hit="kride:edge", t="**Edge.**")],
  [("Who helped relaunch the K?", ["Elvin Jones and Tony Williams", "John Bonham"], 0, "Wikipedia, \"Zildjian\"."), ("Darker means…", ["Less high energy", "Louder"], 0, "")], "A first look at the hand-hammered K Zildjian ride: dark and washy. Famous uses, quiz.")
cym("2002-crash", "p2002", "the Paiste 2002 18\" crash", "acrash",
  ["Paiste's **2002** series is **B8** bronze (8 % tin, \"CuSn8\", \"2002 bronze\"), introduced with the Stambul 65 in 1965 (Wikipedia, \"Paiste\")."],
  [CYM, "**Bright**: here the shallowest loudness tilt of all (the site's number)."],
  [dict(set={}, hit="p2002:edge", t="**Crash.** Bright."), dict(set={}, hit="p2002:bow", t="**Bow.**"), dict(set={"choke": True}, hit="p2002:edge", t="**Choke.**")],
  [("2002 alloy?", ["B8 (8 % tin)", "B20"], 0, "Wikipedia, \"Paiste\".")], "A first look at the Paiste 2002 crash: B8 bronze, bright. Famous uses, quiz.")
cym("crash", "acrash", "the 16\" crash (A)", "p2002", ["A **16\"** crash, the standard size (Wikipedia, \"Drum kit\"): the accent with a kick under it."], [CYM, "Edge strokes: a quick **wash** that blooms upward."],
  [dict(set={}, hit="acrash:edge", t="**Crash.**"), dict(set={"choke": True}, hit="acrash:edge", t="**Choke.**")], [("A crash marks…", ["Accents and changes", "The steady beat"], 0, "Wikipedia, \"Drum kit\".")], "A first look at the crash cymbal: wash, bloom, choke. Famous uses, quiz.")
cym("hi-hats", "hats", "the hi-hats", "aride", ["Two cymbals, 13-15\", on a pedal stand: **open**, **closed** and **pedal** (foot) sounds (Wikipedia, \"Hi-hat\")."], [CYM, "Closed: very short; open: long; the foot alone: the \"chick\"."],
  [dict(set={"pedal": "closed"}, hit="hats:bow", t="**Closed.**"), dict(set={"pedal": "half"}, hit="hats:bow", t="**Half open.** Sizzle."), dict(set={"pedal": "open"}, hit="hats:bow", t="**Open.**"), dict(set={"pedal": "foot"}, hit="hats:bow", t="**Foot.** The chick.")],
  [("The foot sound is called…", ["Chick", "Crash"], 0, "")], "A first look at the hi-hats: closed, half, open, foot. Famous uses, quiz.")
cym("china", "china", "the china cymbal", "acrash", ["Bright, crisp, explosive: nicknamed the **trash** cymbal; often mounted bell down (Wikipedia, \"China cymbal\")."], [CYM, "Trashy here = the sound shaken by slow noise (the site's)."],
  [dict(set={}, hit="china:edge", t="**Edge.**"), dict(set={}, hit="china:bow", t="**Bow.**")], [("Its nickname?", ["Trash cymbal", "Ride"], 0, "Wikipedia.")], "A first look at the china cymbal: trashy, explosive. Famous uses, quiz.")
cym("splash", "splash", "the splash cymbal", "acrash", ["Small: most often **8\"** then **10\"** (Wikipedia, \"Splash cymbal\"); Stewart Copeland brought it back in the early 1980s (Wikipedia, \"Paiste\")."], [CYM, "Small and thin: high and short."],
  [dict(set={}, hit="splash:edge", t="**Splash.**"), dict(set={"choke": True}, hit="splash:edge", t="**Choked.**")], [("Who brought the splash back?", ["Stewart Copeland", "Elvin Jones"], 0, "Wikipedia.")], "A first look at the splash cymbal: small, quick. Famous uses, quiz.")

SCRIPTS = ["<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/drumkits.css">',
           '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>', '<script src="/apps/shared/lessons/drumkits.js"></script>']
def page(slug, p):
    g, cmp = p["item"], ("drum-kit-compare", "Drum Kits Compared") if p["cat"] == "drum-kit" else ("cymbal-compare", "Cymbals Compared")
    o = ["---", "title: " + json.dumps("Meet " + p["name"]), "toc: true", "toc-depth: 2", "description: " + json.dumps(p["desc"]), "instruments: [drums]", "topics: [gear]", "has: [interactive, svg]", "---", "",
         f"A first stop before [{cmp[1]}]({cmp[0]}.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what {p['name']} is.", "2. Learn how it makes its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Look up famous uses.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## How it sounds", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## Play it", "", "Drawn after photos (proportions approximate, no logos). **Click the drawing** to strike it, or use the buttons; turn the knobs and press the keys. "
          "The sound is the site's model (head modes, wires, partials), not recordings; nobody has compared it with the real thing.", "",
          "```{=html}", f'<div class="dk" data-item="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="dk-step" data-item="{g}" data-set="{J(s["set"])}" data-hit="{s["hit"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous uses", "", "Where a source ties the player to this kind of drum or cymbal it is named; the links are YouTube searches (no video checked).", "",
          "```{=html}", f'<div class="dk-tracks" data-item="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="dk-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="dk-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [{cmp[1]}]({cmp[0]}.html?a={g}&b={p['other']}): this one beside another, settings translated.",
          "- [Gear 9: Drum Kit Setup and Care](gear-drums.qmd).", "", "```{=html}"] + SCRIPTS + ["```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
