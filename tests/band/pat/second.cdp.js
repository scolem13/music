// The Backing Track page: a second chord instrument and the five-band Tone (EQ), in headless Chrome.
// Needs the test server (see ../README.md): cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch();
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html");
    const r = await b.eval(`(async function(){
      function $(id){ return document.getElementById(id); }
      function set(id, v, ev){ $(id).value = v; $(id).dispatchEvent(new Event(ev || "change", { bubbles: true })); }
      function db(d){ var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return +(10 * Math.log10(s / d.length + 1e-12)).toFixed(1); }
      var res = {};
      localStorage.removeItem("btEQ");
      res.none = { rhythmHidden: $("bt-second-rhythm-f").hidden, faderHidden: $("bt-vol-comp2").parentNode.hidden, eqInsts: [].map.call($("bt-eq-inst").options, function (o){ return o.value; }) };
      set("bt-second", "guitar");
      res.swing = { rhythm: $("bt-second-rhythm").value, voicing: $("bt-second-voicing").value, rhythmHidden: $("bt-second-rhythm-f").hidden, faderHidden: $("bt-vol-comp2").parentNode.hidden,
                    eqInsts: [].map.call($("bt-eq-inst").options, function (o){ return o.value; }), label: $("bt-vol-comp2-label").textContent };
      set("bt-style", "bossa"); $("bt-second-suggest").click();
      res.bossa = { rhythm: $("bt-second-rhythm").value, voicing: $("bt-second-voicing").value, second: $("bt-second").value };
      // the EQ: band 5 of the jazz guitar becomes a high cut at about 300 Hz, band 3 a narrow dip
      set("bt-eq-inst", "guitar"); set("bt-eq-t4", "lowpass"); set("bt-eq-f4", 400, "input"); set("bt-eq-g2", -6, "input"); set("bt-eq-q2", 80, "input");
      res.eq = BandSounds.getEQ("guitar"); res.saved = JSON.parse(localStorage.getItem("btEQ")).guitar; res.gainOff = $("bt-eq-g4").disabled; res.readout = $("bt-eq-fo4").textContent;
      async function chord(){ var ctx = new OfflineAudioContext(1, 44100 * 2, 44100), bank = BandSounds.create(ctx); await bank.load(["guitar"]);
        [52, 59, 64, 68, 71, 76].forEach(function (m, i){ bank.play("guitar", { midi: m, vel: 0.7, dur: 1.5 }, 0.05 + i * 0.004); }); return db((await ctx.startRendering()).getChannelData(0)); }
      res.cut = await chord(); $("bt-eq-reset").click(); res.flat = await chord(); res.afterReset = localStorage.getItem("btEQ");
      // the band with a second player: its stem sounds, and the first three are the same audio as without it
      var parsed = TuneChart.parse('X:1\\nM:4/4\\nL:1/4\\nK:G\\n"G"z4|"C"z4|"G"z4|"D"z4|]'), o = { comp: "piano", compSound: "piano", compRhythm: "quarters", voicing: "standard", feel: "straight", bassFeel: "roots", groove: "rock" };
      var cfg = { parsed: parsed, tempo: 120, choruses: 1, countIn: 0, seed: 5, stems: true, instruments: ["bass", "piano", "kit"] };
      var one = await BandPlayer.renderOffline(Object.assign({}, cfg, { opts: o })), two = await BandPlayer.renderOffline(Object.assign({}, cfg, { opts: Object.assign({}, o, { second: { comp: "guitar", compSound: "nguitar", compRhythm: "arp2", voicing: "triad3" } }) }));
      res.stems = { one: Object.keys(one.stems), two: Object.keys(two.stems), comp2: db(two.stems.comp2.getChannelData(0)), comp: [db(one.stems.comp.getChannelData(0)), db(two.stems.comp.getChannelData(0))], bass: [db(one.stems.bass.getChannelData(0)), db(two.stems.bass.getChannelData(0))] };
      return res; })()`);
    console.log(JSON.stringify(r.swing), JSON.stringify(r.bossa)); console.log("high cut:", r.cut, "dB against flat", r.flat, "dB;", JSON.stringify(r.stems));
    assert(r.none.rhythmHidden && r.none.faderHidden && r.none.eqInsts.join() === "bass,piano,kit", JSON.stringify(r.none));
    assert.deepStrictEqual([r.swing.rhythm, r.swing.voicing, r.swing.rhythmHidden, r.swing.faderHidden], ["four", "shell3", false, false]); assert.strictEqual(r.swing.eqInsts.join(), "bass,piano,guitar,kit");
    assert.deepStrictEqual([r.bossa.second, r.bossa.rhythm, r.bossa.voicing], ["guitar", "bossa", "shell3"], "the choice survives a change of style; Suggest follows the style");
    assert(r.eq[4].type === "lowpass" && r.eq[4].f > 250 && r.eq[4].f < 350 && r.eq[2].gain === -6 && r.eq[2].q > 4 && r.gainOff, JSON.stringify(r.eq)); assert.deepStrictEqual(r.saved, r.eq); assert(/Hz/.test(r.readout));
    assert(r.cut < r.flat - 2, "the high cut is heard"); assert(!r.afterReset || !JSON.parse(r.afterReset).guitar, "Flat forgets it");
    assert.deepStrictEqual(r.stems.one, ["bass", "comp", "drums"]); assert.deepStrictEqual(r.stems.two, ["bass", "comp", "comp2", "drums"]); assert(r.stems.comp2 > -45);
    assert(r.stems.comp[0] === r.stems.comp[1] && r.stems.bass[0] === r.stems.bass[1], "the first player and the bass are unchanged");
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("SECOND AND EQ UI OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
