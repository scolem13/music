// shape-steps.js — the chord-shape lessons (ShapeSteps): every <div class="sh-shapes"> on the page becomes a row of
// diagrams, one per voicing, each with a button that plays it, and a staff of all of them underneath.
//
//   <div class="sh-shapes" data-inst="guitar" data-shapes="C x32010; G 320003; C13 8-x-8-9-10-x"></div>
//        guitar: a chord symbol, then the frets low E to high e (six characters, or hyphenated when a fret has two digits; x = silent, X = silent and drawn with an X mark)
//   <div class="sh-shapes" data-inst="piano" data-shapes="Dm7 = D3 / F4 A4 C5 E5; G7 = G2 B2 F3 / -"></div>
//        piano: a chord symbol, "=", the left hand's notes, "/", the right hand's ("-" for none); a note is a name and an octave, C4 = middle C.
//        A note may name its finger after ":" ("C4:1"); otherwise pianoFingers picks the usual one for the hand's shape (1 = thumb ... 5 = little).
//   A symbol may carry a label after "|": "F/G | G9sus4" (the label is what the diagram shows; the symbol names the tones).
//   Guitar frets may carry the fingers after "@": "F 133211@134211" (one digit a string, 1 = index ... 4 = little, 0 or x = none).
//   A finger that presses two or more strings at one fret is a barre. The barre is drawn only on a row with data-barre, or on
//   every row when the reader ticks "Show barres on every diagram".
//   <div class="sh-toggles"></div>   the page's switches: finger numbers in the dots instead of chord tones, and barres everywhere
//   (kept in localStorage).
//
// Dots carry the chord-tone numbers (R 3 5 b7 9 …) worked out from the symbol by ChordCatalog. A tone the symbol doesn't name
// is labelled by its interval above the root. Guitar is written an octave above where it sounds, as guitarists read it.
//
// Needs LessonDiagrams (diagrams.js), ChordCatalog (chord-catalog.js), MusicAudio (audio.js) and abcjs.
(function (global) {
  var D = global.LessonDiagrams, C = global.ChordCatalog;
  var TUNING = [40, 45, 50, 55, 59, 64];
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var IV = ["R", "b9", "9", "b3", "3", "11", "b5", "5", "#5", "6", "b7", "7"];
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function chordOf(sym) {
    var base = sym.split("/")[0], p = C && C.parseSymbol(base);
    if (!p) return { rootPc: LET[sym[0]] + (sym[1] === "#" ? 1 : sym[1] === "b" ? -1 : 0), map: {} };
    var map = {}, toks = p.quality.formula.split(/\s+/);
    p.quality.intervals.forEach(function (iv, i) { map[mod12(iv)] = toks[i] === "1" ? "R" : toks[i]; });
    return { rootPc: p.rootPc, map: map };
  }
  // A tone outside the formula: above a 7th chord a 6th is the 13th, and beside a major 3rd a ♭5 is the ♯11.
  function toneName(ch, midi) {
    var d = mod12(midi - ch.rootPc); if (ch.map[d]) return ch.map[d];
    if (d === 9 && (ch.map[10] || ch.map[11])) return "13";
    if (d === 6 && ch.map[4]) return "#11";
    return IV[d];
  }
  function pretty(s) { return s.replace(/b/g, "♭").replace(/#/g, "♯"); }

  // "F#4" -> { midi, name }
  function note(s) {
    var m = /^([A-G])([#b]*)(-?\d)$/.exec(s); if (!m) throw new Error("bad note " + s);
    var a = m[2] ? (m[2][0] === "#" ? m[2].length : -m[2].length) : 0;
    return { midi: (+m[3] + 1) * 12 + LET[m[1]] + a, letter: m[1], acc: a, oct: +m[3] };
  }
  function frets(s) { return (s.indexOf("-") >= 0 ? s.split("-") : s.split("")).map(function (f) { return f === "x" ? null : f === "X" ? -1 : +f; }); }   // "X" = a string drawn with an X mark (silent; used to point out a muted string)

  function parse(inst, text) {
    return text.split(";").map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) {
      var sym, body, label, out0 = null;
      if (inst === "piano") { var eq = t.split("="); sym = eq[0].trim(); body = eq[1].trim(); }
      else { var sp = t.lastIndexOf(" "); sym = t.slice(0, sp).trim(); body = t.slice(sp + 1); var at = body.split("@"); body = at[0]; if (at[1]) out0 = at[1].split("").map(function (c) { return /[1-4]/.test(c) ? +c : 0; }); }
      var bar = sym.split("|"); sym = bar[0].trim(); label = (bar[1] || bar[0]).trim();
      var ch = chordOf(sym), out = { sym: sym, label: label, ch: ch };
      if (inst === "piano") {
        var hands = body.split("/");
        out.notes = [];
        ["L", "R"].forEach(function (h, i) {
          (hands[i] || "-").trim().split(/\s+/).forEach(function (n) { if (n && n !== "-") { var fx = n.split(":"), o = note(fx[0]); o.hand = h; if (fx[1]) o.finger = +fx[1]; out.notes.push(o); } });
        });
        pianoFingers(out.notes);
        out.midis = out.notes.map(function (n) { return n.midi; });
      } else {
        out.frets = frets(body); out.fingers = out0;
        if (out0 && out0.length !== out.frets.length) throw new Error("fingers for " + sym + " need one digit a string");
        out.midis = []; out.frets.forEach(function (f, s) { if (f != null && f >= 0) out.midis.push(TUNING[s] + f); });
      }
      return out;
    });
  }

  // The usual fingering of one hand's notes, lowest first: the right hand from the thumb up, the left from the little finger up.
  // Two notes take the thumb and the finger that reaches. Three notes: 1-3-5 / 5-3-1, but a 4th or more in the gap that the middle
  // finger would cross takes 2 instead (right hand E-G-C is 1-2-5, left hand G-C-E is 5-2-1). A finger written in the chord (C4:1) wins.
  function pianoFingers(notes) {
    ["L", "R"].forEach(function (h) {
      var hs = notes.filter(function (n) { return n.hand === h; }).sort(function (a, b) { return a.midi - b.midi; }), n = hs.length, f;
      if (!n) return;
      var span = hs[n - 1].midi - hs[0].midi, low = n > 1 ? hs[1].midi - hs[0].midi : 0, high = n > 2 ? hs[2].midi - hs[1].midi : 0;
      if (h === "R") f = n === 1 ? [1] : n === 2 ? [1, span <= 4 ? 3 : span <= 7 ? 4 : 5] : n === 3 ? [1, high >= 5 ? 2 : 3, 5] : n === 4 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
      else f = n === 1 ? [5] : n === 2 ? [span <= 4 ? 3 : span <= 7 ? 4 : 5, 1] : n === 3 ? [5, low >= 5 ? 2 : 3, 1] : n === 4 ? [5, 3, 2, 1] : [5, 4, 3, 2, 1];
      hs.forEach(function (x, i) { if (!x.finger) x.finger = f[i]; });
    });
  }

  // ---- notation: spelled from the piano's note names, or from the chord for guitar ----
  var LETTERS = "CDEFGAB";
  function spellGuitar(sh, midi) {          // the letter that fits the tone's degree
    var t = toneName(sh.ch, midi), deg = t === "R" ? 1 : +/\d+/.exec(t)[0], rootL = sh.sym[0];
    var letter = LETTERS[(LETTERS.indexOf(rootL) + deg - 1) % 7], a = mod12(midi - LET[letter]); if (a > 6) a -= 12;
    if (Math.abs(a) > 2) { letter = null; }
    if (!letter) { var sharpNames = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"], n = sharpNames[mod12(midi)]; letter = n[0]; a = n[1] === "#" ? 1 : n[1] === "b" ? -1 : 0; }
    return { midi: midi, letter: letter, acc: a, oct: Math.floor((midi - a) / 12) - 1 };
  }
  function abcOf(n, up) {
    var oct = n.oct + (up ? 1 : 0), acc = n.acc > 0 ? new Array(n.acc + 1).join("^") : n.acc < 0 ? new Array(-n.acc + 1).join("_") : "";
    return acc + (oct >= 5 ? n.letter.toLowerCase() + new Array(oct - 4).join("'") : n.letter + new Array(Math.max(0, 4 - oct) + 1).join(","));
  }
  function staff(inst, shapes, host) {
    var head = "X:1\nL:1/4\nM:none\nK:C\n", abc;
    if (inst === "piano") {
      var rh = [], lh = [];
      shapes.forEach(function (sh) {
        var L = sh.notes.filter(function (n) { return n.hand === "L"; }), R = sh.notes.filter(function (n) { return n.hand === "R"; });
        rh.push('"' + sh.label + '"' + (R.length ? "[" + R.map(function (n) { return abcOf(n); }).join("") + "]4" : "z4"));
        lh.push(L.length ? "[" + L.map(function (n) { return abcOf(n); }).join("") + "]4" : "z4");
      });
      abc = head + "%%staves {RH LH}\nV:RH clef=treble\nV:LH clef=bass\n[V:RH] " + rh.join(" | ") + " |]\n[V:LH] " + lh.join(" | ") + " |]";
    } else {
      abc = head + "V:1 clef=treble\n" + shapes.map(function (sh) {
        return '"' + sh.label + '"[' + sh.midis.map(function (m) { return abcOf(spellGuitar(sh, m), true); }).join("") + "]4";
      }).join(" | ") + " |]";
    }
    if (global.ABCJS) global.ABCJS.renderAbc(host, abc, { responsive: "resize", staffwidth: Math.max(260, shapes.length * 120), paddingleft: 0, paddingright: 0 });
  }

  // a finger on two or more strings at the same fret: a barre, from the lowest of those strings to the highest
  function barresOf(sh) {
    var out = [], seen = {};
    if (!sh.fingers) return out;
    sh.fingers.forEach(function (fi, s) {
      if (!fi || seen[fi]) return; var f = sh.frets[s], on = [];
      sh.fingers.forEach(function (g, t) { if (g === fi && sh.frets[t] === f) on.push(t); });
      if (on.length > 1) { seen[fi] = 1; out.push({ fret: f, from: on[0], to: on[on.length - 1] }); }
    });
    return out;
  }
  var KEY = "shape-steps", prefs = { fingers: false, barres: false };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || "{}"); prefs.fingers = !!sv.fingers; prefs.barres = !!sv.barres; } catch (e) {}

  function play(inst, sh) {
    var A = global.MusicAudio; if (!A) return;
    if (inst === "piano") { A.chord(sh.midis, 1.8, 0.8, "piano"); return; }
    var t0 = A.ctx().currentTime + 0.03;        // a strum, low string first
    sh.midis.forEach(function (m, i) { A.noteAt(m, t0 + i * 0.035, 1.8, 0.5, "pluck"); });
  }

  function build(host) {
    var inst = host.getAttribute("data-inst") || "guitar", shapes;
    try { shapes = parse(inst, host.getAttribute("data-shapes")); } catch (e) { host.textContent = String(e.message); return; }
    var row = el("div", "sh-row");
    if (inst === "piano") {          // one keyboard, one lane per voicing, as on the other piano lessons
      var board = el("div", "sh-board");
      board.appendChild(D.keyboard(shapes.map(function (sh) {
        return { label: sh.label, notes: sh.notes.map(function (n) {
          return { midi: n.midi, text: prefs.fingers ? String(n.finger) : pretty(toneName(sh.ch, n.midi)), root: mod12(n.midi - sh.ch.rootPc) === 0, hand: n.hand };
        }) };
      }), { onPlay: function (c, k) { play(inst, shapes[k]); } }));
      host.appendChild(board);
    }
    shapes.forEach(function (sh, k) {
      var card = inst === "piano" ? row : el("div", "sh-card");
      if (inst !== "piano") {
        var notes = [];
        sh.frets.forEach(function (f, s) { if (f === -1) notes.push({ string: s, mute: true }); else if (f != null) notes.push({ string: s, fret: f, text: prefs.fingers && sh.fingers ? (f === 0 ? "0" : String(sh.fingers[s] || "")) : pretty(toneName(sh.ch, TUNING[s] + f)), root: mod12(TUNING[s] + f - sh.ch.rootPc) === 0 }); });
        var bars = prefs.barres || host.hasAttribute("data-barre") ? barresOf(sh) : [];
        var used = sh.frets.filter(function (f) { return f > 0; }), top = used.length ? Math.max.apply(null, used) : 3;
        var lo2 = top <= 4 ? 0 : Math.min.apply(null, used);
        card.appendChild(D.fretboard([{ label: sh.label, notes: notes }], { frets: [lo2, Math.max(lo2 + 3, top)], colors: [k], barres: bars, onPlay: function () { play(inst, sh); } }));
        card.appendChild(el("div", "sh-frets", sh.frets.map(function (f) { return f == null || f < 0 ? "x" : f; }).join(sh.frets.some(function (f) { return f > 9; }) ? "-" : "")));
      }
      var b = el("button", "btn btn-sm btn-outline-secondary sh-play", "▶ " + sh.label); b.type = "button";
      b.addEventListener("click", function () { play(inst, sh); });
      card.appendChild(b);
      if (card !== row) row.appendChild(card);
    });
    host.appendChild(row);
    var st = el("div", "sh-staff"); st.style.maxWidth = Math.min(44, 6 + shapes.length * 8) + "rem"; host.appendChild(st);
    var paper = el("div"); st.appendChild(paper); staff(inst, shapes, paper); // abcjs makes its target inline-block with a % padding: give it a block parent of its own width
    var all = el("button", "btn btn-sm btn-outline-secondary sh-all", "▶ Play in order"); all.type = "button";
    all.addEventListener("click", function () { shapes.forEach(function (sh, i) { setTimeout(function () { play(inst, sh); }, i * 1400); }); });
    host.appendChild(all);
  }

  function toggles(host) {
    host.innerHTML = "";
    var b = el("button", "btn btn-sm btn-outline-secondary sh-fing", ""); b.type = "button";
    function paint() { b.textContent = prefs.fingers ? "Show chord tones" : "Show finger numbers"; b.setAttribute("aria-pressed", String(prefs.fingers)); }
    b.addEventListener("click", function () { prefs.fingers = !prefs.fingers; paint(); redraw(); }); paint(); host.appendChild(b);
    var lab = el("label", "sh-bar-lbl"), cb = el("input"); cb.type = "checkbox"; cb.checked = prefs.barres;
    cb.addEventListener("change", function () { prefs.barres = cb.checked; redraw(); });
    lab.appendChild(cb); lab.appendChild(document.createTextNode(" Show barres on every diagram")); host.appendChild(lab);
  }
  function redraw() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    document.querySelectorAll(".sh-shapes").forEach(function (h) { h.innerHTML = ""; build(h); });
  }
  function init() { document.querySelectorAll(".sh-toggles").forEach(toggles); document.querySelectorAll(".sh-shapes").forEach(build); }
  global.ShapeSteps = { init: init, parse: parse };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
