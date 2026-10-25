// syllable-detect.js — EXPERIMENTAL. Which rhythm syllable (Du De Da Di Ta) was chanted at each beat? Pure functions over a Float32Array and a
// sample rate (browser or Node). global SyllableDetect.
//   The idea: Du De Da Di differ by vowel (u e a i are far apart in F1/F2), and Ta differs from Da by aspiration (a /t/ release has ~40-70 ms of
//   breath before voicing starts; a /d/ voices within ~10-20 ms) and, on the page, by position (Ta only on divisions of the microbeat).
//   SyllableDetect.onsets(x, sr, opts)                   -> [seconds]    energy-rise onsets (consonant bursts count), 120 ms refractory
//   SyllableDetect.features(x, sr, t, nextT)             -> { f1, f2, periodicity, aspiration, voicedRms }   at one onset t (seconds)
//   SyllableDetect.analyze(x, sr, expected, opts)        -> { scale, onsets: [{ expected: {t, syl}, t, found, f1, f2, vowel, aspirated, heard, ok }], accuracy }
//        expected: [{ t, syl }] where t is the expected time of each onset in seconds in x; each is matched to the detected onset within opts.tol (0.12 s)
//        opts.scale: one of 1 / 1.16 / 1.3 (adult male / female / child formant scale) or null to choose the one that fits the whole take best.
//   SyllableDetect.lpcFormants(frame, sr)                -> [F1, F2, ...] peaks of the LPC envelope
(function (global) {
  "use strict";
  // vowel centroids, adult male Hz (the IPA chart table in apps/shared/ipa/ipa-synth.js): the same numbers the synthesiser uses
  var CENT = { u: [300, 750], e: [400, 2100], a: [760, 1080], i: [280, 2250] };
  var SCALES = [1, 1.16, 1.3];
  var MID_U = -14;                              // dB below F1's peak at 0.85-1.25 kHz above which the second peak is not F2 (see features)
  var SYL_OF = { u: "Du", e: "De", i: "Di" };

  function frameRms(x, a, b) { var s = 0; a = Math.max(0, a); b = Math.min(x.length, b); for (var i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }

  // energy-rise onsets: 5 ms hop, 10 ms window RMS (after a first difference so bursts count), rise of > 9 dB over the quietest of the last 40 ms
  function onsets(x, sr, opts) {
    opts = opts || {};
    var hop = Math.round(0.005 * sr), win = Math.round(0.010 * sr), pad = Math.round(0.06 * sr), env = [], i;
    var xp = new Float32Array(x.length + pad); xp.set(x, pad);                    // a little silence in front, so an onset at 0 is a rise too
    var n = Math.floor((xp.length - win) / hop);
    var d = new Float32Array(xp.length); for (i = 1; i < xp.length; i++) d[i] = xp[i] - 0.5 * xp[i - 1];
    for (i = 0; i < n; i++) env.push(Math.max(1e-6, frameRms(d, i * hop, i * hop + win)));
    var peak = Math.max.apply(null, env), floor = peak * (opts.floor || 0.03), out = [], last = -1;
    for (i = 9; i < n; i++) {
      var lo = Infinity; for (var k = 1; k <= 8; k++) lo = Math.min(lo, env[i - k]);
      if (env[i] > floor && env[i] > lo * 2.8 && (last < 0 || (i - last) * hop / sr > 0.12)) {
        var j = i; while (j > 0 && env[j - 1] > lo * 1.5 && env[j - 1] < env[j]) j--;       // walk back to the start of the rise
        out.push(Math.max(0, (j * hop + win / 2 - pad) / sr)); last = i;
      }
    }
    return out;
  }

  // Move a detected onset back to the true start of the sound: a /t/ is a burst, ~45 ms of breath, then the voice; the rise the detector found may
  // be the voice. Walk back in 2 ms steps while the (first-differenced) level of the frame before is above 3% of the loudest frame in the next 100 ms.
  function refine(x, sr, t) {
    var step = Math.round(0.002 * sr), w = Math.round(0.004 * sr), a = Math.round(t * sr), i, peak = 0;
    function lvl(c) { var s = 0, n = 0; for (var j = Math.max(1, c - w); j < Math.min(x.length, c + w); j++) { var d = x[j] - 0.5 * x[j - 1]; s += d * d; n++; } return Math.sqrt(s / Math.max(n, 1)); }
    for (i = a; i < a + Math.round(0.1 * sr); i += step) peak = Math.max(peak, lvl(i));
    var c = a, back = 0; while (back < 0.09 * sr && c - step > 0 && lvl(c - step) > 0.03 * peak) { c -= step; back += step; }
    return c / sr;
  }

  // ----- LPC
  function resample(x, sr, to) {
    if (sr <= to * 1.02) return { x: x, sr: sr };
    var M = 15, h = [], fc = 0.46 * to / sr, k, sum = 0;
    for (k = -M; k <= M; k++) { var s = k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k); var w = 0.54 + 0.46 * Math.cos(Math.PI * k / (M + 1)); h.push(s * w); sum += s * w; }
    var ratio = sr / to, N = Math.floor((x.length - 2 * M) / ratio), y = new Float32Array(N);
    for (var m = 0; m < N; m++) { var pos = m * ratio + M, c = Math.round(pos), a = 0; for (k = -M; k <= M; k++) a += x[c + k] * h[k + M]; y[m] = a / sum; }
    return { x: y, sr: to };
  }
  function lpc(x, order) {
    var N = x.length, r = new Float64Array(order + 1), i, j;
    for (i = 0; i <= order; i++) { var s = 0; for (j = i; j < N; j++) s += x[j] * x[j - i]; r[i] = s; }
    r[0] = r[0] * 1.0001 + 1e-9;
    var a = new Float64Array(order + 1), e = r[0]; a[0] = 1;
    for (i = 1; i <= order; i++) {
      var acc = r[i]; for (j = 1; j < i; j++) acc += a[j] * r[i - j];
      var kk = -acc / e, tmp = a.slice(); for (j = 1; j < i; j++) a[j] = tmp[j] + kk * tmp[i - j]; a[i] = kk; e *= (1 - kk * kk);
      if (e <= 0) break;
    }
    return a;
  }
  function lpcEnvelope(frame, sr) {
    var r = resample(frame, sr, 10000), x = r.x, N = x.length, i;
    if (N < 120) return null;
    var y = new Float32Array(N); y[0] = x[0]; for (i = 1; i < N; i++) y[i] = x[i] - 0.95 * x[i - 1];
    for (i = 0; i < N; i++) y[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
    var order = 12, a = lpc(y, order), env = [], fs = [];
    for (var f = 150; f <= 4300; f += 10) {
      var re = 1, im = 0; for (var k = 1; k <= order; k++) { var w = 2 * Math.PI * f / r.sr * k; re += a[k] * Math.cos(w); im -= a[k] * Math.sin(w); }
      env.push(-10 * Math.log10(re * re + im * im + 1e-12)); fs.push(f);
    }
    return { f: fs, db: env, sr: r.sr };
  }
  function lpcFormants(frame, sr) {
    var e = lpcEnvelope(frame, sr); if (!e) return [];
    var env = e.db, fs = e.f, peaks = [], i;
    for (i = 2; i < env.length - 2; i++) if (env[i] > env[i - 1] && env[i] >= env[i + 1] && env[i] > env[i - 2] && env[i] > env[i + 2]) {
      var lo = Math.min(Math.min.apply(null, env.slice(Math.max(0, i - 25), i + 1)), Math.min.apply(null, env.slice(i, Math.min(env.length, i + 26))));
      if (env[i] - lo > 1.5) peaks.push(fs[i]);
    }
    return peaks;
  }

  // normalised autocorrelation peak over 70-420 Hz: ~1 voiced, ~0 noise
  function periodicity(x, sr, a, b) {
    a = Math.max(0, a); b = Math.min(x.length, b); var n = b - a; if (n < sr / 70 * 1.5) return 0;
    var best = 0, e0 = 0, i; for (i = a; i < b; i++) e0 += x[i] * x[i]; if (e0 < 1e-12) return 0;
    for (var lag = Math.floor(sr / 420); lag <= Math.floor(sr / 70) && lag < n / 1.5; lag++) {
      var s = 0, e1 = 0; for (i = a + lag; i < b; i++) { s += x[i] * x[i - lag]; e1 += x[i - lag] * x[i - lag]; }
      var c = s / Math.sqrt(e0 * e1 + 1e-12); if (c > best) best = c;
    }
    return best;
  }

  // spectral balance: dB of energy 1.8-3.5 kHz over 0.15-1.0 kHz (Goertzel every 50 Hz on a Hann-windowed frame). /u/ is far lower than /i/ and /e/.
  function balance(fr, sr) {
    var N = fr.length, w = new Float32Array(N), i; for (i = 0; i < N; i++) w[i] = fr[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
    function pw(f) { var c = 2 * Math.cos(2 * Math.PI * f / sr), s1 = 0, s2 = 0; for (var j = 0; j < N; j++) { var s0 = w[j] + c * s1 - s2; s2 = s1; s1 = s0; } return s1 * s1 + s2 * s2 - c * s1 * s2; }
    var lo = 1e-12, hi = 1e-12, f; for (f = 150; f <= 1000; f += 50) lo += pw(f); for (f = 1800; f <= 3500; f += 50) hi += pw(f);
    return 10 * Math.log10(hi / lo);
  }
  function features(x, sr, t, nextT) {
    var s = function (sec) { return Math.round(sec * sr); }, end = nextT != null ? Math.min(t + 0.14, nextT - 0.012) : t + 0.14;
    // the vowel window: 60-140 ms after the onset, past the burst and the breath of a /t/ (a later window was tried against a simulated room and did
    // worse: a quickly decaying vowel is mostly gone by 85 ms)
    var v0 = t + 0.06, v1 = Math.max(v0 + 0.03, end);
    var fr = x.subarray(Math.max(0, s(v0)), Math.min(x.length, s(v1)));
    var envl = fr.length > s(0.02) ? lpcEnvelope(fr, sr) : null, peaks = envl ? lpcFormants(fr, sr) : [];
    var f1 = null, f2 = null, i;
    for (i = 0; i < peaks.length; i++) if (peaks[i] > 180 && peaks[i] < 1250) { f1 = peaks[i]; break; }
    for (i = 0; i < peaks.length; i++) if (f1 && peaks[i] > f1 + 180 && peaks[i] < 3200) { f2 = peaks[i]; break; }
    // /u/: F2 is a shoulder of F1, not a peak, so the second peak found is F3. /i/ and /e/ have a deep valley between F1 and F2 near 1 kHz; /u/ has none.
    var mid = null, p2 = null;
    if (envl && f1) { var e1 = 0, em = 0, nm = 0; envl.f.forEach(function (f, q) { if (Math.abs(f - f1) < 12) e1 = Math.max(e1, envl.db[q]); if (f >= 850 && f <= 1250) { em += envl.db[q]; nm++; } }); mid = em / nm - e1; if (f2) { var e2 = -99; envl.f.forEach(function (f, q) { if (Math.abs(f - f2) < 12) e2 = Math.max(e2, envl.db[q]); }); p2 = e2 - e1; } }
    if (f1 && f1 < 480 && f2 > 1500 && mid != null && mid > MID_U) f2 = 800;
    if (f1 && !f2) f2 = f1 * 1.3;                                      // merged peaks: F1 and F2 close, an open back vowel
    // aspiration: how voiced is the stretch just after the burst, and how much breath is there compared with the vowel
    var per = periodicity(x, sr, s(t + 0.020), s(t + 0.048));
    var vRms = frameRms(x, s(v0), s(v1)), aRms = frameRms(x, s(t + 0.012), s(t + 0.040));
    var zc = 0, za = s(t + 0.015), zb = s(t + 0.040);                    // zero-crossing rate: a voiced "a" is ~1 kHz, breath through the formants is 3 kHz and up
    for (i = za + 1; i < Math.min(zb, x.length); i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) zc++;
    return { bal: fr.length > 64 ? balance(fr, sr) : null, p2: p2, mid: mid, zcr: zc / Math.max(0.001, (zb - za) / sr) / 2, f1: f1, f2: f2, periodicity: per, aspiration: aRms / (vRms + 1e-9), voicedRms: vRms };
  }

  var BAL_U = -36;      // dB: spectral balance below this is /u/ (everything else sits above; see balance())
  function vowelDist(f1, f2, scale, bal) {
    var best = null;
    if (bal != null && bal < BAL_U) return { v: "u", d: 0 };
    Object.keys(CENT).forEach(function (v) {
      if (v === "u" && bal != null) return;
      var d = Math.pow(Math.log(f1 / (CENT[v][0] * scale)), 2) + Math.pow(Math.log(f2 / (CENT[v][1] * scale)), 2);
      if (!best || d < best.d) best = { v: v, d: d };
    });
    return best;
  }
  // Where does the pattern sit in a take? The expected onsets (seconds from the pattern's start) slid over the detected ones: the offset that matches
  // the most of them within 0.1 s (ties: the smallest total error). A learner starts when they like; this finds when.
  function align(x, sr, rel, opts) {
    var found = onsets(x, sr, opts), best = { off: 0, hits: -1, err: Infinity };
    found.forEach(function (d) {
      for (var j = 0; j < Math.min(rel.length, 3); j++) {
        var off = d - rel[j], hits = 0, err = 0;
        rel.forEach(function (r) { var m = Infinity; found.forEach(function (f) { m = Math.min(m, Math.abs(f - (r + off))); }); if (m < 0.1) { hits++; err += m; } });
        if (hits > best.hits || (hits === best.hits && err < best.err)) best = { off: off, hits: hits, err: err };
      }
    });
    return best;
  }
  function analyze(x, sr, expected, opts) {
    opts = opts || {};
    var tol = opts.tol || 0.12, found = onsets(x, sr, opts), used = {}, rows = expected.map(function (e) {
      var bi = -1, bd = tol; found.forEach(function (t, k) { var d = Math.abs(t - e.t); if (d < bd && !used[k]) { bd = d; bi = k; } });
      if (bi >= 0) used[bi] = 1;
      return { expected: e, t: bi >= 0 ? refine(x, sr, found[bi]) : null, found: bi >= 0 };
    });
    rows.forEach(function (r, i) {
      if (!r.found) return;
      var nx = rows[i + 1] && rows[i + 1].found ? rows[i + 1].t : (rows[i + 1] ? rows[i + 1].expected.t : null);
      var f = features(x, sr, r.t, nx); r.f1 = f.f1; r.f2 = f.f2; r.mid = f.mid; r.p2 = f.p2; r.bal = f.bal; r.periodicity = f.periodicity; r.aspiration = f.aspiration;
      r.zcr = f.zcr; r.aspirated = f.zcr > (opts.zcrThresh || 1900) || f.periodicity < (opts.perThresh || 0.3);
    });
    var scales = opts.scale ? [opts.scale] : SCALES, best = null;
    scales.forEach(function (sc) {
      var tot = 0, n = 0; rows.forEach(function (r) { if (r.found && r.f1) { tot += vowelDist(r.f1, r.f2, sc, r.bal).d; n++; } });
      var m = n ? tot / n : Infinity; if (!best || m < best.m) best = { sc: sc, m: m };
    });
    var right = 0;
    rows.forEach(function (r) {
      if (!r.found || !r.f1) { r.heard = null; r.ok = false; return; }
      r.vowel = vowelDist(r.f1, r.f2, best.sc, r.bal).v;
      r.heard = r.vowel === "a" ? (r.aspirated ? "Ta" : "Da") : SYL_OF[r.vowel];
      r.ok = r.heard === r.expected.syl; if (r.ok) right++;
    });
    return { scale: best.sc, onsets: rows, accuracy: rows.length ? right / rows.length : 0, detected: found.length };
  }

  var api = { align: align, onsets: onsets, features: features, analyze: analyze, lpcFormants: lpcFormants, lpcEnvelope: lpcEnvelope, periodicity: periodicity, CENT: CENT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SyllableDetect = api;
})(typeof window !== "undefined" ? window : globalThis);
