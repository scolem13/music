// The patterns ported from the old Accompaniment Styles page (comping set patterns and set bass lines)
// and comping from several ticked rhythms ("a+b+c").
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/catalog.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"].forEach(f => require(R + f));
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const BARS = "F7|Bb7|F7|Cm7 F7|Bb7|Bdim7|F7|Am7 D7|Gm7|C7|F7 D7|Gm7 C7".split("|");
const M = { "4/4": { L: "1/4", one: "4", two: ["2", "2"], beats: 4 }, "3/4": { L: "1/4", one: "3", two: ["2", ""], beats: 3 },
            "6/8": { L: "1/8", one: "6", two: ["3", "3"], beats: 2 }, "12/8": { L: "1/8", one: "12", two: ["6", "6"], beats: 4 } };
const abcOf = (id, bars) => "X:1\nT:t\nM:" + id + "\nL:" + M[id].L + "\nK:F\n" + (bars || BARS).map(b => { const c = b.split(" "), m = M[id];
  return c.length > 1 ? `"${c[0]}"z${m.two[0]} "${c[1]}"z${m.two[1]}` : `"${c[0]}"z${m.one}`; }).join(" | ") + " |]";
const gen = (id, opts, seed, bars, n) => BandMidi.generate(TuneChart.parse(abcOf(id, bars)), { bars: n || 48, tempo: 126, opts, rng: mb(seed) });
const pos = evs => evs.map(e => e.pos).join(" ");
const C = BandCatalog, GRID = Object.keys(BandComp.GRID), LINES = Object.keys(BandBass.LINES);

// the catalog and the engines name the same things; every style points at real entries
GRID.forEach(id => assert(C.byId(C.comp, id), "catalog has comp " + id));
LINES.forEach(id => assert(C.byId(C.bass, id), "catalog has bass " + id));
C.styles.forEach(s => { assert(/^(swing|straight)$/.test(s.feel) && s.group && s.genres && s.desc, s.id);
  [["bass", C.bass], ["rhythm", C.comp], ["drums", C.drums]].forEach(([k, l]) => String(s[k]).split("+").forEach(id => assert(C.fits(C.byId(l, id), s.id), s.id + ": its own " + k + " fits it")));
  ["piano", "guitar"].forEach(i => { assert(C.voicings[i][s.voicing[i]].fits.includes(s.id), s.id + " " + i + " voicing"); assert(BandHarmony.hasStyle(i, s.voicing[i])); }); });
["piano", "guitar"].forEach(i => BandHarmony.styleList(i).forEach(v => assert(C.voicings[i][v.id], "voicing " + i + " " + v.id + " has genres")));
Object.keys(BandDrums.GROOVES).forEach(id => assert(C.byId(C.drums, id), "catalog has groove " + id));
C.comp.concat(C.bass, C.drums).forEach(e => { assert(e.fits.length, e.id + " fits a style"); e.fits.forEach(f => assert(C.byId(C.styles, f), e.id + " fits " + f)); });
C.comp.concat(C.bass, C.drums).forEach(e => assert(e.group && e.desc && e.label, e.id));

// every pattern, every meter: inside the bar, sane lengths, every chord heard by the comping
let n = 0;
for (const id of Object.keys(M)) for (const compRhythm of GRID) for (const bassFeel of LINES) for (const comp of ["piano", "guitar"]){
  const recs = gen(id, { compRhythm, bassFeel, comp, feel: "straight", voiceMove: n % 2 ? "move" : "hold", stops: [9] }, ++n);
  recs.forEach((r, i) => { const tag = [id, compRhythm, bassFeel, comp, "bar", i].join(" "), beats = M[id].beats;
    r.parts.comp.forEach(e => { assert(e.pos >= 0 && e.pos < beats && e.dur > 0.05 && e.pos + e.dur <= beats + 1e-6, tag + " comp " + JSON.stringify(e)); assert(e.midis.length >= 1 && e.midis.every(m => m >= 36 && m <= 90), tag); });
    r.parts.bass.forEach(e => { assert(e.pos >= 0 && e.pos < beats && e.dur > 0.05, tag + " bass " + JSON.stringify(e)); assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI, tag + " bass range " + e.midi); });
    if (r.index !== 9 && !BandComp.GRID[compRhythm].exact) r.chords.forEach   /* (So What leaves the call bar empty) */(c => assert(r.parts.comp.some(e => e.of === r.index + ":" + c.pos), tag + " hears " + c.chord.sym));
    if (r.index === 9){ assert.strictEqual(pos(r.parts.comp), "0", tag + " stop comp"); assert(r.parts.bass[0].pos === 0, tag + " stop bass"); }
  });
}

