import React, { useRef } from 'react';
import { GameEngine2D } from '../game/GameEngine2D';

interface Props { engine: GameEngine2D | null }
type Zone = 'move' | 'attack';
interface PointerState { zone: Zone; startX: number; startY: number; startedAt: number }

/** Two-zone, multi-touch combat: left thumb moves; right thumb attacks immediately.
 * The left thumb moves; all combat actions use visible HUD buttons. */
export const TouchGestureControls: React.FC<Props> = ({ engine }) => {
  const pointers = useRef(new Map<number, PointerState>());
  const leftPointer = useRef<number | null>(null);
  const rightPointer = useRef<number | null>(null);

  const clearMove = () => {
    if (engine && leftPointer.current === null) engine.moveInput = { x: 0, y: 0 };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engine || pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    const zone: Zone = e.clientX >= window.innerWidth * 0.5 ? 'attack' : 'move';
    const now = performance.now();
    pointers.current.set(e.pointerId, { zone, startX: e.clientX, startY: e.clientY, startedAt: now });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (zone === 'move' && leftPointer.current === null) {
      leftPointer.current = e.pointerId;
    } else if (zone === 'attack' && rightPointer.current === null) {
      rightPointer.current = e.pointerId;
      // The right half is intentionally passive: combat is triggered only by the visible sword button.
    }


  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engine) return;
    const state = pointers.current.get(e.pointerId);
    if (!state) return;
    e.preventDefault();
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const now = performance.now();

    if (state.zone === 'move' && leftPointer.current === e.pointerId) {
      // Thumb-relative analog movement; dead-zone and smoothing reduce jitter.
      const target = Math.max(-1, Math.min(1, dx / 68));
      const vertical = engine.isHorizontalFlightActive ? Math.max(-1, Math.min(1, dy / 68)) : 0;
      engine.moveInput = { x: Math.abs(target) < 0.12 ? 0 : target, y: Math.abs(vertical) < 0.12 ? 0 : vertical };
      if (Math.abs(target) > 0.12) engine.facing = target > 0 ? 1 : -1;
      if (!engine.isHorizontalFlightActive && dy < -58 && Math.abs(dy) > Math.abs(dx) * 1.2 && now - state.startedAt < 450) {
        engine.jump();
        state.startedAt = now + 10000; // one jump per gesture
      }
    }
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointers.current.get(e.pointerId);
    if (!state || !engine) return;
    e.preventDefault();
    if (state.zone === 'move') {
      if (leftPointer.current === e.pointerId) leftPointer.current = null;

    } else if (rightPointer.current === e.pointerId) {
      rightPointer.current = null;
    }
    pointers.current.delete(e.pointerId);
    clearMove();
  };

  const onCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (leftPointer.current === e.pointerId) leftPointer.current = null;
    if (rightPointer.current === e.pointerId) rightPointer.current = null;
    clearMove();
  };

  return <div
    className="absolute left-0 top-0 bottom-0 z-[9] w-1/2 touch-none select-none"
    style={{ touchAction: 'none' }}
    onPointerDown={onDown}
    onPointerMove={onMove}
    onPointerUp={onUp}
    onPointerCancel={onCancel}
    onLostPointerCapture={onCancel}
    onContextMenu={(e) => e.preventDefault()}
  />;
};
