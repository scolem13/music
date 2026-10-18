/* Timestamp Notes: every part folds, and the sidebar on the right jumps to them -- as across the site (lessons/sections.js,
   the Notation page's nav): a click opens a folded part, scrolls to it and flashes it; Shift+click also folds every other
   part. Open all / Fold all. Which parts are folded is remembered.

   A part is any .ts-panel with an id and a data-nav label: a <details> (its summary folds it), or anything else with a
   .ts-fold-h header that folds its .ts-fold-body (the log, the words being played, which can't be <details>: they stay
   in view as the page scrolls). */
(function () {
  "use strict";
  var KEY = 'ts-folds';

  function boot() {
    var nav = document.querySelector('.ts-nav');
    if (!nav) return;
    var shut = {};
    try { shut = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var list = nav.querySelector('ul'), links = {};
    // every part moves between the two columns (panel-columns.js), first, so the sidebar lists them where they are
    if (window.PanelColumns) PanelColumns.init({ columns: [document.querySelector('.btp-main'), document.querySelector('.btp-side')],
      panels: '.ts-panel[id][data-nav]', key: 'ts-columns', reset: nav.querySelector('.ts-reset-cols') });
    var panels = Array.prototype.slice.call(document.querySelectorAll('.ts-panel[id][data-nav]'));
    if (!panels.length) return;

    function isOpen(p) { return p.tagName === 'DETAILS' ? p.open : !p.classList.contains('is-shut'); }
    function remember(p) { shut[p.id] = !isOpen(p); try { localStorage.setItem(KEY, JSON.stringify(shut)); } catch (e) {} links[p.id].classList.toggle('is-shut', !isOpen(p)); }
    function set(p, open) {
      if (p.tagName === 'DETAILS') p.open = open;          // (its toggle event remembers it)
      else { p.classList.toggle('is-shut', !open); var h = p.querySelector('.ts-fold-h'); if (h) h.setAttribute('aria-expanded', String(open)); remember(p); }
      if (open) window.dispatchEvent(new Event('resize'));
    }
    function jump(p) {
      set(p, true);
      p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      p.classList.add('is-lit'); setTimeout(function () { p.classList.remove('is-lit'); }, 1400);
    }

    panels.forEach(function (p) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + p.id; a.textContent = p.dataset.nav; a.dataset.for = p.id;
      a.title = 'Shift+click: open this and fold every other part';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (e.shiftKey) panels.forEach(function (o) { if (o !== p) set(o, false); });
        jump(p);
      });
      li.appendChild(a); list.appendChild(li); links[p.id] = a;
      if (p.tagName === 'DETAILS') p.addEventListener('toggle', function () { remember(p); });
      else {
        var h = p.querySelector('.ts-fold-h');
        if (h) {
          h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0');
          h.addEventListener('click', function (e) { if (e.target.closest('a, button, input, .pc-tools')) return; set(p, !isOpen(p)); });
          h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); set(p, !isOpen(p)); } });
        }
      }
      if (shut[p.id] != null) set(p, !shut[p.id]);
      else links[p.id].classList.toggle('is-shut', !isOpen(p));
    });
    nav.querySelectorAll('[data-all]').forEach(function (b) {
      b.addEventListener('click', function () { var open = b.dataset.all === 'open'; panels.forEach(function (p) { set(p, open); }); b.blur(); });
    });

    // a part moved to the other column: the list follows the page's order (left column, then right)
    document.addEventListener('panelcolumns:move', function () {
      panels.slice().sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; })
        .forEach(function (p) { list.appendChild(links[p.id].parentNode); });
    });

    // the part at the top of the screen is marked in the sidebar
    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
        var first = panels.filter(function (p) { return seen[p.id]; })[0];
        panels.forEach(function (p) { links[p.id].classList.toggle('is-here', !!first && first === p); });
      }, { rootMargin: '-80px 0px -40% 0px' });
      panels.forEach(function (p) { io.observe(p); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
