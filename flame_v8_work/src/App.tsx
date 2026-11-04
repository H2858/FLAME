/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameEngine2D, DamageNumber, Enemy2D } from './game/GameEngine2D';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { TouchGestureControls } from './components/TouchGestureControls';
import { TouchTutorialModal } from './components/TouchTutorialModal';
import { PauseMenu } from './components/PauseMenu';
import { StageSelectModal } from './components/StageSelectModal';
import { UpgradeModal } from './components/UpgradeModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverVictoryModal } from './components/GameOverVictoryModal';
import {
  CloudSaveData,
  GameState,
  GameSettings,
  PlayerStats,
  SkillLevels,
} from './types/game';
import { loadGameSave, saveGameData } from './utils/storage';
import { soundManager } from './audio/soundManager';
import { TRANSLATIONS } from './i18n/translations';

export default function App() {
  const [saveData, setSaveData] = useState<CloudSaveData>(() => loadGameSave());
  const [gameState, setGameState] = useState<GameState>('title');
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Keep the original responsive viewport behavior; do not rotate the DOM or force orientation.

  // Engine ref
  const engineRef = useRef<GameEngine2D | null>(null);

  // Player stats
  const [stats, setStats] = useState<PlayerStats>(() => ({
    maxHp: saveData.playerStats.maxHp,
    hp: saveData.playerStats.maxHp,
    attackPower: saveData.playerStats.attackPower,
    defense: saveData.playerStats.defense,
    critChance: 0.15,
    speed: 440,
    souls: saveData.playerStats.souls,
    flightLevel: saveData.playerStats.flightLevel || 1,
    level: saveData.playerStats.level,
    xp: saveData.playerStats.xp,
    nextXp: 100 * Math.pow(1.5, saveData.playerStats.level - 1),
  }));

  const [skills, setSkills] = useState<SkillLevels>(saveData.skillLevels);
  const [flameSkin, setFlameSkin] = useState<'azure' | 'solar'>(() => saveData.flameSkin === 'solar' ? 'solar' : 'azure');
  const [settings, setSettings] = useState<GameSettings>(saveData.settings);

  // 20 Stages progress
  const [unlockedStage, setUnlockedStage] = useState<number>(saveData.unlockedStage || 1);
  const [completedStages, setCompletedStages] = useState<number[]>(saveData.completedStages || []);
  const [stageIndex, setStageIndex] = useState(() => Math.max(0, Math.min(19, saveData.currentStageIndex ?? ((saveData.unlockedStage || 1) - 1))));

  // Combat status
  const [cooldowns, setCooldowns] = useState({
    dash: 0,
    beam: 0,
    ward: 0,
    nova: 0,
    recall: 0,
    recallActive: false,
    novaEnergy: 100,
    comboStreak: 0,
    flightTime: 0,
    stamina: 100,
    flameTime: 0,
    wardTime: 0,
  });

  const [kills, setKills] = useState(0);
  const [targetKills, setTargetKills] = useState(10);
  const [bossEnemy, setBossEnemy] = useState<Enemy2D | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);

  // Persist save data
  const persist = useCallback(
    (
      newStats?: PlayerStats,
      newSkills?: SkillLevels,
      newSettings?: GameSettings,
      newUnlocked?: number,
      newCompleted?: number[],
      newFlameSkin?: 'azure' | 'solar'
    ) => {
      const s = newStats || stats;
      const sk = newSkills || skills;
      const st = newSettings || settings;
      const un = newUnlocked !== undefined ? newUnlocked : unlockedStage;
      const comp = newCompleted || completedStages;

      const updated: CloudSaveData = {
        ...saveData,
        timestamp: Date.now(),
        playerStats: {
          maxHp: s.maxHp,
          attackPower: s.attackPower,
          defense: s.defense,
          souls: s.souls,
          flightLevel: s.flightLevel,
          level: s.level,
          xp: s.xp,
        },
        skillLevels: sk,
        unlockedStage: un,
        completedStages: comp,
        currentStageIndex: Math.max(0, Math.min(19, Math.max(stageIndex, un - 1))),
        settings: st,
        flameSkin: newFlameSkin || flameSkin,
      };

      setSaveData(updated);
      saveGameData(updated);
    },
    [saveData, stats, skills, settings, flameSkin, unlockedStage, completedStages, stageIndex]
  );

  // Keep the engine's long-lived callbacks connected to the latest React state.
  // GameCanvas creates the engine once, so callbacks must not capture first-render values.
  const statsRef = useRef(stats);
  const skillsRef = useRef(skills);
  const settingsRef = useRef(settings);
  const stageIndexRef = useRef(stageIndex);
  const unlockedStageRef = useRef(unlockedStage);
  const completedStagesRef = useRef(completedStages);
  const persistRef = useRef(persist);
  statsRef.current = stats;
  skillsRef.current = skills;
  settingsRef.current = settings;
  stageIndexRef.current = stageIndex;
  unlockedStageRef.current = unlockedStage;
  completedStagesRef.current = completedStages;
  persistRef.current = persist;

  // Persist stage selection as soon as React commits the new stage index.
  useEffect(() => {
    persistRef.current();
  }, [stageIndex]);

  useEffect(() => {
    const flushSave = () => persistRef.current();
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      window.removeEventListener('beforeunload', flushSave);
    };
  }, []);

  // Connect engine callbacks
  const handleEngineReady = useCallback(
    (engine: GameEngine2D) => {
      engineRef.current = engine;

      engine.stats = { ...statsRef.current };
      engine.skills = { ...skillsRef.current, fantasticalRecall: 1, celestialBeam: 1, orbitalWisps: 1, flameDash: 1, azureNova: 1, soulMagnet: 1 };
      engine.settings = { ...settingsRef.current };
      engine.flameSkin = flameSkin;
      engine.setStage(stageIndexRef.current);

      engine.onStatsUpdate = (newStats) => {
        setStats({ ...newStats });
        persistRef.current(newStats);
      };

      engine.onCooldownsUpdate = (cds) => {
        setCooldowns({ ...cds });
      };

      engine.onDamageNumber = (dmg) => {
        setDamageNumbers((prev) => [...prev.slice(-14), dmg]);
        setTimeout(() => {
          setDamageNumbers((prev) => prev.filter((d) => d.id !== dmg.id));
        }, 650);
      };

      engine.onStageProgress = (killed, target, _wave) => {
        setKills(killed);
        setTargetKills(target);

        const boss = engine.enemies.find((e) => e.isBoss && e.state !== 'dead');
        setBossEnemy(boss || null);
      };

      engine.onGameOver = () => {
        setGameState('game_over');
      };

      engine.onVictory = () => {
        const rewardedStats = { ...statsRef.current, souls: statsRef.current.souls + 28 };
        statsRef.current = rewardedStats;
        engine.stats = rewardedStats;
        setStats(rewardedStats);
        const finishedStageId = stageIndexRef.current + 1;
        const currentCompleted = completedStagesRef.current;
        const nextUnlocked = Math.min(20, Math.max(unlockedStageRef.current, finishedStageId + 1));
        const nextCompleted = currentCompleted.includes(finishedStageId)
          ? currentCompleted
          : [...currentCompleted, finishedStageId];

        setUnlockedStage(nextUnlocked);
        setCompletedStages(nextCompleted);
        persistRef.current(rewardedStats, undefined, undefined, nextUnlocked, nextCompleted);
        setGameState('victory');
      };
    },
    []
  );

  // The simulation must only advance while the gameplay screen is active.
  useEffect(() => {
    engineRef.current?.setPaused(gameState !== 'playing');
  }, [gameState]);

  // Keyboard Escape listener for Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Every store item has its own level and affects only its matching stat/system.
  const handleUpgradeSkill = (skillKey: keyof SkillLevels, cost: number) => {
    const currentLevel = Math.max(1, Number(skills[skillKey]) || 1);
    if (stats.souls < cost || currentLevel >= 10) return;
    const nextLevel = currentLevel + 1;
    const newSkillLevels = { ...skills, [skillKey]: nextLevel };
    const newStats: PlayerStats = { ...stats, souls: stats.souls - cost };
    if (skillKey === 'attackPower') newStats.attackPower += 3;
    if (skillKey === 'defense') newStats.defense += 2;
    if (skillKey === 'maxHealth') { newStats.maxHp += 12; newStats.hp = Math.min(newStats.maxHp, newStats.hp + 12); }
    if (skillKey === 'flightDuration') newStats.flightLevel = nextLevel;
    setSkills(newSkillLevels);
    setStats(newStats);
    if (engineRef.current) {
      engineRef.current.skills = newSkillLevels;
      engineRef.current.stats = newStats;
      if (skillKey === 'staminaCapacity') {
        engineRef.current.maxStamina = 100 + (nextLevel - 1) * 18;
        engineRef.current.stamina = Math.min(engineRef.current.maxStamina, engineRef.current.stamina + 18);
      }
      if (skillKey === 'maxHealth') engineRef.current.stats.hp = newStats.hp;
    }
    persist(newStats, newSkillLevels);
  };

  const handleBuySolarFlame = () => {
    if (flameSkin === 'solar' || stats.souls < 160) return;
    const nextStats = { ...stats, souls: stats.souls - 160 };
    setFlameSkin('solar');
    setStats(nextStats);
    if (engineRef.current) { engineRef.current.flameSkin = 'solar'; engineRef.current.stats = nextStats; }
    persist(nextStats, undefined, undefined, undefined, undefined, 'solar');
  };

  const handleEquipAzureFlame = () => {
    setFlameSkin('azure');
    if (engineRef.current) engineRef.current.flameSkin = 'azure';
    persist(undefined, undefined, undefined, undefined, undefined, 'azure');
  };

  // Settings update handler
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.settings = newSettings;
      engineRef.current.applyGraphicsQuality(newSettings.graphicsQuality);
    }
    persist(undefined, undefined, newSettings);
  };

  const t = TRANSLATIONS[settings.language];
  const stageDef = engineRef.current?.stages[stageIndex] || {
    nameKey: 'stage_1',
    targetKills: 10,
  };
  const currentStageName = t[stageDef.nameKey as keyof typeof t] as string;

  const beginGame = () => {
    setGameState('playing');
    engineRef.current?.restartStage();
    try {
      if (localStorage.getItem('ignis-azure-touch-tutorial-v2') !== 'seen') setShowTutorial(true);
    } catch { setShowTutorial(true); }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem('ignis-azure-touch-tutorial-v2', 'seen'); } catch { /* storage unavailable */ }
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-gray-950 font-sans select-none touch-none"
      dir={settings.language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. 2D Canvas Viewport */}
      <GameCanvas settings={settings} onEngineReady={handleEngineReady} />

      {/* 2. Title Screen Shell */}
      {gameState === 'title' && (
        <TitleScreen
          lang={settings.language}
          onStartGame={beginGame}
        />
      )}

      {/* 3. In-Game Low-Occlusion HUD */}
      {gameState === 'playing' && (
        <>
          <HUD
            lang={settings.language}
            stats={stats}
            comboStreak={cooldowns.comboStreak}
            stageName={currentStageName}
            stageIndex={stageIndex}
            kills={kills}
            targetKills={targetKills}
            bossEnemy={bossEnemy}
            damageNumbers={damageNumbers}
            stamina={cooldowns.stamina}
            onPause={() => setGameState('paused')}
            onHelp={() => setShowTutorial(true)}
            onFlame={() => engineRef.current?.activateAzureFlame()}
            onSword={() => engineRef.current?.performAttack('horizontal')}
            onWard={() => engineRef.current?.performParryWard()}
            wardCooldown={cooldowns.ward}
            flameCooldown={engineRef.current?.azureFlameCooldown || 0}
            wardTime={cooldowns.wardTime}
            controlsLayout={settings.controlsLayout}
          />

          {/* Movement gestures only; sword combat uses the dedicated visible HUD button. */}
          {!showTutorial && <TouchGestureControls engine={engineRef.current} />}
          {showTutorial && <TouchTutorialModal lang={settings.language} onClose={closeTutorial} />}
        </>
      )}

      {/* 4. Pause Menu */}
      {gameState === 'paused' && (
        <PauseMenu
          lang={settings.language}
          onResume={() => setGameState('playing')}
          onRestart={() => {
            engineRef.current?.restartStage();
            setGameState('playing');
          }}
          onOpenStageSelect={() => {
            setGameState('paused');
            setShowStageSelect(true);
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStore={() => setShowUpgrades(true)}
          onMainMenu={() => {
            soundManager.stopAmbientMusic();
            setGameState('title');
          }}
        />
      )}

      {/* 5. Game Over / Defeat */}
      {gameState === 'game_over' && (
        <GameOverVictoryModal
          type="game_over"
          lang={settings.language}
          soulsEarned={kills}
          stageName={currentStageName}
          onRetry={() => {
            engineRef.current?.restartStage();
            setGameState('playing');
          }}
          onOpenStageSelect={() => setShowStageSelect(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onMainMenu={() => setGameState('title')}
        />
      )}

      {/* 6. Victory */}
      {gameState === 'victory' && (
        <GameOverVictoryModal
          type="victory"
          lang={settings.language}
          soulsEarned={targetKills * 2}
          stageName={currentStageName}
          isLastStage={stageIndex >= 19}
          onRetry={() => {
            engineRef.current?.restartStage();
            setGameState('playing');
          }}
          onNextStage={() => {
            const nextIdx = Math.min(19, stageIndex + 1);
            setStageIndex(nextIdx);
            engineRef.current?.setStage(nextIdx);
            setGameState('playing');
          }}
          onOpenStageSelect={() => setShowStageSelect(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onMainMenu={() => setGameState('title')}
        />
      )}

      {/* 7. 20 Stages Selection Modal */}
      {showStageSelect && (
        <StageSelectModal
          lang={settings.language}
          stages={engineRef.current?.stages || []}
          currentStageIndex={stageIndex}
          unlockedStage={unlockedStage}
          completedStages={completedStages}
          onSelectStage={(idx) => {
            setStageIndex(idx);
            engineRef.current?.setStage(idx);
            setGameState('playing');
          }}
          onClose={() => setShowStageSelect(false)}
        />
      )}

      {/* 8. Skill Upgrades Shrine Modal */}
      {showUpgrades && (
        <UpgradeModal
          lang={settings.language}
          stats={stats}
          skills={skills}
          flameSkin={flameSkin}
          onBuySolarFlame={handleBuySolarFlame}
          onUpgradeSkill={handleUpgradeSkill}
          onClose={() => setShowUpgrades(false)}
        />
      )}

      {/* 9. Settings & Cloud Save Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          flameSkin={flameSkin}
          onEquipAzure={handleEquipAzureFlame}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

    </main>
  );
}