// 4/4, one chord a bar: the rhythms as described
const ONE = "F7|F7|Bb7|Bb7|F7|F7|C7|C7".split("|");
const want = { oompah: ["1 3"], eighths: ["0 0.5 1 1.5 2 2.5 3 3.5"], upbeats: ["0.5 1.5 2.5 3.5"], bossa: ["0 1.5 3", "1 2.5"], tango: ["0 1.5 2 3"],
               montuno: ["0 1 1.5 2.5 3.5", "0.5 1.5 2.5 3.5"], chacha: ["1 2 2.5 3"], arp: ["0 0.5 1 1.5 2 2.5 3 3.5"], arp2: ["0 0.5 1 1.5 2 2.5 3 3.5"],
               strumCamp: ["0 1 1.5 2.5 3 3.5"], strumFolk: ["0 1 1.5 2 3 3.5"], strumEights: ["0 0.5 1 1.5 2 2.5 3 3.5"], strumQuarters: ["0 1 2 3"], strum332: ["0 1 1.5 2.5 3 3.5"],
               strum16: ["0 0.5 0.75 1.25 1.5 1.75 2 2.5 2.75 3.25 3.5 3.75"], sowhat: ["", "2 3.5"], maiden: ["0 1.5 3", "1.5 3"], takefive: ["0 1.5 3"], tresillo: ["0 1.5 3"], clave32: ["0 1.5 3", "1 2"], barbara: ["0 1 2 3.5", "0.5 1.5 2"], g333322: ["0 1.5 3", "0.5 2 3"], g33433: ["0 1.5 3", "1 2.5"],
               g3x8: ["0 0.75 1.5 2.25 3 3.75", "0.5 1.25 2 2.5 3 3.5"], alberti: ["0 0.5 1 1.5 2 2.5 3 3.5"],
               ballRock: ["0 2", "0 2 3.5"], ballBroken: ["2", "0"], ballSync: ["0 1.5 3", "0 1.5"], hymn: ["0"], quarters: ["0 1 2 3"], triplets: [[0, 1, 2, 3].map(b => [b, b + 1 / 3, b + 2 / 3].join(" ")).join(" ")] };
// (the piano's left-hand root under a strum or an lh pattern is a separate one-note event, marked arp like an arpeggio note)
const rh = (id, evs) => BandComp.GRID[id].arp ? evs : BandComp.GRID[id].ballad ? evs.filter(e => e.midis.length > 1 && e.hand !== "L")   /* (the ballad: the right hand's chords and pairs) */
  : evs.filter(e => !(e.arp && e.midis.length === 1));
for (const id of GRID) gen("4/4", { compRhythm: id }, 5, ONE, 16).forEach(r => assert.strictEqual(pos(rh(id, r.parts.comp)), want[id][r.index % want[id].length], id + " bar " + r.index));
// the left hand: one root below the chord each time a chord arrives, on the piano only, and never in the hand-off
{ const q = gen("4/4", { compRhythm: "quarters" }, 5, ONE, 8), lh = r => r.parts.comp.filter(e => e.arp);
  q.forEach(r => { assert.strictEqual(lh(r).length, 1); const l = lh(r)[0], top = r.parts.comp.find(e => !e.arp);
    assert(l.pos === 0 && l.midis[0] >= 36 && l.midis[0] <= 52 && l.midis[0] < top.midis[0] - 3 && l.midis[0] % 12 === r.chords[0].chord.bass, JSON.stringify(l)); });
  assert(gen("4/4", { compRhythm: "quarters", comp: "guitar" }, 5, ONE, 4).every(r => !r.parts.comp.some(e => e.arp)), "no left hand on a guitar");
  assert(gen("12/8", { compRhythm: "triplets" }, 5, ONE, 4).every(r => rh("triplets", r.parts.comp).length === 12 && r.parts.comp.filter(e => e.pos % 1 > 0.01).every(e => e.straight)), "triplets in 12/8"); }
