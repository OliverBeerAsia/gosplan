import { EventBus } from '../core/EventBus';
import { BulletinEntry, GameStateData } from '../core/GameState';
import { pushBulletinEntry } from '../core/Bulletin';

type EndingId = 'model_city' | 'brittle_giant' | 'reformist_transition' | 'steady_recovery_track';

interface EndingPayload {
  id: EndingId;
  title: string;
  summary: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class CampaignOutcomeService {
  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {}

  tick(): void {
    if (this.state.mode !== 'campaign') return;
    if (this.state.campaignScenarioId === 'none') return;
    if (this.state.campaignEnded) return;
    if (this.state.year < this.state.campaignTargetYear) return;

    const score = this.computeScore();
    const ending = this.pickEnding(score);

    this.state.campaignEnded = true;
    this.state.campaignScore = score;
    this.state.campaignEndingId = ending.id;
    this.state.campaignEndingTitle = ending.title;
    this.state.campaignEndingSummary = ending.summary;

    if (this.state.activeEvent) {
      const activeEventId = this.state.activeEvent.id;
      this.state.activeEvent = null;
      this.events.emit('event:resolved', {
        eventId: activeEventId,
        choiceId: 'campaign_concluded',
        summary: 'Campaign period concluded before event resolution.',
      });
    }

    this.events.emit('campaign:ended', {
      endingId: ending.id,
      title: ending.title,
      summary: ending.summary,
      score,
    });
    this.events.emit('notification', {
      message: `${ending.title}: ${ending.summary}`,
      type: score >= 70 ? 'success' : score >= 45 ? 'warning' : 'error',
    });
    this.pushBulletin(
      `${ending.title}: ${ending.summary}`,
      score >= 70 ? 'success' : score >= 45 ? 'warning' : 'error',
      ending.id
    );

    this.events.emit('speed:changed', { speed: 0 });
  }

  private computeScore(): number {
    const score = clamp(
      this.state.happiness * 0.18 +
      this.state.cityLoyalty * 0.18 +
      (100 - this.state.unrestLevel) * 0.15 +
      this.state.commuteIndex * 0.12 +
      this.state.serviceAccessIndex * 0.12 +
      clamp(50 + this.state.budget / 6000, 0, 100) * 0.1 +
      clamp(this.state.industrialOutput / 35, 0, 100) * 0.1 +
      clamp(this.state.population / 80, 0, 100) * 0.05,
      0,
      100
    );
    return Math.round(score);
  }

  private pickEnding(score: number): EndingPayload {
    if (
      this.state.happiness >= 68 &&
      this.state.cityLoyalty >= 65 &&
      this.state.unrestLevel <= 34 &&
      this.state.commuteIndex >= 60 &&
      this.state.serviceAccessIndex >= 60
    ) {
      return {
        id: 'model_city',
        title: 'Model Socialist Metropolis',
        summary: 'Your city balanced growth, welfare, and civic stability with exemplary planning discipline.',
      };
    }

    if (
      this.state.population >= 5000 &&
      this.state.industrialOutput >= 2200 &&
      (this.state.happiness < 55 || this.state.unrestLevel > 55)
    ) {
      return {
        id: 'brittle_giant',
        title: 'Brittle Industrial Giant',
        summary: 'Output surged, but social pressure accumulated beneath the skyline of factories.',
      };
    }

    if (
      this.state.commuteIndex >= 62 &&
      this.state.serviceAccessIndex >= 62 &&
      this.state.unrestLevel < 50 &&
      this.state.cityLoyalty >= 45
    ) {
      return {
        id: 'reformist_transition',
        title: 'Reformist Transition',
        summary: 'You steered the city toward practical modernization while preserving social cohesion.',
      };
    }

    if (score >= 55) {
      return {
        id: 'reformist_transition',
        title: 'Reformist Transition',
        summary: 'City systems stabilized enough to support controlled long-term modernization.',
      };
    }

    return {
      id: 'steady_recovery_track',
      title: 'Steady Recovery Track',
      summary: 'The city held together and is ready for another cycle of practical improvements.',
    };
  }

  private pushBulletin(
    text: string,
    level: BulletinEntry['level'],
    endingId: EndingId
  ): void {
    pushBulletinEntry(this.state, this.events, text, level, `ending_${endingId}`);
  }
}
