\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

% lessons/grace-notes-ornaments.qmd line 560
% ABC:
%   X:20
%   T:Bach, Sarabande, English Suite No. 3 (BWV 808): the theme
%   M:3/4
%   L:1/8
%   Q:1/4=60
%   K:Gm
%   BA A3 c/B/ | cA ^F3 A/G/ | AE E2 PD>C | B,3 A, G,2 |]
\score {
  \header { piece = "33. Improvising ornaments — Bach, Sarabande, English Suite No. 3 (BWV 808): the theme" }
  {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes'8[ a'8] a'4. c''16[ bes'16] | c''8[ a'8] fis'4. a'16[ g'16] | a'8[ es'8] es'4 d'8.\prall[ c'16] | bes4. a8 g4 \bar "|."
  }
  \layout { }
  \midi { }
}
