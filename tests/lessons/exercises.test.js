// The Exercise Builder's parts in Node: the voice-leading checker (vl-check.js) on planted errors and clean progressions, and the chorale
// generator (chorale.js): thousands of chorales, each re-checked here, with every chord's notes read back against its Roman numeral by
// arithmetic of its own, the cadence read again from the notes, the period rule, the ABC sounding the voices, and the answer checks.
//   node tests/lessons/exercises.test.js
const path = require("path"), R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/satb.js"); require(R + "apps/shared/exercises/vl-check.js"); require(R + "apps/shared/exercises/chorale.js");
require(R + "apps/shared/exercises/answer-input.js"); require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const V = globalThis.VLCheck, C = globalThis.Chorale, AI = globalThis.AnswerInput, Ev = globalThis.AbcEvents;
let fails = 0, total = 0;
function ok(c, ...a) { total++; if (!c) { fails++; if (fails < 25) console.log("FAIL", ...a); } }
const pc = m => ((m % 12) + 12) % 12;
// ---- the checker. C major: I = C E G, V = G B D (lt B), V7 = G B D F
const I = [0, 4, 7], Vt = [7, 11, 2], V7 = [7, 11, 2, 5];
const ch = (v, pcs, o) => Object.assign({ v, pcs, lt: null, seventh: null }, o || {});
const rules = l => V.check(l).filter(e => e.level === "error").map(e => e.rule).sort().join();
ok(rules([ch([72, 67, 64, 48], I), ch([71, 67, 62, 43], Vt, { lt: 11 }), ch([72, 67, 64, 48], I)]) === "", "clean I V I", rules([ch([72, 67, 64, 48], I), ch([71, 67, 62, 43], Vt, { lt: 11 }), ch([72, 67, 64, 48], I)]));
ok(rules([ch([67, 64, 60, 48], I), ch([69, 65, 62, 50], [2, 5, 9])]) === "parallel5,parallel5,parallel8", "parallel 5ths (S–T, S–B) and 8ves (T–B)", rules([ch([67, 64, 60, 48], I), ch([69, 65, 62, 50], [2, 5, 9])]));
ok(rules([ch([64, 67, 60, 48], I)]) === "crossing", "crossing");
ok(rules([ch([84, 67, 64, 48], I)]) === "range,spacing", "range and spacing", rules([ch([84, 67, 64, 48], I)]));
ok(rules([ch([71, 62, 59, 43], Vt, { lt: 11 })]) === "doubling", "doubled leading tone", rules([ch([71, 62, 59, 43], Vt, { lt: 11 })]));
ok(rules([ch([72, 67, 60, 48], I)]) === "complete", "no 3rd");
ok(rules([ch([73, 67, 64, 48], I)]) === "chord", "wrong note");
ok(V.check([ch([71, 65, 62, 43], V7, { lt: 11, seventh: 5 }), ch([69, 64, 60, 48], I)]).some(e => e.rule === "leadingtone" && e.level === "warn"), "unresolved leading tone is a warning");
ok(V.check([ch([71, 65, 62, 43], V7, { lt: 11, seventh: 5 }), ch([72, 67, 64, 48], I)]).some(e => e.rule === "seventh"), "7th up is a warning");
ok(rules([ch([72, 67, 64, 48], I), ch([72, 67, 64, 48], I)]) === "", "held chord is fine");
// ---- the notes of each numeral, by hand: half steps above the tonic for root, 3rd, 5th, (7th)
const MAJ = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 0], V: [7, 11, 2], vi: [9, 0, 4], "vii°": [11, 2, 5], V7: [7, 11, 2, 5], ii7: [2, 5, 9, 0],
  iv: [5, 8, 0], "ii°": [2, 5, 8], "iiø7": [2, 5, 8, 0], "♭VI": [8, 0, 3], N: [1, 5, 8] };
const MIN = { i: [0, 3, 7], "ii°": [2, 5, 8], III: [3, 7, 10], iv: [5, 8, 0], V: [7, 11, 2], VI: [8, 0, 3], "vii°": [11, 2, 5], V7: [7, 11, 2, 5], "iiø7": [2, 5, 8, 0],
  I: [0, 4, 7], N: [1, 5, 8], "vii°7": [11, 2, 5, 8] };
