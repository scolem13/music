# Bell and chime samples, round 2 (staging, 2026-11-28)

Goal: clean, close single strikes of low bells and low chimes, to replace the distant swinging church bells in `SOURCES.md`. Nothing here is used by the site yet. Nothing is committed.

- `raw/vcsl/` and `raw/commons3/` hold the files as downloaded.
- `trimmed2/` holds 15 mono AAC files at 96 kbps, 2.6 MB in all. Each was cut from its onset (-50 dB) to where it falls below -62 dB, or to a cap (30 s for chimes, 45 s for the bell). The fade covers the last 30% (at most 4 s), and each file is peak-normalised to -1 dBFS (`handchime-C4` to -4.5 dB before encoding, so the AAC peak lands at -1.9 dB).
- Pitch comes from an FFT of 0.2 to 3 s after the onset. "Strike / partial" is the strong partial that matches the labelled pitch class. Tubular-chime strike notes are often heard an octave below that partial, so the file names use the measured partial.
- "Noise floor" is the energy above 5 kHz in the last 0.5 s of the source file, before any fade, relative to the file's peak (for the bell: above 4 kHz, 50 to 58 s). Below about -80 dB means no audible hiss. Low-band energy in the same window was also checked for hum: nothing above -64 dB.

## Licences

| Source | Licence as stated | URL |
|---|---|---|
| Versilian Community Sample Library (VCSL), Versilian Studios / Sam Gossner | "CC0 1.0 Universal" (`raw/vcsl/LICENSE`) | https://github.com/sgossner/VCSL |
| Wikimedia Commons, "Bila's sound with overtones.ogg" | CC BY-SA 3.0. Credit the author; derivatives must be shared alike. | https://commons.wikimedia.org/wiki/File:Bila%27s_sound_with_overtones.ogg |

## Files

