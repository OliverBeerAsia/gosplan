# GOSPLAN Graphics Review and Improvement Roadmap

Date: 2026-07-10

Status: Proposed source of truth for the next graphics program

Review team:

- Senior graphic-design review
- Principal interaction-design review
- City-builder game creative-direction review
- Live browser capture and repository synthesis

## Executive verdict

GOSPLAN has a strong premise and a convincing front door, but the playable city is one to two major art passes behind the opening and menu artwork. The current game has the right isometric projection, useful rendering systems, a strong Soviet planning-bureau identity, and several good systemic details. It does not yet deliver the geographic drama, hand-authored building families, neighborhood composition, or pictorial interaction clarity associated with the best 1990s city builders.

The target is not to copy SimCity 2000. The target is to adopt the qualities that made it readable and memorable:

- strong isometric silhouettes
- physical terrain and infrastructure
- architectural families rather than tint variants
- coherent neighborhoods instead of isolated props
- pictorial, latched tools and readable map modes
- visible growth, stress, weather, and city life

GOSPLAN's own north star is **The Living Microdistrict**: an austere Soviet planning model that visibly accumulates people, strain, weather, and history.

## Visual evidence

### Current experience

- [Current opening screen](graphics-review/current-opening.png)
- [Current main menu](graphics-review/current-main-menu.png)
- [Current scenario selection](graphics-review/current-scenario-select.png)
- [Current empty sandbox and HUD](graphics-review/current-sandbox-hud.png)
- [Current representative buildings](graphics-review/current-mixed-buildings.png)

The opening has confident chunky pixel art, material richness, warm lighting, and a distinct world. The gameplay capture shifts to flat procedural tile diamonds, repeated seams, thin forest symbols, small primitive buildings, and text-heavy controls.

### Proposed direction

- [Proposed city-view north star](graphics-review/proposed-city-north-star.png)
- [Proposed building and environment board](graphics-review/proposed-building-environment-board.png)
- [Proposed illustrated loading screen](graphics-review/proposed-loading-screen.png)

These are direction mockups, not literal final assets. They demonstrate the required composition, silhouette, terrain mass, neighborhood density, pixel craft, and front-door consistency.

## What should be preserved

1. The visual promise in `docs/ART_DIRECTION.md`: a Soviet planning board that became a living city.
2. The 64x32, 2:1 isometric projection and bottom-center building anchors.
3. The desk, dossier, newspaper, blueprint, red, and gold identity used by the opening and menus.
4. Existing systems for seasons, weather, smoke, traffic, window lights, queues, props, construction, zoning, and data overlays.
5. The queue motif as an original expression of scarcity and service pressure.
6. The lesson from earlier art passes that internal detail and material contrast read better than heavy outlines.

## Principal gaps

### 1. Terrain is visually flat

Elevation is generated and stored, and `gridToWorld()` supports elevation, but the main terrain, building, and prop renderers currently pass zero elevation. Every tile also receives a visible diamond edge. The result is a noisy flat board rather than a place shaped by rivers, banks, slopes, and infrastructure.

Primary targets:

- `src/core/MapGenerator.ts`
- `src/rendering/IsometricRenderer.ts`
- `src/rendering/TerrainRenderer.ts`
- `src/rendering/BuildingRenderer.ts`
- `src/rendering/EnvironmentPropRenderer.ts`
- `src/graphics/TerrainTextures.ts`

### 2. Variants change color more than architecture

Warm, cool, and district variants are primarily tints applied to the same massing. Repeated housing, industrial, and civic buildings therefore retain identical silhouettes. Fine windows and roof details disappear at low zoom.

Every core family needs at least three physical masses. Examples include short slab, long slab, linked slab, point tower, stepped tower, sawtooth hall, pipeworks hall, courtyard block, civic campus, and annexed complex.

Primary targets:

- `src/graphics/BuildingTextures.ts`
- `src/graphics/TextureFactory.ts`
- `src/buildings/BuildingRegistry.ts`
- `src/rendering/BuildingRenderer.ts`
- `public/assets/atlas/pixel-city.json`

### 3. The procedural and atlas pipelines conflict

Procedural zone textures contain useful patterns, but authored atlas frames can replace them with flatter solid-color tiles. Authored building frames exist in the atlas but are not the active quality path. The project needs one clear ownership model for procedural fallback, authored sprites, metadata, seasonal layers, and simulation anchors.

The atlas manifest should eventually carry:

- footprint and anchor
- thumbnail crop
- window-light anchors
- smoke and steam emitters
- entrances and queue anchors
- construction stages
- winter and condition overlays
- far-zoom silhouette asset

### 4. Districts are not visually composed

District identity is mostly tint plus isolated hashed props. A worker estate, historic core, scientific city, and heavy-industry belt should be distinguishable by massing, setbacks, rooflines, yards, trees, streets, paths, public space, and activity.

Architectural rendering must also use the canonical district style written by the district simulation. It should not independently guess district identity from nearby zones.

