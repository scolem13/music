// fb-explorer.js — the chord inversion explorer for figured bass (Hutchinson, ch. 16; theory/figured-bass.qmd).
// <div class="fb-explorer" data-key="C" data-mode="major" data-chord="0" data-seventh="0" data-inv="2"></div>
// Pick a key, a chord (by scale degree), triad or seventh, and an inversion. A grand staff shows the chord stacked up from the
// bass, a bracket from the bass to each note with the interval it makes, and the figures under the bass, each number in the
// colour of the chord member it lands on (root, 3rd, 5th, 7th). Beside it: what each number means, counted out in letter
// names, the full figure the short one stands for, and the Roman numeral, slash label and lead-sheet symbol. ▶ plays it.
// Self-contained (its own small SVG staff); sound through BandSounds, registered with AudioTap.
(function (global) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC = { "-2": "𝄫", "-1": "♭", "0": "♮", "1": "♯", "2": "𝄪" }, ACC_NAME = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
  var SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  var MAJ_KEYS = [["C", 0], ["G", 1], ["D", 2], ["A", 3], ["E", 4], ["B", 5], ["F♯", 6], ["F", -1], ["B♭", -2], ["E♭", -3], ["A♭", -4], ["D♭", -5], ["G♭", -6]];
  var MIN_KEYS = [["A", 0], ["E", 1], ["B", 2], ["F♯", 3], ["C♯", 4], ["G♯", 5], ["D♯", 6], ["D", -1], ["G", -2], ["C", -3], ["F", -4], ["B♭", -5], ["E♭", -6]];
  var MEMBER = ["root", "3rd", "5th", "7th"], MCLASS = ["fbx-r", "fbx-3", "fbx-5", "fbx-7"];
  var ORD = { 1: "unison", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "octave" };
  var FIG = { tri: [[5, 3], [6, 3], [6, 4]], sev: [[7, 5, 3], [6, 5, 3], [6, 4, 3], [6, 4, 2]] };       // every interval above the bass (16.5)
  var SHORT = { tri: [[], [6], [6, 4]], sev: [[7], [6, 5], [4, 3], [4, 2]] };                            // as written (16.2)
  var INV_NAME = ["Root position", "First inversion", "Second inversion", "Third inversion"];
  var SLASH = ["", "/3rd", "/5th", "/7th"];
  // the chords offered, as [scale degree (0 = tonic), raise the 7th degree (minor's V and vii°)]
  var CHORDS = { major: [[0], [1], [2], [3], [4], [5], [6]], minor: [[0], [1], [2], [3], [4, 1], [5], [6], [6, 1]] };
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

  function mod(n, m) { return ((n % m) + m) % m; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function svg(tag, attrs, txt) { var e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; return e; }
  function sigMap(k) { var m = [0, 0, 0, 0, 0, 0, 0]; for (var i = 0; i < Math.abs(k); i++) m[(k > 0 ? SHARP_ORDER : FLAT_ORDER)[i]] = k > 0 ? 1 : -1; return m; }
  function midi(n) { return 12 * (Math.floor(n.d / 7) + 1) + NAT[mod(n.d, 7)] + n.a; }
  function nm(n) { return LET[mod(n.d, 7)] + ACC_NAME[n.a]; }
  function letterRun(a, b) { var s = []; for (var d = a.d; d <= b.d; d++) s.push(LET[mod(d, 7)]); return s; }

  // the chord: notes as { d: diatonic number (C4 = 28), a: accidental, m: chord member }, bass first, close position
  function build(st) {
    var keys = st.mode === "major" ? MAJ_KEYS : MIN_KEYS, key = keys[st.key], sig = sigMap(key[1]);
    var tl = LET.indexOf(key[0][0]), ch = CHORDS[st.mode][st.chord], deg = ch[0], raise = !!ch[1];
    var size = st.seventh ? 4 : 3, inv = Math.min(st.inv, size - 1);
    var members = [];
    for (var i = 0; i < size; i++) {
      var dd = tl + deg + 2 * i, a = sig[mod(dd, 7)];
      if (raise && mod(deg + 2 * i, 7) === 6) a += 1;
      members.push({ l: mod(dd, 7), a: a, m: i, raised: raise && mod(deg + 2 * i, 7) === 6 });
    }
    var bassM = members[inv], bd = 21 + mod(bassM.l - 0, 7);      // bass between C3 and B3
    if (bd > 25) bd -= 7;                                           // keep it on the bass staff, A2–A3
    var notes = [{ d: bd, a: bassM.a, m: inv, raised: bassM.raised }], d = bd;
    for (var j = 1; j < size; j++) { var x = members[(inv + j) % size]; do d++; while (mod(d, 7) !== x.l); notes.push({ d: d, a: x.a, m: x.m, raised: x.raised }); }
    // quality from semitones above the root
    var r = members[0], rm = 12 + NAT[r.l] + r.a, semis = members.map(function (x) { return mod(12 + NAT[x.l] + x.a - rm, 12); });
    var t = semis[1] + "," + semis[2], q = t === "4,7" ? "maj" : t === "3,7" ? "min" : t === "3,6" ? "dim" : t === "4,8" ? "aug" : "?";
    var s7 = size === 4 ? semis[3] : null, q7 = s7 == null ? null : q === "maj" ? (s7 === 11 ? "M7" : "7") : q === "min" ? "7" : q === "dim" ? (s7 === 9 ? "°7" : "ø7") : "?";
    var rn = ROMAN[deg]; if (q === "min" || q === "dim") rn = rn.toLowerCase();
    var qmark = q === "dim" && !st.seventh ? "°" : q === "aug" ? "+" : "";
    var sym = nm({ d: r.l, a: r.a }) + (st.seventh ? { M7: "maj7", "7": q === "min" ? "m7" : "7", "°7": "°7", "ø7": "ø7" }[q7] : { maj: "", min: "m", dim: "°", aug: "+" }[q]);
    var sev7 = st.seventh ? { M7: "M", "7": "", "°7": "°", "ø7": "ø" }[q7] : "";
    var figs = (st.seventh ? FIG.sev : FIG.tri)[inv], short = (st.seventh ? SHORT.sev : SHORT.tri)[inv];
    var rnFig = rn + qmark + sev7 + short.join("");                    // V65, I64, viiø42, IM7
    return { key: key, keyLabel: (st.mode === "major" ? key[0] : key[0].toLowerCase()) + " " + st.mode, sig: sig, ksig: key[1], notes: notes, inv: inv, size: size,
      rn: rnFig, short: short, figs: figs, slash: rn + qmark + (st.seventh ? (q7 === "7" ? "7" : q7) : "") + SLASH[inv],
      sym: sym + (inv ? "/" + nm(notes[0]) : ""), root: members[0], q: q, q7: q7 };
  }

  // ---- the staff: abcjs draws the grand staff (notes from middle C up in the treble); the noteheads are then coloured by chord
  // member, and the brackets (bass to each note, with the interval) and the figures under the bass are added to its SVG.
  function abcNote(n, sig) {
    var l = LET[mod(n.d, 7)], o = Math.floor(n.d / 7), acc = n.a !== sig[mod(n.d, 7)] ? { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" }[n.a] : "";
    var t = o >= 5 ? l.toLowerCase() : l; for (var i = 5; i < o; i++) t += "'"; for (var j = 4; j > o; j--) t += ",";
    return acc + t;
  }
  function drawStaff(c, host) {
    host.innerHTML = "";
    var up = c.notes.filter(function (n) { return n.d >= 28; }), lo = c.notes.filter(function (n) { return n.d < 28; });
    var ch = function (ns) { return ns.length ? "[" + ns.map(function (n) { return abcNote(n, c.sig); }).join("") + "]4" : "x4"; };
    var key = c.key[0].replace("♯", "#").replace("♭", "b") + (/minor/.test(c.keyLabel) ? "m" : "");
    var abc = "X:1\nL:1/4\nM:none\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:" + key + "\n[V:1] " + ch(up) + " |]\n[V:2] " + ch(lo) + " |]\n";
    if (!global.ABCJS) { host.textContent = abc; return; }
    global.ABCJS.renderAbc(host, abc, { add_classes: true, staffwidth: 250, paddingleft: 0, paddingright: 0, paddingtop: 0, paddingbottom: 0 });
    var s = host.querySelector("svg"); if (!s) return;
    var heads = [].slice.call(s.querySelectorAll("path.abcjs-notehead")).map(function (p) { var bb = p.getBBox(); return { p: p, x: bb.x, w: bb.width, cy: bb.y + bb.height / 2 }; });
    heads.sort(function (p, q) { return q.cy - p.cy; });   // lowest first, like c.notes
    heads.forEach(function (h, k) { if (!c.notes[k]) return; h.p.setAttribute("class", h.p.getAttribute("class") + " fbx-nh " + MCLASS[c.notes[k].m]); h.p.setAttribute("data-k", k); });
    var W = +s.getAttribute("width"), H = +s.getAttribute("height"), right = Math.max.apply(null, heads.map(function (h) { return h.x + h.w; }));
    var bass = c.notes[0], bh = heads[0];
    c.notes.slice(1).forEach(function (nt, k) {
      var h = heads[k + 1]; if (!h) return;
      var iv = nt.d - bass.d + 1, bx = right + 22 + k * 26;
      var g = svg("g", { class: "fbx-br " + MCLASS[nt.m], "data-k": k + 1 });
      g.appendChild(svg("path", { d: "M" + (bx - 6) + " " + bh.cy + " H" + bx + " V" + h.cy + " H" + (bx - 6), class: "fbx-brline" }));
      g.appendChild(svg("text", { x: bx + 4, y: h.cy + 5, class: "fbx-brnum" }, String(iv)));
      s.appendChild(g);
    });
    // the figures under the bass staff: written ones solid, implied ones faint (in brackets)
    var staffB = s.querySelector("g.abcjs-staff.abcjs-v1"), sb = staffB ? staffB.getBBox() : { y: H - 40, height: 0 };
    var fy = Math.max(sb.y + sb.height, bh.cy + 10) + 26, alt = altered(c), fx = bh.x + bh.w / 2;
    c.figs.forEach(function (f, k) {
      var k2 = c.notes.findIndex(function (nt, i) { return i > 0 && nt.d - bass.d + 1 === f; });
      var written = c.short.indexOf(f) >= 0, a = alt[f];
      var txt = (a || "") + (written || (a && f !== 3) ? String(f) : "");   // an accidental alone means the 3rd
      s.appendChild(svg("text", { x: fx, y: fy + k * 22, class: "fbx-fig " + MCLASS[c.notes[k2].m] + (written || a ? "" : " fbx-implied"), "data-k": k2, "text-anchor": "middle" },
        written || a ? txt : "(" + f + ")"));
    });
    s.appendChild(svg("text", { x: right + 30, y: fy, class: "fbx-cap" }, "solid: written"));
    s.appendChild(svg("text", { x: right + 30, y: fy + 16, class: "fbx-cap" }, "(faint): understood"));
    var newH = fy + (c.figs.length - 1) * 22 + 12, newW = Math.max(W, right + 22 + c.notes.length * 26 + 10);
    s.setAttribute("viewBox", "0 0 " + newW + " " + newH); s.removeAttribute("width"); s.removeAttribute("height"); s.removeAttribute("style"); host.style.height = ""; host.style.overflow = ""; s.setAttribute("class", (s.getAttribute("class") || "") + " fbx-svg");
    s.setAttribute("role", "img"); s.setAttribute("aria-label", c.rn + " in " + c.keyLabel + ": the chord on a grand staff with its figures");
  }
  // figure numbers whose note is outside the key signature: the accidental a Baroque bass would carry
  function altered(c) {
    var out = {}, b = c.notes[0];
    c.notes.slice(1).forEach(function (nt) { if (nt.a !== c.sig[mod(nt.d, 7)]) out[nt.d - b.d + 1] = ACC[nt.a]; });
    return out;
  }

  // ---- sound
  var snd = null;
  function sound() {
    if (snd) return snd;
    snd = new Promise(function (res, rej) {
      function go() {
        var ac = new (global.AudioContext || global.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
        if (global.AudioTap) try { global.AudioTap.register(ac, out, "Figured bass explorer"); } catch (e) {}
        var bank = global.BandSounds.create(ac); bank.load(["piano"]).then(function () { res({ ac: ac, bank: bank, out: out }); }, rej);
      }
      if (global.BandSounds) return go();
      var sc = document.createElement("script"); sc.src = "/apps/shared/band/sounds.js?v=15"; sc.onload = go; sc.onerror = function () { snd = null; rej(); }; document.head.appendChild(sc);
    });
    return snd;
  }
  function play(ms, spread) {
    sound().then(function (b) {
      b.ac.resume(); var t = b.ac.currentTime + 0.05;
      ms.forEach(function (m, i) { b.bank.play("piano", { midi: m, vel: 0.7, dur: spread ? 2.2 - i * 0.45 : 1.6 }, t + (spread ? i * 0.45 : 0), b.out); });
      if (spread) ms.forEach(function (m) { b.bank.play("piano", { midi: m, vel: 0.6, dur: 1.6 }, t + ms.length * 0.45 + 0.3, b.out); });
    }).catch(function () {});
  }

  // ---- the explanation
  function explain(c, box, mark) {
    box.innerHTML = "";
    var b = c.notes[0], head = el("div", "fbx-head1");
    var big = /\d\d$/.test(c.rn) ? c.rn.replace(/(\d)(\d)$/, "<span class='fbx-stack'><span>$1</span><span>$2</span></span>") : c.rn.replace(/(\d)$/, "<sup>$1</sup>");
    head.innerHTML = "<span class='fbx-big'>" + big + "</span>" +
      " <span class='fbx-sub'>in " + c.keyLabel + " · " + c.slash + " · " + c.sym + "</span>";
    box.appendChild(head);
    var shortTxt = c.short.length ? c.short.join("/") : "nothing", fullTxt = c.figs.join("/");
    box.appendChild(el("p", "fbx-p", INV_NAME[c.inv] + ": the bass, " + nm(b) + ", is the chord's " + MEMBER[b.m] + ". " +
      "Figures count up from the bass, never from the root. Written: " + shortTxt + (shortTxt !== fullTxt ? " (short for " + fullTxt + ")" : "") + "." +
      (b.raised ? " The bass, " + nm(b) + ", is the raised leading tone: the accidental goes on the bass note itself; the figures only describe the notes above it." : "")));
    var ul = el("ul", "fbx-list");
    c.notes.slice(1).sort(function (p, q) { return q.d - p.d; }).forEach(function (nt) {
      var k = c.notes.indexOf(nt), iv = nt.d - b.d + 1, run = letterRun(b, nt), written = c.short.indexOf(iv) >= 0;
      var li = el("li", "fbx-item " + MCLASS[nt.m]); li.setAttribute("data-k", k); li.tabIndex = 0;
      li.innerHTML = "<span class='fbx-chip'>" + iv + "</span> <b>a " + ORD[iv] + " above " + nm(b) + "</b>: " + run.join(" ") +
        " (" + run.length + " letters) lands on <b>" + nm(nt) + "</b>, the chord's <b>" + MEMBER[nt.m] + "</b>." +
        (written ? "" : " <span class='fbx-muted'>Not written: understood.</span>") +
        (nt.raised ? " <span class='fbx-muted'>" + nm(nt) + " is the raised leading tone, outside the key signature: a Baroque figure marks it " + (iv === 3 && !written ? "with the accidental alone (" + ACC[nt.a] + ")" : ACC[nt.a] + iv) + ". Roman-numeral analysis leaves it out.</span>" : "");
      li.addEventListener("mouseenter", function () { mark(k); }); li.addEventListener("focus", function () { mark(k); });
      li.addEventListener("mouseleave", function () { mark(-1); }); li.addEventListener("blur", function () { mark(-1); });
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var why = el("p", "fbx-p");
    var lowest = c.notes.slice(1).filter(function (nt) { return nt.m === 0; })[0];
    why.innerHTML = c.inv === 0 ? "The root is in the bass, so every note is a 3rd, 5th" + (c.size === 4 ? " or 7th" : "") + " above it. " +
      (c.size === 3 ? "A root-position triad is 5/3, and is normally left unfigured." : "Only the 7 is written; it tells a seventh chord from a triad.")
      : "Where is the root? It is the note a <b>" + ORD[lowest.d - b.d + 1] + "</b> above the bass (" + nm(lowest) + "). " + {
        "3-1": "The 6 is what gives first inversion away: in root position there would be a 5th, not a 6th, above the bass.",
        "3-2": "The 4 is the giveaway: a 4th above the bass only happens when the bass is the 5th. That is why “six-four” means second inversion.",
        "4-1": "The 5 here is the 7th of the chord, and the 6 is the root. Six-five = first inversion of a seventh chord.",
        "4-2": "The 3 above the bass is the 7th of the chord, and the 4 is the root. Four-three = second inversion of a seventh chord.",
        "4-3": "The 2 is the root, a step above the 7th in the bass. Four-two (sometimes just 2) = third inversion."
      }[c.size + "-" + c.inv];
    box.appendChild(why);
    if (c.size === 3 && c.inv === 2) {
      var sf = el("p", "fbx-p fbx-note64");
      sf.innerHTML = "Six-four chords are special: classical composers use them in only four situations (16.4): " +
        "<a href='#the-cadential-six-four-chord'>cadential</a>, <a href='#other-six-four-chords'>passing, pedal</a>, and in a melodic bass line.";
      box.appendChild(sf);
    }
  }

  function Explorer(host) {
    var st = {
      mode: host.getAttribute("data-mode") || "major", key: 0, chord: +(host.getAttribute("data-chord") || 0),
      seventh: host.getAttribute("data-seventh") === "1", inv: +(host.getAttribute("data-inv") || 0), hl: -1
    };
    var wantKey = host.getAttribute("data-key");
    if (wantKey) { var ki = (st.mode === "major" ? MAJ_KEYS : MIN_KEYS).findIndex(function (k) { return k[0] === wantKey; }); if (ki >= 0) st.key = ki; }
    host.innerHTML = "";
    var ctl = el("div", "fbx-ctl"), body = el("div", "fbx-body"), stage = el("div", "fbx-stage"), notes = el("div", "fbx-explain");
    body.appendChild(stage); body.appendChild(notes); host.appendChild(ctl); host.appendChild(body);
    function group(label) { var g = el("div", "fbx-group"); g.appendChild(el("span", "fbx-label", label)); ctl.appendChild(g); return g; }
    var gKey = group("Key"), keySel = el("select", "form-select form-select-sm fbx-sel"), modeSel = el("select", "form-select form-select-sm fbx-sel");
    ["major", "minor"].forEach(function (m) { var o = el("option", "", m); o.value = m; modeSel.appendChild(o); });
    gKey.appendChild(keySel); gKey.appendChild(modeSel);
    var gChord = group("Chord"), chordBox = el("div", "fbx-btns"); gChord.appendChild(chordBox);
    var gKind = group("Type"), kindBox = el("div", "fbx-btns"); gKind.appendChild(kindBox);
    var gInv = group("Bass note"), invBox = el("div", "fbx-btns"); gInv.appendChild(invBox);
    var gPlay = group("Hear it"), pBox = el("div", "fbx-btns"); gPlay.appendChild(pBox);
    var p1 = el("button", "btn btn-outline-secondary btn-sm", "▶ Chord"), p2 = el("button", "btn btn-outline-secondary btn-sm", "▶ Bass up, then together");
    p1.type = p2.type = "button"; pBox.appendChild(p1); pBox.appendChild(p2);
    var cur = null;
    p1.addEventListener("click", function () { play(cur.notes.map(midi), false); });
    p2.addEventListener("click", function () { play(cur.notes.map(midi), true); });
    keySel.addEventListener("change", function () { st.key = +keySel.value; draw(); });
    modeSel.addEventListener("change", function () {
      var old = (st.mode === "major" ? MAJ_KEYS : MIN_KEYS)[st.key][0];
      st.mode = modeSel.value; var list = st.mode === "major" ? MAJ_KEYS : MIN_KEYS, j = list.findIndex(function (k) { return k[0] === old; });
      st.key = j >= 0 ? j : 0; st.chord = Math.min(st.chord, CHORDS[st.mode].length - 1); draw();
    });
    function btn(box, text, on, fn, title) { var b = el("button", "btn btn-sm " + (on ? "btn-primary" : "btn-outline-secondary")); b.type = "button"; b.innerHTML = text; if (title) b.title = title; b.setAttribute("aria-pressed", on ? "true" : "false"); b.addEventListener("click", fn); box.appendChild(b); }
    function hookStaff() {
      [].forEach.call(stage.querySelectorAll("[data-k]"), function (g) {
        g.addEventListener("mouseenter", function () { mark(+g.getAttribute("data-k")); });
        g.addEventListener("mouseleave", function () { mark(-1); });
      });
    }
    function mark(k) {   // highlight without redrawing (so mouse events keep their targets)
      [].forEach.call(host.querySelectorAll("[data-k]"), function (e) { e.classList.toggle("fbx-hl", +e.getAttribute("data-k") === k); });
    }
    function draw() {
      var list = st.mode === "major" ? MAJ_KEYS : MIN_KEYS;
      keySel.innerHTML = ""; list.forEach(function (k, i) { var o = el("option", "", (st.mode === "major" ? k[0] : k[0].toLowerCase()) + " " + st.mode); o.value = i; keySel.appendChild(o); });
      keySel.value = st.key; modeSel.value = st.mode;
      chordBox.innerHTML = "";
      CHORDS[st.mode].forEach(function (ch, i) {
        var c = build(Object.assign({}, st, { chord: i, inv: 0 }));
        btn(chordBox, c.rn.replace(/7$/, "<sup>7</sup>"), i === st.chord, function () { st.chord = i; draw(); }, c.sym);
      });
      kindBox.innerHTML = "";
      btn(kindBox, "Triad", !st.seventh, function () { st.seventh = false; st.inv = Math.min(st.inv, 2); draw(); });
      btn(kindBox, "Seventh chord", st.seventh, function () { st.seventh = true; draw(); });
      invBox.innerHTML = "";
      var figs = st.seventh ? ["7", "6/5", "4/3", "4/2"] : ["5/3", "6", "6/4"];
      figs.forEach(function (f, i) { btn(invBox, MEMBER[i] + " <span class='fbx-figbtn'>" + f + "</span>", st.inv === i, function () { st.inv = i; draw(); }, INV_NAME[i]); });
      cur = build(st);
      drawStaff(cur, stage); hookStaff();
      explain(cur, notes, mark);
      host.setAttribute("data-rn", cur.rn); host.setAttribute("data-sym", cur.sym);
    }
    draw();
    host._fbx = { state: st, chord: function () { return cur; }, redraw: draw };
  }

  var css = ".fbx-ctl{display:flex;flex-wrap:wrap;gap:.6rem 1.2rem;margin:.5rem 0 .8rem}.fbx-group{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}" +
    ".fbx-label{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;opacity:.7;margin-right:.2rem}.fbx-btns{display:flex;flex-wrap:wrap;gap:.25rem}" +
    ".fbx-sel{width:auto;display:inline-block}.fbx-figbtn{font-variant-numeric:tabular-nums;opacity:.8;margin-left:.15rem}" +
    ".fbx-body{display:grid;grid-template-columns:minmax(260px,1fr) minmax(260px,1fr);gap:1rem;align-items:start}@media(max-width:760px){.fbx-body{grid-template-columns:1fr}}" +
    ".fbx-stage{border:1px solid var(--bs-border-color,#ddd);border-radius:8px;padding:.3rem}.fbx-svg{width:100%;max-width:520px;height:auto;display:block;margin:0 auto;color:var(--bs-body-color,#222)}" +
    ".fbx-svg text.fbx-brnum,.fbx-svg text.fbx-fig,.fbx-svg text.fbx-cap{stroke:none}.fbx-svg path.fbx-nh{fill:var(--fbx-c)}.fbx-svg path.fbx-nh.fbx-hl{stroke:var(--fbx-c);stroke-width:2.5}" +
    ".fbx-br .fbx-brline{fill:none;stroke:var(--fbx-c);stroke-width:2;opacity:.8}.fbx-brnum{font:600 14px system-ui,sans-serif;fill:var(--fbx-c)}" +
    ".fbx-fig{font:700 19px Georgia,serif;fill:var(--fbx-c)}.fbx-fig.fbx-implied{font-weight:400;opacity:.45;font-size:15px}.fbx-cap{font:11px system-ui,sans-serif;fill:currentColor;opacity:.6}" +
    ".fbx-hl .fbx-brline{stroke-width:4;opacity:1}.fbx-fig.fbx-hl{text-decoration:underline}" +
    ".fbx-r{--fbx-c:#d1495b}.fbx-3{--fbx-c:#2e86ab}.fbx-5{--fbx-c:#3c9d5d}.fbx-7{--fbx-c:#c77d0a}" +
    "[data-bs-theme=dark] .fbx-r,.quarto-dark .fbx-r{--fbx-c:#ff7b8a}[data-bs-theme=dark] .fbx-3,.quarto-dark .fbx-3{--fbx-c:#6cc4f0}[data-bs-theme=dark] .fbx-5,.quarto-dark .fbx-5{--fbx-c:#6fd18f}[data-bs-theme=dark] .fbx-7,.quarto-dark .fbx-7{--fbx-c:#f2b44a}" +
    ".fbx-head1{margin-bottom:.4rem}.fbx-big{font:700 1.7rem Georgia,serif}.fbx-big sup{font-size:.55em}.fbx-stack{display:inline-flex;flex-direction:column;font-size:.5em;line-height:1;vertical-align:middle;margin-left:.05em}.fbx-sub{opacity:.75}" +
    ".fbx-p{margin:.4rem 0}.fbx-list{list-style:none;padding:0;margin:.4rem 0}.fbx-item{padding:.35rem .5rem;border-left:4px solid var(--fbx-c);margin:.3rem 0;border-radius:4px;cursor:default}" +
    ".fbx-item:hover,.fbx-item:focus{background:color-mix(in srgb,var(--fbx-c) 12%,transparent);outline:none}.fbx-chip{display:inline-block;min-width:1.6em;text-align:center;font:700 1rem Georgia,serif;color:#fff;background:var(--fbx-c);border-radius:4px;padding:0 .3em}" +
    ".fbx-muted{opacity:.7;font-size:.92em}.fbx-note64{font-size:.95em;padding:.4rem .6rem;border-radius:6px;background:color-mix(in srgb,currentColor 6%,transparent)}";
  function init() {
    if (!document.getElementById("fbx-css")) { var s = el("style"); s.id = "fbx-css"; s.textContent = css; document.head.appendChild(s); }
    [].forEach.call(document.querySelectorAll(".fb-explorer"), function (h) { if (!h._fbx) Explorer(h); });
  }
  global.FBExplorer = { build: build, init: init, MAJ_KEYS: MAJ_KEYS, MIN_KEYS: MIN_KEYS, CHORDS: CHORDS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
