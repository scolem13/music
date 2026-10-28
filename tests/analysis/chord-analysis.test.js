// The chord-analysis exercises (apps/shared/analysis/chord-analysis.js) in Node. For every level and stage, many passages:
//  - each chord's spelled notes match a table written out here by hand in C major and C minor, moved to the key by letter steps
//    and semitones; its bass is the figure's chord member (the right-hand stage: the lowest note written);
//  - the drawn ABC, read back by AbcEvents: every bar of every voice is 4 quarters long, and inside each chord's span the notes
//    sounded (non-chord tones aside) are exactly the chord's pitch classes, the lowest of them the bass; a non-chord tone is not
//    a chord tone; the guitar's TAB frets sound the written notes an octave down;
//  - the expected name, its other form (/3rd for 6) and the stack in root position are accepted; a wrong bass, a wrong case,
//    a rotated stack, a stack with a doubling or a non-chord tone are refused; the steps end with the answer.
//   node tests/analysis/chord-analysis.test.js        NEG=1: a wrong table entry, which must fail
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const mem = {}, win = { btoa, atob, unescape, escape, location: { pathname: "/theory/chord-analysis.html" }, localStorage: { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); } } }; win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/report/record.js", "utf8"), win);
vm.runInContext(fs.readFileSync(R + "apps/shared/analysis/chord-analysis.js", "utf8"), win);
const SR = win.SiteRecord;
const CA = win.ChordAnalysis;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails <= 15) console.log("FAIL", ...a); }
function ok(c, ...a) { total++; if (!c) fail(...a); }

const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], pc = m => ((m % 12) + 12) % 12;
const C = {
  major: { I: "C E G", ii: "D F A", iii: "E G B", IV: "F A C", V: "G B D", vi: "A C E", "vii°": "B D F", "♭VII": "B♭ D F", "I+": "C E G♯", iv: "F A♭ C",
    IM7: "C E G B", ii7: "D F A C", iii7: "E G B D", IVM7: "F A C E", V7: "G B D F", vi7: "A C E G", "viiø7": "B D F A" },
  minor: { i: "C E♭ G", "ii°": "D F A♭", III: "E♭ G B♭", iv: "F A♭ C", v: "G B♭ D", V: "G B D", VI: "A♭ C E♭", VII: "B♭ D F", "vii°": "B D F",
    iv7: "F A♭ C E♭", V7: "G B D F", "iiø7": "D F A♭ C", VIM7: "A♭ C E♭ G", "vii°7": "B D F A♭" }
};
if (process.env.NEG) C.major.ii7 = "D F A C♯";
const parse = t => ({ l: LET.indexOf(t[0]), a: { "": 0, "♯": 1, "♭": -1 }[t.slice(1)] });
const nm = n => LET[n.l] + { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }[n.a];
function inKey(key, mode, base) {
  const t = key.tonic;
  return C[mode][base].split(" ").map(parse).map(n => { const l = (n.l + t.l) % 7, s = pc(NAT[n.l] + n.a + NAT[t.l] + t.a), a = ((s - NAT[l] + 18) % 12) - 6; return { l, a }; });
}
function split(tok) {   // "V65" -> ["V7", 1]; "IVM7" -> ["IVM7", 0]; "I6" -> ["I", 1]
  const m = /^(.*?)(64|65|43|42|6)?$/.exec(tok); let base = m[1], f = m[2] || "";
  if (f === "65" || f === "43" || f === "42") base += "7";
  return [base, { "": 0, "6": 1, "64": 2, "65": 1, "43": 2, "42": 3 }[f]];
}

