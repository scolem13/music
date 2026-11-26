#!/usr/bin/env python3
"""Writes the organ "Meet the Instruments" lessons: lessons/intro-{b3,vox-continental,farfisa,pipe-organ}.qmd.

A sibling of build.py (which is written for synths, drum machines and sequencers): it imports build.py's page() and adds an
"organ" kind (widget apps/shared/lessons/organ-compare.js, compare page lessons/organ-compare.qmd) without changing build.py.
Facts: Wikipedia ("Hammond organ", "Vox Continental", "Farfisa", "Organ stop") and the Hammond XK-5 manual's B-3 percussion notes,
listed in scripts/sources/organs.py; anything else is marked UNVERIFIED. Videos: apps/shared/data/organs/assignments.json.
    python3 scripts/intro-instruments/organs.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build as B

ROOT = B.ROOT
B.COMPARE["organ"] = ("organ-compare.qmd", "Classic Organs Compared")
B.SCRIPT["organ"] = "organ-compare"
B.CLS["organ"] = "ocmp"
B.PLAYHOW["organ"] = ("Play it from the keys under the panel or the computer keys (a w s e d f t g y h u j k); **Keys play** picks the manual. "
                      "Pull a drawbar or press a tab while you play.")
_vids = B.vids
def vids(kind, mid):
    if kind != "organ": return _vids(kind, mid)
    d = json.loads((ROOT / "apps/shared/data/organs/assignments.json").read_text())
    return [(v["song"] + " — " + v["artist"] + " (YouTube: “" + v["title"] + "”)", v["channel"], v["url"]) for v in d["videos"] if v["organ"] == mid]
B.vids = vids
TRACKS = lambda mid: ("Build it from a record", ["Each record below has a **Build it on the panel** button that loads a *starting* registration made on this page "
    "(not the player's documented setting), so you can listen to the record and change the panel by ear until it is close.", "",
    "```{=html}", f'<div class="ocmp-tracks" data-organ="{mid}"></div>', "```"])

P = {}
P["b3"] = dict(kind="organ", wid="b3", name="Hammond B-3", short="B-3", compare_q="organ=b3",
 desc="A first look at the Hammond B-3 / C-3 organ and its Leslie speaker: drawbars, preset keys, percussion, vibrato and chorus, a guided tour, famous records and a short quiz.",
 what=["The **Hammond B-3** and **C-3** came out in **1954**, with harmonic percussion, and were made until early **1975** (Wikipedia, \"Hammond organ\"). The C-3 is the same organ in a closed church-style cabinet (UNVERIFIED detail).",
       "It is *electromechanical*: spinning **tonewheels** past pickups make the pitches, close to pure sine waves.",
       "Two manuals of 61 keys and a pedalboard (Wikipedia).",
       "It is usually played through a **Leslie speaker** such as the 122, which spins a horn and a drum (Wikipedia, \"Hammond organ\")."],
 sound=["**Drawbars** mix nine pitches of every key, from 16′ (an octave below) to 1′ (three octaves above). Pull one out to make it louder.",
        "**Preset keys**: the reverse-coloured octave to the left. C silences the manual, A♯ and B pick the two drawbar sets, the others are presets (Wikipedia).",
        "**Percussion** adds a quick 2nd or 3rd harmonic to the start of a note; only on the upper manual with preset B, and it silences the 1′ drawbar (Hammond XK-5 manual, \"same as B-3/C-3\").",
        "**Vibrato and chorus**: six settings V1 V2 V3 C1 C2 C3, on or off for each manual (Wikipedia).",
        "**Leslie**: slow (chorale) or fast (tremolo). The horn speeds up faster than the drum."],
 tour_intro="Each step loads a registration and plays the same short phrase: chords on the lower manual, a tune on the upper, a bass line on the pedals.",
 steps=[dict(ex="b3-flute", t="**A preset.** Preset key **C♯**, *Stopped Flute* (00 5320 000). Listen: soft and hollow."),
        dict(ex="b3-jazz", set={"perc": False, "leslie": "stop", "vibU": False}, t="**Three drawbars.** Preset **B**, drawbars 88 8000 000, nothing else. Listen: a round, plain organ tone."),
        dict(ex="b3-jazz", set={"leslie": "stop", "vibU": False}, t="**Percussion.** Add **3rd harmonic, soft, fast** percussion. Listen for a click of pitch at the start of each melody note."),
        dict(ex="b3-jazz", set={"leslie": "stop"}, t="**Chorus C3.** Turn the scanner on for the upper manual on **C3**. Listen: a shimmer around each note."),
        dict(ex="b3-jazz", t="**Leslie slow.** The same with the Leslie on **chorale**. Listen: the sound moves round the room."),
        dict(ex="b3-full", t="**Everything out, Leslie fast.** All nine drawbars at 8 and the Leslie on **tremolo**, with some drive. Listen: loud, bright and spinning.")],
 extra=[TRACKS("b3")],
 records=["Booker T. & the M.G.'s, \"Green Onions\"", "Procol Harum, \"A Whiter Shade of Pale\" (Matthew Fisher)", "The Spencer Davis Group, \"Gimme Some Lovin'\" (Steve Winwood)", "Jimmy Smith, \"Walk on the Wild Side\""],
 rec_src="Wikipedia, \"Hammond organ\"",
 quiz=[("What makes the B-3's pitches?", ["Spinning tonewheels", "Pipes and wind", "A tape loop", "Twelve transistor oscillators"], 0, "Tonewheels past pickups."),
       ("You pull a drawbar further out. What happens?", ["Its pitch gets louder", "It goes up an octave", "The Leslie speeds up", "Nothing"], 0, "Out = louder."),
       ("Which preset key cancels the manual?", ["C", "B", "A♯", "F"], 0, "C is the cancel key (Wikipedia)."),
       ("Percussion works…", ["On the upper manual with preset B", "On the pedals", "On every preset", "Only with the Leslie fast"], 0, "XK-5 manual, as on the B-3."),
       ("Leslie 'tremolo' is…", ["The fast speed", "The slow speed", "Stopped", "A reverb"], 0, "Chorale slow, tremolo fast.")],
 cites=["wiki/Hammond_organ", "XK-5"])
P["vox-continental"] = dict(kind="organ", wid="vox", name="Vox Continental", short="Continental", compare_q="organ=vox",
 desc="A first look at the Vox Continental combo organ: six drawbars, a transistor tone, one vibrato, a guided tour, famous records and a short quiz.",
 what=["The **Vox Continental** is a transistor *combo organ*, first made in **1962** at the Jennings factory in Dartford, Kent (Wikipedia, \"Vox Continental\").",
       "It has twelve oscillators, one for each note of the top octave; frequency dividers halve them for every octave below (Wikipedia).",
       "Its keys are reverse-coloured: black naturals, white sharps, \"as on a harpsichord\" (Wikipedia)."],
 sound=["**Six drawbars**: four for the footages 16′, 8′, 4′ and **IV** (a mixture of higher pitches), two for the voices, flute and reed (Wikipedia).",
        "The voice drawbars colour **every** footage at once.",
        "One **vibrato**, \"single-speed, single-intensity\" (Wikipedia).",
        "No percussion, no Leslie of its own, no second manual."],
 tour_intro="Each step loads a registration and plays the same short phrase.",
 steps=[dict(ex="vox-bright", set={"d4": 0, "dIV": 0, "reed": 0, "flute": 8}, t="**8′, flute only.** Listen: a soft, plain tone."),
        dict(ex="vox-bright", set={"d4": 0, "dIV": 0, "flute": 0}, t="**8′, reed only.** Listen: buzzier, more nasal."),
        dict(ex="vox-bright", set={"dIV": 0}, t="**Add the 4′.** Listen: brighter, an octave up added."),
        dict(ex="vox-bright", t="**Add IV.** The mixture adds high pitches. Listen: thin and cutting."),
        dict(ex="vox-lmf", t="**Vibrato on.** A blend of flute and reed with the vibrato: a starting point for \"Light My Fire\".")],
 extra=[TRACKS("vox")],
 records=["The Animals, \"The House of the Rising Sun\" (Alan Price)", "The Doors, \"Light My Fire\" (Ray Manzarek)", "? and the Mysterians, \"96 Tears\"", "The Beatles, \"I'm Down\" (live) and \"Think for Yourself\""],
 rec_src="Wikipedia, \"Vox Continental\"",
 quiz=[("How does the Continental make its notes?", ["Top-octave oscillators divided down", "Tonewheels", "Pipes", "Samples"], 0, "Twelve oscillators and frequency dividers."),
       ("What do the two right-hand drawbars do?", ["Set the voice: flute and reed", "Change the key", "Speed up a Leslie", "Add reverb"], 0, "Wikipedia."),
       ("What is odd about its keys?", ["Black naturals, white sharps", "They are round", "There are only 12", "They are touch-sensitive"], 0, "Reverse-coloured."),
       ("How many vibrato speeds does it have?", ["One", "Three", "Six", "None"], 0, "Single speed, single intensity.")],
 cites=["wiki/Vox_Continental"])
P["farfisa"] = dict(kind="organ", wid="farfisa", name="Farfisa Combo Compact", short="Farfisa", compare_q="organ=farfisa",
 desc="A first look at the Farfisa Combo Compact organ: on/off voice tabs, vibrato and reverb, a guided tour, famous records and a short quiz.",
 what=["The **Farfisa Combo Compact** came out in **1964**; the Compact series was made until 1969 (Wikipedia, \"Farfisa\").",
       "Like the Vox it is a divide-down organ: twelve tone-generator boards and frequency dividers, with germanium transistors (Wikipedia).",
       "Its reverb tank is valve-driven, so it is not fully transistorised (Wikipedia)."],
 sound=["**Voice tabs**, each on or off: 16′ bass and strings; 8′ flute, oboe, trumpet and strings; 4′ flute, piccolo and strings (Wikipedia).",
        "No drawbars: a tab is either in or out, so levels come from which tabs you mix.",
        "**Four vibrato settings** (Wikipedia; here light / heavy and slow / fast, an UNVERIFIED reading).",
        "A **reverb** tab."],
 tour_intro="Each step loads a set of tabs and plays the same short phrase.",
 steps=[dict(ex="far-flutes", set={"fl4": False, "vib": "off"}, t="**Flute 8′ only.** Listen: a hollow, plain tone."),
        dict(ex="far-flutes", set={"vib": "off"}, t="**Add Flute 4′.** Listen: brighter, an octave added."),
        dict(ex="far-flutes", t="**Light fast vibrato.** Listen: the classic wobbly combo-organ sound."),
        dict(ex="far-lobster", t="**Oboe and trumpet.** Reed tabs instead of flutes. Listen: buzzy and nasal."),
        dict(ex="far-domine", t="**Heavy slow vibrato and reverb.** Listen: a wide, spacey sound.")],
 extra=[TRACKS("farfisa")],
 records=["Sam the Sham and the Pharaohs, \"Wooly Bully\" (1965)", "Strawberry Alarm Clock, \"Incense and Peppermints\" (1967)", "Pink Floyd (Richard Wright started on a Combo Compact)", "Philip Glass, *Einstein on the Beach* (a Mini-Compact)"],
 rec_src="Wikipedia, \"Farfisa\"",
 quiz=[("How do you set a voice on the Combo Compact?", ["Press its tab in or out", "Pull a drawbar", "Turn a knob", "Patch a cable"], 0, "Tabs are on or off."),
       ("Which part of it is NOT transistor?", ["The reverb (valve-driven)", "The tabs", "The keys", "The dividers"], 0, "Wikipedia."),
       ("Which footages are on its tabs?", ["16′, 8′ and 4′", "Only 8′", "32′ and 1′", "2⅔′ and 1⅗′"], 0, "Wikipedia's tab list."),
       ("Which record is named for its Farfisa?", ["\"Wooly Bully\"", "\"Green Onions\"", "\"Light My Fire\"", "\"Toccata and Fugue\""], 0, "Sam the Sham on the Combo Compact.")],
 cites=["wiki/Farfisa"])
P["pipe-organ"] = dict(kind="organ", wid="pipe", name="pipe organ", art="the ", short="pipe organ", compare_q="organ=pipe",
 desc="A first look at the pipe organ through a small, made-up two-manual instrument: stops, footages, principals, flutes, reeds and mixtures, couplers, a guided tour, famous recordings and a short quiz.",
 what=["A **pipe organ** sounds by blowing wind through pipes; a **stop** turns on one **rank** of pipes, one pipe a key (Wikipedia, \"Organ stop\").",
       "**This page's pipe organ is not a real instrument.** It is a small made-up stop list: a Great (lower manual), a Swell (upper manual, in a box with shutters) and a Pedal.",
       "Combining stops is called **registration** (Wikipedia, \"Organ stop\")."],
 sound=["**Families**: principals (the organ's own sound), flutes, strings and reeds (Wikipedia).",
        "**Footage**: 8′ is the pitch of the key, 16′ an octave lower, 4′ an octave higher; 2⅔′ and 1⅗′ are *mutations*, sounding a twelfth and a seventeenth above (Wikipedia).",
        "A **mixture** sounds several high ranks at once, its number of ranks in Roman numerals (Wikipedia).",
        "**Couplers** let one keyboard play another's stops; the **Swell box** is a pedal that opens its shutters (couplers and box: general knowledge, UNVERIFIED)."],
 tour_intro="Each step loads a registration and plays chords on the Great, a tune on the Swell and a bass on the Pedal.",
 steps=[dict(ex="pipe-flutes", t="**Quiet flutes.** Gedackt 8′ and Spitzflöte 4′ on the Swell, Subbass 16′ in the pedal. Listen: soft, with a little breath (chiff) as notes start."),
        dict(ex="pipe-cornet", t="**A cornet.** Flutes at 8′, 4′, 2⅔′, 2′ and 1⅗′ together on the Swell: the mutations make one reedy solo sound from flutes."),
        dict(ex="pipe-plenum", t="**Principal chorus.** Principal 8′, Octave 4′, Fifteenth 2′ and Mixture IV on the Great, coupled to the pedal. Listen: bright and grand."),
        dict(ex="pipe-widor", set={"g_trp8": False, "s_ob8": False, "p_trb16": False}, t="**Full organ without reeds.** Everything coupled, but no reed stops."),
        dict(ex="pipe-widor", t="**Add the reeds.** Trumpet, Oboe and Trombone. Listen: the sound gets a brassy edge.")],
 extra=[TRACKS("pipe")],
 records=[], rec_src="Wikipedia, \"Organ stop\"",
 quiz=[("A stop marked 4′ sounds…", ["An octave above the key", "An octave below", "At the key's pitch", "Two octaves below"], 0, "Wikipedia, \"Organ stop\"."),
       ("Which family imitates brass and reed instruments?", ["Reeds", "Principals", "Flutes", "Mixtures"], 0, "Reed stops."),
       ("Mixture IV means…", ["Four ranks sound for each key", "The fourth stop", "Four keyboards", "Four pedals"], 0, "Roman numeral = number of ranks."),
       ("Is this page's pipe organ a real instrument?", ["No: a made-up stop list", "Yes: Saint-Sulpice", "Yes: a Hammond", "Yes: a theatre organ"], 0, "Said at the top of the page.")],
 cites=["wiki/Organ_stop"])

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        txt = B.page(slug, P[slug]); m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(txt + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
