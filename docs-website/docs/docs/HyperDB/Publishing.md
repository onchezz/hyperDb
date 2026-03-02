---
title: Publishing and Versioning
---

# Publishing and Versioning

HyperDB publish flow in this fork is built around packaging WatermelonDB dist output with HyperDB metadata.

## Package identity

- Repository: `onchezz/hyperDb`
- npm package: `@onchezz/hyperdb`
- Version pattern: `<watermelon-version>.enhanced.<n>`

## Build package artifact

```bash
npm run build:enhanced:npm
```

Output:

- `.npm-package/onchezz-hyperdb-<version>.tgz`

## Override package metadata

```bash
PACKAGE_NAME=@your-scope/hyperdb npm run build:enhanced:npm
ENHANCED_VERSION=0.28.1-0.enhanced.5 npm run build:enhanced:npm
```

## Publish

```bash
npm login
npm run publish:enhanced:npm
```

Prerelease tag:

```bash
NPM_TAG=next npm run publish:enhanced:npm
```

## 2FA and tokens

If npm publish fails with 403 around 2FA/token policy:

- Use npm account 2FA OTP during publish, or
- Use granular npm token with publish permissions and bypass-2fa policy where required by your npm org setup.

## Cache/permission note

Scripts in this repo use a local cache path to avoid global `~/.npm` permission issues.

## Verification

```bash
npm view @onchezz/hyperdb version
npm view @onchezz/hyperdb dist-tags
```

## Consumer install

```bash
npm install @onchezz/hyperdb
```
