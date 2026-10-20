\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

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
  \midi { }
}
