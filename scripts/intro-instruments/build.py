#!/usr/bin/env python3
"""Writes the "Meet the Instruments" lessons: lessons/intro-<id>.qmd, one beginner page per synth, drum machine or sequencer.

Each page: What you'll do, what it is and when, its sound (one idea a line), the panel (the compare page's widget, compact, via
apps/shared/lessons/intro-kit.js), a guided tour (steps with a ▶ that sets a starting patch / pattern and plays it), famous records,
videos (from apps/shared/data/*/assignments.json), a self-check quiz, Next links. Facts: the compare pages' manuals and the Wikipedia
articles listed in scripts/sources/intro-instruments.py (read 2026-11-25). Edit the content here and rerun:
    python3 scripts/intro-instruments/build.py [ids...]
then python3 scripts/works-cited.py. Pages already written are overwritten (the Works Cited block is rewritten by works-cited.py).
"""
import json, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
J = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)

def vids(kind, mid):
    if kind == "synth":
        d = json.loads((ROOT / "apps/shared/data/synth-patches/assignments.json").read_text())
        return [(v["title"], v["channel"], v["url"]) for v in d["videos"] if v["synth"] == mid]
    if kind == "drum":
        d = json.loads((ROOT / "apps/shared/data/drum-patterns/assignments.json").read_text())
        return [(v["title"], v["channel"], v["url"]) for v in d["videos"] if v["machine"] == mid]
    d = json.loads((ROOT / "apps/shared/data/sequences/assignments.json").read_text())
    return [(v.get("title") or v["song"], v["channel"], v["url"]) for v in d["machines"].get(mid, [])]

# ---------- sequencer data helpers (same formats as SequencerCompare.blank) ----------
PC = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)
def t303(notes, times, bpm=124):
    p = []
    for tk in notes.split():
        n = tk.rstrip("as"); fl = tk[len(n):]
        midi = (int(n[-1]) + 1) * 12 + PC[n[0]] + (1 if "#" in n else 0); k = midi - 48; o = 0
        if k < 0: o, k = -1, k + 12
        elif k > 12: o, k = 1, k - 12
        p.append(dict(k=k, oct=o, acc="a" in fl, sl="s" in fl))
    while len(p) < 16: p.append(dict(k=0, oct=0, acc=False, sl=False))
    t = times.split(); return dict(bpm=bpm, pitch=p, time=t, last=len(t), trip=False)
def a960(A, B=None, mode=None, rate=8, rowB="none", C=None, rowC=False):
    return dict(bpm=120, base=36, A=A, B=B or [1] * 8, C=C or [0] * 8, xA=1, xB=1, xC=1, mode=mode or ["n"] * 8, rate=rate, rowC=rowC, rowB=rowB)
def m202(ch1, ch2=None, bpm=112):
    f = lambda l: [dict(n=n, st=st, gt=gt, acc=acc, po=po) for (n, st, gt, acc, po) in l]
    return dict(bpm=bpm, ch=[f(ch1), f(ch2 or [])])
def m4(chs, bpm=104):
    f = lambda l: [dict(cv1=a, cv2=b, st=st, gt=gt) for (a, b, st, gt) in l]
    chs = chs + [[]] * (4 - len(chs)); return dict(bpm=bpm, tb=120, cv2="cut", ch=[f(c) for c in chs])
def elk(trigs, steps=16, swing=50, bpm=122, loop=1):
    tr = trigs + [None] * (steps - len(trigs))
    return dict(bpm=bpm, steps=steps, speed=1, swing=swing, loop=loop, fill=False, def_=None, trigs=tr)
def E(**k): d = dict(type="n", note=36, vel=100, len=0.5, micro=0, cut=0.5); d.update(k); return d
def fixelk(d): d.pop("def_", None); d["def"] = dict(note=36, vel=100, len=0.5); return d

BASS = [36, 36, 48, 36, 39, 41, 43, 46]
P = {}

# ======================= SYNTHS =======================
P["model-d"] = dict(kind="synth", wid="moog", name="Minimoog Model D", short="Model D", year="1970",
 desc="A first look at the Minimoog Model D: what it is, how it sounds, a guided tour of its knobs using the manual's own patch sheets, the records it is on, and a short quiz.",
 what=["The **Minimoog Model D** is a synthesizer made by **Moog Music**, first sold in **1970** (Wikipedia, \"Minimoog\").",
       "Before it, synthesizers were big modular systems joined with patch cords. The Model D put the oscillators, filter and envelopes behind fixed switches in one box.",
       "The composer David Borden said it \"took the synthesizer out of the studio and put it into the concert hall\" (quoted in Wikipedia, \"Minimoog\").",
       "It plays **one note at a time**: it is a *monophonic* synth."],
 sound=["It has **three oscillators** on every note, so one key can sound thick or even like a chord (Model D manual, pp. 16-19).",
        "Its **ladder filter** takes away high harmonics at 24 dB per octave and can whistle when Emphasis is high (manual, pp. 29-31).",
        "Its output can be fed back into its own mixer, which **overloads** it and makes a growl (manual, pp. 27, 36).",
        "Two **contours** (envelopes) shape the filter and the loudness over time (manual, pp. 30-31)."],
 tour_intro="Each step loads one of the manual's own patch sheets (Moog Music, *Minimoog Model D* manual, pp. 55-76) onto the panel and plays a short bass line. Open **Show the patch sheet** to see the page's drawing of that sheet.",
 steps=[dict(sheet="sub-bass", t="**One oscillator, one wave.** *Sub Bass* (p. 68) uses only Oscillator 1, on its lowest 32' range, with the soft **triangle** wave. Listen for a deep, round, plain tone."),
        dict(sheet="kraft-bass", t="**Three oscillators together.** *Kraft Bass* (p. 56) turns all three oscillators on in the **Mixer** and also the **External input** (the feedback). Listen for how much thicker and dirtier it is than step 1."),
        dict(sheet="soft-rez-bass", t="**Close the filter, add Emphasis.** *Soft Rez Bass* (p. 70) sets the **Cutoff** low and **Emphasis** to 5. Listen for a soft tone with a little \"wow\" ring at the start of each note."),
        dict(sheet="bubble-bass", t="**The filter contour.** *Bubble Bass* (p. 63) sets the cutoff right down and the contour **Amount** high, with a long filter decay. Listen for each note opening up and closing again: a \"bubble\"."),
        dict(sheet="3-square-lead", t="**Glide.** *3-Square Lead* (p. 63) uses three square waves and turns **Glide** on. Listen for the pitch sliding from one note to the next."),
        dict(sheet="singing-wind", t="**Noise, no oscillators.** *Singing Wind* (p. 71) turns every oscillator off and the **Noise** on, with high Emphasis. Listen for wind that whistles at a pitch."),
        dict(sheet="hi-hat", t="**A short loudness contour.** *Hi-Hat* (p. 59) is noise with a very short **loudness decay**. Listen: a synth can make a drum sound too.")],
 records=["Sun Ra, *My Brother the Wind* (1970)", "Kraftwerk, *Autobahn* (1974) and *The Man-Machine* (1978)", "Parliament, \"Flash Light\""],
 rec_src="Wikipedia, \"Minimoog\"",
 quiz=[("How many oscillators does the Model D have on every note?", ["One", "Two", "Three", "Six"], 2, "Three oscillators, all on the same note (manual pp. 16-19)."),
       ("How many notes can it play at once?", ["One: it is monophonic", "Five", "Eight", "Sixteen"], 0, "It plays one note at a time."),
       ("You turn the Cutoff knob down. What do you hear?", ["Louder", "Darker: fewer high harmonics", "Higher pitch", "An echo"], 1, "The low-pass filter takes away high harmonics."),
       ("What does Glide do?", ["Slides the pitch from note to note", "Adds reverb", "Turns on the noise", "Plays chords"], 0, "Step 5: the pitch slides."),
       ("Which year did the Model D first go on sale?", ["1958", "1970", "1983", "1999"], 1, "1970 (Wikipedia).")],
 cites=["Minimoog_Model_D_Manual", "wiki/Minimoog)"], extra_next="- [The Model D patch sheets](synth-compare.qmd#the-model-d-patch-sheets): all 44 sheets from the manual, redrawn, to play and print.")

P["prophet-5"] = dict(kind="synth", wid="prophet", name="Prophet-5", short="Prophet-5", year="1978",
 desc="A first look at the Sequential Prophet-5: five voices, memory for every knob, a guided tour of its sounds, the records it is on, and a short quiz.",
 what=["The **Prophet-5** was made by **Sequential Circuits** (now Sequential), designed by Dave Smith and John Bowen, and first shipped in **1978** (Wikipedia, \"Sequential Prophet-5\").",
       "It has **five voices**: you can play five notes at once, so it plays chords. It is *polyphonic*.",
       "A small computer inside **remembers every knob**, so a sound can be saved and called back (Prophet-5 *Technical Manual*, section 2).",
       "Wikipedia: \"The Prophet-5 became a market leader and industry standard.\""],
 sound=["Each voice has **two oscillators**, A and B (Prophet-5 User's Guide, pp. 17-18).",
        "Oscillator A can be **synced** to B for a hard, cutting lead (guide, p. 18).",
        "Its 4-pole low-pass filter comes in two versions, Rev 1/2 and Rev 3 (guide, pp. 22-24).",
        "**Poly Mod** lets the filter envelope and oscillator B bend oscillator A for bell and metal sounds (guide, pp. 34-35)."],
 tour_intro="Each step loads one of the worked examples from the compare page (recipes from the Prophet-5 User's Guide) and plays it.",
 steps=[dict(ex="p5-bass", t="**A simple bass.** One oscillator, a short envelope. Listen for a clean, punchy low note."),
        dict(ex="p5-bass", set={"cutoff": 2.5, "res": 6}, t="**Filter down, resonance up.** The same bass with the **Cutoff** lower and **Resonance** at 6. Listen for a darker sound with a ring on top."),
        dict(ex="p5-brass", t="**Chords.** Synth brass played as chords: five voices at once. Listen for the little pitch blip at the start of each chord."),
        dict(ex="p5-strings", t="**A pad.** Slow attack and release on the loudness envelope. Listen for notes that fade in and fade away."),
        dict(ex="p5-sync", t="**Sync.** Oscillator A synced to B, with the filter envelope moving A's pitch. Listen for a bright, tearing lead (this is the \"Let's Go\" recipe from the guide)."),
        dict(ex="p5-unison", t="**Unison.** All five voices stacked on one note. Listen for a huge, thick bass.")],
 records=["The Cars, \"Let's Go\" and \"Shake It Up\" (Greg Hawkes)", "Phil Collins, \"In the Air Tonight\"", "Michael Jackson, *Thriller*", "Madonna, *Like a Virgin*"],
 rec_src="Wikipedia, \"Sequential Prophet-5\"",
 quiz=[("How many notes can a Prophet-5 play at once?", ["One", "Three", "Five", "Sixteen"], 2, "Five voices."),
       ("What was new about remembering the knobs?", ["Sounds could be saved and called back", "It made the synth louder", "It added drums", "It tuned itself to the radio"], 0, "Its microcomputer stores programs."),
       ("How many oscillators does each voice have?", ["One", "Two", "Three", "Six"], 1, "Oscillators A and B."),
       ("Unison means…", ["All voices stacked on one note", "Playing with a drummer", "No filter", "Only white keys"], 0, "Step 6.")],
 cites=["sequential-prophet-5-manual", "sequentialcircuitsprophet-5servicemanual", "Sequential_Prophet-5"])

