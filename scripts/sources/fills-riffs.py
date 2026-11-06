# Sources for the Fills, Riffs and Licks lesson (lessons/fills-riffs.qmd) and the band's figures (harmony.js FIGURES).
# Checked 4 Nov 2026: "Fill (music)" read by WebFetch (definition, where fills go, non-drum fills, riffs repeat). The Riff and
# Power ballad pages could not be loaded that day; the lesson marks what rests on them as unverified.
FR = ["lessons/fills-riffs.qmd"]
SOURCES = [
    # the song riffs read from notation (scripts/riffs/riffs-src.json)
    web("\"(I Can’t Get No) Satisfaction.\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/(I_Can’t_Get_No)_Satisfaction", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's satisfaction riff."),
    web("\"Day Tripper.\" *Wikipedia (Italian)*, Wikimedia Foundation.", "https://it.wikipedia.org/wiki/Day_Tripper", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's dayTripper riff."),
    web("\"Another One Bites the Dust.\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/Another_One_Bites_the_Dust", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's biteDust riff."),
    web("\"Money (Pink-Floyd-Lied).\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/Money_(Pink-Floyd-Lied)", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's money riff."),
    web("\"Stairway to Heaven.\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/Stairway_to_Heaven", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's stairway riff."),
    web("\"Johnny B. Goode.\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/Johnny_B._Goode", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's johnnyB riff."),
    web("\"Stand by Me (Lied).\" *Wikipedia (German)*, Wikimedia Foundation.", "https://de.wikipedia.org/wiki/Stand_by_Me_(Lied)", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's standByMe riff."),
    web("\"Black Sabbath (song).\" *Wikipedia*, Wikimedia Foundation.", "https://en.wikipedia.org/wiki/Black_Sabbath_(song)", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's blackSabbath riff."),
    web("\"Layla.\" *Wikipedia*, Wikimedia Foundation.", "https://en.wikipedia.org/wiki/Layla", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's layla riff. The page prints \"a' 16\" in the third riff; read as a'16 (with the space, LilyPond repeats the note and the bar comes to 4 1/4 beats)."),
    web("\"Theme from Mission: Impossible.\" *Wikipedia*, Wikimedia Foundation.", "https://en.wikipedia.org/wiki/Theme_from_Mission:_Impossible", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's missionBass riff."),
    web("\"Ashes to Ashes (David Bowie song).\" *Wikipedia*, Wikimedia Foundation.", "https://en.wikipedia.org/wiki/Ashes_to_Ashes_(David_Bowie_song)", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's ashes riff."),
    web("\"Shave and a Haircut.\" *Wikipedia*, Wikimedia Foundation.", "https://en.wikipedia.org/wiki/Shave_and_a_Haircut", FR, who="student", note="Music example (LilyPond) read 2026-11-04 by scripts/riffs/lily2fig.mjs: the band's shave riff."),
    wiki("Fill (music)", "Fill_(music)", FR, who="student",
         note="Read 2026-11-04: fill defined; breaks between phrases, especially their ends; guitar, bass, organ, keyboard, horn fills; a riff repeats exactly."),
    wiki("Riff", "Riff", FR, who="student", note="Not yet re-read (fetch timed out 2026-11-04)."),
    web('"A Pedagogical Approach to Minor Pentatonic Riffs in Rock Music." *Journal of Music Theory Pedagogy*.',
        "https://journals.ou.edu/jmtp/article/view/658", FR, who="teacher",
        note="Found 2026-11-04 by search; riffs confirm the tonic in late-60s/70s rock and funk; pentatonic pitch material. Article not yet read in full."),
]
