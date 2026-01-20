
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tile, GameState, LevelConfig, GoalType, SpecialType } from './types';
import { LEVELS, GRID_ROWS, GRID_COLS, GEM_COLORS, GEM_ICONS } from './constants';
import { initializeGrid, findMatches, checkAdjacent, createTile, handleExplosion } from './utils/gameLogic';
import { motion, AnimatePresence } from 'framer-motion';

interface VFXEffect {
  id: string;
  type: 'laser-h' | 'laser-v' | 'bomb-burst' | 'match-pop';
  r: number;
  c: number;
}

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<'start' | 'level-select' | 'playing' | 'won' | 'lost'>('start');
  const [vfx, setVfx] = useState<VFXEffect[]>([]);
  const [gameState, setGameState] = useState<Omit<GameState, 'gameStatus'>>({
    grid: [],
    score: 0,
    movesLeft: 0,
    currentLevel: LEVELS[0],
    selectedTile: null,
    isProcessing: false,
  });

  const dragStartPos = useRef<{ x: number, y: number, r: number, c: number } | null>(null);
  const isSwappingRef = useRef(false);

  const startLevel = (level: LevelConfig) => {
    setGameState({
      grid: initializeGrid(level),
      score: 0,
      movesLeft: level.moves,
      currentLevel: JSON.parse(JSON.stringify(level)),
      selectedTile: null,
      isProcessing: false,
    });
    setGameStatus('playing');
  };

  const addVFX = (type: VFXEffect['type'], r: number, c: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setVfx(prev => [...prev, { id, type, r, c }]);
    setTimeout(() => {
      setVfx(prev => prev.filter(v => v.id !== id));
    }, 600);
  };

  const shuffleGrid = () => {
    if (gameState.isProcessing || gameState.movesLeft <= 0) return;

    const currentGrid = [...gameState.grid.map(row => [...row])];
    const gemPositions: { r: number, c: number }[] = [];
    const colorPool: number[] = [];

    // Reset special tiles and collect movable gems
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = currentGrid[r][c];
        if (tile && tile.type === 'gem' && !tile.isChained && tile.obstacle !== 'ice') {
          // Rule: Special blocks should be cleared (reset to normal)
          if (tile.special !== 'none') {
            tile.special = 'none';
          }
          gemPositions.push({ r, c });
          colorPool.push(tile.colorIndex);
        }
      }
    }

    if (gemPositions.length === 0) return;

    let attempts = 0;
    let foundValidShuffle = false;
    const maxAttempts = 100;

    while (!foundValidShuffle && attempts < maxAttempts) {
      attempts++;
      for (let i = colorPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
      }
      gemPositions.forEach((pos, idx) => {
        const tile = currentGrid[pos.r][pos.c]!;
        currentGrid[pos.r][pos.c] = { ...tile, colorIndex: colorPool[idx] };
      });
      const matchGroups = findMatches(currentGrid);
      if (matchGroups.length === 0) {
        foundValidShuffle = true;
      }
    }

    setGameState(prev => ({
      ...prev,
      grid: currentGrid,
      movesLeft: prev.movesLeft - 1,
      isProcessing: true
    }));

    setTimeout(() => {
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }, 400);
  };

  const checkWinCondition = (currentScore: number, goals: any[], moves: number) => {
    const allMet = goals.every(g => g.current >= g.target);
    if (allMet) {
      setGameStatus('won');
      return true;
    } else if (moves <= 0) {
      setGameStatus('lost');
      return true;
    }
    return false;
  };

  const processGrid = async (initialGrid: (Tile | null)[][]) => {
    let currentGrid = [...initialGrid.map(row => [...row])];
    let matchesFound = true;
    let localCombo = 0;
    let currentGoals = [...gameState.currentLevel.goals];
    let currentScore = gameState.score;

    setGameState(prev => ({ ...prev, isProcessing: true }));

    while (matchesFound) {
      const matchGroups = findMatches(currentGrid);
      if (matchGroups.length === 0) {
        matchesFound = false;
        break;
      }

      localCombo++;
      const toRemove = new Set<string>();
      const specialsToSpawn: { r: number, c: number, colorIndex: number, type: SpecialType }[] = [];

      matchGroups.forEach(group => {
        group.coords.forEach(m => {
          const tile = currentGrid[m.r][m.c];
          if (tile) {
            toRemove.add(`${m.r},${m.c}`);
            if (tile.special === 'h-stripe') addVFX('laser-h', m.r, m.c);
            if (tile.special === 'v-stripe') addVFX('laser-v', m.r, m.c);
            if (tile.special === 'bomb') addVFX('bomb-burst', m.r, m.c);
            
            if (tile.special !== 'none') {
              const exploded = handleExplosion(currentGrid, m.r, m.c, tile.special);
              exploded.forEach(e => toRemove.add(`${e.r},${e.c}`));
            }
            addVFX('match-pop', m.r, m.c);
          }
        });

        if (group.coords.length >= 4) {
          const spawnAt = group.coords[0];
          specialsToSpawn.push({
            r: spawnAt.r,
            c: spawnAt.c,
            colorIndex: group.colorIndex,
            type: group.coords.length >= 5 ? 'bomb' : (group.type === 'horizontal' ? 'v-stripe' : 'h-stripe')
          });
        }
      });

      const pointsPerTile = 10 * localCombo;
      const batchScore = toRemove.size * pointsPerTile;
      currentScore += batchScore;

      toRemove.forEach(s => {
        const [r, c] = s.split(',').map(Number);
        const tile = currentGrid[r][c];
        if (tile) {
          currentGoals = currentGoals.map(g => {
            if (g.type === 'collect' && g.collectTarget?.[tile.colorIndex] !== undefined) {
              return { ...g, current: g.current + 1 };
            }
            if (g.type === 'score') {
              return { ...g, current: Math.min(g.target, g.current + pointsPerTile) };
            }
            return g;
          });

          const neighbors = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
          neighbors.forEach(n => {
            if (n.r >= 0 && n.r < GRID_ROWS && n.c >= 0 && n.c < GRID_COLS) {
              const neighbor = currentGrid[n.r][n.c];
              if (neighbor?.obstacle === 'ice') {
                neighbor.iceLayers--;
                if (neighbor.iceLayers <= 0) {
                  neighbor.obstacle = 'none';
                  currentGoals = currentGoals.map(g => g.type === 'clear' ? { ...g, current: g.current + 1 } : g);
                }
              }
              if (neighbor?.isChained) {
                neighbor.isChained = false;
                neighbor.obstacle = 'none';
                currentGoals = currentGoals.map(g => g.type === 'clear' ? { ...g, current: g.current + 1 } : g);
              }
            }
          });
        }
        currentGrid[r][c] = null;
      });

      specialsToSpawn.forEach(spec => {
        currentGrid[spec.r][spec.c] = createTile(spec.colorIndex, 'none', spec.type);
      });

      setGameState(prev => ({
        ...prev,
        grid: [...currentGrid],
        score: currentScore,
        currentLevel: { ...prev.currentLevel, goals: currentGoals }
      }));

      await new Promise(res => setTimeout(res, 250));

      for (let c = 0; c < GRID_COLS; c++) {
        let writeIdx = GRID_ROWS - 1;
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
          if (currentGrid[r][c] && currentGrid[r][c]?.type !== 'stone') {
            const temp = currentGrid[r][c];
            currentGrid[r][c] = null;
            currentGrid[writeIdx][c] = temp;
            writeIdx--;
          } else if (currentGrid[r][c]?.type === 'stone') {
            writeIdx = r - 1;
          }
        }
        for (let r = writeIdx; r >= 0; r--) {
          if (!currentGrid[r][c]) {
            currentGrid[r][c] = createTile(Math.floor(Math.random() * 7));
          }
        }
      }

      setGameState(prev => ({ ...prev, grid: [...currentGrid] }));
      await new Promise(res => setTimeout(res, 350));
    }

    setGameState(prev => {
      const newState = { ...prev, isProcessing: false };
      checkWinCondition(newState.score, newState.currentLevel.goals, newState.movesLeft);
      return newState;
    });
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (gameState.isProcessing || gameStatus !== 'playing') return;
    dragStartPos.current = { x: e.clientX, y: e.clientY, r, c };
    setGameState(prev => ({ ...prev, selectedTile: { r, c } }));
    isSwappingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPos.current || gameState.isProcessing || isSwappingRef.current) return;

    const { x, y, r, c } = dragStartPos.current;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    const threshold = 30;

    let tr = r, tc = c;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) tc = dx > 0 ? c + 1 : c - 1;
    } else {
      if (Math.abs(dy) > threshold) tr = dy > 0 ? r + 1 : r - 1;
    }

    if ((tr !== r || tc !== c) && tr >= 0 && tr < GRID_ROWS && tc >= 0 && tc < GRID_COLS) {
      isSwappingRef.current = true;
      executeSwap(r, c, tr, tc);
      dragStartPos.current = null;
      setGameState(prev => ({ ...prev, selectedTile: null }));
    }
  };

  const handlePointerUp = () => {
    dragStartPos.current = null;
    setGameState(prev => ({ ...prev, selectedTile: null }));
  };

  const executeSwap = async (r1: number, c1: number, r2: number, c2: number) => {
    const tile1 = gameState.grid[r1][c1];
    const tile2 = gameState.grid[r2][c2];

    if (!tile1 || !tile2 || tile1.type === 'stone' || tile2.type === 'stone' || tile1.isChained || tile2.isChained) {
      return;
    }

    let nextGrid = [...gameState.grid.map(row => [...row])];
    nextGrid[r1][c1] = tile2;
    nextGrid[r2][c2] = tile1;

    setGameState(prev => ({
      ...prev,
      grid: nextGrid,
      isProcessing: true,
      movesLeft: prev.movesLeft - 1
    }));

    await new Promise(res => setTimeout(res, 200));

    const matchGroups = findMatches(nextGrid);
    if (matchGroups.length > 0) {
      processGrid(nextGrid);
    } else {
      let rollbackGrid = [...gameState.grid.map(row => [...row])];
      rollbackGrid[r1][c1] = tile1;
      rollbackGrid[r2][c2] = tile2;
      setGameState(prev => ({
        ...prev,
        grid: rollbackGrid,
        isProcessing: false,
        movesLeft: prev.movesLeft + 1
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-4 overflow-hidden relative">

      <AnimatePresence>
        {gameStatus === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#1a1a2e] flex flex-col items-center justify-center p-6"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-wrap justify-around items-center overflow-hidden">
              {GEM_ICONS.map((icon, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -20, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 3 + i, repeat: Infinity }}
                  className="text-6xl p-4"
                >
                  {icon}
                </motion.div>
              ))}
            </div>

            <motion.h1
              initial={{ y: -50, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
              className="text-7xl font-game mb-4 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] text-center"
            >
              GEM QUEST
            </motion.h1>
            <p className="text-blue-300 text-xl font-bold mb-12 tracking-widest uppercase">Match-3 Saga</p>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setGameStatus('level-select')}
              className="group relative bg-yellow-500 hover:bg-yellow-400 text-black text-3xl font-game py-6 px-16 rounded-full shadow-[0_10px_0_rgb(161,98,7)] border-4 border-yellow-200"
            >
              START GAME
              <div className="absolute -inset-2 bg-yellow-400 opacity-20 blur-xl rounded-full group-hover:opacity-40 transition-opacity"></div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus === 'level-select' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 z-50 bg-[#1a1a2e]/95 flex flex-col items-center justify-center p-8 backdrop-blur-md"
          >
            <h2 className="text-4xl font-game mb-10 text-white">Select a Level</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-lg overflow-y-auto max-h-[70vh] p-4">
              {LEVELS.map(l => (
                <motion.button
                  key={l.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startLevel(l)}
                  className="bg-[#16213e] hover:bg-[#1e2d53] text-white p-6 rounded-2xl shadow-xl border-2 border-blue-500/30 flex flex-col items-center group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-full transition-all duration-300 opacity-20"></div>
                  <span className="text-sm font-bold text-blue-400 uppercase mb-1">Level {l.id}</span>
                  <span className="text-2xl font-game">{l.name}</span>
                  <div className="mt-2 flex text-yellow-400">⭐⭐⭐</div>
                </motion.button>
              ))}
            </div>
            <button
              onClick={() => setGameStatus('start')}
              className="mt-8 text-slate-400 hover:text-white underline underline-offset-4"
            >
              Back to Title
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md mb-4 flex flex-col gap-2">
        <div className="flex justify-between items-center w-full px-1">
          <button
            onClick={() => setGameStatus('level-select')}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold py-1 px-3 rounded-full border border-red-500/30 transition-colors uppercase tracking-widest"
          >
            QUIT
          </button>
          <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Level {gameState.currentLevel.id}</div>
          <button
            onClick={shuffleGrid}
            disabled={gameState.isProcessing || gameState.movesLeft <= 0}
            className={`flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 text-xs font-bold py-1 px-3 rounded-full border border-purple-500/30 transition-colors uppercase tracking-widest ${gameState.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>SHUFFLE</span>
            <span className="text-[10px] bg-purple-500/40 px-1.5 py-0.5 rounded-md text-white">-1 ⚡</span>
          </button>
        </div>

        <div className="flex justify-between items-center bg-[#16213e] p-4 rounded-2xl shadow-2xl border-b-4 border-[#0f3460]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-blue-300 font-bold tracking-tighter">Score</span>
            <span className="text-2xl font-game text-white">{gameState.score}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-pink-300 font-bold tracking-tighter">Moves Left</span>
            <span className="text-4xl font-game text-pink-400 leading-none">{gameState.movesLeft}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-green-300 font-bold tracking-tighter">Goal</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-game text-white">
                {Math.round((gameState.currentLevel.goals.reduce((acc, g) => acc + (g.current / g.target), 0) / gameState.currentLevel.goals.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative bg-[#0f3460] p-2 rounded-2xl shadow-inner border-4 border-[#16213e] touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="grid grid-cols-6 gap-1.5 relative overflow-hidden">
          <AnimatePresence mode="popLayout">
            {gameState.grid.map((row, r) =>
              row.map((tile, c) => (
                <motion.div
                  key={tile?.id || `empty-${r}-${c}`}
                  layout="position"
                  initial={{ y: -200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 30,
                    layout: { duration: 0.35, ease: "easeOut" }
                  }}
                  onPointerDown={(e) => handlePointerDown(e, r, c)}
                  className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-xl cursor-pointer select-none relative
                    ${gameState.selectedTile?.r === r && gameState.selectedTile?.c === c ? 'scale-110 z-10' : ''}
                    ${tile?.type === 'stone' ? 'bg-slate-800' : 'active:scale-95'}
                  `}
                >
                  {tile && (
                    <div className={`w-full h-full rounded-xl flex items-center justify-center relative ${GEM_COLORS[tile.colorIndex]} shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_6px_rgba(0,0,0,0.3)] transition-all`}>
                      <span className={`text-2xl md:text-4xl filter drop-shadow-md ${tile.special !== 'none' ? 'scale-110' : ''}`}>
                        {tile.type === 'stone' ? '🧱' : (tile.special === 'bomb' ? '💣' : GEM_ICONS[tile.colorIndex])}
                      </span>

                      {tile.special === 'h-stripe' && (
                        <div className="absolute inset-x-0 h-full flex flex-col justify-evenly py-1 pointer-events-none">
                          <div className="h-1 bg-white/60 blur-[0.5px]"></div>
                          <div className="h-1 bg-white/60 blur-[0.5px]"></div>
                          <div className="h-1 bg-white/60 blur-[0.5px]"></div>
                        </div>
                      )}
                      {tile.special === 'v-stripe' && (
                        <div className="absolute inset-y-0 w-full flex justify-evenly px-1 pointer-events-none">
                          <div className="w-1 bg-white/60 blur-[0.5px]"></div>
                          <div className="w-1 bg-white/60 blur-[0.5px]"></div>
                          <div className="w-1 bg-white/60 blur-[0.5px]"></div>
                        </div>
                      )}
                      
                      {tile.special === 'bomb' && (
                        <div className="absolute inset-0 rounded-xl ring-4 ring-white/60 animate-pulse bg-white/10 flex items-center justify-center">
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border border-white shadow-[0_0_8px_orange] animate-ping"></div>
                        </div>
                      )}

                      {tile.obstacle === 'ice' && (
                        <div className={`absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center border-4 border-blue-200/50 ${tile.iceLayers === 2 ? 'opacity-100' : 'opacity-40'}`}>
                          <span className="text-xl">❄️</span>
                        </div>
                      )}
                      {tile.isChained && <div className="absolute inset-0 flex items-center justify-center text-3xl">⛓️</div>}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>

          <AnimatePresence>
            {vfx.map((effect) => (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none z-50 overflow-visible"
                style={{
                  top: `calc(${effect.r} * (100% / ${GRID_ROWS}) + (100% / ${GRID_ROWS} / 2))`,
                  left: `calc(${effect.c} * (100% / ${GRID_COLS}) + (100% / ${GRID_COLS} / 2))`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {effect.type === 'laser-h' && (
                  <motion.div 
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 10, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-2 w-screen bg-white shadow-[0_0_20px_white] absolute left-1/2 -translate-x-1/2"
                  />
                )}
                {effect.type === 'laser-v' && (
                  <motion.div 
                    initial={{ scaleY: 0, opacity: 1 }}
                    animate={{ scaleY: 10, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-2 h-screen bg-white shadow-[0_0_20px_white] absolute top-1/2 -translate-y-1/2"
                  />
                )}
                {effect.type === 'bomb-burst' && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-16 h-16 bg-yellow-400 rounded-full shadow-[0_0_40px_orange]"
                  />
                )}
                {effect.type === 'match-pop' && (
                  <motion.div 
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 border-4 border-white rounded-xl"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center rounded-2xl p-8 text-center backdrop-blur-sm"
            >
              <motion.h2
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`text-6xl font-game mb-6 drop-shadow-lg ${gameStatus === 'won' ? 'text-green-400' : 'text-red-500'}`}
              >
                {gameStatus === 'won' ? 'PERFECT!' : 'FAILED'}
              </motion.h2>
              <div className="text-3xl mb-10 font-game text-white">Score: {gameState.score}</div>
              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => startLevel(gameState.currentLevel)}
                  className="bg-yellow-500 text-black py-4 rounded-2xl font-game text-xl border-b-4 border-yellow-700 active:translate-y-1 active:border-b-0"
                >
                  REPLAY
                </button>
                <button
                  onClick={() => setGameStatus('level-select')}
                  className="bg-blue-600 text-white py-4 rounded-2xl font-game text-xl border-b-4 border-blue-800 active:translate-y-1 active:border-b-0"
                >
                  LEVELS
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {gameStatus === 'playing' && (
        <div className="mt-6 w-full max-w-md bg-[#16213e] p-4 rounded-2xl border-t-4 border-[#0f3460] shadow-xl">
          <div className="flex flex-wrap justify-center gap-4">
            {gameState.currentLevel.goals.map((g, idx) => (
              <div key={idx} className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 ${g.current >= g.target ? 'bg-green-900/40 border-green-500' : 'bg-[#0f3460] border-blue-500/20'}`}>
                <div className="text-xl">
                  {g.type === 'collect' && '💎'}
                  {g.type === 'score' && '🏆'}
                  {g.type === 'clear' && '❄️'}
                </div>
                <div className="flex flex-col">
                  <span className={`font-game text-lg leading-none ${g.current >= g.target ? 'text-green-400' : 'text-white'}`}>
                    {g.current} / {g.target}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">
                    {g.type === 'clear' ? 'Obstacles' : g.type}
                  </span>
                </div>
                {g.current >= g.target && <span className="text-green-400 font-bold ml-1">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
        Swipe any gem to start matching!
      </p>
    </div>
  );
};

export default App;
