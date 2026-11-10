#!/usr/bin/env python3
"""kern2xml.py - a Humdrum **kern piano score to MusicXML (one part, two staves), for scripts/full-score/convert.mjs.

    python3 -I scripts/kern/kern2xml.py in.krn out.musicxml [--title T] [--composer C] [--movement M] [--endings 65:1,66:2]

Why not music21: its kern reader drops and re-spells notes in these sonatas (checked 2026-11-10 on Moonlight III: wrong key, merged
voices, lost bars). This reader is small and only does what the Beethoven sonatas in craigsapp/beethoven-piano-sonatas use:
  spines: **kern columns (staff from *staffN), **dynam (letter dynamics only); *^ splits and *v merges (each column of a staff = one voice
  in that measure); chords (space), ties [ _ ], slurs ( ), beams L J, grace notes q Q (no time), tuplets from the recip number
  (6, 12, 20 ...), dots, fermata, staccato, accent, tenuto, trill, mordent; clef / key / meter / tempo changes; repeat bars (=:|! =!|:);
  *> section labels give first / second endings (--endings measure:number is the fallback).
Pitch is the sounding spelling (kern writes every sharp / flat; a key signature is display only).
Not done: wedges (< >), arpeggio signs, ottava, stem directions, cue size, tremolo. The sums are checked at the end: every voice in a
measure must fill the same length as the others (a report line for any that do not, which a free cadenza bar will legitimately trip).
Licence of the input: see scripts/kern/README.md.
"""
import sys, re, math
from fractions import Fraction
from xml.sax.saxutils import escape

