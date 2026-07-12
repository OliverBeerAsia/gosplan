#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require('./install-node-browser-globals.cjs');

// Execute dependency-light project modules with the compiler already installed.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { EventBus } = require('../src/core/EventBus.ts');
const { createInitialState } = require('../src/core/GameState.ts');
const { Grid } = require('../src/grid/Grid.ts');
const { BuildingRegistry } = require('../src/buildings/BuildingRegistry.ts');
const { BuildingPlacer } = require('../src/grid/BuildingPlacer.ts');
const { UndoManager } = require('../src/core/UndoManager.ts');
const {
  shouldBlockSpeedChange,
  shouldSuppressGameplayShortcut,
} = require('../src/ui/PauseMenu.ts');
const { canTraverseRoadEdge } = require('../src/rendering/TrafficRenderer.ts');
const { computeNetworkConnectionMask } = require('../src/rendering/BuildingRenderer.ts');
const { PowerService, canTraversePowerEdge } = require('../src/simulation/PowerService.ts');
const { hasEqualElevationRoadAccess } = require('../src/simulation/ZoneGrowthService.ts');
const { hasRoadNearbyAtEqualElevation } = require('../src/simulation/CommuteService.ts');

// Modal keyboard and speed guards.
for (const key of ['Tab', 'z', 'x', 'q', '1', 'p']) {
  assert.equal(shouldSuppressGameplayShortcut(true, key), true, `${key} must be inert while paused`);
}
assert.equal(shouldSuppressGameplayShortcut(true, 'Escape'), false, 'Escape must close the dialog');
assert.equal(shouldSuppressGameplayShortcut(false, 'Tab'), false, 'Tab is not globally suppressed');
assert.equal(shouldBlockSpeedChange(true, 4), true, 'positive speed must be blocked while paused');
assert.equal(shouldBlockSpeedChange(true, 0), false);
assert.equal(shouldBlockSpeedChange(false, 4), false);

// Drag cancellation through leave, outside release, blur, and listener teardown.
class FakeCanvas extends EventTarget {
  constructor() {
    super();
    this.style = {};
    this.parentElement = null;
  }
}

function eventWith(type, props = {}) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

global.window = new EventTarget();
const { ToolController } = require('../src/input/ToolController.ts');
const dragGrid = new Grid(4);
const dragRegistry = new BuildingRegistry();
const dragEvents = new EventBus();
const dragPlacer = new BuildingPlacer(dragGrid, dragRegistry, dragEvents);
const canvas = new FakeCanvas();
const overlay = {
  clearGhost() {},
  clearZoneGhost() {},
  clearSelection() {},
  showGhost() {},
  showTileGhost() {},
  showZoneGhost() {},
  showClearZoneGhost() {},
  showSelection() {},
  flashPowerOverlay() {},
};
const controller = new ToolController(
  dragEvents,
  { x: 0, y: 0, zoom: 1 },
  { dragging: false },
  dragGrid,
  dragPlacer,
  dragRegistry,
  overlay,
  createInitialState(),
  canvas,
);
controller.setTool('zone', undefined, 'housing', 'residential');

const press = () => canvas.dispatchEvent(eventWith('mousedown', {
  button: 0,
  shiftKey: false,
  clientX: 0,
  clientY: 0,
}));
press();
assert.equal(controller.isDragActive(), true);
canvas.dispatchEvent(new Event('mouseleave'));
assert.equal(controller.isDragActive(), false, 'canvas leave must cancel drag');
press();
window.dispatchEvent(eventWith('pointerup', { button: 0 }));
assert.equal(controller.isDragActive(), false, 'outside pointerup must cancel drag');
press();
window.dispatchEvent(new Event('blur'));
assert.equal(controller.isDragActive(), false, 'window blur must cancel drag');
controller.destroy();
press();
assert.equal(controller.isDragActive(), false, 'destroy must remove drag listeners');

