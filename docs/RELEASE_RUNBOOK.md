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
   - `npm run check:atlas`
   - `npm run check:determinism`
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
4. Confirm GitHub Pages deploy succeeds (check Actions tab for the `Deploy to GitHub Pages` workflow).
5. Verify the live site loads at https://oliverbeerasia.github.io/gosplan/.

## GitHub Pages Deployment

The game auto-deploys to GitHub Pages on every push to `main`.

- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Build type:** GitHub Actions workflow (configured via Pages settings)
- **Output:** Vite builds to `./dist` with base path `/gosplan/`
- **URL:** https://oliverbeerasia.github.io/gosplan/

No manual deploy step is required. If the deploy fails, check the Actions tab for logs.

## Rollback Plan

1. Revert problematic commit on `main`.
2. Publish hotfix release with incremented patch version.
3. Add issue note in changelog and release body.
