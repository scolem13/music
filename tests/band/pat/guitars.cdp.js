// Every guitar sound, rendered offline in headless Chrome: each one plays, the new ones (nylon, and the clean and
// distorted amps on the jazz guitar's samples) sit within 2 dB of the steel-string acoustic in a strum, and the
// distorted amp sustains (the chord's body) where its source samples die away. Prints levels and render times.
// Needs the test server (see ../README.md): cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch();
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html");
    const r = await b.eval(`(async function(){
      function db(d, a, z){ var s = 0, n = 0; for (var i = Math.round(a * 44100); i < Math.min(d.length, Math.round(z * 44100)); i++){ s += d[i] * d[i]; n++; } return +(10 * Math.log10(s / n + 1e-12)).toFixed(1); }
      var ids = BandSounds.sounds("guitar").map(function (x){ return x.id; }), res = { ids: ids, strum: {}, ms: {}, drop: {}, menu: [].map.call(document.querySelectorAll("#bt-comp option"), function (o){ return o.value; }) };
      var parsed = TuneChart.parse('X:1\\nM:4/4\\nL:1/4\\nK:G\\n"G"z4|"D"z4|"Em"z4|"C"z4|]');
      for (const id of ids){
        var t0 = performance.now(), m = await BandPlayer.renderOffline({ parsed: parsed, tempo: 120, choruses: 2, countIn: 0, seed: 7, volumes: { bass: 0, comp: 1, drums: 0 }, instruments: ["ebass", id, "kit"],
          opts: { comp: "guitar", compSound: id, compRhythm: "strumEights", voicing: "open", feel: "straight", bassFeel: "roots", groove: "rock" } });
        res.strum[id] = db(m.mix.getChannelData(0), 0, m.mix.duration); res.ms[id] = Math.round(performance.now() - t0);
        var ctx = new OfflineAudioContext(1, 44100 * 3, 44100), bank = BandSounds.create(ctx); await bank.load([id]);
        [40, 47, 52].forEach(function (n, i){ bank.play(id, { midi: n, vel: 0.66, dur: 2.2 }, 0.05 + i * 0.004); });
        var d = (await ctx.startRendering()).getChannelData(0); res.drop[id] = +(db(d, 0.06, 0.4) - db(d, 0.8, 1.8)).toFixed(1);       // attack to sustain, in dB
      }
      return res; })()`);
    console.log("strum level (dB):", JSON.stringify(r.strum)); console.log("attack to sustain (dB):", JSON.stringify(r.drop)); console.log("render ms for 21 s:", JSON.stringify(r.ms));
    assert.deepStrictEqual(r.ids, ["guitar", "aguitar", "nguitar", "clguitar", "odguitar", "cguitar", "dguitar"]);
    r.ids.forEach(id => { assert(r.strum[id] > -40, id + " is heard"); assert(r.menu.includes(id), id + " is in the Comping menu"); });
    ["nguitar", "clguitar", "odguitar"].forEach(id => assert(Math.abs(r.strum[id] - r.strum.aguitar) <= 2, id + " level " + r.strum[id] + " against steel " + r.strum.aguitar));
    assert(r.drop.odguitar < 6 && r.drop.guitar > 7, "the distorted amp holds the chord: " + r.drop.odguitar + " dB against " + r.drop.guitar);
    // the amp's stages are sliders in the Mixer's tone panel, live and remembered
    const amp = await b.eval(`(async function(){
      function $(id){ return document.getElementById(id); }
      function set(id, v, ev){ $(id).value = v; $(id).dispatchEvent(new Event(ev || "change", { bubbles: true })); }
      function db(d, a, z){ var s = 0, n = 0; for (var i = Math.round(a * 44100); i < Math.round(z * 44100); i++){ s += d[i] * d[i]; n++; } return 10 * Math.log10(s / n + 1e-12); }
      async function drop(){ var ctx = new OfflineAudioContext(1, 44100 * 3, 44100), bank = BandSounds.create(ctx); await bank.load(["odguitar"]);
        [40, 47, 52].forEach(function (n, i){ bank.play("odguitar", { midi: n, vel: 0.66, dur: 2.2 }, 0.05 + i * 0.004); });
        var d = (await ctx.startRendering()).getChannelData(0); return +(db(d, 0.06, 0.4) - db(d, 0.8, 1.8)).toFixed(1); }
      var res = {}; localStorage.removeItem("btAmp");
      res.jazzAmpHidden = (set("bt-comp", "guitar"), set("bt-eq-inst", "guitar"), $("bt-amp").hidden);
      set("bt-comp", "odguitar"); set("bt-eq-inst", "odguitar");
      res.shown = !$("bt-amp").hidden; res.stages = [].map.call(document.querySelectorAll("#bt-amp-stages strong"), function (x){ return x.textContent; });
      res.hard = await drop();
      set("bt-amp-2-level", -20, "input"); set("bt-amp-3-drive", 20, "input");                    // the amp barely driven
      res.chain = BandSounds.getAmp("odguitar"); res.saved = JSON.parse(localStorage.getItem("btAmp")).odguitar; res.soft = await drop();
      $("bt-amp-reset").click(); res.back = BandSounds.getAmp("odguitar"); res.after = localStorage.getItem("btAmp"); res.readout = $("bt-amp-stages").querySelector("output").textContent;
      return res; })()`);
    console.log("amp stages:", amp.stages.join(" | ")); console.log("attack to sustain, driven hard", amp.hard, "dB; barely driven", amp.soft, "dB");
    assert(amp.jazzAmpHidden && amp.shown && amp.stages.length === 10 && /Drive/.test(amp.stages[3]) && /Output level/.test(amp.stages[9]));
    assert(Math.abs(amp.chain[2].level - 0.1) < 0.001 && amp.chain[3].drive < 2 && amp.chain[3].drive > 1, JSON.stringify(amp.chain.slice(2, 4))); assert.deepStrictEqual(amp.saved, amp.chain);
    assert(amp.soft > amp.hard + 4, "less drive, less sustain"); assert.strictEqual(amp.back[3].drive, 16); assert(!amp.after || !JSON.parse(amp.after).odguitar); assert(/Hz/.test(amp.readout));
    console.log("GUITARS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
