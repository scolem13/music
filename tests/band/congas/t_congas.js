// The conga player: patterns in every meter, the other parts unchanged by it, the catalog, MIDI and notation. Run from this folder.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/");
for (const f of ["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/congas.js", "band/drums.js", "band/catalog.js", "band/player.js", "band/midi.js", "band/notation.js"])
  vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const ABC = require(R + "abcjs-basic.js");
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = BandCatalog, P = BandCongas.PATTERNS;
const PIECES = ["congaHeel", "congaToe", "congaSlap", "congaOpen", "congaMute", "congaBass", "tumbaOpen", "tumbaMute", "tumbaBass"];

// ---- every pattern in every meter
const METERS = [["2/4", 2, false], ["3/4", 3, false], ["4/4", 4, false], ["6/8", 2, true], ["9/8", 3, true], ["12/8", 4, true], ["5/4", 5, false]];
function ctx(m, id, extra){ return Object.assign({ index: 0, length: 12, beats: m[1], compound: m[2], tempo: 120, phrase: { bar: 0 }, intensity: 0.5, opts: { congas: id },
  chords: [{ pos: 0, chord: { root: 0 } }, { pos: Math.floor(m[1] / 2), chord: { root: 7 } }] }, extra || {}); }
Object.keys(P).forEach(id => {
  const cg = BandCongas.create({ rng: mb(5) });
  METERS.forEach(m => [0, 1, 2, 3].forEach(i => {
    const evs = cg.bar(ctx(m, id, { index: i }));
    assert(evs.length > 0 || (id === "opens" && m[0] === "2/4"), id + " " + m[0] + " plays");   // (the first learning step has nothing before beat 3)
    evs.forEach(e => {
      assert(e.pos >= 0 && e.pos < m[1], id + " " + m[0] + " inside the bar: " + e.pos);
      assert(PIECES.includes(e.piece), "piece " + e.piece); assert(e.stroke in BandCongas.STROKES, "stroke " + e.stroke); assert(e.hand === "L" || e.hand === "R", "hand");
      assert(e.vel > 0 && e.vel <= 1, "vel");
      if (m[2]) assert(e.straight, id + " " + m[0] + " compound events are straight");
    });
    for (let k = 1; k < evs.length; k++) assert(evs[k].pos >= evs[k - 1].pos, "in time order");
    assert.equal(cg.bar(ctx(m, id, { index: i, stop: true })).length, 1, "stop time: one tone");
    assert.equal(cg.bar(ctx(m, id, { index: i, stop: true }))[0].pos, 0);
  }));
  assert.equal(cg.ending(ctx(METERS[2], id)).length, 1); assert.equal(cg.ending(ctx(METERS[2], id))[0].stroke, "O");
});
// silent unless asked, and then no random numbers are drawn
let draws = 0; const cnt = () => { draws++; return 0.5; }, quiet = BandCongas.create({ rng: cnt });
[undefined, "", "none", "nonesuch"].forEach(v => { assert.deepEqual(quiet.bar(ctx(METERS[2], v)), []); assert.deepEqual(quiet.ending(ctx(METERS[2], v)), []); });
assert.equal(draws, 0, "no rng draws while silent");
// the tumbao: heel toe slap toe heel toe open open, the hands alternating as written
const tb = BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[2], "tumbao"));
assert.equal(tb.map(e => e.stroke).join(""), "HTSTHTOO"); assert.equal(tb.map(e => e.hand).join(""), "LLRLLLRR");
assert.deepEqual(tb.map(e => e.pos), [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]); assert(tb.every(e => /^conga/.test(e.piece)));
const t2 = BandCongas.create({ rng: mb(1) });
assert.deepEqual(t2.bar(ctx(METERS[2], "tumbao2", { index: 0 })).map(e => e.piece), tb.map(e => e.piece));
const b2 = t2.bar(ctx(METERS[2], "tumbao2", { index: 1 }));
assert.deepEqual(b2.map(e => e.piece), ["congaHeel", "congaToe", "congaSlap", "tumbaOpen", "tumbaOpen", "congaToe", "congaOpen", "congaOpen"]);
assert.equal(b2.map(e => e.hand).join(""), "LLRRRLRR"); assert.deepEqual(t2.bar(ctx(METERS[2], "tumbao2", { index: 2 })).map(e => e.piece), tb.map(e => e.piece), "two bars repeat");
// 2/4 takes the first half; 3/4 and 12/8 are steady's own
assert.equal(BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[0], "tumbao")).map(e => e.stroke).join(""), "HTST");
assert.equal(BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[1], "steady")).map(e => e.stroke).join(""), "HTSTOO");
const s12 = BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[5], "steady"));
assert.equal(s12.map(e => e.stroke).join(""), "HTTSTTHTTHOO"); assert.deepEqual(s12.slice(-2).map(e => e.stroke), ["O", "O"]);
assert.equal(BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[3], "tumbao")).map(e => e.stroke).join(""), "HTTHOO", "6/8 falls back on steady");
assert.equal(BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[4], "tumbao")).map(e => e.stroke).join(""), "HTTSTTHOO", "9/8");
// the slap carries and the heel is quiet
assert(tb[2].vel > 0.5 && tb[0].vel < 0.4 && tb[6].vel > 0.5);
// the learning steps are true subsets of the tumbao, and together they make it
{ const full = tb.map(e => e.stroke + e.hand + e.pos), g = id => BandCongas.create({ rng: mb(1) }).bar(ctx(METERS[2], id)).map(e => e.stroke + e.hand + e.pos);
  assert.deepEqual(g("opens"), ["OR3", "OR3.5"]); assert.deepEqual(g("slapopen"), ["SR1", "OR3", "OR3.5"]);
  assert.deepEqual(g("heeltoe"), ["HL0", "TL0.5", "TL1.5", "HL2", "TL2.5"]);
  ["opens", "slapopen", "heeltoe"].forEach(id => g(id).forEach(x => assert(full.includes(x), id + " " + x + " is in the tumbao")));
  assert.deepEqual(g("slapopen").concat(g("heeltoe")).sort(), full.slice().sort(), "right hand + left hand = the tumbao"); }
