// rap-flow.js — flow grids for the Rap Flow lessons (lessons/rap-flow*.qmd). Global RapFlow.
//
// <div class="rf" data-bars="..." data-bpm="92" data-title="..." [data-edit] [data-drift="0.3"] [data-beat="boom|trap|none"]>
//   data-bars: bars separated by "|" (spaces ignored). A bar is 16 cells (sixteenths, Adams's 1 x y z grid) or,
//   with a leading "t:", 12 cells (eighth-note triplets, three to a beat: triplet flow). Cell letters:
//     .  no syllable      x  a syllable      X  an accented syllable
//     a b c ...  a rhymed syllable; the same letter = the same rhyme sound (coloured alike)
//     A B C ...  an accented rhymed syllable
//     -  the syllable before it is held (drawn as a longer note)
//   data-words (optional): syllables separated by spaces, one per onset in order (shown in the grid, "_" = none).
//   data-edit: click a cell to cycle . x X a b; the staff and the playback follow. "Clear" empties it.
//   data-drift: 0..1 plays the onsets off the grid the way Ohriner describes speech-rhythmic delivery: each phrase
//     (a run of onsets ended by a rest of a beat or more) starts behind the beat and slows down across the phrase. 0 = on the grid.
//   data-beat: the drum loop under it (boom = kick 1 and 3, snare 2 and 4, eighth hats; trap = half-time snare on 3,
//     sixteenth hats; none = a click on each beat).
// Every pattern on the lesson pages is made up for the page to show a technique a source describes: none is a transcription.
// The staff is ABC on a one-line percussion staff (rhymes lettered above, accents >), drawn by abcjs; bar lengths are checked by
// tests/lessons/rap-flow.test.js through RapFlow.abc. Sound: its own small oscillator kit (like polyrhythm.js), registered with AudioTap.
(function (global) {
  var COLORS = { a: "#d9480f", b: "#1971c2", c: "#2b8a3e", d: "#9c36b5", e: "#c2255c", f: "#e67700" };
  var CYCLE = [".", "x", "X", "a", "b", "c"];

  function parse(str) {
    return String(str || "").split("|").map(function (b) {
      b = b.replace(/\s+/g, "");
      var trip = /^t:/.test(b); if (trip) b = b.slice(2);
      var n = trip ? 12 : 16, cells = b.split("").slice(0, n);
      while (cells.length < n) cells.push(".");
      return { trip: trip, cells: cells };
    }).filter(function (b) { return b.cells.length; });
  }
  function serial(bars) { return bars.map(function (b) { return (b.trip ? "t:" : "") + b.cells.join(""); }).join(" | "); }
  function isOn(c) { return c !== "." && c !== "-"; }
  function rhyme(c) { return /[a-fA-F]/.test(c) ? c.toLowerCase() : null; }
  function accent(c) { return c === "X" || /[A-F]/.test(c); }

  // ABC for one bar: per beat, each onset lasts until the next onset or rest-break inside the beat.
  // "-" extends; "." is a rest. 16-cell bars use L:1/16; 12-cell bars are (3 triplets of eighths, L:1/16 so an eighth = 2.
  function barAbc(b) {
    var per = b.trip ? 3 : 4, out = [];
    for (var beat = 0; beat < 4; beat++) {
      var cells = b.cells.slice(beat * per, beat * per + per), toks = [], i = 0;
      if (b.trip) {   // one eighth-note triplet per cell (abcjs draws merged triplet values badly); an empty beat is a quarter rest
        if (!cells.some(isOn)) { out.push("z4"); continue; }
        out.push("(3" + cells.map(function (c) { return isOn(c) ? (rhyme(c) ? '"^' + rhyme(c) + '"' : "") + (accent(c) ? "!>!" : "") + "B2" : "z2"; }).join(""));
        continue;
      }
      while (i < per) {
        var c = cells[i], len = 1;
        if (isOn(c)) { while (i + len < per && cells[i + len] === "-") len++; }
        else { while (i + len < per && (cells[i + len] === "." || cells[i + len] === "-") && !isOn(cells[i + len])) len++; }
        var unit = b.trip ? 2 : 1, d = len * unit, ds = d === 1 ? "" : String(d);
        if (isOn(c)) toks.push((rhyme(c) ? '"^' + rhyme(c) + '"' : "") + (accent(c) ? "!>!" : "") + "B" + ds);
        else toks.push("z" + ds);
        i += len;
      }
      out.push(b.trip ? "(3:2:" + toks.length + toks.join("") : toks.join(""));
    }
    return out.join(" ");
  }
  // In a triplet beat with fewer than 3 tokens the (3:2:n form keeps the beat a quarter: abcjs scales the n notes' written
  // lengths (in L units, summing to 6) by 2/3, so the beat sums to 4 sixteenths.
  function abc(bars, bpm) {
    return "X:1\nM:4/4\nL:1/16\nQ:1/4=" + (bpm || 90) + "\nK:C clef=perc stafflines=1\n" +
      bars.map(barAbc).join(" | ") + " |]\n";
  }

  // onset times in beats (and their cell) for playback
  function onsets(bars) {
    var out = [];
    bars.forEach(function (b, bi) {
      var per = b.trip ? 3 : 4;
      b.cells.forEach(function (c, ci) { if (isOn(c)) out.push({ beat: bi * 4 + ci / per, bar: bi, cell: ci, c: c }); });
    });
    return out;
  }
  // Ohriner's speech-rhythmic delivery, sketched: a phrase starts a little behind the beat and slows across its length
  function drifted(list, drift) {
    if (!drift) return list.map(function (o) { return o.beat; });
    var res = [], start = 0;
    for (var i = 0; i <= list.length; i++) {
      if (i === list.length || (i > start && list[i].beat - list[i - 1].beat >= 1)) {
        var n = i - start;
        for (var k = 0; k < n; k++) {
          var o = list[start + k], frac = n > 1 ? k / (n - 1) : 0;
          res.push(o.beat + drift * (0.12 + 0.35 * frac * frac));
        }
        start = i;
      }
    }
    return res;
  }

  var ctx = null, out = null, noise = null, playing = null;
  function audio() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext; ctx = new AC();
      out = ctx.createGain(); out.gain.value = 0.8; out.connect(ctx.destination);
      if (global.AudioTap) try { AudioTap.register(ctx, out, "Rap Flow"); } catch (e) {}
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(t, peak, dec) { var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); g.connect(out); return g; }
  function tone(t, f, f2, dec, peak, type) { var o = ctx.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec); o.connect(env(t, peak, dec)); o.start(t); o.stop(t + dec + 0.02); }
  function hiss(t, hp, dec, peak) { var n = ctx.createBufferSource(), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; n.buffer = noise; n.connect(f); f.connect(env(t, peak, dec)); n.start(t); n.stop(t + dec + 0.02); }
  var DRUM = {
    kick: function (t) { tone(t, 130, 40, 0.3, 0.9); },
    snare: function (t) { hiss(t, 1500, 0.16, 0.45); tone(t, 220, 160, 0.08, 0.3, "triangle"); },
    hat: function (t, v) { hiss(t, 7000, 0.04, 0.16 * (v || 1)); },
    click: function (t) { tone(t, 1500, 0, 0.03, 0.25); }
  };
  // a syllable: a short "voice-ish" blip; accents louder, rhymes higher, each rhyme letter its own pitch
  var RF = { a: 660, b: 740, c: 587, d: 784, e: 554, f: 880 };
  function syllable(t, c) {
    var r = rhyme(c), f = r ? RF[r] : 440, peak = accent(c) ? 0.55 : 0.3;
    tone(t, f, f * 0.94, 0.09, peak, "square"); tone(t, f * 0.5, 0, 0.09, peak * 0.6, "triangle");
  }
  function beatAt(kind, t, beat, spb) {
    var b = beat % 4;
    if (kind === "none") { DRUM.click(t); return; }
    if (kind === "trap") {
      if (b === 0) DRUM.kick(t); if (b === 2) DRUM.snare(t);
      for (var k = 0; k < 4; k++) DRUM.hat(t + k * spb / 4, k ? 0.6 : 1);
      if (b === 3) DRUM.kick(t + spb * 0.75);
      return;
    }
    if (b === 0 || b === 2) DRUM.kick(t); if (b === 1 || b === 3) DRUM.snare(t);
    if (b === 2) DRUM.kick(t + spb * 0.5);
    DRUM.hat(t); DRUM.hat(t + spb / 2, 0.6);
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function mount(host) {
    if (host._rf) return host._rf;
    var bars = parse(host.getAttribute("data-bars")), bpm = +(host.getAttribute("data-bpm") || 90);
    var words = (host.getAttribute("data-words") || "").split(/\s+/).filter(Boolean);
    var edit = host.hasAttribute("data-edit"), drift = +(host.getAttribute("data-drift") || 0);
    var beatKind = host.getAttribute("data-beat") || "boom", title = host.getAttribute("data-title");
    host.innerHTML = "";
    if (title) host.appendChild(el("div", "rf-title", title));
    var bar = el("div", "rf-tools"), play = el("button", "btn btn-sm btn-outline-secondary rf-play", "▶ Play");
    bar.appendChild(play);
    var tempo = el("label", "rf-lab"); tempo.appendChild(document.createTextNode("BPM "));
    var tIn = el("input"); tIn.type = "number"; tIn.min = 50; tIn.max = 180; tIn.value = bpm; tIn.className = "rf-bpm"; tempo.appendChild(tIn); bar.appendChild(tempo);
    var bSel = el("select", "rf-beat"); [["boom", "Boom-bap beat"], ["trap", "Trap beat (half time)"], ["none", "Click only"]].forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; bSel.appendChild(op); }); bSel.value = beatKind;
    bar.appendChild(bSel);
    var dLab = null, dIn = null;
    if (host.hasAttribute("data-drift")) {
      dLab = el("label", "rf-lab"); dLab.appendChild(document.createTextNode("Off the grid "));
      dIn = el("input"); dIn.type = "range"; dIn.min = 0; dIn.max = 1; dIn.step = 0.05; dIn.value = drift; dLab.appendChild(dIn); bar.appendChild(dLab);
    }
    var showStaff = el("label", "rf-lab"), sCb = el("input"); sCb.type = "checkbox"; sCb.checked = true; showStaff.appendChild(sCb); showStaff.appendChild(document.createTextNode(" Staff")); bar.appendChild(showStaff);
    var clear = null; if (edit) { clear = el("button", "btn btn-sm btn-outline-secondary", "Clear"); bar.appendChild(clear); }
    host.appendChild(bar);
    var grid = el("div", "rf-grid"); host.appendChild(grid);
    var staff = el("div", "rf-staff"); host.appendChild(staff);
    var cellEls = [];

    function drawGrid() {
      grid.innerHTML = ""; cellEls = [];
      var wi = 0;
      bars.forEach(function (b, bi) {
        var row = el("div", "rf-row" + (b.trip ? " rf-trip" : "")), num = el("span", "rf-num", String(bi + 1)); row.appendChild(num);
        var per = b.trip ? 3 : 4, labs = b.trip ? ["", "trip", "let"] : ["", "e", "&", "a"];
        cellEls[bi] = [];
        b.cells.forEach(function (c, ci) {
          var d = el("span", "rf-cell"); d.setAttribute("data-c", c);
          if (ci % per === 0) d.classList.add("rf-beat-start");
          var lab = el("span", "rf-count", ci % per === 0 ? String(ci / per + 1) : labs[ci % per]); d.appendChild(lab);
          var w = el("span", "rf-word");
          if (isOn(c)) { var word = words[wi++]; w.textContent = word && word !== "_" ? word : (accent(c) ? "●" : "•"); }
          else if (c === "-") w.textContent = "—";
          d.appendChild(w);
          var r = rhyme(c); if (r) { d.style.background = COLORS[r] + "33"; d.style.borderColor = COLORS[r]; w.style.color = COLORS[r]; }
          if (accent(c)) d.classList.add("rf-acc");
          if (edit) d.addEventListener("click", function () { var k = CYCLE.indexOf(b.cells[ci]); b.cells[ci] = CYCLE[(k + 1) % CYCLE.length]; redraw(); });
          row.appendChild(d); cellEls[bi][ci] = d;
        });
        grid.appendChild(row);
      });
    }
    function drawStaff() {
      staff.style.display = sCb.checked ? "" : "none";
      if (!sCb.checked || !global.ABCJS) return;
      try { ABCJS.renderAbc(staff, abc(bars, +tIn.value), { responsive: "resize", paddingtop: 0, paddingbottom: 0, add_classes: true }); } catch (e) { staff.textContent = e.message; }
    }
    function redraw() { stop(); drawGrid(); drawStaff(); host.setAttribute("data-pattern", serial(bars)); }

    var timers = [];
    function stop() {
      timers.forEach(clearTimeout); timers = [];
      if (playing && playing.host === host) { playing.gains.forEach(function () {}); playing = null; }
      play.textContent = "▶ Play"; host.classList.remove("rf-on");
      grid.querySelectorAll(".rf-lit").forEach(function (e) { e.classList.remove("rf-lit"); });
      if (global.PlayBar && PlayBar.sounding) try { PlayBar.sounding("rf", null); } catch (e) {}
    }
    function start() {
      if (playing && playing.stop) playing.stop();
      audio();
      var spb = 60 / Math.max(40, +tIn.value || 90), t0 = ctx.currentTime + 0.15, nb = bars.length * 4;
      for (var b = -4; b < nb; b++) beatAt(bSel.value, t0 + (b + 4) * spb, (b + 4) % 4, spb); // one bar count-in, then the beat
      var list = onsets(bars), times = drifted(list, dIn ? +dIn.value : 0), lead = 4 * spb;
      list.forEach(function (o, i) {
        var t = t0 + lead + times[i] * spb; syllable(t, o.c);
        timers.push(setTimeout(function () {
          grid.querySelectorAll(".rf-lit").forEach(function (e) { e.classList.remove("rf-lit"); });
          var c = cellEls[o.bar] && cellEls[o.bar][o.cell]; if (c) c.classList.add("rf-lit");
        }, (t - ctx.currentTime) * 1000));
      });
      timers.push(setTimeout(stop, (t0 + lead + nb * spb - ctx.currentTime) * 1000 + 100));
      play.textContent = "■ Stop"; host.classList.add("rf-on");
      playing = { host: host, stop: stop, gains: [] };
      if (global.PlayBar && PlayBar.sounding) try { PlayBar.sounding("rf", stop); } catch (e) {}
    }
    play.addEventListener("click", function () { if (host.classList.contains("rf-on")) stop(); else start(); });
    tIn.addEventListener("change", drawStaff);
    sCb.addEventListener("change", drawStaff);
    if (clear) clear.addEventListener("click", function () { bars.forEach(function (b) { b.cells = b.cells.map(function () { return "."; }); }); redraw(); });
    redraw();
    host._rf = { bars: bars, abc: function () { return abc(bars, +tIn.value); }, play: start, stop: stop };
    return host._rf;
  }

  var CSS = ".rf{margin:1rem 0 1.4rem;padding:.7rem .8rem;border:1px solid var(--site-border,#ccc);border-radius:8px;background:var(--site-surface,#fafafa)}" +
    ".rf-title{font-weight:600;margin-bottom:.35rem}.rf-tools{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.5rem}" +
    ".rf-lab{font-family:var(--font-mono,monospace);font-size:.75rem;display:flex;align-items:center;gap:.3rem}.rf-bpm{width:4rem}" +
    ".rf-grid{overflow-x:auto}.rf-row{display:flex;gap:2px;margin:2px 0;align-items:stretch}" +
    ".rf-num{width:1.6rem;font-family:var(--font-mono,monospace);font-size:.7rem;color:var(--site-ink-2,#666);align-self:center}" +
    ".rf-cell{flex:1 0 2.1rem;min-width:2.1rem;border:1px solid var(--site-border,#ccc);border-radius:3px;background:var(--site-bg,#fff);text-align:center;padding:1px 0;cursor:default;display:flex;flex-direction:column}" +
    ".rf-trip .rf-cell{flex-basis:2.8rem}.rf-beat-start{border-left:2px solid var(--site-ink-2,#888)}" +
    ".rf-count{font-family:var(--font-mono,monospace);font-size:.6rem;color:var(--site-ink-2,#888)}.rf-word{font-size:.8rem;min-height:1.1rem;white-space:nowrap;overflow:hidden}" +
    ".rf-acc .rf-word{font-weight:700}.rf[data-edit] .rf-cell{cursor:pointer}.rf-lit{outline:2px solid var(--site-accent,#d9480f);outline-offset:-1px}" +
    ".rf-staff{background:#fff;border-radius:6px;margin-top:.5rem;max-width:48rem}";

  function init(root) {
    if (!document.getElementById("rf-css")) { var s = el("style"); s.id = "rf-css"; s.textContent = CSS; document.head.appendChild(s); }
    (root || document).querySelectorAll(".rf").forEach(mount);
  }
  global.RapFlow = { parse: parse, abc: abc, barAbc: barAbc, onsets: onsets, drifted: drifted, mount: mount, init: init };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); }); else init();
  }
  if (typeof module !== "undefined") module.exports = global.RapFlow;
})(typeof window !== "undefined" ? window : globalThis);
