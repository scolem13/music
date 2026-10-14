// The shared ABC core must not change what any assessment parser returns.
// Runs the frozen copies of the old parsers (baseline/, from commit e4f1887) and the current ones side by side on every
// tune, pattern, rhythm and benchmark in the repo, each parser on every collection, plus the edge cases below.
// The current ones load as a page loads them: abc-core.js first, in a sandbox with no `require`.
//   node compare.js            -> "ABC SAME (n checks)" or the first differences
// ONE INTENDED DIFFERENCE (2026-10-14): AbcPitch now grades with AbcCore.keyAccidentals, where the frozen parser knew only
// C major / C minor (any "<letter>m..." key, Gmix included, read as C minor; every other key as C major). So for AbcPitch
// melodyMidi / contentToMidi the check is: identical when the old and new key signatures agree; otherwise the output
// must differ only by key-signature shifts (same length, each note off by the difference of the two signatures for its
// letter, never an explicit-accidental note), and the differences are counted and reported, not failed.
const fs = require("fs"), path = require("path"), vm = require("vm"), util = require("util");
const R = path.resolve(__dirname, "../..") + "/";
const read = f => fs.readFileSync(R + f, "utf8");

function sandbox(files){
  const ctx = vm.createContext({});
  files.forEach(f => vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f }));
  return ctx;
}
const B = sandbox(["abc-pitch.js", "abc-rhythm.js", "abc-tune.js"].map(f => __dirname + "/baseline/" + f));
const N = sandbox(["apps/shared/abc-core.js", "apps/assessment/abc-pitch.js",
                   "apps/rhythm-assessment/abc-rhythm.js", "apps/tune-assessment/abc-tune.js"].map(f => R + f));

// ---- the corpus ----
const data = (file, name) => vm.runInNewContext(read(file) + "\n;" + name, { window: undefined });
const collections = {
  "pattern-object": data("apps/patterns/pattern-object.js", "patternObject"),
  "pattern-set": data("apps/patterns/pattern-set.js", "patternObject"),
  "rhythm-pattern-object": data("apps/rhythms/rhythm-pattern-object.js", "rhythmPatternObject"),
  "tunes-object": data("apps/tunes/tunes-object.js", "tunesObject"),
  "reading-benchmarks": data("apps/tunes/reading-benchmarks-object.js", "readingBenchmarks"),
};
const EDGE = [
  "X:1\nK:C\n[V: V1] C0 D0 E0\nw: Do Re Mi",
  "X:1\nK:Am\n[V: V1] A,0 B,0 C0 D0 E0 ^F0 E0",
  "X:1\nK:Gmix\n[V: V1] \"F\" c0 A0 F0 A0",
  "X:1\nK:Cm)\n[V: V1] C0 E0 G0\n[V: V2] C,0",
  "X:1\nK:Dm\nL:1/8\n^F2 F | =B B _B | ^^C __D =E ^| z ^z c'' C,, x2 Z",
  "X:1\nM:6/8\nL:1/8\nK:C\nA>B C<D z>E F- z G | A-B- B | z- B",
  "X:1\nM:3/4\nK:F\n\"Bb\"B \"C7\"c \"^text\"d | \"Cmaj7\"[CEG] [K:Am] A3/2B/ c//d C3/2/4 B,2 B'",
  "X:1\nT:t\nC:composer\nR:reel\nQ:3/8=60\nI:linebreak $\nM:2/4\nK:C\nB/B/ B | B2 $",
  "X:1\nQ:1/4=90\nK:E\nE F G A | B c d e",
  "X:1\nM:none\nK:C\nL:1/16\n(3abc d0 e/0 \"\" g",
  "no header at all: ABC",
  "",
  "X:1\nK:\n-> <B >z",
  "X:1\nK:C\n^F] F [_B]B [^c c] c ^G|G",
];
const corpus = [];
for (const [cname, obj] of Object.entries(collections)){
  for (const [set, text] of Object.entries(obj)){
    corpus.push([cname + "/" + set + " (whole set)", text]);
    text.split(/\n(?=X:)/).forEach((abc, k) => corpus.push([cname + "/" + set + " #" + k, abc]));
  }
}
EDGE.forEach((abc, k) => corpus.push(["edge #" + k, abc]));

