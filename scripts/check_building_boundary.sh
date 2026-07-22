#!/usr/bin/env bash
# Ownership boundary check (PRD §7.3, §17): a building PR should touch only
# src/buildings/<id>/. This is INFORMATIONAL (exits 0) — it warns when a PR mixes
# a building folder with shared code, which usually means shared changes belong
# in a separate framework PR. Mirrors the Godot F0's ownership-boundary warning.
set -euo pipefail

BASE="${1:-origin/main}"
HEAD="${2:-HEAD}"

changed="$(git diff --name-only "$BASE" "$HEAD" || true)"
[ -z "$changed" ] && { echo "No changed files."; exit 0; }

building="$(printf '%s\n' "$changed" | grep -E '^src/buildings/[^/]+/' || true)"
other="$(printf '%s\n' "$changed" | grep -vE '^src/buildings/[^/]+/' || true)"

if [ -n "$building" ] && [ -n "$other" ]; then
  echo "::warning::This PR changes a building folder AND shared code. A building PR should touch only src/buildings/<id>/ (PRD §7.3, §17); shared changes belong in a framework PR."
  echo "--- building files ---"
  printf '%s\n' "$building"
  echo "--- other files ---"
  printf '%s\n' "$other"
else
  echo "Ownership boundary OK."
fi
exit 0
