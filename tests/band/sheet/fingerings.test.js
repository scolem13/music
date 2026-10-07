// Chord Sheet fingerings (functions lifted out of the page): guitar fingers, piano fingers, hand split.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/tools/_chord-sheet.qmd", "utf8");
const a = src.indexOf("// Fretting-hand fingers, one per string"), b = src.indexOf("// ===== VOICE LEADING =====");
const mod12 = n => ((n % 12) + 12) % 12;
const F = new Function("mod12", src.slice(a, b) + "\nreturn { computeFretboardFingerings, handFingers, leftFingers, leftHandCount, computeKeyboardFingerings };")(mod12);
const g = (frets, barre) => F.computeFretboardFingerings({ strings: frets.map(f => f === "x" ? { fret: null } : { fret: f }), barres: barre ? [{ type: "main", fret: barre[0], startString: barre[1], endString: barre[2] }] : [] }).map(x => x == null ? "-" : x).join("");
const G = { "C x32010": "-32-1-", "G 320003": "21---3", "D xx0232": "---132", "E 022100": "-231--", "A x02220": "--123-", "Am x02210": "--231-", "Dm xx0231": "---231",
  "C7 x32310": "-3241-", "G7 320001": "32---1", "F barre 133211": ["134211", [1, 0, 5]], "Bb7 drop2 x5636x": "-2314-", "F7 shell 1x12xx": "1-23--", "Bm barre x24432": ["-13421", [2, 1, 5]],
  "wide 5 x 8": "1-4---" };
for (const k in G){ const frets = k.split(" ").pop() === "8" ? [5, "x", 8, "x", "x", "x"] : k.split(" ").pop().split("").map(c => c === "x" ? "x" : +c);
  const want = Array.isArray(G[k]) ? G[k][0] : G[k], got = g(frets, Array.isArray(G[k]) ? G[k][1] : null); console.log(k.padEnd(22), got, got === want ? "" : "  (expected " + want + ")"); assert.strictEqual(got, want, k); }
const N = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 }, m = s => s.split(" ").map((x, i, arr) => 0).length && (() => { let last = -1, out = []; s.split(" ").forEach(x => { let v = N[x[0]] + (x[1] === "b" ? -1 : x[1] === "#" ? 1 : 0); while (v <= last) v += 12; out.push(v); last = v; }); return out; })();
const rh = s => F.handFingers(m(s)).join(""), lh = s => F.leftFingers(m(s)).join("");
const P = [["C E G", "135"], ["E G C", "125"], ["G C E", "135"], ["C E G C", "1235"], ["E G C E", "1245"], ["G C E G", "1235"], ["C E G B", "1235"], ["E G B C", "1245"], ["C E G Bb", "1235"], ["C G", "15"]];
P.forEach(([s, want]) => { console.log("RH", s.padEnd(10), rh(s)); assert.strictEqual(rh(s), want, "RH " + s); });
[["C E G", "531"], ["C E G B", "5321"], ["G C E G", "5321"], ["C G", "51"]].forEach(([s, want]) => { console.log("LH", s.padEnd(10), lh(s)); assert.strictEqual(lh(s), want, "LH " + s); });
console.log("LH C E G C:", lh("C E G C"), "| LH E G C E:", lh("E G C E"));
// hands: root position 1+3, drop 2 1+3, rootless / inverted 2+2
const split = (midis, root) => F.leftHandCount(midis, root);
assert.strictEqual(split([48, 52, 55, 59], 0), 1, "root position Cmaj7: bass alone"); assert.strictEqual(split([43, 52, 55, 60], 0), 1, "drop 2: the dropped note alone");
assert.strictEqual(split([52, 55, 59, 62], 0), 2, "rootless Cmaj9: two and two"); assert.strictEqual(split([55, 59, 60, 64], 0), 2, "inversion: two and two");
assert.strictEqual(split([48, 52, 55], 0), 1); assert.strictEqual(split([48, 55], 0), 1); assert.strictEqual(split([48, 55, 59, 62, 64], 0) >= 1, true);
const two = F.computeKeyboardFingerings([52, 55, 59, 62].map(x => ({ midi: x })), "two-hand", 0); console.log("two hands, rootless Cmaj9:", [...two.values()].map(v => v.hand + v.finger).join(" "));
assert.strictEqual([...two.values()].map(v => v.hand).join(""), "LLRR");
// two hands: a lone bass note is the little finger; the right hand still spans thumb to little finger
const th = (ms, root) => [...F.computeKeyboardFingerings(ms.map(x => ({ midi: x })), "two-hand", root).values()].map(v => v.hand + v.finger).join(" ");
assert.strictEqual(th([48, 52, 55], 0), "L5 R1 R3"); assert.strictEqual(th([43, 47, 50, 53], 7), "L5 R1 R3 R5"); assert.strictEqual(th([48, 52, 55, 59], 0), "L5 R1 R3 R5");
assert.strictEqual(rh("C E"), "13"); assert.strictEqual(rh("C D"), "12"); assert.strictEqual(lh("C E"), "31");
console.log("FINGERINGS OK");
