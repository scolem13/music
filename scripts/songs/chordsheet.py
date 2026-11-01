#!/usr/bin/env python3
"""Turn a plain chord sheet into an editable ChordPro file.

A chord sheet -- what a printed tab or a Ultimate-Guitar PDF gives you --
writes chords on their own line, positioned by column over the syllable they
fall on:

            C                Em
    You can count on me like one, two, three

Column alignment is unreadable to edit and survives only in a monospace font,
so each chord is moved to the start of the word it sits over and written into
the words themselves, which is the form the site builds from:

    You can [C]count on me like [Em]one, two, three

Section labels in brackets become ChordPro directives. Run chordpro.py on the
result to build the page.

Usage: chordsheet.py <sheet> scripts/songs/src/<slug>.cho --title "Count on Me"
"""
import argparse
import html
import re
from pathlib import Path

# A root, then any run of qualities and extensions -- Bm, Dm6, Gmaj7, Bmadd9 --
# with an optional bass note and the sheet's own * marker.
CHORD = re.compile(r'^(N\.C\.|[A-G](#|b)?'
                   r'((maj|min|m|M|dim|aug|sus|add)\d*|(b|#)\d+|\d+)*'
                   r'(/[A-G](#|b)?)?\*?)$')
# A bar count or repeat marker written beside a run of chords: (x2), [X4].
REPEAT = re.compile(r'^[(\[]?[xX]\d+[)\]]?$')
SECTION = re.compile(r'^\s*\[(.+?)\]\s*$')
PAGE = re.compile(r'^\s*Page \d+\s*/\s*\d+\s*$')


def is_chord_line(line):
    tokens = line.split()
    return (bool(tokens)
            and any(CHORD.match(t) for t in tokens)
            and all(CHORD.match(t) or REPEAT.match(t) for t in tokens))


def chord_columns(line):
    return [(m.start(), m.group()) for m in re.finditer(r'\S+', line)]


def snap(col, lyric):
    """Move a chord to the start of the word it sits over.

    Column-exact placement would cut words in half ("s|ail"), which reads badly
    and lets a line wrap mid-word. Chord charts are read word by word anyway.
    """
    if col >= len(lyric):
        return col
    if lyric[col].isspace():
        nxt = re.compile(r'\S').search(lyric, col)
        return nxt.start() if nxt else col
    while col > 0 and not lyric[col - 1].isspace():
        col -= 1
    return col


def cuts_for(chords, lyric):
    """Where each chord lands in the line, as an index into the words."""
    cuts = []
    for col, _ in chords:
        at = snap(col, lyric)
        # Two chords over one word: leave the second where it was written.
        cuts.append(col if cuts and at <= cuts[-1] else at)
    return cuts


def chordpro_line(chords, lyric):
    """One lyric line with its chords written into the words."""
    if not chords:
        return lyric.strip()
    width = max(c[0] for c in chords) + 1
    lyric = lyric.ljust(width)
    out, at = [], 0
    for cut, (_, name) in zip(cuts_for(chords, lyric), chords):
        out.append(lyric[at:cut])
        out.append('[%s]' % name)
        at = cut
    out.append(lyric[at:])
    return ''.join(out).strip()


ITALIC = re.compile(r'^(\s*)\*(.*)\*(\s*)$')


def unitalic(lyric):
    """Strip the source's chorus asterisks, keeping every other column fixed.

    The markers are replaced by spaces rather than removed, so the chord line
    written above this one still lines up with the words it was written over.
    """
    m = ITALIC.match(lyric)
    if not m or not m.group(2).strip():
        return lyric, False
    i, j = lyric.index('*'), lyric.rindex('*')
    return lyric[:i] + ' ' + lyric[i + 1:j] + ' ' + lyric[j + 1:], True


def parse(text):
    """[(section label, [ChordPro lines])] from a chord sheet."""
    lines = [l.rstrip() for l in text.split('\n') if not PAGE.match(l)]
    sections, current, verses = [], None, 0
    i = 0
    while i < len(lines):
        line = lines[i]
        m = SECTION.match(line)
        if m:
            title = m.group(1).strip()
            # A performance direction keeps the capitals it was written with.
            if not re.match(r'^d\.?\s*[cs]\.?', title, re.I):
                title = title.title().replace('Pre-chorus', 'Pre-Chorus')
            if title == 'Verse':          # the sheet numbers only the second
                verses += 1
                title = 'Verse %d' % verses
            elif title.startswith('Verse'):
                verses = int(re.search(r'\d+', title).group())
            current = (title, [])
            sections.append(current)
            i += 1
            continue
        if not line.strip():
            i += 1
            continue
        if current is None:
            current = ('Lyrics', [])
            sections.append(current)
        if is_chord_line(line):
            nxt = lines[i + 1] if i + 1 < len(lines) else ''
            if nxt.strip() and not is_chord_line(nxt) and not SECTION.match(nxt):
                nxt, italic = unitalic(nxt)
                out = chordpro_line(chord_columns(line), nxt)
                current[1].append('*%s*' % out if italic else out)
                i += 2
                continue
            # A chord with no words under it: a played-only bar.
            current[1].append(' '.join('[%s]' % name
                                       for _, name in chord_columns(line)))
            i += 1
            continue
        line, italic = unitalic(line)
        current[1].append('*%s*' % line.strip() if italic else line.strip())
        i += 1
    return sections


def directive(label):
    """The ChordPro wrapper a section label asks for."""
    low = label.lower()
    if low.startswith('verse'):
        return 'start_of_verse', 'end_of_verse'
    if low.startswith(('chorus', 'pre-chorus')):
        return 'start_of_chorus', 'end_of_chorus'
    if low.startswith('bridge'):
        return 'start_of_bridge', 'end_of_bridge'
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('out', help='.cho file to write')
    ap.add_argument('--title', default='')
    args = ap.parse_args()

    sections = parse(Path(args.sheet).read_text(encoding='utf-8'))
    out = ['{title: %s}' % args.title, ''] if args.title else []
    for label, lines in sections:
        start, end = directive(label)
        if not lines:
            out += ['{comment: %s}' % label, '']
            continue
        out.append('{%s: %s}' % (start, label) if start
                   else '{comment: %s}' % label)
        out += lines
        if end:
            out.append('{%s}' % end)
        out.append('')
    Path(args.out).write_text('\n'.join(out), encoding='utf-8')
    print('\n'.join('%-14s %d lines' % (n, len(l)) for n, l in sections))


if __name__ == '__main__':
    main()
