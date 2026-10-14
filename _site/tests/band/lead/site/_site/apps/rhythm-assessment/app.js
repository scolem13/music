// ---------- pattern library ----------
let currentAbc = "";
let target = { events: [], onsets: [], total: 0, lQuarters: 0.5 };
let isTriple = false;       // from collection name (Gordon duple/triple)
let macroLUnits = 1;        // macrobeat length in L-units (meter-derived)

// show/hide without layout shift (visibility, with reserved CSS heights)
const show = id => document.getElementById(id).classList.remove("hidden");
const hide = id => document.getElementById(id).classList.add("hidden");
function clearTimeline(){
  document.querySelectorAll("#timeline .tick").forEach(n => n.remove());
}
function resetRecCard(){
  document.getElementById("player").removeAttribute("src");
  const dl = document.getElementById("download");
  dl.removeAttribute("href"); dl.removeAttribute("download");
  document.getElementById("recMeta").textContent = "No recording yet.";
  if (lastUrl){ URL.revokeObjectURL(lastUrl); lastUrl = null; }
}

const RA_PATTERNS = typeof rhythmPatternObject !== "undefined" ? rhythmPatternObject : window.rhythmPatternObject;
// Optional external override (used by the LSA Practice page): a fixed, pre-built
// sequence of { abc, graded, isTriple } items played in order as a single virtual
// "collection", bypassing the normal collection/pattern dropdowns entirely.
// graded:false items are model-only playback (no recording/grading) that auto-
// advance once heard -- see runClassCycle(). When absent, everything below behaves
// exactly as before.
const RA_SEQUENCE = window.RA_SEQUENCE || null;

const collectionSel = document.getElementById("collection");
const patternSel = document.getElementById("pattern");
if (!RA_SEQUENCE){
  for (const key in RA_PATTERNS){
    const o = document.createElement("option");
    o.value = key; o.textContent = key;
    collectionSel.appendChild(o);
  }
}

let tuneBook = null;
// Traversal order of patterns within the current collection (Next / advance /
// continuous all follow it). Shuffled when the "Shuffle order" option is on.
let playOrder = [];
function buildOrder(){
  const n = patternSel.options.length;
  playOrder = Array.from({length:n}, (_,i) => i);
  if (document.getElementById("shuffle").checked)
    for (let i=n-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [playOrder[i],playOrder[j]] = [playOrder[j],playOrder[i]]; }
}
const orderPos = () => Math.max(0, playOrder.indexOf(patternSel.selectedIndex));
const isLastInCollection = () => orderPos() >= playOrder.length - 1;
function gotoOrder(pos){
  patternSel.selectedIndex = playOrder[((pos % playOrder.length) + playOrder.length) % playOrder.length];
  loadPattern();
}
function loadCollection(){
  tuneBook = new ABCJS.TuneBook(RA_PATTERNS[collectionSel.value]);
  patternSel.innerHTML = "";
  tuneBook.tunes.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = "Pattern " + t.id;
    patternSel.appendChild(o);
  });
  buildOrder();
  patternSel.selectedIndex = playOrder[0];   // first pattern in the (maybe shuffled) order
  loadPattern();
}

function renderPattern(){
  // rhythm renders the raw data ABC (no %% directives), so set staffwidth via the
  // render option to match the tonal app's sizing
  ABCJS.renderAbc("notation", currentAbc,
    { responsive: "resize", add_classes: true, selectTypes: false, staffwidth: 320 });
}

function loadPattern(){
  const idx = parseInt(patternSel.value, 10) || 0;
  currentAbc = tuneBook.tunes[idx].abc;
  target = AbcRhythm.parse(currentAbc);
  isTriple = RA_SEQUENCE ? !!RA_SEQUENCE[idx].isTriple : /triple/i.test(collectionSel.value);
  macroLUnits = AbcRhythm.macrobeatLUnits(currentAbc, isTriple);
  renderPattern();
  document.getElementById("resultArea").innerHTML =
    `<div class="muted">Pattern loaded. Record an attempt when ready.</div>`;
  resetRecCard();
  clearTimeline();
  // NB: performedCard (last recording's notation) is intentionally NOT hidden
  // here — it stays visible until the next recording actually starts.
  if (!continuousMode) setFlow(running ? "ready" : "nomic");
  if (window.SessionLog) SessionLog.present();
}

collectionSel.addEventListener("change", loadCollection);
patternSel.addEventListener("change", loadPattern);
document.getElementById("shuffle").addEventListener("change", buildOrder);
document.getElementById("next").addEventListener("click", () => gotoOrder(orderPos() + 1));
document.getElementById("random").addEventListener("click", () => {
  if (patternSel.options.length <= 1) return;
  let i; do { i = Math.floor(Math.random()*patternSel.options.length); }
  while (i === patternSel.selectedIndex);
  patternSel.selectedIndex = i; loadPattern();
});

const tempoEl = document.getElementById("tempo");
tempoEl.addEventListener("input", () =>
  document.getElementById("tempoVal").textContent = tempoEl.value);
tempoEl.addEventListener("change", () => { if (window.SessionLog) SessionLog.present(); });
document.getElementById("countin").addEventListener("change", () => { if (window.SessionLog) SessionLog.present(); });

// ---------- audio setup + live level / onset preview ----------
let audioCtx, analyser, micStream, buf, running = false;
const levelbar = document.getElementById("levelbar");
const threshEl = document.getElementById("thresh");

