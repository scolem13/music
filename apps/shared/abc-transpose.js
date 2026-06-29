// abc-transpose.js — transpose an ABC tune to a target key with a CHOSEN spelling
// (so F# vs Gb is the caller's choice). Works on the line of fifths: every note
// shifts by (targetTonicLOF - sourceTonicLOF), which both transposes the pitch and
// spells it in the target key. Octave comes from the actual semitone transpose.
// Rewrites the K: line + chord symbols; leaves bars/beams/durations/decorations.
//
//   AbcTranspose.transpose(abc, "Gb")   // target key name (root + optional mode suffix kept from source)
(function (global) {
  const LETTER_LOF = { F:-1, C:0, G:1, D:2, A:3, E:4, B:5 };
  const NAT_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const MODE_FIFTHS = { "":0, maj:0, major:0, m:-3, min:-3, minor:-3, aeo:-3, aeolian:-3,
                        dor:-2, dorian:-2, phr:-4, phrygian:-4, lyd:1, lydian:1, mix:-1, mixolydian:-1, loc:-5, locrian:-5 };
  function parseRoot(s){
    const m = /^\s*([A-Ga-g])([#b]*)/.exec(s||""); if(!m) return null;
    const L = m[1].toUpperCase(); let acc=0; for(const c of m[2]) acc += (c==="#"?1:-1);
    return { letter:L, acc, lof:LETTER_LOF[L]+7*acc, pc:((NAT_PC[L]+acc)%12+12)%12 };
  }
  function accStr(n){ return n>0?"#".repeat(n):n<0?"b".repeat(-n):""; }
  function lofToSpelling(lof){
    const letter = ["F","C","G","D","A","E","B"][((lof+1)%7+7)%7];
    const acc = Math.floor((lof+1)/7);
    return { letter, acc, pc:((NAT_PC[letter]+acc)%12+12)%12 };
  }

  function transpose(abc, tgtKeyName){
    const lines = abc.split("\n");
    let srcRoot=null, modeSuffix="";
    for(const l of lines){ const m=/^\s*K:\s*([A-Ga-g][#b]*)\s*([A-Za-z]*)/.exec(l); if(m){ srcRoot=m[1]; modeSuffix=m[2]||""; break; } }
    const src=parseRoot(srcRoot||"C"), tgt=parseRoot(tgtKeyName);
    if(!src||!tgt) return abc;
    const lofDelta = tgt.lof - src.lof;
    const semis = (((tgt.pc - src.pc)%12)+12)%12;
    const modeOff = MODE_FIFTHS[modeSuffix.toLowerCase()] ?? 0;

    const sigOf = (centerLof)=>{ const s={}; for(let lof=centerLof-1; lof<=centerLof+5; lof++){ const sp=lofToSpelling(lof); s[sp.letter]=sp.acc; } for(const L in LETTER_LOF) if(s[L]===undefined) s[L]=0; return s; };
    const srcSig = sigOf(src.lof + modeOff);
    const tgtSig = sigOf(tgt.lof + modeOff);

    const NOTE = /(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)/g;
    const midiOf=(letter,acc,marks)=>{ let m=60+NAT_PC[letter.toUpperCase()]+(letter===letter.toLowerCase()?12:0)+acc; for(const c of marks) m+=(c==="'"?12:-12); return m; };
    const transChord = s => s.replace(/([A-G][#b]*)/g,(root)=>{ const r=parseRoot(root); if(!r) return root; const sp=lofToSpelling(r.lof+lofDelta); return sp.letter+accStr(sp.acc); });

    function emitNote(sp, newMidi, outMeasure){
      const basePitch = 60 + NAT_PC[sp.letter] + sp.acc;     // uppercase, no marks
      let octShift = Math.round((newMidi - basePitch)/12);
      let letter = sp.letter, marks="";
      if(octShift>=1){ letter=sp.letter.toLowerCase(); octShift-=1; }
      while(octShift>0){ marks+="'"; octShift--; }
      while(octShift<0){ marks+=","; octShift++; }
      const key=letter+marks, want=sp.acc;
      let show = (key in outMeasure) ? outMeasure[key]!==want : want!==(tgtSig[sp.letter]||0);
      let glyph="";
      if(show){ glyph = want===0?"=":want>0?"^".repeat(want):"_".repeat(-want); outMeasure[key]=want; }
      return glyph+letter+marks;
    }

    function processMusic(line){
      let out="", i=0, measureAcc={}, outMeasure={};
      while(i<line.length){
        const ch=line[i];
        if(ch==='"'){ const end=line.indexOf('"',i+1); if(end<0){ out+=line.slice(i); break; }
          const inner=line.slice(i+1,end);
          out += '"' + (/^[\^_<>@]/.test(inner)?inner:transChord(inner)) + '"'; i=end+1; continue; }
        if(ch==='!'){ const end=line.indexOf('!',i+1); if(end>=0){ out+=line.slice(i,end+1); i=end+1; continue; } }
        if(ch==='|'||ch===':'){ measureAcc={}; outMeasure={}; out+=ch; i++; continue; }   // accidentals reset each bar
        NOTE.lastIndex=i; const m=NOTE.exec(line);
        if(m && m.index===i){
          const explicit=m[1], letter=m[2], marks=m[3]||"", Lu=letter.toUpperCase(), tag=letter+marks;
          let acc;
          if(explicit!==undefined){ acc = explicit==='='?0:explicit==='^'?1:explicit==='^^'?2:explicit==='_'?-1:-2; measureAcc[tag]=acc; }
          else if(tag in measureAcc){ acc=measureAcc[tag]; }
          else acc = srcSig[Lu]||0;
          const inMidi=midiOf(letter,acc,marks), inLof=LETTER_LOF[Lu]+7*acc;
          out += emitNote(lofToSpelling(inLof+lofDelta), inMidi+semis, outMeasure);
          i=NOTE.lastIndex; continue;
        }
        out+=ch; i++;
      }
      return out;
    }

    return lines.map(l=>{
      if(/^\s*K:/.test(l)) return l.replace(/^(\s*K:\s*)([A-Ga-g][#b]*\s*[A-Za-z]*)(.*)$/,(_f,pre,_k,rest)=>pre+tgtKeyName+modeSuffix+rest);
      if(/^\s*[A-Za-z]:/.test(l) || /^\s*%/.test(l)) return l;
      return processMusic(l);
    }).join("\n");
  }
  global.AbcTranspose = { transpose };
})(typeof window!=="undefined"?window:globalThis);
