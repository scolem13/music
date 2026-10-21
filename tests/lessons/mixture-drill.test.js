// The mode-mixture drills (apps/shared/drills/mixture.js: mix / mixwrite / mixsym / mixdc / picardy, theory/mode-mixture.qmd) in
// Node. Each question is checked against a table of its own, written out here in C major from the book's Figures 19.2.1-2 (plus iv7)
// and moved to the question's key by letter steps and semitones: the notes are spelled as the table says, the figure matches the bass,
// at least one note is outside the key signature, no other chord in the set (nor any diatonic triad or seventh of the major key) has
// the same spelled notes, the drawn ABC sounds what the drill plays, every bar of a phrase is the same length, and the typed forms
// the page promises are accepted (wrong ones refused).
//   node tests/lessons/mixture-drill.test.js            MUTATE=1 runs a negative control (a wrong table: it must fail)
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/mixture.js", "utf8"), win);
const D = win.Drills;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 20) console.log("FAIL", ...a); }
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], pc = m => ((m % 12) + 12) % 12;
// the chords in C major, spelled: note names
const C = { "i": "C E♭ G", "ii°": "D F A♭", "iiø7": "D F A♭ C", "♭III": "E♭ G B♭", "iv": "F A♭ C", "iv7": "F A♭ C E♭", "v": "G B♭ D",
  "♭VI": "A♭ C E♭", "♭VII": "B♭ D F", "♭VII7": "B♭ D F A♭", "vii°7": "B D F A♭" };
