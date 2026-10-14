// tonality.js — one shared tonality across the tools, steered by the tunes.
// Tracks THREE things, persisted in localStorage and synced across tabs/iframes:
//   do      — pitch class of DO (depends only on the key signature)
//   resting — pitch class of the RESTING TONE (do for major, la for minor, etc.)
//   mode    — 'maj' | 'm' | 'dor' | 'mix' | ...
// The tunes app sets all three from each tune's K: (Tonality.setFromKey). Other
// tools consume DO (Tonality.bindSelect binds a control to DO) and may read the
// resting tone. Tonic of the current key is `do`; `resting` is the modal center.
// Two more, for showing the key: `flavor` ("blues" or "") — a blues is played in a major (or minor) key but its I, IV and V are
// dominant sevenths — and `tonic`, the resting tone as the tune spells it ("F#", not "Gb").
//   Tonality.setFromKey(k, src, flavor)   Tonality.setAll(do, resting, mode, src, flavor)   (flavor left out: kept while the mode stays)
//   Tonality.label(state?) -> "F Major (Blues)"     Tonality.flavorOf(chordNames, restingPc, mode) -> "blues" | ""
//   Every change is also a window event "tonality-change" (for code loaded before this file, like the navbar's icons).

(function (global) {
  const K_DO = "tonalDo", K_REST = "tonalResting", K_MODE = "tonalMode", K_FLAV = "tonalFlavor", K_TONIC = "tonalTonic";
  const K_INST = "tonalInstrument", K_VIEW = "tonalView";
  // transposing instruments: written semitone offset from concert (display transpose)
  const INSTRUMENTS = { Piano:0, Flute:12, Clarinet:2, "Alto Sax":9, Trumpet:2, Trombone:0, Tuba:-12, Percussion:0 };
  const LETTER_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const MAJOR_FIFTHS = { C:0,G:1,D:2,A:3,E:4,B:5,"F#":6,"C#":7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7 };
  const MODE_FIFTHS = { maj:0,major:0,ion:0,ionian:0, m:-3,min:-3,minor:-3,aeo:-3,aeolian:-3,
                        dor:-2,dorian:-2, phr:-4,phrygian:-4, lyd:1,lydian:1, mix:-1,mixolydian:-1, loc:-5,locrian:-5 };

  function parseNote(s){
    if (s == null) return null;
    s = String(s).trim();
    if (/^\d+$/.test(s)){ const n = +s; return (n>=0 && n<=11) ? n : null; }
    const m = /^\s*([A-Ga-g])\s*([#b♯♭])?/.exec(s);
    if (!m) return null;
    let pc = LETTER_PC[m[1].toUpperCase()]; if (pc == null) return null;
    if (m[2]==="#"||m[2]==="♯") pc=(pc+1)%12; else if (m[2]==="b"||m[2]==="♭") pc=(pc+11)%12;
    return pc;
  }
  // ABC key field (e.g. "Bbmaj", "Gm", "Ddor", "Eb") -> {do, resting, mode}
  function keyToTonality(k){
    const m = /^([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec((k||"").trim());
    if (!m) return null;
    const tonic = m[1].toUpperCase() + (m[2]||"");
    const resting = ((LETTER_PC[m[1].toUpperCase()] + (m[2]==="#"?1:m[2]==="b"?-1:0)) % 12 + 12) % 12;
    let mode = (m[3]||"maj").toLowerCase();
    let mo = MODE_FIFTHS[mode]; if (mo === undefined){ mode = "maj"; mo = 0; }
    const fifths = (MAJOR_FIFTHS[tonic] == null ? 0 : MAJOR_FIFTHS[tonic]) + mo;
    const doPc = (((fifths*7) % 12) + 12) % 12;
    return { do: doPc, resting, mode, tonic };
  }

  const num = v => { const n = v==null?null:+v; return (n>=0 && n<=11) ? n : null; };
  const getDo      = () => num(localStorage.getItem(K_DO));
  const getResting = () => num(localStorage.getItem(K_REST));
  const getMode    = () => localStorage.getItem(K_MODE);
  const getFlavor  = () => localStorage.getItem(K_FLAV) || "";
  function getTonic(){ const t = localStorage.getItem(K_TONIC), r = getResting(); return t && parseNote(t) === r ? t : (r == null ? null : spellPc(r)); }
  const state = () => ({ do: getDo(), resting: getResting(), mode: getMode(), flavor: getFlavor(), tonic: getTonic() });

  let cbs = [];
  function emit(src){ const st = state(); cbs.forEach(cb => { try { cb(st, src); } catch(e){} });
    try { global.dispatchEvent(new CustomEvent("tonality-change", { detail: { state: st, src } })); } catch(e){} }
  function setAll(doPc, restPc, mode, src, flavor, tonic){
    if (doPc == null) return;
    mode = mode || "maj";
    if (flavor === undefined) flavor = getMode() === mode ? getFlavor() : "";            // a new key in the same mode keeps its blues
    if (getDo()===doPc && getResting()===restPc && getMode()===mode && getFlavor()===flavor && (tonic == null || tonic === localStorage.getItem(K_TONIC))) return;   // no change
    localStorage.setItem(K_DO, String(doPc));
    localStorage.setItem(K_REST, String(restPc == null ? doPc : restPc));
    localStorage.setItem(K_MODE, mode);
    localStorage.setItem(K_FLAV, flavor || "");
    if (tonic) localStorage.setItem(K_TONIC, tonic); else localStorage.removeItem(K_TONIC);
    emit(src);
  }
  const setDo = (pc, src) => setAll(pc, pc, "maj", src);          // a tool set DO without mode → treat major
  function setFromKey(k, src, flavor){ const t = keyToTonality(k); if (t) setAll(t.do, t.resting, t.mode, src, flavor || "", t.tonic); }
  const MODE_NAMES = { maj:"Major", major:"Major", ion:"Major", ionian:"Major", m:"Minor", min:"Minor", minor:"Minor", aeo:"Minor", aeolian:"Minor",
    dor:"Dorian", dorian:"Dorian", phr:"Phrygian", phrygian:"Phrygian", lyd:"Lydian", lydian:"Lydian", mix:"Mixolydian", mixolydian:"Mixolydian", loc:"Locrian", locrian:"Locrian" };
  // "F Major (Blues)", "D Dorian", "F♯ Minor" for a state (default: the current one)
  function label(st){
    st = st || state(); if (st.resting == null) return "";
    const t = String(st.tonic || spellPc(st.resting)).replace(/#/g, "\u266f").replace(/b/g, "\u266d");
    return t + " " + (MODE_NAMES[(st.mode || "maj").toLowerCase()] || st.mode) + (st.flavor === "blues" ? " (Blues)" : "");
  }
  // Is a progression a blues? chordNames: symbols as written ("F7", "Bb7", "Cm7"). A major key: dominant-type chords on I and IV.
  // A minor key: minor sevenths on i and iv. (A I-IV-V in plain triads is not a blues.)
  function flavorOf(chordNames, restingPc, mode){
    if (restingPc == null || !chordNames || !chordNames.length) return "";
    const minor = /^(m|min|minor|aeo|aeolian)$/i.test(mode || "");
    if (mode && !minor && !/^(maj|major|ion|ionian)$/i.test(mode)) return "";
    const seen = {};
    chordNames.forEach(n => {
      const m = /^([A-G][#b]?)(.*)$/.exec(String(n).trim()); if (!m) return;
      const deg = (((parseNote(m[1]) - restingPc) % 12) + 12) % 12, q = m[2].split("/")[0];
      const dom = /^(7|9|11|13)/.test(q) || /^7(sus|b|#|alt)/.test(q), m7 = /^(m|min|-)(7|9|11)/.test(q);
      seen[deg + (dom ? "d" : m7 ? "m" : "")] = true;
    });
    return minor ? (seen["0m"] && seen["5m"] ? "blues" : "") : (seen["0d"] && seen["5d"] ? "blues" : "");
  }
  function onChange(cb){ cbs.push(cb); }

  // Shared transposing-instrument selection (so concert/transposed key controls on
  // every page agree). Stored as {name, semis}; semis = written transpose from concert.
  function getInstrument(){ try { const o = JSON.parse(localStorage.getItem(K_INST)); if (o && o.name) return o; } catch(e){} return { name:"Piano", semis:0 }; }
  function setInstrument(name, src){ if (!(name in INSTRUMENTS)) return; if (getInstrument().name === name) return;
    localStorage.setItem(K_INST, JSON.stringify({ name, semis: INSTRUMENTS[name] })); emit(src); }
  // Shared view: "concert" (sounding) or "transposed" (what the player reads).
  const getView = () => localStorage.getItem(K_VIEW) || "concert";
  function setView(v, src){ v = v==="transposed" ? "transposed" : "concert"; if (getView()===v) return; localStorage.setItem(K_VIEW, v); emit(src); }

  global.addEventListener("storage", e => { if ([K_DO,K_REST,K_MODE,K_FLAV,K_TONIC,K_INST,K_VIEW].includes(e.key)) emit("storage"); });

  // Bind a <select> to DO. kind: "pc" (option value 0–11) or "note" (note names).
  function bindSelect(el, kind){
    if (!el) return;
    const readPc = () => {
      const byVal = parseNote(el.value);
      if (kind === "pc" || byVal != null) return byVal;
      const o = el.options[el.selectedIndex]; return o ? parseNote(o.text) : null;
    };
    const writePc = (pc) => {
      for (const o of el.options){
        if (parseNote(o.value)===pc || parseNote(o.text)===pc){
          if (el.value !== o.value){ el.value = o.value; el.dispatchEvent(new Event("change", { bubbles:true })); }
          return true;
        }
      }
      return false;
    };
    const apply = () => { const d = getDo(); if (d != null) writePc(d); };
    apply();
    global.addEventListener("load", apply);
    el.addEventListener("change", () => { const p = readPc(); if (p != null) setDo(p, "local"); });
    onChange((st, src) => { if (src !== "local" && st.do != null) writePc(st.do); });
  }

  // Key-aware pitch spelling (line-of-fifths via PitchSpelling, centered on the
  // current DO). Falls back to sharps if PitchSpelling isn't loaded. Used by all
  // apps so note names match the key (e.g. Bb not A# in F major).
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function spellPc(pc){
    pc = ((pc % 12) + 12) % 12;
    if (global.PitchSpelling){
      const d = getDo(), c = d != null ? global.PitchSpelling.keyTonicLOF(d) : 0;
      try { return global.PitchSpelling.spellPitchClass(pc, c).name; } catch(e){}
    }
    return SHARP[pc];
  }
  function noteName(midi){ midi = Math.round(midi); return spellPc(midi) + (Math.floor(midi/12) - 1); }

  // Establish tonality: play the characteristic chords of the CURRENT tonality (from
  // the circle's CHARACTERISTIC_CHORD_DEFS) — not always I–IV–V. Each EST entry is a
  // scale-degree sequence (tonic, two characteristic chords, tonic), ordered to end
  // on the strongest pull to the tonic. Roots from MODE_DEF.steps, quality from .q.
  const MODE_DEF = {            // steps + per-degree triad qualities (from the circle's MODES)
    maj: { steps:[0,2,4,5,7,9,11], q:["M","m","m","M","M","m","d"] },
    m:   { steps:[0,2,3,5,7,8,11], q:["m","d","aug","m","M","M","d"] },   // harmonic minor
    aeo: { steps:[0,2,3,5,7,8,10], q:["m","d","M","m","m","M","M"] },     // natural minor
    dor: { steps:[0,2,3,5,7,9,10], q:["m","m","M","M","m","d","M"] },
    phr: { steps:[0,1,3,5,7,8,10], q:["m","M","M","m","d","M","m"] },
    lyd: { steps:[0,2,4,6,7,9,11], q:["M","M","m","d","M","m","m"] },
    mix: { steps:[0,2,4,5,7,9,10], q:["M","m","d","M","m","m","M"] },
    loc: { steps:[0,1,3,5,6,8,10], q:["d","M","m","m","M","M","m"] },
  };
  const MODE_ALIAS = { major:"maj", ion:"maj", ionian:"maj", min:"m", minor:"m",
    aeolian:"aeo", dorian:"dor", phrygian:"phr", lydian:"lyd", mixolydian:"mix", locrian:"loc" };
  const TRIAD = { M:[0,4,7], m:[0,3,7], d:[0,3,6], aug:[0,4,8] };
  // scale-degree sequences (the circle's characteristic chords, tonic-bracketed)
  const EST = {
    maj: [0,3,4,0],   // I   IV   V    I
    m:   [0,3,4,0],   // i   iv   V    i    (harmonic minor)
    aeo: [0,3,6,0],   // i   iv   bVII i    (natural minor)
    dor: [0,6,3,0],   // i   bVII IV   i
    phr: [0,6,1,0],   // i   vii  bII  i    (Phrygian cadence)
    lyd: [0,1,4,0],   // I   II   V    I
    mix: [0,3,6,0],   // I   IV   bVII I
    loc: [0,2,6,0],   // i°  iii  vii  i°
  };
  function establish(){
    if (!global.MusicAudio) return;
    const rest = getResting(); if (rest == null) return;
    let mode = getMode() || "maj"; mode = MODE_ALIAS[mode] || (MODE_DEF[mode] ? mode : "maj");
    const def = MODE_DEF[mode], tonic = 60 + rest;
    const degrees = EST[mode] || EST.maj;
    let t = global.MusicAudio.ctx().currentTime + 0.05;
    for (const di of degrees){
      const root = tonic + def.steps[di], triad = TRIAD[def.q[di]] || TRIAD.M;
      global.MusicAudio.noteAt(root - 12, t, 0.9, 0.18, "piano");
      triad.forEach(iv => global.MusicAudio.noteAt(root + iv, t, 0.7, 0.12, "piano"));
      t += 1.056;
    }
  }

  global.Tonality = { getFlavor, getTonic, label, flavorOf, state, getDo, getResting, getMode, setDo, setAll, setFromKey, keyToTonality,
                      parseNote, spellPc, noteName, establish, onChange, bindSelect,
                      getInstrument, setInstrument, getView, setView, INSTRUMENTS };
})(window);
