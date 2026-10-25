// arranger-page.js: the Style Arranger page (tools/arranger.qmd), an arranger keyboard after Yamaha's PSR / Genos styles.
// Hold a chord in the chord area (on-screen keys, chord buttons, or a MIDI keyboard below the split point); the eight
// channels play the section's patterns converted to it (StyleEngine). Sections: Intro, Main A–D, Fill In (played when you
// change Main with Auto Fill on), Break, Ending. The score shows each channel's pattern as written over CM7 or as it
// sounds over the chord held now, note heads shaded by velocity.
//   ArrangerPage.init({ top, keys, mixer, score })   containers; needs BandSounds, BandPhrase, StyleEngine, ArrangerStyles, abcjs
//   ArrangerPage.state (for tests)
//
// Section behaviour from the PSR-I610/I510 Reference Manual p. 42: Intro plays when started and then goes to Main; a Main
// repeats until another section is pressed; changing Main inserts an Auto Fill; Ending plays and then stops. Fills and
// Breaks start on the next beat and run to the end of the bar; a Main without Auto Fill changes at the next bar line; the
// Ending starts at the next bar line (this site's timing, unverified). With no chord recognised only the rhythm plays
// (PSR-I610 p. 45). The last chord is kept when the keys are let go (unverified as a default; it is how this page works).
// RTR (Genos RM p. 30): what a sounding note does at a chord change: Stop, Pitch Shift (here: retriggered, there is no
// glide), Pitch Shift to Root (here: retriggered to the root), Retrigger, Retrigger To Root.
(function (global) {
  "use strict";
  var P = global.BandPhrase, S = global.StyleEngine, A = global.ArrangerStyles;
  var TPQ = 12;
  var st = {
    style: A.list[0], bpm: A.list[0].bpm, mode: "multi", syncStart: false, autoFill: true, split: 60,
    held: [], midiHeld: [], chord: null, playing: false, waiting: false,
    sec: null, pos: 0, main: "Main A", queued: null, introArmed: false, after: null,
    chOn: {}, chCfg: {}, scoreSec: "follow", scoreMode: "sounds"
  };
  var E = { ctx: null, master: null, bank: null, chGain: {}, timer: null, nextTime: 0, viz: [], sounding: [] };
  var ui = {};

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function sel(label, opts, val, on) {
    var s = h("select", { class: "form-select form-select-sm" });
    opts.forEach(function (o) { var op = h("option", { value: o[0], text: o[1] }); if (String(o[0]) === String(val)) op.selected = true; s.appendChild(op); });
    s.addEventListener("change", function () { on(s.value); });
    var l = h("label", { class: "ar-ctl" }, [h("span", { text: label }), s]); l.input = s; return l;
  }
  function chk(label, val, on) { var c = h("input", { type: "checkbox" }); c.checked = !!val; c.addEventListener("change", function () { on(c.checked); }); return h("label", { class: "ar-chk" }, [c, " " + label]); }
  function nn(m) { return S.NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

  // ---------- audio ----------
  function ensure() {
    if (E.ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext; E.ctx = new AC();
    E.master = E.ctx.createGain(); E.master.gain.value = 0.85;
    var comp = E.ctx.createDynamicsCompressor(); E.master.connect(comp); comp.connect(E.ctx.destination);
    if (global.AudioTap) try { global.AudioTap.register(E.ctx, comp, "Style Arranger"); } catch (e) {}
    if (global.BandSounds) E.bank = global.BandSounds.create(E.ctx);
    A.CHANNELS.forEach(function (c) { var g = E.ctx.createGain(); g.connect(E.master); E.chGain[c] = g; });
    loadSounds(); applyVolumes();
    requestAnimationFrame(drawLoop);
  }
  function loadSounds() { if (!E.bank) return; var need = ["piano"]; A.CHANNELS.forEach(function (c) { if (need.indexOf(cfg(c).sound) < 0) need.push(cfg(c).sound); }); E.bank.load(need).catch(function () {}); }
  function applyVolumes() { A.CHANNELS.forEach(function (c) { if (E.chGain[c]) E.chGain[c].gain.value = st.chOn[c] === false ? 0 : cfg(c).vol; }); }
  function cfg(c) { return st.chCfg[c] || (st.chCfg[c] = Object.assign({}, st.style.channels[c])); }
  function drawLoop() {
    var now = E.ctx.currentTime;
    E.viz = E.viz.filter(function (v) { if (v.t <= now) { try { v.fn(); } catch (e) {} return false; } return true; });
    E.sounding = E.sounding.filter(function (s) { return s.end > now; });
    requestAnimationFrame(drawLoop);
  }
  function at(when, fn) { E.viz.push({ t: when, fn: fn }); }
  function cut(v, t) { if (!v) return; try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.015); v.src.stop(t + 0.12); } catch (e) {} }
  function play(c, spec, when) { return E.bank ? E.bank.play(cfg(c).sound, spec, when, E.chGain[c]) : null; }

  // ---------- sections ----------
  function barTicks() { return P.barQ(st.style.meter) * TPQ; }
  function secLen(name) { var s = st.style.sections[name]; return s ? s.bars * barTicks() : barTicks(); }
  var byTick = {};   // section -> channel -> tick -> [notes]
  function index() {
    byTick = {};
    Object.keys(st.style.sections).forEach(function (sn) {
      var parts = st.style.sections[sn].parts, m = byTick[sn] = {};
      Object.keys(parts).forEach(function (c) {
        var ph = parts[c], ns = P.resolve(ph), group = {};
        ns.forEach(function (n) { if (n.midi != null) (group[n.t.toFixed(4)] = group[n.t.toFixed(4)] || []).push(n.midi); });
        m[c] = {};
        ns.forEach(function (n) { var k = Math.round(n.t * TPQ); n.group = group[n.t.toFixed(4)]; (m[c][k] = m[c][k] || []).push(n); });
      });
    });
  }
  function start() {
    ensure(); E.ctx.resume();
    st.playing = true; st.waiting = false;
    st.sec = st.introArmed && st.style.sections["Intro A"] ? "Intro A" : st.main; st.introArmed = false; st.pos = 0; st.queued = null;
    st.after = st.sec === "Intro A" ? st.main : null;
    E.nextTime = E.ctx.currentTime + 0.08;
    if (!E.timer) E.timer = setInterval(pump, 25);
    paint();
  }
  function stop() {
    st.playing = false; st.waiting = false; st.sec = null; st.queued = null;
    if (E.timer) { clearInterval(E.timer); E.timer = null; }
    if (E.bank) try { E.bank.stopAll(); } catch (e) {}
    E.sounding = []; paint();
  }
  // a request from a section button
  function press(name) {
    if (/^Main/.test(name)) {
      if (!st.playing) { st.main = name; paint(); return; }
      st.main = name;
      if (st.autoFill && st.style.sections["Fill In " + name.slice(-1)]) st.queued = { sec: "Fill In " + name.slice(-1), at: "beat", then: name };
      else st.queued = { sec: name, at: "bar" };
    } else if (name === "Break") { if (st.playing) st.queued = { sec: "Break", at: "beat", then: st.main }; }
    else if (name === "Intro A") { if (!st.playing) st.introArmed = !st.introArmed; }
    else if (name === "Ending A") { if (st.playing) st.queued = { sec: "Ending A", at: "bar", then: null }; else st.introArmed = false; }
    paint();
  }
  function pump() {
    var td = 60 / st.bpm / TPQ;
    while (E.nextTime < E.ctx.currentTime + 0.12 && st.playing) { tick(E.nextTime, td); E.nextTime += td; }
  }
  function tick(when, td) {
    var bt = barTicks();
    // section changes due now
    if (st.queued) {
      var q = st.queued, inBar = st.pos % bt;
      if (q.at === "beat" && st.pos % TPQ === 0 && !/^Fill|^Break/.test(st.sec)) { st.sec = q.sec; st.pos = inBar; st.after = q.then; st.queued = null; paint(); }
      else if (q.at === "bar" && inBar === 0 && st.pos !== 0 || (q.at === "bar" && st.pos >= secLen(st.sec))) { st.sec = q.sec; st.pos = 0; st.after = q.then; st.queued = null; paint(); }
    }
    if (st.pos >= secLen(st.sec)) {
      if (/^Main/.test(st.sec)) st.pos = 0;
      else if (st.after) { st.sec = st.after; st.after = null; st.pos = 0; paint(); }
      else { stop(); return; }
    }
    var m = byTick[st.sec] || {}, spq = td * TPQ;
    Object.keys(m).forEach(function (c) {
      var ns = m[c][st.pos]; if (!ns || st.chOn[c] === false) return;
      var ch = cfg(c);
      ns.forEach(function (n) {
        if (n.piece) { play(c, { piece: n.piece, vel: n.vel }, when); lamp(c, when); return; }
        if (!st.chord) return;                                       // no chord: rhythm only
        var midi = S.convert(n.midi, ch, st.style.source, st.chord, n.group); if (midi == null) return;
        var dur = n.dur * spq * 0.96, v = play(c, { midi: midi, vel: n.vel, dur: dur }, when);
        E.sounding.push({ c: c, n: n, start: when, end: when + dur, v: v, midi: midi });
        lamp(c, when);
      });
    });
    if (st.pos % TPQ === 0) { var p = st.pos; at(when, function () { paintPos(p); }); }
    st.pos++;
  }
  // RTR: notes still sounding when the chord changes (Genos RM p. 30)
  function chordChanged() {
    if (!E.ctx) return;
    var now = E.ctx.currentTime + 0.01;
    E.sounding.forEach(function (s) {
      if (s.end <= now || s.start > now) return;
      var rtr = cfg(s.c).rtr || "stop", left = s.end - now;
      cut(s.v, now); s.end = now;
      if (rtr === "stop" || !st.chord || left < 0.08) return;
      var m = S.convert(s.n.midi, cfg(s.c), st.style.source, st.chord, s.n.group);
      if (/Root$/i.test(rtr) || rtr === "pitchShiftRoot" || rtr === "retriggerRoot") m = s.midi + ((st.chord.root - s.midi) % 12 + 12) % 12 - (((st.chord.root - s.midi) % 12 + 12) % 12 > 6 ? 12 : 0);
      if (m == null) return;
      var v = play(s.c, { midi: m, vel: s.n.vel * 0.85, dur: left }, now);
      E.sounding.push({ c: s.c, n: s.n, start: now, end: now + left, v: v, midi: m });
    });
  }

  // ---------- chord input ----------
  function allHeld() { return st.held.concat(st.midiHeld.filter(function (m) { return m < st.split; })); }
  function heldChanged() {
    var keys = allHeld(), c = keys.length ? S.recognize(keys, st.mode, st.chord) : null;
    if (c && (!st.chord || c.name !== st.chord.name)) {
      st.chord = c; chordChanged(); drawScore();
      if (st.syncStart && !st.playing) start();
    }
    paintKeys(); paintChord();
  }

  // ---------- UI ----------
  function paint() {
    if (!ui.secBtns) return;
    Object.keys(ui.secBtns).forEach(function (k) {
      var b = ui.secBtns[k], cur = st.sec === k || (/^Main/.test(k) && st.sec && st.sec.slice(-1) === k.slice(-1) && /^Fill/.test(st.sec));
      b.classList.toggle("on", !!cur || (!st.playing && k === st.main) || (k === "Intro A" && st.introArmed));
      b.classList.toggle("next", !!(st.queued && (st.queued.sec === k || st.queued.then === k)));
    });
    ui.startBtn.textContent = st.playing ? "■ Stop" : st.syncStart ? "Sync Start: waiting for a chord" : "▶ Start";
    ui.status.textContent = st.playing ? "Playing " + st.sec + (st.queued ? " → " + st.queued.sec : "") : st.syncStart ? "Waiting: play a chord to start" : "Stopped";
    if (st.scoreSec === "follow") drawScore();
  }
  function paintPos(p) { if (!ui.beats) return; var b = Math.floor((p % barTicks()) / TPQ); [].forEach.call(ui.beats.children, function (e, i) { e.classList.toggle("now", i === b); }); }
  function lamp(c, when) { at(when, function () { var l = ui.lamps && ui.lamps[c]; if (!l) return; l.classList.add("now"); clearTimeout(l._t); l._t = setTimeout(function () { l.classList.remove("now"); }, 160); }); }
  function paintChord() { if (ui.chord) { ui.chord.textContent = st.chord ? st.chord.name : "—"; ui.chordNote.textContent = st.chord ? "" : "No chord yet: only the rhythm plays."; } }
  function paintKeys() { if (!ui.keys) return; var hs = allHeld(); ui.keys.forEach(function (k) { k[1].classList.toggle("on", hs.indexOf(k[0]) >= 0); }); }

  function buildTop(el) {
    var styleSel = sel("Style", A.list.map(function (s) { return [s.id, s.name]; }), st.style.id, function (v) {
      var was = st.playing; stop(); st.style = A.list.filter(function (s) { return s.id === v; })[0]; st.bpm = st.style.bpm; st.chCfg = {}; st.chOn = {};
      index(); tempo.input.value = st.bpm; tempo.querySelector("b").textContent = st.bpm; buildMixer(ui.mixerEl); if (E.ctx) { loadSounds(); applyVolumes(); } drawScore(); if (was) start(); });
    var tempo = h("label", { class: "ar-ctl" }, [h("span", {}, ["Tempo ", h("b", { text: st.bpm })]), h("input", { type: "range", min: 50, max: 200, value: st.bpm })]);
    tempo.input = tempo.querySelector("input"); tempo.input.addEventListener("input", function () { st.bpm = +tempo.input.value; tempo.querySelector("b").textContent = st.bpm; });
    var mode = sel("Fingering", [["multi", "Multi Finger"], ["single", "Single Finger"], ["fingered", "Fingered"], ["onbass", "Fingered On Bass"]], st.mode, function (v) { st.mode = v; st.chord = null; heldChanged(); });
    ui.startBtn = h("button", { type: "button", class: "btn btn-primary ar-start", text: "▶ Start", onclick: function () { st.playing ? stop() : st.syncStart ? (st.syncStart = false, syncBox.querySelector("input").checked = false, start()) : start(); } });
    var syncBox = chk("Sync Start", st.syncStart, function (v) { st.syncStart = v; paint(); });
    ui.secBtns = {};
    var secRow = h("div", { class: "ar-secs" });
    [["Intro A", "INTRO"], ["Main A", "MAIN A"], ["Main B", "MAIN B"], ["Main C", "MAIN C"], ["Main D", "MAIN D"], ["Break", "BREAK"], ["Ending A", "ENDING"]].forEach(function (x) {
      var b = h("button", { type: "button", class: "ar-sec", text: x[1], onclick: function () { press(x[0]); } }); ui.secBtns[x[0]] = b; secRow.appendChild(b);
    });
    ui.chord = h("div", { class: "ar-chord", text: "—" }); ui.chordNote = h("div", { class: "ar-note" }); ui.status = h("div", { class: "ar-status" });
    ui.beats = h("div", { class: "ar-beats" }); for (var i = 0; i < 4; i++) ui.beats.appendChild(h("i"));
    el.appendChild(h("div", { class: "ar-panel" }, [
      h("div", { class: "ar-row" }, [styleSel, tempo, mode, chk("Auto Fill", st.autoFill, function (v) { st.autoFill = v; }), syncBox]),
      h("div", { class: "ar-row ar-mid" }, [h("div", { class: "ar-chordbox" }, [h("span", { class: "ar-lab", text: "Chord" }), ui.chord, ui.chordNote]),
        h("div", {}, [secRow, h("div", { class: "ar-row" }, [ui.startBtn, ui.beats, ui.status])])])]));
    paint(); paintChord();
  }

  function buildKeys(el) {
    var kb = h("div", { class: "ar-piano" }); ui.keys = [];
    for (var m = 36; m < 60; m++) (function (m) {
      var black = [1, 3, 6, 8, 10].indexOf(m % 12) >= 0;
      var k = h("button", { type: "button", class: "pk " + (black ? "blk" : "wht"), title: nn(m), "aria-label": nn(m) });
      k.addEventListener("click", function () { var i = st.held.indexOf(m); if (i >= 0) st.held.splice(i, 1); else st.held.push(m); heldChanged(); });
      ui.keys.push([m, k]); kb.appendChild(k);
    })(m);
    var quick = h("div", { class: "ar-row" });
    [["C", [48, 52, 55]], ["Am", [45, 48, 52]], ["F", [41, 45, 48]], ["G", [43, 47, 50]], ["G7", [43, 47, 50, 53]], ["Dm7", [38, 41, 45, 48]],
     ["Em", [40, 43, 47]], ["E7", [40, 44, 47, 50]], ["CM7", [48, 52, 55, 59]], ["Bm7♭5", [47, 50, 53, 57]], ["C/E", [40, 43, 48]]].forEach(function (x) {
      quick.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-secondary", text: x[0], onclick: function () { st.held = x[1].slice(); heldChanged(); } }));
    });
    quick.appendChild(h("button", { type: "button", class: "btn btn-sm btn-outline-danger", text: "Let go", onclick: function () { st.held = []; heldChanged(); } }));
    var midiBtn = h("button", { type: "button", class: "btn btn-sm btn-outline-primary", text: "Connect a MIDI keyboard", onclick: function () {
      if (!global.MidiFeel) return; global.MidiFeel.connect().then(function () { midiBtn.textContent = "MIDI connected"; midiBtn.disabled = true; }).catch(function () { midiBtn.textContent = "No MIDI access"; });
    } });
    var split = sel("Split point (keys below are the chord area)", [48, 53, 55, 60, 62, 65].map(function (x) { return [x, nn(x)]; }), st.split, function (v) { st.split = +v; heldChanged(); });
    el.appendChild(h("div", { class: "ar-panel" }, [kb, quick, h("div", { class: "ar-row" }, [midiBtn, split]),
      h("p", { class: "ar-note", text: "Click keys to hold them (click again to let go). Single Finger: one key is major; add the nearest black key to its left for minor, the nearest white key for a 7th, both for a minor 7th. On a MIDI keyboard the right hand above the split plays piano." })]));
    if (global.MidiFeel && global.MidiFeel.subscribe) global.MidiFeel.subscribe(function (e) {
      if (e.midi >= st.split) { if (e.type === "on") { ensure(); E.ctx.resume(); var v = E.bank && E.bank.play("piano", { midi: e.midi, vel: e.vel != null ? (e.vel > 1 ? e.vel / 127 : e.vel) : 0.7 }, E.ctx.currentTime, E.master); (ui.rh = ui.rh || {})[e.midi] = v; } else if (ui.rh && ui.rh[e.midi]) { cut(ui.rh[e.midi], E.ctx.currentTime); delete ui.rh[e.midi]; } return; }
      var i = st.midiHeld.indexOf(e.midi);
      if (e.type === "on" && i < 0) st.midiHeld.push(e.midi);
      if (e.type === "off" && i >= 0) st.midiHeld.splice(i, 1);
      heldChanged();
    });
    paintKeys();
  }

  var RULES = {
    ntr: [["trans", "Root Trans"], ["fixed", "Root Fixed"]],
    ntt: [["bypass", "Bypass"], ["melody", "Melody"], ["chord", "Chord"], ["melodicMinor", "Melodic Minor"], ["melodicMinor5", "Melodic Minor 5th"], ["harmonicMinor", "Harmonic Minor"],
      ["harmonicMinor5", "Harmonic Minor 5th"], ["naturalMinor", "Natural Minor"], ["naturalMinor5", "Natural Minor 5th"], ["dorian", "Dorian"], ["dorian5", "Dorian 5th"]],
    rtr: [["stop", "Stop"], ["pitchShift", "Pitch Shift"], ["pitchShiftRoot", "Pitch Shift to Root"], ["retrigger", "Retrigger"], ["retriggerRoot", "Retrigger To Root"]]
  };
  function soundList() {
    var out = [["kit", "Drum kit"], ["congas", "Congas"]];
    if (global.BandSounds) ["piano", "guitar", "bass"].forEach(function (f) { global.BandSounds.sounds(f).forEach(function (s) { out.push([s.id, s.label]); }); });
    return out;
  }
  function buildMixer(el) {
    ui.mixerEl = el; el.innerHTML = ""; ui.lamps = {};
    var sounds = soundList(), grid = h("div", { class: "ar-mixer" });
    A.CHANNELS.forEach(function (c) {
      var ch = cfg(c), rhythm = /^Rhythm/.test(c);
      var lampEl = h("span", { class: "ar-lamp" }); ui.lamps[c] = lampEl;
      var vol = h("input", { type: "range", min: 0, max: 1.5, step: 0.05, value: ch.vol, "aria-label": c + " volume" });
      vol.addEventListener("input", function () { ch.vol = +vol.value; applyVolumes(); });
      var rules = h("details", { class: "ar-rules" }, [h("summary", { text: rhythm ? "Rules (not converted)" : "Rules: " + (ch.ntr === "trans" ? "Root Trans" : "Root Fixed") + ", " + RULES.ntt.filter(function (x) { return x[0] === ch.ntt; })[0][1] })]);
      if (!rhythm) {
        function set(k, conv) { return function (v) { ch[k] = conv ? conv(v) : v; drawScore(); }; }
        rules.appendChild(sel("NTR", RULES.ntr, ch.ntr, set("ntr")));
        rules.appendChild(sel("NTT", RULES.ntt, ch.ntt, set("ntt")));
        rules.appendChild(sel("High Key", S.NAMES.map(function (n, i) { return [i, n]; }), ch.highKey == null ? 5 : ch.highKey, set("highKey", Number)));
        rules.appendChild(sel("Note Limit low", range(24, 72), ch.lo, set("lo", Number)));
        rules.appendChild(sel("Note Limit high", range(48, 100), ch.hi, set("hi", Number)));
        rules.appendChild(sel("RTR", RULES.rtr, ch.rtr || "stop", set("rtr")));
        rules.appendChild(chk("NTT Bass", ch.nttBass, set("nttBass")));
      }
      grid.appendChild(h("div", { class: "ar-strip" + (rhythm ? " rhy" : "") }, [
        h("div", { class: "ar-shead" }, [chk(c, st.chOn[c] !== false, function (v) { st.chOn[c] = v; applyVolumes(); }), lampEl]),
        sel("Sound", sounds, ch.sound, function (v) { ch.sound = v; if (E.bank) E.bank.load([v]).catch(function () {}); }),
        h("label", { class: "ar-ctl" }, [h("span", { text: "Volume" }), vol]), rules]));
    });
    el.appendChild(grid);
  }
  function range(a, b) { var o = []; for (var m = a; m <= b; m++) o.push([m, nn(m)]); return o; }

  function buildScore(el) {
    ui.scoreEl = h("div", { class: "ar-staves" });
    var secSel = sel("Section", [["follow", "The one playing (or Main selected)"]].concat(A.SECTIONS.map(function (s) { return [s, s]; })), st.scoreSec, function (v) { st.scoreSec = v; drawScore(); });
    var modeSel = sel("Show", [["sounds", "As it sounds over the held chord"], ["written", "As written (over CM7)"]], st.scoreMode, function (v) { st.scoreMode = v; drawScore(); });
    el.appendChild(h("div", {}, [h("div", { class: "ar-row" }, [secSel, modeSel]), ui.scoreEl]));
    drawScore();
  }
  var lastScore = "";
  function drawScore() {
    if (!ui.scoreEl || !global.ABCJS) return;
    var sn = st.scoreSec === "follow" ? (st.sec || st.main) : st.scoreSec, sec = st.style.sections[sn];
    var key = [st.style.id, sn, st.scoreMode, st.chord && st.chord.name, JSON.stringify(st.chCfg)].join("|");
    if (key === lastScore) return; lastScore = key;
    ui.scoreEl.innerHTML = "";
    if (!sec) { ui.scoreEl.appendChild(h("p", { class: "ar-note", text: "This style has no " + sn + "." })); return; }
    var written = st.scoreMode === "written" || !st.chord;
    ui.scoreEl.appendChild(h("p", { class: "ar-note", text: sn + (written ? ": as written over CM7 (the source chord)" + (st.scoreMode === "sounds" ? ". Hold a chord to see it converted." : ".") : ": as it sounds over " + st.chord.name + ".") + " Paler note heads are softer." }));
    A.CHANNELS.forEach(function (c) {
      var ph = sec.parts[c]; if (!ph) return;
      var ns = P.resolve(ph);
      if (ph.kind !== "drum" && !written) ns = S.convertPhrase(ns, cfg(c), st.style.source, st.chord);
      var r = P.toAbc(ns, { meter: st.style.meter, bars: sec.bars, kind: ph.kind === "drum" ? "drum" : "pitch", title: "", barsPerLine: 2 });
      var div = h("div", { class: "ar-staff" }), lab = h("div", { class: "ar-slab", text: c + (ph.kind === "drum" ? "" : " · " + cfg(c).sound) });
      ui.scoreEl.appendChild(h("div", { class: "ar-srow" }, [lab, div]));
      try {
        global.ABCJS.renderAbc(div, r.abc, { responsive: "resize", add_classes: true, staffwidth: 560, paddingtop: 0, paddingbottom: 0 });
        var heads = div.querySelectorAll(".abcjs-note");
        if (heads.length === r.vels.length) [].forEach.call(heads, function (e, k) { e.style.opacity = (0.3 + 0.7 * r.vels[k]).toFixed(2); });
      } catch (e) { div.textContent = r.abc; }
    });
  }

  function init(o) {
    index();
    buildTop(o.top); buildKeys(o.keys); buildMixer(o.mixer); buildScore(o.score);
  }
  global.ArrangerPage = { init: init, state: st, press: press, start: start, stop: stop, setHeld: function (ms) { st.held = ms.slice(); heldChanged(); }, _E: E };
})(window);
