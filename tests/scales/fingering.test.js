// Run from repo root: node tests/scales/fingering.test.js
const path = require("path");
const SF = require(path.join(__dirname, "../../apps/shared/scale-fingering.js"));
const I = SF._internals;
const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
let failures = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { failures++; console.log("FAIL: " + msg); } }
const hr = t => console.log("\n== " + t + " ==");
const toArr = I.toArr, isBlack = I.isBlack;
const rot = (offs, d) => offs.map(o => (o - offs[d] + 12) % 12).sort((a, b) => a - b);
const MODES = { Ionian: 0, Dorian: 1, Phrygian: 2, Lydian: 3, Mixolydian: 4, Aeolian: 5, Locrian: 6 };

// ---- 1. transcription sanity ------------------------------------------
hr("1. Kelley transcription vs rules (a), (b), (c), (e)");
const cells = [];
for (const r of SF.KELLEY) for (const t of SF.TYPES) {
  const c = r.types[t];
  for (const h of ["rh", "lh"]) {
    cells.push({ t, key: t === "Major" ? r.majorLabel : r.minorLabel, h, s: c[h], alt: false, rootPc: c.rootPc });
    if (c[h + "Alt"]) cells.push({ t, key: (t === "Major" ? r.majorLabel : r.minorLabel), h, s: c[h + "Alt"], alt: true, rootPc: c.rootPc });
  }
}
ok(SF.KELLEY.length === 12, "12 key pairs");
const nPrimary = cells.filter(c => !c.alt).length, nAlt = cells.filter(c => c.alt).length;
ok(nPrimary === 96, "96 primary cells, got " + nPrimary);
console.log(nPrimary + " primary cells and " + nAlt + " printed alternates transcribed");
const cExc = [], eInfo = [];
for (const c of cells) {
  const f = toArr(c.s), id = c.t + " " + c.key + " " + c.h.toUpperCase() + (c.alt ? " (alt)" : "");
  ok(f.length === 8 && f[7] === f[0], id + " 8 fingers, last = first");
  const cyc = c.h === "rh" ? I.RH_CYCLE : I.LH_CYCLE;
  let rotation = false;
  for (let d = 0; d < 7; d++) if (cyc.every((_, i) => cyc[(d + i) % 7] === f[i])) rotation = true;
  ok(rotation, id + " " + c.s + " is a rotation of the 123 1234 cycle (rule a)");
  const offs = SF.TYPE_OFFSETS[c.t], ck = I.checksFor(f, c.rootPc, offs, c.h);
  ok(!ck.thumbOnBlack, id + " " + c.s + " thumb on black (rule b)");
  if (ck.fourthOnBlack === false) cExc.push(id + " " + c.s);
  if (ck.aug2) eInfo.push(id + " " + c.s + " aug2 " + ck.aug2);
}
console.log("Rule (c) exceptions (4th finger on a white key in a scale with black keys): " + cExc.length + " (" + cExc.filter(x => !x.includes("(alt)")).length + " primaries, " + cExc.filter(x => x.includes("(alt)")).length + " printed alternates)");
cExc.forEach(x => console.log("  " + x));
const eBad = eInfo.filter(x => /aug2 (3-4|cross)/.test(x) && !x.includes("(alt)"));
console.log("Rule (e) cells whose augmented second is not under 1-2/2-3 (primaries): " + eBad.length);
eBad.forEach(x => console.log("  " + x));

// ---- 2. get() returns charted values ------------------------------------
hr("2. get() reproduces every charted cell");
let nGet = 0;
for (const r of SF.KELLEY) for (const t of SF.TYPES) {
  const c = r.types[t], offs = SF.TYPE_OFFSETS[t];
  for (const withOctave of [false, true]) {
    const g = SF.get(c.rootPc, withOctave ? offs.concat([12]) : offs, t);
    ok(!!g, t + " " + c.rootPc + " non-null");
    for (const h of ["rh", "lh"]) {
      ok(g[h].fingers.join("") === c[h], t + " " + c.rootPc + " " + h + " primary");
      ok(g[h].source === "kelley", t + " source");
      const alt = c[h + "Alt"];
      ok(alt ? g[h].alternates.length === 1 && g[h].alternates[0].fingers.join("") === alt : g[h].alternates.length === 0, t + " " + c.rootPc + " " + h + " alternates");
      ok(g[h].fingers[7] === g[h].fingers[0] && g[h].performed.length === 8, "shape");
    }
  }
  nGet++;
}
console.log(nGet + " scales checked via get() (x2 with/without trailing 12, x2 hands)");
const ch = SF.chart();
ok(ch.length === 48, "chart has 48 rows");
ok(ch.every(r => r.offsets.length === 8 && r.fifths >= -6 && r.fifths <= 6), "chart rows well formed");

