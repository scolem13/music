// tune-score.js — a tune's own notation, for the Backing Track page (BandTuneScore).
// Works on an ABC text and its parsed chart (TuneChart.parse), whose bars each know where they were written (bar.at).
//
//   BandTuneScore.melody(abc, parsed, geoOf)   -> mel: per chart bar, [{ pos, dur, midi, tie? }] in units (an eighth), at the
//        pitch the ABC is written in: the shape the page's own melody takes (ChordEntry.playable turns it into beats).
//        geoOf(bar) -> { per (units in the bar), beat (units in a beat) }. A pickup's notes sit at the end of the bar's full slot.
//        Needs AbcTune (apps/tune-assessment/abc-tune.js) for the key signatures. Reads tuplets, broken rhythm, ties (also across a barline),
//        chords (the top note), inline and mid-tune K:, M: and L:, the first voice only. Rests are gaps; grace notes are left out.
//   BandTuneScore.fragment(abc, parsed, from, to)   -> { text, shift } or null. text = ABC of the bars from..to-1: the header (without its title, composer and tempo: the page names the tune), then the
//        written lines that hold them (with the words under those lines); a position in the whole ABC (bar.at) is at + shift in
//        text. null when a bar has no place in the text. Whole lines, so repeats and endings come with them; a section starts on
//        its own line (its P: line), so this is the section as written.
//   BandTuneScore.hasNotes(abc)   -> does the ABC write any notes (and not only chord symbols over rests)?
//   BandTuneScore.header(abc)     -> the ABC up to and including its K: line, with an L: line added when it has none.
(function (global) {
  function header(abc){
    var m = /^K:[^\n]*$/m.exec(abc); if (!m) return null;
    var h = abc.slice(0, m.index + m[0].length);
    if (!/^L:/m.test(h)){
      var mm = /^M:\s*(\d+)\s*\/\s*(\d+)/m.exec(h), r = mm ? +mm[1] / +mm[2] : 1;       // the standard default: an eighth, a sixteenth under three quarters of a bar
      h = h.replace(/^K:/m, "L:" + (r < 0.75 ? "1/16" : "1/8") + "\nK:");
    }
    return h;
  }
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var TUP = { 2: 3, 3: 2, 4: 3, 5: 2, 6: 2, 7: 2, 8: 3, 9: 3 };            // (p: p notes in the time of q (ABC 2.1); 5 and 7 in compound time take 3
  function meterOf(v){ var m = /(\d+)\s*\/\s*(\d+)/.exec(v) || (/^\s*C\|?\s*$/.test(v) ? [0, 4, 4] : null); return m ? { n: +m[1], d: +m[2] } : null; }
  function defaultL(M){ return (M && M.n / M.d < 0.75) ? 0.25 : 0.5; }                      // quarters in an L: unit: a sixteenth under three quarters of a bar, else an eighth
  function lenOf(v){ var m = /(\d+)\s*\/\s*(\d+)/.exec(v); return m ? 4 * m[1] / m[2] : null; }
  // The notes of the tune, bar by bar: its own reader (the line of the first voice, once through, as written). Each chart bar knows where
  // it was written (bar.at); a note belongs to the bar it starts in. Handles tuplets, broken rhythm, ties, chords (the top note), grace
  // notes (left out), decorations, inline and mid-tune K:, M: and L:, repeats and endings (just barlines), Z rests. { bars: [[{ pos, dur, midi }]],
  // lens: [quarters in each bar as written] }, pos and dur in quarter notes.
  function read(abc, parsed){
    var T = global.AbcTune, bars = parsed.bars, n = bars.length, out = [], lens = [], i;
    for (i = 0; i < n; i++){ out.push([]); lens.push(0); }
    var km = /^K:[^\n]*(\n|$)/m.exec(abc); if (!km) return { bars: out, lens: lens };
    var head = abc.slice(0, km.index), M = meterOf((/^M:(.*)$/m.exec(head) || [0, "4/4"])[1]) || { n: 4, d: 4 };
    var Lx = (/^L:(.*)$/m.exec(head) || [])[1], L = Lx && lenOf(Lx) ? lenOf(Lx) : defaultL(M), keyAcc = {}, key = "C", octShift = 0;
    function setKey(v){ key = v; var om = /\boctave=(-?\d+)/.exec(v); octShift = om ? 12 * +om[1] : 0; keyAcc = T && T.keyAccidentals ? T.keyAccidentals(v) : {}; } setKey(km[0].replace(/^K:\s*/, "").replace(/\s+$/, ""));
    var at = bars.map(function (b){ return b.at == null ? -1 : b.at; }), cur = 0, barT = 0, t = 0, last = null, acc = {}, tup = null, brokenNext = 1, voice = null, firstVoice = null;
    function compound(){ return M.d === 8 && M.n >= 6 && M.n % 3 === 0; }
    function toBar(p){ while (cur + 1 < n){ var k = cur + 1; while (k < n && at[k] < 0) k++; if (k >= n || p < at[k]) break; lens[cur] = t - barT; cur = k; barT = t; } }
    function takeDur(s, j){                                                               // 3  /2  3/2  //  /  → [multiplier, next index]
      var num = "", d = 0; while (j < s.length && /\d/.test(s[j])) num += s[j++];
      var m = num ? +num : 1;
      if (s[j] === "/"){ var f = 1; while (s[j] === "/"){ j++; var dd = ""; while (j < s.length && /\d/.test(s[j])) dd += s[j++]; if (dd) { m = m / +dd; f = 0; } else if (f) m /= 2; else if (!dd) m /= 2; } }
      return [m, j];
    }
    function span(mult){ var f = brokenNext; brokenNext = 1; if (tup){ f *= tup.q / tup.p; if (--tup.left <= 0) tup = null; } return mult * L * f; }
    function broken(ch, cnt){ var f = Math.pow(0.5, cnt), up = 2 - f; if (!last) return; var mine = ch === ">" ? up : f; brokenNext = ch === ">" ? f : up;
      var nd = last.dur * mine; t += nd - last.dur; last.dur = nd; if (last.note) last.note.dur = nd; }
    function pitch(s, j, ev){                                                              // [accidentals]letter[octave marks] → [midi, next index] or null
      var a, k = j; while (s[k] === "^" || s[k] === "_" || s[k] === "="){ if (s[k] === "="){ a = 0; k++; } else { var u = s[k]; a = (a || 0) + (u === "^" ? 1 : -1); k++; } }
      var ch = s[k]; if (!/[A-Ga-g]/.test(ch || "")) return null; k++;
      var up = ch.toUpperCase(), oct = ch === up ? 0 : 1; while (s[k] === "," || s[k] === "'"){ oct += s[k] === "'" ? 1 : -1; k++; }
      var kk = up + oct, semi = SEMI[up] + 60 + 12 * oct;
      if (a !== undefined) acc[kk] = a; var use = a !== undefined ? a : acc[kk] !== undefined ? acc[kk] : (keyAcc[up] || 0);
      return [semi + use + octShift, k];
    }
    function event(isNote, midi, mult, off){ toBar(off); var d = span(mult), ev = { dur: d };
      if (isNote){
        var nt = { pos: (t - barT), dur: d, midi: midi };
        if (last && last.tie && last.note && last.note.midi === midi){ last.note.dur += d; last.dur = d; last.tie = false; last.joined = true; t += d; return; }     // held over the barline or the beat
        out[cur].push(nt); ev.note = nt; }
      last = ev; t += d; }
    function line(s, base){
      var j = 0;
      while (j < s.length){
        var ch = s[j], off = base + j;
        if (ch === " " || ch === "\t" || ch === "\\" || ch === "`" || ch === "*" || ch === "." || ch === "~" || ch === "&" || ch === "$"){ j++; continue; }
        if (ch === "%") break;
        if (ch === '"'){ j = s.indexOf('"', j + 1); if (j < 0) break; j++; continue; }
        if (ch === "!" || ch === "+"){ var e1 = s.indexOf(ch, j + 1); j = e1 < 0 ? j + 1 : e1 + 1; continue; }
        if (ch === "{"){ var e2 = s.indexOf("}", j); j = e2 < 0 ? s.length : e2 + 1; continue; }
        if (/[HLMOPSTuvy]/.test(ch)){ j++; continue; }
        if (ch === "|" || ch === ":" || ch === "]"){ toBar(off); acc = {}; j++; while (/[|:\]]/.test(s[j] || "")) j++; var nm = /^[\d,-]+/.exec(s.slice(j)); if (nm && ch === "|") j += nm[0].length; continue; }
        if (ch === ">" || ch === "<"){ var c2 = 1; while (s[j + c2] === ch) c2++; broken(ch, c2); j += c2; continue; }
        if (ch === "-"){ if (last && last.note) last.tie = true; j++; continue; }
        if (ch === ")"){ j++; continue; }
        if (ch === "("){
          var tm = /^\((\d+)(?::(\d*))?(?::(\d*))?/.exec(s.slice(j));
          if (tm){ var p = +tm[1], q = tm[2] ? +tm[2] : (TUP[p] || 2); if ((p === 5 || p === 7) && !tm[2] && compound()) q = 3; tup = { p: p, q: q, left: tm[3] ? +tm[3] : p }; j += tm[0].length; }
          else j++;
          continue;
        }
        if (ch === "["){
          var fm = /^\[([A-Za-z]):([^\]]*)\]/.exec(s.slice(j));
          if (fm){ if (fm[1] === "K"){ setKey(fm[2].trim()); acc = {}; } else if (fm[1] === "L" && lenOf(fm[2])) L = lenOf(fm[2]); else if (fm[1] === "M" && meterOf(fm[2])){ M = meterOf(fm[2]); if (!Lx) L = defaultL(M); } j += fm[0].length; continue; }
          if (/[\d|]/.test(s[j + 1] || "")){ toBar(off); acc = {}; j++; var nm2 = /^[\d,-]+/.exec(s.slice(j)); if (nm2) j += nm2[0].length; else if (s[j] === "|") j++; continue; }
          var k = j + 1, top = null, inner = 1, first = true;                                // a chord: the top note carries the tune
          while (k < s.length && s[k] !== "]"){
            var pp = pitch(s, k, null); if (pp){ k = pp[1]; var dd = takeDur(s, k); k = dd[1]; if (first){ inner = dd[0]; first = false; } if (top == null || pp[0] > top) top = pp[0];
              if (s[k] === "-"){ k++; } } else k++; }
          var od = takeDur(s, k + 1); event(top != null, top, inner * od[0], off); j = od[1];
          if (s[j] === "-"){ if (last && last.note) last.tie = true; j++; }
          continue;
        }
        if (ch === "z" || ch === "x"){ var rd = takeDur(s, j + 1); event(false, 0, rd[0], off); j = rd[1]; continue; }
        if (ch === "Z" || ch === "X"){ var zd = takeDur(s, j + 1), bl = 4 * M.n / M.d; toBar(off); var dz = zd[0] * bl; last = { dur: dz }; t += dz; j = zd[1]; continue; }
        var pr = /[\^_=A-Ga-g]/.test(ch) ? pitch(s, j, null) : null;
        if (pr){ var nd = takeDur(s, pr[1]); event(true, pr[0], nd[0], off); j = nd[1]; if (s[j] === "-"){ if (last && last.note) last.tie = true; j++; } continue; }
        j++;
      }
    }
    var started = false, pos = km.index + km[0].length, lines = abc.slice(pos).split("\n");
    for (var li = 0; li < lines.length; li++){
      var ln = lines[li], base = pos; pos += ln.length + 1;
      var tr = ln.replace(/\s+$/, ""); if (!tr){ if (started) break; continue; }       // (a blank line ends the tune)
      if (/^\s*%/.test(tr)) continue;
      var fm2 = /^([A-Za-z]):\s*(.*)$/.exec(tr);
      if (fm2 && !/^\[/.test(tr)){
        var f = fm2[1], v = fm2[2];
        if (f === "K"){ setKey(v.trim()); acc = {}; }
        else if (f === "L" && lenOf(v)) L = lenOf(v);
        else if (f === "M" && meterOf(v)){ M = meterOf(v); if (!Lx) L = defaultL(M); }
        else if (f === "V"){ var id = v.split(/\s+/)[0]; voice = id; if (firstVoice == null) firstVoice = id; }
        continue;
      }
      if (voice != null && voice !== firstVoice) continue;
      started = true; line(tr, base);
    }
    toBar(1e12); lens[cur] = t - barT;
    return { bars: out, lens: lens };
  }
  // mel: per chart bar [{ pos, dur, midi }] in units (an eighth) at the pitch the ABC is written in; geoOf(bar) -> { per, beat }.
  function melody(abc, parsed, geoOf){
    if (!parsed || !parsed.bars) return [];
    var r = read(abc, parsed);
    return r.bars.map(function (notes, i){
      var bar = parsed.bars[i], g = geoOf(bar), shift = bar.anacrusis ? Math.max(0, g.per - r.lens[i] * 2) : 0;
      return notes.map(function (x){ return { pos: x.pos * 2 + shift, dur: x.dur * 2, midi: x.midi }; }).filter(function (x){ return x.pos < g.per - 1e-6 && x.dur > 0; });
    });
  }
  function hasNotes(abc){
    var h = header(abc); if (!h) return false;
    var body = abc.slice(h.length).split("\n").filter(function (l){ return !/^\s*([A-Za-z]:|%)/.test(l); }).join("\n");
    body = body.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, "").replace(/\{[^}]*\}/g, "").replace(/\[[A-Za-z]:[^\]]*\]/g, "");
    return /[A-Ga-g]/.test(body);
  }
  function lineStart(abc, at){ return abc.lastIndexOf("\n", at - 1) + 1; }
  function lineEnd(abc, at){
    var e = abc.indexOf("\n", at); if (e < 0) return abc.length;
    for (;;){                                              // the words under the line
      var nx = abc.indexOf("\n", e + 1), line = abc.slice(e + 1, nx < 0 ? abc.length : nx);
      if (!/^w:/.test(line)) return e;
      e = nx < 0 ? abc.length : nx; if (nx < 0) return e;
    }
  }
  function fragment(abc, parsed, from, to){
    var h = header(abc); if (h) h = h.replace(/^[TQC]:.*\n?/gm, "").replace(/\n+$/, ""); if (!h || !parsed || !parsed.bars[from] || !parsed.bars[to - 1]) return null;
    var a = parsed.bars[from].at, z = parsed.bars[to - 1].at; if (!(a >= 0) || !(z >= 0)) return null;
    var bs = lineStart(abc, a), body = abc.slice(bs, lineEnd(abc, z));
    if (!body.trim()) return null;
    return { text: h + "\n" + body + "\n", shift: h.length + 1 - bs };
  }
  global.BandTuneScore = { melody: melody, read: read, fragment: fragment, hasNotes: hasNotes, header: header };
  if (typeof module !== "undefined" && module.exports) module.exports = global.BandTuneScore;
})(typeof window !== "undefined" ? window : globalThis);
