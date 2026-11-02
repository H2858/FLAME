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

  // HORIZONTAL SUPERSONIC FLIGHT MODE (Token-activated horizontal rocket flame)
  public flightDuration = 0;
  public isHorizontalFlightActive = false;
  private flightRamCooldown = 0;

  // Pitch Black Solid Continuous Ground Level (Player NEVER falls)
  public groundY = 530;

  // The Flame Family Sanctuary at the END of the road
  public familyAltarX = 4200;
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
  private crowSpawnTimer = 5 + Math.random() * 7;

  // Collectible Tokens in the World
  public worldTokens: WorldToken2D[] = [];

  // Fantastical Recall Beacon (العودة الخيالية)
  public recallBeacon: { x: number; y: number; life: number; active: boolean } | null = null;
  public recallCooldown = 0;

  // Celestial Beam Attack
  public isBeaming = false;
  public beamTimer = 0;
  public beamCooldown = 0;

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

  // 3-Hit Combo Slash
  public isSlashing = false;
  public slashStep = 0;
  public activeSlashStep = 0;
  public slashTimer = 0;
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
  };

  // 20 Progressive Stages
  public stages: StageDefinition[] = [
    { id: 1, nameKey: 'stage_1', descriptionKey: 'stage_1_desc', themeColor: '#0ea5e9', targetKills: 10, enemyTypes: ['crimson_wisp'], isBossStage: false, difficultyScale: 1.0 },
    { id: 2, nameKey: 'stage_2', descriptionKey: 'stage_2_desc', themeColor: '#38bdf8', targetKills: 14, enemyTypes: ['crimson_wisp', 'pyro_wolf'], isBossStage: false, difficultyScale: 1.15 },
    { id: 3, nameKey: 'stage_3', descriptionKey: 'stage_3_desc', themeColor: '#818cf8', targetKills: 16, enemyTypes: ['crimson_wisp', 'pyro_wolf', 'crimson_wraith'], isBossStage: false, difficultyScale: 1.3 },
    { id: 4, nameKey: 'stage_4', descriptionKey: 'stage_4_desc', themeColor: '#a855f7', targetKills: 18, enemyTypes: ['crimson_wisp', 'crimson_wraith', 'magma_floater'], isBossStage: false, difficultyScale: 1.45 },
    { id: 5, nameKey: 'stage_5', descriptionKey: 'stage_5_desc', themeColor: '#ef4444', targetKills: 20, enemyTypes: ['pyro_wolf', 'crimson_wraith'], bossType: 'pyro_wolf', isBossStage: true, difficultyScale: 1.6 },
    { id: 6, nameKey: 'stage_6', descriptionKey: 'stage_6_desc', themeColor: '#f97316', targetKills: 22, enemyTypes: ['crimson_wisp', 'magma_floater', 'magma_golem'], isBossStage: false, difficultyScale: 1.75 },
    { id: 7, nameKey: 'stage_7', descriptionKey: 'stage_7_desc', themeColor: '#eab308', targetKills: 24, enemyTypes: ['pyro_serpent', 'magma_floater'], isBossStage: false, difficultyScale: 1.9 },
    { id: 8, nameKey: 'stage_8', descriptionKey: 'stage_8_desc', themeColor: '#06b6d4', targetKills: 26, enemyTypes: ['pyro_serpent', 'crimson_wraith', 'ignis_knight'], isBossStage: false, difficultyScale: 2.05 },
    { id: 9, nameKey: 'stage_9', descriptionKey: 'stage_9_desc', themeColor: '#6366f1', targetKills: 28, enemyTypes: ['ignis_knight', 'pyro_wolf'], isBossStage: false, difficultyScale: 2.2 },
    { id: 10, nameKey: 'stage_10', descriptionKey: 'stage_10_desc', themeColor: '#dc2626', targetKills: 30, enemyTypes: ['ignis_knight', 'magma_golem'], bossType: 'magma_golem', isBossStage: true, difficultyScale: 2.4 },
    { id: 11, nameKey: 'stage_11', descriptionKey: 'stage_11_desc', themeColor: '#fb923c', targetKills: 30, enemyTypes: ['pyre_drake', 'crimson_wisp'], isBossStage: false, difficultyScale: 2.55 },
    { id: 12, nameKey: 'stage_12', descriptionKey: 'stage_12_desc', themeColor: '#f43f5e', targetKills: 32, enemyTypes: ['pyre_drake', 'pyro_serpent', 'crimson_wraith'], isBossStage: false, difficultyScale: 2.7 },
    { id: 13, nameKey: 'stage_13', descriptionKey: 'stage_13_desc', themeColor: '#ea580c', targetKills: 34, enemyTypes: ['magma_golem', 'magma_floater', 'dark_pyromancer'], isBossStage: false, difficultyScale: 2.85 },
    { id: 14, nameKey: 'stage_14', descriptionKey: 'stage_14_desc', themeColor: '#9333ea', targetKills: 36, enemyTypes: ['dark_pyromancer', 'ignis_knight'], isBossStage: false, difficultyScale: 3.0 },
    { id: 15, nameKey: 'stage_15', descriptionKey: 'stage_15_desc', themeColor: '#b91c1c', targetKills: 38, enemyTypes: ['pyro_serpent', 'dark_pyromancer'], bossType: 'pyro_serpent', isBossStage: true, difficultyScale: 3.2 },
    { id: 16, nameKey: 'stage_16', descriptionKey: 'stage_16_desc', themeColor: '#4f46e5', targetKills: 40, enemyTypes: ['ignis_knight', 'pyre_drake', 'dark_pyromancer'], isBossStage: false, difficultyScale: 3.4 },
    { id: 17, nameKey: 'stage_17', descriptionKey: 'stage_17_desc', themeColor: '#7c3aed', targetKills: 42, enemyTypes: ['magma_golem', 'ignis_knight', 'dark_pyromancer'], isBossStage: false, difficultyScale: 3.65 },
    { id: 18, nameKey: 'stage_18', descriptionKey: 'stage_18_desc', themeColor: '#c026d3', targetKills: 44, enemyTypes: ['pyre_drake', 'dark_pyromancer', 'magma_floater'], isBossStage: false, difficultyScale: 3.9 },
    { id: 19, nameKey: 'stage_19', descriptionKey: 'stage_19_desc', themeColor: '#e11d48', targetKills: 46, enemyTypes: ['ignis_knight', 'magma_golem', 'dark_pyromancer', 'pyre_drake'], isBossStage: false, difficultyScale: 4.2 },
    { id: 20, nameKey: 'stage_20', descriptionKey: 'stage_20_desc', themeColor: '#e11d48', targetKills: 50, enemyTypes: ['ignis_knight', 'dark_pyromancer'], bossType: 'abyssal_sovereign', isBossStage: true, difficultyScale: 4.8 },
  ];

  public settings: GameSettings;

  constructor(canvas: HTMLCanvasElement, initialSettings: GameSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.settings = initialSettings;

    this.onResize();
    window.addEventListener('resize', this.onResize);

    this.setupElevatedPlatforms();
    this.setupLowMistyEyes();
    this.setupKeyboardInput();

    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private onResize = () => {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings.graphicsQuality === 'ultra' ? 2 : 1.5);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
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
      const isFlight = i % 2 === 0;
      const x = 650 + i * 550;
      // Alternate between ground height and elevated platform height
      const onPlatform = i % 3 === 1;
      const y = onPlatform ? 330 : this.groundY - 35;

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

  private setupKeyboardInput() {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;

      // Jump
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        this.jump();
      }

      // Attack
      if (e.code === 'KeyJ') {
        this.performAttack();
      }

      // Dash
      if (e.code === 'KeyK' || e.code === 'ShiftLeft') {
        this.performDash();
      }

      // Fantastical Recall
      if (e.code === 'KeyL') {
        this.performFantasticalRecall();
      }

      // Celestial Beam
      if (e.code === 'KeyU') {
        this.performCelestialBeam();
      }

      // Parry Ward
      if (e.code === 'KeyI') {
        this.performParryWard();
      }

      // Supernova
      if (e.code === 'KeyO') {
        this.performNova();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keysPressed = {};
      this.moveInput = { x: 0, y: 0 };
    });
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

  public performAttack() {
    if (this.isSlashing || this.stats.hp <= 0 || this.isReunited) return;

    this.isSlashing = true;
    this.slashTimer = 0.18;
    this.comboResetTimer = 1.0;

    const step = this.slashStep;
    this.activeSlashStep = step;
    this.slashStep = (this.slashStep + 1) % 3;

    const isHeavy = step === 2;
    const baseDmg = this.stats.attackPower * (1 + (this.skills.flameSlash - 1) * 0.22);
    const comboMult = step === 0 ? 1.0 : step === 1 ? 1.4 : 2.4;

    soundManager.playSlash(step);
    this.vx += this.facing * (isHeavy ? 300 : 190);

    const hitWidth = isHeavy ? 140 : 100;
    const hitHeight = 90;
    const hitX = this.facing === 1 ? this.x + 10 : this.x - hitWidth - 10;
    const hitY = this.y - hitHeight / 2;

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

  public performParryWard() {
    if (this.parryCooldown > 0 || this.isParrying || this.stats.hp <= 0 || this.isReunited) return;

    this.isParrying = true;
    this.parryTimer = 0.75 + (this.skills.parryWard - 1) * 0.15;
    this.parryCooldown = 4.5;
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

    const soulBonus = 1 + (this.skills.soulMagnet - 1) * 0.25;
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

    // Check if stage battle requirements are met
    if (this.enemiesKilledInStage >= stage.targetKills && !this.isBattleCleared) {
      this.isBattleCleared = true;

      // Reveal the family altar at the end of the road!
      this.familyAltarX = this.x + 950;
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
    if (this.enemiesKilledInStage >= stage.targetKills) return;

    this.spawnTimer -= dt;
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'dead');

    if (stage.isBossStage && this.enemiesKilledInStage >= Math.floor(stage.targetKills * 0.45) && !this.isBossSpawned) {
      this.spawnBoss(stage.bossType || 'pyro_wolf');
      return;
    }

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

    const spawnY = this.groundY - 30;
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

    const spawnX = this.x + 600;
    const diff = this.stages[this.currentStageIndex].difficultyScale;
    let width = 120;
    let height = 140;
    let hp = Math.round(750 * diff);
    let attackPower = Math.round(32 * diff);

    if (bossType === 'abyssal_sovereign') {
      width = 160;
      height = 180;
      hp = Math.round(1400 * diff);
      attackPower = Math.round(45 * diff);
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type: bossType,
      x: spawnX,
      y: this.groundY - height / 2,
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
    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.render();
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private update(dt: number) {
    this.flameTimer += dt;

    // 1. Update Low Misty Eyes & Celestial Meteors
    this.updateLowEyes(dt);
    this.updateMeteors(dt);
    this.updateCrows(dt);
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

        setTimeout(() => {
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
        const rocketSpeed = 780;
        this.vx = this.facing * rocketSpeed;

        // Steer vertical trajectory smoothly with joystick / W/S
        let inputY = this.moveInput.y;
        if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) inputY -= 1;
        if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) inputY += 1;
        inputY = Math.max(-1, Math.min(1, inputY));

        this.vy = inputY * 340;

        // Bound vertical flight so it stays in the playable zone
        if (this.y < 150) this.y = 150;
        if (this.y > this.groundY - 30) this.y = this.groundY - 30;

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

      // CONTINUOUS SOLID GROUND COLLISION (Player NEVER falls!)
      this.isGrounded = false;
      if (this.y + this.height / 2 >= this.groundY) {
        this.y = this.groundY - this.height / 2;
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
      if (enemy.y + enemy.height / 2 >= this.groundY) {
        enemy.y = this.groundY - enemy.height / 2;
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.isEnemy) {
        if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 22) {
          this.damagePlayer(p.damage);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Soul Magnet
    const magnetRadius = 220 + (this.skills.soulMagnet - 1) * 80;
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

    // 9. Spawning
    if (!this.isReunited && !this.isBattleCleared) {
      this.updateSpawning(dt);
    }

    // 10. Camera Follow (Focused on center during reunion)
    const targetX = this.isReunited ? (this.x + this.familyAltarX) / 2 : this.x;
    const targetY = this.isReunited ? this.groundY - 50 : this.y;
    const targetCamX = targetX - window.innerWidth / (2 * this.cameraZoom);
    const targetCamY = targetY - window.innerHeight / (2 * this.cameraZoom) - 40;
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
          this.flightDuration = 7.5;
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
          // Restore +50 HP & 100% Supernova energy
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 50);
          this.novaEnergy = 100;
          soundManager.playStaminaTokenPickup();
          if (this.onStatsUpdate) this.onStatsUpdate({ ...this.stats });

          if (this.onDamageNumber && this.settings.damageNumbers) {
            this.onDamageNumber({
              id: Math.random(),
              text: '💚 STAMINA FULL!',
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
      const startX = this.cameraX - 200 + Math.random() * (window.innerWidth + 400);
      const startY = -40 + Math.random() * 90;
      const speed = 750 + Math.random() * 450;
      const angle = 0.55 + (Math.random() - 0.5) * 0.2; // ~32 degree diagonal descent

      this.meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 120 + Math.random() * 110,
        thickness: 2.5 + Math.random() * 2,
        color: Math.random() < 0.6 ? '#ffffff' : '#38bdf8',
        life: 0.9 + Math.random() * 0.5,
        maxLife: 0.9 + Math.random() * 0.5,
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

      // Trailing stardust particles
      if (Math.random() < 0.3) {
        this.particles.push({
          x: m.x - (m.vx / 800) * (m.length * 0.4),
          y: m.y - (m.vy / 800) * (m.length * 0.4),
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 1.5 + Math.random() * 2,
          color: m.color,
          alpha: 0.8,
          life: 0.28,
          maxLife: 0.28,
        });
      }

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
    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
    if (dist <= enemy.attackRange + 35) {
      this.damagePlayer(enemy.attackPower);
    }
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
    const width = window.innerWidth;
    const height = window.innerHeight;

    let offsetX = -this.cameraX;
    let offsetY = -this.cameraY;
    if (this.screenShakeAmount > 0) {
      offsetX += (Math.random() - 0.5) * this.screenShakeAmount;
      offsetY += (Math.random() - 0.5) * this.screenShakeAmount;
    }

    // 1. Deep Cosmic Night Sky (NO TREES)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#02040a');
    skyGrad.addColorStop(0.35, '#050a18');
    skyGrad.addColorStop(0.7, '#070e24');
    skyGrad.addColorStop(1, '#010206');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Stars & Twinkles
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 45; s++) {
      const sx = (s * 137.5) % width;
      const sy = (s * 73.1) % (height * 0.55);
      const sRadius = s % 3 === 0 ? 1.5 : 1.0;
      ctx.globalAlpha = 0.35 + Math.sin(this.flameTimer * 3 + s) * 0.25;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Giant Luminous Moon with Soft Aura
    const moonX = width * 0.78 - this.cameraX * 0.02;
    const moonY = 140 - this.cameraY * 0.02;
    const moonR = 95;

    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 2.4);
    moonGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    moonGlow.addColorStop(0.45, 'rgba(14, 165, 233, 0.1)');
    moonGlow.addColorStop(1, 'rgba(1, 2, 6, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // 2. CELESTIAL METEORS & SHOOTING STARS (نيازك وشهب تمر في السماء)
    this.renderMeteors(ctx);
    // Ravens are rendered in screen space so they visibly cross in front of the moon.
    this.renderCrows(ctx);

    // 3. Distant Misty Mountain Silhouettes (Parallax 0.06)
    ctx.save();
    ctx.fillStyle = '#040714';
    for (let i = -3; i < 22; i++) {
      const px = i * 360 - this.cameraX * 0.06;
      const py = height * 0.46;
      ctx.beginPath();
      ctx.moveTo(px, py + 350);
      ctx.lineTo(px + 180, py);
      ctx.lineTo(px + 360, py + 350);
      ctx.fill();
    }
    ctx.restore();

    // Transform for World Coordinates with CINEMATIC CAMERA ZOOM
    ctx.save();
    if (this.cameraZoom !== 1.0) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-width / 2, -height / 2);
    }
    ctx.translate(offsetX, offsetY);

    // 4. LOW MISTY PREDATOR EYES (Lowered near ground, NOT in the sky!)
    this.renderLowMistyEyes(ctx);

    // 5. PITCH BLACK SOLID GROUND (الأرضية سوداء عاتمة)
    const groundLeft = this.cameraX - 600;
    const groundRight = this.cameraX + width / this.cameraZoom + 600;
    const groundWidth = groundRight - groundLeft;

    // Deep True Pitch Black Obsidian (#000000)
    ctx.fillStyle = '#000000';
    ctx.fillRect(groundLeft, this.groundY, groundWidth, 800);

    // Subtle dark obsidian edge
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(groundLeft, this.groundY);
    ctx.lineTo(groundRight, this.groundY);
    ctx.stroke();

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
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
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
  }

  /** Spawn and animate occasional ravens across the moonlit sky. */
  private updateCrows(dt: number) {
    this.crowSpawnTimer -= dt;
    if (this.crowSpawnTimer <= 0) {
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      this.crows.push({
        x: direction === 1 ? -55 : window.innerWidth + 55,
        y: 75 + Math.random() * 145,
        speed: 72 + Math.random() * 58,
        scale: 0.55 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        direction,
      });
      if (Math.random() < 0.42) soundManager.playCrowCall();
      this.crowSpawnTimer = 7 + Math.random() * 11;
    }
    for (const crow of this.crows) {
      crow.x += crow.speed * crow.direction * dt;
      crow.phase += dt * (8 + crow.speed * 0.025);
      crow.y += Math.sin(crow.phase * 0.22) * 2.2 * dt;
    }
    this.crows = this.crows.filter(c => c.direction === 1 ? c.x < window.innerWidth + 90 : c.x > -90);
  }

  /** Elegant near-black raven silhouettes with articulated, flapping wings. */
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
    const flicker2 = Math.cos(this.flameTimer * 22) * 5;

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

    // 1. Outer Sapphire Flame Aura
    ctx.fillStyle = 'rgba(2, 132, 199, 0.75)';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-26 + flicker1, 15, -28 + flicker2, -15, 0, -44 + flicker1);
    ctx.bezierCurveTo(28 + flicker2, -15, 26 + flicker1, 15, 0, 26);
    ctx.fill();

    // 2. Middle Brilliant Cyan Fire Body
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.bezierCurveTo(-18 + flicker2, 10, -20 - flicker1, -10, 0, -34 + flicker2);
    ctx.bezierCurveTo(20 - flicker1, -10, 18 + flicker2, 10, 0, 22);
    ctx.fill();

    // 3. Inner White Plasma Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.bezierCurveTo(-10, 6, -10, -6, 0, -22);
    ctx.bezierCurveTo(10, -6, 10, 6, 0, 16);
    ctx.fill();

    // 4. Twin Soul Eyes
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
    ctx.arc(10, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Katana-style sword draw and three distinct cinematic cutting arcs.
    if (!this.isReunited && !this.isHorizontalFlightActive) {
      ctx.save();
      const progress = this.isSlashing ? Math.max(0, Math.min(1, 1 - this.slashTimer / 0.18)) : 0;
      const bladeOffset = this.isSlashing ? 34 + Math.sin(progress * Math.PI) * 13 : 25;
      const idleAngle = Math.sin(this.flameTimer * 2.8) * 0.09;
      const bladeRot = !this.isSlashing ? idleAngle : this.activeSlashStep === 1
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
        ctx.arc(0, 0, this.activeSlashStep === 2 ? 67 : 57, -1.05, 0.78);
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

    // 6. Parry Shield
    if (this.isParrying) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================
  // MASTERPIECE LIVING FLAME ENEMY RENDERING
  // ==========================================
  private renderMasterpieceEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy2D) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(enemy.facing, 1);

    const isFlashing = enemy.flashTimer > 0;
    const isWindup = enemy.state === 'windup';
    const breath = Math.sin(enemy.animTimer * 6) * 3;
    const flicker1 = Math.sin(this.flameTimer * 18 + enemy.id) * 4;
    const flicker2 = Math.cos(this.flameTimer * 24 + enemy.id) * 5;

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
    const beamLength = 700;
    const startX = this.x + this.facing * 20;
    const startY = this.y - 4;
    const endX = startX + this.facing * beamLength;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 36;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, startY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, startY);
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // STAGE MANAGEMENT (20 STAGES)
  // ==========================================

  public setStage(stageIndex: number) {
    this.currentStageIndex = Math.max(0, Math.min(this.stages.length - 1, stageIndex));
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

    this.enemies = [];
    this.projectiles = [];
    this.soulMotes = [];
    this.meteors = [];
    this.recallBeacon = null;

    this.setupWorldTokens();

    this.x = 200;
    this.y = 460;
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
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
  }
}
