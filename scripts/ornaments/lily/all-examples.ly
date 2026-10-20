\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }


% lessons/grace-notes-ornaments.qmd line 77
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !uppermordent!c8 |]
\score {
  \header { piece = "1. Bach's whole table — Trillo" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\prall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 90
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcd c3/2 |]
\score {
  \header { piece = "2. Bach's whole table — Trillo" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32] c''32. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 104
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !mordent!c8 |]
\score {
  \header { piece = "3. Bach's whole table — Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 117
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   cB c3/2 |]
\score {
  \header { piece = "4. Bach's whole table — Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ b'32] c''32. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 131
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "5. Bach's whole table — Trillo und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\prallmordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 144
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcBc |]
\score {
  \header { piece = "6. Bach's whole table — Trillo und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 158
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !turn!c8 |]
\score {
  \header { piece = "7. Bach's whole table — Cadence" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\turn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 171
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcBc |]
\score {
  \header { piece = "8. Bach's whole table — Cadence" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 185
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "9. Bach's whole table — Doppelt-Cadence" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\upprall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 198
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   Bcdcdcdc |]
\score {
  \header { piece = "10. Bach's whole table — Doppelt-Cadence" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 212
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "11. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\downprall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 225
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcBcdcdc |]
\score {
  \header { piece = "12. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 b'32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 239
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "13. Bach's whole table — Doppelt-Cadence und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\upmordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 252
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   BcdcdcBc |]
\score {
  \header { piece = "14. Bach's whole table — Doppelt-Cadence und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 266
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c12 |]
\score {
  \header { piece = "15. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4.\downmordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 279
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcBcdcdcdcBc |]
\score {
  \header { piece = "16. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 b'32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 293
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}c8 |]
\score {
  \header { piece = "17. Bach's whole table — Accent steigend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0.55 -0.05 curveto 0 -0.05 0 -0.95 0.55 -0.95) c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 306
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B4c4 |]
\score {
  \header { piece = "18. Bach's whole table — Accent steigend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'8[ c''8] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 320
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c8 |]
\score {
  \header { piece = "19. Bach's whole table — Accent fallend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0.55 0.95 curveto 0 0.95 0 0.05 0.55 0.05) c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 333
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4c4 |]
\score {
  \header { piece = "20. Bach's whole table — Accent fallend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8[ c''8] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 347
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}!mordent!c8 |]
\score {
  \header { piece = "21. Bach's whole table — Accent und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0.55 -0.05 curveto 0 -0.05 0 -0.95 0.55 -0.95) c''4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 360
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B4 cB c4 |]
\score {
  \header { piece = "22. Bach's whole table — Accent und Mordant" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'8 c''32[ b'32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 374
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}!uppermordent!c8 |]
\score {
  \header { piece = "23. Bach's whole table — Accent und Trillo" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0.55 0.95 curveto 0 0.95 0 0.05 0.55 0.05) c''4\prall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 387
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4 cdcd c4 |]
\score {
  \header { piece = "24. Bach's whole table — Accent und Trillo" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8 c''32[ d''32 c''32 d''32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 401
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !uppermordent!c8 |]
\score {
  \header { piece = "25. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\lineprall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 414
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4 cdcd c4 |]
\score {
  \header { piece = "26. Bach's whole table — Idem" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8 c''32[ d''32 c''32 d''32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 453
% ABC:
%   X:1
%   T:Written
%   M:2/4
%   L:1/8
%   K:C
%   {d}c2 B2 | {f}e3 d | c4 |]
\score {
  \header { piece = "27. The appoggiatura: on the beat, and long — Written" }
  {
    \key c \major
    \time 2/4
    \appoggiatura { d''8 } c''4 b'4 | \appoggiatura { f''8 } e''4. d''8 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 468
% ABC:
%   X:2
%   T:Played: half of a plain note, two thirds of a dotted one
%   M:2/4
%   L:1/8
%   K:C
%   dc B2 | f2 e d | c4 |]
\score {
  \header { piece = "28. The appoggiatura: on the beat, and long — Played: half of a plain note, two thirds of a dotted one" }
  {
    \key c \major
    \time 2/4
    d''8[ c''8] b'4 | f''4 e''8 d''8 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 492
% ABC:
%   X:3
%   T:Written
%   M:2/4
%   L:1/16
%   K:C
%   Tc4 B4 | c8 |]
\score {
  \header { piece = "29. The trill: start on the upper note — Written" }
  {
    \key c \major
    \time 2/4
    c''4\trill b'4 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 507
% ABC:
%   X:4
%   T:Played: from the upper note, on the beat
%   M:2/4
%   L:1/16
%   K:C
%   dcdc B4 | c8 |]
\score {
  \header { piece = "30. The trill: start on the upper note — Played: from the upper note, on the beat" }
  {
    \key c \major
    \time 2/4
    d''16[ c''16 d''16 c''16] b'4 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 525
% ABC:
%   X:5
%   T:Written
%   M:2/4
%   L:1/16
%   K:C
%   Me4 d4 | c8 |]
\score {
  \header { piece = "31. The mordent: main note, the one below, main note — Written" }
  {
    \key c \major
    \time 2/4
    e''4\mordent d''4 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 540
% ABC:
%   X:6
%   T:Played
%   M:2/4
%   L:1/32
%   K:C
%   ede6 d8 | c16 |]
\score {
  \header { piece = "32. The mordent: main note, the one below, main note — Played" }
  {
    \key c \major
    \time 2/4
    e''32[ d''32 e''8.] d''4 | c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 560
% ABC:
%   X:20
%   T:Bach, Sarabande, English Suite No. 3 (BWV 808): the theme
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   BA A3 c/B/ | cA ^F3 A/G/ | AE E2 PD>C | B,3 A, G,2 |]
\score {
  \header { piece = "33. Improvising ornaments — Bach, Sarabande, English Suite No. 3 (BWV 808): the theme" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8[ a'8] a'4. c''16[ bes'16] | c''8[ a'8] fis'4. a'16[ g'16] | a'8[ es'8] es'4 d'8.\prall[ c'16] | bes4. a8 g4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 578
% ABC:
%   X:21
%   T:Written
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   B{B}A A3 c/B/ | cA T^F3 A/G/ | AE E2 D>C | B,3 A, MG,2 |]
\score {
  \header { piece = "34. Improvising ornaments — Written" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8[ \appoggiatura { bes'8 } a'8] a'4. c''16[ bes'16] | c''8[ a'8] fis'4.\trill a'16[ g'16] | a'8[ es'8] es'4 d'8.[ c'16] | bes4. a8 g4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 595
% ABC:
%   X:22
%   T:Played
%   M:3/4
%   L:1/16
%   Q:1/4=60
%   K:Gm
%   B2 B2A2 A4 c B | c2A2 G^FG^F^F2 A G | A2E2 E4 D3C | B,6 A,2 G,=F, G,2 |]
\score {
  \header { piece = "35. Improvising ornaments — Played" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8 bes'8[ a'8] a'4 c''16 bes'16 | c''8[ a'8] g'16[ fis'16 g'16 fis'16 fis'8] a'16 g'16 | a'8[ es'8] es'4 d'8.[ c'16] | bes4. a8 g16[ f16] g8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 613
% ABC:
%   X:23
%   T:Divisions on the long notes
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   BA AG/A/ Bc/B/ | cA ^F/G/A/^F/ G A/G/ | AE E/^F/G/E/ D>C | B,3 A, G,2 |]
\score {
  \header { piece = "36. Improvising ornaments — Divisions on the long notes" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8[ a'8] a'8[ g'16 a'16] bes'8[ c''16 bes'16] | c''8[ a'8] fis'16[ g'16 a'16 fis'16] g'8 a'16[ g'16] | a'8[ es'8] es'16[ fis'16 g'16 es'16] d'8.[ c'16] | bes4. a8 g4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 631
% ABC:
%   X:24
%   T:Too much, in the wrong places
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   MBMA MA3 Mc/MB/ | McMA M^F3 MA/MG/ | MAME ME2 MD>MC | MB,3 MA, TG,2 |]
\score {
  \header { piece = "37. Improvising ornaments — Too much, in the wrong places" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8\mordent[ a'8\mordent] a'4.\mordent c''16\mordent[ bes'16\mordent] | c''8\mordent[ a'8\mordent] fis'4.\mordent a'16\mordent[ g'16\mordent] | a'8\mordent[ es'8\mordent] es'4\mordent d'8.\mordent[ c'16\mordent] | bes4.\mordent a8\mordent g4\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 662
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !mordent!c8 |]
\score {
  \header { piece = "38. France: Couperin and d'Anglebert — Pincé simple" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 675
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   cB c6 |]
\score {
  \header { piece = "39. France: Couperin and d'Anglebert — Pincé simple" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ b'32] c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 689
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !mordent!c16 |]
\score {
  \header { piece = "40. France: Couperin and d'Anglebert — Pincé double" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 702
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   cBcBcB c8-c2 |]
\score {
  \header { piece = "41. France: Couperin and d'Anglebert — Pincé double" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ b'32 c''32 b'32 c''32 b'32] c''4~ c''16 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 716
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}!mordent!c8 |]
\score {
  \header { piece = "42. France: Couperin and d'Anglebert — Port de voix" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { b'8 } c''4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 729
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B4 cB c2 |]
\score {
  \header { piece = "43. France: Couperin and d'Anglebert — Port de voix" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'8 c''32[ b'32] c''16 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 743
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c16 |]
\score {
  \header { piece = "44. France: Couperin and d'Anglebert — Tremblement" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 756
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4 dcdcdc c6 |]
\score {
  \header { piece = "45. France: Couperin and d'Anglebert — Tremblement" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8 d''32[ c''32 d''32 c''32 d''32 c''32] c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 788
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "46. Italy and England: Geminiani and Purcell — A plain Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 801
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdc |]
\score {
  \header { piece = "47. Italy and England: Geminiani and Purcell — A plain Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 815
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   "^+"c8 |]
\score {
  \header { piece = "48. Italy and England: Geminiani and Purcell — A turn'd Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\stopped \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 828
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdc B c |]
\score {
  \header { piece = "49. Italy and England: Geminiani and Purcell — A turn'd Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] b'32 c''32 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 842
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c8 |]
\score {
  \header { piece = "50. Italy and England: Geminiani and Purcell — A superior Apogiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 855
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4-d c3 |]
\score {
  \header { piece = "51. Italy and England: Geminiani and Purcell — A superior Apogiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8[~ d''32] c''16. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 869
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {^B}c8 |]
\score {
  \header { piece = "52. Italy and England: Geminiani and Purcell — An inferior Apogiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { bis'8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 882
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   ^B4 c^B c2 |]
\score {
  \header { piece = "53. Italy and England: Geminiani and Purcell — An inferior Apogiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    bis'8 c''32[ bis'32] c''16 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 896
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   "^-"c16 |]
\score {
  \header { piece = "54. Italy and England: Geminiani and Purcell — Holding the Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2^\markup { \concat { \raise #0.6 \draw-line #'(1.4 . 0) \hspace #0.5 \musicglyph "scripts.stopped" } } \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 909
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c8 dcdcdc^Bc |]
\score {
  \header { piece = "55. Italy and England: Geminiani and Purcell — Holding the Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4 d''32[ c''32 d''32 c''32 d''32 c''32 bis'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 923
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   "^//"c8 |]
\score {
  \header { piece = "56. Italy and England: Geminiani and Purcell — A Beat" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4^\markup { \musicglyph "scripts.caesura.straight" } \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 936
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c^Bc^Bc^Bc2 |]
\score {
  \header { piece = "57. Italy and England: Geminiani and Purcell — A Beat" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ bis'32 c''32 bis'32 c''32 bis'32 c''16] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 965
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "58. Italy and England: Geminiani and Purcell — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\purcellShake \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 978
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdc |]
\score {
  \header { piece = "59. Italy and England: Geminiani and Purcell — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 992
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !mordent!c8 |]
\score {
  \header { piece = "60. Italy and England: Geminiani and Purcell — Beat" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\prall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1005
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   BcBc c4 |]
\score {
  \header { piece = "61. Italy and England: Geminiani and Purcell — Beat" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 b'32 c''32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1019
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c16 |]
\score {
  \header { piece = "62. Italy and England: Geminiani and Purcell — Plain note and Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2\purcellPlainShake \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1032
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8 dcdcdcdc |]
\score {
  \header { piece = "63. Italy and England: Geminiani and Purcell — Plain note and Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4 d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1046
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}c16 |]
\score {
  \header { piece = "64. Italy and England: Geminiani and Purcell — Forefall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0 -0.4 lineto 1.1 0.7) c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1059
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B4 c12 |]
\score {
  \header { piece = "65. Italy and England: Geminiani and Purcell — Forefall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'8 c''4. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1073
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c16 |]
\score {
  \header { piece = "66. Italy and England: Geminiani and Purcell — Backfall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \leftMark #'(moveto 0 1.4 lineto 1.1 0.3) c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1086
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4 c12 |]
\score {
  \header { piece = "67. Italy and England: Geminiani and Purcell — Backfall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8 c''4. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1122
% ABC:
%   X:7
%   T:Written: a long and a short appoggiatura
%   M:2/4
%   L:1/8
%   K:G
%   {c}B2 A2 | {a/}g g f2 | g4 |]
\score {
  \header { piece = "68. Haydn, Mozart and the Classical style — Written: a long and a short appoggiatura" }
  {
    \key g \major
    \time 2/4
    \appoggiatura { c''8 } b'4 a'4 | \appoggiatura { a''16 } g''8 g''8 fis''4 | g''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1137
% ABC:
%   X:8
%   T:Played: the long one takes half; the short one a quick note on the beat
%   M:2/4
%   L:1/16
%   K:G
%   c2B2 A4 | agg2 f4 | g8 |]
\score {
  \header { piece = "69. Haydn, Mozart and the Classical style — Played: the long one takes half; the short one a quick note on the beat" }
  {
    \key g \major
    \time 2/4
    c''8[ b'8] a'4 | a''16[ g''16 g''8] fis''4 | g''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1167
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c8 |]
\score {
  \header { piece = "70. Türk, Klavierschule (1789) — Kurzer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1180
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d1c7 |]
\score {
  \header { piece = "71. Türk, Klavierschule (1789) — Kurzer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''8..] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1194
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c8 |]
\score {
  \header { piece = "72. Türk, Klavierschule (1789) — Langer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1207
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4c4 |]
\score {
  \header { piece = "73. Türk, Klavierschule (1789) — Langer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8[ c''8] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1221
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c12 |]
\score {
  \header { piece = "74. Türk, Klavierschule (1789) — Langer Vorschlag, punktirt" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1234
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8c4 |]
\score {
  \header { piece = "75. Türk, Klavierschule (1789) — Langer Vorschlag, punktirt" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4 c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1248
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c12-c6 |]
\score {
  \header { piece = "76. Türk, Klavierschule (1789) — Langer Vorschlag, gebunden" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4.~ c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1261
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d12c6 |]
\score {
  \header { piece = "77. Türk, Klavierschule (1789) — Langer Vorschlag, gebunden" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4. c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1275
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {AB}c8 |]
\score {
  \header { piece = "78. Türk, Klavierschule (1789) — Schleifer" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { a'8 b'8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1288
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   A1B1c6 |]
\score {
  \header { piece = "79. Türk, Klavierschule (1789) — Schleifer" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    a'32[ b'32 c''8.] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1302
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {cd}c8 |]
\score {
  \header { piece = "80. Türk, Klavierschule (1789) — Schneller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { c''8 d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1315
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c1d1c6 |]
\score {
  \header { piece = "81. Türk, Klavierschule (1789) — Schneller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ d''32 c''8.] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1329
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "82. Türk, Klavierschule (1789) — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1342
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdc |]
\score {
  \header { piece = "83. Türk, Klavierschule (1789) — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1356
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   (d8 !uppermordent!c8) |]
\score {
  \header { piece = "84. Türk, Klavierschule (1789) — Pralltriller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4( c''4\prall) \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1369
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8-d1c1d1c4-c |]
\score {
  \header { piece = "85. Türk, Klavierschule (1789) — Pralltriller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4~ d''32[ c''32 d''32 c''8~ c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1383
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !mordent!c8 |]
\score {
  \header { piece = "86. Türk, Klavierschule (1789) — Mordent" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\mordent \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1396
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c1B1c6 |]
\score {
  \header { piece = "87. Türk, Klavierschule (1789) — Mordent" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ b'32 c''8.] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1410
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !turn!c8 |]
\score {
  \header { piece = "88. Türk, Klavierschule (1789) — Doppelschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\turn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1423
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   (3:2:3d1c1B1 c6 |]
\score {
  \header { piece = "89. Türk, Klavierschule (1789) — Doppelschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \tuplet 3/2 { d''32[ c''32 b'32] } c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1448
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c8 |]
\score {
  \header { piece = "90. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1461
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d4c4 |]
\score {
  \header { piece = "91. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8[ c''8] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1475
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c12 |]
\score {
  \header { piece = "92. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag vor einer punktirten Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''4. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1488
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8c4 |]
\score {
  \header { piece = "93. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag vor einer punktirten Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4 c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1502
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c16 |]
\score {
  \header { piece = "94. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag vor einer halben Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1515
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d12c4 |]
\score {
  \header { piece = "95. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Vorschlag vor einer halben Note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4. c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1529
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   e8 {d}c8 |]
\score {
  \header { piece = "96. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Durchgehender Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    e''4 \appoggiatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1542
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   e6 d2 c8 |]
\score {
  \header { piece = "97. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Durchgehender Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    e''8. d''16 c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1556
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c16 |]
\score {
  \header { piece = "98. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1569
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdcdcdcdcBc |]
\score {
  \header { piece = "99. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1583
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {cB}c8 |]
\score {
  \header { piece = "100. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Mordant (I)" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { c''8 b'8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1596
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c/B/c7 |]
\score {
  \header { piece = "101. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Mordant (I)" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''64[ b'64 c''8..] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1610
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {Bd}c8 |]
\score {
  \header { piece = "102. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Mordant (II)" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { b'8 d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1623
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B/d/c7 |]
\score {
  \header { piece = "103. Leopold Mozart, Versuch einer gründlichen Violinschule (1756) — Mordant (II)" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'64[ d''64 c''8..] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1648
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c16 |]
\score {
  \header { piece = "104. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Appoggiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1661
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8c8 |]
\score {
  \header { piece = "105. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Appoggiatura" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4 c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1675
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}c8 |]
\score {
  \header { piece = "106. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Grace for emphasis" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { b'8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1688
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B1c7 |]
\score {
  \header { piece = "107. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Grace for emphasis" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''8..] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1702
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !turn!c8 |]
\score {
  \header { piece = "108. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Turn" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\turn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1715
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   (3:2:3d1c1B1 c6 |]
\score {
  \header { piece = "109. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Turn" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \tuplet 3/2 { d''32[ c''32 b'32] } c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1729
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !invertedturn!c8 |]
\score {
  \header { piece = "110. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Turn inverted" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\reverseturn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1742
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   (3:2:3B1c1d1 c6 |]
\score {
  \header { piece = "111. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Turn inverted" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \tuplet 3/2 { b'32[ c''32 d''32] } c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1756
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c8 |]
\score {
  \header { piece = "112. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1769
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdc |]
\score {
  \header { piece = "113. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1783
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !uppermordent!c4 |]
\score {
  \header { piece = "114. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Short shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''8\prall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1796
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c1d1c2 |]
\score {
  \header { piece = "115. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Short shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ d''32 c''16] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1810
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   B1c1B1c1B1c3 |]
\score {
  \header { piece = "116. Clementi, Introduction to the Art of Playing on the Piano Forte (c. 1801) — Beat" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 b'32 c''32 b'32 c''16.] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1867
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !trill!c16 |]
\score {
  \header { piece = "117. Hummel, Chopin and the 19th century — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1880
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   cdcdcdcdcdcdcdBc |]
\score {
  \header { piece = "118. Hummel, Chopin and the 19th century — Triller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1894
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}!trill!c16 |]
\score {
  \header { piece = "119. Hummel, Chopin and the 19th century — Triller von oben" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''2\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1907
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcdcdcdcdcdcdcBc |]
\score {
  \header { piece = "120. Hummel, Chopin and the 19th century — Triller von oben" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1921
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {B}!trill!c16 |]
\score {
  \header { piece = "121. Hummel, Chopin and the 19th century — Triller von unten" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { b'8 } c''2\trill \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1934
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   BcdcdcdcdcdcdcBc |]
\score {
  \header { piece = "122. Hummel, Chopin and the 19th century — Triller von unten" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 d''32 c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1948
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !uppermordent!c8 |]
\score {
  \header { piece = "123. Hummel, Chopin and the 19th century — Schneller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\prall \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1961
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c2d2c4 |]
\score {
  \header { piece = "124. Hummel, Chopin and the 19th century — Schneller" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''16[ d''16 c''8] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1975
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !turn!c8 |]
\score {
  \header { piece = "125. Hummel, Chopin and the 19th century — Doppelschlag von oben" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\turn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 1988
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   dcBc c4 |]
\score {
  \header { piece = "126. Hummel, Chopin and the 19th century — Doppelschlag von oben" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''32 b'32 c''32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2002
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {c}!turn!c8 |]
\score {
  \header { piece = "127. Hummel, Chopin and the 19th century — Doppelschlag von der Hauptnote" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { c''8 } c''4\turn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2015
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   cdcBc c3 |]
\score {
  \header { piece = "128. Hummel, Chopin and the 19th century — Doppelschlag von der Hauptnote" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''32[ d''32 c''32 b'32 c''32] c''16. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2029
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   !invertedturn!c8 |]
\score {
  \header { piece = "129. Hummel, Chopin and the 19th century — Doppelschlag von unten" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\reverseturn \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2042
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   Bcdc c4 |]
\score {
  \header { piece = "130. Hummel, Chopin and the 19th century — Doppelschlag von unten" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    b'32[ c''32 d''32 c''32] c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2056
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   "^∽ on the dot"c12 |]
\score {
  \header { piece = "131. Hummel, Chopin and the 19th century — Doppelschlag über dem Punkt" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    << { c''4. } { s4 <>\turn } >> \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2069
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   c8 dcBc |]
\score {
  \header { piece = "132. Hummel, Chopin and the 19th century — Doppelschlag über dem Punkt" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4 d''32[ c''32 b'32 c''32] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2083
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {d}c16 |]
\score {
  \header { piece = "133. Hummel, Chopin and the 19th century — Langer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \appoggiatura { d''8 } c''2 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2096
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d8c8 |]
\score {
  \header { piece = "134. Hummel, Chopin and the 19th century — Langer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''4 c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2110
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   {/d}c8 |]
\score {
  \header { piece = "135. Hummel, Chopin and the 19th century — Kurzer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \acciaccatura { d''8 } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2123
% ABC:
%   X:1
%   M:none
%   L:1/32
%   K:C
%   d1c7 |]
\score {
  \header { piece = "136. Hummel, Chopin and the 19th century — Kurzer Vorschlag" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''32[ c''8..] \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2177
% ABC:
%   X:9
%   T:Cut, tap and a long roll on G
%   M:6/8
%   L:1/8
%   K:D
%   {a}G2 A {F}G2 A | ~G3 B2 A |]
\score {
  \header { piece = "137. Irish traditional music — Cut, tap and a long roll on G" }
  {
    \key d \major
    \time 6/8
    \appoggiatura { a''8 } g'4 a'8 \appoggiatura { fis'8 } g'4 a'8 | g'4.^\markup {\small roll } b'4 a'8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2221
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   {/_E}E4 |]
\score {
  \header { piece = "138. Jazz and blues — Crushed note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \acciaccatura { es'8 } e'4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2234
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   [_EE] E3 |]
\score {
  \header { piece = "139. Jazz and blues — Crushed note" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    <es' es'>16 es'8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2248
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^fall"c4 z4 |]
\score {
  \header { piece = "140. Jazz and blues — Fall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\bendAfter #-4 r4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2261
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   c3 B/A/ z4 |]
\score {
  \header { piece = "141. Jazz and blues — Fall" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''8. b'32[ a'32] r4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2275
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^doit"c4 z4 |]
\score {
  \header { piece = "142. Jazz and blues — Doit" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''4\bendAfter #+4 r4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2288
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   c3 d/e/ z4 |]
\score {
  \header { piece = "143. Jazz and blues — Doit" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''8. d''32[ e''32] r4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2302
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^scoop"c4 |]
\score {
  \header { piece = "144. Jazz and blues — Scoop" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { \hideNotes a'16 \glissando \unHideNotes } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2315
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   A/B/ c3 |]
\score {
  \header { piece = "145. Jazz and blues — Scoop" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    a'32[ b'32] c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2329
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^plop"c4 |]
\score {
  \header { piece = "146. Jazz and blues — Plop" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { \hideNotes e''16 \glissando \unHideNotes } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2342
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   e/d/ c3 |]
\score {
  \header { piece = "147. Jazz and blues — Plop" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    e''32[ d''32] c''8. \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2356
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^rip"c4 |]
\score {
  \header { piece = "148. Jazz and blues — Rip" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \grace { \hideNotes g'16 \glissando \unHideNotes } c''4-> \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2369
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   (3GAB c4 |]
\score {
  \header { piece = "149. Jazz and blues — Rip" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \tuplet 3/2 { g'16[ a'16 b'16] } c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2383
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^full"c8 |]
\score {
  \header { piece = "150. Jazz and blues — Bend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''2^\markup { \concat { \draw-line #'(0 . 1.6) \raise #1.6 \arrow-head #Y #UP ##t } \small "full" } \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2396
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   c2 d4 c2 |]
\score {
  \header { piece = "151. Jazz and blues — Bend" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    c''8 d''4 c''8 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2410
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   "^shake"c8 |]
\score {
  \header { piece = "152. Jazz and blues — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \once \override TrillSpanner.bound-details.left.text = ##f c''2\startTrillSpan s16\stopTrillSpan \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2423
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   (3cec (3ece (3cec (3ece |]
\score {
  \header { piece = "153. Jazz and blues — Shake" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    \tuplet 3/2 { c''16[ e''16 c''16] } \tuplet 3/2 { e''16[ c''16 e''16] } \tuplet 3/2 { c''16[ e''16 c''16] } \tuplet 3/2 { e''16[ c''16 e''16] } \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2437
% ABC:
%   X:1
%   M:none
%   L:1/16
%   K:C
%   d2 B2 c4 |]
\score {
  \header { piece = "154. Jazz and blues — Enclosure" }
  {
    \key c \major
    \omit Staff.TimeSignature
    \cadenzaOn
    d''8 b'8 c''4 \bar "|."
  }
  \layout { }
}

% lessons/grace-notes-ornaments.qmd line 2456
% ABC:
%   X:10
%   T:The blue third crushed into the major third (the band swings it)
%   M:4/4
%   L:1/8
%   K:F
%   Q:1/4=120
%   "F7"z {^G}A2 F {^G}A2 c2 | {^G}A8 |]
\score {
  \header { piece = "155. Jazz and blues — The blue third crushed into the major third (the band swings it)" }
  {
    \key f \major
    \time 4/4
    \tempo 4 = 120
    r8^\markup { \bold "F7" } \appoggiatura { gis'8 } a'4 f'8 \appoggiatura { gis'8 } a'4 c''4 | \appoggiatura { gis'8 } a'1 \bar "|."
  }
  \layout { }
}
