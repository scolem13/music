# Sources for theory/analysed-scores/ (an index page and one page per piece). Checked 20 Oct 2026: each repository and file was fetched; licences as stated in the
# repository (When in Rome: README licence badge, CC BY-SA 4.0) or in the files' own headers.
IDX, BACH, MOON = "theory/analysed-scores/index.qmd", "theory/analysed-scores/bach-o-haupt.qmd", "theory/analysed-scores/beethoven-moonlight-1.qmd"
AS = [IDX, BACH, MOON]
SOURCES = [
    web('Gotham, Mark, et al. *When in Rome: A Meta-Corpus of Functional Harmony*. GitHub. URL.',
        "https://github.com/MarkGotham/When-in-Rome", AS, who="student",
        note="The analyses on this page (RomanText files), licensed CC BY-SA 4.0."),
    web('Tymoczko, Dmitri, analyst. Roman-numeral analyses of the Bach chorales and of Beethoven, Piano Sonata Op. 27 No. 2, in *When in Rome*. URL.',
        "https://github.com/MarkGotham/When-in-Rome/tree/master/Corpus", [BACH, MOON, "theory/modulation.qmd"], who="student",
        note="The chorale's analysis; his readings of the Moonlight are quoted where they differ from Chen and Su's."),
    web('Chen, Tsung-Ping, and Li Su. *BPS-FH: Beethoven Piano Sonata with Functional Harmony* dataset (ISMIR 2018). GitHub. URL.',
        "https://github.com/Tsung-Ping/functional-harmony", [IDX, MOON], who="student",
        note="The source of the Moonlight analysis, converted to RomanText and proof-read by Mark Gotham for When in Rome."),
    web('Nápoles López, Néstor, et al. *BCMH: The Bach Chorales Melody-Harmony Corpus*. GitHub. URL.',
        "https://github.com/napulen/BCMH", [IDX], who="teacher",
        note="A second analysis of the chorale (automated translation to RomanText), not shown on the site."),
    web('Sapp, Craig Stuart, encoder. *370 Four-part Chorales by J. S. Bach in the Humdrum File Format*. GitHub. URL.',
        "https://github.com/craigsapp/bach-370-chorales", [BACH], who="student",
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
        "https://musictheory.pugetsound.edu/mt21c/Modulation.html", MOD + [BACH, MOON], who="student",
        note="Tonicization against modulation, closely related keys, diatonic and chromatic pivot chords, and direct, common-tone and sequential modulation."),
    book('Gordon, Stewart. *Beethoven\'s 32 Piano Sonatas: A Handbook for Performers*. Oxford UP, 2017. Chapter on the Op. 27 set, p. 161.',
        [MOON], who="student", note="The outline of the first movement's form, summarised on this page."),
]
