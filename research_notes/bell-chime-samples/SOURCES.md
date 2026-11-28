# Bell and chime samples (staging, 2026-11-28)

Candidates for the Ambient Generator. Nothing here is used by the site yet.

- `raw/<source>/` holds the files as downloaded (137 MB).
- `trimmed/` holds 78 mono AAC files at 96 kbps, 9.2 MB in all. To make them, leading silence was cut at -50 dB. Each file ends where the tail drops below -55 dB, or at a cap (6 to 25 s, depending on the sound). The fade-out covers the last 30% (at most 4 s), and each file is peak-normalised to -1 dBFS. The script was `trim.sh` in the session scratchpad, using ffmpeg.

Trimmed names are `<instrument>-<source>-<pitch or variant>.m4a`. Licences are given exactly as each source states them.

## Licences by source

| Source | Licence as stated | URL |
|---|---|---|
| VSCO 2 Community Edition (Versilian Studios, Sam Gossner) | "CC0 1.0 Universal" (`raw/vsco2ce/LICENSE`) | https://github.com/sgossner/VSCO-2-CE |
| University of Iowa Electronic Music Studios, MIS (Lawrence Fritts) | "freely available on this website and may be downloaded and used for any projects, without restrictions" (MIS.html) | https://theremin.music.uiowa.edu/MIS.html |
| Sonatina Symphonic Orchestra (Mattias Westlund; peastman/sso update) | "Creative Commons Sampling Plus 1.0" (`raw/sso/LICENSE`). The celeste samples are "in the public domain (CC0 license)", from Freesound user stamperadam, pack 6166 (`raw/sso/Celeste-README.md`) | https://github.com/peastman/sso |
| Wikimedia Commons | per file, below | https://commons.wikimedia.org/wiki/File:<name> |

## Files

