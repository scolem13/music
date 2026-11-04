// groove-library.js — standard patterns for the Drumset tool, each written as groove text (BandGroove) and each with the source
// it comes from (BandGrooveLibrary). Only patterns that can be attributed are here; the band's own grooves are a menu of their own.
//
//   BandGrooveLibrary.SOURCES   { id: { cite, url? } }
//   BandGrooveLibrary.ITEMS     [{ id, group, label, meter: "duple" | "triple" | "compound", text, source, note? }]
//   BandGrooveLibrary.meterOf(n, d)  -> "duple" | "triple" | "compound"   (the family a time signature belongs to)
//   BandGrooveLibrary.byId(id)
//
// The rudiments are the stickings of the Percussive Arts Society's list, written on the snare (accent on the first stroke of a
// group, as that list prints them), with the Stickings lane. The flam and the drag are the snare's own marks (grace notes before the
// main stroke: groove.js plays them as stand-ins). Note values are the usual practice ones, not part of the rudiment: the list does
// not fix a speed. Which hand plays a flam's grace note is not written (it is the opposite hand to the main stroke).
// Citation details were written from memory of the list's published form and have not been re-checked against the document.
//
// Standard beats (added 2026-11-04, read against the sources named on each): the rock beat, half-time, four on the floor, Motown,
// funk's delayed backbeat, the Purdie-style half-time shuffle, new jack swing, the Dilla feel, boom bap, trap; the conga tumbao,
// the bongo martillo and the 12/8 bell. What a source gives is the skeleton (which drum on which beats, the kind of swing); where
// the kick or a ghost note goes beyond that is the site's, and each item's note says so. The same patterns play on the MODX in
// gear/modx-perc.qmd (apps/shared/band/modx-perc.js), with the same sources (scripts/sources/modx-perc.py).
// Fills, bossa, samba, songo and cáscara are NOT here yet: no source checked gives them as text.

