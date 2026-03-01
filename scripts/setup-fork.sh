#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <github-username>"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USERNAME="$1"
UPSTREAM_URL="https://github.com/Nozbe/WatermelonDB.git"
ORIGIN_URL="git@github.com:${USERNAME}/WatermelonDB.git"

cd "$REPO_ROOT"

if git remote get-url upstream >/dev/null 2>&1; then
  git remote set-url upstream "$UPSTREAM_URL"
elif git remote get-url origin >/dev/null 2>&1 && [[ "$(git remote get-url origin)" == "$UPSTREAM_URL" ]]; then
  git remote rename origin upstream
else
  git remote add upstream "$UPSTREAM_URL"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$ORIGIN_URL"
else
  git remote add origin "$ORIGIN_URL"
fi

echo "Configured remotes:"
git remote -v
echo
echo "Next steps:"
echo "1) git fetch upstream"
echo "2) git checkout master"
echo "3) git rebase upstream/master"
echo "4) git push -u origin codex/enhancement-bootstrap"
