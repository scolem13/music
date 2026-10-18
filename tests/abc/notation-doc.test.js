// node tests/abc/notation-doc.test.js -> "NOTATION DOC OK (n tests)"
const assert = require("assert");
require("../../apps/shared/abc-core.js");
require("../../apps/shared/abc-events.js");
const D = require("../../apps/shared/notation-doc.js");

let n = 0;
function t(name, f) { try { f(); n++; } catch (e) { console.error("FAIL " + name + "\n" + e.stack); process.exit(1); } }
const music = abc => abc.split("\n").filter(l => l && !/^[A-Z]:/.test(l)).join("\n");

t("spell in keys, accidentals carry to the barline", () => {
  assert.strictEqual(D.spell(66, "G", {}), "F");
  assert.strictEqual(D.spell(65, "G", {}), "=F");
  const bar = {};
  assert.strictEqual(D.spell(66, "C", bar), "^F");
  assert.strictEqual(D.spell(66, "C", bar), "F");
  assert.strictEqual(D.spell(65, "C", bar), "=F");
  assert.strictEqual(D.spell(70, "F", {}), "B");
  assert.strictEqual(D.spell(70, "C", {}), "^A");
  assert.strictEqual(D.spell(72, "C", {}), "c");
  assert.strictEqual(D.spell(48, "C", {}), "C,");
  assert.strictEqual(D.spell(84, "C", {}), "c'");
});

t("meter families", () => {
  assert.strictEqual(D.meterInfo("4/4").family, "duple");
  assert.strictEqual(D.meterInfo("3/4").barQ, 3);
  assert.strictEqual(D.meterInfo("6/8").family, "triple");
  assert.strictEqual(D.meterInfo("7/8").family, "other");
  assert.strictEqual(D.meterInfo(null), null);
});

t("no meter: nothing metered, pitches wait", () => {
  const d = D.create(); d.chunks[0].pitches = [60, 62, 64];
  assert.strictEqual(music(D.toAbc(d).abc), "");
  const p = D.pendingAbc(d);
  assert.strictEqual(p.map.length, 3);
  assert.ok(/C2 D2 E2/.test(p.abc));
});

t("pitches fill note slots, rests skipped, empty slots slashed", () => {
  const d = D.create(); d.meter = "4/4";
  d.chunks[0].rhythm = [{ type: "note", durQ: 1 }, { type: "rest", durQ: 1 }, { type: "note", durQ: 1 }, { type: "note", durQ: 1 }];
  d.chunks[0].pitches = [60, 62];
  const r = D.toAbc(d);
  assert.strictEqual(music(r.abc), "C2 z2 D2 !style=rhythm!B2 |]");
  assert.deepStrictEqual(r.map.map(m => m.filled), [true, null, true, false]);
  assert.strictEqual(D.pendingAbc(d), null);
});

t("notes over the barline are tied, rests split", () => {
  const d = D.create(); d.meter = "3/4";
  d.chunks[0].rhythm = [{ type: "note", durQ: 2 }, { type: "note", durQ: 2 }, { type: "rest", durQ: 2 }];
  d.chunks[0].pitches = [67, 69];
  const r = D.toAbc(d);
  assert.strictEqual(music(r.abc), "G4 A2- | A2 z4 |]");
  assert.deepStrictEqual(r.map.map(m => m.slot), [0, 1, 1, 2]);
});

t("odd lengths become tied writable pieces; map offsets point at the notes", () => {
  const d = D.create(); d.meter = "4/4";
  d.chunks[0].rhythm = [{ type: "note", durQ: 1.25 }, { type: "note", durQ: 2.75 }];
  d.chunks[0].pitches = [60, 64];
  const r = D.toAbc(d);
  assert.strictEqual(music(r.abc), "C2- C/2E3/2- E4 |]");
  r.map.forEach(m => assert.ok(/^[A-Ga-g]/.test(r.abc.slice(m.start, m.end))));
});

t("chunks follow each other and are labelled", () => {
  const d = D.create(); d.meter = "2/4";
  d.chunks = [Object.assign(D.newChunk("Intro"), { rhythm: [{ type: "note", durQ: 2 }], pitches: [60] }),
              Object.assign(D.newChunk("Verse"), { rhythm: [{ type: "note", durQ: 1 }, { type: "note", durQ: 1 }], pitches: [62, 64, 65] })];
  const r = D.toAbc(d);
  assert.strictEqual(music(r.abc), '"^Intro"C4 | "^Verse"D2 E2 |]');
  assert.strictEqual(D.pendingAbc(d).map[0].chunk, 1);
});

