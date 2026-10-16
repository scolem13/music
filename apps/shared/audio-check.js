// audio-check.js: a pre-flight step any tool can run before it uses the microphone.
//
//   const r = await AudioCheck.run({ levelCheck: true });   // null if the student cancels
//   AudioCheck.ensure(opts) is the same but reuses this session's result; see the accuracy helpers at the bottom.
//   r = { output: 'speakers'|'headphones'|'unknown', latencyMs, bleedDb, peakDb, level: 'ok'|'quiet'|'loud',
//         browserOk, constraints }   // constraints: pass to getUserMedia({ audio: r.constraints })
//
// Steps: browser note (Chrome/Edge recommended), a soft test sound to tell speakers from headphones and
// measure round-trip latency, then a level meter for the student's loudest phrase.
//
// Hearing safety of the test sound. We cannot read the system volume, so the sound is kept small at
// every point: a 150 ms sweep between 500 and 3000 Hz with 25 ms fades (no click), starting at -48 dBFS
// and stepping up only until the mic hears it (one more burst at that level confirms it), never above MAX_DBFS (-24 dBFS, about 1/16 of full scale;
// ordinary music is mastered near 0 dBFS, so at any volume setting this is far quieter than the music
// the student already listens to). On headphones the mic never hears it, so it stops at the cap.
// The gain is set once per burst by code here; nothing else reaches that path.
(function () {
  'use strict';
  const START_DBFS = -48, STEP_DB = 8, MAX_DBFS = -24;
  const CHIRP_S = 0.15, FADE_S = 0.025, F0 = 500, F1 = 3000;
  const DS = 4;                              // decimation for the correlation
  const DETECT_RATIO = 7;                    // correlation peak over the median, to count as heard
  const MIN_NCC = 0.3;                       // and the mic at that point must look like the sweep
  const MAX_GAIN_DB = 20;                    // a mic 20 dB louder than what we played is not our sound
  const LAG_TOL_S = 0.003;                   // the confirming burst must come back within 3 ms of the first

  const dbToGain = db => 10 ** (db / 20);
  const isChromium = () => !!(navigator.userAgentData && navigator.userAgentData.brands.some(b => /Chrom/.test(b.brand)))
    || (/Chrome\//.test(navigator.userAgent) && !/Firefox|FxiOS|EdgiOS|CriOS/.test(navigator.userAgent) && !!window.chrome);

  function chirpSamples(sr) {
    const n = Math.round(CHIRP_S * sr), out = new Float32Array(n), k = Math.log(F1 / F0);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = F0 * Math.exp(k * t / CHIRP_S);
      ph += 2 * Math.PI * f / sr;
      const fade = Math.min(1, t / FADE_S, (CHIRP_S - t) / FADE_S);
      out[i] = Math.sin(ph) * 0.5 * (1 - Math.cos(Math.PI * fade));   // raised-cosine fades
    }
    return out;
  }
  const decimate = (x, d) => { const y = new Float32Array(Math.floor(x.length / d));
    for (let i = 0; i < y.length; i++) { let s = 0; for (let j = 0; j < d; j++) s += x[i * d + j]; y[i] = s / d; } return y; };

  // Worklet that copies mic input out with the context frame it belongs to.
  const WORKLET = `registerProcessor('ac-tap', class extends AudioWorkletProcessor {
    process(ins) { const c = ins[0] && ins[0][0]; if (c) this.port.postMessage({ f: currentFrame, d: c.slice(0) }); return true; } });`;

  async function testOutput(ac, micStream, onStep) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    await ac.audioWorklet.addModule(url); URL.revokeObjectURL(url);
    const src = ac.createMediaStreamSource(micStream), tap = new AudioWorkletNode(ac, 'ac-tap');
    const sink = ac.createGain(); sink.gain.value = 0;
    src.connect(tap); tap.connect(sink); sink.connect(ac.destination);
    let blocks = [];
    tap.port.onmessage = e => blocks.push(e.data);

    const sr = ac.sampleRate, chirp = chirpSamples(sr), ref = decimate(chirp, DS);
    const buf = ac.createBuffer(1, chirp.length, sr); buf.copyToChannel(chirp, 0);
    let refE = 0; for (let j = 0; j < ref.length; j++) refE += ref[j] * ref[j];

    // One burst at db: where the sweep best matches the mic, and how well. ncc is the normalised match (1 = identical
    // shape), so a loud unrelated sound (a beep, speech) scores low even when it is loud.
    async function burst(db) {
      blocks = [];
      const g = ac.createGain(); g.gain.value = Math.min(dbToGain(db), dbToGain(MAX_DBFS));
      const s = ac.createBufferSource(); s.buffer = buf; s.connect(g); g.connect(ac.destination);
      const at = ac.currentTime + 0.3, atFrame = Math.round(at * sr);
      s.start(at);
      await new Promise(r => setTimeout(r, 1300));
      const rec = [];
      for (const b of blocks) for (let i = 0; i < b.d.length; i++) if (b.f + i >= atFrame) rec.push(b.d[i]);
      const x = decimate(Float32Array.from(rec), DS), n = ref.length, lags = x.length - n;
      if (lags < 10) return null;
      const corr = new Float32Array(lags);
      let best = 0, bestLag = 0;
      for (let L = 0; L < lags; L++) {
        let c = 0; for (let j = 0; j < n; j++) c += ref[j] * x[L + j];
        c = Math.abs(c); corr[L] = c; if (c > best) { best = c; bestLag = L; }
      }
      const median = Float32Array.from(corr).sort()[lags >> 1] || 1e-12;
      let segE = 0; for (let j = 0; j < n; j++) segE += x[bestLag + j] ** 2;
      return { ratio: best / median, ncc: best / Math.sqrt(refE * segE || 1e-24), lag: bestLag,
        gainDb: 20 * Math.log10(Math.sqrt(segE / refE) / dbToGain(db)) };
    }
    const heard = h => h && h.ratio >= DETECT_RATIO && h.ncc >= MIN_NCC && h.gainDb <= MAX_GAIN_DB;

    let result = { output: 'headphones', latencyMs: null, bleedDb: null };
    try {
      for (let db = START_DBFS; db <= MAX_DBFS; db += STEP_DB) {
        onStep(db);
        const h = await burst(db);
        if (!heard(h)) continue;
        // Confirm at the same level: a real echo comes back at the same delay; a chance match doesn't.
        const h2 = await burst(db);
        if (!heard(h2) || Math.abs(h2.lag - h.lag) * DS / sr > LAG_TOL_S) continue;
        result = { output: 'speakers', latencyMs: Math.round((h.lag + h2.lag) / 2 * DS / sr * 1000),
          bleedDb: Math.round((h.gainDb + h2.gainDb) / 2) };
        break;
      }
    } finally { src.disconnect(); tap.disconnect(); sink.disconnect(); }
    return result;
  }

  // ---- UI ------------------------------------------------------------------------------------------
  const CSS = `.ack-back{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
  .ack{background:#fff;color:#1d1d1f;max-width:520px;width:100%;border-radius:12px;padding:20px 22px;font:16px/1.5 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3)}
  @media (prefers-color-scheme:dark){.ack{background:#1f1f23;color:#eee}}
  .ack h2{margin:0 0 8px;font-size:1.25em}.ack p{margin:8px 0}.ack .warn{background:#fef3c7;color:#78350f;border-radius:8px;padding:8px 12px}
  .ack .row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
  .ack button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #ccc;background:transparent;color:inherit;cursor:pointer}
  .ack button.go{background:#2563eb;border-color:#2563eb;color:#fff}
  .ack .meter{height:18px;background:#e5e7eb;border-radius:9px;overflow:hidden;position:relative;margin:10px 0}
  .ack .meter i{display:block;height:100%;width:0;background:#16a34a;transition:width 50ms}
  .ack .meter b{position:absolute;top:0;bottom:0;width:2px;background:#111}
  .ack .muted{opacity:.7;font-size:14px}`;

  function dialog() {
    if (!document.getElementById('ack-css')) { const s = document.createElement('style'); s.id = 'ack-css'; s.textContent = CSS; document.head.append(s); }
    const back = document.createElement('div'); back.className = 'ack-back';
    const box = document.createElement('div'); box.className = 'ack'; back.append(box); document.body.append(back);
    return {
      show(html, buttons) {
        box.innerHTML = html;
        if (!buttons) return Promise.resolve();
        const row = document.createElement('div'); row.className = 'row'; box.append(row);
        return new Promise(res => buttons.forEach(([label, val, go]) => {
          const b = document.createElement('button'); b.textContent = label; if (go) b.className = 'go';
          b.onclick = () => res(val); row.append(b);
        }));
      },
      box, close() { back.remove(); },
    };
  }

  async function levelCheck(ac, micStream, d) {
    const an = ac.createAnalyser(); an.fftSize = 2048;
    const src = ac.createMediaStreamSource(micStream); src.connect(an);
    const data = new Float32Array(an.fftSize);
    const pick = d.show(`<h2>Microphone level</h2><p>Sing or play your <b>loudest</b> phrase for a few seconds.</p>
      <div class="meter"><i></i><b style="left:85%"></b></div><p class="muted" id="ack-lv">Listening…</p>`,
      [['Skip', 'skip'], ['Done', 'done', true]]);
    const bar = d.box.querySelector('.meter i'), msg = d.box.querySelector('#ack-lv');
    let peak = -120, live = true;
    (function tick() {
      if (!live) return;
      an.getFloatTimeDomainData(data);
      let p = 0; for (const v of data) p = Math.max(p, Math.abs(v));
      const db = 20 * Math.log10(p || 1e-6); peak = Math.max(peak, db);
      bar.style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%';
      bar.style.background = db > -3 ? '#dc2626' : db > -30 ? '#16a34a' : '#9ca3af';
      msg.textContent = peak > -1 ? 'Too loud: it is clipping. Move back from the microphone or turn its input down.'
        : peak < -35 ? 'Quiet so far. Get closer, or turn the input up in your system sound settings.'
        : 'Good level.';
      requestAnimationFrame(tick);
    })();
    const v = await pick; live = false; src.disconnect();
    if (v === 'skip') return { peakDb: null, level: 'unknown' };
    return { peakDb: Math.round(peak), level: peak > -1 ? 'loud' : peak < -35 ? 'quiet' : 'ok' };
  }

  async function run(opts = {}) {
    const d = dialog(), browserOk = isChromium();
    const out = { browserOk, output: 'unknown', latencyMs: null, bleedDb: null, peakDb: null, level: 'unknown' };
    let mic, ac;
    try {
      if (!browserOk && await d.show(`<h2>Best in Chrome</h2><p class="warn">This tool works best in Google Chrome
        (or Microsoft Edge). In this browser the MIDI keyboard or the sound check may not work.</p>`,
        [['Cancel', false], ['Continue anyway', true, true]]) === false) return null;

      if (!await d.show(`<h2>Sound check</h2><p>We'll play a <b>soft</b>, short test sound to find out whether
        you're using headphones or speakers. Keep your volume at a normal listening level.</p>
        <p class="muted">It starts very quiet and stops as soon as your microphone hears it.</p>`,
        [['Cancel', false], ['Start', true, true]])) return null;

      // Raw mic: echo cancellation would remove the very sound we're listening for.
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      ac = new AudioContext({ latencyHint: 'interactive' }); await ac.resume();
      d.show(`<h2>Sound check</h2><p id="ack-st">Listening for the test sound…</p>`);
      Object.assign(out, await testOutput(ac, mic, db => {
        const el = d.box.querySelector('#ack-st'); if (el) el.textContent = `Test sound ${Math.round((db - START_DBFS) / STEP_DB) + 1} of ${Math.floor((MAX_DBFS - START_DBFS) / STEP_DB) + 1}…`;
      }));
      const said = out.output === 'speakers'
        ? `Your <b>speakers</b> can be heard by the microphone (${out.latencyMs} ms round trip). We'll turn on echo
           cancellation and keep the backing quieter. Headphones will give a cleaner recording.`
        : `The microphone didn't hear the test sound, so you're probably on <b>headphones</b>. Good.`;
      if (!await d.show(`<h2>Sound check</h2><p>${said}</p>`, [['Cancel', false], ['Next', true, true]])) return null;

      if (opts.levelCheck !== false) Object.assign(out, await levelCheck(ac, mic, d));
      out.constraints = { echoCancellation: out.output === 'speakers', noiseSuppression: false, autoGainControl: false };
      return out;
    } catch (err) {
      await d.show(`<h2>Sound check</h2><p class="warn">${err.name === 'NotAllowedError' ? 'Microphone access was blocked.' : 'Something went wrong: ' + err.message}</p>`, [['Close', null]]);
      return null;
    } finally {
      if (mic) mic.getTracks().forEach(t => t.stop());
      if (ac) ac.close();
      d.close();
    }
  }

  // Reuse a check from earlier in this browser session (same tab or page) so students aren't asked on every page.
  const KEY = 'audio-check-v1';
  function last() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } }
  async function ensure(opts = {}) {
    const prev = !opts.force && last();
    if (prev) return prev;
    const r = await run(opts);
    if (r) try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch {}
    return r;
  }
  // Accuracy helpers.
  //  latencySec(r): subtract from mic event times to line them up with what was played (round trip, 0 if unknown).
  //  bleedFloorDb(r, playedDbfs): the mic level expected from our own output at playedDbfs; on speakers, treat mic
  //    input below this (+6 dB margin) as bleed, not the student. -Infinity on headphones.
  //  callAndResponse(r): true when reference sounds and student input should not overlap (speakers).
  const latencySec = r => (r && r.latencyMs != null ? r.latencyMs / 1000 : 0);
  const bleedFloorDb = (r, playedDbfs) => (r && r.output === 'speakers' && r.bleedDb != null ? playedDbfs + r.bleedDb + 6 : -Infinity);
  const callAndResponse = r => !!(r && r.output === 'speakers');

  window.AudioCheck = { run, ensure, last, latencySec, bleedFloorDb, callAndResponse, isChromium, MAX_DBFS };
})();
