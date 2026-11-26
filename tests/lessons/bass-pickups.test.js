// The bass pickup model (apps/shared/lessons/bass-pickups.js on guitar-pickups.js) in node: P darker than a Jazz bridge pickup and
// lower in resonance; the split coil and the Jazz blend cancel hum, one Jazz pickup alone does not; the Jazz blend resonates higher
// than either pickup (parallel coils) and has notches neither has alone; one Jazz volume at 0 solos the other; the 70s bridge
// pickup is brighter than the 60s; the StingRay's active treble and bass boosts work and the cable does not load it; the split coil
// halves are heard only by their own strings; translation; panels bind every control; tracks complete.
// Run: node tests/lessons/bass-pickups.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../..");
const BP = require(ROOT + "/apps/shared/lessons/bass-pickups.js"), G = BP.GP;
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const S = (id, o) => Object.assign(G.defaults(id), o || {}), cen = (id, o) => G.centroid(id, S(id, o), 55), res = (id, o) => G.resonance(id, S(id, o)).f;
check("basses registered, guitars list unchanged", G.BASS_IDS.join() === "pbass,jbass,jbass70,stingray,stingray3,ric4003" && G.IDS.join() === "strat,tele,lespaul,sg");
check("P darker than the Jazz bridge pickup alone", cen("pbass") < cen("jbass", { vol1: 0 }), Math.round(cen("pbass")) + " < " + Math.round(cen("jbass", { vol1: 0 })));
check("P resonates lower than a Jazz single coil", res("pbass") < res("jbass", { vol1: 0 }), Math.round(res("pbass")) + " < " + Math.round(res("jbass", { vol1: 0 })));
check("split coil cancels hum", G.hum("pbass", S("pbass")) < 0.1);
check("Jazz blend cancels hum, neck alone hums", G.hum("jbass", S("jbass")) < 0.1 && G.hum("jbass", S("jbass", { vol2: 0 })) > 0.8);
check("Jazz blend resonates higher than neck only (two coils in parallel)", res("jbass") > 1.3 * res("jbass", { vol2: 0 }), Math.round(res("jbass", { vol2: 0 })) + " -> " + Math.round(res("jbass")));
const r = o => G.response("jbass", S("jbass", o), 41.2).map(m => m.amp); const bl = r({}), nk = r({ vol2: 0 }), br = r({ vol1: 0 }); let notch = false;
for (let n = 0; n < 40; n++) if (bl[n] < 0.3 * Math.min(nk[n], br[n])) notch = true;
check("Jazz blend has a notch neither pickup alone has", notch);
check("Jazz: bridge volume 0 leaves the neck pickup sounding (solo)", G.level("jbass", S("jbass", { vol2: 0 }), 55) > 0.5 * G.level("jbass", S("jbass", { vol1: 10, vol2: 10 }), 55));
check("Jazz 70s bridge pickup brighter than 60s", cen("jbass70", { vol1: 0 }) > cen("jbass", { vol1: 0 }));
check("StingRay treble boost brightens", cen("stingray", { treble: 9 }) > 1.2 * cen("stingray"), Math.round(cen("stingray")) + " -> " + Math.round(cen("stingray", { treble: 9 })));
check("StingRay bass boost adds level, darker", G.level("stingray", S("stingray", { bass: 9 }), 55) > 1.3 * G.level("stingray", S("stingray"), 55) && cen("stingray", { bass: 9 }) < cen("stingray"));
check("3-band mid boost adds level", G.level("stingray3", S("stingray3", { mid: 9 }), 110) > 1.1 * G.level("stingray3", S("stingray3"), 110));
check("active: the cable does not load the pickup, so it resonates far higher than the passive P", res("stingray") > 3 * res("pbass"), Math.round(res("stingray")) + " Hz");
const P = G.GUITARS.pbass.pickups[0];
check("P halves: E-A half heard only on E and A", G.sense(P, 1, 34, 0) === G.sense(P, 1, 34, 1) && G.sense(P, 1, 34, 0) !== G.sense(P, 1, 34, 3));
const x = G.render("pbass", S("pbass"), G.notes("riff", 110, "bass"), { sr: 22050 }); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
check("render makes sound, no NaN", pk > 0.01 && x.every(Number.isFinite), pk.toFixed(3));
const t1 = G.translate("jbass", S("jbass"), "jbass70"); check("Jazz 60s blend -> 70s: not lost, both pickups up", t1.quality !== "lost" && t1.state.vol1 > 5 && t1.state.vol2 > 5, t1.quality);
const t2 = G.translate("stingray", S("stingray", { treble: 9 }), "pbass"); check("StingRay boost -> P: notes say the active EQ is lost", t2.notes.some(n => /active EQ/.test(n)), t2.quality);
const t3 = G.translate("stingray3", S("stingray3", { mid: 9 }), "stingray"); check("3-band mid -> 2-band: the mid knob noted", t3.notes.some(n => /mid knob/.test(n)));
const t4 = G.translate("pbass", S("pbass", { tone: 6 }), "pbass"); check("P -> P exact", t4.quality === "exact", t4.quality);
const t5 = G.translate("pbass", S("pbass"), "jbass"); check("P -> Jazz notes the split coil", t5.notes.some(n => /split-coil/.test(n)));
const layouts = {}; global.FaithfulPanel = { register: L => { layouts[L.id] = L; } };
for (const id of G.BASS_IDS) { require(ROOT + `/apps/shared/lessons/panels/bs-${id}.js`); const L = layouts["bs-" + id];
  const keys = L.items.filter(i => i.k).map(i => i.k), miss = keys.filter(k => !G.ctl(id, k)), unbound = G.GUITARS[id].controls.map(c => c[0]).filter(k => keys.indexOf(k) < 0);
  check(`bs-${id}: panel binds only known keys and every control`, !!L && miss.length === 0 && unbound.length === 0, miss.concat(unbound).join(",")); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/basses/tracks.json", "utf8")).tracks;
for (const id of ["pbass", "jbass", "stingray", "ric4003"]) { const l = T.filter(t => t.bass === id);
  check(`${id}: 3-5 tracks, each a YouTube url with title and a state of known keys`, l.length >= 3 && l.length <= 5 && l.every(t => /youtube\.com\/watch\?v=/.test(t.url) && t.title && t.channel && Object.keys(t.state).every(k => G.ctl(id, k)))); }
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
