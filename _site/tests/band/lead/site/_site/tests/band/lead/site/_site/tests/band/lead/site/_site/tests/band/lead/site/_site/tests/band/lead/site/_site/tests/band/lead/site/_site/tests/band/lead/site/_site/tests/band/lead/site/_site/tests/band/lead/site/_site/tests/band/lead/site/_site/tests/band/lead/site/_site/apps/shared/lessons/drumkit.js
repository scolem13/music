// drumkit.js — what the drum staff means, for the drum lesson (LessonDrumKit). Two things, both answering "which piece is that?":
//
//   LessonDrumKit.label(score, { onHit(piece) })   after LessonScore.engrave of a drum staff: every note head gets a native tooltip (an SVG
//        <title>, which screen readers read too) naming the piece in plain words, a transparent ellipse over the head so the thin x glyphs are
//        easy to hover, and, when onHit is given, a click on the head plays the piece. A chord (ride + snare + kick on one stem) tells its heads
//        apart: each has its own title. The names come from BandNotation (drumName), the same table that decides where each piece is written,
//        so the picture, the tooltips and the notation cannot disagree. Call it after every engrave; a redrawn staff is a new picture.
//   LessonDrumKit.draw(host, { onHit(piece) })      a drawing of the kit with the five staff lines running through it and a note head on every
//        piece at the height where our notation writes it (BandNotation.drumWritten), a label beside each, and three more hit spots under it
//        for what the kit picture cannot show (open hi-hat, ride bell, cross-stick). Pieces are buttons: click, Enter or Space plays the piece
//        on the band's own sampled kit and flashes it. onHit(piece) is told which, for a page that wants to follow.
//   LessonDrumKit.hit(piece)                        play one piece now (BandPlayer.hit: the page's shared AudioContext and sample bank; a
//        private bank of its own only when the band's player is not on the page). The cross-stick is the band's "rim".
//   LessonDrumKit.pieces                            the pieces of the picture, in order: [{ piece, step, name }]; step counts half-spaces up
//        from the bottom line of the staff (the bottom line = 0, the ledger line for the crash = 10).

