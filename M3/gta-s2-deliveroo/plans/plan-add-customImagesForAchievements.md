**Plan: Add Custom Images For Achievements**

- **Purpose:** Add support for per-achievement static images (local assets) so the UI can display custom icons instead of the default trophy when achievements are unlocked.

- **Goals:**
  - Allow achievement definitions to include an `image` property (relative path under `assets/achievements/`).
  - Render that image in the toast notification and in the achievements list UI when available.
  - Keep image assets local only (no external URLs) to avoid CORS and portability issues.
  - Do not store image paths in exported achievement state; exported data remains a mapping of `id` -> state only.

- **Non-Goals:**
  - Serving remote images, dynamic asset hosting, or user-uploaded images.
  - Complex asset management (CDN, signed URLs) at this stage.

**High-level Design**

- `AchievementDefinitions.js`: Add optional `image` field to achievement objects. Example: `image: 'assets/achievements/parking_master.svg'`.
- `AchievementManager.js`: Continue using `id` as the canonical link between state and definition. Include `image` when building unlocked achievement objects for immediate UI use but do not persist it to exported state.
- `AchievementStorage.js`: Keep stored state as `achievements[id] = { isUnlocked, progress, unlockedDate, metadata }`. Strip image paths on export/import.
- `ToastRenderer.js` (canvas toast): Preload and cache image entries for local assets. Maintain a small cache structure that includes `{ img, status }` where `status` is `loading | loaded | error`. Draw image when `status === 'loaded'`, otherwise fallback to emoji. Center image where the emoji used to render.
- Achievements list UI: Use `definition.image` when rendering thumbnails. If image missing or failed, show default placeholder.

**Asset Guidelines**
- Store images under `assets/achievements/`.
- Preferred format: `SVG`. PNG allowed as fallback.
- Recommended art size: 64x64 or 128x128; `ToastRenderer` uses 48x48 display size (adjustable).
- Use trimmed assets (no extra transparent padding) or test visually and tune `iconSize`.

**Storage & Export/Import Rules**
- Exported JSON should only contain state and metadata; do NOT include image paths to avoid mismatches across installations.
- On import, ignore any `image` fields to prevent loading invalid external references.
- The app UI will always resolve image paths by looking up `id` in `ACHIEVEMENT_DEFINITIONS`.

**Files To Change** (implementation checklist)
1. `js/achievements/AchievementDefinitions.js` — add `image` fields and contributor docs.
2. `js/achievements/AchievementManager.js` — include definition image in unlocked objects for UI usage; do not pass image into storage options for export.
3. `js/achievements/AchievementStorage.js` — ensure export/import sanitizes image fields and doesn't persist them.
4. `js/renderers/ToastRenderer.js` — preload local images, add load/error handlers, cache `{img,status}`, draw image centered at emoji coords, fallback to emoji.
5. `js/renderers/AchievementsListRenderer.js` (or equivalent) — display thumbnail from definition.
6. Add sample assets under `assets/achievements/` and update contributor docs.

**Testing Steps**
- Manual:
  1. Start static server and open game.
  2. Trigger a known achievement that has `image` set and verify the toast shows the image (centered) instead of trophy.
  3. Trigger multiple toasts and verify stacking and caching behavior.
  4. Export the achievement state via the app export API and confirm no image paths are present.
  5. Import the exported JSON into a fresh session and ensure achievements restore correctly and images still display (resolved via definitions).
- Edge cases:
  - Missing file: renderer should log warning and show trophy fallback.
  - Corrupt SVG/PNG: renderer `onerror` should mark status `error` and fallback.

**Rollout & Backwards Compat**
- Backward compatible: existing installations without `image` fields continue to work (they show emoji). New installations adding images will automatically display them.
- No migration required because image paths live in code (definitions). If a future feature needs persisting custom user images, add a separate storage strategy then.

**Future improvements**
- Allow contributors to provide multiple sizes or an icon sprite.
- Add a preloading phase at app startup for critical assets.
- Provide a small UI to preview or validate image assets at build/authoring time.

---
Saved plan as `plans/plan-add-customImagesForAchievements.md`. You can edit or expand this later.
