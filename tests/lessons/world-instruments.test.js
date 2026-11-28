// The world-instrument models (apps/shared/lessons/world-instruments.js) in node: jawari adds upper partials over time (and a plain
// bridge does not), sympathetic strings ring after a matching note and not after an off one, the pan's tuned partials sit at 1:2:3,
// tines' overtones are inharmonic and die fast, buzzers add noise, frets follow the raga, tanpura tunings, translation
// (sitar <-> tanpura, kalimba <-> mbira; other pairs skipped), panels bind only known keys and give zones, renders finite, tracks 3 each.
// Run: node tests/lessons/world-instruments.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), M = require(ROOT + "/apps/shared/lessons/world-instruments.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const sr = 22050, rms = y => Math.sqrt(y.reduce((a, v) => a + v * v, 0) / y.length);
const f0 = 185;
const J = M.stringRender(f0, { dur: 2, jawari: 1, thread: 0.4 }, sr), P = M.stringRender(f0, { dur: 2, jawari: 0 }, sr);
const gJ = M.bandRatio(J, sr, f0, 1.2, 1.6) / M.bandRatio(J, sr, f0, 0.02, 0.2), gP = M.bandRatio(P, sr, f0, 1.2, 1.6) / M.bandRatio(P, sr, f0, 0.02, 0.2);
check("jawari: upper / lower partial energy grows over time", gJ > 1.5, gJ.toFixed(2));
check("plain bridge: upper partials fade faster than the low ones", gP < 1, gP.toFixed(2));
const hiAt = th => { const y = M.stringRender(f0, { dur: 1.5, jawari: 1, thread: th }, sr); let best = 0, bk = 0; for (let k = 4; k <= 28; k++) { const e = M.gz(y, sr, k * f0, 1, 1.4); if (e > best) { best = e; bk = k; } } return bk; };
check("thread place moves the bright band up the partials", hiAt(0.9) > hiAt(0.1), hiAt(0.1) + " -> " + hiAt(0.9));
const st = M.clean("sitar", { raga: "yaman" }), sa = M.SA[st.sa];
check("taraf: 13 strings, the first on Sa", M.taraf("sitar", st).length === 13 && Math.abs(M.taraf("sitar", st)[0] - sa) < 0.01);
const eOn = M.sympathy(sa * 2, sa), eOff = M.sympathy(sa * 2 * Math.pow(2, 0.5 / 12), sa);
check("sympathy: a played Sa drives the Sa taraf string far more than a quarter-tone off note", eOn > 20 * eOff, eOn.toFixed(3) + " vs " + eOff.toExponential(1));
const tOn = M.tarafRender("sitar", st, sa, sr, 2.5), tOff = M.tarafRender("sitar", st, sa * Math.pow(2, 0.5 / 12), sr, 2.5), tail = y => rms(y.subarray(Math.round(1.5 * sr), Math.round(2.4 * sr)));
check("sympathetic strings ring after a matching note (tail energy)", tail(tOn) > 5 * tail(tOff) + 1e-9, tail(tOn).toExponential(1) + " vs " + tail(tOff).toExponential(1));
const fr = M.frets(st);
check("20 frets; Yaman has tivra Ma, not shuddha", fr.length === 20 && fr.some(f => f.k === "M#") && !fr.some(f => f.k === "M" && f.used));
check("Bhupali: Ma and Ni frets unused", M.frets(M.clean("sitar", { raga: "bhupali" })).filter(f => !f.used).every(f => f.k === "M" || f.k === "N"));
check("meend raises the pitch (partial energy moves to the pulled pitch)", (() => { const y = M.stringRender(200, { dur: 1.5, jawari: 0, meend: 3 }, sr), up = 200 * Math.pow(2, 3 / 12); return M.gz(y, sr, up, 0.9, 1.3) > 5 * M.gz(y, sr, 200, 0.9, 1.3); })());
check("tanpura tunings: Pa 3/4, Ma 2/3 of sa", M.TAN.P.r === 0.75 && Math.abs(M.TAN.M.r - 2 / 3) < 1e-9);
const pm = M.panModes(440, M.clean("tenorpan", {})).filter(m => m.tuned);
check("pan note partials at 1:2:3", pm.length === 3 && Math.abs(pm[1].f / pm[0].f - 2) < 1e-6 && Math.abs(pm[2].f / pm[0].f - 3) < 1e-6);
const pr = M.panRender(0, M.clean("tenorpan", {}), sr, 1.5), base = M.panNotes()[0].f, gp = k => M.gz(pr, sr, k * base, 0.05, 0.6), gOff = M.gz(pr, sr, 2.5 * base, 0.05, 0.6);
check("rendered pan note: energy at 1, 2 and 3 x f, little between", gp(1) > 100 * gOff && gp(2) > 10 * gOff && gp(3) > gOff, [gp(1), gp(2), gp(3), gOff].map(v => v.toExponential(1)).join(" "));
check("tuner error moves the octave partial", Math.abs(M.panModes(440, { oct: 20 })[1].f / 880 - Math.pow(2, 20 / 1200)) < 1e-9);
check("pan layout: 29 notes; outer ring in fifths", M.panNotes().length === 29 && M.panNotes().slice(0, 12).every((n, i, a) => i === 0 || ((Math.round(12 * Math.log2(n.f / a[i - 1].f)) % 12) + 12) % 12 === 7));
check("tine overtones inharmonic (6.27, 17.55) and short", M.tineModes(400)[1].f / 400 > 6.2 && M.tineModes(400)[1].T < 0.1 * M.tineModes(400)[0].T);
const ks = M.tines("kalimba", {});
check("kalimba: 17 tines, lowest in the centre, alternating sides", ks.length === 17 && ks[0].side === 0 && ks[1].side === -ks[2].side && ks.every(t => t.f >= ks[0].f));
check("mbira: 22 keys in three registers", M.tines("mbira", {}).length === 22 && new Set(M.tines("mbira", {}).map(t => t.reg)).size === 3);
const nb = M.tineRender("mbira", { buzz: false, deze: false }, 10, sr, 1), yb = M.tineRender("mbira", { buzz: true, deze: false }, 10, sr, 1);
const hf = y => { let s = 0; for (let f = 2000; f < 6000; f += 250) s += M.gz(y, sr, f, 0, 0.5); return s; };
check("buzzers add high noise", hf(yb) > 5 * hf(nb), hf(yb).toExponential(1) + " vs " + hf(nb).toExponential(1));
for (const id of M.IDS) for (const p of M.notes(id, {}).slice(0, 3)) { const y = M.hit(id, {}, p.part, sr); check(`${id} ${p.part}: finite, sounding, bounded`, y.every(Number.isFinite) && rms(y) > 1e-4 && y.every(v => Math.abs(v) < 6)); }
const t1 = M.translate("sitar", { raga: "malkauns", sa: "D", jawari: 0.4 }, "tanpura");
check("sitar (Malkauns) -> tanpura: Ma tuning, Sa and jawari carried, approx", t1.state.tuning === "M" && t1.state.sa === "D" && t1.state.jawari === 0.4 && t1.quality === "approx");
check("sitar (Yaman) -> tanpura: Pa", M.translate("sitar", { raga: "yaman" }, "tanpura").state.tuning === "P");
check("tanpura -> sitar keeps Sa", M.translate("tanpura", { sa: "E" }, "sitar").state.sa === "E");
const t2 = M.translate("mbira", { tuning: "nyamaropa", tonic: "G", buzz: true, deze: true }, "kalimba");
check("mbira -> kalimba: tuning carried, buzzers and deze lost (approx)", t2.state.tuning === "nyamaropa" && t2.quality === "approx" && t2.notes.some(n => /Buzzers lost/.test(n)) && t2.notes.some(n => /deze/.test(n)));
const t3 = M.translate("tenorpan", {}, "sitar");
check("pan -> sitar: skipped, said so", t3.skipped === true && t3.notes.some(n => /Skipped/.test(n)));
check("zoneAt: ellipse and rect", M.zoneAt({ zones: [{ part: "a", kind: "ell", cx: 10, cy: 10, r: 5 }, { part: "b", x: 30, y: 0, w: 10, h: 10 }] }, 11, 10) === "a" && M.zoneAt({ zones: [{ part: "b", x: 30, y: 0, w: 10, h: 10 }] }, 35, 5) === "b");
global.WorldInst = M; global.FaithfulPanel = { LAYOUTS: {}, register(L) { this.LAYOUTS[L.id] = L; } };
for (const id of M.IDS) { const f = ROOT + `/apps/shared/lessons/panels/wi-${id}.js`; check(`panel wi-${id} exists`, fs.existsSync(f)); if (!fs.existsSync(f)) continue;
  eval(fs.readFileSync(f, "utf8")); const L = FaithfulPanel.LAYOUTS["wi-" + id], g = L.build(M.defaults(id)), bad = (L.controls || []).concat(g.items).filter(it => it.k && !M.ctl(id, it.k)).map(it => it.k);
  const parts = M.notes(id, {}).map(n => n.part).filter(p => p !== "cycle" && p !== "open");
  check(`panel wi-${id}: binds only known keys, a zone for every note`, !bad.length && parts.every(p => g.zones.some(z => z.part === p)), bad.join() + " " + parts.filter(p => !g.zones.some(z => z.part === p)).join()); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/world-instruments/tracks.json", "utf8")).tracks;
check("tracks: 3 per instrument", M.IDS.every(id => T.filter(t => t.item === id).length === 3));
check("tracks: searches are labelled (no channel), watch URLs only with a channel", T.every(t => t.channel ? /youtube\.com\/watch\?v=/.test(t.url) : /results\?search_query=/.test(t.url)));
console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);
