// Hear, Compare, Translate (apps/patterns/audiation.js): the data it builds from the pattern sets. node tests/patterns/audiation.test.js
const path = require("path"), fs = require("fs"), assert = require("assert");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js");
const E = require(R + "apps/shared/abc-events.js");
const load = (f, name) => new Function(fs.readFileSync(R + f, "utf8").replace(new RegExp("^const\\s+" + name + "\\s*="), "var " + name + "=") + ";return " + name)();
global.patternObject = load("apps/patterns/pattern-set.js", "patternObject");
global.rhythmPatternObject = load("apps/rhythms/rhythm-pattern-object.js", "rhythmPatternObject");
const A = require(R + "apps/patterns/audiation.js");
let n = 0;
const t = (name, f) => { try { f(); n++; console.log("ok  ", name); } catch (e) { console.error("FAIL " + name); throw e; } };

t("solfege: movable DO, LA-based minor, RE Dorian, SO Mixolydian", () => {
  assert.strictEqual(A.solfege(62, 62, "major"), "do");
  assert.strictEqual(A.solfege(62, 62, "minor"), "la");
  assert.strictEqual(A.solfege(61, 62, "minor"), "si");          // the raised 7th of harmonic minor
  assert.strictEqual(A.solfege(62, 62, "dorian"), "re");
  assert.strictEqual(A.solfege(62, 62, "mixolydian"), "so");
  assert.strictEqual(A.solfege(60, 62, "mixolydian"), "fa");      // the lowered 7th, FA
});
t("Mullen's familiar sets: 15 each, in the book's order, written solfege = pitch solfege", () => {
  const maj = A.tonalSet("major"), min = A.tonalSet("minor");
  assert.strictEqual(maj.patterns.length, 15); assert.strictEqual(min.patterns.length, 15);
  assert.strictEqual(maj.patterns[0].sol, "do mi"); assert.strictEqual(maj.patterns[14].sol, "do so do");
  assert.strictEqual(min.patterns[2].sol, "si ti"); assert.strictEqual(min.patterns[8].sol, "mi ti si");
  for (const [id, set] of [["mullen-fpifo-major", maj], ["mullen-fpifo-minor", min]]) {
    const written = patternObject[id].split(/\n(?=X:)/).filter(x => /X:/.test(x)).map(x => x.match(/^w:(.*)$/m)[1].trim().toLowerCase());
    assert.deepStrictEqual(set.patterns.map(p => p.sol), written);
  }
  assert.deepStrictEqual([...new Set(maj.patterns.map(p => p.fn))].sort(), ["dominant", "tonic"]);
});
t("every tonal set: resting tone near its patterns; functions named", () => {
  for (const id of Object.keys(A.TONAL)) {
    const s = A.tonalSet(id), all = s.patterns.flatMap(p => p.midis);
    assert.ok(s.patterns.length >= 8, id);
    assert.ok(Math.min(...all) >= s.rest - 7 && Math.max(...all) <= s.rest + 14, id + " range " + s.rest);
    assert.ok(s.patterns.every(p => p.fn), id + " has a pattern with no function");
  }
  assert.ok(A.tonalSet("major-u").patterns.every(p => /^(D|A7)$/.test(p.chord)));        // unfamiliar: tonic and dominant only
});
t("tonal sequence 5 6 5 4 3 2 7 1 ends on the resting tone in each tonality", () => {
  const names = (mode, rest) => A.tonalSequence(mode, rest).map(m => A.solfege(m, rest, mode)).join(" ");
  assert.strictEqual(names("major", 62), "so la so fa mi re ti do");
  assert.strictEqual(names("minor", 62), "mi fa mi re do ti si la");
  assert.strictEqual(names("dorian", 62), "la ti la so fa mi do re");
  assert.strictEqual(names("mixolydian", 62), "re mi re do ti la fa so");
});
t("toAbc plays back the same pitches, accidentals included", () => {
  for (const ms of [[62, 66, 69], [61, 62, 65, 68, 70], [57, 70, 72, 74, 59]]) {
    const got = E.fromAbc(A.toAbc(ms)).sounding.map(e => e.pitches[0].midi);
    assert.deepStrictEqual(got, ms);
  }
});
t("rhythm syllables: Gordon/Froseth duple and triple, divisions, ties", () => {
  const syl = (m, l, b) => A.rhythmSyllables(`X:1\nM:${m}\nL:${l}\nK:C clef=none\n${b}`);
  assert.strictEqual(syl("2/4", "1/4", "B B/B/ | B2 |"), "Du Du De | Du");
  assert.strictEqual(syl("2/4", "1/4", "B//B//B/ B | B//B//B//B// B |"), "Du Ta De Du | Du Ta De Ta Du");
  assert.strictEqual(syl("6/8", "1/8", "BBB B3 | B/B/BB B/B/B/B/B/B/ |"), "Du Da Di Du | Du Ta Da Di Du Ta Da Ta Di Ta");
  assert.strictEqual(syl("2/4", "1/4", "B B/B/- | B/B/ B |"), "Du Du De | De Du");                 // tied De carries over
  for (const id of Object.keys(A.RHYTHM)) {
    const s = A.rhythmSet(id); assert.strictEqual(s.patterns.length, 8, id);
    assert.ok(s.patterns.every(p => !/\?/.test(p.syl)), id + ": " + s.patterns.map(p => p.syl).join(" / "));
  }
});
t("series mixes functions; differentFrom never returns the same pattern", () => {
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const set = A.tonalSet("major");
  for (let i = 0; i < 50; i++) {
    const s = A.series(set, 3, rnd); assert.strictEqual(new Set(s.map(p => p.midis.join())).size, 3);
    assert.ok(new Set(s.map(p => p.fn)).size > 1);
    const p = s[0], q = A.differentFrom(set, p, rnd); assert.notStrictEqual(q.midis.join(), p.midis.join());
  }
});

