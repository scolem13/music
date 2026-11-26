// The pickup model (apps/shared/lessons/guitar-pickups.js) in node: neck darker than bridge, tone pot lowers the resonance, volume
// pot part way flattens the treble peak, humbuckers resonate lower and cancel hum, the Strat's 2 / 4 cancel hum, out of phase thins
// the low end, a pickup on a harmonic's node does not hear it, translation, the panels bind only known keys, tracks are complete.
// Run: node tests/lessons/guitar-pickups.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), G = require(ROOT + "/apps/shared/lessons/guitar-pickups.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const S = (id, o) => Object.assign(G.defaults(id), o);
for (const [id, nk, br] of [["strat", "p5", "p1"], ["tele", "neck", "bridge"], ["lespaul", "rhythm", "treble"], ["sg", "rhythm", "treble"]]) {
  const a = G.centroid(id, S(id, { sel: nk })), b = G.centroid(id, S(id, { sel: br }));
  check(`${id}: neck darker than bridge`, a < b, Math.round(a) + " < " + Math.round(b) + " Hz");
  const t10 = G.resonance(id, S(id, { sel: br })), t0 = G.resonance(id, S(id, { sel: br, tone: 0, tone1: 0, tone2: 0 }));
  check(`${id}: tone pot at 0 lowers the resonance`, t0.f < t10.f * 0.6, Math.round(t10.f) + " -> " + Math.round(t0.f) + " Hz");
  const v = G.resonance(id, S(id, { sel: br, vol: 5, vol2: 5 }));
  check(`${id}: volume half way flattens the treble peak`, v.peakDb < t10.peakDb - 2, t10.peakDb.toFixed(1) + " -> " + v.peakDb.toFixed(1) + " dB");
}
check("humbucker resonates lower than a single coil", G.resonance("lespaul", S("lespaul", { sel: "treble" })).f < G.resonance("strat", S("strat", { sel: "p1" })).f);
check("humbucker cancels hum", G.hum("lespaul", S("lespaul", { sel: "treble" })) < 0.1 && G.hum("strat", S("strat", { sel: "p1" })) > 0.8);
check("Strat 2 and 4 cancel hum, 3 does not", G.hum("strat", S("strat", { sel: "p2" })) < 0.1 && G.hum("strat", S("strat", { sel: "p4" })) < 0.1 && G.hum("strat", S("strat", { sel: "p3" })) > 0.8);
// out of phase: the fundamental (low end) cancels
const fund = st => G.response("lespaul", st, 110)[0].amp;
const inP = fund(S("lespaul", { sel: "both" })), outP = fund(S("lespaul", { sel: "both", phase: true }));
const lv = st => G.level("lespaul", st), share = G.centroid("lespaul", S("lespaul", { sel: "both", phase: true })) / G.centroid("lespaul", S("lespaul", { sel: "both" }));
check("out of phase: the fundamental drops by more than 3 dB and the sound gets thinner (brightness up)", outP < inP / Math.SQRT2 && share > 1.2, (20 * Math.log10(outP / inP)).toFixed(1) + " dB");
// in-between: a two-pickup notch that neither pickup alone has (Strat position 4 vs 3 and 5 on some harmonic)
const r = sel => G.response("strat", S("strat", { sel }), 82.4).map(m => m.amp);
const p3 = r("p3"), p4 = r("p4"), p5 = r("p5"); let notch = false;
for (let n = 0; n < 30; n++) if (p4[n] < 0.3 * Math.min(p3[n], p5[n])) notch = true;
check("Strat position 4 has a notch neither pickup alone has", notch);
// node: a point pickup at 1/3 of the string does not hear harmonic 3
check("a pickup on a node does not hear that harmonic", Math.abs(G.sense({ coils: [[25.5 / 3, 1e-6]], out: 1 }, 3, 25.5)) < 1e-6 && Math.abs(G.sense({ coils: [[25.5 / 3, 1e-6]], out: 1 }, 2, 25.5)) > 0.5);
check("volume 0 = silence", G.level("strat", S("strat", { vol: 0 })) < 1e-3 * G.level("strat", S("strat", {})));
check("Les Paul middle: neck volume 0 kills both (shared output)", G.level("lespaul", S("lespaul", { sel: "both", vol1: 0 })) < 0.05 * G.level("lespaul", S("lespaul", { sel: "both" })));
const x = G.render("strat", S("strat", {}), G.notes("riff"), { sr: 22050 }); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
check("render makes sound, no NaN", pk > 0.01 && x.every(Number.isFinite), pk.toFixed(3));
// translation
const t1 = G.translate("lespaul", S("lespaul", { sel: "rhythm" }), "sg"); check("LP rhythm -> SG rhythm", t1.state.sel === "rhythm" && t1.quality !== "lost", t1.quality);
const t2 = G.translate("strat", S("strat", { sel: "p2" }), "lespaul"); check("Strat 2 -> Les Paul: not exact, notes say what is lost", t2.quality !== "exact" && t2.notes.some(n => /middle|quack/i.test(n)), t2.quality + " " + t2.state.sel);
const t3 = G.translate("strat", S("strat", { sel: "p4", tone1: 6 }), "strat"); check("Strat -> Strat is exact", t3.quality === "exact" && t3.state.sel === "p4", t3.quality);
check("translate never picks the what-if phase unless asked", G.translate("tele", S("tele", { sel: "both" }), "lespaul").state.phase === false);
// panels: every bound key is a control of its guitar
const layouts = {}; global.FaithfulPanel = { register: L => { layouts[L.id] = L; } };
for (const id of G.IDS) { require(ROOT + `/apps/shared/lessons/panels/gt-${id}.js`); const L = layouts["gt-" + id];
  const keys = L.items.filter(i => i.k).map(i => i.k), miss = keys.filter(k => !G.ctl(id, k)), unbound = G.GUITARS[id].controls.map(c => c[0]).filter(k => keys.indexOf(k) < 0);
  check(`gt-${id}: panel binds only known keys and every control`, miss.length === 0 && unbound.length === 0, miss.concat(unbound).join(",")); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/guitars/tracks.json", "utf8")).tracks;
for (const id of G.IDS) { const l = T.filter(t => t.guitar === id); check(`${id}: 3-5 tracks, each a YouTube url with title and a valid state`, l.length >= 3 && l.length <= 5 && l.every(t => /youtube\.com\/watch\?v=/.test(t.url) && t.title && t.channel && G.ctl(id, "sel")[3].indexOf(t.state.sel) >= 0)); }
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