const SEC = { V: [7, [0, 4, 7]], V7: [7, [0, 4, 7, 10]], "vii°7": [-1, [0, 3, 6, 9]], "vii°": [-1, [0, 3, 6]] };
const INV = { "": 0, "6": 1, "64": 2, "7": 0, "65": 1, "43": 2, "42": 3 };
function expected(rn, mode) {
  if (rn === "N6") return { pcs: MAJ.N, inv: 1 };
  const m = /^(.*?)(7|65|43|42|64|6)?(?:\/(.+))?$/.exec(rn), base = m[1], fig = m[2] || "", sev = /^(7|65|43|42)$/.test(fig);
  if (m[3]) { const t = expected(m[3], mode).pcs[0], s = SEC[base + (sev ? "7" : "")]; return { pcs: s[1].map(x => pc(t + s[0] + x)), inv: INV[fig] }; }
  const T = mode === "major" ? MAJ : MIN, k = base + (sev ? "7" : "");
  return { pcs: T[k], inv: INV[fig] };
}
const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const opts = [{ chapters: [7] }, { chapters: [8, 16] }, { chapters: [16, 17], mode: "major" }, { chapters: [17, 18], mode: "minor" }, { chapters: [18, 19], mode: "major" },
  { chapters: [20], mode: "minor" }, { chapters: [13, 16], phrases: 2 }, { chapters: [7, 13, 17, 18, 19, 20], phrases: 2, mode: "both" }];
