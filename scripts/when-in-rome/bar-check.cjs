// bar-check.cjs — the bar lengths of an ABC score, voice by voice, read by abcjs (inline [M:] changes followed).
// Bars next to a repeat sign or a double bar may be short (a section's upbeat and the bar it completes), as may each voice's first and last.
// barCheck(abc) -> { bars, bad } or { error }. Used by bundle.mjs (a piece over the limit is left out) and tests/works/score-bundles.test.js.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../apps/shared/abcjs-basic.js"), "utf8"), ctx);
const LIMIT = 0.02;   // share of a piece's bars that may be off-length (at least 1)
function barCheck(abc) {
  let t; try { t = ctx.ABCJS.parseOnly(abc)[0]; } catch (e) { return { error: String(e) }; }
  const mf = t.getMeterFraction(), first = mf.num / mf.den, V = {};
  t.lines.forEach(line => (line.staff || []).forEach((st, si) => st.voices.forEach((v, vi) => {
    const s = V[si + "." + vi] = V[si + "." + vi] || { want: first, lens: [] };
    let cur = 0, tup = 1;
    for (const e of v) {
      if (e.el_type === "note") { if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier; cur += (e.duration || 0) * tup; if (e.endTriplet) tup = 1; }
      else if (e.el_type === "meter" && e.value && e.value[0]) s.want = e.value[0].num / e.value[0].den;
      else if (e.el_type === "bar") { s.lens.push([cur, e.type, s.want]); cur = 0; }
    }
  })));
  let bad = 0, bars = 0;
  const edge = x => /repeat|dbl|thin_thin|thick/.test(x || "");
  for (const { lens } of Object.values(V)) lens.forEach(([len, type, want], i) => {
    if (i === 0 || i === lens.length - 1 || edge(type) || edge(lens[i - 1][1])) return;
    bars++; if (Math.abs(len - want) > 1e-6) bad++;
  });
  return { bars, bad, ok: bad <= Math.max(1, bars * LIMIT) };
}
module.exports = { barCheck, LIMIT };
