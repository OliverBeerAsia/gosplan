# GOSPLAN Graphics Asset Provenance Ledger

Date: 2026-07-12

Status: Active ledger for the v1.10.0 graphics foundation candidate

## v1.10.0 release boundary

This ledger covers the generated illustrations, bounded generative edit, concept references, and original code-native atlases included in the v1.10.0 graphics foundation candidate. The candidate is not the completed game-wide graphics overhaul.

The release groups documented below are:

- three generated, text-free production loading illustrations plus retained PNG sources;
- the generated Khrushchyovka concept board, retained as mood reference only;
- the original code-native Khrushchyovka SVG atlas and repository-authored frame metadata;
- the bounded generative cleanup of the opening dossier paper prop plus its before/after sources;
- the generated courtyard concept board, retained as mood reference only;
- the original code-native courtyard SVG atlas and repository-authored frame metadata.

No generated concept-board pixel was traced, sampled, embedded, or transformed into either runtime atlas. No SimCity 2000 sprite, UI element, logo, palette ramp, proprietary shadow cluster, or proprietary atlas layout is included.

Production remains commit `fafaedb`, tag `v1.9.4`, GitHub Pages run `25995410642` until the candidate passes CI, deploys, and passes live verification.

| Release evidence | Value |
|---|---|
| Candidate commit SHA | `PENDING` |
| CI workflow run | `PENDING` |
| Deployment run | `PENDING` |
| Live verified SHA | `PENDING` |

If any candidate asset changes after the candidate SHA is recorded, update its source, production mapping, transformation history, and hashes here before a new commit is approved.

## Production loading illustrations

The three production loading illustrations were created for this repository with OpenAI's built-in image generation tool. They are new compositions, not traced or copied game assets. The prompt set explicitly requested text-free artwork, no logos, no copied interface chrome, and no proprietary SimCity 2000 assets.

The visual brief common to all three images was:

- 16:9 Soviet municipal-planning pixel-art illustration
- restrained cream, oxide red, muted blue, snow, concrete, and night palettes
- clear top-left lighting and hard-edged pixel clusters
- blank cream heading band and dark status band for runtime UI copy
- no embedded text, logos, modern branding, or identifiable proprietary game artwork

Scene-specific prompt summaries:

| Asset | Prompt summary |
|---|---|
| City Plan in Transit | Snow tractor convoy carrying concrete panels and planning materials from a drafting desk toward a winter frontier city |
| Industrial Mobilization | Night factory shift change with sawtooth factories, buses, freight movement, floodlights, and workers mobilizing |
| Orbital Survey | Satellite, Earth horizon, ground dish, cartographic instruments, and a night city under state survey |

## Source and production mapping

| Source PNG | Source SHA-256 | Production WebP | Production SHA-256 | Dimensions |
|---|---|---|---|---:|
| `docs/graphics-review/production-sources/city-plan-in-transit.png` | `35fcbe59b5ca5db1b92f2a274641aeb95726f78244d63a6d89946e090a7c0878` | `public/assets/art/loading/city-plan-in-transit.webp` | `173a840d35c84d5bd62cef958e64b66b0c4dd7eee5da77879114ed487db397ec` | 1672 x 941 |
| `docs/graphics-review/production-sources/industrial-mobilization.png` | `8211ae51c05f6ad2600f70a16da055b26b63d200ad13392acdb43b3db2d077cc` | `public/assets/art/loading/industrial-mobilization.webp` | `c9c337f4450f51d846facb51cf611c2407136136eb3a53900fe0e9950707b569` | 1672 x 941 |
| `docs/graphics-review/production-sources/orbital-survey.png` | `15bf83eed5671ecaa207d1c676243ad8c656a52cea2015efc96e880a3456a434` | `public/assets/art/loading/orbital-survey.webp` | `c25d608dbe9ab28718abd39b197071e44e79685a2ba85b4be86300b689e4004d` | 1672 x 941 |

The PNG sources are retained as review and re-export material. Runtime uses the smaller WebP outputs. The production files are registered in `public/assets/art/manifest.v1.json`, and `npm run check:art` compares the manifest loading-file set against the files referenced by `LoadingInterstitial.ts`.

