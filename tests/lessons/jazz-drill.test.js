// The jazz drills (apps/shared/drills/jazz.js, theory/jazz-theory.qmd) in Node. The chords and scales are checked against tables
// written out here by hand from the book's figures (31.4.1–8, Table 31.9.4), as half steps above the root; the chord-scale pairs
// (Table 31.10.3) by the book's own principle: every chord tone is in the scale. Then every drill's generated questions: spelling,
// what's drawn against what's played, and which typed answers are accepted or refused (the book's naming rules, 31.1–31.2).
//   node tests/lessons/jazz-drill.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/jazz.js", "utf8"), win);
const D = win.Drills, E = D.engines;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 25) console.log("FAIL", ...a); }
function ok(c, ...a) { total++; if (!c) fail(...a); }
const pc = m => ((m % 12) + 12) % 12;
const set = a => [...new Set(a.map(pc))].sort((x, y) => x - y).join();
const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const val = t => { t = /^[A-G][♭♯#b𝄪𝄫]?/.exec(t)[0]; let v = NAT[t[0]]; for (const c of t.slice(1)) v += c === "♯" || c === "#" ? 1 : c === "♭" || c === "b" ? -1 : c === "𝄪" ? 2 : c === "𝄫" ? -2 : 0; return pc(v); };
const ascii = t => t.replace(/♭/g, "b").replace(/♯/g, "#");

// ---- the chords, by hand: half steps above the root
const CH = {
  "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "(add9)": [0, 4, 7, 2], "m(add9)": [0, 3, 7, 2], "6/9": [0, 4, 7, 9, 2], "m6/9": [0, 3, 7, 9, 2],
  "7": [0, 4, 7, 10], "9": [0, 4, 7, 10, 2], "9(♯11)": [0, 4, 7, 10, 2, 6], "9(13)": [0, 4, 7, 10, 2, 9], "13(♯11)": [0, 4, 7, 10, 2, 6, 9],
  "Δ7": [0, 4, 7, 11], "Δ9": [0, 4, 7, 11, 2], "Δ9(♯11)": [0, 4, 7, 11, 2, 6], "Δ13(♯11)": [0, 4, 7, 11, 2, 6, 9], "Δ7(♯5)": [0, 4, 8, 11], "Δ7(♭5)": [0, 4, 6, 11],
  "m7": [0, 3, 7, 10], "m9": [0, 3, 7, 10, 2], "m11": [0, 3, 7, 10, 2, 5], "m7(11)": [0, 3, 7, 10, 5], "m13": [0, 3, 7, 10, 2, 5, 9], "m13(♯11)": [0, 3, 7, 10, 2, 6, 9],
  "m7(♭5)": [0, 3, 6, 10], "m9(♭5)": [0, 3, 6, 10, 2], "m11(♭5)": [0, 3, 6, 10, 2, 5],
  "sus": [0, 5, 7], "7sus": [0, 5, 7, 10], "9sus": [0, 5, 7, 10, 2], "13sus": [0, 5, 7, 10, 2, 9], "7sus(♭9)": [0, 5, 7, 10, 1], "13sus(♭9)": [0, 5, 7, 10, 1, 9],
  "7(♭5)": [0, 4, 6, 10], "7(♯5)": [0, 4, 8, 10], "7(♭9)": [0, 4, 7, 10, 1], "7(♯9)": [0, 4, 7, 10, 3], "7(♯9♭5)": [0, 4, 6, 10, 3], "7(♯9♯5)": [0, 4, 8, 10, 3],
  "7(♭9♯5)": [0, 4, 8, 10, 1], "7(♭9♭5)": [0, 4, 6, 10, 1],
  "mΔ7": [0, 3, 7, 11], "mΔ9": [0, 3, 7, 11, 2], "dim": [0, 3, 6], "°7": [0, 3, 6, 9], "dim(Δ7)": [0, 3, 6, 11], "7(♯11♯9)": [0, 4, 7, 10, 3, 6]
};
const inv = Object.values(D.JAZZ_GROUPS).flatMap(g => g.ch.map(c => c.sym));
ok(inv.length === Object.keys(CH).length && inv.every(s => CH[s]), "inventory", inv.filter(s => !CH[s]));
const sets = {};
for (const s of inv) { const k = set(CH[s]); ok(!sets[k], "two chords with the same notes", s, sets[k]); sets[k] = s; }
// every symbol, as shown and typed plainly, reads back as its notes
for (const s of inv) for (const r of ["C", "F♯", "B♭", "E"]) {
  for (const t of [r + s, ascii(r + s), ascii(r + s).replace(/Δ/g, "maj"), ascii(r + s).replace(/Δ/g, "^").replace(/[()]/g, "")]) {
    const p = D.parseJazz(t); ok(p && p.set.join() === set(CH[s]) && p.root.l === "CDEFGAB".indexOf(r[0]), "read", t, p && p.set.join(), set(CH[s]));
  }
}
// the book's own equivalents and its distinctions
const EQ = [["Cø7", "Cm7(b5)"], ["Cø9", "Cm9(b5)"], ["C-7", "Cm7"], ["Cmin7", "Cm7"], ["CM7", "CΔ7"], ["Cmaj7", "CΔ7"], ["C^9", "CΔ9"], ["C7(+9)", "C7(#9)"],
  ["C7(-9)", "C7(b9)"], ["C7+5", "C7(#5)"], ["C+7", "C7(#5)"], ["C7-5", "C7(b5)"], ["C6/9", "C69"], ["Cadd9", "C(add9)"], ["Cadd2", "C(add9)"], ["C7sus4", "C7sus"],
  ["Cdim7", "C°7"], ["Co7", "C°7"], ["CmΔ7", "Cm(maj7)"], ["CmM7", "CmΔ7"], ["C°", "Cdim"]];
for (const [a, b] of EQ) { const p = D.parseJazz(a), q = D.parseJazz(b); ok(p && q && p.set.join() === q.set.join(), "same", a, b, p && p.set.join(), q && q.set.join()); }
const DIFF = [["C13", "C9(13)"], ["C11", "C9sus"], ["C7(b13)", "C7(#5)"], ["C9", "C7"], ["C+", "C7(#5)"], ["Cm7", "C7"], ["C6", "C13"], ["C7(b9)", "Cb9"]];
for (const [a, b] of DIFF) { const p = D.parseJazz(a), q = D.parseJazz(b); ok(!p || !q || p.set.join() !== q.set.join(), "should differ", a, b); }
ok(D.parseJazz("G7alt") === null, "7alt doesn't name notes");
// naming: a 5th left out is fine, an added 5th or a wrong note is not; ♭5 or ♯11 on a chord without a 5th (31.2)
ok(D.jazzNameFits("C7(#11)", { l: 0, a: 0 }, [0,4,6,10]), "C7(#11) for C E G♭ B♭");
ok(D.jazzNameFits("C7(b5)", { l: 0, a: 0 }, [0,4,6,10]), "C7(b5)");
ok(!D.jazzNameFits("C7", { l: 0, a: 0 }, [0,4,6,10]), "C7 for C E G♭ B♭");
ok(D.jazzNameFits("C9", { l: 0, a: 0 }, [0,2,4,10]), "C9 for a 9th chord without its 5th");
ok(!D.jazzNameFits("C7(b13)", { l: 0, a: 0 }, [0, 4, 8, 10]), "C7(♭13) for C7(♯5): ♭13 keeps the 5th (31.3)");
ok(!D.jazzNameFits("C7(#11)", { l: 0, a: 0 }, [0, 4, 7, 10]), "C7(♯11) for C7");
ok(!D.jazzNameFits("Db9", { l: 0, a: 1 }, [0,2,4,7,10]), "D♭9 for C♯9");

// ---- jzwrite / jzname over every group and root
const LET = "CDEFGAB";
for (let i = 0; i < 4000; i++) {
  const s = D.parseSettings("jzname", "groups=add,dom,maj,min,hdim,sus,alt,other&roots=all"), q = E.jzname.make(s); total++;
  const ev = ["1", "2"].flatMap(v => Ev.fromAbc(q.abc, { voice: v }).sounding.flatMap(e => e.notes || e.pitches.map(p => p.midi))).sort((a, b) => a - b);
  ok(JSON.stringify(ev) === JSON.stringify(q.play[0].slice().sort((a, b) => a - b)), "abc vs play", q.answer, q.abc, ev, q.play[0]);
  const b = q.play[0][0], suf = q.answer.replace(/^[A-G][♭♯]?/, "");
  ok(set(q.play[0].map(m => m - b)) === set(CH[suf]), "sound", q.answer, q.play[0].map(m => pc(m - b)));
  ok(Math.max(...q.play[0]) <= 81 && Math.min(...q.play[0]) >= 48 && q.play[0][0] < 60, "range", q.answer, q.play[0]);
  ok(E.jzname.check(q, q.answer) && E.jzname.check(q, ascii(q.answer)), "own name refused", q.answer);
  ok(!E.jzname.check(q, ascii(q.answer).replace(/^([A-G])/, (m, c) => LET[(LET.indexOf(c) + 1) % 7])), "wrong root accepted", q.answer);
}
for (let i = 0; i < 3000; i++) {
  const s = D.parseSettings("jzwrite", "groups=add,dom,maj,min,hdim,sus,alt,other&roots=all"), q = E.jzwrite.make(s); total++;
  const names = q.answer.split(" "), suf = q.show.replace(/^[A-G][♭♯]?/, "");
  ok(set(names.map(n => val(n) - val(names[0]))) === set(CH[suf]), "spelling", q.show, q.answer);
  ok(names.every(n => !/[𝄪𝄫]/.test(n)), "double accidental", q.show, q.answer);
  ok(E.jzwrite.check(q, ascii(q.answer)), "own answer refused", q.show, q.answer);
  ok(E.jzwrite.check(q, ascii([names[0]].concat(names.slice(1).reverse()).join(" "))), "order after the root refused", q.answer);
  if (names.length > 3) ok(!E.jzwrite.check(q, ascii(names.slice(0, -1).join(" "))), "a missing note accepted", q.show);
  ok(!E.jzwrite.check(q, ascii(names.slice(1).concat(names[0]).join(" "))), "root not first accepted", q.show);
}
// the book's respellings are accepted: C7(♯9) with E♭, C7(♯5) with G♯
{ const q = { root: { l: 0, a: 0 }, set: set(CH["7(♯9)"]).split(",").map(Number) }; ok(E.jzwrite.check(q, "C E G Bb D#") && E.jzwrite.check(q, "C E G Bb Eb"), "♯9 either way"); }

// ---- scales (Table 31.9.4), by hand
const SCH = { ionian: [0, 2, 4, 5, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  locrian2: [0, 2, 3, 5, 6, 8, 10], lyddom: [0, 2, 4, 6, 7, 9, 10], phrydor: [0, 1, 3, 5, 7, 9, 10], lydaug: [0, 2, 4, 6, 8, 9, 11], mixob6: [0, 2, 4, 5, 7, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10], blues: [0, 3, 5, 6, 7, 10], bebopdom: [0, 2, 4, 5, 7, 9, 10, 11], bebopmaj: [0, 2, 4, 5, 7, 8, 9, 11], whole: [0, 2, 4, 6, 8, 10],
  hw: [0, 1, 3, 4, 6, 7, 9, 10], wh: [0, 2, 3, 5, 6, 8, 9, 11], hexatonic: [0, 1, 4, 5, 8, 9] };
ok(D.JAZZ_SCALES.length === Object.keys(SCH).length, "scale count");
for (let i = 0; i < 3000; i++) {
  const q = E.jzscale.make(D.parseSettings("jzscale", "roots=all")); total++;
  const ev = Ev.fromAbc(q.abc).sounding.flatMap(e => e.notes || e.pitches.map(p => p.midi));
  ok(ev.join() === q.play.join(), "scale abc vs play", q.answer, q.abc, ev, q.play);
  ok(q.play.map(m => m - q.play[0]).slice(0, -1).join() === SCH[q.answer].join() && q.play.at(-1) - q.play[0] === 12, "scale", q.answer, q.play);
  const w = E.jzscalewrite.make(D.parseSettings("jzscalewrite", "roots=all")), id = D.JAZZ_SCALES.find(x => w.show.endsWith(" " + x.name)).id, ns = w.answer.split(" ");
  ok(ns.map(n => pc(val(n) - val(ns[0]))).join() === SCH[id].join(), "scale spelling", w.show, w.answer);
  ok(E.jzscalewrite.check(w, ascii(w.answer)) && !E.jzscalewrite.check(w, ascii(ns.slice(0, -1).join(" "))) && !E.jzscalewrite.check(w, ascii(ns.slice().reverse().join(" "))), "scale write", w.show);
}
// ---- chord-scale (Table 31.10.3): every chord tone is in each scale listed (the book's principle, 31.10)
for (const [sym, degs, scs] of D.JAZZ_CS) {
  const semis = { "1": 0, "3": 4, "b3": 3, "b5": 6, "5": 7, "#5": 8, "6": 9, "bb7": 9, "b7": 10, "7": 11, "b9": 1, "9": 2, "#9": 3, "#11": 6, "13": 9 };
  for (const sc of scs) ok(degs.split(" ").every(d => SCH[sc].includes(semis[d])), "chord tone outside its scale", sym, sc);
}
for (let i = 0; i < 500; i++) { const q = E.jzchordscale.make(D.parseSettings("jzchordscale", "roots=all")); total++;
  ok(q.ok.every(a => E.jzchordscale.check(q, a)) && !E.jzchordscale.check(q, "phrygian"), "chord-scale answers", q.show); }
// ---- guide tones, tritone subs, ii–V–I
for (let i = 0; i < 1000; i++) {
  const g = E.jzguide.make(D.parseSettings("jzguide", "roots=all")); total++;
  const [t, s] = g.answer.split(" "), root = g.show.match(/^[A-G][♭♯]?/)[0], q = g.show.slice(root.length);
  ok(pc(val(t) - val(root)) === (/^m|ø/.test(q) ? 3 : 4) && pc(val(s) - val(root)) === (/Δ/.test(q) ? 11 : 10), "guide tones", g.show, g.answer);
  ok(E.jzguide.check(g, ascii(g.answer)) && !E.jzguide.check(g, ascii(s + " " + t)), "guide answer", g.show);
  const tt = E.jztt.make(); ok(pc(val(tt.answer) - val(tt.show)) === 6, "tritone", tt.show, tt.answer);
  ok(E.jztt.check(tt, ascii(tt.answer)) && !E.jztt.check(tt, ascii(tt.show)) && !E.jztt.check(tt, ascii(tt.answer.replace("7", "m7"))), "tt answer", tt.show);
  for (const mode of ["major", "minor"]) {
    const q = E.jz251.make(D.parseSettings("jz251", "mode=" + mode)), k = q.show.split(" ")[0], [a, b, c] = q.answer.split(/\s+/);
    ok(pc(val(a) - val(k)) === 2 && pc(val(b) - val(k)) === 7 && val(c) === val(k), "ii V I roots", q.show, q.answer);
    ok(E.jz251.check(q, ascii(q.answer)), "own 251 refused", q.answer);
    const r = q.roots.map(n => "CDEFGAB"[n.l] + ["b", "", "#"][n.a + 1]);
    const plain = mode === "major" ? `${r[0]}m7 ${r[1]}7 ${r[2]}maj7` : `${r[0]}m7b5 ${r[1]}7alt ${r[2]}m6`;
    if (mode === "major") ok(E.jz251.check(q, plain) && E.jz251.check(q, `${r[0]}-7 | ${r[1]}13 | ${r[2]}6`), "plain 251", plain);
    else ok(E.jz251.check(q, `${r[0]}ø7 ${r[1]}7(b9) ${r[2]}m6`), "plain minor 251", q.answer);
    ok(!E.jz251.check(q, mode === "major" ? `${r[0]}7 ${r[1]}7 ${r[2]}maj7` : `${r[0]}m7 ${r[1]}7 ${r[2]}m6`), "wrong ii accepted", q.answer);
    ok(!E.jz251.check(q, `${r[1]}7 ${r[0]}m7 ${r[2]}maj7`), "wrong order accepted", q.answer);
  }
}
// ---- the ear drill: the notes are the chord over its bass, the upper ones within an octave, the 3rd/4th or 7th lowest
const EAR = { "Δ7": [0, 4, 7, 11], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "m7(♭5)": [0, 3, 6, 10], "°7": [0, 3, 6, 9], "mΔ7": [0, 3, 7, 11], "7sus": [0, 5, 7, 10],
  "Δ9": [0, 4, 7, 11, 2], "9": [0, 4, 7, 10, 2], "m9": [0, 3, 7, 10, 2], "9(13)": [0, 4, 10, 2, 9], "7(♭9)": [0, 4, 7, 10, 1], "7(♯9)": [0, 4, 7, 10, 3], "7(♯5)": [0, 4, 8, 10] };
for (const st of ["basic", "ext", "alt"]) {
  const s = D.parseSettings("jzear", "set=" + st), seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const q = E.jzear.make(s), nm = E.jzear.answerName(q.answer), v = q.play[0], b = v[0]; seen.add(nm); total++;
    const want = EAR[nm]; ok(want && set(v.map(m => m - b)) === set(want), "ear chord", nm, v.map(m => pc(m - b)));
    ok(v[v.length - 1] - v[1] < 12 && v[1] > b, "close voicing", nm, v);
    ok([3, 4, 5, 9, 10, 11].includes(pc(v[1] - b)), "lowest upper note", nm, pc(v[1] - b));
  }
  ok(seen.size === E.jzear.answers(s).length, "ear: every answer asked", st, [...seen]);
}
console.log(fails ? `${fails} failed of ${total}` : `${total} ok`);
process.exit(fails ? 1 : 0);
