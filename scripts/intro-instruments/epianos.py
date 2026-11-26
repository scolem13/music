#!/usr/bin/env python3
"""Writes the electric piano pages (sibling of build.py, which does the synths / drum machines / sequencers):
lessons/epiano-compare.qmd and lessons/intro-{rhodes,wurlitzer,clavinet,cp70,pianet}.qmd, plus
apps/shared/data/epianos/assignments.json (famous tracks: YouTube videos confirmed by oEmbed 2026-11-26, title + channel as
oEmbed gave them; what the instrument does there and a starting setting on this site's model).
Widget: apps/shared/lessons/epiano.js (<div class="epc">), tour steps through intro-kit.js (kind "epiano").
Facts: Wikipedia articles read 2026-11-26 (scripts/sources/epianos.py); anything else is marked unverified on the page.
    python3 scripts/intro-instruments/epianos.py   then   python3 scripts/works-cited.py
"""
import json, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
A = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)

# model id -> page slug, names, Wikipedia facts (each with its article), sound ideas, tour, tracks, quiz
M = {}
M["rhodes"] = dict(slug="rhodes", name="Fender Rhodes Mark I Stage 73", short="Rhodes", wiki="Rhodes piano", also="suitcase",
 what=["The **Rhodes** is an electric piano. The **Mark I Stage** and **Suitcase** models are both dated **1970** (Wikipedia, \"Rhodes piano\").",
       "The Stage has **73 keys**, weighs about 130 pounds and needs an outside amplifier; the Suitcase has its own amplifier and speakers (Wikipedia).",
       "The Suitcase's \"vibrato\" is really a **tremolo** that \"bounces the output signal\" between two speakers: Wikipedia calls the label inaccurate, since vibrato means a change of pitch."],
 sound=["\"The hammers strike thin metal tines, which vibrate next to an electromagnetic pickup\" (Wikipedia).",
        "\"The tone bar reinforces and extends the tine's vibrations\" (Wikipedia): that is why a Rhodes note rings on.",
        "The pickup works \"like an electric guitar\" (Wikipedia). Where the tine sits against the pickup changes the tone; hit harder and it **barks** (this page's model; the voicing numbers are unverified).",
        "The attack has a short **bell**: the tine's higher modes, which die away quickly (this page's model)."],
 steps=[(dict(model="rhodes"), "ballad", "**The plain Stage.** Default settings: Volume 7, Bass boost 5. Listen for the round, warm chord and the bell at each note's start."),
        (dict(model="rhodes", voice=1.5), "soft_hard", "**Pickup voicing close to the centre.** The tine sits nearly in the middle of the pickup (a service adjustment inside the piano). The same chord four times, soft to hard: listen for the hard ones turning gritty: the **bark**."),
        (dict(model="rhodes", voice=8), "soft_hard", "**Voicing far off centre.** The same four hits. Listen: cleaner and more bell-like even when hit hard."),
        (dict(model="rhodes", tbar=1), "ballad", "**Little tonebar sustain.** The notes die away sooner: the tonebar is what keeps a Rhodes ringing."),
        (dict(model="suitcase", vib=8, rate=4), "ballad", "**The Suitcase's \"vibrato\".** Intensity 8, Speed 4. On headphones the sound moves from ear to ear: a stereo tremolo, not vibrato.")],
 tracks=[("7G2-FPlvY58", "The Doors - Riders on the Storm (Official Audio)", "The Doors", "Riders on the Storm", "The Doors",
          "Ray Manzarek played a Mark I Stage 73 in the studio (Wikipedia). Soft, rainy chords and a jazzy line, with no bark.", dict(model="rhodes", voice=6, hard=3, bass=6, drive=1), "ballad"),
         ("1RCKWBFt9MU", "Angela (Theme From Taxi)", "Bob James - Topic", "Angela (Theme from Taxi)", "Bob James",
          "Wikipedia names it among Rhodes recordings. A bell-like melody over chords: the tine's attack is the point.", dict(model="suitcase", vib=3, rate=3, hard=7), "ballad"),
         ("HaA3YZ6QdJU", "Billy Joel - Just the Way You Are (Official Audio)", "billyjoelVEVO", "Just the Way You Are", "Billy Joel",
          "Wikipedia does not name this song; it is widely called a Rhodes record (unverified). Soft chords with a slow, gentle movement.", dict(model="suitcase", vib=4, rate=2.5, hard=3), "ballad")],
 quiz=[("What does a Rhodes hammer hit?", ["A metal tine", "A string", "A reed", "A drum skin"], 0, "Wikipedia: thin metal tines."),
       ("What does the tonebar do?", ["Reinforces and extends the tine's vibration", "Changes the pitch", "Turns it off", "Adds echo"], 0, "Wikipedia."),
       ("The Suitcase's \"vibrato\" is really…", ["A tremolo bouncing between two speakers", "A pitch wobble", "A reverb", "A filter"], 0, "Wikipedia: the label is inaccurate."),
       ("What happens when you hit a Rhodes harder?", ["It gets louder and can bark", "It gets quieter", "The pitch goes up an octave", "Nothing"], 0, "Step 2.")])
