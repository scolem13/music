# Sources for the Grooves vs Songs lessons (lessons/grooves-*.qmd) and Hein's examples in the Tune Directory
# (scripts/works/hein/hein-works.py). Read 2026-11-10 through a fetch agent: the Substack post in full; the podcast page's track list
# only (audio not heard). His 2020 blog post "Songs vs grooves" (ethanhein.com) could not be read (connection refused).
GS = ["lessons/grooves-songs.qmd", "lessons/grooves-learning.qmd"]
SOURCES = [
    web('Hein, Ethan. "Pieces vs Songs vs Grooves." *Ethan Teaches You Music*, Substack, 6 June 2021, URL.',
        "https://ethanhein.substack.com/p/pieces-vs-songs-vs-grooves", GS + ["practice/tune-directory.qmd"], who="student",
        note="Definitions, examples by category and the claims about notation and music education."),
    web('Hein, Ethan. "Songs vs Grooves." *Ethan Teaches You Music Podcast*, Substack, 3 June 2026, URL.',
        "https://ethanhein.substack.com/p/songs-vs-grooves-59a", ["lessons/grooves-learning.qmd", "practice/tune-directory.qmd"], who="student",
        note="Track list only; the audio was not heard."),
    book("Danielsen, Anne. *Presence and Pleasure: The Funk Grooves of James Brown and Parliament*. Wesleyan UP, 2006.",
         GS, who="teacher", note="Cited as Hein cites it (the song / groove distinction); not read here."),
]
