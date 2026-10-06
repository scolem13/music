// ---------- music helpers ----------
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const A4 = 440;
const midiToFreq = m => A4 * Math.pow(2, (m - 69) / 12);
const freqToMidiFloat = f => 69 + 12 * Math.log2(f / A4);
const noteName = midi => (window.Tonality && Tonality.noteName) ? Tonality.noteName(midi)
  : NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi/12) - 1);   // key-aware spelling when available
const centsOff = (f, ref) => 1200 * Math.log2(f / ref);

function bestCents(fDet, refFreq, allowOct){
  const shifts = allowOct ? [0, 12, -12, 24, -24] : [0];
  let best = Infinity, bestOct = 0;
  for (const s of shifts){
    const c = centsOff(fDet, refFreq * Math.pow(2, s/12));
    if (Math.abs(c) < Math.abs(best)){ best = c; bestOct = s/12; }
  }
  return { cents: best, octaves: bestOct };
}

// ---------- pattern library (from pattern-object.js, parsed by abcjs) ----------
let currentAbc = "";     // ABC of the selected tune
let baseTargets = [];    // V1 melody MIDI in the pattern's written key (C / Cm)
let targets = [];        // baseTargets + transpose (what the student must sing)
let currentMinor = false;// pattern key is minor? (controls spelling)
let transpose = 0;       // semitones applied to display + targets (key + octave)
let lastDetected = null; // freqs from the most recent attempt (for re-render)

// The stimulus is always the full pattern (shown + played); the GRADED target
// depends on the assessment type: repeat the whole pattern, sing the resting tone
// (tonic of the current key), or sing just the first pitch.
function gradeTargets(){
  const t = document.getElementById("assess").value;
  if (t === "resting") return [60 + transpose];          // tonic in the current key/octave
  if (t === "first")   return targets.length ? [targets[0]] : [];
  return targets;                                         // "repeat"
}

// timing: faster playback (model), more time for the student to perform
const PLAY_PER_NOTE = 0.6;   // seconds between notes during playback
const REC_PER_NOTE  = 0.8;   // seconds per note allowed for recording
const CAPTURE_TAIL  = 0.6;   // extra seconds so the last note isn't clipped
const captureMs = () => Math.round((gradeTargets().length * REC_PER_NOTE + CAPTURE_TAIL) * 1000);

// show/hide without layout shift (visibility + reserved CSS heights)
const show = id => document.getElementById(id).classList.remove("hidden");
const hide = id => document.getElementById(id).classList.add("hidden");
function resetRecCard(){
  document.getElementById("player").removeAttribute("src");
  const dl = document.getElementById("download");
  dl.removeAttribute("href"); dl.removeAttribute("download");
  document.getElementById("recMeta").textContent = "No recording yet.";
  if (lastUrl){ URL.revokeObjectURL(lastUrl); lastUrl = null; }
}

// ---------- spacebar flow status ----------
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

const collectionSel = document.getElementById("collection");
const patternSel = document.getElementById("pattern");

