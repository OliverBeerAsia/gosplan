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
    // --- Original 4 events ---
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

    // --- New events: late-game variety, critical severity ---
    {
      id: 'power_grid_overload',
      title: 'Power Grid Overload',
      description: 'Aging transformers are failing under peak demand. Rolling blackouts reported.',
      severity: 'critical',
      cooldown: 36,
      condition: (s) => s.powerCapacity > 0 && s.powerDemand / s.powerCapacity > 0.85,
      choices: [
        {
          id: 'emergency_repair',
          label: 'Emergency Grid Repair',
          description: 'Rush crews and materials to stabilize the grid overnight.',
          summary: 'Power restored quickly, but the emergency response was expensive.',
          effects: { budget: -4500, happiness: 3, cityLoyalty: 4, unrestLevel: -6 },
        },
        {
          id: 'rolling_blackouts',
          label: 'Scheduled Blackouts',
          description: 'Rotate outages across districts to prevent total grid failure.',
          summary: 'Grid stabilized, but rotating blackouts angered residents.',
          effects: { budget: -800, happiness: -8, unrestLevel: 12, cityLoyalty: -6 },
        },
        {
          id: 'ration_industry',
          label: 'Cut Industrial Power',
          description: 'Temporarily reduce factory power allocation to protect housing.',
          summary: 'Homes stayed lit, but industrial output took a hit.',
          effects: { industrialEfficiency: -0.12, happiness: 2, unrestLevel: 4, industrialDemand: 10 },
        },
      ],
    },
    {
      id: 'worker_strike',
      title: 'Worker Strike',
      description: 'Factory workers are refusing to meet quotas until conditions improve.',
      severity: 'critical',
      cooldown: 40,
      condition: (s) => s.unrestLevel > 55 && s.industrialOutput > 200,
      choices: [
        {
          id: 'negotiate',
          label: 'Negotiate Concessions',
          description: 'Meet with worker representatives and agree to improved conditions.',
          summary: 'Workers returned satisfied. Production resumed with better morale.',
          effects: { budget: -3000, industrialEfficiency: -0.04, happiness: 8, unrestLevel: -18, cityLoyalty: 6 },
        },
        {
          id: 'suppress',
          label: 'Enforce Work Orders',
          description: 'Deploy militia to restore order and enforce production quotas.',
          summary: 'Production resumed by force. Loyalty and morale suffered badly.',
          effects: { unrestLevel: -10, cityLoyalty: -14, happiness: -10, industrialEfficiency: 0.05 },
        },
        {
          id: 'replace_workers',
          label: 'Reassign Workers',
          description: 'Transfer in workers from other districts and retrain.',
          summary: 'Slow recovery, but the new crew eventually matched output.',
          effects: { budget: -1800, industrialEfficiency: -0.08, unrestLevel: -5, residentialDemand: 8 },
        },
      ],
    },
    {
      id: 'housing_crisis',
      title: 'Housing Overcrowding',
      description: 'Families are doubling up in kommunalkas. Complaints flood the planning office.',
      severity: 'warning',
      cooldown: 22,
      condition: (s) => s.housingCapacity > 0 && s.population / s.housingCapacity > 1.05,
      choices: [
        {
          id: 'emergency_prefabs',
          label: 'Rush Prefab Housing',
          description: 'Fast-track emergency prefabricated housing construction.',
          summary: 'New housing eased the crisis, though build quality was questionable.',
          effects: { budget: -3500, residentialDemand: -15, happiness: 4, unrestLevel: -8 },
        },
        {
          id: 'rent_controls',
          label: 'Institute Rent Controls',
          description: 'Cap rents and redistribute available space more evenly.',
          summary: 'Tensions eased slightly, but overcrowding persisted.',
          effects: { budget: -400, happiness: -3, unrestLevel: -5, cityLoyalty: 3 },
        },
      ],
    },
    {
      id: 'foreign_delegation',
      title: 'Foreign Delegation Visit',
      description: 'A delegation from a fraternal socialist state requests a formal city tour.',
      severity: 'info',
      cooldown: 26,
      condition: (s) => s.population > 1500 && s.happiness > 45,
      choices: [
        {
          id: 'grand_reception',
          label: 'Grand Reception',
          description: 'Organize a showcase tour with banquets and cultural exhibitions.',
          summary: 'The delegation was impressed. International prestige boosted morale.',
          effects: { budget: -2800, happiness: 5, cityLoyalty: 10, unrestLevel: -4 },
        },
        {
          id: 'modest_welcome',
          label: 'Working Tour Only',
          description: 'Keep it professional — show the factories and infrastructure.',
          summary: 'A businesslike visit. Delegates noted room for improvement.',
          effects: { budget: -500, industrialEfficiency: 0.03, cityLoyalty: 2 },
        },
      ],
    },
    {
      id: 'environmental_contamination',
      title: 'Industrial Pollution Alert',
      description: 'Chemical runoff from factories has contaminated water in nearby housing sectors.',
      severity: 'critical',
      cooldown: 44,
      condition: (s) => s.industrialOutput > 500 && s.population > 2000,
      choices: [
        {
          id: 'full_cleanup',
          label: 'Full Environmental Cleanup',
          description: 'Shut down affected plants and fund comprehensive decontamination.',
          summary: 'Water quality restored. Citizens praised the swift response.',
          effects: { budget: -6000, industrialEfficiency: -0.10, happiness: 6, cityLoyalty: 8, unrestLevel: -10 },
        },
        {
          id: 'partial_remediation',
          label: 'Targeted Remediation',
          description: 'Address the worst sites while keeping most factories running.',
          summary: 'Partial fix contained the damage, but health concerns lingered.',
          effects: { budget: -2500, industrialEfficiency: -0.03, happiness: -4, unrestLevel: 6, cityLoyalty: -3 },
        },
        {
          id: 'deny_reports',
          label: 'Suppress Reports',
          description: 'Classify contamination data and continue operations unchanged.',
          summary: 'Production continued, but rumors spread and trust eroded.',
          effects: { happiness: -10, cityLoyalty: -12, unrestLevel: 15 },
        },
      ],
    },
    {
      id: 'black_market',
      title: 'Black Market Activity',
      description: 'Underground trade networks are diverting goods from state stores.',
      severity: 'warning',
      cooldown: 28,
      condition: (s) => s.population > 1200 && (s.happiness < 50 || s.unrestLevel > 35),
      choices: [
        {
          id: 'crackdown',
          label: 'Police Crackdown',
          description: 'Deploy inspectors to raid black market operations.',
          summary: 'Black market disrupted. Some citizens resent the heavy-handed approach.',
          effects: { budget: -1200, unrestLevel: -8, cityLoyalty: 5, happiness: -4 },
        },
        {
          id: 'tolerate',
          label: 'Turn a Blind Eye',
          description: 'Quietly allow the parallel economy to fill gaps in state supply.',
          summary: 'Shortages eased informally, but state authority was undermined.',
          effects: { happiness: 3, cityLoyalty: -8, unrestLevel: -3, serviceAccessIndex: 3 },
        },
        {
          id: 'reform_supply',
          label: 'Reform Supply Chains',
          description: 'Address root causes by improving state store inventory.',
          summary: 'Better-stocked stores reduced the appeal of black market goods.',
          effects: { budget: -2800, happiness: 5, cityLoyalty: 4, unrestLevel: -6, civicDemand: 5 },
        },
      ],
    },
    {
      id: 'cultural_renaissance',
      title: 'Cultural Renaissance',
      description: 'Local artists and writers are producing acclaimed work. They want a cultural center.',
      severity: 'info',
      cooldown: 24,
      condition: (s) => s.happiness > 55 && s.population > 800,
      choices: [
        {
          id: 'fund_center',
          label: 'Fund Cultural Center',
          description: 'Build a venue for exhibitions, performances, and literary events.',
          summary: 'The cultural center became a point of civic pride.',
          effects: { budget: -2000, happiness: 7, cityLoyalty: 6, civicDemand: 4 },
        },
        {
          id: 'redirect_energy',
          label: 'Channel into Propaganda',
          description: 'Redirect artistic energy into state-approved messaging campaigns.',
          summary: 'Effective propaganda, but artists grew disillusioned.',
          effects: { budget: -400, cityLoyalty: 8, happiness: -3, unrestLevel: 4 },
        },
      ],
    },
    {
      id: 'harsh_winter',
      title: 'Harsh Winter',
      description: 'An unusually severe cold snap is straining heating systems across the city.',
      severity: 'warning',
      cooldown: 52,
      condition: (s) => s.week !== undefined && s.week <= 13 && s.population > 500,
      choices: [
        {
          id: 'emergency_heating',
          label: 'Emergency Fuel Shipment',
          description: 'Import extra fuel and open warming shelters in every district.',
          summary: 'Citizens stayed warm. The emergency fund took a major hit.',
          effects: { budget: -3800, happiness: 4, unrestLevel: -6, cityLoyalty: 5 },
        },
        {
          id: 'conserve',
          label: 'Mandate Conservation',
          description: 'Lower thermostat targets and ration hot water to stretch reserves.',
          summary: 'Reserves held, but comfort dropped and complaints rose.',
          effects: { budget: -600, happiness: -6, unrestLevel: 8, cityLoyalty: -3 },
        },
        {
          id: 'divert_industry',
          label: 'Divert Factory Heat',
          description: 'Pipe waste heat from factories into residential heating networks.',
          summary: 'Clever solution warmed homes but reduced factory efficiency.',
          effects: { budget: -1200, industrialEfficiency: -0.06, happiness: 3, cityLoyalty: 4 },
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

    // Events don't fire until Era 3
    if (this.state.currentEra < 3) return;

    // Era 3: check every 16 ticks; Era 4+: every 8 ticks
    const checkInterval = this.state.currentEra === 3 ? 16 : 8;
    if (this.state.totalTicks % checkInterval !== 0) return;

    // Era 3: halved base chance
    const eraChanceMult = this.state.currentEra === 3 ? 0.5 : 1.0;
    const baseChance = (this.state.mode === 'campaign' ? 0.12 : 0.08) * eraChanceMult;
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
      deadlineTick: this.state.totalTicks + 20,
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
