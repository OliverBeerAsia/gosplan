import { Application, Container } from 'pixi.js';
import { EventBus } from './EventBus';
import { GameStateData, createInitialState } from './GameState';
import { Grid } from '../grid/Grid';
import { BuildingPlacer } from '../grid/BuildingPlacer';
import { BuildingRegistry } from '../buildings/BuildingRegistry';
import { TextureFactory } from '../graphics/TextureFactory';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { BuildingRenderer } from '../rendering/BuildingRenderer';
import { OverlayRenderer } from '../rendering/OverlayRenderer';
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
import { TitleScreen } from '../ui/TitleScreen';
import { hasSave, saveGame, loadGame } from './SaveLoad';
import { gridToWorld } from '../rendering/IsometricRenderer';
import { MAP_SIZE } from '../constants';

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
  private buildingRenderer!: BuildingRenderer;
  private overlayRenderer!: OverlayRenderer;
  private smokeParticles!: SmokeParticles;

  // UI
  private resourceBar!: ResourceBar;
  private toolbar!: Toolbar;
  private infoPanel!: InfoPanel;
  private planPanel!: PlanPanel;
  private notifications!: NotificationManager;
  private tooltip!: BuildingTooltip;
  private minimap!: Minimap;

  private uiContainer!: HTMLDivElement;

  constructor() {
    this.events = new EventBus();
    this.registry = new BuildingRegistry();
    this.textures = new TextureFactory();
  }

  async init(container: HTMLElement): Promise<void> {
    // Create PixiJS application
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      background: 0x2A3A2A,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Generate textures
    this.textures.generate(this.app.renderer);

    // UI overlay container
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'soviet-ui';
    this.uiContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    container.appendChild(this.uiContainer);

    // Show title screen
    const canLoad = hasSave();
    const titleScreen = new TitleScreen(
      this.uiContainer,
      () => this.startGame(false),
      canLoad ? () => this.startGame(true) : null
    );
  }

  private startGame(loadSave: boolean): void {
    // Initialize game state
    this.grid = new Grid(MAP_SIZE);
    this.state = createInitialState();
    this.placer = new BuildingPlacer(this.grid, this.registry, this.events);

    if (loadSave) {
      const loaded = loadGame(this.grid, this.registry, this.placer);
      if (loaded) {
        Object.assign(this.state, loaded);
        this.events.emit('game:loaded', {});
      }
    }

    // Add some water features
    if (!loadSave) {
      this.generateTerrain();
    }

    // World container for camera transforms
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    // Camera
    this.camera = new Camera(this.events);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Center camera on map
    const centerPos = gridToWorld(MAP_SIZE / 2, MAP_SIZE / 2, 0);
    this.camera.centerOn(centerPos.x, centerPos.y);

    // Renderers
    this.terrainRenderer = new TerrainRenderer(this.grid, this.textures);
    this.buildingRenderer = new BuildingRenderer(this.grid, this.registry, this.textures, this.events);
    this.overlayRenderer = new OverlayRenderer(this.grid, this.registry, this.textures);

    this.smokeParticles = new SmokeParticles(this.app.renderer, this.grid, this.registry, this.events);

    this.worldContainer.addChild(this.terrainRenderer.container);
    this.worldContainer.addChild(this.buildingRenderer.container);
    this.worldContainer.addChild(this.smokeParticles.container);
    this.worldContainer.addChild(this.overlayRenderer.container);

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
    this.simulation = new SimulationManager(this.grid, this.registry, this.state, this.events);

    // UI
    this.setupUI();

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
    });
  }

  private generateTerrain(): void {
    // Add a small lake
    const cx = 10 + Math.floor(Math.random() * 12);
    const cy = 10 + Math.floor(Math.random() * 12);
    const r = 2 + Math.floor(Math.random() * 2);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx * dx + dy * dy <= r * r) {
          this.grid.setTerrain(cx + dx, cy + dy, 'water');
        }
      }
    }
  }

  private setupUI(): void {
    this.resourceBar = new ResourceBar(this.uiContainer, this.state, this.events);
    this.toolbar = new Toolbar(this.uiContainer, this.registry, this.events, (tool, buildingId) => {
      this.toolController.setTool(tool, buildingId);
      if (buildingId) {
        this.tooltip.show(buildingId);
      } else {
        this.tooltip.hide();
      }
    });
    this.infoPanel = new InfoPanel(this.uiContainer, this.grid, this.registry, this.events);
    this.planPanel = new PlanPanel(this.uiContainer, this.state, this.events);
    this.notifications = new NotificationManager(this.uiContainer, this.events);
    this.tooltip = new BuildingTooltip(this.uiContainer, this.registry);
    this.minimap = new Minimap(this.uiContainer, this.grid, this.registry, this.camera, this.events);

    // Update resource bar initially
    this.resourceBar.update();

    // Show info panel on building select
    this.events.on('building:selected', (data) => {
      if (data && data.building) {
        this.infoPanel.show(data.building);
      } else {
        this.infoPanel.hide();
      }
    });

    this.events.on('tool:selected', ({ tool }) => {
      if (tool !== 'select') {
        this.infoPanel.hide();
      }
    });
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          this.toolController.setTool('select');
          this.infoPanel.hide();
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
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveGame(this.grid, this.state, this.placer);
            this.events.emit('notification', { message: 'Game saved!', type: 'success' });
            this.events.emit('game:saved', {});
          }
          break;
        case 'p':
          this.overlayRenderer.togglePowerOverlay();
          break;
      }
    });
  }

  private lastFrameTime = 0;

  private update(): void {
    const now = performance.now();
    const dt = this.lastFrameTime ? now - this.lastFrameTime : 16;
    this.lastFrameTime = now;

    // Update simulation
    this.simulation.update(now);

    // Update smoke particles
    if (this.state.speed > 0) {
      this.smokeParticles.update(dt);
    }

    // Update camera transform
    this.worldContainer.x = this.camera.x;
    this.worldContainer.y = this.camera.y;
    this.worldContainer.scale.set(this.camera.zoom);
  }
}
