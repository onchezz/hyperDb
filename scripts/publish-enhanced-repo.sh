#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:-onchezz}"
REPO="${2:-hyperDb}"
VISIBILITY="${3:-public}" # public|private

if [[ "$VISIBILITY" != "public" && "$VISIBILITY" != "private" ]]; then
  echo "Visibility must be 'public' or 'private'"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated."
  echo "Run: gh auth login"
  exit 1
fi

BRANCH="$(git branch --show-current)"
TARGET_URL="git@github.com:${OWNER}/${REPO}.git"

if gh repo view "${OWNER}/${REPO}" >/dev/null 2>&1; then
  echo "Repository ${OWNER}/${REPO} already exists."
else
  gh repo create "${OWNER}/${REPO}" --"${VISIBILITY}"
  echo "Created ${OWNER}/${REPO}"
fi

if git remote get-url enhanced >/dev/null 2>&1; then
  git remote set-url enhanced "$TARGET_URL"
else
  git remote add enhanced "$TARGET_URL"
fi

git push -u enhanced "$BRANCH"

echo
echo "Published ${BRANCH} to ${TARGET_URL}"
