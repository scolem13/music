# Sources for the world and acoustic instrument pages (apps/shared/lessons/world-instruments.js, panels/wi-*.js,
# data/world-instruments/tracks.json, lessons/world-instruments-compare.qmd, intro-{sitar,tanpura,steel-pan,kalimba,mbira}.qmd).
# Read 2026-11-26: the Wikipedia articles below in full through the API (plain text). NOT read (so not cited on the pages): C. V.
# Raman's 1921 paper on Indian string instruments, the published jawari and steelpan acoustics papers (e.g. Rossing's steelpan
# work, Valette on the tanpura): the jawari "contact point creeps" idea is Wikipedia's; the site's jawari / taraf / pan / tine
# numbers are its own sketch (unverified). NOT from any source (unverified): which notes the 13 taraf strings get and in what order,
# the sitar fret count and places beyond "movable", the tanpura pluck spacing, the tenor pan's ring order and 29-note range, the
# kalimba's first side, the mbira's key order within registers and any cents of real mbira tunings, and every track whose useSrc is
# null in tracks.json. Raga facts are as on lessons/ragas.qmd (unverified there).
C = ["lessons/world-instruments-compare.qmd"]
I = lambda xs: [f"lessons/intro-{x}.qmd" for x in xs]
SOURCES = [
    wiki("Sitar", "Sitar", C + I(["sitar", "tanpura"]), note="18-21 strings, 6-7 played over curved movable frets, the rest sympathetic (tarb); two bridges; the wide rounded bridge and jawari; main string a fourth above Sa; Kharaj Pancham tuning; meend up to about seven semitones; instrumental style typically 13 sympathetic strings; Norwegian Wood, Love You To, Within You Without You, Paint It Black."),
    wiki("Tanpura", "Tanpura", C + I(["tanpura", "sitar"]), note="Four strings, 5-8-8-1 (Pa-sa-sa-Sa), Ma for ragas without Pa, Dha or Ni for ragas without Pa and shuddha Ma (Marwa, Hindol); jivari: the curved bridge, grazing contact creeping up the slope over 3-10 s; the cotton thread shifts it; Miraj and Tanjore styles; electronic tanpuras."),
    wiki("Steelpan", "Steelpan", C + I(["steel-pan"]), note="Trinidad and Tobago, 1930s-40s, from tamboo bamboo; national instrument; 55-gallon drums from about 1947; TASPO 1951; Anthony Williams's fourths and fifths layout, standard for lead pans; overtone tuning (fundamental, second, third partial) by Bertie Marshall and Alan Gervais; bigger area lower; tuned with hammers and strobe tuners."),
    wiki("Ellie Mannette", "Ellie_Mannette", I(["steel-pan"]), note="Trinidadian pan maker and player, \"father of the modern steel drum\"; sank the drum's top; 1999 National Heritage Fellowship.", who="student"),
    wiki("Mbira", "Mbira", C + I(["kalimba", "mbira"]), note="Shona instrument of Zimbabwe; lamellophone; Hugh Tracey's kalimba (late 1950s) after the nyunga nyunga; inharmonic overtones strongest in the attack; adjacent tines vibrate; lowest notes in the centre is common; tunings not on the Western grid; Nyamaropa ~Mixolydian, Katsanzaira ~Dorian, Mavembe ~Phrygian; mbira dzavadzimu 22-28 keys, three registers (two left, one right); bottle-cap buzzers (machachara); deze calabash resonator; Nhema Musasa; UNESCO 2020."),
    wiki("Lamellophone", "Lamellophone", C + I(["kalimba", "mbira"]), note="Plucked tines; many African names (mbira, likembe, kalimba, sanza); marimbula."),
    wiki("Dumisani Maraire", "Dumisani_Maraire", I(["mbira"]), note="Nyunga nyunga mbira player; 1-15 number notation; Chemutengure.", who="student"),
    wiki("Stella Chiweshe", "Stella_Chiweshe", I(["mbira"]), note="Known internationally for mbira dzavadzimu; learned 1966-69 against taboos and colonial bans.", who="student"),
    wiki("Earth, Wind & Fire", "Earth,_Wind_%26_Fire", I(["kalimba"]), note="Known for its kalimba sound; \"Kalimba Story\"; Kalimba Productions.", who="student"),
    wiki("Within You Without You", "Within_You_Without_You", I(["tanpura", "sitar"]), note="Sitar, tambura, dilruba, tabla; three tamburas giving a dense jivari (Hannan).", who="student"),
    wiki("Tomorrow Never Knows", "Tomorrow_Never_Knows", I(["tanpura"]), note="A C drone on tambura.", who="student"),
    wiki("Love You To", "Love_You_To", I(["sitar", "tanpura"]), note="Sitar, tabla and tambura; the first Beatles song fully in the Indian classical style.", who="student"),
]
