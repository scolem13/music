// motif-arp.js: the multi-part phrase arpeggiator card on the Sequencers page, after the arpeggiators on Yamaha's
// Motif / MOXF / Montage / MODX workstations. Each arp type is a recorded phrase (BandPhrase, with a velocity and length on
// every note) written by chord-note number, so it follows the held chord. Four parts run at once, each with its own type,
// sound, key mode, key range and velocity range; four scenes store and recall the parts. Each part's phrase is drawn as
// notation for the chord held now, with the heads shaded by velocity.
//   Needs sequencers.js (SeqPage.kit) and band/phrase.js loaded first; abcjs for the notation (left out if missing).
//   MotifArp.TYPES: the arp types; MotifArp.keyNotes(mode, held, order) and MotifArp.partNotes(part, ctx) for the test.
//
// What is checked against Yamaha (cited in scripts/sources/arpeggiators.py): the five key modes and what each sounds
// (Sort, Thru, Direct, Sort+Direct, Thru+Direct), velocity limits used to split one arp across parts, and Velocity Mode
// Original (plays the velocities recorded in the phrase) or Thru (your velocity influences each note's loudness).
// Unverified (from memory or search snippets): Thru read here as "the phrase's velocity scaled by yours / 100", the
// Velocity Rate and Gate Time Rate ranges (0–200%), Unit Multiply read as "200% = the phrase takes twice as long", the
// swing rule, eight parts on the hardware (this card has four).
// The arp types here are this site's own phrases, not Yamaha's.
(function (global) {
  "use strict";
  var K = global.SeqPage && global.SeqPage.kit, P = global.BandPhrase;

  // ---------- arp types: phrases written by chord-note number (chord kind) or drum piece ----------
  // n(t, dur, tone, vel, oct)  — tone 0 = the lowest held note (after the key mode orders them)
  function n(t, dur, tone, vel, oct) { return { t: t, dur: dur, tone: tone, vel: vel, oct: oct || 0 }; }
  function d(t, piece, vel) { return { t: t, dur: 0.25, piece: piece, vel: vel }; }
  function strum(t, tones, dur, vel, up, oct) {   // a strum: notes 1/48 apart, low to high (down stroke) or high to low
    var ts = up ? tones.slice().reverse() : tones;
    return ts.map(function (k, i) { return n(t + i / 48, dur - i / 48, k, vel - (up ? 0.12 : 0) - i * 0.02, oct); });
  }
  var TYPES = [];
  function A(cat, name, kind, notes, bars) { TYPES.push({ cat: cat, name: name, kind: kind, meter: "4/4", bars: bars || 1, notes: notes }); }

  A("Synth", "16ths up, accented beats", "chord", (function () { var o = []; for (var i = 0; i < 16; i++) o.push(n(i / 4, 0.18, i % 4, i % 4 ? (i % 2 ? 0.5 : 0.62) : 0.95)); return o; })());
  A("Synth", "Octave bounce 8ths", "chord", (function () { var o = []; for (var i = 0; i < 8; i++) o.push(n(i / 2, 0.3, Math.floor(i / 2) % 3, i % 2 ? 0.6 : 0.85, i % 2 ? 0 : -1)); return o; })());
  A("Synth", "Trance gate (chord)", "chord", (function () { var o = []; [0, 0.5, 0.75, 1.5, 2, 2.5, 2.75, 3.5].forEach(function (t, i) { [0, 1, 2].forEach(function (k) { o.push(n(t, 0.2, k, i % 4 === 0 ? 0.9 : 0.6)); }); }); return o; })());
  A("Piano", "Pop 8ths comp", "chord", [n(0, 2, 0, 0.8, -1), n(2, 2, 0, 0.7, -1)].concat([[0, 0.85], [1.5, 0.6], [2.5, 0.7], [3, 0.6], [3.5, 0.5]].reduce(function (o, x) {
    return o.concat([1, 2, 3].map(function (k) { return n(x[0], 0.45, k, x[1]); })); }, [])));
  A("Piano", "Ballad broken chord", "chord", [0, 2, 3, 4, 5, 4, 3, 2].map(function (k, i) { return n(i / 2, 0.5, k, i === 0 ? 0.75 : i === 4 ? 0.62 : 0.45, -1); }));
  A("Piano", "Alberti 16ths", "chord", (function () { var o = []; for (var i = 0; i < 16; i++) o.push(n(i / 4, 0.25, [0, 2, 1, 2][i % 4], i % 4 ? 0.42 : 0.62)); return o; })());
  A("Guitar", "Strum D-DU-UDU", "chord", [].concat(strum(0, [0, 1, 2, 3, 4, 5], 1, 0.9), strum(1, [0, 1, 2, 3, 4, 5], 0.5, 0.75), strum(1.5, [0, 1, 2, 3, 4, 5], 0.5, 0.7, true),
    strum(2.5, [0, 1, 2, 3, 4, 5], 0.5, 0.7, true), strum(3, [0, 1, 2, 3, 4, 5], 0.5, 0.78), strum(3.5, [0, 1, 2, 3, 4, 5], 0.5, 0.65, true)).map(function (x) { x.oct -= 1; return x; }));
  A("Guitar", "Fingerpicking (thumb on the beat)", "chord", [n(0, 1, 0, 0.75, -1), n(0.5, 0.5, 3, 0.5, -1), n(1, 1, 2, 0.7, -1), n(1.5, 0.5, 4, 0.55, -1),
    n(2, 1, 0, 0.72, -1), n(2.5, 0.5, 3, 0.5, -1), n(3, 1, 2, 0.7, -1), n(3.5, 0.5, 5, 0.5, -1), n(0, 0.5, 4, 0.55, -1)]);
  A("Bass", "Root–fifth 8ths", "chord", [0, 0, 2, 0, 0, 0, 2, 3].map(function (k, i) { return n(i / 2, 0.42, k, i % 2 ? 0.6 : 0.85, -1); }));
  A("Bass", "Funk 16ths with ghosts", "chord", [[0, 0, 0.95, 0.4], [0.75, 0, 0.3, 0.2], [1, 0, 0.3, 0.2, 1], [1.5, 2, 0.75, 0.25], [2.25, 0, 0.85, 0.25], [2.75, 0, 0.3, 0.2], [3, 3, 0.7, 0.4], [3.5, 2, 0.6, 0.25], [3.75, 1, 0.55, 0.2]]
    .map(function (x) { return n(x[0], x[3], x[1], x[2], x[4] ? 0 : -1); }));
  A("Drums", "Pop groove", "drum", [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (t, i) { return d(t, "hatClosed", i % 2 ? 0.42 : 0.62); })
    .concat([d(0, "kick", 0.9), d(1.75, "kick", 0.6), d(2, "kick", 0.85), d(1, "snare", 0.9), d(3, "snare", 0.9), d(3.75, "snare", 0.28)]));
  A("Drums", "16th hats, ghosted snare", "drum", (function () { var o = []; for (var i = 0; i < 16; i++) o.push(d(i / 4, "hatClosed", i % 4 === 0 ? 0.65 : i % 2 ? 0.32 : 0.48));
    return o.concat([d(0, "kick", 0.9), d(2.5, "kick", 0.75), d(1, "snare", 0.9), d(3, "snare", 0.9), d(1.75, "snare", 0.25), d(2.25, "snare", 0.25), d(3.5, "hatOpen", 0.5)]); })());

  var KEY_MODES = [["sort", "Sort"], ["thru", "Thru"], ["direct", "Direct"], ["sort+direct", "Sort+Direct"], ["thru+direct", "Thru+Direct"]];
  var UNITS = [50, 66, 75, 100, 133, 150, 200];

  // the held notes a part uses, in the order its key mode reads them
  function keyNotes(mode, held, order) {
    return /^thru/.test(mode) ? order.slice() : held.slice().sort(function (a, b) { return a - b; });
  }
  // the notes one part plays for one pass of its phrase, times already scaled; [] when the part is silenced
  function partNotes(p, ctx) {
    var ty = TYPES[p.type], inRange = function (m) { return m >= p.lo && m <= p.hi; };
    var held = ctx.held.filter(inRange), order = ctx.order.filter(inRange);
    if (!p.on || !held.length || ctx.vel < p.vlo || ctx.vel > p.vhi || p.key === "direct") return [];
    var used = keyNotes(p.key, held, order), scale = p.unit / 100;
    // resolve by hand so thru order is kept (BandPhrase.resolve sorts the held notes)
    return ty.notes.map(function (x) {
      var o = { t: x.t, dur: x.dur, vel: x.vel };
      if (ty.kind === "drum") o.piece = x.piece;
      else { var k = used.length, i = x.tone; o.midi = used[((i % k) + k) % k] + 12 * (Math.floor(i / k) + x.oct + p.oct); }
      var off = Math.abs(x.t * 4 - Math.round(x.t * 4)) < 1e-6 && Math.round(x.t * 4) % 2 === 1;   // a 16th off the 8th
      o.t = (x.t + (off ? p.swing / 100 * 0.25 : 0)) * scale;
      o.dur = Math.max(0.02, x.dur * p.gate / 100 * scale);
      var v = x.vel * (p.velMode === "thru" ? ctx.vel / 100 : 1) * p.velRate / 100;
      o.vel = Math.max(1 / 127, Math.min(1, v));
      return o;
    });
  }

  function defaults(i) {
    return { on: i < 2, type: [0, 8, 10, 4][i], sound: ["synth", "bass", "kit", "piano"][i], key: "sort", velMode: "original", lo: 0, hi: 127, vlo: 1, vhi: 127,
      velRate: 100, gate: 100, unit: 100, swing: 0, oct: 0 };
  }
  var SCENES = [
    [{ on: 1, type: 0, sound: "synth" }, { on: 0 }, { on: 0 }, { on: 0 }],
    [{ on: 1, type: 1, sound: "synth" }, { on: 1, type: 8, sound: "bass" }, { on: 1, type: 10, sound: "kit" }, { on: 0 }],
    [{ on: 1, type: 3, sound: "piano" }, { on: 1, type: 9, sound: "bass" }, { on: 1, type: 11, sound: "kit", swing: 30 }, { on: 0 }],
    // a velocity split: play softly for the broken chord, hard for the strum
    [{ on: 1, type: 4, sound: "piano", vlo: 1, vhi: 90 }, { on: 1, type: 6, sound: "steel", vlo: 91, vhi: 127 }, { on: 1, type: 8, sound: "bass", velMode: "thru" }, { on: 0 }]
  ];

  function make(I) {
    var h = K.h, G = K.G, parts = [0, 1, 2, 3].map(defaults), st = { vel: 90 }, scenes = SCENES.map(function (sc) { return sc.map(function (x, i) { return Object.assign(defaults(i), x); }); });
    var cache = [], sounds = [["synth", "Built-in synth"], ["kit", "Drum kit"]];
    if (global.BandSounds) ["piano", "epiano", "guitar", "bass"].forEach(function (f) { global.BandSounds.sounds(f).forEach(function (s) { sounds.push([s.id, s.label]); }); });
    var ids = sounds.map(function (s) { return s[0]; });
    scenes.forEach(function (sc) { sc.forEach(function (p) { if (ids.indexOf(p.sound) < 0) p.sound = p.sound === "steel" ? (ids.filter(function (x) { return /steel|acoustic/i.test(x); })[0] || "piano") : "synth"; }); });
    function ctx() { return { held: G.held.length ? G.held : [48 + G.key], order: G.order.length ? G.order : [48 + G.key], vel: st.vel }; }
    function len(p) { var ty = TYPES[p.type]; return ty.bars * P.barQ(ty.meter) * p.unit / 100; }
    function rebuild() { var c = ctx(); cache = parts.map(function (p) { return partNotes(p, c); }); parts.forEach(function (p, i) { rows[i] && rows[i].draw(); }); }
    function direct(p, when) {     // the held notes themselves, for a direct key mode: one bar
      if (!p.on || !/direct/.test(p.key)) return;
      var c = ctx(); if (c.vel < p.vlo || c.vel > p.vhi) return;
      c.held.filter(function (m) { return m >= p.lo && m <= p.hi; }).forEach(function (m) { K.voice(I, p.sound === "kit" ? "synth" : p.sound, m + 12 * p.oct, when, 60 / G.bpm * 4 * 0.95, c.vel / 127); });
    }

    I.onInput = function () { var was = (I.prevHeld || "") , now = G.held.join(); I.prevHeld = now; rebuild();
      if (I.playing && was !== now) parts.forEach(function (p) { direct(p, K.now() + 0.02); }); };
    I.reset = function () { rebuild(); I.dirAt = -1; };
    I.onTick = function (lt, when, td, out) {
      var q0 = lt / 12, q1 = (lt + 1) / 12, spq = td * 12;
      if (lt % 48 === 0) parts.forEach(function (p) { direct(p, when); });
      parts.forEach(function (p, i) {
        var L = len(p), base = Math.floor(q0 / L) * L;
        (cache[i] || []).forEach(function (nt) {
          var t = base + nt.t; if (t < q0 - 1e-9 || t >= q1 - 1e-9) return;
          var w = when + (t - q0) * spq;
          K.voice(I, p.sound, nt.piece || nt.midi, w, nt.dur * spq, nt.vel);
          if (rows[i]) K.at(w, rows[i].blink);
        });
      });
    };

    // ---------- the part rows ----------
    var rows = [], box = h("div", { class: "ma-parts" });
    function partRow(i) {
      var p = parts[i], r = {}, wrap = h("div", { class: "ma-part" }), score = h("div", { class: "ma-score" }), lamp = h("span", { class: "ma-lamp", title: "playing" });
      function set(k, conv) { return function (v) { parts[i][k] = conv ? conv(v) : v; if (k === "sound") K.loadSound(v); rebuild(); }; }
      function build() {
        p = parts[i]; wrap.innerHTML = "";
        var on = h("input", { type: "checkbox" }); on.checked = !!p.on; on.addEventListener("change", function () { parts[i].on = on.checked; rebuild(); });
        var typeSel = K.sel("Arp type", TYPES.map(function (t, k) { return [k, t.cat + ": " + t.name]; }), p.type, set("type", Number));
        var more = h("details", { class: "ma-more" }, [h("summary", { text: "Limits, rates, swing" }),
          K.row([K.range("Lowest key", 0, 127, 1, p.lo, set("lo", Number), K.nn), K.range("Highest key", 0, 127, 1, p.hi, set("hi", Number), K.nn),
            K.range("Velocity from", 1, 127, 1, p.vlo, set("vlo", Number)), K.range("Velocity to", 1, 127, 1, p.vhi, set("vhi", Number))]),
          K.row([K.sel("Velocity mode", [["original", "Original (as recorded)"], ["thru", "Thru (yours scales it)"]], p.velMode, set("velMode")),
            K.range("Velocity rate", 0, 200, 5, p.velRate, set("velRate", Number), pc), K.range("Gate time rate", 0, 200, 5, p.gate, set("gate", Number), pc),
            K.sel("Unit multiply", UNITS.map(function (u) { return [u, u + "%"]; }), p.unit, set("unit", Number)),
            K.range("Swing", 0, 60, 1, p.swing, set("swing", Number), pc), K.sel("Octave", [-2, -1, 0, 1, 2], p.oct, set("oct", Number))])]);
        wrap.appendChild(h("div", { class: "ma-phead" }, [h("label", { class: "sq-chk" }, [on, h("b", { text: " Part " + (i + 1) })]), lamp,
          typeSel, K.sel("Sound", sounds, p.sound, set("sound")), K.sel("Key mode", KEY_MODES, p.key, set("key"))]));
        wrap.appendChild(more); wrap.appendChild(score);
        r.draw();
      }
      function pc(v) { return v + "%"; }
      r.draw = function () {
        p = parts[i]; wrap.classList.toggle("off", !p.on);
        var ns = cache[i] || [], ty = TYPES[p.type];
        if (!global.ABCJS) { score.textContent = ""; return; }
        if (!ns.length) { score.innerHTML = ""; score.appendChild(h("p", { class: "sq-note", text: !p.on ? "Off." : p.key === "direct" ? "Direct: you hear only the keys you hold; the phrase is silent." : "Silent: no held key in this part's key range, or your velocity is outside its velocity range." })); return; }
        var bars = Math.max(1, Math.ceil(ty.bars * p.unit / 100 - 1e-9));
        var r2 = P.toAbc(ns, { meter: ty.meter, bars: bars, title: "", kind: ty.kind === "drum" ? "drum" : "pitch", barsPerLine: 2 });
        score.innerHTML = "";
        var div = h("div"); score.appendChild(div);
        try {
          global.ABCJS.renderAbc(div, r2.abc, { responsive: "resize", add_classes: true, staffwidth: 520, paddingtop: 0, paddingbottom: 0 });
          var heads = div.querySelectorAll(".abcjs-note");
          if (heads.length === r2.vels.length) [].forEach.call(heads, function (e, k) { e.style.opacity = (0.3 + 0.7 * r2.vels[k]).toFixed(2); });
        } catch (e) { score.textContent = r2.abc; }
      };
      r.blink = function () { lamp.classList.add("now"); clearTimeout(r.bt); r.bt = setTimeout(function () { lamp.classList.remove("now"); }, 250); };
      r.build = build; build(); rows[i] = r; box.appendChild(wrap);
    }

    // ---------- scenes ----------
    var storeMode = false, sceneBtns = [];
    function recall(k) {
      if (storeMode) { scenes[k] = parts.map(function (p) { return Object.assign({}, p); }); storeMode = false; storeBtn.classList.remove("active"); paintScenes(k); return; }
      parts = scenes[k].map(function (p) { return Object.assign({}, p); });
      parts.forEach(function (p) { K.loadSound(p.sound); });
      rebuild(); rows.forEach(function (r) { r.build(); }); paintScenes(k);
    }
    function paintScenes(k) { sceneBtns.forEach(function (b, j) { b.classList.toggle("active", j === k); }); }
    var sceneRow = h("div", { class: "sq-row" }, [h("b", { text: "Scenes " })]);
    [0, 1, 2, 3].forEach(function (k) { var b = K.btn("Scene " + (k + 1), function () { recall(k); }); sceneBtns.push(b); sceneRow.appendChild(b); });
    var storeBtn = K.btn("Store into…", function () { storeMode = !storeMode; storeBtn.classList.toggle("active", storeMode); });
    sceneRow.appendChild(storeBtn);

    var velCtl = K.range("How hard you play (velocity)", 1, 127, 1, st.vel, function (v) { st.vel = v; rebuild(); });
    I.prevHeld = G.held.join(); rebuild();
    for (var i = 0; i < 4; i++) partRow(i);
    return h("div", {}, [K.row([velCtl]), sceneRow, box,
      h("p", { class: "sq-note", text: "Velocity on the keys above is the slider: try Scene 4 and move it across 90 to switch between the soft and hard parts. Sort reads your held notes low to high; Thru in the order you pressed them; Direct plays your notes and not the phrase; the +Direct modes play both. Notation shows each part's phrase for the chord held now; paler note heads are softer." })]);
  }

  var api = { TYPES: TYPES, keyNotes: keyNotes, partNotes: partNotes, defaults: defaults, KEY_MODES: KEY_MODES };
  global.MotifArp = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (K) K.addType({ id: "motifarp", family: "arp", name: "Multi-part phrase arpeggiator (workstation style)", wide: true, make: make,
    blurb: "Each arp type is a recorded phrase with its own velocities and note lengths, written by chord-note number so it follows your chord. Four parts play at once, each with a key range and velocity range; scenes switch them.",
    input: "A held chord + how hard you play", time: "Recorded phrase (any rhythm, swing, unit multiply)", repeats: "Yes", good: "Whole bands from one chord: bass, comping, strums and drums together; velocity splits", limit: "The phrases are fixed: you choose and combine them, but editing one means recording it again",
    hw: "Yamaha Motif, MOXF, Montage and MODX arpeggios (up to eight parts on the Montage and MODX); the phrases here are this site's own" });
})(typeof window !== "undefined" ? window : globalThis);
