// ebass-page.js — widgets for lessons/electric-bass.qmd (global EBassPage): explorer (click a fret, pick a note), quiz (find the note),
// strings (hear the open strings, tuning). Sound: the band's "ebass" samples (BandSounds, apps/shared/band/sounds.js) on one
// AudioContext registered with AudioTap; if the samples cannot be fetched, a plain plucked-sounding synth. Staff: abcjs (load it on the page).
//   EBassPage.play(soundingMidi, dur)   Promise; tests replace it
(function (g) {
  "use strict";
  var C = g.EBassChart, snd = null;

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = g.AudioContext || g.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (g.AudioTap) g.AudioTap.register(ac, out, "Electric bass");
      var bank = g.BandSounds ? g.BandSounds.create(ac) : null;
      var ready = bank ? bank.load(["ebass"]).then(function () { return bank.has("ebass"); }, function () { return false; }) : Promise.resolve(false);
      ready.then(function (ok) { res({ ac: ac, out: out, bank: ok ? bank : null }); });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function synth(s, m, dur) {   // fallback: a low triangle + a touch of the octave, quick decay
    var t = s.ac.currentTime + 0.02, f = C.freq(m), gn = s.ac.createGain(), o = s.ac.createOscillator(), o2 = s.ac.createOscillator();
    o.type = "triangle"; o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f * 2;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.5, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); o2.connect(gn); gn.connect(s.out); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function play(m, dur) {
    dur = dur || 1.4;
    return api.sound().then(function (s) {
      if (s.bank) s.bank.play("ebass", { midi: m, vel: 0.8, dur: dur }, s.ac.currentTime + 0.02, s.out); else synth(s, m, dur);
    });
  }
  function playList(list, step) {
    return api.sound().then(function () { list.forEach(function (m, i) { setTimeout(function () { api.play(m, step * 1.6); }, i * step * 1000); }); });
  }
  function staff(host, soundingMidi) {
    if (!g.ABCJS) { host.textContent = ""; return; }
    var w = C.written(soundingMidi);
    g.ABCJS.renderAbc(host, "X:1\nL:1/1\nK:C clef=bass\n" + C.abc(w) + "|]", { staffwidth: 110, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 1 });
  }
  function posText(m) {
    return C.positions(m).map(function (p) { return C.STRINGS.filter(function (s) { return s.id === p.s; })[0].name + " string, " + (p.f === 0 ? "open" : "fret " + p.f); }).join("; ");
  }
  function h(tag, cls, text, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  function checkbox(bar, label, fn) {
    var l = h("label", "ebp-lab", null, bar), c = h("input", null, null, l); c.type = "checkbox"; l.appendChild(document.createTextNode(label)); c.addEventListener("change", function () { fn(c.checked); }); return c;
  }

  function explorer(root) {
    var bar = h("div", "ebp-bar", null, root), names = false;
    checkbox(bar, "Show every note name", function (v) { names = v; fb.names(v); redraw(); });
    var pcs = h("div", "ebp-pcs", null, root), cur = null, curPc = null;
    var fb = C.diagram(root, { onPick: function (s, f, m) { choose(m, s, f); } });
    var card = h("div", "ebp-card", null, root);
    var pcBtns = [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3].map(function (pc) {
      var b = h("button", "btn btn-outline-secondary btn-sm ebp-pc", C.pcName(pc, true), pcs); b.type = "button"; b.dataset.pc = pc;
      b.addEventListener("click", function () { pick(pc); }); return b;
    });
    function redraw() {
      var marks = [];
      if (curPc != null) {
        for (var m = C.LOW; m <= C.HIGH; m++) if (m % 12 === curPc) C.positions(m).forEach(function (p) { marks.push({ s: p.s, f: p.f, cls: "ebc-same", text: C.name(m) }); });
      }
      if (cur) marks.push({ s: cur.s, f: cur.f, cls: "", text: C.name(cur.m) });
      fb.mark(marks);
      pcBtns.forEach(function (b) { b.classList.toggle("ebp-sel", +b.dataset.pc === curPc); });
    }
    function choose(m, s, f) {
      cur = { m: m, s: s, f: f }; curPc = null;
      // the same pitch elsewhere on the neck is orange
      var marks = C.positions(m).filter(function (p) { return !(p.s === s && p.f === f); }).map(function (p) { return { s: p.s, f: p.f, cls: "ebc-same", text: C.name(m) }; });
      marks.push({ s: s, f: f, cls: "", text: C.name(m) }); fb.mark(marks);
      pcBtns.forEach(function (b) { b.classList.remove("ebp-sel"); });
      card.innerHTML = "";
      var head = h("div", "ebp-head", null, card), big = h("div", "ebp-big", C.name(m, false) + (C.pcName(m % 12, true).indexOf("/") > 0 ? "  (" + C.name(m, true) + ")" : ""), head);
      var st = h("div", "ebp-staff", null, head); staff(st, m);
      var fg = C.finger(f);
      h("p", "ebp-muted", "String " + C.STRINGS.filter(function (x) { return x.id === s; })[0].name + ", " + (f === 0 ? "open string" : "fret " + f) +
        (f === 0 ? "." : fg ? "; first position, so use finger " + fg + "." : "; above fret 4 the hand moves up the neck (the book's chart stops near fret 5; the hand shift is not from the book, unverified).") +
        " Written an octave up (" + C.name(C.written(m)) + "); it sounds " + C.name(m) + ", about " + C.freq(m).toFixed(1) + " Hz.", card);
      h("p", "ebp-muted", "Every place to play this exact pitch (orange on the neck): " + posText(m) + ".", card);
      var b = h("button", "btn btn-primary btn-sm", "Hear it", card); b.type = "button"; b.addEventListener("click", function () { api.play(m); });
      api.play(m);
    }
    function pick(pc) {
      curPc = pc; cur = null; redraw(); card.innerHTML = "";
      var lines = []; var list = [];
      for (var m = C.LOW; m <= C.HIGH; m++) if (m % 12 === pc) { lines.push(C.name(m) + ": " + posText(m)); list.push(m); }
      h("div", "ebp-big", C.pcName(pc, true), card);
      lines.forEach(function (l) { h("p", "ebp-muted", l, card); });
      var b = h("button", "btn btn-primary btn-sm", "Hear them, low to high", card); b.type = "button"; b.addEventListener("click", function () { playList(list, 0.7); });
    }
    h("p", "ebp-muted", "Click a fret to see and hear its note, and every other place that pitch lives (orange). Or pick a note name above to light every position of it.", card);
    explorer.last = { choose: choose, pick: pick, root: root };
  }

  function quiz(root) {
    var bar = h("div", "ebp-bar", null, root), mode = "staff";
    var sel = h("select", "form-select form-select-sm", null, bar);
    [["staff", "Notes on the staff (exact pitch)"], ["name", "Note names (any octave)"]].forEach(function (o) { var op = h("option", null, o[1], sel); op.value = o[0]; });
    sel.addEventListener("change", function () { mode = sel.value; next(); });
    var maxSel = h("select", "form-select form-select-sm", null, bar);
    [[5, "Frets 0-5"], [12, "Frets 0-12"]].forEach(function (o) { var op = h("option", null, o[1], maxSel); op.value = o[0]; });
    maxSel.addEventListener("change", next);
    var ask = h("div", "ebp-ask", null, root), st = h("div", "ebp-staff", null, root);
    var fb = C.diagram(root, { onPick: onPick }), out = h("div", "ebp-out", null, root), btns = h("div", "ebp-bar", null, root);
    var show = h("button", "btn btn-outline-secondary btn-sm", "Show me", btns), nx = h("button", "btn btn-primary btn-sm", "Next note", btns), score = h("span", "ebp-muted", "", btns);
    show.type = nx.type = "button";
    var target = null, right = 0, asked = 0, done = false, tries = 0;
    function rnd() {
      var mf = +maxSel.value, pool = [];
      for (var m = C.LOW; m <= C.HIGH; m++) if (C.positions(m, mf).length) pool.push(m);
      var m2; do { m2 = pool[Math.floor(Math.random() * pool.length)]; } while (m2 === target && pool.length > 1);
      return m2;
    }
    function upd() { score.textContent = "Score: " + right + " of " + asked + " right first time."; }
    function next() {
      target = rnd(); done = false; tries = 0; asked++; fb.clear(); out.textContent = ""; upd();
      if (mode === "staff") { ask.textContent = "Find this note (it is written an octave above where it sounds):"; staff(st, target); }
      else { st.innerHTML = ""; ask.textContent = "Find " + C.pcName(target % 12, true) + " anywhere on the fretboard."; }
    }
    function ok(m) { return mode === "staff" ? m === target : m % 12 === target % 12; }
    function onPick(s, f, m) {
      if (done) return; api.play(m);
      var good = ok(m) && f <= +maxSel.value;
      if (good) {
        done = true; if (tries === 0) right++; upd(); fb.mark([{ s: s, f: f, cls: "ebc-good", text: C.name(m) }]);
        out.innerHTML = ""; h("span", "ebp-good", "Yes, " + C.name(m) + ". ", out); out.appendChild(document.createTextNode("Other places: " + posText(target) + "."));
      } else {
        tries++; fb.mark([{ s: s, f: f, cls: "ebc-bad", text: C.name(m) }]);
        out.innerHTML = ""; h("span", "ebp-bad", "That is " + C.name(m) + ". ", out); out.appendChild(document.createTextNode("Try again."));
      }
    }
    show.addEventListener("click", function () {
      if (!target) return; var mf = +maxSel.value;
      var marks = []; for (var m = C.LOW; m <= C.HIGH; m++) if (ok(m)) C.positions(m, mf).forEach(function (p) { marks.push({ s: p.s, f: p.f, cls: "ebc-show", text: C.name(m) }); });
      fb.mark(marks); if (!done) { done = true; tries++; } api.play(target);
    });
    nx.addEventListener("click", next);
    next();
    quiz.last = { onPick: onPick, ok: ok, target: function () { return target; }, root: root };
  }

  function strings(root) {
    var grid = h("div", "ebp-open", null, root);
    C.STRINGS.slice().reverse().forEach(function (s) {
      var c = h("div", "ebp-ocard", null, grid), b = h("button", "btn btn-outline-primary btn-sm", "Hear " + s.name, c);
      b.type = "button"; b.dataset.m = s.midi; b.addEventListener("click", function () { api.play(s.midi, 2.2); });
      h("div", "ebp-muted", "String " + s.id + ": " + C.name(s.midi) + ", about " + C.freq(s.midi).toFixed(1) + " Hz", c);
    });
    var bar = h("div", "ebp-bar", null, root), all = h("button", "btn btn-primary btn-sm", "Hear all four, low to high", bar); all.type = "button";
    all.addEventListener("click", function () { playList(C.STRINGS.slice().reverse().map(function (s) { return s.midi; }), 1.0); });
    var f5 = h("button", "btn btn-outline-secondary btn-sm", "Tuning check: fret 5 of E, then open A", bar); f5.type = "button";
    f5.addEventListener("click", function () { playList([33, 33], 1.3); });
  }

  var api = { sound: sound, play: play, staff: staff, explorer: explorer, quiz: quiz, strings: strings, posText: posText };
  g.EBassPage = api;
})(window);
