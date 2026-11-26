#!/usr/bin/env python3
"""Writes the "Meet the Instruments" bass lessons: lessons/intro-{p-bass,jazz-bass,stingray,rickenbacker-bass}.qmd (a sibling of
guitars.py, for the electric basses of lessons/bass-compare.qmd). Each page: What you'll do, what it is and when, its sound, the
control area (apps/shared/lessons/bass-pickups.js on guitar-pickups.js: a FaithfulPanel drawing bound to the pickup model), a guided
tour (▶ steps), famous tracks (apps/shared/data/basses/tracks.json, oEmbed-checked), a quiz, Next. Facts: the Wikipedia articles
listed in scripts/sources/basses.py. Edit here and rerun:
    python3 scripts/intro-instruments/basses.py [slugs...]
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
P["p-bass"] = dict(gid="pbass", other="jbass", name="Fender Precision Bass", short="P-Bass",
 desc="A first look at the Fender Precision Bass: one split-coil pickup, a volume and a tone knob, a guided tour of its sound, famous tracks, and a short quiz.",
 what=["The **Precision Bass** was first offered for sale in **October 1951** (Wikipedia, \"Fender Precision Bass\").",
       "Fender chose a **34-inch scale** \"after much trial and error\"; it became the standard for full-scale electric basses (Wikipedia).",
       "Its biggest change came in **1957**: a new **split-coil** pickup. It has stayed on Precision Basses ever since (Wikipedia).",
       "Four strings, tuned E A D G, an octave below a guitar's lowest four."],
 sound=["The first Precision pickup was a single coil, and Leo Fender did not like its hum (Wikipedia).",
        "He split it into **two coils**, \"wired out of phase with the magnets oriented with reverse polarities\" (Wikipedia). Hum makes opposite voltages in the two halves and cancels; the strings' signal adds. It works like a humbucker.",
        "Each half sits under **two strings** (E-A in one half, D-G in the other), so the two halves are at slightly different places on the string (which half is nearer the bridge: this page reads photos, unverified).",
        "Two coils in series, a lot of wire: a low resonance, so a round, full, dark sound.",
        "One volume, one tone. The tone knob only cuts treble: it is passive, with no battery."],
 steps=[dict(set={}, play="riff", t="**Everything up.** The plain P sound: round and full."),
        dict(set={"tone": 3}, play="riff", t="**Tone down to 3.** Darker, thumpier: an older soul and Motown kind of sound (a description, not a measured setting)."),
        dict(set={"tone": 0}, play="pluck", t="**Tone at 0.** Very dark: almost only the low harmonics."),
        dict(set={"vol": 6}, play="riff", t="**Volume at 6.** Quieter and a little duller: the pot's resistance and the cable take treble away.")],
 quiz=[("When did the Precision Bass get its split-coil pickup?", ["1951", "1957", "1972"], 1, "Wikipedia."),
       ("Why is the pickup split in two?", ["To cancel hum", "To make it louder only", "To fit five strings"], 0, "The halves are wired out of phase with reversed magnets: hum cancels."),
       ("What is the P-Bass's scale length?", ["30 in", "33.5 in", "34 in"], 2, "34 in (Wikipedia).")])
P["jazz-bass"] = dict(gid="jbass", other="pbass", name="Fender Jazz Bass", short="Jazz Bass",
 desc="A first look at the Fender Jazz Bass: two single-coil pickups, a volume for each and a tone, the blend, the 60s and 70s pickup spacing, a guided tour, famous tracks, and a short quiz.",
 what=["The **Jazz Bass** came out in **1960** as the Deluxe Model; its neck is narrower at the nut than the Precision's (Wikipedia, \"Fender Jazz Bass\").",
       "Two **single-coil** pickups, two pole pieces under each string (Wikipedia).",
       "At first it had stacked knobs (a volume and tone per pickup). From **late 1961**: a volume for each pickup and one tone (Wikipedia). This page models that.",
       "From 1960 to late 1970 the pickups were **3.6 in** apart; then the bridge pickup moved **0.4 in** nearer the bridge (**4 in** apart). Fender says 1972 (Wikipedia)."],
 sound=["There is no switch: the two **volume** knobs blend the pickups. Turn one to 0 and the other plays alone.",
        "The two pickups are reverse wound and reverse polarity, so \"all hum will be canceled when both pickups are at full volume\" (Wikipedia). One alone hums.",
        "Both full up give \"the classic scooped, 'growling' sound\" (Wikipedia): the two combs add, some harmonics cancel.",
        "Two coils in parallel have less inductance than one: the blend's resonance is higher, a brighter edge.",
        "The 70s spacing puts the bridge pickup nearer the bridge: brighter (players say so; Wikipedia). Compare **Jazz 1960s** and **Jazz 1970s** on [Electric Basses Compared](bass-compare.qmd)."],
 steps=[dict(set={}, play="riff", t="**Both full up.** The scooped, growling blend. Hum cancels: turn on **mains hum** and listen."),
        dict(set={"vol2": 0}, play="riff", t="**Neck alone (bridge volume 0).** Rounder, close to a P-Bass. With mains hum on, it hums."),
        dict(set={"vol1": 0}, play="lead", t="**Bridge alone (neck volume 0).** Thin and bright, a nasal bark: a lead bass sound."),
        dict(set={"vol1": 6}, play="riff", t="**Neck at 6, bridge full.** A blend leaning to the bridge pickup."),
        dict(set={"tone": 3}, play="riff", t="**Both up, tone at 3.** Darker, the growl softened.")],
 quiz=[("How do you choose pickups on a Jazz Bass?", ["A three-way switch", "Its two volume knobs", "A push-pull knob"], 1, "Each pickup has its own volume."),
       ("When does a Jazz Bass cancel hum?", ["Always", "With both pickups at full volume", "Never"], 1, "Wikipedia."),
       ("How far apart are the pickups on a 1960s Jazz Bass?", ["3.6 in", "4 in", "6 in"], 0, "3.6 in until late 1970, then 4 in (Wikipedia).")])
P["stingray"] = dict(gid="stingray", other="pbass", name="Music Man StingRay", short="StingRay",
 desc="A first look at the Music Man StingRay: one big humbucker, an active preamp with bass and treble (and later mid), a guided tour, famous tracks, and a short quiz.",
 what=["The **StingRay** came out in **1976**, from Music Man, founded by ex-Fender employees; Leo Fender co-designed it with Tom Walker (Wikipedia, \"Music Man StingRay\").",
       "Walker designed its **active preamp**, powered by a **9-volt battery** (Wikipedia).",
       "One large **humbucker**, placed nearer the bridge than a Precision's pickup, its two coils wired **in parallel** (Wikipedia).",
       "Early StingRays had a **2-band EQ** (bass and treble); later a **mid** control was added (Wikipedia). This page has both: **StingRay (2-band)** and **StingRay (3-band)**."],
 sound=["A **passive** tone knob can only take treble away. An **active** EQ is an amplifier inside the bass: it can **boost** as well as cut.",
        "The preamp also buffers the pickup, so the cable does not dull it: a bright, clear sound.",
        "Coils in parallel have less inductance than in series: brighter than most humbuckers.",
        "Near the bridge: a punchy, thin-ish attack, good for slap. Chic's \"Le Freak\" used its \"low-end thump\" (Wikipedia).",
        "On this page each EQ knob runs 0-10 with **5 = flat**, about 15 dB of boost or cut at the ends, bass at 80 Hz, treble from 2.5 kHz, mid at 500 Hz. These numbers are this site's guesses (unverified)."],
 steps=[dict(set={}, play="riff", t="**EQ flat (5 and 5).** Bright and clear."),
        dict(set={"bass": 8}, play="riff", t="**Bass up to 8.** More thump: a boost no passive bass can make."),
        dict(set={"treble": 8}, play="lead", t="**Treble up to 8.** More click and snap, a slap kind of sound."),
        dict(set={"bass": 8, "treble": 8}, play="riff", t="**Both up.** The \"smile\" EQ: lows and highs up, mids left behind."),
        dict(set={"treble": 1}, play="riff", t="**Treble down to 1.** Dark and round, closer to an old P-Bass.")],
 quiz=[("What powers the StingRay's preamp?", ["The amp", "A 9-volt battery", "Nothing: it is passive"], 1, "Wikipedia."),
       ("What can an active EQ do that a passive tone knob cannot?", ["Boost", "Cut treble", "Change the strings"], 0, "A passive tone knob only cuts."),
       ("How are the StingRay humbucker's coils wired?", ["In series", "In parallel", "Only one is used"], 1, "In parallel, unlike most humbuckers (Wikipedia).")])
P["rickenbacker-bass"] = dict(gid="ric4003", other="pbass", name="Rickenbacker 4003", short="Rickenbacker",
 desc="A first look at the Rickenbacker 4001 / 4003 bass: two single coils, a volume and tone each, a three-way switch, a guided tour, famous tracks, and a short quiz.",
 what=["The **4001** came out in **November 1961**; the **4003** followed in **1980**, almost the same but with a new truss rod for roundwound strings (Wikipedia, \"Rickenbacker 4001\").",
       "Two single-coil pickups: a \"toaster top\" at the neck and a \"horseshoe\" at the bridge, later \"Hi-Gain\" pickups (Wikipedia).",
       "A volume and tone for each pickup and a three-position switch (Wikipedia).",
       "Scale **33.5 in**, a little shorter than a Fender's 34 in. From 1968, a **Rick-O-Sound** stereo jack sends each pickup out on its own (Wikipedia; not modelled here)."],
 sound=["The bridge pickup sits very near the bridge: a bright, biting, twangy sound.",
        "Chris Squire used roundwound strings on his for \"a bright, twangy bass tone\" (Wikipedia).",
        "The neck pickup is far from the bridge: round and deep.",
        "Two single coils, so it can hum (whether its pickups cancel hum together: unverified; this page says not)."],
 steps=[dict(set={"sel": "bridge"}, play="riff", t="**Bridge.** The twangy, biting Rickenbacker sound."),
        dict(set={"sel": "neck"}, play="riff", t="**Neck.** Deep and round."),
        dict(set={"sel": "both"}, play="riff", t="**Both.** Fuller; some harmonics cancel."),
        dict(set={"sel": "both", "vol1": 5}, play="riff", t="**Both, neck volume at 5.** The blend leans to the bridge."),
        dict(set={"sel": "bridge", "tone2": 3}, play="riff", t="**Bridge, tone at 3.** The bite softened.")],
 quiz=[("When did the 4003 come out?", ["1961", "1968", "1980"], 2, "Wikipedia."),
       ("What is Rick-O-Sound?", ["A stereo output", "A fuzz", "A pickup"], 0, "Each pickup on its own output (from 1968)."),
       ("What is its scale length?", ["33.5 in", "34 in", "35 in"], 0, "Wikipedia.")])

def page(slug, p):
    g = p["gid"]
    o = ["---", f'title: "Meet the {p["name"]}"', "toc: true", "toc-depth: 2", f'description: "{p["desc"]}"', "instruments: [bass]", "topics: [sound]", "has: [interactive, svg]", "---", "",
         "A first stop before [Electric Basses Compared](bass-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what the {p['short']} is.", "2. Learn how its pickups and controls make its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Listen to famous tracks.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## Its sound", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The controls", "",
          f"The {p['short']}'s control area, drawn after the real one (positions approximate). Drag a knob (or use the arrow keys), then press a ▶ button. "
          "The sound is this site's physical model of a plucked bass string through these pickups and this wiring, into an amp; nobody has compared it with a real bass. "
          "The picture under the buttons shows the harmonics of the open A string (55 Hz) at the jack (bars) and the circuit alone (line).", "",
          "```{=html}", f'<div class="bsp" data-bass="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="bs-step" data-bass="{g}" data-set="{J(s["set"])}" data-play="{s["play"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous tracks", "",
          "Videos checked on YouTube. Where the bass is named in a source, it is given; **no source was found for any setting**, so each setting is this site's guess (press **Try it** to hear the guess on the model).", "",
          "```{=html}", f'<div class="bs-tracks" data-bass="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="bs-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="gt-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [Electric Basses Compared](bass-compare.html?a={g}&b={p['other']}): the {p['short']} side by side with the others, and settings translated between them.",
          "- [The Electric Bass](electric-bass.qmd): the instrument, the hands, tuning and the fretboard.", "- [Gear 3: amps](gear-amps.qmd): bass amps.", "",
          "```{=html}", "<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/guitar-pickups.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/band/sounds.js"></script>', '<script src="/apps/shared/lessons/synth-kit.js"></script>',
          '<script src="/apps/shared/lessons/faithful-panel.js"></script>', '<script src="/apps/shared/lessons/guitar-pickups.js"></script>', '<script src="/apps/shared/lessons/bass-pickups.js"></script>', "```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
