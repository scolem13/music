// A written groove and its text (apps/shared/band/groove.js): GrooveScribe's own menu grooves read and written back, every
// letter of every lane, positions in every division and meter, swing, the band's grooves written as text. Run from this folder.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
for (const f of ["band/groove.js", "band/drums.js", "band/congas.js", "band/sounds.js", "band/notation.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const G = BandGroove;
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lane = (g, l) => g.lanes[l].join("");
const at = (bar, piece) => bar.filter(e => e.piece === piece).map(e => e.pos);

// ---- the grooves in GrooveScribe's menu, typed in from its page
const MENU = {
  "8th Note Rock": "?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o--|",
  "16th Note Rock": "?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|",
  "Syncopated Hi-hats #1": "?TimeSig=4/4&Div=16&Title=Syncopated%20hi-hats%201&Tempo=80&Measures=1&H=|x-xxx-xxx-xxx-xx|&S=|----O-------O---|&K=|o-------o-------|",
  "Train Beat": "?TimeSig=4/4&Div=16&Swing=0&Title=Train%20Beat&Tempo=95&Measures=1&H=|----------------|&S=|ggOgggOgggOggOOg|&K=|o-x-o-x-o-x-o-x-|",
  "Jazz Shuffle": "?TimeSig=4/4&Div=12&Title=Jazz%20Shuffle&Tempo=100&Measures=1&H=|r--r-rr--r-r|&S=|g-gO-gg-gO-g|&K=|o--X--o--X--|",
  "Half Time Shuffle in 16th notes": "?TimeSig=4/4&Div=24&Swing=0&Tempo=85&Measures=1&H=|x-xx-xx-xx-xx-xx-xx-xx-x|&S=|-g--g-Og--g--g--g-Og--g-|&K=|------------------------|",
  "Purdie Shuffle": "?TimeSig=4/4&Div=12&Swing=0&Tempo=120&Title=Purdie%20Shuffle&Swing=0&measures=1&H=|x-xx-xx-xx-x|&S=|-g--g-Og--g-|&K=|o----o-----o|",
  "Jazz Ride": "?TimeSig=4/4&Div=12&Tempo=80&Measures=1&H=|r--r-rr--r-r|&S=|------------|&K=|---x-----x--|",
  "Bossa Nova": "?TimeSig=4/4&Div=8&Title=Bossa%20Nova&Tempo=140&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|x-x--x-x|-x--x-x-|&K=|o-xoo-xo|o-xoo-xo|",
  "Jazz Samba": "?TimeSig=4/4&Div=16&Title=Samba&Tempo=80&Measures=1&H=|r-rrr-rrr-rrr-rr|&S=|o-o--o-o-o-oo-o-|&K=|o-xoo-xoo-xoo-xo|",
  "Songo": "?TimeSig=4/4&Div=16&Title=Songo&Tempo=80&Measures=1&&H=|x---x---x---x---|&S=|--O--g-O-gg--g-g|&K=|---o--o----o--o-|",
  "Tumbao": "?TimeSig=4/4&Div=16&Title=Tumbao Ostinato&Tempo=60&Measures=1&H=|----------------|&S=|----------------|&K=|x--ox-o-x--ox-o-|",
  "Baiao": "?TimeSig=4/4&Div=16&Title=Baiao Ostinato&Tempo=60&Measures=1&H=|----------------|&S=|----------------|&K=|o-xo--X-o-xo--X-|"
};
Object.keys(MENU).forEach(name => {
  const g = G.parse(MENU[name]), st = G.steps(g);
  G.LANES.forEach(l => assert.equal(g.lanes[l].length, g.bars * st, name + " " + l + " length"));
  if (name !== "8th Note Rock") assert.deepEqual(g.warnings, [], name + " reads clean: " + g.warnings);
  const again = G.parse(G.stringify(g));
  assert.deepEqual(again.lanes, g.lanes, name + " round trip");
  ["n", "d", "div", "bars", "tempo", "swing", "title"].forEach(k => assert.equal(again[k], g[k], name + " " + k));
  assert.equal(G.stringify(again), G.stringify(g));
  G.toEvents(g).forEach(bar => { bar.forEach(e => { assert(e.pos >= 0 && e.pos < 4, name + " inside the bar"); assert(e.vel > 0 && e.vel <= 1); });
    for (let k = 1; k < bar.length; k++) assert(bar[k].pos >= bar[k - 1].pos, name + " in time order"); });
});
// what the reading gave
let g = G.parse(MENU["8th Note Rock"]);
assert.equal(lane(g, "K"), "o---o---", "a short lane is padded with rests"); assert.equal(g.warnings.length, 1);
assert.equal(G.stringify(g), "?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|");
g = G.parse(MENU["Bossa Nova"]); assert.equal(g.bars, 2); assert.equal(g.title, "Bossa Nova"); assert.equal(g.tempo, 140);
assert.equal(G.stringify(g), "?TimeSig=4/4&Div=8&Title=Bossa%20Nova&Tempo=140&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|x-x--x-x|-x--x-x-|&K=|o-xoo-xo|o-xoo-xo|");
let ev = G.toEvents(g);
assert.deepEqual(at(ev[0], "rim"), [0, 1, 2.5, 3.5]); assert.deepEqual(at(ev[1], "rim"), [0.5, 2, 3]);
assert.deepEqual(at(ev[0], "kick"), [0, 1.5, 2, 3.5]); assert.deepEqual(at(ev[0], "hatFoot"), [1, 3]);
assert(ev[0].every(e => !e.straight), "an eighth-note grid is left for the player to swing");
g = G.parse(MENU["Purdie Shuffle"]); assert.equal(g.bars, 1, "measures in lower case"); assert.equal(g.title, "Purdie Shuffle");
ev = G.toEvents(g)[0];
assert.deepEqual(at(ev, "kick").map(x => Math.round(x * 3)), [0, 5, 11]);
assert(ev.every(e => e.straight), "triplets are straight");
assert.deepEqual(ev.filter(e => e.art === "ghost").map(e => Math.round(e.pos * 3)), [1, 4, 7, 10]);
assert.deepEqual(ev.filter(e => e.art === "accent" && e.piece === "snare").map(e => e.pos), [2]);
g = G.parse(MENU["Jazz Shuffle"]); ev = G.toEvents(g)[0];
assert.deepEqual(at(ev, "kick"), [0, 1, 2, 3], "X is the kick..."); assert.deepEqual(at(ev, "hatFoot"), [1, 3], "...and the foot");
assert.deepEqual(at(ev, "ride").map(x => Math.round(x * 3)), [0, 3, 5, 6, 9, 11]);
g = G.parse(MENU["Half Time Shuffle in 16th notes"]); assert.equal(G.steps(g), 24); assert.equal(G.perBeat(g), 6);
assert.deepEqual(G.toEvents(g)[0].filter(e => e.art === "accent").map(e => e.pos), [1, 3]);
g = G.parse(MENU["Songo"]); assert.equal(lane(g, "H"), "x---x---x---x---", "an empty parameter (&&) is passed over");

// ---- every letter of every lane goes through
const all = "?TimeSig=4/4&Div=16&Author=A%20B&Comments=c%26d&Tempo=100&Swing=20&Measures=1&MetronomeFreq=8&H=|xXo+rbcsmnN-----|&S=|oOgxfdb---------|&K=|oxX-------------|" +
  "&T1=|o---------------|&T2=|-o--------------|&T3=|--o-------------|&T4=|---o------------|&Stickings=|RLBc------------|&Cg=|HTSOMB----------|&Tb=|OMB-------------|";
g = G.parse(all); assert.deepEqual(g.warnings, []); assert.equal(G.stringify(g), all);
assert.equal(g.author, "A B"); assert.equal(g.comments, "c&d"); assert.equal(g.metronome, 8); assert.equal(g.swing, 20);
ev = G.toEvents(g)[0];
assert.deepEqual(ev.filter(e => e.pos < 3 && ["hatClosed", "hatOpen", "ride", "rideBell", "crash", "stacker", "cowbell", "click", "clickHi"].includes(e.piece)).map(e => e.piece),
  ["hatClosed", "hatClosed", "hatOpen", "hatClosed", "ride", "rideBell", "crash", "stacker", "cowbell", "click", "clickHi"]);
assert.deepEqual(ev.filter(e => (e.piece === "snare" || e.piece === "rim") && !e.grace).map(e => e.art || e.piece), ["snare", "accent", "ghost", "rim", "flam", "drag", "buzz"]);
assert.deepEqual(["tomHi", "tomMid", "tom3", "tomLo"].map(p => at(ev, p)[0]), [0, 0.25, 0.5, 0.75]);
const sn = l => G.CELLS.S[l].vel; assert(sn("g") < sn("o") && sn("o") < sn("O"), "ghost under normal under accent");
assert(G.CELLS.H.x.vel < G.CELLS.H.X.vel);
assert.deepEqual(G.congaEvents(g)[0].map(e => e.piece), ["congaHeel", "tumbaOpen", "congaToe", "tumbaMute", "congaSlap", "tumbaBass", "congaOpen", "congaMute", "congaBass"]);
assert.deepEqual(G.congaEvents(g)[0].filter(e => /^conga/.test(e.piece)).map(e => e.stroke).join(""), "HTSOMB");
Object.keys(BandCongas.STROKES).forEach(s => assert(G.CELLS.Cg[s], "conga stroke " + s));
assert(!ev.some(e => /conga|tumba/.test(e.piece)), "the kit's events have no hand drums");
// only the pieces a kit has
const have = BandSounds.pieces, some = G.toEvents(g, { pieces: ["kick", "snare"] })[0];
assert(some.length < ev.length && some.every(e => ["kick", "snare"].includes(e.piece)), "only the pieces asked for");
const missing = [...new Set(ev.map(e => e.piece).filter(p => !have.includes(p)))].sort();
assert.deepEqual(missing, [], "every piece a written groove can name is in the kit: " + missing);
const src = fs.readFileSync(R + "band/sounds.js", "utf8");
["tom3:45", "cowbell:56", "stacker:52", "click:33", "clickHi:34"].forEach(m => assert(src.includes(m), "kit sample " + m));
// letters read as others, in any case; names in any case; a whole address; nonsense
g = G.parse("https://example.org/groove/?timesig=4/4&div=8&h=|RRBB----|&t1=|x-------|&stickings=|rlb-----|&cg=|htsomb--|#x");
assert.equal(lane(g, "H"), "rrbb----"); assert.equal(lane(g, "T1"), "o-------"); assert.equal(lane(g, "Stickings"), "RLB-----"); assert.equal(lane(g, "Cg"), "HTSOMB--");
assert.deepEqual(g.warnings, []);
g = G.parse("?TimeSig=4/4&Div=8&H=|xqx-----|&S=|--------|&K=|--------|"); assert.equal(lane(g, "H"), "x-x-----"); assert.equal(g.warnings.length, 1);
[undefined, null, "", "?", "rubbish", "?TimeSig=9&Div=7&Measures=99&Tempo=x&H=%E0%A4%A"].forEach(t => { const x = G.parse(t); assert.equal(x.lanes.H.length, x.bars * G.steps(x)); assert(x.bars <= 10); });
assert.equal(G.parse("?Measures=99").bars, 10); assert.equal(G.parse("?Swing=90").swing, 0);
// a lane the address leaves out is GrooveScribe's default, not silence
g = G.parse("?TimeSig=4/4&Div=8");
assert.equal(lane(g, "H"), "xxxxxxxx"); assert.equal(lane(g, "S"), "--O---O-"); assert.equal(lane(g, "K"), "o---o---"); assert.equal(g.tempo, 80);
g = G.parse("?TimeSig=3/4&Div=16&H=|------------|"); assert.equal(lane(g, "S"), "----O-------"); assert.equal(lane(g, "K"), "o-------o---");
// an eighth-note lane on a sixteenth grid, and the other way
g = G.parse("?TimeSig=4/4&Div=16&H=|xxxxxxxx|&S=|----------------|&K=|o-------o-------|"); assert.equal(lane(g, "H"), "x-x-x-x-x-x-x-x-");
g = G.parse("?TimeSig=4/4&Div=8&H=|x-x-x-x-x-x-x-x-|&S=|--------|&K=|--------|"); assert.equal(lane(g, "H"), "xxxxxxxx");

// ---- where a cell is: every division in 4/4, other meters, compound meters
G.DIVS.forEach(div => { const x = G.create({ div }); assert.equal(G.steps(x), div); assert.equal(G.beats(x), 4); assert.equal(G.pos(x, G.steps(x) / 2), 2);
  assert.equal(!!G.toEvents(Object.assign(x, { lanes: Object.assign(x.lanes, { S: x.lanes.S.map(() => "o") }) }))[0][1].straight, div % 3 === 0, "straight only on triplet grids: " + div); });
[["3/4", 16, 12, 3, 4], ["5/4", 8, 10, 5, 2], ["2/4", 12, 6, 2, 3], ["7/8", 16, 14, 7, 2], ["2/2", 8, 8, 2, 4], ["3/16", 16, 3, 3, 1]].forEach(([ts, div, st, b, per]) => {
  const x = G.parse("?TimeSig=" + ts + "&Div=" + div); assert.equal(G.steps(x), st, ts); assert.equal(G.beats(x), b, ts); assert.equal(G.perBeat(x), per, ts); assert(!G.compound(x)); });
[["6/8", 8, 6, 2], ["6/8", 16, 12, 2], ["9/8", 8, 9, 3], ["12/8", 8, 12, 4], ["12/8", 16, 24, 4]].forEach(([ts, div, st, b]) => {
  const x = G.parse("?TimeSig=" + ts + "&Div=" + div + "&H=|" + "x".repeat(st) + "|"); assert.equal(G.steps(x), st, ts); assert.equal(G.beats(x), b, ts); assert(G.compound(x));
  const e = G.toEvents(x)[0].filter(q => q.piece === "hatClosed"); assert.equal(e.length, st); assert(e.every(q => q.straight), ts + " compound is straight");
  assert.equal(e[st / b].pos, 1, ts + ": a beat is a dotted quarter"); assert(Math.abs(e[div / 8].pos - 1 / 3) < 1e-5, ts + ": its second eighth at a third"); });
assert.equal(G.parse("?TimeSig=5/8&Div=12").div, 16, "a grid that does not divide the bar is replaced");
// swing: the off-beat eighth of an eighth grid, the e and the a of a sixteenth grid, nothing else
g = G.parse("?TimeSig=4/4&Div=8&Swing=33&H=|xxxxxxxx|&S=|--------|&K=|--------|");
assert.equal(G.swingRatio(g), 0.665); assert(G.swings(g));
assert.deepEqual(at(G.toEvents(g)[0], "hatClosed"), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], "not swung unless asked");
assert.deepEqual(at(G.toEvents(g, { swing: true })[0], "hatClosed"), [0, 0.665, 1, 1.665, 2, 2.665, 3, 3.665]);
assert(G.toEvents(g, { swing: true })[0].every(e => e.straight), "swung here, so the player must not swing it again");
assert.deepEqual(at(G.toEvents(g, { swing: 0.6 })[0], "hatClosed").slice(0, 3), [0, 0.6, 1]);
assert(!G.toEvents(g, { swing: 0.5 })[0][1].straight);
g = G.parse("?TimeSig=4/4&Div=16&Swing=20&H=|xxxxxxxxxxxxxxxx|&S=|----------------|&K=|----------------|");
assert.deepEqual(at(G.toEvents(g, { swing: true })[0], "hatClosed").slice(0, 5), [0, 0.3, 0.5, 0.8, 1]);
[["4/4", 12], ["4/4", 4], ["4/4", 32], ["6/8", 8]].forEach(([ts, div]) => { const x = G.parse("?TimeSig=" + ts + "&Div=" + div + "&Swing=40"); assert(!G.swings(x));
  assert.deepEqual(G.toEvents(x, { swing: true }), G.toEvents(x).map(b => b.map(e => e)), ts + " " + div + " does not swing"); });

// ---- editing
g = G.create({ div: 8 }); assert.equal(lane(g, "H"), "--------"); assert.equal(G.stringify(g), "?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|--------|&S=|--------|&K=|--------|");
assert(G.set(g, "S", 2, "O")); assert(!G.set(g, "S", 2, "r"), "no ride on the snare lane"); assert(!G.set(g, "S", 99, "o")); assert(G.set(g, "H", 0, "c")); assert(G.set(g, "K", 0, "o"));
assert.equal(lane(g, "S"), "--O-----");
let r = G.resize(g, { div: 16 }); assert.equal(lane(r, "S"), "----O-----------"); assert.equal(lane(r, "H"), "c---------------"); assert.deepEqual(r.warnings, []);
assert.deepEqual(G.toEvents(r), G.toEvents(g), "the same music on a finer grid");
G.set(r, "S", 5, "g"); let back = G.resize(r, { div: 8 }); assert.equal(lane(back, "S"), "--O-----"); assert.equal(back.warnings.length, 1, "the note between the cells is reported");
r = G.resize(g, { div: 12 }); assert.equal(lane(r, "K"), "o-----------"); assert.equal(lane(r, "S"), "---O--------");
r = G.resize(g, { bars: 3 }); assert.equal(r.bars, 3); assert.equal(lane(r, "S"), "--O-----" + "-".repeat(16)); assert.equal(G.resize(r, { bars: 1 }).lanes.S.length, 8);
r = G.resize(g, { n: 3 }); assert.equal(lane(r, "S"), "--O---"); r = G.resize(g, { n: 5 }); assert.equal(lane(r, "S"), "--O-------");
assert.equal(lane(g, "S"), "--O-----", "resize leaves the groove it was given alone");

// ---- the band's own grooves, written down
function ctx(i, extra){ return Object.assign({ index: i, length: 12, beats: 4, tempo: 120, intensity: 0.5, opts: {} }, extra || {}); }
function barsOf(groove, n, opts, extra){ const d = BandDrums.create({ rng: mb(3) }), out = [];
  for (let i = 0; i < n; i++) out.push(d.bar(ctx(i, Object.assign({ opts: Object.assign({ groove, fills: "none" }, opts || {}) }, extra || {})))); return out; }
const NOLANE = ["clap", "tamb", "sticks"];
Object.keys(BandDrums.GROOVES).forEach(id => {
  if (id === "none") return;
  const bars = barsOf(id, 4), x = G.fromEvents(bars, { tempo: 120, title: id });
  assert.equal(x.bars, 4); assert(G.DIVS.includes(x.div), id + " div"); assert.equal(G.parse(G.stringify(x)).title, id);
  // every note the lanes can hold is there, in its place
  const out = G.toEvents(x);
  bars.forEach((bar, b) => bar.forEach(e => { if (NOLANE.includes(e.piece) || !e.piece) return;
    const piece = e.piece === "ride2" ? "ride" : e.piece;
    assert(out[b].some(o => o.piece === piece && Math.abs(o.pos - e.pos) < 1e-3) || x.warnings.some(w => /two pieces/.test(w)), id + " bar " + (b + 1) + ": " + piece + " at " + e.pos); }));
  out.forEach((bar, b) => bar.forEach(o => assert(bars[b].some(e => Math.abs(e.pos - o.pos) < 1e-3), id + ": nothing added")));
});
// rock: four different bars, as drums.js has them
g = G.fromEvents(barsOf("rock", 4), {});
const rockK = lane(g, "K"), st = G.steps(g);
assert.notEqual(rockK.slice(0, st), rockK.slice(st, 2 * st), "rock: the kick changes from bar to bar");
assert(g.lanes.S.some(c => c !== "-") && g.lanes.H.some(c => c !== "-"));
// swing time written as triplets: the skip note on the third triplet, the foot on 2 and 4
const sw = [0, 1].map(i => BandDrums.create({ rng: mb(9) }).bar(ctx(i, { opts: { groove: "ridetime", feel: "swing" } })));
g = G.fromEvents(sw, { swung: true, tempo: 140 });
assert.equal(g.div, 12, "swing eighths are written as triplets"); assert.equal(g.tempo, 140);
assert(/^r--r-rr--r-r$/.test(lane(g, "H").slice(0, 12)), "the ride pattern: " + lane(g, "H"));
assert.equal(lane(g, "K").slice(0, 12), "---x-----x--", "the foot on 2 and 4");
assert.equal(G.fromEvents(sw, {}).div, 8, "and as plain eighths when not told they swing");
// kick with the foot is one letter; two cymbals on a cell keep the louder kind; unknown pieces are named
g = G.fromEvents([[{ pos: 0, piece: "kick", vel: .6 }, { pos: 0, piece: "hatFoot", vel: .4 }, { pos: 0, piece: "hatClosed", vel: .4 }, { pos: 0, piece: "crash", vel: .8 },
  { pos: 1, piece: "snare", vel: .9 }, { pos: 1.5, piece: "snare", vel: .2 }, { pos: 2, piece: "snare", vel: .6 }, { pos: 3, piece: "tamb", vel: .5 }, { pos: 3.5, piece: "hatClosed", vel: .7 }]], {});
assert.equal(lane(g, "K"), "X-------"); assert.equal(lane(g, "H"), "c------X"); assert.equal(lane(g, "S"), "--Ogo---");
assert(g.warnings.some(w => /tamb/.test(w))); assert(g.warnings.some(w => /two pieces/.test(w)));
// sixteenths and triplets in one bar: the finest grid holds both
g = G.fromEvents([[{ pos: 0.25, piece: "snare", vel: .6 }, { pos: 1 + 1 / 3, piece: "snare", vel: .6, straight: true }]], {});
assert.equal(g.div, 48); assert.deepEqual(at(G.toEvents(g)[0], "snare").map(x => Math.round(x * 12)), [3, 16]);
// compound: a 12/8 bar comes back as eighths
const c12 = [BandDrums.create({ rng: mb(2) }).bar(ctx(0, { compound: true, meter: { n: 12, d: 8 }, opts: { fills: "none" } }))];
g = G.fromEvents(c12, { n: 12, d: 8 }); assert.equal(g.div, 8); assert.equal(G.steps(g), 12);
assert.equal(lane(g, "H").replace(/-/g, "").length, 12, "every eighth on the cymbal: " + lane(g, "H"));
// the congas' patterns fit the two hand lanes
Object.keys(BandCongas.PATTERNS).forEach(id => { const cg = BandCongas.create({ rng: mb(4) });
  const bars = [0, 1].map(i => cg.bar({ index: i, length: 12, beats: 4, tempo: 100, phrase: { bar: 0 }, intensity: 0.5, opts: { congas: id }, chords: [] }));
  const x = G.fromEvents(bars, {}), out = G.congaEvents(x);
  bars.forEach((bar, b) => bar.forEach(e => assert(out[b].some(o => o.piece === e.piece && Math.abs(o.pos - e.pos) < 1e-3), "congas " + id + ": " + e.piece + " at " + e.pos)));
  assert.deepEqual(G.toEvents(x), [[], []]); });
assert.equal(lane(G.fromEvents([BandCongas.create({ rng: mb(1) }).bar({ index: 0, length: 12, beats: 4, tempo: 100, phrase: { bar: 0 }, intensity: 0.5, opts: { congas: "tumbao" }, chords: [] })], {}), "Cg"), "HTSTHTOO");

console.log("GROOVE TEXT OK");
console.log("BAND GROOVES AS TEXT OK");

// ---- the drummer plays a written groove (opts.written)
{
  const text = "?TimeSig=4/4&Div=16&Swing=20&Tempo=90&Measures=2&H=|x-x-x-x-x-x-x-x-|c-x-x-x-x-x-x-xx|&S=|----O--g----O---|----O-------O-gf|&K=|o-------o-o-----|o--o----o-------|&T3=|----------------|---------------o|";
  const d = BandDrums.create({ rng: mb(1) }), want = G.toEvents(G.parse(text), { swing: true, tempo: 120 });
  let draws = 0; const counted = BandDrums.create({ rng: () => { draws++; return 0.5; } });
  for (let i = 0; i < 6; i++){
    const b = d.bar(ctx(i, { opts: { written: text, groove: "rock", fills: "busy" }, last: i === 3, fill: i === 2 ? "large" : null }));
    assert.deepEqual(b.map(e => [e.pos, e.piece, e.vel]), want[i % 2].map(e => [e.pos, e.piece, e.vel]), "bar " + i + " is the written bar " + (i % 2));
    assert(b.every(e => e.straight), "nothing left for the player to swing");
    counted.bar(ctx(i, { opts: { written: G.parse(text) } }));
  }
  assert.equal(draws, 0, "a written groove is not varied");
  assert(d.bar(ctx(1, { opts: { written: text } })).some(e => e.art === "flam"), "articulations are passed on");
  assert.deepEqual(d.bar(ctx(0, { stop: true, opts: { written: text } })).length, want[0].length, "no stop time");
  assert.deepEqual(d.ending(ctx(0, { opts: { written: text } })), []); assert.equal(d.fillNow(ctx(0, { opts: { written: text } }), "large", 3), null);
  const noSwing = d.bar(ctx(0, { opts: { written: text, writtenSwing: 0.5 } })); assert.deepEqual(noSwing.filter(e => e.piece === "snare" && !e.grace).map(e => e.pos), [1, 1.75, 3]);
  assert(!d.bar(ctx(1, { opts: { written: text, writtenPieces: BandSounds.pieces.filter(p => p !== "tom3") } })).some(e => e.piece === "tom3"), "only the pieces asked for");
  assert(d.bar(ctx(1, { opts: { written: text } })).some(e => e.grace), "the flam's grace note is played");
  const fl = "?TimeSig=4/4&Div=8&Measures=2&S=|f-------|--------|&K=|--------|--------|&H=|--------|--------|", sp = 60 / 120;
  const b0 = d.bar(ctx(0, { opts: { written: fl } })), b1 = d.bar(ctx(1, { opts: { written: fl } }));
  assert.deepEqual(b0.map(e => e.grace ? "g" : "f").join(""), "f", "nothing before the bar line in bar 1"); assert.equal(b1.length, 1, "bar 2 ends with...");
  assert(b1[0].grace && Math.abs((4 - b1[0].pos) * sp - 0.030) < 1e-4, "...the grace note of bar 1's flam, 30 ms before the next bar line");
  assert(b0.concat(b1).every(e => e.pos >= 0 && e.pos < 4));
  assert(d.bar(ctx(0, { opts: { groove: "rock" } })).length > 0 && d.bar(ctx(0, { opts: { written: "", groove: "rock" } })).length > 0, "without one, the drummer as before");
  const three = d.bar(ctx(0, { beats: 3, opts: { written: text } })); assert(three.every(e => e.pos < 3), "a shorter bar of the form takes what fits");
  console.log("WRITTEN GROOVE PLAYED OK");
}

// ---- which divisions a meter can have; the band's tempo
{
  assert.deepEqual(G.divsFor(4, 4), [4, 8, 16, 32, 12, 24, 48]); assert.deepEqual(G.divsFor(3, 4), [4, 8, 16, 32, 12, 24, 48]);
  assert.deepEqual(G.divsFor(6, 8), [8, 16, 32], "compound: no quarters (a beat is one and a half), no triplets");
  assert.deepEqual(G.divsFor(7, 8), [8, 16, 32]); assert.deepEqual(G.divsFor(2, 2), [4, 8, 16, 32, 12, 24, 48]); assert.deepEqual(G.divsFor(3, 16), [16, 32]);
  for (let n = 1; n <= 12; n++) [2, 4, 8, 16].forEach(d => { const ds = G.divsFor(n, d); assert(ds.length, n + "/" + d + " has a grid");
    ds.forEach(div => { const x = G.create({ n, d, div }); assert.equal(x.div, div); assert.deepEqual(x.warnings, []); assert.equal(G.perBeat(x) % 1, 0); });
    G.DIVS.filter(v => !ds.includes(v)).forEach(div => { const x = G.create({ n, d, div }); assert(ds.includes(x.div)); assert.equal(x.warnings.length, 1); }); });
  assert.equal(G.bpm(G.parse("?TimeSig=4/4&Tempo=96")), 96); assert.equal(G.bpm(G.parse("?TimeSig=6/8&Div=8&Tempo=96")), 64, "quarter = 96 is dotted quarter = 64");
  assert.equal(G.bpm(G.parse("?TimeSig=7/8&Div=8&Tempo=96")), 192); assert.equal(G.bpm(G.parse("?TimeSig=2/2&Div=8&Tempo=96")), 48);
  console.log("GRIDS AND TEMPO OK");
}
// ---- notation
{
  const ABC = require(R + "abcjs-basic.js");
  const body = (t, o) => G.toAbc(G.parse(t), o).split("\n");
  const voiceOf = (lines, v) => lines[lines.indexOf("V:" + v, lines.findIndex(l => /^K:/.test(l))) + 1];
  // every piece where the band's drum staff has it
  Object.keys(G.WRITTEN).forEach(p => { const w = BandNotation.drumWritten(p); if (!w) return;
    assert.equal(G.WRITTEN[p][0], w.letter, p + " on the staff"); assert.equal(/style=x/.test(G.WRITTEN[p][1]) ? "x" : /harmonic/.test(G.WRITTEN[p][1]) ? "harmonic" : "", w.style, p + " head"); });
  ["hatClosed", "hatOpen", "ride", "rideBell", "crash", "snare", "rim", "tomHi", "tomMid", "tomLo", "kick", "hatFoot"].forEach(p => assert(BandNotation.drumWritten(p) && G.WRITTEN[p], p));
  const places = {}; Object.keys(G.WRITTEN).forEach(p => { const k = G.WRITTEN[p].join(""); if (!["hatClosed", "hatOpen", "click", "clickHi"].includes(p)){ assert(!places[k], p + " shares a place with " + places[k]); places[k] = p; } });
  // lengths: a note lasts to the next one in its beat
  let L = body("?TimeSig=4/4&Div=16&H=|----------------|&S=|o--oo-o--o--o---|&K=|o---------------|");
  assert(L.includes("M:4/4") && L.includes("L:1/16") && L.includes("Q:1/4=80"));
  assert.equal(voiceOf(L, "U"), "c3c c2c2 zc3 c4 |]"); assert.equal(voiceOf(L, "D"), "F4 x4 x4 x4 |]");
  L = body("?TimeSig=4/4&Div=8&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|");
  assert.equal(voiceOf(L, "U"), "!style=x!g!style=x!g !accent![!style=x!gc]!style=x!g !style=x!g!style=x!g !accent![!style=x!gc]!style=x!g |]"); assert.equal(voiceOf(L, "D"), "F2 x2 F2 x2 |]");
  L = body("?TimeSig=4/4&Div=4&H=|x-x-|&S=|----|&K=|o-o-|"); assert(L.includes("L:1/4")); assert.equal(voiceOf(L, "U"), "!style=x!g z !style=x!g z |]");
  L = body("?TimeSig=4/4&Div=32&H=|" + "-".repeat(32) + "|&S=|o----o--o-------ooo-----o------o|&K=|" + "-".repeat(32) + "|");
  assert.equal(voiceOf(L, "U"), "c4zc3 c8 ccc6 c6zc |]", "five and seven thirty-seconds are a note and a rest");
  // triplets
  L = body("?TimeSig=4/4&Div=12&H=|r--r-rr--r-r|&S=|------------|&K=|---x-----x--|");
  assert(L.includes("L:1/8")); assert.equal(voiceOf(L, "U"), "!style=x!f2 (3:2:2!style=x!f2!style=x!f !style=x!f2 (3:2:2!style=x!f2!style=x!f |]"); assert.equal(voiceOf(L, "D"), "x2 !style=x!D2 x2 !style=x!D2 |]");
  L = body("?TimeSig=4/4&Div=12&H=|------------|&S=|------------|&K=|o----o-----o|"); assert.equal(voiceOf(L, "D"), "F2 (3:2:2z2F x2 (3:2:2z2F |]", "a rest inside a triplet is a seen one (abcjs cannot draw the other kind there)");
  L = body("?TimeSig=4/4&Div=12&H=|------------|&S=|ooo-oo--oo-o|&K=|------------|"); assert.equal(voiceOf(L, "U"), "(3:2:3ccc (3:2:3zcc (3:2:2z2c (3:2:2c2c |]");
  L = body("?TimeSig=2/4&Div=24&H=|------------|&S=|o-o-o-oooooo|&K=|------------|"); assert(L.includes("L:1/16"));
  assert.equal(voiceOf(L, "U"), "(3:2:3c2c2c2 (3:2:3ccc(3:2:3ccc |]", "a beat of sixteenth triplets that only uses the eighth triplets is written as those");
  L = body("?TimeSig=2/4&Div=48&H=|" + "-".repeat(24) + "|&S=|o---o---o---oooooooooooo|&K=|" + "-".repeat(24) + "|"); assert.equal(voiceOf(L, "U"), "(3:2:3c4c4c4 " + "(3:2:3ccc".repeat(4) + " |]");
  // compound and odd meters
  L = body("?TimeSig=6/8&Div=8&Tempo=120&H=|xxxxxx|&S=|---o--|&K=|o-----|"); assert(L.includes("Q:3/8=80")); assert.equal(voiceOf(L, "D"), "F3 x3 |]");
  L = body("?TimeSig=12/8&Div=16&H=|" + "x-".repeat(12) + "|&S=|" + "-".repeat(24) + "|&K=|o-----------o-----------|"); assert.equal(voiceOf(L, "D"), "F6 x6 F6 x6 |]");
  L = body("?TimeSig=7/8&Div=8&H=|xxxxxxx|&S=|-------|&K=|o---o--|"); assert(L.includes("Q:1/8=160")); assert.equal(voiceOf(L, "D"), "F2 x2 F2 x |]");
  // marks
  L = body("?TimeSig=4/4&Div=8&H=|o+X-----|&S=|---gfdb-|&K=|X-------|");
  assert.equal(voiceOf(L, "U"), '!open!!style=x!g!plus!!style=x!g !accent!!style=x!g"<("">)"c {/c}c{cc}c !///!c2 |]'); assert.equal(voiceOf(L, "D"), "[F!style=x!D]2 x2 x2 x2 |]");
  assert(!/"<\(" /.test(G.toAbc(G.parse(MENU["Train Beat"]))), "no space inside a ghost note's parentheses (it would break the beam)");
  // lines, words, the conga staff, an empty bar
  L = body("?TimeSig=4/4&Div=8&Measures=3&Title=Three&H=|x-x-x-x-|x-x-x-x-|--------|&S=|--------|--o-----|--------|&K=|o-------|o-------|--------|&Stickings=|R-L-R-L-|R-B-----|--------|", { barsPerLine: 2 });
  assert(L.includes("T:Three")); assert.equal(L.filter(l => l === "V:U").length, 2, "two lines of staff");
  assert.equal(L.filter(l => /^w:/.test(l))[0], "w: R L R L R R/L * *"); assert.equal(L[L.lastIndexOf("V:U") + 1], "z8 |]", "an empty bar is one rest");
  assert(!body("?TimeSig=4/4&Div=8&Title=Three", { title: false }).some(l => /^T:/.test(l))); assert(!body("?Div=8", { names: false }).some(l => /name=/.test(l)));
  L = body("?TimeSig=4/4&Div=8&H=|x-x-x-x-|&S=|--------|&K=|--------|", { count: (b, i) => ["1", "+", "2", "+", "3", "+", "4", "+"][i] }); assert.equal(L.filter(l => /^w:/.test(l))[0], "w: 1 2 3 4");
  L = body("?TimeSig=4/4&Div=8&H=|--------|&S=|--------|&K=|--------|&Cg=|HTSTHTOO|&Tb=|--------|");
  assert(L.includes("%%score (U D) C")); assert.equal(voiceOf(L, "C"), "!style=triangle!e!style=triangle!e !style=x!e!style=triangle!e !style=triangle!e!style=triangle!e ee |]"); assert(L.includes("w: H T S T H T O O"));
  ["conga", "tumba"].forEach((d, k) => ["Open", "Mute", "Bass"].forEach(s => { const w = BandNotation.congaWritten(d + s); assert.equal(w.letter, k ? "A" : "e"); }));
  // abcjs reads every one of them, in every division and meter, with bars of the right length
  let drawn = 0;
  const texts = Object.values(MENU).concat([all]);
  [[4, 4], [3, 4], [5, 4], [2, 4], [6, 8], [9, 8], [12, 8], [7, 8], [5, 8], [2, 2]].forEach(([n, d]) => G.divsFor(n, d).forEach(div => {
    const x = G.create({ n, d, div, bars: 2 }), st = G.steps(x), rnd = mb(n * 100 + d * 10 + div);
    ["H", "S", "K", "T1", "T4", "Cg"].forEach(l => { const ks = Object.keys(G.CELLS[l]); for (let i = 0; i < 2 * st; i++) if (rnd() < 0.4) x.lanes[l][i] = ks[Math.floor(rnd() * ks.length)]; });
    texts.push(G.stringify(x)); }));
  texts.forEach(t => { const x = G.parse(t), abc = G.toAbc(x), tune = ABC.parseOnly(abc)[0];
    assert(!tune.warnings, t + "\n" + abc + "\n" + (tune.warnings || []).join("\n"));
    const want = x.n / x.d;
    tune.lines.forEach(line => (line.staff || []).forEach(staff => staff.voices.forEach(v => { let sum = 0, bars = 0, scale = 1, left = 0;
      v.forEach(el => { if (el.el_type === "note"){ if (el.startTriplet){ scale = el.tripletMultiplier; left = el.tripletR || el.startTriplet; } sum += el.duration * (left > 0 ? scale : 1); if (left > 0) left--; }
        else if (el.el_type === "bar"){ assert(Math.abs(sum - want) < 1e-6, "bar of " + sum + " in " + x.n + "/" + x.d + " Div " + x.div + "\n" + abc); sum = 0; bars++; } });
      assert.equal(bars, x.bars); })));
    drawn++; });
  console.log("GROOVE NOTATION OK " + drawn + " grooves");
}
// ---- a click with a written groove; the congas play its hand lanes
{
  const d = BandDrums.create({ rng: mb(1) }), t = "?TimeSig=4/4&Div=8&H=|--------|&S=|--o---o-|&K=|o---o---|&Cg=|HTSTHTOO|&Tb=|------O-|";
  const clicks = (o, extra) => d.bar(ctx(0, Object.assign({ opts: Object.assign({ written: t }, o) }, extra || {}))).filter(e => e.click).map(e => e.pos);
  assert.deepEqual(clicks({}), []); assert.deepEqual(clicks({ writtenClick: 4 }), [0, 1, 2, 3]); assert.deepEqual(clicks({ writtenClick: 8 }), [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]);
  assert.equal(clicks({ writtenClick: 16 }).length, 16);
  const six = "?TimeSig=6/8&Div=8&H=|xxxxxx|&S=|---o--|&K=|o-----|";
  assert.deepEqual(d.bar(ctx(0, { beats: 2, compound: true, opts: { written: six, writtenClick: 8 } })).filter(e => e.click).map(e => Math.round(e.pos * 3)), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(d.bar(ctx(0, { beats: 7, opts: { written: "?TimeSig=7/8&Div=8", writtenClick: 8 } })).filter(e => e.click).map(e => e.pos), [0, 1, 2, 3, 4, 5, 6]);
  const cg = BandCongas.create({ rng: mb(1) }), c0 = cg.bar({ index: 0, beats: 4, opts: { written: t } });
  assert.deepEqual(c0.map(e => e.stroke).join(""), "HTSTHTOOO"); assert(c0.every(e => e.straight && /^(conga|tumba)/.test(e.piece)));
  assert.deepEqual(cg.bar({ index: 0, beats: 4, opts: { written: "?Div=8", congas: "tumbao" } }), [], "a written groove with empty hand lanes: no congas, whatever the pattern");
  assert.deepEqual(cg.ending({ opts: { written: t } }), []); assert.equal(cg.bar({ index: 0, beats: 4, tempo: 100, phrase: { bar: 0 }, opts: { congas: "tumbao" }, chords: [] }).length, 8);
  console.log("CLICK AND CONGAS OK");
}

// ---- flams, drags and buzzes are more than one hit
{
  const t = "?TimeSig=4/4&Div=8&Tempo=100&H=|--------|&S=|f-d-b---|&K=|--------|", x = G.parse(t), spb = 60 / 100;
  const ev = G.toEvents(x)[0], sn = ev.filter(e => e.piece === "snare"), main = sn.filter(e => !e.grace), gr = sn.filter(e => e.grace);
  assert.deepEqual(main.map(e => [e.pos, e.art]), [[0, "flam"], [1, "drag"], [2, "buzz"]]);
  const near = (p, s) => gr.filter(e => e.pos > p - 0.25 && e.pos < p + 0.5 && Math.sign(e.pos - p) === s);
  assert.equal(near(0, -1).length, 1, "a flam: one grace note"); assert(Math.abs(near(0, -1)[0].pos * spb + 0.030) < 1e-4, "30 ms before"); assert(near(0, -1)[0].pos < 0, "before the bar line");
  assert.equal(near(1, -1).length, 2, "a drag: two"); assert.deepEqual(near(1, -1).map(e => Math.round((e.pos - 1) * spb * 1000)), [-70, -35]);
  const bz = near(2, 1); assert(bz.length >= 8 && bz.length <= 11, "a buzz: bounces for most of its eighth: " + bz.length);
  assert(bz.every((e, i) => i === 0 || e.vel < bz[i - 1].vel), "dying away"); assert(bz[bz.length - 1].pos - 2 < 0.5 * 0.9 + 1e-6, "inside its cell");
  assert(gr.every(e => e.vel < main[0].vel && e.straight), "quieter than the note, and straight");
  for (let i = 1; i < ev.length; i++) assert(ev[i].pos >= ev[i - 1].pos, "in time order");
  assert(G.toEvents(G.parse(t), { tempo: 50 })[0].filter(e => e.grace)[0].pos > -0.03, "the same 30 ms is less of a slower beat");
  assert(G.toEvents(G.parse("?TimeSig=4/4&Div=16&S=|b---------------|"))[0].filter(e => e.grace).length < bz.length, "a sixteenth buzzes for less time");
  assert.deepEqual(G.toEvents(x, { ornaments: false })[0].filter(e => e.grace), []);
  assert.deepEqual(G.fromEvents(G.toEvents(x)).lanes.S, x.lanes.S, "written back as the three marks, the extra hits left out");
  assert.deepEqual(G.fromEvents(G.toEvents(x)).warnings, []);
  // the band's staff writes the three main notes only
  const rec = { beats: 4, meter: { n: 4, d: 4 }, compound: false, swing: 0.5, chords: [], parts: { drums: G.toEvents(x)[0] } };
  const up = BandNotation.toAbc([rec], { show: { comp: false, bass: false, drums: true } }).split("\n").filter(l => /\|\]$/.test(l))[0];
  assert.equal((up.match(/c/g) || []).length, 3, "three snare notes on the staff: " + up);
  console.log("ORNAMENTS OK");
}
