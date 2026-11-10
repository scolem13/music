# midi-structure.py: read a piece's bar plan from a Mutopia LilyPond file's MIDI export (no MusicXML needed).
#   lilypond -o out file.ly            (writes out.midi, or out-1.midi when the file has several scores)
#   python3 -m venv v; v/bin/pip install mido; v/bin/python scripts/mutopia/midi-structure.py out.midi <pickup quarters> <quarters per bar>
# Prints: bar count; where the opening bars recur (same top-voice notes); rough key regions per two bars (Krumhansl-Schmuckler profile, so
# G# / Ab are spelled one way; UNVERIFIED, a guide to listen with); and, for chosen bar ranges, where the same notes recur transposed.
# Used for theory/sonata-rondo.qmd (Pathetique III: pickup 1.5, bar 4; Moonlight III: pickup 0, bar 4). Why not MusicXML: research_notes/pdmx-conversion.org.
import mido,collections,math,sys
f,P,BQ=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
m=mido.MidiFile(f); tpb=m.ticks_per_beat
def notes(tr):
    t=0; on={}; out=[]
    for msg in tr:
        t+=msg.time
        if msg.type=='note_on' and msg.velocity>0: on[msg.note]=t
        elif msg.type in('note_off','note_on') and msg.note in on: out.append((on.pop(msg.note)/tpb,t/tpb,msg.note))
    return sorted(out)
tr=[t for t in m.tracks if t.name.startswith(('up','down'))]
up,dn=notes(tr[0]),notes(tr[1])
def bar(o): return 0 if o<P-1e-6 else int((o-P+1e-6)//BQ)+1
d=collections.defaultdict(list)
for o,e,n in up: d[round(o,3)].append(n)
U=collections.defaultdict(list)
for o in sorted(d): U[bar(o)].append((round((o-P)%BQ if bar(o)>0 else o,2),max(d[o])))
nb=max(U); print('bars',nb,'end quarter',up[-1][1])
sig=lambda b: tuple(U.get(b,[]))
def runs(off):
    r=[];cur=None
    for b in range(1,nb+1):
        ok=b-off>=1 and sig(b)==sig(b-off) and sig(b)
        if ok: cur=[b,b] if cur is None else [cur[0],b]
        elif cur: r.append(tuple(cur)); cur=None
    if cur: r.append(tuple(cur))
    return [x for x in r if x[1]-x[0]>=1]
for k in (1,2,3,4):
    print('bar',k,'recurs at',[b for b in range(1,nb+1) if sig(b)==sig(k) and sig(k)])
MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]; MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
NAMES="C C# D Eb E F F# G Ab A Bb B".split()
def corr(a,b):
    ma,mb=sum(a)/12,sum(b)/12; return sum((x-ma)*(y-mb) for x,y in zip(a,b))/math.sqrt(sum((x-ma)**2 for x in a)*sum((y-mb)**2 for y in b))
al=up+dn
def key(b0,b1):
    h=[0]*12
    for o,e,n in al:
        if b0<=bar(o)<=b1: h[n%12]+=e-o
    return max(((corr(h,[p[(i-k)%12] for i in range(12)]),NAMES[k]+(' maj' if p is MAJ else ' min')) for k in range(12) for p in (MAJ,MIN)))[1]
out=[]
for b in range(1,nb+1,2):
    k=key(b,b+1)
    if out and out[-1][2]==k: out[-1][1]=b+1
    else: out.append([b,b+1,k])
print(out)
print('--- transposed recurrences')
def best_shift(lo,hi):
    res=[]
    for off in range(20,200):
        for sh in range(-12,13):
            ok=0
            for b in range(lo,hi+1):
                a=U.get(b,[]); c=U.get(b+off,[])
                if len(a)>3 and len(a)==len(c) and all(x[0]==y[0] and y[1]-x[1]==sh for x,y in zip(a,c)): ok+=1
            if ok>=max(4,(hi-lo+1)//2): res.append((ok,off,sh))
    return sorted(res,reverse=True)[:3]
for lo,hi in ((19,30),(31,46),(47,58),(59,64),(65,78),(79,102)):
    print(lo,hi,best_shift(lo,hi))
