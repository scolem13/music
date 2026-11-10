// theory/enharmonic-modulation.qmd (apps/shared/enharmonic-modulation.js, window.EnharMod) in Node. Every claim is checked against
// semitone and letter arithmetic written out here, not against the module's own helpers:
//  - the fully diminished sevenths: three of them; each in four spellings that are vii°7 of four minor keys (the chord a minor third
//    stack of letter thirds, the leading tone a half step below the tonic), the four tonics a minor third apart; each note falling a half
//    step is the root of a dominant seventh whose other three notes are the chord's, and its tonic a fifth below;
//  - V7 and Ger+65: the same four pitch classes, only the top note spelled differently, the two keys a half step apart; the enharmonic
//    German respells b3 as #2 (same sound, one letter up);
//  - the drawn ABC, read back by AbcEvents: every bar of both voices is 4 quarters, each bar sounds exactly its chord's pitch classes,
//    the lowest note the bass.
//   node tests/enharmonic/enharmonic.test.js        NEG=1: a wrong expectation, which must fail
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = {}; win.window = undefined; vm.createContext(win); win.globalThis = win;
vm.runInContext(fs.readFileSync(R + "apps/shared/enharmonic-modulation.js", "utf8"), win);
const E = win.EnharMod;
let fails = 0, total = 0;
function ok(c, ...a) { total++; if (!c) { fails++; if (fails <= 15 || process.env.ALL) console.log("FAIL", ...a); } }
const NAT = [0, 2, 4, 5, 7, 9, 11], pc = n => (((NAT[n.l] + n.a) % 12) + 12) % 12, letterUp = (a, b) => ((b.l - a.l) % 7 + 7) % 7, semisUp = (a, b) => ((pc(b) - pc(a)) % 12 + 12) % 12;
const SEMI = process.env.NEG ? 2 : 1;   // NEG: the V7's key is claimed two semitones from the German's, which is wrong

// ---- the diminished sevenths
const seen = new Set();
for (let set = 0; set < 3; set++) {
  const ks = E.dim7Keys(set); ok(ks.length === 4, "four keys", set);
  const chordPcs = new Set(ks[0].chord.map(pc)); seen.add([...chordPcs].sort((a, b) => a - b).join());
  ks.forEach((k, i) => {
    const c = k.chord, t = k.tonic, tag = "dim7 set " + set + " key " + i;
    ok(c.length === 4 && [0, 1, 2, 3].every(j => j === 0 || (letterUp(c[j - 1], c[j]) === 2 && semisUp(c[j - 1], c[j]) === 3)), tag, "a stack of minor thirds on letter thirds", c.map(E.nm).join(" "));
    ok(letterUp(c[0], t) === 1 && semisUp(c[0], t) === 1, tag, "the leading tone is a half step below the tonic");
    ok(c.every(n => chordPcs.has(pc(n))) && new Set(c.map(pc)).size === 4, tag, "the same four pitch classes");
    ok(semisUp(ks[0].tonic, t) === (3 * i) % 12, tag, "tonics a minor third apart");
    if (i) ok(c.map(n => n.l + "," + n.a).join() !== ks[0].chord.map(n => n.l + "," + n.a).join(), tag, "a different spelling");
  });
  const falls = E.dim7Falls(ks[0].chord);
  ok(falls.length === 4, "four falls", set);
  falls.forEach((f, i) => {
    const tag = "dim7 fall " + set + "/" + i, r = f.root, c = f.chord;
    ok(semisUp(r, f.fall) === 1, tag, "the fallen note is a half step above the root");
    ok([[2, 4], [4, 7], [6, 10]].every(([ls, sm], j) => letterUp(c[0], c[j + 1]) === ls && semisUp(c[0], c[j + 1]) === sm), tag, "a dominant seventh", c.map(E.nm).join(" "));
    const mine = new Set(ks[0].chord.map(pc)); mine.delete(pc(f.fall));
    ok([...mine].every(p => c.some(n => pc(n) === p)), tag, "the other three notes are the dominant seventh's");
    ok(letterUp(f.tonic, r) === 4 && semisUp(f.tonic, r) === 7, tag, "the tonic is a fifth below the root");
  });
  ok(new Set(falls.map(f => pc(f.tonic))).size === 4, "four different tonics", set);
}
ok(seen.size === 3, "three different diminished sevenths", [...seen].join(" | "));
// the usual one: B D F Ab, resolved in c minor
{ const c = E.dim7Keys(0)[0]; ok(c.chord.map(E.nm).join(" ") === "B D F A♭" && E.nm(c.tonic) === "C", "B D F Ab in c minor"); }

