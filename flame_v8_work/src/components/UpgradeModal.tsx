/** @license SPDX-License-Identifier: Apache-2.0 */
import React from 'react';
import { PlayerStats, SkillLevels } from '../types/game';
import { Flame, Shield, Wind, Gem, X, Heart, Zap, Timer, Sword } from 'lucide-react';
interface Props { lang: 'ar'|'en'; stats: PlayerStats; skills: SkillLevels; flameSkin: 'azure'|'solar'; onBuySolarFlame: () => void; onUpgradeSkill: (key: keyof SkillLevels, cost: number) => void; onClose: () => void }
export const UpgradeModal: React.FC<Props> = ({ stats, skills, flameSkin, onBuySolarFlame, onUpgradeSkill, onClose }) => {
 const items = [
  {key:'attackPower' as const,title:'Flame Power',detail:'+3 damage per level',icon:Sword,color:'text-orange-300'},
  {key:'defense' as const,title:'Armor',detail:'+2 damage resistance per level',icon:Shield,color:'text-emerald-300'},
  {key:'maxHealth' as const,title:'Vitality',detail:'+12 maximum health per level',icon:Heart,color:'text-rose-300'},
  {key:'staminaCapacity' as const,title:'Stamina Capacity',detail:'+18 stamina and faster recovery per level',icon:Zap,color:'text-amber-300'},
  {key:'wardDuration' as const,title:'Ward Duration',detail:'+1.25 seconds shield duration per level',icon:Timer,color:'text-cyan-300'},
  {key:'flightDuration' as const,title:'Flight Duration',detail:'+1.5 seconds flight-token time per level',icon:Wind,color:'text-sky-300'},
 ];
 const price=(level:number)=>Math.round(45*Math.pow(1.48,Math.max(0,level-1)));
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"><div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-cyan-300/30 bg-slate-950 p-4 text-white shadow-2xl">
  <header className="mb-3 flex items-center justify-between border-b border-white/10 pb-3"><div><h2 className="text-xl font-black text-cyan-100">Gem Forge</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300"><Gem size={15} className="text-cyan-300"/>{stats.souls} Gems</p></div><button onClick={onClose} className="rounded-xl bg-white/10 p-2"><X/></button></header>
  <div className="space-y-2 overflow-y-auto pr-1">
   <article className="flex items-center gap-3 rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-950/60 to-amber-900/20 p-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/30"><Flame className="text-orange-300" size={30}/></div><div className="min-w-0 flex-1"><div className="font-bold text-orange-100">Solar Flame</div><p className="text-xs text-slate-300">Orange fire core, projectiles and rising embers</p><p className="mt-1 text-xs text-orange-200">{flameSkin==='solar'?'Owned · Equipped':'Permanent skin'}</p></div><button disabled={flameSkin==='solar'||stats.souls<160} onClick={onBuySolarFlame} className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold disabled:bg-slate-800 disabled:text-slate-500">{flameSkin==='solar'?'EQUIPPED':<>Buy · 160 <Gem size={11} className="inline"/></>}</button></article>
   {items.map(item=>{const Icon=item.icon;const level=Math.max(1,Number(skills[item.key])||1);const cost=price(level);const maxed=level>=10;const canBuy=stats.souls>=cost&&!maxed;return <article key={item.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div className="rounded-xl bg-black/30 p-2.5"><Icon className={item.color} size={22}/></div><div className="min-w-0 flex-1"><div className="font-bold text-sm">{item.title}</div><p className="text-[11px] text-slate-400">{item.detail}</p><p className="mt-1 text-xs text-cyan-200">Level {level}/10</p></div><button disabled={!canBuy} onClick={()=>onUpgradeSkill(item.key,cost)} className="min-w-[86px] rounded-xl bg-cyan-700 px-2 py-2 text-xs font-bold disabled:bg-slate-800 disabled:text-slate-500">{maxed?'MAX':<>Upgrade<br/><span className="inline-flex items-center gap-1"><Gem size={11}/>{cost}</span></>}</button></article>})}
  </div><p className="mt-3 text-center text-[10px] text-slate-500">Each upgrade is independent and changes only its own attribute.</p>
 </div></div>;
};
