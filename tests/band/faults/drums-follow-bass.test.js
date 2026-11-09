// Known fault: in a quiet first chorus the walking bass drops into two but the drums still feathered the kick on all four beats.
// The drummer now reads the bass's own bar (ctx.bassBar). `node tests/band/faults/drums-follow-bass.test.js`   NEG=1 must fail.
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../../apps/shared/band/drums.js"), "utf8"));
const root = path.join(__dirname, "../../..");
function kicks(bassFeel, bassBar, seed){
  const d = BandDrums.create({ rng: (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })() });
  const ev = d.bar({ bar: 1, index: 1, length: 12, chorus: 0, beats: 4, tempo: 140, last: false, opts: { bassFeel }, bassBar });
  return ev.filter(e => e.piece === "kick" && e.vel < 0.3).map(e => e.pos);
}
const two = [{ pos: 0, midi: 40 }, { pos: 2, midi: 47 }], walk = [0, 1, 2, 3].map(pos => ({ pos, midi: 40 + pos }));
let fail = 0; const ok = (c, m) => { if (!c){ fail++; console.log("FAIL", m); } };
for (let seed = 1; seed <= 30; seed++){
  const a = kicks(undefined, two, seed), b = kicks(undefined, walk, seed), c = kicks("walk", two, seed), d = kicks("two", walk, seed), e = kicks("two", undefined, seed);
  ok(JSON.stringify(a) === "[0,2]", "bass in two, feel unset: kick on 1 and 3 only, got " + JSON.stringify(a));
  ok(a.length === 2 && c.length === 2, "walk setting but the bass is in two: drums in two too");
  ok(b.length === 4 && d.length === 4, "bass walks although set to two: kick on all four");
  ok(e.length === 2, "no bass bar given: the setting decides");
}
const set = kicks("roots", two, 3); ok(set.length === 4, "a set bass line keeps the old rule (feathered on all four), got " + set.length);
if (process.env.NEG) ok(false, "NEG: deliberate");
console.log(fail ? "FAULTS DRUMS-FOLLOW-BASS FAILED" : "FAULTS DRUMS-FOLLOW-BASS OK"); process.exit(fail ? 1 : 0);
