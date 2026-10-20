// chorale.js — generated four-part chorale phrases for analysis exercises (Roman numerals, cadences, periods) and fill-in-the-voice.
// Needs SATB (apps/shared/satb.js) and VLCheck (vl-check.js). Every chorale is voiced by SATB.voice, then checked by VLCheck: one with
// an error (parallels, crossing, range, spacing, doubling, a missing root or 3rd) is thrown away and another made.
//
// A phrase is four bars of 4/4: bars 1–2 a beginning (I and a short motif), bar 3 the approach, bar 4 the cadence chord (a whole note).
// The motifs carry the chapter of Hutchinson's book that introduces them (7 Roman numerals, 8 seventh chords, 16 inversions and the
// cadential 6/4, 17 secondary dominants, 18 secondary diminished, 19 mixture, 20 the Neapolitan); a chorale uses motifs up to the
// highest chapter asked for, favouring the chapters asked for. Labels (cadences, period type) are read from the voiced result.
//   Chorale.make({ chapters: [7, 16, 17], mode: "major" | "minor" | "both", phrases: 1 | 2, period: "parallel" | "contrasting" | "none" | null })
//   -> { key, phrases: [{ chords: [...], cadence }], period, abc(opts), ... }
(function (global) {
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], MAJ = [0, 2, 4, 5, 7, 9, 11];
  var ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }, ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function pc(m) { return ((m % 12) + 12) % 12; }
  function npc(n) { return pc(NAT[n.l] + n.a); }
  function name(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function above(n, steps, semis) {
    var l = ((n.l + steps) % 7 + 7) % 7, a = pc(npc(n) + semis - NAT[l]); if (a > 6) a -= 12;
    return Math.abs(a) > 2 ? null : { l: l, a: a };
  }
  var KEYS = { major: ["C", "G", "F", "D", "B♭", "A", "E♭"], minor: ["A", "E", "D", "G", "C", "B", "F"] };
  var FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F♯": 6, F: -1, "B♭": -2, "E♭": -3, "A♭": -4 };
  function makeKey(mode) {
    var t = pick(KEYS[mode]), tonic = { l: LET.indexOf(t[0]), a: t[1] === "♭" ? -1 : t[1] === "♯" ? 1 : 0 };
    var fifths = FIFTHS[t] - (mode === "minor" ? 3 : 0), sig = [0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < Math.abs(fifths); i++) sig[(fifths > 0 ? [3, 0, 4, 1, 5, 2, 6] : [6, 2, 5, 1, 4, 0, 3])[i]] = fifths > 0 ? 1 : -1;
    return { tonic: tonic, mode: mode, sig: sig, abc: t.replace("♭", "b").replace("♯", "#") + (mode === "minor" ? "m" : ""), label: (mode === "minor" ? t.toLowerCase() : t) + " " + mode };
  }
  var QI = { M: [[2, 4], [4, 7]], m: [[2, 3], [4, 7]], d: [[2, 3], [4, 6]], dom7: [[2, 4], [4, 7], [6, 10]], m7: [[2, 3], [4, 7], [6, 10]], hd: [[2, 3], [4, 6], [6, 10]],
    d7: [[2, 3], [4, 6], [6, 9]], M7: [[2, 4], [4, 7], [6, 11]] };
  var QSYM = { M: "", m: "m", d: "dim", dom7: "7", m7: "m7", hd: "m7b5", d7: "dim7", M7: "maj7" };
  var DEGN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
  var FIGINV = { "": 0, "6": 1, "64": 2, "7": 0, "65": 1, "43": 2, "42": 3 };
  // a Roman numeral token in a key -> chord { rn, notes (root up), inv, bass, pcs, lt, seventh, fn, sym }
  function chord(key, tok) {
    if (tok === "N6") { var nr = above(key.tonic, 1, 1); return finish(key, tok, nr, "M", 1, "PD"); }
    var m = /^(♭)?(vii|vi|v|iv|iii|ii|i|VII|VI|V|IV|III|II|I)(°|ø)?(7|65|43|42|64|6)?(?:\/(.+))?$/.exec(tok); if (!m) throw new Error("token " + tok);
    var up = m[2] === m[2].toUpperCase(), deg = DEGN[m[2].toLowerCase()], fig = m[4] || "", sev = /^(7|65|43|42)$/.test(fig), q;
    if (sev) q = m[3] === "ø" ? "hd" : m[3] === "°" ? "d7" : up ? "dom7" : "m7"; else q = m[3] === "°" ? "d" : up ? "M" : "m";
    var root;
    if (m[5]) {
      var t = chord(key, m[5]).notes[0];
      root = deg === 5 ? above(t, 4, 7) : above(t, -1, -1);
      var c = finish(key, tok, root, q, FIGINV[fig], "D"); c.lt = npc(c.notes[1]); if (deg === 7) c.lt = npc(c.notes[0]); return c;
    }
    var alt = 0;
    if (m[1]) alt = -1;
    else if (key.mode === "minor" && (deg === 3 || deg === 6 || (deg === 7 && up))) alt = -1;
    root = above(key.tonic, deg - 1, MAJ[deg - 1] + alt);
    var fn = deg === 1 || deg === 6 || deg === 3 ? "T" : deg === 5 || deg === 7 ? "D" : "PD";
    var ch = finish(key, tok, root, q, FIGINV[fig], fn);
    if (deg === 5 && up || deg === 7 && !up) ch.lt = npc(above(key.tonic, 6, 11));
    return ch;
  }
  function finish(key, tok, root, q, inv, fn) {
    var notes = [root].concat(QI[q].map(function (iv) { return above(root, iv[0], iv[1]); }));
    var bass = notes[inv];
    return { rn: tok, notes: notes, inv: inv, bass: bass, pcs: notes.map(npc), lt: null, seventh: notes.length > 3 ? npc(notes[3]) : null, fn: fn,
      sym: name(root).replace("♭", "b").replace("♯", "#") + QSYM[q] + (inv ? "/" + name(bass).replace("♭", "b").replace("♯", "#") : "") };
  }

  // ---- the material, by chapter. Beginnings: what follows the opening tonic in bars 1–2 (two or three chords). Approaches: bar 3
  // (one or two chords) and the cadence chord, by cadence type.
  var BEGIN = {
    major: [["vi IV", 7], ["IV I", 7], ["V I", 7], ["vi ii", 7], ["iii vi", 7], ["vi IV I", 7], ["V7 I", 8], ["V7 vi", 8], ["V6 I", 16], ["V43 I6", 16],
      ["I6 IV", 16], ["vi I6", 16], ["vii°6 I", 16], ["V7/IV IV", 17], ["V7/vi vi", 17], ["V65/ii ii", 17], ["V65/vi vi", 17], ["vii°7/ii ii", 18], ["vii°65/vi vi", 18],
      ["iv I", 19], ["♭VI iv", 19]],
    minor: [["VI iv", 7], ["iv i", 7], ["V i", 7], ["III iv", 7], ["VI iv i", 7], ["V7 i", 8], ["V7 VI", 8], ["V6 i", 16], ["vii°6 i6", 16], ["i6 iv", 16],
      ["V7/iv iv", 17], ["V65/iv iv", 17], ["V7/VI VI", 17], ["vii°7/iv iv", 18], ["vii°65/iv iv", 18]]
  };
  var PD = { major: [["IV", 7], ["ii", 7], ["ii6", 16], ["ii7", 8], ["ii65", 16], ["V7/V", 17], ["V65/V", 17], ["vii°7/V", 18], ["iv", 19], ["ii°6", 19], ["iiø65", 19]],
    minor: [["iv", 7], ["ii°6", 16], ["iiø7", 8], ["iiø65", 16], ["iv6", 16], ["vii°7/V", 18], ["N6", 20]] };
  // endings: [bar 3 tokens ("PD" = an approach chord from PD), bar 4 token, chapter]
  var END = {
    major: { PAC: [["PD V", "I", 7], ["PD V7", "I", 8], ["I64 V", "I", 16], ["I64 V7", "I", 16]],
      IAC: [["PD V6", "I", 16], ["PD V65", "I", 16], ["PD vii°6", "I", 16], ["PD V", "I", 7], ["PD V7", "I", 8]],
      HC: [["PD PD", "V", 7], ["PD I64", "V", 16], ["PD V7/V", "V", 17], ["PD vii°7/V", "V", 18]],
      DC: [["PD V", "vi", 7], ["PD V7", "vi", 8], ["PD V7", "♭VI", 19]], PC: [["I IV", "I", 7], ["vi IV", "I", 7]] },
    minor: { PAC: [["PD V", "i", 7], ["PD V7", "i", 8], ["i64 V", "i", 16], ["i64 V7", "i", 16], ["PD V7", "I", 19]],
      IAC: [["PD V6", "i", 16], ["PD V65", "i", 16], ["PD vii°6", "i", 16], ["PD V", "i", 7]],
      HC: [["PD PD", "V", 7], ["PD i64", "V", 16], ["PD vii°7/V", "V", 18]], DC: [["PD V", "VI", 7], ["PD V7", "VI", 8]], PC: [["i iv", "i", 7], ["VI iv", "i", 7]] }
  };
  function choose(list, chs) {   // up to the highest chapter asked for; three times as likely when its own chapter was asked for
    var top = Math.max.apply(null, chs), ok = list.filter(function (x) { return x[x.length - 1] <= top; }), w = [];
    ok.forEach(function (x) { var k = chs.indexOf(x[x.length - 1]) >= 0 ? 3 : 1; for (var i = 0; i < k; i++) w.push(x); });
    return w.length ? pick(w) : null;
  }
  function phraseTokens(mode, chs, cad, begin) {
    var b = begin || ["I"].concat(choose(BEGIN[mode], chs)[0].split(" ")).map(function (t) { return mode === "minor" && t === "I" ? "i" : t; });
    var e = choose(END[mode][cad] || [], chs); if (!e) return null;
    var bar3 = e[0].split(" ").map(function (t) { return t === "PD" ? choose(PD[mode], chs)[0] : t; });
    if (bar3.length === 2 && bar3[0] === bar3[1]) return null;
    return { begin: b, toks: b.concat(bar3, [e[1]]), bars: [b.length - (b.length > 3 ? 2 : 1), b.length > 3 ? 2 : 1, bar3.length, 1] };
  }

  // ---- voicing, spelling, checking
  function voicePhrase(key, toks) {
    var chords = toks.map(function (t) { return chord(key, t); });
    var v = global.SATB.voice(chords.map(function (c) { return c.sym; }), npc(key.tonic));
    var out = [];
    for (var i = 0; i < chords.length; i++) {
      var x = v[i]; if (!x) return null;
      var ms = [x.s, x.a, x.t, x.b].map(function (m) {   // SATB's 7th of a °7 is a half-diminished one: move any stray note to the chord tone beside it
        if (chords[i].pcs.indexOf(pc(m)) >= 0) return m;
        return chords[i].pcs.indexOf(pc(m - 1)) >= 0 ? m - 1 : chords[i].pcs.indexOf(pc(m + 1)) >= 0 ? m + 1 : null;
      });
      if (ms.some(function (m) { return m == null; }) || pc(ms[3]) !== npc(chords[i].bass)) return null;
      chords[i].v = ms; out.push(chords[i]);
    }
    return out;
  }
  function spell(c, m) {   // the chord's own spelling of a midi note, with its octave
    var n = c.notes[c.pcs.indexOf(pc(m))]; return { l: n.l, a: n.a, o: Math.round((m - NAT[n.l] - n.a) / 12) - 1 };
  }
  function errors(chords) {
    return global.VLCheck.check(chords.map(function (c, i) { return { v: c.v, pcs: c.pcs, lt: c.lt, seventh: c.seventh }; })).filter(function (e) { return e.level === "error"; });
  }
  // the cadence, read from the last two chords as voiced (Hutchinson 7.4)
  function cadenceOf(chords, key) {
    var y = chords[chords.length - 1], x = chords[chords.length - 2], ton = npc(key.tonic);
    var dom = /^(V|vii)/.test(x.rn) && x.rn.indexOf("/") < 0, isI = /^(I|i)$/.test(y.rn);
    if (/^V$/.test(y.rn)) return "HC";
    if (dom && /^(vi|VI|♭VI)$/.test(y.rn)) return "DC";
    if (/^(IV|iv)$/.test(x.rn) && isI) return "PC";
    if (dom && isI) return /^V7?$/.test(x.rn) && pc(y.v[0]) === ton ? "PAC" : "IAC";
    return null;
  }
  var STRENGTH = { PAC: 3, IAC: 2, DC: 1, HC: 1, PC: 2 };

  function make(o) {   // a cadence that can't be made from these chapters (rare) gives way to another
    for (var k = 0; k < 4; k++) { var r = make1(o); if (r) return r; }
    return null;
  }
  function make1(o) {
    var chs = (o.chapters || [7]).filter(function (c) { return c >= 7; }); if (!chs.length) chs = [7];
    var mode0 = o.mode === "both" || !o.mode ? pick(["major", "minor"]) : o.mode, two = (o.phrases || 1) === 2;
    var per = two ? o.period || pick(["parallel", "contrasting", "none"]) : null;
    var cads = two ? (per === "none" ? ["PAC", "PAC"] : [pick(["HC", "IAC", "HC"]), "PAC"]) : [pick((o.cadences || ["PAC", "IAC", "HC", "DC", "PC"]))];
    for (var tries = 0; tries < 600; tries++) {
      var mode = mode0, key = makeKey(mode);
      var p1 = phraseTokens(mode, chs, cads[0]); if (!p1) continue;
      var p2 = two ? phraseTokens(mode, chs, cads[1], per === "contrasting" ? null : p1.begin) : null; if (two && !p2) continue;
      if (two && per === "contrasting" && p2.begin.join() === p1.begin.join()) continue;
      var ps = [p1].concat(p2 ? [p2] : []), voiced = ps.map(function (p) { return voicePhrase(key, p.toks); });
      if (voiced.some(function (v) { return !v; }) || errors([].concat.apply([], voiced)).length) continue;   // across the join too
      var got = voiced.map(function (v) { return cadenceOf(v, key); });
      if (got.some(function (c, i) { return c !== cads[i]; })) continue;
      var sop = function (v, n) { return v.slice(0, n).map(function (c) { return c.v[0]; }).join(); };
      var period = null;
      if (two) {
        var sameStart = sop(voiced[0], p1.begin.length) === sop(voiced[1], p1.begin.length);
        if (per === "parallel" && !sameStart) continue;
        if (per === "contrasting" && sop(voiced[0], 2) === sop(voiced[1], 2)) continue;
        period = STRENGTH[got[0]] < STRENGTH[got[1]] ? (sameStart ? "parallel" : "contrasting") : "none";
        if (period !== per) continue;
      }
      return build(key, ps.map(function (p, i) { return { chords: voiced[i], bars: p.bars, cadence: got[i] }; }), period, chs);
    }
    return null;
  }

  // ---- ABC: four voices on a grand staff (S A treble, T B bass), half notes; the cadence chord a whole note
  function build(key, phrases, period, chs) {
    var all = []; phrases.forEach(function (p) { p.chords.forEach(function (c, i) { all.push(c); }); });
    var res = { key: key, phrases: phrases, period: period, chapters: chs, chords: all };
    res.abc = function (opt) { return toAbc(res, opt || {}); };
    return res;
  }
  // opt.blank: { voice: 0–3, from: chord index, to: chord index (inclusive) } -> those notes hidden (invisible rests)
  // opt.fill: midi notes to draw in the blank instead; opt.labels: Roman numerals under the bass; opt.numbers: chord numbers above
  function toAbc(res, opt) {
    var key = res.key, lines = [[], [], [], []], idx = 0;
    res.phrases.forEach(function (p, pi) {
      var ci = 0;
      p.bars.forEach(function (n, bi) {
        var state = [{}, {}, {}, {}];
        for (var k = 0; k < n; k++) {
          var c = p.chords[ci], dur = bi === 3 ? 4 : n === 1 ? 4 : 2;
          for (var v = 0; v < 4; v++) {
            var blank = opt.blank && opt.blank.voice === v && idx >= opt.blank.from && idx <= opt.blank.to;
            var m = blank ? (opt.fill ? opt.fill[idx - opt.blank.from] : null) : c.v[v], pre = "";
            if (v === 0 && opt.numbers) pre += '"^' + (idx + 1) + '"';
            if (v === 3 && opt.labels) pre += '"_' + c.rn + '"';
            if (blank && m == null) { lines[v].push(pre + "x" + dur); continue; }
            var nn = blank && opt.fill ? spellAny(c, m, key) : spell(c, m), kk = nn.l + "," + nn.o;
            var cur = kk in state[v] ? state[v][kk] : key.sig[nn.l], acc = cur === nn.a ? "" : ACC_ABC[nn.a]; state[v][kk] = nn.a;
            var s = acc + (nn.o >= 5 ? LET[nn.l].toLowerCase() : LET[nn.l]); for (var j = 5; j < nn.o; j++) s += "'"; for (var q = 4; q > nn.o; q--) s += ",";
            lines[v].push(pre + s + dur);
          }
          ci++; idx++;
        }
        for (var w = 0; w < 4; w++) lines[w].push(bi === 3 ? (pi === res.phrases.length - 1 ? "|]" : "||") : "|");
      });
    });
    return "X:1\nM:4/4\nL:1/4\nQ:1/4=72\n%%score (S A) (T B)\nV:S clef=treble\nV:A clef=treble\nV:T clef=bass\nV:B clef=bass\nK:" + key.abc + "\n" +
      ["S", "A", "T", "B"].map(function (n, v) { return "[V:" + n + "] " + lines[v].join(" ") + "\n"; }).join("");
  }
  function spellAny(c, m, key) {   // a student's note: the chord's spelling if it is a chord tone, else the key's
    if (c.pcs.indexOf(pc(m)) >= 0) return spell(c, m);
    for (var l = 0; l < 7; l++) { var a = pc(m) - NAT[l]; if (a > 6) a -= 12; if (a < -6) a += 12; if (a === key.sig[l]) return { l: l, a: a, o: Math.round((m - NAT[l] - a) / 12) - 1 }; }
    for (var l2 = 0; l2 < 7; l2++) { var a2 = pc(m) - NAT[l2]; if (a2 > 6) a2 -= 12; if (Math.abs(a2) <= 1) return { l: l2, a: a2, o: Math.round((m - NAT[l2] - a2) / 12) - 1 }; }
  }
  // a typed Roman numeral -> normal form, for comparing with the chorale's (book figures: 6 64 7 65 43 42; ° ø; ♭VI; N6; X/Y)
  function normRN(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64")
      .replace(/dim/g, "°").replace(/o/g, "°").replace(/[hØ]/g, "ø").replace(/^b/, "♭").replace(/#/g, "♯").replace(/^bII6$|^♭II6$/, "N6");
    t = t.replace(/^([^\/]*?[^4\d])2(\/|$)/, "$142$2");   // V2 = V42
    return t;
  }
  function rnMatches(typed, c, next) {
    var a = normRN(typed); if (a === c.rn) return true;
    if (/^(I|i)64$/.test(c.rn) && next && /^V/.test(next.rn) && /^(cad64|Cad64|V64|V6453|V64-53)$/.test(a)) return true;   // the cadential 6/4 (16.3)
    return false;
  }
  global.Chorale = { make: make, chord: chord, makeKey: makeKey, normRN: normRN, rnMatches: rnMatches, cadenceOf: cadenceOf, spell: spell, spellAny: spellAny };
})(typeof window !== "undefined" ? window : globalThis);
