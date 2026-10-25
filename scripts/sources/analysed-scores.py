# Sources for theory/analysed-scores/ (an index page and one page per piece). Checked 20 Oct 2026: each repository and file was fetched; licences as stated in the
# repository (When in Rome: README licence badge, CC BY-SA 4.0) or in the files' own headers.
IDX, BACH, MOON = "theory/analysed-scores/index.qmd", "theory/analysed-scores/bach-o-haupt.qmd", "theory/analysed-scores/beethoven-moonlight-1.qmd"
REGER = "theory/analysed-scores/reger-modulation.qmd"
RK, TCH, ALD, KP = ("theory/analysed-scores/" + x + ".qmd" for x in ["rimsky-korsakov-harmony", "tchaikovsky-harmony", "aldwell-schachter", "kostka-payne"])
MF = "theory/analysed-scores/modulation-finder.qmd"
BOOKS = [REGER, RK, TCH, ALD, KP, MF]
AS = [IDX, BACH, MOON] + BOOKS
SOURCES = [
    web('Gotham, Mark, et al. *When in Rome: A Meta-Corpus of Functional Harmony*. GitHub. URL.',
        "https://github.com/MarkGotham/When-in-Rome", AS, who="student",
        note="The analyses on this page (RomanText files), licensed CC BY-SA 4.0."),
    web('Tymoczko, Dmitri, analyst. Roman-numeral analyses of the Bach chorales and of Beethoven, Piano Sonata Op. 27 No. 2, in *When in Rome*. URL.',
        "https://github.com/MarkGotham/When-in-Rome/tree/master/Corpus", [BACH, MOON, MF, "theory/modulation.qmd"], who="student",
        note="The chorale's analysis; his readings of the Moonlight are quoted where they differ from Chen and Su's."),
    web('Chen, Tsung-Ping, and Li Su. *BPS-FH: Beethoven Piano Sonata with Functional Harmony* dataset (ISMIR 2018). GitHub. URL.',
        "https://github.com/Tsung-Ping/functional-harmony", [IDX, MOON], who="student",
        note="The source of the Moonlight analysis, converted to RomanText and proof-read by Mark Gotham for When in Rome."),
    web('Nápoles López, Néstor, et al. *BCMH: The Bach Chorales Melody-Harmony Corpus*. GitHub. URL.',
        "https://github.com/napulen/BCMH", [IDX], who="teacher",
        note="A second analysis of the chorale (automated translation to RomanText), not shown on the site."),
    web('Sapp, Craig Stuart, encoder. *370 Four-part Chorales by J. S. Bach in the Humdrum File Format*. GitHub. URL.',
        "https://github.com/craigsapp/bach-370-chorales", [BACH, MF], who="student",
        note="The chorale's notes (after Dörffel's edition, Breitkopf & Härtel, c. 1875), converted to ABC for this page."),
    web('Sapp, Craig Stuart, encoder. *Beethoven Piano Sonatas in the Humdrum File Format* (after the Durand 1915 edition, ed. Paul Dukas). GitHub. URL.',
        "https://github.com/craigsapp/beethoven-piano-sonatas", [MOON], who="student",
        note="The sonata's notes, converted to ABC for this page."),
]

