// ---------- helpers ----------
const NOTE_NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const midiToFreq=m=>440*Math.pow(2,(m-69)/12);
const freqToMidiFloat=f=>69+12*Math.log2(f/440);
const noteName=m=>(window.Tonality&&Tonality.noteName)?Tonality.noteName(m):NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1);
const centsOff=(f,ref)=>1200*Math.log2(f/ref);
const median=a=>{ if(!a.length)return NaN; const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
function bestCents(f,ref,allowOct){ const sh=allowOct?[0,12,-12,24,-24]:[0]; let best=Infinity; for(const s of sh){const c=centsOff(f,ref*Math.pow(2,s/12)); if(Math.abs(c)<Math.abs(best))best=c;} return best; }

// ---------- config (host page can repoint the data source + turn off preview playback,
// e.g. the Reading Benchmarks page reuses this tool without playback or a chord chart) ----------
const TA_CFG=(typeof window!=="undefined"&&window.TUNE_APP_CONFIG)||{};
const ALLOW_PLAYBACK=TA_CFG.playback!==false;
const TUNES=(TA_CFG.source&&window[TA_CFG.source])||(typeof tunesObject!=="undefined"?tunesObject:{});

// ---------- tune library ----------
let currentAbc="", target={notes:[],total:0,lq:1,meter:{n:4,d:4},tempoQ:100};
let writtenDoPc=0;   // DO pitch class of the tune's written key (for the Key transpose)
let writtenRootPc=0; // K: tonic pitch class (root the transposer transposes from)
const collectionSel=document.getElementById("collection"), tuneSel=document.getElementById("tune");
for(const k in TUNES){ const o=document.createElement("option"); o.value=k;o.textContent=k; collectionSel.appendChild(o); }
let tuneBook=null;
function loadCollection(autoLoad){
  tuneBook=new ABCJS.TuneBook(TUNES[collectionSel.value]);
  tuneSel.innerHTML="";
  tuneBook.tunes.forEach((t,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=(t.title||("Tune "+t.id)); tuneSel.appendChild(o); });
  tuneSel.value=0; if(autoLoad!==false) loadTune();   // picker passes false (it sets the index itself)
}
const idOf=abc=>{ const m=/^%%\s*id\s+(\S+)/m.exec(abc||""); return m?m[1]:null; };
function loadTune(){
  const idx=parseInt(tuneSel.value,10)||0;
  currentAbc=tuneBook.tunes[idx].abc;
  try{ localStorage.setItem("sharedTuneId",idOf(currentAbc)||""); }catch(e){}
  target=AbcTune.melodyNotes(currentAbc);
  try{ const km=/^K:\s*(.+)$/m.exec(currentAbc); const tt=km&&window.Tonality&&Tonality.keyToTonality(km[1]); writtenDoPc=tt?tt.do:0; }catch(e){ writtenDoPc=0; }
  try{ const rm=/^K:\s*([A-Ga-g])([#b]?)/m.exec(currentAbc); writtenRootPc = rm ? ((({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[rm[1].toUpperCase()]+(rm[2]==="#"?1:rm[2]==="b"?-1:0))%12+12)%12 : 0; }catch(e){ writtenRootPc=0; }
  document.getElementById("tempo").value=Math.min(160,Math.max(40,target.tempoQ));
  document.getElementById("tempoVal").textContent=document.getElementById("tempo").value;
  // Re-filter selectors by new tune's meter, then restore saved selections.
  if(window._taPopulateByMeter) window._taPopulateByMeter();
  const _tuneId=idOf(currentAbc);
  if(_tuneId&&window._taRestoreSettings) window._taRestoreSettings(_tuneId);
  if(window._taRefreshAccompUI) window._taRefreshAccompUI();
  renderTune(false);   // render + (re)load the abcjs synth transport/cursor for this tune
  steerTonality();     // propagate this tune's key to the circle / patterns / etc.
  saveLast();          // remember this tune for next visit
  document.getElementById("resultArea").innerHTML=`<div class="muted">Tune loaded. Record a performance when ready.</div>`;
  document.getElementById("recCard").style.display="none";
  document.getElementById("timelineWrap").style.display="none";
  if (running) setStatus("Press ● Record (or ▶ Hear tune first).","");
  if (window.SessionLog) SessionLog.present();
  if (tunePicker) tunePicker.setSelected(idOf(currentAbc));   // keep the faceted list in sync
}
let tunePicker=null;   // set up in init when a #tunePicker element is present
// ---------- preview transport: abcjs SynthController (Play/Loop/Restart/Progress/
// scrub/Warp) with a note-highlighting cursor + soundfont + auto chord accompaniment ----------
const SF_URL="https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/";
const chordsOn=()=>{ const e=document.getElementById("chords"); return e?e.checked:false; };
const playTuneOn=()=>{ const el=document.getElementById("play-tune"); return el?el.checked:true; };
let previewPlaying=false;
// When accompaniment is ON, the synth plays the hidden arranger ABC (#taHiddenNotation).
// ev.left/top come from that SVG's coordinate space, so we use positionCursorByTime()
// (which looks up pre-computed notationTimings) instead of the direct ev coordinates.
let usingArrVisual=false;
let currentPlayVisual=null; // visualObj currently loaded into synthControl
let lastPlayMs=0;           // last known playback position (ms); used by reloadAudio to seek back
let notationTimings=[];     // [{milliseconds,left,top,height,elements,startCharArray}] from visualObj.setTiming()
let measureTimings=[];      // [milliseconds] — downbeat of each measure in notation time (no intro offset)
let accompTimings=[];       // same, but for #accompNotation (display ABC has no intro; use ms-introMs for lookup)
let introMs=0, introBarCount=0;  // intro offset: ms and bar count
function updatePlayLabel(){ const b=document.getElementById("play"); if(b) b.textContent=previewPlaying?"⏸ Pause":"▶ Play tune"; }
const cursorControl={
  onStart(){ if(tuneChartObj) tuneChartObj.resetPlayback(); const svg=document.querySelector("#notation svg"); if(!svg)return;
    let c=svg.querySelector(".abcjs-cursor"); if(!c){ c=document.createElementNS("http://www.w3.org/2000/svg","line"); c.setAttribute("class","abcjs-cursor"); svg.appendChild(c); } },
  onEvent(ev){ if(ev.measureStart&&ev.left===null)return;
    if(ev.milliseconds!=null) lastPlayMs=ev.milliseconds;  // always track position for reloadAudio seek
    // loop-back is INCLUSIVE of the end note: loopOutMs is its onset, so we wait until
    // we're strictly PAST it (the next event) before seeking, letting it sound fully.
    if(cycleOn()&&loopInMs!=null&&loopOutMs!=null&&ev.milliseconds!=null&&ev.milliseconds>loopOutMs){
      const d=durMs(); if(d){ try{ synthControl.seek(loopInMs/d); synthControl.setProgress(loopInMs/d,d); }catch(e){} return; } }
    if(tuneChartObj) tuneChartObj.onPlaybackEvent(ev);   // time-based chart highlight (loop-safe)
    if(usingArrVisual){ if(ev.milliseconds!=null) positionCursorByTime(ev.milliseconds); return; }
    document.querySelectorAll("#notation svg .highlight").forEach(e=>e.classList.remove("highlight"));
    (ev.elements||[]).forEach(n=>n.forEach(e=>e.classList.add("highlight")));
    const c=document.querySelector("#notation svg .abcjs-cursor");
    if(c){ c.setAttribute("x1",ev.left-2); c.setAttribute("x2",ev.left-2); c.setAttribute("y1",ev.top); c.setAttribute("y2",ev.top+ev.height); } },
  onFinished(){ previewPlaying=false; updatePlayLabel(); if(tuneChartObj) tuneChartObj.resetPlayback();
    document.querySelectorAll("#notation svg .highlight").forEach(e=>e.classList.remove("highlight"));
    const c=document.querySelector("#notation svg .abcjs-cursor"); if(c){ ["x1","x2","y1","y2"].forEach(a=>c.setAttribute(a,0)); }
    document.querySelectorAll("#accompNotation svg .highlight").forEach(e=>e.classList.remove("highlight"));
    const c2=document.querySelector("#accompNotation svg .abcjs-cursor"); if(c2){ ["x1","x2","y1","y2"].forEach(a=>c2.setAttribute(a,0)); }
    if(cycleOn()&&!(loopInMs!=null&&loopOutMs!=null)){
      const d=durMs(); if(d&&currentPlayVisual){
        // intro-only (no gap): skip intro on repeat. gap present (with or without intro): replay from 0.
        const seekMs=(introBarCount>0&&taGapBars()===0)?introMs:0;
        const frac=Math.max(0,Math.min(0.999,seekMs/d));
        setTimeout(()=>{ try{ synthControl.seek(frac); synthControl.setProgress(frac,d); }catch(e){}
          try{ synthControl.play(); previewPlaying=true; updatePlayLabel(); }catch(e2){} },50); } } }
};
// click a notehead → seek playback to that note (build the buffer first if needed)
// ---- DAW-style cycle (loop a region between two clicked noteheads) ----
let loopInMs=null, loopOutMs=null;
const durMs=()=>(synthControl&&synthControl.midiBuffer&&synthControl.midiBuffer.duration)?synthControl.midiBuffer.duration*1000:0;
function applyCycle(){ if(synthControl) synthControl.isLooping=false; } // cycling handled in onFinished
function markLoopRegion(){
  document.querySelectorAll("#notation svg .loop-region").forEach(e=>e.classList.remove("loop-region"));
  if(loopInMs==null||loopOutMs==null) return;
  if(notationTimings.length){
    // arranger mode: loopIn/Out are in accompaniment time; notation events are in notation time
    notationTimings.forEach(t=>{
      const ms=t.milliseconds+introMs;
      if(ms>=loopInMs&&ms<=loopOutMs) (t.elements||[]).forEach(g=>g.forEach(e=>e.classList.add("loop-region")));
    });
  }else{
    document.querySelectorAll("#notation svg .abcjs-note").forEach(n=>{
      let ms=n.currentTrackMilliseconds; if(Array.isArray(ms))ms=ms[0];
      if(ms!=null && ms>=loopInMs && ms<=loopOutMs) n.classList.add("loop-region");
    });
  }
}
function updateCycleHint(){
  const h=document.getElementById("cycleHint"); if(!h) return;
  if(!cycleOn()){ h.style.display="none"; return; }
  h.style.display="";
  if(loopInMs!=null&&loopOutMs!=null) h.textContent="🔁 Looping the highlighted region — press Play tune. Click a notehead to start a new region, or uncheck Cycle to clear.";
  else if(loopInMs!=null) h.textContent="🔁 Loop start set — now click the notehead where the loop should end.";
  else {
    const gb=taGapBars(), hi=introBarCount>0;
    if(hi&&gb===0) h.textContent="🔁 Cycle on — intro plays once, then the tune repeats. Click a notehead to set a loop region.";
    else if(gb>0) h.textContent="🔁 Cycle on — tune → "+(gb)+" bar gap"+(hi?" → intro":"")+", repeating. Click a notehead to set a loop region.";
    else h.textContent="🔁 Cycle on — click a notehead for the loop start, then another for the end (or just press Play tune to loop the whole tune).";
  }
}
function onNoteClick(abcElem){
  if(!synthControl) return;
  const apply=()=>{
    let ms=abcElem.currentTrackMilliseconds; if(Array.isArray(ms)) ms=ms[0];
    // In arranger mode currentTrackMilliseconds is not set on notation notes; use startChar lookup
    if(ms==null&&notationTimings.length){
      for(const t of notationTimings){
        if((t.startCharArray||[]).indexOf(abcElem.startChar)>=0){ ms=t.milliseconds+introMs; break; }
      }
    }
    const d=durMs(); if(ms==null||!d) return;
    if(cycleOn()){
      if(loopInMs==null||loopOutMs!=null){ loopInMs=ms; loopOutMs=null; try{synthControl.seek(ms/d);synthControl.setProgress(ms/d,d);}catch(e){} }
      else { loopOutMs=ms; if(loopOutMs<loopInMs){const tmp=loopInMs;loopInMs=loopOutMs;loopOutMs=tmp;} }
      applyCycle(); markLoopRegion(); updateCycleHint();
    } else {
      const frac=Math.max(0,Math.min(0.999,ms/d));
      try{ synthControl.seek(frac); synthControl.setProgress(frac,d); }catch(e){}
    }
  };
  if(synthControl.isLoaded&&synthControl.midiBuffer) apply();
  else if(synthControl.go) synthControl.go().then(apply).catch(()=>{});
}
let synthControl=null;
function setupSynth(){
  if(!ALLOW_PLAYBACK)return;                                  // preview playback disabled (e.g. sight-reading)
  if(synthControl||!(window.ABCJS&&ABCJS.synth&&ABCJS.synth.supportsAudio()))return;
  if(!document.getElementById("tune-audio"))return;          // no transport widget on this page
  synthControl=new ABCJS.synth.SynthController();
  synthControl.load("#tune-audio",cursorControl,{displayLoop:true,displayRestart:true,displayPlay:false,displayProgress:false,displayWarp:true});
}
// map the 6 synth voices → General MIDI programs so the soundfont preview uses the
// same instrument the menu selects (melody=program, accompaniment=chordprog, bass).
const GM={piano:0,epiano:4,nylon:24,bass:32,vibraphone:11,marimba:12};
const accompStyle=()=>(document.getElementById("taAccomp")||{}).value||"off";
const accompNotesel=()=>(document.getElementById("taNotesel")||{}).value||"piano";
const accompTenor=()=>(document.getElementById("taTenorclef")||{}).value||"treble8";
const accompShowDrums=()=>!!(document.getElementById("taShowDrums")||{}).checked;
const accompShowHand=()=>!!(document.getElementById("taShowHand")||{}).checked;
const accompPercOnly=()=>!!(document.getElementById("taPercOnly")||{}).checked;
const combinedScore=()=>!!(document.getElementById("taCombined")||{}).checked;
const taRepeats=()=>Math.max(1,parseInt((document.getElementById("taRepeats")||{}).value||"1",10)||1);
const taIntro=()=>(document.getElementById("taIntro")||{}).value||"none";
const taGapBars=()=>{ const el=document.getElementById("taGapBars"); const v=el?el.value:"auto";
  if(v==="auto"){ return parseInt((taIntro().match(/\d+/)||["0"])[0],10)||0; } return parseInt(v,10)||0; };
const taGapClick=()=>!!(document.getElementById("taGapClick")||{}).checked;
const taTimeFeel=()=>{ const el=document.querySelector('input[name="taTimeFeel"]:checked'); return el?el.value:"normal"; };
const taVol=part=>{ const el=document.getElementById("ta-vol-"+part); return el?(parseInt(el.value,10)||0):100; };
const taDrumPattern=()=>(document.getElementById("taDrumPattern")||{}).value||"none";
const taDrumFill=()=>(document.getElementById("taDrumFill")||{}).value||"none";
const taHandPattern=()=>(document.getElementById("taHandPattern")||{}).value||"none";
// Build setTune opts from current UI state. arrAbc=null means direct tune path (no arranger).
const synthOpts=arrAbc=>({soundFontUrl:SF_URL,
  midiTranspose:arrAbc?0:-instAdjust(),chordsOff:arrAbc?false:!chordsOn(),voicesOff:arrAbc?false:!playTuneOn()});
// Extract just the melody line from a tune ABC string for layering into the arranger band.
// Strips chords/decorations/grace/repeats/endings; normalizes note lengths to L:1/8.
// Returns null if the result doesn't parse cleanly (some tunes use syntax we can't translate).
function extractMelody(abc){
  abc=abc.replace(/<!--[\s\S]*?-->/g,"");
  const Lm=/L:\s*1\/(\d+)/.exec(abc),Lden=Lm?parseInt(Lm[1],10):8;
  const music=abc.split("\n").filter(l=>l&&!/^[A-Za-z]:/.test(l)&&!/^%/.test(l));
  let body=music.join(" ");
  body=body.replace(/"[^"]*"/g,"").replace(/![^!]*!/g,"").replace(/\{[^}]*\}/g,"");
  body=body.replace(/\$/g," ").replace(/\((?!\d)/g,"").replace(/\)/g,"");
  body=body.replace(/\|\s*[12]/g,"|").replace(/\[[12]/g,"").replace(/:\|:|\|:|:\||::|\[\||\|\]/g,"|");
  body=body.replace(/[^A-Ga-gxyzZ0-9_=^,''\/|:(\s\[\]>-]/g,"");
  body=body.replace(/\s+/g," ").trim();
  function fmt(v){ for(let den=1;den<=16;den*=2){ const num=v*den; if(Math.abs(num-Math.round(num))<1e-6){
    let n=Math.round(num),d=den; const g=(a,b)=>b?g(b,a%b):a; const r=g(n,d)||1; n/=r;d/=r;
    if(d===1)return n===1?"":String(n); if(n===1)return "/"+d; return n+"/"+d; } } return ""; }
  if(Lden<8){ const f=8/Lden;
    body=body.replace(/(\[[^\]]*\]|[\^=_]*[A-Ga-gxyzZ][,']*)(\d+)?(\/+\d*)?/g,(m,head,n,sl)=>{
      if(!head)return m; let num=n?parseInt(n,10):1,d=1;
      if(sl){ if(/^\/+$/.test(sl))d=Math.pow(2,sl.length); else{ const mm=/^(\/+)(\d+)$/.exec(sl);d=mm?parseInt(mm[2],10):2; } }
      return head+fmt((num/d)*f); }); }
  try{ const v=ABCJS.parseOnly("X:1\nL:1/8\nK:C\n"+body); if(!v||!v.length)return null; }catch(e){ return null; }
  return body;
}
// Build the arranger ABC for the current tune (clean for display when forPlay=false;
// with dynamics + optional melody when forPlay=true). Returns null when unavailable/off.
// forPlay=true → add dynamics + volumes (for audio); includeMelody=true → layer the
// melody voice into the display score (for combined score view).
function arrangerAbc(forPlay, includeMelody){
  if(accompStyle()==="off"||!window.Arranger||!tuneChartObj) return null;
  const qpm=Math.round((parseInt(tempoEl.value,10)||target.tempoQ||100)*(target.tempoNote||1));
  const dp=taDrumPattern(), df=taDrumFill(), hp=taHandPattern();
  const opts={style:accompStyle(),notation:accompNotesel(),tempo:qpm,transpose:keyTrans(),
    program:GM[accompVoice()]??GM.piano,tenorClef:accompTenor(),
    drumPattern:dp, drumFill:df, drums:dp!=="none"&&taVol("drums")>0,
    handPattern:hp,
    showDrums:accompShowDrums(), showHandDrums:accompShowHand(), percOnly:accompPercOnly(), repeats:taRepeats(),
    intro:forPlay?taIntro():"none",           // display has no intro bars
    gapBars:forPlay?taGapBars():0,            // display has no gap bars
    gapClick:forPlay?taGapClick():false,
    timeFeel:taTimeFeel()};
  if(forPlay){
    opts.dynamics=true;
    opts.vol={melody:playTuneOn()?taVol("melody"):0, chords:chordsOn()?taVol("chords"):0,
              bass:taVol("bass"), drums:taVol("drums"), handDrums:taVol("handDrums")};
  }
  if(forPlay?taVol("melody")>0:includeMelody){
    let abc=currentAbc; const shift=keyTrans()+instAdjust();
    if(window.AbcTranspose&&(shift!==0||keyAlt)){
      try{ abc=AbcTranspose.transpose(currentAbc,keyNameAscii((((writtenRootPc+shift)%12)+12)%12)); }catch(e){}
    }
    const mel=extractMelody(abc);
    if(mel) opts.melody={body:mel,program:GM[melodyVoice()]??0,vol:forPlay?taVol("melody"):100};
  }
  try{ return Arranger.toAbc(tuneChartObj.parsed,opts); }catch(e){ return null; }
}
// Prepare accomp ABC for display: remove RH/LH labels, force last staff to fill
// the full width, and insert explicit line breaks every bpr bars so the stave
// layout matches the chord grid.
function injectAccompLineBreaks(abc, bpr){
  if(!bpr||bpr<=0) return abc;
  abc=abc.replace(/\s+name="[^"]*"/g,'')              // strip RH / LH / S / A / T / B labels
         .replace(/^(K:)/m,'%%stretchlast true\n$1'); // always fill last line to viewport width
  return abc.split('\n').map(function(line){
    if(/^[A-Za-z]:/.test(line)||/^%%/.test(line)||!line.trim()) return line;
    var end=''; if(/ \|\]$/.test(line)){ end=' |]'; line=line.slice(0,-3); }
    var bars=line.split(' | ');
    var groups=[]; for(var i=0;i<bars.length;i+=bpr) groups.push(bars.slice(i,i+bpr).join(' | '));
    return groups.join(' |\n')+end;
  }).join('\n');
}
function renderAccompNotation(){
  const el=document.getElementById("accompNotation"); if(!el) return;
  const pa=document.getElementById("panelAccomp");
  // In combined-score mode the accompaniment is shown inside #notation, not here.
  const abc=combinedScore()?null:arrangerAbc(false);
  if(!abc){
    el.innerHTML=""; accompTimings=[];
    if(pa) pa.style.display="none";
    return;
  }
  if(pa) pa.style.display="";
  const bpr=(tuneChartObj&&tuneChartObj.parsed&&tuneChartObj.parsed.barsPerRow)||4;
  const vObj=ABCJS.renderAbc("accompNotation",injectAccompLineBreaks(abc,bpr),{responsive:"resize",add_classes:true})[0];
  accompTimings=vObj?(vObj.setTiming()||[]).filter(e=>e.type==="event"&&e.left!=null):[];
}
function previewAbc(){
  const qpm=Math.round((parseInt(tempoEl.value,10)||target.tempoQ||100)*(target.tempoNote||1));
  const melGM=GM[melodyVoice()]??0, accGM=GM[accompVoice()]??0;
  // Transpose to the chosen WRITTEN key with the chosen spelling (so the staff key
  // signature follows the enharmonic toggle). The shift = key + instrument transpose.
  let abc=currentAbc;
  const shift=keyTrans()+instAdjust();
  if(window.AbcTranspose && (shift!==0 || keyAlt)){
    const tgt=keyNameAscii((((writtenRootPc+shift)%12)+12)%12);
    abc=AbcTranspose.transpose(currentAbc, tgt);
  }
  let lines=abc.split("\n").filter(l=>!/^\s*(Q:|%%MIDI\s+(program|chordprog|bassprog))/.test(l));
  let i=lines.findIndex(l=>/^\s*X:/.test(l)); if(i<0)i=0;
  lines.splice(i+1,0,`Q:1/4=${qpm}`,`%%MIDI program ${melGM}`,`%%MIDI chordprog ${accGM}`,`%%MIDI bassprog ${GM.bass}`);
  if(instClef()==="bass") lines=lines.map(l=>/^\s*K:/.test(l)?l.replace(/\s*clef=\S+/i,"")+" clef=bass":l);
  return lines.join("\n");
}
// When accompaniment is playing (usingArrVisual), cursor events come from the hidden
// accompaniment SVG. Use pre-computed notationTimings (from visualObj.setTiming()) to
// find the matching notation note by time, then position the cursor in notation SVG
// coordinates directly — no currentTrackMilliseconds or AudioContext needed.
function positionCursorByTime(ms){
  // ---- main notation (no intro → subtract introMs) ----
  if(notationTimings.length){
    const t=ms-introMs;
    let best=null;
    for(let i=0;i<notationTimings.length;i++){
      if(notationTimings[i].milliseconds<=t) best=notationTimings[i]; else break;
    }
    const svg=document.querySelector("#notation svg"); if(svg){
      svg.querySelectorAll(".highlight").forEach(e=>e.classList.remove("highlight"));
      if(best)(best.elements||[]).forEach(g=>g.forEach(e=>e.classList.add("highlight")));
      const c=svg.querySelector(".abcjs-cursor");
      if(c&&best&&best.left!=null){
        c.setAttribute("x1",best.left-2); c.setAttribute("x2",best.left-2);
        c.setAttribute("y1",best.top); c.setAttribute("y2",best.top+best.height);
      }
    }
  }
  // ---- accompaniment notation (display has no intro → subtract introMs, same as melody) ----
  if(accompTimings.length){
    const tA=ms-introMs;
    let bestA=null;
    if(tA>=0) for(let i=0;i<accompTimings.length;i++){
      if(accompTimings[i].milliseconds<=tA) bestA=accompTimings[i]; else break;
    }
    const asvg=document.querySelector("#accompNotation svg"); if(asvg){
      asvg.querySelectorAll(".highlight").forEach(e=>e.classList.remove("highlight"));
      if(bestA)(bestA.elements||[]).forEach(g=>g.forEach(e=>e.classList.add("highlight")));
      let c2=asvg.querySelector(".abcjs-cursor");
      if(!c2){ c2=document.createElementNS("http://www.w3.org/2000/svg","line"); c2.setAttribute("class","abcjs-cursor"); asvg.appendChild(c2); }
      if(c2&&bestA&&bestA.left!=null){
        c2.setAttribute("x1",bestA.left-2); c2.setAttribute("x2",bestA.left-2);
        c2.setAttribute("y1",bestA.top); c2.setAttribute("y2",bestA.top+bestA.height);
      }
    }
  }
}
function renderTune(userAction){
  lastPlayMs=0;
  renderChart(); // must precede arrangerAbc (needs tuneChartObj)
  // In combined mode render melody+accompaniment together in #notation.
  const combineNow=combinedScore()&&window.Arranger&&tuneChartObj&&accompStyle()!=="off";
  const displayAbc=combineNow?arrangerAbc(false,true):null;
  const visualObj=ABCJS.renderAbc("notation",displayAbc||previewAbc(),{responsive:"resize",add_classes:true,clickListener:onNoteClick})[0];
  renderAccompNotation();
  setupSynth();
  if(synthControl){
    const arrAbc=window.Arranger&&tuneChartObj&&accompStyle()!=="off"?arrangerAbc(true):null;
    usingArrVisual=!!arrAbc;
    // Pre-compute notation timing for cursor positioning — avoids needing currentTrackMilliseconds
    // (which requires an active AudioContext) and makes the cursor work immediately on first play.
    if(arrAbc&&visualObj){
      const allT=visualObj.setTiming()||[];
      notationTimings=allT.filter(e=>e.type==="event"&&e.left!=null);
      measureTimings=[...new Set(allT.filter(e=>e.measureStart).map(e=>e.milliseconds))].sort((a,b)=>a-b);
      introBarCount=parseInt((taIntro().match(/\d+/)||["0"])[0],10)||0;
      introMs=introBarCount*(visualObj.millisecondsPerMeasure?visualObj.millisecondsPerMeasure():0);
      // Tell the chord grid how many intro bars precede the main sequence so it doesn't
      // jump to bar 1 while the intro is still playing.
      if(tuneChartObj){
        const n=tuneChartObj.parsed.bars.length;
        const intro=taIntro();
        const introBars=intro==="last-2"?[Math.max(0,n-2),n-1].filter(i=>i>=0)
                        :intro==="last-4"?[Math.max(0,n-4),Math.max(0,n-3),Math.max(0,n-2),n-1].filter((v,i,a)=>a.indexOf(v)===i&&v>=0)
                        :[];
        tuneChartObj.setIntro(introBarCount,introBars);
      }
    }else{
      notationTimings=[]; introMs=0; introBarCount=0; if(tuneChartObj) tuneChartObj.setIntro(0,[]);
      const elseT=visualObj?(visualObj.setTiming()||[]):[];
      measureTimings=[...new Set(elseT.filter(e=>e.measureStart).map(e=>e.milliseconds))].sort((a,b)=>a-b);
    }
    let playVisual=visualObj;
    if(arrAbc) playVisual=ABCJS.renderAbc("taHiddenNotation",arrAbc,{add_classes:true})[0];
    if(playVisual){
      currentPlayVisual=playVisual;
      synthControl.setTune(playVisual,!!userAction,synthOpts(arrAbc)).catch(()=>{});
      try{ synthControl.isLoaded=false; }catch(e){}
      loopInMs=loopOutMs=null; markLoopRegion(); applyCycle(); updateCycleHint();
    }
  }
}
// shared iRealPro-style chord chart (same module the Chord Sheet tool uses). Chords
// follow the CONCERT key (keyTrans); instrument transposition is the player's part only.
let tuneChartObj=null;
const chartBeats=()=>parseInt((document.getElementById("chartBeats")||{}).value,10)||0;
const chartRomanOn=()=>{ const el=document.getElementById("chartRoman"); return !!(el&&el.checked); };
function renderChart(){
  const el=document.getElementById("tuneChart");
  if(!el||!window.TuneChart||!currentAbc) return;
  tuneChartObj=TuneChart.render(el,currentAbc,{transpose:keyTrans(),preferFlats:!keyAlt,subBarBeats:chartBeats(),roman:chartRomanOn(),header:true});
}
(function(){ const b=document.getElementById("chartBeats"); if(b) b.addEventListener("change",()=>{ if(tuneChartObj) tuneChartObj.setSubBars(chartBeats()); }); })();
(function(){ const r=document.getElementById("chartRoman"); if(r) r.addEventListener("change",()=>{ if(tuneChartObj) tuneChartObj.setRoman(chartRomanOn()); }); })();
collectionSel.addEventListener("change",loadCollection);
tuneSel.addEventListener("change",loadTune);
(function(){ const pt=document.getElementById("play-tune"); if(pt) pt.addEventListener("change",()=>scheduleReloadAudio()); })();
(function(){ const ch=document.getElementById("chords"); if(ch) ch.addEventListener("change",()=>scheduleReloadAudio()); })();
// tempo slider + voice menus now drive the preview too (re-cue on release/change)
["tempo","melVoice","accVoice"].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener("change",()=>{ renderTune(false); saveLast(); }); });
(function(){ const el=document.getElementById("keySel"); if(el) el.addEventListener("change",()=>{ syncKeyUI(); renderTune(false); steerTonality(); saveLast(); }); })();
(function(){ const el=document.getElementById("instSel"); if(el) el.addEventListener("change",()=>{ syncKeyUI(); renderTune(false); if(window.Tonality) Tonality.setInstrument(el.value,"tune"); }); })();
(function(){ const t=document.getElementById("transKey"); if(t) t.addEventListener("change",()=>{ const c=document.getElementById("keySel"); if(c) c.value=t.value; syncKeyUI(); renderTune(false); steerTonality(); saveLast(); }); })();
(function(){ const b=document.getElementById("enharmBtn"); if(b) b.addEventListener("click",()=>{ keyAlt=!keyAlt; syncKeyUI(); renderTune(false); }); })();
(function(){ const cy=document.getElementById("cycle"); if(cy) cy.addEventListener("change",()=>{ if(!cy.checked){ loopInMs=loopOutMs=null; markLoopRegion(); } applyCycle(); updateCycleHint(); }); })();
document.getElementById("next").addEventListener("click",()=>{ if(tunePicker){ tunePicker.next(); return; } tuneSel.selectedIndex=(tuneSel.selectedIndex+1)%tuneSel.options.length; loadTune(); });
const tempoEl=document.getElementById("tempo");
tempoEl.addEventListener("input",()=>document.getElementById("tempoVal").textContent=tempoEl.value);
tempoEl.addEventListener("change",()=>{ if(window.SessionLog)SessionLog.present(); });
(function(){ const ch=document.getElementById("chords"); if(ch) ch.addEventListener("change",()=>{ if(window.SessionLog)SessionLog.present(); }); })();

// ---------- timing ----------
// Convert display BPM (slider) to seconds-per-quarter. For compound meters like 6/8
// the Q: note value is a dotted-quarter (tempoNote=1.5), so 100 dotted-quarter BPM
// equals 150 quarter BPM — multiply here so all timing stays in quarter-note units.
const secPerQuarter=()=>60/(parseInt(tempoEl.value,10)*(target.tempoNote||1));
const secPerLunit=()=>secPerQuarter()*target.lq;
const COUNT_IN=4, INITIAL_DELAY=0.15;
const latencyComp=()=>(audioCtx&&(audioCtx.outputLatency||audioCtx.baseLatency))||0;

// ---------- pitch detection (YIN) ----------
const RMS_GATE=0.012,YIN_THRESHOLD=0.15,FMIN=70,FMAX=1500;
function detectPitch(buf,sr){
  const SIZE=buf.length,W=Math.floor(SIZE/2); let rms=0;
  for(let i=0;i<SIZE;i++)rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/SIZE); if(rms<RMS_GATE)return -1;
  const d=new Float32Array(W);
  for(let tau=1;tau<W;tau++){ let s=0; for(let j=0;j<W;j++){const df=buf[j]-buf[j+tau];s+=df*df;} d[tau]=s; }
  const c=new Float32Array(W); c[0]=1; let run=0;
  for(let tau=1;tau<W;tau++){ run+=d[tau]; c[tau]=run>0?d[tau]*tau/run:1; }
  let tau=-1; for(let t=2;t<W;t++){ if(c[t]<YIN_THRESHOLD){ while(t+1<W&&c[t+1]<c[t])t++; tau=t; break; } }
  if(tau===-1)return -1;
  let bt=tau; if(tau>0&&tau<W-1){const s0=c[tau-1],s1=c[tau],s2=c[tau+1],dn=2*(2*s1-s2-s0); if(dn)bt=tau+(s2-s0)/dn;}
  const f0=sr/bt; return (f0<FMIN||f0>FMAX)?-1:f0;
}

// ---------- audio ----------
let audioCtx,analyser,micStream,buf,running=false,collecting=false,frames=[],smF=null,perfT0=0;
const sensitivity=()=>parseFloat(document.getElementById("sens").value);
// share the synth's AudioContext so scheduled playback + mic analysis use one clock
async function ensureAudio(){ audioCtx=audioCtx||(window.MusicAudio?MusicAudio.ctx():new (window.AudioContext||window.webkitAudioContext)()); await audioCtx.resume(); }
const melodyVoice=()=>(document.getElementById("melVoice")||{}).value||"piano";   // synth voices from the menu
const accompVoice=()=>(document.getElementById("accVoice")||{}).value||"epiano";  // (bass line always uses "bass")
// Instrument = DISPLAY-only (re-spells the part + clef; sound/grading stay concert).
// Key = concert transpose (display + sound + grading). [adj, clef] per instrument.
const INST={Piano:[0,""],Flute:[12,""],Clarinet:[2,""],"Alto Sax":[9,""],Trumpet:[2,""],Trombone:[0,"bass"],Tuba:[-12,"bass"],Percussion:[0,""]};
const instSelV=()=>(document.getElementById("instSel")||{}).value||"Piano";
const instAdjust=()=>(INST[instSelV()]||[0,""])[0];
const instClef=()=>(INST[instSelV()]||[0,""])[1];
// enharmonic key names: [default, alternate]; toggle button flips to the alternate
const ENHARM={0:["C","B♯"],1:["D♭","C♯"],2:["D",null],3:["E♭","D♯"],4:["E","F♭"],5:["F","E♯"],
  6:["G♭","F♯"],7:["G",null],8:["A♭","G♯"],9:["A",null],10:["B♭","A♯"],11:["B","C♭"]};
let keyAlt=false;
function keyName(pc){ pc=((pc%12)+12)%12; const e=ENHARM[pc]; return (keyAlt&&e[1])?e[1]:e[0]; }
function concertPc(){ const el=document.getElementById("keySel"); const v=el?el.value:"written";
  return (v==="written"||v===""||v==null)?null:parseInt(v,10); }
function keyTrans(){ const c=concertPc(); if(c==null) return 0; let d=((c-writtenDoPc)%12+12)%12; if(d>6)d-=12; return d; }
const keyNameAscii=pc=>keyName(pc).replace(/♭/g,"b").replace(/♯/g,"#");
// Steer the shared tonality from the tune + concert key (so the circle, patterns, etc.
// follow this page). Publishes the SOUNDING (concert) key — instrument is display-only.
function steerTonality(){
  if(!window.Tonality) return;
  const km=/^K:\s*(.+)$/m.exec(currentAbc); const t=km&&Tonality.keyToTonality(km[1]); if(!t) return;
  const kt=keyTrans();
  Tonality.setAll(((t.do+kt)%12+12)%12, ((t.resting+kt)%12+12)%12, t.mode, "tune");
  publishTuneData(t, kt);   // also feed the chord sheet (key + chord list)
}
// transpose a chord symbol's root (and any /bass) by `semis`; flat-spelled (the chord
// sheet re-spells per the key, so only the pitch class matters here)
function transposeChordSymbol(sym, semis){
  if(!semis) return sym;
  const FLAT=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"], PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  return sym.replace(/([A-G])([#b]*)/g,(m,L,acc)=>{ let pc=PC[L]; for(const c of acc) pc+=(c==="#"?1:-1); return FLAT[((pc+semis)%12+12)%12]; });
}
// publish the current tune's tonality + (unique) chord list so the chord sheet's
// "Load tune chords" + spelling follow this tune (the old tunes app did this).
function publishTuneData(t, kt){
  try{
    localStorage.setItem("tuneTonality", JSON.stringify({ do:((t.do+kt)%12+12)%12, resting:((t.resting+kt)%12+12)%12, mode:t.mode }));
    const M = target && target.meter; if (M) localStorage.setItem("tuneMeter", JSON.stringify({ n: M.n, d: M.d }));
    const seen=new Set(), names=[];
    (currentAbc.match(/"[^"]*"/g)||[]).forEach(q=>{ const s=q.slice(1,-1).trim(); if(!/^[A-G]/.test(s)) return;
      const sym=transposeChordSymbol(s, kt); if(!seen.has(sym)){ seen.add(sym); names.push(sym); } });
    if(names.length) localStorage.setItem("tuneChords", JSON.stringify(names));
  }catch(e){}
}
// Persist the current tune + settings so reopening the page restores the last one.
function saveLast(){
  try{ localStorage.setItem(TA_CFG.storeKey||"tuneAssessLast", JSON.stringify({
    coll: collectionSel.value, idx: tuneSel.selectedIndex,
    key:  (document.getElementById("keySel")||{}).value,
    mel:  (document.getElementById("melVoice")||{}).value,
    acc:  (document.getElementById("accVoice")||{}).value,
    tempo:(document.getElementById("tempo")||{}).value })); }catch(e){}
}
// keep the Concert/Transposed key menus + labels in sync (transposed = concert + instAdjust)
function syncKeyUI(){
  const cSel=document.getElementById("keySel"); if(!cSel) return;
  for(const o of cSel.options) if(o.value!=="written") o.textContent=keyName(parseInt(o.value,10));
  const ia=instAdjust(), wrap=document.getElementById("transKeyWrap"), tSel=document.getElementById("transKey"), tLbl=document.getElementById("transKeyLabel");
  if(wrap) wrap.style.display = ia ? "" : "none";
  if(ia && tSel){
    if(tLbl) tLbl.textContent="Transposed Key ("+instSelV()+")";
    for(const o of tSel.options) if(o.value!=="written") o.textContent=keyName(parseInt(o.value,10)+ia);
    tSel.value=cSel.value;   // mirror the concert selection
  }
}
const cycleOn=()=>{ const el=document.getElementById("cycle"); return !!(el&&el.checked); };
async function enableMic(){
  try{
    await ensureAudio();
    micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=audioCtx.createMediaStreamSource(micStream);
    analyser=audioCtx.createAnalyser(); analyser.fftSize=2048; buf=new Float32Array(analyser.fftSize); src.connect(analyser);
    running=true; document.getElementById("record").disabled=false;
    const mic=document.getElementById("mic"); mic.textContent="Mic on ✓"; mic.disabled=true;
    loop(); setStatus("Press ● Record (or ▶ Hear tune first).","");
  }catch(e){ setStatus("Mic error: "+e.message+" (needs http://localhost or https)","failed"); }
}
function rms(){ let s=0; for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i]; return Math.sqrt(s/buf.length); }
function loop(){
  if(!running)return;
  analyser.getFloatTimeDomainData(buf);
  const f=detectPitch(buf,audioCtx.sampleRate), now=performance.now(), r=rms();
  document.getElementById("levelbar").style.width=Math.min(100,r/0.3*100)+"%";
  if(f>0){ smF=smF===null?f:smF+(f-smF)*0.2; const nm=Math.round(freqToMidiFloat(smF)); document.getElementById("liveNote").textContent=noteName(nm)+"  "+smF.toFixed(0)+" Hz"; }
  if(collecting)frames.push({t:now,f,rms:r});
  requestAnimationFrame(loop);
}
function setStatus(t,c){ const e=document.getElementById("flowStatus"); e.textContent=t; e.className="flow "+(c||""); }

