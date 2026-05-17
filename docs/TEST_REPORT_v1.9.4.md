# Test Report v1.9.4

Date: 2026-05-17

## Automated Validation

Commands:

```bash
npm run build
npm run check:atlas
npm run check:determinism
git diff --check
```

Result:
- Passed.

## Visual QA

Scenario:
- Loaded a production-preview QA city containing a coal power plant, factory, warehouse, and roads.
- Zoomed in through Playwright and inspected the coal power plant at gameplay scale.

Result:
- Cooling towers and smokestack are attached to the coal plant roof/deck.
- The stack assembly no longer reads as detached from the main building.
- No transparent building body, ghosting, or rectangular bleed observed.
