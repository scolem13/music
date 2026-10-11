// The Rhodes and Wurlitzer electric pianos (the plain electric piano's samples through an amp each), in headless Chrome:
// both play at the plain one's level, the Wurlitzer is thinner in the bass, the tremolo moves the level, and the
// Mixer's tone panel follows the comping sound and lists the amp. Needs the test server: cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch();
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html");
    const r = await b.eval(`(async function(){
      function $(id){ return document.getElementById(id); }
      function set(id, v, ev){ $(id).value = v; $(id).dispatchEvent(new Event(ev || "change", { bubbles: true })); }
      function db(d, a, z){ var s = 0, n = 0; for (var i = Math.round(a * 44100); i < Math.min(d.length, Math.round(z * 44100)); i++){ s += d[i] * d[i]; n++; } return +(10 * Math.log10(s / n + 1e-12)).toFixed(1); }
      function low(d){ var y = 0, lo = 0, all = 0, k = 1 - Math.exp(-2 * Math.PI * 200 / 44100); for (var i = 0; i < d.length; i++){ y += k * (d[i] - y); lo += y * y; all += d[i] * d[i]; } return Math.round(100 * lo / all); }
      var res = { level: {}, low: {}, wobble: {} }; localStorage.removeItem("btAmp"); localStorage.removeItem("btEQ");
      var parsed = TuneChart.parse('X:1\\nM:4/4\\nL:1/4\\nK:C\\n"C"z4|"Am"z4|"F"z4|"G"z4|]');
      for (const id of ["epiano", "rhodes", "wurli"]){
        var m = await BandPlayer.renderOffline({ parsed: parsed, tempo: 100, choruses: 2, countIn: 0, seed: 7, volumes: { bass: 0, comp: 1, drums: 0 }, instruments: ["ebass", id, "kit"],
          opts: { comp: "piano", compSound: id, compRhythm: "quarters", voicing: "standard", feel: "straight", bassFeel: "roots", groove: "rock" } });
        var d = m.mix.getChannelData(0); res.level[id] = db(d, 0, m.mix.duration); res.low[id] = low(d);
      }
      // one held chord: how far the level swings from one 50 ms window to the next, tremolo as designed and switched off
      async function wobble(id){ var ctx = new OfflineAudioContext(1, 44100 * 2, 44100), bank = BandSounds.create(ctx); await bank.load([id]);
        [60, 64, 67].forEach(function (n){ bank.play(id, { midi: n, vel: 0.7, dur: 1.9 }, 0.02); });
        var d = (await ctx.startRendering()).getChannelData(0), v = []; for (var t = 0.3; t < 1.3; t += 0.05) v.push(db(d, t, t + 0.05));
        var up = 0; for (var i = 1; i < v.length; i++) if (v[i] > v[i - 1] + 0.3) up++; return up; }                  // a decaying note never gets louder; a tremolo does
      res.wobble.on = await wobble("wurli"); var c = BandSounds.getAmp("wurli"); c[6].depth = 0; BandSounds.setAmp("wurli", c); res.wobble.off = await wobble("wurli"); BandSounds.setAmp("wurli", null);
      // the page
      res.menu = [].map.call($("bt-comp").options, function (o){ return o.value; });
      set("bt-comp", "guitar"); res.jazz = { inst: $("bt-eq-inst").value, ampHidden: $("bt-amp").hidden, noteHidden: $("bt-amp-none").hidden, note: $("bt-amp-none").textContent };
      set("bt-eq-g2", -3, "input");                                           // the jazz guitar now has an EQ of its own, and stays in the list
      set("bt-comp", "wurli"); res.wurli = { inst: $("bt-eq-inst").value, ampHidden: $("bt-amp").hidden, noteHidden: $("bt-amp-none").hidden, stages: [].map.call(document.querySelectorAll("#bt-amp-stages strong"), function (x){ return x.textContent; }), label: $("bt-vol-comp-label").textContent };
      set("bt-amp-6-depth", 80, "input"); set("bt-amp-6-trem", 30, "input"); res.trem = BandSounds.getAmp("wurli")[6];
      $("bt-amp-reset").click(); $("bt-eq-reset-all").click();
      return res; })()`);
    console.log("level (dB):", JSON.stringify(r.level), " share below 200 Hz (%):", JSON.stringify(r.low), " tremolo:", JSON.stringify(r.wobble)); console.log(r.wurli.stages.join(" | "));
    ["rhodes", "wurli"].forEach(id => assert(Math.abs(r.level[id] - r.level.epiano) <= 2, id + " level " + r.level[id] + " against " + r.level.epiano));
    assert(r.low.wurli < r.low.rhodes - 5, "the Wurlitzer is thinner below 200 Hz"); assert(r.wobble.on >= 3 && r.wobble.off === 0, "the tremolo is heard, and can be switched off");
    assert(["epiano", "rhodes", "wurli"].every(id => r.menu.includes(id)));
    assert(r.jazz.inst === "guitar" && r.jazz.ampHidden && !r.jazz.noteHidden && /Rhodes/.test(r.jazz.note) && /Electric guitar \(clean\)/.test(r.jazz.note), JSON.stringify(r.jazz));
    assert(r.wurli.inst === "wurli" && !r.wurli.ampHidden && r.wurli.noteHidden && r.wurli.stages.length === 8 && /Tremolo/.test(r.wurli.stages[6]), "the panel follows the comping sound: " + JSON.stringify(r.wurli));
    assert.deepStrictEqual([r.trem.trem, r.trem.depth], [3, 0.8]);
    console.log("KEYS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
