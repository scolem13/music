// Mode Library data checks: every sequence parses, features are well formed, known facts from the sources hold.
// NEG=1 breaks Bhairav's ascent on purpose and must fail.
const L = require("../../apps/shared/mode-library.js");
const M = L.MODES.map(r => JSON.parse(JSON.stringify(r)));
if (process.env.NEG) M.find(r => r.id === "bhairav").feats[0].seq = "S R G m P d N S'";
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log("FAIL " + m); } };
const ids = new Set();
for (const r of M) {
  ok(!ids.has(r.id), "duplicate " + r.id); ids.add(r.id);
  ok(L.SRC[r.src], r.id + ": unknown source"); ok(L.FAMS.some(f => f.id === r.fam), r.id + ": unknown family");
  ok(["read", "derived", "approx"].includes(r.check), r.id + ": check");
  for (const f of r.feats) {
    ok(L.KIND[f.k], r.id + ": kind " + f.k);
    if (f.k === "chosen") ok(f.opts && f.opts.length >= 2, r.id + ": a chosen feature needs a pool of 2+");
    for (const s of [f.seq].concat((f.opts || []).map(o => o.seq)).filter(Boolean)) {
      try { L.parse(r.sys, s); } catch (e) { ok(false, r.id + ": " + e.message); }
    }
  }
}
const asc = id => M.find(r => r.id === id).feats[0].seq;
const cents = (sys, s) => L.parse(sys, s).filter(n => !n.rest).map(n => n.c);
// Garland Fig. 6, as printed
ok(asc("bhairav") === "S r G m P d N S'", "Bhairav aroh (Garland p. 80)");
ok(asc("durga") === "S R m P D S'" && asc("megh") === "S R m P n S'", "Durga, Megh");
ok(M.filter(r => r.fam === "hind").length === 23, "23 ragas of Fig. 6");
for (const r of M.filter(r => r.fam === "hind")) {
  const a = cents("hind", r.feats[0].seq), d = cents("hind", r.feats[1].seq);
  ok(d[d.length - 1] === 0, r.id + ": avaroh ends on Sa");
}
// Darbari's forbidden straight descent differs from its printed one
const dar = M.find(r => r.id === "darbari");
ok(dar.feats[1].seq !== dar.feats[2].seq, "darbari: vakra vs straight");
// melakarta rule: 7 notes stepwise up, same down; 29 = Sankarabharana = the major scale's places
for (let k = 1; k <= 72; k++) { const m = L.mela(k), u = cents("karn", m.asc), d = cents("karn", m.desc);
  ok(u.length === 8 && u.every((c, i) => !i || c > u[i - 1]), "mela " + k + " stepwise up"); ok(u.slice().reverse().join() === d.join(), "mela " + k + " same down"); }
ok(cents("karn", L.mela(29).asc).join() === "0,204,386,498,702,884,1088,1200", "mela 29 = Sankarabharana");
ok(L.mela(37).asc.includes("M2") && L.mela(36).asc.includes("M1"), "Ma2 from 37");
// maqam structure (MaqamWorld)
const mq = id => M.find(r => r.id === "maqam-" + id);
ok(mq("rast").feats.find(f => f.k === "chosen").opts.map(o => o.name).join() === "Upper Rast,Nahawand", "Rast upper ajnas");
ok(mq("kurd").feats.every(f => f.k !== "chosen"), "Kurd: one upper jins");
ok(L.J.hijaz[2] - L.J.hijaz[1] === 300, "Hijaz augmented second");
// drones: Pa, else Ma (Garland p. 67)
ok(L.droneFor(M.find(r => r.id === "bhairav"))[1] === 702 - 1200, "Bhairav drone Pa");
ok(L.droneFor(M.find(r => r.id === "marva"))[1] === 1088 - 1200, "Marva (no Pa, no ma): drone Ni");
// jazz pools
const alt = M.find(r => r.id === "alt").feats.find(f => f.k === "chosen");
ok(alt.opts.length === 4, "four alterations");
ok(cents("cents", M.find(r => r.id === "bebopdom").feats[0].seq).length === 9, "bebop dominant: 8 notes + octave");
console.log(bad ? bad + " failed" : "ok: " + M.length + " modes");
process.exit(bad ? 1 : 0);
