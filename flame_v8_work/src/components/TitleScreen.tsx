/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../audio/soundManager';
import { Play } from 'lucide-react';

interface TitleScreenProps {
  lang: Language;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ lang, onStartGame }) => {
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundManager.init();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 pointer-events-none select-none">
      <div className="flex flex-col items-center justify-center gap-8 pointer-events-auto">
        <div className="relative flex items-center justify-center">
          <svg
            className="w-32 h-32 sm:w-36 sm:h-36 text-cyan-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]"
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
        <button
          type="button"
          onClick={() => { soundManager.init(); onStartGame(); }}
          className="min-w-[220px] py-4 px-9 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white font-black text-lg shadow-[0_0_34px_rgba(6,182,212,0.55)] active:scale-95 transition-transform flex items-center justify-center gap-3 border border-cyan-200/50"
          aria-label={t.startGame}
        >
          <Play className="w-5 h-5 fill-white" />
          <span>{t.startGame}</span>
        </button>
      </div>
    </div>
  );
};
