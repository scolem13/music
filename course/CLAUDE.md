# Course pages (sidebar part Course, navbar Course menu)

The MYP1–DP course as students see it: `index.qmd`, `pathway.qmd`, `enrichment.qmd`, `glossary.qmd`.
Scripts and data in `apps/shared/course/`; shared helpers `course-common.js` (localStorage via `CourseKit.load/save`, share
links `?p=<packed>`), styles `course.css` (site tokens; light and dark come from `custom.css`).

## Glossary
- Source: `course/glossary.org` (format in its header). Build: `node scripts/course-glossary.mjs` → `apps/shared/course/glossary.json`.
  It stops on a broken `:SEE:`, an unknown source key, a TOK concept that is not one of the twelve, or a `:LINK:` with no page.
- Imported once (Oct 2026) from `~/Projects/website/music-website/music-dictionary.org`, `myp-concepts-website` and
  `tok-website/glossary.yml`; those are not read again. Command terms, MYP assessment, DP Music, MLT and TOK connections were
  written here from the DP Music guide (2020, first assessment 2022; PDF in `~/Projects/website/music-website/pdfs/`, print page =
  PDF page − 6), the MYP Arts guide excerpt (`~/Documents/Task Sheets/MYP Arts Rubrics.pdf`) and Gordon's LSM 2012 (text cache).
- TOK questions marked `dp-guide-9` are quoted from the guide; `site` ones were written for the course.
- "In class" dates: `~/Documents/Learning-Experiences/glossary-usage.py` (run by its `publish.py` after rendering) scans the class
  pages, writes `glossary-usage.json` into the class site's `_site/` with a `_headers` CORS rule, and a fallback copy to
  `apps/shared/course/glossary-usage.json` here. Auto-matching skips everyday words (its STOP set); a class page can list terms
  in front matter: `glossary: [slug, slug]`.

## Pathway
- Data: `node scripts/course-pathway.mjs` reads `~/Documents/Task Sheets/Task Sheets — Steps and Decisions.org` (the
  sequence table, the per-unit "- Ai, new :: …" lines, the practice-run checklist, the rubric summary and transition tables)
  → `apps/shared/course/pathway.json`. Re-run after editing the org file. The "steeper catch-up ramp" alternative is not shown.
- The DP change year is `DP_CHANGE = 2028` in `pathway.js`: a student whose DP1 starts in fall 2028 or later is told the new
  course's details are not out yet. The MYP→DP mapping table is marked as the course's reading.

## Enrichment
- Options in `apps/shared/course/enrichment-data.js` (ids are saved by students: never rename one). Every link must be a page;
  the MLT tag is the course's reading of what the activity mostly trains.

## Tests
`node tests/course/course-data.test.js` (builds the glossary, checks links and data);
`tests/course/course.cdp.js` after rendering the four pages (`SITE=<dir>` for a render elsewhere).

## Later
Saved state is localStorage only (`course:*` keys) by the user's choice; it moves to Supabase later. Keep all saving in
`CourseKit.load/save` so that move is one file.
