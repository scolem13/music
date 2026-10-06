const fs=require("fs");const {launch}=require("./cdp.js");const H=fs.readFileSync("helpers.js","utf8"),wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{for(const f of ["head","chord-sheet"]){const b=await launch();try{const u="http://127.0.0.1:8320/__c/"+f+".html";await b.goto(u);await b.eval("localStorage.clear()");await b.goto(u);await b.eval(H);
 await b.eval(`__t.setChords("C6 Am Cmaj9 G13 F7")`);await wait(400);
 for(const st of ["standard","shell"]){await b.eval(`__t.setStyle('keyboard','${st}')`);await wait(300);
  console.log(f,st,JSON.stringify((await b.eval("__t.cards('Keyboard')")).map(c=>[c.midis.join("."),c.options.length,c.labels.length])))}
}finally{await b.close()}}})();
