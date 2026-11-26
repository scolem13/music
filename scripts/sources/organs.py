# Sources for the organ pages (apps/shared/lessons/organ-compare.js, panels/organ-*.js; lessons/organ-compare.qmd and the four intro
# pages written by scripts/intro-instruments/organs.py). Read 2026-11-26. No manual was downloaded: none of the Hammond, Vox or Farfisa
# scans found is clearly free to redistribute, so they are cited as web pages only (or not at all). The tonewheel figures (tempered
# ratios, foldback, 3 dB a drawbar step, scanner rate, Leslie speeds) are copied from the band's model and its sources (apps/shared/band/ORGAN.md).
# Videos: oEmbed-checked, in apps/shared/data/organs/assignments.json (ids from the songs' Wikipedia external links).
_C = "lessons/organ-compare.qmd"
_I = lambda s: ["lessons/intro-%s.qmd" % s, _C]
SOURCES = [
    wiki("Hammond organ", "Hammond_organ", _I("b3"), who="student", note="B-3 / C-3 1954 to early 1975, harmonic percussion; 61-key manuals, 25-note pedalboard; reverse-coloured preset keys, C cancel, B and B-flat the drawbar sets; percussion 2nd / 3rd, soft / normal, single-trigger; V1-V3 C1-C3 per manual; Leslie 122; players and records."),
    web('Hammond Suzuki. "XK-5 Owner\'s Manual." *ManualsLib*. URL.', "https://www.manualslib.com/manual/1591989/Hammond-Xk-5.html?page=52", _I("b3"),
        note="Percussion: 2nd = the 4′ drawbar's pitch, 3rd = the 2⅔′; fast / slow decay; the 1′ drawbar inoperative while on; only with the B preset key and only on the upper manual, 'same as B-3/C-3'. Read as quoted in a search result, page not opened in full."),
    web('Cherry Audio. "Blue3 Organ: Main." *Cherry Audio Documentation*. URL.', "https://docs.cherryaudio.com/cherry-audio/instruments/blue3/main", _I("b3"),
        note="An emulator's table of the B-3 factory presets; upper C-sharp to E agree with a second web page. Not a Hammond document: the other presets are unverified."),
    web('Electric Druid. "Hammond tonewheel organ" (article, as cited in this site\'s apps/shared/band/ORGAN.md). *Electric Druid*. URL.', "https://electricdruid.net/?p=316", [_C],
        note="Tonewheel ratios, foldback, drawbar steps, scanner rate, Leslie speeds: through apps/shared/band/ORGAN.md."),
    wiki("Vox Continental", "Vox_Continental", _I("vox-continental"), who="student", note="1962, Dartford; twelve top-octave oscillators and dividers; six drawbars (16′ 8′ 4′ IV, flute, reed); single-speed single-intensity vibrato; 49 keys, reverse-coloured; records named."),
    wiki("Farfisa", "Farfisa", _I("farfisa"), who="student", note="Combo Compact 1964, Compact series to 1969; twelve generator boards and dividers, germanium transistors, valve-driven reverb; the tab list by model; four vibrato settings; users and records."),
    wiki("Organ stop", "Organ_stop", _I("pipe-organ"), who="student", note="Families (principal, flute, string, reed, hybrid); footages 16′ 8′ 4′, mutations 2⅔′ and 1⅗′; mixtures and their Roman numerals, breaking back; registration; reeds often lettered red."),
    wiki("Symphony for Organ No. 5 (Widor)", "Symphony_for_Organ_No._5", _I("pipe-organ"), note="The Toccata is the finale; links the composer's own recording at Saint-Sulpice."),
]
