// The drum and cymbal models (apps/shared/lessons/drumkits.js) in node: a bigger drum is lower at the same tension, tighter is
// higher, the snare wires add high noise (and the throw-off removes it), the centre excites only round modes, muffling shortens,
// a K ride is darker (lower spectral centroid) than the same ride in 2002 bronze, and a 2002 crash brighter than an A crash,
// closed hats shorter than open, renders finite, translation (pitch out of reach, hats -> ride pedal lost), panels bind only
// known keys and their zones, tracks 3 per item.
// Run: node tests/lessons/drumkits.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../.."), M = require(ROOT + "/apps/shared/lessons/drumkits.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const sr = 22050, I = M.ITEMS, rms = y => Math.sqrt(y.reduce((a, v) => a + v * v, 0) / y.length);
const k22 = M.pitch(I.rock.drums.kick, { tension: 0.5 }), k18 = M.pitch(I.jazz.drums.kick, { tension: 0.5 });
check("bigger drum lower: 22\" kick below 18\" kick at the same tension", k22 < k18, k22.toFixed(1) + " < " + k18.toFixed(1));
check("bigger drum lower: 16\" floor below 12\" tom", M.pitch(I.rock.drums.floor, { tension: 0.5 }) < M.pitch(I.rock.drums.tom1, { tension: 0.5 }));
check("rendered: 22\" kick's spectral centroid below the 12\" tom's", M.centroid(M.hit("rock", {}, "kick", "centre", sr), sr) < M.centroid(M.hit("rock", { tom1: { tension: 0.45 } }, "tom1", "centre", sr), sr));
check("tighter is higher", M.pitch(I.supraphonic.drum, { tension: 0.8 }) > M.pitch(I.supraphonic.drum, { tension: 0.2 }));
check("14\" snare at middle tension inside 160-420 Hz (Drum tuning: 220-349)", (f => f > 160 && f < 420)(M.pitch(I.supraphonic.drum, { tension: 0.5 })));
check("Bessel J0 zero at 2.4048", Math.abs(M.J(0, 2.4048)) < 1e-4 && Math.abs(M.J(1, 3.8317)) < 1e-4);
const on = M.drumRender(I.supraphonic.drum, { wires: true }, "centre", sr), off = M.drumRender(I.supraphonic.drum, { wires: false }, "centre", sr);
check("wires on adds noise above 3 kHz", M.noiseShare(on, sr) > 10 * M.noiseShare(off, sr) && M.noiseShare(on, sr) > 0.01, M.noiseShare(on, sr).toFixed(3) + " vs " + M.noiseShare(off, sr).toExponential(1));
check("tight strainer: shorter wire buzz (less noise energy)", M.noiseShare(M.drumRender(I.maple.drum, { wireTension: 1 }, "centre", sr), sr) < M.noiseShare(M.drumRender(I.maple.drum, { wireTension: 0 }, "centre", sr), sr));
const cm = M.modes(I.maple.drum, { wires: false }, "centre").filter(m => m.m > 0 && !m.shell && !m.reso), em = M.modes(I.maple.drum, { wires: false }, "edge").filter(m => m.m > 0 && !m.shell && !m.reso);
check("centre stroke: non-round modes far weaker than at the edge", cm.reduce((a, m) => a + m.a, 0) < 0.3 * em.reduce((a, m) => a + m.a, 0));
check("muffling shortens the decay", M.modes(I.maple.drum, { muffle: 0.8 }, "centre")[0].T < 0.5 * M.modes(I.maple.drum, {}, "centre")[0].T);
check("port shortens the kick's boom", M.modes(I.rock.drums.kick, { port: true }, "centre")[0].T < M.modes(I.rock.drums.kick, {}, "centre")[0].T);
check("brass shell rings longer than maple", M.SHELLS.brass.T > M.SHELLS.maple.T);
const K = I.kride, K2 = Object.assign({}, K, { series: "2002" }), cK = M.centroid(M.cymRender(K, {}, "bow", sr), sr), c2 = M.centroid(M.cymRender(K2, {}, "bow", sr), sr);
check("K darker than 2002: spectral centroid of the same 20\" ride", cK < 0.85 * c2, cK.toFixed(0) + " < " + c2.toFixed(0));
check("2002 crash brighter than the A crash", M.centroid(M.cymRender(I.p2002, {}, "edge", sr), sr) > M.centroid(M.cymRender(I.acrash, {}, "edge", sr), sr));
check("bigger cymbal sustains longer (partial T at 1 kHz)", M.cymPartials(I.aride, {}, "bow")[10].T > M.cymPartials(I.splash, {}, "bow")[10].T);
const hc = M.cymRender(I.hats, { pedal: "closed" }, "bow", sr), ho = M.cymRender(I.hats, { pedal: "open" }, "bow", sr), tail = y => rms(y.subarray(Math.round(0.3 * sr), Math.round(0.4 * sr)));
check("closed hats die quicker than open", tail(hc) < 0.1 * tail(ho));
check("choke cuts the tail", tail(M.cymRender(I.acrash, { choke: true }, "edge", sr).subarray(Math.round(0.2 * sr))) < 0.2 * tail(M.cymRender(I.acrash, {}, "edge", sr).subarray(Math.round(0.2 * sr))));
for (const id of M.IDS) { const y = M.hit(id, {}, "snare", null, sr); check(`${id}: render finite, sounding, bounded`, y.every(Number.isFinite) && rms(y) > 1e-4 && y.every(v => Math.abs(v) < 4)); }
const t1 = M.translate("rock", { kick: { tension: 0 } }, "jazz");
check("translate rock (kick slack) -> jazz: kick out of reach noted, approx or lost", /approx|lost/.test(t1.quality) && t1.notes.some(n => /range/.test(n)), t1.quality);
check("translate snare -> same snare exact", M.translate("maple", { tension: 0.3 }, "maple").quality === "exact");
const t2 = M.translate("supraphonic", { tension: 0.5, wires: false, muffle: 0.4 }, "blackbeauty");
check("translate Supraphonic -> Black Beauty keeps the pitch, wires off, muffle", Math.abs(M.pitch(I.blackbeauty.drum, t2.state) - M.pitch(I.supraphonic.drum, { tension: 0.5 })) < 1 && t2.state.wires === false && t2.state.muffle === 0.4);
check("translate snare -> kit puts it in the snare slot", M.translate("piccolo", {}, "funk").state.snare.tension > 0.5);
check("translate hats -> ride: pedal lost", M.translate("hats", { pedal: "foot" }, "aride").quality === "lost");
check("translate K -> A ride: brightness note", M.translate("kride", {}, "aride").notes.some(n => /Brighter/.test(n)));
check("zoneAt: snare centre / edge / rim", (() => { const L = { zones: [{ part: "snare", kind: "drum", cx: 100, cy: 100, r: 80 }] }; return M.zoneAt(L, 105, 100).strike === "centre" && M.zoneAt(L, 160, 100).strike === "edge" && M.zoneAt(L, 183, 100).strike === "rim" && M.zoneAt(L, 300, 300) === null; })());
global.DrumKits = M; global.FaithfulPanel = { L: {}, register(L) { this.L[L.id] = L; } };
for (const id of M.IDS) { const pid = (I[id].cat === "cymbal" ? "cy-" : "dk-") + id, f = ROOT + `/apps/shared/lessons/panels/${pid}.js`; check(`panel ${pid} exists`, fs.existsSync(f)); if (!fs.existsSync(f)) continue;
  eval(fs.readFileSync(f, "utf8")); const L = FaithfulPanel.L[pid], bad = L.items.filter(it => it.k && !M.ctl(id, it.k)).map(it => it.k);
  const parts = I[id].cat === "kit" ? ["kick", "snare", "tom1", "floor", "hats", "ride", "crash"] : [I[id].cat === "snare" ? "snare" : id];
  check(`panel ${pid}: binds only known keys, a zone for every part`, !bad.length && parts.every(p => L.zones.some(z => z.part === p)), bad.join()); }
const T = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/drumkits/tracks.json", "utf8")).tracks;
check("tracks: 3 per item", M.IDS.every(id => T.filter(t => t.item === id).length === 3));
check("tracks: a video with a channel is a watch URL; the rest searches", T.every(t => t.channel ? /youtube\.com\/watch\?v=/.test(t.url) : /results\?search_query=/.test(t.url)));
console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);
