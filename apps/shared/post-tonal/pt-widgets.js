// pt-widgets.js - the interactive parts of the post-tonal theory pages (theory/impressionism.qmd, set-theory.qmd, serialism.qmd,
// minimalism.qmd). Needs pcset.js (PCSet), forte-data.js, audio.js (MusicAudio, the shared Web Audio instrument, which registers with
// AudioTap) and abcjs on the page. A page puts <div class="pt" data-pt="NAME"></div> where a widget goes:
//   setcalc     clock face (click pitch classes) -> normal form, prime form, Forte name, interval vector, complement, Tn / TnI
//   setquiz     a random set; type its normal form / prime form / Forte name; checked by PCSet
//   setbrowser  the set classes of one size, a click loads one into setcalc ("pt-load" event on document)
//   matrix      enter a row (or take a preset / random one) -> the 12x12 matrix, play P I R RI, name a given series, row facts
//   collections a scale collection from any root: staff, play, a random "wash" of its notes, set class and number of transpositions
//   planing     parallel chords (real or diatonic) in several shapes on a few melodies, staff + play
//   polychord   two chords stacked, as notes and as a set class (Rite of Spring preset)
//   phasing     two copies of a pattern: stepped (Reich's way) or a steady drift, two rings of dots, a rotation table
//   additive    a pattern growing / shrinking (additive process) and ostinato layers entering one by one
// Sound: MusicAudio.noteAt (piano samples once loaded) for notes and the processes; generated ABC is played through AbcPlay (the band's
// samples, loaded on first use) as everywhere on the site. Nothing here is a recording: all the patterns are made up for the page.
(function (global) {
  "use strict";
  var P = global.PCSet, NS = "http://www.w3.org/2000/svg";
  var CSS = ".pt{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:.8rem 1rem;margin:1rem 0}.pt h4{margin:.1rem 0 .5rem;font-size:1.05rem}" +
    ".pt-row{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start}.pt-col{flex:1 1 15rem;min-width:0}.pt button,.pt select,.pt input[type=text]{font:inherit;padding:.15rem .5rem;border:1px solid rgba(128,128,128,.55);border-radius:6px;background:transparent;color:inherit}" +
    ".pt button{cursor:pointer}.pt button:hover{background:rgba(128,128,128,.15)}.pt button.on{background:rgba(42,111,219,.25)}.pt-ctl{display:flex;flex-wrap:wrap;gap:.4rem .7rem;align-items:center;margin:.4rem 0}" +
    ".pt table.pt-res{border-collapse:collapse;width:100%;font-size:.95rem}.pt-res td,.pt-res th{border-top:1px solid rgba(128,128,128,.25);padding:.2rem .4rem;text-align:left}.pt-res th{font-weight:600;white-space:nowrap;width:9rem}" +
    ".pt svg.pt-clock{width:100%;max-width:15rem;height:auto;display:block}.pt-clock .pt-pt{cursor:pointer}.pt-clock circle{fill:rgba(128,128,128,.08);stroke:rgba(128,128,128,.6)}.pt-clock .sel circle{fill:#2a6fdb;stroke:#2a6fdb}.pt-clock .sel text.n{fill:#fff}.pt-clock .lit circle{fill:#e8a317;stroke:#e8a317}" +
    ".pt-clock text{fill:currentColor;font-size:11px;text-anchor:middle;pointer-events:none}.pt-clock text.nm{font-size:8.5px;opacity:.55}.pt-clock polygon{fill:rgba(42,111,219,.15);stroke:#2a6fdb;stroke-width:1.5}" +
    ".pt-mat{border-collapse:collapse;font-variant-numeric:tabular-nums;text-align:center;margin:.4rem 0}.pt-mat td,.pt-mat th{width:2.1rem;height:1.9rem;padding:0;border:1px solid rgba(128,128,128,.3);font-size:.9rem;font-weight:400}.pt-mat th{cursor:pointer;opacity:.75;font-size:.78rem;border-color:transparent}.pt-mat th:hover{opacity:1;background:rgba(128,128,128,.15)}.pt-mat td.hi{background:rgba(42,111,219,.3)}.pt-mat td.lit{background:#e8a317;color:#000}.pt-mat-wrap{overflow-x:auto}" +
    ".pt-ring{display:inline-block;margin:.2rem .6rem}.pt-rot{font-family:ui-monospace,monospace;font-size:.9rem;line-height:1.35}.pt-rot .cur{background:rgba(42,111,219,.25)}.pt-rot span{display:inline-block;width:1.2rem;text-align:center}.pt-rot span.lit{background:#e8a317;color:#000;border-radius:3px}" +
    ".pt-msg{min-height:1.3rem;font-size:.92rem}.pt-bad{color:#c0392b}.pt-ok{color:#1e8449}.pt-staff{overflow-x:auto;max-width:100%}.pt-poly{display:inline-flex;flex-direction:column;text-align:center;font-size:1.1rem;font-weight:600;margin:0 .6rem}.pt-poly span+span{border-top:2px solid currentColor}" +
    "@media (prefers-color-scheme:dark){.pt-mat td.lit,.pt-rot span.lit{color:#000}}";
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function btn(label, fn, title) { var b = el("button", null, label); b.type = "button"; if (title) b.title = title; b.addEventListener("click", fn); return b; }
  function sel(options, value, fn) { var s = el("select"); options.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; s.appendChild(op); }); if (value != null) s.value = value; if (fn) s.addEventListener("change", fn); return s; }
  function label(text, ctl) { var l = el("label", "pt-lab"); l.style.display = "inline-flex"; l.style.gap = ".3rem"; l.style.alignItems = "center"; l.appendChild(document.createTextNode(text)); l.appendChild(ctl); return l; }
  function chk(text, checked, fn) { var i = el("input"); i.type = "checkbox"; i.checked = !!checked; i.addEventListener("change", fn); return label(text, i); }
  function range(min, max, step, value, fn) { var r = el("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = value; r.addEventListener("input", fn); return r; }
  function setStr(pcs, sep) { return P.str(pcs, sep); }
  var SH = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], FL = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  function nm(pc) { return SH[pc] === FL[pc] ? SH[pc] : SH[pc] + "/" + FL[pc]; }
  var P_NAME = function (pcs) { return "(" + setStr(pcs) + ")"; };

  // ---------- sound
  var timers = [], stopFns = [];
  function ac() { return global.MusicAudio ? global.MusicAudio.ctx() : null; }
  function tone(midi, when, dur, gain, voice) { if (global.MusicAudio) global.MusicAudio.noteAt(midi, when, dur, gain == null ? 0.7 : gain, voice); }
  function playSeq(midis, gap, dur, onNote, voice) {   // notes one after another
    var a = ac(); if (!a) return; var t = a.currentTime + 0.06;
    midis.forEach(function (m, i) { tone(m, t + i * gap, dur || gap * 1.5, 0.7, voice); if (onNote) timers.push(setTimeout(function () { onNote(i, m); }, 60 + i * gap * 1000)); });
  }
  function playChord(midis, dur, delay) { var a = ac(); if (!a) return; var t = a.currentTime + 0.06 + (delay || 0); midis.forEach(function (m) { tone(m, t, dur || 1.6, 0.5); }); }
  function stopAll() { timers.forEach(clearTimeout); timers = []; stopFns.slice().forEach(function (f) { f(); }); stopFns = []; if (global.MusicAudio && global.MusicAudio.stopAll) try { global.MusicAudio.stopAll(); } catch (e) {} if (global.AbcPlay) try { global.AbcPlay.stop(); } catch (e) {} }
  function pcMidi(pcs, base) { var out = [], prev = -1, b = base || 60; pcs.forEach(function (p) { var m = b + P.mod(p - b); if (m <= prev) m += 12; out.push(m); prev = m; }); return out; }

  // ---------- ABC staff with a play button (AbcPlay is loaded on first use)
  var playJs = null;
  function abcPlay() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return playJs || (playJs = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "/apps/shared/abc-play.js?v=27"; sc.onload = function () { res(global.AbcPlay); }; sc.onerror = function () { playJs = null; rej(); }; document.head.appendChild(sc);
    }));
  }
  function staff(host, abc, opts) {   // draws abc into host; returns { play(), stop() }
    opts = opts || {}; host.innerHTML = "";
    var box = el("div", "pt-staff"); host.appendChild(box);
    var vis = global.ABCJS ? global.ABCJS.renderAbc(box, abc, { responsive: "resize", add_classes: true, paddingtop: 4, paddingbottom: 4, staffwidth: opts.width || 520 })[0] : null;
    var h = null, b = null;
    function stop() { if (h) { try { h.stop(); } catch (e) {} h = null; } if (b) b.textContent = "▶ Play"; }
    function play() {
      if (h) { stop(); return; } if (!vis) return; b.textContent = "■ Stop";
      abcPlay().then(function (AP) { h = AP.play(vis, { sound: opts.sound || "piano", qpm: opts.qpm || 0, onEnd: function () { h = null; if (b) b.textContent = "▶ Play"; } }); }).catch(function () { b.textContent = "▶ Play"; });
    }
    b = btn("▶ Play", play); if (opts.button !== false) host.insertBefore(b, box);
    return { play: play, stop: stop };
  }

  // ---------- the clock face
  function clock(host, opts) {
    var s = svg("svg", { viewBox: "0 0 200 200", "class": "pt-clock", role: "img", "aria-label": "Pitch-class clock, C at the top" }), poly = svg("polygon", { points: "" }); s.appendChild(poly);
    var groups = [];
    for (var k = 0; k < 12; k++) {
      var a = (k * 30 - 90) * Math.PI / 180, x = 100 + 70 * Math.cos(a), y = 100 + 70 * Math.sin(a), g = svg("g", { "class": "pt-pt", tabindex: opts.readonly ? "-1" : "0", role: "button", "aria-label": "pitch class " + k + ", " + nm(k) });
      g.appendChild(svg("circle", { cx: x, cy: y, r: 12 })); var t = svg("text", { x: x, y: y + 4, "class": "n" }); t.textContent = k === 10 ? "T" : k === 11 ? "E" : k; g.appendChild(t);
      var nx = 100 + 91 * Math.cos(a), ny = 100 + 91 * Math.sin(a), tn = svg("text", { x: nx, y: ny + 3, "class": "nm" }); tn.textContent = SH[k].length > 1 ? SH[k][0] + "♯" : SH[k]; if (SH[k].length > 1) tn.textContent = SH[k]; g.appendChild(tn);
      (function (kk) { if (!opts.readonly) { g.addEventListener("click", function () { opts.onToggle(kk); }); g.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); opts.onToggle(kk); } }); } })(k);
      s.appendChild(g); groups.push({ g: g, x: x, y: y });
    }
    host.appendChild(s);
    return {
      svg: s, set: function (pcs, order) {
        groups.forEach(function (o, k) { o.g.setAttribute("class", "pt-pt" + (pcs.indexOf(k) >= 0 ? " sel" : "")); });
        var seq = (order || P.uniq(pcs)).filter(function (p) { return pcs.indexOf(p) >= 0; });
        poly.setAttribute("points", seq.length > 1 ? seq.map(function (p) { return groups[p].x + "," + groups[p].y; }).join(" ") : "");
      }, light: function (k, on) { groups[k].g.classList[on ? "add" : "remove"]("lit"); }
    };
  }

  // ---------- set calculator
  var PRESETS = [["", "Presets..."], ["0 4 7", "major triad"], ["0 3 7", "minor triad"], ["0 3 6 9", "diminished seventh"], ["0 4 7 10", "dominant seventh"], ["0 2 4 7 9", "major pentatonic"], ["0 2 4 6 8 10", "whole-tone scale"],
    ["0 2 4 5 7 9 11", "major scale"], ["0 1 3 4 6 7 9 10", "octatonic scale"], ["0 1 4 6", "4-Z15 (the 'all-interval' tetrachord)"], ["0 1 3 7", "4-Z29 (its Z-mate)"], ["0 1 6", "Viennese trichord (0,1,6)"], ["0 5 10 3", "quartal tetrachord (stacked fourths)"]];
  function setcalc(root) {
    root.innerHTML = ""; var pcs = (root.getAttribute("data-set") ? P.parse(root.getAttribute("data-set")) : [0, 4, 7]);
    var row = el("div", "pt-row"), left = el("div", "pt-col"), right = el("div", "pt-col"); row.appendChild(left); row.appendChild(right); root.appendChild(row);
    var clk = clock(left, { onToggle: function (k) { var i = pcs.indexOf(k); if (i >= 0) pcs.splice(i, 1); else pcs.push(k); draw(); } });
    var inp = el("input"); inp.type = "text"; inp.size = 16; inp.setAttribute("aria-label", "pitch classes"); inp.addEventListener("change", function () { pcs = P.uniq(P.parse(inp.value)); draw(); });
    var pre = sel(PRESETS, "", function () { if (pre.value) { pcs = P.parse(pre.value); draw(); pre.value = ""; } });
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Pitch classes ", inp)); ctl.appendChild(pre); ctl.appendChild(btn("Clear", function () { pcs = []; draw(); }));
    ctl.appendChild(btn("▶ Play", function () { stopAll(); var m = pcMidi(P.uniq(pcs)); playSeq(m, 0.28, 0.5); playChord(m, 1.8, 0.28 * m.length + 0.2); }, "the notes one by one, then together"));
    right.appendChild(ctl); var res = el("table", "pt-res"); right.appendChild(res);
    var tr = el("div", "pt-ctl"); var nR = range(0, 11, 1, 0, function () { draw(); }), inv = el("input"); inv.type = "checkbox"; inv.addEventListener("change", draw);
    var nOut = el("span"); tr.appendChild(label("n = ", nR)); tr.appendChild(nOut); tr.appendChild(label("invert first (TₙI)", inv)); right.appendChild(tr);
    var tOut = el("div", "pt-msg"); right.appendChild(tOut);
    function fmtNF(a) { return "[" + setStr(a, " ") + "]"; }
    function rowOf(h, v) { return "<tr><th>" + h + "</th><td>" + v + "</td></tr>"; }
    function draw() {
      pcs = P.uniq(pcs); clk.set(pcs); inp.value = pcs.map(function (p) { return p === 10 ? "T" : p === 11 ? "E" : p; }).join(" ");
      if (pcs.length === 0) { res.innerHTML = rowOf("Set", "choose pitch classes on the clock"); tOut.textContent = ""; return; }
      var f = P.forte(pcs), nf = P.normalForm(pcs), comp = P.complement(pcs), z = f.name ? P.zMate(f.name) : null;
      var html = rowOf("Pitch classes", fmtNF(pcs) + " &nbsp; " + pcs.map(nm).join(" ")) + rowOf("Normal form", fmtNF(nf) + (pcs.length > 1 ? " &nbsp;(starts on " + nm(nf[0]) + ")" : "")) +
        rowOf("Prime form", P_NAME(f.prime)) + rowOf("Forte name", (f.name || "n/a") + (z ? " &nbsp; Z-mate " + z.name + " " + P_NAME(P.parse(z.prime)) : "")) +
        rowOf("Interval vector", "&lang;" + P.vecStr(f.vector) + "&rang;") + rowOf("Complement", comp.length ? fmtNF(P.normalForm(comp)) + " &nbsp;" + (P.forte(comp).name || "") : "none") +
        rowOf("Members of the class", P.allInPrimeClass(f.prime).length + " different sets (transpositions and inversions)");
      res.innerHTML = html; var n = +nR.value; nOut.textContent = n;
      var out = inv.checked ? P.invert(pcs, n) : P.transpose(pcs, n), o2 = P.uniq(out);
      tOut.innerHTML = "T<sub>" + n + "</sub>" + (inv.checked ? "I" : "") + " of " + fmtNF(nf) + " = <b>" + fmtNF(P.normalForm(o2)) + "</b> (prime form " + P_NAME(P.forte(o2).prime) + (inv.checked ? "; an inversion keeps the set class, the same prime form" : "") + ")";
      root.setAttribute("data-now", setStr(pcs));
    }
    document.addEventListener("pt-load", function (e) { if (root.isConnected) { pcs = P.parse(e.detail); draw(); root.scrollIntoView({ block: "nearest" }); } });
    draw();
  }

  function setquiz(root) {
    root.innerHTML = ""; var kind = sel([["prime", "prime form"], ["normal", "normal form"], ["forte", "Forte name"], ["vector", "interval vector"]], "prime", next), size = sel([["3", "3 notes"], ["4", "4 notes"], ["5", "5 notes"], ["6", "6 notes"]], "4", next);
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Find the ", kind)); ctl.appendChild(size); root.appendChild(ctl);
    var row = el("div", "pt-row"), l = el("div", "pt-col"), r = el("div", "pt-col"); row.appendChild(l); row.appendChild(r); root.appendChild(row);
    var clk = clock(l, { readonly: true }), q = el("div"), inp = el("input"); inp.type = "text"; inp.size = 14; var msg = el("div", "pt-msg"), score = el("div", "pt-msg"); var cur = null, right = 0, tried = 0;
    r.appendChild(q); var c2 = el("div", "pt-ctl"); c2.appendChild(inp); c2.appendChild(btn("Check", check)); c2.appendChild(btn("Show answer", function () { msg.innerHTML = "Answer: <b>" + answer() + "</b>"; })); c2.appendChild(btn("Next", next)); r.appendChild(c2); r.appendChild(msg); r.appendChild(score);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
    function answer() { var f = P.forte(cur); return kind.value === "prime" ? P_NAME(f.prime) : kind.value === "normal" ? "[" + setStr(P.normalForm(cur), " ") + "]" : kind.value === "forte" ? f.name : "<" + P.vecStr(f.vector) + ">"; }
    function next() {
      var n = +size.value; do { var a = []; while (a.length < n) { var p = Math.floor(Math.random() * 12); if (a.indexOf(p) < 0) a.push(p); } cur = P.uniq(a); } while (!P.forte(cur).name);
      clk.set(cur); q.innerHTML = "The set is " + "<b>[" + setStr(cur, " ") + "]</b>. Give its " + kind.options[kind.selectedIndex].text + ".<br><small>" + (kind.value === "forte" ? "Write it like 3-11 (Z sets like 4-Z15)." : kind.value === "vector" ? "Six digits, like 001110." : "Pitch-class integers, T = 10, E = 11, in order.") + "</small>"; inp.value = ""; msg.textContent = "";
    }
    function check() {
      var f = P.forte(cur), v = inp.value.trim(), ok;
      if (kind.value === "forte") ok = v.toUpperCase().replace(/[–—\s]/g, "-").replace(/^-+|-+$/g, "") === f.name; else if (kind.value === "vector") ok = v.replace(/[^0-9A-Fa-f]/g, "").toUpperCase() === P.vecStr(f.vector);
      else ok = setStr(P.parse(v)) === (kind.value === "prime" ? setStr(f.prime) : setStr(P.normalForm(cur)));
      tried++; if (ok) right++; msg.innerHTML = ok ? '<span class="pt-ok">Correct.</span> ' + (kind.value === "forte" ? "" : "That is " + f.name + ".") : '<span class="pt-bad">Not quite.</span> Try again or Show answer.'; score.textContent = right + " correct of " + tried + " tries";
    }
    next();
  }

  function setbrowser(root) {
    root.innerHTML = ""; var size = sel([["3", "trichords (3)"], ["4", "tetrachords (4)"], ["5", "pentachords (5)"], ["6", "hexachords (6)"], ["7", "septachords (7)"], ["8", "octachords (8)"], ["9", "nonachords (9)"]], "4", draw);
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Set classes of ", size)); root.appendChild(ctl); var tab = el("table", "pt-res"); root.appendChild(tab);
    function draw() {
      var k = size.value, list = P.allClasses().filter(function (o) { return o.name.split("-")[0] === k; }).sort(function (a, b) { return parseInt(a.name.split("-")[1], 10) - parseInt(b.name.split("-")[1], 10); });
      tab.innerHTML = "<tr><th>Forte</th><th>Prime form</th><th>Vector</th><th></th></tr>";
      list.forEach(function (o) { var tr = el("tr"); tr.innerHTML = "<td>" + o.name + "</td><td>(" + o.prime + ")</td><td>" + o.vector + "</td><td></td>"; tr.lastChild.appendChild(btn("Open", function () { document.dispatchEvent(new CustomEvent("pt-load", { detail: o.prime })); })); tab.appendChild(tr); });
    }
    draw();
  }

  // ---------- matrix
  var ROWS = [["", "Rows to try..."], ["4 5 7 1 6 3 8 2 11 0 9 10", "Schoenberg, Suite Op. 25 (from memory, unchecked)"], ["7 10 2 6 9 0 4 8 11 1 3 5", "Berg, Violin Concerto (from memory, unchecked)"], ["0 1 2 3 4 5 6 7 8 9 10 11", "chromatic scale (boring on purpose)"], ["0 7 2 9 4 11 6 1 8 3 10 5", "circle of fifths"], ["0 11 7 4 2 9 3 8 10 1 5 6", "an all-interval row"]];
  function matrix(root) {
    root.innerHTML = ""; var row = P.parse(root.getAttribute("data-row") || "4 5 7 1 6 3 8 2 11 0 9 10"), names = false, flat = false, lastForm = null, seq = [];
    var inp = el("input"); inp.type = "text"; inp.size = 30; inp.setAttribute("aria-label", "the row"); var msg = el("div", "pt-msg");
    var pre = sel(ROWS, "", function () { if (pre.value) { row = P.parse(pre.value); pre.value = ""; draw(); } });
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Row ", inp)); ctl.appendChild(btn("Make matrix", function () { row = P.parse(inp.value); draw(); })); ctl.appendChild(pre); ctl.appendChild(btn("Random row", function () { row = P.randomRow(); draw(); }));
    ctl.appendChild(chk("note names", false, function (e) { names = e.target.checked; draw(); })); ctl.appendChild(chk("flats", false, function (e) { flat = e.target.checked; draw(); }));
    root.appendChild(ctl); root.appendChild(msg);
    var wrap = el("div", "pt-mat-wrap"); root.appendChild(wrap); var form = sel([["P", "P (prime)"], ["I", "I (inversion)"], ["R", "R (retrograde)"], ["RI", "RI (retrograde inversion)"]], "P"), nSel = sel([], "0"); for (var i = 0; i < 12; i++) { var op = el("option", null, i === 10 ? "10 (T)" : i === 11 ? "11 (E)" : String(i)); op.value = i; nSel.appendChild(op); }
    var tempo = range(120, 700, 10, 320, function () {}); var c2 = el("div", "pt-ctl"); c2.appendChild(label("Form ", form)); c2.appendChild(label("n = ", nSel)); c2.appendChild(btn("▶ Play it", function () { showForm(form.value, +nSel.value, true); })); c2.appendChild(label("ms per note ", tempo)); root.appendChild(c2);
    var staffHost = el("div"); root.appendChild(staffHost); var ident = el("div", "pt-ctl"), iin = el("input"); iin.type = "text"; iin.size = 30; ident.appendChild(label("Which form is this series? ", iin)); ident.appendChild(btn("Name it", function () { var id = P.identify(row, P.parse(iin.value)); iim.innerHTML = !P.isRow(P.parse(iin.value)) ? '<span class="pt-bad">Not a twelve-tone row (all twelve, once each).</span>' : id.length ? id.map(function (x) { return "<b>" + x.form + "<sub>" + x.n + "</sub></b>"; }).join(" or ") : "Not one of this row's 48 forms."; })); root.appendChild(ident); var iim = el("div", "pt-msg"); root.appendChild(iim);
    var facts = el("div"); root.appendChild(facts);
    var cells = [];
    function lab(p) { return names ? (flat ? FL : SH)[p] : (p === 10 ? "T" : p === 11 ? "E" : String(p)); }
    function draw() {
      stopAll(); inp.value = row.map(function (p) { return p === 10 ? "T" : p === 11 ? "E" : p; }).join(" ");
      if (!P.isRow(row)) { var missing = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(function (p) { return row.indexOf(p) < 0; }), dup = row.filter(function (p, i) { return row.indexOf(p) !== i; });
        msg.innerHTML = '<span class="pt-bad">A row has all twelve pitch classes exactly once. ' + (row.length < 12 ? "You have " + row.length + ". " : "") + (missing.length ? "Missing: " + missing.map(lab).join(" ") + ". " : "") + (dup.length ? "Repeated: " + P.uniq(dup).map(lab).join(" ") + "." : "") + "</span>"; wrap.innerHTML = ""; facts.innerHTML = ""; staffHost.innerHTML = ""; return; }
      msg.textContent = ""; var m = P.matrix(row), tab = el("table", "pt-mat"); cells = [];
      var top = el("tr"); top.appendChild(el("th")); top.appendChild(el("th", null, "")); m[0].forEach(function (x) { var th = el("th", null, "I<sub>" + lab(x) + "</sub>↓"); th.title = "play I" + x; th.addEventListener("click", function () { showForm("I", x, true); }); top.appendChild(th); }); top.appendChild(el("th")); tab.appendChild(top);
      m.forEach(function (line, r) {
        var tr = el("tr"), l = el("th", null, "P<sub>" + lab(line[0]) + "</sub>→"); l.title = "play P" + line[0]; l.addEventListener("click", function () { showForm("P", line[0], true); }); tr.appendChild(l); tr.appendChild(el("th"));
        cells[r] = []; line.forEach(function (x, c) { var td = el("td", null, lab(x)); cells[r][c] = td; tr.appendChild(td); });
        var rr = el("th", null, "←R<sub>" + lab(line[0]) + "</sub>"); rr.title = "play R" + line[0]; rr.addEventListener("click", function () { showForm("R", line[0], true); }); tr.appendChild(rr); tab.appendChild(tr);
      });
      var bot = el("tr"); bot.appendChild(el("th")); bot.appendChild(el("th")); m[0].forEach(function (x) { var th = el("th", null, "RI<sub>" + lab(x) + "</sub>↑"); th.title = "play RI" + x; th.addEventListener("click", function () { showForm("RI", x, true); }); bot.appendChild(th); }); bot.appendChild(el("th")); tab.appendChild(bot);
      wrap.innerHTML = ""; wrap.appendChild(tab); facts.innerHTML = factsHtml(); showForm(lastForm ? lastForm[0] : "P", lastForm ? lastForm[1] : row[0], false);
    }
    function path(f, n) {   // the matrix cells a form runs through, in playing order
      var m = P.matrix(row), out = [], r, c;
      if (f === "P" || f === "R") { r = m.map(function (x) { return x[0]; }).indexOf(n); for (c = 0; c < 12; c++) out.push([r, c]); if (f === "R") out.reverse(); }
      else { c = m[0].indexOf(n); for (r = 0; r < 12; r++) out.push([r, c]); if (f === "RI") out.reverse(); }
      return out;
    }
    function showForm(f, n, play) {
      lastForm = [f, n]; form.value = f; nSel.value = n; var m = P.matrix(row), p = path(f, n);
      cells.forEach(function (r) { r.forEach(function (td) { td.className = ""; }); }); p.forEach(function (rc) { cells[rc[0]][rc[1]].className = "hi"; });
      seq = p.map(function (rc) { return m[rc[0]][rc[1]]; }); staff(staffHost, P.rowAbc(seq, flat ? "flat" : "sharp", f + n).abc.replace("Q:1/4=80", "Q:1/4=" + Math.round(60000 / +tempo.value)), { button: false, width: 480 });
      if (play) { stopAll(); var gap = +tempo.value / 1000; playSeq(pcMidi(seq, 60).map(function (x, i) { return 60 + seq[i]; }), gap, gap * 1.4, function (i) { cells.forEach(function (r) { r.forEach(function (td) { td.classList.remove("lit"); }); }); cells[p[i][0]][p[i][1]].classList.add("lit"); }); }
      msg.innerHTML = "<b>" + f + "<sub>" + n + "</sub></b> = " + seq.map(lab).join(" ") + (f === "R" || f === "RI" ? " &nbsp;(" + f + "<sub>" + n + "</sub> ends on " + lab(n) + ")" : " &nbsp;(" + f + "<sub>" + n + "</sub> starts on " + lab(n) + ")");
    }
    function factsHtml() {
      var iv = P.rowIntervals(row), hx = P.hexachords(row), h1 = hx[0], h2 = hx[1];
      return '<table class="pt-res"><tr><th>Intervals</th><td>' + iv.map(function (d) { return d > 6 ? "-" + (12 - d) : "+" + d; }).join(" ") + "</td></tr><tr><th>All-interval row?</th><td>" + (P.allInterval(row) ? "yes: each of the eleven intervals, 1 to 11 semitones, appears once" : "no") + "</td></tr>" +
        "<tr><th>First hexachord</th><td>" + P_NAME(h1.prime) + " " + (h1.name || "") + " &lang;" + P.vecStr(h1.vector) + "&rang;</td></tr><tr><th>Second hexachord</th><td>" + P_NAME(h2.prime) + " " + (h2.name || "") + " &lang;" + P.vecStr(h2.vector) + "&rang;</td></tr>" +
        "<tr><th>Same set class?</th><td>" + (h1.name === h2.name ? "yes, both " + h1.name : "no") + "</td></tr></table>";
    }
    draw();
  }

  // ---------- collections
  function collections(root) {
    root.innerHTML = ""; var cs = sel(P.COLLECTIONS.map(function (c) { return [c.id, c.name]; }), root.getAttribute("data-coll") || "wholetone", draw), rs = sel(P.ROOTS.map(function (r, i) { return [String(i), r.name]; }), "0", draw);
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Collection ", cs)); ctl.appendChild(label("starting on ", rs)); root.appendChild(ctl);
    var host = el("div"); root.appendChild(host); var c2 = el("div", "pt-ctl"); root.appendChild(c2); var info = el("table", "pt-res"); root.appendChild(info);
    var pool = [];
    c2.appendChild(btn("Wash: random notes from the collection", function () { stopAll(); var a = ac(); if (!a) return; var t = a.currentTime + 0.06, last = -1; for (var i = 0; i < 24; i++) { var k; do { k = Math.floor(Math.random() * pool.length); } while (k === last); last = k; tone(pool[k], t + i * 0.22, 1.6, 0.45 + Math.random() * 0.25); } }, "no tune and no tonic: just the pool of notes"));
    c2.appendChild(btn("All at once", function () { stopAll(); playChord(pool.slice(0, Math.min(pool.length, 8)), 2.5); }, "the whole collection sounding together"));
    function draw() {
      stopAll(); var c = P.collection(cs.value), r = P.ROOTS[+rs.value], o = P.collectionAbc(c.id, r); pool = [];
      o.notes.slice(0, -1).forEach(function (n) { pool.push(P.noteMidi(n)); }); o.notes.slice(0, -1).forEach(function (n) { pool.push(P.noteMidi(n) + 12); });
      staff(host, o.abc, { qpm: 96, width: 540 });
      var pcs = c.semis, f = P.forte(pcs), steps = c.semis.map(function (s, i) { return (c.semis[i + 1] != null ? c.semis[i + 1] : 12) - s; });
      var distinct = {}; for (var n = 0; n < 12; n++) distinct[setStr(P.uniq(P.transpose(pcs, n)))] = 1;
      info.innerHTML = "<tr><th>Steps</th><td>" + steps.map(function (s) { return s === 1 ? "H" : s === 2 ? "W" : s === 3 ? "W+H" : s; }).join(" ") + "</td></tr><tr><th>Set class</th><td>" + (f.name || "") + " " + P_NAME(f.prime) + " &lang;" + P.vecStr(f.vector) + "&rang;</td></tr>" +
        "<tr><th>Different transpositions</th><td>" + Object.keys(distinct).length + (Object.keys(distinct).length < 12 ? " (a symmetrical collection: starting on another note only gives you the same notes again)" : " (twelve; each key has its own notes)") + "</td></tr>";
    }
    draw();
  }

  // ---------- planing
  function planing(root) {
    root.innerHTML = ""; var kind = sel([["real", "real planing (exact parallel chords)"], ["dia", "diatonic planing (the white notes)"]], "real", draw), shape = sel(Object.keys(P.SHAPES).map(function (k) { return [k, P.SHAPES[k].name]; }), "quartal", draw), mel = sel(P.MELODIES.real.map(function (m) { return [m.id, m.name]; }), "step", draw);
    var ctl = el("div", "pt-ctl"); [kind, shape, mel].forEach(function (s) { ctl.appendChild(s); }); ctl.appendChild(chk("flats", false, function (e) { flats = e.target.checked; draw(); })); var flats = false; root.appendChild(ctl);
    var host = el("div"), info = el("div", "pt-msg"); root.appendChild(host); root.appendChild(info);
    function draw() {
      stopAll(); var k = kind.value; Array.prototype.forEach.call(shape.options, function (o) { o.disabled = k === "dia" && !P.DIA[o.value]; }); if (shape.options[shape.selectedIndex].disabled) shape.value = "triad";
      var o = P.planingAbc(k, shape.value, mel.value, flats ? "flat" : "sharp", 72); staff(host, o.abc, { qpm: 72, width: 520 });
      var names = o.chords.map(function (ch) { var f = P.forte(ch.map(P.mod)); return f.name || "?"; }), same = names.every(function (n) { return n === names[0]; });
      info.innerHTML = same ? "Every chord is the same set class, <b>" + names[0] + "</b> (" + P_NAME(P.forte(o.chords[0].map(P.mod)).prime) + "): that is what parallel means." : "The chords are different set classes: " + names.join(", ") + ". Keeping to the white notes changes the sizes of the intervals while the chord keeps its shape in steps.";
    }
    draw();
  }

  // ---------- polychord
  var QUAL = { maj: ["major", [0, 4, 7]], min: ["minor", [0, 3, 7]], dom7: ["dominant 7th", [0, 4, 7, 10]], maj7: ["major 7th", [0, 4, 7, 11]], dim: ["diminished", [0, 3, 6]], aug: ["augmented", [0, 4, 8]] };
  function polychord(root) {
    root.innerHTML = ""; function chordSel(rt, q) { var r = sel(P.ROOTS.map(function (x, i) { return [String(i), x.name]; }), rt), s = sel(Object.keys(QUAL).map(function (k) { return [k, QUAL[k][0]]; }), q); r.addEventListener("change", draw); s.addEventListener("change", draw); return [r, s]; }
    var up = chordSel("0", "maj"), low = chordSel("6", "maj"), host = el("div"), info = el("div", "pt-msg"), disp = el("div");
    var c1 = el("div", "pt-ctl"), c2 = el("div", "pt-ctl"); c1.appendChild(document.createTextNode("Upper chord ")); up.forEach(function (x) { c1.appendChild(x); }); c2.appendChild(document.createTextNode("Lower chord ")); low.forEach(function (x) { c2.appendChild(x); });
    c2.appendChild(btn("Rite of Spring chord", function () { up[0].value = "3"; up[1].value = "dom7"; low[0].value = "4"; low[1].value = "maj"; draw(); }, "E♭7 over F♭ major (F♭ is written as E here)")); root.appendChild(c1); root.appendChild(c2); root.appendChild(disp); root.appendChild(host); root.appendChild(info);
    var cur = [];
    root.appendChild(btn("▶ Hear them together, then each", function () { stopAll(); var a = ac(); if (!a) return; playChord(cur.all, 1.8); playChord(cur.low, 1.2, 2.0); playChord(cur.up, 1.2, 3.4); }));
    function draw() {
      stopAll(); var lr = +low[0].value, ur = +up[0].value, lm = 48 + lr, um = 60 + ur; if (lr >= 6) lm -= 12; if (um <= lm + 7) um += 12;
      var L = QUAL[low[1].value][1].map(function (x) { return lm + x; }), U = QUAL[up[1].value][1].map(function (x) { return um + x; }); cur = { low: L, up: U, all: L.concat(U) };
      var qn = function (r, q) { return P.ROOTS[r].name + (q === "min" ? "m" : q === "dom7" ? "7" : q === "maj7" ? "maj7" : q === "dim" ? "°" : q === "aug" ? "+" : ""); };
      disp.innerHTML = '<span class="pt-poly"><span>' + qn(ur, up[1].value) + "</span><span>" + qn(lr, low[1].value) + "</span></span>";
      var abc = P.chordAbc(cur.all, "flat", qn(ur, up[1].value) + " over " + qn(lr, low[1].value)); staff(host, abc.abc, { button: false, width: 260 });
      var pcs = P.uniq(cur.all.map(P.mod)), f = P.forte(pcs);
      info.innerHTML = "Together the " + pcs.length + " pitch classes are [" + setStr(pcs, " ") + "], set class <b>" + (f.name || "?") + "</b> " + P_NAME(f.prime) + " &lang;" + P.vecStr(f.vector) + "&rang;." + (pcs.length < cur.all.length ? " (Some notes are shared between the two chords.)" : "");
    }
    draw();
  }

  // ---------- processes: a small scheduler
  function runner(voices, opts) {   // voices: [{ at(k) -> { midi, dur, gain } | null, period(k) -> seconds, voice, onNote(k, ev) }]
    var a = ac(); if (!a) return { stop: function () {} }; var t0 = a.currentTime + 0.15, st = voices.map(function (v) { return { v: v, next: t0, k: 0 }; }), id = null;
    function pump() { var now = a.currentTime; st.forEach(function (s) { while (s.next < now + 0.2) { var ev = s.v.at(s.k); if (ev) tone(ev.midi, s.next, ev.dur || 0.3, ev.gain == null ? 0.5 : ev.gain, s.v.voice); if (s.v.onNote) (function (k, e, d) { timers.push(setTimeout(function () { s.v.onNote(k, e); }, Math.max(0, d))); })(s.k, ev, (s.next - now) * 1000); s.next += s.v.period(s.k); s.k++; } }); if (opts && opts.onPump) opts.onPump(st); }
    id = setInterval(pump, 25); pump();
    var me = { stop: function () { clearInterval(id); st = []; var i = stopFns.indexOf(me.stop); if (i >= 0) stopFns.splice(i, 1); if (opts && opts.onStop) opts.onStop(); } };
    stopFns.push(me.stop); return me;
  }
  var PATTERNS = [["five", "five-note cell (C D G E A)", [60, 62, 67, 64, 69]], ["eight", "eight-note cell", [62, 65, 69, 67, 72, 69, 65, 67]], ["twelve", "twelve-note cell", [60, 64, 67, 72, 71, 67, 64, 62, 65, 69, 67, 60]], ["three", "three-note cell (C E G)", [60, 64, 67]]];
  function patOf(id) { return PATTERNS.filter(function (p) { return p[0] === id; })[0][2]; }
  var LET = "abcdefghijkl";

  function phasing(root) {
    root.innerHTML = ""; var pat = sel(PATTERNS.map(function (p) { return [p[0], p[1]]; }), "five", reset), mode = sel([["step", "stepped (Reich's way: a note ahead, then hold)"], ["drift", "steady drift (the second voice a little faster)"]], "step", reset);
    var bpm = range(120, 480, 10, 300, function () { bv.textContent = bpm.value; }), bv = el("span", null, "300"), reps = range(2, 16, 1, 6, function () { rv.textContent = reps.value; reset(); }), rv = el("span", null, "6"), ratio = range(1.005, 1.08, 0.005, 1.03, function () { dv.textContent = (+ratio.value).toFixed(3); }), dv = el("span", null, "1.030");
    var v2 = sel([["epiano", "electric piano"], ["vibes", "vibes"], ["piano", "piano"], ["pluck", "pluck"]], "vibes");
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Pattern ", pat)); ctl.appendChild(label("Process ", mode)); root.appendChild(ctl);
    var c2 = el("div", "pt-ctl"); c2.appendChild(label("notes per minute ", bpm)); c2.appendChild(bv); c2.appendChild(label("cycles before a step ", reps)); c2.appendChild(rv); c2.appendChild(label("drift speed ratio ", ratio)); c2.appendChild(dv); c2.appendChild(label("second voice ", v2)); root.appendChild(c2);
    var c3 = el("div", "pt-ctl"), run = null; var go = btn("▶ Start", toggle); c3.appendChild(go); root.appendChild(c3); var status = el("div", "pt-msg"); root.appendChild(status);
    var rings = el("div"), rot = el("div", "pt-rot"); root.appendChild(rings); root.appendChild(rot);
    var dots = [[], []];
    function reset() { if (run) toggle(); draw(); }
    function draw() {
      var p = patOf(pat.value), n = p.length; rings.innerHTML = ""; dots = [[], []];
      [0, 1].forEach(function (vi) { var s = svg("svg", { viewBox: "0 0 120 120", width: 120, height: 120, "class": "pt-clock pt-ring" }); var t = svg("text", { x: 60, y: 64 }); t.textContent = vi ? "voice 2" : "voice 1"; t.setAttribute("style", "font-size:10px;opacity:.7;fill:currentColor;text-anchor:middle"); s.appendChild(t);
        for (var i = 0; i < n; i++) { var a = (i / n * 360 - 90) * Math.PI / 180, g = svg("g", { "class": "pt-pt" }); g.appendChild(svg("circle", { cx: 60 + 46 * Math.cos(a), cy: 60 + 46 * Math.sin(a), r: 8 })); var tt = svg("text", { x: 60 + 46 * Math.cos(a), y: 60 + 46 * Math.sin(a) + 3.5, "class": "n" }); tt.textContent = LET[i]; g.appendChild(tt); s.appendChild(g); dots[vi].push(g); }
        rings.appendChild(s); });
      var lines = []; for (var o = 0; o < n; o++) { var l = "<div data-o='" + o + "'>"; for (var i = 0; i < n; i++) l += "<span>" + LET[(i + o) % n] + "</span>"; lines.push(l + "&nbsp; voice 2 " + o + " note" + (o === 1 ? "" : "s") + " ahead</div>"); }
      rot.innerHTML = lines.join(""); status.textContent = "";
    }
    function light(vi, i) { dots[vi].forEach(function (g) { g.classList.remove("lit"); }); if (dots[vi][i]) dots[vi][i].classList.add("lit"); }
    function toggle() {
      if (run) { run.stop(); run = null; go.textContent = "▶ Start"; return; }
      stopAll(); var p = patOf(pat.value), n = p.length, per = 60 / +bpm.value, m = mode.value, R = +reps.value, rat = +ratio.value, cur1 = 0;
      go.textContent = "■ Stop";
      run = runner([
        { at: function (k) { return { midi: p[k % n], dur: per * 0.9 }; }, period: function () { return per; }, voice: "piano", onNote: function (k) { cur1 = k % n; light(0, cur1); } },
        { at: function (k) { var i = m === "step" ? P.phaseIndex(n, R, k, true) : k % n; return { midi: p[i] + 12 * 0, dur: per * 0.9, gain: 0.4 }; }, period: function () { return m === "step" ? per : per / rat; }, voice: v2.value,
          onNote: function (k) { var i = m === "step" ? P.phaseIndex(n, R, k, true) : k % n; light(1, i); var off = P.mod(i - cur1 + 0, n); if (m === "step") off = P.steppedOffset(n, R, Math.floor(k / n)); status.textContent = m === "step" ? "Voice 2 is " + off + " note" + (off === 1 ? "" : "s") + " ahead (cycle " + (Math.floor(k / n) + 1) + ")." : "Voice 2 has run " + (k / n * (1 - 1 / rat)).toFixed(2) + " of a cycle past voice 1; one full lap takes about " + Math.round(1 / (rat - 1)) + " cycles."; Array.prototype.forEach.call(rot.children, function (d) { d.classList.toggle("cur", m === "step" && +d.getAttribute("data-o") === off); }); } }
      ], { onStop: function () { go.textContent = "▶ Start"; } });
    }
    draw();
  }

  function additive(root) {
    root.innerHTML = ""; var pat = sel(PATTERNS.map(function (p) { return [p[0], p[1]]; }), "eight", reset), mode = sel([["grow", "grow (a, ab, abc ...)"], ["shrink", "shrink (full pattern, then shorter)"], ["both", "grow then shrink"], ["front", "drop from the front (abcd, bcd, cd, d)"]], "grow", reset);
    var rp = range(1, 6, 1, 2, function () { rv.textContent = rp.value; reset(); }), rv = el("span", null, "2"), tempo = range(120, 480, 10, 280, function () { tv.textContent = tempo.value; }), tv = el("span", null, "280");
    var ctl = el("div", "pt-ctl"); ctl.appendChild(label("Pattern ", pat)); ctl.appendChild(label("Process ", mode)); ctl.appendChild(label("times each step is played ", rp)); ctl.appendChild(rv); ctl.appendChild(label("notes per minute ", tempo)); ctl.appendChild(tv); root.appendChild(ctl);
    var go = btn("▶ Start", toggle), c2 = el("div", "pt-ctl"); c2.appendChild(go); root.appendChild(c2); var list = el("div", "pt-rot"); root.appendChild(list); var run = null, steps = [], flat = [];
    function reset() { if (run) toggle(); draw(); }
    function draw() {
      var p = patOf(pat.value); steps = mode.value === "front" ? P.additiveFromFront(p) : P.additiveSteps(p, mode.value); var idx = p.map(function (_, i) { return i; });
      steps = (mode.value === "front" ? P.additiveFromFront(idx) : P.additiveSteps(idx, mode.value)); flat = []; var rp2 = +rp.value;
      list.innerHTML = steps.map(function (s, si) { for (var r = 0; r < rp2; r++) s.forEach(function (x, j) { flat.push({ midi: p[x], si: si, j: j, last: j === s.length - 1 && r === rp2 - 1 }); }); return "<div data-s='" + si + "'>" + s.map(function (x, j) { return "<span data-j='" + j + "'>" + LET[x] + "</span>"; }).join("") + (rp2 > 1 ? " &times;" + rp2 : "") + "</div>"; }).join("");
    }
    function toggle() {
      if (run) { run.stop(); run = null; go.textContent = "▶ Start"; return; } stopAll(); go.textContent = "■ Stop"; var per = 60 / +tempo.value;
      run = runner([{ at: function (k) { var e = flat[k]; return e ? { midi: e.midi, dur: per * 0.9 } : null; }, period: function () { return per; }, voice: "piano",
        onNote: function (k, ev) { var e = flat[k]; Array.prototype.forEach.call(list.querySelectorAll(".lit"), function (x) { x.classList.remove("lit"); }); Array.prototype.forEach.call(list.children, function (d) { d.classList.remove("cur"); });
          if (!e) { run && run.stop(); run = null; go.textContent = "▶ Start"; return; } var d = list.children[e.si]; d.classList.add("cur"); var s = d.querySelector("[data-j='" + e.j + "']"); if (s) s.classList.add("lit"); } }], { onStop: function () { go.textContent = "▶ Start"; } });
    }
    draw();
  }

  // ostinato layers: four short cells of different lengths over one pulse, entered one at a time
  var LAYERS = [{ name: "bass cell (3 notes)", midi: [48, 55, 52], v: "piano" }, { name: "inner cell (4 notes)", midi: [64, 67, 71, 67], v: "epiano" }, { name: "high cell (5 notes)", midi: [76, 79, 74, 81, 79], v: "vibes" }, { name: "top cell (7 notes)", midi: [88, 86, 83, 86, 91, 88, 83], v: "pluck" }];
  function layers(root) {
    root.innerHTML = ""; var on = [true, false, false, false], checks = [], run = null, dots = [], lit = [];
    var ctl = el("div", "pt-ctl"); LAYERS.forEach(function (L, i) { var l = chk(L.name, on[i], function (e) { on[i] = e.target.checked; }); checks.push(l); ctl.appendChild(l); }); root.appendChild(ctl);
    var go = btn("▶ Start", toggle), tempo = range(150, 420, 10, 260, function () { tv.textContent = tempo.value; }), tv = el("span", null, "260"), c2 = el("div", "pt-ctl"); c2.appendChild(go); c2.appendChild(label("notes per minute ", tempo)); c2.appendChild(tv); root.appendChild(c2);
    var msg = el("div", "pt-msg"); msg.textContent = "Tick a layer on or off while it plays. The cells have 3, 4, 5 and 7 notes, so all four only line up again after 420 notes."; root.appendChild(msg);
    var rows = el("div", "pt-rot"); LAYERS.forEach(function (L, i) { var d = el("div"); d.innerHTML = L.name + " "; var cells = []; L.midi.forEach(function (_, j) { var s = el("span", null, "•"); d.appendChild(s); cells.push(s); }); rows.appendChild(d); lit.push(cells); }); root.appendChild(rows);
    function toggle() {
      if (run) { run.stop(); run = null; go.textContent = "▶ Start"; return; } stopAll(); go.textContent = "■ Stop"; var per = 60 / +tempo.value;
      run = runner(LAYERS.map(function (L, i) { return { at: function (k) { return on[i] ? { midi: L.midi[k % L.midi.length], dur: per * 0.9, gain: 0.35 } : null; }, period: function () { return per; }, voice: L.v, onNote: function (k) { lit[i].forEach(function (s) { s.classList.remove("lit"); }); if (on[i]) lit[i][k % L.midi.length].classList.add("lit"); } }; }), { onStop: function () { go.textContent = "▶ Start"; } });
    }
  }

  var MAKERS = { setcalc: setcalc, setquiz: setquiz, setbrowser: setbrowser, matrix: matrix, collections: collections, planing: planing, polychord: polychord, phasing: phasing, additive: additive, layers: layers };
  var TITLES = { setcalc: "Set calculator", setquiz: "Practice: find the form", setbrowser: "The set classes", matrix: "Twelve-tone matrix", collections: "Hear a collection", planing: "Planing: parallel chords", polychord: "Polychord builder", phasing: "Phasing player", additive: "Additive process", layers: "Ostinato layers" };
  function mount() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    Array.prototype.forEach.call(document.querySelectorAll(".pt[data-pt]"), function (root) {
      var f = MAKERS[root.getAttribute("data-pt")]; if (!f) return; var body = el("div"); var h = el("h4", null, root.getAttribute("data-title") || TITLES[root.getAttribute("data-pt")]); root.innerHTML = ""; root.appendChild(h); root.appendChild(body);
      body.setAttribute("data-set", root.getAttribute("data-set") || ""); if (root.getAttribute("data-row")) body.setAttribute("data-row", root.getAttribute("data-row")); if (root.getAttribute("data-coll")) body.setAttribute("data-coll", root.getAttribute("data-coll"));
      f(body);
    });
  }
  global.PTWidgets = { mount: mount, clock: clock, stopAll: stopAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})(window);
