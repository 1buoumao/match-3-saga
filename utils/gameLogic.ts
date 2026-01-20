
import { Tile, SpecialType, LevelConfig, ObstacleType } from '../types';
import { GRID_ROWS, GRID_COLS } from '../constants';

export const createTile = (colorIndex: number, obstacle: ObstacleType = 'none', special: SpecialType = 'none'): Tile => ({
  id: Math.random().toString(36).substr(2, 9),
  type: obstacle === 'stone' ? 'stone' : 'gem',
  colorIndex,
  special,
  obstacle,
  iceLayers: obstacle === 'ice' ? 2 : 0,
  isChained: obstacle === 'chain',
  timerValue: obstacle === 'timer' ? 10 : undefined,
});

export const initializeGrid = (level: LevelConfig): (Tile | null)[][] => {
  const grid: (Tile | null)[][] = [];
  for (let r = 0; r < level.rows; r++) {
    const row: (Tile | null)[] = [];
    for (let c = 0; c < level.cols; c++) {
      const obstacleMatch = level.initialObstacles?.find(o => o.row === r && o.col === c);
      let color = Math.floor(Math.random() * 7);
      
      while (
        (c > 1 && row[c-1]?.colorIndex === color && row[c-2]?.colorIndex === color) ||
        (r > 1 && grid[r-1][c]?.colorIndex === color && grid[r-2][c]?.colorIndex === color)
      ) {
        color = Math.floor(Math.random() * 7);
      }
      
      row.push(createTile(color, obstacleMatch?.type || 'none'));
    }
    grid.push(row);
  }
  return grid;
};

export interface MatchGroup {
  colorIndex: number;
  coords: { r: number, c: number }[];
  type: 'horizontal' | 'vertical';
}

export const findMatches = (grid: (Tile | null)[][]): MatchGroup[] => {
  const groups: MatchGroup[] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let count = 1;
    for (let c = 0; c < cols; c++) {
      const current = grid[r][c];
      const next = c < cols - 1 ? grid[r][c + 1] : null;
      if (next && current && current.type === 'gem' && current.colorIndex === next.colorIndex) {
        count++;
      } else {
        if (count >= 3) {
          const coords = [];
          for (let i = 0; i < count; i++) coords.push({ r, c: c - i });
          groups.push({ colorIndex: grid[r][c]?.colorIndex ?? 0, coords, type: 'horizontal' });
        }
        count = 1;
      }
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let count = 1;
    for (let r = 0; r < rows; r++) {
      const current = grid[r][c];
      const next = r < rows - 1 ? grid[r + 1][c] : null;
      if (next && current && current.type === 'gem' && current.colorIndex === next.colorIndex) {
        count++;
      } else {
        if (count >= 3) {
          const coords = [];
          for (let i = 0; i < count; i++) coords.push({ r: r - i, c });
          groups.push({ colorIndex: grid[r][c]?.colorIndex ?? 0, coords, type: 'vertical' });
        }
        count = 1;
      }
    }
  }

  return groups;
};

export const checkAdjacent = (r1: number, c1: number, r2: number, c2: number) => {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
};

export const handleExplosion = (grid: (Tile | null)[][], r: number, c: number, specialType: SpecialType) => {
  const affected: { r: number, c: number }[] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  if (specialType === 'h-stripe') {
    for (let j = 0; j < cols; j++) affected.push({ r, c: j });
  } else if (specialType === 'v-stripe') {
    for (let i = 0; i < rows; i++) affected.push({ r: i, c });
  } else if (specialType === 'bomb') {
    for (let i = r - 1; i <= r + 1; i++) {
      for (let j = c - 1; j <= c + 1; j++) {
        if (i >= 0 && i < rows && j >= 0 && j < cols) affected.push({ r: i, c: j });
      }
    }
  } else if (specialType === 'rainbow') {
    for (let i = 0; i < rows; i++) affected.push({ r: i, c });
  }
  return affected;
};
