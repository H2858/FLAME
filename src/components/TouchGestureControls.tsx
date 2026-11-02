import React, { useRef } from 'react';
import { GameEngine2D } from '../game/GameEngine2D';

interface Props { engine: GameEngine2D | null }

/** Invisible, multi-touch-safe gesture layer: drag to move, tap to slash,
 * flick upward to jump, and a fast horizontal flick to dash. */
export const TouchGestureControls: React.FC<Props> = ({ engine }) => {
  const active = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0, time: 0, lastX: 0 });
  const moved = useRef(false);

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    if (active.current !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const elapsed = Math.max(1, performance.now() - start.current.time);
    const distance = Math.hypot(dx, dy);
    if (engine) {
      if (distance < 22 && elapsed < 260) engine.performAttack();
      else if (dy < -65 && Math.abs(dy) > Math.abs(dx) * 1.15) engine.jump();
      else if (Math.abs(dx) > 95 && elapsed < 320) engine.performDash();
      engine.moveInput = { x: 0, y: 0 };
    }
    active.current = null;
    moved.current = false;
  };

  return <div
    className="absolute inset-0 z-[9] touch-none select-none"
    style={{ touchAction: 'none' }}
    onPointerDown={(e) => {
      if (active.current !== null || !engine) return;
      active.current = e.pointerId;
      start.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, time: performance.now() };
      moved.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={(e) => {
      if (active.current !== e.pointerId || !engine) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.hypot(dx, dy) > 22) moved.current = true;
      // Horizontal drag is analog movement; vertical movement is reserved for jump.
      engine.moveInput = { x: Math.max(-1, Math.min(1, dx / 78)), y: 0 };
      if (dx > 8) engine.facing = 1;
      else if (dx < -8) engine.facing = -1;
      start.current.lastX = e.clientX;
    }}
    onPointerUp={finish}
    onPointerCancel={finish}
    onContextMenu={(e) => e.preventDefault()}
  />;
};
