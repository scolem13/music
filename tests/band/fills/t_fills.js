// Fill control, sections, hold mode and chart marks ("^fill", "^stop", P:).
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js"].forEach(f => require(R + f));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const bar = (c, x) => `${x || ""}"${c}"z4`;
// 16 bars: Verse 1-8 (fill marked on bar 4, stop on bar 6), Chorus 9-16
const ABC = "X:1\nM:4/4\nL:1/4\nK:C\nP:Verse\n" + [bar("C"), bar("F"), bar("G"), bar("C", '"^fill"'), bar("C"), bar("F", '"^stop"'), bar("G"), bar("C")].join(" | ") + " |\nP:Chorus\n"
  + [bar("F"), bar("F"), bar("C"), bar("C"), bar("G"), bar("G", '"^big fill"'), bar("C"), bar("C")].join(" | ") + " |]";
const parsed = TuneChart.parse(ABC), form = BandHarmony.buildForm(parsed, 0);
assert.strictEqual(form.length, 16);
assert.strictEqual(parsed.bars[0].section, "Verse"); assert.strictEqual(parsed.bars[8].section, "Chorus");
assert.strictEqual(form[0].section, "Verse"); assert.strictEqual(form[8].section, "Chorus"); assert.strictEqual(form[1].section, undefined);
assert.strictEqual(form[3].fill, "medium"); assert.strictEqual(form[13].fill, "large"); assert.strictEqual(form[5].stop, true);
assert.strictEqual(form[3].chords.length, 1, "the mark is not a chord");
// a P: line in the header is not a section
assert.strictEqual(TuneChart.parse("X:1\nP:AAB\nM:4/4\nL:1/4\nK:C\n\"C\"z4|\"F\"z4|]").bars[0].section, undefined);

// a fill bar (rock groove on the hi-hat): the time stops before the last beat
const isFill = r => !r.parts.drums.some(e => e.piece === "hatClosed" && e.pos === 3) && r.parts.drums.length > 1;
const gen = (abc, opts, seed, bars) => BandMidi.generate(TuneChart.parse(abc), { bars: bars || 64, tempo: 120, opts: Object.assign({ groove: "rock", feel: "straight", ride: "hat" }, opts), rng: mb(seed) });
const PLAIN = "X:1\nM:4/4\nL:1/4\nK:C\n" + Array(16).fill(bar("C")).join(" | ") + " |]";
let n = 0;
for (let seed = 1; seed <= 40; seed++){
  // never
  let recs = gen(PLAIN, { fills: "none" }, seed); assert(!recs.some(isFill), "none: no fills"); n++;
  // none + chosen bars: exactly those
  recs = gen(PLAIN, { fills: "none", fillBars: { 5: "medium", 11: "small" } }, seed);
  recs.forEach((r, i) => assert.strictEqual(isFill(r), i % 16 === 5 || i % 16 === 11, "chosen bars only: bar " + i));
  // marks in the chart, and its stop
  recs = gen(ABC, { fills: "none" }, seed);
  recs.forEach((r, i) => { const k = i % 16; if (k === 5) return; assert.strictEqual(isFill(r), k === 3 || k === 13, "chart marks only: bar " + i); });
  [5, 21].forEach(i => assert.deepStrictEqual(recs[i].parts.drums.filter(e => e.piece).map(e => e.pos + e.piece).sort(), ["0hatClosed", "0kick", "0snare"], "chart stop"));
  // section ends only: into the chorus (bar 8), the top (bar 16) and the marks, nowhere else
  recs = gen(ABC, { fills: "sections" }, seed);
  recs.forEach((r, i) => { const k = i % 16; if (k === 5) return; assert.strictEqual(isFill(r), k === 3 || k === 7 || k === 13 || k === 15, "sections: bar " + i); });
  // auto still fills into every section; busy fills at least as often as auto over many bars
  recs = gen(ABC, {}, seed); [7, 15, 23, 31].forEach(i => assert(isFill(recs[i]), "auto: section end " + i));
}
let auto = 0, busy = 0;
for (let seed = 1; seed <= 60; seed++){ auto += gen(PLAIN, { variation: 0 }, seed).filter(isFill).length; busy += gen(PLAIN, { fills: "busy", variation: 0 }, seed).filter(isFill).length; }
assert(busy > auto * 1.3, "busy " + busy + " vs auto " + auto);
// a groove with no fills of its own plays one when asked, and only then
for (const groove of ["bossa", "brushes", "boomchick"]) for (let seed = 1; seed <= 10; seed++){
  const a = BandMidi.generate(TuneChart.parse(PLAIN), { bars: 16, opts: { groove, feel: "straight" }, rng: mb(seed) });
  const b = BandMidi.generate(TuneChart.parse(PLAIN), { bars: 16, opts: { groove, feel: "straight", fillBars: { 6: "medium" } }, rng: mb(seed) });
  if (BandDrums.GROOVES[groove] && !BandDrums.GROOVES[groove].fills) assert.notDeepStrictEqual(b[6].parts.drums.map(e => e.pos + e.piece), a[6].parts.drums.map(e => e.pos + e.piece), groove + ": asked fill changes the bar");
}
// half and double time: the mark still lands at the end of the chart bar
for (const tf of ["half", "double"]) for (let seed = 1; seed <= 10; seed++){
  const recs = gen(PLAIN, { fills: "none", fillBars: { 5: "medium" }, timeFeel: tf }, seed, 16), plain = gen(PLAIN, { fills: "none", timeFeel: tf }, seed, 16);
  assert.notDeepStrictEqual(recs[5].parts.drums.map(e => e.pos + e.piece), plain[5].parts.drums.map(e => e.pos + e.piece), tf + ": fill on bar 6");
  [1, 2, 9, 10].forEach(i => assert.deepStrictEqual(recs[i].parts.drums.map(e => e.pos + e.piece), plain[i].parts.drums.map(e => e.pos + e.piece), tf + ": other bars untouched " + i));
}
console.log("FILL RULES OK", n);

