// sax-page.js — the interactive parts of lessons/saxophone.qmd. Needs SaxChart (sax-chart.js), ABCJS (in every page's head).
//   SaxPage.sound()                    -> Promise { ac, out }   one AudioContext for the page, registered with AudioTap
//   SaxPage.abcNote(m, "sharp"|"flat") -> ABC for a written note ("^F", "_B", "c'")
//   SaxPage.explorer(el)   the fingering chart: pick a note, see the usual and alternate fingerings, hear it on alto/tenor/bari
//   SaxPage.builder(el)    press keys on a blank diagram: which note is that? And a quiz: build the fingering for a note
//   SaxPage.trills(el)     the trill chart: hold the black keys, move the gray ones
(function (global) {
  "use strict";
  var C = global.SaxChart, snd = null;
  var INST_LABEL = { alto: "E♭ alto", tenor: "B♭ tenor", bari: "E♭ baritone" };

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Saxophone");
      res({ ac: ac, out: out });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(writtenList, inst, step) {   // notes one after another (step seconds each)
    var tr = C.INSTRUMENTS[inst || "alto"];
    return sound().then(function (s) { var t = s.ac.currentTime + 0.05; writtenList.forEach(function (m, i) { C.tone(s.ac, s.out, m + tr, t + i * step, step * 0.95); }); });
  }

  function abcNote(m, how) {
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1;
    var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
    var n = (how === "flat" ? FL : SH)[pc], acc = n.length > 1 ? n[0] : "", L = n[n.length - 1];
    if (oct >= 5) return acc + L.toLowerCase() + "'".repeat(oct - 5);
    return acc + L + ",".repeat(4 - oct);
  }
  function staff(el, notes, w) {   // notes: array of ABC notes, whole notes in one bar
    if (!global.ABCJS) { el.textContent = ""; return; }
    ABCJS.renderAbc(el, "X:1\nL:1/1\nK:C clef=treble\n" + notes.join(" ") + "|]", { staffwidth: w || 120, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 0.9 });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function instSelect(id) {
    var s = el("select", "form-select form-select-sm sxp-inst"); s.id = id;
    Object.keys(INST_LABEL).forEach(function (k) { var o = el("option", null, INST_LABEL[k] + " saxophone"); o.value = k; s.appendChild(o); });
    return s;
  }

  // ---------- the chart ----------
  function explorer(root) {
    var top = el("div", "sxp-bar"), sel = instSelect("sxp-ex-inst");
    top.appendChild(el("label", "sxp-lab", "Instrument ")).appendChild(sel);
    var strip = el("div", "sxp-strip"), card = el("div", "sxp-card");
    root.appendChild(top); root.appendChild(strip); root.appendChild(card);
    var cur = 67;
    [["Low", 58, 73], ["Middle (octave key)", 74, 85], ["High (palm keys)", 86, 89]].forEach(function (g) {
      var row = el("div", "sxp-row"); row.appendChild(el("span", "sxp-rowlab", g[0]));
      for (var m = g[1]; m <= g[2]; m++) (function (m) {
        var b = el("button", "btn btn-sm btn-outline-secondary sxp-nb", C.both(m).replace(/\d+$/, "").replace(/(\d)/, "")); b.type = "button"; b.dataset.m = m;
        b.title = "Written " + C.both(m); b.onclick = function () { cur = m; show(true); }; row.appendChild(b);
      })(m);
      strip.appendChild(row);
    });
    function show(hear) {
      strip.querySelectorAll(".sxp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === cur); });
      var inst = sel.value, conc = cur + C.INSTRUMENTS[inst], fs = C.FINGERINGS[cur];
      card.innerHTML = "";
      var head = el("div", "sxp-head");
      var st = el("div", "sxp-staff"); head.appendChild(st);
      var nm = el("div", "sxp-names");
      nm.innerHTML = "<div class='sxp-big'>" + C.both(cur) + "</div><div class='sxp-muted'>written · sounds as concert <strong>" + C.name(conc) + "</strong> on " + INST_LABEL[inst] + "</div>";
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([cur], inst, 1.2); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      var pc = ((cur % 12) + 12) % 12, sharpish = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      staff(st, sharpish ? [abcNote(cur, "sharp"), abcNote(cur, "flat")] : [abcNote(cur)], sharpish ? 130 : 80);
      var row = el("div", "sxp-diags");
      fs.forEach(function (f, i) {
        var box = el("figure", "sxp-fig"), d = el("div", "sxp-d"); box.appendChild(d);
        C.diagram(d, { label: C.both(cur) + (i ? " alternate " + i : "") }).set(f);
        box.appendChild(el("figcaption", null, i === 0 ? "Usual" : "Alternate " + (fs.length > 2 ? i : "")));
        row.appendChild(box);
      });
      card.appendChild(row);
      card.appendChild(el("p", "sxp-muted", fs.length > 1 ? "The first is the one most people use. The alternates help in fast passages: pick the one that moves the fewest fingers from the note before." :
        "Dark = pressed down. Hover over (or long-press) a key for its name."));
      if (hear) play([cur], inst, 1.2);
    }
    sel.onchange = function () { show(false); };
    show(false);
  }

  // ---------- build a fingering ----------
  function builder(root) {
    var bar = el("div", "sxp-bar");
    var mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "What note is this?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: finger this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode);
    var sel = instSelect("sxp-b-inst"); bar.appendChild(sel);
    root.appendChild(bar);
    var wrap = el("div", "sxp-build"), dEl = el("div", "sxp-d sxp-d-big"), side = el("div", "sxp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "sxp-ask"), st = el("div", "sxp-staff"), out = el("div", "sxp-out", ""), btns = el("div", "sxp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Clear keys"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "sxp-muted", ""); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true;
    var dg = C.diagram(dEl, { onToggle: update, label: "Saxophone keys: click to press" });
    function update(keys) {
      if (quiz) { out.textContent = ""; return; }
      var ms = C.lookup(keys);
      st.innerHTML = "";
      if (ms.length) { out.innerHTML = "That plays written <strong>" + ms.map(C.both).join(" or ") + "</strong>."; staff(st, [abcNote(ms[0], [70, 82, 63, 75, 87, 68, 80].indexOf(ms[0]) >= 0 ? "flat" : "sharp")], 80); }
      else out.textContent = keys.length ? "That's not a fingering on the chart. Keep going, or clear and start again." : "No keys pressed: that is C♯ (no octave key).";
      if (!keys.length) { staff(st, ["^c"], 80); }
    }
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; dg.set([]); out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Click keys to press them. The page tells you which note that fingering plays.";
      if (q) next(); else update([]);
    }
    function next() {
      var pool = Object.keys(C.FINGERINGS).map(Number).filter(function (m) { return m >= 60 && m <= 84; });
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set([]);
      ask.innerHTML = "Finger written <strong>" + C.both(target) + "</strong>, then press Check.";
      var pc = target % 12; staff(st, [abcNote(target, [1, 3, 6, 8, 10].indexOf(pc) >= 0 && Math.random() < 0.5 ? "flat" : "sharp")], 80);
      out.textContent = "";
    }
    bCheck.onclick = function () {
      if (!quiz) return;
      var keys = dg.get(), ok = C.FINGERINGS[target].some(function (f) { return C.sameSet(f, keys); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='sxp-good'>✓ Yes!</span>"; play([target], sel.value, 1); setTimeout(next, 1200); }
      else { firstTry = false; var ms = C.lookup(keys); out.innerHTML = "<span class='sxp-bad'>Not yet.</span> " + (ms.length ? "That fingering plays " + ms.map(C.both).join(" or ") + "." : "That isn't a fingering on the chart."); }
      score.textContent = asked ? right + " of " + asked + " right on the first try." : "";
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; dg.set(C.FINGERINGS[target][0]); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (C.lookup(dg.get()).indexOf(target) < 0) asked++; score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; next(); } };
    bClear.onclick = function () { dg.set([]); update([]); };
    bHear.onclick = function () { var m = quiz ? target : C.lookup(dg.get())[0]; if (m == null && !dg.get().length) m = 73; if (m != null) play([m], sel.value, 1.2); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    setMode(false);
  }

  // ---------- trills ----------
  function trills(root) {
    var bar = el("div", "sxp-bar"), sel = instSelect("sxp-t-inst"); bar.appendChild(sel); root.appendChild(bar);
    var grid = el("div", "sxp-tgrid"); root.appendChild(grid);
    C.TRILLS.forEach(function (t) {
      var card = el("div", "sxp-tcard"), lab = el("div", "sxp-tlab", C.both(t.from).replace(/\d/, "") + " to " + C.both(t.to).replace(/\d/, "") + (t.unsure ? " <span title='The gray key could not be read with certainty in the scanned chart: check with your teacher.'>*</span>" : ""));
      var st = el("div", "sxp-staff sxp-staff-s"), d = el("div", "sxp-d sxp-d-s"), b = el("button", "btn btn-sm btn-outline-primary", "▶ Trill");
      b.type = "button"; card.appendChild(lab); card.appendChild(st); card.appendChild(d); card.appendChild(b); grid.appendChild(card);
      var flat = /♭/.test(C.name(t.from)) ? "flat" : "sharp";
      staff(st, [abcNote(t.from, flat), abcNote(t.to, flat)], 90);
      C.diagram(d, { small: true, label: "Trill " + C.both(t.from) + " to " + C.both(t.to) }).set(t.hold, t.trill);
      b.onclick = function () { var l = []; for (var i = 0; i < 12; i++) l.push(i % 2 ? t.to : t.from); play(l, sel.value, 0.11); };
    });
    root.appendChild(el("p", "sxp-muted", "Dark keys stay down; move the <strong>gray</strong> key(s) quickly to trill. * = the gray key was hard to read in the printed chart: check it with your teacher."));
  }

  // altissimo cards: diagram, staff, Hear (alto only: the chart these come from is for soprano and alto)
  function altissimo(root) {
    var grid = el("div", "sxp-tgrid"); root.appendChild(grid);
    C.ALTISSIMO.forEach(function (a) {
      var card = el("div", "sxp-tcard"), lab = el("div", "sxp-tlab", a.label + (a.src === "crunch" ? " ★" : ""));
      var st = el("div", "sxp-staff sxp-staff-s"), d = el("div", "sxp-d sxp-d-s"), b = el("button", "btn btn-sm btn-outline-primary", "▶ Hear");
      b.type = "button"; [lab, st, d, b].forEach(function (x) { card.appendChild(x); }); grid.appendChild(card);
      staff(st, [abcNote(a.m, "sharp")], 70);
      C.diagram(d, { small: true, label: a.label + " fingering" }).set(a.keys);
      b.onclick = function () { play([a.m], "alto", 1.2); };
    });
  }

  // overtone ladder: hold low B♭ and sound partials 1-8 by voicing alone (the exercise behind Sinta's and Raschèr's books)
  function overtones(root) {
    var bar = el("div", "sxp-bar"), sel = instSelect("sxp-o-inst"); bar.appendChild(sel); root.appendChild(bar);
    var row = el("div", "sxp-bar"); root.appendChild(row);
    var fig = el("div", "sxp-d sxp-d-s"); root.insertBefore(fig, row); C.diagram(fig, { small: true, label: "Low B♭ fingering" }).set(C.FINGERINGS[58][0]);
    var out = el("p", "sxp-muted", "Finger low B♭ and keep it down. Hear each partial, sing it, then find it with your tongue and throat only."); root.appendChild(out);
    for (var n = 1; n <= 8; n++) (function (n) {
      var m = 58 + 12 * Math.log2(n), b = el("button", "btn btn-sm btn-outline-secondary", n === 1 ? "1 (low B♭)" : String(n) + " (" + C.name(Math.round(m), "flat") + ")");
      b.type = "button"; b.onclick = function () { play([58, m], sel.value, 1.1); }; row.appendChild(b);
    })(n);
  }

  var api = { altissimo: altissimo, overtones: overtones, sound: sound, play: play, abcNote: abcNote, staff: staff, explorer: explorer, builder: builder, trills: trills };
  global.SaxPage = api;
})(typeof window !== "undefined" ? window : globalThis);
