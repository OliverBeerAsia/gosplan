import { CampaignScenarioId, GameStateData } from '../core/GameState';
import { assetPath } from '../utils/assetPath';

export interface CampaignScenarioDef {
  id: Exclude<CampaignScenarioId, 'none'>;
  label: string;
  subtitle: string;
  targetYear: number;
  openingDirective: string;
  cardArt?: string;
  applyStart: (state: GameStateData) => void;
}

export const CAMPAIGN_SCENARIOS: CampaignScenarioDef[] = [
  {
    id: 'reconstruction',
    label: 'Reconstruction Drive',
    subtitle: 'Restore housing and services while rebuilding district confidence.',
    targetYear: 1988,
    openingDirective: 'Reconstruction Priority: housing, utilities, and district stability.',
    cardArt: assetPath('assets/ui/scenario-reconstruction.svg'),
    applyStart: (state) => {
      state.budget += 12000;
      state.population = Math.max(80, state.population);
      state.cityLoyalty = 56;
      state.unrestLevel = 16;
      state.serviceAccessIndex = 42;
      state.commuteIndex = 44;
      state.residentialDemand = 18;
      state.civicDemand = 10;
    },
  },
  {
    id: 'industrial_surge',
    label: 'Industrial Surge',
    subtitle: 'Push output aggressively while keeping city services in balance.',
    targetYear: 1987,
    openingDirective: 'Steel and Concrete First: maximize production while keeping districts stable.',
    cardArt: assetPath('assets/ui/scenario-industrial.svg'),
    applyStart: (state) => {
      state.budget -= 5000;
      state.population = Math.max(140, state.population);
      state.cityLoyalty = 48;
      state.unrestLevel = 28;
      state.serviceAccessIndex = 34;
      state.commuteIndex = 40;
      state.industrialDemand = 32;
      state.civicDemand = 16;
      state.industrialEfficiency = 1.08;
    },
  },
  {
    id: 'stagnation',
    label: 'Late-Period Stagnation',
    subtitle: 'Fight decline, aging infrastructure, and civic fatigue under tight resources.',
    targetYear: 1986,
    openingDirective: 'Stabilization Doctrine: hold the city together under systemic strain.',
    cardArt: assetPath('assets/ui/scenario-stagnation.svg'),
    applyStart: (state) => {
      state.budget -= 14000;
      state.population = Math.max(220, state.population);
      state.cityLoyalty = 40;
      state.unrestLevel = 42;
      state.serviceAccessIndex = 28;
      state.commuteIndex = 34;
      state.residentialDemand = 12;
      state.civicDemand = 22;
      state.industrialDemand = 15;
      state.happinessModifier = -8;
      state.industrialEfficiency = 0.92;
    },
  },
];

export function getCampaignScenario(
  id: CampaignScenarioId | undefined
): CampaignScenarioDef | undefined {
  if (!id || id === 'none') return undefined;
  return CAMPAIGN_SCENARIOS.find(s => s.id === id);
}

export function applyCampaignScenario(state: GameStateData, id: CampaignScenarioId): void {
  const scenario = getCampaignScenario(id);
  if (!scenario) return;

  state.campaignScenarioId = scenario.id;
  state.campaignScenarioLabel = scenario.label;
  state.campaignTargetYear = scenario.targetYear;
  state.campaignEnded = false;
  state.campaignEndingId = null;
  state.campaignEndingTitle = null;
  state.campaignEndingSummary = null;
  state.campaignScore = 0;
  state.activeDirective = scenario.openingDirective;
  scenario.applyStart(state);
}
