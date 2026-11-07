// rudiments.js — the snare drum rudiments the Percussion lessons play and draw (PercRudiments). Pure data and maths: no DOM, no sound.
//
//   PercRudiments.LIST          [{ id, name, group, M, L, beam, unitBeats, bars: [string], note }]
//   PercRudiments.byId(id)
//   PercRudiments.parse(bar)    -> [{ rest, graces:"lr", hand:"R"|"L", accent, bounce, dur }]   (dur in the rudiment's L units)
//   PercRudiments.barLength(r)  -> units in each bar, from M and L  (the test checks every bar against it: project rule 1)
//   PercRudiments.abc(r)        -> ABC (percussion clef, sticking above each note) for the bars as written
//   PercRudiments.hits(r, bpm, opts) -> [{ t, hand, vel, kind: "main"|"accent"|"grace"|"bounce", i }]   seconds from the start; i = index of
//                                       the main stroke it belongs to (the page lights that sticking chip). opts.loops repeats the bars.
//
// Sticking tokens (space separated): R L = a stroke by that hand, R> = accented, R~ = a multiple-bounce stroke (a buzz), a number after
// = length in L units (R2), z = rest (z2). Lower-case letters before a stroke are its grace notes, in order: lR = a left-hand flam on the
// right hand's main stroke; llR = a drag; lrlR = a four-stroke ruff. A bar is one measure.
//
// SOURCES AND WHAT IS UNVERIFIED. The families (roll, diddle, flam, drag), the single paradiddle's accents (R> L R R L> R L L), the flam
// and drag grace-note hands, the four-stroke ruff stickings (single-stroke LRLR / RLRL) and the idea of the multiple-bounce and open
// double stroke come from the teacher book pp. 288-296 (Kjos W74, scanned). The stickings of the flam tap, flam accent, double
// paradiddle, paradiddle-diddle and the five-stroke roll are the common ones written from memory of the Percussive Arts Society's
// International Drum Rudiments list and have NOT been re-checked against it. Note lengths are practice values, not part of a rudiment.
// Playing: a flam's grace comes about 45 ms before the main stroke at low volume, each further grace 45 ms earlier; these are the site's
// choices to sound like a flam / drag, not measurements. A buzz is a run of hits 40 ms apart, each softer: also the site's.
(function (global) {
  "use strict";
  var LIST = [
    { id: "single-stroke", name: "Single stroke roll", group: "Rolls", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["R L R L R L R L"], note: "Alternate hands, every note the same. The book calls it the basis of all percussion technique." },
    { id: "open-double", name: "Open (double stroke) roll", group: "Rolls", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["R R L L R R L L"], note: "Two equal sounds from each wrist motion (the open double stroke). Slow it down first." },
    { id: "buzz", name: "Multiple bounce (buzz) roll", group: "Rolls", M: "2/4", L: "1/8", beam: 2, unitBeats: 0.5,
      bars: ["R~ L~ R~ L~"], note: "One wrist motion, three or more sounds, each softer: a buzz. Overlap the buzzes so it sounds continuous." },
    { id: "five-stroke", name: "Five stroke roll", group: "Rolls", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["R R L L R4", "L L R R L4"], note: "Two open double strokes and a single stroke to finish, so the hands alternate each time round." },
    { id: "paradiddle", name: "Single paradiddle", group: "Diddles", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["R> L R R L> R L L"], note: "The basic diddle rudiment. The accent falls on the first note of each group, which swaps hands every group." },
    { id: "double-paradiddle", name: "Double paradiddle", group: "Diddles", M: "3/4", L: "1/16", beam: 6, unitBeats: 0.25,
      bars: ["R> L R L R R L> R L R L L"], note: "Two single strokes before the double, so the group is six long." },
    { id: "paradiddle-diddle", name: "Paradiddle-diddle", group: "Diddles", M: "3/8", L: "1/16", beam: 6, unitBeats: 0.25,
      bars: ["R> L R R L L", "L> R L L R R"], note: "One single, one double after: R L RR LL." },
    { id: "flam", name: "Flam", group: "Flams", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["lR4 rL4"], note: "A quiet grace note just before a louder main note: f-LAM. Named for the hand that plays the main note." },
    { id: "flam-tap", name: "Flam tap", group: "Flams", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["lR R rL L lR R rL L"], note: "A flam, then a tap by the same hand as the main note." },
    { id: "flam-accent", name: "Flam accent", group: "Flams", M: "6/8", L: "1/8", beam: 3, unitBeats: 0.5,
      bars: ["lR> L R rL> R L"], note: "In six-eight: a flam on the first of each group of three, accented." },
    { id: "drag", name: "Drag", group: "Drags", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["llR4 rrL4"], note: "Two quiet grace notes by one hand, then the main note by the other." },
    { id: "ruff", name: "Four stroke ruff", group: "Drags", M: "2/4", L: "1/16", beam: 4, unitBeats: 0.25,
      bars: ["lrlR4 rlrL4"], note: "Three grace notes (single strokes, alternating) and a main note. The book says it is a ruff, not a drag." }
  ];

  function byId(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }

  function parse(bar) {
    return bar.trim().split(/\s+/).map(function (tok) {
      var m = /^z(\d*)$/.exec(tok);
      if (m) return { rest: true, dur: m[1] ? +m[1] : 1 };
      m = /^([lr]*)([RL])(>?)(~?)(\d*)$/.exec(tok);
      if (!m) throw new Error("bad sticking token: " + tok);
      return { rest: false, graces: m[1], hand: m[2], accent: !!m[3], bounce: !!m[4], dur: m[5] ? +m[5] : 1 };
    });
  }
  function barLength(r) {   // units of L in one bar of M
    var M = r.M.split("/").map(Number), L = r.L.split("/").map(Number);
    return (M[0] / M[1]) / (L[0] / L[1]);
  }

  function abc(r) {
    var out = ["X:1", "M:" + r.M, "L:" + r.L, "K:C clef=perc"];
    var bars = r.bars.map(function (bar) {
      var toks = parse(bar), s = "", used = 0;
      toks.forEach(function (t) {
        if (used > 0 && used % r.beam === 0) s += " ";
        used += t.dur;
        var d = t.dur === 1 ? "" : String(t.dur);
        if (t.rest) { s += "z" + d; return; }
        var gr = t.graces ? (t.graces.length === 1 ? "{/c}" : "{" + t.graces.replace(/./g, "c") + "}") : "";
        var label = (t.graces ? "(" + t.graces.toUpperCase() + ")" : "") + t.hand + (t.bounce ? "~" : "");
        s += '"^' + label + '"' + (t.accent ? "!>!" : "") + (t.bounce ? "!trem3!" : "") + gr + "c" + d;
      });
      return s;
    });
    out.push(bars.join(" | ") + " |]");
    return out.join("\n");
  }

  var GRACE_GAP = 0.045, BUZZ_GAP = 0.04;
  function hits(r, bpm, opts) {
    opts = opts || {};
    var unit = 60 / bpm * r.unitBeats, loops = opts.loops || 1, ev = [], t = 0, idx = 0, lead = 0;
    for (var k = 0; k < loops; k++) r.bars.forEach(function (bar) {
      parse(bar).forEach(function (n) {
        if (!n.rest) {
          for (var g = 0; g < n.graces.length; g++) {
            var gt = t - (n.graces.length - g) * GRACE_GAP; lead = Math.max(lead, -gt);
            ev.push({ t: gt, hand: n.graces[g].toUpperCase(), vel: 0.30, kind: "grace", i: idx });
          }
          if (n.bounce) {
            var span = n.dur * unit * 0.92, j = 0;
            for (var bt = 0; bt < span; bt += BUZZ_GAP, j++) ev.push({ t: t + bt, hand: n.hand, vel: Math.max(0.12, 0.62 * Math.pow(0.9, j)), kind: "bounce", i: idx });
          } else ev.push({ t: t, hand: n.hand, vel: n.accent ? 0.95 : 0.6, kind: n.accent ? "accent" : "main", i: idx });
          idx++;
        }
        t += n.dur * unit;
      });
    });
    ev.forEach(function (e) { e.t += lead; });
    ev.total = t; ev.lead = lead;
    return ev;
  }

  global.PercRudiments = { LIST: LIST, byId: byId, parse: parse, barLength: barLength, abc: abc, hits: hits };
  if (typeof module !== "undefined") module.exports = global.PercRudiments;
})(typeof window !== "undefined" ? window : globalThis);
