// The trombone position table (apps/shared/trombone/trombone-chart.js). Run: node tests/trombone/trombone-chart.test.js   (NEG=1 must fail)
const assert = require("assert"), path = require("path");
const C = require(path.join(__dirname, "../../apps/shared/trombone/trombone-chart.js"));
const NEG = !!process.env.NEG;
if (NEG) C.FINGERINGS[46][0].pos = 2;   // break one entry: B♭2 in 2nd position
// every note from LOW to HIGH has a usual fingering; nothing outside
for (let m = C.LOW; m <= C.HIGH; m++) {
  const F = C.FINGERINGS[m]; assert(F && F.length, "fingering for " + m); assert(!F[0].alt, "first is the usual one");
  F.forEach(f => {
    assert(f.pos >= 1 && f.pos <= 7, "position range " + m);
    // the position really plays that note: a partial of the position's series (checked, not copied from the chart)
    assert(f.partial >= 2 && f.partial <= 8, "partial " + m + " pos " + f.pos);
    assert(C.lookup(f.pos, f.short).some(x => x.midi === m), "lookup finds " + m);
  });
}
Object.keys(C.FINGERINGS).forEach(m => assert(m >= C.LOW && m <= C.HIGH, "no stray note " + m));
assert.strictEqual(Object.keys(C.FINGERINGS).length, 31);
// the series of 1st position: B♭2 F3 B♭3 D4 F4 B♭4 (partials 2 3 4 5 6 8; the 7th is not on the chart)
assert.deepStrictEqual(C.lookup(1, false).map(x => x.midi), [46, 53, 58, 62, 65, 70]);
assert.deepStrictEqual(C.lookup(1, false).map(x => x.partial), [2, 3, 4, 5, 6, 8]);
assert.deepStrictEqual(C.lookup(7, false).map(x => x.midi), [40, 47], "E2 B2");
assert.deepStrictEqual(C.lookup(2, false).map(x => x.midi), [45, 52, 57, 61, 64, 69]);
assert.deepStrictEqual(C.lookup(6, false).map(x => x.midi), [41, 48, 53, 57], "F2 C3 (F3 and A3 as the second choice)");
assert.deepStrictEqual(C.lookup(2, true).map(x => x.midi), [67], "shortened 2nd: G4");
assert.deepStrictEqual(C.lookup(3, true).map(x => x.midi), [66, 68], "as printed: F♯4 and G♯4 both -3");
assert.deepStrictEqual(C.lookup(4, true).map(x => x.midi), [62]);
// printed alternates
assert.deepStrictEqual(C.FINGERINGS[53].map(f => f.pos), [1, 6]); assert.deepStrictEqual(C.FINGERINGS[57].map(f => f.pos), [2, 6]);
assert.deepStrictEqual(C.FINGERINGS[58].map(f => f.pos), [1, 5]); assert.deepStrictEqual(C.FINGERINGS[62].map(f => f.pos), [1, 4]); assert(C.FINGERINGS[62][1].short && C.FINGERINGS[62][1].alt);
// the book's two F-attachment alternates: C (in the staff) 1st instead of 6th; B natural 2nd instead of 7th
assert.strictEqual(C.TRIGGER[48].pos, 1); assert.strictEqual(C.FINGERINGS[48][0].pos, 6);
assert.strictEqual(C.TRIGGER[47].pos, 2); assert.strictEqual(C.FINGERINGS[47][0].pos, 7);
assert.deepStrictEqual(C.F_SERIES.map(m => C.name(m, "flat")), ["F1", "F2", "C3", "F3", "A3", "C4"]);
// the F-side series with the trigger at "1st": its partial 3 is the usual C3 (so C3 on the trigger sits where F3 is on the B♭ side: a fourth lower)
assert.strictEqual(C.F_SERIES[2], C.FINGERINGS[48][0].pos === 6 ? 48 : -1);
// readings
assert.strictEqual(C.written("bass", 40), 40); assert.strictEqual(C.written("treble", 40), 54, "E2 sounds, F♯3 written");
assert.strictEqual(C.name(C.written("treble", 70), "flat"), "C6"); assert.strictEqual(C.name(C.written("treble", 40), "sharp"), "F♯3");
assert.strictEqual(C.name(46, "flat"), "B♭2"); assert.strictEqual(C.name(40), "E2");
// the drawing: slide tips increase with the position, distances as in the teacher's seven SVGs
for (let i = 1; i < 7; i++) assert(C.TIPS[i] > C.TIPS[i - 1]);
assert.strictEqual(Math.round(C.posAtX(C.TIPS[3])), 4); assert(Math.abs(C.tipAt(2.5) - (C.TIPS[1] + C.TIPS[2]) / 2) < 1e-9);
assert(C.tipAt(7) === C.TIPS[6] && C.tipAt(1) === C.TIPS[0]);
console.log("trombone-chart: all ok");
