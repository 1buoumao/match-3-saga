
export type SpecialType = 'none' | 'h-stripe' | 'v-stripe' | 'bomb' | 'rainbow';
export type ObstacleType = 'none' | 'ice' | 'chain' | 'stone' | 'timer';
export type GoalType = 'score' | 'collect' | 'clear';

export interface Tile {
  id: string;
  type: 'gem' | 'stone';
  colorIndex: number; // 0-6 for gems
  special: SpecialType;
  obstacle: ObstacleType;
  iceLayers: number; // 0, 1, 2
  isChained: boolean;
  timerValue?: number;
}

export interface LevelGoal {
  type: GoalType;
  target: number;
  current: number;
  collectTarget?: Record<number, number>; // colorIndex -> target count
}

export interface LevelConfig {
  id: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  goals: LevelGoal[];
  starScores: [number, number, number];
  initialObstacles?: { row: number, col: number, type: ObstacleType }[];
}

export interface GameState {
  grid: (Tile | null)[][];
  score: number;
  movesLeft: number;
  currentLevel: LevelConfig;
  selectedTile: { r: number, c: number } | null;
  isProcessing: boolean;
  gameStatus: 'playing' | 'won' | 'lost' | 'paused' | 'level-select';
}
