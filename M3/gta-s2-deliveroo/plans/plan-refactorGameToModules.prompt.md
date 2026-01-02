# Plan: Extract Classes & Main Loop

TL;DR: Split the large index.html script into small modules iteratively, extracting pure utilities first, then small classes, then vehicle/AI classes, finally `Game` and the entry `loop`. Each step preserves behavior and keeps initialization order; I'll pause after this plan for your approval before proposing file edits.

## Steps

### Step 1: Extract Utilities
Create utilities: move `CONFIG` to `M3/gta-s2-deliveroo/js/config.js` and extract geometry helpers to `M3/gta-s2-deliveroo/js/utils/geom.js` and audio helpers to `M3/gta-s2-deliveroo/js/utils/audio.js`.

**Actions:**
- Create `M3/gta-s2-deliveroo/js/config.js` and move CONFIG (lines ~172-221) into it and export it.
- Create `M3/gta-s2-deliveroo/js/utils/geom.js` and move geometric functions (getCorners, projectPolygon, overlap, checkRectCollision, checkCircleRectCollision, isPointInRotatedRect).
- Create `M3/gta-s2-deliveroo/js/utils/audio.js` and move audio helper functions and oscillator state (audioCtx, driftOscillator/driftGain, engineRevOscillator/engineRevGain and the start/update/stop/play functions).

**Safety:** No logic changes — only relocate pure functions. Ensure imports are wired; keep original functions in index.html commented copy until validated (recommended).

### Step 2: Extract Small Independent Classes
Extract tiny classes: move `InputHandler` to `M3/gta-s2-deliveroo/js/InputHandler.js`, `Curb` to `M3/gta-s2-deliveroo/js/Curb.js`, `Pillar` to `M3/gta-s2-deliveroo/js/Pillar.js`, `ParkingZone` to `M3/gta-s2-deliveroo/js/ParkingZone.js`. Import these into the Game module later.

**Actions:**
- Create `M3/gta-s2-deliveroo/js/InputHandler.js` with InputHandler class.
- Create `M3/gta-s2-deliveroo/js/Curb.js` with Curb class.
- Create `M3/gta-s2-deliveroo/js/Pillar.js` with Pillar class.
- Create `M3/gta-s2-deliveroo/js/ParkingZone.js` with ParkingZone class.
- Import these new modules into a temporary `js/main.js` or `Game.js` (next step).

**Safety:** These classes don't close over external state; extracting them is low risk. Keep index.html's original class definitions commented during migration for rollback.

### Step 3: Extract Obstacle & AI Cars
Extract obstacle & AI cars: move `ObstacleCar` to `M3/gta-s2-deliveroo/js/ObstacleCar.js` and `NpcCar` to `M3/gta-s2-deliveroo/js/NpcCar.js` (import `ObstacleCar`, `geom` and `audio` utils). Ensure `NpcCar` is not instantiated at module import time.

**Actions:**
- Create `M3/gta-s2-deliveroo/js/ObstacleCar.js` with ObstacleCar export.
- Create `M3/gta-s2-deliveroo/js/NpcCar.js` for NpcCar and import ObstacleCar and audio/geom util modules.
- Adjust NpcCar imports for `canvas` usage — instead of reading global canvas at module-eval time, change level factories to call constructor with absolute coordinates during loadLevel (see mitigation notes).

**Safety:** NpcCar references `canvas.width` and `canvas.height` in level factories — avoid invoking level construction at module import time (defer to Game.defineLevels).

### Step 4: Extract PlayerCar
Extract `PlayerCar`: create `M3/gta-s2-deliveroo/js/PlayerCar.js` and import `CONFIG`, `geom` and `audio` utils; keep all methods identical and accept `input`/`ctx` via parameters rather than relying on implicit globals.

**Actions:**
- Create `M3/gta-s2-deliveroo/js/PlayerCar.js`, import CONFIG, audio utils and geom utils.
- Keep PlayerCar methods identical; ensure PlayerCar no longer relies on top-level `input` (it receives `input` in update calls).
- Update Game.js to import PlayerCar and instantiate during game construction (defer until main initialization to ensure canvas size is set).

**Safety:** PlayerCar uses audio helper globals — import audio module to obtain functions rather than relying on top-level vars.

### Step 5: Extract Game and Create Entrypoint
Extract `Game` and entrypoint: create `M3/gta-s2-deliveroo/js/Game.js` (imports classes + utils) and `M3/gta-s2-deliveroo/js/main.js` that queries DOM, creates `input` and `game`, defines the `loop` (requestAnimationFrame), and exposes `window.game` to preserve inline handlers.

