/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundManager } from '../audio/soundManager';
import {
  EnemyType,
  GameSettings,
  PlayerStats,
  SkillLevels,
  StageDefinition,
} from '../types/game';

export interface DamageNumber {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  color: string;
  isCrit?: boolean;
}

export interface Enemy2D {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  attackPower: number;
  speed: number;
  facing: 1 | -1;
  state: 'chase' | 'windup' | 'attack' | 'stagger' | 'dead';
  windupTimer: number;
  attackCooldown: number;
  attackRange: number;
  animTimer: number;
  flashTimer: number;
  isBoss?: boolean;
}

export interface Projectile2D {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  previousX?: number;
  previousY?: number;
  isEnemy?: boolean;
  color: string;
}

export interface SoulMote2D {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
}

export interface Particle2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'heart' | 'ring';
}

export interface Platform2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Collectible Road Tokens: Horizontal Flight Token & Stamina/Vitality Token */
export interface WorldToken2D {
  id: number;
  type: 'flight' | 'stamina';
  x: number;
  y: number;
  baseY: number;
  floatTimer: number;
  active: boolean;
}

/** Eerie distant celestial wolf eyes in the low mist */
export interface LowWolfEyes {
  id: number;
  normX: number;
  yOffset: number; // Low offset just above ground (not in sky!)
  size: number;
  gap: number;
  state: 'dormant' | 'fade_in' | 'glowing' | 'fade_out';
  alpha: number;
  timer: number;
  waitTimer: number;
}

/** Shooting stars and meteors streaking across the cosmic night sky */
export interface Meteor2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  color: string;
  life: number;
  maxLife: number;
}

