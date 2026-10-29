#!/usr/bin/env bash
# mlt-recordings-upload.sh: upload the catalogued MLT recordings to the R2 bucket, skipping ones already sent.
#
#   MLT_R2_BUCKET=<bucket> bash scripts/mlt-recordings-upload.sh      (or: node scripts/mlt-recordings.mjs --upload)
#
# Reads research_notes/mlt-recordings-manifest.tsv (written by scripts/mlt-recordings.mjs: key, file, size). What is done
# is kept in ~/.cache/mlt-r2-uploaded.tsv (key + size), so a rerun after an interruption or a new CD sends only the rest,
# and a file whose size changed goes again. Uses Cloudflare's wrangler through npx: log in once with `npx wrangler login`.
# DRY=1 lists what would go without sending.
set -euo pipefail
cd "$(dirname "$0")/.."
BUCKET="${MLT_R2_BUCKET:?set MLT_R2_BUCKET to the R2 bucket name}"
ROOT="${MLT_AUDIO:-$HOME/Music/MLT}"
MANIFEST=research_notes/mlt-recordings-manifest.tsv
DONE="$HOME/.cache/mlt-r2-uploaded.tsv"
mkdir -p "$(dirname "$DONE")"; touch "$DONE"

sent=0; skipped=0; failed=0
while IFS=$'\t' read -r key file size; do
  [[ "$key" == "r2" ]] && continue
  if grep -qxF "$key"$'\t'"$size" "$DONE"; then skipped=$((skipped+1)); continue; fi
  case "$file" in *.m4a) type=audio/mp4 ;; *) type=audio/mpeg ;; esac
  if [[ -n "${DRY:-}" ]]; then echo "would send: $key"; continue; fi
  echo "→ $key"
  if npx --yes wrangler r2 object put "$BUCKET/$key" --file "$ROOT/$file" --content-type "$type" --remote >/dev/null; then
    printf '%s\t%s\n' "$key" "$size" >> "$DONE"; sent=$((sent+1))
  else
    echo "   failed: $key" >&2; failed=$((failed+1))
  fi
done < "$MANIFEST"
echo "sent $sent, already there $skipped, failed $failed"
[[ $failed -eq 0 ]]