// ---------- metronome + playback ----------
let activeOscs=[], playing=false, recTimer=null;
function stopAllTones(){ for(const o of activeOscs){try{o.stop();}catch(e){}} activeOscs=[]; if(window.MusicAudio)MusicAudio.stopAll(); }
function stopPlayback(){ clearBeatTimers(); stopAllTones(); playing=false; if(synthControl){try{synthControl.pause();}catch(e){}} previewPlaying=false; if(typeof updatePlayLabel==="function")updatePlayLabel(); }
function abortRecording(){
  collecting=false; if(recTimer){ clearTimeout(recTimer); recTimer=null; }
  clearBeatTimers(); stopAllTones();
  document.getElementById("capturing").style.display="none";
  document.getElementById("progwrap").style.display="none";
  document.getElementById("beatdot").style.background="#2c3038";
  try{ if(mediaRecorder&&mediaRecorder.state!=="inactive") mediaRecorder.stop(); }catch(e){}
  document.getElementById("record").disabled=false;
}
function stopAll(){ if(collecting) abortRecording(); else stopPlayback(); setStatus("Stopped.",""); }
const metroVol=()=>{ const e=document.getElementById("metroVol"); return e?parseInt(e.value,10)/100:0.7; };
const chordVol=()=>{ const e=document.getElementById("chordVol"); return e?parseInt(e.value,10)/100:0; };   // no slider ⇒ no chords
(function(){ const e=document.getElementById("metroVol"); if(e) e.addEventListener("input",ev=>{ const v=document.getElementById("metroVolV"); if(v) v.textContent=ev.target.value; }); })();
(function(){ const e=document.getElementById("chordVol"); if(e) e.addEventListener("input",ev=>{ const v=document.getElementById("chordVolV"); if(v) v.textContent=ev.target.value; }); })();
function tone(midi,start,dur,gain,type){
  const G=(gain===undefined?0.2:gain); if(G<=0)return;        // 0 → muted (skip)
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||"sine"; o.frequency.value=midiToFreq(midi); g.gain.value=0.0001; o.connect(g); g.connect(audioCtx.destination);
  g.gain.exponentialRampToValueAtTime(G,start+0.01); g.gain.exponentialRampToValueAtTime(0.0001,start+dur);
  o.start(start); o.stop(start+dur+0.03); activeOscs.push(o); o.onended=()=>{activeOscs=activeOscs.filter(x=>x!==o);};
}
let beatTimers=[];
function clearBeatTimers(){ beatTimers.forEach(clearTimeout); beatTimers=[]; }
function flashBeat(){ const d=document.getElementById("beatdot"); d.style.background="#e8eaed"; setTimeout(()=>d.style.background="#2c3038",90); }
function scheduleMetronome(ctxNow,perfNow,beats,accentEvery,spb){
  if(!spb) spb=secPerQuarter();
  for(let k=0;k<beats;k++){
    const bt=ctxNow+INITIAL_DELAY+k*spb, accent=(k%accentEvery===0);
    if(window.MusicAudio) MusicAudio.click(bt,accent,metroVol());
    else tone(accent?84:76,bt,0.05,(accent?0.28:0.15)*metroVol(),"square");
    const delay=perfNow+(bt-ctxNow+latencyComp())*1000-performance.now();
    beatTimers.push(setTimeout(flashBeat,Math.max(0,delay)));
  }
}
// schedule chord accompaniment for one performance pass (perfStart = ctx time of the downbeat)
function scheduleChords(perfStart){
  if(!chordsOn() || !target.chords.length) return;
  const spl=secPerLunit(), cv=chordVol(); if(cv<=0) return;
  const av=accompVoice(), kt=keyTrans();
  target.chords.forEach((ch,idx)=>{
    const cStart=perfStart+ch.onset*spl;
    const nextOnset=(idx+1<target.chords.length)?target.chords[idx+1].onset:target.total;
    const dur=Math.max(0.3,(nextOnset-ch.onset)*spl)*0.95;
    if(window.MusicAudio){
      for(const m of ch.midis) MusicAudio.noteAt(m+kt,cStart,dur,0.13*cv,av);
      let bass=Math.min(...ch.midis)+kt-12; while(bass>47)bass-=12;  // chord root (concert), in the bass register
      MusicAudio.noteAt(bass,cStart,dur,0.20*cv,"bass");
    } else { for(const m of ch.midis) tone(m+kt,cStart,dur,0.10*cv,"triangle"); }
  });
}
// Rebuild the synth audio with current volume/checkbox settings without touching the notation.
// For the accompaniment path the arranger ABC is re-baked (volumes live in %%MIDI vol /
// dynamics decorations). For the direct tune path the existing visualObj is reused and
// only the setTune opts (chordsOff / voicesOff) are updated — no notation re-render.
let reloadAudioTimer=null;
function reloadAudio(){
  if(!synthControl||!currentPlayVisual) return;
  // Blank cursor and highlights so the old position doesn't linger during buffer rebuild.
  ["#notation","#accompNotation"].forEach(sel=>{
    const svg=document.querySelector(sel+" svg"); if(!svg) return;
    svg.querySelectorAll(".highlight").forEach(e=>e.classList.remove("highlight"));
    const c=svg.querySelector(".abcjs-cursor"); if(c) ["x1","x2","y1","y2"].forEach(a=>c.setAttribute(a,0));
  });
  const wasPlaying=previewPlaying, seekMs=lastPlayMs;
  const arrAbc=window.Arranger&&tuneChartObj&&accompStyle()!=="off"?arrangerAbc(true):null;
  usingArrVisual=!!arrAbc;
  const pv=arrAbc?ABCJS.renderAbc("taHiddenNotation",arrAbc,{add_classes:true})[0]:currentPlayVisual;
  if(!pv) return;
  currentPlayVisual=pv;
  if(wasPlaying){
    // Force go() so the new buffer (with updated volumes) is ready, then seek to the saved
    // position before starting playback to avoid a stutter from position 0.
    synthControl.setTune(pv,true,synthOpts(arrAbc)).then(()=>{
      const d=durMs();
      if(seekMs>0&&d>0){
        const frac=Math.max(0,Math.min(0.999,seekMs/d));
        try{ synthControl.seek(frac); synthControl.setProgress(frac,d); }catch(e){}
      }
      try{ synthControl.play(); previewPlaying=true; updatePlayLabel(); }catch(e){}
    }).catch(()=>{});
  }else{
    synthControl.setTune(pv,false,synthOpts(arrAbc)).catch(()=>{});
    try{ synthControl.isLoaded=false; }catch(e){}
  }
}
function scheduleReloadAudio(){
  clearTimeout(reloadAudioTimer);
  reloadAudioTimer=setTimeout(reloadAudio,200);
}
// Click a chord-grid bar to seek the playhead to that measure.
(function(){
  const el=document.getElementById("tuneChart"); if(!el) return;
  el.addEventListener("click",function(ev){
    if(!synthControl) return;
    const d=durMs(); if(!d||!measureTimings.length) return;
    const cell=ev.target.closest("[data-bar]"); if(!cell) return;
    const b=parseInt(cell.getAttribute("data-bar"),10); if(isNaN(b)) return;
    const po=tuneChartObj?tuneChartObj.playOrder:[];
    const k=po.indexOf(b); if(k<0) return;
    const targetAudio=Math.max(0, measureTimings[k]+introMs);
    const frac=Math.max(0,Math.min(0.999,targetAudio/d));
    try{ synthControl.seek(frac); synthControl.setProgress(frac,d); lastPlayMs=targetAudio; }catch(e){}
    if(tuneChartObj) tuneChartObj.setPlayMeasure(k+introBarCount);
    positionCursorByTime(targetAudio);
  });
})();
// Step one measure back (dir=-1) or forward (dir=1) while paused.
// measureTimings are in notation time (no intro); add introMs for audio time.
function stepMeasure(dir){
  if(previewPlaying||!synthControl) return;
  const d=durMs(); if(!d||!measureTimings.length) return;
  const notePos=Math.max(0, lastPlayMs-introMs);
  let targetAudio;
  if(dir>0){
    const t=measureTimings.find(m=>m>notePos+10); if(t==null) return;
    targetAudio=t+introMs;
  }else{
    const cur=measureTimings.findLast(m=>m<=notePos)??0;
    const prev=measureTimings.findLast(m=>m<cur-1);
    // within 100ms of current measure start → go to previous; else go to current start
    const backNote=(notePos-cur<100)?(prev??-introMs):cur;
    targetAudio=Math.max(0, backNote+introMs);
  }
  const frac=Math.max(0,Math.min(0.999,targetAudio/d));
  try{ synthControl.seek(frac); synthControl.setProgress(frac,d); lastPlayMs=targetAudio; }catch(e){}
}
// "Hear tune" now drives the abcjs transport (play/pause toggle). Loop/restart/
// progress/scrub/warp + the cursor live in the #tune-audio widget.
function hearTune(){ if(collecting||!synthControl)return; try{ synthControl.play(); previewPlaying=!previewPlaying; updatePlayLabel(); }catch(e){} }
const playBtn=document.getElementById("play"); if(playBtn) playBtn.addEventListener("click",hearTune);
(function(){ const b=document.getElementById("reloadAudio"); if(b) b.addEventListener("click",()=>reloadAudio()); })();
document.getElementById("mic").addEventListener("click",enableMic);

