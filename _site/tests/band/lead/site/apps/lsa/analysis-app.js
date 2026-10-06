// apps/lsa/analysis-app.js — Data Analysis page controller.
// Requires curriculum.js, store.js, prompt-engine.js to already be loaded.

(function () {
  'use strict';

  const STORE = window.LSA_STORE;
  const ENGINE = window.LSA_ENGINE;
  const LEVELS = window.LSA_LEVELS;
  const CRITERIA = window.LSA_CRITERIA;

  const db = STORE.getDB();

  const el = {
    stats: document.getElementById('lsa-stats'),
    bars: document.getElementById('lsa-bars'),
    filterRegister: document.getElementById('lsa-filter-register'),
    filterText: document.getElementById('lsa-filter-text'),
    filterTouched: document.getElementById('lsa-filter-touched'),
    critTable: document.getElementById('lsa-criteria-tbody'),
    studentTable: document.getElementById('lsa-student-tbody'),
    rawTable: document.getElementById('lsa-raw-tbody'),
    exportBtn: document.getElementById('lsa-export-btn'),
    resetBtn: document.getElementById('lsa-reset-btn'),
  };

  let critSort = { key: 'unit', dir: 1 };

  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffMin < 60 * 24) return Math.round(diffMin / 60) + 'h ago';
    return d.toLocaleDateString();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // ── stat tiles + balance chart ─────────────────────────────────────────

  function criteriaTouchedCount() {
    let n = 0;
    CRITERIA.forEach(function (c) {
      const touched = db.students.some(function (s) { return db.records[s.id] && db.records[s.id][c.id]; });
      if (touched) n++;
    });
    return n;
  }

  function renderStats() {
    const totals = db.students.map(function (s) { return db.totals[s.id] || 0; });
    const grandTotal = totals.reduce(function (a, b) { return a + b; }, 0);
    const spread = totals.length ? Math.max.apply(null, totals) - Math.min.apply(null, totals) : 0;
    const touched = criteriaTouchedCount();

    const tiles = [
      { label: 'Total attempts', value: String(grandTotal), note: 'teach + evaluation, all students' },
      { label: 'Students', value: String(db.students.length), note: 'placeholder class' },
      { label: 'Criteria touched', value: touched + ' / ' + CRITERIA.length, note: 'have at least one attempt' },
      { label: 'Time balance', value: String(spread), note: 'max − min attempts across students (aim low)' },
    ];
    el.stats.innerHTML = tiles.map(function (t) {
      return '<div class="lsa-tile"><div class="lsa-tile-label">' + t.label + '</div>' +
        '<div class="lsa-tile-value">' + t.value + '</div>' +
        '<div class="lsa-tile-note">' + t.note + '</div></div>';
    }).join('');
  }

  function renderBalanceChart() {
    const rows = db.students.map(function (s) { return { name: s.name, total: db.totals[s.id] || 0 }; });
    const max = Math.max.apply(null, rows.map(function (r) { return r.total; }).concat([1]));
    const avg = rows.reduce(function (a, r) { return a + r.total; }, 0) / (rows.length || 1);
    const avgPct = (avg / max) * 100;

    el.bars.innerHTML = rows.map(function (r) {
      const pct = (r.total / max) * 100;
      return '<div class="lsa-bar-row">' +
        '<div class="lsa-bar-name">' + escapeHtml(r.name) + '</div>' +
        '<div class="lsa-bar-track">' +
          '<div class="lsa-bar-fill" style="width:' + pct + '%"></div>' +
          '<div class="lsa-bar-avg" style="left:' + avgPct + '%"></div>' +
        '</div>' +
        '<div class="lsa-bar-value">' + r.total + '</div>' +
      '</div>';
    }).join('') +
    '<div class="lsa-bar-row"><div></div><div style="position:relative;">' +
      '<span class="lsa-bar-avg-label" style="left:' + avgPct + '%">avg ' + avg.toFixed(1) + '</span>' +
    '</div><div></div></div>';
  }

  // ── criterion achievement table ────────────────────────────────────────

  function criterionRows() {
    return CRITERIA.map(function (c) {
      const stats = ENGINE.criterionStats(db, db.students, c);
      return { c: c, stats: stats };
    });
  }

  function filteredCriterionRows() {
    const reg = el.filterRegister.value;
    const text = el.filterText.value.trim().toLowerCase();
    const onlyTouched = el.filterTouched.checked;
    return criterionRows().filter(function (row) {
      if (row.c.register !== reg) return false;
      if (onlyTouched) {
        const touched = db.students.some(function (s) { return db.records[s.id] && db.records[s.id][row.c.id]; });
        if (!touched) return false;
      }
      if (text) {
        const hay = (row.c.label + ' ' + row.c.familyKey).toLowerCase();
        if (hay.indexOf(text) === -1) return false;
      }
      return true;
    });
  }

  function sortRows(rows) {
    const key = critSort.key, dir = critSort.dir;
    rows.sort(function (a, b) {
      let av, bv;
      if (key === 'pct') { av = a.stats.pct; bv = b.stats.pct; }
      else if (key === 'register') { av = a.c.register; bv = b.c.register; }
      else { av = a.c.book * 10000 + a.c.unit * 100 + a.c.section.charCodeAt(0) * 10 + a.c.criterion; bv = b.c.book * 10000 + b.c.unit * 100 + b.c.section.charCodeAt(0) * 10 + b.c.criterion; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function renderCriteriaTable() {
    const rows = sortRows(filteredCriterionRows());
    if (!rows.length) {
      el.critTable.innerHTML = '<tr><td colspan="7" class="lsa-empty">No criteria match this filter.</td></tr>';
      return;
    }
    el.critTable.innerHTML = rows.map(function (row) {
      const c = row.c, s = row.stats;
      return '<tr>' +
        '<td>' + c.registerLabel + '</td>' +
        '<td>Bk' + c.book + '</td>' +
        '<td>' + c.unit + '</td>' +
        '<td>§' + c.section + '·C' + c.criterion + '</td>' +
        '<td class="lsa-num">' + c.patternCount + '</td>' +
        '<td><div class="lsa-meter-cell"><div class="lsa-meter"><div class="lsa-meter-fill' +
          (s.readyToAdvance ? ' lsa-ready' : '') + '" style="width:' + s.pct + '%"></div></div>' +
          '<span class="lsa-meter-pct">' + s.pct + '%</span></div></td>' +
        '<td>' + (s.readyToAdvance ? '<span class="lsa-pill lsa-ready">Ready to advance</span>' : '<span class="lsa-pill">' + s.achieved + '/' + s.total + '</span>') + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── per-student table ───────────────────────────────────────────────────

  function renderStudentTable() {
    const rows = db.students.map(function (student) {
      let teach = 0, evalN = 0, met = 0, touchedCriteria = 0;
      CRITERIA.forEach(function (c) {
        const rec = db.records[student.id] && db.records[student.id][c.id];
        if (rec) {
          touchedCriteria++;
          LEVELS.forEach(function (l) { if (rec[l]) { teach += rec[l].teach; evalN += rec[l].evalN; } });
        }
        if (ENGINE.hasMetPotential(db, student, c)) met++;
      });
      return { student: student, teach: teach, evalN: evalN, total: db.totals[student.id] || 0, met: met, touchedCriteria: touchedCriteria };
    });
    el.studentTable.innerHTML = rows.map(function (r) {
      const tier = STORE.aptitudeTier(r.student.aptitude);
      return '<tr>' +
        '<td>' + escapeHtml(r.student.name) + '</td>' +
        '<td><span class="lsa-pill">' + (tier === 'high' ? 'High' : tier === 'low' ? 'Low' : 'Avg') + ' · ' + r.student.aptitude + '</span></td>' +
        '<td class="lsa-num">' + r.teach + '</td>' +
        '<td class="lsa-num">' + r.evalN + '</td>' +
        '<td class="lsa-num">' + r.total + '</td>' +
        '<td class="lsa-num">' + r.met + ' / ' + CRITERIA.length + '</td>' +
        '<td class="lsa-num">' + fmtTime(db.lastGiven[r.student.id]) + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── raw data ─────────────────────────────────────────────────────────

  function renderRawTable() {
    const rows = [];
    db.students.forEach(function (student) {
      const byCrit = db.records[student.id];
      if (!byCrit) return;
      Object.keys(byCrit).forEach(function (critId) {
        const c = window.LSA_CRITERIA_BY_ID[critId];
        LEVELS.forEach(function (level) {
          const cell = byCrit[critId][level];
          if (!cell || (cell.teach === 0 && cell.evalN === 0)) return;
          rows.push({
            student: student.name, criterion: c ? c.label : critId, level: level,
            teach: cell.teach, evalN: cell.evalN, taught: cell.taught, achieved: cell.achieved, beyond: cell.beyond,
          });
        });
      });
    });
    if (!rows.length) {
      el.rawTable.innerHTML = '<tr><td colspan="7" class="lsa-empty">No attempts recorded yet — mark some progress on the Evaluation Chart page.</td></tr>';
      return;
    }
    el.rawTable.innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td>' + escapeHtml(r.student) + '</td>' +
        '<td>' + escapeHtml(r.criterion) + '</td>' +
        '<td>' + r.level + (r.beyond ? ' <span class="lsa-pill">beyond</span>' : '') + '</td>' +
        '<td class="lsa-num">' + r.teach + '</td>' +
        '<td class="lsa-num">' + r.evalN + '</td>' +
        '<td>' + (r.taught ? '✓' : '—') + '</td>' +
        '<td>' + (r.achieved ? '✓' : '—') + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderAll() {
    renderStats();
    renderBalanceChart();
    renderCriteriaTable();
    renderStudentTable();
    renderRawTable();
  }

  // ── events ──────────────────────────────────────────────────────────

  el.filterRegister.addEventListener('change', renderCriteriaTable);
  el.filterText.addEventListener('input', renderCriteriaTable);
  el.filterTouched.addEventListener('change', renderCriteriaTable);

  document.querySelectorAll('#lsa-criteria-thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      const key = th.dataset.sort;
      if (critSort.key === key) critSort.dir *= -1; else { critSort.key = key; critSort.dir = 1; }
      renderCriteriaTable();
    });
  });

  el.exportBtn.addEventListener('click', function () {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lsa-data-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  el.resetBtn.addEventListener('click', function () {
    if (!confirm('Reset all LSA evaluation data back to the seeded demo class? This cannot be undone.')) return;
    STORE.resetDB();
    location.reload();
  });

  renderAll();
})();
