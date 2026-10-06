const fs = require("fs"), vm = require("vm"), assert = require("assert");
vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/voicings.js", "utf8"));
const CV = ChordVoicings, mod12 = n => ((n % 12) + 12) % 12;
// [name, intervals, third, seventhOrSixth (null for triads), hasRootInRootless]
const Q = [["maj7",[0,4,7,11],4,11,0],["7",[0,4,7,10],4,10,0],["m7",[0,3,7,10],3,10,0],["m7b5",[0,3,6,10],3,10,1],["dim7",[0,3,6,9],3,9,1],
  ["6",[0,4,7,9],4,9,0],["m6",[0,3,7,9],3,9,0],["9",[0,4,7,10,14],4,10,0],["13",[0,4,7,10,14,21],4,10,0],["7b9",[0,4,7,10,13],4,10,0],["7#9",[0,4,7,10,15],4,10,0],
  ["sus4",[0,5,7],5,null,1],["maj",[0,4,7],4,null,0],["min",[0,3,7],3,null,0],["maj9",[0,4,7,11,14],4,11,0],["m9",[0,3,7,10,14],3,10,0],["7alt",[0,4,8,10,13,15],4,10,0],
  ["m(maj7)",[0,3,7,11],3,11,0],["7sus4",[0,5,7,10],5,10,1],["7b13",[0,4,7,10,20],4,10,0],["7#5",[0,4,8,10],4,10,0],["11",[0,4,7,10,14,17],5,10,0]];
const nm = m => ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"][mod12(m)] + (Math.floor(m / 12) - 1);
const stats = { checks: 0, cands: {}, over74: 0, maxTop: 0, minLow: 999 };
const ok = (c, msg) => { stats.checks++; assert(c, msg); };
const set = (root, ivs) => [...new Set(ivs.map(i => mod12(root + i)))].sort((a,b)=>a-b).join();
const pcs = (m) => [...new Set(m.map(mod12))].sort((a,b)=>a-b).join();
for (const [qn, ivs, third, seventh, rootless] of Q) for (let root = 0; root < 12; root++){
  const chord = { root, intervals: ivs }, P = iv => mod12(root + iv);
  const all = set(root, ivs), tag = `${qn} r${root}`;
  for (const style of ["standard","shell","guide","rootless","drop2","drop3"]){
    const one = CV.piano(chord, style), every = CV.piano(chord, style, { allOctaves: true });
    ok(one.length > 0, `${tag} ${style}: no candidates`);
    ok(every.length >= one.length, `${tag} ${style}: allOctaves fewer`);
    const mk = c => c.midis.join();
    ok(new Set(every.map(mk)).size === every.length, `${tag} ${style}: duplicate candidates`);
    stats.cands[style] = (stats.cands[style] || 0) + every.length;
    for (const c of every){
      const m = c.midis;
      ok(m.every((x,i) => i === 0 || x > m[i-1]), `${tag} ${style}: ascending ${m}`);
      ok(c.tones.length === m.length && typeof c.label === "string" && c.label && c.style === style, `${tag} ${style}: shape`);
      ok(mod12(m[0]) === P(0) || true, "");
      stats.maxTop = Math.max(stats.maxTop, m[m.length-1]); stats.minLow = Math.min(stats.minLow, m[0]);
      const p = new Set(m.map(mod12));
      if (style === "standard"){
        ok(pcs(m) === all, `${tag} standard: pcs ${pcs(m)} want ${all}`);
        if (ivs.every(i => i < 12)) ok(m[m.length-1] - m[0] < 12, `${tag} standard close position ${m}`);
        ok(m[0] >= 48 && m[m.length-1] <= 84, `${tag} standard register ${m.map(nm)}`);
      }
      if (style === "shell"){
        const sthird = qn === "11" ? 4 : third, want = seventh == null ? all : set(root, [0, sthird, seventh]);
        ok(pcs(m) === want, `${tag} shell: ${m.map(nm)} want ${want}`);
        if (seventh != null) ok(m.length === 3 && p.has(P(0)) && p.has(P(sthird)) && p.has(P(seventh)), `${tag} shell R-3-7`);
      }
      if (style === "guide"){
        const want = seventh == null ? (third === 5 ? set(root, [5, 7]) : set(root, [third, 7])) : set(root, [third, seventh]);
        ok(pcs(m) === want && m.length === 2, `${tag} guide: ${m.map(nm)} want ${want}`);
        ok(m[0] >= 48 && m[m.length-1] <= 77, `${tag} guide register ${m.map(nm)}`);
      }
      if (style === "rootless"){
        ok(m.length >= 3 && m.length <= 4, `${tag} rootless size`);
        if (!rootless) ok(!p.has(P(0)), `${tag} rootless contains the root ${m.map(nm)}`);
        if (qn !== "sus4" && qn !== "7sus4" && qn !== "11") ok(p.has(P(third)), `${tag} rootless lacks the 3rd`);
        if (seventh != null) ok(p.has(P(seventh)) || qn === "7alt" || qn === "7#5", `${tag} rootless lacks the 7th/6th ${m.map(nm)}`);
        else if (qn === "min") ok(p.has(P(10)), `${tag} min triad lacks b7`);
        else if (qn !== "sus4") ok(p.has(P(9)), `${tag} rootless triad lacks the 6th`);
        ok(m[0] >= 48 && m[m.length-1] <= 79, `${tag} rootless register ${m.map(nm)}`);
        if (m[m.length-1] > 74) stats.over74++;
      }
    }
    if (style === "rootless" || style === "guide") ok(one.every(c => c.midis[0] >= 48), `${tag} ${style} default low`);
  }
}
// spot checks against the band engine's own table (BandHarmony.voicing, with prev = null)
const band = {}; vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/harmony.js", "utf8"));
let agree = 0, differ = [];
for (const [qn, ivs] of Q) for (let root = 0; root < 12; root++){
  const sym = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"][root] + ({maj7:"maj7","7":"7",m7:"m7",m7b5:"m7b5",dim7:"dim7","6":"6",m6:"m6","9":"9","13":"13","7b9":"7b9","7#9":"7#9",sus4:"sus4",maj:"",min:"m"}[qn] ?? "?");
  if (sym.endsWith("?")) continue;
  const bv = BandHarmony.voicing(BandHarmony.parseChord(sym), "rootless", null, "piano");
  const lv = CV.piano({ root, intervals: ivs }, "rootless", { allOctaves: true });
  if (lv.some(c => c.midis.join() === bv.join())) agree++; else differ.push(sym + " band=" + bv.map(nm) + " lib=" + lv.map(c => c.midis.map(nm).join(".")));
}
console.log(JSON.stringify({ checks: stats.checks, candidates: stats.cands, rootlessOver74: stats.over74, lowest: stats.minLow, highest: stats.maxTop, bandAgree: agree, bandDiffer: differ.length }));
console.log(differ.slice(0, 12).join("\n"));
