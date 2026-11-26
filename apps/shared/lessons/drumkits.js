// DrumKits: snare drums, drum kits and cymbals the way the site does mics, amps and pedals. A physical / modal model of each (pure
// maths, runs in node: tests/lessons/drumkits.test.js), a faithful drawing of each (FaithfulPanel host adapter, panels/dk-<id>.js
// for snares and kits, panels/cy-<id>.js for cymbals; drum heads and cymbals are clicked to strike them), A/B of two, and
// translation of a tuning / setting between two (exact / approx / lost).
// Pages: lessons/drum-kit-compare.qmd, lessons/cymbal-compare.qmd, lessons/intro-<slug>.qmd (scripts/intro-instruments/drumkits.py).
//
// THE MODEL: a drum (snare, tom, kick)
//   head modes  an ideal circular membrane fixed at the rim vibrates in modes (m, n) at f_mn = alpha_mn / alpha_01 * f_01, alpha_mn
//          the n-th zero of the Bessel function J_m (Wikipedia, "Vibrations of a circular membrane"; the zeros are standard values).
//          A real drum's air (shell and the second head) pulls the upper modes closer to the fundamental (Fletcher & Rossing, The
//          Physics of Musical Instruments, ch. 18, as summarised, not read here): ratio^0.92 here, the exponent the site's.
//   pitch  f_01 = base(kind) * (14 / diameter) * 2^(span * (tension - 0.5)) * depth factor. 1 / diameter is the membrane law (same
//          tension, same head); the bases are the site's, set so a 14" snare batter spans about 160-420 Hz (Wikipedia, "Drum tuning":
//          a 14" snare's batter is tuned 220-349 Hz, its resonant head 330-391 Hz, most often a fifth above). Deeper shell: a little
//          lower (site's, 1.5 % an inch).
//   strike position  a stroke at radius r excites mode (m, n) in proportion to |J_m(alpha_mn r / a)| (the mode shape): the centre
//          sounds only the m = 0 modes, the edge many more (that is why edge strokes ring and overtone). Centre r = 0.08, edge 0.72,
//          rimshot = head near the centre + the rim at once, cross-stick = the rim alone with the stick lying on the head (site's).
//          The stick's contact time low-passes the stroke (corner 3 kHz, higher for rimshots and harder strokes: site's).
//   resonant head  a second (0,1) partial at the resonant head's pitch (Reso, semitones above the batter; default a fifth).
//   heads  coated single-ply, clear single-ply, coated two-ply, calf-style: decay time and brightness factors (site's).
//   shell  material adds a few shell partials (metal shells ring: brass longest, then aluminium and steel; wood short and warm),
//          and scales the brightness. Every number here is the site's: the claim that brass rings and wood is warmer is common
//          drummer lore, not measured here.
//   snare wires  on (throw-off engaged): band-passed noise (1.5-9 kHz) whose loudness follows the stroke, longer when the strainer
//          is loose, quieter and tighter when tight (Wikipedia, "Snare drum": the snares rattle against the bottom head; a lever on
//          the strainer throws them off). Off: the drum sounds like a tom (Wikipedia). Levels and times: site's.
//   muffling  shortens every mode's decay and takes off upper modes (0 = open, 1 = a towel / pillow; Wikipedia, "Drum kit": muffles
//          deaden ring and overtones). Kick port: a hole in the front head (Wikipedia, "Drum tuning": about 6", less "round"): here
//          a shorter boom and more beater click (site's amounts).
// THE MODEL: a cymbal
//   partials  ~70 inharmonic partials f_k = f0 (k+1)^1.4 (seeded jitter), f0 ∝ 1 / size (site's law and constants): long, dense,
//          inharmonic. Loudness per partial (f / 1 kHz)^-tilt with a seeded scatter: tilt and scatter set by the series.
//          Zildjian K (hand-hammered, "dark"): steep tilt + large scatter; Zildjian A: middle; Paiste 2002 (B8 "2002 bronze",
//          Wikipedia "Paiste"): shallow tilt (bright). The dark / bright reputations are the brands' and drummers' words; the
//          numbers are the site's. Alloys: bell bronze for A and K (Wikipedia, "Cymbal"; Zildjian's exact recipe is secret,
//          Wikipedia "Zildjian"), 8 % tin B8 for the 2002 (Wikipedia, "Paiste", "Cymbal").
//   decay  T_k = Tb (1 kHz / f)^0.45, Tb by type, size and weight (bigger and heavier: longer; Wikipedia, "Cymbal": larger cymbals
//          louder with longer sustain; heavier louder, more cut). Strike: bow (ping, fewer high partials), edge (wash and a "bloom":
//          high partials rising a few ms late, energy moving up), bell (a few strong, longer partials). Wash = filtered noise.
//   hi-hats  two 14" cymbals: closed (very short), half, open (long), foot (the "chick", no stick) (Wikipedia, "Hi-hat").
//   china  trashy: the output amplitude-modulated by slow noise; splash  small and short (Wikipedia, "China cymbal", "Splash cymbal").
//   Not modelled: the real nonlinear mode coupling of cymbals, the shell's own modes in detail, head-to-head coupling of toms,
//   sympathetic snare buzz from other drums, stick type. Nobody has compared any of this with the real instruments.
//
// API
//   DrumKits.ITEMS[id] { cat: "snare"|"kit"|"cymbal", name, short, maker, ... }   .IDS  .CATS { snare: [ids], kit, cymbal }
//   .defaults(id) / .clean(id, st)   snare st { tension, reso, head, wires, wireTension, muffle }
//      kit st { kick: {tension, muffle, port}, snare: {...}, tom1: {...}, floor: {...}, hats: {pedal} }   cymbal st { choke, pedal }
//   .pitch(spec, ds) -> f01 Hz   .modes(spec, ds, strike) -> [{f, a, T}]   .drumRender(spec, ds, strike, sr, o) -> Float32Array
//   .cymRender(spec, cs, strike, sr, o) -> Float32Array   .hit(id, st, part, strike, sr) -> Float32Array (part: kick snare tom1 floor
//      hats ride crash, or the item itself)   .centroid(x, sr) -> Hz   .noiseShare(x, sr) -> share of energy above 3 kHz
//   .translate(fromId, st, toId) -> { state, quality "exact"|"approx"|"lost", notes }
//   Browser: .adapter(W), .mount(el, {item, choose}), .compare(el), .play(W, part, strike), .groove(W)
//   Markup: <div class="dk" data-item="supraphonic"></div>  <div class="dkc" data-cat="snare" data-a="supraphonic" data-b="maple"></div>
//     <div class="dk-step" data-item="supraphonic" data-set='{"wires":false}' data-hit="snare:centre">text</div>
//     <div class="dk-q" data-a="1">...</div>  <div class="dk-tracks" data-item="supraphonic"></div>
(function (global) {
  var M = {}, TAU = 2 * Math.PI;
  // Bessel zeros alpha_mn (m, n): standard values
  var ZEROS = [[0, 1, 2.4048], [1, 1, 3.8317], [2, 1, 5.1356], [0, 2, 5.5201], [3, 1, 6.3802], [1, 2, 7.0156], [4, 1, 7.5883], [2, 2, 8.4172], [0, 3, 8.6537], [5, 1, 8.7715], [3, 2, 9.7610], [6, 1, 9.9361], [1, 3, 10.1735], [4, 2, 11.0647], [7, 1, 11.0864], [2, 3, 11.6198], [0, 4, 11.7915]];
  M.ZEROS = ZEROS;
  M.J = function (m, x) { var s = 0, t = Math.pow(x / 2, m), f = 1; for (var i = 1; i <= m; i++) f *= i; t /= f; for (var k = 0; k < 40; k++) { s += t; t *= -(x * x / 4) / ((k + 1) * (k + 1 + m)); } return s; };
  M.HEADS = { coated1: { name: "Coated, single-ply", T: 1, br: 0.9 }, clear1: { name: "Clear, single-ply", T: 1.25, br: 1.15 }, coated2: { name: "Coated, two-ply", T: 0.55, br: 0.75 }, calf: { name: "Calf-style", T: 0.4, br: 0.65 } };
  M.SHELLS = { aluminium: { name: "Aluminium", ring: [1350, 3100], T: 0.35, a: 0.035, br: 1.05 }, brass: { name: "Brass", ring: [1150, 2650, 4300], T: 0.6, a: 0.055, br: 1.1 },
    steel: { name: "Steel", ring: [1600, 3600], T: 0.3, a: 0.03, br: 1.1 }, maple: { name: "Maple", ring: [700], T: 0.08, a: 0.02, br: 0.88 }, birch: { name: "Birch", ring: [820], T: 0.09, a: 0.02, br: 1.0 },
    mahogany: { name: "Mahogany", ring: [560], T: 0.07, a: 0.02, br: 0.75 }, acrylic: { name: "Acrylic", ring: [900, 2100], T: 0.15, a: 0.03, br: 1.15 } };
  M.STRIKES = { centre: { r: 0.08, head: 1, click: 0, fc: 3000 }, edge: { r: 0.72, head: 0.85, click: 0, fc: 3200 }, rim: { r: 0.25, head: 1.25, click: 0.6, fc: 6000 }, cross: { r: 0.95, head: 0.22, click: 1, fc: 2500 } };
  var KIND = { snare: { base: 260, span: 1.4, T: 0.6 }, tom: { base: 120, span: 1.2, T: 0.9 }, kick: { base: 94, span: 1.0, T: 1.0 } };
  function drum(kind, d, depth, shell, o) { return Object.assign({ kind: kind, d: d, depth: depth, shell: shell }, o || {}); }
  var DS = function (o) { return Object.assign({ tension: 0.5, reso: 7, head: "coated1", wires: true, wireTension: 0.5, muffle: 0, port: false }, o || {}); };
  M.ITEMS = {
    supraphonic: { cat: "snare", name: "Ludwig Supraphonic", short: "Supraphonic", maker: "Ludwig", year: "1960s", drum: drum("snare", 14, 6.5, "aluminium", { lugs: 10, finish: "#c9ccd0", hoop: "triple-flanged" }), st: DS({ tension: 0.55 }),
      about: "Seamless aluminium shell (Ludwig's \"Ludalloy\"), chrome-plated; 14 x 6.5 here (also made 14 x 5)" },
    blackbeauty: { cat: "snare", name: "Ludwig Black Beauty", short: "Black Beauty", maker: "Ludwig", year: "1920s (reissued)", drum: drum("snare", 14, 5, "brass", { lugs: 10, finish: "#24262a", hoop: "triple-flanged", engraved: true }), st: DS({ tension: 0.5 }),
      about: "Brass shell plated black nickel, sometimes engraved; 14 x 5 here" },
    maple: { cat: "snare", name: "Maple wood snare", short: "Maple", maker: "(DW Collector's / Gretsch style)", year: "", drum: drum("snare", 14, 5.5, "maple", { lugs: 10, finish: "#c8955a", hoop: "die-cast" }), st: DS({ tension: 0.45 }),
      about: "A ply maple shell, 14 x 5.5: the warm wood snare" },
    piccolo: { cat: "snare", name: "Piccolo snare", short: "Piccolo", maker: "(generic)", year: "", drum: drum("snare", 13, 3, "steel", { lugs: 8, finish: "#d6d9dd", hoop: "triple-flanged" }), st: DS({ tension: 0.78, reso: 5 }),
      about: "13 x 3 steel shell: shallow, high, \"pop\" (Wikipedia, \"Snare drum\": piccolo snares 13-14\" across, about 4\" or less deep, higher)" },
    jazz: { cat: "kit", name: "Jazz kit (18 / 12 / 14)", short: "Jazz kit", maker: "(Gretsch round-badge style)", year: "1950s-60s style", finish: "#6b3a2a",
      drums: { kick: drum("kick", 18, 14, "maple"), snare: drum("snare", 14, 5.5, "maple", { lugs: 8 }), tom1: drum("tom", 12, 8, "maple"), floor: drum("tom", 14, 14, "maple") },
      cym: { hats: "hats", ride: "kride", crash: "acrash" },
      st: { kick: DS({ tension: 0.8, reso: 2, wires: false }), snare: DS({ tension: 0.6, head: "coated1" }), tom1: DS({ tension: 0.75, reso: 3, wires: false }), floor: DS({ tension: 0.7, reso: 3, wires: false }), hats: { pedal: "closed" } } },
    rock: { cat: "kit", name: "Rock kit (22 / 12 / 16)", short: "Rock kit", maker: "(Ludwig Vistalite / Classic style)", year: "1970s style", finish: "#d98a2b",
      drums: { kick: drum("kick", 22, 16, "acrylic"), snare: drum("snare", 14, 6.5, "aluminium", { lugs: 10 }), tom1: drum("tom", 12, 8, "acrylic"), floor: drum("tom", 16, 16, "acrylic") },
      cym: { hats: "hats", ride: "aride", crash: "p2002" },
      st: { kick: DS({ tension: 0.35, reso: 0, wires: false, muffle: 0.25 }), snare: DS({ tension: 0.45 }), tom1: DS({ tension: 0.45, reso: 2, wires: false, head: "clear1" }), floor: DS({ tension: 0.4, reso: 2, wires: false, head: "clear1" }), hats: { pedal: "closed" } } },
    funk: { cat: "kit", name: "Funk / studio \"dead\" kit (20 / 12 / 14)", short: "Dead kit", maker: "(1970s studio style)", year: "1970s style", finish: "#3b3f45",
      drums: { kick: drum("kick", 20, 14, "mahogany"), snare: drum("snare", 14, 5, "mahogany", { lugs: 10 }), tom1: drum("tom", 12, 8, "mahogany"), floor: drum("tom", 14, 14, "mahogany") },
      cym: { hats: "hats", ride: "aride", crash: "acrash" },
      st: { kick: DS({ tension: 0.4, reso: 0, wires: false, muffle: 0.8, port: true, head: "coated2" }), snare: DS({ tension: 0.4, head: "calf", muffle: 0.7, wireTension: 0.6 }), tom1: DS({ tension: 0.45, reso: 0, wires: false, muffle: 0.7, head: "calf" }), floor: DS({ tension: 0.4, reso: 0, wires: false, muffle: 0.7, head: "calf" }), hats: { pedal: "closed" } } },
    aride: { cat: "cymbal", name: "Zildjian A 20\" ride", short: "A ride", maker: "Zildjian", series: "A", type: "ride", size: 20, weight: 1.05, finish: "#d8b45a" },
    kride: { cat: "cymbal", name: "Zildjian K 20\" ride", short: "K ride", maker: "Zildjian", series: "K", type: "ride", size: 20, weight: 0.9, finish: "#b08a3e", hammer: true },
    p2002: { cat: "cymbal", name: "Paiste 2002 18\" crash", short: "2002 crash", maker: "Paiste", series: "2002", type: "crash", size: 18, weight: 0.95, finish: "#e6c46a" },
    acrash: { cat: "cymbal", name: "Zildjian A 16\" crash", short: "A crash", maker: "Zildjian", series: "A", type: "crash", size: 16, weight: 0.85, finish: "#d8b45a" },
    hats: { cat: "cymbal", name: "14\" hi-hats (A)", short: "Hi-hats", maker: "Zildjian", series: "A", type: "hats", size: 14, weight: 1.1, finish: "#d8b45a" },
    china: { cat: "cymbal", name: "18\" china", short: "China", maker: "(generic)", series: "china", type: "china", size: 18, weight: 0.9, finish: "#c79a45" },
    splash: { cat: "cymbal", name: "10\" splash", short: "Splash", maker: "(generic)", series: "A", type: "splash", size: 10, weight: 0.8, finish: "#d8b45a" }
  };
  M.IDS = Object.keys(M.ITEMS);
  M.CATS = { snare: [], kit: [], cymbal: [] }; M.IDS.forEach(function (id) { M.CATS[M.ITEMS[id].cat].push(id); });
  M.SERIES = { A: { name: "Zildjian A (bell bronze, lathed)", tilt: 0.75, scatter: 2, wash: 0.25, T: 1 }, K: { name: "Zildjian K (bell bronze, hand-hammered, dark)", tilt: 1.15, scatter: 6, wash: 0.42, T: 0.9 },
    "2002": { name: "Paiste 2002 (B8 \"2002 bronze\", bright)", tilt: 0.4, scatter: 1.5, wash: 0.2, T: 1.05 }, china: { name: "China type", tilt: 0.7, scatter: 5, wash: 0.6, T: 0.6 } };
  M.TYPES = { ride: { T: 5, f0: 1 }, crash: { T: 2.6, f0: 1 }, splash: { T: 1, f0: 1 }, china: { T: 1.6, f0: 1 }, hats: { T: 1.6, f0: 1.15 } };
  M.PEDAL = { closed: { T: 0.06, a: 0.8 }, half: { T: 0.4, a: 0.9 }, open: { T: 1.5, a: 1 }, foot: { T: 0.035, a: 0.35 } };
  M.PARTS = ["kick", "snare", "tom1", "floor"];

  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function cleanDrum(s, kind) { s = DS(s); s.tension = cl(+s.tension, 0, 1); s.reso = cl(Math.round(+s.reso), -5, 12); s.muffle = cl(+s.muffle, 0, 1); s.wireTension = cl(+s.wireTension, 0, 1);
    if (!M.HEADS[s.head]) s.head = "coated1"; s.wires = kind === "snare" ? !!s.wires : false; s.port = kind === "kick" ? !!s.port : false; return s; }
  M.defaults = function (id) { return JSON.parse(JSON.stringify(M.ITEMS[id].st || { choke: false, pedal: "closed" })); };
  M.clean = function (id, st) { var I = M.ITEMS[id], d = M.defaults(id); st = st || {};
    if (I.cat === "snare") return cleanDrum(Object.assign(d, st), "snare");
    if (I.cat === "kit") { M.PARTS.forEach(function (p) { d[p] = cleanDrum(Object.assign(d[p], st[p] || {}), I.drums[p].kind); }); d.hats = { pedal: M.PEDAL[(st.hats || {}).pedal] ? st.hats.pedal : d.hats.pedal }; return d; }
    var c = Object.assign(d, st); c.choke = !!c.choke; if (!M.PEDAL[c.pedal]) c.pedal = "closed"; return c; };

  // ---------- drums ----------
  M.pitch = function (spec, ds) { var K = KIND[spec.kind]; return K.base * (14 / spec.d) * Math.pow(2, K.span * (cl(ds.tension, 0, 1) - 0.5)) * (1 - 0.015 * (spec.depth - 5.5) * (spec.kind === "snare" ? 1 : 0.3)); };
  M.tensionFor = function (spec, f) { var K = KIND[spec.kind], f1 = M.pitch(spec, { tension: 0.5 }); return 0.5 + Math.log2(f / f1) / K.span; };
  M.modes = function (spec, ds, strike) { ds = cleanDrum(ds, spec.kind); var S = M.STRIKES[strike] || M.STRIKES.centre, H = M.HEADS[ds.head], sh = M.SHELLS[spec.shell], K = KIND[spec.kind];
    var f01 = M.pitch(spec, ds), T0 = K.T * H.T * (spec.d / 14) * (1 - 0.85 * ds.muffle) * (ds.wires ? 0.8 : 1) * (ds.port ? 0.55 : 1), out = [], fc = S.fc * H.br * sh.br * (spec.kind === "kick" ? 0.7 : 1);
    ZEROS.forEach(function (z, i) { var ratio = Math.pow(z[2] / 2.4048, 0.92), f = f01 * ratio, sh0 = Math.abs(M.J(z[0], z[2] * S.r));
      var a = S.head * sh0 / (1 + Math.pow(f / fc, 2)) * (i ? (1 - 0.5 * ds.muffle) : 1) / Math.sqrt(1 + i * 0.3);
      if (a > 1e-4) out.push({ f: f, a: a, T: T0 * Math.pow(f01 / f, 0.7), m: z[0], n: z[1] }); });
    if (spec.kind !== "kick" || !ds.port) out.push({ f: f01 * Math.pow(2, ds.reso / 12), a: 0.35 * S.head * (1 - 0.5 * ds.muffle) * Math.abs(M.J(0, 2.4048 * S.r)), T: T0 * 0.9, reso: true });
    var dd = Math.sqrt(5.5 / spec.depth); sh.ring.forEach(function (fr, j) { out.push({ f: fr * dd, a: sh.a * (S.head + S.click) / (j + 1), T: sh.T * (1 - 0.5 * ds.muffle), shell: true }); });
    return out; };
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function addSine(y, sr, f, a, T, ph, t0) { if (f >= sr * 0.48 || a <= 0) return; var w = TAU * f / sr, d = Math.exp(-6.9078 / (T * sr)), c = Math.cos(w), s = Math.sin(w), x = Math.sin(ph || 0) * a, z = Math.cos(ph || 0) * a, n0 = Math.round((t0 || 0) * sr);
    for (var n = n0; n < y.length; n++) { var x2 = x * c + z * s, z2 = z * c - x * s; x = x2 * d; z = z2 * d; y[n] += x; if (Math.abs(x) + Math.abs(z) < 1e-6) break; } }
  M.drumRender = function (spec, ds, strike, sr, o) { o = o || {}; ds = cleanDrum(ds, spec.kind); var S = M.STRIKES[strike] || M.STRIKES.centre, vel = o.vel == null ? 0.8 : o.vel, dur = o.dur || 1.4;
    var y = new Float32Array(Math.round(sr * dur)), md = M.modes(spec, ds, strike), r = rng(hash(spec.kind + spec.d + strike)), env = new Float32Array(y.length);
    md.forEach(function (m) { addSine(y, sr, m.f, m.a * vel, m.T, 0); });
    // stroke envelope (for the wires): the low modes' decay
    var Tlow = md[0] ? md[0].T : 0.3; for (var i = 0; i < y.length; i++) env[i] = Math.exp(-i / sr * 6.9 / Tlow);
    if (S.click || spec.kind === "kick") { var ca = spec.kind === "kick" ? 0.35 * (ds.port ? 1.4 : 1) * (1 - 0.3 * ds.muffle) : S.click * 0.5, lp = 0, n1 = Math.round(sr * 0.006);
      for (var c = 0; c < n1 && c < y.length; c++) { var nv = r(); lp += 0.5 * (nv - lp); y[c] += ca * vel * (nv - lp) * (1 - c / n1); }
      if (spec.kind !== "kick") [1100, 2900, 4700].forEach(function (f, j) { addSine(y, sr, f * (spec.shell === "maple" || spec.shell === "mahogany" ? 0.8 : 1), S.click * 0.08 * vel / (j + 1), 0.03, 0); }); }
    if (ds.wires) { var wa = 0.45 * (1 - 0.45 * ds.wireTension) * vel * (strike === "cross" ? 0.35 : 1) * (1 - 0.4 * ds.muffle), tw = 0.1 + 0.28 * (1 - ds.wireTension), hp = 0, lp2 = 0, prev = 0;
      var ah = Math.exp(-TAU * 1500 / sr), al = 1 - Math.exp(-TAU * 9000 / sr);
      for (var k = 0; k < y.length; k++) { var t = k / sr, nz = r(); hp = ah * (hp + nz - prev); prev = nz; lp2 += al * (hp - lp2); y[k] += wa * lp2 * Math.min(1, t / 0.002) * Math.exp(-t / tw) * (0.4 + 0.6 * env[k]); } }
    if (dur > 0.3) { var fo = Math.round(sr * 0.08); for (var q = 0; q < fo; q++) y[y.length - 1 - q] *= q / fo; }
    for (var g = 0; g < y.length; g++) y[g] *= 0.35;   // level against the cymbals (site's)
    return y; };

  // ---------- cymbals ----------
  M.cymPartials = function (spec, cs, strike) { cs = cs || {}; var Se = M.SERIES[spec.series], Ty = M.TYPES[spec.type], r = rng(hash(spec.series + spec.type + spec.size + (spec.hammer ? "h" : ""))), out = [];
    var f0 = 45 * (16 / spec.size) * spec.weight * Ty.f0, Tb = Ty.T * (spec.size / 18) * Math.sqrt(spec.weight) * Se.T, ped = spec.type === "hats" ? M.PEDAL[cs.pedal || "closed"] : null;
    if (ped) Tb = ped.T;
    for (var k = 0; k < 70; k++) { var f = f0 * Math.pow(k + 1, 1.4) * (1 + 0.04 * r()), sc = Math.pow(10, Se.scatter * r() / 20), a = Math.pow(f / 1000, -Se.tilt) * sc * Math.pow(f / (f + 300), 2);
      if (strike === "bow") a /= 1 + Math.pow(f / 9000, 2); if (strike === "bell") a *= 0.3; if (strike === "edge") a *= 1.3;
      if (ped && cs.pedal === "foot") a /= 1 + Math.pow(f / 2500, 2);
      if (ped && cs.pedal === "closed") a *= f / (f + 3000);
      out.push({ f: f, a: a * 0.05, T: Tb * Math.pow(1000 / f, 0.45), on: strike === "edge" || spec.type === "crash" || spec.type === "splash" || spec.type === "china" ? 0.004 + 0.04 * f / 12000 : 0.001 }); }
    if (strike === "bell" && spec.type !== "hats") { var fb = 700 * spec.weight * Math.sqrt(20 / spec.size); [1, 2.32, 3.81, 5.37, 7.1].forEach(function (m, j) { out.push({ f: fb * m, a: 0.2 / (j + 1), T: Tb * 0.8 / Math.sqrt(m), on: 0.001, bell: true }); }); }
    return out; };
  M.cymRender = function (spec, cs, strike, sr, o) { o = o || {}; cs = cs || {}; strike = strike || (spec.type === "crash" || spec.type === "splash" || spec.type === "china" ? "edge" : "bow");
    var Se = M.SERIES[spec.series], vel = o.vel == null ? 0.8 : o.vel, ps = M.cymPartials(spec, cs, strike), Tmax = ps.reduce(function (m, p) { return Math.max(m, p.T); }, 0.05);
    var dur = o.dur || Math.min(4, Math.max(0.4, Tmax * 0.8)), y = new Float32Array(Math.round(sr * dur)), r = rng(hash(spec.type + spec.size + "w"));
    ps.forEach(function (p, i) { if (p.f >= sr * 0.47) return; var w = TAU * p.f / sr, d = Math.exp(-6.9078 / (p.T * sr)), ph = (i * 2.399) % TAU, g = p.a * vel, att = p.on * sr;
      for (var n = 0, e = 1; n < y.length; n++, e *= d) { var a = g * e * (att > 1 ? 1 - Math.exp(-n / att) : 1); if (a < 1e-6 && n > att * 3) break; y[n] += a * Math.sin(w * n + ph); } });
    var Tw = (ps[20] ? ps[20].T : 0.2) * 0.4, wash = Se.wash * (strike === "edge" ? 1.5 : strike === "bell" ? 0.3 : 0.8) * vel * (cs.pedal === "foot" ? 0.4 : 1), lp = 0, hp = 0, pv = 0, ah = Math.exp(-TAU * 2500 / sr), al = 1 - Math.exp(-TAU * Math.min(sr * 0.45, 12000 / Se.tilt) / sr);
    for (var k = 0; k < y.length; k++) { var nz = r(); hp = ah * (hp + nz - pv); pv = nz; lp += al * (hp - lp); y[k] += 0.08 * wash * lp * Math.exp(-k / sr / Tw); }
    if (spec.type === "china") { var m = 0; for (var q = 0; q < y.length; q++) { m += 0.004 * (r() - m); y[q] *= 1 + 6 * m; } }
    if (cs.choke) { var c0 = Math.round(sr * 0.2); for (var u = c0; u < y.length; u++) y[u] *= Math.exp(-(u - c0) / sr / 0.04); }
    if (spec.type === "hats") { var hg = { closed: 8, foot: 6, half: 2.5, open: 1.5 }[cs.pedal || "closed"]; for (var hq = 0; hq < y.length; hq++) y[hq] *= hg; }   // site's levels
    var fo = Math.min(y.length - 1, Math.round(sr * 0.25)); for (var v = 0; v < fo; v++) y[y.length - 1 - v] *= v / fo;
    return y; };

  M.hit = function (id, st, part, strike, sr) { var I = M.ITEMS[id]; st = M.clean(id, st);
    if (I.cat === "snare") return M.drumRender(I.drum, st, strike || "centre", sr);
    if (I.cat === "cymbal") return M.cymRender(I, st, strike, sr);
    if (I.drums[part]) return M.drumRender(I.drums[part], st[part], strike || "centre", sr);
    var cid = I.cym[part]; if (!cid) return new Float32Array(1);
    return M.cymRender(M.ITEMS[cid], part === "hats" ? st.hats : {}, strike, sr); };

  // ---------- analysis ----------
  function fft(re, im) { var n = re.length; for (var i = 1, j = 0; i < n; i++) { var b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (var len = 2; len <= n; len <<= 1) { var a = -TAU / len, wr = Math.cos(a), wi = Math.sin(a); for (var s = 0; s < n; s += len) { var cr = 1, ci = 0; for (var k = 0; k < len / 2; k++) { var p = s + k, q = p + len / 2, xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr; re[q] = re[p] - xr; im[q] = im[p] - xi; re[p] += xr; im[p] += xi; var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } }
  M.spectrum = function (x, sr, upto) { var N = 2048, mag = new Float64Array(N / 2), end = Math.min(x.length, Math.round((upto || 1) * sr)), frames = 0;
    for (var s = 0; s + N <= end; s += N / 2) { var re = new Float64Array(N), im = new Float64Array(N); for (var i = 0; i < N; i++) re[i] = x[s + i] * (0.5 - 0.5 * Math.cos(TAU * i / N)); fft(re, im); for (var k = 0; k < N / 2; k++) mag[k] += Math.hypot(re[k], im[k]); frames++; }
    return { mag: mag, df: sr / N, frames: frames }; };
  M.centroid = function (x, sr) { var S = M.spectrum(x, sr), a = 0, b = 0; for (var k = 1; k < S.mag.length; k++) { a += k * S.df * S.mag[k]; b += S.mag[k]; } return b ? a / b : 0; };
  M.noiseShare = function (x, sr) { var S = M.spectrum(x, sr, 0.5), a = 0, b = 0; for (var k = 1; k < S.mag.length; k++) { var e = S.mag[k] * S.mag[k]; b += e; if (k * S.df > 3000) a += e; } return b ? a / b : 0; };
  M.brightness = function (spec, cs, strike) { var ps = M.cymPartials(spec, cs || {}, strike || "bow"), a = 0, b = 0; ps.forEach(function (p) { var e = p.a * p.a * p.T; a += p.f * e; b += e; }); return a / b; };

  // ---------- translation ----------
  function st2n(x) { return 12 * Math.log2(x); }
  function drumTo(fromSpec, ds, toSpec, notes, label) { var f = M.pitch(fromSpec, ds), t = M.tensionFor(toSpec, f), nd = Object.assign({}, cleanDrum(ds, toSpec.kind)), off = 0;
    if (t < 0 || t > 1) { var tt = cl(t, 0, 1), f2 = M.pitch(toSpec, { tension: tt }); off = Math.abs(st2n(f2 / f)); notes.push(label + ": " + Math.round(f) + " Hz is " + (t < 0 ? "below" : "above") + " the " + toSpec.d + "\"'s range; nearest " + Math.round(f2) + " Hz (" + off.toFixed(1) + " semitones off)."); t = tt; }
    nd.tension = Math.round(t * 1000) / 1000;
    if (fromSpec.shell !== toSpec.shell) notes.push(label + ": " + M.SHELLS[fromSpec.shell].name.toLowerCase() + " shell → " + M.SHELLS[toSpec.shell].name.toLowerCase() + ": " + (M.SHELLS[fromSpec.shell].T > M.SHELLS[toSpec.shell].T + 0.1 ? "the shell's ring is lost" : M.SHELLS[toSpec.shell].T > M.SHELLS[fromSpec.shell].T + 0.1 ? "more shell ring than before" : "a different shell colour") + " (approx).");
    if (fromSpec.d !== toSpec.d) notes.push(label + ": " + fromSpec.d + "\" → " + toSpec.d + "\": same pitch, but the overtones decay " + (toSpec.d > fromSpec.d ? "longer" : "shorter") + ".");
    if (Math.abs(fromSpec.depth - toSpec.depth) >= 1.5) notes.push(label + ": depth " + fromSpec.depth + "\" → " + toSpec.depth + "\" (" + (toSpec.depth < fromSpec.depth ? "less body, crisper" : "more body") + ").");
    return { ds: nd, off: off }; }
  function cymTo(from, cs, to, notes) { var A = M.ITEMS[from], B = M.ITEMS[to], ns = M.defaults(to), lost = false;
    if (A.type === "hats" && B.type !== "hats") { notes.push("Lost: the pedal (" + (cs.pedal || "closed") + " hi-hat). A " + B.short + " has no foot or closed sound."); lost = true; }
    if (B.type === "hats") { ns.pedal = A.type === "hats" ? cs.pedal : A.type === "ride" ? "closed" : "half"; if (A.type !== "hats") notes.push("A " + A.type + " → hi-hats: pedal set to " + ns.pedal + " (approx)."); }
    ns.choke = !!cs.choke;
    if (A.type !== B.type && A.type !== "hats" && B.type !== "hats") notes.push(A.type + " → " + B.type + ": " + ({ ride: "long, defined ping", crash: "a quick wash", china: "trashy", splash: "very short" })[B.type] + " now, not " + ({ ride: "a ride's ping", crash: "a crash's wash", china: "a china's trash", splash: "a splash's quick hit" })[A.type] + ".");
    var ba = M.brightness(A, cs), bb = M.brightness(B, ns), d = 100 * (bb / ba - 1);
    if (Math.abs(d) > 8) notes.push((d < 0 ? "Darker" : "Brighter") + " by " + Math.abs(d).toFixed(0) + " % (spectral centroid of the partials, as modelled): " + M.SERIES[A.series].name + " → " + M.SERIES[B.series].name + ".");
    var q = from === to ? "exact" : lost ? "lost" : A.type === B.type && Math.abs(d) < 8 && A.size === B.size ? "exact" : "approx";
    return { state: ns, quality: q }; }
  M.translate = function (from, st, to) { var A = M.ITEMS[from], B = M.ITEMS[to], notes = []; st = M.clean(from, st);
    if (from === to) return { state: JSON.parse(JSON.stringify(st)), quality: "exact", notes: [] };
    if (A.cat === "cymbal" || B.cat === "cymbal") { if (A.cat !== B.cat) return { state: M.defaults(to), quality: "lost", notes: ["A drum and a cymbal share nothing to translate."] };
      var c = cymTo(from, st, to, notes); return { state: c.state, quality: c.quality, notes: notes }; }
    var worst = 0, ns, sameShell = true;
    var pairs = A.cat === "snare" && B.cat === "snare" ? [["snare", A.drum, st, B.drum]] : A.cat === "snare" ? [["snare", A.drum, st, B.drums.snare]] : B.cat === "snare" ? [["snare", A.drums.snare, st.snare, B.drum]] : M.PARTS.map(function (p) { return [p, A.drums[p], st[p], B.drums[p]]; });
    ns = B.cat === "kit" ? M.defaults(to) : null;
    pairs.forEach(function (P) { var r = drumTo(P[1], P[2], P[3], notes, P[0] === "tom1" ? "tom" : P[0]); worst = Math.max(worst, r.off); if (P[1].shell !== P[3].shell || P[1].d !== P[3].d) sameShell = false;
      if (B.cat === "kit") ns[P[0]] = r.ds; else ns = r.ds; });
    if (A.cat === "kit" && B.cat === "kit") { ns.hats = { pedal: st.hats.pedal }; ["ride", "crash"].forEach(function (p) { if (A.cym[p] !== B.cym[p]) notes.push(p + " cymbal: " + M.ITEMS[A.cym[p]].short + " → " + M.ITEMS[B.cym[p]].short + " (see Cymbals Compared)."); }); }
    if (A.cat !== B.cat) notes.push(A.cat === "kit" ? "Only the kit's snare carries over." : "The snare goes into the kit's snare stand; the other drums keep the kit's own tuning.");
    var q = worst > 4 ? "lost" : worst > 0.5 || !sameShell || A.cat !== B.cat ? "approx" : "exact";
    notes.push("Pitch matched by the (0,1) mode" + (worst > 0.5 ? ", up to " + worst.toFixed(1) + " semitones off" : "") + "; wires, muffling, heads and port carried over where the drum has them.");
    return { state: ns, quality: q, notes: notes }; };
  M.summary = function (id, st) { var I = M.ITEMS[id]; st = M.clean(id, st);
    if (I.cat === "snare") return I.short + ", " + Math.round(M.pitch(I.drum, st)) + " Hz, wires " + (st.wires ? "on" : "off") + (st.muffle ? ", muffled " + Math.round(st.muffle * 100) + " %" : "");
    if (I.cat === "kit") return I.short + ": " + M.PARTS.map(function (p) { return (p === "tom1" ? "tom" : p) + " " + Math.round(M.pitch(I.drums[p], st[p])) + " Hz"; }).join(", ") + (st.kick.port ? ", kick ported" : "");
    return I.short + (I.type === "hats" ? ", " + st.pedal : "") + (st.choke ? ", choked" : ""); };

  // ---------- controls (FaithfulPanel adapter ranges) ----------
  function dctl(prefix, kind) { var p = prefix ? prefix + "." : "", L = [[p + "tension", "Tuning", "k", 0, 1, 0.01, 0.5], [p + "reso", "Reso (semitones)", "k", -5, 12, 1, 7], [p + "muffle", "Muffling", "k", 0, 1, 0.05, 0], [p + "head", "Head", "c", Object.keys(M.HEADS), null, null, "coated1"]];
    if (kind === "snare") L.push([p + "wires", "Snares (throw-off)", "s", false, true, null, true], [p + "wireTension", "Strainer tension", "k", 0, 1, 0.05, 0.5]);
    if (kind === "kick") L.push([p + "port", "Port", "s", false, true, null, false]); return L; }
  M.controls = function (id) { var I = M.ITEMS[id]; if (I.cat === "snare") return dctl("", "snare");
    if (I.cat === "kit") { var L = []; M.PARTS.forEach(function (p) { L = L.concat(dctl(p, I.drums[p].kind)); }); L.push(["hats.pedal", "Hi-hat pedal", "c", Object.keys(M.PEDAL), null, null, "closed"]); return L; }
    var C = [["choke", "Choke", "s", false, true, null, false]]; if (I.type === "hats") C.push(["pedal", "Pedal", "c", Object.keys(M.PEDAL), null, null, "closed"]); return C; };
  M.ctl = function (id, k) { return M.controls(id).filter(function (c) { return c[0] === k; })[0] || null; };
  function getK(st, k) { var p = k.split("."); return p.length === 2 ? (st[p[0]] || {})[p[1]] : st[k]; }
  function setK(st, k, v) { var s = JSON.parse(JSON.stringify(st)), p = k.split("."); if (p.length === 2) s[p[0]][p[1]] = v; else s[k] = v; return s; }
  M.getK = getK; M.setK = setK;

  // ---------- shared drawing helpers for the panel files ----------
  // zones: [{ part, cx, cy, r, kind: "drum"|"cymbal"|"kick", w?, h? }]: the page hit-tests clicks on them (panel units).
  M.draw = {
    head: function (cx, cy, r, lugs, finish, title, hoop) { var it = [{ t: "shape", d: circ(cx, cy, r + 5), fill: hoop === "die-cast" ? "#9a9ea4" : "#b8bcc2", stroke: "ink", sw: 1.2, title: (title || "") + " hoop (" + (hoop || "steel") + ")" },
        { t: "shape", d: circ(cx, cy, r), fill: "#f1eee4", stroke: "ink", sw: 1, title: (title || "") + " batter head: click the centre, the edge, or the rim" },
        { t: "shape", d: circ(cx, cy, r * 0.55), fill: "none", stroke: "#cfc9b8", sw: 0.8, title: "centre / edge boundary (drawn for the click zones)" }];
      for (var i = 0; i < (lugs || 0); i++) { var a = TAU * i / lugs, x = cx + (r + 9) * Math.cos(a), y = cy + (r + 9) * Math.sin(a); it.push({ t: "shape", d: "M" + (x - 3).toFixed(1) + " " + (y - 3).toFixed(1) + " h6 v6 h-6 Z", fill: finish || "#888", stroke: "ink", sw: 0.8, title: "Tension rod / lug " + (i + 1) }); }
      return it; },
    cym: function (cx, cy, r, finish, title, china) { var it = [{ t: "shape", d: circ(cx, cy, r), fill: finish || "#d8b45a", stroke: "ink", sw: 1, op: 0.95, title: title + ": click the bell, the bow or the edge" }];
      for (var k = 1; k < 5; k++) it.push({ t: "shape", d: circ(cx, cy, r * (0.28 + 0.17 * k)), fill: "none", stroke: "#8a6a20", sw: 0.4, op: 0.6, title: "lathing grooves" });
      if (china) it.push({ t: "shape", d: circ(cx, cy, r * 0.9), fill: "none", stroke: "#5a4010", sw: 1.4, title: "turned-up edge (china)" });
      it.push({ t: "shape", d: circ(cx, cy, r * 0.22), fill: "#c09a40", stroke: "ink", sw: 0.8, title: title + " bell" }, { t: "shape", d: circ(cx, cy, 2.5), fill: "#333", stroke: "none", title: "stand and felt" }); return it; }
  };
  function circ(cx, cy, r) { return "M" + (cx - r).toFixed(1) + " " + cy + " a" + r + " " + r + " 0 1 0 " + (2 * r).toFixed(1) + " 0 a" + r + " " + r + " 0 1 0 " + (-2 * r).toFixed(1) + " 0 Z"; }
  M.zoneAt = function (L, x, y) { var Z = L.zones || [], best = null;
    Z.forEach(function (z) { var hit = false, rr = 0; if (z.kind === "kick") { hit = x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; rr = 0; } else { var d = Math.hypot(x - z.cx, y - z.cy); hit = d <= z.r + (z.kind === "drum" ? 6 : 0); rr = d / z.r; }
      if (hit && (!best || (z.top ? 1 : 0) >= (best.z.top ? 1 : 0))) best = { z: z, rr: rr }; });
    if (!best) return null; var z0 = best.z, rr0 = best.rr, strike;
    if (z0.kind === "kick") strike = "centre"; else if (z0.kind === "cymbal") strike = rr0 < 0.22 ? "bell" : rr0 < 0.8 ? "bow" : "edge"; else strike = rr0 < 0.55 ? "centre" : rr0 <= 1 ? "edge" : "rim";
    return { part: z0.part, strike: strike }; };

  if (typeof module !== "undefined" && module.exports) { module.exports = M; }
  if (typeof document === "undefined") { global.DrumKits = M; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, playing = [], SR = 32000, CACHE = {};
  function ac() { if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.6;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "DrumKits"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  M.ctx = function () { return ac(); };
  M.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("drumkits", null); };
  function buf(y) { var c = ac(), b = c.createBuffer(1, y.length, SR), d = b.getChannelData(0); for (var i = 0; i < y.length; i++) d[i] = y[i]; return b; }
  function hitBuf(W, part, strike, extra) { var st = W.st, key = W.id + "|" + part + "|" + strike + "|" + JSON.stringify(st) + (extra || ""); if (!CACHE[key]) { var y = M.hit(W.id, st, part, strike, SR); CACHE[key] = { y: y, b: buf(y) }; } return CACHE[key]; }
  function sched(b, when, gain) { var c = ac(), s = c.createBufferSource(), g = c.createGain(); g.gain.value = gain == null ? 0.7 : gain; s.buffer = b; s.connect(g); g.connect(master); s.start(when || 0); playing.push(s);
    if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("drumkits", M.stop); return s; }
  M.play = function (W, part, strike) { ac(); var h = hitBuf(W, part, strike); sched(h.b, 0); if (W.onHit) W.onHit(part, strike, h.y); return h.y; };
  // grooves: [beat, part, strike, vel]; bars of 4 beats, played twice
  M.GROOVES = { jazz: { bpm: 132, swing: true, hits: [[0, "ride", "bow", 0.7], [1, "ride", "bow", 0.8], [1.67, "ride", "bow", 0.55], [2, "ride", "bow", 0.7], [3, "ride", "bow", 0.8], [3.67, "ride", "bow", 0.55], [1, "hats", "foot", 0.7], [3, "hats", "foot", 0.7], [0, "kick", "centre", 0.25], [2, "kick", "centre", 0.25], [2.67, "snare", "centre", 0.3]] },
    rock: { bpm: 92, hits: [[0, "kick", "centre", 0.9], [1, "snare", "rim", 0.9], [2, "kick", "centre", 0.85], [2.5, "kick", "centre", 0.7], [3, "snare", "rim", 0.9], [0, "crash", "edge", 0.8]].concat([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (b) { return [b, "hats", "bow", 0.6]; })) },
    funk: { bpm: 98, hits: [[0, "kick", "centre", 0.9], [0.75, "kick", "centre", 0.6], [1, "snare", "centre", 0.85], [1.75, "snare", "centre", 0.25], [2.5, "kick", "centre", 0.8], [3, "snare", "centre", 0.85], [3.25, "snare", "centre", 0.25]].concat([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75].map(function (b, i) { return [b, "hats", "bow", i % 2 ? 0.35 : 0.6]; })) },
    snare: { bpm: 96, hits: [[1, "snare", "centre", 0.9], [3, "snare", "rim", 0.95], [2.5, "snare", "centre", 0.3], [3.75, "snare", "edge", 0.4]] } };
  M.groove = function (W) { ac(); M.stop(); var I = M.ITEMS[W.id], G = M.GROOVES[I.cat === "kit" ? W.id : "snare"], spb = 60 / G.bpm, t0 = ac().currentTime + 0.08;
    for (var bar = 0; bar < 2; bar++) G.hits.forEach(function (h) { var part = I.cat === "snare" ? "snare" : h[1], st = W.st;
        if (part === "hats" && I.cat === "kit") W.st = setK(st, "hats.pedal", h[2] === "foot" ? "foot" : st.hats.pedal);
        var hb = hitBuf(W, part, h[2] === "foot" ? "bow" : h[2]); W.st = st; sched(hb.b, t0 + (bar * 4 + h[0]) * spb, 0.8 * h[3]); });
    return G; };

  // ======================= browser: widgets =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  M.adapter = function (W) { var subs = []; W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return getK(W.st, k); }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); }, range: function (k) { return M.ctl(W.id, k); } }; };
  M.widgets = [];
  function plot(el, W, y) { var Wd = 520, Ht = 120, f0 = 30, f1 = 16000, S = M.spectrum(y, SR, 0.6), mx = 1e-9, s = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" class="dk-svg" role="img" aria-label="Spectrum of the last hit"><rect width="' + Wd + '" height="' + Ht + '" class="dk-bg"/>';
    for (var k = 1; k < S.mag.length; k++) mx = Math.max(mx, S.mag[k]);
    [100, 1000, 10000].forEach(function (f) { var x = Math.log(f / f0) / Math.log(f1 / f0) * Wd; s += '<line x1="' + x + '" x2="' + x + '" y1="0" y2="' + Ht + '" class="dk-grid"/><text x="' + (x + 3) + '" y="' + (Ht - 4) + '">' + (f >= 1000 ? f / 1000 + " kHz" : f + " Hz") + "</text>"; });
    var d = ""; for (var k2 = 1; k2 < S.mag.length; k2++) { var f = k2 * S.df; if (f < f0 || f > f1) continue; var x2 = Math.log(f / f0) / Math.log(f1 / f0) * Wd, v = Math.max(-60, 20 * Math.log10(S.mag[k2] / mx)), yy = (-v / 60) * (Ht - 16) + 4; d += (d ? "L" : "M") + x2.toFixed(1) + " " + yy.toFixed(1); }
    var c = M.centroid(y, SR), xc = Math.log(Math.max(f0, c) / f0) / Math.log(f1 / f0) * Wd;
    el.innerHTML = s + '<path d="' + d + '" class="dk-line"/><line x1="' + xc + '" x2="' + xc + '" y1="0" y2="' + Ht + '" class="dk-cen"/><text x="6" y="12">Spectrum of the last hit (first 0.6 s, dB, 60 dB range). Dashed: its centroid ' + Math.round(c) + ' Hz (higher = brighter).</text></svg>'; }
  function face(host, W) { host.innerHTML = ""; if (!global.FaithfulPanel) { host.textContent = "(panel script missing)"; return; } var pid = (W.I.cat === "cymbal" ? "cy-" : "dk-") + W.id;
    FaithfulPanel.load(pid).then(function (L) { W.L = L || FaithfulPanel.LAYOUTS && FaithfulPanel.LAYOUTS[pid]; W.face = FaithfulPanel.mount(host, { id: pid, adapter: W.A }); var root = W.face.el || host;
      root.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".fp-c")) return; var svg = e.target.closest && e.target.closest("svg.fp-svg"); if (!svg || !root.contains(svg)) return; var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, L2 = W.L || FaithfulPanel.LAYOUTS[pid];
        var z = M.zoneAt(L2, (e.clientX - r.left) * vb.width / r.width + vb.x, (e.clientY - r.top) * vb.height / r.height + vb.y); if (z) W.hit(z.part, z.strike); }); }).catch(function () { host.textContent = "(drawing failed to load)"; }); }
  M.mount = function (el, o) { o = o || {}; var W = { id: M.ITEMS[o.item] ? o.item : "supraphonic" }; W.I = M.ITEMS[W.id]; W.st = M.clean(W.id, o.state); W.A = M.adapter(W); M.widgets.push(W);
    el.classList.add("dk-w"); el.innerHTML = ""; var head = h("div", "dk-head"), title = h("b", "dk-title"); head.appendChild(title); el.appendChild(head);
    if (o.choose) { var se = h("select", "dk-pick"); se.setAttribute("aria-label", "Choose"); (o.cat ? M.CATS[o.cat] : M.IDS).forEach(function (id) { var op = h("option", null, M.ITEMS[id].name); op.value = id; se.appendChild(op); }); se.onchange = function () { W.setItem(se.value); }; head.appendChild(se); W.pick = se; }
    var fh = h("div", "dk-face"); el.appendChild(fh);
    var bar = h("div", "dk-bar"); el.appendChild(bar); var pl = h("div", "dk-plot"), inf = h("p", "dk-info"); el.appendChild(pl); el.appendChild(inf);
    function buttons() { bar.innerHTML = ""; var I = W.I, parts = I.cat === "snare" ? [["snare", ["centre", "edge", "rim", "cross"]]] : I.cat === "cymbal" ? [[W.id, I.type === "hats" ? ["bow", "edge"] : ["bell", "bow", "edge"]]] : [["kick", ["centre"]], ["snare", ["centre", "edge", "rim", "cross"]], ["tom1", ["centre", "edge"]], ["floor", ["centre", "edge"]], ["hats", ["bow"]], ["ride", ["bell", "bow"]], ["crash", ["edge"]]];
      parts.forEach(function (P) { var g = h("span", "dk-grp"); g.appendChild(h("span", "dk-gl", (P[0] === "tom1" ? "tom" : P[0] === W.id ? I.short : P[0]) + ":"));
        P[1].forEach(function (s) { var b = h("button", "dk-hit", s === "cross" ? "cross-stick" : s === "rim" ? "rimshot" : s); b.type = "button"; b.dataset.part = P[0]; b.dataset.strike = s; b.onclick = function () { W.hit(P[0], s); }; g.appendChild(b); }); bar.appendChild(g); });
      var gb = h("button", "dk-groove", I.cat === "cymbal" ? "▶ Let it ring" : "▶ Groove"); gb.type = "button"; gb.onclick = function () { if (I.cat === "cymbal") W.hit(W.id, I.type === "crash" || I.type === "splash" || I.type === "china" ? "edge" : "bow"); else M.groove(W); }; bar.appendChild(gb);
      var sb = h("button", "dk-stop", "■ Stop"); sb.type = "button"; sb.onclick = M.stop; bar.appendChild(sb); }
    function info() { var I = W.I; inf.textContent = M.summary(W.id, W.st) + ". " + (I.cat === "cymbal" ? M.SERIES[I.series].name + ", " + I.size + "\"" : I.cat === "snare" ? M.SHELLS[I.drum.shell].name + " shell, " + I.drum.d + " x " + I.drum.depth + "\", " + M.HEADS[W.st.head].name.toLowerCase() + " head" : I.maker) + ". Click the drawing to strike it" + (I.cat === "cymbal" ? " (bell / bow / edge)" : " (centre / edge / rim)") + "."; el.dataset.item = W.id; el.dataset.cat = I.cat; }
    W.hit = function (part, strike) { var y = M.play(W, part, strike); plot(pl, W, y); el.dataset.last = part + ":" + strike; return y; };
    W.set = function (k, v) { W.st = M.clean(W.id, setK(W.st, k, v)); W._notify(); info(); if (o.onChange) o.onChange(W); };
    W.setAll = function (s) { W.st = M.clean(W.id, s); W._notify(); info(); };
    W.setItem = function (id, st) { W.id = id; W.I = M.ITEMS[id]; W.st = M.clean(id, st || {}); title.textContent = W.I.name; if (W.pick) W.pick.value = id; face(fh, W); buttons(); info(); };
    W.draw = info; W.setItem(W.id, W.st); return W; };
  M.compare = function (el) { el.innerHTML = ""; var cat = el.dataset.cat || "snare", cols = h("div", "dkc-cols"), a = h("div", "dkc-a"), b = h("div", "dkc-b"); cols.appendChild(a); cols.appendChild(b); el.appendChild(cols);
    var q = new URLSearchParams(location.search), list = M.CATS[cat].concat(cat === "snare" ? M.CATS.kit : []), ia = q.get("a") || el.dataset.a, ib = q.get("b") || el.dataset.b;
    if (list.indexOf(ia) < 0) ia = list[0]; if (list.indexOf(ib) < 0) ib = list[1];
    var WA = M.mount(a, { item: ia, choose: true, cat: null }), WB = M.mount(b, { item: ib, choose: true });
    [WA, WB].forEach(function (W) { W.pick.innerHTML = ""; list.forEach(function (id) { var op = h("option", null, M.ITEMS[id].name); op.value = id; W.pick.appendChild(op); }); W.pick.value = W.id; });
    var box = h("div", "dkc-tr"), ab = h("button", "dkc-ab", "▶ A then B"), go = h("button", "dkc-go", "Translate A → B"), back = h("button", "dkc-back", "Translate B → A"), res = h("div", "dkc-res");
    [ab, go, back].forEach(function (x) { x.type = "button"; box.appendChild(x); }); box.appendChild(res); el.appendChild(box);
    function main(W) { return W.I.cat === "cymbal" ? [W.id, W.I.type === "crash" || W.I.type === "splash" || W.I.type === "china" ? "edge" : "bow"] : ["snare", "centre"]; }
    ab.onclick = function () { M.stop(); var m = main(WA), y = WA.hit(m[0], m[1]); setTimeout(function () { var n = main(WB); WB.hit(n[0], n[1]); }, Math.min(2500, y.length / SR * 1000) + 200); };
    function run(F, T) { var r = M.translate(F.id, F.st, T.id); T.setAll(r.state); res.innerHTML = ""; var p = h("p"); p.innerHTML = "<b></b> → <b></b> <span class=\"dkc-q dkc-" + r.quality + "\">" + r.quality + "</span>";
      p.querySelectorAll("b")[0].textContent = M.summary(F.id, F.st); p.querySelectorAll("b")[1].textContent = M.summary(T.id, T.st); res.appendChild(p);
      var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); el.dataset.quality = r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); }; el._dkc = { a: WA, b: WB, run: run }; return el._dkc; };
  function steps() { var n = 0; document.querySelectorAll(".dk-step").forEach(function (s) { n++; var b = h("button", "dk-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = M.widgets.filter(function (w) { return w.id === s.dataset.item; })[0] || M.widgets[0]; if (!W) return; M.stop();
        var d0 = M.defaults(W.id), sv = s.dataset.set ? JSON.parse(s.dataset.set) : {}; Object.keys(sv).forEach(function (k) { d0[k] = sv[k] && typeof sv[k] === "object" ? Object.assign(d0[k] || {}, sv[k]) : sv[k]; }); W.setAll(d0);
        var hp = (s.dataset.hit || "").split(":"); if (hp[0] === "groove") M.groove(W); else W.hit(hp[0] || (W.I.cat === "cymbal" ? W.id : "snare"), hp[1] || (W.I.cat === "cymbal" ? "bow" : "centre")); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".dk-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("dk-right", "dk-wrong"); }); li.classList.add(i === a ? "dk-right" : "dk-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TR = null; M.tracks = function () { return TR || (TR = fetch("/apps/shared/data/drumkits/tracks.json").then(function (r) { return r.json(); })); };
  function tracks(el) { M.tracks().then(function (d) { var want = el.dataset.item, list = d.tracks.filter(function (t) { return t.item === want; }), ul = h("ul", "dk-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a);
        li.appendChild(document.createTextNode(t.channel ? " ↗ (" + t.channel + "). " : " ↗ (a YouTube search: no video checked). "));
        li.appendChild(h("span", "dk-who", t.useSrc ? "Source: " + t.useSrc + "." : "That this drum / cymbal is on the record: unverified (no source found).")); ul.appendChild(li); });
      el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  M.init = function () { document.querySelectorAll(".dk[data-item]").forEach(function (e) { M.mount(e, { item: e.dataset.item }); });
    document.querySelectorAll(".dkc").forEach(function (e) { M.compare(e); });
    steps(); document.querySelectorAll(".dk-q").forEach(quiz); document.querySelectorAll(".dk-tracks").forEach(tracks); };
  global.DrumKits = M;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", M.init); else M.init();
})(typeof window !== "undefined" ? window : globalThis);
