// apps/lsa-rhythm-assessment/app.js — fork of apps/rhythm-assessment/app.js,
// independent (no shared hooks with that file or with the LSA Practice pages).
// Locked to the "Duple-M-m-2-4" collection (no collection picker). Identical to
// the reference rhythm assessment page in every way EXCEPT Continuous mode:
//   1. Regular patterns always advance to the next one, pass or fail (no more
//      repeat-on-fail for them).
//   2. LSA's r1-1A1 individual patterns (Easy/Moderate/Difficult) are woven into
//      that stream -- interjected after a random run of 1-3 regular patterns
//      (weighted so 2 is the most common gap). An interjected LSA pattern keeps
//      the old repeat-until-passed rule, and the teach/eval treatment: a 40%
//      chance of a quiet "someone plays along" echo during the listen phase,
//      and only a gentle beat-keeping click (no echo) during the response.
// The manual Play/Record/SPACE-driven flow is untouched -- these two differences
// are Continuous-mode-only.

// ---------- pattern library ----------
let currentAbc = "";
let target = { events: [], onsets: [], total: 0, lQuarters: 0.5 };
const isTriple = false;   // this page is locked to the duple Duple-M-m-2-4 collection
let macroLUnits = 1;      // macrobeat length in L-units (meter-derived)

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
const COLLECTION_KEY = "Duple-M-m-2-4";
const LSA_CRITERION_KEY = "r1-1A1";      // Usual Duple, levels E/M/D = tunes 0/1/2
const LSA_LEVEL_NAMES = ["Easy", "Moderate", "Difficult"];

const patternSel = document.getElementById("pattern");

let tuneBook = null;
// Traversal order of patterns within the collection (Next / advance / continuous
// all follow it). Shuffled when the "Shuffle order" option is on.
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
// Only one (locked) collection -- wraps around within it, no cross-collection step.
function advanceNext(){
  if (!isLastInCollection()) gotoOrder(orderPos() + 1);
  else gotoOrder(0);
}
function loadCollection(){
  tuneBook = new ABCJS.TuneBook(RA_PATTERNS[COLLECTION_KEY]);
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

function renderPattern(){
  ABCJS.renderAbc("notation", currentAbc,
    { responsive: "resize", add_classes: true, selectTypes: false, staffwidth: 320 });
}

function loadPattern(){
  const idx = parseInt(patternSel.value, 10) || 0;
  currentAbc = tuneBook.tunes[idx].abc;
  target = AbcRhythm.parse(currentAbc);
  macroLUnits = AbcRhythm.macrobeatLUnits(currentAbc, isTriple);
  renderPattern();
  document.getElementById("resultArea").innerHTML =
    `<div class="muted">Pattern loaded. Record an attempt when ready.</div>`;
  resetRecCard();
  clearTimeline();
  if (!continuousMode) setFlow(running ? "ready" : "nomic");
  if (window.SessionLog) SessionLog.present();
}

// The LSA individual pattern (r1-1A1), loaded into the same shared
// currentAbc/target/macroLUnits scratch state used for grading/rendering --
// loadPattern() (above) is what restores the regular pattern afterwards.
let lsaTuneBook = null;
function loadLsaLevel(levelIdx){
  currentAbc = lsaTuneBook.tunes[levelIdx].abc;
  target = AbcRhythm.parse(currentAbc);
  macroLUnits = AbcRhythm.macrobeatLUnits(currentAbc, false);
  renderPattern();
  document.getElementById("resultArea").innerHTML =
    `<div class="muted">LSA pattern (${LSA_LEVEL_NAMES[levelIdx]}). Record an attempt when ready.</div>`;
  resetRecCard();
  clearTimeline();
}

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
const secPerMacrobeat = () => 60 / parseInt(tempoEl.value, 10);
const secPerLunit = () => secPerMacrobeat() / macroLUnits;
const targetTimesSec = () => target.onsets.map(o => o * secPerLunit());

let perfT0 = 0;

// ---------- performed-rhythm notation (quantized to the beat grid) ----------
const GRID = 0.5;
function measureLUnits(){
  const m = AbcRhythm.meter(currentAbc);
  return 4 * m.n / (m.d * target.lQuarters);
}
function abcDur(d){
  const H = Math.round(d * 2);
  if (H <= 0) return "/2";
  if (H % 2 === 0){ const q = H/2; return q === 1 ? "" : String(q); }
  return String(H) + "/2";
}
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
    const beamable = dur * lq < 1;
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
      prevBeamable = false;
    }
  }
  return `X:1\n${mLine}\n${lLine}\nK: clef=none\n${out}`;
}
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
  show("performedCard");
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
  const detSec = detectOnsets(frames, sensitivity())
    .map(ms => (ms - perfT0) / 1000)
    .filter(s => s > -tolMs/1000 - 0.05);
  const area = document.getElementById("resultArea");

  drawTimeline(tgtSec, detSec, tolMs/1000);

  if (detSec.length !== N){
    renderPerformed(detSec, null);
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
  if (!blob){ resetRecCard(); return; }
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const tag = `${COLLECTION_KEY}_${summary}`.replace(/[^\w-]+/g,"-");
  const name = `attempt_${tstamp()}_${tag}.${ext}`;
  document.getElementById("player").src = lastUrl;
  const dl = document.getElementById("download");
  dl.href = lastUrl; dl.download = name;
  document.getElementById("recMeta").textContent =
    `${(blob.size/1024).toFixed(0)} KB · ${blob.type || "audio"} · ${name}`;
}