console.log("PATTERNS OK");

// ---- the other parts draw the same numbers with or without congas
const parsed = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]');
["swing", "montuno", "rock", "boogaloo"].forEach(sty => {
  const so = C.styleOpts(sty).opts, on = Object.assign({}, so, { congas: "tumbao2" }), off = Object.assign({}, so, { congas: "none" });
  const a = BandMidi.generate(parsed, { bars: 24, tempo: 120, opts: on, rng: mb(7) }), b = BandMidi.generate(parsed, { bars: 24, tempo: 120, opts: off, rng: mb(7) });
  ["bass", "comp", "drums"].forEach(p => assert.deepEqual(a.map(x => x.parts[p]), b.map(x => x.parts[p]), sty + " " + p + " unchanged by congas"));
  assert(a.some(x => x.parts.congas && x.parts.congas.length), "congas on"); assert(b.every(x => !("congas" in x.parts)), "no congas part when off");
  const un = BandMidi.generate(parsed, { bars: 8, tempo: 120, opts: Object.assign({}, so, { congas: undefined }), rng: mb(7) });
  assert(un.every(x => !("congas" in x.parts)));
});
// a second chord player and congas together do not disturb each other either
{ const so = C.styleOpts("swing").opts, sec = { comp: "guitar", compSound: "guitar", compRhythm: "four", voicing: "shell3" };
  const a = BandMidi.generate(parsed, { bars: 12, tempo: 120, opts: Object.assign({}, so, { second: sec, congas: "steady" }), rng: mb(3) }), b = BandMidi.generate(parsed, { bars: 12, tempo: 120, opts: Object.assign({}, so, { second: sec }), rng: mb(3) });
  ["bass", "comp", "comp2", "drums"].forEach(p => assert.deepEqual(a.map(x => x.parts[p]), b.map(x => x.parts[p]), p)); }
console.log("OTHER PARTS UNCHANGED OK");

// ---- the catalog
assert.equal(C.congas[0].id, "none"); assert.equal(C.congas[0].label, "No congas");
C.congas.slice(1).forEach(e => { assert(P[e.id], "pattern for " + e.id); assert(e.label && e.desc && e.group && e.feel && e.tags, e.id); assert(e.fits.length, e.id + " fits a style"); e.fits.forEach(f => assert(C.byId(C.styles, f), f)); });
Object.keys(P).forEach(id => assert(C.byId(C.congas, id), "catalog has " + id));
C.styles.forEach(s => { if (s.congas) { assert(P[s.congas], s.id + " congas exists"); assert(C.fits(C.byId(C.congas, s.congas), s.id), s.id + " congas fit"); }
  assert(C.fits(C.byId(C.congas, "steady"), s.id), "steady fits " + s.id); assert(C.fits(C.congas[0], s.id));
  assert.equal(C.styleOpts(s.id).opts.congas, s.congas || "none"); assert.equal(C.styleOpts(s.id).instruments.includes("congas"), !!s.congas); });
