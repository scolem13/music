const fs=require('fs');
global.window=global;
require('/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/comp.js');
require('/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/catalog.js');
const src=fs.readFileSync('/Users/sean.coleman/Projects/everything-music-site/tools/_accomp-styles.qmd','utf8');
const a=src.indexOf('var LEN ='), b=src.indexOf('window.asHitsToAbc');
const f=new Function(src.slice(a,b)+';return hitsToAbc;')();
for(const e of BandCatalog.comp){ if(!e.hits) continue;
  const abc=f(e.hits); const body=abc.split('\n')[4].replace(/\|\]/,'');
  let tot=0; body.replace(/-/g,' ').trim().split(/\s+/).forEach(t=>{const m=t.match(/^[Bz](\d*)$/); if(!m) throw 'bad '+t; tot+=m[1]?+m[1]:1;});
  console.log(e.id,body.trim(),tot, tot===8?'OK':'FAIL');}
