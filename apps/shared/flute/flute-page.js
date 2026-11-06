// flute-page.js — the interactive parts of lessons/flute.qmd. Needs FluteChart (flute-chart.js), ABCJS (load abcjs-basic.js on the page).
//   FlutePage.sound()                    -> Promise { ac, out }   one AudioContext for the page, registered with AudioTap
//   FlutePage.abcNote(m, "sharp"|"flat") -> ABC for a note ("^F", "_B", "c'")
//   FlutePage.explorer(el)   the fingering chart: pick a note, see the usual and alternate fingerings, hear it
//   FlutePage.builder(el)    press keys on a blank diagram: which note is that? And a quiz: build the fingering for a note
//   FlutePage.trills(el)     the trill chart: hold the dark keys, move the gray ones
// The flute is non-transposing: written = sounding. Most fingerings serve two octaves, so the builder names the note letter, not the octave.
(function (global) {
  "use strict";
  var C = global.FluteChart, snd = null;

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Flute");
      res({ ac: ac, out: out });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(list, step) {   // notes one after another (step seconds each)
    return sound().then(function (s) { var t = s.ac.currentTime + 0.05; list.forEach(function (m, i) { C.tone(s.ac, s.out, m, t + i * step, step * 0.95); }); });
  }
  function abcNote(m, how) {
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1;
    var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
    var n = (how === "flat" ? FL : SH)[pc], acc = n.length > 1 ? n[0] : "", L = n[n.length - 1];
    if (oct >= 5) return acc + L.toLowerCase() + "'".repeat(oct - 5);
    return acc + L + ",".repeat(4 - oct);
  }
  function staff(el, notes, w) {
    if (!global.ABCJS) { el.textContent = ""; return; }
    ABCJS.renderAbc(el, "X:1\nL:1/1\nK:C clef=treble\n" + notes.join(" ") + "|]", { staffwidth: w || 120, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 0.9 });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function letter(m) { return C.both(m).replace(/\d+$/, ""); }
  function letters(ms) { var seen = {}, out = []; ms.forEach(function (m) { var l = letter(m); if (!seen[l]) { seen[l] = 1; out.push(l); } }); return out; }

  // ---------- the chart ----------
  function explorer(root) {
    var strip = el("div", "flp-strip"), card = el("div", "flp-card");
    root.appendChild(strip); root.appendChild(card);
    var cur = 67;
    [["Low (C4-B4)", 60, 71], ["Middle (C5-B5)", 72, 83], ["High (C6-C7)", 84, 96]].forEach(function (g) {
      var row = el("div", "flp-row"); row.appendChild(el("span", "flp-rowlab", g[0]));
      for (var m = g[1]; m <= g[2]; m++) (function (m) {
        var b = el("button", "btn btn-sm btn-outline-secondary flp-nb", letter(m)); b.type = "button"; b.dataset.m = m;
        b.title = C.both(m); b.onclick = function () { cur = m; show(true); }; row.appendChild(b);
      })(m);
      strip.appendChild(row);
    });
    function show(hear) {
      strip.querySelectorAll(".flp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === cur); });
      var fs = C.FINGERINGS[cur];
      card.innerHTML = "";
      var head = el("div", "flp-head"), st = el("div", "flp-staff"); head.appendChild(st);
      var nm = el("div", "flp-names");
      nm.innerHTML = "<div class='flp-big'>" + C.both(cur) + "</div><div class='flp-muted'>written and sounding pitch are the same on the flute</div>";
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([cur], 1.2); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      var pc = ((cur % 12) + 12) % 12, sharpish = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      staff(st, sharpish ? [abcNote(cur, "sharp"), abcNote(cur, "flat")] : [abcNote(cur)], sharpish ? 130 : 80);
      var row = el("div", "flp-diags");
      fs.forEach(function (f, i) {
        var box = el("figure", "flp-fig"), d = el("div", "flp-d"); box.appendChild(d);
        C.diagram(d, { label: C.both(cur) + (i ? " alternate " + i : "") }).set(f);
        box.appendChild(el("figcaption", null, i === 0 ? "Usual" : "Alternate " + (fs.length > 2 ? i : "")));
        row.appendChild(box);
      });
      card.appendChild(row);
      card.appendChild(el("p", "flp-muted", fs.length > 1 ? "The first is the one most people use. The alternates help in fast passages: pick the one that moves the fewest fingers from the note before." :
        "Dark = pressed down. Hover over (or long-press) a key for its name. Many notes use the same fingers in two octaves: the octave comes from your air and lips."));
      if (hear) play([cur], 1.2);
    }
    show(false);
  }

  // ---------- build a fingering ----------
  function builder(root) {
    var bar = el("div", "flp-bar"), mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "What note is this?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: finger this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode); root.appendChild(bar);
    var wrap = el("div", "flp-build"), dEl = el("div", "flp-d flp-d-big"), side = el("div", "flp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "flp-ask"), st = el("div", "flp-staff"), out = el("div", "flp-out", ""), btns = el("div", "flp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Clear keys"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "flp-muted", ""); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true;
    var dg = C.diagram(dEl, { onToggle: update, label: "Flute keys: click to press" });
    function update(keys) {
      if (quiz) { out.textContent = ""; return; }
      var ms = C.lookup(keys); st.innerHTML = "";
      if (ms.length) {
        out.innerHTML = "That plays <strong>" + letters(ms).join(" or ") + "</strong> (" + ms.map(C.both).join(", ") + ").";
        staff(st, [abcNote(ms[0], [70, 82, 63, 75, 87, 68, 80, 92].indexOf(ms[0]) >= 0 ? "flat" : "sharp")], 80);
      } else out.textContent = keys.length ? "That's not a fingering on the chart. Keep going, or clear and start again." : "No keys pressed: that is not on the chart.";
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
      ask.innerHTML = "Finger <strong>" + C.both(target) + "</strong>, then press Check.";
      staff(st, [abcNote(target, [1, 3, 6, 8, 10].indexOf(target % 12) >= 0 && Math.random() < 0.5 ? "flat" : "sharp")], 80);
      out.textContent = "";
    }
    bCheck.onclick = function () {
      if (!quiz) return;
      var keys = dg.get(), ok = C.FINGERINGS[target].some(function (f) { return C.sameSet(f, keys); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='flp-good'>✓ Yes!</span>"; play([target], 1); setTimeout(next, 1200); }
      else { firstTry = false; var ms = C.lookup(keys); out.innerHTML = "<span class='flp-bad'>Not yet.</span> " + (ms.length ? "That fingering plays " + letters(ms).join(" or ") + "." : "That isn't a fingering on the chart."); }
      score.textContent = asked ? right + " of " + asked + " right on the first try." : "";
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; dg.set(C.FINGERINGS[target][0]); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (C.lookup(dg.get()).indexOf(target) < 0) asked++; score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; next(); } };
    bClear.onclick = function () { dg.set([]); update([]); };
    bHear.onclick = function () { var m = quiz ? target : C.lookup(dg.get())[0]; if (m != null) play([m], 1.2); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    setMode(false);
  }

  // spelling as the chart prints it: A♯ to B and D♯ to E sharp; F to G♭, C to D♭ and anything with E♭ / A♭ / B♭ flat; the rest sharp
  function trillFlat(t) {
    var a = t.from % 12, b = t.to % 12;
    if ((a === 10 && b === 11) || (a === 3 && b === 4)) return "sharp";
    return [a, b].some(function (p) { return p === 3 || p === 8 || p === 10; }) || (a === 0 && b === 1) || (a === 5 && b === 6) ? "flat" : "sharp";
  }
  // ---------- trills ----------
  function trills(root) {
    var grid = el("div", "flp-tgrid"); root.appendChild(grid);
    C.TRILLS.forEach(function (t) {
      var card = el("div", "flp-tcard"), fl = trillFlat(t);
      var lab = el("div", "flp-tlab", C.name(t.from, fl) + " to " + C.name(t.to, fl).replace(/\d+$/, "") + (t.unsure ? " <span title='A gray key could not be read with certainty in the scanned chart: check with your teacher.'>*</span>" : ""));
      var st = el("div", "flp-staff flp-staff-s"), d = el("div", "flp-d flp-d-s"), b = el("button", "btn btn-sm btn-outline-primary", "▶ Trill");
      b.type = "button"; card.appendChild(lab); card.appendChild(st); card.appendChild(d); card.appendChild(b); grid.appendChild(card);
      staff(st, [abcNote(t.from, fl), abcNote(t.to, fl)], 90);
      C.diagram(d, { small: true, label: "Trill " + C.both(t.from) + " to " + C.both(t.to) }).set(t.hold, t.trill);
      b.onclick = function () { var l = []; for (var i = 0; i < 12; i++) l.push(i % 2 ? t.to : t.from); play(l, 0.11); };
    });
    root.appendChild(el("p", "flp-muted", "Dark keys stay down; move the <strong>gray</strong> key(s) quickly to trill. * = a gray key was hard to read in the printed chart: check it with your teacher."));
  }

  var api = { sound: sound, play: play, abcNote: abcNote, staff: staff, explorer: explorer, builder: builder, trills: trills };
  global.FlutePage = api;
})(typeof window !== "undefined" ? window : globalThis);
