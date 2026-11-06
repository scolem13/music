// percussion-page.js — the interactive parts of lessons/percussion.qmd and lessons/snare-drum.qmd.
// Needs ABCJS (abcjs-basic.js), PercRudiments (rudiments.js) and, for sound, BandSounds (band/sounds.js).
//   PercussionPage.diagram(el)       el.dataset.kind = "snare" | "stick" | "bass": a labelled drawing; click a part (number, name or the
//                                    drawing itself) to see what it is; "Quiz me" asks for parts. Part texts are in PARTS below.
//   PercussionPage.tuningOrder(el)   the ten-lug tightening order from the book's figure, one pair of lugs at a time
//   PercussionPage.rudiments(el)     pick a rudiment: sticking drawn on a percussion staff, played on the band's snare, chips lit in time
//   PercussionPage.sound()           -> Promise { ac, out, bank }  one AudioContext for the page, registered with AudioTap (tests replace it)
// Part names follow the teacher book's labelled photographs (Kjos W74, pp. 285 and 299); the descriptions are the site's own words,
// from the book's text on the same pages. Facts marked "unverified" in a description are not from the book.
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  /* ---------- the drawings: shapes carry class p-<part id>; markers sit at (x, y) ---------- */
  var DRAWINGS = {
    snare: {
      title: "Snare drum and stand", view: "0 0 520 440",
      svg:
        '<line class="pcs-line p-arms" x1="240" y1="250" x2="120" y2="205"/><line class="pcs-line p-arms" x1="240" y1="250" x2="360" y2="205"/>' +
        '<rect class="pcs-shape p-insulator" x="108" y="196" width="22" height="10" rx="3"/><rect class="pcs-shape p-insulator" x="350" y="196" width="22" height="10" rx="3"/>' +
        '<line class="pcs-line p-base" x1="240" y1="250" x2="240" y2="345"/>' +
        '<circle class="pcs-shape p-armknob" cx="240" cy="252" r="7"/><rect class="pcs-shape p-heightlock" x="231" y="285" width="18" height="12" rx="2"/>' +
        '<rect class="pcs-shape p-leglock" x="231" y="338" width="18" height="12" rx="2"/>' +
        '<line class="pcs-line p-legs" x1="240" y1="348" x2="140" y2="422"/><line class="pcs-line p-legs" x1="240" y1="348" x2="340" y2="422"/><line class="pcs-line p-legs" x1="240" y1="348" x2="240" y2="428"/>' +
        '<rect class="pcs-shape" x="130" y="120" width="220" height="70"/>' +
        '<path class="pcs-head p-resonant" d="M130 190 A110 20 0 0 0 350 190 Z"/>' +
        '<path class="pcs-thin p-snares" style="stroke-width:3" d="M168 214 H312 M172 219 H308 M176 224 H304"/>' +
        '<rect class="pcs-shape p-lug" x="150" y="135" width="12" height="36"/><rect class="pcs-shape p-lug" x="190" y="135" width="12" height="36"/><rect class="pcs-shape p-lug" x="278" y="135" width="12" height="36"/><rect class="pcs-shape p-lug" x="318" y="135" width="12" height="36"/>' +
        '<line class="pcs-line p-rod" style="stroke-width:2" x1="156" y1="124" x2="156" y2="168"/><line class="pcs-line p-rod" style="stroke-width:2" x1="196" y1="126" x2="196" y2="168"/><line class="pcs-line p-rod" style="stroke-width:2" x1="284" y1="126" x2="284" y2="168"/><line class="pcs-line p-rod" style="stroke-width:2" x1="324" y1="124" x2="324" y2="168"/>' +
        '<circle class="pcs-shape p-mufflerknob" cx="122" cy="150" r="9"/>' +
        '<rect class="pcs-shape p-strainer" x="350" y="140" width="28" height="40" rx="3"/><line class="pcs-line p-lever" x1="378" y1="150" x2="398" y2="136"/><circle class="pcs-shape p-snaretension" cx="364" cy="192" r="7"/>' +
        '<ellipse class="pcs-head p-batter" cx="240" cy="120" rx="110" ry="20"/><ellipse class="pcs-line p-rims" cx="240" cy="120" rx="115" ry="24"/>' +
        '<text class="pcs-cap" x="60" y="60">DRUM</text><text class="pcs-cap" x="60" y="280">STAND</text>',
      marks: { batter: [240, 120], rims: [106, 104], resonant: [190, 204], snares: [240, 236], strainer: [364, 160], lever: [410, 128], snaretension: [394, 200],
               mufflerknob: [96, 150], imuffler: [240, 160], lug: [196, 182], rod: [324, 94],
               insulator: [100, 222], arms: [180, 228], armknob: [268, 252], base: [212, 312], heightlock: [272, 291], leglock: [272, 344], legs: [190, 384] }
    },
    stick: {
      title: "Snare drum stick", view: "0 0 520 140",
      svg:
        '<rect class="pcs-shape p-shaft" x="30" y="57" width="300" height="14" rx="7"/><polygon class="pcs-shape p-shoulder" points="326,57 396,61 396,67 326,71"/>' +
        '<rect class="pcs-shape p-neck" x="394" y="61" width="16" height="6"/><circle class="pcs-shape p-tip" cx="418" cy="64" r="7"/><circle class="pcs-shape p-butt" cx="38" cy="64" r="7"/>' +
        '<line class="pcs-thin p-fulcrum" style="stroke-width:3;stroke-dasharray:3 3" x1="160" y1="44" x2="160" y2="84"/>',
      marks: { butt: [38, 100], fulcrum: [160, 24], shaft: [250, 100], shoulder: [360, 100], neck: [402, 36], tip: [432, 100] }
    },
    bass: {
      title: "Concert bass drum on its stand, with three mallets", view: "0 0 520 440", gen: "bass",
      svg:
        '<ellipse class="pcs-head p-resonant" cx="272" cy="190" rx="140" ry="150" style="opacity:.55"/>' +
        '<polyline class="pcs-line p-frame" points="92,200 92,382 388,382 388,200" fill="none"/>' +
        '<circle class="pcs-shape p-wheel" cx="92" cy="398" r="11"/><circle class="pcs-shape p-wheel" cx="388" cy="398" r="11"/>' +
        '<g class="p-lugs"></g>' +
        '<ellipse class="pcs-head p-batter" cx="240" cy="190" rx="136" ry="146"/><ellipse class="pcs-line p-rim" cx="240" cy="190" rx="142" ry="152" fill="none"/>' +
        '<g class="p-mallets"><line class="pcs-line" style="stroke-width:5" x1="420" y1="300" x2="500" y2="300"/><circle class="pcs-shape p-mallet" cx="412" cy="300" r="12"/>' +
        '<line class="pcs-line" style="stroke-width:5" x1="420" y1="340" x2="500" y2="340"/><circle class="pcs-shape p-mallet" cx="412" cy="340" r="10"/>' +
        '<line class="pcs-line" style="stroke-width:5" x1="420" y1="380" x2="500" y2="380"/><circle class="pcs-shape p-mallet" cx="412" cy="380" r="8"/></g>',
      marks: { batter: [240, 190], rim: [112, 100], resonant: [400, 150], rod: [330, 62], lug: [350, 80], frame: [92, 290], wheel: [92, 420], mallet: [450, 276] }
    }
  };
  var PARTS = {
    snare: [
      ["batter", "batter head", "The top head, the one you hit. Just off-centre is usually the most resonant spot; the edge suits soft passages, and dead centre gives a drier sound that suits a lot of articulation."],
      ["rims", "rims", "The hoops that clamp the heads on. They are played too: the shaft of the stick on the rim makes a wooden sound, and a rim shot strikes head and rim together."],
      ["resonant", "snare (resonant) head", "The thin bottom head, which faces the floor. Usually tuned higher than the batter head, by about a perfect fourth or fifth."],
      ["snares", "snares", "The wires stretched across the resonant head. They buzz when the batter head is hit. With them off the drum sounds like a high tom."],
      ["strainer", "snare strainer", "The fitting on the shell that holds the snares to the drum. Keep it engaged when you pack the drum, so the snares are not damaged. A little household lubricant on it now and then is the book's advice."],
      ["lever", "snare release lever", "Throws the snares on or off. \"Snares off\" in a part means release it. Set the drum so it is directly in front of you."],
      ["snaretension", "snare tension knob", "Tightens or loosens the snares. Adjust until the sound is crisp and responds at every dynamic."],
      ["mufflerknob", "muffler adjustment knob", "On the outside of the shell; it works the internal muffler."],
      ["imuffler", "internal muffler", "A pad inside the shell that presses on the head to cut its ringing. Not visible from outside: this is where it sits in the book's photograph of the underside."],
      ["lug", "lug", "The fitting bolted to the shell that each tension rod screws into."],
      ["rod", "tension rod", "The screw that pulls the rim, and so the head, down. Turned with a drum key; there are several, and they are tightened in a criss-cross order (see the tuning-order figure on the Percussion page)."],
      ["insulator", "rubber insulator", "A rubber tip on each support arm so metal does not touch the drum. Replace any that are worn or missing."],
      ["arms", "support arms", "Cradle the drum. Set their angle so the drum sits level or at a slight tilt, snug but not tight, clear of the strainer and the snares."],
      ["armknob", "support arms adjustment knob", "Holds the arms at the angle you chose."],
      ["base", "base (the stand's tube)", "The post of the stand. Its height is set so the top rim is just below your waist."],
      ["heightlock", "height adjustment lock", "Clamps the post at the height you set."],
      ["leglock", "leg adjustment lock", "Clamps the legs open. Spread them and tighten it so the stand is level and does not wobble."],
      ["legs", "legs", "Three of them, opened wide on a level floor."]
    ],
    stick: [
      ["butt", "butt (the end)", "The thick end, away from the drum. The fulcrum is found about a third of the way up from here."],
      ["fulcrum", "fulcrum (pivot point)", "About a third of the way up from the butt: the spot pinched between the thumb and the first joint of the index finger. The stick pivots here, and balance is a little tip-heavy, not equal."],
      ["shaft", "shaft", "The long body of the stick. Your back fingers wrap it lightly. The shaft also plays the rim for a wooden sound."],
      ["shoulder", "shoulder", "The taper where the shaft narrows. The shoulder or shaft is what hits the rim in a rim shot or when playing on the rim."],
      ["neck", "neck", "The thin part between the shoulder and the tip."],
      ["tip", "tip (bead)", "The end that plays the head. Strokes land here."]
    ],
    bass: [
      ["batter", "batter head", "The head you hit, usually struck off-centre for a deep, dark, open sound. Dead centre sounds dead; near the rim, thin. In concert playing only this head is struck."],
      ["resonant", "resonant head", "The head on the far side (not shown in the book's photograph). The book suggests tuning the batter head low and the resonant head higher, or both the same."],
      ["rim", "rim", "The hoop that holds the head."],
      ["rod", "tension rod", "Tunes the head, in the same criss-cross order as on a snare drum."],
      ["lug", "lug", "Receives the tension rod."],
      ["frame", "frame", "The cradle that holds the drum so it can be tilted toward you."],
      ["wheel", "wheel locks", "Lock the wheels before you play and tilt the drum, so it does not roll."],
      ["mallet", "mallets", "Felt-covered, heavy, soft. A roll uses a matched pair, the same size, style and weight. Held like a snare stick: between the first joint of the index finger and the thumb pad."]
    ]
  };

  function svgEl(markup, view) { var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", view); s.setAttribute("role", "img"); s.innerHTML = markup; return s; }

  function diagram(el) {
    var kind = el.getAttribute("data-kind") || "snare", D = DRAWINGS[kind], parts = PARTS[kind];
    var markup = D.svg;
    var svg = svgEl(markup, D.view); svg.setAttribute("aria-label", D.title);
    if (D.gen === "bass") {   // lugs and rods around the rim
      var g = svg.querySelector(".p-lugs");
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * 2 * Math.PI, x = 240 + 142 * Math.sin(a), y = 190 - 152 * Math.cos(a);
        var r = document.createElementNS(NS, "rect"); r.setAttribute("class", "pcs-shape p-lug"); r.setAttribute("x", x - 5); r.setAttribute("y", y - 5); r.setAttribute("width", 10); r.setAttribute("height", 10); g.appendChild(r);
        var l = document.createElementNS(NS, "line"); l.setAttribute("class", "pcs-line p-rod"); l.setAttribute("style", "stroke-width:2"); l.setAttribute("x1", x); l.setAttribute("y1", y); l.setAttribute("x2", 240 + 128 * Math.sin(a)); l.setAttribute("y2", 190 - 138 * Math.cos(a)); g.appendChild(l);
      }
    }
    var info = h("div", { "class": "pc-info", "aria-live": "polite" }), out = h("div", { "class": "pc-out" });
    var list = h("ul", { "class": "pc-parts" });
    var btns = {}, marks = {}, state = { quiz: false, target: null, right: 0, asked: 0 };
    parts.forEach(function (p, n) {
      var b = h("button", { type: "button", "data-part": p[0] }, [h("b", { text: (n + 1) + "." }), h("span", { "class": "nm", text: p[1] })]);
      btns[p[0]] = b; list.appendChild(h("li", {}, [b]));
      var pos = D.marks[p[0]], gm = document.createElementNS(NS, "g"); gm.setAttribute("class", "pcs-mark"); gm.setAttribute("data-part", p[0]);
      var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", pos[0]); c.setAttribute("cy", pos[1]); c.setAttribute("r", 11);
      var t = document.createElementNS(NS, "text"); t.setAttribute("x", pos[0]); t.setAttribute("y", pos[1]); t.textContent = n + 1;
      gm.appendChild(c); gm.appendChild(t); svg.appendChild(gm); marks[p[0]] = gm;
    });
    function find(id) { for (var i = 0; i < parts.length; i++) if (parts[i][0] === id) return parts[i]; }
    function show(id) {
      var p = find(id);
      Object.keys(btns).forEach(function (k) { btns[k].classList.toggle("pc-on", k === id); marks[k].classList.toggle("pc-on", k === id); });
      svg.querySelectorAll(".pc-hl").forEach(function (s) { s.classList.remove("pc-hl"); });
      svg.querySelectorAll(".p-" + id).forEach(function (s) { s.classList.add("pc-hl"); });
      info.innerHTML = ""; info.appendChild(h("strong", { text: p[1] })); info.appendChild(document.createTextNode(p[2]));
    }
    function ask() {
      state.target = parts[Math.floor(Math.random() * parts.length)][0];
      out.className = "pc-out"; out.textContent = "Find the " + find(state.target)[1] + ".";
    }
    function pick(id) {
      if (!state.quiz) return show(id);
      if (state.target == null) return;
      state.asked++;
      var ok = id === state.target;
      if (ok) state.right++;
      show(id); out.className = "pc-out " + (ok ? "pc-good" : "pc-bad");
      out.textContent = (ok ? "Yes. " : "No, that is the " + find(id)[1] + ". ") + "(" + state.right + " of " + state.asked + ")";
      state.target = null; setTimeout(function () { if (state.quiz) ask(); }, 1400);
    }
    el.addEventListener("click", function (ev) {
      var n = ev.target.closest && ev.target.closest("[data-part]"); if (n && el.contains(n)) return pick(n.getAttribute("data-part"));
      var s = ev.target.closest && ev.target.closest("svg [class*='p-']");
      if (s) { var m = /(?:^|\s)p-(\w+)/.exec(s.getAttribute("class")); if (m && find(m[1])) pick(m[1]); }
    });
    var quizBtn = h("button", { type: "button", "class": "btn btn-outline-primary btn-sm", text: "Quiz me" });
    quizBtn.addEventListener("click", function () {
      state.quiz = !state.quiz; state.right = state.asked = 0; state.target = null;
      list.style.visibility = state.quiz ? "hidden" : ""; quizBtn.textContent = state.quiz ? "Stop quiz" : "Quiz me";
      info.innerHTML = ""; out.textContent = "";
      svg.querySelectorAll(".pc-hl").forEach(function (s) { s.classList.remove("pc-hl"); });
      Object.keys(btns).forEach(function (k) { btns[k].classList.remove("pc-on"); marks[k].classList.remove("pc-on"); });
      if (state.quiz) ask(); else info.textContent = "Click a part.";
    });
    info.textContent = "Click a part.";
    el.classList.add("pc-wrap");
    el.appendChild(h("div", { "class": "pc-diagram" }, [h("div", { "class": "pc-svg" }, [svg]),
      h("div", { "class": "pc-side" }, [h("div", { "class": "pc-bar" }, [quizBtn]), list, info, out])]));
  }

  /* ---------- tuning order: the ten lugs, numbered as in the book's figure ---------- */
  var LUG_ANGLES = { 1: -162, 2: 18, 3: -90, 4: 90, 5: -18, 6: 162, 7: 54, 8: -126, 9: -54, 10: 126 };   // degrees clockwise from the top
  function tuningOrder(el) {
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 260 260"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Ten lugs round a drum head, numbered 1 to 10");
    svg.innerHTML = '<circle class="pcs-head" cx="130" cy="130" r="92"/><circle class="pcs-thin" cx="130" cy="130" r="80" stroke-dasharray="4 4"/>';
    var lugs = {}, step = 0;
    for (var n = 1; n <= 10; n++) {
      var a = LUG_ANGLES[n] * Math.PI / 180, x = 130 + 108 * Math.sin(a), y = 130 - 108 * Math.cos(a);
      var c = document.createElementNS(NS, "circle"); c.setAttribute("class", "pct-lug"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 13);
      var t = document.createElementNS(NS, "text"); t.setAttribute("class", "pct-num"); t.setAttribute("x", x); t.setAttribute("y", y); t.textContent = n;
      svg.appendChild(c); svg.appendChild(t); lugs[n] = c;
    }
    var msg = h("div", { "class": "pc-info", "aria-live": "polite" });
    var next = h("button", { type: "button", "class": "btn btn-primary btn-sm", text: "Next lug" }), reset = h("button", { type: "button", "class": "btn btn-outline-secondary btn-sm", text: "Start again" });
    function draw() {
      for (var n = 1; n <= 10; n++) lugs[n].setAttribute("class", "pct-lug" + (n < step ? " pct-done" : n === step ? " pct-now" : ""));
      if (step === 0) msg.textContent = "Press Next lug. Each lug gets no more than a half turn at a time; opposite lugs follow each other.";
      else if (step <= 10) msg.textContent = "Lug " + step + ": about a half turn at most." + (step % 2 === 1 ? " Its opposite is next." : " That finished a pair of opposite lugs.") + (step === 10 ? " That is one round. Go round again until the slack is gone, then tap by each rod and match the pitch." : "");
      next.disabled = step >= 10;
    }
    next.addEventListener("click", function () { if (step < 10) { step++; draw(); } });
    reset.addEventListener("click", function () { step = 0; draw(); });
    el.classList.add("pc-wrap");
    el.appendChild(h("div", { "class": "pc-diagram" }, [h("div", { "class": "pc-svg", style: "max-width:260px" }, [svg]), h("div", { "class": "pc-side" }, [h("div", { "class": "pc-bar" }, [next, reset]), msg])]));
    draw();
  }

  /* ---------- sound ---------- */
  var snd = null;
  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) global.AudioTap.register(ac, out, "Percussion");
      res({ ac: ac, out: out, bank: global.BandSounds.create(ac) });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s.bank.load ? s.bank.load(["kit"]).then(function () { return s; }) : s; }); });
  }

  /* ---------- the rudiment player ---------- */
  function rudiments(el) {
    var R = global.PercRudiments, timers = [], playing = false, cur = R.LIST[0];
    el.classList.add("pc-wrap");
    var sel = h("select", { "aria-label": "Rudiment" }), groups = {};
    R.LIST.forEach(function (r) {
      if (!groups[r.group]) { groups[r.group] = h("optgroup", { label: r.group }); sel.appendChild(groups[r.group]); }
      groups[r.group].appendChild(h("option", { value: r.id, text: r.name }));
    });
    var tempo = h("input", { type: "range", min: 40, max: 160, value: 80, step: 2, "aria-label": "Tempo" }), tempoOut = h("span", { text: "80" });
    var loops = h("select", { "aria-label": "Times through" }, [2, 4, 8].map(function (n) { return h("option", { value: n, text: n + " times" }); })); loops.value = "4";
    var click = h("input", { type: "checkbox" });
    var play = h("button", { type: "button", "class": "btn btn-primary btn-sm", text: "Play" });
    var staff = h("div", { "class": "pr-staff" }), chips = h("div", { "class": "pr-chips" }), note = h("p", { "class": "pc-muted" });
    el.appendChild(h("div", { "class": "pc-bar" }, [sel, play, h("label", { "class": "pc-lab" }, [document.createTextNode("Tempo "), tempo, tempoOut]), loops,
      h("label", { "class": "pc-lab" }, [click, document.createTextNode("Click")])]));
    el.appendChild(staff); el.appendChild(chips); el.appendChild(note);
    var chipEls = [];
    function draw() {
      cur = R.byId(sel.value);
      var abc = R.abc(cur);
      if (global.ABCJS) global.ABCJS.renderAbc(staff, abc, { responsive: "resize", add_classes: true, scale: 1.1, paddingtop: 0, paddingbottom: 0, staffwidth: 560 });
      staff.setAttribute("data-abc", abc);
      chips.innerHTML = ""; chipEls = [];
      cur.bars.forEach(function (bar, bi) {
        var first = true;
        R.parse(bar).forEach(function (n) {
          if (n.rest) return;
          var c = h("span", { "class": "pr-chip" + (n.accent ? " pr-acc" : "") + (first && bi > 0 ? " pr-bar" : "") });
          if (n.graces) c.appendChild(h("small", { text: "(" + n.graces.toUpperCase() + ")" }));
          c.appendChild(document.createTextNode(n.hand + (n.bounce ? "~" : ""))); chips.appendChild(c); chipEls.push(c); first = false;
        });
      });
      note.textContent = cur.note;
    }
    function stop() {
      timers.forEach(clearTimeout); timers = []; playing = false; play.textContent = "Play";
      chipEls.forEach(function (c) { c.classList.remove("pr-lit"); });
      if (global.PlayBar && global.PlayBar.sounding) global.PlayBar.sounding("percussion", null);
      if (snd) snd.then(function (s) { if (s.bank && s.bank.stopAll) s.bank.stopAll(); });
    }
    function start() {
      var bpm = +tempo.value, n = +loops.value;
      global.PercussionPage.sound().then(function (s) {
        var ev = R.hits(cur, bpm, { loops: n }), t0 = s.ac.currentTime + 0.12, perPass = chipEls.length;
        ev.forEach(function (e) { s.bank.play("kit", { piece: "snare", vel: e.vel }, t0 + e.t, s.out); });
        if (click.checked) { var beats = Math.ceil(ev.total / (60 / bpm)); for (var b = 0; b < beats; b++) s.bank.play("kit", { piece: b % 2 ? "click" : "clickHi", vel: 0.4 }, t0 + ev.lead + b * 60 / bpm, s.out); }
        var seen = {};
        ev.forEach(function (e) {
          if (e.kind === "grace" || seen[e.i]) return; seen[e.i] = 1;
          timers.push(setTimeout(function () { chipEls.forEach(function (c, k) { c.classList.toggle("pr-lit", k === e.i % perPass); }); }, Math.max(0, (t0 + e.t - s.ac.currentTime) * 1000)));
        });
        timers.push(setTimeout(stop, (t0 + ev.lead + ev.total - s.ac.currentTime) * 1000 + 300));
        playing = true; play.textContent = "Stop";
        if (global.PlayBar && global.PlayBar.sounding) global.PlayBar.sounding("percussion", stop);
      });
    }
    play.addEventListener("click", function () { if (playing) stop(); else start(); });
    sel.addEventListener("change", function () { stop(); draw(); });
    tempo.addEventListener("input", function () { tempoOut.textContent = tempo.value; });
    el._pr = { select: function (id) { sel.value = id; sel.dispatchEvent(new Event("change")); }, stop: stop };
    draw();
  }

  global.PercussionPage = { diagram: diagram, tuningOrder: tuningOrder, rudiments: rudiments, sound: sound, PARTS: PARTS, DRAWINGS: DRAWINGS };
})(typeof window !== "undefined" ? window : globalThis);