for (const key in patternObject){
  const o = document.createElement("option");
  o.value = key; o.textContent = key;
  collectionSel.appendChild(o);
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
  tuneBook = new ABCJS.TuneBook(patternObject[collectionSel.value]);
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

// Build a single-voice (V1) ABC for clean notation rendering, with the chosen clef.
function clefField(){
  const c = document.getElementById("clef").value;
  return c === "treble" ? "" : " clef=" + c;
}
function v1RenderAbc(abc){
  const keep = [];
  for (const raw of abc.split("\n")){
    const line = raw.trim();
    if (/^(X:|T:)/.test(line)) keep.push(line);
    else if (/^K:/.test(line)) keep.push(line + clefField());
    else if (/^\[V:\s*V1\]/.test(line)) keep.push(line);
  }
  // %%topspace reserves headroom above the staff so the octave (8va/8vb) bracket
  // has a place to sit — and so the original and response staves stay aligned and
  // the staff never shifts down when the bracket appears.
  if (keep.length) keep[0] += "\nM:none\n%%staffwidth 200\n%%topspace 22\n%%score (V1)";
  return keep.join("\n");
}

// Key dropdown: offsets in semitones from the written key (C / Cm).
const KEY_OFFSETS = [0,1,2,3,4,5,6,7,8,9,10,11];
const MAJOR_NAMES = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
const MINOR_NAMES = ["Cm","C♯m","Dm","E♭m","Em","Fm","F♯m","Gm","G♯m","Am","B♭m","Bm"];
function populateKeys(){
  const sel = document.getElementById("key");
  const prev = sel.value || "0";
  sel.innerHTML = "";
  const names = currentMinor ? MINOR_NAMES : MAJOR_NAMES;
  KEY_OFFSETS.forEach(off => {
    const o = document.createElement("option");
    o.value = off; o.textContent = names[off];
    sel.appendChild(o);
  });
  sel.value = prev;
}

function renderPattern(){
  // "Transposed" view shifts the DISPLAY by the transposing instrument's offset (what
  // the player reads); targets/grading/sound stay at concert pitch (transpose only).
  const di = (window.Tonality && Tonality.getView && Tonality.getView()==="transposed")
    ? ((Tonality.getInstrument()||{}).semis||0) : 0;
  ABCJS.renderAbc("notation", v1RenderAbc(currentAbc),
    { responsive: "resize", add_classes: false, selectTypes: false, visualTranspose: transpose + di });
}

// Recompute transpose + targets from the controls and redraw.
function applyControls(){
  const keyOff = parseInt(document.getElementById("key").value, 10) || 0;
  const octOff = parseInt(document.getElementById("octave").value, 10) || 0;
  transpose = keyOff + 12 * octOff;
  targets = baseTargets.map(m => m + transpose);
  renderPattern();
  // existing controls invalidate a shown response; redraw it if we have one
  if (lastDetected) renderResponse(lastDetected);
  if (window.SessionLog) SessionLog.present();
}

["key","octave","clef","assess"].forEach(id =>
  document.getElementById(id).addEventListener("change", applyControls));

function solfegeOf(abc){
  for (const raw of abc.split("\n")){
    const line = raw.trim();
    if (line.startsWith("w:")) return line.replace(/^w:\s*/, "");
  }
  return "";
}

function loadPattern(){
  const idx = parseInt(patternSel.value, 10) || 0;
  currentAbc = tuneBook.tunes[idx].abc;
  baseTargets = AbcPitch.melodyMidi(currentAbc);
  currentMinor = /^[A-Ga-g][#b]?\s*m/i.test(AbcPitch.extractVoice1(currentAbc).key);
  lastDetected = null;

  populateKeys();
  applyControls();        // sets transpose + targets and renders the pattern

  document.getElementById("resultArea").innerHTML =
    `<div class="muted">Pattern loaded. Record an attempt when ready.</div>`;
  resetRecCard();
  // responseCard (last attempt's notation) stays until the next recording starts
  if (!continuousMode) setFlow(running ? "ready" : "nomic");
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

// ---------- pitch detection (YIN) ----------
const RMS_GATE = 0.012, YIN_THRESHOLD = 0.15, FMIN = 70, FMAX = 1100;
function detectPitch(buf, sampleRate){
  const SIZE = buf.length, W = Math.floor(SIZE / 2);
  let rms = 0;
  for (let i=0;i<SIZE;i++){ rms += buf[i]*buf[i]; }
  if (Math.sqrt(rms/SIZE) < RMS_GATE) return -1;
  const d = new Float32Array(W);
  for (let tau=1; tau<W; tau++){
    let sum = 0;
    for (let j=0;j<W;j++){ const diff = buf[j] - buf[j+tau]; sum += diff*diff; }
    d[tau] = sum;
  }
  const cmnd = new Float32Array(W);
  cmnd[0] = 1;
  let running = 0;
  for (let tau=1; tau<W; tau++){
    running += d[tau];
    cmnd[tau] = running > 0 ? d[tau] * tau / running : 1;
  }
  let tau = -1;
  for (let t=2; t<W; t++){
    if (cmnd[t] < YIN_THRESHOLD){ while (t+1 < W && cmnd[t+1] < cmnd[t]) t++; tau = t; break; }
  }
  if (tau === -1) return -1;
  let betterTau = tau;
  if (tau > 0 && tau < W-1){
    const s0 = cmnd[tau-1], s1 = cmnd[tau], s2 = cmnd[tau+1];
    const denom = 2*(2*s1 - s2 - s0);
    if (denom) betterTau = tau + (s2 - s0) / denom;
  }
  const f0 = sampleRate / betterTau;
  return (f0 < FMIN || f0 > FMAX) ? -1 : f0;
}

// ---------- audio setup + live tuner ----------
let audioCtx, analyser, micStream, buf, running = false;
const freqEl = document.getElementById("freq");
const liveNoteEl = document.getElementById("livenote");
const needle = document.getElementById("needle");
const zone = document.getElementById("zone");

let collecting = false;
let samples = [];                 // {t, f}  f=-1 unvoiced (for gap detection)
const NEEDLE_ALPHA = 0.15;        // lower = heavier/slower needle
let smoothedFreq = null;

async function enableMic(){
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false
    }});
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    running = true;
    document.getElementById("record").disabled = false;
    document.getElementById("continuous").disabled = false;
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

function loop(){
  if (!running) return;
  analyser.getFloatTimeDomainData(buf);
  const f = detectPitch(buf, audioCtx.sampleRate);
  const now = performance.now();
  if (f > 0){
    if (smoothedFreq === null || Math.abs(1200*Math.log2(f/smoothedFreq)) > 200)
      smoothedFreq = f;
    else
      smoothedFreq += (f - smoothedFreq) * NEEDLE_ALPHA;
    const sf = smoothedFreq;
    const nearest = Math.round(freqToMidiFloat(sf));
    const cents = centsOff(sf, midiToFreq(nearest));
    freqEl.textContent = sf.toFixed(1) + " Hz";
    liveNoteEl.textContent = noteName(nearest) + " (" + (cents>=0?"+":"") + cents.toFixed(0) + "¢)";
    needle.style.left = (50 + Math.max(-50, Math.min(50, cents))) + "%";
  }
  if (collecting) samples.push({ t: now, f });   // raw f for grading
  requestAnimationFrame(loop);
}

function drawZone(){
  const half = Math.min(50, parseInt(document.getElementById("tol").value,10));
  zone.style.left = (50 - half) + "%";
  zone.style.width = (2*half) + "%";
}
document.getElementById("tol").addEventListener("change", drawZone);
drawZone();

// ---------- segmentation + grading ----------
const median = arr => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a,b)=>a-b), m = Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
};
const GAP_MS = 70, MIN_VOICED = 4;

