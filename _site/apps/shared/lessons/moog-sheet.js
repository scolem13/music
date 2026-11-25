// The Minimoog Model D patch sheets (Moog Music, Minimoog Model D manual, 2016, printed pp. 55-76 = PDF pages; blank
// sheets pp. 77-79), drawn as line art in the manual's layout so a student can match the page to the panel.
// Data: /apps/shared/data/moog-sheets.json (read from the PDF's pixels by a script and checked by eye; how in the
// CLAUDE.md of this folder). Each sheet holds every control in the SHEET's own units:
//   tune -2.5..2.5 (labels -2..2), glide / modMix / mixer / emphasis / amount / sustains / volumes / lfoRate 0..10,
//   o2Freq / o3Freq -8..8 (labels -7..7), cutoff -5..5 (labels -4..4, 0 at the top),
//   fA fD lA lD = knob position 0..10 by angle (30 degrees a unit, -150 = 0) on the printed time scale
//   (labels 10 ms, 200, 600, 1 s, 5, 10 s; see TIME below), range / wave names, switches by name, null = left empty.
// Calibration (TIME): the printed scale's labels sit at these pointer angles (measured on the blank sheet, p. 77):
//   10 ms -114, 200 ms -88, 600 ms -29, 1 s 30, 5 s 64, 10 s 104 degrees from the top; the stops at +-144 take the
//   specification's ends (attack 1 ms - 10 s, decay 4 ms - 35 s, manual p. 80). Between labels: log interpolation
//   (this page's choice). The cutoff's hertz are not printed on the sheet: knob -5..5 maps to synth-compare's 0..10
//   cutoff knob by adding 5, and that knob's hertz curve is the page's own (synth-compare.js CUT).
// API: MoogSheet.toState(sheet) -> SynthCompare.PROFILES.moog state; MoogSheet.fromState(state) -> sheet;
//   MoogSheet.draw(host, entry|sheet, {interactive, onChange(entry), large, contrast, section}) -> {svg, set(entry), entry};
//   MoogSheet.secs(pos, isDecay), MoogSheet.posOfSecs(s, isDecay); MoogSheet.print(entry|null); MoogSheet.mount(div).
(function () {
  "use strict";
  var MS = {};
  var FEET = ["LO", "32'", "16'", "8'", "4'", "2'"];
  var W12 = ["tri", "trisaw", "saw", "square", "wide", "narrow"], W3 = ["tri", "rsaw", "saw", "square", "wide", "narrow"];
  var WAVE_NAME = { tri: "triangle", trisaw: "triangle-sawtooth", rsaw: "reverse sawtooth", saw: "sawtooth", square: "square", wide: "wide rectangle", narrow: "narrow rectangle" };
  var M_ATT = [0.001, 10], M_DEC = [0.004, 35];   // the same ends as synth-compare.js (manual p. 80)
  // ---------- the printed time scale ----------
  var TIME_TICKS = [-144, -114, -101, -88, -58, -29, 0, 30, 47, 64, 83, 104, 144];
  function timePts(dec) { return [[-144, dec ? 0.004 : 0.001], [-114, 0.01], [-88, 0.2], [-29, 0.6], [30, 1], [64, 5], [104, 10], [144, dec ? 35 : 10]]; }
  function secsAt(a, dec) {
    var p = timePts(dec); a = Math.max(-144, Math.min(144, a));
    for (var i = 0; i < p.length - 1; i++) if (a <= p[i + 1][0]) { var t = (a - p[i][0]) / (p[i + 1][0] - p[i][0]); return Math.exp(Math.log(p[i][1]) + t * (Math.log(p[i + 1][1]) - Math.log(p[i][1]))); }
    return p[p.length - 1][1];
  }
  function angleOfSecs(s, dec) {
    var p = timePts(dec); s = Math.max(p[0][1], Math.min(p[p.length - 1][1], s));
    for (var i = 0; i < p.length - 1; i++) if (s <= p[i + 1][1] + 1e-12 && p[i + 1][1] > p[i][1]) { var t = (Math.log(s) - Math.log(p[i][1])) / (Math.log(p[i + 1][1]) - Math.log(p[i][1])); return p[i][0] + t * (p[i + 1][0] - p[i][0]); }
    return 104;
  }
  MS.secs = function (pos, dec) { return secsAt(pos * 30 - 150, dec); };
  MS.posOfSecs = function (s, dec) { return (angleOfSecs(s, dec) + 150) / 30; };
  MS.timeText = function (s) { return s < 1 ? "≈" + Math.round(s * 1000) + " ms" : "≈" + (Math.round(s * 10) / 10) + " s"; };
  function expInv(v, lo, hi) { return 10 * Math.log(Math.max(lo, Math.min(hi, v)) / lo) / Math.log(hi / lo); }
  function expMap(k, lo, hi) { return lo * Math.pow(hi / lo, Math.max(0, Math.min(10, k)) / 10); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // ---------- controls (positions in the manual's page pixels at 1.6x, odd pages) ----------
  // kind: k10 | cut | tune | freq | time | sel | sw | lfo
  var K = [
    ["tune", "Tune", "tune", 310, 507], ["glide", "Glide", "k10", 256, 615], ["modMix", "Modulation mix", "k10", 364, 615],
    ["o1Range", "Oscillator 1 range", "sel", 518, 453, FEET], ["o1Wave", "Oscillator 1 waveform", "sel", 733, 453, W12],
    ["o2Range", "Oscillator 2 range", "sel", 518, 561, FEET], ["o2Freq", "Oscillator 2 frequency", "freq", 625, 561], ["o2Wave", "Oscillator 2 waveform", "sel", 733, 561, W12],
    ["o3Range", "Oscillator 3 range", "sel", 518, 669, FEET], ["o3Freq", "Oscillator 3 frequency", "freq", 625, 669], ["o3Wave", "Oscillator 3 waveform", "sel", 733, 669, W3],
    ["m1", "Oscillator 1 volume", "k10", 841, 454], ["m2", "Oscillator 2 volume", "k10", 841, 561], ["m3", "Oscillator 3 volume", "k10", 841, 669],
    ["ext", "External input volume", "k10", 1056, 507], ["noise", "Noise volume", "k10", 1056, 615],
    ["cutoff", "Cutoff frequency", "cut", 1302, 454], ["emph", "Emphasis", "k10", 1410, 454], ["amount", "Amount of contour", "k10", 1518, 454],
    ["fA", "Filter contour attack time", "time", 1302, 554], ["fD", "Filter contour decay time", "time", 1410, 554], ["fS", "Filter contour sustain level", "k10", 1518, 554],
    ["lA", "Loudness contour attack time", "time", 1302, 676], ["lD", "Loudness contour decay time", "time", 1410, 676], ["lS", "Loudness contour sustain level", "k10", 1518, 676],
    ["vol", "Main output volume", "k10", 1626, 454], ["phones", "Phones volume", "k10", 1626, 676], ["lfoRate", "LFO rate", "k10", 254, 867, null, 24]
  ];
  var SW = [ // id, label, x, y, half w, half h, vertical, [first half, second half], fill, ON label under the second half
    ["oscMod", "Oscillator modulation", 398, 498, 27, 19, false, ["off", "on"], "or", true],
    ["m1On", "Oscillator 1 on", 921, 444, 27, 19, false, ["off", "on"], "bl", true], ["extOn", "External input on", 921, 498, 27, 19, false, ["off", "on"], "bl", true],
    ["m2On", "Oscillator 2 on", 921, 552, 27, 19, false, ["off", "on"], "bl", true], ["noiseOn", "Noise on", 921, 606, 27, 19, false, ["off", "on"], "bl", true],
    ["m3On", "Oscillator 3 on", 921, 659, 27, 20, false, ["off", "on"], "bl", true],
    ["filtMod", "Filter modulation", 1183, 444, 27, 19, false, ["off", "on"], "or", true], ["kb1", "Keyboard control 1", 1183, 494, 27, 19, false, ["off", "on"], "or", false],
    ["kb2", "Keyboard control 2", 1183, 544, 27, 19, false, ["off", "on"], "or", true],
    ["mainOut", "Main output", 1690, 444, 27, 19, false, ["off", "on"], "bl", true], ["a440", "A-440", 1597, 552, 27, 19, false, ["off", "on"], "bl", true],
    ["noiseColor", "Noise white or pink", 1124, 587, 19, 27, true, ["white", "pink"], "bl", false],
    ["osc3Ctl", "Oscillator 3 control", 439, 641, 19, 27, true, ["on", "off"], "or", false],
    ["power", "Power", 1797, 641, 19, 27, true, ["on", "off"], "dk", false],
    ["src1", "Oscillator 3 or filter EG", 228, 679, 27, 19, false, ["osc3", "filterEG"], "dk", false],
    ["src2", "Noise or LFO", 336, 679, 27, 19, false, ["noise", "lfo"], "dk", false],
    ["glideOn", "Glide switch", 310, 825, 32, 23, false, ["off", "on"], "lg", true], ["decaySw", "Decay switch", 310, 888, 32, 23, false, ["off", "on"], "lg", true]
  ];
  MS.KNOBS = K.map(function (c) { return c[0]; }); MS.SWITCHES = SW.map(function (c) { return c[0]; });
  MS.CONTROLS = MS.KNOBS.concat(MS.SWITCHES, ["lfoShape"]);
  MS.OPTIONS = {}; K.forEach(function (c) { if (c[5]) MS.OPTIONS[c[0]] = c[5]; }); SW.forEach(function (c) { MS.OPTIONS[c[0]] = c[7]; });
  MS.OPTIONS.lfoShape = ["triangle", "square"];
  // value <-> pointer angle (degrees from the top, clockwise) and the half-division each kind snaps to
  var KIND = {
    k10: { a: function (v) { return v * 30 - 150; }, v: function (a) { return (a + 150) / 30; }, half: 15, lo: 0, hi: 10 },
    cut: { a: function (v) { return v * 30; }, v: function (a) { return a / 30; }, half: 15, lo: -5, hi: 5 },
    tune: { a: function (v) { return v * 60; }, v: function (a) { return a / 60; }, half: 15, lo: -2.5, hi: 2.5 },
    freq: { a: function (v) { return v * 20; }, v: function (a) { return a / 20; }, half: 10, lo: -8, hi: 8 },
    time: { a: function (v) { return v * 30 - 150; }, v: function (a) { return (a + 150) / 30; }, half: 0, lo: 0.2, hi: 9.8 }
  };
  var TIME_STOPS = (function () { var s = TIME_TICKS.slice(); for (var i = 0; i < TIME_TICKS.length - 1; i++) s.push((TIME_TICKS[i] + TIME_TICKS[i + 1]) / 2); return s.sort(function (a, b) { return a - b; }); })();
  function snapAngle(kind, a) {
    var k = KIND[kind];
    if (kind === "time") { a = clamp(a, -144, 144); var best = TIME_STOPS[0]; TIME_STOPS.forEach(function (t) { if (Math.abs(t - a) < Math.abs(best - a)) best = t; }); return best; }
    return clamp(Math.round(a / k.half) * k.half, k.a(k.lo), k.a(k.hi));
  }
  MS.snap = function (id, v) { var c = K.find(function (c) { return c[0] === id; }); if (!c || !KIND[c[2]]) return v; var k = KIND[c[2]]; return Math.round(k.v(snapAngle(c[2], k.a(v))) * 1000) / 1000; };
  function valueText(id, v) {
    if (v === null || v === undefined) return "not used (left empty)";
    var c = K.find(function (c) { return c[0] === id; });
    if (c && c[2] === "time") return v + " (" + MS.timeText(MS.secs(v, id.charAt(1) === "D")) + ")";
    if (c && c[2] === "sel") return WAVE_NAME[v] || v;
    if (id === "lfoShape") return v + " wave";
    return String(v);
  }
  MS.valueText = valueText;

  // ---------- sheet <-> SynthCompare state ----------
  var DEF = { glide: 3, modMix: 0, src1: "osc3", src2: "noise", lfoRate: 5, lfoSq: false, oscMod: false,
    o1Range: "8'", o1Wave: "saw", o2Range: "8'", o2Freq: 0, o2Wave: "saw", o3Range: "8'", o3Freq: 0, o3Wave: "saw", o3Kbd: true,
    m1On: true, m1: 8, m2On: false, m2: 0, m3On: false, m3: 0, extOn: false, ext: 0, nOn: false, n: 0, nCol: "white",
    filtMod: false, kb1: false, kb2: false, cutoff: 5, emph: 0, amount: 5, fA: 0, fD: 4, fS: 5, lA: 0, lD: 4, lS: 10,
    vol: 6, glideOn: false, decaySw: false };   // a copy of SynthCompare.PROFILES.moog.def, used when that is not loaded
  MS.STATE_KEYS = Object.keys(DEF);
  var ON = function (v) { return v === "on"; };
  MS.toState = function (sheet) {
    var src = (typeof window !== "undefined" && window.SynthCompare && window.SynthCompare.PROFILES) ? window.SynthCompare.PROFILES.moog.def : DEF;
    var st = {}, s = sheet || {}; for (var k in src) st[k] = src[k];
    function num(sk, tk, f) { if (s[sk] !== null && s[sk] !== undefined) st[tk] = f ? f(s[sk]) : s[sk]; }
    function bool(sk, tk, onv) { if (s[sk] !== null && s[sk] !== undefined) st[tk] = s[sk] === (onv || "on"); }
    num("glide", "glide"); num("modMix", "modMix"); num("lfoRate", "lfoRate");
    if (s.src1) st.src1 = s.src1 === "filterEG" ? "fenv" : "osc3";
    if (s.src2) st.src2 = s.src2;
    if (s.lfoShape) st.lfoSq = s.lfoShape === "square";
    bool("oscMod", "oscMod"); bool("filtMod", "filtMod"); bool("kb1", "kb1"); bool("kb2", "kb2");
    ["o1Range", "o1Wave", "o2Range", "o2Wave", "o3Range", "o3Wave"].forEach(function (k) { if (s[k]) st[k] = s[k]; });
    num("o2Freq", "o2Freq", function (v) { return clamp(v, -7, 7); }); num("o3Freq", "o3Freq", function (v) { return clamp(v, -7, 7); });
    bool("osc3Ctl", "o3Kbd");
    bool("m1On", "m1On"); bool("m2On", "m2On"); bool("m3On", "m3On"); bool("extOn", "extOn"); bool("noiseOn", "nOn");
    num("m1", "m1"); num("m2", "m2"); num("m3", "m3"); num("ext", "ext"); num("noise", "n");
    if (s.noiseColor) st.nCol = s.noiseColor;
    num("cutoff", "cutoff", function (v) { return clamp(v + 5, 0, 10); });
    num("emph", "emph"); num("amount", "amount"); num("fS", "fS"); num("lS", "lS"); num("vol", "vol");
    ["fA", "lA"].forEach(function (k) { num(k, k, function (v) { return r2(expInv(MS.secs(v, false), M_ATT[0], M_ATT[1])); }); });
    ["fD", "lD"].forEach(function (k) { num(k, k, function (v) { return r2(expInv(MS.secs(v, true), M_DEC[0], M_DEC[1])); }); });
    bool("glideOn", "glideOn"); bool("decaySw", "decaySw");
    return st;
  };
  MS.fromState = function (st) {
    var s = {}, b = function (v) { return v ? "on" : "off"; };
    s.tune = 0; s.glide = st.glide; s.modMix = st.modMix; s.lfoRate = st.lfoRate; s.lfoShape = st.lfoSq ? "square" : "triangle";
    s.src1 = st.src1 === "fenv" ? "filterEG" : "osc3"; s.src2 = st.src2;
    s.oscMod = b(st.oscMod); s.filtMod = b(st.filtMod); s.kb1 = b(st.kb1); s.kb2 = b(st.kb2);
    ["o1Range", "o1Wave", "o2Range", "o2Wave", "o3Range", "o3Wave", "o2Freq", "o3Freq", "m1", "m2", "m3", "ext", "emph", "amount", "fS", "lS", "vol"].forEach(function (k) { s[k] = st[k]; });
    s.osc3Ctl = b(st.o3Kbd); s.m1On = b(st.m1On); s.m2On = b(st.m2On); s.m3On = b(st.m3On); s.extOn = b(st.extOn); s.noiseOn = b(st.nOn);
    s.noise = st.n; s.noiseColor = st.nCol; s.cutoff = r2(st.cutoff - 5);
    s.fA = r2(MS.posOfSecs(expMap(st.fA, M_ATT[0], M_ATT[1]), false)); s.lA = r2(MS.posOfSecs(expMap(st.lA, M_ATT[0], M_ATT[1]), false));
    s.fD = r2(MS.posOfSecs(expMap(st.fD, M_DEC[0], M_DEC[1]), true)); s.lD = r2(MS.posOfSecs(expMap(st.lD, M_DEC[0], M_DEC[1]), true));
    s.glideOn = b(st.glideOn); s.decaySw = b(st.decaySw);
    s.mainOut = "on"; s.a440 = "off"; s.power = "on"; s.phones = null;   // not part of the synth's state
    return s;
  };
  MS.blank = function () { var s = {}; MS.CONTROLS.forEach(function (k) { s[k] = null; }); return { id: "blank", name: "", page: 77, blank: true, sheet: s, notes: "", wheel: { mod: null, pitch: null, motion: null, arrow: null }, unsure: [] }; };

  // ---------- drawing ----------
  var NS = "http://www.w3.org/2000/svg";
  var COL = { or: "#F58648", bl: "#92B6BC", dk: "#58595B", lg: "#D1D3D4", ink: "#000" };
  var COL_HC = { or: "#C2410C", bl: "#2F6E86", dk: "#222", lg: "#777", ink: "#000" };
  var FONT = "'Futura PT', Futura, 'Century Gothic', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
  var SERIF = "'Recoleta', 'Cooper Std', 'Rockwell', Georgia, 'Times New Roman', serif";
  var SECTIONS = [
    { id: "controllers", name: "Controllers", box: [202, 345, 425, 779] }, { id: "osc", name: "Oscillator bank", box: [425, 345, 788, 779] },
    { id: "mixer", name: "Mixer", box: [788, 345, 1210, 779] }, { id: "modifiers", name: "Modifiers", box: [1210, 345, 1572, 779] },
    { id: "output", name: "Output", box: [1572, 345, 1833, 779] }, { id: "left", name: "Left-hand controls", box: [202, 798, 405, 1137] },
    { id: "notes", name: "Notes", box: [423, 798, 1833, 1137] }];
  MS.SECTIONS = SECTIONS;
  function secOf(x, y) { for (var i = 0; i < SECTIONS.length; i++) { var b = SECTIONS[i].box; if (x >= b[0] && x < b[2] && y >= b[1] && y < b[3]) return SECTIONS[i].id; } return "title"; }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function pol(cx, cy, r, a) { var t = a * Math.PI / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; }
  function wavePath(w) {
    return { tri: "M-6,4 L0,-5 L6,4", trisaw: "M-6,4 L-1,-5 L1,0 L1,-5 L6,4", saw: "M-6,5 L5,-5 L5,5", rsaw: "M-5,5 L-5,-5 L6,5",
      square: "M-7,5 L-7,-5 L0,-5 L0,5 L7,5", wide: "M-7,5 L-7,-5 L2,-5 L2,5 L7,5", narrow: "M-7,5 L-7,-5 L-3,-5 L-3,5 L7,5" }[w];
  }
  function scallop(cx, cy, r, n, d) { var p = ""; for (var i = 0; i <= 96; i++) { var t = i / 96 * 2 * Math.PI, rr = r + d * Math.cos(n * t); p += (i ? "L" : "M") + (cx + rr * Math.sin(t)).toFixed(1) + "," + (cy - rr * Math.cos(t)).toFixed(1); } return p + "Z"; }

  MS.draw = function (host, entry, opts) {
    opts = opts || {};
    if (entry && !entry.sheet) entry = { id: "custom", name: "", sheet: entry, notes: "", wheel: {} };
    entry = JSON.parse(JSON.stringify(entry || MS.blank()));
    entry.wheel = entry.wheel || {};
    var C = opts.contrast ? COL_HC : COL, FS = opts.large ? 1.45 : 1, SW_ = opts.contrast ? 1.4 : 1;
    var svg = el("svg", { viewBox: "190 228 1660 925", class: "ms-svg" + (opts.contrast ? " ms-contrast" : "") + (opts.large ? " ms-large" : ""),
      role: "group", "aria-label": "Model D patch sheet" + (entry.name ? ": " + entry.name : " (blank)"), "font-family": FONT });
    host.innerHTML = ""; host.appendChild(svg);
    el("rect", { x: 190, y: 228, width: 1660, height: 925, fill: "#fff" }, svg);
    var defs = el("defs", {}, svg), pat = el("pattern", { id: "ms-ridge-" + Math.random().toString(36).slice(2, 7), width: 4, height: 3.6, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { x: 0, y: 0, width: 4, height: 2.2, fill: "#000" }, pat);
    var layers = {}; SECTIONS.concat([{ id: "title" }]).forEach(function (s) { layers[s.id] = el("g", { "data-section": s.id }, svg); });
    function L(x, y) { return layers[secOf(x, y)]; }
    function text(t, x, y, size, o) { o = o || {}; var e = el("text", { x: x, y: y, "font-size": size * (o.big ? 1 : FS * 0.86), "font-weight": o.w || 700, "text-anchor": o.anchor || "middle", fill: o.fill || "#000",
      "letter-spacing": o.ls || "0.05em", "font-family": o.ff, "dominant-baseline": o.base || "middle", "aria-hidden": "true" }, o.parent || L(x, y)); e.textContent = t; return e; }
    function line(x1, y1, x2, y2, w, g) { return el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "#000", "stroke-width": w || 2.5 }, g || L((x1 + x2) / 2, (y1 + y2) / 2)); }
    // ---- frames ----
    var T = layers.title;
    text("Sound:", 210, 285, 30, { anchor: "start", ff: SERIF, ls: "0", base: "auto", parent: T, big: true });
    var nameT = text(entry.name || "", 344, 285, 54, { anchor: "start", ff: SERIF, ls: "0", base: "auto", fill: C.or, parent: T, big: true });
    line(210, 299, 1006, 299, 2.5, T);
    el("rect", { x: 203, y: 346.5, width: 1629, height: 432, fill: "none", stroke: "#000", "stroke-width": 3 }, svg);
    [425, 788, 1210, 1572, 1772].forEach(function (x, i) { line(x, 346, x, 779, 3, svg); });
    line(1210, 598, 1572, 598, 3, layers.modifiers);
    el("rect", { x: 203, y: 799.5, width: 202, height: 337, fill: "none", stroke: "#000", "stroke-width": 3 }, layers.left);
    el("rect", { x: 424, y: 799.5, width: 1408, height: 337, fill: "none", stroke: "#000", "stroke-width": 3 }, layers.notes);
    [["CONTROLLERS", 313], ["OSCILLATOR   BANK", 607], ["MIXER", 999], ["MODIFIERS", 1391], ["OUTPUT", 1672]].forEach(function (s) { text(s[0], s[1], 745, 28, { w: 400, ls: "0.06em", ff: FONT }); });
    // ---- static labels ----
    var labels = [
      ["TUNE", 310, 448], ["GLIDE", 257, 563], ["MODULATION MIX", 364, 563], ["OSC. 3", 228, 708, 9], ["FILTER EG", 287, 708, 9], ["NOISE", 336, 708, 9], ["LFO", 393, 708, 9],
      ["OSC. 3/", 341, 659, 8.5], ["FILTER EG", 341, 668, 8.5], ["NOISE/", 388, 659, 8.5], ["LFO", 388, 668, 8.5],
      ["OSCILLATOR", 426, 476], ["MODULATION", 426, 487],
      ["RANGE", 518, 392], ["OSCILLATOR–1", 625, 392, 12.5], ["FREQUENCY", 625, 404, 9.5], ["WAVEFORM", 733, 392],
      ["OSCILLATOR–2", 625, 500, 12.5], ["OSCILLATOR–3", 625, 609, 12.5], ["OSC. 3", 449, 623, 8.5], ["CONTROL", 449, 633, 8.5],
      ["VOLUME", 841, 392], ["EXTERNAL", 1056, 438], ["INPUT VOLUME", 1056, 449], ["OVERLOAD", 1133, 480], ["NOISE VOLUME", 1056, 562], ["WHITE", 1133, 574], ["PINK", 1133, 656],
      ["FILTER", 1210, 422, 8.5], ["MODULATION", 1210, 432, 8.5], ["KEYBOARD", 1210, 524, 8.5], ["CONTROL", 1210, 534, 8.5], ["1", 1173, 504, 11], ["2", 1173, 554, 11],
      ["CUTOFF  FREQUENCY", 1302, 392], ["FILTER", 1410, 380, 13], ["EMPHASIS", 1410, 393], ["AMOUNT", 1518, 382], ["OF CONTOUR", 1518, 393],
      ["ATTACK TIME", 1302, 503], ["DECAY TIME", 1410, 503], ["SUSTAIN LEVEL", 1518, 503], ["LOUDNESS CONTOUR", 1410, 611, 13.5],
      ["ATTACK TIME", 1302, 625], ["DECAY TIME", 1410, 625], ["SUSTAIN LEVEL", 1518, 625],
      ["VOLUME", 1626, 392], ["MAIN OUTPUT", 1717, 392], ["A – 440", 1626, 541], ["VOLUME", 1626, 626], ["PHONES", 1717, 619], ["POWER", 1806, 611], ["ON", 1806, 626, 8.5],
      ["LFO RATE", 254, 812], ["GLIDE", 343, 812], ["DECAY", 343, 875], ["PITCH", 280, 1102, 12.5], ["MOD.", 381, 1102, 12.5]];
    labels.forEach(function (l) { text(l[0], l[1], l[2], l[3] || 10); });
    // mixer wires
    [[887, 453], [887, 561], [887, 669]].forEach(function (p) { line(p[0] + 10, p[1], 921, p[1], 2.2); });
    [[979, 507], [979, 615]].forEach(function (p) { line(p[0], p[1], 1003, p[1], 2.2); });
    // overload lamp, phones jack, power lamp, screws
    var g = L(1133, 507); [16, 11.5, 7].forEach(function (r) { el("circle", { cx: 1133, cy: 507, r: r, fill: "none", stroke: "#000", "stroke-width": 2.4 }, g); });
    g = L(1717, 669); var hex = ""; for (var i = 0; i < 6; i++) { var p = pol(1717, 669, 18, i * 60 + 30); hex += (i ? "L" : "M") + p[0] + "," + p[1]; }
    el("path", { d: hex + "Z", fill: "none", stroke: "#000", "stroke-width": 2.6 }, g); [13, 9, 5].forEach(function (r) { el("circle", { cx: 1717, cy: 669, r: r, fill: "none", stroke: "#000", "stroke-width": 2.2 }, g); });
    el("circle", { cx: 1806, cy: 592, r: 9, fill: "#fff", stroke: "#000", "stroke-width": 2.2 }, L(1806, 592));
    [[238, 932], [337, 932], [238, 1074], [337, 1074], [221, 1123], [383, 1123]].forEach(function (p) { var gg = L(p[0], p[1]); el("circle", { cx: p[0], cy: p[1], r: 8, fill: "#000" }, gg);
      line(p[0] - 4.5, p[1], p[0] + 4.5, p[1], 2.6, gg).setAttribute("stroke", "#fff"); line(p[0], p[1] - 4.5, p[0], p[1] + 4.5, 2.6, gg).setAttribute("stroke", "#fff"); });
    // notes box
    text("Notes:", 441, 840, 27, { anchor: "start", ff: SERIF, ls: "0", parent: layers.notes, big: true });
    var notesG = el("g", { "data-notes": "1" }, layers.notes);
    function drawNotes() {
      notesG.innerHTML = "";
      var lines = []; String(entry.notes || "").split("\n").forEach(function (ln) { var words = ln.split(" "), cur = ""; var max = opts.large ? 64 : 92;
        words.forEach(function (w) { if ((cur + " " + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }); lines.push(cur); });
      var size = 26 * (opts.large ? 1.2 : 1), gap = 42 * (opts.large ? 1.15 : 1);
      lines.slice(0, 7).forEach(function (ln, i) { text(ln, 441, 884 + i * gap, size, { anchor: "start", ff: SERIF, ls: "0", fill: C.or, parent: notesG, big: true }); });
    }
    drawNotes();

    // ---- interactive controls ----
    var ctl = {};
    function announce(g2, name, v, id) {
      var vt = valueText(id, v); g2.setAttribute("aria-label", name + ": " + vt); var t = g2.querySelector("title"); if (!t) t = el("title", {}, g2); t.textContent = name + ": " + vt;
      if (g2.getAttribute("role") === "slider" && typeof v === "number") { g2.setAttribute("aria-valuenow", v); g2.setAttribute("aria-valuetext", vt); }
    }
    function changed(id) { if (ctl[id]) ctl[id].paint(); if (opts.onChange) opts.onChange(JSON.parse(JSON.stringify(entry))); }
    function setVal(id, v) { entry.sheet[id] = v; changed(id); }
    function mkGroup(id, name, x, y, role) {
      var g2 = el("g", { class: "ms-ctl", "data-ctl": id, role: role }, L(x, y));
      if (opts.interactive) { g2.setAttribute("tabindex", "0"); g2.style.cursor = "pointer"; }
      return g2;
    }
    function ticksAndLabels(g2, kind, x, y, R, opts2) {
      var add = function (a, r1, r2, w) { var p = pol(x, y, r1, a), q = pol(x, y, r2, a); line(p[0], p[1], q[0], q[1], w || 2.4, g2); };
      var lab = function (t, a, r, s) { var p = pol(x, y, r, a); text(t, p[0], p[1], s || 9.5, { parent: g2 }); };
      if (kind === "k10" || kind === "cut" || kind === "tune") {
        for (var a = -150; a <= 150; a += 30) add(a, R + 3, R + 10);
        var labs = kind === "k10" ? [["0", -150], ["2", -90], ["4", -30], ["6", 30], ["8", 90], ["10", 150]]
          : kind === "cut" ? [["0", 0], ["–2", -60], ["2", 60], ["–4", -120], ["4", 120]] : [["0", 0], ["–1", -60], ["1", 60], ["–2", -120], ["2", 120]];
        labs.forEach(function (l) { lab(l[0], l[1], R + 18); });
      } else if (kind === "freq") {
        for (var b = -160; b <= 160; b += 20) add(b, R + 2, b === 0 ? R + 15 : R + 10);
        [-7, -5, -3, -1, 1, 3, 5, 7].forEach(function (n) { lab(n < 0 ? "–" + (-n) : String(n), n * 20, R + 21); });
      } else if (kind === "time") {
        TIME_TICKS.forEach(function (t) { add(t, R + 3, R + 10); });
        [["10", -116], ["200", -90], ["600", -31], ["1", 31], ["5", 67], ["10", 106]].forEach(function (l) { lab(l[0], l[1], R + 15 + (l[0].length - 1) * 2.5, 9); });
        text("M–SEC.", x - 28, y + 41, 8.5, { parent: g2 }); text("SEC.", x + 30, y + 41, 8.5, { parent: g2 });
      }
    }
    function drawKnob(c) {
      var id = c[0], name = c[1], kind = c[2], x = c[3], y = c[4], R = c[6] || (kind === "freq" ? 37 : 27), kd = KIND[kind];
      var g2 = mkGroup(id, name, x, y, "slider"); g2.setAttribute("aria-valuemin", kd.lo); g2.setAttribute("aria-valuemax", kd.hi);
      var stat = el("g", {}, g2), dyn = el("g", {}, g2);
      ticksAndLabels(stat, kind, x, y, R);
      function paint() {
        dyn.innerHTML = ""; var v = entry.sheet[id];
        if (v === null || v === undefined) {
          el("circle", { cx: x, cy: y, r: R, fill: "#fff", stroke: "#000", "stroke-width": 2.6 }, dyn);
        } else {
          el("circle", { cx: x, cy: y, r: R, fill: "#000" }, dyn);
          el("path", { d: scallop(x, y, R - 6, 8, 1.6), fill: "none", stroke: "#fff", "stroke-width": 1.6 }, dyn);
          el("circle", { cx: x, cy: y, r: id === "lfoRate" ? R * 0.62 : R * 0.52, fill: "#fff", stroke: "#000", "stroke-width": 1 }, dyn);
          var a = kd.a(v), p = pol(x, y, R + 5, a), p0 = id === "lfoRate" ? pol(x, y, R * 0.62, a) : [x, y];
          el("line", { x1: p0[0], y1: p0[1], x2: p[0], y2: p[1], stroke: C.or, "stroke-width": 5.2 * SW_, "stroke-linecap": "round", class: "ms-pointer" }, dyn);
        }
        if (id === "lfoRate") paintShape();
        announce(g2, name, v, id);
      }
      var shapeG;
      function paintShape() {
        if (!shapeG) return; shapeG.innerHTML = ""; var sh = entry.sheet.lfoShape, v = entry.sheet.lfoRate;
        if (!sh) return;
        var col = v === null || v === undefined ? "#000" : C.or;
        el("path", { d: sh === "square" ? "M" + (x - 9) + "," + (y + 5) + " L" + (x - 9) + "," + (y - 6) + " L" + x + "," + (y - 6) + " L" + x + "," + (y + 5) + " L" + (x + 9) + "," + (y + 5)
          : "M" + (x - 7) + "," + (y + 5) + " L" + x + "," + (y - 6) + " L" + (x + 7) + "," + (y + 5), fill: "none", stroke: col, "stroke-width": 2.6 * SW_, "stroke-linejoin": "round" }, shapeG);
        announce(shapeG, "LFO wave (push-pull)", sh, "lfoShape");
      }
      if (id === "lfoRate") {
        shapeG = el("g", { class: "ms-ctl", "data-ctl": "lfoShape", role: "switch" }, L(x, y));
        if (opts.interactive) { shapeG.setAttribute("tabindex", "0"); shapeG.style.cursor = "pointer";
          var flip = function (e) { e.stopPropagation(); entry.sheet.lfoShape = entry.sheet.lfoShape === "square" ? "triangle" : "square"; paintShape(); if (opts.onChange) opts.onChange(JSON.parse(JSON.stringify(entry))); };
          el("circle", { cx: x, cy: y, r: 11, fill: "transparent" }, shapeG);
          shapeG.addEventListener("click", flip); shapeG.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
          shapeG.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(e); } }); }
      }
      if (opts.interactive) {
        var drag = null;
        var step = function (v, d) { var a0 = v === null || v === undefined ? kd.a(kind === "cut" || kind === "tune" || kind === "freq" ? 0 : 5) : kd.a(v);
          var a = kind === "time" ? nextTime(a0, d) : snapAngle(kind, a0 + d * kd.half); return Math.round(kd.v(a) * 1000) / 1000; };
        g2.addEventListener("pointerdown", function (e) { e.preventDefault(); g2.focus && g2.focus(); var v = entry.sheet[id];
          drag = { y: e.clientY, a: v === null || v === undefined ? kd.a(kind === "cut" || kind === "tune" || kind === "freq" ? 0 : 5) : kd.a(v) };
          try { g2.setPointerCapture(e.pointerId); } catch (er) {} if (v === null || v === undefined) setVal(id, Math.round(kd.v(snapAngle(kind, drag.a)) * 1000) / 1000); });
        g2.addEventListener("pointermove", function (e) { if (!drag) return; var a = snapAngle(kind, drag.a + (drag.y - e.clientY) * 1.8);
          var v = Math.round(kd.v(a) * 1000) / 1000; if (v !== entry.sheet[id]) setVal(id, v); });
        g2.addEventListener("pointerup", function () { drag = null; }); g2.addEventListener("pointercancel", function () { drag = null; });
        g2.addEventListener("keydown", function (e) { var d = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
          if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setVal(id, null); return; }
          if (d) { e.preventDefault(); setVal(id, step(entry.sheet[id], d)); } });
        g2.addEventListener("wheel", function (e) { e.preventDefault(); setVal(id, step(entry.sheet[id], e.deltaY < 0 ? 1 : -1)); }, { passive: false });
      }
      ctl[id] = { paint: paint, g: g2 }; paint();
    }
    function nextTime(a, d) { var i = 0, best = 0; TIME_STOPS.forEach(function (t, j) { if (Math.abs(t - a) < Math.abs(TIME_STOPS[best] - a)) best = j; }); i = clamp(best + d, 0, TIME_STOPS.length - 1); return TIME_STOPS[i]; }
    function drawSel(c) {
      var id = c[0], name = c[1], x = c[3], y = c[4], optsL = c[5], R = 31, isRange = optsL === FEET;
      var g2 = mkGroup(id, name, x, y, "listbox"); var stat = el("g", {}, g2), dyn = el("g", {}, g2);
      optsL.forEach(function (o, i) { var a = -75 + i * 30, p = pol(x, y, R + 2, a), q = pol(x, y, R + 10, a); line(p[0], p[1], q[0], q[1], 2.4, stat); });
      function labelAt(o, i, parent, col) { var a = -75 + i * 30, p = pol(x, y, R + (Math.abs(a) > 40 ? 23 : Math.abs(a) > 20 ? 18 : 20), a);
        if (isRange) text(o.replace("'", "′"), p[0], p[1], 10, { parent: parent, fill: col });
        else el("path", { d: wavePath(o), transform: "translate(" + p[0] + "," + p[1] + ")", fill: "none", stroke: col || "#000", "stroke-width": 2.4, "stroke-linejoin": "miter" }, parent);
        return p; }
      optsL.forEach(function (o, i) { var p = labelAt(o, i, stat); if (opts.interactive) { var hit = el("circle", { cx: p[0], cy: p[1], r: 11, fill: "transparent", "data-opt": o }, stat);
        hit.addEventListener("click", function (e) { e.stopPropagation(); setVal(id, o); }); } });
      function paint() {
        dyn.innerHTML = ""; var v = entry.sheet[id], i = optsL.indexOf(v);
        if (i < 0) { el("circle", { cx: x, cy: y, r: R, fill: "#fff", stroke: "#000", "stroke-width": 2.6 }, dyn); el("circle", { cx: x, cy: y, r: 12.5, fill: "#fff", stroke: "#000", "stroke-width": 2.4 }, dyn); }
        else {
          var a = -75 + i * 30, lp = pol(x, y, R + (Math.abs(a) > 40 ? 23 : Math.abs(a) > 20 ? 18 : 20), a);
          el("circle", { cx: x, cy: y, r: R, fill: "#000" }, dyn);
          var s1 = pol(x, y, R + 4, a + 160), s2 = pol(x, y, R + 4, a + 200), s0 = pol(x, y, R - 6, a + 180);
          el("path", { d: "M" + s1 + " L" + s2 + " L" + s0 + "Z", fill: "#000" }, dyn);   // the skirt's pointer end
          el("circle", { cx: x, cy: y, r: 16.5, fill: "#fff" }, dyn); el("circle", { cx: x, cy: y, r: 13, fill: "#fff", stroke: "#000", "stroke-width": 1.6 }, dyn);
          var b0 = pol(x, y, 15, a), b1 = pol(x, y, R + 11, a);
          el("line", { x1: b0[0], y1: b0[1], x2: b1[0], y2: b1[1], stroke: C.bl, "stroke-width": 5 * SW_, "stroke-linecap": "round" }, dyn);
          el("circle", { cx: lp[0], cy: lp[1], r: 12, fill: "#fff", stroke: C.bl, "stroke-width": 3 * SW_, class: "ms-pick" }, dyn);
          labelAt(v, i, dyn);
        }
        announce(g2, name, v, id);
      }
      if (opts.interactive) {
        var stepSel = function (d) { var i = optsL.indexOf(entry.sheet[id]); i = i < 0 ? (isRange ? 3 : 2) : clamp(i + d, 0, optsL.length - 1); setVal(id, optsL[i]); };
        el("circle", { cx: x, cy: y, r: R, fill: "transparent" }, g2).addEventListener("click", function (e) { var i = optsL.indexOf(entry.sheet[id]); setVal(id, optsL[i < 0 ? (isRange ? 3 : 2) : (i + (e.shiftKey ? optsL.length - 1 : 1)) % optsL.length]); });
        g2.addEventListener("keydown", function (e) { var d = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
          if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setVal(id, null); return; } if (d) { e.preventDefault(); stepSel(d); } });
        g2.addEventListener("wheel", function (e) { e.preventDefault(); stepSel(e.deltaY < 0 ? 1 : -1); }, { passive: false });
      }
      ctl[id] = { paint: paint, g: g2 }; paint();
    }
    function drawSwitch(c) {
      var id = c[0], name = c[1], x = c[2], y = c[3], w = c[4], h = c[5], vert = c[6], ov = c[7], fill = C[c[8]];
      var g2 = mkGroup(id, name, x, y, "switch"), dyn = el("g", {}, g2);
      var r1 = { x: x - 1, y: y - 1, width: w + 1, height: h + 2 }, r2 = vert ? { x: x - 1, y: y + h, width: w + 2, height: h + 2 } : { x: x + w, y: y - 1, width: w + 2, height: h + 2 };
      if (vert) r1 = { x: x - 1, y: y - 1, width: w + 2, height: h + 1 };
      if (c[9]) text("ON", vert ? x + w / 2 : x + w * 1.5 + 1, y + h + 11, 8.5, { parent: g2 });
      function paint() {
        dyn.innerHTML = ""; var v = entry.sheet[id], i = ov.indexOf(v);
        [r1, r2].forEach(function (r, j) { el("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: i === j ? fill : "#fff", stroke: "#000", "stroke-width": 2.6 }, dyn); });
        announce(g2, name, v === null || v === undefined ? null : v, id);
        g2.setAttribute("aria-checked", v === ov[1] ? "true" : "false");
      }
      if (opts.interactive) {
        var flip = function () { var v = entry.sheet[id]; setVal(id, v === ov[1] ? ov[0] : ov[1]); };
        g2.addEventListener("click", flip);
        g2.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setVal(id, null); } });
      }
      ctl[id] = { paint: paint, g: g2 }; paint();
    }
    function drawWheel(which, x0) {
      var lo = 938, hi = 1083, g2 = mkGroup("wheel-" + which, which === "mod" ? "Mod wheel" : "Pitch wheel", x0, 1000, "slider"), dyn = el("g", {}, g2);
      g2.setAttribute("aria-valuemin", which === "mod" ? 0 : -1); g2.setAttribute("aria-valuemax", 1);
      el("rect", { x: x0 - 7, y: lo, width: 14, height: hi - lo, rx: 2, fill: "url(#" + pat.id + ")", stroke: "#000", "stroke-width": 0.5 }, g2);
      var yOf = function (v) { return which === "mod" ? 1076 - v * 131 : 1009 - v * 66; }, vOf = function (yy) { return which === "mod" ? clamp((1076 - yy) / 131, 0, 1) : clamp((1009 - yy) / 66, -1, 1); };
      function paint() {
        dyn.innerHTML = ""; var v = entry.wheel[which];
        if (v !== null && v !== undefined) { var yy = yOf(v); el("rect", { x: x0 - 8, y: yy - 11, width: 16, height: 22, fill: "#000" }, dyn); el("circle", { cx: x0, cy: yy, r: 4.5, fill: "none", stroke: "#fff", "stroke-width": 2 }, dyn); }
        var ar = entry.wheel.arrow;
        if (ar && ar.wheel === which) { var ax = x0 - 17, ya = yOf(ar.frm), yb = yOf(ar.to), up = yb < ya;
          el("line", { x1: ax, y1: ya, x2: ax, y2: yb + (up ? 4 : -4), stroke: C.or, "stroke-width": 2.6 * SW_ }, dyn);
          el("path", { d: "M" + (ax - 4) + "," + (yb + (up ? 8 : -8)) + " L" + ax + "," + yb + " L" + (ax + 4) + "," + (yb + (up ? 8 : -8)) + "Z", fill: C.or }, dyn); }
        var vt = v === null || v === undefined ? "not shown" : (which === "pitch" && v === 0 ? "centre" : String(v)) + (ar && ar.wheel === which ? "; arrow " + ar.dir + " from " + ar.frm + " to " + ar.to : "");
        g2.setAttribute("aria-label", (which === "mod" ? "Mod wheel" : "Pitch wheel") + ": " + vt); var t = g2.querySelector("title") || el("title", {}, g2); t.textContent = g2.getAttribute("aria-label");
        if (typeof v === "number") g2.setAttribute("aria-valuenow", v);
      }
      if (opts.interactive) {
        var dragging = false, at = function (e) { var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var p = pt.matrixTransform(m.inverse());
          entry.wheel[which] = Math.round(vOf(p.y) * 20) / 20; paint(); if (opts.onChange) opts.onChange(JSON.parse(JSON.stringify(entry))); };
        el("rect", { x: x0 - 14, y: lo - 8, width: 28, height: hi - lo + 16, fill: "transparent" }, g2);
        g2.addEventListener("pointerdown", function (e) { dragging = true; try { g2.setPointerCapture(e.pointerId); } catch (er) {} at(e); });
        g2.addEventListener("pointermove", function (e) { if (dragging) at(e); }); g2.addEventListener("pointerup", function () { dragging = false; });
        g2.addEventListener("keydown", function (e) { var d = e.key === "ArrowUp" ? 0.05 : e.key === "ArrowDown" ? -0.05 : 0; if (!d) return; e.preventDefault();
          var v = entry.wheel[which]; v = Math.round(((v === null || v === undefined ? 0 : v) + d) * 20) / 20; entry.wheel[which] = which === "mod" ? clamp(v, 0, 1) : clamp(v, -1, 1); paint(); if (opts.onChange) opts.onChange(JSON.parse(JSON.stringify(entry))); });
      }
      ctl["wheel-" + which] = { paint: paint, g: g2 }; paint();
    }
    K.forEach(function (c) { if (c[2] === "sel") drawSel(c); else drawKnob(c); });
    SW.forEach(drawSwitch);
    drawWheel("pitch", 277); drawWheel("mod", 377);
    // ---- one section at a time ----
    var api = { svg: svg, entry: entry, ctl: ctl };
    api.section = function (sid) {
      var s = SECTIONS.find(function (x) { return x.id === sid; });
      Object.keys(layers).forEach(function (k) { layers[k].style.display = !s || k === sid ? "" : "none"; });
      Array.prototype.forEach.call(svg.children, function (ch) { if (ch.tagName !== "g" && ch.tagName !== "defs" && ch !== svg.firstChild) ch.style.display = s ? "none" : ""; });
      if (s) { var b = s.box, pad = 14; svg.setAttribute("viewBox", (b[0] - pad) + " " + (b[1] - pad) + " " + (b[2] - b[0] + 2 * pad) + " " + (b[3] - b[1] + 2 * pad));
        el("rect", { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], fill: "none", stroke: "#000", "stroke-width": 3, class: "ms-secframe" }, layers[sid]); }
      else { svg.setAttribute("viewBox", "190 228 1660 925"); svg.querySelectorAll(".ms-secframe").forEach(function (f) { f.remove(); }); }
      svg.setAttribute("data-section", sid || "all");
    };
    api.set = function (e2) { var h2 = MS.draw(host, e2, opts); for (var k in h2) api[k] = h2[k]; return api; };
    api.setNotes = function (t) { entry.notes = t; drawNotes(); };
    if (opts.section) api.section(opts.section);
    return api;
  };

  // ---------- print ----------
  MS.print = function (entry) {
    if (typeof document === "undefined") return null;
    var old = document.querySelector(".ms-print-sheet"); if (old) old.remove();
    var div = document.createElement("div"); div.className = "ms-print-sheet"; document.body.appendChild(div);
    MS.draw(div, entry || MS.blank(), { interactive: false });
    document.documentElement.classList.add("ms-printing");
    var done = function () { document.documentElement.classList.remove("ms-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    try { window.print(); } catch (e) {}
    return div;
  };

  // ---------- the page widget ----------
  MS.mount = function (host) {
    host.classList.add("ms-w"); host.innerHTML = "";
    var state = { list: [], i: 0, entry: null, sec: -1, large: false, contrast: false };
    var bar = document.createElement("div"); bar.className = "ms-bar"; host.appendChild(bar);
    function btn(label, title, fn, cls) { var b = document.createElement("button"); b.type = "button"; b.className = "ms-btn" + (cls ? " " + cls : ""); b.textContent = label; if (title) b.title = title; b.addEventListener("click", fn); return b; }
    var pick = document.createElement("select"); pick.className = "ms-pick"; pick.setAttribute("aria-label", "Patch sheet");
    var lab = document.createElement("label"); lab.className = "ms-lab"; lab.textContent = "Sheet "; lab.appendChild(pick); bar.appendChild(lab);
    var play = btn("▶ Play", "Play this sheet on the Model D above", function () { doPlay(true); }, "ms-play");
    var show = btn("Show on the panel above", "Set the Model D panel above to this sheet", function () { doPlay(false); }, "ms-show");
    bar.appendChild(play); bar.appendChild(show);
    var opts2 = document.createElement("span"); opts2.className = "ms-opts"; bar.appendChild(opts2);
    function check(label, key) { var l = document.createElement("label"); var c = document.createElement("input"); c.type = "checkbox"; c.className = "ms-" + key; l.appendChild(c); l.appendChild(document.createTextNode(" " + label));
      c.addEventListener("change", function () { state[key] = c.checked; render(); }); opts2.appendChild(l); return c; }
    check("Large print", "large"); check("High contrast", "contrast");
    var oneSec = check("One part at a time", "one");
    var nav = document.createElement("div"); nav.className = "ms-nav"; host.appendChild(nav);
    var back = btn("◀ Back", "Previous part", function () { state.sec = Math.max(0, state.sec - 1); render(); }, "ms-back");
    var secName = document.createElement("span"); secName.className = "ms-secname"; secName.setAttribute("aria-live", "polite");
    var next = btn("Next ▶", "Next part", function () { state.sec = Math.min(SECTIONS.length - 1, state.sec + 1); render(); }, "ms-next");
    nav.appendChild(back); nav.appendChild(secName); nav.appendChild(next);
    var paper = document.createElement("div"); paper.className = "ms-paper"; host.appendChild(paper);
    var info = document.createElement("p"); info.className = "ms-info"; host.appendChild(info);
    var notesL = document.createElement("label"); notesL.className = "ms-noteslab"; notesL.textContent = "My notes ";
    var notes = document.createElement("textarea"); notes.className = "ms-notes"; notes.rows = 3; notesL.appendChild(notes); host.appendChild(notesL);
    var bar2 = document.createElement("div"); bar2.className = "ms-bar"; host.appendChild(bar2);
    bar2.appendChild(btn("Save my sheet", "Download this sheet with its notes as a file", save, "ms-save"));
    var open = document.createElement("input"); open.type = "file"; open.accept = ".json,application/json"; open.className = "ms-open"; open.setAttribute("aria-label", "Open a saved sheet");
    var openL = document.createElement("label"); openL.className = "ms-btn ms-openlab"; openL.textContent = "Open a saved sheet"; openL.appendChild(open); bar2.appendChild(openL);
    bar2.appendChild(btn("Print this sheet", "Print the sheet alone, page width", function () { MS.print(state.entry); }, "ms-print"));
    bar2.appendChild(btn("Print a blank sheet", "Print an empty sheet to fill in by hand", function () { MS.print(null); }, "ms-printblank"));
    var msg = document.createElement("p"); msg.className = "ms-msg"; msg.setAttribute("aria-live", "polite"); host.appendChild(msg);
    var view = null;
    notes.addEventListener("input", function () { if (!state.entry) return; state.entry.notes = notes.value; if (view) view.setNotes(notes.value); });
    pick.addEventListener("change", function () { state.i = +pick.value; state.entry = JSON.parse(JSON.stringify(state.list[state.i])); render(); });
    open.addEventListener("change", function () { var f = open.files && open.files[0]; if (!f) return; f.text().then(function (t) { try { var e = JSON.parse(t); if (!e.sheet) throw new Error("no sheet");
      state.entry = e; render(); msg.textContent = "Opened " + (e.name || "your sheet") + "."; } catch (er) { msg.textContent = "That file is not a saved sheet."; } }); });
    function save() {
      var e = state.entry; if (!e) return; var data = JSON.stringify({ id: e.id, name: e.name, page: e.page, sheet: e.sheet, wheel: e.wheel, notes: e.notes, from: "Minimoog Model D manual patch sheet" }, null, 1);
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = "moog-sheet-" + (e.id || "mine") + ".json";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); MS.lastSaved = data; msg.textContent = "Saved."; }
    function widget() { var SC = window.SynthCompare; var W = SC && SC.widgets && SC.widgets[0]; return W && typeof W.set === "function" ? W : null; }
    function doPlay(sound) {
      var W = widget(); if (!W) { msg.textContent = "The Model D panel is not on this page, so the sheet cannot be played here."; return Promise.resolve(false); }
      var st = MS.toState(state.entry.sheet); for (var k in st) W.set("moog", k, st[k], true);
      if (typeof W.translate === "function") W.translate("moog", true);
      if (W.ex && state.entry.wheel && typeof state.entry.wheel.mod === "number") W.ex = Object.assign({}, W.ex, { wheel: state.entry.wheel.mod });
      if (!sound) { var p = document.querySelector(".scmp"); if (p && p.scrollIntoView) p.scrollIntoView({ behavior: "smooth", block: "start" }); msg.textContent = "The Model D panel above now shows " + (state.entry.name || "this sheet") + "."; return Promise.resolve(true); }
      msg.textContent = "Playing " + (state.entry.name || "this sheet") + " on the Model D above (the page's sound, not a recording of the real one).";
      return typeof W.phrase === "function" ? Promise.resolve(W.phrase(["moog"])).then(function () { return true; }) : Promise.resolve(false);
    }
    function render() {
      var e = state.entry; if (!e) return;
      if (!oneSec.checked) state.sec = -1; else if (state.sec < 0) state.sec = 0;
      nav.style.display = oneSec.checked ? "" : "none";
      view = MS.draw(paper, e, { interactive: true, large: state.large, contrast: state.contrast, section: state.sec >= 0 ? SECTIONS[state.sec].id : null,
        onChange: function (n) { state.entry = n; MS.current = n; } });
      MS.view = view; MS.current = e;
      if (state.sec >= 0) { secName.textContent = (state.sec + 1) + " of " + SECTIONS.length + ": " + SECTIONS[state.sec].name; back.disabled = state.sec === 0; next.disabled = state.sec === SECTIONS.length - 1; }
      notes.value = e.notes || "";
      var bits = []; if (e.page) bits.push((e.blank ? "Blank sheet, manual p. " : "Manual p. ") + e.page);
      if (e.unsure && e.unsure.length) bits.push("Hard to read on the printed sheet: " + e.unsure.join(", "));
      if (e.readings && Object.keys(e.readings).length) bits.push("Times: " + Object.keys(e.readings).map(function (k) { return k + " " + e.readings[k]; }).join(", "));
      info.textContent = bits.join(". ") + (bits.length ? "." : "");
    }
    var url = host.getAttribute("data-src") || "/apps/shared/data/moog-sheets.json";
    MS.ready = fetch(url).then(function (r) { return r.json(); }).then(function (list) {
      state.list = list.filter(function (e) { return !e.blank; }); state.list.push(MS.blank());
      state.list.forEach(function (e, i) { var o = document.createElement("option"); o.value = i; o.textContent = e.blank ? "Blank sheet" : "p. " + e.page + ": " + e.name; pick.appendChild(o); });
      MS.sheets = list; state.entry = JSON.parse(JSON.stringify(state.list[0])); render(); return list;
    }).catch(function (er) { msg.textContent = "The sheets could not be loaded."; throw er; });
    return state;
  };
  function init() { if (typeof document === "undefined") return; document.querySelectorAll("div.moog-sheets:not(.ms-w)").forEach(function (d) { MS.mount(d); }); }
  if (typeof window !== "undefined") { window.MoogSheet = MS; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
  if (typeof module !== "undefined") module.exports = MS;
})();
