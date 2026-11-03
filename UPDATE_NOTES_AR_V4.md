# FLAME — Gameplay Polish V4

## Changes
- Moved Azure Flame and Protection Ward ability buttons from the top HUD to a fixed lower-right position.
- Azure Flame now activates for 5 seconds, displays its remaining time on the icon, adds a restrained cyan aura, and increases melee damage by 55% while active. Cooldown: 7 seconds.
- Protection Ward now lasts 5 seconds, displays its remaining time on the icon, blocks incoming damage while active, and renders a soft mint protective aura that disappears immediately when the timer expires. Cooldown: 6 seconds.
- Removed the flight-active text banner from the middle of the screen. Flight remains controlled by the existing token mechanic without a central notification.
- Reworked the mountain silhouettes with curved ridgelines, layered rock faces, glacial cuts, and irregular snow caps.
- Added rare distant castles on stages 3, 8, and 16, with warm illuminated windows and subtle moving silhouettes.
- Added flying fire-breathing dragons in the skies of stages 6, 12, and 17.
- Added a rose-pink grassland palette exclusively to stage 12; other stages retain their existing green meadow palette.

## Validation
- All TypeScript and TSX source files passed TypeScript transpilation/syntax parsing.
- A full dependency-backed build could not be run in this environment because `npm install` timed out. The project should be tested in a separate folder before replacing the current working build.
