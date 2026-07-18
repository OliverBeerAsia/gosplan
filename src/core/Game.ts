import { Application, Container, RenderLayer } from 'pixi.js';
import { EventBus } from './EventBus';
import {
  CampaignScenarioId,
  GameMode,
  GameStateData,
  DEFAULT_UI_SETTINGS,
  UiSettings,
  createInitialState,
  GraphicsQuality
} from './GameState';
import { Grid } from '../grid/Grid';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { TextureFactory } from '../graphics/TextureFactory';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { EnvironmentPropRenderer } from '../rendering/EnvironmentPropRenderer';
import { BuildingRenderer } from '../rendering/BuildingRenderer';
import { OverlayRenderer } from '../rendering/OverlayRenderer';
import { ZoneRenderer } from '../rendering/ZoneRenderer';
import { SmokeParticles } from '../rendering/SmokeParticles';
import { Camera } from '../rendering/Camera';
import { CameraController } from '../input/CameraController';
import { ToolController } from '../input/ToolController';
import { SimulationManager } from '../simulation/SimulationManager';
import { ResourceBar } from '../ui/ResourceBar';
import { Toolbar } from '../ui/Toolbar';
import { InfoPanel } from '../ui/InfoPanel';
import { PlanPanel } from '../ui/PlanPanel';
import { NotificationManager } from '../ui/NotificationManager';
import { Minimap } from '../ui/Minimap';
import { TutorialManager } from '../ui/TutorialManager';
import { TitleScreen } from '../ui/TitleScreen';
import { DistrictPanel } from '../ui/DistrictPanel';
import { EventChoiceModal } from '../ui/EventChoiceModal';
import { AmbienceOverlay } from '../ui/AmbienceOverlay';
import { AdvisorPanel } from '../ui/AdvisorPanel';
import { StatsPanel } from '../ui/StatsPanel';
import { CampaignEndingModal } from '../ui/CampaignEndingModal';
import { PauseMenu, shouldSuppressGameplayShortcut } from '../ui/PauseMenu';
import { UIProgressionManager } from '../ui/UIProgressionManager';
import { EraUnlockOverlay } from '../ui/EraUnlockOverlay';
import { hasSave, saveGame, loadGame, exportSaveArchive } from './SaveLoad';
import { gridToWorld } from '../rendering/IsometricRenderer';
import { MAP_SIZE, MAX_ZOOM, MIN_ZOOM, TILE_HALF_H, TILE_HALF_W } from '../constants';
import { MapGenerator } from './MapGenerator';
import { getSeason, getSeasonalTerrainTint, isWinter, Season } from '../rendering/SeasonalEffects';
import { WeatherEffects } from '../rendering/WeatherEffects';
import { applyCampaignScenario } from '../simulation/CampaignScenarios';
import { LoadingInterstitial, LoadingMode } from '../ui/LoadingInterstitial';
import { OpeningSplash } from '../ui/OpeningSplash';
import { createRuntimeSeed, deriveSeed } from './Rng';
import { pushBulletinEntry } from './Bulletin';
import { assetPath } from '../utils/assetPath';
import { audioManager } from '../audio/AudioManager';
import { GoatCounterAnalytics } from '../analytics/GoatCounterAnalytics';
import { WindowLightRenderer } from '../rendering/WindowLightRenderer';
import { NightAmbience } from '../rendering/NightAmbience';
import { TrafficRenderer } from '../rendering/TrafficRenderer';

type VisualBenchmarkLight = 'day' | 'night' | 'live';

interface VisualBenchmarkControl {
  readonly version: 1;
  setCamera(gx: number, gy: number, zoom: number): void;
  setQuality(quality: GraphicsQuality): void;
  setLighting(light: VisualBenchmarkLight): void;
  setWeatherParticles(enabled: boolean): void;
  snapshot(): {
    fixtureId: string | null;
    mapSeed: number;
    season: Season;
    center: { gx: number; gy: number };
    zoom: number;
    quality: GraphicsQuality;
    light: VisualBenchmarkLight;
    week: number;
    buildingCount: number;
    visibleWindowLightCount: number;
    environmentCompositions: Array<{
      definitionId: string;
      variantId: string;
      placementId: string;
      ownerBuildingId: number;
      gx: number;
      gy: number;
      elevation: number;
      partCount: number;
    }>;
  };
}

declare global {
  interface Window {
    /** Development-only capture control installed by ?visual-benchmark=1. */
    __gosplanVisualBenchmark?: Readonly<VisualBenchmarkControl>;
  }
}