| file (trimmed/) | instrument | pitch | source URL | author | licence | notes |
|---|---|---|---|---|---|---|
| glock-vsco-{G4,C5,G5,C6,G6,C7} | glockenspiel | G4 to C7 | github.com/sgossner/VSCO-2-CE `Percussion/Glock/glock_medium_*.wav` | Versilian Studios | CC0 1.0 | Recorded quietly (peak about -28 dB), so it got +26 dB of gain. Listen for noise in the tail. |
| tubular-vsco-{C4,G4,C5,F5} | tubular bells | C4 G4 C5 F5 | VSCO-2-CE `Percussion/TB_hit_*` | Versilian Studios | CC0 1.0 | Long rings, capped at 14 s. Only one strength each. |
| windchime-metal-vsco-{asc1,desc1,fastAsc1,slowAsc1,slowDesc1,random} | metal wind chimes (bar chimes, played by hand) | — | VSCO-2-CE `VSCO 1 Percussion/varMetal/various/windchimes_*` | Versilian Studios | CC0 1.0 | Sweeps and a random "gust" (21 s). Quiet originals, +20 to 31 dB of gain. |
| nepalese-bells-vsco-{fx_long_1,fx_long2,fx_med,fx1_short_r01,fx2_short_r07,fx3_short_r03} | Nepalese bells (small cast bell clusters) | — | VSCO-2-CE `Miscellania Raw/Misc 2/NepaleseBells/` | Versilian Studios | CC0 1.0 | Long jangling textures plus short shakes. There are 19 more short takes in the repo. |
| vibraphone-ring-vsco-{1,2} | vibraphone bar ring (effect) | — | VSCO-2-CE `Percussion/vibraring_v1_rr*` | Versilian Studios | CC0 1.0 | Short, about 2 s. |
| belltree-vsco-3 | bell tree stroke | — | VSCO-2-CE `Percussion/BellTree_Stroke3_v1_Sum.wav` | Versilian Studios | CC0 1.0 | Stroke 1 is in raw/ but the trim failed (the file is too quiet for the -50 dB gate). |
| glock-iowa-brass-{C5,G5,C6,G6,C7,E7} | orchestra bells (glockenspiel), brass mallet, ff | C5 to E7 | theremin.music.uiowa.edu/MIS-Pitches-2012/MISBells2012.html | U. Iowa EMS | free, "without restrictions" | Clean and bright. Plastic-mallet versions are also on the site. |
| crotale-iowa-{C6,E6,G6,C7,E7,G7,C8} | crotales, ff | C6 to C8 | .../MISCrotales2012.html | U. Iowa EMS | free, "without restrictions" | Very pure. The upper notes cut off early at the -55 dB gate (3 to 5 s), so a longer tail is in raw/ if wanted. |
| vibraphone-iowa-{C4,G4,C5,E5} | vibraphone, sustain, ff | C4 G4 C5 E5 | .../MISVibraphone2012.html | U. Iowa EMS | free, "without restrictions" | Not a bell, but a good soft ambient pad. Motor off. |
| celeste-{c4,c5,c6,e5,gs5}-{hard,soft}-sso | celesta, two strengths | C4 to C6 | github.com/peastman/sso `Samples/Celeste/` | stamperadam (Freesound pack 6166) | CC0 (stated in the SSO README) | Hard and soft strikes. Soft takes needed +20 to 27 dB. |
| tubular-sso-{c3,a3,c4,fs4,c5} | chimes (tubular bells) | C3 A3 C4 F#4 C5 | peastman/sso `Samples/Percussion/chimes-*.wav` | SSO (M. Westlund) | CC Sampling Plus 1.0 | **Caution:** Westlund says that for "a few very old soundfonts" he has "no idea who the original authors were or what licensing might apply". The origin of these chimes isn't documented, so the VSCO and Iowa sets are safer. |
| barchimes-sso-{a,b,c} | bar chimes (mark tree) | — | peastman/sso `Samples/Percussion/bar_chimes-*.wav` | SSO | CC Sampling Plus 1.0 | Same caution as above. |
| bowl-struck-commons-bamboobeast{1,2} | singing bowl, struck | — | commons File:SingingBowl1.ogg / SingingBowl2.ogg | BambooBeast | Public domain | Short, clean. |
| bowl-F4-commons-jambati | Nepalese singing bowl (hand-forged "Full Moon") | F4 (346.3 Hz) | commons File:Sound_recording_of_a_hand-forged_Nepalese_Full_Moon_singing_bowl_(346.3_Hz,_F4).wav | JAMBATI eu | CC BY 4.0 | Attribution needed. Good long ring. |
| bowl-struck-11in-commons, bowl-4in-commons | Tibetan singing bowl, 11" struck; 4.5" | — | commons File:Tibetan_Singing_Bowl_hit_11inch.flac / Tibetan_Singing_Bowl_4.5inch.flac | דג בלי מלח | CC BY-SA 4.0 | The 4.5" file may be rubbed rather than struck (the name doesn't say "hit"). Listen to check. |
| bowl-small-commons | small Tibetan singing bowl | — | commons File:Small_tibetan_singing_bowl.ogg | Cassa342 | CC BY-SA 4.0 | |
| rin-rubbed-commons, rin-struck-commons | Japanese rin (temple bowl bell), rubbed and struck | — | commons File:Japanese_rin_played_as_friction_idiophone.ogg / ..._struck_idiophone.ogg | MichaelMaggs | CC BY-SA 4.0 | The only clearly **rubbed** bowl in the set. |
| churchbell-niederroden-{1,2,3} | church bells (single bells: Engels, Josefs, Marien) | — | commons File:NiederRoden-StMatthias-Glocke1-Engels.ogg (and 2, 3) | Helmholtz42 | CC BY-SA 4.0 | Swinging bells, repeated strokes, recorded outdoors. Glocke 4 not obtained (rate limit). |
| churchbell-samariter-Eb | church bell | E♭ | commons File:Samariter_Church_Bell_I_(Es).ogg | Pete w. View | CC BY-SA 4.0 | Peak already at -0.4 dB. Bells II (g) and III (b) not obtained (rate limit). |
| churchbells-leverkusen | church bells, peal | — | commons File:Church_bells_-_Leverkusen,_2007.oga | natalie | Public domain | Field recording, with ambience. |
| templebell-hiroshima-peace | large temple bell (Hiroshima Peace Bell) | — | commons File:25822_heigh-hoo_peace-bell-hiroshima.wav | Heigh-hoo (via Freesound) | CC0 | Quiet original. The gate cut it at 7 s, so the raw file has more tail. |
| bell-ring-qubodup | small hand bell ring | — | commons File:Bell-ring.flac | qubodup | CC0 | A handbell-ish ring, 3 s. |
| windchime-commons-stephan | metal wind chime in breeze | — | commons File:Windchime.ogg | stephan | Public domain | A gust texture. |
| windchimes-commons-esc861 | wind chimes | — | commons File:Windchimes.ogg | Esc861 | Public domain | Short. |
| windchime-koshi-commons | Koshi chime (tuned bamboo-cased rods) | — | commons File:Windglockenspiel.Koshi.ogg | Membeth. | CC0 | Koshi chimes have a bamboo body with metal rods inside. Ethereal. |

