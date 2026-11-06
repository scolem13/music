# Sources for lessons/trombone.qmd and the slide-position table in apps/shared/trombone/trombone-chart.js.
# The teacher book: a scan of pp. 196-215 (the "Trombone" chapter, footer "W74", the same footer as the saxophone chapter). Its title and authors
# are not on the scanned pages: W74 is read as Kjos's catalogue number, NOT YET CHECKED (as in saxophone.py). Fix the entry once the cover is seen.
TB = ["lessons/trombone.qmd"]
SOURCES = [
    book('"Trombone." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 196-215.',
         TB, who="teacher",
         note="Scan pages checked: history and family p. 196; mouthpieces and mutes p. 201; parts, player qualifications and assembly p. 202; posture, embouchure and putting away p. 203; "
              "oiling and greasing, brass checklist p. 204; tone problems table p. 205; tuning, F attachment (first purpose) p. 206; listening suggestions p. 213; "
              "Trombone B.C. Position Chart p. 214 (every position read note by note from a 250 dpi render); Trombone T.C. Position Chart p. 215 (same positions, treble clef). "
              "Pages 197-200 and 207-212 are not in the scan, so the alto and valve trombone, bass trombone valves and the second purpose of the F attachment beyond the two examples on p. 206 are not covered. "
              "Retold in the page's own words; the slide drawing is the teacher's (trombone SVGs folder)."),
    wiki("Trombone", "Trombone", TB, who="student",
         note="Unverified: that each slide position lowers the pitch about a half step and the partial series of a B-flat tenor trombone. Not yet re-read."),
]