let collecting = false;
let frames = [];           // {t, rms} captured during an attempt
let liveLast = 0, liveCount = 0;

function sensitivity(){ return parseFloat(document.getElementById("sens").value); }
const REFRACTORY_MS = 110; // min gap between detected attacks

async function enableMic(){
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false
    }});
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    running = true;
    document.getElementById("record").disabled = false;
    document.getElementById("continuous").disabled = false;
    document.getElementById("calibrate").disabled = false;
    const mic = document.getElementById("mic");
    mic.textContent = "Mic on ✓"; mic.disabled = true;
    loop();
    setFlow("ready");
  } catch (e) {
    document.getElementById("resultArea").innerHTML =
      `<div class="fail">Mic error: ${e.message}</div>` +
      `<div class="muted">Must be served over http://localhost or https (not file://).</div>`;
  }
}

function rmsNow(){
  analyser.getFloatTimeDomainData(buf);
  let s = 0;
  for (let i=0;i<buf.length;i++) s += buf[i]*buf[i];
  return Math.sqrt(s/buf.length);
}

function loop(){
  if (!running) return;
  const rms = rmsNow();
  const now = performance.now();
  const thr = sensitivity();
  levelbar.style.width = Math.min(100, rms/0.3*100) + "%";
  threshEl.style.left = Math.min(100, thr/0.3*100) + "%";

  if (collecting){
    frames.push({ t: now, rms });
    // live attack preview (rising edge over threshold w/ refractory); only count
    // after the downbeat so the count-in clicks aren't tallied
    if (now >= perfT0 && rms > thr && liveLast <= thr && (now - (loop._lastOnset||0)) > REFRACTORY_MS){
      liveCount++; loop._lastOnset = now;
      document.getElementById("liveCount").textContent = "Attacks detected: " + liveCount;
    }
    liveLast = rms;
  }
  requestAnimationFrame(loop);
}

// ---------- onset detection (post-process captured RMS frames) ----------
function detectOnsets(fr, thr){
  const onsets = [];
  let last = -1e9, prev = 0;
  for (const f of fr){
    if (f.rms > thr && prev <= thr && (f.t - last) > REFRACTORY_MS){
      onsets.push(f.t); last = f.t;
    }
    prev = f.rms;
  }
  return onsets; // ms timestamps
}

// ---------- tempo model ----------
// Tempo slider = macrobeats per minute. The count-in establishes this tempo and
// the performance is graded in ABSOLUTE time against it (not tempo-independent).
const secPerMacrobeat = () => 60 / parseInt(tempoEl.value, 10);
const secPerLunit = () => secPerMacrobeat() / macroLUnits;
const targetTimesSec = () => target.onsets.map(o => o * secPerLunit());

// performance start (downbeat) in performance.now() ms, set when recording begins
let perfT0 = 0;

// ---------- performed-rhythm notation (quantized to the beat grid) ----------
const GRID = 0.5;  // quantize onsets to the nearest half L-unit
function measureLUnits(){
  const m = AbcRhythm.meter(currentAbc);
  return 4 * m.n / (m.d * target.lQuarters);   // L-units per notated measure
}
function abcDur(d){
  const H = Math.round(d * 2);                  // duration in half-L-units
  if (H <= 0) return "/2";
  if (H % 2 === 0){ const q = H/2; return q === 1 ? "" : String(q); }
  return String(H) + "/2";
}
// Build ABC for the performed rhythm from detected onset seconds.
// Beaming is controlled by whitespace: short notes (< a quarter) written WITHOUT
// spaces beam together; spaces break beams. We break beams at macrobeat
// boundaries and barlines, matching how the source patterns are notated.
function performedAbc(detSec){
  const spl = secPerLunit();
  const measureLU = measureLUnits();
  const lq = target.lQuarters;
  const q = detSec.map(s => Math.max(0, Math.round((s/spl)/GRID)*GRID));
  const mLine = (/^M:.*$/m.exec(currentAbc) || ["M: 4/4"])[0];
  const lLine = (/^L:.*$/m.exec(currentAbc) || ["L: 1/8"])[0];
  let out = "", cum = 0, prevBeamable = false;
  for (let i=0;i<q.length;i++){
    let dur = (i < q.length-1) ? (q[i+1]-q[i]) : Math.max(GRID, target.total - q[i]);
    dur = Math.round(dur/GRID)*GRID; if (dur < GRID) dur = GRID;
    const beamable = dur * lq < 1;                          // shorter than a quarter
    const startsMacrobeat = Math.abs(cum % macroLUnits) < 1e-9;
    const tok = "B" + abcDur(dur);
    if (out === "") out = tok;
    else {
      const sameBeam = beamable && prevBeamable && !startsMacrobeat;
      out += (sameBeam ? "" : " ") + tok;
    }
    cum += dur;
    prevBeamable = beamable;
    if (measureLU > 0 && Math.abs(cum % measureLU) < 1e-9 && i < q.length-1){
      out += " |";
      prevBeamable = false;                                 // beams don't cross barlines
    }
  }
  return `X:1\n${mLine}\n${lLine}\nK: clef=none\n${out}`;
}
// Color performed noteheads green/red by per-attack pass (when counts match).
function colorPerformed(passArr){
  const el = document.getElementById("performedNotation");
  el.querySelectorAll(".abcjs-note").forEach((n, i) => {
    const c = passArr[i] === undefined ? "#000" : (passArr[i] ? "#138000" : "#cc0000");
    if (n.tagName.toLowerCase() === "path") n.setAttribute("fill", c);
    n.querySelectorAll("path").forEach(p => p.setAttribute("fill", c));
  });
}
function renderPerformed(detSec, passArr){
  if (!detSec.length){ hide("performedCard"); return; }
  const abc = performedAbc(detSec);
  show("performedCard");                       // reveal first so the pane has its real width
  requestAnimationFrame(() => {
    ABCJS.renderAbc("performedNotation", abc,
      { responsive: "resize", add_classes: true, selectTypes: false, staffwidth: 320 });
    colorPerformed(passArr || []);
  });
}