assert.deepEqual(["montuno", "chacha", "boogaloo"].map(i => C.byId(C.styles, i).congas), ["tumbao2", "tumbao", "tumbao"]);
["bossa", "calypso", "reggae", "reggaeton", "swing"].forEach(i => assert(!C.byId(C.styles, i).congas));
["montuno", "chacha", "boogaloo"].forEach(i => { assert(C.fits(C.byId(C.congas, "tumbao"), i), "tumbao " + i); assert(C.fits(C.byId(C.congas, "tumbao2"), i)); });
assert(!C.fits(C.byId(C.congas, "tumbao"), "swing"));
// a section can name them
const so = C.sectionOpts("swing; congas tumbao", {}); assert.equal(so.opts.congas, "tumbao"); assert(so.instruments.includes("congas"));
assert.equal(C.sectionOpts("montuno", {}).opts.congas, "tumbao2"); assert.equal(C.sectionOpts("swing", { congas: "tumbao" }).opts.congas, "none");
assert(/congas=tumbao/.test(C.url({ congas: "tumbao" })));
console.log("CATALOG OK");

// ---- MIDI
function tracks(u8){ let p = 0; const rd = n => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + u8[p++]; return v; }, s4 = () => String.fromCharCode(u8[p++], u8[p++], u8[p++], u8[p++]), out = [];
  assert.equal(s4(), "MThd"); rd(4); rd(2); const nt = rd(2); rd(2);
  for (let t = 0; t < nt; t++){ assert.equal(s4(), "MTrk"); const end = rd(4) + p, ev = [];
    while (p < end){ let d = 0, b; do { b = u8[p++]; d = d * 128 + (b & 127); } while (b & 128); const st = u8[p++];
      if (st === 0xff){ const ty = u8[p++]; let l = 0; do { b = u8[p++]; l = l * 128 + (b & 127); } while (b & 128); ev.push({ meta: ty, text: String.fromCharCode(...u8.slice(p, p + l)) }); p += l; }
      else if ((st & 0xf0) === 0xc0) ev.push({ prog: u8[p++] }); else ev.push({ type: st & 0xf0, ch: st & 15, n: u8[p++], v: u8[p++] }); }
    out.push(ev); }
  return out; }
{ const so = C.styleOpts("montuno").opts, on = BandMidi.generate(parsed, { bars: 12, tempo: 120, opts: so, rng: mb(2) }), off = BandMidi.generate(parsed, { bars: 12, tempo: 120, opts: Object.assign({}, so, { congas: "none" }), rng: mb(2) });
  const a = tracks(BandMidi.build(on)), b = tracks(BandMidi.build(off));
  assert.equal(a.length, b.length + 1, "a track of its own when they play");
  const name = t => (t.find(e => e.meta === 3) || {}).text, last = a[a.length - 1];
  assert.equal(name(last), "Congas"); assert(!b.some(t => name(t) === "Congas"));
  const notes = last.filter(e => e.type === 0x90);
  assert.equal(notes.length, on.reduce((n, x) => n + (x.parts.congas || []).length, 0)); assert(notes.every(e => e.ch === 9 && [62, 63, 64].includes(e.n)));
  assert(notes.some(e => e.n === 63) && notes.some(e => e.n === 62));
  assert.equal(tracks(BandMidi.build(on, { parts: ["bass", "comp", "drums"] })).length, b.length, "unless the parts are chosen"); }
console.log("MIDI OK");

// ---- notation
function staffOf(abc){ const tune = ABC.parseOnly(abc)[0], voices = {}; 
  tune.lines.forEach(l => (l.staff || []).forEach(st => st.voices.forEach((v, vi) => { const key = st.title ? st.title[vi] : vi; (voices[key] = voices[key] || []).push(v); }))); return { tune, voices }; }
