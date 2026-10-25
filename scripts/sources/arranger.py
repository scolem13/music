# Sources for the Style Arranger (tools/arranger.qmd; apps/shared/band/style-engine.js, arranger-page.js).
# Checked 2026-10-24: both PDFs downloaded from Yamaha's site and the cited pages read (text extracted).
P = ["tools/arranger.qmd"]
SOURCES = [
    web('Yamaha Corporation. *Genos Reference Manual*. Yamaha. URL.', "https://usa.yamaha.com/files/download/other_assets/7/1131007/genos_en_rm_h0.pdf", P,
        note="Chord Fingering types (p. 9); recording a source pattern over CM7, scale and chord tones (p. 23); Source Root/Chord, NTR, NTT tables, NTT Bass, rhythm channel settings (pp. 28–29); High Key, Note Limit, RTR (p. 30)."),
    web('Yamaha Corporation. *PSR-I610/PSR-I510 Reference Manual*. Yamaha. URL.', "https://usa.yamaha.com/files/download/other_assets/4/2935574/PSR-I610_PSR-510_reference_manual_En_A1.pdf", P,
        note="Fingering Type (p. 37); Intro, Main A/B with Auto Fill, Ending (p. 42); the style's parts (p. 44); Multi Finger chords and the one-to-three-key major, minor, seventh and minor seventh (p. 45)."),
]
