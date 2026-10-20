\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
