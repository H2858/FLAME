/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { GameEngine2D } from '../game/GameEngine2D';
import { GameSettings } from '../types/game';

interface GameCanvasProps {
  settings: GameSettings;
  onEngineReady: (engine: GameEngine2D) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  onEngineReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine2D | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine2D(canvasRef.current, settings);
    engineRef.current = engine;
    onEngineReady(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []); // Only initialize once

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block bg-gray-950 touch-none select-none"
    />
  );
};