export class GameEngine2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId = 0;
  private isRunning = true;
  private isPaused = true;
  private victoryTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastTime = 0;

  // Camera viewport & Cinematic Zoom
  public cameraX = 0;
  public cameraY = 0;
  public cameraZoom = 1.0;
  public targetCameraZoom = 1.0;

  // Hero state (Living Blue Flame)
  public x = 200;
  public y = 460;
  public vx = 0;
  public vy = 0;
  public width = 44;
  public height = 60;
  public isGrounded = false;
  public facing: 1 | -1 = 1;
  public flameTimer = 0;
  private stageSceneTimer = 0;

  // TOKEN-ACTIVATED FLIGHT MODE (two-axis player-controlled flight)
  public flightDuration = 0;
  public stamina = 100;
  public readonly maxStamina = 100;
  public isHorizontalFlightActive = false;
  private flightRamCooldown = 0;

  // Pitch Black Solid Continuous Ground Level (Player NEVER falls)
  public groundY = 530;

  // Night-meadow route: rolling grassy ridges with a continuous safe floor.
  private terrainHeightAt(worldX: number): number {
    // Very gentle, long rolling grade: readable as terrain, never enough to disrupt combat.
    return this.groundY + Math.sin(worldX * 0.0017) * 2.4 + Math.sin(worldX * 0.0041 + 1.2) * 1.15;
  }

  private isSinkholeAt(_worldX: number): boolean { return false; }


  /** Four visual acts, each with its own atmosphere and silhouette language. */
  private getActPalette() {
    const act = Math.floor(this.currentStageIndex / 5);
    const palettes = [
      { top: '#050b1b', mid: '#102b4a', low: '#24445b', haze: 'rgba(56,189,248,.12)', moon: '#c9e5f5', ridge: '#101d32', accent: '#38bdf8' },
      { top: '#160b22', mid: '#45213b', low: '#8a4b48', haze: 'rgba(251,146,60,.14)', moon: '#ffe1bd', ridge: '#28152b', accent: '#fb923c' },
      { top: '#080d20', mid: '#24205a', low: '#51406f', haze: 'rgba(167,139,250,.16)', moon: '#ded5ff', ridge: '#17152f', accent: '#a78bfa' },
      { top: '#10050f', mid: '#421327', low: '#771f2e', haze: 'rgba(244,63,94,.16)', moon: '#ffd4d9', ridge: '#220d1c', accent: '#fb7185' },
    ];
    return palettes[Math.min(3, act)];
  }

  // The Flame Family Sanctuary at the END of the road
  public familyAltarX = 7600;
  public isReunited = false;
  public reunionTimer = 0;
  public isBattleCleared = false; // Family ONLY appears after battle is cleared

  // Low Misty Wolf Eyes (Lowered near ground level, not in the sky!)
  public lowEyes: LowWolfEyes[] = [];

  // Active Celestial Meteors & Shooting Stars
  public meteors: Meteor2D[] = [];
  private meteorSpawnTimer = 1.8;

  // Distant ravens crossing the moon at irregular intervals.
  private crows: Array<{ x: number; y: number; speed: number; scale: number; phase: number; direction: 1 | -1 }> = [];
  private crowSpawnTimer = 14 + Math.random() * 12;
  private lastThunderCycle = -1;

  // Collectible Tokens in the World
  public worldTokens: WorldToken2D[] = [];

  // Fantastical Recall Beacon (العودة الخيالية)
  public recallBeacon: { x: number; y: number; life: number; active: boolean } | null = null;
  public recallCooldown = 0;

  // Celestial Beam Attack
  public isBeaming = false;
  public beamTimer = 0;
  public beamCooldown = 0;
  // Player-triggered Azure Flame empowerment (five-second active window).
  public azureFlameTimer = 0;
  public azureFlameCooldown = 0;

  // Parry Ward
  public isParrying = false;
  public parryTimer = 0;
  public parryCooldown = 0;

  // Dash & Skills
  public isDashing = false;
  public dashTimer = 0;
  public dashCooldown = 0;
  public novaCooldown = 0;
  public novaEnergy = 100;
  private orbitalWispCooldown = 0;

  // 3-Hit Combo Slash
  public isSlashing = false;
  public slashStep = 0;
  public activeSlashStep = 0;
  public slashTimer = 0;
  public slashCooldownTimer = 0;
  public slashDirection: 'horizontal' | 'rising' | 'descending' = 'horizontal';
  public comboStreak = 0;
  public comboResetTimer = 0;

  // Screen Feel
  private screenShakeAmount = 0;
  private hitstopTimer = 0;

  // Entities & World
  public platforms: Platform2D[] = [];
  public enemies: Enemy2D[] = [];
  public projectiles: Projectile2D[] = [];
  public soulMotes: SoulMote2D[] = [];
  public particles: Particle2D[] = [];
  private nextEntityId = 1;

  // Stages & Progress (20 Stages)
  public currentStageIndex = 0;
  public flameSkin: 'azure' | 'solar' = 'azure';
  public enemiesKilledInStage = 0;
  public isStageComplete = false;
  public isBossSpawned = false;
  private spawnTimer = 0;

  // Controls input
  public moveInput = { x: 0, y: 0 };
  private keysPressed: Record<string, boolean> = {};

  // External sync callbacks
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onCooldownsUpdate?: (cooldowns: {
    dash: number;
    beam: number;
    ward: number;
    nova: number;
    recall: number;
    recallActive: boolean;
    novaEnergy: number;
    comboStreak: number;
    flightTime: number;
    stamina: number;
    flameTime: number;
    wardTime: number;
  }) => void;
  public onDamageNumber?: (dmg: DamageNumber) => void;
  public onStageProgress?: (killed: number, target: number, wave: number) => void;
  public onGameOver?: () => void;
  public onVictory?: () => void;

  public stats: PlayerStats = {
    maxHp: 100,
    hp: 100,
    attackPower: 30,
    defense: 6,
    critChance: 0.15,
    speed: 460,
    souls: 0,
    flightLevel: 1,
    level: 1,
    xp: 0,
    nextXp: 100,
  };

  public skills: SkillLevels = {
    flameSlash: 1,
    fantasticalRecall: 1,
    celestialBeam: 1,
    orbitalWisps: 1,
    flameDash: 1,
    parryWard: 1,
    azureNova: 1,
    soulMagnet: 1,
    flightDuration: 1,
  };

  // 20 Progressive Stages
  // 20-stage journey in four escalating acts. Every fifth stage is a named boss gate.
  public stages: StageDefinition[] = [
    { id: 1, nameKey: 'stage_1', descriptionKey: 'stage_1_desc', themeColor: '#0ea5e9', targetKills: 8, enemyTypes: ['crimson_wisp'], bossType: 'crimson_wisp', isBossStage: true, difficultyScale: 1.0 },
    { id: 2, nameKey: 'stage_2', descriptionKey: 'stage_2_desc', themeColor: '#38bdf8', targetKills: 10, enemyTypes: ['crimson_wisp', 'pyro_wolf'], bossType: 'pyro_wolf', isBossStage: true, difficultyScale: 1.12 },
    { id: 3, nameKey: 'stage_3', descriptionKey: 'stage_3_desc', themeColor: '#818cf8', targetKills: 11, enemyTypes: ['crimson_wisp', 'crimson_wraith', 'magma_floater'], bossType: 'crimson_wraith', isBossStage: true, difficultyScale: 1.25 },
    { id: 4, nameKey: 'stage_4', descriptionKey: 'stage_4_desc', themeColor: '#a855f7', targetKills: 12, enemyTypes: ['crimson_wraith', 'magma_floater', 'pyro_wolf'], bossType: 'magma_floater', isBossStage: true, difficultyScale: 1.38 },
    { id: 5, nameKey: 'stage_5', descriptionKey: 'stage_5_desc', themeColor: '#ef4444', targetKills: 14, enemyTypes: ['pyro_wolf', 'crimson_wraith', 'ignis_knight'], bossType: 'ignis_knight', isBossStage: true, difficultyScale: 1.52 },
    { id: 6, nameKey: 'stage_6', descriptionKey: 'stage_6_desc', themeColor: '#f97316', targetKills: 14, enemyTypes: ['magma_floater', 'magma_golem', 'crimson_wisp'], bossType: 'magma_golem', isBossStage: true, difficultyScale: 1.66 },
    { id: 7, nameKey: 'stage_7', descriptionKey: 'stage_7_desc', themeColor: '#eab308', targetKills: 15, enemyTypes: ['pyro_serpent', 'magma_floater'], bossType: 'pyro_serpent', isBossStage: true, difficultyScale: 1.8 },
    { id: 8, nameKey: 'stage_8', descriptionKey: 'stage_8_desc', themeColor: '#06b6d4', targetKills: 16, enemyTypes: ['pyro_serpent', 'crimson_wraith', 'pyre_drake'], bossType: 'pyre_drake', isBossStage: true, difficultyScale: 1.95 },
    { id: 9, nameKey: 'stage_9', descriptionKey: 'stage_9_desc', themeColor: '#6366f1', targetKills: 17, enemyTypes: ['ignis_knight', 'pyro_wolf', 'dark_pyromancer'], bossType: 'dark_pyromancer', isBossStage: true, difficultyScale: 2.1 },
    { id: 10, nameKey: 'stage_10', descriptionKey: 'stage_10_desc', themeColor: '#dc2626', targetKills: 18, enemyTypes: ['ignis_knight', 'magma_golem', 'pyre_drake'], bossType: 'magma_golem', isBossStage: true, difficultyScale: 2.28 },
    { id: 11, nameKey: 'stage_11', descriptionKey: 'stage_11_desc', themeColor: '#fb923c', targetKills: 18, enemyTypes: ['pyre_drake', 'crimson_wisp', 'pyro_serpent'], bossType: 'pyro_serpent', isBossStage: true, difficultyScale: 2.42 },
    { id: 12, nameKey: 'stage_12', descriptionKey: 'stage_12_desc', themeColor: '#f43f5e', targetKills: 19, enemyTypes: ['pyre_drake', 'pyro_serpent', 'crimson_wraith'], bossType: 'crimson_wraith', isBossStage: true, difficultyScale: 2.58 },
    { id: 13, nameKey: 'stage_13', descriptionKey: 'stage_13_desc', themeColor: '#ea580c', targetKills: 20, enemyTypes: ['magma_golem', 'magma_floater', 'dark_pyromancer'], bossType: 'magma_golem', isBossStage: true, difficultyScale: 2.74 },
    { id: 14, nameKey: 'stage_14', descriptionKey: 'stage_14_desc', themeColor: '#9333ea', targetKills: 21, enemyTypes: ['dark_pyromancer', 'ignis_knight', 'pyre_drake'], bossType: 'dark_pyromancer', isBossStage: true, difficultyScale: 2.9 },
    { id: 15, nameKey: 'stage_15', descriptionKey: 'stage_15_desc', themeColor: '#b91c1c', targetKills: 22, enemyTypes: ['pyro_serpent', 'dark_pyromancer', 'magma_golem'], bossType: 'dark_pyromancer', isBossStage: true, difficultyScale: 3.08 },
    { id: 16, nameKey: 'stage_16', descriptionKey: 'stage_16_desc', themeColor: '#4f46e5', targetKills: 22, enemyTypes: ['ignis_knight', 'pyre_drake', 'dark_pyromancer'], bossType: 'ignis_knight', isBossStage: true, difficultyScale: 3.24 },
    { id: 17, nameKey: 'stage_17', descriptionKey: 'stage_17_desc', themeColor: '#7c3aed', targetKills: 23, enemyTypes: ['magma_golem', 'ignis_knight', 'dark_pyromancer'], bossType: 'magma_golem', isBossStage: true, difficultyScale: 3.42 },
    { id: 18, nameKey: 'stage_18', descriptionKey: 'stage_18_desc', themeColor: '#c026d3', targetKills: 24, enemyTypes: ['pyre_drake', 'dark_pyromancer', 'magma_floater'], bossType: 'pyre_drake', isBossStage: true, difficultyScale: 3.62 },
    { id: 19, nameKey: 'stage_19', descriptionKey: 'stage_19_desc', themeColor: '#e11d48', targetKills: 25, enemyTypes: ['ignis_knight', 'magma_golem', 'dark_pyromancer', 'pyre_drake'], bossType: 'dark_pyromancer', isBossStage: true, difficultyScale: 3.84 },
    { id: 20, nameKey: 'stage_20', descriptionKey: 'stage_20_desc', themeColor: '#7f1d1d', targetKills: 26, enemyTypes: ['ignis_knight', 'dark_pyromancer', 'pyre_drake'], bossType: 'abyssal_sovereign', isBossStage: true, difficultyScale: 4.1 },
  ];

  public settings: GameSettings;

  constructor(canvas: HTMLCanvasElement, initialSettings: GameSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.settings = initialSettings;

    this.onResize();
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.canvas);
    }

    this.setupElevatedPlatforms();
    this.setupLowMistyEyes();
    this.setupKeyboardInput();

    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private get viewportWidth(): number {
    return Math.max(1, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width || 1);
  }

  private get viewportHeight(): number {
    return Math.max(1, this.canvas.clientHeight || this.canvas.getBoundingClientRect().height || 1);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    this.lastTime = performance.now();
  }

  private onResize = () => {
    if (!this.canvas || !this.ctx) return;
    // Use the canvas' actual CSS box, not the browser's layout viewport. On
    // mobile browsers these can differ while the address/navigation bars move.
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings.graphicsQuality === 'ultra' ? 1.5 : 1.25);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    // setTransform is supported more broadly than resetTransform in older WebViews.
    if (typeof this.ctx.setTransform === 'function') this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    else { this.ctx.resetTransform?.(); this.ctx.scale(dpr, dpr); }
  };

  public applyGraphicsQuality(quality: GameSettings['graphicsQuality']) {
    this.settings.graphicsQuality = quality;
    this.onResize();
  }

  private setupElevatedPlatforms() {
    this.platforms = [];
    for (let i = 0; i < 40; i++) {
      this.platforms.push({
        x: 480 + i * 440,
        y: 370 - (i % 3) * 65,
        width: 175,
        height: 22,
      });
    }
  }

  /**
   * Place collectible flight tokens & stamina tokens along the road & platforms
   */
  private setupWorldTokens() {
    this.worldTokens = [];
    // Place tokens every 600px along the forward path
    for (let i = 0; i < 18; i++) {
      const isFlight = i % 3 === 0;
      const x = 900 + i * 720 + Math.random() * 180;
      // Alternate between ground height and elevated platform height
      const onPlatform = i % 3 === 1;
      const inSky = i % 7 === 4;
      const y = inSky ? 205 + (i % 3) * 34 : onPlatform ? 330 : this.groundY - 35;

      this.worldTokens.push({
        id: i + 1,
        type: isFlight ? 'flight' : 'stamina',
        x,
        y,
        baseY: y,
        floatTimer: Math.random() * Math.PI * 2,
        active: true,
      });
    }
  }

  /**
   * Wolf eyes lowered near ground level in the low dark mist (NOT in the sky!)
   */
  private setupLowMistyEyes() {
    this.lowEyes = [];
    for (let i = 0; i < 28; i++) {
      this.lowEyes.push({
        id: i,
        normX: 300 + i * 260 + Math.random() * 80,
        yOffset: 30 + (i % 3) * 22, // 30 to 74 px above ground, in the low mist!
        size: 2.0,
        gap: 11 + (i % 3) * 2,
        state: 'dormant',
        alpha: 0,
        timer: 0,
        waitTimer: 2.0 + Math.random() * 6,
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isPaused) return;
    this.keysPressed[e.code] = true;

    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      this.jump();
    }
    if (e.code === 'KeyJ') this.performAttack();
    if (e.code === 'KeyI') this.performParryWard();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  private handleWindowBlur = () => {
    this.keysPressed = {};
    this.moveInput = { x: 0, y: 0 };
  };

  private handleVisibilityChange = () => {
    // Do not overwrite the user's pause state; the tick loop skips simulation
    // while hidden and resumes naturally when the page becomes visible again.
    this.handleWindowBlur();
    this.lastTime = performance.now();
  };

  private setupKeyboardInput() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // ==========================================
  // MOVEMENT & COMBAT ARTS
  // ==========================================

  public jump() {
    if (this.isGrounded && this.stats.hp > 0 && !this.isReunited && !this.isHorizontalFlightActive) {
      this.vy = -720;
      this.isGrounded = false;
      soundManager.playSlash(0);

      // Jump burst embers
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 18,
          y: this.y + this.height / 2,
          vx: (Math.random() - 0.5) * 120,
          vy: 60 + Math.random() * 80,
          size: 4 + Math.random() * 4,
          color: '#38bdf8',
          alpha: 0.95,
          life: 0.35,
          maxLife: 0.35,
        });
      }
    }
  }

  public performAttack(direction: 'horizontal' | 'rising' | 'descending' = 'horizontal') {
    if (this.slashCooldownTimer > 0 || this.stats.hp <= 0 || this.isReunited) return;

    this.isSlashing = true;
    this.slashTimer = 0.25;
    this.slashCooldownTimer = 0.19;
    this.slashDirection = direction;
    this.comboResetTimer = 1.0;

    const step = this.slashStep;
    this.activeSlashStep = step;
    this.slashStep = (this.slashStep + 1) % 3;

    const isHeavy = step === 2;
    const baseDmg = this.stats.attackPower * (1 + (this.skills.flameSlash - 1) * 0.22) * (this.azureFlameTimer > 0 ? 1.55 : 1);
    const comboMult = step === 0 ? 1.0 : step === 1 ? 1.4 : 2.4;

    soundManager.playSlash(step);
    this.vx += this.facing * (isHeavy ? 300 : 190);

    // A generous forward arc lets the sword connect while the hero is running,
    // jumping or standing; the attack never requires movement to stop.
    const hitWidth = isHeavy ? 190 : 158;
    const hitHeight = direction === 'horizontal' ? 124 : 150;
    const hitX = this.facing === 1 ? this.x + 10 : this.x - hitWidth - 10;
    const hitY = this.y + (direction === 'rising' ? -118 : direction === 'descending' ? -22 : -hitHeight / 2);

    let hitCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      if (
        hitX < enemy.x + enemy.width &&
        hitX + hitWidth > enemy.x &&
        hitY < enemy.y + enemy.height &&
        hitY + hitHeight > enemy.y
      ) {
        hitCount++;
        const isCrit = Math.random() < this.stats.critChance;
        const finalDmg = Math.round(baseDmg * comboMult * (isCrit ? 1.85 : 1));
        this.damageEnemy(enemy, finalDmg, isCrit, isHeavy);

        enemy.vx = this.facing * (isHeavy ? 450 : 240);
        enemy.vy = -200;
      }
    }

    if (hitCount > 0) {
      this.comboStreak++;
      this.novaEnergy = Math.min(100, this.novaEnergy + (isHeavy ? 20 : 10));
      if (isHeavy) {
        this.hitstopTimer = 0.07;
        this.addScreenShake(14);
      } else {
        this.addScreenShake(5);
      }
    }

    for (let i = 0; i < (isHeavy ? 18 : 9); i++) {
      const angle = (Math.random() - 0.5) * 1.3 + (this.facing === 1 ? 0 : Math.PI);
      const speed = 180 + Math.random() * 260;
      this.particles.push({
        x: this.x + this.facing * 35,
        y: this.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color: isHeavy ? '#00f0ff' : '#7dd3fc',
        alpha: 0.95,
        life: 0.24,
        maxLife: 0.24,
        shape: 'spark',
      });
    }
  }

  public performDash() {
    if (this.dashCooldown > 0 || this.isDashing || this.stats.hp <= 0 || this.isReunited) return;

    const cdReduction = (this.skills.flameDash - 1) * 0.35;
    this.dashCooldown = Math.max(0.8, 2.0 - cdReduction);
    this.isDashing = true;
    this.dashTimer = 0.24;
    this.vx = this.facing * 920;
    this.vy = 0;

    soundManager.playDash();

    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 30,
        y: this.y + (Math.random() - 0.5) * 30,
        vx: -this.facing * (120 + Math.random() * 220),
        vy: (Math.random() - 0.5) * 80,
        size: 7 + Math.random() * 7,
        color: '#00f0ff',
        alpha: 0.9,
        life: 0.38,
        maxLife: 0.38,
      });
    }
  }

  public performFantasticalRecall() {
    if (this.stats.hp <= 0 || this.isReunited) return;

    if (!this.recallBeacon || !this.recallBeacon.active) {
      const beaconDist = 520 + (this.skills.fantasticalRecall - 1) * 90;
      const targetX = this.x + this.facing * beaconDist;
      this.recallBeacon = {
        x: targetX,
        y: this.y,
        life: 9.0,
        active: true,
      };

      soundManager.playBlast();
      this.addScreenShake(5);

      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: targetX,
          y: this.y,
          vx: Math.cos(ang) * 200,
          vy: Math.sin(ang) * 200,
          size: 5 + Math.random() * 6,
          color: '#38bdf8',
          alpha: 1,
          life: 0.45,
          maxLife: 0.45,
        });
      }
    } else {
      const startX = this.x;
      const startY = this.y;
      const endX = this.recallBeacon.x;
      const endY = this.recallBeacon.y;

      soundManager.playNova();
      this.addScreenShake(22);
      this.hitstopTimer = 0.08;

      this.x = endX;
      this.y = endY;
      this.vx = 0;
      this.vy = -140;
      this.recallBeacon.active = false;
      this.recallCooldown = Math.max(2.2, 5.5 - (this.skills.fantasticalRecall - 1) * 0.7);

      const recallDmg = Math.round(
        this.stats.attackPower * (3.4 + (this.skills.fantasticalRecall - 1) * 0.9)
      );

      const minX = Math.min(startX, endX) - 60;
      const maxX = Math.max(startX, endX) + 60;

      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        if (enemy.x >= minX && enemy.x <= maxX && Math.abs(enemy.y - endY) < 180) {
          this.damageEnemy(enemy, recallDmg, true, true);
          enemy.vy = -380;
          enemy.vx = (enemy.x > startX ? 1 : -1) * 400;
        }
      }

      for (let s = 0; s < 36; s++) {
        const t = s / 36;
        const px = startX + (endX - startX) * t;
        const py = startY + (endY - startY) * t;
        this.particles.push({
          x: px,
          y: py + (Math.random() - 0.5) * 35,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          size: 8 + Math.random() * 9,
          color: '#00f0ff',
          alpha: 1,
          life: 0.5,
          maxLife: 0.5,
        });
      }
    }
  }

  public performCelestialBeam() {
    if (this.beamCooldown > 0 || this.isBeaming || this.stats.hp <= 0 || this.isReunited) return;

    this.isBeaming = true;
    this.beamTimer = 0.45;
    this.beamCooldown = Math.max(2.5, 6.0 - (this.skills.celestialBeam - 1) * 0.7);

    soundManager.playCelestialBeam();
    this.addScreenShake(10);

    const beamDmg = Math.round(this.stats.attackPower * (2.8 + (this.skills.celestialBeam - 1) * 0.8));
    const beamLength = 700;
    const beamMinX = this.facing === 1 ? this.x : this.x - beamLength;
    const beamMaxX = this.facing === 1 ? this.x + beamLength : this.x;

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      if (enemy.x >= beamMinX && enemy.x <= beamMaxX && Math.abs(enemy.y - this.y) < 70) {
        this.damageEnemy(enemy, beamDmg, true, true);
        enemy.vx = this.facing * 500;
      }
    }
  }

  /** Fires a directed azure plasma bolt; the shield remains a separate defensive skill. */
  public activateAzureFlame() {
    if (this.azureFlameCooldown > 0 || this.stats.hp <= 0 || this.isReunited) return;
    this.azureFlameCooldown = 0.62;
    const direction = this.facing || 1;
    const originX = this.x + direction * 30;
    const originY = this.y - 8;
    this.projectiles.push({
      id: this.nextEntityId++,
      x: originX, y: originY, previousX: originX, previousY: originY,
      vx: direction * 760, vy: this.isHorizontalFlightActive ? this.moveInput.y * 120 : 0,
      radius: 18, damage: Math.max(22, Math.round(this.stats.attackPower * 1.85)),
      life: 1.35, color: '#38e8ff',
    });
    soundManager.playBlast();
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: originX, y: originY,
        vx: direction * (35 + Math.random() * 125),
        vy: (Math.random() - 0.5) * 90,
        size: 2 + Math.random() * 4,
        color: i % 3 ? '#22d3ee' : '#ffffff',
        alpha: 0.95, life: 0.28, maxLife: 0.28, shape: 'spark',
      });
    }
  }

  public performParryWard() {
    if (this.parryCooldown > 0 || this.isParrying || this.stats.hp <= 0 || this.isReunited || this.stamina < 25) return;
    this.stamina = Math.max(0, this.stamina - 25);
    this.isParrying = true;
    this.parryTimer = 5;
    this.parryCooldown = 6;
    soundManager.playBlast();
  }

  public performNova() {
    if (this.novaEnergy < 100 || this.novaCooldown > 0 || this.stats.hp <= 0 || this.isReunited) return;

    this.novaEnergy = 0;
    this.novaCooldown = 10.0;
    soundManager.playNova();
    this.addScreenShake(24);
    this.hitstopTimer = 0.08;

    const novaRadius = 450 + (this.skills.azureNova - 1) * 70;
    const novaDmg = Math.round(this.stats.attackPower * (4.2 + (this.skills.azureNova - 1) * 0.9));

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= novaRadius) {
        this.damageEnemy(enemy, novaDmg, true, true);
        const ang = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx = Math.cos(ang) * 600;
        enemy.vy = Math.sin(ang) * 500;
      }
    }

    for (let i = 0; i < 70; i++) {
      const ang = (i / 70) * Math.PI * 2;
      const spd = 380 + Math.random() * 240;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 7 + Math.random() * 8,
        color: '#00f0ff',
        alpha: 1,
        life: 0.65,
        maxLife: 0.65,
      });
    }
  }

  public damageEnemy(enemy: Enemy2D, amount: number, isCrit = false, isHeavy = false) {
    enemy.hp -= amount;
    enemy.state = 'stagger';
    enemy.windupTimer = 0.35;
    enemy.flashTimer = 0.14;

    soundManager.playHitImpact();

    if (this.onDamageNumber && this.settings.damageNumbers) {
      const screenX = enemy.x - this.cameraX;
      const screenY = enemy.y - this.cameraY - 45;
      this.onDamageNumber({
        id: Math.random(),
        text: isCrit ? `${amount}!` : `${amount}`,
        x: screenX,
        y: screenY,
        opacity: 1,
        color: isCrit ? '#f59e0b' : '#38bdf8',
        isCrit,
      });
    }

    // Glowing flame sparks from enemy hit
    for (let i = 0; i < (isHeavy ? 14 : 7); i++) {
      this.particles.push({
        x: enemy.x + (Math.random() - 0.5) * enemy.width,
        y: enemy.y + (Math.random() - 0.5) * enemy.height,
        vx: (Math.random() - 0.5) * 200,
        vy: -70 - Math.random() * 150,
        size: 5 + Math.random() * 6,
        color: '#ef4444',
        alpha: 0.9,
        life: 0.35,
        maxLife: 0.35,
      });
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy2D) {
    enemy.state = 'dead';
    soundManager.playEnemyDeath();

    const soulBonus = 1;
    const soulValue = Math.round((enemy.isBoss ? 150 : enemy.type === 'magma_golem' ? 45 : 12) * soulBonus);

    this.soulMotes.push({
      id: Math.random(),
      x: enemy.x,
      y: enemy.y,
      vx: (Math.random() - 0.5) * 120,
      vy: -180 - Math.random() * 120,
      value: soulValue,
    });

    this.enemiesKilledInStage++;
    const stage = this.stages[this.currentStageIndex];
    if (this.onStageProgress) {
      this.onStageProgress(this.enemiesKilledInStage, stage.targetKills, 1);
    }

    // On boss stages, the boss itself is mandatory: ordinary enemies cannot
    // accidentally complete the stage while the boss transition is pending.
    if (stage.isBossStage && !enemy.isBoss && !this.isBossSpawned && this.enemiesKilledInStage >= stage.targetKills - 1) {
      // Close the regular wave cleanly; the boss becomes the final required kill.
      for (const remaining of this.enemies) {
        if (remaining !== enemy && !remaining.isBoss && remaining.state !== 'dead') {
          remaining.state = 'dead';
          remaining.vx = 0;
          remaining.vy = 0;
        }
      }
    }

    // Check if stage battle requirements are met.
    const stageRequirementMet = stage.isBossStage
      ? enemy.isBoss === true && this.isBossSpawned
      : this.enemiesKilledInStage >= stage.targetKills;
    if (stageRequirementMet && !this.isBattleCleared) {
      this.isBattleCleared = true;

      // Reveal the family altar at the end of the road!
      this.familyAltarX = this.x + 1650;
      soundManager.playFamilyRevealChime();

      // All active enemies vaporize into cinders
      for (const e of this.enemies) {
        if (e.state !== 'dead') {
          e.state = 'dead';
          for (let p = 0; p < 12; p++) {
            this.particles.push({
              x: e.x + (Math.random() - 0.5) * 30,
              y: e.y + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 80,
              vy: -100 - Math.random() * 80,
              size: 4 + Math.random() * 4,
              color: '#ef4444',
              alpha: 0.8,
              life: 0.4,
              maxLife: 0.4,
            });
          }
        }
      }
      this.enemies = [];
    }
  }

  public damagePlayer(amount: number) {
    if (this.isParrying) {
      soundManager.playParrySuccess();
      this.addScreenShake(12);

      const siphonHeal = 15 + (this.skills.parryWard - 1) * 5;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + siphonHeal);
      this.novaEnergy = Math.min(100, this.novaEnergy + 30);

      for (const e of this.enemies) {
        if (Math.hypot(e.x - this.x, e.y - this.y) < 220) {
          e.state = 'stagger';
          e.windupTimer = 1.0;
          e.vx = (e.x > this.x ? 1 : -1) * 350;
        }
      }

      if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats });
      return;
    }

    if (this.isDashing || this.stats.hp <= 0 || this.isReunited) return;

    const actualDmg = Math.max(1, amount - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - actualDmg);
    this.addScreenShake(14);
    soundManager.playHitImpact();
    soundManager.triggerHaptics([40, 30, 50]);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }

    if (this.stats.hp <= 0) {
      soundManager.playGameOver();
      if (this.onGameOver) this.onGameOver();
    }
  }

  public addScreenShake(amt: number) {
    if (!this.settings.screenShake) return;
    this.screenShakeAmount = Math.min(30, this.screenShakeAmount + amt);
  }

  // ==========================================
  // SPAWNING SYSTEM
  // ==========================================

  private updateSpawning(dt: number) {
    if (this.isBattleCleared || this.isReunited) return;

    const stage = this.stages[this.currentStageIndex];
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'dead');

    // Boss stages have a clean two-part encounter: finish the regular wave,
    // then spawn exactly one boss as the final required kill.
    if (stage.isBossStage) {
      if (this.isBossSpawned) return; // Never resume regular spawns while the boss is alive.
      if (this.enemiesKilledInStage >= stage.targetKills - 1) {
        if (aliveEnemies.length === 0) this.spawnBoss(stage.bossType || 'pyro_wolf');
        return; // Freeze the regular wave once its quota is reached.
      }
    } else if (this.enemiesKilledInStage >= stage.targetKills) {
      return;
    }

    this.spawnTimer -= dt;

    const maxAlive = stage.isBossStage ? 6 : 7;
    if (this.spawnTimer <= 0 && aliveEnemies.length < maxAlive) {
      this.spawnTimer = Math.max(1.5, 3.2 - this.currentStageIndex * 0.08);
      this.spawnRandomEnemy(stage);
    }
  }

  private spawnRandomEnemy(stage: StageDefinition) {
    const types = stage.enemyTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const side = Math.random() < 0.35 ? -1 : 1;
    let spawnX = this.x + (side === 1 ? 1 : -1) * (580 + Math.random() * 260);

    const spawnY = this.terrainHeightAt(spawnX) - 30;
    const diff = stage.difficultyScale;
    let width = 50;
    let height = 50;
    let hp = Math.round(40 * diff);
    let attackPower = Math.round(12 * diff);
    let speed = 200;
    let attackRange = 75;

    switch (type) {
      case 'crimson_wisp':
        width = 44; height = 44; hp = Math.round(35 * diff); speed = 250; attackRange = 60;
        break;
      case 'pyro_wolf':
        width = 65; height = 45; hp = Math.round(55 * diff); speed = 240; attackRange = 90;
        break;
      case 'crimson_wraith':
        width = 52; height = 70; hp = Math.round(45 * diff); speed = 180; attackRange = 400;
        break;
      case 'magma_golem':
        width = 95; height = 105; hp = Math.round(160 * diff); speed = 120; attackRange = 120; attackPower = Math.round(24 * diff);
        break;
      case 'pyro_serpent':
        width = 80; height = 55; hp = Math.round(65 * diff); speed = 190; attackRange = 360;
        break;
      case 'ignis_knight':
        width = 60; height = 80; hp = Math.round(85 * diff); speed = 190; attackRange = 95; attackPower = Math.round(18 * diff);
        break;
      case 'magma_floater':
        width = 48; height = 48; hp = Math.round(40 * diff); speed = 160; attackRange = 300;
        break;
      case 'pyre_drake':
        width = 75; height = 65; hp = Math.round(70 * diff); speed = 230; attackRange = 140;
        break;
      case 'dark_pyromancer':
        width = 55; height = 80; hp = Math.round(80 * diff); speed = 160; attackRange = 450; attackPower = Math.round(22 * diff);
        break;
      case 'abyssal_sovereign':
        width = 140; height = 160; hp = Math.round(800 * diff); speed = 170; attackRange = 160; attackPower = Math.round(36 * diff);
        break;
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      width,
      height,
      hp,
      maxHp: hp,
      attackPower,
      speed,
      facing: side === 1 ? -1 : 1,
      state: 'chase',
      windupTimer: 0,
      attackCooldown: 1.5,
      attackRange,
      animTimer: 0,
      flashTimer: 0,
    });
  }

  private spawnBoss(bossType: EnemyType) {
    this.isBossSpawned = true;
    soundManager.playNova();
    this.addScreenShake(22);

    const spawnX = this.x + 680;
    const diff = this.stages[this.currentStageIndex].difficultyScale;
    let width = 120;
    let height = 140;
    // Every stage now has a boss, so its stats scale steadily instead of using
    // the old occasional-boss values that would overwhelm early-stage players.
    let hp = Math.round(260 * diff);
    let attackPower = Math.round(17 * diff);

    if (bossType === 'abyssal_sovereign') {
      width = 160;
      height = 180;
      hp = Math.round(520 * diff);
      attackPower = Math.round(25 * diff);
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type: bossType,
      x: spawnX,
      y: this.terrainHeightAt(spawnX) - height / 2,
      vx: 0,
      vy: 0,
      width,
      height,
      hp,
      maxHp: hp,
      attackPower,
      speed: 160,
      facing: -1,
      state: 'chase',
      windupTimer: 0,
      attackCooldown: 2.0,
      attackRange: 160,
      animTimer: 0,
      flashTimer: 0,
      isBoss: true,
    });
  }

  // ==========================================
  // MAIN TICK LOOP
  // ==========================================

  private tick(now: number) {
    if (!this.isRunning) return;

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0), 1 / 30);

    try {
      if (!this.isPaused && !document.hidden) {
        if (this.hitstopTimer > 0) this.hitstopTimer -= dt;
        else this.update(dt);
      }
    } catch (error) {
      // Keep the render loop alive on mobile WebViews instead of leaving the
      // opaque canvas at its default black when a gameplay update hits an error.
      console.error('[FLAME] gameplay update failed:', error);
    }

    try {
      this.render();
    } catch (error) {
      console.error('[FLAME] scene render failed:', error);
      this.renderEmergencyFrame();
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private renderEmergencyFrame() {
    const ctx = this.ctx;
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    try {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dprX = this.canvas.width / width;
      const dprY = this.canvas.height / height;
      ctx.scale(dprX, dprY);
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#050b18'); sky.addColorStop(0.65, '#102a35'); sky.addColorStop(1, '#07120c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      // Always show a readable horizon and the player if a complex effect fails.
      const floor = height * 0.77;
      ctx.fillStyle = '#10251a'; ctx.fillRect(0, floor, width, height - floor);
      ctx.strokeStyle = '#547b55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, floor); ctx.lineTo(width, floor); ctx.stroke();
      const px = Math.max(40, Math.min(width - 40, width * 0.22));
      ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 22; ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.ellipse(px, floor - 28, 15, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#e0faff'; ctx.beginPath(); ctx.arc(px, floor - 37, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } catch (fallbackError) {
      console.error('[FLAME] emergency frame failed:', fallbackError);
    }
  }

  private update(dt: number) {
    this.flameTimer += dt;
    this.stageSceneTimer += dt;

    // 1. Update Low Misty Eyes & Celestial Meteors
    this.updateLowEyes(dt);
    this.updateMeteors(dt);
    this.updateCrows(dt);
    this.stamina = Math.min(this.maxStamina, this.stamina + dt * 2.5);
    this.updateWorldTokens(dt);

    // 2. Family Reunion Check & CINEMATIC ZOOM
    if (this.isBattleCleared && !this.isReunited) {
      const distToAltar = Math.abs(this.x - this.familyAltarX);
      if (distToAltar < 85) {
        this.isReunited = true;
        this.reunionTimer = 0;
        this.targetCameraZoom = 1.8; // Trigger cinematic close-up zoom!
        this.vx = 0;
        this.vy = 0;
        this.flightDuration = 0;
        this.isHorizontalFlightActive = false;
        soundManager.playVictory();
        this.addScreenShake(6);

        // Explode joyful heart and celebration embers
        for (let i = 0; i < 50; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 100 + Math.random() * 200;
          this.particles.push({
            x: this.familyAltarX,
            y: this.groundY - 45,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 5 + Math.random() * 5,
            color: Math.random() < 0.5 ? '#f472b6' : '#38bdf8',
            alpha: 1,
            life: 1.1,
            maxLife: 1.1,
            shape: 'heart',
          });
        }

        if (this.victoryTimer !== null) clearTimeout(this.victoryTimer);
        this.victoryTimer = setTimeout(() => {
          this.victoryTimer = null;
          if (!this.isRunning || !this.isReunited) return;
          this.isStageComplete = true;
          if (this.onVictory) this.onVictory();
        }, 2400);
      }
    }

    // Smooth camera zoom interpolation
    this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * 4.0 * dt;

    if (this.isReunited) {
      this.reunionTimer += dt;
      // Gently glide directly into the family center for the tight hug
      this.x += (this.familyAltarX - this.x) * 4.5 * dt;
      this.y += (this.groundY - 35 - this.y) * 4.5 * dt;
    } else {
      // 3. Movement & HORIZONTAL SUPERSONIC FLIGHT (عند الحصول على التوكن)
      if (this.flightDuration > 0) {
        this.flightDuration -= dt;
        this.isHorizontalFlightActive = true;

        // Piercing forward horizontal rocket velocity!
        const horizontalInput = this.moveInput.x || (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD'] ? 1 : this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA'] ? -1 : this.facing * 0.35);
        const rocketSpeed = 620;
        this.vx = horizontalInput * rocketSpeed;
        if (Math.abs(horizontalInput) > 0.08) this.facing = horizontalInput > 0 ? 1 : -1;

        // Steer vertical trajectory smoothly with joystick / W/S
        let inputY = this.moveInput.y;
        if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) inputY -= 1;
        if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) inputY += 1;
        inputY = Math.max(-1, Math.min(1, inputY));

        this.vy = inputY * 340;

        // Bound vertical flight so it stays in the playable zone
        const flightTop = Math.max(95, this.cameraY + 90);
        const flightBottom = this.terrainHeightAt(this.x) - 28;
        this.y = Math.max(flightTop, Math.min(flightBottom, this.y));

        // Supersonic sonic boom shockwaves
        this.flightRamCooldown -= dt;
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 65) {
            const ramDmg = Math.round(this.stats.attackPower * 2.4);
            this.damageEnemy(enemy, ramDmg, true, true);
            enemy.vx = this.facing * 520;
            enemy.vy = -260;
            this.addScreenShake(8);
          }
        }

        // Exhaust plasma trail
        for (let p = 0; p < 2; p++) {
          this.particles.push({
            x: this.x - this.facing * 28,
            y: this.y + (Math.random() - 0.5) * 14,
            vx: -this.facing * (180 + Math.random() * 120),
            vy: (Math.random() - 0.5) * 40,
            size: 5 + Math.random() * 5,
            color: Math.random() < 0.6 ? '#00f0ff' : '#ffffff',
            alpha: 1.0,
            life: 0.32,
            maxLife: 0.32,
          });
        }
      } else {
        this.isHorizontalFlightActive = false;

        let inputX = this.moveInput.x;
        if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) inputX -= 1;
        if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) inputX += 1;
        inputX = Math.max(-1, Math.min(1, inputX));

        if (Math.abs(inputX) > 0.08 && this.stats.hp > 0) {
          this.facing = inputX > 0 ? 1 : -1;
          const targetSpeed = inputX * this.stats.speed;
          this.vx += (targetSpeed - this.vx) * 14 * dt;
        } else {
          this.vx *= Math.pow(0.001, dt);
        }

        if (!this.isDashing) {
          this.vy += 1600 * dt;
        }
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Continuous rolling ground: no pits or water hazards.
      this.isGrounded = false;
      const floorY = this.terrainHeightAt(this.x);
      if (this.y + this.height / 2 >= floorY) {
        this.y = floorY - this.height / 2;
        this.vy = 0;
        this.isGrounded = true;
      }

      // Elevated Monolith Platforms (Clean One-Way Landing)
      if (!this.isHorizontalFlightActive) {
        for (const plat of this.platforms) {
          if (
            this.x + this.width / 4 > plat.x &&
            this.x - this.width / 4 < plat.x + plat.width &&
            this.y + this.height / 2 >= plat.y &&
            this.y + this.height / 2 <= plat.y + 14 &&
            this.vy >= 0
          ) {
            this.y = plat.y - this.height / 2;
            this.vy = 0;
            this.isGrounded = true;
          }
        }
      }
    }

    // Trailing burning blue embers from hero
    const emberCount = Math.abs(this.vx) > 40 || this.isHorizontalFlightActive ? 3 : 1;
    for (let i = 0; i < emberCount; i++) {
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 18,
        y: this.y + (Math.random() - 0.5) * 20,
        vx: -this.vx * 0.15 + (Math.random() - 0.5) * 45,
        vy: -75 - Math.random() * 95,
        size: 3 + Math.random() * 5,
        color: Math.random() < 0.6 ? '#00f0ff' : '#38bdf8',
        alpha: 0.9,
        life: 0.35,
        maxLife: 0.35,
      });
    }

    // 4. Cooldowns & Timers
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.recallCooldown > 0) this.recallCooldown = Math.max(0, this.recallCooldown - dt);
    if (this.beamCooldown > 0) this.beamCooldown = Math.max(0, this.beamCooldown - dt);
    if (this.azureFlameCooldown > 0) this.azureFlameCooldown = Math.max(0, this.azureFlameCooldown - dt);
    if (this.azureFlameTimer > 0) this.azureFlameTimer = Math.max(0, this.azureFlameTimer - dt);
    if (this.parryCooldown > 0) this.parryCooldown = Math.max(0, this.parryCooldown - dt);
    if (this.novaCooldown > 0) this.novaCooldown = Math.max(0, this.novaCooldown - dt);

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    if (this.isBeaming) {
      this.beamTimer -= dt;
      if (this.beamTimer <= 0) this.isBeaming = false;
    }

    if (this.isParrying) {
      this.parryTimer -= dt;
      if (this.parryTimer <= 0) this.isParrying = false;
    }

    this.slashCooldownTimer = Math.max(0, this.slashCooldownTimer - dt);
    this.orbitalWispCooldown = Math.max(0, this.orbitalWispCooldown - dt);

    if (this.isSlashing) {
      this.slashTimer -= dt;
      if (this.slashTimer <= 0) this.isSlashing = false;
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.slashStep = 0;
        this.comboStreak = 0;
      }
    }

    if (this.recallBeacon && this.recallBeacon.active) {
      this.recallBeacon.life -= dt;
      if (this.recallBeacon.life <= 0) {
        this.recallBeacon.active = false;
      }
    }

    if (this.onCooldownsUpdate) {
      this.onCooldownsUpdate({
        dash: this.dashCooldown,
        beam: this.beamCooldown,
        ward: this.parryCooldown,
        nova: this.novaCooldown,
        recall: this.recallCooldown,
        recallActive: !!(this.recallBeacon && this.recallBeacon.active),
        novaEnergy: this.novaEnergy,
        comboStreak: this.comboStreak,
        flightTime: Math.max(0, this.flightDuration),
        stamina: this.stamina,
        flameTime: this.azureFlameTimer,
        wardTime: this.isParrying ? Math.max(0, this.parryTimer) : 0,
      });
    }

    // 5. Update Enemies
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      enemy.animTimer += dt;
      if (enemy.flashTimer > 0) enemy.flashTimer -= dt;

      const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
      enemy.facing = this.x > enemy.x ? 1 : -1;

      // Solid ground for ground enemies
      enemy.vy += 1400 * dt;
      enemy.y += enemy.vy * dt;
      const enemyFloor = this.terrainHeightAt(enemy.x);
      if (!this.isSinkholeAt(enemy.x) && enemy.y + enemy.height / 2 >= enemyFloor) {
        enemy.y = enemyFloor - enemy.height / 2;
        enemy.vy = 0;
      }

      enemy.x += enemy.vx * dt;
      enemy.vx *= 0.92;

      if (enemy.state === 'chase') {
        if (dist <= enemy.attackRange && enemy.attackCooldown <= 0) {
          enemy.state = 'windup';
          enemy.windupTimer = 0.45;
        } else {
          enemy.vx += enemy.facing * enemy.speed * 4.5 * dt;
          if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
        }
      } else if (enemy.state === 'windup') {
        enemy.windupTimer -= dt;
        if (enemy.windupTimer <= 0) {
          enemy.state = 'attack';
          this.executeEnemyAttack(enemy);
          enemy.attackCooldown = 1.9;
          enemy.state = 'chase';
        }
      } else if (enemy.state === 'stagger') {
        enemy.windupTimer -= dt;
        if (enemy.windupTimer <= 0) enemy.state = 'chase';
      }
    }

    // 6. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const previousX = p.x;
      const previousY = p.y;
      p.previousX = previousX;
      p.previousY = previousY;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (!p.isEnemy) {
        let hit = false;
        const segmentX = p.x - previousX;
        const segmentY = p.y - previousY;
        const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          // Swept segment-vs-target test prevents fast bolts skipping small enemies between frames.
          const targetX = enemy.x;
          const targetY = enemy.y - enemy.height * 0.42;
          const t = segmentLengthSq > 0
            ? Math.max(0, Math.min(1, ((targetX - previousX) * segmentX + (targetY - previousY) * segmentY) / segmentLengthSq))
            : 0;
          const closestX = previousX + segmentX * t;
          const closestY = previousY + segmentY * t;
          if (Math.hypot(closestX - targetX, closestY - targetY) < p.radius + Math.max(28, enemy.width * 0.48)) {
            this.damageEnemy(enemy, p.damage, false, true);
            hit = true;
            for (let spark = 0; spark < 9; spark++) {
              const angle = Math.random() * Math.PI * 2;
              this.particles.push({ x: p.x, y: p.y, vx: Math.cos(angle) * (45 + Math.random() * 110), vy: Math.sin(angle) * (45 + Math.random() * 110), size: 2 + Math.random() * 4, color: spark % 2 ? '#67e8f9' : '#ffffff', alpha: 0.95, life: 0.32, maxLife: 0.32, shape: 'spark' });
            }
            break;
          }
        }
        if (hit) { this.projectiles.splice(i, 1); continue; }
      } else {
        if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 22) {
          if (false && this.skills.orbitalWisps > 1 && this.orbitalWispCooldown <= 0) {
            this.orbitalWispCooldown = Math.max(1.8, 6.2 - (this.skills.orbitalWisps - 1) * 0.65);
            soundManager.playBlast();
            this.addScreenShake(3);
            for (let spark = 0; spark < 12; spark++) {
              const a = (spark / 12) * Math.PI * 2;
              this.particles.push({ x: this.x, y: this.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, size: 4, color: '#67e8f9', alpha: 1, life: 0.3, maxLife: 0.3, shape: 'spark' });
            }
          } else {
            this.damagePlayer(p.damage);
          }
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Soul Magnet
    const magnetRadius = 220;
    for (let i = this.soulMotes.length - 1; i >= 0; i--) {
      const m = this.soulMotes[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx *= 0.95;
      m.vy += 280 * dt;

      const dist = Math.hypot(this.x - m.x, this.y - m.y);
      if (dist < magnetRadius) {
        const ang = Math.atan2(this.y - m.y, this.x - m.x);
        m.vx += Math.cos(ang) * 950 * dt;
        m.vy += Math.sin(ang) * 950 * dt;

        if (dist < 35) {
          this.stats.souls += m.value;
          this.stats.xp += m.value * 2;
          this.checkLevelUp();
          soundManager.playSoulPickup();
          if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats });
          this.soulMotes.splice(i, 1);
        }
      }
    }

    // 8. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Defensive caps prevent runaway transient effects from exhausting mobile WebView memory.
    if (this.particles.length > 520) this.particles.splice(0, this.particles.length - 520);
    if (this.projectiles.length > 90) this.projectiles.splice(0, this.projectiles.length - 90);

    // 9. Spawning
    if (!this.isReunited && !this.isBattleCleared) {
      this.updateSpawning(dt);
    }

    // 10. Camera Follow (Focused on center during reunion)
    const targetX = this.isReunited ? (this.x + this.familyAltarX) / 2 : this.x;
    const targetY = this.isReunited ? this.groundY - 50 : this.y;
    const targetCamX = targetX - this.viewportWidth / (2 * this.cameraZoom);
    const targetCamY = targetY - this.viewportHeight / (2 * this.cameraZoom) - 40;
    this.cameraX += (targetCamX - this.cameraX) * 7.5 * dt;
    this.cameraY += (targetCamY - this.cameraY) * 7.5 * dt;

    if (this.screenShakeAmount > 0) {
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - 38 * dt);
    }
  }

  /**
   * Update collectible flight tokens & stamina tokens
   */
  private updateWorldTokens(dt: number) {
    for (const token of this.worldTokens) {
      if (!token.active) continue;

      token.floatTimer += dt * 3;
      token.y = token.baseY + Math.sin(token.floatTimer) * 7;

      // Pickup radius
      const dist = Math.hypot(token.x - this.x, token.y - this.y);
      if (dist < 42) {
        token.active = false;

        if (token.type === 'flight') {
          // Trigger 7.5s horizontal supersonic flight!
          this.flightDuration = 5 + Math.max(0, (this.stats.flightLevel || 1) - 1) * 1.5;
          soundManager.playFlightTokenPickup();
          this.addScreenShake(6);

          if (this.onDamageNumber && this.settings.damageNumbers) {
            this.onDamageNumber({
              id: Math.random(),
              text: '⚡ AERO FLIGHT!',
              x: this.x - this.cameraX,
              y: this.y - this.cameraY - 50,
              opacity: 1,
              color: '#00f0ff',
              isCrit: true,
            });
          }

          // Azure shockwave ring
          for (let i = 0; i < 22; i++) {
            const ang = (i / 22) * Math.PI * 2;
            this.particles.push({
              x: token.x,
              y: token.y,
              vx: Math.cos(ang) * 160,
              vy: Math.sin(ang) * 160,
              size: 5 + Math.random() * 4,
              color: '#00f0ff',
              alpha: 1,
              life: 0.45,
              maxLife: 0.45,
            });
          }
        } else if (token.type === 'stamina') {
          // Stamina core refills the defensive stamina pool and restores a little health.
          this.stamina = this.maxStamina;
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 20);
          soundManager.playStaminaTokenPickup();
          if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats });

          if (this.onDamageNumber && this.settings.damageNumbers) {
            this.onDamageNumber({
              id: Math.random(),
              text: '✦ STAMINA RESTORED!',
              x: this.x - this.cameraX,
              y: this.y - this.cameraY - 50,
              opacity: 1,
              color: '#facc15',
              isCrit: true,
            });
          }

          // Golden vitality sparks
          for (let i = 0; i < 18; i++) {
            const ang = Math.random() * Math.PI * 2;
            this.particles.push({
              x: token.x,
              y: token.y,
              vx: Math.cos(ang) * 140,
              vy: Math.sin(ang) * 140,
              size: 5 + Math.random() * 4,
              color: '#facc15',
              alpha: 1,
              life: 0.5,
              maxLife: 0.5,
            });
          }
        }
      }
    }
  }

  /**
   * Shooting stars & meteors streaking diagonally across the cosmic sky
   */
  private updateMeteors(dt: number) {
    this.meteorSpawnTimer -= dt;
    if (this.meteorSpawnTimer <= 0) {
      this.meteorSpawnTimer = 2.2 + Math.random() * 3.0;

      // Spawn meteor at top / top-left of visible sky
      const startX = -200 + Math.random() * (this.viewportWidth + 400);
      const startY = -40 + Math.random() * 90;
      const speed = 750 + Math.random() * 450;
      const angle = 0.55 + (Math.random() - 0.5) * 0.2; // ~32 degree diagonal descent
      const life = 0.9 + Math.random() * 0.5;

      this.meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 120 + Math.random() * 110,
        thickness: 2.5 + Math.random() * 2,
        color: Math.random() < 0.6 ? '#ffffff' : '#38bdf8',
        life,
        maxLife: life,
      });

      // Occasional celestial sound
      if (Math.random() < 0.35) {
        soundManager.playMeteorStreak();
      }
    }

    // Update active meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.life -= dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Meteors are screen-space sky effects. Do not add their trail to the
      // world-space particle list; that camera transform made detached rings.

      if (m.life <= 0) {
        this.meteors.splice(i, 1);
      }
    }
  }

  /**
   * Low misty predator eyes (peering just above dark ground level, NOT in sky!)
   */
  private updateLowEyes(dt: number) {
    for (const eye of this.lowEyes) {
      if (eye.state === 'dormant') {
        eye.waitTimer -= dt;
        if (eye.waitTimer <= 0) {
          eye.state = 'fade_in';
          eye.timer = 1.0;
        }
      } else if (eye.state === 'fade_in') {
        eye.alpha = Math.min(0.85, eye.alpha + dt * 1.1);
        eye.timer -= dt;
        if (eye.timer <= 0) {
          eye.state = 'glowing';
          eye.timer = 2.5 + Math.random() * 3.5;
        }
      } else if (eye.state === 'glowing') {
        eye.timer -= dt;
        if (eye.timer <= 0) {
          eye.state = 'fade_out';
          eye.timer = 1.2;
        }
      } else if (eye.state === 'fade_out') {
        eye.alpha = Math.max(0, eye.alpha - dt * 0.8);
        if (eye.alpha <= 0) {
          eye.state = 'dormant';
          eye.waitTimer = 5.0 + Math.random() * 10.0;
        }
      }
    }
  }

  private executeEnemyAttack(enemy: Enemy2D) {
    const dx = this.x - enemy.x;
    const dy = this.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (enemy.isBoss && (enemy.type === 'dark_pyromancer' || enemy.type === 'abyssal_sovereign' || enemy.type === 'pyro_serpent')) {
      // Bosses use readable, aimed projectile patterns instead of relying only on contact damage.
      const baseAngle = Math.atan2(dy, dx);
      const count = enemy.type === 'abyssal_sovereign' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const spread = count === 1 ? 0 : (i - 1) * 0.22;
        const angle = baseAngle + spread;
        const speed = enemy.type === 'abyssal_sovereign' ? 360 : 300;
        this.projectiles.push({
          id: this.nextEntityId++, x: enemy.x + Math.cos(angle) * 35, y: enemy.y - 10,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          radius: enemy.type === 'abyssal_sovereign' ? 14 : 11,
          damage: Math.round(enemy.attackPower * (enemy.type === 'abyssal_sovereign' ? 0.72 : 0.62)),
          life: 3.2, isEnemy: true,
          color: enemy.type === 'dark_pyromancer' ? '#c084fc' : '#fb7185',
        });
      }
      soundManager.playBlast();
      return;
    }

    if (enemy.isBoss && enemy.type === 'magma_golem') {
      // Heavy telegraphed ground slam with a wide shockwave radius.
      this.addScreenShake(13);
      soundManager.playNova();
      if (dist <= enemy.attackRange + 210) this.damagePlayer(Math.round(enemy.attackPower * 1.18));
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.particles.push({ x: enemy.x, y: this.groundY - 8, vx: Math.cos(a) * (220 + Math.random() * 100), vy: -Math.random() * 90, size: 5 + Math.random() * 5, color: '#fb923c', alpha: 1, life: 0.42, maxLife: 0.42, shape: 'spark' });
      }
      return;
    }

    if (enemy.isBoss && enemy.type === 'ignis_knight') {
      enemy.vx = enemy.facing * 560;
      if (dist <= enemy.attackRange + 85) this.damagePlayer(Math.round(enemy.attackPower * 1.12));
      this.addScreenShake(7);
      return;
    }

    if (dist <= enemy.attackRange + 35) this.damagePlayer(enemy.attackPower);
  }

  private checkLevelUp() {
    if (this.stats.xp >= this.stats.nextXp) {
      this.stats.level++;
      this.stats.xp -= this.stats.nextXp;
      this.stats.nextXp = Math.round(this.stats.nextXp * 1.5);
      this.stats.maxHp += 15;
      this.stats.hp = this.stats.maxHp;
      this.stats.attackPower += 4;
      soundManager.playVictory();
    }
  }

  // ==========================================
  // BREATHTAKING AAA 2D RENDERING
  // ==========================================

  private render() {
    const ctx = this.ctx;
    const width = this.viewportWidth;
    const height = this.viewportHeight;

    let offsetX = -this.cameraX;
    let offsetY = -this.cameraY;
    if (this.screenShakeAmount > 0) {
      offsetX += (Math.random() - 0.5) * this.screenShakeAmount;
      offsetY += (Math.random() - 0.5) * this.screenShakeAmount;
    }

    // 1. Deep Cosmic Night Sky (NO TREES)
    const palette = this.getActPalette();
    const isDesertBiome = [2, 6, 12, 17].includes(this.currentStageIndex);
    const cityBiome = this.getCityBiome();
    const isStoneBiome = [9, 18].includes(this.currentStageIndex);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isDesertBiome) {
      skyGrad.addColorStop(0, '#34243a'); skyGrad.addColorStop(0.34, '#a94f3e');
      skyGrad.addColorStop(0.68, '#f08a45'); skyGrad.addColorStop(1, '#5a3028');
    } else {
      skyGrad.addColorStop(0, palette.top); skyGrad.addColorStop(0.42, palette.mid);
      skyGrad.addColorStop(0.78, palette.low); skyGrad.addColorStop(1, '#05060c');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Stars & Twinkles
    ctx.fillStyle = '#ffffff';
    for (let s = 0; !isDesertBiome && s < 45; s++) {
      const sx = (s * 137.5) % width;
      const sy = (s * 73.1) % (height * 0.55);
      const sRadius = s % 3 === 0 ? 1.5 : 1.0;
      ctx.globalAlpha = 0.35 + Math.sin(this.flameTimer * 3 + s) * 0.25;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Layered distant nebulae on selected stages, kept behind the moon and silhouettes.
    if ([1, 10, 15, 19].includes(this.currentStageIndex)) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const nebulae = [
        { x: width * 0.22, y: height * 0.23, r: width * 0.34, c: 'rgba(91,75,190,0.16)' },
        { x: width * 0.56, y: height * 0.31, r: width * 0.30, c: 'rgba(30,145,180,0.13)' },
        { x: width * 0.82, y: height * 0.18, r: width * 0.24, c: 'rgba(180,70,140,0.10)' },
      ];
      for (const cloud of nebulae) {
        const g = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
        g.addColorStop(0, cloud.c); g.addColorStop(0.48, cloud.c.replace(/0\.1[036]/, '0.045')); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cloud.x, cloud.y, cloud.r, cloud.r * 0.38, -0.18, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    if (!isDesertBiome) {
    // Giant Luminous Moon with Soft Aura
    const moonX = width * 0.78 - this.cameraX * 0.02;
    const moonY = 140 - this.cameraY * 0.02;
    const moonR = 95;

    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 2.4);
    moonGlow.addColorStop(0, palette.haze);
    moonGlow.addColorStop(0.45, 'rgba(14, 165, 233, 0.08)');
    moonGlow.addColorStop(1, 'rgba(1, 2, 6, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Atmospheric bloom blends the lunar rim into the surrounding night haze.
    const rimHaze = ctx.createRadialGradient(moonX, moonY, moonR * 0.82, moonX, moonY, moonR * 1.28);
    rimHaze.addColorStop(0, 'rgba(220,239,255,0.12)'); rimHaze.addColorStop(0.55, 'rgba(180,215,245,0.07)'); rimHaze.addColorStop(1, 'rgba(180,215,245,0)');
    ctx.fillStyle = rimHaze; ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = palette.moon;
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
    // Visible crater basins and terminator shading make the moon read as a world, not a flat disc.
    ctx.save(); ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.clip();
    const craterData = [[-.38,-.24,18],[.25,-.42,12],[.48,.12,23],[-.12,.35,27],[-.58,.42,10],[.05,-.02,8]];
    for (const [cx, cy, r] of craterData) {
      ctx.fillStyle = 'rgba(40,58,76,.16)'; ctx.beginPath(); ctx.arc(moonX + cx * moonR, moonY + cy * moonR, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(moonX + cx * moonR - 2, moonY + cy * moonR - 2, r * .82, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    }
    const shade = ctx.createLinearGradient(moonX - moonR, moonY, moonX + moonR, moonY);
    shade.addColorStop(0, 'rgba(2,8,20,.02)'); shade.addColorStop(.68, 'rgba(2,8,20,.02)'); shade.addColorStop(1, 'rgba(2,8,20,.42)');
    ctx.fillStyle = shade; ctx.fillRect(moonX-moonR, moonY-moonR, moonR*2, moonR*2); ctx.restore();

    } else {
      this.renderDesertSunrise(ctx, width, height);
    }

    if (!isDesertBiome) {
    // Cinematic aurora curtains on selected chapters (4, 9, 14, 19).
    if ([3, 8, 13, 18].includes(this.currentStageIndex)) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const auroraPhase = this.flameTimer * 0.34 + this.currentStageIndex * 0.7;
      // Broad translucent curtains with drifting folds, layered color and a soft luminous crown.
      for (let curtain = 0; curtain < 7; curtain++) {
        const x0 = -width * 0.18 + curtain * width * 0.205;
        const sway = Math.sin(auroraPhase + curtain * 0.83) * width * 0.045;
        const top = height * (0.095 + (curtain % 3) * 0.025);
        const bottom = height * (0.47 + (curtain % 2) * 0.045);
        const hue = curtain % 3 === 0 ? [65, 245, 190] : curtain % 3 === 1 ? [75, 190, 255] : [165, 115, 255];
        const gradient = ctx.createLinearGradient(x0, top, x0 + sway, bottom);
        gradient.addColorStop(0, `rgba(${hue[0]},${hue[1]},${hue[2]},0)`);
        gradient.addColorStop(0.18, `rgba(${hue[0]},${hue[1]},${hue[2]},0.025)`);
        gradient.addColorStop(0.52, `rgba(${hue[0]},${hue[1]},${hue[2]},0.15)`);
        gradient.addColorStop(0.82, `rgba(${hue[0]},${hue[1]},${hue[2]},0.055)`);
        gradient.addColorStop(1, `rgba(${hue[0]},${hue[1]},${hue[2]},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x0 - 80, top);
        for (let y = top; y <= bottom; y += 18) {
          const t = (y - top) / Math.max(1, bottom - top);
          const fold = Math.sin(y * 0.012 + auroraPhase * 1.5 + curtain) * (18 + 28 * t)
            + Math.sin(y * 0.026 - auroraPhase + curtain * 0.7) * 9;
          ctx.lineTo(x0 + sway * t + fold - 80, y);
        }
        ctx.lineTo(x0 + sway + 100, bottom);
        for (let y = bottom; y >= top; y -= 18) {
          const t = (y - top) / Math.max(1, bottom - top);
          const fold = Math.sin(y * 0.012 + auroraPhase * 1.5 + curtain) * (18 + 28 * t)
            + Math.sin(y * 0.026 - auroraPhase + curtain * 0.7) * 9;
          ctx.lineTo(x0 + sway * t + fold + 100, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      // Fine luminous wave crests give the curtains a silk-like, flowing edge.
      for (let ribbon = 0; ribbon < 3; ribbon++) {
        ctx.beginPath();
        for (let x = -40; x <= width + 40; x += 12) {
          const y = height * (0.20 + ribbon * 0.055)
            + Math.sin(x * 0.004 + auroraPhase * (1 + ribbon * 0.12)) * (20 + ribbon * 8)
            + Math.sin(x * 0.011 - auroraPhase * 0.8) * 9;
          if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ribbon === 0 ? 'rgba(184,255,236,0.20)' : ribbon === 1 ? 'rgba(126,220,255,0.13)' : 'rgba(206,168,255,0.10)';
        ctx.lineWidth = ribbon === 0 ? 2.2 : 1.4;
        ctx.shadowColor = ribbon === 0 ? '#a7fff0' : '#7dd3fc';
        ctx.shadowBlur = 20;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. CELESTIAL METEORS & SHOOTING STARS (نيازك وشهب تمر في السماء)
    this.renderMeteors(ctx);
    // Ravens are rendered in screen space so they visibly cross in front of the moon.
    this.renderCrows(ctx);

    // 3. Background silhouette: cedar-covered mountain range or a dedicated city skyline.
    if (cityBiome !== null) {
      this.renderCityBackdrop(ctx, width, height, cityBiome);
    } else if (!isDesertBiome) {
      this.renderCedarMountainRange(ctx, width, height);
      this.renderDistantCastle(ctx, width, height, palette.accent);
    }
    }

    // Transform for World Coordinates with CINEMATIC CAMERA ZOOM
    ctx.save();
    if (this.cameraZoom !== 1.0) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-width / 2, -height / 2);
    }
    ctx.translate(offsetX, offsetY);

    // 4. LOW MISTY PREDATOR EYES (Lowered near ground, NOT in the sky!)
    if (!isDesertBiome) this.renderLowMistyEyes(ctx);

    // 5. NIGHT MEADOW: deep green-black grassland with readable rolling contours.
    const groundLeft = this.cameraX - 600;
    const groundRight = this.cameraX + width / this.cameraZoom + 600;
    const groundWidth = groundRight - groundLeft;
    ctx.beginPath();
    for (let wx = groundLeft; wx <= groundRight; wx += 10) {
      const gy = this.terrainHeightAt(wx);
      if (wx === groundLeft) ctx.moveTo(wx, gy); else ctx.lineTo(wx, gy);
    }
    ctx.lineTo(groundRight, height + this.cameraY + 1000);
    ctx.lineTo(groundLeft, height + this.cameraY + 1000);
    ctx.closePath();
    const isRoseMeadow = this.currentStageIndex === 11;
    const isDesert = isDesertBiome;
    const meadow = ctx.createLinearGradient(0, this.groundY - 65, 0, this.groundY + 420);
    if (isDesert) {
      meadow.addColorStop(0, '#d6a85e'); meadow.addColorStop(0.10, '#9b6a36'); meadow.addColorStop(0.42, '#5a3822'); meadow.addColorStop(1, '#1c120d');
    } else if (isStoneBiome) {
      meadow.addColorStop(0, '#777b7e'); meadow.addColorStop(0.10, '#4c5158'); meadow.addColorStop(0.38, '#252b34'); meadow.addColorStop(1, '#0b0e13');
    } else if (isRoseMeadow) {
      meadow.addColorStop(0, '#8f527e'); meadow.addColorStop(0.10, '#60334f'); meadow.addColorStop(0.38, '#321c32'); meadow.addColorStop(1, '#100b18');
    } else {
      meadow.addColorStop(0, '#263d2c'); meadow.addColorStop(0.10, '#172b20'); meadow.addColorStop(0.38, '#0c1b14'); meadow.addColorStop(1, '#030906');
    }
    ctx.fillStyle = meadow; ctx.fill();

    // Soft moonlit grassy ridge and fine blades along the silhouette.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = isDesert ? 'rgba(255,218,151,0.82)' : isRoseMeadow ? 'rgba(255,190,230,0.72)' : 'rgba(111,157,105,0.58)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let wx = groundLeft; wx <= groundRight; wx += 8) {
      const gy = this.terrainHeightAt(wx);
      if (wx === groundLeft) ctx.moveTo(wx, gy); else ctx.lineTo(wx, gy);
    }
    ctx.stroke();
    for (let i = 0; !isDesert && i < Math.ceil(groundWidth / 13); i++) {
      const wx = groundLeft + i * 13;
      const gy = this.terrainHeightAt(wx);
      const h = 3 + ((i * 17) % 8);
      ctx.strokeStyle = isRoseMeadow ? (i % 3 === 0 ? 'rgba(255,205,235,0.78)' : 'rgba(198,112,174,0.72)') : (i % 3 === 0 ? 'rgba(116,170,105,0.62)' : 'rgba(57,105,65,0.55)');
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(wx, gy + 1); ctx.lineTo(wx + ((i % 2) ? 2 : -2), gy - h); ctx.stroke();
    }
    // Desert grain, fixed cacti silhouettes and low dunes are world-anchored.
    if (isDesert) {
      ctx.save();
      for (let i = 0; i < 110; i++) {
        const wx = groundLeft + ((i * 97 + 23) % Math.max(1, groundWidth));
        const gy = this.groundY + 18 + ((i * 31) % 230);
        ctx.fillStyle = i % 3 ? 'rgba(255,224,164,0.20)' : 'rgba(72,43,23,0.22)';
        ctx.fillRect(wx, gy, 2 + (i % 2), 1.2);
      }
      const firstCactus = Math.floor(groundLeft / 1050) - 1;
      const lastCactus = Math.ceil(groundRight / 1050) + 1;
      for (let n = firstCactus; n <= lastCactus; n++) {
        const cx = n * 1050 + 780; const cy = this.groundY - 4;
        const scale = 0.68 + ((n % 3 + 3) % 3) * 0.14;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
        ctx.fillStyle = '#244333'; ctx.strokeStyle = 'rgba(151,177,119,0.38)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.bezierCurveTo(-12, -28, -11, -66, -7, -91);
        ctx.quadraticCurveTo(-4, -101, 2, -98); ctx.quadraticCurveTo(9, -96, 8, -86);
        ctx.bezierCurveTo(5, -55, 8, -24, 10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        // Rounded arms grow organically from the trunk instead of square blocks.
        ctx.beginPath(); ctx.moveTo(-8, -39); ctx.bezierCurveTo(-26, -40, -30, -49, -29, -63);
        ctx.quadraticCurveTo(-28, -72, -22, -72); ctx.quadraticCurveTo(-15, -72, -16, -63);
        ctx.bezierCurveTo(-16, -54, -13, -51, -7, -51); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, -55); ctx.bezierCurveTo(24, -56, 28, -65, 27, -78);
        ctx.quadraticCurveTo(26, -87, 20, -87); ctx.quadraticCurveTo(13, -87, 14, -78);
        ctx.bezierCurveTo(14, -69, 12, -67, 7, -67); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,207,150,0.28)'; ctx.lineWidth = 1;
        for (let rib = -5; rib <= 5; rib += 5) { ctx.beginPath(); ctx.moveTo(rib, -84); ctx.quadraticCurveTo(rib - 2, -48, rib + 1, -8); ctx.stroke(); }
        ctx.restore();
      }
      this.renderSandWhirlwinds(ctx, groundLeft, groundRight);
      ctx.restore();
    }

    if (isStoneBiome) {
      // Irregular old-city stone paving: staggered joints, bevel highlights and subtle wear.
      const rowH = 30;
      for (let row = 0; row < 9; row++) {
        const y = this.groundY + row * rowH + 8;
        const tileW = 76 + (row % 3) * 8;
        const offset = (row % 2) * tileW * 0.5 - (groundLeft % tileW);
        for (let col = -2; col < Math.ceil(groundWidth / tileW) + 3; col++) {
          const x = groundLeft + col * tileW + offset;
          ctx.fillStyle = `rgba(180,190,198,${0.035 + (col + row) % 3 * 0.012})`;
          ctx.beginPath(); ctx.roundRect(x + 2, y + 2, tileW - 5, rowH - 5, 3); ctx.fill();
          ctx.strokeStyle = 'rgba(5,9,15,0.48)'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.strokeStyle = 'rgba(220,228,232,0.08)'; ctx.beginPath(); ctx.moveTo(x + 5, y + 4); ctx.lineTo(x + tileW - 9, y + 4); ctx.stroke();
        }
      }
    }
    // Sparse dew glints, subdued so the playfield stays clear.
    for (let i = 0; !isDesert && i < 24; i++) {
      const wx = groundLeft + ((i * 137 + 31) % Math.max(1, groundWidth));
      const gy = this.terrainHeightAt(wx) + 8 + (i % 5) * 11;
      ctx.fillStyle = isRoseMeadow ? `rgba(255,190,226,${0.15 + (i % 3) * 0.05})` : `rgba(139,190,126,${0.12 + (i % 3) * 0.05})`;
      ctx.beginPath(); ctx.arc(wx, gy, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 6. FLOATING MONOLITHS WITH LUMINOUS NEON STRIPS
    this.renderNeonPlatforms(ctx);

    // 7. COLLECTIBLE TOKENS ON ROAD (Flight Rune & Stamina Core)
    this.renderWorldTokens(ctx);

    // 8. THE FLAME FAMILY SANCTUARY (STRICTLY APPEARS AT THE END AFTER BATTLE)
    if (this.isBattleCleared) {
      this.renderFlameFamily(ctx);
    }

    // 9. Fantastical Recall Beacon
    if (this.recallBeacon && this.recallBeacon.active) {
      const bx = this.recallBeacon.x;
      const by = this.recallBeacon.y;
      const bPulse = 20 + Math.sin(this.flameTimer * 12) * 6;

      const bGrad = ctx.createRadialGradient(bx, by, 4, bx, by, bPulse * 2.5);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.35, '#00f0ff');
      bGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, bPulse * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 10. Soul Motes (Azure Crystals)
    for (const m of this.soulMotes) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 11. Projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.isEnemy ? 16 : 24;
      if (!p.isEnemy) {
        const flame = ctx.createLinearGradient(-p.radius * 2.8, 0, p.radius * 1.5, 0);
        flame.addColorStop(0, 'rgba(34,211,238,0)');
        flame.addColorStop(0.28, 'rgba(34,211,238,0.62)');
        flame.addColorStop(0.72, '#22d3ee');
        flame.addColorStop(1, '#ffffff');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(-p.radius * 3.2, 0);
        ctx.quadraticCurveTo(-p.radius, -p.radius * 0.95, p.radius * 1.35, -p.radius * 0.32);
        ctx.quadraticCurveTo(p.radius * 2.0, 0, p.radius * 1.35, p.radius * 0.32);
        ctx.quadraticCurveTo(-p.radius, p.radius * 0.95, -p.radius * 3.2, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.ellipse(p.radius * 0.7, 0, p.radius * 0.78, p.radius * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 12. LIVING DEMONIC FLAME ENEMIES
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      this.renderMasterpieceEnemy(ctx, enemy);
    }

    // 13. THE LIVING BLUE FLAME HERO (Normal or Horizontal Supersonic Rocket Flame)
    this.renderHeroFlame(ctx);

    // 14. Celestial Beam Visual
    if (this.isBeaming) {
      this.renderCelestialBeam(ctx);
    }

    // 15. Particles (Embers & Hearts)
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.shape === 'heart') {
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(p.x + 3, p.y - 3, 3, 0, Math.PI * 2);
        ctx.lineTo(p.x, p.y + 6);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
    this.renderWeatherOverlay(ctx, width, height);
  }

  private getCityBiome(): 'algiers' | 'istanbul' | 'paris' | 'prague' | null {
    if (this.currentStageIndex === 4) return 'algiers';
    if (this.currentStageIndex === 9) return 'istanbul';
    if (this.currentStageIndex === 14) return 'paris';
    if (this.currentStageIndex === 18) return 'prague';
    return null;
  }

  /** Opaque, layered cedar mountains with natural ridgelines and restrained tree silhouettes. */
  private renderCedarMountainRange(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const shift = this.cameraX * 0.045;
    for (let layer = 0; layer < 3; layer++) {
      const base = height * (0.79 + layer * 0.025);
      const spacing = 620 + layer * 120;
      for (let i = -2; i < Math.ceil(width / spacing) + 3; i++) {
        const x = i * spacing - (shift * (1 + layer * 0.6) % spacing);
        const peak = height * (0.38 + ((i * 7 + layer * 3) % 5) * 0.035);
        const w = spacing * 1.12;
        ctx.beginPath(); ctx.moveTo(x - 80, base);
        ctx.bezierCurveTo(x + 30, base - 48, x + 75, peak + 110, x + w * 0.40, peak + 8);
        ctx.bezierCurveTo(x + w * 0.52, peak - 16, x + w * 0.62, peak + 76, x + w + 80, base);
        ctx.closePath();
        const g = ctx.createLinearGradient(x, peak, x + w * 0.6, base);
        g.addColorStop(0, layer === 0 ? '#263d50' : '#1a2c3a');
        g.addColorStop(0.55, layer === 0 ? '#172c3a' : '#101f2a'); g.addColorStop(1, '#080f19');
        ctx.fillStyle = g; ctx.fill();
        // Cedar clusters sit on the slope and follow its contour.
        if (layer < 2) for (let t = 0; t < 11; t++) {
          const tx = x + 55 + t * (w - 100) / 10;
          const ridge = peak + 18 + Math.pow((tx - (x + w * 0.4)) / (w * 0.58), 2) * (base - peak) * 0.70;
          const th = 22 + ((i * 13 + t * 17 + layer * 9) % 26);
          const tw = th * 0.42;
          ctx.fillStyle = layer === 0 ? '#0d251f' : '#091a19';
          ctx.beginPath(); ctx.moveTo(tx, ridge - th); ctx.quadraticCurveTo(tx - tw * 0.12, ridge - th * 0.55, tx - tw, ridge - th * 0.42);
          ctx.quadraticCurveTo(tx - tw * 0.28, ridge - th * 0.34, tx - tw * 0.82, ridge - th * 0.08);
          ctx.lineTo(tx + tw * 0.82, ridge - th * 0.08); ctx.quadraticCurveTo(tx + tw * 0.28, ridge - th * 0.34, tx + tw, ridge - th * 0.42);
          ctx.quadraticCurveTo(tx + tw * 0.12, ridge - th * 0.55, tx, ridge - th); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#171d20'; ctx.fillRect(tx - 1.2, ridge - th * 0.12, 2.4, th * 0.25);
        }
      }
    }
    ctx.restore();
  }

  /** Distinct cinematic skylines: Algiers, Istanbul, Paris and old Prague. */
  private renderCityBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, city: 'algiers' | 'istanbul' | 'paris' | 'prague') {
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const parallax = this.cameraX * 0.035;
    const horizon = height * 0.79;
    // Distant warm atmospheric city haze.
    const haze = ctx.createLinearGradient(0, height * 0.34, 0, horizon);
    haze.addColorStop(0, 'rgba(255,184,132,0)'); haze.addColorStop(1, city === 'paris' ? 'rgba(255,190,150,0.18)' : 'rgba(255,173,116,0.22)');
    ctx.fillStyle = haze; ctx.fillRect(0, height * 0.3, width, horizon - height * 0.3);
    // Continuous distant building mass, with individually varied rooflines.
    ctx.fillStyle = city === 'paris' ? '#20283a' : '#172536';
    for (let i = -1; i < 17; i++) {
      const x = i * (width / 13) - (parallax % (width / 13));
      const bw = width / 13 * (0.68 + (i % 3) * 0.08);
      const bh = height * (0.10 + ((i * 11 + 17) % 7) * 0.018);
      ctx.fillRect(x, horizon - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,205,145,0.42)';
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) ctx.fillRect(x + 7 + col * 12, horizon - bh + 10 + row * 14, 3, 5);
      ctx.fillStyle = city === 'paris' ? '#20283a' : '#172536';
    }
    if (city === 'algiers') {
      // Monument des Martyrs: three unmistakable curved concrete leaves.
      const mx = width * 0.31 - parallax * 0.5; const my = horizon - height * 0.20;
      ctx.fillStyle = '#35404a';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(mx + k * 24, my + 58); ctx.quadraticCurveTo(mx + k * 34 - 8, my + 8, mx + k * 13, my - 45); ctx.quadraticCurveTo(mx + k * 2, my - 60, mx + k * 8, my - 74); ctx.quadraticCurveTo(mx + k * 36, my - 36, mx + k * 38, my + 58); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#1c2934'; ctx.fillRect(mx - 57, my + 55, 114, 10);
      // Suspension bridge with moving traffic.
      const by = horizon - 58; ctx.strokeStyle = '#84909a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(width * .48, by); ctx.quadraticCurveTo(width * .70, by - 65, width * .94, by); ctx.stroke();
      ctx.strokeStyle = '#64717c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(width * .50, by + 3); ctx.lineTo(width * .94, by + 3); ctx.stroke();
      for (let i = 0; i < 11; i++) { const x = width * .52 + i * width * .038; ctx.beginPath(); ctx.moveTo(x, by - 3 - Math.sin(i / 10 * Math.PI) * 54); ctx.lineTo(x, by + 2); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const x = (i * 77 + this.flameTimer * 48) % (width * .42) + width * .51; ctx.fillStyle = i % 2 ? '#e7c58e' : '#a8c5d9'; ctx.fillRect(x, by - 8, 12, 5); }
      // A distant elevated metro line and train.
      const railY = horizon - 115; ctx.strokeStyle = '#87949d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(width * .58, railY + 16); ctx.lineTo(width * 1.02, railY + 16); ctx.stroke();
      const trainX = width * .58 + ((this.flameTimer * 34) % (width * .39)); ctx.fillStyle = '#c7d5dc'; ctx.beginPath(); ctx.roundRect(trainX, railY - 2, 64, 16, 6); ctx.fill();
      // A single aircraft crossing slowly in the upper sky.
      const planeX = ((this.flameTimer * 30) % (width + 100)) - 50; const planeY = height * .24;
      ctx.fillStyle = '#111a29'; ctx.beginPath(); ctx.moveTo(planeX - 20, planeY); ctx.lineTo(planeX + 22, planeY - 2); ctx.lineTo(planeX + 30, planeY); ctx.lineTo(planeX + 22, planeY + 3); ctx.lineTo(planeX - 20, planeY + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(planeX - 2, planeY); ctx.lineTo(planeX + 5, planeY - 10); ctx.lineTo(planeX + 10, planeY - 10); ctx.lineTo(planeX + 7, planeY + 1); ctx.fill();
    } else if (city === 'istanbul') {
      // Layered domes and slender minarets, all in a single continuous skyline.
      for (let i = 0; i < 3; i++) {
        const cx = width * (0.28 + i * 0.24) - parallax * .4; const base = horizon - 8; const r = 42 + i * 8;
        ctx.fillStyle = '#25364a'; ctx.fillRect(cx - r, base - 34, r * 2, 34);
        ctx.beginPath(); ctx.ellipse(cx, base - 34, r * .78, r * .48, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - r - 8, base - 27, 10, 27); ctx.fillRect(cx + r - 2, base - 27, 10, 27);
        for (const side of [-1, 1]) { const x = cx + side * (r + 12); ctx.fillRect(x - 3, base - 112, 6, 112); ctx.beginPath(); ctx.moveTo(x - 6, base - 112); ctx.lineTo(x, base - 128); ctx.lineTo(x + 6, base - 112); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 7, base - 83, 14, 3); }
      }
      // Bosphorus waterline and ferry silhouettes.
      ctx.fillStyle = 'rgba(35,87,111,0.34)'; ctx.fillRect(0, horizon - 3, width, 25);
      const ferryX = ((this.flameTimer * 24) % (width + 120)) - 120; ctx.fillStyle = '#172536'; ctx.fillRect(ferryX, horizon - 25, 78, 13); ctx.beginPath(); ctx.moveTo(ferryX + 12, horizon - 25); ctx.lineTo(ferryX + 24, horizon - 36); ctx.lineTo(ferryX + 60, horizon - 36); ctx.lineTo(ferryX + 70, horizon - 25); ctx.fill();
    } else if (city === 'paris') {
      // Eiffel Tower: tapered lattice silhouette with four legs and cross-bracing.
      const ex = width * .70 - parallax * .45; const base = horizon + 2; const top = height * .29;
      ctx.strokeStyle = '#273447'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 48, base); ctx.lineTo(ex - 4, top); ctx.lineTo(ex + 4, top); ctx.lineTo(ex + 48, base); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 30, base - 38); ctx.lineTo(ex + 30, base - 38); ctx.moveTo(ex - 19, base - 83); ctx.lineTo(ex + 19, base - 83); ctx.moveTo(ex - 10, base - 127); ctx.lineTo(ex + 10, base - 127); ctx.stroke();
      for (let y = base - 25; y > top + 8; y -= 17) { const half = 45 * (y - top) / (base - top); ctx.beginPath(); ctx.moveTo(ex - half, y); ctx.lineTo(ex + half, y); ctx.stroke(); }
      ctx.fillStyle = '#273447'; ctx.fillRect(ex - 6, top - 10, 12, 12);
      // Paris rooftops.
      for (let i = 0; i < 8; i++) { const x = i * width / 8; const y = horizon - 48 - (i % 3) * 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 25, y - 18); ctx.lineTo(x + 50, y); ctx.fill(); }
    } else {
      // Prague old town: steep slate roofs, clock tower and warm stone facades.
      for (let i = 0; i < 7; i++) { const x = i * width / 7; const bw = width / 7 - 5; const bh = 72 + (i % 3) * 19; ctx.fillStyle = '#34404a'; ctx.fillRect(x, horizon - bh, bw, bh); ctx.fillStyle = '#202b39'; ctx.beginPath(); ctx.moveTo(x - 4, horizon - bh); ctx.lineTo(x + bw / 2, horizon - bh - 44); ctx.lineTo(x + bw + 4, horizon - bh); ctx.fill(); }
      const tx = width * .52; ctx.fillStyle = '#3a4650'; ctx.fillRect(tx, horizon - 154, 46, 154); ctx.beginPath(); ctx.moveTo(tx - 5, horizon - 154); ctx.lineTo(tx + 23, horizon - 195); ctx.lineTo(tx + 51, horizon - 154); ctx.fill();
      ctx.strokeStyle = '#d8c49b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx + 23, horizon - 115, 13, 0, Math.PI * 2); ctx.stroke();
    }
    // Sparse animated traffic lights keep the skyline alive without clutter.
    ctx.restore();
  }

  /** Warm desert dawn: layered dunes, caravan silhouettes, palms and Bedouin tents. */
  private renderDesertSunrise(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const sunX = width * 0.72; const sunR = Math.min(width, height) * 0.19;
    const sunY = height * 0.755; const horizonY = sunY - sunR * 0.52;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.18, sunX, sunY, sunR * 2.8);
    halo.addColorStop(0, 'rgba(255,190,105,0.40)'); halo.addColorStop(0.38, 'rgba(255,133,65,0.20)'); halo.addColorStop(1, 'rgba(255,110,55,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height * 0.82);
    const sun = ctx.createRadialGradient(sunX - sunR * 0.22, sunY - sunR * 0.28, sunR * 0.08, sunX, sunY, sunR);
    sun.addColorStop(0, '#fff2c6'); sun.addColorStop(0.55, '#ffbd72'); sun.addColorStop(1, '#f07845');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, horizonY); ctx.clip();
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.restore();
    // Distant dune contours are broad, softly graded masses rather than geometric triangles.
    const dunes = [
      { y: 0.63, amp: 30, color: '#9d5940', phase: 0.3 },
      { y: 0.70, amp: 42, color: '#754333', phase: 1.8 },
      { y: 0.77, amp: 35, color: '#4a3029', phase: 3.2 },
    ];
    dunes.forEach((d, idx) => {
      ctx.beginPath(); ctx.moveTo(0, height * d.y);
      for (let x = 0; x <= width + 20; x += 18) {
        const y = height * d.y + Math.sin(x * 0.006 + d.phase) * d.amp + Math.sin(x * 0.014 + d.phase * 2) * d.amp * 0.22;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
      const g = ctx.createLinearGradient(0, height * d.y - d.amp, 0, height);
      g.addColorStop(0, idx === 0 ? '#d28a55' : d.color); g.addColorStop(1, '#21171a');
      ctx.fillStyle = g; ctx.fill();
    });
    // Distant caravan: tiny readable camel profiles moving along the ridge.
    const drift = (this.flameTimer * 10) % (width + 180);
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 115 + drift) % (width + 180)) - 90;
      const cy = height * (0.655 + (i % 2) * 0.025) + Math.sin(cx * 0.006) * 15;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(0.58 + (i % 3) * 0.08, 0.58 + (i % 3) * 0.08);
      ctx.fillStyle = 'rgba(30,20,22,0.92)';
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-7, -11, 7, 0, Math.PI * 2); ctx.arc(11, -10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(17, -7); ctx.quadraticCurveTo(28, -21, 25, -28); ctx.lineTo(30, -30); ctx.quadraticCurveTo(34, -14, 24, -3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,22,0.95)'; ctx.lineWidth = 3;
      for (const leg of [-15, -5, 10, 18]) { const swing = Math.sin(this.flameTimer * 4 + i + leg) * 3; ctx.beginPath(); ctx.moveTo(leg, 4); ctx.lineTo(leg + swing, 18); ctx.stroke(); }
      ctx.restore();
    }
    // Bedouin tents as low black canvas silhouettes.
    for (let i = 0; i < 3; i++) {
      const tx = width * (0.16 + i * 0.27); const ty = height * (0.715 + (i % 2) * 0.025); const sc = 0.7 + (i % 2) * 0.18;
      ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc); ctx.fillStyle = 'rgba(24,17,20,0.88)';
      ctx.beginPath(); ctx.moveTo(-42, 8); ctx.lineTo(0, -27); ctx.lineTo(42, 8); ctx.closePath(); ctx.fill();
      ctx.fillRect(-42, 7, 84, 5); ctx.strokeStyle = 'rgba(25,18,20,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-32, 7); ctx.lineTo(-48, 22); ctx.moveTo(32, 7); ctx.lineTo(48, 22); ctx.stroke(); ctx.restore();
    }
    // Palm silhouettes at the far horizon, with curved fronds.
    for (let i = 0; i < 5; i++) {
      const px = width * (0.04 + i * 0.23); const py = height * (0.70 + (i % 2) * 0.02); const h = 42 + (i % 3) * 12;
      ctx.save(); ctx.translate(px, py); ctx.strokeStyle = 'rgba(24,18,21,0.94)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, -h * 0.5, -2, -h); ctx.stroke();
      ctx.lineWidth = 3;
      for (let f = 0; f < 7; f++) { const a = (f / 7) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-2, -h); ctx.quadraticCurveTo(Math.cos(a) * 18, -h - 19, Math.cos(a) * 32, -h + Math.sin(a) * 14); ctx.stroke(); }
      ctx.restore();
    }
  }

  /** Full-viewport weather is rendered in screen space so camera transforms cannot crop it. */
  private renderWeatherOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const stormStages = [5, 7, 8, 15, 16];
    const storm = stormStages.includes(this.currentStageIndex);
    const desert = [2, 6, 12, 17].includes(this.currentStageIndex);
    ctx.save();
    // Soft cloud banks add depth without hiding the moon or combat silhouettes.
    for (let cloud = 0; cloud < 6; cloud++) {
      const cx = ((cloud * 257 + this.flameTimer * (5 + cloud * 1.7)) % (width + 420)) - 210;
      const cy = 58 + cloud * 39;
      ctx.fillStyle = `rgba(80,103,129,${storm ? 0.105 : 0.045})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, 128, 18, 0, 0, Math.PI * 2); ctx.ellipse(cx + 42, cy - 8, 66, 21, 0, 0, Math.PI * 2); ctx.ellipse(cx - 50, cy + 5, 57, 15, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (storm) {
      ctx.fillStyle = 'rgba(19,39,58,0.075)'; ctx.fillRect(0, 0, width, height);
      const rainCount = Math.min(340, Math.max(190, Math.floor(width * height / 2300)));
      for (let i = 0; i < rainCount; i++) {
        const x = (i * 83.17 + this.flameTimer * 410) % (width + 52) - 26;
        const y = (i * 47.31 + this.flameTimer * 760) % (height + 64) - 32;
        const length = 12 + (i % 5) * 4;
        const drop = ctx.createLinearGradient(x, y, x - 4, y + length);
        drop.addColorStop(0, 'rgba(210,232,250,0)');
        drop.addColorStop(0.22, 'rgba(210,232,250,0.18)');
        drop.addColorStop(0.78, 'rgba(210,232,250,0.48)');
        drop.addColorStop(1, 'rgba(210,232,250,0)');
        ctx.fillStyle = drop;
        ctx.beginPath(); ctx.moveTo(x - 1.8, y); ctx.quadraticCurveTo(x + 0.4, y + length * 0.48, x - 4, y + length);
        ctx.quadraticCurveTo(x - 2.2, y + length * 0.42, x - 1.8, y); ctx.fill();
      }
      // Rare branching lightning flashes, followed by a short fading sky illumination.
      const thunderElapsed = this.flameTimer + this.currentStageIndex * 1.73;
      const thunderCycle = Math.floor(thunderElapsed / 13.5);
      const cycle = thunderElapsed % 13.5;
      if (cycle < 0.16 && thunderCycle !== this.lastThunderCycle) {
        this.lastThunderCycle = thunderCycle;
        soundManager.playThunder();
        const lx = width * (0.22 + (this.currentStageIndex % 4) * 0.17);
        ctx.fillStyle = `rgba(205,225,255,${0.10 * (1 - cycle / 0.16)})`; ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = `rgba(220,239,255,${0.85 * (1 - cycle / 0.16)})`; ctx.lineWidth = 2.2; ctx.shadowColor = '#dbeafe'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 22, height * 0.16); ctx.lineTo(lx + 8, height * 0.24); ctx.lineTo(lx - 34, height * 0.42); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    if (desert) {
      // Wind-driven fine sand veils the lower and middle playfield, not just the sky.
      const veil = ctx.createLinearGradient(0, height * 0.32, 0, height);
      veil.addColorStop(0, 'rgba(224,174,103,0)'); veil.addColorStop(1, 'rgba(224,174,103,0.11)');
      ctx.fillStyle = veil; ctx.fillRect(0, height * 0.32, width, height * 0.68);
      for (let i = 0; i < 150; i++) {
        const x = (i * 71 + this.flameTimer * (95 + i % 4 * 13)) % (width + 28) - 14;
        const y = height * 0.40 + ((i * 53) % Math.max(1, Math.floor(height * 0.58)));
        const r = 0.8 + (i % 4) * 0.55;
        ctx.fillStyle = `rgba(255,220,166,${0.08 + (i % 5) * 0.025})`;
        ctx.beginPath(); ctx.ellipse(x, y, r * 2.8, r, -0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Spawn and animate occasional ravens across the moonlit sky. */
  private updateCrows(dt: number) {
    this.crowSpawnTimer -= dt;
    if (this.crowSpawnTimer <= 0) {
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      this.crows.push({
        x: direction === 1 ? -55 : this.viewportWidth + 55,
        y: 75 + Math.random() * 145,
        speed: 72 + Math.random() * 58,
        scale: 0.55 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        direction,
      });
      if (Math.random() < 0.42) soundManager.playCrowCall();
      this.crowSpawnTimer = 16 + Math.random() * 14;
    }
    for (const crow of this.crows) {
      crow.x += crow.speed * crow.direction * dt;
      crow.phase += dt * (8 + crow.speed * 0.025);
      crow.y += Math.sin(crow.phase * 0.22) * 2.2 * dt;
    }
    this.crows = this.crows.filter(c => c.direction === 1 ? c.x < this.viewportWidth + 90 : c.x > -90);
  }

  /** Elegant near-black raven silhouettes with articulated, flapping wings. */
  /** A rare, layered fortress with warm windows and tiny moving silhouettes. */
  private renderDistantCastle(ctx: CanvasRenderingContext2D, width: number, height: number, paletteAccent: string) {
    if (![2, 7, 15].includes(this.currentStageIndex)) return;
    const x = width * 0.72 - this.cameraX * 0.035;
    const y = height * 0.60;
    const scale = Math.max(0.62, Math.min(1.05, width / 900));
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#10182b';
    // Main keep and stepped curtain walls.
    ctx.beginPath(); ctx.moveTo(-175, 78); ctx.lineTo(-160, -15); ctx.lineTo(-112, -15); ctx.lineTo(-104, -76); ctx.lineTo(-63, -76); ctx.lineTo(-55, -18); ctx.lineTo(56, -18); ctx.lineTo(65, -90); ctx.lineTo(110, -90); ctx.lineTo(119, -18); ctx.lineTo(163, -18); ctx.lineTo(176, 78); ctx.closePath(); ctx.fill();
    ctx.fillRect(-205, 38, 410, 42);
    // crenellations
    for (let i = -5; i <= 5; i++) ctx.fillRect(i * 34 - 9, 28, 18, 17);
    // Warm windows with animated silhouettes crossing behind the glass.
    for (let row = 0; row < 2; row++) for (let col = 0; col < 7; col++) {
      const wx = -145 + col * 47; const wy = row === 0 ? -2 : 43;
      ctx.fillStyle = (col + row) % 3 === 0 ? 'rgba(255,190,112,0.95)' : 'rgba(255,211,145,0.72)';
      ctx.shadowColor = '#ffb45f'; ctx.shadowBlur = 12;
      ctx.fillRect(wx, wy, 10, 21); ctx.shadowBlur = 0;
      const crossing = (this.stageSceneTimer - 0.55 - col * 0.16 - row * 0.24) / 1.8;
      if (crossing >= 0 && crossing <= 1) {
        const walk = -7 + crossing * 24;
        ctx.fillStyle = 'rgba(25,18,27,0.82)';
        ctx.beginPath(); ctx.arc(wx + 5 + walk, wy + 8, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(wx + 3 + walk, wy + 10, 4, 8);
      }
    }
    ctx.strokeStyle = paletteAccent; ctx.globalAlpha = 0.24; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-210, 79); ctx.lineTo(210, 79); ctx.stroke();
    ctx.restore();
  }

  private renderCrows(ctx: CanvasRenderingContext2D) {
    for (const crow of this.crows) {
      const flap = Math.sin(crow.phase) * 0.72;
      ctx.save();
      ctx.translate(crow.x, crow.y);
      ctx.scale(crow.scale * crow.direction, crow.scale);
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#02040a';
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 5;
      // Body and pointed tail
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 4, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-7, 1); ctx.lineTo(-20, 5); ctx.lineTo(-10, -2); ctx.closePath(); ctx.fill();
      // Head and beak
      ctx.beginPath(); ctx.arc(9, -2, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(18, -1); ctx.lineTo(11, 0); ctx.closePath(); ctx.fill();
      // Wings fold down and sweep up in a natural alternating flap.
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.quadraticCurveTo(-13, -9 - flap * 12, -27, -5 - flap * 18);
      ctx.quadraticCurveTo(-18, 1 - flap * 5, -5, 3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(12, -9 - flap * 12, 26, -5 - flap * 18);
      ctx.quadraticCurveTo(17, 1 - flap * 5, 5, 3);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  /** Volumetric desert dust devils: layered translucent sand, never wireframe rings. */
  private renderSandWhirlwinds(ctx: CanvasRenderingContext2D, left: number, right: number) {
    const first = Math.floor(left / 1900) - 1;
    const last = Math.ceil(right / 1900) + 1;
    for (let n = first; n <= last; n++) {
      const x = n * 1900 + 1180;
      const phase = this.flameTimer * 0.72 + n * 2.3;
      const h = 150 + (Math.sin(phase * 0.45) + 1) * 42;
      const baseW = 54 + Math.sin(phase * 0.8) * 8;
      ctx.save(); ctx.translate(x, this.groundY - 3);
      ctx.globalCompositeOperation = 'screen';
      const body = ctx.createLinearGradient(-baseW, -h, baseW, 0);
      body.addColorStop(0, 'rgba(190,126,65,0)');
      body.addColorStop(0.22, 'rgba(218,163,94,0.10)');
      body.addColorStop(0.52, 'rgba(246,203,139,0.25)');
      body.addColorStop(0.78, 'rgba(205,143,76,0.14)');
      body.addColorStop(1, 'rgba(190,126,65,0)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-baseW * 1.35, 0);
      ctx.bezierCurveTo(-baseW * 0.45, -h * 0.28, -baseW * 0.9, -h * 0.70, -baseW * 0.18, -h);
      ctx.quadraticCurveTo(baseW * 0.18, -h * 0.94, baseW * 0.32, -h * 0.70);
      ctx.bezierCurveTo(baseW * 0.88, -h * 0.40, baseW * 0.48, -h * 0.18, baseW * 1.35, 0);
      ctx.closePath(); ctx.fill();
      for (let layer = 0; layer < 8; layer++) {
        const t = layer / 7;
        const yy = -h * (0.08 + t * 0.82);
        const widthAtY = baseW * (1.05 - t * 0.78);
        const sway = Math.sin(phase * 1.7 + layer * 0.9) * (8 + t * 15);
        const glow = ctx.createRadialGradient(sway, yy, 1, sway, yy, widthAtY * 1.8);
        glow.addColorStop(0, 'rgba(255,222,166,0.15)'); glow.addColorStop(1, 'rgba(255,222,166,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(sway, yy, widthAtY * 1.8, 9 + (1 - t) * 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (let mote = 0; mote < 34; mote++) {
        const t = (mote / 34 + this.flameTimer * 0.12 + n * 0.17) % 1;
        const yy = -h * t;
        const orbit = (1 - t) * baseW * (0.35 + (mote % 5) * 0.10);
        const xx = Math.sin(phase * 2.1 + t * 13 + mote) * orbit;
        ctx.fillStyle = `rgba(255,220,166,${0.10 + (mote % 4) * 0.035})`;
        ctx.beginPath(); ctx.ellipse(xx, yy, 1.2 + (mote % 3) * 0.6, 2.2 + (mote % 3), phase, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Render shooting stars & incandescent meteors across cosmic sky
   */
  private renderMeteors(ctx: CanvasRenderingContext2D) {
    for (const m of this.meteors) {
      ctx.save();
      const alpha = Math.max(0, m.life / m.maxLife);
      ctx.globalAlpha = alpha;

      const normX = m.vx / Math.hypot(m.vx, m.vy);
      const normY = m.vy / Math.hypot(m.vx, m.vy);
      const tailX = m.x - normX * m.length;
      const tailY = m.y - normY * m.length;

      // Gradient Comet Tail
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#38bdf8');
      grad.addColorStop(0.65, '#0284c7');
      grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.thickness;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // White-Hot Meteor Head
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.thickness * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Render Low Misty Predator Eyes (Just above ground level in the low dark mist)
   */
  private renderLowMistyEyes(ctx: CanvasRenderingContext2D) {
    for (const eye of this.lowEyes) {
      if (eye.alpha <= 0.01) continue;

      // Anchored to world X with ground-level Y offset (low mist, NOT in sky!)
      const eyeX = eye.normX;
      const eyeY = this.groundY - eye.yOffset;

      ctx.save();
      ctx.globalAlpha = eye.alpha;

      // Neon white with subtle cyan sheen
      ctx.fillStyle = '#e0f2fe';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;

      const eyeW = eye.size * 2.2;
      const eyeH = eye.size;

      // Left Eye
      ctx.beginPath();
      ctx.ellipse(eyeX - eye.gap / 2, eyeY, eyeW, eyeH, -0.12, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      ctx.ellipse(eyeX + eye.gap / 2, eyeY, eyeW, eyeH, 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Sharp inner slit pupil
      ctx.fillStyle = '#020617';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(eyeX - eye.gap / 2, eyeY, 0.8, eyeH * 0.9, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeX + eye.gap / 2, eyeY, 0.8, eyeH * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Render Collectible Tokens on Road / Platforms (Flight Rune & Stamina Core)
   */
  private renderWorldTokens(ctx: CanvasRenderingContext2D) {
    for (const token of this.worldTokens) {
      if (!token.active) continue;

      ctx.save();
      ctx.translate(token.x, token.y);

      if (token.type === 'flight') {
        // 1. Winged Aero-Flight Rune (Cyan & Electric Blue)
        const spin = token.floatTimer * 1.5;

        // Rotating outer hardlight ring
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Dual Ethereal Wings of Flight
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.quadraticCurveTo(-26, -14, -30, -4);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.quadraticCurveTo(26, -14, 30, -4);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();

        // Inner Incandescent Diamond Core
        ctx.save();
        ctx.rotate(spin);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      } else {
        // 2. Vitality / Stamina Core (Warm Golden-Emerald Pulse)
        const pulse = 14 + Math.sin(token.floatTimer * 2) * 3;

        // Outer Golden Pulse
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, pulse + 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner Vitality Core Orb
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Vitality Cross Rune
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-2.5, -8, 5, 16);
        ctx.fillRect(-8, -2.5, 16, 5);
      }

      ctx.restore();
    }
  }

  /**
   * Platforms with brilliant luminous neon cyan strips and laser core
   */
  private renderNeonPlatforms(ctx: CanvasRenderingContext2D) {
    for (const plat of this.platforms) {
      // Obsidian slab body
      ctx.fillStyle = '#050a18';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

      // Bottom subtle border
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(plat.x, plat.y + plat.height - 2, plat.width, 2);

      // 1. Brilliant Luminous Neon Cyan Top Strip
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.fillRect(plat.x, plat.y, plat.width, 4);

      // 2. White-Hot Laser Core Line
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(plat.x + 6, plat.y + 1, plat.width - 12, 2);

      // 3. Neon Edge Accent Brackets
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(plat.x, plat.y, 4, plat.height);
      ctx.fillRect(plat.x + plat.width - 4, plat.y, 4, plat.height);
      ctx.shadowBlur = 0;
    }
  }

  // ==========================================
  // HERO RENDERING (HORIZONTAL FLIGHT / NORMAL)
  // ==========================================
  private renderHeroFlame(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const flicker1 = Math.sin(this.flameTimer * 16) * 4;
    const solar = this.flameSkin === 'solar';
    const flicker2 = Math.cos(this.flameTimer * (solar ? 27 : 22)) * 5;
    const outerTop = solar ? '#fff5c7' : '#dffcff';
    const outerMid = solar ? '#ffcf70' : '#67e8f9';
    const outerDeep = solar ? '#f97316' : '#0284c7';
    const innerMid = solar ? '#fbbf24' : '#67e8f9';
    const innerDeep = solar ? '#ea580c' : '#06b6d4';
    const glowColor = solar ? '#fb923c' : '#0ea5e9';

    // HORIZONTAL SUPERSONIC ROCKET FLIGHT (عند الحصول على التوكن تنقلب الشخصية افقياً)
    if (this.isHorizontalFlightActive) {
      // Rotate 90 degrees horizontally pointing forward in facing direction!
      ctx.rotate(this.facing === 1 ? Math.PI / 2 : -Math.PI / 2);
      ctx.scale(1.7, 0.75); // Stretched sleek horizontal missile profile

      // Supersonic Shockwave Cones behind horizontal rocket
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 24, 22, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 36, 32, 0, Math.PI);
      ctx.stroke();
    } else {
      let scaleX = 1.0;
      let scaleY = 1.0;
      if (this.isDashing) {
        scaleX = 1.6;
        scaleY = 0.65;
      } else if (!this.isGrounded) {
        scaleY = 1.25;
        scaleX = 0.82;
      }
      ctx.scale(scaleX * this.facing, scaleY);
    }

    // Orbital Wisps: unlockable rotating guard-blades around the hero.
    if (false && this.skills.orbitalWisps > 1 && !this.isHorizontalFlightActive) {
      const wispCount = Math.min(5, 2 + this.skills.orbitalWisps);
      for (let i = 0; i < wispCount; i++) {
        const angle = this.flameTimer * 2.4 + (i / wispCount) * Math.PI * 2;
        const ox = Math.cos(angle) * 43;
        const oy = -4 + Math.sin(angle) * 25;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = '#a5f3fc'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 0); ctx.lineTo(0, 10); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
      if (this.orbitalWispCooldown > 0) {
        ctx.strokeStyle = 'rgba(103,232,249,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 51, 34, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // 1. Soft volumetric halo around the living flame.
    const halo = ctx.createRadialGradient(0, -7, 4, 0, -5, 58);
    halo.addColorStop(0, solar ? 'rgba(255,220,130,0.38)' : 'rgba(103,232,249,0.34)');
    halo.addColorStop(0.48, solar ? 'rgba(249,115,22,0.20)' : 'rgba(14,165,233,0.18)');
    halo.addColorStop(1, solar ? 'rgba(194,65,12,0)' : 'rgba(2,132,199,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.ellipse(0, -5, 58, 66, 0, 0, Math.PI * 2); ctx.fill();

    // 2. Outer sapphire shell: tapered, asymmetrical edges create a less rigid flame silhouette.
    const outerFire = ctx.createLinearGradient(0, -48, 0, 30);
    outerFire.addColorStop(0, outerTop);
    outerFire.addColorStop(0.18, outerMid);
    outerFire.addColorStop(0.55, outerDeep);
    outerFire.addColorStop(1, solar ? '#7c2d12' : '#082f63');
    ctx.fillStyle = outerFire;
    ctx.shadowColor = glowColor; ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(0, 29);
    ctx.bezierCurveTo(-30 + flicker1, 19, -31 + flicker2, -8, -13 + flicker1 * 0.35, -29 + flicker2);
    ctx.bezierCurveTo(-10 + flicker1, -15, -7, -34 + flicker1, 2, -49 + flicker2);
    ctx.bezierCurveTo(5, -31, 20 + flicker2, -24, 16 + flicker1, -8);
    ctx.bezierCurveTo(34 + flicker2, 7, 23 + flicker1, 23, 0, 29);
    ctx.fill();

    // 3. Animated cyan tongues licking upward from the body.
    ctx.save(); ctx.globalAlpha = 0.78; ctx.shadowColor = solar ? '#f97316' : '#22d3ee'; ctx.shadowBlur = solar ? 20 : 15;
    ctx.fillStyle = solar ? '#f59e0b' : '#22d3ee';
    const tongueLift = Math.sin(this.flameTimer * 19) * 5;
    ctx.beginPath(); ctx.moveTo(-13, 17); ctx.bezierCurveTo(-23, 2, -8, -10 - tongueLift, -7, -27 - tongueLift); ctx.bezierCurveTo(4, -12, -1, 4, -13, 17); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 19); ctx.bezierCurveTo(21, 4, 8, -9 + tongueLift, 13, -31 + tongueLift); ctx.bezierCurveTo(25, -12, 24, 7, 10, 19); ctx.fill();
    ctx.restore();

    // 4. Hot cyan inner body with a bright center and darker molten edge.
    const innerFire = ctx.createLinearGradient(-16, -34, 15, 24);
    innerFire.addColorStop(0, solar ? '#fff7d6' : '#ecfeff');
    innerFire.addColorStop(0.3, innerMid);
    innerFire.addColorStop(0.72, innerDeep);
    innerFire.addColorStop(1, solar ? '#9a3412' : '#0369a1');
    ctx.fillStyle = innerFire;
    ctx.shadowColor = solar ? '#fb923c' : '#00f0ff'; ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(0, 23);
    ctx.bezierCurveTo(-19 + flicker2, 11, -19 - flicker1, -9, 0, -37 + flicker2);
    ctx.bezierCurveTo(18 - flicker1, -10, 20 + flicker2, 10, 0, 23);
    ctx.fill();

    // 5. White-hot plasma core, narrow at the base and dancing at the tip.
    const coreFire = ctx.createLinearGradient(0, -27, 0, 18);
    coreFire.addColorStop(0, '#ffffff'); coreFire.addColorStop(0.58, solar ? '#fff1b8' : '#ecfeff'); coreFire.addColorStop(1, solar ? '#fdba74' : '#a5f3fc');
    ctx.fillStyle = coreFire;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 17;
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.bezierCurveTo(-11, 7, -9 + flicker1 * 0.25, -7, 1 + flicker2 * 0.25, -27 + tongueLift * 0.45);
    ctx.bezierCurveTo(12, -8, 10, 7, 0, 17);
    ctx.fill();

    // Fine incandescent filaments add motion without creating persistent screen-space trails.
    ctx.save(); ctx.globalAlpha = 0.62; ctx.strokeStyle = solar ? '#fff0bd' : '#e0fbff'; ctx.lineWidth = 1.2; ctx.shadowColor = solar ? '#fb923c' : '#67e8f9'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-8, 12); ctx.quadraticCurveTo(-15 + flicker1, -4, -5 + tongueLift * 0.25, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 13); ctx.quadraticCurveTo(15 + flicker2, -2, 8 - tongueLift * 0.2, -24); ctx.stroke();
    ctx.restore();

    // Solar variant: a few short-lived incandescent motes orbit the flame core.
    if (solar) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let ember = 0; ember < 5; ember++) {
        const phase = this.flameTimer * (2.8 + ember * 0.13) + ember * Math.PI * 0.4;
        const ex = Math.cos(phase) * (24 + (ember % 2) * 9);
        const ey = -8 + Math.sin(phase * 1.25) * (25 + (ember % 3) * 3);
        const r = 1.6 + (ember % 3) * 0.7;
        ctx.fillStyle = ember % 2 ? '#fff0b0' : '#fb923c'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 11;
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 4. Twin Soul Eyes
    ctx.fillStyle = solar ? '#9a3412' : '#0284c7';
    ctx.beginPath();
    ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
    ctx.arc(10, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Katana-style sword draw and three distinct cinematic cutting arcs.
    if (!this.isReunited && !this.isHorizontalFlightActive) {
      ctx.save();
      const progress = this.isSlashing ? Math.max(0, Math.min(1, 1 - this.slashTimer / 0.25)) : 0;
      const bladeOffset = this.isSlashing ? 34 + Math.sin(progress * Math.PI) * 17 : 25;
      const idleAngle = Math.sin(this.flameTimer * 2.8) * 0.09;
      const bladeRot = !this.isSlashing ? idleAngle : this.slashDirection === 'rising'
        ? 1.55 - progress * 3.1
        : this.slashDirection === 'descending'
          ? -1.55 + progress * 3.1
          : this.activeSlashStep === 1
            ? 1.95 - progress * 3.75
            : this.activeSlashStep === 2 ? -2.35 + progress * 4.65 : -1.75 + progress * 3.05;
      ctx.translate(bladeOffset, -7);

      if (this.isSlashing) {
        // Crescent trail follows the blade tip; heavy finisher gets a wider, brighter arc.
        ctx.save();
        ctx.rotate(bladeRot - (this.activeSlashStep === 1 ? 0.72 : -0.72));
        ctx.strokeStyle = this.activeSlashStep === 0 ? 'rgba(125,211,252,0.72)' : 'rgba(224,242,254,0.9)';
        ctx.lineWidth = this.activeSlashStep === 2 ? 8 : 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = this.activeSlashStep === 2 ? 26 : 16;
        ctx.beginPath();
        const arcStart = this.slashDirection === 'rising' ? -2.05 : this.slashDirection === 'descending' ? -0.25 : -1.05;
        const arcEnd = this.slashDirection === 'rising' ? 0.55 : this.slashDirection === 'descending' ? 2.05 : 0.78;
        ctx.arc(0, 0, this.activeSlashStep === 2 ? 72 : 61, arcStart, arcEnd);
        ctx.stroke();
        ctx.restore();
      }

      ctx.rotate(bladeRot);
      // Polished katana blade with a bright edge and dark wrapped grip.
      ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 20;
      const bladeGrad = ctx.createLinearGradient(0, -58, 7, -8);
      bladeGrad.addColorStop(0, '#ffffff'); bladeGrad.addColorStop(0.45, '#bae6fd'); bladeGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(0, -58); ctx.lineTo(7, -52); ctx.lineTo(6, -8); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2, -53); ctx.lineTo(2, -10); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = '#172033';
      ctx.fillRect(-7, -7, 20, 4);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(-1, -3, 7, 15);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      for (let wrap = 0; wrap < 3; wrap++) { ctx.beginPath(); ctx.moveTo(-1, wrap * 4); ctx.lineTo(6, wrap * 4 + 3); ctx.stroke(); }
      ctx.restore();
    }

    // 6. Soft protective ward: a subtle luminous shell that vanishes with its timer.
    if (this.isParrying) {
      const pulse = 1 + Math.sin(this.flameTimer * 5) * 0.025;
      const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 72);
      aura.addColorStop(0, 'rgba(110,245,220,0.015)');
      aura.addColorStop(0.68, 'rgba(110,245,220,0.09)');
      aura.addColorStop(0.9, 'rgba(125,255,231,0.19)');
      aura.addColorStop(1, 'rgba(125,255,231,0)');
      ctx.fillStyle = aura; ctx.beginPath(); ctx.ellipse(0, 0, 58 * pulse, 70 * pulse, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(167,243,228,0.42)'; ctx.lineWidth = 1.5; ctx.shadowColor = '#6ee7d8'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(0, 0, 48 * pulse, 61 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Azure Flame skill aura; restrained sparks stay attached to the hero and expire quickly.
    if (this.azureFlameTimer > 0) {
      const pulse = 1 + Math.sin(this.flameTimer * 9) * 0.06;
      const flameAura = ctx.createRadialGradient(0, 0, 8, 0, 0, 66);
      flameAura.addColorStop(0, 'rgba(34,211,238,0.02)');
      flameAura.addColorStop(0.55, 'rgba(34,211,238,0.12)');
      flameAura.addColorStop(0.82, 'rgba(103,232,249,0.22)');
      flameAura.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = flameAura; ctx.beginPath(); ctx.ellipse(0, -4, 58 * pulse, 69 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // MASTERPIECE LIVING FLAME ENEMY RENDERING
  // ==========================================
  private renderMasterpieceEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy2D) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const isFlashing = enemy.flashTimer > 0;
    const isWindup = enemy.state === 'windup';
    const breath = Math.sin(enemy.animTimer * 6) * 3;
    const runBob = enemy.state === 'chase' ? Math.abs(Math.sin(enemy.animTimer * 10)) * 3.5 : 0;
    const flicker1 = Math.sin(this.flameTimer * 18 + enemy.id) * 4;
    const flicker2 = Math.cos(this.flameTimer * 24 + enemy.id) * 5;

    // Ground contact shadow and a distinct boss arena aura, both animated independently.
    ctx.save();
    ctx.globalAlpha = enemy.isBoss ? 0.38 : 0.22;
    ctx.fillStyle = enemy.isBoss ? '#fb7185' : '#020617';
    ctx.shadowColor = enemy.isBoss ? '#f43f5e' : '#000000';
    ctx.shadowBlur = enemy.isBoss ? 30 : 12;
    ctx.beginPath();
    ctx.ellipse(0, enemy.height * 0.42, enemy.width * (enemy.isBoss ? 0.9 : 0.62), enemy.isBoss ? 13 : 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.isBoss) {
      const pulse = 1 + Math.sin(enemy.animTimer * 2.6) * 0.07;
      ctx.strokeStyle = 'rgba(251,113,133,0.62)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.ellipse(0, enemy.height * 0.37, enemy.width * 0.72 * pulse, 18 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = enemy.animTimer * 0.8 + i * Math.PI / 2;
        const ox = Math.cos(a) * enemy.width * 0.72;
        const oy = -enemy.height * 0.18 + Math.sin(a) * 18;
        ctx.fillStyle = i % 2 ? '#fbbf24' : '#fb7185';
        ctx.beginPath(); ctx.arc(ox, oy, 3.2 + Math.sin(enemy.animTimer * 5 + i) * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (isWindup) {
      ctx.strokeStyle = 'rgba(248,113,113,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.ellipse(0, enemy.height * 0.38, enemy.width * 0.85, 16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    ctx.translate(0, -runBob + breath * 0.25);
    ctx.scale(enemy.facing, 1);
    ctx.save();

    switch (enemy.type) {
      case 'crimson_wisp': {
        ctx.fillStyle = isFlashing ? '#ffffff' : 'rgba(220, 38, 38, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, 22);
        ctx.bezierCurveTo(-22 + flicker1, 12, -24 + flicker2, -12, 0, -36 + flicker1);
        ctx.bezierCurveTo(24 + flicker2, -12, 22 + flicker1, 12, 0, 22);
        ctx.fill();

        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(-8, -20);
        ctx.lineTo(-20, -38 + flicker1);
        ctx.lineTo(-4, -18);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(8, -20);
        ctx.lineTo(20, -38 + flicker1);
        ctx.lineTo(4, -18);
        ctx.fill();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#f97316';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, -5, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#fef08a';
        ctx.beginPath();
        ctx.ellipse(4, -6, 2.5, 4, 0.2, 0, Math.PI * 2);
        ctx.ellipse(10, -6, 2.5, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pyro_wolf': {
        const lScale = enemy.isBoss ? 1.7 : 1.25;
        ctx.scale(lScale, lScale);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#991b1b';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(-32, 10);
        ctx.quadraticCurveTo(-15, -24 + breath, 15, -16 + breath);
        ctx.lineTo(34, -4);
        ctx.lineTo(28, 6);
        ctx.lineTo(12, 6);
        ctx.lineTo(-24, 18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-10, -18 + breath);
        ctx.lineTo(-5, -34 + flicker1);
        ctx.lineTo(8, -16);
        ctx.lineTo(16, -30 + flicker2);
        ctx.lineTo(20, -10);
        ctx.fill();

        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(14, -18);
        ctx.lineTo(19, -32);
        ctx.lineTo(24, -16);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#facc15';
        ctx.beginPath();
        ctx.ellipse(22, -10 + breath * 0.5, 3.5, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'crimson_wraith': {
        ctx.scale(1.2, 1.2);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#581c87';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.bezierCurveTo(-26, -10, -30, 20, -14, 34 + flicker1);
        ctx.bezierCurveTo(0, 18, 12, 34 + flicker2, 22, 20);
        ctx.bezierCurveTo(28, -10, 22, -30, 0, -38);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4, -18, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#c084fc';
        ctx.beginPath();
        ctx.arc(3, -19, 2.8, 0, Math.PI * 2);
        ctx.arc(9, -19, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(22, -10);
        ctx.rotate(isWindup ? -0.8 : Math.sin(enemy.animTimer * 4) * 0.2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(0, 38);
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(-16, -26, 26, Math.PI * 1.5, Math.PI * 2.2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'magma_golem': {
        const gScale = enemy.isBoss ? 1.8 : 1.45;
        ctx.scale(gScale, gScale);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#1c1917';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(-34, -28);
        ctx.lineTo(34, -28);
        ctx.lineTo(26, 26);
        ctx.lineTo(-26, 26);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, -18);
        ctx.lineTo(0, 0);
        ctx.lineTo(-8, 18);
        ctx.moveTo(18, -18);
        ctx.lineTo(4, -4);
        ctx.lineTo(12, 16);
        ctx.stroke();

        ctx.fillStyle = isWindup ? '#ffffff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, -2, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.fillRect(-18, -38, 36, 12);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-10, -34, 20, 3.5);
        break;
      }

      case 'pyro_serpent': {
        const sScale = enemy.isBoss ? 1.7 : 1.25;
        ctx.scale(sScale, sScale);

        for (let seg = 5; seg >= 0; seg--) {
          const segOffset = Math.sin(enemy.animTimer * 8 + seg * 0.7) * 9;
          const sx = -seg * 14;
          const sy = segOffset;
          const sRad = 16 - seg * 1.8;

          ctx.fillStyle = isFlashing ? '#ffffff' : seg % 2 === 0 ? '#b45309' : '#d97706';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(8, 0, 16, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(18, -3, 14, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(22, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'ignis_knight': {
        ctx.scale(1.3, 1.3);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#0f172a';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(-18, -26);
        ctx.lineTo(18, -26);
        ctx.lineTo(14, 24);
        ctx.lineTo(-14, 24);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -32, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#ef4444';
        ctx.fillRect(-6, -34, 16, 3.5);

        ctx.save();
        ctx.translate(22, -10);
        ctx.rotate(isWindup ? -1.1 : Math.sin(enemy.animTimer * 5) * 0.2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, -38, 5, 55);
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.fillRect(-2, -38, 9, 36);
        ctx.restore();
        break;
      }

      case 'magma_floater': {
        ctx.scale(1.2, 1.2);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#292524';
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        for (let t = 0; t < 6; t++) {
          const tAng = (t / 6) * Math.PI * 2 + enemy.animTimer * 3;
          const tx = Math.cos(tAng) * (26 + Math.sin(enemy.animTimer * 8 + t) * 6);
          const ty = Math.sin(tAng) * (26 + Math.sin(enemy.animTimer * 8 + t) * 6);

          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(tAng) * 16, Math.sin(tAng) * 16);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }

        ctx.fillStyle = isFlashing ? '#ffffff' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#451a03';
        ctx.beginPath();
        ctx.ellipse(0, 0, isWindup ? 4 : 2.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pyre_drake': {
        ctx.scale(1.35, 1.35);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#991b1b';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 14, 0.2, 0, Math.PI * 2);
        ctx.fill();

        const wingFlap = Math.sin(enemy.animTimer * 9) * 22;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-24, -38 + wingFlap);
        ctx.lineTo(-2, -22);
        ctx.lineTo(12, -42 + wingFlap);
        ctx.lineTo(14, -5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(14, -8);
        ctx.lineTo(34, -3);
        ctx.lineTo(20, 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(22, -5, 3.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'dark_pyromancer': {
        ctx.scale(1.3, 1.3);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#3b0764';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(18, 30);
        ctx.lineTo(-18, 30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(0, -22, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isWindup ? '#ffffff' : '#e879f9';
        ctx.fillRect(-6, -24, 14, 3);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(18, -36);
        ctx.lineTo(18, 32);
        ctx.stroke();

        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(18, -38, 9, 0, Math.PI * 2);
        ctx.fill();

        for (let orb = 0; orb < 2; orb++) {
          const orbAng = enemy.animTimer * 4 + orb * Math.PI;
          const ox = Math.cos(orbAng) * 28;
          const oy = Math.sin(orbAng) * 14 - 10;
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(ox, oy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'abyssal_sovereign': {
        ctx.scale(2.0, 2.0);

        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(-28, -26);
        ctx.lineTo(-42, -54 + flicker1);
        ctx.lineTo(-18, -32);
        ctx.lineTo(0, -58 + flicker2);
        ctx.lineTo(18, -32);
        ctx.lineTo(42, -54 + flicker1);
        ctx.lineTo(28, -26);
        ctx.fill();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#09090b';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.moveTo(-38, -24);
        ctx.lineTo(38, -24);
        ctx.lineTo(28, 34);
        ctx.lineTo(-28, 34);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-14, -8);
        ctx.lineTo(0, 16);
        ctx.lineTo(14, -8);
        ctx.moveTo(-18, 6);
        ctx.lineTo(18, 6);
        ctx.stroke();

        ctx.fillStyle = isWindup ? '#ffffff' : '#fef08a';
        ctx.beginPath();
        ctx.ellipse(-8, -18, 5, 3, -0.2, 0, Math.PI * 2);
        ctx.ellipse(8, -18, 5, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    if (enemy.type === 'ignis_knight' || enemy.type === 'dark_pyromancer') {
      const stride = Math.sin(enemy.animTimer * 10) * (enemy.state === 'chase' ? 8 : 2);
      ctx.save();
      ctx.strokeStyle = enemy.type === 'ignis_knight' ? '#64748b' : '#581c87';
      ctx.lineWidth = enemy.isBoss ? 8 : 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, 18); ctx.lineTo(-12 - stride, 35);
      ctx.moveTo(9, 18); ctx.lineTo(12 + stride, 35);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // restore the shared body transform before elite detailing

    // Individually readable creature detailing: luminous chest cores, bevel highlights and armor seams.
    ctx.save();
    ctx.scale(enemy.facing, 1);
    const detailCoreY = -enemy.height * 0.39;
    const coreTint = enemy.type === 'dark_pyromancer' ? '#d8a7ff'
      : enemy.type === 'magma_golem' || enemy.type === 'pyro_serpent' ? '#ffb35c'
      : enemy.type === 'abyssal_sovereign' ? '#ff667e' : '#75eaff';
    const corePulse = 0.88 + (Math.sin(enemy.animTimer * 5.2) + 1) * 0.10;
    const coreGlow = ctx.createRadialGradient(0, detailCoreY, 1, 0, detailCoreY, enemy.isBoss ? 23 : 13);
    coreGlow.addColorStop(0, 'rgba(255,255,255,0.95)');
    coreGlow.addColorStop(0.22, coreTint);
    coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath(); ctx.arc(0, detailCoreY, (enemy.isBoss ? 23 : 13) * corePulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = coreTint; ctx.globalAlpha = 0.5; ctx.lineWidth = enemy.isBoss ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(-enemy.width * 0.22, -enemy.height * 0.18);
    ctx.lineTo(-enemy.width * 0.12, detailCoreY);
    ctx.lineTo(0, -enemy.height * 0.18);
    ctx.lineTo(enemy.width * 0.12, detailCoreY);
    ctx.lineTo(enemy.width * 0.22, -enemy.height * 0.18);
    ctx.stroke();
    if (enemy.isBoss) {
      // Layered shoulder plates and segmented chest armor make boss silhouettes distinct at a glance.
      ctx.globalAlpha = 0.78; ctx.lineWidth = 2.4;
      for (const side of [-1, 1]) {
        ctx.fillStyle = 'rgba(8,15,31,0.72)';
        ctx.beginPath();
        ctx.moveTo(side * enemy.width * 0.16, -enemy.height * 0.40);
        ctx.lineTo(side * enemy.width * 0.43, -enemy.height * 0.48);
        ctx.lineTo(side * enemy.width * 0.38, -enemy.height * 0.27);
        ctx.lineTo(side * enemy.width * 0.17, -enemy.height * 0.22);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = coreTint; ctx.beginPath();
        ctx.moveTo(side * enemy.width * 0.22, -enemy.height * 0.38);
        ctx.lineTo(side * enemy.width * 0.36, -enemy.height * 0.31); ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.55; ctx.strokeStyle = coreTint; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, detailCoreY, 7 * corePulse, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // High-contrast elite/boss silhouette details: crown horns, layered armor and pulsing core.
    if (enemy.isBoss) {
      const pulse = 0.85 + (Math.sin(enemy.animTimer * 4) + 1) * 0.12;
      ctx.save();
      ctx.scale(enemy.facing, 1);
      ctx.strokeStyle = isFlashing ? '#ffffff' : '#fbbf24';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(-enemy.width * 0.28, -enemy.height * 0.30);
      ctx.lineTo(-enemy.width * 0.42, -enemy.height * 0.62);
      ctx.lineTo(-enemy.width * 0.12, -enemy.height * 0.43);
      ctx.lineTo(0, -enemy.height * (0.72 + pulse * 0.05));
      ctx.lineTo(enemy.width * 0.12, -enemy.height * 0.43);
      ctx.lineTo(enemy.width * 0.42, -enemy.height * 0.62);
      ctx.lineTo(enemy.width * 0.28, -enemy.height * 0.30);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(251,191,36,0.72)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -enemy.height * 0.05, enemy.width * 0.28 * pulse, enemy.height * 0.24 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Animated ember motes orbit smaller enemies to give each silhouette more life.
      for (let i = 0; i < 2; i++) {
        const a = enemy.animTimer * (2.1 + i * 0.35) + enemy.id + i * Math.PI;
        ctx.fillStyle = i ? 'rgba(251,191,36,0.8)' : 'rgba(56,189,248,0.78)';
        ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(Math.cos(a) * enemy.width * 0.42, -enemy.height * 0.1 + Math.sin(a) * 12, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Health Bar
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(-22, -45, 44, 5);
    ctx.fillStyle = enemy.isBoss ? '#facc15' : '#ef4444';
    ctx.fillRect(-22, -45, 44 * hpPct, 5);

    ctx.restore();
  }

  // ==========================================
  // THE FLAME FAMILY SANCTUARY & TIGHT EMBRACE HUG
  // ==========================================
  private renderFlameFamily(ctx: CanvasRenderingContext2D) {
    const fx = this.familyAltarX;
    const fy = this.groundY - 30;

    ctx.save();
    ctx.translate(fx, fy);

    // Glowing Sacred Haven Arch
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, -60, 95, Math.PI, 0);
    ctx.stroke();

    const fFlicker = Math.sin(this.flameTimer * 14) * 4;
    
    // Tight Embrace Hug ("ويضمون بعضهم")
    const hugSpread = this.isReunited ? Math.max(12, 55 - this.reunionTimer * 30) : 55;
    const hugIncline = this.isReunited ? 0.35 : 0;
    const happyJump = this.isReunited ? Math.sin(this.reunionTimer * 12) * 16 : 0;

    // 1. Father Flame (Majestic Azure-Cyan Flame on Left)
    ctx.save();
    ctx.translate(-hugSpread, -20 - happyJump);
    ctx.rotate(hugIncline);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-26, 15, -28, -15, 0, -48 + fFlicker);
    ctx.bezierCurveTo(28, -15, 26, 15, 0, 26);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(-18, 10, -18, -10, 0, -36 + fFlicker);
    ctx.bezierCurveTo(18, -10, 18, 10, 0, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -6, 4, 4);
    ctx.fillRect(8, -6, 4, 4);
    ctx.restore();

    // 2. Mother Flame (Warm Golden-Violet Flame in Center)
    ctx.save();
    ctx.translate(0, -25 - happyJump * 0.9);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-24, 15, -26, -15, 0, -45 - fFlicker);
    ctx.bezierCurveTo(26, -15, 24, 15, 0, 26);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(-16, 10, -16, -10, 0, -32 - fFlicker);
    ctx.bezierCurveTo(16, -10, 16, 10, 0, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -5, 4, 4);
    ctx.fillRect(8, -5, 4, 4);
    ctx.restore();

    // 3. Little Sibling Flamelet (Tiny Sky-Blue Bouncy Flame on Right)
    ctx.save();
    const kidBounce = Math.sin(this.flameTimer * 10) * 12;
    ctx.translate(hugSpread, -5 - kidBounce - happyJump * 1.2);
    ctx.rotate(-hugIncline);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.bezierCurveTo(-12, 6, -12, -6, 0, -24 + fFlicker);
    ctx.bezierCurveTo(12, -6, 12, 6, 0, 15);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-1, -7, 3, 3);
    ctx.fillRect(4, -7, 3, 3);
    ctx.restore();

    // Warm loving embrace spiral glow when hugging
    if (this.isReunited) {
      const embracePulse = 45 + Math.sin(this.reunionTimer * 10) * 8;
      const embGrad = ctx.createRadialGradient(0, -20, 10, 0, -20, embracePulse * 1.8);
      embGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      embGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.35)');
      embGrad.addColorStop(0.8, 'rgba(244, 114, 182, 0.2)');
      embGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = embGrad;
      ctx.beginPath();
      ctx.arc(0, -20, embracePulse * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // STRICT USER REQUIREMENT: Absolutely NO text written above the family!
    ctx.restore();
  }

  // ==========================================
  // CELESTIAL BEAM RENDERING
  // ==========================================
  private renderCelestialBeam(ctx: CanvasRenderingContext2D) {
    const beamLength = 760;
    const startX = this.x + this.facing * 26;
    const startY = this.y - 10;
    const endX = startX + this.facing * beamLength;
    const pulse = 0.82 + Math.sin(this.flameTimer * 42) * 0.18;
    ctx.save();
    ctx.lineCap = 'round';
    // Expanding muzzle bloom.
    const bloom = ctx.createRadialGradient(startX, startY, 2, startX, startY, 54);
    bloom.addColorStop(0, 'rgba(255,255,255,0.95)');
    bloom.addColorStop(0.22, 'rgba(111,255,220,0.72)');
    bloom.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(startX, startY, 54, 0, Math.PI * 2); ctx.fill();
    // Broad emerald energy sheath.
    ctx.globalAlpha = pulse; ctx.strokeStyle = 'rgba(52,211,153,0.28)'; ctx.lineWidth = 48; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 34;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, startY); ctx.stroke();
    // Tight luminous core with a white-hot center.
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 17; ctx.shadowColor = '#6ee7b7'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, startY); ctx.stroke();
    ctx.strokeStyle = '#f0fdf4'; ctx.lineWidth = 5; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, startY); ctx.stroke();
    // Traveling energy rings and sharp particles sell forward velocity.
    for (let i = 0; i < 8; i++) {
      const t = ((this.flameTimer * 3.8 + i / 8) % 1);
      const x = startX + this.facing * (t * beamLength);
      const r = 8 + (1 - t) * 13;
      ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 2.5; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(x, startY, r, r * 1.8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // ==========================================
  // STAGE MANAGEMENT (20 STAGES)
  // ==========================================

  public setStage(stageIndex: number) {
    if (this.victoryTimer !== null) {
      clearTimeout(this.victoryTimer);
      this.victoryTimer = null;
    }
    this.currentStageIndex = Math.max(0, Math.min(this.stages.length - 1, stageIndex));
    this.stageSceneTimer = 0;
    const stage = this.stages[this.currentStageIndex];

    this.enemiesKilledInStage = 0;
    this.isStageComplete = false;
    this.isBossSpawned = false;
    this.isReunited = false;
    this.isBattleCleared = false; // Family HIDDEN until battle cleared!
    this.cameraZoom = 1.0;
    this.targetCameraZoom = 1.0;
    this.flightDuration = 0;
    this.isHorizontalFlightActive = false;
    this.stamina = this.maxStamina;
    this.reunionTimer = 0;
    this.spawnTimer = 0;
    this.meteorSpawnTimer = 1.8;
    this.lastThunderCycle = -1;
    this.recallCooldown = 0;
    this.beamCooldown = 0;
    this.beamTimer = 0;
    this.isBeaming = false;
    this.azureFlameTimer = 0;
    this.azureFlameCooldown = 0;
    this.parryCooldown = 0;
    this.parryTimer = 0;
    this.isParrying = false;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.novaCooldown = 0;
    this.novaEnergy = 100;
    this.isSlashing = false;
    this.slashStep = 0;
    this.activeSlashStep = 0;
    this.slashTimer = 0;
    this.comboStreak = 0;
    this.comboResetTimer = 0;
    this.screenShakeAmount = 0;
    this.hitstopTimer = 0;
    this.moveInput = { x: 0, y: 0 };
    this.keysPressed = {};

    this.enemies = [];
    this.projectiles = [];
    this.soulMotes = [];
    this.particles = [];
    this.meteors = [];
    this.recallBeacon = null;
    this.slashCooldownTimer = 0;
    this.orbitalWispCooldown = 0;

    this.setupWorldTokens();

    this.x = 200;
    this.y = this.terrainHeightAt(this.x) - this.height / 2;
    // Start the camera centered on the hero immediately; do not reveal an
    // empty sky while the camera slowly catches up on short landscape screens.
    this.cameraX = this.x - this.viewportWidth / 2;
    this.cameraY = this.y - this.viewportHeight / 2 - 40;
    this.vx = 0;
    this.vy = 0;
    this.stats.hp = this.stats.maxHp;

    if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats });
    if (this.onStageProgress) {
      this.onStageProgress(0, stage.targetKills, 1);
    }
  }

  public restartStage() {
    this.setStage(this.currentStageIndex);
  }

  public dispose() {
    this.isRunning = false;
    if (this.victoryTimer !== null) {
      clearTimeout(this.victoryTimer);
      this.victoryTimer = null;
    }
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
