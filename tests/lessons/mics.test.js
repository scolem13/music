// The mic models (apps/shared/lessons/mics.js) in node: proximity boost rises as the source comes closer (directional only), the
// figure-8's rear lobe is inverted (and cancels a front copy when summed), the pad lowers the level and raises max SPL, low cut and
// the MD 421 roll-off cut the bass, cardioid rear rejection, off-axis dulling, noise / level readouts, rendering bounded,
// translation (pattern lost on a fixed cardioid), panels bind only known keys, tracks 3 per mic.
// Run: node tests/lessons/mics.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), M = require(ROOT + "/apps/shared/lessons/mics.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const db = (id, st, pl, f) => M.db(id, st, pl, f);
for (const id of ["sm57", "sm58", "md421", "beta52"]) {
  const b = [0.01, 0.03, 0.1, 0.3, 1].map(d => db(id, {}, { dist: d }, 100) - db(id, {}, { dist: d }, 2000));
  check(`${id}: proximity bass (100 Hz vs 2 kHz) rises at every step closer`, b.every((v, i) => i === 0 || b[i - 1] > v), b.map(v => v.toFixed(1)).join(" ")); }
check("prox(): cardioid +6 dB or more at 2 cm, 100 Hz; near 0 at 2 m", M.prox(0.5, 0.02, 100) > 6 && M.prox(0.5, 2, 100) < 1, M.prox(0.5, 0.02, 100).toFixed(1));
check("prox(): a true omni has none", Math.abs(M.prox(1, 0.01, 100)) < 0.01);
check("U 87 omni: far less proximity than cardioid", (db("u87", { pattern: "omni" }, { dist: 0.02 }, 80) - db("u87", { pattern: "omni" }, { dist: 1 }, 80)) < 0.5 * (db("u87", {}, { dist: 0.02 }, 80) - db("u87", {}, { dist: 1 }, 80)));
check("figure-8 proximity stronger than cardioid", M.prox(0, 0.03, 100) > M.prox(0.5, 0.03, 100));
const f8 = { pattern: "fig8" };
check("U 87 figure-8: rear lobe inverted (H < 0 behind, > 0 in front)", M.H("u87", f8, { dist: 0.5, angle: 180 }, 1000) < 0 && M.H("u87", f8, { dist: 0.5, angle: 0 }, 1000) > 0);
check("R-121: rear inverted at every band", [100, 1000, 8000].every(f => M.H("r121", {}, { dist: 0.3, angle: 180 }, f) < 0));
check("R-121: rear as loud as the front at 1 kHz (±1.5 dB)", Math.abs(db("r121", {}, { dist: 1, angle: 180 }, 1000) - db("r121", {}, { dist: 1, angle: 0 }, 1000)) < 1.5);
check("figure-8: side null (90°) at least 20 dB down", db("r121", {}, { dist: 1, angle: 90 }, 1000) < db("r121", {}, { dist: 1, angle: 0 }, 1000) - 20);
const sr = 16000, x = M.synth("voice", sr), o = { noRoom: true, noNoise: true };
const fr = M.render("r121", {}, { dist: 0.5, angle: 0 }, x, sr, o), bk = M.render("r121", {}, { dist: 0.5, angle: 180 }, x, sr, o);
let s = 0, e = 0; for (let i = 0; i < fr.length; i++) { s += (fr[i] + bk[i]) ** 2; e += fr[i] ** 2; }
check("R-121 front + rear copies summed nearly cancel (> 10 dB down)", 10 * Math.log10(s / e) < -10, (10 * Math.log10(s / e)).toFixed(1) + " dB");
check("cardioid rear at least 15 dB below front (1 kHz)", db("sm57", {}, { dist: 1, angle: 180 }, 1000) < db("sm57", {}, { dist: 1, angle: 0 }, 1000) - 15);
check("off axis duller: 8 kHz falls more than 1 kHz at 60°", (db("u87", {}, { dist: 1, angle: 0 }, 8000) - db("u87", {}, { dist: 1, angle: 60 }, 8000)) > (db("u87", {}, { dist: 1, angle: 0 }, 1000) - db("u87", {}, { dist: 1, angle: 60 }, 1000)) + 1);
check("pad lowers the level by 10 dB", Math.abs(db("u87", {}, { dist: 0.1 }, 1000) - db("u87", { pad: true }, { dist: 0.1 }, 1000) - 10) < 0.01);
check("pad lowers the rendered level", (() => { const a = M.render("u87", {}, { dist: 0.2 }, x, sr, o), b = M.render("u87", { pad: true }, { dist: 0.2 }, x, sr, o), r = y => Math.sqrt(y.reduce((p, v) => p + v * v, 0)); return r(b) < 0.5 * r(a); })());
check("pad raises max SPL 117 -> 127", M.maxSPL("u87", {}) === 117 && M.maxSPL("u87", { pad: true }) === 127);
check("U 87 at 2 cm from the guitar amp is over max SPL; the pad gives 10 dB more", M.level("u87", {}, { dist: 0.02 }, "guitar").headroom < 0 && M.level("u87", { pad: true }, { dist: 0.02 }, "guitar").headroom - M.level("u87", {}, { dist: 0.02 }, "guitar").headroom === 10);
check("low cut lowers 40 Hz by > 6 dB, leaves 1 kHz", db("u87", {}, { dist: 1 }, 40) - db("u87", { lowcut: true }, { dist: 1 }, 40) > 6 && Math.abs(db("u87", {}, { dist: 1 }, 1000) - db("u87", { lowcut: true }, { dist: 1 }, 1000)) < 0.2);
check("MD 421 roll-off: M > 3 > S at 80 Hz", db("md421", { bass: "M" }, { dist: 0.1 }, 80) > db("md421", { bass: "3" }, { dist: 0.1 }, 80) && db("md421", { bass: "3" }, { dist: 0.1 }, 80) > db("md421", { bass: "S" }, { dist: 0.1 }, 80));
check("U 87 self-noise per pattern = Neumann 15 / 12 / 14 dB-A", ["omni", "cardioid", "fig8"].map(p => M.selfNoise("u87", { pattern: p })).join() === "15,12,14");
check("sensitivities: SM57 -56, SM58 -54.5, R-121 -47, U 87 cardioid 28 mV/Pa", M.sens("sm57", {}) === -56 && M.sens("sm58", {}) === -54.5 && M.sens("r121", {}) === -47 && Math.abs(M.sens("u87", {}) - 20 * Math.log10(0.028)) < 1e-9);
check("clean(): a fixed mic ignores pattern / pad / low cut it lacks", (() => { const c = M.clean("sm57", { pattern: "fig8", pad: true, lowcut: true }); return c.pattern === "cardioid" && !c.pad && !c.lowcut; })());
for (const id of M.IDS) { const y = M.render(id, M.defaults(id), { dist: 0.05 }, M.synth("snare", sr), sr, { src: "snare" }); check(`${id}: render finite and bounded`, y.every(Number.isFinite) && y.some(v => Math.abs(v) > 1e-3) && y.every(v => Math.abs(v) < 50)); }
const t1 = M.translate("u87", f8, { dist: 0.3, angle: 180 }, "sm57");
check("translate U 87 fig-8 from behind -> SM57: lost, notes say pattern lost", t1.quality === "lost" && t1.notes.some(n => /pattern lost/i.test(n)), t1.quality);
const t2 = M.translate("sm57", {}, { dist: 0.04, angle: 30 }, "sm58");
check("translate SM57 -> SM58: exact or approx, close placement", /exact|approx/.test(t2.quality) && t2.place.dist < 0.2, t2.quality + " " + JSON.stringify(t2.place));
check("translate U 87 cardioid + pad -> U 87 kept", M.translate("u87", { pad: true }, { dist: 0.2 }, "u87").state.pad === true);
check("translate U 87 low cut -> MD 421 bass roll-off", M.translate("u87", { lowcut: true }, { dist: 0.2 }, "md421").state.bass !== "M");
check("translate SM57 -> U 87 keeps cardioid", M.translate("sm57", {}, { dist: 0.05 }, "u87").state.pattern === "cardioid");
// panels: every bound key is a control the mic has
global.FaithfulPanel = { L: {}, register(L) { this.L[L.id] = L; } };
for (const id of M.IDS) { const f = ROOT + `/apps/shared/lessons/panels/mic-${id}.js`; check(`panel mic-${id} exists`, fs.existsSync(f)); if (!fs.existsSync(f)) continue;
  eval(fs.readFileSync(f, "utf8")); const L = FaithfulPanel.L["mic-" + id], bad = L.items.filter(it => it.k && !M.ctl(id, it.k)).map(it => it.k);
  check(`panel mic-${id}: binds only known keys, every control drawn`, !bad.length && M.MICS[id].controls.every(c => L.items.some(it => it.k === c[0])), bad.join()); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/mics/tracks.json", "utf8")).tracks;
check("tracks: 3 per mic", M.IDS.every(id => T.filter(t => t.mic === id).length === 3));
check("tracks: a video with a channel is a watch URL; the rest searches", T.every(t => t.channel ? /youtube\.com\/watch\?v=/.test(t.url) : /results\?search_query=/.test(t.url)));
console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);
