import { EventBus } from '../core/EventBus';
import {
  ActiveCityEvent,
  BulletinEntry,
  CityEventChoice,
  CityEventChoiceEffects,
  GameStateData,
} from '../core/GameState';
import { nextGameRandom, nextGameRandomInt } from '../core/Rng';
import { pushBulletinEntry } from '../core/Bulletin';

interface EventTemplate {
  id: string;
  title: string;
  description: string;
  severity: ActiveCityEvent['severity'];
  cooldown: number;
  condition: (state: GameStateData) => boolean;
  choices: CityEventChoice[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createTemplates(): EventTemplate[] {
  return [
    {
      id: 'food_logistics_delay',
      title: 'Food Logistics Delay',
      description: 'Delivery timing slipped at several bakeries, creating longer lines than usual.',
      severity: 'warning',
      cooldown: 24,
      condition: (s) => s.unrestLevel > 40 || s.serviceAccessIndex < 45,
      choices: [
        {
          id: 'route_priority',
          label: 'Boost Delivery Routes',
          description: 'Fund extra delivery routes to stabilize food distribution quickly.',
          summary: 'Additional routes eased lines and improved confidence, but cost extra budget.',
          effects: { budget: -2200, unrestLevel: -12, cityLoyalty: 5, civicDemand: 8 },
        },
        {
          id: 'strict_order',
          label: 'Open Pop-Up Kiosks',
          description: 'Set up temporary kiosks in dense neighborhoods to spread demand.',
          summary: 'Lines moved faster, though residents asked for broader long-term upgrades.',
          effects: { budget: -900, unrestLevel: -8, cityLoyalty: -7, happiness: -4 },
        },
        {
          id: 'do_nothing',
          label: 'Issue a Statement',
          description: 'Promise imminent improvements without immediate resource allocation.',
          summary: 'Residents remained skeptical and the delay continued.',
          effects: { unrestLevel: 10, cityLoyalty: -9, happiness: -6, civicDemand: 6 },
        },
      ],
    },
    {
      id: 'factory_safety',
      title: 'Factory Safety Audit',
      description: 'A major inspection reports risky conditions in heavy industry districts.',
      severity: 'warning',
      cooldown: 30,
      condition: (s) => s.industrialDemand > 20 || s.performancePressure > 45,
      choices: [
        {
          id: 'invest_upgrades',
          label: 'Fund Safety Upgrades',
          description: 'Install modern controls and worker safety improvements.',
          summary: 'Safety and loyalty improved with moderate production slowdown.',
          effects: { budget: -2600, cityLoyalty: 8, unrestLevel: -10, industrialEfficiency: -0.05 },
        },
        {
          id: 'maintain_quotas',
          label: 'Keep Quotas Maxed',
          description: 'Ignore warnings and push production targets aggressively.',
          summary: 'Output stayed high, but unrest risk increased.',
          effects: { industrialEfficiency: 0.08, cityLoyalty: -5, unrestLevel: 9, happiness: -3 },
        },
      ],
    },
    {
      id: 'metro_expansion_vote',
      title: 'Metro Expansion Debate',
      description: 'Urban planners propose expanding metro access to peripheral housing sectors.',
      severity: 'info',
      cooldown: 20,
      condition: (s) => s.population > 900 && s.commuteIndex < 62,
      choices: [
        {
          id: 'approve_metro',
          label: 'Approve Expansion',
          description: 'Allocate funds for transport relief and district access.',
          summary: 'Commute conditions improved and citizens welcomed the investment.',
          effects: { budget: -3200, commuteIndex: 10, serviceAccessIndex: 5, cityLoyalty: 6 },
        },
        {
          id: 'defer_metro',
          label: 'Defer for Industry',
          description: 'Redirect funds toward industrial growth and postpone transit.',
          summary: 'Industry got priority, but commuters remained frustrated.',
          effects: { industrialDemand: -6, commuteIndex: -7, unrestLevel: 8, cityLoyalty: -5 },
        },
      ],
    },
    {
      id: 'propaganda_festival',
      title: 'Unity Festival Proposal',
      description: 'Cultural offices request budget for a citywide propaganda and arts festival.',
      severity: 'info',
      cooldown: 18,
      condition: (s) => s.cityLoyalty < 60 || s.happiness < 58,
      choices: [
        {
          id: 'fund_festival',
          label: 'Fund Festival',
          description: 'Use public spectacles and cultural programming to improve morale.',
          summary: 'Festival improved civic mood and public unity.',
          effects: { budget: -1500, happiness: 6, cityLoyalty: 8, unrestLevel: -5 },
        },
        {
          id: 'focus_utilities',
          label: 'Fund Utilities Instead',
          description: 'Skip spectacle and prioritize practical infrastructure spending.',
          summary: 'Practical investments maintained stability, but charisma gains were missed.',
          effects: { budget: -600, serviceAccessIndex: 4, cityLoyalty: -2, unrestLevel: -1 },
        },
      ],
    },
  ];
}

export class EventDirectorService {
  private templates = createTemplates();
  private lastTriggeredTickByTemplate = new Map<string, number>();

  constructor(
    private state: GameStateData,
    private events: EventBus
  ) {
    this.events.on('event:choice:selected', ({ eventId, choiceId }) => {
      this.resolveEvent(eventId, choiceId);
    });
  }

  tick(): void {
    // Softly normalize transient efficiency drift.
    this.state.industrialEfficiency = this.state.industrialEfficiency * 0.985 + 1 * 0.015;
    this.state.industrialEfficiency = clamp(this.state.industrialEfficiency, 0.75, 1.3);

    if (this.state.activeEvent) {
      if (this.state.totalTicks >= this.state.activeEvent.deadlineTick) {
        const fallback = this.state.activeEvent.choices[0];
        this.resolveEvent(this.state.activeEvent.id, fallback.id);
      }
      return;
    }

    if (this.state.mode === 'campaign' && this.state.campaignEnded) {
      return;
    }

    if (this.state.totalTicks % 8 !== 0) return;

    const baseChance = this.state.mode === 'campaign' ? 0.12 : 0.08;
    const chance = clamp(
      baseChance +
      this.state.performancePressure * 0.0024 +
      this.state.unrestLevel * 0.0016,
      0,
      0.62
    );

    if (nextGameRandom(this.state) > chance) return;

    const candidates = this.templates.filter(t => {
      if (!t.condition(this.state)) return false;
      const last = this.lastTriggeredTickByTemplate.get(t.id);
      if (last === undefined) return true;
      return this.state.totalTicks - last >= t.cooldown;
    });
    if (candidates.length === 0) return;

    const template = candidates[nextGameRandomInt(this.state, candidates.length)];
    const activeEvent: ActiveCityEvent = {
      id: template.id,
      title: template.title,
      description: template.description,
      severity: template.severity,
      choices: template.choices,
      startedTick: this.state.totalTicks,
      deadlineTick: this.state.totalTicks + 12,
    };
    this.state.activeEvent = activeEvent;
    this.lastTriggeredTickByTemplate.set(template.id, this.state.totalTicks);

    this.pushBulletin(`State event declared: ${activeEvent.title}`, this.toNotificationType(activeEvent.severity));
    this.events.emit('event:triggered', { event: activeEvent });
    this.events.emit('notification', {
      message: `State event: ${activeEvent.title}`,
      type: activeEvent.severity === 'critical' ? 'error' : activeEvent.severity === 'warning' ? 'warning' : 'info',
    });
  }

  private resolveEvent(eventId: string, choiceId: string): void {
    const active = this.state.activeEvent;
    if (!active || active.id !== eventId) return;

    const choice = active.choices.find(c => c.id === choiceId) ?? active.choices[0];
    this.applyEffects(choice.effects);

    this.pushBulletin(choice.summary, this.toNotificationType(active.severity));
    this.events.emit('event:resolved', {
      eventId,
      choiceId: choice.id,
      summary: choice.summary,
    });
    this.events.emit('notification', {
      message: choice.summary,
      type: this.toNotificationType(active.severity),
    });

    this.state.activeEvent = null;
  }

  private applyEffects(effects: CityEventChoiceEffects): void {
    let demandChanged = false;
    let commuteChanged = false;

    if (effects.budget) {
      this.state.budget += effects.budget;
      this.events.emit('budget:changed', { budget: this.state.budget });
    }
    if (effects.happiness) {
      this.state.happinessModifier = clamp(this.state.happinessModifier + effects.happiness, -30, 30);
    }
    if (effects.cityLoyalty) {
      this.state.cityLoyalty = clamp(Math.round(this.state.cityLoyalty + effects.cityLoyalty), 0, 100);
    }
    if (effects.unrestLevel) {
      this.state.unrestLevel = clamp(Math.round(this.state.unrestLevel + effects.unrestLevel), 0, 100);
    }
    if (effects.residentialDemand) {
      this.state.residentialDemand = clamp(Math.round(this.state.residentialDemand + effects.residentialDemand), -100, 100);
      demandChanged = true;
    }
    if (effects.industrialDemand) {
      this.state.industrialDemand = clamp(Math.round(this.state.industrialDemand + effects.industrialDemand), -100, 100);
      demandChanged = true;
    }
    if (effects.civicDemand) {
      this.state.civicDemand = clamp(Math.round(this.state.civicDemand + effects.civicDemand), -100, 100);
      demandChanged = true;
    }
    if (effects.commuteIndex) {
      this.state.commuteIndex = clamp(Math.round(this.state.commuteIndex + effects.commuteIndex), 0, 100);
      commuteChanged = true;
    }
    if (effects.serviceAccessIndex) {
      this.state.serviceAccessIndex = clamp(Math.round(this.state.serviceAccessIndex + effects.serviceAccessIndex), 0, 100);
      commuteChanged = true;
    }
    if (effects.industrialEfficiency) {
      this.state.industrialEfficiency = clamp(this.state.industrialEfficiency + effects.industrialEfficiency, 0.75, 1.3);
    }

    if (demandChanged) {
      this.events.emit('demand:updated', {
        residential: this.state.residentialDemand,
        industrial: this.state.industrialDemand,
        civic: this.state.civicDemand,
      });
    }
    if (commuteChanged) {
      this.events.emit('commute:updated', {
        commute: this.state.commuteIndex,
        serviceAccess: this.state.serviceAccessIndex,
      });
    }
  }

  private pushBulletin(text: string, level: BulletinEntry['level']): void {
    pushBulletinEntry(this.state, this.events, text, level, 'event');
  }

  private toNotificationType(
    severity: ActiveCityEvent['severity']
  ): 'info' | 'warning' | 'success' | 'error' {
    if (severity === 'critical') return 'error';
    if (severity === 'warning') return 'warning';
    return 'info';
  }
}
