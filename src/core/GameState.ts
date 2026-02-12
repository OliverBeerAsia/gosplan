import { STARTING_BUDGET, STARTING_YEAR, BASE_HAPPINESS } from '../constants';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type GameMode = 'campaign' | 'sandbox';
export type DistrictStyle = 'worker_housing' | 'heavy_industry' | 'scientific_city' | 'historic_core';

export interface DistrictSnapshot {
  id: string;
  label: string;
  style: DistrictStyle;
  housingStress: number; // 0..100
  serviceAccess: number; // 0..100
  commute: number; // 0..100
  loyalty: number; // 0..100
  unrestRisk: number; // 0..100
  activity: number; // 0..100
}

export interface CityEventChoiceEffects {
  budget?: number;
  happiness?: number;
  cityLoyalty?: number;
  unrestLevel?: number;
  residentialDemand?: number;
  industrialDemand?: number;
  civicDemand?: number;
  commuteIndex?: number;
  serviceAccessIndex?: number;
  industrialEfficiency?: number;
}

export interface CityEventChoice {
  id: string;
  label: string;
  description: string;
  summary: string;
  effects: CityEventChoiceEffects;
}

export interface ActiveCityEvent {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  choices: CityEventChoice[];
  startedTick: number;
  deadlineTick: number;
  sourceDistrictId?: string;
}

export interface BulletinEntry {
  id: string;
  tick: number;
  year: number;
  week: number;
  text: string;
  level: 'info' | 'warning' | 'success' | 'error';
}

export interface FiveYearPlanGoal {
  description: string;
  type: 'population' | 'power' | 'industrial' | 'housing' | 'happiness';
  target: number;
  current: number;
  completed: boolean;
}

export interface FiveYearPlan {
  goals: FiveYearPlanGoal[];
  startTick: number;
  endTick: number;
  active: boolean;
  index: number;
}

export interface GameStateData {
  mode: GameMode;
  budget: number;
  population: number;
  housingCapacity: number;
  powerCapacity: number;
  powerDemand: number;
  industrialOutput: number;
  happiness: number;
  week: number;
  year: number;
  totalTicks: number;
  speed: number; // 0=pause, 1=1x, 2=2x, 4=4x
  currentPlan: FiveYearPlan | null;
  planIndex: number;
  lastTickIncome: number;
  lastTickExpense: number;
  lastTickNet: number;
  residentialDemand: number; // -100..100
  industrialDemand: number; // -100..100
  civicDemand: number; // -100..100
  graphicsQuality: GraphicsQuality;
  cityLoyalty: number; // 0..100
  unrestLevel: number; // 0..100
  commuteIndex: number; // 0..100
  serviceAccessIndex: number; // 0..100
  industrialEfficiency: number; // 0.5..1.5
  happinessModifier: number; // -30..30, event/policy drift
  activeDirective: string;
  performancePressure: number; // 0..100
  districtStats: DistrictSnapshot[];
  activeEvent: ActiveCityEvent | null;
  bulletin: BulletinEntry[];
}

export function createInitialState(): GameStateData {
  return {
    mode: 'campaign',
    budget: STARTING_BUDGET,
    population: 50,
    housingCapacity: 0,
    powerCapacity: 0,
    powerDemand: 0,
    industrialOutput: 0,
    happiness: BASE_HAPPINESS,
    week: 1,
    year: STARTING_YEAR,
    totalTicks: 0,
    speed: 1,
    currentPlan: null,
    planIndex: 0,
    lastTickIncome: 0,
    lastTickExpense: 0,
    lastTickNet: 0,
    residentialDemand: 0,
    industrialDemand: 0,
    civicDemand: 0,
    graphicsQuality: 'high',
    cityLoyalty: 50,
    unrestLevel: 20,
    commuteIndex: 45,
    serviceAccessIndex: 35,
    industrialEfficiency: 1,
    happinessModifier: 0,
    activeDirective: 'Five-Year Plan mobilization in progress.',
    performancePressure: 40,
    districtStats: [],
    activeEvent: null,
    bulletin: [],
  };
}