For the CC BY / CC BY-SA files, the author must be credited if they are used on the site (add them to `scripts/works-cited.py`). A CC BY-SA licence may also bind the edited sample.

## What I couldn't get, and why

- **Freesound** needs a login to download (the download link redirects to /home/login, and the API returns 401). Skipped.
- **Wikimedia Commons rate limit (HTTP 429)** stopped me partway through. These were found, clearly licensed, and not downloaded. Fetch them later from `https://commons.wikimedia.org/wiki/File:<name>`:
  - `NiederRoden-StMatthias-Glocke4-Matthias.ogg` (CC BY-SA 4.0)
  - `Samariter Church Bell II (g).ogg` and `III (b).ogg` (CC BY-SA 4.0)
  - `Striking a bell 15cm large.ogg` (PD, stephan)
  - **carillon:** `Vor Frelsers Kirke Copenhagen carillon sample.ogg` (PD, Ib Rasmussen) and `"Frolic" from "Music for Twilight" on the Netherlands Carillon.ogg` (PD, National Park Service)
  - `Röhrenglocken (Windspiel).ogg` (tubular wind chime, CC BY-SA 3.0 de)
  - **handbells:** `415061 gsb1039 clock-chime-tubebells-handbells-vibes.wav` (CC0)
  - `274316 the-very-real-horst ghanta-leather-mallet-2015-05-16.wav` (ghanta temple bell, CC0, 8.5 MB)
  - `Cascading arpeggios on celesta from Sugar Plum Fairy.wav` (PD)
- **Carillon:** none downloaded (see the rate-limited list above).
- **Large single church bell, one clean strike:** only swinging-bell recordings were obtained. No isolated big-bell strike.
- **Handbells, proper pitched set:** none with a clear licence besides the CC0 Commons mix above. I found no handbell multisample.
- **Bamboo wind chimes and glass wind chimes:** nothing found on Commons with a clear licence (searches returned nothing). Freesound has many, but it needs a login.
- **Single wind-chime strikes:** none isolated. Only sweeps and gusts.
- **Strike strengths:** only the celesta (hard and soft) has more than one. VSCO has a single dynamic for glock and tubular bells, and Iowa is ff only in the 2012 set. (The older Iowa pages `MISbells.html` and `MIScrotales.html` may have pp/mf, not checked.)
- **Philharmonia samples:** not tried, because of time and the rate limits. Their site historically has no bells beyond the percussion set, and their terms prohibit redistributing the raw samples.
- **Rubbed Tibetan bowl:** only the Japanese rin is definitely rubbed. The 4.5" bowl may be.

## Second run (2026-11-28): low bells, gongs, bowed metal

Same trim as before (`trim.sh`, now with a longer fade for long sounds: up to 6-8 s), plus `seg.sh`, which cuts a section from a longer recording first. Caps: bells and tam-tams up to 40 s, bowed sounds 16-24 s. Raw files are in `raw/commons2/`, `raw/iowa-mis/` and `raw/vsco2ce/`. 56 new files (134 in all, 22 MB).

