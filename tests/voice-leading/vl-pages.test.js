// The Theory pages for chapters 26-30 (theory/voice-leading-*.qmd, theory/counterpoint.qmd) in Node, read from their source:
//  - every worked example (.vl-ex, .vl-spex) is what the page says it is: "Right" examples pass the checker, a "Wrong" one breaks the
//    rule it names;
//  - the ABC drawn for it is bar-checked: every voice has the same length, a whole number of bars, and reads back to the written pitches
//    (accidentals against the key signature and earlier notes in the bar);
//  - every exercise (.vl-exercise, .vl-species) has at least one clean solution (a search with the checker finds one), so none is impossible.
//   node tests/voice-leading/vl-pages.test.js        NEG=1: one example's claim is changed, which must fail
const fs = require("fs"), path = require("path");
const R = path.resolve(__dirname, "../..") + "/";
const VL = require(R + "apps/shared/analysis/voice-leading.js");
const UI = require(R + "apps/shared/analysis/voice-leading-ui.js");
const PAGES = ["voice-leading-triads", "voice-leading-sevenths", "voice-leading-ncts", "voice-leading-chromatic", "counterpoint"];
let fails = 0, total = 0;
function ok(c, m) { total++; if (!c) { fails++; console.log("FAIL", m); } }
const attr = (s, n) => { const m = new RegExp(n + "=(?:\"([^\"]*)\"|'([^']*)')").exec(s); return m ? (m[1] != null ? m[1] : m[2]) : null; };
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];

