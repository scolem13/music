// apps/lsa/directory-app.js — LSA Directory page controller.
// A read-only, browsable catalog of every criterion parsed out of the site's tonal
// and rhythm pattern libraries by curriculum.js. No progress data lives here — that's
// the Evaluation Chart and Data Analysis pages; this page just answers "what LSAs
// exist and where do I find/practice them."

(function () {
  'use strict';

  const CRITERIA = window.LSA_CRITERIA;

  const el = {
    register: document.getElementById('lsa-dir-register'),
    text: document.getElementById('lsa-dir-text'),
    count: document.getElementById('lsa-dir-count'),
    tbody: document.getElementById('lsa-dir-tbody'),
    thead: document.getElementById('lsa-dir-thead'),
  };

  let sort = { key: 'unit', dir: 1 };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function tcParam(familyKey) {
    const json = JSON.stringify({ collections: [familyKey], lockCollections: true });
    return 'tc=' + encodeURIComponent(btoa(json));
  }

  function practiceHref(c) {
    const page = c.register === 'tonal' ? '/practice/patterns.html' : '/practice/rhythms.html';
    return page + '?' + tcParam(c.familyKey);
  }

  function chartHref(c) {
    return '/teacher/lsa-chart.html?criterion=' + encodeURIComponent(c.id);
  }

  function sortKey(c) {
    return c.register === 'tonal' ? 0 : 1;
  }

  function filtered() {
    const reg = el.register.value;
    const text = el.text.value.trim().toLowerCase();
    return CRITERIA.filter(function (c) {
      if (reg !== 'all' && c.register !== reg) return false;
      if (text && (c.label + ' ' + c.familyKey).toLowerCase().indexOf(text) === -1) return false;
      return true;
    });
  }

  function sortRows(rows) {
    const key = sort.key, dir = sort.dir;
    rows.sort(function (a, b) {
      let av, bv;
      if (key === 'register') { av = sortKey(a); bv = sortKey(b); }
      else if (key === 'patterns') { av = a.patternCount; bv = b.patternCount; }
      else { av = a.book * 10000 + a.unit * 100 + a.section.charCodeAt(0) * 10 + a.criterion; bv = b.book * 10000 + b.unit * 100 + b.section.charCodeAt(0) * 10 + b.criterion; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function levelCell(n) {
    return n > 0 ? String(n) : '—';
  }

  function render() {
    const rows = sortRows(filtered());
    el.count.textContent = rows.length + ' of ' + CRITERIA.length + ' criteria';
    if (!rows.length) {
      el.tbody.innerHTML = '<tr><td colspan="9" class="lsa-empty">No criteria match this filter.</td></tr>';
      return;
    }
    el.tbody.innerHTML = rows.map(function (c) {
      return '<tr>' +
        '<td>' + c.registerLabel + '</td>' +
        '<td>Bk' + c.book + '</td>' +
        '<td>' + c.unit + '</td>' +
        '<td>§' + c.section + ' · C' + c.criterion + '</td>' +
        '<td class="lsa-num">' + c.patternCount + '</td>' +
        '<td class="lsa-num">' + levelCell(c.levels.E) + '</td>' +
        '<td class="lsa-num">' + levelCell(c.levels.M) + '</td>' +
        '<td class="lsa-num">' + levelCell(c.levels.D) + '</td>' +
        '<td style="color:var(--site-ink-3);font-family:var(--font-mono);font-size:.78rem;">' + escapeHtml(c.familyKey) + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<a class="lsa-btn" style="padding:.2rem .55rem;font-size:.78rem;" href="' + practiceHref(c) + '">Practice</a> ' +
          '<a class="lsa-btn" style="padding:.2rem .55rem;font-size:.78rem;" href="' + chartHref(c) + '">Mark</a>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  el.register.addEventListener('change', render);
  el.text.addEventListener('input', render);
  el.thead.querySelectorAll('th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      const key = th.dataset.sort;
      if (sort.key === key) sort.dir *= -1; else { sort.key = key; sort.dir = 1; }
      render();
    });
  });

  render();
})();