export class Game {
  private app!: Application;
  private events: EventBus;
  private state!: GameStateData;
  private grid!: Grid;
  private registry: BuildingRegistry;
  private placer!: BuildingPlacer;
  private textures: TextureFactory;
  private camera!: Camera;
  private cameraController!: CameraController;
  private toolController!: ToolController;
  private simulation!: SimulationManager;
  private worldContainer!: Container;
  private worldDepthLayer!: RenderLayer;

  private terrainRenderer!: TerrainRenderer;
  private propRenderer!: EnvironmentPropRenderer;
  private zoneRenderer!: ZoneRenderer;
  private buildingRenderer!: BuildingRenderer;
  private overlayRenderer!: OverlayRenderer;
  private smokeParticles!: SmokeParticles;
  private weatherEffects!: WeatherEffects;
  private windowLights!: WindowLightRenderer;
  private nightAmbience!: NightAmbience;
  private trafficRenderer!: TrafficRenderer;
  private currentSeason: Season | null = null; // null forces season sync on first update

  // UI
  private resourceBar!: ResourceBar;
  private toolbar!: Toolbar;
  private infoPanel!: InfoPanel;
  private planPanel!: PlanPanel;
  private notifications!: NotificationManager;
  private minimap!: Minimap;
  private tutorial!: TutorialManager;
  private districtPanel?: DistrictPanel;
  private eventModal!: EventChoiceModal;
  private ambienceOverlay!: AmbienceOverlay;
  private advisorPanel!: AdvisorPanel;
  private statsPanel!: StatsPanel;
  private campaignEndingModal!: CampaignEndingModal;
  private pauseMenu!: PauseMenu;
  private loadingInterstitial!: LoadingInterstitial;
  private titleScreen!: TitleScreen;
  private openingSplash!: OpeningSplash;
  private analytics: GoatCounterAnalytics;
  private uiProgression!: UIProgressionManager;
  private eraOverlay!: EraUnlockOverlay;
  private advancedPanelsVisible = false;
  private bootInProgress = false;
  private visualBenchmarkSaveRaw: string | null = null;
  private visualBenchmarkFixtureId: string | null = null;
  private visualBenchmarkClockMs: number | null = null;
  private visualBenchmarkWeatherParticles = true;
  private visualBenchmarkCenter = { gx: MAP_SIZE / 2, gy: MAP_SIZE / 2 };

  private uiContainer!: HTMLDivElement;

  constructor() {
    this.events = new EventBus();
    this.registry = new BuildingRegistry();
    this.textures = new TextureFactory();
    this.analytics = new GoatCounterAnalytics(this.events);
  }