// ---------- recording ----------
let mediaRecorder=null,recChunks=[],lastUrl=null;
function pickMime(){ if(typeof MediaRecorder==="undefined"||!MediaRecorder.isTypeSupported)return null; return ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"].find(m=>MediaRecorder.isTypeSupported(m))||null; }
function startRec(){ if(typeof MediaRecorder==="undefined"){mediaRecorder=null;return;} recChunks=[]; const m=pickMime(); try{mediaRecorder=new MediaRecorder(micStream,m?{mimeType:m}:undefined);}catch(e){mediaRecorder=null;return;} mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)recChunks.push(e.data);}; mediaRecorder.start(); }
function stopRec(){ return new Promise(res=>{ if(!mediaRecorder||mediaRecorder.state==="inactive"){res(null);return;} mediaRecorder.onstop=()=>res(new Blob(recChunks,{type:mediaRecorder.mimeType})); mediaRecorder.stop(); }); }
function tstamp(){ const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }
function present(blob){ const card=document.getElementById("recCard"); if(!blob){card.style.display="none";return;} if(lastUrl)URL.revokeObjectURL(lastUrl); lastUrl=URL.createObjectURL(blob); const ext=blob.type.includes("mp4")?"m4a":blob.type.includes("ogg")?"ogg":"webm"; const name=`tune_${tstamp()}.${ext}`; document.getElementById("player").src=lastUrl; const dl=document.getElementById("download"); dl.href=lastUrl; dl.download=name; document.getElementById("recMeta").textContent=`${(blob.size/1024).toFixed(0)} KB · ${name}`; card.style.display="block"; }