t("round trip through ABC keeps rhythm, pitches and empty slots", () => {
  const d = D.create(); d.meter = "6/8"; d.key = "D"; d.keyConfirmed = true;
  d.chunks[0].rhythm = [{ type: "note", durQ: 1 }, { type: "note", durQ: 0.5 }, { type: "note", durQ: 2.5 }, { type: "rest", durQ: 0.5 }, { type: "note", durQ: 1.5 }];
  d.chunks[0].pitches = [62, 66, 69];
  const back = D.fromAbc(D.toAbc(d).abc);
  assert.strictEqual(back.meter, "6/8");
  assert.strictEqual(back.key, "D");
  assert.deepStrictEqual(back.chunks[0].rhythm, d.chunks[0].rhythm);
  assert.deepStrictEqual(back.chunks[0].pitches, d.chunks[0].pitches);
});

t("nudge by step in the key, by semitone, by octave", () => {
  assert.strictEqual(D.nudge(64, "C", "step", 1), 65);
  assert.strictEqual(D.nudge(64, "G", "step", 1), 66);
  assert.strictEqual(D.nudge(61, "C", "step", 1), 62);
  assert.strictEqual(D.nudge(60, "C", "step", -1), 59);
  assert.strictEqual(D.nudge(60, "C", "semi", 1), 61);
  assert.strictEqual(D.nudge(60, null, "octave", -1), 48);
});

t("letters: in the key, nearest the last note", () => {
  assert.strictEqual(D.letterMidi("f", 64, "G"), 66);
  assert.strictEqual(D.letterMidi("f", 64, "C"), 65);
  assert.strictEqual(D.letterMidi("b", 60, "C"), 59);
  assert.strictEqual(D.letterMidi("g", 72, "C"), 67);
  assert.strictEqual(D.letterMidi("c", null, "C"), 60);
});

t("key guess", () => {
  const d = D.create();
  d.chunks[0].pitches = [67, 71, 74, 72, 71, 69, 66, 67];         // G B D C B A F# G
  assert.strictEqual(D.guessKey(d).key, "G");
  d.chunks[0].pitches = [57, 60, 64, 62, 60, 59, 56, 57];         // A C E D C B G# A
  assert.strictEqual(D.guessKey(d).key, "Am");
  d.chunks[0].pitches = [60, 62];
  assert.strictEqual(D.guessKey(d), null);
});

const q = n => ({ type: "note", durQ: n });
t("meter and key changes are written inline and shown in info", () => {
  const d = D.create(); d.meter = "4/4"; d.key = "G";
  d.chunks = [Object.assign(D.newChunk("A"), { rhythm: [q(4)], pitches: [67] }),
              Object.assign(D.newChunk("B"), { rhythm: [q(3)], pitches: [62], meter: "3/4", key: "D" }),
              Object.assign(D.newChunk("C"), { rhythm: [q(3)], pitches: [66], key: "D" })];
  assert.strictEqual(music(D.toAbc(d).abc), '"^A"G8 | [M:3/4][K:D]"^B"D6 | "^C"F6 |]');
  assert.strictEqual(D.hasChanges(d), true);
  const b = D.info(d, 1), c = D.info(d, 2);
  assert.ok(b.meterChange && b.keyChange && b.bars === 1);
  assert.ok(!c.meterChange && !c.keyChange && c.meter === "3/4");
  d.chunks[1].meter = null; d.chunks[1].key = null; d.chunks[2].key = null;
  assert.strictEqual(D.hasChanges(d), false);
});

t("info: bars, and which layers a chunk has", () => {
  const d = D.create(); d.meter = "3/4";
  d.chunks[0].rhythm = [q(3), q(3), q(1.5)];
  const f = D.info(d, 0);
  assert.strictEqual(f.bars, 2.5); assert.ok(f.rhythm && !f.pitches && !f.chords && !f.words);
});

t("split after a bar: a note across the cut is cut, waiting pitches go along", () => {
  const d = D.create(); d.meter = "2/4";
  d.chunks[0] = Object.assign(D.newChunk("V"), { rhythm: [q(1), q(2), q(1)], pitches: [60, 62, 64, 65, 67] });
  assert.strictEqual(D.split(d, 0, 1), null);
  assert.deepStrictEqual(d.chunks.map(c => c.rhythm.map(r => r.durQ)), [[1, 1], [1, 1]]);
  assert.deepStrictEqual(d.chunks.map(c => c.pitches), [[60, 62], [62, 64, 65, 67]]);
  assert.strictEqual(d.chunks[1].name, "V (2)");
  assert.ok(D.split(d, 0, 1));                                     // nothing after bar 1 of a one-bar chunk
});