// ---------- grading (tempo-locked, absolute time) ----------
function grade(){
  const tolMs = parseInt(document.getElementById("tol").value, 10);
  const N = target.onsets.length;
  const tgtSec = targetTimesSec();
  // detected onsets as seconds relative to the downbeat after the count-in
  const detSec = detectOnsets(frames, sensitivity())
    .map(ms => (ms - perfT0) / 1000)
    .filter(s => s > -tolMs/1000 - 0.05);   // drop count-in leakage before t0
  const area = document.getElementById("resultArea");

  drawTimeline(tgtSec, detSec, tolMs/1000);

  if (detSec.length !== N){
    renderPerformed(detSec, null);   // show what was performed, uncolored
    area.innerHTML =
      `<div class="fail">Detected ${detSec.length} attack(s), expected ${N}.</div>` +
      `<div class="muted">Start on the downbeat right after the count-in, keep attacks ` +
      `crisp, and adjust “Onset sensitivity” if claps are missed (High) or doubled (Low).</div>`;
    return "incomplete";
  }

  let allPass = true, rows = "", passArr = [];
  for (let i=0;i<N;i++){
    const devMs = (detSec[i] - tgtSec[i]) * 1000;
    const pass = Math.abs(devMs) <= tolMs;
    passArr.push(pass);
    if (!pass) allPass = false;
    rows += `<tr>
      <td>${i+1}</td>
      <td>${tgtSec[i].toFixed(2)}s</td>
      <td>${detSec[i].toFixed(2)}s</td>
      <td>${devMs>=0?"+":""}${devMs.toFixed(0)} ms</td>
      <td class="${pass?'pass':'fail'}">${pass?'✓':'✗'}</td>
    </tr>`;
  }
  area.innerHTML =
    `<table><thead><tr><th>#</th><th>Target</th><th>You</th><th>Off</th><th></th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<div class="overall ${allPass?'pass':'fail'}">${allPass?'✓ PASS — all '+N+' attacks':'✗ FAIL'}</div>` +
    `<div class="muted">Tolerance ±${tolMs} ms. Times are seconds from the downbeat after the count-in, at ${tempoEl.value} macrobeats/min. Pitch ignored.</div>`;
  renderPerformed(detSec, passArr);
  return allPass ? "pass" : "fail";
}

// ---------- timeline visualization (absolute time) ----------
function drawTimeline(tgtSec, detSec, tolSec){
  const tl = document.getElementById("timeline");
  tl.querySelectorAll(".tick").forEach(n => n.remove());
  const span = Math.max(target.total * secPerLunit(),
                        detSec.length ? Math.max(...detSec) : 0, 0.001);
  const matched = detSec.length === tgtSec.length;
  const place = (sec, top, color) => {
    const d = document.createElement("div");
    d.className = "tick";
    d.style.left = (6 + (sec / span) * 90) + "%";
    d.style.top = top + "px"; d.style.height = "30px";
    d.style.background = color;
    tl.appendChild(d);
  };
  tgtSec.forEach((s, i) => {
    const ok = matched && Math.abs(detSec[i] - s) <= tolSec;
    place(s, 22, ok ? "#22c55e" : "#ef4444");
  });
  detSec.forEach((s, i) => {
    const ok = matched && Math.abs(s - tgtSec[i]) <= tolSec;
    place(Math.max(0, s), 64, ok ? "#22c55e" : "#ef4444");
  });
}

