import { STARTING_BUDGET, STARTING_YEAR, BASE_HAPPINESS } from '../constants';

export type GraphicsQuality = 'low' | 'medium' | 'high';

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
}

export function createInitialState(): GameStateData {
  return {
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
  };
}