t("split a chunk with no rhythm after a note", () => {
  const d = D.create(); d.chunks[0].pitches = [60, 62, 64];
  assert.strictEqual(D.split(d, 0, 2), null);
  assert.deepStrictEqual(d.chunks.map(c => c.pitches), [[60, 62], [64]]);
});

t("merge keeps empty slots empty; refuses a meter change", () => {
  const d = D.create(); d.meter = "2/4";
  d.chunks = [Object.assign(D.newChunk("A"), { rhythm: [q(1), q(1)], pitches: [60] }), Object.assign(D.newChunk("B"), { rhythm: [q(2)], pitches: [67] })];
  assert.strictEqual(D.merge(d, 0), null);
  assert.deepStrictEqual(d.chunks[0].pitches, [60, null, 67]);
  assert.ok(/!style=rhythm!B2 \| G4/.test(D.toAbc(d).abc));
  D.addPitch(d.chunks[0], 62);
  assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 67]);
  d.chunks.push(Object.assign(D.newChunk("C"), { rhythm: [q(3)], meter: "3/4" }));
  assert.ok(/meter/.test(D.merge(d, 0)));
});

t("duplicate, move, remove", () => {
  const d = D.create(); d.chunks[0].name = "A"; d.chunks[0].pitches = [60];
  D.duplicate(d, 0);
  assert.deepStrictEqual(d.chunks.map(c => c.name), ["A", "A (copy)"]);
  d.chunks[1].pitches.push(62);
  assert.deepStrictEqual(d.chunks[0].pitches, [60]);
  assert.strictEqual(D.move(d, 1, -1), 0);
  assert.deepStrictEqual(d.chunks.map(c => c.name), ["A (copy)", "A"]);
  D.remove(d, 0); D.remove(d, 0);
  assert.strictEqual(d.chunks.length, 1);
});

t("two voices on one staff, padded to the same length", () => {
  const d = D.create(); d.meter = "2/4"; d.voices.push({ name: "2", clef: "treble" });
  d.chunks[0].rhythm = [q(0.5), q(0.5), q(1)]; d.chunks[0].pitches = [62, 62, 62];
  Object.assign(D.part(d.chunks[0], 1), { rhythm: [q(1)], pitches: [59] });
  const r = D.toAbc(d);
  assert.ok(/%%score \(1 2\)\nV:1 stem=up\nV:2 stem=down\n/.test(r.abc), r.abc);
  assert.ok(/\[V:1\] DD D2 \|\]\n\[V:2\] B,2 x2 \|\]/.test(r.abc), r.abc);
  assert.deepStrictEqual(r.map.map(m => m.voice), [0, 0, 0, 1]);              // padding is not clickable
  d.together = false;
  assert.ok(/%%score 1 2\n/.test(D.toAbc(d).abc));
});

t("the user's two-voice example reads in", () => {
  const abc = "X:1\nM:2/4\nL:1/4\nK:G\n[V:1] D/2D/2 D | D/2D/2 D | D/2F/2 G,/2C/2 | D/2C/2 B,/2G,/2 |\n[V:2] B,/2B,/2 B, | A,/2A,/2 A, | G, G, | F, E, |\n";
  const d = D.fromAbc(abc);
  assert.deepStrictEqual(d.voices.map(v => v.name), ["1", "2"]);
  assert.strictEqual(d.chunks[0].rhythm.length, 14);
  assert.deepStrictEqual(D.part(d.chunks[0], 1).pitches, [59, 59, 59, 57, 57, 57, 55, 55, 54, 52]);
  const back = D.fromAbc(D.toAbc(d).abc);
  assert.deepStrictEqual(D.part(back.chunks[0], 1).pitches, D.part(d.chunks[0], 1).pitches);
  assert.deepStrictEqual(back.chunks[0].rhythm, d.chunks[0].rhythm);
});

