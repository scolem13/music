// The tuner's display modes without a browser:  node tests/lessons/strobe-view.test.js   (NEG=1 must fail)
// Each mode draws on a recording 2d context: it must draw something when running, say "idle" when stopped, and never throw.
const SV = require("../../apps/shared/strobe-view.js");
let fails = 0; const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
function ctx() { const log = []; return new Proxy({ log }, { get(t, k) { if (k === "log") return log; if (k === "measureText") return () => ({ width: 10 }); return (...a) => { log.push([k, ...a]); }; }, set(t, k, v) { log.push(["set:" + k, v]); return true; } }); }
const C = { ink: "#222", ink2: "#777", line: "#ccc", acc: "#3fc2b4", acc2: "#1f8f84", bg: "#fff" };
const band = (k, cents, alive = true) => ({ k, f: 440 * k, mag: alive ? 0.2 : 0, phase: 1, driftHz: 0, cents, alive });
const bands = [band(1, 3.2), band(2, 1), band(3, -2, false)];
check("fundCents: the fundamental when alive", SV.fundCents(bands) === 3.2);
check("fundCents: strongest live partial when the fundamental is dead", SV.fundCents([band(1, 9, false), { ...band(2, -4), mag: .5 }, band(3, 7)]) === -4);
check("fundCents: null when nothing is alive / no bands", SV.fundCents([band(1, 0, false)]) === null && SV.fundCents([]) === null);
check("six modes, every one with a height entry", SV.MODES.length === 6 && SV.MODES.every(m => m[0] in SV.HEIGHTS));
const T = SV.tracker(); let st = T({ running: true, bands }); check("tracker: cents and a history point", st.cents === 3.2 && st.hist.length === 1);
st = T({ running: true, bands: [band(1, 13.2)] }); check("tracker: cents smoothed toward the new reading", st.cents > 3.2 && st.cents < 13.2 && st.hist.length === 2);
st = T({ running: true, bands: [] }); check("tracker: no pitch gives null and a gap", st.cents === null && st.hist[2][1] === null);
SV.MODES.forEach(([m]) => {
  const H = SV.HEIGHTS[m] || 200, tr = SV.tracker(); tr({ running: true, bands });
  const run = tr({ mode: m, running: true, bands, N: 3, fref: 440, a4: 440, hz: 441, idle: "IDLE" }), g = ctx();
  let ok = true; try { SV.draw(g, 300, H, run, C); } catch (e) { ok = false; console.log(e.stack); }
  check(m + ": draws when running", ok && g.log.length > 5, g.log.length + " calls");
  const g2 = ctx(); try { SV.draw(g2, 300, H, { mode: m, running: false, bands: [], N: 3, fref: 440, a4: 440, idle: "IDLE" }, C); } catch (e) { ok = false; }
  check(m + ": stopped shows the idle text, no throw", ok && g2.log.some(c => c[0] === "fillText" && /IDLE/.test(c[1])));
  const g3 = ctx(); try { SV.draw(g3, 300, H, { mode: m, running: true, bands: [], N: 3, fref: 440, a4: 440, hz: 0, cents: null, hist: [], now: 0 }, C); } catch (e) { ok = false; }
  check(m + ": running with no pitch does not throw", ok);
});
const gb = ctx(); SV.draw(gb, 300, 52, { mode: "bar", running: true, cents: 3.2, bands }, C);
check("bar: prints the signed cents", gb.log.some(c => c[0] === "fillText" && /\+3\.2/.test(c[1])));
const gl = ctx(); SV.draw(gl, 300, 64, { mode: "light", running: true, cents: -20, bands }, C);
check("light: flat lamp lit, in a warning colour", gl.log.some(c => c[0] === "set:fillStyle" && /#c8443a/.test(c[1])));
if (process.env.NEG) { check("NEG: a bar with the marker removed", false); }
console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
