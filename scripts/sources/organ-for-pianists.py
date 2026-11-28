# Sources for lessons/organ-for-pianists.qmd (and the registrations added to arrange-organ's menu). Read 2026-11-26.
# HammondWiki pages fetched and read; the MODX+ manuals read from ~/Documents/Manuals (Owner's and Reference Manuals).
# "Gimme Some Lovin'": the year, band and organist are from the Wikipedia article; the swell / Leslie plan is the site's.
P = ["lessons/organ-for-pianists.qmd"]
PA = P + ["lessons/arrange-organ.qmd"]
HW = "https://www.dairiki.org/HammondWiki/"
SOURCES = [
    web('"Popular Drawbar Registrations." *HammondWiki*, edited by Geoffrey T. Dairiki et al. URL.', HW + "PopularDrawbarRegistrations", PA, who="student",
        note="Registrations by player: Jimmy Smith 88 8000 000, Booker T 88 8630 000, Winwood 84 8848 448 / 88 8888 888, Green Onions, Procol Harum, gospel."),
    web('"Standard Jazz Registrations." *HammondWiki*. URL.', HW + "StandardJazzRegistrations", P, who="student", note="88 8000 000 with Four Up; the '90%' quotation."),
    web('"Percussion." *HammondWiki*. URL.', HW + "Percussion", PA, who="student", note="Single-trigger; upper manual and B preset only; takes the 9th drawbar's contact."),
    web('"Four Up." *HammondWiki*. URL.', HW + "FourUp", P, who="student", note="On, Soft, Fast, 3rd; the four tablets up."),
    web('"Errol Garner Style." *HammondWiki*. URL.', HW + "ErrolGarnerStyle", PA, who="teacher", note="80 0008 888; block-chord 'squabbling'."),
    web('Yamaha Corporation. *MODX6+ / MODX7+ / MODX8+ Owner\'s Manual*. Yamaha. URL.', "https://usa.yamaha.com/support/manuals/index.html", P, who="teacher",
        note="FOOT CONTROLLER jacks and the FC7, Category Search, Control Assign / Control Number, [ASSIGN 1]/[ASSIGN 2]."),
    web('Yamaha Corporation. *MODX+ Reference Manual*. Yamaha. URL.', "https://usa.yamaha.com/support/manuals/index.html", P, who="teacher",
        note="Rotary Speaker speed as Destination 'InsA/B SpdCtrl'; Foot Ctrl 1/2 control numbers."),
    web('Yamaha Corporation. *MODX6+ / MODX7+ / MODX8+ Data List*. Yamaha. URL.', "https://usa.yamaha.com/files/download/other_assets/5/1583935/modx_plus_en_dl_a0.pdf", P, who="teacher",
        note="Performance names in Organ / Tone Wheel (The Basics, All 9 Bars!, The Preacher…)."),
    wiki("Gimme Some Lovin'", "Gimme_Some_Lovin%27", P, who="student"),
]