const N = +process.env.N || 120;
CA.LEVELS.forEach(L => CA.STAGES.concat(["satb-treble"]).forEach(stage => {
  for (let k = 0; k < N; k++) {
    const tex = stage === "satb-treble" ? "satb" : stage;
    const s = CA.parseSettings("level=" + L.id + "&texture=" + tex + "&mode=both&most=5&tenor=" + (stage === "satb-treble" ? "treble" : "bass") + "&seed=" + (k * 7919 + 13));
    const q = CA.make(s), tag = L.id + "/" + stage + "/" + k;
    if (!q) { ok(false, tag, "no passage"); continue; }
    const toks = q.prog.split(" ");
    // the ABC, voice by voice
    const evs = q.voices.map(v => Ev.fromAbc(q.abc, { voice: v.id }));
    evs.forEach((e, vi) => {
      const len = {}; e.written.forEach(w => { len[w.bar] = (len[w.bar] || 0) + (w.t_off - w.t_on); });
      ok(Object.keys(len).length === q.bars && Object.values(len).every(x => Math.abs(x - 4) < 1e-9), tag, "bar lengths, voice", vi, JSON.stringify(len));
    });
    const nctT = q.ncts.map(x => x.t / 2);
    q.items.forEach((it, i) => {
      const c = it.chord, [base, inv] = split(toks[i]);
      const want = inKey(q.key, q.key.mode, base);
      ok(want.map(nm).join(" ") === c.notes.map(nm).join(" "), tag, "chord", i + 1, toks[i], "in", q.key.label, ":", c.notes.map(nm).join(" "), "table", want.map(nm).join(" "));
      if (tex !== "rh") ok(nm(c.bass) === nm(c.notes[inv]), tag, "bass of", toks[i]);
      // what the ABC sounds in the span
      const t0 = it.span.start / 2, t1 = (it.span.start + it.span.len) / 2, heard = [];
      evs.forEach(e => e.sounding.forEach(x => { if (x.t_on >= t0 - 1e-9 && x.t_on < t1 - 1e-9 && !nctT.some(t => Math.abs(t - x.t_on) < 1e-9 && e === evs[0])) (x.notes || x.pitches.map(p => p.midi)).forEach(m => heard.push(m)); }));
      const hp = [...new Set(heard.map(pc))].sort((a, b) => a - b).join(), cp = [...new Set(c.notes.map(n => pc(NAT[n.l] + n.a)))].sort((a, b) => a - b).join();
      ok(hp === cp, tag, "chord", i + 1, "sounds", hp, "wants", cp);
      ok(pc(Math.min(...heard)) === pc(NAT[c.bass.l] + c.bass.a), tag, "chord", i + 1, "lowest note is not the bass");
      // names
      ok(CA.check(q, i, CA.expected(q, i)), tag, "expected refused", CA.expected(q, i));
      if (q.answer === "rn" && q.inv) ok(CA.check(q, i, it.rnSlash), tag, "slash form refused", it.rnSlash);
      if (q.inv && q.answer === "sym") { const wrong = CA.nm(c.notes[0]) + (CA.expected(q, i).replace(/^[A-G][♯♭]?/, "").replace(/\/.*$/, "")) + (c.inv ? "" : "/" + CA.nm(c.notes[1])); ok(!CA.check(q, i, wrong), tag, "wrong bass accepted", wrong); }
      if (q.answer === "rn") { const flip = it.rn.replace(/^([♭♯]?)([ivIV]+)/, (m0, a, r) => a + (r === r.toUpperCase() ? r.toLowerCase() : r.toUpperCase())); if (!/[°ø+]/.test(it.rn)) ok(!CA.check(q, i, flip), tag, "wrong case accepted", flip); }
      // stacks
      ok(CA.checkStack(q, i, c.notes).ok, tag, "root-position stack refused");
      ok(!CA.checkStack(q, i, c.notes.slice(1).concat([c.notes[0]])).ok, tag, "rotated stack accepted");
      ok(!CA.checkStack(q, i, c.notes.concat([c.notes[0]])).ok, tag, "doubled stack accepted");
      q.ncts.filter(x => x.ci === i).forEach(x => {
        ok(!c.notes.some(n => pc(NAT[n.l] + n.a) === pc(NAT[x.note.l] + x.note.a)), tag, "non-chord tone is a chord tone", nm(x.note));
        ok(!CA.checkStack(q, i, c.notes.concat([x.note])).ok, tag, "stack with a non-chord tone accepted");
      });
      const st = CA.steps(q, i); ok(st.length > 3 && st[st.length - 1].t.indexOf(CA.expected(q, i)) === 0, tag, "steps end", st[st.length - 1].t);
      if (q.shapes) {
        const fr = q.shapes[i].frets, sounded = [40, 45, 50, 55, 59, 64].map((s0, j) => fr[j] == null ? null : s0 + fr[j]).filter(x => x != null).sort((a, b) => a - b);
        const written = q.shapes[i].notes.map(CA.midi).sort((a, b) => a - b);
        ok(sounded.map(m => m + 12).join() === written.join(), tag, "TAB and staff differ", sounded, written);
      }
    });
    if (tex === "melody") ok(true); // non-chord tones counted above
  }
}));
// typed forms the page promises
const q7 = CA.make(CA.parseSettings("level=ch8b&texture=broken&key=C major&prog=I V65 I ii42 V7 I"));
[["V65", 1, true], ["V6/5", 1, true], ["V7/3rd", 1, true], ["V7", 1, false], ["v65", 1, false], ["ii42", 3, true], ["ii2", 3, true], ["ii7/7th", 3, true], ["II42", 3, false]]
  .forEach(([t, i, want]) => ok(CA.check(q7, i, t) === want, "typed", t, "should be", want));
