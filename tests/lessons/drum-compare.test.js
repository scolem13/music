// The drum machines page's translator and engine (apps/shared/lessons/drum-compare.js), headless.
// node tests/lessons/drum-compare.test.js   (NEG=1 must fail)
const D = require("../../apps/shared/lessons/drum-compare.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const ex = id => D.EXAMPLES.find(x => x.id === id);
const tr = (id, to) => D.translate(ex(id).s, to);
const lost = r => r.notes.filter(n => n.cls === "lost").map(n => n.what).join(" | ");
check("808 electro → 909: cowbell and conga lost", /Cow Bell/.test(lost(tr("electro808", "tr909"))) && /Conga/.test(lost(tr("electro808", "tr909"))), lost(tr("electro808", "tr909")));
check("808 electro → LinnDrum: cowbell kept", !/Cow Bell/.test(lost(tr("electro808", "linn"))) && tr("electro808", "linn").state.rows.cowbell.some(Boolean));
check("909 shuffle → 808: lost", /Swing/.test(lost(tr("house909", "tr808"))));
check("909 shuffle 3 → MPC swing 58 %", tr("house909", "mpc60").state.swing === 58, tr("house909", "mpc60").state.swing);
check("909 shuffle 3 → Linn timing C", tr("house909", "linn").state.timing === "C");
check("Linn timing E = MPC 67 % (perfect triplet)", D.translate(Object.assign({}, ex("linnpop").s, { timing: "E" }), "mpc60").state.swing === 67);
check("909 flams → 808 lost", /Flams/.test(lost(tr("flam909", "tr808"))));
const mf = tr("flam909", "mpc60"), x2 = (mf.state.rows.snare || []).filter(x => x && x.x2).length, n2 = D.onsets(mf.state).filter(h => h.c === "snare").length;
check("909 flams → MPC become second notes", x2 === 3 && n2 === 10, x2 + " flams, " + n2 + " snare onsets");
const loose = tr("mpcloose", "tr909");
check("MPC off-grid notes → 909: approx, all on the grid", loose.notes.some(n => n.cls === "approx" && /off the grid/.test(n.what)) && Object.values(loose.state.rows).every(r => r.every(x => !x || !x.o)));
check("MPC off-grid notes → Linn HI keeps them", tr("mpcloose", "linn").state.quant === "HI" && tr("mpcloose", "linn").state.rows.snare.some(x => x && x.o));
check("Linn tambourine + claps → 808: one switch circuit, one lost", /together/.test(lost(tr("linnpop", "tr808"))));
check("triplets map to the 909's triplet scale", tr("trip808", "tr909").state.scale === 12 && tr("trip808", "tr909").state.len === 12);
// every note cited; every ctl id names something in a panel
const ctlOK = (m, id) => { const M = D.MACHINES[m]; if (id.startsWith("s:")) return true; if (id.startsWith("v:")) return D.machineVoices(M).includes(id.slice(2)); const [c, p] = id.slice(2).split("."); const v = M.voices.find(v => v[0] === c || v[3] === c); return !!v && v[2].includes(p); };
let bad = [];
for (const e of D.EXAMPLES) for (const to of D.ORDER) { if (to === e.from) continue; const r = D.translate(e.s, to);
  r.notes.forEach(n => { if (!n.cite.length || n.cite.some(c => !c.book || !c.title || c.page == null)) bad.push(e.id + ">" + to + ": cite " + n.what);
    n.ctl.from.forEach(k => { if (!ctlOK(e.from, k)) bad.push(e.id + ": " + k); }); n.ctl.to.forEach(k => { if (!ctlOK(to, k)) bad.push(e.id + ">" + to + ": " + k); }); });
  for (const c in r.state.rows) if (!D.machineVoices(D.MACHINES[to]).includes(c)) bad.push(e.id + ">" + to + " row " + c); }
check("every note cited, every control real, every row a voice of its machine", bad.length === 0, bad.slice(0, 3).join("; "));
// swing in the onsets
const on = D.onsets(Object.assign({}, ex("mpcloose").s, { quant: "1/16", rows: { chh: Array.from({ length: 16 }, () => ({ v: .7 })) } }));
check("MPC 62 % puts the 2nd 16th at 0.31 beat", Math.abs(on[1].t - 0.31) < 0.002, on[1].t.toFixed(3));
// JSON round trip and validation
const js = D.exportJSON(ex("house909").s, { song: "Test", artist: "Me", source: { url: "https://youtube.com/watch?v=x", channel: "c", title: "t", at: "1:02" } });
const back = D.importJSON(js);
check("JSON round trip", JSON.stringify(D.full(back.state).rows) === JSON.stringify(D.full(ex("house909").s).rows) && back.meta.song === "Test" && JSON.parse(js).kind === "drum-pattern");
let threw = 0; try { D.importJSON(JSON.stringify({ kind: "drum-pattern", version: 1, machine: "tr909", pattern: { rows: { cowbell: [1] } } })); } catch (e) { threw++; }
try { D.importJSON("{\"kind\":\"synth-patch\"}"); } catch (e) { threw++; }
check("import refuses a 909 cowbell and the wrong kind", threw === 2);
// the engine: every voice of every machine sounds, no NaN; 808 accent starts the kick at twice the pitch
bad = [];
for (const m of D.ORDER) for (const c of D.machineVoices(D.MACHINES[m])) { const y = D.render(m, c, {}, 0.8, 0.3); let s = 0, nan = false; for (const v of y) { if (!isFinite(v)) nan = true; s += v * v; } const r = Math.sqrt(s / y.length); if (nan || r < 0.003) bad.push(m + "/" + c + " " + r.toFixed(4)); }
check("every voice sounds, no NaN", bad.length === 0, bad.join("; "));
const zc = y => { let n = 0; for (let i = 1; i < 192; i++) if (y[i - 1] < 0 && y[i] >= 0) n++; return n; };
const plain = D.render("tr808", "kick", { tone: 10 }, .8, .01), accd = D.render("tr808", "kick", { tone: 10 }, .8, .01, true);
const lv = y => y.slice(0, 960).reduce((a, b) => Math.max(a, Math.abs(b)), 0);
check("808 accent is louder", lv(accd) > lv(plain) * 1.1, lv(plain).toFixed(3) + " -> " + lv(accd).toFixed(3));
const bits = y => new Set(Array.from(y.slice(2000, 6000)).map(v => v.toFixed(6))).size;
check("909 hats cut to 6 bits (few levels), MPC more", bits(D.render("tr909", "chh", {}, 1, .2)) <= 64 && bits(D.render("mpc60", "snare", {}, 1, .2)) > 64);
const pat = D.renderPattern(ex("house909").s, 1); let ps = 0; for (const v of pat) ps += v * v;
check("a whole pattern renders", Math.sqrt(ps / pat.length) > 0.01, Math.sqrt(ps / pat.length).toFixed(3));
check("worklet source defines a real class", /class extends AudioWorkletProcessor/.test(D.workletSource));
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
