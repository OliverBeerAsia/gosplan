import { BuildingDef } from './BuildingTypes';

const buildings: BuildingDef[] = [
  // Residential
  {
    id: 'khrushchyovka',
    name: 'Khrushchyovka',
    category: 'residential',
    width: 2, height: 1,
    cost: 1500, maintenance: 30,
    description: '5-story prefabricated apartment block. Efficient housing for the proletariat.',
    housingCapacity: 200,
    powerConsumption: 2,
  },
  {
    id: 'stalinka',
    name: 'Stalinka',
    category: 'residential',
    width: 2, height: 2,
    cost: 4000, maintenance: 80,
    description: '7-story ornate residential building. Superior Soviet architecture.',
    housingCapacity: 500,
    powerConsumption: 5,
  },
  {
    id: 'kommunalka',
    name: 'Kommunalka',
    category: 'residential',
    width: 1, height: 1,
    cost: 800, maintenance: 15,
    description: '3-story communal housing. Shared living builds community spirit!',
    housingCapacity: 80,
    powerConsumption: 1,
  },

  // Industrial
  {
    id: 'factory',
    name: 'Factory',
    category: 'industrial',
    width: 3, height: 2,
    cost: 6000, maintenance: 120,
    description: 'Heavy industrial facility. Fulfills the quotas of the Five-Year Plan!',
    powerConsumption: 10,
    industrialOutput: 300,
  },

  // Power
  {
    id: 'coal_power_plant',
    name: 'Coal Power Plant',
    category: 'industrial',
    width: 3, height: 3,
    cost: 12000, maintenance: 200,
    description: 'Coal-fired power station. Powers the revolution!',
    powerGeneration: 50,
    conductsPower: true,
  },

  // Government / Services
  {
    id: 'party_hq',
    name: 'Party HQ',
    category: 'government',
    width: 2, height: 2,
    cost: 5000, maintenance: 100,
    description: 'Communist Party headquarters. The guiding force of the city.',
    powerConsumption: 3,
    happinessBonus: 10,
    serviceRadius: 8,
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'government',
    width: 2, height: 2,
    cost: 3500, maintenance: 80,
    description: 'Free healthcare for all comrades. A right, not a privilege!',
    powerConsumption: 4,
    happinessBonus: 8,
    serviceRadius: 6,
  },
  {
    id: 'school',
    name: 'School',
    category: 'government',
    width: 2, height: 1,
    cost: 2000, maintenance: 40,
    description: 'Education for the young builders of communism.',
    powerConsumption: 2,
    happinessBonus: 8,
    serviceRadius: 5,
  },

  // Infrastructure
  {
    id: 'road',
    name: 'Road',
    category: 'infrastructure',
    width: 1, height: 1,
    cost: 100, maintenance: 2,
    description: 'Asphalt road connecting buildings.',
    isRoad: true,
    conductsPower: true,
  },
  {
    id: 'power_line',
    name: 'Power Line',
    category: 'infrastructure',
    width: 1, height: 1,
    cost: 50, maintenance: 1,
    description: 'High-voltage power transmission line.',
    conductsPower: true,
  },

  // Decoration
  {
    id: 'park',
    name: 'Park',
    category: 'decoration',
    width: 1, height: 1,
    cost: 500, maintenance: 10,
    description: 'Green space for recreation. Happy workers are productive workers!',
    happinessBonus: 5,
    serviceRadius: 3,
  },
  {
    id: 'monument',
    name: 'Monument',
    category: 'decoration',
    width: 1, height: 1,
    cost: 1000, maintenance: 5,
    description: 'Monument to the glory of the Soviet people.',
    happinessBonus: 3,
    serviceRadius: 4,
  },

  // === NEW BUILDINGS ===

  // Residential
  {
    id: 'panelak',
    name: 'Panelak',
    category: 'residential',
    width: 2, height: 2,
    cost: 3000, maintenance: 55,
    description: '9-story prefabricated panel tower. Mass housing for the masses!',
    housingCapacity: 400,
    powerConsumption: 4,
  },

  // Industrial
  {
    id: 'warehouse',
    name: 'Warehouse',
    category: 'industrial',
    width: 2, height: 2,
    cost: 2500, maintenance: 30,
    description: 'Storage facility for industrial goods. Keeps the supply chain moving!',
    industrialOutput: 100,
    powerConsumption: 2,
  },

  // Government / Services
  {
    id: 'cinema',
    name: 'Cinema',
    category: 'government',
    width: 2, height: 1,
    cost: 2500, maintenance: 50,
    description: 'Socialist realist films for cultural enrichment of the people!',
    powerConsumption: 3,
    happinessBonus: 7,
    serviceRadius: 5,
  },
  {
    id: 'radio_tower',
    name: 'Radio Tower',
    category: 'government',
    width: 1, height: 1,
    cost: 3000, maintenance: 40,
    description: 'Broadcasting the voice of the Party across the city!',
    powerConsumption: 5,
    happinessBonus: 4,
    serviceRadius: 10,
  },

  // Infrastructure
  {
    id: 'metro_station',
    name: 'Metro Station',
    category: 'infrastructure',
    width: 2, height: 1,
    cost: 8000, maintenance: 100,
    description: 'Underground railway station. Palace of the people beneath the streets!',
    powerConsumption: 8,
    happinessBonus: 6,
    serviceRadius: 8,
    conductsPower: true,
  },

  // Decoration
  {
    id: 'plaza',
    name: 'Plaza',
    category: 'decoration',
    width: 2, height: 2,
    cost: 2000, maintenance: 20,
    description: 'Public square for gatherings and parades. Glory to the workers!',
    happinessBonus: 6,
    serviceRadius: 5,
  },
  {
    id: 'fountain',
    name: 'Fountain',
    category: 'decoration',
    width: 1, height: 1,
    cost: 800, maintenance: 15,
    description: 'Ornamental fountain symbolizing the flowing wealth of socialism.',
    happinessBonus: 4,
    serviceRadius: 3,
  },
  {
    id: 'sports_complex',
    name: 'Sports Complex',
    category: 'decoration',
    width: 3, height: 2,
    cost: 6000, maintenance: 80,
    description: 'Athletic training facility. Strong bodies build a strong nation!',
    powerConsumption: 5,
    happinessBonus: 10,
    serviceRadius: 7,
  },
];

export class BuildingRegistry {
  private defs: Map<string, BuildingDef> = new Map();

  constructor() {
    for (const b of buildings) {
      this.defs.set(b.id, b);
    }
  }

  get(id: string): BuildingDef | undefined {
    return this.defs.get(id);
  }

  getAll(): BuildingDef[] {
    return [...this.defs.values()];
  }

  getByCategory(category: string): BuildingDef[] {
    return this.getAll().filter(b => b.category === category);
  }
}