P["tb-303"] = dict(kind="synth", wid="tb303", name="Roland TB-303", short="TB-303", year="1981",
 desc="A first look at the Roland TB-303 Bass Line: six knobs, accent and slide, a guided tour that builds an acid line knob by knob, the records it is on, and a short quiz.",
 what=["The **TB-303 Bass Line** was made by **Roland** and released in **1981** (Wikipedia, \"Roland TB-303\").",
       "It was meant to play bass lines for guitarists practising alone. It sold badly at first.",
       "But it \"became a foundation of electronic dance music genres such as acid house\" (Wikipedia).",
       "It has a built-in **sequencer** too: see [Meet the TB-303 pattern mode](intro-tb-303-seq.qmd)."],
 sound=["**One oscillator**, sawtooth or square: a switch picks (TB-303 manual, p. 34).",
        "**Six knobs**: Cut off freq, Resonance, Env mod, Decay, Accent and Tuning (manual, p. 34).",
        "**Accent** and **slide** are stored on each step of a pattern (manual, p. 89).",
        "Its filter is 24 dB per octave and does not whistle by itself (Wikipedia)."],
 tour_intro="Every step plays the same acid line. Only the knobs change, one at a time.",
 steps=[dict(ex="303-acid", set={"cutoff": 6, "res": 0, "envMod": 0, "accent": 0, "decay": 4}, t="**Plain.** Resonance, Env mod and Accent at 0. Listen: a plain buzzy saw bass."),
        dict(ex="303-acid", set={"cutoff": 2, "res": 0, "envMod": 0, "accent": 0}, t="**Cut off freq down.** Turn the **Cut off freq** to 2. Listen: darker and softer."),
        dict(ex="303-acid", set={"cutoff": 2, "res": 8, "envMod": 0, "accent": 0}, t="**Resonance up.** Turn **Resonance** to 8. Listen for a ringing, nasal tone."),
        dict(ex="303-acid", set={"cutoff": 2, "res": 8, "envMod": 8, "accent": 0, "decay": 3}, t="**Env mod up.** Turn **Env mod** to 8. Listen: each note now starts bright and closes quickly: the \"squelch\"."),
        dict(ex="303-acid", set={"cutoff": 2, "res": 8, "envMod": 8, "accent": 0, "decay": 8}, t="**Decay longer.** Turn **Decay** to 8. Listen: each note stays bright for longer."),
        dict(ex="303-acid", t="**Accent.** The example's own settings with **Accent** at 8. Listen for the accented notes jumping out, and the slides gliding."),
        dict(ex="303-square", t="**Square wave.** Flip the waveform switch to square. Listen: hollower and softer.")],
 records=["Charanjit Singh, *Synthesizing: Ten Ragas to a Disco Beat* (1982)", "Orange Juice, \"Rip It Up\" (1983)", "Phuture, \"Acid Tracks\" (1987)"],
 rec_src="Wikipedia, \"Roland TB-303\"",
 quiz=[("Which knob makes each note start bright and close quickly?", ["Tuning", "Env mod", "Volume", "Accent"], 1, "Env mod sends the envelope to the filter."),
       ("What two things are stored on a step besides pitch?", ["Accent and slide", "Reverb and delay", "Chords and lyrics", "Drums and bass"], 0, "Manual p. 89."),
       ("How many waveforms does it have?", ["One", "Two: saw and square", "Four", "Sixty-four"], 1, "A switch picks saw or square."),
       ("Which music grew up around the TB-303?", ["Acid house", "Baroque opera", "Bluegrass", "Barbershop"], 0, "Wikipedia.")],
 cites=["Roland_TB-303_Manual", "wiki/Roland_TB-303"])

P["juno"] = dict(kind="synth", wid="juno", name="Roland Juno-60 and Juno-106", short="Juno", year="1982",
 desc="A first look at Roland's Juno-60 and Juno-106: one oscillator a voice, the famous chorus, a guided tour, the records they are on, and a short quiz.",
 what=["The **Juno-60** was made by **Roland** and came out in **September 1982**; production ended in February 1984 (Wikipedia, \"Roland Juno-60\").",
       "It has **six voices** and **56 patch memories** (Juno-60 manual, p. 2). The **Juno-106** that followed has 128 patches and MIDI (Juno-106 manual, p. 1).",
       "Wikipedia says it \"had an immediate impact in 1980s pop music\"."],
 sound=["Each voice has **one oscillator** (a DCO), with saw, pulse, a **sub-oscillator** an octave down and noise (Juno-60 manual, pp. 12-13).",
        "**PWM**: the pulse wave's width can move with the LFO, which sounds like a group of strings (manual, pp. 12-13).",
        "The built-in **chorus** (I or II) makes one oscillator sound wide and thick (manual, p. 22). It became its signature sound (Wikipedia).",
        "A **high-pass filter** and a low-pass filter (manual, p. 14)."],
 tour_intro="Each step loads a worked example from the compare page and changes one thing.",
 steps=[dict(ex="juno-bass", set={"sub": False}, t="**Saw only.** One sawtooth oscillator. Listen: a simple bass."),
        dict(ex="juno-bass", t="**Add the sub-oscillator.** The **Sub osc** adds a square wave one octave down. Listen: much fuller and deeper."),
        dict(ex="juno-strings", set={"chorus": "off", "pwm": 0, "pwmMode": "man"}, t="**A plain pulse pad.** Pulse wave, chorus off, no PWM. Listen: thin and still."),
        dict(ex="juno-strings", set={"chorus": "off"}, t="**PWM by the LFO.** The pulse width now moves with the LFO. Listen for a slow shimmer."),
        dict(ex="juno-strings", set={"chorus": "I"}, t="**Chorus I.** Listen: the sound spreads out and gets wider."),
        dict(ex="juno-strings", t="**Chorus II.** The faster, deeper chorus. Listen: the classic thick Juno pad.")],
 records=["a-ha, \"Take On Me\"", "George Michael, \"A Different Corner\"", "Cyndi Lauper, \"Time After Time\""],
 rec_src="Wikipedia, \"Roland Juno-60\"",
 quiz=[("How many oscillators does each Juno voice have?", ["One", "Two", "Three", "Six"], 0, "One DCO, plus a sub-oscillator."),
       ("What does the chorus do to the sound?", ["Makes it wider and thicker", "Makes it one note at a time", "Adds drums", "Turns it off"], 0, "Steps 5 and 6."),
       ("The sub-oscillator plays…", ["One octave below", "One octave above", "A fifth above", "Only noise"], 0, "Step 2."),
       ("How many voices does the Juno-60 have?", ["One", "Five", "Six", "Sixteen"], 2, "Manual p. 2.")],
 cites=["Roland_Juno-60_Manual", "Roland_Juno-106_Manual", "wiki/Roland_Juno-60"])

P["arp-2600"] = dict(kind="synth", wid="arp2600", name="ARP 2600", short="ARP 2600", year="1971",
 desc="A first look at the ARP 2600: a semi-modular synth with patch cords, a ring modulator and sample and hold, a guided tour, the records it is on, and a short quiz.",
 what=["The **ARP 2600** was made by **ARP Instruments** from **1971** to 1981 (Wikipedia, \"ARP 2600\").",
       "It is **semi-modular**: its parts are already joined inside, but patch cords can join them in new ways (Wikipedia; ARP 2600 M manual, pp. 5-15).",
       "It was \"heavily marketed to high schools and universities\" (Wikipedia): it was made for learning."],
 sound=["**Three oscillators** (VCO-1, 2 and 3) (ARP 2600 M manual, pp. 7-9).",
        "A **ring modulator** multiplies two waves and makes bell and metal sounds (manual, p. 14).",
        "**Sample and hold** grabs a random voltage on each clock tick: the classic random \"bleeps\" (manual, p. 15).",
        "Its filter falls off at 24 dB per octave (ARP 2600 owner's manual, 1971, section 4.12)."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="arp-ring", set={"inRing": 0, "inV3": 8}, t="**A plain wave.** VCO-3's sawtooth into the filter. Listen: a simple tone."),
        dict(ex="arp-ring", t="**The ring modulator.** The filter now hears the ring modulator instead. Listen for a bell: notes that do not sound quite in tune."),
        dict(ex="arp-ring", set={"f2": 12}, t="**Move VCO-2.** VCO-2 a whole octave higher feeds the ring modulator. Listen: the bell's tone changes."),
        dict(ex="arp-sh", set={"res": 0}, t="**Sample and hold.** A patch cord sends the S/H output to VCO-3's pitch. Listen for random pitches, one per clock tick."),
        dict(ex="arp-sh", t="**Add resonance.** The same patch with **Resonance** at 6. Listen: each random note rings."),
        dict(ex="arp-sh", set={"shRate": 9}, t="**Faster clock.** S/H clock up to 9. Listen: the random notes come much faster.")],
 records=["Genesis, *A Trick of the Tail* and *...And Then There Were Three...* (Tony Banks)", "Black Sabbath, \"Who Are You?\" on *Sabbath Bloody Sabbath* (Ozzy Osbourne)", "Michael Jackson, \"Thriller\"", "Nine Inch Nails, \"The Becoming\" (Flood)"],
 rec_src="Wikipedia, \"ARP 2600\"",
 quiz=[("\"Semi-modular\" means…", ["Joined inside, but patch cords can change it", "It has no knobs", "It plays only drums", "It is a computer program"], 0, "Wikipedia; manual pp. 5-15."),
       ("Which part makes the random bleeps?", ["Sample and hold", "Reverb", "The keyboard", "The volume knob"], 0, "Steps 4-6."),
       ("A ring modulator is good for…", ["Bells and metal sounds", "A clean piano", "Silence", "Tuning"], 0, "Step 2."),
       ("Who was the ARP 2600 marketed to?", ["High schools and universities", "Only rock stars", "Churches", "Radio stations"], 0, "Wikipedia.")],
 cites=["arp-2600-m/manual", "korg.com/us/support/download/manual/0/842", "wiki/ARP_2600"])