const qs = CA.make(CA.parseSettings("level=ch6b&texture=broken&key=C major&prog=I V6 vi IV"));
[["G/B", 1, true], ["G", 1, false], ["g/B", 1, false], ["Am", 2, true], ["a", 2, true], ["A", 2, false]].forEach(([t, i, want]) => ok(CA.check(qs, i, t) === want, "typed", t, "should be", want));
const qk = CA.make(CA.parseSettings("level=ch7a&key=b minor&prog=i iv V i&texture=broken"));
[["b minor", true], ["Bm", true], ["b", true], ["B", false], ["D major", false]].forEach(([t, want]) => ok(CA.checkKey(qk, t) === want, "key", t));
ok(CA.parseNotes("Eb g bb").map(nm).join() === "E♭,G,B♭", "parseNotes");

// reports: a passage rebuilt from its recorded settings is the same passage; the code round-trips; an edited code is caught
for (const st of CA.STAGES) {
  const q0 = CA.make(CA.parseSettings("level=ch8b&texture=" + st + "&seed=99")), str = CA.SETTINGS.map(d => d.id + "=" + encodeURIComponent(CA.parseSettings("level=ch8b&texture=" + st)[d.id])).join("&") + "&seed=" + q0.seed;
  ok(CA.make(CA.parseSettings(str)).abc === q0.abc, "report: passage rebuilt the same", st);
}
// the shared record: items kept, "today" leaves out older ones, the code round-trips (wrapped, with text around it), an edit is caught
const pas = { s: "level=ch7a&texture=satb&seed=5", k: [], c: [{ st: [["C E G", 1, 4]], nm: [["IV", 0, 9], ["I", 1, 12]], h: 2, rv: 0 }] };
const old = SR.add("drill", { ex: "Intervals", q: { text: "Name this interval." }, want: "P5" }); old.t -= 3 * 86400000; old.at.push(["M6", 0, 3]); SR.save();
const now = SR.add("drill", { ex: "Intervals", q: { text: "Name this interval." }, want: "m3" }); now.at.push(["m3", 1, 2]); SR.save();
const ca = SR.add("chord-analysis", { ex: "Chord analysis", d: pas }); SR.save();
ok(SR.pick("today").length === 2 && SR.pick("all").length === 3, "today leaves out older work", SR.pick("today").length, SR.pick("all").length);
ok(JSON.parse(mem["site-record-v1"]).items.length === 3, "the record is saved");
const data = { v: 1, n: "Zoë Ångström", range: "today", d: Date.now(), items: SR.pick("today") };
const code = SR.code(data), back = SR.readCode("Report code:\n" + code.slice(0, 40) + "\n" + code.slice(40));
ok(back && back.ok && JSON.stringify(back.data) === JSON.stringify(data), "report code round trip");
const forged = SR.code(Object.assign({}, data, { n: "x" })).split(".")[1];
ok(SR.readCode("SR1." + forged + "." + code.split(".")[2]).ok === false, "an edited report is caught");
const o = CA.summaryOf([pas]); ok(o.stackFirst === 1 && o.nameFirst === 0 && o.nameRight === 1 && o.steps === 2, "chord-analysis summary", JSON.stringify(o));
CA.withRecord(() => {});   // registers the chord-analysis renderer
const txt = SR.text(data);
ok(/Chord 1: stack ✓ C E G \| name ✗ IV  ·  ✓ I \| steps ×2/.test(txt) && /Name this interval\. → ✓ m3/.test(txt) && !/M6/.test(txt) && /SR1\./.test(txt), "report text: today's drill and passage, not the old one");

console.log((fails ? "FAILED " + fails : "ok") + " — " + total + " checks");
process.exit(fails ? 1 : 0);
