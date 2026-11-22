// guitar-voice-picker.js — the Guitar Triad Picker (GuitarVoicePicker) of lessons/guitar-voice-leading.qmd.
//   <div class="gvp" data-prog="C F G C" data-set="top"></div>   triads only (C Am F#m Bdim Caug); set top = strings 3-2-1 (G B e), mid = 4-3-2 (D G B)
// Every close triad on three neighbouring strings: each inversion (Root / 1st / 2nd = the lowest string has the root / 3rd / 5th)
// at every position up to fret 15 (open strings allowed, fretted notes within 4 frets). The reader picks a shape under each chord,
// or presses "Smoothest" (the first chord kept; every later one the shape that moves the fingers least: the fewest frets in all,
// summed string by string, then the hand's position nearest the start) or "All root position" (the lowest-fret root-position shape).
// Under each change: notes kept (same string, same fret), strings that change, frets moved, how far the hand's position moves.
// One fretboard per chord, all showing the same frets, so a jump up the neck is seen. Sound: MusicAudio.noteAt "pluck", a strum.
// Needs diagrams.js and audio.js (lessons/_shape-kit.qmd loads both).
(function (global) {
  "use strict";
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var Q = { "": [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
  var SETS = { top: { open: [55, 59, 64], first: 3, names: ["G", "B", "e"] }, mid: { open: [50, 55, 59], first: 4, names: ["D", "G", "B"] } };
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"], INV = ["Root", "1st", "2nd"], TONE = { 0: "R", 3: "♭3", 4: "3", 6: "♭5", 7: "5", 8: "♯5" };
  var MAXF = 15;
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function parse(sym) {
    var m = /^([A-G])([#b]?)(m|dim|aug|)$/.exec(String(sym).trim()); if (!m) return null;
    return { sym: m[0], root: mod12(LET[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)), iv: Q[m[3]] };
  }
  // every close-position shape of ch on the set: [{ inv, frets:[low..high string], midis, pos }]
  function shapes(ch, set) {
    var S = SETS[set] || SETS.top, out = [];
    for (var k = 0; k < 3; k++) {
      var pcs = [0, 1, 2].map(function (i) { return mod12(ch.root + ch.iv[(k + i) % 3]); });
      for (var f0 = 0; f0 <= MAXF; f0++) {
        if (mod12(S.open[0] + f0) !== pcs[0]) continue;
        var fr = [f0], ms = [S.open[0] + f0], ok = true;
        for (var s = 1; s < 3 && ok; s++) {                 // the next tone up: the nearest above the last, on this string
          var m = ms[s - 1] + 1; while (mod12(m) !== pcs[s]) m++;
          var f = m - S.open[s]; if (f < 0) { f += 12; m += 12; } if (f > MAXF) ok = false; fr.push(f); ms.push(m);
        }
        if (!ok || ms[1] - ms[0] > 9 || ms[2] - ms[1] > 9) continue;
        var fretted = fr.filter(function (x) { return x > 0; });
        if (fretted.length && Math.max.apply(null, fretted) - Math.min.apply(null, fretted) > 3) continue;
        out.push({ inv: k, frets: fr, midis: ms, pos: fretted.length ? Math.min.apply(null, fretted) : 0 });
      }
    }
    return out.sort(function (a, b) { return a.pos - b.pos || a.inv - b.inv; });
  }
  function change(a, b) {
    var kept = 0, strings = 0, moved = 0;
    a.frets.forEach(function (f, i) { if (b.frets[i] === f) kept++; else { strings++; moved += Math.abs(b.frets[i] - f); } });
    return { kept: kept, strings: strings, moved: moved, pos: b.pos - a.pos };
  }
  function smoothest(cands, first) {               // cands[i] = shapes of chord i; returns an index per chord
    var n = cands.length, cost = [cands[0].map(function (_, j) { return j === first ? 0 : Infinity; })], from = [[]];
    for (var i = 1; i < n; i++) {
      cost[i] = []; from[i] = [];
      cands[i].forEach(function (b, j) {
        var best = Infinity, arg = 0;
        cands[i - 1].forEach(function (a, p) { var c = cost[i - 1][p] + change(a, b).moved; if (c < best) { best = c; arg = p; } });
        cost[i][j] = best; from[i][j] = arg;
      });
    }
    var start = cands[0][first].pos, last = 0, bc = Infinity;
    cands[n - 1].forEach(function (s, j) { var c = cost[n - 1][j] + Math.abs(s.pos - start) * 0.01; if (c < bc) { bc = c; last = j; } });
    var ks = [last]; for (i = n - 1; i > 0; i--) ks.unshift(from[i][ks[0]]);
    return ks;
  }
  function rootIdx(c) { for (var j = 0; j < c.length; j++) if (c[j].inv === 0) return j; return 0; }
  function tab(sh, set) { var t = ["x", "x", "x", "x", "x", "x"], lo = 6 - SETS[set].first; sh.frets.forEach(function (f, i) { t[lo + i] = String(f); }); return t.join(t.some(function (x) { return x.length > 1; }) ? "-" : ""); }

  function mount(host) {
    var chs = [], cands = [], pick = [], set = host.dataset.set === "mid" ? "mid" : "top";
    host.innerHTML = '<div class="gvp-top"><label>Chords <input class="gvp-in" type="text" spellcheck="false"></label>' +
      '<select class="gvp-pre"><option value="">Try one…</option><option>C F G C</option><option>C G Am F</option><option>G C D G</option>' +
      '<option>Am Dm E Am</option><option>D A Bm G</option><option>Em C G D</option></select>' +
      '<label>Strings <select class="gvp-set"><option value="top">3-2-1 (G B e)</option><option value="mid">4-3-2 (D G B)</option></select></label></div>' +
      '<div class="gvp-btns"><button data-a="smooth">Smoothest</button><button data-a="root">All root position</button><button data-a="play">▶ Play in order</button></div>' +
      '<div class="gvp-board"></div><p class="gvp-total"></p>';
    var q = function (c) { return host.querySelector(c); }, input = q(".gvp-in");
    q(".gvp-set").value = set;
    function load(text) {
      var list = text.split(/[\s,|]+/).filter(Boolean).map(parse);
      if (!list.length || list.some(function (x) { return !x; })) { q(".gvp-total").textContent = "Write triads like C Am F#m Bdim (major, m, dim, aug)."; q(".gvp-board").innerHTML = ""; return; }
      chs = list.slice(0, 8); cands = chs.map(function (c) { return shapes(c, set); });
      pick = cands.map(rootIdx); draw();
    }
    function draw() {
      var sel = chs.map(function (_, i) { return cands[i][pick[i]]; }), all = [];
      sel.forEach(function (s) { s.frets.forEach(function (f) { if (f > 0) all.push(f); }); });
      var lo = all.length ? Math.min.apply(null, all) : 1, hi = all.length ? Math.max.apply(null, all) : 4;
      var board = q(".gvp-board"); board.innerHTML = ""; var total = 0;
      var S = SETS[set], strings = ["E", "A", "D", "G", "B", "E"], base = 6 - S.first;
      chs.forEach(function (c, i) {
        var sh = sel[i], col = document.createElement("div"); col.className = "gvp-col";
        var notes = sh.frets.map(function (f, s) { var iv = mod12(sh.midis[s] - c.root); return { string: base + s, fret: f, text: TONE[iv] || "", root: iv === 0 }; });
        var label = c.sym + (sh.inv ? "/" + NAMES[mod12(sh.midis[0])] : "");
        col.appendChild(global.LessonDiagrams.fretboard([{ label: label, notes: notes }], { strings: strings, frets: [Math.max(1, lo), Math.max(hi, lo + 3)], onPlay: function () { hear(i); } }));
        var t = document.createElement("div"); t.className = "gvp-tab"; t.textContent = tab(sh, set); col.appendChild(t);
        var g = document.createElement("div"); g.className = "gvp-inv";
        cands[i].forEach(function (s2, j) {
          var b = document.createElement("button"); b.textContent = INV[s2.inv] + " · fr " + (s2.pos || "open"); if (j === pick[i]) b.className = "gvp-on";
          b.addEventListener("click", function () { pick[i] = j; draw(); hear(i); }); g.appendChild(b);
        });
        col.appendChild(g);
        if (i) {
          var d = change(sel[i - 1], sh); total += d.moved;
          var st = document.createElement("div"); st.className = "gvp-stat" + (d.moved <= 3 ? " gvp-good" : d.moved >= 8 ? " gvp-bad" : "");
          st.innerHTML = "from " + chs[i - 1].sym + ": <b>" + d.kept + "</b> kept · <b>" + d.strings + "</b> string" + (d.strings === 1 ? "" : "s") + " change · <b>" + d.moved + "</b> frets" +
            (d.pos ? " · hand " + (d.pos > 0 ? "up " : "down ") + Math.abs(d.pos) : " · hand stays");
          col.appendChild(st);
        }
        board.appendChild(col);
      });
      q(".gvp-total").innerHTML = chs.length > 1 ? "In all: <b>" + total + "</b> frets moved." : "";
      host.dataset.total = total;
    }
    function hear(i) {
      var A = global.MusicAudio; if (!A || !chs[i]) return;
      var t0 = A.ctx().currentTime + 0.03; cands[i][pick[i]].midis.forEach(function (m, k) { A.noteAt(m, t0 + k * 0.035, 1.6, 0.5, "pluck"); });
      var cols = host.querySelectorAll(".gvp-col"); [].forEach.call(cols, function (c, k) { c.classList.toggle("gvp-now", k === i); });
      setTimeout(function () { if (cols[i]) cols[i].classList.remove("gvp-now"); }, 1100);
    }
    input.addEventListener("change", function () { load(input.value); });
    q(".gvp-pre").addEventListener("change", function (e) { if (e.target.value) { input.value = e.target.value; load(input.value); } });
    q(".gvp-set").addEventListener("change", function (e) { set = e.target.value; load(input.value); });
    q(".gvp-btns").addEventListener("click", function (e) {
      var a = e.target.dataset && e.target.dataset.a; if (!a || !chs.length) return;
      if (a === "smooth") pick = smoothest(cands, pick[0]);
      if (a === "root") pick = cands.map(rootIdx);
      if (a === "play") { chs.forEach(function (_, i) { setTimeout(function () { hear(i); }, i * 1200); }); return; }
      draw();
    });
    input.value = host.dataset.prog || "C F G C"; load(input.value);
    host._gvp = { set: function (t) { input.value = t; load(t); }, smooth: function () { pick = smoothest(cands, pick[0]); draw(); return pick.map(function (j, i) { return tab(cands[i][j], set); }); },
      tabs: function () { return pick.map(function (j, i) { return tab(cands[i][j], set); }); } };
  }
  function init() { [].forEach.call(document.querySelectorAll(".gvp"), mount); }
  global.GuitarVoicePicker = { init: init, shapes: shapes, change: change, smoothest: smoothest, parse: parse, tab: tab };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