// ---- 3. relative major / natural minor ---------------------------------
hr("3. Natural minor vs relative major rotated to start on degree 6");
const RA = SF.relativeAnalysis();
ok(RA.length === 24, "24 analysis rows");
let nMatch = 0, nAltM = 0, nWhite = 0, nOther = 0, bothOk = 0;
for (const a of RA) {
  const tag = a.matches ? "MATCH" : a.altMatches ? "alt-matches" : a.allWhite ? "all-white" : "differs";
  console.log(NAMES[a.majorRootPc].padEnd(3) + "/" + NAMES[a.minorRootPc].padEnd(3) + a.hand.toUpperCase() + " major " + a.major + " minor " + a.minor +
    " rotated " + a.rotatedMajor + (a.minorAlt ? " alt " + a.minorAlt : "") + "  " + tag);
  if (a.matches) nMatch++; else {
    if (a.altMatches) nAltM++; else if (a.allWhite) nWhite++; else nOther++;
    if (a.minorObeysAB && a.rotatedObeysAB) bothOk++;
    console.log("      mismatch: primary obeys a,b=" + a.minorObeysAB + "; rotation obeys a,b=" + a.rotatedObeysAB + "; alt obeys a,b=" + a.altObeysAB + " -- " + a.reason);
  }
  ok(a.rotatedObeysAB, "rotated major obeys (a),(b) for " + a.hand + " " + a.majorRootPc);
  ok(a.minorObeysAB, "minor primary obeys (a),(b)");
}
const rh = RA.filter(a => a.hand === "rh"), lh = RA.filter(a => a.hand === "lh");
console.log("minor == rotated major: " + nMatch + "/24 (RH " + rh.filter(a => a.matches).length + "/12, LH " + lh.filter(a => a.matches).length + "/12)");
console.log("mismatches " + (24 - nMatch) + ": alternate is the rotation " + nAltM + ", all-white C/A " + nWhite + ", other " + nOther +
  "; mismatches where both the primary and the rotation obey (a),(b): " + bothOk + "/" + (24 - nMatch));
const withAlt = RA.filter(a => a.minorAlt);
console.log("minor cells with a printed alternate: " + withAlt.length + ", of which alternate == rotation " + withAlt.filter(a => a.altMatches).length +
  ", alternate == traditional start-on-thumb " + withAlt.filter(a => a.minorAlt === I.TRAD[a.hand]).length);
console.log("matches OR alternate matches: " + RA.filter(a => a.matches || a.altMatches).length + "/24");

// ---- 4. generator vs Kelley ----------------------------------------------
hr("4. Rule-based generator vs Kelley (48 scales x 2 hands)");
let gp = 0, ga = 0, gm = 0, tied = 0; const misses = [];
for (const r of ch) {
  const gen = I.generate(r.rootPc, r.offsets.slice(0, 7));
  if (gen.winners.length > 1) tied++;
  for (const h of ["rh", "lh"]) {
    const c = h === "rh" ? gen.best.r : gen.best.l, s = c.f.concat([c.f[0]]).join(""), alt = r[h + "Alt"];
    if (s === r[h]) gp++; else if (alt && s === alt) ga++;
    else { gm++; misses.push(r.type + " " + r.keyLabel + " " + h.toUpperCase() + ": generated " + s + ", Kelley " + r[h] + (alt ? " (" + alt + ")" : "")); }
  }
}
console.log("primary reproduced: " + gp + "/96; via alternate only: " + ga + "/96; misses: " + gm + "/96; scales where the generator's joint choice was still tied after tie-breaks: " + tied + "/48");
misses.forEach(m => console.log("  miss: " + m));

// ---- 5. modes of the major scale -----------------------------------------
hr("5. Modes of major, 12 keys, both hands");
let nModes = 0, nRot = 0, nWhiteEx = 0;
const MAJ = SF.TYPE_OFFSETS["Major"];
for (let parent = 0; parent < 12; parent++) {
  const pg = SF.get(parent, MAJ);
  for (const [name, d] of Object.entries(MODES)) {
    const root = (parent + MAJ[d]) % 12, offs = rot(MAJ, d);
    const g = SF.get(root, offs, name);
    ok(!!g, name + " non-null");
    const white = !I.pcsOf(root, offs).some(isBlack);
    for (const h of ["rh", "lh"]) {
      nModes++;
      const x = g[h], f = x.fingers, id = NAMES[root] + " " + name + " " + h;
      const cyc = h === "rh" ? I.RH_CYCLE : I.LH_CYCLE;
      let rotation = false; for (let k = 0; k < 7; k++) if (cyc.every((_, i) => cyc[(k + i) % 7] === f[i])) rotation = true;
      ok(rotation && f[7] === f[0], id + " rule a");
      ok(!x.checks.thumbOnBlack, id + " rule b");
      ok(x.checks.fourthOnBlack !== false, id + " rule c");
      if (name === "Ionian" || name === "Aeolian") { ok(x.source === "kelley", id + " charted"); continue; }
      const expected = I.rotate8(pg[h].fingers, d);
      if (white) { nWhiteEx++; ok(f.join("") === I.TRAD[h], id + " all-white = start on thumb"); ok(x.source === "rotated", id + " rotated"); }
      else { nRot++; ok(f.join("") === expected.join(""), id + " == rotation of " + NAMES[parent] + " major " + d); ok(x.parent && x.parent.rootPc === parent && x.parent.degree === d, id + " parent info"); }
    }
  }
}
console.log(nModes + " mode-hand fingerings checked; " + nRot + " equal the parent's rotation, " + nWhiteEx + " are the all-white start-on-thumb exception");

