/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloudSaveData, GameSettings, TouchControlsLayout } from '../types/game';

export const DEFAULT_CONTROLS_LAYOUT: TouchControlsLayout = {
  joystickSize: 130,
  joystickDeadzone: 10,
  joystickX: 18, // 18% from left
  joystickY: 22, // 22% from bottom
  buttons: {
    attack: { id: 'attack', nameKey: 'btn_attack', xPercent: 12, yPercent: 22, size: 76, opacity: 0.95 },
    jump:   { id: 'jump',   nameKey: 'btn_jump',   xPercent: 24, yPercent: 14, size: 62, opacity: 0.90 },
    dash:   { id: 'dash',   nameKey: 'btn_dash',   xPercent: 12, yPercent: 38, size: 58, opacity: 0.85 },
    recall: { id: 'recall', nameKey: 'btn_recall', xPercent: 24, yPercent: 32, size: 62, opacity: 0.95 }, // Fantastical Return
    beam:   { id: 'beam',   nameKey: 'btn_beam',   xPercent: 8,  yPercent: 52, size: 58, opacity: 0.90 }, // Celestial Beam
    ward:   { id: 'ward',   nameKey: 'btn_ward',   xPercent: 20, yPercent: 48, size: 56, opacity: 0.85 }, // Parry Ward
    nova:   { id: 'nova',   nameKey: 'btn_nova',   xPercent: 14, yPercent: 66, size: 62, opacity: 0.95 }, // Supernova
  },
};

export const PRESET_CLAW: TouchControlsLayout = {
  joystickSize: 120,
  joystickDeadzone: 10,
  joystickX: 15,
  joystickY: 18,
  buttons: {
    attack: { id: 'attack', nameKey: 'btn_attack', xPercent: 10, yPercent: 24, size: 72, opacity: 0.95 },
    jump:   { id: 'jump',   nameKey: 'btn_jump',   xPercent: 22, yPercent: 16, size: 60, opacity: 0.90 },
    dash:   { id: 'dash',   nameKey: 'btn_dash',   xPercent: 10, yPercent: 38, size: 58, opacity: 0.85 },
    recall: { id: 'recall', nameKey: 'btn_recall', xPercent: 22, yPercent: 32, size: 60, opacity: 0.95 },
    beam:   { id: 'beam',   nameKey: 'btn_beam',   xPercent: 10, yPercent: 52, size: 56, opacity: 0.90 },
    ward:   { id: 'ward',   nameKey: 'btn_ward',   xPercent: 22, yPercent: 48, size: 54, opacity: 0.85 },
    nova:   { id: 'nova',   nameKey: 'btn_nova',   xPercent: 14, yPercent: 66, size: 60, opacity: 0.95 },
  },
};

export const PRESET_LEFTY: TouchControlsLayout = {
  joystickSize: 130,
  joystickDeadzone: 10,
  joystickX: 82,
  joystickY: 22,
  buttons: {
    attack: { id: 'attack', nameKey: 'btn_attack', xPercent: 88, yPercent: 22, size: 76, opacity: 0.95 },
    jump:   { id: 'jump',   nameKey: 'btn_jump',   xPercent: 76, yPercent: 14, size: 62, opacity: 0.90 },
    dash:   { id: 'dash',   nameKey: 'btn_dash',   xPercent: 88, yPercent: 38, size: 58, opacity: 0.85 },
    recall: { id: 'recall', nameKey: 'btn_recall', xPercent: 76, yPercent: 32, size: 62, opacity: 0.95 },
    beam:   { id: 'beam',   nameKey: 'btn_beam',   xPercent: 92, yPercent: 52, size: 58, opacity: 0.90 },
    ward:   { id: 'ward',   nameKey: 'btn_ward',   xPercent: 80, yPercent: 48, size: 56, opacity: 0.85 },
    nova:   { id: 'nova',   nameKey: 'btn_nova',   xPercent: 86, yPercent: 66, size: 62, opacity: 0.95 },
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'ar',
  graphicsQuality: 'high',
  masterVolume: 0.8,
  sfxVolume: 0.85,
  musicVolume: 0.6,
  vibration: true,
  screenShake: true,
  damageNumbers: true,
  controlsLayout: DEFAULT_CONTROLS_LAYOUT,
};

const STORAGE_KEY = 'ignis_azure_2d_save_v3';

export function loadGameSave(): CloudSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        ...data,
        unlockedStage: data.unlockedStage || 1,
        completedStages: data.completedStages || [],
        skillLevels: {
          flameSlash: 1,
          fantasticalRecall: 1,
          celestialBeam: 1,
          orbitalWisps: 1,
          flameDash: 1,
          parryWard: 1,
          azureNova: 1,
          soulMagnet: 1,
          ...(data.skillLevels || {}),
        },
        settings: {
          ...DEFAULT_SETTINGS,
          ...(data.settings || {}),
          controlsLayout: {
            ...DEFAULT_CONTROLS_LAYOUT,
            ...(data.settings?.controlsLayout || {}),
            buttons: {
              ...DEFAULT_CONTROLS_LAYOUT.buttons,
              ...(data.settings?.controlsLayout?.buttons || {}),
            },
          },
        },
      };
    }
  } catch {
    // fallback
  }

  return {
    version: 3,
    timestamp: Date.now(),
    playerStats: {
      maxHp: 100,
      attackPower: 28,
      defense: 6,
      souls: 0,
      level: 1,
      xp: 0,
    },
    skillLevels: {
      flameSlash: 1,
      fantasticalRecall: 1,
      celestialBeam: 1,
      orbitalWisps: 1,
      flameDash: 1,
      parryWard: 1,
      azureNova: 1,
      soulMagnet: 1,
    },
    unlockedStage: 1,
    completedStages: [],
    totalEnemiesSlain: 0,
    settings: DEFAULT_SETTINGS,
    cloudSyncId: 'AZURE-V3-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
  };
}

export function saveGameData(data: CloudSaveData): boolean {
  try {
    const toSave: CloudSaveData = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch {
    return false;
  }
}

export function exportSaveString(data: CloudSaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importSaveString(code: string): CloudSaveData | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(code.trim())));
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.playerStats && parsed.skillLevels) {
      saveGameData(parsed);
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}
