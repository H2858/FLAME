/** @license SPDX-License-Identifier: Apache-2.0 */
import React from 'react';
import { PlayerStats, SkillLevels } from '../types/game';
import { Flame, Shield, Wind, Gem, X, ArrowUpCircle } from 'lucide-react';

interface Props { lang: 'ar'|'en'; stats: PlayerStats; skills: SkillLevels; onUpgradeSkill: (key: keyof SkillLevels, cost: number) => void; onClose: () => void }
export const UpgradeModal: React.FC<Props> = ({ stats, skills, onUpgradeSkill, onClose }) => {
  const items = [
    { key: 'flameSlash' as const, title: 'Azure Flame', detail: 'Increase flame attack damage.', level: skills.flameSlash, cap: 10, icon: Flame, color: 'text-cyan-300' },
    { key: 'parryWard' as const, title: 'Protection Shield', detail: 'Increase shield duration and vitality.', level: skills.parryWard, cap: 10, icon: Shield, color: 'text-emerald-300' },
    { key: 'flightDuration' as const, title: 'Flight Duration', detail: 'Extend flight-token time by 1.5 seconds per level.', level: stats.flightLevel || 1, cap: 8, icon: Wind, color: 'text-sky-300' },
  ];
  const price = (level: number) => Math.round(35 * Math.pow(1.65, level - 1));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-cyan-400/30 bg-slate-950 p-5 text-white shadow-2xl">
    <header className="mb-4 flex items-center justify-between border-b border-white/10 pb-4"><div><h2 className="text-xl font-black text-cyan-200">Gem Store</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300"><Gem size={15} className="text-cyan-300"/>{stats.souls} Gems available</p></div><button onClick={onClose} className="rounded-xl bg-white/10 p-2"><X/></button></header>
    <div className="space-y-3 overflow-y-auto">{items.map(item => { const Icon = item.icon; const cost = price(item.level); const maxed = item.level >= item.cap; const canBuy = stats.souls >= cost && !maxed; return <article key={item.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="rounded-xl border border-white/10 bg-black/30 p-3"><Icon className={item.color} size={25}/></div><div className="min-w-0 flex-1"><div className="font-bold">{item.title}</div><p className="text-xs text-slate-400">{item.detail}</p><p className="mt-1 text-xs text-cyan-200">Level {item.level} / {item.cap}</p></div><button disabled={!canBuy} onClick={() => onUpgradeSkill(item.key,cost)} className={`flex min-w-[88px] flex-col items-center rounded-xl px-3 py-2 text-xs font-bold ${canBuy ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{maxed ? 'MAX' : <><span className="flex items-center gap-1"><ArrowUpCircle size={13}/> Upgrade</span><span className="mt-1 flex items-center gap-1"><Gem size={12}/>{cost}</span></>}</button></article>})}</div>
    <p className="mt-4 text-center text-[11px] text-slate-500">Collect gems by defeating enemies and completing stages.</p>
  </div></div>;
};
