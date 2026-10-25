// modx.js — the band plays through a Yamaha MODX (or any MIDI sound module) instead of the samples (BandModx).
// sounds.js asks BandModx.routed(inst, ctx) before every note; when it says yes the note goes out over Web MIDI on that
// instrument's channel and nothing sounds in the browser. Everything else (the parts, the player) is unchanged.
//
//   BandModx.connect()            -> Promise of the output port's name (asks the browser for MIDI; remembers the port)
//   BandModx.outputs()            -> [{ id, name }]   BandModx.useOutput(id)
//   BandModx.routed(inst, ctx)    -> true when this instrument's notes go to the MODX (never for an OfflineAudioContext: a render)
//   BandModx.play(inst, spec, when, ctx)    spec as sounds.js: { midi | piece, vel, dur, bend, gain }. Returns a stand-in voice.
//   BandModx.control(inst, name, value, when, ctx)   "swell" -> CC 11, "leslie" -> cfg.leslieCC (fast 127, slow 0)
//   BandModx.stop()               drop what is queued, note-off everything held
//   BandModx.force(inst, "site" | "modx" | null)   the comparison page: one instrument this way whatever the routing says
//   BandModx.selectPerformance()  Bank Select MSB/LSB + Program Change from cfg.perf, on cfg.perf.ch
//   BandModx.cc(ch, num, value)   one controller now (ch 1..16)
//   BandModx.cfg / save() / reset()   the settings (localStorage "modx.cfg"); BandModx.DEFAULTS
//   BandModx._setOutput(fake)     tests: any { send(bytes, ts) }
//
// Timing: a note at AudioContext time `when` is sent with the performance.now() stamp at which the context will be HEARD
// at `when` (getOutputTimestamp), plus cfg.offsetMs (the MODX's own delay through the speakers vs. the computer's, set by ear
// on the MODX page). Notes wait in a queue and leave about 150 ms ahead, so Stop can still take back what has not left.
//
// UNVERIFIED (from memory of Yamaha's MODX documents, not checked against the board): the drum-kit key map (General MIDI here),
// the pitch-bend range (2 semitones, the Part default), Bank Select 63 / LSB for presets and User, and which CC turns the rotary
// speaker in an organ Performance (cfg.leslieCC, default 1 = mod wheel).
(function (global) {
  var KEY = "modx.cfg", AHEAD = 150, TICK = 20;
  var GM_KIT = { kick:36, rim:37, snare:38, clap:39, hatClosed:42, hatFoot:44, hatOpen:46, crash:49, ride:51, ride2:59, rideBell:53, tomLo:43, tomMid:45,
                 tomHi:48, tom3:47, sticks:31, tamb:54, cowbell:56, stacker:52, click:33, clickHi:34, brushTap:38, brushSwish:40, brushSweep:40 };
  var GM_CONGAS = { congaOpen:63, congaSlap:62, congaMute:62, congaHeel:62, congaToe:62, congaBass:63, tumbaOpen:64, tumbaMute:64, tumbaBass:64, bongoHi:60, bongoLo:61 };
  // Default channels follow the "Site Band" Performance the MODX page describes: Part 1 bass, 2 keys, 3 organ, 4 guitar, 10 drums, 11 hand drums.
  var CH = { bass:1, ebass:1, piano:2, epiano:2, rhodes:2, wurli:2, hammond:3, organ:3, guitar:4, aguitar:4, nguitar:4, clguitar:4, odguitar:4, cguitar:4, dguitar:4, kit:10, congas:11 };
  function defaults(){
    var routes = {}; Object.keys(CH).forEach(function (k){ routes[k] = { on: false, ch: CH[k] }; });
    return { on: false, outId: null, outName: null, offsetMs: 0, pbRange: 2, leslieCC: 1,
             perf: { ch: 1, msb: 63, lsb: 32, pc: 0, sendOnConnect: false }, routes: routes, kit: Object.assign({}, GM_KIT), congas: Object.assign({}, GM_CONGAS) };
  }
  function load(){
    var d = defaults(), s; try { s = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    if (!s) return d;
    ["on","outId","outName","offsetMs","pbRange","leslieCC"].forEach(function (k){ if (s[k] !== undefined) d[k] = s[k]; });
    Object.assign(d.perf, s.perf || {}); Object.assign(d.kit, s.kit || {}); Object.assign(d.congas, s.congas || {});
    Object.keys(s.routes || {}).forEach(function (k){ d.routes[k] = Object.assign(d.routes[k] || { on: false, ch: 1 }, s.routes[k]); });
    return d;
  }
  var cfg = load(), out = null, access = null, queue = [], held = {}, forced = {}, timer = null, seq = 0;
  function save(){ try { global.localStorage.setItem(KEY, JSON.stringify(cfg)); global.localStorage.setItem("modx.on", cfg.on ? "1" : "0"); } catch (e) {} }
  function reset(){ var keepOut = { outId: cfg.outId, outName: cfg.outName, on: cfg.on }; cfg = Object.assign(defaults(), keepOut); api.cfg = cfg; save(); }

  function now(){ return global.performance ? global.performance.now() : Date.now(); }
  function stamp(ctx, when){
    var base;
    if (ctx && ctx.getOutputTimestamp){ var ts = ctx.getOutputTimestamp(); if (ts && ts.performanceTime > 0) base = ts.performanceTime + ((when || 0) - ts.contextTime) * 1000; }
    if (base == null) base = now() + Math.max(0, (when || 0) - (ctx ? ctx.currentTime : 0)) * 1000 + ((ctx && ctx.outputLatency) || 0) * 1000;
    return base + (+cfg.offsetMs || 0);
  }
  // kind: "on" | "off" | "raw". Offs sort before ons at the same moment, so a note struck again is released first.
  function push(ts, kind, bytes){ queue.push({ ts: ts, kind: kind, bytes: bytes, n: seq++ }); arm(); }
  function arm(){ if (!timer && queue.length) timer = setInterval(flush, TICK); if (queue.length) flush(); }
  function flush(){
    if (!out){ queue = []; }
    var lim = now() + AHEAD, due = [], keep = [];
    queue.forEach(function (q){ (q.ts <= lim ? due : keep).push(q); }); queue = keep;
    due.sort(function (a, b){ return a.ts - b.ts || (a.kind === "off" ? 0 : 1) - (b.kind === "off" ? 0 : 1) || a.n - b.n; });
    due.forEach(function (q){
      var b = q.bytes, k = (b[0] & 15) + ":" + b[1];
      // the same key held twice on one channel (two chord notes an octave apart folded, a re-strike): release only when the last lets go
      if (q.kind === "on") held[k] = (held[k] || 0) + 1;
      if (q.kind === "off"){ if (!held[k]) return; if (--held[k] > 0) return; delete held[k]; }
      try { out.send(b, Math.max(q.ts, now())); } catch (e) { if (global.console) console.warn("BandModx: send failed —", e && e.message); }
    });
    if (!queue.length && timer){ clearInterval(timer); timer = null; }
  }

  function routeOf(inst){ return cfg.routes[inst] || null; }
  function routed(inst, ctx){
    if (!out) return false;
    if (ctx && global.OfflineAudioContext && ctx instanceof global.OfflineAudioContext) return false;
    if (forced[inst]) return forced[inst] === "modx";
    var r = routeOf(inst); return !!(cfg.on && r && r.on);
  }
  function chOf(inst){ var r = routeOf(inst); return Math.min(16, Math.max(1, (r && r.ch) || CH[inst] || 1)) - 1; }
  function velByte(spec){ var v = (spec.vel == null ? 0.7 : spec.vel) * Math.sqrt(spec.gain == null ? 1 : Math.max(0, spec.gain)); return Math.min(127, Math.max(1, Math.round(v * 127))); }
  function bendBytes(ch, semis){ var r = Math.max(1, +cfg.pbRange || 2), v = Math.round(8192 + Math.max(-1, Math.min(1, semis / r)) * 8191); v = Math.max(0, Math.min(16383, v)); return [0xE0 | ch, v & 127, v >> 7]; }

  function play(inst, spec, when, ctx){
    var ch = chOf(inst), note, t = stamp(ctx, when);
    if (spec.piece != null){ var map = inst === "congas" ? cfg.congas : cfg.kit; note = map[spec.piece]; if (note == null) return null; }
    else note = spec.midi; if (note == null || !(spec.vel == null || spec.vel > 0)) return null;
    note = Math.max(0, Math.min(127, Math.round(note)));
    var len = spec.dur != null ? Math.max(0.03, spec.dur) : (spec.piece != null ? 0.25 : 2.5);
    if (spec.bend && spec.bend.length){
      var pts = spec.bend, last = pts[pts.length - 1][0];
      push(t - 1, "raw", bendBytes(ch, pts[0][1] || 0));
      for (var s = 0.01; s <= last + 1e-9; s += 0.01){
        var i = 0; while (i < pts.length - 1 && pts[i + 1][0] < s) i++;
        var a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)], f = b[0] > a[0] ? (s - a[0]) / (b[0] - a[0]) : 1;
        push(t + s * 1000, "raw", bendBytes(ch, a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, f))));
      }
      push(t + len * 1000 + 5, "raw", bendBytes(ch, 0));
    }
    push(t, "on", [0x90 | ch, note, velByte(spec)]);
    push(t + len * 1000, "off", [0x80 | ch, note, 0]);
    // a stand-in voice: sounds.js and the player only keep these to stop them
    return { modx: true, inst: inst, t: when, src: { stop: function (){} }, g: { gain: { cancelScheduledValues: function (){}, setTargetAtTime: function (){} } } };
  }
  function control(inst, name, value, when, ctx){
    if (!routed(inst, ctx)) return;
    var ch = chOf(inst), t = stamp(ctx, when);
    if (name === "swell") push(t, "raw", [0xB0 | ch, 11, Math.round(Math.max(0, Math.min(1, +value || 0)) * 127)]);
    if (name === "leslie" && cfg.leslieCC != null) push(t, "raw", [0xB0 | ch, cfg.leslieCC, value === "fast" ? 127 : 0]);
  }
  function stop(){
    queue = queue.filter(function (q){ return false; });
    if (!out) { held = {}; return; }
    var chans = {};
    Object.keys(held).forEach(function (k){ var p = k.split(":"); chans[p[0]] = 1; try { out.send([0x80 | +p[0], +p[1], 0]); } catch (e) {} });
    Object.keys(cfg.routes).forEach(function (k){ chans[chOf(k)] = 1; });
    Object.keys(chans).forEach(function (c){ try { out.send([0xB0 | +c, 123, 0]); out.send(bendBytes(+c, 0)); } catch (e) {} });
    held = {};
  }
  function cc(ch, num, value){ if (out) try { out.send([0xB0 | (Math.max(1, Math.min(16, ch)) - 1), num & 127, Math.max(0, Math.min(127, Math.round(value)))]); } catch (e) {} }
  function selectPerformance(){
    if (!out) return false; var p = cfg.perf, c = Math.max(1, Math.min(16, p.ch || 1)) - 1;
    out.send([0xB0 | c, 0, p.msb & 127]); out.send([0xB0 | c, 32, p.lsb & 127]); out.send([0xC0 | c, p.pc & 127]); return true;
  }

  function outputs(){ var a = []; if (access) access.outputs.forEach(function (o){ a.push({ id: o.id, name: o.name }); }); return a; }
  function useOutput(id){
    var o = null; if (access) access.outputs.forEach(function (x){ if (x.id === id) o = x; });
    if (!o) return null; stop(); out = o; cfg.outId = o.id; cfg.outName = o.name; save(); notify(); return o.name;
  }
  function pickDefault(){
    var list = []; access.outputs.forEach(function (o){ list.push(o); });
    return list.filter(function (o){ return o.id === cfg.outId; })[0] || list.filter(function (o){ return o.name === cfg.outName; })[0]
        || list.filter(function (o){ return /modx|montage|yamaha/i.test(o.name || ""); })[0] || list[0] || null;
  }
  function connect(){
    if (!global.navigator || !global.navigator.requestMIDIAccess) return Promise.reject(new Error("This browser has no Web MIDI (use Chrome or Edge)."));
    return global.navigator.requestMIDIAccess({ sysex: false }).then(function (a){
      access = a; a.onstatechange = function (){ if (out && out.state === "disconnected") out = null; if (!out && cfg.on){ var o = pickDefault(); if (o && o.state !== "disconnected") useOutput(o.id); } notify(); };
      var o = pickDefault(); if (!o) throw new Error("No MIDI output found: is the MODX plugged in by USB and switched on?");
      useOutput(o.id); if (cfg.perf.sendOnConnect) selectPerformance(); return o.name;
    });
  }
  var listeners = [];
  function onChange(fn){ listeners.push(fn); }
  function notify(){ listeners.forEach(function (fn){ try { fn(); } catch (e) {} }); }

  var api = {
    connect: connect, outputs: outputs, useOutput: useOutput, routed: routed, play: play, control: control, stop: stop, cc: cc,
    selectPerformance: selectPerformance, force: function (inst, how){ if (how) forced[inst] = how; else delete forced[inst]; },
    connected: function (){ return !!out; }, portName: function (){ return out ? out.name : null; }, onChange: onChange,
    cfg: cfg, save: save, reset: reset, DEFAULTS: defaults(), GM_KIT: GM_KIT, GM_CONGAS: GM_CONGAS,
    _setOutput: function (o){ out = o; queue = []; held = {}; }, _flush: flush, _queue: function (){ return queue; }
  };
  global.BandModx = api;
  // switched on from the MODX page earlier: connect by itself (the browser remembers the MIDI permission per site)
  if (cfg.on && global.navigator && global.navigator.requestMIDIAccess) connect().catch(function (e){ if (global.console) console.warn("BandModx:", e && e.message); });
})(typeof window !== "undefined" ? window : globalThis);