t("chords typed by bar; a chords-only chunk has bars", () => {
  const p = D.parseChords("G | C D | Em", 4);
  assert.deepStrictEqual(p.chords, [{ at: 0, name: "G" }, { at: 4, name: "C" }, { at: 6, name: "D" }, { at: 8, name: "Em" }]);
  assert.strictEqual(p.chordLen, 12);
  const d = D.create(); d.meter = "4/4"; Object.assign(d.chunks[0], p);
  assert.strictEqual(D.info(d, 0).bars, 3); assert.ok(D.info(d, 0).chords);
  assert.strictEqual(music(D.toAbc(d).abc), '"G"x8 | "C"x4 "D"x4 | "Em"x8 |]');
  assert.strictEqual(D.chordsText(d.chunks[0], 4), "G | C D | Em");
});

t("a chord inside a long note splits it with a tie", () => {
  const d = D.create(); d.meter = "4/4";
  Object.assign(d.chunks[0], { rhythm: [q(4)], pitches: [60], chords: [{ at: 0, name: "C" }, { at: 2, name: "F" }] });
  assert.strictEqual(music(D.toAbc(d).abc), '"C"C4- "F"C4 |]');
});

t("words: one syllable per note, * on tied halves, bars in the w: line", () => {
  const d = D.create(); d.meter = "2/4";
  Object.assign(d.chunks[0], { rhythm: [q(1), q(1), q(3), q(1)], pitches: [60, 60, 67, 67], words: "Twin-kle twin-kle" });
  const abc = D.toAbc(d).abc;
  assert.ok(/C2 C2 \| G4- \| G2 G2 \|\]\nw: Twin- kle \| twin- \| \* kle\n/.test(abc), abc);
  const back = D.fromAbc(abc);
  assert.strictEqual(back.chunks[0].words, "Twin-kle twin-kle");
  assert.ok(D.info(d, 0).words);
});

t("chunks, names, chords, meter and key changes survive a trip through ABC", () => {
  const d = D.create(); d.meter = "4/4"; d.key = "G"; d.keyConfirmed = true;
  d.chunks = [Object.assign(D.newChunk("Verse"), { rhythm: [q(4)], pitches: [67], chords: [{ at: 0, name: "G" }] }),
              Object.assign(D.newChunk("Bridge"), { rhythm: [q(3)], pitches: [62], meter: "3/4", key: "D", chords: [{ at: 0, name: "D7" }] })];
  const back = D.fromAbc(D.toAbc(d).abc);
  assert.deepStrictEqual(back.chunks.map(c => c.name), ["Verse", "Bridge"]);
  assert.deepStrictEqual(back.chunks.map(c => [c.meter, c.key]), [[null, null], ["3/4", "D"]]);
  assert.deepStrictEqual(back.chunks.map(c => c.chords), [[{ at: 0, name: "G" }], [{ at: 0, name: "D7" }]]);
  assert.deepStrictEqual(back.chunks.map(c => c.pitches), [[67], [62]]);
});

t("split and merge carry voices, chords and words", () => {
  const d = D.create(); d.meter = "2/4"; d.voices.push({ name: "2", clef: "bass" });
  Object.assign(d.chunks[0], { rhythm: [q(2), q(2)], pitches: [60, 62], chords: [{ at: 0, name: "C" }, { at: 2, name: "G" }], words: "one two" });
  Object.assign(D.part(d.chunks[0], 1), { rhythm: [q(4)], pitches: [48] });
  assert.strictEqual(D.split(d, 0, 1), null);
  assert.deepStrictEqual(d.chunks.map(c => [c.pitches, D.part(c, 1).pitches, c.chords.map(x => x.at + x.name), c.words]),
    [[[60], [48], ["0C"], "one"], [[62], [48], ["0G"], "two"]]);
  assert.strictEqual(D.merge(d, 0), null);
  assert.deepStrictEqual(d.chunks[0].chords, [{ at: 0, name: "C" }, { at: 2, name: "G" }]);
  assert.strictEqual(d.chunks[0].words, "one two");
  assert.ok(/V:2 clef=bass/.test(D.toAbc(d).abc));
});

t("ChordPro out and in", () => {
  const d = D.create(); d.meter = "4/4"; d.title = "Star";
  Object.assign(d.chunks[0], { name: "Verse", rhythm: [q(1), q(1), q(1), q(1)], pitches: [60, 60, 67, 67], words: "Twin-kle twin-kle",
    chords: [{ at: 0, name: "C" }, { at: 2, name: "G" }] });
  const cp = D.toChordPro(d);
  assert.ok(/\{title: Star\}/.test(cp) && /\{comment: Verse\}\n\[C\]Twinkle \[G\]twinkle/.test(cp), cp);
  const back = D.fromChordPro("{title: Song}\n{time: 3/4}\n{start_of_verse: Verse 1}\n[G]Hello [C]there\n{start_of_chorus}\n| [D] | [G] [C] |\n");
  assert.strictEqual(back.meter, "3/4");
  assert.deepStrictEqual(back.chunks.map(c => c.name), ["Verse 1", "chorus"]);
  assert.deepStrictEqual(back.chunks[0].chords, [{ at: 0, name: "G" }, { at: 3, name: "C" }]);
  assert.strictEqual(back.chunks[0].words, "Hello there");
  assert.deepStrictEqual(back.chunks[1].chords, [{ at: 0, name: "D" }, { at: 3, name: "G" }, { at: 4.5, name: "C" }]);
  assert.strictEqual(D.info(back, 1).bars, 2);
});

