// DMTI skills (apps/shared/mlt/dmti-skills.js): every generated exercise parses with abcjs, every bar is full, strong-beat notes
// are chord tones, the Skill 2 parts hold or move by step (a third at most), the same seed gives the same example.
//   node tests/mlt/dmti-skills.test.js [--print]      (NEG=1 breaks a bar on purpose: must fail)
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const R = path.join(__dirname, "../..");
global.window = global;
require(R + "/apps/shared/abc-core.js"); require(R + "/apps/shared/abc-events.js"); require(R + "/apps/shared/band/harmony.js");
const D = require(R + "/apps/shared/mlt/dmti-skills.js");
const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } }; ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + "/apps/shared/abcjs-basic.js", "utf8"), ctx);
const tunes = vm.runInNewContext(fs.readFileSync(R + "/apps/tunes/tunes-object.js", "utf8") + ";tunesObject");
const rpo = vm.runInNewContext(fs.readFileSync(R + "/apps/rhythms/rhythm-pattern-object.js", "utf8") + ";rhythmPatternObject");
const po = vm.runInNewContext(fs.readFileSync(R + "/apps/patterns/pattern-set.js", "utf8") + ";patternObject");
const DMTI = require(R + "/apps/shared/mlt/books/dmti.js");
function tuneAbc(id) { for (const k in tunes) for (const t of String(tunes[k]).split(/\n(?=X:)/)) if (new RegExp("^%%id\\s+" + id + "\\s*$", "m").test(t)) return t; }
function bars(abc) {
  const r = ctx.ABCJS.parseOnly(abc)[0], m = r.getMeterFraction(), want = m.num / m.den, lens = []; let cur = 0, tup = 1;
  for (const line of r.lines) for (const st of line.staff || []) for (const v of st.voices) for (const e of v) {
    if (e.el_type === "note") { if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier; cur += (e.duration || 0) * tup; if (e.endTriplet) tup = 1; }   // tuplets, as in clean-tunes.mjs
    else if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; } }
  if (cur > 0) lens.push(cur);
  return { want, lens, warn: (r.warnings || []).filter(w => !/No tempo/i.test(w)) };
}
const TRIP = new Set();
let n = 0, PRINT = process.argv.includes("--print");
const SKILLS = ["bass", "roots", "voices", "hrhythm", "partRhy", "macro", "tonalRhy", "embellish", "series", "rseries", "answer"];
for (const u of DMTI.units.filter(u => u.ready)) {
  const abc = tuneAbc(u.tune); assert.ok(abc, u.id + " tune " + u.tune);
  const tune = D.parse(abc), sets = { rhythm: D.rhythmBars(rpo[u.rhythm], tune.bq), tonal: D.tonalPatterns(po[u.tonal]) };
  assert.ok(sets.rhythm.length >= 4, u.id + " rhythm bars"); assert.ok(sets.tonal.length >= 4, u.id + " tonal patterns");
  for (const sk of SKILLS) for (const seed of [1, 2, 3]) {
    const res = D.make(sk, tune, sets, seed, { part: seed % 4 });
    for (const p of res.parts) {
      let a = p.abc; if (process.env.NEG && sk === "roots") a = a.replace(" |", "z2 |");
      const b = bars(a);
      const bad = b.lens.filter(l => Math.abs(l - b.want) > 1e-6);
      if (/\(3:/.test(a)) TRIP.add(u.id + " " + sk);
      assert.ok(!bad.length, `${u.id} ${sk} seed ${seed}: bar lengths ${b.lens.join(",")}\n${a}`);
      assert.ok(!b.warn.length, `${u.id} ${sk}: ${b.warn.join("; ")}\n${a}`);
      if (PRINT && seed === 1) console.log("--- " + sk + ": " + p.label + "\n" + a);
      n++;
    }
    assert.deepStrictEqual(D.make(sk, tune, sets, seed, { part: seed % 4 }), res, sk + " same seed, same example");
  }
  // strong beats are chord tones (roots, macro, tonalRhy)
  for (const sk of ["roots", "macro", "tonalRhy"]) {
    const ev = window.AbcEvents.fromAbc(D.make(sk, tune, sets, 7).parts[0].abc);
    ev.sounding.forEach(e => { if (Math.abs(e.t_on % tune.macro) > 1e-6) return;
      const c = D.chordAt(tune, e.t_on), pcs = c.tones.map(x => (c.root + x) % 12).concat(c.fn === "dominant" ? [(c.root + 10) % 12] : []);   // a dominant pattern may use the 7th
      const vocab = sets.tonal.filter(p => p.fn === c.fn).flatMap(p => p.steps.map(x => (tune.tonic + x + 120) % 12));   // or a note of the unit's own patterns for that function (blue notes)
      assert.ok(pcs.includes(e.pitches[0].midi % 12) || (sk !== "roots" && vocab.includes(e.pitches[0].midi % 12)), `${u.id} ${sk}: ${e.pitches[0].midi} at ${e.t_on} not in ${c.sym}`); });
  }
  // Skill 2: each voice holds or moves by step (a minor third at most, as from V7 back to iv)
  const v = D.voiceChain(tune, tune.ch);
  for (let i = 1; i < v.length; i++) for (let k = 0; k < 3; k++) assert.ok(Math.abs(v[i][k] - v[i - 1][k]) <= 3, `${u.id} voice ${k} leaps at chord ${i}`);
  console.log("ok   " + u.id + " " + u.title);
}
assert.ok([...TRIP].some(x => /^d2u3 (roots|partRhy|tonalRhy)/.test(x)), "Motherless Child's triplet rhythms are used, written as tuplets");
console.log("tuplets in: " + [...TRIP].join(", "));
console.log("DMTI SKILLS OK (" + n + " exercises)");
