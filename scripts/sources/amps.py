# Sources for the amp pages (apps/shared/lessons/amps.js, panels/amp-*.js, data/amps/tracks.json, lessons/amp-compare.qmd, intro-<amp>.qmd).
# Read 2026-11-26: Yeh & Smith's DAFx paper (PDF, full text: the tone stack's transfer function, eqn. 1, and the '59 Bassman component
# values; the site's nodal solve reproduces eqn. 1 to 1e-14, tests/lessons/amps.test.js), and the Wikipedia articles below (full
# text through the API). NOT from any source (unverified, in the JS header): the Twin / Marshall / Vox / Rectifier tone-stack values
# (commonly published schematic values from memory), every stage gain, bias, sag depth, reverb and tremolo value, the Cut range,
# the SVT tone section and switches, the Rectifier's mode names, every cabinet curve, and every setting in tracks.json.
C = ["lessons/amp-compare.qmd"]
I = {k: f"lessons/intro-{k}.qmd" for k in ["twin-reverb", "ac30", "plexi", "bassman", "dual-rectifier", "svt"]}
SOURCES = [
    web('Yeh, David T., and Julius O. Smith. "Discretization of the \'59 Fender Bassman Tone Stack." *Proceedings of the 9th International Conference on Digital Audio Effects (DAFx-06)*, Montreal, 2006. URL.', "https://ccrma.stanford.edu/~dtyeh/papers/yeh06_dafx.pdf", C + list(I.values()), note="Eqn. 1: the closed-form transfer function in the Treble / Middle / Bass pot positions, checked against SPICE in the paper; bilinear discretisation (2.3); Bassman values C1 250 pF, C2 = C3 20 nF, R1 250k, R2 1M, R3 25k, R4 56k."),
    wiki("Tone stack", "Tone_stack", C + [I["bassman"]], note="The Bassman 5F6-A standardised the three-knob tone stack; passive, it can only cut; links the Tone Stack Calculator (TSC)."),
    wiki("Fender Twin Reverb", "Fender_Twin_Reverb", C + [I["twin-reverb"]], note="Blackface 1963-67, AB763, 85 W into 4 ohm, four 6L6GC, solid-state rectifier, Normal and Vibrato channels, bright switch, spring reverb (Hammond / Accutronics), \"vibrato\" = tremolo by a neon + LDR bug; users incl. Knopfler, Garcia, the Beatles (1968, AC568)."),
    wiki("Vox AC30", "Vox_AC30", C + [I["ac30"]], note="1959; four EL84 cathode biased, class AB not class A, no negative feedback, GZ34; Top Boost = Bassman stack with the middle removed, standard from 1963; Celestion Blue; players Marvin, the Beatles, May (with a treble booster), the Edge."),
    wiki("Marshall Amplification", "Marshall_Amplification", C + [I["plexi"]], note="JTM45 1963 after the Bassman (higher-gain ECC83s, a cap/resistor filter after the volume); 1959 Super Lead 1965, Plexiglas panel to 1969; KT66 then EL34; 4x12 stacks; inputs daisy-chained; Hendrix, Clapton, Page, Townshend."),
    wiki("Fender Bassman", "Fender_Bassman", C + [I["bassman"]], note="5F6 1957 three-knob tone stack, long-tailed-pair phase inverter; 5F6-A 1958 GZ34 rectifier, Presence change; four 10\" Jensen P10R; copied by the Marshall JTM45; Buddy Holly."),
    wiki("Mesa Boogie", "Mesa_Boogie", C + [I["dual-rectifier"]], note="Cascading gain stages (1970s); Dual Rectifier 1991 after the Soldano SLO-100, \"raw, aggressive bass-heavy sound\", diamond faceplate; users incl. Korn, Tool, Soundgarden, Foo Fighters."),
    wiki("Ampeg SVT", "Ampeg_SVT", C + [I["svt"]], note="Bill Hughes and Roger Cox, 1969; 300 W, 14 tubes; 6146B then 6550 (mid-1970); two 8x10 cabinets; prototypes carried the Rolling Stones' 1969 US tour; blue-line / black-line faceplates."),
    wiki("Spring reverb", "Spring_reverb", C + [I["twin-reverb"]], note="Hammond's 1939 patent; Accutronics Type 4 / Type 8 units."),
]