assert.strictEqual(pos(gen("3/4", { compRhythm: "oompah" }, 5, ONE, 4)[1].parts.comp), "1 2", "oom-pah-pah in 3/4");
// arpeggios: single notes from one voicing, marked so the Chord Sheet hand-off ignores them
gen("4/4", { compRhythm: "arp", voicing: "drop2" }, 3, ONE, 8).forEach(r => { const ms = r.parts.comp.map(e => e.midis[0]);
  assert(r.parts.comp.every(e => e.midis.length === 1 && e.arp)); assert.strictEqual(new Set(ms).size, 4, "four notes of a drop 2"); assert(ms[0] < ms[1] && ms[1] < ms[2] && ms[2] < ms[3] && ms[4] === ms[2] && ms[6] === ms[0]); });
gen("4/4", { compRhythm: "arp2", voicing: "drop2" }, 3, ONE, 8).forEach(r => assert.strictEqual(new Set(r.parts.comp.map(e => e.midis[0])).size, 2));
BandHarmony.asPlayed(gen("4/4", { compRhythm: "arp", voicing: "drop2" }, 3, ONE, 8), { style: "drop2", inst: "piano" }).forEach(c => assert.strictEqual(c.midis.length, 4, "hand-off voices " + c.sym + " in full"));

// strums: downstrokes are the whole voicing, upstrokes its top three notes and lighter; one shape per chord; chords ring to the next stroke
gen("4/4", { compRhythm: "strumCamp", voicing: "drop2", comp: "guitar", voiceMove: "move" }, 3, ONE, 8).forEach(r => { const c = r.parts.comp, full = c[0].midis;
  assert.deepStrictEqual(c.map(e => e.strum), ["down", "down", "up", "up", "down", "up"]); assert.strictEqual(full.length, 4);
  c.forEach((e, i) => { assert.deepStrictEqual(e.midis, e.strum === "up" ? full.slice(-3) : full, "one shape for the bar"); assert(e.vel < (e.strum === "up" ? 0.5 : 0.72));
    assert(Math.abs(e.pos + e.dur - (i + 1 < c.length ? c[i + 1].pos : 4)) < 0.03, "rings to the next stroke"); }); });
{ const acc = id => rh(id, gen("4/4", { compRhythm: id }, 3, ONE, 8)[2].parts.comp).filter(e => e.vel > 0.585).map(e => e.pos).join(" ");
  assert.strictEqual(acc("strum332"), "0 1.5 3", "3-3-2 accents"); assert.strictEqual(acc("strumEights"), "1 3"); }
