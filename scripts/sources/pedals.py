# Sources for the guitar pedal pages (apps/shared/lessons/pedals.js, panels/pd-*.js, data/pedals/tracks.json).
# Read 2026-11-26: the Wikipedia articles below (in full through a fetch summary) and two Guitar World articles. ElectroSmash's
# analyses (Tube Screamer, Fuzz Face, Big Muff, Cry Baby, Phase 90, CE-2) could NOT be read (DNS failure); what the code takes
# from them came from search-result summaries and is marked so. NOT from any source (unverified, in the JS header): the TS808
# resistor / capacitor values (from memory of the schematic), every gain curve, bias, filter corner, LFO range, delay range of the
# CE-2 and the Echoplex, wow / flutter, the knob tapers, and every setting in tracks.json.
C = ["lessons/pedal-compare.qmd"]
I = {k: f"lessons/intro-{k}.qmd" for k in ["fuzz-face", "big-muff", "tube-screamer", "cry-baby", "phase-90", "ce-2", "dm-2", "echoplex"]}
ALL = C + list(I.values())
SOURCES = [
    wiki("Fuzz Face", "Fuzz_Face", C + [I["fuzz-face"]], note="1966, Arbiter; germanium (NKT275 / AC128) then silicon; Volume and Fuzz; with the guitar's volume at 10 treble is lost, rolling it down stops that."),
    wiki("Big Muff", "Big_Muff", C + [I["big-muff"]], note="1969, Electro-Harmonix; Volume, Sustain, Tone; four transistor stages: input booster, two clipping stages with diodes in feedback, tone stack blending low- and high-pass (mid cut), output booster; Depeche Mode's \"Big Muff\"."),
    wiki("Ibanez Tube Screamer", "Ibanez_Tube_Screamer", C + [I["tube-screamer"]], note="TS808 1979, Susumu Tamura, JRC4558; Drive, Tone, Level; boosts mids and cuts bass; Turner on Favourite Worst Nightmare."),
    wiki("Wah-wah pedal", "Wah-wah_pedal", C + [I["cry-baby"]], note="Plunkett, Warwick Electronics / Thomas Organ, 1966, sold Feb 1967; Cry Baby name; band-pass swept by the treadle; Tales of Brave Ulysses, Voodoo Child, Theme from Shaft."),
    wiki("MXR", "MXR", C + [I["phase-90"]], note="Phase 90 1974, MXR's first pedal; used on the first two Van Halen albums; no LEDs before 1981."),
    wiki("Echoplex", "Echoplex", C + [I["echoplex"]], note="Mike Battle, 1959; moving record head sets the delay; EP-3 solid state 1970, made to 1991; Bolin's ray-gun on Spectrum."),
    wiki("Eruption (instrumental)", "Eruption_(instrumental)", C + [I["phase-90"], I["echoplex"]], note="Played with an MXR Phase 90, an Echoplex, a Univox echo unit."),
    wiki("Purple Haze", "Purple_Haze", [I["fuzz-face"]], note="Octavia coupled with a Fuzz Face on the solo."),
    wiki("Comfortably Numb", "Comfortably_Numb", [I["big-muff"], I["dm-2"]], note="Gilmour used a Big Muff distortion and delay effects on the solos."),
    web('"Boss CE-2 Chorus Pedal History." *Guitar World*. URL.', "https://www.guitarworld.com/gear/guitar-pedals/boss-ce-2-chorus-pedal-history", C + [I["ce-2"]], note="Late 1979; MN3007 BBD; Rate and Depth only; users Honeyman-Scott (live), Gilmour, Marr, Duffy, Fripp."),
    web('"Classic Gear: Boss DM-2." *Guitar World*. URL.', "https://www.guitarworld.com/features/classic-gear-boss-dm-2", C + [I["dm-2"]], note="1981-1984; BBD repeats darker and warmer; high Intensity self-oscillates."),
    web('Boss. "DM-2W Delay." URL.', "https://www.boss.info/products/dm-2w/", C + [I["dm-2"]], note="Standard mode = the original DM-2's 20-300 ms."),
    web('ElectroSmash. "Fuzz Face Analysis." URL.', "https://electrosmash.com/fuzz-face", C + [I["fuzz-face"]], note="Input impedance 5.2-8.4 kOhm with the Fuzz pot (from a search summary: page unreachable 2026-11-26; unverified)."),
    web('ElectroSmash. "Tube Screamer Analysis." URL.', "https://electrosmash.com/tube-screamer-analysis", C + [I["tube-screamer"]], note="Clipping stage with a high-pass and low-pass in the feedback loop (outline only from a search summary; values unverified)."),
    web('ElectroSmash. "MXR Phase 90 Analysis." URL.', "https://electrosmash.com/mxr-phase90", C + [I["phase-90"]], note="Four phase-shifting stages, one LFO, two notches (outline from a search summary; unverified)."),
    web('ElectroSmash. "Big Muff Pi Analysis." URL.', "https://electrosmash.com/big-muff-pi-analysis", C + [I["big-muff"]], note="Not read (unreachable); tone stack scoop near 1 kHz from a student report found by search: unverified."),
    web('ElectroSmash. "Cry Baby GCB-95 Analysis." URL.', "https://electrosmash.com/crybaby-gcb-95", C + [I["cry-baby"]], note="A pot tunes a fixed L and C (from a search summary; unverified); resonance near 2.1 kHz from an LTspice write-up found by search."),
]
