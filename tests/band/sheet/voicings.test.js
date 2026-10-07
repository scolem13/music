const fs = require("fs"), vm = require("vm"), assert = require("assert");
vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/voicings.js", "utf8"));
const CV = ChordVoicings, mod12 = n => ((n % 12) + 12) % 12;
const Q = { maj7:[0,4,7,11], "7":[0,4,7,10], m7:[0,3,7,10], m7b5:[0,3,6,10], dim7:[0,3,6,9], "6":[0,4,7,9], m6:[0,3,7,9],
  maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8], "9":[0,4,7,10,14], "13":[0,4,7,10,14,21], "7b9":[0,4,7,10,13], "7#9":[0,4,7,10,15] };
const STD = [40,45,50,55,59,64];
const stats = { piano:{}, guitar:{}, span5:{}, checks:0 };
const ok = (c, msg) => { stats.checks++; assert(c, msg); };
const pcsOf = (root, offs) => offs.map(o => mod12(root + o)).sort((a,b)=>a-b).join(",");
const setOf = midis => midis.map(mod12).sort((a,b)=>a-b).join(",");

// independent structure check: raise the bass an octave and see where it lands in the close chord
function dropIndexFromTop(midis){
  const a = midis[0] + 12, rest = midis.slice(1), close = rest.concat([a]).sort((x,y)=>x-y);
  if (close[close.length-1] - close[0] >= 12) return null;          // not a close-position chord
  if (rest.includes(a)) return null;
  return close.length - close.indexOf(a);                           // 1 = top, 2 = second from top ...
}

