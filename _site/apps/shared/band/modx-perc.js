// modx-perc.js — percussion auditions on the MODX (gear/modx-perc.qmd, global ModxPerc). Short loops written key for key
// against four MODX+ drum kits, sent straight out over Web MIDI through BandModx.note, so you can hear the congas, bongos,
// timbales, bells and brushes on the board and mark the ones you'd use.
//
//   ModxPerc.KITS[ch] = { name, keys: { "C1": "Conga1 Hi Open 1-2", … } }   the Data List's Drum Kit Assign List
//       (Yamaha MODX6+/7+/8+ Data List, ~/Documents/Manuals/Yamaha-MODX-plus-Data-List.pdf), read from the PDF's text: which
//       table belongs to which kit name was inferred from the page layout, so check a key by ear (the Kit walk) if one sounds wrong.
//   ModxPerc.PATTERNS = [pattern]   ModxPerc.parse(pattern) -> { bars, steps, hits: [{ step, key, midi, vel, len }] }
//   ModxPerc.midi("C3") -> 60   Yamaha note names: middle C = C3, so C0 = MIDI 24 and C-2 = 0.
//   ModxPerc.mount(el)  draws the page.
//
// Pattern: { id, name, group, chs: [default ch, …others it fits], bpm, beats, steps (cells per bar), about,
//            parts: { key: "cells|cells" } }  one character per cell, bars split by "|":
//   X 0.95 · x 0.75 · o 0.55 · g 0.3 (ghost) · . rest · "-" holds the hit before (longer note-off; most kit keys ignore it).
// Brush patterns use the keys that mean the same thing on all three brush kits (C#0–E0 and D1 brush snares, C1 kick, C#1 rim click,
// G#1 hi-hat foot, D#2 / B2 brush ride, F1–D2 toms, C3–F#3 the small Latin set), so "Take turns" can play one pattern on each kit.
//
// `checked` (shown on the card) says what in a pattern was checked against which source (scripts/sources/modx-perc.py, Works
// Cited on the page) and what is still the site's own; a pattern without it is UNVERIFIED throughout. Checked 2026-11-04: tumbao,
// martillo, cáscara orientation (it was written 3-2 under a 2-3 title; fixed), paila left hand, cha-cha-chá bell and güiro,
// the 12/8 bell, pandeiro, brush ballad and swing hands. Most sources give grids as images or count them differently, so these are
// the commonest readings, not the only ones.
(function (global) {
  "use strict";
  var KITS = {
    9: { name: "Pop Latin Kit", keys: {"C0": "Claves1", "C#0": "Cajon1 Kick", "D0": "Cajon1 Slap", "D#0": "Cajon1 Tip 1-2", "E0": "Claves1", "F0": "Wood Block", "F#0": "Hand Clap1 St", "G0": "Ride2 L", "G#0": "HipHop Snap2", "A0": "Castanet1", "A#0": "Conga1 Hi Tip", "B0": "Conga1 Hi Heel", "C1": "Conga1 Hi Open 1-2", "C#1": "Conga1 Hi Mute", "D1": "Conga1 Hi Slap Open", "D#1": "Conga1 Hi Slap", "E1": "Conga1 Hi SlpMute1-2", "F1": "Conga1 Lo Tip", "F#1": "Conga1 Lo Heel", "G1": "Conga1 Lo Open 1-2", "G#1": "Conga1 Lo Mute", "A1": "Conga1 Lo Slap Open", "A#1": "Conga1 Lo Slap Open", "B1": "Conga1 Lo Open 1", "C2": "Bongo1 Hi 1Fingr 1-2", "C#2": "Bongo1 Hi 3Fingr 1-2", "D2": "Bongo1 Hi Rim", "D#2": "Bongo1 Hi Tip", "E2": "Bongo1 Hi Heel", "F2": "Bongo1 Hi Slap", "F#2": "Bongo1 Lo 1Fingr 1-2", "G2": "Bongo1 Lo 3Fingr 1-2", "G#2": "Bongo1 Lo Rim", "A2": "Bongo1 Lo Tip", "A#2": "Bongo1 Lo 3Fingr 1-2", "B2": "Bongo1 Hi Slap", "C3": "Timbale1 Lo 1-2", "C#3": "Quinto1 Slap", "D3": "Quinto1 Open", "D#3": "Conga1 Hi Tip", "E3": "Tumba Open", "F3": "Paila L", "F#3": "Timbale1 Hi 1-3", "G3": "Pandeiro1 Open", "G#3": "Pandeiro1 Thump", "A3": "Pandeiro1 Tip", "A#3": "Pandeiro1 Heel", "B3": "Paila H", "C4": "Cowbell2", "C#4": "Cowbell2", "D4": "Agogo1 Hi", "D#4": "Agogo1 Hi", "E4": "Guiro1 Short", "F4": "Guiro1 Long", "F#4": "MetalGuiro Short 1-2", "G4": "MetalGuiro Long", "G#4": "Tambourine1 Sw", "A4": "Tmbourim Open", "A#4": "Tmbourim Mute", "B4": "Tmbourim Finger", "C5": "Maracas1 Sw", "C#5": "ShakerA 13", "D5": "Cabasa1A 1-2", "D#5": "Cuica1 Lo", "E5": "Cuica1 Hi", "F5": "Cowbell1", "F#5": "Mambo Bell Body", "G5": "Shekere Down", "G#5": "Shekere Slap", "A5": "Triangle1 Mute", "A#5": "Triangle1 Open", "B5": "Whistle", "C6": "Wind Chime 1"} },
    10: { name: "Real Brushes Kit", keys: {"C0": "Sd LW Brush Swir2 Sw", "C#0": "Sd LW Brush Combi Sw", "D0": "Sd LW Brush Swir3", "D#0": "Sd LW Brush Slap Sw", "E0": "Sd LW Brush Swir4", "F0": "Sd LW Brush Swir5", "F#0": "Sd LW Brush Swir6", "G0": "Sd LW Brush Tap1 Sw", "G#0": "Stick1", "A0": "PL Kick1 Sw", "A#0": "Sd LW Brush Rim1 Sw", "B0": "PL Kick2 Sw", "C1": "Bd PL Jazz HiSna Sw", "C#1": "Sd Closed Rim6", "D1": "Sd LW Brush Tap2 Sw", "D#1": "Hand Clap3 Sw", "E1": "Sd LW Brush Rim2 Sw", "F1": "Tom Jazz FLR Sw", "F#1": "HH IB Brush Cls", "G1": "Tom Jazz LL Sw", "G#1": "HH IB Brush Pdl", "A1": "Tom Jazz LL Sw", "A#1": "HH IB Brush Opn", "B1": "Tom Jazz LH Sw", "C2": "Tom Jazz M Sw", "C#2": "Jazz Crash1 Sw", "D2": "Tom Jazz H Sw", "D#2": "Ride Brush3 Tip Sw", "E2": "ZJ Crash Brush Sw", "F2": "Ride Brush3 Cup Sw", "F#2": "Tambourine1 Sw", "G2": "ZJ Splash2 Sw", "G#2": "Cowbell5", "A2": "Jazz Crash2 Sw", "A#2": "Vibraslap1", "B2": "Ride Brush4 Cup Sw", "C3": "Bongo1 Hi 1Fingr 1-2", "C#3": "Bongo1 Lo 1Fingr 1-2", "D3": "Conga1 Hi SlpMute1-2", "D#3": "Conga1 Hi Open 1-2", "E3": "Conga1 Lo Open 1-2", "F3": "Timbale1 Hi 1-3", "F#3": "Timbale1 Lo 1-2", "G3": "Agogo1 Hi", "G#3": "Agogo1 Lo", "A3": "Cabasa1A 1-2", "A#3": "Maracas1 Slur", "B3": "Whistle", "C4": "Whistle", "C#4": "Guiro1 Short", "D4": "Guiro1 Long", "D#4": "Claves1", "E4": "Wood Block", "F4": "Wood Block", "F#4": "Cuica1 Hi", "G4": "Cuica1 Lo", "G#4": "Triangle1 Mute", "A4": "Triangle1 Open", "A#4": "ShakerA 13", "B4": "Sleigh Bell1", "C5": "Wind Chime 1", "C#5": "Sd Bld St1-4", "D5": "Sd Blues 3St", "D#5": "Sd Hip St1-2", "E5": "Sd Funk St1-3", "F5": "Sd Soul St1-4", "F#5": "Sd LdwHMono", "G5": "Sd Heavy", "G#5": "Sd Tight St1-4", "A5": "Sd BluesHeart St1-3", "A#5": "Bd Snap 1-2", "B5": "Bd Tight 1-2", "C6": "Bd Funk St1-2"} },
    11: { name: "Jazz Brushes Kit", keys: {"C0": "HH Dark Pedal 1-2 L", "C#0": "Sd Brush Soft St", "D0": "Sd Brush Swir St", "D#0": "Sd Brush Med St", "E0": "Sd Brush SwirAtt St", "F0": "Sd Roll Mono", "F#0": "Castanet1", "G0": "Sd NJz 1 St", "G#0": "Stick2", "A0": "Bd Jazz1St", "A#0": "Sd Metal OpRm 1-2 St", "B0": "Bd FK Jazz St", "C1": "Bd FK Jazz St", "C#1": "Sd NJz ClRm St", "D1": "Sd Brush vari St", "D#1": "Sd Brush Soft St", "E1": "Sd Brush Med St", "F1": "Tom Brush Floor St", "F#1": "HH Brush Closed", "G1": "Tom Brush Low St", "G#1": "HH Brush Pedal", "A1": "Tom Brush Mid St", "A#1": "HH NJz Open 1-2 St", "B1": "Tom Brush Mid St", "C2": "Tom Brush Hi St", "C#2": "Crash Brush2 St", "D2": "Tom Brush Hi St", "D#2": "Ride Brush2 St", "E2": "Crash Brush1 St", "F2": "Crash Brush Cup St", "F#2": "Tambourine2 Sw", "G2": "Splash2 St", "G#2": "Cowbell3 Sw", "A2": "Crash Brush2 St", "A#2": "Vibraslap2", "B2": "Ride Brush1 R", "C3": "Bongo2 Hi Open 2", "C#3": "Bongo2 Lo Open 2", "D3": "Conga2 Hi Slap 2", "D#3": "Conga2 Hi Open 2", "E3": "Conga2 Lo Open 1", "F3": "Timbale2 Hi 2", "F#3": "Timbale2 Lo 2", "G3": "Agogo1 Hi", "G#3": "Agogo1 Lo", "A3": "Cabasa1B 1-4", "A#3": "Maracas1 Slur", "B3": "Whistle", "C4": "Whistle", "C#4": "MetalGuiro Short 1-2", "D4": "MetalGuiro Long", "D#4": "Claves2", "E4": "Resin Block Small", "F4": "Resin Block Large", "F#4": "Cuica1 Hi", "G4": "Cuica1 Lo", "G#4": "Triangle1 Mute", "A4": "Triangle1 Open", "A#4": "ShakerB Sw", "B4": "Sleigh Bell2", "C5": "Wind Chime 1", "C#5": "Finger Snap3", "D5": "Surdo2 Open", "D#5": "Conga2 Hi Tip", "E5": "Conga2 Hi Heel", "F5": "Conga2 Hi Slap 1-2", "F#5": "Conga2 Hi Mute", "G5": "Conga2 Hi Open 1-2", "G#5": "Conga2 Lo Slide", "A5": "Conga2 Lo Open 1-2", "A#5": "Djembe2 Mute", "B5": "Djembe2 Lo", "C6": "Djembe2 Slap"} },
    12: { name: "Brush Kit", keys: {"C0": "Claves1", "C#0": "Sd Brush Soft St", "D0": "Sd Brush Swir St", "D#0": "Sd Brush Med St", "E0": "Sd Brush SwirAtt St", "F0": "Sd LiveRoll St", "F#0": "Castanet1", "G0": "Sd Brush Soft St", "G#0": "Stick1", "A0": "Bd Funk St1-2", "A#0": "Sd Basic 3St", "B0": "Bd Jazz1-2St", "C1": "Bd FK Jazz St", "C#1": "Sd Closed Rim4 St", "D1": "Sd Brush Med St", "D#1": "Hand Clap1 St", "E1": "Sd Brush vari St", "F1": "Tom Brush Floor St", "F#1": "HH Power ClTip 1-4St", "G1": "Tom Brush Low St", "G#1": "HH Power ClPedal St", "A1": "Tom Brush Low St", "A#1": "HH Power Open EdgeSt", "B1": "Tom Brush Mid St", "C2": "Tom Brush Mid St", "C#2": "Crash Brush1 St", "D2": "Tom Brush Hi St", "D#2": "Ride Brush1 St", "E2": "China1 St", "F2": "Crash Brush Cup St", "F#2": "Tambourine1 Sw", "G2": "Splash1 St", "G#2": "Cowbell2", "A2": "Crash Brush2 St", "A#2": "Vibraslap1", "B2": "Ride Brush2 St", "C3": "Bongo1 Hi 1Fingr 1-2", "C#3": "Bongo1 Lo 1Fingr 1-2", "D3": "Conga1 Hi SlpMute1-2", "D#3": "Conga1 Hi Open 1-2", "E3": "Conga1 Lo Open 1-2", "F3": "Timbale1 Hi 1-3", "F#3": "Timbale1 Lo 1-2", "G3": "Agogo1 Hi", "G#3": "Agogo1 Lo", "A3": "Cabasa1A 1-2", "A#3": "Maracas1 Slur", "B3": "Whistle", "C4": "Whistle", "C#4": "Guiro1 Short", "D4": "Guiro1 Long", "D#4": "Claves1", "E4": "Wood Block", "F4": "Wood Block", "F#4": "Cuica1 Hi", "G4": "Cuica1 Lo", "G#4": "Triangle1 Mute", "A4": "Triangle1 Open", "A#4": "ShakerA 13", "B4": "Sleigh Bell1", "C5": "Wind Chime 1", "C#5": "Sd Bld St1-4", "D5": "Sd Blues 3St", "D#5": "Sd Hip St1-2", "E5": "Sd Funk St1-3", "F5": "Sd Soul St1-4", "F#5": "Sd LdwHMono", "G5": "Sd Heavy", "G#5": "Sd Tight St1-4", "A5": "Sd BluesHeart St1-3", "A#5": "Bd Snap 1-2", "B5": "Bd Tight 1-2", "C6": "Bd Funk St1-2"} },
  };
  var SLOTS = ["s1", "s2", "s3", "s4"];
  var CLAVE23_8 = "..x.x...|x..x..x.";
  var PATTERNS = [
    // ---------------- Pop Latin Kit (channel 9) ----------------
    { id: "tumbao", name: "Conga tumbao, son clave 2-3", group: "latin", chs: [9], bpm: 100, beats: 4, steps: 8,
      about: "One high conga: heel, tip, slap, tip, heel, tip, two open tones (4 and its &); the second bar puts the last open tone on the low conga.",
      checked: "Heel-tip-slap-tip-heel-tip-open-open with the slap on 2 and the open tones on 4 and 4&: Wikipedia (Tumbao; Salsa), Salsa Vida, Soundbrenner.",
      parts: { "B0": "o...o...|o...o...", "A#0": ".g.g.g..|.g.g.g..", "D#1": "..X.....|..X.....", "C1": "......xx|......x.", "G1": "........|.......x", "C0": CLAVE23_8 } },
    { id: "conga-strokes", name: "Every conga stroke in turn", group: "latin", chs: [9], bpm: 80, beats: 4, steps: 4,
      about: "High conga then low: tip, heel, open, mute, slap open, slap, slap-mute — one a beat, to learn which key is which.",
      parts: { "A#0": "x...|....|....|....", "B0": ".x..|....|....|....", "C1": "..x.|....|....|....", "C#1": "...x|....|....|....",
               "D1": "....|x...|....|....", "D#1": "....|.x..|....|....", "E1": "....|..x.|....|....",
               "F1": "....|....|x...|....", "F#1": "....|....|.x..|....", "G1": "....|....|..x.|....", "G#1": "....|....|...x|....",
               "A1": "....|....|....|x...", "B1": "....|....|....|.x.." } },
    { id: "martillo", name: "Bongo martillo with güiro (bolero feel)", group: "latin", chs: [9], bpm: 84, beats: 4, steps: 8,
      about: "Eight strokes on the small drum (macho) — slap, fingers, open, thumb, slap, fingers — then an open tone on the big drum (hembra) on beat 4, thumb; accents on 1, 3 and 4. Güiro long-short-short, maracas, low conga open on 4.",
      checked: "Stroke order and accents: the bongo martillo as described by Dummies and the Bongo Patterns page (both say the 4th beat is on the hembra). Güiro and maracas: the site's.",
      parts: { "F2": "X...X...|X...X...", "D#2": ".g...g..|.g...g..", "C2": "..x.....|..x.....", "E2": "...g...g|...g...g", "F#2": "......X.|......X.",
               "F4": "x...x...|x...x...", "E4": "..oo..oo|..oo..oo", "C5": "oooooooo|oooooooo", "G1": "......x.|......x." } },
    { id: "cascara", name: "Timbales: cascara on the shell, clave 2-3", group: "latin", chs: [9], bpm: 96, beats: 4, steps: 8,
      about: "Right hand on the paila (timbale shell): 1, 2, 3, &3, &4 on the clave's 2-side, then 1, 2, &2, &3, &4 on its 3-side. Left hand on the low drum: muffled on 2, open on 4. Conga tumbao underneath.",
      checked: "Cáscara grid: the 2-3 reading in the Salsa Forums thread (a transcription, asked for confirmation), matching the 3-2 halves swapped as Soundbrenner and Absil describe; Soundbrenner's own grid differs, so hear it against a recording. Left hand: Artdrum's paila lesson (muffled on 2, open on 4).",
      parts: { "F3": "x.x.xx.x|x.xx.x.x", "C3": "..g...X.|..g...X.", "C0": CLAVE23_8, "B0": "o...o...|o...o...", "D#1": "..x.....|..x.....", "C1": "......xx|......x.", "G1": "........|.......x" } },
    { id: "abanico", name: "Timbale fills (abanico) into a cowbell groove", group: "latin", chs: [9], bpm: 104, beats: 4, steps: 16,
      about: "Bongo bell (Cowbell2) on the beats, accented on 1 and 3; at the end of every second bar a quick roll on the high timbale (the abanico, a pick-up) lands with a hard hit on the next 1.",
      checked: "Unverified: the abanico's exact rhythm varies (open, closed or single strokes by tempo); this is one short form. The bongo-bell part is simplified to the beats.",
      parts: { "C4": "X...x...X...x...|X...x...X.......", "F#3": "X...............|............xxxx", "C3": "................|.......x...x....",
               "C1": "......xx......xx|......xx........", "C0": "....x...x.......|x.....x.....x..." } },
    { id: "chacha", name: "Cha-cha-chá: bell, güiro, conga", group: "latin", chs: [9], bpm: 116, beats: 4, steps: 8,
      about: "Big bell (Cowbell1) on the beats, güiro long-short-short, the conga's tumbao, the timbale on 4 and its &.",
      checked: "Bell in steady quarters and the güiro's long quarter + two short eighths: Jazz Education Network. The conga is the tumbao (Artdrum: same as cha-cha-chá, faster). Timbale hits: the site's.",
      parts: { "F5": "x.x.x.x.|x.x.x.x.", "F4": "x...x...|x...x...", "E4": "..oo..oo|..oo..oo",
               "B0": "o...o...|o...o...", "D#1": "..X.....|..X.....", "C1": "......xx|......xx", "C3": "......x.|......x.", "F#3": ".......x|.......x" } },
    { id: "bells", name: "Bell check: every bell and metal", group: "latin", chs: [9], bpm: 90, beats: 4, steps: 8,
      about: "Bar by bar: bongo bell (Cowbell2), big bell (Cowbell1), mambo bell, agogô, triangle mute/open, shekere.",
      parts: { "C4": "x.x.x.xx|........|........|........|........|........", "F5": "........|x.x.x.xx|........|........|........|........",
               "F#5": "........|........|x.xx.x.x|........|........|........", "D4": "........|........|........|x.x.xx.x|........|........",
               "A5": "........|........|........|........|xxxxxxx.|........", "A#5": "........|........|........|........|.......x|........",
               "G5": "........|........|........|........|........|x.x.x.x.", "G#5": "........|........|........|........|........|.x.x.x.x" } },
    { id: "bembe", name: "Bembé in 12/8: bell, shekere, congas", group: "latin", chs: [9], bpm: 96, beats: 4, steps: 12,
      checked: "Bell: the standard pattern, strokes on 1, 1a, 2&, 2a, 3&, 4, 4a (Wikipedia, Bell pattern). Shekere and congas: the site's.",
      about: "The long 12/8 bell (Mambo Bell Body), shekere on the beats, low conga open tones and high-conga slaps.",
      parts: { "F#5": "x.x.xx.x.x.x|x.x.xx.x.x.x", "G5": "x..x..x..x..|x..x..x..x..", "G#5": ".x..x..x..x.|.x..x..x..x.",
               "G1": "x.....x.....|x.....x..x..", "D#1": "...X.....X..|...X.....X..", "A#0": ".g.g.g.g.g.g|.g.g.g.g.g.g" } },
    { id: "samba", name: "Samba: pandeiro, tamborim, shaker, cuíca", group: "latin", chs: [9], bpm: 96, beats: 4, steps: 16,
      checked: "Pandeiro: thumb, fingertips, heel, fingertips on 1 e & a (Acoustics Today; Dende Arts). Tamborim (a teleco-teco-like figure), shaker and cuíca: unverified, the site's.",
      about: "Pandeiro thump/tip/heel sixteenths with the open slap on 2 and 4, tamborim, shaker, a cuíca answering each second bar.",
      parts: { "G#3": "x.......x.......|x.......x.......", "G3": "....X.......X...|....X.......X...", "A3": ".g.g.g.g.g.g.g.g|.g.g.g.g.g.g.g.g", "A#3": "..o...o...o...o.|..o...o...o...o.",
               "A4": "X.x..x.x..x.x...|X.x..x.x.x..x...", "B4": "...x.........x..|...x.......x....", "C#5": "xgogxgogxgogxgog|xgogxgogxgogxgog",
               "E5": "................|........x.x.....", "D#5": "................|............x..x" } },
    { id: "cajon", name: "Cajón and shaker (unplugged pop)", group: "latin", chs: [9], bpm: 92, beats: 4, steps: 16,
      about: "Cajón bass and slap with tip ghost notes, a shaker in sixteenths, a clap on 4 every second bar.",
      parts: { "C#0": "X.....x.X.......|X.....x.X..x....", "D0": "....X.......X...|....X.......X...", "D#0": "..g...g.g.g...gg|..g...g...g...g.",
               "C#5": "xgogxgogxgogxgog|xgogxgogxgogxgog", "F#0": "................|............x..." } },

    // ---------------- brush kits (channels 10, 11, 12) ----------------
    { id: "ballad", name: "Brush ballad: swirls on every beat", group: "brush", chs: [10, 11, 12], bpm: 64, beats: 4, steps: 16,
      about: "Both brushes stir on the head (a swirl held through each beat), with the swirl's attack marking 2 and 4; feathered kick, hi-hat foot on 2 and 4.",
      checked: "Ballad: both hands stir in opposite directions (BYU Percussion, Brushes). Hi-hat and kick: the usual jazz-kit habit, not checked.",
      parts: { "D0": "o---o---o---o---", "E0": "....o.......o...", "C1": "g.......g.......", "G#1": "....x.......x..." } },
    { id: "snare-sounds", name: "The brush snare keys in turn", group: "brush", chs: [10, 11, 12], bpm: 72, beats: 4, steps: 4,
      about: "C#0, D0, D#0, E0, then D1, D#1, E1 — the brush snare keys each kit has, one a beat (Real Brushes has more on C0–G0).",
      parts: { "C#0": "x...|....", "D0": ".x..|....", "D#0": "..x.|....", "E0": "...x|....", "D1": "....|x...", "D#1": "....|.x..", "E1": "....|..x." } },
    { id: "swing-snare", name: "Medium swing on the snare (brushes)", group: "brush", chs: [10, 11, 12], bpm: 132, beats: 4, steps: 12,
      about: "Left hand stirs (swirl from 1 and 3), the right hand swings the ride rhythm on the snare and accents 2 and 4 where the hands cross; hi-hat foot on 2 and 4, feathered kick.",
      checked: "Right hand swings while the left stirs, the hands trading places on 2 and 4 (BYU Percussion, Brushes). Exact taps: the site's.",
      parts: { "D0": "o-----o-----", "D#0": "x..X.xx..X.x", "G#1": "...x.....x..", "C1": "g..g..g..g.." } },
    { id: "swing-ride", name: "Medium swing on the brush ride", group: "brush", chs: [10, 11, 12], bpm: 132, beats: 4, steps: 12,
      about: "Ride brush spang-a-lang, a soft snare swirl under it, hi-hat foot on 2 and 4, a comp on the snare every so often.",
      parts: { "D#2": "x..x.xx..x.x|x..x.xx..x.x", "D0": "g-----g-----|g-----g-----", "G#1": "...x.....x..|...x.....x..", "D#0": "............|.....o....o.", "C1": "g.....g.....|g.....g....." } },
    { id: "uptempo", name: "Up-tempo two-feel, brushes", group: "brush", chs: [10, 11, 12], bpm: 208, beats: 4, steps: 12,
      about: "Ride brush on the beats with skips, kick on 1 and 3 (the bass's two-feel), hi-hat foot on 2 and 4.",
      parts: { "B2": "x..x.xx..x.x", "C1": "o.....o.....", "G#1": "...x.....x..", "D1": ".......g...." } },
    { id: "bossa", name: "Brush bossa nova", group: "brush", chs: [10, 11, 12], bpm: 140, beats: 4, steps: 8,
      checked: "Unverified: the cross-stick bossa figure and the kick's dotted-quarter + eighth are the usual drum-kit bossa, not checked against a source here.",
      about: "Rim click on the bossa pattern, a swirl on every beat, the kick's long-short, hi-hat foot on the ands.",
      parts: { "C#1": "x..x..x.|..x..x..", "D0": "g-g-g-g-|g-g-g-g-", "C1": "x..xx..x|x..xx..x", "G#1": ".o.o.o.o|.o.o.o.o" } },
    { id: "waltz", name: "Jazz waltz, brushes", group: "brush", chs: [10, 11, 12], bpm: 150, beats: 3, steps: 9,
      about: "Ride brush on 1, 2 and its pickup, 3; the swirl on 1; hi-hat foot on 2 and 3; kick feathered on 1.",
      parts: { "D#2": "x..x.xx..", "D0": "o--------", "G#1": "...x..x..", "C1": "g........" } },
    { id: "fill", name: "Brush time, then a tom fill and crash", group: "brush", chs: [10, 11, 12], bpm: 96, beats: 4, steps: 16,
      about: "A bar of brush time, then sixteenths down the toms (high to floor) and a brush crash on the 1. Real Brushes' toms are its jazz (stick) toms.",
      parts: { "D0": "o---o---o---o---|o---o-----------", "D#0": "....x.......x...|....x...........", "G#1": "....x.......x...|....x...........",
               "D2": "................|........xx......", "C2": "................|..........xx....", "B1": "................|............x...",
               "A1": "................|.............x..", "G1": "................|..............x.", "F1": "................|...............x",
               "C#2": "X...............|................", "C1": "X.......g.......|g..............." } },
    { id: "kit-latin", name: "The kits' own Latin keys (C3–F#3)", group: "brush", chs: [10, 11, 12], bpm: 100, beats: 4, steps: 8,
      about: "Each brush kit's small hand-percussion set: bongos C3/C#3, congas D3–E3, timbales F3/F#3, with the kit's own clave (D#4). Jazz Brushes uses the Conga2 / Bongo2 samples.",
      parts: { "C3": "x.x.x...|x.x.x...", "C#3": ".g.g...x|.g.g..xx", "D3": "..X.....|..X.....", "D#3": "......xx|......x.", "E3": "........|.......x",
               "F3": "x.xx.x.x|x.x.xx.x", "F#3": "........|......x.", "D#4": CLAVE23_8 } },
    { id: "conga2", name: "Conga2 tumbao (Jazz Brushes, D#5–A5)", group: "brush", chs: [11], bpm: 100, beats: 4, steps: 8,
      about: "The same tumbao as on the Pop Latin Kit, on the Jazz Brushes Kit's second conga samples: compare it with the first pattern.",
      parts: { "E5": "o...o...|o...o...", "D#5": ".g.g.g..|.g.g.g..", "F5": "..X.....|..X.....", "G5": "......xx|......x.", "A5": "........|.......x", "D#4": CLAVE23_8 } },
    // ---------------- rock, pop, R&B, hip-hop: any kit, in the four test slots ----------------
    { id: "rock8", name: "Basic rock beat", group: "rock", chs: SLOTS, bpm: 112, beats: 4, steps: 8,
      about: "Hi-hat eighths, kick on 1 and 3, snare on 2 and 4 (the backbeat), a crash to start.",
      checked: "Kick and snare alternating on the beats with the hi-hat on the eighths, the snare on 2 and 4: Wikipedia, Drum beat ('straight blues/rock groove') and Backbeat. The crash: the site's.",
      parts: { "F#1": "xoxoxoxo|xoxoxoxo", "C1": "X...X...|X...X...", "D1": "..X...X.|..X...X.", "C#2": "X.......|........" } },
    { id: "halftime", name: "Half-time rock", group: "rock", chs: SLOTS, bpm: 140, beats: 4, steps: 8,
      about: "The snare moves to beat 3 and the hi-hat plays only quarter notes: the song feels half as fast.",
      checked: "Snare on 3, hi-hat on the quarter notes: Wikipedia, Drum beat (half-time). The kick's extra note: the site's.",
      parts: { "F#1": "x.x.x.x.|x.x.x.x.", "C1": "X.......|X....x..", "D1": "....X...|....X...", "C#2": "X.......|........" } },
    { id: "rockfill", name: "Rock groove, tom fill, crash", group: "rock", chs: SLOTS, bpm: 116, beats: 4, steps: 16,
      about: "A bar of eighth-note rock on the ride, then a sixteenth-note fill down the toms into a crash on the next 1. Good for hearing each kit's toms. (Hip Hop Kit 4 has T8 congas on the tom keys, R&B Kits 1 and 3 have T8 kicks on some.)",
      parts: { "D#2": "x.x.x.x.x.x.x.x.|x.x.x.x.........", "C1": "X.......X.x.....|X.......X.......", "D1": "....X.......X...|....X...........",
               "D2": "................|........xx......", "C2": "................|..........xx....", "B1": "................|............xx..",
               "F1": "................|..............xx", "C#2": "X...............|................" } },
    { id: "fourfloor", name: "Four on the floor (disco / dance-pop)", group: "pop", chs: SLOTS, bpm: 122, beats: 4, steps: 16,
      about: "Kick on every beat, the open hi-hat on every offbeat, snare and clap together on 2 and 4.",
      checked: "Kick on every beat: Wikipedia, Four on the floor. 'An open hissing hi-hat on the off-beat': Wikipedia, Disco. Snare/clap on 2 and 4: the backbeat (Wikipedia, Backbeat).",
      parts: { "C1": "X...X...X...X...", "A#1": "..x...x...x...x.", "F#1": "x...x...x...x...", "D1": "....x.......x...", "D#1": "....X.......X..." } },
    { id: "motown", name: "Motown: snare on every beat, tambourine", group: "pop", chs: SLOTS, bpm: 124, beats: 4, steps: 8,
      about: "The snare on all four beats (heavier on 2 and 4), tambourine in eighths, kick on 1 and 3.",
      checked: "Snare on all four beats in some Motown grooves, tambourine in eighths, kick on 1 and 3: Soundbrenner, Motown groove; Benny Benjamin's quarter-note snare: Rock & Roll Hall of Fame. Accents: the site's.",
      parts: { "D1": "o.X.o.X.|o.X.o.X.", "F#2": "xoxoxoxo|xoxoxoxo", "C1": "X...X...|X...X..x" } },
    { id: "popballad", name: "Pop ballad: side stick, then snare", group: "pop", chs: SLOTS, bpm: 72, beats: 4, steps: 16,
      about: "A verse bar on the side stick (rim click), a chorus bar on the full snare with the crash, hi-hat eighths, kick on 1 and the & of 2.",
      parts: { "F#1": "x.o.x.o.x.o.x.o.|x.o.x.o.x.o.x.o.", "C#1": "....x.......x...|................", "D1": "................|....X.......X...",
               "C1": "X.....x.X.......|X.....x.X.....x.", "C#2": "................|X..............." } },
    { id: "funk16", name: "Funk sixteenths, ghost notes, delayed backbeat", group: "rnb", chs: SLOTS, bpm: 98, beats: 4, steps: 16,
      about: "Hi-hat sixteenths, a syncopated kick, ghost notes on the snare, and the second backbeat pushed from 4 to the & of 4.",
      checked: "The delayed backbeat (snare on the last eighth of the bar), funk: Wikipedia, Drum beat. Ghost notes, kick and hats: the site's.",
      parts: { "F#1": "xoxoxoxoxoxoxoxo", "C1": "X.x.......x..x..", "D1": "....X..g.g.g..X.", "A#1": "..............o." } },
    { id: "purdie", name: "Half-time shuffle (Purdie-style)", group: "rnb", chs: SLOTS, bpm: 84, beats: 4, steps: 12,
      about: "Shuffled triplets on the hi-hat, the backbeat on 3 (half-time), soft ghost notes on the snare in the middle of each triplet.",
      checked: "'Triplets against a half-time backbeat' with 'syncopated ghost notes on the snare drum': Wikipedia, Bernard Purdie. Where each ghost note and kick goes: the site's.",
      parts: { "F#1": "x.xx.xx.xx.x", "D1": ".g..g.Xg..g.", "C1": "X....x...x.." } },
    { id: "newjack", name: "New jack swing", group: "rnb", chs: SLOTS, bpm: 106, beats: 4, steps: 24,
      about: "Swung sixteenths on the hi-hat with the offbeat accented, a hard snare and clap on 2 and 4, a syncopated kick. Try it on the Analog T8 / T9 and R&B kits.",
      checked: "'Offbeat accented 16th note triplets' and a prominent TR-808 snare: Wikipedia, New jack swing. The kick: the site's.",
      parts: { "F#1": "o.oX.oo.oX.oo.oX.oo.oX.o", "C1": "X........x.....X.....x..", "D1": "......X...........X.....", "D#1": "......x...........x....." } },
    { id: "neosoul", name: "Neo-soul (Dilla feel)", group: "rnb", chs: SLOTS, bpm: 86, beats: 4, steps: 16,
      swing: { amt: 0.6, unit: 1, keys: ["F#1"] }, nudge: { "D1": -14, "C1": 8 },
      about: "Straight kick and snare under a swung hi-hat (quintuplet-like swing, 60%), the snare a little early and the kick a little late, so the parts sit at different feels.",
      checked: "Straight, swung and shifted parts together; the hi-hat swung (quintuplet), the snare shifted slightly early: The Pudding, 'Dilla time' groove analysis. The amounts (60%, −14 ms, +8 ms): the site's.",
      parts: { "F#1": "xgxgxgxgxgxgxgxg", "C1": "X......x..X.....", "D1": "....X.......X..." } },
    { id: "boombap", name: "Boom bap", group: "hiphop", chs: SLOTS, bpm: 90, beats: 4, steps: 16,
      swing: { amt: 0.58, unit: 2 },
      about: "Kick on 1 and 3, snare on 2 and 4, hi-hat eighths with sampler-style swing (58%); an extra kick on the & of 3 in the second bar.",
      checked: "Kick on 1 and 3, snare on 2 and 4, 'highly swung programming' on an MPC / SP-1200: Wikipedia, Boom bap. Tempo, swing amount and the extra kick: the site's.",
      parts: { "F#1": "x.o.x.o.x.o.x.o.|x.o.x.o.x.o.x.o.", "C1": "X.......X.......|X.......X.x.....", "D1": "....X.......X...|....X.......X..." } },
    { id: "trap", name: "Trap (half-time, hi-hat rolls)", group: "hiphop", chs: SLOTS, bpm: 140, beats: 4, steps: 16,
      about: "Counted at 140, felt at 70: clap and snare on 3, a long low kick (B0; on the Analog T8 Kit that is 'T8 Kick Bass'), hi-hat eighths and sixteenths with a triplet roll and a 32nd-note roll.",
      checked: "Around 140 bpm programmed in half-time, 'deep 808 kick drums' with long decay, double- and triple-time hi-hats: Wikipedia, Trap music. Where the rolls and kicks go: the site's.",
      parts: { "B0": "X-----....x-x---|X-----......X---", "D1": "........X.......|........X.......", "D#1": "........X.......|........X.......",
               "F#1": "x.x.x.x.x.x.....|x.x.x.xxx.x.x...", "F#1/24": "..................xxxxxx|........................",
               "F#1/32": "................................|............................goxX" } }

  ];

  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, VEL = { X: 0.95, x: 0.75, o: 0.55, g: 0.3 };
  function keyOf(part){ return part.split("/")[0]; }
  function midi(name){ var m = /^([A-G])(#?)(-?\d)$/.exec(keyOf(name)); return m ? 12 * (+m[3] + 2) + LET[m[1]] + (m[2] ? 1 : 0) : null; }
  function stepsOf(p, part){ var n = part.split("/")[1]; return n ? +n : p.steps; }
  // hits: { t (beats from the loop's start, swing included), ms (nudge), key, midi, vel, len (beats), cell (main-grid column for the lit display) }
  function parse(p){
    var bars = 1, hits = [], sw = p.swing || null;
    Object.keys(p.parts).forEach(function (part){
      var bs = p.parts[part].split("|"), n = stepsOf(p, part), cellB = p.beats / n; bars = Math.max(bars, bs.length);
      var cells = bs.join("").split(""), key = keyOf(part);
      cells.forEach(function (c, i){
        if (!VEL[c]) return;
        var len = 1; while (cells[i + len] === "-") len++;
        var t = i * cellB;
        // swing: the second cell of each pair of `unit` cells comes late by (amt - 0.5) * 2 of a unit
        if (sw && (!sw.keys || sw.keys.indexOf(part) >= 0) && n === p.steps && (i % (2 * sw.unit)) === sw.unit) t += (sw.amt - 0.5) * 2 * sw.unit * cellB;
        hits.push({ t: t, ms: (p.nudge && p.nudge[part]) || 0, key: key, midi: midi(key), vel: VEL[c], len: len * cellB, cell: Math.floor(i * cellB / (p.beats / p.steps) + 1e-9) });
      });
    });
    return { bars: bars, steps: bars * p.steps, beats: bars * p.beats, hits: hits.sort(function (a, b){ return a.t - b.t; }) };
  }

  // ---------------- page ----------------
  var LS = "modx-perc", saved = {}; try { saved = JSON.parse(global.localStorage.getItem(LS) || "{}") || {}; } catch (e) { saved = {}; }
  saved.picks = saved.picks || {}; saved.chs = saved.chs || {};
  var SLOT_DEFAULT = [{ ch: 13, kit: "Real Drums Kit" }, { ch: 14, kit: "Rock Stereo Kit 1" }, { ch: 15, kit: "R&B Kit 1" }, { ch: 16, kit: "Hip Hop Kit 1" }];
  saved.slots = (saved.slots && saved.slots.length === 4) ? saved.slots : SLOT_DEFAULT.map(function (s){ return Object.assign({}, s); });
  function store(){ try { global.localStorage.setItem(LS, JSON.stringify(saved)); } catch (e) {} }
  // a "kit" c is a channel number (the fixed Latin / brush kits) or "s1".."s4" (a test slot: any kit in ModxKits on its channel)
  function slotOf(c){ return typeof c === "string" && c[0] === "s" ? saved.slots[+c.slice(1) - 1] : null; }
  function kitFor(c){ var s = slotOf(c); if (s) return { name: s.kit, keys: (global.ModxKits || {})[s.kit] || {} }; return KITS[c]; }
  function chFor(c){ var s = slotOf(c); return s ? +s.ch : (+saved.chs[c] || +c); }
  function h(tag, attrs, kids){
    var e = document.createElement(tag); attrs = attrs || {};
    Object.keys(attrs).forEach(function (k){ if (k === "text") e.textContent = attrs[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c){ if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  var play = null;
  function stopAll(){
    if (play){ clearInterval(play.timer); play.card.classList.remove("mp-playing"); lit(play, -1); play = null; }
    if (global.BandModx) global.BandModx.stop();
    var s = document.getElementById("mp-now"); if (s) s.textContent = "";
  }
  var onLit = null;
  function lit(pl, cell){
    pl.card.querySelectorAll(".mp-cell.on").forEach(function (c){ c.classList.remove("on"); });
    if (cell >= 0) pl.card.querySelectorAll('.mp-cell[data-s="' + cell + '"]').forEach(function (c){ c.classList.add("on"); });
    if (onLit) onLit(pl, cell);
  }
  function start(p, card, order, bpmIn){
    stopAll();
    var M = global.BandModx; if (!M || !M.connected()){ alert("Connect the MODX first (top of the page)."); return; }
    var parsed = parse(p), bpm = +bpmIn.value || p.bpm, beatMs = 60000 / bpm, loopMs = parsed.beats * beatMs, cellMs = beatMs * p.beats / p.steps;
    var turnLoops = Math.max(1, Math.ceil(2 / parsed.bars));   // at least two bars on each kit when taking turns
    var t0 = performance.now() + 120, now = document.getElementById("mp-now"), lastKit = null;
    play = { p: p, order: order, card: card, loop: 0, i: 0, cell: 0 };
    card.classList.add("mp-playing");
    play.timer = setInterval(function (){
      var pl = play; if (!pl) return;
      var lim = performance.now() + 250;
      // notes
      while (true){
        if (pl.i >= parsed.hits.length){ pl.i = 0; pl.loop++; }
        var x = parsed.hits[pl.i], at = t0 + pl.loop * loopMs + x.t * beatMs + x.ms;
        if (at > lim) break;
        var kc = pl.order[Math.floor(pl.loop / turnLoops) % pl.order.length];
        M.note(chFor(kc), x.midi, x.vel, at, x.len * beatMs * 0.95);
        pl.i++;
      }
      // the lit column and the "Playing" line
      while (t0 + pl.cell * cellMs < lim){
        (function (c, at){
          var loop = Math.floor(c / parsed.steps), kc = pl.order[Math.floor(loop / turnLoops) % pl.order.length];
          setTimeout(function (){ if (play === pl){ lit(pl, c % parsed.steps); if (kc !== lastKit){ lastKit = kc; now.textContent = "Playing: " + p.name + " — " + kitFor(kc).name + " (channel " + chFor(kc) + ")"; } } }, Math.max(0, at - performance.now()));
        })(pl.cell, t0 + pl.cell * cellMs);
        pl.cell++;
      }
    }, 30);
  }
  function walkKeys(c){ return Object.keys(kitFor(c).keys).sort(function (a, b){ return midi(a) - midi(b); }); }
  function walk(c, bpm){
    var keys = walkKeys(c), parts = {};
    keys.forEach(function (k, i){ var a = []; for (var j = 0; j < keys.length * 2; j++) a.push(j === 2 * i ? "x" : j === 2 * i + 1 ? "o" : "."); parts[k] = a.join(""); });
    return { id: "walk", name: "Kit walk", chs: [c], bpm: bpm, beats: keys.length * 2, steps: keys.length * 2, parts: parts };
  }
  function pickKey(p, c){ var s = slotOf(c); return p.id + "@" + (s ? s.kit : c); }
  function pickLabel(k){ var a = k.split("@"), p = PATTERNS.filter(function (x){ return x.id === a[0]; })[0]; return p ? p.name + " — " + (KITS[a[1]] ? KITS[a[1]].name : a[1]) : null; }
  function renderPicks(){
    var box = document.getElementById("mp-picks"); if (!box) return; box.innerHTML = "";
    var ks = Object.keys(saved.picks).filter(function (k){ return saved.picks[k] && pickLabel(k); });
    if (!ks.length){ box.appendChild(h("p", { class: "mp-note", text: "Nothing marked yet: press ☆ next to a kit button to keep it here." })); return; }
    // count per kit, so the kit you'd use most stands out
    var per = {}; ks.forEach(function (k){ var kit = k.split("@")[1]; kit = KITS[kit] ? KITS[kit].name : kit; per[kit] = (per[kit] || 0) + 1; });
    box.appendChild(h("p", { class: "mp-note", text: "By kit: " + Object.keys(per).sort(function (a, b){ return per[b] - per[a]; }).map(function (k){ return k + " ×" + per[k]; }).join(" · ") }));
    var ul = h("ul"); ks.forEach(function (k){ ul.appendChild(h("li", { text: pickLabel(k) })); }); box.appendChild(ul);
  }
  var cardsBySlot = [];
  function refreshSlotCards(){ cardsBySlot.forEach(function (f){ f(); }); }
  function card(p){
    var parsed = parse(p), bpm = h("input", { type: "number", min: 30, max: 300, value: p.bpm, class: "mp-bpm" });
    var el = h("div", { class: "mp-card", id: "mp-" + p.id });
    el.appendChild(h("h3", { text: p.name }));
    el.appendChild(h("p", { class: "mp-note", text: p.about + "  (" + p.bpm + " bpm, " + parsed.bars + " bar" + (parsed.bars > 1 ? "s" : "") + (p.swing ? ", swung" : "") + ")" }));
    el.appendChild(h("p", { class: "mp-note mp-checked", text: (p.checked ? "Checked: " + p.checked : "Not checked against a source: the site's own.") }));
    var row = h("div", { class: "mp-row" });
    function buttons(){
      row.innerHTML = "";
      p.chs.forEach(function (kc){
        row.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-primary", text: "▶ " + kitFor(kc).name, onclick: function (){ start(p, el, [kc], bpm); } }));
        var star = h("button", { type: "button", class: "mp-star", title: "Mark: I'd use this", text: saved.picks[pickKey(p, kc)] ? "★" : "☆" });
        star.onclick = function (){ var k = pickKey(p, kc); saved.picks[k] = !saved.picks[k]; star.textContent = saved.picks[k] ? "★" : "☆"; store(); renderPicks(); };
        row.appendChild(star);
      });
      if (p.chs.length > 1) row.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-secondary", text: "⇄ Take turns", title: "Two bars (or the whole pattern) on each kit in turn", onclick: function (){ start(p, el, p.chs.slice(), bpm); } }));
      row.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-secondary", text: "■ Stop", onclick: stopAll }));
      row.appendChild(h("label", {}, ["Tempo ", bpm]));
    }
    buttons(); if (slotOf(p.chs[0])) cardsBySlot.push(buttons);
    el.appendChild(row);
    var grid = h("div", { class: "mp-grid" }), names = kitFor(p.chs[0]).keys, CW = 11;
    Object.keys(p.parts).sort(function (a, b){ return midi(b) - midi(a) || stepsOf(p, a) - stepsOf(p, b); }).forEach(function (part){
      var key = keyOf(part), n = stepsOf(p, part), r = h("div", { class: "mp-line" }), cells = p.parts[part].split("|").join("");
      r.appendChild(h("span", { class: "mp-key", title: names[key] || "", text: key + " " + (slotOf(p.chs[0]) ? ROLE(key) : (names[key] || "?")) + (n !== p.steps ? " (" + (n % 3 ? n / p.beats * 4 + "ths" : "triplets") + ")" : "") }));
      var cs = h("span", { class: "mp-cells" }), w = CW * p.steps / n;
      for (var i = 0; i < cells.length; i++){
        var c = cells[i], col = Math.floor(i * p.steps / n + 1e-9);
        var cell = h("span", { class: "mp-cell v" + (c === "-" ? "h" : c === "." ? "0" : c), "data-s": String(col) });
        cell.style.width = (w - 1) + "px"; if (i % n === 0 && i) cell.style.marginLeft = "6px";
        cs.appendChild(cell);
      }
      r.appendChild(cs); grid.appendChild(r);
    });
    el.appendChild(grid);
    return el;
  }
  // the drum names the slot patterns use (General MIDI roles; each kit's own wave name is in the tooltip of the kit walk)
  var ROLES = { "B0": "Kick 2", "C1": "Kick", "C#1": "Rim / side stick", "D1": "Snare", "D#1": "Clap", "E1": "Snare 2", "F#1": "Hi-hat closed", "A#1": "Hi-hat open",
    "F1": "Floor tom", "G1": "Low tom", "A1": "Low-mid tom", "B1": "Mid tom", "C2": "High-mid tom", "D2": "High tom", "C#2": "Crash", "D#2": "Ride", "F2": "Ride bell", "F#2": "Tambourine", "G#2": "Cowbell" };
  function ROLE(k){ return ROLES[k] || k; }
  function mount(el){
    var M = global.BandModx;
    var status = h("span", { class: "mp-status", text: M && M.connected() ? "Connected: " + M.portName() : "Not connected" });
    var conn = h("button", { type: "button", class: "btn btn-sm btn-primary", text: "Connect the MODX", onclick: function (){
      M.connect().then(function (n){ status.textContent = "Connected: " + n; }).catch(function (e){ status.textContent = e.message; }); } });
    if (M) M.onChange(function (){ status.textContent = M.connected() ? "Connected: " + M.portName() : "Not connected"; });
    var chRow = h("div", { class: "mp-row" });
    Object.keys(KITS).forEach(function (kc){
      var inp = h("input", { type: "number", min: 1, max: 16, value: chFor(+kc), class: "mp-bpm" });
      inp.onchange = function (){ saved.chs[kc] = +inp.value; store(); };
      chRow.appendChild(h("label", {}, [KITS[kc].name + " on channel ", inp]));
    });
    var conBox = el.querySelector("#mp-connect"); conBox.appendChild(h("div", { class: "mp-row" }, [conn, status, h("span", { id: "mp-now", class: "mp-now" })])); conBox.appendChild(chRow);
    // the four test slots
    var slotBox = el.querySelector("#mp-slots");
    if (slotBox){
      var names = Object.keys(global.ModxKits || {});
      saved.slots.forEach(function (s, i){
        var sel = h("select", { class: "form-select-sm" }); names.forEach(function (n){ var o = h("option", { value: n, text: n }); if (n === s.kit) o.selected = true; sel.appendChild(o); });
        var ch = h("input", { type: "number", min: 1, max: 16, value: s.ch, class: "mp-bpm" });
        sel.onchange = function (){ s.kit = sel.value; store(); refreshSlotCards(); };
        ch.onchange = function (){ s.ch = +ch.value; store(); };
        slotBox.appendChild(h("div", { class: "mp-row" }, [h("b", { text: "Slot " + (i + 1) }), h("label", {}, ["channel ", ch]), sel]));
      });
    }
    ["latin", "brush", "rock", "pop", "rnb", "hiphop"].forEach(function (g){ var box = el.querySelector("#mp-" + g); if (box) PATTERNS.filter(function (p){ return p.group === g; }).forEach(function (p){ box.appendChild(card(p)); }); });
    var wb = el.querySelector("#mp-walk"), wbpm = h("input", { type: "number", min: 30, max: 240, value: 100, class: "mp-bpm" }), wcard = h("div", { class: "mp-card" });
    var wrow = h("div", { class: "mp-row" }), wnow = h("p", { class: "mp-walknow" });
    function wbuttons(){
      wrow.innerHTML = "";
      Object.keys(KITS).map(Number).concat(["s1", "s2", "s3", "s4"]).forEach(function (c){
        wrow.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-primary", text: "▶ " + kitFor(c).name + (slotOf(c) ? " (slot " + c.slice(1) + ")" : ""), onclick: function (){ start(walk(c, +wbpm.value), wcard, [c], wbpm); } }));
      });
      wrow.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-secondary", text: "■ Stop", onclick: stopAll }));
      wrow.appendChild(h("label", {}, ["Tempo ", wbpm]));
    }
    wbuttons(); cardsBySlot.push(wbuttons);
    wcard.appendChild(wrow); wcard.appendChild(h("p", { class: "mp-note", text: "Every key from C0 up, twice each (loud, then soft). The key and its sample name show while it plays." }));
    wcard.appendChild(wnow); wb.appendChild(wcard);
    onLit = function (pl, cell){ if (pl.card === wcard && cell >= 0){ var c = pl.order[0], k = walkKeys(c)[Math.floor(cell / 2)]; wnow.textContent = k + " — " + kitFor(c).keys[k]; } };
    renderPicks();
    document.addEventListener("keydown", function (e){ if (e.key === "Escape") stopAll(); });
  }
  global.ModxPerc = { KITS: KITS, PATTERNS: PATTERNS, parse: parse, midi: midi, keyOf: keyOf, stepsOf: stepsOf, ROLES: ROLES, mount: mount, stop: stopAll, slots: function (){ return saved.slots; } };
})(typeof window !== "undefined" ? window : globalThis);
