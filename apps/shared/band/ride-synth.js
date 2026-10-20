// ride-synth.js — a synthesized ride cymbal for the Drumset tool (RideSynth), ported from the old Drumset page (tools/_drumset.qmd):
// ten inharmonic sine partials and a band of noise under one envelope, played with a stick, a mallet or a brush, through a
// high-pass, a low-pass and a small reverb. The band's own ride is a sample (sounds.js); this is the other choice, a ride you can shape.
//
//   var r = RideSynth.create();                     // its own AudioContext, made when first needed (or RideSynth.create(ctx))
//   r.set({ variant: "medium20" | "jazz18" | "rock22" | "flat" | "bell", technique: "stick" | "mallet" | "brush",
//           decay: seconds, reverb: 0..100, hp: Hz, lp: Hz })     // any of them, at any time
//   r.hit(when, { bell: false, vel: 0.5 })           // when = a time on r.context(); omit = now. vel 0.5 is the old page's level
//   r.context()   r.params()   r.resume()
//   RideSynth.VARIANTS  RideSynth.TECHNIQUES
//
// Not listened to against the band's ride; the numbers are the old page's.

(function (global) {
  // Extended inharmonic ratios: more partials push energy into the 1-4 kHz "ping" zone
  var CYM_RATIOS = [1, 1.483, 1.789, 2.255, 2.689, 3.136, 3.928, 4.733, 5.876, 7.402];
  var BELL_RATIOS = [1, 2.0, 2.756, 4.07, 5.33, 6.8, 8.5];
  var VARIANTS = {
    medium20: { label: "20″ Medium", base: 370, decay: 2.2, noiseAmt: 0.22, vol: 0.50 },                     // balanced ping + moderate wash
    jazz18:   { label: "18″ Jazz (dark)", base: 310, decay: 4.2, noiseAmt: 0.72, vol: 0.42 },                // lower, heavy wash
    rock22:   { label: "22″ Rock", base: 440, decay: 1.4, noiseAmt: 0.10, vol: 0.60 },                       // bright, cutting, shorter
    flat:     { label: "Flat ride", base: 350, decay: 0.45, noiseAmt: 0.05, vol: 0.56 },                           // staccato, no wash
    bell:     { label: "Bell", base: 480, decay: 1.8, noiseAmt: 0.0, vol: 0.65, ratios: BELL_RATIOS, oscType: "sine" }
  };
  var TECHNIQUES = { stick: "Stick", mallet: "Mallet", brush: "Brush" };

  function cymbal(ctx, noise, t, p, out, technique, level){
    var isMallet = technique === "mallet", isBrush = technique === "brush";
    var attack = isMallet ? 0.09 : isBrush ? 0.03 : 0, total = attack + p.decay, vol = p.vol * level;
    var master = ctx.createGain();
    if (attack > 0){ master.gain.setValueAtTime(0.001, t); master.gain.linearRampToValueAtTime(isBrush ? vol * 0.55 : vol, t + attack); }
    else master.gain.setValueAtTime(vol, t);
    master.gain.exponentialRampToValueAtTime(0.001, t + total);
    master.connect(out);
    var mult = isBrush ? 0.30 : 1.0, pow = isMallet ? 1.8 : 1.0;                         // mallet: the fundamental; brush: the noise swish
    (p.ratios || CYM_RATIOS).forEach(function (r, i){
      var osc = ctx.createOscillator(); osc.type = p.oscType || "sine"; osc.frequency.value = p.base * r;
      var g = ctx.createGain(); g.gain.value = (0.28 / Math.pow(i + 1, pow)) * mult;
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + total + 0.1);
    });
    var amt = isBrush ? Math.max(p.noiseAmt * 2.5, 0.50) : isMallet ? p.noiseAmt * 0.45 : p.noiseAmt;
    if (amt > 0){
      var ns = ctx.createBufferSource(); ns.buffer = noise; ns.loop = true;
      var ng = ctx.createGain(), f = ctx.createBiquadFilter(); ng.gain.value = amt * 0.55;
      if (isBrush){ f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = 1.2; }
      else { f.type = "highpass"; f.frequency.value = isMallet ? 5000 : 3500; }
      ns.connect(f); f.connect(ng); ng.connect(master); ns.start(t); ns.stop(t + total + 0.1);
    }
  }

  function create(ctx0){
    var ctx = ctx0 || null, built = null, set = { variant: "medium20", technique: "stick", decay: null, reverb: 0, hp: 20, lp: 20000 };
    function build(){
      if (!ctx){ var AC = global.AudioContext || global.webkitAudioContext; ctx = new AC({ latencyHint: "interactive" }); }
      if (built && built.ctx === ctx) return built;
      var b = { ctx: ctx }, sr = ctx.sampleRate, i, c, d;
      b.noise = ctx.createBuffer(1, sr, sr); d = b.noise.getChannelData(0); for (i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      b.dry = ctx.createGain(); b.dry.connect(ctx.destination);
      var conv = ctx.createConvolver(), len = Math.round(sr * 1.6), ir = ctx.createBuffer(2, len, sr);
      for (c = 0; c < 2; c++){ d = ir.getChannelData(c); for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      conv.buffer = ir;
      var wet = ctx.createGain(); wet.gain.value = 0.85; b.send = ctx.createGain(); b.send.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
      b.inp = ctx.createGain(); b.hp = ctx.createBiquadFilter(); b.lp = ctx.createBiquadFilter();
      b.hp.type = "highpass"; b.lp.type = "lowpass";
      b.inp.connect(b.hp); b.hp.connect(b.lp); b.lp.connect(b.dry); b.lp.connect(b.send);
      if (global.AudioTap) try { global.AudioTap.register(ctx, b.inp, "Ride cymbal"); } catch (e) {}
      built = b; apply(); return b;
    }
    function apply(){
      if (!built) return;
      built.send.gain.value = set.reverb / 100; built.hp.frequency.value = set.hp; built.lp.frequency.value = set.lp;
    }
    function params(bell){
      var v = VARIANTS[bell ? "bell" : set.variant] || VARIANTS.medium20;
      return Object.assign({}, v, { decay: bell ? v.decay : set.decay != null ? set.decay : v.decay });
    }
    return {
      context: function (){ return build().ctx; },
      resume: function (){ var b = build(); if (b.ctx.state === "suspended" && b.ctx.resume) b.ctx.resume(); return b.ctx; },
      set: function (o){
        if (o.variant && VARIANTS[o.variant] && o.variant !== set.variant){ set.variant = o.variant; if (o.decay == null) set.decay = null; }       // a new ride has its own decay
        if (o.technique && TECHNIQUES[o.technique]) set.technique = o.technique;
        if (o.decay != null) set.decay = Math.max(0.1, Math.min(4.5, +o.decay));
        if (o.reverb != null) set.reverb = Math.max(0, Math.min(100, +o.reverb));
        if (o.hp != null) set.hp = Math.max(20, Math.min(20000, +o.hp));
        if (o.lp != null) set.lp = Math.max(200, Math.min(20000, +o.lp));
        apply();
      },
      params: function (){ var p = params(false); return { variant: set.variant, technique: set.technique, decay: p.decay, reverb: set.reverb, hp: set.hp, lp: set.lp }; },
      hit: function (when, o){
        o = o || {}; var b = build(); if (b.ctx.state === "suspended" && b.ctx.resume) b.ctx.resume();
        var vel = o.vel == null ? 0.5 : o.vel, t = Math.max(when || 0, b.ctx.currentTime);
        cymbal(b.ctx, b.noise, t, params(!!o.bell), b.inp, set.technique, Math.max(0.1, Math.min(2, vel / 0.5)));
      }
    };
  }

  global.RideSynth = { create: create, VARIANTS: VARIANTS, TECHNIQUES: TECHNIQUES };
})(typeof window !== "undefined" ? window : globalThis);