## Rights and safety review

- No SimCity 2000 sprite, building, terrain tile, logo, or UI element was supplied as an image-generation input.
- The creative target uses general readability principles such as isometric silhouettes, material contrast, and district legibility.
- No real political emblem or government seal is embedded in the generated files.
- No text is baked into the illustrations; all player-facing copy remains accessible HTML.
- Any future external source, commissioned artist contribution, or licensed texture must add its author, license, source URL or contract reference, and transformation history to this ledger before merge.

## Production caveat

The generated scenes establish composition and art direction. A later pixel-cleanup pass should normalize cluster size, palette ramps, and edge scale with the authored scenario, terrain, and building sprites before the final graphics program release.

## Pack 4 Khrushchyovka concept and production atlas

The Pack 4 exploration board at `docs/graphics-review/pack4-khrushchyovka-concept.png` was created with OpenAI's built-in image generation tool. Its prompt requested a text-free, wide three-panel concept sheet with a consistent 2:1 isometric camera, winter daylight, weathered grey concrete, sparse snow, oxide-painted entrances, and hard-edged 1990s city-builder pixel clusters. It explicitly prohibited logos, emblems, watermarks, text, and copied SimCity 2000 assets.

The generated board was used only to select the concrete, snow, glazing, and entrance-colour relationships. Its left mass read as a tower, its middle mass exceeded the game's 2x1 footprint, and its right mass read as a deep U-shaped block. Those geometries were rejected before production. No generated pixels were sampled, traced, embedded, or transformed into the runtime atlas.

The runtime files are original code-native SVG geometry authored directly for GOSPLAN:

| File | Authorship and role | Fixed contract |
|---|---|---|
| `public/assets/art/atlases/buildings-khrushchyovka-1x.svg` | Original Pack 4 hard-edged vector-pixel artwork; no external images or fonts | 480 x 528 atlas; three 160 x 176 columns by three rows; transparent cells; `crispEdges` |
| `public/assets/art/atlases/buildings-khrushchyovka-1x.json` | Original frame metadata | Nine untrimmed frames: short, long, and shallow linked-return masses at far, mid, and near LOD |
| `public/assets/art/manifest.v1.json` | Runtime registration | Stable atlas ID `buildings.khrushchyovka_1x`; anchor `[80,168]`; unchanged 2x1 gameplay footprint; deterministic variants; procedural fallback retained |

All three masses are independent five-storey slab compositions built on the game's existing 64 x 32 isometric grid. The short slab has two entrance sections, the long slab has three, and the linked composition adds one shallow perpendicular bay without becoming a U-shaped or 2x2 complex. No terrain, landscaping, political emblem, text, copied silhouette, copied palette ramp, proprietary shadow cluster, or proprietary atlas layout is baked into these frames.

The original-art boundary is deliberate: SimCity 2000 is referenced only for the general design goal of readable isometric city-building silhouettes at multiple zoom levels. The production geometry, proportions, facade rhythm, colours, roof services, snow clusters, frame system, and anchoring are repository-specific work.

## Opening dossier paper cleanup

The opening dossier art received a bounded generative edit after adversarial review found malformed lettering on the lower-left paper prop. OpenAI's built-in image generation tool was given the existing production PNG and instructed to preserve the planning desk, central GOSPLAN mark, correctly spelled headings, calendars, palette, lighting, and pixel-art treatment while replacing the malformed paper lettering with an unlabeled municipal chart. No new words, letters, numbers, logo, or watermark were requested in the edited area.

The accepted edit was visually reviewed in the running game. The prior production PNG is retained for rollback, and the accepted generated PNG is retained as the clean production source. The runtime WebP was exported locally from that source without further content edits.