// ---- the player, on a clock this test turns by hand ----
let now = 0; const played = [];
global.AudioContext = function(){ const node = () => ({ gain: { value: 1, setTargetAtTime(){}, cancelScheduledValues(){}, setValueAtTime(){}, linearRampToValueAtTime(){} }, connect(){}, disconnect(){}, threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, frequency: {} });
  return { get currentTime(){ return now; }, sampleRate: 44100, state: "running", outputLatency: 0, destination: {}, createGain: node, createDynamicsCompressor: node, createConvolver: node, createBiquadFilter: node, createWaveShaper: node,
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }) }; };
global.BandSounds = { create: () => ({ load: () => Promise.resolve(), has: () => true, play(inst, spec, t){ played.push({ inst, piece: spec.piece, t }); }, stopAll(){}, choke(){} }) };
const timers = []; global.setInterval = fn => { timers.push(fn); return timers.length; }; global.clearInterval = () => { timers.length = 0; };
const frames = []; global.requestAnimationFrame = fn => { frames.push(fn); return 1; }; global.cancelAnimationFrame = () => { frames.length = 0; };
function run(sec){ const end = now + sec; while (now < end){ now += 0.02; timers.slice().forEach(f => f()); const fs = frames.splice(0); fs.forEach(f => f()); } }

