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
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } }
  function keep(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  P.build = function (d) {
    var n = d.node, openKey = 'mdaw:' + d.id + ':panelopen', layoutKey = 'mdaw:' + d.id + ':panels', saved = load(openKey), panels = [];
    var wrap = el('div', 'mdaw-cols'), a = el('div', 'mdaw-colA'), b = el('div', 'mdaw-colB'); wrap.appendChild(a); wrap.appendChild(b);
    PARTS.forEach(function (x) {
      var part = n.querySelector(x[0]); if (!part) return; var pn;
      if (part.tagName === 'DETAILS') { pn = part; pn.classList.add('mdaw-panel'); }
      else { pn = el('details', 'mdaw-panel'); pn.open = true; var sm = el('summary', null, x[1]); pn.appendChild(sm); part.parentNode.insertBefore(pn, part); pn.appendChild(part); }
      pn.id = d.id + '-pn-' + x[2]; pn.dataset.panel = x[2]; if (saved[x[2]] != null) pn.open = !!saved[x[2]];
      if (part.tagName !== 'DETAILS') pn.addEventListener('toggle', function () { var o = load(openKey); o[x[2]] = pn.open; keep(openKey, o); });
      else pn.addEventListener('toggle', function () { var o = load(openKey); o[x[2]] = pn.open; keep(openKey, o); });
      a.appendChild(pn); panels.push(pn);
    });
    var bar = el('div', 'mdaw-panelbar'); bar.appendChild(el('span', 'mdaw-lbl', 'Panels'));
    var bFold = btn('Fold all', 'Fold every panel'), bUnfold = btn('Unfold all', 'Open every panel'), bReset = btn('Reset layout', 'Put every panel back where it started, all open');
    bFold.onclick = function () { panels.forEach(function (p) { p.open = false; }); }; bUnfold.onclick = function () { panels.forEach(function (p) { p.open = true; }); };
    bReset.onclick = function () { try { localStorage.removeItem(openKey); } catch (e) {} };      // (PanelColumns forgets the layout and reloads)
    [bFold, bUnfold, bReset].forEach(function (x) { bar.appendChild(x); }); bar.appendChild(el('span', 'mdaw-hint', 'Drag a panel\'s ⠿ to move it, ⇄ sends it to the sidebar column and back; click its name to fold it.'));
    n.appendChild(bar); n.appendChild(wrap); d.panelsEl = wrap;
    if (global.PanelColumns) global.PanelColumns.init({ columns: [a, b], panels: 'details.mdaw-panel', key: layoutKey, reset: bReset });
  };
})(typeof window !== "undefined" ? window : globalThis);
