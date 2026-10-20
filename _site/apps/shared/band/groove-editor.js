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
// A new page opens in the meter of localStorage.tuneMeter ({ n, d }, which the Tune Assessment sets) unless the address has a groove.
// More, carried over from the first Drumset page: "Marks" Icons (a coloured drawing in each cell, as the old grid), custom count
// words ("Customize labels", then a click on a word; kept until the meter or grid changes), Export PNG (the grid drawn as a picture of
// its own, black on white), the bongo row, and a synthesized ride (RideSynth, ride-synth.js) as a choice for the band's ride sample.
// The standard patterns menu is groove-library.js (BandGrooveLibrary), each with its source.
//   ed.exportPng(scale) -> Promise<{ dataUrl, width, height }>   ed.gridSvg() -> { svg, width, height }   ed.ride() -> the RideSynth

(function (global) {
  var B = global.BandGroove;
  var ROWS = [
    { lane: "H", name: "Cymbals", brush: "x" },
    { lane: "T1", name: "High tom", brush: "o", group: "toms" }, { lane: "T2", name: "Mid tom", brush: "o", group: "toms" },
    { lane: "T3", name: "Low tom", brush: "o", group: "toms", rare: true }, { lane: "T4", name: "Floor tom", brush: "o", group: "toms" },
    { lane: "S", name: "Snare", brush: "o" }, { lane: "K", name: "Kick, foot", brush: "o" },
    { lane: "Stickings", name: "Sticking", brush: "R", group: "stick" },
    { lane: "Cg", name: "Conga", brush: "O", group: "hands" }, { lane: "Tb", name: "Tumba", brush: "O", group: "hands" },
    { lane: "Bo", name: "Bongos", brush: "H", group: "hands" }
  ];
  var GROUPS = { toms: "Toms", stick: "Sticking", hands: "Congas, bongos" };
  // what a cell shows: [text, class]
  var GLYPH = {
    H: { x: ["×"], X: ["×", "acc"], o: ["○"], "+": ["+"], r: ["rd", "txt"], b: ["bell", "txt"], c: ["cr", "txt"], s: ["stk", "txt"], m: ["cb", "txt"], n: ["·"], N: ["•"] },
    S: { o: ["●"], O: ["●", "acc"], g: ["●", "ghost"], x: ["×"], f: ["fl", "txt"], d: ["dr", "txt"], b: ["bz", "txt"] },
    K: { o: ["●"], x: ["×"], X: ["●×"] },
    Stickings: { R: ["R", "txt"], L: ["L", "txt"], B: ["R/L", "txt"], c: ["#", "txt"] },
    Bo: { H: ["hi", "txt"], L: ["lo", "txt"] }
  };
  // The drawings of the Icons view (the first Drumset page's, 14 x 14, standard drum-notation shapes: x for cymbals, filled heads for
  // drums, + for the cross-stick). [shapes, colour, stroke width]. A ghost note is drawn smaller, an accent gets the wedge over it.
  var X14 = '<line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/>';
  var HEAD = function (rx, ry){ return '<ellipse cx="7" cy="7" rx="' + rx + '" ry="' + ry + '" fill="currentColor"/>'; };
  var ICONS = {
    hihat: [X14, "#a8c8f0"], hihatopen: [X14 + '<path d="M1 12.5 Q7 11 13 12.5" fill="none"/>', "#c8dff8"],
    ride: ['<ellipse cx="7" cy="8" rx="6" ry="2.2" fill="none"/><line x1="7" y1="2.5" x2="7" y2="6"/>', "#9fd0e8"],
    bell: ['<ellipse cx="7" cy="8" rx="6" ry="2.2" fill="none"/><circle cx="7" cy="5" r="2.6" fill="currentColor"/>', "#9fd0e8"],
    crash: ['<path d="M7 2 L12.5 10 L7 8.5 L1.5 10 Z" fill="currentColor"/>', "#b8a0e0"],
    stacker: ['<path d="M2 11 L7 3 L12 11 Z" fill="none"/><line x1="4" y1="8" x2="10" y2="8"/>', "#c6b0e8"],
    cowbell: ['<path d="M4 3 L10 3 L12 11 L2 11 Z" fill="currentColor"/>', "#e8d088"],
    click: ['<circle cx="7" cy="7" r="1.8" fill="currentColor"/>', "#e4e4e4"], clickHi: ['<circle cx="7" cy="7" r="3.2" fill="currentColor"/>', "#d0d0d0"],
    snare: [HEAD(5.5, 4), "#f0a0a0"], ghost: ['<path d="M3.5 3 Q1.5 7 3.5 11 M10.5 3 Q12.5 7 10.5 11" fill="none"/>' + HEAD(3, 2.4), "#f6c8c8"],
    rim: ['<line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/>', "#e0a0c8"],
    flam: ['<ellipse cx="9" cy="7.5" rx="4" ry="3" fill="currentColor"/><ellipse cx="3.5" cy="9" rx="2" ry="1.5" fill="currentColor"/>', "#f4b8a0"],
    drag: ['<ellipse cx="10" cy="7.5" rx="3.6" ry="2.8" fill="currentColor"/><ellipse cx="2.8" cy="9" rx="1.6" ry="1.3" fill="currentColor"/><ellipse cx="6" cy="9" rx="1.6" ry="1.3" fill="currentColor"/>', "#f4b8a0"],
    buzz: [HEAD(5.5, 4) + '<line x1="4" y1="5.5" x2="10" y2="3"/><line x1="4" y1="8.5" x2="10" y2="6"/>', "#e8a8a8"],
    kick: ['<circle cx="7" cy="7" r="5.5" fill="currentColor"/>', "#88d898"],
    hatfoot: ['<line x1="3" y1="3" x2="11" y2="9"/><line x1="11" y1="3" x2="3" y2="9"/><line x1="2" y1="11" x2="12" y2="11"/>', "#70c8c0"],
    both: ['<circle cx="7" cy="7" r="5.5" fill="currentColor"/><line x1="4" y1="4" x2="10" y2="10" stroke="white"/><line x1="10" y1="4" x2="4" y2="10" stroke="white"/>', "#88d8c0"],
    hitom: [HEAD(3.5, 2.8), "#f5c470"], midtom: [HEAD(4.5, 3.5), "#f0a850"], lowtom: [HEAD(5, 3.8), "#e8a050"], floortom: [HEAD(5.5, 4), "#e09050"],
    hibongo: ['<circle cx="7" cy="7" r="3.5" fill="currentColor"/>', "#e8c88a"], lobongo: ['<circle cx="7" cy="7" r="5" fill="currentColor"/>', "#d4a860"],
    congaopen: ['<circle cx="7" cy="7" r="4.5"/>', "#c8e890"], congaslap: ['<circle cx="7" cy="8" r="4" fill="currentColor"/><path d="M4.5 2.5 L7 1 L9.5 2.5" fill="none" stroke-width="1.8"/>', "#a8d060"],
    congamuted: [X14, "#d0e8b0"], congabass: ['<circle cx="7" cy="7" r="4.5"/><circle cx="7" cy="7" r="1.6" fill="currentColor"/>', "#b0d880"],
    congaheel: ['<path d="M7 3 L11 10 L3 10 Z" fill="currentColor"/>', "#d8ecb0"], congatoe: ['<path d="M7 11 L11 4 L3 4 Z" fill="currentColor"/>', "#d8ecb0"],
    stick: ['', "#eee"]
  };
  var ROW_ICON = {
    H: '<ellipse cx="12" cy="14" rx="10" ry="3"/><line x1="12" y1="11" x2="12" y2="4"/>',
    S: '<ellipse cx="12" cy="7" rx="9" ry="3"/><line x1="3" y1="7" x2="3" y2="17"/><line x1="21" y1="7" x2="21" y2="17"/><ellipse cx="12" cy="17" rx="9" ry="3"/>',
    K: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
    Bo: '<circle cx="7" cy="13" r="5"/><circle cx="17" cy="13" r="7"/><line x1="7" y1="8" x2="7" y2="4"/><line x1="17" y1="6" x2="17" y2="4"/>'
  };
  // lane + letter -> the key of ICONS (null = no drawing: the letter is shown)
  function iconKey(lane, ch){
    if (lane === "H") return { x: "hihat", X: "hihat", o: "hihatopen", "+": "hihat", r: "ride", b: "bell", c: "crash", s: "stacker", m: "cowbell", n: "click", N: "clickHi" }[ch] || null;
    if (lane === "S") return { o: "snare", O: "snare", g: "ghost", x: "rim", f: "flam", d: "drag", b: "buzz" }[ch] || null;
    if (lane === "K") return { o: "kick", x: "hatfoot", X: "both" }[ch] || null;
    if (lane === "T1") return "hitom"; if (lane === "T2") return "midtom"; if (lane === "T3") return "lowtom"; if (lane === "T4") return "floortom";
    if (lane === "Cg") return { H: "congaheel", T: "congatoe", S: "congaslap", O: "congaopen", M: "congamuted", B: "congabass" }[ch] || null;
    if (lane === "Tb") return { O: "congaopen", M: "congamuted", B: "congabass" }[ch] || null;
    if (lane === "Bo") return ch === "H" ? "hibongo" : "lobongo";
    return null;
  }
  function iconSvg(key, size, accent){
    var ic = ICONS[key]; if (!ic) return "";
    var sw = key === "rim" || key === "hatfoot" ? 2 : 1.5;
    return '<svg viewBox="0 0 14 14" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ic[0] + (accent ? '<path d="M3 1.5 L7 0.5 L11 1.5" fill="none" stroke-width="1.6"/>' : "") + "</svg>";
  }
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

  // the tune page's meter (localStorage.tuneMeter, set by the Tune Assessment), if it is one the editor can have
  function tuneMeter(){
    var m = null; try { m = JSON.parse(store("tuneMeter")); } catch (e){}
    if (!m || !(m.n >= 1 && m.n <= 16) || [2, 4, 8, 16].indexOf(+m.d) < 0 || m.n !== Math.floor(m.n)) return null;
    return { n: +m.n, d: +m.d };
  }
  function startText(){
    var m = tuneMeter(); if (!m || (m.n === 4 && m.d === 4)) return START;
    var ds = B.divsFor(m.n, m.d), cmp = B.compound({ n: m.n, d: m.d });
    var div = cmp && ds.indexOf(8) >= 0 ? 8 : ds.indexOf(16) >= 0 ? 16 : ds[0];
    return "?TimeSig=" + m.n + "/" + m.d + "&Div=" + div + "&Tempo=90&Measures=1";
  }
  function xml(t){ return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function create(host, cfg){
    cfg = cfg || {};
    var useUrl = cfg.url !== false, fromUrl = useUrl && /[?&](timesig|div|h|s|k)=/i.test(global.location.search);
    var g = B.parse(cfg.text || (fromUrl ? global.location.search : startText()));
    var marks = store("drumsetMarks") === "icons" ? "icons" : "letters", labels = {}, labelKey = "", customizing = false, size = 1, wordSize = 1, titleSize = 1;
    var ride = null, rideSet = { variant: "medium20", technique: "stick", decay: null, reverb: 0, hp: 20, lp: 20000 }, rideMode = "band";
    var undo = [], redo = [], brush = {}, muted = {}, shown = {}, player = null, score = null, raf = null, playing = false, perLine = 2, cols = [], lastCol = -1;
    var count = { Standard: "Standard", Eastman: "Eastman", Gordon: "Gordon" }[store("countingStyle")] || "Standard";
    ROWS.forEach(function (r){ brush[r.lane] = r.brush; });
    var pieces = (global.BandSounds && global.BandSounds.pieces) || [];
    function silent(lane, ch){ var c = B.CELLS[lane][ch]; return !!(c && c.piece && !/^(conga|tumba|bongo)/.test(c.piece) && pieces.indexOf(c.piece) < 0); }
    function usedLane(l){ return g.lanes[l].some(function (c){ return c !== "-"; }); }
    function syncShown(){ Object.keys(GROUPS).forEach(function (k){ if (ROWS.some(function (r){ return r.group === k && usedLane(r.lane); })) shown[k] = true; }); }

    // ---- the page
    host.classList.add("ge");
    var bar = el("div", "ge-bar"), setup = el("div", "ge-bar ge-setup"), note = el("p", "ge-note"), paper = el("div", "ge-staff"), shown_title = el("h3", "ge-title-show"), grid = el("div", "ge-grid"), foot = el("div", "ge-bar ge-foot"), pop = el("div", "ge-pop");
    var look = el("details", "ge-fold"), lookBar = el("div", "ge-bar"), rideBox = el("details", "ge-fold"), rideBar = el("div", "ge-bar");
    look.appendChild(el("summary", null, "Look, labels and picture")); look.appendChild(lookBar);
    rideBox.appendChild(el("summary", null, "Ride cymbal sound")); rideBox.appendChild(rideBar);
    [bar, setup, note, paper, shown_title, grid, foot, look, rideBox, pop].forEach(function (e){ host.appendChild(e); }); pop.hidden = true;
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

    // the standard patterns, each with its source
    var L = global.BandGrooveLibrary, pattern = null, famNow = tuneMeter() ? L && L.meterOf(tuneMeter().n, tuneMeter().d) || "" : "", sourceLine = el("span", "ge-hint ge-source");
    if (L){
      pattern = field(setup, "Pattern", select([["", "Choose\u2026"]]));
      var fam = field(setup, "Fits", select([["", "Any meter"], ["duple", "Duple (2/4, 4/4)"], ["triple", "Triple (3/4)"], ["compound", "Compound (6/8)"]])); fam.value = famNow;
      var groups = {};
      L.ITEMS.forEach(function (it){ var og = groups[it.group]; if (!og){ og = groups[it.group] = el("optgroup"); og.label = it.group; pattern.appendChild(og); }
        var o = el("option", null, it.label); o.value = it.id; o.dataset.mt = it.meter; o.dataset.ol = it.label; og.appendChild(o); });
      var dim = function (){ famNow = fam.value; Array.prototype.forEach.call(pattern.querySelectorAll("option[data-mt]"), function (o){
        var ok = !famNow || o.dataset.mt === famNow; o.textContent = ok ? o.dataset.ol : "\u25E6 " + o.dataset.ol; o.style.color = ok ? "" : "#999"; }); };
      fam.addEventListener("change", dim); dim();
      pattern.addEventListener("change", function (){
        var it = L.byId(pattern.value); if (!it) return;
        change(function (){ g = B.parse(it.text); }, true);
        var src = L.SOURCES[it.source]; sourceLine.textContent = "Source: " + (src ? src.cite + " " : "");
        if (src && src.url){ var a = el("a", null, src.url); a.href = src.url; a.target = "_blank"; a.rel = "noopener"; sourceLine.appendChild(a); }
        pattern.value = "";
      });
      setup.appendChild(sourceLine);
    }

    var undoBtn = button(foot, "Undo", "Ctrl+Z", function (){ step(undo, redo); }), redoBtn = button(foot, "Redo", "Ctrl+Shift+Z", function (){ step(redo, undo); });
    button(foot, "Clear", "Empty every cell", function (){ change(function (){ B.LANES.forEach(function (l){ g.lanes[l] = g.lanes[l].map(function (){ return "-"; }); }); }, true); });
    var copyBtn = button(foot, "Copy link", "The address of this groove", function (){
      var u = global.location.origin + global.location.pathname + B.stringify(g);
      (global.navigator.clipboard ? global.navigator.clipboard.writeText(u) : Promise.reject()).then(function (){ say("Link copied."); }, function (){ global.prompt("The address of this groove:", u); }); });
    var scribe = el("a", "ge-link", "Open in GrooveScribe"); scribe.target = "_blank"; scribe.rel = "noopener"; foot.appendChild(scribe);
    foot.appendChild(el("span", "ge-hint", "Click a cell to write a note, again to take it out. Right-click or hold a cell for the other marks of its row."));

    function say(t){ status.textContent = t || ""; }

    // ---- look, labels and the picture
    var marksSel = field(lookBar, "Marks", select([["letters", "Letters"], ["icons", "Icons"]])); marksSel.value = marks;
    var sizeR = field(lookBar, "Cell size", el("input")); sizeR.type = "range"; sizeR.min = 0.6; sizeR.max = 2.2; sizeR.step = 0.1; sizeR.value = 1;
    var wordR = field(lookBar, "Count size", el("input")); wordR.type = "range"; wordR.min = 0.6; wordR.max = 2; wordR.step = 0.1; wordR.value = 1;
    var titleR = field(lookBar, "Title size", el("input")); titleR.type = "range"; titleR.min = 0.6; titleR.max = 2.5; titleR.step = 0.1; titleR.value = 1;
    var custom = button(lookBar, "Customize labels", "Then click a count word to type another", function (){
      customizing = !customizing; custom.textContent = customizing ? "Done customizing" : "Customize labels"; custom.classList.toggle("btn-warning", customizing); grid.classList.toggle("ge-editing", customizing); });
    button(lookBar, "Reset labels", "Back to the counting style's words", function (){ labels = {}; draw(); });
    var resSel = field(lookBar, "Resolution", select([[1, "1\u00D7"], [2, "2\u00D7"], [3, "3\u00D7"], [4, "4\u00D7"]])); resSel.value = 2;
    button(lookBar, "Export PNG", "The grid as a picture, black on white (with the title)", function (){
      exportPng(+resSel.value).then(function (r){ var a = document.createElement("a"); a.href = r.dataUrl; a.download = (g.title ? g.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") : "drum-groove") + ".png"; document.body.appendChild(a); a.click(); a.remove(); },
        function (){ say("The picture could not be made."); }); });
    marksSel.addEventListener("change", function (){ marks = marksSel.value; try { global.localStorage.setItem("drumsetMarks", marks); } catch (e){} draw(); });
    sizeR.addEventListener("input", function (){ size = +sizeR.value; draw(); });
    wordR.addEventListener("input", function (){ wordSize = +wordR.value; grid.style.setProperty("--ge-wscale", wordSize); });
    titleR.addEventListener("input", function (){ titleSize = +titleR.value; shown_title.style.fontSize = 1.4 * titleSize + "rem"; });
    // the word counted on cell i of a bar: a typed one, else the counting style's
    function word(i){ return labels[i] != null ? labels[i] : countWord(g, i, counting.value); }
    grid.addEventListener("click", function (ev){
      var w = customizing && ev.target.closest && ev.target.closest(".ge-word"); if (!w) return;
      var i = +w.dataset.i, txt = global.prompt("New label:", w.textContent);
      if (txt != null){ labels[i] = txt; draw(); }
    });

    // ---- the ride: the band's sample, or one made here (ride-synth.js)
    var rideSrc = field(rideBar, "Ride", select([["band", "The band's ride cymbal (sample)"]].concat(global.RideSynth ? [["synth", "Synthesized here"]] : [])));
    if (global.RideSynth){
      var rv = field(rideBar, "Kind", select(Object.keys(global.RideSynth.VARIANTS).map(function (k){ return [k, global.RideSynth.VARIANTS[k].label]; })));
      var rt = field(rideBar, "Technique", select(Object.keys(global.RideSynth.TECHNIQUES).map(function (k){ return [k, global.RideSynth.TECHNIQUES[k]]; })));
      var slider = function (label, min, max, step, val, fmt){ var r = field(rideBar, label, el("input")); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = val;
        var o = el("output"); r.parentNode.appendChild(o); r.show = function (){ o.textContent = fmt(+r.value); }; r.show(); return r; };
      var rd = slider("Decay", 0.1, 4.5, 0.1, 2.2, function (v){ return v.toFixed(1) + " s"; }), rr = slider("Reverb", 0, 100, 5, 0, function (v){ return v + "%"; });
      var rh = slider("High-pass", 20, 6000, 20, 20, function (v){ return v + " Hz"; }), rl = slider("Low-pass", 400, 20000, 100, 20000, function (v){ return v >= 1000 ? (v / 1000) + "k Hz" : v + " Hz"; });
      var rideEdit = function (o){ Object.assign(rideSet, o); if (ride) ride.set(o); };
      rideSrc.addEventListener("change", function (){ rideMode = rideSrc.value; kitRide(); });
      rv.addEventListener("change", function (){ rideEdit({ variant: rv.value, decay: null }); rd.value = global.RideSynth.VARIANTS[rv.value].decay; rd.show(); });
      rt.addEventListener("change", function (){ rideEdit({ technique: rt.value }); });
      rd.addEventListener("input", function (){ rd.show(); rideEdit({ decay: +rd.value }); }); rr.addEventListener("input", function (){ rr.show(); rideEdit({ reverb: +rr.value }); });
      rh.addEventListener("input", function (){ rh.show(); rideEdit({ hp: +rh.value }); }); rl.addEventListener("input", function (){ rl.show(); rideEdit({ lp: +rl.value }); });
      rd.value = global.RideSynth.VARIANTS.medium20.decay; rd.show();
    }
    // the synth ride for a context (the player's, once there is one); settings carry over
    function rideFor(ctx){
      if (!global.RideSynth) return null;
      if (!ride || (ctx && ride.context() !== ctx)){ ride = global.RideSynth.create(ctx || null); ride.set(rideSet); }
      return ride;
    }
    // with the synth, the band's ride and ride bell are turned to nothing and the same hits are given to the synth
    function kitRide(){ if (player){ player.setKitVolume("ride", rideMode === "synth" ? 0 : 1); player.setKitVolume("rideBell", rideMode === "synth" ? 0 : 1); } }
    function onEvent(e){
      if (rideMode !== "synth" || e.part !== "drums" || (e.piece !== "ride" && e.piece !== "rideBell")) return;
      var r = rideFor(player && player.context()); if (r) try { r.hit(e.time, { bell: e.piece === "rideBell", vel: e.vel }); } catch (x){}
    }

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
      scribe.href = SCRIBE + B.stringify(g).replace(/&(Cg|Tb|Bo)=[^&]*/g, "");
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
      var st = B.steps(g), per = B.perBeat(g), width = host.clientWidth || 800, cell = (st > 16 ? 18 : 24) * size;
      var key = g.n + "/" + g.d + "/" + g.div; if (key !== labelKey){ labelKey = key; labels = {}; }                 // (typed count words belong to one grid)
      shown_title.textContent = g.title; shown_title.hidden = !g.title; shown_title.style.fontSize = 1.4 * titleSize + "rem";
      grid.style.setProperty("--ge-wscale", wordSize);
      perLine = Math.max(1, Math.min(4, g.bars, Math.floor((width - 96) / (st * cell))));
      grid.textContent = ""; cols = [];
      for (var b0 = 0; b0 < g.bars; b0 += perLine){
        var n = Math.min(perLine, g.bars - b0), block = el("div", "ge-block");
        var nameW = width < 480 ? 52 : 90, fit = Math.floor((width - 34 - nameW - 2 * n * st) / (n * st));         // a phone: narrower names, cells as wide as there is room for
        block.style.gridTemplateColumns = nameW + "px repeat(" + n * st + ", minmax(" + Math.max(7, Math.min(cell - 8, fit)) + "px, " + Math.round(38 * size) + "px))";
        rows().forEach(function (r){
          var name = el("button", "ge-name" + (muted[r.lane] ? " ge-muted" : ""), r.name); name.type = "button";
          name.title = "Click: the marks of this row. Shift-click: mute it."; name.addEventListener("click", function (ev){ if (ev.shiftKey){ muted[r.lane] = !muted[r.lane]; refresh(true); } else palette(r.lane, null, name); });
          block.appendChild(name);
          for (var i = 0; i < n * st; i++){ var at = b0 * st + i, c = el("button", "ge-cell"); c.type = "button"; c.dataset.lane = r.lane; c.dataset.at = at;
            if (i % st === 0) c.classList.add("ge-barline"); if (i % per === 0) c.classList.add("ge-beat"); if (Math.floor(i / per) % 2) c.classList.add("ge-odd");
            (cols[at] = cols[at] || []).push(c); block.appendChild(c); }
        });
        block.appendChild(el("span", "ge-name ge-count"));
        for (var j = 0; j < n * st; j++){ var w = el("span", "ge-word" + (j % per === 0 ? " ge-beat" : ""), word(j % st)); w.dataset.i = j % st; (cols[b0 * st + j] = cols[b0 * st + j] || []).push(w); block.appendChild(w); }
        grid.appendChild(block);
      }
      paint(); drawStaff();
    }
    function paint(){
      Array.prototype.forEach.call(grid.querySelectorAll(".ge-cell"), function (c){
        var lane = c.dataset.lane, ch = g.lanes[lane][+c.dataset.at], gl = ch === "-" ? [""] : glyph(lane, ch);
        c.textContent = gl[0]; c.className = c.className.replace(/ ge-(on|acc|ghost|txt|quiet|icon)\b/g, ""); c.style.background = "";
        var ik = ch !== "-" && marks === "icons" ? iconKey(lane, ch) : null;
        if (ik){ c.innerHTML = iconSvg(ik, "72%", (lane === "S" && ch === "O") || (lane === "H" && ch === "X")); c.style.background = ICONS[ik][1]; }
        if (ch !== "-"){ c.classList.add("ge-on"); if (ik) c.classList.add("ge-icon"); else if (gl[1]) c.classList.add("ge-" + gl[1]); if (silent(lane, ch)) c.classList.add("ge-quiet"); c.title = B.CELLS[lane][ch].label + (silent(lane, ch) ? " (no sound yet)" : ""); } else c.title = "";
      });
    }
    function drawStaff(){
      var S = global.LessonScore; if (!S) return;
      var abc = B.toAbc(g, { barsPerLine: perLine, title: false, count: countStaff.checked && counting.value !== "none" ? function (b, i){ return word(i); } : null });
      try { score = S.engrave(paper, abc, { width: Math.max(280, Math.min(host.clientWidth || 700, 180 + Math.min(perLine, g.bars) * 300)) - 40 }); } catch (e){ score = null; paper.textContent = ""; }
    }

    // ---- writing in the grid
    function hear(lane, ch){
      var c = B.CELLS[lane][ch], P = global.BandPlayer; if (!c || !c.piece || !P || !P.hit || playing || silent(lane, ch)) return;
      try {
        if (rideMode === "synth" && (c.piece === "ride" || c.piece === "rideBell")){ var r = rideFor(player && player.context()); if (r) r.hit(0, { bell: c.piece === "rideBell", vel: c.vel }); return; }
        P.hit(c.piece, { vel: Math.min(1, c.vel + 0.2), bank: /^bongo/.test(c.piece) ? "congas" : undefined }); if (lane === "K" && ch === "X") P.hit("hatFoot", { vel: 0.6 });
      } catch (e){}
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

    // ---- the grid as a picture of its own (black on white; the icons in colour when Marks is Icons)
    function gridSvg(){
      var st = B.steps(g), per = B.perBeat(g), C = marks === "icons" ? 44 : 36, nameW = 110, pad = 16, rs = rows(), perL = Math.max(1, Math.min(g.bars, Math.floor((1400 - nameW) / (st * C))));
      var titleH = g.title ? 44 : 0, countH = 24, gap = 22, lines = Math.ceil(g.bars / perL), body = "", y = pad + titleH, widest = 0, b0, j;
      var width = pad * 2 + nameW + perL * st * C;
      if (g.title) body += '<text x="' + width / 2 + '" y="' + (pad + 28) + '" text-anchor="middle" font-size="' + Math.round(26 * titleSize) + '" font-weight="600">' + xml(g.title) + "</text>";
      for (b0 = 0; b0 < g.bars; b0 += perL){
        var n = Math.min(perL, g.bars - b0), x0 = pad + nameW;
        rs.forEach(function (r, ri){
          var cy = y + ri * C;
          body += '<text x="' + (pad + 2) + '" y="' + (cy + C / 2 + 5) + '" font-size="14">' + xml(r.name) + "</text>";
          for (var i = 0; i < n * st; i++){
            var at = b0 * st + i, ch = g.lanes[r.lane][at], cx = x0 + i * C, bg = "#fff", inner = "", ik = ch !== "-" && marks === "icons" ? iconKey(r.lane, ch) : null;
            if (ch !== "-"){
              if (ik){ bg = ICONS[ik][1]; inner = iconSvg(ik, C * 0.72, (r.lane === "S" && ch === "O") || (r.lane === "H" && ch === "X")).replace("<svg ", '<svg x="' + (cx + C * 0.14) + '" y="' + (cy + C * 0.14) + '" color="#000" ').replace(/currentColor/g, "#000"); }
              else { var gl = glyph(r.lane, ch); inner = '<text x="' + (cx + C / 2) + '" y="' + (cy + C / 2 + 5) + '" text-anchor="middle" font-size="' + (gl[1] === "txt" ? 12 : 17) + '" font-weight="' + (gl[1] === "acc" ? 700 : 400) + '">' + xml(gl[0]) + "</text>"; }
            }
            body += '<rect x="' + cx + '" y="' + cy + '" width="' + C + '" height="' + C + '" fill="' + bg + '" stroke="#000" stroke-width="1"/>' + inner;
            if (i % st === 0) body += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy + C) + '" stroke="#000" stroke-width="3"/>';
            else if (i % per === 0) body += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy + C) + '" stroke="#000" stroke-width="2"/>';
          }
        });
        for (j = 0; j < n * st; j++) body += '<text x="' + (x0 + j * C + C / 2) + '" y="' + (y + rs.length * C + 17) + '" text-anchor="middle" font-size="' + Math.round(15 * wordSize) + '" font-weight="' + (j % per === 0 ? 700 : 400) + '">' + xml(word(j % st)) + "</text>";
        y += rs.length * C + countH + gap; widest = Math.max(widest, n);
      }
      var height = y - gap + pad;
      return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" font-family="Helvetica, Arial, sans-serif"><rect width="100%" height="100%" fill="#fff"/>' + body + "</svg>", width: width, height: height };
    }
    function exportPng(scale){
      scale = scale || 2; var s = gridSvg();
      return new Promise(function (resolve, reject){
        var img = new Image();
        img.onload = function (){
          try { var cv = document.createElement("canvas"); cv.width = s.width * scale; cv.height = s.height * scale; var cx = cv.getContext("2d");
            cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
            resolve({ dataUrl: cv.toDataURL("image/png"), width: cv.width, height: cv.height }); } catch (e){ reject(e); }
        };
        img.onerror = function (){ reject(new Error("the picture did not draw")); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.svg);
      });
    }

    // ---- the band's drummer plays it
    function chart(){ var body = ""; for (var i = 0; i < g.bars; i++) body += "z" + (16 * g.n / g.d) + "|"; return global.TuneChart.parse("X:1\nM:" + g.n + "/" + g.d + "\nL:1/16\nK:C\n" + body); }
    function sounding(){ var c = B.parse(B.stringify(g)); Object.keys(muted).forEach(function (l){ if (muted[l]) c.lanes[l] = c.lanes[l].map(function (){ return "-"; }); }); return c; }
    function opts(){ var s = sounding(); return { written: B.stringify(s), writtenPieces: pieces, writtenClick: g.metronome || 0, feel: "straight", fills: "none", congas: B.HAND_LANES.some(function (l){ return s.lanes[l].some(function (c){ return c !== "-"; }); }) ? "written" : "none" }; }
    function play(){
      var P = global.BandPlayer; if (!P || playing) return;
      if (!player) player = P.create({ parsed: chart(), tempo: B.bpm(g), countIn: countIn.checked ? 1 : 0, opts: opts(), instruments: ["kit"], humanize: human.checked ? 1 : 0, kit: rideMode === "synth" ? { ride: 0, rideBell: 0 } : {}, onEvent: onEvent,
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

    // the tune page changes meter in another tab: follow it while nothing has been written here
    if (!cfg.text && !fromUrl) global.addEventListener("storage", function (ev){
      if (ev.key !== "tuneMeter" || undo.length || playing) return;
      g = B.parse(startText()); refresh(true);
      if (fam){ var f2 = tuneMeter(); fam.value = f2 && L ? L.meterOf(f2.n, f2.d) : ""; fam.dispatchEvent(new Event("change")); }
    });

    syncShown(); refresh(true);
    return { groove: function (){ return g; }, text: function (){ return B.stringify(g); }, load: function (t){ change(function (){ g = B.parse(t); }, true); },
      play: play, stop: stop, undo: function (){ step(undo, redo); }, redo: function (){ step(redo, undo); }, isPlaying: function (){ return playing; },
      where: function (){ return lastCol; }, player: function (){ return player; }, gridSvg: gridSvg, exportPng: exportPng, ride: function (){ return rideFor(player && player.context()); } };
  }

  global.GrooveEditor = { create: create, countWord: countWord };
})(typeof window !== "undefined" ? window : globalThis);
