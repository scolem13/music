// groove.js — a written drum groove and its text form (BandGroove).
// The band's drummer (drums.js) makes its part up as it goes; this is the other kind: a groove somebody wrote down, cell by
// cell, as the Drumset tool edits it. Pure logic: no audio, no page.
//
//   var g = BandGroove.parse("?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|");
//   BandGroove.stringify(g)            -> the same kind of string (the address of the page is the save file)
//   BandGroove.create({ n, d, div, bars, tempo })   -> an empty groove
//   BandGroove.toEvents(g, opts)       -> [bar][{ pos, piece, vel, art?, straight? }]   what drums.bar(ctx) returns, one list per bar
//   BandGroove.congaEvents(g, opts)    -> the same for the two hand lanes: [{ pos, piece, vel, stroke, straight? }]
//   BandGroove.fromEvents(bars, opts)  -> a groove from bars of such events (opts: n, d, tempo, swung, div, title)
//   BandGroove.steps(g)                -> cells in one bar;  BandGroove.pos(g, step, ratio) -> where in the bar a cell is, in beats
//   BandGroove.set(g, lane, i, ch)     -> change one cell (false if that lane has no such letter);  resize(g, changes) -> a new groove
//   BandGroove.LANES, CELLS, DIVS      the lanes in staff order, what each letter in each lane means, the divisions on offer
//   BandGroove.divsFor(n, d)           -> the divisions a meter can have (a beat must be a whole number of cells; triplets only
//                                         where the beat is a quarter or a half note)
//   BandGroove.toAbc(g, opts)          -> the groove as ABC for abcjs (see NOTATION below);  BandGroove.bpm(g) -> the band's tempo
//
// THE TEXT is the query string GrooveScribe uses (github.com/montulli/GrooveScribe), so its links open here and ours open
// there. Nothing of its code is used: the format was worked out from what it reads and writes. Names are matched without
// regard to case.
//   TimeSig=4/4  Div=16      the division is the note value the grid is made of (4 8 16 32, or triplets: 12 24 48), so a
//                            bar has Div / lower * upper cells. One division for the whole groove.
//   Tempo  Swing (0-60)  Measures (1-10)  Title  Author  Comments  MetronomeFreq (0 4 8 16)
//                            Tempo counts quarter notes whatever the meter; BandGroove.bpm(g) is the band's tempo (its beat is
//                            the meter's lower note, the dotted quarter in 6/8).
//   H S K T1 T2 T3 T4 Stickings   one lane each, "|" between bars, "-" = nothing:
//     H          x hi-hat   X accented   o open   + closed (written with a +)   r ride   b ride bell   c crash
//                s stacker  m cowbell    n N a metronome click, plain and accented
//     S          o snare    O accented   g ghost  x cross-stick   f flam   d drag   b buzz
//     K          o kick     x hi-hat foot   X both
//     T1..T4     o (x is read as o), highest drum first. The band's three toms are T1, T2 and T4 (the floor tom), which puts
//                each where GrooveScribe writes it on the staff; T3 is a fourth drum between them.
//     Stickings  R L   B both hands   c count
//   Ours, in names GrooveScribe does not read:  Cg (conga) and Tb (tumba), the stroke letters of congas.js: H heel, T toe,
//   S slap, O open, M muffled, B bass (the tumba: O M B).
// A lane GrooveScribe's address leaves out is not empty there: H is every cell, S the even beats' backbeat, K the others.
// parse() does the same, so a short link sounds as it does on that site. A lane of the wrong length is stretched or thinned
// when it is out by a whole factor of two or more (an eighth-note lane on a sixteenth grid), else cut or padded with rests.
// parse() never throws: what it could not read is listed in g.warnings.
//
// A GROOVE: { n, d, div, bars, tempo, swing, title, author, comments, metronome, lanes: { H: ["x","-",...], ... }, warnings }.
// A lane is one letter per cell, bars * steps(g) of them. lanes holds every lane always; stringify writes T1..T4, Stickings,
// Cg and Tb only when something is in them.
//
// EVENTS. pos is in the band's beats: the meter's lower note, or the dotted quarter in 6/8, 9/8 and 12/8. vel is the level of
// the letter (LEVELS: accent / normal / ghost; nobody has listened to these). art names what the level alone does not say:
// "accent" "ghost" "flam" "drag" "buzz" "closed". Triplet divisions and compound meters are marked straight:true, so the
// player leaves them where they are. Pieces the band's kit has no sample for yet (tom3, stacker, cowbell, click, clickHi)
// are given out like any other; pass opts.pieces (a list of names) to have the rest dropped.
// Ornaments: a flam, a drag and a buzz are more than one hit. toEvents adds them (opts.ornaments === false: not), each marked
// grace:true, at the tempo opts.tempo (the band's beats a minute; else bpm(g)): a flam's grace note 30 ms before its main note,
// a drag's two at 70 and 35 ms before, a buzz's bounces every 28 ms after it for most of its cell (at most 0.3 s), each quieter.
// A grace note before the first beat has a pos below 0. These are made of the ordinary snare sample, not recorded ornaments.
// Swing: opts.swing = where the second cell of each pair lands (0.5 = even, 0.667 = triplets), or true for the groove's own
// (0.5 + Swing / 200, GrooveScribe's arithmetic). It moves the eighths of an eighth-note grid and the sixteenths of a
// sixteenth-note grid, as there; no other division swings. Swung events are straight:true (already where they belong).
// Without opts.swing, x.5 is left for the player to swing, as in drums.js.

