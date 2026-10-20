\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
