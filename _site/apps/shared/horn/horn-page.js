// horn-page.js — the interactive parts of lessons/horn.qmd. Needs HornChart (horn-chart.js) and ABCJS (abcjs-basic.js, loaded by the page).
//   HornPage.sound()          -> Promise { ac, out, bank, loaded }   one AudioContext for the page, registered with AudioTap; band french_horn samples if BandSounds is loaded
//   HornPage.note(s, concertMidi, when, dur, vel)   one note on those samples, else the synth
//   HornPage.explorer(el)     pick a horn type and a written note: staff, concert pitch, F-side and B♭-side lever pictures, other notes of the same fingering
//   HornPage.builder(el)      press levers (and the thumb): every note that combination plays on that side; and a quiz: levers for this note?
//   HornPage.chartTable(el)   the printed chart as a table: written note, F fingering, B♭ fingering
// The horn type, staff on/off, note names on/off and written/concert choice are shared by every widget on the page.
(function (global) {
  "use strict";
  var C = global.HornChart, snd = null;
  var S = { type: "double", staff: true, names: true, concert: false }, bars = [], renders = [];
  try { var saved = JSON.parse(localStorage.getItem("horn-page") || "null"); if (saved) { S.staff = saved.staff !== false; S.names = saved.names !== false; } } catch (e) {}

  // One AudioContext for the page. The band's french_horn samples (BandSounds, band/sounds.js) when that script is on the page and the samples
  // load within 5 s; otherwise the synthesized buzz in HornChart.tone. s.loaded says which.
  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(), s = { ac: ac, out: out, bank: null, loaded: false };
      out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Horn fingering chart");
      if (!global.BandSounds) return res(s);
      try { s.bank = global.BandSounds.create(ac); } catch (e) { return res(s); }
      Promise.race([s.bank.load(["horn"]).then(function () { s.loaded = true; }, function () {}), new Promise(function (r) { setTimeout(r, 5000); })]).then(function () { res(s); });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  // one note at concert pitch: the horn samples when loaded, else the synth
  function note(s, concertMidi, when, dur, vel) {
    if (s.bank && s.loaded) s.bank.play("horn", { midi: concertMidi, vel: vel == null ? 0.7 : vel, dur: dur }, when, s.out);
    else C.tone(s.ac, s.out, concertMidi, when, dur, vel);
  }
  function play(written, step) {   // written notes one after another; they sound a fifth lower
    return sound().then(function (s) { var t = s.ac.currentTime + 0.05; written.forEach(function (m, i) { note(s, C.concert(m), t + i * step, step * 0.95); }); });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shown(m) { return S.concert ? C.concert(m) : m; }
  function label(m) { return C.name(shown(m)); }
  function abcNote(m, how) {
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1;
    var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
    var n = (how === "flat" ? FL : SH)[pc], acc = n.length > 1 ? n[0] : "", L = n[n.length - 1];
    if (oct >= 5) return acc + L.toLowerCase() + "'".repeat(oct - 5);
    return acc + L + ",".repeat(4 - oct);
  }
  function staff(box, notes, w) {   // notes: written midi list (both spellings of a black key), whole notes, treble clef (concert pitch low notes get ledger lines)
    box.innerHTML = "";
    if (!global.ABCJS || !S.staff || !notes.length) return;
    var abc = [];
    notes.forEach(function (m) { m = shown(m); var pc = ((m % 12) + 12) % 12; if ([1, 3, 6, 8, 10].indexOf(pc) >= 0) { abc.push(abcNote(m, "sharp")); abc.push(abcNote(m, "flat")); } else abc.push(abcNote(m)); });
    ABCJS.renderAbc(box, "X:1\nL:1/1\nK:C clef=treble\n" + abc.join(" ") + "|]", { staffwidth: w || Math.max(90, abc.length * 42 + 30), paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, add_classes: true });
  }
  function save() { try { localStorage.setItem("horn-page", JSON.stringify({ staff: S.staff, names: S.names })); } catch (e) {} }
  function rerender() { renders.forEach(function (f) { f(); }); bars.forEach(function (b) { b.sync(); }); }
  function typeSides() { return C.TYPES[S.type].sides; }
  function fingerText(v) { return v.length ? v.join(" + ") : "no levers (open)"; }
  function sideName(side) { return side === "F" ? "F side (thumb up)" : S.type === "double" ? "B♭ side (thumb down)" : "B♭ horn"; }

  function controls() {
    var bar = el("div", "hnp-bar"), sel = el("select", "form-select form-select-sm hnp-type");
    sel.setAttribute("aria-label", "Type of horn");
    Object.keys(C.TYPES).forEach(function (k) { var o = el("option", null, C.TYPES[k].label); o.value = k; sel.appendChild(o); });
    function box(txt, key) { var l = el("label", "hnp-chk"), c = el("input"); c.type = "checkbox"; l.appendChild(c); l.appendChild(document.createTextNode(" " + txt)); c.onchange = function () { S[key] = c.checked; save(); rerender(); }; return { l: l, c: c }; }
    var st = box("Show staff", "staff"), nm = box("Show letter names", "names");
    var pitch = el("select", "form-select form-select-sm hnp-pitch"); pitch.setAttribute("aria-label", "Written or concert pitch");
    [["written", "Written pitch (what the player reads)"], ["concert", "Concert pitch (what you hear)"]].forEach(function (p) { var o = el("option", null, p[1]); o.value = p[0]; pitch.appendChild(o); });
    sel.onchange = function () { S.type = sel.value; rerender(); };
    pitch.onchange = function () { S.concert = pitch.value === "concert"; rerender(); };
    bar.appendChild(sel); bar.appendChild(st.l); bar.appendChild(nm.l); bar.appendChild(pitch);
    bar.sync = function () { sel.value = S.type; st.c.checked = S.staff; nm.c.checked = S.names; pitch.value = S.concert ? "concert" : "written"; };
    bars.push(bar); bar.sync(); return bar;
  }

  // ---------- explorer ----------
  function explorer(root) {
    root.appendChild(controls());
    var strip = el("div", "hnp-strip"), card = el("div", "hnp-card"); root.appendChild(strip); root.appendChild(card);
    var cur = 67, revealed = false;
    var GROUPS = [["Low", 53, 64], ["Middle", 65, 76], ["High", 77, 84]];
    function draw() {
      strip.innerHTML = "";
      GROUPS.forEach(function (g) {
        var row = el("div", "hnp-row"); row.appendChild(el("span", "hnp-rowlab", g[0]));
        for (var m = g[1]; m <= g[2]; m++) (function (m) {
          var b = el("button", "btn btn-sm btn-outline-secondary hnp-nb", S.names ? label(m).replace(/\d+/, function (d) { return "<sub>" + d + "</sub>"; }) : "♪"); b.type = "button"; b.dataset.m = m;
          b.title = S.names ? "Written " + C.name(m) : "Note " + (m - C.LOW + 1) + " of the range"; b.setAttribute("aria-label", b.title);
          b.onclick = function () { cur = m; revealed = false; show(true); }; row.appendChild(b);
        })(m);
        strip.appendChild(row);
      });
    }
    function show(hear) {
      var m = cur, fs = C.fingerings(m, S.type);
      strip.querySelectorAll(".hnp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === m); });
      card.innerHTML = "";
      var head = el("div", "hnp-head"), st = el("div", "hnp-staff"); head.appendChild(st);
      var nm = el("div", "hnp-names"), hidden = !S.names && !revealed;
      nm.innerHTML = "<div class='hnp-big'>" + (hidden ? "?" : label(m)) + "</div><div class='hnp-muted'>" +
        (S.concert ? "concert pitch shown · the player reads <strong>" + (hidden ? "?" : C.name(m)) + "</strong>" : "written · sounds a fifth lower, concert <strong>" + (hidden ? "?" : C.name(C.concert(m))) + "</strong>") + "</div>";
      if (hidden) { var rv = el("button", "btn btn-sm btn-outline-secondary", "Show the name"); rv.type = "button"; rv.onclick = function () { revealed = true; show(false); }; nm.appendChild(rv); }
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([m], 1.3); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      staff(st, [m], 90);
      if (!S.staff && !S.names) card.appendChild(el("p", "hnp-muted", "Staff and names are both hidden: press Hear it, or turn one of them back on."));
      var row = el("div", "hnp-diags");
      fs.forEach(function (f) {
        var rec = S.type === "double" && (f.side === "Bb") === (m >= C.SWITCH) && !f.alt;
        var fig = el("figure", "hnp-fig" + (rec ? " rec" : "")), d = el("div", "hnp-d"); fig.appendChild(d);
        C.diagram(d, { thumb: S.type === "double", label: "Levers for " + C.name(m) + ", " + sideName(f.side) }).set(f.valves, f.side === "Bb" && S.type === "double");
        fig.appendChild(el("div", "hnp-valtxt", f.valves.length ? f.valves.join("") : "0"));
        fig.appendChild(el("figcaption", null, sideName(f.side) + (f.alt ? " · the chart's other choice" : "") + " · " + fingerText(f.valves) + (rec ? " · the book's suggestion at this height" : "")));
        row.appendChild(fig);
      });
      card.appendChild(row);
      var f0 = fs[0], others = C.lookup(f0.side, f0.valves).filter(function (x) { return x.midi !== m; }), p = el("p", "hnp-muted");
      p.innerHTML = "On the " + sideName(f0.side) + " this fingering is partial <strong>" + C.partial(f0.side, f0.valves, m) + "</strong> of its tube (worked out by this page, not printed on the chart). It also plays " +
        (others.length ? others.map(function (x) { return "<strong>" + (S.names || revealed ? label(x.midi) : "?") + "</strong>"; }).join(", ") : "no other note on this chart") +
        ": which one comes out depends on how tight your lips are and how fast your air moves.";
      card.appendChild(p);
      if (hear) play([m], 1.3);
    }
    function full() { draw(); show(false); }
    renders.push(full); full();
  }

  // ---------- builder + quiz ----------
  function builder(root) {
    root.appendChild(controls());
    var bar = el("div", "hnp-bar"), mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "Which notes does this play?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: levers for this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode); root.appendChild(bar);
    var wrap = el("div", "hnp-build"), dEl = el("div", "hnp-d hnp-d-big"), side = el("div", "hnp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "hnp-ask"), st = el("div", "hnp-staff"), out = el("div", "hnp-out"), btns = el("div", "hnp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Release all levers"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "hnp-muted"); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true, dg = null, lastNotes = [];
    function curSide() { return S.type === "f" ? "F" : S.type === "bb" ? "Bb" : (dg.thumb() ? "Bb" : "F"); }
    function makeDiagram() { var v = dg ? dg.get() : [], t = dg ? dg.thumb() : false; dg = C.diagram(dEl, { thumb: S.type === "double", onToggle: update, label: "Levers: click to press" }); dg.set(v, S.type === "double" && t); }
    function update() {
      if (quiz) { out.textContent = ""; return; }
      var v = dg.get(), sd = curSide(), ns = C.lookup(sd, v); lastNotes = ns.map(function (x) { return x.midi; });
      var html = "<div class='hnp-valbig'>" + fingerText(v) + " · " + sideName(sd) + "</div>";
      if (!ns.length) html += "<div>That combination is not on the chart for this side.</div>";
      else {
        html += "<div>" + (S.concert ? "Sounding" : "Written") + " notes this fingering can play, low to high:</div><ol class='hnp-notes'>";
        ns.forEach(function (x) { html += "<li><span class='hnp-nname'>" + (S.names ? label(x.midi) : "·") + "</span> <span class='hnp-muted'>partial " + x.partial + (x.alt ? ", the chart's other choice" : "") + "</span></li>"; });
        html += "</ol>";
      }
      out.innerHTML = html; staff(st, lastNotes, 0);
    }
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; dg.set([], false); out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Click the levers to press them" + (S.type === "double" ? " (the thumb lever switches to the B♭ side)" : "") + ". The page lists every note that fingering can play on that side.";
      if (q) next(); else update();
    }
    function next() {
      var pool = C.NOTES.map(function (n) { return n.midi; });
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set([], false); out.textContent = "";
      ask.innerHTML = "Press the levers for <strong>" + (S.names ? label(target) : "the note on the staff") + "</strong>" + (S.type === "double" ? " (either side)" : "") + ", then press Check." + (S.concert ? "" : " (Written pitch.)");
      staff(st, [target], 0);
      if (!S.staff && !S.names) ask.innerHTML += " <em>(Staff and names are hidden: press Hear it.)</em>";
    }
    function scoreText() { score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; }
    bCheck.onclick = function () {
      if (!quiz) return;
      var v = dg.get(), sd = curSide(), ok = C.fingerings(target, S.type).some(function (f) { return f.side === sd && C.sameSet(f.valves, v); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='hnp-good'>✓ Yes!</span>"; play([target], 1); setTimeout(function () { if (quiz) next(); }, 1200); }
      else { firstTry = false; var ns = C.lookup(sd, v); out.innerHTML = "<span class='hnp-bad'>Not yet.</span> " + (ns.length ? "That fingering plays " + ns.map(function (x) { return label(x.midi); }).join(", ") + "." : "That isn't a fingering on the chart."); }
      scoreText();
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; var f = C.fingerings(target, S.type)[0]; dg.set(f.valves, false); out.textContent = "Here it is (" + sideName(f.side) + "). Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (firstTry) asked++; scoreText(); next(); } };
    bClear.onclick = function () { dg.set([], false); update(); };
    bHear.onclick = function () { if (quiz) play([target], 1.3); else if (lastNotes.length) play(lastNotes, 0.8); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    renders.push(function () { makeDiagram(); right = asked = 0; scoreText(); setMode(quiz); });
    makeDiagram(); setMode(false);
  }

  // ---------- the printed chart ----------
  function chartTable(root) {
    root.appendChild(controls());
    var host = el("div", "hnp-table-wrap"); root.appendChild(host);
    function draw() {
      var sides = typeSides(), html = "<table class='hnp-table'><thead><tr><th>Note</th>" + (sides.indexOf("F") >= 0 ? "<th>F side</th>" : "") + (sides.indexOf("Bb") >= 0 ? "<th>B♭ side</th>" : "") + "<th>Sounds</th></tr></thead><tbody>";
      C.NOTES.slice().reverse().forEach(function (n) {
        var cls = n.midi === C.SWITCH && S.type === "double" ? " class='sw'" : "";
        html += "<tr" + cls + "><th><button type='button' class='btn btn-sm btn-outline-secondary hnp-tb' data-m='" + n.midi + "'>" + (S.names ? label(n.midi) : "♪") + "</button></th>" +
          (sides.indexOf("F") >= 0 ? "<td>" + (n.f.join(" ") || "0") + (n.altF ? " <span class='hnp-muted'>or " + n.altF.join(" ") + "</span>" : "") + "</td>" : "") +
          (sides.indexOf("Bb") >= 0 ? "<td>" + (n.b.join(" ") || "0") + "</td>" : "") + "<td>" + (S.names ? C.name(C.concert(n.midi)) : "") + "</td></tr>";
      });
      html += "</tbody></table><p class='hnp-muted'>Numbers are the levers pressed (0 = none). The first column is written pitch, high notes at the top" +
        (S.type === "double" ? "; the blue line marks where the book suggests moving to the B♭ side (the notes above the line, from written G♯4/A♭4)" : "") + ". Click a note to hear it.</p>";
      host.innerHTML = html;
      host.querySelectorAll(".hnp-tb").forEach(function (b) { b.onclick = function () { play([+b.dataset.m], 1.1); }; });
    }
    renders.push(draw); draw();
  }

  global.HornPage = { sound: sound, note: note, abcNote: abcNote, explorer: explorer, builder: builder, chartTable: chartTable, state: S };
})(window);
