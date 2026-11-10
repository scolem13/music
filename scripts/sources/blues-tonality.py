# Sources for the Blues Tonality lessons (lessons/blues-tonality-*.qmd).
# Hein's essay: read in full on 2026-11-10 (the version of 10 Jan. 2026, through the WordPress API, wp-json/wp/v2/posts/11150; the
# page itself refuses scripts), and every claim on the six pages checked against it. The theorists named on the pages (Jaffe, Kubik, Titon, van der Merwe, Cutting,
# Sutcliffe, Schuller, Fahey, Russell, McClary, Everett, Wagner, Tymoczko, Levine, Temperley) are cited AS QUOTED BY HEIN, not read here.
BT = ["lessons/blues-tonality-intro.qmd", "lessons/blues-tonality-scales.qmd", "lessons/blues-tonality-blue-notes.qmd",
      "lessons/blues-tonality-microtonal.qmd", "lessons/blues-tonality-harmony.qmd", "lessons/blues-tonality-beyond.qmd"]
YT = "https://www.youtube.com/watch?v="
def panos(part, title, vid, pages):
    return web(f'Charalampidis, Panos. "Microtonal Blues Scales p.{part} [{title}]." *YouTube*, URL.', YT + vid, pages, who="student",
               note="Read from the video's English subtitles.")
SOURCES = [
    web('Hein, Ethan. "Blues Tonality." *The Ethan Hein Blog*, 21 Sept. 2014, updated 10 Jan. 2026, URL.',
        "https://www.ethanhein.com/wp/2014/blues-tonality/", BT, who="teacher",
        note="The series' main source; its own reference list has the books and articles named on these pages."),
    wiki("Green Onions", "Green_Onions", ["lessons/blues-tonality-beyond.qmd"], note="A twelve-bar blues; checked 2026-11-10."),
    wiki("Richter-tuned harmonica", "Richter-tuned_harmonica", ["lessons/blues-tonality-beyond.qmd"], who="student",
         note="Layout, keys below / above middle C, positions; checked 2026-11-10."),
    wiki("Harmonica techniques", "Harmonica_techniques", ["lessons/blues-tonality-beyond.qmd"], who="student",
         note="Bending chart: draw 1-6, blow 7-10, 3 draw B to G sharp; checked 2026-11-10."),
    wiki("Diddley bow", "Diddley_bow", ["lessons/blues-tonality-microtonal.qmd"], note="West African (Sahel) origin; checked 2026-11-10."),
    panos(1, "Introduction", "NVWX10c0bNc", ["lessons/blues-tonality-intro.qmd", "lessons/blues-tonality-blue-notes.qmd"]),
    panos(2, "Majorish 4-7 scale", "73ejjQ37WLc", ["lessons/blues-tonality-blue-notes.qmd", "lessons/blues-tonality-microtonal.qmd"]),
    panos(3, "8 ways to approach the Majorish 3rd sound", "YAzLg9hNqiM", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(4, "Majorish 2-6 scale", "IJRMnAoy-mA", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(5, "Extension of Majorish 4-7 & Majorish 2-6 scales", "5FQOazWzAv0", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(6, "Mixing Majorish 4-7 & Majorish 2-6 phrases", "uFn0f3CsTi0", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(7, "Minorish scale", "tg8xGUwQtoM", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(8, "Extension of Minorish scale", "s29rGyqwRGE", ["lessons/blues-tonality-microtonal.qmd"]),
    panos(9, "E7#9 - E7b10 & the Neutral scale", "R3GRexoD6a0", ["lessons/blues-tonality-microtonal.qmd", "lessons/blues-tonality-harmony.qmd"]),
]
