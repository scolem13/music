# Sources for the electric piano pages (apps/shared/lessons/epiano.js, panels/ep-*.js; lessons/epiano-compare.qmd and the five
# intro pages written by scripts/intro-instruments/epianos.py). Each Wikipedia article read 2026-11-26 for what its page quotes.
# The service manuals (Rhodes, Wurlitzer 200A, Clavinet D6, CP-70) were NOT read: control legends and places Wikipedia does not
# give are marked unverified in the JS and on the pages. Videos: oEmbed-checked, in apps/shared/data/epianos/assignments.json.
_C = "lessons/epiano-compare.qmd"
_I = lambda s: ["lessons/intro-%s.qmd" % s, _C]
SOURCES = [
    wiki("Rhodes Piano", "Rhodes_piano", _I("rhodes"), who="student", note="Tines, tonebar, pickup; Mark I Stage and Suitcase (1970), 73 keys, about 130 lb; the Suitcase's tremolo between two speakers labelled vibrato; recordings (Riders on the Storm, Angela)."),
    wiki("Wurlitzer Electronic Piano", "Wurlitzer_electronic_piano", _I("wurlitzer"), who="student", note="Felt hammer on a metal reed, electrostatic pickup at 170 V DC; 200 (1968, about 88,000), 200A (1974-1983), 64 keys, 56 lb, 30 W; single-speed vibrato; Supertramp and Queen."),
    wiki("Clavinet", "Clavinet", _I("clavinet"), who="student", note="Pad, string and anvil, yarn damping, electromagnetic pickups; D6 (1971): Brilliant / Treble high-pass, Medium / Soft low-pass, AB and CD pickup rockers, mute slider; Use Me, Higher Ground."),
    wiki("Yamaha CP-70", "Yamaha_CP-70", _I("cp70"), who="student", note="Hammers on strings, no soundboard, piezo pickups on the harp; CP-70 (1976, 73 keys), CP-80 (1978, 88), to 1985; short bass strings; Genesis, Peter Gabriel."),
    wiki("Pianet", "Pianet", _I("pianet"), who="student", note="Pads lifting off reeds; N: leather pads, variable-capacitance pickup; T: suction pads, electromagnetic; models and years 1962-1983; vibrato switch, volume pedal; She's Not There, These Eyes."),
]
