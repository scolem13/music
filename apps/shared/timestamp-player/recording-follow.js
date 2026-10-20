/* A recording and its bar map, for the pages that make music from it (the Backing Track, the Notation page).
   Timestamp Notes' song file (.json: stamps, barMap, source; also the older bar-map .json) says where each bar of the recording
   falls; this puts the recording in a panel (the Timestamp Notes player, player.js, so a file or a YouTube link) and answers
   "where is bar n", "which bar is it at", "how fast is bar n". Needs player.js and player.css on the page.

     var rf = RecordingFollow.mount(el, { onLoad(model), onSource(src) });   // builds the panel into el
     rf.load(text | object)         read a song file / bar map (the panel's Open button does this); -> model or null
     rf.model()                     { title, bars: [seconds], beats: [per bar], sections: [{ name, bar (0-based), time }], source, stamps } | null
     rf.offset()                    how many bars of the recording come before the host's bar 1 (the panel's number box)
     rf.seekHostBar(i) / seekMapBar(i) / seekSection(name, nth)    move the recording (true when it could)
     rf.seekHostAt(x)               x: the host's bar and fraction (2.5 = halfway through bar 3); before bar 1 at bar 1's pace
     rf.hostBarNow()                the host's bar the recording is at (0-based, can be < 0 or past the end), or null
     rf.sectionAt(t)                { name, nth } of the map's section at time t
     rf.bpmForHostBar(i, mode)      mode 'bar' (that bar's own), 'smooth' (3 bars averaged), 'steady' (the median); null off the map
     rf.play() / pause() / playing() / time()    the recording
   Pure helpers (no DOM), for tests: RecordingFollow.parse(text), RecordingFollow.Model(obj). */
