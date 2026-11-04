/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ar' | 'en';

export type GameState = 
  | 'title'
  | 'playing'
  | 'stage_select'
  | 'paused'
  | 'upgrades'
  | 'customizing_controls'
  | 'game_over'
  | 'victory';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export type EnemyType = 
  | 'crimson_wisp'      // 1. Glowing crimson flame spirit
  | 'pyro_wolf'         // 2. Fiery shadow hound with burning mane
  | 'crimson_wraith'    // 3. Floating scythe wraith in blood fire
  | 'magma_golem'       // 4. Towering molten rock titan
  | 'pyro_serpent'      // 5. Cursed flame slithering serpent
  | 'ignis_knight'      // 6. Armored red flame knight with broadsword
  | 'magma_floater'     // 7. Volcanic exploding spore pod
  | 'pyre_drake'        // 8. Swooping winged fire harpy / drake
  | 'dark_pyromancer'   // 9. Infernal sorcerer casting crimson storms
  | 'abyssal_sovereign'; // 10. Lord Malakar - Colossal Abyssal Titan

export interface PlayerStats {
  maxHp: number;
  hp: number;
  attackPower: number;
  defense: number;
  critChance: number;
  speed: number;
  souls: number; // Legacy save field; displayed and spent as Gems.
  flightLevel: number;
  level: number;
  xp: number;
  nextXp: number;
}

export interface SkillLevels {
  flameSlash: number;         // 3-Hit Azure Blade Combo damage
  fantasticalRecall: number;  // Fantastical Return (العودة الخيالية)
  celestialBeam: number;      // Focused Azure Plasma Beam (شعاع الشعلة السماوي)
  orbitalWisps: number;       // Orbiting flame daggers shield
  flameDash: number;          // Dash speed & i-frames
  parryWard: number;          // Shield parry & soul siphon
  azureNova: number;          // Supernova ultimate
  soulMagnet: number;         // Legacy save compatibility only
  flightDuration: number;     // Flight token duration upgrade
  staminaCapacity: number;    // Maximum stamina pool
  wardDuration: number;       // Protective ward duration
  maxHealth: number;          // Maximum health upgrade
  defense: number;            // Independent armor upgrade
  attackPower: number;        // Independent damage upgrade
}

export interface ControlButtonPosition {
  id: string;
  nameKey: string;
  xPercent: number; // percentage from right edge (or left in lefty mode)
  yPercent: number; // percentage from bottom edge
  size: number;     // px scale (48 to 90)
  opacity: number;  // 0.3 to 1.0
}

export interface TouchControlsLayout {
  joystickSize: number;
  joystickDeadzone: number;
  joystickX: number; // % from left
  joystickY: number; // % from bottom
  buttons: {
    attack: ControlButtonPosition;
    jump: ControlButtonPosition;
    dash: ControlButtonPosition;
    recall: ControlButtonPosition; // Fantastical Return
    beam: ControlButtonPosition;   // Celestial Beam
    ward: ControlButtonPosition;   // Parry Ward
    nova: ControlButtonPosition;   // Supernova
  };
}

export interface GameSettings {
  language: Language;
  graphicsQuality: GraphicsQuality;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  vibration: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  controlsLayout: TouchControlsLayout;
}

export interface StageDefinition {
  id: number;
  nameKey: string;
  descriptionKey: string;
  themeColor: string;
  targetKills: number;
  enemyTypes: EnemyType[];
  bossType?: EnemyType;
  isBossStage: boolean;
  difficultyScale: number; // 1.0 up to 4.5
}

export interface CloudSaveData {
  version: number;
  timestamp: number;
  playerStats: {
    maxHp: number;
    attackPower: number;
    defense: number;
    souls: number;
    flightLevel: number;
    level: number;
    xp: number;
  };
  skillLevels: SkillLevels;
  unlockedStage: number; // 1 to 20
  currentStageIndex?: number; // zero-based resume stage
  completedStages: number[];
  totalEnemiesSlain: number;
  settings: GameSettings;
  cloudSyncId: string;
  flameSkin?: 'azure' | 'solar';
}
