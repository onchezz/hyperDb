#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:-onchezz}"
REPO="${2:-hyperDb}"
VISIBILITY="${3:-public}" # public|private
REMOTE_NAME="${4:-enhanced}"

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

if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote set-url "$REMOTE_NAME" "$TARGET_URL"
else
  git remote add "$REMOTE_NAME" "$TARGET_URL"
fi

git push -u "$REMOTE_NAME" "$BRANCH"

echo
echo "Published ${BRANCH} to ${TARGET_URL}"