(function (global) {
  var NS = "http://www.w3.org/2000/svg";
  var STEP = { D: -1, E: 0, F: 1, G: 2, A: 3, B: 4, c: 5, d: 6, e: 7, f: 8, g: 9, a: 10 };          // a letter of the percussion staff -> half-spaces above its bottom line
  var SOUND = { sticks: "rim" };                                                                    // written like the cross-stick, but the band's click track is not its sound
  function BN() { return global.BandNotation || null; }
  function name(piece) { var n = BN(); return (n && n.drumNames[piece === "rim" ? "sticks" : piece]) || piece; }
  function stepOf(piece) { var n = BN(), w = n && n.drumWritten(piece === "rim" ? "sticks" : piece); return w ? STEP[w.letter] : null; }

  // ---- sound ----
  var own = null;
  function hit(piece) {
    var snd = SOUND[piece] || piece;
    if (global.BandPlayer && global.BandPlayer.hit) return global.BandPlayer.hit(snd).catch(function () {});
    var AC = global.AudioContext || global.webkitAudioContext; if (!AC || !global.BandSounds) return Promise.resolve();
    if (!own) { var ctx = new AC(); own = { ctx: ctx, bank: global.BandSounds.create(ctx) }; }
    if (own.ctx.state === "suspended") own.ctx.resume();
    return own.bank.load(["kit"]).then(function () { own.bank.play("kit", { piece: snd, vel: 0.8 }, own.ctx.currentTime + 0.02, own.ctx.destination); }).catch(function () {});
  }

  // ---- the tooltips ----
  function labelHeads(score, o) {
    o = o || {}; var N = BN(); if (!score || !score.visual || !N || !N.drumName) return 0; var n = 0;
    (score.visual.lines || []).forEach(function (line) { (line.staff || []).forEach(function (st) { (st.voices || []).forEach(function (v) { v.forEach(function (el) {
      if (!el.pitches || !el.abselem || !el.abselem.elemset) return;
      var open = (el.decoration || []).indexOf("open") >= 0, ps = el.pitches.slice().sort(function (a, b) { return a.pitch - b.pitch; });
      el.abselem.elemset.forEach(function (g) {
        if (!g || !g.querySelectorAll) return;
        var heads = g.querySelectorAll(".abcjs-notehead"); if (heads.length !== ps.length) return;
        Array.prototype.forEach.call(heads, function (h, i) {
          var p = ps[i]; if (h.getAttribute("data-name") !== p.name) return;                          // not the head we think it is: say nothing rather than the wrong thing
          var piece = N.drumPiece(p.name, p.style || (ps.length === 1 ? el.style : "") || "", open && p.name === "g"), label = piece && N.drumNames[piece]; if (!label) return;
          var t = document.createElementNS(NS, "title"); t.textContent = label; h.appendChild(t); h.setAttribute("data-piece", piece);
          var bb; try { bb = h.getBBox(); } catch (e) { bb = null; }
          if (bb && bb.width) {
            var c = document.createElementNS(NS, "ellipse"), t2 = document.createElementNS(NS, "title"); t2.textContent = label; c.appendChild(t2);
            c.setAttribute("class", "ld-hit"); c.setAttribute("data-piece", piece); c.setAttribute("cx", bb.x + bb.width / 2); c.setAttribute("cy", bb.y + bb.height / 2);
            c.setAttribute("rx", bb.width / 2 + 2); c.setAttribute("ry", Math.max(bb.height / 2, 3) + 1); c.setAttribute("fill", "#000"); c.setAttribute("fill-opacity", "0");
            c.setAttribute("stroke", "none"); c.style.pointerEvents = "all"; c.style.cursor = o.onHit ? "pointer" : "help";
            if (o.onHit) c.addEventListener("click", function (e) { e.stopPropagation(); o.onHit(piece); });
            h.parentNode.appendChild(c);
          } else h.style.cursor = "help";
          n++;
        });
      });
    }); }); }); });
    return n;
  }

  // ---- the picture ----
  // pieces: where on the kit (cx, drawn in the 500-wide picture), which side the label is on, and its words
  var PIECES = [
    { piece: "crash",     cx: 238, side: "R", words: ["Crash cymbal"] },
    { piece: "ride",      cx: 345, side: "R", words: ["Ride cymbal"] },
    { piece: "hatClosed", cx: 150, side: "L", words: ["Hi-hat,", "with stick"] },
    { piece: "tomHi",     cx: 212, side: "L", words: ["High tom"] },
    { piece: "tomMid",    cx: 282, side: "R", words: ["Mid tom"] },
    { piece: "snare",     cx: 168, side: "L", words: ["Snare drum"] },
    { piece: "tomLo",     cx: 340, side: "R", words: ["Floor tom"] },
    { piece: "kick",      cx: 250, side: "L", words: ["Bass drum"] },
    { piece: "hatFoot",   cx: 150, side: "L", words: ["Hi-hat,", "with foot"] }
  ];
  var ALSO = [{ piece: "hatOpen", words: "Open hi-hat" }, { piece: "rideBell", words: "Ride bell" }, { piece: "rim", words: "Cross-stick" }];
  var Y0 = 230, H = 20, W = 500, HT = 346;                                                          // y of the bottom line, a half-space, the picture's size
  function yOf(step) { return Y0 - H * step; }

  var CSS = '.dk{display:block;width:100%;max-width:640px;height:auto;margin:.4rem auto;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
    + '.dk .dk-s{fill:color-mix(in srgb,var(--site-accent,#2a6fb5) 16%,var(--bs-body-bg,#fff));stroke:var(--site-accent-dk,#1d4f85);stroke-width:1.6;stroke-linejoin:round;cursor:pointer;transition:fill .12s}'
    + '.dk .dk-s.dk-skin{fill:color-mix(in srgb,var(--site-accent,#2a6fb5) 28%,var(--bs-body-bg,#fff))}'
    + '.dk .dk-line{fill:none;stroke:var(--site-accent-dk,#1d4f85);stroke-width:1.6;stroke-linecap:round;pointer-events:none}'
    + '.dk .dk-staff{stroke:var(--site-ink-2,#555);stroke-width:1;opacity:.75;pointer-events:none}'
    + '.dk .dk-lead{stroke:var(--site-ink-2,#555);stroke-width:1;stroke-dasharray:2 3;opacity:.8;pointer-events:none}'
    + '.dk .dk-head{fill:currentColor;pointer-events:none}.dk .dk-x{fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;pointer-events:none}'
    + '.dk .dk-cap{fill:currentColor;font-size:15px;font-weight:600;pointer-events:none}.dk .dk-note{fill:var(--site-ink-2,#555);font-size:13px;pointer-events:none}'
    + '.dk .dk-t{cursor:pointer;outline:none}.dk .dk-t .dk-hit{fill:transparent}'
    + '.dk .dk-btn{fill:var(--bs-body-bg,#fff);stroke:var(--site-border,#ccc);stroke-width:1.2;transition:fill .12s,stroke .12s}'
    + '.dk[data-hot="crash"] .dk-p-crash .dk-s,.dk[data-hot="ride"] .dk-p-ride .dk-s,.dk[data-hot="hatClosed"] .dk-p-hatClosed .dk-s,.dk[data-hot="tomHi"] .dk-p-tomHi .dk-s,.dk[data-hot="tomMid"] .dk-p-tomMid .dk-s,'
    + '.dk[data-hot="snare"] .dk-p-snare .dk-s,.dk[data-hot="tomLo"] .dk-p-tomLo .dk-s,.dk[data-hot="kick"] .dk-p-kick .dk-s,.dk[data-hot="hatFoot"] .dk-p-hatFoot .dk-s{fill:color-mix(in srgb,var(--site-accent,#2a6fb5) 45%,var(--bs-body-bg,#fff))}'
    + '.dk .dk-t:hover .dk-cap,.dk .dk-t:focus-visible .dk-cap{fill:var(--site-accent-dk,#1d4f85);text-decoration:underline}'
    + '.dk .dk-t:focus-visible .dk-ring{stroke:var(--site-accent,#2a6fb5);stroke-width:2.5}.dk .dk-ring{fill:none;stroke:transparent;pointer-events:none}'
    + '.dk .dk-t:hover .dk-btn,.dk .dk-t:focus-visible .dk-btn{fill:color-mix(in srgb,var(--site-accent,#2a6fb5) 14%,var(--bs-body-bg,#fff));stroke:var(--site-accent,#2a6fb5)}'
    + '@keyframes dk-struck{0%{fill:var(--site-accent,#2a6fb5);transform:scale(1.07)}100%{transform:scale(1)}}'
    + '.dk .dk-s.dk-struck{animation:dk-struck .28s ease-out;transform-box:fill-box;transform-origin:center}'
    + '.dk .dk-t.dk-struck .dk-btn{fill:var(--site-accent,#2a6fb5)}'
    + '@media (prefers-reduced-motion:reduce){.dk .dk-s.dk-struck{animation:none;fill:var(--site-accent,#2a6fb5)}}';
  function css() { if (document.getElementById("dk-css")) return; var s = document.createElement("style"); s.id = "dk-css"; s.textContent = CSS; document.head.appendChild(s); }

  function E(tag, attrs, parent) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (parent) parent.appendChild(e); return e; }
  function ell(p, cx, cy, rx, ry, cls, rot) { return E("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, "class": cls || "dk-s", transform: rot ? "rotate(" + rot + " " + cx + " " + cy + ")" : null }, p); }
  function line(p, x1, y1, x2, y2) { return E("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": "dk-line" }, p); }
  function drum(p, cx, cy, rx, ry, depth) {                                                          // a drum seen from a little above: body, then the head on top
    E("path", { d: "M" + (cx - rx) + " " + cy + "v" + depth + "a" + rx + " " + ry + " 0 0 0 " + 2 * rx + " 0v" + (-depth) + "z", "class": "dk-s" }, p);
    ell(p, cx, cy, rx, ry, "dk-s dk-skin");
  }
  function shapes(piece, g, cx, y) {                                                                 // the kit's drawing of one piece, at its head's place
    var s = g;
    if (piece === "hatClosed") {
      line(s, cx, y + 6, cx, 226); line(s, cx, 226, cx - 34, 262); line(s, cx, 226, cx + 34, 262); line(s, cx, 226, cx, 266);
      ell(s, cx, y + 5, 33, 6); ell(s, cx, y - 1, 33, 6, "dk-s dk-skin");
    } else if (piece === "crash") { line(s, cx, y + 7, cx, 240); ell(s, cx, y, 40, 9, "dk-s dk-skin", -4);
    } else if (piece === "ride") { line(s, cx, y + 10, cx, 250); line(s, cx, 236, cx - 28, 268); line(s, cx, 236, cx + 28, 268); ell(s, cx, y, 44, 12, "dk-s dk-skin", -16);
    } else if (piece === "kick") { ell(s, cx, y, 63, 63); ell(s, cx, y, 49, 49, "dk-s dk-skin"); ell(s, cx, y, 7, 7, "dk-s");
    } else if (piece === "hatFoot") { E("path", { d: "M" + (cx - 24) + " " + (y + 18) + "L" + (cx + 20) + " " + (y + 3) + "L" + (cx + 26) + " " + (y + 8) + "L" + (cx - 20) + " " + (y + 24) + "z", "class": "dk-s" }, s);
    } else if (piece === "tomLo") { line(s, cx - 26, y + 36, cx - 30, 258); line(s, cx + 26, y + 36, cx + 30, 258); drum(s, cx, y, 36, 11, 40);
    } else if (piece === "snare") { line(s, cx, y + 30, cx, 232); line(s, cx, 232, cx - 24, 262); line(s, cx, 232, cx + 24, 262); drum(s, cx, y, 38, 11, 28);
    } else { drum(s, cx, y, 31, 10, 28); }                                                           // tomHi, tomMid
  }
  var KITORDER = ["crash", "ride", "hatClosed", "kick", "tomHi", "tomMid", "snare", "tomLo", "hatFoot"];   // back to front
  function glyph(p, kind, x, y) {                                                                    // a note head, as it is written
    if (kind === "x") { var a = 7; E("path", { d: "M" + (x - a) + " " + (y - a) + "L" + (x + a) + " " + (y + a) + "M" + (x + a) + " " + (y - a) + "L" + (x - a) + " " + (y + a), "class": "dk-x" }, p); }
    else if (kind === "harmonic") E("path", { d: "M" + (x - 9) + " " + y + "L" + x + " " + (y - 7) + "L" + (x + 9) + " " + y + "L" + x + " " + (y + 7) + "z", "class": "dk-head" }, p);
    else E("ellipse", { cx: x, cy: y, rx: 9, ry: 6.2, "class": "dk-head", transform: "rotate(-20 " + x + " " + y + ")" }, p);
  }

  function draw(host, o) {
    o = o || {}; css(); host.textContent = ""; var N = BN();
    var svg = E("svg", { viewBox: "0 0 " + W + " " + HT, "class": "dk", role: "group", "aria-label": "A drum set with the five lines of a staff across it. Each piece has a note head where it is written. Click a piece to hear it." }, host);
    E("title", {}, svg).textContent = "The drum set, and where each piece is written";
    var hot = function (p) { if (p) svg.setAttribute("data-hot", p); else svg.removeAttribute("data-hot"); };
    var strike = function (els, piece) { els.forEach(function (e) { e.classList.remove("dk-struck"); void e.getBoundingClientRect(); e.classList.add("dk-struck"); setTimeout(function () { e.classList.remove("dk-struck"); }, 320); });
      hit(piece); if (o.onHit) { try { o.onHit(piece); } catch (e) {} } };
    var by = {}; PIECES.forEach(function (d) { by[d.piece] = d; });
    // 1. the drums, back to front; each is clickable too
    var back = E("g", { "aria-hidden": "true" }, svg), shapeEls = {};
    KITORDER.forEach(function (k) {
      var d = by[k], st = stepOf(k), g = E("g", { "class": "dk-p-" + k, "data-piece": k }, back); if (st == null) return;
      shapes(k, g, d.cx, yOf(st)); shapeEls[k] = Array.prototype.slice.call(g.querySelectorAll(".dk-s"));
      g.addEventListener("mouseenter", function () { hot(k); }); g.addEventListener("mouseleave", function () { hot(null); });
      g.addEventListener("click", function () { strike(shapeEls[k], k); });
    });
    // 2. the staff, in front of the drums: five lines, and the ledger line the crash sits on
    var staff = E("g", { "class": "dk-staffg" }, svg);
    [0, 2, 4, 6, 8].forEach(function (s) { E("line", { x1: 104, x2: 396, y1: yOf(s), y2: yOf(s), "class": "dk-staff", "data-step": s }, staff); });
    E("line", { x1: 238 - 26, x2: 238 + 26, y1: yOf(10), y2: yOf(10), "class": "dk-staff dk-ledger", "data-step": 10 }, staff);
    // 3. a note head, a leader and a label for every piece: this is the button
    PIECES.forEach(function (d) {
      var st = stepOf(d.piece), w = N && N.drumWritten(d.piece); if (st == null || !w) return;
      var y = yOf(st), left = d.side === "L", lx = left ? 100 : 400, ex = left ? 104 : 396, hx = d.cx + (left ? -10 : 10);
      var g = E("g", { "class": "dk-t dk-p-" + d.piece, role: "button", tabindex: "0", "data-piece": d.piece, "data-step": st, "aria-label": name(d.piece) + ". Play it." }, svg);
      E("rect", { x: left ? 0 : 396, y: y - 20, width: 104, height: 40, "class": "dk-hit" }, g);
      E("line", { x1: ex, y1: y, x2: hx, y2: y, "class": "dk-lead" }, g);
      glyph(g, w.style || "head", d.cx, y); g.lastChild.setAttribute("class", g.lastChild.getAttribute("class") + " dk-nh");
      E("ellipse", { cx: d.cx, cy: y, rx: 16, ry: 13, "class": "dk-hit" }, g);
      var tx = E("text", { x: lx, y: y + (d.words.length > 1 ? -3 : 5), "text-anchor": left ? "end" : "start", "class": "dk-cap" }, g);
      d.words.forEach(function (wd, i) { var ts = E("tspan", { x: lx, dy: i ? 17 : 0 }, tx); ts.textContent = wd; });
      E("title", {}, g).textContent = name(d.piece);
      g.addEventListener("click", function () { strike(shapeEls[d.piece] || [], d.piece); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); strike(shapeEls[d.piece] || [], d.piece); } });
      g.addEventListener("mouseenter", function () { hot(d.piece); }); g.addEventListener("mouseleave", function () { hot(null); });
      g.addEventListener("focus", function () { hot(d.piece); }); g.addEventListener("blur", function () { hot(null); });
    });
    // 4. the pieces the picture cannot show
    E("text", { x: W / 2, y: 304, "text-anchor": "middle", "class": "dk-note" }, svg).textContent = "Also written on the staff:";
    var bw = 148, gap = 12, x0 = (W - 3 * bw - 2 * gap) / 2;
    ALSO.forEach(function (a, i) {
      var w = N && N.drumWritten(a.piece), x = x0 + i * (bw + gap), y = 312;
      var g = E("g", { "class": "dk-t dk-also", role: "button", tabindex: "0", "data-piece": a.piece, "aria-label": name(a.piece) + ". Play it." }, svg);
      E("rect", { x: x, y: y, width: bw, height: 30, rx: 15, "class": "dk-btn" }, g); E("rect", { x: x - 2, y: y - 2, width: bw + 4, height: 34, rx: 17, "class": "dk-ring" }, g);
      var gx = x + 22, gy = y + 15; glyph(g, w.style || "head", gx, gy); g.lastChild.setAttribute("class", g.lastChild.getAttribute("class") + " dk-nh");
      if (w.open) E("circle", { cx: gx, cy: gy - 12, r: 3.4, fill: "none", stroke: "currentColor", "stroke-width": 1.6, "pointer-events": "none" }, g);
      var t = E("text", { x: x + 42, y: gy + 5, "class": "dk-cap", style: "font-size:14px" }, g); t.textContent = a.words;
      E("title", {}, g).textContent = name(a.piece);
      var go = function () { strike([g], a.piece); };
      g.addEventListener("click", go); g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    return svg;
  }

  global.LessonDrumKit = { label: labelHeads, draw: draw, hit: hit,
    get pieces() { return PIECES.map(function (d) { return { piece: d.piece, step: stepOf(d.piece), name: name(d.piece) }; }); } };
})(typeof window !== "undefined" ? window : globalThis);
