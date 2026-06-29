// audio.js — one shared Web Audio instrument for the apps. Aims for a warm,
// non-"cheap" tone: a small detuned oscillator stack → a per-note low-pass filter
// with its own (brighter-on-attack) envelope → an ADSR amp, all summed through a
// master bus with gentle compression and a convolution reverb. A few curated
// voices (piano / e-piano / strings / pluck / flute / vibes) instead of a big GM
// list. Single AudioContext shared across the whole site.
//
//   MusicAudio.note(midi, dur?, gain?, voice?)
//   MusicAudio.noteAt(midi, ctxTime, dur, gain?, voice?)   — schedule on the audio clock
//   MusicAudio.chord(midis, dur?, gain?, voice?)            — gain auto-balanced
//   MusicAudio.click(ctxTime, accent?)                      — metronome tick (woodblock-ish)
//   MusicAudio.setVoice(name) / MusicAudio.voices()
//   MusicAudio.ctx() / MusicAudio.midiToFreq(midi)

(function (global) {
  let ctx = null, master = null, reverb = null, wetGain = null;

  function ac(){
    if (ctx){ if (ctx.state === "suspended") ctx.resume(); return ctx; }
    ctx = new (global.AudioContext || global.webkitAudioContext)();
    buildBus();
    return ctx;
  }
  function buildBus(){
    const comp = ctx.createDynamicsCompressor();            // glue + keep chords from clipping
    comp.threshold.value = -16; comp.knee.value = 26; comp.ratio.value = 3;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp);
    reverb = ctx.createConvolver(); reverb.buffer = makeIR(1.7, 2.6);   // small hall
    wetGain = ctx.createGain(); wetGain.gain.value = 1.0; reverb.connect(wetGain); wetGain.connect(comp);
  }
  function makeIR(seconds, decay){
    const rate = ctx.sampleRate, len = Math.max(1, Math.floor(seconds * rate));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++){
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  const mtf = m => 440 * Math.pow(2, (m - 69) / 12);

  // voice patches. osc tuple = [type, detuneCents, level, octaveShift].
  // label = menu name. Keys are the public voice ids.
  const PATCHES = {
    piano:      { label:"Piano",          osc:[["triangle",0,1,0],["sine",0,0.5,0],["sine",4,0.18,-1]],
                  a:0.004,d:0.6,s:0.0,r:0.4, cut:1100,cutEnv:4200,cutDecay:0.4, send:0.16 },
    epiano:     { label:"Electric piano",  osc:[["sine",0,1,0],["triangle",4,0.35,0]],
                  a:0.006,d:1.0,s:0.28,r:0.5, cut:1700,cutEnv:1400,cutDecay:0.5, trem:5,tremDepth:0.10, send:0.24 },
    nylon:      { label:"Nylon guitar",    osc:[["triangle",0,1,0],["sine",0,0.4,0],["sine",4,0.15,1]],
                  a:0.004,d:0.5,s:0.0,r:0.35, cut:1300,cutEnv:3000,cutDecay:0.25, send:0.2 },
    bass:       { label:"Bass",            osc:[["sine",0,1,0],["triangle",0,0.4,0]],
                  a:0.004,d:0.6,s:0.45,r:0.3, cut:700,cutEnv:900,cutDecay:0.25, send:0.08 },
    vibraphone: { label:"Vibraphone",      osc:[["sine",0,1,0],["sine",0,0.25,1]],
                  a:0.004,d:1.4,s:0.0,r:0.9, cut:3000,cutEnv:2000,cutDecay:0.8, trem:6,tremDepth:0.32, send:0.3 },
    marimba:    { label:"Marimba",         osc:[["sine",0,1,0],["sine",0,0.5,1],["triangle",0,0.2,2]],
                  a:0.003,d:0.45,s:0.0,r:0.3, cut:2500,cutEnv:2500,cutDecay:0.18, send:0.18 },
  };
  let defaultVoice = "piano";
  const active = new Set();              // live source nodes, so stopAll() can cut scheduled sound

  function voice(midi, t0, dur, gain, voiceName){
    const c = ac();
    const p = PATCHES[voiceName] || PATCHES[defaultVoice];
    const peak = (gain == null ? 0.2 : gain); if (peak <= 0) return;
    const f = mtf(midi);

    const amp = c.createGain(); amp.gain.value = 0.0001;
    const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.Q.value = 0.7; filt.connect(amp);
    const top = Math.min(16000, p.cut + p.cutEnv);
    filt.frequency.setValueAtTime(top, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(140, p.cut), t0 + (p.cutDecay || 0.3));

    // amp ADSR
    const a = p.a, d = p.d, r = p.r, s = p.s;
    const t1 = t0 + a, t2 = t1 + d, sLvl = Math.max(0.0001, peak * s);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t1);
    amp.gain.exponentialRampToValueAtTime(sLvl, t2);
    const relStart = Math.max(t2, t0 + dur);
    if (s > 0.01) amp.gain.setValueAtTime(sLvl, relStart);
    amp.gain.exponentialRampToValueAtTime(0.0001, relStart + r);
    const stopT = relStart + r + 0.05;

    if (p.trem){                                            // amplitude tremolo (e-piano / vibes)
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = p.trem; lg.gain.value = p.tremDepth * peak;
      lfo.connect(lg); lg.connect(amp.gain); lfo.start(t0); lfo.stop(stopT);
      active.add(lfo); lfo.onended = () => active.delete(lfo);
    }
    p.osc.forEach(([type, cents, lvl, oct]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f * Math.pow(2, (oct || 0));
      o.detune.value = cents || 0; g.gain.value = lvl;
      o.connect(g); g.connect(filt); o.start(t0); o.stop(stopT);
      active.add(o); o.onended = () => active.delete(o);
    });
    amp.connect(master);
    const send = c.createGain(); send.gain.value = p.send || 0.2; amp.connect(send); send.connect(reverb);
  }

  function note(midi, dur, gain, v){ voice(midi, ac().currentTime, dur || 0.6, gain, v); }
  function noteAt(midi, t0, dur, gain, v){ ac(); voice(midi, t0, dur || 0.6, gain, v); }
  function chord(midis, dur, gain, v){
    const t = ac().currentTime, g = (gain == null ? 0.2 : gain) / Math.max(1, Math.sqrt(midis.length));
    midis.forEach(m => voice(m, t, dur || 1.0, g, v));
  }
  // metronome tick: a short band-passed noise burst (woodblock-ish), not a beep.
  function click(t0, accent, gain){
    const c = ac(); t0 = t0 || c.currentTime;
    const vol = (gain == null ? 1 : gain) * (accent ? 0.5 : 0.32); if (vol <= 0) return;
    const len = Math.floor(0.03 * c.sampleRate), nb = c.createBuffer(1, len, c.sampleRate);
    const nd = nb.getChannelData(0); for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = nb;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = accent ? 2600 : 1700; bp.Q.value = 2;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t0); src.stop(t0 + 0.06);
    active.add(src); src.onended = () => active.delete(src);
  }
  function stopAll(){ active.forEach(o => { try { o.stop(); } catch(e){} }); active.clear(); }

  global.MusicAudio = {
    note, noteAt, chord, click, stopAll, ctx: ac, midiToFreq: mtf,
    setVoice: n => { if (PATCHES[n]) defaultVoice = n; },
    voices: () => Object.keys(PATCHES),
    voiceList: () => Object.keys(PATCHES).map(id => ({ id, label: PATCHES[id].label })),
  };
})(window);
