// Grooves between the Drumset and the DAW (apps/shared/daw/groove-bridge.js): Drumset -> DAW -> Drumset round trips. NEG=1 must fail.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const R = (require("path").join(__dirname, "../../..") + "/apps/shared/"), NEG = process.env.NEG === "1";
for (const f of ["band/groove.js", "daw/groove-bridge.js"]) vm.runInThisContext(fs.readFileSync(R + f, "utf8"), { filename: f });
const G = BandGroove, X = GrooveBridge, lane = (g, l) => g.lanes[l].join("");
const TEXT = {
  rock16: "?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-o-----|",
  ghosts: "?TimeSig=4/4&Div=16&Tempo=85&Measures=2&H=|xXxxxXxxxXxxxXxx|xxxxxxxxxxxxxxxx|&S=|--g-O--g-g-O-g--|----O-------O---|&K=|o-------o-o-----|o-------o-------|",
  shuffle: "?TimeSig=4/4&Div=12&Tempo=100&Measures=1&H=|r--r-rr--r-r|&S=|g-gO-gg-gO-g|&K=|o--x--o--x--|",
  waltz: "?TimeSig=3/4&Div=8&Tempo=120&Measures=2&H=|xxxxxx|xxxxxx|&S=|--O-O-|--O-O-|&K=|o-----|o-----|",
  six8: "?TimeSig=6/8&Div=8&Tempo=90&Measures=1&H=|xxxxxx|&S=|---O--|&K=|o-----|",
  toms: "?TimeSig=4/4&Div=16&Tempo=100&Measures=1&H=|x---x---x---x---|&S=|--------O-------|&K=|o-------o-------|&T1=|------------o---|&T2=|-------------o--|&T4=|--------------o-|"
};
const same = (a, b, k) => G.LANES.forEach(l => { if (l === "Stickings") return; assert.equal(lane(b, l), lane(a, l), k + " lane " + l); });
Object.keys(TEXT).forEach(k => {
  const g = G.parse(TEXT[k]), d = X.toDaw(g), barQ = g.n * 4 / g.d;
  assert.equal(d.len, g.bars * barQ, k + " length"); assert.equal(d.tempo, g.tempo);
  d.kit.forEach(n => { assert(n.t >= 0 && n.t < d.len, k + " inside"); assert(n.v > 0 && n.v <= 1); });
  const r = X.fromDaw(d.kit, { ts: d.ts, tempo: d.tempo, len: d.len, title: g.title });
  if (NEG && k === "ghosts") r.groove.lanes.S[2] = "o";
  // the lanes come back as written (div may differ: compare cell by cell on the common grid)
  ["H", "S", "K", "T1", "T2", "T4"].forEach(l => {
    const a = g.lanes[l], b = r.groove.lanes[l], f = r.groove.div / g.div;
    for (let i = 0; i < a.length; i++) { const j = i * f; const want = a[i] === "x" && l === "K" ? "-" : a[i];
      if (l === "K" && a[i] === "x") continue;                      // the hat foot goes to the DAW's closed hat (said)
      assert.equal(b[j], want, k + " " + l + " cell " + i + " (div " + r.groove.div + ")"); }
  });
  assert.equal(r.groove.bars, g.bars, k + " bars"); assert.equal(r.groove.n + "/" + r.groove.d, g.n + "/" + g.d);
});
// dropped and mapped pieces are said
let g = G.parse("?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|b-m-s-x-|&S=|--f---O-|&K=|o-x-----|");
let d = X.toDaw(g); assert(d.said.some(s => /ride bell to ride/.test(s)), d.said.join()); assert(d.said.some(s => /cowbell.*stacker|stacker.*cowbell/.test(s)));
assert(d.said.some(s => /flam/.test(s))); assert.equal(d.kit.filter(n => n.m === "snare").length, 2, "a flam is one hit");
assert(d.kit.some(n => n.m === "hatClosed" && n.t === 1) , "hat foot to closed hat");
// conga lane goes to its own list
g = G.parse("?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|x-x-x-x-|&Cg=|--TS--OM|&Bo=|H-------|");
d = X.toDaw(g); assert.deepEqual(d.congas.map(n => n.m), ["congaToe", "congaSlap", "congaOpen", "congaMute"]); assert(d.said.some(s => /bongoHi/.test(s)));
const back = X.fromDaw(d.congas, { ts: [4, 4], tempo: 80, len: 4 }); assert.equal(lane(back.groove, "Cg"), "----T-S-----O-M-");
// swing is written into positions; a triplet grid comes back
g = G.parse("?TimeSig=4/4&Div=8&Swing=33&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|");
d = X.toDaw(g);
const rs = X.fromDaw(d.kit, { ts: [4, 4], tempo: 100, len: 4 }); assert.equal(rs.groove.div, 12, "swung eighths are triplets"); assert(rs.said.some(s => /triplet/.test(s)));
// accents and ghosts by velocity, at most 10 bars
const notes = [{ t: 0, d: 0.25, m: "snare", v: 0.95 }, { t: 1, d: 0.25, m: "snare", v: 0.3 }, { t: 2, d: 0.25, m: "snare", v: 0.6 }, { t: 3, d: 0.25, m: "hatClosed", v: 0.92 }, { t: 41, d: 0.25, m: "kick", v: 0.7 }];
const lim = X.fromDaw(notes, { ts: [4, 4], tempo: 90, len: 48 });
assert.equal(lim.groove.bars, 10); assert.equal(lane(lim.groove, "S").slice(0, 16), "O---g---o-------"); assert.equal(lane(lim.groove, "H").slice(12, 13), "X");
assert(lim.said.some(s => /10 bars/.test(s))); assert(lim.query.startsWith("?TimeSig=4/4"));
// off-grid notes are moved and said
const off = X.fromDaw([{ t: 0.1, d: 0.25, m: "kick", v: 0.7 }], { ts: [4, 4], tempo: 90, len: 4 }); assert(off.said.some(s => /between the cells/.test(s)));
console.log("GROOVE BRIDGE OK");
