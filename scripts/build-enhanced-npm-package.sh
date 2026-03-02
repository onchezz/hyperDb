#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_DIR="${PUBLISH_DIR:-$ROOT_DIR/.npm-package}"
NPM_CACHE_DIR="${NPM_CACHE_DIR:-$ROOT_DIR/.npm-cache}"
PACKAGE_SCOPE="${PACKAGE_SCOPE:-@onchezz}"
PACKAGE_BASENAME="${PACKAGE_BASENAME:-hyperdb}"
PACKAGE_NAME="${PACKAGE_NAME:-$PACKAGE_SCOPE/$PACKAGE_BASENAME}"
PACKAGE_REPOSITORY_URL="${PACKAGE_REPOSITORY_URL:-https://github.com/onchezz/hyperDb.git}"
PACKAGE_HOMEPAGE="${PACKAGE_HOMEPAGE:-https://github.com/onchezz/hyperDb#readme}"
PACKAGE_BUGS_URL="${PACKAGE_BUGS_URL:-https://github.com/onchezz/hyperDb/issues}"

if [[ "${PACKAGE_NAME}" != @*/* ]]; then
  echo "PACKAGE_NAME must be scoped (example: @onchezz/hyperdb)"
  exit 1
fi

echo "[1/5] Building WatermelonDB dist"
cd "$ROOT_DIR"
npm run build

echo "[2/5] Preparing package workspace: $PUBLISH_DIR"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"
cp -R "$ROOT_DIR/dist/." "$PUBLISH_DIR/"

echo "[3/5] Rewriting package metadata for enhanced npm publish"
node - "$PUBLISH_DIR/package.json" "$PACKAGE_NAME" "$PACKAGE_REPOSITORY_URL" "$PACKAGE_HOMEPAGE" "$PACKAGE_BUGS_URL" <<'NODE'
const fs = require('fs')

const file = process.argv[2]
const packageName = process.argv[3]
const repositoryUrl = process.argv[4]
const homepage = process.argv[5]
const bugsUrl = process.argv[6]

const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
const baseVersion = pkg.version
const suffixFromEnv = process.env.ENHANCED_VERSION_SUFFIX || 'enhanced.0'
const explicitVersion = process.env.ENHANCED_VERSION
const isPreRelease = baseVersion.includes('-')
const computedVersion = explicitVersion || (isPreRelease ? `${baseVersion}.${suffixFromEnv}` : `${baseVersion}-${suffixFromEnv}`)

pkg.name = packageName
pkg.version = computedVersion
pkg.author = '@onchezz'
pkg.repository = { type: 'git', url: repositoryUrl }
pkg.homepage = homepage
pkg.bugs = bugsUrl
pkg.publishConfig = { access: 'public' }

delete pkg.private

fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`Prepared ${pkg.name}@${pkg.version}`)
NODE

echo "[4/5] Packing tarball"
cd "$PUBLISH_DIR"
TARBALL_NAME="$(npm pack --silent --cache "$NPM_CACHE_DIR")"

echo "[5/5] Completed"
echo "Packaged: $PUBLISH_DIR/$TARBALL_NAME"

echo
cat <<TXT
Next steps:
  cd "$PUBLISH_DIR"
  npm publish --access public
TXT
