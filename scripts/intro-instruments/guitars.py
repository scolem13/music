#!/usr/bin/env python3
"""Writes the "Meet the Instruments" guitar lessons: lessons/intro-{strat,tele,les-paul,sg}.qmd (a sibling of build.py, for the
electric guitars of lessons/guitar-compare.qmd). Each page: What you'll do, what it is and when, its sound, the control area
(apps/shared/lessons/guitar-pickups.js: a FaithfulPanel drawing bound to the pickup model), a guided tour (▶ steps), famous tracks
(apps/shared/data/guitars/tracks.json, oEmbed-checked), a quiz, Next. Facts: the Wikipedia articles and Tillman (2002), listed in
scripts/sources/guitars.py. Edit here and rerun:
    python3 scripts/intro-instruments/guitars.py [ids...]
then python3 scripts/works-cited.py (it rewrites the Works Cited block, kept across reruns).
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
P["strat"] = dict(gid="strat", name="Fender Stratocaster", short="Strat", art="the ",
 desc="A first look at the Fender Stratocaster: three single-coil pickups, a five-way switch, one volume and two tone knobs, a guided tour of its pickup sounds, famous tracks, and a short quiz.",
 what=["The **Stratocaster** is a solid-body electric guitar made by **Fender** (Wikipedia, \"Fender Stratocaster\").",
       "\"Most Stratocasters have three single-coil pickups, a pickup selector switch, one volume control and two tone controls\" (Wikipedia).",
       "Its selector was a 3-way switch at first; players found the in-between spots, and \"Fender introduced a five-way selector in 1977\" (Wikipedia).",
       "Its scale (string length from nut to bridge) is **25.5 inches** (648 mm) (Wikipedia)."],
 sound=["A pickup is a magnet with a coil of wire. The moving steel string changes the magnetic field and makes a small voltage in the coil.",
        "Where a pickup sits matters. A harmonic that has a still point (a *node*) over the pickup is not heard. So each place along the string hears a different set of harmonics: a *comb filter* (Tillman, 2002).",
        "The **neck** pickup is far from the bridge: it hears the low harmonics strongly, so it sounds round and warm. The **bridge** pickup is near the bridge: thinner and brighter.",
        "Positions **2** and **4** join two pickups. Their two combs add, and some harmonics cancel: the hollow \"quack\" (Wikipedia names position 2).",
        "Single coils pick up mains **hum**. On many Strats the middle pickup is wound the other way, so 2 and 4 cancel the hum (this page's model does that; unverified for any year)."],
 steps=[dict(set={"sel": "p5"}, play="riff", t="**Position 5: neck.** Listen: round, warm, soft at the top."),
        dict(set={"sel": "p3"}, play="riff", t="**Position 3: middle.** A little brighter and thinner."),
        dict(set={"sel": "p1"}, play="riff", t="**Position 1: bridge.** Bright and thin, with bite."),
        dict(set={"sel": "p2"}, play="riff", t="**Position 2: bridge + middle.** Listen for the hollow \"quack\": some harmonics cancel."),
        dict(set={"sel": "p4"}, play="chord", t="**Position 4: middle + neck.** The quack again, warmer. Turn on **mains hum** above and compare 4 with 5: 4 is quiet."),
        dict(set={"sel": "p5", "tone1": 0}, play="riff", t="**Neck, tone at 0.** The tone knob joins a capacitor to the signal. Listen: dark and woolly."),
        dict(set={"sel": "p1", "vol": 6}, play="riff", t="**Bridge, volume at 6.** Quieter, and a little duller: the volume knob's resistance and the cable take treble away.")],
 quiz=[("How many pickups does most Stratocasters have?", ["One", "Two", "Three", "Four"], 2, "Three single coils (Wikipedia)."),
       ("Which pickup sounds brightest?", ["Neck", "Middle", "Bridge"], 2, "Near the bridge it hears more high harmonics."),
       ("What makes positions 2 and 4 sound hollow?", ["Two pickups' harmonics adding and cancelling", "A broken switch", "Reverb", "The strings are looser"], 0, "Two combs add; some harmonics cancel."),
       ("When did Fender introduce the five-way selector?", ["1954", "1965", "1977", "1999"], 2, "Wikipedia.")])
P["tele"] = dict(gid="tele", name="Fender Telecaster", short="Tele", art="the ",
 desc="A first look at the Fender Telecaster: two single-coil pickups, a three-way switch, one volume and one tone, a guided tour of its sounds, famous tracks, and a short quiz.",
 what=["The **Telecaster** came out as the Broadcaster in **1950** and was renamed Telecaster in 1951 (Wikipedia, \"Fender Telecaster\").",
       "\"Most Telecasters have two single-coil pickups.\" The bridge pickup sits in a metal plate and has more windings, so it is louder (Wikipedia).",
       "Controls: one volume, one tone and a three-way switch. Since 1967: neck alone, both, bridge alone (Wikipedia). The first Telecasters were wired differently.",
       "Scale 25.5 inches, like the Stratocaster (Wikipedia)."],
 sound=["The **bridge** pickup: bright and twangy. More windings means more output and a lower resonance (Wikipedia, \"Pickup (music technology)\").",
        "The **neck** pickup: warm and quiet.",
        "**Both** together: the two combs add, a thinner, hollow sound.",
        "Two single coils, so it can hum."],
 steps=[dict(set={"sel": "bridge"}, play="riff", t="**Bridge.** The classic twang."),
        dict(set={"sel": "both"}, play="chord", t="**Both.** Listen: hollow, a little thin."),
        dict(set={"sel": "neck"}, play="lead", t="**Neck.** Warm and soft."),
        dict(set={"sel": "bridge", "tone": 2}, play="riff", t="**Bridge, tone down to 2.** Darker, the twang rounded off.")],
 quiz=[("Which Telecaster pickup has more windings?", ["Neck", "Bridge"], 1, "Wikipedia."),
       ("What did the Telecaster first come out as?", ["The Broadcaster", "The Esquire", "The Stratocaster", "The Jaguar"], 0, "1950, the Broadcaster."),
       ("How many knobs on a modern Telecaster?", ["One", "Two", "Four"], 1, "Volume and tone.")])
P["les-paul"] = dict(gid="lespaul", name="Gibson Les Paul", short="Les Paul", art="the ",
 desc="A first look at the Gibson Les Paul: two humbuckers, two volume and two tone knobs, a Rhythm / Treble toggle, a guided tour of its sounds, famous tracks, and a short quiz.",
 what=["The **Les Paul** was \"first sold by the Gibson Guitar Corporation in 1952\" (Wikipedia, \"Gibson Les Paul\").",
       "Its **humbucker** pickups were designed by Seth Lover and \"debuted on Les Pauls in 1957\" (Wikipedia).",
       "Four knobs (two volume, two tone) and a three-way switch (Wikipedia). Each pickup has its own volume and tone.",
       "Scale 24.75 inches: a little shorter than a Fender (Wikipedia)."],
 sound=["A **humbucker** is two coils side by side, wound and magnetised opposite ways. Hum makes opposite voltages in the two coils and cancels; the string's signal adds (Wikipedia, \"Pickup (music technology)\").",
        "Two coils are wider than one: they average the string over a longer stretch, which softens the high harmonics (Tillman, 2002).",
        "More wire means a lower resonance: humbuckers sound fuller and darker than single coils.",
        "In the middle position, turning **one** volume down changes the other pickup too: they share the output."],
 steps=[dict(set={"sel": "rhythm"}, play="lead", t="**Rhythm (neck).** Thick and warm."),
        dict(set={"sel": "treble"}, play="riff", t="**Treble (bridge).** Brighter, with more bite. Turn the amp to **Crunch** or **Lead** and play it again."),
        dict(set={"sel": "both"}, play="chord", t="**Both.** Fuller than each alone, a little hollow."),
        dict(set={"sel": "both", "vol1": 6}, play="chord", t="**Both, neck volume at 6.** The mix leans to the bridge pickup."),
        dict(set={"sel": "rhythm", "tone1": 0}, play="lead", t="**Neck, tone at 0.** Very dark: a \"woman tone\" kind of sound (the name is players' slang)."),
        dict(set={"sel": "both", "phase": True}, play="chord", t="**What if: neck out of phase.** Not on a stock Les Paul. The two pickups now subtract: the low harmonics cancel, a thin, nasal sound.")],
 quiz=[("Why does a humbucker cancel hum?", ["Its two coils get opposite hum voltages", "It has no magnet", "It is made of wood", "The amp removes it"], 0, "Wikipedia."),
       ("Who designed the humbucker for Gibson?", ["Leo Fender", "Seth Lover", "Les Paul", "Jimmy Page"], 1, "Wikipedia."),
       ("How many tone knobs does a Les Paul have?", ["One", "Two", "Three"], 1, "One for each pickup.")])
P["sg"] = dict(gid="sg", name="Gibson SG", short="SG", art="the ",
 desc="A first look at the Gibson SG: two humbuckers, a volume and tone for each, a three-way switch, a guided tour, famous tracks, and a short quiz.",
 what=["The **SG** is a \"solid-body electric guitar model introduced by Gibson in 1961\", as a successor to the Les Paul (Wikipedia, \"Gibson SG\").",
       "It has \"a volume and a tone control for each individual pickup\" and a three-way switch (Wikipedia).",
       "Scale 24.75 inches, like the Les Paul (Wikipedia). Its body is thinner, with two horns."],
 sound=["The same circuit as the Les Paul: two humbuckers, each with its own volume and tone.",
        "Its neck joins the body further up, so the neck pickup is further from the bridge: nearer the string's middle (this page's estimate of the distance). It hears even fewer high harmonics: rounder.",
        "Bridge pickup: the bite of AC/DC and early Black Sabbath records (players named in Wikipedia)."],
 steps=[dict(set={"sel": "treble"}, play="riff", t="**Treble (bridge).** Bright and biting. Try the **Lead** amp."),
        dict(set={"sel": "rhythm"}, play="lead", t="**Rhythm (neck).** Rounder than a Les Paul's neck pickup in this model."),
        dict(set={"sel": "both"}, play="chord", t="**Both.** Full chords.")],
 quiz=[("When did Gibson introduce the SG?", ["1952", "1961", "1977"], 1, "Wikipedia."),
       ("How many pickups has an SG Standard?", ["One", "Two", "Three"], 1, "Two humbuckers.")])

def page(slug, p):
    g = p["gid"]
    o = ["---", f'title: "Meet the {p["name"]}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"]}"', "instruments: [guitar]", "topics: [sound]", "has: [interactive, svg]", "---", "",
         "A first stop before [Electric Guitars Compared](guitar-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what the {p['short']} is.", "2. Learn how its pickups make its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Listen to famous tracks.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## Its sound", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The controls", "",
          f"The {p['short']}'s control area, drawn after the real one (positions approximate). Click the selector, drag a knob (or use the arrow keys), then press a ▶ button. "
          "The sound is this site's physical model of a plucked string through these pickups and this wiring, into an amp; nobody has compared it with a real guitar. "
          "The picture under the buttons shows the harmonics of the open A string at the jack (bars) and the circuit alone (line).", "",
          "```{=html}", f'<div class="gtp" data-guitar="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="gt-step" data-guitar="{g}" data-set="{J(s["set"])}" data-play="{s["play"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous tracks", "",
          "Videos checked on YouTube. Where the guitar is named in a source, it is given; **no source was found for any pickup setting**, so each setting is this site's guess (press **Try it** to hear the guess on the model).", "",
          "```{=html}", f'<div class="gt-tracks" data-guitar="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="gt-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="gt-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [Electric Guitars Compared](guitar-compare.html?a={g}&b={'lespaul' if g != 'lespaul' else 'strat'}): the {p['short']} side by side with the others, and settings translated between them.",
          "- [Gear 3: amps](gear-amps.qmd): the amp these guitars play through.", "",
          "```{=html}", "<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/guitar-pickups.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/band/sounds.js"></script>', '<script src="/apps/shared/lessons/synth-kit.js"></script>',
          '<script src="/apps/shared/lessons/faithful-panel.js"></script>', '<script src="/apps/shared/lessons/guitar-pickups.js"></script>', "```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
