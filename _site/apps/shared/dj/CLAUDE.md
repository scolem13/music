# Sampling and DJ lessons

- The Sampling and DJ lessons (`lessons/sampling-*.qmd`, six: what a sample is to the law; `lessons/dj-*.qmd`, seven: gear to a set;
  sidebar parts Sampling, DJing; include `lessons/_dj-kit.qmd`): `apps/shared/dj/turntables.js` (`Turntables`; `<div class="dj-tt" data-a data-b
  data-decks data-show>`, documented at its top): two decks (an AudioWorklet each: platter drag = scratch, rim = nudge, motor spin-up, pitch
  ±8/±16 % moving the key, cue, waveform, BPM / Tap, key + Camelot) and a mixer (gain, 3-band EQ with kill, filter, cue, faders, crossfader
  with curve, phones mix / split cue / Listen). `apps/shared/dj/sampler-pads.js` (`SamplerPads`; `<div class="sp-pads" data-loop data-slice>`):
  16 pads from a loop (equal / beats / at the hits, chops draggable), keys ZXCV…1234 and MIDI 36–51, repitch or OLA stretch per pad, a
  recorded, quantized pattern; a Multi-sample mode (menu, or `data-kind="multi"`: key zones, velocity layers, round robin, files named
  `Piano_C#3_soft_rr2.wav`; demo plucked string; Sampling 3). Built-in loops are synthesised offline (`Turntables.DEMOS`, `demo:<id>`). Songs from elsewhere (the R2 hook):
  `Turntables.TRACK_SOURCES`; a manifest JSON named by `window.DJ_CONFIG.manifest`, `<meta name="dj-manifest">`, `data-manifest` or
  `Turntables.addManifest(url)` lists tracks (url relative to it), fetched CORS (the bucket needs a GET CORS rule); `Turntables.load(deck,
  src)` takes those, URLs, files, buffers. Both register with AudioTap. Test: `node tests/lessons/dj.cdp.js` (after rendering them).
