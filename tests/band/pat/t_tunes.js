// The figures taken from tunes (So What, Killer Joe, Song for My Father) and the built-in setups that use them.
//   node tests/band/pat/t_tunes.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/band/presets.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var N = BandHarmony.noteName;
function play(name, extra){
  var p = BandPresets.filter(function (x){ return x.name.indexOf(name) === 0; })[0]; assert(p, name);
  var parsed = TuneChart.parse(p.abc), n = parsed.bars.length;
  ["bass", "comp"].forEach(function (k){ assert(BandCatalog.byId(BandCatalog[k], k === "bass" ? p.bass : p.rhythm), k + " id of " + name); });
  assert(BandHarmony.hasStyle("piano", p.voicing), "voicing of " + name);
  var opts = { bassFeel: p.bass, compRhythm: p.rhythm, voicing: p.voicing, comp: "piano", feel: p.feel, groove: p.groove, figures: p.fields["bt-figs"], variation: 0 };
  return { n: n, bars: BandMidi.generate(parsed, { bars: n + 4, tempo: p.tempo, opts: Object.assign(opts, extra || {}) }) };
}
function bass(b){ return b.parts.bass.map(function (e){ return e.pos + ":" + N(e.midi); }).join(" "); }
function comp(b){ return b.parts.comp.map(function (e){ return e.pos + ":" + e.midis.map(N).join(""); }).join(" "); }

var sw = play("So What");
assert.strictEqual(sw.n, 32);
assert.strictEqual(bass(sw.bars[0]), "0:D2 1:A2 1.5:B2 2:C3 2.5:D3 3:E3 3.5:C3");
assert.strictEqual(bass(sw.bars[1]), "0:D3");
assert.strictEqual(comp(sw.bars[0]), "");
assert.strictEqual(comp(sw.bars[1]), "2:E3A3D4G4B4 3.5:D3G3C4F4A4");             // Em11 then Dm11, both in fourths
assert.strictEqual(bass(sw.bars[16]), "0:Eb2 1:Bb2 1.5:C3 2:Db3 2.5:Eb3 3:F3 3.5:Db3");
assert.strictEqual(sw.bars[32].parts.bass.length, 4, "walks after the head");
assert(sw.bars[32].parts.comp.length + sw.bars[33].parts.comp.length > 0, "comps after the head");
assert.strictEqual(bass(play("So What", { figures: "always" }).bars[32]), bass(sw.bars[0]), "every chorus when asked");

var kj = play("Killer Joe");
assert.strictEqual(bass(kj.bars[0]) + " | " + bass(kj.bars[1]), "0:C2 2:G1 3:A1 | 0:Bb1 2:G1 3:B1");
assert.strictEqual(comp(kj.bars[0]) + " | " + comp(kj.bars[1]), "0:E3A3Bb3D4 1.5:E3A3Bb3D4 | 0:D3G3Ab3C4 1.5:D3G3Ab3C4");   // one shape, a whole step down
assert.strictEqual(bass(kj.bars[32]), bass(kj.bars[0]));

var sf = play("Song for My Father");
assert.strictEqual(sf.n, 24);
assert.strictEqual(bass(sf.bars[0]), "0:F2 1.5:C3 2:F3");
assert.strictEqual(bass(sf.bars[2]), "0:Eb2 1.5:Bb2 2:Eb3");
assert.strictEqual(sf.bars[21].chords.length, 2);

// the figures on other chords: every root, every chord kind, in range
["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"].forEach(function (r){ ["m7", "7", "maj7", "m7b5", "6", "sus", "dim7"].forEach(function (q){
  var parsed = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\n"' + r + q + '"z4 | "' + r + q + '"z4 | "G7"z2 "' + r + q + '"z2 | "' + r + q + '"z4 |]');
  Object.keys(BandBass.AFTER).forEach(function (id){
    BandMidi.generate(parsed, { bars: 8, opts: { bassFeel: id, compRhythm: "sowhat", voicing: "sowhat", comp: "piano" } }).forEach(function (b){
      assert(b.parts.bass.length, id + " plays on " + r + q);
      b.parts.bass.forEach(function (e){ assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI, id + " " + r + q + " " + e.midi); });
      b.parts.comp.forEach(function (e){ assert(e.midis.length >= 2 && e.midis[0] >= 43 && e.midis[e.midis.length - 1] <= 84, "voicing " + r + q + " " + e.midis); });
    }); }); }); });