(function (global) {
  var LANES = ["H", "S", "K", "T1", "T2", "T3", "T4", "Stickings", "Cg", "Tb"];
  var DIVS = [4, 8, 16, 32, 12, 24, 48];
  var MAX_BARS = 10;
  var LEVELS = { accent: 0.85, normal: 0.62, ghost: 0.24 };

  function cell(piece, vel, label, art){ var c = { piece: piece, vel: vel, label: label }; if (art) c.art = art; return c; }
  var TOM = function (piece, label){ return { o: cell(piece, 0.60, label) }; };
  var CELLS = {
    H: { x: cell("hatClosed", 0.42, "Hi-hat"), X: cell("hatClosed", 0.64, "Hi-hat, accented", "accent"), o: cell("hatOpen", 0.50, "Open hi-hat"),
         "+": cell("hatClosed", 0.42, "Closed hi-hat (after an open one)", "closed"), r: cell("ride", 0.50, "Ride cymbal"),
         b: cell("rideBell", 0.55, "Ride bell"), c: cell("crash", 0.75, "Crash cymbal"), s: cell("stacker", 0.55, "Stacker"),
         m: cell("cowbell", 0.55, "Cowbell"), n: cell("click", 0.50, "Metronome click"), N: cell("clickHi", 0.70, "Metronome click, accented") },
    S: { o: cell("snare", LEVELS.normal, "Snare"), O: cell("snare", LEVELS.accent, "Snare, accented", "accent"), g: cell("snare", LEVELS.ghost, "Ghost note", "ghost"),
         x: cell("rim", 0.50, "Cross-stick"), f: cell("snare", 0.74, "Flam", "flam"), d: cell("snare", LEVELS.normal, "Drag", "drag"), b: cell("snare", 0.50, "Buzz", "buzz") },
    K: { o: cell("kick", 0.60, "Kick"), x: cell("hatFoot", 0.40, "Hi-hat foot"), X: cell("kick", 0.60, "Kick and hi-hat foot") },
    T1: TOM("tomHi", "High tom"), T2: TOM("tomMid", "Mid tom"), T3: TOM("tom3", "Low tom"), T4: TOM("tomLo", "Floor tom"),
    Stickings: { R: { label: "Right" }, L: { label: "Left" }, B: { label: "Both" }, c: { label: "Count" } },
    Cg: { H: cell("congaHeel", 0.34, "Heel"), T: cell("congaToe", 0.30, "Toe"), S: cell("congaSlap", 0.66, "Slap"), O: cell("congaOpen", 0.62, "Open tone"),
          M: cell("congaMute", 0.44, "Muffled tone"), B: cell("congaBass", 0.52, "Bass tone") },
    Tb: { O: cell("tumbaOpen", 0.62, "Open tone"), M: cell("tumbaMute", 0.44, "Muffled tone"), B: cell("tumbaBass", 0.52, "Bass tone") }
  };
  var KIT_LANES = ["H", "S", "K", "T1", "T2", "T3", "T4"], HAND_LANES = ["Cg", "Tb"];
  // letters read as another: what GrooveScribe takes without writing
  var ALIAS = { H: { R: "r", B: "b" }, T1: { x: "o" }, T2: { x: "o" }, T3: { x: "o" }, T4: { x: "o" }, Stickings: { r: "R", l: "L", b: "B" },
                Cg: { h: "H", t: "T", s: "S", o: "O", m: "M", b: "B" }, Tb: { o: "O", m: "M", b: "B" } };

  function compound(g){ return g.d === 8 && g.n >= 6 && g.n % 3 === 0; }
  function triplet(g){ return g.div % 3 === 0; }
  function steps(g){ return g.div / g.d * g.n; }
  function beats(g){ return compound(g) ? g.n / 3 : g.n; }
  function perBeat(g){ return steps(g) / beats(g); }
  function swings(g){ return !compound(g) && (g.div === 8 || g.div === 16); }
  function ratioOf(g){ return 0.5 + Math.max(0, Math.min(60, g.swing || 0)) / 200; }
  function round6(x){ return Math.round(x * 1e6) / 1e6; }

  // where cell `step` of a bar is, in beats; ratio (optional) = where the second cell of a swung pair lands
  function pos(g, step, ratio){
    var per = perBeat(g);
    if (ratio && ratio !== 0.5 && swings(g) && step % 2 === 1) return round6((step - 1 + 2 * ratio) / per);
    return round6(step / per);
  }

  function divsFor(n, d){
    var m = { n: n, d: d };
    return DIVS.filter(function (div){ var x = { n: n, d: d, div: div }, st = steps(x), per = st / beats(x);
      if (st !== Math.floor(st) || per !== Math.floor(per) || per < 1) return false;
      return div % 3 !== 0 || (!compound(m) && d <= 4); });
  }
  function bpm(g){ return round6(g.tempo * (compound(g) ? 2 / 3 : g.d / 4)); }
  function rests(len){ var a = []; for (var i = 0; i < len; i++) a.push("-"); return a; }
  function int(v, def){ var x = parseInt(v, 10); return isNaN(x) ? def : x; }

  function create(o){
    o = o || {};
    var g = { n: o.n || 4, d: o.d || 4, div: o.div || 16, bars: Math.max(1, Math.min(MAX_BARS, o.bars || 1)), tempo: o.tempo || 80, swing: o.swing || 0,
              title: o.title || "", author: o.author || "", comments: o.comments || "", metronome: o.metronome || 0, lanes: {}, warnings: [] };
    if (DIVS.indexOf(g.div) < 0){ g.warnings.push("Division " + g.div + " is not one of " + DIVS.join(", ") + "; using 16."); g.div = 16; }
    if (divsFor(g.n, g.d).indexOf(g.div) < 0){ var ok = divsFor(g.n, g.d), to = ok.indexOf(16) >= 0 ? 16 : ok[ok.length - 1];
      g.warnings.push("A bar of " + g.n + "/" + g.d + " cannot be divided into " + g.div + "; using " + to + "."); g.div = to; }
    LANES.forEach(function (l){ g.lanes[l] = rests(g.bars * steps(g)); });
    return g;
  }

  // one lane of text -> its cells
  function readLane(g, lane, text){
    var want = g.bars * steps(g), src = text.replace(/[:!()\[\]|\s]/g, "").split(""), out = rests(want), k = 1, i;
    if (src.length > want && src.length / want >= 2){ k = Math.ceil(src.length / want); for (i = 0; i < want; i++) out[i] = src[i * k] || "-"; }
    else if (src.length < want && src.length && want / src.length >= 2){ k = Math.ceil(want / src.length); for (i = 0; i < src.length && i * k < want; i++) out[i * k] = src[i]; }
    else { if (src.length !== want) g.warnings.push(lane + " has " + src.length + " cells for a groove of " + want + "."); for (i = 0; i < want; i++) out[i] = src[i] || "-"; }
    return out.map(function (ch, j){
      if (ch === "-") return ch;
      if (!CELLS[lane][ch] && ALIAS[lane] && ALIAS[lane][ch]) ch = ALIAS[lane][ch];
      if (CELLS[lane][ch]) return ch;
      g.warnings.push(lane + ": \"" + ch + "\" in cell " + (j + 1) + " is not a letter of that lane."); return "-";
    });
  }
  // what GrooveScribe plays for a lane its address leaves out
  function defaultLane(g, lane){
    var st = steps(g), per = st / g.n, out = [];
    for (var b = 0; b < g.bars; b++) for (var i = 0; i < st; i++){
      var onBeat = i % per === 0, beat = i / per;
      out.push(lane === "H" ? (st === 48 ? "-" : "x") : lane === "S" ? (onBeat && beat % 2 === 1 ? "O" : "-") : (onBeat && beat % 2 === 0 ? "o" : "-"));
    }
    return out;
  }

  function parse(text){
    var q = String(text == null ? "" : text), at = q.indexOf("?"), params = {};
    if (at >= 0) q = q.slice(at + 1);
    q = q.replace(/#.*$/, "");
    q.split("&").forEach(function (pair){
      var eq = pair.indexOf("="); if (eq < 0) return;
      var name = pair.slice(0, eq).toLowerCase(), val = pair.slice(eq + 1);
      try { val = decodeURIComponent(val); } catch (e) {}                                 // a "+" stays a "+": it is the closed hi-hat
      if (!(name in params)) params[name] = val;                                           // the first of a repeated name, as GrooveScribe
    });
    var ts = String(params.timesig || "4/4").split("/"), n = int(ts[0], 4), d = int(ts[1], 4), warn = [];
    if (ts.length !== 2 || n < 1 || n > 32){ if (params.timesig) warn.push("Time signature \"" + params.timesig + "\" not understood; using 4/4."); n = 4; d = 4; }
    if ([2, 4, 8, 16].indexOf(d) < 0){ warn.push("A time signature over " + d + " is not supported; using " + n + "/4."); d = 4; }
    var bars = int(params.measures, 1); if (bars < 1) bars = 1;
    if (bars > MAX_BARS){ warn.push("Only the first " + MAX_BARS + " bars are kept."); bars = MAX_BARS; }
    var swing = int(params.swing, 0); if (swing < 0 || swing > 60) swing = 0;
    var g = create({ n: n, d: d, div: int(params.div, 16), bars: bars, tempo: Math.max(20, Math.min(400, int(params.tempo, 80))), swing: swing,
                     title: params.title || "", author: params.author || "", comments: params.comments || "", metronome: int(params.metronomefreq, 0) });
    g.warnings = warn.concat(g.warnings);
    LANES.forEach(function (lane){
      var v = params[lane.toLowerCase()];
      if (v != null && v !== "") g.lanes[lane] = readLane(g, lane, v);
      else if (lane === "H" || lane === "S" || lane === "K") g.lanes[lane] = defaultLane(g, lane);
    });
    return g;
  }

  function laneText(g, lane){
    var st = steps(g), s = "|";
    for (var b = 0; b < g.bars; b++) s += g.lanes[lane].slice(b * st, (b + 1) * st).join("") + "|";
    return s;
  }
  function used(g, lane){ return g.lanes[lane].some(function (c){ return c !== "-"; }); }
  function stringify(g){
    var s = "?TimeSig=" + g.n + "/" + g.d + "&Div=" + g.div;
    if (g.title) s += "&Title=" + encodeURIComponent(g.title);
    if (g.author) s += "&Author=" + encodeURIComponent(g.author);
    if (g.comments) s += "&Comments=" + encodeURIComponent(g.comments);
    s += "&Tempo=" + g.tempo;
    if (g.swing > 0) s += "&Swing=" + g.swing;
    s += "&Measures=" + g.bars;
    if (g.metronome) s += "&MetronomeFreq=" + g.metronome;
    LANES.forEach(function (lane){ if (lane === "H" || lane === "S" || lane === "K" || used(g, lane)) s += "&" + lane + "=" + laneText(g, lane); });
    return s;
  }

  function set(g, lane, i, ch){
    if (!g.lanes[lane] || i < 0 || i >= g.lanes[lane].length) return false;
    if (ch !== "-" && !CELLS[lane][ch]) return false;
    g.lanes[lane][i] = ch; return true;
  }

  // A new groove with another meter, division or number of bars. A cell keeps its place in time where the new grid has that
  // place; what falls between the new cells is dropped (and named in warnings). New bars are empty.
  function resize(g, ch){
    var o = create({ n: ch.n || g.n, d: ch.d || g.d, div: ch.div || g.div, bars: ch.bars || g.bars, tempo: g.tempo, swing: g.swing, title: g.title,
                     author: g.author, comments: g.comments, metronome: g.metronome });
    var a = steps(g), b = steps(o), lost = 0;
    var sameBar = g.n * o.d === o.n * g.d;                                                  // the bar is as long as it was: map by time
    LANES.forEach(function (lane){
      for (var bar = 0; bar < Math.min(g.bars, o.bars); bar++) for (var i = 0; i < a; i++){
        var c = g.lanes[lane][bar * a + i]; if (c === "-") continue;
        var j = sameBar ? i * b / a : i * (o.div / g.div);                                  // else by note value, from the bar line
        if (j !== Math.floor(j) || j >= b){ lost++; continue; }
        o.lanes[lane][bar * b + j] = c;
      }
    });
    if (lost) o.warnings.push(lost + (lost === 1 ? " note has" : " notes have") + " no place on the new grid.");
    return o;
  }

  var ORN = { flam: [[-0.030, 0.42]], drag: [[-0.070, 0.38], [-0.035, 0.42]] };
  function ornaments(e, g, opts, cellBeats){
    var spb = 60 / (opts.tempo || bpm(g)), out = [];
    function grace(dt, k){ var x = { pos: round6(e.pos + dt / spb), piece: e.piece, vel: round6(e.vel * k), grace: true, straight: true }; out.push(x); }
    if (ORN[e.art]) ORN[e.art].forEach(function (o){ grace(o[0], o[1]); });
    if (e.art === "buzz"){ var len = Math.min(0.3, cellBeats * spb * 0.9), n = Math.floor(len / 0.028);
      for (var k = 1; k <= n; k++) grace(k * 0.028, 0.75 - 0.4 * (k - 1) / Math.max(1, n - 1)); }
    return out;
  }
  function events(g, lanes, opts){
    opts = opts || {};
    var st = steps(g), ratio = opts.swing === true ? ratioOf(g) : (opts.swing || 0), swung = ratio && ratio !== 0.5 && swings(g);
    var straight = swung || triplet(g) || compound(g), keep = opts.pieces, out = [];
    for (var b = 0; b < g.bars; b++){
      var bar = [];
      for (var i = 0; i < st; i++) lanes.forEach(function (lane){
        var ch = g.lanes[lane][b * st + i]; if (ch === "-") return;
        var c = CELLS[lane][ch], p = pos(g, i, swung ? ratio : 0);
        function add(piece, vel){
          if (keep && keep.indexOf(piece) < 0) return;
          var e = { pos: p, piece: piece, vel: vel };
          if (c.art) e.art = c.art;
          if (lane === "Cg" || lane === "Tb") e.stroke = ch;
          if (straight) e.straight = true;
          bar.push(e);
          if (opts.ornaments !== false && (c.art === "flam" || c.art === "drag" || c.art === "buzz")) bar.push.apply(bar, ornaments(e, g, opts, 1 / perBeat(g)));
        }
        add(c.piece, c.vel);
        if (lane === "K" && ch === "X") add("hatFoot", CELLS.K.x.vel);
      });
      bar.sort(function (a, b){ return a.pos - b.pos; });
      out.push(bar);
    }
    return out;
  }
  function toEvents(g, opts){ return events(g, KIT_LANES, opts); }
  function congaEvents(g, opts){ return events(g, HAND_LANES, opts); }

  // ---- the other way: bars of events -> a groove ----
  // piece -> [lane, letter by level]. A piece with no lane (clap, tamb, sticks) is left out and named in warnings.
  var FROM = {
    hatClosed: function (e){ return ["H", e.art === "closed" ? "+" : e.art === "accent" || e.vel >= 0.56 ? "X" : "x"]; },
    hatOpen: function (){ return ["H", "o"]; }, ride: function (){ return ["H", "r"]; }, ride2: function (){ return ["H", "r"]; },
    rideBell: function (){ return ["H", "b"]; }, crash: function (){ return ["H", "c"]; }, stacker: function (){ return ["H", "s"]; },
    cowbell: function (){ return ["H", "m"]; }, click: function (){ return ["H", "n"]; }, clickHi: function (){ return ["H", "N"]; },
    snare: function (e){ return ["S", e.art === "flam" ? "f" : e.art === "drag" ? "d" : e.art === "buzz" ? "b" : e.art === "ghost" || e.vel < 0.42 ? "g" : e.art === "accent" || e.vel >= 0.74 ? "O" : "o"]; },
    rim: function (){ return ["S", "x"]; }, kick: function (){ return ["K", "o"]; }, hatFoot: function (){ return ["K", "x"]; },
    tomHi: function (){ return ["T1", "o"]; }, tomMid: function (){ return ["T2", "o"]; }, tom3: function (){ return ["T3", "o"]; }, tomLo: function (){ return ["T4", "o"]; },
    congaHeel: function (){ return ["Cg", "H"]; }, congaToe: function (){ return ["Cg", "T"]; }, congaSlap: function (){ return ["Cg", "S"]; }, congaOpen: function (){ return ["Cg", "O"]; },
    congaMute: function (){ return ["Cg", "M"]; }, congaBass: function (){ return ["Cg", "B"]; }, tumbaOpen: function (){ return ["Tb", "O"]; }, tumbaMute: function (){ return ["Tb", "M"]; },
    tumbaBass: function (){ return ["Tb", "B"]; }
  };
  // when two pieces of one lane fall on one cell, the one further left stays
  var RANK = { H: "cobrsmXx+nN", S: "fdbOoxg", K: "Xox" };
  var FIT = [8, 16, 12, 24, 32, 48];                                                       // tried in this order; 48 holds sixteenths and triplets both

  // opts: n, d (the meter; 4/4), tempo, title, div (else the coarsest grid every note sits on), swung: true = the events are
  // swing eighths as drums.js writes them (x.5 for the player to swing), to be written as triplets: x.5 becomes the third
  // triplet, and events already straight:true stay where they are.
  function fromEvents(bars, opts){
    opts = opts || {};
    var proto = { n: opts.n || 4, d: opts.d || 4 }, comp = compound(proto), warn = [];
    function place(e){
      var p = e.pos;
      if (opts.swung && !e.straight && !comp){ var b = Math.floor(p), f = p - b; p = b + (f <= 0.5 ? f * (4 / 3) : 2 / 3 + (f - 0.5) * (2 / 3)); }
      return p;
    }
    function stepOf(div, p){ return p * (comp ? 3 * div / 8 : div / proto.d); }
    function fits(div){
      var st = div / proto.d * proto.n; if (st !== Math.floor(st)) return false;
      return bars.every(function (bar){ return bar.every(function (e){ if (!FROM[e.piece] || e.grace) return true; var s = stepOf(div, place(e)); return Math.abs(s - Math.round(s)) < 1e-3; }); });
    }
    var div = opts.div;
    if (!div){ for (var k = 0; k < FIT.length && !div; k++) if (fits(FIT[k])) div = FIT[k]; }
    if (!div){ div = 48; warn.push("Some notes sit on no grid; they were moved to the nearest cell."); }
    var g = create({ n: proto.n, d: proto.d, div: div, bars: bars.length, tempo: opts.tempo, title: opts.title });
    var st = steps(g), unknown = {}, clash = 0;
    bars.slice(0, g.bars).forEach(function (bar, b){
      bar.forEach(function (e){
        if (e.grace) return;                                                                  // (a flam's or buzz's extra hits: the art says it)
        if (!FROM[e.piece]){ if (e.piece) unknown[e.piece] = 1; return; }
        var m = FROM[e.piece](e), lane = m[0], ch = m[1], i = Math.round(stepOf(div, place(e)));
        if (i < 0 || i >= st) return;
        var at = b * st + i, was = g.lanes[lane][at];
        if (lane === "K" && was !== "-" && was !== ch){ g.lanes[lane][at] = "X"; return; }   // kick and foot together have a letter of their own
        if (was !== "-" && was !== ch){ clash++; var r = RANK[lane] || ""; if (r.indexOf(was) >= 0 && (r.indexOf(ch) < 0 || r.indexOf(was) < r.indexOf(ch))) return; }
        g.lanes[lane][at] = ch;
      });
    });
    var names = Object.keys(unknown);
    if (names.length) warn.push("Left out (no lane for them): " + names.join(", ") + ".");
    if (clash) warn.push(clash + (clash === 1 ? " cell had" : " cells had") + " two pieces of one lane; one was kept.");
    g.warnings = g.warnings.concat(warn);
    return g;
  }


  // ---- NOTATION: the groove as ABC ----
  // Two voices on a percussion staff, cymbals, snare and toms stems up, kick and hi-hat foot stems down; a third ("Cga.") when
  // the hand lanes have notes. Every piece is where notation.js puts it (WRITTEN is checked against BandNotation.drumWritten by
  // the tests), and the pieces the band does not have are: low tom B, stacker x on b, cowbell a triangle on e, clicks x on c'.
  // A note lasts until the next one of its voice in the same beat, or to the end of the beat (so "x--x" in sixteenths is a
  // dotted eighth and a sixteenth, not four values with rests); a beat is beamed together. Triplet divisions are written as
  // triplets of the note value they look like; a beat with one note on it, or none, is a plain quarter.
  // Marks: accent !accent! · ghost note in parentheses ("<("">)", with no space between: a space would break the beam) · flam and drag as grace notes · buzz !///! · open and
  // closed hi-hat !open! and !plus!. Stickings (R L B, and the count) are words under the upper voice, on the notes it has.
  // opts: title (false = none), barsPerLine (4), names (true = "Dr." / "Cga." at the left), count: fn(bar, step) -> a word to
  // write under the notes in place of the stickings.
  var X = "!style=x!";
  var WRITTEN = { hatClosed: ["g", X], hatOpen: ["g", X], ride: ["f", X], rideBell: ["f", "!style=harmonic!"], crash: ["a", X], stacker: ["b", X], cowbell: ["e", "!style=triangle!"],
                  click: ["c'", X], clickHi: ["c'", X], snare: ["c", ""], rim: ["c", X], tomHi: ["e", ""], tomMid: ["d", ""], tom3: ["B", ""], tomLo: ["A", ""], kick: ["F", ""], hatFoot: ["D", X] };
  var HAND_HEAD = { H: "!style=triangle!", T: "!style=triangle!", S: X, O: "", M: "!style=harmonic!", B: "" };
  var NOTE_LEN = [16, 12, 8, 6, 4, 3, 2, 1];                                              // what one note or rest can be, in units

  function len(tok, n){ return tok + (n === 1 ? "" : n); }
  function fill(tok, n){ var out = ""; while (n > 0){ var k = 0; while (NOTE_LEN[k] > n) k++; out += len(tok, NOTE_LEN[k]); n -= NOTE_LEN[k]; } return out; }
  // one note and the rest after it, for `n` units
  function note(tok, n, rest){ var k = 0; while (NOTE_LEN[k] > n) k++; return len(tok, NOTE_LEN[k]) + fill(rest, n - NOTE_LEN[k]); }
  // a run of cells [from, from + count) of one voice, each `unit` long; on = cell -> token or undefined
  function run(on, from, count, unit, rest){
    var out = "", i = 0, j;
    while (i < count){
      for (j = i + 1; j < count && !on[from + j]; j++);
      out += on[from + i] ? note(on[from + i], (j - i) * unit, rest) : fill(rest, (j - i) * unit);
      i = j;
    }
    return out;
  }
  // one beat of a triplet division: `count` cells from `from`
  function tripletBeat(on, from, count, rest){
    var f = count / 3, i, c, ok;
    for (; f > 1; f /= 2){ ok = true; for (i = 0; i < count; i++) if (on[from + i] && i % f) ok = false; if (ok) break; }
    var out = "";
    for (c = 0; c < count; c += 3 * f){
      var a = on[from + c], b = on[from + c + f], d = on[from + c + 2 * f];
      if (!b && !d){ out += a ? note(a, 2 * f, rest) : fill(rest, 2 * f); continue; }
      var toks = [], in3 = "z";                                                          // (abcjs cannot draw a triplet that has an unseen rest in it)
      if (a && !b) toks.push(len(a, 2 * f)); else { toks.push(len(a || in3, f)); if (b && !d){ toks.push(len(b, 2 * f)); } else if (b) toks.push(len(b, f)); }
      if (d){ if (!a && !b){ toks = [len(in3, 2 * f)]; } toks.push(len(d, f)); }
      out += "(3:2:" + toks.length + toks.join("");
    }
    return out;
  }

  function toAbc(g, opts){
    opts = opts || {};
    var st = steps(g), trip = triplet(g), cmp = compound(g), hands = HAND_LANES.some(function (l){ return used(g, l); });
    var unitDiv = trip ? g.div * 2 / 3 : g.div;                                           // L: one cell (a triplet cell is written as the next value down)
    var group = cmp ? unitDiv * 3 / 8 : Math.max(1, unitDiv / 4);                         // cells beamed together: a dotted quarter, or a quarter
    if (trip) group = g.div / 4;
    var perLine = opts.barsPerLine || 4, names = opts.names !== false;
    var head = ["X:1"]; if (opts.title !== false && (opts.title || g.title)) head.push("T:" + (opts.title || g.title));
    head.push("M:" + g.n + "/" + g.d, "L:1/" + unitDiv, "Q:" + (cmp ? "3/8" : "1/" + g.d) + "=" + Math.round(bpm(g)));
    head.push("%%score (U D)" + (hands ? " C" : ""), "V:U clef=perc stem=up" + (names ? ' name="Dr."' : ""), "V:D clef=perc stem=down");
    if (hands) head.push("V:C clef=perc stem=up" + (names ? ' name="Cga."' : ""));
    head.push("K:C clef=perc");
    // the token of one cell of one voice
    function tokens(lanes, at){
      var heads = [], before = "", seen = {};
      lanes.forEach(function (lane){
        var ch = g.lanes[lane][at]; if (ch === "-") return;
        var c = CELLS[lane][ch], list = lane === "K" && ch === "X" ? ["kick", "hatFoot"] : [c.piece];
        list.forEach(function (piece){
          var w = lane === "Cg" ? ["e", HAND_HEAD[ch]] : lane === "Tb" ? ["A", HAND_HEAD[ch]] : WRITTEN[piece]; if (!w || seen[w[0]]) return;
          seen[w[0]] = 1; heads.push(w[1] + w[0]);
        });
        if (c.art === "accent") before = "!accent!" + before; else if (c.art === "ghost") before += '"<("">)"'; else if (c.art === "buzz") before = "!///!" + before;
        else if (c.art === "flam") before += "{/c}"; else if (c.art === "drag") before += "{cc}"; else if (c.art === "closed") before = "!plus!" + before;
        if (c.piece === "hatOpen") before = "!open!" + before;
      });
      if (!heads.length) return null;
      return before + (heads.length > 1 ? "[" + heads.join("") + "]" : heads[0]);
    }
    function voice(lanes, rest, words){
      var lines = [], line = [], wline = [];
      for (var b = 0; b < g.bars; b++){
        var on = {}, any = false, bar = [];
        for (var i = 0; i < st; i++){ var t = tokens(lanes, b * st + i); if (t){ on[i] = t; any = true; if (words) wline.push(words(b, i) || "*"); } }
        if (!any && rest === "z") bar.push("z" + st * (trip ? 2 / 3 : 1));
        else for (var s = 0; s < st; s += group){ var n = Math.min(group, st - s); bar.push(trip ? tripletBeat(on, s, n, rest) : run(on, s, n, 1, rest)); }
        line.push(bar.join(" "));
        if ((b + 1) % perLine === 0 || b === g.bars - 1){
          lines.push(line.join(" | ") + (b === g.bars - 1 ? " |]" : " |"));
          if (words && wline.some(function (w){ return w !== "*"; })) lines.push("w: " + wline.join(" "));
          line = []; wline = [];
        }
      }
      return lines;
    }
    var stick = { R: "R", L: "L", B: "R/L", c: "" }, hasWords = opts.count || used(g, "Stickings");
    var under = !hasWords ? null : function (b, i){
      var ch = g.lanes.Stickings[b * st + i];
      if (opts.count && (ch === "c" || !used(g, "Stickings"))) return opts.count(b, i);
      return ch === "-" ? "" : stick[ch] || (opts.count ? opts.count(b, i) : "");
    };
    var U = voice(["H", "S", "T1", "T2", "T3", "T4"], "z", under), D = voice(["K"], "x"), C = hands ? voice(HAND_LANES, "z", function (b, i){
      var a = g.lanes.Cg[b * st + i], t = g.lanes.Tb[b * st + i]; return a !== "-" ? a : t !== "-" ? t : ""; }) : null;
    var body = [], per = under && U.some(function (l){ return /^w:/.test(l); }) ? 2 : 1, k = 0, uk = 0, ck = 0;
    for (; k < D.length; k++){
      body.push("V:U", U[uk++]); if (U[uk] && /^w:/.test(U[uk])) body.push(U[uk++]);
      body.push("V:D", D[k]);
      if (C){ body.push("V:C", C[ck++]); if (C[ck] && /^w:/.test(C[ck])) body.push(C[ck++]); }
    }
    return head.concat(body).join("\n") + "\n";
  }

  global.BandGroove = { parse: parse, stringify: stringify, create: create, toEvents: toEvents, congaEvents: congaEvents, fromEvents: fromEvents, set: set, resize: resize,
    toAbc: toAbc, divsFor: divsFor, bpm: bpm, WRITTEN: WRITTEN, steps: steps, beats: beats, perBeat: perBeat, pos: pos, compound: compound, triplet: triplet, swings: swings, swingRatio: ratioOf,
    LANES: LANES, KIT_LANES: KIT_LANES, HAND_LANES: HAND_LANES, CELLS: CELLS, DIVS: DIVS, LEVELS: LEVELS, MAX_BARS: MAX_BARS };
})(typeof window !== "undefined" ? window : globalThis);
