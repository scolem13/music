// abc-clip.js — a DAW note clip as ABC and back (global AbcClip; loads in Node for tests). No page, no audio. Needs abc-core.js and abc-events.js first.
// Used by the DAW's "Edit as notation" panel (compose-tools.js, attribute data-abc-edit on the .mdaw div).
//
//   AbcClip.quantise(clip, { ts, grid })       -> { g, barU, bars, notes: [{ s, e, m, v }] } the clip's notes on the grid, in grid units (s start, e end), cut to the clip's bars
//   AbcClip.clipToAbc(clip, { ts, key, grid, title }) -> { abc, bars, voices, key, offGrid, grid, ts, quant }
//        clip = { start, len, notes: [{ t, d, m, v }] } (beats; t from the clip's start). ts = [n, d] (the project's time signature at the clip, default 4/4),
//        key = "C" | "Bb" | "F#" … | "auto" (the major key with fewest accidentals) (default "C"), grid = 0.25 (sixteenths, default) or 0.5 (eighths),
//        offGrid = how many notes start or end off the grid (the apply step warns).
//   AbcClip.abcToNotes(abc)                    -> { notes: [{ t, d, m }] sorted, bars, voices, meter, barBeats, key, chords: [{ t, name, bar }] } t, d in beats (quarter notes)
//   AbcClip.checkBars(abc)                     -> { bad: [{ voice, bar (1-based), got, want }], bars } in quarter notes (a short last bar is allowed)
//   AbcClip.noteSpans(abc)                     -> [{ start, end (character offsets in abc), t, d, notes: [midi] }] for matching a clicked note head
//   AbcClip.merge(oldNotes, newNotes, grid)    -> notes with the old velocity where pitch and quantised start match (others get the clip's mean velocity)
//   AbcClip.KEYS: the key names offered.
//
// Writing rules. One voice when notes never overlap (notes starting together with the same length are a chord "[CEG]4"); otherwise events (same start + same
// length) are dealt into voices first-fit, written "[V:1] …" lines under "%%score (1 2)" (one staff). Lengths are written in L:1/16 (or 1/8), a note that
// is not a plain or dotted length, or crosses a bar line, is split and tied (a chord ties as a whole). Accidentals follow the key (flat keys spell with flats,
// others with sharps) and the bar's earlier accidentals; a tied note after a bar line has its accidental again. A clip's last bar is filled with rests.
// Accidental memory is by letter, not by octave (abc-core / abc-events read it that way; a redundant sign in another octave is harmless).
// Beams: notes in one beat (a dotted quarter in 6/8, 9/8, 12/8) are written without spaces. Bass clef when the median pitch is below E3.
// Unverified: how abcjs shows several voices of one staff with %%score (1 2) when they overlap (checked only that it draws).
(function (global) {
  "use strict";
  var Core = global.AbcCore || (typeof require === "function" ? require("../abc-core.js") : null);
  var Ev = global.AbcEvents || (typeof require === "function" ? require("../abc-events.js") : null);
  if (!Core || !Ev) throw new Error("abc-clip.js needs abc-core.js and abc-events.js loaded first");

  var SHARP_KEYS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7 }, FLAT_KEYS = { F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
  var KEYS = ["C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db", "Gb"];
  var ORDER_S = "FCGDAEB", ORDER_F = "BEADGCF";
  var TAB_S = [["C", ""], ["C", "#"], ["D", ""], ["D", "#"], ["E", ""], ["F", ""], ["F", "#"], ["G", ""], ["G", "#"], ["A", ""], ["A", "#"], ["B", ""]];
  var TAB_F = [["C", ""], ["D", "b"], ["D", ""], ["E", "b"], ["E", ""], ["F", ""], ["G", "b"], ["G", ""], ["A", "b"], ["A", ""], ["B", "b"], ["B", ""]];
  var ALIGN = { 16: 16, 12: 8, 8: 8, 6: 4, 4: 4, 3: 2, 2: 2, 1: 1 }, LENS = [16, 12, 8, 6, 4, 3, 2, 1];

  function keyCount(k) { return k in SHARP_KEYS ? SHARP_KEYS[k] : k in FLAT_KEYS ? FLAT_KEYS[k] : 0; }
  function sigOf(k) {   // letter -> "#" | "b" | ""
    var n = keyCount(k), o = {}; "ABCDEFG".split("").forEach(function (l) { o[l] = ""; });
    if (n > 0) for (var i = 0; i < n; i++) o[ORDER_S[i]] = "#"; else for (var j = 0; j < -n; j++) o[ORDER_F[j]] = "b"; return o;
  }
  function spell(m, key) {
    var tab = keyCount(key) < 0 ? TAB_F : TAB_S, t = tab[((m % 12) + 12) % 12], oct = Math.floor(m / 12) - 1;   // C4 = 60
    return { letter: t[0], acc: t[1], oct: oct };
  }
  function accCount(notes, key) { var sig = sigOf(key), c = 0; notes.forEach(function (n) { var s = spell(n.m, key); if (sig[s.letter] !== s.acc) c++; }); return c; }
  function bestKey(notes) {
    var best = "C", bc = accCount(notes, "C");
    KEYS.forEach(function (k) { var c = accCount(notes, k); if (c < bc) { bc = c; best = k; } }); return best;
  }
  function pitchText(m, key, state) {   // state: bar's accidentals by letter+octave (changed here)
    var s = spell(m, key), id = s.letter, sig = sigOf(key), cur = state[id] != null ? state[id] : sig[s.letter], pre = "";
    if (cur !== s.acc) { pre = s.acc === "#" ? "^" : s.acc === "b" ? "_" : "="; state[id] = s.acc; }
    var l = s.oct >= 5 ? s.letter.toLowerCase() : s.letter, mark = s.oct >= 5 ? new Array(s.oct - 5 + 1).join("'") : new Array(4 - s.oct + 1).join(",");
    return pre + l + mark;
  }

  function barBeatsOf(ts) { return ts[0] * 4 / ts[1]; }
  function setup(clip, o) {
    o = o || {}; var ts = Array.isArray(o.ts) && o.ts[0] >= 1 && o.ts[1] >= 1 ? o.ts : [4, 4], bb = barBeats(ts), g = o.grid === 0.5 ? 0.5 : 0.25;
    if (Math.abs(bb / g - Math.round(bb / g)) > 1e-9) g = 0.25;
    var barU = Math.round(bb / g), bars = Math.max(1, Math.ceil((clip.len || bb) / bb - 1e-6)), total = bars * barU;
    return { ts: ts, bb: bb, g: g, barU: barU, bars: bars, total: total };
  }
  function barBeats(ts) { return barBeatsOf(ts); }
  function quantise(clip, o) {
    var S = setup(clip, o), out = [], off = 0;
    (clip.notes || []).forEach(function (n) {
      var s = Math.round(n.t / S.g), e = Math.round((n.t + n.d) / S.g);
      if (Math.abs(n.t / S.g - s) > 0.02 || Math.abs((n.t + n.d) / S.g - e) > 0.02) off++;
      if (s < 0 || s >= S.total) return; e = Math.min(Math.max(e, s + 1), S.total); out.push({ s: s, e: e, m: n.m, v: n.v });
    });
    // one note per pitch and start: the later one wins
    var seen = {}, uniq = []; out.forEach(function (n) { var k = n.m + "@" + n.s; if (seen[k] != null) uniq[seen[k]] = n; else { seen[k] = uniq.length; uniq.push(n); } });
    uniq.sort(function (a, b) { return a.s - b.s || a.m - b.m; });
    return { g: S.g, barU: S.barU, bars: S.bars, ts: S.ts, notes: uniq, offGrid: off };
  }

  // split [s, e) at bar lines and into written lengths; -> [{ s, len, last (the event's last piece) }]
  function pieces(s, e, barU) {
    var out = [];
    while (s < e) {
      var barStart = Math.floor(s / barU) * barU, rem = Math.min(e, barStart + barU) - s, pos = s - barStart, pick = 1;
      for (var i = 0; i < LENS.length; i++) { var L = LENS[i]; if (L <= rem && pos % ALIGN[L] === 0) { pick = L; break; } }
      out.push({ s: s, len: pick }); s += pick;
    }
    if (out.length) out[out.length - 1].last = true; return out;
  }
  function lenText(n) { return n === 1 ? "" : String(n); }

  function clipToAbc(clip, o) {
    o = o || {}; var Q = quantise(clip, o), g = Q.g, barU = Q.barU, ts = Q.ts, notes = Q.notes;
    var key = o.key && o.key !== "auto" && (o.key in SHARP_KEYS || o.key in FLAT_KEYS) ? o.key : o.key === "auto" ? bestKey(notes) : "C";
    // events: same start and end
    var evs = {}, list = [];
    notes.forEach(function (n) { var k = n.s + "-" + n.e; if (!evs[k]) { evs[k] = { s: n.s, e: n.e, ms: [] }; list.push(evs[k]); } evs[k].ms.push(n.m); });
    list.forEach(function (x) { x.ms.sort(function (a, b) { return a - b; }); });
    list.sort(function (a, b) { return a.s - b.s || b.e - a.e || b.ms[b.ms.length - 1] - a.ms[a.ms.length - 1]; });
    var voices = []; list.forEach(function (x) { for (var v = 0; v < voices.length; v++) if (voices[v].end <= x.s) { voices[v].evs.push(x); voices[v].end = x.e; return; } voices.push({ evs: [x], end: x.e }); });
    if (!voices.length) voices.push({ evs: [], end: 0 });
    var total = Q.bars * barU, compound = ts[1] === 8 && ts[0] % 3 === 0 && ts[0] >= 6, beatU = compound ? Math.round(1.5 / g) : Math.round(1 / g);
    var sorted = notes.map(function (n) { return n.m; }).sort(function (a, b) { return a - b; }), clef = sorted.length && sorted[(sorted.length / 2) | 0] < 52 ? " clef=bass" : "";

    var lines = voices.map(function (V) {
      var bars = [], cur = [], state = {}, cursor = 0, bar = 0;
      function push(text, s) { var b = Math.floor(s / barU); while (bar < b) { bars.push(cur); cur = []; state = {}; bar++; } cur.push({ text: text, pos: s - b * barU }); }
      function rest(s, e) { pieces(s, e, barU).forEach(function (p) { push("z" + lenText(p.len), p.s); }); }
      V.evs.forEach(function (x) {
        if (x.s > cursor) rest(cursor, x.s);
        pieces(x.s, x.e, barU).forEach(function (p) {
          var b = Math.floor(p.s / barU); if (b > bar) { while (bar < b) { bars.push(cur); cur = []; state = {}; bar++; } }
          var body = x.ms.length > 1 ? "[" + x.ms.map(function (m) { return pitchText(m, key, state); }).join("") + "]" + lenText(p.len) : pitchText(x.ms[0], key, state) + lenText(p.len);
          push(body + (p.last ? "" : "-"), p.s); });
        cursor = x.e;
      });
      if (cursor < total) rest(cursor, total);
      while (bar < Q.bars - 1) { bars.push(cur); cur = []; bar++; } bars.push(cur);
      return bars.map(function (items) { var out = "", lastB = -1; items.forEach(function (it) { var gb = Math.floor(it.pos / beatU); out += (lastB >= 0 && gb !== lastB ? " " : "") + it.text; lastB = gb; }); return out; });
    });
    var multi = voices.length > 1, body = [];
    voices.forEach(function (V, vi) {
      var bars = lines[vi];
      for (var i = 0; i < bars.length; i += 4) { var chunk = bars.slice(i, i + 4).join(" | ") + (i + 4 >= bars.length ? " |]" : " |"); body.push((multi ? "[V:" + (vi + 1) + "] " : "") + chunk); }
    });
    var head = ["X:1", "T:" + String(o.title || "Clip").replace(/[\r\n]+/g, " "), "M:" + ts[0] + "/" + ts[1], "L:1/" + (g === 0.5 ? 8 : 16)];
    if (multi) { head.push("%%score (" + voices.map(function (v, i) { return i + 1; }).join(" ") + ")"); voices.forEach(function (v, i) { head.push("V:" + (i + 1)); }); }
    head.push("K:" + key + clef);
    return { abc: head.concat(body).join("\n") + "\n", bars: Q.bars, voices: voices.length, key: key, offGrid: Q.offGrid, grid: g, ts: ts, quant: Q };
  }

  function voiceIds(abc) { var ids = [], re = /^\s*\[V:\s*([^\]\s]+)/gm, m; while ((m = re.exec(abc))) if (ids.indexOf(m[1]) < 0) ids.push(m[1]); return ids; }
  function r6(x) { return Math.round(x * 1e6) / 1e6; }
  function readAbc(abc) {
    var ids = voiceIds(abc), res = [], first = null;
    (ids.length ? ids : ["V1"]).forEach(function (id) { var r = Ev.fromAbc(abc, { voice: id }); if (!first) first = r; res.push({ id: id, r: r }); });
    return { voices: res, first: first };
  }
  function abcToNotes(abc) {
    var R = readAbc(abc), notes = [], bars = 0, chords = [];
    R.voices.forEach(function (V) {
      var open = {};
      V.r.written.forEach(function (ev) {
        if (ev.kind !== "note") { open = {}; return; }
        var ms = ev.notes || [ev.pitches[0].midi], next = {};
        ms.forEach(function (m) {
          var o = open[m];
          if (o && Math.abs(o.end - ev.t_on) < 1e-6) { o.n.d = r6(ev.t_off - o.n.t); o.end = ev.t_off; next[m] = o; }
          else { var n = { t: r6(ev.t_on), d: r6(ev.t_off - ev.t_on), m: m }; notes.push(n); next[m] = { n: n, end: ev.t_off }; } });
        if (!ev.tieNext) next = {}; open = next;
      });
      bars = Math.max(bars, Math.ceil(V.r.quarters / V.r.barQuarters - 1e-6));
    });
    R.first.chords.forEach(function (c) { chords.push({ t: r6(c.t), name: c.name, bar: c.bar }); });
    notes.sort(function (a, b) { return a.t - b.t || a.m - b.m; });
    return { notes: notes, bars: bars, voices: R.voices.length, meter: R.first.meter, barBeats: R.first.barQuarters, key: R.first.key, chords: chords };
  }
  function checkBars(abc) {
    var R = readAbc(abc), bad = [], bars = 0;
    R.voices.forEach(function (V) {
      var sums = {}, want = V.r.barQuarters, last = -1;
      V.r.written.forEach(function (ev) { sums[ev.bar] = (sums[ev.bar] || 0) + (ev.t_off - ev.t_on); last = Math.max(last, ev.bar); });
      Object.keys(sums).forEach(function (b) { b = +b; var got = sums[b]; if (Math.abs(got - want) > 1e-6 && !(b === last && got < want)) bad.push({ voice: V.id, bar: b + 1, got: r6(got), want: want }); });
      bars = Math.max(bars, last + 1);
    });
    return { bad: bad, bars: bars };
  }

  // character spans of each written note / chord, for a click on the staff
  function noteSpans(abc) {
    var R = readAbc(abc), lines = abc.split("\n"), out = [], hasV = voiceIds(abc).length > 0, abs = 0, segs = {};   // segs[voice] = [{ from (in the joined text), abs, len }]
    var joined = {}; var lineAbs = [];
    lines.forEach(function (raw) { lineAbs.push(abs); abs += raw.length + 1; });
    R.voices.forEach(function (V) {
      var segsV = [], pos = 0;
      lines.forEach(function (raw, li) {
        var l = raw.trim(); if (!l || /^%/.test(l)) return; var lead = raw.length - raw.replace(/^\s+/, "").length, text = null, skip = 0;
        if (hasV) { var m = /^\[V:\s*([^\]]+)\]/.exec(l); if (m && m[1].trim() === V.id) { text = l.slice(m[0].length); skip = m[0].length; } }
        else if (!/^[A-Za-z]:/.test(l)) text = l;
        if (text == null) return; segsV.push({ from: pos, abs: lineAbs[li] + lead + skip, len: text.length }); pos += text.length + 1;
      });
      V.r.written.forEach(function (ev) {
        if (ev.kind !== "note") return; var sg = null; segsV.forEach(function (s) { if (ev.i >= s.from && ev.i <= s.from + s.len) sg = s; }); if (!sg) return;
        var a = sg.abs + (ev.i - sg.from), start = a; if (abc[a] !== "[" && abc[a - 1] === "[") start = a - 1;
        var end = a + 1; if (abc[start] === "[") { var c = abc.indexOf("]", start); if (c > 0) end = c + 1; }
        out.push({ start: start, end: end, t: r6(ev.t_on), d: r6(ev.t_off - ev.t_on), notes: (ev.notes || [ev.pitches[0].midi]).slice() }); });
    });
    return out;
  }

  // the old velocities for the notes that kept their pitch and (quantised) start
  function merge(oldNotes, newNotes, grid) {
    var g = grid || 0.25, byKey = {}, sum = 0, cnt = 0;
    (oldNotes || []).forEach(function (n) { var k = n.m + "@" + Math.round(n.t / g); if (byKey[k] == null) byKey[k] = n.v; sum += n.v; cnt++; });
    var mean = cnt ? Math.round(sum / cnt * 100) / 100 : 0.8;
    return newNotes.map(function (n) { var k = n.m + "@" + Math.round(n.t / g); return { t: n.t, d: n.d, m: n.m, v: byKey[k] != null ? byKey[k] : mean }; });
  }

  var api = { quantise: quantise, clipToAbc: clipToAbc, abcToNotes: abcToNotes, checkBars: checkBars, noteSpans: noteSpans, merge: merge, KEYS: KEYS, bestKey: bestKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AbcClip = api;
})(typeof window !== "undefined" ? window : globalThis);
