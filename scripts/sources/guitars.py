# Sources for the electric guitar pages (apps/shared/lessons/guitar-pickups.js, panels/gt-*.js, data/guitars/tracks.json).
# Read 2026-11-26: Tillman's article (the pickup position / width model and the Strat distances, used as printed), the four
# Wikipedia guitar articles (controls, years, scale lengths, players) and "Pickup (music technology)" (hum cancelling, resonance
# lower with more turns). Lemme's article was not reachable (expired certificate); its 2-5 kHz / 1-10 H figures are as quoted in a
# search summary of it, so treat them as unverified. NOT from any source and marked unverified in the JS: every L / R / C / pot /
# capacitor value, the string's decay and stiffness, pickup distances other than the Strat's, apertures, the knob taper, the
# Strat's reverse-wound middle pickup, every pickup setting in tracks.json.
G = ["lessons/guitar-compare.qmd"]
ST, TE, LP, SG = "lessons/intro-strat.qmd", "lessons/intro-tele.qmd", "lessons/intro-les-paul.qmd", "lessons/intro-sg.qmd"
ALL = G + [ST, TE, LP, SG]
SOURCES = [
    web('Tillman, J. Donald. "Response Effects of Guitar Pickup Position and Width." 2000, updated 17 Oct. 2002. URL.',
        "https://www.till.com/articles/PickupResponse/index.html", ALL,
        note="Pickup point response sin(pi x F / (L F0)) = a comb filter; aperture term; Strat neck / middle / bridge 6.375 / 3.875 / 1.625 in, 1 in aperture; humbucker about 2.5 in; out-of-phase cancellation."),
    web('Lemme, Helmuth E. W. "The Secrets of Electric Guitar Pickups." URL.', "https://buildyourguitar.com/resources/lemme/", ALL,
        note="Resonance of most pickups with a normal cable 2,000-5,000 Hz; inductance 1-10 H (not read directly: certificate expired 2026-11-26; unverified)."),
    wiki("Pickup (music technology)", "Pickup_(music_technology)", ALL, note="Single coils pick up hum; humbucker coils cancel it; self-capacitance + cable resonate with the inductance; more turns, lower resonance."),
    wiki("Fender Stratocaster", "Fender_Stratocaster", G + [ST], note="Three single coils, one volume, two tones (neck; middle + bridge), five-way from 1977, position 2, 25.5 in, Clapton's Layla."),
    wiki("Fender Telecaster", "Fender_Telecaster", G + [TE], note="Broadcaster 1950, two single coils, bridge wound hotter, 1967 wiring neck / both / bridge, 25.5 in."),
    wiki("Gibson Les Paul", "Gibson_Les_Paul", G + [LP], note="1952; Seth Lover's humbuckers on Les Pauls from 1957; two volume, two tone, three-way; 24.75 in; Knopfler 1958 on Money for Nothing, Lukather 1959 in the Rosanna video."),
    wiki("Gibson SG", "Gibson_SG", G + [SG], note="1961; a volume and tone per pickup; three-way; 24.75 in; Angus Young, Tony Iommi's 1964 SG Special on the early albums."),
    web('Guitar World. "Bruce Springsteen\'s Born to Run Telecaster: Mods and Mysteries." URL.', "https://www.guitarworld.com/artists/guitarists/bruce-springsteen-mods-mysteries-born-to-run-telecaster", [TE],
        note="The Born to Run cover guitar: a Telecaster with an Esquire neck (from a search summary; article not read in full)."),
    book('Fletcher, Neville H., and Thomas D. Rossing. *The Physics of Musical Instruments*. 2nd ed., Springer, 1998.', G,
         note="Plucked string: mode amplitudes sin(n pi beta) / n^2 (chapter 2; from memory, page not checked: unverified)."),
]
