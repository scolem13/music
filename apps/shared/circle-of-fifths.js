// CircleOfFifths: the circle of fifths as a component. One wheel, three rings (Roman numerals, note names, solfège / scale degrees /
// Sargam) and the key signature in the middle, with the key and the mode you can change by clicking it.
//
// Used by the Circle of Fifths page, by the Circle button in the navbar (practice-widgets.js), and by any page or lesson that asks for one:
//
//   <div class="cof-widget" data-rings="roman,notes,syllables" data-picker="key,mode" data-size="340" data-link="#bl-key"></div>
//
// or from script:  var c = CircleOfFifths.mount(element, { ...options });
//
// Options (all optional; the same names work as data-* attributes, lists as comma-separated words):
//   root        the key note, a pitch class 0-11 (default 0)            mode     0-7 or "major" | "dorian" | "phrygian" | "lydian" |
//                                                                        "mixolydian" | "minor" | "harmonic" | "locrian" (default major)
//   rings       which rings to draw, outermost first: "roman", "notes", "syllables"      (default all three)
//   keysig      the key signature in the middle (default true)
//   picker      menus above the wheel: "key", "mode", "sharps" (the key signature), "names" (solfège / degrees / Sargam)   (default none)
//   change      what a click on the wheel may change: "key", "mode" (default both; "" = a picture that cannot be changed)
//   characteristic  gold numerals for the chords that give a mode its sound (default true)
//   sound       a click on a Roman numeral plays that chord (default true)
//   undo        an Undo button that takes back the changes made on the wheel (default true when something can change)
//   size        the widest the wheel gets, in pixels (default: as wide as its box)
//   link        a <select> (selector or element) whose value is the key, a pitch class 0-11: it sets the wheel and the wheel sets it.
//               This is how the circle changes a lesson: the lessons' Key menu is such a select, and Undo puts the lesson back.
//   tonality    follow and change the key shared with the site's other tools (Tonality) (default false)
//   transpose   a function returning semitones, for pages that show a written key: the chord that sounds is moved by it
//   onChange    function (state, source)  source is "click", "picker", "undo", "link", "tonality" or "set"
//
// The wheel:  c.state() -> { root, mode, keyNote, doPc, restPc, label }     c.set({ root, mode }, source)     c.undo()     c.canUndo()
//             c.setKeySig(n)  n sharps (+) or flats (-)     c.keySig()     c.redraw()     c.destroy()     c.el
(function (global) {
  "use strict";
  if (global.CircleOfFifths) return;

  // ── The line of fifths, the modes, the ring names ─────────────────────────
  var CSS_SIZE = 490, CX = 245, CY = 245, R_OUT = 235;
  var FIFTHS_LETTER_CYCLE = [3, 0, 4, 1, 5, 2, 6], LETTERS = ["C", "D", "E", "F", "G", "A", "B"], LETTER_CHROMA = [0, 2, 4, 5, 7, 9, 11];
  var EXT_LINE = (function () {
    var line = [];
    for (var i = 0; i < 29; i++) {
      var li = FIFTHS_LETTER_CYCLE[i % 7], acc = Math.floor(i / 7) - 1;
      line.push({ chroma: (LETTER_CHROMA[li] + acc + 120) % 12, name: LETTERS[li] + ["𝄫", "♭", "", "♯", "𝄪"][acc + 2] });
    }
    return line;
  })();
  function buildSpellingMap(t) {
    var map = {};
    for (var i = t - 5; i <= t + 6; i++) { if (i < 0 || i >= EXT_LINE.length) continue; var e = EXT_LINE[i]; if (!(e.chroma in map)) map[e.chroma] = e.name; }
    return map;
  }
  var FIFTHS_TO_CHROMA = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  var FIFTHS_TO_EXT = [{ sharp: 8, flat: 8 }, { sharp: 9, flat: 9 }, { sharp: 10, flat: 10 }, { sharp: 11, flat: 11 }, { sharp: 12, flat: 12 }, { sharp: 13, flat: 1 },
    { sharp: 14, flat: 2 }, { sharp: 15, flat: 3 }, { sharp: 16, flat: 4 }, { sharp: 17, flat: 5 }, { sharp: 18, flat: 6 }, { sharp: 7, flat: 7 }];
  function hasTwoSpellings(i) { return FIFTHS_TO_EXT[i].sharp !== FIFTHS_TO_EXT[i].flat; }

  var MODES = [
    { name: "Major / Ionian", tonic: "do", fifthsOffset: 0, steps: [0, 2, 4, 5, 7, 9, 11], qualities: ["M", "m", "m", "M", "M", "m", "d"] },
    { name: "Dorian", tonic: "re", fifthsOffset: -2, steps: [0, 2, 3, 5, 7, 9, 10], qualities: ["m", "m", "M", "M", "m", "d", "M"] },
    { name: "Phrygian", tonic: "mi", fifthsOffset: -4, steps: [0, 1, 3, 5, 7, 8, 10], qualities: ["m", "M", "M", "m", "d", "M", "m"] },
    { name: "Lydian", tonic: "fa", fifthsOffset: 1, steps: [0, 2, 4, 6, 7, 9, 11], qualities: ["M", "M", "m", "d", "M", "m", "m"] },
    { name: "Mixolydian", tonic: "so", fifthsOffset: -1, steps: [0, 2, 4, 5, 7, 9, 10], qualities: ["M", "m", "d", "M", "m", "m", "M"] },
    { name: "Natural Minor", tonic: "la", fifthsOffset: -3, steps: [0, 2, 3, 5, 7, 8, 10], qualities: ["m", "d", "M", "m", "m", "M", "M"] },
    { name: "Harmonic Minor", tonic: "la", fifthsOffset: -3, steps: [0, 2, 3, 5, 7, 8, 11], qualities: ["m", "d", "aug", "m", "M", "M", "d"], harmonic: true },
    { name: "Locrian", tonic: "ti", fifthsOffset: -5, steps: [0, 1, 3, 5, 6, 8, 10], qualities: ["d", "M", "m", "m", "M", "M", "m"] }
  ];
  var MODE_IDS = { major: 0, ionian: 0, maj: 0, dorian: 1, dor: 1, phrygian: 2, phr: 2, lydian: 3, lyd: 3, mixolydian: 4, mix: 4, minor: 5, aeolian: 5, natural: 5, min: 5, m: 5, harmonic: 6, locrian: 7, loc: 7 };
  var MODE_WORD = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Minor", "Harmonic minor", "Locrian"];
  var OUR_MODE = { 0: "maj", 1: "dor", 2: "phr", 3: "lyd", 4: "mix", 5: "aeo", 6: "m", 7: "loc" };
  var C_MODE = { maj: 0, major: 0, ion: 0, ionian: 0, m: 6, min: 6, minor: 6, aeo: 5, aeolian: 5, dor: 1, dorian: 1, phr: 2, phrygian: 2, lyd: 3, lydian: 3, mix: 4, mixolydian: 4, loc: 7, locrian: 7 };
  var MODE_SOLFEGE = [["do", "re", "mi", "fa", "so", "la", "ti"], ["re", "mi", "fa", "so", "la", "ti", "do"], ["mi", "fa", "so", "la", "ti", "do", "re"],
    ["fa", "so", "la", "ti", "do", "re", "mi"], ["so", "la", "ti", "do", "re", "mi", "fa"], ["la", "ti", "do", "re", "mi", "fa", "so"],
    ["la", "ti", "do", "re", "mi", "fa", "si"], ["ti", "do", "re", "mi", "fa", "so", "la"]];
  var SYL_SEMI = { "do": 0, re: 2, mi: 4, fa: 5, so: 7, la: 9, ti: 11, si: 8 };
  var TONIC_GROUPS = { "do": [0], re: [1], mi: [2], fa: [3], so: [4], la: [6, 5], ti: [7] };
  var HARM_MIN_QUALITIES = ["m", "d", "aug", "m", "M", "M", "d"];
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  var CHARACTERISTIC = { 0: [0, 4, 3], 1: [0, 3, 6], 2: [0, 1, 6], 3: [0, 1, 4], 4: [0, 3, 6], 5: [0, 3, 6], 6: [0, 3, 4], 7: [0, 2, 6] };   // degrees (0-6) that give each mode its sound
  var KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var RING_BASE = { roman: 51, notes: 60, syllables: 68 };      // the thickness each ring has when all three are drawn
  var COLORS = {
    major: "#378ADD", minor: "#7F77DD", dim: "#D85A30", aug: "#B8960A", chromOuter: "#e0deda",
    diaNote: "#eaf3de", chromNote: "#f1efe8", rootNote: "#faeeda", diaSol: "#c0dd97", chromSol: "#e8e6e0", rootSol: "#FAC775",
    stroke: "rgba(0,0,0,0.12)", onColored: "#f0eeea", onAug: "#2a2000", charGold: "#FFD700",
    noteText: "#3B6D11", rootNoteText: "#BA7517", chromNoteText: "#888780", solText: "#0F6E56", rootSolText: "#854F0B",
    centerText: "#3d3d3a", centerBg: "#f8f6f0", centerWarn: "#cc2222", toggleHint: "#aaa8a0", canvasBg: "#f7f4ef"
  };
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function list(v, d) { if (v == null || v === "") return v === "" ? [] : d; return Array.isArray(v) ? v : String(v).split(/[\s,]+/).filter(Boolean); }
  function bool(v, d) { return v == null ? d : (v === true || v === "true" || v === "1" || v === ""); }
  function modeIndex(m) { if (typeof m === "number") return m >= 0 && m < 8 ? m : 0; var k = MODE_IDS[String(m || "major").toLowerCase()]; return k == null ? 0 : k; }

  var uid = 0, CSS_DONE = false;
  function css() {
    if (CSS_DONE || typeof document === "undefined") return; CSS_DONE = true;
    var s = document.createElement("style");
    s.textContent = [
      ".cof-w{display:block;max-width:100%;color:var(--site-ink,#1e1c18);font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
      ".cof-w *{box-sizing:border-box}",
      ".cof-bar{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:flex-end;margin:0 0 .5rem}",
      ".cof-f{display:flex;flex-direction:column;gap:.2rem}",
      ".cof-f label{font:600 .62rem/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--site-ink-2,#5c5246)}",
      ".cof-f select{height:2rem;padding:0 .4rem;border:1px solid var(--site-border,#e0d8ce);border-radius:7px;background:var(--site-surface,#fff);color:inherit;font:inherit;font-size:.85rem}",
      ".cof-cv{display:block;width:100%}",
      ".cof-cv canvas{display:block;width:100%;aspect-ratio:1/1;height:auto;cursor:pointer}",
      ".cof-w.cof-still .cof-cv canvas{cursor:default}",
      ".cof-foot{display:flex;align-items:center;gap:.6rem;margin:.4rem 0 0;min-height:2rem}",
      ".cof-foot button{height:2rem;padding:0 .8rem;border:1px solid var(--site-accent-dk,#2b9c90);border-radius:7px;background:var(--site-surface,#fff);color:var(--site-accent-text,#0a4f47);font:inherit;font-size:.85rem;font-weight:600;cursor:pointer}",
      ".cof-foot button:hover:not(:disabled){background:var(--site-accent-bg,rgba(63,194,180,.12))}",
      ".cof-foot button:disabled{opacity:.4;cursor:default}",
      ".cof-cap{font-size:.8rem;color:var(--site-ink-2,#5c5246)}"
    ].join("\n");
    document.head.appendChild(s);
  }

  // ── One wheel ─────────────────────────────────────────────────────────────
  function mount(host, o) {
    css();
    o = o || {};
    var id = "cof" + (++uid), srcId = id;
    var rings = list(o.rings, ["roman", "notes", "syllables"]).filter(function (r) { return RING_BASE[r]; });
    var showKeySig = bool(o.keysig, true);
    var picker = list(o.picker, []);
    var changeList = o.change === "" ? [] : list(o.change, ["key", "mode"]);
    var canKey = changeList.indexOf("key") >= 0, canMode = changeList.indexOf("mode") >= 0;
    var characteristic = bool(o.characteristic, true), sound = bool(o.sound, true);
    var wantUndo = bool(o.undo, canKey || canMode);
    var selectedRoot = FIFTHS_TO_CHROMA.indexOf(mod12(o.root == null ? 0 : +o.root)), selectedMode = modeIndex(o.mode);
    if (selectedRoot < 0) selectedRoot = 0;
    var toggleState = FIFTHS_TO_EXT.map(function (e, i) { return [8, 9, 10].indexOf(i) >= 0 ? 1 : 0; });
    var rootExtOverride = null, history = [], applying = false, cbs = o.onChange ? [o.onChange] : [];

    host.classList.add("cof-w"); if (!canKey && !canMode) host.classList.add("cof-still");
    if (o.size) host.style.maxWidth = (+o.size) + "px";
    host.innerHTML = "";
    var bar = document.createElement("div"); bar.className = "cof-bar"; bar.hidden = !picker.length;
    var cv = document.createElement("div"); cv.className = "cof-cv";
    var canvas = document.createElement("canvas"); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Circle of fifths"); cv.appendChild(canvas);
    var foot = document.createElement("div"); foot.className = "cof-foot"; foot.hidden = !wantUndo;
    var undoBtn = document.createElement("button"); undoBtn.type = "button"; undoBtn.textContent = "Undo"; undoBtn.disabled = true; undoBtn.title = "Take back the last change made on the circle";
    var cap = document.createElement("span"); cap.className = "cof-cap"; foot.appendChild(undoBtn); foot.appendChild(cap);
    host.appendChild(bar); host.appendChild(cv); host.appendChild(foot);
    var ctx = canvas.getContext("2d");

    // geometry: the rings that are drawn share the width between the middle and the rim, as the three do on the page
    var inner = showKeySig ? 52 : 24, gap = 2, geo = {};
    (function () {
      var n = rings.length; if (!n) return;
      var usable = R_OUT - inner - gap * (n - 1), sum = 0; rings.forEach(function (r) { sum += RING_BASE[r]; });
      var ro = R_OUT; rings.forEach(function (r) { var t = usable * RING_BASE[r] / sum; geo[r] = { o: ro, i: ro - t, t: t, k: Math.max(0.85, Math.min(1.35, t / RING_BASE[r])) }; ro -= t + gap; });
    })();

    // spelling
    function getRootExtIdx() {
      if (rootExtOverride && rootExtOverride.root === selectedRoot && rootExtOverride.mode === selectedMode) return rootExtOverride.ext;
      return toggleState[selectedRoot] === 0 ? FIFTHS_TO_EXT[selectedRoot].sharp : FIFTHS_TO_EXT[selectedRoot].flat;
    }
    function getParentMajorExtIdx() { return getRootExtIdx() + MODES[selectedMode].fifthsOffset; }
    function getSpellingMap() {
      var map = buildSpellingMap(getRootExtIdx()), p = getParentMajorExtIdx();
      for (var i = p - 1; i <= p + 5; i++) { var e = EXT_LINE[i]; if (e) map[e.chroma] = e.name; }
      return map;
    }
    function keySigValue() { return getParentMajorExtIdx() - 8; }
    function keySigLabel() { var ks = keySigValue(); return ks === 0 ? "♮" : ks > 0 ? ks + "♯" : Math.abs(ks) + "♭"; }
    function ringName(i) {
      if (i === selectedRoot) return EXT_LINE[getRootExtIdx()].name;
      return getSpellingMap()[FIFTHS_TO_CHROMA[i]] || EXT_LINE[FIFTHS_TO_EXT[i].sharp].name;
    }
    function lockSpelling(i) {
      var shown = getSpellingMap()[FIFTHS_TO_CHROMA[i]] || EXT_LINE[FIFTHS_TO_EXT[i].sharp].name;
      toggleState[i] = (hasTwoSpellings(i) && shown === EXT_LINE[FIFTHS_TO_EXT[i].flat].name) ? 1 : 0;
    }
    function syllable(syl) {
      if (!global.DegreeNames || global.DegreeNames.get() === "solfege") return syl;
      return global.DegreeNames.label(SYL_SEMI[syl], { doPc: 0, restPc: SYL_SEMI[MODES[selectedMode].tonic] });
    }
    function diatonicSet() { var rc = FIFTHS_TO_CHROMA[selectedRoot]; return MODES[selectedMode].steps.map(function (s) { return (rc + s) % 12; }); }
    function qualities() { return MODES[selectedMode].harmonic ? HARM_MIN_QUALITIES : MODES[selectedMode].qualities; }

    // drawing
    function sliceAngles(i) { var step = 2 * Math.PI / 12, off = -Math.PI / 2 - step / 2; return { start: off + i * step, end: off + (i + 1) * step, mid: off + (i + 0.5) * step }; }
    function sector(ro, ri, a0, a1, fill) {
      ctx.beginPath(); ctx.arc(CX, CY, ro, a0, a1); ctx.arc(CX, CY, ri, a1, a0, true); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = COLORS.stroke; ctx.lineWidth = 0.75; ctx.stroke();
    }
    function pt(r, a) { return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; }
    function text(txt, x, y, size, color, weight) {
      ctx.font = (weight || "400") + " " + size + 'px "Anthropic Sans",system-ui,sans-serif';
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (txt.indexOf("̂") < 0) { ctx.fillText(txt, x, y); return; }
      // a scale degree: the digit, and a plain ^ drawn over it (many fonts draw the combining mark crooked)
      var t = txt.replace(/̂/g, ""), w = ctx.measureText(t).width, dw = ctx.measureText(t.slice(-1)).width, dx = x + w / 2 - dw / 2;
      ctx.fillText(t, x, y);
      ctx.font = (weight || "400") + " " + size * 0.72 + 'px "Anthropic Sans",system-ui,sans-serif';
      ctx.fillText("^", dx, y - size * 0.52);
    }
    function draw() {
      if (rootExtOverride && (rootExtOverride.root !== selectedRoot || rootExtOverride.mode !== selectedMode)) rootExtOverride = null;
      var c = COLORS, W = CSS_SIZE;
      ctx.fillStyle = c.canvasBg; ctx.fillRect(0, 0, W, W);
      var dia = diatonicSet(), quals = qualities(), solSet = MODE_SOLFEGE[selectedMode], charSet = characteristic ? CHARACTERISTIC[selectedMode] : [];
      for (var i = 0; i < 12; i++) {
        var a = sliceAngles(i), noteC = FIFTHS_TO_CHROMA[i], isDia = dia.indexOf(noteC) >= 0, isRoot = i === selectedRoot, step = dia.indexOf(noteC);
        if (geo.roman) {
          var g = geo.roman, oFill = c.chromOuter, oTxt = c.onColored;
          if (isDia) { var q = quals[step]; if (q === "M") oFill = c.major; else if (q === "m") oFill = c.minor; else if (q === "aug") { oFill = c.aug; oTxt = c.onAug; } else oFill = c.dim; }
          sector(g.o, g.i, a.start, a.end, oFill);
          if (isDia) {
            var q2 = quals[step], base = ROMAN[step], lbl = q2 === "M" ? base : q2 === "m" ? base.toLowerCase() : q2 === "aug" ? base + "+" : base.toLowerCase() + "°";
            var isChar = charSet.indexOf(step) >= 0, p = pt((g.o + g.i) / 2, a.mid);
            text(lbl, p.x, p.y, (isChar ? 18 : 14) * g.k, isChar ? c.charGold : oTxt, "500");
          }
        }
        if (geo.notes) {
          var gn = geo.notes, nFill = isRoot ? c.rootNote : (isDia ? c.diaNote : c.chromNote);
          sector(gn.o, gn.i, a.start, a.end, nFill);
          var nCol = isRoot ? c.rootNoteText : (isDia ? c.noteText : c.chromNoteText), dn = ringName(i), pm = pt((gn.o + gn.i) / 2, a.mid);
          if (isRoot && hasTwoSpellings(i)) {
            var altIdx = toggleState[i] === 0 ? FIFTHS_TO_EXT[i].flat : FIFTHS_TO_EXT[i].sharp;
            text(dn, pm.x, pm.y - 5 * gn.k, 14 * gn.k, nCol, "500"); text(EXT_LINE[altIdx].name, pm.x, pm.y + 8 * gn.k, 9 * gn.k, c.toggleHint, "400");
          } else text(dn, pm.x, pm.y, (isRoot ? 14 : 13) * gn.k, nCol, isRoot ? "500" : "400");
        }
        if (geo.syllables) {
          var gs = geo.syllables, sFill = isRoot ? c.rootSol : (isDia ? c.diaSol : c.chromSol);
          sector(gs.o, gs.i, a.start, a.end, sFill);
          if (isDia) { var ps = pt((gs.o + gs.i) / 2, a.mid); text(syllable(solSet[step]), ps.x, ps.y, (isRoot ? 13 : 11) * gs.k, isRoot ? c.rootSolText : c.solText, isRoot ? "500" : "400"); }
        }
      }
      if (showKeySig) {
        ctx.beginPath(); ctx.arc(CX, CY, inner - 4, 0, 2 * Math.PI); ctx.fillStyle = c.centerBg; ctx.fill(); ctx.strokeStyle = c.stroke; ctx.lineWidth = 0.75; ctx.stroke();
        var ksl = keySigLabel(); text(ksl, CX, CY, ksl.length > 2 ? 13 : 16, Math.abs(keySigValue()) > 7 ? c.centerWarn : c.centerText, "500");
      }
    }
    function resize() {
      var displayed = canvas.getBoundingClientRect().width || canvas.clientWidth || CSS_SIZE, dpr = global.devicePixelRatio || 1;
      var vv = (global.visualViewport && global.visualViewport.scale) || 1, density = Math.min(dpr * vv, dpr * 4);
      var backing = Math.max(1, Math.round(displayed * density));
      if (canvas.width !== backing) { canvas.width = backing; canvas.height = backing; }
      ctx.setTransform(backing / CSS_SIZE, 0, 0, backing / CSS_SIZE, 0, 0); draw();
    }

    // state in, state out
    function snapshot() { return { root: selectedRoot, mode: selectedMode, toggles: toggleState.slice(), over: rootExtOverride ? { root: rootExtOverride.root, mode: rootExtOverride.mode, ext: rootExtOverride.ext } : null }; }
    function restore(s) { selectedRoot = s.root; selectedMode = s.mode; toggleState = s.toggles.slice(); rootExtOverride = s.over; }
    function state() {
      var rootPc = FIFTHS_TO_CHROMA[selectedRoot], doPc = mod12(rootPc + MODES[selectedMode].fifthsOffset * 7);
      return { root: rootPc, mode: selectedMode, modeId: OUR_MODE[selectedMode], keyNote: ringName(selectedRoot), doPc: doPc, restPc: rootPc,
               label: ringName(selectedRoot) + " " + MODE_WORD[selectedMode].toLowerCase(), keySig: keySigValue() };
    }
    function same(a, b) { return a.root === b.root && a.mode === b.mode; }
    function emit(source) {
      var st = state(); updateUi(st);
      cbs.slice().forEach(function (f) { try { f(st, source); } catch (e) {} });
    }
    // a change: `fn` makes it. Changes from the wheel and its menus can be undone; those that come from outside (a lesson's menu, another tool) cannot.
    function change(fn, source, record) {
      var before = snapshot(); fn();
      var after = snapshot();
      if (same(before, after) && JSON.stringify(before.toggles) === JSON.stringify(after.toggles) && JSON.stringify(before.over) === JSON.stringify(after.over)) { draw(); return false; }
      if (record) { history.push(before); if (history.length > 60) history.shift(); }
      draw(); emit(source); return true;
    }
    function set(s, source) {
      s = s || {}; source = source || "set";
      return change(function () {
        if (s.mode != null) selectedMode = modeIndex(s.mode);
        if (s.root != null) { var i = FIFTHS_TO_CHROMA.indexOf(mod12(+s.root)); if (i >= 0 && i !== selectedRoot) { lockSpelling(i); selectedRoot = i; } }
      }, source, source === "click" || source === "picker");
    }
    function setKeySig(ks, source) {
      return change(function () {
        var ext = ks + 8 - MODES[selectedMode].fifthsOffset, i = -1, t = 0;
        for (var k = 0; k < 12; k++) if (FIFTHS_TO_EXT[k].sharp === ext) { i = k; t = 0; break; }
        if (i < 0) for (k = 0; k < 12; k++) if (FIFTHS_TO_EXT[k].flat === ext) { i = k; t = 1; break; }
        if (i < 0) { i = FIFTHS_TO_CHROMA.indexOf(EXT_LINE[ext].chroma); rootExtOverride = { root: i, mode: selectedMode, ext: ext }; } else { rootExtOverride = null; toggleState[i] = t; }
        selectedRoot = i;
      }, source || "picker", true);
    }
    function undo() {
      if (!history.length) return false;
      var s = history.pop(); restore(s); draw(); emit("undo"); return true;
    }

    // the menus
    var ui = {};
    function field(key, label, sel) {
      var f = document.createElement("div"); f.className = "cof-f";
      var l = document.createElement("label"); l.textContent = label; l.setAttribute("for", id + "-" + key); sel.id = id + "-" + key;
      f.appendChild(l); f.appendChild(sel); bar.appendChild(f); ui[key] = sel; return sel;
    }
    function options(sel, items) { sel.innerHTML = ""; items.forEach(function (it) { var op = document.createElement("option"); op.value = it[0]; op.textContent = it[1]; sel.appendChild(op); }); }
    picker.forEach(function (key) {
      var sel = document.createElement("select");
      if (key === "key") {
        field("key", "Key", sel); options(sel, KEY_NAMES.map(function (n, i) { return [i, n]; }));
        sel.addEventListener("change", function () { set({ root: +sel.value }, "picker"); });
      } else if (key === "mode") {
        field("mode", "Mode", sel); options(sel, MODE_WORD.map(function (n, i) { return [i, n]; }));
        sel.addEventListener("change", function () { set({ mode: +sel.value }, "picker"); });
      } else if (key === "sharps") {
        field("sharps", "Sharps / flats", sel); var items = []; for (var ks = -7; ks <= 7; ks++) items.push([ks, ks === 0 ? "0 (♮)" : Math.abs(ks) + (ks > 0 ? "♯" : "♭")]);
        options(sel, items); sel.addEventListener("change", function () { setKeySig(+sel.value, "picker"); });
      } else if (key === "names" && global.DegreeNames) {
        field("names", "Note names", sel); global.DegreeNames.bind(sel);
      }
    });
    function updateUi(st) {
      if (ui.key) ui.key.value = String(st.root); if (ui.mode) ui.mode.value = String(st.mode);
      if (ui.sharps) ui.sharps.value = Math.abs(st.keySig) <= 7 ? String(st.keySig) : "";
      undoBtn.disabled = !history.length; cap.textContent = st.label;
      canvas.setAttribute("aria-label", "Circle of fifths: " + st.label + ", " + keySigLabel());
    }
    undoBtn.addEventListener("click", undo);

    // clicks: the notes ring changes the key, the syllables ring the mode, a Roman numeral plays its chord
    function ringAt(dist) { for (var r in geo) if (dist >= geo[r].i - gap / 2 && dist <= geo[r].o + gap / 2 && r) return r; return null; }
    canvas.addEventListener("click", function (e) {
      var rect = canvas.getBoundingClientRect(), sc = CSS_SIZE / rect.width, mx = (e.clientX - rect.left) * sc - CX, my = (e.clientY - rect.top) * sc - CY;
      var dist = Math.sqrt(mx * mx + my * my), ring = ringAt(dist); if (!ring) return;
      var ang = Math.atan2(my, mx) + Math.PI / 2 + Math.PI / 12; if (ang < 0) ang += 2 * Math.PI; if (ang >= 2 * Math.PI) ang -= 2 * Math.PI;
      var i = Math.floor(ang / (2 * Math.PI / 12)) % 12, dia = diatonicSet(), noteC = FIFTHS_TO_CHROMA[i], step = dia.indexOf(noteC);
      if (ring === "roman") { if (sound && step >= 0) playChord(noteC, step); return; }
      if (ring === "syllables") {
        if (!canMode || step < 0) return;
        change(function () { var grp = TONIC_GROUPS[MODE_SOLFEGE[selectedMode][step]]; if (!grp) return; var idx = grp.indexOf(selectedMode); selectedMode = idx === -1 ? grp[0] : grp[(idx + 1) % grp.length]; }, "click", true);
        return;
      }
      if (!canKey) return;                                          // the notes ring
      if (i === selectedRoot) {
        if (rootExtOverride) { rootExtOverride = null; draw(); emit("click"); return; }
        if (hasTwoSpellings(i)) { toggleState[i] = 1 - toggleState[i]; draw(); emit("click"); }
        return;
      }
      change(function () { lockSpelling(i); selectedRoot = i; }, "click", true);
    });
    function playChord(noteC, step) {
      var q = qualities()[step], iv = q === "m" ? [0, 3, 7] : q === "d" ? [0, 3, 6] : q === "aug" ? [0, 4, 8] : [0, 4, 7];
      var ts = typeof o.transpose === "function" ? (o.transpose() || 0) : 0, base = 60 + mod12(noteC - ts);
      var play = function () { if (global.MusicAudio) global.MusicAudio.chord(iv.map(function (x) { return base + x; }), 1.1); };
      if (global.MusicAudio) play(); else loadAudio(play);
    }

    // links: a <select> of the page (the lesson's Key menu) and the site's shared key
    var link = o.link ? (typeof o.link === "string" ? document.querySelector(o.link) : o.link) : null;
    if (link) {
      // the page may fill its menu after this runs (the lessons do), so look again once the page has loaded and when the wheel is first touched
      var syncLink = function () { if (link.value !== "" && !isNaN(+link.value) && +link.value !== state().root) set({ root: +link.value }, "link"); };
      syncLink(); global.addEventListener("load", syncLink); host.addEventListener("pointerenter", syncLink);
      link.addEventListener("change", function () { if (!applying) set({ root: +link.value }, "link"); });
      cbs.push(function (st, source) {
        if (source === "link" || +link.value === st.root) return;
        applying = true; link.value = String(st.root); link.dispatchEvent(new Event("change", { bubbles: true })); applying = false;
      });
    }
    if (bool(o.tonality, false) && global.Tonality) {
      var T = global.Tonality;
      var fromT = function (st) {
        if (!st || st.resting == null) return;
        var m = C_MODE[st.mode] != null ? C_MODE[st.mode] : 0; set({ root: st.resting, mode: m }, "tonality");
      };
      fromT({ resting: T.getResting(), mode: T.getMode() });
      cbs.push(function (st, source) { if (source !== "tonality") T.setAll(st.doPc, st.restPc, st.modeId, srcId); });
      T.onChange(function (st, src) { if (src !== srcId) fromT(st); });
    }
    if (global.DegreeNames) global.DegreeNames.onChange(function () { draw(); });

    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(cv);
    function zoom() { if (global.matchMedia) global.matchMedia("(resolution: " + global.devicePixelRatio + "dppx)").addEventListener("change", function () { resize(); zoom(); }, { once: true }); }
    zoom(); if (global.visualViewport) global.visualViewport.addEventListener("resize", resize);
    updateUi(state()); resize();

    var api = {
      el: host, canvas: canvas, state: state, set: set, setKeySig: function (n) { return setKeySig(n, "picker"); }, keySig: keySigValue, undo: undo, canUndo: function () { return history.length > 0; },
      redraw: draw, onChange: function (f) { cbs.push(f); }, geometry: function () { return JSON.parse(JSON.stringify(geo)); },
      destroy: function () { if (ro) ro.disconnect(); host.innerHTML = ""; host.classList.remove("cof-w", "cof-still"); }
    };
    return api;
  }

  function loadAudio(then) {
    var s = document.createElement("script"); s.src = "/apps/shared/audio.js?v=9"; s.onload = then; document.head.appendChild(s);
  }

  // <div class="cof-widget" data-...> in a page is mounted once the page has loaded
  function auto() {
    Array.prototype.forEach.call(document.querySelectorAll(".cof-widget:not([data-cof-done])"), function (el) {
      el.setAttribute("data-cof-done", "1"); var d = el.dataset;
      mount(el, { root: d.root, mode: d.mode, rings: d.rings, keysig: d.keysig, picker: d.picker, change: d.change, characteristic: d.characteristic, sound: d.sound,
                  undo: d.undo, size: d.size, link: d.link, tonality: d.tonality });
    });
  }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto(); }

  global.CircleOfFifths = { mount: mount, auto: auto, MODES: MODES };
})(window);