// ---- V7 and Ger+65
for (let p = 0; p < 12; p++) {
  const t = E.tonicFor(p, true), g = E.gerPair(t), tag = "ger " + E.nm(t);
  if (Math.abs(t.a) > 1) continue;
  ok(g.ger.length === 4 && g.v7.length === 4, tag);
  ok(g.ger.map(pc).sort((a, b) => a - b).join() === g.v7.map(pc).sort((a, b) => a - b).join(), tag, "the same sound", g.ger.map(E.nm).join(" "), g.v7.map(E.nm).join(" "));
  ok(g.ger[0].l === g.v7[0].l && g.ger[0].a === g.v7[0].a && g.ger[1].l === g.v7[1].l && g.ger[2].l === g.v7[2].l, tag, "only the top note is respelled");
  ok(g.ger[3].l !== g.v7[3].l, tag, "the top note has a different letter");
  ok(semisUp(g.ger[0], t) === 4 && letterUp(g.ger[0], t) === 2, tag, "b6 is the bass: the tonic is a major third above");
  ok(semisUp(g.ger[0], g.ger[3]) === 10 && letterUp(g.ger[0], g.ger[3]) === 5, tag, "an augmented sixth above the bass");
  ok(semisUp(t, g.v7Key) === SEMI, tag, "the V7's key is a half step above", E.nm(t), E.nm(g.v7Key));
  ok(semisUp(g.v7[0], g.v7Key) === 5 && letterUp(g.v7[0], g.v7Key) === 3, tag, "the V7 root is the dominant of that key");
  const eg = E.engerman(t);
  ok(eg.map(pc).join() === g.ger.map(pc).join() && eg[2].l === (g.ger[2].l + 6) % 7 && eg[2].a >= 1 && letterUp(t, eg[2]) === 1, tag, "the enharmonic German: #2 for b3");
}

// ---- the drawn ABC
function checkAbc(bars, tag) {
  const r = E.makeAbc(bars), chordsPcs = bars.map(b => [...new Set(b.chord.map(pc))].sort((a, b) => a - b).join());
  ["1", "2"].forEach(v => {
    const e = Ev.fromAbc(r.abc, { voice: v }), len = {}; e.written.forEach(w => { len[w.bar] = (len[w.bar] || 0) + (w.t_off - w.t_on); });
    ok(Object.keys(len).length === bars.length && Object.values(len).every(x => Math.abs(x - 4) < 1e-9), tag, "bar lengths, voice", v, JSON.stringify(len));
  });
  const e1 = Ev.fromAbc(r.abc, { voice: "1" }), e2 = Ev.fromAbc(r.abc, { voice: "2" });
  bars.forEach((b, i) => {
    const heard = [];
    [e1, e2].forEach(e => e.sounding.forEach(x => { if (Math.abs(x.t_on - 4 * i) < 1e-9) (x.notes || x.pitches.map(p => p.midi)).forEach(m => heard.push(m)); }));
    const hp = [...new Set(heard.map(m => ((m % 12) + 12) % 12))].sort((a, c) => a - c).join();
    ok(hp === chordsPcs[i], tag, "bar", i + 1, "sounds", hp, "wants", chordsPcs[i]);
    ok(Math.min(...heard) % 12 === pc(b.bass), tag, "bar", i + 1, "lowest note is the bass");
  });
  ok(r.voiced.every(v => v.upper.length === 3 && v.upper.every(n => E.midi(n) >= 60) && E.midi(v.bass) < 60), tag, "bass below, three voices above");
}
for (let set = 0; set < 3; set++) {
  const ks = E.dim7Keys(set);
  ks.forEach((k, i) => checkAbc(E.demoDimUp(k), "dimUp " + set + "/" + i));
  E.dim7Falls(ks[0].chord).forEach((f, i) => checkAbc(E.demoDimDown(ks[0].chord, f), "dimDown " + set + "/" + i));
}
for (const p of [0, 2, 4, 5, 7, 9, 10]) {
  const t = E.tonicFor(p, true);
  checkAbc(E.demoGerToV7(t).bars, "gerToV7 " + E.nm(t)); checkAbc(E.demoV7ToGer(t).bars, "v7ToGer " + E.nm(t));
  checkAbc(E.demoEnGerman(E.tonicFor(p, false)), "enGerman " + E.nm(t));
}
console.log((fails ? "FAILED " + fails : "ok") + " — " + total + " checks");
process.exit(fails ? 1 : 0);
