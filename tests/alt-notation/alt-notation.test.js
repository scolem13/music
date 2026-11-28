// node tests/alt-notation/alt-notation.test.js   (NEG=1 must fail)
global.AbcCore = require("../../apps/shared/abc-core.js");
const A = require("../../apps/shared/alt-notation.js");
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL", m); } };
const NEG = !!process.env.NEG;
// Mo Li Hua, as on lessons/notation-choices.qmd: Sa = F, G G-P D-Ṡ Ṡ-D P P-D P –
const mo = "X:1\nM:2/4\nL:1/8\nK:F\nA2 Ac | df fd | c2 cd | c4 |]\n";
const r = A.read(mo);
ok(r.tonic === 5 && r.doPc === 5, "key F");
ok(Math.abs(r.total - 8) < 1e-9, "8 beats, got " + r.total);
const names = r.notes.map(n => { const w = A.swara(n.midi - 65, "hindustani"); return w.name + (w.oct > 0 ? "'" : ""); }).join(" ");
ok(names === (NEG ? "X" : "G G P D S' S' D P P D P"), "sargam " + names);
const G = A.grid(r, A.resolution(r)); ok(G.length === 8 && A.reduce(G[0]).length === 1 && A.reduce(G[1]).length === 2, "grid");
// minor: Sa = A, C is komal ga; jianpu 1 = C, A = 6
const am = A.read("X:1\nM:3/4\nL:1/4\nK:Am\nA c e |]\n");
ok(am.tonic === 9 && am.doPc === 0 && am.minor, "A minor key");
ok(A.swara(3, "hindustani").komal && A.swara(3, "hindustani").name === "g", "komal ga");
ok(A.swara(9, "jianpu").name === "6" && A.swara(6, "hindustani").tivra, "jianpu 6, tivra");
ok(A.defaultTala("hindustani", 3) === "dadra" && A.defaultTala("carnatic", 4) === "adi", "default talas");
// triplet, broken rhythm, ties, pickup
const t = A.read("X:1\nM:4/4\nL:1/8\nK:C\nG | (3cde f>g a2- a2 |]\n");
ok(Math.abs(t.pickup - .5) < 1e-9, "pickup " + t.pickup);
ok(t.notes.length === 7 && Math.abs(t.notes[6].dur - 2) < 1e-9 && Math.abs(t.notes[1].dur - 1/3) < 1e-9 && Math.abs(t.notes[4].dur - .75) < 1e-9, "durations " + t.notes.map(n => n.dur.toFixed(2)));
// every tune in the collection reads without throwing and with bars of the right length (sample)
global.window = undefined;
const src = require("fs").readFileSync(__dirname + "/../../apps/tunes/tunes-object.js", "utf8");
const tunes = new Function(src + "; return tunesObject;")();
let n = 0, bad = 0;
for (const k in tunes) for (const abc of String(tunes[k]).split(/\n(?=X:)/)) { if (!/^K:/m.test(abc)) continue; n++; try { const x = A.read(abc); const G2 = A.grid(x, A.resolution(x)); if (!G2.length && x.notes.length) { bad++; console.log("empty", (/^T:(.*)/m.exec(abc)||[])[1], x.total); } } catch (e) { bad++; if (bad < 4) console.log(e.message); } }
ok(n > 100 && bad === 0, "collection: " + n + " tunes, " + bad + " failed");
console.log(fail ? fail + " failed" : "all passed (" + n + " tunes read)"); process.exit(fail ? 1 : 0);
