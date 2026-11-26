# Sources for "Classic Sequencers Compared" (lessons/sequencer-compare.qmd, apps/shared/lessons/sequencer-compare.js).
# Checked 2026-11-25: the manuals read as text (copies and extracted text in ~/Documents/Manuals/sequencers; the Roland scans are
# cited by PDF page). No Moog 960 manual was found: the 960 is built from the Synthesizers.com Q960 data sheet, which says the Q960
# is functionally equivalent. History facts are from the Wikipedia articles below only.
P = ["lessons/sequencer-compare.qmd"]
SOURCES = [
    web('Behringer. *960 Sequential Controller Quick Start Guide*. Music Tribe (copy in ~/Documents/Manuals/sequencers; the product page URL was not checked), URL.', "https://www.behringer.com", P, who="teacher",
        note="Controls drawing and items 1-11 (p. 1): positions of the faithful 960 panel (panels/sq-a960.js); the module copies the Moog 960 layout."),
    web('Synthesizers.com. *Q960 Sequential Controller* [data sheet]. Sept. 2014, URL.', "https://shop.synthesizers.com/cdn/shop/files/q960data.pdf", P, who="teacher",
        note="A recreation of the Moog 960, \"functionally equivalent\" (p. 5): 8 stages x 3 rows (p. 1), stage modes and the 90 % oscillator pulse (p. 3), X1/X2/X4 ranges, stage 9, third-row timing (p. 4), Q962 for 24 stages (p. 2). The faithful 960 panel uses the functions only; its positions come from the Behringer quick start guide."),
    web('Roland Corporation. *TB-303 Bass Line Owner\'s Manual*. Roland, [1982], scan at Internet Archive, URL.', "https://archive.org/details/synthmanual-roland-tb-303-owners-manual", P, who="teacher",
        note="PDF pages: pitch, length of note, accent and slide in a pattern (4-5), sixteenth notes (5), 64 patterns (11), time mode (14-16), 7 tracks (23), writing accent and slide (40-43). Panel drawing PDF p. 8: positions of the faithful TB-303 sequencer panel (panels/sq-tb303.js)."),
    web('Roland Corporation. *TB-03 Owner\'s Manual*. Roland, 2016, URL.', "https://static.roland.com/assets/media/pdf/TB-03_eng03_W.pdf", P, who="student",
        note="One sheet: Original mode reproduces the TB-303's pattern write; note / tie / rest, 16 steps, triplet grid, last step. Time mode keys DOWN = note, UP = tie, ACCENT = rest (used by the faithful panel)."),
    web('Roland Corporation. *MC-202 MicroComposer Owner\'s Manual*. Roland, [1983], scan at Internet Archive, URL.', "https://archive.org/details/synthmanual-roland-mc-202-owners-manual", P, who="teacher",
        note="PDF pages: features, 2 channels, 2600 steps, tape (5), step and gate time (10, 15-16), rests (17, 19), accent and portamento (29, 31). Panel Descriptions drawing PDF p. 11: positions of the faithful MC-202 panel (panels/sq-mc202.js)."),
    web('Roland Corporation. *MC-4 MicroComposer Owner\'s Manual*. Roland, [1981], scan at Internet Archive, URL.', "https://archive.org/details/synthmanual-roland-mc-4-owners-manual", P, who="teacher",
        note="PDF pages: pitch numbers (9), time base, step and gate time (10), CV-1 / CV-2 / gate on four channels (11), entering a tune (13-18), cassette (19-24). Hook-up drawings PDF pp. 7, 86 show the MC-4 too small to measure: the faithful MC-4 panel is a plan, positions guessed."),
    web('Elektron. *Digitakt II User Manual*. Elektron Music Machines, 2024, URL.', "https://www.elektron.se/en/download-support-digitakt-ii", P, who="student",
        note="Note and lock trigs (41), micro timing (45), 128 steps, speed (45-46), parameter locks (47), trig conditions (48), FILL (49), TRIG page (53-54), swing (23). Front panel drawing p. 12: positions of the faithful Digitakt II panel (panels/sq-elektron.js)."),
    wiki("Roland TB-303", "Roland_TB-303", P, who="student"),
    wiki("Roland MC-202", "Roland_MC-202", P, who="student"),
    wiki("Roland MC-4 Microcomposer", "Roland_MC-4_Microcomposer", P, who="student"),
    wiki("Roland MC-8 Microcomposer", "Roland_MC-8_Microcomposer", P, who="student"),
    wiki("Music sequencer", "Music_sequencer", P, who="student", note="Analog sequencers' \"repeated minimalistic phrases\", citing Pinch and Trocco."),
]