// ---------- continuous-session recorder (only the student responses) + SRT -----
let sessionRecorder = null, sessionChunks = [], sessionUrl = null, sessionSrtUrl = null;
let sessionResponses = 0, sessionEntries = [];
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
let activeOscs = [];
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
let calibratedLatencyMs = null;
const latencyComp = () => calibratedLatencyMs !== null
  ? calibratedLatencyMs / 1000
  : (audioCtx.outputLatency || audioCtx.baseLatency || 0);

// ---------- LSA woodblock synthesis (teach/eval treatment for interjected LSA patterns) ----
// A short filtered noise burst reads as a woodblock/clave hit -- distinct from
// the plain square-wave click() above, which the regular patterns keep using
// unchanged. Two voices: A (bright, "the pattern") and B (quieter/lower, the
// beat-keeper during a response and the quiet "someone plays along" echo).
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
const woodblockA = (t, dur, gain) => woodblock(t, dur, gain, 1500);
const woodblockB = (t, dur, gain) => woodblock(t, dur, gain, 850);
const WB_PATTERN_GAIN = 0.64;
const WB_ECHO_GAIN     = 0.28;
const WB_BEAT_GAIN     = 0.26;
// 40% chance of a quiet echo of `onsets` right after the pattern's own `durSec` --
// teaching-mode-only reinforcement. Returns whether it fired.
function maybeEchoOnsets(onsets, startCtx, spl, durSec){
  if (Math.random() >= 0.4) return false;
  const echoStart = startCtx + durSec;
  for (const on of onsets) woodblockB(echoStart + on*spl, 0.05, WB_ECHO_GAIN);
  return true;
}

// ---------- latency calibration (acoustic loopback; speakers only) ----------
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
  const scheduled = [];
  for (let k=0;k<N;k++){
    const ctxT = ctxNow + lead + k*gap;
    click(84, ctxT, 0.05, 0.5);
    scheduled.push(perfNow + (ctxT - ctxNow)*1000);
  }
  const endMs = (lead + N*gap + 0.35) * 1000;

  setTimeout(() => {
    collecting = false;
    const onsets = detectOnsets(frames, 0.05);
    const delays = [];
    for (const ps of scheduled){
      const hit = onsets.find(o => o >= ps - 5 && o <= ps + 350);
      if (hit !== undefined) delays.push(hit - ps);
    }
    if (delays.length >= 3){
      delays.sort((a,b)=>a-b);
      calibratedLatencyMs = delays[Math.floor(delays.length/2)];
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
  void dot.offsetWidth;
  dot.classList.add(accent ? "accent" : "on");
  setTimeout(() => dot.classList.remove("on", "accent"), 95);
}
function scheduleBeat(ctxNow, perfNow, k, accent, spm, lat){
  const beatCtx = ctxNow + INITIAL_DELAY + k*spm;
  if (document.getElementById("metroAudible").checked)
    click(accent ? 76 : 69, beatCtx, 0.05, accent ? 0.22 : 0.13);
  if (document.getElementById("metroVisual").checked){
    const delay = perfNow + (beatCtx - ctxNow + lat)*1000 - performance.now();
    visualTimers.push(setTimeout(() => flashBeat(accent), Math.max(0, delay)));
  }
}
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
  scheduleMetronome(ctxNow, perfNow, N + perfMacrobeats, [0, N], spm, lat);
  perfT0 = perfNow + (INITIAL_DELAY + N*spm + lat) * 1000;

  collecting = true;
  startRecording();

  const perfDurSec = target.total * secPerLunit();
  const countInMs = perfT0 - perfNow;
  const totalMs = countInMs + perfDurSec*1000 + 700;
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

// ---------- spacebar-driven flow (manual step-through -- unaffected by the two
// Continuous-mode differences below) ----------
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
function handleSpace(){
  if (!running){ setFlow("nomic"); return; }
  if (continuousMode){ stopContinuous(); return; }
  switch (flowState){
    case "recording": return;
    case "listened":
    case "failed":    recordAttempt(); break;
    case "passed":    advanceNext(); break;
    default:          hearPattern();
  }
}
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT")) return;
  e.preventDefault();
  handleSpace();
});