M["wurli"] = dict(slug="wurlitzer", name="Wurlitzer 200A", short="Wurlitzer", wiki="Wurlitzer electronic piano",
 what=["The **Wurlitzer 200** came out in **1968**; it was the most popular Wurlitzer, about 88,000 built (Wikipedia, \"Wurlitzer electronic piano\").",
       "The **200A** came in **1974** and was made until 1983, with a better shield against mains hum (Wikipedia).",
       "Most Wurlitzers have **64 keys**. The 200 weighs 56 pounds without legs, with a 30-watt amplifier and two speakers facing the player (Wikipedia)."],
 sound=["The sound is made \"by striking a metal reed with a felt hammer\" (Wikipedia).",
        "The reed moves near an **electrostatic pickup** held at 170 V DC; its motion changes the charge and makes the signal (Wikipedia).",
        "The pickup is not even on both sides of the reed, so hard notes gain **even harmonics** and the amp pushes them further: the Wurli's reedy growl (this page's model).",
        "Its vibrato knob is really a **tremolo** at one speed: only the depth changes (Wikipedia: \"Vibrato (single speed)\")."],
 steps=[(dict(model="wurli"), "soul", "**The plain 200A.** Volume 7, Vibrato 0. Listen: thinner and reedier than a Rhodes."),
        (dict(model="wurli", gap=9, drive=6), "soft_hard", "**Reed close to the pickup, amp driven.** Soft to hard: listen for the growl on the hard hits."),
        (dict(model="wurli", vib=7), "soul", "**Vibrato 7.** The level goes up and down at one speed: a tremolo."),
        (dict(model="wurli", tone=2, drive=1), "soul", "**A dark, clean Wurli.** Speaker brightness 2 and little drive: closer to a soft ballad sound.")],
 tracks=[("low6Coqrw9Y", "The Logical Song", "Supertramp - Topic", "The Logical Song", "Supertramp",
          "Wikipedia names Supertramp's Wurlitzer on it. Bouncy, bright chords with a little bite.", dict(model="wurli", gap=6, drive=5, tone=6), "soul"),
         ("7fdAFmtq-o8", "Dreamer", "Supertramp - Topic", "Dreamer", "Supertramp",
          "Also named by Wikipedia. A fast repeated chord figure: hard hits that bark.", dict(model="wurli", gap=8, drive=6, hard=7), "soft_hard"),
         ("HaZpZQG2z10", "Queen - You're My Best Friend (Official Video)", "Queen Official", "You're My Best Friend", "Queen",
          "John Deacon played the Wurlitzer (Wikipedia). A steady comping part under the voices.", dict(model="wurli", gap=5, drive=3), "soul")],
 quiz=[("What does the Wurlitzer's hammer hit?", ["A metal reed", "A tine", "A string", "A bell"], 0, "Wikipedia."),
       ("What kind of pickup does it have?", ["Electrostatic", "Magnetic", "Piezo", "A microphone"], 0, "Wikipedia: 170 V DC electrostatic pickup."),
       ("How many speeds has its vibrato?", ["One", "Two", "Any", "None: it has no vibrato"], 0, "Wikipedia: single speed."),
       ("When did the 200A come out?", ["1974", "1959", "1990", "1965"], 0, "Wikipedia.")])
