// apps/lsa/chart-app.js — Evaluation Chart page controller.
// Requires curriculum.js, store.js, prompt-engine.js, notation.js (and abcjs-basic.js)
// to already be loaded.

(function () {
  'use strict';

  const STORE = window.LSA_STORE;
  const ENGINE = window.LSA_ENGINE;
  const NOTATION = window.LSA_NOTATION;
  const LEVELS = window.LSA_LEVELS;
  const LEVEL_NAMES = window.LSA_LEVEL_NAMES;
  const CRITERIA = window.LSA_CRITERIA;
  const ROWS = STORE.SEATING_ROWS;
  const COLS = STORE.SEATING_COLS;
  const PREF_KEY = 'lsa-ui-chart-prefs';
  const PHONE_QUERY = '(max-width: 640px)';

  let db = STORE.getDB();
  let prefs = loadPrefs();
  let manualTargetId = null;
  let cued = []; // top-2 ranked {student, step} for the current criterion

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      const p = raw ? JSON.parse(raw) : {};
      return {
        register: p.register === 'rhythm' ? 'rhythm' : 'tonal',
        criterionId: p.criterionId || null,
        showCounts: !!p.showCounts,
        view: p.view === 'seating' ? 'seating' : 'cards',
        fit: p.fit === 'grid' ? 'grid' : 'class',
      };
    } catch (e) {
      return { register: 'tonal', criterionId: null, showCounts: false, view: 'cards', fit: 'class' };
    }
  }
  function savePrefs() { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }

  function filteredCriteria() {
    return CRITERIA.filter(function (c) { return c.register === prefs.register; });
  }
  function currentCriterion() {
    const list = filteredCriteria();
    let c = list.find(function (x) { return x.id === prefs.criterionId; });
    if (!c) c = list[0];
    return c;
  }
  function isPhone() { return window.matchMedia(PHONE_QUERY).matches; }
  function aptClass(tier) { return tier === 'high' ? 'lsa-apt-high' : tier === 'low' ? 'lsa-apt-low' : 'lsa-apt-avg'; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // ── DOM refs ──────────────────────────────────────────────────────────
  const el = {
    register: document.getElementById('lsa-register'),
    criterion: document.getElementById('lsa-criterion'),
    showCounts: document.getElementById('lsa-show-counts'),
    viewCards: document.getElementById('lsa-view-cards'),
    viewSeating: document.getElementById('lsa-view-seating'),
    resetBtn: document.getElementById('lsa-reset-btn'),
    toolbarWrap: document.getElementById('lsa-toolbar-wrap'),
    cueStatus: document.getElementById('lsa-cue-status'),
    criterionMeta: document.getElementById('lsa-criterion-meta'),
    notationBar: document.getElementById('lsa-notation-bar'),
    cardsView: document.getElementById('lsa-cards-view'),
    grid: document.getElementById('lsa-grid'),
    seatingView: document.getElementById('lsa-seating-view'),
    seatingExit: document.getElementById('lsa-seating-exit'),
    fitToggle: document.getElementById('lsa-fit-toggle'),
    seatingGrid: document.getElementById('lsa-seating-grid'),
    seatTargetLabel: document.getElementById('lsa-seat-target-label'),
    seatYes: document.getElementById('lsa-seat-yes'),
    seatNo: document.getElementById('lsa-seat-no'),
    phoneGrid: document.getElementById('lsa-phone-grid'),
  };

  // ── criterion select ──────────────────────────────────────────────────

  function populateCriterionSelect() {
    const list = filteredCriteria();
    el.criterion.innerHTML = '';
    let curGroup = null, optgroup = null;
    list.forEach(function (c) {
      const groupKey = c.registerLabel + ' Bk' + c.book + ' · Unit ' + c.unit;
      if (groupKey !== curGroup) {
        curGroup = groupKey;
        optgroup = document.createElement('optgroup');
        optgroup.label = groupKey;
        el.criterion.appendChild(optgroup);
      }
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = '§' + c.section + ' · Criterion ' + c.criterion + ' (' + c.patternCount + ' patterns)';
      optgroup.appendChild(opt);
    });
    const cur = currentCriterion();
    if (cur) el.criterion.value = cur.id;
  }

  // ── targeting: auto-cued[0], or a manual override until the next mark ──

  function recomputeCued() {
    const c = currentCriterion();
    cued = c ? ENGINE.cueList(db, db.students, c, 2) : [];
  }

  function target() {
    if (manualTargetId) {
      const student = db.students.find(function (s) { return s.id === manualTargetId; });
      const c = currentCriterion();
      if (student && c) {
        const step = ENGINE.nextStep(db, student, c);
        if (step) return { student: student, step: step };
      }
      manualTargetId = null;
    }
    return cued[0] || null;
  }

  function mark(student, step, success) {
    const c = currentCriterion();
    if (!c) return;
    STORE.recordAttempt(db, student.id, c.id, step.level, step.mode, success, step.beyond);
    manualTargetId = null;
    render();
  }
  function markTarget(success) {
    const t = target();
    if (t) mark(t.student, t.step, success);
  }

  // ── pattern notation, floating at the top of every view ────────────────

  function renderNotationBar() {
    const c = currentCriterion();
    el.notationBar.innerHTML = '';
    if (!c) return;
    const levelCueMap = {};
    cued.forEach(function (entry, i) {
      const lvl = entry.step.level;
      (levelCueMap[lvl] = levelCueMap[lvl] || []).push(i);
    });
    LEVELS.forEach(function (level) {
      if (c.levels[level] <= 0) return;
      const panel = document.createElement('div');
      panel.className = 'lsa-notation-panel';
      const label = document.createElement('div');
      label.className = 'lsa-notation-label';
      label.textContent = LEVEL_NAMES[level] + ' (' + level + ')';
      panel.appendChild(label);
      const svgId = 'lsa-notation-svg-' + level;
      const svgWrap = document.createElement('div');
      svgWrap.className = 'lsa-notation-svg';
      svgWrap.id = svgId;
      panel.appendChild(svgWrap);
      if (levelCueMap[level]) {
        const badges = document.createElement('div');
        badges.className = 'lsa-notation-cue-badges';
        levelCueMap[level].forEach(function (i) {
          const b = document.createElement('span');
          b.className = 'lsa-ordinal lsa-o' + (i + 1);
          b.textContent = String(i + 1);
          badges.appendChild(b);
        });
        panel.appendChild(badges);
      }
      el.notationBar.appendChild(panel);
      NOTATION.renderLevel(svgId, c, level);
    });

    // Keep the shared "establish tonality" button (present on every tonal tool
    // site-wide) in tune with whatever criterion is on screen.
    if (c.register === 'tonal' && window.Tonality) {
      const key = NOTATION.keyForCriterion(c);
      if (key) window.Tonality.setFromKey(key, 'lsa');
    }
  }

  // The button is injected asynchronously by establish-button.js (it needs
  // Tonality + MusicAudio to exist first) — only show it while looking at tonal
  // patterns, matching how it behaves on every other tonal tool on the site.
  function updateEstablishButton() {
    const btn = document.getElementById('establish-tonality-btn');
    if (btn) btn.style.display = prefs.register === 'tonal' ? '' : 'none';
  }

  // ── mini seat-location map (built on every card; CSS shows it phone-only) ──

  function buildMiniMap(student) {
    const wrap = document.createElement('div');
    wrap.className = 'lsa-mini-map';
    const occupied = {};
    db.students.forEach(function (s) { if (s.seat) occupied[s.seat.row + ',' + s.seat.col] = true; });
    for (let r = 0; r < ROWS; r++) {
      for (let cl = 0; cl < COLS; cl++) {
        const cell = document.createElement('div');
        const isMe = student.seat && student.seat.row === r && student.seat.col === cl;
        cell.className = 'lsa-mini-cell' + (isMe ? ' lsa-mini-me' : (occupied[r + ',' + cl] ? ' lsa-mini-occupied' : ''));
        wrap.appendChild(cell);
      }
    }
    return wrap;
  }

  // E/M/D pip row: │ marks a successful teaching-mode duet, ✕ marks a successful
  // solo evaluation — same convention as the paper register book. Always renders all
  // three slots in a fixed order (M in the middle) even when a tier doesn't apply to
  // this criterion, so the row lines up identically everywhere it's used (card grid,
  // phone view, seating chart).
  function buildLevelPips(student, criterion) {
    const wrap = document.createElement('div');
    wrap.className = 'lsa-levels';
    LEVELS.forEach(function (level) {
      const pipWrap = document.createElement('div');
      pipWrap.className = 'lsa-pip-wrap';
      const lab = document.createElement('span');
      lab.className = 'lsa-pip-label';
      lab.textContent = level;
      pipWrap.appendChild(lab);
      const pip = document.createElement('div');
      if (criterion.levels[level] > 0) {
        const cell = STORE.getCell(db, student.id, criterion.id, level);
        const state = cell && cell.achieved ? 'achieved' : cell && cell.taught ? 'taught' : 'empty';
        pip.className = 'lsa-pip lsa-' + state;
        if (cell && cell.beyond) pip.classList.add('lsa-beyond-flag');
        pip.textContent = state === 'achieved' ? '✕' : state === 'taught' ? '│' : level;
      } else {
        pip.className = 'lsa-pip lsa-na';
      }
      pipWrap.appendChild(pip);
      wrap.appendChild(pipWrap);
    });
    return wrap;
  }

  // ── card builder, shared by the card grid and the phone view ──────────

  function buildCard(student, criterion, cuedIdx) {
    const tier = STORE.aptitudeTier(student.aptitude);
    const step = ENGINE.nextStep(db, student, criterion);
    const met = ENGINE.hasMetPotential(db, student, criterion);

    const card = document.createElement('div');
    card.className = 'lsa-card';
    card.tabIndex = 0;
    card.dataset.studentId = student.id;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', student.name);
    if (cuedIdx === 0) card.classList.add('lsa-cued-1');
    else if (cuedIdx === 1) card.classList.add('lsa-cued-2');

    if (cuedIdx === 0 || cuedIdx === 1) {
      const ribbon = document.createElement('div');
      ribbon.className = 'lsa-cue-ribbon';
      ribbon.innerHTML = '<span class="lsa-ordinal lsa-o' + (cuedIdx + 1) + '">' + (cuedIdx + 1) + '</span>' +
        (cuedIdx === 0 ? 'Up next' : 'On deck');
      card.appendChild(ribbon);
    }

    const head = document.createElement('div');
    head.className = 'lsa-card-head';
    const name = document.createElement('span');
    name.className = 'lsa-name';
    name.textContent = student.name;
    head.appendChild(name);
    const badge = document.createElement('span');
    badge.className = 'lsa-aptitude ' + aptClass(tier);
    badge.title = 'Aptitude percentile: ' + student.aptitude;
    badge.textContent = tier === 'high' ? 'High' : tier === 'low' ? 'Low' : 'Avg';
    head.appendChild(badge);
    card.appendChild(head);

    card.appendChild(buildLevelPips(student, criterion));

    if (prefs.showCounts) {
      const counts = document.createElement('div');
      counts.className = 'lsa-counts';
      const parts = LEVELS.filter(function (l) { return criterion.levels[l] > 0; }).map(function (l) {
        const cell = STORE.getCell(db, student.id, criterion.id, l);
        return l + ' ' + (cell ? cell.teach : 0) + 't·' + (cell ? cell.evalN : 0) + 'e';
      });
      counts.textContent = parts.join('   ');
      card.appendChild(counts);
    }

    card.appendChild(buildMiniMap(student));

    const due = document.createElement('div');
    if (step) {
      due.className = 'lsa-due ' + (step.beyond ? 'lsa-due-beyond' : 'lsa-due-active');
      due.textContent = (step.beyond ? 'Beyond: ' : '') + LEVEL_NAMES[step.level] + ' — ' +
        (step.mode === 'teach' ? 'Teach' : 'Evaluate');
    } else {
      due.className = 'lsa-due lsa-due-done';
      due.textContent = met ? 'Potential met ✓' : 'Nothing due';
    }
    card.appendChild(due);

    const actions = document.createElement('div');
    actions.className = 'lsa-actions';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'lsa-btn lsa-yes';
    yes.textContent = '✓ Success';
    yes.disabled = !step;
    yes.addEventListener('click', function () { if (step) mark(student, step, true); });
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'lsa-btn lsa-no';
    no.textContent = '✗ Not yet';
    no.disabled = !step;
    no.addEventListener('click', function () { if (step) mark(student, step, false); });
    actions.appendChild(yes);
    actions.appendChild(no);
    card.appendChild(actions);

    return card;
  }

  function cuedIndexOf(studentId) {
    for (let i = 0; i < cued.length; i++) if (cued[i].student.id === studentId) return i;
    return -1;
  }

  // ── card grid view ──────────────────────────────────────────────────

  function renderCardsView() {
    const c = currentCriterion();
    el.grid.innerHTML = '';
    if (!c) { el.grid.innerHTML = '<p class="lsa-empty">No criteria match this filter.</p>'; return; }
    el.criterionMeta.textContent = c.label + ' — ' + c.patternCount + ' patterns (family "' + c.familyKey + '")';
    db.students.forEach(function (student) {
      el.grid.appendChild(buildCard(student, c, cuedIndexOf(student.id)));
    });
  }

  function renderCueStatus() {
    if (!cued.length) { el.cueStatus.innerHTML = 'Everyone is on track for this criterion.'; return; }
    const parts = cued.map(function (entry, i) {
      const label = (entry.step.beyond ? 'Beyond: ' : '') + LEVEL_NAMES[entry.step.level] + ' · ' +
        (entry.step.mode === 'teach' ? 'Teach' : 'Evaluate');
      return '<span class="lsa-ordinal lsa-o' + (i + 1) + '">' + (i + 1) + '</span> <b>' +
        escapeHtml(entry.student.name) + '</b> — ' + escapeHtml(label);
    });
    el.cueStatus.innerHTML = 'Cued: ' + parts.join('&nbsp;&nbsp;&nbsp;then&nbsp;&nbsp;&nbsp;') +
      '. <kbd>Enter</kbd> marks success, <kbd>Backspace</kbd> marks not yet, for whoever is cued ①.';
  }

  // ── phone view: only the cued students, each with its mini-map ────────

  function renderPhoneView() {
    const c = currentCriterion();
    el.phoneGrid.innerHTML = '';
    if (!c) { el.phoneGrid.innerHTML = '<p class="lsa-empty">No criteria match this filter.</p>'; return; }
    if (!cued.length) { el.phoneGrid.innerHTML = '<p class="lsa-empty">Everyone is on track for this criterion.</p>'; return; }
    cued.forEach(function (entry, idx) {
      el.phoneGrid.appendChild(buildCard(entry.student, c, idx));
    });
  }

  // ── seating chart view (iPad) ───────────────────────────────────────

  function seatBounds() {
    let minRow = ROWS, maxRow = -1, minCol = COLS, maxCol = -1;
    db.students.forEach(function (s) {
      if (!s.seat) return;
      minRow = Math.min(minRow, s.seat.row); maxRow = Math.max(maxRow, s.seat.row);
      minCol = Math.min(minCol, s.seat.col); maxCol = Math.max(maxCol, s.seat.col);
    });
    if (maxRow < 0) return { minRow: 0, maxRow: ROWS - 1, minCol: 0, maxCol: COLS - 1 };
    return {
      minRow: Math.max(0, minRow - 1), maxRow: Math.min(ROWS - 1, maxRow + 1),
      minCol: Math.max(0, minCol - 1), maxCol: Math.min(COLS - 1, maxCol + 1),
    };
  }

  function renderSeatingView() {
    const c = currentCriterion();
    const bounds = prefs.fit === 'grid' ? { minRow: 0, maxRow: ROWS - 1, minCol: 0, maxCol: COLS - 1 } : seatBounds();
    const nRows = bounds.maxRow - bounds.minRow + 1;
    const nCols = bounds.maxCol - bounds.minCol + 1;
    el.seatingGrid.style.gridTemplateColumns = 'repeat(' + nCols + ', 9rem)';
    el.seatingGrid.style.gridTemplateRows = 'repeat(' + nRows + ', 7.6rem)';
    el.seatingGrid.innerHTML = '';

    const seatMap = {};
    db.students.forEach(function (s) { if (s.seat) seatMap[s.seat.row + ',' + s.seat.col] = s; });
    const tgt = target();

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let cl = bounds.minCol; cl <= bounds.maxCol; cl++) {
        const student = seatMap[r + ',' + cl];
        const seat = document.createElement('div');
        if (!student) {
          seat.className = 'lsa-seat lsa-seat-empty';
          el.seatingGrid.appendChild(seat);
          continue;
        }
        const cuedIdx = cuedIndexOf(student.id);
        seat.className = 'lsa-seat';
        if (cuedIdx === 0) seat.classList.add('lsa-cued-1');
        else if (cuedIdx === 1) seat.classList.add('lsa-cued-2');
        if (tgt && tgt.student.id === student.id) seat.classList.add('lsa-seat-target');

        if (cuedIdx === 0 || cuedIdx === 1) {
          const ribbon = document.createElement('div');
          ribbon.className = 'lsa-cue-ribbon';
          ribbon.innerHTML = '<span class="lsa-ordinal lsa-o' + (cuedIdx + 1) + '">' + (cuedIdx + 1) + '</span>';
          seat.appendChild(ribbon);
        }

        // PDF convention (Illustration 5): a line above the name for high aptitude,
        // a line below for low, no line for average — not a colored badge here.
        const tier = STORE.aptitudeTier(student.aptitude);
        const name = document.createElement('div');
        name.className = 'lsa-seat-name' +
          (tier === 'high' ? ' lsa-line-above' : tier === 'low' ? ' lsa-line-below' : '');
        name.title = 'Aptitude percentile: ' + student.aptitude;
        name.textContent = student.name;
        seat.appendChild(name);

        if (c) seat.appendChild(buildLevelPips(student, c));

        seat.addEventListener('click', function () {
          manualTargetId = student.id;
          render();
        });

        el.seatingGrid.appendChild(seat);
      }
    }

    const t = target();
    el.seatTargetLabel.textContent = t
      ? 'Marking ' + t.student.name + ' — ' + (t.step.beyond ? 'Beyond: ' : '') +
        LEVEL_NAMES[t.step.level] + ' · ' + (t.step.mode === 'teach' ? 'Teach' : 'Evaluate')
      : 'Everyone is on track for this criterion.';
    el.seatYes.disabled = !t;
    el.seatNo.disabled = !t;
    el.fitToggle.textContent = prefs.fit === 'grid' ? 'Zoom to fit class' : 'Zoom to fit grid (8×5)';
  }

  // ── top-level render dispatcher ────────────────────────────────────────

  function render() {
    recomputeCued();
    renderNotationBar();

    const phone = isPhone();
    const showSeating = !phone && prefs.view === 'seating';
    const showCards = !phone && prefs.view === 'cards';

    el.toolbarWrap.style.display = showSeating ? 'none' : '';
    el.cueStatus.style.display = showCards ? '' : 'none';
    el.cardsView.style.display = showCards ? '' : 'none';
    el.seatingView.style.display = showSeating ? '' : 'none';
    el.phoneGrid.style.display = phone ? '' : 'none';

    if (showSeating) renderSeatingView();
    else if (phone) renderPhoneView();
    else renderCardsView();

    if (showCards) renderCueStatus();
    updateEstablishButton();
  }

  // ── events ────────────────────────────────────────────────────────────

  el.register.value = prefs.register;
  el.register.addEventListener('change', function () {
    prefs.register = el.register.value;
    prefs.criterionId = null;
    manualTargetId = null;
    populateCriterionSelect();
    prefs.criterionId = currentCriterion() ? currentCriterion().id : null;
    savePrefs();
    render();
  });

  el.criterion.addEventListener('change', function () {
    prefs.criterionId = el.criterion.value;
    manualTargetId = null;
    savePrefs();
    render();
  });

  el.showCounts.checked = prefs.showCounts;
  el.showCounts.addEventListener('change', function () {
    prefs.showCounts = el.showCounts.checked;
    savePrefs();
    render();
  });

  function setView(view) {
    prefs.view = view;
    savePrefs();
    el.viewCards.classList.toggle('lsa-active', view === 'cards');
    el.viewSeating.classList.toggle('lsa-active', view === 'seating');
    render();
  }
  el.viewCards.classList.toggle('lsa-active', prefs.view === 'cards');
  el.viewSeating.classList.toggle('lsa-active', prefs.view === 'seating');
  el.viewCards.addEventListener('click', function () { setView('cards'); });
  el.viewSeating.addEventListener('click', function () { setView('seating'); });
  el.seatingExit.addEventListener('click', function () { setView('cards'); });

  el.fitToggle.addEventListener('click', function () {
    prefs.fit = prefs.fit === 'grid' ? 'class' : 'grid';
    savePrefs();
    renderSeatingView();
  });
  el.seatYes.addEventListener('click', function () { markTarget(true); });
  el.seatNo.addEventListener('click', function () { markTarget(false); });

  el.resetBtn.addEventListener('click', function () {
    if (!confirm('Reset all LSA evaluation data back to the seeded demo class? This cannot be undone.')) return;
    db = STORE.resetDB();
    manualTargetId = null;
    render();
  });

  // Enter = success, Backspace = not yet, always for whoever is currently targeted
  // (the manually clicked seat, or otherwise the first cued student) — no need to
  // focus anything first.
  document.addEventListener('keydown', function (e) {
    const ae = document.activeElement;
    const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA');
    if (typing) return;
    if (e.key === 'Enter') { markTarget(true); e.preventDefault(); }
    else if (e.key === 'Backspace') { markTarget(false); e.preventDefault(); }
  });

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  // establish-button.js creates its button on DOMContentLoaded/load, which may run
  // after our own initial render() — catch it once it exists so visibility is right
  // from the start even if the page opens on the rhythm register.
  document.addEventListener('DOMContentLoaded', updateEstablishButton);
  window.addEventListener('load', updateEstablishButton);

  // ── init ──────────────────────────────────────────────────────────────
  populateCriterionSelect();
  render();
})();
