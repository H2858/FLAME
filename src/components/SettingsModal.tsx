/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CloudSaveData, GameSettings, GraphicsQuality, Language } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../audio/soundManager';
import { exportSaveString, importSaveString } from '../utils/storage';
import {
  Settings,
  Volume2,
  Tv,
  Globe,
  Cloud,
  Copy,
  Download,
  Upload,
  Check,
  X,
  Smartphone,
} from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  fullSaveData: CloudSaveData;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onImportData: (data: CloudSaveData) => void;
  onOpenControlsCustomizer: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  fullSaveData,
  onUpdateSettings,
  onImportData,
  onOpenControlsCustomizer,
  onClose,
}) => {
  const t = TRANSLATIONS[settings.language];
  const [copied, setCopied] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleCopySyncCode = () => {
    const code = exportSaveString(fullSaveData);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplySyncCode = () => {
    const imported = importSaveString(syncCodeInput);
    if (imported) {
      onImportData(imported);
      setImportStatus(t.importSuccess);
    } else {
      setImportStatus(t.importError);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullSaveData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ignis_azure_save_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.playerStats) {
          onImportData(parsed);
          setImportStatus(t.importSuccess);
        } else {
          setImportStatus(t.importError);
        }
      } catch {
        setImportStatus(t.importError);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-none"
      dir={settings.language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center">
              <Settings className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-cyan-200">{t.settings}</h2>
              <p className="text-xs text-slate-400">{t.gameSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm">
          {/* 1. Language Selection */}
          <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-2.5">
              <Globe className="w-4 h-4" />
              <span>{t.languageLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onUpdateSettings({ ...settings, language: 'ar' });
                  document.documentElement.setAttribute('dir', 'rtl');
                  document.documentElement.setAttribute('lang', 'ar');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  settings.language === 'ar'
                    ? 'bg-cyan-600 border-cyan-300 text-white shadow-md shadow-cyan-900/50'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                العربية (Arabic)
              </button>
              <button
                onClick={() => {
                  onUpdateSettings({ ...settings, language: 'en' });
                  document.documentElement.setAttribute('dir', 'ltr');
                  document.documentElement.setAttribute('lang', 'en');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  settings.language === 'en'
                    ? 'bg-cyan-600 border-cyan-300 text-white shadow-md shadow-cyan-900/50'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                English (English)
              </button>
            </div>
          </div>

          {/* 2. Graphics Quality */}
          <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-2.5">
              <Tv className="w-4 h-4" />
              <span>{t.qualityLabel}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['ultra', 'high', 'medium', 'low'] as GraphicsQuality[]).map((q) => {
                const labelMap = {
                  ultra: t.qualityUltra,
                  high: t.qualityHigh,
                  medium: t.qualityMed,
                  low: t.qualityLow,
                };
                const isSelected = settings.graphicsQuality === q;
                return (
                  <button
                    key={q}
                    onClick={() => onUpdateSettings({ ...settings, graphicsQuality: q })}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-colors text-center ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-300 text-white shadow-md shadow-cyan-900/50'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {labelMap[q]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Audio & Haptics */}
          <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Volume2 className="w-4 h-4" />
              <span>{t.sound}</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>{t.masterVol}</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  soundManager.setVolumes(val, settings.sfxVolume, settings.musicVolume);
                  onUpdateSettings({ ...settings, masterVolume: val });
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>{t.sfxVol}</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  soundManager.setVolumes(settings.masterVolume, val, settings.musicVolume);
                  onUpdateSettings({ ...settings, sfxVolume: val });
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.vibration}
                  onChange={(e) => {
                    soundManager.setVibration(e.target.checked);
                    onUpdateSettings({ ...settings, vibration: e.target.checked });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>{t.vibrationToggle}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.screenShake}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, screenShake: e.target.checked })
                  }
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>{t.screenShakeToggle}</span>
              </label>
            </div>
          </div>

          {/* 4. Cloud Save & Sync */}
          <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Cloud className="w-4 h-4" />
                <span>{t.cloudSyncTitle}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <Check className="w-3 h-3" />
                {t.cloudStatusSynced}
              </span>
            </div>

            <p className="text-xs text-slate-400">{t.cloudSyncDesc}</p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleCopySyncCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? t.syncCodeCopied : t.copySyncCode}
              </button>

              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t.exportSave}
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{t.importSave}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>

            {/* Sync Code Paste Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder={t.enterSyncCode}
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                onClick={handleApplySyncCode}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0"
              >
                {t.applySyncCode}
              </button>
            </div>

            {importStatus && (
              <div className="text-xs text-cyan-300 font-mono bg-cyan-950/40 p-2 rounded border border-cyan-500/30">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