// ---------- continuous mode (automatic call-and-response loop) ----------
// Difference #1: regular patterns from the (locked) collection ALWAYS advance,
// pass or fail -- runRegularCycle() below.
// Difference #2: LSA's r1-1A1 individual patterns are interjected into that
// stream after a random run of 1-3 regular patterns (weighted so 2 is most
// common); an interjected LSA pattern repeats until passed, with the teach/eval
// treatment -- runLsaCycle() below.
let continuousMode = false;

function setContinuousUI(){
  const btn = document.getElementById("continuous");
  btn.textContent = continuousMode ? "■ Stop" : "∞ Continuous mode";
  btn.classList.toggle("primary", continuousMode);
  document.getElementById("record").disabled = continuousMode || !running;
  document.getElementById("play").disabled = continuousMode;
}
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
  setFlow(running ? "ready" : "nomic");
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

// Random gap (in regular patterns) before the next LSA interjection: 1-3,
// weighted 20% / 60% / 20% so 2 is the common case.
function pickInterjectGap(){
  const r = Math.random();
  if (r < 0.2) return 1;
  if (r < 0.8) return 2;
  return 3;
}
let onLsaPattern = false;
let lsaLevelIdx = 0;              // 0=E, 1=M, 2=D -- cycles indefinitely
let regularStreak = 0;            // regular patterns presented since the last interjection
let nextInterjectAt = pickInterjectGap();

async function runContinuousCycle(){
  if (!continuousMode || !running || collecting) return;
  if (onLsaPattern){ runLsaCycle(); return; }
  if (regularStreak >= nextInterjectAt){
    onLsaPattern = true;
    runLsaCycle();   // loadLsaLevel() happens inside runLsaCycle() itself
    return;
  }
  runRegularCycle();
}

async function runRegularCycle(){
  await ensureAudio();
  clearVisualTimers();
  frames = []; liveCount = 0; liveLast = 0; loop._lastOnset = 0;
  document.getElementById("liveCount").textContent = "Attacks detected: 0";
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  clearTimeline();
  hide("capturing");
  hide("progwrap");

  const spm = secPerMacrobeat(), spl = secPerLunit(), lat = latencyComp();
  const pm = Math.round(target.total / macroLUnits);
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();

  scheduleMetronome(ctxNow, perfNow, 2*pm, [0, pm], spm, lat);
  const modelDownbeat = ctxNow + INITIAL_DELAY;
  for (const on of target.onsets) click(88, modelDownbeat + on*spl, 0.07, 0.22);

  perfT0 = perfNow + (INITIAL_DELAY + pm*spm + lat) * 1000;
  collecting = true;
  startRecording();
  setStatus("🔊 Listen to the pattern…", "listened");

  const recDownbeatMs = (INITIAL_DELAY + pm*spm) * 1000;
  const perfEndMs     = (INITIAL_DELAY + 2*pm*spm) * 1000;
  const nextMs        = (INITIAL_DELAY + (2*pm + 2)*spm) * 1000;

  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    hide("performedCard");
    setStatus("🎤 Your turn — perform now!", "recording");
    sessionResume();
  }, recDownbeatMs));

  visualTimers.push(setTimeout(async () => {
    collecting = false;
    sessionPause();
    sessionResponses++;
    sessionEntries.push({
      label: `${COLLECTION_KEY} — Pattern ${tuneBook.tunes[patternSel.value].id}`,
      durMs: (perfEndMs + 150) - recDownbeatMs
    });
    document.getElementById("beatdot").classList.remove("on", "accent");
    const summary = grade();
    const passed = (summary === "pass");
    setStatus(passed ? "✓ Passed — next pattern." : "✗ Not yet — moving to the next pattern anyway.",
              passed ? "passed" : "failed");
    const blob = await stopRecording();
    presentRecording(blob, summary);
  }, perfEndMs + 150));

  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    regularStreak++;                  // difference #1: always advance, pass or fail
    advanceNext();
    runContinuousCycle();
  }, nextMs));
}

