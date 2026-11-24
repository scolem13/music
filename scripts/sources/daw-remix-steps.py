# Sources for lessons/daw-remix-steps.qmd (Remix Lab: make your own remix, step by step).
# 24 Nov 2026: web fetches failed (no network from the writing session), so nothing here has been read yet;
# the page marks its tempo and copyright facts "unverified" until these are checked.
RS = ["lessons/daw-remix-steps.qmd"]
SOURCES = [
    web('U.S. Copyright Office. "More Information on Fair Use." *Copyright.gov*, URL.',
        "https://www.copyright.gov/fair-use/", RS, who="teacher",
        note="Not yet read (fetch failed 2026-11-24): the four fair-use factors; credit alone does not make a use fair."),
    web('"House Music." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/House_music", RS, who="student",
        note="Not yet read (fetch failed 2026-11-24): four-on-the-floor kick, typical tempo."),
    web('"Techno." *Wikipedia*, URL.', "https://en.wikipedia.org/wiki/Techno", RS, who="student",
        note="Not yet read (fetch failed 2026-11-24): typical tempo."),
]
