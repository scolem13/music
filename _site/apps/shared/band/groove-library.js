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
// Fills and the other standard beats (rock, shuffle, bossa, samba, songo ...) are NOT here yet: none has a source checked.

(function (global) {
  var SOURCES = {
    pas: { cite: "Percussive Arts Society. “International Drum Rudiments.” PAS, the 40 rudiments (adopted 1984; revised list 2020).", url: "https://pas.org/resources/rudiments/" }
  };

  function meterOf(n, d){ return d === 8 ? "compound" : n % 3 === 0 ? "triple" : "duple"; }          // (as the old Drumset page sorted its patterns)

  // a one-bar 4/4 groove of a snare line and a sticking line (same length), nothing else sounding
  function snare(div, tempo, notes, sticking, title){
    var n = notes.length, rest = new Array(n + 1).join("-");
    return "?TimeSig=4/4&Div=" + div + "&Title=" + encodeURIComponent(title) + "&Tempo=" + tempo + "&Measures=1&H=|" + rest + "|&S=|" + notes + "|&K=|" + rest + "|&Stickings=|" + sticking + "|";
  }
  function rep(s, k){ return new Array(k + 1).join(s); }

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
      text: snare(16, 76, rep("do", 8), rep("RLLR", 4), "Single drag tap") }
  ];

  function byId(id){ for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }

  global.BandGrooveLibrary = { SOURCES: SOURCES, ITEMS: ITEMS, meterOf: meterOf, byId: byId };
})(typeof window !== "undefined" ? window : globalThis);