// ---------- recording (MediaRecorder) ----------
let mediaRecorder = null, recChunks = [], lastUrl = null;
function pickMime(){
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  return ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"]
    .find(m => MediaRecorder.isTypeSupported(m)) || null;
}
function startRecording(){
  if (typeof MediaRecorder === "undefined"){ mediaRecorder = null; return; }
  recChunks = [];
  const mime = pickMime();
  try { mediaRecorder = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined); }
  catch(e){ mediaRecorder = null; return; }
  mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
  mediaRecorder.start();
}
function stopRecording(){
  return new Promise(resolve => {
    if (!mediaRecorder || mediaRecorder.state === "inactive"){ resolve(null); return; }
    mediaRecorder.onstop = () => resolve(new Blob(recChunks, { type: mediaRecorder.mimeType }));
    mediaRecorder.stop();
  });
}
function tstamp(){
  const d = new Date(), p = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function presentRecording(blob, summary){
  if (!blob){ resetRecCard(); return; }   // card stays in place (reserved height)
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const tag = `${collectionSel.value}_p${tuneBook.tunes[patternSel.value].id}_${summary}`.replace(/[^\w-]+/g,"-");
  const name = `attempt_${tstamp()}_${tag}.${ext}`;
  document.getElementById("player").src = lastUrl;
  const dl = document.getElementById("download");
  dl.href = lastUrl; dl.download = name;
  document.getElementById("recMeta").textContent =
    `${(blob.size/1024).toFixed(0)} KB · ${blob.type || "audio"} · ${name}`;
}

// ---------- continuous-session recorder (only the student responses) + SRT -----
let sessionRecorder = null, sessionChunks = [], sessionUrl = null, sessionSrtUrl = null;
let sessionResponses = 0, sessionEntries = [];   // {label, durMs} per response, in order
function srtTime(ms){
  const p = (n,l=2) => String(n).padStart(l,"0");
  const h = Math.floor(ms/3600000), m = Math.floor(ms/60000)%60, s = Math.floor(ms/1000)%60;
  return `${p(h)}:${p(m)}:${p(s)},${p(Math.floor(ms%1000),3)}`;
}
function buildSRT(entries){
  let t = 0, out = "";
  entries.forEach((e, i) => {
    const start = t, end = t + e.durMs; t = end;
    out += `${i+1}\n${srtTime(start)} --> ${srtTime(end)}\n${e.label}\n\n`;
  });
  return out;
}
function startSession(){
  sessionChunks = []; sessionResponses = 0; sessionEntries = []; sessionRecorder = null;
  hide("sessionDownload"); hide("sessionSrt");
  document.getElementById("sessionMeta").textContent =
    "Recording session… Stop Continuous mode to download the responses.";
  if (typeof MediaRecorder === "undefined") return;
  const mime = pickMime();
  try { sessionRecorder = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined); }
  catch(e){ sessionRecorder = null; return; }
  sessionRecorder.ondataavailable = e => { if (e.data && e.data.size) sessionChunks.push(e.data); };
  try { sessionRecorder.start(); sessionRecorder.pause(); } catch(e){}
}
function sessionResume(){ try { if (sessionRecorder && sessionRecorder.state === "paused") sessionRecorder.resume(); } catch(e){} }
function sessionPause(){ try { if (sessionRecorder && sessionRecorder.state === "recording") sessionRecorder.pause(); } catch(e){} }
function finalizeSession(){
  const rec = sessionRecorder; sessionRecorder = null;
  const meta = document.getElementById("sessionMeta");
  if (!rec){
    if (sessionResponses === 0)
      meta.textContent = "Run Continuous mode, then Stop to download every response (count-in/model and gaps excluded).";
    return;
  }
  rec.onstop = () => {
    if (!sessionChunks.length){ meta.textContent = "No responses were captured this session."; return; }
    const blob = new Blob(sessionChunks, { type: rec.mimeType });
    if (sessionUrl) URL.revokeObjectURL(sessionUrl);
    sessionUrl = URL.createObjectURL(blob);
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const base = `session_${tstamp()}_${sessionResponses}responses`;
    const a = document.getElementById("sessionDownload");
    a.href = sessionUrl; a.download = base + "." + ext; show("sessionDownload");
    if (sessionSrtUrl) URL.revokeObjectURL(sessionSrtUrl);
    const srtBlob = new Blob([buildSRT(sessionEntries)], { type: "text/plain" });
    sessionSrtUrl = URL.createObjectURL(srtBlob);
    const s = document.getElementById("sessionSrt");
    s.href = sessionSrtUrl; s.download = base + ".srt"; show("sessionSrt");
    meta.textContent =
      `${sessionResponses} response${sessionResponses===1?"":"s"} · ${(blob.size/1024).toFixed(0)} KB · ${base}.${ext}`;
  };
  try { if (rec.state !== "inactive") rec.stop(); } catch(e){}
}

// ---------- playback helpers ----------
const midiToFreqHz = m => 440 * Math.pow(2, (m - 69) / 12);
async function ensureAudio(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.resume();
}
let activeOscs = [];   // scheduled oscillators, so STOP can silence them at once
function stopAllTones(){
  for (const osc of activeOscs){ try { osc.stop(); } catch(e){} }
  activeOscs = [];
}
function click(midi, start, dur, gain){
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = "square"; osc.frequency.value = midiToFreqHz(midi);
  g.gain.value = 0.0001; osc.connect(g); g.connect(audioCtx.destination);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start); osc.stop(start + dur + 0.02);
  activeOscs.push(osc);
  osc.onended = () => { activeOscs = activeOscs.filter(o => o !== osc); };
}
const countInBeats = () => parseInt(document.getElementById("countin").value, 10);
const INITIAL_DELAY = 0.15;
// Latency to offset the graded downbeat by, so the lag the player experiences is
// removed. If we've measured the full acoustic round trip (mic hears our own
// clicks — speakers only), use that; otherwise fall back to the browser's
// output-latency estimate (which omits the unmeasurable mic input latency).
let calibratedLatencyMs = null;   // full round trip in ms, once calibrated
const latencyComp = () => calibratedLatencyMs !== null
  ? calibratedLatencyMs / 1000
  : (audioCtx.outputLatency || audioCtx.baseLatency || 0);

