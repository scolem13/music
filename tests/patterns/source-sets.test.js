// The pattern sets taken from the MLT books (Azzara & Grunow DMTI 1-3, JRI Recorder Teacher's Guide, Mullen's Literate Musician,
// JRI Music Play): every tonal pattern's written solfege equals the solfege computed from its pitches (movable DO, LA-based minor,
// RE Dorian, SO Mixolydian, MI Phrygian, FA Lydian, TI Locrian), and every rhythm pattern's measures add up to the meter.
//   node tests/patterns/source-sets.test.js
const path = require("path"), fs = require("fs"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
const E = require(R + "apps/shared/abc-events.js");
const load = (f, name) => new Function(fs.readFileSync(R + f, "utf8").replace(new RegExp("^const\\s+" + name + "\\s*=", "m"), "var " + name + "=") + ";return " + name)();
const TP = load("apps/patterns/pattern-set.js", "patternObject"), RP = load("apps/rhythms/rhythm-pattern-object.js", "rhythmPatternObject");
const SRC = /^(dmti[123]-|jri-recorder-|musicplay-|mullen-)/;
let n = 0;
const t = (name, f) => { try { f(); n++; console.log("ok  ", name); } catch (e) { console.error("FAIL " + name); throw e; } };
const tunes = (s) => String(s).split(/\n(?=X:)/).filter((x) => /X:/.test(x));

// ---------- tonal ----------
const DO = { major: 0, minor: 3, dorian: -2, mixolydian: -7, phrygian: -4, lydian: -5, locrian: 1 };
const SYL = ["do", "di", "re", "me", "mi", "fa", "fi", "so", "si", "la", "te", "ti"];
const ALIAS = { ri: "me", le: "si", ra: "di" };            // the book's names for the same pitch as me / si / di
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function keyOf(abc) {
  const m = /^K:\s*([A-G])([#b]?)\s*([A-Za-z]*)/m.exec(abc); assert.ok(m, "no K: line");
  const md = m[3].toLowerCase();
  const mode = /^mix/.test(md) ? "mixolydian" : /^dor/.test(md) ? "dorian" : /^phr/.test(md) ? "phrygian" : /^lyd/.test(md) ? "lydian" : /^loc/.test(md) ? "locrian" : /^m(in)?$|^aeo/.test(md) ? "minor" : "major";
  return { pc: (PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12, mode };
}
const tonalIds = Object.keys(TP).filter((id) => SRC.test(id) || id === "dmti-blue-notes");
t("the book sets are present", () => {
  for (const id of ["dmti1-unit4-tonal", "dmti2-unit1-tonal", "dmti3-unit2-tonal", "mullen-fpifo-phrygian", "musicplay-acculturation-tonal-major", "jri-recorder-tonal-major-tds-2-3"]) assert.ok(TP[id], id);
  assert.ok(tonalIds.length >= 25, "only " + tonalIds.length);
});
t("tonal: written solfege = solfege computed from the pitches, a chord on each, ABC reads back", () => {
  let total = 0;
  for (const id of tonalIds) for (const [i, tune] of tunes(TP[id]).entries()) {
    const k = keyOf(tune), w = (/^w:(.*)$/m.exec(tune) || [])[1];
    assert.ok(w, id + " #" + (i + 1) + " has no w: line");
    const midis = E.fromAbc(tune).sounding.map((e) => e.pitches[0].midi);
    const got = midis.map((m) => SYL[(((m - k.pc - DO[k.mode]) % 12) + 24) % 12]);
    const want = w.trim().toLowerCase().split(/\s+/).map((s) => ALIAS[s] || s);
    assert.deepStrictEqual(got, want, id + " #" + (i + 1));
    assert.strictEqual(midis.length, (tune.match(/[A-Ga-g][,']*0/g) || []).length, id + " #" + (i + 1) + " notes");
    if (!/^dmti-blue|^musicplay-acc|^mullen-fpifo-(locrian)/.test(id) || /"/.test(tune)) assert.ok(/"[^"]+"/.test(tune) || /stepwise|musicplay-acc|locrian/.test(id), id + " #" + (i + 1) + " has no chord");
    total++;
  }
  assert.ok(total > 300, "patterns checked: " + total);
});
// ---------- rhythm ----------
function bars(abc) {
  const body = abc.split("\n").filter((l) => !/^[A-Z]:/.test(l)).join(" ").replace(/"[^"]*"/g, "");
  const re = /\((\d)(?::(\d))?(?::(\d))?|([Bz])(\d*)(\/*)(\d*)|(\|)|([<>])/g, out = [0]; let m, trip = 0, f = 1, last = null, pend = null;
  while ((m = re.exec(body))) {
    if (m[1]) { const p = +m[1], q = m[2] ? +m[2] : (p === 3 ? 2 : p === 2 ? 3 : p === 4 ? 3 : 2); trip = m[3] ? +m[3] : p; f = q / p; continue; }
    if (m[8]) { out.push(0); last = null; continue; }
    if (m[9]) { pend = m[9]; continue; }
    let d = (m[5] ? +m[5] : 1); if (m[6]) d = m[7] ? d / +m[7] : d / Math.pow(2, m[6].length);
    if (trip > 0) { d *= f; trip--; }
    let dd = d;
    if (pend && last !== null) { out[out.length - 1] += pend === ">" ? d * 0.5 : d * 1.5; out[out.length - 1] += pend === ">" ? last.d * 0.5 : -last.d * 0.5; dd = 0; pend = null; last = null; continue; }
    out[out.length - 1] += dd; last = { d };
  }
  return out;
}
const LAX_TAIL = /^(dmti3-unit[12]-rhythm)$/;   // these end with a one-beat measure as printed
const rhythmIds = Object.keys(RP).filter((id) => SRC.test(id));
t("the rhythm book sets are present", () => {
  for (const id of ["dmti1-unit4-rhythm", "dmti2-unit3-rhythm", "dmti3-unit1-rhythm", "mullen-rhythm-duple-divisions", "musicplay-imitation-rhythm-triple"]) assert.ok(RP[id], id);
  assert.ok(rhythmIds.length >= 20, "only " + rhythmIds.length);
});
t("rhythm: full measures (a pickup may start short; some sets end on a short tail), no B// spelling, parses", () => {
  let total = 0;
  for (const id of rhythmIds) for (const [i, tune] of tunes(RP[id]).entries()) {
    const nm = /^M:\s*(\d+)\/(\d+)/m.exec(tune), nl = /^L:\s*(\d+)\/(\d+)/m.exec(tune);
    assert.ok(nm && nl, id + " #" + (i + 1) + " needs M: and L:");
    const bar = (+nm[1]) / (+nm[2]), u = (+nl[1]) / (+nl[2]), b = bars(tune).filter((x, j, a) => !(x === 0 && j === a.length - 1)).map((x) => x * u);
    assert.ok(!/B\/\/(?!\d)/.test(tune), id + " #" + (i + 1) + " uses B//");
    b.forEach((x, j) => {
      const full = Math.abs(x - bar) < 1e-9;
      if (full) return;
      assert.ok(x < bar, id + " #" + (i + 1) + " bar " + (j + 1) + " too long: " + x);
      const ok = j === 0 || (j === b.length - 1 && (LAX_TAIL.test(id) || Math.abs(x + b[0] - bar) < 1e-9));
      assert.ok(ok, id + " #" + (i + 1) + " bar " + (j + 1) + " is short: " + x + " of " + bar);
    });
    assert.ok(E.fromAbc(tune).sounding.length > 0, id + " #" + (i + 1) + " has no sounding notes");
    total++;
  }
  assert.ok(total > 150, "patterns checked: " + total);
});
console.log(n + " tests passed");