M["clav"] = dict(slug="clavinet", name="Hohner Clavinet D6", short="Clavinet", wiki="Clavinet",
 what=["The **Clavinet D6** came out in **1971** (Wikipedia, \"Clavinet\").",
       "Each key drives a rubber pad against a tensioned **steel string**, which sounds against an anvil point; an **electromagnetic pickup** turns the string's motion into a signal (Wikipedia).",
       "The other end of each string runs through **yarn**, which damps it as soon as the key is let go (Wikipedia). That is why it sounds so short and funky."],
 sound=["Four tone rockers: **Brilliant** and **Treble** switch in a high-pass filter, **Medium** and **Soft** a low-pass filter (Wikipedia).",
        "Two rockers marked **AB** and **CD** choose the pickups (Wikipedia). Each pickup hears the string at a different place, so each is a different tone; which position is which pickup here is this page's reading (unverified).",
        "A **mute slider** on the right lays a damper on the strings (Wikipedia names it; how much it shortens the note is this page's).",
        "Hit harder and the string sounds louder and brighter: there is no sustain pedal (this page's model)."],
 steps=[(dict(model="clav"), "funk", "**Treble tab, upper pickup (C + A).** A sharp, bright funk riff."),
        (dict(model="clav", pa="B"), "funk", "**Lower pickup (C + B).** The same riff: thinner and nasal, since the lower pickup sits nearer the string's end."),
        (dict(model="clav", pc="D", pa="B"), "funk", "**Both pickups out of phase (D + B).** The low harmonics cancel: hollow and very thin."),
        (dict(model="clav", treb=False, soft=True), "funk", "**Soft tab.** A low-pass filter: round and dark."),
        (dict(model="clav", mute=7), "funk", "**Mute slider at 7.** Each note is cut short, like a muted guitar.")],
 tracks=[("NuYDKzky4z0", "Bill Withers - Use Me (Official Audio)", "BillWithersVEVO", "Use Me", "Bill Withers",
          "Wikipedia names it. A two-note groove that never lets go: short, damped notes.", dict(model="clav", soft=False, treb=True, mute=3), "funk"),
         ("1esf0efHbjM", "Higher Ground", "Stevie Wonder - Topic", "Higher Ground", "Stevie Wonder",
          "Wikipedia names it. A driving riff, thick and gritty (on the record also through effects: unverified).", dict(model="clav", pc="D", pa="A", drive=6), "funk")],
 quiz=[("What makes the sound of a Clavinet?", ["A string struck against an anvil", "A metal reed", "A tine", "A spring"], 0, "Wikipedia."),
       ("What do Brilliant and Treble switch in?", ["A high-pass filter", "A low-pass filter", "A tremolo", "A second string"], 0, "Wikipedia."),
       ("Why does a Clavinet note stop so fast?", ["Yarn damps the string when the key is let go", "The pickup turns off", "The string breaks", "A timer"], 0, "Wikipedia."),
       ("What are the AB and CD rockers for?", ["Choosing the pickups", "Changing octave", "Turning on vibrato", "Tuning"], 0, "Wikipedia.")])