// ---------- latency calibration (acoustic loopback; speakers only) ----------
// Play several clicks, hear them back through the mic, and measure the median
// delay between scheduling a click and detecting it = full round-trip latency
// (output + propagation + mic input). With headphones the mic can't hear the
// clicks, so this only works on speakers (and needs echoCancellation off — it is).
async function calibrateLatency(){
  if (!running || collecting || continuousMode) return;
  await ensureAudio();
  const btn = document.getElementById("calibrate");
  const out = document.getElementById("calResult");
  btn.disabled = true;
  out.textContent = "Calibrating… use speakers, turn the volume up, and stay quiet.";

  const N = 6, gap = 0.4, lead = 0.3;
  frames = [];
  collecting = true;
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();
  const scheduled = [];                       // each click's scheduled time in perf ms
  for (let k=0;k<N;k++){
    const ctxT = ctxNow + lead + k*gap;
    click(84, ctxT, 0.05, 0.5);               // loud, short
    scheduled.push(perfNow + (ctxT - ctxNow)*1000);
  }
  const endMs = (lead + N*gap + 0.35) * 1000;

  setTimeout(() => {
    collecting = false;
    const onsets = detectOnsets(frames, 0.05); // ms, perf time
    const delays = [];
    for (const ps of scheduled){
      const hit = onsets.find(o => o >= ps - 5 && o <= ps + 350);  // RT < 350ms
      if (hit !== undefined) delays.push(hit - ps);
    }
    if (delays.length >= 3){
      delays.sort((a,b)=>a-b);
      calibratedLatencyMs = delays[Math.floor(delays.length/2)];   // median
      out.textContent =
        `✓ Round-trip latency ≈ ${calibratedLatencyMs.toFixed(0)} ms ` +
        `(${delays.length}/${N} clicks). Applied to grading.`;
    } else {
      out.textContent =
        `Couldn't hear enough clicks (${delays.length}/${N}). ` +
        `Use speakers (not headphones), raise the volume, and retry.`;
    }
    btn.disabled = false;
  }, endMs);
}
document.getElementById("calibrate").addEventListener("click", calibrateLatency);

// ---------- metronome (audible click + crisp visual flash, both toggleable) ----
let visualTimers = [];
function clearVisualTimers(){ visualTimers.forEach(clearTimeout); visualTimers = []; }
function flashBeat(accent){
  const dot = document.getElementById("beatdot");
  dot.classList.remove("on", "accent");
  void dot.offsetWidth;                 // reflow so a back-to-back flash retriggers
  dot.classList.add(accent ? "accent" : "on");
  setTimeout(() => dot.classList.remove("on", "accent"), 95);  // crisp
}
// Schedule one macrobeat click (audible) + beat-dot flash (visual), gated by the
// toggles. Beat k is at ctxNow+INITIAL_DELAY+k*spm; visual aligned to heard click.
function scheduleBeat(ctxNow, perfNow, k, accent, spm, lat){
  const beatCtx = ctxNow + INITIAL_DELAY + k*spm;
  if (document.getElementById("metroAudible").checked)
    click(accent ? 76 : 69, beatCtx, 0.05, accent ? 0.22 : 0.13);
  if (document.getElementById("metroVisual").checked){
    const delay = perfNow + (beatCtx - ctxNow + lat)*1000 - performance.now();
    visualTimers.push(setTimeout(() => flashBeat(accent), Math.max(0, delay)));
  }
}
// Mark contiguous beats 0..nBeats-1; indices in `accents` are accented.
function scheduleMetronome(ctxNow, perfNow, nBeats, accents, spm, lat){
  const acc = new Set(accents);
  for (let k=0;k<nBeats;k++) scheduleBeat(ctxNow, perfNow, k, acc.has(k), spm, lat);
}

// ---------- Hear pattern (count-in + metronome, then a model performance) ------
async function hearPattern(){
  if (collecting) return;
  await ensureAudio();
  clearVisualTimers();
  const spm = secPerMacrobeat(), spl = secPerLunit(), N = countInBeats();
  const ctxNow = audioCtx.currentTime, perfNow = performance.now(), lat = latencyComp();
  const perfMacrobeats = Math.round(target.total / macroLUnits);
  scheduleMetronome(ctxNow, perfNow, N + perfMacrobeats, [0, N], spm, lat);
  const downbeat = ctxNow + INITIAL_DELAY + N*spm;
  for (const on of target.onsets) click(88, downbeat + on*spl, 0.07, 0.22);
  setFlow("listened");
}

// ---------- record (count-in, then perform at tempo) ----------
async function recordAttempt(){
  if (collecting) return;
  const recBtn = document.getElementById("record");
  await ensureAudio();
  clearVisualTimers();
  frames = []; liveCount = 0; liveLast = 0; loop._lastOnset = 0;
  document.getElementById("liveCount").textContent = "Attacks detected: 0";
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  clearTimeline();
  hide("performedCard");
  recBtn.disabled = true;
  setFlow("recording");
  show("capturing");
  show("progwrap");

  const spm = secPerMacrobeat(), N = countInBeats(), lat = latencyComp();
  const perfMacrobeats = Math.round(target.total / macroLUnits);
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();
  // metronome runs across count-in AND the performance; downbeat at beat N
  scheduleMetronome(ctxNow, perfNow, N + perfMacrobeats, [0, N], spm, lat);
  perfT0 = perfNow + (INITIAL_DELAY + N*spm + lat) * 1000;  // heard downbeat

  collecting = true;        // capture frames across count-in + performance
  startRecording();

  const perfDurSec = target.total * secPerLunit();
  const countInMs = perfT0 - perfNow;
  const totalMs = countInMs + perfDurSec*1000 + 700;   // tail for the last attack
  const start = performance.now(), prog = document.getElementById("prog");
  const cap = document.getElementById("capturing");
  cap.textContent = "Count-in… get ready.";
  (function tick(){
    const elapsed = performance.now() - start;
    prog.style.width = Math.min(100, elapsed/totalMs*100) + "%";
    if (elapsed >= countInMs && cap.textContent[0] === "C")
      cap.textContent = "Perform now — clap/tap the rhythm!";
    if (elapsed < totalMs) requestAnimationFrame(tick);
  })();

  setTimeout(async () => {
    collecting = false;
    clearVisualTimers();
    document.getElementById("beatdot").classList.remove("on", "accent");
    hide("capturing");
    hide("progwrap");
    const summary = grade();
    const blob = await stopRecording();
    presentRecording(blob, summary);
    recBtn.disabled = false;
    setFlow(summary === "pass" ? "passed" : "failed");
    if (window.SessionLog) SessionLog.onResult(summary === "pass");
  }, totalMs);
}

