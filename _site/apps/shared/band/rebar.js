// rebar.js — re-write a chord chart (chords over rests) for another meter. Pure text in, text out: no DOM, no band.
//   BandRebar.check(abc)        -> { ok: true, meter: "4/4", beats } or { ok: false, why: "melody" | "change" | "meter" | "key", reason }
//       whether the chart can be re-barred AT ALL (so the page can tell the Meter menu is no use here).
//   BandRebar.rebar(abc, toId)  -> { ok: true, abc, from, to, fromBeats, toBeats, same } or { ok: false, why, reason }
//       toId is "4/4", "3/4", "6/8" or "12/8". Each chord keeps its share of the bar; M: and L: are re-written and the rests
//       are re-made; every other character (title, P: lines, bar lines, repeats, endings, "^stop" and other annotations,
//       decorations, comments, line breaks) is copied as it stood.
//   BandRebar.pace(abc, 2 | 0.5) -> the same meter with the chords passing twice as fast or half as fast (see below).
// The band places a chord on a whole BEAT (a dotted quarter in 6/8, 9/8 and 12/8; see BandHarmony.meterInfo and buildForm), so
// the grid is the new meter's beats: 4/4 has 4, 3/4 has 3, 6/8 has 2, 12/8 has 4. A chord goes to round(share of the bar x beats)
// (a tie rounds up, so beat 3 of 4 lands on the second beat of 6/8). Between 4/4 and 3/4 a chord simply keeps its beat number (beat 3 stays beat 3). If that puts two chords on one beat the
// later one moves up (or the earlier one down) a beat, but never more than one beat from where it should be; a bar with more
// chords than the new meter has beats is refused. A short bar (a pick-up) keeps its share of a full bar, whole beats, at least one.
(function (global) {
  "use strict";
  var TARGETS = { "4/4": { n: 4, d: 4, L: "1/4", beats: 4, per: 1 }, "3/4": { n: 3, d: 4, L: "1/4", beats: 3, per: 1 },
                  "6/8": { n: 6, d: 8, L: "1/8", beats: 2, per: 3 }, "12/8": { n: 12, d: 8, L: "1/8", beats: 4, per: 3 } };
  function fail(why, reason){ return { ok: false, why: why, reason: reason }; }

  // the meter in an M: field: "C", "C|", "n/d"
  function meterOf(s){
    s = (s || "").trim(); var m;
    if (s === "C") return { n: 4, d: 4 }; if (s === "C|") return { n: 2, d: 2 };
    if ((m = /^(\d+)\s*\/\s*(\d+)/.exec(s))) return { n: parseInt(m[1], 10), d: parseInt(m[2], 10) };
    return null;
  }
  // beats of a meter, as the band counts them (6/8, 9/8, 12/8 count dotted quarters)
  function infoOf(n, d){ var comp = d === 8 && n >= 6 && n % 3 === 0; return { beats: comp ? n / 3 : n, per: comp ? 3 : 1 }; }
  // a rest's length in L units: z, z2, z3/2, z/, z//
  function dur(s){
    var m = /^(\d*)(\/*)(\d*)/.exec(s), num = m[1] ? parseInt(m[1], 10) : 1, den = 1;
    if (m[2]) den = m[3] ? parseInt(m[3], 10) : Math.pow(2, m[2].length);
    return { v: num / den, len: m[0].length };
  }

  // Split one line of music into tokens: { k: "bar" | "chord" | "rest" | "full" | "note" | "field" | "x", s: text, ... }
  function tokens(line){
    var out = [], i = 0, m;
    while (i < line.length){
      var c = line[i], rest = line.slice(i);
      if (c === "%"){ out.push({ k: "x", s: rest }); break; }                                   // a comment to the end of the line
      if (c === '"'){ var e = line.indexOf('"', i + 1); if (e < 0){ out.push({ k: "x", s: rest }); break; }
        var q = line.slice(i + 1, e).trim(), s = line.slice(i, e + 1);
        out.push(/^[A-G]/.test(q) || /^n\.?c\.?$/i.test(q) ? { k: "chord", s: s } : { k: "x", s: s }); i = e + 1; continue; }   // (the parser's rule: a chord starts A-G, or is N.C.)
      if ((m = /^\[[A-Za-z]:[^\]]*\]/.exec(rest))){ out.push({ k: "field", s: m[0] }); i += m[0].length; continue; }   // [M:6/8] [P:A] [K:G]
      if ((m = /^(?:\[\||\|\]|[:|\]]*\|[:|\]]*|::)\d*/.exec(rest)) && m[0]){ out.push({ k: "bar", s: m[0] }); i += m[0].length; continue; }   // | |] || |: :| :|: [| and an ending number glued on
      if ((m = /^\[\d[\d,\-]*/.exec(rest))){ out.push({ k: "x", s: m[0] }); i += m[0].length; continue; }              // [1 [2: an ending
      if ((m = /^[!+][^!+]*[!+]/.exec(rest))){ out.push({ k: "x", s: m[0] }); i += m[0].length; continue; }           // !fermata!
      if (c === "Z" || c === "X"){ m = /^[ZX]\d*/.exec(rest); out.push({ k: "full", s: m[0] }); i += m[0].length; continue; }   // a whole-bar rest, as it is in any meter
      if (c === "z" || c === "x"){ var d = dur(rest.slice(1)); out.push({ k: "rest", s: rest.slice(0, 1 + d.len), v: d.v }); i += 1 + d.len; continue; }
      if (/[A-Ga-g^_=\[]/.test(c)){ out.push({ k: "note", s: c }); i++; continue; }                 // anything that sounds a pitch
      if ((m = /^\s+/.exec(rest))){ out.push({ k: "x", s: m[0] }); i += m[0].length; continue; }
      out.push({ k: "x", s: c }); i++;                                                               // ( ) - . ~ \ ...: copied as they are
    }
    return out;
  }

  // read the tune: header lines, body lines (tokens for music lines), the meter and the unit length
  function read(abc){
    var lines = String(abc).split("\n"), k = -1, i;
    for (i = 0; i < lines.length; i++) if (/^K:/.test(lines[i].trim())){ k = i; break; }
    if (k < 0) return fail("key", "This chart has no K: line, so there is no way to tell where the music starts.");
    var mi = -1, li = -1, M = null, L = null;
    for (i = 0; i < k; i++){
      if (mi < 0 && /^M:/.test(lines[i])){ mi = i; M = meterOf(lines[i].slice(2)); }
      if (li < 0 && /^L:/.test(lines[i])){ li = i; var lm = /^L:\s*(\d+)\s*\/\s*(\d+)/.exec(lines[i]); if (lm) L = parseInt(lm[1], 10) / parseInt(lm[2], 10); }
    }
    if (mi >= 0 && !M) return fail("meter", "The M: line is not a time signature the band can change (" + lines[mi].trim() + ").");
    if (!M) M = { n: 4, d: 4 };
    if (L == null) L = (M.n / M.d) < 0.75 ? 1 / 16 : 1 / 8;
    var body = [], barNo = 0;
    for (i = k + 1; i < lines.length; i++){
      var t = lines[i].trim();
      if (/^M:/.test(t)) return fail("change", "This tune changes meter inside (a second M: line after bar " + barNo + "), so it has no single meter to change.");
      if (/^L:/.test(t)) return fail("change", "This tune changes its note length inside (an L: line after bar " + barNo + "), so the rests cannot be re-made safely.");
      if (!t || /^[A-Za-z]:/.test(t) || /^%/.test(t)){ body.push({ raw: lines[i] }); continue; }
      var toks = tokens(lines[i]), seg = false;
      for (var j = 0; j < toks.length; j++){
        var tk = toks[j];
        if (tk.k === "bar" ){ if (seg){ barNo++; seg = false; } }
        else if (tk.k === "field" && /^\[[ML]:/.test(tk.s)) return fail("change", "This tune changes meter inside (" + tk.s + " in bar " + (barNo + 1) + "), so it has no single meter to change.");
        else if (tk.k === "note") return fail("melody", "Bar " + (barNo + 1) + " has melody notes, and re-barring only works on chord symbols over rests.");
        else if (tk.k === "chord" || tk.k === "rest" || tk.k === "full") seg = true;
      }
      if (seg) barNo++;
      body.push({ raw: lines[i], toks: toks });
    }
    return { lines: lines, k: k, mi: mi, li: li, M: M, L: L, body: body };
  }

  function check(abc){
    var r = read(abc); if (!r.lines) return r;
    var inf = infoOf(r.M.n, r.M.d); return { ok: true, meter: r.M.n + "/" + r.M.d, beats: inf.beats };
  }

  // snap the share of the bar of each chord to distinct beats (N beats in a full bar, lim of them in use); null when they cannot be
  function place(shares, N, lim){
    var p = shares.map(function (f){ return Math.min(lim - 1, Math.max(0, Math.round(f * N))); }), i;
    for (i = 1; i < p.length; i++) if (p[i] <= p[i - 1]) p[i] = p[i - 1] + 1;
    if (p.length && p[p.length - 1] > lim - 1){ p[p.length - 1] = lim - 1; for (i = p.length - 2; i >= 0; i--) if (p[i] >= p[i + 1]) p[i] = p[i + 1] - 1; }
    if (p.length && p[0] < 0) return null;
    for (i = 0; i < p.length; i++) if (Math.abs(p[i] - shares[i] * N) > 1) return null;
    return p;
  }

  function rebar(abc, toId){
    var T = TARGETS[toId]; if (!T) return fail("target", "The band has no " + toId + " to write this in.");
    var r = read(abc); if (!r.lines) return r;
    var from = r.M.n + "/" + r.M.d, fi = infoOf(r.M.n, r.M.d), res = { ok: true, from: from, to: toId, fromBeats: fi.beats, toBeats: T.beats, same: false };
    if (from === toId){ res.abc = String(abc); res.same = true; return res; }
    var upb = (fi.per / r.M.d) / r.L, full = fi.beats * upb;                                   // L units in a beat, and in a bar, of the old meter
    var lines = r.lines.slice(), barNo = 0, err = null;
    r.body.forEach(function (ln, bi){
      if (err || !ln.toks) return;
      var out = [], seg = [];
      function flush(){
        if (err){ seg = []; return; }
        if (!seg.some(function (t){ return t.k === "chord" || t.k === "rest" || t.k === "full"; })){ seg.forEach(function (t){ out.push(t.s); }); seg = []; return; }
        barNo++;
        var ch = seg.filter(function (t){ return t.k === "chord"; }), total = 0, pos = 0, hasFull = seg.some(function (t){ return t.k === "full"; });
        seg.forEach(function (t){ if (t.k === "chord") t.at = pos; else if (t.k === "rest"){ total += t.v; pos += t.v; } });
        if (hasFull && !ch.length){ seg.forEach(function (t){ out.push(t.s); }); seg = []; return; }   // Z: a bar of rest in any meter
        if (total > full + 1e-6){ err = fail("long", "Bar " + barNo + " is longer than a bar of " + from + ", so its chords cannot be placed in " + toId + "."); return; }
        var short = total > 1e-6 && total < full - 1e-6, len = short ? Math.max(1, Math.min(T.beats, Math.round(total / full * T.beats))) : T.beats;
        var same34 = fi.per === 1 && T.per === 1 && (fi.beats === 3 || fi.beats === 4) && (T.beats === 3 || T.beats === 4);   // 3/4 <-> 4/4: a chord keeps its beat number
        var share = ch.map(function (t){ return same34 ? t.at / upb / T.beats : t.at / full; });                          // each chord's share of a full bar
        if (ch.length > len){ err = fail("crowd", "Bar " + barNo + " has " + ch.length + " chords, and " + toId + " has only " + len + " beat" + (len === 1 ? "" : "s") + " to put them on."); return; }
        var P = place(share, T.beats, len);
        if (!P){ err = fail("crowd", "Bar " + barNo + ": the chords " + ch.map(function (t){ return t.s.replace(/"/g, ""); }).join(" and ") + " cannot be given separate beats of " + toId + " near where they now sit."); return; }
        function rest(b){ var u = b * T.per; return "z" + (u > 1 ? u : ""); }
        var ci = 0, placed = false;
        seg.forEach(function (t){
          if (t.k === "rest" || t.k === "full"){
            if (!ch.length && !placed){ out.push(rest(len)); placed = true; }
            else if (ch.length && ci === 0 && P[0] > 0 && !placed){ out.push(rest(P[0])); placed = true; }      // (the rest that led up to the first chord)
            return; }
          out.push(t.s);
          if (t.k === "chord"){ var a = P[ci], b = ci + 1 < P.length ? P[ci + 1] : len;
            if (ci === 0 && a > 0 && !placed) out.splice(out.length - 1, 0, rest(a));                      // the first chord is not on the first beat: a rest before it
            out.push(rest(b - a)); ci++; }
        });
        seg = [];
      }
      ln.toks.forEach(function (t){ if (t.k === "bar"){ flush(); out.push(t.s); } else seg.push(t); });
      flush();
      if (!err) lines[r.k + 1 + bi] = out.join("");
    });
    if (err) return err;
    // the header: M: and L:
    var Mline = "M:" + toId, Lline = "L:" + T.L;
    if (r.li >= 0) lines[r.li] = Lline;
    if (r.mi >= 0){ lines[r.mi] = Mline; if (r.li < 0) lines.splice(r.mi + 1, 0, Lline); }
    else lines.splice(r.k, 0, Mline, Lline);
    res.abc = lines.join("\n");
    return res;
  }

  // ---- pace: the chords pass twice as fast, or half as fast, in the SAME meter (so the band's rhythm does not change) ----
  //   BandRebar.pace(abc, factor) -> { ok: true, abc, bars } or { ok: false, why, reason }.  factor 2 = twice as fast, 0.5 = half as fast.
  // Twice as fast: every two bars become one, each chord at half its distance into the pair, snapped to a beat as above (so two
  // bars of 3/4 give a chord on beat 1 and one on beat 3). Only bars with a plain bar line between them on the same line are joined;
  // a bar left over (an odd number before a repeat, an ending or the end of the line) is refused, since half a bar would break the meter.
  // Half as fast: every bar becomes two, each chord twice as far in, and a chord still sounding is written again at the top of the
  // second bar. A line of three or more bars is split in two so the chart keeps its rows. A chord written twice running inside one
  // bar is written once, which is what makes slower-then-faster come back to where it started.
  function fmt(u){ u = Math.round(u * 4) / 4; return "z" + (u === 1 ? "" : u % 1 === 0 ? u : (u * 2) % 1 === 0 ? (u * 2) + "/2" : (u * 4) + "/4"); }
  function isSpace(t){ return t.k === "x" && /^\s+$/.test(t.s); }
  function music(seg){ return seg.some(function (t){ return t.k === "chord" || t.k === "rest" || t.k === "full"; }); }
  // what a bar holds, with where each thing sits (in L units from `at`, times `mul`): [{ p, s, chord }], and the bar's length
  function events(seg, full, at, mul, out){
    var pos = 0;
    seg.forEach(function (t){
      if (t.k === "rest") pos += t.v; else if (t.k === "full") pos += full;
      else if (!isSpace(t)) out.push({ p: at + pos * mul, s: t.s, chord: t.k === "chord" }); });
    return pos * mul;
  }
  function write(ev, start, end){
    var o = "", cur = start, glued = false;                               // (glued: an annotation or decoration was just written, and belongs to what follows)
    ev.forEach(function (e){
      if (e.p > cur + 1e-6){ o += fmt(e.p - cur); cur = e.p; glued = false; }
      if (o && !glued) o += " ";
      o += e.s; glued = !e.chord; });
    return o + (end > cur + 1e-6 ? fmt(end - cur) : "");
  }
  function pace(abc, factor){
    var r = read(abc); if (!r.lines) return r;
    var inf = infoOf(r.M.n, r.M.d), name = r.M.n + "/" + r.M.d, upb = (inf.per / r.M.d) / r.L, full = inf.beats * upb;
    var lines = r.lines.slice(), barNo = 0, bars = 0, err = null, count = [];
    r.body.forEach(function (ln, bi){
      if (err || !ln.toks) return;
      var items = [], seg = [];                                           // the line as bar lines and what lies between them
      ln.toks.forEach(function (t){ if (t.k === "bar"){ items.push({ seg: seg }); items.push({ bar: t.s }); seg = []; } else seg.push(t); });
      items.push({ seg: seg });
      items.forEach(function (it){ if (it.seg){ it.raw = it.seg.map(function (t){ return t.s; }).join(""); it.mus = music(it.seg); it.pre = /^\s*/.exec(it.raw)[0]; it.post = it.mus ? /\s*$/.exec(it.raw)[0] : "";
        if (it.seg.some(function (t){ return t.k === "full" && t.s.length > 1; })) err = fail("rest", "This chart has a rest of several bars (" + it.raw.trim() + "), which cannot be re-paced."); } });
      if (err) return;
      var out = "", i, n = items.filter(function (it){ return it.mus; }).length, seen = 0, cut = factor < 1 && n >= 3 ? Math.ceil(n / 2) : 0;
      for (i = 0; i < items.length; i++){
        var it = items[i];
        if (it.bar){ out += it.bar; if (cut && seen === cut && i < items.length - 1){ out += "\n"; cut = 0; if (items[i + 1].seg) items[i + 1].pre = ""; } continue; }
        if (!it.mus){ out += it.raw; continue; }
        barNo++; seen++;
        var ev = [], len, k;
        if (factor < 1){                                                  // half as fast: this bar becomes two (or more, never fewer than one)
          len = events(it.seg, full, 0, 2, ev);
          var parts = [], c, last = null, nb = Math.max(1, Math.ceil(len / full - 1e-6));
          for (c = 0; c < nb; c++){
            var a = c * full, b = Math.min(len, a + full), mine = ev.filter(function (e){ return e.p >= a - 1e-6 && e.p < b - 1e-6; });
            if (c && last && !mine.some(function (e){ return e.chord && e.p < a + 1e-6; })) mine.unshift({ p: a, s: last, chord: true });   // the chord still sounding
            mine.forEach(function (e){ if (e.chord) last = e.s; });
            parts.push(write(mine, a, b));
          }
          bars += nb; out += it.pre + parts.join(" | ") + it.post;
          continue;
        }
        // twice as fast: this bar and the next one become one
        var j = i + 1; while (j < items.length && items[j].seg && !items[j].mus && !items[j].raw.trim()) j++;
        var plain = j < items.length && items[j].bar === "|", m = j + 1;
        while (plain && m < items.length && items[m].seg && !items[m].mus && !items[m].raw.trim()) m++;
        var nx = plain && m < items.length && items[m].mus ? items[m] : null;
        if (!nx){ err = fail("odd", "Bar " + barNo + " has no bar to pair with (an odd number of bars before a repeat, an ending or the end of the line), so the chords cannot go twice as fast there."); return; }
        len = events(it.seg, full, 0, 0.5, ev); len += events(nx.seg, full, len, 0.5, ev);
        var prev = null; ev = ev.filter(function (e){ if (!e.chord) return true; var dup = e.s === prev; prev = e.s; return !dup; });   // the same chord twice running: once
        var ch = ev.filter(function (e){ return e.chord; }), lim = Math.max(1, Math.min(inf.beats, Math.round(len / upb)));
        if (ch.length > lim){ err = fail("crowd", "Bars " + barNo + " and " + (barNo + 1) + " hold " + ch.length + " chords, and one bar of " + name + " has only " + lim + " beat" + (lim === 1 ? "" : "s") + " to put them on."); return; }
        var P = place(ch.map(function (e){ return e.p / full; }), inf.beats, lim);
        if (!P){ err = fail("crowd", "Bars " + barNo + " and " + (barNo + 1) + ": the chords " + ch.map(function (e){ return e.s.replace(/"/g, ""); }).join(" and ") + " cannot be given separate beats of one bar."); return; }
        // a chord moves to its beat, and whatever was written on it (a "^stop", a decoration) moves with it
        for (k = 0; k < ch.length; k++){ var was = ch[k].p, to = P[k] * upb; ev.forEach(function (e){ if (Math.abs(e.p - was) < 1e-6 && (e === ch[k] || !e.chord)) e.p = to; }); }
        ev.sort(function (x, y){ return x.p - y.p; });
        bars++; barNo++; out += it.pre + write(ev, 0, lim * upb) + nx.post;
        i = m;
      }
      if (!err){ lines[r.k + 1 + bi] = out; count[r.k + 1 + bi] = n / 2; }
    });
    if (err) return err;
    if (!bars) return fail("empty", "There are no bars of chords to change.");
    // twice as fast leaves half as many bars on a line: two short lines running become one, up to four bars, so the chart keeps its rows
    if (factor > 1) for (var q = r.k + 1; q < lines.length - 1; q++)
      if (count[q] && count[q + 1] && count[q] + count[q + 1] <= 4 && !/\\\s*$/.test(lines[q])){ lines[q] = lines[q].replace(/\s+$/, "") + " " + lines[q + 1].replace(/^\s+/, ""); lines.splice(q + 1, 1); count.splice(q + 1, 1); count[q] = 9; }
    return { ok: true, abc: lines.join("\n"), bars: bars };
  }


  global.BandRebar = { rebar: rebar, check: check, pace: pace, TARGETS: TARGETS };
  if (typeof module !== "undefined" && module.exports) module.exports = global.BandRebar;
})(typeof window !== "undefined" ? window : globalThis);
