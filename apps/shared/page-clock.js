// PageClock: where a page's player is in the bar, so the navbar metronome (practice-widgets.js) can lock to it.
//
// A player that is sounding registers a getter:   PageClock.add(key, fn)   and removes it when it stops:   PageClock.remove(key)
// fn() returns null (nothing sounding yet) or, for the beat heard right now and the one after it:
//   { beats,       // beats in the bar now (the meter's top number; a compound meter counts dotted beats)
//     beat,        // which one is sounding, from 0
//     bpm,         // the beats' tempo now (for display)
//     nextIn,      // seconds until the next beat starts (Infinity: no more beats, e.g. the final chord)
//     nextBeat,    // that next beat's number in its bar (0 at a barline)
//     nextBeats,   // and the beats in that bar (a meter change shows here, a bar ahead)
//     countIn }    // optional: true during a count-in
// PageClock.now() -> the latest registered player's answer (null if none); PageClock.active() -> true if any player is registered.
// PageClock.onChange(cb) is called (with active()) when a player starts or stops.
// Players: BandPlayer (band/player.js, `clock`), so every page whose band plays through it. Loaded site-wide from _includes/practice-widgets.html.
(function (global) {
  if (global.PageClock) return;
  var srcs = [], subs = [];
  function fire() { var a = srcs.length > 0; subs.slice().forEach(function (f) { try { f(a); } catch (e) {} }); }
  global.PageClock = {
    add: function (key, fn) { this.remove(key, true); srcs.push({ key: key, fn: fn }); fire(); },
    remove: function (key, quiet) { var n = srcs.length; srcs = srcs.filter(function (s) { return s.key !== key; }); if (!quiet && srcs.length !== n) fire(); },
    now: function () { for (var i = srcs.length - 1; i >= 0; i--) { var r = null; try { r = srcs[i].fn(); } catch (e) {} if (r) return r; } return null; },
    active: function () { return srcs.length > 0; },
    onChange: function (cb) { subs.push(cb); }
  };
})(window);
