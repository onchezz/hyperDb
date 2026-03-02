---
title: Troubleshooting
---

# Troubleshooting

## `Page Not Found` analysis

If you saw:

> Page Not Found
> We could not find what you were looking for.

The most common cause in this setup is an old or incorrect URL path.

### Root cause in this project

HyperDB docs are hosted as a **GitHub project pages** site under:

- `https://onchezz.github.io/hyperDb/`

This means root-domain paths like:

- `https://onchezz.github.io/docs`

are outside the HyperDB project pages base path and will return 404 unless separately handled by an `onchezz.github.io` user-site repository.

### Correct URLs

Use:

- `https://onchezz.github.io/hyperDb/`
- `https://onchezz.github.io/hyperDb/HyperDB/Overview`

### What was fixed in docs routing

- Removed homepage redirect to `/docs`.
- Removed stale `/docs/...` assumptions from HyperDB docs links.
- Added HyperDB-first navigation and links.

## `Your Docusaurus site did not load properly` banner

Usually indicates wrong `baseUrl` vs deployed path mismatch.

For this repo, expected values are:

- `url: https://onchezz.github.io`
- `baseUrl: /hyperDb/`
- pages source: `gh-pages` branch root

## `@onchezz/hyperdb` publish errors

### 403 with 2FA/token requirement

Use OTP on publish or a valid granular token with required permissions.

### Auth token expired/revoked

Re-login:

```bash
npm login
```

## Expo compile or runtime errors

### Flow syntax parsing errors in node_modules (`@lazy`)

Do not import package internals like `src/...`.

Use only:

- `@onchezz/hyperdb`
- `@onchezz/hyperdb/adapters/sqlite`
- `@onchezz/hyperdb/reactive/react`

### Native build not reflecting dependency updates

Rebuild native app:

```bash
npx expo run:android
# or
npx expo run:ios
```

## TypeScript config conflict

If you see `TS5053` (`emitDeclarationOnly` + `noEmit`), run those options in separate configs/profiles.
