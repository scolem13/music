\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
