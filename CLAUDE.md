# CLAUDE.md - GOSPLAN Soviet City Builder

## Project Overview

GOSPLAN is a browser-based SimCity 2000-style city building game with a Soviet theme. Players manage a Soviet city by constructing buildings, managing power grids, growing population, and completing five-year plans. The game is entirely client-side with no backend.

**Tech stack:** TypeScript, Vite, Pixi.js (WebGL 2D renderer)

## Commands

```bash
npm run dev       # Start dev server on http://localhost:3000 (Vite HMR)
npm run build     # Type-check with tsc, then production build with Vite
npm run preview   # Preview production build locally
```

There is no test framework, linter, or CI/CD configured.

## Architecture

### Directory Structure

```
src/
  main.ts                    # Entry point - creates Game instance
  constants.ts               # All game tuning parameters
  core/
    Game.ts                  # Main orchestrator - initializes all subsystems
    GameState.ts             # State interface (budget, population, year, etc.)
    EventBus.ts              # Type-safe pub/sub event system
    SaveLoad.ts              # localStorage persistence
  buildings/
    BuildingRegistry.ts      # Building definitions (13 types)
    BuildingTypes.ts         # Type interfaces for buildings
  grid/
    Grid.ts                  # 32x32 cell array with terrain/building tracking
    BuildingPlacer.ts        # Validates and places buildings on grid
    Cell.ts                  # Single grid cell representation
  simulation/
    SimulationManager.ts     # Orchestrates tick-based simulation
    PowerService.ts          # BFS flood-fill power distribution
    EconomyService.ts        # Budget, income, maintenance costs
    PopulationService.ts     # Housing capacity and population growth
    FiveYearPlan.ts          # Goal tracking with plan templates
  rendering/
    IsometricRenderer.ts     # Screen <-> grid coordinate transforms
    Camera.ts                # Viewport with pan/zoom (0.25x - 2.0x)
    TerrainRenderer.ts       # Ground and water tiles
    BuildingRenderer.ts      # Building sprites
    OverlayRenderer.ts       # Selection highlights, ghost previews, power overlay
    SmokeParticles.ts        # Industrial building particle effects
  graphics/
    TextureFactory.ts        # Generates all textures at startup
    BuildingTextures.ts      # Procedural building texture generation
    TerrainTextures.ts       # Procedural terrain texture generation
    SovietPalette.ts         # Soviet-themed color constants
  input/
    ToolController.ts        # Building placement, demolition, selection tools
    CameraController.ts      # Mouse/keyboard camera controls
  ui/
    styles/soviet-theme.css  # Soviet propaganda-themed CSS (variables, animations)
    ResourceBar.ts           # Top bar: budget, population, power, date
    Toolbar.ts               # Bottom bar: building categories and selection
    InfoPanel.ts             # Right panel: selected building details
    PlanPanel.ts             # Left panel: five-year plan goals
    Minimap.ts               # Bottom-right minimap
    NotificationManager.ts   # Toast notifications
    BuildingPanel.ts         # Building tooltip on hover
    TitleScreen.ts           # Start/load screen
```

### Key Design Patterns

- **Event-driven architecture**: `EventBus` (type-safe pub/sub) decouples all subsystems. Events are defined in `GameEvents` type in `src/core/EventBus.ts`.
- **Service pattern**: Simulation is split into independent services (Power, Economy, Population, FiveYearPlan) managed by `SimulationManager`.
- **Tick-based simulation**: 1-second base tick, 52 ticks/year, configurable speed (pause, 1x, 2x, 4x). Tick order: Power -> Happiness -> Economy -> Population -> Plan.
- **Multi-cell buildings**: Buildings can span multiple grid cells using a master/slave cell model.
- **DOM UI + WebGL game**: UI panels are plain DOM elements; the game world is rendered via Pixi.js WebGL canvas.
- **Procedural textures**: All graphics are generated at runtime via canvas drawing (no sprite assets).

### Data Flow

1. `main.ts` creates `Game`, calls `init(container)`
2. `Game.init()` sets up Pixi.js, shows `TitleScreen`
3. On start/load, `Game.startGame()` initializes grid, renderers, simulation, UI, and starts the ticker
4. `SimulationManager` fires periodic ticks updating services
5. Services emit events -> UI listens and updates DOM
6. `ToolController` handles user input -> calls `BuildingPlacer` -> emits events -> renderers update

### Persistence

- `localStorage`-based save/load with version-aware deserialization
- Auto-save every 60 seconds
- Manual save via Ctrl+S

## Code Conventions

- **TypeScript strict mode** with `ES2020` target
- **ES Modules** (`"type": "module"` in package.json)
- **Path alias**: `@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- **No classes for pure data**: Interfaces and plain objects for state; classes for subsystems with behavior
- **Event names**: Namespaced with colons (e.g., `building:placed`, `power:updated`, `speed:changed`)
- **Constants**: All tuning parameters centralized in `src/constants.ts`
- **Building definitions**: Registered in `BuildingRegistry` with category, size, cost, power, and description
- **CSS**: Custom properties for theming (`--soviet-red`, `--soviet-gold`, etc.) in `soviet-theme.css`
- **No external runtime dependencies** except `pixi.js`

## Game Parameters (constants.ts)

| Parameter | Value | Description |
|-----------|-------|-------------|
| MAP_SIZE | 32 | Grid dimensions (32x32) |
| TILE_WIDTH / TILE_HEIGHT | 64 / 32 | Isometric 2:1 dimetric ratio |
| BASE_TICK_MS | 1000 | 1 tick per second at 1x speed |
| TICKS_PER_YEAR | 52 | Weekly granularity |
| STARTING_BUDGET | 50,000 | Initial rubles |
| STARTING_YEAR | 1980 | Game start year |
| BASE_GROWTH_RATE | 0.015 | 1.5% population growth per tick |
| HAPPINESS_THRESHOLD | 30 | Minimum happiness for growth |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1 | Pause |
| 2 | Speed 1x |
| 3 | Speed 2x |
| 4 | Speed 4x |
| P | Toggle power overlay |
| Ctrl+S | Manual save |
| Escape | Cancel current tool / deselect |
