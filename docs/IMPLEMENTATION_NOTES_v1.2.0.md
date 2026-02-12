# Implementation Notes v1.2.0

Date: 2026-02-12

## Summary

v1.2.0 delivers a district-focused graphics pack:
- district-specific facade variants
- environment prop pass
- tuned shared queue-pressure model
- quality-tier integration across new systems

## Key Technical Changes

### 1) District Facade Variants

- `src/graphics/TextureFactory.ts`
  - added district variant generation (`_district_worker_housing`, `_district_heavy_industry`, `_district_scientific_city`, `_district_historic_core`)
  - district variants are generated for base and style variants before unpowered variants

- `src/rendering/BuildingRenderer.ts`
  - chooses district style by local zone influence, building category, and service coverage
  - applies district-aware texture key selection with safe fallbacks

### 2) Environment Prop Pass

- `src/graphics/TerrainTextures.ts`
  - added prop textures:
    - `prop_lamp`
    - `prop_fence`
    - `prop_kiosk`
    - `prop_courtyard`
    - `prop_pole`
    - `prop_bus_stop`

- `src/rendering/EnvironmentPropRenderer.ts`
  - new renderer layer for context-aware prop placement
  - deterministic tile-hash placement to avoid visual jitter
  - responds to:
    - building placement/demolition
    - zone changes
    - terrain changes
    - quality changes

- `src/core/Game.ts`
  - integrated prop renderer into world render order and quality fan-out

### 3) Queue Balance Model

- `src/simulation/QueuePressureModel.ts`
  - centralized queue pressure coefficients and threshold mapping

- `src/rendering/BuildingRenderer.ts`
  - queue count now derives from shared model

- `src/ui/InfoPanel.ts`
  - queue pressure diagnostics now use the same model and display pressure band

## Notes on Performance

- Props are hidden in `low` quality and reduced in `medium`.
- Queue sprite density scales by quality and pressure thresholds.
- Build remains within current production budget and compiles without errors.
