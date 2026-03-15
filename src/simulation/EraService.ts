import { GameStateData } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { ERA_THRESHOLDS, ERA_COUNT } from '../constants';

/**
 * Tracks the current era based on peak population.
 * Era transitions are deterministic (population-threshold-based).
 */
export class EraService {
  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {}

  /** Call once after loading a save to infer era from peak population */
  syncEra(): void {
    const era = this.computeEra(this.state.peakPopulation);
    this.state.currentEra = era;
  }

  tick(): void {
    // Track peak population
    if (this.state.population > this.state.peakPopulation) {
      this.state.peakPopulation = this.state.population;
    }

    const newEra = this.computeEra(this.state.peakPopulation);
    if (newEra > this.state.currentEra) {
      const prev = this.state.currentEra;
      this.state.currentEra = newEra;
      this.events.emit('era:changed', { era: newEra, previousEra: prev });
    }
  }

  private computeEra(peakPop: number): number {
    let era = 1;
    for (let i = ERA_COUNT - 1; i >= 0; i--) {
      if (peakPop >= ERA_THRESHOLDS[i]) {
        era = i + 1;
        break;
      }
    }
    return era;
  }
}
