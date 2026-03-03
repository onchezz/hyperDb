---
title: Publishing and Versioning
---

# Publishing and Versioning

HyperTillDB publish flow packages the built `dist/` output with HyperTillDB metadata.

## Identity

- Repository: `onchezz/hyperDb`
- npm package: `@onchez/hypertilldb`
- Version style: semantic (`0.x` while stabilizing type-first API)

## Build tarball

```bash
npm run build:hypertill:npm
```

Output:

- `.npm-package/onchez-hypertilldb-<version>.tgz`

## Override package metadata

```bash
PACKAGE_NAME=@your-scope/hypertilldb npm run build:hypertill:npm
HYPERTILL_VERSION=0.0.2 npm run build:hypertill:npm
```

## Publish to npm

```bash
npm login
npm run publish:hypertill:npm
```

Pre-release tag:

```bash
NPM_TAG=next npm run publish:hypertill:npm
```

## Verify

```bash
npm view @onchez/hypertilldb version
npm view @onchez/hypertilldb dist-tags
```

## GitHub Pages docs deploy

For repository `hyperDb`, ensure docs config uses:

- `url = https://onchezz.github.io`
- `baseUrl = /hyperDb/` (or `DOCS_BASE_URL=/docs/` if deploying to `/docs`)
- `projectName = hyperDb`

Then deploy docs from `docs-website`:

```bash
yarn deploy
```