// Cosmetic courtyards resolve inspect/demolish affordances to their owner.
const environmentGrid = new Grid(6);
const environmentRegistry = new BuildingRegistry();
const environmentEvents = new EventBus();
const environmentPlacer = new BuildingPlacer(
  environmentGrid,
  environmentRegistry,
  environmentEvents,
);
const environmentOwner = environmentPlacer.restore('khrushchyovka', 1, 1, {
  id: 901,
  emitEvent: false,
});
assert.ok(environmentOwner);
const environmentCanvas = new FakeCanvas();
let selectedEnvironmentOwner = null;
let environmentNotice = '';
environmentEvents.on('building:selected', (selection) => {
  selectedEnvironmentOwner = selection?.building ?? null;
});
environmentEvents.on('notification', ({ message }) => {
  environmentNotice = message;
});
const environmentController = new ToolController(
  environmentEvents,
  { x: 0, y: 0, zoom: 1 },
  { dragging: false },
  environmentGrid,
  environmentPlacer,
  environmentRegistry,
  overlay,
  createInitialState(),
  environmentCanvas,
  (gx, gy) => gx === 0 && gy === 0
    ? { definitionId: 'environment.worker_housing.play_square', variantId: 'oxide_climber', ownerBuildingId: 901 }
    : undefined,
);
environmentController.onClick(0, 0);
assert.equal(selectedEnvironmentOwner?.id, 901, 'courtyard inspect must select its owner');
environmentController.setTool('demolish');
assert.equal(environmentController.tryDemolish(0, 0), false, 'courtyard cannot be demolished independently');
assert.equal(environmentGrid.getBuildingById(901)?.id, 901, 'courtyard demolition must preserve owner');
assert.match(environmentNotice, /managed by Khrushchyovka/);
environmentController.destroy();

// Elevation cache invalidation.
const cacheGrid = new Grid(4);
assert.equal(cacheGrid.getMaxElevation(), 0);
cacheGrid.setElevation(3, 3, 2);
assert.equal(cacheGrid.getMaxElevation(), 2);
cacheGrid.setTerrain(3, 3, 'water');
assert.equal(cacheGrid.getMaxElevation(), 0);

// Uneven legacy demolition can be restored, and a blocked restore stays undoable.
function makeUndoFixture(id) {
  const grid = new Grid(6);
  grid.setElevation(2, 1, 1);
  const registry = new BuildingRegistry();
  const events = new EventBus();
  const placer = new BuildingPlacer(grid, registry, events);
  const state = createInitialState();
  const manager = new UndoManager(grid, placer, registry, state, events);
  const def = registry.get('khrushchyovka');
  const building = placer.restore(def.id, 1, 1, { id, emitEvent: false });
  assert.ok(building, 'legacy uneven fixture must restore');
  assert.equal(placer.demolish(1, 1), true);
  const refund = Math.floor(def.cost * 0.5);
  state.budget += refund;
  manager.pushAction({
    type: 'demolish',
    buildingDefId: def.id,
    gx: 1,
    gy: 1,
    cost: def.cost,
    buildingId: id,
  });
  return { grid, registry, placer, state, manager, refund };
}

const restored = makeUndoFixture(71);
const budgetWithRefund = restored.state.budget;
assert.equal(restored.manager.undo(), true);
assert.equal(restored.grid.getMasterBuilding(2, 1).id, 71);
assert.equal(restored.state.budget, budgetWithRefund - restored.refund);

const blocked = makeUndoFixture(81);
assert.ok(blocked.placer.place('kommunalka', 1, 1), 'blocker placement must succeed');
assert.equal(blocked.manager.undo(), false, 'blocked restore must fail safely');
assert.equal(blocked.placer.demolish(1, 1), true);
assert.equal(blocked.manager.undo(), true, 'failed undo action must remain available');
assert.equal(blocked.grid.getMasterBuilding(2, 1).id, 81);

// Roads and power lines cannot be placed or traversed vertically without ramps.
const networkGrid = new Grid(5);
networkGrid.setElevation(2, 1, 1);
const networkRegistry = new BuildingRegistry();
const networkEvents = new EventBus();
const networkPlacer = new BuildingPlacer(networkGrid, networkRegistry, networkEvents);
assert.ok(networkPlacer.place('road', 1, 1));
assert.equal(
  networkPlacer.getPlacementRejection('road', 2, 1, Number.POSITIVE_INFINITY),
  'Roads require equal elevation (ramps unavailable)',
);
assert.equal(networkPlacer.place('road', 2, 1), null);
assert.equal(canTraverseRoadEdge(networkGrid, 1, 1, 2, 1), false);

const legacyRoadGrid = new Grid(5);
legacyRoadGrid.setElevation(2, 1, 1);
legacyRoadGrid.placeBuilding({ id: 201, defId: 'road', gx: 1, gy: 1, powered: false }, 1, 1);
legacyRoadGrid.placeBuilding({ id: 202, defId: 'road', gx: 2, gy: 1, powered: false }, 1, 1);
assert.equal(
  computeNetworkConnectionMask(legacyRoadGrid, 1, 1, 'road'),
  0,
  'legacy roads across a cliff must not render as connected',
);
legacyRoadGrid.setElevation(2, 1, 0);
assert.equal(
  computeNetworkConnectionMask(legacyRoadGrid, 1, 1, 'road'),
  2,
  'equal-elevation eastern road must set the east connection bit',
);