BandHarmony.asPlayed(gen("4/4", { compRhythm: "strumEights", voicing: "drop2" }, 3, ONE, 8), { style: "drop2", inst: "piano" }).forEach(c => assert.strictEqual(c.midis.length, 4));
// open and barre chords
{ const shape = sym => { const c = BandHarmony.voicing(BandHarmony.parseChord(sym, 0), "open", null, "guitar"), g = BandHarmony.openShape(BandHarmony.parseChord(sym, 0));
    assert.deepStrictEqual(c, g.midis); const fr = ["x", "x", "x", "x", "x", "x"]; g.strings.forEach(s => fr[s.string] = s.fret); return fr.join(fr.some(f => f > 9) ? "-" : ""); };
  const want = { C: "x32010", G: "320003", D: "xx0232", A: "x02220", E: "022100", Am: "x02210", Em: "022000", Dm: "xx0231", F: "133211", Bb: "x13331", Bm: "x24432", "F#m": "244222", "C#m": "x46654",
    Eb: "x68886", Ab: "466544", B7: "x21202", G7: "320001", C7: "x32310", F7: "131211", Bb7: "x13131", Cmaj7: "x32000", Fmaj7: "xx3210", Am7: "x02010", Gm7: "353333", Cm7: "x35343",
    Dsus4: "xx0233", Asus2: "x02200", E5: "022xxx", C9: "x32310", C6: "x32010", "D/F#": "xx0232", Bdim: "x23434", Bm7b5: "x2323x", Gm: "355333", Cm: "x35543" };
  Object.keys(want).forEach(sym => assert.strictEqual(shape(sym), want[sym], sym));
  // every root and quality: a playable shape made only of chord tones, root lowest, within four frets
  for (let t = 0; t < 12; t++) for (const q of ["", "m", "7", "m7", "maj7", "sus4", "sus2", "7sus4", "5", "+", "dim7", "m7b5", "9", "13", "m9", "6", "m6"]){
    const c = BandHarmony.parseChord("C" + q, t), g = BandHarmony.openShape(c), tag = c.label + " " + JSON.stringify(g && g.strings);
    assert(g && g.strings.length >= 3 && g.span <= 4, tag); assert.strictEqual(((g.midis[0] - c.root) % 12 + 12) % 12, 0, "root in the bass: " + tag);
    g.midis.forEach(m => assert(c.tones.includes(((m - c.root) % 12 + 12) % 12), "chord tone: " + tag)); assert(g.strings.every(s => s.fret <= 15), tag);
    assert.deepStrictEqual(g.midis, g.midis.slice().sort((a, b) => a - b)); }
  // strummed through the band: full shapes with their fingering attached, the same shape every time the chord comes round
  const recs = gen("4/4", { compRhythm: "strumCamp", voicing: "open", comp: "guitar", voiceMove: "move" }, 3, ONE, 16);
  recs.forEach(r => { const d = r.parts.comp.filter(e => e.strum === "down"); assert(d.length === 3 && d.every(e => e.midis.length >= 5 && e.strings && e.strings.length === e.midis.length), "full barre shapes, bar " + r.index); });
  const hand = BandHarmony.asPlayed(recs, { style: "open", inst: "guitar" }); assert(hand.every(c => c.strings && c.strings.length === c.midis.length));
  assert(!BandHarmony.hasStyle("piano", "open") && BandHarmony.hasStyle("guitar", "open") && BandHarmony.hasStyle("guitar", "open+triad3"));
}
const pc = n => ((n % 12) + 12) % 12;
// colour: written and unmarked extensions
{ const H = BandHarmony, ch = s => H.parseChord(s, 0), t = c => c.tones.join(",");
  { const c7 = ch("C7"); assert.strictEqual(H.colour(c7, {}), c7, "nothing to add: the chord itself"); }
  assert.strictEqual(t(H.colour(ch("C9"), {})), "0,2,4,7,10", "a written 9th is part of the chord"); assert.strictEqual(t(H.colour(ch("C13"), {})), "0,2,4,7,9,10"); assert.strictEqual(t(H.colour(ch("Cm9"), {})), "0,2,3,7,10");
  assert.strictEqual(t(H.colour(ch("C7"), { nine: true })), "0,2,4,7,10"); assert.strictEqual(t(H.colour(ch("C7"), { thirteen: true })), "0,2,4,7,9,10"); assert.strictEqual(t(H.colour(ch("Cm7"), { nine: true, thirteen: true })), "0,2,3,7,10");
  assert.strictEqual(t(H.colour(ch("Cmaj7"), { six: true })), "0,4,7,9"); assert.strictEqual(t(H.colour(ch("Cmaj7"), { six: true, nine: true })), "0,2,4,7,9"); assert.strictEqual(t(H.colour(ch("Cmaj7"), { nine: true })), "0,2,4,7,11");
  // nothing unmarked on triads, sus, half-diminished, or anything already extended or altered
  ["C", "Cm", "C7sus4", "Cm7b5", "Cdim7", "C7b9", "C7alt", "C7#11", "C6", "C+"].forEach(s => { const c = ch(s); assert.strictEqual(H.colour(c, { six: true, nine: true, thirteen: true }), c, s + " is left alone"); });
  assert.strictEqual(t(H.colour(ch("C9"), { thirteen: true })), "0,2,4,7,10", "a chord that writes its extension keeps exactly that");
  // through the band: Never = as before; Always puts the 9th in every drop 2 dominant; Sometimes does it some of the time, one decision per chord arrival
  const has9 = (r, e) => e.midis.some(m => ((m - r.chords[0].chord.root) % 12 + 12) % 12 === 2), run = (extend, seed) => gen("4/4", { compRhythm: "charleston", voicing: "drop2", extend }, seed, ONE, 64);
  assert.deepStrictEqual(run(null, 5).map(r => r.parts.comp), run({ amount: 0, nine: true }, 5).map(r => r.parts.comp));
  assert(run(null, 5).every(r => r.parts.comp.every(e => !has9(r, e)))); assert(run({ amount: 1, nine: true }, 5).every(r => r.parts.comp.every(e => has9(r, e))));
  assert(run({ amount: 1, six: true, nine: false }, 5).every(r => r.parts.comp.every(e => !has9(r, e))), "kinds that are off stay off");
  const some = run({ amount: 0.35, nine: true }, 6), bars = some.map(r => r.parts.comp.filter(e => e.pos < 3).map(e => has9(r, e))), yes = bars.filter(b => b[0]).length;
  assert(yes > 6 && yes < 50, "sometimes: " + yes + " of 64 bars"); bars.forEach((b, i) => assert(b.every(x => x === b[0]), "one decision per chord, bar " + i));
  assert.deepStrictEqual(gen("4/4", { voicing: "drop2", maj6: true }, 5, ["Fmaj7"], 4).map(r => r.parts.comp), gen("4/4", { voicing: "drop2", extend: { amount: 1, six: true } }, 5, ["Fmaj7"], 4).map(r => r.parts.comp), "maj6 is the old name");
}
// bass lines
const bw = { roots: "0 1 2 3", alt: "0 2", bossa: "0 1.5 2 3.5", tango: "0 1.5 2 3", chacha: "0 2 3" };
for (const id of Object.keys(bw)) gen("4/4", { bassFeel: id }, 9, ONE, 16).forEach(r => { assert.strictEqual(pos(r.parts.bass), bw[id], id + " bar " + r.index);
  assert.strictEqual(pc(r.parts.bass[0].midi), r.chords[0].chord.bass, id + " root on 1"); });
