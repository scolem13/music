\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