P["ob-xa"] = dict(kind="synth", wid="obxa", name="Oberheim OB-Xa", short="OB-Xa", year="1980",
 desc="A first look at the Oberheim OB-Xa: eight voices, a 2- or 4-pole filter, sync and unison, a guided tour, the records it is on, and a short quiz.",
 what=["The **OB-Xa** was made by **Oberheim** and \"released in December 1980\" (Wikipedia, \"Oberheim OB-Xa\").",
       "It has up to **eight voices**, and can split the keyboard or double the voices (OB-Xa manual, p. 13).",
       "It used Curtis chips for its oscillators and filters, which made it cheaper to build and fix than Oberheim's earlier synths (Wikipedia)."],
 sound=["**Two oscillators** a voice, with **sync** (OB-Xa manual, p. 10).",
        "Its filter switches between **2-pole (12 dB)** and **4-pole (24 dB)** (manual, p. 11). 2-pole is brighter and softer.",
        "**Unison** stacks the voices on one note (manual, p. 8).",
        "Oberheim's older **SEM** module had a filter with low-pass, band-pass, high-pass and notch (Wikipedia, \"Oberheim SEM\"); the OB-Xa does not."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="ob-2pole", set={"pole4": True}, t="**4-pole brass pad.** The filter on 4-pole (24 dB). Listen: smooth and dark."),
        dict(ex="ob-2pole", t="**2-pole.** Flip to 2-pole (12 dB). Listen: brighter and more open: the famous Oberheim brass."),
        dict(ex="ob-sync", set={"uni": False, "sync": False, "fEnvO2": False}, t="**Two oscillators, no sync.** Oscillator 2 a fifth above. Listen: a plain lead."),
        dict(ex="ob-sync", set={"uni": False}, t="**Sync on.** Oscillator 2 synced, with the filter envelope moving its pitch (F-ENV → osc 2, manual p. 10). Listen for the tearing sweep."),
        dict(ex="ob-sync", t="**Unison.** Every voice on the same note. Listen: very big."),
        dict(ex="ob-sem-bp", t="**Not an OB-Xa: the SEM band-pass.** This filter mode is from the older SEM, not the OB-Xa. Listen: thin and nasal, low and high both cut.")],
 records=["Van Halen, \"Jump\" (1984)", "also used by Miles Davis, Prince and Queen"],
 rec_src="Wikipedia, \"Oberheim OB-Xa\"",
 quiz=[("How many voices can an OB-Xa have?", ["One", "Four", "Eight", "Thirty-two"], 2, "Manual p. 13."),
       ("Which filter setting is brighter?", ["2-pole (12 dB)", "4-pole (24 dB)", "They sound the same", "Neither"], 0, "Fewer poles take away less."),
       ("Which famous song has the OB-Xa as its main part?", ["Van Halen, \"Jump\"", "\"Happy Birthday\"", "Beethoven's Fifth", "\"Planet Rock\""], 0, "Wikipedia."),
       ("Band-pass, high-pass and notch are modes of…", ["The older SEM filter", "The OB-Xa filter", "The keyboard", "The LFO"], 0, "Step 6.")],
 cites=["Oberheim_OB-Xa_Manual", "wiki/Oberheim_OB-Xa", "Oberheim_SEM"])

P["ms-20"] = dict(kind="synth", wid="ms20", name="Korg MS-20", short="MS-20", year="1978",
 desc="A first look at the Korg MS-20: two screaming filters, a patch panel and a ring modulator, a guided tour, and a short quiz.",
 what=["The **MS-20** was made by **Korg** and released in **1978** (Wikipedia, \"Korg MS-20\").",
       "It is monophonic and **semi-modular**: it works without cords, and a **patch panel** changes it (MS-20 manual, pp. 6-7).",
       "Wikipedia: its \"flexibility led to its resurgence during the analog revival of the late 1990s.\""],
 sound=["**Two filters in a row**: a high-pass, then a low-pass (MS-20 manual, p. 5).",
        "Each has a **Peak** knob that goes up to self-oscillation, so the filters scream (manual, p. 5).",
        "VCO-2 can be a **ring modulator** for bells and clangs (manual, p. 5).",
        "Two envelope generators: EG 1 (delay, attack, release) and EG 2 (hold, attack, decay, sustain, release) (manual, pp. 6-7)."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="ms20-hot", set={"hPeak": 0, "lPeak": 0, "hCut": 0}, t="**Both peaks at 0.** A plain sawtooth through the filters. Listen: an ordinary lead."),
        dict(ex="ms20-hot", set={"hPeak": 0, "hCut": 0}, t="**Low-pass Peak up.** The **low-pass Peak** to 8. Listen for a loud whistle on top."),
        dict(ex="ms20-hot", set={"hPeak": 0}, t="**High-pass cutoff up.** The **high-pass** cuts the low end away. Listen: thinner."),
        dict(ex="ms20-hot", t="**High-pass Peak up too.** Both peaks high. Listen: the MS-20 scream."),
        dict(ex="ms20-ring", t="**The ring modulator.** VCO-2 on ring, with EG 1 sweeping the pitch. Listen for clanging bells.")],
 records=[], rec_src="Wikipedia, \"Korg MS-20\"",
 quiz=[("The MS-20's two filters are…", ["High-pass then low-pass", "Two reverbs", "Two drums", "Two keyboards"], 0, "Manual p. 5."),
       ("What does turning Peak right up do?", ["The filter whistles by itself", "The sound stops", "It plays chords", "It slows down"], 0, "Self-oscillation."),
       ("Where do patch cords go on the MS-20?", ["The patch panel", "The keyboard", "The battery", "Nowhere"], 0, "Manual pp. 6-7."),
       ("Which year did the MS-20 come out?", ["1958", "1978", "2008", "1998"], 1, "1978.")],
 cites=["korg.com/us/support/download/manual/0/131", "wiki/Korg_MS-20"])

P["dx7"] = dict(kind="synth", wid="dx7", name="Yamaha DX7", short="DX7", year="1983",
 desc="A first look at the Yamaha DX7: FM synthesis with six operators and no filter, a guided tour from a sine to a bell, the records it is on, and a short quiz.",
 what=["The **DX7** was made by **Yamaha** and came out in **1983** (Wikipedia, \"Yamaha DX7\").",
       "\"The DX7 was the first commercially successful digital synthesizer\" (Wikipedia).",
       "It has **16 voices** and **32 memories** (DX7 manual, introduction)."],
 sound=["It uses **FM**: one sine wave (a *modulator*) wobbles the pitch of another (a *carrier*) very fast, which makes new harmonics (DX7 manual, p. 23).",
        "It has **six operators** joined in one of **32 algorithms** (manual, p. 24).",
        "There is **no filter**: the sound changes when a modulator's **output level** changes (manual, pp. 34-35).",
        "Each operator has its own envelope of 4 rates and 4 levels (manual, p. 26)."],
 tour_intro="Each step loads a worked example and changes one thing. Learn more about FM in [Sound 8: FM](sound-fm.qmd).",
 steps=[dict(ex="dx7-saw", set={"o2l": 0}, t="**A sine wave.** Operator 1 alone (operator 2's level at 0). Listen: pure and plain."),
        dict(ex="dx7-saw", set={"o2l": 70}, t="**Add a little FM.** Operator 2's **output level** to 70. Listen: brighter, buzzier."),
        dict(ex="dx7-saw", t="**More FM.** Operator 2 at 99, the manual's first exercise (pp. 34-35). Listen: like a sawtooth, with no filter at all."),
        dict(ex="dx7-bell", t="**A bell.** The modulator at 3.5 times the carrier's frequency. Listen: a bell, because the harmonics are not in a row."),
        dict(ex="dx7-ep", t="**An electric-piano-like tine.** Two stacks of operators. Listen for the \"ding\" at the start of each note.")],
 records=["Prince, \"When Doves Cry\"", "a-ha, \"Take On Me\" (the \"Bass 1\" preset)", "Berlin, \"Take My Breath Away\" (the \"Bass 2\" preset)", "Brian Eno, *Apollo: Atmospheres and Soundtracks*"],
 rec_src="Wikipedia, \"Yamaha DX7\"",
 quiz=[("In FM, the operator that changes another's pitch is called…", ["The modulator", "The filter", "The mixer", "The drum"], 0, "Manual p. 23."),
       ("How does the DX7 make a sound brighter without a filter?", ["Turn a modulator's output level up", "Turn the reverb up", "Play faster", "It cannot"], 0, "Steps 1-3."),
       ("How many operators does it have?", ["Two", "Four", "Six", "Thirty-two"], 2, "32 is the number of algorithms."),
       ("What was the DX7 the first of?", ["Commercially successful digital synths", "Electric guitars", "Drum machines", "Radios"], 0, "Wikipedia.")],
 cites=["dx7-man.pdf", "wiki/Yamaha_DX7", "fm_core"])

P["ppg-wave"] = dict(kind="synth", wid="ppg", name="PPG Wave", short="PPG Wave", year="1981",
 desc="A first look at the PPG Wave: wavetables that move under an envelope or LFO, a guided tour, the artists who used it, and a short quiz.",
 what=["The **PPG Wave** was \"built by the German company Palm Products GmbH from 1981 to 1987\" (Wikipedia, \"PPG Wave\").",
       "Wolfgang Palm pioneered **wavetable synthesis**, the idea behind it (Wikipedia).",
       "The Wave 2.3 has eight voices (PPG *Wave 2.3 Service Manual*, p. 5)."],
 sound=["A **wavetable** is a row of 64 different waves; the Wave 2.3 has 30 of them (Sound On Sound, \"PPG Wave 2.3 & Waveterm B\").",
        "An envelope or LFO can **move through the table**, so the tone changes while a note plays.",
        "After the digital waves comes an **analog filter**, the SSM 2044, 24 dB per octave (service manual, p. 5; Wikipedia).",
        "The four tables on this page are the page's own, not the PPG's real ones."],
 tour_intro="Each step loads a worked example and changes one thing. Learn more in [Sound 9: Wavetable](sound-wavetable.qmd).",
 steps=[dict(ex="ppg-sweep", set={"envWave": 0}, t="**One wave, standing still.** Envelope 1 does not move the wave. Listen: a steady tone."),
        dict(ex="ppg-sweep", t="**The envelope moves the wave.** **Env 1 → wave** at 50. Listen: each note changes colour as it plays."),
        dict(ex="ppg-sweep", set={"waveA": 40, "waveB": 40, "envWave": 0}, t="**A different wave.** Start further along the table. Listen: a new tone."),
        dict(ex="ppg-pad", set={"lfoWave": 0}, t="**A pad, no LFO.** Listen: smooth and still."),
        dict(ex="ppg-pad", t="**The LFO moves the wave.** **LFO → wave** at 20. Listen for a slow, glassy shimmer.")],
 records=["used by a-ha, Alphaville, Bronski Beat and David Bowie"], rec_src="Wikipedia, \"PPG Wave\"",
 quiz=[("A wavetable is…", ["A row of different waves", "A table for a drum kit", "A mixing desk", "A guitar effect"], 0, "Sound On Sound."),
       ("What makes the tone move during a note?", ["An envelope or LFO moving through the table", "Turning the volume", "Changing the tempo", "Nothing"], 0, "Steps 2 and 5."),
       ("Which country was PPG from?", ["Germany", "Japan", "USA", "Brazil"], 0, "Wikipedia."),
       ("Is the PPG's filter digital or analog?", ["Analog (SSM 2044)", "Digital", "It has no filter", "Made of water"], 0, "Service manual p. 5.")],
 cites=["ppgmanuals", "wiki/PPG_Wave", "ppg-wave-23"])