document.getElementById("play").addEventListener("click", hearPattern);
document.getElementById("record").addEventListener("click", recordAttempt);
document.getElementById("mic").addEventListener("click", enableMic);

// ---------- spacebar-driven flow ----------
// ready → (SPC) hear → listened → (SPC) record → pass: (SPC) next | fail: (SPC) re-record
let flowState = "nomic";
function setStatus(text, cls){
  const el = document.getElementById("flowStatus");
  el.textContent = text;
  el.className = "flow " + (cls || "");
}
function setFlow(state){
  flowState = state;
  const msgs = {
    nomic:     "Enable the mic to begin.",
    ready:     "Press SPACE to hear the pattern.",
    listened:  "Press SPACE to record your attempt.",
    recording: "Recording…",
    passed:    "✓ Passed! Press SPACE for the next pattern.",
    failed:    "✗ Not yet. Press SPACE to try again.",
  };
  setStatus(msgs[state] || "", state);
}
// Builds tuneBook/patternSel from RA_SEQUENCE instead of a RA_PATTERNS collection.
function buildSequenceCollection(){
  tuneBook = { tunes: RA_SEQUENCE.map((item, i) => ({ id: i + 1, abc: item.abc })) };
  patternSel.innerHTML = "";
  tuneBook.tunes.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = "Pattern " + t.id;
    patternSel.appendChild(o);
  });
  buildOrder();
  patternSel.selectedIndex = playOrder[0];
  loadPattern();
}
function advanceNext(){
  if (!isLastInCollection()){
    gotoOrder(orderPos() + 1);
  } else if (RA_SEQUENCE){
    gotoOrder(0);   // safety net -- normally unreached, endSession("complete") fires first
  } else if (collectionSel.selectedIndex < collectionSel.options.length - 1){
    collectionSel.selectedIndex++;   // next collection, first pattern
    loadCollection();
  } else {
    collectionSel.selectedIndex = 0; // wrap around
    loadCollection();
  }
}
function handleSpace(){
  if (!running){ setFlow("nomic"); return; }
  if (continuousMode){ stopContinuous(); return; }   // SPACE bails out of continuous mode
  switch (flowState){
    case "recording": return;                  // busy
    case "listened":
    case "failed":    recordAttempt(); break;
    case "passed":    advanceNext(); break;     // loadPattern sets flow → ready
    default:          hearPattern();            // ready (and any fallback)
  }
}
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT")) return; // let controls use space
  e.preventDefault();
  handleSpace();
});

// ---------- continuous mode (automatic call-and-response loop) ----------
// Per cycle: pattern plays automatically (with metronome) → NO clicks straight
// into a silent recording → grade → 2 turnaround clicks → pass: next pattern,
// fail: repeat. Status bar shows pass/repeat; last recording's notation stays up.
let continuousMode = false;
const TURN_GAP = 2;  // macrobeats of clicking AFTER recording, before the next pattern

function setContinuousUI(){
  const btn = document.getElementById("continuous");
  btn.textContent = continuousMode ? "■ Stop" : "∞ Continuous mode";
  btn.classList.toggle("primary", continuousMode);
  document.getElementById("record").disabled = continuousMode || !running;
  document.getElementById("play").disabled = continuousMode;
}
// End the session immediately: kill scheduled audio + recorders, finalize files.
function endSession(reason){
  continuousMode = false;
  clearVisualTimers();
  stopAllTones();
  collecting = false;
  document.getElementById("beatdot").classList.remove("on", "accent");
  try { if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); } catch(e){}
  hide("capturing"); hide("progwrap");
  finalizeSession();
  setContinuousUI();
  if (reason === "complete")
    setStatus("🎉 Session complete — you finished the collection! Download below.", "passed");
  else
    setFlow(running ? "ready" : "nomic");
  if (window.RA_ON_END) window.RA_ON_END(reason);
}
function stopContinuous(){ endSession("stopped"); }
document.getElementById("continuous").addEventListener("click", () => {
  if (!running) return;
  if (continuousMode){ stopContinuous(); return; }
  continuousMode = true;
  setContinuousUI();
  startSession();
  runContinuousCycle();
});

