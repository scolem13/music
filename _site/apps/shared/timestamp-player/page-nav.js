/* Timestamp Notes: each part folds (the triangle in its header; remembered in localStorage "ts-folds") and can be hidden
   (it leaves the page), and the sidebar on the right lists every part:
   a click shows a hidden part, scrolls to it and flashes it; Shift+click shows it and hides every other part; the eye beside
   each name hides or shows it. Show all / Hide all. Which parts are hidden is remembered (localStorage "ts-hidden").

   A part is any .ts-panel with an id and a data-nav label: a <details> (its summary folds it) or anything with a .ts-fold-h
   header that folds its .ts-fold-body. Each header gets a × that hides the part. */
(function () {
  "use strict";
  var KEY = 'ts-hidden';

  function boot() {
    var nav = document.querySelector('.ts-nav');
    if (!nav) return;
    var hidden = {};
    try { hidden = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var shut = {};
    try { shut = JSON.parse(localStorage.getItem('ts-folds') || '{}') || {}; } catch (e) {}
    function isOpen(p) { return p.tagName === 'DETAILS' ? p.open : !p.classList.contains('is-shut'); }
    function fold(p, open) {
      if (p.tagName === 'DETAILS') p.open = open;
      else { p.classList.toggle('is-shut', !open); var h = p.querySelector('.ts-fold-h'); if (h) h.setAttribute('aria-expanded', String(open)); }
      shut[p.id] = !open;
      try { localStorage.setItem('ts-folds', JSON.stringify(shut)); } catch (e) {}
      if (open) window.dispatchEvent(new Event('resize'));
    }
    var list = nav.querySelector('ul'), links = {}, eyes = {};
    // every part moves between the two columns (panel-columns.js), first, so the sidebar lists them where they are
    if (window.PanelColumns) PanelColumns.init({ columns: [document.querySelector('.btp-main'), document.querySelector('.btp-side')],
      panels: '.ts-panel[id][data-nav]', key: 'ts-columns', reset: nav.querySelector('.ts-reset-cols') });
    var panels = Array.prototype.slice.call(document.querySelectorAll('.ts-panel[id][data-nav]:not(.ts-none)'));   // .ts-none: a part with nothing to show on this page (tsn-notation.js)
    if (!panels.length) return;

    function shown(p) { return !p.classList.contains('ts-hidden'); }
    function set(p, show) {
      p.classList.toggle('ts-hidden', !show);
      p.hidden = !show;
      hidden[p.id] = !show;
      try { localStorage.setItem(KEY, JSON.stringify(hidden)); } catch (e) {}
      links[p.id].classList.toggle('is-shut', !show);
      eyes[p.id].textContent = show ? '×' : '+';
      eyes[p.id].title = show ? 'Hide this part' : 'Show this part';
      if (show) window.dispatchEvent(new Event('resize'));
    }
    function jump(p) {
      set(p, true); if (!isOpen(p)) fold(p, true);
      p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      p.classList.add('is-lit'); setTimeout(function () { p.classList.remove('is-lit'); }, 1400);
    }

    panels.forEach(function (p) {
      var li = document.createElement('li'), a = document.createElement('a'), eye = document.createElement('button');
      a.href = '#' + p.id; a.textContent = p.dataset.nav; a.dataset.for = p.id;
      a.title = 'Show it and go there · Shift+click: show only this part';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (e.shiftKey) panels.forEach(function (o) { if (o !== p) set(o, false); });
        jump(p);
      });
      eye.type = 'button'; eye.className = 'ts-eye';
      eye.addEventListener('click', function () { set(p, !shown(p)); eye.blur(); });
      li.appendChild(a); li.appendChild(eye); list.appendChild(li); links[p.id] = a; eyes[p.id] = eye;

      // the header folds the part; its × hides it
      var head = p.tagName === 'DETAILS' ? p.querySelector(':scope > summary') : p.querySelector('.ts-fold-h');
      if (p.tagName === 'DETAILS') {
        p.addEventListener('toggle', function () { if (shown(p)) fold(p, p.open); });
        if (head) head.addEventListener('click', function (e) { if (e.target.closest('a, button, input, select, .pc-tools')) e.preventDefault(); });
      } else if (head) {
        head.setAttribute('role', 'button'); head.setAttribute('tabindex', '0');
        head.addEventListener('click', function (e) { if (e.target.closest('a, button, input, select, .pc-tools')) return; fold(p, !isOpen(p)); });
        head.addEventListener('keydown', function (e) { if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); fold(p, !isOpen(p)); } });
      }
      if (head) {
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'ts-hide'; x.textContent = '×'; x.title = 'Hide this part (the list on the right brings it back)';
        x.setAttribute('aria-label', 'Hide ' + p.dataset.nav);
        x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); set(p, false); });
        head.appendChild(x);
      }
      if (shut[p.id] != null && shut[p.id] === isOpen(p)) fold(p, !shut[p.id]);
      set(p, !hidden[p.id]);
    });
    nav.querySelectorAll('[data-all]').forEach(function (b) {
      b.addEventListener('click', function () { var show = b.dataset.all === 'show'; panels.forEach(function (p) { set(p, show); }); b.blur(); });
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
        var first = panels.filter(function (p) { return seen[p.id] && shown(p); })[0];
        panels.forEach(function (p) { links[p.id].classList.toggle('is-here', !!first && first === p); });
      }, { rootMargin: '-80px 0px -40% 0px' });
      panels.forEach(function (p) { io.observe(p); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
