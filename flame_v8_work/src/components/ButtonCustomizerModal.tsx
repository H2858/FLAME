/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language, TouchControlsLayout } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { DEFAULT_CONTROLS_LAYOUT, PRESET_CLAW, PRESET_LEFTY } from '../utils/storage';
import { Move, Check, RotateCcw, Sliders, X } from 'lucide-react';

interface ButtonCustomizerModalProps {
  lang: Language;
  layout: TouchControlsLayout;
  onSave: (newLayout: TouchControlsLayout) => void;
  onClose: () => void;
}

export const ButtonCustomizerModal: React.FC<ButtonCustomizerModalProps> = ({
  lang,
  layout: initialLayout,
  onSave,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];
  const [layout, setLayout] = useState<TouchControlsLayout>(JSON.parse(JSON.stringify(initialLayout)));
  const [selectedElement, setSelectedElement] = useState<string>('attack');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchOrMouseDown = (elementId: string) => {
    setSelectedElement(elementId);
    setIsDragging(true);
  };

  const handleScreenMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    if (selectedElement === 'joystick') {
      const xPercent = Math.max(5, Math.min(90, Math.round((clientX / screenW) * 100)));
      const yPercent = Math.max(5, Math.min(90, Math.round(((screenH - clientY) / screenH) * 100)));
      setLayout((prev) => ({
        ...prev,
        joystickX: xPercent,
        joystickY: yPercent,
      }));
    } else {
      const key = selectedElement as keyof typeof layout.buttons;
      if (layout.buttons[key]) {
        // Calculated from right edge percentage
        const xPercentFromRight = Math.max(5, Math.min(90, Math.round(((screenW - clientX) / screenW) * 100)));
        const yPercentFromBottom = Math.max(5, Math.min(90, Math.round(((screenH - clientY) / screenH) * 100)));

        setLayout((prev) => ({
          ...prev,
          buttons: {
            ...prev.buttons,
            [key]: {
              ...prev.buttons[key],
              xPercent: xPercentFromRight,
              yPercent: yPercentFromBottom,
            },
          },
        }));
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const currentSize =
    selectedElement === 'joystick'
      ? layout.joystickSize
      : layout.buttons[selectedElement as keyof typeof layout.buttons]?.size || 60;

  const currentOpacity =
    selectedElement === 'joystick'
      ? 0.9
      : layout.buttons[selectedElement as keyof typeof layout.buttons]?.opacity || 0.85;

  return (
    <div
      onMouseMove={(e) => handleScreenMove(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        if (e.touches[0]) handleScreenMove(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-between p-4 select-none backdrop-blur-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Bar with Presets & Info */}
      <div className="w-full max-w-4xl mx-auto bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            {t.customizerTitle}
          </h2>
          <p className="text-xs text-slate-400">{t.customizerDesc}</p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLayout(DEFAULT_CONTROLS_LAYOUT)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {t.presetThumb}
          </button>
          <button
            onClick={() => setLayout(PRESET_CLAW)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {t.presetClaw}
          </button>
          <button
            onClick={() => setLayout(PRESET_LEFTY)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {t.presetLefty}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayout(DEFAULT_CONTROLS_LAYOUT)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title={t.resetDefaultControls}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onSave(layout);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/50"
          >
            <Check className="w-4 h-4" />
            {t.saveControls}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screen Area with Draggable Representation of Controls */}
      <div className="flex-1 relative my-4 border border-dashed border-cyan-500/20 rounded-2xl overflow-hidden bg-slate-950/40">
        {/* Helper grid text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600/40 font-mono text-sm uppercase tracking-widest">
          {lang === 'ar' ? 'اسحب العناصر لتعديل الترتيب' : 'Drag items to reposition'}
        </div>

        {/* Joystick representation */}
        <div
          onMouseDown={() => handleTouchOrMouseDown('joystick')}
          onTouchStart={() => handleTouchOrMouseDown('joystick')}
          className={`absolute rounded-full border-2 flex items-center justify-center cursor-move transition-shadow ${
            selectedElement === 'joystick'
              ? 'border-cyan-300 ring-4 ring-cyan-400/40 bg-cyan-950/80'
              : 'border-cyan-500/50 bg-cyan-950/40'
          }`}
          style={{
            width: `${layout.joystickSize}px`,
            height: `${layout.joystickSize}px`,
            left: `${layout.joystickX}%`,
            bottom: `${layout.joystickY}%`,
            transform: 'translate(-50%, 50%)',
          }}
        >
          <Move className="w-6 h-6 text-cyan-400" />
          <span className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 whitespace-nowrap bg-black/60 px-1 rounded">
            {t.virtualJoystick}
          </span>
        </div>

        {/* Action buttons */}
        {(['attack', 'jump', 'ward'] as (keyof typeof layout.buttons)[]).map((btnKey) => {
          const btn = layout.buttons[btnKey];
          const isSelected = selectedElement === btnKey;

          return (
            <div
              key={btn.id}
              onMouseDown={() => handleTouchOrMouseDown(btnKey)}
              onTouchStart={() => handleTouchOrMouseDown(btnKey)}
              className={`absolute rounded-full border-2 flex flex-col items-center justify-center cursor-move transition-all ${
                isSelected
                  ? 'border-cyan-300 ring-4 ring-cyan-400/50 bg-cyan-600/60 shadow-[0_0_20px_rgba(6,182,212,0.8)]'
                  : 'border-cyan-500/60 bg-slate-900/80'
              }`}
              style={{
                width: `${btn.size}px`,
                height: `${btn.size}px`,
                right: `${btn.xPercent}%`,
                bottom: `${btn.yPercent}%`,
                opacity: btn.opacity,
                transform: 'translate(50%, 50%)',
              }}
            >
              <span className="text-[10px] font-bold text-white text-center leading-tight pointer-events-none px-1">
                {btnKey.toUpperCase()}
              </span>
              <span className="text-[8px] text-cyan-300 pointer-events-none">
                {btn.size}px
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Inspector for Selected Button Scale & Opacity */}
      <div className="w-full max-w-xl mx-auto bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 shadow-xl flex items-center justify-between gap-6">
        <div className="flex-1">
          <label className="text-xs text-slate-300 flex justify-between mb-1">
            <span>{t.buttonSize}</span>
            <span className="font-mono text-cyan-400">{currentSize}px</span>
          </label>
          <input
            type="range"
            min={selectedElement === 'joystick' ? 90 : 45}
            max={selectedElement === 'joystick' ? 180 : 95}
            value={currentSize}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (selectedElement === 'joystick') {
                setLayout((prev) => ({ ...prev, joystickSize: val }));
              } else {
                const key = selectedElement as keyof typeof layout.buttons;
                setLayout((prev) => ({
                  ...prev,
                  buttons: {
                    ...prev.buttons,
                    [key]: { ...prev.buttons[key], size: val },
                  },
                }));
              }
            }}
            className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {selectedElement !== 'joystick' && (
          <div className="flex-1">
            <label className="text-xs text-slate-300 flex justify-between mb-1">
              <span>{t.buttonOpacity}</span>
              <span className="font-mono text-cyan-400">
                {Math.round(currentOpacity * 100)}%
              </span>
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={Math.round(currentOpacity * 100)}
              onChange={(e) => {
                const val = parseInt(e.target.value) / 100;
                const key = selectedElement as keyof typeof layout.buttons;
                setLayout((prev) => ({
                  ...prev,
                  buttons: {
                    ...prev.buttons,
                    [key]: { ...prev.buttons[key], opacity: val },
                  },
                }));
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
