import re, json, sys
src, out = sys.argv[1], sys.argv[2]
pages = open(src).read().split('=====PAGE ')[1:]
def cols():
    for pg in pages:
        n = int(re.search(r'p(\d+)\.png', pg).group(1))
        for c in pg.split('--- col ')[1:]:
            ls = []
            for l in c.split('\n')[1:]:
                m = re.match(r'([\d.]+) (.*)', l)
                if m: ls.append((float(m.group(1)), m.group(2).replace('т','m').replace('мм','mm')))
            yield n, ls
def entries(kind):
    out = []  # (level, text)
    for n, ls in cols():
        if kind == 'works' and n > 11: continue
        if kind == 'concepts' and n < 13: continue
        ls = [(x, t) for x, t in ls if not re.search(r'Index of (Composers|Concepts)|denotes a complete|intended to help|well as to provide|numbers are indicated|occurs several times', t)]
        if not ls: continue
        base = min(x for x, t in ls)
        for x, t in ls:
            if re.fullmatch(r'[A-Z]', t.strip()): continue
            lvl = round((x - base) / 0.021); lvl = min(lvl, 2)
            out.append((lvl, t, n))
    return out
def join(es):
    items = []  # [lvl, text, page]
    for lvl, t, n in es:
        if lvl == 2 and items: items[-1][1] += ' ' + t
        else: items.append([lvl, t, n])
    return items
REF = r'\d{1,2}-\d{1,2}(?:\*|"|”|°)*'
# --- works (text rules, not indents)
def norm(t):
    t = re.sub(r'\s+', ' ', t)
    for a,b in (('’',"'"),('‘',"'"),('“','"'),('”','"'),('нo','no'),('nо','no'),('oр','op'),('по','no'),('»','')): t = t.replace(a,b)
    return t
ENDREF = re.compile(r'(?:,"?\s*|^)((?:%s(?:,\s*)?)+)$' % REF)
COMP = re.compile(r"^[A-ZÀ-Ž][\w'éèáóöüřšç.-]+(?: [\w'éèáóöüřšç.-]+)*, [A-ZÀ-Ž][\w .'éèáóöüřšç-]*?(?: \(continued\))?$")
items = []
for lvl, t, n in entries('works'):
    t = norm(t).strip()
    if items and items[-1][0] == 'w' and (not ENDREF.search(items[-1][1]) or items[-1][1].rstrip().endswith(',')): items[-1][1] += ' ' + t; continue
    if COMP.match(t) and len(t) < 45 and not re.search(r'\d|"', t): items.append(['c', t, n])
    else: items.append(['w', t, n])
works = []; comp = None
for k, t, n in items:
    if k == 'c': comp = re.sub(r'\s*\(continued\)', '', t); continue
    m = re.match(r'(.*?),"?\s*((?:%s(?:,\s*)?)+)$' % REF, t)
    if not m: works.append(dict(composer=comp, title=t, refs=[], whole=[], page=n, bad=True)); continue
    refs = re.findall(REF, m.group(2)); title = m.group(1).strip()
    if title.count('"') % 2: title += '"'
    works.append(dict(composer=comp, title=title, refs=[r.rstrip('*"°') for r in refs], whole=[r.rstrip('*"°') for r in refs if r[-1] in '*"°'], page=n))
# --- concepts: wrapped lines start with a number / "(" / "through" or follow a comma; depth by indent relative to neighbours
import os; exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixes.py')).read())
used = set()
def fixlabel(t, n):
    for i, (pg, start, label) in enumerate(FIX):
        if pg != n or i in used: continue
        m = re.match(r'^(.{0,70}?),?\s*(' + re.escape(start).replace(r'\ ', r'\s*').replace(',', ',?') + ')', t)
        if m and not re.match(r'^\d{1,2}-\d', t):
            used.add(i); return label + ', ' + t[m.start(2):], True
        if m and m.group(1) == '' and False: pass
    return t, False
lines = []
for n, ls in cols():
    if n < 13: continue
    for x, t in ls:
        t = norm(t).strip()
        if re.search(r'Index of Concepts|intended to help|well as to provide|numbers are indicated|occurs several times', t) or re.fullmatch(r'[A-Z]', t): continue
        t, fixed = fixlabel(t, n)
        lines.append([x, t, n, fixed])
items = []  # [depth, text, page, x]
for x, t, n, fixed in lines:
    prev = items[-1] if items else None
    cont = prev and not fixed and (re.match(r'^(\d|\(|through|harmony |and |\d)', t) or prev[1].rstrip().endswith((',', ' and', ' with', 'through')) or (prev[3] is not None and 0.03 < x - prev[3] < 0.15 and prev[2] == n))
    if cont: prev[1] += ' ' + t; continue
    if prev is None or prev[2] != n and False: d = 0
    if not items: d = 0
    else:
        px, pd = prev[3], prev[0]
        if '(continued)' in t: d = 0 if 'V' not in t[:2] else 1
        elif prev[2] != n or abs(x - px) > 0.2: d = pd  # new column: same depth unless told
        elif x - px > 0.012: d = min(pd + 1, 2)
        elif px - x > 0.012: d = max(pd - round((px - x) / 0.02), 0)
        else: d = pd
    items.append([d, t, n, x])
open(out + '.items.txt', 'w').write('\n'.join(f"{n} {'  '*d}{t}" for d, t, n, x in items))
concepts = []; stack = []
for d, t, n, x in items:
    t = re.sub(r',(?=\d)', ', ', t)
    m = re.match(r'(.*?),?\s*(\d{1,2}-\d{1,2}.*)$', t)
    name, refstr = (m.group(1), m.group(2)) if m else (t, '')
    name = re.sub(r'\s*\(continued\)', '', name).strip().rstrip(',')
    stack = stack[:d] + [name]
    full = ' — '.join(stack)
    refs = []
    parts, depth, cur = [], 0, ''
    for ch in refstr:
        depth += ch == '('; depth -= ch == ')'
        if ch == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
    if refstr: parts.append(cur)
    for p in parts:
        p = p.strip()
        if not p: continue
        mm = re.match(r'(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})-(\d{1,2}))?(?:\s+through\s+(\d{1,2})-(\d{1,2}))?\s*(\(.*\))?$', p)
        if not mm: refs.append(dict(bad=p)); continue
        a, b = int(mm.group(1)), int(mm.group(2)); note = (mm.group(7) or '').strip('()')
        if mm.group(3): refs.append(dict(ref=f'{a}-{b}', note='')); a, b = int(mm.group(3)), int(mm.group(4))
        if mm.group(5):
            c, e = int(mm.group(5)), int(mm.group(6))
            if c != a: refs.append(dict(bad=p)); continue
            for k in range(b, e + 1): refs.append(dict(ref=f'{a}-{k}', note=note))
        else: refs.append(dict(ref=f'{a}-{b}', note=note))
    concepts.append(dict(term=full, label=name, depth=d, refs=refs, raw=refstr, page=n))
json.dump(dict(works=works, concepts=concepts), open(out, 'w'), indent=1, ensure_ascii=False)
print('works', len(works), 'bad', sum(1 for w in works if w.get('bad')))
print('fixes unused', [FIX[i] for i in range(len(FIX)) if i not in used]); print('concepts', len(concepts), 'bad refs', sum(1 for c in concepts for r in c['refs'] if 'bad' in r))
