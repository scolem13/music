// In-page test hooks, driven by run.mjs over CDP (or by hand from the console).
(function () {
  var ABC = 'X:1\nT:Blues\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | "Cm7"z2 "F7"z2 | "Bb7"z4 | "Bdim7"z4 | "F7"z4 | "Am7"z2 "D7"z2 | "Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]';
  var parsed = TuneChart.parse(ABC);
  var sleep = function (ms){ return new Promise(function (r){ setTimeout(r, ms); }); };
  function stubs(){ return { harmony: !!BandHarmony.stub, bass: !!(window.BandBass && BandBass.stub), comp: !!(window.BandComp && BandComp.stub), drums: !!(window.BandDrums && BandDrums.stub) }; }

  // ---- live transport test: callbacks, tempo change, stop, restart ----
  async function testLive(){
    var log = [], events = [], states = [], progress = [], player;
    function now(){ var c = player.context(); return c ? c.currentTime : -1; }
    player = BandPlayer.create({ parsed: parsed, tempo: 120, countIn: 1, choruses: 0, seed: 7, opts: { bassFeel: "walk" },
      onState: function (s){ states.push(s); },
      onLoadProgress: function (d, t){ progress.push([d, t]); },
      onBar: function (i){ log.push({ k: "bar", t: now(), bar: i.bar, index: i.index, chorus: i.chorus, src: i.src, beats: i.beats, countIn: i.countIn }); },
      onBeat: function (i){ log.push({ k: "beat", t: now(), bar: i.bar, beat: i.beat, countIn: i.countIn }); },
      onEvent: function (e){ events.push({ part: e.part, time: e.time, pos: e.pos, piece: e.piece, L: e.L }); } });
    var t0 = performance.now();
    await player.play();
    var loadMs = performance.now() - t0, ctx = player.context();
    await sleep(5200);
    var tempoAt = ctx.currentTime; player.setTempo(180);
    await sleep(4200);
    player.setVolume("comp", 0.5); player.setTranspose(2); player.setOpts({ bassFeel: "two" });
    await sleep(1200);
    var stopAt = ctx.currentTime; player.stop();
    var playingAfterStop = player.isPlaying();
    await sleep(400);
    var mark = log.length, evMark = events.length;
    await player.play();
    await sleep(2600);
    player.stop();
    return { stubs: stubs(), loadMs: Math.round(loadMs), states: states, progressFirst: progress[0], progressLast: progress[progress.length - 1],
      sampleRate: ctx.sampleRate, outputLatency: ctx.outputLatency || 0, tempoAt: tempoAt, stopAt: stopAt, playingAfterStop: playingAfterStop,
      log: log, mark: mark, events: events, evMark: evMark };
  }

  // ---- finite run: N choruses then the ending and onEnd ----
  async function testEnding(){
    var bars = [], ended = false, states = [], player = BandPlayer.create({ parsed: parsed, tempo: 300, countIn: 0, choruses: 1, seed: 3,
      onState: function (s){ states.push(s); }, onBar: function (i){ bars.push(i.ending ? "end" : i.index); }, onEnd: function (){ ended = true; } });
    await player.play();
    for (var i = 0; i < 160 && !ended; i++) await sleep(100);
    return { bars: bars, ended: ended, states: states, playing: player.isPlaying() };
  }

  // ---- offline render → float WAVs uploaded to the harness server ----
  function wav(buf){
    var ch = buf.numberOfChannels, n = buf.length, ab = new ArrayBuffer(44 + n * ch * 4), v = new DataView(ab), o = 44, i, c;
    function str(p, s){ for (var k = 0; k < s.length; k++) v.setUint8(p + k, s.charCodeAt(k)); }
    str(0, "RIFF"); v.setUint32(4, 36 + n * ch * 4, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 3, true); v.setUint16(22, ch, true); v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 4, true);
    v.setUint16(32, ch * 4, true); v.setUint16(34, 32, true); str(36, "data"); v.setUint32(40, n * ch * 4, true);
    var data = []; for (c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    for (i = 0; i < n; i++) for (c = 0; c < ch; c++){ v.setFloat32(o, data[c][i], true); o += 4; }
    return new Blob([ab], { type: "audio/wav" });
  }
  function peak(buf){ var p = 0; for (var c = 0; c < buf.numberOfChannels; c++){ var d = buf.getChannelData(c); for (var i = 0; i < d.length; i++){ var a = Math.abs(d[i]); if (a > p) p = a; } } return p; }
  function put(name, body){ return fetch("/__harness/upload?name=" + encodeURIComponent(name), { method: "POST", body: body }); }
  async function render(o){
    o = o || {}; var events = [], t0 = performance.now(), tag = o.tag || "render";
    var r = await BandPlayer.renderOffline({ parsed: parsed, tempo: o.tempo || 120, transpose: o.transpose || 0, choruses: o.choruses || 2,
      countIn: o.countIn == null ? 1 : o.countIn, opts: o.opts || { bassFeel: "walk" }, volumes: o.volumes, seed: o.seed == null ? 11 : o.seed,
      humanize: o.humanize, stems: o.stems !== false,
      onEvent: function (e){ events.push({ part: e.part, time: e.time, L: e.L, pos: e.pos, vel: e.vel, piece: e.piece, midi: e.midi, midis: e.midis, dur: e.dur }); } });
    var out = { tag: tag, stubs: stubs(), ms: Math.round(performance.now() - t0), seconds: r.mix.duration, sampleRate: r.mix.sampleRate, peaks: { mix: peak(r.mix) }, events: events.length };
    await put(tag + "-mix.wav", wav(r.mix));
    if (r.stems) for (var p in r.stems){ out.peaks[p] = peak(r.stems[p]); await put(tag + "-" + p + ".wav", wav(r.stems[p])); }
    await put(tag + "-events.json", JSON.stringify({ tempo: o.tempo || 120, swing: BandPlayer.swingFor(o.tempo || 120), events: events }));
    return out;
  }

  // ---- the "recorded samples later" path: a hand-written sparse zone list of plain URLs,
  //      velocity layers and a round-robin pair, through the same loader/player ----
  async function testDefine(){
    var base = "/__sf/MusyngKite/";
    BandSounds.define("probe", { gain: 3, release: 0.05, zones: [
      { url: base + "acoustic_bass-mp3/C2.mp3", midi: 36, velHi: 0.6 }, { url: base + "acoustic_bass-mp3/Db2.mp3", midi: 36, velLo: 0.6 },
      { url: base + "acoustic_bass-mp3/A2.mp3", midi: 45 } ] });
    BandSounds.define("probekit", { zones: [ { url: base + "percussion-mp3/Eb3.mp3", piece: "ride" }, { url: base + "percussion-mp3/F3.mp3", piece: "ride" },
      { url: base + "percussion-mp3/DOES_NOT_EXIST.mp3", piece: "ride" } ] });
    var ctx = new OfflineAudioContext(2, 44100 * 2, 44100), bank = BandSounds.create(ctx), prog = [];
    await bank.load(["probe", "probekit"], function (d, t){ prog.push(d + "/" + t); });
    var made = [bank.play("probe", { midi: 40, vel: 0.5, dur: 0.3 }, 0.1), bank.play("probe", { midi: 40, vel: 0.9, dur: 0.3 }, 0.6),
                bank.play("probekit", { piece: "ride", vel: 0.7 }, 1.0), bank.play("probekit", { piece: "ride", vel: 0.7 }, 1.3), bank.play("probekit", { piece: "kick" }, 1.5)];
    var buf = await ctx.startRendering(), d = buf.getChannelData(0);
    function rms(a, b){ var s = 0; for (var i = Math.round(a * 44100); i < Math.round(b * 44100); i++) s += d[i] * d[i]; return Math.sqrt(s / ((b - a) * 44100)); }
    var missing = null; try { await BandSounds.create(ctx).load(["nope"]); } catch (e){ missing = e.message; }
    return { progressLast: prog[prog.length - 1], voices: made.map(function (v){ return !!v; }), rates: made.slice(0, 2).map(function (v){ return +v.src.playbackRate.value.toFixed(4); }),
      rmsBeforeFirst: rms(0, 0.09), rmsNote1: rms(0.1, 0.4), rmsGap: rms(0.52, 0.59), rmsNote2: rms(0.6, 0.9), rmsRide: rms(1.0, 1.25), unknownInstrument: missing };
  }

  window.H = { abc: ABC, parsed: parsed, stubs: stubs, testLive: testLive, testEnding: testEnding, render: render, testDefine: testDefine };

  // manual use
  var mp = null;
  document.getElementById("play").onclick = function (){
    mp = mp || BandPlayer.create({ parsed: parsed, tempo: 120, countIn: 1,
      onState: function (s){ document.getElementById("st").textContent = s; },
      onBar: function (i){ document.getElementById("log").textContent = JSON.stringify(i); } });
    mp.play();
  };
  document.getElementById("stop").onclick = function (){ if (mp) mp.stop(); };
})();
