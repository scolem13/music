// groove-editor.js — the Drumset tool: a grid to write a groove in, the staff it makes, and the band's drummer playing it
// (GrooveEditor). The groove itself, its text and its notation are groove.js; the sound is the band's (BandPlayer with a chart
// of empty bars and opts.written, so the count-in, the scheduler, the mixer and the kit are the Backing Track's).
//
//   var ed = GrooveEditor.create(host, { text, url: true })
//        host   an empty element; the editor builds itself inside it
//        text   the groove to open with (BandGroove text); else the page's address, else a rock beat
//        url    true (default) = every change rewrites the page's address, which is the save file
//   ed.groove()  ed.text()  ed.load(text)  ed.play()  ed.stop()  ed.undo()  ed.redo()
//
// The grid: one row per lane, one column per cell. A click puts the lane's current mark in a cell, or takes out what is
// there; dragging goes on doing whichever the first cell did. A right-click or a long press on a cell opens the lane's
// marks (as does the lane's name): the one chosen is put in that cell and is what clicks in that lane write from then on.
// Pieces the kit has no sample for yet say so in that list and are written but not heard.
// Counting under the columns: localStorage.countingStyle ("Standard" | "Eastman" | "Gordon"), which the tune pages set.

(function (global) {
  var B = global.BandGroove;
  var ROWS = [
    { lane: "H", name: "Cymbals", brush: "x" },
    { lane: "T1", name: "High tom", brush: "o", group: "toms" }, { lane: "T2", name: "Mid tom", brush: "o", group: "toms" },
    { lane: "T3", name: "Low tom", brush: "o", group: "toms", rare: true }, { lane: "T4", name: "Floor tom", brush: "o", group: "toms" },
    { lane: "S", name: "Snare", brush: "o" }, { lane: "K", name: "Kick, foot", brush: "o" },
    { lane: "Stickings", name: "Sticking", brush: "R", group: "stick" },
    { lane: "Cg", name: "Conga", brush: "O", group: "hands" }, { lane: "Tb", name: "Tumba", brush: "O", group: "hands" }
  ];
  var GROUPS = { toms: "Toms", stick: "Sticking", hands: "Congas" };
  // what a cell shows: [text, class]
  var GLYPH = {
    H: { x: ["×"], X: ["×", "acc"], o: ["○"], "+": ["+"], r: ["rd", "txt"], b: ["bell", "txt"], c: ["cr", "txt"], s: ["stk", "txt"], m: ["cb", "txt"], n: ["·"], N: ["•"] },
    S: { o: ["●"], O: ["●", "acc"], g: ["●", "ghost"], x: ["×"], f: ["fl", "txt"], d: ["dr", "txt"], b: ["bz", "txt"] },
    K: { o: ["●"], x: ["×"], X: ["●×"] },
    Stickings: { R: ["R", "txt"], L: ["L", "txt"], B: ["R/L", "txt"], c: ["#", "txt"] }
  };
  var DIV_NAME = { 4: "Quarter notes", 8: "Eighth notes", 16: "Sixteenth notes", 32: "Thirty-second notes", 12: "Eighth-note triplets", 24: "Sixteenth-note triplets", 48: "Thirty-second-note triplets" };
  var START = "?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-o-----|";
  var SCRIBE = "https://www.mikeslessons.com/groove/";

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function glyph(lane, ch){ var g = (GLYPH[lane] || {})[ch]; return g || (/^T\d$/.test(lane) ? ["●"] : [ch, "txt"]); }
  function store(k){ try { return global.localStorage.getItem(k); } catch (e){ return null; } }

  // the word counted on cell i of a bar
  function countWord(g, i, style){
    if (style === "none") return "";
    var per = B.perBeat(g), beat = Math.floor(i / per) + 1, sub = i % per, cmp = B.compound(g), amp = style === "amp" ? "&" : "+";
    if (sub === 0) return String(beat);
    var sets;
    if (cmp || B.triplet(g)){                                                // three to the beat
      var third = per / 3, k = sub / third, six = per / 6, k6 = sub / six;
      if (k === Math.floor(k)) return (style === "Gordon" ? ["", "da", "di"] : style === "Eastman" || cmp ? ["", "la", "li"] : ["", amp, "a"])[k];
      return per >= 6 && k6 === Math.floor(k6) ? "ta" : "";
    }
    sets = style === "Gordon" ? { 2: "de", 4: "ta" } : style === "Eastman" ? { 2: "te", 4: ["ti", "ta"] } : { 2: amp, 4: ["e", "a"] };
    if (sub * 2 === per) return sets[2];
    if (per >= 4 && sub * 4 % per === 0){ var q = sub * 4 / per; return typeof sets[4] === "string" ? sets[4] : sets[4][q === 1 ? 0 : 1]; }
    return "";
  }

  function create(host, cfg){
    cfg = cfg || {};
    var useUrl = cfg.url !== false, fromUrl = useUrl && /[?&](timesig|div|h|s|k)=/i.test(global.location.search);
    var g = B.parse(cfg.text || (fromUrl ? global.location.search : START));
    var undo = [], redo = [], brush = {}, muted = {}, shown = {}, player = null, score = null, raf = null, playing = false, perLine = 2, cols = [], lastCol = -1;
    var count = { Standard: "Standard", Eastman: "Eastman", Gordon: "Gordon" }[store("countingStyle")] || "Standard";
    ROWS.forEach(function (r){ brush[r.lane] = r.brush; });
    var pieces = (global.BandSounds && global.BandSounds.pieces) || [];
    function silent(lane, ch){ var c = B.CELLS[lane][ch]; return !!(c && c.piece && !/^(conga|tumba)/.test(c.piece) && pieces.indexOf(c.piece) < 0); }
    function usedLane(l){ return g.lanes[l].some(function (c){ return c !== "-"; }); }
    function syncShown(){ Object.keys(GROUPS).forEach(function (k){ if (ROWS.some(function (r){ return r.group === k && usedLane(r.lane); })) shown[k] = true; }); }

    // ---- the page
    host.classList.add("ge");
    var bar = el("div", "ge-bar"), setup = el("div", "ge-bar ge-setup"), note = el("p", "ge-note"), paper = el("div", "ge-staff"), grid = el("div", "ge-grid"), foot = el("div", "ge-bar ge-foot"), pop = el("div", "ge-pop");
    [bar, setup, note, paper, grid, foot, pop].forEach(function (e){ host.appendChild(e); }); pop.hidden = true;
    function field(parent, label, input){ var w = el("label", "ge-field"); w.appendChild(el("span", null, label)); w.appendChild(input); parent.appendChild(w); return input; }
    function button(parent, text, title, fn){ var b = el("button", "btn btn-sm btn-outline-secondary", text); b.type = "button"; if (title) b.title = title; b.addEventListener("click", fn); parent.appendChild(b); return b; }
    function select(options){ var s = el("select", "form-select form-select-sm"); options.forEach(function (o){ var x = el("option", null, o[1]); x.value = o[0]; s.appendChild(x); }); return s; }
    function number(min, max, step){ var i = el("input", "form-control form-control-sm"); i.type = "number"; i.min = min; i.max = max; i.step = step || 1; return i; }
    function check(parent, label){ var w = el("label", "ge-check"), i = el("input"); i.type = "checkbox"; w.appendChild(i); w.appendChild(document.createTextNode(" " + label)); parent.appendChild(w); return i; }

    var playBtn = button(bar, "▶ Play", "Space", function (){ playing ? stop() : play(); }); playBtn.className = "btn btn-sm btn-primary ge-play";
    var tempo = field(bar, "Tempo", number(30, 300)), tempoR = el("input"); tempoR.type = "range"; tempoR.min = 30; tempoR.max = 300; tempo.parentNode.appendChild(tempoR);
    var swing = field(bar, "Swing", el("input")); swing.type = "range"; swing.min = 0; swing.max = 60; swing.step = 1; var swingOut = el("output"); swing.parentNode.appendChild(swingOut);
    var click = field(bar, "Click", select([[0, "Off"], [4, "Quarters"], [8, "Eighths"], [16, "Sixteenths"]]));
    var countIn = check(bar, "Count-in"), human = check(bar, "Human feel"); countIn.checked = true;
    var status = el("span", "ge-status"); status.setAttribute("aria-live", "polite"); bar.appendChild(status);

    var library = field(setup, "Groove", select([["", "Choose…"]]));
    var top = field(setup, "Time", number(1, 16)), bottom = select([[2, "2"], [4, "4"], [8, "8"], [16, "16"]]); top.parentNode.appendChild(el("span", "ge-slash", "/")); top.parentNode.appendChild(bottom);
    var div = field(setup, "Grid", select([]));
    var barsOut = el("output"), barsBox = el("span", "ge-field"); barsBox.appendChild(el("span", null, "Bars")); setup.appendChild(barsBox);
    button(barsBox, "−", "Take off the last bar", function (){ if (g.bars > 1) change(function (){ g = B.resize(g, { bars: g.bars - 1 }); }, true); });
    barsBox.appendChild(barsOut);
    button(barsBox, "+", "Add a bar: a copy of the last one (hold Shift for an empty one)", function (ev){ if (g.bars >= B.MAX_BARS) return;
      change(function (){ var st = B.steps(g), was = g.bars; g = B.resize(g, { bars: was + 1 });
        if (!ev.shiftKey) B.LANES.forEach(function (l){ for (var i = 0; i < st; i++) g.lanes[l][was * st + i] = g.lanes[l][(was - 1) * st + i]; }); }, true); });
    var counting = field(setup, "Count", select([["Standard", "1 e + a"], ["amp", "1 e & a"], ["Eastman", "Eastman"], ["Gordon", "Gordon"], ["none", "None"]])); counting.value = count;
    var countStaff = check(setup, "under the staff");
    var groupBoxes = {}; Object.keys(GROUPS).forEach(function (k){ groupBoxes[k] = check(setup, GROUPS[k]); groupBoxes[k].addEventListener("change", function (){ shown[k] = groupBoxes[k].checked; draw(); }); });
    var title = field(setup, "Title", el("input")); title.type = "text"; title.className = "form-control form-control-sm ge-title";

    var undoBtn = button(foot, "Undo", "Ctrl+Z", function (){ step(undo, redo); }), redoBtn = button(foot, "Redo", "Ctrl+Shift+Z", function (){ step(redo, undo); });
    button(foot, "Clear", "Empty every cell", function (){ change(function (){ B.LANES.forEach(function (l){ g.lanes[l] = g.lanes[l].map(function (){ return "-"; }); }); }, true); });
    var copyBtn = button(foot, "Copy link", "The address of this groove", function (){
      var u = global.location.origin + global.location.pathname + B.stringify(g);
      (global.navigator.clipboard ? global.navigator.clipboard.writeText(u) : Promise.reject()).then(function (){ say("Link copied."); }, function (){ global.prompt("The address of this groove:", u); }); });
    var scribe = el("a", "ge-link", "Open in GrooveScribe"); scribe.target = "_blank"; scribe.rel = "noopener"; foot.appendChild(scribe);
    foot.appendChild(el("span", "ge-hint", "Click a cell to write a note, again to take it out. Right-click or hold a cell for the other marks of its row."));

    function say(t){ status.textContent = t || ""; }

    // ---- the library: the band's own grooves, written down
    (function (){
      var D = global.BandDrums, C = global.BandCatalog; if (!D || !C) return;
      var groups = {};
      C.drums.forEach(function (d){ if (!D.GROOVES[d.id] || d.id === "none") return; (groups[d.group || "Other"] = groups[d.group || "Other"] || []).push(d); });
      Object.keys(groups).forEach(function (name){ var og = el("optgroup"); og.label = name;
        groups[name].forEach(function (d){ var o = el("option", null, d.label); o.value = d.id; o.dataset.feel = d.feel || ""; og.appendChild(o); }); library.appendChild(og); });
      library.addEventListener("change", function (){
        var id = library.value, o = library.selectedOptions[0]; if (!id) return;
        var seed = 7, rng = function (){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, d = D.create({ rng: rng }), swung = o.dataset.feel === "swing" || !!D.GROOVES[id].triplet;
        var bars = [0, 1, 2, 3].map(function (i){ return d.bar({ index: i, length: 16, beats: 4, tempo: 110, intensity: 0.5, opts: { groove: id, fills: "none", feel: swung ? "swing" : "straight" } }); });
        var same = function (a, b){ return JSON.stringify(a.map(function (e){ return [e.pos, e.piece]; })) === JSON.stringify(b.map(function (e){ return [e.pos, e.piece]; })); };
        if (same(bars[0], bars[2]) && same(bars[1], bars[3])) bars = same(bars[0], bars[1]) ? [bars[0]] : [bars[0], bars[1]];
        change(function (){ var t = g.tempo; g = B.fromEvents(bars, { swung: swung, tempo: t, title: o.textContent }); }, true);
        library.value = "";
      });
    })();

    // ---- changes: every one goes through here
    function change(fn, structural){
      var before = B.stringify(g); fn(); var after = B.stringify(g); if (after === before) return;
      undo.push(before); if (undo.length > 200) undo.shift(); redo.length = 0;
      refresh(structural);
    }
    function step(from, to){ if (!from.length) return; to.push(B.stringify(g)); g = B.parse(from.pop()); refresh(true); }
    function refresh(structural){
      if (useUrl) try { global.history.replaceState(null, "", global.location.pathname + B.stringify(g)); } catch (e){}
      if (structural){ syncShown(); controls(); draw(); } else { paint(); drawStaff(); }
      if (player && playing){ if (structural) player.setChart(chart()); player.setOpts(opts()); player.setTempo(B.bpm(g)); }
      undoBtn.disabled = !undo.length; redoBtn.disabled = !redo.length;
      scribe.href = SCRIBE + B.stringify(g).replace(/&(Cg|Tb)=[^&]*/g, "");
      note.textContent = g.warnings.join(" "); note.hidden = !g.warnings.length;
    }
    function controls(){
      tempo.value = tempoR.value = g.tempo; top.value = g.n; bottom.value = g.d; title.value = g.title; barsOut.textContent = g.bars; click.value = g.metronome || 0;
      div.textContent = ""; B.divsFor(g.n, g.d).forEach(function (d){ var o = el("option", null, DIV_NAME[d]); o.value = d; div.appendChild(o); }); div.value = g.div;
      swing.value = g.swing; swing.disabled = !B.swings(g); swingOut.textContent = !B.swings(g) ? "—" : g.swing ? g.swing + "%" : "off";
      Object.keys(GROUPS).forEach(function (k){ groupBoxes[k].checked = !!shown[k]; });
    }

    // ---- the grid
    function rows(){ return ROWS.filter(function (r){ return (!r.group || shown[r.group]) && (!r.rare || usedLane(r.lane)); }); }
    function draw(){
      var st = B.steps(g), per = B.perBeat(g), width = host.clientWidth || 800, cell = st > 16 ? 18 : 24;
      perLine = Math.max(1, Math.min(4, g.bars, Math.floor((width - 96) / (st * cell))));
      grid.textContent = ""; cols = [];
      for (var b0 = 0; b0 < g.bars; b0 += perLine){
        var n = Math.min(perLine, g.bars - b0), block = el("div", "ge-block");
        var nameW = width < 480 ? 52 : 90, fit = Math.floor((width - 34 - nameW - 2 * n * st) / (n * st));         // a phone: narrower names, cells as wide as there is room for
        block.style.gridTemplateColumns = nameW + "px repeat(" + n * st + ", minmax(" + Math.max(7, Math.min(cell - 8, fit)) + "px, 2.4rem))";
        rows().forEach(function (r){
          var name = el("button", "ge-name" + (muted[r.lane] ? " ge-muted" : ""), r.name); name.type = "button";
          name.title = "Click: the marks of this row. Shift-click: mute it."; name.addEventListener("click", function (ev){ if (ev.shiftKey){ muted[r.lane] = !muted[r.lane]; refresh(true); } else palette(r.lane, null, name); });
          block.appendChild(name);
          for (var i = 0; i < n * st; i++){ var at = b0 * st + i, c = el("button", "ge-cell"); c.type = "button"; c.dataset.lane = r.lane; c.dataset.at = at;
            if (i % st === 0) c.classList.add("ge-barline"); if (i % per === 0) c.classList.add("ge-beat"); if (Math.floor(i / per) % 2) c.classList.add("ge-odd");
            (cols[at] = cols[at] || []).push(c); block.appendChild(c); }
        });
        block.appendChild(el("span", "ge-name ge-count"));
        for (var j = 0; j < n * st; j++){ var w = el("span", "ge-word" + (j % per === 0 ? " ge-beat" : ""), countWord(g, j % st, counting.value)); (cols[b0 * st + j] = cols[b0 * st + j] || []).push(w); block.appendChild(w); }
        grid.appendChild(block);
      }
      paint(); drawStaff();
    }
    function paint(){
      Array.prototype.forEach.call(grid.querySelectorAll(".ge-cell"), function (c){
        var lane = c.dataset.lane, ch = g.lanes[lane][+c.dataset.at], gl = ch === "-" ? [""] : glyph(lane, ch);
        c.textContent = gl[0]; c.className = c.className.replace(/ ge-(on|acc|ghost|txt|quiet)\b/g, "");
        if (ch !== "-"){ c.classList.add("ge-on"); if (gl[1]) c.classList.add("ge-" + gl[1]); if (silent(lane, ch)) c.classList.add("ge-quiet"); c.title = B.CELLS[lane][ch].label + (silent(lane, ch) ? " (no sound yet)" : ""); } else c.title = "";
      });
    }
    function drawStaff(){
      var S = global.LessonScore; if (!S) return;
      var abc = B.toAbc(g, { barsPerLine: perLine, title: false, count: countStaff.checked && counting.value !== "none" ? function (b, i){ return countWord(g, i, counting.value); } : null });
      try { score = S.engrave(paper, abc, { width: Math.max(280, Math.min(host.clientWidth || 700, 180 + Math.min(perLine, g.bars) * 300)) - 40 }); } catch (e){ score = null; paper.textContent = ""; }
    }

    // ---- writing in the grid
    function hear(lane, ch){
      var c = B.CELLS[lane][ch], P = global.BandPlayer; if (!c || !c.piece || !P || !P.hit || playing || silent(lane, ch)) return;
      try { P.hit(c.piece, { vel: Math.min(1, c.vel + 0.2) }); if (lane === "K" && ch === "X") P.hit("hatFoot", { vel: 0.6 }); } catch (e){}
    }
    function put(lane, at, ch){ change(function (){ B.set(g, lane, at, ch); }); if (ch !== "-") hear(lane, ch); }
    var drag = null, hold = null;
    grid.addEventListener("pointerdown", function (ev){
      var c = ev.target.closest && ev.target.closest(".ge-cell"); if (!c || ev.button) return;
      var lane = c.dataset.lane, at = +c.dataset.at, was = g.lanes[lane][at];
      drag = { lane: lane, ch: was === "-" ? brush[lane] : "-", from: at, done: false };
      hold = setTimeout(function (){ if (drag && !drag.moved){ drag = null; palette(lane, at, c); } }, 550);
      ev.preventDefault();
    });
    grid.addEventListener("pointerover", function (ev){
      var c = ev.target.closest && ev.target.closest(".ge-cell"); if (!drag || !c || c.dataset.lane !== drag.lane || +c.dataset.at === drag.from) return;
      if (!drag.done){ drag.done = true; put(drag.lane, drag.from, drag.ch); }
      drag.moved = true; put(drag.lane, +c.dataset.at, drag.ch);
    });
    global.addEventListener("pointerup", function (){ clearTimeout(hold); if (drag && !drag.done) put(drag.lane, drag.from, drag.ch); drag = null; });
    grid.addEventListener("contextmenu", function (ev){ var c = ev.target.closest && ev.target.closest(".ge-cell"); if (!c) return; ev.preventDefault(); clearTimeout(hold); drag = null; palette(c.dataset.lane, +c.dataset.at, c); });
    grid.addEventListener("keydown", function (ev){
      var c = ev.target.closest && ev.target.closest(".ge-cell"); if (!c) return; var lane = c.dataset.lane, at = +c.dataset.at;
      if (ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); ev.stopPropagation(); put(lane, at, g.lanes[lane][at] === "-" ? brush[lane] : "-"); }
      else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft"){ var nx = grid.querySelector('.ge-cell[data-lane="' + lane + '"][data-at="' + (at + (ev.key === "ArrowRight" ? 1 : -1)) + '"]'); if (nx){ ev.preventDefault(); nx.focus(); } }
      else if (B.CELLS[lane][ev.key] && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey){ ev.preventDefault(); ev.stopPropagation(); brush[lane] = ev.key; put(lane, at, ev.key); }
    });
    // the marks of a lane: for one cell (at) or as the lane's brush
    function palette(lane, at, anchor){
      pop.textContent = ""; pop.appendChild(el("div", "ge-pop-head", ROWS.filter(function (r){ return r.lane === lane; })[0].name));
      Object.keys(B.CELLS[lane]).concat(at == null ? [] : ["-"]).forEach(function (ch){
        var gl = ch === "-" ? [""] : glyph(lane, ch), b = el("button", "ge-pop-item" + (ch === brush[lane] ? " ge-current" : "")); b.type = "button";
        var sw = el("span", "ge-cell ge-on" + (gl[1] ? " ge-" + gl[1] : ""), gl[0]); b.appendChild(sw);
        b.appendChild(document.createTextNode(ch === "-" ? "Nothing" : B.CELLS[lane][ch].label + (silent(lane, ch) ? " (no sound yet)" : "")));
        b.addEventListener("click", function (){ pop.hidden = true; if (ch !== "-") brush[lane] = ch; if (at != null) put(lane, at, ch); else hear(lane, ch); });
        pop.appendChild(b);
      });
      pop.hidden = false;
      var hr = host.getBoundingClientRect(), r = anchor.getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(r.left - hr.left, hr.width - 250)) + "px"; pop.style.top = (r.bottom - hr.top + 4) + "px";
    }
    document.addEventListener("pointerdown", function (ev){ if (!pop.hidden && !pop.contains(ev.target)) pop.hidden = true; }, true);

    // ---- the controls
    function setTempo(v){ v = Math.max(30, Math.min(300, Math.round(+v) || g.tempo)); change(function (){ g.tempo = v; }); tempo.value = tempoR.value = g.tempo; }
    tempo.addEventListener("change", function (){ setTempo(tempo.value); }); tempoR.addEventListener("input", function (){ setTempo(tempoR.value); });
    swing.addEventListener("input", function (){ change(function (){ g.swing = +swing.value; }); swingOut.textContent = g.swing ? g.swing + "%" : "off"; });
    click.addEventListener("change", function (){ change(function (){ g.metronome = +click.value; }); });
    function meter(){ change(function (){ var n = Math.max(1, Math.min(16, +top.value || 4)), d = +bottom.value, ds = B.divsFor(n, d);
      g = B.resize(g, { n: n, d: d, div: ds.indexOf(g.div) >= 0 ? g.div : ds.indexOf(16) >= 0 ? 16 : ds[0] }); }, true); controls(); }
    top.addEventListener("change", meter); bottom.addEventListener("change", meter);
    div.addEventListener("change", function (){ change(function (){ g = B.resize(g, { div: +div.value }); }, true); });
    title.addEventListener("change", function (){ change(function (){ g.title = title.value.trim(); }); });
    counting.addEventListener("change", function (){ draw(); }); countStaff.addEventListener("change", drawStaff);
    human.addEventListener("change", function (){ var was = playing; stop(); player = null; if (was) play(); });
    countIn.addEventListener("change", function (){ if (player) player.setCountIn(countIn.checked ? 1 : 0); });
    document.addEventListener("keydown", function (ev){
      var t = ev.target, typing = t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable);
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z") && !typing){ ev.preventDefault(); ev.shiftKey ? step(redo, undo) : step(undo, redo); }
      else if (ev.key === " " && !typing && !(t && t.tagName === "BUTTON" && t !== playBtn)){ ev.preventDefault(); playing ? stop() : play(); }
      else if (ev.key === "Escape") pop.hidden = true;
    });
    var resizeT = null; global.addEventListener("resize", function (){ clearTimeout(resizeT); resizeT = setTimeout(draw, 150); });

    // ---- the band's drummer plays it
    function chart(){ var body = ""; for (var i = 0; i < g.bars; i++) body += "z" + (16 * g.n / g.d) + "|"; return global.TuneChart.parse("X:1\nM:" + g.n + "/" + g.d + "\nL:1/16\nK:C\n" + body); }
    function sounding(){ var c = B.parse(B.stringify(g)); Object.keys(muted).forEach(function (l){ if (muted[l]) c.lanes[l] = c.lanes[l].map(function (){ return "-"; }); }); return c; }
    function opts(){ var s = sounding(); return { written: B.stringify(s), writtenPieces: pieces, writtenClick: g.metronome || 0, feel: "straight", fills: "none", congas: B.HAND_LANES.some(function (l){ return s.lanes[l].some(function (c){ return c !== "-"; }); }) ? "written" : "none" }; }
    function play(){
      var P = global.BandPlayer; if (!P || playing) return;
      if (!player) player = P.create({ parsed: chart(), tempo: B.bpm(g), countIn: countIn.checked ? 1 : 0, opts: opts(), instruments: ["kit"], humanize: human.checked ? 1 : 0,
        onState: function (s){ say(s === "loading" ? "Loading the drums…" : ""); if (s === "idle") stopped(); } });
      else { player.setChart(chart()); player.setOpts(opts()); player.setTempo(B.bpm(g)); player.setCountIn(countIn.checked ? 1 : 0); }
      playing = true; playBtn.textContent = "■ Stop"; playBtn.classList.add("ge-on");
      player.play().then(function (){ if (playing && !raf) raf = global.requestAnimationFrame(follow); }, function (){ say("The drum sounds could not be loaded."); stopped(); });
    }
    function stopped(){ playing = false; playBtn.textContent = "▶ Play"; playBtn.classList.remove("ge-on"); if (raf){ global.cancelAnimationFrame(raf); raf = null; } light(-1); if (score) score.clear(); }
    function stop(){ if (player && playing) player.stop(); stopped(); }
    function light(at){ if (at === lastCol) return; (cols[lastCol] || []).forEach(function (c){ c.classList.remove("ge-now"); }); lastCol = at; (cols[at] || []).forEach(function (c){ c.classList.add("ge-now"); }); }
    function follow(){
      raf = playing ? global.requestAnimationFrame(follow) : null; if (!player || !playing) return;
      var w = player.where(); if (!w){ return; }
      if (w.info.countIn){ light(-1); say("Count-in"); return; } say("");
      var st = B.steps(g), b = w.info.index % g.bars, ratio = B.swingRatio(g), i = 0; while (i + 1 < st && B.pos(g, i + 1, ratio) <= w.pos + 0.01) i++;
      light(b * st + i);
      if (score) try { score.mark((b * B.beats(g) + w.pos) * (B.compound(g) ? 1.5 : 4 / g.d)); } catch (e){}
    }

    syncShown(); refresh(true);
    return { groove: function (){ return g; }, text: function (){ return B.stringify(g); }, load: function (t){ change(function (){ g = B.parse(t); }, true); },
      play: play, stop: stop, undo: function (){ step(undo, redo); }, redo: function (){ step(redo, undo); }, isPlaying: function (){ return playing; },
      where: function (){ return lastCol; }, player: function (){ return player; } };
  }

  global.GrooveEditor = { create: create, countWord: countWord };
})(typeof window !== "undefined" ? window : globalThis);
