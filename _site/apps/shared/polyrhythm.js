// polyrhythm.js — the Polyrhythm player (window.Polyrhythm), used by tools/polyrhythm.qmd and the polyrhythm lessons.
//
// A player is a <div class="poly"> with:
//   data-layers="3;2"                 one layer per ";": a number (that many even beats per cycle) or a pattern of
//                                      x (hit), X (accent) and . (rest), e.g. "x.x.xx.x.x.x" (the 12/8 bell)
//   data-names="Right hand;Left hand"  layer names (optional)
//   data-sounds="hi;lo"                 one per layer: hi, lo, mid, bell, wood, kick, shaker (optional)
//   data-bpm="60"                       cycles per minute are worked out from this: the speed of the beat layer's hits
//   data-beat="1"                       which layer (0-based) the bpm counts (default: the last layer)
//   data-polymeter                      every layer's steps are the SAME length (a 5-step riff against 4 steps: polymeter);
//                                      the cycle is then the least common multiple of the lengths. Without it every layer is
//                                      stretched over one cycle (polyrhythm).
//   data-edit                           show the layer editors (counts, patterns, add / remove)
//   data-presets                        show the preset menu (Polyrhythm.PRESETS)
// Polyrhythm.mount(el) is called on every .poly when the page loads. Sound is synthesized (nothing to load); the
// AudioContext registers with AudioTap.
(function (global) {
  var ctx = null, out = null, players = [];

  function gcd(a, b){ return b ? gcd(b, a % b) : a; }
  function lcm(a, b){ return a / gcd(a, b) * b; }

  // A layer as a list of steps: 1 hit, 2 accent, 0 rest
  function parseLayer(s){
    s = String(s).trim();
    if (/^\d+$/.test(s)){ var n = Math.max(1, Math.min(32, +s)), a = []; for (var i = 0; i < n; i++) a.push(i === 0 ? 2 : 1); return { count: n, steps: a, src: s }; }
    var st = s.replace(/[^xX.\-o]/g, "").split("").map(function (c){ return c === "X" ? 2 : (c === "x" || c === "o") ? 1 : 0; });
    if (!st.length) st = [2];
    return { count: null, steps: st, src: s };
  }

  var SOUNDS = {
    hi:     { f: 1600, type: "square",   dec: 0.04, g: 0.25 },
    lo:     { f: 520,  type: "square",   dec: 0.06, g: 0.3 },
    mid:    { f: 900,  type: "triangle", dec: 0.07, g: 0.5 },
    bell:   { f: 2400, type: "sine",     dec: 0.25, g: 0.35, ring: 3480 },
    wood:   { f: 1200, type: "sine",     dec: 0.05, g: 0.6 },
    kick:   { f: 120,  type: "sine",     dec: 0.18, g: 0.9, drop: 45 },
    shaker: { noise: true, dec: 0.05, g: 0.35 }
  };
  var ORDER = ["hi", "lo", "mid", "bell", "wood", "kick", "shaker"];
  var COLORS = ["#d9480f", "#1971c2", "#2b8a3e", "#9c36b5"];

  function audio(){
    if (!ctx){
      var AC = global.AudioContext || global.webkitAudioContext; ctx = new AC();
      out = ctx.createGain(); out.gain.value = 0.8; out.connect(ctx.destination);
      if (global.AudioTap) try { AudioTap.register(ctx, out, "Polyrhythm"); } catch (e) {}
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  var noiseBuf = null;
  function hit(name, t, vel){
    var s = SOUNDS[name] || SOUNDS.hi, g = ctx.createGain(), peak = s.g * vel;
    g.connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s.dec);
    if (s.noise){
      if (!noiseBuf){ noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 5000;
      n.buffer = noiseBuf; n.connect(hp); hp.connect(g); n.start(t); n.stop(t + s.dec + 0.01); return;
    }
    [s.f, s.ring].forEach(function (f, k){
      if (!f) return;
      var o = ctx.createOscillator(); o.type = s.type; o.frequency.setValueAtTime(f, t);
      if (s.drop) o.frequency.exponentialRampToValueAtTime(s.drop, t + s.dec);
      if (k){ var g2 = ctx.createGain(); g2.gain.value = 0.4; o.connect(g2); g2.connect(g); } else o.connect(g);
      o.start(t); o.stop(t + s.dec + 0.02);
    });
  }

  var PRESETS = [
    { name: "2 against 3 (hemiola)", layers: "3;2", sounds: "hi;lo" },
    { name: "3 against 4", layers: "4;3", sounds: "lo;hi" },
    { name: "4 against 3", layers: "3;4", sounds: "lo;hi" },
    { name: "5 against 4", layers: "4;5", sounds: "lo;hi" },
    { name: "3 against 2 against 4", layers: "2;3;4", sounds: "kick;hi;shaker" },
    { name: "12/8 bell with 4 and 3 (West Africa)", layers: "x.x.xx.x.x.x;4;3", sounds: "bell;kick;wood", beat: 1 },
    { name: "Son clave 3-2 over 4", layers: "x..x..x...x.x...;4", sounds: "wood;kick", beat: 1 },
    { name: "Rumba clave 3-2 over 4", layers: "x..x...x..x.x...;4", sounds: "wood;kick", beat: 1 },
    { name: "Tresillo over 2", layers: "x..x..x.;2", sounds: "wood;kick", beat: 1 },
    { name: "Polymeter: 5-step riff on 4/4", layers: "X.x.x;X...", sounds: "hi;kick", polymeter: true, beat: 1 },
    { name: "Polymeter: 7 against 4", layers: "X.x.xx.;X...", sounds: "hi;kick", polymeter: true, beat: 1 }
  ];

  function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function mount(root){
    if (root._poly) return root._poly;
    var st = {
      layers: (root.dataset.layers || "3;2").split(";").map(parseLayer),
      names: (root.dataset.names || "").split(";"),
      sounds: (root.dataset.sounds || "").split(";"),
      mute: [], bpm: +root.dataset.bpm || 60, beat: root.dataset.beat != null ? +root.dataset.beat : null,
      poly: root.hasAttribute("data-polymeter"), playing: false, t0: 0, next: [], timer: null, raf: null, count: false
    };
    function fix(){
      st.layers.forEach(function (l, i){ if (!st.sounds[i] || !SOUNDS[st.sounds[i]]) st.sounds[i] = ORDER[i % ORDER.length]; });
      if (st.beat == null || st.beat >= st.layers.length) st.beat = st.layers.length - 1;
    }
    fix();

    // How long is a cycle, and how long is each layer's step?
    function cycleSteps(){ return st.layers.reduce(function (a, l){ return lcm(a, l.steps.length); }, 1); }
    function stepDur(i){
      var beatLen = 60 / st.bpm, bl = st.layers[st.beat];
      // The beat layer's hits come at the bpm: for an even layer that is each step; for a pattern each step is a pulse and the
      // bpm counts pulses grouped as the pattern's own beats (pulsesPerBeat)
      var beatStep = bl.count ? beatLen : beatLen / pulsesPerBeat(bl.steps.length);
      if (st.poly) return beatStep;                               // every step the same length
      var cyc = beatStep * bl.steps.length;
      return cyc / st.layers[i].steps.length;
    }
    function pulsesPerBeat(n){ return { 6: 3, 8: 2, 12: 3, 16: 4 }[n] || 1; }   // 12 = four beats of three, 16 = four of four; other lengths: a step is a beat
    function cycleLen(){
      if (st.poly){ return stepDur(0) * cycleSteps(); }
      return stepDur(0) * st.layers[0].steps.length;
    }

    // ---- UI
    root.innerHTML = "";
    var bar = el("div", "poly-bar");
    var play = el("button", "btn btn-sm btn-primary poly-play", "▶ Play");
    var tempo = el("label", "poly-tempo", 'Beat <input type="range" min="20" max="200" step="1"> <span class="poly-bpm"></span> bpm');
    var countBox = el("label", "poly-count", '<input type="checkbox"> Count the beat aloud (accent)');
    bar.appendChild(play); bar.appendChild(tempo);
    var presetSel = null;
    if (root.hasAttribute("data-presets")){
      presetSel = el("select", "form-select form-select-sm poly-preset");
      presetSel.innerHTML = '<option value="">Presets…</option>' + PRESETS.map(function (p, i){ return '<option value="' + i + '">' + p.name + "</option>"; }).join("");
      bar.appendChild(presetSel);
    }
    root.appendChild(bar);
    var view = el("div", "poly-view");
    var svgNS = "http://www.w3.org/2000/svg", svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "-110 -110 220 220"); svg.setAttribute("class", "poly-circle");
    view.appendChild(svg);
    var grid = el("div", "poly-grid"); view.appendChild(grid);
    root.appendChild(view);
    var ratio = el("p", "poly-ratio"); root.appendChild(ratio);
    var editor = root.hasAttribute("data-edit") ? el("div", "poly-edit") : null;
    if (editor) root.appendChild(editor);

    var rng = tempo.querySelector("input"), bpmOut = tempo.querySelector(".poly-bpm");
    rng.value = st.bpm; bpmOut.textContent = st.bpm;
    rng.oninput = function (){ var was = st.playing; if (was) stop(); st.bpm = +rng.value; bpmOut.textContent = st.bpm; if (was) start(); };
    play.onclick = function (){ st.playing ? stop() : start(); };
    if (presetSel) presetSel.onchange = function (){
      var p = PRESETS[+presetSel.value]; if (!p) return;
      var was = st.playing; stop();
      st.layers = p.layers.split(";").map(parseLayer); st.sounds = p.sounds.split(";"); st.names = []; st.mute = [];
      st.beat = p.beat != null ? p.beat : null; st.poly = !!p.polymeter; fix(); draw(); if (was) start();
    };

    var dots = [];   // [layer][step] -> {svg, cell}
    function draw(){
      var was = st.playing; if (was) stop();
      svg.innerHTML = ""; grid.innerHTML = ""; dots = [];
      var n = st.layers.length, total = st.poly ? cycleSteps() : null;
      // circle: one ring per layer, outer first
      var hand = document.createElementNS(svgNS, "line");
      st.layers.forEach(function (l, i){
        var r = 95 - i * (60 / Math.max(1, n)), col = COLORS[i % COLORS.length], ring = document.createElementNS(svgNS, "circle");
        ring.setAttribute("r", r); ring.setAttribute("class", "poly-ring"); svg.appendChild(ring);
        dots[i] = [];
        // in polymeter the layer repeats over the cycle: draw all its repeats
        var reps = st.poly ? total / l.steps.length : 1, len = l.steps.length * reps;
        for (var k = 0; k < len; k++){
          var v = l.steps[k % l.steps.length], a = 2 * Math.PI * k / len - Math.PI / 2;
          var d = document.createElementNS(svgNS, "circle");
          d.setAttribute("cx", (r * Math.cos(a)).toFixed(2)); d.setAttribute("cy", (r * Math.sin(a)).toFixed(2));
          d.setAttribute("r", v ? (v === 2 ? 6 : 4.5) : 1.6);
          d.setAttribute("fill", v ? col : "currentColor"); d.setAttribute("class", "poly-dot" + (v ? "" : " poly-rest"));
          svg.appendChild(d); dots[i].push({ svg: d, v: v });
        }
      });
      hand.setAttribute("x1", 0); hand.setAttribute("y1", 0); hand.setAttribute("x2", 0); hand.setAttribute("y2", -100);
      hand.setAttribute("class", "poly-hand"); svg.appendChild(hand); st.hand = hand;

      // grid: one row per layer, cells sized to time
      st.layers.forEach(function (l, i){
        var row = el("div", "poly-row" + (st.mute[i] ? " poly-muted" : "")), col = COLORS[i % COLORS.length];
        var lab = el("button", "poly-label", (st.names[i] || describe(l)) + " <small>" + st.sounds[i] + "</small>");
        lab.type = "button"; lab.title = "Mute / unmute"; lab.style.borderColor = col;
        lab.onclick = function (){ st.mute[i] = !st.mute[i]; row.classList.toggle("poly-muted", st.mute[i]); };
        row.appendChild(lab);
        var cells = el("div", "poly-cells");
        var reps = st.poly ? total / l.steps.length : 1, len = l.steps.length * reps;
        for (var k = 0; k < len; k++){
          var v = l.steps[k % l.steps.length], c = el("span", "poly-cell" + (v ? " on" : "") + (v === 2 ? " acc" : "") + (st.poly && k % l.steps.length === 0 && k ? " rep" : ""));
          c.style.flex = "1 1 0"; if (v) c.style.background = col;
          cells.appendChild(c); dots[i][k].cell = c;
        }
        row.appendChild(cells); grid.appendChild(row);
      });
      ratio.innerHTML = summary();
      if (editor) drawEditor();
      if (was) start();
    }
    function describe(l){ return l.count ? l.count + " even" : l.steps.length + "-step pattern"; }
    function summary(){
      var ns = st.layers.map(function (l){ return l.count || l.steps.length; });
      if (st.poly){
        var c = cycleSteps();
        return "Polymeter: layers of " + ns.join(", ") + " steps, all steps the same length. They line up again after <b>" + c + "</b> steps.";
      }
      var even = st.layers.every(function (l){ return l.count; });
      if (even && ns.length > 1){
        var L = ns.reduce(lcm, 1);
        return "Polyrhythm " + ns.slice().reverse().join(" against ") + ". The smallest grid that holds every layer has <b>" + L +
          "</b> pulses (" + ns.map(function (n){ return n + " every " + (L / n); }).join(", ") + "). Every layer lines up only on beat 1.";
      }
      return "Every layer is spread over the same cycle. Click a layer's name to mute it.";
    }
    function drawEditor(){
      editor.innerHTML = "";
      st.layers.forEach(function (l, i){
        var r = el("div", "poly-erow");
        r.innerHTML = '<span class="poly-sw" style="background:' + COLORS[i % COLORS.length] + '"></span>' +
          '<input class="form-control form-control-sm poly-src" value="' + l.src + '" title="A number (even beats) or a pattern of x X .">' +
          '<select class="form-select form-select-sm">' + ORDER.map(function (s){ return "<option" + (s === st.sounds[i] ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" +
          '<label><input type="radio" name="beat' + uid + '"' + (st.beat === i ? " checked" : "") + "> beat</label>" +
          (st.layers.length > 1 ? '<button type="button" class="btn btn-sm btn-outline-secondary">✕</button>' : "");
        var inp = r.querySelector("input.poly-src"), sel = r.querySelector("select"), rad = r.querySelector("input[type=radio]"), del = r.querySelector("button");
        inp.onchange = function (){ st.layers[i] = parseLayer(inp.value); draw(); };
        sel.onchange = function (){ st.sounds[i] = sel.value; hitNow(sel.value); draw(); };
        rad.onchange = function (){ st.beat = i; draw(); };
        if (del) del.onclick = function (){ st.layers.splice(i, 1); st.sounds.splice(i, 1); st.names.splice(i, 1); st.mute.splice(i, 1); fix(); draw(); };
        editor.appendChild(r);
      });
      var foot = el("div", "poly-erow");
      if (st.layers.length < 4){
        var add = el("button", "btn btn-sm btn-outline-secondary", "+ Layer"); add.type = "button";
        add.onclick = function (){ st.layers.push(parseLayer("5")); fix(); draw(); };
        foot.appendChild(add);
      }
      var pm = el("label", "", '<input type="checkbox"' + (st.poly ? " checked" : "") + "> Polymeter (all steps the same length)");
      pm.querySelector("input").onchange = function (e){ st.poly = e.target.checked; draw(); };
      foot.appendChild(pm);
      editor.appendChild(foot);
    }
    function hitNow(s){ audio(); hit(s, ctx.currentTime + 0.01, 0.9); }

    // ---- playback: a look-ahead scheduler
    var queue = [];
    function start(){
      audio(); st.playing = true; play.textContent = "■ Stop";
      st.t0 = ctx.currentTime + 0.08; st.next = st.layers.map(function (){ return 0; }); queue = [];
      tick(); st.timer = setInterval(tick, 25); st.raf = requestAnimationFrame(frame);
      players.forEach(function (p){ if (p !== api && p.playing()) p.stop(); });
    }
    function stop(){
      st.playing = false; play.textContent = "▶ Play"; clearInterval(st.timer); cancelAnimationFrame(st.raf);
      dots.forEach(function (row){ row.forEach(function (d){ d.svg.classList.remove("lit"); d.cell && d.cell.classList.remove("lit"); }); });
      if (st.hand) st.hand.setAttribute("transform", "");
    }
    function tick(){
      var ahead = ctx.currentTime + 0.12, total = st.poly ? cycleSteps() : null;
      st.layers.forEach(function (l, i){
        var d = stepDur(i), len = st.poly ? total : l.steps.length;
        for (;;){
          var k = st.next[i], t = st.t0 + k * d;
          if (t > ahead) break;
          var v = l.steps[k % l.steps.length];
          if (v && !st.mute[i]) hit(st.sounds[i], t, v === 2 ? 1 : 0.6);
          queue.push({ t: t, i: i, k: k % len });
          st.next[i] = k + 1;
        }
      });
      queue.sort(function (a, b){ return a.t - b.t; });
    }
    function frame(){
      if (!st.playing) return;
      var now = ctx.currentTime, cyc = cycleLen(), ph = ((now - st.t0) / cyc) % 1;
      if (now >= st.t0) st.hand.setAttribute("transform", "rotate(" + (ph * 360).toFixed(1) + ")");
      while (queue.length && queue[0].t <= now){
        var q = queue.shift(), row = dots[q.i];
        if (row) row.forEach(function (d, k){ var on = k === q.k; d.svg.classList.toggle("lit", on); d.cell && d.cell.classList.toggle("lit", on); });
      }
      st.raf = requestAnimationFrame(frame);
    }

    var uid = Math.random().toString(36).slice(2, 7);
    var api = { stop: stop, start: start, playing: function (){ return st.playing; }, state: st, draw: draw };
    players.push(api); root._poly = api; draw();
    return api;
  }

  // Each h2 section folds; a link to it (the TOC on the right) opens it.
  function foldSections(){
    if (!document.querySelector(".poly-page")) return;
    document.querySelectorAll("main section.level2 > h2").forEach(function (h){
      var sec = h.parentNode; h.classList.add("poly-fold"); h.title = "Fold / unfold";
      h.addEventListener("click", function (e){ if (e.target.closest("a")) return; sec.classList.toggle("poly-closed"); });
    });
    function open(){ var id = decodeURIComponent(location.hash.slice(1)), t = id && document.getElementById(id); if (t){ var s = t.closest("section.level2"); if (s) s.classList.remove("poly-closed"); } }
    addEventListener("hashchange", open); open();
  }

  function init(){
    document.querySelectorAll(".poly").forEach(mount);
    foldSections();
  }
  global.Polyrhythm = { mount: mount, PRESETS: PRESETS, parseLayer: parseLayer, lcm: lcm };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
