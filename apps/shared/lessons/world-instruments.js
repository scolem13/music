// WorldInst: world and acoustic instruments the way the site does drum kits, mics and amps: a physical / modal model of each
// (pure maths, runs in node: tests/lessons/world-instruments.test.js), a faithful drawing (FaithfulPanel host adapter,
// panels/wi-<id>.js: click a fret, a string, a note area or a tine to play it), A/B of two, and translation of a tuning where it
// means something (sitar <-> tanpura, kalimba <-> mbira: exact / approx / lost); other pairs are skipped and say so.
// Pages: lessons/world-instruments-compare.qmd, lessons/intro-<slug>.qmd (scripts/intro-instruments/world.py).
// Sources: scripts/sources/world-instruments.py (Wikipedia, read 2026-11-26 through the API). Facts not found there are marked
// unverified here and on the pages. Be careful: these are living traditions; the site's models are sketches, not the instruments.
//
// THE MODEL: a plucked string on a curved bridge (sitar, tanpura)
//   partials  a string plucked near one end: partial k (k = 1..40) at k f0 with loudness |sin(k pi b)| / k (b = pluck point 0.12;
//          the ideal-string law), each decaying with T_k = T0 / (1 + 0.006 k^2) (site's constants).
//   jawari   Wikipedia ("Sitar", "Tanpura"): the string grazes the wide, curved bridge; as it moves, its length changes slightly;
//          as the swing dies, the contact point creeps up the bridge's slope (3-10 s), and that makes the overtones, a sustained
//          buzz whose bright band moves. Here (the site's phenomenological sketch, NOT a contact simulation): a band of partials
//          centred on kc(t) = kc0 + 6 (1 - A(t)) (A = the fundamental's envelope, 1 -> 0) is fed energy, gain 1 + 30 J (1 - A) e^-((k-kc)/w)^2, and their decay lengthened (the 0.006 k^2 damping term x (1 - J)),
//          so the upper partials grow while the fundamental decays: brightness rises over time, not falls (an ordinary plucked
//          string gets duller). J = jawari amount (0 = a sharp-edged bridge, like a guitar's).
//   tanpura Garland vol. 5, p. 332 (Hindustani): a long-necked unfretted lute, a gourd, a platform bridge with a rounded surface and
//          threads under the strings, "a sound rich in overtones"; typically four or five strings, tuned to the tonic and the fourth
//          or fifth degree; p. 355 (Karnatak): four strings Pa-Sa-Sa-low Sa (G-c-c-C), plucked in that order, often long-short-short-long,
//          unrelated to tempo or tala; a silk jiva thread; descended from the tambur (p. 310, Garland) and a drone in 17th-century paintings (p. 332).
//   thread  (tanpura juari / jiva) Wikipedia ("Tanpura"): a cotton thread between string and bridge shifts the grazing contact
//          to another place on the bridge and changes the harmonic content. Here: thread 0..1 moves kc0 from partial 5 to 21.
//   sympathetic strings (sitar taraf / tarb)  Garland vol. 5, p. 334: thirteen on the standard sitar, under the frets on a small bridge of
//          their own; Wikipedia ("Sitar"): 11-13 or so strings under the frets that resonate in sympathy
//          with the played strings; the player retunes for each raga. Here: 13 taraf strings tuned to the raga's notes upward from
//          Sa (which notes, in what order: the site's choice, unverified; players differ). Each is driven by how closely any of its
//          partials meets a partial of the played note: e = sum_k sum_j a_k exp(-((f_k - j f_t) / bw)^2), bw = 0.35 % (about 6
//          cents); it then rings slowly up and long (T 3 s) on the small bridge (also given a little jawari: unverified).
//   meend   Wikipedia ("Sitar"): pulling the main string sideways over the curved frets raises the pitch, up to about seven
//          semitones; Garland vol. 5, p. 334: portamentos of up to a fifth on each fret, and p. 191: some sitarists reach a minor
//          sixth (the site stops at seven semitones = a fifth). Here the pitch rises along a smooth curve after the pluck to `meend` semitones (0-7).
//   frets   Wikipedia ("Sitar"): curved, raised frets, movable for fine tuning. Garland vol. 5 (2000), p. 334: the standard sitar has twenty arched
//          metal frets tied on with nylon thread, movable to different scale positions. Here 20 frets on the main string (tuned to Ma,
//          a fourth above Sa, Wikipedia), 7 per octave, each on the raga's version of that svara (komal / shuddha / tivra; a class
//          the raga leaves out sits on its shuddha place and is drawn dim), just-intonation cents as in tuning-kit.js.
//   strings  sitar (Wikipedia, "Kharaj Pancham" tuning): main (baaj) Ma, jod Sa, kharaj low Sa and low Pa, chikari high Sa,
//          middle Sa, Pa. Tanpura (Wikipedia): 4 strings Pa-sa-sa-Sa (5-8-8-1); Ma-sa-sa-Sa for ragas without Pa; Dha or Ni for
//          ragas without Pa and shuddha Ma (Marwa, Hindol). Pluck cycle 1-2-3-4 with a rest (the spacing is the site's: unverified).
// THE MODEL: a steel pan note area (tenor / lead pan)
//   Wikipedia ("Steelpan"): Anthony Williams's "fourths and fifths" layout is the standard for lead pans; tuning a note's
//   overtones (fundamental, second and third partial) was developed by Bertie Marshall and Alan Gervais; bigger area = lower.
//   Here each note area is a small dome with three tuned modes at 1 : 2 : 3 (fundamental, octave, octave + fifth = the twelfth),
//   offsets `oct` / `twelfth` in cents (a tuner's error), plus two untuned, quickly dying modes (2.6, 3.7: the site's), loudness
//   by strike place (centre: fundamental; toward the edge: more octave and twelfth; site's), a rubber stick tip (soft / hard: a
//   longer or shorter contact = a lower or higher low-pass, site's), and coupling: the note area an octave up (inward, same
//   angle) rings a little in sympathy (site's amount). Layout: a low-C tenor, 29 notes C4-E6 (outer ring 12 in fifths, middle
//   ring the same an octave up, inner 5: unverified: makers differ).
// THE MODEL: a plucked tine (kalimba, mbira)
//   a clamped bar (cantilever): modes at 1, 6.267, 17.55 x f1 (beam theory: (4.694/1.875)^2, (7.855/1.875)^2), f1 ~ 1 / length^2
//   (so the drawing's tine lengths come from the pitch). Wikipedia ("Mbira"): the overtones are inharmonic, strongest in the
//   attack, and die fast, leaving an almost pure tone; neighbouring tines vibrate a little too. Buzzers (machachara: bottle caps,
//   shells: Wikipedia "Mbira") here: a rattle (band-passed noise bursts) that sounds only while the board's swing is above a
//   threshold (a contact nonlinearity; amounts site's). Deze (calabash resonator, Wikipedia): a Helmholtz-like peak near 180 Hz
//   (site's) and a little longer ring. Layout: kalimba (Hugh Tracey's design after the nyunga nyunga, Wikipedia) 17 tines,
//   lowest in the centre, alternating left / right going up (which side first: unverified); mbira dzavadzimu 22 keys in three
//   registers, two on the left and one on the right (Wikipedia), tuned Nyamaropa (close to Mixolydian, Wikipedia; real mbira
//   tunings do not sit on the piano's grid and differ by family: the site uses equal-tempered Mixolydian + a small stretch,
//   unverified). The key order inside each register is the site's (unverified).
// Nobody has compared any of this with the real instruments.
//
// API
//   WorldInst.ITEMS[id] { name, short, kind: "sitar"|"tanpura"|"pan"|"tine", ... }  .IDS  .RAGAS  .TUNINGS (mbira)
//   .defaults(id) / .clean(id, st)   .controls(id) -> FaithfulPanel ranges   .notes(id, st) -> [{ part, f, name }]
//   .stringRender(f0, o, sr) -> Float32Array   o { dur, vel, jawari, thread, meend, T }   .bandRatio(x, sr, f0, t0, t1)
//   .taraf(id, st) -> [Hz]   .sympathy(fPlayed, fString) -> e   .panModes(f, st, strike) -> [{f, a, T}]   .tineModes(f, st)
//   .hit(id, st, part, sr) -> Float32Array   .translate(from, st, to) -> { state, quality, notes, skipped? }
//   .drone(opts) -> { stop(), set(o) }  (browser: a tanpura drone any page can start: { sa: Hz, tuning: "P"|"M"|"N"|"D", gain })
//   Markup: <div class="wi" data-item="sitar"></div>  <div class="wic" data-a="sitar" data-b="tanpura"></div>
//     <div class="wi-step" data-item="sitar" data-set='{"jawari":0}' data-hit="fret:3">text</div>  <div class="wi-q" data-a="1">
//     <div class="wi-tracks" data-item="sitar"></div>
(function (global) {
  var M = {}, TAU = 2 * Math.PI;
  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rc(n, d) { return 1200 * Math.log2(n / d); }
  // svaras: just cents, as in tuning-kit.js (lessons/tuning-systems.qmd, ragas.qmd)
  M.SW = { S: 0, r: rc(16, 15), R: rc(9, 8), g: rc(6, 5), G: rc(5, 4), M: rc(4, 3), "M#": rc(45, 32), P: rc(3, 2), d: rc(8, 5), D: rc(5, 3), n: rc(16, 9), N: rc(15, 8) };
  M.SW_NAME = { S: "Sa", r: "komal Re", R: "Re", g: "komal Ga", G: "Ga", M: "Ma", "M#": "tivra Ma", P: "Pa", d: "komal Dha", D: "Dha", n: "komal Ni", N: "Ni" };
  var CLASS = { S: "S", r: "R", R: "R", g: "G", G: "G", M: "M", "M#": "M", P: "P", d: "D", D: "D", n: "N", N: "N" }, ORDER = ["S", "R", "G", "M", "P", "D", "N"];
  // the six ragas of lessons/ragas.qmd (tuning-kit.js RAGAS: the same notes; raga facts unverified there and here)
  M.RAGAS = { yaman: { name: "Yaman", notes: ["S", "R", "G", "M#", "P", "D", "N"] }, bhairav: { name: "Bhairav", notes: ["S", "r", "G", "M", "P", "d", "N"] },
    bhupali: { name: "Bhupali", notes: ["S", "R", "G", "P", "D"] }, todi: { name: "Todi", notes: ["S", "r", "g", "M#", "P", "d", "N"] },
    malkauns: { name: "Malkauns", notes: ["S", "g", "M", "d", "n"] }, khamaj: { name: "Khamaj", notes: ["S", "R", "G", "M", "P", "D", "N", "n"] } };
  M.SA = { "C": 130.81, "C#": 138.59, "D": 146.83, "D#": 155.56, "E": 164.81 };
  M.TAN = { P: { name: "Pa-sa-sa-Sa (5-8-8-1)", r: 3 / 4 }, M: { name: "Ma-sa-sa-Sa (4-8-8-1)", r: 2 / 3 }, N: { name: "Ni-sa-sa-Sa (7-8-8-1)", r: 15 / 16 }, D: { name: "Dha-sa-sa-Sa (6-8-8-1)", r: 5 / 6 } };
  M.TUNINGS = { nyamaropa: { name: "Nyamaropa (close to Mixolydian)", st: [0, 2, 4, 5, 7, 9, 10] }, katsanzaira: { name: "Katsanzaira (close to Dorian)", st: [0, 2, 3, 5, 7, 9, 10] },
    mavembe: { name: "Mavembe (close to Phrygian)", st: [0, 1, 3, 5, 7, 8, 10] }, major: { name: "Major (the kalimba's usual)", st: [0, 2, 4, 5, 7, 9, 11] } };
  M.TONIC = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 196.0, A: 220.0, Bb: 233.08 };
  M.ITEMS = {
    sitar: { kind: "sitar", name: "Sitar", short: "Sitar", about: "Long-necked lute of Hindustani music: 6-7 played strings over about 20 curved movable frets, usually 13 sympathetic strings under them, a gourd body, a wide curved bridge (jawari)", finish: "#9a5b2e",
      st: { raga: "yaman", sa: "C#", jawari: 0.7, taraf: true, meend: 0, string: "main" } },
    tanpura: { kind: "tanpura", name: "Tanpura", short: "Tanpura", about: "Four unfretted strings plucked at full length, over and over: the drone under a singer or player; a curved bridge with a cotton thread", finish: "#b57a3e",
      st: { tuning: "P", sa: "C#", jawari: 0.8, thread: 0.45, tempo: 60 } },
    tenorpan: { kind: "pan", name: "Steel pan (tenor / lead)", short: "Tenor pan", about: "From Trinidad and Tobago: a sunk and tuned oil-drum top; 29 note areas here, laid out in fourths and fifths, played with rubber-tipped sticks", finish: "#c9ccd0",
      st: { oct: 0, twelfth: 0, stick: "medium", place: "centre", couple: 0.5 } },
    kalimba: { kind: "tine", name: "Kalimba (17-tine)", short: "Kalimba", about: "Hugh Tracey's 1950s design after the mbira nyunga nyunga: steel tines on a board or box, lowest in the centre, alternating left and right", finish: "#c8955a",
      st: { tuning: "major", tonic: "C", buzz: false, deze: false }, n: 17 },
    mbira: { kind: "tine", name: "Mbira dzavadzimu (22 keys)", short: "Mbira", about: "The Shona mbira of Zimbabwe: 22-28 forged keys in three registers on a hardwood board (gwariva), buzzers, played in a calabash resonator (deze)", finish: "#7a5030",
      st: { tuning: "nyamaropa", tonic: "G", buzz: true, deze: true }, n: 22 }
  };
  M.IDS = Object.keys(M.ITEMS);
  M.STICKS = { soft: 1800, medium: 3200, hard: 6000 };

  M.defaults = function (id) { return JSON.parse(JSON.stringify(M.ITEMS[id].st)); };
  M.clean = function (id, st) { var d = Object.assign(M.defaults(id), st || {}), k = M.ITEMS[id].kind;
    if (k === "sitar") { if (!M.RAGAS[d.raga]) d.raga = "yaman"; if (!M.SA[d.sa]) d.sa = "C#"; d.jawari = cl(+d.jawari, 0, 1); d.taraf = !!d.taraf; d.meend = cl(Math.round(+d.meend), 0, 7); if (["main", "jod", "chikari"].indexOf(d.string) < 0) d.string = "main"; }
    if (k === "tanpura") { if (!M.TAN[d.tuning]) d.tuning = "P"; if (!M.SA[d.sa]) d.sa = "C#"; d.jawari = cl(+d.jawari, 0, 1); d.thread = cl(+d.thread, 0, 1); d.tempo = cl(Math.round(+d.tempo), 30, 120); }
    if (k === "pan") { d.oct = cl(Math.round(+d.oct), -50, 50); d.twelfth = cl(Math.round(+d.twelfth), -50, 50); if (!M.STICKS[d.stick]) d.stick = "medium"; if (["centre", "edge"].indexOf(d.place) < 0) d.place = "centre"; d.couple = cl(+d.couple, 0, 1); }
    if (k === "tine") { if (!M.TUNINGS[d.tuning]) d.tuning = id === "kalimba" ? "major" : "nyamaropa"; if (!M.TONIC[d.tonic]) d.tonic = id === "kalimba" ? "C" : "G"; d.buzz = !!d.buzz; d.deze = !!d.deze; }
    return d; };
  M.controls = function (id) { var k = M.ITEMS[id].kind, s = M.ITEMS[id].st;
    if (k === "sitar") return [["raga", "Raga", "c", Object.keys(M.RAGAS), null, null, s.raga], ["sa", "Sa", "c", Object.keys(M.SA), null, null, s.sa], ["jawari", "Jawari", "k", 0, 1, 0.05, s.jawari],
      ["taraf", "Sympathetic strings", "s", false, true, null, true], ["meend", "Meend (semitones)", "k", 0, 7, 1, 0], ["string", "Pluck string", "c", ["main", "jod", "chikari"], null, null, "main"]];
    if (k === "tanpura") return [["tuning", "First string", "c", Object.keys(M.TAN), null, null, "P"], ["sa", "Sa", "c", Object.keys(M.SA), null, null, s.sa], ["jawari", "Jawari", "k", 0, 1, 0.05, s.jawari],
      ["thread", "Thread place", "k", 0, 1, 0.05, s.thread], ["tempo", "Plucks a minute", "k", 30, 120, 1, 60]];
    if (k === "pan") return [["oct", "Octave partial (cents)", "k", -50, 50, 1, 0], ["twelfth", "Twelfth partial (cents)", "k", -50, 50, 1, 0], ["stick", "Stick", "c", Object.keys(M.STICKS), null, null, "medium"],
      ["place", "Strike place", "c", ["centre", "edge"], null, null, "centre"], ["couple", "Octave neighbour rings", "k", 0, 1, 0.05, 0.5]];
    return [["tuning", "Tuning", "c", Object.keys(M.TUNINGS), null, null, s.tuning], ["tonic", "Tonic", "c", Object.keys(M.TONIC), null, null, s.tonic], ["buzz", "Buzzers", "s", false, true, null, s.buzz], ["deze", "Gourd (deze)", "s", false, true, null, s.deze]]; };
  M.ctl = function (id, k) { return M.controls(id).filter(function (c) { return c[0] === k; })[0] || null; };

  // ---------- notes of each instrument ----------
  function hz(sa, c) { return sa * Math.pow(2, c / 1200); }
  M.frets = function (st) { var R = M.RAGAS[st.raga], pick = {}; ORDER.forEach(function (c) { pick[c] = { k: c === "M" ? "M" : c, used: false }; });
    R.notes.forEach(function (n) { var c = CLASS[n]; if (!pick[c].used) pick[c] = { k: n, used: true }; });
    var out = [], start = M.SW.M; for (var oct = 0; out.length < 20; oct++) ORDER.forEach(function (c) { var p = pick[c], cents = M.SW[p.k] + 1200 * oct - start; if (cents > 0 && out.length < 20) out.push({ k: p.k, cents: cents, used: p.used, oct: oct }); });
    return out; };
  M.taraf = function (id, st) { st = M.clean(id, st); var sa = M.SA[st.sa], R = M.RAGAS[st.raga].notes.slice().sort(function (a, b) { return M.SW[a] - M.SW[b]; }), out = [];
    for (var oct = 0; out.length < 13; oct++) R.forEach(function (n) { if (out.length < 13) out.push(hz(sa, M.SW[n] + 1200 * oct)); }); return out; };
  var PAN_OUT = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F"], PC = { C: 0, "C#": 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, Bb: 10, B: 11 };
  M.panNotes = function () { var out = []; PAN_OUT.forEach(function (n, i) { out.push({ name: n + "4", ring: 0, i: i, f: 261.63 * Math.pow(2, PC[n] / 12) }); });
    PAN_OUT.forEach(function (n, i) { out.push({ name: n + "5", ring: 1, i: i, f: 523.25 * Math.pow(2, PC[n] / 12) }); });
    ["C", "C#", "D", "Eb", "E"].forEach(function (n) { out.push({ name: n + "6", ring: 2, i: PAN_OUT.indexOf(n), f: 1046.5 * Math.pow(2, PC[n] / 12) }); }); return out; };
  M.tines = function (id, st) { st = M.clean(id, st); var I = M.ITEMS[id], T = M.TUNINGS[st.tuning].st, f0 = M.TONIC[st.tonic], out = [];
    if (id === "kalimba") { for (var i = 0; i < I.n; i++) { var deg = T[i % 7] + 12 * Math.floor(i / 7); var side = i === 0 ? 0 : (i % 2 ? -1 : 1), slot = Math.ceil(i / 2); out.push({ i: i, f: f0 * Math.pow(2, deg / 12), side: side, slot: slot, reg: "row" }); } return out; }
    // mbira: left bass register 7 (lowest), left upper 8, right 7 (site's order); degrees of the 7-note tuning, a small stretch (unverified)
    var regs = [["left-low", 7, -7], ["left-up", 8, 0], ["right", 7, 7]], n = 0;
    regs.forEach(function (R) { for (var j = 0; j < R[1]; j++) { var dd = R[2] + j, deg = T[((dd % 7) + 7) % 7] + 12 * Math.floor(dd / 7); out.push({ i: n++, f: f0 * Math.pow(2, (deg + deg * 0.004) / 12), reg: R[0], slot: j }); } });
    return out; };
  function name12(f) { var m = Math.round(12 * Math.log2(f / 440) + 69); return ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  M.name12 = name12;
  M.notes = function (id, st) { st = M.clean(id, st); var k = M.ITEMS[id].kind, sa;
    if (k === "sitar") { sa = M.SA[st.sa]; var ma = sa * 4 / 3, L = [{ part: "open", f: ma, name: "Ma (open main string)" }];
      M.frets(st).forEach(function (fr, i) { L.push({ part: "fret:" + i, f: hz(ma, fr.cents), name: M.SW_NAME[fr.k] + (fr.used ? "" : " (not in the raga)") }); });
      return L.concat([{ part: "jod", f: sa, name: "jod: Sa" }, { part: "kharaj", f: sa / 2, name: "kharaj: low Sa" }, { part: "chikari", f: sa * 2, name: "chikari: high Sa, Sa, Pa" }, { part: "taraf", f: sa, name: "sympathetic strings (strum)" }]); }
    if (k === "tanpura") { sa = M.SA[st.sa]; return [{ part: "s1", f: sa * M.TAN[st.tuning].r, name: "1st: " + st.tuning }, { part: "s2", f: sa, name: "2nd: sa" }, { part: "s3", f: sa, name: "3rd: sa" }, { part: "s4", f: sa / 2, name: "4th: low Sa" }, { part: "cycle", f: sa, name: "the cycle" }]; }
    if (k === "pan") return M.panNotes().map(function (n, i) { return { part: "note:" + i, f: n.f, name: n.name }; });
    return M.tines(id, st).map(function (t) { return { part: "tine:" + t.i, f: t.f, name: name12(t.f) }; }); };

  // ---------- the string on a curved bridge ----------
  M.stringPartials = function (f0, o, sr) { var L = [], b = 0.12, T0 = o.T || 4; for (var k = 1; k <= 40; k++) { var f = k * f0; if (f > sr * 0.45) break; L.push({ k: k, f: f, a: Math.abs(Math.sin(k * Math.PI * b)) / k, T: T0 / (1 + 0.006 * k * k) }); } return L; };
  M.stringRender = function (f0, o, sr) { o = o || {}; var dur = o.dur || 2, n = Math.round(dur * sr), y = new Float32Array(n), J = o.jawari == null ? 0.7 : o.jawari, th = o.thread == null ? 0.4 : o.thread,
      vel = o.vel == null ? 0.8 : o.vel, P = M.stringPartials(f0 * Math.pow(2, Math.max(0, o.meend || 0) / 12), o, sr), kc0 = 5 + 16 * th, w = 4, B = 64, T1 = P[0] ? P[0].T : 2, att = o.attack || 0.002, me = o.meend || 0;
    var ph = P.map(function () { return 0; });
    for (var s = 0; s < n; s += B) { var t = s / sr, A = Math.exp(-t * 6.9 / T1), kc = kc0 + 6 * (1 - A), bend = me ? Math.pow(2, (me * (1 - Math.exp(-Math.max(0, t - 0.15) / 0.25)) - me) / 12) : 1, ramp = Math.min(1, t / att);
      for (var p = 0; p < P.length; p++) { var Q = P[p], Tk = Q.T * (1 + 0.006 * Q.k * Q.k) / (1 + 0.006 * Q.k * Q.k * (1 - J)), g = Q.a * Math.exp(-t * 6.9 / Tk) * (1 + 30 * J * Math.exp(-Math.pow((Q.k - kc) / w, 2)) * (1 - A)) * vel * ramp, dp = TAU * Q.f * bend / sr;
        if (g < 1e-6 && t > 0.05) continue; var e = Math.min(n, s + B); for (var i = s; i < e; i++) { y[i] += g * Math.sin(ph[p]); ph[p] += dp; } ph[p] %= TAU; } }
    return y; };
  // energy of partials above the 8th over energy of partials 1-3, in [t0, t1] s (a Goertzel bank)
  function gz(x, sr, f, a, b) { var w = TAU * f / sr, c = 2 * Math.cos(w), s1 = 0, s2 = 0; for (var i = a; i < b; i++) { var s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; } return s1 * s1 + s2 * s2 - c * s1 * s2; }
  M.gz = function (x, sr, f, t0, t1) { return gz(x, sr, f, Math.round(t0 * sr), Math.min(x.length, Math.round(t1 * sr))); };
  M.bandRatio = function (x, sr, f0, t0, t1) { var lo = 0, hi = 0; for (var k = 1; k <= 30; k++) { if (k * f0 > sr * 0.45) break; var e = M.gz(x, sr, k * f0, t0, t1); if (k <= 3) lo += e; else if (k >= 8) hi += e; } return hi / (lo || 1e-12); };
  M.sympathy = function (fp, ft, o) { o = o || {}; var P = M.stringPartials(fp, { T: 4 }, 44100), e = 0, bw = 0.0035; P.forEach(function (Q) { for (var j = 1; j <= 8; j++) { var fj = j * ft, d = (Q.f - fj) / (fj * bw); e += Q.a * Math.exp(-d * d) / j; } }); return e; };
  M.tarafRender = function (id, st, fp, sr, dur) { var y = new Float32Array(Math.round(dur * sr)), list = M.taraf(id, st);
    list.forEach(function (ft) { var e = M.sympathy(fp, ft); if (e < 0.02) return; var z = M.stringRender(ft, { dur: dur, jawari: 0.3, thread: 0.5, vel: 0.22 * Math.min(1, e), T: 3, attack: 0.09 }, sr); for (var i = 0; i < y.length; i++) y[i] += z[i]; }); return y; };

  // ---------- steel pan ----------
  M.panModes = function (f, st, strike) { st = st || {}; var place = strike || st.place || "centre", edge = place === "edge", fc = M.STICKS[st.stick || "medium"] || 3200, T0 = 1.8 * Math.pow(523 / f, 0.35);
    var L = [{ f: f, a: edge ? 0.7 : 1, T: T0, tuned: 1 }, { f: 2 * f * Math.pow(2, (st.oct || 0) / 1200), a: edge ? 0.55 : 0.32, T: T0 * 0.7, tuned: 2 }, { f: 3 * f * Math.pow(2, (st.twelfth || 0) / 1200), a: edge ? 0.35 : 0.14, T: T0 * 0.5, tuned: 3 },
      { f: 2.6 * f, a: 0.06, T: 0.12 }, { f: 3.7 * f, a: 0.05, T: 0.08 }];
    L.forEach(function (m) { m.a /= 1 + Math.pow(m.f / fc, 2); }); return L; };
  function addSine(y, sr, f, a, T, t0) { if (f >= sr * 0.48 || a <= 0) return; var w = TAU * f / sr, d = Math.exp(-6.9078 / (T * sr)), c = Math.cos(w), s = Math.sin(w), x = 0, z = a, n0 = Math.round((t0 || 0) * sr);
    for (var n = n0; n < y.length; n++) { var x2 = x * c + z * s, z2 = z * c - x * s; x = x2 * d; z = z2 * d; y[n] += x; if (n > n0 + 200 && Math.abs(x) + Math.abs(z) < 1e-6) break; } }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
  M.panRender = function (i, st, sr, dur) { var N = M.panNotes(), n = N[i] || N[0], y = new Float32Array(Math.round((dur || 2) * sr)), fc = M.STICKS[st.stick] || 3200, r = rng(i + 7), lp = 0;
    M.panModes(n.f, st).forEach(function (m) { addSine(y, sr, m.f, m.a * 0.6, m.T, 0); });
    var up = N.filter(function (m) { return m.ring === n.ring + 1 && m.i === n.i; })[0]; if (up && st.couple) M.panModes(up.f, st, "centre").slice(0, 2).forEach(function (m) { addSine(y, sr, m.f, m.a * 0.12 * st.couple, m.T * 0.9, 0.012); });
    var k = Math.min(1, fc / 6000), nn = Math.round(sr * 0.004); for (var c = 0; c < nn; c++) { var v = r(); lp += k * (v - lp); y[c] += 0.08 * lp * (1 - c / nn); }
    return y; };

  // ---------- tines ----------
  M.TINE = [1, 6.267, 17.55];
  M.tineModes = function (f, st) { return [{ f: f, a: 1, T: 1.6 * Math.pow(400 / f, 0.4) * (st && st.deze ? 1.2 : 1) }, { f: f * M.TINE[1], a: 0.35, T: 0.06 }, { f: f * M.TINE[2], a: 0.15, T: 0.02 }]; };
  M.tineRender = function (id, st, i, sr, dur) { st = M.clean(id, st); var T = M.tines(id, st), t = T[i] || T[0], y = new Float32Array(Math.round((dur || 2) * sr)), r = rng(i * 13 + 5);
    M.tineModes(t.f, st).forEach(function (m) { addSine(y, sr, m.f, m.a * 0.5, m.T, 0); });
    T.forEach(function (o) { if (o.i !== t.i && Math.abs(o.i - t.i) <= (id === "kalimba" ? 2 : 1) && (id !== "mbira" || o.reg === t.reg)) addSine(y, sr, o.f, 0.02, 0.4, 0.005); });   // neighbours (Wikipedia: secondary vibrations)
    if (st.buzz) { var env = 0, b1 = 0, b2 = 0, th = 0.12, rt = 0; for (var n = 0; n < y.length; n++) { env = Math.max(Math.abs(y[n]), env * 0.9995); if (env > th && (n % Math.round(sr / (t.f * 0.5)) === 0)) rt = 1; rt *= 0.97;
        var v = r() * rt * (env - th > 0 ? env - th : 0) * 2.2; b1 += 0.35 * (v - b1); b2 += 0.08 * (b1 - b2); y[n] += (b1 - b2) * 0.9; } }
    if (st.deze) { var f0 = 180, w = TAU * f0 / sr, R = 0.995, a1 = -2 * R * Math.cos(w), a2 = R * R, z1 = 0, z2 = 0; for (var m = 0; m < y.length; m++) { var o2 = y[m] - a1 * z1 - a2 * z2; z2 = z1; z1 = o2; y[m] = y[m] * 1.15 + o2 * 0.012; } }
    return y; };

  // ---------- one hit ----------
  M.hit = function (id, st, part, sr) { st = M.clean(id, st); var I = M.ITEMS[id], N = M.notes(id, st), q = N.filter(function (n) { return n.part === part; })[0] || N[0], y;
    if (I.kind === "sitar") { var sa = M.SA[st.sa];
      if (q.part === "taraf") { y = new Float32Array(Math.round(3 * sr)); M.taraf(id, st).forEach(function (ft, j) { var z = M.stringRender(ft, { dur: 3 - j * 0.05, jawari: 0.3, vel: 0.25 }, sr), o = Math.round(j * 0.05 * sr); for (var i = 0; i + o < y.length && i < z.length; i++) y[i + o] += z[i]; }); return y; }
      if (q.part === "chikari") { y = new Float32Array(Math.round(1.5 * sr)); [sa * 2, sa, sa * 1.5].forEach(function (f, j) { var z = M.stringRender(f, { dur: 1.5, jawari: st.jawari, vel: 0.35, T: 1.2 }, sr), o = Math.round(j * 0.012 * sr); for (var i = 0; i + o < y.length; i++) y[i + o] += z[i]; }); return y; }
      var meend = /^fret|open/.test(q.part) ? st.meend : 0; y = M.stringRender(q.f, { dur: 3, jawari: st.jawari, thread: 0.35, meend: meend }, sr);
      if (st.taraf) { var tr = M.tarafRender(id, st, q.f * Math.pow(2, meend / 12), sr, 3); for (var j = 0; j < y.length; j++) y[j] += tr[j]; } return y; }
    if (I.kind === "tanpura") { if (q.part === "cycle") return M.tanCycle(st, sr); return M.stringRender(q.f, { dur: 4, jawari: st.jawari, thread: st.thread, T: 6, vel: 0.6 }, sr); }
    if (I.kind === "pan") return M.panRender(+q.part.split(":")[1], st, sr, 2);
    return M.tineRender(id, st, +q.part.split(":")[1], sr, 2); };
  M.tanCycle = function (st, sr) { var sa = M.SA[st.sa], f = [sa * M.TAN[st.tuning].r, sa, sa, sa / 2], beat = 60 / st.tempo, dur = beat * 5 + 3, y = new Float32Array(Math.round(dur * sr));
    f.forEach(function (fr, j) { var z = M.stringRender(fr, { dur: dur - j * beat, jawari: st.jawari, thread: st.thread, T: 6, vel: 0.55 }, sr), o = Math.round(j * beat * sr); for (var i = 0; i < z.length && i + o < y.length; i++) y[i + o] += z[i]; }); return y; };

  // ---------- translate ----------
  M.translate = function (from, st, to) { var A = M.ITEMS[from], B = M.ITEMS[to], notes = []; st = M.clean(from, st);
    if (from === to) return { state: JSON.parse(JSON.stringify(st)), quality: "exact", notes: [] };
    var pair = [A.kind, B.kind].sort().join("+");
    if (pair === "sitar+tanpura") {
      if (A.kind === "sitar") { var R = M.RAGAS[st.raga].notes, tu = R.indexOf("P") >= 0 ? "P" : R.indexOf("M") >= 0 ? "M" : R.indexOf("N") >= 0 || R.indexOf("n") >= 0 ? "N" : "D", ns = M.clean(to, { sa: st.sa, jawari: st.jawari, tuning: tu });
        notes.push("Sa carried over (" + st.sa + "): exact.", "First string " + M.TAN[tu].name + " from raga " + M.RAGAS[st.raga].name + (tu === "P" ? " (it has Pa)." : tu === "M" ? " (no Pa: Wikipedia, \"Tanpura\": tuned down to Ma)." : " (no Pa, no shuddha Ma: Wikipedia, \"Tanpura\": Ni or Dha)."),
          "Jawari amount carried over: the same curved-bridge model on both.", "Lost: the melody, the frets, meend and the 13 sympathetic strings: a tanpura has none of them.");
        return { state: ns, quality: "approx", notes: notes }; }
      var raga = M.RAGAS.yaman, rid = "yaman"; if (st.tuning === "M") rid = "malkauns"; if (st.tuning === "N" || st.tuning === "D") rid = "yaman";
      notes.push("Sa carried over (" + st.sa + "): exact.", "Raga: the tanpura's tuning does not name one; " + M.RAGAS[rid].name + " chosen as a raga " + (st.tuning === "M" ? "without Pa" : "that fits") + " (approx: many ragas fit one drone).",
        "Jawari carried over; the thread place has no control on this sitar model (lost; players do adjust sitar jawari too, unverified).");
      return { state: M.clean(to, { sa: st.sa, jawari: st.jawari, raga: rid }), quality: "approx", notes: notes }; }
    if (pair === "tine+tine") { var ns2 = M.clean(to, { tonic: st.tonic, tuning: st.tuning, buzz: B.st.buzz, deze: B.st.deze }), q = "exact";
      notes.push("Tonic " + st.tonic + " and tuning " + M.TUNINGS[st.tuning].name + " carried over: the tines are retuned (both are tuned by sliding / hammering the keys).");
      if (st.tuning === "major" && to === "mbira") notes.push("A major-scale kalimba becomes a major-scale mbira: playable, but the usual mbira tunings (Nyamaropa etc.) are not major (approx: choose one under Tuning).");
      if (A.n !== B.n) { notes.push(A.n + " → " + B.n + " keys: the range " + (B.n > A.n ? "grows" : "shrinks") + "; the layout differs (kalimba: one row alternating left / right from a low centre; mbira: two registers left, one right), so each note moves to a new place (approx)."); q = "approx"; }
      if (st.buzz && !B.st.buzz) { notes.push("Buzzers lost: this kalimba has none (bottle caps can be added, unverified)."); q = "approx"; } else if (!st.buzz && B.st.buzz) notes.push("Buzzers on: the mbira's are part of the instrument (Wikipedia, \"Mbira\").");
      if (st.deze && !B.st.deze) { notes.push("The deze (calabash resonator) is lost on the kalimba."); q = "approx"; }
      if (st.tonic !== ns2.tonic) q = "lost"; return { state: ns2, quality: q, notes: notes }; }
    notes.push("Skipped: a " + A.short + " and a " + B.short + " share no tuning or setting worth carrying over (one is " + ({ sitar: "a plucked, fretted string", tanpura: "a plucked drone string", pan: "a struck steel note area", tine: "a plucked tine" })[A.kind] + ", the other " + ({ sitar: "a plucked, fretted string", tanpura: "a plucked drone string", pan: "a struck steel note area", tine: "a plucked tine" })[B.kind] + "). Only a pitch could move, and that is not a translation.");
    return { state: M.defaults(to), quality: "lost", notes: notes, skipped: true }; };
  M.summary = function (id, st) { st = M.clean(id, st); var I = M.ITEMS[id];
    if (I.kind === "sitar") return "Sitar, raga " + M.RAGAS[st.raga].name + ", Sa " + st.sa + ", jawari " + Math.round(st.jawari * 100) + " %, taraf " + (st.taraf ? "on" : "damped") + (st.meend ? ", meend " + st.meend : "");
    if (I.kind === "tanpura") return "Tanpura " + M.TAN[st.tuning].name + ", Sa " + st.sa + ", jawari " + Math.round(st.jawari * 100) + " %, thread " + Math.round(st.thread * 100) + " %";
    if (I.kind === "pan") return "Tenor pan, octave " + (st.oct >= 0 ? "+" : "") + st.oct + " c, twelfth " + (st.twelfth >= 0 ? "+" : "") + st.twelfth + " c, " + st.stick + " stick, " + st.place;
    return I.short + ", " + M.TUNINGS[st.tuning].name + " on " + st.tonic + (st.buzz ? ", buzzers" : "") + (st.deze ? ", in a deze" : ""); };

  // ---------- drawings (panel units), shared by the panel files ----------
  function ell(cx, cy, rx, ry, rot) { rot = rot || 0; var c = Math.cos(rot), s = Math.sin(rot), pt = function (a) { var x = rx * Math.cos(a), y = ry * Math.sin(a); return (cx + x * c - y * s).toFixed(1) + " " + (cy + x * s + y * c).toFixed(1); };
    var d = "M" + pt(0); for (var i = 1; i <= 24; i++) d += " L" + pt(TAU * i / 24); return d + " Z"; }
  M.ell = ell;
  M.draw = {
    sitar: function (st) { st = M.clean("sitar", st); var it = [], z = [], x0 = 120, x1 = 590, ma = M.SA[st.sa] * 4 / 3;
      it.push({ t: "shape", d: ell(70, 120, 62, 70), fill: "#9a5b2e", stroke: "ink", sw: 1.4, title: "Gourd body (tumba) with the wooden top (tabli)" },
        { t: "shape", d: "M60 108 h28 v24 h-28 Z", fill: "#e8dcc0", stroke: "ink", sw: 1, title: "Main bridge (badaa goraa): wide and curved: the jawari" },
        { t: "shape", d: "M98 136 h14 v10 h-14 Z", fill: "#e8dcc0", stroke: "ink", sw: 0.8, title: "Small bridge (chota goraa) for the sympathetic strings" },
        { t: "shape", d: "M110 96 L600 102 L600 138 L110 144 Z", fill: "#6b3a1e", stroke: "ink", sw: 1.2, title: "Neck (dand)" },
        { t: "shape", d: ell(632, 120, 26, 28), fill: "#9a5b2e", stroke: "ink", sw: 1, title: "Upper gourd (tumba on the neck: instrumental style)" });
      var F = M.frets(st), Lm = x1 - 74; F.forEach(function (fr, i) { var x = 74 + Lm * (1 - Math.pow(2, -fr.cents / 1200)); it.push({ t: "shape", d: "M" + x.toFixed(1) + " 97 q3 23 0 46", fill: "none", stroke: fr.used ? "#d9d2c0" : "#7a6f5c", sw: fr.used ? 2.4 : 1.4, op: fr.used ? 1 : 0.6, title: "Fret " + (i + 1) + ": " + M.SW_NAME[fr.k] + (fr.used ? "" : " (the raga leaves it out)") + ": click to play" });
        if (fr.used) it.push({ t: "label", x: x, y: 92, text: fr.k.replace("#", "♯"), size: 7, dim: true }); var xp = i ? 74 + Lm * (1 - Math.pow(2, -F[i - 1].cents / 1200)) : 112; z.push({ part: "fret:" + i, x: xp, y: 112, w: x - xp, h: 12 }); });
      [[106, "#e0e0e0", "chikari strings (high Sa, Sa, Pa)", "chikari"], [110, "#e0e0e0", "", "chikari"], [114, "#e0e0e0", "", "chikari"], [118, "#f0d080", "main string (baaj): Ma: click a fret space", "main"], [124, "#f0d080", "jod: Sa", "jod"], [130, "#c0a070", "kharaj: low Sa, low Pa", "kharaj"], [134, "#c0a070", "", "kharaj"]]
        .forEach(function (s) { it.push({ t: "shape", d: "M74 " + s[0] + " L" + x1 + " " + (s[0] - 2), fill: "none", stroke: s[1], sw: s[3] === "main" ? 1.3 : 0.8, title: s[2] || s[3] }); });
      for (var j = 0; j < 13; j++) it.push({ t: "shape", d: "M104 " + (139 + j * 0.3).toFixed(1) + " L" + (300 + j * 22) + " 141", fill: "none", stroke: "#8f8a80", sw: 0.4, op: 0.8, title: "sympathetic string (taraf) " + (j + 1) + " under the frets: " + name12(M.taraf("sitar", st)[j]) + " here" });
      it.push({ t: "label", x: 330, y: 170, text: "TARAF: 13 SYMPATHETIC STRINGS UNDER THE FRETS", size: 7, dim: true });
      z.push({ part: "jod", x: 112, y: 124, w: 80, h: 4 }, { part: "kharaj", x: 112, y: 128, w: 80, h: 8 }, { part: "chikari", x: 112, y: 103, w: 470, h: 9 }, { part: "taraf", x: 104, y: 137, w: 480, h: 8 }, { part: "open", x: 60, y: 108, w: 28, h: 24 });
      return { items: it, zones: z }; },
    tanpura: function (st) { st = M.clean("tanpura", st); var it = [], z = [];
      it.push({ t: "shape", d: ell(80, 110, 70, 74), fill: "#b57a3e", stroke: "ink", sw: 1.4, title: "Gourd (tumba) and carved top (tabli)" }, { t: "shape", d: "M140 92 L610 98 L610 122 L140 128 Z", fill: "#7a4a22", stroke: "ink", sw: 1.2, title: "Neck (dand): no frets" },
        { t: "shape", d: "M62 92 h26 v36 h-26 Z", fill: "#e8dcc0", stroke: "ink", sw: 1, title: "Bridge: table-shaped, curved top (jawari)" });
      var names = ["1st: " + M.TAN[st.tuning].name.split("-")[0], "2nd: sa", "3rd: sa", "4th: low Sa"], col = ["#c9a86a", "#e0e0e0", "#e0e0e0", "#c9a86a"];
      for (var s = 0; s < 4; s++) { var y = 99 + s * 7.5; it.push({ t: "shape", d: "M40 " + y + " L600 " + (y + 0.5), fill: "none", stroke: col[s], sw: s === 3 ? 1.6 : 1.1, title: names[s] + ": click to pluck" },
          { t: "shape", d: ell(70 + st.thread * 14, y, 1.8, 1.8), fill: "#fff", stroke: "#888", sw: 0.4, title: "cotton thread (juari / jiva): Thread place moves it" }, { t: "shape", d: ell(560, y, 4, 3), fill: "#f5f0e0", stroke: "#888", sw: 0.4, title: "bead for fine tuning" });
        it.push({ t: "label", x: 620, y: y + 2, text: names[s], size: 7, anchor: "start", dim: true }); z.push({ part: "s" + (s + 1), x: 150, y: y - 3.5, w: 440, h: 7 }); }
      return { items: it, zones: z }; },
    pan: function () { var it = [], z = [], cx = 260, cy = 220, N = M.panNotes(); it.push({ t: "shape", d: ell(cx, cy, 205, 205), fill: "#c9ccd0", stroke: "ink", sw: 2, title: "The pan's rim (the top of the drum, chromed)" }, { t: "shape", d: ell(cx, cy, 196, 196), fill: "#dfe2e6", stroke: "#9aa0a6", sw: 1, title: "The playing surface, sunk into a bowl" });
      N.forEach(function (n, i) { var ang = -Math.PI / 2 + TAU * n.i / 12, R = [150, 88, 38][n.ring], rx = [38, 24, 15][n.ring], ry = [27, 17, 12][n.ring], x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
        if (n.ring === 2) { var j = ["C6", "C#6", "D6", "Eb6", "E6"].indexOf(n.name), a2 = -Math.PI / 2 + TAU * j / 5; x = cx + R * Math.cos(a2); y = cy + R * Math.sin(a2); }
        it.push({ t: "shape", d: ell(x, y, rx, ry, ang + Math.PI / 2), fill: "#eef0f2", stroke: "#6b7076", sw: 1, title: n.name + ": click to strike (the larger the area, the lower)" }, { t: "label", x: x, y: y + 3, text: n.name.replace(/\d/, ""), size: [10, 8, 7][n.ring] });
        z.push({ part: "note:" + i, cx: x, cy: y, r: Math.max(rx, ry), kind: "ell" }); });
      return { items: it, zones: z }; },
    tines: function (id, st) { var it = [], z = [], T = M.tines(id, st), I = M.ITEMS[id], isK = id === "kalimba", fmax = Math.max.apply(null, T.map(function (t) { return t.f; }));
      it.push({ t: "shape", d: isK ? "M60 40 h400 v300 q-200 30 -400 0 Z" : "M50 50 h420 v250 h-420 Z", fill: I.finish, stroke: "ink", sw: 1.4, title: isK ? "The board / box (soundboard)" : "Hardwood soundboard (gwariva)" });
      if (isK) it.push({ t: "shape", d: ell(260, 250, 32, 32), fill: "#3b2414", stroke: "ink", sw: 1, title: "Sound hole" }); else it.push({ t: "shape", d: ell(440, 270, 9, 9), fill: "#2a1a10", stroke: "ink", sw: 1, title: "Hole for the right little finger (Wikipedia)" });
      it.push({ t: "shape", d: "M70 90 h380 v8 h-380 Z", fill: "#888", stroke: "ink", sw: 0.8, title: "Bridge and bar that clamp the tines" });
      T.forEach(function (t) { var L = 40 + 150 * Math.sqrt(T[0].f / t.f) * (isK ? 1 : 0.95), x, w = isK ? 16 : 12, y0 = 94;   // f ~ 1 / L^2 (cantilever)
        if (isK) x = 260 + t.side * t.slot * 20 - w / 2; else x = t.reg === "right" ? 290 + t.slot * 20 : t.reg === "left-up" ? 70 + t.slot * 26 : 82 + t.slot * 26;
        var yy = t.reg === "left-low" ? y0 + 6 : y0; if (t.reg === "left-low") L *= 0.85;
        it.push({ t: "shape", d: "M" + x.toFixed(1) + " " + (yy - 50) + " h" + w + " v" + (L + 50).toFixed(1) + " q-" + (w / 2) + " 6 -" + w + " 0 Z", fill: t.reg === "left-low" ? "#8d939a" : "#c9ccd0", stroke: "ink", sw: 0.8, title: name12(t.f) + (isK ? "" : " (" + t.reg + " register)") + ": click to pluck" });
        it.push({ t: "label", x: x + w / 2, y: yy + L + 12, text: name12(t.f).replace(/-?\d+$/, ""), size: 7, dim: true }); z.push({ part: "tine:" + t.i, x: x, y: yy - 50, w: w, h: L + 50 }); });
      if (!isK) for (var b = 0; b < 6; b++) it.push({ t: "shape", d: ell(110 + b * 52, 285, 7, 7), fill: "#b0a060", stroke: "#555", sw: 0.6, title: "Buzzers (machachara): bottle caps on a plate" });
      return { items: it, zones: z }; }
  };
  M.zoneAt = function (L, x, y) { var Z = L.zones || [], best = null;
    Z.forEach(function (z) { var hit = z.kind === "ell" ? Math.hypot(x - z.cx, y - z.cy) <= z.r : x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; if (hit && (!best || (z.kind === "ell" ? Math.hypot(x - z.cx, y - z.cy) : 0) < best.d)) best = { z: z, d: z.kind === "ell" ? Math.hypot(x - z.cx, y - z.cy) : 0 }; });
    return best ? best.z.part : null; };

  if (typeof module !== "undefined" && module.exports) { module.exports = M; }
  if (typeof document === "undefined") { global.WorldInst = M; return; }

  // ======================= browser: sound =======================
  var ctx = null, master = null, playing = [], SR = 32000, CACHE = {};
  function ac() { if (!ctx) { ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.7;
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15; master.connect(lim); lim.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "WorldInst"); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  M.ctx = function () { return ac(); };
  M.stop = function () { playing.forEach(function (s) { try { s.stop(); } catch (e) {} }); playing = []; if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("worldinst", null); };
  function buf(y) { var c = ac(), b = c.createBuffer(1, y.length, SR), d = b.getChannelData(0); for (var i = 0; i < y.length; i++) d[i] = y[i]; return b; }
  function sched(b, when, gain, dest) { var c = ac(), s = c.createBufferSource(), g = c.createGain(); g.gain.value = gain == null ? 0.7 : gain; s.buffer = b; s.connect(g); g.connect(dest || master); s.start(when || 0); playing.push(s);
    if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("worldinst", M.stop); return s; }
  M.play = function (W, part) { ac(); var key = W.id + "|" + part + "|" + JSON.stringify(W.st); if (!CACHE[key]) { var y = M.hit(W.id, W.st, part, SR); CACHE[key] = { y: y, b: buf(y) }; } sched(CACHE[key].b, 0); return CACHE[key].y; };
  // a tanpura drone for any page: WorldInst.drone({ sa: Hz or "C#", tuning: "P", jawari, thread, tempo, gain }) -> { stop, set }
  M.drone = function (o) { o = o || {}; var c = ac(), out = c.createGain(), st, timer = null, next = 0, j = 0, srcs = [], bufs = [], live = true; out.gain.value = o.gain == null ? 0.5 : o.gain; out.connect(master);
    function build() { var sa = typeof o.sa === "number" ? o.sa : M.SA[o.sa] || M.SA["C#"]; st = M.clean("tanpura", o); var fr = [sa * M.TAN[st.tuning].r, sa, sa, sa / 2];
      bufs = fr.map(function (f) { return buf(M.stringRender(f, { dur: 6, jawari: st.jawari, thread: st.thread, T: 6, vel: 0.5 }, SR)); }); }
    build(); next = c.currentTime + 0.05;
    function tick() { if (!live) return; var beat = 60 / st.tempo; while (next < c.currentTime + 0.4) { var i = j % 5; if (i < 4) { var s = c.createBufferSource(); s.buffer = bufs[i]; s.connect(out); s.start(next); srcs.push(s); if (srcs.length > 12) srcs.shift(); } next += beat; j++; } timer = setTimeout(tick, 100); }
    tick(); return { stop: function () { live = false; clearTimeout(timer); srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); out.disconnect(); }, set: function (p) { Object.assign(o, p); build(); }, state: function () { return st; } }; };

  // ======================= browser: widgets =======================
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  M.adapter = function (W) { var subs = []; W._notify = function () { subs.forEach(function (f) { f(); }); };
    return { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, onChange: function (cb) { subs.push(cb); }, range: function (k) { return M.ctl(W.id, k); } }; };
  M.widgets = [];
  function plot(el, y, f0) { var Wd = 520, Ht = 110, cols = 60, rows = 24, dur = Math.min(y.length / SR, 3), mx = 1e-12, G = [];
    for (var c = 0; c < cols; c++) { var t0 = c * dur / cols, t1 = t0 + dur / cols, row = []; for (var r = 0; r < rows; r++) { var e = M.gz(y, SR, f0 * (r + 1), t0, t1); row.push(e); mx = Math.max(mx, e); } G.push(row); }
    var s = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" class="wi-svg" role="img" aria-label="Partials over time"><rect width="' + Wd + '" height="' + Ht + '" class="wi-bg"/>';
    G.forEach(function (row, c) { row.forEach(function (e, r) { var v = Math.max(0, 1 + Math.log10(e / mx + 1e-12) / 4); if (v > 0.02) s += '<rect x="' + (c * Wd / cols).toFixed(1) + '" y="' + (Ht - 14 - (r + 1) * (Ht - 18) / rows).toFixed(1) + '" width="' + (Wd / cols + 0.5).toFixed(1) + '" height="' + ((Ht - 18) / rows + 0.5).toFixed(1) + '" class="wi-cell" opacity="' + v.toFixed(2) + '"/>'; }); });
    el.innerHTML = s + '<text x="6" y="' + (Ht - 3) + '">Partials 1-' + rows + ' of ' + Math.round(f0) + ' Hz (up) over the first ' + dur.toFixed(1) + ' s (across), 40 dB. Jawari: watch the upper rows grow.</text></svg>'; }
  function face(host, W) { host.innerHTML = ""; if (!global.FaithfulPanel) { host.textContent = "(panel script missing)"; return; } var pid = "wi-" + W.id;
    FaithfulPanel.load(pid).then(function () { var B = FaithfulPanel.LAYOUTS[pid]; if (!B._base) B._base = B; B = B._base; var g = B.build(W.st);
      var L = Object.assign({}, B, { items: g.items.concat(B.controls || []), zones: g.zones, _base: B }); FaithfulPanel.LAYOUTS[pid] = L; W.L = L; W.face = FaithfulPanel.mount(host, { id: pid, adapter: W.A }); var root = host;
      root.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-ctl]")) return; var svg = e.target.closest && e.target.closest("svg.fp-svg"); if (!svg) return; var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, L2 = W.L;
        var p = M.zoneAt(L2, (e.clientX - r.left) * vb.width / r.width + vb.x, (e.clientY - r.top) * vb.height / r.height + vb.y); if (p) W.hit(p); }); }).catch(function () { host.textContent = "(drawing failed to load)"; }); }
  M.mount = function (el, o) { o = o || {}; var W = { id: M.ITEMS[o.item] ? o.item : "sitar" }; W.I = M.ITEMS[W.id]; W.st = M.clean(W.id, o.state); W.A = M.adapter(W); M.widgets.push(W);
    el.classList.add("wi-w"); el.innerHTML = ""; var head = h("div", "wi-head"), title = h("b", "wi-title"); head.appendChild(title); el.appendChild(head);
    if (o.choose) { var se = h("select", "wi-pick"); se.setAttribute("aria-label", "Choose an instrument"); M.IDS.forEach(function (id) { var op = h("option", null, M.ITEMS[id].name); op.value = id; se.appendChild(op); }); se.onchange = function () { W.setItem(se.value); }; head.appendChild(se); W.pick = se; }
    var fh = h("div", "wi-face"), bar = h("div", "wi-bar"), pl = h("div", "wi-plot"), inf = h("p", "wi-info"); el.appendChild(fh); el.appendChild(bar); el.appendChild(pl); el.appendChild(inf);
    function buttons() { bar.innerHTML = ""; var N = M.notes(W.id, W.st), pick = W.I.kind === "sitar" ? ["open", "fret:2", "fret:6", "jod", "chikari", "taraf"] : W.I.kind === "tanpura" ? ["s1", "s2", "s4", "cycle"] : W.I.kind === "pan" ? ["note:0", "note:12", "note:24"] : ["tine:0", "tine:1", "tine:2", "tine:5"];
      pick.forEach(function (p) { var q = N.filter(function (n) { return n.part === p; })[0]; if (!q) return; var b = h("button", "wi-hit", q.name.replace(/ \(.*\)/, "")); b.type = "button"; b.dataset.part = p; b.onclick = function () { W.hit(p); }; bar.appendChild(b); });
      if (W.I.kind === "tanpura") { var db = h("button", "wi-drone", "▶ Drone (loop)"); db.type = "button"; db.onclick = function () { if (W.dr) { W.dr.stop(); W.dr = null; db.textContent = "▶ Drone (loop)"; return; } W.dr = M.drone(Object.assign({}, W.st)); db.textContent = "■ Stop drone"; }; bar.appendChild(db); }
      var sb = h("button", "wi-stop", "■ Stop"); sb.type = "button"; sb.onclick = function () { M.stop(); if (W.dr) { W.dr.stop(); W.dr = null; } }; bar.appendChild(sb); }
    function info() { inf.textContent = M.summary(W.id, W.st) + ". " + W.I.about + "."; }
    W.hit = function (part) { var y = M.play(W, part), q = M.notes(W.id, W.st).filter(function (n) { return n.part === part; })[0]; plot(pl, y, q && q.part !== "chikari" && q.part !== "taraf" && q.part !== "cycle" ? q.f * Math.pow(2, (W.I.kind === "sitar" && /^fret|open/.test(part) ? W.st.meend : 0) / 12) : (q ? q.f : 200)); el.dataset.last = part; return y; };
    W.set = function (k, v) { W.st = M.clean(W.id, Object.assign({}, W.st, (function () { var x = {}; x[k] = v; return x; })())); W._notify(); info(); if (W.dr) W.dr.set(W.st); if (/raga|sa|tuning|tonic/.test(k)) { face(fh, W); buttons(); } };
    W.setAll = function (s) { W.st = M.clean(W.id, s); W._notify(); info(); face(fh, W); buttons(); };
    W.setItem = function (id, st) { if (W.dr) { W.dr.stop(); W.dr = null; } W.id = id; W.I = M.ITEMS[id]; W.st = M.clean(id, st || {}); W.A = M.adapter(W); el.dataset.item = id; title.textContent = W.I.name; if (W.pick) W.pick.value = id; face(fh, W); buttons(); info(); };
    W.setItem(W.id, W.st); return W; };
  M.compare = function (el) { el.innerHTML = ""; var cols = h("div", "wic-cols"), a = h("div", "wic-a"), b = h("div", "wic-b"); cols.appendChild(a); cols.appendChild(b); el.appendChild(cols);
    var q = new URLSearchParams(location.search), first = !document.querySelector(".wic[data-done]"), ia = (first && q.get("a")) || el.dataset.a, ib = (first && q.get("b")) || el.dataset.b; el.dataset.done = "1";
    if (!M.ITEMS[ia]) ia = "sitar"; if (!M.ITEMS[ib]) ib = "tanpura";
    var WA = M.mount(a, { item: ia, choose: true }), WB = M.mount(b, { item: ib, choose: true });
    var box = h("div", "wic-tr"), ab = h("button", "wic-ab", "▶ A then B"), go = h("button", "wic-go", "Translate A → B"), back = h("button", "wic-back", "Translate B → A"), res = h("div", "wic-res");
    [ab, go, back].forEach(function (x) { x.type = "button"; box.appendChild(x); }); box.appendChild(res); el.appendChild(box);
    function main(W) { return W.I.kind === "sitar" ? "fret:4" : W.I.kind === "tanpura" ? "s2" : W.I.kind === "pan" ? "note:0" : "tine:0"; }
    ab.onclick = function () { M.stop(); var y = WA.hit(main(WA)); setTimeout(function () { WB.hit(main(WB)); }, Math.min(2500, y.length / SR * 1000) + 200); };
    function run(F, T) { var r = M.translate(F.id, F.st, T.id); T.setAll(r.state); res.innerHTML = ""; var p = h("p"); p.innerHTML = "<b></b> → <b></b> <span class=\"wic-q wic-" + r.quality + "\">" + (r.skipped ? "skipped" : r.quality) + "</span>";
      p.querySelectorAll("b")[0].textContent = M.summary(F.id, F.st); p.querySelectorAll("b")[1].textContent = M.summary(T.id, T.st); res.appendChild(p);
      var ul = h("ul"); r.notes.forEach(function (n) { ul.appendChild(h("li", null, n)); }); res.appendChild(ul); el.dataset.quality = r.skipped ? "skipped" : r.quality; return r; }
    go.onclick = function () { run(WA, WB); }; back.onclick = function () { run(WB, WA); }; el._wic = { a: WA, b: WB, run: run }; return el._wic; };
  function steps() { var n = 0; document.querySelectorAll(".wi-step").forEach(function (s) { n++; var b = h("button", "wi-hear", "▶ Hear step " + n); b.type = "button";
      b.onclick = function () { var W = M.widgets.filter(function (w) { return w.id === s.dataset.item; })[0] || M.widgets[0]; if (!W) return; M.stop();
        W.setAll(Object.assign(M.defaults(W.id), s.dataset.set ? JSON.parse(s.dataset.set) : {})); var hp = s.dataset.hit || ""; if (hp === "drone") { if (W.dr) W.dr.stop(); W.dr = M.drone(Object.assign({}, W.st)); setTimeout(function () { if (W.dr) { W.dr.stop(); W.dr = null; } }, 12000); } else W.hit(hp || M.notes(W.id, W.st)[0].part); };
      s.insertBefore(b, s.firstChild); }); }
  function quiz(q) { var a = +q.dataset.a, why = q.querySelector(".wi-why"); if (why) why.hidden = true;
    q.querySelectorAll("li").forEach(function (li, i) { li.tabIndex = 0; li.setAttribute("role", "button"); var f = function () { q.querySelectorAll("li").forEach(function (x) { x.classList.remove("wi-right", "wi-wrong"); }); li.classList.add(i === a ? "wi-right" : "wi-wrong"); if (why) why.hidden = false; };
      li.onclick = f; li.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; }); }
  var TR = null; M.tracks = function () { return TR || (TR = fetch("/apps/shared/data/world-instruments/tracks.json").then(function (r) { return r.json(); })); };
  function tracks(el) { M.tracks().then(function (d) { var list = d.tracks.filter(function (t) { return t.item === el.dataset.item; }), ul = h("ul", "wi-tl");
      list.forEach(function (t) { var li = h("li"), a = h("a", null, t.artist + ", “" + t.song + "”"); a.href = t.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a);
        li.appendChild(document.createTextNode(t.channel ? " ↗ (" + t.channel + "). " : " ↗ (a YouTube search: no video checked). "));
        li.appendChild(h("span", "wi-who", t.useSrc ? "Source: " + t.useSrc + "." : "That this instrument is on the record: unverified (no source found).")); ul.appendChild(li); });
      el.innerHTML = ""; el.appendChild(ul); el.dataset.n = list.length; }).catch(function () { el.textContent = "(the track list did not load)"; }); }
  M.init = function () { document.querySelectorAll(".wi[data-item]").forEach(function (e) { M.mount(e, { item: e.dataset.item }); });
    document.querySelectorAll(".wic").forEach(function (e) { M.compare(e); }); steps(); document.querySelectorAll(".wi-q").forEach(quiz); document.querySelectorAll(".wi-tracks").forEach(tracks); };
  global.WorldInst = M;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", M.init); else M.init();
})(typeof window !== "undefined" ? window : globalThis);
