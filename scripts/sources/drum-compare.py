# Sources for the drum machines page (lessons/drum-compare.qmd, apps/shared/lessons/drum-compare.js).
# Checked 2026-11-25: the manuals read as text (copies and extracted text in ~/Documents/Manuals/drums); history only from the
# four Wikipedia articles. Knob curves, swing spacing between printed points, flam ms and every sound are the page's own (marked).
P = ["lessons/drum-compare.qmd"]
SOURCES = [
    web('Roland Corporation. *TR-808 Service Notes*. 1st ed., 15 June 1981, 2nd printing 1983, Internet Archive, URL.', "https://archive.org/details/synthmanual-roland-tr-808-service-notes", P, who="teacher",
        note="Specifications: 1-32 steps a measure, 64 measures x 12 tracks, tempo 40-300, accent 0-10 dB (p. 1); the sound circuits: bridged T-network bass drum and its accent trick, snare, toms / congas, clap, cowbell, cymbal and hi-hats (pp. 5-6); knobs (p. 16)."),
    web('Roland Corporation. *TR-808 Rhythm Composer Owner\'s Manual* [introduction]. Internet Archive, URL.', "https://archive.org/details/manualsbase-id-576201", P, who="teacher",
        note="Writing a pattern: a measure of 16 steps, pre-scale, tap write. Panel photo pp. 2-3: positions of the faithful TR-808 panel (panels/dm-tr808.js)."),
    web('Roland Corporation. *TR-909 Rhythm Composer Owner\'s Manual*. Internet Archive, URL.', "https://archive.org/details/synthmanual-roland-tr-909-owners-manual", P, who="teacher",
        note="Features (p. 5), sound controls (p. 8), scale and last step (p. 24), total and per-voice accent (p. 25), shuffle and flam (p. 26). Panel Description drawing p. 3: positions of the faithful TR-909 panel (panels/dm-tr909.js)."),
    web('Linn Electronics. *LinnDrum Owner\'s Manual*. Internet Archive, URL.', "https://archive.org/details/synthmanual-linndrum-owners-manual", P, who="teacher",
        note="Drums, dynamic levels, tuning (p. 1); patterns (p. 2); error correct (p. 7); timing A-F, E a perfect triplet shuffle (pp. 8-9). No panel drawing: the faithful LinnDrum panel takes its sections from the text of pp. 1-2, positions guessed."),
    web('Linn, Roger, and David Battino. *MPC60 Software Version 3.1 Operator\'s Manual*. Roger Linn Design, 2002, URL.', "https://www.polynominal.com/akai-mpc60/akai-mpc60-manual.pdf", P, who="teacher",
        note="12-bit samples at 40 kHz (p. 15), 16 Levels (pp. 21-22), 96 ppq (p. 26), timing correct and swing 50-75 % (pp. 43-44), specifications (p. 218). No panel drawing: the faithful MPC60 panel takes its parts from pp. 11-13, 18, 21-22, positions guessed."),
    web('"Roland TR-808." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/Roland_TR-808", P, who="student", note="History, makers, sales, music and records."),
    web('"Roland TR-909." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/Roland_TR-909", P, who="student", note="History, 6-bit samples, sales, music and records."),
    web('"LinnDrum." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/LinnDrum", P, who="student", note="Dates, price, sales, 8-bit samples, users."),
    web('"Akai MPC." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/Akai_MPC", P, who="student", note="The MPC60's release and price, Linn and Cockerell, DJ Shadow, J Dilla, Kanye West."),
    web('"Classic Tracks: Frankie Goes To Hollywood \'Relax\'." *Sound On Sound*, URL.', "https://www.soundonsound.com/techniques/classic-tracks-frankie-goes-hollywood-relax", P, who="student", note="Cited by the Wikipedia LinnDrum article for Trevor Horn's use; not read for this page."),
]
