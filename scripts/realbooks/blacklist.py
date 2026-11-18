#!/usr/bin/env python3
"""Which book NOT to transcribe a tune from, when it is in several.

Assumptions (the user's, 2026-11-17): every Sher book is accurate; other fake books are lower
quality than "real books". Ranking below is mine and unverified beyond that:
  5 Sher Music Co. books
  4 printed Real Books (Hal Leonard), Berklee, Real Pop / Vocal / Easy / Christmas, composer books by Hal Leonard
  3 the original handwritten bootleg Real Books (known to carry errors, but still "real books")
  2 fake books with some editorial care (Hal Leonard fake books, Open Book, themed books)
  1 bootleg / library / sheet-copy fake books
Per tune: among the distinct books holding it, the lowest rank is blacklisted (one book per tune).
Ties: handwritten scan before printed, then the lower book number.
Writes apps/realbooks/blacklist.json.   python3 -I scripts/realbooks/blacklist.py
"""
import json, os
R = os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'realbooks')
s = open(os.path.join(R, 'catalogue-data.js')).read()
d = json.loads(s[s.index('=') + 1:].rstrip().rstrip(';'))
books = d['books']

RANK = {
 # 5 Sher
 'Standards_Real_Book.pdf':5,'New_Real_Book_Volume1.pdf':5,'New_Real_Book_Volume2.pdf':5,'New_Real_Book_Volume3.pdf':5,
 'Latin-Real-Book.pdf':5,'All_Jazz_Real_Book.pdf':5,'Brazilian-Real-Book.pdf':5,
 # 4 printed Real Books
 'Real_Book_All_New_Vol3.pdf':4,'Real_Book_Bb3.pdf':4,'The Berklee Real Book.pdf':4,'real-easy-book-c.pdf':4,
 'The Real Pop Book - Volume 2 C Instruments (Hal Leonard Corp).pdf':4,'The Real pop Book.pdf':4,
 'The real book. Volume IV, C instruments. (Hal Leonard).pdf':4,
 'The Real Book - Volume V C Edition 5 (Real Books (Hal Leonard).pdf':4,
 'The Real Book Volume VI C Instruments - Hal Leonard.pdf':4,
 'The Real Christmas Book C Edition (Hal Leonard).pdf':4,'Duke_Ellington_Real_Book.pdf':4,
 'KeithJarrettRealBook.pdf':4,
 # 3 original handwritten Real Books
 'Real_Book1_5thEdition.pdf':3,'Real_Book_Bb2.pdf':3,'Real_Book_Eb2.pdf':3,'Real_Book_Bass2.pdf':3,
 'Real_Book_Bb5.pdf':3,'Real_Book_Bass5.pdf':3,'Real_Vocal_Book.pdf':3,'The_Book.pdf':3,
 # 2 fake books with some care
 'openbook.pdf':2,'Classic rock fake book.pdf':2,'The Disney Fake Book, 2nd Edition (Hal Leonard Corp).pdf':2,
 'The ultimate rock pop fake book melody, lyrics, chords for all C instruments (Hal Leonard Publishing Corporation) (z-library.sk, 1lib.sk, z-lib.sk).pdf':2,
 'UPRFB.pdf':2,'Bill_Evans_Fake_Book.pdf':2,'Thelonious_Monk_Fake_Book.pdf':2,'Just_Standards_Real_Book.pdf':2,
 'Henry_Mancini_Songbook.pdf':2,'nat-king-cole-songook.pdf':2,'PublicDomainChristmasFakebook.pdf':2,
 'Django_Fake_Book.pdf':2,'Dixieland-C-Book.pdf':2,'New_Orleans_Jam_Book.pdf':2,'Cuban_Fake_Book.pdf':2,
 '50s_Jazz_Fake_Book.pdf':2,'All_Time_Best_Volume3.pdf':2,'TV_Guide_Fake_Book.pdf':2,'The_New_Bob_Book.pdf':2,
 # 1 bootleg / library / sheet copies
 'The_Colorado_Cookbook.pdf':1,'Legit_Professional_Real_Book.pdf':1,'Jazz_Fake_Book.pdf':1,
 'TheOriginalLegalMusicianFakeBook.pdf':1,'Worlds_Greatest_Fake_Book.pdf':1,'Library_Fake_Book.pdf':1,
 'latin-fake-book_compress.pdf':1,'DixielandJazzStandards.pdf':1,'Jazz_LTD_Fake_Book.pdf':1,
 'Jazz_Solos_Fake_Book.pdf':1,'Thelonious_Monk_Compositions.pdf':1,
}
missing = [b['file'] for b in books if b['file'] not in RANK]
assert not missing, missing

def worst_key(i):
    b = books[i]
    return (RANK[b['file']], 0 if b.get('hand') else 1, -i)   # smallest = worst

out = {}
for t in d['tunes']:
    pages = {}
    for a in t['at']:
        pages.setdefault(a[0], a)
    if len(pages) < 2: continue
    bad = min(pages, key=worst_key)
    out[t['t']] = {
        'blacklist': books[bad]['title'],
        'blacklistFile': books[bad]['file'],
        'blacklistPdfPage': pages[bad][1],
        'keep': [{'book': books[i]['title'], 'file': books[i]['file'], 'rank': RANK[books[i]['file']], 'pdfPage': pages[i][1]}
                 for i in sorted(pages, key=lambda i: -worst_key(i)[0]) if i != bad],
    }
json.dump({'note': __doc__, 'rank': {books[i]['title']: RANK[books[i]['file']] for i in range(len(books))},
           'tunes': out}, open(os.path.join(R, 'blacklist.json'), 'w'), indent=1, ensure_ascii=False)
import collections
print(len(out), 'tunes in 2+ books')
print(collections.Counter(v['blacklist'] for v in out.values()).most_common(12))
