const fs = require("fs"), path = require("path");
const { launch } = require("./cdp.js");
const BASE = "http://127.0.0.1:8320/__c/chord-sheet.html";
const wait = ms => new Promise(r => setTimeout(r, ms));
const HELPERS = fs.readFileSync(path.join(__dirname, "helpers.js"), "utf8");
async function open(opts) {
  const b = await launch(opts || {});
  await b.goto(BASE); await b.eval("localStorage.clear()"); await b.goto(BASE); await b.eval(HELPERS); return b;
}
async function clipShot(b, file, sel) {
  const r = await b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}})()`);
  const s = await b.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(s.data, "base64"));
}
module.exports = { open, clipShot, wait, BASE };