| File | Role | SHA-256 |
|---|---|---|
| `docs/graphics-review/production-sources/opening-home-before-cleanup.png` | Pre-edit rollback source | `7f297afbbf70c1a86539deac54ccd70ec38a2182b2e646f5d4f996b172076626` |
| `docs/graphics-review/production-sources/opening-home-clean.png` | Accepted image-generation output | `e23953f5e57da19a52f4832b62829605fede06611d9d78ac51c2a600eed1ebdd` |
| `public/assets/ui/opening-home.png` | Runtime PNG fallback | `e23953f5e57da19a52f4832b62829605fede06611d9d78ac51c2a600eed1ebdd` |
| `public/assets/ui/opening-home.webp` | Runtime primary asset | `7c5077cafc1e257ec69e10a2e87aa9e0180010032d9c93589476921f0004ce89` |

## Pack 4B worker-housing courtyard concept and production atlas

The Pack 4B exploration board at `docs/graphics-review/pack4b-courtyard-concept.png` was created with OpenAI's built-in image generation tool. The prompt requested a wide three-panel sheet using a consistent 2:1 isometric camera, winter daylight, and hard-edged 1990s city-builder pixel art. Its panels explored a playground with climbing frame, sandbox, benches, bare trees, paths, and snow tracks; a shared service green with laundry, refuse shelter, kiosk, benches, paths, and footprints; and a transit edge with bus shelter, blank timetable, queue rail, path, fence, trees, and snowbank. It explicitly prohibited buildings, people, labels, text, logos, emblems, watermarks, interface chrome, and proprietary SimCity 2000 assets.

The board is a mood and composition reference only. Its baked terrain, oversized props, and scene-level snow were not suitable for tile-local runtime art. No generated pixel was sampled, traced, embedded, transformed, or used as an atlas source. The review-board SHA-256 is `c71469235186079ce96848be898a763fc71132bda115f890b5b236a41f106d73`.

The production files are original code-native SVG geometry authored directly for GOSPLAN:

| File | Authorship and role | Fixed contract | SHA-256 |
|---|---|---|---|
| `public/assets/art/atlases/environment-worker-housing-1x.svg` | Original hard-edged courtyard part artwork using only integer SVG geometry and internal reuse | 384 x 880 atlas; eleven 64 x 80 tile-local part rows; base and winter; far, mid, and near LOD; transparent cells; `crispEdges`; anchor `[32,72]`; upright art at five-eighths scale around the fixed contact point | `9fb193158dbe4498fc7f8cc2ab60894f7dc95370d970f6789bf9c7baad7a1ea8` |
| `public/assets/art/atlases/environment-worker-housing-1x.json` | Original frame metadata | Sixty-six untrimmed frames with stable row and LOD positions | `d418e82fefd8475e1d326b09287c3c779c6fd90c9332f2ab887e0b61fffa33b5` |
| `public/assets/art/manifest.v1.json` | Runtime registration | Stable atlas ID `environment.worker_housing_1x`; reserved footprints; deterministic placement candidates; play-square, laundry-green, and explicitly oriented north-east and north-west service-edge variants; procedural recovery retained | Changes with manifest evolution |
| `scripts/check-courtyard-atlas.cjs` | Mechanical production-art gate | Verifies palette, integer geometry, forbidden SVG features, frame grid, anchors, footprints, LOD and winter coverage, road-edge orientations, and fallback reachability | Changes with contract evolution |

The atlas palette is limited to repository-owned concrete, oxide, muted wood, snow, and glazing ramps. It contains no full terrain tile, building mass, political emblem, text, font, logo, raster image, external link, gradient, filter, copied silhouette, proprietary shadow cluster, or proprietary atlas layout. Ground decals remain transparent tile-local wear and snow marks, so the renderer retains ownership of terrain and elevation. Every authored part declares an existing `prop_*` procedural key for recovery when the atlas is unavailable.

The creative red-team correction pass reduced every upright part to five-eighths of its original drawn size through integer nested viewports. The `[32,72]` ground contact remains mathematically fixed and the 64 x 80 frame contract is unchanged. Walkway decals were separately redrawn as broken gray-brown wear patches with irregular winter snow breaks and paired dark footprints, avoiding any continuous raised white strip. Every refuse shelter now contains two explicit dark container silhouettes at every LOD and orientation. Playground frames, benches, wash equipment, and kiosk roofs moved from dominant oxide paint to structural gray or muted wood, leaving oxide as a small municipal accent. The production checker mechanically locks all four corrections.
