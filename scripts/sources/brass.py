# Sources for lessons/brass-fingerings.qmd and the tables in apps/shared/brass/brass-chart.js.
BR = ["lessons/brass-fingerings.qmd"]
# The teacher book (same scan as scripts/sources/saxophone.py; footer "W74", title and authors not on the scanned pages; Kjos item number NOT YET CHECKED).
BK = ["lessons/trumpet.qmd", "lessons/euphonium.qmd", "lessons/tuba.qmd", "lessons/brass-fingerings.qmd"]
SOURCES = [
    book('"Trumpet," "Baritone, Euphonium, and E-flat Alto Horn," "Tuba." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 160-70, 216-34, 243-53.',
         BK, who="teacher",
         note="Scan pages checked. Trumpet: history and family p. 160; mouthpieces p. 165; mutes, selecting players, parts p. 166; assembly to care p. 167; oiling and checklist p. 168; "
              "tone problems p. 169; tuning p. 170; B-flat Trumpet, Cornet and Flugelhorn chart p. 173. Baritone / euphonium: history and family p. 216; selecting players and parts p. 223-24; "
              "assembly, posture, embouchure, care pp. 224-26; tone problems p. 227; tuning p. 228; B.C. chart p. 233; T.C. chart p. 234. Tuba: parts, assembly, posture p. 243; embouchure and care "
              "pp. 244-45; tone problems and tuning p. 246; BB-flat Tuba and Sousaphone chart p. 251; E-flat Tuba chart p. 252; Tuba T.C. chart p. 253. The tuba history and family, the flugelhorn "
              "description and the horn and trombone chapters between are not in the scan. Page numbers are the book's own print numbers; some are partly cut off in the scan (unverified for those). "
              "Retold in the page's own words; fingering tables read off the charts and checked note by note against the harmonic series."),
    web('"Trumpet Fingering Chart." StepWise Flashcards, StepWise Publications, 2022, URL.',
        "https://stepwisepublications.com", BR, who="teacher",
        note="One-page chart (file name 2022_new_trumpet_fingering_chart.pdf), (c) stepwisepublications.com, 'Correlates with NinGenius Music StepWise Flashcards'. "
             "Redrawn: every fingering, the printed partial rows, the 'skipped partial (too flat)' note and the 3rd-valve-slide footnote for low D and C-sharp. "
             "URL is the one printed on the chart, not a link to the chart itself (unverified)."),
    web('"Essential Range Tuba Fingering Chart." StepWise Flashcards, URL.',
        "https://www.fingeringcharts.org", BR, who="teacher",
        note="One-page chart (file name tubaFingeringChart.pdf), 'Correlates with StepWise Flashcards, www.fingeringcharts.org'. Bass clef, valves 0-123 and the valve-4 "
             "alternates (4, 24). The chart does not say which tuba it is for; the page reads it as B-flat tuba at concert pitch (unverified). "
             "Year and author not printed."),
    wiki("Trumpet", "Trumpet", BR, who="student",
         note="Unverified: the valve intervals (valve 2 half step, 1 whole step, 3 step and a half) and the B-flat trumpet's written-to-concert whole step. Not yet re-read."),
    wiki("Tuba", "Tuba", BR, who="student",
         note="Unverified: that B-flat tubas (BBb) and C tubas exist and that the 4th valve lowers a perfect fourth. Not yet re-read."),
]
