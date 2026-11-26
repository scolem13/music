// EPiano (apps/shared/lessons/epiano.js) in node: every model renders finite, decaying sound; the physics does what the pages say
// (Rhodes bark grows with velocity and with the tine near the pickup's centre; Clavinet pickups differ, out of phase thins the
// fundamental, Soft tab darkens, mute shortens; CP-70 overtones are stretched; Wurli hard notes gain 2nd harmonic); translate
// notes are right; every panel layout's bound keys exist in its profile; the assignments file matches the models.
// Run: node tests/lessons/epiano.test.js   (NEG=1 must fail)
const path = require("path"), fs = require("fs"), ROOT = path.resolve(__dirname, "../..");
const E = require(ROOT + "/apps/shared/lessons/epiano.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const SR = 22050, hz = m => 440 * Math.pow(2, (m - 69) / 12);
function amp(y, f, a = 0, b = Math.min(y.length, SR * 0.5)) { let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * f * i / SR; re += y[i] * Math.cos(w); im += y[i] * Math.sin(w); } return Math.hypot(re, im) / (b - a); }
const rms = (y, a, b) => { let s = 0; for (let i = a; i < b; i++) s += y[i] * y[i]; return Math.sqrt(s / (b - a)); };
const R = (id, st, m, v) => E.render(id, Object.assign(E.defaults(id), st), m, v, SR);

for (const id of E.ORDER) {
  const y = R(id, {}, 60, 0.7);
  check(`${id}: finite and audible`, y.every(Number.isFinite) && rms(y, 0, SR / 4) > 0.01);
  check(`${id}: decays`, rms(y, y.length - Math.floor(SR / 4), y.length) < rms(y, 0, SR / 4) * 0.5);
  const d = E.defaults(id); check(`${id}: defaults in range`, Object.keys(d).every(k => { const c = E.range(id, k); return c[2] !== "k" || (d[k] >= c[3] && d[k] <= c[4]); }));
}
const h21 = y => amp(y, 2 * hz(60)) / amp(y, hz(60));
check("rhodes: harder = more 2nd harmonic (bark)", h21(R("rhodes", {}, 60, 1)) > h21(R("rhodes", {}, 60, 0.2)) * 1.5, h21(R("rhodes", {}, 60, 1)).toFixed(3) + " vs " + h21(R("rhodes", {}, 60, 0.2)).toFixed(3));
check("rhodes: tine near pickup centre = more 2nd harmonic", h21(R("rhodes", { voice: 1 }, 60, 0.7)) > h21(R("rhodes", { voice: 9 }, 60, 0.7)) * 1.5);
check("rhodes: tonebar sustain lengthens the note", rms(R("rhodes", { tbar: 10 }, 60, .7), SR, SR * 1.5) > rms(R("rhodes", { tbar: 0 }, 60, .7), SR, SR * 1.5) * 1.3);
check("wurli: harder = more 2nd harmonic", h21(R("wurli", {}, 60, 1)) > h21(R("wurli", {}, 60, 0.2)) * 1.3);
const ca = R("clav", {}, 48, .8), cb = R("clav", { pa: "B" }, 48, .8), db = R("clav", { pc: "D", pa: "B" }, 48, .8), da = R("clav", { pc: "D" }, 48, .8);
check("clav: out-of-phase pickups thin the fundamental", amp(db, hz(48)) < amp(da, hz(48)) * 0.6);
check("clav: upper and lower pickups differ", Math.abs(h21(ca) - h21(cb)) > 0.05 || Math.abs(amp(ca, hz(48)) - amp(cb, hz(48))) > amp(ca, hz(48)) * 0.2);
const cent = y => { let n = 0, d = 0; for (let k = 1; k <= 20; k++) { const a = amp(y, k * hz(48)); n += k * a; d += a; } return n / d; };
check("clav: Soft tab is darker than Treble", cent(R("clav", { treb: false, soft: true }, 48, .8)) < cent(ca) * 0.8);
check("clav: mute shortens", R("clav", { mute: 8 }, 48, .8).length < ca.length * 0.7);
// CP-70 stretched partials: the 7th partial sits above 7 f in the bass
const cp = R("cp70", { detune: 0 }, 36, .8), f0 = hz(36); let best = 0, bf = 0;
for (let f = 6.9 * f0; f < 7.9 * f0; f += 0.2) { const a = amp(cp, f, 0, SR); if (a > best) { best = a; bf = f; } }
check("cp70: overtones stretched (7th partial sharp; the 8th is not struck at 1/8)", bf > 7.05 * f0, (bf / f0).toFixed(3));
// translate
let t = E.translate(E.defaults("rhodes"), "rhodes", "suitcase");
check("translate rhodes -> suitcase: volume exact", t.notes.some(n => n.k === "vol" && n.kind === "exact"));
t = E.translate(Object.assign(E.defaults("clav"), { pc: "D" }), "clav", "wurli");
check("translate clav -> wurli: pickups lost", t.notes.some(n => n.k === "pa" && n.kind === "lost"));
t = E.translate(Object.assign(E.defaults("suitcase"), { vib: 8 }), "suitcase", "rhodes");
check("translate suitcase -> stage: tremolo lost", t.notes.some(n => n.k === "vib" && n.kind === "lost"));
t = E.translate(Object.assign(E.defaults("suitcase"), { vol: 3 }), "suitcase", "cp70");
check("translate keeps the range position", Math.abs(t.st.vol - 3) < 0.11 && t.notes.some(n => n.k === "vol" && n.kind === "approx"));
check("every model to every other gives notes, valid kinds", E.ORDER.every(a => E.ORDER.every(b => { const r = E.translate(E.defaults(a), a, b); return r.notes.length && r.notes.every(n => /^(exact|approx|lost)$/.test(n.kind)); })));
// panel layouts
global.FaithfulPanel = { L: {}, register(L) { this.L[L.id] = L; } };
for (const id of E.ORDER) {
  const f = ROOT + `/apps/shared/lessons/panels/ep-${id}.js`; check(`panel ep-${id} exists`, fs.existsSync(f)); if (!fs.existsSync(f)) continue;
  require(f); const L = FaithfulPanel.L["ep-" + id], miss = L.items.filter(i => i.k && !E.range(id, i.k)).map(i => i.k);
  const realKeys = E.keys(id).filter(k => E.range(id, k)[7] === "panel"), drawn = L.items.filter(i => i.k).map(i => i.k);
  check(`panel ep-${id}: bound keys in profile`, miss.length === 0, miss.join(","));
  check(`panel ep-${id}: every "on the panel" control drawn`, realKeys.every(k => drawn.includes(k)), realKeys.filter(k => !drawn.includes(k)).join(","));
}
const A = JSON.parse(fs.readFileSync(ROOT + "/apps/shared/data/epianos/assignments.json", "utf8"));
check("assignments: 2+ videos per page model, start keys valid", ["rhodes", "wurli", "clav", "cp70", "pianet"].every(m => A.videos.filter(v => v.model === m || (m === "rhodes" && v.model === "suitcase")).length >= 2) &&
  A.videos.every(v => /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url) && Object.keys(v.start).every(k => k === "model" || E.range(v.model, k)) && E.RIFFS[v.riff]));
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
