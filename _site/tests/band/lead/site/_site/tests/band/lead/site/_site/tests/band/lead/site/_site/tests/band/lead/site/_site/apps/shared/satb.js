// satb.js — four-part (SATB) chorale voicing with common-practice voice-leading.
// Rules implemented follow the standard tonal voice-leading conventions (Open Music
// Theory; Kostka & Payne "Tonal Harmony"; Aldwell & Schachter "Harmony & Voice Leading"):
//   • Voice ranges (S/A/T/B) and chord completeness.
//   • Spacing: adjacent UPPER voices (S–A, A–T) within an octave; T–B may be wider.
//   • No voice crossing (S≥A≥T≥B); avoid overlap (soft).
//   • Doubling: root position → double the root; never double the leading tone; on a
//     diminished triad double the third.
//   • No parallel/consecutive perfect 5ths, octaves, or unisons between any two voices.
//   • Resolve the leading tone up to the tonic (strict in the soprano); resolve a chord
//     7th down by step.
//   • Smoothness: keep common tones, move the upper voices the least (nearest voicing).
//   • Avoid direct (hidden) 5ths/8ves into the outer voices (soft); avoid melodic
//     augmented 2nds (soft).
// SATB.voice(symbols, keyTonicPc, opts) -> [ {s,a,t,b} | null ]  (midi per chord; null = rest)

