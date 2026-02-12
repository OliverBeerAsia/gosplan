# Release Runbook

## Scope

This runbook describes how to publish GOSPLAN releases to GitHub with traceable docs and validation evidence.

## Pre-Release Checklist

1. Update version in `package.json` and `package-lock.json`.
2. Update `CHANGELOG.md`.
3. Ensure release docs exist:
   - `docs/IMPLEMENTATION_NOTES_<version>.md`
   - `docs/MULTI_AGENT_REVIEW_<version>.md`
   - `docs/TEST_REPORT_<version>.md`
4. Run automated checks:
   - `npm run build`
   - Atlas sanity script
   - Dev server startup smoke
5. Confirm git status is clean except intended release files.

## Git Release Steps

```bash
git add -A
git commit -m "release: v<version>"
git tag -a v<version> -m "Release v<version>"
git push origin main
git push origin v<version>
```

## GitHub Release Steps

1. Open GitHub repository Releases page.
2. Create release from tag `v<version>`.
3. Title: `v<version>`.
4. Body: summarize changes from `CHANGELOG.md` and link docs files.
5. Attach any media/snapshots if needed.
6. Publish.

## Post-Release Verification

1. Confirm tag and release are visible on GitHub.
2. Confirm release notes render correctly.
3. Confirm clone + `npm install && npm run build` works from clean environment.

## Rollback Plan

1. Revert problematic commit on `main`.
2. Publish hotfix release with incremented patch version.
3. Add issue note in changelog and release body.
