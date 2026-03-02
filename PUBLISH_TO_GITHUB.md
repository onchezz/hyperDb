# Publish Enhanced Fork To GitHub

## Current blocker

This environment is not authenticated with GitHub CLI and has no GitHub SSH key configured.

Observed:

- `gh auth status` -> not logged in
- `ssh -T git@github.com` -> `Permission denied (publickey)`

## One-time auth

Use either method:

1. GitHub CLI auth
   - `gh auth login`
2. SSH auth
   - `ssh-keygen -t ed25519 -C "your_email@example.com"`
   - add public key to GitHub account
   - verify with `ssh -T git@github.com`

## Create new repository and push

From repo root:

```bash
gh repo create onchezz/watermelondb-enhanced --private --source=. --remote=origin --push
```

Or use the included helper script:

```bash
./scripts/publish-enhanced-repo.sh onchezz watermelondb-enhanced private
```

If repository already exists:

```bash
git remote set-url origin git@github.com:onchezz/watermelondb-enhanced.git
git push -u origin codex/enhancement-bootstrap
```

## Recommended first push content

1. Enhanced code from `codex/enhancement-bootstrap`
2. `ENHANCED_DB_DOCUMENTATION.md`
3. `docs-website/docs/docs/Reactive.md`
4. `docs-website/docs/docs/Sync/PeerToPeer.md`
5. `ENHANCEMENTS.md`
