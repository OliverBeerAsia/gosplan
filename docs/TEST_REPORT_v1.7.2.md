# Test Report v1.7.2

Date: 2026-02-18

## Automated Validation

Commands:

```bash
npm run build
npm run check:atlas
npm run check:determinism
npm run preview -- --host 127.0.0.1 --port 4174
node /tmp/gosplan_ui_qa.cjs
```

Result:
- Passed for `build`, `check:atlas`, and `check:determinism`.
- Preview startup smoke passed on `127.0.0.1:4174`.
- Full UI automation passed at `1920x1080` and `1366x768`:
  - successful placement attempts (`factory`, `panelak`, `hospital`)
  - no resource overflow
  - no panel/minimap overlap regressions
  - no notification/resource overlap regressions

## Targeted Regression Check

Focus:
- Tutorial hint and notification lane overlap at top HUD.

Artifacts:
- `/tmp/gosplan_qa/tutorial_overlap.json`
- `/tmp/gosplan_qa/tutorial_overlap_1366x768.png`
- `/tmp/gosplan_qa/tutorial_overlap_1920x1080.png`

Result:
- `anyOverlap: false` on both tested desktop resolutions.

## Documentation Validation

Checklist:
- Release docs created for v1.7.2:
  - `docs/IMPLEMENTATION_NOTES_v1.7.2.md`
  - `docs/MULTI_AGENT_REVIEW_v1.7.2.md`
  - `docs/TEST_REPORT_v1.7.2.md`
  - `docs/BUG_CHECK_v1.7.2.md`
  - `docs/RELEASE_NOTES_v1.7.2.md`
- `README.md` current release metadata updated to v1.7.2.
- `CHANGELOG.md` includes v1.7.2 entry.

Result:
- Passed
