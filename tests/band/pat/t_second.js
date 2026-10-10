// A second chord instrument (opts.second, the part "comp2"): silent when unset, never disturbs the other parts or the
// first guitarist's hand, hears every chord in every meter, and every style's suggestion for it names real things.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/sounds.js", "band/catalog.js", "band/drums.js", "band/player.js", "band/midi.js"].forEach(f => require(R + f));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const M = { "4/4": ["1/4", "4", ["2", "2"], 4], "3/4": ["1/4", "3", ["2", ""], 3], "6/8": ["1/8", "6", ["3", "3"], 2] };
const BARS = "G|C|G|D7|Em|C|G D|G".split("|");
const abc = id => "X:1\nT:t\nM:" + id + "\nL:" + M[id][0] + "\nK:G\n" + BARS.map(b => { const c = b.split(" "); return c.length > 1 ? `"${c[0]}"z${M[id][2][0]} "${c[1]}"z${M[id][2][1]}` : `"${c[0]}"z${M[id][1]}`; }).join(" | ") + " |]";
const gen = (id, opts, seed) => BandMidi.generate(TuneChart.parse(abc(id)), { bars: 24, tempo: 110, opts, rng: mb(seed || 4) });
const C = BandCatalog, base = { comp: "guitar", compSound: "aguitar", compRhythm: "strumFolk", voicing: "open", bassFeel: "alt", groove: "brushes", feel: "straight", variation: 0.6 };

// unset: nothing played
gen("4/4", base).forEach(r => assert.deepStrictEqual(r.parts.comp2, []));
// set: the other three parts are note for note what they were, the first guitar's fingerings included
for (const second of [{ comp: "piano", compSound: "piano", compRhythm: "pad", voicing: "standard" }, { comp: "guitar", compSound: "nguitar", compRhythm: "arp2", voicing: "triad3" }, { comp: "guitar", compSound: "clguitar", compRhythm: "prine", voicing: "open" }])
  for (const id of Object.keys(M)){
    const a = gen(id, base), b = gen(id, Object.assign({}, base, { second })), tag = id + " " + second.compSound;
    b.forEach((r, i) => {
      ["bass", "comp", "drums"].forEach(p => assert.deepStrictEqual(r.parts[p], a[i].parts[p], tag + " bar " + i + " " + p));
      assert(r.parts.comp2.length, tag + " plays in bar " + i);
      r.parts.comp2.forEach(e => { assert(e.second && e.inst === second.comp && e.pos >= 0 && e.pos < M[id][3] && e.dur > 0.05 && e.pos + e.dur <= M[id][3] + 1e-6, tag + " " + JSON.stringify(e)); assert(e.midis.every(m => m >= 36 && m <= 90)); });
      r.chords.forEach(c => assert(r.parts.comp2.some(e => e.of === r.index + ":" + c.pos), tag + " hears " + c.chord.sym));
    });
  }
// pins belong to the first player only
{ const pins = { "0:0": [55, 59, 62] }, b = gen("4/4", Object.assign({}, base, { comp: "piano", compRhythm: "quarters", voicing: "standard", pins, second: { comp: "piano", compRhythm: "pad", voicing: "standard" } }));
  assert.deepStrictEqual(b[0].parts.comp.find(e => !e.arp).midis, [55, 59, 62]); }
// every style's suggestion, for a piano and for a guitar
C.styles.forEach(s => ["piano", "organ", "aguitar", "odguitar"].forEach(snd => { const x = C.secondFor(s.id, snd), fam = BandSounds.family(snd);
  assert.strictEqual(x.comp, fam); assert.strictEqual(x.compSound, snd); assert(C.byId(C.comp, x.compRhythm), s.id + " rhythm " + x.compRhythm); assert(BandHarmony.hasStyle(fam, x.voicing), s.id + " " + fam + " voicing " + x.voicing);
  gen("4/4", Object.assign({}, C.styleOpts(s.id).opts, { second: x })).forEach((r, i) => assert(r.parts.comp2.length, s.id + " " + snd + " bar " + i)); }));
// MIDI export: a track of its own
{ const bytes = BandMidi.build ? BandMidi.build(gen("4/4", Object.assign({}, base, { second: { comp: "piano", compRhythm: "pad", voicing: "standard" } }))) : null;
  if (bytes) assert.strictEqual(bytes[11], 5, "tempo track + bass + two chord instruments + drums"); }
console.log("SECOND OK");
