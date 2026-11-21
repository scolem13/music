#!/usr/bin/env python3
"""Bar numbers for an ABC tune, as the transcription review page and the Notation page count them.

python3 -I scripts/realbooks/abcbars.py FILE.abc     prints every bar with its number, then the %unsure lines and whether each
                                                     has a [bars ...] tag that points at real bars.

Counting: every group of notes/rests between two barlines is a bar, in the order written (repeats are NOT unrolled, so the
1st and 2nd endings are separate bars). Music lines run on into each other; a line that ends without a barline carries its bar
on to the next line. If the first bar is shorter than the meter it is the pickup, bar 0; otherwise the first bar is bar 1.

%unsure tags:  %unsure [bars 12-13] text      [bar 9]   [bars 3, 7-8]   [form] / [general] = not about particular bars.
"""
import re, sys, os
from fractions import Fraction as F
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from abcfmt import TOK, ln

TAG = re.compile(r'^%unsure\s*\[(?:bars?\s+)?([^\]]*)\]\s*(.*)$')


def parse_tag(line):
    """'%unsure [bars 3, 7-8] text' -> ([3, 7, 8], text); untagged or [form] -> ([], text)"""
    m = TAG.match(line)
    if not m: return None, re.sub(r'^%unsure\s*', '', line)
    spec, text = m.group(1), m.group(2)
    nums = []
    for part in re.split(r'[,\s]+(?:and\s+)?', spec.strip()):
        r = re.fullmatch(r'(\d+)\s*[-\u2013]\s*(\d+)', part)
        if r: nums.extend(range(int(r.group(1)), int(r.group(2)) + 1))
        elif part.isdigit(): nums.append(int(part))
    return nums, text


def bars(abc):
    """-> (bars, first_number). bars: [{group, number, dur, meter, text}] in order written."""
    inbody = False; M = F(4, 4); L = F(1, 8)
    music = []
    for l in abc.split('\n'):
        if not inbody:
            m = re.match(r'M:\s*(\d+)/(\d+)', l)
            if m: M = F(int(m.group(1)), int(m.group(2)))
            if re.match(r'M:\s*C\|', l): M = F(2, 2)
            if re.match(r'M:\s*C\s*$', l): M = F(4, 4)
            m = re.match(r'L:\s*(\d+)/(\d+)', l)
            if m: L = F(int(m.group(1)), int(m.group(2)))
            if l.startswith('K:'): inbody = True
            continue
        if not l.strip() or l.startswith('%'): continue
        if re.match(r'^[A-Za-z]:', l):
            m = re.match(r'M:\s*(\d+)/(\d+)', l)
            if m: music.append('[M:%s/%s]' % m.groups())
            continue
        music.append(l)
    out = []; cur = F(0); has = False; txt = []; meter = M; tupleft = 0; tupf = F(1)
    def close():
        nonlocal cur, has, txt
        if has: out.append({'dur': cur, 'meter': meter, 'text': ' '.join(''.join(txt).split())})
        cur = F(0); has = False; txt = []
    for m in TOK.finditer(' '.join(music)):
        g = m.groupdict()
        if g['bar'] is not None:
            close(); continue
        txt.append(m.group(0))
        if g['field'] is not None:
            f = re.match(r'\[M:\s*(\d+)/(\d+)', g['field'])
            if f and not has: meter = F(int(f.group(1)), int(f.group(2)))
            continue
        d = None
        if g['grp'] is not None: d = ln(g['gl'])
        elif g['note'] is not None: d = ln(g['nl'])
        elif g['rest'] is not None: d = ln(g['rl']) if g['rest'] != 'Z' else meter / L
        elif g['tup'] is not None:
            p = int(g['tup'][1]); parts = g['tup'][2:].split(':') if ':' in g['tup'] else []
            q = int(parts[1]) if len(parts) > 1 and parts[1] else (3 if p in (2, 4, 6, 8) else 2)
            r = int(parts[2]) if len(parts) > 2 and parts[2] else p
            tupleft = r; tupf = F(q, p)
        if d is not None:
            cur += d * L * tupf; has = True
            if tupleft:
                tupleft -= 1
                if tupleft == 0: tupf = F(1)
    close()
    first = 0 if out and out[0]['dur'] < out[0]['meter'] else 1
    for i, b in enumerate(out): b['group'] = i; b['number'] = i + first
    return out, first


def flags(abc):
    """-> [{bars: [numbers], groups: [0-based group indexes], text}] from the %unsure lines."""
    bs, first = bars(abc)
    res = []
    for l in abc.split('\n'):
        if not l.startswith('%unsure'): continue
        nums, text = parse_tag(l)
        nums = [n for n in (nums or []) if 0 <= n - first < len(bs)]
        res.append({'bars': nums, 'groups': [n - first for n in nums], 'text': text.strip()})
    return res


def off_bars(abc):
    """bar numbers whose length isn't the meter's (the pickup and the last bar are left out)"""
    bs, first = bars(abc)
    return [b['number'] for i, b in enumerate(bs) if b['dur'] != b['meter'] and not (first == 0 and i == 0) and i != len(bs) - 1]


if __name__ == '__main__':
    abc = open(sys.argv[1]).read()
    bs, first = bars(abc)
    for b in bs:
        mark = '' if b['dur'] == b['meter'] else '   <- %s of %s' % (b['dur'], b['meter'])
        print('%4d  %s%s' % (b['number'], b['text'], mark))
    print()
    for l in abc.split('\n'):
        if l.startswith('%unsure'):
            nums, _ = parse_tag(l)
            ok = 'untagged' if nums is None else ('general' if not nums else ('ok' if all(0 <= n - first < len(bs) for n in nums) else 'BAD BAR NUMBER'))
            print('[%s] %s' % (ok, l))
