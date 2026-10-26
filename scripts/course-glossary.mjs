#!/usr/bin/env node
// course/glossary.org -> apps/shared/course/glossary.json (read by course/glossary.qmd and,
// through scripts in Learning-Experiences, by the class site). Format: the header of the org file.
//   node scripts/course-glossary.mjs           build, stop on any broken link or unknown key
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'course/glossary.org');
const OUT = path.join(ROOT, 'apps/shared/course/glossary.json');

// Short keys for sources cited many times. Full MLA entries are in scripts/sources/course.py.
const DP = 'IB, *Music Guide* (first assessment 2022)';
export const SOURCE_KEYS = {
  'myp-arts-guide': { label: 'IB, *MYP Arts Guide* (for use from September 2022/January 2023)' },
  'task-sheets': { label: 'Course notes: task sheets and the skill sequence (Sean Coleman, 2026)' },
  'tok-site': { label: 'TOK course glossary (Sean Coleman)', url: 'https://tok.seancoleman.org/resources/glossary.html' },
  'gordon-lsm': { label: 'Gordon, *Learning Sequences in Music* (2012 ed.)' },
  ...Object.fromEntries([9, 23, 24, 25, 37, 42, 43, 71, 72, 73].map(p => [`dp-guide-${p}`, { label: `${DP}, p. ${p}` }])),
  site: { label: 'Question written for this site' },
};
export const TOK_CONCEPTS = ['evidence', 'certainty', 'truth', 'interpretation', 'power', 'justification',
  'explanation', 'objectivity', 'perspective', 'culture', 'values', 'responsibility'];
const LEVELS = ['myp1', 'myp2', 'myp3', 'myp4', 'myp5', 'dp'];

const slugify = s => s.toLowerCase().replace(/[/()°'"\\]/g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// org inline markup -> HTML: [[url][label]], *bold*, /italic/
function inline(s) {
  return esc(s)
    .replace(/\[\[\*([^\]]+)\]\[([^\]]+)\]\]/g, (_, t, l) => `<a href="#${slugify(t)}">${l}</a>`)
    .replace(/\[\[([^\]]+)\]\[([^\]]+)\]\]/g, (_, u, l) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${l}</a>`)
    .replace(/(^|[\s(“"])\*([^*\n]+?)\*(?=[\s.,;:)”"]|$)/g, '$1<strong>$2</strong>')
    .replace(/(^|[\s(“"])\/([^/\n]+?)\/(?=[\s.,;:)”"]|$)/g, '$1<em>$2</em>');
}
const paras = body => body.trim() ? body.trim().split(/\n\s*\n/).map(p => `<p>${inline(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('') : '';

const text = fs.readFileSync(SRC, 'utf8');
const errors = [];
const terms = [], groups = [], tok = new Map();
let group = null;
for (const block of text.split(/^(?=\*{1,2} )/m)) {
  const h1 = block.match(/^\* (.+)/);
  if (h1) { group = h1[1].trim(); if (group !== 'TOK connections') groups.push(group); continue; }
  const h2 = block.match(/^\*\* (.+)/);
  if (!h2 || !group) continue;
  if (group === 'TOK connections') {
    const slug = h2[1].trim();
    for (const m of block.matchAll(/^- (.+?) :: (\S+) \| (\S+)\s*$/gm)) {
      if (!TOK_CONCEPTS.includes(m[2])) errors.push(`TOK connection on ${slug}: "${m[2]}" is not a TOK concept`);
      if (!SOURCE_KEYS[m[3]]) errors.push(`TOK connection on ${slug}: unknown source ${m[3]}`);
      if (!tok.has(slug)) tok.set(slug, []);
      tok.get(slug).push({ q: m[1], concept: m[2], src: m[3] });
    }
    continue;
  }
  const title = h2[1].replace(/\s+(:[a-z_-]+:)+\s*$/, '').trim();
  const props = {};
  for (const m of block.matchAll(/^:([A-Z_0-9]+):[ \t]*(.*)$/gm)) props[m[1]] = m[2].trim();
  const body = block.replace(/^\*\* .*\n/, '').replace(/:PROPERTIES:[\s\S]*?:END:\n?/, '');
  const slug = props.SLUG || slugify(title);
  let levels = (props.LEVELS || 'all').split(/\s+/).flatMap(l => l === 'all' ? LEVELS : l === 'myp' ? LEVELS.slice(0, 5) : l === 'none' ? [] : [l]);
  levels = [...new Set(levels)];
  for (const l of levels) if (!LEVELS.includes(l)) errors.push(`${slug}: unknown level ${l}`);
  const sources = [props.SOURCE, props.SOURCE_2, props.SOURCE_3].filter(Boolean);
  for (const s of sources) if (!/^https?:/.test(s) && !SOURCE_KEYS[s]) errors.push(`${slug}: unknown source key ${s}`);
  if (!props.SHORT) errors.push(`${slug}: no :SHORT:`);
  if (!['core', 'enriching', 'expert'].includes(props.IMPORTANCE)) errors.push(`${slug}: importance "${props.IMPORTANCE}"`);
  terms.push({
    slug, title, group, short: props.SHORT || '', long: paras(body),
    importance: props.IMPORTANCE, levels, cats: (props.CATS || '').split(/\s+/).filter(Boolean),
    see: (props.SEE || '').split(/\s+/).filter(Boolean), link: props.LINK || null, sources,
  });
}
const bySlug = new Map();
for (const t of terms) { if (bySlug.has(t.slug)) errors.push(`duplicate slug ${t.slug}`); bySlug.set(t.slug, t); }
for (const t of terms) for (const s of t.see) if (!bySlug.has(s)) errors.push(`${t.slug}: :SEE: ${s} is not a term`);
for (const [slug, list] of tok) { if (!bySlug.has(slug)) errors.push(`TOK connections: ${slug} is not a term`); else bySlug.get(slug).tok = list; }
for (const t of terms) if (t.link && !fs.existsSync(path.join(ROOT, t.link.replace(/\.html(#.*)?$/, '.qmd').replace(/^\//, ''))))
  errors.push(`${t.slug}: :LINK: ${t.link} has no page`);
// TOK concepts that are also terms link back to every connection that uses them
for (const c of TOK_CONCEPTS) if (bySlug.has(c)) bySlug.get(c).usedBy = terms.filter(t => (t.tok || []).some(x => x.concept === c)).map(t => t.slug);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify({ generated: 'scripts/course-glossary.mjs from course/glossary.org', groups, sources: SOURCE_KEYS, tokConcepts: TOK_CONCEPTS, terms }, null, 0) + '\n');
console.log(`${terms.length} terms, ${[...tok.values()].flat().length} TOK connections on ${tok.size} terms -> ${path.relative(ROOT, OUT)}`);