const powerGrid = new Grid(5);
powerGrid.setElevation(2, 2, 1);
const powerPlacer = new BuildingPlacer(powerGrid, networkRegistry, new EventBus());
assert.ok(powerPlacer.place('power_line', 1, 1));
assert.equal(
  powerPlacer.getPlacementRejection('power_line', 2, 2, Number.POSITIVE_INFINITY),
  'Power lines require equal elevation (ramps unavailable)',
);
assert.equal(powerPlacer.place('power_line', 2, 2), null);

// Plant-to-line placement and traversal must not imply a connection up a cliff.
const cliffPowerGrid = new Grid(8);
const cliffPowerEvents = new EventBus();
const cliffPowerState = createInitialState();
const cliffPowerPlacer = new BuildingPlacer(cliffPowerGrid, networkRegistry, cliffPowerEvents);
const cliffPlant = cliffPowerPlacer.place('coal_power_plant', 0, 0);
assert.ok(cliffPlant);
cliffPowerGrid.setElevation(3, 1, 1);
assert.equal(
  cliffPowerPlacer.getPlacementRejection('power_line', 3, 1, Number.POSITIVE_INFINITY),
  'Power lines require equal elevation (ramps unavailable)',
  'line beside a plant on another elevation must reject truthfully',
);
const cliffLine = cliffPowerPlacer.restore('power_line', 3, 1, { id: 301, emitEvent: false });
assert.ok(cliffLine, 'legacy cliff line fixture must restore');
new PowerService(cliffPowerGrid, networkRegistry, cliffPowerState, cliffPowerEvents).tick();
assert.equal(cliffPlant.powered, true);
assert.equal(cliffLine.powered, false, 'plant power must not cross an unequal edge');
assert.equal(canTraversePowerEdge(cliffPowerGrid, 2, 1, 3, 1), false);

// Legacy line-to-line cliffs are disconnected, while level lines still work.
const legacyPowerGrid = new Grid(9);
const legacyPowerEvents = new EventBus();
const legacyPowerState = createInitialState();
const legacyPowerPlacer = new BuildingPlacer(legacyPowerGrid, networkRegistry, legacyPowerEvents);
const legacyPlant = legacyPowerPlacer.place('coal_power_plant', 0, 0);
const levelLine = legacyPowerPlacer.place('power_line', 3, 1);
legacyPowerGrid.setElevation(4, 1, 1);
const upperLine = legacyPowerPlacer.restore('power_line', 4, 1, { id: 311, emitEvent: false });
assert.ok(legacyPlant && levelLine && upperLine);
new PowerService(legacyPowerGrid, networkRegistry, legacyPowerState, legacyPowerEvents).tick();
assert.equal(levelLine.powered, true, 'equal-elevation plant/line control must connect');
assert.equal(upperLine.powered, false, 'legacy unequal line edge must stay disconnected');
legacyPowerGrid.setElevation(4, 1, 0);
new PowerService(legacyPowerGrid, networkRegistry, legacyPowerState, legacyPowerEvents).tick();
assert.equal(upperLine.powered, true, 'equal-elevation line control must connect');

// Road-based growth, inspector diagnostics, and commute scoring share elevation truth.
const accessGrid = new Grid(5);
const accessEvents = new EventBus();
const accessPlacer = new BuildingPlacer(accessGrid, networkRegistry, accessEvents);
assert.ok(accessPlacer.place('road', 1, 1));
accessGrid.setElevation(2, 1, 1);
const roads = new Set(['1,1']);
assert.equal(
  hasEqualElevationRoadAccess(accessGrid, networkRegistry, 2, 1, 1, 1),
  false,
  'road below a cliff must not service a zone/building footprint',
);
assert.equal(
  hasRoadNearbyAtEqualElevation(accessGrid, 2, 1, roads, 1),
  false,
  'road below a cliff must not improve commute scoring',
);
accessGrid.setElevation(2, 1, 0);
assert.equal(hasEqualElevationRoadAccess(accessGrid, networkRegistry, 2, 1, 1, 1), true);
assert.equal(hasRoadNearbyAtEqualElevation(accessGrid, 2, 1, roads, 1), true);

console.log('interaction-regression-check: ok');