// Optimal partition of pitch series x[] into exactly N contiguous segments that
// minimizes total within-segment variance (DP). `mand[i]` = a mandatory boundary
// (silent gap) between x[i] and x[i+1] — segments may not span it. Returns the
// boundary indices [0, …, T] (length N+1), or null if infeasible.
function dpPartition(x, mand, N){
  const T = x.length, INF = Infinity;
  const S1 = [0], S2 = [0], MB = [0];          // prefix sums of x, x², and gaps
  for (let i=0;i<T;i++){
    S1.push(S1[i] + x[i]); S2.push(S2[i] + x[i]*x[i]);
    MB.push(MB[i] + ((i < T-1 && mand[i]) ? 1 : 0));
  }
  const cost = (a, b) => {                       // variance·n of x[a..b)
    const n = b - a; if (n <= 0) return INF;
    if ((MB[b-1] - MB[a]) > 0) return INF;        // crosses a gap → not allowed
    const s1 = S1[b]-S1[a], s2 = S2[b]-S2[a];
    return s2 - s1*s1/n;
  };
  const dp = Array.from({length:N+1}, () => new Array(T+1).fill(INF));
  const back = Array.from({length:N+1}, () => new Array(T+1).fill(-1));
  dp[0][0] = 0;
  for (let m=1;m<=N;m++) for (let b=m;b<=T;b++) for (let a=m-1;a<b;a++){
    if (dp[m-1][a] === INF) continue;
    const c = cost(a, b); if (c === INF) continue;
    const v = dp[m-1][a] + c;
    if (v < dp[m][b]){ dp[m][b] = v; back[m][b] = a; }
  }
  if (dp[N][T] === INF) return null;
  const bounds = [T]; let m = N, b = T;
  while (m > 0){ const a = back[m][b]; bounds.push(a); b = a; m--; }
  return bounds.reverse();
}

