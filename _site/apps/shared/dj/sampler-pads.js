// SamplerPads: an MPC / SP-404 style sampler for the sampling lessons. window.SamplerPads. Needs turntables.js (its shared audio engine:
// Turntables.audio). Loaded by lessons/_dj-kit.qmd, which calls SamplerPads.init().
//
// Markup:  <div class="sp-pads" data-id="sp-chop" data-loop="demo:break100" data-slice="equal" data-show="wave pads edit pattern library"
//               data-bars="2" data-mode="repitch"></div>
//   data-loop    what loads at start ("demo:<id>", a URL, "<source>:<track>", as Turntables.load takes)
//   data-slice   "equal" (16 equal slices: a bar of sixteenths for a one-bar loop), "beats" (one slice a beat, from the BPM),
//                or "transients" (cut at the 16 strongest hits)
//   data-show    parts shown (all when absent): wave (waveform with slice markers, drag a marker to move a chop), pads (4×4),
//                edit (the selected pad: pitch, stretch, mode, reverse, gate, level), pattern (record / play a 1–4 bar pattern), library
//   data-bars    pattern length at start (1, 2 or 4 bars); data-mode   pitch mode for every pad at start: "repitch" | "stretch"
//
// Playing: click a pad, or keys with the widget focused (MPC layout, pad 1 bottom left): z x c v = pads 1–4, a s d f = 5–8,
//   q w e r = 9–12, 1 2 3 4 = 13–16; or a MIDI keyboard / pad controller ("Connect MIDI"): notes 36–51 (C1 up: the MPC / Ableton
//   Push / most controllers' first bank), velocity sets the level.
// Each pad: Pitch (semitones), Stretch (length ×0.5..×2), Mode — Repitch (speed and pitch move together: a record sped up, an SP-404's
//   or MPC's "pitch") or Stretch (pitch and length apart: time-stretch by overlap-add, which smears transients — listen for it),
//   Reverse, Gate (sounds only while held; else one-shot), Level.
// Pattern: Tempo (starts at the loop's BPM), Bars, Quantize (off / 1/16 / 1/8), Click; ● Rec records pad hits into the loop as it
//   goes round (overdub), ▶ plays it, Undo removes the last pass's hits, Clear empties it.
//
// API: SamplerPads.all, SamplerPads.byId(id); a widget p: p.load(src) -> Promise, p.slices [{start, end}] (s), p.pads [{pitch, stretch,
//   mode, reverse, gate, level}], p.hit(i, vel?) (plays pad i now; recorded when recording), p.release(i), p.select(i), p.slice(kind),
//   p.setSlice(i, startSec), p.render(i) -> AudioBuffer (what pad i plays), p.play(), p.stop(), p.record(on), p.pattern [{step, pad, vel}],
//   p.tempo, p.bars, p.quant, p.playing, p.recording, p.active (voices sounding).
// Multi-sample mode (the top menu, or data-kind="multi" to start in it; data-show then doesn't matter): one instrument from many
//   recordings. Each recording is a zone: root note, lowest / highest key, softest / hardest velocity (a velocity layer) and a take
//   number (round robin: takes of one zone alternate). A note plays the zone it falls in, pitched by (note - root). The key map draws
//   keys across, velocity up; click it to play. "Load recordings…" takes several files and reads note, layer and take from their names
//   (Piano_C#3_soft_rr2.wav, pluck-60-v100-2.wav), then Spread zones fills the keyboard between the roots. Velocity layers / Round robin /
//   One sample only switch each idea off to hear why it's there. Demo: a plucked string synthesised here (C2 C3 C4 C5 × soft, hard × 3
//   takes), its body resonances fixed in Hz so one sample stretched far sounds wrong. Keys: a w s e d f t g y h u j k o l p ; = C4..E5
//   (z / x octave), MIDI any note with velocity. API: p.setMode("multi"|"chop"), p.mode, p.zones [{buf, name, root, lo, hi, vlo, vhi, layer,
//   rr, tune, level}], p.noteOn(n, vel) -> {zone, takes, take, shift}, p.noteOff(n), p.pick(n, vel), p.autoMap(), p.loadZones(files),
//   p.layersOn, p.rrOn, p.oneOnly. SamplerPads.parseName(fileName) -> {root, layer, rr}.
// Output through one gain registered with window.AudioTap ("Sampler pads").
(function () {
  "use strict";
  const A = () => window.Turntables.audio;
  const KEYS = ["z", "x", "c", "v", "a", "s", "d", "f", "q", "w", "e", "r", "1", "2", "3", "4"];
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (txt, title, cls) => { const b = h("button", "btn btn-sm btn-outline-secondary " + (cls || ""), txt); b.type = "button"; if (title) b.title = title; return b; };
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let OUT = null;
  const out = () => { const c = A().ctx(); if (!OUT) { OUT = c.createGain(); OUT.gain.value = 0.9; OUT.connect(c.destination); if (window.AudioTap) try { AudioTap.register(c, OUT, "Sampler pads"); } catch (e) {} } return OUT; };
  const all = [];

  class Pads {
    constructor(el) {
      this.el = el; el._sp = this; this.id = el.dataset.id || "sp" + all.length;
      const show = (el.dataset.show || "wave pads edit pattern library").split(/\s+/); this.show = s => show.includes(s);
      this.sliceKind = el.dataset.slice || "equal"; this.bars = +(el.dataset.bars || 2); this.quant = 4; this.click = true;
      const mode = el.dataset.mode || "repitch";
      this.pads = Array.from({ length: 16 }, () => ({ pitch: 0, stretch: 1, mode, reverse: false, gate: false, level: 1 }));
      this.slices = []; this.sel = 0; this.pattern = []; this.passes = []; this.voices = new Set(); this.cache = {};
      this.playing = false; this.recording = false; this.tempo = 90; this.track = null;
      el.classList.add("sp-made"); el.tabIndex = 0; el.innerHTML = "";
      this.ui(); all.push(this);
      A().configSources(el); this.fillLib(); A().onSources(() => this.fillLib());
      this.mode = "chop"; if (el.dataset.kind === "multi") this.setMode("multi"); else if (el.dataset.loop) this.load(el.dataset.loop);
      new ResizeObserver(() => this.mode === "multi" && this.drawMap()).observe(el);
    }
    get active() { return this.voices.size; }
    status(s) { this.statusEl.textContent = s; }
    async load(src) {
      if (this.mode === "multi") this.setMode("chop");
      this.status("Loading…");
      try {
        const t = await A().getBuffer(src); if (!t) return null;
        if (!t.bpm) { t.bpm = A().detectBpm(t.buffer); t.bpmGuessed = true; }
        this.track = t; this.buffer = t.buffer; this.peaks = A().peaks(t.buffer, 600); this.cache = {};
        this.tempo = t.bpm; this.tempoIn.value = t.bpm; this.titleEl.textContent = t.title + "  ·  " + t.bpm + " BPM" + (t.key ? "  ·  " + t.key : "");
        this.slice(this.sliceKind); this.status(""); this.drawWave(); return t;
      } catch (e) { console.warn(e); this.status("Could not load: " + e.message); return null; }
    }
    slice(kind) {
      this.sliceKind = kind; if (this.sliceSel) this.sliceSel.value = kind;
      const dur = this.buffer ? this.buffer.duration : 1; let starts;
      if (kind === "transients" && this.buffer) { starts = A().onsets(this.buffer, 16); if (!starts.length || starts[0] > 0.02) starts.unshift(0); starts = starts.slice(0, 16); }
      else if (kind === "beats" && this.track) { const bl = 60 / this.track.bpm; starts = []; for (let i = 0; i < 16 && i * bl < dur - 0.01; i++) starts.push(i * bl); }
      else starts = Array.from({ length: 16 }, (_, i) => i * dur / 16);
      this.slices = starts.map((s, i) => ({ start: s, end: i + 1 < starts.length ? starts[i + 1] : dur }));
      this.cache = {}; this.drawPads(); this.drawWave();
    }
    setSlice(i, t) {
      if (i <= 0 || !this.slices[i]) return;
      const lo = this.slices[i - 1].start + 0.005, hi = this.slices[i].end - 0.005; t = Math.max(lo, Math.min(hi, t));
      this.slices[i].start = t; this.slices[i - 1].end = t; delete this.cache[i]; delete this.cache[i - 1]; this.drawWave();
    }
    render(i) {
      const p = this.pads[i], s = this.slices[i]; if (!p || !s || !this.buffer) return null;
      const key = [s.start, s.end, p.pitch, p.stretch, p.mode, p.reverse].join(); if (this.cache[i] && this.cache[i].key === key) return this.cache[i].buf;
      const c = A().ctx(), b = this.buffer, a = Math.floor(s.start * b.sampleRate), e = Math.max(a + 64, Math.floor(s.end * b.sampleRate));
      let seg = c.createBuffer(b.numberOfChannels, e - a, b.sampleRate);
      for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch).subarray(a, e).slice(); if (p.reverse) d.reverse();
        const fade = Math.min(64, d.length >> 2); for (let k = 0; k < fade; k++) { d[k] *= k / fade; d[d.length - 1 - k] *= k / fade; } seg.copyToChannel(d, ch); }
      if (p.mode === "stretch") { const f = p.stretch * Math.pow(2, p.pitch / 12); if (Math.abs(f - 1) > 1e-3) seg = A().stretch(seg, f); }
      this.cache[i] = { key, buf: seg }; return seg;
    }
    rate(i) { const p = this.pads[i]; return p.mode === "stretch" ? Math.pow(2, p.pitch / 12) : Math.pow(2, p.pitch / 12) / p.stretch; }
    voice(i, when, vel = 1) {
      const buf = this.render(i); if (!buf) return null;
      const c = A().ctx(), s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = this.rate(i);
      g.gain.value = this.pads[i].level * vel; s.connect(g); g.connect(out()); s.start(when || 0);
      const v = { s, g, i }; this.voices.add(v); s.onended = () => { this.voices.delete(v); this.light(i, false); };
      return v;
    }
    hit(i, vel = 1) {
      if (!this.slices[i]) return; A().ctx(); this.release(i, true);
      const v = this.voice(i, 0, vel); this.held = this.held || {}; this.held[i] = v; this.light(i, true);
      if (this.recording && this.playing) {
        const c = A().ctx(), sd = 60 / this.tempo / 4, total = this.bars * 16;
        let st = (c.currentTime - this.t0) / sd; st = ((st % total) + total) % total;
        if (this.quant) st = Math.round(st / (16 / (this.quant * 4)) ) * (16 / (this.quant * 4)) % total;
        this.pattern.push({ step: st, pad: i, vel, pass: this.pass }); this.drawPattern();
      }
      this.select(i);
    }
    release(i, retrig) {
      const v = this.held && this.held[i]; if (!v) return;
      if (this.pads[i].gate || retrig) { const t = A().ctx().currentTime; v.g.gain.setTargetAtTime(0, t, 0.01); try { v.s.stop(t + 0.06); } catch (e) {} }
      this.held[i] = null;
    }
    light(i, on) { const b = this.padEls && this.padEls[i]; if (b) b.classList.toggle("sp-lit", on); }
    select(i) { this.sel = i; this.drawPads(); this.drawEdit(); this.drawWave(); }
    play() {
      if (this.playing || !this.buffer) return; const c = A().ctx(); this.playing = true; this.t0 = c.currentTime + 0.08; this.nextStep = 0; this.pass = 0;
      this.playBtn.classList.add("sp-on");
      const sd = () => 60 / this.tempo / 4;
      const tick = () => {
        if (!this.playing) return;
        const total = this.bars * 16, now = c.currentTime;
        while (this.t0 + this.nextStep * sd() < now + 0.12) {
          const n = this.nextStep, t = this.t0 + n * sd(), st = n % total;
          if (st === 0 && n > 0) { this.pass++; }
          if (this.click && st % 4 === 0) this.clickAt(t, st === 0);
          for (const e of this.pattern) if (e.step >= st && e.step < st + 1 && !(this.recording && e.pass === this.pass)) { const v = this.voice(e.pad, t + (e.step - st) * sd(), e.vel); if (v) setTimeout(() => this.light(e.pad, true), Math.max(0, (t - now) * 1000)); }
          this.nextStep++;
        }
        this.posStep = ((now - this.t0) / sd()) % total; this.drawPattern();
      };
      this.timer = setInterval(tick, 25); tick();
    }
    stop() { this.playing = false; clearInterval(this.timer); this.playBtn.classList.remove("sp-on"); this.record(false); this.voices.forEach(v => { try { v.s.stop(); } catch (e) {} }); }
    record(on) {
      if (on && !this.playing) this.play();
      if (on) { this.passes.push(this.pattern.length); }
      this.recording = !!on; if (this.recBtn) this.recBtn.classList.toggle("sp-rec", this.recording);
    }
    clickAt(t, down) { const c = A().ctx(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = down ? 1600 : 1100;
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.connect(g); g.connect(out()); o.start(t); o.stop(t + 0.05); }
    async fillLib() {
      if (!this.libSel) return; const groups = await A().allTracks(), s = this.libSel; s.innerHTML = ""; s.append(h("option", "", "Load a loop…"));
      for (const g of groups) { if (!g.tracks.length) continue; const og = h("optgroup"); og.label = g.source.label;
        for (const t of g.tracks) { const o = h("option", "", t.title + (t.bpm ? "  " + t.bpm + " BPM" : "")); o.value = /^demo:/.test(t.url) ? t.url : g.source.id + ":" + t.id; og.append(o); } s.append(og); }
      const f = h("option", "", "Local file…"); f.value = "file"; s.append(f);
    }
    async midi() {
      if (!navigator.requestMIDIAccess) { this.status("This browser has no Web MIDI (try Chrome)."); return; }
      try { const m = await navigator.requestMIDIAccess(); let n = 0;
        m.inputs.forEach(inp => { n++; inp.onmidimessage = e => { const [st, note, vel] = e.data, i = note - 36;
          if (this.mode === "multi") { if ((st & 0xf0) === 0x90 && vel) this.noteOn(note, vel); else if ((st & 0xf0) === 0x80 || (st & 0xf0) === 0x90) this.noteOff(note); return; }
          if (i < 0 || i > 15) return;
          if ((st & 0xf0) === 0x90 && vel) this.hit(i, vel / 127); else if ((st & 0xf0) === 0x80 || ((st & 0xf0) === 0x90 && !vel)) this.release(i); }; });
        this.status(n ? "MIDI: " + n + " input" + (n > 1 ? "s" : "") + " (notes 36–51 play the pads)" : "No MIDI inputs found.");
      } catch (e) { this.status("MIDI refused."); }
    }
    ui() {
      const el = this.el;
      const top = h("div", "sp-top"); this.titleEl = h("span", "sp-title", "(nothing loaded)"); this.statusEl = h("span", "sp-status");
      this.libSel = h("select", "sp-sel"); this.libSel.setAttribute("aria-label", "Load a loop");
      const file = h("input"); file.type = "file"; file.accept = "audio/*"; file.hidden = true; file.onchange = () => file.files[0] && this.load(file.files[0]);
      this.libSel.onchange = () => { const v = this.libSel.value; this.libSel.selectedIndex = 0; if (v === "file") file.click(); else if (v) this.load(v); };
      this.sliceSel = h("select", "sp-sel"); for (const [v, t] of [["equal", "16 equal slices"], ["beats", "One a beat"], ["transients", "At the hits"]]) { const o = h("option", "", t); o.value = v; this.sliceSel.append(o); }
      this.sliceSel.value = this.sliceKind; this.sliceSel.onchange = () => this.slice(this.sliceSel.value); this.sliceSel.setAttribute("aria-label", "How to slice");
      const whole = btn("▶ Whole loop", "Play the loop as it is"); whole.onclick = () => this.playWhole();
      const mid = btn("Connect MIDI", "Play the pads from a MIDI controller (notes 36–51)"); mid.onclick = () => this.midi();
      const lib = h("span", "sp-libwrap"); lib.append(this.libSel, file); if (!this.show("library")) lib.hidden = true;
      this.modeSel = h("select", "sp-sel"); for (const [v, t] of [["chop", "Chop a loop"], ["multi", "Multi-sample"]]) { const o = h("option", "", t); o.value = v; this.modeSel.append(o); }
      this.modeSel.setAttribute("aria-label", "Sampler mode"); this.modeSel.onchange = () => this.setMode(this.modeSel.value);
      const chopTop = h("span", "sp-libwrap"); chopTop.append(this.titleEl, lib, this.sliceSel, whole);
      top.append(this.modeSel, chopTop, mid, this.statusEl); el.append(top);
      this.wave = h("canvas", "sp-wave"); this.wave.height = 80; if (!this.show("wave")) this.wave.hidden = true; el.append(this.wave); this.waveDrag();
      const mid2 = h("div", "sp-mid");
      this.grid = h("div", "sp-grid"); this.padEls = [];
      for (let r = 3; r >= 0; r--) for (let c = 0; c < 4; c++) { const i = r * 4 + c, b = h("button", "sp-pad"); b.type = "button";
        b.append(h("span", "sp-n", String(i + 1)), h("span", "sp-k", KEYS[i].toUpperCase()));
        b.onpointerdown = e => { e.preventDefault(); this.el.focus({ preventScroll: true }); this.hit(i); };
        b.onpointerup = b.onpointerleave = () => this.release(i);
        this.padEls[i] = b; this.grid.append(b); }
      if (!this.show("pads")) this.grid.hidden = true;
      this.edit = h("div", "sp-edit"); if (!this.show("edit")) this.edit.hidden = true;
      mid2.append(this.grid, this.edit); el.append(mid2);
      const pat = h("div", "sp-pat"); if (!this.show("pattern")) pat.hidden = true;
      const bar = h("div", "sp-patbar");
      this.playBtn = btn("▶", "Play the pattern"); this.playBtn.onclick = () => this.playing ? this.stop() : this.play();
      const stopB = btn("■", "Stop"); stopB.onclick = () => this.stop();
      this.recBtn = btn("● Rec", "Record pad hits into the pattern as it loops", "sp-recbtn"); this.recBtn.onclick = () => this.record(!this.recording);
      const undo = btn("Undo", "Remove the hits of the last recording pass"); undo.onclick = () => { const n = this.passes.pop(); if (n != null) this.pattern.length = n; this.drawPattern(); };
      const clear = btn("Clear", "Empty the pattern"); clear.onclick = () => { this.pattern = []; this.passes = []; this.drawPattern(); };
      const lab = (t, inp) => { const l = h("label", "sp-lbl"); l.append(t + " ", inp); return l; };
      this.tempoIn = h("input"); this.tempoIn.type = "number"; this.tempoIn.min = 40; this.tempoIn.max = 200; this.tempoIn.value = this.tempo; this.tempoIn.onchange = () => this.tempo = +this.tempoIn.value || 90;
      const barsSel = h("select"); for (const b of [1, 2, 4]) { const o = h("option", "", b); o.value = b; barsSel.append(o); } barsSel.value = this.bars; barsSel.onchange = () => { this.bars = +barsSel.value; this.drawPattern(); };
      const qSel = h("select"); for (const [v, t] of [[0, "off"], [4, "1/16"], [2, "1/8"]]) { const o = h("option", "", t); o.value = v; qSel.append(o); } qSel.value = this.quant; qSel.onchange = () => this.quant = +qSel.value;
      const ck = h("input"); ck.type = "checkbox"; ck.checked = true; ck.onchange = () => this.click = ck.checked;
      bar.append(this.playBtn, stopB, this.recBtn, undo, clear, lab("Tempo", this.tempoIn), lab("Bars", barsSel), lab("Quantize", qSel), lab("Click", ck));
      this.patC = h("canvas", "sp-patc"); this.patC.height = 54;
      pat.append(bar, this.patC); el.append(pat);
      el.append(this.multiUi());
      this.chopEls = [chopTop, this.wave, mid2, pat]; this.wave._showOff = !this.show("wave"); pat._showOff = !this.show("pattern");
      el.addEventListener("keydown", e => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
        if (this.mode === "multi") { if (this.multiKey(e, true)) e.preventDefault(); return; }
        const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) { e.preventDefault(); this.hit(i); } });
      el.addEventListener("keyup", e => { if (this.mode === "multi") { this.multiKey(e, false); return; } const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) this.release(i); });
      this.drawEdit(); this.drawPattern();
    }
    playWhole() { if (!this.buffer) return; const c = A().ctx(); if (this.whole) { try { this.whole.stop(); } catch (e) {} this.whole = null; return; }
      const s = c.createBufferSource(); s.buffer = this.buffer; s.connect(out()); s.start(); this.whole = s; s.onended = () => this.whole = null; }
    drawPads() { if (!this.padEls) return; this.padEls.forEach((b, i) => { b.classList.toggle("sp-sel", i === this.sel); b.disabled = !this.slices[i]; }); }
    drawEdit() {
      const e = this.edit, i = this.sel, p = this.pads[i]; e.innerHTML = ""; e.append(h("div", "sp-edtitle", "Pad " + (i + 1)));
      const row = (label, inp, val) => { const l = h("label", "sp-row"); l.append(h("span", "", label), inp); if (val) l.append(val); e.append(l); };
      const rng = (min, max, step, k, fmt) => { const r = h("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = p[k]; const v = h("span", "sp-val", fmt(p[k]));
        r.oninput = () => { p[k] = +r.value; v.textContent = fmt(p[k]); }; r.onchange = () => this.hit(i); return [r, v]; };
      const [pr, pv] = rng(-12, 12, 1, "pitch", x => (x > 0 ? "+" : "") + x + " st"); row("Pitch", pr, pv);
      const [sr, sv] = rng(0.5, 2, 0.05, "stretch", x => "×" + x.toFixed(2)); row("Length", sr, sv);
      const m = h("select"); for (const [v, t] of [["repitch", "Repitch (speed + pitch together)"], ["stretch", "Stretch (pitch and length apart)"]]) { const o = h("option", "", t); o.value = v; m.append(o); }
      m.value = p.mode; m.onchange = () => { p.mode = m.value; this.hit(i); }; row("Mode", m);
      const chk = (k, t) => { const c = h("input"); c.type = "checkbox"; c.checked = p[k]; c.onchange = () => { p[k] = c.checked; if (k === "reverse") this.hit(i); }; row(t, c); };
      chk("reverse", "Reverse"); chk("gate", "Gate (only while held)");
      const [lr, lv] = rng(0, 1.5, 0.05, "level", x => Math.round(x * 100) + "%"); row("Level", lr, lv);
      const s = this.slices[i]; if (s) e.append(h("div", "sp-hint", "Slice " + s.start.toFixed(3) + "–" + s.end.toFixed(3) + " s (" + Math.round((s.end - s.start) * 1000) + " ms)"));
    }
    waveDrag() {
      const c = this.wave; let drag = -1;
      const tAt = e => { const r = c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * (this.buffer ? this.buffer.duration : 1); };
      c.addEventListener("pointerdown", e => { if (!this.buffer) return; const t = tAt(e), px = this.buffer.duration / (c.clientWidth || 600);
        drag = this.slices.findIndex((s, i) => i > 0 && Math.abs(s.start - t) < px * 5);
        if (drag > 0) c.setPointerCapture(e.pointerId); else { drag = -1; const i = this.slices.findIndex(s => t >= s.start && t < s.end); if (i >= 0) this.hit(i); } });
      c.addEventListener("pointermove", e => { if (drag > 0) this.setSlice(drag, tAt(e)); });
      c.addEventListener("pointerup", () => { if (drag > 0) { this.drawEdit(); this.hit(drag); } drag = -1; });
    }
    drawWave() {
      const c = this.wave, w = c.clientWidth || 600; if (c.width !== w) c.width = w; const g = c.getContext("2d"), H = c.height; g.clearRect(0, 0, w, H);
      if (!this.peaks) return; const n = this.peaks.length, dur = this.buffer.duration, ink = css("--site-ink-2") || "#888";
      const s = this.slices[this.sel]; if (s) { g.fillStyle = "rgba(224,176,32,.22)"; g.fillRect(s.start / dur * w, 0, (s.end - s.start) / dur * w, H); }
      g.fillStyle = "#3a8fd0"; for (let x = 0; x < w; x++) { const v = this.peaks[Math.floor(x / w * n)]; g.fillRect(x, H / 2 - v * H / 2, 1, v * H || 0.5); }
      g.fillStyle = ink; g.font = "10px monospace";
      this.slices.forEach((sl, i) => { const x = sl.start / dur * w; g.fillRect(x, 0, i ? 2 : 1, H); g.fillText(String(i + 1), x + 3, 10); });
    }
    drawPattern() {
      const c = this.patC; if (!c) return; const w = c.clientWidth || 600; if (c.width !== w) c.width = w; const g = c.getContext("2d"), H = c.height, total = this.bars * 16;
      g.clearRect(0, 0, w, H); const ink = css("--site-ink-2") || "#888";
      for (let s = 0; s <= total; s++) { g.fillStyle = ink; g.globalAlpha = s % 16 === 0 ? 0.9 : s % 4 === 0 ? 0.5 : 0.18; g.fillRect(s / total * w, 0, 1, H); }
      g.globalAlpha = 1; g.fillStyle = "#d0703a";
      for (const e of this.pattern) { const x = e.step / total * w, y = (15 - e.pad) / 16 * (H - 4) + 2; g.fillRect(x, y, Math.max(3, w / total - 2), 3); }
      if (this.playing && this.posStep >= 0) { g.fillStyle = "#e03a2a"; g.fillRect(this.posStep / total * w, 0, 2, H); }
    }
  }
  // ---- Multi-sample mode: one instrument from many recordings (key zones x velocity layers x round-robin takes) ----
  const NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], nn = m => NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const PKEYS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";"];   // C up to E, a piano row
  const LO = 24, HI = 96;   // the key map shows C1..C7
  // The demo instrument: a plucked, wooden-bodied string synthesised here. Its body resonances sit at fixed frequencies (about
  // 600 Hz and 2.6 kHz) whatever note is played, as a real instrument's do, so one recording pitched far away moves them (the
  // "chipmunk" sound). Hard notes are brighter with a knock; each take is slightly different (tuning, phases, knock).
  function synthNote(c, midi, hard, seed) {
    let s = seed * 9301 + midi * 49297 + (hard ? 233 : 0); const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const sr = c.sampleRate, N = Math.floor(sr * 2.2), out = new Float32Array(N), f0 = 440 * Math.pow(2, (midi - 69) / 12) * (1 + (rnd() - 0.5) * 0.004);
    const body = f => 1 + 2.4 * Math.exp(-Math.pow(Math.log2(f / 600), 2) / 0.15) + 1.6 * Math.exp(-Math.pow(Math.log2(f / 2600), 2) / 0.1);
    for (let k = 1; k <= 60; k++) {
      const fk = k * f0 * Math.sqrt(1 + 0.0001 * k * k); if (fk > Math.min(sr / 2.2, 11000)) break;
      const amp = body(fk) / Math.pow(k, hard ? 0.85 : 1.7) * (0.8 + 0.4 * rnd()), dec = 1.1 + fk / (hard ? 1100 : 650);
      const r = Math.exp(-dec / sr), w = 2 * Math.PI * fk / sr, cr = r * Math.cos(w), ci = r * Math.sin(w), ph = rnd() * 6.283;
      let re = Math.cos(ph) * amp, im = Math.sin(ph) * amp;
      for (let n = 0; n < N; n++) { out[n] += im; const t = re * cr - im * ci; im = re * ci + im * cr; re = t; if ((n & 1023) === 0 && Math.abs(re) + Math.abs(im) < 1e-5) break; }
    }
    const att = Math.floor(sr * (hard ? 0.001 : 0.006)); for (let n = 0; n < att; n++) out[n] *= n / att;
    if (hard) { let y = 0; const kn = Math.floor(sr * 0.02), a = 0.25; for (let n = 0; n < kn; n++) { y += a * ((rnd() * 2 - 1) - y); out[n] += y * 3 * (1 - n / kn) * (0.7 + 0.6 * rnd()); } }
    let pk = 0; for (let n = 0; n < N; n++) pk = Math.max(pk, Math.abs(out[n]));
    const g = (hard ? 0.9 : 0.45) / (pk || 1), fade = Math.floor(sr * 0.05); for (let n = 0; n < N; n++) out[n] *= g * (n > N - fade ? (N - n) / fade : 1);
    const b = c.createBuffer(1, N, sr); b.copyToChannel(out, 0); return b;
  }
  // A file name like "Piano_C#3_soft_rr2.wav" or "pluck-60-v100-2.wav": root note, velocity layer, take.
  function parseName(name) {
    const base = name.replace(/\.[a-z0-9]+$/i, ""), r = { root: null, layer: null, rr: 1 };
    const m = base.match(/(?:^|[^A-Za-z])([A-Ga-g])([#b]?)(-?\d)(?![0-9])/);
    if (m) r.root = (NOTE.indexOf(m[1].toUpperCase()) + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)) + (+m[3] + 1) * 12;
    else { const d = base.match(/(?:^|[^0-9v])(\d{2,3})(?![0-9])/); if (d && +d[1] < 128) r.root = +d[1]; }
    const v = base.match(/(?:^|[^A-Za-z])(ppp|pp|p|mp|mf|ff|fff|f|soft|med|medium|hard|loud)(?![A-Za-z])/i) || base.match(/v(?:el)?(\d{1,3})/i);
    if (v) { const w = v[1].toLowerCase(), order = { ppp: 10, pp: 25, p: 40, soft: 40, mp: 55, med: 64, medium: 64, mf: 75, f: 95, loud: 110, hard: 110, ff: 112, fff: 125 }; r.layer = order[w] != null ? order[w] : +w; }
    const t = base.match(/(?:rr|take|t)[ _-]?(\d+)/i); if (t) r.rr = +t[1];
    return r;
  }
  const MULTI = {
    multiInit() {
      if (this.zones) return; this.zones = []; this.rrOn = true; this.layersOn = true; this.oneOnly = false; this.mVel = 100; this.mOct = 0;
      this.rrCount = {}; this.mHeld = {}; this.zSel = 0; this.lastPick = null;
    },
    setMode(m) {
      this.mode = m === "multi" ? "multi" : "chop"; if (this.modeSel) this.modeSel.value = this.mode; const multi = this.mode === "multi";
      for (const e of this.chopEls) e.hidden = multi || e._showOff; this.mPanel.hidden = !multi;
      if (multi) { this.multiInit(); if (!this.zones.length) this.demoInstrument(); else this.drawMap(); }
      else this.drawWave();
    },
    demoInstrument() {
      this.status("Making the demo instrument…");
      setTimeout(() => { const c = A().ctx(), z = [];
        for (const [i, root] of [36, 48, 60, 72].entries()) for (const hard of [0, 1]) for (let rr = 1; rr <= 3; rr++)
          z.push({ buf: synthNote(c, root, hard, rr), name: "Pluck " + nn(root) + (hard ? " hard" : " soft") + " take " + rr, root, lo: 0, hi: 127, vlo: 0, vhi: 127, layer: hard ? 110 : 40, rr, tune: 0, level: 1 });
        this.zones = z; this.autoMap(); this.zSel = 0; this.mTitle.textContent = "Demo: plucked string, 4 notes × 2 layers × 3 takes = 24 recordings"; this.status(""); this.drawMap(); this.drawZone(); }, 10);
    },
    // Spread each root's zone halfway to its neighbours, and split velocity between the layers (by each zone's layer value).
    autoMap() {
      const roots = [...new Set(this.zones.map(z => z.root))].sort((a, b) => a - b);
      roots.forEach((r, i) => { const lo = i ? Math.floor((roots[i - 1] + r) / 2) + 1 : 0, hi = i < roots.length - 1 ? Math.floor((r + roots[i + 1]) / 2) : 127;
        const here = this.zones.filter(z => z.root === r), layers = [...new Set(here.map(z => z.layer))].sort((a, b) => a - b);
        for (const z of here) { const j = layers.indexOf(z.layer); z.lo = lo; z.hi = hi;
          z.vlo = j ? Math.floor((layers[j - 1] + layers[j]) / 2) + 1 : 0; z.vhi = j < layers.length - 1 ? Math.floor((layers[j] + layers[j + 1]) / 2) : 127; } });
      this.rrCount = {};
    },
    // Which recording plays note n at velocity v (0..127): {zone, takes, take, shift}.
    pick(n, v) {
      let zs = this.zones; if (!zs.length) return null;
      if (this.oneOnly) { const r = zs.reduce((b, z) => Math.abs(z.root - 60) < Math.abs(b.root - 60) ? z : b).root; zs = zs.filter(z => z.root === r); }
      else zs = zs.filter(z => n >= z.lo && n <= z.hi);
      if (!zs.length) return null;
      if (!this.layersOn) { const top = Math.max(...zs.map(z => z.vhi)); zs = zs.filter(z => z.vhi === top); }
      else { const at = zs.filter(z => v >= z.vlo && v <= z.vhi); if (at.length) zs = at; else return null; }
      const takes = zs.slice().sort((a, b) => a.rr - b.rr), key = takes[0].root + ":" + takes[0].vlo;
      let k = 0; if (this.rrOn && takes.length > 1) { k = (this.rrCount[key] || 0) % takes.length; this.rrCount[key] = k + 1; }
      const z = takes[k]; return { zone: z, takes: takes.length, take: k + 1, shift: n - z.root + z.tune / 100 };
    },
    noteOn(n, vel = this.mVel) {
      this.multiInit(); const c = A().ctx(), p = this.pick(n, vel); this.noteOff(n, true); this.lastNote = n; this.lastVel = vel;
      if (!p) { this.lastPick = null; this.mInfo.textContent = nn(n) + " · velocity " + vel + " → no recording covers this"; this.drawMap(); return null; }
      const s = c.createBufferSource(), g = c.createGain(), t = c.currentTime; s.buffer = p.zone.buf; s.playbackRate.value = Math.pow(2, p.shift / 12);
      const v = vel / 127, gain = p.zone.level * (this.layersOn ? 0.45 + 0.55 * v : Math.pow(v, 1.6));
      g.gain.setValueAtTime(gain, t); s.connect(g); g.connect(out()); s.start(t);
      const voice = { s, g }; this.voices.add(voice); s.onended = () => this.voices.delete(voice); this.mHeld[n] = voice;
      this.lastPick = p; this.zSel = this.zones.indexOf(p.zone);
      const sh = Math.round(p.shift * 10) / 10;
      this.mInfo.textContent = nn(n) + " · velocity " + vel + " → " + p.zone.name + (p.takes > 1 ? " (take " + p.take + " of " + p.takes + ")" : "") +
        " · " + (sh ? (sh > 0 ? "+" : "") + sh + " semitones from its note" : "its own note");
      this.drawMap(); this.drawZone(); return p;
    },
    noteOff(n, now) {
      const v = this.mHeld && this.mHeld[n]; if (!v) return; const t = A().ctx().currentTime;
      v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, now ? 0.01 : 0.12); try { v.s.stop(t + (now ? 0.06 : 0.8)); } catch (e) {} this.mHeld[n] = null;
    },
    async loadZones(files) {
      this.multiInit(); const add = [];
      for (const f of files) { try { const t = await A().getBuffer(f), r = parseName(f.name || "");
        add.push({ buf: t.buffer, name: (f.name || "sample").replace(/\.[a-z0-9]+$/i, ""), root: r.root == null ? 60 : r.root, layer: r.layer == null ? 100 : r.layer, rr: r.rr, tune: 0, level: 1, lo: 0, hi: 127, vlo: 0, vhi: 127 }); }
        catch (e) { this.status("Could not load " + f.name); } }
      if (!add.length) return;
      if (this.zones.length && this.zones[0].name.startsWith("Pluck ") && this.mTitle.textContent.startsWith("Demo")) this.zones = [];
      this.zones.push(...add); this.autoMap(); this.mTitle.textContent = this.zones.length + " recordings (yours)"; this.zSel = this.zones.length - add.length; this.drawMap(); this.drawZone();
      const guessed = add.filter((z, i) => parseName(files[i].name || "").root == null).length;
      this.status(guessed ? guessed + " file" + (guessed > 1 ? "s" : "") + " had no note in the name: set to C4, change Root below." : "");
    },
    multiUi() {
      const p = h("div", "sp-multi"); p.hidden = true; this.mPanel = p;
      const bar = h("div", "sp-patbar"); this.mTitle = h("span", "sp-title", "");
      const file = h("input"); file.type = "file"; file.accept = "audio/*"; file.multiple = true; file.hidden = true; file.onchange = () => { this.loadZones([...file.files]); file.value = ""; };
      const load = btn("Load recordings…", "Choose several files: a note name in each (C3, F#4 or a MIDI number), optionally soft / hard / pp..ff / v100, and rr1 / take2");
      load.onclick = () => file.click();
      const demo = btn("Demo instrument", "Back to the built-in plucked string"); demo.onclick = () => this.demoInstrument();
      const auto = btn("Spread zones", "Each note's zone halfway to the next, velocity split between the layers"); auto.onclick = () => { this.autoMap(); this.drawMap(); this.drawZone(); };
      const lab = (t, inp, title) => { const l = h("label", "sp-lbl"); if (title) l.title = title; l.append(inp, " " + t); return l; };
      const ck = (k, title) => { const c = h("input"); c.type = "checkbox"; c.checked = this[k]; c.onchange = () => { this[k] = c.checked; this.rrCount = {}; this.drawMap(); }; c.dataset.k = k; return c; };
      this.multiInit();
      bar.append(this.mTitle, load, file, demo, auto,
        lab("Velocity layers", ck("layersOn"), "Off: always the loudest layer, just turned down"),
        lab("Round robin", ck("rrOn"), "Off: always take 1 (the machine-gun sound on repeated notes)"),
        lab("One sample only", ck("oneOnly"), "Play every key from the recording nearest middle C, pitched up and down"));
      const vel = h("input"); vel.type = "range"; vel.min = 1; vel.max = 127; vel.value = this.mVel; const vv = h("span", "sp-val", String(this.mVel));
      vel.oninput = () => { this.mVel = +vel.value; vv.textContent = vel.value; this.drawMap(); }; vel.setAttribute("aria-label", "Velocity for keys and clicks");
      const vl = h("label", "sp-lbl"); vl.append("Velocity ", vel, vv); bar.append(vl);
      this.mMap = h("canvas", "sp-map"); this.mMap.height = 150; this.mMap.setAttribute("aria-label", "Key map: keys across, velocity up; click to play");
      this.mInfo = h("div", "sp-hint", "Keys A W S E D … play C to E (Z / X: octave down / up), or click the map: across is the key, up is how hard.");
      this.mZone = h("div", "sp-edit sp-zone");
      p.append(bar, this.mMap, this.mInfo, this.mZone); this.mapEvents(); return p;
    },
    mapAt(e) { const c = this.mMap, r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, kb = 22 / c.height;
      return { n: Math.max(LO, Math.min(HI, Math.floor(LO + x * (HI - LO + 1)))), v: y > 1 - kb ? this.mVel : Math.max(1, Math.min(127, Math.round((1 - kb - y) / (1 - kb) * 127))) }; },
    mapEvents() {
      const c = this.mMap; let down = null;
      c.addEventListener("pointerdown", e => { e.preventDefault(); this.el.focus({ preventScroll: true }); const a = this.mapAt(e); down = a.n; c.setPointerCapture(e.pointerId); this.noteOn(a.n, a.v); });
      c.addEventListener("pointermove", e => { if (down == null) return; const a = this.mapAt(e); if (a.n !== down) { this.noteOff(down); down = a.n; this.noteOn(a.n, a.v); } });
      const up = () => { if (down != null) this.noteOff(down); down = null; }; c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    },
    drawMap() {
      const c = this.mMap; if (!c || this.mPanel.hidden) return; const w = c.clientWidth || 600; if (c.width !== w) c.width = w;
      const g = c.getContext("2d"), H = c.height, kb = 22, mh = H - kb, nk = HI - LO + 1, kw = w / nk, X = n => (n - LO) * kw, Y = v => mh - v / 127 * mh;
      g.fillStyle = "#1e1b18"; g.fillRect(0, 0, w, H);
      const roots = [...new Set(this.zones.map(z => z.root))].sort((a, b) => a - b), hue = r => (roots.indexOf(r) * 67 + 20) % 360;
      const sel = this.zones[this.zSel], lit = this.lastPick && this.lastPick.zone;
      const show = this.oneOnly ? [] : this.zones;
      for (const z of show) { if (z.rr !== Math.min(...this.zones.filter(q => q.root === z.root && q.vlo === z.vlo).map(q => q.rr))) continue;
        const lo = Math.max(z.lo, LO), hi = Math.min(z.hi, HI); if (hi < lo) continue;
        const vlo = this.layersOn ? z.vlo : 0, vhi = this.layersOn ? z.vhi : 127;
        const on = lit && lit.root === z.root && lit.vlo === z.vlo;
        g.fillStyle = "hsla(" + hue(z.root) + ",55%," + (on ? "58%,.85" : "45%,.45") + ")"; g.fillRect(X(lo) + 1, Y(vhi) + 1, (hi - lo + 1) * kw - 2, (vhi - vlo + 1) / 127 * mh - 2);
        if (sel && sel.root === z.root && sel.vlo === z.vlo) { g.strokeStyle = "#e0b020"; g.lineWidth = 2; g.strokeRect(X(lo) + 1, Y(vhi) + 1, (hi - lo + 1) * kw - 2, (vhi - vlo + 1) / 127 * mh - 2); }
        const n = this.zones.filter(q => q.root === z.root && q.vlo === z.vlo).length;
        g.fillStyle = "#fff"; g.font = "10px monospace"; if ((hi - lo + 1) * kw > 40) g.fillText(nn(z.root) + (n > 1 ? " ×" + n : ""), X(lo) + 4, Y(vhi) + 12); }
      if (this.oneOnly && this.zones.length) { const r = this.zones.reduce((b, z) => Math.abs(z.root - 60) < Math.abs(b.root - 60) ? z : b).root;
        g.fillStyle = "hsla(" + hue(r) + ",55%,45%,.45)"; g.fillRect(0, 0, w, mh); g.fillStyle = "#fff"; g.font = "10px monospace"; g.fillText("every key from " + nn(r), 6, 12); }
      for (const r of roots) if (r >= LO && r <= HI) { g.fillStyle = "#fff"; g.fillRect(X(r) + kw / 2 - 1, mh - 6, 2, 6); }
      g.strokeStyle = "rgba(255,255,255,.35)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, Y(this.mVel)); g.lineTo(w, Y(this.mVel)); g.stroke(); g.setLineDash([]);
      for (let n = LO; n <= HI; n++) { const blk = [1, 3, 6, 8, 10].includes(n % 12); g.fillStyle = n === this.lastNote && this.mHeld[n] ? "#d0703a" : blk ? "#222" : "#eee";
        g.fillRect(X(n) + 0.5, mh + (blk ? 0 : 2), kw - 1, blk ? kb - 8 : kb - 2); if (n % 12 === 0 && kw * 12 > 60) { g.fillStyle = "#666"; g.font = "9px monospace"; g.fillText("C" + (n / 12 - 1), X(n) + 1, H - 2); } }
      if (this.lastPick && this.lastNote != null) { g.fillStyle = "#e03a2a"; g.beginPath(); g.arc(X(this.lastNote) + kw / 2, Y(this.lastVel), 4, 0, 7); g.fill(); }
    },
    drawZone() {
      const e = this.mZone, z = this.zones[this.zSel]; e.innerHTML = ""; if (!z) return;
      const pick = h("select"); this.zones.forEach((q, i) => { const o = h("option", "", q.name); o.value = i; pick.append(o); }); pick.value = this.zSel;
      pick.onchange = () => { this.zSel = +pick.value; this.drawMap(); this.drawZone(); }; pick.setAttribute("aria-label", "Recording");
      const t = h("div", "sp-edtitle"); t.append("Recording ", pick); e.append(t);
      const row = (label, inp, val) => { const l = h("label", "sp-row"); l.append(h("span", "", label), inp); if (val) l.append(val); e.append(l); };
      const num = (k, min, max, fmt, all) => { const r = h("input"); r.type = "range"; r.min = min; r.max = max; r.step = 1; r.value = z[k]; const v = h("span", "sp-val", fmt(z[k]));
        r.oninput = () => { const old = z[k]; for (const q of all ? this.zones.filter(q => q.root === z.root && q.vlo === z.vlo && q.layer === z.layer) : [z]) q[k] = +r.value;
          if (k === "root" && all) for (const q of this.zones) if (q.root === old) q.root = +r.value; v.textContent = fmt(+r.value); this.drawMap(); }; return [r, v]; };
      row("Root note", ...num("root", 0, 127, x => nn(x) + " (" + x + ")", true));
      row("Lowest key", ...num("lo", 0, 127, nn, true)); row("Highest key", ...num("hi", 0, 127, nn, true));
      row("Softest", ...num("vlo", 0, 127, String, true)); row("Hardest", ...num("vhi", 0, 127, String, true));
      row("Take", ...num("rr", 1, 8, String));
      row("Fine tune", ...num("tune", -50, 50, x => (x > 0 ? "+" : "") + x + " ct"));
      const lv = h("input"); lv.type = "range"; lv.min = 0; lv.max = 1.5; lv.step = 0.05; lv.value = z.level; const lvv = h("span", "sp-val", Math.round(z.level * 100) + "%");
      lv.oninput = () => { z.level = +lv.value; lvv.textContent = Math.round(z.level * 100) + "%"; }; row("Level", lv, lvv);
      const rm = btn("Remove", "Take this recording out"); rm.onclick = () => { this.zones.splice(this.zSel, 1); this.zSel = 0; this.rrCount = {}; this.drawMap(); this.drawZone(); };
      const play = btn("▶ " + nn(z.root), "Play this recording at its own note"); play.onclick = () => { const c = A().ctx(), s = c.createBufferSource(); s.buffer = z.buf; const g = c.createGain(); g.gain.value = z.level; s.connect(g); g.connect(out()); s.start(); };
      const r2 = h("div", "sp-row"); r2.append(play, rm); e.append(r2);
      e.append(h("div", "sp-hint", "Key range, velocity range and root move every take of this note and layer together."));
    },
    multiKey(e, down) {
      const k = e.key.toLowerCase();
      if (down && (k === "z" || k === "x")) { this.mOct = Math.max(-3, Math.min(3, this.mOct + (k === "z" ? -1 : 1))); this.mInfo.textContent = "Keys start at C" + (4 + this.mOct); return true; }
      const i = PKEYS.indexOf(k); if (i < 0) return false; const n = 60 + this.mOct * 12 + i;
      if (down) this.noteOn(n); else this.noteOff(n); return true;
    },
  };
  Object.assign(Pads.prototype, MULTI);
  function init(root) { (root || document).querySelectorAll(".sp-pads:not(.sp-made)").forEach(el => new Pads(el)); }
  window.SamplerPads = { init, all, byId: id => all.find(p => p.id === id), KEYS, parseName };
})();
