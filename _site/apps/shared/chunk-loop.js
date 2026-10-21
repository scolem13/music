/* ChunkLoop: where each chunk of a Notation doc falls in a recording's bar map, and how it loops (the Notation page's Loop chunks part).
   Timing belongs to the bars, not the chunks: a chunk is "section S (its nth time), bars m..n of it", found in the map through the
   map's section of the same name and occurrence, so splitting, joining or renaming chunks never loses it, and a bar added or taken
   away in one section cannot shift another. A section the map does not have falls back to the chunk's bar number (+ offset).

     ChunkLoop.spans(doc, D, model, offset)   -> [{ ci, from, to (map bars, to exclusive), bars, sec, nth, key, label, guessed, mismatch }]
                                                 (Pickup chunks have none: their notes are the next chunk's lead-in)
     ChunkLoop.leadIn(doc, D, spans, k, prefs, model) -> beats: chunk.loop.leadIn, else the song file's (prefs.leadIns[key]), else the chunk's
                                                 own pickup (chunk.lead), else 0. Clamped as Timestamp Notes clamps it.
     ChunkLoop.tail(doc, D, spans, k, prefs, model) -> beats past the chunk's end (< 0: before it): chunk.loop.tail, else the song file's, else
                                                 minus the next chunk's lead-in when it follows on (a one-beat pickup: stop a beat early), else 0.
     ChunkLoop.window(model, spans, k, li, tl, rate) -> { start, end (s), down (s, the first downbeat), beatSec (at the rate), bpm }
     ChunkLoop.status(doc, D, ci)             -> "empty" | "draft" | "done"
   Keys: `key` is TsPhrases' (section lower-cased # nth @ bar offset), so Timestamp Notes' lead-ins and stops carry over.
   Needs TsPhrases (timestamp-player/phrases.js) for the walking-the-bars arithmetic. Loads in Node for tests. */
(function (global) {
  "use strict";
  var P = global.TsPhrases || (typeof require === "function" ? require("./timestamp-player/phrases.js") : null);

  function grid(model) {
    var bars = model.bars, n = bars.length, tot = 0, beats = 0;
    for (var i = 0; i + 1 < n; i++) { tot += bars[i + 1] - bars[i]; beats += model.beats[i]; }
    return { bars: bars, beats: model.beats, beatLen: beats ? tot / beats : 0.5 };
  }
  function barsOf(doc, D, i) { return Math.ceil(D.info(doc, i).bars - 1e-6); }
  function spans(doc, D, model, offset) {
    var out = [], form = 0, secs = D.sections(doc), seen = {}, secInfo = {};
    secs.forEach(function (s) {
      var low = s.name.trim().toLowerCase(), nth = seen[low] = (seen[low] == null ? 0 : seen[low] + 1);
      var ms = model && model.findSection ? model.findSection(s.name, nth) : null, docBars = 0;
      for (var j = s.start; j < s.end; j++) if (!doc.chunks[j].pickup) docBars += barsOf(doc, D, j);
      var mapBars = null;
      if (ms) { var nx = model.sections.filter(function (x) { return x.bar > ms.bar; }).sort(function (a, b) { return a.bar - b.bar; })[0]; mapBars = (nx ? nx.bar : model.bars.length) - ms.bar; }
      secInfo[s.start] = { s: s, nth: nth, ms: ms, mismatch: ms && mapBars != null && mapBars !== docBars ? { doc: docBars, map: mapBars } : null };
    });
    var cur = null, inSec = 0;
    doc.chunks.forEach(function (ch, i) {
      if (secInfo[i]) { cur = secInfo[i]; inSec = 0; }
      if (ch.pickup) return;
      var n = barsOf(doc, D, i);
      if (!n) return;
      var from = cur && cur.ms ? cur.ms.bar + inSec : form + (offset || 0);
      var sec = cur ? cur.s.name : null, nth = cur ? cur.nth : 0;
      out.push({ ci: i, from: from, to: from + n, bars: n, sec: sec, nth: nth, offset: inSec,
        key: sec ? sec.trim().toLowerCase() + "#" + nth + "@" + inSec : "#" + i,
        label: ch.name || "Chunk " + (i + 1), guessed: !(cur && cur.ms), mismatch: cur ? cur.mismatch : null });
      form += n; inSec += n;
    });
    return out;
  }
  function beatQ(doc, D, ci) { var mi = D.meterInfo(D.at(doc, ci).meter) || D.meterInfo("4/4"); return 4 / mi.d; }
  function ownLeadIn(doc, D, sp, k, prefs) {
    var s = sp[k], ch = doc.chunks[s.ci], L = ch.loop || {};
    if (L.leadIn != null) return L.leadIn;
    if (prefs && prefs.leadIns && prefs.leadIns[s.key] != null) return prefs.leadIns[s.key];
    if (ch.lead > 1e-6) return ch.lead / beatQ(doc, D, s.ci);
    var pk = s.ci > 0 && doc.chunks[s.ci - 1].pickup ? D.chunkLen(doc, s.ci - 1) : 0;      // a Pickup chunk before it
    return pk ? pk / beatQ(doc, D, s.ci) : 0;
  }
  function leadIn(doc, D, sp, k, prefs, model) {
    var v = ownLeadIn(doc, D, sp, k, prefs);
    if (model && P) { var g = grid(model), max = P.maxLeadIn(g, asPhrases(sp), k); v = Math.min(v, max); }
    return Math.max(0, v);
  }
  function tail(doc, D, sp, k, prefs, model) {
    var s = sp[k], ch = doc.chunks[s.ci], L = ch.loop || {}, v;
    if (L.tail != null) v = L.tail;
    else if (prefs && prefs.tails && prefs.tails[s.key] != null) v = prefs.tails[s.key];
    else { var nx = sp[k + 1]; v = nx && nx.from === s.to ? -leadIn(doc, D, sp, k + 1, prefs, model) : 0; }
    if (model && P) { var g = grid(model), ph = asPhrases(sp); v = Math.max(P.minTail(g, ph, k), Math.min(P.maxTail(g, ph, k), v)); }
    return v;
  }
  function asPhrases(sp) { return sp.map(function (s) { return { from: s.from, to: s.to }; }); }
  function win(model, sp, k, li, tl, rate) {
    var g = grid(model), s = sp[k], r = rate || 1;
    var down = s.from < g.bars.length ? g.bars[s.from] : P.endOf(g, s.from);
    var end = tl > 0 ? P.forwardFrom(g, s.to, tl) : tl < 0 ? P.backFrom(g, s.to, -tl) : P.endOf(g, s.to);
    var beats = 0; for (var b = s.from; b < s.to; b++) beats += g.beats[b] || g.beats[g.beats.length - 1] || 4;
    var secs = P.endOf(g, s.to) - down, bpm = secs > 0 ? beats * 60 / secs : null;
    return { start: P.backFrom(g, s.from, li), end: end, down: down, beatSec: secs > 0 ? secs / beats / r : 0.5 / r, bpm: bpm };
  }
  function status(doc, D, ci) {
    var ch = doc.chunks[ci];
    if (ch.draft) return "draft";
    for (var v = 0; v < (doc.voices || [1]).length; v++) { var p = D.part(ch, v); if (p.pitches.some(function (x) { return x != null; })) return "done"; }
    return "empty";
  }
  var api = { spans: spans, leadIn: leadIn, tail: tail, window: win, status: status, grid: grid };
  global.ChunkLoop = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