// Detect the sung notes. Grading runs offline on the whole capture, and we know N
// (the target count), so we split into exactly N segments optimally. Boundaries
// land at real pitch transitions; vibrato/wobble becomes within-segment spread and
// glides are too short to form a segment → robust. Silent gaps force boundaries
// (so same-pitch repeats still separate, and over-singing → more chunks than N is
// reported as a count mismatch).
function segment(samps){
  const N = gradeTargets().length;
  // 1. group voiced frames into chunks separated by silent gaps; drop tiny chunks
  const chunks = []; let chunk = [], gapStart = null;
  for (const s of samps){
    if (s.f > 0){ chunk.push(s.f); gapStart = null; }
    else if (chunk.length){
      if (gapStart === null) gapStart = s.t;
      if (s.t - gapStart >= GAP_MS){ chunks.push(chunk); chunk = []; gapStart = null; }
    }
  }
  if (chunk.length) chunks.push(chunk);
  const real = chunks.filter(c => c.length >= MIN_VOICED);
  if (!real.length) return [];
  if (real.length > N) return real.map(c => median(c));   // more gaps than notes → mismatch
  // 2. flatten, marking a mandatory boundary at each gap between chunks
  const pts = [], mids = [], mand = [];
  real.forEach((c, ci) => {
    c.forEach(f => { pts.push(f); mids.push(freqToMidiFloat(f)); mand.push(false); });
    if (ci < real.length - 1) mand[mand.length - 1] = true;
  });
  if (pts.length < N) return real.map(c => median(c));
  // 3. optimal N-segment partition → median raw freq per segment
  const bounds = dpPartition(mids, mand, N);
  if (!bounds) return real.map(c => median(c));
  const out = [];
  for (let s=0;s<bounds.length-1;s++) out.push(median(pts.slice(bounds[s], bounds[s+1])));
  return out;
}

// ---------- render the sung response as notation (same style as the pattern) ----------
const BASE_NAT = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function midiToAbcToken(midi, minorKey){
  const pc = ((midi % 12) + 12) % 12;
  const prefMajor = {0:"C",1:"C",2:"D",3:"E",4:"E",5:"F",6:"F",7:"G",8:"G",9:"A",10:"B",11:"B"};
  const prefMinor = {0:"C",1:"D",2:"D",3:"E",4:"E",5:"F",6:"G",7:"G",8:"A",9:"A",10:"B",11:"B"};
  const letter = (minorKey ? prefMinor : prefMajor)[pc];
  let accAbs = pc - BASE_NAT[letter];
  if (accAbs > 6) accAbs -= 12; else if (accAbs < -6) accAbs += 12;
  const keysigAlt = (minorKey && (letter==="E"||letter==="A"||letter==="B")) ? -1 : 0;
  const accMap = {"-2":"__","-1":"_","0":"=","1":"^","2":"^^"};
  const explicit = (accAbs === keysigAlt) ? "" : (accMap[accAbs] || "");
  const anchor = 60 + BASE_NAT[letter];
  const finalOct = 4 + Math.round((midi - accAbs - anchor) / 12);
  let tok = explicit;
  if (finalOct >= 5) tok += letter.toLowerCase() + "'".repeat(finalOct - 5);
  else               tok += letter + ",".repeat(Math.max(0, 4 - finalOct));
  return tok + "0";   // "0" duration -> stemless noteheads, matching the pattern
}
const OCTAVE_MARK = { "1":"8va", "2":"15ma", "-1":"8vb", "-2":"15mb" };

// Color the rendered noteheads of a staff by a pass/fail array (index-aligned).
function colorNotes(divId, passArr){
  const el = document.getElementById(divId);
  const notes = el.querySelectorAll(".abcjs-note");
  notes.forEach((n, i) => {
    const c = passArr[i] === undefined ? "#000" : (passArr[i] ? "#138000" : "#cc0000");
    if (n.tagName.toLowerCase() === "path") n.setAttribute("fill", c);
    n.querySelectorAll("path").forEach(p => p.setAttribute("fill", c));
  });
}