// ---------- onset detection ----------
const REFRACTORY_MS=90;
function detectOnsets(fr,thr){ const on=[]; let last=-1e9,prev=0; for(const f of fr){ if(f.rms>thr&&prev<=thr&&(f.t-last)>REFRACTORY_MS){on.push(f.t);last=f.t;} prev=f.rms; } return on; }

// ---------- record + combined grade ----------
document.getElementById("record").addEventListener("click",async()=>{
  if(collecting)return; await ensureAudio(); stopPlayback();
  frames=[]; smF=null;
  const recBtn=document.getElementById("record"); recBtn.disabled=true;
  document.getElementById("resultArea").innerHTML=""; document.getElementById("recCard").style.display="none"; document.getElementById("timelineWrap").style.display="none";
  setStatus("Recording…","recording");
  const cap=document.getElementById("capturing"); cap.style.display="block"; cap.textContent="Count-in…";
  document.getElementById("progwrap").style.display="block";

  const spq=secPerQuarter(), spl=secPerLunit();
  // Two-bar count-off; the first FULL bar is measure 1. With a pickup, the performer
  // comes in partway through the SECOND count-off bar (so measure 1's downbeat lands on
  // the bar-3 click). anacrusis length comes from the shared TuneChart parser.
  const cp=window.TuneChart?TuneChart.parse(currentAbc):null;
  const anaUnits=cp?cp.anacrusisUnits:0, anaQ=anaUnits*target.lq;   // pickup length, in quarters
  const M=target.meter;
  const barQ=(M.n/M.d)*4;                                            // quarters per bar
  const countInQ=2*barQ;                                             // count-in length in quarters
  const perfQAfter=Math.ceil(target.total*target.lq - anaQ);        // quarters from m1 downbeat → end
  // Compound meters (6/8, 9/8, 12/8): count in dotted-quarter beats (groups of 3 eighths).
  // 6/8 → 2 beats/bar, dotted-quarter = 1.5 quarter-notes. Simple meters: quarter beats.
  const isCompound=M.n%3===0&&M.n>=6&&M.d>=8;
  const beatsPerBar=isCompound?M.n/3:Math.max(1,Math.round(barQ));
  const spb=isCompound?spq*1.5:spq;                                  // seconds per count-off click
  const countInBeats=Math.round(countInQ/(isCompound?1.5:1));        // count-in in click units
  const perfBeats=isCompound?Math.ceil(perfQAfter/1.5):perfQAfter;
  const ctxNow=audioCtx.currentTime, perfNow=performance.now();
  scheduleMetronome(ctxNow,perfNow,countInBeats+perfBeats,beatsPerBar,spb);
  const pickupDelayQ=countInQ-anaQ;                                 // when target onset 0 (the pickup) sounds
  scheduleChords(ctxNow+INITIAL_DELAY+pickupDelayQ*spq);            // play-along accompaniment
  perfT0=perfNow+(INITIAL_DELAY+pickupDelayQ*spq+latencyComp())*1000;
  collecting=true; startRec();

  if(anaUnits>0) cap.textContent="Count-in (2 bars)… come in on the pickup in bar 2";
  const countInMs=perfT0-perfNow, perfMs=target.total*spl*1000, totalMs=countInMs+perfMs+700;
  let playSwitched=false;
  const start=performance.now(),prog=document.getElementById("prog");
  (function tick(){ const e=performance.now()-start; prog.style.width=Math.min(100,e/totalMs*100)+"%";
    if(e>=countInMs&&!playSwitched){ playSwitched=true; cap.textContent=anaUnits>0?"Play! (pickup)":"Play!"; }
    if(e<totalMs&&collecting)requestAnimationFrame(tick); })();

  recTimer=setTimeout(async()=>{
    recTimer=null;
    collecting=false; clearBeatTimers(); stopAllTones(); cap.style.display="none"; document.getElementById("progwrap").style.display="none";
    const summary=grade(); const blob=await stopRec(); present(blob); recBtn.disabled=false;
    setStatus(summary,"");
  },totalMs);
});

