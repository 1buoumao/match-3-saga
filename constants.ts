
import { LevelConfig } from './types';

export const GRID_ROWS = 8;
export const GRID_COLS = 6;
export const GEM_COLORS = [
  'bg-red-500',    // 0
  'bg-blue-500',   // 1
  'bg-green-500',  // 2
  'bg-yellow-500', // 3
  'bg-purple-500', // 4
  'bg-pink-500',   // 5
  'bg-orange-500', // 6
];

export const GEM_ICONS = ['💎', '🍎', '⭐', '🍀', '🟣', '🍬', '🍊'];

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
      { type: 'collect', target: 15, current: 0, collectTarget: { 0: 15 } } // Collect 15 Red gems
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