**Actions:**
- Create `M3/gta-s2-deliveroo/js/Game.js` exporting Game (import classes & utils).
- Create `M3/gta-s2-deliveroo/js/main.js` which queries DOM for canvas, creates InputHandler instance, creates Game (after canvas sizing), attaches window.onload, resize handlers and defines loop() using requestAnimationFrame.
- Expose `window.game = game` in main.js so existing inline onclick attributes continue to work (or update HTML to use event listeners).

**Safety:** This step changes load order; ensure main.js is loaded last and that Game construction happens after canvas is sized. Preserve behavior by exposing game globally.

### Step 6: Final Wiring & Cleanup
Final wiring & cleanup: replace the big inline script with a single `<script type="module" src="js/main.js"></script>` or use ordered classic scripts; optionally migrate inline onclick attributes to event listeners in `main.js`.

**Actions:**
- Optionally replace inline HTML onclick attributes with event listeners in main.js (`document.getElementById('toggle-steering-mode').addEventListener('click', () => game.player.toggleSteeringMode())`) — lower coupling.
- Remove original script block from index.html and include a single `<script type="module" src="js/main.js"></script>` at the end of body.
- Run validation checklist and fix any broken import paths or ordering issues.

**Safety:** This consolidates module usage; if you prefer minimal change, keep inline onclicks and just expose `game` on window.

## Classes Overview

### InputHandler (lines ~436-452)
Simple keyboard state manager (keydown/keyup).
- **Dependencies:** None
- **Referenced by:** PlayerCar, window.onload

### Curb (lines ~453-475)
Static curb / sidewalk drawable rectangle.
- **Dependencies:** None
- **Referenced by:** Game, levels data

### ObstacleCar (lines ~476-541)
Static obstacle car (drawable) used for parked cars.
- **Dependencies:** None
- **Referenced by:** Game (level data), NpcCar (subclass)

### NpcCar (lines ~542-797)
Moving non-player car with AI: update(), canSpawn(), draw(), stop(). Extends ObstacleCar.
- **Dependencies:** ObstacleCar, checkRectCollision, checkCircleRectCollision, canvas, audio (horn.wav)
- **Referenced by:** Game (currentCars & level data)

### Pillar (lines ~798-818)
Static circular obstacle (pillar) with draw().
- **Dependencies:** None
- **Referenced by:** Game (level data)

### ParkingZone (lines ~819-843)
Drawable parking zone (rotated rect) with draw().
- **Dependencies:** None
- **Referenced by:** Game (checkParking(), level data)

### PlayerCar (lines ~844-1468)
Full player car model: reset(), update(), updateSimplePhysics(), updateWinterPhysics(), draw(), drawWheel(), skid marks etc.
- **Dependencies:** CONFIG, input (InputHandler instance), startDriftSound/updateDriftSound/stopDriftSound, startEngineRevSound/updateEngineRevSound/stopEngineRevSound, getCorners, isPointInRotatedRect
- **Referenced by:** Game, UI buttons (toggleSteeringMode/toggleWinterMode called from DOM)

### Game (lines ~1469-2759)
Main game manager: level definitions, loadLevel(), startGame(), update(), draw(), collision & parking checks, UI wiring.
- **Dependencies:** PlayerCar, NpcCar, ObstacleCar, Pillar, ParkingZone, Curb, getCorners, isPointInRotatedRect, checkRectCollision, checkCircleRectCollision, DOM elements (levels-container, UI IDs, background-music)
- **Referenced by:** loop(), window.onload

## Main Loop

### loop() function (line ~2778)
- **Invoked via:** requestAnimationFrame(loop) — within loop() (self-scheduling), initial invocation: window.onload calls loop() after setup
- **Calls per frame:** game.update(), game.draw()
- **Calls inside update:** player.update(input), currentCars.forEach(car.update), collision checks (checkRectCollision / checkCircleRectCollision), UI updates (DOM: ui-speed, ui-steer, ui-engine, ui-lights, ui-drift, ui-boost), game.checkCollisions(), game.checkParking()
- **Calls inside draw:** environment draw (drawLot/Street/Highway variants), parking zones, curbs, obstacles, cars draw, player.drawSkidMarks(ctx) and player.draw(ctx), special screens: drawTitleScreen / drawLevelCompleteScreen / drawBonk

## Globals & Configuration

### Configuration Objects
- **CONFIG** (lines ~172-221)

### Global State
- `canvas` (const) — element 'gameCanvas' (init at bottom)
- `ctx` (const) — canvas 2D context
- `input` (const) — new InputHandler()
- `game` (let) — instance of Game created in window.onload
- `audioCtx` (const) — AudioContext
- `driftOscillator`, `driftGain` (let) — drift sound state
- `engineRevOscillator`, `engineRevGain` (let) — engine rev sound state