// Render what the student sang. Each note is folded into the displayed octave
// (so it stays on the staff) with an 8va/8vb/15ma/15mb text marker when it was
// actually sung an octave or two away. Notes are spelled/keyed/clef'd exactly
// like the pattern (built in the written key + rendered with visualTranspose).
// Draw ONE dotted 8va/8vb bracket above the whole passage (used when the student
// sang the entire pattern an octave away, instead of marking every note).
function drawOctaveBracket(divId, label){
  try {
    const svg = document.getElementById(divId).querySelector("svg");
    const notes = svg ? svg.querySelectorAll(".abcjs-note") : [];
    if (!notes.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    notes.forEach(n => { const b = n.getBBox(); minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + b.width); minY = Math.min(minY, b.y); });
    const NS = "http://www.w3.org/2000/svg", y = minY - 7;
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", minX); txt.setAttribute("y", y); txt.setAttribute("font-size", "11");
    txt.setAttribute("font-style", "italic"); txt.setAttribute("fill", "#000"); txt.textContent = label;
    svg.appendChild(txt);
    const tw = txt.getBBox().width, ly = y - 3, down = /b$|^-/.test(label);
    const dash = (x1, y1, x2, y2) => { const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("stroke", "#000"); l.setAttribute("stroke-width", "1"); l.setAttribute("stroke-dasharray", "2 2"); svg.appendChild(l); };
    dash(minX + tw + 3, ly, maxX, ly);                  // the dotted line
    dash(maxX, ly, maxX, ly + (down ? 5 : -5));         // end hook
  } catch (e) {}
}

function renderResponse(detected){
  lastDetected = detected;
  const tol = parseInt(document.getElementById("tol").value, 10);
  const allowOct = document.getElementById("octtol").checked;
  const gt = gradeTargets();

  const notes = [], passArr = [], shifts = [];
  let any = false;
  detected.forEach((f, i) => {
    if (f <= 0) return;
    any = true;
    const d = Math.round(freqToMidiFloat(f));
    const ref = gt.length ? gt[Math.min(i, gt.length - 1)] : 60 + transpose;
    const octShift = Math.round((d - ref) / 12);
    const written = d - 12 * octShift - transpose;   // pre-transpose pitch for abcjs
    notes.push({ tok: midiToAbcToken(written, currentMinor), octShift });
    shifts.push(octShift);
    if (i < gt.length){
      const { cents } = bestCents(f, midiToFreq(gt[i]), allowOct);
      passArr.push(Math.abs(cents) <= tol);
    } else {
      passArr.push(false);                            // extra note beyond the target
    }
  });
  if (!any){ hide("responseCard"); return; }

  const markFor = s => OCTAVE_MARK[s] || (s ? (s > 0 ? "+" : "") + s + "8ve" : "");
  // whole pattern shifted by the same octave → one dotted bracket; else per-note marks
  const uniform = shifts.every(s => s === shifts[0]) ? shifts[0] : null;
  const useBracket = uniform !== null && uniform !== 0;
  const toks = notes.map(n => (!useBracket && markFor(n.octShift)) ? `"^${markFor(n.octShift)}"` + n.tok : n.tok);

  const abc = "X:1\nM:none\n%%staffwidth 200\n%%topspace 22\n%%score (V1)\nK:" +
              (currentMinor ? "Cm" : "C") + clefField() +
              "\n[V: V1] " + toks.join(" ");
  show("responseCard");                                 // reveal first so the pane has its real width
  requestAnimationFrame(() => {
    ABCJS.renderAbc("responseNotation", abc,
      { responsive: "resize", add_classes: true, selectTypes: false, visualTranspose: transpose });
    colorNotes("responseNotation", passArr);
    if (useBracket) drawOctaveBracket("responseNotation", markFor(uniform));
  });
}

