// brass-page.js — the interactive parts of lessons/brass-fingerings.qmd. Needs BrassChart (brass-chart.js) and ABCJS (abcjs-basic.js, loaded by the page).
//   BrassPage.sound()           -> Promise { ac, out }   one AudioContext for the page, registered with AudioTap
//   BrassPage.explorer(el)      pick trumpet or tuba and a note: staff, valves, alternates, Hear
//   BrassPage.builder(el)       press valves: every note that combination plays; and a quiz: which valves for this note?
//   BrassPage.chartTable(el)    the printed chart redrawn: rows = the chart's partials, columns = valve combinations
// The display controls (instrument, staff on/off, letter names on/off, trumpet concert/written) are shared by every widget on the page.
(function (global) {
  "use strict";
  var C = global.BrassChart, snd = null;
  var S = { inst: "trumpet", staff: true, names: true, concert: false }, bars = [], renders = [];
  try { var saved = JSON.parse(localStorage.getItem("brass-page") || "null"); if (saved) { S.staff = saved.staff !== false; S.names = saved.names !== false; } } catch (e) {}

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Brass fingering chart");
      res({ ac: ac, out: out });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(written, step) {   // written notes one after another; they sound at concert pitch (trumpet: 2 semitones lower)
    var tr = C.INSTRUMENTS[S.inst].transpose;
    return sound().then(function (s) { var t = s.ac.currentTime + 0.05; written.forEach(function (m, i) { C.tone(s.ac, s.out, m + tr, t + i * step, step * 0.95); }); });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shown(m) { return S.inst === "trumpet" && S.concert ? m - 2 : m; }   // the pitch the staff and letters show
  function label(m) { return C.both(shown(m)); }
  function letter(m) { return label(m).replace(/\d+/g, ""); }
  function abcNote(m, how) {
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1;
    var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
    var n = (how === "flat" ? FL : SH)[pc], acc = n.length > 1 ? n[0] : "", L = n[n.length - 1];
    if (oct >= 5) return acc + L.toLowerCase() + "'".repeat(oct - 5);
    return acc + L + ",".repeat(4 - oct);
  }
  function staff(box, notes, w) {   // notes: written midi list (spelled both ways when a black key), whole notes
    box.innerHTML = "";
    if (!global.ABCJS || !S.staff || !notes.length) return;
    var abc = [];
    notes.forEach(function (m) { m = shown(m); var pc = ((m % 12) + 12) % 12; if ([1, 3, 6, 8, 10].indexOf(pc) >= 0) { abc.push(abcNote(m, "sharp")); abc.push(abcNote(m, "flat")); } else abc.push(abcNote(m)); });
    ABCJS.renderAbc(box, "X:1\nL:1/1\nK:C clef=" + (S.inst === "tuba" ? "bass" : "treble") + "\n" + abc.join(" ") + "|]", { staffwidth: w || Math.max(90, abc.length * 42 + 30), paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 0.9, add_classes: false });
  }
  function save() { try { localStorage.setItem("brass-page", JSON.stringify({ staff: S.staff, names: S.names })); } catch (e) {} }
  function rerender() { renders.forEach(function (f) { f(); }); bars.forEach(function (b) { b.sync(); }); }

  // the shared controls
  function controls(opts) {
    var bar = el("div", "brp-bar"), sel = el("select", "form-select form-select-sm brp-inst");
    sel.setAttribute("aria-label", "Instrument");
    Object.keys(C.INSTRUMENTS).forEach(function (k) { var o = el("option", null, k === "trumpet" ? "Trumpet (B♭)" : "Tuba (B♭, concert pitch)"); o.value = k; sel.appendChild(o); });
    function box(txt, key) { var l = el("label", "brp-chk"), c = el("input"); c.type = "checkbox"; l.appendChild(c); l.appendChild(document.createTextNode(" " + txt)); c.onchange = function () { S[key] = c.checked; save(); rerender(); }; return { l: l, c: c }; }
    var st = box("Show staff", "staff"), nm = box("Show letter names", "names");
    var pitch = el("select", "form-select form-select-sm brp-pitch"); pitch.setAttribute("aria-label", "Written or concert pitch");
    [["written", "Written pitch (what the player reads)"], ["concert", "Concert pitch (what you hear)"]].forEach(function (p) { var o = el("option", null, p[1]); o.value = p[0]; pitch.appendChild(o); });
    sel.onchange = function () { S.inst = sel.value; if (S.inst === "tuba") S.concert = false; rerender(); };
    pitch.onchange = function () { S.concert = pitch.value === "concert"; rerender(); };
    bar.appendChild(sel); bar.appendChild(st.l); bar.appendChild(nm.l); bar.appendChild(pitch);
    bar.sync = function () { sel.value = S.inst; st.c.checked = S.staff; nm.c.checked = S.names; pitch.value = S.concert ? "concert" : "written"; pitch.hidden = S.inst !== "trumpet"; };
    bars.push(bar); bar.sync(); return bar;
  }

  function fingerText(valves) { return valves.length ? valves.join(" + ") : "no valves (open)"; }
  function printedValves(host, valves, n) {   // the chart's row of circles
    host.innerHTML = ""; for (var i = 1; i <= n; i++) { var c = el("span", "brp-dot" + (valves.indexOf(i) >= 0 ? " on" : "")); host.appendChild(c); }
  }

  // ---------- explorer ----------
  function explorer(root) {
    root.appendChild(controls());
    var strip = el("div", "brp-strip"), card = el("div", "brp-card"); root.appendChild(strip); root.appendChild(card);
    var cur = { trumpet: 67, tuba: 41 }, revealed = false;
    function groups() { return S.inst === "trumpet" ? [["Low", 54, 66], ["Middle", 67, 78], ["High", 79, 84]] : [["Pedal-to-low", 28, 40], ["Middle", 41, 53]]; }
    function draw() {
      var I = C.INSTRUMENTS[S.inst]; strip.innerHTML = "";
      groups().forEach(function (g) {
        var row = el("div", "brp-row"); row.appendChild(el("span", "brp-rowlab", g[0]));
        for (var m = g[1]; m <= g[2]; m++) (function (m) {
          var b = el("button", "btn btn-sm btn-outline-secondary brp-nb", S.names ? label(m).replace(/\d+/, function (d) { return "<sub>" + d + "</sub>"; }) : "♪"); b.type = "button"; b.dataset.m = m;
          b.title = S.names ? "Written " + C.both(m) : "Note " + (m - I.low + 1) + " of the range"; b.setAttribute("aria-label", b.title);
          b.onclick = function () { cur[S.inst] = m; revealed = false; show(true); }; row.appendChild(b);
        })(m);
        strip.appendChild(row);
      });
    }
    function show(hear) {
      var m = cur[S.inst], I = C.INSTRUMENTS[S.inst], fs = C.FINGERINGS[S.inst][m];
      strip.querySelectorAll(".brp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === m); });
      card.innerHTML = "";
      var head = el("div", "brp-head"), st = el("div", "brp-staff"); head.appendChild(st);
      var nm = el("div", "brp-names"), hidden = !S.names && !revealed;
      nm.innerHTML = "<div class='brp-big'>" + (hidden ? "?" : label(m)) + "</div><div class='brp-muted'>" +
        (S.inst === "trumpet" ? (S.concert ? "concert pitch shown · the player reads <strong>" + (hidden ? "?" : C.both(m)) + "</strong>" : "written · sounds as concert <strong>" + (hidden ? "?" : C.both(C.concert("trumpet", m))) + "</strong>")
          : "sounding pitch, bass clef (a tuba is not transposed on this chart)") + "</div>";
      if (hidden) { var rv = el("button", "btn btn-sm btn-outline-secondary", "Show the name"); rv.type = "button"; rv.onclick = function () { revealed = true; show(false); }; nm.appendChild(rv); }
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([m], 1.3); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      staff(st, [m], 90);
      if (!S.staff && !S.names) card.appendChild(el("p", "brp-muted", "Staff and names are both hidden: press Hear it, or turn one of them back on."));
      var row = el("div", "brp-diags");
      fs.forEach(function (f, i) {
        var fig = el("figure", "brp-fig"), d = el("div", "brp-d"), dots = el("div", "brp-dots"); fig.appendChild(d);
        C.diagram(d, { nvalves: I.nvalves, label: "Valves for " + C.both(m) + (i ? " alternate" : "") }).set(f.valves);
        fig.appendChild(el("div", "brp-valtxt", f.valves.length ? f.valves.join("") : "0"));
        fig.appendChild(el("figcaption", null, (i === 0 ? "Usual" : "Alternate (valve 4)") + " · " + fingerText(f.valves) + (f.slide ? " · *3rd slide" : "")));
        row.appendChild(fig);
      });
      card.appendChild(row);
      var others = C.lookup(S.inst, fs[0].valves).filter(function (x) { return x.midi !== m; });
      var p = el("p", "brp-muted");
      p.innerHTML = "On the chart this note is in the row <strong>" + fs[0].partial + "</strong> (the chart's own partial numbers). The same fingering also plays " +
        (others.length ? others.map(function (x) { return "<strong>" + (S.names || revealed ? label(x.midi) : "?") + "</strong>"; }).join(", ") : "no other note on this chart") +
        ": which one comes out depends on how tight your lips are and how fast your air moves." + (fs[0].slide ? " <br>*On the chart, move the 3rd valve slide out for this note." : "");
      card.appendChild(p);
      if (hear) play([m], 1.3);
    }
    function full() { draw(); show(false); }
    renders.push(full); full();
  }

  // ---------- builder + quiz ----------
  function builder(root) {
    root.appendChild(controls());
    var bar = el("div", "brp-bar"), mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "Which notes does this play?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: valves for this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode); root.appendChild(bar);
    var wrap = el("div", "brp-build"), dEl = el("div", "brp-d brp-d-big"), side = el("div", "brp-side");
    wrap.appendChild(dEl); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "brp-ask"), st = el("div", "brp-staff"), out = el("div", "brp-out"), btns = el("div", "brp-bar");
    side.appendChild(ask); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bClear = el("button", "btn btn-sm btn-outline-secondary", "Release all valves"), bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"),
        bCheck = el("button", "btn btn-sm btn-primary", "Check"), bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bClear, bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "brp-muted"); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true, dg = null, lastNotes = [];
    function nvalves() { return C.INSTRUMENTS[S.inst].nvalves; }
    function makeDiagram() { var v = dg ? dg.get() : []; dg = C.diagram(dEl, { nvalves: nvalves(), onToggle: update, label: "Valves: click to press" }); dg.set(v.filter(function (x) { return x <= nvalves(); })); }
    function update() {
      if (quiz) { out.textContent = ""; return; }
      var v = dg.get(), ns = C.lookup(S.inst, v); lastNotes = ns.map(function (x) { return x.midi; });
      var html = "<div class='brp-valbig'>" + fingerText(v) + "</div>";
      if (!ns.length) html += "<div>That combination is not on the chart.</div>";
      else {
        html += "<div>" + (S.inst === "trumpet" && S.concert ? "Sounding" : S.inst === "trumpet" ? "Written" : "Sounding") + " notes this fingering can play, low to high:</div><ol class='brp-notes'>";
        ns.forEach(function (x) { html += "<li><span class='brp-nname'>" + (S.names ? label(x.midi) : "·") + "</span> <span class='brp-muted'>chart row " + x.partial + (x.alt ? ", valve-4 alternate" : "") + (x.slide ? ", *3rd slide" : "") + "</span></li>"; });
        html += "</ol>";
      }
      out.innerHTML = html; staff(st, lastNotes, 0);
    }
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; bHear.hidden = false; dg.set([]); out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Click the valves to press them. The page lists every note that fingering can play.";
      if (q) next(); else update();
    }
    function next() {
      var I = C.INSTRUMENTS[S.inst], pool = Object.keys(C.FINGERINGS[S.inst]).map(Number).filter(function (m) { return m >= (S.inst === "trumpet" ? 55 : I.low) && m <= I.high; });
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set([]); out.textContent = "";
      ask.innerHTML = "Press the valves for <strong>" + (S.names ? label(target) : "the note on the staff") + "</strong>, then press Check." + (S.inst === "trumpet" && !S.concert ? " (Written pitch.)" : "");
      staff(st, [target], 0);
      if (!S.staff && !S.names) ask.innerHTML += " <em>(Staff and names are hidden: press Hear it.)</em>";
    }
    function scoreText() { score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; }
    bCheck.onclick = function () {
      if (!quiz) return;
      var v = dg.get(), ok = C.FINGERINGS[S.inst][target].some(function (f) { return C.sameSet(f.valves, v); });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='brp-good'>✓ Yes!</span>"; play([target], 1); setTimeout(function () { if (quiz) next(); }, 1200); }
      else { firstTry = false; var ns = C.lookup(S.inst, v); out.innerHTML = "<span class='brp-bad'>Not yet.</span> " + (ns.length ? "That fingering plays " + ns.map(function (x) { return label(x.midi); }).join(", ") + "." : "That isn't a fingering on the chart."); }
      scoreText();
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; dg.set(C.FINGERINGS[S.inst][target][0].valves); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (firstTry) asked++; scoreText(); next(); } };
    bClear.onclick = function () { dg.set([]); update(); };
    bHear.onclick = function () { if (quiz) play([target], 1.3); else if (lastNotes.length) play(lastNotes, 0.8); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    renders.push(function () { makeDiagram(); right = asked = 0; scoreText(); setMode(quiz); });
    makeDiagram(); setMode(false);
  }

  // ---------- the printed chart ----------
  function chartTable(root) {
    root.appendChild(controls());
    var host = el("div", "brp-table-wrap"); root.appendChild(host);
    function draw() {
      var I = C.INSTRUMENTS[S.inst], F = C.FINGERINGS[S.inst], combos = {}, order = [];
      Object.keys(F).forEach(function (m) { F[m].forEach(function (f) { if (f.alt) return; var k = f.valves.join("") || "0"; if (!combos[k]) { combos[k] = f.valves; order.push(k); } }); });
      order.sort(function (a, b) { var A = combos[a], B = combos[b]; var m = function (v) { return Math.max.apply(null, C.lookup(S.inst, v).map(function (x) { return x.midi; })); }; return m(B) - m(A); });
      var rows = {}; Object.keys(F).forEach(function (m) { F[m].forEach(function (f) { if (!f.alt) (rows[f.partial] = rows[f.partial] || {})[f.valves.join("") || "0"] = +m; }); });
      var html = "<table class='brp-table'><thead><tr><th>Chart row</th>" + order.map(function (k) { return "<th>" + k + "</th>"; }).join("") + "</tr></thead><tbody>";
      Object.keys(rows).map(Number).sort(function (a, b) { return b - a; }).forEach(function (p) {
        html += "<tr><th>" + p + "</th>" + order.map(function (k) { var m = rows[p][k]; return "<td>" + (m == null ? "" : "<button type='button' class='btn btn-sm btn-outline-secondary brp-tb' data-m='" + m + "'>" + (S.names ? label(m) : "♪") + "</button>") + "</td>"; }).join("") + "</tr>";
      });
      html += "</tbody></table>";
      if (S.inst === "tuba") html += "<p class='brp-muted'>Valve 4 (not shown above): <strong>4</strong> plays the same notes as 1 + 3, and <strong>2 + 4</strong> the same as 1 + 2 + 3.</p>";
      html += "<p class='brp-muted'>Columns are valve combinations (0 = no valves); rows are the chart's partial numbers. Click a note to hear it.</p>";
      host.innerHTML = html;
      host.querySelectorAll(".brp-tb").forEach(function (b) { b.onclick = function () { play([+b.dataset.m], 1.1); }; });
    }
    renders.push(draw); draw();
  }

  global.BrassPage = { sound: sound, explorer: explorer, builder: builder, chartTable: chartTable, state: S };
})(window);
