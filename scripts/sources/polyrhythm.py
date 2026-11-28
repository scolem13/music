# Sources for the Polyrhythm lessons (lessons/poly-*.qmd) and the Polyrhythm tool.
# 2026-11-27: West African / Afro-Cuban patterns and grids checked against Toussaint, The Geometry of Musical Rhythm (2nd ed. 2020; printed page numbers).
# Still from memory: definitions (polyrhythm / polymeter / hemiola), the sayings, jazz and math rock. Toussaint does not define polyrhythm.
PR = ["lessons/poly-basics.qmd", "lessons/poly-west-africa.qmd", "lessons/poly-afro-cuban.qmd",
      "lessons/poly-jazz.qmd", "lessons/poly-math-rock.qmd", "tools/polyrhythm.qmd"]
def book(mla, pages, note="", who=None):
    d = dict(mla=mla, pages=pages, note=note)
    if who: d["who"] = who
    return d

SOURCES = [
    book('Toussaint, Godfried T. *The Geometry of Musical Rhythm: What Makes a "Good" Rhythm Good?* 2nd ed., CRC Press, 2020.',
         ["lessons/poly-west-africa.qmd", "lessons/poly-afro-cuban.qmd", "tools/polyrhythm.qmd"],
         note="Read 2026-11-27. Tresillo [3-3-2] and its use in Cuba, New Orleans second-line drumming and rockabilly, p. 12; wooden claves, p. 17; "
              "gankogui double bell, p. 19; clave son [3-3-4-2-4] (onsets 0, 3, 6, 10, 12 of 16), pp. 24-25; clave rumba [3-4-3-2-4], p. 28; "
              "12-pulse bell patterns [2-2-1-2-2-2-1] (bembe) and [2-2-3-2-3] (fume-fume), both called the standard pattern, pp. 41-42; "
              "four beats of four or three, pp. 42-43; the four regular divisions of twelve in 12-pulse polyrhythmic music, p. 86; "
              "Desmond K. Tai's name \"standard pattern\", Ewe dances that use it and the Cuban bembe, p. 69; "
              "bembe against four, six and three beats, and clave son 3-2 / 2-3, p. 72.", who="student"),
    wiki("Polyrhythm", "Polyrhythm", PR, who="student", note="Unverified: definitions, 3:2 and 4:3, cross-rhythm. Not yet re-read."),
    wiki("Bell pattern", "Bell_pattern", ["lessons/poly-west-africa.qmd", "lessons/poly-afro-cuban.qmd"], who="student",
         note="The 12-pulse standard pattern (1, 1a, 2&, 2a, 3&, 4, 4a) re-read 2026-11-04 and confirmed; gankogui and the Ewe use confirmed in Toussaint 2026-11-27; the credit of the term to A. M. Jones is NOT confirmed (Toussaint credits Desmond K. Tai)."),
    wiki("Clave (rhythm)", "Clave_(rhythm)", ["lessons/poly-afro-cuban.qmd"], who="student",
         note="Son and rumba clave grids, 3-2 / 2-3 and tresillo confirmed in Toussaint 2026-11-27; which side starts a song is unverified. Page not yet re-read."),
    wiki("Math rock", "Math_rock", ["lessons/poly-math-rock.qmd"], who="student",
         note="Unverified: the style's dates and the band list. Not yet re-read."),
]
