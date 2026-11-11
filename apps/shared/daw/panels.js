// panels.js — the scratch-pad DAW's parts as folding, movable panels (MiniDaw.Panels). Opt-in: data-panels on the .mdaw div (tools/daw.qmd); lesson DAWs are unchanged.
// Needs apps/shared/panel-columns.js (PanelColumns) and panel-columns.css. Loaded after mini-daw.js; mini-daw.js's build() calls Panels.build(daw) at its end.
//
// Each part of the DAW (Projects, Transport, Session view, Arrangement, Editor, Track sound, Edit as notation, Fill from chords, Mixer, Session players, Files) goes into a
// <details class="mdaw-panel"> with a header; two columns: the main one, and a second that stays hidden until a part is dragged there (grip) or sent there (⇄), which is the sidebar.
// Volume automation, effects, sends / returns and the organ / synth sit inside Arrangement, Mixer and Track sound; record and the loop are in Transport.
// Saved per DAW id: the layout by PanelColumns in localStorage "mdaw:<id>:panels", which panels are folded in "mdaw:<id>:panelopen". "Reset layout" forgets both and reloads (PanelColumns' way).
// It all stays inside the DAW's own element, so full screen (the ⛶ button on tools/daw.qmd) keeps it. A panel whose part is hidden (the Session view in Arrangement view,
// the track panel on an audio track) is hidden too (CSS :has).
(function (global) {
  "use strict";
  var M = global.MiniDaw; if (!M || !M.core) return;
  var el = M.core.el, btn = M.core.btn, P = M.Panels = {};
  var PARTS = [['.mdaw-projects', 'Projects', 'projects'], ['.mdaw-transport', 'Transport', 'transport'], ['.mdaw-session', 'Session view', 'session'], ['.mdaw-arr', 'Arrangement', 'arr'],
    ['.mdaw-editor', 'Editor: piano roll / step grid', 'editor'], ['.mdaw-trackpanel', 'Track sound: organ, effects, sends, synth', 'sound'], ['.mdaw-abc', 'Edit as notation', 'abc'],
    ['.mdaw-fill', 'Fill from chords', 'fill'], ['.mdaw-mixer', 'Mixer', 'mixer'], ['.mdaw-band', 'Session players: the band writes the parts', 'band'], ['.mdaw-files', 'Files, export, record', 'files']];
  var SIDE = { projects: 1, sound: 1, abc: 1, fill: 1, band: 1, files: 1 };      // in the right-hand column until moved
  var TOP = { transport: 1, session: 1, arr: 1 };                                                // always full width, above the two columns
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } }
  function keep(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  P.build = function (d) {
    var n = d.node, openKey = 'mdaw:' + d.id + ':panelopen', layoutKey = 'mdaw:' + d.id + ':panels', hideKey = 'mdaw:' + d.id + ':panelhide', saved = load(openKey), hid = load(hideKey), panels = [];
    var lay = el('div', 'mdaw-layout'), main = el('div', 'mdaw-layoutmain'), top = el('div', 'mdaw-top'), wrap = el('div', 'mdaw-cols'), a = el('div', 'mdaw-colA'), b = el('div', 'mdaw-colB'), slot = el('div', 'mdaw-navslot');
    wrap.appendChild(a); wrap.appendChild(b); main.appendChild(top); main.appendChild(wrap); lay.appendChild(main); lay.appendChild(slot);
    PARTS.forEach(function (x) {
      var part = n.querySelector(x[0]); if (!part) return; var pn;
      if (part.tagName === 'DETAILS') { pn = part; pn.classList.add('mdaw-panel'); }
      else { pn = el('details', 'mdaw-panel'); pn.open = true; var sm = el('summary', null, x[1]); pn.appendChild(sm); part.parentNode.insertBefore(pn, part); pn.appendChild(part); }
      pn.id = d.id + '-pn-' + x[2]; pn.dataset.panel = x[2]; pn._name = x[1]; if (saved[x[2]] != null) pn.open = !!saved[x[2]];
      pn.addEventListener('toggle', function () { var o = load(openKey); o[x[2]] = pn.open; keep(openKey, o); if (pn._link) pn._link.classList.toggle('is-shut', !pn.open); });
      if (TOP[x[2]]) { pn.classList.add('mdaw-fixed'); top.appendChild(pn); } else (SIDE[x[2]] ? b : a).appendChild(pn);
      if (hid[x[2]]) pn.classList.add('mdaw-hid'); panels.push(pn);
    });
    var bar = el('div', 'mdaw-panelbar'); bar.appendChild(el('span', 'mdaw-lbl', 'Panels'));
    var bFold = btn('Fold all', 'Fold every panel'), bUnfold = btn('Unfold all', 'Open every panel'), bShow = btn('Show all', 'Show every hidden panel'), bReset = btn('Reset layout', 'Put every panel back where it started, all open and shown');
    bFold.onclick = function () { panels.forEach(function (p) { p.open = false; }); }; bUnfold.onclick = function () { panels.forEach(function (p) { p.open = true; }); };
    bShow.onclick = function () { panels.forEach(function (p) { setHid(p, false); }); };
    bReset.onclick = function () { try { localStorage.removeItem(openKey); localStorage.removeItem(hideKey); } catch (e) {} };      // (PanelColumns forgets the layout and reloads)
    [bFold, bUnfold, bShow, bReset].forEach(function (x) { bar.appendChild(x); }); bar.appendChild(el('span', 'mdaw-hint', 'Transport and the arrangement stay on top, full width. Drag a panel\'s ⠿ to move it, ⇄ sends it to the other column; click its name to fold it; the list of parts (in the sidebar) jumps to one, and its eye hides it.'));
    n.appendChild(bar); n.appendChild(lay); d.panelsEl = wrap;
    if (global.PanelColumns) global.PanelColumns.init({ columns: [a, b], panels: 'details.mdaw-panel:not(.mdaw-fixed)', key: layoutKey, reset: bReset });
    // ---- the list of parts: jump to one (opens it), eye = hide / show; in the page's "On this page" sidebar, inside the DAW in full screen
    var nav = d.partsNav = el('nav', 'mdaw-parts'); nav.setAttribute('aria-label', 'Parts of the DAW');
    nav.appendChild(el('p', 'mdaw-parts-h', 'DAW parts')); var ul = el('ul'); nav.appendChild(ul);
    nav.appendChild(el('p', 'mdaw-parts-tip', 'Click: jump to it (Shift+click: fold the rest). 👁: hide or show it.'));
    function setHid(p, on) { p.classList.toggle('mdaw-hid', on); var o = load(hideKey); if (on) o[p.dataset.panel] = 1; else delete o[p.dataset.panel]; keep(hideKey, o);
      if (p._eye) { p._eye.textContent = on ? '◌' : '👁'; p._eye.setAttribute('aria-pressed', String(!on)); p._eye.title = (on ? 'Show ' : 'Hide ') + p._name; } if (p._li) p._li.classList.toggle('is-hid', on); if (!on) global.dispatchEvent(new Event('resize')); }
    P.jump = function (p) { setHid(p, false); p.open = true; p.scrollIntoView({ behavior: 'smooth', block: 'start' }); p.classList.add('is-lit'); setTimeout(function () { p.classList.remove('is-lit'); }, 1400); };
    function list() {
      ul.innerHTML = ''; panels.slice().sort(function (x, y) { return x.compareDocumentPosition(y) & 4 ? -1 : 1; }).forEach(function (p) {
        var li = p._li = el('li'), lk = p._link = el('a', null, p._name.split(':')[0]), eye = p._eye = el('button', 'mdaw-eye'); lk.href = '#' + p.id; eye.type = 'button';
        lk.onclick = function (e) { e.preventDefault(); if (e.shiftKey) panels.forEach(function (o) { if (o !== p && !o.classList.contains('mdaw-fixed')) o.open = false; }); P.jump(p); };
        eye.onclick = function () { setHid(p, !p.classList.contains('mdaw-hid')); };
        lk.classList.toggle('is-shut', !p.open); li.appendChild(eye); li.appendChild(lk); ul.appendChild(li); setHid(p, p.classList.contains('mdaw-hid'));
        li.hidden = getComputedStyle(p).display === 'none' && !p.classList.contains('mdaw-hid');      // a part this DAW does not show (e.g. Session view in Arrangement view)
      });
    }
    list(); document.addEventListener('panelcolumns:move', list); n.addEventListener('click', function () { setTimeout(list, 0); });
    var toc = document.getElementById('TOC') || document.getElementById('quarto-margin-sidebar');
    function place() { var fs = document.fullscreenElement === n; if (fs || !toc) { if (nav.parentNode !== slot) slot.appendChild(nav); } else if (nav.parentNode !== toc) toc.insertBefore(nav, toc.firstChild); n.classList.toggle('mdaw-navin', fs || !toc); }
    place(); document.addEventListener('fullscreenchange', place);
  };
})(typeof window !== "undefined" ? window : globalThis);
