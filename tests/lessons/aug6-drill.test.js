// The augmented sixth drills (Drills.engines.aug6 / aug6write / aug6sym / aug6ear, practice/augmented-sixths.qmd) in Node. Each
// generated question is checked by arithmetic of its own, from the book's Figure 21.2.1: the bass is ♭6 of the key, an augmented 6th
// (letter 6th, 10 half steps) below ♯4, and the remaining note is 1 (It), 2 (Fr), ♭3 (Ger) or ♯2 (EnGer, major only); V7/N has ♭5 for ♯4.
// The drawn ABC sounds what is played, the typed forms the page promises are accepted, and the other types are refused.
//   node tests/lessons/aug6-drill.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
const D = win.Drills, E = D.engines;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 20) console.log("FAIL", ...a); }
const pc = m => ((m % 12) + 12) % 12;
const LET = "CDEFGAB", NATS = [0, 2, 4, 5, 7, 9, 11];
// a spelled name "F♯" -> { l, s } (letter index, pitch class)
function nm(t) { const l = LET.indexOf(t[0]); let s = NATS[l]; for (const c of t.slice(1)) s += c === "♯" ? 1 : c === "♭" ? -1 : c === "𝄪" ? 2 : c === "𝄫" ? -2 : 0; return { l, s: pc(s) }; }
// [letter steps, half steps] above the key's tonic for each note, by type
const WANT = { It: [[5, 8], [0, 0], [3, 6]], Fr: [[5, 8], [0, 0], [1, 2], [3, 6]], Ger: [[5, 8], [0, 0], [2, 3], [3, 6]],
  EnGer: [[5, 8], [0, 0], [1, 3], [3, 6]], V7N: [[5, 8], [0, 0], [2, 3], [4, 6]] };
const TON = s => { const m = /^([A-Ga-g][♯♭]?)/.exec(s); return nm(m[1].charAt(0).toUpperCase() + m[1].slice(1)); };
const ascii = t => t.replace(/♯/g, "#").replace(/♭/g, "b");

// aug6write: spelling of every type in every key
for (const mode of ["major", "minor"]) for (const ty of ["It", "Fr", "Ger", "EnGer"]) {
  if (mode === "minor" && ty === "EnGer") continue;
  const s = D.parseSettings("aug6write", `mode=${mode}&most=4&types=${ty}`), keys = new Set();
  for (let i = 0; i < 400; i++) {
    const q = E.aug6write.make(s); total++;
    if (!q) { fail("no question", mode, ty); break; }
    const T = TON(q.show); keys.add(q.show.split(":")[0]);
    const ns = q.answer.split(" ").map(nm);
    if (ns.length !== WANT[ty].length) { fail("size", q.show, q.answer); continue; }
    ns.forEach((n, j) => { const [ls, hs] = WANT[ty][j]; if ((n.l - T.l + 7) % 7 !== ls || pc(n.s - T.s) !== hs) fail("note", j, q.show, q.answer); });
    const b = ns[0], top = ns[ns.length - 1];
    if ((top.l - b.l + 7) % 7 !== 5 || pc(top.s - b.s) !== 10) fail("aug 6th", q.show, q.answer);
    const pl = q.play[0]; if (pl.length !== ns.length || pl.some((m, j) => pc(m) !== ns[j].s) || pl.some((m, j) => j && m <= pl[j - 1])) fail("play", q.show, pl);
    if (!E.aug6write.check(q, ascii(q.answer))) fail("own answer refused", q.answer);
    if (ty === "It" && !E.aug6write.check(q, ascii(q.answer.replace(/ (\S+) /, " $1 $1 ")))) fail("doubled tonic refused", q.answer);
    if (E.aug6write.check(q, ascii(q.answer.split(" ").reverse().join(" ")))) fail("reversed accepted", q.answer);
  }
  if (keys.size < 6) fail("few keys", mode, ty, [...keys]);
}