| file (trimmed/) | instrument | pitch | source URL | author | licence | notes |
|---|---|---|---|---|---|---|
| bigbell-notredame-marie-swing, -swing2 | bourdon "Marie", Notre-Dame de Paris, swinging | — | commons File:Bourdon_Marie_(Notre-Dame_de_Paris)_1.ogg and _2.ogg | NemesisIII | CC BY-SA 3.0 | Strokes about every 5 s, then the tail. 29 s and 24 s. |
| bigbell-notredame-marie-last-stroke | the same bell, the last stroke and its tail | — | as above (file 1, from 10.1 s) | NemesisIII | CC BY-SA 3.0 | 19 s. The earlier strokes still ring underneath. This is the closest thing to a single bourdon strike in the set. |
| bigbell-notredame-emmanuel-peal | bourdon Emmanuel, Notre-Dame de Paris, full swing | F#2 is the published pitch (from memory, not checked) | commons File:ND_G1_Emmanuel.ogg | Rongaman | CC0 | The first 40 s of a 189 s recording. Continuous ringing, so no isolated strike. |
| bigbell-notredame-marie2013-peal, -peal-end | Notre-Dame bell "Marie" (the 2013 bell), swinging; the end of the swing with its final tail | — | commons File:ND_G2_Marie.ogg | Rongaman | CC0 | 0-40 s, and 75 s to the end (21 s, with the bell coming to rest). |
| bigbell-bourdon-culasse-swing, -last-stroke | bourdon (church not named) | — | commons File:Bourdon_wav.wav | Culasse | CC BY-SA 4.0 | 26.5 s of swinging; the last stroke from 14.15 s (12 s). |
| bigbell-bourdonklok-1959 | bourdon bell (Dutch "bourdonklok", 1959) | — | commons File:Bourdonklok_1959-kort.ogg | unknown | Public domain | Only 5 s. Old recording. |
| templebell-bonsho-jnn | Japanese bonshō (temple bell), one strike | — | commons File:Bonsyou5599.ogg | Jnn (ja wiki) | CC BY 2.1 jp | 28 s tail, a real big-bell strike. **Low quality:** the sample rate is 11 kHz, so it has no top end. |
| gong-chinese-horst-roll, -last-stroke | Chinese gong (session finish: several strikes, then the last stroke and its tail) | — | commons File:240382_the-very-real-horst_chinese-gong-finish-session-2014-06-10-29-143.wav | the_very_Real_Horst (via Freesound) | CC0 | 28 s and 16 s. |
| gong-vibrant-stephan-{1,2} | gong or large bell, struck | — | commons File:Gong_or_bell_vibrant.ogg | stephan (PDSounds) | Public domain | Two strikes taken from a 64 s file, 14 s and 16 s. |
| gong-stephan-55-{1,2} | small gong | — | commons File:Gong55.ogg | stephan | CC0 | 5 s each. |
| carillon-copenhagen-vorfrelsers | carillon, Vor Frelsers Kirke, Copenhagen (a played passage) | — | commons File:Vor_Frelsers_Kirke_Copenhagen_carillon_sample.ogg | Ib Rasmussen | Public domain | 33.5 s. A melody, not single notes. |
| carillon-netherlands-frolic-excerpt | Netherlands Carillon, Arlington ("Frolic" from *Music for Twilight*) | — | commons File:"Frolic"_from_"Music_for_Twilight"_on_the_Netherlands_Carillon.ogg | National Park Service | Public domain | The first 40 s of 189 s. Also a played piece. |
| gong-iowa-{20windgong,22tamtam,28tamtam,40tamtam}-ff | 20" wind gong; 22", 28" and 40" tam-tams, struck ff | — | theremin.music.uiowa.edu/MIS-Pitches-2012/MISGongsTamTams2012.html | U. Iowa EMS | free, "without restrictions" | **Best low metal in the set.** Studio-clean, capped at 40 s (originals 42-66 s), 8 s fade. The 40" is the deepest. |
| bowed-gong-iowa-{20windgong,22tamtam,28tamtam,40tamtam} | the same gongs, bowed | — | same page | U. Iowa EMS | free, "without restrictions" | 14-21 s. |
| bowed-cymbal-iowa-{13crash,17crash,18crash,20crash,16chinese,19chinese,20chinese,21ride,splash} | suspended cymbals, bowed | — | theremin.music.uiowa.edu/MIS-Pitches-2012/MISCymbals2012.html | U. Iowa EMS | free, "without restrictions" | 12-20 s each (splash 5.6 s). Peaks are already near 0 dB. |
| bowed-vibraphone-iowa-{C3,G3,C4,E4,G4,C5,E5,G5} | vibraphone, bowed | C3 to G5 | .../MISVibraphone2012.html | U. Iowa EMS | free, "without restrictions" | 9-13 s. Every chromatic note from C3 to F6 is on the site; only these 8 were fetched. |
| bowed-cymbal-vsco-{1,2,3,4} | suspended cymbal, bowed | — | VSCO-2-CE `Percussion/susCymb1-bow-*.wav` | Versilian Studios | CC0 1.0 | Quiet originals, +24 to 33 dB of gain, so listen for hiss. Take 2 is only 2.5 s. |
| gong-vsco2-{fff,mf,p} | gong (tam-tam), struck at three strengths | — | VSCO-2-CE `Percussion/gongHit_*.wav` | Versilian Studios | CC0 1.0 | 27-34 s. Take p had +26 dB of gain. |
| gong-vsco1-{hit_ff,hit_mf,hit_pp,roll_long_f,smack_low_1} | gong (VSCO 1): hits, a long roll, a low smack | — | VSCO-2-CE `VSCO 1 Percussion/varMetal/Gong/` | Versilian Studios | CC0 1.0 | hit_pp needed +41 dB, so it is probably noisy (drop it if so). The folder has 20 more takes. |
| gong-scrape-vsco2-mf | gong, scraped | — | VSCO-2-CE `Percussion/gongscrape_mf.wav` | Versilian Studios | CC0 1.0 | 9.4 s. A texture. |

