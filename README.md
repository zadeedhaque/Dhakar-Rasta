# Dhakar Rasta - Ekti Durghotona, Sharajiboner Kanna

A lightweight 3D browser game about surviving Dhaka traffic. Drive as far as you can
without a serious accident: wrong-way rickshaws, battery rickshaws, buses that stop
anywhere, helmetless bikers on the footpath, and pedestrians crossing under a
perfectly good foot-overbridge. All in-game text is Bangla.

## Play

https://dhakar-rasta.vercel.app

## Run

```
npm install
npm run dev        # http://localhost:5180
npm run build      # type-check + production build into dist/
```

Everything runs client-side. Assets are generated procedurally (no model/audio files);
the Bengali font (Noto Sans Bengali) is bundled locally, so it works offline.

## Controls

| Key | Action |
| --- | --- |
| W / Up | accelerate |
| S / Down | brake / reverse |
| A D / Left Right | steer |
| Space | horn (pedestrians hurry, rickshaws move toward the kerb) |
| Esc | pause |

Touch devices get on-screen buttons (via the InputManager's virtual axes).

### Debug keys (dev server only)

F1 overlay (FPS, draw calls, counts, segment, difficulty) - F2 wrong-way rickshaw -
F3 bus jam - F4 pedestrian crossing - F5 force crash - F6 +100 taka - F7 +1000 m difficulty -
F8 autopilot test bot. In dev, `window.__game` exposes the game for console testing.

## Architecture

```
src/
  main.ts                 boot (waits for font, starts Game)
  game/                   Game (orchestrator), GameState (single authority), GameConfig (ALL tuning),
                          World (shared sim context), DifficultyManager, ScoreManager, Storage,
                          CollisionSystem, HazardTracker (avoid rewards / near misses), CameraRig
  player/                 PlayerCar (state + view), PlayerController (arcade handling)
  traffic/                TrafficManager (pooling, spawning, leader-following), TrafficVehicle,
                          VehicleAI (shared lane logic), CarAI, RickshawAI, BatteryRickshawAI,
                          MotorcycleAI, BusAI
  pedestrians/            Pedestrian, PedestrianAI (state machine), PedestrianManager
  world/                  RoadManager (segment streaming), RoadSegment, Decor (merged geometry builders),
                          segments/ Normal|Commercial|Jam, Market, Footbridge, BusStop, Construction
  events/                 EventManager (weighted, cooldowns, hazard budget), Fairness, BusJamEvent,
                          CrashEvent, PoliceEvent
  economy/MoneyManager.ts
  audio/AudioManager.ts   WebAudio-synthesised engine, horn, bells, crowd, ambience, sfx
  ui/                     MainMenu, HUD, PauseMenu, PoliceDialog, GameOver, SettingsMenu, InfoScreens,
                          DebugOverlay, TouchControls, UIManager
  assets/                 Models (procedural low-poly registry), Signs (Bangla canvas signboards)
  effects/                BlobShadows (1 instanced draw), Particles
  i18n/bn.ts              every user-facing string + Bangla number formatting
```

Simulation is 2D road space (`x` lateral, `s` along the road); meshes are synced from it,
so AI never touches rendering and UI never touches simulation state.

### Key systems

- **Segment streaming**: 100 m segments are generated ahead and disposed behind; type
  selection is difficulty-weighted with adjacency rules (no two narrow segments in a row,
  no jam right after a narrowing). Each segment's decoration is one merged vertex-coloured
  mesh + wires + sign planes.
- **Fairness** (`events/Fairness.ts`): hazards spawn at `(player speed + approach speed) x
  reactionWindow + margin`; at least one (early: two) escape lane must be free of static/slow
  obstacles at the predicted meeting point; a global hazard budget limits stacking; crossers
  only *start* crossing when the player is far enough; vehicles never cut into the player's
  gap and abort lane changes if the player closes in; being rear-ended or side-swiped is minor.
- **Collisions**: AABB in road space. Major = head-on/rear-end at high closing speed, hitting a
  pedestrian head-on, or hard obstacles at speed -> crash -> police. Everything else is a
  minor bump (push apart, small penalty).
- **Police**: pay the fine, "make an arrangement" (satirical, fictional economy), or quit.
  Not enough money ends the run.
- **Pooling**: vehicles (per kind), pedestrians, particles, shadows, and DOM popups are reused.

### Replacing placeholder assets

`assets/Models.ts` is the only place geometry is created. Call
`assets.registerVehicleVariants(kind, geometries)`, `registerPedVariants`, or
`registerPlayerGeometry` with geometry from GLB files (model front facing -Z, ground at y=0)
and the game uses them unchanged. Sounds are named methods on `AudioManager`; swap a method's
body for an AudioBuffer playback to use recorded audio.

### Tuning

Rewards, fines, speeds, densities, difficulty tiers, reaction windows, camera, etc. are all in
`src/game/GameConfig.ts`.
