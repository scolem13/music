// tuner-panel.js — the strobe tuner in the navbar (opened from practice-widgets.js, loaded the first time its button is pressed).
// Needs pitch-detect.js (the maths: PitchDetect.strobe, .refFreq, .mic), strobe-view.js (the drawing) and audio-tap.js (the page's sound).
//
//   TunerPanel.build(root) fills `root` (the panel's body) with the controls and the strobe. Returns { start, stop, running, state }.
//   TunerPanel.stop()      stops listening (the navbar calls it when the panel is closed).
//   TunerPanel.state()     { running, source, fref, bands, last, error, label } for tests.
//   TunerPanel.setSource(node | fn(ctx))   a test feeds this in place of any real source (analysed in a context of its own).
// Sources: the microphone (opened only on Start, after AudioCheck's pre-flight like the other microphone users);
//   "This page's sound" (AudioTap.sources(): the drone, lesson sounds, the chord keyboard, the Backing Track, analysed in the source's own context);
//   a media element on the page (AudioTap.media); another browser tab (AudioTap.display: Chrome, a picked tab with "Share tab audio").
// Settings are kept in localStorage "tunerPanel.v1".
(function (global) {
  var PD = global.PitchDetect, SV = global.StrobeView, TAP = global.AudioTap, KEY = "tunerPanel.v1";
  var S = { note: "A", oct: "4", a4: 440, sys: "12et", tonic: "C", cents: 350, source: "mic", bands: 6 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || "null"); if (sv) Object.keys(sv).forEach(function (k) { if (k in S) S[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function opts(sel, list, val) { sel.innerHTML = ""; list.forEach(function (o) { var x = el("option"); x.value = o[0]; x.textContent = o[1]; sel.appendChild(x); }); sel.value = val; }
  var api = null, inst = null;

  function build(root) {
    var running = false, mic = null, bank = null, fref = 440, last = null, error = "", testSource = null, extra = null, session = 0, view = null;
    root.innerHTML =
      '<div class="pw-row"><button class="pw-btn pw-main" type="button" id="pw-t-go" style="flex:1">Start</button></div>' +
      '<span class="pw-lab">Reference note</span>' +
      '<div class="pw-row"><select id="pw-t-note" aria-label="Note"></select><select id="pw-t-oct" aria-label="Octave"></select><input type="number" id="pw-t-a4" min="415" max="466" step="1" aria-label="A4 in Hz"><span class="pw-note" style="margin:0">Hz A4</span></div>' +
      '<span class="pw-lab">Tuning system</span>' +
      '<div class="pw-row"><select id="pw-t-sys" aria-label="Tuning system"></select><select id="pw-t-tonic" aria-label="Tonic for just intonation"></select><input type="number" id="pw-t-cents" min="-100" max="700" step="1" aria-label="Cents above the note"></div>' +
      '<span class="pw-lab">Listen to</span>' +
      '<div class="pw-row"><select id="pw-t-src" aria-label="Audio source" style="flex:1;min-width:0;max-width:100%"></select></div>' +
      '<div class="pw-row" style="margin-top:.35rem"><select id="pw-t-which" aria-label="Which one" style="flex:1;min-width:0;max-width:100%" hidden></select></div>' +
      '<p class="pw-note" id="pw-t-why"></p>' +
      '<p class="pw-note" id="pw-t-info" role="status"></p>' +
      '<div class="pw-row" style="align-items:baseline"><b id="pw-t-name" style="font-size:1.5rem;min-width:3.5ch">—</b><span id="pw-t-cents-read" class="pw-note" style="margin:0"></span><span id="pw-t-hz" class="pw-note" style="margin:0"></span></div>' +
      '<canvas id="pw-t-cv" style="width:100%;height:200px;display:block;margin-top:.4rem" role="img" aria-label="Strobe bands, one row for every partial. A row that stands still is exactly in tune; stripes moving right mean sharp, left flat."></canvas>' +
      '<div class="pw-row" style="margin-top:.4rem"><label class="pw-note" style="margin:0" for="pw-t-bands">Bands</label><select id="pw-t-bands" aria-label="Number of bands"></select></div>' +
      '<p class="pw-note">Each row listens for one partial of the note (row k at k times the target). A row that stands still is on pitch; stripes drifting right are sharp, left are flat. Rows fade where that partial is weak.</p>';
    function $(id) { return root.querySelector("#pw-t-" + id); }
    opts($("note"), SV.NOTES, S.note); opts($("oct"), [1, 2, 3, 4, 5, 6].map(function (o) { return [String(o), "Octave " + o]; }), String(S.oct));
    opts($("sys"), [["12et", "12-ET (the piano)"], ["ji", "Just, over a tonic"], ["31et", "31-ET"], ["cents", "Cents above the note"]], S.sys);
    opts($("tonic"), SV.NOTES, S.tonic); opts($("bands"), [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return [String(n), String(n)]; }), String(S.bands));
    $("a4").value = S.a4; $("cents").value = S.cents; $("cents").title = "350 is the neutral third above the note";

    // ---- the sources ----
    var SRC = [["mic", "Microphone"], ["tap", "This page's sound (no microphone)"], ["media", "A video or audio on this page"], ["tab", "Another browser tab (Chrome)"]];
    function avail() {
      var md = global.navigator && navigator.mediaDevices, taps = TAP ? TAP.sources() : [], media = TAP ? TAP.mediaElements() : [], r = {};
      r.mic = md && md.getUserMedia ? "" : "This browser can't open a microphone here (it needs https or localhost).";
      r.tap = !TAP ? "This page has no sound tap." : taps.length ? "" : "Nothing on this page has made a sound yet. Start the drone (or a lesson sound, the keyboard, the Backing Track), then pick this.";
      r.media = !TAP ? "This page has no sound tap." : media.length ? "" : "There is no video or audio file on this page. (A YouTube player is in another page's frame: use “Another browser tab”.)";
      r.tab = TAP && TAP.canDisplay() ? "" : "This browser can't capture another tab's sound. Chrome and Edge can, on https or localhost.";
      return r;
    }
    var why = $("why");
    function sources() {
      var a = avail(), srcSel = $("src"), cur = srcSel.value || S.source;
      srcSel.innerHTML = "";
      SRC.forEach(function (s) { var o = el("option"); o.value = s[0]; o.textContent = s[1] + (a[s[0]] ? " (not available)" : ""); o.disabled = !!a[s[0]]; srcSel.appendChild(o); });
      if (testSource) { var t = el("option"); t.value = "test"; t.textContent = "Test signal"; srcSel.appendChild(t); }
      if (srcSel.querySelector('option[value="' + cur + '"]:not(:disabled)')) srcSel.value = cur; else srcSel.value = "mic";
      if (srcSel.selectedOptions[0] && srcSel.selectedOptions[0].disabled) { var f = Array.prototype.find.call(srcSel.options, function (o) { return !o.disabled; }); if (f) srcSel.value = f.value; }
      which(a);
    }
    function which(a) {
      a = a || avail(); var v = $("src").value, w = $("which"), list = [];
      if (v === "tap") list = TAP.sources().map(function (e, i) { return [String(i), e.label]; });
      if (v === "media") list = TAP.mediaElements().map(function (m, i) { return [String(i), (m.tagName === "VIDEO" ? "Video: " : "Audio: ") + ((m.currentSrc || m.src || "").split("/").pop() || "(no file)").slice(0, 40)]; });
      var keep = w.value; w.hidden = list.length < 2; opts(w, list.length ? list : [["0", ""]], list.some(function (l) { return l[0] === keep; }) ? keep : "0");
      var msgs = {
        mic: "The microphone opens when you press Start, and is let go on Stop.",
        tap: "Listens to the sound this page makes, through its own audio. Works with headphones on. The Backing Track, drone, keyboards and lesson sounds each register; pick one if there are several.",
        media: "Taps the video or audio on this page. It stays audible. (A file from another site without permission headers comes out silent: the browser's rule.)",
        tab: "Chrome only: a window asks which tab to share. Pick the tab (a YouTube video, say) and tick “Share tab audio”, or no sound comes through. Nothing you share is recorded."
      };
      why.textContent = msgs[v] || "";
      var bad = Object.keys(a).filter(function (k) { return a[k]; }).map(function (k) { return SRC.filter(function (s) { return s[0] === k; })[0][1] + ": " + a[k]; });
      if (bad.length) why.textContent += "  Greyed out: " + bad.join("  ");
    }

    // ---- the target ----
    function retarget() {
      S.note = $("note").value; S.oct = $("oct").value; S.a4 = Math.max(415, Math.min(466, +$("a4").value || 440)); S.sys = $("sys").value; S.tonic = $("tonic").value;
      S.cents = +$("cents").value || 0; S.bands = +$("bands").value; save();
      var d = SV.describe({ note: S.note, oct: +S.oct, a4: S.a4, system: S.sys, tonic: S.tonic, cents: S.cents });
      fref = d.fref; $("info").textContent = error || d.text;
      $("tonic").hidden = S.sys !== "ji"; $("cents").hidden = S.sys !== "cents";
      if (bank) { bank.n = S.bands; bank.setRef(fref); }
      if (mic && mic.setA4) mic.setA4(S.a4);
      if (view) view.redraw();
    }
    ["note", "oct", "a4", "sys", "tonic", "cents", "bands"].forEach(function (k) { $(k).addEventListener("change", retarget); });
    $("a4").addEventListener("input", function () { if (+$("a4").value >= 415) retarget(); });
    $("src").addEventListener("change", function () { S.source = $("src").value; save(); which(); if (running) go(); });
    $("src").addEventListener("mousedown", function () { sources(); });          // a video may have been added to the page since
    $("which").addEventListener("change", function () { if (running) go(); });

    // ---- listening ----
    function onFrame(r) {
      last = r;
      if (r.hz > 0) { $("name").textContent = r.name; $("cents-read").textContent = SV.fmtC(r.cents) + " ¢"; $("hz").textContent = r.hz.toFixed(1) + " Hz, " + SV.fmtC(1200 * Math.log(r.hz / fref) / Math.LN2) + " ¢ from the target"; }
      else { $("name").textContent = "—"; $("cents-read").textContent = ""; $("hz").textContent = r.rms > 0.004 ? "no clear pitch" : "listening…"; }
    }
    function fail(e, mine) {
      if (mine !== session) return;
      error = (e && (e.message || e.name)) || "Not available."; running = false; release(); ui();
      $("info").textContent = error; $("hz").textContent = ""; $("name").textContent = "—"; $("cents-read").textContent = "";
    }
    function release() {
      session++; if (mic) { try { mic.stop(); } catch (e) {} } mic = null; if (extra) { try { extra.stop(); } catch (e) {} } extra = null; bank = null;
    }
    function ui() {
      $("go").textContent = running ? "Stop" : "Start"; $("go").classList.toggle("pw-main", !running);
      try { global.dispatchEvent(new CustomEvent("tuner-panel-state", { detail: { running: running } })); } catch (e) {}
    }
    function go() {
      release(); var mine = session; error = ""; last = null; retarget(); var a = avail(), v = $("src").value;
      if (testSource && v === "test") a.test = "";
      if (a[v]) { fail(new Error(a[v]), mine); return; }
      running = true; ui(); $("hz").textContent = "starting…";
      var mo = { a4: S.a4, checkOpts: { levelCheck: false },
        onBlock: function (x, n0, sr) { if (mine !== session) return; if (!bank) bank = PD.strobe(sr, fref, { bands: S.bands }); bank.process(x); }, onFrame: function (r) { if (mine === session) onFrame(r); } };
      var begin = function (m) { mic = m; return m.start().then(function () { if (mine !== session) { m.stop(); return; } $("hz").textContent = "listening…"; }); };
      var p;
      try {
        if (v === "mic") p = begin(PD.mic(mo));
        else if (v === "test") { mo.source = testSource; p = begin(PD.mic(mo)); }
        else if (v === "tap") { var e = TAP.sources()[+$("which").value || 0]; if (!e) throw new Error(a.tap || "That sound is gone."); mo.ctx = e.ctx; mo.source = e.node; p = begin(PD.mic(mo)); }
        else if (v === "media") { var m = TAP.mediaElements()[+$("which").value || 0], me = TAP.media(m); mo.ctx = me.ctx; mo.source = me.node; p = begin(PD.mic(mo)); }
        else if (v === "tab") {
          $("hz").textContent = "choose a tab to share…";
          p = TAP.display().then(function (d) {
            if (mine !== session) { d.stop(); return; }
            extra = d; mo.ctx = d.ctx; mo.source = d.node;
            d.stream.getAudioTracks()[0].addEventListener("ended", function () { if (mine === session) { running = false; release(); ui(); $("hz").textContent = "The shared tab ended."; } });
            return begin(PD.mic(mo));
          });
        }
      } catch (e) { fail(e, mine); return; }
      p.catch(function (e) { fail(e, mine); });
    }
    function stop() { if (!running && !mic) return; running = false; release(); $("name").textContent = "—"; $("cents-read").textContent = ""; $("hz").textContent = ""; ui(); retarget(); }
    $("go").addEventListener("click", function () { running ? stop() : go(); });

    view = SV.mount($("cv"), function () { return { bands: bank ? bank.read() : [], N: S.bands, fref: fref, running: running, idle: "Press Start to see the bands move" }; });
    if (TAP) TAP.onChange(function () { if (!running) sources(); else which(); });
    sources(); retarget();
    inst = {
      start: go, stop: stop, running: function () { return running; }, sourcesChanged: sources,
      setSource: function (s) { testSource = s; sources(); if (s) { $("src").value = "test"; } },
      state: function () { return { running: running, source: $("src").value, fref: fref, bands: bank ? bank.read() : [], last: last, error: error, info: $("info").textContent, why: why.textContent,
        disabled: Array.prototype.filter.call($("src").options, function (o) { return o.disabled; }).map(function (o) { return o.value; }) }; }
    };
    return inst;
  }
  api = { build: build, refresh: function () { if (inst) inst.sourcesChanged(); }, stop: function () { if (inst) inst.stop(); }, state: function () { return inst ? inst.state() : null; }, setSource: function (s) { if (inst) inst.setSource(s); }, start: function () { if (inst) inst.start(); } };
  global.TunerPanel = api;
})(window);
