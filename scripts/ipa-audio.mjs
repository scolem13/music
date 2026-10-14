// ipa-audio.mjs — finds a Wikimedia Commons recording for each IPA symbol in apps/shared/ipa/ipa-data.js and writes
// apps/shared/ipa/ipa-audio.js: { symbol id: { file, ogg, mp3, author, license, page } }. The page plays the files
// straight from upload.wikimedia.org (nothing is copied into the repo).
//
// How: each symbol's name is the title of its English Wikipedia article ("close front unrounded vowel"); the
// recording is the audio file that article uses. Its author and licence come from Commons' file metadata.
// Run: node scripts/ipa-audio.mjs        (re-run after adding symbols; prints the ones with no recording)
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require("../apps/shared/ipa/ipa-data.js");
const UA = { "User-Agent": "everything-music-site IPA chart; personal music-practice site" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(host, params) {
  const u = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  for (let i = 0; i < 8; i++) {
    const r = await fetch(u, { headers: UA });
    if (r.ok) return r.json();
    const wait = (+r.headers.get("retry-after") || 15 * (i + 1)) * 1000;      // 429: back off as told
    console.error(`HTTP ${r.status}; waiting ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error("API failed: " + u);
}
const strip = h => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = s => s.toLowerCase().replace(/[_\-]/g, " ").replace(/\.(ogg|oga|wav|mp3|flac|webm)$/, "").trim();

// The audio files each article uses, 50 articles a request (following "continue"), best match to its own name first.
async function filesFor(titles) {
  const out = {}, back = {};
  for (let i = 0; i < titles.length; i += 50) {
    let cont = {};
    do {
      const j = await api("en.wikipedia.org", { action: "query", titles: titles.slice(i, i + 50).join("|"), prop: "images", imlimit: "max", redirects: "1", ...cont });
      // several requested titles can lead to one article ("Voiced dental plosive", "Voiced alveolar plosive")
      const norm2 = {}, froms = {};
      (j.query.normalized || []).forEach(r => { norm2[r.to] = r.from; });
      (j.query.redirects || []).forEach(r => { (froms[r.to] = froms[r.to] || []).push(r.from); });
      (j.query.pages || []).forEach(p => {
        const imgs = (p.images || []).map(x => x.title).filter(t => /\.(ogg|oga|wav|mp3|flac)$/i.test(t));
        [p.title].concat(froms[p.title] || []).forEach(t => { const key = norm2[t] || t; (out[key] = out[key] || []).push(...imgs); });
      });
      cont = j.continue || null;
      await sleep(1000);
    } while (cont);
  }
  for (const k in out) { const want = norm(k); out[k].sort((a, b) => (norm(b.replace(/^File:/, "")) === want) - (norm(a.replace(/^File:/, "")) === want)); }
  return out;
}
async function info(files) {
  const j = await api("commons.wikimedia.org", { action: "query", titles: files.join("|"), prop: "imageinfo", iiprop: "url|extmetadata|mime", redirects: "1" });
  const out = {};
  (j.query.pages || []).forEach(p => {
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii) return;
    ii.url = ii.url.split("?")[0];                                            // drop Commons' utm_ tracking parameters
    const m = ii.extmetadata || {};
    // Commons transcodes .ogg to .mp3 at a predictable path, for browsers (older Safari) without Ogg Vorbis
    const mp3 = /\.(ogg|oga|wav|flac)$/i.test(ii.url) ? ii.url.replace("/wikipedia/commons/", "/wikipedia/commons/transcoded/") + "/" + ii.url.split("/").pop() + ".mp3" : ii.url;
    out[p.title] = { file: p.title.replace(/^File:/, ""), src: ii.url, mp3, page: ii.descriptionurl,
      author: strip(m.Artist && m.Artist.value).replace(/^No machine-readable author provided\.\s*(.*?) assumed.*$/, "$1") || "unknown", license: strip(m.LicenseShortName && m.LicenseShortName.value) || "see file page" };
  });
  return out;
}

const result = {}, missing = [], seen = new Set(), titleOf = {};
D.SYMBOLS.forEach(s => {
  if (seen.has(s.id)) return; seen.add(s.id);
  const t = s.name.replace(/\s*\(.*\)\s*$/, "").replace(/\s*\/.*$/, "");                                  // "mid central vowel (schwa)"
  titleOf[s.id] = t.charAt(0).toUpperCase() + t.slice(1);
});
const files = await filesFor([...new Set(Object.values(titleOf))]);
const firsts = {};
// Only a recording of the sound itself. An article's other audio files are example words, often in another language,
// and would mislead; the sound's own file is named after it, with some variation ("Voiced alveolar plosive.ogg",
// "Voiceless alveolar sibilant.ogg", "PR-open-mid back rounded vowel.ogg"). So: every word of the sound's name must be
// in the file's name (after synonyms), and the file must not be a word recording ("De-Lüge.ogg", "LL-Q150 (fra)-…").
const SYN = { "labio-dental": "labiodental", stop: "plosive", sibilant: "fricative", postalveolar: "post-alveolar", "palato-alveolar": "post-alveolar", "palatoalveolar": "post-alveolar",
  "labio-velar": "labial-velar", "labiovelar": "labial-velar", "labial–velar": "labial-velar", "–": "-" };
const words = t => t.toLowerCase().replace(/^file:/, "").replace(/\.(ogg|oga|wav|mp3|flac)$/, "").replace(/^pr-/, "").replace(/[_]/g, " ").replace(/–/g, "-")
  .split(/[\s,()/]+/).filter(Boolean).map(w => SYN[w] || w);
const isWord = t => /^File:(LL-|[A-Z][a-z]{1,2}(-[a-z]{2,})?-)/.test(t) && !/^File:PR-/.test(t);
for (const id in titleOf) {
  const want = words(titleOf[id]).filter(w => w !== "and"), cands = (files[titleOf[id]] || []).filter(t => !isWord(t)).filter(t => {
    const have = words(t), w = new Set(want);
    // and no word that makes it a different sound ("Mid central rounded vowel" is not the schwa)
    return want.every(x => have.includes(x)) && !have.some(x => /^(rounded|unrounded|nasal|voiceless|labialized|labialised|pharyngealized)$/.test(x) && !w.has(x))
      && !(have.includes("voiced") && w.has("voiceless"));                 // nasals and approximants are voiced anyway
  }).sort((a, b) => a.length - b.length);
  if (cands.length) firsts[id] = cands[0]; else missing.push(`${id}  (${titleOf[id]})`);
}
const uniq = [...new Set(Object.values(firsts))], meta = {};
for (let i = 0; i < uniq.length; i += 50) { Object.assign(meta, await info(uniq.slice(i, i + 50))); await sleep(1000); }
for (const id in firsts) { if (meta[firsts[id]]) result[id] = meta[firsts[id]]; else missing.push(`${id}  (${firsts[id]}: no metadata)`); }
const js = `// ipa-audio.js — generated by scripts/ipa-audio.mjs; do not edit by hand. Wikimedia Commons recordings for the IPA chart,
// played from upload.wikimedia.org: { symbol id: { file, src (original), mp3 (Commons' transcode), page, author, license } }.
(function (root) {
  var A = ${JSON.stringify(result, null, 1)};
  if (typeof module !== "undefined" && module.exports) module.exports = A; else root.IPA_AUDIO = A;
})(typeof window !== "undefined" ? window : globalThis);
`;
fs.writeFileSync(new URL("../apps/shared/ipa/ipa-audio.js", import.meta.url), js);
console.log(`${Object.keys(result).length} of ${seen.size} symbols have a recording.`);
if (missing.length) console.log("No recording found:\n  " + missing.join("\n  "));
