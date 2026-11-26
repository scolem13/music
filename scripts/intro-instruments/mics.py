#!/usr/bin/env python3
"""Writes the "Meet the Mic" lessons: lessons/intro-{sm57,sm58,u87,r121,md421,beta52}.qmd (a sibling of amps.py, for the mics of
lessons/mic-compare.qmd). Each page: What you'll do, what it is, how it hears, the mic drawn (apps/shared/lessons/mics.js: a
FaithfulPanel drawing bound to the model, with the placement widget), a guided tour (▶ steps), famous uses
(apps/shared/data/mics/tracks.json), a quiz, Next. Facts: scripts/sources/mics.py.
    python3 scripts/intro-instruments/mics.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json, sys, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return s

CURVE = ("The response graph is the maker's published chart **digitised approximately** (the charts are pictures; the points here follow their shape as remembered: unverified).")
PROX = ("Close up, a directional mic gains **bass**: the **proximity effect** (Wikipedia, \"Proximity effect (audio)\"). Slide the distance and watch the low end of the graph rise.")
def st(**k): return k
P = {}
P["sm57"] = dict(mid="sm57", name="Shure SM57", other="md421", src="snare",
 desc="A first look at the Shure SM57: the dynamic cardioid on snares and guitar amps since 1965. Placement, proximity, famous uses, quiz.",
 what=["The **SM57** came out in **1965** (Wikipedia, \"Shure SM57\"): a **dynamic** mic (a coil on a diaphragm in a magnet), **cardioid**.",
       "Range **40-15,000 Hz** with a **presence rise** (Shure). Sensitivity **-56 dBV/Pa** (Wikipedia): quiet output, so it needs gain.",
       "Its forerunner, the Unidyne 545, was on Brian Wilson's vocals on *Pet Sounds*; every US president since Johnson has spoken through one (Wikipedia)."],
 sound=["**Cardioid**: loudest in front, nearly deaf behind: aim its back at what you do not want (the hi-hat).", PROX, CURVE,
        "No published max SPL: a dynamic takes a snare or a loud amp at a few centimetres."],
 steps=[dict(set={}, place={"dist": 0.04, "angle": 0}, src="snare", t="**4 cm from the snare, on axis.** Punch and presence."),
        dict(set={}, place={"dist": 0.04, "angle": 60}, src="snare", t="**Turned 60°.** Duller: off-axis colouration."),
        dict(set={}, place={"dist": 0.3, "angle": 0}, src="snare", t="**30 cm away.** Less bass, more room."),
        dict(set={}, place={"dist": 0.02, "angle": 0}, src="guitar", t="**2 cm from the amp's speaker.** The classic guitar sound."),
        dict(set={}, place={"dist": 0.01, "angle": 0}, src="voice", t="**A voice at 1 cm.** Lots of proximity bass.")],
 quiz=[("What kind of mic is the SM57?", ["Condenser", "Dynamic", "Ribbon"], 1, "Wikipedia."),
       ("What happens to the bass as you move closer?", ["It rises", "It falls", "Nothing"], 0, "The proximity effect."),
       ("Where is a cardioid deafest?", ["Front", "Side", "Back"], 2, "")])
P["sm58"] = dict(mid="sm58", name="Shure SM58", other="sm57", src="voice",
 desc="A first look at the Shure SM58: the ball-grille dynamic vocal mic. Proximity, the bass roll-off, famous uses, quiz.",
 what=["The **SM58**: a dynamic cardioid **vocal** mic, the SM57's capsule family behind a **ball grille** that keeps breath and pops off the diaphragm (Shure; Wikipedia, \"Shure SM58\").",
       "Range **50-15,000 Hz**, \"brightened midrange and bass rolloff\" (Shure); **-54.5 dBV/Pa** (Wikipedia).",
       "It is the stage vocal mic: Wikipedia shows Robert Lockwood Jr. (1982) and Patti Smith (2007) with one."],
 sound=["The **bass roll-off** is built in because singers hold it close: the proximity effect puts the bass back.", PROX, CURVE],
 steps=[dict(set={}, place={"dist": 0.01, "angle": 0}, src="voice", t="**At the lips.** Full, close, bassy."),
        dict(set={}, place={"dist": 0.1, "angle": 0}, src="voice", t="**10 cm.** Thinner: the roll-off shows."),
        dict(set={}, place={"dist": 0.05, "angle": 90}, src="voice", t="**Sung across it, 90°.** Duller and quieter."),
        dict(set={}, place={"dist": 0.05, "angle": 0}, src="voice", room="hall", t="**In a big room.** The cardioid keeps the room down.")],
 quiz=[("Why the bass roll-off?", ["Singers sing close, and proximity adds bass", "To save battery", "It has none"], 0, ""),
       ("The SM58's pattern?", ["Omni", "Cardioid", "Figure-8"], 1, "Shure."),
       ("What is the ball grille for?", ["Looks", "Keeping breath and pops off the capsule", "More bass"], 1, "")])
P["u87"] = dict(mid="u87", name="Neumann U 87 Ai", other="r121", src="voice",
 desc="A first look at the Neumann U 87 Ai: the large-diaphragm studio condenser with three patterns, a pad and a low cut. Placement, famous recordings, quiz.",
 what=["The **U 87** came in **1967** as the solid-state successor of the U 67; the **U 87 Ai** is the current version (Wikipedia, \"Neumann U 87\"; Neumann).",
       "A **condenser** (needs +48 V phantom power) with a large dual-diaphragm capsule and three patterns: **omni, cardioid, figure-8** (Neumann).",
       "Sensitivity **20 / 28 / 22 mV/Pa**, self-noise **15 / 12 / 14 dB-A**, max SPL **117 dB** (127 with the pad) (Neumann).",
       "On Neil Young's \"Heart of Gold\", Soft Cell's \"Tainted Love\", Don McLean's \"American Pie\" (Wikipedia)."],
 sound=["Two cardioid diaphragms back to back: added, an **omni**; one subtracted, a **figure-8**, whose rear lobe is **inverted** (Wikipedia, \"Microphone\").",
        "**Pad** lowers the level 10 dB so loud sources do not overload it; **Low cut** takes off rumble and proximity bass (corner here the site's).",
        "Its \"omni\" is two cardioids summed, so it still has a little proximity effect (Wikipedia notes this for multipattern mics). " + CURVE],
 steps=[dict(set={"pattern": "cardioid"}, place={"dist": 0.2, "angle": 0}, src="voice", t="**Cardioid, 20 cm.** The studio vocal."),
        dict(set={"pattern": "omni"}, place={"dist": 0.2, "angle": 0}, src="voice", room="hall", t="**Omni in a big room.** More room in the sound."),
        dict(set={"pattern": "fig8"}, place={"dist": 0.2, "angle": 180}, src="voice", t="**Figure-8, from behind.** As loud as the front, but inverted."),
        dict(set={"pattern": "cardioid"}, place={"dist": 0.02, "angle": 0}, src="guitar", t="**2 cm from a loud amp.** Over max SPL: it distorts."),
        dict(set={"pattern": "cardioid", "pad": True}, place={"dist": 0.02, "angle": 0}, src="guitar", t="**Pad on.** 10 dB more headroom."),
        dict(set={"pattern": "cardioid", "lowcut": True}, place={"dist": 0.03, "angle": 0}, src="voice", t="**Low cut, close up.** Proximity bass taken off.")],
 quiz=[("How does the U 87 make a figure-8?", ["Two diaphragms, one subtracted", "A ribbon inside", "A software filter"], 0, ""),
       ("What does the pad do?", ["Cuts bass", "Lowers the level so loud sources fit", "Adds reverb"], 1, ""),
       ("What does a condenser need?", ["Phantom power", "A battery always", "Nothing"], 0, "")])
P["r121"] = dict(mid="r121", name="Royer R-121", other="sm57", src="guitar",
 desc="A first look at the Royer R-121 ribbon mic: figure-8, a smooth top, the inverted rear lobe. Guitar amps, rooms, quiz.",
 what=["The **R-121** is a **ribbon** mic from Royer Labs: a 2.5-micron aluminium ribbon between magnets, **figure-8**, passive (Royer).",
       "**30-15,000 Hz ±3 dB**, **-47 dBV**, max SPL above **135 dB** (Royer): it takes a loud guitar amp.",
       "Ribbons are typically bidirectional (Wikipedia, \"Ribbon microphone\")."],
 sound=["Front and back hear equally, the sides almost nothing; the **back is inverted**: mixed with a front mic it can cancel. Use **A + B** on the compare page to hear it.",
        "Royer: the offset ribbon makes the **back brighter** close up (the amount here is the site's).", PROX, CURVE],
 steps=[dict(set={}, place={"dist": 0.15, "angle": 0}, src="guitar", t="**15 cm from the amp.** Smooth, dark top."),
        dict(set={}, place={"dist": 0.15, "angle": 180}, src="guitar", t="**Turned round.** The back: a little brighter, and inverted."),
        dict(set={}, place={"dist": 0.15, "angle": 90}, src="guitar", t="**Side on, 90°.** The null: almost nothing."),
        dict(set={}, place={"dist": 1.5, "angle": 0}, src="snare", room="room", t="**A room mic 1.5 m from the kit.**")],
 quiz=[("Where does a figure-8 not hear?", ["Front", "Back", "Sides"], 2, ""),
       ("What is odd about the rear lobe?", ["It is inverted (opposite polarity)", "It is louder", "It is mono"], 0, "Wikipedia, \"Microphone\"."),
       ("Does the R-121 need phantom power?", ["Yes", "No, it is passive"], 1, "Royer.")])
P["md421"] = dict(mid="md421", name="Sennheiser MD 421", other="sm57", src="snare",
 desc="A first look at the Sennheiser MD 421: a dynamic cardioid with a five-step bass roll-off, on toms, amps and voices. Quiz.",
 what=["The **MD 421**: a dynamic **cardioid**, **30-17,000 Hz ±3 dB** (Wikipedia, \"Sennheiser MD 421\").",
       "A five-position **bass roll-off** ring from **M** (music) to **S** (speech) (Wikipedia).",
       "Used at the 1966 Eurovision (Udo Jürgens) and in numbers on The Concert for Bangladesh (Wikipedia)."],
 sound=["Wikipedia: almost linear in the bass up to 1 kHz, then a smooth upper-mid rise.", "The bass switch steps take away low end (step amounts here are the site's).", PROX, CURVE],
 steps=[dict(set={"bass": "M"}, place={"dist": 0.05, "angle": 30}, src="snare", t="**M, 5 cm, 30° (a tom).** Full."),
        dict(set={"bass": "S"}, place={"dist": 0.05, "angle": 30}, src="snare", t="**S.** Most of the bass off."),
        dict(set={"bass": "3"}, place={"dist": 0.03, "angle": 0}, src="guitar", t="**On the amp, step 3.**"),
        dict(set={"bass": "M"}, place={"dist": 0.05, "angle": 0}, src="kick", t="**On the kick.**")],
 quiz=[("What does S mean on the bass ring?", ["Speech: most cut", "Super bass", "Stereo"], 0, "Wikipedia."),
       ("What kind of mic?", ["Dynamic cardioid", "Ribbon", "Condenser"], 0, "")])
P["beta52"] = dict(mid="beta52", name="Shure Beta 52A", other="md421", src="kick",
 desc="A first look at the Shure Beta 52A kick drum mic: supercardioid, shaped for kick. Inside the drum, at the port, quiz.",
 what=["The **Beta 52A**: a dynamic **supercardioid** for kick drum and bass, response \"shaped specifically for kick drums\" (Shure).",
       "A built-in locking stand adapter and a shock mount (Shure). Shure's page gives no numbers; the curve and levels here are guesses (unverified)."],
 sound=["**Supercardioid**: narrower than a cardioid, with a small rear lobe (Wikipedia, \"Microphone\").", PROX, CURVE + " The kick curve here (a low bump, a mid dip, a click peak near 4 kHz) is the site's."],
 steps=[dict(set={}, place={"dist": 0.1, "angle": 0}, src="kick", t="**Inside the drum, 10 cm.**"),
        dict(set={}, place={"dist": 0.03, "angle": 0}, src="kick", t="**3 cm from the beater head.** More click and boom."),
        dict(set={}, place={"dist": 0.4, "angle": 0}, src="kick", t="**40 cm outside.** Less boom, more room."),
        dict(set={}, place={"dist": 0.1, "angle": 60}, src="kick", t="**Turned 60°.**")],
 quiz=[("Its pattern?", ["Cardioid", "Supercardioid", "Omni"], 1, "Shure."),
       ("Moving it closer to the head gives…", ["More bass (proximity)", "Less bass"], 0, "")])

def page(slug, p):
    g = p["mid"]
    o = ["---", f'title: "Meet the {p["name"]}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"]}"', "instruments: [voice, guitar, drums]", "topics: [recording]", "has: [interactive, svg]", "---", "",
         "A first stop before [Microphones Compared](mic-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what the {p['name']} is.", "2. Learn how it hears: pattern, proximity, off axis.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Look up famous uses.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## How it hears", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The mic", "",
          f"The {p['name']} drawn after photos (proportions approximate, no logos){', with its switches: click them' if g in ('u87', 'md421') else ''}. Drag the blue mic in the room (or use the Distance slider; the wheel or Angle turns it), choose a source and a room, press **▶ Hear it**. "
          "Voice is generated (the band has no singer); snare and kick are the band's kit; the guitar is the site's amp model. Nobody has compared the sound with a real mic.", "",
          "```{=html}", f'<div class="mic" data-mic="{g}" data-src="{p["src"]}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="mic-step" data-mic="{g}" data-set="{J(s["set"])}" data-place="{J(s["place"])}" data-src="{s["src"]}"' + (f' data-room="{s["room"]}"' if s.get("room") else "") + f'><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous uses", "",
          "Where a source ties the mic to the artist or record it is named; a link with a channel is a video checked on YouTube, the others are YouTube searches. **No source gives a placement**: **Try a guess** plays this site's guess.", "",
          "```{=html}", f'<div class="mic-tracks" data-mic="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="mic-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="mic-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [Microphones Compared](mic-compare.html?a={g}&b={p['other']}): this mic beside another, placement translated.",
          "- [Recording 2: Microphones and Phantom Power](rec-mics.qmd): types, patterns and phantom power.", "",
          "```{=html}", "<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/mics.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/synth-kit.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>',
          '<script src="/apps/shared/band/sounds.js"></script>', '<script src="/apps/shared/lessons/guitar-pickups.js"></script>', '<script src="/apps/shared/lessons/pedals.js"></script>', '<script src="/apps/shared/lessons/amps.js"></script>',
          '<script src="/apps/shared/lessons/mics.js"></script>', "```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
