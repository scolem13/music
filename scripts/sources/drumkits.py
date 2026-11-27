# Sources for the drum kit and cymbal pages (apps/shared/lessons/drumkits.js, panels/dk-*.js, panels/cy-*.js,
# data/drumkits/tracks.json, lessons/drum-kit-compare.qmd, cymbal-compare.qmd, intro-<slug>.qmd). Read 2026-11-26: the Wikipedia
# articles below in full through the API (plain text). Fletcher & Rossing NOT read: not cited on the pages; the air-loading and
# cymbal-partial ideas are marked unverified in the JS header. NOT from any source (unverified): every number of the model (pitch bases, decay
# times, shell partials, wire noise, cymbal partial law, tilts, scatter, decays), the Supraphonic / Black Beauty / maple / piccolo
# sizes, lugs, hoops and finishes (Wikipedia's "Ludwig Supraphonic" redirects to Conn-Selmer and says nothing about it), the kits'
# shells and cymbal choices, and every track except where useSrc in tracks.json names one of these articles.
C = ["lessons/drum-kit-compare.qmd"]
Y = ["lessons/cymbal-compare.qmd"]
S = ["supraphonic", "black-beauty", "maple-snare", "piccolo-snare"]
K = ["jazz-kit", "rock-kit", "funk-kit"]
CY = ["a-ride", "k-ride", "2002-crash", "crash", "hi-hats", "china", "splash"]
I = lambda xs: [f"lessons/intro-{x}.qmd" for x in xs]
SOURCES = [
    wiki("Snare drum", "Snare_drum", C + I(S), note="Two heads, snares on the bottom head, a lever on the strainer throws them off (then it sounds like a tom); rimshots; kit snares 14\" x 5-8\"; piccolo 13-14\" across, about 4\" or less, higher."),
    wiki("Drum tuning", "Drum_tuning", C + I(S + K), note="14\" snare batter 220-349 Hz, resonant head 330-391 Hz, most often a fifth above; bass drum front head port about 6\", less \"round\"; muffling."),
    wiki("Vibrations of a circular membrane", "Vibrations_of_a_circular_membrane", C + I(S + K), note="Modes of an ideal drum head at the zeros of the Bessel functions J_m."),
    wiki("Drum kit", "Drum_kit", C + I(K), note="Usual sizes (22\" bass drum most common; 12\"/13\" toms, 14\"/16\" floor), hi-hat, ride 20\", crash 16\"; muffles deaden ring and overtones."),
    wiki("Ludwig Drums", "Ludwig_Drums", C + I(S + ["rock-kit"]), note="Founded 1909; Ringo Starr on Ed Sullivan 1964; notable artists list (Al Jackson Jr., Clyde Stubblefield, Carlton Barrett, John Bonham, Joe Morello, Roger Taylor, Mick Fleetwood...)."),
    wiki("Vistalite", "Vistalite", C + I(["rock-kit"]), note="Ludwig's acrylic drums, from 1972, popularised by John Bonham; reissued 2001 (amber Bonham replica)."),
    wiki("Gretsch", "Gretsch", C + I(["jazz-kit"]), note="Founded 1883 in Brooklyn; a drum company first (the article's drum section is empty: the round-badge era is not described there)."),
    wiki("Cymbal", "Cymbal", Y + I(CY), note="Bigger: louder, longer sustain; heavier: louder, more cut; bell bronze the traditional alloy; B8 = 8 % tin malleable bronze, Paiste's \"2002\" alloy."),
    wiki("Zildjian", "Zildjian", Y + I(["a-ride", "k-ride", "crash", "hi-hats"]), note="Founded Constantinople 1623; alloy recipe secret; K Zildjian made in the US from 1975, relaunched with Elvin Jones and Tony Williams."),
    wiki("Paiste", "Paiste", Y + I(["2002-crash", "splash"]), note="CuSn8 \"2002 bronze\" (B8) from 1965, the 2002 series; unlathed RUDE 1980; Stewart Copeland and the splash."),
    wiki("Hi-hat", "Hi-hat", Y + I(["hi-hats"]), note="Two 13-15\" cymbals on a pedal stand; open, closed, pedal (foot) sounds.", who="student"),
    wiki("Ride cymbal", "Ride_cymbal", Y + I(["a-ride", "k-ride"]), note="Most common 20\" (18-22\"); sustained shimmer; bell."),
    wiki("Crash cymbal", "Crash_cymbal", Y + I(["crash", "2002-crash"]), note="Accents; short wash."),
    wiki("China cymbal", "China_cymbal", Y + I(["china"]), note="Bright, crisp, explosive: \"trash cymbal\"; mounted bell up or down."),
    wiki("Splash cymbal", "Splash_cymbal", Y + I(["splash"]), note="Most common 8\" then 10\"; Ringo Starr, Stewart Copeland."),
    web("McLean, Scott, et al. \"SM Drums (Deeply Sampled Free Drums).\" SFZ edition, sfzinstruments, GitHub, accessed 27 Nov. 2026.", "https://github.com/sfzinstruments/SMDrums", Y + C + I(CY + K), note="The cymbal recordings the pages play (cymbal-samples/*.m4a). Its manual: \"A Zildjian series\" cymbals, 14\" New Beat hats, 20\" Ping and 17\" Thin rides, 13/15/16/17\" crashes, a Wuhan 15\" china. Terms, the authors' site as quoted on KVR: free royalty free use by anyone for anything."),
]
