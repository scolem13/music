/* The big clock in a part of its own (#ts-clock), out of the Player: it folds and moves between the columns like any
   part (panel-columns.js), and Float lifts it over the page to drag anywhere. player.js finds the clock inside .btp when it
   starts, so it is moved here only after that (player.js keeps its own reference). */
(function () {
  "use strict";
  var KEY = 'btp-clock-float';

  function boot() {
    var panel = document.getElementById('ts-clock'), box = panel && panel.querySelector('.ts-bigclock');
    var clock = document.querySelector('.btp .btp-clock');
    if (!box || !clock) return;
    box.appendChild(clock);

    var btn = panel.querySelector('.ts-clock-float'), head = panel.querySelector('summary');
    if (!btn) return;
    function setFloat(on, pos) {
      panel.classList.toggle('is-floating', on);
      btn.textContent = on ? 'Pin' : 'Float';
      btn.title = on ? 'Put it back in its column' : 'Float it over the page, to drag anywhere';
      if (on) {
        pos = pos || { x: window.innerWidth - 380, y: 80 };
        panel.style.left = Math.max(0, Math.min(pos.x, window.innerWidth - 120)) + 'px';
        panel.style.top = Math.max(0, Math.min(pos.y, window.innerHeight - 60)) + 'px';
      } else { panel.style.left = panel.style.top = ''; }
    }
    function keep() {
      try {
        localStorage.setItem(KEY, JSON.stringify(panel.classList.contains('is-floating')
          ? { x: parseFloat(panel.style.left) || 0, y: parseFloat(panel.style.top) || 0 } : null));
      } catch (e) {}
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();       // not a fold
      setFloat(!panel.classList.contains('is-floating')); keep(); btn.blur();
    });
    // drag by the heading while floating
    head.addEventListener('pointerdown', function (e) {
      if (!panel.classList.contains('is-floating') || e.target.closest('button')) return;
      var r = panel.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, moved = false;
      function move(ev) {
        moved = true;
        panel.style.left = Math.max(0, Math.min(ev.clientX - dx, window.innerWidth - 120)) + 'px';
        panel.style.top = Math.max(0, Math.min(ev.clientY - dy, window.innerHeight - 40)) + 'px';
      }
      function up() {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
        if (moved) {
          keep();
          head.addEventListener('click', function stop(ev) { ev.preventDefault(); head.removeEventListener('click', stop, true); }, true);
        }
      }
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
    try { var kept = JSON.parse(localStorage.getItem(KEY) || 'null'); if (kept) setFloat(true, kept); } catch (e) {}
  }

  // after player.js's own DOMContentLoaded start
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
