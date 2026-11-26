#!/usr/bin/env python3
"""Writes the "Meet the Pedals" lessons: lessons/intro-{fuzz-face,big-muff,tube-screamer,cry-baby,phase-90,ce-2,dm-2,echoplex}.qmd
(a sibling of guitars.py, for the pedals of lessons/pedal-compare.qmd). Each page: What you'll do, what it is and when, how its
circuit makes its sound, the pedal's face (apps/shared/lessons/pedals.js: a FaithfulPanel drawing bound to the model), a guided tour
(▶ steps), famous tracks (apps/shared/data/pedals/tracks.json, oEmbed-checked), a quiz, Next. Facts: scripts/sources/pedals.py.
    python3 scripts/intro-instruments/pedals.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json, sys, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return re.sub(r"\[(.+?)\]\((.+?)\)", lambda m: f'<a href="{m.group(2).replace(".qmd", ".html")}">{m.group(1)}</a>', s)

P = {}
P["fuzz-face"] = dict(pid="fuzzface", name="Fuzz Face", other="bigmuff",
 desc="A first look at the Fuzz Face: two transistors, two knobs, and a fuzz that cleans up when you turn the guitar down. Guided tour, famous tracks, quiz.",
 what=["The **Fuzz Face** came out in **1966**, made by **Arbiter** in London (Wikipedia, \"Fuzz Face\").",
       "Two knobs: **Volume** and **Fuzz**. A round metal case with a footswitch.",
       "Early ones used **germanium** transistors; from the late 1960s **silicon**, which Wikipedia says sounded harsher."],
 sound=["Two transistors give a lot of gain. The signal hits the top and bottom of what they can put out: the wave is squared off (**clipped**), which adds many new harmonics.",
        "The clipping is not the same on top and bottom (*asymmetric*): that adds even harmonics too. In this page's model a bias does that (the site's reading of germanium fuzz).",
        "Its input takes a lot of current from the guitar: a **low input impedance**, about 5-8 kΩ (ElectroSmash, from a search summary). So the guitar's own volume knob changes the sound: at 10, the pickup loses treble into that load; turned down, the knob's resistance isolates the pickup, less signal reaches the transistors and the fuzz **cleans up** (Wikipedia).",
        "Put it first in the chain: after another pedal, that pedal drives it and the clean-up trick is gone (this page models that)."],
 steps=[dict(set={"fuzz": 9, "vol": 7, "gvol": 10}, play="riff", t="**Fuzz 9, guitar volume 10.** Thick, squared-off fuzz."),
        dict(set={"fuzz": 9, "vol": 7, "gvol": 6}, play="riff", t="**Same pedal, guitar volume 6.** Listen: much cleaner, brighter. Nothing on the pedal changed."),
        dict(set={"fuzz": 9, "vol": 7, "gvol": 4}, play="chord", t="**Guitar volume 4.** Nearly clean chords."),
        dict(set={"fuzz": 3, "vol": 8, "gvol": 10}, play="riff", t="**Fuzz 3.** Less gain: a gritty crunch."),
        dict(set={"fuzz": 10, "vol": 6, "gvol": 10}, play="lead", t="**Fuzz 10.** Long sustain on a lead line.")],
 quiz=[("What happens when you turn the guitar's volume down into a Fuzz Face?", ["It gets louder", "The fuzz cleans up", "Nothing", "It turns off"], 1, "The low input impedance: the guitar's pot isolates the pickup and less signal drives the transistors."),
       ("Which knobs does it have?", ["Drive, Tone, Level", "Volume and Fuzz", "Rate and Depth", "Sustain, Tone, Volume"], 1, "Wikipedia."),
       ("What did the first ones use?", ["Valves", "Germanium transistors", "An op-amp", "A tape loop"], 1, "NKT275 or AC128 (Wikipedia).")])
P["big-muff"] = dict(pid="bigmuff", name="Big Muff Pi", other="fuzzface",
 desc="A first look at the Big Muff Pi: two clipping stages in a row and a tone control that scoops the mids. Guided tour, famous tracks, quiz.",
 what=["The **Big Muff Pi** came out in **1969**, made by **Electro-Harmonix** of New York (Wikipedia, \"Big Muff\").",
       "Three knobs: **Volume**, **Tone** and **Sustain** (the gain). The first version put them in a triangle.",
       "Four transistor stages: an input booster, two clipping stages, a tone stack, an output booster (Wikipedia)."],
 sound=["Each clipping stage has two diodes in its feedback: they stop the wave growing past about 0.6 V, a *soft* clip. Two in a row: the second clips what the first already clipped, so the sound is very compressed and sustains for a long time.",
        "The **tone stack** mixes a low-pass and a high-pass. At noon both are partly down around **1 kHz**: a **mid scoop** (Wikipedia: less midrange; ~1 kHz from a student report found by search). Turn Tone left for the low-pass (dark), right for the high-pass (thin).",
        "The output booster makes up the level the tone stack loses."],
 steps=[dict(set={"sustain": 7, "tone": 5}, play="chord", t="**Sustain 7, Tone noon.** The classic: thick, scooped."),
        dict(set={"sustain": 7, "tone": 0}, play="riff", t="**Tone fully left.** The low-pass alone: dark and woolly."),
        dict(set={"sustain": 7, "tone": 10}, play="riff", t="**Tone fully right.** The high-pass alone: thin and fizzy."),
        dict(set={"sustain": 10, "tone": 6}, play="lead", t="**Sustain 10.** A lead note that lasts and lasts."),
        dict(set={"sustain": 2, "tone": 5}, play="riff", t="**Sustain 2.** Still fuzzy: the two clipping stages have their own gain.")],
 quiz=[("What does the Big Muff's tone stack do at noon?", ["Boosts the mids", "Scoops the mids", "Removes the bass only", "Nothing"], 1, "Low-pass + high-pass blended: a dip around 1 kHz."),
       ("Which knob sets the gain?", ["Volume", "Tone", "Sustain"], 2, "Wikipedia."),
       ("How many clipping stages?", ["One", "Two", "Four"], 1, "Two, each with a diode pair in its feedback.")])
P["tube-screamer"] = dict(pid="ts808", name="Tube Screamer TS808", other="fuzzface",
 desc="A first look at the Ibanez Tube Screamer TS808: soft clipping in an op-amp's feedback, the mid hump, and why the bass stays clean. Guided tour, famous tracks, quiz.",
 what=["The **TS808** came out in **1979**, designed by **Susumu Tamura** at Nisshin for Ibanez, with a **JRC4558** op-amp (Wikipedia, \"Ibanez Tube Screamer\").",
       "Three knobs: **Drive** (gain), **Tone** and **Level** (Wikipedia).",
       "It \"boosts midrange frequencies and cuts bass\" so a guitar stays clear in a band (Wikipedia, in other words)."],
 sound=["The clipping stage is an op-amp with two diodes in its **feedback**. The diodes only let the extra (amplified) part grow to about 0.6 V; that is added to the clean signal. So it clips softly, and you still hear the note.",
        "In the feedback there is also a resistor and capacitor that only pass the **mids and highs** (a high-pass near 720 Hz in the schematic values this page uses, unverified). The low notes get almost no gain: the bass stays clean, the mids drive the diodes: the **mid hump**.",
        "Drive turns the gain from about 12 to about 118 times in this model. A small capacitor across the feedback cuts the highest treble more as Drive goes up.",
        "Players often put it in front of an already crunchy amp: it pushes the amp with the mids."],
 steps=[dict(set={"drive": 2, "tone": 5, "level": 8}, play="riff", t="**Drive 2.** A light edge. Listen how the low notes stay clean."),
        dict(set={"drive": 8, "tone": 5, "level": 6}, play="riff", t="**Drive 8.** More clipping, still a clear note."),
        dict(set={"drive": 8, "tone": 1, "level": 6}, play="lead", t="**Tone 1.** Darker: the tone stage's low-pass alone."),
        dict(set={"drive": 8, "tone": 9, "level": 6}, play="lead", t="**Tone 9.** Brighter."),
        dict(set={"drive": 5, "tone": 5, "level": 7}, play="chord", t="**A chord.** Compare with the Fuzz Face on the compare page: there the low strings fuzz too.")],
 quiz=[("Why does the bass stay clean in a Tube Screamer?", ["There is no bass", "The gain is only above about 720 Hz", "The battery is low", "The Tone knob"], 1, "The high-pass in the feedback leg."),
       ("Where are the clipping diodes?", ["After the pedal", "In the op-amp's feedback", "In the guitar"], 1, "So the clipped part adds to the clean signal: soft clipping."),
       ("Which op-amp chip is in the TS808?", ["JRC4558", "555", "LM386"], 0, "Wikipedia.")])
P["cry-baby"] = dict(pid="crybaby", name="Cry Baby wah", other="phase90",
 desc="A first look at the Cry Baby wah: a resonant band-pass filter swept by your foot. Guided tour, famous tracks, quiz.",
 what=["The wah pedal was made by **Brad Plunkett** at Warwick Electronics / Thomas Organ in **1966** and sold from February 1967; **Cry Baby** was the name for America (Wikipedia, \"Wah-wah pedal\").",
       "One control: the **treadle**. Rock it with your foot. Press the toe down hard to switch it on or off."],
 sound=["Inside, an inductor and a capacitor make a **resonance**: a narrow peak of frequencies made louder (a *band-pass*). The treadle turns a pot that moves the peak (Wikipedia; ElectroSmash, from a search summary).",
        "Heel down: the peak is low (about 400 Hz in this model), a dark \"oo\". Toe down: high (about 2.2 kHz), a bright \"ee\". Rocking between them says \"wah\".",
        "Parked half way, it is a fixed filter: a nasal sound some players use on purpose.",
        "This page cannot feel your foot, so it can rock the treadle for you, or move it with how loud you play."],
 steps=[dict(set={"mode": "rock", "rate": 3}, play="riff", t="**Rocking slowly.** The classic \"wah\"."),
        dict(set={"mode": "rock", "rate": 8}, play="chord", t="**Rocking fast on chords.** The funk \"wacka\"."),
        dict(set={"mode": "foot", "pos": 0}, play="lead", t="**Heel down.** Dark."),
        dict(set={"mode": "foot", "pos": 10}, play="lead", t="**Toe down.** Bright and piercing."),
        dict(set={"mode": "env"}, play="riff", t="**Moved by your playing.** Loud notes push the peak up (an auto-wah: the page's, not the pedal's).")],
 quiz=[("What does the treadle move?", ["The volume", "The peak of a band-pass filter", "The delay time"], 1, "Wikipedia."),
       ("Who made the first wah?", ["Brad Plunkett", "Leo Fender", "Mike Battle"], 0, "Wikipedia."),
       ("Heel down sounds…", ["bright", "dark"], 1, "The peak is low.")])
P["phase-90"] = dict(pid="phase90", name="Phase 90", other="ce2",
 desc="A first look at the MXR Phase 90: four all-pass stages, two moving notches, one Speed knob. Guided tour, famous tracks, quiz.",
 what=["The **Phase 90** (1974) was **MXR**'s first pedal (Wikipedia, \"MXR\").",
       "One knob: **Speed**. Pedals before 1981 had no LED (Wikipedia).",
       "It \"was used on the first two Van Halen albums\" (Wikipedia)."],
 sound=["An **all-pass** stage keeps every frequency's level but delays its phase: low frequencies a little, high ones more. Four in a row (ElectroSmash's outline, from a search summary).",
        "Mix that with the dry signal: where the shifted copy is exactly opposite, the two cancel: a **notch**. Four stages give **two** notches.",
        "An LFO (a slow wave) moves the stages, so the notches sweep up and down: the whoosh. **Speed** sets how fast.",
        "Some versions feed part of the output back to the input, which sharpens the notches; which logo version had it is unverified here."],
 steps=[dict(set={"speed": 2}, play="chord", t="**Speed 2.** A slow sweep on chords."),
        dict(set={"speed": 6}, play="riff", t="**Speed 6.** Faster, more like a rotating speaker."),
        dict(set={"speed": 3, "fb": "off"}, play="chord", t="**Feedback left out.** Softer notches: compare with the step before last."),
        dict(set={"speed": 3}, play="lead", t="**On a lead line.**")],
 quiz=[("How many notches do four all-pass stages give, mixed with the dry signal?", ["One", "Two", "Four"], 1, "Two."),
       ("What does Speed set?", ["Delay time", "The LFO's rate", "Gain"], 1, "The sweep's speed."),
       ("When did the Phase 90 come out?", ["1966", "1974", "1981"], 1, "Wikipedia.")])
P["ce-2"] = dict(pid="ce2", name="Boss CE-2 Chorus", other="phase90",
 desc="A first look at the Boss CE-2: a short bucket-brigade delay that wobbles, mixed with the dry sound. Guided tour, famous tracks, quiz.",
 what=["The **CE-2** came out in **late 1979** (Guitar World).",
       "Two knobs: **Rate** and **Depth** (Guitar World calls it \"idiot proof\").",
       "Early ones used an **MN3007** bucket-brigade chip (Guitar World)."],
 sound=["A **bucket-brigade** chip passes the signal along a line of capacitors, one step per clock tick: a short delay of a few milliseconds.",
        "An LFO moves that delay a little: the copy goes slightly sharp and flat. Mixed with the dry sound it sounds like two players: **chorus**.",
        "Rate = how fast it wobbles, Depth = how far. In this model the delay moves between 1.5 and 7.5 ms (the site's values)."],
 steps=[dict(set={"rate": 3, "depth": 5}, play="chord", t="**Rate 3, Depth 5.** The classic shimmer on chords."),
        dict(set={"rate": 8, "depth": 3}, play="riff", t="**Rate 8.** A fast wobble, nearly vibrato."),
        dict(set={"rate": 1, "depth": 10}, play="chord", t="**Rate 1, Depth 10.** Slow and deep: seasick."),
        dict(set={"rate": 3, "depth": 5}, play="lead", t="**On a lead line.**")],
 quiz=[("What makes the chorus sound?", ["A tape loop", "A short delay that moves, mixed with the dry sound", "Clipping diodes"], 1, ""),
       ("Which knobs does a CE-2 have?", ["Rate and Depth", "Speed only", "Echo and Intensity"], 0, "Guitar World.")])
P["dm-2"] = dict(pid="dm2", name="Boss DM-2 Delay", other="echoplex",
 desc="A first look at the Boss DM-2: an analog bucket-brigade delay whose repeats get darker each time. Guided tour, famous tracks, quiz.",
 what=["The **DM-2** was made from **1981** to 1984 (Guitar World).",
       "Delay **20 to 300 ms** (Boss, on the DM-2W reissue's Standard mode).",
       "Three knobs: **Repeat Rate** (clockwise = shorter), **Echo** (how loud the repeats are), **Intensity** (how many; fully left = one repeat) (Boss)."],
 sound=["A bucket-brigade chip of many stages (4096 in the MN3005, from a seller's listing: unverified) delays the signal by stages ÷ (2 × clock rate). A long delay needs a slow clock, and a slow clock passes less treble: long delays are darker.",
        "Each repeat goes round the chip again: through the filter again, so every repeat is darker than the one before (Guitar World: \"darker and warmer\").",
        "Intensity near full: the repeats stop dying away and build into a howl (self-oscillation, Guitar World)."],
 steps=[dict(set={"rate": 7, "echo": 6, "intensity": 2}, play="pluck", t="**Short slapback.** One note, a quick repeat."),
        dict(set={"rate": 2, "echo": 6, "intensity": 5}, play="pluck", t="**Long delay, more repeats.** Listen: each repeat darker."),
        dict(set={"rate": 4, "echo": 5, "intensity": 0}, play="riff", t="**Intensity 0.** Just one repeat."),
        dict(set={"rate": 3, "echo": 8, "intensity": 10}, play="pluck", t="**Intensity 10.** It runs away (turn your speakers down)."),
        dict(set={"rate": 4, "echo": 5, "intensity": 3}, play="lead", t="**On a lead line.**")],
 quiz=[("Why are a DM-2's long delays darker?", ["A slower clock passes less treble", "The battery", "A tone knob"], 0, ""),
       ("What does Intensity set?", ["The delay time", "How many repeats", "The level of the dry sound"], 1, "Boss."),
       ("Longest delay of the original?", ["30 ms", "300 ms", "3 s"], 1, "Boss.")])
P["echoplex"] = dict(pid="echoplex", name="Echoplex EP-3", other="dm2",
 desc="A first look at the Echoplex: a tape loop and a sliding record head, with wow, flutter and tape saturation. Guided tour, famous tracks, quiz.",
 what=["Mike Battle's **Echoplex** reached the market in **1959**; the solid-state **EP-3** came in **1970** and was made until 1991 (Wikipedia, \"Echoplex\").",
       "Its idea: a loop of tape in a cartridge, with a **record head that slides**, so the delay changes without changing the tape speed (Wikipedia).",
       "Eddie Van Halen played \"Eruption\" with an MXR Phase 90 and an Echoplex (Wikipedia)."],
 sound=["The tape passes the record head, then the playback head: the gap between them is the delay. Slide the head away: a longer delay.",
        "Tape does not move perfectly evenly: slow **wow** and fast **flutter** make the repeats waver in pitch (this model: 0.5 Hz and 7 Hz, the site's values).",
        "Tape squashes loud signals (saturation) and loses the top and bottom on every pass: warm, worn repeats.",
        "Repeats feeds the playback back to the record head; near full, it builds up."],
 steps=[dict(set={"delay": 2, "repeats": 2, "echo": 6}, play="riff", t="**Short delay.** Rockabilly-style slap."),
        dict(set={"delay": 6, "repeats": 5, "echo": 6}, play="pluck", t="**Longer, more repeats.** Listen for the waver."),
        dict(set={"delay": 9, "repeats": 9, "echo": 8}, play="pluck", t="**Repeats 9.** Building up on the tape."),
        dict(set={"delay": 4, "repeats": 3, "echo": 5}, play="lead", t="**On a lead line.**")],
 quiz=[("How do you change an Echoplex's delay?", ["Change the tape speed", "Slide the record head", "Turn Rate"], 1, "Wikipedia."),
       ("What makes the repeats waver?", ["Wow and flutter", "The diodes", "The LFO's depth"], 0, ""),
       ("When did the EP-3 come out?", ["1959", "1970", "1991"], 1, "Wikipedia.")])

def page(slug, p):
    g = p["pid"]
    o = ["---", f'title: "Meet the {p["name"]}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"]}"', "instruments: [guitar]", "topics: [sound]", "has: [interactive, svg]", "---", "",
         "A first stop before [Guitar Pedals Compared](pedal-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what the {p['name']} is.", "2. Learn how its circuit makes its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Listen to famous tracks.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## How it makes its sound", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The pedal", "",
          f"The {p['name']}'s face, drawn after photos (positions approximate, no logos). Drag a knob (or use the arrow keys), click the footswitch to bypass, then press a ▶ button. "
          "The guitar is this site's pickup model (pick one, and its volume, below the buttons); the sound goes through the pedal model, then a clean amp. Nobody has compared it with a real pedal. "
          "The picture shows the waveform going in and coming out.", "",
          "```{=html}", f'<div class="pdp" data-pedal="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="pd-step" data-pedal="{g}" data-set="{J(s["set"])}" data-play="{s["play"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous tracks", "",
          "Videos checked on YouTube. Where a source ties the pedal to the record, it is given; otherwise it is marked unverified. **No source gives any setting**: **Try a guess** plays this site's guess.", "",
          "```{=html}", f'<div class="pd-tracks" data-pedal="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="pd-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="pd-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [Guitar Pedals Compared](pedal-compare.html?a={g}&b={p['other']}): this pedal beside a similar one, settings translated, and a pedalboard to chain them.",
          "- [Electric Guitars Compared](guitar-compare.qmd): the guitars that feed these pedals.", "",
          "```{=html}", "<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/pedals.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/synth-kit.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>',
          '<script src="/apps/shared/lessons/guitar-pickups.js"></script>', '<script src="/apps/shared/lessons/pedals.js"></script>', "```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
