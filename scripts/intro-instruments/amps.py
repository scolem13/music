#!/usr/bin/env python3
"""Writes the "Meet the Amp" lessons: lessons/intro-{twin-reverb,ac30,plexi,bassman,dual-rectifier,svt}.qmd (a sibling of pedals.py,
for the amps of lessons/amp-compare.qmd). Each page: What you'll do, what it is and when, how its circuit makes its sound, the amp's
panel (apps/shared/lessons/amps.js: a FaithfulPanel drawing bound to the model), a guided tour (▶ steps), famous tracks
(apps/shared/data/amps/tracks.json, oEmbed-checked), a quiz, Next. Facts: scripts/sources/amps.py.
    python3 scripts/intro-instruments/amps.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json, sys, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return re.sub(r"\[(.+?)\]\((.+?)\)", lambda m: f'<a href="{m.group(2).replace(".qmd", ".html")}">{m.group(1)}</a>', s)

STACK = ("The **tone stack** (Treble, Middle, Bass) is a passive network of three capacitors and resistors: it can only cut. This page computes its curve "
         "exactly from the component values, with the formula Yeh and Smith published in 2006 (checked there against a circuit simulator); the graph under the panel shows it.")
P = {}
P["twin-reverb"] = dict(aid="twin", name="Fender Twin Reverb", other="ac30", inst="guitar",
 desc="A first look at the blackface Fender Twin Reverb: 85 clean watts, the Fender tone stack, spring reverb and tremolo. Guided tour, famous tracks, quiz.",
 what=["The **Twin Reverb** got its built-in spring reverb in **1963**, in the black-panel (\"blackface\") look Fender used until 1967; the circuit is called **AB763** (Wikipedia, \"Fender Twin Reverb\").",
       "**85 watts** into 4 Ω from four **6L6GC** valves, a solid-state rectifier, two 12\" speakers (Wikipedia).",
       "Two channels, **Normal** and **Vibrato**, each with Volume, Treble, Middle, Bass and a **Bright** switch; the Vibrato channel adds Reverb, Speed and Intensity (Wikipedia). This page models the Vibrato channel.",
       "It is known above all for its **clean** sound and its reverb (Wikipedia)."],
 sound=["On a Fender the tone stack comes **straight after the first valve**, before the Volume knob. " + STACK,
        "The **Bright** switch is a small capacitor across the Volume knob: treble skips past it. It matters most with the volume low (Wikipedia: below about 6).",
        "Big power, a solid-state rectifier and negative feedback give **headroom**: the Twin stays clean very loud. In this model the supply barely sags.",
        "**Reverb**: the signal shakes a metal spring in a tank (made by Hammond / Accutronics); a pickup at the other end hears the delayed, chirpy echoes.",
        "Fender called it **vibrato**, but it is **tremolo** (volume going up and down): a neon bulb flashing on a light-dependent resistor (Wikipedia)."],
 steps=[dict(set={"volume": 3, "treble": 6, "middle": 5, "bass": 4}, play="chord", t="**Volume 3.** Clean chords, lots of headroom."),
        dict(set={"volume": 3, "bright": True}, play="chord", t="**Bright on.** More sparkle at low volume."),
        dict(set={"volume": 3, "treble": 7, "middle": 2, "bass": 5}, play="riff", t="**Middle down to 2.** The scooped Fender clean."),
        dict(set={"volume": 4, "reverb": 7}, play="pluck", t="**Reverb 7.** Listen to the tail after the note."),
        dict(set={"volume": 4, "intensity": 7, "speed": 6}, play="chord", t="**Intensity 7.** Tremolo: the level pulses."),
        dict(set={"volume": 10}, play="riff", t="**Volume 10.** Even now it only starts to break up.")],
 quiz=[("What is the Twin's \"vibrato\" really?", ["Pitch vibrato", "Tremolo (volume)", "A chorus"], 1, "Wikipedia: a neon + light-dependent resistor bug pulses the volume."),
       ("Why does it stay clean so loud?", ["85 W, solid-state rectifier, headroom", "It has no tone stack", "It uses EL84s"], 0, ""),
       ("When does the Bright switch matter most?", ["Volume low", "Volume at 10", "Never"], 0, "Wikipedia: below about 6.")])
P["ac30"] = dict(aid="ac30", name="Vox AC30 Top Boost", other="twin", inst="guitar",
 desc="A first look at the Vox AC30 Top Boost: four EL84s with no negative feedback, the Top Boost tone circuit, the Cut knob and the chime. Guided tour, famous tracks, quiz.",
 what=["The **AC30** came out in **1959** from JMI (Vox), designed by Dick Denney; the **Top Boost** circuit became standard in **1963** (Wikipedia, \"Vox AC30\").",
       "Four **EL84** valves, **cathode biased**, about 30 W, a GZ34 valve rectifier, two 12\" Celestion speakers (\"Blue\") (Wikipedia).",
       "Often called class A, it is in fact **class AB**, run hot, with **no negative feedback** (Wikipedia).",
       "Used by the Shadows, the Beatles, Brian May and the Edge (Wikipedia)."],
 sound=["The **Top Boost** is the Fender Bassman tone stack **with the middle control removed** (Wikipedia). " + STACK + " Here the middle leg is a fixed 10 kΩ resistor (unverified value).",
        "With no negative feedback the power valves are not held in check: they break up early and smoothly, the \"chime\" turning into crunch (Brian May's \"smooth transition into compression\", Wikipedia).",
        "**Cut** sits in the power amp and only takes treble away: turn it up to tame the top (here a low-pass from 18 kHz down to 1.6 kHz, the site's values).",
        "The **Vib-Trem** channel: vibrato wobbles the pitch, tremolo the volume. (On the real amp it is another channel; here it is applied to the Top Boost sound.)"],
 steps=[dict(set={"volume": 4, "treble": 7, "bass": 4, "cut": 2}, play="chord", t="**Volume 4.** Chiming clean."),
        dict(set={"volume": 8, "treble": 7, "bass": 4, "cut": 2}, play="riff", t="**Volume 8.** The valves start to compress and crunch."),
        dict(set={"volume": 8, "treble": 7, "bass": 4, "cut": 8}, play="riff", t="**Cut 8.** The same, darker."),
        dict(set={"volume": 5, "vt": "vibrato", "speed": 5}, play="chord", t="**Vibrato.** The pitch wavers."),
        dict(set={"volume": 5, "vt": "tremolo", "speed": 6}, play="chord", t="**Tremolo.** The volume pulses.")],
 quiz=[("What does the Cut knob do?", ["Adds bass", "Takes treble away", "Adds gain"], 1, ""),
       ("Class A or AB?", ["Class A", "Class AB (cathode biased)", "Class D"], 1, "Wikipedia."),
       ("Which knob is missing from the Top Boost?", ["Treble", "Bass", "Middle"], 2, "Wikipedia: the Bassman stack with the middle control removed.")])
P["plexi"] = dict(aid="plexi", name="Marshall 1959 Super Lead \"Plexi\"", other="bassman", inst="guitar",
 desc="A first look at the Marshall 1959 Super Lead (\"Plexi\"), jumpered: 100 watts of EL34s, a Bassman-derived preamp made hotter, into 4x12s. Guided tour, famous tracks, quiz.",
 what=["The **1959 Super Lead** came out in **1965**, built for Pete Townshend's search for volume; its Plexiglas front panel (to 1969) gave it the nickname **Plexi** (Wikipedia, \"Marshall Amplification\").",
       "**100 watts**, from KT66 and then **EL34** valves, into closed **4x12** cabinets: the Marshall stack (Wikipedia).",
       "Its ancestor, the JTM45 (1963), was almost a copy of the Fender Bassman, with higher-gain ECC83 valves and a filter after the volume that brightened it (Wikipedia).",
       "Players: Townshend, Hendrix, Clapton, Page (Wikipedia)."],
 sound=["Two channels, **High Treble** (Volume I) and **Normal** (Volume II), each with two inputs. Players link them with a short cable, **jumpering**, so both volumes mix: Volume I for bite, Volume II for body (Wikipedia mentions linking inputs).",
        "The tone stack is the same circuit as the Bassman's, with other values, **after** the second valve and a cathode follower that clips softly on the way up. " + STACK,
        "No master volume: to get it to distort, the whole amp is turned up, and the **power valves** clip too. **Presence** brings back treble the negative feedback removes."],
 steps=[dict(set={"vol1": 3, "vol2": 2}, play="chord", t="**Both volumes low.** Loud and fairly clean."),
        dict(set={"vol1": 7, "vol2": 4}, play="riff", t="**Volume I 7, II 4.** Classic crunch."),
        dict(set={"vol1": 10, "vol2": 10}, play="riff", t="**Everything up.** Full Plexi roar."),
        dict(set={"vol1": 3, "vol2": 9}, play="riff", t="**Volume II up, I down.** Darker, thicker."),
        dict(set={"vol1": 8, "vol2": 5, "presence": 9}, play="lead", t="**Presence 9.** More bite on a lead line.")],
 quiz=[("What does \"jumpered\" mean?", ["Both channels linked by a cable", "A modified bias", "A footswitch"], 0, ""),
       ("Which amp did Marshall's first amp copy?", ["Vox AC30", "Fender Bassman", "Fender Twin"], 1, "Wikipedia."),
       ("Why the name Plexi?", ["The valves", "The Plexiglas front panel", "The speakers"], 1, "Wikipedia.")])
P["bassman"] = dict(aid="bassman", name="Fender Bassman 5F6-A", other="plexi", inst="guitar",
 desc="A first look at the tweed Fender Bassman 5F6-A: the first three-knob tone stack, a valve rectifier that sags, four 10-inch speakers. Guided tour, famous tracks, quiz.",
 what=["The **5F6-A** came in **1958**, the last of the tweed Bassmans; the 5F6 (1957) introduced the three-knob tone stack (Wikipedia, \"Fender Bassman\").",
       "Two 6L6 valves, a **GZ34 valve rectifier**, four 10\" Jensen speakers in an open-back combo (Wikipedia).",
       "Made for bass, it became a rock and roll guitar amp (Buddy Holly), and Marshall copied it for the JTM45 (Wikipedia)."],
 sound=["Its tone stack is the one Yeh and Smith worked out exactly: 250 pF, 20 nF, 20 nF, a 56 kΩ resistor and the three pots. " + STACK,
        "A **valve rectifier** cannot deliver current fast: when you hit a loud chord the supply droops (**sag**) and the amp compresses, then recovers.",
        "Two channels (Bright and Normal), jumpered here like the Marshall; Presence after the power amp."],
 steps=[dict(set={"vol1": 3, "vol2": 2}, play="chord", t="**Low volumes.** Warm clean."),
        dict(set={"vol1": 6, "vol2": 4}, play="riff", t="**Volumes 6 / 4.** Edge of break-up."),
        dict(set={"vol1": 9, "vol2": 7}, play="chord", t="**Up high.** Listen for the sag on the chord's attack."),
        dict(set={"vol1": 5, "vol2": 3, "middle": 0}, play="riff", t="**Middle 0.** The deepest scoop of the stack."),
        dict(set={"vol1": 5, "vol2": 3, "middle": 10, "treble": 3}, play="riff", t="**Middle 10, Treble 3.** Fat and dark.")],
 quiz=[("What makes the Bassman sag?", ["The GZ34 valve rectifier", "The speakers", "The reverb"], 0, ""),
       ("How many speakers?", ["One 15\"", "Four 10\"", "Two 12\""], 1, "Wikipedia."),
       ("Can a passive tone stack boost a band?", ["Yes", "No, it can only cut"], 1, "Wikipedia, \"Tone stack\".")])
P["dual-rectifier"] = dict(aid="rect", name="Mesa/Boogie Dual Rectifier", other="plexi", inst="guitar",
 desc="A first look at the Mesa/Boogie Dual Rectifier: cascaded gain stages, a master volume, and a choice of rectifiers. Guided tour, famous tracks, quiz.",
 what=["Mesa/Boogie began with Randall Smith modifying Fender amps; in the 1970s he **cascaded** gain stages for far more distortion (Wikipedia, \"Mesa Boogie\").",
       "The **Dual Rectifier** came in **1991**, inspired by the Soldano SLO-100, with a \"raw, aggressive bass-heavy sound\" and a diamond-plate face (Wikipedia).",
       "Users named by Wikipedia: Korn, Tool, Soundgarden, Foo Fighters, Blink-182."],
 sound=["**Cascaded gain stages**: valve after valve, each clipping what the last one clipped. That is where the high gain comes from (the number of stages here is the site's choice).",
        "A **Master** volume after the tone stack sets how loud, and how hard the power valves work, separately from the preamp's Gain.",
        "The name is the rectifier: a switch picks **silicon diodes** (tight) or a **valve** rectifier (more sag, \"spongy\"). The switch and the Mode names (Raw / Vintage / Modern) are from general knowledge here: unverified.",
        STACK + " The values used here are the site's guess."],
 steps=[dict(set={"gain": 2, "master": 5, "mode": "raw"}, play="chord", t="**Gain 2, Raw.** Crunch."),
        dict(set={"gain": 6, "master": 5, "mode": "modern"}, play="riff", t="**Gain 6, Modern.** Full high gain."),
        dict(set={"gain": 6, "master": 5, "mode": "modern", "middle": 1, "bass": 8}, play="riff", t="**Mid 1, Bass 8.** The scooped metal sound."),
        dict(set={"gain": 4, "master": 8, "mode": "vintage", "rect": "tube"}, play="chord", t="**Tube rectifier, Master 8.** Looser, more sag."),
        dict(set={"gain": 7, "master": 4, "mode": "modern"}, play="lead", t="**A lead line.** Long sustain.")],
 quiz=[("Where does its high gain come from?", ["Cascaded preamp stages", "The speakers", "A fuzz pedal inside"], 0, "Wikipedia."),
       ("What does the rectifier switch change?", ["The supply's sag", "The reverb", "The speaker"], 0, ""),
       ("When did the Dual Rectifier come out?", ["1972", "1991", "2004"], 1, "Wikipedia.")])
P["svt"] = dict(aid="svt", name="Ampeg SVT", other="twin", inst="bass",
 desc="A first look at the Ampeg SVT: 300 valve watts for bass, two 8x10 cabinets, and its tone controls. Guided tour, famous tracks, quiz.",
 what=["The **SVT** (\"Super Vacuum Tube\") was designed by **Bill Hughes and Roger Cox** and shown in **1969**: **300 watts** from a 14-valve design, when most valve amps gave under 100 (Wikipedia, \"Ampeg SVT\").",
       "Prototypes carried the **Rolling Stones' 1969 US tour**, for every guitar and bass (Wikipedia).",
       "Ampeg recommended **two 8x10 cabinets**; output valves 6146B at first, then 6550 from mid-1970 (Wikipedia)."],
 sound=["Big power means headroom: the SVT stays clean on bass until pushed, then growls.",
        "Its tone section is not the Fender stack: here Bass and Treble are shelves, **Midrange** a peak or dip at one of five frequencies, and **Ultra Lo** / **Ultra Hi** switches add deep lows or top. These controls and values are from general knowledge: unverified.",
        "The **8x10** cabinet: eight small speakers, a sealed box, little top."],
 steps=[dict(set={"volume": 4}, play="riff", t="**Volume 4.** Clean, round bass."),
        dict(set={"volume": 4, "ultralo": True}, play="riff", t="**Ultra Lo on.** Deeper lows, scooped mids."),
        dict(set={"volume": 4, "middle": 9, "midf": "800"}, play="riff", t="**Midrange up at 800 Hz.** Punch that cuts through a band."),
        dict(set={"volume": 4, "ultrahi": True, "treble": 7}, play="pluck", t="**Ultra Hi.** Fingers and string click."),
        dict(set={"volume": 9}, play="riff", t="**Volume 9.** The famous growl.")],
 quiz=[("How much power?", ["50 W", "100 W", "300 W"], 2, "Wikipedia."),
       ("Which cabinets did Ampeg recommend?", ["One 4x12", "Two 8x10", "A 1x15"], 1, "Wikipedia."),
       ("Who first used the prototypes?", ["The Beatles", "The Rolling Stones", "The Who"], 1, "Wikipedia: the 1969 US tour.")])

def page(slug, p):
    g = p["aid"]
    o = ["---", f'title: "Meet the {p["name"].replace(chr(34), chr(39))}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"].replace(chr(34), chr(39))}"', f"instruments: [{p['inst']}]", "topics: [sound]", "has: [interactive, svg]", "---", "",
         "A first stop before [Amps Compared](amp-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what the {p['name']} is.", "2. Learn how its circuit makes its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Listen to famous tracks.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## How it makes its sound", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The amp", "",
          f"The {p['name']}'s control panel, drawn after photos (positions approximate, no logos). Drag a knob (or use the arrow keys), click a switch, then press a ▶ button. "
          f"The {'bass' if p['inst'] == 'bass' else 'guitar'} is this site's pickup model; **Pedals in front** puts one of the site's pedal models before the amp. Nobody has compared the sound with a real amp. "
          "The graph shows the tone controls and the cabinet (the valves' distortion is left out of it).", "",
          "```{=html}", f'<div class="amp" data-amp="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="amp-step" data-amp="{g}" data-set="{J(s["set"])}" data-play="{s["play"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous tracks", "",
          "Videos checked on YouTube. Where a source ties the player or band to the amp, it is given (no source here ties the exact recording); otherwise it is marked unverified. **No source gives any setting**: **Try a guess** plays this site's guess.", "",
          "```{=html}", f'<div class="amp-tracks" data-amp="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="amp-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="amp-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [Amps Compared](amp-compare.html?a={g}&b={p['other']}): this amp beside another, settings translated.",
          "- [Guitar Pedals Compared](pedal-compare.qmd): the pedals that go in front.", "",
          "```{=html}", "<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/amps.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/synth-kit.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>',
          '<script src="/apps/shared/lessons/guitar-pickups.js"></script>', '<script src="/apps/shared/lessons/bass-pickups.js"></script>', '<script src="/apps/shared/lessons/pedals.js"></script>', '<script src="/apps/shared/lessons/amps.js"></script>', "```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