const tunes = { "4/4": 'X:1\nM:4/4\nL:1/4\nK:C\n"C"z4 | "F"z2 "G"z2 | "Am"z4 | "G"z4 |]', "3/4": 'X:1\nM:3/4\nL:1/4\nK:C\n"C"z3 | "F"z3 | "G"z3 | "C"z3 |]', "12/8": 'X:1\nM:12/8\nL:1/8\nK:C\n"C"z12 | "F"z12 | "G"z12 | "C"z12 |]',
  "6/8": 'X:1\nM:6/8\nL:1/8\nK:C\n"C"z6 | "F"z6 | "G"z6 | "C"z6 |]' };
Object.keys(tunes).forEach(m => ["tumbao2", "steady"].forEach(id => {
  const bars = BandMidi.generate(TuneChart.parse(tunes[m]), { bars: 4, tempo: 100, opts: Object.assign({}, C.styleOpts("montuno").opts, { congas: id, groove: "auto" }), rng: mb(4) });
  // stops and a rest-filled bar too
  bars[2].parts.congas = bars[2].parts.congas.filter((e, i) => i % 3 === 0);
  bars[3].parts.congas = [];
  const abc = BandNotation.toAbc(bars, { key: "C", show: { congas: true } }), n = bars.reduce((k, b) => k + b.parts.congas.length, 0);
  assert(/V:G clef=perc stem=up name="Cga\."/.test(abc), m + " has the Cga. voice");
  const w = abc.split("\n").filter(l => /^w:/.test(l)); assert.equal(w.length, 2, "two lines of words");
  const toks = l => l.slice(2).split(/\s+/).filter(t => t && t !== "|");
  assert.equal(toks(w[0]).length, n, m + " " + id + " stroke letters"); assert.equal(toks(w[1]).length, n, "hand letters");
  assert(toks(w[0]).every(t => "HTSOMB".includes(t)) && toks(w[1]).every(t => t === "L" || t === "R"));
  // the words land on the notes abcjs draws
  const ev = []; bars.forEach(b => b.parts.congas.forEach(e => ev.push(e)));
  const { tune } = staffOf(abc); const notes = []; tune.lines.forEach(l => (l.staff || []).forEach(st => st.voices.forEach(v => v.forEach(el => { if (el.el_type === "note" && el.lyric && el.pitches) notes.push(el); }))));
  assert.equal(notes.length, n, m + " lyric notes"); notes.forEach((nt, i) => { assert.equal(nt.lyric[0].syllable, ev[i].stroke, "stroke under note " + i); assert.equal(nt.lyric[1].syllable, ev[i].hand); });
  // the other voices are still whole: the same abc without congas draws the same comping and bass lines
  const plain = BandNotation.toAbc(bars, { key: "C" }); assert(!/Cga/.test(plain) && !/^w:/m.test(plain));
  assert.equal(abc.split("\n").filter(l => /^\[V:(K|L|B)\]/.test(l)).join("\n"), plain.split("\n").filter(l => /^\[V:(K|L|B)\]/.test(l)).join("\n"), "other voices unchanged");
}));
// off unless asked, and not shown when nobody plays
{ const bars = BandMidi.generate(parsed, { bars: 4, tempo: 100, opts: Object.assign({}, C.styleOpts("montuno").opts), rng: mb(4) });
  assert(!/Cga/.test(BandNotation.toAbc(bars, { key: "F" })) && /Cga/.test(BandNotation.toAbc(bars, { key: "F", show: { congas: true } })));
  const off = BandMidi.generate(parsed, { bars: 4, tempo: 100, opts: C.styleOpts("swing").opts, rng: mb(4) }); assert(!/Cga/.test(BandNotation.toAbc(off, { key: "F", show: { congas: true } }))); }
assert.equal(BandNotation.congaName("congaOpen"), "Open tone"); assert.equal(BandNotation.congaName("congaSlap"), "Slap"); assert.equal(BandNotation.congaName("congaHeel"), "Heel");
assert.equal(BandNotation.congaName("congaToe"), "Toe (fingertips)"); assert.equal(BandNotation.congaName("congaMute"), "Muffled tone"); assert.equal(BandNotation.congaName("congaBass"), "Bass tone");
assert.equal(BandNotation.congaName("tumbaOpen"), "Open tone, low drum"); assert.equal(BandNotation.congaName("nope"), null);
assert.deepEqual(BandNotation.congaWritten("congaSlap"), { letter: "e", style: "x", low: false }); assert.equal(BandNotation.congaWritten("tumbaOpen").low, true);
console.log("NOTATION OK");
console.log("CONGAS OK");
