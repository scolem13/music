window.__t = {
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
};
Object.assign(window.__t, {
  notation(name){ return this.cardEls(name).map(c=>{ const w=c.querySelector('.notation-wrap'); const s=w&&w.querySelector('svg');
    return { wrap:!!w, svg:!!s, heads:s?s.querySelectorAll('.abcjs-notehead').length:0, sig:s?s.innerHTML.length+':'+[...s.querySelectorAll('.abcjs-notehead')].map(n=>Math.round(n.getBoundingClientRect().top)).join(','):'', cap:w&&w.querySelector('.notation-cap')?w.querySelector('.notation-cap').textContent:'', w:w?Math.round(w.getBoundingClientRect().width):0, cardW:Math.round(c.getBoundingClientRect().width) }; }); },
  pick(name,i,k){ const c=this.cardEls(name)[i]; const s=c.querySelector('select.voicing-sel'); s.selectedIndex=k; s.dispatchEvent(new Event('change',{bubbles:true})); },
  titles(){ return [...document.querySelectorAll('#sheet-output .diagram-card svg title')].map(t=>t.textContent); },
  chips(){ return [...document.querySelectorAll('#chords-chips .chord-chip > span')].map(t=>t.textContent); },
  setKey(pc){ const s=document.getElementById('sel-key'); s.value=String(pc); s.dispatchEvent(new Event('change',{bubbles:true})); },
  select(id,v){ const s=document.getElementById(id); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); }
});
