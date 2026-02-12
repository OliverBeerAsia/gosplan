# Release Notes v1.2.0

Date: 2026-02-12

## Highlights

- District-aware building facades now visually differentiate worker housing, heavy industry, scientific civic cores, and historic-style districts.
- New environment prop pass adds kiosks, bus stops, lamp posts, fences, utility poles, and courtyard greenery.
- Queue visuals are now driven by a shared queue-pressure model used by both rendering and diagnostics.
- Graphics quality tiers (`LOW`, `MED`, `HIGH`) now govern props, queues, particles, and overlay density more consistently.

## Player-Facing Improvements

- Stronger Soviet atmosphere without sacrificing simulation readability.
- Better visual variety and less repetitive districts.
- Clearer service stress feedback through queues and info panel pressure bands.

## Technical Notes

- Build pipeline: passing (`npm run build`)
- Preview smoke: passing (`HTTP/1.1 200 OK` on local preview endpoint)

## Upgrade Guidance

- Existing saves remain compatible.
- For best visual fidelity, use `HIGH` graphics quality.