// aug6: the staff shows what is played, and the shown notes make the answer's type
for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("aug6", `mode=${mode}&most=4&types=It,Fr,Ger,EnGer,V7N&clef=treble,bass`), seen = {};
  for (let i = 0; i < 1500; i++) {
    const q = E.aug6.make(s); total++; if (!q) { fail("no aug6"); break; }
    seen[q.answer] = (seen[q.answer] || 0) + 1;
    if (mode === "minor" && q.answer === "EnGer") fail("EnGer in minor");
    const ev = Ev.fromAbc(q.abc).sounding.filter(e => e.t_on < 1e-6).flatMap(e => e.notes).sort((a, b) => a - b);
    if (JSON.stringify(ev) !== JSON.stringify(q.play[0])) fail("abc vs play", q.abc, ev, q.play[0]);
    const T = pc(q.play[0][0] - 8), rel = q.play[0].map(m => pc(m - T)).slice(1);
    const want = { It: "0,6", Fr: "0,2,6", Ger: "0,3,6", EnGer: "0,3,6", V7N: "0,3,6" }[q.answer];
    if (rel.join() !== want) fail("sound", q.answer, rel);
    const k = /Key: (\S+)/.exec(q.label)[1], kt = TON(k.charAt(0).toUpperCase() + k.slice(1));
    if (kt.s !== T) fail("key", q.label, T);
    // where it goes: V for It / Fr, I64 then V for Ger / EnGer, the N (major triad a 4th up) for V7/N
    const last = q.play[q.play.length - 1].map(m => pc(m - T)).sort((a, b) => a - b).join();
    if (q.answer === "V7N") { if (pc(q.play[1][0] - T) !== 5 || !q.play[1].map(m => pc(m - T)).includes(1)) fail("N6", q.play[1].map(m => pc(m - T))); }
    else if (last !== "2,7,11") fail("not to V", q.answer, last);
    if (/Ger/.test(q.answer) && q.play.length !== 3) fail("Ger without I64");
  }
  if (Object.keys(seen).length !== (mode === "major" ? 5 : 4)) fail("types", mode, seen);
}

// aug6sym: both directions
for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("aug6sym", `mode=${mode}&most=4&types=It,Fr,Ger,EnGer&dir=both`);
  for (let i = 0; i < 1500; i++) {
    const q = E.aug6sym.make(s); total++; if (!q) { fail("no aug6sym"); break; }
    if (q.a6) {
      const sym = /: (\S+?)(7.*?) →/.exec(q.show), ty = /\(no 5th\)/.test(sym[2]) ? "It" : /♭5/.test(sym[2]) ? "Fr" : "Ger";
      const ok = ty === "Ger" && /I64/.test(q.show) && mode === "major" ? ["Ger", "EnGer"] : [ty];
      for (const t of ["It", "Fr", "Ger", "EnGer"]) if (E.aug6sym.check(q, t + "+6") !== ok.includes(t)) fail("name", q.show, t);
      if (!E.aug6sym.check(q, ok[0] === "Ger" ? "german" : ok[0].toLowerCase())) fail("plain name refused", q.show);
    } else {
      const ty = /: (\S+)\+6$/.exec(q.show)[1], m = /^(\S+?)7/.exec(q.answer), root = m[1];
      const T = TON(q.show.replace(/^In /, "")), r = nm(root);
      if ((r.l - T.l + 7) % 7 !== 5 || pc(r.s - T.s) !== 8) fail("root not ♭6", q.show, q.answer);
      const good = { It: ["7(no5)", "7 (no 5th)", "7"], Fr: ["7(b5)", "7b5", "7(♭5)"], Ger: ["7"], EnGer: ["7"] }[ty];
      for (const g of good) if (!E.aug6sym.check(q, ascii(root) + g)) fail("refused", q.show, root + g);
      const bad = ty === "Fr" ? ["7", "m7"] : ["7b5", "m7"];
      for (const b of bad) if (E.aug6sym.check(q, ascii(root) + b)) fail("accepted", q.show, root + b);
      const other = r.s === 7 ? "C7" : "G7"; if (E.aug6sym.check(q, other)) fail("wrong root accepted", q.show, other);
    }
  }
}

// aug6ear: the second chord sounds like its answer, the rest is I I64 V I
for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("aug6ear", `mode=${mode}&most=4`), seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const q = E.aug6ear.make(s); total++; seen.add(q.answer);
    const T = pc(q.play[0][0]), set = v => [...new Set(v.map(m => pc(m - T)))].sort((a, b) => a - b).join(), third = mode === "major" ? 4 : 3;
    if (set(q.play[0]) !== `0,${third},7` || set(q.play[4]) !== `0,${third},7` || set(q.play[2]) !== `0,${third},7` || pc(q.play[2][0] - T) !== 7) fail("frame", q.play);
    if (set(q.play[3]) !== "2,7,11") fail("V", q.play[3]);
    const want = { iv6: "0,5,8", N6: "1,5,8", It: "0,6,8", Fr: "0,2,6,8", Ger: "0,3,6,8" }[q.answer];
    if (set(q.play[1]) !== want) fail("pd", q.answer, set(q.play[1]));
    const bass = pc(q.play[1][0] - T); if (bass !== (q.answer === "N6" ? 5 : 8)) fail("pd bass", q.answer, bass);
  }
  if (seen.size !== 5) fail("ear types", [...seen]);
}
console.log(fails ? `${fails} failed of ${total}` : `${total} ok`);
process.exit(fails ? 1 : 0);
