# FLAME gameplay update

## Included
- English is now the forced default language, including migrated local saves.
- The visible combat kit is reduced to Azure Flame and Protection Shield. Legacy ability triggers were removed from the active touch gesture flow and keyboard shortcuts.
- Flame and shield are shown as dedicated HUD icons. Their size and visibility/brightness are adjustable in Settings.
- Settings was simplified to Graphics, Audio, and Button customization.
- The pause menu now opens a Gem Store. Flame damage, shield strength/duration, and flight-token duration can be upgraded with gems.
- Gems continue to drop from defeated enemies; completing a stage grants a 100-gem reward.
- Rare flight runes now grant 5 seconds of flight by default. Flight duration can be upgraded. During flight, horizontal and vertical movement input steers the character; the player is no longer forced to fly only forward.
- Stamina cores refill the defensive stamina pool. Stamina is shown in the HUD and is consumed by the Protection Shield.
- Rain is rendered as a viewport-wide weather layer on selected stages.
- Aurora Borealis effects appear on selected stages.
- Mountain silhouettes now use layered irregular ridgelines, shaded rock faces, and occasional snow caps rather than repeated simple triangles.
- Updated the touch tutorial to describe only the retained abilities and collectible flight/stamina systems.

## Validation status
- All TypeScript/TSX source files passed a TypeScript transpilation syntax check.
- A full dependency install and production build could not be completed in this environment: npm registry access timed out and the required packages were not cached locally.
- Therefore this archive is a code update awaiting a full `npm install` / `npm run build` and in-game visual testing on the target phone. It should be tested in a separate folder before replacing the working copy.
