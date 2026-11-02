/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Language, PlayerStats } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../audio/soundManager';
import { Play, Sparkles, Sliders, Settings, Globe, MapPin } from 'lucide-react';

interface TitleScreenProps {
  lang: Language;
  stats: PlayerStats;
  currentStage: number;
  onStartGame: () => void;
  onOpenStageSelect: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
  onOpenCustomizer: () => void;
  onToggleLanguage: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  lang,
  stats,
  currentStage,
  onStartGame,
  onOpenStageSelect,
  onOpenUpgrades,
  onOpenSettings,
  onOpenCustomizer,
  onToggleLanguage,
}) => {
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        soundManager.init();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 pointer-events-none select-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Bar Navigation */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        {/* Souls Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-cyan-500/30 rounded-xl px-3.5 py-1.5 shadow-lg">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span className="font-mono text-sm text-cyan-200 font-bold tabular-nums">
            {stats.souls}
          </span>
          <span className="text-xs text-slate-400 font-medium">{t.souls}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-cyan-300 text-xs font-bold shadow-lg transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-cyan-300 shadow-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Hero Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-auto max-w-xl mx-auto">
        {/* Bespoke Glowing Blue Flame Lockup */}
        <div className="relative mb-3 flex items-center justify-center">
          <svg
            className="w-24 h-24 sm:w-28 sm:h-28 text-cyan-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="flameGrad" x1="50" y1="95" x2="50" y2="5" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="40%" stopColor="#00f0ff" />
                <stop offset="85%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <radialGradient id="flameCore" cx="50" cy="65" r="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M50 5C50 5 62 25 62 42C62 48 59 53 56 57C64 52 70 42 70 42C70 42 80 58 78 72C75 86 64 95 50 95C36 95 25 86 22 72C20 58 30 42 30 42C30 42 36 52 44 57C41 53 38 48 38 42C38 25 50 5 50 5Z"
              fill="url(#flameGrad)"
            />
            <circle cx="50" cy="68" r="18" fill="url(#flameCore)" />
            <path
              d="M50 20C55 35 68 45 66 65C62 55 58 50 50 45C42 50 38 55 34 65C32 45 45 35 50 20Z"
              fill="#ffffff"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Title text */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] font-serif">
          {t.gameTitle}
        </h1>
        <p className="text-sm sm:text-base font-medium text-cyan-300 mt-2 tracking-wide drop-shadow max-w-md">
          {t.gameSubtitle}
        </p>

        {/* Stage Progress Pill */}
        <div className="mt-4 bg-slate-950/80 border border-cyan-500/30 px-3.5 py-1 rounded-full text-xs font-mono text-cyan-300">
          {t.stage} {currentStage} / 20
        </div>

        {/* CTA Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-sm">
          <button
            onClick={() => {
              soundManager.init();
              onStartGame();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 border border-cyan-200/50"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>{t.startGame}</span>
          </button>
        </div>

        {/* Secondary options row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 w-full max-w-sm">
          <button
            onClick={onOpenStageSelect}
            className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{t.stageSelect}</span>
          </button>

          <button
            onClick={onOpenUpgrades}
            className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{t.upgradeShrine}</span>
          </button>

          <button
            onClick={onOpenCustomizer}
            className="w-full py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>{t.customizeControls}</span>
          </button>
        </div>
      </div>

      {/* Flat Control Hint Line */}
      <div className="w-full text-center pointer-events-none">
        <p className="text-xs text-slate-400/90 font-mono tracking-wide bg-slate-950/70 inline-block px-4 py-1.5 rounded-full border border-slate-800">
          {lang === 'ar' ? t.mobileHint : t.pcHint}
        </p>
      </div>
    </div>
  );
};
