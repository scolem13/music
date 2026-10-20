\version "2.22.0"
\header { tagline = ##f }
\paper { indent = 0 }

leftMark = #(define-music-function (path) (list?)
  #{ \once \override NoteHead.stencil =
     #(lambda (grob)
        (ly:stencil-combine-at-edge (ly:note-head::print grob) X LEFT (make-path-stencil path 0.15 1 1 #f) 0.15)) #})
purcellShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25)) }
purcellPlainShake = ^\markup { \path #0.18 #'((moveto 0 0) (lineto 1.3 0.55) (moveto 0 0.7) (lineto 1.3 1.25) (moveto 0.25 1.9) (lineto 0.55 0.85)) }

% lessons/grace-notes-ornaments.qmd line 1137
% ABC:
%   X:8
%   T:Played: the long one takes half; the short one a quick note on the beat
%   M:2/4
%   L:1/16
%   K:G
%   c2B2 A4 | agg2 f4 | g8 |]
\score {
  \header { piece = "69. Haydn, Mozart and the Classical style — Played: the long one takes half; the short one a quick note on the beat" }
  {
    \key g \major
    \time 2/4
    c''8[ b'8] a'4 | a''16[ g''16 g''8] fis''4 | g''2 \bar "|."
  }
  \layout { }
  \midi { }
}
