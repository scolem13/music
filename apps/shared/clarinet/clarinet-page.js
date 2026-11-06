// clarinet-page.js — the interactive parts of lessons/clarinet.qmd. Needs ClarChart (clarinet-chart.js); ABCJS for the staves
// (load /apps/shared/abcjs-basic.js on the page: it is not global).
//   ClarPage.sound()                    -> Promise { ac, out }   one AudioContext for the page, registered with AudioTap
//   ClarPage.abcNote(m, "sharp"|"flat") -> ABC for a written note ("^F", "_B", "c'")
//   ClarPage.explorer(el)   the fingering chart: pick a note, see the fingerings, hear it on any clarinet of the family
//   ClarPage.builder(el)    press keys on a blank diagram: which note is that? And a quiz: build the fingering for a note
//   ClarPage.trills(el)     the trill chart: hold the dark keys, move the gray ones
(function (global) {
  "use strict";
  var C = global.ClarChart, snd = null;

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Clarinet");
      res({ ac: ac, out: out });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(writtenList, inst, step) {   // notes one after another (step seconds each)
    var tr = C.INSTRUMENTS[inst || "bb"].trans;
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
  function instSelect(id, only) {
    var s = el("select", "form-select form-select-sm clp-inst"); s.id = id;
    Object.keys(C.INSTRUMENTS).filter(function (k) { return !only || only.indexOf(k) >= 0; }).forEach(function (k) { var o = el("option", null, C.INSTRUMENTS[k].name); o.value = k; s.appendChild(o); });
    return s;
  }
  function tags(m, i, chart) { var t = C.TAGS[m]; return t && t[i] && !(chart === "alto" && m === 51 && false) ? t[i] : ""; }

  // ---------- the chart ----------
  function explorer(root) {
    var top = el("div", "clp-bar"), sel = instSelect("clp-ex-inst");
    top.appendChild(el("label", "clp-lab", "Instrument ")).appendChild(sel);
    var strip = el("div", "clp-strip"), card = el("div", "clp-card");
    root.appendChild(top); root.appendChild(strip); root.appendChild(card);
    var cur = 67;
    var ROWS = [["Low E♭ (alto, bass and larger)", 51, 51], ["Chalumeau (low)", 52, 66], ["Throat tones", 67, 70], ["Clarion (register key)", 71, 84], ["Altissimo (highest)", 85, 89]];
    var btns = {};
    ROWS.forEach(function (g) {
      var row = el("div", "clp-row"); row.appendChild(el("span", "clp-rowlab", g[0])); row.dataset.first = g[1];
      for (var m = g[1]; m <= g[2]; m++) (function (m) {
        var b = el("button", "btn btn-sm btn-outline-secondary clp-nb", C.both(m).replace(/\d+$/, "")); b.type = "button"; b.dataset.m = m;
        b.title = "Written " + C.both(m); b.onclick = function () { cur = m; show(true); }; row.appendChild(b); btns[m] = row;
      })(m);
      strip.appendChild(row);
    });
    function show(hear) {
      var I = C.INSTRUMENTS[sel.value], tb = C.table(I.chart);
      if (!tb[cur]) cur = 67;
      btns[51].hidden = I.chart !== "alto"; btns[51].style.display = I.chart === "alto" ? "" : "none";
      strip.querySelectorAll(".clp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === cur); });
      var conc = cur + I.trans, fs = tb[cur];
      card.innerHTML = "";
      var head = el("div", "clp-head"), st = el("div", "clp-staff"); head.appendChild(st);
      var nm = el("div", "clp-names");
      nm.innerHTML = "<div class='clp-big'>" + C.both(cur) + "</div><div class='clp-muted'>written · sounds as concert <strong>" + C.name(conc) + "</strong> on the " + I.name + "</div>";
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([cur], sel.value, 1.2); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      var pc = ((cur % 12) + 12) % 12, sharpish = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      staff(st, sharpish ? [abcNote(cur, "sharp"), abcNote(cur, "flat")] : [abcNote(cur)], sharpish ? 130 : 80);
      var row = el("div", "clp-diags");
      fs.forEach(function (f, i) {
        var box = el("figure", "clp-fig"), d = el("div", "clp-d"); box.appendChild(d);
        C.diagram(d, { label: C.both(cur) + (i ? " alternate " + i : ""), ext: f.indexOf("pX") >= 0 }).set(f);
        var cap = i === 0 ? "First shown" : "Alternate " + (fs.length > 2 ? i : ""), t = (C.TAGS[cur] || [])[i];
        box.appendChild(el("figcaption", null, cap + (t ? " <span class='clp-tag'>(" + t + ")</span>" : "")));
        row.appendChild(box);
      });
      card.appendChild(row);
      var half = fs.some(function (f) { return f.indexOf("l1~") >= 0; });
      card.appendChild(el("p", "clp-muted", (fs.length > 1 ? "The first is the one the book shows first. The others help in fast passages: pick the one that moves the fewest fingers from the note before. " : "") +
        "Dark = pressed or closed. The teardrop is the register key, the circle under it the thumb hole." + (half ? " The first hole is only half covered here (rolled down with the finger)." : "") +
        (C.TAGS[cur] ? " The letters L and R are copied from the book's chart (little-finger keys)." : "")));
      if (hear) play([cur], sel.value, 1.2);
    }
    sel.onchange = function () { show(false); };
    show(false);
  }

  // ---------- build a fingering (B♭ chart) ----------
  function builder(root) {
    var bar = el("div", "clp-bar");
    var mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "What note is this?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: finger this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode);
    var sel = instSelect("clp-b-inst", ["bb", "a", "alto", "bass"]); bar.appendChild(sel);
    root.appendChild(bar);
    var wrap = el("div", "clp-build"), dEl = el("div", "clp-d clp-d-big"), side = el("div", "clp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "clp-ask"), st = el("div", "clp-staff"), out = el("div", "clp-out", ""), btns = el("div", "clp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Clear keys"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "clp-muted", ""); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true;
    var dg = C.diagram(dEl, { onToggle: update, label: "Clarinet keys: click to press" });
    var FLATLIST = [58, 63, 68, 70, 75, 80, 82, 87];
    function update(keys) {
      if (quiz) { out.textContent = ""; return; }
      var ms = C.lookup(keys, "bb");
      st.innerHTML = "";
      if (ms.length) { out.innerHTML = "That plays written <strong>" + ms.map(C.both).join(" or ") + "</strong>."; staff(st, [abcNote(ms[0], FLATLIST.indexOf(ms[0]) >= 0 ? "flat" : "sharp")], 80); }
      else out.textContent = keys.length ? "That's not a fingering on the chart. Keep going, or clear and start again." : "No keys pressed.";
      if (!keys.length) { out.textContent = "No keys pressed: that is written G4 (the open G)."; staff(st, ["G"], 80); }
    }
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; dg.set([]); out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Click keys to press them. The page tells you which note that fingering plays.";
      if (q) next(); else update([]);
    }
    function next() {
      var pool = Object.keys(C.FINGERINGS).map(Number).filter(function (m) { return m >= 55 && m <= 84; });
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set([]);
      ask.innerHTML = "Finger written <strong>" + C.both(target) + "</strong>, then press Check.";
      var pc = target % 12; staff(st, [abcNote(target, [1, 3, 6, 8, 10].indexOf(pc) >= 0 && Math.random() < 0.5 ? "flat" : "sharp")], 80);
      out.textContent = "";
    }
    bCheck.onclick = function () {
      if (!quiz) return;
      var keys = dg.get(), ok = C.FINGERINGS[target].some(function (f) { return C.sameSet(f, keys); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='clp-good'>✓ Yes!</span>"; play([target], sel.value, 1); setTimeout(next, 1200); }
      else { firstTry = false; var ms = C.lookup(keys, "bb"); out.innerHTML = "<span class='clp-bad'>Not yet.</span> " + (ms.length ? "That fingering plays " + ms.map(C.both).join(" or ") + "." : "That isn't a fingering on the chart."); }
      score.textContent = asked ? right + " of " + asked + " right on the first try." : "";
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; dg.set(C.FINGERINGS[target][0]); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (C.lookup(dg.get(), "bb").indexOf(target) < 0) asked++; score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; next(); } };
    bClear.onclick = function () { dg.set([]); update([]); };
    bHear.onclick = function () { var m = quiz ? target : C.lookup(dg.get(), "bb")[0]; if (m == null && !dg.get().length) m = 67; if (m != null) play([m], sel.value, 1.2); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    setMode(false);
  }

  // ---------- trills ----------
  function trills(root) {
    var bar = el("div", "clp-bar"), sel = instSelect("clp-t-inst", ["bb", "a"]); bar.appendChild(sel); root.appendChild(bar);
    var grid = el("div", "clp-tgrid"); root.appendChild(grid);
    C.TRILLS.forEach(function (t) {
      var card = el("div", "clp-tcard"), lab = el("div", "clp-tlab", C.both(t.from).replace(/\d/, "") + " to " + C.both(t.to).replace(/\d/, "") + (t.unsure ? " <span title='Hard to read on the scan, or it does not agree with the main chart: check with your teacher.'>*</span>" : ""));
      var st = el("div", "clp-staff clp-staff-s"), d = el("div", "clp-d clp-d-s"), b = el("button", "btn btn-sm btn-outline-primary", "▶ Trill");
      b.type = "button"; card.appendChild(lab); card.appendChild(st); card.appendChild(d); card.appendChild(b); grid.appendChild(card);
      var flat = /♭/.test(C.name(t.from)) ? "flat" : "sharp";
      staff(st, [abcNote(t.from, flat), abcNote(t.to, flat)], 90);
      C.diagram(d, { small: true, label: "Trill " + C.both(t.from) + " to " + C.both(t.to) }).set(t.hold, t.trill);
      b.onclick = function () { var l = []; for (var i = 0; i < 12; i++) l.push(i % 2 ? t.to : t.from); play(l, sel.value, 0.11); };
    });
    root.appendChild(el("p", "clp-muted", "Dark keys stay down; move the <strong>gray</strong> key(s) quickly to trill. Some notes have two ways: each is its own card. * = hard to read on the scanned chart, or it disagrees with the main chart: check it with your teacher."));
  }

  var api = { sound: sound, play: play, abcNote: abcNote, staff: staff, explorer: explorer, builder: builder, trills: trills };
  global.ClarPage = api;
})(typeof window !== "undefined" ? window : globalThis);