### Global Functions
- Audio: playBonkSound, playCurbSound, startDriftSound, updateDriftSound, stopDriftSound, startEngineRevSound, updateEngineRevSound, stopEngineRevSound, playLevelCompleteSound
- Geometry/Collision: getCorners, projectPolygon, overlap, checkRectCollision, checkCircleRectCollision, isPointInRotatedRect

**Note:** Many utility functions and audio oscillators are top-level globals and used across classes (PlayerCar, NpcCar, Game). Canvas and ctx are global and expected by level constructors (they use canvas.width/height when building level data).

## Utilities to Extract

### Audio Helpers (lines ~222-364)
**Symbols:** playBonkSound, playCurbSound, startDriftSound, updateDriftSound, stopDriftSound, startEngineRevSound, updateEngineRevSound, stopEngineRevSound, playLevelCompleteSound

**Reason:** Group audio creation and oscillator state; easier to manage/rescope audioCtx and shared oscillator variables.

### Collision & Geometry (lines ~365-435)
**Symbols:** getCorners, projectPolygon, overlap, checkRectCollision, checkCircleRectCollision, isPointInRotatedRect

**Reason:** Pure utility functions with no DOM dependencies; good single module for physics/math helpers.

### Small Helpers / Init Stubs (lines ~2760-2777)
**Symbols:** loadNextLevel, resize

**Reason:** Window helpers and resize logic belong to entry file but separable from Game implementation.

## File Recommendations

### M3/gta-s2-deliveroo/js/config.js
- **Exports:** CONFIG
- **Imports:** None
- **Notes:** Contains game-wide constants and getters (acceleration selection).

### M3/gta-s2-deliveroo/js/utils/audio.js
- **Exports:** audioCtx, startDriftSound, updateDriftSound, stopDriftSound, startEngineRevSound, updateEngineRevSound, stopEngineRevSound, playBonkSound, playCurbSound, playLevelCompleteSound
- **Imports:** ../config.js (if audio uses config later)
- **Notes:** Module should own oscillator state (driftOscillator, engineRevOscillator) and expose control functions.

### M3/gta-s2-deliveroo/js/utils/geom.js
- **Exports:** getCorners, projectPolygon, overlap, checkRectCollision, checkCircleRectCollision, isPointInRotatedRect
- **Imports:** None

### M3/gta-s2-deliveroo/js/InputHandler.js
- **Exports:** InputHandler
- **Imports:** None

### M3/gta-s2-deliveroo/js/Curb.js
- **Exports:** Curb
- **Imports:** None

### M3/gta-s2-deliveroo/js/Pillar.js
- **Exports:** Pillar
- **Imports:** None

### M3/gta-s2-deliveroo/js/ParkingZone.js
- **Exports:** ParkingZone
- **Imports:** None

### M3/gta-s2-deliveroo/js/ObstacleCar.js
- **Exports:** ObstacleCar
- **Imports:** None

### M3/gta-s2-deliveroo/js/NpcCar.js
- **Exports:** NpcCar
- **Imports:** ./ObstacleCar.js, ../utils/geom.js, ../utils/audio.js

### M3/gta-s2-deliveroo/js/PlayerCar.js
- **Exports:** PlayerCar
- **Imports:** ../config.js, ../utils/geom.js, ../utils/audio.js, ./InputHandler.js
- **Notes:** Relies on CONFIG, audio helpers and geometry utils.

### M3/gta-s2-deliveroo/js/Game.js
- **Exports:** Game
- **Imports:** ./PlayerCar.js, ./NpcCar.js, ./ObstacleCar.js, ./Pillar.js, ./ParkingZone.js, ./Curb.js, ../utils/geom.js, ../config.js, ../utils/audio.js
- **Notes:** Contains levels definition, loadLevel, update and draw methods. Keep level factory inside Game.js to preserve logic but reference imported classes.

### M3/gta-s2-deliveroo/js/main.js
- **Exports:** None
- **Imports:** ./Game.js, ./InputHandler.js, ../utils/geom.js
- **Notes:** Entrypoint that queries DOM (canvas), creates `input`, initializes `game`, wires window.onload, resize, loop and event listeners. Should expose `game` as window.game for existing inline onclicks.

## DOM Dependencies

### Elements by ID
- background-music
- toggle-steering-mode
- toggle-winter-mode
- toggle-music-btn
- levels-container
- ui-speed
- ui-steer
- ui-engine
- ui-lights
- ui-drift
- ui-boost
- gameCanvas

### Assets
- background.wav
- horn.wav
- grass-textures.jpg

