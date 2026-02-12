import { GraphicsQuality } from '../core/GameState';

export interface QueuePressureInput {
  eligible: boolean;
  civicDemand: number;
  residentialDemand: number;
  localCoverage: number;
  budget: number;
  powered: boolean;
}

const QUEUE_BALANCE = {
  civicDemandWeight: 0.46,
  residentialDemandWeight: 0.21,
  // Coverage below this threshold starts pushing queues quickly.
  targetCoverage: 46,
  coverageWeight: 1.08,
  budgetDeficitPenalty: 12,
  unpoweredPenalty: 24,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeQueuePressure(input: QueuePressureInput): number {
  if (!input.eligible) return 0;

  const demandPressure =
    Math.max(0, input.civicDemand) * QUEUE_BALANCE.civicDemandWeight +
    Math.max(0, input.residentialDemand) * QUEUE_BALANCE.residentialDemandWeight;

  const coveragePressure =
    Math.max(0, QUEUE_BALANCE.targetCoverage - input.localCoverage) *
    QUEUE_BALANCE.coverageWeight;

  const budgetPressure = input.budget < 0 ? QUEUE_BALANCE.budgetDeficitPenalty : 0;
  const powerPressure = input.powered ? 0 : QUEUE_BALANCE.unpoweredPenalty;

  return clamp(Math.round(demandPressure + coveragePressure + budgetPressure + powerPressure), 0, 100);
}

export function queueCountFromPressure(pressure: number, quality: GraphicsQuality): number {
  if (pressure < 32) return 0;
  if (pressure < 45) return quality === 'high' ? 1 : 0;
  if (pressure < 58) return quality === 'high' ? 2 : 1;
  if (pressure < 72) return quality === 'high' ? 3 : 2;
  if (pressure < 86) return quality === 'high' ? 4 : 3;
  return quality === 'high' ? 5 : 4;
}

export function queuePressureBand(pressure: number): 'low' | 'medium' | 'high' | 'severe' {
  if (pressure < 32) return 'low';
  if (pressure < 58) return 'medium';
  if (pressure < 82) return 'high';
  return 'severe';
}
