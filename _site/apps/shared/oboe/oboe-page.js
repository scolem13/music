// oboe-page.js — the interactive parts of lessons/oboe.qmd. Needs OboeChart (oboe-chart.js) and ABCJS (load /apps/shared/abcjs-basic.js).
// Sound: the band's "oboe" samples when /apps/shared/band/sounds.js is on the page (BandSounds), else OboeChart.tone (synthesized).
//   OboePage.sound()                    -> Promise { ac, out, bank }   one AudioContext for the page, registered with AudioTap
//   OboePage.abcNote(m, "sharp"|"flat") -> ABC for a written note ("^F", "_B", "c'")
//   OboePage.explorer(el)   the fingering chart: pick a note, see the usual and alternate fingerings, hear it
//   OboePage.builder(el)    press keys on a blank diagram: which note is this? And a quiz: build the fingering for a note
//   OboePage.trills(el)     the trill chart: hold the black keys, move the gray ones
(function (global) {
  "use strict";
  var C = global.OboeChart, snd = null;

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(), bank = null; out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Oboe");
      if (global.BandSounds) { try { bank = BandSounds.create(ac); bank.load(["oboe"]).catch(function () { bank = null; }); } catch (e) { bank = null; } }
      res({ ac: ac, out: out, get bank() { return bank; } });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(list, step) {   // notes one after another (step seconds each); the band's oboe sample once it has loaded, else the synthesized tone
    return sound().then(function (s) {
      var t = s.ac.currentTime + 0.05, b = s.bank;
      list.forEach(function (m, i) {
        var when = t + i * step, dur = step * 0.95;
        if (b && b.has("oboe")) b.play("oboe", { midi: m, vel: 0.75, dur: dur }, when, s.out); else C.tone(s.ac, s.out, m, when, dur);
      });
    });
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

  // ---------- the chart ----------
  function explorer(root) {
    var strip = el("div", "obp-strip"), card = el("div", "obp-card");
    root.appendChild(strip); root.appendChild(card);
    var cur = 67;
    [["Low (B♭3 to A4)", 58, 69], ["Middle (B♭4 to D♯5)", 70, 75], ["Octave key (E5 to A5)", 76, 81], ["Top (A♯5 to D♯6)", 82, 87]].forEach(function (g) {
      var row = el("div", "obp-row"); row.appendChild(el("span", "obp-rowlab", g[0]));
      for (var m = g[1]; m <= g[2]; m++) (function (m) {
        var b = el("button", "btn btn-sm btn-outline-secondary obp-nb", C.both(m).replace(/\d+$/, "")); b.type = "button"; b.dataset.m = m;
        b.title = "Written " + C.both(m); b.onclick = function () { cur = m; show(true); }; row.appendChild(b);
      })(m);
      strip.appendChild(row);
    });
    function show(hear) {
      strip.querySelectorAll(".obp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === cur); });
      var fs = C.FINGERINGS[cur], labs = C.LABELS[cur] || [];
      card.innerHTML = "";
      var head = el("div", "obp-head"), st = el("div", "obp-staff"); head.appendChild(st);
      var nm = el("div", "obp-names");
      nm.innerHTML = "<div class='obp-big'>" + C.both(cur) + "</div><div class='obp-muted'>The oboe does not transpose: the note you finger is the note you hear.</div>";
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([cur], 1.2); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      var pc = ((cur % 12) + 12) % 12, sharpish = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      staff(st, sharpish ? [abcNote(cur, "sharp"), abcNote(cur, "flat")] : [abcNote(cur)], sharpish ? 130 : 80);
      var row = el("div", "obp-diags");
      fs.forEach(function (f, i) {
        var box = el("figure", "obp-fig"), d = el("div", "obp-d"); box.appendChild(d);
        OboeChart.diagram(d, { label: C.both(cur) + (i ? " alternate " + i : "") }).set(f);
        box.appendChild(el("figcaption", null, labs[i] || (i === 0 ? "Usual" : "Alternate " + (fs.length > 2 ? i : ""))));
        row.appendChild(box);
      });
      card.appendChild(row);
      card.appendChild(el("p", "obp-muted", fs.length > 1 ? "The first is the usual fingering. The alternate helps in some passages: pick the one that moves the fewest fingers from the note before." :
        "Dark = pressed down. Hover over (or long-press) a key for its name."));
      if (hear) play([cur], 1.2);
    }
    show(false);
  }

  // ---------- build a fingering ----------
  function builder(root) {
    var bar = el("div", "obp-bar");
    var mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "What note is this?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: finger this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode);
    root.appendChild(bar);
    var wrap = el("div", "obp-build"), dEl = el("div", "obp-d obp-d-big"), side = el("div", "obp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "obp-ask"), st = el("div", "obp-staff"), out = el("div", "obp-out", ""), btns = el("div", "obp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Clear keys"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "obp-muted", ""); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true;
    var dg = C.diagram(dEl, { onToggle: update, label: "Oboe keys: click to press" });
    function update(keys) {
      if (quiz) { out.textContent = ""; return; }
      var ms = C.lookup(keys);
      st.innerHTML = "";
      if (ms.length) { out.innerHTML = "That plays <strong>" + ms.map(C.both).join(" or ") + "</strong>."; staff(st, [abcNote(ms[0], [70, 75, 63, 80, 82].indexOf(ms[0]) >= 0 ? "flat" : "sharp")], 80); }
      else out.textContent = keys.length ? "That's not a fingering on the chart. Keep going, or clear and start again." : "No keys pressed: the chart has no note for that. Press holes to start.";
    }
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; dg.set([]); out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Click keys to press them. The page tells you which note that fingering plays.";
      if (q) next(); else update([]);
    }
    function next() {
      var pool = Object.keys(C.FINGERINGS).map(Number);
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set([]);
      ask.innerHTML = "Finger written <strong>" + C.both(target) + "</strong>, then press Check.";
      var pc = target % 12; staff(st, [abcNote(target, [1, 3, 6, 8, 10].indexOf(pc) >= 0 && Math.random() < 0.5 ? "flat" : "sharp")], 80);
      out.textContent = "";
    }
    bCheck.onclick = function () {
      if (!quiz) return;
      var keys = dg.get(), ok = C.FINGERINGS[target].some(function (f) { return C.sameSet(f, keys); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='obp-good'>✓ Yes!</span>"; play([target], 1); setTimeout(next, 1200); }
      else { firstTry = false; var ms = C.lookup(keys); out.innerHTML = "<span class='obp-bad'>Not yet.</span> " + (ms.length ? "That fingering plays " + ms.map(C.both).join(" or ") + "." : "That isn't a fingering on the chart."); }
      score.textContent = asked ? right + " of " + asked + " right on the first try." : "";
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; dg.set(C.FINGERINGS[target][0]); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (C.lookup(dg.get()).indexOf(target) < 0) asked++; score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; next(); } };
    bClear.onclick = function () { dg.set([]); update([]); };
    bHear.onclick = function () { var m = quiz ? target : C.lookup(dg.get())[0]; if (m != null) play([m], 1.2); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    setMode(false);
  }

  // ---------- trills ----------
  function trills(root) {
    var grid = el("div", "obp-tgrid"); root.appendChild(grid);
    C.TRILLS.forEach(function (t) {
      var card = el("div", "obp-tcard"), lab = el("div", "obp-tlab", t.label + (t.unsure ? " <span title='Which lobe of the pinky keys moves was hard to read in the scanned chart: check with your teacher.'>*</span>" : ""));
      var st = el("div", "obp-staff obp-staff-s"), d = el("div", "obp-d obp-d-s"), b = el("button", "btn btn-sm btn-outline-primary", "▶ Trill");
      b.type = "button"; card.appendChild(lab); card.appendChild(st); card.appendChild(d); card.appendChild(b); grid.appendChild(card);
      var flat = /♭/.test(t.label) ? "flat" : "sharp";
      staff(st, [abcNote(t.from, flat), abcNote(t.to, flat)], 90);
      C.diagram(d, { small: true, label: "Trill " + C.both(t.from) + " to " + C.both(t.to) }).set(t.hold, t.trill);
      b.onclick = function () { var l = []; for (var i = 0; i < 12; i++) l.push(i % 2 ? t.to : t.from); play(l, 0.11); };
    });
    root.appendChild(el("p", "obp-muted", "Dark keys stay down; move the <strong>gray</strong> key(s) quickly to trill. * = the gray key was hard to read in the printed chart: check it with your teacher."));
  }

  global.OboePage = { sound: sound, play: play, abcNote: abcNote, staff: staff, explorer: explorer, builder: builder, trills: trills };
})(typeof window !== "undefined" ? window : globalThis);
