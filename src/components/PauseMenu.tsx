/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { Play, RotateCcw, Settings, Home, X, MapPin, ShoppingBag } from 'lucide-react';

interface PauseMenuProps {
  lang: Language;
  onResume: () => void;
  onRestart: () => void;
  onOpenStageSelect: () => void;
  onOpenSettings: () => void;
  onOpenStore: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  lang,
  onResume,
  onRestart,
  onOpenStageSelect,
  onOpenSettings,
  onOpenStore,
  onMainMenu,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col text-center">
        {/* Title */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-cyan-500/20">
          <h2 className="text-xl font-black text-cyan-200">
            {lang === 'ar' ? 'إيقاف مؤقت' : 'Game Paused'}
          </h2>
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buttons List */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{t.resume}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.restart}</span>
          </button>

          <button
            onClick={onOpenStageSelect}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 border border-cyan-500/30 active:scale-95 transition-all"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{t.stageSelect}</span>
          </button>



          <button
            onClick={onOpenStore}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 border border-cyan-500/40 active:scale-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Gem Store</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>{t.settings}</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs flex items-center justify-center gap-2 border border-red-900/50 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{t.mainMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
