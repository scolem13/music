# Sources for the electric bass pages (apps/shared/lessons/bass-pickups.js, panels/bs-*.js, data/basses/tracks.json).
# Read 2026-11-26: the four Wikipedia bass articles (years, scales, pickups, controls, the Jazz spacing, players) and Tillman's
# article (the pickup model, shared with the guitars). NOT from any source and marked unverified in the JS: every L / R / C / pot /
# capacitor value, every pickup distance from the bridge, which P half is nearer the bridge, the Jazz volume wiring, the StingRay
# preamp's numbers, the string's decay and stiffness, every setting in tracks.json, which bass most tracks were played on.
C = ["lessons/bass-compare.qmd"]
PB, JB, SR, RB = "lessons/intro-p-bass.qmd", "lessons/intro-jazz-bass.qmd", "lessons/intro-stingray.qmd", "lessons/intro-rickenbacker-bass.qmd"
ALL = C + [PB, JB, SR, RB]
SOURCES = [
    web('Tillman, J. Donald. "Response Effects of Guitar Pickup Position and Width." 2000, updated 17 Oct. 2002. URL.',
        "https://www.till.com/articles/PickupResponse/index.html", C,
        note="Pickup point response sin(pi x F / (L F0)) = a comb filter; aperture term; Strat neck / middle / bridge 6.375 / 3.875 / 1.625 in, 1 in aperture; humbucker about 2.5 in; out-of-phase cancellation."),
    wiki("Fender Precision Bass", "Fender_Precision_Bass", C + [PB], note="On sale October 1951; 34 in scale; split-coil pickup from 1957, coils wired out of phase with reversed magnets (hum-cancelling); Jamerson's 1962 Precision on Motown hits; signature models (Sting, Harris, Waters)."),
    wiki("Fender Jazz Bass", "Fender_Jazz_Bass", C + [JB], note="1960 (Deluxe Model); two single coils, two poles a string, RWRP, hum cancels with both full; stacked knobs, then from late 1961 two volumes + master tone; pickups 3.6 in apart until late 1970, then 4 in (Fender: 1972); scooped growl (Marcus Miller); Jaco's 1962 Jazz."),
    wiki("Music Man StingRay", "Music_Man_StingRay", C + [SR], note="1976; Leo Fender with Tom Walker (active preamp, 9 V); one large humbucker nearer the bridge, coils in parallel; 2-band EQ then a mid added; Deacon on Another One Bites the Dust, Edwards on Le Freak, Louis Johnson."),
    wiki("Rickenbacker 4001", "Rickenbacker_4001", C + [RB], note="4001 November 1961, 4003 1980 (truss rod for roundwounds); 33.5 in; toaster neck + horseshoe bridge pickups, later Hi-Gain; extra volume and tone, three-position switch; Ric-O-Sound 1968; Squire's bright twangy tone, Lemmy, Geddy Lee."),
]
