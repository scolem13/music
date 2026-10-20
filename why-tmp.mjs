import fs from "node:fs";import vm from "node:vm";
const src=fs.readFileSync("scripts/clean-rough-themes.mjs","utf8");
const code=src.slice(src.indexOf("// ---- key signatures"),src.indexOf("// ---- run ----"));
const g={console,Math,JSON};g.window=g;g.self=g;vm.createContext(g);
for(const f of ["apps/shared/abcjs-basic.js","apps/shared/abc-core.js","apps/tune-assessment/abc-tune.js"])vm.runInContext(fs.readFileSync(f,"utf8"),g);
vm.runInContext(code+";this.fixTiedTuplets=fixTiedTuplets;this.tokenize=tokenize;this.barLen=barLen;this.meterInfo=meterInfo;",g);
const id=process.argv[2];const old=fs.readFileSync("../classical-music-themes/abcs/"+id+".abc","utf8");
const h=k=>((old.match(new RegExp("^"+k+":\\s*(.*)$","m"))||[])[1]||"").replace(/\s*%.*$/,"").trim();
const body=old.slice(old.search(/^K:.*$/m)).replace(/^K:.*\n?/,"").trim();
console.log(h("M"));const bars=body.replace(/\\\n/g," ").split("|");for(const b of bars){const t=g.tokenize(b.trim());if(t&&t.length)console.log(JSON.stringify(b.trim()),g.barLen(t,g.meterInfo(h("M")),0.25).toFixed(3))}
console.log(JSON.stringify(g.fixTiedTuplets(body,h("M"),h("L"))));
