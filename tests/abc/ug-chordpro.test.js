// Ultimate Guitar text into ChordPro (apps/shared/ug-chordpro.js), and the chords spread over tapped bars.
const U = require("../../apps/shared/ug-chordpro.js");
let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (ok ? "" : "  " + info)); if (!ok) fails++; };
const ug = `Wonderwall Chords
Capo 2

[Intro]
Em7  G  Dsus4  A7sus4  x4

[Verse 1]
Em7            G
Today is gonna be the day
         Dsus4                A7sus4
That they're gonna throw it back to you

[Chorus] x2
[ch]C[/ch]   D   Em
And all the roads

e|---0---|
B|---3---|
`;
const r = U.convert(ug, { meter: "4/4" });
check("title, capo and meter in the head", /^\{title: Wonderwall\}\n\{time: 4\/4\}\n\{capo: 2\}/.test(r.chordpro), r.chordpro);
check("chord-only line becomes bars", r.chordpro.includes("[Em7] | [G] | [Dsus4] | [A7sus4]"), r.chordpro);
check("chords placed before the syllable under them", r.chordpro.includes("[Em7]Today is gonna [G]be the day"), r.chordpro);
check("verse heading becomes start_of_verse", r.chordpro.includes("{start_of_verse: Verse 1}") && r.chordpro.includes("{end_of_verse}"), r.chordpro);
check("[ch] tags stripped, tab dropped", r.chordpro.includes("[C]And [D]all [Em]the roads") && !/e\|/.test(r.chordpro), r.chordpro);
check("sections listed with their chords and repeats", JSON.stringify(r.sections.map(s => [s.name, s.chords.length, s.times])) === '[["Intro",4,1],["Verse 1",4,1],["Chorus",3,2]]', JSON.stringify(r.sections));
check("Am7 and C/G are chords, Today isn't", U.isChord("Am7") && U.isChord("C/G") && U.isChord("F#m7b5") && !U.isChord("Today") && !U.isChord("And"));
const f = U.fitBars(r.chordpro, { Intro: 8, "Verse 1": 8 });
check("intro's 4 chords over 8 tapped bars: two each", f.chordpro.includes("[Em7] | [Em7] | [G] | [G] | [Dsus4] | [Dsus4] | [A7sus4] | [A7sus4]"), f.chordpro);
check("a worded section that doesn't fit gets a note", f.notes.length === 1 && /^Verse 1: 8 bars tapped, 4 chords/.test(f.notes[0]), JSON.stringify(f.notes));
const D = (globalThis.AbcCore = require("../../apps/shared/abc-core.js"), globalThis.AbcEvents = require("../../apps/shared/abc-events.js"), require("../../apps/shared/notation-doc.js"));
const doc = D.fromChordPro(f.chordpro, "4/4");
check("the Notation page reads it: sections and the intro's 8 bars", doc.chunks[0].heading === null && doc.chunks.some(c => c.heading === "Verse 1") && D.info(doc, 0).bars === 8, JSON.stringify(doc.chunks.map(c => [c.name, c.heading, D.info(doc, doc.chunks.indexOf(c)).bars])));
const d3 = D.fromChordPro("{time: 4/4}\n{comment: A}\n[G] | [C]\n{start_of_bridge: Bridge}\n{time: 3/4}\n[Em] | [D] | [C]\n{end_of_bridge}\n{comment: B}\n{time: 4/4}\n[G]\n", "4/4");
check("a {time:} inside the song changes the meter from that section on", d3.chunks.map((c, i) => D.at(d3, i).meter + ":" + D.info(d3, i).bars).join(" ") === "4/4:2 3/4:3 4/4:1", d3.chunks.map((c, i) => D.at(d3, i).meter + ":" + D.info(d3, i).bars).join(" "));
const f2 = U.fitBars("{comment: Chorus}\n[C] | [G]\n{comment: Chorus}\n[C] | [G]\n", { Chorus: [4, 0] });
const f3 = U.fitBars("{comment: Chorus}\n[C] | [G]\n{comment: Chorus}\n[C] | [G]\n", { Chorus: [4, 8] });
check("a doubled last chorus plays the progression twice, not each chord twice as long", /\[C\] \| \[C\] \| \[G\] \| \[G\] \| \[C\] \| \[C\] \| \[G\] \| \[G\]/.test(f3.chordpro), f3.chordpro);
check("a Chorus with no bars tapped borrows the other's count", (f2.chordpro.match(/\[C\] \| \[C\] \| \[G\] \| \[G\]/g) || []).length === 2, f2.chordpro);
const gt = "{start_of_verse: V}\nx\n{end_of_verse}\n\n{start_of_grid: V}\n| G . . . | . . D . |\n| % | Em . C . |\n{end_of_grid}\n";
const gg = U.grids(gt)[0];
check("a grid is read: cells a beat, % repeats the bar before", JSON.stringify(U.gridChords(gg.bars)) === '{"chords":[{"at":0,"name":"G"},{"at":6,"name":"D"},{"at":10,"name":"D"},{"at":12,"name":"Em"},{"at":14,"name":"C"}],"beats":[4,4,4,4],"len":16}', JSON.stringify(U.gridChords(gg.bars)));
check("and stripped out", !/grid/.test(U.stripGrids(gt)));
check("chords written as a grid, four bars a line", U.gridBlock("V", U.gridCells([{ at: 0, name: "G" }, { at: 6, name: "D" }, { at: 9, name: "Em" }, { at: 16, name: "C" }], [4, 4, 4, 4, 4])) === "{start_of_grid: V}\n| G . . . | . . D . | . Em . . | . . . . |\n| C . . . |\n{end_of_grid}");
const lab = D.create(); lab.chunks = [];
[["Intro"], ["Verse"], ["Pre-Chorus"], ["Chorus"], ["Verse"], ["Pre-Chorus", 2], ["Chorus"], ["Bridge"], ["Chorus"]].forEach(([h, n]) => { for (let i = 0; i < (n || 1); i++) { const c = D.newChunk("x"); if (!i) c.heading = h; lab.chunks.push(c); } });
check("chunks labelled for their sections: I1a V1a PC1a C1a V2a PC2a PC2b C2a B1a C3a", D.chunkLabels(lab).chunks.map(c => c.name).join(" ") === "I1a V1a PC1a C1a V2a PC2a PC2b C2a B1a C3a");
const aaba = D.create(); aaba.chunks = [];
[["A"], ["A"], ["B", 3], ["A"]].forEach(([h, n]) => { for (let i = 0; i < (n || 1); i++) { const c = D.newChunk("x"); if (!i) c.heading = h; aaba.chunks.push(c); } });
check("an AABA tune: A1a A2a B1a B1b B1c A3a", D.chunkLabels(aaba).chunks.map(c => c.name).join(" ") === "A1a A2a B1a B1b B1c A3a");
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