async function runLsaCycle(){
  await ensureAudio();
  clearVisualTimers();
  frames = []; liveCount = 0; liveLast = 0; loop._lastOnset = 0;
  document.getElementById("liveCount").textContent = "Attacks detected: 0";
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  clearTimeline();
  hide("capturing"); hide("progwrap"); hide("performedCard");
  loadLsaLevel(lsaLevelIdx);   // re-show notation on every attempt, including retries

  const spm = secPerMacrobeat(), spl = secPerLunit(), lat = latencyComp();
  const pm = Math.round(target.total / macroLUnits);
  const ctxNow = audioCtx.currentTime, perfNow = performance.now();
  const patternDur = pm * spm;

  // Teaching / listen: the pattern, as a woodblock, straight away -- 40% chance
  // of a quiet "someone plays along" echo.
  const listenStart = ctxNow + INITIAL_DELAY;
  for (const on of target.onsets) woodblockA(listenStart + on*spl, 0.05, WB_PATTERN_GAIN);
  const echoed = maybeEchoOnsets(target.onsets, listenStart, spl, patternDur);
  const listenDur = patternDur * (echoed ? 2 : 1);

  // Evaluation / record: only the gentle, different woodblock keeps the beat --
  // no pattern replay, no echo.
  perfT0 = perfNow + (INITIAL_DELAY + listenDur + lat) * 1000;
  collecting = true;
  startRecording();
  for (let k = 0; k < pm; k++) woodblockB(listenStart + listenDur + k*spm, 0.045, WB_BEAT_GAIN);
  setStatus(`🔊 LSA pattern (${LSA_LEVEL_NAMES[lsaLevelIdx]}) — listen…`, "listened");

  visualTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    setStatus("🎤 Your turn — perform the LSA pattern now!", "recording");
    sessionResume();
  }, listenDur * 1000));

  const perfEndMs = (INITIAL_DELAY + listenDur + patternDur) * 1000;
  visualTimers.push(setTimeout(async () => {
    if (!continuousMode) return;
    collecting = false;
    sessionPause();
    sessionResponses++;
    sessionEntries.push({
      label: `LSA r1-1A1 — ${LSA_LEVEL_NAMES[lsaLevelIdx]}`,
      durMs: patternDur * 1000
    });
    document.getElementById("beatdot").classList.remove("on", "accent");
    const summary = grade();
    const passed = (summary === "pass");
    const blob = await stopRecording();
    presentRecording(blob, summary);
    setStatus(passed
      ? "✓ Passed the LSA pattern — back to the collection."
      : "✗ Not yet — repeating the LSA pattern.",
      passed ? "passed" : "failed");

    if (passed){
      onLsaPattern = false;
      lsaLevelIdx = (lsaLevelIdx + 1) % LSA_LEVEL_NAMES.length;
      regularStreak = 0;
      nextInterjectAt = pickInterjectGap();
      loadPattern();   // restore the regular pattern's notation/state
    }
    runContinuousCycle();
  }, perfEndMs + 150));
}

// ---------- session logging / makeup replay ----------
SessionLog.init({
  app: "rhythm",
  getState: () => {
    if (!tuneBook) return null;
    const i = patternSel.selectedIndex;
    return { app:"rhythm", coll: COLLECTION_KEY, idx: i, item: tuneBook.tunes[i].id,
             tempo: tempoEl.value, countin: document.getElementById("countin").value,
             label: `${COLLECTION_KEY} P${tuneBook.tunes[i].id} · ${tempoEl.value} mb/min` };
  },
  applyState: (s) => {
    patternSel.selectedIndex = Math.min(s.idx, patternSel.options.length-1);
    if (s.tempo){ tempoEl.value = s.tempo; document.getElementById("tempoVal").textContent = s.tempo; }
    if (s.countin) document.getElementById("countin").value = s.countin;
    loadPattern();
    setStatus("Makeup: "+(s.label||"")+" — SPACE to hear, then record.","ready");
  }
});

// ---------- init ----------
loadCollection();
lsaTuneBook = new ABCJS.TuneBook(RA_PATTERNS[LSA_CRITERION_KEY]);
SessionLog.begin();
