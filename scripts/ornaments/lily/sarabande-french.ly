% Bach, Sarabande, English Suite No. 3 (BWV 808): the theme with French graces.
% Used in lessons/grace-notes-ornaments.qmd, "Improvising ornaments" (Choice 1).
% Engrave:  lilypond -dbackend=svg -dcrop -o apps/shared/lessons/img/sarabande-french scripts/ornaments/lily/sarabande-french.ly
\version "2.24.0"
\header { tagline = ##f }
\paper { indent = 0 }

\score {
  \relative c'' {
    \key g \minor
    \time 3/4
    \tempo 4 = 60
    bes8 \appoggiatura bes8 a8 a4. c16 bes |
    c8 a fis4.\trill a16 g |
    a8 ees ees4 d8. c16 |
    bes4. a8 g4\mordent \bar "|."
  }
  \layout { }
}
