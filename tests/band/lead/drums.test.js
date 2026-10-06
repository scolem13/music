const fs = require("fs"), vm = require("vm"), assert = require("assert");
vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/drums.js", "utf8"));
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PIECES = new Set("kick snare rim hatClosed hatFoot hatOpen ride rideBell crash tomHi tomMid tomLo sticks".split(" "));
const stats = { bars:0, fills:{}, crashes:0, comps:0, pieces:{} };
for (const tempo of [80, 120, 180, 260]) for (const feel of ["walk", "two"]) for (let seed = 1; seed <= 20; seed++){
  const d = BandDrums.create({ rng: mulberry32(seed * 7919 + tempo) });
  let prevHadFill = false;
  for (let chorus = 0; chorus < 10; chorus++) for (let index = 0; index < 12; index++){
    const last = chorus === 9 && index === 11;
    const ev = d.bar({ bar: chorus*12+index, index, length:12, chorus, beats:4, tempo, last, opts:{ bassFeel: feel } });
    stats.bars++;
    let prev = -1;
    for (const e of ev){
      assert(e.pos >= 0 && e.pos < 4, "pos in bar: " + e.pos);
      assert(PIECES.has(e.piece), "piece " + e.piece);
      assert(e.vel > 0 && e.vel <= 1, "vel");
      assert(e.pos >= prev, "sorted"); prev = e.pos;
      const onEighth = Math.abs(e.pos*2 - Math.round(e.pos*2)) < 1e-6;
      assert(onEighth || e.straight === true, "off-grid events must be straight: " + e.pos);
      if (e.straight) assert(tempo <= 220, "no triplet fills at fast tempos");
      stats.pieces[e.piece] = (stats.pieces[e.piece] || 0) + 1;
    }
    // hat foot on beats 2 and 4, always
    assert.deepStrictEqual(ev.filter(e => e.piece === "hatFoot").map(e => e.pos), [1, 3]);
    const fillHits = ev.filter(e => /^tom/.test(e.piece) || (e.piece === "snare" && e.vel >= 0.42));
    const toms = ev.some(e => /^tom/.test(e.piece));
    const rides = ev.filter(e => e.piece === "ride");
    const hasFill = rides.filter(e => Number.isInteger(e.pos)).length + (ev.some(e => e.piece === "crash" && e.pos === 0) ? 1 : 0) < 4;
    if (index === 11) assert(hasFill, "every chorus ends with a fill");
    if (hasFill){ const n = 4 - (rides.filter(e => Number.isInteger(e.pos)).length + (ev.some(e => e.piece === "crash") ? 1 : 0)); stats.fills[n] = (stats.fills[n] || 0) + 1;
      const start = 4 - n; assert(rides.every(e => e.pos < start), "no ride inside the fill"); assert(fillHits.length >= 1); }
    else assert(!toms, "toms only in fills");
    // the bar after a fill lands with a kick accent on 1 (and usually a crash)
    const k0 = ev.find(e => e.piece === "kick" && e.pos === 0);
    if (prevHadFill){ assert(k0 && k0.vel >= 0.55, "landing kick after a fill"); if (ev.some(e => e.piece === "crash")) stats.crashes++; }
    else assert(!ev.some(e => e.piece === "crash"), "no crash without a preceding fill");
    if (feel === "two") assert(!ev.some(e => e.piece === "kick" && e.pos % 2 === 1 && e.vel < 0.3), "two-feel feathers 1 and 3 only");
    prevHadFill = hasFill;
  }
  const end = d.ending({}); assert(end.some(e => e.piece === "crash") && end.some(e => e.piece === "kick"));
}
// determinism
const a = BandDrums.create({ rng: mulberry32(5) }), b = BandDrums.create({ rng: mulberry32(5) });
for (let i = 0; i < 48; i++){ const c = { bar:i, index:i%12, length:12, chorus:Math.floor(i/12), beats:4, tempo:140, last:false, opts:{} }; assert.deepStrictEqual(a.bar(c), b.bar(c)); }
// 3/4 does not break
const w = BandDrums.create({ rng: mulberry32(9) });
for (let i = 0; i < 32; i++){ const ev = w.bar({ bar:i, index:i%16, length:16, chorus:0, beats:3, tempo:140, last:false, opts:{} }); assert(ev.every(e => e.pos >= 0 && e.pos < 3)); }
console.log("drums OK", JSON.stringify(stats));
