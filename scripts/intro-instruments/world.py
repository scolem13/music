#!/usr/bin/env python3
"""Writes the "Meet the ..." world-instrument lessons: lessons/intro-<slug>.qmd for the instruments of
lessons/world-instruments-compare.qmd (a sibling of drumkits.py). Each page: What you'll do, what it is, how it sounds, the drawing
(apps/shared/lessons/world-instruments.js: a FaithfulPanel drawing bound to the model; click it to play), a guided tour (▶ steps),
famous uses (apps/shared/data/world-instruments/tracks.json), a quiz, Next. Facts: scripts/sources/world-instruments.py.
    python3 scripts/intro-instruments/world.py [slugs...]   then   python3 scripts/works-cited.py
"""
import json, sys, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
def md(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return s
CARE = ("These are living traditions with their own teachers, names and ways of playing. The site's sound is a sketch from a few physics "
        "ideas, not the instrument; anything not from a source named on this page is marked unverified.")
JAW = ("**Jawari**: the string grazes a wide, curved bridge; as its swing dies, the touching point creeps up the bridge's slope, and that "
       "makes a long, moving buzz of overtones (Wikipedia, \"Tanpura\", \"Sitar\"). Here the upper partials **grow** while the lowest ones fade: "
       "the opposite of a guitar string. The amounts are the site's.")
P = {}
def inst(slug, item, name, other, what, sound, steps, quiz, desc): P[slug] = dict(item=item, name=name, other=other, what=what, sound=sound, steps=steps, quiz=quiz, desc=desc)
inst("sitar", "sitar", "the sitar", "tanpura",
  ["A long-necked lute of **Hindustani** (North Indian) classical music, known from the 18th century (Wikipedia, \"Sitar\").",
   "**6-7 played strings** run over **curved, movable frets**; the rest (often **13** on the instrumental style) are **sympathetic strings** (tarb, taraf) under the frets (Wikipedia).",
   "The main string is tuned a fourth above Sa; drone strings (chikari) give Sa and Pa (Wikipedia: the \"Kharaj Pancham\" tuning). The player retunes for each raga.", CARE],
  [JAW, "**Sympathetic strings** ring by themselves when a played note matches one of them (or one of its overtones): here 13 tuned to the raga's notes (which notes, in what order: the site's choice, unverified).",
   "**Meend**: pulling the main string sideways over a fret bends the note up, up to about seven semitones (Wikipedia)."],
  [dict(set={}, hit="fret:3", t="**A fretted note, jawari on.** Listen to the buzz bloom."), dict(set={"jawari": 0}, hit="fret:3", t="**Jawari off.** A plain, guitar-like pluck that only gets duller."),
   dict(set={"taraf": False}, hit="jod", t="**Sa, sympathetic strings damped.**"), dict(set={}, hit="jod", t="**Sa, sympathetic strings free.** The shimmer after the pluck."),
   dict(set={"meend": 3}, hit="fret:3", t="**Meend.** The same fret, the string pulled up three semitones."), dict(set={}, hit="taraf", t="**Strum the taraf.** The raga's notes, all at once."),
   dict(set={"raga": "malkauns"}, hit="fret:5", t="**Raga Malkauns.** The frets move (look at the drawing).")],
  [("What are the taraf?", ["The frets", "Sympathetic strings under the frets", "The gourds"], 1, "Wikipedia, \"Sitar\"."),
   ("What does the curved bridge (jawari) do to the sound over time?", ["Upper overtones bloom while the note dies", "Nothing", "It makes it duller faster"], 0, ""),
   ("Meend is…", ["A drum stroke", "Pulling the string to bend the note", "A tuning peg"], 1, "")],
  "A first look at the sitar: movable frets, the jawari bridge buzz, sympathetic strings tuned to the raga, meend. Click the drawing to play. Famous uses, quiz.")
inst("tanpura", "tanpura", "the tanpura", "sitar",
  ["A long-necked lute with **four strings** and **no frets**: the strings are always plucked at full length (Wikipedia, \"Tanpura\").",
   "It plays no melody: it holds the **drone** under a singer or player. Usual tuning **Pa-sa-sa-Sa** (5-8-8-1); **Ma** for ragas without Pa; **Dha** or **Ni** for ragas without Pa and shuddha Ma (Wikipedia).", CARE],
  [JAW, "A **cotton thread** (juari, jiva) between string and bridge moves the touching place and changes which overtones sing (Wikipedia). Turn **Thread** and listen.",
   "The four strings are plucked one after another, over and over (here 1-2-3-4 and a rest; the spacing is the site's, unverified)."],
  [dict(set={}, hit="s2", t="**One sa string.** The buzz grows after the pluck."), dict(set={"thread": 0.05}, hit="s2", t="**Thread near the front.** A lower band of overtones."),
   dict(set={"thread": 0.95}, hit="s2", t="**Thread moved back.** A higher band."), dict(set={"jawari": 0}, hit="s2", t="**No jawari.** Plain."),
   dict(set={}, hit="cycle", t="**One cycle of the four strings.**"), dict(set={}, hit="drone", t="**The drone, looping** (stops after 12 s, or press ■ Stop).")],
  [("The usual tanpura tuning?", ["Pa-sa-sa-Sa", "Sa-Re-Ga-Ma", "All four on Ni"], 0, "Wikipedia, \"Tanpura\"."),
   ("For a raga without Pa, the first string goes to…", ["Ma", "Re", "It is removed"], 0, "Wikipedia."), ("What does the cotton thread change?", ["Where the string touches the bridge: the overtones", "The pitch by an octave"], 0, "")],
  "A first look at the tanpura: four drone strings, Pa / Ma / Ni tunings, the jawari bridge and its cotton thread, the looping drone. Famous uses, quiz.")
inst("steel-pan", "tenorpan", "the steel pan (tenor)", "kalimba",
  ["From **Trinidad and Tobago**, developed in the 1930s-40s out of Carnival percussion (tamboo bamboo); made from 55-gallon oil drums from about 1947; the national instrument (Wikipedia, \"Steelpan\").",
   "The tenor (lead) pan's notes are laid out in **fourths and fifths**, Anthony Williams's arrangement, now the standard for lead pans (Wikipedia). The ring order and range drawn here (a low-C tenor, 29 notes) are unverified: makers differ.", CARE],
  ["Each note is a shaped area of the steel; the **bigger** the area, the **lower** the note (Wikipedia).",
   "Tuners tune not only the note but its **overtones**: fundamental, second and third partial (Wikipedia: Bertie Marshall and Alan Gervais). Here those are at **1 : 2 : 3** (the note, its octave, the octave and a fifth).",
   "A stroke near the edge of the area brings out the upper partials; a harder stick tip is brighter (the site's amounts)."],
  [dict(set={}, hit="note:0", t="**C4, centre.**"), dict(set={"place": "edge"}, hit="note:0", t="**Near the edge.** More octave and twelfth."),
   dict(set={"oct": 30}, hit="note:0", t="**Octave tuned 30 cents sharp.** It sounds sour: why tuners tune partials."), dict(set={"stick": "hard"}, hit="note:12", t="**C5, hard stick.**"),
   dict(set={}, hit="note:1", t="**G4: the next area round the ring is a fifth up.**")],
  [("Where does the steelpan come from?", ["Trinidad and Tobago", "Jamaica", "Ghana"], 0, "Wikipedia, \"Steelpan\"."), ("A pan note's tuned partials here are at…", ["1 : 2 : 3", "1 : 2.76 : 5.4"], 0, ""),
   ("Bigger note area:", ["Lower note", "Higher note"], 0, "Wikipedia.")],
  "A first look at the tenor steel pan: note areas in fourths and fifths, tuned partials at 1:2:3, strike place and stick. Click a note to play. Famous uses, quiz.")
inst("kalimba", "kalimba", "the kalimba", "mbira",
  ["Metal **tines** on a board or box, plucked with the thumbs: a **lamellophone** (Wikipedia, \"Mbira\").",
   "The name and design are **Hugh Tracey**'s (late 1950s), modelled on the Zimbabwean **mbira nyunga nyunga**; it spread the instrument outside Africa (Wikipedia). It is not the mbira, and the mbira is much older.",
   "17 tines here, in a major scale, **lowest in the centre**, going up **alternately left and right** (lowest-in-the-centre is common: Wikipedia; which side first: unverified)."],
  ["A tine is a clamped bar: its overtones are at about **6.3** and **17.5** times the note, **inharmonic**; they are strongest at the attack and die fast, leaving an almost pure tone (Wikipedia, \"Mbira\").",
   "Neighbouring tines vibrate a little too (Wikipedia). Shorter tine: higher note (here the lengths are drawn from the pitch)."],
  [dict(set={}, hit="tine:0", t="**The centre tine: the lowest.**"), dict(set={}, hit="tine:1", t="**One to the left: the next note up.**"), dict(set={}, hit="tine:2", t="**One to the right: the next.**"),
   dict(set={"buzz": True}, hit="tine:0", t="**With a buzzer.** (An mbira has them; this is a what-if.)"), dict(set={"tuning": "nyamaropa"}, hit="tine:6", t="**Retuned to Nyamaropa.** The seventh note drops.")],
  [("Who designed and named the kalimba?", ["Hugh Tracey", "Maurice White"], 0, "Wikipedia, \"Mbira\"."), ("Where is the lowest tine?", ["In the centre", "On the far left"], 0, ""),
   ("A tine's overtones are…", ["Inharmonic and short", "Exact harmonics that ring longest"], 0, "Wikipedia.")],
  "A first look at the kalimba: Hugh Tracey's design after the nyunga nyunga, tines from a low centre alternating left and right, inharmonic overtones. Famous uses, quiz.")
inst("mbira", "mbira", "the mbira dzavadzimu", "kalimba",
  ["The **mbira** is the instrument of the **Shona** people of Zimbabwe; the mbira dzavadzimu (\"voice of the ancestors\") is played at ceremonies (bira) and social gatherings and is held sacred (Wikipedia, \"Mbira\").",
   "**22-28 keys** on a hardwood board (gwariva) in **three registers**: two on the left, one on the right; **bottle caps or shells** (machachara) buzz; it is often played inside a **deze**, a calabash resonator (Wikipedia). In 2020 the craft of making and playing mbira/sansi in Malawi and Zimbabwe went on UNESCO's list (Wikipedia).", CARE],
  ["**Tunings** differ from family to family and do not sit on the piano's grid; **Nyamaropa** is close to Mixolydian, Katsanzaira to Dorian, Mavembe to Phrygian (Wikipedia). The site plays equal-tempered versions (unverified as mbira tunings).",
   "The **buzzers** rattle only while the board swings hard (a contact noise), so the buzz follows each pluck; the **deze** adds a low resonance and a longer ring (the site's amounts).",
   "Mbira music is often two interlocking parts, kushaura and kutsinhira (Wikipedia)."],
  [dict(set={}, hit="tine:3", t="**A left-hand bass key, buzzers on, in the deze.**"), dict(set={"buzz": False}, hit="tine:3", t="**Buzzers off.**"), dict(set={"deze": False}, hit="tine:3", t="**Out of the deze.**"),
   dict(set={}, hit="tine:16", t="**A right-hand key.**"), dict(set={"tuning": "katsanzaira"}, hit="tine:10", t="**Katsanzaira tuning.**")],
  [("Whose instrument is the mbira dzavadzimu?", ["The Shona of Zimbabwe", "Trinidad's steelbands"], 0, "Wikipedia, \"Mbira\"."), ("The machachara are…", ["Buzzers (bottle caps, shells)", "The keys"], 0, "Wikipedia."),
   ("The deze is…", ["A calabash resonator", "A tuning"], 0, "Wikipedia.")],
  "A first look at the Shona mbira dzavadzimu: 22 keys in three registers, Nyamaropa tuning, bottle-cap buzzers, the deze resonator. Famous uses, quiz.")

SCRIPTS = ["<script>window.SK_NO_BAR = true;</script>", '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">', '<link rel="stylesheet" href="/apps/shared/lessons/world-instruments.css">',
           '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/faithful-panel.js"></script>', '<script src="/apps/shared/lessons/world-instruments.js"></script>']
def page(slug, p):
    g = p["item"]
    o = ["---", "title: " + json.dumps("Meet " + p["name"]), "toc: true", "toc-depth: 2", "description: " + json.dumps(p["desc"]), "instruments: [other]", "topics: [gear]", "has: [interactive, svg]", "---", "",
         "A first stop before [World and Acoustic Instruments Compared](world-instruments-compare.qmd). Short sections, one idea each. Click a heading to fold or open it.", "",
         "::: {.ik-do}", "**What you'll do**", "", f"1. Read what {p['name']} is.", "2. Learn how it makes its sound.",
         "3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Look up famous uses.", "5. Check yourself with a short quiz.", ":::", "",
         "## What it is", ""] + ["- " + s for s in p["what"]] + ["", "## How it sounds", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## Play it", "", "Drawn after photos (proportions approximate, no logos). **Click the drawing** to play it, or use the buttons; turn the knobs. "
          "The grid under it shows the partials over time. The sound is the site's model, not recordings; nobody has compared it with the real instrument.", "",
          "```{=html}", f'<div class="wi" data-item="{g}"></div>', "```", "", "## Guided tour", "", "```{=html}"]
    for s in p["steps"]:
        o.append(f'<div class="wi-step" data-item="{g}" data-set="{J(s["set"])}" data-hit="{s["hit"]}"><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous uses", "", "Where a source ties the instrument to the record or player it is named; the links are YouTube searches (no video checked).", "",
          "```{=html}", f'<div class="wi-tracks" data-item="{g}"></div>', "```", "", "## Check yourself", "", "Click an answer. Nothing is saved or sent.", "", "```{=html}"]
    for q, ch, a, why in p["quiz"]:
        o.append(f'<div class="wi-q" data-a="{a}"><p><b>{html.escape(q)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="wi-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [World and Acoustic Instruments Compared](world-instruments-compare.html?a={g}&b={p['other']}): this one beside another, settings translated."]
    if g in ("sitar", "tanpura"): o.append("- [Ragas](ragas.qmd): the six ragas whose notes the frets and sympathetic strings use here.")
    if g in ("kalimba", "mbira"): o.append("- [Tuning systems](tuning-systems.qmd): tunings that are not the piano's.")
    o += ["", "```{=html}"] + SCRIPTS + ["```", ""]
    return "\n".join(o)

if __name__ == "__main__":
    for slug in sys.argv[1:] or list(P):
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(page(slug, P[slug]) + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
