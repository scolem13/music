// sequencers.js: the Sequencers & Arpeggiators page (tools/sequencers.qmd). Every kind of sequencer as a small working
// instrument on one shared clock, so any two can run together and be heard against each other.
//   SeqPage.init({ input, compare, table, sections: { familyId: element } })
// A TYPE is { id, name, family, blurb, input, time, repeats, good, limit, hw, make(inst) }. make() builds the controls,
// returns the element and sets inst.onTick(localTick, when, tickDur, out) (12 ticks to the beat) and optional inst.onInput()
// (the held chord, key or scale changed). out.note / out.drum / out.synth / out.at(when, fn) (a light at the sound's time).
// Notes go through BandSounds when a sampled sound is chosen, else the small built-in synth (most of these machines drove one).
(function (global) {
  "use strict";
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function nn(m) { m = Math.round(m); return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function pcName(m) { return NAMES[((Math.round(m) % 12) + 12) % 12]; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var SCALES = { "major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "dorian": [0, 2, 3, 5, 7, 9, 10],
    "major pentatonic": [0, 2, 4, 7, 9], "minor pentatonic": [0, 3, 5, 7, 10], "blues": [0, 3, 5, 6, 7, 10],
    "chromatic": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  var G = { bpm: 110, key: 0, scale: "minor", sound: "synth", held: [48, 55, 60, 63], order: [48, 55, 60, 63] };
  function deg(i, base) { var s = SCALES[G.scale], n = s.length; return (base || 48) + G.key + s[((i % n) + n) % n] + 12 * Math.floor(i / n); }
  function heldSorted() { var h = G.held.slice().sort(function (a, b) { return a - b; }); return h.length ? h : [48 + G.key]; }
  function chordTone(i) { var h = heldSorted(), n = h.length; return h[((i % n) + n) % n] + 12 * Math.floor(i / n); }
  function snapToScale(semi) {   // nearest scale pitch above the key's root
    var s = SCALES[G.scale], best = 0, bd = 99;
    for (var o = -1; o <= 3; o++) s.forEach(function (x) { var p = x + 12 * o, d = Math.abs(p - semi); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  // ---------- little DOM helpers ----------
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
  function sel(label, opts, val, on) {   // opts: [[value, text]] or [value]
    var s = h("select", { class: "form-select form-select-sm" });
    opts.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; var op = h("option", { value: v, text: t }); if (String(v) === String(val)) op.selected = true; s.appendChild(op); });
    s.addEventListener("change", function () { on(s.value); });
    var l = h("label", { class: "sq-ctl" }, [h("span", { text: label }), s]); l.input = s; return l;
  }
  function range(label, min, max, step, val, on, fmt) {
    var out = h("b", { text: fmt ? fmt(val) : val });
    var r = h("input", { type: "range", min: min, max: max, step: step, value: val });
    r.addEventListener("input", function () { var v = +r.value; out.textContent = fmt ? fmt(v) : v; on(v); });
    var l = h("label", { class: "sq-ctl" }, [h("span", {}, [label + " ", out]), r]); l.input = r; return l;
  }
  function btn(text, on, cls) { return h("button", { type: "button", class: "btn btn-sm " + (cls || "btn-outline-secondary"), text: text, onclick: on }); }
  function row(kids) { return h("div", { class: "sq-row" }, kids); }
  function light(list, i) { for (var k = 0; k < list.length; k++) list[k].classList.toggle("now", k === i); }
  function makeGrid(o) {   // o: rows, cols, get(r,c), set(r,c,v), label(r), dis(r,c)
    var wrap = h("div", { class: "sq-grid" }), cells = [], heads = [];
    for (var r = 0; r < o.rows; r++) {
      var line = h("div", { class: "sq-gline" });
      line.appendChild(h("span", { class: "sq-glab", text: o.label ? o.label(r) : "" }));
      cells[r] = [];
      for (var c = 0; c < o.cols; c++) (function (r, c) {
        var b = h("button", { type: "button", class: "sq-cell" + (c % 4 === 0 ? " beat" : "") });
        b.addEventListener("click", function () { if (o.dis && o.dis(r, c)) return; o.set(r, c, !o.get(r, c)); paint(); });
        cells[r][c] = b; line.appendChild(b);
      })(r, c);
      wrap.appendChild(line);
    }
    function paint() {
      for (var r = 0; r < o.rows; r++) for (var c = 0; c < o.cols; c++) {
        cells[r][c].classList.toggle("on", !!o.get(r, c));
        cells[r][c].classList.toggle("dis", !!(o.dis && o.dis(r, c)));
        if (o.label) wrap.children[r].firstChild.textContent = o.label(r);
      }
    }
    paint();
    return { el: wrap, paint: paint, col: function (c, rOnly) {
      for (var r = 0; r < o.rows; r++) for (var k = 0; k < o.cols; k++) cells[r][k].classList.toggle("now", k === c && (rOnly == null || rOnly === r));
    }, cells: cells };
  }

  // ---------- the engine: one clock, 12 ticks to the beat ----------
  var E = { ctx: null, master: null, bank: null, tick: 0, nextTime: 0, active: [], timer: null, viz: [] };
  function ensure() {
    if (E.ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    E.ctx = new AC();
    E.master = E.ctx.createGain(); E.master.gain.value = 0.8;
    var comp = E.ctx.createDynamicsCompressor(); E.master.connect(comp); comp.connect(E.ctx.destination);
    if (global.AudioTap) try { global.AudioTap.register(E.ctx, comp, "Sequencers"); } catch (e) {}
    if (global.BandSounds) { E.bank = global.BandSounds.create(E.ctx); E.bank.load(["kit"]).catch(function () {}); if (G.sound !== "synth") E.bank.load([G.sound]).catch(function () {}); }
    requestAnimationFrame(drawLoop);
  }
  function drawLoop() {
    var now = E.ctx.currentTime;
    E.viz = E.viz.filter(function (v) { if (v.t <= now) { try { v.fn(); } catch (e) {} return false; } return true; });
    requestAnimationFrame(drawLoop);
  }
  function pump() {
    var ctx = E.ctx;
    while (E.nextTime < ctx.currentTime + 0.12) {
      var td = 60 / G.bpm / 12;
      E.active.forEach(function (i) { var lt = E.tick - i.startTick; if (lt >= 0 && i.onTick) i.onTick(lt, E.nextTime, td, i.out); i.lastTick = lt; i.lastTime = E.nextTime; i.td = td; });
      E.nextTime += td; E.tick++;
    }
  }
  function startInst(inst) {
    ensure(); E.ctx.resume();
    if (!inst.node) { inst.node = E.ctx.createStereoPanner ? E.ctx.createStereoPanner() : E.ctx.createGain(); inst.node.connect(E.master); inst.out = makeOut(inst); }
    if (inst.node.pan) inst.node.pan.value = inst.pan || 0;
    if (!E.active.length) { E.tick = 0; E.nextTime = E.ctx.currentTime + 0.06; E.timer = setInterval(pump, 25); }
    inst.startTick = Math.ceil(E.tick / 12) * 12 + (E.active.length ? 0 : 0);   // on the next beat, so two machines line up
    if (inst.reset) inst.reset();
    if (E.active.indexOf(inst) < 0) E.active.push(inst);
    inst.playing = true; inst.paintBtn();
  }
  function stopInst(inst) {
    E.active = E.active.filter(function (i) { return i !== inst; });
    inst.playing = false; inst.paintBtn(); if (inst.onStop) inst.onStop();
    if (!E.active.length && E.timer) { clearInterval(E.timer); E.timer = null; }
  }
  function stopAll() { E.active.slice().forEach(stopInst); if (E.bank) try { E.bank.stopAll(); } catch (e) {} }

  function synthVoice(dest, midi, when, dur, o) {
    var ctx = E.ctx; o = o || {};
    var osc = ctx.createOscillator(); osc.type = o.wave || "sawtooth";
    if (o.from != null) { osc.frequency.setValueAtTime(mtof(o.from), when); osc.frequency.exponentialRampToValueAtTime(mtof(midi), when + 0.07); }
    else osc.frequency.setValueAtTime(mtof(midi), when);
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    var cut = o.cut || 1400, acc = o.accent ? 1 : 0;
    lp.Q.value = o.res != null ? o.res : (acc ? 14 : 7);
    lp.frequency.setValueAtTime(Math.min(cut * (acc ? 4 : 2.4), 16000), when);
    lp.frequency.exponentialRampToValueAtTime(Math.max(cut * 0.45, 70), when + (o.decay || 0.25));
    var g = ctx.createGain(), lvl = 0.16 * (o.vel != null ? o.vel : 0.7) * (acc ? 1.5 : 1);
    var att = o.from != null ? 0.002 : 0.004;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(lvl, when + att);
    g.gain.setValueAtTime(lvl, when + Math.max(dur, 0.01)); g.gain.linearRampToValueAtTime(0, when + dur + 0.04);
    osc.connect(lp); lp.connect(g); g.connect(dest);
    osc.start(when); osc.stop(when + dur + 0.08);
  }
  function synthDrum(dest, piece, when, vel) {   // used only until the kit's samples load
    var ctx = E.ctx, g = ctx.createGain(); g.connect(dest); vel = vel || 0.7;
    if (piece === "kick" || piece.indexOf("tom") === 0) {
      var o = ctx.createOscillator(), f = piece === "kick" ? 150 : piece === "tomLo" ? 180 : 260;
      o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(f / 3, when + 0.15);
      g.gain.setValueAtTime(vel, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
      o.connect(g); o.start(when); o.stop(when + 0.32); return;
    }
    var len = piece === "hatOpen" ? 0.3 : piece.indexOf("hat") === 0 ? 0.05 : 0.15;
    var buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = buf;
    var f2 = ctx.createBiquadFilter(); f2.type = piece.indexOf("hat") === 0 ? "highpass" : "bandpass"; f2.frequency.value = piece.indexOf("hat") === 0 ? 7000 : 1800;
    g.gain.setValueAtTime(vel * 0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + len);
    s.connect(f2); f2.connect(g); s.start(when);
  }
  function makeOut(inst) {
    var dest = inst.node;
    return {
      synth: function (m, when, dur, o) { synthVoice(dest, m, when, dur, o); },
      note: function (m, when, dur, o) {
        o = o || {};
        if (G.sound !== "synth" && E.bank && E.bank.has(G.sound)) {
          var spec = { midi: Math.round(m), vel: o.vel != null ? o.vel : 0.7, dur: Math.max(dur, 0.05) };
          if (o.from != null) spec = { midi: Math.round(m), vel: spec.vel, dur: spec.dur, bend: [[0, o.from - m], [0.07, 0]] };
          E.bank.play(G.sound, spec, when, dest);
        } else synthVoice(dest, m, when, dur, o);
      },
      drum: function (p, when, vel) {
        if (E.bank && E.bank.has("kit")) E.bank.play("kit", { piece: p, vel: vel || 0.7 }, when, dest);
        else synthDrum(dest, p, when, vel);
      },
      at: function (when, fn) { E.viz.push({ t: when, fn: fn }); }
    };
  }
  var RATES = [[12, "1/4"], [6, "1/8"], [4, "1/8 triplet"], [3, "1/16"], [2, "1/16 triplet"]];

  // ---------- the types ----------
  var TYPES = [];
  function T(o) { TYPES.push(o); }

  T({ id: "arp", family: "arp", name: "Classic arpeggiator",
    blurb: "Hold a chord; it plays the notes one at a time in a fixed order, over one or more octaves.",
    input: "A held chord", time: "Fixed rate grid", repeats: "Yes, until the chord changes", good: "Instant motion from a chord; trance, synth-pop, film pulses", limit: "Only the order of notes you hold, no rests or rhythm of its own",
    hw: "Roland Jupiter-8 and Juno arpeggiators, nearly every synth and DAW arp plug-in",
    make: function (I) {
      var st = { mode: "up", oct: 1, rate: 3, gate: 0.6 }, seq = [], chips = [];
      var MODES = [["up", "Up"], ["down", "Down"], ["updown", "Up-down (ends repeat)"], ["updownx", "Up-down (ends once)"], ["played", "As played"], ["random", "Random"],
        ["converge", "Converge (outside in)"], ["diverge", "Diverge (inside out)"], ["thumb", "Thumb (low note pedal)"], ["pinky", "Pinky (top note pedal)"], ["chord", "Chord (all at once)"]];
      var viz = h("div", { class: "sq-chips" });
      function build() {
        var base = st.mode === "played" ? G.order.slice() : heldSorted(), l = [];
        if (!base.length) base = [48 + G.key];
        for (var o = 0; o < st.oct; o++) base.forEach(function (m) { l.push(m + 12 * o); });
        var n = l.length, s = [];
        switch (st.mode) {
          case "down": s = l.slice().reverse(); break;
          case "updown": s = l.concat(l.slice().reverse()); break;
          case "updownx": s = l.concat(l.slice(1, -1).reverse()); break;
          case "converge": for (var a = 0, b = n - 1; a <= b; a++, b--) { s.push(l[a]); if (a !== b) s.push(l[b]); } break;
          case "diverge": var c = []; for (var a2 = 0, b2 = n - 1; a2 <= b2; a2++, b2--) { c.push(l[a2]); if (a2 !== b2) c.push(l[b2]); } s = c.reverse(); break;
          case "thumb": for (var k = 1; k < n; k++) { s.push(l[0], l[k]); } if (!s.length) s = l; break;
          case "pinky": for (var k2 = 0; k2 < n - 1; k2++) { s.push(l[n - 1], l[k2]); } if (!s.length) s = l; break;
          case "chord": s = [l]; break;
          default: s = l;
        }
        seq = s; viz.innerHTML = "";
        chips = seq.map(function (x) { var e = h("span", { class: "sq-chip", text: Array.isArray(x) ? x.map(nn).join(" ") : nn(x) }); viz.appendChild(e); return e; });
      }
      I.onInput = build; build();
      I.onTick = function (lt, when, td, out) {
        if (lt % st.rate || !seq.length) return;
        var k = lt / st.rate, i = st.mode === "random" ? Math.floor(Math.random() * seq.length) : k % seq.length;
        [].concat(seq[i]).forEach(function (m) { out.note(m, when, st.rate * td * st.gate); });
        out.at(when, function () { light(chips, i); });
      };
      I.onStop = function () { light(chips, -1); };
      return h("div", {}, [row([sel("Mode", MODES, st.mode, function (v) { st.mode = v; build(); }),
        sel("Octaves", [1, 2, 3, 4], 1, function (v) { st.oct = +v; build(); }),
        sel("Rate", RATES, 3, function (v) { st.rate = +v; }),
        range("Gate", 0.1, 1, 0.05, 0.6, function (v) { st.gate = v; }, function (v) { return Math.round(v * 100) + "%"; })]), viz]);
    } });

  T({ id: "patarp", family: "arp", name: "Pattern arpeggiator",
    blurb: "A grid of chord-note numbers against steps. The rhythm stays; change the chord and the pattern follows it.",
    input: "A held chord + a stored rhythm", time: "Step grid (16)", repeats: "Yes", good: "Piano-style accompaniment patterns, funk stabs, Alberti bass that follows the chords", limit: "Patterns are written by chord-note number, so a chord with fewer notes wraps upward",
    hw: "Yamaha Motif/Montage arpeggio types, Korg wavestation-era and workstation pattern arps, Ableton/Logic pattern arps",
    make: function (I) {
      var d = [[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
      var PRE = { "Alberti": "1000100010001000|0000000000000000|0010001000100010|0101010101010101".split("|"),
        "Broken chord": "1000000010000000|0100000001000000|0010000000100000|0001000000010000".split("|"),
        "Funk stabs": "1001001000100100|1001001000100100|1001001000100100|0000000000000000".split("|"),
        "Waltz-ish (3s)": "1000001000001000|0010100010100010|0010100010100010|0000000000000000".split("|") };
      var g = makeGrid({ rows: 4, cols: 16, get: function (r, c) { return d[3 - r][c]; }, set: function (r, c, v) { d[3 - r][c] = v ? 1 : 0; },
        label: function (r) { return (4 - r) + " " + nn(chordTone(3 - r)); } });
      I.onInput = g.paint;
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var c = (lt / 3) % 16;
        for (var r = 0; r < 4; r++) if (d[r][c]) out.note(chordTone(r), when, 3 * td * 0.9);
        out.at(when, function () { g.col(c); });
      };
      I.onStop = function () { g.col(-1); };
      var pre = sel("Preset", [["", "…"]].concat(Object.keys(PRE).map(function (k) { return [k, k]; })), "", function (v) {
        if (!PRE[v]) return; PRE[v].forEach(function (s, ri) { d[3 - ri] = s.split("").map(Number); }); g.paint(); });
      return h("div", {}, [row([pre]), g.el]);
    } });

  T({ id: "x0x", family: "step", name: "Drum step sequencer (x0x grid)",
    blurb: "Sixteen buttons per drum, one per sixteenth note. Light a button, the drum plays on that step.",
    input: "Programmed by hand", time: "Step grid (16), swing", repeats: "Yes", good: "Drum machines, house, hip-hop, electro; seeing the groove at a glance", limit: "Everything snaps to the grid; one velocity unless there is an accent row",
    hw: "Roland TR-808 and TR-909, most groove boxes and DAW drum racks",
    make: function (I) {
      var P = [["kick", "Kick"], ["snare", "Snare"], ["rim", "Rim"], ["hatClosed", "Hat"], ["hatOpen", "Open hat"], ["tomLo", "Low tom"]];
      var PRE = { "Four on the floor": ["1000100010001000", "0000100000001000", "0000000000000000", "1010101010101010", "0010001000100010", "0000000000000000"],
        "Boom-bap": ["1000000110100000", "0000100000001000", "0000000000000010", "1010101010101010", "0000000000000000", "0000000000000000"],
        "Electro": ["1000001000100000", "0000100000001000", "0001000000010010", "1111111111111111", "0000000000000000", "0000000000000101"],
        "Empty": ["0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000"] };
      var d = PRE["Boom-bap"].map(function (s) { return s.split("").map(Number); }), st = { swing: 0.56 };
      var g = makeGrid({ rows: 6, cols: 16, get: function (r, c) { return d[r][c]; }, set: function (r, c, v) { d[r][c] = v ? 1 : 0; }, label: function (r) { return P[r][1]; } });
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var c = (lt / 3) % 16, dl = c % 2 ? (st.swing - 0.5) * 2 * 3 * td : 0;
        for (var r = 0; r < 6; r++) if (d[r][c]) out.drum(P[r][0], when + dl, c % 4 === 0 ? 0.85 : 0.65);
        out.at(when + dl, function () { g.col(c); });
      };
      I.onStop = function () { g.col(-1); };
      return h("div", {}, [row([sel("Preset", Object.keys(PRE), "Boom-bap", function (v) { d = PRE[v].map(function (s) { return s.split("").map(Number); }); g.paint(); }),
        range("Swing", 0.5, 0.75, 0.01, st.swing, function (v) { st.swing = v; }, function (v) { return Math.round(v * 100) + "%"; })]), g.el]);
    } });

  T({ id: "acid", family: "step", name: "Pitch step sequencer with accent and slide",
    blurb: "One note per step, plus three switches per step: rest, accent (louder, brighter) and slide (glide into the next note).",
    input: "Programmed by hand", time: "Step grid (16)", repeats: "Yes", good: "Bass lines, acid house; the slides and accents are the style", limit: "One note at a time; editing on the hardware is famously awkward",
    hw: "Roland TB-303 and its many clones",
    make: function (I) {
      var steps = [], init = [0, 0, 12, 0, 3, 0, 7, 5, 0, 12, 10, 0, 3, 3, 15, 7], acc = "1000100100100001", sl = "0010000100000100", rest = "0000000000010000";
      for (var i = 0; i < 16; i++) steps.push({ n: init[i], on: rest[i] !== "1", a: acc[i] === "1", s: sl[i] === "1" });
      var st = { wave: "sawtooth", cut: 700, decay: 0.3 }, cols = [], wrap = h("div", { class: "sq-acid" });
      function nm(s) { return pcName(36 + G.key + s.n) + (s.n >= 12 ? "↑" : ""); }
      function draw() {
        wrap.innerHTML = ""; cols = [];
        steps.forEach(function (s, i) {
          var nameEl = h("span", { class: "sq-an", text: s.on ? nm(s) : "–" });
          var col = h("div", { class: "sq-acol" + (i % 4 === 0 ? " beat" : "") }, [
            btn("▲", function () { s.n = Math.min(24, s.n + 1); draw(); }, "sq-mini"), nameEl, btn("▼", function () { s.n = Math.max(0, s.n - 1); draw(); }, "sq-mini"),
            h("button", { type: "button", class: "sq-t" + (s.on ? " on" : ""), text: "●", title: "note / rest", onclick: function () { s.on = !s.on; draw(); } }),
            h("button", { type: "button", class: "sq-t acc" + (s.a ? " on" : ""), text: "A", title: "accent", onclick: function () { s.a = !s.a; draw(); } }),
            h("button", { type: "button", class: "sq-t sld" + (s.s ? " on" : ""), text: "S", title: "slide", onclick: function () { s.s = !s.s; draw(); } })]);
          cols.push(col); wrap.appendChild(col);
        });
      }
      draw(); I.onInput = draw;
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var i = (lt / 3) % 16, s = steps[i], p = steps[(i + 15) % 16];
        if (s.on) {
          var m = 36 + G.key + s.n, from = p.on && p.s ? 36 + G.key + p.n : null;
          out.synth(m, when, s.s ? 3 * td * 1.08 : 3 * td * 0.5, { wave: st.wave, cut: st.cut, decay: st.decay, accent: s.a, from: from, vel: s.a ? 0.9 : 0.6 });
        }
        out.at(when, function () { light(cols, i); });
      };
      I.onStop = function () { light(cols, -1); };
      return h("div", {}, [row([sel("Wave", [["sawtooth", "Saw"], ["square", "Square"]], "sawtooth", function (v) { st.wave = v; }),
        range("Cutoff", 200, 3000, 10, st.cut, function (v) { st.cut = v; }, function (v) { return v + " Hz"; }),
        range("Decay", 0.08, 0.8, 0.01, st.decay, function (v) { st.decay = v; }, function (v) { return v.toFixed(2) + " s"; }),
        btn("Randomize", function () { steps.forEach(function (s) { s.n = [0, 0, 0, 3, 5, 7, 10, 12, 15][Math.floor(Math.random() * 9)]; s.on = Math.random() > 0.15; s.a = Math.random() < 0.3; s.s = Math.random() < 0.2; }); draw(); })]),
        h("div", { class: "sq-scroll" }, [wrap]), h("p", { class: "sq-note", text: "Always the built-in synth: the slide is a glide of one voice." })]);
    } });

  T({ id: "analog", family: "step", name: "Analog step sequencer (knobs)",
    blurb: "A row of knobs, one per step, each setting a voltage (a pitch). Few steps, but direction, length and ratchets make them go far.",
    input: "Knob per step", time: "Clock pulses, 1–8 steps", repeats: "Yes (or random direction)", good: "Berlin-school sequences, modular patches, hands-on tweaking while it runs", limit: "Few steps; unquantized knobs drift out of tune unless snapped to a scale",
    hw: "Moog 960, ARP 1601/1613, Doepfer and Make Noise modular sequencers, Arturia KeyStep's transpose",
    make: function (I) {
      var v = [0, 7, 12, 3, 15, 10, 7, 12], rat = [1, 1, 1, 2, 1, 1, 3, 1], st = { dir: "fwd", len: 8, rate: 3, q: true, tr: false, pos: -1, d: 1 };
      var knobs = [], labels = [], ratB = [], wrap = h("div", { class: "sq-knobs" });
      function pitch(i) { var s = st.q ? snapToScale(v[i]) : v[i]; var t = st.tr ? heldSorted()[0] - 48 - G.key : 0; return 48 + G.key + s + t; }
      function label() { for (var i = 0; i < 8; i++) { labels[i].textContent = st.q ? nn(pitch(i)) : nn(pitch(i)) + (Math.abs(v[i] - Math.round(v[i])) > 0.05 ? "~" : ""); knobs[i].parentNode.classList.toggle("dis", i >= st.len); } }
      for (var i = 0; i < 8; i++) (function (i) {
        var r = h("input", { type: "range", min: 0, max: 24, step: 0.01, value: v[i], class: "sq-vknob" });
        r.addEventListener("input", function () { v[i] = +r.value; label(); });
        var l = h("span", { class: "sq-an" }), rb = btn("×" + rat[i], function () { rat[i] = rat[i] % 4 + 1; rb.textContent = "×" + rat[i]; }, "sq-mini");
        knobs.push(r); labels.push(l); ratB.push(rb);
        wrap.appendChild(h("div", { class: "sq-knob" }, [r, l, rb]));
      })(i);
      label(); I.onInput = label;
      I.reset = function () { st.pos = -1; st.d = 1; };
      function next() {
        var n = st.len;
        if (st.dir === "fwd") st.pos = (st.pos + 1) % n;
        else if (st.dir === "rev") st.pos = st.pos <= 0 ? n - 1 : st.pos - 1;
        else if (st.dir === "rnd") st.pos = Math.floor(Math.random() * n);
        else { if (n === 1) st.pos = 0; else { var p = st.pos + st.d; if (p >= n || p < 0) { st.d = -st.d; p = st.pos + st.d; } st.pos = Math.max(0, Math.min(n - 1, p)); } }
        return st.pos;
      }
      I.onTick = function (lt, when, td, out) {
        if (lt % st.rate) return; var i = next(), r = rat[i], len = st.rate * td / r;
        for (var k = 0; k < r; k++) out.note(pitch(i), when + k * len, len * 0.6, { vel: k ? 0.5 : 0.75 });
        out.at(when, function () { knobs.forEach(function (kn, j) { kn.parentNode.classList.toggle("now", j === i); }); });
      };
      I.onStop = function () { knobs.forEach(function (kn) { kn.parentNode.classList.remove("now"); }); };
      var trk = h("input", { type: "checkbox" }); trk.addEventListener("change", function () { st.tr = trk.checked; label(); });
      var qk = h("input", { type: "checkbox", checked: "checked" }); qk.addEventListener("change", function () { st.q = qk.checked; label(); });
      return h("div", {}, [row([sel("Direction", [["fwd", "Forward"], ["rev", "Reverse"], ["pend", "Pendulum"], ["rnd", "Random"]], "fwd", function (x) { st.dir = x; }),
        sel("Length", [1, 2, 3, 4, 5, 6, 7, 8], 8, function (x) { st.len = +x; if (st.pos >= st.len) st.pos = -1; label(); }),
        sel("Rate", RATES, 3, function (x) { st.rate = +x; }),
        h("label", { class: "sq-chk" }, [qk, " Snap to scale"]), h("label", { class: "sq-chk" }, [trk, " Transpose by lowest held note"])]), wrap,
        h("p", { class: "sq-note", text: "×2 / ×3 / ×4 under a knob is a ratchet: that step fires again inside its own time." })]);
    } });

  T({ id: "trig", family: "step", name: "Conditional-trig sequencer",
    blurb: "A step grid where each step can carry a rule: play 50% of the time, only on the 2nd of every 4 loops, only during a fill, only if the last rule fired.",
    input: "Programmed by hand", time: "Step grid (16) + loop count", repeats: "Varies by loop, by design", good: "Patterns that evolve over 2, 4, 8 bars from one bar of steps; live fills", limit: "Rules are hidden inside steps, so the pattern is harder to read at a glance",
    hw: "Elektron Digitakt / Octatrack / Analog Rytm (trig conditions, parameter locks)",
    make: function (I) {
      var CONDS = ["always", "50%", "25%", "75%", "1:2", "2:2", "1:4", "2:4", "3:4", "4:4", "FILL", "NOT FILL", "PRE", "NOT PRE"];
      var tracks = [{ name: "Melody", s: [] }, { name: "Hat", s: [] }], st = { fill: false, sel: [0, 0], loop: 0 };
      for (var i = 0; i < 16; i++) { tracks[0].s.push({ on: false, c: "always", n: 0, v: 0.7 }); tracks[1].s.push({ on: i % 2 === 0, c: "always", n: 0, v: 0.6 }); }
      [[0, "always", 0], [3, "50%", 2], [6, "1:2", 1], [8, "always", 3], [10, "2:4", 5], [11, "PRE", 6], [14, "FILL", 4], [15, "NOT FILL", 2]].forEach(function (x) { var s = tracks[0].s[x[0]]; s.on = true; s.c = x[1]; s.n = x[2]; });
      tracks[1].s[13].on = true; tracks[1].s[13].c = "FILL"; tracks[1].s[15].on = true; tracks[1].s[15].c = "1:4";
      var lines = [], ed = h("div", { class: "sq-row" }), loopEl = h("b", { text: "1" });
      function short(c) { return c === "always" ? "" : c.replace("NOT ", "!"); }
      function draw() {
        lines.forEach(function (l, t) {
          l.forEach(function (b, i) { var s = tracks[t].s[i]; b.classList.toggle("on", s.on); b.classList.toggle("sel", st.sel[0] === t && st.sel[1] === i); b.textContent = s.on ? short(s.c) : ""; });
        });
        var s = tracks[st.sel[0]].s[st.sel[1]]; ed.innerHTML = "";
        ed.appendChild(h("span", { class: "sq-note", text: tracks[st.sel[0]].name + " step " + (st.sel[1] + 1) + (s.on ? "" : " (off)") + ":" }));
        ed.appendChild(sel("Condition", CONDS, s.c, function (x) { s.c = x; s.on = true; draw(); }));
        if (st.sel[0] === 0) ed.appendChild(sel("Note lock (chord note)", [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { return [k, (k + 1) + " · " + nn(chordTone(k))]; }), s.n, function (x) { s.n = +x; }));
        ed.appendChild(range("Velocity lock", 0.1, 1, 0.05, s.v, function (x) { s.v = x; }, function (x) { return Math.round(x * 100); }));
      }
      var gridEl = h("div", { class: "sq-grid" });
      tracks.forEach(function (tr, t) {
        var line = h("div", { class: "sq-gline" }, [h("span", { class: "sq-glab", text: tr.name })]), l = [];
        for (var i = 0; i < 16; i++) (function (i) {
          var b = h("button", { type: "button", class: "sq-cell sq-trig" + (i % 4 === 0 ? " beat" : "") });
          b.addEventListener("click", function () { var s = tr.s[i]; if (st.sel[0] === t && st.sel[1] === i && s.on) s.on = false; else s.on = true; st.sel = [t, i]; draw(); });
          l.push(b); line.appendChild(b);
        })(i);
        lines.push(l); gridEl.appendChild(line);
      });
      draw(); I.onInput = draw;
      var pre = [true, true];
      function test(c, loop, t) {
        switch (c) {
          case "always": return true; case "50%": return Math.random() < 0.5; case "25%": return Math.random() < 0.25; case "75%": return Math.random() < 0.75;
          case "FILL": return st.fill; case "NOT FILL": return !st.fill; case "PRE": return pre[t]; case "NOT PRE": return !pre[t];
          default: var a = c.split(":"); return loop % +a[1] === +a[0] - 1;
        }
      }
      I.reset = function () { pre = [true, true]; };
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var i = (lt / 3) % 16, loop = Math.floor(lt / 48);
        tracks.forEach(function (tr, t) {
          var s = tr.s[i]; if (!s.on) return;
          var ok = test(s.c, loop, t); if (s.c !== "PRE" && s.c !== "NOT PRE" && s.c !== "always") pre[t] = ok;
          if (!ok) return;
          if (t === 0) out.note(chordTone(s.n), when, 3 * td * 0.8, { vel: s.v }); else out.drum(s.c === "FILL" ? "hatOpen" : "hatClosed", when, s.v);
        });
        out.at(when, function () { loopEl.textContent = (loop % 4) + 1 + " of 4 (loop " + (loop + 1) + ")"; lines.forEach(function (l) { light(l, i); }); });
      };
      I.onStop = function () { lines.forEach(function (l) { light(l, -1); }); };
      var fb = btn("FILL: off", function () { st.fill = !st.fill; fb.textContent = "FILL: " + (st.fill ? "on" : "off"); fb.classList.toggle("btn-warning", st.fill); });
      return h("div", {}, [row([fb, h("span", { class: "sq-note" }, ["Loop ", loopEl])]), gridEl, ed,
        h("p", { class: "sq-note", text: "Click a step to select it, click again to turn it off. 1:4 = the 1st of every 4 loops. PRE = only if this track's last rule came true." })]);
    } });

  T({ id: "euclid", family: "math", name: "Euclidean sequencer",
    blurb: "Say how many hits and how many steps; it spreads the hits as evenly as possible. Three hits in eight steps gives the tresillo.",
    input: "Two numbers per ring", time: "Step count per ring", repeats: "Yes (rings of different lengths drift)", good: "World-music and techno rhythms from two numbers; fast exploration", limit: "Only evenly spread patterns, unless rotated or layered",
    hw: "Eurorack Euclidean modules, Ableton and VCV Euclidean devices; the idea is usually credited to Godfried Toussaint (2005)",
    make: function (I) {
      var rings = [{ p: "kick", n: 8, k: 3, r: 0 }, { p: "rim", n: 16, k: 5, r: 2 }, { p: "hatClosed", n: 12, k: 7, r: 0 }], dots = [];
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "-110 -110 220 220"); svg.setAttribute("class", "sq-euclid");
      function hit(R, i) { return ((i + R.r) * R.k) % R.n < R.k; }
      function draw() {
        svg.innerHTML = ""; dots = [];
        rings.forEach(function (R, ri) {
          var rad = 95 - ri * 28, c = document.createElementNS(NS, "circle"); c.setAttribute("r", rad); c.setAttribute("class", "ring"); svg.appendChild(c);
          dots[ri] = [];
          for (var i = 0; i < R.n; i++) {
            var a = -Math.PI / 2 + 2 * Math.PI * i / R.n, d = document.createElementNS(NS, "circle");
            d.setAttribute("cx", (rad * Math.cos(a)).toFixed(1)); d.setAttribute("cy", (rad * Math.sin(a)).toFixed(1)); d.setAttribute("r", hit(R, i) ? 7 : 3.5);
            d.setAttribute("class", "dot r" + ri + (hit(R, i) ? " on" : "")); svg.appendChild(d); dots[ri].push(d);
          }
        });
      }
      draw();
      var PCS = [["kick", "Kick"], ["snare", "Snare"], ["rim", "Rim"], ["hatClosed", "Hat"], ["hatOpen", "Open hat"], ["tomLo", "Low tom"], ["tomHi", "High tom"], ["rideBell", "Bell"]];
      var ctl = h("div", { class: "sq-rings" });
      rings.forEach(function (R, ri) {
        var kc = range("Hits", 0, R.n, 1, R.k, function (v) { R.k = v; draw(); });
        ctl.appendChild(h("div", { class: "sq-ringctl r" + ri }, [sel("Ring " + (ri + 1), PCS, R.p, function (v) { R.p = v; }),
          range("Steps", 1, 16, 1, R.n, function (v) { R.n = v; kc.input.max = v; if (R.k > v) { R.k = v; kc.input.value = v; } draw(); }), kc,
          range("Rotate", 0, 15, 1, R.r, function (v) { R.r = v; draw(); })]));
      });
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var s = lt / 3, idx = [];
        rings.forEach(function (R, ri) { var i = s % R.n; idx[ri] = i; if (R.k && hit(R, i)) out.drum(R.p, when, i === 0 ? 0.85 : 0.65); });
        out.at(when, function () { dots.forEach(function (l, ri) { l.forEach(function (d, i) { d.classList.toggle("now", i === idx[ri]); }); }); });
      };
      I.onStop = function () { dots.forEach(function (l) { l.forEach(function (d) { d.classList.remove("now"); }); }); };
      return h("div", { class: "sq-two" }, [svg, ctl]);
    } });

  T({ id: "poly", family: "math", name: "Polymetric sequencer",
    blurb: "Every track has its own length. A 16-step, a 12-step and a 5-step track drift apart and only line up again after many bars.",
    input: "Programmed by hand", time: "Step grid, a length per track", repeats: "Yes, but the whole only after the lowest common multiple", good: "Long, slowly changing patterns from short loops; minimalism, techno", limit: "Hard to land a phrase on the downbeat",
    hw: "Elektron per-track lengths, Squarp Pyramid, Ableton clips of different lengths",
    make: function (I) {
      var L = [16, 12, 5], d = [[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0], [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
      var info = h("p", { class: "sq-note" }), pos = [0, 0, 0];
      function gcd(a, b) { return b ? gcd(b, a % b) : a; }
      function lcm() { return L.reduce(function (a, b) { return a * b / gcd(a, b); }); }
      var NM = ["Bass (root)", "Middle", "Top"];
      function note(t) { return t === 0 ? chordTone(0) - 12 : t === 1 ? chordTone(1) : chordTone(3) + 12; }
      var g = makeGrid({ rows: 3, cols: 16, get: function (r, c) { return d[r][c]; }, set: function (r, c, v) { d[r][c] = v ? 1 : 0; }, dis: function (r, c) { return c >= L[r]; }, label: function (r) { return NM[r]; } });
      function infoTxt(s) { var m = lcm(); info.textContent = "Lengths " + L.join(" · ") + ": the three line up again every " + m + " steps (" + (m / 16) + " bars of 4/4)" + (s != null ? ". Now at step " + (s % m + 1) + "." : "."); }
      infoTxt();
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var s = lt / 3;
        for (var t = 0; t < 3; t++) { pos[t] = s % L[t]; if (d[t][pos[t]]) out.note(note(t), when, 3 * td * 0.9, { vel: t === 0 ? 0.8 : 0.6 }); }
        var p = pos.slice(); out.at(when, function () { for (var r = 0; r < 3; r++) for (var c = 0; c < 16; c++) g.cells[r][c].classList.toggle("now", c === p[r]); infoTxt(s); });
      };
      I.onStop = function () { g.col(-1); };
      return h("div", {}, [row(L.map(function (x, t) { return sel(NM[t] + " length", Array.from({ length: 16 }, function (_, i) { return i + 1; }), x, function (v) { L[t] = +v; g.paint(); infoTxt(); }); })), g.el, info]);
    } });

  T({ id: "cart", family: "math", name: "Cartesian (2-D) sequencer",
    blurb: "The steps are a 4×4 grid, not a line. Walk it by rows, columns, snake, at random, or with separate X and Y clocks.",
    input: "A pitch per cell", time: "Two clocks or a path", repeats: "Depends on the path", good: "Many variations from 16 notes; modular performance", limit: "Hard to predict which melody comes out",
    hw: "Make Noise René",
    make: function (I) {
      var v = [0, 2, 4, 7, 9, 7, 4, 2, 5, 4, 2, 0, 7, 9, 11, 12], mute = {}, st = { mode: "rows", rate: 3, yEvery: 3, x: 0, y: 0, k: -1 }, cells = [];
      var box = h("div", { class: "sq-cart" });
      function paint() { cells.forEach(function (c, i) { c.textContent = mute[i] ? "·" : nn(deg(v[i], 60)); c.classList.toggle("muted", !!mute[i]); }); }
      for (var i = 0; i < 16; i++) (function (i) {
        var c = h("button", { type: "button", class: "sq-ccell", title: "click: up a scale step · right-click: down · shift-click: mute" });
        c.addEventListener("click", function (e) { if (e.shiftKey) mute[i] = !mute[i]; else v[i] = (v[i] + 1) % 15; paint(); });
        c.addEventListener("contextmenu", function (e) { e.preventDefault(); v[i] = (v[i] + 14) % 15; paint(); });
        cells.push(c); box.appendChild(c);
      })(i);
      paint(); I.onInput = paint;
      I.reset = function () { st.k = -1; st.x = 0; st.y = 0; };
      function step() {
        var k = ++st.k, x, y;
        switch (st.mode) {
          case "cols": y = k % 4; x = Math.floor(k / 4) % 4; break;
          case "snake": y = Math.floor(k / 4) % 4; x = y % 2 ? 3 - k % 4 : k % 4; break;
          case "diag": x = k % 4; y = (k % 4 + Math.floor(k / 4)) % 4; break;
          case "walk": if (k) { var m = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]; st.x = (st.x + m[0] + 4) % 4; st.y = (st.y + m[1] + 4) % 4; } x = st.x; y = st.y; break;
          case "xy": x = k % 4; y = Math.floor(k / st.yEvery) % 4; break;
          default: x = k % 4; y = Math.floor(k / 4) % 4;
        }
        return y * 4 + x;
      }
      I.onTick = function (lt, when, td, out) {
        if (lt % st.rate) return; var i = step();
        if (!mute[i]) out.note(deg(v[i], 60), when, st.rate * td * 0.8);
        out.at(when, function () { light(cells, i); });
      };
      I.onStop = function () { light(cells, -1); };
      return h("div", { class: "sq-two" }, [box, h("div", {}, [
        sel("Path", [["rows", "Rows (like a line)"], ["cols", "Columns"], ["snake", "Snake"], ["diag", "Diagonal"], ["walk", "Random walk"], ["xy", "X and Y clocks"]], "rows", function (x) { st.mode = x; st.k = -1; }),
        sel("Y moves every … X steps", [2, 3, 5, 7], 3, function (x) { st.yEvery = +x; }), sel("Rate", RATES, 3, function (x) { st.rate = +x; }),
        h("p", { class: "sq-note", text: "Click a cell: up a scale step. Right-click: down. Shift-click: mute." })])]);
    } });

  T({ id: "turing", family: "gen", name: "Shift-register (Turing Machine) sequencer",
    blurb: "A loop of bits shifts round every step and the bits are read as a pitch. One knob sets how often a bit flips: never (a locked loop), sometimes (a loop that mutates), always (a loop twice as long).",
    input: "None (random seed)", time: "Clock pulses", repeats: "As much as you allow", good: "Melodies that repeat yet slowly change; lock one you like", limit: "You steer it but cannot write a melody into it",
    hw: "Music Thing Modular Turing Machine (Tom Whitwell)",
    make: function (I) {
      var reg = [], st = { len: 8, p: 0.15, rng: 7, rate: 3, ones: false }, bits = [], hist = [], bars = h("div", { class: "sq-hist" });
      for (var i = 0; i < 16; i++) reg.push(Math.random() < 0.5 ? 1 : 0);
      var bitEl = h("div", { class: "sq-bits" });
      for (var j = 0; j < 16; j++) { var b = h("span", { class: "sq-bit" }); bits.push(b); bitEl.appendChild(b); }
      function paint() { bits.forEach(function (b, i) { b.classList.toggle("on", !!reg[i]); b.classList.toggle("dis", i >= st.len); }); }
      paint();
      I.onTick = function (lt, when, td, out) {
        if (lt % st.rate) return;
        var b = reg[st.len - 1]; if (Math.random() < st.p) b ^= 1;
        for (var i = st.len - 1; i > 0; i--) reg[i] = reg[i - 1]; reg[0] = b;
        var val = 0; for (var k = 0; k < 8; k++) val += reg[k % st.len] << k;
        var d = Math.round(val / 255 * st.rng), m = deg(d, 48);
        var play = !st.ones || reg[0];
        if (play) out.note(m, when, st.rate * td * 0.8);
        out.at(when, function () {
          paint(); hist.push(play ? d : -1); if (hist.length > 32) hist.shift();
          bars.innerHTML = ""; hist.forEach(function (x) { bars.appendChild(h("i", { style: "height:" + (x < 0 ? 0 : 8 + 72 * x / st.rng) + "%" })); });
        });
      };
      function word(p) { return p === 0 ? "locked: the loop repeats exactly" : p === 1 ? "always flips: a locked loop twice as long" : p >= 0.45 && p <= 0.55 ? "coin toss: fully random" : p < 0.5 ? "slowly mutating" : "mostly flipping"; }
      var wd = h("span", { class: "sq-note", text: word(st.p) });
      return h("div", {}, [row([range("Flip chance", 0, 1, 0.01, st.p, function (v) { st.p = v; wd.textContent = word(v); }, function (v) { return Math.round(v * 100) + "%"; }),
        sel("Loop length", [2, 3, 4, 5, 6, 8, 10, 12, 16], 8, function (v) { st.len = +v; paint(); }),
        range("Range (scale steps)", 2, 14, 1, st.rng, function (v) { st.rng = v; }), sel("Rate", RATES, 3, function (v) { st.rate = +v; })]),
        row([wd]), bitEl, bars, h("label", { class: "sq-chk" }, [(function () { var c = h("input", { type: "checkbox" }); c.addEventListener("change", function () { st.ones = c.checked; }); return c; })(), " Rhythm too: play only when the new bit is 1"])]);
    } });

  T({ id: "markov", family: "gen", name: "Markov-chain sequencer",
    blurb: "A table of chances: from this note, how likely is each next note? It never repeats exactly but always sounds like itself.",
    input: "A table of weights", time: "Fixed rate, optional rests", repeats: "No, but it keeps a style", good: "Endless melodies in a style; teaching how melodies move (steps vs leaps)", limit: "No phrase shape or form: it wanders",
    hw: "Generative apps and Max/Pure Data patches; the method goes back to 1950s computer music",
    make: function (I) {
      var N = 7, W = [], st = { cur: 0, rest: 0.15, rate: 6 }, cells = [], heads = [];
      var PRE = { "Steps (mostly by step)": function (i, j) { var d = Math.abs(i - j); return d === 1 ? 3 : d === 2 ? 1 : d === 0 ? 0 : 0; },
        "Pull to tonic": function (i, j) { return j === 0 ? 3 : Math.abs(i - j) === 1 ? 2 : 0; },
        "Leaps": function (i, j) { var d = Math.abs(i - j); return d >= 3 ? 2 : d === 2 ? 1 : 0; },
        "Even (random)": function () { return 1; } };
      function set(name) { for (var i = 0; i < N; i++) { W[i] = []; for (var j = 0; j < N; j++) W[i][j] = PRE[name](i, j); } }
      set("Steps (mostly by step)");
      var tbl = h("table", { class: "sq-mk" });
      function draw() {
        tbl.innerHTML = ""; cells = []; heads = [];
        var hr = h("tr", {}, [h("th", { text: "from ↓ to →" })]);
        for (var j = 0; j < N; j++) hr.appendChild(h("th", { text: pcName(deg(j)) }));
        tbl.appendChild(hr);
        for (var i = 0; i < N; i++) {
          var th = h("th", { text: pcName(deg(i)) }), tr = h("tr", {}, [th]); heads.push(tr); cells[i] = [];
          for (var j2 = 0; j2 < N; j2++) (function (i, j) {
            var td = h("td", {}, [h("button", { type: "button", class: "w" + W[i][j], text: W[i][j] || "", onclick: function () { W[i][j] = (W[i][j] + 1) % 4; draw(); } })]);
            cells[i][j] = td; tr.appendChild(td);
          })(i, j2);
          tbl.appendChild(tr);
        }
      }
      draw(); I.onInput = draw;
      I.reset = function () { st.cur = 0; };
      I.onTick = function (lt, when, td, out) {
        if (lt % st.rate) return;
        var row_ = W[st.cur], tot = row_.reduce(function (a, b) { return a + b; }, 0), from = st.cur;
        if (!tot) st.cur = 0; else { var r = Math.random() * tot; for (var j = 0; j < N; j++) { r -= row_[j]; if (r < 0) { st.cur = j; break; } } }
        var to = st.cur;
        if (Math.random() >= st.rest) out.note(deg(to, 60), when, st.rate * td * 0.85);
        out.at(when, function () { heads.forEach(function (tr, i) { tr.classList.toggle("from", i === from); }); cells.forEach(function (r, i) { r.forEach(function (c, j) { c.classList.toggle("now", i === from && j === to); }); }); });
      };
      I.onStop = function () { heads.forEach(function (tr) { tr.classList.remove("from"); }); };
      return h("div", {}, [row([sel("Table", Object.keys(PRE), "Steps (mostly by step)", function (v) { set(v); draw(); }),
        range("Rests", 0, 0.6, 0.05, st.rest, function (v) { st.rest = v; }, function (v) { return Math.round(v * 100) + "%"; }), sel("Rate", RATES, 6, function (v) { st.rate = +v; })]),
        h("div", { class: "sq-scroll" }, [tbl]), h("p", { class: "sq-note", text: "Click a cell to change its weight (0–3). The highlighted row is the note just played; the lit cell is the move it chose." })]);
    } });

  T({ id: "life", family: "gen", name: "Cellular-automaton sequencer",
    blurb: "A Game of Life board. The playhead reads it column by column, then the board takes one generation and the music changes with it.",
    input: "A starting pattern", time: "Step grid, a generation per pass", repeats: "Until the board settles or dies", good: "Self-evolving textures; gliders become repeating figures", limit: "Often dies out or freezes; little control over the result",
    hw: "Grid apps and modules (monome, Eurorack 'Life' modules, browser toys)",
    make: function (I) {
      var R = 8, C = 16, b = [], st = { evolve: true, gen: 0 }, genEl = h("b", { text: "0" });
      function clear() { b = []; for (var r = 0; r < R; r++) { b[r] = []; for (var c = 0; c < C; c++) b[r][c] = 0; } }
      function rnd() { clear(); for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) b[r][c] = Math.random() < 0.28 ? 1 : 0; }
      function glider() { clear(); [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]].forEach(function (p) { b[p[0] + 1][p[1] + 1] = 1; }); [[4, 9], [4, 10], [4, 11]].forEach(function (p) { b[p[0]][p[1]] = 1; }); }
      glider();
      var g = makeGrid({ rows: R, cols: C, get: function (r, c) { return b[r][c]; }, set: function (r, c, v) { b[r][c] = v ? 1 : 0; }, label: function (r) { return pcName(deg(R - 1 - r, 48)); } });
      I.onInput = g.paint;
      function gen() {
        var n = []; for (var r = 0; r < R; r++) { n[r] = []; for (var c = 0; c < C; c++) {
          var k = 0; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) if (dr || dc) k += b[(r + dr + R) % R][(c + dc + C) % C];
          n[r][c] = b[r][c] ? (k === 2 || k === 3 ? 1 : 0) : (k === 3 ? 1 : 0); } }
        b = n; st.gen++;
      }
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var c = (lt / 3) % C, n = 0;
        for (var r = R - 1; r >= 0 && n < 3; r--) if (b[r][c]) { out.note(deg(R - 1 - r, 48), when, 3 * td * 0.85, { vel: 0.55 }); n++; }
        if (c === C - 1 && st.evolve) { gen(); var gnum = st.gen; out.at(when + 3 * td, function () { g.paint(); genEl.textContent = gnum; }); }
        out.at(when, function () { g.col(c); });
      };
      I.onStop = function () { g.col(-1); };
      var ev = h("input", { type: "checkbox", checked: "checked" }); ev.addEventListener("change", function () { st.evolve = ev.checked; });
      return h("div", {}, [row([btn("Glider", function () { glider(); g.paint(); }), btn("Random", function () { rnd(); g.paint(); }), btn("Clear", function () { clear(); g.paint(); }),
        btn("Step a generation", function () { gen(); g.paint(); genEl.textContent = st.gen; }), h("label", { class: "sq-chk" }, [ev, " Evolve each pass"]), h("span", { class: "sq-note" }, ["Generation ", genEl])]), g.el,
        h("p", { class: "sq-note", text: "At most three notes sound per column (the lowest three)." })]);
    } });

  T({ id: "roll", family: "linear", name: "Piano roll",
    blurb: "Time runs left to right, pitch bottom to top, and a note is a bar you draw at any length. The DAW's way.",
    input: "Drawn or recorded notes", time: "Continuous, grid only for snapping", repeats: "Only if you loop it", good: "Whole songs, chords and melodies with real lengths; editing recorded playing", limit: "Slow to try ideas compared with pressing steps; no built-in variation",
    hw: "Every DAW (Logic, Ableton Live, FL Studio, Cubase…)",
    make: function (I) {
      var R = 15, C = 32, notes = [[7, 0, 4], [9, 4, 2], [10, 6, 2], [9, 8, 6], [7, 14, 2], [5, 16, 4], [4, 20, 2], [5, 22, 2], [7, 24, 8], [0, 0, 8], [3, 8, 8], [-1, 16, 8], [0, 24, 8]].map(function (x) { return { d: x[0] + 0, c: x[1], len: x[2] }; });
      notes.forEach(function (n) { n.r = R - 1 - (n.d + 2); });   // degree -2..12 → row
      var box = h("div", { class: "sq-roll" }), head = h("div", { class: "sq-rhead" }), labs = h("div", { class: "sq-rlabs" });
      box.style.setProperty("--rows", R); box.style.setProperty("--cols", C);
      function rowDeg(r) { return R - 1 - r - 2; }
      function draw() {
        box.querySelectorAll(".sq-rn").forEach(function (e) { e.remove(); });
        notes.forEach(function (n, i) {
          var e = h("div", { class: "sq-rn", title: "click to delete" });
          e.style.left = (n.c / C * 100) + "%"; e.style.width = (n.len / C * 100) + "%"; e.style.top = (n.r / R * 100) + "%"; e.style.height = (100 / R) + "%";
          e.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); notes.splice(i, 1); draw(); });
          box.appendChild(e);
        });
        labs.innerHTML = ""; for (var r = 0; r < R; r++) labs.appendChild(h("span", { text: nn(deg(rowDeg(r), 60)) }));
      }
      var drag = null;
      box.addEventListener("pointerdown", function (ev) {
        var rc = box.getBoundingClientRect(), c = Math.floor((ev.clientX - rc.left) / rc.width * C), r = Math.floor((ev.clientY - rc.top) / rc.height * R);
        if (c < 0 || r < 0 || c >= C || r >= R) return;
        drag = { r: r, c: c, len: 1, rc: rc }; notes.push(drag); box.setPointerCapture(ev.pointerId); draw();
      });
      box.addEventListener("pointermove", function (ev) { if (!drag) return; var c = Math.floor((ev.clientX - drag.rc.left) / drag.rc.width * C); drag.len = Math.max(1, Math.min(C - drag.c, c - drag.c + 1)); draw(); });
      box.addEventListener("pointerup", function () { drag = null; });
      box.appendChild(head); draw(); I.onInput = draw;
      I.onTick = function (lt, when, td, out) {
        if (lt % 3) return; var c = (lt / 3) % C;
        notes.forEach(function (n) { if (n.c === c) out.note(deg(rowDeg(n.r), 60), when, n.len * 3 * td * 0.95); });
        out.at(when, function () { head.style.left = (c / C * 100) + "%"; head.style.display = "block"; });
      };
      I.onStop = function () { head.style.display = "none"; };
      return h("div", {}, [h("div", { class: "sq-rollwrap" }, [labs, box]), h("p", { class: "sq-note", text: "Press and drag to draw a note as long as you like; click a note to delete it. Two bars, rows follow the key and scale." })]);
    } });

  T({ id: "tracker", family: "linear", name: "Tracker",
    blurb: "Time runs top to bottom in numbered rows of text: note, volume, effect. Effects like 037 (a fast arpeggio) are typed per row.",
    input: "Typed notes and effect codes", time: "Rows, ticks per row", repeats: "Patterns chained in an order list", good: "Precise, keyboard-fast composing; chiptune, jungle, demoscene; per-row effects", limit: "Reads like a spreadsheet; steep to learn",
    hw: "Ultimate Soundtracker and ProTracker (Amiga), FastTracker 2, Renoise, the Polyend Tracker, LSDJ",
    make: function (I) {
      var ROWS = 16, ch = [[], []];
      var c1 = ["C-4 30 037", "--- -- 037", "--- -- 037", "--- -- 037", "A-3 30 037", "--- -- 037", "--- -- 037", "--- -- 037", "F-3 30 047", "--- -- 047", "--- -- 047", "--- -- 047", "G-3 30 047", "--- -- 047", "OFF -- ---", "G-4 20 ---"];
      var c2 = ["C-2 40 ---", "--- -- ---", "C-3 28 ---", "OFF -- ---", "A-1 40 ---", "--- -- ---", "A-2 28 ---", "OFF -- ---", "F-1 40 ---", "--- -- ---", "F-2 28 ---", "OFF -- ---", "G-1 40 ---", "--- -- ---", "G-2 28 ---", "B-2 28 ---"];
      for (var i = 0; i < ROWS; i++) { var a = c1[i].split(" "), b = c2[i].split(" "); ch[0].push({ n: a[0], v: a[1], f: a[2] }); ch[1].push({ n: b[0], v: b[1], f: b[2] }); }
      var tb = h("table", { class: "sq-trk" }), trs = [];
      tb.appendChild(h("tr", {}, [h("th", { text: "Row" }), h("th", { colspan: 3, text: "Ch 1 (square)" }), h("th", { colspan: 3, text: "Ch 2 (triangle)" })]));
      function inp(o, k, w) { var e = h("input", { value: o[k], size: w, maxlength: w, spellcheck: "false" }); e.addEventListener("input", function () { o[k] = e.value.toUpperCase(); }); return h("td", {}, [e]); }
      for (var r = 0; r < ROWS; r++) {
        var tr = h("tr", { class: r % 4 === 0 ? "beat" : "" }, [h("td", { class: "rn", text: ("0" + r.toString(16).toUpperCase()).slice(-2) })]);
        ch.forEach(function (c) { tr.appendChild(inp(c[r], "n", 3)); tr.appendChild(inp(c[r], "v", 2)); tr.appendChild(inp(c[r], "f", 3)); });
        trs.push(tr); tb.appendChild(tr);
      }
      function parse(s) { var m = /^([A-G])([-#])(\d)$/.exec(s || ""); if (!m) return null; return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : 0); }
      function isNote(s) { return parse(s) != null || s === "OFF"; }
      function arp(f) { var m = /^0([0-9A-F])([0-9A-F])$/.exec(f || ""); return m && f !== "000" ? [0, parseInt(m[1], 16), parseInt(m[2], 16)] : null; }
      var cur = [null, null], vol = [0.6, 0.6], WAVE = ["square", "triangle"];
      I.reset = function () { cur = [null, null]; };
      I.onTick = function (lt, when, td, out) {
        var r = Math.floor(lt / 3) % ROWS, t = lt % 3;
        ch.forEach(function (c, k) {
          var e = c[r];
          if (t === 0) {
            var v = parseInt(e.v, 16); if (!isNaN(v)) vol[k] = Math.min(64, v) / 64;
            if (e.n === "OFF") cur[k] = null;
            else { var m = parse(e.n); if (m != null) {
              cur[k] = m;
              if (!arp(e.f)) { var len = 1; while (len < ROWS && !isNote(c[(r + len) % ROWS].n) && !arp(c[(r + len) % ROWS].f)) len++; play(k, m, when, len * 3 * td * 0.97, out); }
            } }
          }
          var a = arp(e.f); if (a && cur[k] != null) play(k, cur[k] + a[t], when, td * 0.95, out);
        });
        if (t === 0) out.at(when, function () { light(trs, r); });
      };
      function play(k, m, when, dur, out) { if (G.sound === "synth") out.synth(m, when, dur, { wave: WAVE[k], cut: 5000, res: 0.5, decay: 1, vel: vol[k] }); else out.note(m, when, dur, { vel: vol[k] }); }
      I.onStop = function () { light(trs, -1); };
      return h("div", {}, [h("div", { class: "sq-scroll" }, [tb]),
        h("p", { class: "sq-note", text: "Note C-4 / C#4 · OFF ends it · volume 00–40 hex · effect 0xy = arpeggio: the note, +x, +y semitones every tick (037 minor, 047 major). Edit any cell while it plays." })]);
    } });

  T({ id: "loop", family: "linear", name: "Real-time loop recorder",
    blurb: "Press record and play; what you played comes round again, and you add more on each pass. Quantize pulls it toward the grid.",
    input: "Your playing", time: "Free timing, optional quantize", repeats: "Yes, the loop", good: "Capturing feel; building parts one hand at a time", limit: "Timing mistakes are recorded too (unless quantized)",
    hw: "MPC and groovebox live recording, Elektron live record, DAW loop recording, looper pedals (for audio)",
    make: function (I) {
      var LOOP = 96, ev = [], st = { rec: false, q: 0, click: true, pass: 0 }, tl = h("div", { class: "sq-tl" }), ph = h("i", { class: "ph" });
      tl.appendChild(ph);
      function keys() { var a = []; for (var i = 0; i < 8; i++) a.push(deg(i, 60)); return a; }
      var kb = h("div", { class: "sq-keys" }), kbtn = [];
      function drawKeys() { kb.innerHTML = ""; kbtn = keys().map(function (m, i) { var b = h("button", { type: "button", class: "sq-key", text: pcName(m) + "\n" + "ASDFGHJK"[i] }); b.addEventListener("pointerdown", function () { hit(i); }); kb.appendChild(b); return b; }); }
      drawKeys(); I.onInput = function () { drawKeys(); drawTl(); };
      function drawTl() {
        tl.querySelectorAll("b").forEach(function (e) { e.remove(); });
        ev.forEach(function (e) { var d = h("b"); d.style.left = (qt(e.t) / LOOP * 100) + "%"; d.style.bottom = (e.i / 8 * 88 + 4) + "%"; tl.appendChild(d); });
      }
      function qt(t) { return st.q ? (Math.round(t / st.q) * st.q) % LOOP : t; }
      function hit(i) {
        ensure(); var m = keys()[i];
        if (!I.node) { startInst(I); }
        I.out.note(m, E.ctx.currentTime, 0.3);
        if (kbtn[i]) { kbtn[i].classList.add("down"); setTimeout(function () { kbtn[i].classList.remove("down"); }, 150); }
        if (st.rec && I.playing && I.lastTime != null) {
          var pos = I.lastTick + (E.ctx.currentTime - I.lastTime) / I.td; pos = ((pos % LOOP) + LOOP) % LOOP;
          ev.push({ t: pos, i: i, pass: st.pass }); drawTl();
        }
      }
      document.addEventListener("keydown", function (e) {
        if (!I.playing || e.repeat || e.metaKey || e.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        var i = "asdfghjk".indexOf(e.key.toLowerCase()); if (i >= 0) { hit(i); e.preventDefault(); }
      });
      I.onTick = function (lt, when, td, out) {
        var L = lt % LOOP, ks = keys();
        if (st.click && L % 12 === 0) out.drum(L === 0 ? "rim" : "sticks", when, L === 0 ? 0.7 : 0.4);
        ev.forEach(function (e) { var t = qt(e.t); if (Math.floor(t) === L) out.note(ks[e.i], when + (t - L) * td, 0.3); });
        if (L % 3 === 0) out.at(when, function () { ph.style.left = (L / LOOP * 100) + "%"; });
      };
      var rb = btn("● Record", function () { st.rec = !st.rec; if (st.rec) { st.pass++; if (!I.playing) startInst(I); } rb.classList.toggle("btn-danger", st.rec); rb.textContent = st.rec ? "● Recording" : "● Record"; });
      var ck = h("input", { type: "checkbox", checked: "checked" }); ck.addEventListener("change", function () { st.click = ck.checked; });
      return h("div", {}, [row([rb, sel("Quantize", [[0, "Off (as played)"], [6, "1/8"], [3, "1/16"], [4, "1/8 triplet"]], 0, function (v) { st.q = +v; drawTl(); }),
        btn("Undo last pass", function () { ev = ev.filter(function (e) { return e.pass !== st.pass; }); st.pass = Math.max(0, st.pass - 1); drawTl(); }),
        btn("Clear", function () { ev = []; drawTl(); }), h("label", { class: "sq-chk" }, [ck, " Click"])]), kb, tl,
        h("p", { class: "sq-note", text: "Two-bar loop. Play the buttons or the keys A S D F G H J K while it runs; switch quantize on and off to hear the same playing pulled to the grid." })]);
    } });

  var FAMILIES = { arp: "Arpeggiator", step: "Step", math: "Pattern math", gen: "Generative", linear: "Linear / recorded" };
  var EXTRA = [   // rows in the table with no demo of their own
    { name: "Pattern chain / song mode", family: "linear", input: "Saved patterns", time: "Patterns in a list", repeats: "Each pattern loops, the list does not", good: "Turning 1-bar loops into a song on a drum machine or groovebox", limit: "Arrangement is blocky", hw: "Drum-machine song modes, tracker order lists, Ableton's Session view" },
    { name: "Chord memory / strummer", family: "arp", input: "One key", time: "As played", repeats: "No", good: "Big chords from one finger; harp-like strums", limit: "One chord shape, transposed", hw: "Korg Polysix chord memory, Omnichord strum plate" },
    { name: "Note repeat", family: "arp", input: "A held pad or key", time: "Fixed rate grid", repeats: "While held", good: "Hi-hat rolls, trap rolls, steady 16ths without tapping them", limit: "One note, one rate at a time", hw: "Akai MPC note repeat, Maschine" }
  ];

  // ---------- page ----------
  var instances = [];
  function makeCard(Tp, opts) {
    opts = opts || {};
    var I = { T: Tp, pan: 0, playing: false };
    var pb = btn("▶ Play", function () { I.playing ? stopInst(I) : startInst(I); }, "btn-primary");
    I.paintBtn = function () { pb.textContent = I.playing ? "■ Stop" : "▶ Play"; pb.classList.toggle("btn-primary", !I.playing); pb.classList.toggle("btn-secondary", I.playing); };
    var body = Tp.make(I);
    var more = h("details", { class: "sq-more" }, [h("summary", { text: "Good for, limits, examples" }), h("dl", {}, [
      h("dt", { text: "Good for" }), h("dd", { text: Tp.good }), h("dt", { text: "Limit" }), h("dd", { text: Tp.limit }),
      h("dt", { text: "Examples (from memory, unverified)" }), h("dd", { text: Tp.hw })])]);
    I.el = h("div", { class: "sq-card" + (Tp.wide ? " sq-wide" : ""), id: opts.id || null, "data-family": Tp.family }, [
      h("div", { class: "sq-head" }, [h("h3", { text: Tp.name }), h("span", { class: "sq-fam f-" + Tp.family, text: FAMILIES[Tp.family] }), pb]),
      h("p", { class: "sq-blurb", text: Tp.blurb }), body, more]);
    instances.push(I);
    return I;
  }
  function broadcast() { instances.forEach(function (i) { if (i.onInput) i.onInput(); }); }

  function buildInput(el) {
    var kb = h("div", { class: "sq-piano" }), keys = [];
    for (var m = 48; m <= 72; m++) (function (m) {
      var black = [1, 3, 6, 8, 10].indexOf(m % 12) >= 0;
      var k = h("button", { type: "button", class: "pk " + (black ? "blk" : "wht"), title: nn(m) });
      k.addEventListener("click", function () {
        var i = G.held.indexOf(m);
        if (i >= 0) { G.held.splice(i, 1); G.order = G.order.filter(function (x) { return x !== m; }); } else { G.held.push(m); G.order.push(m); }
        paint(); broadcast();
      });
      keys.push([m, k]); kb.appendChild(k);
    })(m);
    var heldEl = h("span", { class: "sq-note" });
    function paint() { keys.forEach(function (x) { x[1].classList.toggle("on", G.held.indexOf(x[0]) >= 0); }); heldEl.textContent = G.held.length ? "Held, in the order pressed: " + G.order.map(nn).join(" ") : "Nothing held (the root is used)"; }
    var CH = { "maj": [0, 4, 7], "min": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "sus4": [0, 5, 7], "min9": [0, 3, 7, 10, 14] };
    var chordRoot = 0;
    var chordBtns = h("div", { class: "sq-row" });
    Object.keys(CH).forEach(function (q) { chordBtns.appendChild(btn(q === "maj" ? "Major" : q === "min" ? "Minor" : q, function () { G.held = CH[q].map(function (x) { return 48 + chordRoot + x; }); G.order = G.held.slice(); paint(); broadcast(); })); });
    chordBtns.appendChild(btn("Clear", function () { G.held = []; G.order = []; paint(); broadcast(); }));
    var sounds = [["synth", "Built-in synth"]];
    if (global.BandSounds) ["piano", "bass"].forEach(function (f) { global.BandSounds.sounds(f).forEach(function (s) { sounds.push([s.id, s.label]); }); });
    el.appendChild(h("div", { class: "sq-input" }, [
      row([range("Tempo", 60, 180, 1, G.bpm, function (v) { G.bpm = v; }, function (v) { return v + " BPM"; }),
        sel("Key", NAMES.map(function (n, i) { return [i, n]; }), 0, function (v) { G.key = +v; broadcast(); }),
        sel("Scale", Object.keys(SCALES), G.scale, function (v) { G.scale = v; broadcast(); }),
        sel("Sound", sounds, G.sound, function (v) { G.sound = v; if (v !== "synth") { ensure(); E.bank && E.bank.load([v]).catch(function () {}); } }),
        btn("■ Stop everything", stopAll, "btn-outline-danger")]),
      h("div", { class: "sq-held" }, [h("b", { text: "Held chord (for the arpeggiators and chord-following sequencers): " }), heldEl]), kb,
      row([sel("Chord root", NAMES.map(function (n, i) { return [i, n]; }), 0, function (v) { chordRoot = +v; }), chordBtns])]));
    paint();
  }

  function buildCompare(el) {
    var slots = [h("div", { class: "sq-slot" }), h("div", { class: "sq-slot" })], cur = [null, null], panOn = true;
    var pick = [0, 1].map(function (k) {
      return sel(k ? "B (right)" : "A (left)", TYPES.map(function (t) { return [t.id, t.name]; }), k ? "patarp" : "arp", function (v) { put(k, v); });
    });
    function put(k, id) {
      if (cur[k]) { stopInst(cur[k]); instances = instances.filter(function (i) { return i !== cur[k]; }); if (cur[k].node) cur[k].node.disconnect(); }
      var Tp = TYPES.filter(function (t) { return t.id === id; })[0];
      cur[k] = makeCard(Tp); cur[k].pan = panOn ? (k ? 0.6 : -0.6) : 0;
      slots[k].innerHTML = ""; slots[k].appendChild(cur[k].el);
    }
    put(0, "arp"); put(1, "patarp");
    var pc = h("input", { type: "checkbox", checked: "checked" });
    pc.addEventListener("change", function () { panOn = pc.checked; cur.forEach(function (c, k) { c.pan = panOn ? (k ? 0.6 : -0.6) : 0; if (c.node && c.node.pan) c.node.pan.value = c.pan; }); });
    var playBoth = btn("▶ Play both", function () { stopInst(cur[0]); stopInst(cur[1]); startInst(cur[0]); startInst(cur[1]); }, "btn-primary");
    var solo = [0, 1].map(function (k) { return btn("Hear only " + (k ? "B" : "A"), function () { stopInst(cur[1 - k]); if (!cur[k].playing) startInst(cur[k]); }); });
    el.appendChild(h("div", {}, [row([pick[0], pick[1], playBoth].concat(solo, [btn("■ Stop", function () { stopInst(cur[0]); stopInst(cur[1]); }), h("label", { class: "sq-chk" }, [pc, " A left, B right"])])),
      h("div", { class: "sq-pair" }, slots)]));
  }

  function buildTable(el) {
    var rows = TYPES.concat(EXTRA), filt = "all";
    var fbar = h("div", { class: "sq-row" }), tb = h("tbody");
    ["all"].concat(Object.keys(FAMILIES)).forEach(function (f) {
      fbar.appendChild(btn(f === "all" ? "All" : FAMILIES[f], function (e) { filt = f; [].forEach.call(fbar.children, function (b) { b.classList.remove("active"); }); e.target.classList.add("active"); draw(); }));
    });
    fbar.firstChild.classList.add("active");
    var COLS = [["name", "Type"], ["family", "Family"], ["input", "You give it"], ["time", "Time"], ["repeats", "Repeats exactly?"], ["good", "Good for"], ["limit", "Limit"], ["hw", "Examples (unverified)"]];
    var sortK = null, dir = 1;
    var thead = h("thead", {}, [h("tr", {}, COLS.map(function (c) { return h("th", { text: c[1], title: "sort", onclick: function () { dir = sortK === c[0] ? -dir : 1; sortK = c[0]; draw(); } }); }))]);
    function draw() {
      tb.innerHTML = "";
      var list = rows.filter(function (r) { return filt === "all" || r.family === filt; });
      if (sortK) list = list.slice().sort(function (a, b) { return dir * String(sortK === "family" ? FAMILIES[a.family] : a[sortK]).localeCompare(String(sortK === "family" ? FAMILIES[b.family] : b[sortK])); });
      list.forEach(function (r) {
        tb.appendChild(h("tr", {}, COLS.map(function (c) {
          if (c[0] === "name") return h("td", {}, [r.id ? h("a", { href: "#sq-" + r.id, text: r.name }) : h("span", { text: r.name + " (no demo)" })]);
          return h("td", { text: c[0] === "family" ? FAMILIES[r.family] : r[c[0]] });
        })));
      });
    }
    draw();
    el.appendChild(fbar);
    el.appendChild(h("div", { class: "sq-scroll" }, [h("table", { class: "table table-sm sq-table" }, [thead, tb])]));
  }

  function init(o) {
    buildInput(o.input);
    Object.keys(o.sections).forEach(function (f) {
      var box = h("div", { class: "sq-cards" });
      TYPES.filter(function (t) { return t.family === f; }).forEach(function (t) { box.appendChild(makeCard(t, { id: "sq-" + t.id }).el); });
      o.sections[f].appendChild(box);
    });
    buildCompare(o.compare);
    buildTable(o.table);
    document.addEventListener("click", function (e) {   // a table link opens the folded section holding the card
      var a = e.target.closest && e.target.closest('a[href^="#sq-"]'); if (!a) return;
      var card = document.querySelector(a.getAttribute("href")), sec = card && card.closest("section.level2");
      if (sec && sec._sfSet && sec.classList.contains("sf-shut")) sec._sfSet(false, true);
    });
  }
  // kit: for machines in their own files (motif-arp.js). addType before init() puts a card on the page, in Compare and the table.
  // voice(inst, sound, midi | piece, when, dur, vel): a note on any loaded BandSounds sound ("kit" takes a piece), else the built-in synth.
  function voice(inst, sound, m, when, dur, vel) {
    var dest = inst.node;
    if (sound === "kit") return inst.out.drum(m, when, vel);
    if (sound !== "synth" && E.bank && E.bank.has(sound)) E.bank.play(sound, { midi: Math.round(m), vel: vel, dur: Math.max(dur, 0.05) }, when, dest);
    else synthVoice(dest, m, when, dur, { vel: vel, cut: 2200 });
  }
  function loadSound(s) { if (s === "synth") return; ensure(); if (E.bank) E.bank.load([s]).catch(function () {}); }
  global.SeqPage = { init: init, types: TYPES, stopAll: stopAll,
    kit: { h: h, sel: sel, range: range, btn: btn, row: row, G: G, nn: nn, addType: T, voice: voice, loadSound: loadSound,
      now: function () { return E.ctx ? E.ctx.currentTime : 0; }, at: function (when, fn) { E.viz.push({ t: when, fn: fn }); } } };
})(window);
