// piano-chord-songs.js — "Play a Song with 1, 2 or 3 Chords" (practice/piano-chord-songs.qmd, global PianoChordSongs).
// Kids get playing fast: pick how many chords you know, pick a song from the Tune Library that uses only that many,
// read its jam card and play along with the band.
//
// Songs: every tune in apps/tunes/tunes-object.js whose chord symbols name 1-3 different chords, less the ones tagged
//   needs-repair and the ones apps/tunes/tune-quality.js predicts are bad. Easiest first: fewest chord changes a bar,
//   plain triads before sevenths, then title.
// Key: "Easy" (default) moves a major tune to C and a minor one to A minor (AbcTranspose), so the chords sit near the
//   white keys; modal tunes stay as written. Other choices: as written, G / E minor, F / D minor.
// Jam card: the Chord Sheet's superimposed keyboard view (tools/chord-sheet.html?embed=super in a frame; one lane per
//   chord over one row of keys, each chord a voice-led inversion of the one before, after the Music Will jam cards),
//   piano, Standard voicing. While the band plays, the chord sounding now and the next one are coloured
//   (now / next from the bar BandPlayer reports: info.src indexes TuneChart.parse(abc).bars). The card (Chord Sheet "JAM CARD")
//   puts the chord now on the keys, the rest in lanes; posted only when now / next change. Frame at 60% width.
// Playback: AbcPlay with the tune's chords on the band (opts.abc), "Hear" melody + band / band only / melody only,
//   tempo slider (starts at 75% of the tune's Q:, slower for beginners).
(function (global) {
  "use strict";
  var LEVEL_KEY = "pcs-level", KEY_KEY = "pcs-key", el = {}, songs = [], cur = null, playing = null, frame = null, frameReady = false, pending = null, lastCard = null;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ---- the songs ----
  function bodyOf(t) { return t.split("\n").filter(function (l) { return !/^\s*(%|[A-Za-z]:)/.test(l); }).join("\n"); }
  // a chord symbol, not a note string imported into quotes (I've Found a New Baby, F.W.S.)
  var CHORD = /^[A-G][#b]?[A-Za-z0-9#b+°ø()\-]{0,9}(\/[A-G][#b]?)?$/;
  function chordsIn(t) {
    var out = [], m, re = /"([A-G][^"]*)"/g, b = bodyOf(t);
    while ((m = re.exec(b))) { var s = m[1].trim(); if (!CHORD.test(s)) continue; if (out.indexOf(s) < 0) out.push(s); }
    return out;
  }
  function collect() {
    var src = (typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject) || {}, q = global.TUNE_QUALITY || {}, seen = {};
    Object.keys(src).forEach(function (set) {
      src[set].split(/\n(?=X:)/).forEach(function (t) {
        if (!/^X:/m.test(t)) return;
        var id = (/^%%id\s+(\S+)/m.exec(t) || [])[1], tags = (/^%%tags\s+(.+)$/m.exec(t) || [])[1] || "";
        if (!id || seen[id] || /needs-repair/.test(tags) || q[id]) return;
        var ch = chordsIn(t); if (ch.length < 1 || ch.length > 3) return;
        var body = bodyOf(t), bars = body.split(/\|+/).filter(function (s) { return /[A-Ga-gz]/.test(s.replace(/"[^"]*"/g, "")); }).length || 1;
        var changes = (body.match(/"[A-G][^"]*"/g) || []).length;
        seen[id] = 1;
        songs.push({ id: id, set: set, abc: t.trim(), title: ((/^T:(.*)$/m.exec(t) || [])[1] || id).trim(), chords: ch, n: ch.length,
          busy: changes / bars, sevenths: ch.some(function (c) { return /\d|dim|aug|sus|\//.test(c); }),
          key: ((/^K:\s*(\S+)/m.exec(t) || [])[1] || "C") });
      });
    });
    songs.sort(function (a, b) { return (a.sevenths - b.sevenths) || (a.busy - b.busy) || a.title.localeCompare(b.title); });
  }

  // ---- key ----
  var MINOR = /^[A-G][#b]?(m|min|minor|aeo|aeolian)$/i, MAJOR = /^[A-G][#b]?(maj|major|ion|ionian)?$/i;
  var KEYS = { easy: ["C", "A"], g: ["G", "E"], f: ["F", "D"] };
  function keyed(s) {
    var k = el.key.value; if (k === "asis" || !global.AbcTranspose) return s.abc;
    var key = s.key.replace(/clef=.*/, ""), pair = KEYS[k] || KEYS.easy, tgt = MINOR.test(key) ? pair[1] : MAJOR.test(key) ? pair[0] : null;
    if (!tgt) return s.abc;
    try { return AbcTranspose.transpose(s.abc, tgt); } catch (e) { return s.abc; }
  }

  // ---- list ----
  function renderList() {
    var lv = +el.level.querySelector(".pcs-on").dataset.n, f = el.find.value.trim().toLowerCase();
    var list = songs.filter(function (s) { return s.n === lv && (!f || s.title.toLowerCase().indexOf(f) >= 0); });
    el.count.textContent = list.length + " song" + (list.length === 1 ? "" : "s");
    el.list.innerHTML = list.map(function (s) {
      var show = chordsIn(keyed(s));
      return '<button class="pcs-song' + (cur && cur.id === s.id ? " pcs-sel" : "") + '" data-id="' + esc(s.id) + '"><b>' + esc(s.title) + "</b>" +
        '<span class="pcs-chips">' + show.map(function (c) { return "<i>" + esc(c) + "</i>"; }).join("") + "</span></button>";
    }).join("") || '<p class="pcs-none">No songs match.</p>';
  }

  // ---- one song ----
  function choose(id) {
    stop();
    var s = songs.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    var abc = keyed(s);
    cur = { id: id, song: s, abc: abc, chords: chordsIn(abc), parsed: null };
    try { cur.parsed = global.TuneChart ? TuneChart.parse(abc) : null; } catch (e) {}
    el.title.textContent = s.title;
    el.song.hidden = false;
    el.chordsBig.innerHTML = cur.chords.map(function (c) { return '<span class="pcs-big" data-c="' + esc(c) + '">' + esc(c) + "</span>"; }).join("");
    try { cur.v = ABCJS.renderAbc(el.score, abc, { responsive: "resize", add_classes: true, staffwidth: 720 })[0]; } catch (e) { el.score.textContent = "Notation unavailable"; }
    var t = cur.v && cur.v.metaText && cur.v.metaText.tempo, qpm = t && t.bpm ? t.bpm * (t.duration && t.duration[0] ? t.duration[0] * 4 : 1) : 100;
    el.bpm.value = Math.max(40, Math.round(qpm * 0.75)); el.bpmOut.textContent = el.bpm.value;
    el.tunes.href = "/practice/tunes.html?tune=" + encodeURIComponent(id);
    Walk.reset();
    postCard(null, null);
    [].forEach.call(el.list.querySelectorAll(".pcs-song"), function (b) { b.classList.toggle("pcs-sel", b.dataset.id === id); });
    if (window.innerWidth < 900) el.song.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- jam card (the Chord Sheet's superimposed keyboard, in a frame) ----
  function postCard(now, next) {
    if (!cur) return;
    var msg = { type: "super-embed", chords: cur.cardChords || cur.chords, comp: "piano", voicing: "standard", now: now, next: next };
    var sig = JSON.stringify(msg); if (sig === lastCard) return; lastCard = sig;   // onBar fires every bar: post only changes
    if (!frameReady) { pending = msg; return; }
    frame.contentWindow.postMessage(msg, location.origin);
  }
  function mountFrame() {
    frame = document.createElement("iframe");
    frame.src = "/tools/chord-sheet.html?embed=super"; frame.title = "Jam card"; frame.className = "pcs-frame";
    el.card.appendChild(frame);
    global.addEventListener("message", function (e) {
      if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data) return;
      if (e.data.type === "super-embed-ready") { frameReady = true; lastCard = null; if (pending) { frame.contentWindow.postMessage(pending, location.origin); pending = null; } }
      if (e.data.type === "super-embed-size" && e.data.h > 0) frame.style.height = e.data.h + "px";
    });
  }
  function nowNext(src) {
    var bars = cur && cur.parsed && cur.parsed.bars; if (!bars || !bars[src]) return null;
    var last = null;
    for (var i = src; i >= 0 && !last; i--) if (bars[i].chords.length) last = bars[i].chords[0].sym;
    var cs = bars[src].chords, now = cs.length ? cs[0].sym : last, next = null;
    for (var j = 1; j < cs.length && !next; j++) if (cs[j].sym !== now) next = cs[j].sym;
    for (var k = src + 1; k < bars.length && !next; k++) bars[k].chords.forEach(function (c) { if (!next && c.sym !== now) next = c.sym; });
    return { now: now, next: next };
  }
  function light(nn) {
    [].forEach.call(el.chordsBig.children, function (x) {
      x.classList.toggle("pcs-now", !!nn && x.dataset.c === nn.now);
      x.classList.toggle("pcs-next", !!nn && x.dataset.c === nn.next && nn.next !== nn.now);
    });
    postCard(nn ? nn.now : null, nn ? nn.next : null);
  }

  // ---- play ----
  function stop() { if (playing) { var p = playing; playing = null; p.stop(); } el.play && (el.play.textContent = "▶ Play"); if (cur) light(null); }
  function play() {
    if (playing) { stop(); return; }
    Walk.halt();
    if (!cur || !cur.v || !global.AbcPlay) return;
    var h = el.hear.value, opts = { sound: "piano", qpm: +el.bpm.value,
      onBar: function (info) { if (info.countIn) return; var nn = nowNext(info.src); if (nn) light(nn); },
      onEnd: function () { if (playing === me) { playing = null; el.play.textContent = "▶ Play"; light(null); } } };
    if (h !== "melody") { opts.abc = cur.abc; opts.style = el.style.value || "pop"; if (h === "band") opts.melody = false; }
    var me = AbcPlay.play(cur.v, opts);
    playing = me; el.play.textContent = "■ Stop";
  }

  function mount(root) {
    root.innerHTML =
      '<div class="pcs-levels" role="group" aria-label="How many chords">' +
        [1, 2, 3].map(function (n) { return '<button data-n="' + n + '">' + n + " chord" + (n > 1 ? "s" : "") + "</button>"; }).join("") + "</div>" +
      '<div class="pcs-tools"><label>Key <select class="pcs-key"><option value="easy">Easy: C or A minor</option><option value="g">G or E minor</option>' +
        '<option value="f">F or D minor</option><option value="asis">As written</option></select></label>' +
        '<label>Find <input class="pcs-find" type="search" placeholder="song title"></label><span class="pcs-count"></span></div>' +
      '<div class="pcs-cols"><div class="pcs-list"></div>' +
      '<div class="pcs-song-box" hidden><h3 class="pcs-title"></h3><div class="pcs-chords"></div>' +
        '<div class="pcs-card"></div>' +
        '<div class="pcs-bar"><button class="pcs-play">▶ Play</button>' +
          '<label>Hear <select class="pcs-hear"><option value="both">Tune + band</option><option value="band">Band only (you play the tune)</option><option value="melody">Tune only</option></select></label>' +
          '<label>Band <select class="pcs-style"><option value="pop">Pop</option></select></label>' +
          '<label>Speed <input class="pcs-bpm" type="range" min="40" max="160" step="2"> <output class="pcs-bpm-out"></output></label>' +
          '<a class="pcs-tunes" target="_self">Open in Tunes</a></div>' +
        '<details class="pcs-walk" open><summary>Step by step</summary>' +
          '<div class="pcs-wtabs"><button data-m="chords" class="pcs-on">1. Learn the chords</button><button data-m="tune">2. Learn the tune</button>' +
          '<label class="pcs-wlen">Piece size <select><option value="1">1 bar</option><option value="2" selected>2 bars</option><option value="4">4 bars</option></select></label></div>' +
          '<div class="pcs-wstep"></div>' +
          '<div class="pcs-wnav"><button class="pcs-wback">◀ Back</button><span class="pcs-wcount"></span><button class="pcs-wnext">Next ▶</button></div></details>' +
        '<h4 class="pcs-whole">The whole song</h4><div class="pcs-score site-paper"></div></div></div>';
    var q = function (c) { return root.querySelector(c); };
    el = { level: q(".pcs-levels"), key: q(".pcs-key"), find: q(".pcs-find"), count: q(".pcs-count"), list: q(".pcs-list"), song: q(".pcs-song-box"),
      title: q(".pcs-title"), chordsBig: q(".pcs-chords"), card: q(".pcs-card"), play: q(".pcs-play"), hear: q(".pcs-hear"), style: q(".pcs-style"),
      bpm: q(".pcs-bpm"), bpmOut: q(".pcs-bpm-out"), score: q(".pcs-score"), tunes: q(".pcs-tunes") };
    collect();
    var lv = ls.get(LEVEL_KEY) || "1", kv = ls.get(KEY_KEY);
    if (kv && el.key.querySelector('option[value="' + kv + '"]')) el.key.value = kv;
    [].forEach.call(el.level.children, function (b) {
      b.classList.toggle("pcs-on", b.dataset.n === lv);
      b.addEventListener("click", function () { [].forEach.call(el.level.children, function (x) { x.classList.toggle("pcs-on", x === b); }); ls.set(LEVEL_KEY, b.dataset.n); renderList(); });
    });
    el.key.addEventListener("change", function () { ls.set(KEY_KEY, el.key.value); renderList(); if (cur) choose(cur.id); });
    el.find.addEventListener("input", renderList);
    el.list.addEventListener("click", function (e) { var b = e.target.closest(".pcs-song"); if (b) choose(b.dataset.id); });
    el.play.addEventListener("click", play);
    el.bpm.addEventListener("input", function () { el.bpmOut.textContent = el.bpm.value; });
    el.bpm.addEventListener("change", function () { if (playing) { stop(); play(); } });
    if (global.AbcPlay && AbcPlay.load) AbcPlay.load().then(function () {
      if (!global.BandCatalog) return; el.style.innerHTML = "";
      BandCatalog.styles.forEach(function (s) { var o = document.createElement("option"); o.value = s.id; o.textContent = s.label; el.style.appendChild(o); });
      el.style.value = "pop";
      if (cur && !cur.parsed && global.TuneChart) try { cur.parsed = TuneChart.parse(cur.abc); } catch (e) {}
    }).catch(function () {});
    Walk.mount(root);
    mountFrame();
    renderList();
    var first = new URLSearchParams(location.search).get("tune"), pick = first && songs.filter(function (s) { return s.id === first; })[0];
    if (pick) { [].forEach.call(el.level.children, function (x) { x.classList.toggle("pcs-on", +x.dataset.n === pick.n); }); renderList(); choose(pick.id); }
  }


  // ===== WALK-THROUGH =====
  // "Learn the chords": one step per chord in the order the song first uses it. The jam card shows the chords learned so far
  //   (cur.cardChords), the newest one lit as "now"; ▶ Practise plays a made-up chart on the band (chords only, no tune):
  //   a new chord alone for 4 bars, then 2 bars each of it and the chord before it, back and forth. Last step: the whole song,
  //   band only, the child plays the chords.
  // "Learn the tune": the song cut into pieces of 1 / 2 / 4 bars (bars read off the ABC text: repeat signs and ending numbers
  //   dropped, so a repeated part is learned once). Each piece is drawn with finger numbers (ABC !1!..!5!) and can be heard alone
  //   or with the band; the last step puts all the pieces together.
  // FINGERING is this site's rule of thumb, unverified against any method book: right hand, five-finger positions. Notes are taken
  //   as staff steps (abcjs pitch, so C and C# share a step); a position covers 5 steps, the thumb on the lowest; a new position
  //   starts when the next note no longer fits with the ones before it, and its first note says "move your hand". A tied note keeps its finger.
  var Walk = (function () {
    var w = {}, mode = "chords", at = 0, live = null;
    function header(abc) { return abc.split("\n").filter(function (l) { return /^\s*([A-Za-z]:|%%)/.test(l) && !/^\s*[wW]:/.test(l); }); }
    function bars(abc) {
      var body = abc.split("\n").filter(function (l) { return !/^\s*(%|[A-Za-z]:)/.test(l); }).join(" ").replace(/\$/g, " ");
      return body.split(/\[?\|+\]?|:+\|*|\|*:+/).map(function (b) { return b.replace(/^\s*\[?[0-9][0-9,.-]*/, "").trim(); })
        .filter(function (b) { return /[A-Ga-gz]/.test(b.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, "")); });
    }
    function frag(abc, list) {
      var h = header(abc), k = h.filter(function (l) { return /^\s*K:/.test(l); })[0] || "K:C";
      return h.filter(function (l) { return !/^\s*[KT]:/.test(l); }).concat([k, list.join(" | ") + " |]"]).join("\n");
    }
    function skipWs(t, i) { while (i < t.length && /\s/.test(t[i])) i++; return i; }
    function fingered(abc, host) {
      var v; try { v = ABCJS.renderAbc(host, abc, { add_classes: true })[0]; } catch (e) { return { abc: abc, moves: 0 }; }
      var notes = [];
      (v.lines || []).forEach(function (ln) { (ln.staff || []).forEach(function (st) { (st.voices || []).forEach(function (vo) { vo.forEach(function (e) {
        if (e.el_type === "note" && !e.rest && e.pitches && e.pitches.length) notes.push({ p: e.pitches[e.pitches.length - 1].pitch, at: skipWs(abc, e.startChar), tie: e.pitches.some(function (x) { return x.endTie; }) });
      }); }); }); });
      var lo = null, hi = null, moves = 0;
      notes.forEach(function (n, i) {
        if (n.tie && i) { n.f = notes[i - 1].f; return; }
        if (lo == null || Math.max(hi, n.p) - Math.min(lo, n.p) > 4) {   // a new five-finger position: from here, as far as the next notes fit
          lo = hi = n.p; for (var j = i + 1; j < notes.length; j++) { var a = Math.min(lo, notes[j].p), b = Math.max(hi, notes[j].p); if (b - a > 4) break; lo = a; hi = b; }
          if (i) { n.move = true; moves++; }
        } else { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); }
        n.f = n.p - lo + 1;
      });
      var out = abc; notes.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (n) {
        if (n.f >= 1 && n.f <= 5) out = out.slice(0, n.at) + (n.move ? '"_move"' : "") + "!" + n.f + "!" + out.slice(n.at);
      });
      return { abc: out, moves: moves };
    }
    function steps() {
      if (!cur) return [];
      if (mode === "chords") return cur.chords.map(function (c, i) { return { kind: "chord", i: i }; }).concat([{ kind: "chords-song" }]);
      var b = bars(cur.abc), n = +w.len.value, out = [];
      for (var i = 0; i < b.length; i += n) out.push({ kind: "piece", from: i, bars: b.slice(i, i + n), of: b.length });
      if (out.length > 1) out.push({ kind: "piece", from: 0, bars: b, of: b.length, all: true });
      return out;
    }
    function halt() { if (live) { var p = live; live = null; p.stop(); } [].forEach.call(w.step.querySelectorAll(".pcs-wplay"), function (b) { b.textContent = b.dataset.label; }); }
    function playV(v, opts, btn) {
      if (live) { var was = live._btn; halt(); if (was === btn) return; }
      if (playing) stop();
      opts.onEnd = function () { if (live === me) { live = null; btn.textContent = btn.dataset.label; } };
      var me = AbcPlay.play(v, opts); me._btn = btn; live = me; btn.textContent = "■ Stop";
    }
    function button(label, fn) { var b = document.createElement("button"); b.className = "pcs-wplay"; b.dataset.label = label; b.textContent = label; b.addEventListener("click", function () { fn(b); }); return b; }
    function drill(i) {   // a made-up chart: the new chord, then back and forth with the one before
      var c = cur.chords[i], p = i ? cur.chords[i - 1] : null, seq = [c, c, c, c];
      if (p) seq = seq.concat([p, p, c, c, p, p, c, c, p, c, p, c]);
      var abc = "X:1\nM:4/4\nL:1/4\nQ:1/4=" + el.bpm.value + "\nK:C\n" + seq.map(function (x) { return '"' + x + '"z4'; }).join(" | ") + " |]";
      return abc;
    }
    function show() {
      halt();
      var list = steps(); at = Math.max(0, Math.min(at, list.length - 1));
      var st = list[at], box = w.step; box.innerHTML = "";
      w.count.textContent = list.length ? "Step " + (at + 1) + " of " + list.length : "";
      w.back.disabled = at <= 0; w.next.disabled = at >= list.length - 1;
      if (!st) { cur.cardChords = null; return; }
      var p = function (html) { var d = document.createElement("p"); d.innerHTML = html; box.appendChild(d); return d; };
      var row = document.createElement("div"); row.className = "pcs-wrow";
      if (st.kind === "chord") {
        var c = cur.chords[st.i];
        cur.cardChords = cur.chords.slice(0, st.i + 1); postCard(c, st.i ? cur.chords[st.i - 1] : null);
        p('<span class="pcs-big pcs-now">' + esc(c) + "</span> " + (st.i === 0 ? "Your first chord. Find its row on the jam card above and put your right hand on the dots. Click the row to hear it."
          : "New chord. Find it on the jam card (green). Look at which fingers move from <b>" + esc(cur.chords[st.i - 1]) + "</b> (orange) and which stay."));
        p(st.i === 0 ? "Press ▶ Practise and play the chord on each beat, then once a bar." : "▶ Practise: four bars of " + esc(c) + ", then two bars each, back and forth with " + esc(cur.chords[st.i - 1]) + ", then one bar each.");
        row.appendChild(button("▶ Practise", function (b) { var h = document.createElement("div"); h.style.display = "none"; document.body.appendChild(h);
          var abc = drill(st.i), v = ABCJS.renderAbc(h, abc)[0]; h.remove(); playV(v, { abc: abc, style: el.style.value || "pop", melody: false, qpm: +el.bpm.value, light: false }, b); }));
      } else if (st.kind === "chords-song") {
        cur.cardChords = null; postCard(null, null);
        p("All the chords together. Press ▶ Play the song: the band plays, you play the chords. Keep your hand on the green chord; orange is coming next.");
        row.appendChild(button("▶ Play the song (band only)", function (b) { playV(cur.v, { abc: cur.abc, style: el.style.value || "pop", melody: false, qpm: +el.bpm.value,
          onBar: function (info) { if (info.countIn) return; var nn = nowNext(info.src); if (nn) light(nn); } }, b); }));
      } else {
        cur.cardChords = null; postCard(null, null);
        var f = frag(cur.abc, st.bars), paper = document.createElement("div"); paper.className = "pcs-wscore site-paper";
        p(st.all ? "<b>All the pieces together.</b> Play the whole tune with the finger numbers." :
          "<b>Bars " + (st.from + 1) + (st.bars.length > 1 ? "–" + (st.from + st.bars.length) : "") + "</b> of " + st.of + ". Right hand: the numbers are fingers (1 = thumb, 5 = little finger). Listen, then copy it.");
        box.appendChild(paper);
        var fg = fingered(f, paper), v;
        try { v = ABCJS.renderAbc(paper, fg.abc, { responsive: "resize", add_classes: true, staffwidth: st.all ? 720 : 360 })[0]; } catch (e) {}
        if (fg.moves) p("<i>“move”</i> = lift your hand to a new place: put the finger shown on that note.");
        if (v) {
          row.appendChild(button("▶ Hear it", function (b) { playV(v, { sound: "piano", qpm: +el.bpm.value }, b); }));
          if (/"[A-G]/.test(f)) row.appendChild(button("▶ With the band", function (b) { playV(v, { abc: fg.abc, style: el.style.value || "pop", qpm: +el.bpm.value }, b); }));
        }
      }
      box.appendChild(row);
    }
    w.mount = function (root) {
      w.root = root.querySelector(".pcs-walk"); w.step = root.querySelector(".pcs-wstep"); w.count = root.querySelector(".pcs-wcount");
      w.back = root.querySelector(".pcs-wback"); w.next = root.querySelector(".pcs-wnext"); w.len = root.querySelector(".pcs-wlen select"); w.tabs = root.querySelector(".pcs-wtabs");
      w.back.addEventListener("click", function () { at--; show(); });
      w.next.addEventListener("click", function () { at++; show(); });
      w.len.addEventListener("change", function () { at = 0; show(); });
      [].forEach.call(w.tabs.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { w.setMode(b.dataset.m); }); });
    };
    w.setMode = function (m) { mode = m; at = 0; [].forEach.call(w.tabs.querySelectorAll("button"), function (x) { x.classList.toggle("pcs-on", x.dataset.m === m); });
      w.len.parentNode.style.display = m === "tune" ? "" : "none"; show(); };
    w.reset = function () { if (w.step) w.setMode("chords"); };
    w.halt = halt; w.bars = bars; w.fingered = fingered;
    return w;
  })();

  global.PianoChordSongs = { walk: Walk, mount: mount, songs: function () { return songs; } };
})(window);
