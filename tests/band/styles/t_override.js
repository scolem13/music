// A page's own settings for a section (opts.sectionOverrides) come before the section's %%style, and touch no other section.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/sounds.js", "band/catalog.js", "band/drums.js", "band/player.js", "band/midi.js"].forEach(f => require(R + f));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ABC = 'X:1\nM:4/4\nL:1/4\nK:C\nP:Verse\n"C"z4|"F"z4|\nP:Chorus\n%%style bossa nova\n"Dm7"z4|"G7"z4|\nP:Verse 2\n"C"z4|"F"z4|\nP:Chorus 2\n%%style bossa nova\n"Dm7"z4|"G7"z4|]';
const base = BandCatalog.styleOpts("swing").opts, gen = o => BandMidi.generate(TuneChart.parse(ABC), { bars: 8, tempo: 120, opts: Object.assign({}, base, o), rng: mb(3) });
const plain = gen({}), ov = gen({ sectionOverrides: { 1: { groove: "rock", bassFeel: "eighths", feel: "straight", compRhythm: "quarters", voicing: "standard", comp: "piano", compSound: "epiano" } } });
assert.deepStrictEqual(plain.map(r => r.opts.groove), ["auto", "auto", "bossa", "bossa", "auto", "auto", "bossa", "bossa"]);
assert.deepStrictEqual(ov.map(r => r.opts.groove), ["auto", "auto", "rock", "rock", "auto", "auto", "bossa", "bossa"], "the changed section only");
assert.deepStrictEqual(ov.map(r => r.opts.sectionStyle || ""), ["", "", "menus", "menus", "", "", "bossa", "bossa"]);
assert.strictEqual(ov[2].opts.compSound, "epiano"); assert.strictEqual(ov[2].parts.bass.length, 8, "eighth-note roots, not the bossa line");
[0, 1].forEach(i => assert.deepStrictEqual(ov[i].parts, plain[i].parts, "the verse before it is untouched"));
// an override on a section with no style of its own
assert.deepStrictEqual(gen({ sectionOverrides: { 2: { groove: "rock" } } }).map(r => r.opts.groove), ["auto", "auto", "bossa", "bossa", "rock", "rock", "bossa", "bossa"]);
console.log("SECTION OVERRIDES OK");
