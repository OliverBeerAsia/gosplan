# Test Report v1.2.0 (Graphics Upgrade)

Date: 2026-02-12

## Automated Validation

Command:

```bash
npm run build
```

Result:
- Passed
- TypeScript compilation successful
- Vite production bundle generated successfully

Preview smoke:

```bash
npm run preview -- --host 127.0.0.1 --port 4174
curl -I http://127.0.0.1:4174/
```

Result:
- Passed
- Received `HTTP/1.1 200 OK`

## Manual Smoke Checklist

- Start game and place buildings across categories.
- Toggle overlays:
  - power (`P`)
  - service (`C`)
- Toggle graphics quality:
  - toolbar `TOOLS -> GRAPHICS`
  - keyboard cycle (`G`)
- Validate district visuals:
  - place residential, industrial, civic/service, and decorative buildings in mixed zone contexts
  - confirm district facade variants appear and remain readable
- Validate prop layer:
  - paint housing/civic/industry zones and add roads
  - confirm kiosks/bus stops/fences/poles/courtyard props adapt by context
- Confirm no crashes when:
  - placing/demolishing rapidly
  - switching quality tiers repeatedly
  - observing queue visuals under different demand conditions

## Notes

- Current pass validates integration and build stability.
- Performance profiling and screenshot baseline checks should be added in the next visual pack cycle.
