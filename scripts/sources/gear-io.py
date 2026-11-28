# Sources for gear/x32-guitar-vocals-computer.qmd and gear/ur22mkii.qmd. Read 2026-11-27: the X32 manual (text extracted;
# impedances p. 69, FX list p. 60, Guitar Amp / Pitch p. 25, inserts p. 31, X-USB pp. 37-42, routing p. 52-54, USB recorder p. 36,
# latency p. 69) and the UR22mkII Operation Manual and Getting Started (a0). NOT from a source: the ~1 MΩ a pickup wants (Wikipedia
# DI unit gives the mismatch only in general), the 10 / 15-20 ms latency feel figures, the plug-in names, Ableton menu paths.
X = "gear/x32-guitar-vocals-computer.qmd"
U = "gear/ur22mkii.qmd"
SOURCES = [
    web('Behringer. *X32 Digital Mixer Preliminary User Manual*. Music Tribe, URL.', "https://media.vsl-uk.com/manuals/sound/Behringer_X32_User_Manual.pdf", [X], who="student",
        note="XLR input 10 kΩ bal., Aux In 40 kΩ (p. 69); 60 effects incl. Guitar Amp after the Tech 21 SansAmp, Pitch, DeEsser (pp. 25, 60); FX 5-8 insert only, inserting an FX (pp. 19, 31); X-USB 32x32, ASIO driver, ~14 ms round trip (pp. 37-42); Card routing and virtual soundcheck (pp. 39, 52-54); USB stick 16-bit stereo WAV (p. 36); 0.8 ms I/O latency (p. 69)."),
    web('Steinberg. *UR22mkII Operation Manual*. Steinberg Media Technologies, 2015, URL.', "https://download.steinberg.net/downloads_hardware/UR22mkII/UR22mkII_documentation/ur22mkii_en_om_a0.pdf", [U], who="student",
        note="Hi-Z on input 2, unbalanced plug, PEAK 3 dB below clipping (p. 3); MIX knob, mono direct monitor (p. 4); +48V for both (p. 6); power source (p. 5); sample rates, loopback, buffer sizes (pp. 7-8); iPad (p. 11)."),
    web('Steinberg. *UR22mkII Getting Started*. Steinberg Media Technologies, 2015, URL.', "https://download.steinberg.net/downloads_hardware/UR22mkII/UR22mkII_documentation/ur22mkii_en_gs_a0.pdf", [U], who="teacher",
        note="Driver installation, Cubase AI download."),
    wiki("DI unit", "DI_unit", [X, U], who="student", note="Why a guitar pickup into a low-impedance mic input loses level and treble; what a DI box does."),
]