  async init(container: HTMLElement): Promise<void> {
    // Create PixiJS application
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      background: 0x2A3A2A,
      antialias: false,
      roundPixels: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Generate textures
    await this.textures.generate(this.app.renderer);

    // UI overlay container
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'soviet-ui';
    this.uiContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.uiContainer.style.setProperty('--ui-grain-image', `url('${assetPath('assets/ui/title-grain.svg')}')`);
    this.uiContainer.style.setProperty('--ui-desk-bg', `url('${assetPath('assets/ui/desk-bg.webp')}')`);
    container.appendChild(this.uiContainer);

    this.applyUiSettings({
      ...DEFAULT_UI_SETTINGS,
      motionPreset: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'reduced'
        : DEFAULT_UI_SETTINGS.motionPreset,
    });
    this.analytics.init();

    this.openingSplash = new OpeningSplash(this.uiContainer);
    await this.openingSplash.play({
      durationMs: 2800,
      skipAllowed: false,
      requireStartButton: true,
    });

    this.loadingInterstitial = new LoadingInterstitial(
      this.uiContainer,
      this.textures.getArtRegistry()
    );

    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search);
      const fixtureId = params.get('benchmark-fixture');
      const fixtureFiles: Record<string, string> = {
        'pack4-worker-housing-v1': 'tests/fixtures/visual/pack4-worker-housing-v1.json',
        'pack4-worker-housing-courtyards-v2': 'tests/fixtures/visual/pack4-worker-housing-courtyards-v2.json',
      };
      if (
        params.get('visual-benchmark') === '1'
        && fixtureId !== null
        && fixtureFiles[fixtureId]
      ) {
        try {
          const response = await fetch(
            assetPath(fixtureFiles[fixtureId]),
            { cache: 'no-store' }
          );
          if (!response.ok) {
            throw new Error(`Fixture request failed with HTTP ${response.status}.`);
          }
          const raw = await response.text();
          const decoded: unknown = JSON.parse(raw);
          const candidate = decoded as {
            version?: unknown;
            benchmark?: { id?: unknown };
          };
          if (
            candidate?.version !== 4
            || candidate?.benchmark?.id !== fixtureId
          ) {
            throw new Error('Fixture identity or save version is invalid.');
          }
          this.visualBenchmarkSaveRaw = raw;
          this.visualBenchmarkFixtureId = fixtureId;
        } catch (error) {
          this.visualBenchmarkSaveRaw = null;
          this.visualBenchmarkFixtureId = null;
          console.error(
            'Graphics visual benchmark fixture could not be loaded; using ordinary title behavior.',
            error
          );
        }
      }
    }

    // Show title screen
    const canLoad = hasSave()
      || (import.meta.env.DEV && this.visualBenchmarkSaveRaw !== null);
    this.titleScreen = new TitleScreen(
      this.uiContainer,
      (scenario) => this.launchFromTitle(false, 'campaign', scenario),
      () => this.launchFromTitle(false, 'sandbox'),
      canLoad ? () => this.launchFromTitle(true, 'campaign') : null,
      () => exportSaveArchive(),
      () => this.playLaunchTransition()
    );
  }

  private async launchFromTitle(
    loadSave: boolean,
    mode: GameMode,
    scenarioId: CampaignScenarioId = 'reconstruction'
  ): Promise<void> {
    if (this.bootInProgress) return;
    this.bootInProgress = true;
    this.titleScreen.hide();

    try {
      const loadingMode: LoadingMode = loadSave
        ? 'load'
        : mode === 'sandbox'
          ? 'sandbox'
          : 'campaign';
      await this.loadingInterstitial.play(loadingMode, { skipAllowed: true });
      this.startGame(loadSave, mode, scenarioId);
    } catch (error) {
      this.loadingInterstitial.hide();
      this.titleScreen.show();
      console.error(error);
    } finally {
      this.bootInProgress = false;
    }
  }

  private async playLaunchTransition(): Promise<void> {
    this.uiContainer.classList.add('ui-launching');
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });
    this.uiContainer.classList.remove('ui-launching');
  }

  private startGame(
    loadSave: boolean,
    mode: GameMode,
    scenarioId: CampaignScenarioId = 'reconstruction'
  ): void {
    // Initialize game state
    this.grid = new Grid(MAP_SIZE);
    this.state = createInitialState();
    this.state.mode = mode;
    if (!loadSave) {
      const runSeed = createRuntimeSeed();
      this.state.rngSeed = runSeed;
      this.state.rngState = runSeed;
      this.state.mapSeed = deriveSeed(runSeed, 0x4D4150);
    }
    let loadedFromSave = false;
    if (!loadSave && mode === 'campaign') {
      applyCampaignScenario(this.state, scenarioId);
    }
    this.analytics.trackGameStart(mode, scenarioId, loadSave);
    this.placer = new BuildingPlacer(this.grid, this.registry, this.events);

    if (loadSave) {
      const loaded = loadGame(
        this.grid,
        this.registry,
        this.placer,
        import.meta.env.DEV ? this.visualBenchmarkSaveRaw ?? undefined : undefined
      );
      if (loaded) {
        Object.assign(this.state, loaded);
        loadedFromSave = true;
        this.addBulletinEntry('State archives restored from previous session.', 'info');
      }
    }
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && this.state.uiSettings.motionPreset !== 'reduced'
    ) {
      this.state.uiSettings.motionPreset = 'reduced';
    }
    this.applyUiSettings(this.state.uiSettings);

    // Add some water features
    if (!loadSave) {
      this.generateTerrain();
      this.addBulletinEntry(
        this.state.mode === 'sandbox'
          ? 'Sandbox mode initialized. Central command grants full planning autonomy.'
          : `Campaign mode initialized: ${this.state.campaignScenarioLabel}. Evaluation year ${this.state.campaignTargetYear}.`,
        'info'
      );
    }

    // World container for camera transforms
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    // Camera
    this.camera = new Camera(this.events);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
    this.configureCameraBounds();

    // Center camera on map
    const centerPos = gridToWorld(MAP_SIZE / 2, MAP_SIZE / 2, 0);
    this.camera.centerOn(centerPos.x, centerPos.y);

    // Renderers
    this.worldDepthLayer = new RenderLayer({ sortableChildren: true });
    this.terrainRenderer = new TerrainRenderer(this.grid, this.textures, this.worldDepthLayer, this.events);
    this.propRenderer = new EnvironmentPropRenderer(
      this.grid,
      this.registry,
      this.textures,
      this.events,
      this.worldDepthLayer,
      { mapSeed: this.state.mapSeed, season: getSeason(this.state.week) }
    );
    this.zoneRenderer = new ZoneRenderer(this.grid, this.textures, this.events, this.worldDepthLayer);
    this.buildingRenderer = new BuildingRenderer(
      this.grid,
      this.registry,
      this.textures,
      this.events,
      this.state,
      this.worldDepthLayer
    );
    this.overlayRenderer = new OverlayRenderer(this.grid, this.registry, this.textures, this.events);

    this.smokeParticles = new SmokeParticles(this.app.renderer, this.grid, this.registry, this.events);
    this.weatherEffects = new WeatherEffects(this.app.renderer);
    this.weatherEffects.setScreenSize(this.app.screen.width, this.app.screen.height);
    this.windowLights = new WindowLightRenderer(
      this.app.renderer,
      this.grid,
      this.registry,
      this.events,
      this.worldDepthLayer,
      (buildingId) => this.buildingRenderer.getAuthoredBuildingVisual(buildingId),
    );
    this.trafficRenderer = new TrafficRenderer(
      this.app.renderer,
      this.grid,
      this.registry,
      this.events,
      this.state,
      this.worldDepthLayer
    );

    this.nightAmbience = new NightAmbience(this.grid);

    this.worldContainer.addChild(this.terrainRenderer.container);
    this.worldContainer.addChild(this.propRenderer.container);
    this.worldContainer.addChild(this.zoneRenderer.container);
    this.worldContainer.addChild(this.buildingRenderer.container);
    this.worldContainer.addChild(this.trafficRenderer.container);
    this.worldContainer.addChild(this.worldDepthLayer);
    // The night veil multiplies everything in the depth layer; window lights
    // render above it so they read as light sources, not tinted decals.
    this.worldContainer.addChild(this.nightAmbience.container);
    this.worldContainer.addChild(this.propRenderer.lightContainer);
    this.worldContainer.addChild(this.windowLights.container);
    this.worldContainer.addChild(this.smokeParticles.container);
    this.worldContainer.addChild(this.overlayRenderer.container);

    this.events.on('graphics:quality:changed', ({ quality }) => {
      const changed = this.state.graphicsQuality !== quality;
      this.state.graphicsQuality = quality;
      this.applyGraphicsQuality(quality);
      if (changed) {
        this.events.emit('notification', {
          message: `Graphics quality set to ${quality.toUpperCase()}`,
          type: 'info',
        });
      }
    });

    this.applyGraphicsQuality(this.state.graphicsQuality);

    // Weather effects on top of world (but within world container so it scrolls)
    this.app.stage.addChild(this.weatherEffects.container);

    // Input
    this.cameraController = new CameraController(this.camera, this.app.canvas);
    this.toolController = new ToolController(
      this.events, this.camera, this.cameraController,
      this.grid, this.placer, this.registry,
      this.overlayRenderer, this.state, this.app.canvas,
      (gx, gy) => this.propRenderer.getCompositionAt(gx, gy),
    );

    // Rebuild buildings if loaded
    if (loadSave) {
      this.buildingRenderer.rebuild();
    }

    // Simulation
    this.simulation = new SimulationManager(this.grid, this.registry, this.placer, this.state, this.events);

    // UI
    this.setupUI();

    // Sync era from state (handles both new games and loaded saves)
    this.simulation.syncEra();

    if (loadedFromSave) {
      this.simulation.reconcileLoadedInfrastructure();
      this.events.emit('game:loaded', {});
    }

    this.events.on('mode:changed', ({ mode: nextMode }) => {
      if (this.state.mode === nextMode) return;
      this.state.mode = nextMode;

      if (nextMode === 'sandbox') {
        this.state.currentPlan = null;
        this.state.activeDirective = 'Sandbox autonomy: experiment with city layouts and policy outcomes.';
        this.events.emit('directive:changed', {
          directive: this.state.activeDirective,
          pressure: this.state.performancePressure,
        });
        this.addBulletinEntry('Campaign cycle closed. City transferred to sandbox autonomy.', 'info');
      } else {
        this.addBulletinEntry('Campaign controls restored by central planners.', 'warning');
      }

      this.planPanel.update();
      this.events.emit('notification', {
        message: `Mode switched to ${nextMode.toUpperCase()}.`,
        type: nextMode === 'sandbox' ? 'info' : 'warning',
      });
    });

    this.events.on('game:save:requested', () => {
      this.saveCurrentGame();
    });

    this.events.on('ui:settings:changed', ({ settings }) => {
      this.state.uiSettings = {
        ...this.state.uiSettings,
        ...settings,
      };
      this.applyUiSettings(this.state.uiSettings);
    });

    // Sync UI controls with current graphics quality (including loaded saves).
    this.events.emit('graphics:quality:changed', { quality: this.state.graphicsQuality });

    this.installVisualBenchmarkControl();

    // Initialize audio (user has already interacted via splash/title)
    audioManager.init();
    audioManager.connectEvents(this.events);

    // Milestone screen flash (achievement sound already handled in AudioManager.connectEvents)
    this.events.on('achievement:unlocked', () => {
      this.flashMilestone();
    });

    // Start simulation
    this.simulation.start();

    // Main loop
    this.app.ticker.add(() => {
      this.update();
    });

    // Keyboard shortcuts
    this.setupKeyboard();

    // Auto-save every 60 seconds
    setInterval(() => {
      if (import.meta.env.DEV && this.visualBenchmarkSaveRaw !== null) return;
      saveGame(this.grid, this.state, this.placer);
    }, 60000);

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
      this.weatherEffects.setScreenSize(this.app.screen.width, this.app.screen.height);
    });
  }

  private generateTerrain(): void {
    const generator = new MapGenerator(this.state.mapSeed);
    generator.generate(this.grid);
  }

  private configureCameraBounds(): void {
    // World bounds sized to map footprint plus a small buffer to preserve edge readability.
    const spanX = (MAP_SIZE - 1) * TILE_HALF_W;
    const spanY = (MAP_SIZE - 1) * TILE_HALF_H * 2;
    this.camera.setWorldBounds(
      -spanX - TILE_HALF_W * 2,
      -TILE_HALF_H * 4,
      spanX + TILE_HALF_W * 2,
      spanY + TILE_HALF_H * 4
    );
  }

  /**
   * Narrow, opt-in capture controls for deterministic local visual QA. Vite
   * replaces import.meta.env.DEV with false in production, so this branch and
   * its window installation are dead-code eliminated from release bundles.
   */
  private installVisualBenchmarkControl(): void {
    if (!import.meta.env.DEV) return;

    // HMR or a second local launch must never retain controls bound to an old
    // Game instance. A normal reload also clears the property with the window.
    delete window.__gosplanVisualBenchmark;
    const params = new URLSearchParams(window.location.search);
    if (params.get('visual-benchmark') !== '1') return;

    const control: VisualBenchmarkControl = {
      version: 1,
      setCamera: (gx, gy, zoom) => {
        if (![gx, gy, zoom].every(Number.isFinite)) {
          throw new TypeError('Benchmark camera values must be finite numbers.');
        }
        if (!this.grid.inBounds(Math.floor(gx), Math.floor(gy))) {
          throw new RangeError('Benchmark camera center must be inside the map.');
        }
        this.visualBenchmarkCenter = { gx, gy };
        this.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        const world = gridToWorld(gx, gy, this.grid.getElevation(Math.floor(gx), Math.floor(gy)));
        this.camera.centerOn(world.x, world.y);
      },
      setQuality: (quality) => {
        if (!(['low', 'medium', 'high'] as GraphicsQuality[]).includes(quality)) {
          throw new TypeError(`Unsupported benchmark quality: ${String(quality)}`);
        }
        this.events.emit('graphics:quality:changed', { quality });
      },
      setLighting: (light) => {
        if (!(['day', 'night', 'live'] as VisualBenchmarkLight[]).includes(light)) {
          throw new TypeError(`Unsupported benchmark lighting: ${String(light)}`);
        }
        this.visualBenchmarkClockMs = light === 'day'
          ? Math.PI / (2 * 0.000045)
          : light === 'night'
            ? 3 * Math.PI / (2 * 0.000045)
            : null;
        this.lastFrameTime = this.visualBenchmarkClockMs ?? performance.now();
      },
      setWeatherParticles: (enabled) => {
        if (typeof enabled !== 'boolean') {
          throw new TypeError('Benchmark weather-particle state must be boolean.');
        }
        this.visualBenchmarkWeatherParticles = enabled;
        if (!enabled) {
          this.weatherEffects.setWeatherType('none');
          return;
        }
        const season = getSeason(this.state.week);
        this.weatherEffects.setWeatherType(
          isWinter(season)
            ? 'snow'
            : season === 'autumn' || (season === 'spring' && this.state.week % 4 < 2)
              ? 'rain'
              : 'none'
        );
      },
      snapshot: () => ({
        fixtureId: this.visualBenchmarkFixtureId,
        mapSeed: this.state.mapSeed,
        season: getSeason(this.state.week),
        center: { ...this.visualBenchmarkCenter },
        zoom: this.camera.zoom,
        quality: this.state.graphicsQuality,
        light: this.visualBenchmarkClockMs === null
          ? 'live'
          : this.visualBenchmarkClockMs < 70000
            ? 'day'
            : 'night',
        week: this.state.week,
        buildingCount: this.grid.getAllBuildings().length,
        visibleWindowLightCount: this.windowLights.getVisibleLightCount(),
        environmentCompositions: this.propRenderer.getPlannedCompositions().map((composition) => ({
          definitionId: composition.definitionId,
          variantId: composition.variantId,
          placementId: composition.placementId,
          ownerBuildingId: composition.ownerBuildingId,
          gx: composition.gx,
          gy: composition.gy,
          elevation: composition.elevation,
          partCount: composition.parts.length,
        })),
      }),
    };

    Object.defineProperty(window, '__gosplanVisualBenchmark', {
      configurable: true,
      enumerable: false,
      writable: false,
      value: Object.freeze(control),
    });

    if (this.visualBenchmarkFixtureId !== null) {
      let center = this.visualBenchmarkFixtureId === 'pack4-worker-housing-courtyards-v2'
        ? { gx: 16, gy: 11 }
        : { gx: 17, gy: 14 };
      const requestedCenter = params.get('benchmark-center');
      if (requestedCenter !== null) {
        const parts = requestedCenter.split(',').map(Number);
        if (
          parts.length === 2
          && parts.every(Number.isInteger)
          && this.grid.inBounds(parts[0], parts[1])
        ) {
          center = { gx: parts[0], gy: parts[1] };
        }
      }

      const requestedZoom = Number(params.get('benchmark-zoom') ?? 1);
      const zoom = [0.25, 0.5, 1, 2].includes(requestedZoom) ? requestedZoom : 1;

      const requestedQuality = params.get('benchmark-quality');
      const quality: GraphicsQuality = requestedQuality === 'low'
        || requestedQuality === 'medium'
        || requestedQuality === 'high'
        ? requestedQuality
        : 'high';

      const requestedLight = params.get('benchmark-light');
      const light: VisualBenchmarkLight = requestedLight === 'night' ? 'night' : 'day';

      control.setCamera(center.gx, center.gy, zoom);
      control.setQuality(quality);
      control.setLighting(light);
      control.setWeatherParticles(params.get('benchmark-weather') !== 'off');
    }
  }

  private setupUI(): void {
    this.ambienceOverlay = new AmbienceOverlay(this.uiContainer, this.state, this.events);
    this.uiProgression = new UIProgressionManager(this.state, this.events);
    this.eraOverlay = new EraUnlockOverlay(this.uiContainer, this.state, this.registry, this.events);
    this.resourceBar = new ResourceBar(this.uiContainer, this.state, this.events);
    this.toolbar = new Toolbar(this.uiContainer, this.registry, this.events, (tool, buildingId, zone, category) => {
      this.toolController.setTool(tool, buildingId, zone, category);
    }, this.state);
    this.infoPanel = new InfoPanel(this.uiContainer, this.grid, this.registry, this.state, this.events);
    this.planPanel = new PlanPanel(this.uiContainer, this.state, this.events);
    this.notifications = new NotificationManager(this.uiContainer, this.events, this.state);
    this.minimap = new Minimap(this.uiContainer, this.grid, this.registry, this.camera, this.events);
    this.tutorial = new TutorialManager(this.uiContainer, this.state, this.grid, this.registry, this.events);
    this.districtPanel = new DistrictPanel(this.uiContainer, this.state, this.events);
    this.eventModal = new EventChoiceModal(this.uiContainer, this.state, this.events);
    this.advisorPanel = new AdvisorPanel(this.uiContainer, this.state, this.grid, this.registry, this.events);
    this.statsPanel = new StatsPanel(this.uiContainer, this.state, this.events);
    this.campaignEndingModal = new CampaignEndingModal(this.uiContainer, this.state, this.events);
    this.pauseMenu = new PauseMenu(this.uiContainer, this.state, this.events, () => {
      window.location.reload();
    });

    this.uiContainer.querySelector('#plan-panel-header')?.addEventListener('click', () => {
      this.events.emit('plan:viewed', {});
    });
    // Era-driven: hide advanced panels initially (era < 3)
    this.setAdvancedPanelsVisible(this.state.currentEra >= 3);

    // Update resource bar initially
    this.resourceBar.update();

    // Show info panel on building select
    this.events.on('building:selected', (data) => {
      if (data && data.building) {
        this.infoPanel.show(data.building);
      }
    });

    this.events.on('tile:selected', ({ gx, gy }) => {
      this.infoPanel.showTile(gx, gy);
    });

    this.events.on('tool:selected', ({ tool }) => {
      if (tool !== 'select') {
        this.infoPanel.hide();
      }
    });

    // Auto-show advanced panels when era 3 is reached
    this.events.on('era:changed', ({ era }) => {
      if (era >= 3 && !this.advancedPanelsVisible) {
        this.setAdvancedPanelsVisible(true);
      }
    });

    this.districtPanel?.update();
    this.toolController.syncState();
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // While the modal is open, Escape closes it and all other keys remain
      // native to the dialog. In particular, do not intercept Tab or undo.
      if (shouldSuppressGameplayShortcut(this.pauseMenu.isOpen(), e.key)) return;
      if (this.pauseMenu.isOpen() && e.key === 'Escape') {
        e.preventDefault();
        this.pauseMenu.hide();
        return;
      }

      // Undo/Redo (check first since they use modifiers)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.toolController.undoManager.redo();
        } else {
          this.toolController.undoManager.undo();
        }
        return;
      }

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentGame();
        return;
      }

      // Don't process shortcuts when ctrl/meta held
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case 'Escape':
          if (
            this.toolController.currentTool !== 'select'
            || this.toolController.currentCategory !== null
          ) {
            this.toolController.setTool('select');
            this.infoPanel.hide();
          } else {
            this.pauseMenu.show();
          }
          break;
        case '1':
          this.events.emit('speed:changed', { speed: 0 });
          break;
        case '2':
          this.events.emit('speed:changed', { speed: 1 });
          break;
        case '3':
          this.events.emit('speed:changed', { speed: 2 });
          break;
        case '4':
          this.events.emit('speed:changed', { speed: 4 });
          break;
        case 'p':
          this.overlayRenderer.togglePowerOverlay();
          break;
        case 'c':
        case 'C':
          this.overlayRenderer.toggleServiceOverlay();
          break;
        case 'x':
        case 'X':
          this.toolController.setTool('demolish');
          break;
        case 'v':
        case 'V':
          this.toolController.setTool('select');
          break;
        case 'q':
        case 'Q':
          // Repeat last building
          if (this.toolController.lastBuildingId) {
            this.toolController.setTool('build', this.toolController.lastBuildingId);
          }
          break;
        case 'g':
        case 'G':
          this.events.emit('graphics:quality:changed', {
            quality: this.nextGraphicsQuality(this.state.graphicsQuality),
          });
          break;
        case 'Tab':
          e.preventDefault();
          this.toolbar.cycleCategory(e.shiftKey ? -1 : 1);
          break;
        case 'h':
        case 'H':
        case 'Home':
          // Center camera on map
          const centerPos = gridToWorld(MAP_SIZE / 2, MAP_SIZE / 2, 0);
          this.camera.centerOn(centerPos.x, centerPos.y);
          break;
        case 'i':
        case 'I':
          this.setAdvancedPanelsVisible(!this.advancedPanelsVisible);
          this.events.emit('notification', {
            message: this.advancedPanelsVisible
              ? 'District panel visible.'
              : 'District panel hidden.',
            type: 'info',
          });
          break;
        case 's':
        case 'S':
          this.statsPanel.toggle();
          break;
        case '+':
        case '=':
          this.camera.zoomAt(
            this.app.screen.width / 2,
            this.app.screen.height / 2,
            -100 // zoom in
          );
          break;
        case '-':
          this.camera.zoomAt(
            this.app.screen.width / 2,
            this.app.screen.height / 2,
            100 // zoom out
          );
          break;
      }
    });
  }

  private setAdvancedPanelsVisible(visible: boolean): void {
    this.advancedPanelsVisible = visible;
    const district = this.uiContainer.querySelector<HTMLElement>('#district-panel');
    if (district) district.style.display = visible ? '' : 'none';
  }

  private saveCurrentGame(): void {
    if (import.meta.env.DEV && this.visualBenchmarkSaveRaw !== null) {
      this.events.emit('notification', {
        message: 'Visual benchmark sessions are read-only.',
        type: 'info',
      });
      return;
    }
    saveGame(this.grid, this.state, this.placer);
    this.events.emit('notification', { message: 'Game saved!', type: 'success' });
    this.events.emit('game:saved', {});
  }

  private applyGraphicsQuality(quality: GraphicsQuality): void {
    this.terrainRenderer.setQuality(quality);
    this.propRenderer.setQuality(quality);
    this.zoneRenderer.setQuality(quality);
    this.buildingRenderer.setQuality(quality);
    this.overlayRenderer.setQuality(quality);
    this.smokeParticles.setQuality(quality);
    this.weatherEffects.setQuality(quality);
    this.windowLights.setQuality(quality);
    this.trafficRenderer.setQuality(quality);
  }

  private applyUiSettings(settings: UiSettings): void {
    document.documentElement.classList.toggle('reduced-motion', settings.motionPreset === 'reduced');
    this.uiContainer.dataset.uiScale = settings.uiScale;
    this.uiContainer.dataset.motionPreset = settings.motionPreset;
  }

  private nextGraphicsQuality(current: GraphicsQuality): GraphicsQuality {
    if (current === 'low') return 'medium';
    if (current === 'medium') return 'high';
    return 'low';
  }

  private addBulletinEntry(
    text: string,
    level: 'info' | 'warning' | 'success' | 'error'
  ): void {
    pushBulletinEntry(this.state, this.events, text, level, 'boot');
  }

  private flashMilestone(): void {
    const flash = document.createElement('div');
    flash.className = 'milestone-flash';
    this.uiContainer.appendChild(flash);
    window.setTimeout(() => flash.remove(), 1300);
  }

  private lastFrameTime = 0;

  private update(): void {
    const now = import.meta.env.DEV && this.visualBenchmarkClockMs !== null
      ? this.visualBenchmarkClockMs
      : performance.now();
    const dt = this.lastFrameTime ? now - this.lastFrameTime : 16;
    this.lastFrameTime = now;

    // Coalesce zone-drag composition invalidations before Pixi renders this
    // frame. The ticker continues to run when simulation speed is paused.
    this.propRenderer.flushPendingUpdates();

    // Update camera (WASD/arrow key panning)
    this.cameraController.update(dt);

    // Update simulation
    this.simulation.update(now);

    // Update ambient audio based on population
    audioManager.updateAmbience(this.state.population);

    // Update construction animations
    this.buildingRenderer.updateConstructionTweens(dt);

    // Update queue citizen shuffle
    this.buildingRenderer.updateQueues(now);

    // Update smoke particles
    if (this.state.speed > 0) {
      this.smokeParticles.update(dt);
    }

    // Update water shimmer
    this.terrainRenderer.updateWaterShimmer(now);

    // Update window lights (day/night cycle)
    this.windowLights.update(now);
    this.nightAmbience.update(now);
    this.propRenderer.updateLighting(now);

    // Update traffic dots on roads
    if (this.state.speed > 0) {
      this.trafficRenderer.update(dt);
    }

    // Update weather effects
    this.weatherEffects.update(dt);
    this.ambienceOverlay.updateFrame(now);

    // Update seasonal effects (only changes ~4 times per year)
    const season = getSeason(this.state.week);
    if (season !== this.currentSeason) {
      this.currentSeason = season;
      const tint = getSeasonalTerrainTint(season);
      this.terrainRenderer.updateSeason(tint, season);
      this.propRenderer.setSeason(season);
      if (!this.visualBenchmarkWeatherParticles) {
        this.weatherEffects.setWeatherType('none');
        this.smokeParticles.windX = 3;
        this.weatherEffects.windX = 0;
      } else if (isWinter(season)) {
        this.weatherEffects.setWeatherType('snow');
        this.smokeParticles.windX = 6;
        this.weatherEffects.windX = 8;
      } else if (season === 'autumn') {
        this.weatherEffects.setWeatherType('rain');
        this.smokeParticles.windX = 4;
        this.weatherEffects.windX = 5;
      } else if (season === 'spring' && (this.state.week % 4 < 2)) {
        this.weatherEffects.setWeatherType('rain');
        this.smokeParticles.windX = 2;
        this.weatherEffects.windX = 3;
      } else {
        this.weatherEffects.setWeatherType('none');
        this.smokeParticles.windX = 3;
        this.weatherEffects.windX = 0;
      }
    }

    // Update camera transform
    this.worldContainer.x = Math.round(this.camera.x);
    this.worldContainer.y = Math.round(this.camera.y);
    this.worldContainer.scale.set(this.camera.zoom);

    if (import.meta.env.DEV && this.visualBenchmarkFixtureId !== null) {
      const snapshot = window.__gosplanVisualBenchmark?.snapshot();
      if (snapshot) {
        this.uiContainer.dataset.visualBenchmarkSnapshot = JSON.stringify(snapshot);
      }
    }
  }
}
