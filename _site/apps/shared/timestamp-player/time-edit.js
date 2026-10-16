/* Timestamp Notes: the pencil beside a time. Click it and the time becomes a box:
     - type a time (1:23, 01:23.4, 83.4) and press Return;
     - or press any other key (a letter, Tab ...), or a key on the MIDI keyboard, and the time is taken from the playhead,
       then and there (live.js hands a MIDI note's time to TsTimeEdit.grab);
     - Space plays and pauses meanwhile (to hear where you are), ↑ ↓ nudge the time by a tenth of a second,
       Escape leaves it as it was.
   TsTimeEdit.pencil({ get: () => seconds, set: seconds => void, label }) -> a <button> to put beside the time.
   Only one box is open at a time; TsTimeEdit.busy() says whether one is (a list redrawing waits for it). */
(function () {
  "use strict";
  var open = null;

  function api() { var p = document.querySelector('.btp'); return p && p._btp; }
  function fmt(t) {
    var m = Math.floor(t / 60), x = t - m * 60;
    return String(m).padStart(2, '0') + ':' + x.toFixed(1).padStart(4, '0');
  }
  // "MM:SS(.s)", "H:MM:SS", or plain seconds
  function parse(text) {
    var parts = String(text).trim().split(':');
    if (!parts.length || parts.some(function (p) { return p === '' || isNaN(Number(p)); })) return NaN;
    return parts.map(Number).reduce(function (acc, n) { return acc * 60 + n; }, 0);
  }
  var TYPING = /^[0-9:.]$/;
  var EDITING = { Backspace: 1, Delete: 1, ArrowLeft: 1, ArrowRight: 1, Home: 1, End: 1, Shift: 1, Control: 1, Alt: 1, Meta: 1, CapsLock: 1 };

  function edit(btn, o) {
    if (open) open.finish(false);
    var t0 = o.get(), box = document.createElement('input');
    box.type = 'text'; box.className = 'btp-time-edit'; box.spellcheck = false;
    box.value = isFinite(t0) ? fmt(t0) : '';
    box.title = 'Type a time and press Return, or press any other key to take the playhead’s time. Space plays and pauses; ↑ ↓ nudge; Esc leaves it.';
    box.setAttribute('aria-label', (o.label || 'Time') + ': type a time, or press a letter to take the playhead’s');
    btn.hidden = true;
    btn.parentNode.insertBefore(box, btn.nextSibling);
    box.focus(); box.select();
    var done = false, say = function (text) { var e = document.querySelector('.btp .btp-err'); if (e) { e.textContent = text; setTimeout(function () { if (e.textContent === text) e.textContent = ''; }, 2500); } };
    var me = {
      finish: function (keep, at) {
        if (done) return; done = true;
        var t = at != null ? at : parse(box.value);
        box.remove(); btn.hidden = false; open = null;
        if (keep && isFinite(t) && t >= 0 && !(isFinite(t0) && Math.abs(t - t0) < 0.0005)) { o.set(Math.round(t * 1000) / 1000); say('Moved to ' + fmt(t)); }
        else if (keep && !isFinite(t)) say('That is not a time: try 1:23 or 01:23.4');
      }
    };
    open = me;
    box.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) return;               // copy, paste, select all
      if (e.key === 'Enter') { e.preventDefault(); me.finish(true); return; }
      if (e.key === 'Escape') { e.preventDefault(); me.finish(false); return; }
      if (e.key === ' ') { e.preventDefault(); var a = api(); if (a) a.toggle(); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        var v = parse(box.value); if (!isFinite(v)) v = isFinite(t0) ? t0 : 0;
        box.value = fmt(Math.max(0, v + (e.key === 'ArrowUp' ? 0.1 : -0.1)));
        return;
      }
      if (TYPING.test(e.key) || EDITING[e.key]) return;
      // anything else: the playhead's time, now
      e.preventDefault();
      var p = api(), now = p && p.time();
      if (typeof now !== 'number') { say('Nothing is playing: type the time instead.'); return; }
      me.finish(true, now);
    });
    box.addEventListener('blur', function () { setTimeout(function () { me.finish(true); }, 0); });
  }

  function pencil(o) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btp-pencil'; b.textContent = '✎';
    b.title = 'Correct this time: type it, or press a letter as the playhead reaches it';
    b.setAttribute('aria-label', 'Correct ' + (o.label || 'this time'));
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); edit(b, o); });
    return b;
  }

  // a MIDI key while a box is open: its time (latency taken off), instead of a bar or a chord
  function grab(t) { if (!open || typeof t !== 'number') return false; open.finish(true, t); return true; }
  window.TsTimeEdit = { pencil: pencil, busy: function () { return !!open; }, grab: grab, parse: parse, fmt: fmt };
})();
