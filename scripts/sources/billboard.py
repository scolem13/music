# The McGill Billboard SALAMI chords files (apps/shared/data/billboard, scripts/billboard-import.mjs), opened in Timestamp Notes and
# listed in the Tune Directory. Checked 26 Oct 2026: the project page (WebFetch) says the annotations are CC0 and asks for this paper.
P = ["tools/timestamp-notes.qmd", "practice/tune-directory.qmd", "tools/pop-themes.qmd"]   # (Pop Themes: the Billboard chords BiMMuDa sections use, and CoCoPops' base)
SOURCES = [
    web('Burgoyne, John Ashley, Jonathan Wild, and Ichiro Fujinaga. "An Expert Ground Truth Set for Audio Chord Recognition and Music Analysis." *Proceedings of the 12th International Society for Music Information Retrieval Conference*, Miami, 2011, pp. 633–38. The 890 SALAMI chords files of the McGill Billboard Project (songs from the Billboard Hot 100, 1958–1991): sections, bars and chords, timed; released under CC0. URL.', "https://ddmal.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/", P),
    # Isophonics: the site is cited; the annotators' paper is not cited because it has not been checked (rule 4).
    web('Isophonics. Centre for Digital Music, Queen Mary, University of London, isophonics.net. Beatles chord, key, beat and segment annotations, personal and educational use. URL.', "http://isophonics.net/", P),
]
