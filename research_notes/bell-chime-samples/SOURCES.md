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
