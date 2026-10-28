// Establish (apps/shared/mlt/establish.js): every method makes something to play, weights 0 are never picked, picks follow weight.
//   node tests/mlt/establish.test.js
const E = require("../../apps/shared/mlt/establish.js");
let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
const c = { tonic: 10, minor: false, triple: false, qpm: 100, first: 62, song: "X:1\nM:2/4\nL:1/8\nK:Bb\n\"Bb\" DD DD | \"F7\" CC CC |]" };
E.METHODS.forEach(m => { if (m.id === "tonality-then-meter") return; check(m.id + " makes sound", E.abc(m, c).length > 0); });
check("minor tonal sequence ends on LA", /\^G A2/.test(E.abc(E.byId("seq-bum"), { tonic: 0, minor: true })[0].abc));
check("C minor moves A minor up 3", E.abc(E.byId("seq-bum"), { tonic: 0, minor: true })[0].opts.transpose === 3);
E.METHODS.forEach(m => { E.WEIGHTS[m.id] = 0; }); E.WEIGHTS["seq-bum"] = 9; E.WEIGHTS["arp-down"] = 1;
const n = {}; let x = 0; const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
for (let i = 0; i < 2000; i++) { const id = E.pick("tonality", rnd).id; n[id] = (n[id] || 0) + 1; }
check("only weighted methods are picked", Object.keys(n).sort().join() === "arp-down,seq-bum", JSON.stringify(n));
check("picked about 9 to 1", n["seq-bum"] / n["arp-down"] > 6 && n["seq-bum"] / n["arp-down"] < 13, JSON.stringify(n));
check("Dorian 5 3 1 is LA FA RE (A F D in D Dorian)", /A F D2/.test(E.abc(E.byId("arp-down"), { tonic: 2, mode: "dorian" })[0].abc));
check("the cue is the tune's first note", /F F F2/.test(E.abc(E.byId("band-intro"), { tonic: 10, first: 65, chords: [] })[0].cue.abc));
const P = (c) => E.progression(c).map(x => x.n).join("-");
check("major without IV: I-V7-I", P({ tonic: 10, chords: E.tuneChords('"Bb" "F7"', 10) }) === "I-V7-I");
check("major with IV in the tune: I-IV-V7-I always at chance 1", E.progression({ tonic: 10, chords: E.tuneChords('"Bb" "Eb" "F7"', 10) }, { chance: 1 }).map(x => x.n).join("-") === "I-IV-V7-I");
check("Dorian with VII: i-IV-VII-i", E.progression({ tonic: 2, mode: "dorian", chords: E.tuneChords('"Dm" "G" "C"', 2) }, { chance: 1 }).map(x => x.n).join("-") === "i-IV-VII-i");
check("Mixolydian: I-VII-I", P({ tonic: 7, mode: "mixolydian", chords: [] }) === "I-VII-I");
check("intro leaves out the last tonic", E.progression({ tonic: 0, minor: true, chords: [] }, { intro: true }).map(x => x.n).join("-") === "i-V7");
let k = 0; for (let i = 0; i < 400; i++) if (E.progression({ tonic: 10, chords: E.tuneChords('"Bb" "Eb" "F7"', 10) }).length === 4) k++;
check("the tune's IV comes often but not always (~70%)", k > 220 && k < 340, k + "/400");
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
