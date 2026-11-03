# FLAME Gameplay Combat & Story Polish V5

## Changes
- Replaced the old player-triggered Azure Flame empowerment with a dedicated directional Azure Flame projectile. It has a short 0.62-second firing cooldown, travels in the hero's facing direction, collides with enemies, deals skill-scaled damage, and uses a layered animated-looking plasma streak with short-lived impact sparks.
- Added a dedicated sword button to the HUD. Sword attacks are now triggered from that button; tapping/swiping the right half of the screen no longer performs sword attacks.
- Removed shield activation from movement gestures. The protective ward is activated only by its shield button; its existing five-second protective aura remains tied to `isParrying` and disappears when the timer ends.
- Kept the stage-by-stage family reunion objective: after the stage's required enemies/boss are defeated, the family sanctuary is revealed; reaching it triggers the reunion and stage victory.
- Improved the aurora into layered translucent curtains, drifting folds, and fine luminous wave crests on the existing aurora stages.
- Changed castle-window silhouettes to a single left-to-right crossing per stage instead of oscillating back and forth.
- Added subtle creature core lighting, armor seams, and extra boss shoulder plating without replacing the existing enemy/boss movement and combat logic.
- Removed duplicated "Stage N: Stage N" wording from the HUD stage label.

## Validation
- All 18 TypeScript/TSX source files passed TypeScript transpilation syntax parsing.
- A full `tsc`/Vite build could not be run because this source archive does not include `node_modules`, and the Vite type definitions/dependencies are not installed in the environment.
- This is not a claim of visual verification on a phone. Please test in a separate copy before replacing the working build.
