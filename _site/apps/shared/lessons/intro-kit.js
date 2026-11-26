// intro-kit.js — "Meet the Instruments" lessons (lessons/intro-<id>.qmd): one beginner page per synth, drum machine or sequencer.
// It reuses the compare pages' widgets (does not change them) and drives them through their public methods:
//   <div class="ik-box" data-kind="synth|drum|seq" data-id="tb303"><div class="scmp|dcmp|sqc"></div></div>
//     the widget is shown compact: only this instrument's panel (the translated panel, report and plots hidden by CSS / classes).
//   <div class="ik-step" data-...>text</div>  a tour step; the kit puts a "▶ Hear step N" button in front of it which sets the
//     instrument to the step's starting patch / pattern and plays it:
//       synth: data-ex="<SynthCompare example id>" data-set='{"key": value, ...}'   (W.load, W.set(id, k, v, true), W.phrase([id]))
//       Model D: data-sheet="<moog-sheets.json id>" (MoogSheet.toState; the sheet is drawn under the step with MoogSheet.draw)
//       drum: data-pat='{"bpm":..,"rows":{"kick":"x...x..."},"kit":{},"shuffle":..}' ('.' rest, x hit, X accented hit,
//             1-3 LinnDrum level, a-z MPC velocity soft..hard)   (W.setA(state), W.play(["a"]))
//       seq:  data-seq='{machine data, as SequencerCompare.blank(id)}'   (W.src = id; W.set(id, data); W.play("src"))
//   <div class="ik-q" data-a="<index of right answer>"><p>question</p><ul><li>choice</li>...</ul><p class="ik-why">why</p></div>
//     a self-check question: click a choice, it says right / try again at once; nothing is recorded.
// Compare pages: with this file loaded, ?synth=<id> / ?machine=<id> / ?seq=<id> picks that instrument in the compare widget.
// API: IntroKit.steps (the step elements), IntroKit.play(i) -> Promise, IntroKit.level(ms) -> Promise of the peak level heard.
(function () {
  "use strict";
  var IK = { steps: [] };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function box() { return document.querySelector(".ik-box"); }
  function kind() { var b = box(); return b ? b.dataset.kind : null; }
  function id() { var b = box(); return b ? b.dataset.id : null; }
  function W() {
    var k = kind();
    if (k === "synth") return window.SynthCompare && SynthCompare.widgets[0];
    if (k === "drum") return window.DrumCompare && DrumCompare.widgets[0];
    if (k === "seq") return window.SequencerCompare && SequencerCompare.widgets[0];
  }
  // ---------- compact view: hide everything that is about a second instrument ----------
  function compact() {
    var b = box(); if (!b) return; var me = id();
    b.querySelectorAll(".scmp-panel").forEach(function (p) { p.classList.toggle("ik-hide", !p.classList.contains("scmp-" + me)); });
  }
  function partner(me) { return me === "moog" ? "prophet" : "moog"; }
  // ---------- drum pattern shorthand ----------
  function cell(ch, machine) {
    if (ch === ".") return 0;
    if (machine === "linn" && /[1-3]/.test(ch)) return { l: +ch };
    if (machine === "mpc60" && /[a-z]/.test(ch)) return { v: Math.round((0.3 + 0.7 * (ch.charCodeAt(0) - 97) / 25) * 100) / 100 };
    if (ch === "X") return { v: 0.75, a: true };
    return machine === "linn" ? { l: 2 } : { v: 0.75 };
  }
  function drumState(p) {
    var s = JSON.parse(JSON.stringify(p)); s.machine = id(); var rows = {};
    for (var c in p.rows) rows[c] = Array.isArray(p.rows[c]) ? p.rows[c] : p.rows[c].split("").map(function (ch) { return cell(ch, s.machine); });
    s.rows = rows; if (typeof p.acc === "string") s.acc = p.acc.split("").map(function (ch) { return ch !== "."; });
    return s;
  }
  // ---------- one step ----------
  IK.play = function (i) {
    var st = IK.steps[i], w = W(), me = id(); if (!st || !w) return Promise.resolve(false);
    IK.steps.forEach(function (s, j) { s.classList.toggle("ik-now", j === i); });
    var d = st.dataset;
    if (kind() === "synth") {
      w.stop();
      if (d.sheet) {
        if (!w.ex || w.ex.from !== "moog") w.load("fat-bass");
        var e = (IK.sheets || []).filter(function (x) { return x.id === d.sheet; })[0];
        if (e && window.MoogSheet) { var stt = MoogSheet.toState(e.sheet); for (var k in stt) w.set("moog", k, stt[k], true); }
      } else {
        w.load(d.ex);
        if (w.a !== me) w.pick(me, partner(me));
      }
      var set = d.set ? JSON.parse(d.set) : {}; for (var k2 in set) w.set(me, k2, set[k2], true);
      compact();
      return Promise.resolve(w.phrase([me])).then(function () { return true; });
    }
    if (kind() === "drum") { w.stop(); w.setA(drumState(JSON.parse(d.pat))); return Promise.resolve(w.play(["a"])).then(function () { return true; }); }
    if (kind() === "seq") {
      w.stop(); w.src = me; if (w.dst === me) w.dst = me === "tb303" ? "a960" : "tb303";
      w.set(me, JSON.parse(d.seq)); return Promise.resolve(w.play("src")).then(function () { return true; });
    }
    return Promise.resolve(false);
  };
  IK.stop = function () { var w = W(); if (w) w.stop(); IK.steps.forEach(function (s) { s.classList.remove("ik-now"); }); };
  IK.analyser = function () { var w = W(); if (!w) return null; return kind() === "synth" ? w.analyser(id()) : w.analyser(); };
  IK.level = function (ms) {
    return new Promise(function (res) {
      var a = IK.analyser(); if (!a) return res(0); var buf = new Float32Array(a.fftSize), m = 0;
      var iv = setInterval(function () { a.getFloatTimeDomainData(buf); for (var i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); }, 20);
      setTimeout(function () { clearInterval(iv); res(m); }, ms || 800);
    });
  };
  // ---------- quiz ----------
  function quiz(q) {
    var right = +q.dataset.a, lis = q.querySelectorAll("li"), fb = el("p", "ik-fb"); fb.setAttribute("aria-live", "polite");
    var why = q.querySelector(".ik-why"); if (why) why.hidden = true;
    q.appendChild(fb);
    lis.forEach(function (li, i) {
      var b = el("button", "btn btn-sm btn-outline-secondary ik-choice"); b.type = "button";
      while (li.firstChild) b.appendChild(li.firstChild); li.appendChild(b);
      b.onclick = function () {
        lis.forEach(function (x) { x.querySelector("button").classList.remove("ik-right", "ik-wrong"); });
        var ok = i === right; b.classList.add(ok ? "ik-right" : "ik-wrong");
        fb.textContent = ok ? "✓ Right." : "Not quite. Try another answer.";
        fb.className = "ik-fb " + (ok ? "ik-fb-ok" : "ik-fb-no"); q.dataset.done = ok ? "1" : "";
        if (why) why.hidden = !ok;
      };
    });
  }
  // ---------- set up ----------
  function init() {
    var b = box();
    if (!b) return preselect();
    b.classList.add("ik-compact", "ik-" + kind());
    var w = W();
    if (kind() === "synth" && w) {
      var me = id();
      if (w.a !== me) w.pick(me, partner(me));
      var host = b.querySelector(".scmp-panels"); if (host && window.MutationObserver) new MutationObserver(compact).observe(host, { childList: true });
      compact();
    }
    IK.steps = Array.prototype.slice.call(document.querySelectorAll(".ik-step"));
    IK.steps.forEach(function (s, i) {
      var bar = el("div", "ik-bar"), p = el("button", "btn btn-sm btn-primary ik-play", "▶ Hear step " + (i + 1)), st = el("button", "btn btn-sm btn-outline-secondary", "■ Stop");
      p.type = st.type = "button"; p.onclick = function () { IK.play(i); }; st.onclick = IK.stop;
      bar.appendChild(p); bar.appendChild(st); s.insertBefore(bar, s.firstChild);
    });
    if (document.querySelector(".ik-step[data-sheet]")) {
      IK.ready = fetch("/apps/shared/data/moog-sheets.json").then(function (r) { return r.json(); }).then(function (list) {
        IK.sheets = list;
        IK.steps.forEach(function (s) {
          if (!s.dataset.sheet || !window.MoogSheet) return;
          var e = list.filter(function (x) { return x.id === s.dataset.sheet; })[0]; if (!e) return;
          var f = el("details", "ik-sheet"), sm = el("summary", null, "Show the patch sheet: " + e.name + " (manual p. " + e.page + ")"), pap = el("div", "ik-paper");
          f.appendChild(sm); f.appendChild(pap); s.appendChild(f);
          f.addEventListener("toggle", function () { if (f.open && !pap.firstChild) MoogSheet.draw(pap, e, {}); });
        });
      });
    } else IK.ready = Promise.resolve();
    document.querySelectorAll(".ik-q").forEach(quiz);
  }
  // compare pages: ?synth= / ?machine= / ?seq=
  function preselect() {
    var q = new URLSearchParams(location.search), v;
    if ((v = q.get("synth")) && window.SynthCompare && SynthCompare.widgets[0] && SynthCompare.PROFILES[v]) {
      var w = SynthCompare.widgets[0], ex = SynthCompare.EXAMPLES.filter(function (x) { return x.from === v; })[0];
      if (ex) w.load(ex.id); else w.pick(v, partner(v));
      scrollTo(".scmp");
    }
    if ((v = q.get("machine")) && window.DrumCompare && DrumCompare.widgets[0] && DrumCompare.MACHINES[v]) {
      var dx = DrumCompare.EXAMPLES.filter(function (x) { return x.from === v; })[0]; if (dx) DrumCompare.widgets[0].load(dx.id); scrollTo(".dcmp");
    }
    if ((v = q.get("seq")) && window.SequencerCompare && SequencerCompare.widgets[0] && SequencerCompare.MACHINES[v]) {
      var sx = SequencerCompare.EXAMPLES.filter(function (x) { return x.from === v; })[0]; if (sx) SequencerCompare.widgets[0].load(sx.id); scrollTo(".sqc");
    }
  }
  function scrollTo(sel) { var e = document.querySelector(sel); if (e && e.scrollIntoView) setTimeout(function () { e.scrollIntoView({ block: "start" }); }, 300); }
  function go() { setTimeout(init, 0); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  window.IntroKit = IK;
})();