if (process.env.MUTATE) C["ii°"] = "D F A";   // negative control
const parse = t => { const a = { "": 0, "♯": 1, "♭": -1, "𝄪": 2, "𝄫": -2 }[t.slice(1)]; return { l: LET.indexOf(t[0]), a }; };
const semi = n => NAT[n.l] + n.a;
function inKey(tonic, cname) {   // move a C-major spelling to the key: same letter steps, same semitones from the tonic
  return C[cname].split(" ").map(parse).map(n => { const l = (n.l + tonic.l) % 7, s = pc(semi(n) + semi(tonic)), a = ((s - NAT[l] + 18) % 12) - 6; return { l, a }; });
}
const nm = n => LET[n.l] + { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }[n.a];
const set = ns => ns.map(nm).sort().join(",");
const FIG = { 3: ["", "6", "64"], 4: ["7", "65", "43", "42"] };
const MAJ7 = ["maj7", "min7", "min7", "maj7", "dom7", "min7", "hdim7"];
function diatonicSets(tonic) {   // major-key triads and sevenths, spelled
  const sc = [0, 2, 4, 5, 7, 9, 11].map((s, i) => { const l = (tonic.l + i) % 7, a = ((pc(semi(tonic) + s) - NAT[l] + 18) % 12) - 6; return { l, a }; }), out = [];
  for (let d = 0; d < 7; d++) { out.push(set([0, 2, 4].map(k => sc[(d + k) % 7]))); out.push(set([0, 2, 4, 6].map(k => sc[(d + k) % 7]))); }
  return out;
}
function tonicOf(label) { return parse(/^(?:Key: |In )?([A-G][♯♭]?)/.exec(label)[1]); }
function checkChord(q, tonic, rn, notes, ctx) {
  const m = /^(♭?(?:i{1,3}|iv|v|vi{1,2}|I{1,3}|IV|V|VI{1,2})[°ø]?)(7|6|64|65|43|42)?$/.exec(rn); if (!m) { fail("answer form", rn); return; }
  let base = m[1], fig = m[2] || "", sev = /^(7|65|43|42)$/.test(fig), cname = base + (sev ? "7" : "");
  if (!C[cname] && process.env.MUTATE == null) { fail("not a book chord", rn); return; }
  if (!C[cname]) return;
  const want = inKey(tonic, cname);
  if (set(notes) !== set(want)) fail(ctx, "spelling", rn, notes.map(nm).join(" "), "want", want.map(nm).join(" "));
  const inv = want.findIndex(n => n.l === notes[0].l && n.a === notes[0].a);
  if (FIG[want.length][inv] !== fig) fail(ctx, "figure", rn, inv);
  const sig = diatonicSets(tonic);
  if (sig.indexOf(set(notes)) >= 0) fail(ctx, "same as a diatonic chord", rn);
  const others = Object.keys(C).filter(k => k !== cname && set(inKey(tonic, k)) === set(notes)); if (others.length) fail(ctx, "not unique", rn, others);
}
const MAJ_KEYS = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];
const seen = {};
// mix: drawn chord = played chord = the table's chord
for (const inv of ["root", "all"]) for (const clef of ["treble", "bass"]) for (let i = 0; i < 1500; i++) {
  const E = D.engines.mix, q = E.make(D.parseSettings("mix", `most=7&inv=${inv}&clef=${clef}`)); total++;
  if (!q) { fail("no question"); break; }
  const tonic = tonicOf(q.label), drawn = Ev.fromAbc(q.abc).sounding.flatMap(e => e.notes).sort((a, b) => a - b);
  if (drawn.join() !== q.play[0].slice().sort((a, b) => a - b).join()) fail("abc vs play", q.abc, q.play[0], drawn);
  const notes = q.chord.ch.map((_, k) => q.chord.ch[(q.chord.inv + k) % q.chord.ch.length]);
  if (pc(q.play[0][0]) !== pc(semi(notes[0]))) fail("bass drawn", q.answer);
  if (q.play[0].map(pc).join() !== q.chord.ch.map((_, k) => pc(semi(notes[k]))).join()) fail("drawn notes vs chord", q.answer, q.play[0]);
  checkChord(q, tonic, q.answer, notes, "mix");
  seen[q.answer.replace(/(6|64|65|43|42)$/, "")] = 1;
  const alt = q.answer.replace("♭", "b").replace("°", "o").replace("ø", "h");
  if (!E.check(q, q.answer) || !E.check(q, alt) || !E.check(q, " " + q.answer.replace(/65$/, "6/5") + " ")) fail("own answer refused", q.answer, alt);
  if (E.check(q, q.answer.replace(/^♭/, "")) && /^♭/.test(q.answer)) fail("♭ left off accepted", q.answer);
  if (/[°ø]/.test(q.answer) && E.check(q, q.answer.replace(/[°ø]/, ""))) fail("quality sign left off accepted", q.answer);
  if (E.check(q, q.answer.replace(/^(♭?)([ivIV]+)/, (_, f, r) => f + (r === r.toUpperCase() ? r.toLowerCase() : r.toUpperCase())))) fail("other case accepted", q.answer);
}
console.log("mix: chords seen", Object.keys(seen).sort().join(" "));
for (const k of Object.keys(C)) if (!seen[k]) fail("never asked", k);
// mixwrite: the answer is the table's notes from the bass; ♯/♭ and #/b accepted; reversed refused
for (let i = 0; i < 3000; i++) {
  const E = D.engines.mixwrite, q = E.make(D.parseSettings("mixwrite", "most=7&inv=all")); total++;
  const tonic = tonicOf(q.show), notes = q.answer.split(" ").map(parse);
  checkChord(q, tonic, q.show.split(": ")[1], notes, "mixwrite");
  if (!E.check(q, q.answer) || !E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("mixwrite own answer", q.answer);
  if (E.check(q, q.answer.split(" ").reverse().join(" "))) fail("mixwrite reversed accepted", q.answer);
  if (/♭/.test(q.answer) && E.check(q, q.answer.replace(/♭/, ""))) fail("mixwrite accidental dropped accepted", q.answer);
  if (notes.some(n => Math.abs(n.a) > 1)) fail("double accidental", q.answer);
}
// mixsym both ways
const SYMQ = { "": [4, 7], m: [3, 7], "°": [3, 6], "7": [4, 7, 10], "m7": [3, 7, 10], "ø7": [3, 6, 10], "°7": [3, 6, 9] };
for (let i = 0; i < 3000; i++) {
  const E = D.engines.mixsym, q = E.make(D.parseSettings("mixsym", "most=7&dir=both")); total++;
  const tonic = tonicOf(q.show), sym = q.rnq ? q.show.split(": ")[1] : q.answer, rn = q.rnq ? q.answer : q.show.split(": ")[1];
  const sm = /^([A-G][♯♭]?)(.*)$/.exec(sym), root = parse(sm[1]), iv = SYMQ[sm[2]];
  const cname = rn, want = C[cname] && inKey(tonic, cname);
  if (!want || !iv || nm(want[0]) !== sm[1] || iv.length !== want.length - 1 || iv.some((s, k) => pc(semi(want[k + 1]) - semi(root)) !== s)) fail("mixsym symbol vs table", q.show, q.answer);
  if (!E.check(q, q.answer)) fail("mixsym own answer", q.show, q.answer);
  if (!q.rnq) {
    if (!E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b").replace("°", "o"))) fail("mixsym ascii", q.answer);
    if (E.check(q, q.answer + "/E")) fail("mixsym slash accepted", q.answer);
    if (sm[2] === "m" && E.check(q, sm[1])) fail("mixsym major for minor accepted", q.answer);
  } else if (!E.check(q, q.answer.replace("♭", "b"))) fail("mixsym bVI", q.answer);
}
// typed forms
const forms = { "bVI": "♭VI", "♭VI6": "♭VI6", "iv": "iv", "iv6/4": "iv64", "iio6": "ii°6", "iidim": "ii°", "iih7": "iiø7", "iiØ6/5": "iiø65", "vii°2": "vii°42",
  "viio4/3": "vii°43", "bVII7": "♭VII7", "bVII65": "♭VII65", "iv7": "iv7", "iv42": "iv42", "iiø": null, "iih6": null, "vii°765": null, "bvi": null, "V/V": null, "": null };
for (const [k, v] of Object.entries(forms)) { total++; if (D.normMix(k) !== v) fail("normMix", JSON.stringify(k), D.normMix(k), "want", v); }
// the ear drills: the last chord is vi or ♭VI (minor key: i or I), every bar 4 beats, abcjs plays what the drill plays
for (const [ex, mode] of [["mixdc", "major"], ["picardy", "minor"]]) {
  const got = {};
  for (let i = 0; i < 1000; i++) {
    const E = D.engines[ex], q = E.make(D.parseSettings(ex, "most=4&show=both")); total++;
    const tonic = parse(q.key.label.split(" ")[0].replace(/^./, c => c.toUpperCase())), last = q.play[3], ev = ["1", "2"].flatMap(v => Ev.fromAbc(q.abc, { voice: v }).sounding);
    const step = ev.map(e => e.t_on).filter(t => t > 0).sort((a, b) => a - b)[0];
    for (let b = 0; b < 4; b++) {
      const at = ev.filter(e => Math.abs(e.t_on - b * step) < 1e-6).flatMap(e => e.notes || e.pitches.map(p => p.midi)).sort((x, y) => x - y);
      if (at.join() !== q.play[b].slice().sort((x, y) => x - y).join()) fail(ex, "abc vs play, chord", b, q.abc, at, q.play[b]);
    }
    const lens = ev.map(e => e.t_off - e.t_on); if (lens.some(l => Math.abs(l - step) > 1e-6)) fail(ex, "bar lengths", q.abc);
    const root = pc(last[0]), third = pc(last.slice(1).find(m => pc(m - root) === 3 || pc(m - root) === 4) - root);
    if (ex === "mixdc") {
      const r6 = pc(semi(tonic) + (q.answer === "vi" ? 9 : 8)), wantThird = q.answer === "vi" ? 3 : 4;
      if (root !== r6 || third !== wantThird) fail("mixdc last chord", q.answer, last);
      if (pc(q.play[2][0] - semi(tonic)) !== 7) fail("mixdc not V before it", q.play[2]);
    } else {
      if (root !== pc(semi(tonic)) || third !== (q.answer === "I" ? 4 : 3)) fail("picardy last chord", q.answer, last);
    }
    if (!/^K:[A-G][#b]?m\n/m.test(q.abc) === (mode === "minor")) fail(ex, "key mode", q.abc);
    got[q.answer] = 1;
  }
  console.log(ex + ": answers seen", Object.keys(got).join(" "));
  if (Object.keys(got).length !== 2) fail(ex, "both answers not seen");
}
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
