# Bug Check v1.9.4

Date: 2026-05-17

## Verification Commands

```bash
npm run build
npm run check:atlas
npm run check:determinism
git diff --check
```

## Findings

- Production build passes.
- Atlas and determinism checks remain green.
- Visual QA confirms the coal plant stack assembly is attached to the building mass.

## Residual Risk

- Further fine art tuning could still improve the exact stack proportions, but the detached-prop bug is resolved.