(function (root) {
  "use strict";

  function round(x, n) { var k = Math.pow(10, n || 3); return Math.round(x * k) / k; }

  function Model(d) {
    var bars = (d.bars || []).map(Number).filter(isFinite);
    var m = { title: d.title || "", bars: bars, beats: [], sections: [], source: d.source || null, stamps: d.stamps || [], beatsPerBar: d.beatsPerBar || 4 };
    for (var i = 0; i < bars.length; i++) m.beats.push(d.beats && d.beats[i] > 0 ? d.beats[i] : m.beatsPerBar);
    (d.sections || []).forEach(function (s) {
      var bar = s.bar != null ? s.bar - 1 : -1;                            // (the file counts from 1)
      if (bar < 0 && s.time != null) bar = barAt(s.time);
      if (bar >= 0 && bar < bars.length) m.sections.push({ name: String(s.name), bar: bar, time: s.time != null ? +s.time : bars[bar] });
    });
    function barAt(t) {                                                      // the bar t falls in (-1 before the first)
      var lo = -1;
      for (var k = 0; k < bars.length; k++) { if (bars[k] <= t + 1e-6) lo = k; else break; }
      return lo;
    }
    m.barAt = barAt;
    // a bar's length: its own gap to the next downbeat; the last bar has none of its own, so it borrows the one before
    m.lenOf = function (i) {
      if (i < 0 || i >= bars.length) return NaN;
      if (i + 1 < bars.length) return bars[i + 1] - bars[i];
      return i > 0 ? bars[i] - bars[i - 1] : NaN;
    };
    m.bpmOf = function (i) { var l = m.lenOf(i); return l > 0 ? m.beats[i] * 60 / l : null; };
    m.steady = function () {
      var list = []; for (var i = 0; i < bars.length - 1; i++) { var b = m.bpmOf(i); if (b) list.push(b); }
      list.sort(function (a, b) { return a - b; });
      return list.length ? list[list.length >> 1] : null;
    };
    m.smoothBpm = function (i) {                                             // beats over seconds across the bars i-1..i+1
      var a = Math.max(0, i - 1), z = Math.min(bars.length - 2, i + 1), beats = 0, secs = 0;
      for (var k = a; k <= z; k++) { beats += m.beats[k]; secs += m.lenOf(k); }
      return secs > 0 ? beats * 60 / secs : m.bpmOf(i);
    };
    // the nth (0-based) section called name, case and spacing aside
    var norm = function (s) { return String(s).toLowerCase().replace(/\s+/g, " ").trim(); };
    m.findSection = function (name, nth) {
      var hits = m.sections.filter(function (s) { return norm(s.name) === norm(name); });
      return hits[nth || 0] || null;
    };
    m.sectionAt = function (t) {
      var b = barAt(t), at = null, nth = 0, seen = {};
      m.sections.forEach(function (s) { var k = norm(s.name); if (s.bar <= b) { at = s; nth = seen[k] || 0; } seen[k] = (seen[k] || 0) + 1; });
      return at ? { name: at.name, nth: nth, bar: at.bar } : null;
    };
    return m;
  }

  // text or object -> a Model, or null when it is neither a song file nor a bar map
  function parse(x) {
    var d = x;
    if (typeof x === "string") { try { d = JSON.parse(x); } catch (e) { return null; } }
    if (!d || typeof d !== "object") return null;
    if (d.app === "timestamp-notes") {
      var bm = d.barMap;
      if (!bm || !Array.isArray(bm.bars) || !bm.bars.length) return null;
      return Model({ title: d.title, source: d.source, stamps: d.stamps, bars: bm.bars, beats: bm.beats, beatsPerBar: bm.beatsPerBar, sections: bm.sections });
    }
    if (Array.isArray(d.bars) && d.bars.length) return Model(d);
    return null;
  }

  function mount(el, opts) {
    opts = opts || {};
    el.classList.add("rf");
    el.innerHTML =
      '<div class="rf-bar"><label class="rf-open"><span class="rf-open-btn">Open song file or bar map</span><input type="file" class="rf-song" accept=".json,application/json" hidden></label>' +
      '<span class="rf-info" role="status"></span></div>' +
      '<div class="btp rf-btp">' +
      '<div class="btp-clock idle">00:00</div><div class="btp-stage" hidden></div><div class="btp-drop">Drop a video or audio file here</div>' +
      '<div class="btp-bar"><input class="btp-url" type="text" placeholder="Paste a YouTube link…" spellcheck="false"><button class="btp-load" type="button">Load</button>' +
      '<button class="btp-follow-btn" type="button" title="Play it in YouTube\'s own tab and keep the clock here">Follow in a tab</button>' +
      '<label class="btp-filebtn">Choose file<input class="btp-file" type="file" accept="video/*,audio/*"></label></div><div class="btp-err"></div></div>' +
      '<div class="rf-row"><label>The chart’s bar 1 is the recording’s bar <input type="number" class="rf-off" min="1" value="1"></label></div>';
    var q = function (s) { return el.querySelector(s); }, info = q(".rf-info"), btp = q(".rf-btp"), model = null, offIn = q(".rf-off");
    if (root.TimestampPlayer) root.TimestampPlayer.init(btp);
    var P = function () { return btp._btp || {}; };
    // the player's Speed row shows the tempo it plays at: the map's tempo (3 bars averaged) where the recording is
    btp._btpBpm = function (t) { if (!model) return null; if (!model.bars.length) return null; return model.smoothBpm(Math.max(0, model.barAt(t))); };

    function offset() { return Math.max(0, (parseInt(offIn.value, 10) || 1) - 1); }
    function say(t) { info.textContent = t || ""; }
    var rf = {
      el: el,
      model: function () { return model; },
      offset: offset,
      say: say,
      player: function () { return btp._btp || null; },
      time: function () { var t = P().time && P().time(); return typeof t === "number" ? t : null; },
      playing: function () { return !!(P().playing && P().playing()); },
      play: function () { if (!rf.playing() && P().toggle) P().toggle(); },
      pause: function () { if (rf.playing() && P().toggle) P().toggle(); },
      load: function (x) {
        var m = parse(x);
        if (!m) { say("That is not a Timestamp Notes song file or bar map."); return null; }
        model = m;
        var src = m.source, note = "", p = btp._btp || {};
        if (src && src.url && p.open && !(p.source && p.source() && p.source().url === src.url)) { if (p.open(src.url, src.follow)) note = " Loaded the video."; }
        else if (src && src.file && !(p.source && p.source() && p.source().file === src.file)) note = " Choose " + src.file + " to play along.";
        say((m.title ? "“" + m.title + "”: " : "") + m.bars.length + " bars" + (m.sections.length ? ", " + m.sections.length + " sections" : "") + "." + note);
        if (opts.onLoad) opts.onLoad(m);
        return m;
      },
      seekMapBar: function (i) {
        if (!model || i < 0 || i >= model.bars.length) return false;
        var p = P(); return p.seek ? p.seek(model.bars[i]) : false;
      },
      seekHostBar: function (i) { return rf.seekMapBar(i + offset()); },
      seekHostAt: function (x) {
        if (!model || !model.bars.length) return false;
        var y = x + offset(), b = Math.floor(y), p = P();
        if (b >= model.bars.length || !p.seek) return false;
        var k = Math.max(0, b), len = model.lenOf(k);
        if (!(len > 0)) len = 2;
        return p.seek(Math.max(0, model.bars[k] + (y - k) * len));
      },
      seekSection: function (name, nth) {
        var s = model && model.findSection(name, nth); if (!s) return false;
        var p = P(); return p.seek ? p.seek(s.time) : false;
      },
      hostBarNow: function () { var t = rf.time(); return model && t != null ? model.barAt(t) - offset() : null; },
      sectionAt: function (t) { return model ? model.sectionAt(t) : null; },
      bpmForHostBar: function (i, mode) {
        if (!model) return null; var k = i + offset(); if (k < 0 || k >= model.bars.length) return null;
        var b = mode === "steady" ? model.steady() : mode === "smooth" ? model.smoothBpm(k) : model.bpmOf(k);
        return b ? round(b, 1) : null;
      }
    };
    q(".rf-song").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) { rf.load(t); e.target.value = ""; });
    });
    offIn.addEventListener("keydown", function (e) { e.stopPropagation(); });
    // where the recording is, in words
    setInterval(function () {
      if (!model || !rf.playing()) return;
      var t = rf.time(), b = t == null ? -1 : model.barAt(t), s = t == null ? null : model.sectionAt(t);
      if (b >= 0) say("Recording at bar " + (b + 1) + (s ? " · " + s.name : "") + " (" + Math.round(model.bpmOf(b) || 0) + " bpm)");
    }, 250);
    return rf;
  }

  root.RecordingFollow = { parse: parse, Model: Model, mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = root.RecordingFollow;
})(typeof window !== "undefined" ? window : globalThis);
