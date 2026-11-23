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
          '<label class="pcs-wlen">Piece size <select><option value="1">1 bar</option><option value="2" selected>2 bars</option><option value="4">4 bars</option></select></label>' +
          '<label class="pcs-wsys">Fingering <select></select></label>' +
          '<label class="pcs-wread">Read <select><option value="notes">Notes on a staff</option><option value="keys">Fingers on the keys</option></select></label>' +
          '<label class="pcs-wview">Show <select><option value="all">All fingers</option><option value="marked">All, shifts marked</option><option value="shifts">Only shifts</option></select></label></div>' +
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
  // FINGERING: apps/shared/piano-fingering.js (global PianoFingering), worked out over the whole tune so a piece's fingers match
  //   the whole: "Fingering" menu = its SYSTEMS (Home position (default), Scale fingers, Five-finger positions, Least effort),
  //   localStorage pcs-finger-sys. Under each piece "Your fingers" takes typed finger numbers one a note, as words are typed on the
  //   Notation page (apps/shared/under-notes.js: spaces, * skips a note, | jumps to the next bar, "11445" = one digit a note);
  //   they replace the system's (Least effort solves the rest around them), kept per tune over the whole tune in localStorage
  //   pcs-fingers { tuneId: [finger | null by note] }. Show: all fingers, all with shifts (the finger last played another key: PianoFingering.shifts) bold orange, or only the shifts (and the first note); localStorage pcs-finger-view. Read: notes on a staff, or fingers on the keys (keysHtml: no notation; localStorage pcs-read). A tied note keeps its finger.
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
    var VIEW_KEY = "pcs-finger-view", view = ls.get(VIEW_KEY) || "marked";   // all | marked | shifts
    var SYS_KEY = "pcs-finger-sys", TYPED_KEY = "pcs-fingers", sys = ls.get(SYS_KEY) || "home";
    function typedAll() { try { return JSON.parse(ls.get(TYPED_KEY) || "{}") || {}; } catch (e) { return {}; } }
    function typed() { return (cur && typedAll()[cur.id]) || []; }
    function setTyped(arr) { var t = typedAll(); while (arr.length && arr[arr.length - 1] == null) arr.pop(); if (arr.length) t[cur.id] = arr; else delete t[cur.id]; ls.set(TYPED_KEY, JSON.stringify(t)); }
    function kLine() { return (header(cur.abc).filter(function (l) { return /^\s*K:/.test(l); })[0] || "K:C").trim(); }
    // the whole tune's fingers (bars as the pieces cut them), with the typed ones in
    function whole() {
      var body = bars(cur.abc).join(" | "), all = PianoFingering.notes(body, kLine()), fixed = {};
      typed().forEach(function (f, i) { if (f) fixed[i] = f; });
      var r = PianoFingering.finger(all, sys, { key: kLine(), fixed: fixed }), played = all.filter(function (n) { return !n.cont; });
      return { all: all, played: played, r: r };
    }
    // one piece (bars from .. from + count): its ABC with fingers, and where its notes sit in the whole tune
    function fingered(st) {
      var W = whole(), body = st.bars.join(" | "), all = PianoFingering.notes(body, kLine());
      var off = W.played.filter(function (n) { return n.bar < st.from; }).length, n = all.filter(function (x) { return !x.cont; }).length;
      var sub = { f: W.r.f.slice(off, off + n), move: W.r.move.slice(off, off + n) }; if (sub.move.length) sub.move[0] = false;
      var perBar = st.bars.map(function (b, i) { return all.filter(function (x) { return !x.cont && x.bar === i; }).length; });
      // shifts are judged over the whole tune, so a piece's first note can be one
      var sh = PianoFingering.shifts(W.played, W.r.f).slice(off, off + n), only = view === "shifts" ? sh.map(function (x, i) { return x || i === 0; }) : null;
      var played = all.filter(function (x) { return !x.cont; }), mids = W.played.map(function (x) { return x.midi; });
      return { abc: frag(cur.abc, [PianoFingering.write(body, all, sub, { only: only })]), shifts: sh, only: only, off: off, n: n, perBar: perBar,
        all: all, played: played, f: sub.f, lo: Math.min.apply(null, mids), hi: Math.max.apply(null, mids) };
    }
    // ---- notation-free reading: the piece's fingers drawn on the keys ----
    // Keys: the whole tune's range (so the hand finds the same keyboard on every piece), a white key either side. Each key the
    // piece plays carries its finger(s) (two when a finger shift gives it two, the shift one orange unless Show = All fingers);
    // under the keys the fingers in order, bar by bar. While it plays the sounding key and its number light up (read from the
    // hidden staff's abc-on, so it works with the band too).
    var KEY_READ = "pcs-read", read = ls.get(KEY_READ) || "notes";
    var isW = function (m) { return [0, 2, 4, 5, 7, 9, 11].indexOf(((m % 12) + 12) % 12) >= 0; };
    var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
    function keysHtml(fg) {
      var lo = fg.lo, hi = fg.hi; while (!isW(--lo)); while (!isW(++hi));
      var whites = []; for (var m = lo; m <= hi; m++) if (isW(m)) whites.push(m);
      var WW = 44, KH = 150, BH = 92, w = WW * whites.length, x = {}, svg = [];
      whites.forEach(function (m, i) { x[m] = i * WW; });
      var on = {}; fg.played.forEach(function (n, i) { var k = on[n.midi] = on[n.midi] || []; var sh = view !== "all" && fg.shifts[i];
        if (!k.some(function (q) { return q.f === fg.f[i]; })) k.push({ f: fg.f[i], sh: sh }); else if (sh) k.forEach(function (q) { if (q.f === fg.f[i]) q.sh = true; }); });
      var label = function (m, cx, top, black) {
        var k = on[m]; if (!k) return "";
        return k.map(function (q, j) { var cy = top - j * 30; return '<g class="pcs-kf' + (q.sh ? " pcs-kshift" : "") + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + (black ? 12 : 14) + '"/><text x="' + cx + '" y="' + (cy + 6) + '">' + q.f + "</text></g>"; }).join("");
      };
      whites.forEach(function (m) { svg.push('<rect class="pcs-kw' + (on[m] ? " pcs-kused" : "") + '" data-m="' + m + '" x="' + x[m] + '" y="0" width="' + WW + '" height="' + KH + '"/>' +
        '<text class="pcs-kname" x="' + (x[m] + WW / 2) + '" y="' + (KH - 6) + '">' + NAMES[m % 12] + "</text>"); });
      for (var b = lo; b <= hi; b++) if (!isW(b) && x[b - 1] != null) svg.push('<rect class="pcs-kb' + (on[b] ? " pcs-kused" : "") + '" data-m="' + b + '" x="' + (x[b - 1] + WW - 13) + '" y="0" width="26" height="' + BH + '"/>');
      whites.forEach(function (m) { svg.push(label(m, x[m] + WW / 2, KH - 36, false)); });
      for (var c = lo; c <= hi; c++) if (!isW(c) && x[c - 1] != null) svg.push(label(c, x[c - 1] + WW, BH - 20, true));
      var seq = fg.played.map(function (n, i) {
        var hide = view === "shifts" && !(i === 0 || fg.shifts[i]);
        return '<span class="pcs-sq' + (view !== "all" && fg.shifts[i] ? " pcs-kshift" : "") + '" data-i="' + i + '">' + (hide ? "·" : fg.f[i]) + "</span>" + (fg.played[i + 1] && fg.played[i + 1].bar !== n.bar ? '<span class="pcs-sbar">|</span>' : "");
      }).join("");
      return '<svg class="pcs-keys" viewBox="-1 -1 ' + (w + 2) + " " + (KH + 2) + '" style="max-width:' + (w + 2) + 'px">' + svg.join("") + "</svg>" + '<div class="pcs-seq">' + seq + "</div>";
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
          "<b>Bars " + (st.from + 1) + (st.bars.length > 1 ? "–" + (st.from + st.bars.length) : "") + "</b> of " + st.of + ". Right hand: the numbers are fingers (1 = thumb, 5 = little finger). " +
          (read === "keys" ? "Put each finger on its key, then play the fingers in the order under the keyboard. " : "") + "Listen, then copy it.");
        box.appendChild(paper);
        var fg, v, moveP = p("");
        // colour the shift fingers: the drawn finger numbers come in note order
        var mark = function () {
          var t = [].filter.call(paper.querySelectorAll("text"), function (x) { return /^[1-5]$/.test(x.textContent.trim()); }), want = [];
          fg.shifts.forEach(function (s, i) { if (!fg.only || fg.only[i]) want.push(s); });
          if (t.length !== want.length) return;
          t.forEach(function (x, i) { x.classList.toggle("pcs-shift", view !== "all" && want[i]); });
        };
        var keysBox = document.createElement("div"); keysBox.className = "pcs-wkeys"; box.insertBefore(keysBox, paper);
        var draw = function () {
          fg = fingered(st); v = null;
          try { v = ABCJS.renderAbc(paper, fg.abc, { responsive: "resize", add_classes: true, staffwidth: st.all ? 720 : 360 })[0]; } catch (e) {}
          mark();
          paper.hidden = read === "keys"; keysBox.hidden = read !== "keys";
          if (read === "keys") keysBox.innerHTML = keysHtml(fg);
          moveP.innerHTML = view === "all" || !fg.shifts.some(Boolean) ? "" : view === "shifts" ? "Only the first finger and the <b class=\"pcs-shift-t\">shifts</b> are shown: the other notes keep the finger they had." :
            "<b class=\"pcs-shift-t\">Orange</b> fingers shift: that finger last played a different key.";
        };
        draw();
        // light the key and the finger that sound: the hidden staff's notes are lit by AbcPlay (abc-on), in note order
        new MutationObserver(function () {
          if (read !== "keys") return;
          var els = paper.querySelectorAll(".abcjs-note"), k = -1, i = -1;
          for (var q = 0; q < els.length && q < fg.all.length; q++) { if (!fg.all[q].cont) i++; if (els[q].classList.contains("abc-on")) { k = i; break; } }
          [].forEach.call(keysBox.querySelectorAll(".pcs-klit"), function (e) { e.classList.remove("pcs-klit"); });
          if (k < 0) return;
          var m = fg.played[k].midi, key = keysBox.querySelector('[data-m="' + m + '"]'), sq = keysBox.querySelector('.pcs-sq[data-i="' + k + '"]');
          if (key) key.classList.add("pcs-klit"); if (sq) sq.classList.add("pcs-klit");
        }).observe(paper, { subtree: true, attributes: true, attributeFilter: ["class"] });
        // the player's own fingers, typed one a note as words are on the Notation page
        var ent = document.createElement("div"); ent.className = "pcs-wfing";
        ent.innerHTML = '<label>Your fingers <input type="text" spellcheck="false" autocomplete="off" placeholder="1 1 4 4 5 5 4"></label><span class="pcs-whint"></span><button type="button">Clear</button>' +
          '<p class="pcs-whint">One finger a note (1 = thumb), spaces between: <code>*</code> leaves a note to the system, <code>|</code> jumps to the next bar. Yours replace the system’s.</p>';
        box.appendChild(ent);
        var inp = ent.querySelector("input"), mine = typed().slice(fg.off, fg.off + fg.n);
        while (mine.length && mine[mine.length - 1] == null) mine.pop();
        inp.value = mine.length ? UnderNotes.format(mine) : "";
        var save = function (tokens) {
          var arr = typed().slice(); while (arr.length < fg.off + fg.n) arr.push(null);
          for (var j = 0; j < fg.n; j++) { var t = tokens[j], d = t && /^[1-5]$/.test(t) ? +t : null; arr[fg.off + j] = d; }
          setTyped(arr); draw();
        };
        UnderNotes.attach(inp, { notes: function () { return fg.n; }, bars: function () { return fg.perBar; }, single: true, unit: "fingers", hint: ent.querySelector("span.pcs-whint"), onChange: save });
        ent.querySelector("button").addEventListener("click", function () { inp.value = ""; save([]); inp.dispatchEvent(new Event("input")); });
        row.appendChild(button("▶ Hear it", function (b) { if (v) playV(v, { sound: "piano", qpm: +el.bpm.value }, b); }));
        if (/"[A-G]/.test(f)) row.appendChild(button("▶ With the band", function (b) { if (v) playV(v, { abc: fg.abc, style: el.style.value || "pop", qpm: +el.bpm.value }, b); }));
      }
      box.appendChild(row);
    }
    w.mount = function (root) {
      w.root = root.querySelector(".pcs-walk"); w.step = root.querySelector(".pcs-wstep"); w.count = root.querySelector(".pcs-wcount");
      w.back = root.querySelector(".pcs-wback"); w.next = root.querySelector(".pcs-wnext"); w.len = root.querySelector(".pcs-wlen select"); w.tabs = root.querySelector(".pcs-wtabs");
      w.back.addEventListener("click", function () { at--; show(); });
      w.next.addEventListener("click", function () { at++; show(); });
      w.len.addEventListener("change", function () { at = 0; show(); });
      w.sys = root.querySelector(".pcs-wsys select");
      PianoFingering.SYSTEMS.forEach(function (x) { var o = document.createElement("option"); o.value = x.id; o.textContent = x.label; w.sys.appendChild(o); });
      w.sys.value = sys; w.sys.addEventListener("change", function () { sys = w.sys.value; ls.set(SYS_KEY, sys); show(); });
      w.read = root.querySelector(".pcs-wread select"); w.read.value = read;
      w.read.addEventListener("change", function () { read = w.read.value; ls.set(KEY_READ, read); show(); });
      w.view = root.querySelector(".pcs-wview select"); w.view.value = view;
      w.view.addEventListener("change", function () { view = w.view.value; ls.set(VIEW_KEY, view); show(); });
      [].forEach.call(w.tabs.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { w.setMode(b.dataset.m); }); });
    };
    w.setMode = function (m) { mode = m; at = 0; [].forEach.call(w.tabs.querySelectorAll("button"), function (x) { x.classList.toggle("pcs-on", x.dataset.m === m); });
      w.len.parentNode.style.display = w.sys.parentNode.style.display = w.view.parentNode.style.display = w.read.parentNode.style.display = m === "tune" ? "" : "none"; show(); };
    w.reset = function () { if (w.step) w.setMode("chords"); };
    w.halt = halt; w.bars = bars; w.fingered = fingered;
    return w;
  })();

  global.PianoChordSongs = { walk: Walk, mount: mount, songs: function () { return songs; } };
})(window);
