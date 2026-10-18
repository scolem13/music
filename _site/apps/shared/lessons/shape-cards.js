// shape-cards.js — chord shapes on a lesson page, drawn from the Chord Library's own engine (ChordCatalog) and linked to it.
//
//   <div class="sc-shapes" data-inst="guitar"   data-shapes="G:xx0003 D5:xx023x Em:022000"></div>
//   <div class="sc-shapes" data-inst="keyboard" data-shapes="G:55,59,62 D:57,62,66"></div>
//     guitar: frets lowest string first, x = not played (use "-" between frets when one is 10 or more: "x-10-12-12-x-x").
//     keyboard: MIDI notes, low to high.
//
// Each shape is looked up in ChordCatalog (the guitar shape must be one of ChordCatalog.fretted's voicings in standard tuning;
// a keyboard shape is described by ChordCatalog.describe), the dots are labelled with the library's chord-tone names, and a
// link opens the Chord Library on that chord with the shape picked out (#...&shape=). A shape the library does not have
// is drawn with a warning in the console, so a typo shows up in the tests.
// Needs chord-catalog.js (after voicings.js) and diagrams.js (LessonDiagrams). The Chord Library reads the shapes back
// through scripts/chord-taught.cjs, which records every diagram a lesson draws.
(function (global) {
  var GUITAR = [40, 45, 50, 55, 59, 64], LIB = "/tools/chord-library.html";
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pretty(s) { return String(s).replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯"); }
  function parseFrets(s) { return (/[-,]/.test(s) ? s.split(/[-,]/) : s.split("")).map(function (f) { return f === "x" ? null : +f; }); }
  function link(inst, sym, key) {
    var p = new URLSearchParams(); if (inst !== "guitar") p.set("instrument", inst);
    p.set("root", String(sym.rootPc)); p.set("quality", sym.quality.id); p.set("span", "5"); p.set("shape", key);
    var a = el("a", "sc-lib", "In the Chord Library"); a.href = LIB + "#" + p.toString(); return a;
  }
  function init() {
    var C = global.ChordCatalog, D = global.LessonDiagrams; if (!C || !D) return;
    Array.prototype.forEach.call(document.querySelectorAll(".sc-shapes"), function (host) {
      var inst = host.getAttribute("data-inst") || "guitar", items = host.getAttribute("data-shapes").trim().split(/\s+/).map(function (t) {
        var i = t.indexOf(":"), name = t.slice(0, i), sym = C.parseSymbol(name); return { name: name, sym: sym, spec: t.slice(i + 1) };
      });
      host.textContent = "";
      if (inst === "keyboard") {
        var lanes = [], links = el("p", "sc-links");
        items.forEach(function (it) {
          var midis = it.spec.split(",").map(Number), d = it.sym && C.describe(midis, it.sym.rootPc, it.sym.quality);
          if (!d) { console.warn("shape-cards: not a chord the library knows", it.name, it.spec); return; }
          lanes.push({ label: it.name, notes: midis.map(function (m, k) { return { midi: m, hand: "R", text: pretty(d.tones[k]), root: d.tones[k] === "1" }; }) });
          var span = el("span"); span.appendChild(document.createTextNode(it.name + ": " + midis.map(function (m) { return NAMES[m % 12]; }).join(" ") + " · "));
          span.appendChild(link("keyboard", it.sym, midis.join(","))); links.appendChild(span);
        });
        var card = el("div", "sc-card sc-wide"); card.appendChild(D.keyboard(lanes)); host.appendChild(card); host.appendChild(links); return;
      }
      items.forEach(function (it) {
        var frets = parseFrets(it.spec), key = frets.map(function (f) { return f == null ? "x" : f; }).join(frets.some(function (f) { return f > 9; }) ? "-" : "");
        var v = it.sym && C.fretted(it.sym.rootPc, it.sym.quality, { tuning: GUITAR, maxSpan: 5 }).filter(function (x) { return x.frets.join() === frets.join(); })[0];
        if (!v) console.warn("shape-cards: the Chord Library has no such shape", it.name, it.spec);
        var k = 0, notes = [];
        frets.forEach(function (f, s) { if (f == null) return; var t = v ? v.tones[k++] : ""; notes.push({ string: s, fret: f, text: pretty(t), root: t === "1" }); });
        var card = el("div", "sc-card"); card.appendChild(D.fretboard([{ label: it.name, notes: notes }], { strings: ["E", "A", "D", "G", "B", "E"] }));
        var cap = el("p", "sc-cap", key + " · "); if (it.sym) cap.appendChild(link("guitar", it.sym, key)); card.appendChild(cap);
        host.appendChild(card);
      });
    });
  }
  var css = ".sc-shapes{display:flex;flex-wrap:wrap;gap:.6rem;margin:.5rem 0 1rem}.sc-card{max-width:100%}.sc-card svg{width:190px;border:1px solid var(--site-border);border-radius:6px;display:block}" +
    ".sc-wide svg{width:auto;max-width:100%}.sc-cap{font-family:var(--font-mono);font-size:.75rem;margin:.2rem 0 0;color:var(--site-ink-2)}.sc-links{font-size:.85rem;display:flex;flex-direction:column;gap:.15rem;margin:.3rem 0 0;width:100%}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  global.ShapeCards = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