| file (trimmed2/) | instrument | measured pitch | length | noise floor (dB) | source URL | author | licence | notes |
|---|---|---|---|---|---|---|---|---|
| lowbell-commons-bila-flatbell-Cs3 | bila (flat bell / bell plate, a 12-metal alloy plate) | hum C#3 +9c (139 Hz); partials C#4, G#4 -26c, D#5 +40c, A5 -25c, C6 +14c | 45.0 s | -90 | commons.wikimedia.org/wiki/File:Bila's_sound_with_overtones.ogg | Soderjanie Pustoti | CC BY-SA 3.0 | One strike, a 62 s decay (cut at 45 s), no background heard in the measurements. Inharmonic and gong-like. The source file is digitally faded to silence at the end. The description makes esoteric claims about "geo-biological" tuning, so don't quote it. |
| lowchime-vcsl-tubular-C5 | orchestral tubular bells (VCSL "Tubular Bells 1", labelled C3) | C5 +1c (524 Hz); strongest C6 +36c | 11.3 s | -81 | github.com/sgossner/VCSL `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_C3_f_rr1.wav` | Versilian Studios | CC0 1.0 | The lowest note of the set. The source stops while the note is still ringing (about -50 dB), so the end is a fade, not a natural decay. |
| lowchime-vcsl-tubular-D5 | tubular bells (labelled D3) | D5 0c (587 Hz) | 19.6 s | -85 | same folder, `chimes_D3_ff_rr1.wav` | Versilian Studios | CC0 1.0 | Long, full ring. |
| lowchime-vcsl-tubular-E5 | tubular bells (labelled E3) | E5 +2c (660 Hz) | 17.8 s | -81 | `chimes_E3_ff_rr2.wav` | Versilian Studios | CC0 1.0 | Long ring. |
| lowchime-vcsl-tubular-Fs5 | tubular bells (labelled F#3) | F#5 +3c (741 Hz) | 13.2 s | -89 | `chimes_F#3_fff_rr1.wav` | Versilian Studios | CC0 1.0 | fff, a bright attack. |
| lowchime-vcsl-tubular-Gs5 | tubular bells (labelled G#3) | G#5 +4c (833 Hz) | 14.7 s | -87 | `chimes_G#3_ff_rr1.wav` | Versilian Studios | CC0 1.0 | |
| lowchime-vcsl-tubular-As5 | tubular bells (labelled A#3) | A#5 +8c (936 Hz) | 12.6 s | -89 | `chimes_A#3_ff_rr1.wav` | Versilian Studios | CC0 1.0 | |
| lowchime-vcsl-tubular-C6 | tubular bells (labelled C4) | C6 +6c (1050 Hz); strongest E5 -37c | 18.4 s | -87 | `chimes_C4_ff_rr2.wav` | Versilian Studios | CC0 1.0 | A strong out-of-tune partial near E5: a sour, "clangy" note. |
| lowchime-vcsl-tubular-D6 | tubular bells (labelled D4) | D6 +7c (1179 Hz) | 13.7 s | -86 | `chimes_D4_ff_rr2.wav` | Versilian Studios | CC0 1.0 | |
| lowchime-vcsl-handchime-C4 | hand chime (tuned aluminium tube, handbell family, labelled C3) | C4 +9c (263 Hz) | 12.9 s | -104 | `Idiophones/Struck Idiophones/Hand Chimes/sus_C3_r01_main.wav` | Versilian Studios | CC0 1.0 | Almost a pure sine: a soft, deep "Corinthian" tube tone. The quietest floor of the set. Labelled an octave below how it sounds (handbell convention). Still ringing at the end of the source, so the end is a fade. |
| lowchime-vcsl-handchime-D4 | hand chime (labelled D3) | D4 +7c (295 Hz) | 11.2 s | -92 | `sus_D3_r01_main.wav` | Versilian Studios | CC0 1.0 | Pure tone. |
| lowchime-vcsl-handchime-E4 | hand chime (labelled E3) | E4 +2c (330 Hz) | 14.2 s | -104 | `sus_E3_r01_main.wav` | Versilian Studios | CC0 1.0 | Pure tone, a natural decay. |
| lowchime-vcsl-handchime-Fs4 | hand chime (labelled F#3) | F#4 +9c (372 Hz) | 11.8 s | -101 | `sus_F#3_r01_main.wav` | Versilian Studios | CC0 1.0 | |
| lowchime-vcsl-handchime-Gs4 | hand chime (labelled G#3) | G#4 -2c (415 Hz) | 10.2 s | -88 | `sus_G#3_r01_main.wav` | Versilian Studios | CC0 1.0 | |
| lowchime-vcsl-handchime-As4 | hand chime (labelled A#3) | A#4 0c (466 Hz) | 8.3 s | -91 | `sus_A#3_r01_main.wav` | Versilian Studios | CC0 1.0 | A faint F6 partial. |

## Looked at and rejected

| candidate | why |
|---|---|
| VCSL Tubular Bells 2 (`TB_hit_*`) | The same recordings as VSCO-2-CE, already in `trimmed/` |
| VCSL Tubular Bells 3 Legacy (`chimes_C1.ogg` and others) | The same instrument as Tubular Bells 1 (identical partials), but quieter, lossy and shorter |
| VCSL Tubular Glockenspiel (G0 to G1) | Sounds G6 to D7, and short; not low |
| VCSL Gong 1 / Gong 2 | Gong 1 is already in `trimmed/` (gong-vsco2-*) |
| Commons "Cloche Marcel Notre Dame de Paris" (CC0, D#3) | A swinging peal, not a single strike |
| Commons "Szent Gellért-harang", "Szent Imre-harang" (Szeged) | Swinging peals, several minutes long |
| Commons "Dicker Peter links Bukarestglocke rechts" | A swinging comparison, with the two bells on separate channels |
| Commons "Industrial-strength wind chimes.webm" (giant chimes, CC BY-SA 4.0) | Taken from an outdoor video: a raised floor (about -50 dB above 4 kHz, with wind and street noise likely) and a jangle, not single tubes |
| Commons search results (tubular bell, temple bell, wind chime, bell plate, bonsho) | Pronunciation clips, a MuseScore render, small bells, a CC BY bell-shaped candle damper |
| Iowa MIS (old and 2012 pages) | No orchestra chimes page exists (MISchimes.html is a 404). The bells are glockenspiel and are already used |
| Karoryfer Samples (all free libraries are CC0) | No bells, chimes or bell plates. Virtuosity Drums has only cowbell, bell tree and jingle bells |
| FreePats Tubular Bells | Built from the VCSL samples above |
| Free Wave Samples | Hardware-ROM rips, high pitched (C5 to C6), and the licence forbids rehosting copies for download |
| Pianobook | Needs a login, and its per-item licences are not open: skipped |
| Philharmonia, Freesound | Skipped, as instructed |
