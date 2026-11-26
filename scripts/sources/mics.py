# Sources for the microphone pages (apps/shared/lessons/mics.js, panels/mic-*.js, data/mics/tracks.json, lessons/mic-compare.qmd,
# intro-<mic>.qmd). Read 2026-11-26 (page text through a fetch summary; the makers' response charts are images and were NOT read
# as data): Shure's SM57 / SM58 / Beta 52A pages, Neumann's U 87 Ai page, Royer's R-121 page, and the Wikipedia articles below
# (Microphone, Proximity effect and Ribbon microphone through the API, in full). NOT from any source (unverified, in the JS header):
# every frequency-response point (the charts' shapes as remembered), the low-frequency widening and the beaming corners, the
# kr floor of the proximity term, the U 87's low-cut corner and the "omni" gradient share, the MD 421's step amounts and its
# sensitivity, everything numeric about the Beta 52A, the room levels, the source levels, the dynamics' / ribbon's noise estimate,
# and every placement in tracks.json. The pad's 10 dB is inferred from Neumann's max SPL 117 / 127 dB.
C = ["lessons/mic-compare.qmd"]
I = {k: f"lessons/intro-{k}.qmd" for k in ["sm57", "sm58", "u87", "r121", "md421", "beta52"]}
ALL = C + list(I.values())
SOURCES = [
    web('"SM57 Dynamic Instrument Microphone." *Shure*, URL. Accessed 26 Nov. 2026.', "https://www.shure.com/en-US/products/microphones/sm57", C + [I["sm57"]], note="Cardioid dynamic; 40-15,000 Hz; \"contoured frequency response\" with a presence rise."),
    web('"SM58 Vocal Microphone." *Shure*, URL. Accessed 26 Nov. 2026.', "https://www.shure.com/en-US/products/microphones/sm58", C + [I["sm58"]], note="Cardioid dynamic; 50-15,000 Hz; \"brightened midrange and bass rolloff\"."),
    web('"Beta 52A Kick Drum Microphone." *Shure*, URL. Accessed 26 Nov. 2026.', "https://www.shure.com/en-US/products/microphones/beta_52a", C + [I["beta52"]], note="Supercardioid dynamic; response \"shaped specifically for kick drums\"; locking stand adapter, pneumatic shock mount. No numbers on the page."),
    web('"U 87 Ai." *Neumann*, URL. Accessed 26 Nov. 2026.', "https://www.neumann.com/en-en/products/microphones/u-87-ai/", C + [I["u87"]], note="Omni / cardioid / figure-8; 20 Hz-20 kHz; 20 / 28 / 22 mV/Pa; self-noise 15 / 12 / 14 dB-A; max SPL 117 dB, 127 dB with pad; switchable low cut and pad."),
    web('"R-121." *Royer Labs*, URL. Accessed 26 Nov. 2026.', "https://royerlabs.com/r-121/", C + [I["r121"]], note="Figure-8 ribbon, passive; 30-15,000 Hz ±3 dB; -47 dBV; 300 ohm; max SPL >135 dB at 20 Hz; offset ribbon, back side brighter close up."),
    wiki("Shure SM57", "Shure_SM57", C + [I["sm57"]], note="1965; -56.0 dBV/Pa; 150 ohm rated (300 actual); Unidyne 545 on Pet Sounds vocals; vocal users incl. Tom Waits; every US president since LBJ."),
    wiki("Shure SM58", "Shure_SM58", C + [I["sm58"]], note="-54.5 dBV/Pa; proximity effect; photos of Robert Lockwood Jr (1982), Patti Smith (2007)."),
    wiki("Neumann U 87", "Neumann_U_87", C + [I["u87"]], note="1967 successor of the U 67; U 87 A 1986; recordings incl. Heart of Gold, Tainted Love, American Pie."),
    wiki("Sennheiser MD 421", "Sennheiser_MD_421", C + [I["md421"]], note="Cardioid dynamic, 30-17,000 Hz ±3 dB; five-step bass roll-off M to S; Merci, Chérie (1966 Eurovision); The Concert for Bangladesh."),
    wiki("Microphone", "Microphone", ALL, note="Polar patterns as first-order sums: the cardioid = omni + figure-8, the figure-8's negative rear signal cancelling; ribbons' symmetric front and rear pickup."),
    wiki("Proximity effect (audio)", "Proximity_effect_(audio)", ALL, note="Bass rises close to a directional mic; caused by the ports; not a true omni, but not necessarily absent on a multipattern mic's summed omni."),
    wiki("Ribbon microphone", "Ribbon_microphone", C + [I["r121"]], note="Typically bidirectional; Blumlein pair."),
]
