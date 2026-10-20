\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
