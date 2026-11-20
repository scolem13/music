// inversion-picker.js — the Inversion Picker (InversionPicker) of lessons/inversions-voice-leading.qmd.
//   <div class="ip" data-prog="C F G C"></div>     a progression to start with (any triads or 7th chords: C Am F#m Bdim G7 Cmaj7 Dm7 Bm7b5)
// The reader picks Root / 1st / 2nd (/ 3rd for a 7th chord) under each chord, or presses "Smoothest" (the first chord kept,
// every later one the inversion that moves the hand least: the fewest half steps in all, then the lowest note nearest the start),
// or "All root position". Drawn on LessonDiagrams.keyboard, one lane per chord, the right hand around middle C (lowest note
// F3..E4), optionally a left-hand root below. Under each change: notes kept, fingers that move, half steps moved, how far the
// thumb moves. Finger numbers are the usual right-hand ones (1-3-5; 1-2-5 when the wide gap is on top), a rule of thumb.
// Sound: MusicAudio.chord. Needs diagrams.js and audio.js (lessons/_shape-kit.qmd loads both).
(function (global) {
  "use strict";
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var Q = [["maj7", [0, 4, 7, 11]], ["m7b5", [0, 3, 6, 10]], ["m7", [0, 3, 7, 10]], ["dim", [0, 3, 6]], ["aug", [0, 4, 8]], ["m", [0, 3, 7]], ["7", [0, 4, 7, 10]], ["", [0, 4, 7]]];
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"], INV = ["Root", "1st", "2nd", "3rd"];
  var TONE = { 0: "R", 3: "♭3", 4: "3", 6: "♭5", 7: "5", 8: "♯5", 10: "♭7", 11: "7" };
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function parse(sym) {
    var m = /^([A-G])([#b]?)(.*)$/.exec(sym.trim()); if (!m) return null;
    var q = Q.filter(function (x) { return x[0] === m[3]; })[0]; if (!q) return null;
    return { sym: sym.trim(), root: mod12(LET[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)), iv: q[1] };
  }
  // inversion k: the chord tones from the k-th up, the lowest placed F3..E4
  function voice(ch, k) {
    var pcs = ch.iv.slice(k).concat(ch.iv.slice(0, k).map(function (x) { return x + 12; })).map(function (x) { return x + ch.root; });
    var low = pcs[0], shift = 0; while (low + shift < 53) shift += 12; while (low + shift > 64) shift -= 12;
    var out = [], prev = -1; pcs.forEach(function (p) { var mm = p + shift; while (mm <= prev) mm += 12; out.push(mm); prev = mm; });
    return out;
  }
  function fingers(ms) {
    var n = ms.length; if (n === 3) return [1, ms[2] - ms[1] >= 5 ? 2 : 3, 5]; if (n === 4) return [1, 2, 3, 5];
    return ms.map(function (_, i) { return i + 1; });
  }
  function change(a, b) {          // a, b: midis low..high
    var kept = a.filter(function (x) { return b.indexOf(x) >= 0; }).length, moved = 0, fing = 0;
    if (a.length === b.length) a.forEach(function (x, i) { moved += Math.abs(b[i] - x); if (b[i] !== x) fing++; });
    else { b.forEach(function (y) { moved += Math.min.apply(null, a.map(function (x) { return Math.abs(x - y); })); }); fing = b.length - kept; }
    return { kept: kept, moved: moved, fingers: fing, thumb: b[0] - a[0] };
  }
  function smoothest(chs, first) {
    var best = null, bestCost = Infinity, ks = [first];
    (function rec(i, cost) {
      if (cost >= bestCost) return;
      if (i === chs.length) { var drift = Math.abs(voice(chs[i - 1], ks[i - 1])[0] - voice(chs[0], first)[0]) * 0.01; if (cost + drift < bestCost) { bestCost = cost + drift; best = ks.slice(); } return; }
      for (var k = 0; k < chs[i].iv.length; k++) { ks[i] = k; rec(i + 1, cost + change(voice(chs[i - 1], ks[i - 1]), voice(chs[i], k)).moved); }
    })(1, 0);
    return best || [first];
  }

  function mount(host) {
    var chs = [], inv = [], opt = { fingers: false, lh: false };
    host.innerHTML = '<div class="ip-top"><label>Chords <input class="ip-in" type="text" spellcheck="false"></label>' +
      '<select class="ip-pre"><option value="">Try one…</option><option>C F G C</option><option>C G Am F</option><option>Am Dm E Am</option>' +
      '<option>G C D G</option><option>F Bb C F</option><option>Dm7 G7 Cmaj7</option><option>C Am Dm G7 C</option></select></div>' +
      '<div class="ip-btns"><button data-a="smooth">Smoothest</button><button data-a="root">All root position</button>' +
      '<button data-a="play">▶ Play in order</button><label><input type="checkbox" class="ip-f"> Finger numbers</label>' +
      '<label><input type="checkbox" class="ip-lh"> Left hand plays the root</label></div>' +
      '<div class="ip-board"></div><div class="ip-picks"></div><p class="ip-total"></p>';
    var q = function (c) { return host.querySelector(c); }, input = q(".ip-in");
    function load(text) {
      var list = text.split(/[\s,|]+/).filter(Boolean).map(parse);
      if (!list.length || list.some(function (x) { return !x; })) { q(".ip-total").textContent = "Write chords like C Am F G7 (triads, 7, maj7, m7, m7b5, dim, aug)."; return; }
      chs = list.slice(0, 8); inv = chs.map(function () { return 0; }); draw();
    }
    function draw() {
      var vs = chs.map(function (c, i) { return voice(c, inv[i]); });
      var lanes = chs.map(function (c, i) {
        var f = fingers(vs[i]), notes = vs[i].map(function (mm, j) { return { midi: mm, text: opt.fingers ? String(f[j]) : TONE[mod12(mm - c.root)] || "", root: mod12(mm - c.root) === 0, hand: "R" }; });
        if (opt.lh) { var b = 36 + c.root; if (b > 47) b -= 12; notes.unshift({ midi: b, text: opt.fingers ? "5" : "R", root: true, hand: "L" }); }
        var slash = inv[i] ? "/" + NAMES[mod12(vs[i][0])] : "";
        return { label: c.sym + (opt.lh ? "" : slash), notes: notes };
      });
      var board = q(".ip-board"); board.innerHTML = "";
      board.appendChild(global.LessonDiagrams.keyboard(lanes, { onPlay: function (c, k) { hear(k); } }));
      var picks = q(".ip-picks"); picks.innerHTML = ""; var total = 0, kept = 0;
      chs.forEach(function (c, i) {
        var col = document.createElement("div"); col.className = "ip-col";
        col.innerHTML = "<b>" + c.sym + "</b>";
        var g = document.createElement("div"); g.className = "ip-inv";
        c.iv.forEach(function (_, k) { var b = document.createElement("button"); b.textContent = INV[k]; if (k === inv[i]) b.className = "ip-on";
          b.addEventListener("click", function () { inv[i] = k; draw(); hear(i); }); g.appendChild(b); });
        col.appendChild(g);
        if (i) {
          var d = change(vs[i - 1], vs[i]); total += d.moved; kept += d.kept;
          var s = document.createElement("div"); s.className = "ip-stat" + (d.moved <= 3 ? " ip-good" : d.moved >= 8 ? " ip-bad" : "");
          s.innerHTML = "from " + chs[i - 1].sym + ": <b>" + d.kept + "</b> kept · <b>" + d.fingers + "</b> finger" + (d.fingers === 1 ? "" : "s") + " move · <b>" + d.moved + "</b> half steps" +
            (d.thumb ? " · thumb " + (d.thumb > 0 ? "up " : "down ") + Math.abs(d.thumb) : " · thumb stays");
          col.appendChild(s);
        }
        picks.appendChild(col);
      });
      q(".ip-total").innerHTML = chs.length > 1 ? "In all: <b>" + total + "</b> half steps moved, <b>" + kept + "</b> notes kept." : "";
      host.dataset.total = total;
    }
    function hear(i) {
      var A = global.MusicAudio; if (!A || !chs[i]) return;
      var ms = voice(chs[i], inv[i]).slice(); if (opt.lh) { var b = 36 + chs[i].root; if (b > 47) b -= 12; ms.unshift(b); }
      A.chord(ms, 1.3, 0.75, "piano");
      var lanes = host.querySelectorAll(".ip-col"); [].forEach.call(lanes, function (c, k) { c.classList.toggle("ip-now", k === i); });
      setTimeout(function () { if (lanes[i]) lanes[i].classList.remove("ip-now"); }, 1100);
    }
    input.addEventListener("change", function () { load(input.value); });
    q(".ip-pre").addEventListener("change", function (e) { if (e.target.value) { input.value = e.target.value; load(input.value); } });
    q(".ip-f").addEventListener("change", function (e) { opt.fingers = e.target.checked; draw(); });
    q(".ip-lh").addEventListener("change", function (e) { opt.lh = e.target.checked; draw(); });
    q(".ip-btns").addEventListener("click", function (e) {
      var a = e.target.dataset && e.target.dataset.a; if (!a || !chs.length) return;
      if (a === "smooth") inv = smoothest(chs, inv[0]);
      if (a === "root") inv = chs.map(function () { return 0; });
      if (a === "play") { chs.forEach(function (_, i) { setTimeout(function () { hear(i); }, i * 1200); }); return; }
      draw();
    });
    input.value = host.dataset.prog || "C F G C"; load(input.value);
    host._ip = { set: function (t) { input.value = t; load(t); }, smooth: function () { inv = smoothest(chs, inv[0]); draw(); return inv.slice(); }, voice: voice };
  }
  function init() { [].forEach.call(document.querySelectorAll(".ip"), mount); }
  global.InversionPicker = { init: init, voice: voice, change: change, smoothest: smoothest, parse: parse };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
