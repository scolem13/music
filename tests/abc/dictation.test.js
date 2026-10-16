// Dictation grading (apps/shared/dictation.js). node tests/abc/dictation.test.js
const path = require("path"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
require(R + "apps/shared/abc-events.js");
const G = require(R + "apps/shared/dictation.js");
const H = "X:1\nM:2/4\nL:1/8\nK:Eb\n";
const T = H + "E2 G2 | BB B2 | B2 G2 | EE E2 |]";

let r = G.grade(T, T);
assert.strictEqual(r.score, 1);
r = G.grade(T, H + "E2 G2 | B-B B2 | B2 G2 | EE E2 |]");     // tied quavers where a crotchet was: rhythm wrong
assert.ok(r.rhythmScore < 1 && r.pitchScore < 1);
r = G.grade(T, H + "E2 G2 | BB B2 | B2 A2 | EE E2 |]");       // one wrong pitch
assert.strictEqual(r.rhythmScore, 1); assert.strictEqual(r.notes.filter(n => n.pitch === "wrong").length, 1);
r = G.grade(T, H + "e2 G2 | BB B2 | B2 G2 | EE E2 |]");       // octave slip: half credit
assert.strictEqual(r.notes[0].pitch, "octave");
r = G.grade(T, H + "E2 G2 |]");                               // half done
assert.strictEqual(r.notes.filter(n => n.pitch === "missing").length, 8);
r = G.grade(T, "");
assert.strictEqual(r.score, 0);
assert.deepStrictEqual(G.givens(T), { meter: "2/4", key: "Eb", title: null });
console.log("dictation: ok");
// chords
const E = require(R + "apps/shared/abc-events.js");
const CH = "X:1\nM:4/4\nL:1/4\nK:C\n";
let w = E.fromAbc(CH + "[CEG] [CEG]2 [C/E/] z/ |").written;
assert.deepStrictEqual(w.map(e => e.notes || []), [[67, 64, 60], [67, 64, 60], [64, 60], []]);
assert.deepStrictEqual(w.map(e => e.pitches.length), [1, 1, 1, 0]);   // pitches: one candidate, the top note
assert.deepStrictEqual(w.map(e => e.t_off - e.t_on), [1, 2, 0.5, 0.5]);
assert.strictEqual(E.fromAbc(CH + "[K:G] F [M:3/4] G |").written.length, 2);   // inline fields still fields
r = G.grade(CH + "[CEG]2 [FAc]2 |", CH + "[CEG]2 [FAd]2 |");
assert.strictEqual(r.notes[1].pitch, "part"); assert.ok(Math.abs(r.pitchScore - (1 + 2 / 3) / 2) < 1e-9);
console.log("dictation chords: ok");