### 5. City life is generic or detached

Cars are tiny rectangles, window lights are scattered over generic bounds, smoke uses approximate offsets, and construction is a brief scale-and-fade. These systems add motion but do not feel authored into the buildings.

The next system should use direction-aware vehicle sprites, real light and emitter anchors, entrance-aware queues, multi-stage construction, workers, buses, loading activity, and district-specific prop clusters.

### 6. The interface is text-heavy and visually over-alarmed

The resource bar, toolbar, panels, minimap, event surfaces, and alerts all use similar black, red, and gold emphasis. Unicode and emoji glyphs serve as icons. Building choices are mainly labels and costs instead of pictorial tiles.

The interface should become a **Ministry Console**:

- neutral graphite, olive, enamel, and aged-paper chassis
- gold for selected and achieved
- amber for warning
- red for critical and destructive
- authored pixel icons and building thumbnails
- one authoritative active-tool state
- visible map-mode rack with legends
- city view kept dominant

### 7. Several visual states can contradict game truth

Before adding polish, interaction truth must be fixed:

- toolbar selection can disagree with keyboard-selected tools
- quick Inspect and Demolish lack a unified active state
- locked categories can be reached through category cycling
- tutorial instructions refer to obsolete controls and can auto-complete from unrelated state
- power overlays can remain stale
- select and demolish previews do not show a full multi-tile footprint
- Clear Zone has no preview
- low quality omits semantic overlay tiles
- the minimap can remain stale while paused

These are visual-design blockers because the interface cannot be trusted until the highlighted state matches the simulation state.

## Hard rule for menus and loading screens

All front-door surfaces must feel like scenes from one illustrated Soviet pixel-art world.

This includes:

- opening screen
- main menu
- scenario selection
- loading screens
- save restore
- pause menu
- event dossiers
- campaign ending
- credits

### Loading-screen redesign

The current implementation mixes desk imagery with a detached black panel, a monospace `<pre>` line, rotating boot text, a terminal ticker, and a separate floating intro dialog. This breaks the visual promise established by the opening.

Replace it with three full illustrated loading scenes:

1. **City Plan in Transit**: tractor convoy carrying concrete panels into a snowbound construction district.
2. **Industrial Mobilization**: factory shift change, freight yard, glowing furnaces, and a skyline under expansion.
3. **Orbital Survey**: a planning desk with satellite map, radio set, blueprint overlays, and city telemetry rendered as paper graphics rather than terminal text.

Shared rules:

- use the same desk material, border treatment, pixel density, and lighting as the opening
- make the illustration the dominant content
- integrate mode label and progress into the dossier or desk edge
- use one short headline and one short caption, not boot-log chatter
- remove ASCII, `<pre>`, double-colon status copy, and terminal aesthetics
- replace the floating intro panel with a stamped file tab or caption block within the illustration
- retain a clear progress bar and skip affordance
- use subtle scene animation only: smoke, lamp blink, tractor track, map sweep, or paper movement
- provide a static reduced-motion version

Primary targets:

- `src/ui/LoadingInterstitial.ts`
- `src/ui/styles/soviet-theme.css`
- `public/assets/ui/loading-card-tractor.svg`
- `public/assets/ui/loading-card-factory.svg`
- `public/assets/ui/loading-card-orbit.svg`
- new `public/assets/ui/loading-scene-*.webp` assets

Also wire the scenario art and subtitles that already exist in scenario data into the title screen instead of showing name and target year alone.

## Art pillars

### Silhouette before facade

Every repeated building family must be recognizable from footprint, height profile, and roofline before window detail is visible.

### Architectural families, not tint variants

District and building variants alter physical construction, attachments, public realm, and maintenance state.

### Terrain shapes the plan

Visible elevation, cliffs, riverbanks, embankments, retaining walls, bridges, and slope-compatible networks make each seed a place.

### Systems leave visible marks

Power, service pressure, commute, pollution, construction, season, prosperity, and unrest change the world through authored visual behavior.

### Era means urban maturation

Era progression should change the existing city, not only unlock buttons. Streets become furnished, skylines rise, districts densify, infrastructure matures, and civic composition becomes more monumental.

### Controlled pixel craft

Use hard native-scale edges, deliberate pixel clusters, limited material ramps, and consistent light direction. Red and gold are accents, not area fills.

## Release program

The existing two-to-three-week visual-pack cadence is sensible. Each pack should ship one coherent system or asset family with before-and-after evidence.

### Pack 0: Visual contract and benchmark city

Duration: 1 week

Deliverables:

- one deterministic benchmark save
- captures for early, mid, late, stressed, winter, night, and event states
- native pixel scale and edge rules
- top-left sun direction and face-value bands
- named material ramps
- red, gold, warning, and overlay usage rules
- procedural versus authored ownership rules
- performance budgets for Low, Medium, and High

### Pack 1: Illustrated front door

Duration: 2 weeks