(async function(){
  const SEC = "X:1\nM:4/4\nL:1/4\nK:C\nP:Intro\n" + [bar("C"), bar("G")].join(" | ") + " |\nP:Verse\n" + [bar("C"), bar("F"), bar("G"), bar("C")].join(" | ") + " |\nP:Chorus\n" + [bar("F"), bar("C")].join(" | ") + " |]";
  const bars = [], secs = [], recs = [];
  const mk = hold => BandPlayer.create({ parsed: TuneChart.parse(SEC), tempo: 120, countIn: 0, choruses: 1, hold, seed: 5, humanize: 0, sectionLead: 1,
    opts: { groove: "rock", feel: "straight", ride: "hat", fills: "sections" }, onBar: i => bars.push(i), onSection: s => secs.push(s), onBarEvents: r => recs.push(r) });
  // straight through: sections announced in order, one beat early; fills into each
  let p = mk(false); assert.deepStrictEqual(p.sections().map(s => s.name + ":" + s.from + "-" + s.to), ["Intro:0-1", "Verse:2-5", "Chorus:6-7"]);
  await p.play(); run(2 * 8 + 4);
  assert.deepStrictEqual(bars.filter(b => !b.ending).map(b => b.index), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepStrictEqual(secs.map(s => s.name + (s.early ? "*" : "")), ["Intro", "Verse*", "Chorus*"]);
  assert(isFill(recs[1]) && isFill(recs[5]) && !isFill(recs[0]) && !isFill(recs[3]), "fills into Verse and Chorus");
  // the ending: the last bar is where the last chord arrives, so the band lands there (no bar added) after a set-up bar with a fill
  assert(!bars.some(b => b.ending) && bars[7].final && !bars[6].final, "landed in the last bar"); assert(!p.isPlaying());
  assert(isFill(recs[6]), "the bar before the landing is the set-up"); assert.strictEqual(recs.length, 8); assert.strictEqual(recs[7].ending, false);
  assert.deepStrictEqual(recs[7].parts.bass.map(e => e.pos + ":" + e.midi % 12), ["0:0"]); assert(recs[7].parts.bass[0].dur >= 4);
  assert.strictEqual(recs[7].parts.comp.length, 1); assert.deepStrictEqual(recs[7].parts.drums.map(e => e.pos + e.piece).sort(), ["0crash", "0kick"]);
  // hold: the intro goes round until next(); then a fill, then the verse
  bars.length = secs.length = recs.length = 0; p = mk(true); await p.play();
  run(2 * 5 + 0.5);                                           // five bars of the two-bar intro, into the sixth
  assert.deepStrictEqual(bars.map(b => b.index), [0, 1, 0, 1, 0, 1]);
  assert(!recs.slice(0, 5).some(isFill), "no fill while the section repeats");
  assert.strictEqual(p.next(), true); run(0.2);
  assert.strictEqual(isFill(recs[5]), true, "pressed in the last bar: that bar gets the fill");
  run(2);                                                    // into the verse
  assert.strictEqual(bars[6].index, 2, "moved on at the barline"); assert.strictEqual(secs[secs.length - 1].name, "Verse");
  run(2 * 4);                                                // the verse round once, and again
  assert.deepStrictEqual(bars.slice(6, 11).map(b => b.index), [2, 3, 4, 5, 2]);
  p.next(); run(2 * 4);                                      // pressed early in the pass: the verse finishes, with a fill, then the chorus
  assert.deepStrictEqual(bars.slice(10, 15).map(b => b.index), [2, 3, 4, 5, 6]);
  assert(isFill(recs[13]), "fill at the end of the verse");
  // Fill now, in the first bar of the chorus: it lands at the end of that bar
  const before = played.length; assert.strictEqual(p.fill("medium"), "now"); run(1.6);
  assert(isFill(recs[14]), "the record of the bar has the fill"); assert(played.slice(before).some(e => /tom|snare/.test(e.piece || "")));
  // ... and with no room left in the bar, on the next one
  run(1.4); assert.strictEqual(p.fill("small"), "next"); run(2.2); assert(isFill(recs[16]), "queued fill on the next bar");
  // goSection in hold mode: back to the verse at the end of this pass
  p.goSection(1); run(4.4); assert.deepStrictEqual(bars.slice(17, 20).map(b => b.index), [7, 2, 3]);
  // on to the last section, then next(): the ending
  p.next(); run(9); assert.strictEqual(bars[bars.length - 1].index, 7); p.next(); run(10);
  assert(bars.some(b => b.ending), "hold: ending after the last section"); assert(!p.isPlaying());
  // a melody written on the chart's bars is played on the comping instrument, unless switched off
  const pm = TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n\"C\"z4 | \"G\"z4 |]"); pm.bars[0].melody = [{ pos: 0, dur: 1.5, midi: 72 }, { pos: 1.5, dur: 0.5, midi: 74 }];
  for (const on of [true, false]){ const evs = []; const q = BandPlayer.create({ parsed: pm, tempo: 120, countIn: 0, choruses: 1, seed: 3, humanize: 0, opts: { comp: "guitar", melody: on }, onEvent: e => evs.push(e) });
    await q.play(); run(6); const lead = evs.filter(e => e.part === "comp" && e.midis && e.midis.length === 1 && (e.midis[0] === 72 || e.midis[0] === 74) && e.vel > 0.7);
    assert.strictEqual(lead.length, on ? 2 : 0, "melody " + on); q.stop(); }
  // a song's sections build by themselves: each time a kind of section comes round it is played harder; a chorus above a verse
  { const P = n => "P:" + n + "\n" + [bar("C"), bar("F"), bar("G"), bar("C")].join(" | ") + " |\n", seen = [];
    const ps = BandPlayer.create({ parsed: TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n" + ["Intro", "Verse 1", "Verse 2", "Chorus", "Chorus", "Outro"].map(P).join("")), tempo: 240, countIn: 0, choruses: 1, seed: 2, humanize: 0, onBar: i => seen.push(i) });
    await ps.play(); run(24 + 4); const lv = [0, 4, 8, 12, 16, 20].map(i => seen.filter(b => b.index === i)[0].intensity);
    assert(lv[0] < lv[1] && lv[1] < lv[2] && lv[2] < lv[3] && lv[3] < lv[4], "levels rise: " + lv.join(" ")); assert(lv[5] > lv[1]);
    assert(seen.filter(b => b.index === 7)[0].intensity > lv[1], "leans into the next verse"); }
  // ---- endings ----
  { const tune = (cs, x) => TuneChart.parse("X:1\nM:4/4\nL:1/4\nK:C\n" + cs.map((c, i) => (x && x[i] ? '"^' + x[i] + '"' : "") + c.split(" ").map(y => '"' + y + '"z' + 4 / c.split(" ").length).join("")).join(" | ") + " |]");
    const go = async (parsed, opts, extra) => { const bs = [], rs = [], t0 = now; const q = BandPlayer.create(Object.assign({ parsed, tempo: 120, countIn: 0, choruses: 1, seed: 4, humanize: 0,
        opts: Object.assign({ groove: "rock", feel: "straight", ride: "hat", fills: "sections" }, opts), onBar: i => bs.push(Object.assign({ t: now - t0 }, i)), onBarEvents: r => rs.push(r) }, extra));
      await q.play(); run(40); assert(!q.isPlaying()); return { bs, rs }; };
    // the plan itself
    const F = cs => BandHarmony.buildForm(tune(cs), 0), plan = cs => BandHarmony.endingPlan(F(cs));
    assert.deepStrictEqual(plan(["C", "F", "G", "C"]), { land: 3, setup: 2, ring: [], hold: 4 });
    assert.deepStrictEqual(plan(["C", "F", "G", "C", "C"]), { land: 3, setup: 2, ring: [4], hold: 8 });
    assert.deepStrictEqual(plan(["C", "C", "C"]), { land: 2, setup: 1, ring: [], hold: 4 }, "the last bar ends the phrase");
    assert.strictEqual(plan(["C", "F", "C", "G", "C", "F", "G7", "C", "C", "F", "C", "G", "C", "F", "C", "C"]).land, 15, "16 bars: lands on 16 though 15 holds the same chord");
    assert.strictEqual(plan(["C", "Am", "Dm7", "G7"]), null, "a turnaround"); assert.strictEqual(plan(["C", "F", "C G7"]), null, "two chords in the last bar");
    assert.deepStrictEqual(plan(["F7", "Bb7", "C7", "F7"]).land, 3, "a blues ends on its own seventh chord"); assert.deepStrictEqual(plan(["Dm7", "G7", "C"]).land, 2);
    assert.deepStrictEqual(BandHarmony.endingPlan(F(["C", "F", "G", "C"]), [2, 3, 0, 1]), { land: 1, setup: 0, ring: [], hold: 4 }, "a loop over the end: its own last bars");
    // the last chord held for two bars: the band lands on the first of them and the second is left to ring
    let e = await go(tune(["C", "F", "G", "C", "C"]));
    assert.deepStrictEqual(e.bs.map(b => b.index + (b.final ? "f" : "") + (b.ending ? "e" : "")), ["0", "1", "2", "3f", "4f"]);
    assert(isFill(e.rs[2])); assert.strictEqual(e.rs[3].parts.bass[0].dur, 8); assert.strictEqual(e.rs[3].parts.comp[0].dur, 8); assert.deepStrictEqual(e.rs[4].parts, {});
    // a turnaround: as before, the last bar played like any other and then a hit on the top chord
    e = await go(tune(["C", "Am", "Dm7", "G7"]));
    assert.deepStrictEqual(e.bs.map(b => b.index + (b.final ? "f" : "") + (b.ending ? "e" : "")), ["0", "1", "2", "3", "0e"]); assert(e.rs[3].parts.bass.length > 1);
    // only the last time through
    e = await go(tune(["C", "F", "G", "C"]), {}, { choruses: 2 });
    assert.deepStrictEqual(e.bs.map(b => b.index + (b.final ? "f" : "")), ["0", "1", "2", "3", "0", "1", "2", "3f"]); assert(e.rs[3].parts.bass.length > 1 && e.rs[7].parts.bass.length === 1);
    // no fills asked for: no set-up fill either
    e = await go(tune(["C", "F", "G", "C"]), { fills: "none" }); assert(!isFill(e.rs[2]) && e.bs[3].final, JSON.stringify([e.bs.map(b => b.index + (b.final ? "f" : "")), e.rs[2].parts.drums.map(x => x.pos + x.piece)]));
    // a ritard when it is asked for: the two bars before the landing take longer and longer, nothing before them moves
    const plainT = (await go(tune(["C", "F", "G", "Am", "F", "C"]))).bs.map(b => b.t);
    const ritT = (await go(tune(["C", "F", "G", "Am", "F", "C"]), { ritard: true })).bs.map(b => b.t), d = t => t.slice(1).map((x, i) => Math.round((x - t[i]) * 100) / 100);
    assert.deepStrictEqual(d(plainT), [2, 2, 2, 2, 2]); assert.deepStrictEqual(d(ritT).slice(0, 3), [2, 2, 2]);
    assert(Math.abs(d(ritT)[3] - 2.25) < 0.05 && Math.abs(d(ritT)[4] - 2.75) < 0.05, "ritard " + d(ritT));        // 8 beats growing to half as long again: 8 * 1.25 = 10 beats' worth
    // ... or from the bar marked in the chart, and not before the last time through
    const markT = (await go(tune(["C", "F", "G", "Am", "F", "C"], { 4: "rit." }), {}, { choruses: 2 })).bs.map(b => b.t);
    assert.deepStrictEqual(d(markT).slice(0, 10), [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]); assert(Math.abs(d(markT)[10] - 2.5) < 0.05, "marked ritard " + d(markT));
    // "^half time ballad" is read, and asks for the ballad piano in those bars whatever the style
    const hb = tune(["C", "C", "F", "F", "G", "G", "C", "C"], { 0: "half time ballad", 1: "half time ballad", 2: "half time", 3: "half time" });
    assert.deepStrictEqual(hb.bars.slice(0, 5).map(b => (b.feel || "") + "/" + (b.halfComp || "")), ["half/ballad", "half/ballad", "half/", "half/", "/"]);
    require(R + "band/catalog.js"); const so = BandCatalog.styleOpts("calypso").opts, hr = BandMidi.generate(hb, { bars: 8, tempo: 120, opts: so, rng: mb(2) }), cp = r => r.parts.comp.map(x => x.pos).join(" ");
    assert(hr[0].parts.comp.some(x => x.pos === 0) && hr[1].parts.comp.some(x => x.pos === 0), "ballad piano: " + cp(hr[0])); assert.strictEqual(cp(hr[4]), "0.5 1.5 2.5 3.5");
    assert(hr[2].parts.comp.some(x => x.pos === 0.5) && hr[2].parts.comp.some(x => x.pos === 2), "plain half time answers as before: " + cp(hr[2]));
    // a blend of bass lines and of grooves through the player: each bar is one of them and both are heard
    const bl = await go(tune(["C", "F", "G", "C", "Am", "F", "G", "C"]), { groove: "rock+brushes", bassFeel: "eighths+roots" }, { choruses: 2 });
    const gs = bl.rs.map(r => r.opts.groove), bfs = bl.rs.map(r => r.opts.bassFeel);
    assert(gs.length >= 16 && gs.every(g => g === "rock" || g === "brushes") && bfs.every(b => b === "eighths" || b === "roots"), gs.join(" "));
    assert(gs.includes("rock") && gs.includes("brushes") && bfs.includes("eighths") && bfs.includes("roots"));
    assert(bl.rs.slice(0, 14).every(r => r.parts.drums.length > 0 && r.parts.bass.length > 0), "every bar is played");
    console.log("ENDINGS OK"); }
  console.log("HOLD AND FILL NOW OK", bars.length, "bars");
})().catch(e => { console.error(e); process.exit(1); });

// ---- marks written back into the ABC ----
(function(){
  const src = "X:1\nT:x\nM:4/4\nL:1/4\nK:F\nP:Verse\n\"F7\"z4 | \"Bb7\"z4 | \"F7\"z4 | \"^stop\"\"F7\"z4 |\n% a comment\n\"Bb7\"z2 \"^fill\"\"Bdim\"z2 | \"F7\"z4 \\\n | \"C7\"z4 | [M:3/4] \"F7\"z3 |]";
  const p0 = TuneChart.parse(src); assert.strictEqual(p0.bars.length, 8); assert(p0.bars[3].stop && p0.bars[4].fill === "medium");
  let out = TuneChart.setMarks(src, { stops: [1, 7], fills: { 2: "large", 6: "small" } });
  let p = TuneChart.parse(out);
  assert.deepStrictEqual(p.bars.map((b, i) => b.stop ? i : -1).filter(i => i >= 0), [1, 7]);
  assert.deepStrictEqual(p.bars.map(b => b.fill || ""), ["", "", "large", "", "", "", "small", ""]);
  assert.deepStrictEqual(p.bars.map(b => b.chords.map(c => c.sym).join(" ")), p0.bars.map(b => b.chords.map(c => c.sym).join(" ")), "chords untouched");
  assert.deepStrictEqual(p.bars.map(b => b.lengthUnits), p0.bars.map(b => b.lengthUnits)); assert.strictEqual(p.bars[0].section, "Verse"); assert.strictEqual(p.bars[7].meter.n, 3);
  assert(out.includes("% a comment") && out.includes("T:x"));
  // one kind at a time; clearing; and a round trip back to no marks
  out = TuneChart.setMarks(out, { stops: [] }); p = TuneChart.parse(out); assert(!p.bars.some(b => b.stop)); assert.strictEqual(p.bars[2].fill, "large");
  out = TuneChart.setMarks(out, { fills: {} }); assert.strictEqual(out, TuneChart.setMarks(src, { stops: [], fills: {} }));
  assert(!/\^(stop|fill)/.test(out));
  console.log("MARKS IN THE ABC OK");
})();
