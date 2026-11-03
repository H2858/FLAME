/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, PlayerStats } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { DamageNumber, Enemy2D } from '../game/GameEngine2D';
import { Flame, Sparkles, Pause, ShieldAlert, CircleHelp, Crosshair } from 'lucide-react';

interface HUDProps {
  lang: Language;
  stats: PlayerStats;
  comboStreak: number;
  stageName: string;
  stageIndex: number;
  kills: number;
  targetKills: number;
  bossEnemy?: Enemy2D | null;
  damageNumbers: DamageNumber[];
  flightTime?: number;
  onPause: () => void;
  onHelp: () => void;
  onBeam: () => void;
  beamCooldown: number;
}

export const HUD: React.FC<HUDProps> = ({
  lang,
  stats,
  comboStreak,
  stageName,
  stageIndex,
  kills,
  targetKills,
  bossEnemy,
  damageNumbers,
  flightTime = 0,
  onPause,
  onHelp,
  onBeam,
  beamCooldown,
}) => {
  const t = TRANSLATIONS[lang];
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xpPercent = Math.max(0, Math.min(100, (stats.xp / stats.nextXp) * 100));

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Status Perimeter */}
      <div className="w-full flex items-start justify-between">
        {/* Left: Player Vitality Cluster */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-2.5 shadow-xl max-w-xs sm:max-w-sm">
          {/* Flame Core Orb Avatar */}
          <div className="relative w-11 h-11 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Flame className="w-6 h-6 text-cyan-300 animate-none" />
            <div className="absolute -bottom-1 -right-1 bg-cyan-600 text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full border border-white">
              {stats.level}
            </div>
          </div>

          <div className="flex-1 min-w-[140px]">
            {/* Health Bar */}
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-cyan-300 flex items-center gap-1">
                {t.health}
              </span>
              <span className="font-mono text-cyan-200 tabular-nums text-[11px]">
                {Math.round(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* XP progress */}
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-purple-500 transition-all duration-150"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Boss Bar if Active */}
        {bossEnemy && bossEnemy.state !== 'dead' && (
          <div className="flex-1 max-w-md mx-4 bg-slate-950/90 border border-red-500/40 rounded-xl p-2 shadow-2xl">
            <div className="flex justify-between items-center text-xs font-bold text-red-400 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                {(t[`enemy_${bossEnemy.type}` as keyof typeof t] as string) || t.boss}
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {Math.max(0, Math.round(bossEnemy.hp))} / {bossEnemy.maxHp}
              </span>
            </div>
            <div className="w-full h-3 bg-black/80 rounded-full overflow-hidden border border-red-900">
              <div
                className="h-full bg-gradient-to-r from-purple-700 via-red-600 to-amber-500 transition-all duration-150"
                style={{
                  width: `${Math.max(0, Math.min(100, (bossEnemy.hp / bossEnemy.maxHp) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Right: Stage, Souls & Pause */}
        <div className="flex items-center gap-2">
          {/* Souls Currency Badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-lg">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span className="font-mono font-bold text-sm text-cyan-200 tabular-nums">
              {stats.souls}
            </span>
          </div>

          {/* Stage Progress Pill */}
          <div className="hidden sm:flex flex-col bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-1 text-right">
            <span className="text-[10px] text-slate-400 font-medium">
              {t.stage} {stageIndex + 1}: {stageName}
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
              {kills} / {targetKills}
            </span>
          </div>

          {/* Quick tutorial / controls guide */}
          <button
            onClick={onHelp}
            className="pointer-events-auto p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-200 active:scale-95 transition-transform shadow-lg"
            aria-label="Controls guide"
          >
            <CircleHelp className="w-5 h-5" />
          </button>

          {/* Visible destructive beam action */}
          <button
            onClick={onBeam}
            disabled={beamCooldown > 0}
            className="pointer-events-auto relative p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-300/70 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)] active:scale-90 disabled:opacity-60"
            aria-label="Fire energy beam"
          >
            <Crosshair className="w-5 h-5" />
            {beamCooldown > 0 && <span className="absolute -bottom-1 -right-1 rounded-full bg-black px-1 text-[9px] font-bold text-emerald-200">{beamCooldown.toFixed(0)}</span>}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="pointer-events-auto p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 active:scale-95 transition-transform shadow-lg"
            aria-label="Pause"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Supersonic Horizontal Flight Active Badge */}
      {flightTime > 0 && (
        <div className="self-center mt-2 flex items-center gap-2 bg-slate-950/90 border border-cyan-400 px-4 py-1.5 rounded-full shadow-[0_0_24px_rgba(6,182,212,0.6)] animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold text-cyan-200">{t.flightActive}</span>
          <span className="font-mono text-sm font-black text-white px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 tabular-nums">
            {flightTime.toFixed(1)}s
          </span>
        </div>
      )}

      {/* Center Combo Streak Popup */}
      {comboStreak > 1 && (
        <div className="self-center flex flex-col items-center">
          <div className="text-3xl sm:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.8)] font-mono animate-none">
            {comboStreak}x
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-200 bg-slate-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
            {t.combo}
          </span>
        </div>
      )}

      {/* Floating Damage Numbers Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {damageNumbers.map((dmg) => (
          <div
            key={dmg.id}
            className="absolute font-mono font-black pointer-events-none transition-all duration-300"
            style={{
              left: `${dmg.x}px`,
              top: `${dmg.y}px`,
              color: dmg.color,
              fontSize: dmg.isCrit ? '22px' : '15px',
              textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 12px rgba(6,182,212,0.8)',
              transform: 'translate(-50%, -100%)',
            }}
          >
            {dmg.text}
          </div>
        ))}
      </div>

      {/* Invisible bottom spacing so touch controls stay free */}
      <div className="h-28" />
    </div>
  );
};
