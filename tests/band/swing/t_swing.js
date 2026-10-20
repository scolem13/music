// Swing as one setting (BandPlayer.swingAt, player.setSwing, a style's `swing`, written grooves). Run from this folder.
// The rule: a style with no `swing`, and no listener's choice, plays exactly as before (swingFor by tempo, even for feel "straight").
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
for (const f of ["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/groove.js", "band/drums.js", "band/congas.js", "band/sounds.js", "band/catalog.js", "band/player.js", "band/midi.js"])
  vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const P = BandPlayer, near = (a, b) => Math.abs(a - b) < 1e-9;
const oldWarp = (pos, s) => { const b = Math.floor(pos), f = pos - b; return b + (f <= 0.5 ? f * (s / 0.5) : s + (f - 0.5) * ((1 - s) / 0.5)); };

// the Auto curve is the old one
for (let bpm = 40; bpm <= 300; bpm += 3) {
  for (const st of BandCatalog.styles) {
    const o = BandCatalog.styleOpts(st.id).opts;
    assert.strictEqual(o.styleSwing, undefined, st.id + " has no swing of its own yet");
    const a = P.swingAt(o, bpm); assert.strictEqual(a.div, 8);
    assert(near(a.s, o.feel === "straight" ? 0.5 : P.swingFor(bpm)), st.id + " at " + bpm);
  }
  for (const pos of [0, 0.5, 1.5, 2.25, 3.5, 3.75]) assert(near(P.warp(pos, P.swingFor(bpm)), oldWarp(pos, P.swingFor(bpm))));
}
// the listener's choice wins, within 50..75
assert(near(P.swingAt({ feel: "straight" }, 120, 0.6).s, 0.6)); assert(near(P.swingAt({ feel: "swing", swingSet: 0.55 }, 120).s, 0.55));
assert(near(P.swingAt({}, 120, 0.9).s, 0.75)); assert(near(P.swingAt({}, 120, 0.2).s, 0.5));
assert(near(P.swingAt({ feel: "swing", swingSet: null }, 120).s, P.swingFor(120)));
// a style's own swing: a ratio, { div, amount }, { div, curve: "jazz" }
assert.deepStrictEqual(P.swingAt({ styleSwing: 0.62 }, 140), { div: 8, s: 0.62 });
assert.deepStrictEqual(P.swingAt({ styleSwing: { div: 16, amount: 0.58 } }, 90), { div: 16, s: 0.58 });
assert.deepStrictEqual(P.swingAt({ styleSwing: { div: 8, curve: "jazz" }, feel: "straight" }, 200), { div: 8, s: P.swingFor(200) });
assert.deepStrictEqual(P.swingAt({ styleSwing: 0.62, swingSet: 0.7 }, 140), { div: 8, s: 0.7 });
// warp at sixteenths: the eighths stay, the second sixteenth of each pair moves
assert(near(P.warp(0.5, 0.6, 16), 0.5)); assert(near(P.warp(0.25, 0.6, 16), 0.3)); assert(near(P.warp(1.75, 0.6, 16), 1.5 + 0.5 * 0.6 + 0 * 0 + 0)) ;
assert(near(P.warp(1.25, 0.5, 16), 1.25)); assert(near(P.warp(1.5, 0.6, 8), 1.6));
// MIDI follows: swingOf reads the setting, and an override moves the notes
assert(near(BandMidi.swingOf({ tempo: 120, opts: { feel: "swing" } }), P.swingFor(120)));
assert(near(BandMidi.swingOf({ tempo: 120, opts: { feel: "straight" } }), 0.5));
assert(near(BandMidi.swingOf({ tempo: 120, opts: { feel: "straight", swingSet: 0.6 } }), 0.6));
assert(near(BandMidi.swingOf({ tempo: 120, compound: true, opts: { swingSet: 0.6 } }), 2 / 3));
assert.strictEqual(BandMidi.swingDivOf({ tempo: 120, opts: { styleSwing: { div: 16, amount: 0.6 } } }), 16);

// written grooves: their own swing first; then the style's / the listener's on the groove's grid; the tempo curve never
const G = BandGroove, ctx = (i, extra) => Object.assign({ index: i, length: 12, beats: 4, tempo: 120, intensity: 0.5, opts: {} }, extra || {});
const sixteenths = "?TimeSig=4/4&Div=16&Tempo=120&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|";
const eighths = "?TimeSig=4/4&Div=8&Tempo=120&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o--|";
const hats = (text, opts) => BandDrums.create({ rng: () => 0.5 }).bar(ctx(0, { opts: Object.assign({ written: text }, opts) })).filter(e => e.piece.indexOf("hat") === 0).map(e => e.pos);
const straight16 = hats(sixteenths, {}), straight8 = hats(eighths, {});
assert(near(straight16[1], 0.25) && near(straight8[1], 0.5), "a written groove with no swing anywhere stays as written");
assert.deepStrictEqual(hats(sixteenths, { feel: "swing" }), straight16, "the tempo curve does not swing a written groove");
assert(near(hats(eighths, { styleSwing: 0.62 })[1], 0.62), "an eighth groove takes the style's eighth swing");
assert(near(hats(sixteenths, { styleSwing: { div: 16, amount: 0.6 } })[1], 0.3), "a sixteenth groove takes a sixteenth swing");
assert.deepStrictEqual(hats(sixteenths, { styleSwing: 0.62 }), straight16, "an eighth swing leaves a sixteenth groove alone");
assert(near(hats(eighths, { swingSet: 0.7 })[1], 0.7), "the listener's amount");
assert(near(hats(eighths, { swingSet: 0.7, writtenSwing: 0.5 })[1], 0.5), "writtenSwing still wins");
assert(near(hats(eighths.replace("Div=8", "Div=8&Swing=40"), { swingSet: 0.6 })[1], 0.7), "a groove's own swing wins over the style");
const cg = "?TimeSig=4/4&Div=8&Measures=1&Cg=|HTHTHTHT|";
const cgPos = o => BandCongas.create({ rng: () => 0.5 }).bar(ctx(0, { phrase: { bar: 0 }, chords: [], opts: Object.assign({ written: cg }, o) })).map(e => e.pos);
const c0 = cgPos({}), c1 = cgPos({ swingSet: 0.65 });
assert(near(c0[1], 0.5) && near(c1[1], 0.65), "congas: " + c0 + " / " + c1);
console.log("SWING OK");
