# Sources for the Percussion and Snare Drum lessons (and the rudiment table in apps/shared/percussion/rudiments.js).
# The teacher book: a scan of its percussion chapter, printed pp. 266-303 (footer "W74"; only some pages of that range were scanned:
# the contents page, 273, 276, 285-302). The scan has no title page: W74 is read as Kjos's catalogue number (as for the saxophone
# chapter), NOT YET CHECKED. Timpani, mallet percussion and the accessory instruments are listed in its contents but were not in the scan.
PC = ["lessons/percussion.qmd", "lessons/snare-drum.qmd"]
SOURCES = [
    book('"Percussion." Teacher resource book, Neil A. Kjos Music Company (item W74; title and authors unverified), pp. 266-303.',
         PC, who="teacher",
         note="Grip, the four basic strokes, snare drum parts / set-up / playing / rim work / snares off / brushes / rolls / rudiments, bass drum, "
              "changing and tuning heads. Retold in the page's own words; the labelled drawings are redrawn, not copied. Only the scanned pages were read "
              "(contents, pp. 273, 276, 285-302); the rest of the chapter was not."),
    web('Percussive Arts Society. "International Drum Rudiments." PAS, URL.',
        "https://pas.org/resources/rudiments/", ["lessons/snare-drum.qmd"], who="teacher",
        note="The forty rudiments the book names. Not read for this page: the stickings of the flam tap, flam accent, double paradiddle, "
             "paradiddle-diddle and five-stroke roll in the rudiment player are from memory and unchecked."),
]
