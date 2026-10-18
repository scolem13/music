#!/usr/bin/env python3
"""Works Cited (MLA 9) for every page that cites sources, and the site-wide bibliography.

All sources live in SOURCES below, each with the pages that use it. Running
    python3 scripts/works-cited.py
rewrites the block between <!-- works-cited --> and <!-- /works-cited --> on each page (adding a
"## Works Cited" section at the end of a page that has none) and writes bibliography.qmd, which lists
every source with links to the lessons that use it. Entries are markdown; italics with *...*.
Pages with numbered references (inharmonicity: [[1]](#r1)) keep their numbers: give the entry `ref`.
Access dates are left out (optional in MLA 9); the DAW pages say when they were checked.
"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

T, B, P, A, M, R, E, X = ("lessons/daw-%s.qmd" % s for s in
    "timeline beat pianoroll arrange mixer record export real".split())
DAW = [T, B, P, A, M, R, E, X]
INH, WMB, WMC, CON, SCA = ("lessons/inharmonicity.qmd", "lessons/watermelon-man-blues.qmd",
    "lessons/watermelon-congas.qmd", "lessons/congas-basics.qmd", "tools/scales.qmd")

SW, SC, SP, SB, SF, SL = ("lessons/sampling-%s.qmd" % s for s in "what chop pitch beat flip law".split())
DG, DB, DP, DE, DS, DH, DT = ("lessons/dj-%s.qmd" % s for s in "gear beatmatch phrasing eq scratch harmonic set".split())
DJ = [DG, DB, DP, DE, DS, DH, DT]

def live(title, slug, pages):
    return dict(mla=f'"{title}." *Ableton Reference Manual Version 12*, Ableton, [www.ableton.com/en/live-manual/12/{slug}/](https://www.ableton.com/en/live-manual/12/{slug}/).', pages=pages)
def logic(title, slug, pages):
    return dict(mla=f'"{title}." *Logic Pro User Guide for Mac*, Apple, [support.apple.com/guide/logicpro/{slug}/mac](https://support.apple.com/guide/logicpro/{slug}/mac).', pages=pages)
def bl(title, art, pages):
    return dict(mla=f'"{title}." *BandLab Help Center*, BandLab Technologies, [help.bandlab.com/hc/en-us/articles/{art}](https://help.bandlab.com/hc/en-us/articles/{art}).', pages=pages)
def wiki(title, slug, pages, ref=None, note=""):
    d = dict(mla=f'"{title}." *Wikipedia*, Wikimedia Foundation, [en.wikipedia.org/wiki/{slug}](https://en.wikipedia.org/wiki/{slug}).', pages=pages, note=note)
    if ref: d["ref"] = ref
    return d
def web(mla, url, pages, ref=None, note=""):
    shown = re.sub(r"^https?://", "", url)
    d = dict(mla=mla.replace("URL", f"[{shown}]({url})"), pages=pages, note=note)
    if ref: d["ref"] = ref
    return d

SOURCES = [
    # ---- Sampling and DJ lessons
    wiki("Sampling (Music)", "Sampling_(music)", [SW, SC, SF, SL]),
    wiki("Breakbeat", "Breakbeat", [SW, SB]),
    wiki("Amen Break", "Amen_break", [SW]),
    wiki("DJ Kool Herc", "DJ_Kool_Herc", [SW]),
    wiki("Akai MPC", "Akai_MPC", [SC, SP, SB]),
    wiki("Roland SP-404", "Roland_SP-404", [SC, SP, SB]),
    wiki("Audio Time Stretching and Pitch Scaling", "Audio_time_stretching_and_pitch_scaling", [SP, DH]),
    live("Live Instrument Reference", "live-instrument-reference", [SC]),
    live("Audio Clips, Tempo, and Warping", "audio-clips-tempo-and-warping", [SP]),
    wiki("Remix", "Remix", [SF]),
    wiki("Mashup (Music)", "Mashup_(music)", [SF]),
    wiki("Grand Upright Music, Ltd. v. Warner Bros. Records Inc.", "Grand_Upright_Music,_Ltd._v._Warner_Bros._Records_Inc.", [SL]),
    wiki("Campbell v. Acuff-Rose Music, Inc.", "Campbell_v._Acuff-Rose_Music,_Inc.", [SL]),
    wiki("Newton v. Diamond", "Newton_v._Diamond", [SL]),
    wiki("Bridgeport Music, Inc. v. Dimension Films", "Bridgeport_Music,_Inc._v._Dimension_Films", [SL]),
    wiki("VMG Salsoul v. Ciccone", "VMG_Salsoul_v._Ciccone", [SL]),
    web('United States Copyright Office. *Copyright Registration for Sound Recordings* (Circular 56A). URL.', "https://www.copyright.gov/circs/circ56a.pdf", [SL]),
    web('United States Copyright Office. "U.S. Copyright Office Fair Use Index." URL.', "https://www.copyright.gov/fair-use/", [SL]),
    web('United States Copyright Office. *Copyright Law of the United States*, Title 17, Chapter 1. URL.', "https://www.copyright.gov/title17/92chap1.html", [SL, DT]),
    wiki("Disc Jockey", "Disc_jockey", [DG, DT]),
    wiki("Technics SL-1200", "Technics_SL-1200", [DG, DS]),
    wiki("CDJ", "CDJ", [DG]),
    wiki("DJ Mixer", "DJ_mixer", [DG, DE]),
    wiki("Crossfader", "Crossfader", [DG, DE, DS]),
    wiki("Beatmatching", "Beatmatching", [DB, DP]),
    wiki("DJ Mix", "DJ_mix", [DP, DE, DT]),
    wiki("Scratching", "Scratching", [DS]),
    wiki("Harmonic Mixing", "Harmonic_mixing", [DH]),
    wiki("Camelot Wheel", "Camelot_Wheel", [DH]),
    web('"Harmonic Mixing Guide." *Mixed In Key*, URL.', "https://mixedinkey.com/harmonic-mixing-guide/", [DH, DT]),
    web('*Serato DJ Pro Software Manual*. Serato, downloads page, URL.', "https://serato.com/dj/pro/downloads", DJ),
    web('*rekordbox Operating Instructions*. AlphaTheta, downloads page, URL.', "https://rekordbox.com/en/download/", DJ),
    web('*Traktor Pro Manual*. Native Instruments, downloads page, URL.', "https://www.native-instruments.com/en/support/downloads/", DJ),
    # ---- DAW lessons: Ableton Live 12
    live("Arrangement View", "arrangement-view", [T, A, X]),
    live("Automation and Editing Envelopes", "automation-and-editing-envelopes", [M, X]),
    live("Comping", "comping", [R, X]),
    live("First Steps", "first-steps", [R, X]),
    live("Managing Files and Sets", "managing-files-and-sets", [P, E, X]),
    live("Recording New Clips", "recording-new-clips", [T, B, R, X]),
    live("Routing and I/O", "routing-and-i-o", [R, X]),
    live("Editing MIDI", "editing-midi", [B, P]),
    dict(mla='"Live Keyboard Shortcuts." *Ableton Reference Manual Version 12*, Ableton, [www.ableton.com/en/manual/live-keyboard-shortcuts/](https://www.ableton.com/en/manual/live-keyboard-shortcuts/).', pages=DAW),
    web('"Driver Error Compensation." *Ableton Help*, Ableton, URL.', "https://help.ableton.com/hc/en-us/articles/115000234830", [R, X]),
    web('"Setting Up an Audio Interface." *Ableton Help*, Ableton, URL.', "https://help.ableton.com/hc/en-us/articles/211476789", [X]),
    # ---- Logic Pro
    logic("Add Automation Points", "add-automation-points-lgcpb1a3327b", [M, X]),
    logic("Add, Remove, Move, and Copy Plug-ins", "add-remove-move-and-copy-plug-ins-lgcpbc218a22", [M, X]),
    logic("Apple Loops in Logic Pro", "apple-loops-in-logic-pro-lgcp734a05f6", [E, X]),
    logic("Audio Devices Settings", "audio-devices-settings-lgcpbb81aca5", [R, X]),
    logic("Bounce a Project to an Audio File", "bounce-a-project-to-an-audio-file-lgcp785a41c3", [E, X]),
    logic("Comping Overview", "comping-overview-lgcp317d758e", [R, X]),
    logic("Create Projects", "create-projects-lgcpce0f09d9", [T, X]),
    logic("Create Tracks", "create-tracks-lgcpff5da064", [T, X]),
    logic("Quantize the Timing of Notes", "quantize-the-timing-of-notes-lgcpfa6e7f80", [B, P, X]),
    logic("Record Sound from a Microphone or Electric Instrument", "record-sound-a-microphone-electric-instrument-lgcpb19e49e4", [R, X]),
    logic("Repeat Regions", "repeat-regions-lgcpe51317b6", [A, X]),
    logic("Session Players Overview", "session-players-overview-lgcpbf624405", [A, X]),
    logic("Show Automation Curves", "show-automation-curves-lgcpb1a3f099", [M, X]),
    logic("Split Regions", "split-regions-lgcpf7c0e886", [A, X]),
    logic("Standard MIDI Files", "standard-midi-files-lgcpdf6a3851", [P, E, X]),
    logic("Step Sequencer Overview", "step-sequencer-overview-lgcp39acefc9", [B, X]),
    logic("Turn On Input Monitoring for Audio Tracks", "turn-on-input-monitoring-for-audio-tracks-lgcpbfbefa96", [R, X]),
    logic("Use Project Alternatives and Backups", "use-project-alternatives-and-backups-lgcpa158ef77", [X]),
    logic("Use the Cycle Area", "use-the-cycle-area-lgcp59e41e86", [T, X]),
    logic("Use the Metronome", "use-the-metronome-lgcp0534986f", [T, X]),
    web('"Manage Input Monitoring Latency in Logic Pro." *Apple Support*, Apple, URL.', "https://support.apple.com/105040", [R, X]),
    # ---- BandLab
    bl("Getting Started with the BandLab Studio", "115002945153-Getting-Started-with-the-BandLab-Studio", [T, X]),
    bl("Studio Keyboard Shortcuts", "360021363353-Studio-Keyboard-Shortcuts", DAW),
    bl("Using the Metronome", "115002960274-Using-the-Metronome", [T, X]),
    bl("Supported Import and Export File Formats", "360036010533-Supported-Import-and-Export-File-Formats", [E, X]),
    bl("How Do I Export MIDI Files?", "360019607454-How-do-I-export-MIDI-files", [P, E, X]),
    bl("How Do I Download Tracks?", "115002959774-How-do-I-download-tracks", [E, X]),
    bl("Fixing Latency", "115002959414-Fixing-Latency", [R, X]),
    bl("Latency Issues", "58874563630361-Latency-Issues", [R, X]),
    bl("Slicing and Merging Regions", "57252800910745-Slicing-and-Merging-Regions", [A, X]),
    bl("Duplicating and Extending Regions", "57253754933529-Duplicating-and-Extending-Regions", [A, X]),
    bl("How Do I Edit MIDI Tracks?", "360022659314-How-do-I-edit-MIDI-tracks", [B, P, X]),
    web('"Studio FAQ." *BandLab Blog*, BandLab Technologies, URL.', "https://blog.bandlab.com/studio-faq/", [R, X]),
    web('"Mix Editor." *BandLab Blog*, BandLab Technologies, URL.', "https://blog.bandlab.com/mix-editor/", [M, X]),

    # ---- Watermelon Man and congas
    wiki("Watermelon Man (Composition)", "Watermelon_Man_(composition)", [WMB, WMC]),
    wiki("Sixteen-Bar Blues", "Sixteen-bar_blues", [WMB]),
    wiki("Takin' Off", "Takin%27_Off", [WMB]),
    wiki("Blues", "Blues", [WMB]),
    wiki("Tumbao", "Tumbao", [WMC, CON], note="Cites Rebeca Mauleón, *Salsa Guidebook*."),
    wiki("Conga", "Conga", [CON]),
    wiki("Drum stick", "Drum_stick", ["lessons/drum-grips.qmd"]),
    wiki("Traditional grip", "Traditional_grip", ["lessons/drum-grips.qmd"]),
    wiki("Moeller method", "Moeller_method", ["lessons/drum-grips.qmd"]),
    wiki("Brush (percussion)", "Brush_(percussion)", ["lessons/drum-brushes.qmd"]),
    wiki("Cajón", "Caj%C3%B3n", ["lessons/cajon-basics.qmd"]),
    web('"Watermelon Man: Herbie Hancock\'s Classic Tune." *uDiscover Music*, URL.', "https://www.udiscovermusic.com/stories/watermelon-man-herbie-hancock-feature", [WMB, WMC], note="Quotes Herbie Hancock and Lisa Dickey, *Possibilities*, Viking, 2014."),
    web('Hein, Ethan. "Watermelon Man." *Substack*, URL.', "https://ethanhein.substack.com/p/watermelon-man", [WMC]),
    web('Hein, Ethan. "Watermelon Man." *The Ethan Hein Blog*, 2022, URL.', "https://ethanhein.com/wp/2022/watermelon-man/", [WMB]),
    web('"Mongo Santamaría: Watermelon Man." *Jazz.com*, URL.', "https://jazz.com/music/mongo-santamaria-watermelon-man", [WMC]),
    web('"Takin\' Off." *Herbie Hancock*, URL.', "https://www.herbiehancock.com/music/discography/album/takin-off/", [WMB], note="Quotes the album's liner notes (Blue Note, 1962)."),
    web('"Herbie Hancock Interviewed." *MOJO*, URL.', "https://www.mojo4music.com/articles/stories/herbie-hancock-interviewed/", [WMB]),
    web('Carter. "Eight-Bar and Sixteen-Bar Blues Forms." *Music Theory Online*, vol. 31, no. 1, 2025, URL.', "https://www.mtosmt.org/issues/mto.25.31.1/mto.25.31.1.carter.php", [WMB]),
    web('"Watermelon Man." *AllSolos*, URL.', "https://www.allsolos.com/tune/77/watermelon-man", [WMB]),
    web('"Watermelon Man." *Standard Repertoire*, URL.', "https://standardrepertoire.com/watermelon-man.html", [WMB]),
    web('"Watermelon Man." *Learn Jazz Standards*, URL.', "https://learnjazzstandards.com/?p=6627", [WMB]),
    web('"Watermelon Man." *JazzFuel*, URL.', "https://jazzfuel.com/watermelon-man/", [WMB]),
    web('"Watermelon Man Guitar." *FretDojo*, URL.', "https://fretdojo.com/watermelon-man-guitar/", [WMB]),
    web('"Watermelon Man by Herbie Hancock." *Hooktheory TheoryTab*, URL.', "https://www.hooktheory.com/theorytab/view/herbie-hancock/watermelon-man", [WMB]),
    web('Pistelli, John. "Albert Murray, *The Hero and the Blues*." *John Pistelli*, 19 May 2018, URL.', "https://johnpistelli.com/2018/05/19/albert-murray-the-hero-and-the-blues/", [WMB]),
    web('"Congas: First Steps." *Thomann Online Expert*, Thomann, URL.', "https://www.thomannmusic.com/onlineexpert_page_congas_first_steps.html", [CON]),
    dict(mla="Teacher's handout on conga stroke types and the tumbao pattern. Unpublished classroom material.", pages=[CON]),

    # ---- Scales tool
    web('Aebersold, Jamey. *Scale Syllabus*. Jamey Aebersold Jazz, URL.', "https://www.jazzbooks.com/mm5/download/FREE-scale-syllabus.pdf", [SCA]),

    # ---- Inharmonicity (numbered; `ref` is the id used in the text)
    web('Fletcher, Harvey, et al. "Quality of Piano Tones." *The Journal of the Acoustical Society of America*, vol. 34, no. 6, 1962, pp. 749–61. URL.', "https://physics.byu.edu/docs/publication/1504", [INH], "r1", "Abstract and a summary read only."),
    web('"Inharmonicity." ELE 369 course notes, University of Rhode Island, URL.', "https://www.ele.uri.edu/courses/ele369g/14a_Inharmonicity.pdf", [INH], "r2", "Found through a search snippet; the PDF text would not extract."),
    web('"Research: The Missing Stretch Physics in Pianoteq Steinway D." *Modartt Forum*, URL.', "https://forum.modartt.com/viewtopic.php?id=12942", [INH], "r3", "A forum post, not peer-reviewed."),
    wiki("Piano Acoustics", "Piano_acoustics", [INH], "r4"),
    wiki("Inharmonicity", "Inharmonicity", [INH], "r5"),
    web('Wolfe, Joe. "Strings, Standing Waves and Harmonics." *Music Acoustics*, University of New South Wales, URL.', "https://newt.phys.unsw.edu.au/jw/strings.html", [INH], "r6"),
    web('Wolfe, Joe. "How Harmonic Are Harmonics?" *Music Acoustics*, University of New South Wales, URL.', "https://newt.phys.unsw.edu.au/jw/harmonics.html", [INH], "r7"),
    web('Allen, Jont B. "On the Aging of Steel Guitar Strings." Post to the AUDITORY mailing list, 2005, URL.', "https://auditory.org/mhonarc/2005/msg00041.html", [INH], "r8", "Describes Allen's 1976 *Catgut Acoustical Society Newsletter* article (not retrieved) and cites J. C. Brown, *JASA* 95, 1994, p. 2889 (not read)."),
    web('Fletcher, Neville H. "Mode Locking in Nonlinearly Excited Inharmonic Musical Oscillators." *The Journal of the Acoustical Society of America*, vol. 64, 1978, pp. 1566–69. URL.', "https://www.phys.unsw.edu.au/music/people/publications/Fletcher1978.pdf", [INH], "r9", "Abstract only, via a search summary."),
    web('Giordano, Nicholas J. "Explaining the Railsback Stretch in Terms of the Inharmonicity of Piano Tones and Sensory Dissonance." 2015, *AUrora*, Auburn University, URL.', "https://aurora.auburn.edu/handle/11200/48533", [INH], "r10", "With O. L. Railsback (1938), *JASA* 9(3) suppl., p. 274, as cited in [4], and D. Koenig, *Spectral Analysis of Musical Sounds with Emphasis on the Piano*, Oxford UP, 2014 (abstract only)."),
    web('"Producing a Harmonic Sequence of Notes with a Trumpet." *HyperPhysics*, Georgia State University, URL.', "https://hyperphysics.gsu.edu/hbase/Music/brassa.html", [INH], "r11", "Read through a search summary."),
    web('Wolfe, Joe. "Clarinet Acoustics." *Music Acoustics*, University of New South Wales, URL.', "https://newt.phys.unsw.edu.au/jw/clarinetacoustics.html", [INH], "r12"),
    web('Henrich, Nathalie, et al. "Vocal Tract Resonances in Singing: Strategies Used by Sopranos, Altos, Tenors, and Baritones." University of New South Wales, URL.', "https://www.phys.unsw.edu.au/jw/reprints/SATB.pdf", [INH], "r13", "With Joliveau, Smith and Wolfe, *Nature*, 2004, and Smith and Wolfe, *JASA Express Letters*, 2009. Read through search summaries; journal citation not confirmed."),
    web('Wolfe, Joe. "The Didjeridu." *Music Acoustics*, University of New South Wales, URL.', "https://newt.phys.unsw.edu.au/jw/didjeridu.html", [INH], "r14"),
    web('Bergevin, Christopher, et al. "Overtone Focusing in Biphonic Tuvan Throat Singing." *eLife*, vol. 9, 2020, e50476, URL.', "https://elifesciences.org/articles/50476", [INH], "r15"),
    web('"Percussion." Music 150 course notes, Stanford University CCRMA, URL.', "https://ccrma.stanford.edu/CCRMA/Courses/150/percussion.html", [INH], "r16"),
    web('"The Construction and Tuning of Vibrating Bars." *Mechanical Music Digest*, URL.', "https://www.mmdigest.com/gallery/technical/xylobars", [INH], "r17"),
    web('Yoo, Jesse, and Thomas D. Rossing. "Undercut Bars." Acoustical Society of America, URL.', "https://acoustics.org/2704-2/", [INH], "r18", "With patents US5198602 (patents.google.com/patent/US5198602) and EP0723255 (European Patent Office)."),
    web('La Favre, Jeff. "Tuning a Marimba Bar." URL.', "https://lafavre.us/tuning-marimba.htm", [INH], "r19", "Cites Bork, I., et al., *Acta Acustica*, vol. 85, 1999, pp. 258–66 (not read). With \"Automatic Multi-Modal Tuning of Idiophone Bars,\" *espace*, Curtin University, espace.curtin.edu.au/handle/20.500.11937/68."),
    dict(ref="r20", mla="Rossing, Thomas D. *Science of Percussion Instruments*. World Scientific, 2000.", pages=[INH], note="Not read directly; cited via [21] and [22]."),
    web('"Tubular Bells." *HyperPhysics*, Georgia State University, URL.', "https://hyperphysics.gsu.edu/hbase/Music/tbell.html", [INH], "r21", "With Wikipedia, \"Tubular Bells\" (citing Rossing 2000, pp. 67–69), en.wikipedia.org/wiki/Tubular_bells."),
    web('Hibbert, William A. *The Quantification of Strike Pitch and Pitch Shifts in Church Bells*. 2008. Open University, PhD thesis, URL.', "https://oro.open.ac.uk/44498", [INH], "r22", "With Wikipedia, \"Strike Tone,\" en.wikipedia.org/wiki/Strike_tone."),
    web('Hibbert, Bill. "A History of Taylors in Bell Sounds." *Hibberts*, URL.', "https://www.hibberts.co.uk/a-history-of-taylors-in-bell-sounds/", [INH], "r23"),
    web('Hibbert, Bill. "A History of Gillett and Johnston in Bell Sounds." *Hibberts*, URL.', "https://www.hibberts.co.uk/a-history-of-gillett-and-johnston-in-bell-sounds/", [INH], "r24", "With a carillon history page, *Essential Vermeer*, www.essentialvermeer.com/music/carillon/carillon_b.html (secondary); A. Lehr (1987) reported via both."),
    web('Rossing, Thomas D. "Acoustics of Timpani." Lay-language paper, 131st Meeting of the Acoustical Society of America, 1996, URL.', "https://acoustics.org/pressroom/httpdocs/131st/lay10.html", [INH], "r25", "With theses by Packer (Durham, 1993), Mills (Northern Illinois, 1980), a Purdue dissertation (\"Mathematical Modeling of the Orchestral Timpani\"), an Emory thesis (\"The Wave Equation and the Timpani,\" 2022), and HyperPhysics, \"Circular Membrane Modes.\" Abstracts and summaries only."),
    web('Sethares, William A. *Tuning, Timbre, Spectrum, Scale*. 2nd ed., Springer, 2005. URL.', "https://sethares.engr.wisc.edu/ttss.html", [INH], "r26"),
    web('Hagerman, Bo, and Johan Sundberg. "Fundamental Frequency Adjustment in Barbershop Singing." *STL-QPSR*, vol. 21, no. 1, 1980, pp. 28–42. URL.', "https://www.oeaw.ac.at/resources/Record/990002704380504498", [INH], "r27", "Paper not read. With Wikipedia, \"Harmonic Seventh,\" en.wikipedia.org/wiki/Harmonic_seventh."),
    web('Guettler, Knut. "Looking at Starting Transients and Tone." URL.', "https://knutsacoustics.com/files/starting-transients-guettler.pdf", [INH], "r28", "With McGill CAML course notes on the Schelleng diagram, caml.music.mcgill.ca/~gary/618/week11/node3.html."),
    web('Hansen, Uwe J., and Thomas D. Rossing. "The Caribbean Steelpan and Some Offsprings." URL.', "https://www.hangblog.org/pdf/hansen_rossing_the-caribbean-steelpan-and-some-offsprings.pdf", [INH], "r29", "With Zarek, \"Vibration of Steel Band Pans,\" Institute of Acoustics."),
    web('"Intonation and Compensation of Fretted String Instruments." *arXiv*, 2009, arXiv:0906.0127, URL.', "https://arxiv.org/pdf/0906.0127", [INH], "r30", "The title only; the points on stiffness versus stretch are from luthiers' forum posts."),
]

def sortkey(s):
    return re.sub(r"[^a-z0-9 ]", "", re.sub(r"^\W*(the |a |an )?", "", s["mla"].lower().lstrip('"*')))

def title_of(page):
    m = re.search(r'^title:\s*"?(.*?)"?\s*$', (ROOT / page).read_text(), re.M)
    return m.group(1).replace('\\"', '"') if m else page

def entry(s, numbered=False):
    text = s["mla"] + (f" {s['note']}" if s.get("note") else "")
    if numbered: return f"[[{s['ref'][1:]}]]{{#{s['ref']}}} {text}"
    return text

def block(page):
    mine = [s for s in SOURCES if page in s["pages"]]
    numbered = all("ref" in s for s in mine)
    mine.sort(key=(lambda s: int(s["ref"][1:])) if numbered else sortkey)
    body = "\n\n".join(entry(s, numbered) for s in mine)
    return f"<!-- works-cited: written by scripts/works-cited.py -->\n::: {{.works-cited}}\n{body}\n:::\n<!-- /works-cited -->"

START, END = "<!-- works-cited", "<!-- /works-cited -->"
pages = sorted({p for s in SOURCES for p in s["pages"]})
for page in pages:
    f = ROOT / page; t = f.read_text(); b = block(page)
    if START in t:
        t = t[:t.index(START)] + b + t[t.index(END) + len(END):]
    else:
        # replace an old Sources / References section's list, else add the section at the end
        m = re.search(r"^## (Sources|References)( \{#references\})?\n\n(.*?)(?=\n```|\n\{\{<|\Z)", t, re.M | re.S)
        if m:
            t = t[:m.start()] + f"## Works Cited{m.group(2) or ''}\n\n{b}\n" + t[m.end():]
        else:
            inc = t.rfind("\n{{< include")
            at = inc if inc > 0 and t[inc:].count("\n") <= 2 else len(t.rstrip())
            t = t[:at].rstrip() + f"\n\n## Works Cited\n\n{b}\n" + t[at:]
    f.write_text(t)

# the bibliography: every source, alphabetical, with the lessons that use it
lines = ['---', 'title: "Bibliography"', '---', '',
    'Every source cited on this site, in MLA style, with the lessons that use it. '
    'Each lesson lists its own sources at its end under **Works Cited**.', '',
    '<!-- written by scripts/works-cited.py: edit the sources there, not here -->', '', '::: {.works-cited}']
for s in sorted(SOURCES, key=sortkey):
    used = ", ".join(f"[{title_of(p)}]({p})" for p in sorted(s["pages"], key=pages.index))
    lines += [s["mla"] + (f" {s['note']}" if s.get("note") else "") + f" \n[Used in: {used}]{{.wc-used}}", ""]
lines.append(":::")
(ROOT / "bibliography.qmd").write_text("\n".join(lines) + "\n")
print(f"{len(SOURCES)} sources, {len(pages)} pages, bibliography.qmd")