# ======================= DRUM MACHINES =======================
P["tr-808"] = dict(kind="drum", wid="tr808", name="Roland TR-808", short="TR-808", year="1980",
 desc="A first look at the Roland TR-808 Rhythm Composer: its booming bass drum, claps and cowbell, a guided tour that builds a beat, the records it is on, and a short quiz.",
 what=["The **TR-808 Rhythm Composer** was made by **Roland** and released in **1980** (Wikipedia, \"Roland TR-808\").",
       "Its sounds are not recordings. Each drum is a small **circuit** that makes the sound (TR-808 Service Notes, pp. 5-6).",
       "Wikipedia: it \"became one of the most influential inventions in popular music.\""],
 sound=["The **bass drum** is a circuit that rings like a bell, then dies away. A long **Decay** makes the famous boom (service notes, pp. 5-6).",
        "The **snare** mixes two ringing circuits with noise; **Snappy** sets how much noise (service notes, pp. 5-6).",
        "The **hand clap** is filtered noise with a short burst and a longer tail (service notes, pp. 5-6).",
        "Patterns are written in **steps**: 16 steps to a bar (TR-808 owner's manual)."],
 tour_intro="Each step plays two bars of a beat. One thing is added or changed each time. Watch the lit step move along the grid.",
 steps=[dict(pat=dict(bpm=100, rows=dict(kick="x.......x......."), kit=dict(kick=dict(decay=3))), t="**Bass drum, short.** Bass drum on beats 1 and 3, **Decay** at 3. Listen: a tight thump."),
        dict(pat=dict(bpm=100, rows=dict(kick="x.......x......."), kit=dict(kick=dict(decay=9))), t="**Bass drum, long Decay.** Decay at 9. Listen for the long boom that rings like a note."),
        dict(pat=dict(bpm=100, rows=dict(kick="x.......x.....x.", snare="....x.......x..."), kit=dict(kick=dict(decay=9), snare=dict(snappy=3))), t="**Add the snare.** Snare on 2 and 4, **Snappy** low. Listen: more tone than noise."),
        dict(pat=dict(bpm=100, rows=dict(kick="x.......x.....x.", snare="....x.......x..."), kit=dict(kick=dict(decay=9), snare=dict(snappy=9))), t="**Snappy up.** Snappy at 9. Listen: the snare gets a bright, noisy rattle."),
        dict(pat=dict(bpm=100, rows=dict(kick="x.......x.....x.", clap="....x.......x...", chh="x.x.x.x.x.x.x.x."), kit=dict(kick=dict(decay=9))), t="**Clap and closed hi-hat.** The clap instead of the snare, hi-hats on every 8th note."),
        dict(pat=dict(bpm=112, rows=dict(kick="x.....x...x.....", clap="....x.......x...", chh="xxxxxxxxxxxxxxxx", cowbell="..x.....x.....x.", mconga=".......x.....x.."), kit=dict(kick=dict(decay=8))), t="**Cowbell and conga: electro.** 16th-note hats, cowbell and a conga. Listen for the sound of early 1980s electro."),
        dict(pat=dict(bpm=112, rows=dict(kick="x.....x...x.....", clap="....x.......x...", chh="xxxxxxxxxxxxxxxx"), acc="x...x...x...x...", accLevel=10, kit=dict(kick=dict(decay=8))), t="**Accent.** The 808 has one **accent** row for the whole step (service notes, p. 1). Listen: every beat is louder.")],
 records=["Marvin Gaye, \"Sexual Healing\" (1982)", "Afrika Bambaataa and the Soulsonic Force, \"Planet Rock\" (1982)", "Whitney Houston, \"I Wanna Dance With Somebody (Who Loves Me)\" (1987)", "Kanye West, *808s & Heartbreak* (2008)"],
 rec_src="Wikipedia, \"Roland TR-808\"",
 quiz=[("How does the 808 make its drum sounds?", ["With circuits", "With recordings of real drums", "With a microphone", "With a guitar"], 0, "Service notes pp. 5-6."),
       ("Which knob makes the bass drum boom for longer?", ["Decay", "Tempo", "Snappy", "Level"], 0, "Step 2."),
       ("Snappy changes how much ____ is in the snare.", ["Noise", "Bass", "Reverb", "Pitch"], 0, "Step 4."),
       ("How many steps are in a bar, usually?", ["4", "16", "64", "100"], 1, "Owner's manual."),
       ("Which record is famous for the 808?", ["\"Sexual Healing\"", "\"Für Elise\"", "\"Greensleeves\"", "\"Yesterday\""], 0, "Wikipedia.")],
 cites=["tr-808-service-notes", "manualsbase-id-576201", "wiki/Roland_TR-808"])

P["tr-909"] = dict(kind="drum", wid="tr909", name="Roland TR-909", short="TR-909", year="1983",
 desc="A first look at the Roland TR-909: punchy bass drum, sampled cymbals, shuffle and flam, a guided tour that builds a house beat, the records it is on, and a short quiz.",
 what=["The **TR-909** was made by **Roland** and came out in **1983** (Wikipedia, \"Roland TR-909\").",
       "Its drums are circuits like the 808's, but its **hi-hats and cymbals are samples** (Wikipedia).",
       "Wikipedia: \"the 909, alongside the TB-303 synthesizer, influenced dance music such as techno, house and acid.\""],
 sound=["The **bass drum** has **Attack** and **Decay** knobs (TR-909 manual, p. 8).",
        "**Accent** can be set per drum, plus a total accent (manual, p. 25).",
        "**Shuffle** has 7 settings that swing the beat; **flam** plays a drum twice, close together (manual, p. 26).",
        "It has **MIDI** (manual, p. 5)."],
 tour_intro="Each step plays two bars. One thing is added or changed each time.",
 steps=[dict(pat=dict(bpm=124, rows=dict(kick="x...x...x...x..."), kit=dict(kick=dict(attack=2, decay=5))), t="**Four on the floor.** Bass drum on every beat, **Attack** low. Listen: round."),
        dict(pat=dict(bpm=124, rows=dict(kick="x...x...x...x..."), kit=dict(kick=dict(attack=9, decay=5))), t="**Attack up.** Attack at 9. Listen: a sharper click on each kick."),
        dict(pat=dict(bpm=124, rows=dict(kick="x...x...x...x...", clap="....x.......x...", ohh="..x...x...x...x."), kit=dict(kick=dict(attack=7))), t="**Clap and open hi-hat.** Claps on 2 and 4, open hats between the beats. Listen: a house beat."),
        dict(pat=dict(bpm=124, rows=dict(kick="x...x...x...x...", clap="....x.......x...", ohh="..x...x...x...x.", chh=".x.x.x.x.x.x.x.x"), kit=dict(kick=dict(attack=7))), t="**Closed hats, no shuffle.** Shuffle at 1 (none). Listen: straight."),
        dict(pat=dict(bpm=124, shuffle=4, rows=dict(kick="x...x...x...x...", clap="....x.......x...", ohh="..x...x...x...x.", chh=".x.x.x.x.x.x.x.x"), kit=dict(kick=dict(attack=7))), t="**Shuffle 4.** The off-beat 16ths move late. Listen: it swings."),
        dict(pat=dict(bpm=124, rows=dict(kick="X...x...X...x...", chh=".x.x.x.x.x.x.x.x"), kit=dict(kick=dict(attack=7))), t="**Per-drum accent.** Accents on the bass drum only, on beats 1 and 3. Listen: those kicks are louder."),
        dict(pat=dict(bpm=128, rows=dict(kick="x...x...x...x...", chh="x.x.x.x.x.x.x.x.", snare=[0, 0, 0, 0, {"v": .75, "a": True}, 0, 0, 0, 0, 0, {"v": .75, "f": 4}, {"v": .75}, {"v": .75, "a": True, "f": 6}, {"v": .75, "f": 2}, {"v": .75, "a": True}, {"v": .75, "a": True}])), t="**Flams.** A snare fill where some hits are flams: two hits close together. Listen for the \"fl-am\".")],
 records=["Hiroshi Sato, *Sailing Blaster* (1984)", "Skinny Puppy, *Remission*", "Adamski, \"Killer\" (1990)"],
 rec_src="Wikipedia, \"Roland TR-909\"",
 quiz=[("Which 909 sounds are samples?", ["Hi-hats and cymbals", "Bass drum", "Snare", "None"], 0, "Wikipedia."),
       ("What does Shuffle do?", ["Moves the off-beats late so it swings", "Mixes up the order of drums", "Makes it louder", "Stops it"], 0, "Manual p. 26."),
       ("A flam is…", ["Two hits very close together", "A very long hit", "A kind of cymbal", "A tempo"], 0, "Manual p. 26."),
       ("Which styles did the 909 shape?", ["Techno and house", "Country", "Opera", "Folk"], 0, "Wikipedia.")],
 cites=["tr-909-owners-manual", "wiki/Roland_TR-909"])

P["linndrum"] = dict(kind="drum", wid="linn", name="LinnDrum", short="LinnDrum", year="1982",
 desc="A first look at the LinnDrum: recordings of real drums, levels per drum, swing timing A to F, a guided tour, the artists who used it, and a short quiz.",
 what=["The **LinnDrum** was made by **Linn Electronics**, designed by the American engineer **Roger Linn**, between **1982 and 1985** (Wikipedia, \"LinnDrum\").",
       "Its sounds are **recordings of real drums**, stored in chips (Wikipedia).",
       "It \"sold far more units than the Linn LM-1 and its successor, the Linn 9000, combined\" (Wikipedia)."],
 sound=["Some drums have **levels**: snare 3, and bass, hi-hat and others 2 (LinnDrum manual, p. 1).",
        "Only snare, sidestick, toms and congas can be **tuned**; \"all other drums are not tunable\" (manual, p. 1).",
        "**Timing A to F** adds swing: A is straight and E a perfect triplet shuffle (manual, pp. 8-9).",
        "On this page the sounds are stand-ins made to sound like 8-bit samples; they are not the real recordings."],
 tour_intro="Each step plays two bars. Numbers in a step are the LinnDrum's levels.",
 steps=[dict(pat=dict(bpm=104, rows=dict(kick="2.....2.2.......", snare="....2.......2...", chh="2.2.2.2.2.2.2.2.")), t="**A pop beat.** Bass, snare and 8th-note hi-hats, all at one level. Listen: real drum sounds, steady."),
        dict(pat=dict(bpm=104, rows=dict(kick="2.....2.2.......", snare="....3..1....3...", chh="2.1.2.1.2.1.2.1.")), t="**Levels.** Loud and soft hi-hats, and a quiet snare between. Listen: more human."),
        dict(pat=dict(bpm=104, timing="D", swingGrid=8, rows=dict(kick="2.....2.2.......", snare="....3..1....3...", chh="2.1.2.1.2.1.2.1.")), t="**Timing D.** Swing on the 8ths. Listen: it bounces."),
        dict(pat=dict(bpm=104, timing="E", swingGrid=8, rows=dict(kick="2.....2.2.......", snare="....3..1....3...", chh="2.1.2.1.2.1.2.1.")), t="**Timing E.** The perfect triplet shuffle (manual p. 9). Listen: a full shuffle. The manual says many people prefer C or D."),
        dict(pat=dict(bpm=104, rows=dict(kick="2.....2.2.......", snare="....3.......3...", chh="2.2.2.2.2.2.2.2."), kit=dict(snare=dict(tune=2))), t="**Tune the snare down.** Snare **Tune** low. Listen: a deeper, fatter snare."),
        dict(pat=dict(bpm=104, rows=dict(kick="2.....2.2.......", snare="....3.......3...", chh="2.2.2.2.2.2.2.2.", tamb="....2.......2...", clap="....1.......1...")), t="**Tambourine and claps.** Listen: the 1980s pop sound.")],
 records=["used by Trevor Horn, Mark Knopfler, George Michael and Naked Eyes"], rec_src="Wikipedia, \"LinnDrum\"",
 quiz=[("Where do LinnDrum sounds come from?", ["Recordings of real drums", "Circuits", "A guitar", "Voices"], 0, "Wikipedia."),
       ("Timing A is…", ["Straight (no swing)", "A full triplet shuffle", "Very fast", "Silent"], 0, "Manual p. 8."),
       ("Which LinnDrum drums can be tuned?", ["Snare, sidestick, toms, congas", "All of them", "None", "Only cymbals"], 0, "Manual p. 1."),
       ("Who designed it?", ["Roger Linn", "Robert Moog", "Dave Smith", "Ikutaro Kakehashi"], 0, "Wikipedia.")],
 cites=["linndrum-owners-manual", "wiki/LinnDrum"])