// ---------- LSA Practice: woodblock synthesis ---------------------------------
// A short filtered noise burst reads as a woodblock/clave hit -- distinct from
// the plain square-wave click() used by the standalone assessment page above.
// Two voices: A (bright, for "the pattern" itself) and B (quieter/lower, for
// keeping the beat during a response, and for the quiet "someone plays along"
// echo). Only used by the RA_SEQUENCE (LSA Practice) code path below.
function woodblock(ctxTime, dur, gain, freqHz){
  const n = Math.max(1, Math.round(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filt = audioCtx.createBiquadFilter();
  filt.type = "bandpass"; filt.frequency.value = freqHz; filt.Q.value = 6;
  const g = audioCtx.createGain();
  g.gain.value = gain;
  src.connect(filt); filt.connect(g); g.connect(audioCtx.destination);
  src.start(ctxTime); src.stop(ctxTime + dur + 0.01);
  activeOscs.push(src);
  src.onended = () => { activeOscs = activeOscs.filter(o => o !== src); };
}
const woodblockA = (t, dur, gain) => woodblock(t, dur, gain, 1500);   // "the pattern"
const woodblockB = (t, dur, gain) => woodblock(t, dur, gain, 850);    // quiet beat-keeper / echo
const WB_PATTERN_GAIN = 0.64;   // "the pattern" itself (teaching/listen, class patterns)
const WB_ECHO_GAIN     = 0.28;  // quiet "someone plays along" echo
const WB_BEAT_GAIN     = 0.26;  // quiet beat-keeper during the student's response
// LSA Practice: exact silence (in macrobeats) between the end of the student's
// response and the start of whatever plays next (a class pattern), so the gap
// is tempo-locked instead of drifting with JS/setTimeout timing.
window.LSA_SILENCE_MACROBEATS = 2;

// Plays `onsets` again, quietly (woodblockB), immediately after the pattern's own
// `durSec` -- the "someone plays along" reinforcement, 40% of the time. Used for
// class patterns and an individual pattern's teaching/listen phase -- never its
// evaluation/record phase (only the gentle beat-keeping click there). Returns
// whether it fired, so callers can extend their own timing to make room for it.
function maybeEchoOnsets(onsets, startCtx, spl, durSec){
  if (Math.random() >= 0.4) return false;
  const echoStart = startCtx + durSec;
  for (const on of onsets) woodblockB(echoStart + on*spl, 0.05, WB_ECHO_GAIN);
  return true;
}

function renderPatternAbc(abc){
  ABCJS.renderAbc("notation", abc,
    { responsive: "resize", add_classes: true, selectTypes: false, staffwidth: 320 });
}

// Plays a chain of class patterns back-to-back (each with its own 40% quiet
// echo), then calls onDone. Each item is parsed locally -- this never touches
// the individual pattern's loaded target/currentAbc, so grading state is
// untouched by the interlude. items: [{ abc, isTriple }, ...]. `startCtx`, if
// given, is the exact Web Audio time to begin at (used to anchor the silence
// after a response precisely, instead of drifting with setTimeout jitter);
// otherwise starts essentially immediately.
function playLsaInterlude(items, onDone, startCtx){
  clearVisualTimers();
  const spm = secPerMacrobeat();
  const ctxNow = audioCtx.currentTime;
  let ctxCursor = startCtx !== undefined ? startCtx : ctxNow + INITIAL_DELAY;
  items.forEach((item) => {
    const t = AbcRhythm.parse(item.abc);
    const mlu = AbcRhythm.macrobeatLUnits(item.abc, !!item.isTriple);
    const spl = spm / mlu;
    const start = ctxCursor;
    for (const on of t.onsets) woodblockA(start + on*spl, 0.05, WB_PATTERN_GAIN);
    const durSec = Math.round(t.total / mlu) * spm;
    const echoed = maybeEchoOnsets(t.onsets, start, spl, durSec);
    const delayMs = (start - ctxNow) * 1000;
    visualTimers.push(setTimeout(() => renderPatternAbc(item.abc), Math.max(0, delayMs)));
    ctxCursor += durSec * (echoed ? 2 : 1);
  });
  const totalMs = (ctxCursor - ctxNow) * 1000 + 400;
  visualTimers.push(setTimeout(() => { if (continuousMode) onDone(); }, totalMs));
}
window.playLsaInterlude = playLsaInterlude;

// One individual (graded) pattern for LSA Practice: starts straight away (no
// count-in), matching the reference Continuous mode below -- just with woodblock
// voices instead of the plain metronome click, and the outcome (pass/fail)
// handed off to the page's own RA_ON_GRADED hook instead of auto-advancing.
async function runGradedCycleForSequence(){
  await ensureAudio();
  clearVisualTimers();
  frames = []; liveCount = 0; liveLast = 0; loop._lastOnset = 0;
  document.getElementById("liveCount").textContent = "Attacks detected: 0";
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  clearTimeline();
  hide("capturing"); hide("progwrap"); hide("performedCard");
  renderPatternAbc(currentAbc);   // always re-show THIS pattern (a class-pattern
                                  // interlude may have just repainted #notation)

  const spm = secPerMacrobeat(), spl = secPerLunit(), lat = latencyComp();
  const pm = Math.round(target.total / macroLUnits);
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();
  const patternDur = pm * spm;

  // Teaching / listen: the pattern, as a woodblock, straight away.
  const listenStart = ctxNow + INITIAL_DELAY;
  for (const on of target.onsets) woodblockA(listenStart + on*spl, 0.05, WB_PATTERN_GAIN);
  const echoed = maybeEchoOnsets(target.onsets, listenStart, spl, patternDur);
  const listenDur = patternDur * (echoed ? 2 : 1);

  // Evaluation / record: a quiet, different woodblock keeps the beat -- no
  // pattern replay, no echo (only the gentle click during evaluation).
  perfT0 = perfNow + (INITIAL_DELAY + listenDur + lat) * 1000;
  collecting = true;
  for (let k = 0; k < pm; k++) woodblockB(listenStart + listenDur + k*spm, 0.045, WB_BEAT_GAIN);

  visualTimers.push(setTimeout(() => {
    if (continuousMode && window.RA_ON_YOUR_TURN) window.RA_ON_YOUR_TURN();
  }, (INITIAL_DELAY + listenDur) * 1000));

  // The exact (audio-clock, not wall-clock) end of the response window -- used
  // to anchor the silence before whatever plays next precisely on the beat,
  // rather than off however long the grading callback below took to fire.
  const responseEndCtx = listenStart + listenDur + patternDur;

  const perfEndMs = (INITIAL_DELAY + listenDur + patternDur) * 1000;
  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    collecting = false;
    const summary = grade();
    window.RA_RESPONSE_END_CTX = responseEndCtx;
    if (window.RA_ON_GRADED) window.RA_ON_GRADED(summary === "pass");
  }, perfEndMs + 150));
}