// ---- pitch range ----
const span = set => { const all = set.patterns.flatMap(p => p.midis).concat(A.tonalSequence(set.mode, set.rest)); return [Math.min(...all) - set.rest, Math.max(...all) - set.rest]; };
const fitsIn = (set, r, lo, hi) => { const [a, b] = span(set); return r + a >= lo && r + b <= hi; };
t("restsFor: treble default A3-E5 gives resting tones that fit every set and the sequence", () => {
  for (const id of Object.keys(A.TONAL)) {
    const set = A.tonalSet(id), rs = A.restsFor(set, 57, 76);
    assert.ok(rs.length > 0, id + " has no fit in the default range");
    rs.forEach(r => { assert.ok(fitsIn(set, r, 57, 76), id + " rest " + r); assert.ok([2, 3, 4, 5, 7].includes(r % 12)); });
  }
});
t("restsFor: baritone A2-E4 moves the resting tones down", () => {
  const set = A.tonalSet("major"), rs = A.restsFor(set, 45, 64);
  assert.ok(rs.length > 0); rs.forEach(r => assert.ok(fitsIn(set, r, 45, 64) && r < 62, "rest " + r));
  const all = A.restsFor(set, 45, 64, [0,1,2,3,4,5,6,7,8,9,10,11]); assert.ok(all.length > rs.length);
});
t("restsFor: a range narrower than the set returns none; nearestRest says so and gives the least overflow", () => {
  const set = A.tonalSet("major");
  assert.deepStrictEqual(A.restsFor(set, 60, 66), []);
  const r = A.nearestRest(set, 60, 66); assert.strictEqual(r.fits, false);
  const over = x => { const [a, b] = span(set); return Math.max(0, 60 - (x + a)) + Math.max(0, x + b - 66); };
  for (let x = 48; x < 84; x++) if ([2, 3, 4, 5, 7].includes(x % 12)) assert.ok(over(r.rest) <= over(x), "better rest " + x);
  const ok = A.nearestRest(set, 57, 76, [2], 62); assert.strictEqual(ok.fits, true); assert.strictEqual(ok.rest % 12, 2);
});
t("rhythmPitch: a natural note inside the range, nearest its middle; rhythmAbc/Sequence use it", () => {
  assert.strictEqual(A.rhythmPitch(45, 64), "=G,");
  const p = A.rhythmPitch(57, 76); assert.ok(/^=[A-Ga-g]/.test(p));
  assert.ok(!/B/.test(A.rhythmSequence("duple", "=G")) , "pitch replaces B");
  assert.ok(/=G/.test(A.rhythmAbc("X:1\nM:2/4\nL:1/8\nK:C\nB B B2 |", "=G")));
  assert.ok(/B/.test(A.rhythmAbc("X:1\nM:2/4\nL:1/8\nK:C\nB B B2 |")));
});
t("noteName spells with flats", () => { assert.strictEqual(A.noteName(57), "A3"); assert.strictEqual(A.noteName(63), "Eb4"); assert.strictEqual(A.noteName(40), "E2"); });
t("fits: create = anything different; improvise rules by function and by division", () => {
  const set = A.tonalSet("major"), tonic = set.patterns.find(p => p.fn === "tonic");
  const fit = task => set.patterns.filter(q => A.fits(task, tonic, q));
  assert.strictEqual(fit("any").length, set.patterns.length - 1);
  assert.ok(fit("same").length > 0 && fit("same").every(q => q.fn === "tonic"));
  assert.ok(fit("swap").length > 0 && fit("swap").every(q => q.fn === "dominant"));
  const d = A.rhythmSet("duple-d"), m = A.rhythmSet("duple");
  assert.ok(d.patterns.every(q => A.fits("division", m.patterns[0], q)));
  assert.ok(m.patterns.every(q => !A.fits("division", m.patterns[0], q)));
});
t("displayAbc drops syllables and chord symbols, keeps the stemless notes", () => {
  const t0 = A.tonalSet("major").patterns[4].abc, d = A.displayAbc(t0);
  assert.ok(!/^w:/m.test(d) && !/"/.test(d) && /C0 E0 G0/.test(d), d);
});
console.log(`AUDIATION OK (${n})`);
