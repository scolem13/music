\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
