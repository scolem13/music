// A section's own style (%%style under a P: line, "^style" in a bar), weighted voicings and how much the bass walks. Run: node t_sections.js
const path = require("path"), assert = require("assert"), S = path.join(__dirname, "../../../apps/shared");
global.window = global;
["tune-chart", "voicings", "band/harmony", "band/bass", "band/comp", "band/presets", "band/catalog", "band/drums", "band/midi"].forEach(f => { try { require(path.join(S, f + ".js")); } catch (e) { if (!/voicings|presets|midi/.test(f)) throw e; } });
const abc = `X:1\nM:4/4\nL:1/8\n%%style hymn\nK:C\nP:Verse\n"C"z8 | "F"z8 | "G7"z8 | "C"z8 |\nP:Bridge\n%%style bossa nova\n"Dm7"z8 | "G7"z8 | "^style none""Cmaj7"z8 | "A7"z8 |\nP:Out\n"C"z8 | "^style Swing""F"z8 |`;
const parsed = TuneChart.parse(abc), form = BandHarmony.buildForm(parsed, 0);
assert.deepStrictEqual(form.map(b => b.style || "-"), ["-", "-", "-", "-", "bossa nova", "bossa nova", "-", "-", "-", "Swing"]);
assert.deepStrictEqual(form.filter(b => b.section != null).map(b => b.section), ["Verse", "Bridge", "Out"]);

// the bass: how much it walks
function bassBars(walk, n){ const b = BandBass.create({ rng: (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() }); const out = [];
  for (let i = 0; i < n; i++){ const fb = form[i % 4]; out.push(b.bar({ bar: i, index: i % 4, length: 4, chorus: 0, beats: 4, chords: fb.chords, nextChords: form[(i + 1) % 4].chords, tempo: 140, opts: { bassFeel: "walk", feel: "swing", walk: walk }, form: form, intensity: 0.5, phrase: { bar: i % 4 } }).filter(e => e.pos === Math.round(e.pos)).length); }
  return out; }
assert(bassBars(1, 16).every(n => n === 4), "all walking: " + bassBars(1, 16));
assert(bassBars(0, 16).every(n => n <= 3), "all in two: " + bassBars(0, 16));
const half = bassBars(0.5, 64), walked = half.filter(n => n === 4).length;
assert(walked > 12 && walked < 52, "about half walk: " + walked);
for (let i = 0; i < 64; i += 2) assert.strictEqual(half[i] === 4, half[i + 1] === 4, "two bars at a time");
console.log("walk at 0.5:", walked, "of 64 bars");

// the comping: voicing styles by their shares
function tops(mix){ const c = BandComp.create({ rng: (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() }); const seen = {};
  for (let i = 0; i < 200; i++){ const fb = form[i % 4];
    c.bar({ bar: i, index: i % 4, length: 4, chorus: 0, beats: 4, chords: fb.chords, nextChords: form[(i + 1) % 4].chords, tempo: 120, form: form, intensity: 0.5, phrase: { bar: i % 4 },
            opts: { comp: "piano", compRhythm: "pad", feel: "swing", voicing: "shell+rootless", voicingMix: mix, voiceMove: "hold" } })
      .forEach(e => { if (e.midis) seen[e.midis.length] = (seen[e.midis.length] || 0) + 1; }); }
  return seen; }
const even = tops({ shell: 0.5, rootless: 0.5 }), lean = tops({ shell: 0.05, rootless: 1 }), other = tops({ shell: 1, rootless: 0.05 });
console.log("notes per chord, even:", JSON.stringify(even), "rootless heavy:", JSON.stringify(lean), "shell heavy:", JSON.stringify(other));
const few = o => Object.keys(o).filter(k => +k <= 3).reduce((s, k) => s + o[k], 0) / Object.keys(o).reduce((s, k) => s + o[k], 0);
assert(few(other) > few(lean) + 0.4, "shells (few notes) follow their share: " + few(other) + " vs " + few(lean));
// the band, bar by bar: the Bridge's first two bars are a bossa (cross-stick clave, no hymn hold), the rest the hymn (no drums)
const recs = BandMidi.generate(parsed, { bars: form.length, tempo: 110, opts: Object.assign({}, BandCatalog.styleOpts("hymn").opts, { variation: 0 }) });
const drums = recs.map(r => (r.parts.drums || []).length); console.log("drum notes per bar:", drums.join(" "), "| styles:", recs.map(r => r.opts.sectionStyle || "-").join(" "));
assert.deepStrictEqual(recs.map(r => r.opts.sectionStyle || "-"), ["-", "-", "-", "-", "bossa", "bossa", "-", "-", "-", "swing"]);
assert(drums.slice(0, 4).every(n => n === 0) && drums[4] > 6 && drums[5] > 6 && drums[6] === 0 && drums[9] > 3);
assert.strictEqual(recs[4].opts.groove, "bossa"); assert.strictEqual(recs[4].opts.feel, "straight"); assert.strictEqual(recs[9].opts.feel, "swing"); assert.strictEqual(recs[0].opts.groove, "none");
assert.strictEqual(BandCatalog.sectionOpts("nonsense", {}), null);
console.log("SECTIONS OK");