M["cp70"] = dict(slug="cp70", name="Yamaha CP-70", short="CP-70", wiki="Yamaha CP-70",
 what=["The **Yamaha CP-70** (1976, 73 keys) and **CP-80** (1978, 88 keys) are electric grand pianos, made until 1985 (Wikipedia, \"Yamaha CP-70\").",
       "They have a real piano action: \"wooden keys to operate hammers that hit strings\", but **no soundboard** (Wikipedia).",
       "It was built for touring: the harp lifts off the keys, and the legs pack into the lid (Wikipedia)."],
 sound=["\"The strings are amplified by piezo-electric pickups mounted on the harp casting\" (Wikipedia), like an acoustic guitar's pickups.",
        "The bass strings are much shorter than an acoustic piano's (Wikipedia). Short, thick strings are stiffer, so their overtones go sharp: a twangy bass (this page's model).",
        "Two or three strings for most notes, never exactly in tune with each other: a slow **beating** that makes it shimmer (this page's model).",
        "Its knobs here (Volume, a three-band EQ, Tremolo speed and depth) are from memory: **unverified**. Wikipedia names a graphic EQ on the later D models."],
 steps=[(dict(model="cp70"), "ballad", "**The plain CP-70.** Listen: a piano, but brighter and thinner, with no wooden body to it."),
        (dict(model="cp70", detune=9), "ballad", "**Strings wider apart.** Unison spread 9: the chorus-like shimmer it is known for."),
        (dict(model="cp70", treble=8, mid=3, bass=6), "ballad", "**EQ: Treble 8, Middle 3, Bass 6.** The 1980s ballad sparkle."),
        (dict(model="cp70", trem=6, rate=5), "ballad", "**Tremolo depth 6.** The level pulses (this control is unverified on the real panel).")],
 tracks=[("Vzyn60Zns-E", "Genesis - That's All (Official Music Video)", "Genesis", "That's All", "Genesis",
          "Tony Banks's CP-70 (Wikipedia). A bouncing chord part, bright and percussive.", dict(model="cp70", treble=7, hard=6), "soul"),
         ("kU8OJAOMbPg", "Peter Gabriel - In Your Eyes", "Peter Gabriel", "In Your Eyes", "Peter Gabriel",
          "Wikipedia names it. Chords that ring and shimmer under the voice.", dict(model="cp70", detune=6, treble=6), "ballad")],
 quiz=[("What does a CP-70 hammer hit?", ["Strings", "Tines", "Reeds", "Nothing: it is digital"], 0, "Wikipedia."),
       ("What does it have instead of a soundboard?", ["Piezo pickups", "A magnetic pickup per key", "A microphone", "A speaker"], 0, "Wikipedia."),
       ("How many keys has the CP-80?", ["88", "73", "61", "64"], 0, "Wikipedia."),
       ("Why does a CP-70 shimmer?", ["Its strings for one note are never exactly in tune", "A chorus pedal is built in", "The keys wobble", "It has no strings"], 0, "This page's model, step 2.")])
M["pianet"] = dict(slug="pianet", name="Hohner Pianet N", short="Pianet", wiki="Pianet",
 what=["The **Pianet** was made by Hohner from **1962 to 1983**; the **N** from 1965 to 1968 and the N II until 1977 (Wikipedia, \"Pianet\").",
       "There is no hammer. Each key lifts a **pad** off a tuned **reed**, and the reed springs free and vibrates (Wikipedia).",
       "The N used leather-faced pads and a **variable-capacitance** (electrostatic) pickup; the later T used suction pads and an electromagnetic pickup (Wikipedia)."],
 sound=["Because the reed is plucked, not hit, the attack is soft, and the note dies quickly when the key comes up (Wikipedia: the reeds are damped as soon as the keys are released, said of the T).",
        "The N has a **vibrato switch** beside the keys and a floor **volume pedal** (Wikipedia).",
        "The pad's grip sets how far the reed is pulled before it lets go (this page's model)."],
 steps=[(dict(model="pianet"), "soul", "**The plain Pianet.** Listen: short, soft, bell-like notes."),
        (dict(model="pianet", vibOn=True), "soul", "**Vibrato switch on.** The level wobbles at one speed (this page's rate)."),
        (dict(model="pianet", pad=9, gap=8), "soft_hard", "**A strong pad grip and the reed close to the pickup.** More bite on every note.")],
 tracks=[("T6cLHNF5N8E", "The Zombies - She's Not There (Mono Remastered) (Official Lyric Video)", "The Zombies Music", "She's Not There", "The Zombies",
          "Wikipedia names it. The famous keyboard solo and the soft, clipped chords.", dict(model="pianet", pad=6), "soul"),
         ("xcLdbsrSngA", "The Guess Who - These Eyes (Official Audio)", "TheGuessWhoVEVO", "These Eyes", "The Guess Who",
          "Wikipedia names it. Gentle chords under the verse.", dict(model="pianet", pad=4, vibOn=False), "ballad")],
 quiz=[("How does a Pianet reed start to sound?", ["A pad lets go of it", "A hammer hits it", "A bow", "Air"], 0, "Wikipedia."),
       ("What pickup has the Pianet N?", ["Variable capacitance (electrostatic)", "Piezo", "Magnetic only", "None"], 0, "Wikipedia."),
       ("Which band recorded \"She's Not There\" with one?", ["The Zombies", "Queen", "Genesis", "The Doors"], 0, "Wikipedia.")])