const notes = (d, meter, durs, pitches) => { d.meter = meter; d.chunks[0].rhythm = durs.map(x => x < 0 ? { type: "rest", durQ: -x } : q(x)); d.chunks[0].pitches = pitches; return music(D.toAbc(d).abc); };
t("beaming: half bars of eighths in 4/4, beats otherwise; rests and quarters break", () => {
  assert.strictEqual(notes(D.create(), "4/4", Array(8).fill(0.5), [60, 62, 64, 65, 67, 69, 71, 72]), "CDEF GABc |]");
  assert.strictEqual(notes(D.create(), "4/4", [0.5, 0.5, 1, 0.25, 0.25, 0.5, 0.5, 0.5], [60, 62, 64, 65, 67, 69, 71, 72]), "CD E2 F/2G/2A Bc |]");
  assert.strictEqual(notes(D.create(), "4/4", [0.5, -0.5, 0.5, 0.5, 2], [60, 62, 64, 65]), "C z DE F4 |]");
  assert.strictEqual(notes(D.create(), "3/4", Array(6).fill(0.5), [60, 62, 64, 65, 67, 69]), "CDEFGA |]");
  assert.strictEqual(notes(D.create(), "6/8", [0.5, 0.5, 0.5, 1, 0.5], [60, 62, 64, 65, 67]), "CDE F2 G |]");
});

t("readable cuts: off-beat notes across the middle of 4/4, and across a compound beat", () => {
  assert.strictEqual(notes(D.create(), "4/4", [1.5, 2, 0.5], [60, 62, 64]), "C3 D- D3 E |]");
  assert.strictEqual(notes(D.create(), "6/8", [1, 1, 1], [60, 62, 64]), "C2 D- D E2 |]");
  assert.strictEqual(notes(D.create(), "4/4", [1, 2, 1], [60, 62, 64]), "C2 D4 E2 |]");       // on the beat: one half note
});

t("split at a note's time (any voice point), chords and words go with it", () => {
  const d = D.create(); d.meter = "4/4";
  Object.assign(d.chunks[0], { rhythm: [q(1), q(1), q(2)], pitches: [60, 62, 64], words: "a b c", chords: [{ at: 0, name: "C" }, { at: 2, name: "F" }] });
  assert.strictEqual(D.splitAt(d, 0, D.slotTime(d.chunks[0], 1)), null);
  assert.deepStrictEqual(d.chunks.map(c => [c.pitches, c.words, c.chords.map(x => x.at + x.name)]), [[[60], "a", ["0C"]], [[62, 64], "b c", ["1F"]]]);
  assert.ok(D.splitAt(d, 0, 0));
});

t("spans: copy, remove and paste across chunks, empty slots kept", () => {
  const d = D.create(); d.meter = "2/4";
  d.chunks = [Object.assign(D.newChunk("A"), { rhythm: [q(1), { type: "rest", durQ: 1 }], pitches: [60] }),
              Object.assign(D.newChunk("B"), { rhythm: [q(1), q(1)], pitches: [62] })];
  const clip = D.extract(d, 0, { chunk: 1, slot: 1 }, { chunk: 0, slot: 1 });
  assert.deepStrictEqual(clip, [{ type: "rest", durQ: 1, pitch: null }, { type: "note", durQ: 1, pitch: 62 }, { type: "note", durQ: 1, pitch: null }]);
  D.removeSpan(d, 0, { chunk: 0, slot: 1 }, { chunk: 1, slot: 0 });
  assert.deepStrictEqual(d.chunks.map(c => [c.rhythm.length, c.pitches]), [[1, [60]], [1, []]]);
  D.insert(d, 0, 0, 0, clip);
  assert.deepStrictEqual(d.chunks[0].rhythm.map(r => r.type), ["note", "rest", "note", "note"]);
  assert.deepStrictEqual(d.chunks[0].pitches, [60, 62]);
  D.insert(d, 0, 1, -1, [{ type: "note", durQ: 1, pitch: 67 }]);
  assert.deepStrictEqual(d.chunks[1].pitches, [67]);
});

