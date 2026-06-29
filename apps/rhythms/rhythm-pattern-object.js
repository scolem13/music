const patternObject = {

// Duple, macrobeats and microbeats

"Duple-M-m-2-4":
`X:1
M:2/4
L: 1/4
K: clef=none
B B/B/ | B B/B/|

X:2
M:2/4
L:1/4
K: clef=none
B/B/ B | B B/B/|

X:3
M:2/4
L:1/4
K: clef=none
B/B/B/B/ | B/B/ B|

X:4
M:2/4
L:1/4
K: clef=none
B/B/ B | B/B/B/B/|

X:5
M:2/4
L:1/4
K: clef=none
B/B/ B | B/B/ B|

X:6
M:2/4
L:1/4
K: clef=none
B B/B/ | B/B/ B|

X:7
M:2/4
L:1/4
K: clef=none
B/B/B/B/ | B B/B/|

X:8
M:2/4
L:1/4
K: clef=none
B B/B/ |B/B/B/B/|


`,

"Duple-M-m-4-4":
`X:1
M: 4/4
L: 1/4
K: clef=none
B B/B/ B B/B/|

X:2
M:4/4
L:1/4
K: clef=none
B/B/ B B B/B/|

X:3
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B/B/ B|

X:4
M:4/4
L:1/4
K: clef=none
B/B/ B B/B/B/B/|

X:5
M:4/4
L:1/4
K: clef=none
B/B/ B B/B/ B|

X:6
M:4/4
L:1/4
K: clef=none
B B/B/ B/B/ B|

X:7
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B B/B/|

X:8
M:4/4
L:1/4
K: clef=none
B B/B/ B/B/B/B/|


`,

"Duple-M-m-2-2":
`X:1
M:2/2
L:1/2
K: clef=none
B B/B/ | B B/B/|

X:2
M:2/2
L:1/2
K: clef=none
B/B/ B | B B/B/|

X:3
M:2/2
L:1/2
K: clef=none
B/B/B/B/ | B/B/ B|

X:4
M:2/2
L:1/2
K: clef=none
B/B/ B | B/B/B/B/|

X:5
M:2/2
L:1/2
K: clef=none
B/B/ B | B/B/ B|

X:6
M:2/2
L:1/2
K: clef=none
B B/B/ | B/B/ B|

X:7
M:2/2
L:1/2
K: clef=none
B/B/B/B/ | B B/B/|

X:8
M:2/2
L:1/2
K: clef=none
B B/B/ | B/B/B/B/|


`,

// Triple, macrobeats and microbeats

"Triple-M-m-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
BBB B3 | BBB B3 |

X:2
M: 6/8
L: 1/8
K: clef=none
B3 BBB | BBB B3 |

X:3
M: 6/8
L: 1/8
K: clef=none
BBB BBB | BBB B3 |

X:4
M: 6/8
L: 1/8
K: clef=none
BBB B3 | BBB BBB |

X:5
M: 6/8
L: 1/8
K: clef=none
B3 BBB |B3 BBB|

X:6
M: 6/8
L: 1/8
K: clef=none
BBB B3 | B3 BBB|

X:7
M: 6/8
L: 1/8
K: clef=none
BBB BBB | B3 BBB|

X:8
M: 6/8
L: 1/8
K: clef=none
B3 BBB | BBB BBB |

`,

"Triple-M-m-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | BBB | B3 |

X:2
M: 3/8
L: 1/8
K: clef=none
B3 | BBB | BBB | B3 |

X:3
M: 3/8
L: 1/8
K: clef=none
BBB | BBB | BBB | B3 |

X:4
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | BBB | BBB |

X:5
M: 3/8
L: 1/8
K: clef=none
B3 | BBB |B3 | BBB|

X:6
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | B3 | BBB|

X:7
M: 3/8
L: 1/8
K: clef=none
BBB | BBB | B3 | BBB|

X:8
M: 3/8
L: 1/8
K: clef=none
B3 | BBB | BBB | BBB |

`,

"Triple-M-m-3/4":
`X:1
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | BBB | B3 |

X:2
M: 3/4
L: 1/4
K: clef=none
B3 | BBB | BBB | B3 |

X:3
M: 3/4
L: 1/4
K: clef=none
BBB | BBB | BBB | B3 |

X:4
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | BBB | BBB |

X:5
M: 3/4
L: 1/4
K: clef=none
B3 | BBB |B3 | BBB|

X:6
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | B3 | BBB|

X:7
M: 3/4
L: 1/4
K: clef=none
BBB | BBB | B3 | BBB|

X:8
M: 3/4
L: 1/4
K: clef=none
B3 | BBB | BBB | BBB |

`,

// Duple, add divisions

"Duple-M-m-D-2/4":
`X:1
M: 2/4
L: 1/8
K: clef=none
B/B/B B2 | B/B/B BB |

X:2
M: 2/4
L: 1/8
K: clef=none
B/B/B BB | B/B/B/B/ B2 |

X:3
M: 2/4
L: 1/8
K: clef=none
BB/B/ B/B/B | B/B/B/B/ BB |

X:4
M: 2/4
L: 1/8
K: clef=none
BB BB/B/ | B/B/B BB |

X:5
M: 2/4
L: 1/8
K: clef=none
B/B/B/B/ B2 | B/B/B/B/ BB |

X:6
M: 2/4
L: 1/8
K: clef=none
BB/B/ BB/B/ | BB/B/ BB |

X:7
M: 2/4
L: 1/8
K: clef=none
B/B/B BB/B/ | B/B/B B2 |

X:8
M: 2/4
L: 1/8
K: clef=none
BB/B/ B/B/B/B/ | BB B2 |

`,

"Duple-M-m-D-4/4":
`X:1
M: 4/4
L: 1/8
K: clef=none
B/B/B B2  B/B/B BB |

X:2
M: 4/4
L: 1/8
K: clef=none
B/B/B BB  B/B/B/B/ B2 |

X:3
M: 4/4
L: 1/8
K: clef=none
BB/B/ B/B/B  B/B/B/B/ BB |

X:4
M: 4/4
L: 1/8
K: clef=none
BB BB/B/  B/B/B BB |

X:5
M: 4/4
L: 1/8
K: clef=none
B/B/B/B/ B2  B/B/B/B/ BB |

X:6
M: 4/4
L: 1/8
K: clef=none
BB/B/ BB/B/  BB/B/ BB |

X:7
M: 4/4
L: 1/8
K: clef=none
B/B/B BB/B/  B/B/B B2 |

X:8
M: 4/4
L: 1/8
K: clef=none
BB/B/ B/B/B/B/  BB B2 |

`,

"Duple-M-m-D-2/2":
`X:1
M: 2/2
L: 1/4
K: clef=none
B/B/B B2 | B/B/B BB |

X:2
M: 2/2
L: 1/4
K: clef=none
B/B/B BB | B/B/B/B/ B2 |

X:3
M: 2/2
L: 1/4
K: clef=none
BB/B/ B/B/B | B/B/B/B/ BB |

X:4
M: 2/2
L: 1/4
K: clef=none
BB BB/B/ | B/B/B BB |

X:5
M: 2/2
L: 1/4
K: clef=none
B/B/B/B/ B2 | B/B/B/B/ BB |

X:6
M: 2/2
L: 1/4
K: clef=none
BB/B/ BB/B/ | BB/B/ BB |

X:7
M: 2/2
L: 1/4
K: clef=none
B/B/B BB/B/ | B/B/B B2 |

X:8
M: 2/2
L: 1/4
K: clef=none
BB/B/ B/B/B/B/ | BB B2 |

`,

// Triple, add divisions

"Triple-M-m-D-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
B/B/BB B/B/BB | B/B/BB BBB |

X:2
M: 6/8
L: 1/8
K: clef=none
BBB/B/ BBB/B/ | BBB/B/ BBB|

X:3
M: 6/8
L: 1/8
K: clef=none
B/B/BB/B/ B3 | B/B/BB/B/ BBB |

X:4
M: 6/8
L: 1/8
K: clef=none
B/B/B/B/B/B/ B3 | B/B/B/B/B/B/ BBB |

X:5
M: 6/8
L: 1/8
K: clef=none
BB/B/B B3 | BB/B/B BBB |

X:6
M: 6/8
L: 1/8
K: clef=none
B/B/B/B/B B3 | B/B/B/B/B BBB |

X:7
M: 6/8
L: 1/8
K: clef=none
BB/B/B/B/ BB/B/B/B/ | B/B/B/B/B/B/ BBB |

X:8
M: 6/8
L: 1/8
K: clef=none
B/B/BB/B/ B/B/BB/B/ | B/B/B/B/B/B/ BBB |

`,

"Triple-M-m-D-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
B/B/BB |B/B/BB | B/B/BB| BBB |

X:2
M: 3/8
L: 1/8
K: clef=none
BBB/B/| BBB/B/ | BBB/B/| BBB|

X:3
M: 3/8
L: 1/8
K: clef=none
B/B/BB/B/| B3 | B/B/BB/B/| BBB |

X:4
M: 3/8
L: 1/8
K: clef=none
B/B/B/B/B/B/| B3 | B/B/B/B/B/B/| BBB |

X:5
M: 3/8
L: 1/8
K: clef=none
BB/B/B| B3 | BB/B/B| BBB |

X:6
M: 3/8
L: 1/8
K: clef=none
B/B/B/B/B| B3 | B/B/B/B/B| BBB |

X:7
M: 3/8
L: 1/8
K: clef=none
BB/B/B/B/| BB/B/B/B/ | B/B/B/B/B/B/| BBB |

X:8
M: 3/8
L: 1/8
K: clef=none
B/B/BB/B/| B/B/BB/B/ | B/B/B/B/B/B/| BBB |

`,

"Triple-M-m-D-3/4":
`X:1
M: 3/8
L: 1/4
K: clef=none
B/B/BB |B/B/BB | B/B/BB| BBB |

X:2
M: 3/4
L: 1/4
K: clef=none
BBB/B/| BBB/B/ | BBB/B/| BBB|

X:3
M: 3/4
L: 1/4
K: clef=none
B/B/BB/B/| B3 | B/B/BB/B/| BBB |

X:4
M: 3/4
L: 1/4
K: clef=none
B/B/B/B/B/B/| B3 | B/B/B/B/B/B/| BBB |

X:5
M: 3/4
L: 1/4
K: clef=none
BB/B/B| B3 | BB/B/B| BBB |

X:6
M: 3/4
L: 1/4
K: clef=none
B/B/B/B/B| B3 | B/B/B/B/B| BBB |

X:7
M: 3/4
L: 1/4
K: clef=none
BB/B/B/B/| BB/B/B/B/ | B/B/B/B/B/B/| BBB |

X:8
M: 3/4
L: 1/4
K: clef=none
B/B/BB/B/| B/B/BB/B/ | B/B/B/B/B/B/| BBB |

`,

// Duple, add elongations

"Duple, M-m-D-E-2/4":
`X:1
M: 2/4
L: 1/8
K: clef=none
BB BB | B>B B2 |

X:2
M: 2/4
L: 1/8
K: clef=none
B B2 B | B>B BB |

X:3
M: 2/4
L: 1/8
K: clef=none
BB BB | B<B BB |

X:4
M: 2/4
L: 1/8
K: clef=none
B<B BB | B/BB/ BB |

X:5
M: 2/4
L: 1/8
K: clef=none
B3 B | B>B B2 |

X:6
M: 2/4
L: 1/8
K: clef=none
B/BB/ BB | B2 BB |

X:7 
M: 2/4
L: 1/8
K: clef=none
B B3 | B/BB/ BB |

X:8
M: 2/4
L: 1/8
K: clef=none
B B2 B | B B3 |

`,

"Duple, M-m-D-E-2/2":
`X:1
M: 2/2
L: 1/4
K: clef=none
BB BB | B>B B2 |

X:2
M: 2/2
L: 1/4
K: clef=none
B B2 B | B>B BB |

X:3
M: 2/2
L: 1/4
K: clef=none
BB BB | B<B BB |

X:4
M: 2/2
L: 1/4
K: clef=none
B<B BB | B/BB/ BB |

X:5
M: 2/2
L: 1/4
K: clef=none
B3 B | B>B B2 |

X:6
M: 2/2
L: 1/4
K: clef=none
B/BB/ BB | B2 BB |

X:7 
M: 2/2
L: 1/4
K: clef=none
B B3 | B/BB/ BB |

X:8
M: 2/2
L: 1/4
K: clef=none
B B2 B | B B3 |

`,

// Triple, add elongations

"Triple-M-m-D-E-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
B2 B B2 B | BBB B3 |

X:2
M: 6/8
L: 1/8
K: clef=none
B/BB/B B2 B | B2 B BBB |

X:3
M: 6/8
L: 1/8
K: clef=none
B/BBB/ BBB | B/BBB/ B3 |

X:4
M: 6/8
L: 1/8
K: clef=none
BB/BB/ B2 B | BB/BB/ BBB|

X:5
M: 6/8
L: 1/8
K: clef=none
B>BB B3 | B B2 B3 |

X:6
M: 6/8
L: 1/8
K: clef=none
B B2 B2 B | B>BB BBB |

X:7
M: 6/8
L: 1/8
K: clef=none
BB<B BBB | BB<B BBB |

X:8
M: 6/8
L: 1/8
K: clef=none
B B2 B B2 | BB<B BBB |

`,

"Triple-M-m-D-E-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
B2 B | B2 B | BBB | B3 |

X:2
M: 3/8
L: 1/8
K: clef=none
B/BB/B | B2 B | B2 B | BBB |

X:3
M: 3/8
L: 1/8
K: clef=none
B/BBB/ | BBB | B/BBB/ | B3 |

X:4
M: 3/8
L: 1/8
K: clef=none
BB/BB/ | B2 B | BB/BB/ | BBB|

X:5
M: 3/8
L: 1/8
K: clef=none
B>BB | B3 | B B2 | B3 |

X:6
M: 3/8
L: 1/8
K: clef=none
B B2 | B2 B | B>BB | BBB |

X:7
M: 3/8
L: 1/8
K: clef=none
BB<B | BBB | BB<B | BBB |

X:8
M: 3/8
L: 1/8
K: clef=none
B B2 | B B2 | BB<B | BBB |

`,

"Triple-M-m-D-E-3/4":
`X:1
M: 3/4
L: 1/4
K: clef=none
B2 B | B2 B | BBB | B3 |

X:2
M: 3/4
L: 1/4
K: clef=none
B/BB/B | B2 B | B2 B | BBB |

X:3
M: 3/4
L: 1/4
K: clef=none
B/BBB/ | BBB | B/BBB/ | B3 |

X:4
M: 3/4
L: 1/4
K: clef=none
BB/BB/ | B2 B | BB/BB/ | BBB|

X:5
M: 3/4
L: 1/4
K: clef=none
B>BB | B3 | B B2 | B3 |

X:6
M: 3/4
L: 1/4
K: clef=none
B B2 | B2 B | B>BB | BBB |

X:7
M: 3/4
L: 1/4
K: clef=none
BB<B | BBB | BB<B | BBB |

X:8
M: 3/4
L: 1/4
K: clef=none
B B2 | B B2 | BB<B | BBB |

`,

// Duple, add rests

"Duple, M-m-R-2/4":
`X:1
M: 2/4
L: 1/8
K: clef=none
BB zB | BB B2 |

X:2
M: 2/4
L: 1/8
K: clef=none
z B BB | z B BB |

X:3 
M: 2/4
L: 1/8
K: clef=none
B2 z2 | BB z B |

X:4
M: 2/4
L: 1/8
K: clef=none
BB z2 | z2 BB |

X:5
M: 2/4
L: 1/8
K: clef=none
BB z2 | BB BB |

X:6
M: 2/4
L: 1/8
K: clef=none
BB z B | z2 B2 |

X:7
M: 2/4
L: 1/8
K: clef=none
z2 BB | z2 BB |

X:8
M: 2/4
L: 1/8
K: clef=none
z B z B | z B B2 |

`,

// Duple, add upbeats and divisons & elongations (again)

"Duple, M-m-D-E-R-U-2/4":
`X:1
M: 2/4
L: 1/8
K: clef=none
B | BB BB | B/B/B/B/ B |

X:2
M: 2/4
L: 1/8
K: clef=none
B2 | B/B/B/B/ B2 | BB |

X:3
M: 2/4
L: 1/8
K: clef=none
B/B/B/ | BB B/B/B | BB B/ |

X:4
M: 2/4
L: 1/8
K: clef=none
B | B3 B | B/BB/ B |

X:5
M: 2/4
L: 1/8
K: clef=none
B/ | B B2 B | z B B3/2 |

X:6
M: 2/4
L: 1/8
K: clef=none
B2 | B2 z2 | B/B/B/B/ |

X:7
M: 2/4
L: 1/8
K: clef=none
B | B/BB/ B/BB/ | BB- B |

X:8
M: 2/4
L: 1/8
K: clef=none
B/| B/B/B BB/B/ | B/B/B/B/ B/B/B/ |

`,

"Duple, M-m-D-E-R-U-T-2/4":
`X:1
M: 2/4
L: 1/8
K: clef=none
BB B2- |B2 BB |

X:2
M: 2/4
L: 1/8
K: clef=none
BB z B- | BB B2 |

X:3
M: 2/4
L: 1/8
K: clef=none
B2 BB- | BB B2 |

X:4
M: 2/4
L: 1/8
K: clef=none
B/B/B BB/B/- | B/B/B B2 |

X:5
M: 2/4
L: 1/8
K: clef=none
BB B2- | BB B2 |

X:6
M: 2/4
L: 1/8
K: clef=none
B<B BB- | B/BB/ BB |

X:7
M: 2/4
L: 1/8
K: clef=none
B2 BB- | B2 BB |

X:8
M: 2/4
L: 1/8
K: clef=none
B | BB/B BB/B- | BB- B |

`,
}