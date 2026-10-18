// tap-along.js — Tap Along (tools/tap-along.qmd): chords and words on a phone, marked against a song playing in any other app.
// Plain script, one global (TapAlong); needs ug-chordpro.js (UgChordPro) for pasted Ultimate Guitar text.
//
// The page has its own clock, nothing to do with the other app. Mark: press Start (or any pad button) as the song starts, tap
//   1 Bar on each downbeat, 2 Chord on each chord change (the sheet's chords in order), 3 Section where each section starts.
//   One pass without pausing the other app keeps every tap consistent with the others; Pause here if you pause there.
// Play: tap Sync (button 1) on the downbeat of the first tapped bar and the clock jumps there; the sheet follows. ±0.1 s nudge.
// Each tap has the button's own lag taken off it (localStorage 'tap-latency-v1', measured on tools/tap-latency.qmd).
// Song file (.json): { app: 'tap-along', version: 1, title, chordpro, taps: [{ t, k: 'bar'|'chord'|'section' }] }; the
//   chord and section a tap stands for is its place among the taps of its kind (the 3rd chord tap is the sheet's 3rd chord).
(function (global) {
  "use strict";
  var STORE = "tap-along-doc", LAT = "tap-latency-v1", KINDS = ["bar", "chord", "section"];

  function load(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function fmt(t) {
    var neg = t < 0; t = Math.abs(t);
    var m = Math.floor(t / 60), s = t - m * 60;
    return (neg ? "−" : "") + m + ":" + (s < 10 ? "0" : "") + s.toFixed(1);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ChordPro, or Ultimate Guitar text turned into it: ChordPro has inline [G] chords or {directives}
  function toChordPro(text) {
    var isCho = /^\s*\{[a-z_]+/m.test(text) || /\[([^\]\s]+)\]/.test(text) && (text.match(/\[([^\]\s]+)\]/g) || []).some(function (b) {
      return global.UgChordPro && global.UgChordPro.isChord(b.slice(1, -1));
    });
    return isCho || !global.UgChordPro ? text : global.UgChordPro.convert(text).chordpro;
  }

  // -> { title, sections: [name], chords: count, lines: [{ head: secIndex } | { segs: [{ c: chordIndex|null, name, text }], only }] }
  function parse(cho) {
    var out = { title: "", sections: [], chords: 0, lines: [] }, grid = false;
    String(cho || "").split(/\r?\n/).forEach(function (raw) {
      var l = raw.replace(/\s+$/, ""), m;
      if ((m = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(l))) {
        var d = m[1].toLowerCase(), v = m[2] || "";
        if (d === "title" || d === "t") out.title = v;
        else if (d === "start_of_grid" || d === "sog") grid = true;
        else if (d === "end_of_grid" || d === "eog") grid = false;
        else if (/^start_of_/.test(d) || d === "comment" || d === "c" || /^so[cvb]$/.test(d)) {
          var name = v || d.replace(/^start_of_/, "").replace(/^so/, "");
          out.lines.push({ head: out.sections.length }); out.sections.push(name);
        }
        return;
      }
      if (grid || !l.trim()) return;
      var segs = [], re = /\[([^\]]+)\]/g, pos = 0, cur = { c: null, name: "", text: "" };
      while ((m = re.exec(l))) {
        cur.text = l.slice(pos, m.index);
        if (cur.text || cur.name) segs.push(cur);
        cur = { c: out.chords++, name: m[1], text: "" }; pos = re.lastIndex;
      }
      cur.text = l.slice(pos); segs.push(cur);
      var only = segs.every(function (s) { return !s.text.replace(/[\s|]/g, ""); });
      if (only) segs.forEach(function (s) { s.text = ""; });
      out.lines.push({ segs: segs.filter(function (s) { return s.name || s.text; }), only: only });
    });
    return out;
  }

  function init(root) {
    var doc = load(STORE) || { app: "tap-along", version: 1, title: "", chordpro: "", taps: [] };
    var lat = load(LAT) || {};
    var sheet, mode = "mark", running = false, base = 0, pausedAt = 0, shown = {};
    var q = function (s) { return root.querySelector(s); };
    var el = {
      clock: q(".ta-clock"), bar: q(".ta-bar"), sec: q(".ta-sec"), sheet: q(".ta-sheet"), text: q(".ta-text"), title: q(".ta-title"),
      info: q(".ta-info"), lat: q(".ta-lat"), keys: root.querySelectorAll(".ta-key"), go: q(".ta-go"), undo: q(".ta-undo"),
      modeB: q(".ta-mode"), minus: q(".ta-minus"), plus: q(".ta-plus"), clear: q(".ta-clear"), big: q(".ta-big")
    };

    function now() { return running ? (performance.now() - base) / 1000 : pausedAt; }
    function setNow(t) { if (running) base = performance.now() - t * 1000; else pausedAt = t; tick(true); }
    function play() { if (!running) { base = performance.now() - pausedAt * 1000; running = true; loop(); } paint(); }
    function pause() { if (running) { pausedAt = now(); running = false; } paint(); }
    function store() { save(STORE, doc); }

    // the taps of one kind, in time order
    function of(k) { return doc.taps.filter(function (x) { return x.k === k; }).sort(function (a, b) { return a.t - b.t; }); }
    function countTo(k, t) { var n = 0; of(k).forEach(function (x) { if (x.t <= t + 1e-3) n++; }); return n; }

    function render() {
      sheet = parse(doc.chordpro);
      el.title.value = doc.title || sheet.title || "";
      var h = "";
      sheet.lines.forEach(function (ln) {
        if (ln.head != null) { h += '<div class="ta-head" data-s="' + ln.head + '">' + esc(sheet.sections[ln.head]) + "</div>"; return; }
        h += '<div class="ta-line' + (ln.only ? " ta-chordline" : "") + '">' + ln.segs.map(function (s) {
          return '<span class="ta-seg"><b class="ta-ch"' + (s.c != null ? ' data-c="' + s.c + '"' : "") + ">" + esc(s.name) + "</b>" +
            "<span>" + (esc(s.text) || (ln.only ? "" : " ")) + "</span></span>";
        }).join("") + "</div>";
      });
      el.sheet.innerHTML = h || '<p class="ta-muted">Paste chords and words below (Ultimate Guitar or ChordPro). Bars and sections can be tapped without them.</p>';
      shown = {}; tick(true);
    }

    // highlights: the chord / section in force at the clock, the next chord outlined
    function tick(force) {
      var t = now(), ci = countTo("chord", t) - 1, si = countTo("section", t) - 1, bi = countTo("bar", t);
      el.clock.textContent = fmt(t);
      el.bar.textContent = bi ? "Bar " + bi : "";
      el.sec.textContent = si >= 0 ? (sheet.sections[si] || "Section " + (si + 1)) : "";
      if (!force && shown.c === ci && shown.s === si) return;
      shown = { c: ci, s: si };
      el.sheet.querySelectorAll(".ta-ch[data-c]").forEach(function (b) {
        var c = +b.dataset.c;
        b.classList.toggle("is-now", c === ci); b.classList.toggle("is-next", c === ci + 1); b.classList.toggle("is-done", c < ci);
      });
      el.sheet.querySelectorAll(".ta-head").forEach(function (b) { b.classList.toggle("is-now", +b.dataset.s === si); });
      var cur = el.sheet.querySelector(".ta-ch.is-now") || el.sheet.querySelector(".ta-head.is-now");
      if (cur && running) {
        var r = cur.getBoundingClientRect(), padTop = q(".ta-pad").getBoundingClientRect().top;
        if (r.top < 90 || r.bottom > padTop - 40) cur.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    function loop() { if (!running) return; tick(); requestAnimationFrame(loop); }

    function paint() {
      var marking = mode === "mark";
      el.modeB.textContent = marking ? "Switch to Play" : "Switch to Mark";
      el.go.textContent = running ? "Pause" : (now() > 0 ? "Resume" : "Start");
      el.undo.hidden = !marking; el.clear.hidden = !marking;
      el.minus.hidden = el.plus.hidden = marking;
      var labels = marking ? ["Bar", "Chord", "Section"] : ["Sync", null, null];
      el.keys.forEach(function (b, i) {
        b.hidden = !labels[i];
        if (labels[i]) b.innerHTML = labels[i] + "<small>" + (marking ? (i + 1) + " · " + (lat[KINDS[i]] != null ? "−" + Math.round(lat[KINDS[i]]) + " ms" : "no lag set") :
          "on the first tapped bar") + "</small>";
      });
      var n = {}; KINDS.forEach(function (k) { n[k] = of(k).length; });
      el.info.textContent = n.bar + " bars, " + n.chord + " of " + sheet.chords + " chords, " + n.section + " of " + sheet.sections.length + " sections tapped";
      el.lat.textContent = KINDS.some(function (k) { return lat[k] != null; }) ?
        "Tap lag taken off: " + KINDS.map(function (k, i) { return (i + 1) + " " + (lat[k] != null ? Math.round(lat[k]) + " ms" : "—"); }).join(", ") + "." :
        "No tap lag measured yet.";
    }

    function flash(b) { b.classList.add("is-hit"); setTimeout(function () { b.classList.remove("is-hit"); }, 110); }
    function press(i, stamp) {
      var key = el.keys[i];
      if (mode === "play") {
        if (i !== 0) return;
        var first = of("bar")[0] || doc.taps.slice().sort(function (a, b) { return a.t - b.t; })[0];
        var t = (first ? first.t : 0) + (performance.now() - stamp) / 1000 + (lat.bar || 0) / 1000;
        if (!running) { pausedAt = t; play(); } else setNow(t);
        flash(key); return;
      }
      if (!running) { pausedAt = 0; play(); }
      var k = KINDS[i];
      doc.taps.push({ t: Math.round(((stamp - base) - (lat[k] || 0))) / 1000, k: k });
      store(); flash(key); tick(true); paint();
    }
    el.keys.forEach(function (b, i) {
      b.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        var s = e.timeStamp > 1e3 && Math.abs(e.timeStamp - performance.now()) < 1e3 ? e.timeStamp : performance.now();
        press(i, s);
      });
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    });
    document.addEventListener("keydown", function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.repeat || e.metaKey || e.ctrlKey) return;
      var i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) { press(i, e.timeStamp > 1e3 ? e.timeStamp : performance.now()); e.preventDefault(); }
      else if (e.key === " ") { running ? pause() : play(); e.preventDefault(); }
    });

    el.go.addEventListener("click", function () { running ? pause() : play(); });
    el.undo.addEventListener("click", function () {
      if (!doc.taps.length) return;
      var last = 0; doc.taps.forEach(function (x, i) { if (x.t >= doc.taps[last].t) last = i; });
      doc.taps.splice(last, 1); store(); tick(true); paint();
    });
    el.clear.addEventListener("click", function () {
      if (doc.taps.length && !confirm("Forget all " + doc.taps.length + " taps and start the clock again from 0?")) return;
      doc.taps = []; running = false; pausedAt = 0; store(); tick(true); paint();
    });
    el.modeB.addEventListener("click", function () { mode = mode === "mark" ? "play" : "mark"; pause(); paint(); });
    el.minus.addEventListener("click", function () { setNow(now() - 0.1); });
    el.plus.addEventListener("click", function () { setNow(now() + 0.1); });
    el.big.addEventListener("click", function () { el.sheet.classList.toggle("is-big"); });
    q(".ta-rewind").addEventListener("click", function () { pause(); pausedAt = 0; tick(true); paint(); });

    q(".ta-use").addEventListener("click", function () {
      var cho = toChordPro(el.text.value);
      if (doc.taps.some(function (x) { return x.k !== "bar"; }) && cho !== doc.chordpro &&
          !confirm("The chord and section taps stay, matched to the new sheet in order. Go on?")) return;
      doc.chordpro = cho; el.text.value = cho; store(); render(); paint();
    });
    el.title.addEventListener("change", function () { doc.title = el.title.value; store(); });
    q(".ta-save").addEventListener("click", function () {
      var name = (doc.title || sheet.title || "song").replace(/[^\w\- ]+/g, "").trim() || "song";
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 1) + "\n"], { type: "application/json" }));
      a.download = name + ".tap-along.json"; document.body.appendChild(a); a.click(); a.remove();
    });
    var file = q(".ta-file");
    q(".ta-open").addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () {
      var f = file.files[0]; if (!f) return;
      f.text().then(function (s) {
        var d = JSON.parse(s);
        if (d.app !== "tap-along") throw new Error("not a Tap Along song file");
        doc = { app: "tap-along", version: 1, title: d.title || "", chordpro: d.chordpro || "", taps: d.taps || [] };
        el.text.value = doc.chordpro; running = false; pausedAt = 0; store(); render(); paint();
      }).catch(function (e) { alert("Could not open it: " + e.message); });
      file.value = "";
    });
    window.addEventListener("storage", function (e) { if (e.key === LAT) { lat = load(LAT) || {}; paint(); } });

    el.text.value = doc.chordpro;
    if (!doc.chordpro) q(".ta-paste").open = true;
    render(); paint();
  }

  var api = { parse: parse, toChordPro: toChordPro, init: init, KINDS: KINDS, LAT: LAT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TapAlong = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () {
    var r = document.querySelector(".ta-along"); if (r) init(r);
  });
})(typeof window !== "undefined" ? window : globalThis);
