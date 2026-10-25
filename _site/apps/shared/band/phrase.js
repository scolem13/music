// phrase.js: one stored pattern ("phrase") that both plays and shows as notation. Used by the MODX-style arpeggiator
// (tools/sequencers.qmd) and the Yamaha-style arranger. The phrase is the only copy; the ABC is made from it for display
// and is never read back, so nothing is lost by the notation's rounding.
//
// A phrase:
//   { name, kind: "pitch" | "chord" | "drum", meter: "4/4", bars: 1, source: "CMaj7" (pitch kind: the chord it is written over),
//     notes: [ { t, dur, vel, ... } ] }        t and dur in quarter notes from the start of the phrase; vel 0..1 (0.7 = mf)
//   pitch kind: { pitch: MIDI }                             a written note (an arranger part over its source chord)
//   chord kind: { tone: 0.., oct: 0 }                       the tone-th held note, lowest = 0, wrapping up an octave (an arp)
//   drum kind:  { piece: "kick" }                           a BandSounds kit piece
//
//   BandPhrase.resolve(phrase, { held: [MIDI], transpose }) -> [{ t, dur, vel, midi | piece }]  sorted by t
//   BandPhrase.schedule(notes, { when, bpm, emit(note, whenSec, durSec) })   calls emit once per note; returns the end time
//   BandPhrase.toAbc(phrase | notes, { meter, bars, title, kind, clef, barsPerLine }) -> { abc, vels }
//       vels: one velocity per note head abcjs draws, in order (tied pieces repeat it), for shading the heads.
//   BandPhrase.dynamic(vel) -> "pp" … "ff"
//
// Notation rules: each quarter-note beat is written in sixteenths, or as eighth-note triplets when the notes sit closer to
// thirds of the beat. A note lasts until the next onset (one voice; notes starting together are a chord). A note starting
// off the beat is tied over the next beat; every note is tied over the barline. Velocity is shown with a dynamic at the
// start of a bar whose average level changed (pp < .3 ≤ p < .45 ≤ mp < .6 ≤ mf < .75 ≤ f < .9 ≤ ff) and an accent on a
// note at least .15 louder than its bar's average. Drums are written where BandGroove writes them (WRITTEN, copied below,
// checked equal in the test).
(function (global) {
  "use strict";
  var TPQ = 12;                                          // ticks per quarter: both sixteenths (3) and triplet eighths (4) land on it
  var NOTE_LEN = [16, 12, 8, 6, 4, 3, 2, 1];             // what one written note can be, in sixteenths
  var X = "!style=x!";
  var WRITTEN = { hatClosed: ["g", X], hatOpen: ["g", X], ride: ["f", X], rideBell: ["f", "!style=harmonic!"], crash: ["a", X], stacker: ["b", X], cowbell: ["e", "!style=triangle!"],
                  click: ["c'", X], clickHi: ["c'", X], snare: ["c", ""], rim: ["c", X], tomHi: ["e", ""], tomMid: ["d", ""], tom3: ["B", ""], tomLo: ["A", ""], kick: ["F", ""], hatFoot: ["D", X] };

  var MORE = { tamb: ["d'", "!style=triangle!"], clap: ["e'", X] };   // pieces BandGroove does not write (the arranger's)
  function meterOf(m) { var p = String(m || "4/4").split("/"); return { n: +p[0] || 4, d: +p[1] || 4 }; }
  function barQ(m) { var x = meterOf(m); return x.n * 4 / x.d; }

  // ---------- playing ----------
  function resolve(ph, ctx) {
    ctx = ctx || {};
    var tr = ctx.transpose || 0, held = (ctx.held || [60, 64, 67]).slice().sort(function (a, b) { return a - b; });
    if (!held.length) held = [60];
    var out = [];
    (ph.notes || []).forEach(function (n) {
      var o = { t: n.t, dur: n.dur, vel: n.vel != null ? n.vel : 0.7 };
      if (ph.kind === "drum") o.piece = n.piece;
      else if (ph.kind === "chord") { var k = held.length, i = n.tone || 0; o.midi = held[((i % k) + k) % k] + 12 * (Math.floor(i / k) + (n.oct || 0)) + tr; }
      else o.midi = n.pitch + tr;
      out.push(o);
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function schedule(notes, o) {
    var spq = 60 / (o.bpm || 100), end = o.when;
    notes.forEach(function (n) { var w = o.when + n.t * spq, d = n.dur * spq; o.emit(n, w, d); end = Math.max(end, w + d); });
    return end;
  }

  // ---------- notation ----------
  var DYN = [[0.3, "pp"], [0.45, "p"], [0.6, "mp"], [0.75, "mf"], [0.9, "f"], [9, "ff"]];
  function dynamic(v) { for (var i = 0; i < DYN.length; i++) if (v < DYN[i][0]) return DYN[i][1]; return "ff"; }
  var SHARP = ["C", "^C", "D", "_E", "E", "F", "^F", "G", "_A", "A", "_B", "B"];
  function pitchAbc(m, accs) {               // accs: letter+octave -> accidental in force this bar
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 5, sp = SHARP[pc], acc = sp.length > 1 ? sp[0] : "", L = sp.slice(-1);
    var key = L + oct, had = accs[key] || "";
    var write = acc === had ? "" : (acc || "=");
    accs[key] = acc;
    var s = oct <= 0 ? L + ",".repeat(-oct) : L.toLowerCase() + "'".repeat(oct - 1);   // C = MIDI 60, c = 72, C, = 48
    return write + s;
  }

  function toAbc(src, opts) {
    opts = opts || {};
    var ph = Array.isArray(src) ? null : src;
    var notes = ph ? resolve(ph, opts) : src;
    var kind = opts.kind || (ph && ph.kind === "drum" ? "drum" : notes.length && notes[0].piece ? "drum" : "pitch");
    var meter = opts.meter || (ph && ph.meter) || "4/4", bq = barQ(meter);
    var bars = opts.bars || (ph && ph.bars) || Math.max(1, Math.ceil(Math.max.apply(null, notes.map(function (n) { return n.t + 1e-9; }).concat([0])) / bq + 1e-9));
    var beats = Math.round(bars * bq), total = beats * TPQ;

    // 1. each beat is sixteenths (grid 3) or triplets (grid 4): whichever the onsets sit closer to
    var grid = [];
    for (var b = 0; b < beats; b++) {
      var on = notes.filter(function (n) { return n.t >= b - 1e-9 && n.t < b + 1 - 1e-9; }).map(function (n) { return (n.t - b) * TPQ; });
      var e3 = 0, e4 = 0; on.forEach(function (x) { e3 += Math.abs(x - 3 * Math.round(x / 3)); e4 += Math.abs(x - 4 * Math.round(x / 4)); });
      grid.push(on.length > 1 && e4 + 0.25 < e3 ? 4 : 3);
    }
    function snap(q) {                        // quarter-note time -> ticks on that beat's grid
      var tk = q * TPQ, b = Math.min(beats - 1, Math.max(0, Math.floor(tk / TPQ + 1e-9))), g = grid[b];
      return Math.max(0, Math.min(total, b * TPQ + g * Math.round((tk - b * TPQ) / g)));
    }
    // 2. onsets -> groups (a chord), each lasting to the next onset or its own end
    var byOn = {};
    notes.forEach(function (n) {
      var s = snap(n.t); if (s >= total) return;
      var e = Math.max(s + grid[Math.floor(s / TPQ)], snap(n.t + n.dur));
      (byOn[s] = byOn[s] || { s: s, e: 0, ns: [] }).ns.push(n); byOn[s].e = Math.max(byOn[s].e, e);
    });
    var groups = Object.keys(byOn).map(Number).sort(function (a, c) { return a - c; }).map(function (k) { return byOn[k]; });
    var segs = [], at = 0;
    groups.forEach(function (gr, i) {
      if (gr.s > at) segs.push({ s: at, e: gr.s, g: null });
      var e = Math.min(gr.e, i + 1 < groups.length ? groups[i + 1].s : total);
      segs.push({ s: gr.s, e: e, g: gr }); at = e;
    });
    if (at < total) segs.push({ s: at, e: total, g: null });
    // 3. cut at barlines, at every edge of a triplet beat, and off-beat notes at the next beat
    var pieces = [];
    segs.forEach(function (sg) {
      var s = sg.s, first = true;
      while (s < sg.e) {
        var bt = Math.floor(s / TPQ), cut = Math.min(sg.e, (Math.floor(s / (bq * TPQ) + 1e-9) + 1) * bq * TPQ);
        if (grid[bt] === 4 || s % TPQ) cut = Math.min(cut, (bt + 1) * TPQ);
        else { var j = bt; while ((j + 1) * TPQ < cut && grid[j] === 3) j++; if (grid[j] === 4) cut = Math.min(cut, j * TPQ); }
        if (!sg.g) {                          // rests: one per beat, so the beats stay visible
          if (s % TPQ === 0 && cut - s >= TPQ) cut = s + TPQ * Math.floor((cut - s) / TPQ); else cut = Math.min(cut, (bt + 1) * TPQ);
        }
        pieces.push({ s: s, e: cut, g: sg.g, first: first }); first = false; s = cut;
      }
    });

    // 4. write
    var perc = kind === "drum", clef = opts.clef;
    if (!clef) { var ms = notes.filter(function (n) { return n.midi != null; }).map(function (n) { return n.midi; });
      clef = perc ? "perc" : ms.length && ms.reduce(function (a, c) { return a + c; }, 0) / ms.length < 55 ? "bass" : "treble"; }
    var vels = [], barStr = [], cur = "", accs = {}, lastDyn = null, bpl = opts.barsPerLine || 4;
    var barMean = [];
    for (var bi = 0; bi < bars; bi++) {
      var vs = groups.filter(function (g) { return Math.floor(g.s / (bq * TPQ)) === bi; }).map(function (g) { return gVel(g); });
      barMean.push(vs.length ? vs.reduce(function (a, c) { return a + c; }, 0) / vs.length : null);
    }
    function gVel(g) { return Math.max.apply(null, g.ns.map(function (n) { return n.vel; })); }
    function head(g, cont) {
      var hs = [], seen = {};
      g.ns.forEach(function (n) {
        var t;
        if (perc) { var w = WRITTEN[n.piece] || MORE[n.piece] || ["c", ""]; if (seen[w[0]]) return; seen[w[0]] = 1; t = w[1] + w[0]; }
        else { if (seen[n.midi]) return; seen[n.midi] = 1; t = pitchAbc(n.midi, accs); }
        hs.push([perc ? 0 : n.midi, t]);
      });
      hs.sort(function (a, c) { return a[0] - c[0]; });
      var body = hs.map(function (x) { return x[1]; });
      return body.length > 1 ? "[" + body.join("") + "]" : body[0];
    }
    function fillLen(n) { var out = []; while (n > 0) { var k = 0; while (NOTE_LEN[k] > n) k++; out.push(NOTE_LEN[k]); n -= NOTE_LEN[k]; } return out; }
    var bar = 0, prevBeat = -1, inTrip = 0;
    pieces.forEach(function (p, pi) {
      var pb = Math.floor(p.s / (bq * TPQ)), bt = Math.floor(p.s / TPQ);
      while (pb > bar) { barStr.push(cur.trim()); cur = ""; accs = {}; bar++; prevBeat = -1; }
      if (bt !== prevBeat && cur) cur += " ";
      var trip = grid[bt] === 4, txt = "";
      if (trip && p.s % TPQ === 0) {           // open a triplet: count this beat's pieces
        var cnt = 0; for (var q = pi; q < pieces.length && pieces[q].s < (bt + 1) * TPQ; q++) cnt++;
        txt += "(3:2:" + cnt;
      }
      var lens = trip ? [2 * (p.e - p.s) / 4] : fillLen((p.e - p.s) / 3);
      if (p.g) {
        var v = gVel(p.g), deco = "";
        if (p.first) {
          if (barMean[pb] != null && dynamic(barMean[pb]) !== lastDyn && p.s === groups.filter(function (g) { return Math.floor(g.s / (bq * TPQ)) === pb; })[0].s) {
            lastDyn = dynamic(barMean[pb]); deco += "!" + lastDyn + "!";
          }
          if (v >= barMean[pb] + 0.15 && v >= 0.6) deco += "!>!";
        }
        var tiedNext = pi + 1 < pieces.length && pieces[pi + 1].g === p.g;
        lens.forEach(function (l, li) {
          txt += (li === 0 ? deco : "") + head(p.g) + (l === 1 ? "" : l) + (li < lens.length - 1 || tiedNext ? "-" : "");
          vels.push(v);
        });
      } else lens.forEach(function (l) { txt += "z" + (l === 1 ? "" : l); });
      cur += txt; prevBeat = bt;
    });
    barStr.push(cur.trim());
    while (barStr.length < bars) barStr.push("z" + (bq * 4));
    var lines = [];
    for (var li = 0; li < barStr.length; li += bpl) lines.push(barStr.slice(li, li + bpl).join(" | ") + (li + bpl >= barStr.length ? " |]" : " |"));
    var hdr = ["X:1"];
    var title = opts.title != null ? opts.title : ph && ph.name;
    if (title) hdr.push("T:" + title);
    hdr.push("M:" + meter, "L:1/16", "K:C clef=" + clef + (perc ? " stafflines=5" : ""));
    return { abc: hdr.concat(lines).join("\n"), vels: vels };
  }

  var api = { resolve: resolve, schedule: schedule, toAbc: toAbc, dynamic: dynamic, barQ: barQ, WRITTEN: WRITTEN, TPQ: TPQ };
  global.BandPhrase = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
