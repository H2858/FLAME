/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, StageDefinition } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { MapPin, Skull, Lock, CheckCircle2, Play, X, Star } from 'lucide-react';

interface StageSelectModalProps {
  lang: Language;
  stages: StageDefinition[];
  currentStageIndex: number;
  unlockedStage: number;
  completedStages: number[];
  onSelectStage: (stageIndex: number) => void;
  onClose: () => void;
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({
  lang,
  stages,
  currentStageIndex,
  unlockedStage,
  completedStages,
  onSelectStage,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-cyan-200">{t.stageSelect}</h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'اختر مرحلتك لخوض غمار المعركة' : 'Select a stage to enter the battle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 20 Stages Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pr-1">
          {stages.map((stage, idx) => {
            const isUnlocked = idx + 1 <= unlockedStage;
            const isCurrent = idx === currentStageIndex;
            const isCompleted = completedStages.includes(idx + 1);
            const isBoss = stage.isBossStage;
            const stageName = t[stage.nameKey as keyof typeof t] as string;

            return (
              <div
                key={stage.id}
                className={`relative rounded-xl p-3 border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-slate-950/90 border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : isUnlocked
                    ? isBoss
                      ? 'bg-red-950/40 border-red-500/40 hover:border-red-400'
                      : 'bg-slate-950/60 border-slate-700/80 hover:border-cyan-500/40'
                    : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  {/* Top Badge: Stage Number & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-cyan-400">
                      #{stage.id}
                    </span>
                    {isBoss && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/40">
                        <Skull className="w-3 h-3 text-red-400" />
                        {t.bossStage}
                      </span>
                    )}
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <h3 className="font-bold text-xs text-white line-clamp-1 mb-1">
                    {stageName}
                  </h3>

                  {/* Difficulty stars */}
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, sIdx) => (
                      <Star
                        key={sIdx}
                        className={`w-3 h-3 ${
                          sIdx < Math.round(stage.difficultyScale)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Action button */}
                {isUnlocked ? (
                  <button
                    onClick={() => {
                      onSelectStage(idx);
                      onClose();
                    }}
                    className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                      isCurrent
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                        : isBoss
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isCurrent ? t.continueGame : t.startGame}</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-lg bg-slate-900 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t.stageLocked}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