Deliverables:

- replace loading terminal treatment with three full illustrated loading scenes
- integrate progress and mode copy into the art frame
- wire scenario art and subtitles into scenario selection
- align pause, restore, campaign ending, and credits with the desk-and-dossier system
- remove ASCII-style loading copy and monospace hero treatments

### Pack 2: Interaction truth

Duration: 2 weeks

Deliverables:

- centralized active-tool and active-overlay state
- fix locked category cycling
- event-driven tutorial steps
- full-footprint select and demolish feedback
- Clear Zone preview
- live power and minimap refresh
- canonical district style in rendering
- low-quality semantic overlays remain complete

### Pack 3: Physical terrain and streets

Duration: 3 weeks

Deliverables:

- render stored elevation
- cliffs, slopes, retaining walls, shorelines, embankments, and culverts
- remove universal tile outlines
- broad material continuity and forest canopy clusters
- richer road family with curbs, sidewalks, crossings, patched asphalt, and snow edges
- bridges and bank-compatible infrastructure

### Pack 4: Worker-housing kit

Duration: 3 weeks

Deliverables:

- three Kommunalka masses
- three Khrushchyovka masses
- three Panelak masses
- roof packs, winter roofs, construction stages, condition states, and night anchors
- coherent courtyard sets with playground, laundry, paths, kiosk, trees, bus stop, and queue space

### Pack 5: Industrial kit

Duration: 3 weeks

Deliverables:

- sawtooth, pipeworks, and assembly factory families
- coal plant as a multi-building campus with boiler hall, turbine hall, coal yard, cooling, and stack anchors
- warehouse and freight-yard families
- authored trucks, buses, workers, loading, steam, smoke, soot, and lighting anchors

### Pack 6: Civic and scientific-city kit

Duration: 3 weeks

Deliverables:

- hospital and school campus variants
- metro plaza, cinema, sports complex, radio tower, and civic-axis compositions
- pictorial civic entrances, forecourts, signage, lighting, and queue layouts
- district-specific public realm and mature landscaping

### Pack 7: Ministry Console and planning maps

Duration: 3 weeks

Deliverables:

- authored 16, 24, and 32 pixel icon system
- building thumbnails and active-tool specification card
- neutral console chassis with restrained red
- visible City, Zones, Power, Services, and Districts map-mode rack
- legends and matching minimap layers
- far-zoom planning-model level of detail

### Pack 8: Living city and era expression

Duration: 3 weeks

Deliverables:

- direction-aware vehicles and commute-driven density
- entrance-aware pedestrian and queue snippets
- multi-stage construction
- localized unrest, service stress, and industrial strain
- era-specific street furniture, skyline, density, lighting, and maintenance states
- scenario-specific visual conditions, especially late-period stagnation

## Acceptance gates

Every pack must pass all applicable gates.

### Readability

- At 0.5x, players can identify residential, industrial, civic, infrastructure, and landmark silhouettes without relying on color.
- At 0.25x, category, density, and network state remain readable when facade detail disappears.
- Worker housing, heavy industry, scientific city, and historic core remain distinguishable in grayscale.
- Low quality never drops semantic overlay coverage.

### Variety

- Every repeated core family has at least three physically different masses.
- District differentiation changes geometry and public realm, not only tint.
- A benchmark screenshot never shows an obvious row of identical repeated buildings unless that repetition is an intentional prefab-planning statement.

### World response

- Elevation produces unmistakable physical edges and correct joins.
- Power loss, service stress, season, commute pressure, and industrial activity are visible in the city.
- Vehicle sprites face their route.
- Building lights and emitters use authored anchors.
- Construction has at least three visible world stages.

### Interface truth

- One authoritative state drives tool button, cursor, preview, active card, and help copy.
- Full footprints are represented for build, select, and demolish.
- Every map mode has a unique pattern or icon in addition to color.
- Minimap and city overlays reflect the same live state.

### Front-door consistency

- Every menu and loading screen uses the same illustrated pixel-art material language.
- Loading screens contain no ASCII art, terminal panels, `<pre>` hero copy, or boot-log chatter.
- Scenario and loading artwork is visible at normal play speed and remains coherent in reduced motion.

### Release proof

- before-and-after captures at 1920x1080 and 1366x768
- zooms 0.25, 0.5, 1, and 2
- Low, Medium, and High quality
- all seasons and day/night
- keyboard-only and reduced-motion checks
- color-vision simulation
- stable frame time and draw-call budget
- build, atlas, determinism, and visual QA checks pass

## Immediate next step

Start with Pack 0 and Pack 1. The opening already proves the desired illustrated identity, and the loading/front-door inconsistency is a visible, bounded improvement that can be completed while the terrain and building pipeline is being specified.

Do not start another small facade-detail pass before the visual contract and terrain strategy are locked. Terrain mass, true building families, and interaction truth will produce a much larger improvement than adding more strokes to the current procedural silhouettes.
