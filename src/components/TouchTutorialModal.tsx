import React from 'react';
import { Language } from '../types/game';
import { BookOpen, Hand, Flame, MoveUpRight, Shield, Wind, Heart, X } from 'lucide-react';
interface Props { lang: Language; onClose: () => void }
const cards = [
  { icon: Hand, title: 'Azure Flame', text: 'Tap or hold the right side to unleash chained flame strikes. Swipe to change the strike angle.' },
  { icon: MoveUpRight, title: 'Move & Jump', text: 'Drag on the left side to move. Swipe upward to jump. You can move and attack at the same time.' },
  { icon: Shield, title: 'Protection Shield', text: 'Tap the shield icon or swipe downward on the left side. The shield consumes stamina and blocks nearby attacks.' },
  { icon: Wind, title: 'Flight Rune', text: 'Find a rare blue rune on the ground or in the air. While flying, drag left/right to steer and up/down to control altitude. Base flight time: 5 seconds.' },
  { icon: Heart, title: 'Stamina Core', text: 'Collect glowing stamina cores found along the route and on elevated paths to refill your stamina.' },
  { icon: BookOpen, title: 'Gem Store', text: 'Defeat enemies and complete stages to earn gems. Spend them on Azure Flame, Protection Shield and longer flight duration.' },
];
export const TouchTutorialModal: React.FC<Props> = ({ onClose }) => <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6">
  <section className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6 shadow-2xl">
    <header className="mb-4 flex items-start justify-between gap-3"><div><div className="text-cyan-300 text-xs font-black tracking-[0.22em] uppercase">FLAME · FIELD GUIDE</div><h2 className="mt-1 text-2xl font-black text-white">Master the Flame</h2><p className="mt-1 text-sm text-slate-300">Two abilities. One journey. Collect rare runes to gain temporary powers.</p></div><button onClick={onClose} className="rounded-xl border border-slate-600 p-2 text-slate-300" aria-label="Close"><X size={20}/></button></header>
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{cards.map(({icon: Icon,title,text}) => <article key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/15 text-cyan-300"><Icon size={21}/></div><div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-300">{text}</p></div></article>)}</div>
    <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-black text-white">Got it — enter the fight!</button>
  </section>
</div>;
