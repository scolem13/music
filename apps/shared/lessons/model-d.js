// Play the Minimoog Model D on the manual's own panel drawing (MoogSheet.draw, interactive) wired to the
// SynthCompare Model D engine (SynthCompare.voice "moog"). <div class="model-d"></div>; needs synth-compare.js
// and moog-sheet.js loaded first. Every knob change re-sends the patch (MoogSheet.toState). Play by: the on-screen
// keys, the computer keys (A W S E D F T G Y H U J K = C..C, Z / X = octave down / up), Web MIDI note on/off and
// CC1 (mod wheel) and pitch bend (0xE0, 14-bit, centre 8192). Two wheels left of the keys: pitch (springs back to
// centre) and mod (stays). Pitch range a fifth up and down (M 24, 80; engine bend 7). The drawn wheels on the Real panel move
// the engine too; a sheet's printed pitch-wheel position is not applied on load (the wheel springs back). Start patch: a sheet from moog-sheets.json, or "Basic" = SynthCompare's default.
// API: ModelD.mount(div) -> { load(entry), noteOn(n), noteOff(n), state(), bend(v -1..1), mod(v 0..1) }; ModelD.last = the newest mount.
(function () {
  var KEYS = "awsedftgyhujk";
  var MD = window.ModelD = {};
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  MD.mount = function (host) {
    var MS = window.MoogSheet, SC = window.SynthCompare;
    host.classList.add("md-w"); host.innerHTML = "";
    var bar = h("div", "md-bar"); host.appendChild(bar);
    var pick = h("select", "md-pick"); pick.setAttribute("aria-label", "Starting patch");
    var lab = h("label", "md-lab", "Patch "); lab.appendChild(pick); bar.appendChild(lab);
    var start = h("button", "md-start", "🔊 Sound on"); start.type = "button"; bar.appendChild(start);
    var octL = h("span", "md-oct"); bar.appendChild(octL);
    var midiL = h("span", "md-midi"); bar.appendChild(midiL);
    var viewB = h("div", "sp-seg md-view"); viewB.setAttribute("aria-label", "Panel view");
    [["simple", "Model D (simple)"], ["vital", "As Vital"], ["surge", "As Surge XT"], ["real", "Real panel"]].forEach(function (v) { var b = h("button", "sp-opt", v[1]); b.type = "button"; b.dataset.v = v[0];
      b.addEventListener("click", function () { view = v[0]; try { localStorage.setItem("md-view", view); } catch (e) {} draw(); }); viewB.appendChild(b); });
    bar.appendChild(viewB);
    var panel = h("div", "md-panel"); host.appendChild(panel);
    var play = h("div", "md-play"); host.appendChild(play);
    var wheels = h("div", "md-wheels"); play.appendChild(wheels);
    var kb = h("div", "md-kb"); kb.setAttribute("aria-label", "Keyboard"); play.appendChild(kb);
    var help = h("p", "md-help", "Simple panel: drag a slider (Shift = fine, double-click = reset, click the number to type one); click ▾ to fold a module; Beginner shows the main controls only. Real panel: the manual's drawing; drag a knob, click a switch. Play with the keys below, the computer keys A W S E D F T G Y H U J K (Z / X change octave), or a MIDI keyboard. The pitch wheel (left of the keys, or a MIDI keyboard's) bends a fifth up or down and springs back; the mod wheel stays where you leave it. This is the site's model, not a recording of a real Model D.");
    host.appendChild(help);

    var ac = null, an = null, voice = null, ready = null, entry = null, cur = null, sp = null, view = (function () { try { return localStorage.getItem("md-view"); } catch (e) {} })() || "simple", oct = 0, lowN = 48, down = {}, keyEls = {};
    function patch() { return cur; }
    function begin() {
      if (ready) return ready;
      var C = window.AudioContext || window.webkitAudioContext; ac = new C();
      var out = ac.createGain(); out.gain.value = 0.7; out.connect(ac.destination); an = ac.createAnalyser(); an.fftSize = 2048; out.connect(an);
      if (window.AudioTap && AudioTap.register) AudioTap.register(ac, out, "Model D");
      ready = SC.voice(ac, "moog", patch()).then(function (v) { voice = v; v.node.connect(out); sendWheel(); v.bendWheel(pitchV); if (sp) sp.start(); start.textContent = "🔊 Sound is on"; start.disabled = true; return v; });
      return ready;
    }
    var pitchV = 0, wheelUI = {};
    function sendWheel() { if (voice && entry && entry.wheel) voice.wheel(typeof entry.wheel.mod === "number" ? entry.wheel.mod : 0); if (wheelUI.mod) wheelUI.mod.show(); }
    function setBend(v) { pitchV = Math.max(-1, Math.min(1, +v || 0)); if (voice) voice.bendWheel(pitchV); if (wheelUI.pitch) wheelUI.pitch.show(); }
    function setMod(v) { if (!entry) return; entry.wheel = entry.wheel || {}; entry.wheel.mod = Math.max(0, Math.min(1, +v || 0)); sendWheel(); }
    function send() { if (voice) { voice.set(patch()); sendWheel(); } }
    function draw() {
      panel.innerHTML = ""; sp = null;
      [].forEach.call(viewB.children, function (b) { b.classList.toggle("sp-on", b.dataset.v === view); });
      var SV = window.SynthViews;
      if ((view === "vital" || view === "surge") && SV && SV[view]) {
        var V = SV[view], tv = V.toView(cur), rep = h("details", "md-rep");
        sp = window.SynthPanel.mount(panel, { spec: V.spec, state: tv.viewState, def: V.toView(SC.PROFILES.moog.def).viewState, store: view, analyser: function () { return an; },
          onChange: function (vs) { cur = V.toMoog(vs, cur); send(); } });
        rep.appendChild(h("summary", null, "How this Model D patch fits " + V.name + ": " + ["exact", "approx", "lost"].map(function (k) { return tv.report.filter(function (r) { return r.how === k; }).length + " " + k; }).join(", ")));
        var ul = h("ul"); tv.report.forEach(function (r) { ul.appendChild(h("li", "md-" + r.how, r.label + ": " + r.how + (r.note ? " (" + r.note + ")" : ""))); }); rep.appendChild(ul); panel.appendChild(rep);
        var go = h("p", "md-go"), sid = view === "vital" ? "vital" : "surge", slug = view === "vital" ? "vital" : "surge-xt";
        go.appendChild(document.createTextNode("This view still plays the Model D. To hear " + V.name + " itself (on this site's model of it): "));
        var a1 = h("a", null, "Meet " + V.name); a1.href = "/lessons/intro-" + slug + ".html"; go.appendChild(a1); go.appendChild(document.createTextNode(" · "));
        var a2 = h("a", null, "this patch's starting point turned into " + V.name + " on the compare page"); a2.href = "/lessons/synth-compare.html?synth=moog&to=" + sid; go.appendChild(a2);
        panel.appendChild(go);
      } else if (view === "simple") sp = window.SynthPanel.mount(panel, { spec: window.SynthPanel.SPECS.moog, state: cur, def: SC.PROFILES.moog.def, store: "moog",
        analyser: function () { return an; }, onChange: function (s) { cur = s; send(); } });
      else { entry.sheet = MS.fromState(cur); MS.draw(panel, entry, { interactive: true, large: true, onChange: function (n) { var pv = n.wheel && n.wheel.pitch; entry = n; cur = MS.toState(n.sheet); send(); if (typeof pv === "number" && pv !== pitchV) setBend(pv); } }); }
      if (voice) { voice.set(patch()); sendWheel(); }
    }
    MD.last = { load: function (e) { entry = JSON.parse(JSON.stringify(e)); cur = MS.toState(entry.sheet); draw(); }, view: function (v) { view = v; draw(); }, panel: function () { return sp; }, state: patch,
      noteOn: noteOn, noteOff: noteOff, bend: setBend, mod: setMod, get voice() { return voice; } };

    // pitch and mod wheels, left of the keys: drag up / down (pitch springs back on release), arrow keys when focused
    [["pitch", "Pitch"], ["mod", "Mod"]].forEach(function (w) {
      var which = w[0], box = h("div", "md-wheel md-wheel-" + which), well = h("div", "md-well"), knob = h("div", "md-knob");
      well.tabIndex = 0; well.setAttribute("role", "slider"); well.setAttribute("aria-label", w[1] + " wheel");
      well.setAttribute("aria-valuemin", which === "pitch" ? -1 : 0); well.setAttribute("aria-valuemax", 1);
      well.appendChild(knob); box.appendChild(well); box.appendChild(h("span", "md-wlab", w[1])); wheels.appendChild(box);
      function val() { return which === "pitch" ? pitchV : (entry && entry.wheel && typeof entry.wheel.mod === "number" ? entry.wheel.mod : 0); }
      function show() { var v = val(), f = which === "pitch" ? (1 - v) / 2 : 1 - v; knob.style.top = "calc(" + (f * 100) + "% - " + (f * 1.4) + "rem)"; well.setAttribute("aria-valuenow", v); }
      function put(v) { if (which === "pitch") setBend(v); else setMod(v); }
      function at(e) { var r = well.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); put(which === "pitch" ? 1 - 2 * f : 1 - f); }
      var drag = false;
      well.addEventListener("pointerdown", function (e) { e.preventDefault(); drag = true; try { well.setPointerCapture(e.pointerId); } catch (er) {} begin(); at(e); });
      well.addEventListener("pointermove", function (e) { if (drag) at(e); });
      function rel() { if (!drag) return; drag = false; if (which === "pitch") setBend(0); }
      well.addEventListener("pointerup", rel); well.addEventListener("pointercancel", rel);
      well.addEventListener("keydown", function (e) { var d = e.key === "ArrowUp" ? 0.1 : e.key === "ArrowDown" ? -0.1 : 0; if (!d) return; e.preventDefault(); put(val() + d); });
      if (which === "pitch") well.addEventListener("keyup", function (e) { if (e.key === "ArrowUp" || e.key === "ArrowDown") setBend(0); });
      wheelUI[which] = { show: show }; show();
    });

    function noteOn(n, vel) { if (down[n]) return; if (sp && !Object.keys(down).length) sp.gate(true); down[n] = 1; if (keyEls[n]) keyEls[n].classList.add("md-down");
      begin().then(function (v) { if (ac.state === "suspended") ac.resume(); v.noteOn(n, vel == null ? 0.8 : vel); }); }
    function noteOff(n) { if (!down[n]) return; delete down[n]; if (keyEls[n]) keyEls[n].classList.remove("md-down"); if (voice) voice.noteOff(n); if (sp && !Object.keys(down).length) sp.gate(false); }

    // the on-screen keyboard: 3 octaves from C3 (the Model D has 44 keys, F to C; this is shorter to fit a screen)
    (function () {
      var whites = 0;
      for (var n = lowN; n <= lowN + 36; n++) { var black = [1, 3, 6, 8, 10].indexOf(n % 12) >= 0;
        var k = h("div", "md-key " + (black ? "md-black" : "md-white")); k.dataset.n = n; keyEls[n] = k;
        if (black) k.style.left = "calc(" + whites + " * var(--md-w) - var(--md-w) * 0.32)"; else { k.style.left = "calc(" + whites + " * var(--md-w))"; whites++; }
        kb.appendChild(k); }
      kb.style.setProperty("--md-n", whites);
      var held = null;
      kb.addEventListener("pointerdown", function (e) { var k = e.target.closest(".md-key"); if (!k) return; e.preventDefault(); held = +k.dataset.n; noteOn(held); try { kb.setPointerCapture(e.pointerId); } catch (er) {} });
      kb.addEventListener("pointermove", function (e) { if (held == null) return; var t = document.elementFromPoint(e.clientX, e.clientY); var k = t && t.closest && t.closest(".md-key");
        if (k && +k.dataset.n !== held) { noteOff(held); held = +k.dataset.n; noteOn(held); } });
      function up() { if (held != null) noteOff(held); held = null; }
      kb.addEventListener("pointerup", up); kb.addEventListener("pointercancel", up);
    })();

    function showOct() { octL.textContent = "Computer keys: C" + (4 + oct) + " (Z / X)"; }
    showOct();
    document.addEventListener("keydown", function (e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (!host.getBoundingClientRect().height) return;
      var key = e.key.toLowerCase();
      if (key === "z" || key === "x") { oct = Math.max(-2, Math.min(2, oct + (key === "x" ? 1 : -1))); showOct(); return; }
      var i = KEYS.indexOf(key); if (i < 0) return; e.preventDefault(); noteOn(60 + i + oct * 12);
    });
    document.addEventListener("keyup", function (e) { var i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) noteOff(60 + i + oct * 12); });
    window.addEventListener("blur", function () { Object.keys(down).forEach(function (n) { noteOff(+n); }); });

    // MIDI in (notes and CC1)
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(function (m) {
        function hook() { var n = 0; m.inputs.forEach(function (i) { n++; i.onmidimessage = function (ev) { var d = ev.data, s = d[0] & 0xf0;
          if (s === 0x90 && d[2] > 0) noteOn(d[1], d[2] / 127); else if (s === 0x80 || (s === 0x90 && d[2] === 0)) noteOff(d[1]);
          else if (s === 0xb0 && d[1] === 1) setMod(d[2] / 127);
          else if (s === 0xe0) { var b14 = (d[2] << 7) | d[1]; setBend(b14 >= 8192 ? (b14 - 8192) / 8191 : (b14 - 8192) / 8192); } }; });
          midiL.textContent = n ? "MIDI: " + n + " input" + (n > 1 ? "s" : "") : ""; }
        hook(); m.onstatechange = hook;
      }).catch(function () {});
    }

    start.addEventListener("click", function () { begin(); });
    pick.addEventListener("change", function () { MD.last.load(list[+pick.value]); });
    var list = [];
    var basic = { id: "basic", name: "Basic", sheet: MS.fromState(SC.PROFILES.moog.def), wheel: { mod: 0, pitch: 0 }, notes: "", unsure: [] };
    MD.ready = fetch(host.getAttribute("data-src") || "/apps/shared/data/moog-sheets.json").then(function (r) { return r.json(); }).then(function (sheets) {
      list = [basic].concat(sheets.filter(function (e) { return !e.blank; }));
    }).catch(function () { list = [basic]; }).then(function () {
      list.forEach(function (e, i) { var o = h("option", null, e.id === "basic" ? "Basic (all knobs at a plain start)" : "p. " + e.page + ": " + e.name); o.value = i; pick.appendChild(o); });
      MD.last.load(list[0]); return MD.last;
    });
    return MD.last;
  };
  function init() { document.querySelectorAll("div.model-d:not(.md-w)").forEach(function (d) { MD.mount(d); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
