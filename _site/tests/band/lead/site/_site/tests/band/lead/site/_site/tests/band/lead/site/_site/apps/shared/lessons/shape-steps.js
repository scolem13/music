// shape-steps.js — the chord-shape lessons (ShapeSteps): every <div class="sh-shapes"> on the page becomes a row of
// diagrams, one per voicing, each with a button that plays it, and a staff of all of them underneath.
//
//   <div class="sh-shapes" data-inst="guitar" data-shapes="C x32010; G 320003; C13 8-x-8-9-10-x"></div>
//        guitar: a chord symbol, then the frets low E to high e (six characters, or hyphenated when a fret has two digits)
//   <div class="sh-shapes" data-inst="piano" data-shapes="Dm7 = D3 / F4 A4 C5 E5; G7 = G2 B2 F3 / -"></div>
//        piano: a chord symbol, "=", the left hand's notes, "/", the right hand's ("-" for none); a note is a name and an octave, C4 = middle C
//   A symbol may carry a label after "|": "F/G | G9sus4" (the label is what the diagram shows; the symbol names the tones).
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
  function frets(s) { return (s.indexOf("-") >= 0 ? s.split("-") : s.split("")).map(function (f) { return f === "x" ? null : +f; }); }

  function parse(inst, text) {
    return text.split(";").map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) {
      var sym, body, label;
      if (inst === "piano") { var eq = t.split("="); sym = eq[0].trim(); body = eq[1].trim(); }
      else { var sp = t.lastIndexOf(" "); sym = t.slice(0, sp).trim(); body = t.slice(sp + 1); }
      var bar = sym.split("|"); sym = bar[0].trim(); label = (bar[1] || bar[0]).trim();
      var ch = chordOf(sym), out = { sym: sym, label: label, ch: ch };
      if (inst === "piano") {
        var hands = body.split("/");
        out.notes = [];
        ["L", "R"].forEach(function (h, i) {
          (hands[i] || "-").trim().split(/\s+/).forEach(function (n) { if (n && n !== "-") { var o = note(n); o.hand = h; out.notes.push(o); } });
        });
        out.midis = out.notes.map(function (n) { return n.midi; });
      } else {
        out.frets = frets(body);
        out.midis = []; out.frets.forEach(function (f, s) { if (f != null) out.midis.push(TUNING[s] + f); });
      }
      return out;
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
          return { midi: n.midi, text: pretty(toneName(sh.ch, n.midi)), root: mod12(n.midi - sh.ch.rootPc) === 0, hand: n.hand };
        }) };
      }), { onPlay: function (c, k) { play(inst, shapes[k]); } }));
      host.appendChild(board);
    }
    shapes.forEach(function (sh, k) {
      var card = inst === "piano" ? row : el("div", "sh-card");
      if (inst !== "piano") {
        var notes = [];
        sh.frets.forEach(function (f, s) { if (f != null) notes.push({ string: s, fret: f, text: pretty(toneName(sh.ch, TUNING[s] + f)), root: mod12(TUNING[s] + f - sh.ch.rootPc) === 0 }); });
        var used = sh.frets.filter(function (f) { return f; }), top = used.length ? Math.max.apply(null, used) : 3;
        var lo2 = top <= 4 ? 0 : Math.min.apply(null, used);
        card.appendChild(D.fretboard([{ label: sh.label, notes: notes }], { frets: [lo2, Math.max(lo2 + 3, top)], colors: [k], onPlay: function () { play(inst, sh); } }));
        card.appendChild(el("div", "sh-frets", sh.frets.map(function (f) { return f == null ? "x" : f; }).join(sh.frets.some(function (f) { return f > 9; }) ? "-" : "")));
      }
      var b = el("button", "btn btn-sm btn-outline-secondary sh-play", "▶ " + sh.label); b.type = "button";
      b.addEventListener("click", function () { play(inst, sh); });
      card.appendChild(b);
      if (card !== row) row.appendChild(card);
    });
    host.appendChild(row);
    var st = el("div", "sh-staff"); st.style.maxWidth = Math.min(44, 6 + shapes.length * 8) + "rem"; host.appendChild(st); staff(inst, shapes, st);
    var all = el("button", "btn btn-sm btn-outline-secondary sh-all", "▶ Play in order"); all.type = "button";
    all.addEventListener("click", function () { shapes.forEach(function (sh, i) { setTimeout(function () { play(inst, sh); }, i * 1400); }); });
    host.appendChild(all);
  }

  function init() { document.querySelectorAll(".sh-shapes").forEach(build); }
  global.ShapeSteps = { init: init, parse: parse };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