// every built-in setup: ids exist, the changes parse with no unknown chord, the band plays every bar in range
assert.strictEqual(BandPresets.length, 10);
BandPresets.forEach(function (p){
  var parsed = TuneChart.parse(p.abc), n = parsed.bars.length, st = BandCatalog.byId(BandCatalog.styles, p.style);
  assert(st && BandCatalog.byId(BandCatalog.bass, p.bass) && BandCatalog.byId(BandCatalog.drums, p.groove), p.name);
  [[BandCatalog.bass, p.bass], [BandCatalog.drums, p.groove]].concat(p.rhythm.split("+").map(function (r){ return [BandCatalog.comp, r]; })).forEach(function (x){
    assert(BandCatalog.fits(BandCatalog.byId(x[0], x[1]), p.style), p.name + ": " + x[1] + " fits " + p.style); });
  assert(n % 4 === 0 && BandHarmony.hasStyle("piano", p.voicing), p.name);
  var opts = { bassFeel: p.bass, compRhythm: p.rhythm, voicing: p.voicing, comp: "piano", feel: p.feel, groove: p.groove, figures: p.fields["bt-figs"] };
  var bars = BandMidi.generate(parsed, { bars: 2 * n, tempo: p.tempo, opts: opts }), heard = 0;
  bars.forEach(function (b, i){
    assert(b.chords.length && b.chords.every(function (c){ return c.chord && !c.chord.nc && c.chord.quality; }), p.name + " bar " + i + " chords");
    assert(b.parts.bass.length && b.parts.drums.length, p.name + " bar " + i);
    b.parts.bass.forEach(function (e){ assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI && e.pos < b.beats, p.name + " bass " + i); });
    b.parts.comp.forEach(function (e){ assert(e.pos < b.beats, p.name + " comp " + i); }); heard += b.parts.comp.length; });
  assert(heard > n / 2, p.name + " comping");
});
var fpb = play("Footprints").bars, abb = play("All Blues").bars, chb = play("Chameleon").bars, t5 = play("Take Five").bars, mvb = play("Maiden Voyage").bars;
assert.strictEqual(bass(fpb[0]) + " | " + bass(fpb[1]), "0:C2 1:G2 2:C3 | 0:Eb3 2:G2");
assert.strictEqual(bass(abb[0]) + " | " + bass(abb[1]), "0:G1 1:D2 1.5:E2 | 0:F2 1:E2 1.5:D2");
assert.strictEqual(bass(chb[0]) + " | " + bass(chb[1]), "0:Bb1 3:Db2 3.5:D2 | 0:Eb2 3:Ab1 3.5:A1");
assert.strictEqual(t5[0].beats, 5); assert.strictEqual(t5[0].parts.comp.map(function (e){ return e.pos; }).join(" "), "0 1.5 3 4");
assert.strictEqual(mvb[0].parts.comp.map(function (e){ return e.pos; }).join(" ") + " | " + mvb[1].parts.comp.map(function (e){ return e.pos; }).join(" "), "0 1.5 3 | 1.5 3");
console.log("TUNES OK");

// rhythms of threes and twos, Alberti bass, and the grooves that go with them
(function (){
  var parsed = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\n"C"z4 | "C"z4 | "F"z4 | "G7"z4 |]');
  function gen(o){ return BandMidi.generate(parsed, { bars: 4, tempo: 100, opts: Object.assign({ comp: "piano", voicing: "standard", feel: "straight", variation: 0 }, o) }); }
  function hits(b, piece){ return b.parts.drums.filter(function (e){ return e.piece === piece; }).map(function (e){ return e.pos; }).sort(function (x, y){ return x - y; }).join(" "); }
  var al = gen({ compRhythm: "alberti" })[0].parts.comp;
  assert(al.every(function (e){ return e.midis.length === 1 && e.arp; }));
  var v = al.map(function (e){ return e.midis[0]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
  assert(v[0] === lo && v[1] === hi && v[3] === hi && v[2] > lo && v[2] < hi && v[4] === lo, "alberti " + v);
  var d = gen({ groove: "dembow" })[0];
  assert.strictEqual(hits(d, "kick"), "0 1 2 3"); assert.strictEqual(hits(d, "snare"), "0.75 1.5 2.75 3.5");
  var c = gen({ groove: "clave32" }); assert.strictEqual(hits(c[0], "rim") + " | " + hits(c[1], "rim"), "0 1.5 3 | 1 2");
  var bo = gen({ groove: "bodiddley" }); assert.strictEqual(bo[0].parts.drums.filter(function (e){ return /^tom/.test(e.piece); }).length + bo[1].parts.drums.filter(function (e){ return /^tom/.test(e.piece); }).length, 5);
  assert.strictEqual(bass(gen({ bassFeel: "tresillo" })[0]), "0:C2 1.5:C2 3:G2");
  var rg = BandCatalog.byId(BandCatalog.styles, "reggaeton"); assert(rg);
  [[BandCatalog.bass, rg.bass], [BandCatalog.comp, rg.rhythm], [BandCatalog.drums, rg.drums]].forEach(function (x){ assert(BandCatalog.fits(BandCatalog.byId(x[0], x[1]), "reggaeton"), x[1]); });
  console.log("TEXTURES OK");
})();