t("sections: headings group chunks, move and duplicate as blocks, [P:] in ABC, ChordPro sections", () => {
  const d = D.create(); d.meter = "4/4";
  d.chunks = ["intro", "v1", "v2", "c1"].map(n => Object.assign(D.newChunk(n), { rhythm: [q(4)], pitches: [60], chords: [{ at: 0, name: "C" }], words: n }));
  d.chunks[1].heading = "Verse"; d.chunks[3].heading = "Chorus";
  assert.deepStrictEqual(D.sections(d).map(x => [x.name, x.start, x.end]), [["Verse", 1, 3], ["Chorus", 3, 4]]);
  assert.strictEqual(D.sectionOf(d, 2).name, "Verse"); assert.strictEqual(D.sectionOf(d, 0), null);
  assert.strictEqual(D.moveSection(d, 3, -1), 1);
  assert.deepStrictEqual(d.chunks.map(c => c.name), ["intro", "c1", "v1", "v2"]);
  assert.strictEqual(D.duplicateSection(d, 2), 4);
  assert.deepStrictEqual(d.chunks.map(c => c.name + (c.heading ? ":" + c.heading : "")), ["intro", "c1:Chorus", "v1:Verse", "v2", "v1:Verse (copy)", "v2"]);
  assert.ok(/merge/.test(D.merge(d, 0)));
  const abc = D.toAbc(d).abc;
  assert.ok(/\[P:Chorus\]/.test(abc) && /\[P:Verse\]"\^v1"/.test(abc), abc);
  const back = D.fromAbc(abc);
  assert.deepStrictEqual(back.chunks.map(c => c.heading), [null, "Chorus", "Verse", null, "Verse (copy)", null]);
  assert.deepStrictEqual(back.chunks.map(c => c.name), ["intro", "c1", "v1", "v2", "v1", "v2"]);
  const cp = D.toChordPro(d);
  assert.ok(/\{start_of_chorus: Chorus\}\n\[C\]c1\n\{end_of_chorus\}/.test(cp), cp);
  assert.ok(/\{start_of_verse: Verse\}\n\{comment: v1\}\n\[C\]v1\n\{comment: v2\}/.test(cp), cp);
  const cin = D.fromChordPro(cp);
  assert.deepStrictEqual(D.sections(cin).map(x => x.name), ["Chorus", "Verse", "Verse (copy)"]);
});

t("takes: signatures, changed bars, kept through split / merge / duplicate, bars replaced", () => {
  const d = D.create(); d.meter = "2/4";
  Object.assign(d.chunks[0], { rhythm: [q(2), q(1), q(1), q(2)], pitches: [60, 62, 64, 65] });
  D.keepTake(d, 0, 0, { v: 1, cfg: {}, events: [] }, 0, 3);
  const tk = D.takeAt(d, 0, 0, 2);
  assert.ok(tk && tk.sig.length === 3);
  assert.deepStrictEqual(D.changedBars(d, 0, tk, 0, 2), []);
  d.chunks[0].pitches[1] = 63;
  assert.deepStrictEqual(D.changedBars(d, 0, tk, 0, 2), [1]);
  D.replaceBars(d, 0, 0, 1, 1, [{ type: "note", durQ: 0.5 }, { type: "rest", durQ: 1.5 }], [67]);
  assert.deepStrictEqual(d.chunks[0].rhythm.map(r => r.type[0] + r.durQ), ["n2", "n0.5", "r1.5", "n2"]);
  assert.deepStrictEqual(d.chunks[0].pitches, [60, 67, 65]);
  assert.strictEqual(D.split(d, 0, 1), null);                        // on a bar line: both halves keep it
  assert.deepStrictEqual(d.chunks.map(c => c.takes.map(t => t.from)), [[0], [-1]]);
  assert.ok(D.takeAt(d, 1, 0, 1)); assert.strictEqual(D.takeAt(d, 1, 0, 2), null);
  assert.strictEqual(D.merge(d, 0), null);
  assert.deepStrictEqual(d.chunks[0].takes.map(t => t.from), [0, 0]);
  D.duplicate(d, 0); assert.strictEqual(d.chunks[1].takes.length, 2);
  const tb = D.fromTakeBars([[{ pos: 0, dur: 2, midi: 60 }, { pos: 2, dur: 2, midi: 62, tie: true }], [{ pos: 0, dur: 2, midi: 62 }]], 4, 0.5, 2);
  assert.deepStrictEqual(tb.rhythm.map(r => r.type[0] + r.durQ), ["n1", "n2", "r1"]);
  assert.deepStrictEqual(tb.pitches, [60, 62]);
});