for (const [qn, ivs] of Object.entries(Q)) for (let root = 0; root < 12; root++){
  const chord = { root, intervals: ivs }, nTones = new Set(ivs.map(mod12)).size;
  const voiced = nTones >= 4 ? CV.reduce(chord, 4).intervals : ivs.map(mod12);
  const n = voiced.length, want = pcsOf(root, voiced);
  // ---------- piano ----------
  for (const style of ["drop2", "drop3"]){
    const c = CV.piano(chord, style);
    ok(c.length === n, `${qn} ${style}: ${c.length} inversions, want ${n}`);
    ok(c.map(x => x.inversion).join() === [...Array(n).keys()].join(), `${qn} ${style}: inversions in order`);
    for (const v of c){
      ok(v.midis.every((m,i) => i === 0 || m > v.midis[i-1]), "ascending");
      ok(setOf(v.midis) === want, `${qn} r${root} ${style}: pcs ${setOf(v.midis)} want ${want}`);
      ok(v.midis[0] >= 43 && v.midis[n-1] <= 79, `${qn} ${style}: register ${v.midis}`);
      ok(mod12(v.midis[0]) === mod12(root + voiced.slice().sort((a,b)=>a-b)[v.inversion]), "bass tone matches inversion");
      const k = dropIndexFromTop(v.midis);
      const expect = n === 4 ? (style === "drop2" ? 2 : 3) : (style === "drop2" ? 2 : 3);
      ok(k === expect, `${qn} r${root} ${style}: dropped voice is #${k} from top, want ${expect} (${v.midis})`);
      ok(typeof v.label === "string" && v.label.length > 0, "label");
      if (nTones > 4) ok(/no /.test(v.label), "reduced chords say what is missing: " + v.label);
    }
    stats.piano[`${qn}/${style}`] = (stats.piano[`${qn}/${style}`] || 0) + c.length;
    // allOctaves gives every placement, all still in range
    const all = CV.piano(chord, style, { allOctaves:true });
    ok(all.length >= c.length && all.every(v => v.midis[0] >= 43 && v.midis[n-1] <= 79), "allOctaves in range");
  }
  // ---------- guitar ----------
  const validate = (v, tuning, wantPcs, maxFret = 15) => {
    const strs = v.strings.map(s => s.string);
    ok(new Set(strs).size === strs.length, "one note per string");
    ok(strs.every(s => v.stringSet.includes(s)) && strs.length === v.stringSet.length, "uses exactly its string set");
    ok(v.strings.every(s => Number.isInteger(s.fret) && s.fret >= 0 && s.fret <= maxFret), "frets in range " + JSON.stringify(v.strings));
    ok(v.strings.every(s => s.midi === tuning[s.string] + s.fret), "midi matches string+fret");
    const fr = v.strings.map(s => s.fret), span = Math.max(...fr) - Math.min(...fr) + 1;
    ok(span === v.span && span <= 5, "span " + span);
    ok(v.midis.join() === v.strings.map(s => s.midi).sort((a,b)=>a-b).join(), "midis sorted");
    ok(v.midis.every((m,i) => i === 0 || m > v.midis[i-1]), "no unisons");
    if (wantPcs != null) ok(setOf(v.midis) === wantPcs, `pcs ${setOf(v.midis)} want ${wantPcs} (${v.label})`);
    return span;
  };
  const count = (key, c) => { stats.guitar[key] = stats.guitar[key] || {}; stats.guitar[key][c.length] = (stats.guitar[key][c.length] || 0) + 1; };
  for (const style of ["drop2", "drop3"]){
    const c = CV.guitar(chord, style);
    count(`${qn}/${style}`, c);
    const perSet = {};
    for (const v of c){
      const span = validate(v, STD, want);
      if (span === 5) stats.span5[`${qn}/${style}`] = (stats.span5[`${qn}/${style}`] || 0) + 1;
      const k = dropIndexFromTop(v.midis);
      ok(k === (style === "drop2" ? 2 : 3), `${qn} r${root} guitar ${style}: voice #${k} from top (${v.midis})`);
      const key = v.stringSet.join("");
      perSet[key] = perSet[key] || []; ok(!perSet[key].includes(v.inversion), "one shape per set+inversion"); perSet[key].push(v.inversion);
      if (n === 4) ok(style === "drop2" ? v.stringSet[3] - v.stringSet[0] === 3 : (v.stringSet[1] - v.stringSet[0] === 2 && v.stringSet[3] - v.stringSet[1] === 2), "string-set shape");
    }
    if (n === 4 && ["maj7","7","m7","m7b5","dim7","6","m6"].includes(qn)){
      ok(c.length === (style === "drop2" ? 12 : 8), `${qn} r${root} guitar ${style}: ${c.length} shapes`);
      ok(Object.values(perSet).every(a => a.length === 4), "all four inversions on every set");
    }
    ok(c.length > 0, `${qn} r${root} guitar ${style} not empty`);
  }
  const isTriad = n === 3;
  const shellWant = isTriad ? want : pcsOf(root, [0, ivs.includes(4) ? 4 : 3, ivs.find(i => i === 9 || i === 10 || i === 11)]);
  for (const style of ["triad3", "shell3"]){
    const c = CV.guitar(chord, style);
    count(`${qn}/${style}`, c);
    ok(c.length > 0, `${qn} r${root} ${style} not empty`);
    const adj = {};
    for (const v of c){
      const span = validate(v, STD, shellWant);
      if (span === 5) stats.span5[`${qn}/${style}`] = (stats.span5[`${qn}/${style}`] || 0) + 1;
      ok(v.strings.length === 3, "three strings");
      const adjacent = v.stringSet[2] - v.stringSet[0] === 2;
      if (isTriad){ ok(adjacent, "triads on adjacent sets"); ok(v.midis[2] - v.midis[0] < 12, "close triad"); }
      else if (!adjacent) ok(span <= 4, "skipped sets never stretch");
      if (adjacent){ const key = v.stringSet.join(""); (adj[key] = adj[key] || new Set()).add(v.inversion); }
    }
    ok(Object.keys(adj).length === 4, `${qn} r${root} ${style}: all four adjacent three-string sets present`);
    ok(Object.values(adj).every(s => s.size === 3), `${qn} r${root} ${style}: every bass tone (inversion) on every adjacent set`);
    if (isTriad) ok(c.length === 12, `${qn} triads: ${c.length}`);
  }
  ok(JSON.stringify(CV.guitar(chord, "triad3").map(v => v.midis)) === JSON.stringify(CV.guitar(chord, "shell3").map(v => v.midis)), "triad3 and shell3 agree (each falls back to the other)");
  // single-set filter
  const one = CV.guitar(chord, "shell3", { stringSets:[[2,3,4]] });
  ok(one.length >= 3 && one.every(v => v.stringSet.join() === "2,3,4"), "stringSets filter");
  // allPositions is a superset
  ok(CV.guitar(chord, "drop2", { allPositions:true }).length >= CV.guitar(chord, "drop2").length, "allPositions superset");
}

// ---------- other tunings / instruments: never throw, always valid ----------
const TUNINGS = { "guitar drop D":[38,45,50,55,59,64], DADGAD:[38,45,50,55,57,62], "open G":[38,43,50,55,59,62], "open D":[38,45,50,54,57,62],
  "bass 4":[28,33,38,43], "bass 5":[23,28,33,38,43], "uke GCEA":[67,60,64,69], "uke low G":[55,60,64,69], "baritone uke":[50,55,59,64],
  "banjo open G":[50,55,59,62,67], mandolin:[55,62,69,76], vihuela:[57,62,67,59,64] };
