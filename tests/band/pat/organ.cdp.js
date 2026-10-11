// The tonewheel organ, rendered offline in headless Chrome: tonebars put the right pitches at the right levels (3 dB a step,
// tempered fifths, foldback at the top), the chorus, the swell pedal and the rotary speaker do what they say, the band's
// organist works the pedal and the switch while it plays, and the page's panel drives all of it.
// Needs the test server (see ../README.md): cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch();
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html");
    const r = await b.eval(`(async function(){
      function $(id){ return document.getElementById(id); }
      function set(id, v, ev){ $(id).value = v; $(id).dispatchEvent(new Event(ev || "change", { bubbles: true })); }
      var SR = 44100, S = BandSounds, res = {};
      localStorage.removeItem("btOrgan"); localStorage.removeItem("btAmp"); localStorage.removeItem("btEQ");
      function db(d, a, z){ var s = 0, n = 0; for (var i = Math.round(a * SR); i < Math.min(d.length, Math.round(z * SR)); i++){ s += d[i] * d[i]; n++; } return 10 * Math.log10(s / n + 1e-12); }
      function tone(d, hz, a, z){ var re = 0, im = 0, n = 0; for (var i = Math.round(a * SR); i < Math.round(z * SR); i++){ var w = 2 * Math.PI * hz * i / SR; re += d[i] * Math.cos(w); im += d[i] * Math.sin(w); n++; } return +(20 * Math.log10(2 * Math.sqrt(re * re + im * im) / n + 1e-9)).toFixed(1); }
      // how many times the level rises by more than half a dB from one 20 ms window to the next
      function swings(d, a, z){ var v = [], up = 0, rising = false; for (var t = a; t < z; t += 0.02) v.push(db(d, t, t + 0.02)); for (var i = 1; i < v.length; i++){ var r2 = v[i] > v[i - 1] + 0.15; if (r2 && !rising) up++; rising = r2; } return up; }
      // the bare organ: no chorus, no drive, the speaker stopped
      function bare(over){ var c = S.getAmp("hammond"); c[0].mix = 0; c[3].drive = 0.2; c[4].horn = 0; c[4].drum = 0; c[4].doppler = 0; if (over) over(c); S.setAmp("hammond", c); }
      async function play(notes, secs, ctl){ var ctx = new OfflineAudioContext(2, Math.round(SR * (secs || 1.2)), SR), bank = S.create(ctx); await bank.load(["hammond"]);
        notes.forEach(function (m){ bank.play("hammond", { midi: m, vel: 0.7, dur: (secs || 1.2) - 0.1 }, 0.02); }); if (ctl) ctl(bank);
        var buf = await ctx.startRendering(); return [buf.getChannelData(0), buf.getChannelData(1)]; }
      bare(); S.setControl("hammond", "leslie", "stop"); S.setControl("hammond", "swell", 1);
      S.setTonebars("hammond", "008000000"); var d = (await play([69]))[0]; res.eight = [tone(d, 440, 0.2, 1), tone(d, 880, 0.2, 1), tone(d, 220, 0.2, 1)];
      S.setTonebars("hammond", "006000000"); res.six = tone((await play([69]))[0], 440, 0.2, 1);
      S.setTonebars("hammond", "888888888"); d = (await play([69]))[0];
      res.full = [220, 659.48, 440, 880, 1318.96, 1760, 2218.01, 2637.93, 3520].map(function (hz){ return tone(d, hz, 0.2, 1); }); res.pureThird = tone(d, 2200, 0.2, 1);
      S.setTonebars("hammond", "000000008"); d = (await play([96]))[0]; res.top = [tone(d, 4186.01, 0.2, 1), tone(d, 16744, 0.2, 1)];       // C7's 1' comes from two octaves down
      S.setTonebars("hammond", "008000000");
      // key click: with it, the first 12 ms are louder than without
      S.setControl("hammond", "click", 1); d = (await play([69]))[0]; var withClick = db(d, 0.02, 0.032); S.setControl("hammond", "click", 0); var plain = (await play([69]))[0]; res.click = +(withClick - db(plain, 0.02, 0.032)).toFixed(1); d = plain;
      // the chorus makes one steady note waver
      res.still = swings((await play([69], 2))[0], 0.3, 1.9); bare(function (c){ c[0].mix = 0.5; }); res.chorus = swings((await play([69], 2))[0], 0.3, 1.9); bare();
      // the swell pedal
      S.setControl("hammond", "swell", 0); res.closed = +(db((await play([69]))[0], 0.3, 1) - db(d, 0.3, 1)).toFixed(1); S.setControl("hammond", "swell", 1);
      // the rotary speaker, on one high note (the horn alone): how strongly the level moves at the fast speed and at the slow one
      function moves(d, hz, a, z){ var re = 0, im = 0, n = 0, mean = 0, v = []; for (var t = a; t < z; t += 0.01) v.push(Math.pow(10, db(d, t, t + 0.01) / 20)); v.forEach(function (x){ mean += x / v.length; });
        v.forEach(function (x, i){ var w = 2 * Math.PI * hz * i * 0.01; re += (x - mean) * Math.cos(w); im += (x - mean) * Math.sin(w); n++; }); return +(20 * Math.log10(2 * Math.sqrt(re * re + im * im) / n / mean + 1e-9)).toFixed(1); }
      bare(function (c){ c[4].horn = 0.5; c[4].drum = 0.3; c[4].doppler = 0.25; });
      S.setControl("hammond", "leslie", "slow"); var sl = await play([84], 6); res.slow = [moves(sl[0], 0.8, 1, 5.8), moves(sl[0], 6.67, 1, 5.8)];
      S.setControl("hammond", "leslie", "fast"); var fa = await play([84], 6); res.fast = [moves(fa[0], 0.8, 1, 5.8), moves(fa[0], 6.67, 1, 5.8)];
      res.sides = +(moves(fa[0], 6.67, 1, 5.8) - moves(fa[0].map(function (x, i){ return x + fa[1][i]; }), 6.67, 1, 5.8)).toFixed(1);       // summed to mono the swing largely cancels
      // a change of speed takes time: just after the switch the horn is not yet turning at the fast speed
      S.setControl("hammond", "leslie", "slow"); var ch = await play([84], 6, function (bank){ bank.control("hammond", "leslie", "fast", 1); }); res.ramp = [moves(ch[0], 6.67, 1, 1.6), moves(ch[0], 6.67, 4, 5.8)];
      S.setAmp("hammond", null); S.setTonebars("hammond", null);
      // the band: the organist's pedal and switch, and the level beside the electric piano
      var parsed = TuneChart.parse('X:1\\nM:4/4\\nL:1/4\\nK:C\\n"C"z4|"C"z4|"F"z4|"F"z4|"C"z4|"Am"z4|"F"z4|"G"z4|]'), calls = [], mk = S.create;
      S.create = function (ctx){ var bank = mk(ctx), c0 = bank.control; bank.control = function (inst, name, v, when, glide){ calls.push([name, v, +when.toFixed(2)]); return c0.apply(bank, arguments); }; return bank; };
      async function band(id, organ){ var m = await BandPlayer.renderOffline({ parsed: parsed, tempo: 120, choruses: 2, countIn: 0, seed: 7, volumes: { bass: 0, comp: 1, drums: 0 }, instruments: ["ebass", id, "kit"],
        opts: { comp: "piano", compSound: id, compRhythm: "pad", voicing: "standard", feel: "straight", bassFeel: "roots", groove: "rock", variation: 0.6, organ: organ } }); return +db(m.mix.getChannelData(0), 0, m.mix.duration).toFixed(1); }
      res.level = { hammond: await band("hammond"), epiano: (calls.length = calls.length, await band("epiano")) };
      res.calls = { swell: calls.filter(function (c){ return c[0] === "swell"; }).length, fast: calls.filter(function (c){ return c[1] === "fast"; }).length, slow: calls.filter(function (c){ return c[1] === "slow"; }).length };
      calls.length = 0; await band("hammond", { leslie: "stop", swell: 0.5 }); res.byHand = calls.map(function (c){ return c[0] + "=" + c[1]; }).filter(function (x, i, a){ return a.indexOf(x) === i; });
      S.create = mk;
      // the page
      res.hiddenFirst = $("bt-organ").hidden; set("bt-comp", "hammond");
      res.page = { shown: !$("bt-organ").hidden, bars: S.getTonebars("hammond").join(""), amp: [].map.call(document.querySelectorAll("#bt-amp-stages strong"), function (x){ return x.textContent; }), eqInst: $("bt-eq-inst").value };
      set("bt-tb-3", 8, "input"); res.page.moved = S.getTonebars("hammond").join(""); res.page.preset = $("bt-tb-preset").value;
      set("bt-tb-preset", "888888888"); res.page.full = S.getTonebars("hammond").join(""); res.page.out = $("bt-tb-o8").textContent;
      set("bt-leslie", "fast"); set("bt-swell", "hand"); set("bt-swell-pos", 40, "input");
      res.page.ctl = [S.getControl("hammond", "leslie"), S.getControl("hammond", "swell")]; res.page.saved = JSON.parse(localStorage.getItem("btOrgan"));
      set("bt-amp-0-mix", 1, "input"); res.page.mix = S.getAmp("hammond")[0].mix;
      $("bt-amp-reset").click(); set("bt-leslie", "auto"); set("bt-swell", "auto"); set("bt-tb-preset", "888000000"); set("bt-comp", "piano"); res.hiddenAgain = $("bt-organ").hidden;
      localStorage.removeItem("btOrgan");
      return res; })()`);
    console.log(JSON.stringify(r, null, 0));
    assert(r.eight[0] > r.eight[1] + 30 && r.eight[0] > r.eight[2] + 30, "the 8' alone is the note alone"); assert(Math.abs(r.eight[0] - r.six - 6) < 0.6, "two steps of a tonebar are 6 dB: " + r.eight[0] + " " + r.six);
    assert(Math.max(...r.full) - Math.min(...r.full) < 3, "all nine pitches of a full organ, each at about one level: " + r.full); assert(r.full[6] > r.pureThird + 15, "the 1 3/5' is the tempered third, not the pure fifth harmonic");
    assert(r.top[0] > r.top[1] + 30, "foldback: " + r.top); assert(r.click > 1, "key click " + r.click);
    assert(r.still <= 1 && r.chorus >= 8, "chorus " + r.still + " " + r.chorus); assert(r.closed < -12 && r.closed > -26, "pedal closed " + r.closed);
    assert(r.slow[0] > r.slow[1] + 10 && r.fast[1] > r.fast[0] + 10, "slow " + r.slow + " fast " + r.fast); assert(r.sides > 6, "the two sides move against each other " + r.sides); assert(r.ramp[1] > r.ramp[0] + 3, "spins up " + r.ramp);
    assert(r.level.hammond > r.level.epiano && r.level.hammond < r.level.epiano + 7, "level " + JSON.stringify(r.level)); assert(r.calls.swell >= 16 && r.calls.fast >= 1 && r.calls.slow >= 1, JSON.stringify(r.calls));
    assert.deepStrictEqual(r.byHand.sort(), ["leslie=stop", "swell=0.5"]);
    assert(r.hiddenFirst && r.page.shown && r.hiddenAgain && r.page.bars === "888000000" && r.page.eqInst === "hammond" && r.page.amp.length === 6 && /Rotary speaker/.test(r.page.amp[4]), JSON.stringify(r.page));
    assert.deepStrictEqual([r.page.moved, r.page.preset, r.page.full, r.page.out, r.page.mix], ["888800000", "888800000", "888888888", "8", 1]); assert.deepStrictEqual(r.page.ctl, ["fast", 0.4]);
    assert.deepStrictEqual([r.page.saved.bars, r.page.saved.leslie, r.page.saved.swell, r.page.saved.pos], ["888888888", "fast", "hand", "40"]);
    console.log("ORGAN OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
