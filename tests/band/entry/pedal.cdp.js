// Chord Entry: the sustain pedal (CC 64). Key-ups do not damp while it is down; pedal up damps what is not held; the take still sees the key-up.
// Run from tests/band/lead, server on 8500:   node ../entry/pedal.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const midi = (s, d1, d2) => ev(`__entry.midi([${s}, ${d1}, ${d2}], performance.now()); 0`);
  const rel = () => ev(`window.__rel`);
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    await ev(`document.getElementById("ce-sound").checked = true; window.__rel = 0; var o = BandPlayer.release; BandPlayer.release = function(v){ window.__rel += (v || []).length; return o.apply(this, arguments); }; 0`);
    const settle = () => b.sleep(900);
    // no pedal: key-up damps
    await midi(0x90, 60, 90); await settle(); await midi(0x80, 60, 0); await settle(); assert.strictEqual(await rel(), 1, "key-up without the pedal damps");
    // pedal down: key-ups do not damp; pedal up damps both
    await ev(`window.__rel = 0`); await midi(0xB0, 64, 127);
    await midi(0x90, 62, 90); await midi(0x90, 65, 90); await settle(); await midi(0x80, 62, 0); await midi(0x80, 65, 0); await settle();
    assert.strictEqual(await rel(), 0, "pedal down: nothing damped");
    await midi(0xB0, 64, 63); await settle(); assert.strictEqual(await rel(), 2, "pedal up damps both");
    // a key still held at pedal up is not damped until its own key-up
    await ev(`window.__rel = 0`); await midi(0xB0, 64, 100); await midi(0x90, 67, 90); await settle(); await midi(0xB0, 64, 0); await settle();
    assert.strictEqual(await rel(), 0, "held key survives pedal up"); await midi(0x80, 67, 0); await settle(); assert.strictEqual(await rel(), 1);
    // the pedal never reaches the take: a half-pedal below 64 does not hold either
    await ev(`window.__rel = 0`); await midi(0xB0, 64, 40); await midi(0x90, 69, 90); await settle(); await midi(0x80, 69, 0); await settle(); assert.strictEqual(await rel(), 1);
    // the chord listener / take still get key-up with the pedal down (recorded length = key length)
    await ev(`document.getElementById("ce-type").checked = true; 0`);
    const n0 = await ev(`(__entry.grid() ? __entry.grid().count() : 0)`); await midi(0xB0, 64, 127);
    await ev(`(function(){ var t = performance.now(); [53, 57, 60, 63].forEach(function(m){ __entry.midi([0x90, m, 90], t); }); setTimeout(function(){ [53, 57, 60, 63].forEach(function(m){ __entry.midi([0x80, m, 0], performance.now()); }); }, 150); })()`);
    await b.sleep(700);
    assert.strictEqual(await ev(`(__entry.grid() ? __entry.grid().count() : 0)`), n0 + 1, "chord entered on key-up although the pedal is down");
    await midi(0xB0, 64, 0);
    const errs = b.errors.filter(e => !/supabase/i.test(e)); assert.deepStrictEqual(errs, [], errs.join(" | "));
    console.log("PEDAL OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