gen("4/4", { bassFeel: "alt" }, 9, ONE, 8).forEach(r => assert.strictEqual(pc(r.parts.bass[1].midi), pc(r.chords[0].chord.root + 7), "fifth on 3"));
{ const recs = gen("4/4", { bassFeel: "tumbao" }, 9, ONE, 16);
  assert.strictEqual(pos(recs[0].parts.bass), "0 1.5 3", "tumbao states the root once");
  recs.slice(1).forEach((r, i) => { assert.strictEqual(pos(r.parts.bass), "1.5 3", "tumbao skips beat 1");
    assert.strictEqual(pc(r.parts.bass[1].midi), recs[(i + 2) % recs.length].chords[0].chord.bass, "beat 4 is the next bar's root (bar " + r.index + ")"); }); }
{ const recs = gen("4/4", { bassFeel: "bossa" }, 9, ONE, 8); recs.forEach((r, i) => assert.strictEqual(pc(r.parts.bass[3].midi), recs[(i + 1) % 8].chords[0].chord.bass, "bossa pickup is the next root")); }
{ const w = gen("3/4", { bassFeel: "alt" }, 9, ONE, 8); assert.strictEqual(pos(w[0].parts.bass), "0"); assert.strictEqual(pc(w[0].parts.bass[0].midi), 5); assert.strictEqual(pc(w[1].parts.bass[0].midi), 0, "waltz: fifth on the second bar"); }