P["mpc60"] = dict(kind="drum", wid="mpc60", name="Akai MPC60", short="MPC60", year="1988",
 desc="A first look at the Akai MPC60: a sampler you play with pads, swing, and timing correct on or off, a guided tour, the artists who used MPCs, and a short quiz.",
 what=["The **MPC60** was made by **Akai**, designed by **Roger Linn**, and released on **8 December 1988** (Wikipedia, \"Akai MPC\").",
       "It is a **sampler**: you record any sound into it, then play it from **16 pads** (MPC60 manual, pp. 15, 18).",
       "Wikipedia: its affordability \"had a democratizing effect\": people could make tracks without a studio."],
 sound=["Samples are **12-bit at 40 kHz**, which gives a gritty sound (MPC60 manual, p. 15).",
        "The pads feel how hard you hit: **velocity** (manual, p. 5).",
        "**Swing** goes from 50 % (straight) to 75 %; 66 % is a triplet, and the manual suggests 54 % or 62 % (manual, p. 44).",
        "**Timing correct** moves notes onto the grid; turned off, the notes stay where you played them (manual, p. 43)."],
 tour_intro="Each step plays two bars. Letters in the hi-hat row are softer (a) to harder (z) hits.",
 steps=[dict(pat=dict(bpm=92, rows=dict(kick="x......x..x.....", snare="....x.......x...", chh="x.x.x.x.x.x.x.x.")), t="**On the grid.** Timing correct 1/16, swing 50 %. Listen: straight and tidy."),
        dict(pat=dict(bpm=92, rows=dict(kick="x......x..x.....", snare="....x.......x...", chh="t.h.t.h.t.h.t.h.")), t="**Velocity.** Hard and soft hi-hats. Listen: the hats breathe."),
        dict(pat=dict(bpm=92, swing=54, rows=dict(kick="x......x..x.....", snare="....x.......x...", chh="t.h.t.h.t.h.t.h.")), t="**Swing 54 %.** A little swing. Listen: it loosens."),
        dict(pat=dict(bpm=92, swing=62, rows=dict(kick="x......x..x.....", snare="....x.......x...", chh="t.h.t.h.t.h.t.h.")), t="**Swing 62 %.** More swing, the manual's other suggestion. Listen: a hip-hop bounce."),
        dict(pat=dict(bpm=92, swing=62, quant="OFF", rows=dict(kick=[{"v": 1}, 0, 0, 0, 0, 0, 0, {"v": .7, "o": 5}, 0, 0, {"v": .9, "o": -3}, 0, 0, 0, 0, 0], snare=[0, 0, 0, 0, {"v": .95, "o": 7}, 0, 0, 0, 0, 0, 0, 0, {"v": 1, "o": 9}, 0, 0, {"v": .45, "o": 4}], chh="t.h.t.h.t.h.t.h.")), t="**Timing correct OFF.** The snare and some kicks are played a little late, by hand. Listen: lazy and loose. J Dilla is known for turning quantize off (Wikipedia).")],
 records=["DJ Shadow, *Endtroducing* (1996), made on an MPC60 MKII", "J Dilla, known for turning off the quantize", "Kanye West, much of *The College Dropout* (2004), on an MPC (model not named)"],
 rec_src="Wikipedia, \"Akai MPC\"",
 quiz=[("A sampler plays…", ["Sounds you recorded into it", "Only built-in circuits", "Only piano", "Nothing"], 0, "Manual p. 15."),
       ("Swing 50 % means…", ["Straight, no swing", "A full triplet", "Half speed", "Half volume"], 0, "Manual p. 44."),
       ("Timing correct OFF keeps…", ["Notes where you played them", "Every note on the grid", "Only the kick", "The tempo at 50"], 0, "Manual p. 43."),
       ("How many pads does it have?", ["4", "8", "16", "88"], 2, "Manual p. 18.")],
 cites=["akai-mpc60-manual", "wiki/Akai_MPC"])

# ======================= SEQUENCERS =======================
berlinA = [0, 1, 0.58, 0.25, 0, 1.25, 0.83, 0.58]
P["960"] = dict(kind="seq", wid="a960", name="the analog step sequencer (Moog 960 style)", short="960-style sequencer", year="1970s",
 desc="A first look at the analog step sequencer after the Moog 960: three rows of eight knobs, stages that skip or stop, a guided tour of a Berlin School loop, and a short quiz.",
 what=["An **analog step sequencer** plays a loop of **stages**. Each stage has a knob that sets a voltage, and the voltage sets the pitch.",
       "The Moog 960 had **3 rows of 8 stages** (Synthesizers.com Q960 data sheet, p. 1; the Q960 is \"functionally equivalent to the Moog 960\", p. 5).",
       "Analog sequencers made \"repeated minimalistic phrases\" (Wikipedia, \"Music sequencer\").",
       "No Moog 960 manual was found, so this machine is built from the Q960 data sheet."],
 sound=["The knobs send **1 volt per octave**: one volt higher is one octave up (Q960 sheet, p. 3).",
        "Each stage can be **Normal**, **Skip** or **Stop** (Q960 sheet, p. 3).",
        "A clock moves from stage to stage; turn it up and the loop runs faster.",
        "On this page the sound is one shared simple voice, not a model of any Moog."],
 tour_intro="Each step sets the eight knobs of row A (and the other rows) and plays the loop twice.",
 steps=[dict(seq=a960([0] * 8), t="**Every stage the same.** All eight knobs of row A at 0 volts. Listen: one note, eight times."),
        dict(seq=a960(berlinA), t="**Turn the knobs.** Each stage set to a different voltage. Listen: a looping eight-note tune."),
        dict(seq=a960(berlinA, mode=["n", "n", "n", "s", "n", "n", "s", "n"]), t="**Skip two stages.** Stages 4 and 7 set to **Skip**. Listen: the loop is now six notes long."),
        dict(seq=a960(berlinA, rate=12), t="**Faster clock.** The clock rate up. Listen: the same loop, quicker."),
        dict(seq=a960(berlinA, B=[1.6, 0.4, 0.8, 0.4, 1.6, 0.4, 1.0, 0.4], rowB="cut"), t="**Row B on the filter.** Row B now opens and closes the filter on each stage. Listen: some notes bright, some dark: the Berlin School sound."),
        dict(seq=a960([0, 0.58, 1, 0.83, 0.58, 0.42, 0.25, 0.17], C=[0, 1, 1, 0, 1, 1, 2, 2], rowC=True, rate=100 / 30), t="**Row C on timing.** Each volt on row C doubles the clock for that stage (Q960 sheet, p. 4). Listen: long and short notes.")],
 records=["Donna Summer, \"I Feel Love\" (1977): almost all made with a Moog (Wikipedia, \"Moog synthesizer\")", "Tangerine Dream used the Moog (Wikipedia, \"Moog synthesizer\")"],
 rec_src="Wikipedia, \"Moog synthesizer\" (which does not say which sequencer was used)",
 quiz=[("Each stage's knob sets…", ["A voltage, which sets the pitch", "The tempo of the song", "The reverb", "The lyrics"], 0, "Q960 sheet p. 3."),
       ("A stage set to Skip…", ["Is left out of the loop", "Plays twice", "Plays louder", "Stops the machine"], 0, "Step 3."),
       ("One volt higher is…", ["One octave up", "One semitone up", "Louder", "Slower"], 0, "1 V per octave."),
       ("How many stages in a row?", ["4", "8", "16", "128"], 1, "Three rows of eight.")],
 cites=["q960data", "Music_sequencer", "wiki/Moog_synthesizer"], compare_q="seq=a960")

acid = t303("C2 C3a C2 D#2s F2 C2a G2 A#2s C3 G2 D#2a C2", "n n t n n n n r n n n t n n r n")
plain = t303("C2 C3 C2 D#2 F2 C2 G2 A#2 C3 G2 D#2 C2 C2 C2 C2 C2", "n n n n n n n n n n n n n n n n")
rests = t303("C2 C3 C2 D#2 F2 C2 G2 A#2 C3 G2 D#2 C2", "n n t n n n n r n n n t n n r n")
accs = t303("C2 C3a C2 D#2 F2 C2a G2 A#2 C3 G2 D#2a C2", "n n t n n n n r n n n t n n r n")
P["tb-303-seq"] = dict(kind="seq", wid="tb303", name="the TB-303's pattern mode", short="TB-303 pattern mode", year="1981",
 desc="A first look at programming the Roland TB-303: pitch mode, then time mode, then accents and slides, a guided tour that builds an acid line, and a short quiz.",
 what=["The **TB-303** (Roland, 1981; Wikipedia, \"Roland TB-303\") has its own sequencer. A pattern is written in two passes.",
       "First, **pitch mode**: press the notes in order. Then **time mode**: say for each step if it is a note, a tie or a rest (TB-303 manual, pp. 4-5, 15).",
       "A pattern stores **pitch, length of note, accent and slide** (manual, pp. 4-5).",
       "For its sound, see [Meet the TB-303](intro-tb-303.qmd)."],
 sound=["The basic unit is the **sixteenth note**; a pattern has up to 16 steps (manual, p. 5).",
        "**Accent** makes a step louder and brighter; **slide** glides into the next note (manual, pp. 41-43).",
        "It stores **64 patterns** and 7 tracks (manual, pp. 11, 23).",
        "Here the voice is the page's own shared voice, not a model of the 303."],
 tour_intro="Each step plays the same notes and adds one thing.",
 steps=[dict(seq=plain, t="**Pitch mode only.** Every step a note, no accents, no slides. Listen: a steady line of 16ths."),
        dict(seq=rests, t="**Time mode: ties and rests.** Some steps are ties (the note held) or rests. Listen: the rhythm appears."),
        dict(seq=accs, t="**Accents.** Three notes accented. Listen: they jump out."),
        dict(seq=acid, t="**Slides.** Two notes slide into the next. Listen for the glide: the acid line is done."),
        dict(seq=dict(acid, last=8), t="**Last step at 8.** Only the first 8 steps play. Listen: a shorter loop.")],
 records=["Phuture, \"Acid Tracks\" (1987)", "Charanjit Singh, *Synthesizing: Ten Ragas to a Disco Beat* (1982)"], rec_src="Wikipedia, \"Roland TB-303\"",
 quiz=[("In which order do you write a 303 pattern?", ["Pitch mode, then time mode", "Time mode, then pitch mode", "Both at once", "With a microphone"], 0, "Manual pp. 4-5."),
       ("Time mode says whether a step is…", ["A note, tie or rest", "Loud or soft", "Major or minor", "Fast or slow"], 0, "Manual p. 15."),
       ("A slide…", ["Glides into the next note", "Stops the pattern", "Changes the drum", "Adds reverb"], 0, "Step 4."),
       ("The basic step is a…", ["Sixteenth note", "Whole note", "Half note", "Bar"], 0, "Manual p. 5.")],
 cites=["tb-303-owners-manual", "TB-03_eng03", "wiki/Roland_TB-303"], compare_q="seq=tb303")