ORDER = ["rhodes", "wurli", "clav", "cp70", "pianet"]
SOURCES_NOTE = "Facts come from the Wikipedia articles listed under Works Cited (read 2026-11-26). The service manuals were not read for these pages, so control legends and places that Wikipedia does not give are marked unverified."
INC = """```{=html}
<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">
<script src="/apps/shared/lessons/sections.js"></script>
<script src="/apps/shared/lessons/faithful-panel.js"></script>
<script src="/apps/shared/lessons/epiano.js"></script>
<script src="/apps/shared/lessons/intro-kit.js"></script>
```"""

def step(st, riff, text, n=None):
    return f'<div class="ik-step" data-set="{A(st)}" data-riff="{riff}">\n\n{text}\n\n</div>'
def yt(i): return f"https://www.youtube.com/watch?v={i}"

def tracks_md(mid, p):
    out = []
    for (vid, title, chan, song, artist, does, st, riff) in p["tracks"]:
        words = ", ".join(f"{k} {v}" for k, v in st.items() if k != "model") or "the defaults"
        out.append(f"### \"{song}\" ({artist})\n\n[▶ {html.escape(title)}]({yt(vid)}) on YouTube ({chan}).\n\n{does}\n\n" +
                   step(st, riff, f"**Starting setting** ({p['short'] if st.get('model', mid) == mid else st['model']}): {words}. Then change it until it sounds like the record to you."))
    return "\n\n".join(out)

def quiz(q):
    return "\n".join(f'<div class="ik-q" data-a="{a}"><p><b>{html.escape(t)}</b></p><ul>' + "".join(f"<li>{html.escape(c)}</li>" for c in ch) + f'</ul><p class="ik-why">{html.escape(w)}</p></div>' for (t, ch, a, w) in q)

def intro(mid):
    p = M[mid]
    other = [m for m in ORDER if m != mid]
    nexts = "\n".join(f"- [Meet the {M[m]['short']}](intro-{M[m]['slug']}.qmd)" for m in other)
    return f"""---
title: "Meet the {p['short']}"
toc: true
toc-depth: 2
description: "A first look at the {p['name']}: how it makes its sound, a guided tour on this site's physical model with its own panel, famous tracks with a starting setting, and a short quiz."
instruments: [piano, other]
topics: [sound]
has: [interactive, svg]
---

A first stop before [Electric Pianos Compared](epiano-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.

::: {{.ik-do}}
**What you'll do**

1. Read what the {p['short']} is and when it was made.
2. Learn how it makes its sound, one idea at a time.
3. Take a guided tour: press each **▶ Hear step** button and listen for one change.
4. Hear famous tracks and try a starting setting for each.
5. Check yourself with a short quiz.
:::

## What it is

{chr(10).join("- " + s for s in p['what'])}

## Its sound

{chr(10).join("- " + s for s in p['sound'])}

## The panel

The {p['short']}'s panel drawn after the real one (not a copy; no logos). Turn the knobs, flip the switches, play the keys below it,
the computer keys or a MIDI keyboard. **Simple** shows every control as a slider, including the adjustments inside the instrument.
The sound is this site's own physical model (see [how it is modelled](epiano-compare.qmd#how-each-one-is-modelled)); nobody has
compared it with the real instrument. {SOURCES_NOTE}

```{{=html}}
<div class="ik-box" data-kind="epiano" data-id="{mid}"><div class="epc" data-model="{mid}" data-compact></div></div>
```

## A guided tour

{(chr(10)*2).join(step(st, r, t) for (st, r, t) in p['steps'])}

## Famous tracks

Each video was checked on YouTube (oEmbed, 2026-11-26). Listen first, then press **▶** for a starting setting on the panel above.

{tracks_md(mid, p)}

## Quiz

```{{=html}}
{quiz(p['quiz'])}
```

## Next

- [Electric Pianos Compared](epiano-compare.qmd): every model side by side, and what happens to a sound when you turn it into another.
{nexts}

{INC}
"""

