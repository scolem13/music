\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

% lessons/grace-notes-ornaments.qmd line 631
% ABC:
%   X:24
%   T:Too much, in the wrong places
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   MBMA MA3 Mc/MB/ | McMA M^F3 MA/MG/ | MAME ME2 MD>MC | MB,3 MA, TG,2 |]
\score {
  \header { piece = "37. Improvising ornaments — Too much, in the wrong places" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8\mordent[ a'8\mordent] a'4.\mordent c''16\mordent[ bes'16\mordent] | c''8\mordent[ a'8\mordent] fis'4.\mordent a'16\mordent[ g'16\mordent] | a'8\mordent[ es'8\mordent] es'4\mordent d'8.\mordent[ c'16\mordent] | bes4.\mordent a8\mordent g4\trill \bar "|."
  }
  \layout { }
  \midi { }
}