line = [(36, 12, 6, False, False), (36, 6, 3, False, False), (48, 6, 3, False, False), (46, 12, 6, False, False), (43, 12, 6, False, False), (39, 6, 3, False, False), (41, 6, 3, False, False), (43, 12, 6, False, False), (36, 24, 6, False, False)]
def mod(l, f): return [f(i, x) for i, x in enumerate(l)]
P["mc-202"] = dict(kind="seq", wid="mc202", name="Roland MC-202", short="MC-202", year="1983",
 desc="A first look at the Roland MC-202 MicroComposer: step time and gate time, accent and portamento on two channels, a guided tour, and a short quiz.",
 what=["The **MC-202** was made by **Roland** in **1983** (Wikipedia, \"Roland MC-202\").",
       "Wikipedia: \"It was the first groovebox.\" It has a small synth inside and a sequencer.",
       "It has **2 channels**, holds about 2600 steps and can save to tape (MC-202 manual, p. 5)."],
 sound=["Each note has a **step time** (how long until the next note) and a **gate time** (how long the note sounds) (manual, p. 10).",
        "A quarter note is **24**; the default step is 24 and gate 12 (manual, pp. 15-16).",
        "A gate of 0 is a **rest** (manual, p. 19).",
        "**Accent** and **portamento** (glide) are stored with the notes (manual, pp. 5, 29)."],
 tour_intro="Each step plays the same bass line and changes one thing. Numbers are in 24ths of a beat.",
 steps=[dict(seq=m202(line), t="**Short gates.** Every gate half the step. Listen: bouncy, detached notes."),
        dict(seq=m202(mod(line, lambda i, x: (x[0], x[1], x[1] - 1, False, False))), t="**Long gates.** Each gate almost as long as its step. Listen: smooth, joined notes."),
        dict(seq=m202(mod(line, lambda i, x: (x[0], x[1], x[2], i in (0, 4, 8), False))), t="**Accents.** Notes 1, 5 and 9 accented. Listen: they punch."),
        dict(seq=m202(mod(line, lambda i, x: (x[0], x[1], x[1] - 1 if i in (2, 6) else x[2], i in (0, 4, 8), i in (3, 7)))), t="**Portamento.** Notes 4 and 8 glide in from the note before. Listen for the slides."),
        dict(seq=m202(mod(line, lambda i, x: (x[0], x[1], x[2], i in (0, 4, 8), False)), [(67, 48, 44, False, False), (70, 24, 22, False, False), (72, 24, 22, False, True)]), t="**Channel 2.** A held line on the second channel above the bass. Listen: two parts at once.")],
 records=[], rec_src="Wikipedia, \"Roland MC-202\"",
 quiz=[("Gate time is…", ["How long the note sounds", "How long until the next note", "The tempo", "The volume"], 0, "Manual p. 10."),
       ("On the MC-202 a quarter note is…", ["24", "4", "120", "16"], 0, "Manual p. 15."),
       ("A gate of 0 is…", ["A rest", "The loudest note", "A slide", "An error"], 0, "Manual p. 19."),
       ("Wikipedia calls the MC-202 the first…", ["Groovebox", "Synthesizer", "Drum machine", "Computer"], 0, "Wikipedia.")],
 cites=["mc-202-owners-manual", "wiki/Roland_MC-202"], compare_q="seq=mc202")

four = [(0, 40, 30, 15), (3, 40, 30, 15), (7, 40, 30, 15), (10, 40, 30, 15), (12, 60, 30, 15), (10, 60, 30, 15), (7, 60, 30, 15), (3, 60, 30, 15)]
P["mc-4"] = dict(kind="seq", wid="mc4", name="Roland MC-4 MicroComposer", short="MC-4", year="1981",
 desc="A first look at the Roland MC-4 MicroComposer: music typed in as numbers, a time base of 120 a beat, four CV channels, a guided tour, the records it is on, and a short quiz.",
 what=["The **MC-4 MicroComposer** was released by **Roland** in **1981** (Wikipedia, \"Roland MC-4 Microcomposer\").",
       "Music is **typed in as numbers** on a keypad: a number for the pitch, the step time and the gate time (MC-4 manual, pp. 9-10).",
       "Vince Clarke used it because, as Wikipedia puts it, \"The whole theory behind programming with the MC-4 was better timing.\"",
       "Its memory is lost when the power goes off, so songs are saved to cassette (manual, pp. 19, 22)."],
 sound=["Keys are **numbered** by counting up the keyboard (manual, p. 9).",
        "The **time base** is 120 a beat, so a 16th note is **30** (manual, p. 10).",
        "**CV-1** is the pitch; **CV-2** can go to the filter, the loudness or anything else (manual, p. 11).",
        "It has **four channels** (manual, p. 11)."],
 tour_intro="Each step plays a line typed as numbers: pitch, CV-2, step and gate.",
 steps=[dict(seq=m4([four]), t="**16ths: step 30, gate 15.** Each note a 16th, sounding half its length. Listen: crisp."),
        dict(seq=m4([[(a, b, st, 28) for (a, b, st, g) in four]]), t="**Gate 28.** Almost the whole step. Listen: smooth."),
        dict(seq=m4([[(a, b, 40, 20) for (a, b, st, g) in four[:6]]]), t="**Triplets: step 40.** 120 ÷ 3 = 40. Listen: three notes a beat."),
        dict(seq=m4([[(a, b, 45 if i % 2 == 0 else 15, 30 if i % 2 == 0 else 10) for i, (a, b, st, g) in enumerate(four)]]), t="**Swing: 45 + 15.** Long, short, long, short. Listen: it swings, exactly."),
        dict(seq=m4([[(a, 20 + 10 * i, 30, 15) for i, (a, b, st, g) in enumerate(four)]]), t="**CV-2 on the filter.** CV-2 rises note by note. Listen: the line gets brighter."),
        dict(seq=m4([four, [(27, 50, 240, 230)], [(31, 50, 240, 230)], [(36, 50, 120, 110), (38, 50, 120, 110)]]), t="**Four channels.** Three more channels hold notes above. Listen: four parts.")],
 records=["Yazoo, *Upstairs at Eric's* (1982) (Vince Clarke)", "Erasure, *Chorus* (1991) (Vince Clarke)", "also used by Kraftwerk, Depeche Mode, The Human League and Yellow Magic Orchestra"],
 rec_src="Wikipedia, \"Roland MC-4 Microcomposer\"",
 quiz=[("How do you put music into the MC-4?", ["Type numbers on a keypad", "Sing into it", "Draw with a pen", "Play a guitar"], 0, "Manual pp. 9-10."),
       ("With a time base of 120, a 16th note is…", ["30", "120", "16", "60"], 0, "120 ÷ 4 = 30."),
       ("CV-1 controls…", ["The pitch", "The tempo", "The lights", "The tape"], 0, "Manual p. 11."),
       ("What happens to its memory when the power goes off?", ["It is lost, so save to cassette", "It is kept for ever", "It plays louder", "It prints"], 0, "Manual pp. 19, 22.")],
 cites=["mc-4-owners-manual", "Roland_MC-4"], compare_q="seq=mc4")

base = [E(note=36), None, E(note=48), None, E(note=36), None, E(note=46), None, E(note=39), None, E(note=41), E(note=43), None, None, E(note=36), None]
def em(f): return [None if t is None else dict(t, **f(i, t)) for i, t in enumerate(base)]
P["digitakt"] = dict(kind="seq", wid="elektron", name="the Elektron-style trig sequencer (Digitakt II)", short="Elektron-style sequencer", year="2024",
 desc="A first look at an Elektron-style trig sequencer after the Digitakt II: trigs, parameter locks, micro timing, trig conditions, a guided tour, and a short quiz.",
 what=["**Elektron** is a company from Gothenburg, Sweden (Wikipedia, \"Elektron (company)\"). The **Digitakt II** came out in **2024** (Wikipedia).",
       "Its sequencer has a row of steps; a step with a note on it is a **trig** (Digitakt II manual, p. 41).",
       "**Parameter locks** let one step change a setting just for itself (manual, p. 47). Elektron started them on the 2002 Machinedrum (Wikipedia).",
       "Elektron users named by Wikipedia include Thom Yorke, Sophie and Depeche Mode."],
 sound=["A **note trig** plays a note; a **lock trig** changes settings without playing (manual, p. 41).",
        "**Micro timing** pushes one trig a little early or late (manual, p. 45).",
        "**Trig conditions** play a trig only on some loops, such as 1:2 = loops 1, 3, 5 … (manual, p. 48).",
        "**Swing** runs from 51 % to 80 % (manual, p. 23)."],
 tour_intro="Each step plays one bar twice (two loops) and adds one thing.",
 steps=[dict(seq=fixelk(elk(em(lambda i, t: {}))), t="**Note trigs.** Nine trigs on 16 steps. Listen: a plain line."),
        dict(seq=fixelk(elk(em(lambda i, t: {"cut": [0.2, 0.9, 0.3, 0.7, 0.5, 0.8, 0.4, 0.6, 0.25][[0, 2, 4, 6, 8, 10, 11, 14].index(i) if i in (0, 2, 4, 6, 8, 10, 11, 14) else 0]}))), t="**Parameter locks.** Each trig locks its own filter cutoff. Listen: every note a different brightness."),
        dict(seq=fixelk(elk(em(lambda i, t: {"micro": 9 if i in (4, 10) else 0})))	, t="**Micro timing.** Two trigs pushed late. Listen: a lazy, human feel."),
        dict(seq=fixelk(elk(em(lambda i, t: {"cond": "1:2"} if i in (6, 11) else {}))), t="**Trig condition 1:2.** Two trigs play only on loop 1 of every 2. Listen: the second time round they are missing."),
        dict(seq=fixelk(elk(em(lambda i, t: {}), swing=66)), t="**Swing 66 %.** Listen: the off-beat 16ths move late."),
        dict(seq=fixelk(elk([E(note=n) for n in (36, 48, 36, 43, 46, 36, 51, 48, 39, 36, 43, 36)], steps=12)), t="**12 steps.** The track is only 12 steps long. Listen: a loop that does not fit 4/4 the usual way.")],
 records=["Elektron users named by Wikipedia: Panda Bear, Thom Yorke, Sophie, the Knife, Timbaland, Depeche Mode"], rec_src="Wikipedia, \"Elektron (company)\"",
 quiz=[("A parameter lock…", ["Changes a setting on one step only", "Locks the machine", "Stops the tempo", "Saves to tape"], 0, "Manual p. 47."),
       ("Trig condition 1:2 plays on…", ["Loops 1, 3, 5 …", "Every loop", "No loops", "Only loop 2"], 0, "Manual p. 48."),
       ("Micro timing moves a trig…", ["A little early or late", "To another song", "An octave up", "Into the reverb"], 0, "Manual p. 45."),
       ("A lock trig…", ["Changes settings without playing a note", "Plays the loudest note", "Ends the pattern", "Is a drum"], 0, "Manual p. 41.")],
 cites=["download-support-digitakt-ii", "Elektron_(company)"], compare_q="seq=elektron")

