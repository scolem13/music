// audio-tap.js — where the site's own sound can be listened to (the navbar Tuner, the lessons' tuner widget).
// A plain global (window.AudioTap), loaded in the head of every page so a sound source can register whenever it makes its AudioContext.
//
//   AudioTap.register(ctx, node, label)   a sound source says "this node carries my output". It costs nothing: no connection is made
//        until a listener asks. Call it where the source builds its master (a line, after the existing routing; that routing is not changed).
//        Registering the same node twice does nothing.
//        A fourth argument { gain: AudioParam } names the param the navbar Mixer (mixer-panel.js) turns up and down; without it the
//        Mixer scales `node`'s own gain when it is a GainNode. More in that object, all optional, for the Mixer:
//          group: "Backing Track"   strips of one group sit together under that name; mixLabel: the strip's name there (else label)
//          active: fn -> bool       the strip is shown only while it says true (the drone while it plays); call AudioTap.changed() when it flips
//          get: fn -> 0..1.5, set: fn(v)   the fader is the source's own volume setting (the drone's Volume slider), not a gain of the Mixer's
//          order: n                 where the strip sits in its group (lower first; else in the order they came)
//          master: true             the group's overall strip: drawn after the group's box, not in it
//          voices: fn -> [{ id, label }], voice: fn -> id, setVoice: fn(id)   the strip's name opens a menu of sounds
//          sub: [{ label, get: fn -> 0..1.5, set: fn(v), ctx, node }]   (node, in ctx: what its meter reads)   the strip's name opens faders of its own (the drum kit's pieces)
//   AudioTap.changed()                    a source started or stopped (listeners redraw).
//   AudioTap.sources() -> [{ ctx, node, label, gain }]   what has registered (contexts not closed). A listener connects `node` to its own
//        analysis node IN THE SAME CONTEXT (PitchDetect.mic({ ctx: e.ctx, source: e.node })): an AudioNode can only reach nodes of its own
//        context, and the site has several (the navbar drone, synth-kit, audio.js's chord keyboard, the band), so the analysis follows the source
//        and no bridge between contexts is needed.
//   AudioTap.onChange(fn)                 fn() when a source registers.
//   AudioTap.mediaElements() -> [<audio>/<video>]   media elements on the page.
//   AudioTap.media(el) -> { ctx, node, label }   routes a media element through Web Audio. createMediaElementSource takes the element's
//        sound away from the page for good, so the source is also connected to the context's destination and the element stays audible.
//        Once per element. Sound from another origin without CORS headers comes out silent (the browser's rule).
//   AudioTap.display() -> Promise({ ctx, node, stop() })   getDisplayMedia({ audio: true }): the person picks a tab and ticks "Share tab audio"
//        (Chrome and Edge, on https or localhost). Rejects with a readable Error otherwise. The video track is dropped at once.
//   AudioTap.canDisplay() -> bool
(function (global) {
  var list = [], subs = [], mctx = null, med = [];
  function AC() { return global.AudioContext || global.webkitAudioContext; }
  function register(ctx, node, label, opts) {
    var gain = opts && opts.gain; opts = opts || {};
    if (!ctx || !node) return;
    label = label || "Sound";
    for (var i = 0; i < list.length; i++) {
      if (list[i].node === node) return;
      if (list[i].ctx === ctx && list[i].label === label) { list[i].node = node; list[i].gain = gain; list[i].opts = opts; subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); return; }   // the same source, rebuilt (the band makes a new bus for each performance)
    }
    list.push({ ctx: ctx, node: node, label: label || "Sound", gain: gain, opts: opts });
    subs.slice().forEach(function (f) { try { f(); } catch (e) {} });
  }
  function sources() { return list.filter(function (e) { return e.ctx.state !== "closed"; }); }
  function changed() { subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function onChange(f) { subs.push(f); }
  function mediaElements() { return Array.prototype.slice.call(document.querySelectorAll("audio, video")); }
  function media(el) {
    for (var i = 0; i < med.length; i++) if (med[i].el === el) return med[i].entry;
    var A = AC(); if (!A) throw new Error("This browser has no Web Audio.");
    if (!mctx || mctx.state === "closed") mctx = new A();
    if (mctx.state === "suspended") mctx.resume();
    var node = mctx.createMediaElementSource(el);
    node.connect(mctx.destination);                       // the element must stay audible
    var entry = { ctx: mctx, node: node, label: "Media: " + (el.currentSrc || el.src || el.tagName).split("/").pop().slice(0, 40) };
    med.push({ el: el, entry: entry });
    return entry;
  }
  function canDisplay() { return !!(global.navigator && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }
  function display() {
    if (!canDisplay()) return Promise.reject(new Error("This browser can't capture another tab's sound (Chrome and Edge can)."));
    var A = AC(); if (!A) return Promise.reject(new Error("This browser has no Web Audio."));
    return navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }).then(function (stream) {
      stream.getVideoTracks().forEach(function (t) { t.stop(); });
      if (!stream.getAudioTracks().length) { stream.getTracks().forEach(function (t) { t.stop(); }); throw new Error("No sound was shared. Pick a browser tab and tick “Share tab audio” in the picker."); }
      var ctx = new A(), node = ctx.createMediaStreamSource(stream);
      return ctx.resume().then(function () {
        return { ctx: ctx, node: node, stream: stream, stop: function () { stream.getTracks().forEach(function (t) { t.stop(); }); try { node.disconnect(); } catch (e) {} try { ctx.close(); } catch (e) {} } };
      });
    }, function (e) {
      throw new Error(e && e.name === "NotAllowedError" ? "Sharing was cancelled. Pick a tab, and tick “Share tab audio”." : (e && (e.message || e.name)) || "Tab capture failed.");
    });
  }
  global.AudioTap = { register: register, sources: sources, onChange: onChange, changed: changed, mediaElements: mediaElements, media: media, display: display, canDisplay: canDisplay };
})(typeof window !== "undefined" ? window : globalThis);