### Second-run gaps

- **Commons rate limit again.** upload.wikimedia.org returned 429 after about 12 downloads, even with gaps of 5-30 s and backing off for up to 60 s. Still not fetched: `Röhrenglocken (Windspiel).ogg` (CC BY-SA 3.0 de), `Samariter Church Bell II (g)` and `III (b)`, `NiederRoden ... Glocke4`, `Striking a bell 15cm large.ogg`, the ghanta and handbell files listed above, and the new finds `Pummerin.ogg` (Vienna's big bell, PD, 109 KB), `Pummerin, St. Stephan, Vienna - October 26, 2013.ogg` (CC BY-SA 4.0), `Cathedral Fribourg stroke 9 o clock 01.ogg` (hour strokes, CC BY-SA 4.0) and `Schildau St. Marien Kleine Glocke 1 Schlag.ogg` (CC BY-SA 4.0). Try again another day.
- **Korean beomjong:** none on Commons. One CC "Public Domain Mark" field recording on the Internet Archive (aporee, Shilsang Temple) turned out to be steady ambience with no bell, so it was deleted.
- **Carillon single low notes:** none. Only played passages.
- **Baritone/bass wind chimes (Corinthian-style tubes, bamboo):** nothing clearly licensed outside Freesound. The Commons tubular wind chime is still rate-limited.
- **Bowed crotales:** the Iowa crotale page has no bowed files.
- **Philharmonia:** skipped. Its terms forbid redistributing the samples as samples, so the licence is not clear enough.
- **Internet Archive:** a search for PD/CC0 bell, gong and chime items returned almost only talk, music and city soundscapes.

New CC BY / BY-SA credits needed if used: NemesisIII, Culasse, Jnn.