// SPACE = Play/Pause. ENTER = reload audio. ←/H = prev measure. →/L = next measure (paused only).
document.addEventListener("keydown",e=>{
  const ae=document.activeElement, tag=ae?ae.tagName:"";
  const inText=tag==="TEXTAREA"||(tag==="INPUT"&&/^(text|number|search|email|password|url|tel)$/i.test(ae.type||"text"));
  if(e.code==="Space"){
    if(inText)return;
    e.preventDefault();
    if(ae&&ae.blur)ae.blur();
    hearTune();
  }else if(e.code==="Enter"){
    if(inText)return;
    e.preventDefault();
    reloadAudio();
  }else if(e.code==="ArrowLeft"||e.code==="KeyH"||e.code==="ArrowRight"||e.code==="KeyL"){
    if(inText)return;
    e.preventDefault();
    if(ae&&ae.blur)ae.blur();
    stepMeasure(e.code==="ArrowRight"||e.code==="KeyL"?1:-1);
  }
});

function grade(){
  const pTol=parseInt(document.getElementById("ptol").value,10), rTol=parseInt(document.getElementById("rtol").value,10), allowOct=document.getElementById("octtol").checked;
  const spl=secPerLunit(), spq=secPerQuarter();
  const tSec=target.notes.map(n=>n.onset*spl), tDur=target.notes.map(n=>n.dur*spl);
  const perf=detectOnsets(frames,sensitivity()).map(ms=>(ms-perfT0)/1000).filter(s=>s>-0.12).sort((a,b)=>a-b);
  const used=new Array(perf.length).fill(false);
  const win=Math.max(rTol/1000*2.5, spq*0.6);

  let rows="",pPass=0,rPass=0,bothPass=0;
  target.notes.forEach((n,i)=>{
    let best=-1,bd=1e9; for(let j=0;j<perf.length;j++){ if(used[j])continue; const d=Math.abs(perf[j]-tSec[i]); if(d<bd){bd=d;best=j;} }
    let pOk=false,rOk=false,sung="—",offC="—",offMs="—";
    if(best>=0&&bd<=win){
      used[best]=true; const on=perf[best];
      let end=on+tDur[i]; for(let j=0;j<perf.length;j++){ if(perf[j]>on+0.02&&perf[j]<end)end=perf[j]; }
      const fs=frames.filter(fr=>{const s=(fr.t-perfT0)/1000; return fr.f>0&&s>=on+0.03&&s<=end-0.02;}).map(fr=>fr.f);
      if(fs.length>=3){ const fm=median(fs); const c=bestCents(fm,midiToFreq(n.midi+keyTrans()),allowOct); pOk=Math.abs(c)<=pTol; offC=(c>=0?"+":"")+c.toFixed(0); sung=noteName(Math.round(freqToMidiFloat(fm))); }
      const dms=(on-tSec[i])*1000; rOk=Math.abs(dms)<=rTol; offMs=(dms>=0?"+":"")+dms.toFixed(0);
    }
    if(pOk)pPass++; if(rOk)rPass++; if(pOk&&rOk)bothPass++;
    rows+=`<tr><td>${i+1}</td><td>${noteName(n.midi+keyTrans())}</td><td>${sung}</td>`+
      `<td class="${pOk?'pass':'fail'}">${offC}${offC!=="—"?"¢":""}</td>`+
      `<td class="${rOk?'pass':'fail'}">${offMs}${offMs!=="—"?" ms":""}</td></tr>`;
  });
  const extra=used.filter(u=>!u).length;
  const N=target.notes.length;
  document.getElementById("resultArea").innerHTML=
    `<table><thead><tr><th>#</th><th>Target</th><th>You</th><th>Pitch</th><th>Timing</th></tr></thead><tbody>${rows}</tbody></table>`+
    `<div class="overall">Pitch ${pPass}/${N} · Rhythm ${rPass}/${N} · Both ${bothPass}/${N}</div>`+
    `<div class="muted">Detected ${perf.length} onsets (${extra} unmatched/extra). Pitch ±${pTol}¢, rhythm ±${rTol} ms, at ♩=${tempoEl.value}. `+
    `Misses are usually undetected attacks (legato or repeated same pitch) — see the timeline.</div>`;
  drawTimeline(tSec, perf, rTol/1000);
  // Pass-off threshold. Normal use: strict (every note right). Makeup/replay:
  // just EVIDENCE OF ENGAGEMENT — they actually attempted the tune (detection is
  // janky, so we don't demand accuracy, only a real attempt).
  const makeup = window.SessionLog && SessionLog.isReplay && SessionLog.isReplay();
  const engaged = perf.length >= Math.max(2, Math.ceil(N*0.4)) || bothPass >= Math.max(1, Math.ceil(N*0.25));
  const pass = N>0 && (makeup ? engaged : bothPass===N);
  if (window.SessionLog) SessionLog.onResult(pass);
  return `Done — pitch ${pPass}/${N}, rhythm ${rPass}/${N}.` + (makeup ? "  (makeup: counts if you gave it a real go)" : "");
}

