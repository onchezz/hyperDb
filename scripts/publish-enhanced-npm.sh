#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_DIR="${PUBLISH_DIR:-$ROOT_DIR/.npm-package}"
NPM_TAG="${NPM_TAG:-latest}"

cd "$ROOT_DIR"
"$ROOT_DIR/scripts/build-enhanced-npm-package.sh"

echo "Publishing from: $PUBLISH_DIR"
cd "$PUBLISH_DIR"
npm publish --access public --tag "$NPM_TAG"