// several rhythms ticked
const sig = r => pos(r.parts.comp);
{ // figures only: mixed bar by bar, nothing but the chosen ones (allowing the dropped beat 1 after a push)
  const recs = gen("4/4", { compRhythm: "charleston+and2" }, 21, ONE, 64), seen = new Set(recs.map(sig));
  assert(seen.has("0 1.5") && seen.has("1.5"), "both figures are heard: " + [...seen].join(" | ")); assert(seen.size <= 2, "and nothing else: " + [...seen].join(" | "));
}
{ // textures: one is at home for each four bars, with at most one bar of another (a callback, a break or foreshadowing); all of them turn up
  const recs = gen("4/4", { compRhythm: "four+bossa+upbeats" }, 22, ONE, 192), kinds = new Set(); let pure = 0, visited = 0;
  const kindOf = r => sig(r) === "0 1 2 3" ? "four" : sig(r) === "0.5 1.5 2.5 3.5" ? "upbeats" : /^(0 1.5 3|1 2.5)$/.test(sig(r)) ? "bossa" : "?" + sig(r);
  for (let i = 0; i < recs.length; i += 4){ const ks = [0, 1, 2, 3].map(j => kindOf(recs[i + j])), count = {}; ks.forEach(k => count[k] = (count[k] || 0) + 1);
    const home = Object.keys(count).sort((a, b) => count[b] - count[a])[0]; kinds.add(home); assert(count[home] >= 2 && Object.keys(count).length <= 3 && ks[0] === home, "bars " + i + ": " + ks.join(" "));
    if (count[home] === 4) pure++; else visited++; }
  assert.deepStrictEqual([...kinds].sort(), ["bossa", "four", "upbeats"]); assert(pure > 8 && visited > 8, "plain spans " + pure + ", spans with a visitor " + visited);
}
{ // figures and a texture together: no push into a phrase that may change texture
  const recs = gen("4/4", { compRhythm: "garland+charleston+four" }, 23, ONE, 96); let fig = 0, four = 0;
  recs.forEach((r, i) => { const isFour = x => sig(x) === "0 1 2 3"; if (isFour(r)) four++; else fig++; if (recs[i + 1] && isFour(recs[i + 1]) !== isFour(r)) assert(r.parts.comp.every(e => e.pos < 3.5), "bar " + i + " does not push into another texture"); });
  assert(fig > 8 && four > 8, "both kinds heard: " + fig + " / " + four);
}
{ // "auto" in a set is ignored; a single member behaves as before; unknown ids fall back to Varied
  assert.deepStrictEqual(gen("4/4", { compRhythm: "auto+four" }, 4, ONE, 8).map(sig), gen("4/4", { compRhythm: "four" }, 4, ONE, 8).map(sig));
  assert.deepStrictEqual(gen("4/4", { compRhythm: "nonsense" }, 4, ONE, 8).map(sig), gen("4/4", { compRhythm: "auto" }, 4, ONE, 8).map(sig));
}
// the riff with a little walking: only at the end of four-bar phrases, never at the top; the walked bar leads into the next root
{ let walked = 0, two = 0, joins = 0, leaps = 0; const N16 = "F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|F7|F7".split("|");
  for (let seed = 1; seed <= 12; seed++){ const recs = gen("4/4", { bassFeel: "riffwalk", feel: "straight" }, seed, N16, 96);
    recs.forEach((r, i) => { const b = r.parts.bass, isWalk = pos(b) === "0 1 2 3" || (b.length >= 4 && b.every(e => e.pos === Math.floor(e.pos) || e.dur <= 0.5) && b.filter(e => e.pos === Math.floor(e.pos)).length === 4);
      if (!isWalk) return; walked++; assert(r.index % 4 >= 2, "walks only in the back half of a phrase (bar " + r.index + ")");
      if (r.index % 4 === 2){ two++; }
      const nx = r.index % 4 === 3 ? recs[i + 1] : null; if (nx && nx.parts.bass.length) assert.strictEqual(pc(nx.parts.bass[0].midi), nx.chords[0].chord.bass, "the next bar lands on its root");
      const last = b[b.length - 1]; if (nx){ joins++; if (Math.abs(last.midi - nx.parts.bass[0].midi) > 7) leaps++; } });
    assert.deepStrictEqual(gen("4/4", { bassFeel: "riff", feel: "straight" }, seed, N16, 4).map(r => pos(r.parts.bass))[0].slice(0, 5), "0 1.5"); }
  const phrases = 12 * 24; assert(walked > phrases * 0.3 && walked < phrases * 0.95, "about half the phrases: " + walked + " of " + phrases); assert(two > 0 && two < walked / 3, "two-bar walks are the rare case: " + two);
  assert(leaps <= joins * 0.05, "the walked bar steps into the riff's root: " + leaps + " leaps in " + joins);
}
// drum grooves
const PIECES = "kick snare rim hatClosed hatFoot hatOpen ride rideBell crash tomHi tomMid tomLo clap tamb".split(" ");
const at = (r, piece) => r.parts.drums.filter(e => e.piece === piece).map(e => e.pos).join(" ");
for (const id of Object.keys(M)) for (const groove of Object.keys(BandDrums.GROOVES)) for (const ride of ["ride", "hat", "bell"])
  gen(id, { groove, ride, feel: "straight", stops: [9] }, ++n).forEach((r, i) => r.parts.drums.forEach(e => { if (e.choke) return;
    assert(PIECES.includes(e.piece) && e.pos >= 0 && e.pos < M[id].beats && e.vel > 0.1 && e.vel <= 1, [id, groove, ride, i, JSON.stringify(e)].join(" ")); }));
{ const g = o => gen("4/4", Object.assign({ feel: "straight" }, o), 31, ONE, 16);
  g({ groove: "clave" }).forEach(r => assert.strictEqual(at(r, "rim"), r.index % 2 ? "0 1.5 3" : "1 2", "2-3 son clave, bar " + r.index));
  g({ groove: "bossa" }).forEach(r => { assert.strictEqual(at(r, "rim"), r.index % 2 ? "1 2.5" : "0 1.5 3"); assert.strictEqual(at(r, "kick"), "0 1.5 2 3.5"); assert.strictEqual(at(r, "ride").split(" ").length, 8); });
  g({ groove: "onedrop" }).forEach(r => { assert.strictEqual(at(r, "kick"), "2"); assert.strictEqual(at(r, "rim"), "2"); });
  g({ groove: "bossa", ride: "hat" }).forEach(r => { assert.strictEqual(at(r, "hatFoot"), ""); assert.strictEqual(at(r, "ride"), ""); });
  // the Latin and Caribbean grooves never fill; rock does, and comes back in on a crash
  ["bossa", "clave", "chacha", "tango", "calypso", "onedrop"].forEach(id => assert(g({ groove: id }).every(r => !/tom|crash/.test(r.parts.drums.map(e => id === "chacha" && e.pos >= 3 ? "" : e.piece).join(" "))), id + " plays no fills"));
  const rock = gen("4/4", { groove: "rock", feel: "straight" }, 7, null, 96); assert(rock.some(r => at(r, "crash") === "0")); rock.filter(r => r.index < 11 && r.index % 4 !== 3).forEach(r => assert.strictEqual(at(r, "snare"), "1 3"));
  // 3/4: a groove with no three-beat bar falls back to the waltz time; the two-beat has its own
  assert(gen("3/4", { groove: "bossa", feel: "straight" }, 3, ONE, 4)[1].parts.drums.some(e => e.piece === "ride"));
  assert.strictEqual(at(gen("3/4", { groove: "boomchick" }, 3, ONE, 4)[1], "snare"), "1 2");
  // no groove chosen: the part is what it always was
  assert.deepStrictEqual(g({ groove: "auto" }).map(r => r.parts.drums), g({}).map(r => r.parts.drums));
}
// notation and MIDI take the new patterns
{ const recs = gen("4/4", { compRhythm: "arp", bassFeel: "tumbao", feel: "straight" }, 2, ONE, 8);
  assert(BandNotation.toAbc(recs, { key: "F" }).length > 100); assert(BandMidi.build(recs).length > 200); }
console.log("PATTERNS OK:", n, "option sets");