function grade(){
  const tol = parseInt(document.getElementById("tol").value,10);
  const allowOct = document.getElementById("octtol").checked;
  const gt = gradeTargets();
  const N = gt.length;
  const detected = segment(samples);
  const area = document.getElementById("resultArea");

  renderResponse(detected);   // show what was sung, in notation, regardless of pass/fail

  if (detected.length !== N){
    area.innerHTML =
      `<div class="fail">Detected ${detected.length} note(s), expected ${N}.</div>` +
      `<div class="muted">Leave a clear ~0.2s silent gap between notes and hold each ` +
      `steadily. (Detected: ${detected.map(f=>f?f.toFixed(0)+'Hz':'—').join(', ') || 'none'})</div>`;
    return "incomplete";
  }

  let allPass = true, rows = "";
  for (let i=0;i<N;i++){
    const refMidi = gt[i], refFreq = midiToFreq(refMidi);
    const fMed = detected[i];
    const { cents, octaves } = bestCents(fMed, refFreq, allowOct);
    const pass = Math.abs(cents) <= tol;
    if (!pass) allPass = false;
    const sungMidi = Math.round(freqToMidiFloat(fMed));
    const octTag = octaves ? ` <span class="muted">(${octaves>0?"+":""}${octaves} oct)</span>` : "";
    rows += `<tr>
      <td>${i+1}</td>
      <td>${noteName(refMidi)} (${refFreq.toFixed(0)} Hz)</td>
      <td>${noteName(sungMidi)} (${fMed.toFixed(0)} Hz)</td>
      <td>${cents>=0?"+":""}${cents.toFixed(0)}¢${octTag}</td>
      <td class="${pass?'pass':'fail'}">${pass?'✓':'✗'}</td>
    </tr>`;
  }
  area.innerHTML =
    `<table><thead><tr><th>#</th><th>Target</th><th>You sang</th><th>Off</th><th></th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<div class="overall ${allPass?'pass':'fail'}">${allPass?'✓ PASS — all '+N+' notes':'✗ FAIL'}</div>` +
    `<div class="muted">Tolerance ±${tol}¢. Octave transposition ${allowOct?"accepted (±1–2)":"not accepted"}. Rhythm ignored.</div>`;
  return allPass ? "pass" : "fail";
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
  const tag = `${collectionSel.value}_p${tuneBook.tunes[patternSel.value].id}_${document.getElementById("assess").value}_${summary}`;
  const name = `attempt_${tstamp()}_${tag}.${ext}`;
  document.getElementById("player").src = lastUrl;
  const dl = document.getElementById("download");
  dl.href = lastUrl; dl.download = name;
  document.getElementById("recMeta").textContent =
    `${(blob.size/1024).toFixed(0)} KB · ${blob.type || "audio"} · ${name}`;
}

