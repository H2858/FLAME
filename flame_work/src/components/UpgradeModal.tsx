/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, PlayerStats, SkillLevels } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../audio/soundManager';
import { Sparkles, Sword, Zap, Sun, Shield, Compass, RotateCcw, X } from 'lucide-react';

interface UpgradeModalProps {
  lang: Language;
  stats: PlayerStats;
  skills: SkillLevels;
  onUpgradeSkill: (skillKey: keyof SkillLevels, cost: number) => void;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  lang,
  stats,
  skills,
  onUpgradeSkill,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];

  const skillList: {
    key: keyof SkillLevels;
    icon: React.ReactNode;
    name: string;
    desc: string;
    maxLevel: number;
  }[] = [
    {
      key: 'flameSlash',
      icon: <Sword className="w-5 h-5 text-cyan-400" />,
      name: t.skill_flameSlash,
      desc: t.skill_flameSlash_desc,
      maxLevel: 5,
    },
    {
      key: 'fantasticalRecall',
      icon: <RotateCcw className="w-5 h-5 text-amber-400" />,
      name: t.skill_fantasticalRecall,
      desc: t.skill_fantasticalRecall_desc,
      maxLevel: 5,
    },
    {
      key: 'celestialBeam',
      icon: <Sun className="w-5 h-5 text-sky-400" />,
      name: t.skill_celestialBeam,
      desc: t.skill_celestialBeam_desc,
      maxLevel: 5,
    },
    {
      key: 'parryWard',
      icon: <Shield className="w-5 h-5 text-teal-400" />,
      name: t.skill_parryWard,
      desc: t.skill_parryWard_desc,
      maxLevel: 5,
    },
    {
      key: 'flameDash',
      icon: <Zap className="w-5 h-5 text-cyan-300" />,
      name: t.skill_flameDash,
      desc: t.skill_flameDash_desc,
      maxLevel: 5,
    },
    {
      key: 'azureNova',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      name: t.skill_azureNova,
      desc: t.skill_azureNova_desc,
      maxLevel: 5,
    },
    {
      key: 'soulMagnet',
      icon: <Compass className="w-5 h-5 text-blue-400" />,
      name: t.skill_soulMagnet,
      desc: t.skill_soulMagnet_desc,
      maxLevel: 5,
    },
  ];

  const getUpgradeCost = (currentLvl: number) => {
    return Math.round(25 * Math.pow(1.8, currentLvl - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-cyan-200">{t.upgradeShrine}</h2>
              <p className="text-xs text-slate-400">
                {t.availableSouls}:{' '}
                <span className="font-mono text-cyan-300 font-bold">
                  {stats.souls}
                </span>
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

        {/* Skill Upgrades List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {skillList.map((skill) => {
            const currentLevel = skills[skill.key];
            const isMax = currentLevel >= skill.maxLevel;
            const cost = getUpgradeCost(currentLevel);
            const canAfford = stats.souls >= cost && !isMax;

            return (
              <div
                key={skill.key}
                className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 shrink-0">
                    {skill.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-100">
                        {skill.name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                        {t.level} {currentLevel} / {skill.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {skill.desc}
                    </p>
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  disabled={!canAfford}
                  onClick={() => {
                    if (canAfford) {
                      soundManager.playVictory();
                      onUpgradeSkill(skill.key, cost);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex flex-col items-center min-w-[90px] transition-all ${
                    isMax
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : canAfford
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 active:scale-95'
                      : 'bg-slate-800/80 text-slate-400 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  {isMax ? (
                    <span>{t.maxed}</span>
                  ) : (
                    <>
                      <span>{t.upgrade}</span>
                      <span className="font-mono text-[11px] text-cyan-200">
                        {cost} {t.souls}
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Stats Summary */}
        <div className="border-t border-cyan-500/20 pt-3 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">{t.health}</span>
            <div className="font-mono font-bold text-cyan-300 mt-0.5">
              {stats.maxHp}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">{t.skill_flameSlash}</span>
            <div className="font-mono font-bold text-cyan-300 mt-0.5">
              {stats.attackPower}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">Critical</span>
            <div className="font-mono font-bold text-cyan-300 mt-0.5">
              {Math.round(stats.critChance * 100)}%
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">Speed</span>
            <div className="font-mono font-bold text-cyan-300 mt-0.5">
              {stats.speed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