(function (global) {
  var SOURCES = {
    pas: { cite: "Percussive Arts Society. “International Drum Rudiments.” PAS, the 40 rudiments (adopted 1984; revised list 2020).", url: "https://pas.org/resources/rudiments/" },
    drumbeat: { cite: "“Drum beat.” Wikipedia: the straight rock groove, half-time, the delayed backbeat.", url: "https://en.wikipedia.org/wiki/Drum_beat" },
    disco: { cite: "“Disco” and “Four on the floor (music).” Wikipedia: the kick on every beat, the open hi-hat on the off-beat.", url: "https://en.wikipedia.org/wiki/Four_on_the_floor_(music)" },
    motown: { cite: "“Motown Groove.” Soundbrenner: the snare on all four beats, tambourine, kick on 1 and 3.", url: "https://www.soundbrenner.com/blogs/articles/motown-groove" },
    purdie: { cite: "“Bernard Purdie.” Wikipedia: triplets against a half-time backbeat, ghost notes on the snare.", url: "https://en.wikipedia.org/wiki/Bernard_Purdie" },
    njs: { cite: "“New jack swing.” Wikipedia: offbeat-accented sixteenth-note triplets, the TR-808 snare.", url: "https://en.wikipedia.org/wiki/New_jack_swing" },
    dilla: { cite: "“Groove: How J Dilla Changed Rhythm.” The Pudding, June 2023: straight, swung and shifted parts together.", url: "https://pudding.cool/2023/06/groove/" },
    boombap: { cite: "“Boom bap.” Wikipedia: kick on 1 and 3, snare on 2 and 4, swung programming on the MPC and SP-1200.", url: "https://en.wikipedia.org/wiki/Boom_bap" },
    trap: { cite: "“Trap music.” Wikipedia: about 140 bpm in half-time, the long 808 kick, double- and triple-time hi-hats.", url: "https://en.wikipedia.org/wiki/Trap_music" },
    tumbao: { cite: "“Tumbao.” Wikipedia, with Salsa Vida, “How to Play Tumbao”: heel, toe, slap on 2, toe, heel, toe, open tones on 4 and its &.", url: "https://en.wikipedia.org/wiki/Tumbao" },
    martillo: { cite: "“Beating the Bongos.” Dummies (Wiley): the martillo, slaps on the small drum, the open tone on the large one.", url: "https://www.dummies.com/article/academics-the-arts/music/instruments/drums/beating-the-bongos-199618/" },
    bell: { cite: "“Bell pattern.” Wikipedia: the 12/8 standard pattern on 1, 1a, 2&, 2a, 3&, 4, 4a.", url: "https://en.wikipedia.org/wiki/Bell_pattern" }
  };

  function meterOf(n, d){ return d === 8 ? "compound" : n % 3 === 0 ? "triple" : "duple"; }          // (as the old Drumset page sorted its patterns)

  // a one-bar 4/4 groove of a snare line and a sticking line (same length), nothing else sounding
  function snare(div, tempo, notes, sticking, title){
    var n = notes.length, rest = new Array(n + 1).join("-");
    return "?TimeSig=4/4&Div=" + div + "&Title=" + encodeURIComponent(title) + "&Tempo=" + tempo + "&Measures=1&H=|" + rest + "|&S=|" + notes + "|&K=|" + rest + "|&Stickings=|" + sticking + "|";
  }
  function rep(s, k){ return new Array(k + 1).join(s); }
  // a beat in the order BandGroove.stringify writes it: o = { ts, div, title, tempo, swing?, bars, H, S, K, Cg?, Bo? }, each lane its bars
  // joined by "|"; H, S and K are always written (an empty one as rests, since a lane left out means a full one to GrooveScribe)
  var CELLS_PER = function (o){ var t = o.ts.split("/"); return o.div / +t[1] * +t[0]; };
  function beat(o){
    var n = CELLS_PER(o) * o.bars, rest = new Array(n + 1).join("-"), s = "?TimeSig=" + o.ts + "&Div=" + o.div + "&Title=" + encodeURIComponent(o.title) + "&Tempo=" + o.tempo;
    if (o.swing) s += "&Swing=" + o.swing;
    s += "&Measures=" + o.bars;
    ["H", "S", "K", "Cg", "Bo"].forEach(function (l){ if (o[l] || l === "H" || l === "S" || l === "K") s += "&" + l + "=|" + (o[l] || rest.match(new RegExp(".{" + CELLS_PER(o) + "}", "g")).join("|")) + "|"; });
    return s;
  }
  // letters at cells: at(32, { x: [0, 4, 8] }) -> "x---x---x---…"
  function at(n, marks){ var a = new Array(n + 1).join("-").split(""); Object.keys(marks).forEach(function (ch){ marks[ch].forEach(function (i){ a[i] = ch; }); }); return a.join(""); }

  var ITEMS = [
    { id: "r-single-stroke", group: "Rudiments: rolls", label: "Single stroke roll", meter: "duple", source: "pas",
      text: snare(16, 80, rep("oooo", 4), rep("RL", 8), "Single stroke roll") },
    { id: "r-double-stroke", group: "Rudiments: rolls", label: "Double stroke open roll", meter: "duple", source: "pas",
      text: snare(16, 70, rep("oooo", 4), rep("RRLL", 4), "Double stroke open roll") },
    { id: "r-single-paradiddle", group: "Rudiments: paradiddles", label: "Single paradiddle", meter: "duple", source: "pas",
      text: snare(16, 80, rep("Ooo" + "o", 4), "RLRR" + "LRLL" + "RLRR" + "LRLL", "Single paradiddle") },
    { id: "r-double-paradiddle", group: "Rudiments: paradiddles", label: "Double paradiddle", meter: "duple", source: "pas",
      text: snare(12, 80, "Ooooo" + "o" + "Ooooo" + "o", "RLRLRR" + "LRLRLL", "Double paradiddle") },
    { id: "r-paradiddle-diddle", group: "Rudiments: paradiddles", label: "Single paradiddle-diddle", meter: "duple", source: "pas",
      text: snare(24, 66, rep("Ooooo" + "o", 4), rep("RLRRLL", 4), "Single paradiddle-diddle") },
    { id: "r-flam", group: "Rudiments: flams", label: "Flam", meter: "duple", source: "pas",
      text: snare(8, 76, rep("f", 8).slice(0, 4) + "----", "RLRL" + "----", "Flam") },
    { id: "r-flam-tap", group: "Rudiments: flams", label: "Flam tap", meter: "duple", source: "pas",
      text: snare(16, 76, rep("fo", 8), rep("RRLL", 4), "Flam tap") },
    { id: "r-flam-accent", group: "Rudiments: flams", label: "Flam accent", meter: "duple", source: "pas",
      text: snare(12, 72, rep("foo", 4), "RLRLRL" + "RLRLRL", "Flam accent") },
    { id: "r-flam-paradiddle", group: "Rudiments: flams", label: "Flam paradiddle", meter: "duple", source: "pas",
      text: snare(16, 76, rep("foo" + "o", 4), "RLRR" + "LRLL" + "RLRR" + "LRLL", "Flam paradiddle") },
    { id: "r-drag", group: "Rudiments: drags", label: "Drag (ruff)", meter: "duple", source: "pas",
      text: snare(8, 76, "d-d-d-d-", "R-L-R-L-", "Drag") },
    { id: "r-single-drag-tap", group: "Rudiments: drags", label: "Single drag tap", meter: "duple", source: "pas",
      text: snare(16, 76, rep("do", 8), rep("RLLR", 4), "Single drag tap") },
    // ---- standard beats (sources in SOURCES; the note says what is the site's own)
    { id: "b-rock", group: "Rock and pop", label: "Basic rock beat", meter: "duple", source: "drumbeat",
      text: beat({ ts: "4/4", div: 8, title: "Basic rock beat", tempo: 112, bars: 1, H: "xxxxxxxx", S: "--O---O-", K: "o---o---" }) },
    { id: "b-halftime", group: "Rock and pop", label: "Half-time", meter: "duple", source: "drumbeat",
      text: beat({ ts: "4/4", div: 8, title: "Half-time", tempo: 140, bars: 1, H: "x-x-x-x-", S: "----O---", K: "o-------" }) },
    { id: "b-fourfloor", group: "Rock and pop", label: "Four on the floor", meter: "duple", source: "disco", note: "The snare on 2 and 4 is the usual backbeat (Wikipedia, Backbeat).",
      text: beat({ ts: "4/4", div: 16, title: "Four on the floor", tempo: 122, bars: 1, H: "x-o-x-o-x-o-x-o-", S: "----O-------O---", K: "o---o---o---o---" }) },
    { id: "b-motown", group: "Rock and pop", label: "Motown (snare on every beat)", meter: "duple", source: "motown", note: "The tambourine in eighths has no lane here; the band's Motown groove plays it on 2 and 4.",
      text: beat({ ts: "4/4", div: 8, title: "Motown", tempo: 124, bars: 1, H: "--------", S: "o-O-o-O-", K: "o---o---" }) },
    { id: "b-funk-late", group: "R&B, funk and hip-hop", label: "Funk with a delayed backbeat", meter: "duple", source: "drumbeat", note: "The source gives the delayed backbeat (the snare on the last eighth of the bar); the kick and ghost notes are the site's.",
      text: beat({ ts: "4/4", div: 16, title: "Funk, delayed backbeat", tempo: 98, bars: 1, H: "xxxxxxxxxxxxxxxx", S: "----O--g-g-g--O-", K: "o-o-------o--o--" }) },
    { id: "b-purdie", group: "R&B, funk and hip-hop", label: "Half-time shuffle (Purdie-style)", meter: "duple", source: "purdie", note: "Where each ghost note and kick goes is the site's.",
      text: beat({ ts: "4/4", div: 12, title: "Half-time shuffle", tempo: 84, bars: 1, H: "x-xx-xx-xx-x", S: "-g--g-Og--g-", K: "o----o---o--" }) },
    { id: "b-newjack", group: "R&B, funk and hip-hop", label: "New jack swing", meter: "duple", source: "njs", note: "The kick is the site's.",
      text: beat({ ts: "4/4", div: 24, title: "New jack swing", tempo: 106, bars: 1, H: "x-xX-xx-xX-xx-xX-xx-xX-x", S: "------O-----------O-----", K: "o--------o-----o-----o--" }) },
    { id: "b-dilla", group: "R&B, funk and hip-hop", label: "Neo-soul (Dilla feel)", meter: "duple", source: "dilla", note: "Here only the swung hi-hat over a straight kick and snare; the early snare needs timing finer than the grid (the MODX auditions page plays it).",
      text: beat({ ts: "4/4", div: 16, title: "Neo-soul, Dilla feel", tempo: 86, swing: 20, bars: 1, H: "xxxxxxxxxxxxxxxx", S: "----O-------O---", K: "o------o--o-----" }) },
    { id: "b-boombap", group: "R&B, funk and hip-hop", label: "Boom bap", meter: "duple", source: "boombap", note: "Tempo, the swing amount (58%) and the extra kick in bar 2 are the site's.",
      text: beat({ ts: "4/4", div: 8, title: "Boom bap", tempo: 90, swing: 16, bars: 2, H: "xxxxxxxx|xxxxxxxx", S: "--O---O-|--O---O-", K: "o---o---|o---oo--" }) },
    { id: "b-trap", group: "R&B, funk and hip-hop", label: "Trap (half-time, hi-hat rolls)", meter: "duple", source: "trap", note: "Counted at 140, the snare on 3. Where the rolls and kicks go is the site's; the triplet roll of the MODX page needs a second grid.",
      text: beat({ ts: "4/4", div: 32, title: "Trap", tempo: 140, bars: 2,
        H: at(32, { x: [0, 4, 8, 12, 16, 20, 24, 25, 26, 27, 28, 29, 30, 31] }) + "|" + at(32, { x: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 29, 30, 31] }),
        S: at(32, { O: [16] }) + "|" + at(32, { O: [16] }), K: at(32, { o: [0, 20, 24] }) + "|" + at(32, { o: [0, 24] }) }) },
    { id: "b-tumbao", group: "Latin", label: "Conga tumbao", meter: "duple", source: "tumbao",
      text: beat({ ts: "4/4", div: 8, title: "Tumbao", tempo: 100, bars: 1, Cg: "HTSTHTOO" }) },
    { id: "b-martillo", group: "Latin", label: "Bongo martillo", meter: "duple", source: "martillo", note: "Which drum each stroke is on (the small drum, the large one on beat 4); the bongo lane has no stroke letters. Accents on 1, 3 and 4 (Bongo Patterns, lx.iriss.org.uk).",
      text: beat({ ts: "4/4", div: 8, title: "Martillo", tempo: 96, bars: 1, Bo: "HHHHHHLH" }) },
    { id: "b-bell128", group: "Latin", label: "12/8 bell (bembé)", meter: "compound", source: "bell", note: "On the ride bell here, as a drummer plays it on a kit (the band has no cowbell sample yet).",
      text: beat({ ts: "12/8", div: 8, title: "12/8 bell", tempo: 96, bars: 1, H: "b-b-bb-b-b-b" }) }
  ];

  function byId(id){ for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }

  global.BandGrooveLibrary = { SOURCES: SOURCES, ITEMS: ITEMS, meterOf: meterOf, byId: byId };
})(typeof window !== "undefined" ? window : globalThis);
