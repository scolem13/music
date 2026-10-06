const fs = require("fs"), vm = require("vm"), assert = require("assert"), path = require("path");
const { launch } = require("./cdp.js");
vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/voicings.js", "utf8"));
const CV = ChordVoicings, mod12 = n => ((n % 12) + 12) % 12, BASE = "http://127.0.0.1:8310/__c/";
const SHOTS = path.join(__dirname, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const HELPERS = `window.__t = {
  setChords(str){ const ta=document.getElementById('chords-textarea'); ta.value=str; ta.dispatchEvent(new Event('blur')); },
  enable(id,on){ const cb=document.querySelector('[data-inst-id="'+id+'"]'); if(cb.checked!==on){ cb.checked=on; cb.dispatchEvent(new Event('change',{bubbles:true})); } },
  row(id){ return document.querySelector('[data-inst-id="'+id+'"]').closest('.inst-row'); },
  sels(id){ return [...this.row(id).querySelectorAll('select.tuning-sel')]; },
  styleSel(id){ const s=this.sels(id); return s[s.length-1]; },
  styles(id){ return [...this.styleSel(id).options].map(o=>({id:o.value,label:o.textContent,group:o.parentNode.tagName==='OPTGROUP'?o.parentNode.label:null})); },
  setStyle(id,v){ const s=this.styleSel(id); s.value=v; if(s.value!==v) return false; s.dispatchEvent(new Event('change',{bubbles:true})); return true; },
  setTuning(id,v){ const s=this.sels(id)[0]; s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); },
  check(id,on){ const el=document.getElementById(id); if(el.checked!==on){ el.checked=on; el.dispatchEvent(new Event('change',{bubbles:true})); } },
  section(name){ return [...document.querySelectorAll('.inst-section')].find(s=>s.querySelector('h3').textContent===name); },
  cardEls(name){ const sec=this.section(name); return sec?[...sec.querySelectorAll('.diagram-card')]:[]; },
  read(card){ const sel=card.querySelector('select.voicing-sel'); const t=card.querySelector('svg title');
    return { title:t?t.textContent:null, unavail:!!card.querySelector('.diagram-unavail'), midis:card._midis?card._midis.slice():null,
      options:sel?[...sel.options].map(o=>o.textContent):[], selected:sel?sel.selectedIndex:0,
      x:[...card.querySelectorAll('svg text')].filter(e=>e.textContent==='X').length,
      labels:[...card.querySelectorAll('svg text.note-marker')].map(e=>e.textContent), fingers:[...card.querySelectorAll('svg text')].filter(e=>/^[1-5]$/.test(e.textContent)).length }; },
  cards(name){ return this.cardEls(name).map(c=>this.read(c)); },
  // every option of every card's picker -> the notes it sounds (selection restored afterwards)
  sweep(name){ return this.cardEls(name).map(card=>{ const sel=card.querySelector('select.voicing-sel'); if(!sel) return [card._midis?card._midis.slice():null];
    const keep=sel.selectedIndex, out=[]; for(let i=0;i<sel.options.length;i++){ sel.selectedIndex=i; sel.dispatchEvent(new Event('change',{bubbles:true})); out.push(card._midis.slice()); }
    sel.selectedIndex=keep; sel.dispatchEvent(new Event('change',{bubbles:true})); return out; }); }
};`;
const CH = { Dm7:{ root:2, intervals:[0,3,7,10] }, G7:{ root:7, intervals:[0,4,7,10] }, Cmaj7:{ root:0, intervals:[0,4,7,11] }, A7:{ root:9, intervals:[0,4,7,10] },
             C:{ root:0, intervals:[0,4,7] }, Am:{ root:9, intervals:[0,3,7] }, F6:{ root:5, intervals:[0,4,7,9] }, Bdim:{ root:11, intervals:[0,3,6] } };
const PROG = ["Dm7","G7","Cmaj7","A7"], PROG2 = ["C","Am","F6","G7","Bdim","Dm7"];
const pcs = m => [...new Set(m.map(mod12))].sort((a,b)=>a-b).join(",");
const want = c => pcs(c.intervals.map(i => c.root + i));
const STD = [40,45,50,55,59,64];
const report = { errors:[], styles:{}, checks:0, results:{} };
const ok = (c, msg) => { report.checks++; assert(c, msg); };

(async () => {
  const b = await launch();
  try {
    await b.goto(BASE + "chord-sheet.html"); await b.eval("localStorage.clear()"); await b.goto(BASE + "chord-sheet.html");
    await b.eval(HELPERS);
    ok(await b.eval("!!window.ChordVoicings"), "library loaded");
    await b.eval(`__t.setChords(${JSON.stringify(PROG.join(" "))}); __t.enable('guitar', true)`); await wait(450);
    report.styles.keyboard = await b.eval("__t.styles('keyboard')"); report.styles.guitar = await b.eval("__t.styles('guitar')");
    ok(report.styles.keyboard.map(s => s.id).join() === "standard,shell,drop2,drop3", "keyboard menu");
    ok(report.styles.guitar.map(s => s.id).join() === "standard,shell,drop2,drop3,set3:all,set3:0,set3:1,set3:2,set3:3", "guitar menu " + report.styles.guitar.map(s => s.id));

    // ---- keyboard: Drop 2 / Drop 3 ----
    for (const style of ["drop2", "drop3"]){
      ok(await b.eval(`__t.setStyle('keyboard','${style}')`), "set kb style"); await wait(400);
      const cards = await b.eval("__t.cards('Keyboard')"), sweep = await b.eval("__t.sweep('Keyboard')");
      ok(cards.length === 4, "4 keyboard cards");
      cards.forEach((c, i) => { const ch = CH[PROG[i]], lib = CV.piano(ch, style, { lo:36, hi:96, center:60 });
        ok(!c.unavail && c.options.length === 4, `${PROG[i]} ${style}: 4 inversions in the picker (${c.options})`);
        ok(c.options.join("|") === lib.map(v => v.label).join("|"), "picker labels = library labels");
        ok(pcs(c.midis) === want(ch) && c.midis.length === 4, `${PROG[i]} ${style}: sounds all four chord tones`);
        ok(c.labels.length === 4, "four note markers drawn");
        sweep[i].forEach((m, k) => ok(m.join() === lib[k].midis.join(), `${PROG[i]} ${style} option ${k} = library voicing`)); });
      report.results["keyboard/" + style] = cards.map((c, i) => PROG[i] + ": " + c.options.join(" / "));
      await b.shot(path.join(SHOTS, `keyboard-${style}.png`), "#sheet-output");
    }
    // fingerings + two-hand on a drop voicing, octave/voice-leading on
    await b.eval("__t.check('chk-fingerings', true); const h=document.getElementById('sel-hand-mode'); h.value='two-hand'; h.dispatchEvent(new Event('change',{bubbles:true}));"); await wait(400);
    let kc = await b.eval("__t.cards('Keyboard')"); ok(kc.every(c => c.fingers >= 4), "fingerings drawn on drop voicings: " + kc.map(c => c.fingers));
    await b.shot(path.join(SHOTS, "keyboard-drop3-fingerings-twohand.png"), "#sheet-output");
    await b.eval("__t.check('chk-voice-leading', true)"); await wait(400);
    kc = await b.eval("__t.cards('Keyboard')");
    { // tool's VL = least motion over inversion x octave; verify each step is a minimum
      let prev = null, lead = [];
      kc.forEach((c, i) => { const lib = CV.piano(CH[PROG[i]], "drop3", { lo:36, hi:96, center:60 });
        if (prev){ let best = Infinity; lib.forEach(v => { for (let o = -2; o <= 2; o++) best = Math.min(best, CV.motion(prev, v.midis.map(m => m + 12*o))); });
          ok(Math.abs(CV.motion(prev, c.midis) - best) < 1e-9, `${PROG[i]} keyboard voice leading is minimal (${CV.motion(prev, c.midis)} vs ${best})`); lead.push(CV.motion(prev, c.midis)); }
        prev = c.midis; });
      report.results["keyboard/drop3 voice-led motion"] = lead;
    }
    await b.shot(path.join(SHOTS, "keyboard-drop3-voiceled.png"), "#sheet-output");
    await b.eval("__t.check('chk-voice-leading', false); __t.check('chk-fingerings', false); __t.enable('keyboard', false)"); await wait(400);

    // ---- guitar: every library style ----
    const libFor = (ch, style) => style.startsWith("set3:")
      ? CV.guitar(ch, "shell3", style === "set3:all" ? { tuning:STD } : { tuning:STD, stringSets:[[3 - +style.slice(5), 4 - +style.slice(5), 5 - +style.slice(5)]] })
      : CV.guitar(ch, style, { tuning:STD });
    for (const prog of [PROG, PROG2]){
      await b.eval(`__t.setChords(${JSON.stringify(prog.join(" "))})`); await wait(400);
      for (const style of ["drop2","drop3","set3:all","set3:0","set3:1","set3:2","set3:3"]){
        ok(await b.eval(`__t.setStyle('guitar','${style}')`), "set guitar style " + style); await wait(450);
        const cards = await b.eval("__t.cards('Guitar')"), sweep = await b.eval("__t.sweep('Guitar')");
        ok(cards.length === prog.length, "cards for every chord");
        const summary = [];
        cards.forEach((c, i) => { const ch = CH[prog[i]], lib = libFor(ch, style), nTones = ch.intervals.length;
          ok(!c.unavail, `${prog[i]} ${style}: no "no voicing found"`);
          ok(c.options.length === lib.length && c.options.join("|") === lib.map(v => v.label).join("|"), `${prog[i]} ${style}: picker lists the library shapes (${c.options.length} vs ${lib.length})`);
          sweep[i].forEach((m, k) => { ok(m.slice().sort((x,y)=>x-y).join() === lib[k].midis.join(), `${prog[i]} ${style} option ${k} sounds the library shape`);
            const expect = style.startsWith("set3:") && nTones === 4 ? pcs([ch.root, ch.root + ch.intervals[1], ch.root + ch.intervals[3]]) : want(ch);
            ok(pcs(m) === expect, `${prog[i]} ${style} option ${k}: right notes (${pcs(m)} want ${expect})`); });
          const voices = style.startsWith("set3:") ? 3 : Math.min(4, nTones);
          ok(c.labels.length === voices && c.x === 6 - voices, `${prog[i]} ${style}: ${voices} notes drawn, the rest muted (${c.labels.length}/${c.x})`);
          if (style.startsWith("set3:") && style !== "set3:all"){ const bassTones = new Set(lib.map(v => v.inversion)); ok(bassTones.size === 3, `${prog[i]} ${style}: every inversion reachable`); }
          if (style === "drop2" && nTones === 4) ok(c.options.length === 12, "drop2: 3 sets x 4 inversions");
          if (style === "drop3" && nTones === 4) ok(c.options.length === 8, "drop3: 2 sets x 4 inversions");
          summary.push(`${prog[i]}:${c.options.length}`); });
        report.results[`guitar/${style} [${prog.join(" ")}]`] = summary.join("  ") + "   e.g. " + cards[0].options.slice(0, 3).join(" | ");
        if (prog === PROG) await b.shot(path.join(SHOTS, `guitar-${style.replace(":", "-")}.png`), "#sheet-output");
        if (prog === PROG2 && style === "set3:1") await b.shot(path.join(SHOTS, "guitar-set3-1-triads.png"), "#sheet-output");
      }
    }
    // voice leading + fingerings on guitar drop2 and a three-string set
    await b.eval(`__t.setChords(${JSON.stringify(PROG.join(" "))}); __t.check('chk-voice-leading', true); __t.check('chk-fingerings', true)`); await wait(300);
    for (const style of ["drop2", "set3:1", "set3:all"]){
      await b.eval(`__t.setStyle('guitar','${style}')`); await wait(450);
      const cards = await b.eval("__t.cards('Guitar')"); let prev = null, lead = [];
      cards.forEach((c, i) => { const lib = libFor(CH[PROG[i]], style);
        if (prev){ const best = Math.min(...lib.map(v => CV.motion(prev, v.midis))); ok(Math.abs(CV.motion(prev, c.midis) - best) < 1e-9, `${PROG[i]} ${style}: guitar voice leading minimal`); lead.push(CV.motion(prev, c.midis)); }
        ok(c.fingers >= 1, "fingerings drawn"); prev = c.midis; });
      report.results[`guitar/${style} voice-led`] = cards.map((c, i) => PROG[i] + " → " + c.options[c.selected]).join("; ") + "  motion " + lead.join(",");
      await b.shot(path.join(SHOTS, `guitar-${style.replace(":", "-")}-voiceled-fingerings.png`), "#sheet-output");
    }
    await b.eval("__t.check('chk-voice-leading', false); __t.check('chk-fingerings', false)");

    // ---- every instrument: menus per tuning, nothing throws, count unavailable cards ----
    await b.eval(`document.getElementById('btn-inst-all').click(); __t.setChords("C Am7 F6 G7 Bdim7 E7#9 Dm9 Cmaj7 Asus4 Bb13 D5")`); await wait(600);
    const insts = [["guitar","Guitar"],["bass","Bass"],["ukulele","Ukulele"],["banjo","Banjo"],["mandolin","Mandolin"],["vihuela","Vihuela"]];
    report.other = {};
    for (const [id, name] of insts){
      const tunings = await b.eval(`[...__t.sels('${id}')[0].options].map(o=>o.value)`);
      for (const tn of tunings){
        await b.eval(`__t.setTuning('${id}','${tn}')`); await wait(250);
        const styles = await b.eval(`__t.styles('${id}')`), line = [];
        for (const st of styles){
          await b.eval(`__t.setStyle('${id}','${st.id}')`); await wait(420);
          const cards = await b.eval(`__t.cards('${name}')`);
          ok(cards.length === 11, name + " renders every chord card");
          line.push(`${st.id}:${cards.filter(c => c.unavail).length}`);
        }
        report.other[tn] = line.join(" ");
        await b.eval(`__t.setStyle('${id}','standard')`);
      }
      await b.eval(`__t.setTuning('${id}','${tunings[0]}')`);
    }
    // a style that the new tuning cannot play falls back to Standard
    await b.eval("__t.setTuning('ukulele','uke-baritone')"); await wait(200);
    ok(await b.eval("__t.setStyle('ukulele','drop2')"), "baritone uke offers Drop 2");
    await b.eval("__t.setTuning('ukulele','uke-standard')"); await wait(300);
    ok(await b.eval("__t.styleSel('ukulele').value") === "standard", "re-entrant uke drops back to Standard");
    await b.eval(`__t.setStyle('keyboard','drop2')`); await wait(500);
    await b.shot(path.join(SHOTS, "all-instruments.png"), "#sheet-output");

    // ---- no regression: Standard and Shell identical to the committed tool ----
    const REG = "C Am7 F6 G7 Bdim7 E7#9 Dm9 Cmaj7 Asus4 Bb13 D5 F#m7b5 Ebmaj7";
    const snap = async (file) => { await b.goto(BASE + file); await b.eval("localStorage.clear()"); await b.goto(BASE + file); await b.eval(HELPERS);
      await b.eval(`document.getElementById('btn-inst-all').click(); __t.setChords(${JSON.stringify(REG)})`); await wait(700);
      const out = {};
      for (const vl of [false, true]){ await b.eval(`__t.check('chk-voice-leading', ${vl})`); await wait(300);
        for (const st of ["standard", "shell"]){
          for (const id of ["keyboard","guitar","bass","ukulele","banjo","mandolin","vihuela"]) await b.eval(`__t.setStyle('${id}','${st}')`);
          await wait(800);
          for (const name of ["Keyboard","Guitar","Bass","Ukulele","Banjo","Mandolin","Vihuela"]){
            out[`${vl ? "VL " : ""}${st}/${name}`] = { cards: await b.eval(`__t.cards('${name}')`), sweep: await b.eval(`__t.sweep('${name}')`) }; } } }
      return out; };
    const now = await snap("chord-sheet.html"), before = await snap("chord-sheet-orig.html");
    let same = 0; for (const k of Object.keys(before)){ ok(JSON.stringify(now[k]) === JSON.stringify(before[k]), "REGRESSION in " + k); same++; }
    report.regression = `${same} instrument/style/voice-leading combinations byte-identical to HEAD (13 chords each, every picker option swept)`;
    report.errors = b.errors.filter(e => !/favicon\.ico/.test(e));   // the test server has no favicon; not the tool's
    ok(report.errors.length === 0, "console errors: " + report.errors.join(" | "));
    console.log(JSON.stringify(report, null, 1));
  } catch (e) { console.log("FAILED:", e.message, "\nconsole errors:", b.errors); process.exitCode = 1; }
  finally { await b.close(); }
})();
