// GuitarPickups: electric guitars the way the site does synths. A physically based model of a plucked string heard through
// magnetic pickups, a faithful drawing of each guitar's control area (FaithfulPanel, host adapter), translation between guitars,
// and the sound through SynthKit's amp. Pages: lessons/guitar-compare.qmd, lessons/intro-{strat,tele,les-paul,sg}.qmd.
//
// THE MODEL (pure maths, runs in node: tests/lessons/guitar-pickups.test.js)
//   String: modal synthesis. Mode n of a string of vibrating length Lv plucked at distance p from the bridge has displacement
//     amplitude sin(n pi p / Lv) / n^2 (the ideal plucked string, Fletcher & Rossing ch. 2); a magnetic pickup senses velocity, so
//     x n. Mode frequencies f_n = n f0 sqrt(1 + B n^2) (stiffness, B = 8e-5: site's value, unverified); each mode decays with
//     tau_n = 4 / (1 + f_n / 300) s (site's value, unverified: higher modes die sooner).
//   Pickup position and width: Tillman (2002): a pickup at distance x from the bridge senses sin(n pi x / Lv) (a comb filter,
//     nulls where a harmonic has a node over the pickup); averaged over its aperture W it gains sin(n pi W/(2Lv)) / (n pi W/(2Lv)).
//     Positions on the Strat (6.375 / 3.875 / 1.625 in from the bridge, 1 in aperture) are Tillman's. Every other position and
//     aperture is this site's estimate (unverified). A humbucker is two coils side by side (each its own point + aperture) in
//     series: the string signals add, the hum (opposite in the two coils) cancels.
//   Electronics: each coil is a source in series with R + j w L, its self-capacitance across it; volume pots (250k Fender,
//     500k Gibson), tone pots + capacitor to ground, the cable's capacitance and the amp's 1 Mohm input. Solved exactly as a
//     complex nodal network at every mode's frequency, so the resonance (L with C: Lemme, 2-5 kHz with a normal cable), the tone
//     pot's lowering of it, the volume pot's treble loss (its series resistance into the cable C), and the phase between
//     pickups mixed in parallel all come out of the circuit. L / R / C / pot values are typical ones chosen by this site within
//     Lemme's ranges (1-10 H): unverified for any particular guitar. Audio taper pots: 10 % at half way (site's choice).
//   Hum: 60 Hz + harmonics induced per coil (single coil 1, humbucker coils cancel, the Strat's middle pickup reverse-wound
//     reverse-polarity so positions 2 and 4 cancel it: a common modern Fender practice, unverified for any year).
//
// API
//   GuitarPickups.GUITARS[id]          { name, short, maker, year, scale (in), pickups: [...], positions: [{id, label, use:{pickupId: +1|-1}}],
//                                        controls: [[key, label, "k", 0, 10, 0.1, default] | [key, label, "c", [values], null, null, default]], wiring }
//   GuitarPickups.defaults(id) -> state  { sel, vol..., tone..., phase? }
//   GuitarPickups.response(id, state, f0, opts) -> [{ n, f, amp, ph }] the mode amplitudes at the output (opts.pluck in, opts.fret)
//   GuitarPickups.electrical(id, state, freqs) -> [|H|] the circuit alone (summed pickups, in phase, unit string signal)
//   GuitarPickups.resonance(id, state) -> { f, peakDb } the circuit's resonant peak
//   GuitarPickups.centroid(id, state, f0) -> Hz  brightness: the amplitude-weighted mean frequency of the modes
//   GuitarPickups.hum(id, state) -> relative hum level at the output (1 = one single coil, full volume)
//   GuitarPickups.render(id, state, notes, opts) -> Float32Array  notes: [{midi, t, dur, vel}], opts { sr, pluck, hum, len }
//   GuitarPickups.translate(fromId, state, toId) -> { state, quality: "exact"|"approx"|"lost", notes: [text], dist }
//   GuitarPickups.adapter(widget) -> FaithfulPanel host adapter { get, set, range, onChange }
//   GuitarPickups.mount(el, { guitar, compact, onChange }) -> widget { id, st, set(k, v), setAll(st), play(kind), setGuitar(id) }
//   Page markup: <div class="gtp" data-guitar="strat"></div>  (a widget)   <div class="gtc" data-a="strat" data-b="lespaul"></div>  (compare)
//                <div class="gt-step" data-guitar="strat" data-set='{"sel":"p2"}' data-play="riff">text</div>  (a tour step)
//                <div class="gt-q" data-a="1"><p>q</p><ul><li>..</li></ul><p class="gt-why">..</p></div>  (quiz)
//                <div class="gt-tracks" data-guitar="strat"></div>  (famous tracks from apps/shared/data/guitars/tracks.json)
// BASSES (2026-11-26, additive): apps/shared/lessons/bass-pickups.js registers instruments with GP.add(id, def) (family "bass",
//   not in GP.IDS but in GP.BASS_IDS). Extra, optional fields a def may carry (guitars leave them out and behave as before):
//   tuning [midi...], B (stiffness), decay [tau0 s, corner Hz], pluck (default in), panel (layout id, default "gt-"+id),
//   search [{partial state}] (variants translate tries), coil third element [strings] (a coil heard only by those strings: the
//   P-bass split coil); pickup type "split" (hum-cancelling like "hb"); wiring kinds "jazz" (each pickup on the wiper of its
//   own volume, so one at 0 solos the other; master tone at the output) and "active" (pickups into a preamp input wiring.inR,
//   then wiring.eq(f, st) and the volume; output buffered, so the cable does not load the pickups).
//   GP.init({ prefix, ids, tracks }) mounts `.<prefix>p` / `.<prefix>c` / `.<prefix>-step` / `.<prefix>-q` / `.<prefix>-tracks`
//   (the guitar pages use prefix "gt", the default; data-bass in place of data-guitar for other prefixes).
(function (global) {
  var GP = {};
  var IN = 1;   // lengths in inches throughout (the makers' own unit)

  // ---------- the guitars ----------
  // pickup: { id, label, type: "sc" | "hb", coils: [[x from bridge, aperture]], L (H), R (ohm), C (F), out (relative turns), hum: +1 | -1 }
  function sc(id, label, x, o) { return Object.assign({ id: id, label: label, type: "sc", coils: [[x, 1.0]], L: 2.4, R: 6000, C: 120e-12, out: 1, hum: 1 }, o || {}); }
  function hb(id, label, x, o) { return Object.assign({ id: id, label: label, type: "hb", coils: [[x - 0.31, 0.62], [x + 0.31, 0.62]], L: 4.4, R: 8000, C: 150e-12, out: 1.5, hum: 0 }, o || {}); }
  var K = function (k, l, d) { return [k, l, "k", 0, 10, 0.1, d == null ? 10 : d]; };
  GP.GUITARS = {
    strat: { name: "Fender Stratocaster", short: "Strat", maker: "Fender", year: 1954, scale: 25.5,
      pickups: [sc("neck", "Neck", 6.375), sc("mid", "Middle", 3.875, { hum: -1 }), sc("bridge", "Bridge", 1.625, { L: 2.6, R: 6400 })],
      positions: [{ id: "p1", label: "1", use: { bridge: 1 } }, { id: "p2", label: "2", use: { bridge: 1, mid: 1 } }, { id: "p3", label: "3", use: { mid: 1 } },
                  { id: "p4", label: "4", use: { mid: 1, neck: 1 } }, { id: "p5", label: "5", use: { neck: 1 } }],
      controls: [["sel", "5-way selector", "c", ["p1", "p2", "p3", "p4", "p5"], null, null, "p1"], K("vol", "Volume"), K("tone1", "Tone (neck)"), K("tone2", "Tone (middle, bridge)")],
      wiring: { kind: "fender", vol: 250e3, tonePot: 250e3, cap: 0.022e-6, tone: { neck: "tone1", mid: "tone2", bridge: "tone2" } },
      facts: "Three single coils, a five-way selector (from 1977), one volume and two tone knobs; scale 25.5 in (Wikipedia, \"Fender Stratocaster\")." },
    tele: { name: "Fender Telecaster", short: "Tele", maker: "Fender", year: 1950, scale: 25.5,
      pickups: [sc("neck", "Neck", 6.3, { L: 2.2, R: 7000, out: 0.85 }), sc("bridge", "Bridge", 1.45, { L: 3.2, R: 7200, out: 1.25, coils: [[1.45, 1.1]] })],
      positions: [{ id: "neck", label: "Neck", use: { neck: 1 } }, { id: "both", label: "Both", use: { neck: 1, bridge: 1 } }, { id: "bridge", label: "Bridge", use: { bridge: 1 } }],
      controls: [["sel", "3-way selector", "c", ["neck", "both", "bridge"], null, null, "bridge"], K("vol", "Volume"), K("tone", "Tone")],
      wiring: { kind: "fender", vol: 250e3, tonePot: 250e3, cap: 0.047e-6, tone: { neck: "tone", bridge: "tone" }, toneAfter: true },
      facts: "Two single coils (the bridge one wound hotter), one volume, one tone, a three-way selector neck / both / bridge (the 1967 wiring); scale 25.5 in (Wikipedia, \"Fender Telecaster\")." },
    lespaul: { name: "Gibson Les Paul Standard", short: "Les Paul", maker: "Gibson", year: 1952, scale: 24.75,
      pickups: [hb("neck", "Neck (rhythm)", 5.9), hb("bridge", "Bridge (treble)", 1.55, { L: 4.6, R: 8400 })],
      positions: [{ id: "rhythm", label: "Rhythm", use: { neck: 1 } }, { id: "both", label: "Both", use: { neck: 1, bridge: 1 } }, { id: "treble", label: "Treble", use: { bridge: 1 } }],
      controls: [["sel", "3-way toggle", "c", ["rhythm", "both", "treble"], null, null, "treble"], K("vol1", "Neck volume"), K("vol2", "Bridge volume"), K("tone1", "Neck tone"), K("tone2", "Bridge tone"),
                 ["phase", "Neck out of phase (what if: a later mod)", "s", false, true, null, false]],
      wiring: { kind: "gibson", vol: 500e3, tonePot: 500e3, cap: 0.022e-6, vols: { neck: "vol1", bridge: "vol2" }, tone: { neck: "tone1", bridge: "tone2" } },
      facts: "Two humbuckers (from 1957, designed by Seth Lover), two volume and two tone knobs, a three-way switch; scale 24.75 in (Wikipedia, \"Gibson Les Paul\")." },
    sg: { name: "Gibson SG Standard", short: "SG", maker: "Gibson", year: 1961, scale: 24.75,
      pickups: [hb("neck", "Neck (rhythm)", 6.6), hb("bridge", "Bridge (treble)", 1.55, { L: 4.6, R: 8400 })],
      positions: [{ id: "rhythm", label: "Rhythm", use: { neck: 1 } }, { id: "both", label: "Both", use: { neck: 1, bridge: 1 } }, { id: "treble", label: "Treble", use: { bridge: 1 } }],
      controls: [["sel", "3-way toggle", "c", ["rhythm", "both", "treble"], null, null, "treble"], K("vol1", "Neck volume"), K("vol2", "Bridge volume"), K("tone1", "Neck tone"), K("tone2", "Bridge tone"),
                 ["phase", "Neck out of phase (what if: a later mod)", "s", false, true, null, false]],
      wiring: { kind: "gibson", vol: 500e3, tonePot: 500e3, cap: 0.022e-6, vols: { neck: "vol1", bridge: "vol2" }, tone: { neck: "tone1", bridge: "tone2" } },
      facts: "Two humbuckers, a volume and a tone for each, a three-way switch; scale 24.75 in; the neck joins the body further up, so the neck pickup sits nearer the middle of the string (Wikipedia, \"Gibson SG\"; the pickup distance is this site's estimate)." }
  };
  GP.IDS = Object.keys(GP.GUITARS);
  GP.BASS_IDS = [];
  GP.add = function (id, def) { GP.GUITARS[id] = def; if (def.family === "bass") GP.BASS_IDS.push(id); else GP.IDS.push(id); };
  function tun(id) { return GP.GUITARS[id].tuning || GP.TUNING; }
  GP.CABLE = 500e-12;   // a 3-4 m cable (site's value, unverified)
  GP.AMP_R = 1e6;
  GP.TUNING = [40, 45, 50, 55, 59, 64];

  function ctl(id, k) { var c = GP.GUITARS[id].controls; for (var i = 0; i < c.length; i++) if (c[i][0] === k) return c[i]; return null; }
  GP.ctl = ctl;
  GP.defaults = function (id) { var o = {}; GP.GUITARS[id].controls.forEach(function (c) { o[c[0]] = c[6]; }); return o; };
  GP.clean = function (id, st) { var o = GP.defaults(id); st = st || {}; GP.GUITARS[id].controls.forEach(function (c) { var v = st[c[0]]; if (v == null) return;
      if (c[2] === "k") o[c[0]] = Math.max(0, Math.min(10, +v)); else if (c[2] === "s") o[c[0]] = !!v; else if (c[3].indexOf(v) >= 0) o[c[0]] = v; }); return o; };
  // audio taper: half way = 10 % (site's choice)
  GP.taper = function (v) { var x = Math.max(0, Math.min(10, v)) / 10; if (x <= 0) return 0; if (x >= 1) return 1; return x <= 0.5 ? x * 0.2 : 0.1 + (x - 0.5) * 1.8; };

  // ---------- complex numbers and a nodal solver ----------
  function C(re, im) { return { re: re, im: im || 0 }; }
  function add(a, b) { return C(a.re + b.re, a.im + b.im); } function sub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function mul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function div(a, b) { var d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
  function inv(a) { return div(C(1), a); } function abs(a) { return Math.hypot(a.re, a.im); }
  function solve(Y, I) {   // complex Gaussian elimination, Y n x n, I n
    var n = I.length, A = Y.map(function (r, i) { return r.concat([I[i]]); });
    for (var c = 0; c < n; c++) { var p = c; for (var r = c + 1; r < n; r++) if (abs(A[r][c]) > abs(A[p][c])) p = r; var t = A[c]; A[c] = A[p]; A[p] = t;
      for (r = c + 1; r < n; r++) { var f = div(A[r][c], A[c][c]); for (var k = c; k <= n; k++) A[r][k] = sub(A[r][k], mul(f, A[c][k])); } }
    var x = new Array(n); for (var i = n - 1; i >= 0; i--) { var s = A[i][n]; for (var j = i + 1; j < n; j++) s = sub(s, mul(A[i][j], x[j])); x[i] = div(s, A[i][i]); }
    return x;
  }
  // build the network for the active pickups; return, for frequency f, the transfer Hi(f) (output volts per volt of source i)
  function network(id, st) {
    var G = GP.GUITARS[id], W = G.wiring, pos = G.positions.filter(function (p) { return p.id === st.sel; })[0] || G.positions[0];
    var act = G.pickups.filter(function (p) { return pos.use[p.id]; });
    return function (f) {
      var w = 2 * Math.PI * f, nodes = {}, N = 0, el = [];
      function node(n) { if (nodes[n] == null) nodes[n] = N++; return nodes[n]; }
      function Yr(r) { return C(1 / Math.max(r, 1e-3)); } function Yc(c) { return C(0, w * c); }
      function tone(k) { var t = st[k] == null ? 10 : st[k]; return inv(add(C(W.tonePot * GP.taper(t) + 50), C(0, -1 / (w * W.cap)))); }
      function put(a, b, y) { el.push([a, b, y]); }
      var srcY = [];
      act.forEach(function (p) { var pn = node("p:" + p.id), zp = C(p.R, w * p.L); srcY.push([pn, inv(zp)]); put(pn, null, inv(zp)); put(pn, null, Yc(p.C)); });
      var out = node("out");
      if (W.kind === "fender") {
        var j = node("join"), a = GP.taper(st.vol);
        act.forEach(function (p) { var pn = nodes["p:" + p.id]; put(pn, j, Yr(1)); if (!W.toneAfter && W.tone[p.id]) put(pn, null, tone(W.tone[p.id])); });
        if (W.toneAfter) put(j, null, tone(W.tone[act[0].id]));
        if (a >= 1) { put(j, out, Yr(1)); put(j, null, Yr(W.vol)); } else { put(j, out, Yr((1 - a) * W.vol + 1)); put(out, null, Yr(a * W.vol + 1)); }
      } else if (W.kind === "jazz") {
        act.forEach(function (p) { var pn = nodes["p:" + p.id], a = GP.taper(st[W.vols[p.id]]);
          put(pn, null, Yr(a * W.vol + 1)); put(pn, out, Yr((1 - a) * W.vol + 1)); });
        put(out, null, tone(W.tone.out));
      } else if (W.kind === "active") {
        act.forEach(function (p) { put(nodes["p:" + p.id], out, Yr(1)); }); put(out, null, Yr(W.inR));
      } else {
        act.forEach(function (p) { var pn = nodes["p:" + p.id], a = GP.taper(st[W.vols[p.id]]), wn = node("w:" + p.id);
          put(pn, null, tone(W.tone[p.id]));
          put(pn, wn, Yr((1 - a) * W.vol + 1)); put(wn, null, Yr(a * W.vol + 1)); put(wn, out, Yr(1)); });
      }
      if (W.kind !== "active") { put(out, null, Yc(GP.CABLE)); put(out, null, Yr(GP.AMP_R)); }
      var Y = []; for (var r = 0; r < N; r++) { Y.push([]); for (var c = 0; c < N; c++) Y[r].push(C(0)); }
      el.forEach(function (e) { var a2 = e[0], b = e[1], y = e[2]; Y[a2][a2] = add(Y[a2][a2], y); if (b != null) { Y[b][b] = add(Y[b][b], y); Y[a2][b] = sub(Y[a2][b], y); Y[b][a2] = sub(Y[b][a2], y); } });
      var H = {}; act.forEach(function (p, i) { var I = []; for (var r2 = 0; r2 < N; r2++) I.push(C(0)); I[srcY[i][0]] = srcY[i][1]; H[p.id] = solve(Y, I)[out]; });
      if (W.kind === "active") { var g = C(GP.taper(st.vol) * (W.gain || 1) * (W.eq ? W.eq(f, st) : 1)); act.forEach(function (p) { H[p.id] = mul(H[p.id], g); }); }
      return H;
    };
  }
  function activePickups(id, st) { var G = GP.GUITARS[id], pos = G.positions.filter(function (p) { return p.id === st.sel; })[0] || G.positions[0];
    return G.pickups.filter(function (p) { return pos.use[p.id]; }).map(function (p) { var s = pos.use[p.id]; if (st.phase && p.id === "neck" && pos.use.bridge) s = -s; return [p, s]; }); }
  // the pickup's sensitivity to mode n of a string of vibrating length Lv: Tillman's point x aperture terms, summed over coils
  function sense(p, n, Lv, str) { var s = 0, m = 0; p.coils.forEach(function (cw) { if (cw[2] && str != null && cw[2].indexOf(str) < 0) return; var x = cw[0], Wd = cw[1], u = n * Math.PI * Wd / (2 * Lv); m++;
      s += Math.sin(n * Math.PI * x / Lv) * (u > 1e-9 ? Math.sin(u) / u : 1); }); return m ? s / m * p.out : 0; }
  GP.sense = sense;

  GP.response = function (id, st, f0, opts) {
    opts = opts || {}; st = GP.clean(id, st); var G = GP.GUITARS[id], fret = opts.fret || 0, Lv = G.scale / Math.pow(2, fret / 12), pl = opts.pluck == null ? (G.pluck || 5.5) : opts.pluck;
    var net = network(id, st), act = activePickups(id, st), B = G.B || 8e-5, res = [], str = opts.string == null ? stringFor(Math.round(69 + 12 * Math.log2(f0 / 440)) - fret, id) : opts.string;
    for (var n = 1; n < 80; n++) { var f = n * f0 * Math.sqrt(1 + B * n * n); if (f > (opts.fmax || 12000)) break;
      var H = net(f), s = C(0); act.forEach(function (ps) { s = add(s, mul(H[ps[0].id], C(ps[1] * sense(ps[0], n, Lv, str)))); });
      var ex = Math.sin(n * Math.PI * Math.min(pl, Lv * 0.98) / Lv) / n;   // plucked displacement / n^2, velocity x n
      var v = mul(s, C(ex)); res.push({ n: n, f: f, amp: abs(v), ph: Math.atan2(v.im, v.re) }); }
    return res;
  };
  GP.electrical = function (id, st, freqs) { st = GP.clean(id, st); var net = network(id, st), act = activePickups(id, st);
    return freqs.map(function (f) { var H = net(f), s = C(0); act.forEach(function (ps) { s = add(s, mul(H[ps[0].id], C(ps[1] * ps[0].out))); }); return abs(s); }); };
  GP.resonance = function (id, st) { var fs = []; for (var f = 500; f <= 12000; f *= 1.01) fs.push(f); var m = GP.electrical(id, st, fs), lo = GP.electrical(id, st, [200])[0], b = 0;
    m.forEach(function (v, i) { if (v > m[b]) b = i; }); return { f: fs[b], peakDb: 20 * Math.log10(m[b] / lo) }; };
  GP.centroid = function (id, st, f0) { var r = GP.response(id, st, f0 || 110), s = 0, w = 0; r.forEach(function (m) { s += m.f * m.amp; w += m.amp; }); return w ? s / w : 0; };
  GP.level = function (id, st, f0) { var r = GP.response(id, st, f0 || 110), s = 0; r.forEach(function (m) { s += m.amp * m.amp; }); return Math.sqrt(s); };
  GP.hum = function (id, st) { st = GP.clean(id, st); var net = network(id, st), act = activePickups(id, st), H = net(180), s = C(0);
    act.forEach(function (ps) { var hm = ps[0].type === "hb" || ps[0].type === "split" ? 0.03 : ps[0].hum * (ps[1] < 0 ? -1 : 1); s = add(s, mul(H[ps[0].id], C(hm))); });
    var ref = network("strat", { sel: "p3", vol: 10, tone1: 10, tone2: 10 })(180).mid; return abs(s) / abs(ref); };

  // ---------- rendering (Float32Array; no Web Audio needed) ----------
  GP.render = function (id, st, notes, opts) {
    opts = opts || {}; var sr = opts.sr || 44100, len = opts.len || Math.max.apply(null, notes.map(function (n) { return n.t + n.dur; })) + 0.6, N = Math.ceil(len * sr), out = new Float32Array(N);
    notes.forEach(function (nt) {
      var f0 = 440 * Math.pow(2, (nt.midi - 69) / 12), str = nt.string != null ? nt.string : stringFor(nt.midi, id), fret = nt.midi - tun(id)[str], dc = GP.GUITARS[id].decay || [4, 300];
      var modes = GP.response(id, st, f0, { fret: fret, string: str, pluck: opts.pluck, fmax: Math.min(sr * 0.45, 12000) }), i0 = Math.floor(nt.t * sr), vel = nt.vel == null ? 0.8 : nt.vel, rel = nt.dur;
      modes.forEach(function (m) { var tau = dc[0] / (1 + m.f / dc[1]), a = m.amp * vel, w = 2 * Math.PI * m.f / sr, d = Math.exp(-1 / (tau * sr)), dRel = Math.exp(-1 / (0.05 * sr));
        var env = a, end = Math.min(N, i0 + Math.ceil((nt.dur + 0.3) * sr)), relI = i0 + Math.floor(rel * sr), ph = m.ph;
        for (var i = i0; i < end; i++) { var k = i - i0; out[i] += env * Math.sin(w * k + ph) * Math.min(1, k / 40); env *= i < relI ? d : dRel; if (env < 1e-6) break; } });
    });
    if (opts.hum) { var hl = GP.hum(id, st) * opts.hum * 0.02; for (var i = 0; i < N; i++) { var t = i / sr; out[i] += hl * (Math.sin(2 * Math.PI * 60 * t) + 0.5 * Math.sin(2 * Math.PI * 180 * t) + 0.3 * Math.sin(2 * Math.PI * 300 * t)); } }
    return out;
  };
  function stringFor(m, id) { var T = id ? tun(id) : GP.TUNING; for (var s = T.length - 1; s >= 0; s--) if (m >= T[s]) return s; return 0; }
  GP.PHRASES = {   // what the ▶ buttons play: [midi, start beat, beats]
    pluck: [[45, 0, 3]], chord: [[40, 0, 4], [47, 0.03, 4], [52, 0.06, 4], [56, 0.09, 4], [59, 0.12, 4], [64, 0.15, 4]],
    riff: [[45, 0, .5], [52, .5, .5], [57, 1, .5], [52, 1.5, .5], [45, 2, .5], [55, 2.5, .5], [57, 3, 1]],
    lead: [[69, 0, .5], [72, .5, .5], [74, 1, .5], [76, 1.5, 1], [74, 2.5, .5], [72, 3, 1.5]]
  };
  GP.BASS_PHRASES = {   // the same buttons on a bass: [midi, start beat, beats]
    pluck: [[33, 0, 3]], chord: [[28, 0, 1], [35, 1, 1], [40, 2, 1], [35, 3, 1]],
    riff: [[33, 0, .75], [33, .75, .25], [40, 1, .5], [43, 1.5, .5], [45, 2, .5], [43, 2.5, .5], [40, 3, .5], [38, 3.5, .5]],
    lead: [[45, 0, .5], [48, .5, .5], [50, 1, .5], [52, 1.5, 1], [50, 2.5, .5], [48, 3, 1.5]]
  };
  GP.notes = function (kind, bpm, fam) { var b = 60 / (bpm || 110), P = fam === "bass" ? GP.BASS_PHRASES : GP.PHRASES; return (P[kind] || P.pluck).map(function (x) { return { midi: x[0], t: x[1] * b, dur: x[2] * b, vel: 0.8 }; }); };

  // ---------- translation ----------
  // A setting is compared by its fingerprint: the share of energy (dB) in third-octave bands, 80 Hz-8 kHz, for three open strings.
  function finger(id, st) { var v = [], bs = GP.GUITARS[id].family === "bass", F0 = bs ? 40 : 80; (bs ? [41.2, 73.4, 110] : [82.4, 146.8, 246.9]).forEach(function (f0) { var r = GP.response(id, st, f0, { fmax: 8000 }), bands = [], tot = 0;
      for (var b = 0; b < 20; b++) bands.push(1e-12);   // third-octave bands from 80 Hz
      r.forEach(function (m) { var b2 = Math.floor(3 * Math.log2(m.f / F0)); if (b2 >= 0 && b2 < 20) { bands[b2] += m.amp * m.amp; tot += m.amp * m.amp; } });
      bands.forEach(function (e) { v.push(10 * Math.log10(e / tot)); }); }); return v; }
  function dist(a, b) { var s = 0; for (var i = 0; i < a.length; i++) { var d = Math.max(-40, a[i]) - Math.max(-40, b[i]); s += d * d; } return Math.sqrt(s / a.length); }
  GP.dist = function (a, sa, b, sb) { return dist(finger(a, sa), finger(b, sb)); };
  function zone(p, G) { var r = p.coils.reduce(function (s, c) { return s + c[0]; }, 0) / p.coils.length / G.scale; return r < 0.1 ? "bridge" : r < 0.2 ? "middle" : "neck"; }
  GP.describe = function (id, st) { st = GP.clean(id, st); var G = GP.GUITARS[id], act = activePickups(id, st);
    return { zones: act.map(function (ps) { return zone(ps[0], G); }), types: act.map(function (ps) { return ps[0].type; }), outPhase: act.some(function (ps) { return ps[1] < 0; }) }; };
  GP.translate = function (from, st, to) {
    st = GP.clean(from, st); var target = finger(from, st), Gt = GP.GUITARS[to], best = null, D = GP.describe(from, st);
    var toneKeys = Gt.controls.filter(function (c) { return /^tone/.test(c[0]); }).map(function (c) { return c[0]; });
    var vars = Gt.search || [{}];
    Gt.positions.forEach(function (pos) { [false, true].forEach(function (ph) { vars.forEach(function (vr) { if (ph && (!ctl(to, "phase") || !D.outPhase)) return; if (ph && !(pos.use.neck && pos.use.bridge)) return;
      for (var t = 0; t <= 10; t += 2) { var s = GP.defaults(to); s.sel = pos.id; if (ctl(to, "phase")) s.phase = ph; toneKeys.forEach(function (k) { s[k] = t; });
        Object.keys(st).forEach(function (k) { if (/^vol/.test(k) && ctl(to, k)) s[k] = st[k]; }); if (st.vol != null && ctl(to, "vol1")) { s.vol1 = s.vol2 = st.vol; } if (st.vol1 != null && ctl(to, "vol")) s.vol = Math.max(st.vol1, st.vol2);
        Object.keys(st).forEach(function (k) { if (/^(bass|mid|treble)$/.test(k) && ctl(to, k)) s[k] = st[k]; });
        Object.assign(s, vr); s = GP.clean(to, s);
        var d = dist(target, finger(to, s)); if (!best || d < best.dist) best = { state: s, dist: d }; } }); }); });
    var notes = [], Dt = GP.describe(to, best.state), same = from === to || (D.types.join() === Dt.types.join() && D.zones.join() === Dt.zones.join() && D.outPhase === Dt.outPhase);
    var bassy = GP.GUITARS[from].family === "bass" || Gt.family === "bass";
    if (D.types.indexOf("sc") >= 0 && Dt.types.indexOf("sc") < 0 && Dt.types.indexOf("hb") >= 0) notes.push("Single-coil brightness and bite: " + Gt.short + " has humbuckers, which sound darker and fuller (lower resonance, wider aperture). Tone knobs cannot add treble back.");
    if (D.types.indexOf("hb") >= 0 && Dt.types.indexOf("hb") < 0 && Dt.types.indexOf("sc") >= 0) notes.push("Humbucker thickness and hum cancelling: " + Gt.short + " has single coils, so it hums more and sounds thinner and brighter.");
    if (D.zones.indexOf("middle") >= 0 && Dt.zones.indexOf("middle") < 0) notes.push("A middle pickup: " + Gt.short + " has none, so the nearest is its " + Gt.positions.filter(function (p) { return p.id === best.state.sel; })[0].label + " position.");
    if (bassy && D.zones.length === 2 && Dt.zones.length < 2) notes.push("Two pickups blended: " + Gt.short + " has one pickup sounding here, so the blend's notches (the Jazz Bass's scooped sound) are only approximated.");
    if (!bassy && D.zones.length === 2 && D.zones.indexOf("middle") >= 0 && D.types[0] === "sc") notes.push("The \"in-between\" quack (two single coils in parallel, the notches of their combined comb filter) is only approximated.");
    if (D.types.indexOf("split") >= 0 && Dt.types.indexOf("split") < 0) notes.push("The split-coil P pickup (each half under two strings, hum-cancelling): " + Gt.short + " has none, so each string is heard at a different place.");
    if (GP.GUITARS[from].wiring.kind === "active" && Gt.wiring.kind !== "active") notes.push("The active EQ: " + Gt.short + " is passive, so a boost cannot be copied (a passive tone knob only cuts treble).");
    if (GP.GUITARS[from].wiring.kind === "active" && Gt.wiring.kind === "active" && ctl(from, "mid") && !ctl(to, "mid")) notes.push("The mid knob: " + Gt.short + " has bass and treble only.");
    if (D.outPhase && !Dt.outPhase) notes.push("Out of phase: " + Gt.short + " has no phase switch, so the thin, hollow sound is lost.");
    if (Math.abs(GP.GUITARS[from].scale - Gt.scale) > 0.3) notes.push("Scale length " + GP.GUITARS[from].scale + " in vs " + Gt.scale + " in: the string's own tone and tension differ a little (not modelled beyond pickup distance).");
    var quality = same && best.dist < 1.5 ? "exact" : best.dist < 9 ? "approx" : "lost";
    if (quality === "lost") notes.unshift("No setting comes close (average " + best.dist.toFixed(1) + " dB apart, third-octave bands of three open strings).");
    return { state: best.state, quality: quality, notes: notes, dist: best.dist };
  };
  GP.posLabel = function (id, sel) { var p = GP.GUITARS[id].positions.filter(function (x) { return x.id === sel; })[0]; return p ? p.label : sel; };
  GP.summary = function (id, st) { var G = GP.GUITARS[id]; st = GP.clean(id, st); var hasSel = G.controls[0][0] === "sel", bits = [G.short + (hasSel ? " " + (G.controls[0][1].replace(/selector|toggle/, "").trim()) + " " + GP.posLabel(id, st.sel) : "")];
    G.controls.slice(hasSel ? 1 : 0).forEach(function (c) { if (c[2] === "k") bits.push(c[1] + " " + (+st[c[0]]).toFixed(0)); else if (c[0] === "phase" && st.phase) bits.push("neck out of phase"); }); return bits.join(", "); };

  // Panel drawing helpers (panels/gt-*.js, bs-*.js): one scale for the whole instrument. GP.drawing(S, BX, CY): S units an inch,
  // BX = x of the bridge saddles, CY = y of the string centre line; positions in inches: d towards the neck from the saddles, e towards
  // the treble side (down the drawing, the side the controls are on). outline([[d, e], ...]) = a smooth closed curve through the
  // points (Catmull-Rom); poly = straight sides; neck(...) = a neck stub running off the left edge with frets at the scale length.
  GP.drawing = function (S, BX, CY) { var X = function (d) { return +(BX - d * S).toFixed(1); }, Y = function (e) { return +(CY + e * S).toFixed(1); };
    function pt(p) { return [BX - p[0] * S, CY + p[1] * S]; } function f(v) { return v.toFixed(1); }
    var D = { S: S, X: X, Y: Y,
      outline: function (pts) { var P = pts.map(pt), n = P.length, d = "M" + f(P[0][0]) + " " + f(P[0][1]);
        for (var i = 0; i < n; i++) { var p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
          d += " C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) + " " + f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + f(p2[0]) + " " + f(p2[1]); }
        return d + " Z"; },
      poly: function (pts) { return pts.map(function (p, i) { var q = pt(p); return (i ? "L" : "M") + f(q[0]) + " " + f(q[1]); }).join(" ") + " Z"; },
      rect: function (d0, d1, e0, e1) { return D.poly([[d0, e0], [d1, e0], [d1, e1], [d0, e1]]); },
      dot: function (d, e, r) { var x = X(d) - r, y = Y(e); return "M" + f(x) + " " + f(y) + " a" + r + " " + r + " 0 1 0 " + 2 * r + " 0 a" + r + " " + r + " 0 1 0 " + -2 * r + " 0"; },
      // neck from the body joint dj to the left edge dl; width wj there and wl at dl; frets of a `scale`-inch scale; fill = wood colour
      neck: function (dj, dl, wj, wl, scale, fill, board) { var it = [{ t: "shape", d: D.poly([[dj, -wj / 2], [dl, -wl / 2], [dl, wl / 2], [dj, wj / 2]]), fill: fill, stroke: "ink2", sw: 1.2, title: "Neck (runs on to the headstock, off the drawing)" }];
        var fr = "", dots = ""; for (var n = 1; n <= 24; n++) { var x = scale * Math.pow(2, -n / 12); if (x > dj && x < dl) { var w = wj + (wl - wj) * (x - dj) / (dl - dj); fr += "M" + X(x) + " " + Y(-w / 2) + " V" + Y(w / 2) + " ";
            var xm = scale * (Math.pow(2, -n / 12) + Math.pow(2, -(n - 1) / 12)) / 2; if (xm > dj && xm < dl) { if ([3, 5, 7, 9, 15, 17, 19, 21].indexOf(n) >= 0) dots += D.dot(xm, 0, 3) + " "; if (n === 12) dots += D.dot(xm, -w / 4, 3) + " " + D.dot(xm, w / 4, 3) + " "; } } }
        if (board) it.push({ t: "shape", d: D.poly([[dj, -wj / 2 + .04], [dl, -wl / 2 + .04], [dl, wl / 2 - .04], [dj, wj / 2 - .04]]), fill: board, stroke: "none", title: "Fingerboard" });
        if (fr) it.push({ t: "shape", d: fr, fill: "none", stroke: "#b9b9b9", sw: 1.6, title: "Frets (at the scale length's positions)" });
        if (dots) it.push({ t: "shape", d: dots, fill: "#e8e4d8", stroke: "#777", sw: .5, title: "Position markers" });
        return it; },
      strings: function (n, sp, dTo, dFrom, sw) { var d = ""; for (var i = 0; i < n; i++) { var e = (i - (n - 1) / 2) * sp; d += "M" + X(dFrom) + " " + Y(e) + " H" + X(dTo) + " "; }
        return { t: "shape", d: d, fill: "none", stroke: "ink2", sw: sw || .8, op: .75, title: "Strings (lowest at the top here)" }; } };
    return D; };

  if (typeof module !== "undefined" && module.exports) { module.exports = GP; }
  if (typeof document === "undefined") { global.GuitarPickups = GP; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, amp = null, bank = null, playing = [];
  var AMPS = { clean: { gain: 2, bass: 5, mid: 5, treble: 6, master: 4, presence: 5, cab: null }, crunch: { gain: 6, bass: 5, mid: 6, treble: 6, master: 4, presence: 6 },
               lead: { gain: 9, bass: 6, mid: 7, treble: 5, master: 4, presence: 6 }, none: null };
  GP.AMPS = AMPS;
  function ac() {
    if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Guitar pickups"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx;
  }
  GP.ctx = function () { return ac(); };
  function chain(kind) {   // the SynthKit amp, rebuilt when the choice changes
    var c = ac(); if (amp) { try { amp.output.disconnect(); amp.stop(); } catch (e) {} amp = null; }
    var dry = c.createGain(); dry.gain.value = 1;
    if (kind === "none" || !global.SynthKit || !SynthKit.fx) { dry.connect(master); return { input: dry }; }
    var P = Object.assign({}, AMPS[kind] || AMPS.clean); if (!P.cab) delete P.cab; amp = SynthKit.fx("amp", c, P); dry.connect(amp.input); amp.output.connect(master); return { input: dry };
  }
  GP.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; };
  // a linear-phase FIR of the circuit alone (for the band's samples, which already went through some pickup)
  function firFor(id, st, c) { var n = 256, fs = [], half = n / 2; for (var k = 0; k <= half; k++) fs.push(Math.max(20, k * c.sampleRate / n));
    var mag = GP.electrical(id, st, fs), ref = GP.electrical(id, st, [300])[0]; var h = new Float32Array(n);
    for (var i = 0; i < n; i++) { var s = 0; for (k = 0; k <= half; k++) s += (k === 0 || k === half ? 1 : 2) * mag[k] / ref * Math.cos(2 * Math.PI * k * (i - half) / n); h[i] = s / n * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); }
    var b = c.createBuffer(1, n, c.sampleRate); b.getChannelData(0).set(h); var cv = c.createConvolver(); cv.normalize = false; cv.buffer = b; return cv; }
  GP.play = function (id, st, kind, o) {
    o = o || {}; var c = ac(); GP.stop(); var fam = GP.GUITARS[id].family, ch = chain(o.amp || "clean"), notes = GP.notes(kind, o.bpm, fam), smp = fam === "bass" ? "bass" : "guitar", ref = fam === "bass" ? [GP.BASS_IDS[0], 55] : ["strat", 110];
    if (o.source === "samples" && global.BandSounds) {
      bank = bank || BandSounds.create(c); var cv = firFor(id, st, c), g = c.createGain(); g.gain.value = 0.9 * Math.min(2, GP.level(id, st, ref[1]) / GP.level(ref[0], GP.defaults(ref[0]), ref[1])); cv.connect(g); g.connect(ch.input);
      return bank.load([smp]).then(function () { var t0 = c.currentTime + 0.05; notes.forEach(function (n) { bank.play(smp, { midi: n.midi, vel: n.vel, dur: n.dur }, t0 + n.t, cv); }); playing.push({ stop: function () { bank.stopAll(); } }); });
    }
    var data = GP.render(id, st, notes, { sr: c.sampleRate, pluck: o.pluck, hum: o.hum ? 1 : 0 }), peak = 0;
    var norm = 0.25 / Math.max(1e-6, GP.level(ref[0], GP.defaults(ref[0]), ref[1]) * 0.8); for (var i = 0; i < data.length; i++) data[i] *= norm;
    var buf = c.createBuffer(1, data.length, c.sampleRate); buf.getChannelData(0).set(data); var src = c.createBufferSource(); src.buffer = buf; src.connect(ch.input); src.start();
    playing.push(src); if (global.PlayBar && PlayBar.sounding) { PlayBar.sounding("guitar-pickups", GP.stop); src.onended = function () { PlayBar.sounding("guitar-pickups", null); }; }
    return Promise.resolve(src);
  };

  // ======================= browser: widget =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  GP.adapter = function (W) { var subs = [];
    W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); },
      range: function (k) { var c = ctl(W.id, k); if (!c) return null; return c[2] === "c" ? [c[0], c[1], "c", c[3], null, null, c[6]] : c[2] === "s" ? [c[0], c[1], "s", false, true, null, c[6]] : c; } }; };
  var PREFS = { amp: "clean", source: "model", hum: false, pluck: 5.5 };
  try { Object.assign(PREFS, JSON.parse(localStorage.getItem("gt-prefs") || "{}")); } catch (e) {}
  function savePrefs() { try { localStorage.setItem("gt-prefs", JSON.stringify(PREFS)); } catch (e) {} }
  GP.widgets = [];
  GP.mount = function (el, o) {
    o = o || {}; var W = { id: o.guitar || "strat", st: null, el: el }, IDL = o.ids || GP.IDS; W.st = GP.defaults(W.id); GP.widgets.push(W);
    el.classList.add("gtp-w"); el.innerHTML = "";
    var head = h("div", "gtp-head"); el.appendChild(head);
    var title = h("b", "gtp-title"); head.appendChild(title);
    if (o.choose) { var sel = h("select", "gtp-pick"); sel.setAttribute("aria-label", "Guitar"); IDL.forEach(function (id) { var op = h("option", null, GP.GUITARS[id].name); op.value = id; sel.appendChild(op); }); sel.onchange = function () { W.setGuitar(sel.value); }; head.appendChild(sel); W.pick = sel; }
    var face = h("div", "gtp-face"); el.appendChild(face);
    var bar = h("div", "gtp-bar"); el.appendChild(bar);
    [["pluck", "▶ One note"], ["chord", "▶ Chord"], ["riff", "▶ Riff"], ["lead", "▶ Lead line"]].forEach(function (b) { var x = h("button", "gtp-play", b[1]); x.type = "button"; x.dataset.play = b[0]; x.onclick = function () { W.play(b[0]); }; bar.appendChild(x); });
    var stop = h("button", "gtp-stop", "■ Stop"); stop.type = "button"; stop.onclick = GP.stop; bar.appendChild(stop);
    var opts = h("div", "gtp-opts"); el.appendChild(opts);
    function pick(label, key, list) { var l = h("label", null, label + " "), s = h("select"); list.forEach(function (x) { var op = h("option", null, x[1]); op.value = x[0]; s.appendChild(op); }); s.value = PREFS[key]; s.onchange = function () { PREFS[key] = s.value; savePrefs(); }; l.appendChild(s); opts.appendChild(l); return s; }
    pick("Amp", "amp", [["clean", "Clean"], ["crunch", "Crunch"], ["lead", "Lead (high gain)"], ["none", "No amp (straight from the jack)"]]);
    pick("Strings", "source", [["model", "String model (physical)"], ["samples", "Band samples (circuit only)"]]);
    var hl = h("label", null, " "), hc = h("input"); hc.type = "checkbox"; hc.checked = !!PREFS.hum; hc.onchange = function () { PREFS.hum = hc.checked; savePrefs(); }; hl.appendChild(hc); hl.appendChild(document.createTextNode(" mains hum")); opts.appendChild(hl);
    var pl = h("label", null, "Pick at "), pr = h("input"); pr.type = "range"; pr.min = 1; pr.max = 12; pr.step = 0.5; pr.value = PREFS.pluck; var pv = h("span", "gtp-pv");
    pr.oninput = function () { PREFS.pluck = +pr.value; pv.textContent = pr.value + " in from the bridge"; savePrefs(); W.draw(); }; pv.textContent = pr.value + " in from the bridge"; pl.appendChild(pr); pl.appendChild(pv); opts.appendChild(pl);
    var plot = h("div", "gtp-plot"); el.appendChild(plot);
    var info = h("p", "gtp-info"); el.appendChild(info);
    var A = GP.adapter(W), M = null;
    function build() {
      title.textContent = GP.GUITARS[W.id].name; if (W.pick) W.pick.value = W.id; face.innerHTML = "";
      if (global.FaithfulPanel) FaithfulPanel.load(GP.GUITARS[W.id].panel || "gt-" + W.id).then(function () { M = FaithfulPanel.mount(face, { id: GP.GUITARS[W.id].panel || "gt-" + W.id, adapter: A }); W.face = M; }).catch(function () { face.textContent = "(panel drawing failed to load)"; });
      W.draw();
    }
    W.set = function (k, v) { var s = Object.assign({}, W.st); s[k] = v; W.st = GP.clean(W.id, s); W._notify(); W.draw(); if (o.onChange) o.onChange(W); };
    W.setAll = function (s) { W.st = GP.clean(W.id, Object.assign({}, W.st, s)); W._notify(); W.draw(); if (o.onChange) o.onChange(W); };
    W.setGuitar = function (id, st) { W.id = id; W.st = GP.clean(id, st || {}); build(); if (o.onChange) o.onChange(W); };
    W.play = function (kind) { return GP.play(W.id, W.st, kind || "riff", { amp: PREFS.amp, source: PREFS.source, hum: PREFS.hum, pluck: PREFS.pluck }); };
    W.draw = function () {   // the harmonics of the open A string at the output, and the circuit's response
      var fA = GP.GUITARS[W.id].family === "bass" ? 55 : 110;
      var r = GP.response(W.id, W.st, fA, { pluck: PREFS.pluck, fmax: 8000 }), ref = 0; r.forEach(function (m) { ref = Math.max(ref, m.amp); });
      var Wd = 560, Ht = 150, X = function (f) { return 30 + (Wd - 40) * Math.log(f / 80) / Math.log(8000 / 80); }, Y = function (db) { return 10 + (Ht - 30) * Math.min(1, -db / 50); };
      var s = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" class="gtp-svg" role="img" aria-label="Harmonics of the open A string at the output"><rect x="0" y="0" width="' + Wd + '" height="' + Ht + '" class="gtp-bg"/>';
      [100, 200, 500, 1000, 2000, 5000].forEach(function (f) { s += '<line x1="' + X(f) + '" x2="' + X(f) + '" y1="10" y2="' + (Ht - 20) + '" class="gtp-grid"/><text x="' + X(f) + '" y="' + (Ht - 6) + '" text-anchor="middle">' + (f >= 1000 ? f / 1000 + "k" : f) + '</text>'; });
      r.forEach(function (m) { var db = 20 * Math.log10(m.amp / ref + 1e-6); s += '<line x1="' + X(m.f).toFixed(1) + '" x2="' + X(m.f).toFixed(1) + '" y1="' + (Ht - 20) + '" y2="' + Y(db).toFixed(1) + '" class="gtp-h"/>'; });
      var fs = []; for (var f = 80; f <= 8000; f *= 1.05) fs.push(f); var e = GP.electrical(W.id, W.st, fs), e0 = Math.max.apply(null, e), d = "";
      fs.forEach(function (f, i) { d += (i ? "L" : "M") + X(f).toFixed(1) + " " + Y(20 * Math.log10(e[i] / e0) - 0).toFixed(1); });
      s += '<path d="' + d + '" class="gtp-e"/><text x="34" y="20" class="gtp-k">bars: harmonics of the open A at the jack · line: the circuit alone (pickup + pots + cable)</text></svg>';
      plot.innerHTML = s;
      var rz = GP.resonance(W.id, W.st), hm = GP.hum(W.id, W.st);
      info.textContent = GP.summary(W.id, W.st) + ". Circuit peak " + Math.round(rz.f / 10) * 10 + " Hz (" + (rz.peakDb > 0 ? "+" : "") + rz.peakDb.toFixed(1) + " dB); brightness " + Math.round(GP.centroid(W.id, W.st, fA)) + " Hz; hum " + (hm < 0.1 ? "cancelled" : Math.round(hm * 100) + " % of one single coil") + ".";
    };
    build(); return W;
  };

  // ---------- compare: two widgets and a translation ----------
  GP.compare = function (el, o) {
    o = o || {}; var IDL = o.ids || GP.IDS; el.innerHTML = ""; var cols = h("div", "gtc-cols"); el.appendChild(cols);
    var a = h("div", "gtc-a"), b = h("div", "gtc-b"); cols.appendChild(a); cols.appendChild(b);
    var q = new URLSearchParams(location.search), ia = q.get("a") || el.dataset.a || IDL[0], ib = q.get("b") || el.dataset.b || IDL[1];
    if (IDL.indexOf(ia) < 0) ia = IDL[0]; if (IDL.indexOf(ib) < 0) ib = IDL[1];
    var box = h("div", "gtc-tr"), go = h("button", "gtc-go", "Translate left → right"), back = h("button", "gtc-back", "Translate right → left"), res = h("div", "gtc-res");
    go.type = back.type = "button"; box.appendChild(go); box.appendChild(back); box.appendChild(res);
    var WA = GP.mount(a, { guitar: ia, choose: true, ids: IDL }), WB = GP.mount(b, { guitar: ib, choose: true, ids: IDL });
    cols.parentNode.insertBefore(box, cols.nextSibling);
    function run(F, T) { var r = GP.translate(F.id, F.st, T.id); T.setAll(r.state); T.st = GP.clean(T.id, r.state); T._notify(); T.draw();
      res.innerHTML = ""; var p = h("p"); p.innerHTML = "<b>" + GP.summary(F.id, F.st) + "</b> → <b>" + GP.summary(T.id, r.state) + "</b> <span class=\"gtc-q gtc-" + r.quality + "\">" + r.quality + "</span> (" + r.dist.toFixed(1) + " dB apart on average)"; res.appendChild(p);
      if (r.notes.length) { var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); }
      el.dataset.quality = r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); };
    el._gtc = { a: WA, b: WB, run: run }; return el._gtc;
  };

  // ---------- intro pages: tour steps, quiz, tracks ----------
  function steps(px) { var n = 0; document.querySelectorAll("." + px + "-step").forEach(function (s) { n++; var b = h("button", px === "gt" ? "gt-hear" : px + "-hear gt-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = GP.widgets.filter(function (w) { return w.id === (s.dataset.guitar || s.dataset.bass || w.id); })[0] || GP.widgets[0]; if (!W) return;
        var set = s.dataset.set ? JSON.parse(s.dataset.set) : {}; W.st = GP.clean(W.id, Object.assign(GP.defaults(W.id), set)); W._notify(); W.draw(); W.play(s.dataset.play || "riff"); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".gt-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("gt-right", "gt-wrong"); }); li.classList.add(i === a ? "gt-right" : "gt-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TRACKS = {}; GP.tracks = function (url) { url = url || "/apps/shared/data/guitars/tracks.json"; if (!TRACKS[url]) TRACKS[url] = fetch(url).then(function (r) { return r.json(); }); return TRACKS[url]; };
  function tracks(el, url) { GP.tracks(url).then(function (d) { var want = el.dataset.guitar || el.dataset.bass, list = d.tracks.filter(function (t) { return (t.guitar || t.bass) === want; }), ul = h("ul", "gt-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); li.appendChild(document.createTextNode(" ↗ (" + t.channel + "). "));
        li.appendChild(h("span", "gt-who", t.player + (t.instrument ? " on " + t.instrument : "") + (t.instrumentSrc ? " (" + t.instrumentSrc + ")." : " (instrument unverified)."))); li.appendChild(document.createTextNode(" "));
        var s = h("span", "gt-set", "Setting: " + t.setting + (t.settingSrc ? " (" + t.settingSrc + ")" : " (unverified: no source found)") + ". ");
        li.appendChild(s); if (t.state) { var b = h("button", "gt-try", "Try it"); b.type = "button"; b.onclick = function () { var W = GP.widgets.filter(function (w) { return w.id === want; })[0]; if (W) { W.setAll(t.state); W.play(t.play || "riff"); } }; li.appendChild(b); }
        ul.appendChild(li); }); el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  GP.init = function (o) { o = o || {}; var px = o.prefix || "gt", at = px === "gt" ? "guitar" : "bass";
    document.querySelectorAll("." + px + "p[data-" + at + "]").forEach(function (e) { GP.mount(e, { guitar: e.dataset[at], ids: o.ids }); });
    document.querySelectorAll("." + px + "c").forEach(function (e) { GP.compare(e, { ids: o.ids }); });
    steps(px); document.querySelectorAll("." + px + "-q").forEach(quiz); document.querySelectorAll("." + px + "-tracks").forEach(function (e) { tracks(e, o.tracks); });
  };
  function init() { GP.init(); }
  global.GuitarPickups = GP;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