// every K: value and every quoted string seen, for keyAccidentals / chordMidis
const keys = new Set(["", "C", "Am", "Gmix", "Ddor", "F#m", "Bbmaj", "Ebm", "Cb", "C#", "Elocrian", "Flyd", "Ephr", "H"]);
const quotes = new Set(["", "^text", "Bb", "F#m7", "Ebmaj7", "Bdim", "Caug", "C+", "Co", "Gsus4", "A/C#"]);
for (const [, abc] of corpus){
  for (const m of abc.matchAll(/^K:(.*)$/gm)) keys.add(m[1].trim());
  for (const m of abc.matchAll(/"([^"]*)"/g)) quotes.add(m[1]);
}

// ---- compare ----
let checks = 0, fails = 0;
function same(label, f){
  checks++;
  let a, b, ea, eb;
  try { a = f(B); } catch (e){ ea = String(e && e.message); }
  try { b = f(N); } catch (e){ eb = String(e && e.message); }
  if (ea !== eb || !util.isDeepStrictEqual(JSON.parse(JSON.stringify(a === undefined ? null : a)),
                                           JSON.parse(JSON.stringify(b === undefined ? null : b)))
      || !util.isDeepStrictEqual(a, b)){
    if (++fails <= 10){
      console.log("DIFF " + label);
      console.log("  old: " + (ea ? "throws " + ea : JSON.stringify(a)).slice(0, 400));
      console.log("  new: " + (eb ? "throws " + eb : JSON.stringify(b)).slice(0, 400));
    }
  }
}
// sandbox objects come from different realms: compare plain copies
const plain = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x, (k, v) => Number.isNaN(v) ? "NaN" : v));

