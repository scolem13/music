// walking-bass-page.js: the Walking Bass Generator (tools/walking-bass.qmd), global WalkingBass.
// Changes (a preset or typed bars "F7 | Bb7 | Cm7 F7"), moved to a key, are made into a form (BandHarmony.buildForm of
// TuneChart.parse); BandBass.create({ rng: seeded }) walks it, every chorus, with opts.bassFeel "walk" | "walkdev" | "two" and
// opts.walkDevices (bass.js WALKING DEVICES). The line is drawn as ABC (bass clef, L:1/8, chord symbols; a triplet as (3,
// a ghost note with an x head !style=x!), each note coloured by the device that made it, and checked bar by bar
// (checkAbc: lengths and pitches read back). Play: AbcPlay with the changes (opts.abc, every chorus written out), style
// "swing", bandOpts { bassFeel, bassLine: { bars } } so the band plays exactly this line; melody:false. Bass only = no
// drums and the piano's fader at 0.
// Send to the Backing Track: localStorage.bandHandoff = { v:1, from:"walking-bass", at, abc, style:"swing", tempo, choruses,
// bass:"walkdev", devices, line: { bars } | null, mode: "exact" | "devices" } and /tools/backing-track.html?from=walking-bass.
// "exact": abc holds every chorus written out (so line.bars matches the form) and choruses = 1; "devices": one chorus.
//   WalkingBass.mount(root)   WalkingBass.generate(cfg) -> { form, bars, abc, changes }   WalkingBass.toAbc / checkAbc / PRESETS
(function (global) {
  "use strict";
  var NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  var SHARPN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var FLATKEYS = { 5: 1, 10: 1, 3: 1, 8: 1, 1: 1, 6: 1, 0: 1 };          // major tonics spelled with flats (and C)
  // key signatures: major tonic pc -> { letter: alteration }
  function sigOf(pc) {
    var sharps = "FCGDAEB", flats = "BEADGCF", out = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
    var nS = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6 }[pc], nF = { 5: 1, 10: 2, 3: 3, 8: 4, 1: 5 }[pc];
    if (pc === 6) nS = null, nF = 6;                                      // Gb rather than F#
    if (nF) for (var i = 0; i < nF; i++) out[flats[i]] = -1; else for (var j = 0; j < (nS || 0); j++) out[sharps[j]] = 1;
    return out;
  }
  function mod12(n) { return ((n % 12) + 12) % 12; }

  // ---- presets: bars as "|"-separated chords; key = the tonic of the key signature's major (for spelling), name = K: ----
  var PRESETS = [
    { id: "fblues", label: "F blues (PianoGroove handout)", k: "F", kpc: 5, bars: "F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bb7 | F7 | Am7b5 D7 | Gm7 | C7 | F7 | Gm7 C7" },
    { id: "bbblues", label: "Bb blues", k: "Bb", kpc: 10, bars: "Bb7 | Eb7 | Bb7 | Bb7 | Eb7 | Eb7 | Bb7 | G7 | Cm7 | F7 | Bb7 G7 | Cm7 F7" },
    { id: "jazzblues", label: "Jazz blues in F", k: "F", kpc: 5, bars: "F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7" },
    { id: "iiviC", label: "ii–V–I in C", k: "C", kpc: 0, bars: "Dm7 | G7 | Cmaj7 | Cmaj7" },
    { id: "iivikeys", label: "ii–V–I down in whole steps (C, Bb, Ab, Gb)", k: "C", kpc: 0, bars: "Dm7 | G7 | Cmaj7 | Cmaj7 | Cm7 | F7 | Bbmaj7 | Bbmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Abm7 | Db7 | Gbmaj7 | Gbmaj7" },
    { id: "iivifast", label: "ii–V–I, two chords a bar (F, Eb, Db)", k: "F", kpc: 5, bars: "Gm7 C7 | Fmaj7 | Fm7 Bb7 | Ebmaj7 | Ebm7 Ab7 | Dbmaj7 | Gm7 | C7" },
    { id: "rhythmA", label: "Rhythm changes, A section (Bb)", k: "Bb", kpc: 10, bars: "Bb6 G7 | Cm7 F7 | Bb6 G7 | Cm7 F7 | Fm7 Bb7 | Eb7 Edim7 | Bb6 F7 | Bb6" },
    { id: "minorcycle", label: "Minor ii–V cycle (G minor, written for this page)", k: "Gm", kpc: 10, bars: "Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm6 | Gm6 | Am7b5 | D7 | Gm6 | G7 | Cm7 | D7 | Gm6 | Gm6" }
  ];

  // ---- chord symbols moved by semitones ----
  function moveSym(sym, d, flats) {
    return sym.replace(/(^|\/)([A-G])([b#]?)/g, function (_, pre, l, acc) {
      var pc = mod12(PC[l] + (acc === "b" ? -1 : acc === "#" ? 1 : 0) + d);
      return pre + (flats ? NAMES : SHARPN)[pc];
    });
  }
  function keyName(k, d) {                         // "Gm" + 3 -> "Bbm"
    var m = /^([A-G][b#]?)(.*)$/.exec(k); if (!m) return k;
    var pc = mod12(PC[m[1][0]] + (m[1][1] === "b" ? -1 : m[1][1] === "#" ? 1 : 0) + d);
    return NAMES[pc] + m[2];
  }
  function parseBars(text) {
    return String(text || "").split("|").map(function (b) { return b.trim().split(/\s+/).filter(Boolean); }).filter(function (b) { return b.length; });
  }
  // changes as ABC (L:1/4, rests under the chords), times = choruses written out
  function changesAbc(bars, K, times, title) {
    var cells = [];
    for (var t = 0; t < (times || 1); t++) bars.forEach(function (cs) {
      var n = cs.length === 1 ? [4] : cs.length === 2 ? [2, 2] : cs.length === 3 ? [2, 1, 1] : [1, 1, 1, 1];
      cells.push(cs.slice(0, 4).map(function (c, i) { return '"' + c + '"z' + (n[i] === 1 ? "" : n[i]); }).join(" "));
    });
    var rows = []; for (var i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4).join(" | ") + (i + 4 >= cells.length ? " |]" : " |"));
    return "X:1\nT:" + (title || "Changes") + "\nM:4/4\nL:1/4\nK:" + K + "\n" + rows.join("\n") + "\n";
  }

  // ---- the seeded generator ----
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // cfg: { bars (text), key (K: of the written changes), kpc (its signature's major pc), shift (semitones), choruses, type: walk|walkdev|two,
  //        devices: {amount, chromatic, ...}, seed, variation, tempo }
  function generate(cfg) {
    var shift = cfg.shift | 0, kpc = mod12(cfg.kpc + shift), flats = !!FLATKEYS[kpc], K = keyName(cfg.key, shift);
    if (!flats) K = K.replace(/^Db/, "C#").replace(/^Gb/, "F#");
    var bars = parseBars(cfg.bars).map(function (cs) { return cs.map(function (c) { return moveSym(c, shift, flats); }); });
    if (!bars.length) return null;
    var n = Math.max(1, Math.min(8, cfg.choruses | 0 || 1));
    var one = changesAbc(bars, K, 1), all = changesAbc(bars, K, n);
    var H = global.BandHarmony, form = H.buildForm(global.TuneChart.parse(one), 0).filter(function (b) { return b && b.beats > 0; });
    var opts = { bassFeel: cfg.type === "two" ? "two" : cfg.type === "walkdev" ? "walkdev" : "walk", variation: cfg.variation || 0 };
    if (cfg.type === "walkdev") opts.walkDevices = Object.assign({}, cfg.devices);
    var bass = global.BandBass.create({ rng: mulberry32(cfg.seed | 0) }), out = [], chords = [], lastSym = null;
    for (var ch = 0; ch < n; ch++) for (var i = 0; i < form.length; i++) {
      var f = form[i], ctx = { bar: ch * form.length + i, index: i, length: form.length, chorus: ch, beats: f.beats, chords: f.chords,
        nextChords: form[(i + 1) % form.length].chords, tempo: cfg.tempo || 140, intensity: 0.6, phrase: { bar: i % 4 }, opts: opts, meter: { n: 4, d: 4 } };
      var ev = (bass.bar(ctx) || []).slice().sort(function (a, b) { return a.pos - b.pos; });
      out.push(ev.map(function (e) { var o = { pos: +e.pos.toFixed(4), dur: e.dur, midi: e.midi, vel: e.vel == null ? 0.8 : +e.vel.toFixed(3) }; if (e.ghost) o.ghost = true; if (e.device) o.device = e.device; return o; }));
      chords.push((f.chords || []).map(function (c) { return { pos: c.pos, sym: (c.chord && !c.chord.nc && c.chord.sym) || "" }; })
        .filter(function (c) { if (!c.sym || (c.sym === lastSym && c.pos > 0) || (c.sym === lastSym && i % 4)) return false; lastSym = c.sym; return true; }));
    }
    return { form: form, bars: out, chords: chords, K: K, kpc: kpc, flats: flats, one: one, all: all, changes: bars, choruses: n, opts: opts };
  }

  // ---- ABC of the line ----
  var DEVS = ["chromatic", "scalar", "jump", "enclosure", "ghost", "triplet"];
  var SHORT = { chromatic: "chrom.", scalar: "scale", jump: "jump", enclosure: "encl." };
  function spell(midi, sig, flats) {               // -> { letter, alt, oct } with oct the ABC octave of the letter (4 = C..B above middle C - 12... see abcPitch)
    var pc = mod12(midi), cands = [];
    "CDEFGAB".split("").forEach(function (l) { [-1, 0, 1].forEach(function (a) { if (mod12(PC[l] + a) === pc) cands.push({ letter: l, alt: a }); }); });
    var c = cands.filter(function (x) { return sig[x.letter] === x.alt; })[0]
      || cands.filter(function (x) { return x.alt === 0; })[0]
      || cands.filter(function (x) { return x.alt === (flats ? -1 : 1); })[0] || cands[0];
    c.oct = Math.floor((midi - c.alt) / 12) - 1;                   // midi 60 = C4
    return c;
  }
  function abcPitch(sp) {                         // C4 = "C", C3 = "C,", C5 = "c"
    var s = sp.oct >= 5 ? sp.letter.toLowerCase() + "'".repeat(sp.oct - 5) : sp.letter + ",".repeat(Math.max(0, 4 - sp.oct));
    return s;
  }
  function len(e8) { return e8 === 1 ? "" : e8 === Math.round(e8) ? String(e8) : (e8 * 2) + "/2"; }
  // res from generate() -> { abc, notes: [{ bar, ev }] in drawn order }
  function toAbc(res, title) {
    var sig = sigOf(res.kpc), cells = [], notes = [];
    res.bars.forEach(function (ev, bi) {
      var state = {}, parts = [], chs = (res.chords[bi] || []).slice(), main = null, beats = (res.form[bi % res.form.length] || {}).beats || 4;
      ev.forEach(function (e) { if (!main && e.device && SHORT[e.device]) main = e.device; });
      function acc(sp) {
        var k = sp.letter + sp.oct, cur = state.hasOwnProperty(k) ? state[k] : sig[sp.letter];
        if (cur === sp.alt) return ""; state[k] = sp.alt;
        return sp.alt === 1 ? "^" : sp.alt === -1 ? "_" : "=";
      }
      function chordAt(p0, p1) { var s = ""; while (chs.length && chs[0].pos < p1 - 1e-6) { if (chs[0].pos >= p0 - 1e-6 || !s) s += '"' + chs[0].sym + '"'; chs.shift(); } return s; }
      var first = true;
      if (!ev.length || ev[0].pos > 1e-6) {
        var r = ev.length ? ev[0].pos : beats; parts.push(chordAt(0, r || beats) + "z" + len(r * 2));
      }
      for (var i = 0; i < ev.length; i++) {
        var e = ev[i], nx = i + 1 < ev.length ? ev[i + 1].pos : beats;
        // a triplet: three notes inside one beat at thirds
        if (Math.abs(e.pos * 3 - Math.round(e.pos * 3)) < 1e-6 && Math.abs(e.pos * 2 - Math.round(e.pos * 2)) > 1e-6) continue;   // (drawn with its group)
        var trip = i + 2 < ev.length && Math.abs(ev[i + 1].pos - e.pos - 1 / 3) < 1e-3 && Math.abs(ev[i + 2].pos - e.pos - 2 / 3) < 1e-3;
        var lab = first && main ? '"_' + SHORT[main] + '"' : ""; first = false;
        if (trip) {
          var g = "(3";
          for (var t = 0; t < 3; t++) { var te = ev[i + t], sp = spell(te.midi, sig, res.flats);
            g += (t === 0 ? chordAt(e.pos, e.pos + 1) + lab : "") + acc(sp) + abcPitch(sp); notes.push({ bar: bi, ev: te }); }
          parts.push(g); var nx3 = i + 3 < ev.length ? ev[i + 3].pos : beats;
          if (nx3 > e.pos + 1 + 1e-6) { /* (a gap after the triplet: never made by the bass) */ parts.push("z" + len((nx3 - e.pos - 1) * 2)); }
          i += 2; continue;
        }
        var sp1 = spell(e.midi, sig, res.flats), e8 = Math.round((nx - e.pos) * 2 * 2) / 2;
        parts.push(chordAt(e.pos, nx) + lab + (e.ghost ? "!style=x!" : "") + acc(sp1) + abcPitch(sp1) + len(e8));
        notes.push({ bar: bi, ev: e });
      }
      cells.push(parts.join(" "));
    });
    var rows = []; for (var i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4).join(" | ") + (i + 4 >= cells.length ? " |]" : " |"));
    var abc = "X:1\nT:" + (title || "Walking bass") + "\nM:4/4\nL:1/8\nQ:1/4=" + (res.tempo || 140) + "\nK:" + res.K + " clef=bass\n" + rows.join("\n") + "\n";
    return { abc: abc, notes: notes };
  }

  // ---- the check: every bar's length, and every pitch read back against the line ----
  function checkAbc(abc, res) {
    var lines = abc.split("\n"), kl = lines.filter(function (l) { return /^K:/.test(l); })[0] || "K:C", body = lines.slice(lines.indexOf(kl) + 1).join(" ");
    var sig = sigOf(res ? res.kpc : 0), bad = [], pitches = [];
    var cells = body.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, "").split("|").map(function (s) { return s.replace("]", "").trim(); }).filter(Boolean);
    cells.forEach(function (cell, bi) {
      var tot = 0, trip = 0, state = {}, re = /\(3|([_^=]?)([A-Ga-gz])([,']*)(\d+(?:\/\d+)?)?/g, m;
      while ((m = re.exec(cell))) {
        if (m[0] === "(3") { trip = 3; continue; }
        var fr = m[4] ? m[4].split("/") : null, l = fr ? (fr.length > 1 ? +fr[0] / +fr[1] : +fr[0]) : 1;
        tot += trip ? l * 2 / 3 : l; if (trip) trip--;
        if (m[2] === "z") continue;
        var L = m[2].toUpperCase(), oct = m[2] === L ? 4 - m[3].length : 5 + m[3].length, k = L + oct;
        if (m[1]) state[k] = m[1] === "^" ? 1 : m[1] === "_" ? -1 : 0;
        var alt = state.hasOwnProperty(k) ? state[k] : sig[L];
        pitches.push((oct + 1) * 12 + PC[L] + alt);
      }
      if (Math.abs(tot - 8) > 1e-6) bad.push("bar " + (bi + 1) + ": " + (+tot.toFixed(3)) + " eighths, not 8");
    });
    if (res) {
      if (cells.length !== res.bars.length) bad.push(cells.length + " bars drawn, " + res.bars.length + " played");
      var want = []; res.bars.forEach(function (b) { b.forEach(function (e) { want.push(e.midi); }); });
      if (want.join() !== pitches.join()) bad.push("the drawn pitches are not the line's");
    }
    return { ok: !bad.length, bad: bad, bars: cells.length };
  }

  // ---- the page ----
  function mount(root) {
    if (!root) return;
    var $ = function (id) { return root.querySelector("#" + id) || document.getElementById(id); };
    var cur = null, drawn = null, handle = null;
    var sel = $("wb-preset");
    PRESETS.forEach(function (p) { var o = document.createElement("option"); o.value = p.id; o.textContent = p.label; sel.appendChild(o); });
    var o2 = document.createElement("option"); o2.value = "custom"; o2.textContent = "Typed below"; sel.appendChild(o2);
    var keySel = $("wb-key");
    for (var d = -6; d <= 6; d++) { var ko = document.createElement("option"); ko.value = d; keySel.appendChild(ko); }
    function presetOf() { return PRESETS.filter(function (p) { return p.id === sel.value; })[0] || null; }
    var custom = { k: "C", kpc: 0 };
    function keyLabels() {
      var p = presetOf() || custom;
      [].forEach.call(keySel.options, function (o) { var dd = +o.value; o.textContent = keyName(p.k, dd).replace("b", "\u266d") + (dd ? " (" + (dd > 0 ? "+" : "") + dd + ")" : " (as written)"); });
    }
    sel.addEventListener("change", function () { var p = presetOf(); if (p) $("wb-bars").value = p.bars; keySel.value = "0"; keyLabels(); make(); });
    $("wb-bars").addEventListener("input", function () { if (presetOf() && $("wb-bars").value !== presetOf().bars) { var p = presetOf(); custom = { k: p.k, kpc: p.kpc }; sel.value = "custom"; keyLabels(); } clearTimeout(mount._t); mount._t = setTimeout(make, 400); });
    function cfg() {
      var p = presetOf() || custom, dv = {};
      DEVS.forEach(function (k) { dv[k] = +$("wb-" + k).value / 100; }); dv.amount = +$("wb-amount").value / 100;
      return { bars: $("wb-bars").value, key: p.k, kpc: p.kpc, shift: +keySel.value, choruses: +$("wb-choruses").value, type: $("wb-type").value,
        devices: dv, seed: +$("wb-seed").value | 0, variation: +$("wb-variation").value / 100, tempo: +$("wb-tempo").value || 140 };
    }
    function showVals() {
      ["amount"].concat(DEVS).concat(["variation"]).forEach(function (k) { var v = $("wb-" + k + "-v"); if (v) v.textContent = $("wb-" + k).value + "%"; });
      $("wb-devices").hidden = $("wb-type").value !== "walkdev";
    }
    function make() {
      stop(); showVals();
      var c = cfg(), res = generate(c), note = $("wb-check");
      if (!res) { note.textContent = "Type some chords, bars split by |."; return; }
      res.tempo = c.tempo; cur = res;
      var t = toAbc(res, "Walking bass"), chk = checkAbc(t.abc, res);
      res.abc = t.abc; res.notes = t.notes; res.check = chk;
      $("wb-abc").textContent = t.abc;
      var count = {}; res.bars.forEach(function (b) { b.forEach(function (e) { if (e.device) count[e.device] = (count[e.device] || 0) + 1; }); });
      res.count = count;
      note.textContent = (chk.ok ? "Bar check: all " + chk.bars + " bars hold 4 beats, and every drawn pitch is the one played." : "Bar check FAILED: " + chk.bad.join("; ")) +
        (c.type === "walkdev" ? "  Device notes: " + (DEVS.filter(function (k) { return count[k]; }).map(function (k) { return k + " " + count[k]; }).join(", ") || "none this time") + "." : "");
      note.classList.toggle("wb-bad", !chk.ok);
      draw(res);
    }
    function draw(res) {
      var box = $("wb-score"); box.innerHTML = "";
      if (!global.ABCJS) { box.textContent = "(the notation library did not load)"; return; }
      var w = Math.max(320, Math.min(980, box.clientWidth || 800));
      drawn = global.ABCJS.renderAbc(box, res.abc, { add_classes: true, staffwidth: w - 30, responsive: "resize", paddingleft: 4, paddingright: 4, wrap: null })[0];
      // colour each note by its device (drawn order = res.notes)
      var k = 0;
      (drawn.lines || []).forEach(function (ln) { (ln.staff || []).forEach(function (st) { (st.voices || []).forEach(function (vc) { vc.forEach(function (el) {
        if (el.el_type !== "note" || el.rest) return;
        var n = res.notes[k++]; if (!n || !n.ev.device || !el.abselem) return;
        (el.abselem.elemset || []).forEach(function (s) { if (s && s.classList) s.classList.add("wb-d-" + n.ev.device); });
      }); }); }); });
      res.colored = k;
    }
    function stop() { if (handle) { try { handle.stop(); } catch (e) {} handle = null; } $("wb-play").textContent = "\u25b6 Play"; }
    function play() {
      if (handle) { stop(); return; }
      if (!cur || !drawn || !global.AbcPlay) return;
      var only = $("wb-bassonly").checked, me;
      $("wb-play").textContent = "\u25a0 Stop";
      me = handle = global.AbcPlay.play(drawn, { abc: cur.all, style: "swing", qpm: cur.tempo, melody: false, drums: !only,
        bandOpts: { bassFeel: cur.opts.bassFeel, bassLine: { bars: cur.bars }, fills: only ? "none" : undefined },
        onStart: function () { if (only && me && me._band && me._band.setVolume) try { me._band.setVolume("comp", 0); } catch (e) {} },
        onEnd: function () { if (handle === me) { handle = null; $("wb-play").textContent = "\u25b6 Play"; } } });
      global.__wbHandle = me;
    }
    function send(mode) {
      if (!cur) return;
      var dv = cur.opts.walkDevices || null, payload = { v: 1, from: "walking-bass", at: Date.now(), abc: mode === "exact" ? cur.all : cur.one, style: "swing",
        tempo: cur.tempo, choruses: mode === "exact" ? 1 : cur.choruses, bass: cur.opts.bassFeel === "two" ? "two" : "walkdev",
        devices: dv, line: mode === "exact" ? { bars: cur.bars } : null, mode: mode };
      try { localStorage.setItem("bandHandoff", JSON.stringify(payload)); }
      catch (e) { $("wb-send-note").textContent = "This browser is blocking storage for the page, so nothing could be sent."; return; }
      global.__wbLastHandoff = payload;
      $("wb-send-note").textContent = mode === "exact" ? "Sent this line, " + cur.bars.length + " bars, to the Backing Track." : "Sent the changes and these device settings to the Backing Track.";
      var url = "/tools/backing-track.html?from=walking-bass";
      if (!global.__wbNoOpen && !global.open(url, "_blank")) location.href = url;
    }
    ["wb-type", "wb-amount", "wb-variation", "wb-choruses", "wb-key", "wb-seed"].concat(DEVS.map(function (k) { return "wb-" + k; })).forEach(function (id) {
      $(id).addEventListener(id === "wb-seed" || id === "wb-type" || id === "wb-key" || id === "wb-choruses" ? "change" : "input", make); });
    $("wb-tempo").addEventListener("change", function () { if (cur) { cur.tempo = +$("wb-tempo").value || 140; stop(); } });
    $("wb-new").addEventListener("click", function () { $("wb-seed").value = 1 + Math.floor(Math.random() * 99999); make(); });
    $("wb-play").addEventListener("click", play);
    $("wb-bassonly").addEventListener("change", function () { if (handle && handle._band) { var only = $("wb-bassonly").checked; try { handle._band.setVolume("comp", only ? 0 : 1); handle._band.setVolume("drums", only ? 0 : 1); } catch (e) {} } });
    $("wb-send-exact").addEventListener("click", function () { send("exact"); });
    $("wb-send-dev").addEventListener("click", function () { send("devices"); });
    sel.value = "fblues"; $("wb-bars").value = PRESETS[0].bars; keyLabels(); keySel.value = "0";
    make();
    global.__wbState = function () { return cur; };
  }

  global.WalkingBass = { PRESETS: PRESETS, generate: generate, toAbc: toAbc, checkAbc: checkAbc, changesAbc: changesAbc, moveSym: moveSym, mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
