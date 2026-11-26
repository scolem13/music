// BassPickups: electric basses on the guitar pickup model (apps/shared/lessons/guitar-pickups.js, global GuitarPickups: the string,
// Tillman's pickup comb + aperture, the nodal circuit, rendering, translation, the widget, FaithfulPanel adapter). This file only
// registers the basses with GuitarPickups.add and, in a browser, mounts the bass markup (prefix "bs"). Load it AFTER guitar-pickups.js.
// Pages: lessons/bass-compare.qmd, lessons/intro-{p-bass,jazz-bass,stingray,rickenbacker-bass}.qmd. Panels panels/bs-<id>.js.
//
// WHAT IS SOURCED (scripts/sources/basses.py; Wikipedia articles read 2026-11-26)
//   Precision 1951, 34 in scale, four strings; the split-coil pickup from 1957: two coils "wired out of phase with the magnets
//   oriented with reverse polarities" (hum-cancelling). Jazz Bass 1960, 34 in, two single coils "opposite ... in both magnetic
//   polarity and electrical phase" (hum cancels with both at full volume); from late 1961 a volume per pickup and a master tone;
//   pickups 3.6 in apart until late 1970, then the bridge pickup 0.4 in nearer the bridge (4 in apart; Fender says 1972).
//   StingRay 1976 (Leo Fender, Tom Walker's active preamp, 9 V), one large humbucker nearer the bridge than a Precision's, its coils
//   in parallel; 2-band EQ (bass, treble) at first, a mid band added later. Rickenbacker 4001 1961, 4003 1980; 33.5 in scale; two
//   single coils (neck "toaster", bridge "horseshoe" then Hi-Gain), a volume and tone each, a three-way switch; Rick-O-Sound stereo
//   output from 1968 (not modelled).
// NOT SOURCED (this site's values, unverified): every L / R / C, pot and capacitor value; the absolute distance of every pickup from
//   the bridge (only the Jazz's 3.6 / 4 in spacing is sourced); which half of the P pickup is nearer the bridge (here E-A, as on
//   photos); the Jazz volume wiring (pickup on the wiper, so one at 0 solos the other: kind "jazz"); the StingRay preamp's input
//   resistance, gain, EQ frequencies (bass shelf 80 Hz, treble shelf 2.5 kHz, mid peak 500 Hz), range (+-15 dB, 5 = flat) and the
//   knob order; the string's stiffness and decay; the Ric's tone pots.
(function (global) {
  var GP = global.GuitarPickups || (typeof require !== "undefined" ? require("./guitar-pickups.js") : null);
  var K = function (k, l, d) { return [k, l, "k", 0, 10, 0.1, d == null ? 10 : d]; };
  var STR = { tuning: [28, 33, 38, 43], B: 1.5e-4, decay: [7, 200], pluck: 5, family: "bass" };
  function sc(id, label, x, o) { return Object.assign({ id: id, label: label, type: "sc", coils: [[x, 0.8]], L: 3.4, R: 7000, C: 150e-12, out: 1.2, hum: 1 }, o || {}); }
  // EQ (dB): 0-10 knobs, 5 = flat, +-15 dB (site's values, unverified)
  function eq(f, st) { var d = ((st.bass == null ? 5 : st.bass) - 5) * 3 / (1 + Math.pow(f / 80, 2)) + ((st.treble == null ? 5 : st.treble) - 5) * 3 * Math.pow(f / 2500, 2) / (1 + Math.pow(f / 2500, 2));
    if (st.mid != null) d += (st.mid - 5) * 3 / (1 + Math.pow(1.5 * (f / 500 - 500 / f), 2)); return Math.pow(10, d / 20); }
  var grid = [{}]; [2, 5, 8].forEach(function (t) { [2, 5, 8].forEach(function (b) { grid.push({ treble: t, bass: b }); }); });
  var grid3 = [{}]; grid.slice(1).forEach(function (g) { [2, 5, 8].forEach(function (m) { grid3.push(Object.assign({ mid: m }, g)); }); });
  var JS = [{ vol1: 10, vol2: 10 }, { vol1: 10, vol2: 0 }, { vol1: 0, vol2: 10 }, { vol1: 10, vol2: 7 }, { vol1: 7, vol2: 10 }];
  function jazz(id, year, bridgeX, label) { return Object.assign({}, STR, { name: "Fender Jazz Bass (" + label + ")", short: "Jazz " + label, maker: "Fender", year: year, scale: 34, panel: "bs-" + id,
    pickups: [sc("neck", "Neck", 6.3), sc("bridge", "Bridge", bridgeX, { hum: -1 })],
    positions: [{ id: "both", label: "Both", use: { neck: 1, bridge: 1 } }],
    controls: [K("vol1", "Neck volume"), K("vol2", "Bridge volume"), K("tone", "Tone")], search: JS,
    wiring: { kind: "jazz", vol: 250e3, tonePot: 250e3, cap: 0.047e-6, vols: { neck: "vol1", bridge: "vol2" }, tone: { out: "tone" } },
    facts: "Two single coils, reverse wound and reverse polarity, a volume for each and one tone (from late 1961); pickups " + (6.3 - bridgeX).toFixed(1) + " in apart (Wikipedia, \"Fender Jazz Bass\"); 34 in scale." }); }
  var BASSES = {
    pbass: Object.assign({}, STR, { name: "Fender Precision Bass", short: "P-Bass", maker: "Fender", year: 1957, scale: 34, panel: "bs-pbass",
      pickups: [{ id: "p", label: "Split coil", type: "split", coils: [[6.0, 0.9, [0, 1]], [6.9, 0.9, [2, 3]]], L: 6.0, R: 10500, C: 220e-12, out: 1.6, hum: 0 }],
      positions: [{ id: "p", label: "P", use: { p: 1 } }],
      controls: [K("vol", "Volume"), K("tone", "Tone")],
      wiring: { kind: "fender", vol: 250e3, tonePot: 250e3, cap: 0.1e-6, tone: { p: "tone" } },
      facts: "One split-coil pickup from 1957: two coils, wired out of phase with reversed magnets, so hum cancels; scale 34 in (Wikipedia, \"Fender Precision Bass\"). Volume and tone knobs: as on the instrument, not stated by the source." }),
    jbass: jazz("jbass", 1962, 2.7, "1960s"),
    jbass70: jazz("jbass70", 1972, 2.3, "1970s"),
    stingray: Object.assign({}, STR, { name: "Music Man StingRay (2-band)", short: "StingRay", maker: "Music Man", year: 1976, scale: 34, panel: "bs-stingray",
      pickups: [{ id: "hb", label: "Humbucker", type: "hb", coils: [[3.6, 0.8], [4.4, 0.8]], L: 1.5, R: 3300, C: 100e-12, out: 1.0, hum: 0 }],
      positions: [{ id: "hb", label: "HB", use: { hb: 1 } }],
      controls: [K("vol", "Volume"), K("treble", "Treble", 5), K("bass", "Bass", 5)], search: grid,
      wiring: { kind: "active", inR: 1e6, gain: 3, eq: eq },
      facts: "One large humbucker, coils in parallel, nearer the bridge than a Precision's; an active preamp (9 V) with bass and treble (Wikipedia, \"Music Man StingRay\"). Knob order, EQ frequencies and range: unverified." }),
    stingray3: Object.assign({}, STR, { name: "Music Man StingRay (3-band)", short: "StingRay 3-band", maker: "Ernie Ball Music Man", year: 1985, scale: 34, panel: "bs-stingray3",
      pickups: [{ id: "hb", label: "Humbucker", type: "hb", coils: [[3.6, 0.8], [4.4, 0.8]], L: 1.5, R: 3300, C: 100e-12, out: 1.0, hum: 0 }],
      positions: [{ id: "hb", label: "HB", use: { hb: 1 } }],
      controls: [K("vol", "Volume"), K("treble", "Treble", 5), K("mid", "Mid", 5), K("bass", "Bass", 5)], search: grid3,
      wiring: { kind: "active", inR: 1e6, gain: 3, eq: eq },
      facts: "The same pickup with a mid control added to the bass and treble (Ernie Ball era, after 1984; Wikipedia, \"Music Man StingRay\"). The year 1985 here is a placeholder (unverified)." }),
    ric4003: Object.assign({}, STR, { name: "Rickenbacker 4003", short: "Ric 4003", maker: "Rickenbacker", year: 1980, scale: 33.5, panel: "bs-ric4003",
      pickups: [sc("neck", "Neck (toaster)", 9.5, { L: 2.6, R: 6500 }), sc("bridge", "Bridge", 1.6, { L: 3.6, R: 8000, coils: [[1.6, 0.9]] })],
      positions: [{ id: "neck", label: "Neck", use: { neck: 1 } }, { id: "both", label: "Both", use: { neck: 1, bridge: 1 } }, { id: "bridge", label: "Bridge", use: { bridge: 1 } }],
      controls: [["sel", "3-way switch", "c", ["neck", "both", "bridge"], null, null, "both"], K("vol1", "Neck volume"), K("vol2", "Bridge volume"), K("tone1", "Neck tone"), K("tone2", "Bridge tone")],
      wiring: { kind: "gibson", vol: 250e3, tonePot: 250e3, cap: 0.047e-6, vols: { neck: "vol1", bridge: "vol2" }, tone: { neck: "tone1", bridge: "tone2" } },
      facts: "Two single coils (a \"toaster\" at the neck), a volume and tone each and a three-way switch, as on the 4001 (1961); the 4003 (1980) changed the truss rod; scale 33.5 in; Rick-O-Sound stereo output (from 1968, not modelled) (Wikipedia, \"Rickenbacker 4001\")." })
  };
  Object.keys(BASSES).forEach(function (id) { if (!GP.GUITARS[id]) GP.add(id, BASSES[id]); });
  var BP = { GP: GP, IDS: GP.BASS_IDS, BASSES: BASSES, eq: eq, TRACKS: "/apps/shared/data/basses/tracks.json" };
  if (typeof module !== "undefined" && module.exports) { module.exports = BP; }
  if (typeof document === "undefined") return;
  global.BassPickups = BP;
  function init() { GP.init({ prefix: "bs", ids: GP.BASS_IDS, tracks: BP.TRACKS }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
