#!/bin/sh
# Render pages for the headless-Chrome tests into tests/band/lead/site without copying the site into itself.
#
#   sh scripts/render-test-page.sh tools/backing-track.qmd [tools/notation.qmd ...]
#
# Why: `quarto render X --output-dir tests/band/lead/site` copies the project's resources into the output, and the
# resources globs in _quarto.yml (apps/**, config.js, track.js) also match the copies already inside _site and
# tests/band/lead/site. Each such render nested another copy of the test site inside itself (about 70 MB a time).
# This renders into a fresh folder outside the project, copies only the rendered page(s) (and site_libs) across,
# and puts back the line Quarto appends to .gitignore.
set -e
cd "$(dirname "$0")/.."
[ $# -gt 0 ] || { echo "usage: sh scripts/render-test-page.sh <page.qmd> ..."; exit 1; }
out="$(mktemp -d "${TMPDIR:-/tmp}/render-test-page.XXXXXX")"
cp .gitignore "$out.gitignore"
trap 'cp "$out.gitignore" .gitignore; rm -rf "$out" "$out.gitignore"' EXIT
for page in "$@"; do
  quarto render "$page" --output-dir "$out" >/dev/null 2>&1 || { echo "render failed: $page"; quarto render "$page" --output-dir "$out"; exit 1; }
  html="${page%.qmd}.html"
  mkdir -p "tests/band/lead/site/$(dirname "$html")"
  cp "$out/$html" "tests/band/lead/site/$html"
  echo "rendered $html"
done
rsync -a "$out/site_libs/" tests/band/lead/site/site_libs/
