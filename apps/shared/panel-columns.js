/* PanelColumns: the large tools' two columns (Timestamp Notes, the Notation page), with every part movable between them.

   PanelColumns.init({ columns: [leftEl, rightEl], panels: '.sel', key: 'localStorage key', reset: buttonEl? })
     columns  the two column elements
     panels   a selector for the movable parts (each needs an id); its header is its <summary> or its .ts-fold-h.
              A part is a child of a column, or of a group inside one (Timestamp Notes' .btp-words, .btp-barmap ...).
     key      where the arrangement is kept
     reset    a button that forgets it (and reloads the page, so every part is back where the page has it)

   Each header gets a grip (drag it onto the other column, or up and down its own) and a ⇄ button (straight across, to
   the top of the other column). After a move it fires 'resize' on window, so scores and grids lay themselves out
   again, and 'panelcolumns:move' on the part.

   A part taken out of its group goes into a shell, <div class="pc-shell" + the group's classes>, so it keeps the
   group's styling; a script that looks inside its group finds it with PanelColumns.q / qa (root, selector), and one
   that looks for the group itself uses '.group:not(.pc-shell)'. */
(function () {
  "use strict";

  function shells(root) {
    return Array.prototype.filter.call(document.querySelectorAll('.pc-shell'), function (s) { return s._pcHome === root; });
  }
  function q(root, sel) {
    var el = root.querySelector(sel);
    if (el) return el;
    var ss = shells(root);
    for (var i = 0; i < ss.length; i++) { el = ss[i].querySelector(sel); if (el) return el; }
    return null;
  }
  function qa(root, sel) {
    return shells(root).reduce(function (all, s) { return all.concat(Array.prototype.slice.call(s.querySelectorAll(sel))); },
      Array.prototype.slice.call(root.querySelectorAll(sel)));
  }

  function init(o) {
    var cols = (o.columns || []).filter(Boolean);
    if (cols.length !== 2) return null;
    var all = cols.reduce(function (a, c) { return a.concat(Array.prototype.slice.call(c.querySelectorAll(o.panels))); }, [])
      .filter(function (p) { return p.id; });
    var groups = [];
    all.forEach(function (p) {
      p._pcHome = p.parentNode;
      if (cols.indexOf(p._pcHome) < 0 && groups.indexOf(p._pcHome) < 0) groups.push(p._pcHome);
    });
    var byId = {}; all.forEach(function (p) { byId[p.id] = p; });

    // what goes into a column to carry a part: the part itself (one that belongs to no group), or its shell
    function carrier(p) {
      if (cols.indexOf(p._pcHome) >= 0) return p;
      if (p.parentNode.classList.contains('pc-shell')) return p.parentNode;
      var s = document.createElement('div');
      s.className = 'pc-shell ' + p._pcHome.className;
      s._pcHome = p._pcHome;
      p.parentNode.insertBefore(s, p); s.appendChild(p);
      return s;
    }
    function tidy() {
      Array.prototype.slice.call(document.querySelectorAll('.pc-shell')).forEach(function (s) { if (!s.querySelector(o.panels)) s.remove(); });
      groups.forEach(function (g) { g.classList.toggle('pc-emptied', !g.querySelector(o.panels)); });
      cols.forEach(function (c) { c.classList.toggle('pc-empty', !c.querySelector(o.panels)); });
    }
    function token(el) {
      if (el.classList.contains('pc-shell')) { var p = el.querySelector(o.panels); return p && p.id; }
      var g = groups.indexOf(el);
      if (g >= 0) return 'g:' + g;
      return el.id && byId[el.id] ? el.id : null;
    }
    function save() {
      var now = cols.map(function (c) { return Array.prototype.map.call(c.children, token).filter(Boolean); });
      try { localStorage.setItem(o.key, JSON.stringify(now)); } catch (e) {}
    }
    function moved(p) {
      tidy();
      if (p) p.dispatchEvent(new CustomEvent('panelcolumns:move', { bubbles: true, detail: { column: cols.indexOf(carrierCol(p)) } }));
      window.dispatchEvent(new Event('resize'));
    }
    function carrierCol(p) { var el = p; while (el && cols.indexOf(el.parentNode) < 0) el = el.parentNode; return el && el.parentNode; }

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(o.key) || 'null'); } catch (e) {}
    if (saved && saved.length === 2) {
      saved.forEach(function (ts, i) {
        ts.forEach(function (t) {
          var el = /^g:\d+$/.test(t) ? groups[+t.slice(2)] : byId[t] && carrier(byId[t]);
          if (el) cols[i].appendChild(el);
        });
      });
      moved(null);
    } else tidy();

    var dragging = null, mark = document.createElement('div');
    mark.className = 'pc-drop-mark';

    all.forEach(function (p) {
      var head = p.tagName === 'DETAILS' ? p.querySelector(':scope > summary') : p.querySelector('.ts-fold-h');
      if (!head || head.querySelector('.pc-tools')) return;
      var tools = document.createElement('span'), grip = document.createElement('span'), across = document.createElement('button');
      tools.className = 'pc-tools';
      grip.className = 'pc-grip'; grip.textContent = '\u283F'; grip.draggable = true;
      grip.title = 'Drag to move this part (to the other column, or up and down)';
      across.type = 'button'; across.className = 'pc-across'; across.textContent = '\u21C4';
      across.title = 'Move to the other column'; across.setAttribute('aria-label', 'Move to the other column');
      tools.appendChild(grip); tools.appendChild(across); head.appendChild(tools);
      // (clicks here neither fold the part nor reach its header's own handlers)
      tools.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
      tools.addEventListener('keydown', function (e) { e.stopPropagation(); });
      across.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var to = cols[1 - cols.indexOf(carrierCol(p))];
        to.insertBefore(carrier(p), to.firstElementChild);
        save(); moved(p); across.blur();
        p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        p.classList.add('is-lit'); setTimeout(function () { p.classList.remove('is-lit'); }, 900);
      });
      grip.addEventListener('dragstart', function (e) {
        dragging = p; p.classList.add('pc-dragging'); document.body.classList.add('pc-moving');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.setDragImage(head, 20, 12); } catch (x) {}
      });
      grip.addEventListener('dragend', function () {
        if (dragging) dragging.classList.remove('pc-dragging');
        dragging = null; document.body.classList.remove('pc-moving');
        mark.remove();
      });
    });

    // where a drop would land: before the first column child (other than the one dragged) whose middle is below the pointer
    function before(c, y) {
      var own = dragging && dragging.parentNode.classList.contains('pc-shell') ? dragging.parentNode : dragging;
      var ks = Array.prototype.filter.call(c.children, function (el) {
        return el !== mark && el !== own && el.offsetParent !== null && token(el);
      });
      for (var i = 0; i < ks.length; i++) {
        var r = ks[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return ks[i];
      }
      return null;
    }
    cols.forEach(function (c) {
      c.addEventListener('dragover', function (e) {
        if (!dragging) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        var at = before(c, e.clientY);
        if (mark.parentNode !== c || mark.nextElementSibling !== at) c.insertBefore(mark, at);
      });
      c.addEventListener('drop', function (e) {
        if (!dragging) return;
        e.preventDefault();
        var p = dragging, at = before(c, e.clientY);
        mark.remove();
        c.insertBefore(carrier(p), at);
        save(); moved(p);
      });
    });

    if (o.reset) o.reset.addEventListener('click', function () {
      try { localStorage.removeItem(o.key); } catch (e) {}
      location.reload();
    });
    return { save: save };
  }

  window.PanelColumns = { init: init, q: q, qa: qa };
})();
