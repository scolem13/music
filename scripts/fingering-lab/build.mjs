// node scripts/fingering-lab/build.mjs [out.html]
// Builds the Melody Fingering Lab artifact (https://claude.ai/artifact/SdAdM64r8QepPXyMmGBZwN): lab.html with
// apps/shared/piano-fingering.js and under-notes.js inlined at /*MODULES*/, so the lab and the site share one code.
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, "../..");
const mods = ["apps/shared/piano-fingering.js", "apps/shared/under-notes.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const out = process.argv[2] || path.join(here, "fingering-lab.html");
fs.writeFileSync(out, fs.readFileSync(path.join(here, "lab.html"), "utf8").replace("/*MODULES*/", () => mods));
console.log("wrote " + out);
