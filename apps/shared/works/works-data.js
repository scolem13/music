// works-data.js: one entry per piece, pointing at every collection it appears in, with its recordings and other resources.
// Read by works.js (the "Recordings & resources" panel on the Tune Library, Classical Themes and Analysed Scores, and the Tune
// Directory page). Edit by hand; `node scripts/works-suggest.mjs` lists pieces that seem to sit in more than one collection.
//
//   "<work-id>": {
//     title, composer, from (optional: the larger work, e.g. "Symphony No. 9"),
//     in: { tune: [Tune Library %%id …], theme: [Classical Themes id "0887" …],
//           analysed: [{ piece: data-piece, page: "theory/analysed-scores/<page>" } …] },
//     recordings: [ one of  yt: "<11-char video id or any YouTube URL>"  |  r2: "<path in the R2 bucket>"  |  url: "<any audio/video URL>",
//                   plus optional performer, year, start / end (seconds or "m:ss"), note, who: "student" | "teacher",
//                   draft: true (hidden from students: only the teacher's browser, ?teacher=1 once, shows it),
//                   timing: "<Timestamp Notes song file URL>", bar1 (recording bar of the score's bar 1, default 1): the score plays the
//                   recording instead of the synth, lighting each bar (rec-sync.js),
//                   marks: [["m:ss", "note"] …] (audio only: a ⏱ button opens it in Timestamp Notes at start with these stamps) ],
//     links: [ { type: "article" | "video" | "lesson" | "sheet" | "other", title, url, note, who } ]
//   }
// r2 paths are read against WORKS_CONFIG.r2Base (works.js), so the bucket's address is set once.
// A source that is cited, not just linked, also goes in scripts/works-cited.py.
window.WORKS = {
  "beethoven-moonlight-sonata-1": {
    "title": "Piano Sonata No. 14 in C-sharp minor, Op. 27 No. 2 (\"Moonlight\"), 1st movement",
    "composer": "Ludwig van Beethoven",
    "in": {
      "theme": [
        "0887"
      ],
      "analysed": [
        {
          "piece": "beethoven-moonlight-1",
          "page": "theory/analysed-scores/beethoven-moonlight-1"
        }
      ]
    },
    "recordings": [
      {
        "r2": "works/beethoven-moonlight/schoenhals.mp3",
        "performer": "Joel Schoenhals",
        "title": "Beethoven, \"Moonlight\" Sonata (Joel Schoenhals)",
        "start": "0:30",
        "end": "7:34",
        "note": "the whole sonata; the first movement is 0:30–7:34",
        "draft": true,
        "marks": [["0:00", "Audience noise"], ["0:30", "Almost ready -- please mark measure 1"], ["7:34", "End of Mvt 1"]]
      }
    ],
    "links": []
  },
  "autumn-leaves": {
    "title": "Autumn Leaves",
    "composer": "Joseph Kosma",
    "in": {
      "tune": [
        "autumn-leaves",
        "autumn-leaves-2",
        "autumn-leaves-3",
        "autumn-leaves-4"
      ]
    },
    "recordings": [],
    "links": []
  },
  "bach-concerto-in-a-minor-0172": {
    "title": "Concerto in A minor, 1st Movement",
    "composer": "Johann Sebastian Bach",
    "in": {
      "theme": [
        "0172"
      ]
    },
    "recordings": [
      {
        "yt": "vcBJLdKtaOQ"
      }
    ]
  },
  "bach-english-suite-no-3-0340": {
    "title": "English Suite No. 3, in G minor, Piano, Sarabande",
    "composer": "Johann Sebastian Bach",
    "in": {
      "theme": [
        "0340"
      ]
    },
    "recordings": [
      {
        "yt": "HhCdAfkC8ak",
        "start": 610
      }
    ]
  },
  "bach-well-tempered-clavichord-0394": {
    "title": "Well-Tempered Clavichord, Book I, Prelude No. 1",
    "composer": "Johann Sebastian Bach",
    "in": {
      "theme": [
        "0394"
      ]
    },
    "recordings": [
      {
        "yt": "bWEKAZT0QT8"
      }
    ]
  },
  "bach-well-tempered-clavichord-0407": {
    "title": "Well-tempered Clavichord, Book I, Fugue No. 7",
    "composer": "Johann Sebastian Bach",
    "in": {
      "theme": [
        "0407"
      ]
    },
    "recordings": [
      {
        "yt": "d0jne4Rsk6Y",
        "start": 214
      }
    ]
  },
  "beethoven-quartet-in-c-0726": {
    "title": "Quartet in C, Op. 59, No. 3 - 4th Movement",
    "composer": "Ludwig Van Beethoven",
    "in": {
      "theme": [
        "0726"
      ]
    },
    "recordings": [
      {
        "yt": "CNXE42waoy8"
      }
    ]
  },
  "beethoven-quartet-in-b-flat-0747": {
    "title": "Quartet in B-flat, Op. 130, 3rd Movement",
    "composer": "Ludwig Van Beethoven",
    "in": {
      "theme": [
        "0747"
      ]
    },
    "recordings": [
      {
        "yt": "f7jpSN8BDug",
        "start": 911
      }
    ]
  },
  "beethoven-symphony-no-3-1045": {
    "title": "Symphony No. 3, in E-flat, Op. 55, 1st Movement - 4th Theme",
    "composer": "Ludwig Van Beethoven",
    "in": {
      "theme": [
        "1045"
      ]
    },
    "recordings": [
      {
        "yt": "by2TA_yDlJg",
        "start": 4
      }
    ]
  },
  "beethoven-symphony-no-5-1074": {
    "title": "Symphony No. 5, in C minor, Op. 67, 1st Movement - 1st Theme C",
    "composer": "Ludwig Van Beethoven",
    "in": {
      "theme": [
        "1074"
      ]
    },
    "recordings": [
      {
        "yt": "fOk8Tm815lE",
        "start": 46
      }
    ]
  },
  "beethoven-symphony-no-8-1136": {
    "title": "Symphony No. 8, in F, Op. 93, 3rd Movement - 2nd Theme",
    "composer": "Ludwig Van Beethoven",
    "in": {
      "theme": [
        "1136"
      ]
    },
    "recordings": [
      {
        "yt": "dSmrReHQuak",
        "start": 151
      }
    ]
  },
  "dvorak-slavonic-dances-1315": {
    "title": "Slavonic Dances, Op. 72, No. 7, 2nd Theme",
    "composer": "Antonin Dvořák",
    "in": {
      "theme": [
        "1315"
      ]
    },
    "recordings": [
      {
        "yt": "M9CQ-r4kMwE",
        "start": 44
      }
    ]
  },
  "khachaturian-concerto-3201": {
    "title": "Concerto, 1st Movement - 1st Theme A",
    "composer": "Aram Khachaturian",
    "in": {
      "theme": [
        "3201"
      ]
    },
    "recordings": [
      {
        "yt": "KGtrkHG5ZN8"
      }
    ]
  },
  "kodaly-galanta-dances-3239": {
    "title": "Galanta Dances, Orchestra, 4th Movement - 2nd Theme",
    "composer": "Zoltán Kodály",
    "in": {
      "theme": [
        "3239"
      ]
    },
    "recordings": [
      {
        "yt": "XmkUNXv-xY4",
        "start": 105
      }
    ]
  },
  "kodaly-galanta-dances-3240": {
    "title": "Galanta Dances, Orchestra, 5th Movement - 1st Theme",
    "composer": "Zoltán Kodály",
    "in": {
      "theme": [
        "3240"
      ]
    },
    "recordings": [
      {
        "yt": "fwJPPyYT6Ho"
      }
    ]
  },
  "mendelssohn-concerto-in-e-minor-3823": {
    "title": "Concerto in E minor, Op. 64, 1st Movement - 3rd Theme",
    "composer": "Felix Mendelssohn",
    "in": {
      "theme": [
        "3823"
      ]
    },
    "recordings": [
      {
        "yt": "ZwW4oruwyJU",
        "start": 2
      }
    ]
  },
  "mozart-concerto-in-d-minor-4096": {
    "title": "Concerto in D minor, K 466, 1st Movement - 1st Theme",
    "composer": "Wolfgang Amadeus Mozart",
    "in": {
      "theme": [
        "4096"
      ]
    },
    "recordings": [
      {
        "yt": "UGldgW6mDnY"
      }
    ]
  },
  "rameau-les-sauvages-5236": {
    "title": "Les Sauvages",
    "composer": "Jean Philippe Rameau",
    "in": {
      "theme": [
        "5236"
      ]
    },
    "recordings": [
      {
        "yt": "FxyC-A2oQcw"
      }
    ]
  },
  "saint-saens-concerto-no-1-5601": {
    "title": "Concerto No. 1, in A minor, Op. 33, 1st Movement - 1st Theme",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5601"
      ]
    },
    "recordings": [
      {
        "yt": "Cx6UDgi9TEA",
        "start": 20
      }
    ]
  },
  "saint-saens-concerto-no-1-5602": {
    "title": "Concerto No. 1, in A minor, Op. 33, 1st Movement - 2nd Theme",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5602"
      ]
    },
    "recordings": [
      {
        "yt": "sru18UyAweA",
        "start": 2
      }
    ]
  },
  "saint-saens-concerto-no-1-5603": {
    "title": "Concerto No. 1, in A minor, Op. 33, 2nd Movement",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5603"
      ]
    },
    "recordings": [
      {
        "yt": "sru18UyAweA",
        "start": 8
      }
    ]
  },
  "saint-saens-concerto-no-1-5604": {
    "title": "Concerto No. 1, in A minor, Op. 33, 3rd Movement - 1st Theme",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5604"
      ]
    },
    "recordings": [
      {
        "yt": "0pNlo2XlOlQ",
        "start": 1
      }
    ]
  },
  "saint-saens-concerto-no-1-5605": {
    "title": "Concerto No. 1, in A minor, Op. 33, 3rd Movement - 2nd Theme",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5605"
      ]
    },
    "recordings": [
      {
        "yt": "0pNlo2XlOlQ",
        "start": 4
      }
    ]
  },
  "saint-saens-concerto-no-1-5606": {
    "title": "Concerto No. 1, in A minor, Op. 33, 3rd Movement - Coda",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5606"
      ]
    },
    "recordings": [
      {
        "yt": "0pNlo2XlOlQ",
        "start": 7
      }
    ]
  },
  "saint-saens-septet-5674": {
    "title": "Septet, Op. 65, 1st Movement - Preambule",
    "composer": "Camille Saint-Saëns",
    "in": {
      "theme": [
        "5674"
      ]
    },
    "recordings": [
      {
        "yt": "z7-M8kcQmU8",
        "start": 66
      }
    ]
  },
  "schubert-impromptus-5889": {
    "title": "Impromptus, Op. 90, No. 4, in A-flat, 1st Theme",
    "composer": "Franz Schubert",
    "in": {
      "theme": [
        "5889"
      ]
    },
    "recordings": [
      {
        "yt": "KdnETWq7rcY"
      }
    ]
  },
  "schubert-sonata-in-b-flat-6025": {
    "title": "Sonata in B-flat, 3rd Movement",
    "composer": "Franz Schubert",
    "in": {
      "theme": [
        "6025"
      ]
    },
    "recordings": [
      {
        "yt": "zD12AOCty0Q"
      }
    ]
  },
  "schumann-album-for-the-young-6173": {
    "title": "Album for the Young, Op. 68, The Wild Horseman",
    "composer": "Robert Schumann",
    "in": {
      "theme": [
        "6173"
      ]
    },
    "recordings": [
      {
        "yt": "IOLWuBCZj88"
      }
    ]
  },
  "scriabin-etudes-6412": {
    "title": "Etudes, Op. 2, No. 1",
    "composer": "Alexander Scriabin",
    "in": {
      "theme": [
        "6412"
      ]
    },
    "recordings": [
      {
        "yt": "NSsKJIzwapA"
      }
    ]
  },
  "shostakovich-symphony-no-5-6498": {
    "title": "Symphony No. 5, Op. 47, 4th Movement",
    "composer": "Dmitri Shostakovich",
    "in": {
      "theme": [
        "6498"
      ]
    },
    "recordings": [
      {
        "yt": "n0iqZbM1Pdc"
      }
    ]
  },
  "turina-fandanguillo-7645": {
    "title": "Fandanguillo, Guitar, 1st Theme",
    "composer": "Joaquín Turina",
    "in": {
      "theme": [
        "7645"
      ]
    },
    "recordings": [
      {
        "yt": "1Tqh6_e_X5s",
        "start": 32
      }
    ]
  },
  "turina-fandanguillo-7646": {
    "title": "Fandanguillo, Guitar, 2nd Theme",
    "composer": "Joaquín Turina",
    "in": {
      "theme": [
        "7646"
      ]
    },
    "recordings": [
      {
        "yt": "1Tqh6_e_X5s",
        "start": 2
      }
    ]
  },
  "brahms-symphony-no-4-in-e-minor-8775": {
    "title": "Symphony No. 4 in E minor, Op. 98, 2nd Movement - 1st Theme",
    "composer": "Johannes Brahms",
    "in": {
      "theme": [
        "8775"
      ]
    },
    "recordings": [
      {
        "yt": "Bo_UVzFQ7DE"
      }
    ]
  },
  "brahms-symphony-no-4-in-e-minor-8776": {
    "title": "Symphony No. 4 in E minor, Op. 98, 2nd Movement - 2nd Theme",
    "composer": "Johannes Brahms",
    "in": {
      "theme": [
        "8776"
      ]
    },
    "recordings": [
      {
        "yt": "Bo_UVzFQ7DE",
        "start": 3
      }
    ]
  },
  "brahms-symphony-no-4-in-e-minor-8777": {
    "title": "Symphony No. 4 in E minor, Op. 98, 2nd Movement - 3rd Theme",
    "composer": "Johannes Brahms",
    "in": {
      "theme": [
        "8777"
      ]
    },
    "recordings": [
      {
        "yt": "Bo_UVzFQ7DE",
        "start": 9
      }
    ]
  },
  "chopin-nocturnes-9267": {
    "title": "Nocturnes, Op. 72, No. 1 in E minor",
    "composer": "Frederic Chopin",
    "in": {
      "theme": [
        "9267"
      ]
    },
    "recordings": [
      {
        "yt": "3iH1ONnXrdY"
      }
    ]
  },
  "chopin-waltzes-9343": {
    "title": "Waltzes, Op. 64, No. 2 in C-sharp minor, Theme A",
    "composer": "Frederic Chopin",
    "in": {
      "theme": [
        "9343"
      ]
    },
    "recordings": [
      {
        "yt": "hOcryGEw1NY"
      }
    ]
  },
  "chopin-waltzes-9344-1": {
    "title": "Waltzes, Op. 64, No. 2 in C-sharp minor, Theme B (part 1)",
    "composer": "Frederic Chopin",
    "in": {
      "theme": [
        "9344-1"
      ]
    },
    "recordings": [
      {
        "yt": "hOcryGEw1NY",
        "start": 47
      }
    ]
  },
  "debussy-serenade-of-the-doll-9601": {
    "title": "Serenade of the Doll",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9601"
      ]
    },
    "recordings": [
      {
        "yt": "GsfRAYnBjCw"
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-perfumes-of-the-night-2nd-mov": {
    "title": "Les Parfums de La Nuit (Perfumes of the Night) - 2nd Movement - Intro",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9630"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 420
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9631": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 1st Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9631"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 507
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9632": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 2nd Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9632"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 541
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9633": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 3rd Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9633"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 649
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9634": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 4th Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9634"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 707
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9635": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 5th Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9635"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 785
      }
    ]
  },
  "debussy-les-parfums-de-la-nuit-2nd-movement-9636": {
    "title": "Les Parfums de La Nuit - 2nd Movement, 6th Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9636"
      ]
    },
    "recordings": [
      {
        "yt": "8v0LGIuhOsU",
        "start": 827
      }
    ]
  },
  "debussy-jeux-de-vagues-9654": {
    "title": "Jeux De Vagues, 2nd Movement - 3rd Theme",
    "composer": "Claude Debussy",
    "in": {
      "theme": [
        "9654"
      ]
    },
    "recordings": [
      {
        "yt": "xzzC1iE0RGs",
        "start": 723
      }
    ]
  }
};