// ---- 6. modes of melodic / harmonic minor, other seven-note scales -------
hr("6. Melodic-minor modes, Spanish, Harmonic Major, HM 6th Mode");
const LYD_DOM = [0, 2, 4, 6, 7, 9, 10], HINDU = [0, 2, 4, 5, 7, 8, 10], LOC2 = [0, 2, 3, 5, 6, 8, 10], SPANISH = [0, 1, 4, 5, 7, 8, 10];
const HARM_MAJ = [0, 2, 4, 5, 7, 8, 11], HM6 = [0, 1, 4, 5, 7, 9, 11];
const MM = SF.TYPE_OFFSETS["Melodic Minor"], HM = SF.TYPE_OFFSETS["Harmonic Minor"];
const named = [["Lydian Dominant", LYD_DOM, "Melodic Minor", 3], ["Hindu", HINDU, "Melodic Minor", 4], ["Locrian #2", LOC2, "Melodic Minor", 5], ["Spanish", SPANISH, "Harmonic Minor", 4]];
for (const [nm, offs, ptype, d] of named) for (let root = 0; root < 12; root++) {
  const g = SF.get(root, offs.concat([12]), nm), parent = (root - (ptype === "Melodic Minor" ? MM : HM)[d] + 12) % 12;
  const pg = SF.get(parent, ptype === "Melodic Minor" ? MM : HM);
  for (const h of ["rh", "lh"]) {
    ok(g[h].source === "rotated" && g[h].parent.type === ptype && g[h].parent.rootPc === parent && g[h].parent.degree === d, NAMES[root] + " " + nm + " parent");
    ok(g[h].fingers.join("") === I.rotate8(pg[h].fingers, d).join(""), NAMES[root] + " " + nm + " " + h + " rotation");
    ok(!g[h].checks.thumbOnBlack, NAMES[root] + " " + nm + " thumb");
  }
}
for (const [nm, offs] of [["Harmonic Major", HARM_MAJ], ["HM 6th Mode", HM6]]) {
  let src = {}, tb = 0, c4 = 0, augs = {}, tog = 0;
  for (let root = 0; root < 12; root++) {
    const g = SF.get(root, offs.concat([12]), nm);
    for (const h of ["rh", "lh"]) {
      const x = g[h]; src[x.source] = (src[x.source] || 0) + 1;
      const cyc = h === "rh" ? I.RH_CYCLE : I.LH_CYCLE; let rotation = false;
      for (let k = 0; k < 7; k++) if (cyc.every((_, i) => cyc[(k + i) % 7] === x.fingers[i])) rotation = true;
      ok(rotation && x.fingers[7] === x.fingers[0], nm + " rule a");
      if (x.checks.thumbOnBlack) tb++;
      if (x.checks.fourthOnBlack === false) c4++;
      augs[x.checks.aug2] = (augs[x.checks.aug2] || 0) + 1;
    }
    if (g.thumbsTogether.length) tog++;
  }
  console.log(nm + " x12 keys x2 hands: sources " + JSON.stringify(src) + "; thumb-on-black " + tb + "; 4th on white " + c4 + "; aug2 placement " + JSON.stringify(augs) + "; keys with thumbs together " + tog + "/12");
  ok(tb === 0, nm + " never needs a thumb on black");
}

// ---- 7. null cases ---------------------------------------------------------
hr("7. Non-heptatonic input returns null");
const NO = { "major pentatonic": [0, 2, 4, 7, 9], "minor pentatonic": [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10], "whole tone": [0, 2, 4, 6, 8, 10],
  "diminished W-H": [0, 2, 3, 5, 6, 8, 9, 11], "bebop dominant": [0, 2, 4, 5, 7, 9, 10, 11], augmented: [0, 3, 4, 7, 8, 11], "major triad": [0, 4, 7], "triad+octave": [0, 4, 7, 12], empty: [] };
for (const [n, o] of Object.entries(NO)) { ok(SF.get(0, o, n) === null, n + " null"); ok(SF.get(5, o.concat([12]), n) === null, n + "+12 null"); }
ok(SF.get(0, null) === null && SF.get(0, undefined) === null, "bad input null");
console.log(Object.keys(NO).length + " non-seven-note inputs return null");

// ---- misc ---------------------------------------------------------------
ok(SF.SOURCE.author === "Robert T. Kelley" && /robertkelleyphd\.com/.test(SF.SOURCE.url) && /2001/.test(SF.SOURCE.copyright), "attribution");
ok(SF.RULES.length === 6 && SF.RULES.map(r => r.id).join("") === "abcdef", "six rules");
const dm = SF.get(9, MAJ.concat([12]), "x");
ok(dm.rh.performed[7] === 5 || dm.rh.fingers[7] !== 1, "performed RH top");

console.log("\n" + (failures ? "FAILED: " + failures + " of " + checks + " assertions failed" : "PASS: all " + checks + " assertions passed"));
process.exit(failures ? 1 : 0);
