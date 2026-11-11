// session.js — the Session view for the small DAW (mini-daw.js): a pared-down version of Ableton Live's Session View / Logic's Live Loops.
// Loaded after mini-daw.js; a DAW shows it when data-show has "session". Everything else in the DAW (tracks, mixer, editor, undo, save) is shared.
//
// The model, on top of the project:  p.scenes [{ name }]  (rows)   track.slots [clip | null]  (one per scene; a slot clip is { start: 0, len, notes })
//   p.key (0..11, the key's tonic, default C)   p.quant 'bar' | 'beat' (a launch waits for the next bar line / beat)   p.view 'session' | 'arr'
// A slot clip LOOPS while it plays; only one slot a track plays at a time; a scene launches every slot in its row, and an empty slot STOPS
// its track (so a scene is a whole picture of who is playing; Live and Logic differ in the details: the lesson says to check).
// Session playback has its own clock (beats from the moment the first clip was launched) and uses the same strips / mixer as the arrangement;
// playing the arrangement stops it. Pitched parts use the opening time signature (p.ts).
//
// Moving between the views (the workflow the lesson teaches):
//   Arrangement -> Session  "Loop -> scene": the notes inside the loop bracket become a new scene (one slot per track).
//   Session -> Arrangement  "Record to Arrangement": at the next bar line it starts logging what is launched; it ends at a bar line (button again, or
//                           everything stopped) and writes the launched clips, looped and cut at the bar lines, into the arrangement.
// Chord roots (the musical idea): each scene row shows the root of every bar, read from its bass slot (else its lowest pitched slot: the lowest
// note starting in the bar), as a note name and its place in the key. Clicking a root changes that bar's chord I -> IV -> V and moves every
// pitched slot in the row's bar by the same interval (parallel: right for the major chords I IV V). "Key" moves the whole song's pitched notes.
(function (global) {
  var M = global.MiniDaw; if (!M || !M.core) return;
  var X = M.core, Meter = M.Meter, el = X.el, btn = X.btn, clamp = X.clamp, D = X.Daw.prototype, NOTE = X.NOTE;
  var ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'], PRIMARY = [0, 5, 7], MAX_SCENES = 8;

  function pitched(tr) { return !X.isDrum(tr) && !X.isAudio(tr); }
  function slotAt(tr, si) { return (tr && tr.slots && tr.slots[si]) || null; }
  function putSlot(tr, si, c) { if (!tr.slots) tr.slots = []; while (tr.slots.length <= si) tr.slots.push(null); tr.slots[si] = c; }
  function barLen(p) { return Meter.barLen(p, 0); }
  function near(x) { return Math.abs(x - Math.round(x)) < 1e-6; }
  function keys(o) { return Object.keys(o); }

  // the lowest note starting in each bar of a slot clip (midi number, or null for a bar with no note)
  function rootsOf(c, bl) {
    var n = Math.max(1, Math.round(c.len / bl)), out = [];
    for (var k = 0; k < n; k++) { var lo = k * bl, hi = lo + bl, best = null;
      c.notes.forEach(function (x) { if (x.t >= c.len || x.t < lo - 1e-9 || x.t >= hi - 1e-9) return;
        if (!best || x.t < best.t - 1e-9 || (Math.abs(x.t - best.t) < 1e-9 && x.m < best.m)) best = x; });
      out.push(best ? best.m : null); }
    return out;
  }
  // the slot a scene's roots are read from: a bass track's, else the pitched slot with the lowest average note
  function sourceOf(p, si) {
    var best = null;
    p.tracks.forEach(function (tr, ti) { var c = slotAt(tr, si); if (!c || !pitched(tr) || !c.notes.length) return;
      var avg = c.notes.reduce(function (a, n) { return a + n.m; }, 0) / c.notes.length, score = (/bass/.test(tr.inst) ? 0 : 1000) + avg;
      if (!best || score < best.score) best = { ti: ti, score: score, c: c }; });
    return best && { ti: best.ti, roots: rootsOf(best.c, barLen(p)) };
  }
  function sceneBars(p, si) { var m = 0; p.tracks.forEach(function (tr) { var c = slotAt(tr, si); if (c) m = Math.max(m, c.len); }); return m ? Math.max(1, Math.round(m / barLen(p))) : 1; }

  // a small picture of a clip's notes
  function thumb(tr, c, w, h) {
    var cv = el('canvas', 'mdaw-sthumb'); cv.width = w; cv.height = h; var cx = cv.getContext('2d'); cx.fillStyle = 'rgba(255,255,255,.9)'; if (!c) return cv;
    var drum = X.isDrum(tr), rows = X.rowsOf(tr).map(function (r) { return r[0]; }), W = w / c.len;
    var ms = c.notes.map(function (n) { return n.m; }).filter(function () { return !drum; }), lo = Math.min.apply(null, ms.concat([200])), hi = Math.max.apply(null, ms.concat([0]));
    c.notes.forEach(function (n) { if (n.t >= c.len) return; var y;
      if (drum) { var k = rows.indexOf(n.m); y = 1 + (k < 0 ? rows.length - 1 : k) * ((h - 4) / rows.length); cx.fillRect(n.t * W, y, 2, 2); }
      else { y = hi === lo ? h / 2 : h - 3 - (n.m - lo) / (hi - lo) * (h - 6); cx.fillRect(n.t * W, y, Math.max(2, n.d * W - 1), 2); } });
    return cv;
  }

  // ---------------- building the panel ----------------
  M.Session = { rootsOf: rootsOf, sourceOf: sourceOf, build: function (d) {
    d.viewEl = el('div', 'mdaw-views'); d.bSess = btn('Session', 'Session view: scenes of clips that loop until you launch something else'); d.bArr = btn('Arrangement', 'Arrangement view: the timeline');
    d.bSess.onclick = function () { d.setView('session'); }; d.bArr.onclick = function () { d.setView('arr'); };
    d.viewEl.appendChild(d.bSess); d.viewEl.appendChild(d.bArr);
    var s = d.sessEl = el('div', 'mdaw-session'); d.node.appendChild(s);
    var tools = el('div', 'mdaw-tools'); s.appendChild(tools);
    d.bStopAll = btn('■ Stop all', 'Stop every track at the next bar line (press again to stop at once; Space)'); d.bStopAll.onclick = function () { d.sessStopAll(); };
    d.bSRec = btn('● Record to Arrangement', 'Log what you launch from the next bar line and write it into the Arrangement', 'mdaw-rec'); d.bSRec.onclick = function () { d.sessRecToggle(); };
    var ql = el('label', 'mdaw-lbl', 'Launch '); d.quantSel = el('select'); d.quantSel.setAttribute('aria-label', 'Launch quantization');
    [['bar', 'at the next bar'], ['beat', 'on the next beat']].forEach(function (o) { var e = el('option', null, o[1]); e.value = o[0]; d.quantSel.appendChild(e); });
    d.quantSel.onchange = function () { d.p.quant = d.quantSel.value; d.save(); }; ql.appendChild(d.quantSel);
    var kl = el('label', 'mdaw-lbl', 'Key '); d.keySel = el('select'); d.keySel.setAttribute('aria-label', 'Key (the tonic): changing it moves every pitched note');
    NOTE.forEach(function (n, i) { var e = el('option', null, n); e.value = i; d.keySel.appendChild(e); }); d.keySel.onchange = function () { d.setKey(+d.keySel.value); }; kl.appendChild(d.keySel);
    d.bAddScene = btn('+ Scene', 'Add an empty scene (row)'); d.bAddScene.onclick = function () { d.addScene(); };
    d.bLoopScene = btn('Loop → scene', 'Copy the notes inside the Arrangement\'s loop bracket into a new scene'); d.bLoopScene.onclick = function () { d.loopToScene(); };
    d.sessPos = el('span', 'mdaw-pos', '—'); d.sessPos.title = 'The bar the session clock is at';
    [d.bStopAll, d.bSRec, ql, kl, d.bAddScene, d.sessPos].forEach(function (x) { tools.appendChild(x); });
    d.bClipScene = btn('Clip → Session', 'Copy the selected Arrangement clip into the first free scene for its track (a new scene if there is none)'); d.bClipScene.onclick = function () { d.clipToSession(); };
    d.viewEl.appendChild(d.bLoopScene); d.viewEl.appendChild(d.bClipScene); d.node.insertBefore(d.viewEl, s);
    d.sessGridEl = el('div', 'mdaw-sgrid'); s.appendChild(d.sessGridEl);
    d.sessHint = el('p', 'mdaw-hint', 'The ▶ on a clip launches it: it waits for the next bar line, then loops until you launch another clip on that track or press its ■. A scene\'s ▶ launches its whole row. Click a clip to edit it below; double-click an empty slot to make a clip. Click a root (F, B♭ …) to change that bar\'s chord.'); s.appendChild(d.sessHint);
    d.sessPlay = {}; d.sessQ = {}; d.sessRec = null;
  } };

  D.inSession = function () { return !!this.sessEl && (this.p.view || this.node.dataset.view || 'arr') === 'session'; };
  D.setView = function (v) { this.p.view = v; this.save(); this.renderSession(); this.sessTransport(); if (v === 'arr') this.renderTracks(); };
  D.sessTransport = function () {
    if (!this.sessEl) return; var inS = this.inSession(), d = this;
    [this.bHome, this.bPlay, this.bRec, this.bLoop, this.posEl, this.bKeys, this.bMon, this.inMeter].forEach(function (b) { if (inS) b.hidden = true; });
    if (!inS) { this.bHome.hidden = this.bPlay.hidden = this.posEl.hidden = false; this.bRec.hidden = !this.show.record; this.bLoop.hidden = !this.show.transport; }
  };

  // ---------------- drawing ----------------
  D.renderSession = function () {
    if (!this.sessEl) return; var d = this, p = this.p, inS = this.inSession();
    this.sessEl.hidden = !inS; this.arr.hidden = inS || !this.show.tracks;
    this.bSess.classList.toggle('mdaw-on', inS); this.bArr.classList.toggle('mdaw-on', !inS);
    this.bSess.setAttribute('aria-pressed', String(inS)); this.bArr.setAttribute('aria-pressed', String(!inS));
    this.sessTransport(); this.bLoopScene.hidden = this.bClipScene.hidden = inS; if (!inS) return;
    this.quantSel.value = p.quant || 'bar'; this.keySel.value = p.key || 0; this.bAddScene.disabled = p.scenes.length >= MAX_SCENES;
    var g = this.sessGridEl; g.innerHTML = ''; this.cellEls = []; this.sceneEls = []; this.stopEls = [];
    g.style.gridTemplateColumns = '17rem repeat(' + Math.max(1, p.tracks.length) + ', minmax(7.2rem, 1fr))';
    g.appendChild(el('div', 'mdaw-sc mdaw-scorner', 'Scenes'));
    p.tracks.forEach(function (tr, ti) {
      var h = el('div', 'mdaw-sc mdaw-shead'); h.style.borderTopColor = X.COLORS[ti % X.COLORS.length]; h.appendChild(el('span', 'mdaw-sname', tr.name));
      var sb = btn('■', 'Stop ' + tr.name + ' at the next bar line', 'mdaw-ms'); sb.onclick = function () { d.launch(ti, -1); }; if (X.isAudio(tr)) sb.hidden = true; h.appendChild(sb);
      d.stopEls.push(sb); g.appendChild(h); });
    if (!p.scenes.length) { var none = el('p', 'mdaw-hint mdaw-snone', 'No scenes yet. Add one with + Scene, or copy the Arrangement\'s loop into one with Loop → scene.'); none.style.gridColumn = '1 / -1'; g.appendChild(none); }
    var bl = barLen(p);
    p.scenes.forEach(function (sc, si) {
      var h = el('div', 'mdaw-sc mdaw-scene'), top = el('div', 'mdaw-thline');
      var go = btn('▶', 'Launch scene ' + (si + 1) + ' (every clip in the row)', 'mdaw-ms mdaw-scgo'); go.onclick = function () { d.launchScene(si); };
      var nm = el('input', 'mdaw-name'); nm.value = sc.name || ''; nm.setAttribute('aria-label', 'Scene ' + (si + 1) + ' name'); nm.onchange = function () { d.change(function () { sc.name = nm.value; }, true); };
      var dup = btn('⎘', 'Copy this scene below itself', 'mdaw-ms'); dup.onclick = function () { d.dupScene(si); };
      var del = btn('×', 'Delete this scene', 'mdaw-ms'); del.onclick = function () { d.delScene(si); };
      [go, nm, dup, del].forEach(function (x) { top.appendChild(x); }); h.appendChild(top);
      var src = sourceOf(p, si), rr = el('div', 'mdaw-roots'); rr.appendChild(el('span', 'mdaw-rlbl', 'Roots'));
      if (!src) rr.appendChild(el('span', 'mdaw-rlbl', 'no pitched clip'));
      else src.roots.forEach(function (m, bar) {
        if (m == null) { rr.appendChild(el('span', 'mdaw-root mdaw-rest', '–')); return; }
        var pc = m % 12, deg = ((pc - (p.key || 0)) % 12 + 12) % 12, b = el('button', 'mdaw-root'); b.type = 'button';
        b.appendChild(el('span', 'mdaw-rname', NOTE[pc])); b.appendChild(el('span', 'mdaw-rdeg', ROMAN[deg]));
        b.title = 'Bar ' + (bar + 1) + ': the root is ' + NOTE[pc] + ', ' + ROMAN[deg] + ' in this key. Click for the next of I, IV, V: every pitched clip in the row follows.';
        b.onclick = function () { d.setRoot(si, bar, ((p.key || 0) + PRIMARY[(PRIMARY.indexOf(deg) + 1) % PRIMARY.length]) % 12); }; rr.appendChild(b); });
      h.appendChild(rr); d.sceneEls.push(h); g.appendChild(h);
      p.tracks.forEach(function (tr, ti) {
        var c = slotAt(tr, si), cell = el('div', 'mdaw-cell' + (c ? ' mdaw-has' : ' mdaw-empty') + (X.isAudio(tr) ? ' mdaw-na' : ''));
        if (c) cell.style.setProperty('--cc', X.COLORS[ti % X.COLORS.length]);
        var lb = btn(c ? '▶' : '■', c ? 'Launch ' + tr.name + ', scene ' + (si + 1) : 'Stop ' + tr.name, 'mdaw-launch'); lb.onclick = function (e) { e.stopPropagation(); d.launch(ti, c ? si : -1); };
        cell.appendChild(lb);
        if (c) { var nb = Math.max(1, Math.round(c.len / bl)); cell.appendChild(el('span', 'mdaw-cname', nb + (nb === 1 ? ' bar' : ' bars'))); cell.appendChild(thumb(tr, c, 110, 22)); }
        var prog = el('div', 'mdaw-prog'); cell.appendChild(prog);
        if (X.isAudio(tr)) { lb.hidden = true; cell.title = 'Audio tracks have no session clips here.'; }
        cell.addEventListener('pointerdown', function () { if (X.isAudio(tr)) return; d.sessCur2 = { ti: ti, si: si }; d.node.focus({ preventScroll: true });
          if (!c) { d.markCells(); return; } d.sel = { track: ti, clip: -1, slot: si, notes: [] }; d.renderEditor(); d.markCells(); });
        cell.addEventListener('dblclick', function () { if (!c && !X.isAudio(tr)) d.newSlot(ti, si); });
        d.cellEls.push({ ti: ti, si: si, el: cell, prog: prog, btn: lb, filled: !!c }); g.appendChild(cell); });
    });
    this.markCells(); this.sessPaint();
  };
  D.markCells = function () { var s = this.sel, k = this.sessCur2; (this.cellEls || []).forEach(function (o) { o.el.classList.toggle('mdaw-csel', s.slot === o.si && s.track === o.ti && o.filled); o.el.classList.toggle('mdaw-ccur', !!k && k.ti === o.ti && k.si === o.si && !o.filled); }); };

  // the playing / waiting state, drawn every frame while the session runs
  D.sessPaint = function () {
    if (!this.cellEls || !this.sessEl) return; var d = this, p = this.p, ctx = X.ac(), bl = barLen(p);
    var cur = this.sessOn && this.sessT0 != null && ctx ? (ctx.currentTime - this.sessT0) / this.sessSpb : null;
    this.cellEls.forEach(function (o) {
      var pl = d.sessOn && d.sessPlay[o.ti], on = !!(pl && pl.slot === o.si && o.filled), q = d.sessQ[o.ti], wait = d.sessOn && q !== undefined && o.filled && q === o.si;
      o.el.classList.toggle('mdaw-cplay', on); o.el.classList.toggle('mdaw-cwait', wait);
      var c = on ? slotAt(p.tracks[o.ti], o.si) : null; o.prog.style.width = c && cur != null && c.len ? (((cur - pl.start) % c.len + c.len) % c.len / c.len * 100) + '%' : '0';
    });
    (this.sceneEls || []).forEach(function (h, si) { var tot = 0, on = 0; p.tracks.forEach(function (tr, ti) { if (slotAt(tr, si)) { tot++; if (d.sessOn && d.sessPlay[ti] && d.sessPlay[ti].slot === si) on++; } }); h.classList.toggle('mdaw-splay', tot > 0 && on === tot); });
    (this.stopEls || []).forEach(function (b, ti) { b.classList.toggle('mdaw-on', d.sessOn && d.sessQ[ti] === -1); });
    var r = this.sessRec; this.bSRec.classList.toggle('mdaw-recon', !!r);
    this.bSRec.textContent = !r ? '● Record to Arrangement' : r.stopping ? '● Ending at the bar line…' : r.started ? '● Recording… (press to end)' : '● Waiting for the bar line…';
    this.sessPos.textContent = cur != null && cur >= 0 ? 'bar ' + (Math.floor(cur / bl + 1e-6) + 1) : '—';
    this.bStopAll.disabled = !this.sessOn;
  };
  D.sessFrame = function () {
    var d = this; if (this.sessFrameOn) return; this.sessFrameOn = true;
    (function f() { d.sessPaint(); if (d.sessOn) requestAnimationFrame(f); else d.sessFrameOn = false; })();
  };

  // ---------------- launching ----------------
  D.launch = function (ti, si) {
    var tr = this.p.tracks[ti]; if (!tr || X.isAudio(tr)) return; if (this.playing) this.stop();
    if (si < 0 && !this.sessOn) return; this.sessQ[ti] = si;
    if (!this.sessOn) this.sessStart(); this.sessPaint();
  };
  D.launchScene = function (si) {
    var d = this; if (this.playing) this.stop(); var any = false;
    this.p.tracks.forEach(function (tr, ti) { if (X.isAudio(tr)) return; var c = slotAt(tr, si);
      if (c) { d.sessQ[ti] = si; any = true; } else if (d.sessOn && d.sessPlay[ti]) d.sessQ[ti] = -1; });
    if (!any && !this.sessOn) return this.say('That scene has no clips yet: double-click a slot to make one.');
    if (!this.sessOn) this.sessStart(); this.sessPaint();
  };
  D.sessStart = function () {
    var d = this; this.sessOn = true; this.sessSpb = 60 / this.p.tempo; this.sessT0 = null; this.ensureAudio(); this.sessFrame();
    this.load().then(function () { if (!d.sessOn || d.sessT0 != null) return; var ctx = X.ac(); d.sessT0 = ctx.currentTime + 0.12; d.sessCur = 0;
      d.sessTimer = setInterval(function () { d.sessSchedule(); }, 25); d.sessSchedule(); }).catch(function (e) { d.sessOn = false; d.say('Could not load the sounds: ' + (e && e.message)); });
  };
  D.sessRebase = function () {
    if (this.sessT0 == null) { this.sessSpb = 60 / this.p.tempo; return; }
    var now = X.ac().currentTime, cur = (now - this.sessT0) / this.sessSpb; this.sessSpb = 60 / this.p.tempo; this.sessT0 = now - cur * this.sessSpb;
  };
  D.sessSchedule = function () {
    var d = this, ctx = X.ac(), p = this.p, spb = this.sessSpb, bl = barLen(p), horizon = ctx.currentTime + 0.15, step = 0.25;
    while (this.sessOn && this.sessT0 + this.sessCur * spb < horizon) {
      var b0 = this.sessCur, b1 = b0 + step, bar = near(b0 / bl), beat = near(b0);
      if (p.quant === 'beat' ? beat : bar) this.sessFire(b0, bar);
      if (!this.sessOn) return;
      if (!keys(this.sessPlay).length && !keys(this.sessQ).length && !this.sessRec) { this.sessStop(); return; }
      if (p.click) Meter.clicks(p, b0, b1).forEach(function (k) { X.click(ctx, d.sessT0 + k.b * spb, k.accent, d.master); });
      keys(this.sessPlay).forEach(function (k) {
        var pl = d.sessPlay[k], tr = p.tracks[k], c = tr && slotAt(tr, pl.slot); if (!c || !(c.len > 0)) { delete d.sessPlay[k]; return; }
        var loc = ((b0 - pl.start) % c.len + c.len) % c.len, st = d.strips[k]; if (!st) return;
        c.notes.forEach(function (n) { if (n.t >= c.len || n.t < loc - 1e-9 || n.t >= loc + step - 1e-9) return;
          X.playNote(X.bank(), tr, n, d.sessT0 + (b0 + n.t - loc) * spb, Math.min(n.d, c.len - n.t) * spb, st.input); }); });
      this.sessCur = b1;
    }
  };
  // at a launch boundary: start / end the recording, then do the queued launches and stops
  D.sessFire = function (b0, isBar) {
    var d = this, rec = this.sessRec;
    if (rec && rec.pending && isBar) { rec.pending = false; rec.started = true; rec.origin = b0; rec.open = {};
      keys(this.sessPlay).forEach(function (k) { var pl = d.sessPlay[k], c = slotAt(d.p.tracks[k], pl.slot); if (!c) return;
        rec.open[k] = { ti: +k, slot: pl.slot, a: b0, phase: ((b0 - pl.start) % c.len + c.len) % c.len }; rec.any = true; }); }
    keys(this.sessQ).forEach(function (k) { var v = d.sessQ[k]; delete d.sessQ[k];
      if (rec && rec.started && rec.open[k]) { rec.open[k].b = b0; rec.segs.push(rec.open[k]); delete rec.open[k]; }
      if (v < 0) delete d.sessPlay[k];
      else { d.sessPlay[k] = { slot: v, start: b0 }; if (rec && rec.started) { rec.open[k] = { ti: +k, slot: v, a: b0, phase: 0 }; rec.any = true; } } });
    if (rec && rec.started && isBar && (rec.stopping || (rec.any && !keys(this.sessPlay).length))) this.sessRecEnd(b0);
  };
  D.sessStop = function () {
    if (!this.sessOn) return; var ctx = X.ac(), rec = this.sessRec, cur = this.sessT0 != null ? Math.floor((ctx.currentTime - this.sessT0) / this.sessSpb * 4) / 4 : 0;
    clearInterval(this.sessTimer); this.sessOn = false; this.sessT0 = null; this.sessQ = {}; this.sessPlay = {}; this.sessRec = null;
    if (X.bank()) X.bank().stopAll();
    if (rec && rec.started) { keys(rec.open).forEach(function (k) { rec.open[k].b = Math.max(cur, rec.open[k].a); rec.segs.push(rec.open[k]); }); this.sessRecBuild(rec, cur); }
    this.sessPaint();
  };
  D.sessStopAll = function () {
    if (!this.sessOn) return; var d = this, playing = keys(this.sessPlay);
    if (!playing.length || playing.every(function (k) { return d.sessQ[k] === -1; })) return this.sessStop();
    playing.forEach(function (k) { d.sessQ[k] = -1; }); this.sessPaint();
  };

  // ---------------- Session -> Arrangement ----------------
  D.sessRecToggle = function () {
    var r = this.sessRec;
    if (r) { if (r.started) r.stopping = true; else this.sessRec = null; this.sessPaint(); return; }
    if (this.playing) this.stop();
    this.sessRec = { pending: true, started: false, segs: [], open: {}, any: false };
    if (!this.sessOn) this.sessStart();
    this.say('Recording starts at the next bar line. Launch clips and scenes; press the button again (or Stop all) to end at a bar line.'); this.sessPaint();
  };
  D.sessRecEnd = function (b) {
    var rec = this.sessRec; this.sessRec = null; keys(rec.open).forEach(function (k) { rec.open[k].b = b; rec.segs.push(rec.open[k]); }); this.sessRecBuild(rec, b);
  };
  // the launched clips as arrangement clips: each segment is the slot looped (starting part-way in if recording began mid-loop) and cut at its ends
  D.sessRecBuild = function (rec, end) {
    var d = this, p = this.p, at = Meter.floor(p, this.pos), span = Math.min(end - rec.origin, Meter.barStart(p, 64) - at);
    var made = {}, out = [];
    rec.segs.forEach(function (s) { var tr = p.tracks[s.ti], c = slotAt(tr, s.slot), n = Math.min(s.b, rec.origin + span) - s.a; if (!tr || !c || !(n > 1e-9)) return;
      for (var o = -s.phase; o < n - 1e-9; o += c.len) { var lo = Math.max(o, 0), hi = Math.min(o + c.len, n), off = lo - o; if (hi - lo < 1e-9) continue;
        out.push({ ti: s.ti, clip: { start: at + (s.a - rec.origin) + lo, len: hi - lo,
          notes: c.notes.filter(function (x) { return x.t >= off - 1e-9 && x.t < off + (hi - lo) - 1e-9 && x.t < c.len; }).map(function (x) { return { t: x.t - off, d: x.d, m: x.m, v: x.v }; }) } }); made[s.ti] = 1; } });
    if (!out.length) return this.say('Nothing was launched while recording, so nothing was written.');
    this.change(function () {
      keys(made).forEach(function (k) { var tr = p.tracks[k]; tr.clips = tr.clips.filter(function (c) { return c.start + c.len <= at + 1e-9 || c.start >= at + span - 1e-9; }); });
      out.forEach(function (o) { p.tracks[o.ti].clips.push(o.clip); });
      p.bars = Math.max(p.bars, Math.min(64, Meter.barAt(p, at + span - 1e-6).bar + 1)); p.view = 'arr'; p.loop.on = false; d.sel = { track: out[0].ti, clip: p.tracks[out[0].ti].clips.length - 1, slot: -1, notes: [] }; });
    this.setPos(at);
    this.say('Recorded ' + Meter.barsOfLen(p, at, span) + ' bars of your performance into the Arrangement from bar ' + (Meter.barAt(p, at).bar + 1) + ' (loop turned off). Press ▶ to hear it as a song; Undo takes it back.');
  };

  // ---------------- Arrangement -> Session ----------------
  D.loopToScene = function () {
    var p = this.p, l = p.loop, sp = this.loopSpan(), a = sp[0], z = sp[1], d = this;
    if (!(z > a)) return this.say('Drag along the Arrangement\'s ruler to set the loop bracket first.');
    if (p.scenes.length >= MAX_SCENES) return this.say('Eight scenes is the most here.');
    var made = 0, slots = p.tracks.map(function (tr) {
      if (X.isAudio(tr)) return null; var notes = [], last = a;
      tr.clips.forEach(function (c) { c.notes.forEach(function (n) { if (n.t >= c.len) return; var t = c.start + n.t; if (t >= a - 1e-9 && t < z - 1e-9) { notes.push({ t: t - a, d: Math.min(n.d, z - t), m: n.m, v: n.v }); last = Math.max(last, Math.min(c.start + c.len, z)); } }); });
      if (notes.length) made++;
      // the slot is as long as the clips it came from (to a bar line), not the whole bracket: a two-bar clip in a four-bar bracket is a two-bar loop, not two bars of notes and two of silence
      var len = Math.min(z - a, Math.max(barLen(p), Math.ceil((last - a) / barLen(p) - 1e-6) * barLen(p)));
      return notes.length ? { start: 0, len: len, notes: notes } : null; });
    if (!made) return this.say('There are no notes inside the loop bracket (bars ' + (l.from + 1) + '–' + l.to + ').');
    this.change(function () { var si = p.scenes.length; p.scenes.push({ name: 'Scene ' + (si + 1) }); p.tracks.forEach(function (tr, i) { putSlot(tr, si, slots[i]); }); });
    this.say('Bars ' + (l.from + 1) + '–' + l.to + ' are now Scene ' + p.scenes.length + ': one looping clip for each track that played. Open the Session view to launch it.');
  };

  // ---------------- into the Session from elsewhere ----------------
  // items [{ tr, notes, len, felt }] go into the first scene where none of those tracks has a slot yet (else a new scene); no change() here, the caller wraps it.
  // Returns the scene index, or null when eight scenes are full. The clips are copies, cut at their length.
  D.sessPutIn = function (items, name) {
    var p = this.p, si = -1;
    for (var k = 0; k < p.scenes.length && si < 0; k++) if (items.every(function (it) { return !slotAt(it.tr, k); })) si = k;
    if (si < 0) { if (p.scenes.length >= MAX_SCENES) return null; si = p.scenes.length; p.scenes.push({ name: name || 'Scene ' + (si + 1) }); }
    else if (name && /^Scene \d+$/.test(p.scenes[si].name || '') && !p.tracks.some(function (tr) { return slotAt(tr, si); })) p.scenes[si].name = name;
    items.forEach(function (it) { var c = { start: 0, len: it.len, notes: it.notes.filter(function (n) { return n.t < it.len - 1e-9; }).map(function (n) { return Object.assign({}, n); }) }; if (it.felt) c.felt = it.felt; putSlot(it.tr, si, c); });
    p.tracks.forEach(function (tr) { if (tr.slots) while (tr.slots.length < p.scenes.length) tr.slots.push(null); });
    return si;
  };
  // the selected Arrangement clip, copied into the Session
  D.clipToSession = function () {
    var d = this, tr = this.track(), c = this.sel.slot >= 0 ? null : this.clip(), si = null;
    if (!tr || !c) return this.say('Select an Arrangement clip first.'); if (X.isAudio(tr)) return this.say('Audio tracks have no session clips here.');
    this.change(function () { si = d.sessPutIn([{ tr: tr, notes: c.notes, len: c.len, felt: c.felt }], tr.name + ' clip'); }, true);
    if (si == null) { this.undo.pop(); return this.say('Eight scenes is the most: delete one first.'); }
    this.renderSession(); this.say(tr.name + ' clip copied to scene ' + (si + 1) + ' of the Session view (Session button, then ▶ on it).');
  };
  // Ctrl/Cmd+V in the Session view: a copied Arrangement (or Session) clip into the slot last clicked
  D.pasteToSlot = function (cl) {
    var d = this, k = this.sessCur2, tr = this.p.tracks[k.ti]; if (!tr) return;
    if (!!cl.audio || !!cl.drum !== X.isDrum(tr)) return this.say('A clip can only go on a track of its kind: ' + (cl.drum ? 'that one is drums.' : 'that one is pitched notes.'));
    var src = cl.clip || cl, notes = (src.notes || []), len = src.len || cl.len;
    if (!(len > 0)) return this.say('Nothing to paste.');
    this.change(function () { putSlot(tr, k.si, { start: 0, len: len, notes: notes.map(function (n) { return Object.assign({}, n); }) }); d.sel = { track: k.ti, clip: -1, slot: k.si, notes: [] }; });
    this.say('Pasted into scene ' + (k.si + 1) + ' on ' + tr.name + '.');
  };

  // ---------------- scenes, roots and key ----------------
  D.newSlot = function (ti, si) {
    var d = this, p = this.p, tr = p.tracks[ti], len = sceneBars(p, si) * barLen(p);
    this.change(function () { putSlot(tr, si, { start: 0, len: len, notes: [] }); d.sel = { track: ti, clip: -1, slot: si, notes: [] }; });
  };
  D.addScene = function () {
    var p = this.p; if (p.scenes.length >= MAX_SCENES) return; this.change(function () { p.scenes.push({ name: 'Scene ' + (p.scenes.length + 1) }); });
  };
  D.shiftScenes = function (from, by) {     // by +1: a scene was inserted after `from`; by -1: the scene at `from` was deleted (its launches are dropped)
    [this.sessPlay, this.sessQ].forEach(function (o) { keys(o).forEach(function (k) { var v = o[k]; if (v < 0) return;
      if (by < 0) { if (v === from) delete o[k]; else if (v > from) o[k] = v - 1; } else if (v > from) o[k] = v + 1; }); });
  };
  D.dupScene = function (si) {
    var p = this.p; if (p.scenes.length >= MAX_SCENES) return this.say('Eight scenes is the most here.'); var d = this;
    this.change(function () { p.scenes.splice(si + 1, 0, { name: (p.scenes[si].name || 'Scene') + ' 2' });
      p.tracks.forEach(function (tr) { var c = slotAt(tr, si); if (!tr.slots) tr.slots = []; while (tr.slots.length <= si) tr.slots.push(null); tr.slots.splice(si + 1, 0, c ? X.clone(c) : null); }); d.shiftScenes(si, 1); d.sel.slot = -1; });
  };
  D.delScene = function (si) {
    var p = this.p, d = this, has = p.tracks.some(function (tr) { return slotAt(tr, si); });
    if (has && !confirm('Delete scene ' + (si + 1) + ' and its clips?')) return;
    this.change(function () { p.scenes.splice(si, 1); p.tracks.forEach(function (tr) { if (tr.slots) tr.slots.splice(si, 1); }); d.shiftScenes(si, -1); d.sel.slot = -1; d.fixSel(); });
  };
  // bar `bar` of scene `si` gets the root with pitch class pc; every pitched clip in the row moves by the shortest interval between the old root and the new
  D.setRoot = function (si, bar, pc) {
    var p = this.p, src = sourceOf(p, si), bl = barLen(p); if (!src || src.roots[bar] == null) return;
    var delta = (((pc - src.roots[bar]) % 12) + 12) % 12; if (delta > 6) delta -= 12; if (!delta) return;
    this.change(function () { p.tracks.forEach(function (tr) { var c = slotAt(tr, si); if (!c || !pitched(tr)) return;
      var nb = Math.max(1, Math.round(c.len / bl)), lo = (bar % nb) * bl, hi = lo + bl;
      c.notes.forEach(function (n) { if (n.t >= lo - 1e-9 && n.t < hi - 1e-9) n.m = clamp(n.m + delta, 21, 108); }); }); });
    this.say('Bar ' + (bar + 1) + ' of ' + (p.scenes[si].name || 'scene ' + (si + 1)) + ' is now ' + NOTE[pc] + ' (' + ROMAN[((pc - (p.key || 0)) % 12 + 12) % 12] + '); the other players in that bar moved with the bass.');
  };
  // a new tonic: every pitched note in the session and the arrangement moves by the shortest interval
  D.setKey = function (pc) {
    var p = this.p, k = p.key || 0, delta = (((pc - k) % 12) + 12) % 12; if (delta > 6) delta -= 12;
    function sh(c) { if (c) c.notes.forEach(function (n) { n.m = clamp(n.m + delta, 21, 108); }); }
    this.change(function () { p.key = pc; if (delta) p.tracks.forEach(function (tr) { if (!pitched(tr)) return; tr.clips.forEach(sh); (tr.slots || []).forEach(sh); }); });
    this.say('Key of ' + NOTE[pc] + (delta ? ': every pitched note moved ' + (delta > 0 ? 'up ' : 'down ') + Math.abs(delta) + ' semitone' + (Math.abs(delta) === 1 ? '' : 's') + '; the drums stayed.' : '.'));
  };
})(window);
