// noise.js — the site's one noise model (global SiteNoise). White, pink and brown noise, and a 10-band graphic EQ to shape it.
//
// WHY THIS EXISTS (2026-11-27). Noise elsewhere on the site used to be a short buffer (1–3 s) played on a loop. Noise has no
// pattern, but a *loop* of noise does: the same 2 or 3 seconds come round again and again, and the ear catches the repeat
// as a soft rhythmic "whoosh … whoosh", a pulse at the loop's length. Where the pink filter started from silence at the top
// of the buffer (rec-kit-mic.js), each lap also began with a little dip in the low end, a faint thump on the pulse.
//
// The model here:
//   SiteNoise.source(ctx, kind)  an AudioBufferSourceNode (same API as before: connect / start / stop) over a 23-second buffer
//                            whose filters are warmed up before recording and whose end is cross-faded into its start, so the
//                            loop has no seam; each source starts at a random point in it. A repeat 23 s apart is far too
//                            long for the ear to hold (sync, works in OfflineAudioContext too). Buffers are made once per
//                            context and kind.
//   SiteNoise.stream(ctx, kind)  { output, stop } that never repeats at all: an AudioWorklet makes fresh noise every sample.
//                            The output is ready at once; the worklet joins it when loaded (a few ms), playing the long
//                            buffer until then, or for good where worklets aren't available. For long beds (the Ambient
//                            Generator).
//   SiteNoise.eq(ctx, gains)     10 octave bands, 31 Hz – 16 kHz (the ISO graphic-EQ centres), peaking filters, ±18 dB:
//                            { input, output, bands, freqs, set(i, dB), get(i), response(freqArray) -> dB array }.
// Levels: white about -12 dBFS RMS; pink and brown are scaled to sound about as loud.
(function () {
  "use strict";
  var SECS = 23, FADE = 0.5, WARM = 2;
  var FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var cache = typeof WeakMap === "function" ? new WeakMap() : null, plain = [];

  function prng(seed) { var s = (seed * 2654435761) >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // one sample generator per colour; the same filters run in the worklet (WORKLET below repeats them)
  function gen(kind, rnd) {
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    if (kind === "pink") return function () { var w = rnd() * 2 - 1; b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; var y = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; return y; };
    if (kind === "brown") return function () { var w = rnd() * 2 - 1; last = (last + .02 * w) / 1.02; return last * 3.5; };
    return function () { return (rnd() * 2 - 1) * .4; };
  }
  function store(c) {
    if (cache) { var s = cache.get(c); if (!s) { s = {}; cache.set(c, s); } return s; }
    for (var i = 0; i < plain.length; i++) if (plain[i].c === c) return plain[i].s;
    plain.push({ c: c, s: {} }); return plain[plain.length - 1].s;
  }
  function buffer(c, kind) {
    kind = kind === "pink" || kind === "brown" ? kind : "white";
    var st = store(c); if (st[kind]) return st[kind];
    var sr = c.sampleRate, n = Math.round(SECS * sr), f = Math.round(FADE * sr), g = gen(kind, prng(kind === "pink" ? 2 : kind === "brown" ? 3 : 1));
    for (var i = 0; i < WARM * sr; i++) g();                          // filters settle before anything is kept
    var b = c.createBuffer(1, n, sr), d = b.getChannelData(0), tail = new Float32Array(f);
    for (i = 0; i < n; i++) d[i] = g();
    for (i = 0; i < f; i++) tail[i] = g();                           // what would have come after the end …
    for (i = 0; i < f; i++) { var x = i / f; d[i] = d[i] * Math.sqrt(x) + tail[i] * Math.sqrt(1 - x); }   // … fades into the start: no seam
    return (st[kind] = b);
  }
  function source(c, kind) {
    var s = c.createBufferSource(), b = buffer(c, kind), start = s.start;
    s.buffer = b; s.loop = true;
    s.start = function (when, offset, dur) { return dur == null ? start.call(s, when || 0, offset == null ? Math.random() * b.duration : offset) : start.call(s, when || 0, offset == null ? Math.random() * b.duration : offset, dur); };
    return s;
  }

  // ---- the worklet: fresh noise forever ----
  var WORKLET = "registerProcessor('site-noise',class extends AudioWorkletProcessor{constructor(o){super();var k=(o.processorOptions||{}).kind||'white';this.k=k;this.s=(Math.random()*4294967295>>>0)||1;this.b=[0,0,0,0,0,0,0];this.l=0;this.on=true;this.port.onmessage=e=>{if(e.data==='stop')this.on=false;};}" +
    "r(){var s=this.s;s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;this.s=s;return s/4294967296*2-1;}" +
    "process(i,out){var o=out[0][0],b=this.b,k=this.k;for(var n=0;n<o.length;n++){var w=this.r();if(k==='pink'){b[0]=.99886*b[0]+w*.0555179;b[1]=.99332*b[1]+w*.0750759;b[2]=.969*b[2]+w*.153852;b[3]=.8665*b[3]+w*.3104856;b[4]=.55*b[4]+w*.5329522;b[5]=-.7616*b[5]-w*.016898;o[n]=(b[0]+b[1]+b[2]+b[3]+b[4]+b[5]+b[6]+w*.5362)*.11;b[6]=w*.115926;}" +
    "else if(k==='brown'){this.l=(this.l+.02*w)/1.02;o[n]=this.l*3.5;}else o[n]=w*.4;}return this.on;}});";
  var loading = typeof WeakMap === "function" ? new WeakMap() : null;
  function ready(c) {
    if (!c.audioWorklet || typeof AudioWorkletNode !== "function" || !loading) return Promise.reject(new Error("no AudioWorklet"));
    var p = loading.get(c); if (p) return p;
    var url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    p = c.audioWorklet.addModule(url); loading.set(c, p); return p;
  }
  function stream(c, kind) {
    var out = c.createGain(), fb = source(c, kind), fbg = c.createGain(), dead = false, node = null;
    fb.connect(fbg); fbg.connect(out); fb.start();
    ready(c).then(function () {
      if (dead) return;
      node = new AudioWorkletNode(c, "site-noise", { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { kind: kind } });
      var g = c.createGain(), t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .05);
      node.connect(g); g.connect(out); fbg.gain.setValueAtTime(1, t); fbg.gain.linearRampToValueAtTime(0, t + .05);
      setTimeout(function () { try { fb.stop(); fb.disconnect(); } catch (e) {} }, 200);
    }, function () {});
    return { output: out, live: function () { return !!node; }, stop: function () {
      if (dead) return; dead = true; try { fb.stop(); } catch (e) {}
      if (node) { node.port.postMessage("stop"); try { node.disconnect(); } catch (e) {} } try { out.disconnect(); } catch (e) {} } };
  }

  function eq(c, gains) {
    var input = c.createGain(), output = c.createGain(), prev = input;
    var bands = FREQS.map(function (f, i) {
      var b = c.createBiquadFilter(); b.type = "peaking"; b.frequency.value = f; b.Q.value = 1.41; b.gain.value = gains && gains[i] || 0;
      prev.connect(b); prev = b; return b;
    });
    prev.connect(output);
    return { input: input, output: output, bands: bands, freqs: FREQS.slice(),
      set: function (i, db, t) { var b = bands[i]; if (!b) return; db = Math.max(-18, Math.min(18, +db || 0)); b.gain.setTargetAtTime(db, t || c.currentTime, .02); b._db = db; },
      get: function (i) { return bands[i] && bands[i]._db != null ? bands[i]._db : bands[i].gain.value; },
      response: function (fr, dbs) { return response(fr, dbs || bands.map(function (b) { return b._db != null ? b._db : b.gain.value; }), c.sampleRate); } };
  }
  // the summed curve of the ten bands, worked out from the filter formulas (RBJ cookbook peaking EQ, as BiquadFilterNode uses)
  function response(fr, dbs, sr) {
    sr = sr || 48000; var tot = new Float32Array(fr.length);
    FREQS.forEach(function (f0, j) {
      var db = dbs[j] || 0; if (!db) return;
      var A = Math.pow(10, db / 40), w0 = 2 * Math.PI * f0 / sr, al = Math.sin(w0) / (2 * 1.41), cs = Math.cos(w0);
      var b0 = 1 + al * A, b1 = -2 * cs, b2 = 1 - al * A, a0 = 1 + al / A, a1 = -2 * cs, a2 = 1 - al / A;
      for (var i = 0; i < fr.length; i++) {
        var w = 2 * Math.PI * fr[i] / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
        var nr = b0 + b1 * c1 + b2 * c2, ni = -b1 * s1 - b2 * s2, dr = a0 + a1 * c1 + a2 * c2, di = -a1 * s1 - a2 * s2;
        tot[i] += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
      }
    });
    return tot;
  }

  window.SiteNoise = { response: response, source: source, buffer: buffer, stream: stream, eq: eq, FREQS: FREQS.slice(), SECONDS: SECS };
})();
