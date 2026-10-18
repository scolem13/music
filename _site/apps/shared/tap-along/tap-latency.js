// tap-latency.js — Tap Latency (tools/tap-latency.qmd): how late each of Tap Along's three pad buttons lands behind the beat
// you hear. A metronome counts in four, then you tap button 1 on twelve beats, then button 2, then button 3. Each tap is
// compared with when its click came out of the speaker (AudioContext.getOutputTimestamp, else outputLatency); the median of
// the last ten is the button's lag. Save keeps them in localStorage 'tap-latency-v1' ({ bar, chord, section } in ms), which
// Tap Along takes off every tap. Measure on the phone and headphones / speaker you will mark songs with.
(function (global) {
  "use strict";
  var LAT = "tap-latency-v1", KINDS = ["bar", "chord", "section"], NAMES = ["1 · Bar", "2 · Chord", "3 · Section"];
  var COUNT_IN = 4, TAPS = 12, SKIP = 2;

  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length; return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }
  // the middle half's spread, halved: a steady tapper gets 10-20 ms
  function spread(a) { var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length; return n > 3 ? (s[Math.floor(n * .75)] - s[Math.floor(n * .25)]) / 2 : null; }

  function init(root) {
    var q = function (s) { return root.querySelector(s); };
    var keys = root.querySelectorAll(".ta-key"), cue = q(".ta-cue"), out = q(".ta-results"), go = q(".ta-go"), bpmIn = q(".ta-bpm");
    var ctx = null, beats = [], taps = [[], [], []], phase = -1, raf = 0, result = null;

    // when the click at context time ct reaches the ear, on the performance.now() clock
    function heard(ct) {
      var ts = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0) return ts.performanceTime + (ct - ts.contextTime) * 1000;
      return performance.now() + (ct - ctx.currentTime + (ctx.outputLatency || ctx.baseLatency || 0)) * 1000;
    }
    function click(t, hi) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = hi ? 1600 : 1000;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.06);
    }

    function start() {
      ctx = ctx || new (global.AudioContext || global.webkitAudioContext)();
      ctx.resume();
      if (global.AudioTap) try { global.AudioTap.register(ctx, ctx.destination, "Tap Latency"); } catch (e) {}
      var spb = 60 / (+bpmIn.value || 100), t0 = ctx.currentTime + 0.6;
      beats = []; taps = [[], [], []]; result = null; out.innerHTML = "";
      for (var p = 0; p < 3; p++) for (var b = 0; b < COUNT_IN + TAPS; b++) {
        var t = t0 + (p * (COUNT_IN + TAPS) + b) * spb;
        beats.push({ t: t, p: p, b: b }); click(t, b < COUNT_IN);
      }
      go.textContent = "Stop"; cancelAnimationFrame(raf); watch();
    }
    function stop(done) {
      if (ctx && !done) { ctx.close(); ctx = null; }
      phase = -1; cancelAnimationFrame(raf); go.textContent = "Start again";
      keys.forEach(function (k) { k.classList.remove("is-cue"); k.disabled = false; });
      if (!done) cue.textContent = "Stopped.";
    }
    // the cue follows the clicks: "get ready" over the count-in, then which button
    function watch() {
      var t = ctx.currentTime, cur = null;
      beats.forEach(function (x) { if (x.t <= t + 0.02) cur = x; });
      var last = beats[beats.length - 1];
      if (t > last.t + 0.5) { stop(true); finish(); return; }
      if (cur) {
        phase = cur.p;
        cue.textContent = cur.b < COUNT_IN ? "Get ready: button " + NAMES[cur.p] + " … " + (COUNT_IN - cur.b)
                                           : "Tap " + NAMES[cur.p] + " on every click (" + (TAPS - (cur.b - COUNT_IN)) + " left)";
      } else { phase = 0; cue.textContent = "Listen…"; }
      keys.forEach(function (k, i) { k.classList.toggle("is-cue", i === phase); k.disabled = i !== phase; });
      raf = requestAnimationFrame(watch);
    }
    function tap(i, stamp) {
      if (!ctx || i !== phase) return;
      keys[i].classList.add("is-hit"); setTimeout(function () { keys[i].classList.remove("is-hit"); }, 110);
      // nearest click of this button's run, in ms (positive: the tap came after the click)
      var best = null;
      beats.forEach(function (x) {
        if (x.p !== i || x.b < COUNT_IN) return;
        var d = stamp - heard(x.t);
        if (best == null || Math.abs(d) < Math.abs(best.d)) best = { d: d, b: x.b };
      });
      if (best && Math.abs(best.d) < 30000 / (+bpmIn.value || 100)) taps[i].push(best);
    }
    function finish() {
      cue.textContent = "Done.";
      result = {};
      var rows = KINDS.map(function (k, i) {
        var ds = taps[i].filter(function (x) { return x.b >= COUNT_IN + SKIP; }).map(function (x) { return x.d; });
        var m = median(ds), s = spread(ds);
        if (m != null && ds.length >= 5) result[k] = Math.round(m);
        return "<tr><td>" + NAMES[i] + "</td><td>" + ds.length + "</td><td>" + (m == null ? "—" : Math.round(m) + " ms") + "</td><td>" +
          (s == null ? "—" : "±" + Math.round(s) + " ms") + "</td></tr>";
      });
      var ok = Object.keys(result).length;
      out.innerHTML = '<table class="ta-table"><tr><th>Button</th><th>Taps</th><th>Lag</th><th>Spread</th></tr>' + rows.join("") + "</table>" +
        (ok ? '<div class="ta-row"><button type="button" class="ta-keep">Save for Tap Along</button><span class="ta-muted ta-saved"></span></div>' :
          '<p class="ta-muted">Too few taps landed near the clicks to measure. Try again.</p>');
      var keep = out.querySelector(".ta-keep");
      if (keep) keep.addEventListener("click", function () {
        var was = {}; try { was = JSON.parse(localStorage.getItem(LAT) || "{}") || {}; } catch (e) {}
        Object.keys(result).forEach(function (k) { was[k] = result[k]; });
        was.measured = new Date().toISOString();
        try { localStorage.setItem(LAT, JSON.stringify(was)); out.querySelector(".ta-saved").textContent = "Saved."; }
        catch (e) { out.querySelector(".ta-saved").textContent = "This browser would not save it."; }
        showSaved();
      });
    }
    function showSaved() {
      var s = null; try { s = JSON.parse(localStorage.getItem(LAT) || "null"); } catch (e) {}
      q(".ta-current").textContent = s ? "Saved now: " + KINDS.map(function (k, i) { return (i + 1) + " " + (s[k] != null ? s[k] + " ms" : "—"); }).join(", ") +
        (s.measured ? " (" + new Date(s.measured).toLocaleString() + ")" : "") : "Nothing saved yet.";
    }

    go.addEventListener("click", function () { go.textContent === "Stop" ? stop() : start(); });
    keys.forEach(function (b, i) {
      b.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        tap(i, e.timeStamp > 1e3 && Math.abs(e.timeStamp - performance.now()) < 1e3 ? e.timeStamp : performance.now());
      });
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    });
    document.addEventListener("keydown", function (e) {
      var i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0 && !e.repeat) { tap(i, e.timeStamp > 1e3 ? e.timeStamp : performance.now()); e.preventDefault(); }
    });
    showSaved();
    root._ta = { heard: function (t) { return heard(t); }, beats: function () { return beats; } };   // for tests
  }

  var api = { init: init, median: median, spread: spread };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TapLatency = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () {
    var r = document.querySelector(".ta-latency"); if (r) init(r);
  });
})(typeof window !== "undefined" ? window : globalThis);
