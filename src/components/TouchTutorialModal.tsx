import React from 'react';
import { Language } from '../types/game';
import { BookOpen, Hand, Flame, MoveUpRight, Shield, Zap, Sparkles, X } from 'lucide-react';

interface Props { lang: Language; onClose: () => void }

const cards = [
  { icon: Hand, arTitle: 'ضربة الكاتانا', enTitle: 'Katana slash', ar: 'المس أي مكان في النصف الأيمن لتضرب فوراً. أبقِ إصبعك لتتابع الضربات، أو اسحب في اتجاهات مختلفة لتنفيذ قطع أفقي أو صاعد أو هابط. يمكنك فعل ذلك أثناء الجري.', en: 'Touch anywhere on the right half to slash instantly. Hold to chain cuts, or swipe in different directions for horizontal, rising and descending strikes. You can attack while running.' },
  { icon: MoveUpRight, arTitle: 'الحركة والقفز', enTitle: 'Move and jump', ar: 'اسحب في النصف الأيسر للتحرك. اسحب للأعلى للقفز فوق الخطر. حرّك إصبعك الأيسر واستعمل الأيمن للهجوم في الوقت نفسه.', en: 'Drag on the left half to move. Swipe upward to jump over danger. Keep moving with your left thumb while attacking with your right.' },
  { icon: Zap, arTitle: 'اندفاع اللهب', enTitle: 'Flame dash', ar: 'انقر مرتين بسرعة في النصف الأيسر لتنفيذ اندفاع خاطف وتجاوز الخصم.', en: 'Double-tap the left half quickly to perform a blazing dash through danger.' },
  { icon: Shield, arTitle: 'درع الصدّ', enTitle: 'Parry ward', ar: 'اسحب للأسفل في النصف الأيسر لتفعيل درع قصير يصد الهجمات القريبة. توقيت الصد مهم.', en: 'Swipe downward on the left half to raise a brief ward against nearby attacks. Timing matters.' },
  { icon: Sparkles, arTitle: 'العودة الخيالية', enTitle: 'Fantastical recall', ar: 'اضغط مطولاً في النصف الأيسر لوضع منارة زرقاء، ثم اضغط مطولاً مرة أخرى للانتقال إليها وإطلاق موجة ضرر.', en: 'Long-press the left half to place a blue beacon. Long-press again to teleport to it and unleash a damaging return.' },
  { icon: Flame, arTitle: 'الشعاع السماوي', enTitle: 'Celestial beam', ar: 'انقر مرتين بسرعة في النصف الأيمن لإطلاق شعاع أمامي يخترق الأعداء.', en: 'Double-tap the right half quickly to fire a piercing beam forward.' },
  { icon: BookOpen, arTitle: 'الانفجار الأزرق النهائي', enTitle: 'Azure Nova ultimate', ar: 'المس الشاشة بإصبعين في اللحظة نفسها لإطلاق انفجار واسع. يحتاج إلى امتلاء طاقة النوفا؛ اجمع الطاقة بإصابة الأعداء.', en: 'Touch the screen with two fingers at the same time to unleash a wide-area nova. It requires full Nova energy, charged by landing hits.' },
];

export const TouchTutorialModal: React.FC<Props> = ({ lang, onClose }) => {
  const ar = lang === 'ar';
  return <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6" dir={ar ? 'rtl' : 'ltr'}>
    <section className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.22)]">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div><div className="text-cyan-300 text-xs font-black tracking-[0.22em] uppercase">IGNIS AZURE · FIELD MANUAL</div><h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{ar ? 'دليل المحارب — أتقن اللهب' : 'Warrior guide — Master the flame'}</h2><p className="text-slate-300 text-sm mt-1">{ar ? 'كل مهاراتك بلمسات بسيطة. يمكنك الحركة والهجوم في آن واحد.' : 'Every ability is at your fingertips. Move and attack simultaneously.'}</p></div>
        <button onClick={onClose} className="pointer-events-auto rounded-xl border border-slate-600 p-2 text-slate-300 hover:text-white" aria-label="Close"><X size={20}/></button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {cards.map(({icon: Icon, arTitle, enTitle, ar: arText, en: enText}, i) => <article key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 flex gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500/15 border border-cyan-300/25 flex items-center justify-center text-cyan-300"><Icon size={21}/></div>
          <div><h3 className="text-white font-bold text-sm">{ar ? arTitle : enTitle}</h3><p className="text-slate-300 text-xs leading-relaxed mt-1">{ar ? arText : enText}</p></div>
        </article>)}
      </div>
      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs leading-relaxed text-amber-100">{ar ? 'المهارات السلبية: شفرات اللهب المدارية تحميك تلقائياً، ومغناطيس الأرواح يجذب مكافآت الأعداء. طوّرهما من قائمة الترقيات.' : 'Passive skills: Orbital Wisps automatically protect you, while Soul Magnet attracts enemy rewards. Upgrade both in the shrine.'}</div>
      <button onClick={onClose} className="pointer-events-auto mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-white font-black shadow-lg shadow-cyan-950/50 active:scale-[0.99]">{ar ? 'فهمت — إلى المعركة!' : 'Got it — enter the fight!'}</button>
    </section>
  </div>;
};
