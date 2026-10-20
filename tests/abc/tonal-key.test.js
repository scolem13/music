// Regression: the tonal assessment used to read every key as C major / C minor (Dm, Gmix -> C minor). node tests/abc/tonal-key.test.js
const path = require("path"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
global.AbcCore = global.AbcCore || globalThis.AbcCore;
const P = require(R + "apps/assessment/abc-pitch.js");
const AbcPitch = P && P.melodyMidi ? P : global.AbcPitch || globalThis.AbcPitch;
const mm = abc => { const m = /K:(\S+)\n(.*)$/s.exec(abc); return AbcPitch.contentToMidi(m[2], m[1]); };
assert.deepStrictEqual(AbcPitch.melodyMidi("X:1\nL:1/4\nK:D\n[V: V1] F c"), [66, 73], "melodyMidi with a V:1 voice");
let n = 0; const t = (name, f) => { f(); n++; };
t("D major sharpens F and C", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:D\nF c d"), [66, 73, 74]));
t("D minor flattens B only", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:Dm\nF B c"), [65, 70, 72]));
t("G mixolydian is C major's notes, F natural", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:Gmix\nF B c"), [65, 71, 72]));
t("D dorian has B natural, F natural", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:Ddor\nF B c"), [65, 71, 72]));
t("E flat major: B E A flat", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:Eb\nB E A"), [70, 63, 68]));
t("C is unchanged", () => assert.deepStrictEqual(mm("X:1\nL:1/4\nK:C\nF c B"), [65, 72, 71]));
t("tonic pitch classes", () => {
  const tp = k => AbcPitch.tonicPc(k);
  assert.deepStrictEqual(["C", "D", "Gmix", "Ddor", "Eb", "Am"].map(tp), [0, 2, 7, 2, 3, 9]);
});
console.log("TONAL KEY OK (" + n + " tests)");