// ---------- continuous-session recorder (only the student responses) ----------
// A single MediaRecorder that runs for the whole continuous session but is PAUSED
// during model playback + gaps and RESUMED for each response window. Pause/resume
// yields one valid file containing only the responses, concatenated.
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
  try { sessionRecorder.start(); sessionRecorder.pause(); } catch(e){ /* pause may be unsupported */ }
}
function sessionResume(){ try { if (sessionRecorder && sessionRecorder.state === "paused") sessionRecorder.resume(); } catch(e){} }
function sessionPause(){ try { if (sessionRecorder && sessionRecorder.state === "recording") sessionRecorder.pause(); } catch(e){} }
function finalizeSession(){
  const rec = sessionRecorder; sessionRecorder = null;
  const meta = document.getElementById("sessionMeta");
  if (!rec){
    if (sessionResponses === 0)
      meta.textContent = "Run Continuous mode, then Stop to download every response (model playback and gaps excluded).";
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
    // SRT labels (timestamps line up with the responses-only audio)
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

// ---------- record attempt (fixed-duration capture, segmented on silence) ----------
function recordAttempt(){
  if (collecting) return;
  const dur = captureMs();
  const recBtn = document.getElementById("record");
  samples = []; collecting = true; recBtn.disabled = true;
  setFlow("recording");
  show("capturing"); show("progwrap");
  hide("responseCard");
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();
  startRecording();

  const start = performance.now(), prog = document.getElementById("prog");
  (function tick(){
    const pct = Math.min(100, (performance.now()-start)/dur*100);
    prog.style.width = pct + "%";
    if (pct < 100 && collecting) requestAnimationFrame(tick);
  })();

  setTimeout(async () => {
    collecting = false;
    hide("capturing"); hide("progwrap");
    const summary = grade();
    setFlow(summary === "pass" ? "passed" : "failed");
    if (window.SessionLog) SessionLog.onResult(summary === "pass");
    const blob = await stopRecording();
    presentRecording(blob, summary);
    recBtn.disabled = false;
  }, dur);
}
document.getElementById("record").addEventListener("click", recordAttempt);

// ---------- audio playback helpers ----------
async function ensureAudio(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.resume();
}
let activeOscs = [];   // scheduled oscillators, so STOP can silence them at once
function stopAllTones(){
  for (const osc of activeOscs){ try { osc.stop(); } catch(e){} }
  activeOscs = [];
}
function playTone(midi, start, dur, gain, type){
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = type || "sine"; osc.frequency.value = midiToFreq(midi);
  g.gain.value = 0.0001; osc.connect(g); g.connect(audioCtx.destination);
  g.gain.exponentialRampToValueAtTime(gain || 0.2, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start); osc.stop(start + dur + 0.05);
  activeOscs.push(osc);
  osc.onended = () => { activeOscs = activeOscs.filter(o => o !== osc); };
}

// Establish tonality: I–IV–V7–I (major) or i–iv–V7–i (minor) in the current key.
// Returns the cadence duration in ms. Caller must have ensured audio.
function establishTonality(){
  const tonic = 60 + transpose;     // concert tonic, follows key + octave
  const chords = currentMinor
    ? [ [0,3,7], [5,8,12], [7,11,14,17], [0,3,7,12] ]   // i  iv  V7  i
    : [ [0,4,7], [5,9,12], [7,11,14,17], [0,4,7,12] ];  // I  IV  V7  I
  let t = audioCtx.currentTime + 0.05;
  for (const chord of chords){
    for (const iv of chord) playTone(tonic + iv, t, 0.75, 0.1, "triangle");
    t += 0.85;
  }
  return (0.05 + chords.length * 0.85) * 1000;
}

// Hear the pattern (one note at a time, on the graded target pitches).
async function hearPattern(){
  if (collecting) return;
  await ensureAudio();
  const sp = PLAY_PER_NOTE;
  let t = audioCtx.currentTime + 0.05;
  for (const m of targets){ playTone(m, t, sp*0.7); t += sp; }
  setFlow("listened");
}
document.getElementById("play").addEventListener("click", hearPattern);

// Inline Establish button removed; the shared floating button (establish-button.js
// → Tonality.establish) handles it. Guard in case the element is absent.
const _estBtn = document.getElementById("establish");
if (_estBtn) _estBtn.addEventListener("click", async () => {
  const en = document.getElementById("estNote"); if (en) en.textContent = "";
  if (window.Tonality && Tonality.establish) { Tonality.establish(); return; }
  await ensureAudio();
  establishTonality();
});

document.getElementById("mic").addEventListener("click", enableMic);

// ---------- next / advance ----------
function advanceNext(){
  if (!isLastInCollection()){
    gotoOrder(orderPos() + 1);
  } else if (collectionSel.selectedIndex < collectionSel.options.length - 1){
    collectionSel.selectedIndex++; loadCollection();
  } else {
    collectionSel.selectedIndex = 0; loadCollection();
  }
}

// ---------- continuous mode (automatic call-and-response loop) ----------
// Per cycle: pattern plays automatically → record window → grade → pass: next
// pattern, fail: repeat. (No metronome/tempo — tonal task is rhythm-blind.)
let continuousMode = false;
let flowTimers = [];
function clearFlowTimers(){ flowTimers.forEach(clearTimeout); flowTimers = []; }
function setContinuousUI(){
  const btn = document.getElementById("continuous");
  btn.textContent = continuousMode ? "■ Stop" : "∞ Continuous mode";
  btn.classList.toggle("primary", continuousMode);
  document.getElementById("record").disabled = continuousMode || !running;
  document.getElementById("play").disabled = continuousMode;
}
// End the session immediately: kill scheduled audio + recorders, finalize files.
// reason "complete" = finished the collection; otherwise a manual/space Stop.
function endSession(reason){
  continuousMode = false;
  clearFlowTimers();
  stopAllTones();
  collecting = false;
  try { if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); } catch(e){}
  hide("capturing"); hide("progwrap");
  finalizeSession();
  setContinuousUI();
  if (reason === "complete")
    setStatus("🎉 Session complete — you finished the collection! Download below.", "passed");
  else
    setFlow(running ? "ready" : "nomic");
}
function stopContinuous(){ endSession("stopped"); }
document.getElementById("continuous").addEventListener("click", async () => {
  if (!running) return;
  if (continuousMode){ stopContinuous(); return; }
  continuousMode = true;
  setContinuousUI();
  startSession();
  await ensureAudio();
  setStatus("♪ Establishing tonality…", "listened");
  const estMs = establishTonality();           // I–IV–V7–I / i–iv–V7–i once per session
  flowTimers.push(setTimeout(runContinuousCycle, estMs));
});

async function runContinuousCycle(){
  if (!continuousMode || !running || collecting) return;
  await ensureAudio();
  clearFlowTimers();
  document.getElementById("resultArea").innerHTML = "";
  resetRecCard();

  // model: play the target pitches (gaps between, like the student should)
  setStatus("🔊 Listen to the pattern…", "listened");
  const sp = PLAY_PER_NOTE;
  let t = audioCtx.currentTime + 0.1;
  for (const m of targets){ playTone(m, t, sp*0.7); t += sp; }
  const modelMs = (targets.length * sp + 0.1) * 1000;
  const dur = captureMs();
  let passed = false;

  // after the model: start the recording window
  flowTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    hide("responseCard");
    setStatus("🎤 Your turn — sing the notes with gaps!", "recording");
    samples = []; collecting = true;
    startRecording();
    sessionResume();              // capture this response into the session file
    show("capturing"); show("progwrap");
    const start = performance.now(), prog = document.getElementById("prog");
    (function tick(){
      const e = performance.now() - start;
      prog.style.width = Math.min(100, e/dur*100) + "%";
      if (e < dur && continuousMode && collecting) requestAnimationFrame(tick);
    })();
  }, modelMs));

  // grade after the record window
  flowTimers.push(setTimeout(async () => {
    if (!continuousMode) return;
    collecting = false;
    sessionPause();
    sessionResponses++;
    sessionEntries.push({                  // for the SRT (aligns with the audio)
      label: `${collectionSel.value} — Pattern ${tuneBook.tunes[patternSel.value].id} (${document.getElementById("assess").value})`,
      durMs: dur
    });
    hide("capturing"); hide("progwrap");
    const summary = grade();
    passed = (summary === "pass");
    setStatus(passed ? "✓ Passed — next pattern." : "✗ Not yet — repeating this pattern.",
              passed ? "passed" : "failed");
    const blob = await stopRecording();
    presentRecording(blob, summary);
  }, modelMs + dur + 50));

  // brief gap to read feedback, then loop (pass → next, fail → same).
  // Passing the last pattern in the collection ends the session.
  flowTimers.push(setTimeout(() => {
    if (!continuousMode) return;
    if (passed){
      if (isLastInCollection()){ endSession("complete"); return; }
      advanceNext();
    }
    runContinuousCycle();
  }, modelMs + dur + 50 + 1600));
}

