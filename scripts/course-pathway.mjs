#!/usr/bin/env node
// The skill sequence and rubric progression in "Task Sheets — Steps and Decisions.org" ->
// apps/shared/course/pathway.json, read by course/pathway.qmd. The org file stays the one place the
// sequence is written; re-run this after changing it.
//   node scripts/course-pathway.mjs [path/to/org]     (default: ~/Documents/Task Sheets/...)
// Read from the org file:
//   "** The sequence at a glance"            unit rows, one short label per strand
//   "** MYP1 — ...", "** MYP4 Unit 1 — ..."  "- Ai, new :: ..." / "- Bii, adds :: ..." lines, plus Top band / Note lines
//   "** The checklist for the practice run"  every skill with the unit that first teaches it
//   "** Summary chart: the top band ..."     top band per strand at Year 1 / 3 / 5
//   "** What is new at each transition"      what changes at Year 3 and Year 5
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || path.join(os.homedir(), 'Documents/Task Sheets/Task Sheets — Steps and Decisions.org');
const OUT = path.join(ROOT, 'apps/shared/course/pathway.json');
const STRANDS = ['Ai', 'Aii', 'Bi', 'Bii', 'C', 'Di', 'Dii'];

const org = fs.readFileSync(SRC, 'utf8');
function section(title) {   // body of a "** title" heading, up to the next heading of level 1 or 2
  const i = org.search(new RegExp('^\\*\\* ' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm'));
  if (i < 0) throw new Error('No section "' + title + '" in ' + SRC);
  const rest = org.slice(i).replace(/^.*\n/, '');
  const j = rest.search(/^\*{1,2} /m);
  return j < 0 ? rest : rest.slice(0, j);
}
const rows = body => body.split('\n').filter(l => /^\|/.test(l) && !/^\|-/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
const cleanCell = c => (c === '—' || c === '-' || c === '') ? null : c;
// "MYP4.1 Blues to Jazz" / "MYP4 Unit 1" / "MYP4.1" -> "myp4.1"
const unitId = s => { const m = s.match(/MYP\s*(\d)(?:\.(\d)| Unit (\d))?/); return m ? 'myp' + m[1] + ((m[2] || m[3]) ? '.' + (m[2] || m[3]) : '') : null; };

// 1. units and their one-line labels
const glance = rows(section('The sequence at a glance'));
const head = glance.shift();
if (head.slice(1).join() !== STRANDS.join()) throw new Error('Sequence table columns changed: ' + head.join(', '));
const units = glance.map(r => ({ id: unitId(r[0]), label: r[0], name: r[0].replace(/^MYP\d(\.\d)?\s*/, ''),
  year: +r[0].match(/MYP(\d)/)[1], short: Object.fromEntries(STRANDS.map((s, i) => [s, cleanCell(r[i + 1])])), detail: {}, notes: [] }));
const byId = Object.fromEntries(units.map(u => [u.id, u]));

// 2. per-unit detail: "** MYP2 — Symphonic Pop (Year 3 rubric)" or "** MYP4 Unit 1 — From Blues to Jazz (Year 5 rubric): ..."
// Only the first sequence (the headings at level 2); the "steeper catch-up ramp" alternative is level 3 and is left out.
for (const m of org.matchAll(/^\*\* (MYP\d(?: Unit \d)?) — (.+?)(?: \(Year (\d) rubric\).*|: .*)?\n([\s\S]*?)(?=^\*{1,2} )/gm)) {
  const u = byId[unitId(m[1])];
  if (!u) throw new Error('Unit heading with no row in the sequence table: ' + m[1]);
  u.title = m[2]; u.rubric = m[3] ? +m[3] : (u.year === 1 ? 1 : u.year <= 3 ? 3 : 5);
  for (const l of m[4].matchAll(/^- (.+?) :: (.+)$/gm)) {
    const k = l[1].match(/^(Ai|Aii|Bi|Bii|C|Di|Dii), (new|adds)$/);
    if (k) u.detail[k[1]] = { kind: k[2], text: l[2] };
    else u.notes.push({ label: l[1], text: l[2] });
  }
  if (!Object.keys(u.detail).length) u.fullRun = [...m[4].matchAll(/^- ([^:\n][^\n]*)$/gm)].map(x => x[1]);   // the practice run: plain bullets
}
const missing = units.filter(u => !u.rubric).map(u => u.id);
if (missing.length) throw new Error('No detail section for ' + missing.join(', '));

// 3. the checklist: each skill tagged with the unit that first teaches it
const checklist = [];
let task = null;
for (const l of section('The checklist for the practice run').split('\n')) {
  const t = l.match(/^- Task (\d), (\w+)/);
  if (t) { task = { task: +t[1], strand: t[2] }; continue; }
  const c = l.match(/^\s+- \[.\] (.+) \((MYP[\d.]+)\)\s*$/);
  if (c && task) checklist.push({ ...task, id: task.strand + '-' + checklist.filter(x => x.strand === task.strand).length, text: c[1], unit: unitId(c[2]) });
}
for (const c of checklist) if (!byId[c.unit]) throw new Error('Checklist item names an unknown unit: ' + c.text);

// 4. the rubric: top band per stage, and what is new at each step up
const top = rows(section('Summary chart: the top band (7–8) at each stage')); top.shift();
const trans = rows(section('What is new at each transition')); trans.shift();
const rubric = Object.fromEntries(STRANDS.map(s => {
  const a = top.find(r => r[0] === s), b = trans.find(r => r[0] === s);
  if (!a || !b) throw new Error('Rubric tables have no row for ' + s);
  const same = (v, prev) => /^same/i.test(v) ? prev : v;
  const y1 = a[1], y3 = same(a[2], y1), y5 = same(a[3], y3);
  return [s, { top: { 1: y1, 3: y3, 5: y5 }, newAt: { 3: b[2], 5: b[3] } }];
}));
const pattern = (section('The pattern').trim().split('\n\n')[0] || '').replace(/\s+/g, ' ');

const data = { generated: 'scripts/course-pathway.mjs from ' + path.basename(SRC), strands: STRANDS, units, checklist, rubric, pattern,
  rubricStage: { myp1: 1, myp2: 3, myp3: 3, myp4: 5, myp5: 5 } };
fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
console.log(`${units.length} units, ${checklist.length} checklist skills -> ${path.relative(ROOT, OUT)}`);
