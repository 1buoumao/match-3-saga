
import { LevelConfig } from './types';

export const GRID_ROWS = 8;
export const GRID_COLS = 6;
export const GEM_COLORS = [
  'bg-gradient-to-br from-red-400 to-red-600',    // 0: Red
  'bg-gradient-to-br from-blue-400 to-blue-600',   // 1: Blue
  'bg-gradient-to-br from-green-400 to-green-600',  // 2: Green
  'bg-gradient-to-br from-yellow-300 to-yellow-500', // 3: Yellow
  'bg-gradient-to-br from-purple-400 to-purple-600', // 4: Purple
  'bg-gradient-to-br from-pink-400 to-pink-600',   // 5: Pink
  'bg-gradient-to-br from-orange-400 to-orange-600', // 6: Orange
];

// Mapping icons to color indices:
// 0: Red -> Apple, 1: Blue -> Diamond, 2: Green -> Clover, 3: Yellow -> Star
// 4: Purple -> Unchanged (Circle), 5: Pink -> Unchanged (Candy), 6: Orange -> Unchanged (Orange)
export const GEM_ICONS = ['🍎', '💎', '🍀', '⭐', '🟣', '🍬', '🍊'];

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Sparkling Start",
    rows: 8,
    cols: 6,
    moves: 20,
    goals: [{ type: 'score', target: 2000, current: 0 }],
    starScores: [1000, 2000, 3000],
  },
  {
    id: 2,
    name: "Ice Breaker",
    rows: 8,
    cols: 6,
    moves: 25,
    goals: [
      { type: 'score', target: 3000, current: 0 },
      { type: 'collect', target: 15, current: 0, collectTarget: { 0: 15 } } // Collect 15 Red gems (Apples)
    ],
    starScores: [2000, 3500, 5000],
    initialObstacles: [
      { row: 3, col: 2, type: 'ice' },
      { row: 3, col: 3, type: 'ice' },
      { row: 4, col: 2, type: 'ice' },
      { row: 4, col: 3, type: 'ice' },
    ]
  },
  {
    id: 3,
    name: "The Vault",
    rows: 8,
    cols: 6,
    moves: 30,
    goals: [{ type: 'clear', target: 8, current: 0 }],
    starScores: [3000, 6000, 10000],
    initialObstacles: [
      { row: 0, col: 0, type: 'stone' },
      { row: 0, col: 5, type: 'stone' },
      { row: 7, col: 0, type: 'stone' },
      { row: 7, col: 5, type: 'stone' },
      { row: 3, col: 2, type: 'chain' },
      { row: 3, col: 3, type: 'chain' },
      { row: 4, col: 2, type: 'chain' },
      { row: 4, col: 3, type: 'chain' },
    ]
  }
];