const seenRn = new Set(), seenCad = new Set(), seenPer = new Set();
for (let i = 0; i < 3000; i++) {
  const o = opts[i % opts.length], c = C.make(o); total++;
  if (!c) { ok(false, "no chorale", JSON.stringify(o)); continue; }
  const ton = pc(NAT["CDEFGAB"[c.key.tonic.l]] + c.key.tonic.a), mode = c.key.mode;
  ok(V.check(c.chords.map(x => ({ v: x.v, pcs: x.pcs, lt: x.lt, seventh: x.seventh }))).every(e => e.level !== "error"), "voice-leading error", c.chords.map(x => x.rn).join(" "));
  c.chords.forEach((x, j) => {
    seenRn.add(x.rn);
    const e = expected(x.rn, mode); if (!e.pcs) { ok(false, "unknown numeral", x.rn); return; }
    const want = e.pcs.map(p => pc(p + ton)), have = [...new Set(x.v.map(pc))];
    ok(have.every(p => want.includes(p)) && want.slice(0, 2).every(p => have.includes(p)) && (want.length < 4 || have.includes(want[3])), "notes vs numeral", c.key.label, x.rn, have, want);
    ok(pc(x.v[3]) === want[e.inv], "bass vs figure", c.key.label, x.rn, pc(x.v[3]), want[e.inv]);
    ok(x.v[0] >= x.v[1] && x.v[1] >= x.v[2] && x.v[2] >= x.v[3], "order", x.v);
    ok(C.rnMatches(x.rn, x, c.chords[j + 1]), "own numeral refused", x.rn);
    ok(!C.rnMatches(x.rn === "V" ? "IV" : "V", x, c.chords[j + 1]), "wrong numeral accepted", x.rn);
  });
  // the cadence again, from the notes alone
  c.phrases.forEach(p => {
    seenCad.add(p.cadence);
    const y = p.chords.at(-1), x = p.chords.at(-2), yr = pc(y.v[3] - ton), xr = pc(x.v[3] - ton);
    const yTonic = y.pcs[0] === ton && [3, 4].includes(pc(y.pcs[1] - ton)), xDom = (x.pcs[0] === pc(ton + 7) || x.pcs[0] === pc(ton + 11)) && x.pcs.includes(pc(ton + 11));
    let want = null;
    if (y.pcs[0] === pc(ton + 7) && y.pcs.includes(pc(ton + 11)) && y.pcs.length === 3) want = "HC";
    else if (xDom && yTonic) want = xr === 7 && yr === 0 && pc(y.v[0]) === ton && x.pcs[0] === pc(ton + 7) ? "PAC" : "IAC";
    else if (xDom && [8, 9].includes(pc(y.pcs[0] - ton))) want = "DC";
    else if (x.pcs[0] === pc(ton + 5) && yTonic) want = "PC";
    ok(want === p.cadence, "cadence", c.key.label, p.chords.map(z => z.rn).join(" "), p.cadence, want);
    ok(p.bars.length === 4 && p.bars.every(b => b === 1 || b === 2) && p.bars.reduce((a, b) => a + b) === p.chords.length && p.bars[3] === 1, "bars", p.bars);
  });
  if (c.phrases.length === 2) {
    seenPer.add(c.period);
    const S = { PAC: 3, IAC: 2, HC: 1, DC: 1, PC: 2 }, [a, b] = c.phrases, n = a.bars[0] + a.bars[1];
    const sameStart = a.chords.slice(0, n).map(z => z.v.join()).join() === b.chords.slice(0, n).map(z => z.v.join()).join();
    const want = S[a.cadence] < S[b.cadence] ? (sameStart ? "parallel" : "contrasting") : "none";
    ok(want === c.period, "period", c.period, want, a.cadence, b.cadence);
  }
  // the ABC sounds the four voices, and a blank hides exactly its notes
  if (i % 10 === 0) {
    const abc = c.abc({ labels: true, numbers: true });
    ["S", "A", "T", "B"].forEach((vn, k) => {
      const got = Ev.fromAbc(abc, { voice: vn }).sounding.map(e => (e.notes || e.pitches.map(p => p.midi))[0]);
      ok(got.join() === c.chords.map(x => x.v[k]).join(), "abc voice " + vn, c.key.label, got.join(), c.chords.map(x => x.v[k]).join());
    });
    const bl = c.abc({ blank: { voice: 1, from: 2, to: 4 } }), aLine = bl.split("\n").find(l => l.startsWith("[V:A]"));
    ok((aLine.match(/(^|\s)x\d/g) || []).length === 3 && bl.split("\n").find(l => l.startsWith("[V:S]")).indexOf(" x") < 0, "blank", aLine);
    const fill = [2, 3, 4].map(j => c.chords[j].v[1]), fl = Ev.fromAbc(c.abc({ blank: { voice: 1, from: 2, to: 4 }, fill }), { voice: "A" }).sounding.map(e => (e.notes || e.pitches.map(p => p.midi))[0]);
    ok(fl.join() === c.chords.map(x => x.v[1]).join(), "fill drawn", fl.join());
  }
}
ok(["PAC", "IAC", "HC", "DC", "PC"].every(x => seenCad.has(x)), "every cadence made", [...seenCad]);
ok(["parallel", "contrasting", "none"].every(x => seenPer.has(x)), "every period type made", [...seenPer]);
ok(["V7/V", "vii°7/V", "N6", "♭VI", "I64", "V65"].every(x => seenRn.has(x)), "chapter chords made", [...seenRn].join(" "));
// typed numerals
const fake = rn => ({ rn });
for (const [t, rn] of [["V6/5", "V65"], ["V65", "V65"], ["viio7/V", "vii°7/V"], ["viih7", "viiø7"], ["bVI", "♭VI"], ["bII6", "N6"], ["V2", "V42"], ["V4/2", "V42"], ["iiø6/5", "iiø65"]])
  ok(C.rnMatches(t, fake(rn)), "typed", t, rn);
ok(C.rnMatches("Cad64", fake("I64"), fake("V7")) && !C.rnMatches("Cad64", fake("I64"), fake("IV")), "cad64");
ok(!C.rnMatches("v", fake("V")) && !C.rnMatches("V6", fake("V65")), "case and figures matter");
// note input
ok(AI.parseList("C4 F#4 Bb3 c5").join() === "60,66,58,72" && AI.parseList("H4")[0] === null, "note input");
console.log(fails ? `${fails} failed of ${total}` : `${total} ok`);
process.exit(fails ? 1 : 0);