function drawTimeline(tgt,perf,tolSec){
  const tl=document.getElementById("timeline"); tl.querySelectorAll(".tick").forEach(n=>n.remove());
  const span=Math.max(target.total*secPerLunit(), perf.length?Math.max(...perf):0, 0.001);
  const place=(sec,top,color)=>{ const d=document.createElement("div"); d.className="tick"; d.style.left=(6+(sec/span)*90)+"%"; d.style.top=top+"px"; d.style.height="28px"; d.style.background=color; tl.appendChild(d); };
  tgt.forEach(s=>{ const hit=perf.some(p=>Math.abs(p-s)<=tolSec); place(s,18,hit?"#22c55e":"#ef4444"); });
  perf.forEach(s=>{ const hit=tgt.some(t=>Math.abs(s-t)<=tolSec); place(Math.max(0,s),58,hit?"#22c55e":"#ef4444"); });
  document.getElementById("timelineWrap").style.display="block";
}

// ---------- session logging / makeup replay ----------
SessionLog.init({
  app: "tune",
  getState: () => {
    if (!tuneBook) return null;
    const i = tuneSel.selectedIndex;
    return { app:"tune", coll: collectionSel.value, idx: i,
             item: tuneBook.tunes[i].id, title: tuneSel.options[i].textContent,
             tempo: tempoEl.value, chords: chordsOn(),
             label: `${tuneSel.options[i].textContent} · ♩=${tempoEl.value}${chordsOn()?" · chords":""}` };
  },
  applyState: (s) => {
    collectionSel.value = s.coll; loadCollection();
    tuneSel.selectedIndex = Math.min(s.idx, tuneSel.options.length-1); loadTune();
    if (s.tempo){ tempoEl.value = s.tempo; document.getElementById("tempoVal").textContent = s.tempo; }
    if (s.chords !== undefined){ const ch=document.getElementById("chords"); if(ch) ch.checked = s.chords; }
    setStatus("Makeup: "+(s.label||"")+" — ▶ Hear, then ● Record.","");
  }
});

