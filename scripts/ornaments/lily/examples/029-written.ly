\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
