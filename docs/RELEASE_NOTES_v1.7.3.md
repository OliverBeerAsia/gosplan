# Release Notes v1.7.3

Date: 2026-02-18

## Highlights

- Fixed industrial building visuals appearing too dark during unpowered states.
- Improved invalid placement ghost readability for blocked builds (e.g., hills).
- Tuned unpowered texture overlay intensity to preserve silhouette detail.

## Added Documents

- `docs/IMPLEMENTATION_NOTES_v1.7.3.md`
- `docs/MULTI_AGENT_REVIEW_v1.7.3.md`
- `docs/TEST_REPORT_v1.7.3.md`
- `docs/BUG_CHECK_v1.7.3.md`
- `docs/RELEASE_NOTES_v1.7.3.md`

## Validation

- Build/tests: `npm run build`, `npm run check:atlas`, `npm run check:determinism`
- Preview smoke: `npm run preview -- --host 127.0.0.1 --port 4174`