# theory/modulation.qmd (ch. 22) and the Moonlight form outline. Checked 21 Oct 2026: each chapter section fetched.
MOD = ["theory/modulation.qmd"]
_H = "Hutchinson, Robert. "
SOURCES += [
    web(_H + '"Modulation." *Music Theory for the 21st-Century Classroom*, ch. 22, U of Puget Sound. URL.',
        "https://musictheory.pugetsound.edu/mt21c/Modulation.html", MOD + [BACH, MOON] + BOOKS, who="student",
        note="Tonicization against modulation, closely related keys, diatonic and chromatic pivot chords, and direct, common-tone and sequential modulation."),
    book('Gordon, Stewart. *Beethoven\'s 32 Piano Sonatas: A Handbook for Performers*. Oxford UP, 2017. Chapter on the Op. 27 set, p. 161.',
        [MOON], who="student", note="The outline of the first movement's form, summarised on this page."),
    # Reger: checked 23 Oct 2026 against the Reger-Werkausgabe biography (1903) and the NYPL and ECU catalogue records.
    book('Reger, Max. *Beiträge zur Modulationslehre*. C. F. Kahnt Nachfolger, 1903. Translated by John Bernhoff as *On the Theory of Modulation*, Kahnt, [1904?]; reprinted as *Supplement to the Theory of Modulation*, Dover, 2007.',
        [IDX, REGER], who="student", note="The book whose 100 examples are shown on the Reger page. Public domain (Reger died in 1916)."),
    web('Nápoles López, Néstor, et al. *Key Modulation Dataset*. GitHub (DDMAL). URL.',
        "https://github.com/DDMAL/key_modulation_dataset", BOOKS, who="teacher",
        note="The encodings and analyses of the textbook examples, translated to RomanText by Nápoles López and copied into When in Rome."),
    # Checked 23 Oct 2026: IMSLP work page (first edition); Tchaikovsky Research (writing, Jurgenson 1872, English 1900);
    # McGraw-Hill table of contents (Kostka chapters 18 and 19).
    # Checked 23 Oct 2026: the OpenScore Lieder README (CC0) in ~/Projects/corpora/OpenScore_Lieder; When in Rome's Lieder analysis headers.
    web('OpenScore. *OpenScore Lieder Corpus*. GitHub. URL.', "https://github.com/OpenScore/Lieder", [MF], who="student",
        note="The songs' notes (MusicXML, CC0), from which the finder's song passages are cut; the words are left out."),
    web('*Working in Harmony* (app). Fourscore and More. URL.', "https://fourscoreandmore.org/apps/working-in-harmony/", [MF], who="teacher",
        note="Where the song analyses in When in Rome were made, by contributors, and proof-read by Mark Gotham."),
    web('Rimsky-Korsakov, Nikolay. *Practical Manual of Harmony*. A. Büttner, 1886. IMSLP. URL.',
        "https://imslp.org/wiki/Practical_Manual_of_Harmony_(Rimsky-Korsakov,_Nikolay)", [IDX, RK], who="student",
        note="The book whose modulation examples are on the Rimsky-Korsakov page; IMSLP has scans of later editions."),
    web('Tchaikovsky Research. "Guide to the Practical Study of Harmony." URL.',
        "https://en.tchaikovsky-research.net/pages/Guide_to_the_Practical_Study_of_Harmony", [IDX, TCH], who="student",
        note="When and how Tchaikovsky wrote the book (1871, from his Moscow Conservatory lectures); Jurgenson, 1872; English translation by Emil Krall and James Liebling, 1900."),
    book('Aldwell, Edward, Carl Schachter, and Allen Cadwallader. *Harmony and Voice Leading*.',
        [IDX, ALD], who="student", note="Chapter 27, the source of the examples on the Aldwell and Schachter page. The dataset names the three authors but not the edition, which has not been checked."),
    web('Kostka, Stefan, Dorothy Payne, and Byron Almén. *Tonal Harmony*. 8th ed., McGraw-Hill, 2018. Table of contents. URL.',
        "https://highered.mheducation.com/sites/0078025141/information_center_view0/table_of_contents.html", [IDX, KP], who="student",
        note="Chapters 18 (Modulations Using Diatonic Common Chords) and 19 (Some Other Modulatory Techniques), the source of the examples on the Kostka and Payne page."),
    web('Reger-Werkausgabe. "1903." *Max Reger: Biography*. Max-Reger-Institut. URL.',
        "https://www.maxreger.info/biography/1903", [REGER], who="teacher",
        note="When Reger wrote the book and how it came to be published by Kahnt."),
]
