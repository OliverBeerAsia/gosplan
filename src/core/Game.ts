import { Application, Container } from 'pixi.js';
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
import { BuildingTooltip } from '../ui/BuildingPanel';
import { Minimap } from '../ui/Minimap';
import { TutorialManager } from '../ui/TutorialManager';
import { TitleScreen } from '../ui/TitleScreen';
import { DistrictPanel } from '../ui/DistrictPanel';
import { EventChoiceModal } from '../ui/EventChoiceModal';
import { AmbienceOverlay } from '../ui/AmbienceOverlay';
import { AdvisorPanel } from '../ui/AdvisorPanel';
import { StatsPanel } from '../ui/StatsPanel';
import { CampaignEndingModal } from '../ui/CampaignEndingModal';
import { PauseMenu } from '../ui/PauseMenu';
import { UIProgressionManager } from '../ui/UIProgressionManager';
import { EraUnlockOverlay } from '../ui/EraUnlockOverlay';
import { hasSave, saveGame, loadGame, exportSaveArchive } from './SaveLoad';
import { gridToWorld } from '../rendering/IsometricRenderer';
import { MAP_SIZE, TILE_HALF_H, TILE_HALF_W } from '../constants';
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
import { TrafficRenderer } from '../rendering/TrafficRenderer';

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

  private terrainRenderer!: TerrainRenderer;
  private propRenderer!: EnvironmentPropRenderer;
  private zoneRenderer!: ZoneRenderer;
  private buildingRenderer!: BuildingRenderer;
  private overlayRenderer!: OverlayRenderer;
  private smokeParticles!: SmokeParticles;
  private weatherEffects!: WeatherEffects;
  private windowLights!: WindowLightRenderer;
  private trafficRenderer!: TrafficRenderer;
  private currentSeason: Season | null = null; // null forces season sync on first update

  // UI
  private resourceBar!: ResourceBar;
  private toolbar!: Toolbar;
  private infoPanel!: InfoPanel;
  private planPanel!: PlanPanel;
  private notifications!: NotificationManager;
  private tooltip!: BuildingTooltip;
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

    this.loadingInterstitial = new LoadingInterstitial(this.uiContainer);

    // Show title screen
    const canLoad = hasSave();
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
      const loaded = loadGame(this.grid, this.registry, this.placer);
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
    this.terrainRenderer = new TerrainRenderer(this.grid, this.textures, this.events);
    this.propRenderer = new EnvironmentPropRenderer(this.grid, this.registry, this.textures, this.events);
    this.zoneRenderer = new ZoneRenderer(this.grid, this.textures, this.events);
    this.buildingRenderer = new BuildingRenderer(this.grid, this.registry, this.textures, this.events, this.state);
    this.overlayRenderer = new OverlayRenderer(this.grid, this.registry, this.textures, this.events);

    this.smokeParticles = new SmokeParticles(this.app.renderer, this.grid, this.registry, this.events);
    this.weatherEffects = new WeatherEffects(this.app.renderer);
    this.weatherEffects.setScreenSize(this.app.screen.width, this.app.screen.height);
    this.windowLights = new WindowLightRenderer(this.app.renderer, this.grid, this.registry, this.events);
    this.trafficRenderer = new TrafficRenderer(this.app.renderer, this.grid, this.registry, this.events, this.state);

    this.worldContainer.addChild(this.terrainRenderer.container);
    this.worldContainer.addChild(this.propRenderer.container);
    this.worldContainer.addChild(this.zoneRenderer.container);
    this.worldContainer.addChild(this.buildingRenderer.container);
    this.worldContainer.addChild(this.trafficRenderer.container);
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
      this.overlayRenderer, this.state, this.app.canvas
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

  private setupUI(): void {
    this.ambienceOverlay = new AmbienceOverlay(this.uiContainer, this.state, this.events);
    this.uiProgression = new UIProgressionManager(this.state, this.events);
    this.eraOverlay = new EraUnlockOverlay(this.uiContainer, this.state, this.registry, this.events);
    this.resourceBar = new ResourceBar(this.uiContainer, this.state, this.events);
    this.toolbar = new Toolbar(this.uiContainer, this.registry, this.events, (tool, buildingId, zone) => {
      this.toolController.setTool(tool, buildingId, zone);
      if (buildingId) {
        this.tooltip.show(buildingId);
      } else {
        this.tooltip.hide();
      }
    }, this.state);
    this.infoPanel = new InfoPanel(this.uiContainer, this.grid, this.registry, this.state, this.events);
    this.planPanel = new PlanPanel(this.uiContainer, this.state, this.events);
    this.notifications = new NotificationManager(this.uiContainer, this.events, this.state);
    this.tooltip = new BuildingTooltip(this.uiContainer, this.registry);
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
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
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
          if (this.pauseMenu.isVisible()) {
            this.pauseMenu.hide();
          } else if (this.toolController.currentTool !== 'select') {
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
    const now = performance.now();
    const dt = this.lastFrameTime ? now - this.lastFrameTime : 16;
    this.lastFrameTime = now;

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
      if (isWinter(season)) {
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
  }
}
