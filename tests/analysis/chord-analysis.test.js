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
function fail(...a) { fails++; if (fails <= 15 || process.env.ALL) console.log("FAIL", ...a); }
function ok(c, ...a) { total++; if (!c) fail(...a); }

const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], pc = m => ((m % 12) + 12) % 12;
const C = {
  major: { I: "C E G", ii: "D F A", iii: "E G B", IV: "F A C", V: "G B D", vi: "A C E", "vii°": "B D F", "♭VII": "B♭ D F", "I+": "C E G♯", iv: "F A♭ C",
    "V/V": "D F♯ A", "V7/V": "D F♯ A C", "V/vi": "E G♯ B", "V7/vi": "E G♯ B D", "V/ii": "A C♯ E", "V7/ii": "A C♯ E G", "V/IV": "C E G", "V7/IV": "C E G B♭", "V/iii": "B D♯ F♯", "V7/iii": "B D♯ F♯ A",
    "vii°/V": "F♯ A C", "vii°7/V": "F♯ A C E♭", "viiø7/V": "F♯ A C E", "vii°/vi": "G♯ B D", "vii°7/vi": "G♯ B D F", "viiø7/vi": "G♯ B D F♯", "vii°/ii": "C♯ E G", "vii°7/ii": "C♯ E G B♭", "viiø7/ii": "C♯ E G B", "vii°7/iii": "D♯ F♯ A C",
    "♭VI": "A♭ C E♭", "♭III": "E♭ G B♭", "ii°": "D F A♭", "iiø7": "D F A♭ C", iv7: "F A♭ C E♭", N: "D♭ F A♭",
    IM7: "C E G B", ii7: "D F A C", iii7: "E G B D", IVM7: "F A C E", V7: "G B D F", vi7: "A C E G", "viiø7": "B D F A" },
  minor: { I: "C E G", N: "D♭ F A♭", i: "C E♭ G", "ii°": "D F A♭", III: "E♭ G B♭", iv: "F A♭ C", v: "G B♭ D", V: "G B D", VI: "A♭ C E♭", VII: "B♭ D F", "vii°": "B D F",
    "V/III": "B♭ D F", "V7/III": "B♭ D F A♭", "V/iv": "C E G", "V7/iv": "C E G B♭", "V/V": "D F♯ A", "V7/V": "D F♯ A C", "V/VI": "E♭ G B♭", "V7/VI": "E♭ G B♭ D♭", "V/VII": "F A C", "V7/VII": "F A C E♭",
    "vii°/V": "F♯ A C", "vii°7/V": "F♯ A C E♭", "viiø7/V": "F♯ A C E", "vii°/III": "D F A♭", "vii°7/III": "D F A♭ C♭", "vii°/iv": "E G B♭", "vii°7/iv": "E G B♭ D♭", "vii°7/VI": "G B♭ D♭ F♭", "vii°7/VII": "A C E♭ G♭",
    iv7: "F A♭ C E♭", V7: "G B D F", "iiø7": "D F A♭ C", VIM7: "A♭ C E♭ G", "vii°7": "B D F A♭" }
};
if (process.env.NEG) C.major.ii7 = "D F A C♯";
if (process.env.NEG) { C.major["♭VI"] = "A C E"; C.minor.N = "D F A"; C.major["V7/V"] = "D F♯ A C♯"; C.minor["vii°7/V"] = "F♯ A C E"; }
const parse = t => ({ l: LET.indexOf(t[0]), a: { "": 0, "♯": 1, "♭": -1 }[t.slice(1)] });
const nm = n => LET[n.l] + { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }[n.a];
function inKey(key, mode, base) {
  const t = key.tonic;
  return C[mode][base].split(" ").map(parse).map(n => { const l = (n.l + t.l) % 7, s = pc(NAT[n.l] + n.a + NAT[t.l] + t.a), a = ((s - NAT[l] + 18) % 12) - 6; return { l, a }; });
}
function split(tok) {   // "V65" -> ["V7", 1]; "IVM7" -> ["IVM7", 0]; "I6" -> ["I", 1]
  const sl = tok.indexOf("/"), tail = sl >= 0 ? tok.slice(sl) : ""; if (sl >= 0) tok = tok.slice(0, sl);
  const m = /^(.*?)(64|65|43|42|6)?$/.exec(tok); let base = m[1], f = m[2] || "";
  if (f === "65" || f === "43" || f === "42") base += "7";
  base += tail;
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
      ok(CA.check(q, i, CA.expected(q, i).replace(/ \(or .*$/, "")), tag, "expected refused", CA.expected(q, i));
      if (q.answer === "rn" && q.inv && !q.figs) ok(CA.check(q, i, it.rnSlash), tag, "slash form refused", it.rnSlash);
      if (q.inv && q.answer === "sym") { const wrong = CA.nm(c.notes[0]) + (CA.expected(q, i).replace(/^[A-G][♯♭]?/, "").replace(/\/.*$/, "")) + (c.inv ? "" : "/" + CA.nm(c.notes[1])); ok(!CA.check(q, i, wrong), tag, "wrong bass accepted", wrong); }
      if (q.answer === "rn") { const flip = it.rn.replace(/^([♭♯]?)([ivIV]+)/, (m0, a, r) => a + (r === r.toUpperCase() ? r.toLowerCase() : r.toUpperCase())); if (!/[°ø+]/.test(it.rn) && c.cat !== "N") ok(!CA.check(q, i, flip), tag, "wrong case accepted", flip); }
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
// ch. 9 function: labels from a table written out here (Hutchinson's Harmonic Function chapter: T = I; TP = vi iii, IV into I; PD = ii IV;
// D = V vii, I64 into V), the cadence from the last two chords; the checkers take a right label and refuse the others
const FN = { I: "T", i: "T", ii: "PD", "ii°": "PD", iii: "TP", III: "TP", IV: "PD", iv: "PD", V: "D", vi: "TP", VI: "TP", "vii°": "D" };
if (process.env.NEG) FN.ii = "D";
for (let k = 0; k < 150; k++) {
  const q = CA.make(CA.parseSettings("level=ch9&texture=" + CA.STAGES[k % 5] + "&mode=both&most=3&seed=" + (k * 104729 + 7))), tag = "ch9/" + k;
  if (!q) { ok(false, tag, "no passage"); continue; }
  const toks = q.prog.split(" "), base = t => t.replace(/(64|6)$/, "");
  ok(q.fn === true && q.items.every(it => it.fn), tag, "no functions");
  toks.forEach((t, i) => {
    let want = FN[base(t)];
    if (/^IV$|^iv$/.test(base(t)) && toks[i + 1] && /^[Ii]$/.test(toks[i + 1])) want = "TP";
    if (/^[Ii]64$/.test(t) && /^V$/.test(toks[i + 1])) want = "D";
    ok(q.items[i].fn === want, tag, t, "function", q.items[i].fn, "table", want, q.prog);
    ok(CA.checkFn(q, i, q.items[i].fn) && CA.checkFn(q, i, " " + q.items[i].fn.toLowerCase()), tag, "right function refused");
    ["T", "TP", "PD", "D"].filter(f => f !== q.items[i].fn).forEach(f => ok(!CA.checkFn(q, i, f), tag, "wrong function accepted", f));
    ok(!CA.checkFn(q, i, ""), tag, "empty function accepted");
    const st = CA.steps(q, i); ok(/^Function$/.test(st[st.length - 2].h) && st[st.length - 2].t.indexOf("Answer: " + q.items[i].fn) > 0, tag, "function step");
  });
  const n = toks.length, last = base(toks[n - 1]), prev = base(toks[n - 2] || "");
  const cad = /^V$/.test(last) ? "half" : /^[Ii]$/.test(last) && /^(V|vii°)$/.test(prev) ? "authentic" : /^[Ii]$/.test(last) && /^[Ii][Vv]$/.test(prev) ? "plagal" : /^(vi|VI)$/.test(last) && prev === "V" ? "deceptive" : null;
  ok(q.cadence === cad && cad, tag, "cadence", q.cadence, "table", cad, q.prog);
  const wrongs = { authentic: "plagal", plagal: "half", deceptive: "authentic", half: "deceptive" };
  ok(CA.checkCadence(q, q.cadence) && !CA.checkCadence(q, wrongs[q.cadence]) && !CA.checkCadence(q, ""), tag, "cadence check", q.cadence);
}
const cq = CA.make(CA.parseSettings("level=ch9&key=C major&prog=I IV I64 V I&texture=broken"));
ok(cq.items.map(x => x.fn).join() === "T,PD,D,D,T" && cq.cadence === "authentic" && CA.checkCadence(cq, "PAC") && CA.checkCadence(cq, "Authentic"), "ch9 worked example", cq.items.map(x => x.fn).join());
const cp = CA.make(CA.parseSettings("level=ch9&key=C major&prog=I V I IV I&texture=broken"));
ok(cp.items.map(x => x.fn).join() === "T,D,T,TP,T" && cp.cadence === "plagal", "ch9 IV into I is TP", cp.items.map(x => x.fn).join());
// a ch. 9 passage rebuilt from its settings (the report replay) has the same functions
{ const q0 = CA.make(CA.parseSettings("level=ch9&texture=satb&seed=4242")), q1 = CA.make(CA.parseSettings("level=ch9&texture=satb&seed=4242"));
  ok(q0.abc === q1.abc && q0.items.map(x => x.fn).join() === q1.items.map(x => x.fn).join() && q0.cadence === q1.cadence, "ch9 replay"); }

// ch. 10 non-chord tones: read back from the drawn ABC (voice 1, one note at a time), each marked note must obey its kind's rule
// (Hutchinson ch. 10: passing = step in, step on the same way; neighbor = step in, step back to the same note; escape = step in, leap out
// the other way; appoggiatura = leap in, step out, on the beat; suspension = the last note held over onto the beat, steps down;
// anticipation = a step in, the next chord's note early and then repeated)
{
  const seen = {}, pcs = c => new Set(c.notes.map(n => pc(NAT[n.l] + n.a))), sg = x => Math.sign(x);
  for (let k = 0; k < 250; k++) {
    const q = CA.make(CA.parseSettings("level=ch10&texture=" + CA.STAGES[k % 5] + "&mode=both&most=4&seed=" + (k * 3331 + 5))), tag = "ch10/" + k;
    if (!q) { ok(false, tag, "no passage"); continue; }
    ok(q.texture === "melody" && q.nctNamed && q.ncts.length >= 1 && q.ncts.every(x => x.label && CA.NCT_KINDS.includes(x.kind)), tag, "marked non-chord tones");
    ok(q.ncts.every(x => q.abc.includes('"_' + x.label + '"')), tag, "labels drawn");
    const mel = Ev.fromAbc(q.abc, { voice: "1" }).sounding.map(x => ({ t: x.t_on, m: (x.notes || x.pitches.map(p => p.midi))[0] }));
    q.ncts.forEach(x => {
      const i = mel.findIndex(n => Math.abs(n.t - x.t / 2) < 1e-9); if (i < 0) { ok(false, tag, "nct not in the melody", x.label); return; }
      const p = mel[i - 1], n = mel[i + 1], m = mel[i].m, onBeat = Math.abs(mel[i].t % 1) < 1e-9, step = d => Math.abs(d) === 1 || Math.abs(d) === 2;
      seen[x.kind] = (seen[x.kind] || 0) + 1;
      ok(x.acc === onBeat, tag, x.kind, "accent flag", x.acc, onBeat);
      const cs = q.items.map(it => pcs(it.chord)), mp = pc(m);
      ok(!cs[x.ci].has(mp) || x.kind === "suspension", tag, x.kind, "is a chord tone"); if (x.kind === "suspension") ok(!cs[x.ci].has(mp), tag, "suspension in the chord");
      if (!p || !n) { ok(x.kind === "anticipation" ? !!p : false, tag, x.kind, "needs a note each side"); }
      if (x.kind === "passing") ok(p && n && step(m - p.m) && step(n.m - m) && sg(m - p.m) === (process.env.NEG ? -sg(n.m - m) : sg(n.m - m)) && !onBeat, tag, "passing", p && p.m, m, n && n.m);
      if (x.kind === "neighbor") ok(p && n && step(m - p.m) && n.m === p.m && !onBeat, tag, "neighbor");
      if (x.kind === "escape") ok(p && n && step(m - p.m) && Math.abs(n.m - m) >= 3 && sg(n.m - m) === -sg(m - p.m) && !onBeat, tag, "escape");
      if (x.kind === "appoggiatura") ok(p && n && Math.abs(m - p.m) >= 3 && step(n.m - m) && onBeat && cs[x.ci].has(pc(n.m)), tag, "appoggiatura");
      if (x.kind === "suspension") ok(p && n && p.m === m && n.m < m && step(n.m - m) && onBeat && cs[x.ci - 1].has(mp) && cs[x.ci].has(pc(n.m)), tag, "suspension");
      if (x.kind === "anticipation") ok(p && n && step(m - p.m) && n.m === m && !onBeat && cs[x.ci + 1].has(mp) && !cs[x.ci].has(mp), tag, "anticipation");
    });
    q.ncts.forEach((x, j) => { ok(CA.checkNct(q, j, x.kind), tag, "right kind refused"); CA.NCT_KINDS.filter(kd => kd !== x.kind).forEach(kd => ok(!CA.checkNct(q, j, kd), tag, "wrong kind accepted", kd)); });
  }
  CA.NCT_KINDS.forEach(kd => ok((seen[kd] || 0) >= 10, "ch10: kind made often enough", kd, seen[kd] || 0));
}

// ch. 16 figures: the answer is the template's figure (not a slash), "Cad64" is right only for an I64 directly before V
for (let k = 0; k < 150; k++) {
  const q = CA.make(CA.parseSettings("level=ch16&texture=" + CA.STAGES[k % 5] + "&mode=both&most=3&seed=" + (k * 7919 + 3))), tag = "ch16/" + k;
  if (!q) { ok(false, tag, "no passage"); continue; }
  const toks = q.prog.split(" ");
  ok(q.figs === true && q.inv && q.items.length === toks.length, tag, "figs level");
  toks.forEach((tk, i) => {
    const it = q.items[i], rh = q.texture === "rh";
    const isCad = /^[Ii]64$/.test(tk) && /^V/.test(toks[i + 1] || "") && !(process.env.NEG && i === 0);
    ok(it.cad64 === isCad, tag, "cad64 flag", i, tk, it.cad64);
    if (rh) return;
    ok(CA.check(q, i, tk) && it.rn === tk, tag, "figure answer", tk, it.rn);
    ok(!/(64|65|43|42|6)$/.test(tk) || !CA.check(q, i, tk.replace(/(64|65|43|42|6)$/, "") + "/3rd"), tag, "slash refused", tk);
    ok(CA.check(q, i, "Cad64") === isCad && CA.check(q, i, "cad 6/4") === isCad, tag, "Cad64", tk, isCad);
  });
}
{ const q = CA.make(CA.parseSettings("level=ch16&key=C major&prog=I IV I64 V I&texture=broken"));
  ok(q.items.map(x => x.cad64).join() === "false,false,true,false,false" && CA.check(q, 2, "I64") && CA.check(q, 2, "Cad64") && !CA.check(q, 2, "I/5th") && !CA.check(q, 0, "Cad64") && !CA.check(q, 2, "I6"), "ch16 worked example");
  const w = CA.make(CA.parseSettings("level=ch16&key=C major&prog=I V64 I6 ii65 V7 I&texture=broken"));
  ok(CA.check(w, 1, "V64") && !CA.check(w, 1, "Cad64") && CA.check(w, 3, "ii65") && !CA.check(w, 3, "ii7/5th") && CA.check(w, 2, "I6"), "ch16 figures"); }

// ch. 17 / 18: the applied chord's root is a perfect 5th above (V) or a half step below (vii) the root of the chord that follows it, by
// semitones; its name is the slash form; the plain numeral is refused
for (const lv of ["ch17", "ch18"]) for (let k = 0; k < 120; k++) {
  const q = CA.make(CA.parseSettings("level=" + lv + "&texture=" + CA.STAGES[k % 5] + "&mode=both&most=4&seed=" + (k * 6007 + 11))), tag = lv + "/" + k;
  if (!q) { ok(false, tag, "no passage"); continue; }
  const toks = q.prog.split(" "), rt = c => pc(NAT[c.notes[0].l] + c.notes[0].a);
  toks.forEach((tk, i) => {
    if (!tk.includes("/")) return;
    const c = q.items[i].chord, nx = q.items[i + 1].chord, d = pc(rt(c) - rt(nx));
    const want = lv === "ch17" ? 7 : 1;   // V: 5th above = 7 semitones above the target; vii: a half step below = 11 up
    ok(d === (lv === "ch17" ? 7 : 11) && c.cat === "applied", tag, "root relation", tk, d, want);
    ok(lv === "ch17" ? /^(maj|dom7)$/.test(c.q) : /^(dim|dim7|hdim7)$/.test(c.q), tag, "quality", tk, c.q);
    if (q.texture !== "rh") ok(CA.check(q, i, tk) && !CA.check(q, i, tk.split("/")[0]) && CA.check(q, i, tk.replace(/ø/, "h")), tag, "applied answer", tk);
    const st = CA.steps(q, i); ok(st.some(x => x.h === "Applied chord") && !st.some(x => x.h === "Scale degree"), tag, "applied step", tk);
  });
}
{ const q = CA.make(CA.parseSettings("level=ch17&key=C major&prog=I V65/V V I&texture=broken"));
  ok(CA.check(q, 1, "V65/V") && CA.check(q, 1, "V6/5/V") && !CA.check(q, 1, "V65") && !CA.check(q, 1, "V65/IV") && !CA.check(q, 1, "II65"), "ch17 worked example"); }
{ const q = CA.make(CA.parseSettings("level=ch18&key=a minor&prog=i viiø65/V V i&texture=broken")), c = q.items[1].chord;
  ok(c.notes.map(nm).join(" ") === "D♯ F♯ A C♯" && nm(c.bass) === "F♯" && CA.check(q, 1, "viiø65/V") && !CA.check(q, 1, "vii°65/V"), "ch18 worked example", c.notes.map(nm).join(" ")); }

// ch. 19 / 20: every borrowed chord has a note lowered from the major scale (by letter and semitone, checked here), the Picardy I is
// the only major tonic chord in a minor key; the Neapolitan is a major triad on the lowered 2nd with the 3rd in the bass (N6)
for (let k = 0; k < 150; k++) {
  const q = CA.make(CA.parseSettings("level=ch19&texture=" + CA.STAGES[k % 5] + "&mode=both&most=4&seed=" + (k * 5003 + 1))), tag = "ch19/" + k;
  if (!q) { ok(false, tag, "no passage"); continue; }
  const MAJS = [0, 2, 4, 5, 7, 9, 11];
  q.prog.split(" ").forEach((tk, i) => {
    const c = q.items[i].chord, sc = (c.notes[0].l - q.key.tonic.l + 7) % 7;
    const lowered = c.notes.some(n => { const d = (n.l - q.key.tonic.l + 7) % 7, semi = pc(NAT[n.l] + n.a - NAT[q.key.tonic.l] - q.key.tonic.a); return q.key.mode === "major" && semi < MAJS[d]; });
    if (q.key.mode === "major") ok(/^(iv|♭|ii[°ø])/.test(tk) === lowered, tag, "borrowed", tk, lowered);
    if (q.key.mode === "minor" && tk === "I") ok(c.q === "maj" && sc === 0 && i === q.items.length - 1, tag, "Picardy", tk);
    if (q.texture !== "rh") ok(CA.check(q, i, tk) && CA.check(q, i, tk.replace("♭", "b")), tag, "answer", tk);
    if (lowered) ok(CA.steps(q, i).some(x => x.h === "Borrowed chord"), tag, "borrowed step", tk);
  });
}
for (let k = 0; k < 150; k++) {
  const q = CA.make(CA.parseSettings("level=ch20&texture=" + CA.STAGES[k % 5] + "&mode=both&most=4&seed=" + (k * 3989 + 2))), tag = "ch20/" + k;
  if (!q) { ok(false, tag, "no passage"); continue; }
  q.prog.split(" ").forEach((tk, i) => {
    if (!/^N/.test(tk)) return;
    const c = q.items[i].chord, t = q.key.tonic, d2 = pc(NAT[c.notes[0].l] + c.notes[0].a - NAT[t.l] - t.a);
    ok(d2 === 1 && (c.notes[0].l - t.l + 7) % 7 === 1 && c.q === "maj" && c.cat === "N", tag, "Neapolitan is a major triad on the lowered 2nd", tk);
    if (q.texture !== "rh") ok(CA.check(q, i, tk) && CA.check(q, i, tk.replace("N", "♭II")) && CA.check(q, i, tk.replace("N", "bII")) && !CA.check(q, i, tk.replace("N", "II")), tag, "N answer", tk);
    ok(CA.steps(q, i).some(x => x.h === "Neapolitan"), tag, "N step");
  });
}

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