# ======================= SIX MORE SYNTHS (added after the compare page grew to 15) =======================
P["prophet-6"] = dict(kind="synth", wid="p6", name="Prophet-6", short="Prophet-6", year="2015",
 desc="A first look at the Sequential Prophet-6: six analog voices, shapes between waves, a high-pass and a low-pass filter, two effects, a guided tour, and a short quiz.",
 what=["The **Prophet-6** was released by Sequential (then called Dave Smith Instruments) in **2015** (Wikipedia, \"Sequential (company)\").",
       "It has **six voices** (Prophet-6 Operation Manual, p. 1). It is a modern relative of the [Prophet-5](intro-prophet-5.qmd)."],
 sound=["Each oscillator's **shape** turns smoothly from triangle to saw to pulse (manual, pp. 15-17).",
        "A **sub-octave** sits one octave below oscillator 1 (manual, p. 19).",
        "It has two filters: a 4-pole **low-pass** and a 2-pole **high-pass** (manual, pp. 20-23).",
        "Two **digital effects** in a row: chorus, phaser, delay and reverbs (manual, pp. 26-28); also an analog **distortion** (p. 41)."],
 tour_intro="Each step loads a worked example (recipes from the Prophet-6 manual) and changes one thing.",
 steps=[dict(ex="p6-pad-fx", set={"fxOn": False}, t="**A pulse pad, dry.** Effects off. Listen: a plain, moving pad."),
        dict(ex="p6-pad-fx", t="**Effects on.** Chorus in slot A, hall reverb in slot B. Listen: wide and far away."),
        dict(ex="p6-sync", t="**Sync and Poly Mod.** The filter envelope sweeps oscillator 1's pitch. Listen for a tearing lead."),
        dict(ex="p6-gated", t="**LFO on the loudness.** A square LFO turns the sound on and off. Listen: a chopped organ."),
        dict(ex="p6-unison", set={"dist": 0}, t="**Unison bass.** All six voices on one note, no distortion. Listen: thick."),
        dict(ex="p6-unison", t="**Add distortion.** Distortion at 3. Listen: grittier.")],
 records=[], rec_src="Wikipedia, \"Sequential (company)\"",
 quiz=[("How many voices does the Prophet-6 have?", ["One", "Five", "Six", "Sixteen"], 2, "Manual p. 1."),
       ("Its two filters are…", ["Low-pass and high-pass", "Two reverbs", "Band-pass and notch", "None"], 0, "Manual pp. 20-23."),
       ("Which part of the Prophet-6 is digital?", ["The effects", "The oscillators", "The filters", "The keys"], 0, "Manual pp. 26-28."),
       ("Oscillator shape can be…", ["Anywhere between triangle, saw and pulse", "Only sine", "Only noise", "A drum"], 0, "Manual pp. 15-17.")],
 cites=["prophet-6/manual", "Sequential_(company)"])

P["taurus"] = dict(kind="synth", wid="taurus", name="Moog Taurus", short="Taurus", year="1975",
 desc="A first look at the Moog Taurus bass pedals: a synth you play with your feet, a guided tour of its few knobs, the bands who used it, and a short quiz.",
 what=["The **Taurus** is \"a foot-operated analog synthesizer\" by **Moog Music**; the Taurus I was made from **1975** to 1981 (Wikipedia, \"Moog Taurus\").",
       "You play it on **pedals**, like an organ's, so your hands stay free for keyboards or guitar (Wikipedia).",
       "The Taurus III of 2010 closely follows the first one (Wikipedia)."],
 sound=["**Two oscillators**, both sawtooth; **Beat** detunes the second one (Taurus 205A manual, PDF pp. 3, 6).",
        "A 24 dB low-pass **filter** with its own contour: attack, decay and amount (manual, PDF pp. 3-6).",
        "**Glide** slides from note to note (manual, PDF p. 5).",
        "It plays one note at a time."],
 tour_intro="Each step loads the pedal-bass example and changes one knob.",
 steps=[dict(ex="taurus-bass", set={"beat": 0, "mixB": 0}, t="**One oscillator.** Oscillator B off. Listen: a plain bass."),
        dict(ex="taurus-bass", t="**Add Beat.** Oscillator B on and slightly detuned. Listen: it wobbles and gets fatter."),
        dict(ex="taurus-bass", set={"cAmt": 0}, t="**No filter contour.** Contour amount at 0. Listen: dull, no movement."),
        dict(ex="taurus-bass", set={"cAmt": 9, "emph": 6}, t="**More contour and Emphasis.** Listen: each note opens with a \"bwow\"."),
        dict(ex="taurus-bass", set={"glideOn": True, "glide": 6}, t="**Glide.** Listen: notes slide into each other.")],
 records=["used by Genesis, Yes, Rush, Tool and Dream Theater"], rec_src="Wikipedia, \"Moog Taurus\"",
 quiz=[("How do you play a Taurus?", ["With your feet, on pedals", "With a bow", "By blowing", "With a mouse"], 0, "Wikipedia."),
       ("What does Beat do?", ["Detunes the second oscillator", "Sets the tempo", "Adds drums", "Turns it off"], 0, "Manual PDF p. 3."),
       ("Which kind of music is it most linked with?", ["Progressive rock", "Opera", "Jazz trios", "Folk"], 0, "Wikipedia."),
       ("Its waveform is…", ["Sawtooth", "Only sine", "Wavetable", "Sampled"], 0, "Manual PDF p. 6.")],
 cites=["Taurus_Model_205A", "Moog_Taurus"])

P["voyager"] = dict(kind="synth", wid="voyager", name="Minimoog Voyager", short="Voyager", year="2002",
 desc="A first look at the Minimoog Voyager: Bob Moog's successor to the Model D, with waves you can sweep, two filters and linear FM, a guided tour, and a short quiz.",
 what=["The **Minimoog Voyager** was designed by **Robert Moog** and released by Moog Music in **2002** (Wikipedia, \"Minimoog Voyager\").",
       "It was meant as a successor to the [Model D](intro-model-d.qmd), and sold over 14,000 units before it stopped in 2015 (Wikipedia).",
       "This page follows the **Old School** version of 2008 (Wikipedia; Voyager Old School manual)."],
 sound=["**Three oscillators**, each with a wave knob that sweeps between shapes (Old School manual, PDF p. 6).",
        "**Two filters**: two low-pass filters side by side, or a high-pass and a low-pass in a row, with **Spacing** between them (manual, PDF p. 8).",
        "**Linear FM** lets oscillator 3 change oscillator 1's pitch very fast (manual, PDF p. 8).",
        "It plays one note at a time."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="voyager-hplp", set={"mode": "dual", "space": 0}, t="**Dual low-pass.** Two low-pass filters together. Listen: a warm lead."),
        dict(ex="voyager-hplp", t="**HP/LP with Spacing.** High-pass then low-pass, spaced apart. Listen: a thinner band in the middle."),
        dict(ex="voyager-hplp", set={"space": 3}, t="**More Spacing.** Listen: the band gets wider."),
        dict(ex="voyager-fm", set={"linFm": False}, t="**One oscillator.** Linear FM off. Listen: a plain tone."),
        dict(ex="voyager-fm", t="**Linear FM on.** Oscillator 3 modulates oscillator 1. Listen: a bright, bell-like tone.")],
 records=[], rec_src="Wikipedia, \"Minimoog Voyager\"",
 quiz=[("Who designed the Voyager?", ["Robert Moog", "Roger Linn", "Dave Smith", "Wolfgang Palm"], 0, "Wikipedia."),
       ("What was it meant to follow?", ["The Minimoog Model D", "The DX7", "The TR-808", "The piano"], 0, "Wikipedia."),
       ("HP/LP mode puts…", ["A high-pass and a low-pass in a row", "Two reverbs together", "No filter", "Drums first"], 0, "Manual PDF p. 8."),
       ("How many oscillators?", ["One", "Two", "Three", "Six"], 2, "Manual PDF p. 6.")],
 cites=["manualzilla-id-7334103", "Minimoog_Voyager"])

P["sub-37"] = dict(kind="synth", wid="sub37", name="Moog Sub 37", short="Sub 37", year="2014",
 desc="A first look at the Moog Sub 37 and Subsequent 37: two oscillators and a sub, MultiDrive, Duo mode, a guided tour, and a short quiz.",
 what=["The **Sub 37** is an analog synth made by **Moog Music** from **2014**; the **Subsequent 37** followed in 2017 (Wikipedia, \"Moog Sub 37\").",
       "Its own manual could not be found, so the panel follows the **Subsequent 25**, a smaller synth of the same family (Subsequent 25 manual)."],
 sound=["**Two oscillators** whose waves sweep from triangle to saw to square to narrow pulse (Subsequent 25 manual, PDF p. 13).",
        "A **sub oscillator** one octave below oscillator 1 (manual, PDF p. 15).",
        "**MultiDrive** overdrives the sound before the filter (manual, PDF p. 16).",
        "**Duo mode** plays two notes at once through the one filter (manual, PDF p. 9)."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="sub37-drive", set={"mSub": 0, "drive": 0}, t="**One oscillator.** Sub and drive off. Listen: a plain bass."),
        dict(ex="sub37-drive", set={"drive": 0}, t="**Add the sub.** Sub oscillator at 7. Listen: deeper."),
        dict(ex="sub37-drive", t="**MultiDrive.** Drive at 4. Listen: warmer and grittier."),
        dict(ex="sub37-duo", set={"duo": False}, t="**Mono.** Duo off: one note at a time."),
        dict(ex="sub37-duo", t="**Duo mode.** Two notes through one filter. Listen: two-note intervals.")],
 records=[], rec_src="Wikipedia, \"Moog Sub 37\"",
 quiz=[("Duo mode plays…", ["Two notes through one filter", "Two songs", "Drums and bass", "Only noise"], 0, "Manual PDF p. 9."),
       ("The sub oscillator is…", ["One octave below oscillator 1", "An octave above", "A drum", "A filter"], 0, "Manual PDF p. 15."),
       ("MultiDrive…", ["Overdrives the sound", "Adds reverb", "Records audio", "Changes tempo"], 0, "Manual PDF p. 16."),
       ("Which year did the Sub 37 come out?", ["1970", "1983", "2014", "2024"], 2, "Wikipedia.")],
 cites=["MGLPSSB00701", "Moog_Sub_37"])