// ---------- init ----------
// restore the remembered transposing instrument (shared across the site)
(function(){ const i=document.getElementById("instSel"), sv=window.Tonality&&Tonality.getInstrument();
  if(i&&sv&&sv.name&&[...i.options].some(o=>o.value===sv.name)) i.value=sv.name; })();
syncKeyUI();        // after all the const helpers above are initialized
// restore the last tune + settings (collection, tune, key, voices, tempo)
(function(){
  let saved=null; try{ saved=JSON.parse(localStorage.getItem(TA_CFG.storeKey||"tuneAssessLast")); }catch(e){}
  if(saved && saved.coll && (saved.coll in TUNES)) collectionSel.value=saved.coll;
  loadCollection();   // builds the tune list (loads tune 0)
  if(saved){
    if(saved.idx!=null && saved.idx>=0 && saved.idx<tuneSel.options.length){ tuneSel.selectedIndex=saved.idx; loadTune(); }
    const setv=(id,v)=>{ if(v!=null){ const el=document.getElementById(id); if(el) el.value=v; } };
    setv("keySel",saved.key); setv("melVoice",saved.mel); setv("accVoice",saved.acc);
    if(saved.tempo){ const t=document.getElementById("tempo"); if(t){ t.value=saved.tempo; const tv=document.getElementById("tempoVal"); if(tv) tv.textContent=saved.tempo; } }
    syncKeyUI(); renderTune(false); steerTonality(); saveLast();
  }
})();
// faceted tune picker (assessment page only — the element drives the hidden collection/
// tune selects so all the existing load/grade/steer logic is unchanged). Reading
// Benchmarks has no #tunePicker, so it keeps its simple set/line dropdowns.
(function(){
  const el=document.getElementById("tunePicker"); if(!el||!window.TuneLibrary) return;
  TuneLibrary.build(TUNES);
  function selectById(id){ const rec=TuneLibrary.byId(id); if(!rec) return;
    if(collectionSel.value!==rec.collection){ collectionSel.value=rec.collection; loadCollection(false); }
    const i=tuneBook.tunes.findIndex(t=>idOf(t.abc)===id); if(i>=0){ tuneSel.selectedIndex=i; loadTune(); } }
  tunePicker=TuneLibrary.renderPicker(el,{ onSelect:rec=>selectById(rec.id), selectedId:idOf(currentAbc) });
  tunePicker.setSelected(idOf(currentAbc));
})();
// react to key/instrument changes made on other pages (circle, patterns)
if(window.Tonality) Tonality.onChange((st,src)=>{
  if(src==="tune") return;
  let changed=false;
  const inst=Tonality.getInstrument(), i=document.getElementById("instSel");
  if(i&&inst&&i.value!==inst.name){ i.value=inst.name; changed=true; }
  const k=document.getElementById("keySel");
  if(k&&st.do!=null&&k.value!==String(st.do)){ k.value=String(st.do); changed=true; }
  if(changed){ syncKeyUI(); renderTune(false); }
});
SessionLog.begin();
// ---- arranger controls (populated + wired when arranger.js is loaded) ----
(function(){
  if(!window.Arranger) return;
  const as=document.getElementById("taAccomp"); if(!as) return;
  const dp=document.getElementById("taDrumPattern");
  const df=document.getElementById("taDrumFill");
  const hd=document.getElementById("taHandPattern");
  const ns=document.getElementById("taNotesel");
  if(ns) Arranger.notations().forEach(n=>{ const o=document.createElement("option"); o.value=n.id; o.textContent=n.label; ns.appendChild(o); });

  // Derive the meter string for the currently loaded tune.
  function currentMeterStr(){ const m=target&&target.meter; return m?m.n+"/"+m.d:"4/4"; }

  // Rebuild the style + drum selectors to show only options compatible with the current meter.
  function populateByMeter(){
    const ms=currentMeterStr(), cur=as.value, curDp=dp?dp.value:"none", curDf=df?df.value:"none", curHd=hd?hd.value:"none";
    // --- chord/bass styles ---
    while(as.options.length>1) as.remove(1); // keep "Melody only" at index 0
    Arranger.styles(ms).forEach(s=>{ const o=document.createElement("option"); o.value=s.id; o.textContent=s.label; as.appendChild(o); });
    if([...as.options].some(o=>o.value===cur)) as.value=cur;
    // --- drum patterns ---
    if(dp){
      while(dp.options.length>0) dp.remove(0);
      Arranger.drumPatterns(ms).forEach(p=>{ const o=document.createElement("option"); o.value=p.id; o.textContent=p.label; dp.appendChild(o); });
      if([...dp.options].some(o=>o.value===curDp)) dp.value=curDp; else dp.value="none";
    }
    // --- drum fills ---
    if(df){
      while(df.options.length>0) df.remove(0);
      Arranger.drumFills(ms).forEach(f=>{ const o=document.createElement("option"); o.value=f.id; o.textContent=f.label; df.appendChild(o); });
      if([...df.options].some(o=>o.value===curDf)) df.value=curDf; else df.value="none";
    }
    // --- hand drum patterns ---
    if(hd){
      while(hd.options.length>0) hd.remove(0);
      Arranger.handPatterns(ms).forEach(p=>{ const o=document.createElement("option"); o.value=p.id; o.textContent=p.label; hd.appendChild(o); });
      if([...hd.options].some(o=>o.value===curHd)) hd.value=curHd; else hd.value="none";
    }
  }
  populateByMeter();
  // Expose so loadTune() can re-filter after the tune changes.
  window._taPopulateByMeter=populateByMeter;

  function refreshAccompUI(){
    const on=as.value!=="off";
    ["taNoteselWrap","taTenorWrap","taMixerRow"].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=on?"":"none"; });
    const dr=document.getElementById("taDrumRow"); if(dr) dr.style.display=on?"":"none";
    const fw=document.getElementById("taDrumFillWrap");
    if(fw) fw.style.display=(on&&dp&&dp.value!=="none")?"":"none";
    const hvw=document.getElementById("ta-vol-handDrums-wrap");
    if(hvw) hvw.style.display=(on&&hd&&hd.value!=="none")?"":"none";
    const pa=document.getElementById("panelAccomp"); if(pa) pa.style.display=on?"":"none";
  }

  // Persist chord/bass style and drum pattern per tune.
  const STYLE_KEY="taAccompStyles", DRUM_KEY="taDrumSettings";
  function saveAccompStyle(){ const id=idOf(currentAbc); if(!id) return;
    try{ const m=JSON.parse(localStorage.getItem(STYLE_KEY)||"{}"); m[id]=as.value; localStorage.setItem(STYLE_KEY,JSON.stringify(m)); }catch(e){} }
  function saveDrumSettings(){ const id=idOf(currentAbc); if(!id) return;
    try{ const m=JSON.parse(localStorage.getItem(DRUM_KEY)||"{}");
      m[id]={pattern:dp?dp.value:"none",fill:df?df.value:"none",hand:hd?hd.value:"none"};
      localStorage.setItem(DRUM_KEY,JSON.stringify(m)); }catch(e){} }
  function restoreSettings(id){
    try{
      const sm=JSON.parse(localStorage.getItem(STYLE_KEY)||"{}"), sv=sm[id];
      if(sv&&[...as.options].some(o=>o.value===sv)) as.value=sv;
      const dm=JSON.parse(localStorage.getItem(DRUM_KEY)||"{}"), dv=dm[id];
      if(dv){
        if(dp&&dv.pattern&&[...dp.options].some(o=>o.value===dv.pattern)) dp.value=dv.pattern;
        if(df&&dv.fill&&[...df.options].some(o=>o.value===dv.fill)) df.value=dv.fill;
        if(hd&&dv.hand&&[...hd.options].some(o=>o.value===dv.hand)) hd.value=dv.hand;
      }
    }catch(e){}
  }

  window._taRefreshAccompUI=refreshAccompUI;
  as.addEventListener("change",()=>{ saveAccompStyle(); refreshAccompUI(); renderTune(false); });
  if(dp){ dp.addEventListener("change",()=>{ saveDrumSettings(); refreshAccompUI(); renderTune(false); }); }
  if(df){ df.addEventListener("change",()=>{ saveDrumSettings(); renderTune(false); }); }
  if(hd){ hd.addEventListener("change",()=>{ saveDrumSettings(); refreshAccompUI(); scheduleReloadAudio(); }); }
  if(ns) ns.addEventListener("change",()=>{ renderTune(false); });
  const tc=document.getElementById("taTenorclef");
  if(tc) tc.addEventListener("change",()=>{ renderTune(false); });
  ["melody","chords","bass","drums","handDrums"].forEach(part=>{
    const el=document.getElementById("ta-vol-"+part); if(!el) return;
    el.addEventListener("input",()=>{ const v=document.getElementById("ta-vol-"+part+"-v"); if(v) v.textContent=el.value; });
    el.addEventListener("change",()=>scheduleReloadAudio());
  });
  function updatePercOnlyWrap(){
    const anyNotation=accompShowDrums()||accompShowHand();
    const wrap=document.getElementById("taPercOnlyWrap"); if(!wrap) return;
    wrap.style.display=anyNotation?"":"none";
    if(!anyNotation){ const pc=document.getElementById("taPercOnly"); if(pc) pc.checked=false; }
  }
  const sd=document.getElementById("taShowDrums");
  if(sd) sd.addEventListener("change",()=>{ updatePercOnlyWrap(); renderAccompNotation(); });
  const sh=document.getElementById("taShowHand");
  if(sh) sh.addEventListener("change",()=>{ updatePercOnlyWrap(); renderAccompNotation(); });
  const po=document.getElementById("taPercOnly");
  if(po) po.addEventListener("change",()=>renderAccompNotation());
  const cb=document.getElementById("taCombined");
  if(cb) cb.addEventListener("change",()=>renderTune(false));
  const rp=document.getElementById("taRepeats");
  if(rp) rp.addEventListener("change",()=>renderTune(false));
  const it=document.getElementById("taIntro");
  if(it) it.addEventListener("change",()=>renderTune(false));
  const gbEl=document.getElementById("taGapBars");
  if(gbEl) gbEl.addEventListener("change",()=>{ scheduleReloadAudio(); updateCycleHint(); });
  const gcEl=document.getElementById("taGapClick");
  if(gcEl) gcEl.addEventListener("change",()=>scheduleReloadAudio());
  document.querySelectorAll('input[name="taTimeFeel"]').forEach(el=>el.addEventListener("change",()=>renderTune(false)));
  refreshAccompUI();
  // Restore saved selections for the tune already loaded during init (options weren't ready then).
  (function(){ const id=idOf(currentAbc); if(!id) return; restoreSettings(id); refreshAccompUI(); renderTune(false); })();
  // Expose restoreSettings so loadTune() can call it after populating by meter.
  window._taRestoreSettings=restoreSettings;
})();
