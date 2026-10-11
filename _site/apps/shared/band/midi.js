// midi.js — Standard MIDI File export of what the band played (BandMidi).
// Works from the per-bar records the player hands out through onBarEvents — the notes
// exactly as the parts generated them — so the file matches what was heard, minus the
// random humanising. Swing is written into the timing (the same warp the player uses).
//
//   bar record: { bar, index, chorus, length, beats, tempo, opts, meter, compound, parts: { bass:[..], comp:[..], drums:[..] } }
//        (compound: 6/8, 9/8, 12/8 — a beat is a dotted quarter and x.5 is its third eighth)
//   BandMidi.build(bars, { parts:["bass","comp","drums"], ppq:480 }) -> Uint8Array (format 1:
//        a tempo track + one track per part; drums on channel 10 with GM notes)
//   BandMidi.swingOf(bar)      -> where the off-beat eighth lands for that bar (0.5 = straight)
//   BandMidi.generate(parsed, { bars, tempo, transpose, opts }) -> bar records generated
//        silently from the parts (for exporting before anything has been played)
//   BandMidi.GM                -> kit piece -> GM percussion note

(function (global) {
  var GM = { kick:36, rim:37, snare:38, hatClosed:42, hatFoot:44, hatOpen:46, crash:49, ride:51, rideBell:53,
             tomLo:43, tomMid:45, tomHi:48, sticks:31, clap:39, tamb:54 };
  var PROGRAM = { bass:32, ebass:33, piano:0, epiano:4, rhodes:4, wurli:4, organ:19, hammond:16, guitar:26, aguitar:25, nguitar:24, cguitar:27, clguitar:27, dguitar:30, odguitar:30 };   // acoustic / fingered electric bass, grand / electric piano, jazz guitar
  var CHANNEL = { bass:0, comp:1, comp2:2, drums:9 };
  var NAME = { bass:"Bass", comp:"Comping", comp2:"Second chord instrument", drums:"Drums" };

  function swingOf(bar){
    if (bar.swing != null) return bar.swing;
    if (bar.compound) return 2 / 3;                         // x.5 is the beat's third eighth
    var o = bar.opts || {};
    if (o.feel === "straight" || o.swing === false) return 0.5;
    var P = global.BandPlayer;
    return (P && P.swingFor) ? P.swingFor(bar.tempo || 120) : 2 / 3;
  }
  function warp(pos, s){ var b = Math.floor(pos), f = pos - b; return b + (f <= 0.5 ? f * (s / 0.5) : s + (f - 0.5) * ((1 - s) / 0.5)); }

  function vlq(n){ var out = [n & 0x7f]; while ((n >>= 7) > 0) out.unshift((n & 0x7f) | 0x80); return out; }
  function str(s){ var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0x7f); return a; }
  function u32(n){ return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function meta(type, data){ return [0xff, type].concat(vlq(data.length), data); }
  // [{ tick, order, bytes }] -> track chunk (note-offs sort before note-ons on the same tick)
  function chunk(events){
    events.sort(function (a, b){ return a.tick - b.tick || a.order - b.order; });
    var body = [], last = 0;
    events.forEach(function (e){ body = body.concat(vlq(e.tick - last), e.bytes); last = e.tick; });
    body = body.concat([0, 0xff, 0x2f, 0]);
    return str("MTrk").concat(u32(body.length), body);
  }

  function build(bars, o){
    o = o || {};
    var ppq = o.ppq || 480, want = o.parts || ["bass", "comp", "drums"];
    if (!o.parts && (bars || []).some(function (b){ return b.parts && b.parts.comp2 && b.parts.comp2.length; })) want = ["bass", "comp", "comp2", "drums"];     // a second chord player gets a track of its own
    var tempoTrack = [{ tick:0, order:0, bytes: meta(0x03, str("Backing track")) }];
    var tracks = {}, starts = [], tick = 0, lastTempo = null, lastBeats = null;
    want.forEach(function (p){ tracks[p] = []; });
    (bars || []).forEach(function (bar){
      var beats = bar.beats || 4, s = swingOf(bar);
      var q = bar.compound ? 1.5 : 1, bq = ppq * q;         // a compound beat is a dotted quarter: 1.5 MIDI quarters
      var tempo = Math.round((bar.tempo || 120) * q * 100) / 100, sig = bar.compound ? (beats * 3) + "/8" : beats + "/4";
      if (tempo !== lastTempo){ var us = Math.round(60000000 / tempo);
        tempoTrack.push({ tick:tick, order:1, bytes: meta(0x51, [(us >> 16) & 255, (us >> 8) & 255, us & 255]) }); lastTempo = tempo; }
      if (sig !== lastBeats){ tempoTrack.push({ tick:tick, order:1, bytes: meta(0x58, bar.compound ? [beats * 3, 3, 36, 8] : [beats, 2, 24, 8]) }); lastBeats = sig; }
      starts.push(tick);
      want.forEach(function (p){
        ((bar.parts && bar.parts[p]) || []).forEach(function (ev){
          if (!ev || !(ev.pos >= 0)) return;
          var on = tick + Math.round((ev.straight ? ev.pos : warp(ev.pos, s)) * bq);
          var vel = Math.max(1, Math.min(127, Math.round((ev.vel == null ? 0.7 : ev.vel) * 127)));
          var ch = CHANNEL[p], notes, len;
          if (p === "drums"){ if (GM[ev.piece] == null) return; notes = [GM[ev.piece]]; len = Math.round(ppq / 8); }
          else { notes = p === "bass" ? [ev.midi] : (ev.midis || []); len = Math.max(1, Math.round((ev.dur || 0.5) * bq)); }
          if (p === "comp" && tracks[p].inst == null) tracks[p].inst = (ev.inst || "piano") === "piano" && PROGRAM[(bar.opts || {}).compSound] != null && !/guitar|bass/.test(bar.opts.compSound) ? bar.opts.compSound : ev.inst === "guitar" && PROGRAM[(bar.opts || {}).compSound] != null && /guitar$/.test(bar.opts.compSound) ? bar.opts.compSound : ev.inst || "piano";
          if (p === "comp2" && tracks[p].inst == null){ var s2 = ((bar.opts || {}).second || {}).compSound; tracks[p].inst = PROGRAM[s2] != null ? s2 : ev.inst || "piano"; }
          if (p === "bass" && tracks[p].inst == null) tracks[p].inst = (bar.opts || {}).bassSound === "electric" ? "ebass" : "bass";
          notes.forEach(function (n){
            tracks[p].push({ tick:on, order:2, bytes:[0x90 | ch, n & 127, vel] });
            tracks[p].push({ tick:on + len, order:0, bytes:[0x80 | ch, n & 127, 0] });
          });
        });
      });
      tick += Math.round(beats * bq);
    });
    var chunks = [chunk(tempoTrack)];
    want.forEach(function (p){
      var evs = tracks[p], ch = CHANNEL[p];
      var prog = PROGRAM[evs.inst || (p === "bass" ? "bass" : "piano")];
      var name = p === "comp2" ? NAME[p] : p === "comp" ? (evs.inst === "guitar" ? "Guitar" : PROGRAM[evs.inst] === 4 ? "Electric piano" : evs.inst === "organ" || evs.inst === "hammond" ? "Organ" : "Piano") : p === "bass" && evs.inst === "ebass" ? "Electric bass" : NAME[p];
      var headEv = [{ tick:0, order:-2, bytes: meta(0x03, str(name)) }];
      if (p !== "drums") headEv.push({ tick:0, order:-1, bytes:[0xc0 | ch, prog] });
      chunks.push(chunk(headEv.concat(evs)));
    });
    var head = str("MThd").concat(u32(6), [0, 1, 0, chunks.length, (ppq >> 8) & 255, ppq & 255]);
    var all = head; chunks.forEach(function (c){ all = all.concat(c); });
    return new Uint8Array(all);
  }

  // Bars generated straight from the parts, from the top of the form, with no audio.
  function generate(parsed, o){
    o = o || {};
    var H = global.BandHarmony; if (!H || !parsed) return [];
    var form = H.buildForm(parsed, o.transpose || 0); if (!form.length) return [];
    var G = { bass: global.BandBass, comp: global.BandComp, drums: global.BandDrums }, parts = {}, out = [];
    if (global.BandComp && global.BandComp.createSecond) G.comp2 = { create: global.BandComp.createSecond };       // the second chord player (opts.second)
    var wrap = H.feelPart || function (x){ return x; };
    // the second player has random numbers of its own, so the other parts play the same notes with or without it
    var s2 = 257, rng2 = !o.rng ? Math.random : function (){ s2 = (s2 + 0x6D2B79F5) | 0; var t = Math.imul(s2 ^ (s2 >>> 15), 1 | s2); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Object.keys(G).forEach(function (p){ if (G[p] && G[p].create) parts[p] = wrap(G[p].create({ rng: p === "comp2" ? rng2 : o.rng || Math.random }), p === "comp2" ? "comp" : p); });
    var n = o.bars || form.length, tempo = o.tempo || 120, opts = o.opts || {};
    var C = global.BandCatalog, own = {};                     // a section in a style of its own (see BandCatalog.sectionOpts)
    // a page's own settings for a section (opts.sectionOverrides: { section index: options }) come before the section's style
    var secOf = [], sn = -1, any = false, ovs = {};
    form.forEach(function (b, k){ if (b.section != null) any = true; if (b.section != null || sn < 0) sn++; secOf[k] = sn; });
    function optsOf(fb, k){
      var ov = any && opts.sectionOverrides && opts.sectionOverrides[secOf[k]];
      if (ov){ if (!ovs[secOf[k]]) ovs[secOf[k]] = Object.assign({}, opts, ov, { sectionOverrides: null, sectionStyle: "menus" }); return ovs[secOf[k]]; }
      if (!fb.style || !C || !C.sectionOpts) return opts; if (!(fb.style in own)){ var so = C.sectionOpts(fb.style, opts); own[fb.style] = so ? so.opts : opts; } return own[fb.style]; }
    for (var i = 0; i < n; i++){
      var idx = i % form.length, fb = form[idx];
      var ctx = { bar:i, index:idx, length:form.length, chorus:Math.floor(i / form.length), beats:fb.beats, chords:fb.chords,
                  nextChords: form[(idx + 1) % form.length].chords, tempo:tempo / (fb.unit || 1), unit:fb.unit || 1, last:false, opts:optsOf(fb, idx), form:form,
                  stop: !!(fb.stop || (opts.stops && opts.stops.indexOf(idx) >= 0)), nextStop: !!(form[(idx + 1) % form.length].stop || (opts.stops && opts.stops.indexOf((idx + 1) % form.length) >= 0)),
                  meter:fb.meter, compound:!!fb.compound, form:form, nextIndex:(idx + 1) % form.length,
                  phrase:{ bar: idx % 4, turnaround: form.length - 1 - idx < 2, top: idx === 0 } };
      var rec = { bar:i, index:idx, chorus:ctx.chorus, length:form.length, beats:fb.beats, tempo:tempo / (fb.unit || 1), ending:false,
                  meter:fb.meter, compound:!!fb.compound,
                  chords:fb.chords, opts:Object.assign({}, optsOf(fb, idx)), parts:{} };
      Object.keys(parts).forEach(function (p){ try { rec.parts[p] = parts[p].bar(ctx) || []; } catch (e){ rec.parts[p] = []; } });
      out.push(rec);
    }
    return out;
  }

  global.BandMidi = { build: build, generate: generate, swingOf: swingOf, warp: warp, GM: GM };
})(typeof window !== "undefined" ? window : globalThis);
