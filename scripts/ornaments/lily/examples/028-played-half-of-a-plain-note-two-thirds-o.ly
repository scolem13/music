\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