// ---- read an ABC voice line back to MIDI numbers and total quarter beats
function readVoice(line, acc) {
  const out = [], bars = []; let state = {}, q = 0;
  const re = /(\^+|_+|=)?([A-Ga-gz])([,']*)(\d*)|(\|\]?)/g; let m;
  while ((m = re.exec(line))) {
    if (m[5]) { bars.push(q); state = {}; continue; }
    const d = m[4] ? +m[4] : 1; q += d;
    if (m[2] === "z") { out.push(null); continue; }
    const L = m[2].toUpperCase(), up = m[2] === m[2].toLowerCase(); let oct = up ? 5 + (m[3].match(/'/g) || []).length : 4 - (m[3].match(/,/g) || []).length;
    const key = L + oct; let a = key in state ? state[key] : (acc[L] || 0);
    if (m[1]) a = m[1] === "=" ? 0 : m[1][0] === "^" ? m[1].length : -m[1].length;
    state[key] = a; out.push(12 * (oct + 1) + NAT[LET.indexOf(L)] + a);
  }
  return { midis: out, q };
}
function checkAbc(abc, wantByVoice, acc, tag) {
  const lens = [];
  Object.keys(wantByVoice).forEach(v => {
    const line = abc.split("\n").filter(l => l.indexOf("[V:" + v + "]") === 0)[0];
    ok(!!line, tag + ": voice " + v + " line"); if (!line) return;
    const r = readVoice(line.replace("[V:" + v + "]", ""), acc); lens.push(r.q);
    ok(JSON.stringify(r.midis) === JSON.stringify(wantByVoice[v]), tag + ": voice " + v + " reads back as " + JSON.stringify(wantByVoice[v]) + " but is " + JSON.stringify(r.midis));
  });
  ok(lens.every(x => x === lens[0]) && lens[0] % 4 === 0, tag + ": voices have lengths " + lens + " (equal, whole bars)");
}
const mid = s => { const n = VL.parseNote(s); return n ? n.midi : null; };

// ---- SATB exercises: depth-first search for a clean solution
function candidates(v, ch, key, scalePcs) {
  const r = VL.RANGES[v], out = [];
  for (let m = r[0]; m <= r[1]; m++) if (!ch || ch.pcs.indexOf(m % 12) >= 0 || scalePcs.indexOf(m % 12) >= 0) out.push(m);
  return out;
}
function spell(m, key) {   // both spellings of a black key (the solver does not know which the chord wants)
  const S = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], F = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], o = Math.floor(m / 12) - 1;
  return S[m % 12] === F[m % 12] ? [S[m % 12] + o] : [S[m % 12] + o, F[m % 12] + o];
}
function solveSATB(key, rows) {
  const voices = ["S", "A", "T", "B"], kk = VL.parseKey(key), scale = (kk.minor ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11]).map(x => (x + kk.tonic) % 12);
  const sl = rows.map((r, i) => Object.assign({ t: i * 2 }, r));
  const chords = []; let cur = null; sl.forEach(s => { if (s.rn) cur = VL.parseRN(s.rn, kk); chords.push(cur); });
  const spellOf = (s, m) => {   // chromatic names that the examples use
    const names = { "6": "F#", "1": "Db", "8": "Ab", "3": "Eb", "10": "Bb", "11": "B", "9": "A" }; return null;
  };
  function opts(i, v) { const s = sl[i]; if (s[v]) return [s[v]]; return [].concat(...candidates(v, chords[i], key, scale).map(m => spell(m, key))); }
  const pick = [];
  function dfs(i) {
    if (i === sl.length) return true;
    const os = voices.map(v => opts(i, v));
    for (const S of os[0]) for (const A of os[1]) for (const T of os[2]) for (const B of os[3]) {
      const row = Object.assign({}, sl[i], { S, A, T, B }); pick[i] = row;
      const res = VL.check({ key, slices: pick.slice(0, i + 1) });
      if (res.errors.some(e => e.sev === "error" && e.slice < i + 1 && !(e.rule === "leaptone" && false))) continue;
      if (dfs(i + 1)) return true;
    }
    return false;
  }
  return dfs(0) ? pick.slice() : null;
}
// ---- species solutions
function solveSpecies(spec) {
  const cf = spec.cf, N = cf.length, lowerCF = spec.cfPos !== "upper", cfm = cf.map(mid);
  const base = lowerCF ? cfm[0] : cfm[0];
  const rng = []; for (let m = Math.min(...cfm) - 14; m <= Math.max(...cfm) + 14; m++) if ([0, 2, 4, 5, 7, 9, 11].indexOf(m % 12) >= 0 || m % 12 === 1) rng.push(m);
  const nm = m => ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][m % 12] + (Math.floor(m / 12) - 1);
  const sp = spec.species, cp = [];
  function dfs(i) {
    if (i === N) return true;
    const choices = [];
    if (sp === 1 || i === N - 1) rng.forEach(m => choices.push(nm(m)));
    else for (const a of (i === 0 ? [null] : rng.map(nm))) for (const b of rng) choices.push([a, nm(b)]);
    for (const c of choices) {
      cp[i] = c;
      const partial = VL.species({ species: sp, cf: cf.slice(0, i + 1), cp: cp.slice(0, i + 1), cfPos: spec.cfPos, mode: spec.mode });
      // only errors not about the ending can be judged on a prefix: require no errors but the "End on" / ending rules until the last bar
      const bad = partial.errors.filter(e => e.sev === "error" && (i === N - 1 || !/^(End|The last bar|The last half note|The bar before|Approach the final)/.test(e.msg)));
      if (bad.length) continue;
      if (dfs(i + 1)) return true;
    }
    return false;
  }
  return dfs(0) ? cp.slice() : null;
}