### Implicit Expectations
- Canvas exists in DOM before script runs (currently true because script is at bottom of body).
- Audio files present at root of same folder (relative paths used).
- Some buttons call methods on global `game.player` via inline onclick attributes in HTML (e.g., onclick="game.player.toggleSteeringMode()") — these depend on `game` being global.

## Risks & Mitigations

### Risk 1: Order of initialization / canvas size
**Issue:** Level definitions use canvas.width/height when constructing level objects. If levels are constructed at module-evaluation time (import time) before canvas is available/sized, values will be wrong or throw.

**Mitigation:**
- Defer level construction: have Game.defineLevels produce level factories that compute positions during `loadLevel()` not during module import.
- Instantiate Game (and call defineLevels/loadLevel) only after canvas and resize() have been called (i.e., in main.js after initial resize).

### Risk 2: Implicit global variables and closures (audio oscillators)
**Issue:** audioCtx, driftOscillator, engineRevOscillator were top-level globals shared across functions and classes.

**Mitigation:**
- Move audio state into a single audio module and export functions that encapsulate oscillator state (avoid polluting global scope).
- Ensure imports return a single shared instance (module singleton).

### Risk 3: Classes/level data constructed at module import time
**Issue:** Levels array in Game.defineLevels currently creates objects using `new Pillar(...)`, `new NpcCar(...)` etc. If those constructors expect globals (canvas) or DOM, they may break when modules load earlier.

**Mitigation:**
- Keep `defineLevels()` as a function (already is) and ensure it's called after DOM/canvas ready. When extracting classes, do not execute `defineLevels()` at module top-level.
- If you extract level data into a separate JSON/factory, keep `new` calls inside Game.loadLevel().

### Risk 4: Inline HTML handlers depend on `game` global
**Issue:** Buttons in HTML call `game.player.toggleSteeringMode()` etc. After modularization `game` may not be global.

**Mitigation:**
- Expose `game` on `window` in `main.js` (e.g., `window.game = game`) until migrating inline handlers to addEventListener.
- Prefer adding event listeners from JS to avoid coupling HTML to global state.

### Risk 5: Asset paths and audio autoplay restrictions
**Issue:** Audio files are referenced with relative paths; browsers may block autoplay (AudioContext suspended).

**Mitigation:**
- Keep relative paths consistent; ensure background.wav and horn.wav exist in same folder.
- Handle AudioContext resume on user interaction (already present in code), and test on target browsers.

## Validation Commands

After each refactor step open a local static server from the workspace root and browse to the page:

**macOS / Linux / Windows WSL:**
```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000/M3/gta-s2-deliveroo/index.html and check:
- The canvas loads and you see the title screen.
- Open DevTools Console for errors (missing imports, undefined variables).
- Click PLAY THE GAME and verify controls: Arrow keys, Space, Enter.
- Test music toggle and steering/winter mode buttons (watch console for blocked audio).

**Extra checks after audio extraction:**
- Ensure no console errors about audioCtx or oscillator variables.

**If you use a module loader / bundler (optional):**
- Run a quick build with your bundler (e.g., rollup/webpack) and test the bundle in the same server.

## Module Format Decision: ES Modules from Start

**Decision:** Use ES modules (`type="module"`) from the beginning.

**Rationale:**
- **Single refactor cycle:** Go directly to best practice instead of refactoring twice
- **Explicit dependencies:** Import statements document what each file needs
- **Better encapsulation:** No global pollution, no ordering issues
- **Lower total risk:** One structured change is safer than multiple incremental global namespace changes
- **Modern tooling:** Better IDE support, tree-shaking ready
- **Clear dependencies:** Each module explicitly imports what it needs

**Requirements:**
- Must use local dev server (ES modules require HTTP/HTTPS protocol)
- All exports/imports must be explicit
- Single HTML change at the end: `<script type="module" src="js/main.js"></script>`

### Initialization Strategy
Keep `defineLevels()` and any `new` calls that depend on `canvas` inside `Game.loadLevel()` (called after resize) to avoid wrong values at import time.

### Validation Cadence
Run the page in a local static server after each step and check console + gameplay. ES modules require a server (cannot use `file://` protocol).

## Notes & Confidence

**Confidence:** ≈80%

**Uncertainties:**
- Line ranges are approximate (derived from grep results). Use exact editor ranges when creating files.
- NpcCar and some level entries reference `canvas.width/height` at the time of Game.defineLevels() call — current code calls defineLevels() inside loadLevel(), which is invoked during resize() in window.onload. When extracting, ensure that behavior is preserved (defer level construction until canvas sized).
- Some drawings create Image('grass-textures.jpg') at draw time; consider loading assets once in audio/asset module to avoid re-creating images each frame.
