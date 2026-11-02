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
import { PauseMenu } from './components/PauseMenu';
import { StageSelectModal } from './components/StageSelectModal';
import { UpgradeModal } from './components/UpgradeModal';
import { SettingsModal } from './components/SettingsModal';
import { ButtonCustomizerModal } from './components/ButtonCustomizerModal';
import { GameOverVictoryModal } from './components/GameOverVictoryModal';
import {
  CloudSaveData,
  GameState,
  GameSettings,
  PlayerStats,
  SkillLevels,
  TouchControlsLayout,
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
  const [showCustomizer, setShowCustomizer] = useState(false);

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
    level: saveData.playerStats.level,
    xp: saveData.playerStats.xp,
    nextXp: 100 * Math.pow(1.5, saveData.playerStats.level - 1),
  }));

  const [skills, setSkills] = useState<SkillLevels>(saveData.skillLevels);
  const [settings, setSettings] = useState<GameSettings>(saveData.settings);

  // 20 Stages progress
  const [unlockedStage, setUnlockedStage] = useState<number>(saveData.unlockedStage || 1);
  const [completedStages, setCompletedStages] = useState<number[]>(saveData.completedStages || []);
  const [stageIndex, setStageIndex] = useState(0);

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
      newCompleted?: number[]
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
          level: s.level,
          xp: s.xp,
        },
        skillLevels: sk,
        unlockedStage: un,
        completedStages: comp,
        settings: st,
      };

      setSaveData(updated);
      saveGameData(updated);
    },
    [saveData, stats, skills, settings, unlockedStage, completedStages]
  );

  // Connect engine callbacks
  const handleEngineReady = useCallback(
    (engine: GameEngine2D) => {
      engineRef.current = engine;

      engine.stats = { ...stats };
      engine.skills = { ...skills };
      engine.settings = { ...settings };

      engine.onStatsUpdate = (newStats) => {
        setStats({ ...newStats });
        persist(newStats);
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
        const finishedStageId = stageIndex + 1;
        const nextUnlocked = Math.min(20, Math.max(unlockedStage, finishedStageId + 1));
        const nextCompleted = completedStages.includes(finishedStageId)
          ? completedStages
          : [...completedStages, finishedStageId];

        setUnlockedStage(nextUnlocked);
        setCompletedStages(nextCompleted);
        persist(undefined, undefined, undefined, nextUnlocked, nextCompleted);
        setGameState('victory');
      };
    },
    [stats, skills, settings, stageIndex, unlockedStage, completedStages, persist]
  );

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

  // Skill upgrade handler
  const handleUpgradeSkill = (skillKey: keyof SkillLevels, cost: number) => {
    if (stats.souls < cost) return;

    const newSouls = stats.souls - cost;
    const newSkillLevels = {
      ...skills,
      [skillKey]: skills[skillKey] + 1,
    };

    const newStats: PlayerStats = {
      ...stats,
      souls: newSouls,
      maxHp: stats.maxHp + (skillKey === 'parryWard' ? 12 : 0),
      attackPower: stats.attackPower + (skillKey === 'flameSlash' ? 5 : 0),
    };

    setSkills(newSkillLevels);
    setStats(newStats);

    if (engineRef.current) {
      engineRef.current.skills = newSkillLevels;
      engineRef.current.stats = newStats;
    }

    persist(newStats, newSkillLevels);
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

  // Touch controls layout save
  const handleSaveControls = (newLayout: TouchControlsLayout) => {
    const updated = {
      ...settings,
      controlsLayout: newLayout,
    };
    setSettings(updated);
    persist(undefined, undefined, updated);
  };

  // Cloud Save import
  const handleImportSave = (data: CloudSaveData) => {
    setSaveData(data);
    setSkills(data.skillLevels);
    setSettings(data.settings);
    setUnlockedStage(data.unlockedStage || 1);
    setCompletedStages(data.completedStages || []);

    const importedStats: PlayerStats = {
      ...stats,
      maxHp: data.playerStats.maxHp,
      hp: data.playerStats.maxHp,
      attackPower: data.playerStats.attackPower,
      defense: data.playerStats.defense,
      souls: data.playerStats.souls,
      level: data.playerStats.level,
      xp: data.playerStats.xp,
    };
    setStats(importedStats);

    if (engineRef.current) {
      engineRef.current.stats = importedStats;
      engineRef.current.skills = data.skillLevels;
      engineRef.current.settings = data.settings;
      engineRef.current.applyGraphicsQuality(data.settings.graphicsQuality);
    }
  };

  // Language toggle
  const toggleLanguage = () => {
    const nextLang = settings.language === 'ar' ? 'en' : 'ar';
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', nextLang);
    handleUpdateSettings({ ...settings, language: nextLang });
  };

  const t = TRANSLATIONS[settings.language];
  const stageDef = engineRef.current?.stages[stageIndex] || {
    nameKey: 'stage_1',
    targetKills: 10,
  };
  const currentStageName = t[stageDef.nameKey as keyof typeof t] as string;

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
          stats={stats}
          currentStage={stageIndex + 1}
          onStartGame={() => {
            setGameState('playing');
            engineRef.current?.restartStage();
          }}
          onOpenStageSelect={() => setShowStageSelect(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCustomizer={() => setShowCustomizer(true)}
          onToggleLanguage={toggleLanguage}
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
            flightTime={cooldowns.flightTime}
            onPause={() => setGameState('paused')}
          />

          {/* Invisible gesture controls: drag to move, tap to slash, flick to jump/dash. */}
          <TouchGestureControls engine={engineRef.current} />
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
          onOpenCustomizer={() => setShowCustomizer(true)}
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
          soulsEarned={kills * 4}
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
          soulsEarned={targetKills * 10}
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
          onUpgradeSkill={handleUpgradeSkill}
          onClose={() => setShowUpgrades(false)}
        />
      )}

      {/* 9. Settings & Cloud Save Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          fullSaveData={saveData}
          onUpdateSettings={handleUpdateSettings}
          onImportData={handleImportSave}
          onOpenControlsCustomizer={() => {
            setShowSettings(false);
            setShowCustomizer(true);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 10. Interactive Touch Buttons Customizer */}
      {showCustomizer && (
        <ButtonCustomizerModal
          lang={settings.language}
          layout={settings.controlsLayout}
          onSave={handleSaveControls}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </main>
  );
}
