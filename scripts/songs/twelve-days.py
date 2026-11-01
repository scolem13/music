#!/usr/bin/env python3
"""Fold the Twelve Days verse back into its day-at-a-time page.

The page is one fixed verse whose gift lines appear a day at a time, so it is
markup rather than a generated page: each gift carries the day it arrives on,
and the ordinal in the opening line sits in its own span so that rewriting it
leaves the chords standing. Edit site/extra/twelve-days-of-christmas-seed.cho,
then run this.

The verse is not sung the same way every day. After the verse itself the seed
may have sections called `Until day N`: their lines are the gifts from day N
down, as they go on the days up to N, each with its own row of the grid.

Usage: tools/twelve-days.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chordpro

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'src' / 'twelve-days-of-christmas-seed.cho'
TEMPLATE = ROOT / 'src' / 'twelve-days-of-christmas.template.md'
PAGE = chordpro.SONGS / 'twelve-days-of-christmas.qmd'
ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
            'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']


def grid_rows(chunk):
    """The rows of one section's grid, each a list of bars."""
    grid = re.search(r'\{start_of_grid[^}]*\}\n(.*?)\{end_of_grid\}', chunk, re.S)
    if not grid:
        return None
    return [chordpro.parse_grid([row]) for row in grid.group(1).split('\n')
            if row.strip().startswith('|')]


def versions(gift, main, others):
    """The ways one gift goes: [(first day, last day, line, row)], in order."""
    # From day 1, not from the gift's own day: until it is sung, a gift is a
    # held place on the page, and one of its versions has to hold it.
    out, first = [], 1
    for until, lines, rows in others:           # the earliest days first
        if until - len(lines) < gift <= until and first <= until:
            at = until - gift
            out.append((first, until, lines[at], rows[at] if rows else None))
            first = until + 1
    if first <= 12:
        out.append((first, 12) + main)
    return out


def band_chart(meta, head, gifts):
    """The band's bars for each of the twelve days.

    A day is the opening rows and then the rows of that day's gifts, the
    newest first, each as it goes on that day.
    """
    days = []
    for day in range(1, 13):
        bars = list(head)
        for gift in range(day, 0, -1):
            for first, last, _, row in gifts[gift]:
                if first <= day <= last:
                    bars += [dict(bar) for bar in row]
        days.append({'name': '%s Day' % ORDINALS[day - 1].title(), 'bars': bars})
    out = {'sections': days}
    for key in ('tempo', 'time', 'key', 'style'):
        if meta.get(key):
            out[key] = meta[key]
    setup = chordpro.band_setup(SOURCE.with_name('twelve-days-of-christmas.cho'), 'Twelve Days of Christmas',
                                meta.get('setup'), bool(meta.get('tempo')))
    if setup:
        out['setup'] = setup
    return out

def main():
    text = SOURCE.read_text(encoding='utf-8')
    meta, sections, _ = chordpro.parse(text)
    chunks = re.split(r'^\s*\{comment:[^}]*\}\s*$', text, flags=re.M | re.I)[1:]
    if len(chunks) != len(sections):
        raise SystemExit('every section of the seed starts with a {comment:}')
    lines = sections[0][1]
    if len(lines) < 13:
        raise SystemExit('expected an opening plus twelve gifts, got %d lines'
                         % len(lines))
    opening, gifts = lines[:-12], lines[-12:]

    # The ordinal is rewritten as the days pass; give it a span of its own so
    # that rewriting it leaves the chords around it standing.
    for i, line in enumerate(opening):
        m = re.search(r'\b(%s)\b' % '|'.join(ORDINALS), line)
        if m:
            opening[i] = (line[:m.start()]
                          + '<span id="day-ordinal">%s</span>' % m.group(1)
                          + line[m.end():])
            break
    else:
        raise SystemExit('no ordinal ("first", "second", ...) in the opening')

    # No trailing hard breaks: every line is its own block, and a <br> as well
    # would leave a blank line under each one.
    body = ['[%s]{#day-opening}' % opening[0]]
    body += ['[%s]{.ln}' % line for line in opening[1:]]

    rows = grid_rows(chunks[0])
    if rows and len(rows) != len(lines):
        raise SystemExit('the grid has %d rows; the verse has %d lines'
                         % (len(rows), len(lines)))
    others = []
    for (title, block), chunk in zip(sections[1:], chunks[1:]):
        m = re.search(r'\d+', title)
        if not m:
            raise SystemExit('"%s": which day is it sung until?' % title)
        own = grid_rows(chunk)
        if own and len(own) != len(block):
            raise SystemExit('"%s": %d rows in the grid, %d lines'
                             % (title, len(own), len(block)))
        others.append((int(m.group()), block, own))
    others.sort(key=lambda other: other[0])
    ways = {}
    for n, line in enumerate(gifts):
        gift = 12 - n
        main_row = rows[len(opening) + n] if rows else None
        ways[gift] = [(first, last, text, row or main_row) for first, last, text, row
                      in versions(gift, (line, main_row), others)]
        for first, last, text, _ in ways[gift]:
            span = ''
            if len(ways[gift]) > 1:             # sung this way on these days only
                span = ' from="%d" until="%d"' % (first, last)
            body.append('[%s]{.gift day="%d"%s}' % (text, gift, span))

    page = TEMPLATE.read_text(encoding='utf-8')
    page = re.sub(r'```\{=html\}\n<script type="application/json" id="band-chart">'
                  r'.*?</script>\n```\n\n', '', page, flags=re.S)
    band = rows and band_chart(meta, [bar for row in rows[:len(opening)] for bar in row], ways)
    if band:
        block = ('```{=html}\n<script type="application/json" id="band-chart">%s'
                 '</script>\n```\n\n'
                 % json.dumps(band, ensure_ascii=False).replace('</', '<\\/'))
        at = page.index('::: {.songnav}')
        page = page[:at] + block + page[at:]
    start = page.index('::: {#verse .day-verse}')
    end = page.index('\n:::', start) + len('\n:::')
    PAGE.write_text(page[:start] + '::: {#verse .day-verse}\n' + '\n'.join(body)
                    + '\n:::' + page[end:], encoding='utf-8')
    print('%s: %d opening line(s), %d gifts' % (PAGE.name, len(opening), len(gifts)))


if __name__ == '__main__':
    main()
