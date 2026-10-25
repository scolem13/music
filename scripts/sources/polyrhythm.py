# Sources for the Polyrhythm lessons (lessons/poly-*.qmd) and the Polyrhythm tool.
# NOT YET CHECKED (24 Oct 2026): the pages mark their facts from memory as unverified. Re-read these and drop the marks.
PR = ["lessons/poly-basics.qmd", "lessons/poly-west-africa.qmd", "lessons/poly-afro-cuban.qmd",
      "lessons/poly-jazz.qmd", "lessons/poly-math-rock.qmd", "tools/polyrhythm.qmd"]
SOURCES = [
    wiki("Polyrhythm", "Polyrhythm", PR, who="student", note="Unverified: definitions, 3:2 and 4:3, cross-rhythm. Not yet re-read."),
    wiki("Bell pattern", "Bell_pattern", ["lessons/poly-west-africa.qmd", "lessons/poly-afro-cuban.qmd"], who="student",
         note="Unverified: the 12-pulse standard pattern, gankogui, A. M. Jones's term. Not yet re-read."),
    wiki("Clave (rhythm)", "Clave_(rhythm)", ["lessons/poly-afro-cuban.qmd"], who="student",
         note="Unverified: son and rumba clave, 3-2 / 2-3, tresillo. Not yet re-read."),
    wiki("Math rock", "Math_rock", ["lessons/poly-math-rock.qmd"], who="student",
         note="Unverified: the style's dates and the band list. Not yet re-read."),
]
