// soundfont.js — resolves the best available soundfont CDN at load time.
// Primary: jsDelivr (multi-CDN, highly available).
// Fallback: paulrosen.github.io (original host, occasionally slow/down).
//
// Usage: getSoundfontUrl().then(function(url) { ... });
(function (w) {
  'use strict';
  var PRIMARY  = 'https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/';
  var FALLBACK = 'https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/';

  var _p = null;

  w.getSoundfontUrl = function () {
    if (_p) return _p;
    _p = Promise.race([
      fetch(PRIMARY + 'acousticgrandpiano-mp3.js', { method: 'HEAD' })
        .then(function (r) { return r.ok ? PRIMARY : Promise.reject(); }),
      new Promise(function (_, rej) { setTimeout(rej, 3000); })
    ]).catch(function () { return FALLBACK; });
    return _p;
  };
})(window);