// old key signature (the frozen parser's rule) vs the new one, for the intended-difference check
const oldKsig = key => /^([A-Ga-g])([#b]?)\s*(m|min|minor)?/.exec((key || "").trim().replace(/^$/, "C"))?.[3] ? { E: -1, A: -1, B: -1 } : {};
const intended = { calls: 0, patternSetKeyed: new Set(), byKey: {} };
function keyed(label, abc, f, key){
  const o = oldKsig(key), n = plain(N.AbcCore.keyAccidentals(key));
  let a, b, ea, eb;
  try { a = plain(f(B)); } catch (e){ ea = String(e && e.message); }
  try { b = plain(f(N)); } catch (e){ eb = String(e && e.message); }
  if (util.isDeepStrictEqual(o, n) || ea !== undefined || eb !== undefined) return same(label, f);
  checks++;
  // keyed: the key signature changed. Everything except the key-signature shift must be identical.
  const toks = N.AbcCore.tokens(abc.split("\n").filter(l => /^\[V:\s*V1\]/.test(l.trim())).map(l => l.trim().replace(/^\[V:\s*V1\]/, "")).join(" "));
  const bad = !a || !b || a.length !== b.length;
  let changed = 0;
  if (!bad){
    const ns = label.includes("contentToMidi") ? N.AbcCore.tokens(abc) : toks;
    const notes = ns.filter(t => t.t === "note");
    for (let i = 0; i < a.length; i++){
      const L = notes[i] && notes[i].letter.toUpperCase();
      const want = (notes[i] && notes[i].acc === undefined) ? (n[L] || 0) - (o[L] || 0) : 0;
      if (b[i] - a[i] !== want){ fails++; if (fails <= 10) console.log("DIFF (not a key-signature shift) " + label + " note " + i + ": old " + a[i] + " new " + b[i]); return; }
      if (b[i] !== a[i]) changed++;
    }
  } else { fails++; if (fails <= 10) console.log("DIFF (length) " + label); return; }
  if (changed){ intended.calls++; if (label.startsWith("pattern-set/") && label.includes("melodyMidi")) intended.patternSetKeyed.add(label.replace(/ AbcPitch.*/, "")); }
}

same("API names", C => [Object.keys(C.AbcRhythm), Object.keys(C.AbcTune)].map(k => k.join()));
checks++;
if (Object.keys(B.AbcPitch).some(k => !(k in N.AbcPitch)) || !["keySignature", "tonicPc"].every(k => k in N.AbcPitch)){
  fails++; console.log("DIFF AbcPitch API names: " + Object.keys(B.AbcPitch) + " vs " + Object.keys(N.AbcPitch));
}
for (const [label, abc] of corpus){
  keyed(label + " AbcPitch.melodyMidi", abc, C => plain(C.AbcPitch.melodyMidi(abc)), N.AbcPitch.extractVoice1(abc).key);
  same(label + " AbcPitch.extractVoice1", C => plain(C.AbcPitch.extractVoice1(abc)));
  same(label + " AbcRhythm.parse", C => plain(C.AbcRhythm.parse(abc)));
  same(label + " AbcRhythm.musicLines", C => C.AbcRhythm.musicLines(abc));
  same(label + " AbcRhythm.meter", C => plain(C.AbcRhythm.meter(abc)));
  same(label + " AbcRhythm.macrobeatLUnits", C => [C.AbcRhythm.macrobeatLUnits(abc, true), C.AbcRhythm.macrobeatLUnits(abc, false)].map(String));
  same(label + " AbcTune.melodyNotes", C => plain(C.AbcTune.melodyNotes(abc)));
  for (const k of ["C", "Cm", "Am", "Gmix", "D", "Bb", "Ddor", "F#m"]) keyed(label + " AbcPitch.contentToMidi K:" + k, abc, C => plain(C.AbcPitch.contentToMidi(abc, k)), k);
}
for (const k of keys) same("AbcTune.keyAccidentals " + JSON.stringify(k), C => plain(C.AbcTune.keyAccidentals(k)));
for (const q of quotes) same("AbcTune.chordMidis " + JSON.stringify(q), C => plain(C.AbcTune.chordMidis(q)));

// Node's require path (tests/band/lessons loads abc-tune.js this way) must work without abc-core.js loaded first
same("require path", () => {
  const t = require(R + "apps/tune-assessment/abc-tune.js"), r = require(R + "apps/rhythm-assessment/abc-rhythm.js");
  const p = require(R + "apps/assessment/abc-pitch.js");
  return [t.melodyNotes("K:C\nC D E").notes.length, r.parse("B B B").onsets.length, p.melodyMidi("[V: V1] C D")];
});

// every page that loads one of the parsers loads abc-core.js before it
for (const dir of ["lessons", "tools", "practice", "teacher", ""]){
  if (!fs.existsSync(R + dir)) continue;
  for (const f of fs.readdirSync(R + dir).filter(f => /\.(qmd|html)$/.test(f))){
    const src = read(path.join(dir, f));
    const at = src.search(/src="\/apps\/(assessment\/abc-pitch|rhythm-assessment\/abc-rhythm|tune-assessment\/abc-tune)\.js/);
    if (at < 0) continue;
    checks++;
    const core = src.indexOf('src="/apps/shared/abc-core.js');
    if (core < 0 || core > at){ fails++; console.log("PAGE " + path.join(dir, f) + " loads a parser without abc-core.js before it"); }
  }
}

{
  const ps = [...intended.patternSetKeyed].filter(l => / #\d+$/.test(l));
  const total = corpus.filter(([l]) => /^pattern-set\/.* #\d+$/.test(l)).length;
  console.log("INTENDED (key signature, AbcPitch): " + ps.length + " of " + total + " pattern-set patterns now grade on different pitches" +
              " (" + intended.calls + " melodyMidi/contentToMidi calls differ in all, whole sets and edge cases included)");
}
console.log(fails ? fails + " DIFFERENCES in " + checks + " checks" : "ABC SAME (" + checks + " checks, " + corpus.length + " inputs)");
process.exit(fails ? 1 : 0);
