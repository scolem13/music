\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
