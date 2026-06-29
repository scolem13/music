// Reading benchmarks — short sight-reading lines, NOT tunes. Kept separate from
// tunes-object.js and used by the Reading Benchmarks page (assessment tool only: no
// chord chart, no preview playback). Same shape as tunesObject: { setName: bigAbcString }
// with multiple X: blocks. Each line carries a stable %%id (rb-<set>-<n>).
const readingBenchmarks = {
"Benchmark 1A":
`
X:1
%%id rb-1a-1
T:Reading Benchmark 1A — Line 1
M:2/4
L:1/8
K:Eb
E2 G2 | BB B2 | B2 G2 | EE E2 |]

X:2
%%id rb-1a-2
T:Reading Benchmark 1A — Line 2
M:2/4
L:1/8
K:F
F2 FF | AA A2 | c2 A2 | AA F2 |]

X:3
%%id rb-1a-3
T:Reading Benchmark 1A — Line 3
M:2/4
L:1/8
K:Eb
E2 B2 | EG B2 | BG E2 | BG E2 |]

X:4
%%id rb-1a-4
T:Reading Benchmark 1A — Line 4
M:2/4
L:1/8
K:F
FA c2 | FA c2 | cA cA | Fc F2 |]

X:5
%%id rb-1a-5
T:Reading Benchmark 1A — Line 5
M:6/8
L:1/8
K:Eb
EEE G3 | GGG B3 | EEE G3 | EEE E3 |]

X:6
%%id rb-1a-6
T:Reading Benchmark 1A — Line 6
M:6/8
L:1/8
K:F
FFF c3 | FFF A3 | AAA ccc | F3 F3 |]

X:7
%%id rb-1a-7
T:Reading Benchmark 1A — Line 7
M:6/8
L:1/8
K:Eb
EEE G3 | BBB G3 | EEE GG G | BBB E3 |]

X:8
%%id rb-1a-8
T:Reading Benchmark 1A — Line 8
M:6/8
L:1/8
K:F
FFF c3 | FFF c3 | FFF AAA | ccc F3 |]

X:9
%%id rb-1a-9
T:Reading Benchmark 1A — Line 9
M:2/4
L:1/8
K:F
FF AA | c2 cc | AA FF | c2 F2 |]

X:10
%%id rb-1a-10
T:Reading Benchmark 1A — Line 10
M:6/8
L:1/8
K:Eb
EEE GGG | BBB G3 | EEE GGG | BBB E3 |]
`
};
// expose for app.js's config (window[source]); a top-level const isn't a window prop
if (typeof window !== "undefined") window.readingBenchmarks = readingBenchmarks;
