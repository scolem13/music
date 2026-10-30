/* Timestamp Notes — reveal.js-safe.
   Initialises every .btp block on the page; no-ops if there are none. */
(function () {
  "use strict";

  var ytApi = null;
  function loadYtApi() {
    if (ytApi) return ytApi;
    ytApi = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === "function") prev();
        resolve();
      };
      var s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = function () { reject(new Error("api")); };
      document.head.appendChild(s);
    });
    return ytApi;
  }

  function ytId(s) {
    s = String(s).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    var u;
    try { u = new URL(s); } catch (e) { return null; }
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) return null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    var m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
    return m ? m[2] : null;
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function initPlayer(root) {
    if (root._btp) return;      // (RecordingFollow.mount starts the ones it makes itself)
    var clock = root.querySelector(".btp-clock");
    var stage = root.querySelector(".btp-stage");
    var drop  = root.querySelector(".btp-drop");
    var err   = root.querySelector(".btp-err");
    var urlIn = root.querySelector(".btp-url");

    var getTime = null, ytPlayer = null, objectUrl = null, mediaEl = null;
    // with nothing loaded, a seek parks the playhead here (going to a section, the arrows): the grid and the words follow it
    var parked = null;

    function tick() {
      if (getTime) {
        var t = getTime();
        if (typeof t === "number") clock.textContent = fmt(t);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function reset() {
      err.textContent = "";
      getTime = null;
      mediaEl = null;
      if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) {} ytPlayer = null; }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      stage.innerHTML = "";
      stage.hidden = true;
      stage.classList.remove("is-audio");
      clock.textContent = "00:00";
      clock.classList.add("idle");
    }

    // ---- Speed: slower or faster, at the same pitch ----
    // A file (audio / video element) goes to any speed, preservesPitch on. YouTube's player keeps the pitch too, but only at its own
    // steps (0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2): the nearest is taken. Following a tab has its own Speed menu.
    // root._btpBpm = function (t) -> the recording's tempo at time t (the bar map), set by the page: then the row shows
    // the tempo it plays at, and a tempo typed there sets the speed.
    var rate = 1;
    var speedRow = document.createElement("div");
    speedRow.className = "btp-speed";
    speedRow.innerHTML = '<label>Speed <input class="btp-speed-range" type="range" min="25" max="150" step="5" value="100"></label>' +
      '<span class="btp-speed-pct">100%</span>' +
      '<label class="btp-speed-bpm" hidden>= <input class="btp-speed-bpm-in" type="number" min="20" max="400" step="1"> bpm</label>' +
      '<button type="button" class="btp-speed-reset" title="Back to the recording\'s own speed">1×</button>' +
      '<span class="btp-speed-note"></span>';
    var bar = root.querySelector(".btp-bar");
    if (bar && bar.parentNode) bar.parentNode.insertBefore(speedRow, bar.nextSibling); else root.appendChild(speedRow);
    var rangeIn = speedRow.querySelector(".btp-speed-range"), pctOut = speedRow.querySelector(".btp-speed-pct");
    var bpmWrap = speedRow.querySelector(".btp-speed-bpm"), bpmIn = speedRow.querySelector(".btp-speed-bpm-in");
    var speedNote = speedRow.querySelector(".btp-speed-note");
    function origBpm() { try { var b = root._btpBpm && root._btpBpm(getTime ? getTime() : 0); return b > 0 ? b : null; } catch (e) { return null; } }
    function applyRate() {
      speedNote.textContent = "";
      if (!mediaEl) return;
      try {
        if (mediaEl.setPlaybackRate) {                    // YouTube: its own steps
          var steps = mediaEl.getAvailablePlaybackRates ? mediaEl.getAvailablePlaybackRates() : [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          var best = steps.reduce(function (a, b) { return Math.abs(b - rate) < Math.abs(a - rate) ? b : a; }, 1);
          mediaEl.setPlaybackRate(best);
          if (Math.abs(best - rate) > 1e-6) { rate = best; speedNote.textContent = "YouTube plays only at its own steps: " + Math.round(best * 100) + "%."; }
        } else if ("playbackRate" in mediaEl && mediaEl.tagName) {
          mediaEl.preservesPitch = true; mediaEl.mozPreservesPitch = true; mediaEl.webkitPreservesPitch = true;
          mediaEl.playbackRate = rate;
        } else speedNote.textContent = "Following a tab: use its Speed menu above.";
      } catch (e) {}
      showRate();
    }
    function showRate() {
      rangeIn.value = String(Math.round(rate * 100));
      pctOut.textContent = Math.round(rate * 100) + "%";
      var b = origBpm();
      bpmWrap.hidden = !b;
      if (b && document.activeElement !== bpmIn) bpmIn.value = String(Math.round(b * rate));
    }
    function setRate(r) { rate = Math.max(0.25, Math.min(2, r)); applyRate(); }
    rangeIn.addEventListener("input", function () { setRate(+rangeIn.value / 100); });
    rangeIn.addEventListener("change", function () { rangeIn.blur(); });
    bpmIn.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") bpmIn.blur(); });
    bpmIn.addEventListener("change", function () { var b = origBpm(), v = +bpmIn.value; if (b && v > 0) setRate(v / b); });
    speedRow.querySelector(".btp-speed-reset").addEventListener("click", function () { setRate(1); this.blur(); });
    setInterval(showRate, 1000);                              // (the bar map's tempo changes as the recording moves)

    // What is loaded, for the log's export: { url } for YouTube (embedded or followed), { file } for a file.
    var source = null;

    function loadFile(file) {
      if (!file) return;
      reset();
      source = { file: file.name };
      objectUrl = URL.createObjectURL(file);
      playMedia(objectUrl);
    }
    // An audio or video at a URL (a recording in the collection: source { rec, title }).
    function loadMediaUrl(url, src) {
      reset();
      source = src || { media: url };
      playMedia(url, true);
    }
    function playMedia(url, quiet) {
      var v = document.createElement("video");
      v.src = url;
      v.controls = true;
      v.playsInline = true;
      v.addEventListener("error", function () {
        err.textContent = "Could not play that file — the browser may not support its codec.";
        if (!/^(blob|data):/.test(url)) fetch(url, { method: "HEAD", credentials: "include" }).then(function (r) {   // a URL: say why
          if (r.status === 401 || r.status === 403) err.textContent = "The recording needs the site login: open this page on music.seancoleman.org (logged in), not a local preview.";
          else if (r.status === 404) err.textContent = "That recording is not in the bucket (" + url + ").";
          else if (!r.ok) err.textContent = "The recording could not be loaded (" + r.status + ").";
        }).catch(function () { err.textContent = "The recording could not be reached. On a local preview it needs the site login, so open the page on music.seancoleman.org."; });
      });
      // audio only (no picture): just the controls bar, no empty video box
      v.addEventListener("loadedmetadata", function () { stage.classList.toggle("is-audio", !v.videoWidth); });
      stage.appendChild(v);
      stage.hidden = false;
      mediaEl = v;
      getTime = function () { return v.currentTime; };
      applyRate();
      clock.classList.remove("idle");
      drop.hidden = true;
      if (!quiet) v.play().catch(function () { /* autoplay may be blocked; controls are there */ });
    }

    function loadYouTube(id) {
      reset();
      source = { url: "https://www.youtube.com/watch?v=" + id };
      var host = document.createElement("div");
      stage.appendChild(host);
      stage.hidden = false;
      loadYtApi().then(function () {
        ytPlayer = new YT.Player(host, {
          videoId: id,
          playerVars: { playsinline: 1 },
          events: {
            onReady: function () {
              // YouTube's clock moves in steps of up to a quarter second, too
              // coarse for tapping bars. While it plays, the time is carried
              // on from the last step by the page's own clock.
              var lastT = null, lastAt = 0;
              getTime = function () {
                if (!ytPlayer || !ytPlayer.getCurrentTime) return null;
                var t = ytPlayer.getCurrentTime(), now = performance.now();
                if (t !== lastT) { lastT = t; lastAt = now; return t; }
                if (ytPlayer.getPlayerState() !== 1) return t;
                var rate = ytPlayer.getPlaybackRate ? ytPlayer.getPlaybackRate() : 1;
                return t + Math.min(1, (now - lastAt) / 1000) * rate;
              };
              clock.classList.remove("idle");
              mediaEl = ytPlayer;
              applyRate();
            },
            onError: function (e) {
              getTime = null;
              blocked(id, e && e.data);
            }
          }
        });
        drop.hidden = true;
      }, function () {
        err.textContent = "Couldn't load the YouTube player API — check the network connection.";
      });
    }

    // YouTube's error codes, in words. 101 and 150 are the same thing: the
    // owner, or a rights holder's Content ID rule, keeps it off this page.
    var YT_ERRORS = {
      2: "That isn't a valid video id.",
      5: "This browser can't play that video in a page.",
      100: "That video was removed or is private.",
      101: "The owner or a rights holder blocks this video from playing here.",
      150: "The owner or a rights holder blocks this video from playing here.",
      153: "YouTube couldn't tell which page asked for the video (no referrer sent)."
    };

    function blocked(id, code) {
      stage.innerHTML = "";
      var box = document.createElement("div");
      box.className = "btp-blocked";
      var p = document.createElement("p");
      p.textContent = (YT_ERRORS[code] || "YouTube wouldn't play that video here.") +
        " (error " + code + ")";
      box.appendChild(p);
      var go = document.createElement("button");
      go.type = "button";
      go.textContent = "Follow along in a YouTube tab";
      go.addEventListener("click", function () { follow(id); });
      box.appendChild(go);
      stage.appendChild(box);
      stage.hidden = false;
    }

    /* Following along: the video plays in YouTube's own tab, which this page
       can't see or steer, and the clock here is the page's own. Return starts
       and stops it (the log's key), [ and ] nudge it by a tenth of a second,
       and "Clock to" sets it outright. The thing standing in for the media
       element has the same paused / play / pause / seekTo shape, so the log
       and the bar map work on it unchanged -- except looping, which would
       need to move YouTube's playhead. */
    function follow(id) {
      reset();
      source = { url: "https://www.youtube.com/watch?v=" + id, follow: true };
      var watch = "https://www.youtube.com/watch?v=" + id;
      var clockState = { base: 0, at: 0, rate: 1 };
      var fake = {
        follow: true,
        paused: true,
        play: function () { if (this.paused) { clockState.at = performance.now(); this.paused = false; } },
        pause: function () { if (!this.paused) { clockState.base = now(); this.paused = true; } },
        seekTo: function (t) { clockState.base = Math.max(0, t); clockState.at = performance.now(); },
        // YouTube's tab cuts itself off from this page (its Cross-Origin-
        // Opener-Policy), so it can't be moved, reused or closed from here.
        // A jump opens a fresh tab at that second instead, and the clock
        // waits there for Return.
        openAt: function (t) {
          var at = Math.max(0, Math.floor(t));
          window.open(watch + "&t=" + at + "s", "_blank", "noopener");
          this.paused = true;
          clockState.base = at;
          err.textContent = "Opened at " + fmt(at) + " in a new tab: close the old one, and press Return when it plays.";
          return true;
        }
      };
      function now() {
        return clockState.base + (fake.paused ? 0
          : (performance.now() - clockState.at) / 1000 * clockState.rate);
      }
      function setRate(r) { var t = now(); clockState.rate = r; fake.seekTo(t); }

      var box = document.createElement("div");
      box.className = "btp-follow";
      box.innerHTML =
        '<p><b>Following a YouTube tab.</b> Put the two windows side by side. Pause the video at ' +
        'a time you can read, set the clock here to it, then start the video and press ' +
        '<kbd>Return</kbd> here at the same moment. <kbd>[</kbd> and <kbd>]</kbd> nudge ' +
        'the clock by 0.1 s. A jump opens a new tab at that time (this page can\'t move or close ' +
        'YouTube\'s tab, so close the old one yourself); looping happens in YouTube\'s tab.</p>' +
        '<div class="btp-follow-row">' +
        '<a class="btp-follow-open" target="_blank" rel="noopener">Open the video</a>' +
        '<label>Clock to <input class="btp-follow-to" type="text" placeholder="0:00" size="6"></label>' +
        '<button type="button" class="btp-follow-minus">−0.1 s</button>' +
        '<button type="button" class="btp-follow-plus">+0.1 s</button>' +
        '<label>Speed <select class="btp-follow-rate">' +
        '<option value="1">1×</option><option value="0.75">0.75×</option>' +
        '<option value="0.5">0.5×</option><option value="0.25">0.25×</option>' +
        '<option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>' +
        '</div>';
      box.querySelector(".btp-follow-open").href = watch;
      var to = box.querySelector(".btp-follow-to");
      to.addEventListener("keydown", function (e) {
        e.stopPropagation();                    // Enter sets the clock, not play/pause
        if (e.key !== "Enter") return;
        var parts = to.value.trim().split(":").map(Number);
        if (!parts.length || parts.some(isNaN)) return;
        fake.seekTo(parts.reduce(function (a, n) { return a * 60 + n; }, 0));
        to.blur();
      });
      box.querySelector(".btp-follow-minus").addEventListener("click", function () { fake.seekTo(now() - 0.1); });
      box.querySelector(".btp-follow-plus").addEventListener("click", function () { fake.seekTo(now() + 0.1); });
      var rate = box.querySelector(".btp-follow-rate");
      rate.addEventListener("change", function () { setRate(parseFloat(rate.value)); rate.blur(); });
      rate.addEventListener("keydown", function (e) { e.stopPropagation(); });

      stage.appendChild(box);
      stage.hidden = false;
      drop.hidden = true;
      mediaEl = fake;
      getTime = now;
      clock.classList.remove("idle");
      window.open(watch, "_blank", "noopener");
    }

    document.addEventListener("keydown", function (e) {
      if (!mediaEl || !mediaEl.follow || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && e.target.matches && e.target.matches("input, textarea, select")) return;
      if (e.key === "[" || e.key === "]") {
        mediaEl.seekTo(getTime() + (e.key === "]" ? 0.1 : -0.1));
        e.preventDefault();
      }
    });

    function loadUrl() {
      var id = ytId(urlIn.value);
      if (!id) { err.textContent = "That doesn't look like a YouTube link."; return; }
      loadYouTube(id);
    }

    root.querySelector(".btp-load").addEventListener("click", loadUrl);
    var followBtn = root.querySelector(".btp-follow-btn");
    if (followBtn) followBtn.addEventListener("click", function () {
      var id = ytId(urlIn.value);
      if (!id) { err.textContent = "Paste a YouTube link first."; return; }
      follow(id);
      followBtn.blur();
    });
    urlIn.addEventListener("keydown", function (e) {
      e.stopPropagation();                   // keep reveal's shortcuts out of the field
      if (e.key === "Enter") loadUrl();
    });
    root.querySelector(".btp-file").addEventListener("change", function (e) {
      loadFile(e.target.files[0]);
    });

    /* drag and drop, limited to this slide */
    ["dragenter", "dragover"].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    root.addEventListener("dragleave", function (e) {
      if (!root.contains(e.relatedTarget)) drop.classList.remove("over");
    });
    root.addEventListener("drop", function (e) {
      e.preventDefault();
      drop.classList.remove("over");
      var f = e.dataTransfer && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });

    function togglePlay() {
      if (!mediaEl) return false;
      try {
        if (mediaEl.getPlayerState) {            // youtube
          // 1 is PLAYING; anything else (paused, buffering, ended) starts it.
          if (mediaEl.getPlayerState() === 1) mediaEl.pauseVideo();
          else mediaEl.playVideo();
        } else if (mediaEl.paused) {
          mediaEl.play();
        } else {
          mediaEl.pause();
        }
        return true;
      } catch (e) { return false; }
    }

    function seekTo(seconds) {
      if (!isFinite(seconds)) return false;
      if (!mediaEl) { parked = Math.max(0, seconds); return true; }
      if (mediaEl.follow) return mediaEl.openAt(seconds);   // the playhead is in another tab
      try {
        if (mediaEl.seekTo) mediaEl.seekTo(seconds, true);   // youtube, or following one
        else mediaEl.currentTime = seconds;
        return true;
      } catch (e) { return false; }
    }

    /* What the page around the player can ask of it. The reveal deck uses
       none of this; it is here so a host page can add its own controls. */
    root._btp = {
      time: function () { return getTime ? getTime() : parked; },
      // the recording's length in seconds (NaN until it is known)
      duration: function () {
        try { var d = mediaEl && (mediaEl.getDuration ? mediaEl.getDuration() : mediaEl.duration); return d > 0 && isFinite(d) ? d : NaN; } catch (e) { return NaN; }
      },
      following: function () { return !!(mediaEl && mediaEl.follow); },
      playing: function () {
        if (!mediaEl) return false;
        try {
          return mediaEl.getPlayerState ? mediaEl.getPlayerState() === 1 : !mediaEl.paused;
        } catch (e) { return false; }
      },
      toggle: togglePlay,
      // the recording silent (still playing, so loops and bars go on): phrases.js's Play alone passes
      setMuted: function (on) {
        try { if (!mediaEl) return; if (mediaEl.mute) { if (on) mediaEl.mute(); else mediaEl.unMute(); } else mediaEl.muted = !!on; } catch (e) {}
      },
      rate: function () { return rate; },
      setRate: setRate,
      seek: seekTo,
      format: fmt,
      source: function () { return source; },
      // an audio file at a URL (the recordings collection): src is what the song file keeps as its source
      openMedia: function (url, src) { if (!url) return false; loadMediaUrl(url, src); return true; },
      // a YouTube link from an imported log: embedded, or followed in a tab as it was when saved
      open: function (url, inTab) {
        var id = ytId(url);
        if (!id) return false;
        urlIn.value = url;
        if (inTab) follow(id); else loadYouTube(id);
        return true;
      }
    };

    /* pause when the slide goes away, so audio doesn't follow you */
    root._btpPause = function () {
      if (!mediaEl) return;
      try {
        if (mediaEl.pauseVideo) mediaEl.pauseVideo();
        else if (mediaEl.pause) mediaEl.pause();
      } catch (e) {}
    };

    /* optional deep link: ?v=<url or id> */
    var q = new URLSearchParams(location.search).get("v");
    if (q) { urlIn.value = q; loadUrl(); }
  }

  window.TimestampPlayer = { init: initPlayer };

  function boot() {
    var roots = document.querySelectorAll(".btp");
    if (!roots.length) return;
    roots.forEach(initPlayer);

    /* Reveal may not have been created yet when this runs; wait briefly for it. */
    var tries = 0;
    (function hookReveal() {
      if (window.Reveal && Reveal.on) {
        Reveal.on("slidechanged", function (e) {
          document.querySelectorAll(".btp").forEach(function (r) {
            if (r._btpPause && (!e.currentSlide || !e.currentSlide.contains(r))) r._btpPause();
          });
        });
      } else if (tries++ < 50) {
        setTimeout(hookReveal, 100);
      }
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