P["grandmother"] = dict(kind="synth", wid="grandmother", name="Moog Grandmother", short="Grandmother", year="2018",
 desc="A first look at the Moog Grandmother: a semi-modular synth with a spring reverb and patch points, a guided tour, and a short quiz.",
 what=["The **Grandmother** is an analog, **semi-modular**, 32-key synth by **Moog Music**, with circuits based on the Moog modular and the Minimoog (Wikipedia, \"Moog Grandmother\"). Its manual is dated 2018.",
       "Semi-modular: it plays without cables, and patch cables can change the path (Wikipedia).",
       "It cannot save sounds: you draw them on patch sheets instead (Wikipedia), like the [Model D](intro-model-d.qmd)."],
 sound=["**Two oscillators**: triangle, saw, square or narrow pulse (Grandmother manual, PDF pp. 11-12).",
        "A **ladder low-pass filter**, 24 dB (manual, PDF pp. 16-17), and a separate 1-pole **high-pass** you can patch in (PDF p. 7, 15).",
        "A real **spring reverb** inside (manual, PDF p. 21).",
        "One ADSR envelope (manual, PDF pp. 18-19)."],
 tour_intro="Each step loads a worked example and changes one thing.",
 steps=[dict(ex="gm-spring", set={"rev": 0}, t="**A pluck, dry.** Reverb at 0. Listen: short and close."),
        dict(ex="gm-spring", t="**Spring reverb.** Reverb mix at 6. Listen: a splashy, boingy space."),
        dict(ex="gm-hp", set={"hpOn": False}, t="**Low-pass only.** Listen: full bass."),
        dict(ex="gm-hp", t="**High-pass patched in.** Listen: the low end is cut away."),
        dict(ex="gm-hp", set={"res": 8}, t="**More resonance.** Listen: a ringing peak.")],
 records=[], rec_src="Wikipedia, \"Moog Grandmother\"",
 quiz=[("What is special about the Grandmother's reverb?", ["It is a real spring", "It is digital", "It is a room", "It has none"], 0, "Manual PDF p. 21."),
       ("Can it save sounds?", ["No: you draw them on sheets", "Yes, 1000 of them", "Only drums", "Only on tape"], 0, "Wikipedia."),
       ("Semi-modular means…", ["It plays without cables, and cables can change it", "It has no knobs", "It needs a computer", "It is a drum machine"], 0, "Wikipedia."),
       ("How many keys?", ["25", "32", "61", "88"], 1, "Wikipedia.")],
 cites=["MoogGrandmotherUsersManual", "Moog_Grandmother"])

P["memorymoog"] = dict(kind="synth", wid="memorymoog", name="Memorymoog", short="Memorymoog", year="1982",
 desc="A first look at the Memorymoog: six voices of three oscillators each, Moog's ladder filter on every voice, a guided tour, and a short quiz.",
 what=["The **Memorymoog** was made by **Moog Music** from **1982** to 1985 (Wikipedia, \"Memorymoog\").",
       "It has **six voices** and **100 programs** (Memorymoog manual, PDF p. 5).",
       "It is often described as \"six Minimoogs in one unit\" (Wikipedia)."],
 sound=["Each voice has **three oscillators**, like the [Model D](intro-model-d.qmd) (manual, PDF p. 5).",
        "Pulse, saw and triangle can be **mixed** on each oscillator (manual, PDF p. 16).",
        "Every voice has a 24 dB **ladder filter** (manual, PDF p. 5; Wikipedia).",
        "**Mono** mode stacks the voices on one note (manual, PDF p. 9)."],
 tour_intro="Each step loads the poly brass example and changes one thing.",
 steps=[dict(ex="mm-brass", set={"m2": 0, "m3": 0}, t="**One oscillator a voice.** Oscillators 2 and 3 off. Listen: thin chords."),
        dict(ex="mm-brass", t="**Three oscillators a voice.** Listen: rich, slightly detuned brass."),
        dict(ex="mm-brass", set={"cAmt": 0}, t="**No filter contour.** Listen: flat, no swell."),
        dict(ex="mm-brass", set={"emph": 6}, t="**Emphasis up.** Listen: a ringing edge."),
        dict(ex="mm-brass", set={"mono": True}, t="**Mono mode.** All voices on one note. Listen: huge, one note at a time.")],
 records=[], rec_src="Wikipedia, \"Memorymoog\"",
 quiz=[("How many oscillators does each Memorymoog voice have?", ["One", "Two", "Three", "Six"], 2, "Manual PDF p. 5."),
       ("How many voices?", ["One", "Six", "Eight", "Sixteen"], 1, "Manual PDF p. 5."),
       ("Mono mode…", ["Stacks voices on one note", "Turns it off", "Plays drums", "Adds reverb"], 0, "Manual PDF p. 9."),
       ("It is often called six of which synth in one?", ["Minimoog", "DX7", "TB-303", "Juno"], 0, "Wikipedia.")],
 cites=["memorymoog-owners-manual", "wiki/Memorymoog"])

COMPARE = dict(synth=("synth-compare.qmd", "Classic Synths Compared"), drum=("drum-compare.qmd", "Classic Drum Machines Compared"), seq=("sequencer-compare.qmd", "Classic Sequencers Compared"))
SCRIPT = dict(synth="synth-compare", drum="drum-compare", seq="sequencer-compare")
CLS = dict(synth="scmp", drum="dcmp", seq="sqc")
PLAYHOW = dict(synth="Play it from the keys under the panel, the computer keys (a w s e d f t g y h u j k) or a MIDI keyboard. Turn any knob while you play.",
               drum="Click the squares of the grid to add or take away hits. The tour's ▶ buttons play it.",
               seq="Change the steps on the panel. The tour's ▶ buttons play it.")

def page(slug, p):
    k = p["kind"]; cmpf, cmpt = COMPARE[k]
    q = p.get("compare_q") or ("synth=" + p["wid"] if k == "synth" else "machine=" + p["wid"])
    o = ["---", 'title: "Meet ' + (p["name"] if p["name"].startswith("the ") else "the " + p["name"]) + '"', "toc: true", "toc-depth: 2",
         f'description: "{p["desc"]}"', f'instruments: [{"drums" if k == "drum" else "piano"}, other]', "topics: [sound]", "has: [interactive, svg]", "---", "",
         f'A first stop before [{cmpt}]({cmpf}). Short sections, one idea each. Click a heading to fold or open it.', "",
         "::: {.ik-do}", "**What you'll do**", "",
         f"1. Read what the {p['short']} is and when it was made.", "2. Learn its sound, one idea at a time.",
         f"3. Take a guided tour: press each **▶ Hear step** button and listen for one change.", "4. Find records it is on.",
         "5. Check yourself with a short quiz.", ":::", "", "## What it is", ""]
    o += ["- " + s for s in p["what"]] + ["", "## Its sound", ""] + ["- " + s for s in p["sound"]]
    o += ["", "## The panel", "",
          f"This is the {p['short']} panel from [{cmpt}]({cmpf}), drawn after the real one (not a copy). {PLAYHOW[k]} The sound is this site's own model; nobody has compared it with the real instrument.", "",
          "```{=html}", f'<div class="ik-box" data-kind="{k}" data-id="{p["wid"]}"><div class="{CLS[k]}"></div></div>', "```", "",
          "## Guided tour", "", p["tour_intro"], "", "```{=html}"]
    for s in p["steps"]:
        a = (f' data-sheet="{s["sheet"]}"' if "sheet" in s else "") + (f' data-ex="{s["ex"]}"' if "ex" in s else "") + \
            (f' data-set="{J(s["set"])}"' if s.get("set") else "") + (f' data-pat="{J(s["pat"])}"' if "pat" in s else "") + (f' data-seq="{J(s["seq"])}"' if "seq" in s else "")
        o.append(f'<div class="ik-step"{a}><p>{md(s["t"])}</p></div>')
    o += ["```", "", "## Famous records", ""]
    if p["records"]: o += [f"Named in {p['rec_src']}:", ""] + ["- " + r for r in p["records"]]
    else: o += [f"{p['rec_src']} does not name any records, so none are listed here yet."]
    o += ["", "## Videos", ""]
    v = vids(k, p["wid"])[:3]
    if v: o += ["Videos made on (or for) this instrument, from the list on the compare page. They open on YouTube.", ""] + [f"- [{t}]({u}) ({c}) ↗" for t, c, u in v]
    else: o += ["No videos have been chosen for this one yet."]
    o += ["", "## Check yourself", "", "Click an answer. You will see at once if it is right. Nothing is saved or sent.", "", "```{=html}"]
    for qq, ch, a, why in p["quiz"]:
        o.append(f'<div class="ik-q" data-a="{a}"><p><b>{html.escape(qq)}</b></p><ul>' + "".join(f"<li>{md(c)}</li>" for c in ch) + f'</ul><p class="ik-why">{md(why)}</p></div>')
    o += ["```", "", "## Next", "", f"- [{cmpt}]({cmpf[:-4]}.html?{q}): the {p['short']} side by side with the others, with every setting checked against the manuals."]
    if p.get("extra_next"): o.append(p["extra_next"])
    o += ["", "```{=html}", '<link rel="stylesheet" href="/apps/shared/lessons/' + SCRIPT[k] + '.css">', '<link rel="stylesheet" href="/apps/shared/lessons/intro-kit.css">',
          '<script src="/apps/shared/lessons/sections.js"></script>', '<script src="/apps/shared/lessons/' + SCRIPT[k] + '.js"></script>']
    if "sheet" in p["steps"][0]: o += ['<link rel="stylesheet" href="/apps/shared/lessons/moog-sheet.css">', '<script src="/apps/shared/lessons/moog-sheet.js"></script>']
    o += ['<script src="/apps/shared/lessons/intro-kit.js"></script>', "```", ""]
    return "\n".join(o)

import re
def md(s):  # **bold**, *italic*, [text](link) -> HTML (for the raw HTML blocks)
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s); s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    return re.sub(r"\[(.+?)\]\((.+?)\)", lambda m: f'<a href="{m.group(2).replace(".qmd", ".html")}">{m.group(1)}</a>', s)

if __name__ == "__main__":
    want = sys.argv[1:] or list(P)
    for slug in want:
        f = ROOT / "lessons" / f"intro-{slug}.qmd"; old = f.read_text() if f.exists() else ""
        txt = page(slug, P[slug]); m = re.search(r"<!-- works-cited.*", old, re.S)
        f.write_text(txt + ("\n" + m.group(0) if m else "")); print("wrote", f.relative_to(ROOT))
