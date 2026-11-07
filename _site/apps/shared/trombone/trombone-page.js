// trombone-page.js — the interactive parts of lessons/trombone.qmd. Needs TromboneChart (trombone-chart.js) and ABCJS (abcjs-basic.js, loaded by the page).
//   TrombonePage.sound()          -> Promise { ac, out }   one AudioContext for the page, registered with AudioTap
//   TrombonePage.explorer(el)     pick a note: staff, the slide in the usual position (and alternates, shortened, F trigger), Hear
//   TrombonePage.builder(el)      drag or click the slide: every note that position plays; and a quiz: which position for this note?
//   TrombonePage.glide(el)        hold a note and slide: the pitch follows the slide
//   TrombonePage.chartTable(el)   the printed charts redrawn: rows = positions, columns = partials
// Shared display controls (bass / treble clef reading, staff on/off, letter names on/off) are the same on every widget on the page.
(function (global) {
  "use strict";
  var C = global.TromboneChart, snd = null;
  var S = { reading: "bass", staff: true, names: true }, bars = [], renders = [];
  try { var saved = JSON.parse(localStorage.getItem("trombone-page") || "null"); if (saved) { S.staff = saved.staff !== false; S.names = saved.names !== false; if (saved.reading === "treble") S.reading = "treble"; } } catch (e) {}

  function sound() {
    if (!snd) snd = new Promise(function (res) {
      var AC = global.AudioContext || global.webkitAudioContext, ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
      if (global.AudioTap) AudioTap.register(ac, out, "Trombone slide chart");
      res({ ac: ac, out: out });
    });
    return snd.then(function (s) { return s.ac.resume().then(function () { return s; }); });
  }
  function play(notes, step) {   // sounding notes one after another
    return sound().then(function (s) { var t = s.ac.currentTime + 0.05; notes.forEach(function (m, i) { C.tone(s.ac, s.out, m, t + i * step, step * 0.95); }); });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shown(m) { return C.written(S.reading, m); }
  function label(m) { return C.both(shown(m)); }
  function ordinal(p) { return ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][p]; }
  function posText(f) { return (f.short ? "shortened " : "") + ordinal(f.pos) + " position"; }
  function abcNote(m, how) {
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1;
    var SH = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"], FL = ["C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B"];
    var n = (how === "flat" ? FL : SH)[pc], acc = n.length > 1 ? n[0] : "", L = n[n.length - 1];
    if (oct >= 5) return acc + L.toLowerCase() + "'".repeat(oct - 5);
    return acc + L + ",".repeat(4 - oct);
  }
  function staff(box, notes, w) {   // sounding midi list; spelled both ways on a black key; whole notes, in the chosen reading
    box.innerHTML = "";
    if (!global.ABCJS || !S.staff || !notes.length) return;
    var abc = [];
    notes.forEach(function (m) { m = shown(m); var pc = ((m % 12) + 12) % 12; if ([1, 3, 6, 8, 10].indexOf(pc) >= 0) { abc.push(abcNote(m, "sharp")); abc.push(abcNote(m, "flat")); } else abc.push(abcNote(m)); });
    ABCJS.renderAbc(box, "X:1\nL:1/1\nK:C clef=" + C.READINGS[S.reading].clef + "\n" + abc.join(" ") + "|]", { staffwidth: w || Math.max(90, abc.length * 42 + 30), paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, scale: 0.9, add_classes: false });
  }
  function save() { try { localStorage.setItem("trombone-page", JSON.stringify({ staff: S.staff, names: S.names, reading: S.reading })); } catch (e) {} }
  function rerender() { renders.forEach(function (f) { f(); }); bars.forEach(function (b) { b.sync(); }); }

  function controls() {
    var bar = el("div", "tbp-bar");
    function box(txt, key) { var l = el("label", "tbp-chk"), c = el("input"); c.type = "checkbox"; l.appendChild(c); l.appendChild(document.createTextNode(" " + txt)); c.onchange = function () { S[key] = c.checked; save(); rerender(); }; return { l: l, c: c }; }
    var rd = el("select", "form-select form-select-sm tbp-reading"); rd.setAttribute("aria-label", "Which clef to read");
    Object.keys(C.READINGS).forEach(function (k) { var o = el("option", null, C.READINGS[k].label); o.value = k; rd.appendChild(o); });
    rd.onchange = function () { S.reading = rd.value; save(); rerender(); };
    var st = box("Show staff", "staff"), nm = box("Show letter names", "names");
    bar.appendChild(rd); bar.appendChild(st.l); bar.appendChild(nm.l);
    bar.sync = function () { rd.value = S.reading; st.c.checked = S.staff; nm.c.checked = S.names; };
    bars.push(bar); bar.sync(); return bar;
  }

  // ---------- explorer ----------
  function explorer(root) {
    root.appendChild(controls());
    var strip = el("div", "tbp-strip"), card = el("div", "tbp-card"); root.appendChild(strip); root.appendChild(card);
    var cur = 58, revealed = false;
    var GROUPS = [["Low", 40, 47], ["Middle", 48, 59], ["High", 60, 70]];
    function draw() {
      strip.innerHTML = "";
      GROUPS.forEach(function (g) {
        var row = el("div", "tbp-row"); row.appendChild(el("span", "tbp-rowlab", g[0]));
        for (var m = g[1]; m <= g[2]; m++) (function (m) {
          var b = el("button", "btn btn-sm btn-outline-secondary tbp-nb", S.names ? label(m).replace(/\d+/, function (d) { return "<sub>" + d + "</sub>"; }) : "♪"); b.type = "button"; b.dataset.m = m;
          b.title = S.names ? "Sounds " + C.both(m) : "Note " + (m - C.LOW + 1) + " of the range"; b.setAttribute("aria-label", b.title);
          b.onclick = function () { cur = m; revealed = false; show(true); }; row.appendChild(b);
        })(m);
        strip.appendChild(row);
      });
    }
    function show(hear) {
      var m = cur, fs = C.FINGERINGS[m];
      strip.querySelectorAll(".tbp-nb").forEach(function (b) { b.classList.toggle("active", +b.dataset.m === m); });
      card.innerHTML = "";
      var head = el("div", "tbp-head"), st = el("div", "tbp-staff"); head.appendChild(st);
      var nm = el("div", "tbp-names"), hidden = !S.names && !revealed;
      nm.innerHTML = "<div class='tbp-big'>" + (hidden ? "?" : label(m)) + "</div><div class='tbp-muted'>" +
        (S.reading === "bass" ? "bass clef: the note you hear" : "treble clef: written a 9th above; sounds <strong>" + (hidden ? "?" : C.both(m)) + "</strong>") + "</div>";
      if (hidden) { var rv = el("button", "btn btn-sm btn-outline-secondary", "Show the name"); rv.type = "button"; rv.onclick = function () { revealed = true; show(false); }; nm.appendChild(rv); }
      var hb = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"); hb.type = "button"; hb.onclick = function () { play([m], 1.3); };
      nm.appendChild(hb); head.appendChild(nm); card.appendChild(head);
      staff(st, [m], 90);
      if (!S.staff && !S.names) card.appendChild(el("p", "tbp-muted", "Staff and names are both hidden: press Hear it, or turn one of them back on."));
      var row = el("div", "tbp-diags");
      function fig(pos, short, cap, big) {
        var f = el("figure", "tbp-fig"), d = el("div", "tbp-d");
        f.appendChild(d); C.diagram(d, { small: true, label: "Slide in " + posText({ pos: pos, short: short }) + " for " + C.both(m) }).set(pos, short);
        f.appendChild(el("figcaption", null, cap)); row.appendChild(f);
      }
      fs.forEach(function (f, i) { fig(f.pos, f.short, "<span class='tbp-posbig'>" + (f.short ? "−" : "") + f.pos + "</span> " + (i === 0 ? "Usual" : "Alternate") + " · " + posText(f)); });
      if (C.TRIGGER[m]) { var t = C.TRIGGER[m]; fig(t.pos, false, "<span class='tbp-posbig'>" + t.pos + "</span> With the F-attachment trigger down · " + posText(t) + " (the book's suggestion for short arms)"); }
      card.appendChild(row);
      var f0 = fs[0], others = C.lookup(f0.pos, f0.short).filter(function (x) { return x.midi !== m; });
      var p = el("p", "tbp-muted");
      p.innerHTML = "This note is <strong>partial " + f0.partial + "</strong> of " + posText(f0) + " (worked out on this page; the chart does not print it). The same slide position also plays " +
        (others.length ? others.map(function (x) { return "<strong>" + (S.names || revealed ? label(x.midi) : "?") + "</strong>"; }).join(", ") : "no other note on this chart") +
        ": which one comes out depends on your lips and air." + (f0.short ? " <br>A shortened position is the chart's \"−\": a little closer to you than the number says." : "");
      card.appendChild(p);
      if (hear) play([m], 1.3);
    }
    function full() { draw(); show(false); }
    renders.push(full); full();
  }

  // ---------- builder + quiz ----------
  function builder(root) {
    root.appendChild(controls());
    var bar = el("div", "tbp-bar"), mode = el("div", "btn-group btn-group-sm"); mode.setAttribute("role", "group");
    var bFree = el("button", "btn btn-outline-primary active", "Which notes does this position play?"), bQuiz = el("button", "btn btn-outline-primary", "Quiz: position for this note");
    bFree.type = bQuiz.type = "button"; mode.appendChild(bFree); mode.appendChild(bQuiz); bar.appendChild(mode); root.appendChild(bar);
    var wrap = el("div", "tbp-build"), dWrap = el("div", "tbp-dwrap"), dEl = el("div", "tbp-d"), side = el("div", "tbp-side");
    dWrap.appendChild(dEl); dWrap.appendChild(el("p", "tbp-muted", "Drag the slide, or click a number, or use the arrow keys (the slide must have focus)."));
    wrap.appendChild(dWrap); wrap.appendChild(side); root.appendChild(wrap);
    var ask = el("div", "tbp-ask"), st = el("div", "tbp-staff"), out = el("div", "tbp-out"), btns = el("div", "tbp-bar");
    var shortL = el("label", "tbp-chk"), shortC = el("input"); shortC.type = "checkbox"; shortL.appendChild(shortC); shortL.appendChild(document.createTextNode(" shortened (the chart's −)"));
    side.appendChild(ask); side.appendChild(shortL); side.appendChild(st); side.appendChild(out); side.appendChild(btns);
    var bHear = el("button", "btn btn-sm btn-outline-primary", "🔊 Hear it"), bCheck = el("button", "btn btn-sm btn-primary", "Check"),
        bNext = el("button", "btn btn-sm btn-outline-primary", "Next note"), bShow = el("button", "btn btn-sm btn-outline-secondary", "Show me");
    [bHear, bCheck, bShow, bNext].forEach(function (b) { b.type = "button"; btns.appendChild(b); });
    var score = el("p", "tbp-muted"); side.appendChild(score);
    var quiz = false, target = null, right = 0, asked = 0, firstTry = true, lastNotes = [];
    var dg = C.diagram(dEl, { interactive: true, label: "Trombone slide: drag to a position", onChange: function () { shortC.checked = shortC.checked && dg.get().pos > 1; update(); } });
    function cur() { var g = dg.get(); return { pos: g.pos, short: shortC.checked && g.pos > 1 }; }
    function update() {
      var c = cur(); dg.set(c.pos, c.short);
      if (quiz) { out.textContent = ""; return; }
      var ns = C.lookup(c.pos, c.short); lastNotes = ns.map(function (x) { return x.midi; });
      var html = "<div class='tbp-posbig'>" + posText(c) + "</div>";
      if (!ns.length) html += "<div>That position is not on the chart.</div>";
      else {
        html += "<div>Notes this position plays on the chart, low to high:</div><ol class='tbp-notes'>";
        ns.forEach(function (x) { html += "<li><span class='tbp-nname'>" + (S.names ? label(x.midi) : "·") + "</span> <span class='tbp-muted'>partial " + x.partial + (x.alt ? ", the chart's second choice" : "") + "</span></li>"; });
        html += "</ol>";
      }
      out.innerHTML = html; staff(st, lastNotes, 0);
    }
    shortC.onchange = update;
    function setMode(q) {
      quiz = q; bFree.classList.toggle("active", !q); bQuiz.classList.toggle("active", q);
      bCheck.hidden = bNext.hidden = bShow.hidden = !q; dg.set(1, false); shortC.checked = false; out.textContent = ""; st.innerHTML = "";
      ask.textContent = q ? "" : "Move the slide. The page lists every note on the chart that position can play.";
      if (q) next(); else update();
    }
    function next() {
      var pool = Object.keys(C.FINGERINGS).map(Number);
      target = pool[Math.floor(Math.random() * pool.length)]; firstTry = true; dg.set(1, false); shortC.checked = false; out.textContent = "";
      ask.innerHTML = "Put the slide where <strong>" + (S.names ? label(target) : "the note on the staff") + "</strong> is played, then press Check." + (S.reading === "treble" ? " (Treble clef reading.)" : "");
      staff(st, [target], 0);
      if (!S.staff && !S.names) ask.innerHTML += " <em>(Staff and names are hidden: press Hear it.)</em>";
    }
    function scoreText() { score.textContent = asked ? right + " of " + asked + " right on the first try." : ""; }
    bCheck.onclick = function () {
      if (!quiz) return;
      var c = cur(), ok = C.FINGERINGS[target].some(function (f) { return f.pos === c.pos && !!f.short === c.short; });
      if (ok) { asked++; if (firstTry) right++; out.innerHTML = "<span class='tbp-good'>✓ Yes!</span>"; play([target], 1); setTimeout(function () { if (quiz) next(); }, 1200); }
      else { firstTry = false; var ns = C.lookup(c.pos, c.short); out.innerHTML = "<span class='tbp-bad'>Not yet.</span> " + (ns.length ? posText(c) + " plays " + ns.map(function (x) { return label(x.midi); }).join(", ") + "." : "That is not on the chart."); }
      scoreText();
    };
    bShow.onclick = function () { if (!quiz) return; firstTry = false; var f = C.FINGERINGS[target][0]; shortC.checked = !!f.short; dg.set(f.pos, f.short); out.textContent = "Here it is. Press Next note when you've got it."; };
    bNext.onclick = function () { if (quiz) { if (firstTry) asked++; scoreText(); next(); } };
    bHear.onclick = function () { if (quiz) play([target], 1.3); else if (lastNotes.length) play(lastNotes, 0.8); };
    bFree.onclick = function () { setMode(false); }; bQuiz.onclick = function () { setMode(true); };
    renders.push(function () { right = asked = 0; scoreText(); setMode(quiz); });
    setMode(false);
  }

  // ---------- glide ----------
  function glide(root) {
    var bar = el("div", "tbp-glide"), sel = el("select", "form-select form-select-sm"), btn = el("button", "btn btn-sm btn-primary", "▶ Hold the note"), read = el("span", "tbp-readout", "");
    sel.setAttribute("aria-label", "Which partial to hold");
    [[2, 46], [3, 53], [4, 58], [5, 62], [6, 65]].forEach(function (p) { var o = el("option", null, "Partial " + p[0] + " (" + C.both(p[1]) + " in 1st position)"); o.value = p[1]; sel.appendChild(o); });
    sel.value = 58; bar.appendChild(sel); bar.appendChild(btn); bar.appendChild(read); root.appendChild(bar);
    var dEl = el("div", "tbp-d"), wrap = el("div", "tbp-dwrap"); wrap.appendChild(dEl); root.appendChild(wrap);
    var held = null, base = 58, pos = 1;
    function midiAt(p) { return base - (p - 1); }
    function show(p) {
      pos = p; var m = midiAt(p), n = Math.round(m), cents = Math.round((m - n) * 100);
      read.textContent = "Position " + p.toFixed(1) + " · " + C.both(n) + (Math.abs(cents) > 4 ? " " + (cents > 0 ? "+" : "") + cents + "¢" : "");
      if (held) held.setMidi(m);
    }
    var dg = C.diagram(dEl, { interactive: true, label: "Trombone slide: drag while the note sounds", onMove: show, onChange: function (p) { show(p); } });
    sel.onchange = function () { base = +sel.value; show(pos); };
    btn.onclick = function () {
      if (held) { held.stop(); held = null; btn.textContent = "▶ Hold the note"; return; }
      sound().then(function (s) { base = +sel.value; held = C.holdTone(s.ac, s.out, midiAt(pos)); btn.textContent = "■ Stop"; });
    };
    show(1);
    global.addEventListener("pagehide", function () { if (held) held.stop(); });
  }

  // ---------- the printed chart ----------
  function chartTable(root) {
    root.appendChild(controls());
    var host = el("div", "tbp-table-wrap"); root.appendChild(host);
    function draw() {
      var rows = [[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [2, true], [3, true], [4, true]], parts = [2, 3, 4, 5, 6, 7, 8];
      var html = "<table class='tbp-table'><thead><tr><th>Position</th>" + parts.map(function (p) { return "<th>Partial " + p + "</th>"; }).join("") + "</tr></thead><tbody>";
      rows.forEach(function (r) {
        var ns = C.lookup(r[0], r[1]); if (!ns.length) return;
        html += "<tr><th>" + (r[1] ? "−" : "") + r[0] + "</th>" + parts.map(function (p) {
          var x = ns.filter(function (n) { return n.partial === p; })[0];
          return "<td>" + (x ? "<button type='button' class='btn btn-sm " + (x.alt ? "btn-outline-info" : "btn-outline-secondary") + " tbp-tb' data-m='" + x.midi + "'>" + (S.names ? label(x.midi) : "♪") + "</button>" : "") + "</td>";
        }).join("") + "</tr>";
      });
      html += "</tbody></table><p class='tbp-muted'>Rows are slide positions (− = shortened); columns are partials (worked out here). A blue-outlined note is the chart's second choice for that note. Click a note to hear it.</p>";
      host.innerHTML = html;
      host.querySelectorAll(".tbp-tb").forEach(function (b) { b.onclick = function () { play([+b.dataset.m], 1.1); }; });
    }
    renders.push(draw); draw();
  }

  global.TrombonePage = { sound: sound, explorer: explorer, builder: builder, glide: glide, chartTable: chartTable, state: S };
})(window);
