/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { GameEngine2D } from '../game/GameEngine2D';
import { TouchControlsLayout } from '../types/game';
import { Sword, Zap, Shield, Sparkles, RotateCcw, ArrowUp, Sun } from 'lucide-react';

interface MobileControlsProps {
  engine: GameEngine2D | null;
  layout: TouchControlsLayout;
  cooldowns: {
    dash: number;
    beam: number;
    ward: number;
    nova: number;
    recall: number;
    recallActive: boolean;
    novaEnergy: number;
  };
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  engine,
  layout,
  cooldowns,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;

    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      updateKnob(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(-50%, -50%)';
        }
        if (engine) {
          engine.moveInput = { x: 0, y: 0 };
        }
        break;
      }
    }
  };

  const updateKnob = (touchX: number, touchY: number) => {
    const dx = touchX - joystickCenter.current.x;
    const dy = touchY - joystickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = layout.joystickSize / 2;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    if (engine) {
      if (dist < layout.joystickDeadzone) {
        engine.moveInput = { x: 0, y: 0 };
      } else {
        const norm = clampedDist / maxRadius;
        engine.moveInput = {
          x: Math.cos(angle) * norm,
          y: Math.sin(angle) * norm,
        };

        if (dy < -maxRadius * 0.55 && engine.isGrounded) {
          engine.jump();
        }
      }
    }
  };

  useEffect(() => {
    const handleWindowTouchEnd = () => {
      activeTouchId.current = null;
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate(-50%, -50%)';
      }
      if (engine) {
        engine.moveInput = { x: 0, y: 0 };
      }
    };
    window.addEventListener('touchend', handleWindowTouchEnd);
    return () => window.removeEventListener('touchend', handleWindowTouchEnd);
  }, [engine]);

  const { buttons } = layout;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* 1. Virtual Analog Stick */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute pointer-events-auto rounded-full bg-cyan-950/40 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center backdrop-blur-none"
        style={{
          width: `${layout.joystickSize}px`,
          height: `${layout.joystickSize}px`,
          left: `${layout.joystickX}%`,
          bottom: `${layout.joystickY}%`,
          transform: 'translate(-50%, 50%)',
        }}
      >
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40 top-2" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40 bottom-2" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40 left-2" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40 right-2" />

        <div
          ref={knobRef}
          className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg border border-cyan-200/60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
        />
      </div>

      {/* 2. Attack Button (Sword 3-Hit Combo) */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          engine?.performAttack();
        }}
        onClick={() => engine?.performAttack()}
        className="absolute pointer-events-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 active:scale-90 active:brightness-125 border-2 border-cyan-200/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center transition-transform"
        style={{
          width: `${buttons.attack.size}px`,
          height: `${buttons.attack.size}px`,
          right: `${buttons.attack.xPercent}%`,
          bottom: `${buttons.attack.yPercent}%`,
          opacity: buttons.attack.opacity,
          transform: 'translate(50%, 50%)',
        }}
        aria-label="Attack"
      >
        <Sword className="w-8 h-8 text-white drop-shadow" />
      </button>

      {/* 3. Dedicated Jump Button */}
      {buttons.jump && (
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.jump();
          }}
          onClick={() => engine?.jump()}
          className="absolute pointer-events-auto rounded-full bg-gradient-to-t from-blue-950 to-sky-900 active:scale-90 border-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)] flex items-center justify-center transition-transform"
          style={{
            width: `${buttons.jump.size}px`,
            height: `${buttons.jump.size}px`,
            right: `${buttons.jump.xPercent}%`,
            bottom: `${buttons.jump.yPercent}%`,
            opacity: buttons.jump.opacity,
            transform: 'translate(50%, 50%)',
          }}
          aria-label="Jump"
        >
          <ArrowUp className="w-7 h-7 text-sky-200" />
        </button>
      )}

      {/* 4. Dash Button */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          engine?.performDash();
        }}
        onClick={() => engine?.performDash()}
        className="absolute pointer-events-auto rounded-full bg-blue-950/80 active:scale-90 border-2 border-cyan-400/70 shadow-lg flex items-center justify-center overflow-hidden transition-transform"
        style={{
          width: `${buttons.dash.size}px`,
          height: `${buttons.dash.size}px`,
          right: `${buttons.dash.xPercent}%`,
          bottom: `${buttons.dash.yPercent}%`,
          opacity: buttons.dash.opacity,
          transform: 'translate(50%, 50%)',
        }}
        aria-label="Dash"
      >
        <Zap className="w-6 h-6 text-cyan-300" />
        {cooldowns.dash > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold font-mono text-cyan-300">
            {cooldowns.dash.toFixed(1)}
          </div>
        )}
      </button>

      {/* 5. Fantastical Return Button (العودة الخيالية) */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          engine?.performFantasticalRecall();
        }}
        onClick={() => engine?.performFantasticalRecall()}
        className={`absolute pointer-events-auto rounded-full active:scale-90 border-2 shadow-[0_0_20px_rgba(56,189,248,0.6)] flex items-center justify-center overflow-hidden transition-all ${
          cooldowns.recallActive
            ? 'bg-gradient-to-r from-amber-500 to-cyan-400 border-white text-white scale-105'
            : 'bg-blue-950/80 border-sky-400/70 text-sky-300'
        }`}
        style={{
          width: `${buttons.recall.size}px`,
          height: `${buttons.recall.size}px`,
          right: `${buttons.recall.xPercent}%`,
          bottom: `${buttons.recall.yPercent}%`,
          opacity: buttons.recall.opacity,
          transform: 'translate(50%, 50%)',
        }}
        aria-label="Fantastical Recall"
      >
        <RotateCcw className={`w-6 h-6 ${cooldowns.recallActive ? 'animate-spin' : ''}`} />
        {cooldowns.recall > 0 && !cooldowns.recallActive && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold font-mono text-sky-300">
            {cooldowns.recall.toFixed(1)}
          </div>
        )}
      </button>

      {/* 6. Celestial Beam Button */}
      {buttons.beam && (
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.performCelestialBeam();
          }}
          onClick={() => engine?.performCelestialBeam()}
          className="absolute pointer-events-auto rounded-full bg-blue-950/80 active:scale-90 border-2 border-cyan-300/80 shadow-lg flex items-center justify-center overflow-hidden transition-transform"
          style={{
            width: `${buttons.beam.size}px`,
            height: `${buttons.beam.size}px`,
            right: `${buttons.beam.xPercent}%`,
            bottom: `${buttons.beam.yPercent}%`,
            opacity: buttons.beam.opacity,
            transform: 'translate(50%, 50%)',
          }}
          aria-label="Celestial Beam"
        >
          <Sun className="w-6 h-6 text-cyan-300" />
          {cooldowns.beam > 0 && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold font-mono text-cyan-300">
              {cooldowns.beam.toFixed(1)}
            </div>
          )}
        </button>
      )}

      {/* 7. Parry Ward Button */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          engine?.performParryWard();
        }}
        onClick={() => engine?.performParryWard()}
        className="absolute pointer-events-auto rounded-full bg-blue-950/80 active:scale-90 border-2 border-teal-400/70 shadow-lg flex items-center justify-center overflow-hidden transition-transform"
        style={{
          width: `${buttons.ward.size}px`,
          height: `${buttons.ward.size}px`,
          right: `${buttons.ward.xPercent}%`,
          bottom: `${buttons.ward.yPercent}%`,
          opacity: buttons.ward.opacity,
          transform: 'translate(50%, 50%)',
        }}
        aria-label="Shield Parry"
      >
        <Shield className="w-6 h-6 text-teal-300" />
        {cooldowns.ward > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold font-mono text-teal-300">
            {cooldowns.ward.toFixed(1)}
          </div>
        )}
      </button>

      {/* 8. Supernova Button */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          engine?.performNova();
        }}
        onClick={() => engine?.performNova()}
        className={`absolute pointer-events-auto rounded-full active:scale-90 border-2 shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center overflow-hidden transition-all ${
          cooldowns.novaEnergy >= 100
            ? 'bg-gradient-to-tr from-purple-600 to-cyan-400 border-white text-white'
            : 'bg-slate-900/80 border-purple-500/50 text-purple-400 opacity-80'
        }`}
        style={{
          width: `${buttons.nova.size}px`,
          height: `${buttons.nova.size}px`,
          right: `${buttons.nova.xPercent}%`,
          bottom: `${buttons.nova.yPercent}%`,
          opacity: buttons.nova.opacity,
          transform: 'translate(50%, 50%)',
        }}
        aria-label="Supernova"
      >
        <Sparkles className="w-7 h-7 drop-shadow" />
        {cooldowns.novaEnergy < 100 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold font-mono text-purple-300">
            {Math.round(cooldowns.novaEnergy)}%
          </div>
        )}
      </button>
    </div>
  );
};
