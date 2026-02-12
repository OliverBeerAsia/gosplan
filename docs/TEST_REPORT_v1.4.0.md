# Test Report v1.4.0

Date: 2026-02-12

## Automated Build Validation

Command:

```bash
npm run build
```

Result:
- Passed
- TypeScript compile succeeded
- Vite production build succeeded

## Preview Startup Smoke

Command:

```bash
npm run preview -- --host 127.0.0.1 --port 4174
```

Result:
- Passed (server booted and reported local URL)

Note:
- In this execution sandbox, direct `curl` to the localhost preview endpoint is restricted, so HTTP probe validation is environment-limited.

## Manual Feature Checklist

- Confirm title screen shows three campaign scenario cards with scenario context.
- Start each scenario and verify opening conditions differ (budget/order/mobility/demand baselines).
- Reach scenario target year and verify campaign report modal appears with ending and score.
- Verify `Continue as Sandbox` switches mode and resumes simulation.
- Unlock at least one achievement and confirm notification, bulletin entry, and honors panel update.
- Save and reload after campaign completion; verify ending report can reconstruct from saved state.

## Residual Risk Notes

- Campaign score and ending thresholds may require balancing against long-horizon city growth curves.
- Dense HUD layouts on smaller displays should continue to be iterated in future UI passes.
