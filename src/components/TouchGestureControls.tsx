import React, { useRef } from 'react';
import { GameEngine2D } from '../game/GameEngine2D';

interface Props { engine: GameEngine2D | null }
type Zone = 'move' | 'attack';
interface PointerState { zone: Zone; startX: number; startY: number; lastX: number; lastY: number; startedAt: number; lastSlashAt: number; longPressFired: boolean; repeatFired: boolean }

/** Two-zone, multi-touch combat: left thumb moves; right thumb attacks immediately.
 * Both pointers may be held at once, so the hero can run and slash simultaneously. */
export const TouchGestureControls: React.FC<Props> = ({ engine }) => {
  const pointers = useRef(new Map<number, PointerState>());
  const lastTap = useRef<{ zone: Zone; time: number } | null>(null);
  const repeatTimer = useRef<number | null>(null);
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
    pointers.current.set(e.pointerId, { zone, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, startedAt: now, lastSlashAt: now, longPressFired: false, repeatFired: false });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (zone === 'move' && leftPointer.current === null) {
      leftPointer.current = e.pointerId;
    } else if (zone === 'attack' && rightPointer.current === null) {
      rightPointer.current = e.pointerId;
      // Attack on pointer-down: no waiting for pointer-up/tap recognition.
      engine.performAttack('horizontal');
    }


  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engine) return;
    const state = pointers.current.get(e.pointerId);
    if (!state) return;
    e.preventDefault();
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const stepX = e.clientX - state.lastX;
    const stepY = e.clientY - state.lastY;
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
    } else if (state.zone === 'attack' && rightPointer.current === e.pointerId) {
      // Any deliberate swipe on the right side is a sword cut, not movement.
      if (Math.hypot(dx, dy) > 34 && now - state.lastSlashAt > 115) {
        const direction = Math.abs(stepY) > Math.abs(stepX) * 1.2
          ? (stepY < 0 ? 'rising' : 'descending')
          : 'horizontal';
        if (Math.abs(stepX) > 4) engine.facing = stepX > 0 ? 1 : -1;
        engine.performAttack(direction);
        state.lastSlashAt = now;
        state.startX = e.clientX;
        state.startY = e.clientY;
      }
    }
    state.lastX = e.clientX;
    state.lastY = e.clientY;
  };

  const stopRepeater = () => {
    if (repeatTimer.current !== null) window.clearInterval(repeatTimer.current);
    repeatTimer.current = null;
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointers.current.get(e.pointerId);
    if (!state || !engine) return;
    e.preventDefault();
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const elapsed = performance.now() - state.startedAt;
    const distance = Math.hypot(dx, dy);

    if (state.zone === 'move') {
      if (leftPointer.current === e.pointerId) leftPointer.current = null;
      if (!state.longPressFired && dy > 60 && dy > Math.abs(dx) * 1.2) engine.performParryWard();
      else if (!state.longPressFired && distance < 24) {
        const now = performance.now();
        lastTap.current = { zone: 'move', time: now };
      }
    } else if (rightPointer.current === e.pointerId) {
      rightPointer.current = null;
      if (distance < 24 && elapsed < 260 && !state.repeatFired) {
        const now = performance.now();
        lastTap.current = { zone: 'attack', time: now };
      }
    }
    pointers.current.delete(e.pointerId);
    clearMove();
    if (pointers.current.size === 0) stopRepeater();
  };

  const onCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (leftPointer.current === e.pointerId) leftPointer.current = null;
    if (rightPointer.current === e.pointerId) rightPointer.current = null;
    clearMove();
    if (pointers.current.size === 0) stopRepeater();
  };

  // Gesture repeat supports only the two retained abilities: flame attack and shield.
  const onPointerDownCapture = () => {
    if (repeatTimer.current !== null) window.clearInterval(repeatTimer.current);
    repeatTimer.current = window.setInterval(() => {
      if (!engine) return;
      const id = leftPointer.current;
      const state = id === null ? undefined : pointers.current.get(id);
      if (state && performance.now() - state.startedAt > 650 && !state.longPressFired) {
        state.longPressFired = true;
        engine.performParryWard();
      }
      // Holding the right side repeats quick cuts while the left side can keep moving.
      const rightId = rightPointer.current;
      const rightState = rightId === null ? undefined : pointers.current.get(rightId);
      if (rightState && performance.now() - rightState.lastSlashAt >= 265) {
        engine.performAttack('horizontal');
        rightState.repeatFired = true;
        rightState.lastSlashAt = performance.now();
      }
    }, 45);
  };

  return <div
    className="absolute inset-0 z-[9] touch-none select-none"
    style={{ touchAction: 'none' }}
    onPointerDownCapture={onPointerDownCapture}
    onPointerDown={onDown}
    onPointerMove={onMove}
    onPointerUp={onUp}
    onPointerCancel={onCancel}
    onLostPointerCapture={onCancel}
    onPointerLeave={stopRepeater}
    onContextMenu={(e) => e.preventDefault()}
  />;
};