PAGES.forEach(p => {
  const src = fs.readFileSync(R + "theory/" + p + ".qmd", "utf8");
  ok(/^## /m.test(src), p + ": has ## headings");
  let n = 0;
  (src.match(/<div class="vl-ex"[^>]*>/g) || []).forEach(tag => {
    n++; const key = attr(tag, "data-key"), expect = attr(tag, "data-expect"), rows = JSON.parse(attr(tag, "data-rows")), name = p + " example " + n + " (" + expect + ")";
    const e = process.env.NEG && n === 1 && p === "voice-leading-triads" ? "parallels" : expect;
    const sl = UI.slicesFrom(rows), res = VL.check({ key, slices: sl }), rules = res.errors.filter(x => x.sev === "error").map(x => x.rule);
    ok(e === "ok" ? rules.length === 0 : rules.includes(e), name + ": checker says [" + rules + "]; " + res.text());
    const ps = UI.parsedSlices(sl, ["S", "A", "T", "B"]), abc = UI.scoreAbc(key, ps, ["S", "A", "T", "B"]), want = {};
    ["S", "A", "T", "B"].forEach(v => { want[v] = []; ps.forEach((s, i) => { const d = i + 1 < ps.length ? ps[i + 1].t - s.t : 2; want[v].push(s.n[v] ? s.n[v].midi : null); }); });
    // pad rest at the end is not read back as a note: strip trailing nulls beyond the notes
    Object.keys(want).forEach(v => { const got = abc.split("\n").filter(l => l.indexOf("[V:" + v + "]") === 0)[0]; const r = readVoice(got.replace("[V:" + v + "]", ""), UI.keyAcc(key)); while (r.midis.length > want[v].length) r.midis.pop(); ok(JSON.stringify(r.midis) === JSON.stringify(want[v]), name + " voice " + v + " ABC reads back: " + JSON.stringify(r.midis) + " vs " + JSON.stringify(want[v])); });
    const lens = ["S", "A", "T", "B"].map(v => readVoice(abc.split("\n").filter(l => l.indexOf("[V:" + v + "]") === 0)[0].replace("[V:" + v + "]", ""), UI.keyAcc(key)).q);
    ok(lens.every(x => x === lens[0]) && lens[0] % 4 === 0, name + " bar lengths " + lens);
  });
  (src.match(/<div class="vl-spex"[^>]*>/g) || []).forEach(tag => {
    n++; const spec = { species: +attr(tag, "data-species"), cf: attr(tag, "data-cf").split(" "), cp: JSON.parse(attr(tag, "data-cp")), cfPos: attr(tag, "data-cfpos"), mode: attr(tag, "data-mode") }, expect = attr(tag, "data-expect");
    const res = VL.species(spec), errs = res.errors.filter(x => x.sev === "error");
    ok(expect === "ok" ? errs.length === 0 : errs.some(x => x.msg.indexOf(expect) >= 0), p + " species example " + n + " (" + expect + "): " + res.text());
    const abc = UI.spAbc(spec.cf.map(VL.parseNote), spec.cp.map(b => (Array.isArray(b) ? b : [b]).map(VL.parseNote)), spec.cfPos, spec.species);
    const L1 = readVoice(abc.split("\n").filter(l => l.indexOf("[V:1]") === 0)[0].replace("[V:1]", ""), {}), L2 = readVoice(abc.split("\n").filter(l => l.indexOf("[V:2]") === 0)[0].replace("[V:2]", ""), {});
    ok(L1.q === L2.q && L1.q === 4 * spec.cf.length, p + " species example " + n + ": voice lengths " + L1.q + " / " + L2.q);
  });
  (src.match(/<div class="vl-exercise"[^>]*>/g) || []).forEach(tag => {
    n++; const key = attr(tag, "data-key"), rows = JSON.parse(attr(tag, "data-rows")), sol = solveSATB(key, rows);
    ok(!!sol, p + " exercise " + n + " has no clean solution (rows " + JSON.stringify(rows) + ")");
    if (sol && process.env.SHOW) console.log(p, n, sol.map(r => [r.S, r.A, r.T, r.B].join(" ")).join(" | "));
  });
  (src.match(/<div class="vl-species"[^>]*>/g) || []).forEach(tag => {
    n++; const spec = { species: +attr(tag, "data-species"), cf: attr(tag, "data-cf").split(" "), cfPos: attr(tag, "data-cfpos"), mode: attr(tag, "data-mode") }, sol = solveSpecies(spec);
    ok(!!sol, p + " species exercise " + n + " has no clean solution");
    if (sol && process.env.SHOW) console.log(p, n, JSON.stringify(sol));
  });
  ok(n > 0, p + " has examples");
});
console.log((fails ? "FAILED " + fails + " of " : "ok, ") + total + " checks");
process.exit(fails ? 1 : 0);
