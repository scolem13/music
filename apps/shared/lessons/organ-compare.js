// OrganCompare: four organs built the way the site does synths (lessons/organ-compare.qmd, lessons/intro-{b3,vox-continental,farfisa,pipe-organ}.qmd).
//   Hammond B-3 / C-3 + Leslie 122 ("b3"), Vox Continental ("vox"), Farfisa Combo Compact ("farfisa"), and a GENERIC two-manual + pedal
//   pipe organ ("pipe": not any one instrument; its stop list is this page's own, a small classical scheme).
// One engine (plain Web Audio, registered with AudioTap), one profile per model. Sources: scripts/sources/organs.py. UNVERIFIED items are
// listed in each profile's `unverified` and shown on the page.
//
// STATE (flat keys; every key has a range, see OC.range(model, key)):
//   b3:   uA.0-8 uB.0-8 (upper drawbar sets, preset keys A# and B), lA.0-8 lB.0-8 (lower), p.0 p.1 (pedal 16′ 8′), 0..8
//         upre / lpre preset key "C" (cancel) "C#".."A" (factory presets) "A#" "B" (drawbar sets); perc, percVol normal|soft, percDec fast|slow,
//         percH 2nd|3rd; vib V1 V2 V3 C1 C2 C3, vibU, vibL (scanner on for the upper / lower manual); leslie stop|slow|fast; swell 0..1; drive 0..1; click 0..1
//   vox:  d16 d8 d4 dIV (footage drawbars) flute reed (tone drawbars) 0..8; vib (on/off); swell
//   farfisa: bass16 str16 fl8 ob8 tr8 str8 fl4 pic4 str4 (tabs, on/off); vib off|ls|lf|hs|hf; rev (reverb tab), swell
//   pipe: g_* (Great) s_* (Swell) p_* (Pedal) stops on/off; sw_gt gt_pd sw_pd couplers; trem (Swell tremulant); swbox 0..1 (Swell box); reverb 0..1
// CANONICAL (what translate goes through): { ranks: [{ man: "upper"|"lower"|"pedal", ratio (nominal: 8′ = 1), db (0 = loudest), color:
//   "sine"|"flute"|"principal"|"string"|"reed", from }], fx: { perc: {harm, decay, vol}|null, vib: {kind: "vib"|"chorus", depth 1..3, rate}|null,
//   rotary: "slow"|"fast"|"stop"|null, trem: bool, reverb: 0..1 } }
// API: OC.PROFILES, OC.MODELS, OC.def(model) -> state, OC.full(model, s), OC.range(model, key), OC.toCanon(model, s), OC.fromCanon(model, canon),
//   OC.translate(s, from, to) -> { state, notes: [{ what, cls: "exact"|"approx"|"lost", why }] }, OC.partials(model, s, midi, manual) ->
//   [{ f, a, color, ratio }] (what one key sounds: the test reads it), OC.voice(ctx, model, state) -> { output, noteOn(midi, man, when),
//   noteOff(midi, man, when), set(state), allOff(), analyser }, OC.EXAMPLES, OC.mount(el) (widget), OC.widgets.
(function (root) {
  "use strict";
  var OC = {};
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var FT = { 0.5: "16′", 1: "8′", 1.5: "5⅓′", 2: "4′", 3: "2⅔′", 4: "2′", 5: "1⅗′", 6: "1⅓′", 8: "1′", 12: "⅔′", 0.25: "32′" };
  var ft = function (r) { return FT[r] || (8 / r).toFixed(2) + "′"; };
  var ET = function (r) { return Math.pow(2, Math.round(12 * Math.log2(r)) / 12); };   // a divide-down organ: every pitch equal-tempered
  var B3R = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];
  // Tonewheel ratios (copied from the band's model, apps/shared/band/sounds.js / ORGAN.md, Electric Druid): fifths and the third tempered.
  var TWR = [0.5, 1.49882353, 1, 2, 2.99764706, 4, 5.040941178, 5.99529412, 8];
  var TW_OFF = [-12, 7, 0, 12, 19, 24, 28, 31, 36];
  var B3COL = ["brown", "brown", "white", "white", "black", "white", "black", "black", "white"];
  var KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  // Factory presets (C# to A). Upper C#-E: Cherry Audio's Blue3 manual and a second web page agree; the rest of the upper and all of the
  // lower: the same Blue3 table / memory, NOT checked against a Hammond document (UNVERIFIED).
  var PRE_U = { "C#": ["Stopped Flute", "005320000"], "D": ["Dulciana", "004432000"], "D#": ["French Horn", "008740000"], "E": ["Salicional", "004544222"],
    "F": ["Flutes 8′ & 4′", "005403000"], "F#": ["Oboe Horn", "004675300"], "G": ["Swell Diapason", "005644320"], "G#": ["Trumpet", "006876540"], "A": ["Full Swell", "327645222"] };
  var PRE_L = { "C#": ["Cello", "004545440"], "D": ["Flute & String", "004432220"], "D#": ["Clarinet", "007373430"], "E": ["Diapason, Gamba & Flute", "004436300"],
    "F": ["Great, no reeds", "006644322"], "F#": ["Open Diapason", "005642200"], "G": ["Full Great", "006845433"], "G#": ["Tibia Clausa", "008030000"], "A": ["Full Great with 16′", "427866244"] };
  var bars = function (str) { return str.split("").map(Number); };
  var dbOf = function (n) { return n > 0 ? -3 * (8 - n) : null; };        // 3 dB a drawbar step (ORGAN.md: a clone's description, widely repeated)
  var barOf = function (db) { return db == null ? 0 : clamp(Math.round(8 + db / 3), 1, 8); };

  // ---------------- profiles ----------------
  function k(key, label, min, max, step, d) { return [key, label, "k", min, max, step, d]; }
  function s(key, label, d) { return [key, label, "s", null, null, null, !!d]; }
  function c(key, label, list, d) { return [key, label, "c", list, null, null, d]; }
  var P = OC.PROFILES = {};
  var b3groups = [];
  ["uA", "uB", "lA", "lB"].forEach(function (g, gi) {
    var nm = ["Upper drawbars, set 1 (preset key A♯)", "Upper drawbars, set 2 (preset key B)", "Lower drawbars, set 1 (A♯)", "Lower drawbars, set 2 (B)"][gi];
    var dflt = gi === 1 ? "888000000" : gi === 3 ? "008080800" : gi === 0 ? "006876540" : "004545440";
    b3groups.push([nm, "bars", B3R.map(function (r, i) { return k(g + "." + i, ft(r), 0, 8, 1, +dflt[i]); })]);
  });
  b3groups.push(["Pedal drawbars", "bars", [k("p.0", "16′", 0, 8, 1, 6), k("p.1", "8′", 0, 8, 1, 3)]]);
  b3groups.push(["Preset keys", "keys", [c("upre", "Upper preset key", KEYS, "B"), c("lpre", "Lower preset key", KEYS, "B")]]);
  b3groups.push(["Percussion (upper manual, preset key B only)", "sw", [s("perc", "Percussion on", true), c("percVol", "Volume", ["normal", "soft"], "soft"),
    c("percDec", "Decay", ["fast", "slow"], "fast"), c("percH", "Harmonic", ["2nd", "3rd"], "3rd")]]);
  b3groups.push(["Vibrato and chorus (scanner)", "sw", [c("vib", "Setting", ["V1", "V2", "V3", "C1", "C2", "C3"], "C3"), s("vibU", "Upper on", true), s("vibL", "Lower on", false)]]);
  b3groups.push(["Leslie 122 and expression", "sw", [c("leslie", "Leslie", ["stop", "slow", "fast"], "slow"), k("swell", "Swell pedal", 0, 1, 0.01, 0.8),
    k("drive", "Drive (amp)", 0, 1, 0.01, 0.2), k("click", "Key click", 0, 1, 0.01, 0.5)]]);
  P.b3 = { id: "b3", name: "Hammond B-3 / C-3 + Leslie 122", short: "B-3", year: "1954", gen: "tonewheel",
    blurb: "Electromechanical: 91 spinning tonewheels make near-sine tones; nine drawbars per manual mix nine pitches of each key.",
    manuals: ["upper", "lower", "pedal"], range: { upper: [36, 96], lower: [36, 96], pedal: [24, 48] }, groups: b3groups,
    unverified: ["Positions on the drawn panel (no measured drawing used)", "Factory presets F-A upper and all lower presets", "Percussion decay times (fast about 0.2 s, slow about 1 s) and the soft level (about 10 dB down)",
      "Normal percussion lowers the drawbars by 3 dB", "V1 / V2 / V3 depths (only C3's ~0.9 ms comes from a source)", "Pedal tone (two drawbars, here plain 16′ and 8′ sines)", "Leslie brake: 'stop' freezes the rotors where they are"] };
  P.vox = { id: "vox", name: "Vox Continental", short: "Continental", year: "1962", gen: "divide-down",
    blurb: "Transistor: twelve top-octave oscillators, divided down by octaves, so every note is equal-tempered and the voicing is fixed.",
    manuals: ["upper"], range: { upper: [36, 84] },
    groups: [["Footage drawbars", "bars", [k("d16", "16′", 0, 8, 1, 0), k("d8", "8′", 0, 8, 1, 8), k("d4", "4′", 0, 8, 1, 6), k("dIV", "IV", 0, 8, 1, 3)]],
      ["Voice drawbars", "bars", [k("flute", "~ flute", 0, 8, 1, 6), k("reed", "Λ reed", 0, 8, 1, 6)]],
      ["Vibrato and volume", "sw", [s("vib", "Vibrato", true), k("swell", "Volume pedal", 0, 1, 0.01, 0.8)]]],
    unverified: ["The IV mixture's pitches (here 2⅔′ 2′ 1⅗′ 1′)", "The flute and reed waveforms (the page's own)", "Vibrato rate and depth (Wikipedia: single speed, single intensity)", "Drawbar steps 0-8 at 3 dB a step", "Panel positions and colours"] };
  P.farfisa = { id: "farfisa", name: "Farfisa Combo Compact", short: "Farfisa", year: "1964", gen: "divide-down",
    blurb: "Transistor: twelve tone generators and frequency dividers; on/off voice tabs, each a fixed tone colour at a fixed footage.",
    manuals: ["upper"], range: { upper: [41, 89] },
    groups: [["Voice tabs", "tabs", [s("bass16", "Bass 16′", false), s("str16", "Strings 16′", false), s("fl8", "Flute 8′", true), s("ob8", "Oboe 8′", false), s("tr8", "Trumpet 8′", false),
      s("str8", "Strings 8′", false), s("fl4", "Flute 4′", true), s("pic4", "Piccolo 4′", false), s("str4", "Strings 4′", false)]],
      ["Vibrato, reverb, volume", "sw", [c("vib", "Vibrato", ["off", "ls", "lf", "hs", "hf"], "lf"), s("rev", "Reverb", false), k("swell", "Volume pedal", 0, 1, 0.01, 0.8)]]],
    vibNames: { off: "off", ls: "light slow", lf: "light fast", hs: "heavy slow", hf: "heavy fast" },
    unverified: ["The four vibrato settings as light / heavy x slow / fast (Wikipedia says only 'four vibrato settings')", "Tab colours and timbres (the page's own)", "Whether Bass 16′ sounds on the whole keyboard (here it does)", "Keyboard range", "Panel positions"] };
  var PIPE = [ // [key, division, name, ratio(s), colour]
    ["g_prin8", "gt", "Principal 8′", [1], "principal"], ["g_rohr8", "gt", "Rohrflöte 8′", [1], "flute"], ["g_oct4", "gt", "Octave 4′", [2], "principal"],
    ["g_fift2", "gt", "Fifteenth 2′", [4], "principal"], ["g_mix", "gt", "Mixture IV", [4, 6, 8, 12], "principal"], ["g_trp8", "gt", "Trumpet 8′", [1], "reed"],
    ["s_ged8", "sw", "Gedackt 8′", [1], "flute"], ["s_sal8", "sw", "Salicional 8′", [1], "string"], ["s_fl4", "sw", "Spitzflöte 4′", [2], "flute"],
    ["s_naz", "sw", "Nazard 2⅔′", [3], "flute"], ["s_fl2", "sw", "Blockflöte 2′", [4], "flute"], ["s_tie", "sw", "Tierce 1⅗′", [5], "flute"], ["s_ob8", "sw", "Oboe 8′", [1], "reed"],
    ["p_sub16", "pd", "Subbass 16′", [0.5], "flute"], ["p_oct8", "pd", "Octave 8′", [1], "principal"], ["p_trb16", "pd", "Trombone 16′", [0.5], "reed"]];
  OC.PIPE_STOPS = PIPE;
  P.pipe = { id: "pipe", name: "Pipe organ (generic, two manuals + pedal)", short: "pipe organ", year: "", gen: "pipes",
    blurb: "Wind blown through ranks of pipes, one rank a stop, one pipe a key. Not a model of any real organ: a small, made-up classical stop list.",
    manuals: ["upper", "lower", "pedal"], manNames: { upper: "Swell (upper)", lower: "Great (lower)", pedal: "Pedal" }, range: { upper: [36, 96], lower: [36, 96], pedal: [24, 55] },
    groups: [["Great (lower manual)", "tabs", PIPE.filter(function (x) { return x[1] === "gt"; }).map(function (x) { return s(x[0], x[2], x[0] === "g_prin8" || x[0] === "g_oct4"); })],
      ["Swell (upper manual)", "tabs", PIPE.filter(function (x) { return x[1] === "sw"; }).map(function (x) { return s(x[0], x[2], x[0] === "s_ged8" || x[0] === "s_fl4"); }).concat([s("trem", "Tremulant", false), k("swbox", "Swell box", 0, 1, 0.01, 0.8)])],
      ["Pedal", "tabs", PIPE.filter(function (x) { return x[1] === "pd"; }).map(function (x) { return s(x[0], x[2], x[0] === "p_sub16"); })],
      ["Couplers and room", "sw", [s("sw_gt", "Swell to Great", false), s("gt_pd", "Great to Pedal", false), s("sw_pd", "Swell to Pedal", false), k("reverb", "Room (reverb)", 0, 1, 0.01, 0.5)]]],
    unverified: ["Everything: the stop list, voicing, chiff, wind and room are this page's own sketch, not an instrument", "The Mixture IV composition (2′ 1⅓′ 1′ ⅔′, breaking back an octave from c′′)"] };
  OC.MODELS = ["b3", "vox", "farfisa", "pipe"];
  Object.keys(P).forEach(function (m) { var R = P[m].ranges = {}; P[m].def = {}; P[m].groups.forEach(function (g) { g[2].forEach(function (x) { R[x[0]] = x; P[m].def[x[0]] = x[6]; }); }); });
  OC.def = function (m) { return Object.assign({}, P[m].def); };
  OC.full = function (m, st) { var o = OC.def(m); for (var x in st || {}) if (x in o) o[x] = st[x]; return o; };
  OC.range = function (m, key) { return P[m].ranges[key] || null; };

  // ---------------- what is sounding: registration -> canonical ----------------
  function b3bars(st, man) {
    var p = man === "upper" ? "u" : "l", key = st[p + "pre"], tbl = man === "upper" ? PRE_U : PRE_L;
    if (key === "C") return [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (key === "A#" || key === "B") { var g = p + (key === "A#" ? "A" : "B"); return B3R.map(function (r, i) { return +st[g + "." + i] || 0; }); }
    return bars(tbl[key][1]);
  }
  OC.b3bars = b3bars; OC.PRESETS = { upper: PRE_U, lower: PRE_L };
  function percOn(st) { return !!st.perc && st.upre === "B"; }      // B-3: percussion only with the B preset key (XK-5 manual: "same as B-3/C-3")
  var VIBD = { V1: 1, V2: 2, V3: 3, C1: 1, C2: 2, C3: 3 };
  var FVIB = { off: null, ls: [1, 5.5], lf: [1, 7.5], hs: [3, 5.5], hf: [3, 7.5] };
  OC.toCanon = function (m, st0) {
    var st = OC.full(m, st0), R = [], fx = { perc: null, vib: null, rotary: null, trem: false, reverb: 0 };
    var add = function (man, ratio, db, color, from) { if (db != null) R.push({ man: man, ratio: ratio, db: db, color: color, from: from }); };
    if (m === "b3") {
      ["upper", "lower"].forEach(function (man) { var b = b3bars(st, man);
        if (man === "upper" && percOn(st)) b[8] = 0;      // the 1′ drawbar is silent while percussion is on (XK-5 manual, as on the B-3/C-3)
        b.forEach(function (n, i) { add(man, B3R[i], dbOf(n), "sine", (man === "upper" ? "upper " : "lower ") + ft(B3R[i])); }); });
      add("pedal", 0.5, dbOf(st["p.0"]), "sine", "pedal 16′"); add("pedal", 1, dbOf(st["p.1"]), "sine", "pedal 8′");
      if (percOn(st)) fx.perc = { harm: st.percH === "3rd" ? 3 : 2, decay: st.percDec, vol: st.percVol };
      if (st.vibU || st.vibL) fx.vib = { kind: st.vib[0] === "C" ? "chorus" : "vib", depth: VIBD[st.vib], rate: 6.87, upper: st.vibU, lower: st.vibL };
      fx.rotary = st.leslie;
    } else if (m === "vox") {
      var col = st.reed === 0 ? "flute" : st.flute === 0 ? "reed" : st.reed > st.flute + 2 ? "reed" : st.flute > st.reed + 2 ? "flute" : "principal";
      if (st.flute === 0 && st.reed === 0) col = null;
      if (col) { add("upper", 0.5, dbOf(st.d16), col, "16′"); add("upper", 1, dbOf(st.d8), col, "8′"); add("upper", 2, dbOf(st.d4), col, "4′");
        [3, 4, 5, 8].forEach(function (r) { add("upper", r, dbOf(st.dIV), col, "IV (" + ft(r) + ")"); }); }
      if (st.vib) fx.vib = { kind: "vib", depth: 2, rate: 6.5 };
    } else if (m === "farfisa") {
      var T = { bass16: [0.5, "flute"], str16: [0.5, "string"], fl8: [1, "flute"], ob8: [1, "reed"], tr8: [1, "reed"], str8: [1, "string"], fl4: [2, "flute"], pic4: [2, "flute"], str4: [2, "string"] };
      for (var t in T) if (st[t]) add("upper", T[t][0], t === "pic4" ? -3 : 0, T[t][1], P.farfisa.ranges[t][1]);
      if (FVIB[st.vib]) fx.vib = { kind: "vib", depth: FVIB[st.vib][0], rate: FVIB[st.vib][1] };
      fx.reverb = st.rev ? 0.4 : 0;
    } else if (m === "pipe") {
      var on = function (div) { return PIPE.filter(function (x) { return x[1] === div && st[x[0]]; }); };
      var put = function (man, div, why) { on(div).forEach(function (x) { x[3].forEach(function (r) { add(man, r, x[0] === "g_mix" ? -4 : 0, x[4], x[2] + (why || "")); }); }); };
      put("upper", "sw"); put("lower", "gt"); put("pedal", "pd");
      if (st.sw_gt) put("lower", "sw", " (Swell to Great)"); if (st.gt_pd) put("pedal", "gt", " (Great to Pedal)"); if (st.sw_pd) put("pedal", "sw", " (Swell to Pedal)");
      fx.trem = !!st.trem; fx.reverb = st.reverb;
    }
    return { ranks: R, fx: fx };
  };

  // ---------------- canonical -> a model's registration, with notes ----------------
  var NEAR = { sine: { flute: 1 }, flute: { sine: 1, principal: 1 }, principal: { flute: 1, string: 1 }, string: { principal: 1, reed: 1 }, reed: { string: 1 } };
  var CNAME = { sine: "near-sine (tonewheel)", flute: "flute", principal: "principal", string: "string", reed: "reed" };
  var MANNAME = { upper: "upper manual", lower: "lower manual", pedal: "pedals" };
  function worst(a, b) { var o = { exact: 0, approx: 1, lost: 2 }; return o[a] >= o[b] ? a : b; }
  // slots: [{ key, man, ratios, color, kind: "bar"|"tab", name }]
  function place(canon, slots, m, st, notes) {
    var lvl = {}, cnt = {};
    canon.ranks.forEach(function (r) {
      var cand = slots.filter(function (x) { return x.man === r.man && x.ratios.indexOf(r.ratio) >= 0; });
      if (!cand.length) { var anyMan = slots.some(function (x) { return x.man === r.man; });
        notes.push({ what: r.from + " → " + (anyMan ? "nothing" : "no " + MANNAME[r.man]), cls: "lost",
          why: anyMan ? "The " + P[m].short + " has no " + ft(r.ratio) + " on its " + MANNAME[r.man] + "." : "The " + P[m].short + " has no " + MANNAME[r.man] + "." }); return; }
      var best = cand.filter(function (x) { return x.color === r.color; })[0] || cand.filter(function (x) { return NEAR[r.color] && NEAR[r.color][x.color]; })[0] || cand[0];
      var cls = best.color === r.color || best.color === "any" ? "exact" : "approx", why = [];
      if (cls === "approx") why.push("a " + CNAME[r.color] + " rank becomes " + CNAME[best.color] + " tone");
      if (best.ratios.length > 1) { cls = "approx"; why.push("one pitch of " + best.name + ": its other pitches come too"); }
      if (best.kind === "bar") { var b = barOf(r.db), back = dbOf(b); if (Math.abs(back - r.db) > 1.5) { cls = "approx"; why.push("level " + r.db + " dB rounds to drawbar " + b); }
        lvl[best.key] = Math.max(lvl[best.key] || 0, b); }
      else { if (r.db < -1.5 && best.ratios.length === 1) { cls = "approx"; why.push("a stop is on or off: " + r.db + " dB becomes full"); } lvl[best.key] = true; }
      cnt[best.key] = (cnt[best.key] || 0) + 1;
      notes.push({ what: r.from + " → " + best.name, cls: cls, why: why.length ? why.join("; ") : "Same pitch, same kind of tone." });
    });
    for (var key in lvl) st[key] = lvl[key];
    return cnt;
  }
  function slotsOf(m) {
    if (m === "b3") { var o = [];
      ["upper", "lower"].forEach(function (man) { B3R.forEach(function (r, i) { o.push({ key: (man === "upper" ? "uB." : "lB.") + i, man: man, ratios: [r], color: "sine", kind: "bar", name: (man === "upper" ? "upper " : "lower ") + ft(r) + " drawbar" }); }); });
      o.push({ key: "p.0", man: "pedal", ratios: [0.5], color: "sine", kind: "bar", name: "pedal 16′ drawbar" }, { key: "p.1", man: "pedal", ratios: [1], color: "sine", kind: "bar", name: "pedal 8′ drawbar" });
      return o; }
    if (m === "vox") return [{ key: "d16", man: "upper", ratios: [0.5], color: "any", kind: "bar", name: "16′ drawbar" }, { key: "d8", man: "upper", ratios: [1], color: "any", kind: "bar", name: "8′ drawbar" },
      { key: "d4", man: "upper", ratios: [2], color: "any", kind: "bar", name: "4′ drawbar" }, { key: "dIV", man: "upper", ratios: [3, 4, 5, 8], color: "any", kind: "bar", name: "the IV drawbar" }];
    if (m === "farfisa") return P.farfisa.groups[0][2].map(function (x) { var r = { bass16: 0.5, str16: 0.5, fl8: 1, ob8: 1, tr8: 1, str8: 1, fl4: 2, pic4: 2, str4: 2 }[x[0]];
      return { key: x[0], man: "upper", ratios: [r], color: /^str/.test(x[0]) ? "string" : /^(ob|tr)/.test(x[0]) ? "reed" : "flute", kind: "tab", name: x[1] + " tab" }; });
    var D = { sw: "upper", gt: "lower", pd: "pedal" };
    return PIPE.map(function (x) { return { key: x[0], man: D[x[1]], ratios: x[3], color: x[4], kind: "tab", name: x[2] }; });
  }
  OC.fromCanon = function (m, canon) {
    var st = OC.def(m), notes = [];
    // start from silence so only what the canonical names sounds
    slotsOf(m).forEach(function (x) { st[x.key] = x.kind === "bar" ? 0 : false; });
    if (m === "b3") { st.upre = "B"; st.lpre = "B"; st.perc = false; ["uA", "lA"].forEach(function (g) { for (var i = 0; i < 9; i++) st[g + "." + i] = 0; }); }
    if (m === "pipe") { st.sw_gt = st.gt_pd = st.sw_pd = false; st.trem = false; }
    var ranks = canon.ranks;
    if (m === "vox" || m === "farfisa") {   // one manual: the lower manual and the pedals have nowhere to go
      var lost = ranks.filter(function (r) { return r.man !== "upper"; });
      if (lost.length) notes.push({ what: lost.length + " rank" + (lost.length > 1 ? "s" : "") + " on the " + Array.from(new Set(lost.map(function (r) { return MANNAME[r.man]; }))).join(" and "), cls: "lost",
        why: "The " + P[m].short + " has one manual and no pedals; only the upper manual is taken." });
      canon = { ranks: ranks.filter(function (r) { return r.man === "upper"; }), fx: canon.fx };
    }
    var cnt = place(canon, slotsOf(m), m, st, notes), fx = canon.fx || {};
    if (m === "vox") {
      var cs = canon.ranks.map(function (r) { return r.color; }), fl = cs.filter(function (x) { return x === "flute" || x === "sine"; }).length, rd = cs.filter(function (x) { return x === "reed" || x === "string"; }).length, pr = cs.length - fl - rd;
      st.flute = cs.length ? clamp(Math.round(8 * (fl + pr / 2) / cs.length + (pr ? 2 : 0)), 0, 8) : 6; st.reed = cs.length ? clamp(Math.round(8 * (rd + pr / 2) / cs.length + (pr ? 2 : 0)), 0, 8) : 0;
      if (!st.flute && !st.reed) st.flute = 6;
      if (cs.length) notes.push({ what: "Tone colour → ~ " + st.flute + ", Λ " + st.reed, cls: new Set(cs).size === 1 && cs[0] !== "sine" ? "exact" : "approx",
        why: "The Continental's two voice drawbars colour every footage at once; mixed colours become one blend." });
      st.vib = !!fx.vib || !!fx.trem;
      if (fx.vib && fx.vib.kind === "chorus") notes.push({ what: "Chorus → vibrato", cls: "approx", why: "The Continental has one vibrato (single speed, single intensity: Wikipedia) and no chorus." });
      else if (fx.vib && fx.vib.depth !== 2) notes.push({ what: "Vibrato depth " + fx.vib.depth + " → its one setting", cls: "approx", why: "Single speed, single intensity (Wikipedia)." });
      else if (fx.trem) notes.push({ what: "Tremulant → vibrato", cls: "approx", why: "A tremulant shakes loudness; this vibrato shakes pitch." });
    }
    if (m === "farfisa") {
      st.vib = "off";
      if (fx.vib) { st.vib = (fx.vib.depth >= 2 ? "h" : "l") + (fx.vib.rate >= 6.5 ? "f" : "s");
        notes.push({ what: "Vibrato → " + P.farfisa.vibNames[st.vib], cls: fx.vib.kind === "chorus" ? "approx" : (FVIB[st.vib][0] === fx.vib.depth && FVIB[st.vib][1] === fx.vib.rate ? "exact" : "approx"),
          why: fx.vib.kind === "chorus" ? "No chorus on the Compact: the nearest vibrato." : "The nearest of the four vibrato settings." }); }
      else if (fx.trem) { st.vib = "ls"; notes.push({ what: "Tremulant → light slow vibrato", cls: "approx", why: "A tremulant shakes loudness; the vibrato shakes pitch." }); }
      st.rev = (fx.reverb || 0) > 0.2;
      if (fx.reverb > 0.2) notes.push({ what: "Room → the reverb tab", cls: "approx", why: "The Compact's valve-driven reverb tank (Wikipedia) is a spring, not a room." });
    }
    if (m === "b3") {
      if (fx.perc) { st.perc = true; st.percH = fx.perc.harm === 3 ? "3rd" : "2nd"; st.percDec = fx.perc.decay; st.percVol = fx.perc.vol; notes.push({ what: "Percussion", cls: "exact", why: "Same switches." }); }
      if (cnt["uB.8"] && st.perc) notes.push({ what: "Upper 1′ while percussion is on", cls: "lost", why: "On the B-3 the 1′ drawbar is silent while percussion is on." });
      st.vibU = !!fx.vib && fx.vib.upper !== false; st.vibL = !!fx.vib && !!fx.vib.lower;
      if (fx.vib) { st.vib = (fx.vib.kind === "chorus" ? "C" : "V") + clamp(Math.round(fx.vib.depth), 1, 3);
        notes.push({ what: "Vibrato → " + st.vib, cls: fx.vib.rate === 6.87 ? "exact" : "approx", why: fx.vib.rate === 6.87 ? "Same scanner setting." : "The scanner runs at one speed (6.87 a second, Hammond service text); the nearest depth is taken." }); }
      else if (fx.trem) { st.vibU = st.vibL = true; st.vib = "V1"; notes.push({ what: "Tremulant → V1", cls: "approx", why: "A tremulant shakes loudness; the scanner shakes pitch. The Leslie on slow is the other choice." }); }
      st.leslie = fx.rotary || "stop";
      if (!fx.rotary) notes.push({ what: "Leslie → stop", cls: "approx", why: "The source has no rotary speaker; a stopped Leslie still colours the sound (horn and drum)." });
    } else if (fx.rotary && fx.rotary !== "stop") notes.push({ what: "Leslie " + fx.rotary, cls: "lost", why: "The " + P[m].short + " has no rotary speaker of its own (players often ran combo organs through one: UNVERIFIED for any one record)." });
    if (fx.perc && m !== "b3") notes.push({ what: "Percussion (" + fx.perc.harm + (fx.perc.harm === 3 ? "rd" : "nd") + " harmonic)", cls: "lost", why: "No percussion on the " + P[m].short + "." });
    if (m === "pipe") {
      st.trem = !!fx.trem || !!(fx.vib); st.reverb = fx.reverb || 0.15;
      if (fx.vib) notes.push({ what: (fx.vib.kind === "chorus" ? "Chorus" : "Vibrato") + " → Tremulant", cls: "approx", why: "A tremulant shakes the wind (loudness and a little pitch); it is on the Swell only here." });
      if (fx.trem) notes.push({ what: "Tremulant", cls: "exact", why: "Same." });
      if (!fx.reverb) notes.push({ what: "Room", cls: "approx", why: "A pipe organ always sounds in its building; a small room is added." });
    } else if (fx.reverb > 0.2 && m !== "farfisa") notes.push({ what: "Room (reverb)", cls: "lost", why: "The " + P[m].short + " has no reverb (the room is outside the instrument)." });
    if (fx.trem && m === "b3") {}
    return { state: st, notes: notes };
  };
  OC.translate = function (st, from, to) { var r = OC.fromCanon(to, OC.toCanon(from, st)); r.from = from; r.to = to; return r; };

  // ---------------- partials of one key (pure; the engine plays these) ----------------
  var mtof = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  OC.partials = function (m, st0, midi, man) {
    var st = OC.full(m, st0), canon = OC.toCanon(m, st), out = [], f0 = mtof(midi);
    canon.ranks.filter(function (r) { return r.man === (man || "upper"); }).forEach(function (r) {
      var a = Math.pow(10, r.db / 20), f;
      if (m === "b3") {
        if (r.man === "pedal") f = f0 * r.ratio;
        else { var i = B3R.indexOf(r.ratio), key = midi - 35, w = key + 12 + TW_OFF[i], sh = 0;      // foldback (ORGAN.md): wheels 13..91
          while (w < 13) { w += 12; sh++; } while (w > 91) { w -= 12; sh--; }
          f = f0 * TWR[i] * Math.pow(2, sh); }
        if (r.man === "upper" && canon.fx.perc && st.percVol === "normal") a *= Math.pow(10, -3 / 20);   // UNVERIFIED: normal percussion lowers the drawbars
      } else {
        var rr = r.ratio, ff = f0 * ET(rr);
        if (m === "pipe" && r.from.indexOf("Mixture") === 0) { while (ff > 2200) ff /= 2; }      // the mixture breaks back (the page's own scheme)
        if (m === "vox" || m === "farfisa") { while (ff > 8400) ff /= 2; }                      // top-octave generators: no pitch above the top divider (approx)
        f = ff; if (m === "pipe") a *= r.color === "reed" ? 0.8 : 0.7;
      }
      out.push({ f: f, a: a, color: r.color, ratio: r.ratio, from: r.from });
    });
    return out;
  };

  // ---------------- tone colours as harmonic tables (the page's own voicing) ----------------
  function harm(m, color, st) {
    var n, a = [0];
    var fn = { sine: function (h) { return h === 1 ? 1 : 0; },
      flute: m === "pipe" ? function (h) { return [0, 1, 0.06, 0.18, 0.02, 0.05][h] || 0; } : function (h) { return h % 2 ? 1 / (h * h) : 0.04 / h; },
      principal: function (h) { return 1 / Math.pow(h, 1.25); },
      string: function (h) { return (h === 1 ? 0.45 : 1) / Math.pow(h, 0.75); },
      reed: m === "farfisa" ? function (h) { return 1 / Math.pow(h, 0.85); } : function (h) { return (1 / Math.pow(h, 0.6)) * (h >= 3 && h <= 7 ? 1.4 : 1); } };
    if (m === "vox") { var fl = (+st.flute || 0) / 8, rd = (+st.reed || 0) / 8;
      fn = { any: function (h) { return fl * (h === 1 ? 1 : h === 3 ? 0.12 : 0) + rd * (h % 2 ? 1 / h : 0.6 / h); } }; color = "any"; }
    for (n = 1; n <= 32; n++) a.push((fn[color] || fn.principal || fn.any)(n));
    return a;
  }
  OC.harm = harm;

  // ---------------- the engine ----------------
  OC.voice = function (ctx, m, st0) {
    var st = OC.full(m, st0), out = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 2048;
    var master = ctx.createGain(); master.gain.value = 0.5; master.connect(out); out.connect(an);
    var buses = {}, waves = {}, held = {}, nodes = [], tick = null;
    function wave(color) { var key = color + (m === "vox" ? st.flute + "/" + st.reed : ""); if (waves[key]) return waves[key];
      var re = harm(m, color, st), im = new Float32Array(re.length), r2 = new Float32Array(re.length); for (var i = 0; i < re.length; i++) r2[i] = 0;
      for (i = 0; i < re.length; i++) im[i] = re[i];
      return (waves[key] = ctx.createPeriodicWave(r2, im)); }
    // ---- per-manual vibrato / chorus (a swept delay; mixed with the dry signal for chorus) ----
    function scanner(input, outp) {
      var dry = ctx.createGain(), wet = ctx.createGain(), dl = ctx.createDelay(0.02), lfo = ctx.createOscillator(), dep = ctx.createGain();
      dl.delayTime.value = 0.002; lfo.frequency.value = 6.87; lfo.connect(dep); dep.connect(dl.delayTime); lfo.start();
      input.connect(dry); input.connect(dl); dl.connect(wet); dry.connect(outp); wet.connect(outp);
      return { set: function (on, kind, depth, rate) { var d = on ? [0, 0.00015, 0.0003, 0.00045][depth] || 0.0003 : 0;   // C3 / V3 ≈ 0.9 ms end to end (ORGAN.md); V1, V2 UNVERIFIED
        dep.gain.setTargetAtTime(d, ctx.currentTime, 0.02); lfo.frequency.setTargetAtTime(rate || 6.87, ctx.currentTime, 0.05);
        dry.gain.setTargetAtTime(!on ? 1 : kind === "chorus" ? 0.5 : 0, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(!on ? 0 : kind === "chorus" ? 0.5 : 1, ctx.currentTime, 0.02); }, stop: function () { lfo.stop(); } };
    }
    var mix = ctx.createGain(), swell = ctx.createGain(); mix.connect(swell);
    var tail = swell, fxs = [];
    // B-3: drive then Leslie (horn and drum split at 800 Hz; ORGAN.md speeds 48/400 and 40/342 a minute)
    var les = null, shaper = null;
    if (m === "b3") {
      shaper = ctx.createWaveShaper(); swell.connect(shaper); tail = shaper;
      var lo = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(); lo.type = "lowpass"; hi.type = "highpass"; lo.frequency.value = hi.frequency.value = 800;
      var merger = ctx.createGain(); les = { rot: [] };
      [[hi, 48 / 60, 400 / 60, 0.5, 0.0009, 0.35], [lo, 40 / 60, 342 / 60, 1.7, 0.0004, 0.2]].forEach(function (d) {
        var f = d[0], dl = ctx.createDelay(0.01), am = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), lfo = ctx.createOscillator(), dg = ctx.createGain(), ag = ctx.createGain(), pg = ctx.createGain();
        dl.delayTime.value = 0.003; am.gain.value = 1 - d[5]; lfo.frequency.value = d[1]; lfo.connect(dg); dg.gain.value = d[4]; dg.connect(dl.delayTime);
        lfo.connect(ag); ag.gain.value = d[5]; ag.connect(am.gain); if (pan.pan) { lfo.connect(pg); pg.gain.value = 0.6; pg.connect(pan.pan); }
        tail.connect(f); f.connect(dl); dl.connect(am); am.connect(pan); pan.connect(merger); lfo.start(); les.rot.push({ lfo: lfo, slow: d[1], fast: d[2], tau: d[3], dg: dg, ag: ag, dep: [d[4], d[5]] }); });
      tail = merger;
    }
    var revWet = null;
    if (m === "pipe" || m === "farfisa") {
      var conv = ctx.createConvolver(), len = Math.round(ctx.sampleRate * (m === "pipe" ? 3.2 : 1.6)), ir = ctx.createBuffer(2, len, ctx.sampleRate), seed = 12345;
      var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
      for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var i = 0; i < len; i++) dd[i] = rnd() * Math.pow(1 - i / len, m === "pipe" ? 2.2 : 4) * (m === "farfisa" && i % 900 < 30 ? 2 : 1); }
      conv.buffer = ir; revWet = ctx.createGain(); var dryG = ctx.createGain(); tail.connect(conv); conv.connect(revWet); tail.connect(dryG);
      var sum = ctx.createGain(); revWet.connect(sum); dryG.connect(sum); tail = sum;
    }
    tail.connect(master);
    function bus(man) { if (buses[man]) return buses[man];
      var g = ctx.createGain(), sc = ctx.createGain(); g.connect(sc);
      var b = { in: g, sc: null, trem: null };
      if (man !== "pedal" || m !== "b3") { b.sc = scanner(sc, mix); } else sc.connect(mix);
      if (m === "pipe" && man === "upper") { // Swell division: its own box (expression) and tremulant (about 6 a second, UNVERIFIED; the page's own)
        var box = ctx.createGain(), tl = ctx.createOscillator(), td = ctx.createGain(); g.disconnect(); g.connect(box); box.connect(sc); tl.frequency.value = 6; tl.connect(td); td.connect(box.gain); tl.start();
        b.box = box; b.td = td; b.tl = tl; }
      return (buses[man] = b); }
    function curve(k) { var n = 1024, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
    function apply() {
      var t = ctx.currentTime, cn = OC.toCanon(m, st);
      swell.gain.setTargetAtTime(st.swell == null ? 1 : 0.06 + 0.94 * (+st.swell || 0), t, 0.03);
      if (shaper) shaper.curve = curve(0.6 + 5 * (+st.drive || 0));
      ["upper", "lower", "pedal"].forEach(function (man) { var b = bus(man); if (!b.sc) return;
        var v = cn.fx.vib, on = !!v && (m !== "b3" || (man === "upper" ? v.upper : man === "lower" ? v.lower : false));
        b.sc.set(on, v && v.kind, v && v.depth, v && v.rate);
        if (b.box) { b.box.gain.setTargetAtTime(0.15 + 0.85 * (+st.swbox || 0), t, 0.03); b.td.gain.setTargetAtTime(st.trem ? 0.18 * (0.15 + 0.85 * st.swbox) : 0, t, 0.03); } });
      if (les) les.rot.forEach(function (r) { var sp = st.leslie === "fast" ? r.fast : st.leslie === "slow" ? r.slow : 0.0001;
        r.lfo.frequency.setTargetAtTime(sp, t, r.tau); r.dg.gain.setTargetAtTime(st.leslie === "stop" ? 0 : r.dep[0], t, r.tau); r.ag.gain.setTargetAtTime(st.leslie === "stop" ? 0 : r.dep[1], t, r.tau); });
      if (revWet) revWet.gain.setTargetAtTime(m === "pipe" ? +st.reverb || 0 : st.rev ? 0.45 : 0, t, 0.05);
    }
    apply();
    var seedN = 7; function jitter() { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647 - 0.5; }
    function start(midi, man, when) {
      var id = man + ":" + midi; if (held[id]) stopNote(id, when);
      var t = Math.max(when || 0, ctx.currentTime), ps = OC.partials(m, st, midi, man), env = ctx.createGain(), oscs = [];
      env.gain.value = 0; env.connect(bus(man).in);
      var atk = m === "pipe" ? (man === "pedal" ? 0.09 : 0.045) : m === "b3" ? 0.004 : 0.003;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(m === "pipe" ? 0.16 : 0.14, t + atk);
      ps.forEach(function (p) { if (p.f > ctx.sampleRate / 2.2) return;
        var o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = p.a;
        if (m === "b3") o.type = "sine"; else o.setPeriodicWave(wave(m === "vox" ? "any" : p.color));
        o.frequency.value = p.f * (m === "pipe" ? Math.pow(2, jitter() * 3 / 1200) : 1);     // pipes a cent or two apart (the page's own)
        o.connect(g); g.connect(env); o.start(t); oscs.push(o);
        if (m === "pipe" && (p.color === "flute" || p.color === "principal") && p.f < 5000) {   // chiff: a breath of noise as the pipe speaks (the page's own)
          var nb = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.06), ctx.sampleRate), nd = nb.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
          var ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); ns.buffer = nb; bp.type = "bandpass"; bp.frequency.value = p.f * 2; bp.Q.value = 6; ng.gain.value = 0.25 * p.a;
          ns.connect(bp); bp.connect(ng); ng.connect(env); ns.start(t); }
      });
      if (m === "b3" && man !== "pedal") { // key click (ORGAN.md: the cause is sourced, the sound is a guess)
        var cl = +st.click || 0; if (cl > 0) { var cb = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.022), ctx.sampleRate), cd = cb.getChannelData(0); for (var j = 0; j < cd.length; j++) cd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / cd.length, 2);
          var cs = ctx.createBufferSource(), cf = ctx.createBiquadFilter(), cg = ctx.createGain(); cs.buffer = cb; cf.type = "bandpass"; cf.frequency.value = 2500; cg.gain.value = 0.25 * cl; cs.connect(cf); cf.connect(cg); cg.connect(bus(man).in); cs.start(t); }
        var cn = OC.toCanon(m, st);
        if (man === "upper" && cn.fx.perc && !Object.keys(held).some(function (x) { return x.indexOf("upper:") === 0; })) {   // single trigger: only from all keys up (Wikipedia)
          var po = ctx.createOscillator(), pg = ctx.createGain(), dec = cn.fx.perc.decay === "fast" ? 0.2 : 1.0, lv = cn.fx.perc.vol === "soft" ? 0.3 : 0.95;   // UNVERIFIED times / levels
          po.frequency.value = mtof(midi) * (cn.fx.perc.harm === 3 ? TWR[4] : 2); pg.gain.setValueAtTime(lv, t); pg.gain.setTargetAtTime(0, t, dec / 3);
          po.connect(pg); pg.connect(env); po.start(t); po.stop(t + dec * 3); }
      }
      held[id] = { env: env, oscs: oscs };
    }
    function stopNote(id, when) { var h = held[id]; if (!h) return; delete held[id];
      var t = Math.max(when || 0, ctx.currentTime), rel = m === "pipe" ? 0.12 : m === "b3" ? 0.012 : 0.03;
      h.env.gain.cancelScheduledValues(t); h.env.gain.setValueAtTime(h.env.gain.value, t); h.env.gain.setTargetAtTime(0, t, rel / 3);
      h.oscs.forEach(function (o) { try { o.stop(t + rel * 4); } catch (e) {} }); setTimeout(function () { try { h.env.disconnect(); } catch (e) {} }, (t - ctx.currentTime + rel * 5) * 1000 + 50); }
    var V = { output: out, analyser: an, model: m,
      noteOn: function (midi, man, when) { start(midi, man || "upper", when); },
      noteOff: function (midi, man, when) { stopNote((man || "upper") + ":" + midi, when); },
      allOff: function () { Object.keys(held).forEach(function (id) { stopNote(id); }); },
      set: function (s2) { st = OC.full(m, s2); waves = {}; apply(); },
      state: function () { return st; } };
    if (root.AudioTap) try { AudioTap.register(ctx, out, "Organ: " + P[m].short); } catch (e) {}
    return V;
  };

  // ---------------- examples (starting registrations; tracks' "build it" ones are guesses, said so) ----------------
  OC.EXAMPLES = [
    { id: "b3-jazz", from: "b3", name: "Jazz: 888 with soft, fast 3rd percussion", s: { upre: "B", "uB.0": 8, "uB.1": 8, "uB.2": 8, "uB.3": 0, "uB.4": 0, "uB.5": 0, "uB.6": 0, "uB.7": 0, "uB.8": 0, perc: true, percVol: "soft", percDec: "fast", percH: "3rd", vib: "C3", vibU: true, leslie: "slow" },
      note: "Soft, third harmonic, fast: the 'classic jazz setting' in one secondary source found by search (UNVERIFIED)." },
    { id: "b3-full", from: "b3", name: "All drawbars out, Leslie fast", s: { upre: "B", "uB.0": 8, "uB.1": 8, "uB.2": 8, "uB.3": 8, "uB.4": 8, "uB.5": 8, "uB.6": 8, "uB.7": 8, "uB.8": 8, perc: false, leslie: "fast", drive: 0.5 } },
    { id: "b3-flute", from: "b3", name: "Preset C♯: Stopped Flute (00 5320 000)", s: { upre: "C#", perc: false, vibU: false, leslie: "slow" } },
    { id: "b3-greenonions", from: "b3", name: "Build it: Green Onions (a starting point)", s: { upre: "B", "uB.0": 8, "uB.1": 8, "uB.2": 8, "uB.3": 6, "uB.4": 0, "uB.5": 0, "uB.6": 0, "uB.7": 0, "uB.8": 0, perc: true, percVol: "normal", percDec: "fast", percH: "3rd", vibU: false, leslie: "stop", drive: 0.35 },
      note: "Not Booker T. Jones's documented setting: a starting point to change by ear (UNVERIFIED)." },
    { id: "b3-whiter", from: "b3", name: "Build it: A Whiter Shade of Pale (a starting point)", s: { upre: "B", "uB.0": 6, "uB.1": 8, "uB.2": 8, "uB.3": 6, "uB.4": 0, "uB.5": 0, "uB.6": 0, "uB.7": 0, "uB.8": 0, perc: false, vib: "C3", vibU: true, leslie: "slow", "p.0": 6, "p.1": 4 },
      note: "Matthew Fisher's registration is not documented here: a starting point (UNVERIFIED)." },
    { id: "vox-bright", from: "vox", name: "Bright: 8′ and 4′, reed", s: { d16: 0, d8: 8, d4: 8, dIV: 4, flute: 3, reed: 8, vib: false } },
    { id: "vox-lmf", from: "vox", name: "Build it: Light My Fire (a starting point)", s: { d16: 0, d8: 8, d4: 6, dIV: 3, flute: 7, reed: 5, vib: true }, note: "A starting point to change by ear (UNVERIFIED)." },
    { id: "vox-96", from: "vox", name: "Build it: 96 Tears (a starting point)", s: { d16: 0, d8: 8, d4: 7, dIV: 0, flute: 4, reed: 8, vib: false }, note: "A starting point (UNVERIFIED)." },
    { id: "vox-enola", from: "vox", name: "Build it: Enola Gay (a starting point; OMD played a Jaguar)", s: { d16: 0, d8: 8, d4: 8, dIV: 2, flute: 8, reed: 3, vib: true }, note: "Wikipedia: OMD used the Vox Jaguar, a cheaper model; a starting point (UNVERIFIED)." },
    { id: "far-flutes", from: "farfisa", name: "Flutes 8′ + 4′, light fast vibrato", s: { fl8: true, fl4: true, vib: "lf" } },
    { id: "far-incense", from: "farfisa", name: "Build it: Incense and Peppermints (a starting point)", s: { fl8: true, fl4: true, str8: true, vib: "lf" }, note: "A starting point (UNVERIFIED)." },
    { id: "far-lobster", from: "farfisa", name: "Build it: Rock Lobster (a starting point)", s: { fl8: false, fl4: false, ob8: true, tr8: true, str4: true, vib: "off" }, note: "Kate Pierson played a Compact Deluxe (Wikipedia); the tabs are a starting point (UNVERIFIED)." },
    { id: "far-domine", from: "farfisa", name: "Build it: Astronomy Domine (a starting point)", s: { fl8: true, str8: true, fl4: true, vib: "hs", rev: true }, note: "Richard Wright started on a Combo Compact (Wikipedia); the tabs are a starting point (UNVERIFIED)." },
    { id: "pipe-plenum", from: "pipe", name: "Principal chorus (organo pleno) with pedal", s: { g_prin8: true, g_oct4: true, g_fift2: true, g_mix: true, p_sub16: true, p_oct8: true, gt_pd: true, s_ged8: false, s_fl4: false, reverb: 0.6 } },
    { id: "pipe-flutes", from: "pipe", name: "Quiet flutes 8′ + 4′ on the Swell", s: { s_ged8: true, s_fl4: true, g_prin8: false, g_oct4: false, p_sub16: true, swbox: 0.6 } },
    { id: "pipe-cornet", from: "pipe", name: "Cornet: 8′ 4′ 2⅔′ 2′ 1⅗′ (a solo)", s: { s_ged8: true, s_fl4: true, s_naz: true, s_fl2: true, s_tie: true, g_prin8: false, g_oct4: false, p_sub16: true } },
    { id: "pipe-565", from: "pipe", name: "Build it: Toccata and Fugue in D minor (a starting point)", s: { g_prin8: true, g_oct4: true, g_fift2: true, g_mix: true, g_trp8: false, p_sub16: true, p_oct8: true, p_trb16: true, gt_pd: true, reverb: 0.7 }, note: "Organists register it many ways; a starting point (UNVERIFIED)." },
    { id: "pipe-widor", from: "pipe", name: "Build it: Widor's Toccata (full organ, a starting point)", s: { g_prin8: true, g_oct4: true, g_fift2: true, g_mix: true, g_trp8: true, s_ged8: true, s_fl4: true, s_ob8: true, sw_gt: true, gt_pd: true, sw_pd: true, p_sub16: true, p_oct8: true, p_trb16: true, swbox: 1, reverb: 0.75 }, note: "Full organ with reeds; a starting point (UNVERIFIED)." }
  ];
  // demo phrases: [beat, length, midi, manual]
  OC.PHRASE = function (m) {
    var o = [], ch = [[57, 60, 64], [55, 60, 64], [53, 57, 60], [55, 59, 62]], bs = [33, 36, 29, 31];
    ch.forEach(function (c, i) { c.forEach(function (n) { o.push([i * 2, 1.9, n + (m === "farfisa" ? 12 : 0), P[m].manuals.length > 1 ? "lower" : "upper"]); });
      if (P[m].manuals.indexOf("pedal") >= 0) o.push([i * 2, 1.9, bs[i] + 12, "pedal"]); });
    [76, 74, 72, 74, 76, 79, 77, 76].forEach(function (n, i) { o.push([i, 0.9, n, "upper"]); });
    return o;
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = OC; return; }
  root.OrganCompare = OC;
  // ---------------- the widget ----------------
  OC.widgets = [];
  var CK = "awsedftgyhujk";
  function el(t, cl, tx) { var e = document.createElement(t); if (cl) e.className = cl; if (tx != null) e.textContent = tx; return e; }
  OC.mount = function (box) {
    var pk = box.parentNode && box.parentNode.classList && box.parentNode.classList.contains("ik-box") ? box.parentNode.dataset.id : null, only = box.dataset.only || pk || null, W = { a: only || box.dataset.from || "b3", b: box.dataset.to || "pipe", st: {}, ctx: null, v: {}, timers: [] };
    OC.MODELS.forEach(function (m) { W.st[m] = OC.def(m); });
    var head = el("div", "ocmp-head"), selA = el("select"), selB = el("select"), exSel = el("select"), play = el("button", "btn btn-sm btn-primary", "▶ Play"), stop = el("button", "btn btn-sm btn-outline-secondary", "■ Stop"),
      playB = el("button", "btn btn-sm btn-outline-primary", "▶ Play the translation"), manSel = el("select");
    OC.MODELS.forEach(function (m) { [selA, selB].forEach(function (s0) { var o = el("option", null, P[m].name); o.value = m; s0.appendChild(o); }); });
    selA.value = W.a; selB.value = W.b;
    function lab(t, e) { var l = el("label", "ocmp-lab"); l.appendChild(document.createTextNode(t + " ")); l.appendChild(e); return l; }
    if (!only) { head.appendChild(lab("From", selA)); head.appendChild(lab("To", selB)); }
    head.appendChild(lab("Example", exSel)); head.appendChild(play); if (!only) head.appendChild(playB); head.appendChild(stop); head.appendChild(lab("Keys play", manSel));
    box.appendChild(head);
    var pA = el("div", "ocmp-panel"), rep = el("div", "ocmp-report"), pB = el("div", "ocmp-panel ocmp-b"), kb = el("div", "ocmp-kb");
    box.appendChild(pA); box.appendChild(kb); if (!only) { box.appendChild(rep); box.appendChild(pB); }
    function ctx() { if (!W.ctx) { var AC = window.AudioContext || window.webkitAudioContext; W.ctx = new AC(); } if (W.ctx.state === "suspended") W.ctx.resume(); return W.ctx; }
    function voice(m) { var c = ctx(); if (!W.v[m]) { W.v[m] = OC.voice(c, m, W.st[m]); W.v[m].output.connect(c.destination); } return W.v[m]; }
    W.analyser = function () { voice(W.a); return W.v[W.a].analyser; };
    function fillEx() { exSel.innerHTML = ""; var o0 = el("option", null, "(choose)"); o0.value = ""; exSel.appendChild(o0);
      OC.EXAMPLES.filter(function (x) { return x.from === W.a; }).forEach(function (x) { var o = el("option", null, x.name); o.value = x.id; exSel.appendChild(o); }); }
    function fillMan() { manSel.innerHTML = ""; P[W.a].manuals.forEach(function (mn) { var o = el("option", null, (P[W.a].manNames || {})[mn] || mn); o.value = mn; manSel.appendChild(o); }); }
    function adapter(m, ro) {
      var get = function (kk) { return W.st[m][kk]; };
      return { get: function (kk) { if (/^inv:/.test(kk)) return -W.st[m][kk.slice(4)]; if (/^pre:/.test(kk)) return W.st[m][kk.slice(4)]; return get(kk); },
        set: function (kk, v) { if (ro) return; if (/^inv:/.test(kk)) { kk = kk.slice(4); v = -v; } else if (/^pre:/.test(kk)) kk = kk.slice(4); W.set(m, kk, v); },
        range: function (kk) { var base = kk.replace(/^(inv|pre):/, ""), r = OC.range(m, base); if (!r) return null;
          if (/^inv:/.test(kk)) return [kk, r[1], "k", -r[4], -r[3], 1, -r[6]]; return r; } };
    }
    function simple(host, m, ro) {
      host.innerHTML = ""; var g0 = el("div", "ocmp-groups");
      P[m].groups.forEach(function (g) { var f = el("fieldset", "ocmp-g ocmp-" + g[1]), lg = el("legend", null, g[0]); f.appendChild(lg);
        g[2].forEach(function (x) { var kk = x[0], w = el("label", "ocmp-c"), inp;
          if (x[2] === "k") { inp = el("input"); inp.type = "range"; inp.min = x[3]; inp.max = x[4]; inp.step = x[5]; inp.value = W.st[m][kk]; inp.oninput = function () { W.set(m, kk, +inp.value); }; }
          else if (x[2] === "s") { inp = el("input"); inp.type = "checkbox"; inp.checked = !!W.st[m][kk]; inp.onchange = function () { W.set(m, kk, inp.checked); }; }
          else { inp = el("select"); x[3].forEach(function (o) { var op = el("option", null, (P[m].vibNames && kk === "vib" && P[m].vibNames[o]) || o); op.value = o; inp.appendChild(op); }); inp.value = W.st[m][kk]; inp.onchange = function () { W.set(m, kk, inp.value); }; }
          inp.disabled = !!ro; inp.dataset.k = kk; w.appendChild(el("span", null, x[1])); w.appendChild(inp);
          if (x[2] === "k") { var vv = el("b", "ocmp-v", String(W.st[m][kk])); w.appendChild(vv); } f.appendChild(w); });
        g0.appendChild(f); });
      host.appendChild(g0);
    }
    function panel(host, m, ro) {
      host.innerHTML = ""; host.dataset.model = m;
      var t = el("h4", "ocmp-title", P[m].name + (ro ? " (the translation)" : "")), bl = el("p", "ocmp-blurb", P[m].blurb); host.appendChild(t); host.appendChild(bl);
      var sb = el("div", "ocmp-simple"); host.appendChild(sb); simple(sb, m, ro); host._simple = sb;
      if (window.FaithfulPanel && FaithfulPanel.attachFace) host._face = FaithfulPanel.attachFace(host, "organ-" + m, adapter(m, ro), { readonly: ro, at: sb, label: "View" });
      var un = el("details", "ocmp-unv"), us = el("summary", null, "Not checked against the real instrument (" + P[m].unverified.length + ")"), ul = el("ul"); un.appendChild(us);
      P[m].unverified.forEach(function (u) { ul.appendChild(el("li", null, u)); }); un.appendChild(ul); host.appendChild(un);
    }
    function refreshPanel(host, m) {
      [].forEach.call(host.querySelectorAll(".ocmp-simple [data-k]"), function (inp) { var v = W.st[m][inp.dataset.k]; if (inp.type === "checkbox") inp.checked = !!v; else inp.value = v;
        var b = inp.parentNode.querySelector(".ocmp-v"); if (b) b.textContent = v; });
      if (host._face && host._face.m) host._face.m.refresh();
    }
    function report() {
      if (only) return; var r = OC.translate(W.st[W.a], W.a, W.b); W.st[W.b] = r.state; W.last = r;
      if (W.v[W.b]) W.v[W.b].set(W.st[W.b]);
      rep.innerHTML = ""; rep.appendChild(el("h4", null, P[W.a].short + " → " + P[W.b].short + ": what carries over"));
      var counts = { exact: 0, approx: 0, lost: 0 }; r.notes.forEach(function (n) { counts[n.cls]++; });
      rep.appendChild(el("p", "ocmp-sum", counts.exact + " the same · " + counts.approx + " close · " + counts.lost + " cannot be done"));
      var tb = el("table", "table table-sm ocmp-t"), hr = el("tr"); ["", "What", "Why"].forEach(function (x) { hr.appendChild(el("th", null, x)); }); tb.appendChild(hr);
      r.notes.forEach(function (n) { var tr = el("tr", "ocmp-" + n.cls); tr.appendChild(el("td", null, { exact: "the same", approx: "close", lost: "cannot" }[n.cls])); tr.appendChild(el("td", null, n.what)); tr.appendChild(el("td", null, n.why)); tb.appendChild(tr); });
      rep.appendChild(tb); refreshPanel(pB, W.b);
    }
    W.set = function (m, kk, v) { W.st[m][kk] = v; if (W.v[m]) W.v[m].set(W.st[m]); refreshPanel(m === W.a ? pA : pB, m); if (m === W.a) report(); };
    W.pick = function (a, b) { W.stop(); W.a = a; if (b) W.b = b; selA.value = W.a; selB.value = W.b; panel(pA, W.a, false); if (!only) panel(pB, W.b, true); fillEx(); fillMan(); report(); };
    W.load = function (id) { var ex = OC.EXAMPLES.filter(function (x) { return x.id === id; })[0]; if (!ex) return false;
      if (ex.from !== W.a) W.pick(ex.from, W.b === ex.from ? W.a : W.b);
      W.st[W.a] = OC.full(W.a, ex.s); W.ex = ex; if (W.v[W.a]) W.v[W.a].set(W.st[W.a]); refreshPanel(pA, W.a); report(); exSel.value = id;
      var nb = box.querySelector(".ocmp-exnote"); if (!nb) { nb = el("p", "ocmp-exnote"); head.after(nb); } nb.textContent = ex.note || ""; return true; };
    W.stop = function () { W.timers.forEach(clearTimeout); W.timers = []; for (var m in W.v) W.v[m].allOff(); };
    W.phrase = function (m) { m = m || W.a; var v = voice(m), c = ctx(), t0 = c.currentTime + 0.08, bt = 0.5, ph = OC.PHRASE(m), end = 0; W.stop();
      ph.forEach(function (n) { v.noteOn(n[2], n[3], t0 + n[0] * bt); v.noteOff(n[2], n[3], t0 + (n[0] + n[1]) * bt); end = Math.max(end, n[0] + n[1]); });
      W.ends = Date.now() + end * bt * 1000; return new Promise(function (res) { W.timers.push(setTimeout(res, 150)); }); };   // resolves once sounding (page tests await it)
    W.tour = function (d) { W.stop(); if (d.ex) W.load(d.ex); var set = d.set ? JSON.parse(d.set) : {}; for (var kk in set) W.set(W.a, kk, set[kk]); return W.phrase(W.a); };
    selA.onchange = function () { W.pick(selA.value, selA.value === W.b ? W.a : W.b); };
    selB.onchange = function () { if (selB.value === W.a) selB.value = W.b; W.b = selB.value; panel(pB, W.b, true); report(); };
    exSel.onchange = function () { if (exSel.value) W.load(exSel.value); };
    play.onclick = function () { W.phrase(W.a); }; playB.onclick = function () { W.phrase(W.b); }; stop.onclick = W.stop;
    // keyboard: two octaves on screen + computer keys
    var base = function () { return P[W.a].range[manSel.value || "upper"][0] + (manSel.value === "pedal" ? 0 : 24); };
    for (var i = 0; i < 25; i++) (function (i) { var black = [1, 3, 6, 8, 10].indexOf(i % 12) >= 0, kd = el("button", "ocmp-key" + (black ? " ocmp-bk" : "")); kd.type = "button"; kd.setAttribute("aria-label", "key " + (i + 1));
      var on = function (e) { e.preventDefault(); voice(W.a).noteOn(base() + i, manSel.value); kd.classList.add("on"); }, off = function () { if (W.v[W.a]) W.v[W.a].noteOff(base() + i, manSel.value); kd.classList.remove("on"); };
      kd.addEventListener("pointerdown", on); kd.addEventListener("pointerup", off); kd.addEventListener("pointerleave", off); kb.appendChild(kd); })(i);
    var down = {};
    box.tabIndex = -1;
    document.addEventListener("keydown", function (e) { if (e.repeat || e.metaKey || e.ctrlKey || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "") || !box.contains(document.activeElement) && document.activeElement !== document.body) return;
      var j = CK.indexOf(e.key); if (j < 0 || OC.widgets[0] !== W) return; down[e.key] = base() + j; voice(W.a).noteOn(down[e.key], manSel.value); });
    document.addEventListener("keyup", function (e) { if (down[e.key] != null && W.v[W.a]) { W.v[W.a].noteOff(down[e.key], manSel.value); delete down[e.key]; } });
    W.pick(W.a, W.b);
    var q = new URLSearchParams(location.search).get("organ"); if (!only && q && P[q]) { var ex = OC.EXAMPLES.filter(function (x) { return x.from === q; })[0]; if (ex) W.load(ex.id); else W.pick(q, q === W.b ? W.a : W.b); }
    if (only) box.classList.add("ocmp-only");
    OC.widgets.push(W); return W;
  };
  // "Famous tracks": apps/shared/data/organs/assignments.json, each with a Build button
  OC.tracks = function (host) {
    return fetch("/apps/shared/data/organs/assignments.json").then(function (r) { return r.json(); }).then(function (d) {
      var only = host.dataset.organ; host.innerHTML = "";
      OC.MODELS.filter(function (m) { return !only || m === only; }).forEach(function (m) {
        var vs = d.videos.filter(function (v) { return v.organ === m; }); if (!vs.length) return;
        if (!only) host.appendChild(el("h4", null, P[m].name));
        var ul = el("ul", "ocmp-tracks-l");
        vs.forEach(function (v) { var li = el("li"), a = el("a", null, v.song + " — " + v.artist + (v.year ? " (" + v.year + ")" : "")); a.href = v.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a);
          li.appendChild(document.createTextNode(" ↗ · on YouTube: “" + v.title + "” (" + v.channel + ")")); li.appendChild(el("div", "ocmp-what", v.what));
          if (v.build && OC.widgets[0]) { var b = el("button", "btn btn-sm btn-outline-primary ocmp-build", "Build it on the panel"); b.type = "button";
            b.onclick = function () { var w = OC.widgets[0]; w.load(v.build); var p = document.querySelector(".ocmp"); if (p && p.scrollIntoView) p.scrollIntoView({ block: "start" }); }; li.appendChild(b); }
          ul.appendChild(li); });
        host.appendChild(ul); });
      host.appendChild(el("p", "ocmp-note", d.note));
    });
  };
  function init() { document.querySelectorAll(".ocmp").forEach(function (b) { if (!b._oc) b._oc = OC.mount(b); }); document.querySelectorAll(".ocmp-tracks").forEach(OC.tracks); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
