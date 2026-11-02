import json, re, sys, collections
d = json.load(open(sys.argv[1]))
TYPO = {'Lobengrin':'Lohengrin','Elijab':'Elijah','Jobn':'John','Ihe ':'The ','Iwo ':'Two ','Majox':'Major','Silbouettes':'Silhouettes','Worid':'World','Buseb':'Busen','Willibaid':'Willibald',' myt.':' mvt.','Ihree':'Three'}
for w in d['works']:
    for a, b in TYPO.items(): w['title'] = w['title'].replace(a, b); w['composer'] = w['composer'].replace(a, b)
    # flats read as 6 / o / b, sharps as #: the book prints the signs
    w['title'] = re.sub(r'\b([A-G])[6ob0](?= (Major|Minor|major|minor)\b)', r'\1♭', w['title'])
    w['title'] = re.sub(r'\b([A-G])#(?= (Major|Minor|major|minor)\b)', r'\1♯', w['title'])
    w['title'] = re.sub(r'\b(op|no), (\d)', r'\1. \2', w['title'])
for w in d['works']:
    if w['title'].startswith('Cello Suite no. 1') and 'Menuet' in w['title']:
        w['title'] = w['title'].replace('I1', 'II'); w['refs'] = ['28-19']; w['note'] = 'Printed 28-18 in the works index; the concepts index and the Chopin prelude make it 28-19.'
C = d['concepts']; out = []
for i, c in enumerate(C):
    lab = c['label'].replace('cadential 4', 'cadential 6/4').replace('between V4 and', 'between V6/4 and')
    if lab == '4 techniques': lab = '6/4 techniques'
    if lab == 'cadential 4': lab = 'cadential 6/4'
    if lab in ('ascending', 'descending') and c['refs'] and c['refs'][0]['ref'] == '5-6': lab += ' 5-6'; c['refs'] = c['refs'][1:]
    if lab == 'enharmonic, German augmented sixths and the dominant': continue
    if lab == 'seventh': lab = 'enharmonic, German augmented sixths and the dominant seventh'; c['depth'] = 1
    if lab == 'Phrygian cadences' and c['depth'] == 2: continue
    if lab == 'whole-tone collections': c['depth'] = 0
    c['refs'] = [r for r in c['refs'] if 'bad' not in r]
    if c['raw'].find('10-4. 10-7') >= 0: c['refs'] += [{'ref':'10-4','note':''},{'ref':'10-7','note':''}]
    c['label'] = lab; out.append(c)
# rebuild full names; merge "(continued)" repeats
stack = []; merged = collections.OrderedDict()
for c in out:
    stack = stack[:c['depth']] + [c['label']]
    term = ' › '.join(stack)
    m = merged.setdefault(term, dict(term=term, label=c['label'], depth=c['depth'], parent=' › '.join(stack[:-1]), refs=[], see=''))
    m['refs'] += c['refs']
    s = re.search(r',? see (.*)$', c['label'])
    if s: m['see'] = s.group(1); m['label'] = c['label'][:s.start()]
concepts = list(merged.values())
byref = collections.defaultdict(list)
for c in concepts:
    for r in c['refs']: byref[r['ref']].append(dict(term=c['term'], note=r['note']))
wref = {}
for w in d['works']:
    for r in w['refs']: wref.setdefault(r, []).append(w)
orph = sorted(set(byref) - set(wref), key=lambda r: tuple(map(int, r.split('-'))))
print('works', len(d['works']), 'figures', len(wref), 'concepts', len(concepts), 'concept refs', sum(len(c['refs']) for c in concepts))
print('figures cited by concepts but in no work:', orph)
dup = {r: [w['title'] for w in ws] for r, ws in wref.items() if len(ws) > 1}
print('figures given to 2+ works:', dup)
json.dump(dict(works=d['works'], concepts=concepts, byref=byref), open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
