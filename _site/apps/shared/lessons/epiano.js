// EPiano: electric pianos as physical / modal models, one engine with a profile per instrument (2026-11-26).
//   Profiles: rhodes (Fender Rhodes Mark I Stage 73), suitcase (Mark I Suitcase 73: the same action with its stereo tremolo,
//   labelled "vibrato"), wurli (Wurlitzer 200A), clav (Hohner Clavinet D6), cp70 (Yamaha CP-70 electric grand), pianet (Hohner Pianet N).
//
// HOW EACH ONE IS MODELLED (one note is rendered once into an AudioBuffer by EPiano.render, then cached):
//   rhodes / suitcase: a tine (a stiff cantilever: fundamental plus inharmonic beam modes at 6.27 and 17.55 x, short-lived = the
//     bell of the attack) coupled to its tonebar (a second, slightly detuned mode at the fundamental that sustains). The tine's
//     displacement x goes through an electromagnetic pickup: flux phi(x) = 1 / (1 + (x + offset)^2), output = d phi / dt. The
//     offset is the tine's position against the pickup's centre ("Pickup voicing", a service adjustment): near the centre the
//     pickup doubles the frequency (thin, quacky); further off it is cleaner. Hit harder, x grows into the curve's bend: the bark.
//   wurli / pianet: a reed (cantilever, second mode at about 5.8 x for the Wurlitzer's loaded reed) and an electrostatic pickup:
//     current ~ d/dt [1 / (1 - k x)] (capacitance of reed against plate, k = how close the reed sits). Asymmetric, so hard notes gain
//     even harmonics and growl; the 200A's amplifier (Drive) adds more.
//   clav: a string struck by a tangent and held against the anvil while the key is down (harmonic partials, tiny stretch, strike
//     near the end = bright), read by two pickups at two places along it (each pickup a comb: sin(n pi p)). Rockers A/B and C/D pick
//     the pickups (this page's reading: C+A upper, C+B lower, D+A both, D+B both out of phase: UNVERIFIED). Tabs: Brilliant and
//     Treble = high-pass, Medium and Soft = low-pass (Wikipedia "Clavinet"; the corner frequencies are this page's). Mute slider =
//     a felt laid on the strings: shorter decay, highs first. Key up: the yarn damps it at once.
//   cp70: real piano strings (one to three a note, slightly detuned: beating), inharmonic partials f_n = n f sqrt(1 + B n^2) with a
//     larger B in the bass (its bass strings are short: Wikipedia "Yamaha CP-70"), a hammer whose spectrum widens with velocity, a
//     piezo pickup under the bridge (no soundboard), prompt sound then aftersound.
//   Live circuit after the notes (per widget): amp drive (tanh), 3-band EQ, speaker roll-off, tremolo (mono, or stereo auto-pan on
//   the Suitcase), volume. All numbers (decay times, offsets, corner frequencies, tremolo rates) are this page's choices, not
//   measured from instruments; nobody has compared the sound with the real ones.
//
// CONTROLS: PROFILES[id].groups = [[group name, null, [[key, label, "k"|"s"|"c", min | [choices], max, step, default, where]]]]
//   where = "panel" (on the real instrument's panel), "inside" (a service adjustment inside it), "page" (this page's own).
//   Which controls each real instrument has: rhodes Volume + Bass, suitcase Volume / Bass / Treble / Vibrato / Speed, wurli Volume +
//   Vibrato (single speed), cp70 Volume / Bass / Middle / Treble / Tremolo speed + depth, pianet volume pedal + vibrato switch:
//   from memory, UNVERIFIED (the service manuals were not read for this page); Clavinet tabs, rockers and mute slider: Wikipedia.
// API: EPiano.render(id, st, midi, vel 0..1, sampleRate) -> Float32Array   (pure; usable in node)
//      EPiano.translate(st, from, to) -> { st, notes: [{ k, kind: "exact"|"approx"|"lost", text }] }
//      EPiano.defaults(id)  .range(id, k)  .PROFILES  .ORDER  .RIFFS
//      EPiano.mount(div) -> widget (also every <div class="epc" data-model data-to data-compact> on load): EPiano.widgets
//      widget: .id .st .setModel(id) .set(k, v) .setAll(obj = {model?, key: value}: defaults first, then these) .noteOn(m, vel) .noteOff(m) .phrase(riff?) -> Promise .stop() .analyser()
// Every AudioContext registers with AudioTap.register.
(function (G) {
  var EP = G.EPiano = G.EPiano || {};
  function K(k, l, min, max, step, def, w) { return [k, l, "k", min, max, step, def, w]; }
  function SW(k, l, def, w) { return [k, l, "s", 0, 1, 1, !!def, w]; }
  function CH(k, l, opts, def, w) { return [k, l, "c", opts, null, null, def, w]; }
  var RH_IN = [K("voice", "Pickup voicing (tine offset)", 0, 10, 0.1, 4, "inside"), K("hard", "Hammer tip hardness", 0, 10, 0.1, 5, "inside"),
    K("tbar", "Tonebar sustain", 0, 10, 0.1, 6, "inside")];
  var AMP = function (d) { return [K("drive", "Amp drive", 0, 10, 0.1, d, "page"), K("treble", "Amp treble", 0, 10, 0.1, 5, "page")]; };
  EP.PROFILES = {
    rhodes: { name: "Fender Rhodes Mark I Stage 73", short: "Rhodes Stage", year: "1970", lo: 28, hi: 100, rel: 0.12, riff: "ballad",
      groups: [["Name rail", null, [K("vol", "Volume", 0, 10, 0.1, 7, "panel"), K("bass", "Bass boost", 0, 10, 0.1, 5, "panel")]],
        ["Inside the piano", null, RH_IN], ["The amplifier (not part of the Stage)", null, AMP(3)]] },
    suitcase: { name: "Fender Rhodes Mark I Suitcase 73", short: "Rhodes Suitcase", year: "1970", lo: 28, hi: 100, rel: 0.12, riff: "ballad", stereo: true,
      groups: [["Name rail", null, [K("vol", "Volume", 0, 10, 0.1, 7, "panel"), K("bass", "Bass", 0, 10, 0.1, 5, "panel"), K("treble", "Treble", 0, 10, 0.1, 5, "panel"),
        K("vib", "Vibrato (intensity)", 0, 10, 0.1, 5, "panel"), K("rate", "Vibrato speed", 0, 10, 0.1, 5, "panel")]],
        ["Inside the piano", null, RH_IN], ["The built-in amplifier", null, [K("drive", "Amp drive", 0, 10, 0.1, 2, "page")]]] },
    wurli: { name: "Wurlitzer 200A", short: "Wurlitzer", year: "1974", lo: 33, hi: 96, rel: 0.09, riff: "soul",
      groups: [["Controls", null, [K("vol", "Volume", 0, 10, 0.1, 7, "panel"), K("vib", "Vibrato", 0, 10, 0.1, 0, "panel")]],
        ["Inside the piano", null, [K("gap", "Reed to pickup gap (closer = more bark)", 0, 10, 0.1, 5, "inside"), K("hard", "Hammer felt hardness", 0, 10, 0.1, 5, "inside"),
          K("drive", "Amp drive", 0, 10, 0.1, 4, "page"), K("tone", "Speaker brightness", 0, 10, 0.1, 5, "page")]]] },
    clav: { name: "Hohner Clavinet D6", short: "Clavinet", year: "1971", lo: 29, hi: 88, rel: 0.04, riff: "funk",
      groups: [["Tone tabs", null, [SW("brill", "Brilliant", false, "panel"), SW("treb", "Treble", true, "panel"), SW("med", "Medium", false, "panel"), SW("soft", "Soft", false, "panel")]],
        ["Pickups", null, [CH("pa", "Rocker A / B", ["A", "B"], "A", "panel"), CH("pc", "Rocker C / D", ["C", "D"], "C", "panel")]],
        ["Mute", null, [K("mute", "Mute slider", 0, 10, 0.1, 0, "panel")]],
        ["Output", null, [K("vol", "Output level (amp)", 0, 10, 0.1, 7, "page"), K("drive", "Amp drive", 0, 10, 0.1, 2, "page")]]] },
    cp70: { name: "Yamaha CP-70", short: "CP-70", year: "1976", lo: 28, hi: 100, rel: 0.22, riff: "ballad",
      groups: [["Panel", null, [K("vol", "Volume", 0, 10, 0.1, 7, "panel"), K("bass", "Bass", 0, 10, 0.1, 5, "panel"), K("mid", "Middle", 0, 10, 0.1, 5, "panel"),
        K("treble", "Treble", 0, 10, 0.1, 5, "panel"), K("rate", "Tremolo speed", 0, 10, 0.1, 5, "panel"), K("trem", "Tremolo depth", 0, 10, 0.1, 0, "panel")]],
        ["Inside", null, [K("detune", "Unison spread", 0, 10, 0.1, 3, "inside"), K("hard", "Hammer hardness", 0, 10, 0.1, 5, "inside"), K("piezo", "Piezo brightness", 0, 10, 0.1, 5, "page")]]] },
    pianet: { name: "Hohner Pianet N", short: "Pianet", year: "1965", lo: 29, hi: 89, rel: 0.035, riff: "soul",
      groups: [["Controls", null, [K("vol", "Volume pedal", 0, 10, 0.1, 8, "panel"), SW("vibOn", "Vibrato", false, "panel")]],
        ["Inside", null, [K("pad", "Pad grip (pluck strength)", 0, 10, 0.1, 5, "inside"), K("gap", "Reed to pickup gap", 0, 10, 0.1, 4, "inside")]]] }
  };
  EP.ORDER = ["rhodes", "suitcase", "wurli", "clav", "cp70", "pianet"];
  function ctl(id, k) { var r = null; EP.PROFILES[id].groups.forEach(function (g) { g[2].forEach(function (c) { if (c[0] === k) r = c; }); }); return r; }
  EP.range = ctl;
  EP.keys = function (id) { var o = []; EP.PROFILES[id].groups.forEach(function (g) { g[2].forEach(function (c) { o.push(c[0]); }); }); return o; };
  EP.defaults = function (id) { var s = {}; EP.keys(id).forEach(function (k) { s[k] = ctl(id, k)[6]; }); return s; };
  var RENDER_KEYS = { rhodes: ["voice", "hard", "tbar"], suitcase: ["voice", "hard", "tbar"], wurli: ["gap", "hard"], clav: ["brill", "treb", "med", "soft", "pa", "pc", "mute"],
    cp70: ["detune", "hard", "piezo"], pianet: ["pad", "gap"] };
  EP.RENDER_KEYS = RENDER_KEYS;

  // ---------- the engine ----------
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(st, id, k) { var v = st && st[k] != null ? st[k] : ctl(id, k)[6]; return +v; }
  // a decaying sinusoid by complex rotation (cheap): adds a * e^(-t/tau) * sin(2 pi f t + ph) into out
  function mode(out, sr, f, a, tau, ph) {
    if (!(f > 0) || f > sr * 0.45 || !a) return;
    var w = 2 * Math.PI * f / sr, r = Math.exp(-1 / (tau * sr)), c = Math.cos(w) * r, s = Math.sin(w) * r, re = Math.cos(ph || 0) * a, im = Math.sin(ph || 0) * a, n = out.length;
    for (var i = 0; i < n; i++) { out[i] += im; var nr = re * c - im * s; im = re * s + im * c; re = nr; if (i % 2048 === 0 && Math.abs(re) + Math.abs(im) < 1e-6) break; }
  }
  function biquad(x, sr, type, f0, q) {   // RBJ cookbook, in place
    var w = 2 * Math.PI * f0 / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * (q || 0.707)), b0, b1, b2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) { var x0 = x[i], y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0; }
  }
  var MODEL = {};
  function reedTine(id, st, m, vel, sr, o) {   // shared by Rhodes (magnetic) and Wurli / Pianet (electrostatic)
    var f = hz(m), span = (m - o.lo) / (o.hi - o.lo), dur = clamp(o.d0 - span * (o.d0 - o.d1), o.d1, o.d0), n = Math.round(dur * sr);
    var x = new Float32Array(n + 1);
    mode(x, sr, f, 1, o.tau * (1 - 0.55 * span), 0);
    if (o.bar) mode(x, sr, f * 1.0012, o.bar, o.tau * 1.4 * (1 - 0.5 * span), 0);
    mode(x, sr, f * o.r2, o.a2, o.t2, 0); if (o.a3) mode(x, sr, f * 17.55, o.a3, 0.015, 0);
    var y = new Float32Array(n), X = o.X, g = sr / (2 * Math.PI * f), prev = o.pick(0), p;
    for (var i = 0; i < n; i++) { p = o.pick(X * x[i]); y[i] = (p - prev) * g * o.norm; prev = p; }
    var att = Math.round(0.0015 * sr); for (i = 0; i < att && i < n; i++) y[i] *= i / att;   // hammer contact time
    return y;
  }
  MODEL.rhodes = MODEL.suitcase = function (st, m, vel, sr, id) {
    var voice = num(st, id, "voice") / 10, hard = num(st, id, "hard") / 10, tb = num(st, id, "tbar") / 10, off = 0.12 + voice * 0.9;
    return reedTine(id, st, m, vel, sr, { lo: 28, hi: 100, d0: 5, d1: 1.2, tau: 0.9 + tb * 3, bar: 0.2 + tb * 0.3, r2: 6.27, a2: (0.04 + 0.3 * hard) * (0.3 + vel), t2: 0.05 + 0.08 * hard,
      a3: 0.06 * hard * vel, X: 0.18 + 1.5 * vel * vel, norm: 1 / 0.65, pick: function (x) { var u = x + off; return 1 / (1 + u * u); } });
  };
  MODEL.wurli = function (st, m, vel, sr, id) {
    var gap = num(st, id, "gap") / 10, hard = num(st, id, "hard") / 10, k = 0.25 + gap * 0.55;
    return reedTine(id, st, m, vel, sr, { lo: 33, hi: 96, d0: 3.2, d1: 0.8, tau: 1.3, bar: 0, r2: 5.8, a2: (0.06 + 0.35 * hard) * (0.3 + vel), t2: 0.04, a3: 0,
      X: 0.2 + 0.65 * vel, norm: 1 / k, pick: function (x) { return 1 / (1 - k * clamp(x, -1.2, 0.92 / k)); } });
  };
  MODEL.pianet = function (st, m, vel, sr, id) {
    var pad = num(st, id, "pad") / 10, gap = num(st, id, "gap") / 10, k = 0.2 + gap * 0.5;
    return reedTine(id, st, m, vel, sr, { lo: 29, hi: 89, d0: 2.6, d1: 0.7, tau: 1.0, bar: 0, r2: 6.27, a2: 0.12 * (0.4 + pad), t2: 0.03, a3: 0,
      X: (0.15 + 0.45 * pad) * (0.5 + 0.5 * vel), norm: 1 / k, pick: function (x) { return 1 / (1 - k * clamp(x, -1.2, 0.92 / k)); } });
  };
  EP.CLAV_PICKUPS = { CA: "upper pickup", CB: "lower pickup", DA: "both, in phase", DB: "both, out of phase" };
  MODEL.clav = function (st, m, vel, sr, id) {
    var f = hz(m), span = (m - 29) / 59, mute = num(st, id, "mute") / 10, dur = clamp(2.6 - span * 1.9, 0.7, 2.6) * (1 - 0.6 * mute), n = Math.round(dur * sr), y = new Float32Array(n);
    var combo = (st.pc || "C") + (st.pa || "A"), pu = 0.16, pl = 0.07, sExc = 0.035, tau1 = (2.2 - span * 1.5) * (1 - 0.85 * mute), cq = 0.0015 + mute * 0.03;
    for (var j = 1; j <= 40; j++) {
      var fn = j * f * Math.sqrt(1 + 0.00004 * j * j); if (fn > sr * 0.45) break;
      var a = Math.sin(j * Math.PI * sExc) / j * Math.exp(-j * (0.06 - 0.04 * vel)), u = Math.sin(j * Math.PI * pu), l = Math.sin(j * Math.PI * pl);
      var r = combo === "CA" ? u : combo === "CB" ? l : combo === "DA" ? (u + l) * 0.7 : (u - l) * 0.9;
      mode(y, sr, fn, a * r * j * (0.4 + 0.6 * vel), Math.max(0.02, tau1 / (1 + cq * j * j)), 0);
    }
    if (st.brill) biquad(y, sr, "hp", 1100, 0.8); if (st.treb) biquad(y, sr, "hp", 350, 0.7);
    if (st.med) biquad(y, sr, "lp", 2600, 0.7); if (st.soft) biquad(y, sr, "lp", 900, 0.7);
    var att = Math.round(0.001 * sr); for (var i = 0; i < att; i++) y[i] *= i / att;
    return y;
  };
  MODEL.cp70 = function (st, m, vel, sr, id) {
    var f = hz(m), span = (m - 28) / 72, hard = num(st, id, "hard") / 10, piezo = num(st, id, "piezo") / 10, det = num(st, id, "detune") / 10 * 3;
    var dur = clamp(4.5 - span * 3.3, 1.2, 4.5), n = Math.round(dur * sr), y = new Float32Array(n), B = 0.00025 + 0.0035 * Math.max(0, (50 - m) / 22);
    var strs = m < 34 ? [0] : m < 46 ? [-det / 2, det / 2] : [-det, 0, det], nc = 2 + 9 * vel * (0.5 + hard), tl = (3.2 - span * 2.4);
    for (var j = 1; j <= 12; j++) {
      var fn = j * f * Math.sqrt(1 + B * j * j); if (fn > sr * 0.45) break;
      var a = Math.abs(Math.sin(j * Math.PI / 8)) / j * Math.exp(-j / nc) * Math.pow(j, piezo * 0.8);
      strs.forEach(function (c, s) { mode(y, sr, fn * Math.pow(2, c / 1200), a / strs.length, tl / (1 + 0.08 * j), s * 0.7); });
    }
    for (var i = 0; i < n; i++) y[i] *= (0.45 + 1.1 * Math.exp(-i / (0.3 * sr))) * (0.3 + 0.7 * vel);
    var att = Math.round(0.002 * sr); for (i = 0; i < att; i++) y[i] *= i / att;
    return y;
  };
  var CAL = {};
  function raw(id, st, m, vel, sr) { return MODEL[id](st || {}, m, clamp(vel, 0.01, 1), sr, id); }
  EP.render = function (id, st, m, vel, sr) {
    sr = sr || 44100;
    if (!CAL[id]) { var r = raw(id, EP.defaults(id), 60, 0.7, 22050), pk = 0; for (var i = 0; i < r.length; i++) pk = Math.max(pk, Math.abs(r[i])); CAL[id] = 0.35 / (pk || 1); }
    var y = raw(id, st, m, vel, sr), c = CAL[id]; for (var j = 0; j < y.length; j++) y[j] *= c; return y;
  };
  // what the circuit after the notes does with the knobs: drive (0..), eq dB, speaker low-pass, tremolo
  EP.circuit = function (id, st) {
    var v = function (k) { return num(st, id, k); }, o = { drive: 0, bass: 0, mid: 0, treble: 0, lp: 12000, trem: 0, rate: 5, stereo: false, out: v("vol") / 10 };
    if (id === "rhodes" || id === "suitcase") { o.drive = v("drive") / 10; o.bass = (v("bass") - 5) * 2.2; o.treble = (v("treble") - 5) * 1.6; o.lp = 6500; }
    if (id === "suitcase") { o.trem = v("vib") / 10; o.rate = 1.5 + v("rate") * 0.75; o.stereo = true; }
    if (id === "wurli") { o.drive = 0.15 + v("drive") / 10 * 1.2; o.lp = 2600 + v("tone") * 500; o.bass = -3; o.trem = v("vib") / 10 * 0.8; o.rate = 5.6; }
    if (id === "clav") { o.drive = v("drive") / 10; o.lp = 9000; }
    if (id === "cp70") { o.bass = (v("bass") - 5) * 2.4; o.mid = (v("mid") - 5) * 2; o.treble = (v("treble") - 5) * 2.4; o.trem = v("trem") / 10; o.rate = 2 + v("rate") * 0.7; o.lp = 11000; }
    if (id === "pianet") { o.trem = st.vibOn ? 0.45 : 0; o.rate = 6; o.lp = 5000; o.out = 0.2 + v("vol") / 10 * 0.8; }
    return o;
  };

  // ---------- translating between models ----------
  // Common ideas, each 0..1. FAMILY pairs share an action (Stage and Suitcase): matching keys are exact there.
  var COMMON = {
    rhodes: { vol: "vol", bass: "bass", treble: "treble", bark: "voice~", hard: "hard", sustain: "tbar", drive: "drive" },
    suitcase: { vol: "vol", bass: "bass", treble: "treble", trem: "vib", rate: "rate", bark: "voice~", hard: "hard", sustain: "tbar", drive: "drive" },
    wurli: { vol: "vol", treble: "tone", trem: "vib", bark: "gap", hard: "hard", drive: "drive" },
    clav: { vol: "vol", treble: "#tabs", drive: "drive", sustain: "mute~" },
    cp70: { vol: "vol", bass: "bass", treble: "treble", trem: "trem", rate: "rate", hard: "hard" },
    pianet: { vol: "vol", trem: "#vib", bark: "gap", hard: "pad" }
  };
  var IDEA = { vol: "volume", bass: "bass", treble: "brightness", trem: "tremolo depth", rate: "tremolo speed", bark: "bark (how much the pickup distorts)", hard: "how hard the hammer is",
    sustain: "sustain", drive: "amp drive" };
  function getC(id, st, idea) {
    var k = COMMON[id][idea]; if (!k) return undefined;
    if (k === "#tabs") return st.brill ? 0.9 : st.treb ? 0.65 : st.soft ? 0.1 : st.med ? 0.3 : 0.5;
    if (k === "#vib") return st.vibOn ? 0.5 : 0;
    var inv = /~$/.test(k), kk = k.replace("~", ""), c = ctl(id, kk), u = (num(st, id, kk) - c[3]) / (c[4] - c[3]); return inv ? 1 - u : u;
  }
  function setC(id, st, idea, u) {
    var k = COMMON[id][idea]; if (!k) return;
    if (k === "#tabs") { st.brill = u > 0.8; st.treb = u > 0.55 && u <= 0.8; st.med = u > 0.2 && u < 0.45; st.soft = u <= 0.2; return; }
    if (k === "#vib") { st.vibOn = u > 0.25; return; }
    var inv = /~$/.test(k), kk = k.replace("~", ""), c = ctl(id, kk); u = inv ? 1 - u : u;
    st[kk] = Math.round((c[3] + clamp(u, 0, 1) * (c[4] - c[3])) / c[5]) * c[5];
  }
  var FAMILY = { rhodes: "tine", suitcase: "tine" };
  EP.translate = function (st, from, to) {
    var out = EP.defaults(to), notes = [], same = FAMILY[from] && FAMILY[from] === FAMILY[to];
    if (from === to) return { st: Object.assign(out, st), notes: [{ k: "all", kind: "exact", text: "The same instrument: every setting carries over." }] };
    Object.keys(IDEA).forEach(function (idea) {
      var u = getC(from, st, idea); if (u === undefined) { if (COMMON[to][idea]) notes.push({ k: COMMON[to][idea].replace(/[~#]/g, ""), kind: "approx", text: "The " + EP.PROFILES[from].short + " has no " + IDEA[idea] + " control: the " + EP.PROFILES[to].short + "'s is left at its default." }); return; }
      if (!COMMON[to][idea]) { notes.push({ k: COMMON[from][idea].replace(/[~#]/g, ""), kind: "lost", text: IDEA[idea][0].toUpperCase() + IDEA[idea].slice(1) + ": the " + EP.PROFILES[to].short + " has nothing like it." }); return; }
      setC(to, out, idea, u);
      var exact = same && COMMON[from][idea] === COMMON[to][idea];
      notes.push({ k: COMMON[to][idea].replace(/[~#]/g, ""), kind: exact ? "exact" : "approx", text: exact ? IDEA[idea][0].toUpperCase() + IDEA[idea].slice(1) + ": the same control, the same setting." :
        IDEA[idea][0].toUpperCase() + IDEA[idea].slice(1) + ": set to the same place on its range, but the " + EP.PROFILES[to].short + "'s works differently (" + why(idea, from, to) + ")." });
    });
    if (from === "clav") notes.push({ k: "pa", kind: "lost", text: "The pickup rockers (" + EP.CLAV_PICKUPS[(st.pc || "C") + (st.pa || "A")] + "): only the Clavinet reads its strings at two places." });
    if (from === "suitcase" && to !== "suitcase" && (st.vib || 0) > 0) notes.push({ k: "vib", kind: "approx", text: "The Suitcase's tremolo pans between two speakers; the " + EP.PROFILES[to].short + "'s" + (COMMON[to].trem ? " goes up and down in one" : " is not there") + "." });
    notes.push({ k: "sound", kind: "approx", text: "The sound itself: a " + SOURCE[from] + " becomes a " + SOURCE[to] + ". No setting can make one into the other." });
    return { st: out, notes: notes };
  };
  var SOURCE = { rhodes: "struck tine and magnetic pickup", suitcase: "struck tine and magnetic pickup", wurli: "struck reed and electrostatic pickup", clav: "struck string held on an anvil",
    cp70: "set of piano strings on a piezo pickup", pianet: "plucked reed" };
  function why(idea, a, b) {
    if (idea === "bark") return "a Rhodes barks from the tine's position at the pickup, a Wurlitzer or Pianet from the reed's distance from the plate";
    if (idea === "treble") return b === "clav" || a === "clav" ? "the Clavinet only has filter tabs, on or off" : "a different circuit";
    if (idea === "trem") return "different tremolo circuits";
    if (idea === "sustain") return "a tonebar keeps a Rhodes ringing; the Clavinet's mute slider shortens it";
    return "a different mechanism";
  }

  // ---------- riffs (beats, midi, velocity 0..1, length in beats) ----------
  function ch(t, notes, v, d) { return notes.map(function (m) { return [t, m, v, d]; }); }
  EP.RIFFS = {
    ballad: { name: "Ballad chords", bpm: 72, ev: [].concat(ch(0, [41, 53, 57, 60, 64], .55, 1.9), ch(2, [40, 52, 55, 59, 62], .5, 1.9), ch(4, [38, 50, 53, 57, 60], .55, 1.9), ch(6, [43, 53, 57, 59, 64], .6, 1.9),
      [[0.5, 72, .6, .5], [1, 76, .6, 1], [2.5, 74, .55, 1.5], [4.5, 72, .6, .5], [5, 69, .6, 1], [6.5, 71, .6, 1.5]]) },
    soft_hard: { name: "Soft, then hard (bark)", bpm: 84, ev: [].concat(ch(0, [48, 55, 60, 64], .25, 1.8), ch(2, [48, 55, 60, 64], .55, 1.8), ch(4, [48, 55, 60, 64], .85, 1.8), ch(6, [48, 55, 60, 64], 1, 1.8)) },
    soul: { name: "Soul comping", bpm: 92, ev: [].concat(ch(0, [36], .7, .9), ch(.5, [58, 64, 67], .65, .4), ch(1.5, [58, 64, 67], .75, .4), ch(2, [41], .7, .9), ch(2.5, [57, 63, 65], .65, .4),
      ch(3.5, [57, 63, 65], .8, .4), ch(4, [36], .7, .9), ch(4.5, [58, 64, 67], .65, .4), ch(5.5, [58, 64, 67], .75, .4), ch(6, [43], .7, .9), ch(6.5, [59, 65, 67], .7, .4), ch(7.5, [59, 65, 67], .85, .4)) },
    funk: { name: "Funk riff (16ths)", bpm: 100, ev: (function () { var e = [], pat = [[0, 39, 1], [.5, 39, .6], [.75, 42, .8], [1, 43, .9], [1.5, 46, .7], [1.75, 43, .6], [2.25, 39, .9], [2.75, 41, .7], [3, 42, .9], [3.5, 39, .6]];
      [0, 4].forEach(function (b) { pat.forEach(function (p) { e.push([b + p[0], p[1] + 12, p[2], 0.18]); }); e.push([b + 1, 63, .8, .2], [b + 1, 67, .8, .2], [b + 3, 63, .9, .2], [b + 3, 66, .9, .2]); }); return e; })() },
    bass: { name: "Bass line", bpm: 96, ev: [[0, 36, .8, .9], [1, 36, .6, .4], [1.5, 43, .7, .4], [2, 46, .8, .9], [3, 48, .8, .9], [4, 41, .8, .9], [5, 41, .6, .4], [5.5, 48, .7, .4], [6, 43, .8, .9], [7, 34, .8, .9]] }
  };

  // ---------- the widget ----------
  EP.widgets = [];
  var KEYMAP = "awsedftgyhujkolp;'", CSS = ".epc{border:1px solid var(--bs-border-color,#ccc);border-radius:8px;padding:.6rem;margin:1rem 0}.epc-bar{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.4rem;font-size:.9rem}" +
    ".epc-bar select,.epc-bar button{font:inherit;font-size:.85rem}.epc-simple{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.3rem .9rem;font-size:.82rem;margin:.4rem 0}" +
    ".epc-simple h5{grid-column:1/-1;font-size:.85rem;margin:.4rem 0 0}.epc-simple label{display:flex;flex-direction:column}.epc-simple input[type=range]{width:100%}.epc-w{font-size:.7rem;opacity:.7}" +
    ".fp-panelview .epc-simple{display:none}.epc-keys{position:relative;height:90px;margin:.5rem 0;user-select:none;touch-action:none;max-width:100%;overflow:hidden}" +
    ".epc-k{position:absolute;top:0;border:1px solid #555;border-radius:0 0 4px 4px;box-sizing:border-box}.epc-k.w{background:#fff;height:88px;z-index:1}.epc-k.b{background:#222;height:54px;z-index:2}.epc-k.on{background:#e8a400}" +
    ".epc-rep{list-style:none;padding:0;margin:.4rem 0;font-size:.85rem}.epc-rep li{margin:.15rem 0}.epc-tag{display:inline-block;min-width:4.5em;font-size:.72rem;border-radius:3px;padding:0 .3em;margin-right:.4em;text-align:center;color:#000}" +
    ".epc-exact{background:#7ed39b}.epc-approx{background:#f3cf68}.epc-lost{background:#f19a9a}.epc[data-compact] .epc-model,.epc[data-compact] .epc-tr{display:none}";
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  // ---------- SAMPLED (default, 2026-11-27) ----------
  // The notes start from recordings, not from the model: the same soundfont the backing band plays (MusyngKite, via BandSounds'
  // CDN; one sample every 3 semitones, repitched), then each instrument's own controls shape them in JS before the live circuit.
  //   rhodes, suitcase  electric_piano_1 (the band's "rhodes" / "wurli" samples too). voice = pickup bark (drive rising with touch),
  //                     hard = brightness, tbar = sustain.
  //   wurli             electric_piano_1 shaped as the band's "wurli" (low cut 130 Hz, mid push 950 Hz, drive by gap): the soundfont
  //                     has no Wurlitzer, so this is a tine piano made reedy, not a reed recording.
  //   clav              clavinet. Tabs = high-pass / low-pass as in the model, rockers = a tilt (A+C bright ... D+B thin), mute = decay.
  //   cp70              electric_grand_piano (GM's "electric grand", the CP-70 / CP-80 kind). detune = a second copy a few cents off,
  //                     hard = brightness, piezo = upper-mid lift.
  //   pianet            electric_piano_1 made short and thin (high-pass, fast decay): no Pianet recording, a stand-in.
  // Velocity: one sample layer, so touch = level + a darker low-pass when soft (as BandSounds' tone) + drive where the instrument barks.
  // The amounts are this page's; nobody has compared them with the real instruments. EP.SAMPLED = false goes back to the model.
  EP.SAMPLED = true; EP.SF = "https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/";
  EP.SAMPLE_SET = { rhodes: "electric_piano_1", suitcase: "electric_piano_1", wurli: "own:wurli", pianet: "electric_piano_1", clav: "own:clav", cp70: "electric_grand_piano" };
  // "own:<set>" = a multisampled recording of that instrument (apps/shared/lessons/epiano-samples/<set>/manifest.json, built by
  // scripts/epiano-samples.py from the set's SFZ: zones with key ranges, velocity layers, tuning and level fixes):
  //   wurli  Greg Sullivan's Wurlitzer EP200 (1999; SFZ by kinwie), CC-BY 3.0, 4 velocity layers. An EP200, not the 200A.
  //   clav   "Stevie Clavinet" (jlearman; Clavinet D6 recordings via Lithalean / Zynthian), 3 velocity layers. LICENCE UNKNOWN:
  //          served at the site owner's choice (2026-11-27).
  // The soundfont tine samples are the fallback for both while these load or if they fail.
  EP.OWN_BASE = "/apps/shared/lessons/epiano-samples/";
  var SNOTE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], SLO = 22, SHI = 106, SSTEP = 3;
  EP.sampleNotes = function () { var o = []; for (var m = SLO; m <= SHI; m += SSTEP) o.push(m); return o; };
  EP.sampleName = function (m) { return SNOTE[m % 12] + (Math.floor(m / 12) - 1); };
  EP.SAMPLES = {};   // EP.SAMPLES[set][midi] = Float32Array (mono, at the rate it was decoded at; EP.SAMPLES[set].sr)
  function biq(y, sr, type, f, gdb, q) { var w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * (q || 0.707)), A = Math.pow(10, (gdb || 0) / 40), b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }   // peak
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0; var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < y.length; i++) { var x = y[i], o = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = o; y[i] = o; } }
  function nearest(set, m) { var best = null; for (var k in set) { if (k === "sr") continue; if (best == null || Math.abs(k - m) < Math.abs(best - m)) best = +k; } return best; }
  // pure: render one note from samples (null if the set is not loaded). st values on the panel's 0..10 scales.
  function zoneFor(set, m, vel) { var v = Math.round(vel * 127), best = null, bd = 1e9;
    set.zones.forEach(function (z) { if (!z.data) return; var d = (m < z.lo ? z.lo - m : m > z.hi ? m - z.hi : 0) * 200 + (v < z.vlo ? z.vlo - v : v > z.vhi ? v - z.vhi : 0); if (d < bd) { bd = d; best = z; } }); return best; }
  EP.renderSampled = function (id, st, m, vel, sr) { var name = EP.SAMPLE_SET[id], set = EP.SAMPLES[name], own = false, x, ratio, zg = 1;
    if (!set && name.indexOf("own:") === 0) { set = EP.SAMPLES.electric_piano_1; }   // fallback while the recording loads
    else if (set && set.zones) own = true;
    if (!set) return null;
    if (own) { var z = zoneFor(set, m, vel); if (!z) return null; x = z.data; ratio = Math.pow(2, (m - z.key + z.tune / 100) / 12) * set.sr / sr; zg = Math.pow(10, z.vol / 20) * 1.8; }
    else { var k = nearest(set, m); if (k == null) return null; x = set[k]; ratio = Math.pow(2, (m - k) / 12) * set.sr / sr; }
    var q = function (key, d) { var v = st[key]; return (v == null ? d : +v) / 10; };
    var sus = id === "pianet" ? 0.35 : id === "clav" ? 1 - 0.75 * q("mute", 0) : id === "rhodes" || id === "suitcase" ? 0.6 + 0.8 * q("tbar", 6) : 1,
      dur = Math.min(x.length / ratio, sr * (id === "pianet" ? 1.6 : 7) * sus), n = Math.max(1, Math.floor(dur)), y = new Float32Array(n);
    for (var i = 0; i < n; i++) { var p = i * ratio, j = p | 0, f = p - j; y[i] = j + 1 < x.length ? x[j] * (1 - f) + x[j + 1] * f : 0; }
    if (id === "cp70" && q("detune", 5) > 0.02) { var r2 = ratio * Math.pow(2, (2 + 6 * q("detune", 5)) / 1200); for (var u = 0; u < n; u++) { var p2 = u * r2, j2 = p2 | 0; if (j2 + 1 < x.length) y[u] = 0.6 * y[u] + 0.4 * (x[j2] + (p2 - j2) * (x[j2 + 1] - x[j2])); } }
    var hard = q("hard", 5), bright = own ? 4000 + 14000 * hard : 900 + 9000 * Math.pow(vel, 1.5) * (0.5 + hard);
    biq(y, sr, "lp", bright, 0, 0.6);
    var drv = 0;
    if (id === "rhodes" || id === "suitcase") drv = 3 * q("voice", 4) * vel * vel;
    if (id === "wurli" && own) drv = 1.2 * q("gap", 5) * vel;   // the recording already barks; gap adds a little more
    else if (id === "wurli") { biq(y, sr, "hp", 130, 0, 0.7); biq(y, sr, "pk", 950, 4 + 6 * q("gap", 5), 1.1); drv = (1 + 4 * q("gap", 5)) * vel; }
    if (id === "pianet") { biq(y, sr, "hp", 220, 0, 0.7); biq(y, sr, "pk", 1400, 3 + 5 * q("gap", 5), 1); drv = 1.5 * vel; }
    if (id === "clav") { if (st.brill) biq(y, sr, "hp", 900, 0, 0.7); if (st.treb) biq(y, sr, "hp", 300, 0, 0.7); if (st.med) biq(y, sr, "lp", 3500, 0, 0.7); if (st.soft) biq(y, sr, "lp", 1500, 0, 0.7);
      var tilt = { AC: 4, BC: -2, AD: 2, BD: -6 }[(st.pa || "A") + (st.pc || "C")]; biq(y, sr, "pk", 2500, tilt, 0.5); if (st.pa === "B" && st.pc === "D") biq(y, sr, "hp", 600, 0, 0.7); }
    if (id === "cp70") biq(y, sr, "pk", 2200, 8 * q("piezo", 5) - 2, 0.8);
    var gain = (own ? 0.7 : 0.25 + 0.75 * vel) * zg;
    if (drv > 0.05) { var g = 1 + drv, tg = Math.tanh(g); for (var d = 0; d < n; d++) y[d] = Math.tanh(g * y[d]) / tg; }
    var fo = Math.min(n - 1, Math.round(sr * 0.08)); for (var v = 0; v < n; v++) { y[v] *= gain; if (v >= n - fo) y[v] *= (n - 1 - v) / fo; }
    return y; };
  // browser: fetch + decode one sample set (cached); resolves true / false
  var setLoads = {};
  function decodeMono(ctx, ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }).then(function (b) { var L = b.getChannelData(0), R = b.numberOfChannels > 1 ? b.getChannelData(1) : L, o = new Float32Array(L.length); for (var i = 0; i < L.length; i++) o[i] = (L[i] + R[i]) / 2; return o; }); }
  function loadOwn(name, ctx) { var dir = EP.OWN_BASE + name.slice(4) + "/";
    return fetch(dir + "manifest.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (man) { var cache = {};
      return Promise.all(man.zones.map(function (z) { if (!cache[z.f]) cache[z.f] = fetch(dir + z.f).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(function (ab) { return decodeMono(ctx, ab); });
        return cache[z.f].then(function (d) { z.data = d; }, function () {}); })).then(function () { var n = man.zones.filter(function (z) { return z.data; }).length; if (n < man.zones.length * 0.8) return false; EP.SAMPLES[name] = { sr: ctx.sampleRate, zones: man.zones, name: man.name }; return true; }); }); }
  EP.loadSamples = function (id, ctx) { var name = EP.SAMPLE_SET[id]; if (!name) return Promise.resolve(false); if (setLoads[name]) return setLoads[name];
    if (name.indexOf("own:") === 0) { if (!G.fetch || !ctx) return Promise.resolve(false); EP.loadSamples("rhodes", ctx);
      setLoads[name] = loadOwn(name, ctx).then(function (ok) { return ok; }, function () { return false; }); return setLoads[name]; }
    if (!G.fetch || !ctx) return Promise.resolve(false); var set = { sr: ctx.sampleRate };
    setLoads[name] = Promise.all(EP.sampleNotes().map(function (m) { return fetch(EP.SF + name + "-mp3/" + EP.sampleName(m) + ".mp3").then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); }).then(function (b) { var L = b.getChannelData(0), R = b.numberOfChannels > 1 ? b.getChannelData(1) : L, mono = new Float32Array(L.length); for (var i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) / 2; set[m] = mono; }, function () {}); }))
      .then(function () { if (Object.keys(set).length < 10) return false; EP.SAMPLES[name] = set; return true; });
    return setLoads[name]; };

  EP.mount = function (div) {
    if (div._ep) return div._ep;
    if (!document.getElementById("epc-css")) { var s = el("style"); s.id = "epc-css"; s.textContent = CSS; document.head.appendChild(s); }
    var W = { id: EP.PROFILES[div.dataset.model] ? div.dataset.model : "rhodes", ctx: null, voices: {}, timers: [], cache: {}, vel: 0.7, oct: 0, div: div };
    W.st = EP.defaults(W.id); div._ep = W; EP.widgets.push(W);
    var bar = el("div", "epc-bar"), msel = el("select", "epc-model"), rsel = el("select"), play = el("button", "btn btn-sm btn-primary", "▶ Play"), stop = el("button", "btn btn-sm btn-outline-secondary", "■ Stop");
    EP.ORDER.forEach(function (id) { var o = el("option", null, EP.PROFILES[id].name); o.value = id; msel.appendChild(o); });
    Object.keys(EP.RIFFS).forEach(function (r) { var o = el("option", null, EP.RIFFS[r].name); o.value = r; rsel.appendChild(o); });
    var vl = el("label", null, "Touch "), vr = el("input"); vr.type = "range"; vr.min = 5; vr.max = 100; vr.value = 70; vr.oninput = function () { W.vel = vr.value / 100; }; vl.appendChild(vr);
    var midi = el("button", "btn btn-sm btn-outline-secondary", "MIDI in");
    var src = el("button", "btn btn-sm btn-outline-secondary epc-src", ""); src.type = "button"; src.title = "Notes from recorded samples (the backing band's soundfont) or from this page's physical model";
    var srcLabel = function () { document.querySelectorAll(".epc-src").forEach(function (b) { b.textContent = "Sound: " + (EP.SAMPLED ? "samples" : "model"); b.setAttribute("aria-pressed", EP.SAMPLED ? "true" : "false"); }); };
    src.onclick = function () { EP.SAMPLED = !EP.SAMPLED; srcLabel(); };
    [msel, rsel, play, stop, vl, midi, src].forEach(function (x) { bar.appendChild(x); }); srcLabel();
    var face = el("div", "epc-face"), simple = el("div", "epc-simple"), keys = el("div", "epc-keys"), tr = el("div", "epc-tr"), note = el("p", "epc-w");
    div.innerHTML = ""; [bar, face, keys, note, tr].forEach(function (x) { div.appendChild(x); }); face.appendChild(simple);
    note.textContent = "Keys: click, or the computer keys a w s e d f t g y h u j k (z / x = octave down / up), or a MIDI keyboard. The sound is this site's own model; nobody has compared it with the real instrument.";
    // translate box
    var tsel = el("select"), tb = el("button", "btn btn-sm btn-outline-primary", "Turn into it"), rep = el("ul", "epc-rep"), tl = el("div", "epc-bar");
    tl.appendChild(el("span", null, "Turn this sound into the ")); tl.appendChild(tsel); tl.appendChild(tb); tr.appendChild(tl); tr.appendChild(rep);
    EP.ORDER.forEach(function (id) { var o = el("option", null, EP.PROFILES[id].short); o.value = id; tsel.appendChild(o); });
    tsel.value = div.dataset.to || "wurli";
    tb.onclick = function () { var r = EP.translate(W.st, W.id, tsel.value), from = W.id; W.setModel(tsel.value, r.st); W.report(r, from); };
    W.report = function (r, from) { rep.innerHTML = ""; var h = el("li"); h.innerHTML = "<b>" + EP.PROFILES[from].short + " → " + EP.PROFILES[W.id].short + "</b>"; rep.appendChild(h);
      r.notes.forEach(function (n) { var li = el("li"), t = el("span", "epc-tag epc-" + n.kind, n.kind === "exact" ? "the same" : n.kind === "approx" ? "close" : "lost"); li.dataset.kind = n.kind; li.appendChild(t); li.appendChild(document.createTextNode(n.text)); rep.appendChild(li); }); };
    msel.onchange = function () { W.setModel(msel.value); rep.innerHTML = ""; };
    play.onclick = function () { W.phrase(rsel.value); }; stop.onclick = function () { W.stop(); };
    midi.onclick = function () { if (!navigator.requestMIDIAccess) { midi.textContent = "No Web MIDI here"; return; }
      navigator.requestMIDIAccess().then(function (a) { midi.textContent = "MIDI on"; a.inputs.forEach(function (i) { i.onmidimessage = function (e) { var d = e.data, c = d[0] & 0xf0;
        if (c === 0x90 && d[2]) W.noteOn(d[1], d[2] / 127); else if (c === 0x80 || c === 0x90) W.noteOff(d[1]); }; }); }); };
    // simple controls
    function drawSimple() {
      simple.innerHTML = ""; W.inputs = {};
      EP.PROFILES[W.id].groups.forEach(function (g) {
        simple.appendChild(el("h5", null, g[0]));
        g[2].forEach(function (c) { var lab = el("label"), name = el("span", null, c[1] + " "), w = el("span", "epc-w", c[7] === "panel" ? "on the panel" : c[7] === "inside" ? "inside (service adjustment)" : "this page's"), inp;
          name.appendChild(w); lab.appendChild(name);
          if (c[2] === "k") { inp = el("input"); inp.type = "range"; inp.min = c[3]; inp.max = c[4]; inp.step = c[5]; inp.oninput = function () { W.set(c[0], +inp.value); }; }
          else if (c[2] === "s") { inp = el("input"); inp.type = "checkbox"; inp.onchange = function () { W.set(c[0], inp.checked); }; }
          else { inp = el("select"); c[3].forEach(function (o) { var op = el("option", null, o); op.value = o; inp.appendChild(op); }); inp.onchange = function () { W.set(c[0], inp.value); }; }
          inp.dataset.k = c[0]; lab.appendChild(inp); simple.appendChild(lab); W.inputs[c[0]] = inp; });
      });
      syncSimple();
    }
    function syncSimple() { for (var k in W.inputs) { var i = W.inputs[k]; if (i.type === "checkbox") i.checked = !!W.st[k]; else i.value = W.st[k]; } }
    var adapter = { get: function (k) { return W.st[k]; }, set: function (k, v) { W.set(k, v); }, range: function (k) { return ctl(W.id, k); } };
    function drawFace() {
      // old models' panels stay in the box, hidden (FaithfulPanel only repaints mounted panels still in the document)
      [].slice.call(face.children).forEach(function (c) { if (c.classList.contains("fp-hostbar")) face.removeChild(c); else if (c !== simple) c.hidden = true; });
      if (G.FaithfulPanel && FaithfulPanel.attachFace) W.face = FaithfulPanel.attachFace(face, "ep-" + W.id, adapter, { at: simple, label: EP.PROFILES[W.id].short });
    }
    // keyboard
    function drawKeys() {
      keys.innerHTML = ""; W.keyEls = {}; var lo = 48 + 12 * W.oct, white = 0, wk = 100 / 22;
      for (var m = lo; m < lo + 37; m++) { var b = [1, 3, 6, 8, 10].indexOf(m % 12) >= 0, k = el("div", "epc-k " + (b ? "b" : "w")); k.dataset.m = m;
        if (b) { k.style.left = (white * wk - wk * 0.32) + "%"; k.style.width = (wk * 0.64) + "%"; } else { k.style.left = (white * wk) + "%"; k.style.width = wk + "%"; white++; }
        (function (mm) { k.onpointerdown = function (e) { e.preventDefault(); W.noteOn(mm, W.vel); var up = function () { W.noteOff(mm); window.removeEventListener("pointerup", up); }; window.addEventListener("pointerup", up); }; })(m);
        keys.appendChild(k); W.keyEls[m] = k; }
    }
    var down = {};
    div.tabIndex = 0;
    div.addEventListener("keydown", function (e) { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.metaKey || e.ctrlKey) return;
      if (e.key === "z") { W.oct = Math.max(-2, W.oct - 1); drawKeys(); return; } if (e.key === "x") { W.oct = Math.min(2, W.oct + 1); drawKeys(); return; }
      var i = KEYMAP.indexOf(e.key); if (i < 0 || down[e.key]) return; down[e.key] = 60 + 12 * W.oct + i; W.noteOn(down[e.key], W.vel); e.preventDefault(); });
    div.addEventListener("keyup", function (e) { if (down[e.key]) { W.noteOff(down[e.key]); delete down[e.key]; } });
    // audio
    W.audio = function () {
      if (W.ctx) { if (W.ctx.state === "suspended") W.ctx.resume(); return W.ctx; }
      var AC = G.AudioContext || G.webkitAudioContext, c = W.ctx = new AC(), N = W.n = {};
      N.inp = c.createGain(); N.sh = c.createWaveShaper(); N.bass = c.createBiquadFilter(); N.bass.type = "lowshelf"; N.bass.frequency.value = 180;
      N.mid = c.createBiquadFilter(); N.mid.type = "peaking"; N.mid.frequency.value = 1000; N.mid.Q.value = 0.8; N.tre = c.createBiquadFilter(); N.tre.type = "highshelf"; N.tre.frequency.value = 3200;
      N.lp = c.createBiquadFilter(); N.lp.type = "lowpass"; N.lp.Q.value = 0.6; N.split = c.createChannelSplitter(2); N.gl = c.createGain(); N.gr = c.createGain(); N.mg = c.createChannelMerger(2);
      N.lfo = c.createOscillator(); N.dl = c.createGain(); N.dr = c.createGain(); N.out = c.createGain(); N.an = c.createAnalyser(); N.an.fftSize = 2048;
      N.inp.connect(N.sh); N.sh.connect(N.bass); N.bass.connect(N.mid); N.mid.connect(N.tre); N.tre.connect(N.lp);
      N.lp.connect(N.gl); N.lp.connect(N.gr); N.gl.connect(N.mg, 0, 0); N.gr.connect(N.mg, 0, 1); N.mg.connect(N.out); N.out.connect(N.an); N.an.connect(c.destination);
      N.lfo.connect(N.dl); N.lfo.connect(N.dr); N.dl.connect(N.gl.gain); N.dr.connect(N.gr.gain); N.lfo.start();
      if (G.AudioTap && AudioTap.register) try { AudioTap.register(c, N.out, "Electric pianos"); } catch (e) {}
      W.circuit(); EP.loadSamples(W.id, c); return c;
    };
    W.circuit = function () {
      if (!W.ctx) return; var o = EP.circuit(W.id, W.st), N = W.n, t = W.ctx.currentTime, d = o.drive;
      if (N._d !== d) { N._d = d; var cv = new Float32Array(1024), g = 1 + d * 5; for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; cv[i] = d > 0.01 ? Math.tanh(g * x) / Math.tanh(g) : x; } N.sh.curve = cv; }
      N.bass.gain.setTargetAtTime(o.bass, t, 0.02); N.mid.gain.setTargetAtTime(o.mid, t, 0.02); N.tre.gain.setTargetAtTime(o.treble, t, 0.02); N.lp.frequency.setTargetAtTime(o.lp, t, 0.02);
      var h = o.trem / 2; N.gl.gain.setTargetAtTime(1 - h, t, 0.02); N.gr.gain.setTargetAtTime(1 - h, t, 0.02); N.dl.gain.setTargetAtTime(h, t, 0.02); N.dr.gain.setTargetAtTime(o.stereo ? -h : h, t, 0.02);
      N.lfo.frequency.setTargetAtTime(o.rate, t, 0.02); N.out.gain.setTargetAtTime(o.out * 1.2, t, 0.02);
    };
    function buf(m, vel) {
      var vb = Math.round(clamp(vel, 0.05, 1) * 12), rk = RENDER_KEYS[W.id].map(function (k) { return W.st[k]; }).join(","), key = W.id + "|" + m + "|" + vb + "|" + rk;
      var sn = EP.SAMPLE_SET[W.id]; if (EP.SAMPLED) key = (EP.SAMPLES[sn] ? "S|" : sn.indexOf("own:") === 0 && EP.SAMPLES.electric_piano_1 ? "F|" : "") + key;
      if (!W.cache[key]) { var y = (EP.SAMPLED && EP.renderSampled(W.id, W.st, m, vb / 12, W.ctx.sampleRate)) || EP.render(W.id, W.st, m, vb / 12, W.ctx.sampleRate), b = W.ctx.createBuffer(1, y.length, W.ctx.sampleRate); b.getChannelData(0).set(y); W.cache[key] = b;
        var ks = Object.keys(W.cache); if (ks.length > 400) delete W.cache[ks[0]]; }
      return W.cache[key];
    }
    W.noteOn = function (m, vel, when) {
      var c = W.audio(), P = EP.PROFILES[W.id]; if (m < P.lo || m > P.hi) return; W.noteOff(m, when);
      var s = c.createBufferSource(), g = c.createGain(), t = when || c.currentTime; s.buffer = buf(m, vel == null ? W.vel : vel); s.connect(g); g.connect(W.n.inp); s.start(t);
      W.voices[m] = { s: s, g: g }; s.onended = function () { if (W.voices[m] && W.voices[m].s === s) delete W.voices[m]; };
      if (W.keyEls && W.keyEls[m]) W.keyEls[m].classList.add("on");
    };
    W.noteOff = function (m, when) {
      var v = W.voices[m]; if (W.keyEls && W.keyEls[m]) W.keyEls[m].classList.remove("on"); if (!v || !W.ctx) return; delete W.voices[m];
      var t = Math.max(when || 0, W.ctx.currentTime), r = EP.PROFILES[W.id].rel; v.g.gain.setValueAtTime(1, t); v.g.gain.setTargetAtTime(0, t, r / 3); try { v.s.stop(t + r * 3); } catch (e) {}
    };
    W.stop = function () { W.timers.forEach(clearTimeout); W.timers = []; Object.keys(W.voices).forEach(function (m) { W.noteOff(+m); }); if (W._res) { W._res(); W._res = null; } };
    W.phrase = function (r) {
      W.stop(); var R = EP.RIFFS[r || EP.PROFILES[W.id].riff] || EP.RIFFS.ballad, c = W.audio(), sp = 60 / R.bpm, t0 = c.currentTime + 0.08, end = 0, P = EP.PROFILES[W.id];
      R.ev.forEach(function (e) { var m = e[1]; while (m < P.lo) m += 12; while (m > P.hi) m -= 12;
        W.noteOn(m, e[2], t0 + e[0] * sp); W.noteOff(m, t0 + (e[0] + e[3]) * sp); end = Math.max(end, e[0] + e[3]);
        W.timers.push(setTimeout(function () { if (W.keyEls && W.keyEls[m]) { W.keyEls[m].classList.add("on"); setTimeout(function () { W.keyEls[m] && W.keyEls[m].classList.remove("on"); }, e[3] * sp * 1000); } }, (e[0] * sp + 0.08) * 1000)); });
      return new Promise(function (res) { W._res = res; W.timers.push(setTimeout(function () { W._res = null; res(); }, (end * sp + 0.6) * 1000)); });
    };
    W.analyser = function () { W.audio(); return W.n.an; };
    W.set = function (k, v) { if (!ctl(W.id, k)) return; W.st[k] = v; W.circuit(); syncSimple(); if (W.face && W.face.m) W.face.m.refresh(); };
    W.setAll = function (o) { W.setModel(o.model && EP.PROFILES[o.model] ? o.model : W.id); for (var k in o) if (k !== "model" && ctl(W.id, k)) W.st[k] = o[k]; W.circuit(); syncSimple(); if (W.face && W.face.m) W.face.m.refresh(); };
    W.setModel = function (id, st) { W.stop(); W.id = id; if (W.ctx) EP.loadSamples(id, W.ctx); W.st = Object.assign(EP.defaults(id), st || {}); msel.value = id; if (tsel.value === id) tsel.value = id === "rhodes" ? "wurli" : "rhodes";
      drawSimple(); drawFace(); W.circuit(); };
    msel.value = W.id; drawSimple(); drawFace(); drawKeys();
    return W;
  };
  function boot() { [].forEach.call(document.querySelectorAll(".epc"), EP.mount); }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); }
  if (typeof module !== "undefined") module.exports = EP;
})(typeof window !== "undefined" ? window : globalThis);