async function runContinuousCycle(){
  if (!continuousMode || !running || collecting) return;
  if (RA_SEQUENCE){
    const seqIdx = parseInt(patternSel.value, 10) || 0;
    if (window.RA_ON_CYCLE_START) window.RA_ON_CYCLE_START(RA_SEQUENCE[seqIdx]);
    runGradedCycleForSequence();
    return;
  }
  await ensureAudio();
  clearVisualTimers();
  frames = []; liveCount = 0; liveLast = 0; loop._lastOnset = 0;
  document.getElementById("liveCount").textContent = "Attacks detected: 0";
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  clearTimeline();
  hide("capturing");
  hide("progwrap");
  // performedCard (last recording) stays visible until recording actually starts

  const spm = secPerMacrobeat(), spl = secPerLunit(), lat = latencyComp();
  const pm = Math.round(target.total / macroLUnits);
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();

  // metronome runs through the model AND the recording (beats 0..2pm-1), straight
  // in with no gap; accents at the model downbeat (0) and record downbeat (pm).
  // The 2-beat turnaround after the recording is silent (clicks muted).
  scheduleMetronome(ctxNow, perfNow, 2*pm, [0, pm], spm, lat);
  const modelDownbeat = ctxNow + INITIAL_DELAY;
  for (const on of target.onsets) click(88, modelDownbeat + on*spl, 0.07, 0.22);

  perfT0 = perfNow + (INITIAL_DELAY + pm*spm + lat) * 1000;   // record downbeat
  collecting = true;
  startRecording();
  setStatus("🔊 Listen to the pattern…", "listened");

  const recDownbeatMs = (INITIAL_DELAY + pm*spm) * 1000;
  const perfEndMs     = (INITIAL_DELAY + 2*pm*spm) * 1000;
  const nextMs        = (INITIAL_DELAY + (2*pm + 2)*spm) * 1000; // after turnaround

  // when the recording begins: clear the previous notation, prompt to perform
  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    hide("performedCard");
    setStatus("🎤 Your turn — perform now!", "recording");
    sessionResume();                    // capture this response into the session file
  }, recDownbeatMs));

  // grade as soon as the performance window ends (small tail to catch a late
  // last attack), so feedback appears almost immediately.
  let passed = false;
  visualTimers.push(setTimeout(async () => {
    collecting = false;
    sessionPause();
    sessionResponses++;
    sessionEntries.push({                     // for the SRT (aligns with the audio)
      label: `${collectionSel.value} — Pattern ${tuneBook.tunes[patternSel.value].id}`,
      durMs: (perfEndMs + 150) - recDownbeatMs
    });
    document.getElementById("beatdot").classList.remove("on", "accent");
    const summary = grade();                 // renders performed notation at top
    passed = (summary === "pass");
    setStatus(passed ? "✓ Passed — next pattern." : "✗ Not yet — repeating this pattern.",
              passed ? "passed" : "failed");
    const blob = await stopRecording();      // after feedback is shown
    presentRecording(blob, summary);
  }, perfEndMs + 150));

  // after the 2 turnaround clicks: advance on pass (end at collection end), then loop
  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    if (passed){
      if (isLastInCollection()){ endSession("complete"); return; }
      advanceNext();                          // load next target (keeps status/notation)
    }
    runContinuousCycle();
  }, nextMs));
}

// ---------- session logging / makeup replay ----------
SessionLog.init({
  app: "rhythm",
  getState: () => {
    if (!tuneBook) return null;
    const i = patternSel.selectedIndex;
    return { app:"rhythm", coll: collectionSel.value, idx: i, item: tuneBook.tunes[i].id,
             tempo: tempoEl.value, countin: document.getElementById("countin").value,
             label: `${collectionSel.value} P${tuneBook.tunes[i].id} · ${tempoEl.value} mb/min` };
  },
  applyState: (s) => {
    collectionSel.value = s.coll; loadCollection();
    patternSel.selectedIndex = Math.min(s.idx, patternSel.options.length-1);
    if (s.tempo){ tempoEl.value = s.tempo; document.getElementById("tempoVal").textContent = s.tempo; }
    if (s.countin) document.getElementById("countin").value = s.countin;
    loadPattern();
    setStatus("Makeup: "+(s.label||"")+" — SPACE to hear, then record.","ready");
  }
});

// ---------- init ----------
if (RA_SEQUENCE) buildSequenceCollection(); else loadCollection();
SessionLog.begin();