def compare():
    rows = "\n".join(f"| [{M[m]['name']}](intro-{M[m]['slug']}.qmd) | {r} |" for m, r in [
        ("rhodes", "Hammer hits a **tine** + tonebar; magnetic pickup"), ("wurli", "Felt hammer hits a **reed**; electrostatic pickup"),
        ("clav", "Pad drives a **string** onto an anvil; two magnetic pickups"), ("cp70", "Piano hammers hit **strings**; piezo pickups, no soundboard"),
        ("pianet", "A pad lets go of a **reed**; capacitance pickup (N)")])
    allsteps = "\n\n".join(f"### {M[m]['short']}\n\n" + tracks_md(m, M[m]) for m in ORDER)
    return f"""---
title: "Electric Pianos Compared"
toc: true
toc-depth: 2
description: "The Fender Rhodes (Stage and Suitcase), Wurlitzer 200A, Clavinet D6, Yamaha CP-70 and Hohner Pianet as physical models with their own panels: play them, then turn a sound on one into another and read what carries over, what is close and what is lost."
instruments: [piano, other]
topics: [sound]
has: [interactive, svg]
---

Five electric pianos, five ways of making a note: a struck **tine**, a struck **reed**, a struck **string** held on an anvil,
real **piano strings**, and a plucked reed. Each is rebuilt here as a small physical model with its controls as on the real
instrument. {SOURCES_NOTE}

## The instruments

| Instrument | How it makes a note |
|---|---|
{rows}

## Play and compare

```{{=html}}
<div class="ik-box" data-kind="epiano" data-id="rhodes"><div class="epc" data-model="rhodes" data-to="wurli"></div></div>
```

**How to use it.** Pick an instrument and a riff and press **▶ Play**, or play the keys. **Panel** shows the real controls;
**Simple** shows every one as a slider, marked *on the panel*, *inside* (a service adjustment) or *this page's*.
**Turn into it** moves the sound to another instrument and lists every setting:
<span class="epc-tag epc-exact">the same</span>, <span class="epc-tag epc-approx">close</span> or
<span class="epc-tag epc-lost">lost</span>.

## How each one is modelled

- **Rhodes:** the tine's motion is a few decaying vibrations (its fundamental, the tonebar's, and two short, high bending modes:
  the bell). The pickup's magnetic field is strongest in the middle, so the output bends when the tine swings far: hit harder,
  or set the tine near the pickup's centre, and the tone gets **bark**.
- **Wurlitzer and Pianet:** a reed swinging nearer and further from a charged plate. The change is not the same on both sides,
  so loud notes gain even harmonics. The Wurlitzer's amplifier adds more.
- **Clavinet:** a string's harmonics, read by a pickup at one place along it. A pickup near the end hears more high harmonics.
  Two pickups together, or one reversed against the other, add or cancel harmonics. The tabs are filters.
- **CP-70:** two or three slightly mistuned strings per note, with sharpened overtones (stiff, short bass strings), and a pickup
  under the bridge instead of a soundboard.
- After the notes: amplifier drive, EQ, speaker, tremolo (on the Suitcase it pans left and right), volume.

All of the numbers are this page's choices, not measurements.

## Famous tracks

{allsteps}

## Meet each one

{chr(10).join(f"- [Meet the {M[m]['short']}](intro-{M[m]['slug']}.qmd)" for m in ORDER)}

{INC}
"""

def main():
    (ROOT / "lessons/epiano-compare.qmd").write_text(compare())
    for m in ORDER: (ROOT / f"lessons/intro-{M[m]['slug']}.qmd").write_text(intro(m))
    d = ROOT / "apps/shared/data/epianos"; d.mkdir(parents=True, exist_ok=True)
    vids = [dict(model=(st.get("model") or m), url=yt(v), title=t, channel=c, song=s, artist=a, does=does, start=st, riff=r)
            for m in ORDER for (v, t, c, s, a, does, st, r) in M[m]["tracks"]]
    (d / "assignments.json").write_text(json.dumps(dict(note="Famous electric piano tracks. Each confirmed 2026-11-26 by YouTube's oEmbed (title and channel as it gave them). `start` = a starting setting on this site's model (EPiano), the page's own.", videos=vids), indent=1, ensure_ascii=False) + "\n")
    print("wrote epiano-compare + %d intro pages, %d videos" % (len(ORDER), len(vids)))

if __name__ == "__main__": main()