t("the band chart: P: per portion, the most particular settings win, reports land where they belong", () => {
  const d = D.create(); d.meter = "4/4";
  const C = (name, chords) => Object.assign(D.newChunk(name), { chords: chords.map((n, i) => ({ at: i * 4, name: n })), chordLen: chords.length * 4 });
  d.chunks = [C("Intro", ["C"]), C("A", ["F", "G"]), C("B", ["Am"]), C("C", ["G"])];
  d.chunks[1].heading = "Verse";
  const st = id => ({ opts: { o: id }, state: { style: id }, sounds: [] });
  d.chunks[1].sectionBand = st("bossa"); d.chunks[2].band = st("swing");
  const r = D.bandChart(d);
  assert.deepStrictEqual(r.parts.map(p => [p.name, p.nth, p.key]), [["Intro", 0, "piece"], ["Verse", 0, "s:1"], ["Verse \u00b7 B", 0, "c:2"], ["Verse", 1, "s:1"]]);
  assert.ok(/P:Intro\n"C"z8 \|\nP:Verse\n"F"z8 \| "G"z8 \|\nP:Verse · B\n"Am"z8 \|\nP:Verse\n"G"z8 \|/.test(r.abc), r.abc);
  assert.deepStrictEqual(r.setup.sections.map(x => [x.name, x.nth, x.state.style]), [["Verse", 0, "bossa"], ["Verse \u00b7 B", 0, "swing"], ["Verse", 1, "bossa"]]);
  assert.deepStrictEqual([0, 1, 2, 3].map(i => D.bandOf(d, i).level), [null, "section", "chunk", "section"]);
  // focus a chunk with no settings: it gets a P: of its own
  assert.ok(D.bandChart(d, { chunk: 3 }).parts.some(p => p.key === "c:3"));
  // the Backing Track reports: the whole piece in Rock, Verse changed, the chunk's own settings dropped
  D.takeBand(d, r.parts, { style: "rock", tempo: 100, abc: "x", sections: [{ name: "Verse", nth: 0, opts: {}, state: { style: "motown" } }] });
  assert.strictEqual(d.band.style, "rock"); assert.strictEqual(d.band.abc, undefined);
  assert.strictEqual(d.chunks[1].sectionBand.state.style, "motown");
  assert.strictEqual(d.chunks[2].band, null);
  assert.strictEqual(D.bandOf(d, 0).level, "piece");
});

t("a pickup chunk is a short first bar, and reads back from ABC", () => {
  const d = D.create(); d.meter = "4/4"; d.key = "G";
  const a = D.newChunk("Pickup"); a.pickup = true; a.rhythm = [{ type: "note", durQ: 1.5 }, { type: "note", durQ: 0.5 }, { type: "note", durQ: 1 }]; a.pitches = [59, 60, 62];
  const b = D.newChunk("Take 1"); b.rhythm = [{ type: "note", durQ: 4 }, { type: "note", durQ: 2 }, { type: "rest", durQ: 2 }]; b.pitches = [67, 69];
  d.chunks = [a, b];
  const abc = D.toAbc(d).abc;
  assert.strictEqual(music(abc), '"^Pickup"B,3 C D2 | "^Take 1"G8 | A4 z4 |]');
  const back = D.fromAbc(abc);
  assert.strictEqual(back.chunks[0].pickup, true); assert.strictEqual(back.chunks[1].pickup, false);
  assert.strictEqual(D.toAbc(back).abc, abc);
  // almost a whole bar (3.5 beats) still is one
  a.rhythm = [{ type: "note", durQ: 0.5 }, { type: "note", durQ: 3 }]; a.pitches = [62, 64];
  assert.ok(/^"\^Pickup"D E6 \| "\^Take 1"G8 \|/.test(music(D.toAbc(d).abc)), D.toAbc(d).abc);
  a.pickup = false;                                            // not a pickup: a full first bar, and the next chunk still starts on beat 1
  assert.ok(/^"\^Pickup"D E3- E3 "\^Take 1"x \| G8 \|/.test(music(D.toAbc(d).abc)), D.toAbc(d).abc);
});