(function (global) {
  var ROOTPC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  // ranges (midi): S C4–A5, A G3–D5, T C3–G4, B E2–D4
  var RANGE = { s:[60,81], a:[55,74], t:[48,67], b:[40,62] };

  function rootPc(sym){ var m = /^([A-G])([#b]*)/.exec(sym || ""); if (!m) return null;
    var pc = ROOTPC[m[1]]; for (var i=0;i<m[2].length;i++) pc += (m[2][i]==="#"?1:-1); return ((pc%12)+12)%12; }
  function quality(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,"");
    if (/^(m7b5|ø|dim|°|o(?![a-z]))/i.test(s)) return "dim";
    if (/^(aug|\+)/.test(s)) return "aug";
    if (/^m(?!aj)/.test(s)) return "min";
    return "maj"; }
  function has7(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,""); return /7/.test(s) && !/6/.test(s); }

  // parse one chord symbol into pitch-class roles
  function parse(sym){
    var r = rootPc(sym); if (r == null) return null;
    var q = quality(sym);
    var third = (r + (q === "min" || q === "dim" ? 3 : 4)) % 12;
    var fifth = (r + (q === "dim" ? 6 : q === "aug" ? 8 : 7)) % 12;
    var seventh = has7(sym) ? (r + (q === "maj" && /maj7|M7|Δ/.test(sym) ? 11 : 10)) % 12 : null;
    var bass = r; var sl = /\/([A-G][#b]*)/.exec(sym); if (sl){ var bp = rootPc(sl[1]); if (bp != null) bass = bp; }
    return { root:r, third:third, fifth:fifth, seventh:seventh, bass:bass, q:q,
             pcs: seventh == null ? [r,third,fifth] : [r,third,fifth,seventh] };
  }

  var inRange = function (m, v){ return m >= RANGE[v][0] && m <= RANGE[v][1]; };
  function midisFor(pc, lo, hi){ var out = []; for (var m=lo;m<=hi;m++) if (((m%12)+12)%12 === pc) out.push(m); return out; }

  // the upper-3 pitch-class multisets to try, with a doubling penalty each
  function doublings(ch){
    var R=ch.root, T=ch.third, F=ch.fifth, S=ch.seventh, out=[];
    if (S != null){                                   // 7th chord: prefer all four tones
      out.push({ pcs:[T,F,S], pen:0 });               // complete (bass=root)
      out.push({ pcs:[R,T,S], pen:8 });               // omit 5th, root doubled
    } else if (ch.q === "dim"){
      out.push({ pcs:[T,F,T], pen:0 });               // double the third (3rd in upper) — bass=root
      out.push({ pcs:[R,T,F], pen:6 });
    } else {
      out.push({ pcs:[R,T,F], pen:0 });               // double root (with bass=root)
      out.push({ pcs:[R,R,T], pen:10 });              // omit 5th, triple root
      out.push({ pcs:[T,F,F], pen:14 });              // double fifth
      out.push({ pcs:[R,T,T], pen:26 });              // double third (discouraged)
    }
    return out;
  }

  // all valid {s,a,t,b} candidates for a chord
  function candidates(ch, keyPc){
    var LT = (keyPc + 11) % 12, cands = [];
    var bassOpts = midisFor(ch.bass, RANGE.b[0], RANGE.b[1]);
    doublings(ch).forEach(function (d){
      // octave choices for each of the 3 upper pcs across the combined upper range
      var lo = RANGE.t[0], hi = RANGE.s[1];
      var c0 = midisFor(d.pcs[0], lo, hi), c1 = midisFor(d.pcs[1], lo, hi), c2 = midisFor(d.pcs[2], lo, hi);
      for (var i=0;i<c0.length;i++) for (var j=0;j<c1.length;j++) for (var k=0;k<c2.length;k++){
        var tri = [c0[i], c1[j], c2[k]].sort(function (a,b){ return b - a; });   // S,A,T high→low
        var s = tri[0], a = tri[1], t = tri[2];
        if (!inRange(s,"s") || !inRange(a,"a") || !inRange(t,"t")) continue;
        if (s - a > 12 || a - t > 12) continue;                                  // upper spacing ≤ 8ve
        if (s < a || a < t) continue;                                            // no crossing among uppers
        for (var bi=0; bi<bassOpts.length; bi++){
          var b = bassOpts[bi]; if (t < b) continue;                             // no T–B crossing
          if (t - b > 24) continue;                                              // keep T–B sane
          // never double the leading tone
          var ltCount = [s,a,t,b].filter(function (m){ return ((m%12)+12)%12 === LT; }).length;
          if (ltCount > 1) continue;
          cands.push({ s:s, a:a, t:t, b:b, pen:d.pen });
        }
      }
    });
    return cands;
  }

  // seed cost for the first chord: compact, soprano centered, doubling
  function seedCost(v){ return v.pen + (v.s - v.t) * 0.4 + Math.abs(v.s - 69) * 0.6; }

  function ic(a,b){ return Math.abs(a - b) % 12; }
  function sign(x){ return x > 0 ? 1 : x < 0 ? -1 : 0; }

  // transition cost prev -> cur, given the chords (for LT / 7th resolution)
  function transCost(prev, cur, prevCh, curCh, keyPc){
    var voices = ["s","a","t","b"], cost = cur.pen;
    // smoothness (upper voices weighted; bass leaps are fine in root position)
    cost += (Math.abs(cur.s-prev.s) + Math.abs(cur.a-prev.a) + Math.abs(cur.t-prev.t)) + Math.abs(cur.b-prev.b) * 0.25;
    // parallels / consecutives of P5, P8/unison between any pair (both voices moving)
    for (var i=0;i<4;i++) for (var j=i+1;j<4;j++){
      var pi=prev[voices[i]], pj=prev[voices[j]], ci=cur[voices[i]], cj=cur[voices[j]];
      if (pi===ci || pj===cj) continue;                       // a common tone → not parallel
      var a1=ic(pi,pj), a2=ic(ci,cj);
      if ((a1===7 && a2===7) || (a1===0 && a2===0)) cost += 120;            // ‖5 or ‖8/unison
    }
    // overlap (a voice moves above where its upper neighbour just was, or below lower)
    if (cur.s < prev.a || cur.a > prev.s) cost += 18;
    if (cur.a < prev.t || cur.t > prev.a) cost += 18;
    if (cur.t < prev.b || cur.b > prev.t) cost += 18;
    // leading-tone resolution: a voice on the LT, when moving to the tonic chord, should rise to do
    var LT=(keyPc+11)%12, TONIC=keyPc;
    voices.forEach(function (v){
      if (((prev[v]%12)+12)%12 === LT && curCh.root === TONIC){
        if (((cur[v]%12)+12)%12 !== TONIC) cost += (v==="s" ? 60 : 12);       // strict in soprano
      }
    });
    // chord-7th resolution: the 7th should fall by step
    if (prevCh.seventh != null){
      voices.forEach(function (v){
        if (((prev[v]%12)+12)%12 === prevCh.seventh){
          var d = cur[v] - prev[v];
          if (!(d <= 0 && d >= -2)) cost += 25;                               // not a downward step
        }
      });
    }
    // direct (hidden) 5th/8ve into the outer voices by similar motion with a soprano leap
    var so=ic(cur.s,cur.b);
    if ((so===7 || so===0) && sign(cur.s-prev.s)===sign(cur.b-prev.b) && Math.abs(cur.s-prev.s) > 2) cost += 8;
    // melodic augmented 2nd in any upper voice (soft)
    voices.forEach(function (v){ if (v!=="b" && ic(cur[v],prev[v])===3 && Math.abs(cur[v]-prev[v])===3) cost += 6; });
    return cost;
  }

  function voice(symbols, keyPc, opts){
    keyPc = ((keyPc % 12) + 12) % 12;
    var out = [], prev = null, prevCh = null;
    symbols.forEach(function (sym){
      var ch = sym ? parse(sym) : null;
      if (!ch){ out.push(null); return; }                    // rest — keep prev for continuity
      var cands = candidates(ch, keyPc);
      if (!cands.length){ out.push(prev); return; }          // (shouldn't happen) hold previous
      var best = null, bestCost = Infinity;
      cands.forEach(function (c){
        var cost = prev ? transCost(prev, c, prevCh, ch, keyPc) : seedCost(c);
        if (cost < bestCost){ bestCost = cost; best = c; }
      });
      out.push(best); prev = best; prevCh = ch;
    });
    return out;
  }

  global.SATB = { voice: voice, parse: parse, RANGE: RANGE };
})(typeof window !== "undefined" ? window : globalThis);
