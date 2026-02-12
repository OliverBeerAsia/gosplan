# Test Report v1.3.0

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

## Preview Smoke

Commands:

```bash
npm run preview -- --host 127.0.0.1 --port 4174
curl -I http://127.0.0.1:4174/
```

Result:
- Passed
- Endpoint returned `HTTP/1.1 200 OK`

## Manual Feature Checklist

- Start Campaign from title screen and confirm directives update.
- Start Sandbox and confirm Five-Year plan is not active.
- Observe district panel metrics update during city growth.
- Trigger and resolve at least one event choice modal.
- Confirm bulletin entries are added for directives and event outcomes.
- Verify resource bar `Order` and `Mobility` indicators update.
- Save and reload to confirm v4 state compatibility.

## Residual Risk Notes

- Event and directive balance coefficients may require tuning over longer play sessions.
- Dense-city UI overlays should be profiled on lower-end hardware in a later pass.
