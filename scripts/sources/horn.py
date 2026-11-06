# Sources for lessons/horn.qmd and the table in apps/shared/horn/horn-chart.js.
# The teacher book: the scan's "Horn" chapter (printed pp. 176-189; the scan has no title page). Its footer code is "W74",
# the same code as the saxophone chapter's scan; title and authors are not on the pages seen. NOT YET CHECKED.
HN = ["lessons/horn.qmd", "practice/horn-patterns-by-ear.qmd"]
SOURCES = [
    book('"Horn." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 176-89.',
         HN, who="teacher",
         note="Scan pages checked: history, instrument family p. 176; selecting players and parts diagram p. 183; assembly, posture, hand position p. 184; "
              "notes on posture and embouchure p. 185; daily care p. 186; oiling and greasing p. 187; stringing a rotary valve p. 188; Horn Fingering Chart "
              "(written pitch, treble clef, F3-C6: F-horn fingering on top, B-flat horn in brackets, 'use either on a double horn', switch at G-sharp4/A-flat4) p. 189. "
              "The Tone Production Problems and Remedies table is read from the scan's printed p. 169 (trumpet chapter). No tuning section for horn in the pages seen. "
              "Retold in the page's own words; the lever picture is traced from a three-lever template (horn.ai), the thumb lever is the page's own. "
              "Printed page numbers of the chart page and of the pages with clipped headers are unverified."),
    wiki("French horn", "French_horn", HN, who="student",
         note="Unverified: that a horn in F sounds a perfect fifth below written pitch, and the sizes the levers lower the pitch (1 whole step, 2 half step, 3 step and a half). Not yet re-read."),
]
