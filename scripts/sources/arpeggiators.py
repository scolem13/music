# Sources for the workstation-style arpeggiator (apps/shared/motif-arp.js) on tools/sequencers.qmd.
# Checked 2026-10-24: the Yamaha Synth article fetched and its key-mode text read. The forum thread fetched and read 2026-10-24.
# The MODX Reference Manual itself was not reached; rate ranges and Unit Multiply are marked unverified in motif-arp.js.
P = ["tools/sequencers.qmd"]
SOURCES = [
    web('Bad Mister. "Arpeggiator Key Modes." *Yamaha Synth*, Yamaha Corporation of America. URL.',
        "https://yamahasynth.com/learn/moxf-series-music-production-synthesizers/arpeggiator-key-modes-moxf/", P,
        note="Written for the MOXF; the source for what Sort, Thru, Direct, Sort+Direct and Thru+Direct sound, and velocity limits splitting one arp across parts."),
    web('"Arp Settings Basics." *Yamaha Synth Forum*, Montage series. URL.', "https://yamahasynth.com/community/montage-series-synthesizers/arp-settings-basics", P,
        note="Forum answer by Bad Mister: the five key modes, and Velocity Mode Original (as recorded) or Thru (your velocity influences each note)."),
]