t("a phrase's lead-in: stitched into the bar before, the bar further back, a Pickup chunk at the top", () => {
  const N = (t, d, midi) => ({ t, d, midi });
  const mk = () => { const d = D.create(); d.meter = "4/4"; const a = D.newChunk("A"), b = D.newChunk("B");
    a.rhythm = [{ type: "note", durQ: 4 }, { type: "note", durQ: 4 }]; a.pitches = [60, 62];       // A ends on a whole note D
    b.rhythm = [{ type: "note", durQ: 4 }]; b.pitches = [67]; d.chunks = [a, b]; return d; };
  // E F on beat 4 lead into B: A's D is cut at beat 4
  let d = mk(), r = D.writeLeadIn(d, 1, 0, 0, [N(-1, 0.5, 64), N(-0.5, 0.5, 65)]);
  assert.deepStrictEqual(D.barNotes(d, 0, 0, 1).map(n => [n.t, n.d, n.midi]), [[0, 3, 62], [3, 0.5, 64], [3.5, 0.5, 65]]);
  assert.deepStrictEqual(r.line, { ci: 0, bar: 1, t: 3 }); assert.strictEqual(r.conflicts.length, 0);
  assert.strictEqual(D.chunkLen(d, 0), 8);
  // inside a chunk: the bar before is the same chunk's
  d = mk(); D.writeLeadIn(d, 0, 0, 1, [N(-0.5, 0.5, 59)]);
  assert.deepStrictEqual(D.barNotes(d, 0, 0, 0).map(n => [n.t, n.midi]), [[0, 60], [3.5, 59]]);
  // a lead-in of a bar and a half: the bar further back is all the lead-in's
  d = mk(); D.writeLeadIn(d, 1, 0, 0, [N(-6, 1, 67), N(-5, 1, 65), N(-1, 1, 64)]);
  assert.deepStrictEqual(D.barNotes(d, 0, 0, 0).map(n => [n.t, n.midi]), [[2, 67], [3, 65]]);
  assert.deepStrictEqual(D.barNotes(d, 0, 0, 1).map(n => [n.t, n.d, n.midi]), [[0, 3, 62], [3, 1, 64]]);
  // the top of the piece: a Pickup chunk (a short first bar)
  d = mk(); r = D.writeLeadIn(d, 0, 0, 0, [N(-1.5, 0.5, 55), N(-1, 1, 57)]);
  assert.strictEqual(r.inserted, 1); assert.strictEqual(d.chunks[0].pickup, true); assert.strictEqual(D.chunkLen(d, 0), 1.5);
  assert.ok(/^"\^Pickup"G, A,2 \| "\^A"C8/.test(music(D.toAbc(d).abc)), D.toAbc(d).abc);
  // again over that pickup: it is rebuilt, longer
  r = D.writeLeadIn(d, 1, 0, 0, [N(-2, 0.5, 53), N(-1.5, 0.5, 55), N(-1, 1, 57)]);
  assert.strictEqual(d.chunks.filter(c => c.pickup).length, 1); assert.strictEqual(D.chunkLen(d, 0), 2);
  // longer than a bar at the top: a Pickup chunk and a whole bar
  d = mk(); r = D.writeLeadIn(d, 0, 0, 0, [N(-5, 1, 55), N(-2, 1, 57)]);
  assert.strictEqual(r.inserted, 2); assert.deepStrictEqual(d.chunks.slice(0, 3).map(c => c.name), ["Pickup", "Lead-in", "A"]);
  assert.strictEqual(D.chunkLen(d, 0), 1);
  // both sound at once: a conflict, the lead-in kept unless prefer "a"
  const A2 = () => { const x = mk(); x.chunks[0].rhythm = [{ type: "note", durQ: 4 }, { type: "note", durQ: 3 }, { type: "note", durQ: 1 }]; x.chunks[0].pitches = [60, 62, 71]; return x; };
  d = A2(); r = D.writeLeadIn(d, 1, 0, 0, [N(-1, 1, 64)]);
  assert.strictEqual(r.conflicts.length, 1); assert.deepStrictEqual(D.barNotes(d, 0, 0, 1).map(n => n.midi), [62, 64]);
  d = A2(); D.writeLeadIn(d, 1, 0, 0, [N(-1, 1, 64)], { prefer: "a" });
  assert.deepStrictEqual(D.barNotes(d, 0, 0, 1).map(n => n.midi), [62, 71]);
});

console.log("NOTATION DOC OK (" + n + " tests)");