DIV = 3360  # divisions per quarter note (480 x 7: septuplets occur)
STEP = {'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'a': 'A', 'b': 'B'}
DYNS = {'p', 'pp', 'ppp', 'f', 'ff', 'fff', 'mp', 'mf', 'sf', 'sfz', 'fz', 'fp', 'rf', 'rfz', 'sfp', 'sfpp'}
TYPES = {1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: '16th', 32: '32nd', 64: '64th', 128: '128th', 256: '256th'}


def parse_note(sub):
    """One sub-token (a note, a rest or a chord member). Returns a dict, or None for '.'."""
    d = dict(tie=None, slur_s=0, slur_e=0, beam=None, grace=None, artic=[], fermata=False, orn=None, rest=False)
    i, n = 0, len(sub)
    digits = ''
    dots = 0
    letters = ''
    acc = ''
    while i < n:
        c = sub[i]
        if c == '[': d['tie'] = 'start'
        elif c == ']': d['tie'] = 'stop' if d['tie'] != 'start' else 'both'
        elif c == '_': d['tie'] = 'cont'
        elif c == '(': d['slur_s'] += 1
        elif c == ')': d['slur_e'] += 1
        elif c.isdigit() or (c == '%' and digits):
            digits += c
        elif c == '.' and digits:
            dots += 1
        elif c == 'r': d['rest'] = True
        elif c in 'abcdefgABCDEFG':
            letters += c
        elif c in '#-' or (c == 'n' and letters):
            acc += c
        elif c in 'qQ': d['grace'] = c
        elif c == 'L': d['beam'] = 'L'
        elif c == 'J': d['beam'] = 'J'
        elif c == "'": d['artic'].append('staccato')
        elif c == '^': d['artic'].append('accent')
        elif c == '~': d['artic'].append('tenuto')
        elif c == ';': d['fermata'] = True
        elif c in 'tT': d['orn'] = 'trill-mark'
        elif c in 'mM': d['orn'] = 'mordent' if c == 'm' else 'inverted-mordent'
        i += 1
    if not digits and not d['grace'] and not d['rest'] and not letters:
        return None
    d['digits'], d['dots'] = digits, dots
    if letters:
        l = letters[0]
        if l.islower(): octave = 4 + len(letters) - 1
        else: octave = 3 - (len(letters) - 1)
        d['step'], d['octave'] = STEP[l.lower()], octave
        d['alter'] = acc.count('#') - acc.count('-')
        d['shown'] = ('n' in acc)
    return d


def dur_of(digits, dots):
    """Duration in divisions, plus (type, actual, normal) for time-modification; None when no number."""
    if digits in ('', '0') and digits == '':
        return None
    if '%' in digits:
        a, b = digits.split('%')
        q = Fraction(4 * int(b), int(a)); n = int(a) if int(b) == 1 else 0
        if n == 0:
            for k2 in range(dots): q += q / (2 ** (k2 + 1)) if False else 0
            return int(q * DIV), 'breve', 1, 1
    else:
        n = int(digits)
    q = Fraction(8, 1) if n == 0 else Fraction(4, n)
    base = Fraction(1)
    for k in range(dots): base += Fraction(1, 2 ** (k + 1))
    q *= base
    if n == 0: typ, act, norm = 'breve', 1, 1
    else:
        p2 = 1
        while p2 * 2 <= n: p2 *= 2
        if p2 == n: typ, act, norm = TYPES[n], 1, 1
        else:
            r = Fraction(p2, n)
            typ, act, norm = TYPES[p2], r.denominator, r.numerator
    return int(q * DIV), typ, act, norm


class Col:
    def __init__(self, staff, clef=None):
        self.staff, self.clef, self.cursor, self.inbeam = staff, clef, 0, False
        self.slurs = []
        self.tup = None
        self.nextdur = None


def main():
    argv = sys.argv[1:]
    opts = {'title': 'Sonata', 'composer': 'Beethoven', 'movement': '', 'endings': {}}
    pos = []
    k = 0
    while k < len(argv):
        a = argv[k]
        if a in ('--title', '--composer', '--movement'):
            opts[a[2:]] = argv[k + 1]; k += 2
        elif a == '--drop-ties':
            opts['droptie'] = set()
            for part in argv[k + 1].split(','):
                lo, _, hi = part.partition('-'); opts['droptie'].update(range(int(lo), int(hi or lo) + 1))
            k += 2
        elif a == '--endings':
            for part in argv[k + 1].split(','):
                m, e = part.split(':'); opts['endings'][int(m)] = int(e)
            k += 2
        else:
            pos.append(a); k += 1
    src, out = pos
    lines = [l.rstrip('\n') for l in open(src, encoding='utf-8')]

    cols = []          # current columns: Col objects, with kind
    kinds = []
    header = None
    measures = []      # list of dict(number, events[staff][voice]=list, right, left_repeat, attrs, ending)
    cur = None
    state = dict(key=0, beats=None, beattype=None, tempo=None)
    pending = dict(key=None, meter=None, tempo=None)
    label = None
    warnings = []
    mnum = 0
    pickup_open = True

    def new_measure(number, implicit=False):
        nonlocal cur
        cur = dict(number=number, implicit=implicit, voices={}, right=None, left_repeat=False, attrs=[], ending=None, dyn=[], len=None)
        measures.append(cur)
        for c in cols: c.cursor = 0; c.inbeam = False

    def voice_for(ci):
        """Voice id for column ci: position among the kern columns of the same staff (1-4 staff 1, 5-8 staff 2)."""
        c = cols[ci]
        same = [j for j in range(len(cols)) if kinds[j] == 'kern' and cols[j].staff == c.staff]
        return (0 if c.staff == 1 else 4) + same.index(ci) + 1

    for ln, line in enumerate(lines):
        if not line or line.startswith('!'):
            continue
        toks = line.split('\t')
        if line.startswith('**'):
            kinds = ['kern' if t == '**kern' else ('dynam' if t == '**dynam' else 'other') for t in toks]
            cols = [Col(1) for _ in toks]
            continue
        if line.startswith('*'):
            if all(t in ('*', '*-') for t in toks): continue
            # splits and merges
            if any(t in ('*^', '*v') for t in toks):
                nk, nc = [], []
                i = 0
                while i < len(toks):
                    if toks[i] == '*^':
                        for _ in range(2):
                            c = Col(cols[i].staff, cols[i].clef); c.cursor, c.inbeam = cols[i].cursor, False
                            nc.append(c); nk.append(kinds[i])
                        i += 1
                    elif toks[i] == '*v':
                        j = i
                        while j < len(toks) and toks[j] == '*v': j += 1
                        nc.append(cols[i]); nk.append(kinds[i]); i = j
                    else:
                        nc.append(cols[i]); nk.append(kinds[i]); i += 1
                cols, kinds = nc, nk
                continue
            for i, t in enumerate(toks):
                m = re.match(r'\*staff(\d)', t)
                if m and kinds[i] in ('kern', 'dynam'): cols[i].staff = int(m.group(1))
                m = re.match(r'\*clef([GF])(\d)$', t)
                if m and kinds[i] == 'kern':
                    cols[i].clef = (m.group(1), int(m.group(2)))
                    if cur is not None:
                        cur['voices'].setdefault(voice_for(i), []).append(('clef', cols[i].cursor, cols[i].staff, cols[i].clef))
                    else:
                        pass
                m = re.match(r'\*k\[(.*)\]', t)
                if m and kinds[i] == 'kern':
                    items = re.findall(r'[a-g][#-]', m.group(1))
                    pending['key'] = sum(1 for x in items if x[1] == '#') - sum(1 for x in items if x[1] == '-')
                m = re.match(r'\*M(\d+)/(\d+)', t)
                if m and kinds[i] == 'kern': pending['meter'] = (int(m.group(1)), int(m.group(2)))
                m = re.match(r'\*MM(\d+)', t)
                if m and kinds[i] == 'kern': pending['tempo'] = int(m.group(1))
                m = re.match(r'\*>(\w+)$', t)
                if m and i == 0: label = m.group(1)
            if label and cur is not None:
                if re.match(r'^[A-Za-z]+[12]$', label): cur['ending'] = int(label[-1])
                label = None
            elif label:
                label = None
            continue
        if line.startswith('='):
            t0 = toks[0]
            m = re.match(r'=+(\d*)([a-z]?)(.*)$', t0)
            num = m.group(1); rest = m.group(3)
            if cur is not None and (':|' in rest or t0.startswith('==')):
                cur['right'] = 'repeat' if ':|' in rest else 'final'
            elif cur is not None and '||' in rest:
                cur['right'] = 'double'
            if cur is None:
                # the first barline: whatever came before was the pickup (if it holds notes)
                pass
            if cur is not None and not cur['voices'] and cur['implicit']:
                measures.pop()          # empty pickup placeholder
            if t0.startswith('=='):
                cur = None; continue
            mnum = int(num) if num else mnum + 1
            new_measure(mnum)
            if len(measures) == 1:
                for i2, c2 in enumerate(cols):
                    if kinds[i2] == 'kern' and c2.clef:
                        cur['voices'].setdefault(voice_for(i2), []).append(('clef', 0, c2.staff, c2.clef))
            if '|:' in rest: cur['left_repeat'] = True
            cur['attrs'] = dict(pending); pending = dict(key=None, meter=None, tempo=None)
            # clefs set before this barline are re-stated at its start
            continue
        # data line
        if cur is None:
            new_measure(0, implicit=True)
            cur['attrs'] = dict(pending); pending = dict(key=None, meter=None, tempo=None)
            for i, c in enumerate(cols):
                if kinds[i] == 'kern' and c.clef:
                    cur['voices'].setdefault(voice_for(i), []).append(('clef', 0, c.staff, c.clef))
        # time of this line, from the kern columns that start something
        starts = [cols[i].cursor for i, t in enumerate(toks) if kinds[i] == 'kern' and t != '.']
        T = min(starts) if starts else None
        for i, t in enumerate(toks):
            if t == '.': continue
            c = cols[i]
            if kinds[i] == 'dynam':
                if t in DYNS and T is not None:
                    cur['dyn'].append((T, c.staff, t))
                continue
            if kinds[i] != 'kern': continue
            v = voice_for(i)
            subs = t.split(' ')
            notes = [parse_note(s) for s in subs]
            notes = [x for x in notes if x]
            if not notes: continue
            first = notes[0]
            dd = dur_of(first['digits'], first['dots'])
            if first['grace']:
                if dd is None: dd = (0, 'eighth', 1, 1)
                ev = dict(kind='grace', notes=notes, typ=dd[1], slash=(first['grace'] == 'q'), onset=c.cursor)
                cur['voices'].setdefault(v, []).append(('note', ev, c.staff, i))
                continue
            if dd is None:
                warnings.append('line %d: no duration in %r' % (ln + 1, t)); continue
            dur, typ, act, norm = dd
            ev = dict(kind='rest' if first['rest'] else 'note', notes=notes, dur=dur, typ=typ, act=act, norm=norm, onset=c.cursor, dots=first['dots'])
            # beams: L starts, J ends
            bs = [x['beam'] for x in notes if x['beam']]
            ev['beam'] = None
            if typ not in ('whole', 'half', 'quarter', 'breve'):
                if 'L' in bs: c.inbeam = True; ev['beam'] = 'begin'
                elif c.inbeam and 'J' in bs: ev['beam'] = 'end'; c.inbeam = False
                elif c.inbeam: ev['beam'] = 'continue'
            else:
                c.inbeam = False
            c.slurs_s = sum(x['slur_s'] for x in notes); c.slurs_e = sum(x['slur_e'] for x in notes)
            ev['slur_s'], ev['slur_e'] = c.slurs_s, c.slurs_e
            cur['voices'].setdefault(v, []).append(('note', ev, c.staff, i))
            c.cursor += dur

    # --- tuplets: bracket groups per voice; a group is complete when its length is a whole multiple of norm x (first note's untupled length) ---
    for m in measures:
        for v, items in m['voices'].items():
            grp = None
            for it in items:
                if it[0] != 'note' or it[1]['kind'] == 'grace': continue
                e = it[1]
                if e['act'] != 1:
                    if grp is None or (e['act'], e['norm']) != (grp['act'], grp['norm']):
                        grp = dict(act=e['act'], norm=e['norm'], sum=0, unit=e['norm'] * (e['dur'] * e['act'] // e['norm']))
                        e['tup'] = 'start'
                    grp['sum'] += e['dur']
                    if grp['sum'] % grp['unit'] == 0:
                        e['tup'] = 'startstop' if e.get('tup') == 'start' else 'stop'
                        grp = None
                else:
                    grp = None

    # --- ties across a change of voice: rename the next measure's voice so xml2abc sees the tie in one voice ---
    for mi in range(len(measures) - 1):
        m, nx = measures[mi], measures[mi + 1]
        pend = {}
        for v, items in m['voices'].items():
            for it in items:
                if it[0] == 'note' and it[1]['kind'] == 'note':
                    for n in it[1]['notes']:
                        if n.get('tie') in ('start', 'cont', 'both') and 'step' in n:
                            pend[(1 if v <= 4 else 2, n['step'], n['octave'], n['alter'])] = v
        for _ in range(4):
            changed = False
            for v, items in list(nx['voices'].items()):
                firsts = [it for it in items if it[0] == 'note' and it[1]['kind'] == 'note' and it[1]['onset'] == 0]
                want = None
                for it in firsts:
                    for n in it[1]['notes']:
                        if n.get('tie') in ('stop', 'cont') and 'step' in n:
                            w = pend.get((1 if v <= 4 else 2, n['step'], n['octave'], n['alter']))
                            if w is not None: want = w
                if want is not None and want != v and (1 if want <= 4 else 2) == (1 if v <= 4 else 2):
                    other = nx['voices'].pop(want, None)
                    mine = nx['voices'].pop(v)
                    nx['voices'][want] = mine
                    if other is not None: nx['voices'][v] = other
                    changed = True
                    break
            if not changed: break

    # --- ties xml2abc cannot follow (a chord with only some notes tied; overlapping ties of one pitch): dropped by measure number ---
    dt = opts.get('droptie', set())
    for mi, m in enumerate(measures):
        for v in m['voices']:
            for it in m['voices'][v]:
                if it[0] == 'note' and it[1]['kind'] == 'note':
                    for n in it[1]['notes']:
                        if not n.get('tie'): continue
                        if m['number'] in dt and n['tie'] in ('start', 'cont', 'both'):
                            n['tie'] = None if n['tie'] == 'start' else 'stop'
                        if m['number'] - 1 in dt and n['tie'] in ('stop', 'cont', 'both'):
                            n['tie'] = None if n['tie'] == 'stop' else 'start'
    # --- ties: keep only those xml2abc can follow (same voice, this measure or the next); list the others ---
    pending = {}
    dropped = []
    for mi, m in enumerate(measures):
        for v in sorted(m['voices']):
            for it in sorted([x for x in m['voices'][v] if x[0] == 'note' and x[1]['kind'] == 'note'], key=lambda x: x[1]['onset']):
                for n in it[1]['notes']:
                    if 'step' not in n or not n.get('tie'): continue
                    key = (v, n['step'], n['octave'], n['alter'])
                    t = n['tie']
                    if t in ('stop', 'cont', 'both'):
                        p = pending.get(key)
                        if p and mi - p[0] <= 1:
                            pending.pop(key)
                        else:
                            dropped.append('measure %d %s%d: tie in has no start in the same voice' % (m['number'], n['step'], n['octave']))
                            n['tie'] = 'start' if t in ('cont', 'both') else None
                            t = n['tie']
                    if t in ('start', 'cont', 'both'):
                        if key in pending:
                            dropped.append('measure %d %s%d: tie start never closed' % (measures[pending[key][0]]['number'], n['step'], n['octave']))
                            pending[key][1]['tie'] = None if pending[key][1]['tie'] == 'start' else 'stop'
                        pending[key] = (mi, n)
    for key, (mi, n) in pending.items():
        dropped.append('measure %d %s%d: tie start never closed' % (measures[mi]['number'], n['step'], n['octave']))
        n['tie'] = None if n['tie'] == 'start' else 'stop'

    # --- check lengths ---
    for m in measures:
        lens = {}
        for v, items in m['voices'].items():
            tot = sum(it[1]['dur'] for it in items if it[0] == 'note' and it[1]['kind'] != 'grace')
            lens[v] = tot
        m['len'] = max(lens.values()) if lens else 0
        m['lens'] = lens

    # --- write ---
    beats, beattype = 4, 4
    first = measures[0]['attrs'] if measures else {}
    out_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<score-partwise version="3.1"><work><work-title>%s</work-title></work>' % escape(opts['title']),
                 '<movement-title>%s</movement-title>' % escape(opts['movement']),
                 '<identification><creator type="composer">%s</creator></identification>' % escape(opts['composer']),
                 '<part-list><part-group type="start" number="1"><group-symbol>brace</group-symbol></part-group>'
                 '<score-part id="P1"><part-name>Piano</part-name><part-abbreviation>Pno</part-abbreviation></score-part>'
                 '<part-group type="stop" number="1"/></part-list>', '<part id="P1">']
    # initial clefs
    clefs = {}
    for m in measures:
        for v, items in m['voices'].items():
            for it in items:
                if it[0] == 'clef' and it[2] not in clefs: clefs[it[2]] = it[3]
        if len(clefs) >= 2: break
    clefs.setdefault(1, ('G', 2)); clefs.setdefault(2, ('F', 4))
    cur_clef = dict(clefs)
    endnum = opts['endings']
    last_ending = None
    problems = []
    notecount = 0

    def pitch_xml(n):
        alt = '<alter>%d</alter>' % n['alter'] if n['alter'] else ''
        return '<pitch><step>%s</step>%s<octave>%d</octave></pitch>' % (n['step'], alt, n['octave'])

    def note_xml(e, n, chord, staff, voice, ties, slurs_xml):
        s = '<note>'
        if e['kind'] == 'grace':
            s += '<grace slash="yes"/>' if e['slash'] else '<grace/>'
        if chord: s += '<chord/>'
        if e['kind'] == 'rest' or n.get('rest'):
            s += '<rest/>'
        else:
            s += pitch_xml(n)
        if e['kind'] != 'grace': s += '<duration>%d</duration>' % e['dur']
        if n.get('tie') in ('start', 'both'): s += '<tie type="start"/>'
        if n.get('tie') in ('stop', 'both', 'cont'): s = s.replace('<note>', '<note>', 1) + '<tie type="stop"/>'
        if n.get('tie') == 'cont': s += '<tie type="start"/>'
        s += '<voice>%d</voice><type>%s</type>' % (voice, e['typ'])
        for _ in range(e.get('dots', 0) if e['kind'] != 'grace' else 0): s += '<dot/>'
        if e['kind'] != 'grace' and e['act'] != 1:
            s += '<time-modification><actual-notes>%d</actual-notes><normal-notes>%d</normal-notes></time-modification>' % (e['act'], e['norm'])
        s += '<staff>%d</staff>' % staff
        if e.get('beam') and not chord:
            s += '<beam number="1">%s</beam>' % e['beam']
        elif e.get('beam') and chord:
            s += '<beam number="1">%s</beam>' % e['beam']
        nt = ''
        if n.get('tie') in ('start', 'both'): nt += '<tied type="start"/>'
        if n.get('tie') in ('stop', 'both', 'cont'): nt += '<tied type="stop"/>'
        if n.get('tie') == 'cont': nt += '<tied type="start"/>'
        if e.get('tup') in ('start', 'startstop') and not chord: nt += '<tuplet type="start" bracket="no"/>'
        if e.get('tup') in ('stop', 'startstop') and not chord: nt += '<tuplet type="stop"/>'
        nt += slurs_xml
        art = ''.join('<%s/>' % a for a in n['artic'])
        if art: nt += '<articulations>%s</articulations>' % art
        if n['fermata']: nt += '<fermata/>'
        if n['orn']: nt += '<ornaments><%s/></ornaments>' % n['orn']
        if nt: s += '<notations>%s</notations>' % nt
        return s + '</note>'

    slur_stack = {}   # voice -> list of open slur numbers
    slur_free = {}
    for mi, m in enumerate(measures):
        a = m['attrs'] or {}
        x = '<measure number="%d"%s>' % (m['number'], ' implicit="yes"' if m['implicit'] else '')
        # barline left
        bl = ''
        if m['left_repeat']: bl += '<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>'
        # volta
        en = m['ending'] or endnum.get(m['number'])
        if en and en != last_ending:
            if last_ending: pass
            bl += '<barline location="left"><ending number="%d" type="start"/></barline>' % en
        x += bl
        attrs = ''
        if mi == 0 or a.get('key') is not None or a.get('meter'):
            attrs += '<attributes><divisions>%d</divisions>' % DIV if mi == 0 else '<attributes>'
            if mi == 0 or a.get('key') is not None:
                kv = a.get('key') if a.get('key') is not None else 0
                attrs += '<key><fifths>%d</fifths></key>' % kv
            if mi == 0 or a.get('meter'):
                mt = a.get('meter') or (4, 4)
                beats, beattype = mt
                attrs += '<time><beats>%d</beats><beat-type>%d</beat-type></time>' % mt
            if mi == 0:
                attrs += '<staves>2</staves>'
                for st in (1, 2):
                    attrs += '<clef number="%d"><sign>%s</sign><line>%d</line></clef>' % (st, cur_clef[st][0], cur_clef[st][1])
            attrs += '</attributes>'
        if a.get('tempo'):
            attrs += '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>%d</per-minute></metronome></direction-type><sound tempo="%d"/></direction>' % (a['tempo'], a['tempo'])
        x += attrs
        # voices in order
        order = sorted(m['voices'])
        pos = 0
        written_any = False
        mdyn = sorted(m['dyn'])
        for vi, v in enumerate(order):
            items = m['voices'][v]
            staff = 1 if v <= 4 else 2
            if written_any and pos > 0:
                x += '<backup><duration>%d</duration></backup>' % pos
            pos = 0
            written_any = True
            # dynamics for this staff go in the staff's first voice
            dyn = [d for d in mdyn if d[1] == staff] if v == min(vv for vv in order if (1 if vv <= 4 else 2) == staff) else []
            stream = []
            for it in items:
                if it[0] == 'clef': stream.append((it[1], 0, it))
                else: stream.append((it[1]['onset'], 1, it))
            for d in dyn: stream.append((d[0], 0, ('dyn', d)))
            stream.sort(key=lambda s: (s[0], s[1]))
            for onset, _, it in stream:
                if it[0] == 'dyn':
                    if onset > pos: x += '<forward><duration>%d</duration></forward>' % (onset - pos); pos = onset
                    x += '<direction placement="below"><direction-type><dynamics><%s/></dynamics></direction-type><staff>%d</staff></direction>' % (it[1][2], it[1][1])
                    continue
                if it[0] == 'clef':
                    if onset > pos: x += '<forward><duration>%d</duration></forward>' % (onset - pos); pos = onset
                    st, cl = it[2], it[3]
                    if cur_clef.get(st) != cl:
                        cur_clef[st] = cl
                        x += '<attributes><clef number="%d"><sign>%s</sign><line>%d</line></clef></attributes>' % (st, cl[0], cl[1])
                    continue
                e = it[1]
                if e['kind'] != 'grace' and onset > pos:
                    x += '<forward><duration>%d</duration></forward>' % (onset - pos); pos = onset
                # slur marks (on the first note of the chord)
                sl = ''
                if e['kind'] != 'grace':
                    stk = slur_stack.setdefault(v, [])
                    for _ in range(e.get('slur_e', 0)):
                        if stk: sl += '<slur type="stop" number="%d"/>' % stk.pop()
                    for _ in range(e.get('slur_s', 0)):
                        used = set(n for vv in slur_stack.values() for n in vv)
                        k2 = 1
                        while k2 in used: k2 += 1
                        stk.append(k2); sl += '<slur type="start" number="%d"/>' % k2
                notes = e['notes']
                if e['kind'] == 'rest':
                    x += note_xml(e, notes[0], False, staff, v, None, '')
                else:
                    for k2, n in enumerate(notes):
                        if 'step' not in n: continue
                        x += note_xml(e, n, k2 > 0, staff, v, None, sl if k2 == 0 else '')
                        notecount += 1
                if e['kind'] != 'grace': pos += e['dur']
        # ending / barline right
        br = ''
        nxt = measures[mi + 1] if mi + 1 < len(measures) else None
        nxt_en = (nxt['ending'] or endnum.get(nxt['number'])) if nxt else None
        if en and nxt_en != en:
            br += '<barline location="right"><ending number="%d" type="%s"/>' % (en, 'stop' if en == 1 else 'discontinue')
            if m['right'] == 'repeat': br += '<repeat direction="backward"/>'
            br += '</barline>'
        elif m['right'] == 'repeat':
            br += '<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>'
        elif m['right'] == 'final' or (nxt is None):
            br += '<barline location="right"><bar-style>light-heavy</bar-style></barline>'
        last_ending = en if (nxt_en == en) else None
        x += br + '</measure>'
        out_lines.append(x)
        # length report
        ls = set(v for k3, v in m['lens'].items())
        if len(ls) > 1 and not (m['number'] == 0):
            problems.append('measure %d: voice lengths %s' % (m['number'], {k3: v / DIV for k3, v in m['lens'].items()}))
    out_lines.append('</part></score-partwise>')
    open(out, 'w', encoding='utf-8').write('\n'.join(out_lines))
    print('%s: %d measures, %d notes written' % (out, len(measures), notecount))
    if dt: print('DROPTIES by request in measures', sorted(dt))
    for d in dropped: print('TIEDROP', d)
    for w in warnings[:20]: print('WARN', w)
    for p in problems[:40]: print('LEN', p)
    print('%d warnings, %d measures with unequal voice lengths' % (len(warnings), len(problems)))


main()
