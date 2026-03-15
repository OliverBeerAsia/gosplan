// Isometric tile dimensions (2:1 dimetric ratio like SimCity 2000)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_HALF_W = TILE_WIDTH / 2;
export const TILE_HALF_H = TILE_HEIGHT / 2;

// Map size
export const MAP_SIZE = 32;

// Elevation
export const ELEVATION_HEIGHT = 32;

// Camera
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.0;
export const ZOOM_SPEED = 0.1;

// Simulation
export const BASE_TICK_MS = 3600; // slower week pacing at 1x speed
export const TICKS_PER_YEAR = 52; // 52 weeks per year
export const FIVE_YEAR_PLAN_TICKS = 5 * TICKS_PER_YEAR;

// Starting resources
export const STARTING_BUDGET = 75000;
export const STARTING_YEAR = 1980;

// === Era Progression System ===
// Population thresholds for era transitions (peak population)
export const ERA_THRESHOLDS = [0, 200, 1000, 3000]; // Era 1..4
export const ERA_COUNT = 4;

// Tick speed per era (ms per week at 1x): Era 1 is slowest (more learning time)
export const ERA_TICK_SPEEDS = [5000, 4000, 3600, 3600];

// Economy per era
export const ERA_INCOME_BASE = [800, 700, 500, 500];
export const ERA_INCOME_PER_POP = [0.7, 0.6, 0.5, 0.5];
export const ERA_MAINTENANCE_MULT = [0.6, 0.8, 1.0, 1.2];

// Building era gates: which era unlocks each building
export const BUILDING_ERA: Record<string, number> = {
  kommunalka: 1,
  coal_power_plant: 1,
  road: 1,
  power_line: 1,
  park: 1,
  khrushchyovka: 2,
  factory: 2,
  warehouse: 2,
  school: 2,
  hospital: 2,
  monument: 2,
  fountain: 2,
  stalinka: 3,
  panelak: 3,
  cinema: 3,
  radio_tower: 3,
  metro_station: 3,
  plaza: 3,
  sports_complex: 3,
  party_hq: 4,
};

// Population
export const BASE_GROWTH_RATE = 0.03; // 3% per tick when conditions met
export const HAPPINESS_THRESHOLD = 30; // minimum happiness for growth

// Power
export const POWER_ADJACENCY_RANGE = 1; // buildings within 1 tile of powered building get power

// Happiness
export const BASE_HAPPINESS = 50;
export const NO_POWER_PENALTY = -20;
export const OVERCROWDING_PENALTY = -15;
export const PARK_BONUS = 5;
export const SERVICE_BONUS = 8; // hospital, school
export const MONUMENT_BONUS = 3;
