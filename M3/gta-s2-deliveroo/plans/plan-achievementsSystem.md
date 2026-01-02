## Plan: Achievement System with Observer Architecture (Updated)

Adding a robust achievement system with localStorage persistence, event-driven architecture using Observer pattern, and canvas-based toast notifications. Progress saves happen immediately on achievement events (crashes reset levels anyway, no stuttering risk). Includes performance monitoring wrapper and phased stretch goals (timestamps first, then custom images).

### Steps

1. **Create Achievement infrastructure** - Build [AchievementManager.js](M3/gta-s2-deliveroo/js/achievements/AchievementManager.js) with Observer pattern (subscribe/notify methods), performance monitoring wrapper (`console.time()` in dev mode), [AchievementDefinitions.js](M3/gta-s2-deliveroo/js/achievements/AchievementDefinitions.js) with 10+ achievement configs including `unlockedDate` field, and [AchievementStorage.js](M3/gta-s2-deliveroo/js/achievements/AchievementStorage.js) extending [ScoreHistory.js](M3/gta-s2-deliveroo/js/ScoreHistory.js) pattern with immediate save on progress changes (quota error handling like lines 42-51)

2. **Implement event emission layer** - Add event hooks in [Game.js](M3/gta-s2-deliveroo/js/Game.js): `triggerLevelComplete()` emits score/vehicle/level data, `triggerGameOver()` emits crash event with position, `checkCollisions()` curb bonk (survive collision without game over), speed tracking in [PlayerCar.js](M3/gta-s2-deliveroo/js/PlayerCar.js) (emit when exceeding 140 km/h threshold); use callback pattern `this.onEventName?.(data)` to avoid per-frame polling

3. **Build toast notification renderer** - Create [ToastRenderer.js](M3/gta-s2-deliveroo/js/renderers/ToastRenderer.js) with queue system (max 3 simultaneous), 5-second lifecycle animation (0.75s slide-in from bottom → 3.5s display → 0.75s fade-out), canvas rendering at bottom center matching parking hint position from [EffectsRenderer.js](M3/gta-s2-deliveroo/js/renderers/EffectsRenderer.js#L85-L105) (`hintY = canvasHeight - 80`), styled with achievement title, description, and unlock timestamp; integrate into [GameRenderer.js](M3/gta-s2-deliveroo/js/GameRenderer.js) draw pipeline after effects layer

4. **Wire achievement tracking logic** - Subscribe to events in [Game.js](M3/gta-s2-deliveroo/js/Game.js) constructor: crash counter for "Andrzeju to się wyklepie" (50 crashes), score thresholds for "Mistrz parkowania" (>90) and "Karna nalepka" (<10), level 22 completion for "Potrzymaj mi piwo!", reverse parking detection (level 21), SUV vehicle completion, speed records (>200 km/h), curb survival; trigger `toastRenderer.show(achievement)` on unlock

5. **Add achievements history screen** - Create `ACHIEVEMENTS_SCREEN` state accessible from [title screen](M3/gta-s2-deliveroo/js/Game.js#L189-L217) button, implement `drawAchievementsScreen()` in [ScreenRenderer.js](M3/gta-s2-deliveroo/js/renderers/ScreenRenderer.js) showing scrollable grid of achievements (unlocked with timestamp vs locked with progress bar), placeholder for future custom images (empty `imageUrl` data structure), back button to title screen

### Further Considerations

1. **Immediate save strategy** - Progress saves on every event (crash increments, level completions). Since crashes trigger game reset and level completions already pause gameplay, no performance impact expected. AchievementStorage will batch writes if multiple achievements unlock simultaneously (single `localStorage.setItem()` call)

2. **Performance monitoring toggle** - Add `window.DEBUG_ACHIEVEMENTS = true` flag to enable `console.time('AchievementCheck')` wrappers in development. Production builds skip logging entirely via conditional checks, zero overhead for players

3. **Image implementation path** - Achievement definitions include optional `imageUrl` field from start (defaults to null). Phase 2 adds static images to `assets/achievements/` folder (PNG icons 128x128 or 256x256), updates toast renderer to show images when present, and adds image fallback handling for missing assets (trophy image)
