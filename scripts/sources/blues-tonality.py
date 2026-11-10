# Sources for the Blues Tonality lessons (lessons/blues-tonality-*.qmd).
# Hein's essay: the first half (to "Blues Tonality and Genre") was read word for word on 2026-11-10; the rest only from a summary,
# so lesson 6's genre examples are marked unverified. The theorists named on the pages (Jaffe, Kubik, Titon, van der Merwe, Cutting,
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
