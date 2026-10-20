# Sources for the harmony, chord-shape and notation/tool lessons.
# Checked 2026-10-18: every web() / wiki() URL was fetched (curl, HTTP 200, page title matched);
# book() details confirmed from publisher pages or library catalogue records found by web search.
# Journal articles marked in `note` were confirmed from citation records / abstracts, not read in full.
# Open Music Theory (viva.pressbooks.pub) refused automated fetches (403), so it is not cited here.

H = ["lessons/borrowed-chords.qmd", "lessons/cadences.qmd", "lessons/guide-tones.qmd", "lessons/inversions.qmd",
     "lessons/minor-changes.qmd", "lessons/reharmonize.qmd", "lessons/turnarounds.qmd", "lessons/write-an-ending.qmd"]
SHAPES = ["lessons/chord-shapes-guitar.qmd", "lessons/chord-shapes-guitar-hand.qmd",
          "lessons/chord-shapes-piano.qmd", "lessons/chord-shapes-piano-hand.qmd"]
JAZZ = ["lessons/guide-tones.qmd", "lessons/turnarounds.qmd", "lessons/reharmonize.qmd"] + SHAPES
MT21 = "Hutchinson, Robert. "

SOURCES = [
    # Teacher
    book('Aldwell, Edward, Carl Schachter, and Allen Cadwallader. *Harmony and Voice Leading*. 5th ed., Cengage, 2019.', H, who="teacher"),
    book('Caplin, William E. *Classical Form: A Theory of Formal Functions for the Instrumental Music of Haydn, Mozart, and Beethoven*. Oxford UP, 1998.', ["lessons/cadences.qmd", "lessons/write-an-ending.qmd"], who="teacher",
         note="Caplin reads most textbook plagal cadences as postcadential codettas (confirmed from secondary summaries, not the book itself)."),
    web('Mutch, Caleb. "Blainville\'s New Mode, or How the Plagal Cadence Came to Be \'Plagal\'." *Eighteenth-Century Music*, vol. 12, no. 1, 2015, pp. 69-90. URL.', "https://www.cambridge.org/core/journals/eighteenth-century-music/article/blainvilles-new-mode-or-how-the-plagal-cadence-came-to-be-plagal/0344135AED4A9B21D04DB4C28BDEE679", ["lessons/cadences.qmd"], who="teacher", note="Abstract read."),
    web('Biamonte, Nicole. "Triadic Modal and Pentatonic Patterns in Rock Music." *Music Theory Spectrum*, vol. 32, no. 2, 2010. URL.', "https://escholarship.mcgill.ca/downloads/73666866p", ["lessons/borrowed-chords.qmd", "lessons/cadences.qmd"], who="teacher", note="Abstract and citation checked; end page not confirmed."),
    book('Levine, Mark. *The Jazz Theory Book*. Sher Music, 1995.', JAZZ + ["lessons/minor-changes.qmd"], who="teacher"),
    web('Friberg, Anders, and Andreas Sundström. "Swing Ratios and Ensemble Timing in Jazz Performance: Evidence for a Common Rhythmic Pattern." *Music Perception*, vol. 19, no. 3, 2002, pp. 333-49. URL.', "https://www.speech.kth.se/music/performance/Texts/ensemble_swing.htm", ["lessons/reading-swing.qmd"], who="teacher", note="Link is the authors\' KTH page with sound examples; article itself not read."),
    book('Benadon, Fernando. "Slicing the Beat: Jazz Eighth-Notes as Expressive Microrhythm." *Ethnomusicology*, vol. 50, no. 1, 2006, pp. 73-98.', ["lessons/reading-swing.qmd"], who="teacher", note="Citation confirmed from catalogue records only."),
    book('Covach, John. "Form in Rock Music: A Primer." *Engaging Music: Essays in Music Analysis*, edited by Deborah Stein, Oxford UP, 2005, pp. 65-76.', ["lessons/section-labels.qmd", "lessons/timestamp-player.qmd"], who="teacher"),
    book('Gould, Elaine. *Behind Bars: The Definitive Guide to Music Notation*. Faber Music, 2011.', ["lessons/notation-choices.qmd", "lessons/notation-steps.qmd", "lessons/reading-swing.qmd", "lessons/sing-and-notate.qmd", "lessons/write-an-ending.qmd"], who="teacher"),
    web('Walshaw, Chris, editor. "The abc Music Standard 2.1." *abcnotation.com*, 2011. URL.', "https://abcnotation.com/wiki/abc:standard:v2.1", ["lessons/notation-steps.qmd", "lessons/notation-choices.qmd", "lessons/sing-and-notate.qmd", "lessons/write-an-ending.qmd"], who="teacher"),

    # Student: Music Theory for the 21st-Century Classroom (open textbook)
    web(MT21 + '"Mode Mixture." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/ModeMixture.html", ["lessons/borrowed-chords.qmd"], who="student"),
    web(MT21 + '"The Deceptive Cadence with ♭VI." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/TheDeceptiveCadenceWithFlatSix.html", ["lessons/borrowed-chords.qmd", "lessons/cadences.qmd"], who="student"),
    web(MT21 + '"Cadences." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/cadences.html", ["lessons/cadences.qmd", "lessons/write-an-ending.qmd"], who="student"),
    web(MT21 + '"The Picardy 3rd." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/Picardy3rd.html", ["lessons/minor-changes.qmd"], who="student"),
    web(MT21 + '"Diatonic Chords in Minor." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/DiatonicChordsInMinor.html", ["lessons/minor-changes.qmd"], who="student"),
    web(MT21 + '"Figured Bass Inversion Symbols." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/FiguredBassInversionSymbols.html", ["lessons/inversions.qmd"], who="student"),
    web(MT21 + '"Voice Leading First-Inversion Triads." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/VoiceLeadingFirstInversionTriads.html", ["lessons/inversions.qmd", "lessons/chord-shapes-piano.qmd", "lessons/chord-shapes-piano-hand.qmd"], who="student"),
    web(MT21 + '"Secondary Dominant Chords." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/SecondaryDominants.html", ["lessons/reharmonize.qmd", "lessons/turnarounds.qmd"], who="student"),
    web(MT21 + '"Jazz Chord Voicings." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/JazzChordVoicings.html", JAZZ, who="student"),
    web(MT21 + '"Introduction to Jazz Theory." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/IntroductionToJazzTheory.html", JAZZ, who="student"),
    web(MT21 + '"Form in Popular Music." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/FormInPopularMusic.html", ["lessons/section-labels.qmd", "lessons/timestamp-player.qmd"], who="student"),
    web(MT21 + '"AABA Form." *Music Theory for the 21st-Century Classroom*, U of Puget Sound. URL.', "https://musictheory.pugetsound.edu/mt21c/AABAForm.html", ["lessons/section-labels.qmd", "lessons/turnarounds.qmd"], who="student"),

    # Student: Wikipedia (checked, well-sourced articles)
    wiki("Backdoor progression", "Backdoor_progression", ["lessons/cadences.qmd", "lessons/borrowed-chords.qmd"], who="student"),
    wiki("Plagal cadence", "Plagal_cadence", ["lessons/cadences.qmd"], who="student"),
    wiki("Borrowed chord", "Borrowed_chord", ["lessons/borrowed-chords.qmd"], who="student"),
    wiki("Picardy third", "Picardy_third", ["lessons/minor-changes.qmd"], who="student"),
    wiki("Inversion (music)", "Inversion_(music)", ["lessons/inversions.qmd"], who="student"),
    wiki("Tritone substitution", "Tritone_substitution", ["lessons/turnarounds.qmd", "lessons/reharmonize.qmd"], who="student"),
    wiki("Rhythm changes", "Rhythm_changes", ["lessons/turnarounds.qmd"], who="student"),
    wiki("Swing time", "Swing_(jazz_performance_style)", ["lessons/reading-swing.qmd"], who="student"),
    wiki("Lead sheet", "Lead_sheet", ["lessons/reading-swing.qmd", "lessons/notation-choices.qmd"], who="student"),
    wiki("Numbered musical notation", "Jianpu", ["lessons/notation-choices.qmd"], who="student"),
    wiki("Svara", "Swara", ["lessons/notation-choices.qmd"], who="student"),
    wiki("Song structure", "Song_structure", ["lessons/section-labels.qmd", "lessons/timestamp-player.qmd"], who="student"),
]
