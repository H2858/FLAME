/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { RotateCcw, ArrowRight, Home, Sparkles, Skull, MapPin } from 'lucide-react';

interface GameOverVictoryModalProps {
  type: 'game_over' | 'victory';
  lang: Language;
  soulsEarned: number;
  stageName: string;
  isLastStage?: boolean;
  onRetry: () => void;
  onNextStage?: () => void;
  onOpenStageSelect?: () => void;
  onOpenUpgrades: () => void;
  onMainMenu: () => void;
}

export const GameOverVictoryModal: React.FC<GameOverVictoryModalProps> = ({
  type,
  lang,
  soulsEarned,
  stageName,
  isLastStage = false,
  onRetry,
  onNextStage,
  onOpenStageSelect,
  onOpenUpgrades,
  onMainMenu,
}) => {
  const t = TRANSLATIONS[lang];
  const isVictory = type === 'victory';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col text-center">
        {/* Emblem */}
        <div className="mx-auto mb-3">
          {isVictory ? (
            <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]">
              <Sparkles className="w-9 h-9 text-cyan-300" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <Skull className="w-9 h-9 text-red-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-black mb-1 ${
            isVictory ? 'text-cyan-200' : 'text-red-400'
          }`}
        >
          {isVictory ? t.victory : t.gameOver}
        </h2>
        <p className="text-xs text-slate-400 mb-2">{stageName}</p>

        {isVictory && (
          <p className="text-xs text-cyan-200 font-medium mb-4 px-3 py-2 bg-cyan-950/70 rounded-xl border border-cyan-500/40 leading-relaxed shadow-lg">
            💙 {t.victoryStory}
          </p>
        )}

        {/* Reward Box */}
        <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3 mb-5 flex items-center justify-around">
          <div>
            <span className="text-[11px] text-slate-400">{t.souls}</span>
            <div className="font-mono text-base font-bold text-cyan-300 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>+{soulsEarned}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {isVictory && onNextStage && (
            <button
              onClick={onNextStage}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/50 active:scale-95 transition-all"
            >
              <span>{isLastStage ? t.mainMenu : t.nextStage}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onRetry}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all ${
              !isVictory
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.tryAgain}</span>
          </button>

          {onOpenStageSelect && (
            <button
              onClick={onOpenStageSelect}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 border border-cyan-500/30 active:scale-95 transition-all"
            >
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>{t.stageSelect}</span>
            </button>
          )}

          <button
            onClick={onOpenUpgrades}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 border border-cyan-500/30 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{t.upgradeShrine}</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 font-medium text-xs flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.mainMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
