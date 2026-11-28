// Rhythm Library data checks: grids well formed, lengths fit the beats, known facts from the sources hold.
// NEG=1 breaks a grid on purpose and must fail.
const L = require("../../apps/shared/rhythm-library.js");
const R = L.RHYTHMS.map(r => Object.assign({}, r));
if (process.env.NEG) R.find(r => r.id === "son32").grid = "x..x..x...x..x..";
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log("FAIL " + m); } };
const ids = new Set();
for (const r of R) {
  ok(!ids.has(r.id), "duplicate id " + r.id); ids.add(r.id);
  ok(/^[x.]+$/.test(r.grid) && r.grid.includes("x"), r.id + ": grid must be x/.");
  ok(r.grid.length % r.beats === 0, r.id + ": " + r.grid.length + " pulses do not divide into " + r.beats + " beats");
  ok(L.SRC[r.src], r.id + ": unknown source"); ok(L.FAMS.some(f => f.id === r.fam), r.id + ": unknown family");
  ok(r.check === "read" || r.check === "derived", r.id + ": check must be read or derived");
}
const g = id => R.find(r => r.id === id).grid;
const rot = (s, k) => s.slice(k) + s.slice(0, k);
ok(g("son32") === "x..x..x...x.x...", "son clave 3-2 (Toussaint, Wikipedia)");
ok(rot(g("son32"), 8) === g("son23") && rot(g("rumba32"), 8) === g("rumba23"), "2-3 = 3-2 turned by 8");
ok(g("son32").slice(0, 8) === g("tresillo"), "tresillo = three side of son");
ok(g("bo") === g("son32"), "Bo Diddley = son 3-2");
const twelve = R.filter(r => r.fam === "twelve");
ok(twelve.length === 11, "ten 12/8 patterns from Toussaint 2003 + bondo");
for (const r of twelve) ok(L.gaps(r.grid).slice().sort().join("") === "1122222", r.id + ": gaps not five 2s and two 1s");
const shiko8 = "x.xx.xx.";
ok(g("cinquillo") === shiko8, "Shiko in 8 = cinquillo");
ok(rot(shiko8, 2) === g("timint") && rot(shiko8, 5) === g("kromanti"), "Timint / Kromanti rotations of Shiko");
ok(L.gaps(g("bossa")).sort().join("") === "33334", "bossa maximally even");
// Brazilian strings, as printed in Wikipedia
const P = id => R.find(r => r.id === id);
ok(P("maracatu32").parts.slice(0, 8) === P("maracatu23").parts.slice(8), "maracatu 2:3 bar 2 = 3:2 bar 1");
ok(g("sambareggae") === g("bossa"), "samba-reggae string = bossa nova clave");
for (const r of R.filter(r => r.parts)) ok(r.parts.length === r.grid.length && /^[LHOXDT.]+$/.test(r.parts) && r.parts.replace(/[^.]/g, "x") === r.grid, r.id + ": parts must match grid");
// Hindustani: bols one a matra, marks one a vibhag, known shapes
const H = { sultal: [10, "22222"], tivra: [7, "322"], adachautal: [14, "2222222"], tintal: [16, "4444"], jhaptal: [10, "2323"], ektal: [12, "222222"], rupak: [7, "322"], dadra: [6, "33"], kaherva: [8, "44"], dhamar: [14, "5234"], jhumra: [14, "3434"] };
for (const r of R.filter(r => r.vib)) {
  ok(r.bols.split(" ").length === r.beats, r.id + ": " + r.bols.split(" ").length + " bols for " + r.beats + " matras");
  ok(r.marks.length === r.vib.length, r.id + ": a mark per vibhag");
}
for (const k in H) ok(P(k).beats === H[k][0] && P(k).vib.join("") === H[k][1], k + " shape");
ok(P("rupak").marks.join("") === "023", "rupak: O 2 3 (Kippen)");
ok(P("chautal").vib.join("") === "222222" && P("chautal").marks.join("") === "x0203" + "4", "chautal 2x6 X 0 2 0 3 4 (Kippen, Clayton)");
ok(P("misrachapu").kriya.join("") === "uu-C-C-" && P("khandachapu").kriya.join("") === "C-CC-", "chapu claps (Nelson Fig. 5)");
ok(P("rupaka3").kriya.join("") === "CCP", "rupaka counted as 3 (Nelson)");
const rot12 = (s, k) => s.slice(k) + s.slice(0, k), bem = P("bembe").grid;
ok([...Array(12).keys()].some(k => rot12(bem, k) === P("bondo").grid), "bondo is a rotation of bembe");
ok(L.gaps(P("sambaT").grid).join("-") === "2-2-3-2-2-2-3", "Toussaint samba onsets 0 2 4 7 9 11 13");
// Carnatic: the 35-tala table in Tala (music)
const T = { Dhruva: [11,14,17,23,29], Matya: [8,10,12,16,20], Rupaka: [5,6,7,9,11], Jhampa: [6,7,8,10,12], Triputa: [7,8,9,11,13], Ata: [10,12,14,18,22], Eka: [3,4,5,7,9] };
const J = ["tisra", "chatusra", "khanda", "misra", "sankeerna"];
for (const t in T) J.forEach((j, i) => ok(L.kriyas(L.SULADI[t], L.JATI[j]).length === T[t][i], t + " " + j + " should be " + T[t][i]));
ok(P("adi").kriya.join("") === "C123CPCP", "Adi: clap 1 2 3, clap palm, clap palm");
ok(P("tisraadi").beats * P("tisraadi").nadai === 24, "tisra-nadai Adi = 24");
for (const r of R) { const Ls = L.layers(r); ok(/^\d+$/.test(Ls[Ls.length - 1].grid), r.id + ": last layer must be an even count");
  for (const l of Ls.slice(0, -1)) ok(l.grid.length === r.grid.length || /^\d+$/.test(l.grid), r.id + ": layer " + l.name + " wrong length"); }
console.log(bad ? bad + " failures" : "ok, " + R.length + " rhythms"); process.exit(bad ? 1 : 0);
