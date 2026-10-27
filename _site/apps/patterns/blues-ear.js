// blues-ear.js — Blues Changes by Ear (practice/blues-ear.qmd). The Odd Progression Out game (prog-ear.js: its page, voicing,
// notation and sound) on the 12-bar blues: two clips play the same version of the blues in two band styles, the third changes ONE
// choice: a quick change, the bar-10 IV, a ii–V, a passing chord, a turnaround, a tritone substitute, the backdoor, Bird changes.
//
// A version of the blues is a set of CHOICES (CHOICES below: each a place in the form and its options, with words for each option).
// form(choices, minor) -> 12 bars, each [token] or [token, token] (half a bar each). Tokens are Roman numerals from the key's
// tonic; the dominant 7ths everywhere are the blues's own colour. Options and the bars they change:
//   b2      I | IV          bar 2: stay on I, or the quick change to IV
//   b4      I | iiV         bar 4: I7, or v7 I7 (a ii–V into IV)
//   b6      IV | dim        bar 6: IV7, or #iv°7 (a passing diminished chord)
//   b8      I | VI          bar 8: I7, or VI7 (V of ii)
//   b9_10   V-IV | V-V | ii-V | ii-back     bars 9–10: V7 IV7, V7 V7, ii7 V7, ii7 then iv7 bVII7 (the backdoor)
//   turn    I | V | VI | bIII               bars 11–12: I I, I V7, I VI7 | ii V, I bIII7 | bVI7 bII7 (the Tadd Dameron turnaround)
//   sub     none | tri      bII7 for the V7 that ends the turnaround (a tritone substitute)
//   subVI   no | yes        bVI7 for the turnaround's VI7
//   bird    no | yes        bars 1–10 as Charlie Parker's "Blues for Alice" changes (Imaj7, descending ii–V's); b2–b9_10 then do nothing
// Minor blues: i7 iv7, bars 9–10 bVI7 V7 or iiø7 V7, turnaround i | V7 | i bVI7 | iiø7 V7, with sub.
// LEVELS say which choices a version may make (base) and which one the odd clip may change (diff). A change that leaves the chords
// as they were (sub with no V7 in the turnaround) is not used. Colour: 7ths at levels 1–2, then 9, 13 (and 7b9, 7#9 on V) count as the same.
// The forms are the common jazz-blues reharmonisations as usually taught; this site has not yet checked each against a source
// (marked unverified on the page). Bird blues after "Blues for Alice" (Parker, 1951), from memory: unverified.
//
// Pure (Node: tests/blues-ear/blues-ear.test.js): BluesEar.form(ch, minor), .question(levelId, { minor, pool, key, tune }, rnd), .LEVELS, .MLEVELS, .CHOICES
(function (global) {
  "use strict";
  var P = global.ProgEar || (typeof require === "function" ? require("./prog-ear.js") : null);
  var R = P.ROMAN;
  [["I7", 0, 0], ["IV7", 5, 3], ["V7", 7, 4], ["II7", 2, 1], ["VI7", 9, 5], ["III7", 4, 2], ["bIII7", 3, 2], ["bVI7", 8, 5], ["bII7", 1, 1], ["bVII7", 10, 6]]
    .forEach(function (x) { R[x[0]] = { r: x[1], d: x[2], q: "A" }; });
  [["ii7", 2, 1], ["iii7", 4, 2], ["vi7", 9, 5], ["v7", 7, 4], ["iv7", 5, 3], ["biii7", 3, 2], ["i7", 0, 0]].forEach(function (x) { R[x[0]] = { r: x[1], d: x[2], q: "m" }; });
  R["viiø7"] = { r: 11, d: 6, q: "d" }; R["iiø7"] = { r: 2, d: 1, q: "d" }; R["Imaj7"] = { r: 0, d: 0, q: "M" }; R["#iv°7"] = R["#iv°7"] || { r: 6, d: 3, q: "o" };

  var CHOICES = {
    b2: { label: "Bar 2", opts: { I: "bar 2 stays on I7", IV: "a quick change to IV7 in bar 2" } },
    b4: { label: "Bar 4", opts: { I: "I7 all through bar 4", iiV: "a ii–V into IV in bar 4 (v7 I7)" } },
    b6: { label: "Bar 6", opts: { IV: "IV7 all through bar 6", dim: "a passing #iv°7 in bar 6" } },
    b8: { label: "Bar 8", opts: { I: "I7 in bar 8", VI: "VI7 in bar 8, leading to ii" } },
    b9_10: { label: "Bars 9–10", opts: { "V-IV": "V7 | IV7 in bars 9–10 (the blues way down)", "V-V": "V7 | V7 in bars 9–10", "ii-V": "ii7 | V7 in bars 9–10 (a jazz ii–V)", "ii-back": "ii7 | iv7 bVII7 in bars 9–10 (the backdoor)", "bVI-V": "bVI7 | V7 in bars 9–10", "iiø-V": "iiø7 | V7 in bars 9–10 (a minor ii–V)" } },
    turn: { label: "Turnaround", opts: { I: "no turnaround (I in bar 12)", V: "V7 in bar 12", VI: "I VI7 | ii V in bars 11–12", bIII: "I bIII7 | bVI7 bII7 in bars 11–12 (the Tadd Dameron turnaround)" } },
    sub: { label: "Last V7", opts: { none: "V7 at the end of the turnaround", tri: "bII7 in place of V7 at the end (a tritone substitute)" } },
    subVI: { label: "VI7", opts: { no: "VI7 in the turnaround", yes: "bVI7 in place of the turnaround's VI7 (a tritone substitute)" } },
    bird: { label: "Bars 1–10", opts: { no: "the blues's own bars 1–10", yes: "Bird changes in bars 1–10 (Imaj7, ii–V's stepping down)" } }
  };
  var MINOR_OPTS = { b2: { I: "bar 2 stays on i7", IV: "a quick change to iv7 in bar 2" },
    turn: { I: "no turnaround (i7 in bar 12)", V: "V7 in bar 12", VI: "i7 bVI7 | iiø7 V7 in bars 11–12" } };
  var DEFAULT = { b2: "I", b4: "I", b6: "IV", b8: "I", b9_10: "V-IV", turn: "I", sub: "none", subVI: "no", bird: "no" };

  function form(c, minor) {
    c = Object.assign({}, DEFAULT, minor ? { b9_10: "bVI-V" } : {}, c);
    var b;
    if (minor) {
      b = [["i7"], ["i7"], ["i7"], ["i7"], ["iv7"], ["iv7"], ["i7"], ["i7"], ["bVI7"], ["V7"], ["i7"], ["i7"]];
      if (c.b2 === "IV") b[1] = ["iv7"];
      if (c.b9_10 === "iiø-V") b[8] = ["iiø7"];
      if (c.turn === "V") b[11] = ["V7"];
      if (c.turn === "VI") { b[10] = ["i7", "bVI7"]; b[11] = ["iiø7", "V7"]; }
    } else {
      b = [["I7"], ["I7"], ["I7"], ["I7"], ["IV7"], ["IV7"], ["I7"], ["I7"], ["V7"], ["IV7"], ["I7"], ["I7"]];
      if (c.bird === "yes") {
        b = [["Imaj7"], ["viiø7", "III7"], ["vi7", "II7"], ["v7", "I7"], ["IV7"], ["iv7", "bVII7"], ["iii7", "VI7"], ["biii7", "bVI7"], ["ii7"], ["V7"], ["I7"], ["I7"]];
      } else {
        if (c.b2 === "IV") b[1] = ["IV7"];
        if (c.b4 === "iiV") b[3] = ["v7", "I7"];
        if (c.b6 === "dim") b[5] = ["#iv°7"];
        if (c.b8 === "VI") b[7] = ["VI7"];
        if (c.b9_10 === "V-V") b[9] = ["V7"];
        if (c.b9_10 === "ii-V") { b[8] = ["ii7"]; b[9] = ["V7"]; }
        if (c.b9_10 === "ii-back") { b[8] = ["ii7"]; b[9] = ["iv7", "bVII7"]; }
      }
      if (c.turn === "V") b[11] = ["V7"];
      if (c.turn === "VI") { b[10] = ["I7", "VI7"]; b[11] = ["ii7", "V7"]; }
      if (c.turn === "bIII") { b[10] = ["I7", "bIII7"]; b[11] = ["bVI7", "bII7"]; }
      if (c.subVI === "yes") b[10] = b[10].map(function (t) { return t === "VI7" ? "bVI7" : t; });
    }
    if (c.sub === "tri") b[11] = b[11].map(function (t) { return t === "V7" ? "bII7" : t; });
    return b;
  }
  function L(id, title, tier, base, diff, pool, note) { return { id: id, title: title, tier: tier, base: base, diff: diff, pool: pool, note: note }; }
  var LEVELS = [
    L("1", "The basic blues: bar 2 and bar 10", 0, { b2: ["I", "IV"], turn: ["I", "V"] }, { b2: ["I", "IV"], b9_10: ["V-IV", "V-V"] }, "blues",
      "Plain dominant 7ths. The odd one makes a different choice in bar 2 (the quick change to IV, or not) or bar 10 (IV or V)."),
    L("2", "Turnarounds", 0, { b2: ["I", "IV"], b9_10: ["V-IV", "V-V"] }, { turn: ["I", "V", "VI"], b9_10: ["V-IV", "V-V"] }, "blues",
      "Listen to the last two bars: I all the way, V7 in bar 12, or I VI7 | ii V. Or bar 10 again."),
    L("3", "The jazz ii–V in bars 9–10", 3, { b2: ["I", "IV"], turn: ["V", "VI"] }, { b9_10: ["V-IV", "ii-V"], turn: ["V", "VI"] }, "mix",
      "Ninths and thirteenths now count as the same chord. Bars 9–10 may be the blues's V7 | IV7 or the jazz ii7 | V7."),
    L("4", "Passing chords", 3, { b2: ["I", "IV"], b9_10: ["ii-V"], turn: ["VI"] }, { b4: ["I", "iiV"], b6: ["IV", "dim"], b8: ["I", "VI"] }, "jazz",
      "The jazz blues: the odd one adds or leaves out one passing chord: a ii–V into IV in bar 4, #iv°7 in bar 6, VI7 in bar 8."),
    L("5", "Tritone substitutes", 3, { b2: ["I", "IV"], b4: ["I", "iiV"], b6: ["IV", "dim"], b8: ["I", "VI"], b9_10: ["ii-V"], turn: ["V", "VI"] }, { sub: ["none", "tri"], subVI: ["no", "yes"] }, "jazz",
      "The odd one puts a dominant a tritone away in the turnaround: bII7 for V7, or bVI7 for VI7. The bass moves by semitone instead of by fifth."),
    L("6", "Turnaround and backdoor reharms", 3, { b2: ["I", "IV"], b4: ["I", "iiV"], b6: ["IV", "dim"], b8: ["I", "VI"], b9_10: ["ii-V"], turn: ["VI"] }, { turn: ["VI", "bIII"], b9_10: ["ii-V", "ii-back"], sub: ["none", "tri"] }, "jazz",
      "Bars 9–12: the backdoor (iv7 bVII7 back to I), the Tadd Dameron turnaround (I bIII7 | bVI7 bII7), or a tritone substitute."),
    L("7", "Bird blues", 3, { bird: ["yes"], turn: ["VI", "bIII"] }, { turn: ["VI", "bIII"], sub: ["none", "tri"], subVI: ["no", "yes"] }, "jazz",
      "Both versions use Bird changes in bars 1–10 (ii–V's stepping down). The odd one changes the turnaround."),
    L("8", "Anything", 3, { b2: ["I", "IV"], b4: ["I", "iiV"], b6: ["IV", "dim"], b8: ["I", "VI"], b9_10: ["V-IV", "ii-V"], turn: ["V", "VI"] },
      { b2: ["I", "IV"], b4: ["I", "iiV"], b6: ["IV", "dim"], b8: ["I", "VI"], b9_10: ["V-IV", "V-V", "ii-V", "ii-back"], turn: ["I", "V", "VI", "bIII"], sub: ["none", "tri"], subVI: ["no", "yes"], bird: ["no", "yes"] }, "all",
      "Any choice in any bar, in any style.")
  ];
  var MLEVELS = [
    L("m1", "Minor blues: bar 2 and the turnaround", 0, { b2: ["I", "IV"] }, { b2: ["I", "IV"], turn: ["I", "V"] }, "blues", "i7 and iv7. The odd one changes bar 2 (the quick change to iv7) or the last bar."),
    L("m2", "Minor blues: bars 9–10", 3, { b2: ["I", "IV"], turn: ["V", "VI"] }, { b9_10: ["bVI-V", "iiø-V"], turn: ["V", "VI"] }, "mix", "Bars 9–10 as bVI7 | V7 or iiø7 | V7; the turnaround i | V7 or i bVI7 | iiø7 V7."),
    L("m3", "Minor blues: substitutes", 3, { b2: ["I", "IV"], b9_10: ["bVI-V", "iiø-V"], turn: ["V", "VI"] }, { sub: ["none", "tri"], b9_10: ["bVI-V", "iiø-V"] }, "jazz", "A tritone substitute (bII7) for the last V7, or the other bars 9–10.")
  ];
  function level(id) { var all = LEVELS.concat(MLEVELS); for (var i = 0; i < all.length; i++) if (all[i].id === String(id)) return all[i]; return LEVELS[0]; }
  var POOLS = { blues: ["jump", "boogie", "rock", "swing", "doowop", "motown"], mix: ["jump", "swing", "boogie", "ballad", "rock", "boogaloo"],
    jazz: ["swing", "ballad", "jump", "bossa", "boogaloo", "stride"], all: ["jump", "boogie", "rock", "swing", "doowop", "motown", "ballad", "bossa", "boogaloo", "stride", "reggae"] };
  var COL = { A: [["7"], ["7", "9", "13"]], m: [["m7"], ["m7", "m9"]], d: [["m7b5"], ["m7b5"]], o: [["dim7"], ["dim7"]], M: [["maj7"], ["maj7", "6", "maj9"]] };
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function key(f) { return JSON.stringify(f); }
  function voice(f, k, lv, r) {
    var out = [];
    f.forEach(function (bar) { bar.forEach(function (tok) {
      var q = R[tok].q, l = COL[q][lv.tier >= 3 ? 1 : 0];
      if (lv.tier >= 3 && (tok === "V7" || tok === "VI7" || tok === "III7" || tok === "II7")) l = l.concat(lv.id === "4" || lv.id === "3" ? [] : ["7b9", "7#9"]);
      var c = P.chord(tok, k, pick(l, r), 0); c.beats = 4 / bar.length; out.push(c);
    }); });
    return out;
  }
  function differs(a, b) { var out = []; a.forEach(function (bar, i) { if (bar.join() !== b[i].join()) out.push(i); }); return out; }
  function barsText(ix) { return ix.length === 1 ? "Bar " + (ix[0] + 1) : "Bars " + ix.map(function (i) { return i + 1; }).join(", "); }

  function question(id, opts, r) {
    opts = opts || {}; r = r || Math.random;
    var lv = level(id), minor = lv.id[0] === "m";
    var keys = minor ? P.keysFor("minor") : P.keysFor("major").filter(function (k) { return ["C", "F", "Bb", "Eb", "G", "D", "A"].indexOf(k) >= 0; });
    var k = opts.key && keys.indexOf(opts.key) >= 0 ? opts.key : pick(keys, r);
    for (var tries = 0; tries < 80; tries++) {
      var ch = {}; Object.keys(lv.base).forEach(function (n) { ch[n] = pick(lv.base[n], r); });
      var names = shuffle(Object.keys(lv.diff), r), done = null;
      for (var j = 0; j < names.length && !done; j++) {
        var n = names[j], cur = ch[n] || (minor && n === "b9_10" ? "bVI-V" : DEFAULT[n]), others = shuffle(lv.diff[n].filter(function (v) { return v !== cur; }), r);
        for (var o = 0; o < others.length && !done; o++) {
          var ch2 = Object.assign({}, ch); ch2[n] = others[o];
          var f1 = form(ch, minor), f2 = form(ch2, minor), d = differs(f1, f2);
          var W = opts.window;      // bars the listener chose: the change must fall inside them
          if (W && !d.some(function (b) { return b >= W[0] - 1 && b <= W[1] - 1; })) continue;
          if (d.length) done = { name: n, from: cur, to: others[o], base: f1, odd: f2, bars: d };
        }
      }
      if (!done) continue;
      // which bars are heard: all 12, the phrase (1-4, 5-8, 9-12) holding the first change, any four bars holding a change, or the chosen ones
      var span = opts.bars || "phrase", from = 1, to = 12, d0 = done.bars[0];
      if (opts.window) { from = opts.window[0]; to = opts.window[1]; }
      else if (span === "phrase") { from = Math.floor(d0 / 4) * 4 + 1; to = from + 3; }
      else if (span === "random") { var lo = Math.max(1, d0 + 1 - 3), hi = Math.min(9, d0 + 1); from = lo + Math.floor(r() * (hi - lo + 1)); to = from + 3; }
      var poolName = opts.pool && opts.pool !== "level" ? opts.pool : lv.pool, styles = shuffle(POOLS[poolName] || POOLS.blues, r).slice(0, 3);
      var oddIndex = Math.floor(r() * 3), clips = [], si = 0, tune = null;
      if (opts.tune) tune = P.melody(voice(done.base, k, { tier: 0, id: "t" }, r), 1, 2, P.keyInfo(k), r);
      for (var c = 0; c < 3; c++) {
        var isOdd = c === oddIndex, f = isOdd ? done.odd : done.base;
        clips.push({ odd: isOdd, form: f, chords: voice(f, k, lv, r), style: styles[isOdd ? 2 : si], melody: tune || undefined });
        if (!isOdd) si++;
      }
      var cut = function (f) { return f.slice(from - 1, to); };
      clips.forEach(function (cl) {
        var t0 = (from - 1) * 4, t1 = to * 4, acc = 0;
        cl.chords = cl.chords.filter(function (c) { var at = acc; acc += c.beats; return at >= t0 - 1e-6 && at < t1 - 1e-6; });
        cl.form = cut(cl.form);
        if (tune) cl.melody = tune.filter(function (m) { return m.t >= t0 - 1e-6 && m.t < t1 - 1e-6; }).map(function (m) { return Object.assign({}, m, { t: m.t - t0, d: Math.min(m.d, t1 - m.t), tie: m.tie && m.t + m.d < t1 - 1e-6 }); });
      });
      if (tune) { var shared = clips[0].melody; clips.forEach(function (cl) { cl.melody = shared; }); }
      var C = { opts: Object.assign({}, CHOICES[done.name].opts, minor ? MINOR_OPTS[done.name] : {}) }, txt = (C.opts[done.to] || done.to);
      var show = function (f) { return f.map(function (bar) { return bar.join(" "); }); };
      return { blues: true, minor: minor, level: lv, key: k, keyLabel: P.keyInfo(k).label + " (" + (minor ? "minor" : "major") + " blues)", perBar: 1,
        base: show(cut(done.base)), odd: show(cut(done.odd)), bars: [from, to], join: " | ", at: done.bars[0], oddIndex: oddIndex, clips: clips, shared: !!tune, melodyMode: false,
        prompt: (to - from < 11 ? "Bars " + from + "–" + to + ". " : "") + (tune ? "The same tune over three blues choruses. Under two of them the changes are the same. Which is different?" : "Three choruses of the blues in three styles. Two use the same changes. Which is different?"),
        diff: { kind: done.name, text: barsText(done.bars) + ": the different one has " + txt + "; the other two have " + (C.opts[done.from] || done.from) + "." + (to - from < 11 ? " (You heard bars " + from + "–" + to + ".)" : "") } };
    }
    return null;
  }
  var api = { form: form, question: question, LEVELS: LEVELS, MLEVELS: MLEVELS, CHOICES: CHOICES, POOLS: POOLS, level: level };
  global.BluesEar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !P.mount) return;

  var ST = function () { return P._ST(); };
  P.mount("blues-ear", {
    store: "bluesEar.v1",
    defaults: { blues: "major", level: "1", mlevel: "m1", drums: "on", pool: "level", key: "random", tempo: 126, notation: "off", syms: "after", tune: "off", bars: "phrase", from: 1, to: 4, busy: "full", hist: {} },
    question: function (S) {
      var w = null;
      if (S.bars === "custom") { var a = Math.max(1, Math.min(12, +S.from || 1)), b = Math.max(1, Math.min(12, +S.to || 12)); w = [Math.min(a, b), Math.max(a, b)]; }
      return question(S.blues === "minor" ? S.mlevel : S.level, { pool: S.pool, tune: S.tune === "on", key: S.key === "random" ? null : S.key, bars: S.bars, window: w });
    },
    none: function (S) { return S.bars === "custom" ? "No change at this level falls in bars " + S.from + "–" + S.to + ". Choose other bars or another level." : "No question could be made with these settings."; },
    hk: function (S) { return S.blues === "minor" ? S.mlevel : S.level; },
    note: function (S) { return level(S.blues === "minor" ? S.mlevel : S.level).note; },
    controls: function (sel, G, rebuild) {
      var S = ST(), g = G.question, g2 = G.band;
      g.appendChild(sel("Blues", "blues", [["major", "Major (dominant) blues"], ["minor", "Minor blues"]], rebuild));
      if (S.blues === "minor") g.appendChild(sel("Level", "mlevel", MLEVELS.map(function (l) { return [l.id, l.id.slice(1) + " · " + l.title.replace(/^Minor blues: /, "")]; }), rebuild));
      else g.appendChild(sel("Level", "level", LEVELS.map(function (l) { return [l.id, l.id + " · " + l.title]; }), rebuild));
      g.appendChild(sel("Bars", "bars", [["phrase", "Four: the phrase with the change"], ["random", "Any four bars"], ["all", "All 12"], ["custom", "Bars I choose"]], rebuild));
      if (S.bars === "custom") {
        var lab = document.createElement("label"), sp = document.createElement("span"), row = document.createElement("span");
        sp.textContent = "From bar … to bar"; row.className = "pe-range"; lab.appendChild(sp); lab.appendChild(row);
        ["from", "to"].forEach(function (k, i) {
          var inp = document.createElement("input"); inp.type = "number"; inp.min = 1; inp.max = 12; inp.value = S[k]; inp.setAttribute("aria-label", i ? "to bar" : "from bar");
          inp.onchange = function () { var v = Math.max(1, Math.min(12, parseInt(inp.value, 10) || (i ? 12 : 1))); inp.value = v; S[k] = v; P._save(); };
          row.appendChild(inp); if (!i) row.appendChild(document.createTextNode(" – "));
        });
        g.appendChild(lab);
      }
      g2.appendChild(sel("A tune on top", "tune", [["off", "No: changes only"], ["on", "Yes: the same tune"]]));
      g2.appendChild(sel("Drums", "drums", [["on", "With drums"], ["off", "Without drums"]]));
      G.busy();
      g2.appendChild(sel("Styles", "pool", [["level", "As the level sets it"], ["blues", "Blues and rock"], ["jazz", "Jazz"], ["mix", "A mix"], ["all", "Any style"]]));
      var keys = S.blues === "minor" ? P.keysFor("minor") : ["C", "F", "Bb", "Eb", "G", "D", "A"];
      if (S.key !== "random" && keys.indexOf(S.key) < 0) S.key = "random";
      g.appendChild(sel("Key", "key", [["random", "Any key"]].concat(keys.map(function (k) { return [k, P.keyInfo(k).label]; }))));
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