const other = {};
for (const [name, tuning] of Object.entries(TUNINGS)){
  other[name] = {};
  for (const style of ["drop2","drop3","triad3","shell3"]){
    let total = 0, empties = 0;
    for (const qn of ["maj7","7","m7","maj","min"]) for (let root = 0; root < 12; root++){
      const c = CV.guitar({ root, intervals:Q[qn] }, style, { tuning });
      total += c.length; if (!c.length) empties++;
      for (const v of c){
        ok(v.strings.every(s => s.string < tuning.length && s.midi === tuning[s.string] + s.fret && s.fret >= 0 && s.fret <= 15), name + " valid");
        const fr = v.strings.map(s => s.fret); ok(Math.max(...fr) - Math.min(...fr) + 1 <= 5, name + " span");
        ok(new Set(v.midis.map(mod12)).size === v.midis.length, name + " no doubled pcs");
      }
    }
    other[name][style] = `${total} shapes, ${empties}/60 chords empty`;
  }
}
ok(CV.guitar({ root:0, intervals:Q["7"] }, "drop3", { tuning:[55,60,64,69] }).length === 0, "too few strings -> []");
ok(CV.guitar({ root:0, intervals:Q["7"] }, "nonsense").length === 0, "unknown style -> []");
ok(CV.piano({ root:0, intervals:[] }, "drop2").length === 0, "empty chord -> []");

// ---------- nearest ----------
let nearChecks = 0;
for (let root = 0; root < 12; root++) for (const qn of ["maj7","7","m7"]){
  const cands = CV.piano({ root, intervals:Q[qn] }, "drop2", { allOctaves:true });
  for (const prev of [[48,55,59,64],[55,60,64,71],[50,57,60,65]]){
    const pick = CV.nearest(cands, prev), best = Math.min(...cands.map(c => CV.motion(prev, c.midis)));
    ok(Math.abs(CV.motion(prev, pick.midis) - best) < 1e-9, "nearest = least motion"); nearChecks++;
  }
  const mean = m => m.reduce((a,b)=>a+b,0) / m.length;
  const p0 = CV.nearest(cands, null, 55), b0 = Math.min(...cands.map(c => Math.abs(mean(c.midis) - 55)));
  ok(Math.abs(Math.abs(mean(p0.midis) - 55) - b0) < 1e-9, "no prev -> nearest the target"); nearChecks++;
  const g = CV.guitar({ root, intervals:Q[qn] }, "drop2"), gp = CV.nearest(g, [50,57,60,65]);
  ok(CV.motion([50,57,60,65], gp.midis) === Math.min(...g.map(c => CV.motion([50,57,60,65], c.midis))), "nearest on guitar"); nearChecks++;
}
ok(CV.nearest([], [60]) === null, "nearest of nothing");
// ii-V-I voice-led stays close
const prog = [{ root:2, intervals:Q.m7 }, { root:7, intervals:Q["7"] }, { root:0, intervals:Q.maj7 }];
let prev = null, moves = [], line = [];
for (const ch of prog){ const pick = CV.nearest(CV.piano(ch, "drop2", { allOctaves:true }), prev, 60); if (prev) moves.push(CV.motion(prev, pick.midis)); prev = pick.midis; line.push(pick.midis.join(" ")); }
ok(moves.every(m => m <= 8), "ii-V-I moves little: " + moves);

// ---------- helpers ----------
assert.deepStrictEqual(CV.intervalsFromFormula("1 b3 5 b7"), [0,3,7,10]);
assert.deepStrictEqual(CV.intervalsFromFormula("1 3 #5 b7 b9 #9"), [0,4,8,10,13,15]);
assert.deepStrictEqual(CV.intervalsFromFormula("1 3 5 b7 9 13"), [0,4,7,10,14,21]);
assert.deepStrictEqual(CV.styles("piano").map(s => s.id), ["standard","shell","guide","rootless","drop2","drop3"]);
assert.deepStrictEqual(CV.styles("guitar").map(s => s.id), ["standard","shell","drop2","drop3","triad3","shell3","triadvl","uppervl","guide2"]); assert.deepStrictEqual(CV.styles("guitar").filter(s=>s.sheetOnly).map(s=>s.id), ["standard","shell"]);

const sum = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "object" ? Object.entries(v).map(([n, t]) => `${n} shapes×${t} keys`).join(", ") : v]));
console.log("ALL OK —", stats.checks, "assertions,", nearChecks, "nearest checks");
console.log("piano candidates per quality/style over 12 keys:", JSON.stringify(stats.piano));
console.log("guitar shapes per chord (standard tuning):"); console.log(sum(stats.guitar));
console.log("shapes needing a 5-fret stretch (over 12 keys):", JSON.stringify(stats.span5));
console.log("ii-V-I drop2 voice-led:", line.join(" | "), "motion", moves.join(","));
console.log("other tunings (5 qualities × 12 keys):"); console.log(other);
