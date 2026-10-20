# Guitar, drum, cajon, strobe-tuner and tuning-systems lessons. Checked 18 Oct 2026: every URL fetched
# (curl status + page title, most read via WebFetch); books from publisher/retailer listings or long-standing
# catalogue knowledge, details left out where they could not be confirmed.
BENDS = "lessons/guitar-bends.qmd"
HARM = "lessons/guitar-harmonics.qmd"
EAR = "lessons/guitar-tuning-ear.qmd"
METH = "lessons/guitar-tuning-methods.qmd"
TUN = "lessons/guitar-tuning-tuners.qmd"
HP = "lessons/hammer-ons-pull-offs.qmd"
TRAV = "lessons/travis-picking.qmd"
BR = "lessons/drum-brushes.qmd"
GR = "lessons/drum-grips.qmd"
HH = "lessons/hihat-grooves.qmd"
CAJ = "lessons/cajon-basics.qmd"
STR = "lessons/strobe-tuner.qmd"
TS = "lessons/tuning-systems.qmd"
INH = "lessons/inharmonicity.qmd"
SOURCES = [
    # --- acoustics and tuning, teacher level
    book('Barbour, J. Murray. *Tuning and Temperament: A Historical Survey*. Michigan State College Press, 1951.', [TS, METH], who="teacher"),
    book('Duffin, Ross W. *How Equal Temperament Ruined Harmony (and Why You Should Care)*. W. W. Norton, 2007.', [TS, EAR, STR], who="teacher"),
    web('Sethares, William A. *Tuning, Timbre, Spectrum, Scale*. 2nd ed., Springer, 2005. Companion site, URL.',
        "https://sethares.engr.wisc.edu/ttss.html", [TS, STR], who="teacher"),
    book('Rossing, Thomas D., F. Richard Moore, and Paul A. Wheeler. *The Science of Sound*. 3rd ed., Addison-Wesley, 2002.', [TS, EAR, HARM, TUN, STR], who="teacher"),
    book('Fletcher, Neville H., and Thomas D. Rossing. *The Physics of Musical Instruments*. 2nd ed., Springer, 1998.', [HARM, BENDS, TUN, STR], who="teacher"),
    book('Helmholtz, Hermann von. *On the Sensations of Tone*. Translated by Alexander J. Ellis, Dover, 1954.', [EAR, TS, METH], who="teacher"),
    web('Gann, Kyle. "An Introduction to Historical Tunings." URL.', "https://www.kylegann.com/histune.html", [TS], who="teacher",
        note="Meantone, Werckmeister III, Young, Pythagorean; does not define commas beyond the Pythagorean."),
    web('Wolfe, Joe. "How Harmonic Are \'Harmonics\'?" *Music Acoustics*, University of New South Wales. URL.',
        "https://newt.phys.unsw.edu.au/jw/harmonics.html", [HARM, METH, STR, INH], who="teacher", note="Open strings; not guitar-specific."),
    web('Wolfe, Joe. "Strings, Standing Waves and Harmonics." *Music Acoustics*, University of New South Wales. URL.',
        "https://newt.phys.unsw.edu.au/jw/strings.html", [HARM, BENDS, INH], who="student"),
    web('Wolfe, Joe. "Beats." *Physclips*, University of New South Wales. URL.', "https://newt.phys.unsw.edu.au/jw/beats.html", [EAR, METH, TS, STR], who="student"),
    web('Nave, Rod. "Beat Frequencies." *HyperPhysics*, Georgia State University. URL.', "http://hyperphysics.phy-astr.gsu.edu/hbase/Sound/beat.html", [EAR, TS], who="student"),
    web('Wolfe, Joe. "Note Names, MIDI Numbers and Frequencies." *Music Acoustics*, University of New South Wales. URL.',
        "https://newt.phys.unsw.edu.au/jw/notes.html", [TUN, STR], who="student"),
    web('"Pitch, Temperament & Timbre." *Dolmetsch Online*. URL.', "https://www.dolmetsch.com/musictheory27.htm", [TS], who="student"),
    web('Ableton. *Tuning: An Introduction to Pitch and Tuning Systems*. URL.', "https://tuning.ableton.com/", [TS, METH], who="student",
        note="Glossary gives the 4:3 fourth vs. 500-cent fourth used in the harmonics-method lesson."),
    wiki("Just intonation", "Just_intonation", [TS], who="student"),
    wiki("Equal temperament", "Equal_temperament", [TS], who="student"),
    wiki("Syntonic comma", "Syntonic_comma", [TS], who="student"),
    wiki("Pythagorean comma", "Pythagorean_comma", [TS], who="student"),
    wiki("Meantone temperament", "Meantone_temperament", [TS], who="student"),
    wiki("Well temperament", "Well_temperament", [TS], who="student"),
    wiki("Cent (music)", "Cent_(music)", [TS, STR, METH], who="student"),
    wiki("Beat (acoustics)", "Beat_(acoustics)", [EAR, STR], who="student"),
    wiki("Harmonic series (music)", "Harmonic_series_(music)", [TS, HARM], who="student"),
    # --- tuners
    wiki("Strobe tuner", "Strobe_tuner", [STR, TUN], who="student"),
    wiki("Electronic tuner", "Electronic_tuner", [TUN], who="student"),
    wiki("Wagon-wheel effect", "Wagon-wheel_effect", [STR], who="student"),
    wiki("Stroboscopic effect", "Stroboscopic_effect", [STR], who="student"),
    # --- guitar technique
    wiki("String harmonic", "String_harmonic", [HARM, METH], who="student"),
    wiki("Pinch harmonic", "Pinch_harmonic", [HARM], who="student"),
    wiki("String bending", "String_bending", [BENDS], who="student"),
    web('"How to Bend in Tune on Your Guitar like a Pro Every Time." *MusicRadar*. URL.', "https://www.musicradar.com/how-to/bend-in-tune-on-guitar", [BENDS], who="student",
        note="Twelve tabbed licks; fret the target note first."),
    web('Isaacs, Dave. "Guitar Lesson: Melodic String Bending." *ArtistWorks Blog*. URL.', "https://my.artistworks.com/blog/guitar-lesson-string-bending-dave-isaacs", [BENDS], who="student"),
    wiki("Hammer-on", "Hammer-on", [HP], who="student"),
    wiki("Pull-off", "Pull-off", [HP], who="student"),
    wiki("Travis picking", "Travis_picking", [TRAV], who="student"),
    web('"Merle Travis." *Country Music Hall of Fame and Museum*. URL.', "https://countrymusichalloffame.org/hall-of-fame/merle-travis", [TRAV], who="student"),
    # --- drums
    book('Stone, George Lawrence. *Stick Control for the Snare Drummer*. George B. Stone & Son, 1935.', [GR, HH], who="teacher"),
    book('Thigpen, Ed. *The Sound of Brushes*. Rev. ed., Alfred Music.', [BR], who="teacher", note="Publisher listing checked; first-edition year not confirmed."),
    book('Riley, John. *The Art of Bop Drumming*. Manhattan Music, 1994.', [BR, HH, GR], who="teacher"),
    web('"International Drum Rudiments." *Percussive Arts Society*. URL.', "https://pas.org/rudiments/", [GR], who="teacher"),
    web('Warren, Riley. "A Guide to Proper Stick Grips." *Yamaha Music Educators Hub*, 19 Dec. 2025. URL.',
        "https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/", [GR], who="student"),
    web('Fidyk, Steve. "Focus on the Hi-Hat: The Classic Swing Sound." *Modern Drummer*, Mar. 2012. URL.', "https://www.moderndrummer.com/?p=14888", [HH, BR], who="teacher"),
    web('Clark, Colleen. "Evolution of the Ride Pattern, Installment 3: Pattern Played on Hi-hats." *Zildjian Education*. URL.',
        "https://ae.zildjian.com/education/evolution-of-the-ride-pattern/evolution-of-the-ride-pattern-installment-3/", [HH], who="teacher"),
    web('*Vic Firth Education*. URL.', "https://www.vicfirth.com/education/", [GR, BR, HH], who="student", note="Grip and stroke videos; landing page checked."),
    wiki("Hi-hat", "Hi-hat", [HH], who="student"),
    wiki("Matched grip", "Matched_grip", [GR], who="student"),
    web('Bhattacharya, Aromica. "The Afro-Peruvian Cajón: Reclaiming a Humble Percussion Crate as One\'s Own." *Garland Magazine*, 1 Dec. 2020. URL.',
        "https://garlandmag.com/article/cajon/", [CAJ], who="student"),
    wiki("Landó (music)", "Land%C3%B3_(music)", [CAJ], who="student"),
]
