// Event model checks (apps/shared/abc-events.js). node tests/abc/events.test.js
const path = require("path"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
const E = require(R + "apps/shared/abc-events.js");
let n = 0;
const t = (name, f) => { f(); n++; };

t("plain notes, default L:1/8", () => {
  const r = E.fromAbc("X:1\nM:4/4\nK:C\nC D E F | G4");
  assert.deepStrictEqual(r.written.map(e => [e.t_on, e.t_off]), [[0,.5],[.5,1],[1,1.5],[1.5,2],[2,4]]);
  assert.strictEqual(r.written[4].bar, 1);
  assert.deepStrictEqual(r.written.map(e => e.pitches[0].midi), [60,62,64,65,67]);
  assert.ok(r.written.every(e => e.confidence === 1 && e.source === "abc" && e.pitches[0].p === 1));
  assert.strictEqual(r.sounding.length, 5);
  assert.strictEqual(r.barQuarters, 4);
});
t("key signature and accidentals to the barline", () => {
  const r = E.fromAbc("X:1\nK:D\nF ^G G =F | F");
  assert.deepStrictEqual(r.written.map(e => e.pitches[0].midi), [66,68,68,65,66]);
});
t("ties merge in sounding but not in written", () => {
  const r = E.fromAbc("X:1\nL:1/4\nM:4/4\nK:C\nC2- C | D- D E-F");
  assert.strictEqual(r.written.length, 6);
  assert.deepStrictEqual(r.sounding.map(e => [e.pitches[0].midi, e.t_on, e.t_off, e.from.length]),
                         [[60,0,3,2],[62,3,5,2],[64,5,6,1],[65,6,7,1]]);
  assert.deepStrictEqual(r.sounding[0].from, ["w0", "w1"]);
  assert.strictEqual(r.written[0].tieNext, true);
});
t("a tie to a different pitch, or over a rest, is dropped", () => {
  const r = E.fromAbc("X:1\nL:1/4\nK:C\nC-D z- E-z E");
  assert.strictEqual(r.sounding.length, 4);
});
t("rests are written events, not sounding", () => {
  const r = E.fromAbc("X:1\nL:1/4\nK:C\nC z D x");
  assert.deepStrictEqual(r.written.map(e => e.kind), ["note", "rest", "note", "rest"]);
  assert.strictEqual(r.written[3].visible, false);
  assert.strictEqual(r.sounding.length, 2);
  assert.strictEqual(r.quarters, 4);
});
t("broken rhythm", () => {
  const r = E.fromAbc("X:1\nL:1/8\nK:C\nA>B c<d");
  assert.deepStrictEqual(r.written.map(e => [e.t_on, e.t_off]), [[0,.75],[.75,1],[1,1.25],[1.25,2]]);
});
t("voice choice and the V1 default", () => {
  const abc = "X:1\nL:1/4\nK:C\n[V: V1] C D\n[V: V2] E F\nw: la la";
  assert.deepStrictEqual(E.fromAbc(abc).written.map(e => e.pitches[0].midi), [60, 62]);
  assert.deepStrictEqual(E.fromAbc(abc, { voice: "V2" }).written.map(e => e.pitches[0].midi), [64, 65]);
});
t("whole-bar rest Z", () => {
  const r = E.fromAbc("X:1\nM:3/4\nL:1/4\nK:C\nZ | C");
  assert.deepStrictEqual([r.written[0].t_off, r.written[1].t_on], [3, 3]);
});
t("compound meter, L:1/16", () => {
  const r = E.fromAbc("X:1\nM:6/8\nL:1/16\nK:C\nC2 D2");
  assert.deepStrictEqual(r.written.map(e => e.t_off), [.5, 1]);
  assert.strictEqual(r.barQuarters, 3);
});
t("soundingFrom works on events from other sources", () => {
  const w = [E.makeEvent({ id: "a", t_on: 0, t_off: 1, pitches: [{ midi: 60 }, { midi: 72, p: .2 }], source: "midi", confidence: .8, tieNext: true }),
             E.makeEvent({ id: "b", t_on: 1, t_off: 2, pitches: [{ midi: 60 }, { midi: 72, p: .2 }], source: "midi", tieNext: false })];
  const s = E.soundingFrom(w);
  assert.strictEqual(s.length, 1); assert.strictEqual(s[0].t_off, 2); assert.strictEqual(s[0].source, "midi");
  assert.strictEqual(s[0].confidence, .8); assert.strictEqual(s[0].pitches[0].p, 1);
});
t("every tune/pattern in the repo reads, in order, with matching note counts", () => {
  const vm = require("vm"), fs = require("fs");
  const Tune = require(R + "apps/tune-assessment/abc-tune.js");
  const P = require(R + "apps/assessment/abc-pitch.js");
  const sets = [["apps/patterns/pattern-set.js", "patternObject"], ["apps/tunes/tunes-object.js", "tunesObject"]];
  let tunes = 0;
  for (const [f, name] of sets) {
    const obj = vm.runInNewContext(fs.readFileSync(R + f, "utf8") + "\n;" + name, { window: undefined });
    for (const text of Object.values(obj)) for (const abc of text.split(/\n(?=X:)/)) {
      const r = E.fromAbc(abc);
      for (let k = 1; k < r.written.length; k++) assert.ok(r.written[k].t_on >= r.written[k-1].t_on - 1e-9, "time runs forward");
      if (f.includes("pattern-set")) assert.deepStrictEqual(r.written.filter(e => e.kind === "note").map(e => e.pitches[0].midi), P.melodyMidi(abc));
      tunes++;
    }
  }
  assert.ok(tunes > 100);
});
console.log("EVENTS OK (" + n + " tests)");
