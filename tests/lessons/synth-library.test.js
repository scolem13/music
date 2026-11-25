// The student patch files (apps/shared/lessons/synth-library.js validate) and the teacher's add.mjs, headless.
// node tests/lessons/synth-library.test.js   (NEG=1 must fail)
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../.."), SC = require(ROOT + "/apps/shared/lessons/synth-compare.js"), SL = require(ROOT + "/apps/shared/lessons/synth-library.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const V = o => SL.validate(o, SC.PROFILES);
const good = () => ({ kind: "synth-patch", version: 1, synth: "moog", state: { cutoff: 6, m1On: true }, song: "Flash Light", artist: "Parliament", year: "1977",
  source: { url: "https://www.youtube.com/watch?v=opQSGvPQHL0", channel: "Andy Whitmore", title: "40 Famous Songs", at: "5:56" }, by: "", notes: "", made: "2026-11-25" });
check("a good patch passes", V(good()).length === 0, V(good()).join("; "));
check("unknown synth refused", V({ ...good(), synth: "cs80" }).some(e => /unknown synth/.test(e)));
check("a key not on the synth refused", V({ ...good(), state: { aSync: true } }).some(e => /aSync/.test(e)));
check("a wrong type refused", V({ ...good(), state: { cutoff: "6" } }).some(e => /cutoff/.test(e)));
check("a non-video URL refused", V({ ...good(), source: { url: "https://example.com/x" } }).some(e => /known site/.test(e)));
check("no song refused", V({ ...good(), song: "" }).some(e => /song/.test(e)));
check("bad year refused", V({ ...good(), year: "70s" }).some(e => /year/.test(e)));
// every library file and every example's state validate
const DIR = ROOT + "/apps/shared/data/synth-patches", ix = JSON.parse(fs.readFileSync(DIR + "/index.json"));
const badLib = ix.patches.filter(p => V(JSON.parse(fs.readFileSync(DIR + "/" + p.file))).length);
check("library files all valid", ix.patches.length > 0 && badLib.length === 0, badLib.map(p => p.file).join(","));
check("seed patch is the guide's (origin manual, not checked)", ix.patches.every(p => p.origin === "manual" ? !p.checked : true));
const A = JSON.parse(fs.readFileSync(DIR + "/assignments.json")).videos;
check("assignments: known synths, YouTube URLs, songs", A.length >= 6 && A.every(v => SC.PROFILES[v.synth] && /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url) && v.channel && v.songs.length));
// add.mjs on a temp folder
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "slib-")), sf = path.join(tmp, "in.json"), bf = path.join(tmp, "bad.json"), out = path.join(tmp, "lib");
fs.mkdirSync(out); fs.writeFileSync(sf, JSON.stringify({ ...good(), checked: true, by: "Ana" })); fs.writeFileSync(bf, JSON.stringify({ ...good(), synth: "nope" }));
const run = (...a) => { try { return { code: 0, out: execFileSync("node", [ROOT + "/scripts/synth-patches/add.mjs", ...a], { env: { ...process.env, SYNTH_PATCH_DIR: out } }).toString() }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
let r = run(sf); const added = fs.readdirSync(out);
check("add.mjs copies a good file and writes the index", r.code === 0 && added.includes("moog-parliament-flash-light-ana.json") && added.includes("index.json"), added.join(","));
check("a student's own checked: true is dropped", JSON.parse(fs.readFileSync(path.join(out, "moog-parliament-flash-light-ana.json"))).checked === undefined);
r = run(bf); check("add.mjs refuses a bad file, exit 1", r.code === 1 && /REFUSED/.test(r.out));
r = run("--checked", sf); check("--checked marks it", JSON.parse(fs.readFileSync(path.join(out, "index.json"))).patches[0].checked === true);
fs.rmSync(tmp, { recursive: true });
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