// ---------- spacebar-driven flow ----------
// ready → SPACE hear → listened → SPACE record → pass: SPACE next | fail: SPACE re-record
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

// ---------- session logging / makeup replay ----------
const KEY_DISPLAY = () => (currentMinor ? MINOR_NAMES : MAJOR_NAMES)[parseInt(document.getElementById("key").value,10)||0];
SessionLog.init({
  app: "tonal",
  getState: () => {
    if (!tuneBook) return null;
    const i = patternSel.selectedIndex;
    const oct = document.getElementById("octave").value, assess = document.getElementById("assess").value;
    return { app:"tonal", coll: collectionSel.value, idx: i, item: tuneBook.tunes[i].id,
             key: document.getElementById("key").value, octave: oct,
             clef: document.getElementById("clef").value, assess,
             label: `${collectionSel.value} P${tuneBook.tunes[i].id} · ${KEY_DISPLAY()}${oct!=="0"?" oct"+oct:""} · ${assess}` };
  },
  applyState: (s) => {
    collectionSel.value = s.coll; loadCollection();
    patternSel.selectedIndex = Math.min(s.idx, patternSel.options.length-1);
    document.getElementById("octave").value = s.octave;
    document.getElementById("clef").value = s.clef;
    document.getElementById("assess").value = s.assess;
    document.getElementById("key").value = s.key;     // before loadPattern so populateKeys preserves it
    loadPattern();
    setStatus("Makeup: "+(s.label||"")+" — SPACE to hear, then record.","");
  }
});

// ---------- init ----------
loadCollection();
SessionLog.begin();
